import { inPeriod, type Period } from "./analytics";
import type {
  Dish,
  InventoryItem,
  InventoryMove,
  InventoryMoveKind,
  Order,
  OrderStatus,
  Recipe,
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
  recipes?: Recipe[];
}

/** Cuántos movimientos se guardan; los más viejos se descartan primero. */
export const MOVE_LIMIT = 3000;

export const MOVE_LABEL: Record<InventoryMoveKind, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  consumo: "Venta",
  devolucion: "Devolución",
  produccion: "Producción",
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

/** Se redondea a milésimas: las recetas gastan decimales (0,15 kg) y no deben acumular error. */
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Cantidad para mostrar: sin ceros de sobra y con coma decimal. */
export const fmtQty = (n: number) => String(round3(n)).replace(".", ",");

/** Lo que se ve del inventario: productos, recetas y, para el tope diario, lo vendido hoy. */
export interface StockView {
  items: readonly InventoryItem[];
  recipes?: readonly Recipe[];
  /** Unidades vendidas hoy de un plato (y de una opción, o de todas si no se indica). */
  sold?: (dishId: string, variantId?: string) => number;
}

const matches = (
  link: { dishId: string; variantId?: string } | undefined,
  dishId: string,
  variantId: string,
) => link?.dishId === dishId && (!link.variantId || link.variantId === variantId);

/** Productos de inventario que consume una opción de un plato. */
export const itemsFor = (items: readonly InventoryItem[], dishId: string, variantId: string) =>
  items.filter((i) => matches(i.link, dishId, variantId));

/** Lo que gasta una unidad de esta opción: por vínculo (1) y por receta (su cantidad). */
export function requirements(
  stock: StockView,
  dishId: string,
  variantId: string,
): { item: InventoryItem; per: number }[] {
  const out = new Map<string, { item: InventoryItem; per: number }>();
  const add = (item: InventoryItem | undefined, per: number) => {
    if (!item) return;
    const prev = out.get(item.id);
    out.set(item.id, { item, per: round3((prev?.per ?? 0) + per) });
  };
  for (const item of itemsFor(stock.items, dishId, variantId)) add(item, 1);
  for (const r of stock.recipes ?? [])
    if (matches(r, dishId, variantId))
      for (const l of r.lines)
        add(
          stock.items.find((i) => i.id === l.itemId),
          l.qty,
        );
  return [...out.values()];
}

/** Tope diario que queda para esta opción (undefined: sin tope). */
function dailyLeft(stock: StockView, dishId: string, variantId: string): number | undefined {
  const caps = (stock.recipes ?? []).filter(
    (r) => r.dailyMax !== undefined && matches(r, dishId, variantId),
  );
  if (caps.length === 0) return undefined;
  return Math.max(
    0,
    Math.min(...caps.map((r) => r.dailyMax! - (stock.sold?.(r.dishId, r.variantId) ?? 0))),
  );
}

/**
 * Cuántas unidades de esta opción se pueden pedir todavía: las que alcanzan con el stock de cada
 * ingrediente, sin pasar del tope diario (undefined: sin límite).
 */
export function availableUnits(
  stock: StockView,
  dishId: string,
  variantId: string,
): number | undefined {
  const reqs = requirements(stock, dishId, variantId);
  const daily = dailyLeft(stock, dishId, variantId);
  if (reqs.length === 0) return daily;
  const byStock = Math.min(
    ...reqs.map((r) => Math.max(0, Math.floor(round3(r.item.qty / r.per) + 1e-9))),
  );
  return daily === undefined ? byStock : Math.min(byStock, daily);
}

/** ¿Se agotó esta opción? (falta un ingrediente clave o se llegó al tope del día) */
export function isSoldOut(stock: StockView, dishId: string, variantId: string): boolean {
  const left = availableUnits(stock, dishId, variantId);
  return left !== undefined && left < 1;
}

/** Un plato queda agotado en la carta cuando todas sus opciones lo están. */
export function isDishSoldOut(stock: StockView, dish: Dish): boolean {
  return dish.variants.length > 0 && dish.variants.every((v) => isSoldOut(stock, dish.id, v.id));
}

export const lowStockItems = (items: readonly InventoryItem[]) =>
  items.filter((i) => stockLevel(i) !== "bien");

