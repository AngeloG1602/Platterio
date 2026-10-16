import { inPeriod, type Period } from "./analytics";
import type {
  Dish,
  InventoryItem,
  InventoryMove,
  InventoryMoveKind,
  Order,
  OrderStatus,
} from "./types";

/**
 * Inventario (etapa 1): productos terminados con existencias. Son reglas puras. Las existencias
 * nunca bajan de cero y cada cambio deja un movimiento con quién, cuándo y por qué.
 *
 * El stock de un pedido se calcula contra lo que esa ronda ya tiene descontado (suma de sus
 * movimientos), así que confirmar, editar, rechazar o repetir la operación siempre llega al mismo
 * resultado sin descontar dos veces.
 */

export type InventoryResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface InventoryState {
  items: InventoryItem[];
  moves: InventoryMove[];
}

/** Cuántos movimientos se guardan; los más viejos se descartan primero. */
export const MOVE_LIMIT = 3000;

export const MOVE_LABEL: Record<InventoryMoveKind, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  consumo: "Venta",
  devolucion: "Devolución",
};

/** Estados en los que la ronda ya se confirmó y por eso tiene su stock descontado. */
const HOLDING: readonly OrderStatus[] = ["confirmado", "en_preparacion", "listo", "entregado"];
export const holdsStock = (status: OrderStatus) => HOLDING.includes(status);

/* ——— Lectura ——— */

export type StockLevel = "agotado" | "poco" | "bien";

export function stockLevel(item: InventoryItem): StockLevel {
  if (item.qty <= 0) return "agotado";
  return item.qty <= item.threshold ? "poco" : "bien";
}

export const STOCK_LABEL: Record<StockLevel, string> = {
  agotado: "Agotado",
  poco: "Poco stock",
  bien: "Bien",
};

const linkMatches = (item: InventoryItem, dishId: string, variantId: string) =>
  item.link?.dishId === dishId && (!item.link.variantId || item.link.variantId === variantId);

/** Productos de inventario que consume una opción de un plato. */
export const itemsFor = (items: readonly InventoryItem[], dishId: string, variantId: string) =>
  items.filter((i) => linkMatches(i, dishId, variantId));

/**
 * ¿Se puede pedir esta opción? Falla si algún producto vinculado está en cero. Un plato sin
 * vínculo siempre se puede pedir.
 */
export function isSoldOut(
  items: readonly InventoryItem[],
  dishId: string,
  variantId: string,
): boolean {
  return itemsFor(items, dishId, variantId).some((i) => i.qty <= 0);
}

/** Un plato queda agotado en la carta cuando todas sus opciones lo están. */
export function isDishSoldOut(items: readonly InventoryItem[], dish: Dish): boolean {
  return dish.variants.length > 0 && dish.variants.every((v) => isSoldOut(items, dish.id, v.id));
}

/** Cuántas unidades de esta opción se pueden pedir todavía (undefined: sin límite). */
export function availableUnits(
  items: readonly InventoryItem[],
  dishId: string,
  variantId: string,
): number | undefined {
  const linked = itemsFor(items, dishId, variantId);
  return linked.length ? Math.max(0, Math.min(...linked.map((i) => i.qty))) : undefined;
}

export const lowStockItems = (items: readonly InventoryItem[]) =>
  items.filter((i) => stockLevel(i) !== "bien");

/* ——— Stock de los pedidos ——— */

/** Lo que una ronda necesita tener descontado ahora, por producto. */
function wanted(order: Order, items: readonly InventoryItem[]): Map<string, number> {
  const out = new Map<string, number>();
  if (!holdsStock(order.status)) return out;
  for (const line of order.items) {
    if (line.removed) continue;
    for (const item of itemsFor(items, line.dishId, line.variantId))
      out.set(item.id, (out.get(item.id) ?? 0) + line.qty);
  }
  return out;
}

/** Lo que una ronda ya tiene descontado, por producto (consumos menos devoluciones). */
function held(moves: readonly InventoryMove[], orderId: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of moves)
    if (m.orderId === orderId && (m.kind === "consumo" || m.kind === "devolucion"))
      out.set(m.itemId, (out.get(m.itemId) ?? 0) - m.delta);
  return out;
}

const withMove = (state: InventoryState, move: InventoryMove, item: InventoryItem) => ({
  items: state.items.map((i) => (i.id === item.id ? item : i)),
  moves: [...state.moves, move],
});

/** Agrega los movimientos respetando el límite. */
const capMoves = (moves: InventoryMove[]) =>
  moves.length > MOVE_LIMIT ? moves.slice(moves.length - MOVE_LIMIT) : moves;

