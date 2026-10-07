import type { Order, OrderItem, Table, TableSession, Dish } from "./types";

/* ——— Estado de las mesas (US-25) ——— */

export type TableStatus = "libre" | "con_clientes" | "pendiente" | "en_cocina" | "listo";

export interface TableOverview {
  table: Table;
  status: TableStatus;
  session?: TableSession;
  /** Rondas de la sesión abierta. */
  orders: Order[];
  pending: Order[];
  ready: Order[];
  inKitchen: Order[];
}

/**
 * Estado de una mesa para el mapa del mesero. Si hay varias cosas a la vez, gana lo más urgente:
 * pedido por confirmar > listo para entregar > en cocina > con clientes > libre.
 */
export function tableOverview(
  table: Table,
  sessions: readonly TableSession[],
  orders: readonly Order[],
): TableOverview {
  const session = sessions.find((s) => s.tableId === table.id && !s.closedAt);
  const own = session ? orders.filter((o) => o.sessionId === session.id) : [];
  const pending = own.filter((o) => o.status === "pendiente");
  const ready = own.filter((o) => o.status === "listo");
  const inKitchen = own.filter((o) => o.status === "confirmado" || o.status === "en_preparacion");
  const status: TableStatus = !session
    ? "libre"
    : pending.length
      ? "pendiente"
      : ready.length
        ? "listo"
        : inKitchen.length
          ? "en_cocina"
          : "con_clientes";
  return { table, status, session, orders: own, pending, ready, inKitchen };
}

/* ——— Tiempo sin confirmar (US-27) ——— */

export type ConfirmLevel = "a_tiempo" | "alerta" | "critica";

/** a_tiempo < límite ≤ alerta < 2×límite ≤ crítica (se avisa también al administrador). */
export function confirmLevel(createdAt: string, now: number, timeoutMin: number): ConfirmLevel {
  const elapsed = now - Date.parse(createdAt);
  const limit = timeoutMin * 60_000;
  if (elapsed >= 2 * limit) return "critica";
  if (elapsed >= limit) return "alerta";
  return "a_tiempo";
}

/* ——— Ajustes del mesero (US-26, regla 5) ——— */

export const ADJUST_REASONS = ["Agotado", "Cambio pedido por el cliente", "Otro"] as const;
export const REJECT_REASONS = [
  "Cocina cerrada",
  "Pedido duplicado",
  "Mesa equivocada",
  "Otro",
] as const;

export type ItemAdjustment =
  { type: "quitar" } | { type: "cantidad"; qty: number } | { type: "variante"; variantId: string };

export type AdjustResult = { ok: true; order: Order } | { ok: false; error: string };

/**
 * Ajusta un ítem antes de confirmar. Exige motivo, solo toca ese ítem y guarda el valor
 * original para que el cliente vea qué cambió.
 */
export function adjustOrderItem(
  order: Order,
  itemId: string,
  change: ItemAdjustment,
  reason: string,
  dish: Dish | undefined,
): AdjustResult {
  if (order.status !== "pendiente")
    return { ok: false, error: "Solo se ajustan pedidos sin confirmar" };
  const item = order.items.find((i) => i.id === itemId);
  if (!item || item.removed) return { ok: false, error: "Ese ítem ya no está en el pedido" };
  const why = reason.trim();
  if (!why) return { ok: false, error: "Indica el motivo del cambio" };

  const original = item.adjustedFrom ?? { qty: item.qty, variantId: item.variantId };
  let next: OrderItem;
  if (change.type === "quitar") {
    const remaining = order.items.filter((i) => !i.removed && i.id !== itemId);
    if (remaining.length === 0)
      return { ok: false, error: "Si quitas todo, mejor rechaza el pedido" };
    next = { ...item, removed: true, adjustReason: why };
  } else if (change.type === "cantidad") {
    if (!Number.isInteger(change.qty) || change.qty < 1 || change.qty > 20) {
      return { ok: false, error: "La cantidad va de 1 a 20" };
    }
    if (change.qty === item.qty) return { ok: false, error: "La cantidad es la misma" };
    next = { ...item, qty: change.qty, adjustReason: why, adjustedFrom: original };
  } else {
    const variant = dish?.variants.find((v) => v.id === change.variantId);
    if (!variant) return { ok: false, error: "Elige una opción válida" };
    if (variant.id === item.variantId) return { ok: false, error: "Es la misma opción" };
    next = {
      ...item,
      variantId: variant.id,
      unitPrice: variant.price,
      adjustReason: why,
      adjustedFrom: original,
    };
  }
  return {
    ok: true,
    order: { ...order, items: order.items.map((i) => (i.id === itemId ? next : i)) },
  };
}

/* ——— Liberar mesa (US-21, regla 3) ——— */

export type ReleaseResult = { ok: true; session: TableSession } | { ok: false; error: string };

/** Cierra la sesión. No se puede con rondas sin entregar; el siguiente escaneo abre sesión nueva. */
export function releaseSession(
  session: TableSession,
  orders: readonly Order[],
  now: string,
): ReleaseResult {
  if (session.closedAt) return { ok: false, error: "La mesa ya estaba libre" };
  const open = orders.filter(
    (o) => o.sessionId === session.id && o.status !== "entregado" && o.status !== "rechazado",
  );
  if (open.length > 0) {
    return {
      ok: false,
      error: `Hay ${open.length === 1 ? "una ronda" : `${open.length} rondas`} sin entregar`,
    };
  }
  return { ok: true, session: { ...session, closedAt: now, cart: [], closeReason: "mesero" } };
}