/** Unidades vendidas hoy (rondas confirmadas, sin lo quitado), por plato y opción. */
export function soldTodayFn(orders: readonly Order[], nowMs: number) {
  const day = new Date(nowMs).toDateString();
  return (dishId: string, variantId?: string) => {
    let n = 0;
    for (const o of orders) {
      if (!holdsStock(o.status) || new Date(o.createdAt).toDateString() !== day) continue;
      for (const l of o.items)
        if (!l.removed && l.dishId === dishId && (!variantId || l.variantId === variantId))
          n += l.qty;
    }
    return n;
  };
}

/* ——— Stock de los pedidos ——— */

/** Lo que una ronda necesita tener descontado ahora, por producto. */
function wanted(order: Order, stock: StockView): Map<string, number> {
  const out = new Map<string, number>();
  if (!holdsStock(order.status)) return out;
  for (const line of order.items) {
    if (line.removed) continue;
    for (const { item, per } of requirements(stock, line.dishId, line.variantId))
      out.set(item.id, round3((out.get(item.id) ?? 0) + line.qty * per));
  }
  return out;
}

/** Lo que una ronda ya tiene descontado, por producto (consumos menos devoluciones). */
function held(moves: readonly InventoryMove[], orderId: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of moves)
    if (m.orderId === orderId && (m.kind === "consumo" || m.kind === "devolucion"))
      out.set(m.itemId, round3((out.get(m.itemId) ?? 0) - m.delta));
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
  /** Todas las rondas, para respetar el tope diario de los platos. */
  orders: readonly Order[] = [],
  dishName: (dishId: string) => string = (id) => id,
): InventoryResult<InventoryState> {
  const view: StockView = { items: state.items, recipes: state.recipes };
  const want = wanted(order, view);
  const have = held(state.moves, order.id);
  const ids = new Set([...want.keys(), ...have.keys()]);
  let next = state;
  let increasing = false;
  for (const id of ids) {
    const diff = round3((want.get(id) ?? 0) - (have.get(id) ?? 0));
    if (diff === 0) continue;
    const item = next.items.find((i) => i.id === id);
    if (!item) continue;
    if (diff > 0) {
      increasing = true;
      if (item.qty < diff)
        return {
          ok: false,
          error:
            item.qty <= 0
              ? `${item.name} está agotado.`
              : `No alcanza ${item.name}: quedan ${fmtQty(item.qty)} y se necesitan ${fmtQty(diff)}.`,
        };
    }
    const count = next.moves.filter((m) => m.orderId === order.id && m.itemId === id).length;
    const qty = round3(item.qty - diff);
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
  if (increasing && holdsStock(order.status)) {
    const others = orders.filter((o) => o.id !== order.id);
    const sold = soldTodayFn([...others, order], Date.parse(now));
    for (const r of state.recipes ?? []) {
      if (r.dailyMax === undefined) continue;
      if (!order.items.some((l) => !l.removed && matches(r, l.dishId, l.variantId))) continue;
      if (sold(r.dishId, r.variantId) > r.dailyMax) {
        return {
          ok: false,
          error: `Hoy solo se pueden vender ${r.dailyMax} de ${dishName(r.dishId)}. Ya se llegó al tope.`,
        };
      }
    }
  }
  return { ok: true, value: { ...next, moves: capMoves(next.moves) } };
}

/* ——— Productos ——— */

export interface ItemDraft {
  name: string;
  unit: string;
  qty: string;
  threshold: string;
  dishId: string;
  variantId: string;
  /** Pesos por unidad de uso; vacío si no se sabe. */
  cost: string;
  /** Unidad en que se compra («caja») y a cuántas unidades de uso equivale; vacío si no aplica. */
  purchaseUnit: string;
  purchaseFactor: string;
}

export type ItemErrors = Partial<Record<keyof ItemDraft, string>>;

export const emptyItemDraft = (): ItemDraft => ({
  name: "",
  unit: "unidades",
  qty: "0",
  threshold: "5",
  dishId: "",
  variantId: "",
  cost: "",
  purchaseUnit: "",
  purchaseFactor: "",
});

/** Número con hasta 3 decimales, con coma o punto ("1,5"); NaN si no lo es. */
export const parseQty = (s: string) =>
  /^\d+([.,]\d{1,3})?$/.test(s.trim()) ? round3(Number(s.trim().replace(",", "."))) : NaN;
const toCount = parseQty;

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
    if (!Number.isFinite(qty) || qty > 100_000)
      errors.qty = "Escribe las existencias iniciales (0 o más)";
  }
  const threshold = toCount(draft.threshold);
  if (!Number.isFinite(threshold) || threshold > 100_000)
    errors.threshold = "Escribe desde cuántas unidades avisar (0 o más)";
  const costText = draft.cost.trim();
  if (costText && !Number.isFinite(parseQty(costText)))
    errors.cost = "Escribe el costo en pesos por unidad (hasta 3 decimales)";
  const pUnit = draft.purchaseUnit.trim();
  const pFactor = draft.purchaseFactor.trim();
  if (pUnit || pFactor) {
    if (!pUnit) errors.purchaseUnit = "Escribe la unidad de compra (caja, bulto…)";
    else if (!(parseQty(pFactor) > 0))
      errors.purchaseFactor = "Escribe a cuántas unidades equivale (mayor que cero)";
  }
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