/**
 * Deja el stock al día con el estado actual de la ronda: descuenta lo que falta y devuelve lo que
 * sobra. Si no alcanza, no cambia nada y dice qué producto falta. Los ids de los movimientos son
 * fijos para esa ronda y producto, así que dos pestañas que lo hagan a la vez no lo duplican.
 */
export function syncOrderStock(
  state: InventoryState,
  order: Order,
  by: string,
  now: string,
): InventoryResult<InventoryState> {
  const want = wanted(order, state.items);
  const have = held(state.moves, order.id);
  const ids = new Set([...want.keys(), ...have.keys()]);
  let next = state;
  for (const id of ids) {
    const diff = (want.get(id) ?? 0) - (have.get(id) ?? 0);
    if (diff === 0) continue;
    const item = next.items.find((i) => i.id === id);
    if (!item) continue;
    if (diff > 0 && item.qty < diff)
      return {
        ok: false,
        error:
          item.qty <= 0
            ? `${item.name} está agotado.`
            : `No alcanza ${item.name}: quedan ${item.qty} y se necesitan ${diff}.`,
      };
    const count = next.moves.filter((m) => m.orderId === order.id && m.itemId === id).length;
    const qty = item.qty - diff;
    const move: InventoryMove = {
      id: `mov-${order.id}-${id}-${count + 1}`,
      itemId: id,
      at: now,
      by,
      kind: diff > 0 ? "consumo" : "devolucion",
      delta: -diff,
      balance: qty,
      orderId: order.id,
    };
    next = withMove(next, move, { ...item, qty });
  }
  return { ok: true, value: { items: next.items, moves: capMoves(next.moves) } };
}

/* ——— Productos ——— */

export interface ItemDraft {
  name: string;
  unit: string;
  qty: string;
  threshold: string;
  dishId: string;
  variantId: string;
}

export type ItemErrors = Partial<Record<keyof ItemDraft, string>>;

export const emptyItemDraft = (): ItemDraft => ({
  name: "",
  unit: "unidades",
  qty: "0",
  threshold: "5",
  dishId: "",
  variantId: "",
});

const toCount = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);

export function validateItem(
  draft: ItemDraft,
  items: readonly InventoryItem[],
  editingId?: string,
): ItemErrors {
  const errors: ItemErrors = {};
  const name = draft.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Escribe el nombre del producto";
  else if (items.some((i) => i.id !== editingId && i.name.toLowerCase() === name.toLowerCase()))
    errors.name = "Ya hay un producto con ese nombre";
  if (!draft.unit.trim()) errors.unit = "Escribe la unidad (botellas, unidades…)";
  if (editingId === undefined) {
    const qty = toCount(draft.qty);
    if (!Number.isInteger(qty) || qty > 100_000)
      errors.qty = "Escribe las existencias iniciales (0 o más)";
  }
  const threshold = toCount(draft.threshold);
  if (!Number.isInteger(threshold) || threshold > 100_000)
    errors.threshold = "Escribe desde cuántas unidades avisar (0 o más)";
  if (draft.dishId) {
    const clash = items.find(
      (i) =>
        i.id !== editingId &&
        i.link?.dishId === draft.dishId &&
        (i.link.variantId ?? "") === draft.variantId,
    );
    if (clash) errors.dishId = `${clash.name} ya está vinculado a ese plato`;
  }
  return errors;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "producto";

const linkOf = (draft: ItemDraft): InventoryItem["link"] =>
  draft.dishId
    ? { dishId: draft.dishId, ...(draft.variantId ? { variantId: draft.variantId } : {}) }
    : undefined;

/** Crea el producto; si tiene existencias iniciales deja el movimiento de entrada. */
export function addItem(
  state: InventoryState,
  draft: ItemDraft,
  by: string,
  now: string,
  moveId: string,
): InventoryResult<InventoryState & { item: InventoryItem }> {
  if (Object.keys(validateItem(draft, state.items)).length > 0)
    return { ok: false, error: "Revisa los datos del producto" };
  const base = slug(draft.name);
  let id = base;
  for (let n = 2; state.items.some((i) => i.id === id); n++) id = `${base}-${n}`;
  const qty = toCount(draft.qty);
  const link = linkOf(draft);
  const item: InventoryItem = {
    id,
    name: draft.name.trim().replace(/\s+/g, " "),
    unit: draft.unit.trim(),
    qty,
    threshold: toCount(draft.threshold),
    ...(link ? { link } : {}),
    createdAt: now,
  };
  const moves =
    qty > 0
      ? capMoves([
          ...state.moves,
          {
            id: moveId,
            itemId: id,
            at: now,
            by,
            kind: "entrada",
            delta: qty,
            balance: qty,
            reason: "Existencias iniciales",
          },
        ])
      : state.moves;
  return { ok: true, value: { items: [...state.items, item], moves, item } };
}

/** Cambia nombre, unidad, umbral o vínculo. Las existencias solo cambian con un movimiento. */
export function updateItem(
  state: InventoryState,
  itemId: string,
  draft: ItemDraft,
): InventoryResult<InventoryState> {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "Ese producto no existe" };
  if (Object.keys(validateItem({ ...draft, qty: "0" }, state.items, itemId)).length > 0)
    return { ok: false, error: "Revisa los datos del producto" };
  const link = linkOf(draft);
  const { link: _old, ...rest } = item;
  void _old;
  const next: InventoryItem = {
    ...rest,
    name: draft.name.trim().replace(/\s+/g, " "),
    unit: draft.unit.trim(),
    threshold: toCount(draft.threshold),
    ...(link ? { link } : {}),
  };
  return {
    ok: true,
    value: { items: state.items.map((i) => (i.id === itemId ? next : i)), moves: state.moves },
  };
}