/** Costo y unidad de compra del borrador, listos para guardar (omitidos si están vacíos). */
const priceFields = (draft: ItemDraft): Pick<InventoryItem, "cost" | "purchase"> => ({
  ...(draft.cost.trim() ? { cost: parseQty(draft.cost) } : {}),
  ...(draft.purchaseUnit.trim()
    ? { purchase: { unit: draft.purchaseUnit.trim(), factor: parseQty(draft.purchaseFactor) } }
    : {}),
});

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
    ...priceFields(draft),
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
  const { link: _old, cost: _cost, purchase: _purchase, ...rest } = item;
  void _old;
  void _cost;
  void _purchase;
  const next: InventoryItem = {
    ...rest,
    name: draft.name.trim().replace(/\s+/g, " "),
    unit: draft.unit.trim(),
    threshold: toCount(draft.threshold),
    ...(link ? { link } : {}),
    ...priceFields(draft),
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
  salida: ["Dañado o vencido", "Sobró del día", "Consumo interno", "Cortesía", "Otro"],
  ajuste: ["Conteo físico", "Corrección de error", "Otro"],
};

/**
 * Registra una entrada, una salida o un ajuste. En entrada y salida `amount` es lo que se mueve;
 * en el ajuste es la cantidad real contada y el movimiento guarda la diferencia. Salida y ajuste
 * exigen el motivo.
 */
export function registerMove(
  state: InventoryState,
  input: {
    itemId: string;
    kind: ManualKind;
    amount: number;
    reason: string;
    /** Solo en entradas: lo que se pagó por todo. Actualiza el costo por unidad. */
    totalPrice?: number;
  },
  by: string,
  now: string,
  moveId: string,
): InventoryResult<InventoryState> {
  const item = state.items.find((i) => i.id === input.itemId);
  if (!item) return { ok: false, error: "Ese producto no existe" };
  const { amount, kind } = input;
  const reason = input.reason.trim();
  if (!Number.isFinite(amount) || round3(amount) !== amount || amount < 0 || amount > 100_000)
    return { ok: false, error: "Escribe una cantidad válida (hasta 3 decimales)" };
  if (kind !== "ajuste" && amount === 0)
    return { ok: false, error: "La cantidad debe ser mayor que cero" };
  if (kind !== "entrada" && !reason) return { ok: false, error: "Indica el motivo" };

  let delta: number;
  if (kind === "entrada") delta = amount;
  else if (kind === "salida") {
    if (amount > item.qty)
      return {
        ok: false,
        error: `Solo hay ${fmtQty(item.qty)} ${item.unit}: no se puede sacar más.`,
      };
    delta = -amount;
  } else {
    if (amount === item.qty) return { ok: false, error: "Esa ya es la cantidad registrada" };
    delta = round3(amount - item.qty);
  }
  const qty = round3(item.qty + delta);
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
  const price = input.totalPrice;
  if (price !== undefined && (!Number.isFinite(price) || price < 0))
    return { ok: false, error: "Escribe el precio pagado en pesos" };
  const cost = kind === "entrada" && price && amount > 0 ? round3(price / amount) : item.cost;
  const next = withMove(state, move, { ...item, qty, ...(cost !== undefined ? { cost } : {}) });
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

/* ——— Recetas (etapa 2) ——— */

export interface RecipeDraft {
  dishId: string;
  /** Vacío: vale para todas las opciones del plato. */
  variantId: string;
  lines: { itemId: string; qty: string }[];
  /** Vacío: sin tope diario. */
  dailyMax: string;
}

export interface RecipeErrors {
  dishId?: string;
  lines?: string;
  dailyMax?: string;
}

export const emptyRecipeDraft = (): RecipeDraft => ({
  dishId: "",
  variantId: "",
  lines: [{ itemId: "", qty: "" }],
  dailyMax: "",
});

export function validateRecipe(
  draft: RecipeDraft,
  items: readonly InventoryItem[],
  recipes: readonly Recipe[],
  editingId?: string,
  /** Productos de salida de las preparaciones por lote: esos platos no llevan receta por venta. */
  batchOutputs: readonly string[] = [],
): RecipeErrors {
  const errors: RecipeErrors = {};
  if (!draft.dishId) errors.dishId = "Elige el plato";
  else if (
    items.some(
      (i) =>
        batchOutputs.includes(i.id) &&
        matches(i.link, draft.dishId, draft.variantId || i.link?.variantId || ""),
    )
  )
    errors.dishId = "Ese plato se vende por lote: sus porciones salen de una preparación";
  else if (
    recipes.some(
      (r) =>
        r.id !== editingId && r.dishId === draft.dishId && (r.variantId ?? "") === draft.variantId,
    )
  )
    errors.dishId = "Ese plato ya tiene una receta para esa opción";
  const lines = draft.lines.filter((l) => l.itemId || l.qty.trim());
  if (lines.length === 0) errors.lines = "Agrega al menos un ingrediente";
  else if (lines.some((l) => !items.some((i) => i.id === l.itemId)))
    errors.lines = "Elige el producto de cada ingrediente";
  else if (new Set(lines.map((l) => l.itemId)).size !== lines.length)
    errors.lines = "Un producto no puede repetirse en la receta";
  else if (lines.some((l) => !(parseQty(l.qty) > 0)))
    errors.lines = "Escribe cuánto gasta cada ingrediente (mayor que cero)";
  const max = draft.dailyMax.trim();
  if (max && !(/^\d+$/.test(max) && Number(max) > 0))
    errors.dailyMax = "Escribe un número entero mayor que cero, o déjalo vacío";
  return errors;
}

/** Guarda (o reemplaza) la receta. Devuelve la lista nueva. */
export function saveRecipe(recipes: readonly Recipe[], draft: RecipeDraft, id: string): Recipe[] {
  const max = draft.dailyMax.trim();
  const recipe: Recipe = {
    id,
    dishId: draft.dishId,
    ...(draft.variantId ? { variantId: draft.variantId } : {}),
    lines: draft.lines
      .filter((l) => l.itemId)
      .map((l) => ({ itemId: l.itemId, qty: parseQty(l.qty) })),
    ...(max ? { dailyMax: Number(max) } : {}),
  };
  return recipes.some((r) => r.id === id)
    ? recipes.map((r) => (r.id === id ? recipe : r))
    : [...recipes, recipe];
}

export const recipeToDraft = (r: Recipe): RecipeDraft => ({
  dishId: r.dishId,
  variantId: r.variantId ?? "",
  lines: r.lines.map((l) => ({ itemId: l.itemId, qty: fmtQty(l.qty) })),
  dailyMax: r.dailyMax === undefined ? "" : String(r.dailyMax),
});

/** Cuántos platos salen con lo que hay en el inventario (por el ingrediente que primero se acaba). */
export function recipePortions(recipe: Recipe, items: readonly InventoryItem[]): number {
  const counts = recipe.lines.map((l) => {
    const item = items.find((i) => i.id === l.itemId);
    return item ? Math.max(0, Math.floor(round3(item.qty / l.qty) + 1e-9)) : 0;
  });
  return counts.length ? Math.min(...counts) : 0;
}

/** El ingrediente que limita cuántos platos salen. */
export function limitingItem(recipe: Recipe, items: readonly InventoryItem[]) {
  let worst: { item: InventoryItem; portions: number } | undefined;
  for (const l of recipe.lines) {
    const item = items.find((i) => i.id === l.itemId);
    if (!item) continue;
    const portions = Math.max(0, Math.floor(round3(item.qty / l.qty) + 1e-9));
    if (!worst || portions < worst.portions) worst = { item, portions };
  }
  return worst;
}