/* ——— Movimientos manuales ——— */

export type ManualKind = "entrada" | "salida" | "ajuste";

export const MANUAL_REASONS: Record<ManualKind, readonly string[]> = {
  entrada: ["Compra a proveedor", "Devolución a la despensa", "Otro"],
  salida: ["Dañado o vencido", "Consumo interno", "Cortesía", "Otro"],
  ajuste: ["Conteo físico", "Corrección de error", "Otro"],
};

/**
 * Registra una entrada, una salida o un ajuste. En entrada y salida `amount` es lo que se mueve;
 * en el ajuste es la cantidad real contada y el movimiento guarda la diferencia. Salida y ajuste
 * exigen el motivo.
 */
export function registerMove(
  state: InventoryState,
  input: { itemId: string; kind: ManualKind; amount: number; reason: string },
  by: string,
  now: string,
  moveId: string,
): InventoryResult<InventoryState> {
  const item = state.items.find((i) => i.id === input.itemId);
  if (!item) return { ok: false, error: "Ese producto no existe" };
  const { amount, kind } = input;
  const reason = input.reason.trim();
  if (!Number.isInteger(amount) || amount < 0 || amount > 100_000)
    return { ok: false, error: "Escribe una cantidad entera" };
  if (kind !== "ajuste" && amount === 0)
    return { ok: false, error: "La cantidad debe ser mayor que cero" };
  if (kind !== "entrada" && !reason) return { ok: false, error: "Indica el motivo" };

  let delta: number;
  if (kind === "entrada") delta = amount;
  else if (kind === "salida") {
    if (amount > item.qty)
      return { ok: false, error: `Solo hay ${item.qty} ${item.unit}: no se puede sacar más.` };
    delta = -amount;
  } else {
    if (amount === item.qty) return { ok: false, error: "Esa ya es la cantidad registrada" };
    delta = amount - item.qty;
  }
  const qty = item.qty + delta;
  const move: InventoryMove = {
    id: moveId,
    itemId: item.id,
    at: now,
    by,
    kind,
    delta,
    balance: qty,
    ...(reason ? { reason } : {}),
  };
  const next = withMove(state, move, { ...item, qty });
  return { ok: true, value: { items: next.items, moves: capMoves(next.moves) } };
}

/* ——— Informe ——— */

export interface MoveFilter {
  itemId?: string;
  kind?: InventoryMoveKind;
  period?: Period;
}

/** Movimientos filtrados, del más reciente al más antiguo. */
export function filterMoves(moves: readonly InventoryMove[], filter: MoveFilter): InventoryMove[] {
  return moves
    .filter(
      (m) =>
        (!filter.itemId || m.itemId === filter.itemId) &&
        (!filter.kind || m.kind === filter.kind) &&
        (!filter.period || inPeriod(m.at, filter.period)),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function summarizeMoves(moves: readonly InventoryMove[]) {
  let entered = 0;
  let sold = 0;
  let out = 0;
  for (const m of moves) {
    if (m.kind === "entrada") entered += m.delta;
    else if (m.kind === "consumo") sold -= m.delta;
    else if (m.kind === "devolucion") sold -= m.delta;
    else if (m.kind === "salida") out -= m.delta;
  }
  return { entered, sold, out };
}

export function movesCsvRows(
  moves: readonly InventoryMove[],
  items: readonly InventoryItem[],
): string[][] {
  const name = new Map(items.map((i) => [i.id, i.name]));
  return [
    ["Fecha", "Producto", "Movimiento", "Cambio", "Existencias", "Quién", "Motivo"],
    ...moves.map((m) => [
      m.at,
      name.get(m.itemId) ?? m.itemId,
      MOVE_LABEL[m.kind],
      String(m.delta),
      String(m.balance),
      m.by,
      m.reason ?? "",
    ]),
  ];
}
