import { unitPrice } from "./cart";
import type { Dish, Order, OrderChange, OrderItem, TableSession } from "./types";

/** Id con el que se agrupan en el ticket los platos que el personal tomó en la mesa. */
export const STAFF_DINER_ID = "personal";
export const STAFF_DINER_LABEL = "Mesero";

export interface StaffLine {
  dishId: string;
  variantId: string;
  qty: number;
  note?: string;
}

export type StaffOrderResult = { ok: true; order: Order } | { ok: false; error: string };

function checkLine(line: StaffLine, dishes: readonly Dish[]): string | null {
  const dish = dishes.find((d) => d.id === line.dishId);
  if (!dish) return "Ese plato ya no existe";
  if (!dish.active) return `${dish.name} no está disponible`;
  if (!dish.variants.some((v) => v.id === line.variantId))
    return `Elige una opción válida de ${dish.name}`;
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 20)
    return "La cantidad va de 1 a 20";
  return null;
}

/**
 * Pedido tomado por el personal en la mesa: va directo a cocina (ya lo confirma quien lo toma)
 * y queda marcado como del personal. No pide comensal ni reseñas.
 */
export function createStaffOrder(params: {
  session: TableSession;
  orders: readonly Order[];
  dishes: readonly Dish[];
  lines: readonly StaffLine[];
  staffName: string;
  now: string;
  orderId: string;
  newId: () => string;
}): StaffOrderResult {
  const { session, orders, dishes, lines, staffName, now, orderId, newId } = params;
  if (session.closedAt) return { ok: false, error: "La mesa ya se cerró" };
  if (lines.length === 0) return { ok: false, error: "Agrega al menos un plato" };
  for (const l of lines) {
    const err = checkLine(l, dishes);
    if (err) return { ok: false, error: err };
  }
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const items = lines.map<OrderItem>((l) => {
    const note = l.note?.trim();
    return {
      id: newId(),
      dishId: l.dishId,
      variantId: l.variantId,
      qty: l.qty,
      ...(note ? { note } : {}),
      dinerId: STAFF_DINER_ID,
      unitPrice: unitPrice(byId.get(l.dishId), l.variantId),
    };
  });
  return {
    ok: true,
    order: {
      id: orderId,
      sessionId: session.id,
      tableId: session.tableId,
      round: orders.filter((o) => o.sessionId === session.id).length + 1,
      status: "confirmado",
      createdAt: now,
      confirmedAt: now,
      createdBy: staffName,
      items,
    },
  };
}

export type OrderEdit =
  | { type: "quitar"; itemId: string }
  | { type: "cantidad"; itemId: string; qty: number }
  | { type: "variante"; itemId: string; variantId: string }
  | { type: "agregar"; line: StaffLine }
  | { type: "anular" };

/** Estados en los que el personal todavía puede tocar una ronda. */
export function isEditable(order: Order): boolean {
  return order.status !== "rechazado";
}

/**
 * Edita una ronda en cualquier estado menos rechazada. El personal puede hacerlo siempre,
 * pero todo queda en `order.changes` con quién, cuándo y por qué (agregar no pide motivo).
 */
export function editOrder(params: {
  order: Order;
  edit: OrderEdit;
  reason: string;
  dishes: readonly Dish[];
  staffName: string;
  now: string;
  changeId: string;
  itemId: string;
}): StaffOrderResult {
  const { order, edit, dishes, staffName, now, changeId } = params;
  if (!isEditable(order)) return { ok: false, error: "Esta ronda ya está anulada" };
  const reason = params.reason.trim();
  const dishOf = (id: string) => dishes.find((d) => d.id === id);
  const nameOf = (i: OrderItem) => dishOf(i.dishId)?.name ?? "Un plato";
  const variantName = (dishId: string, variantId: string) =>
    dishOf(dishId)?.variants.find((v) => v.id === variantId)?.name ?? "";
  if (edit.type !== "agregar" && !reason)
    return { ok: false, error: "Indica el motivo del cambio" };

  const log = (c: Omit<OrderChange, "id" | "at" | "by" | "reason">): OrderChange => ({
    id: changeId,
    at: now,
    by: staffName,
    ...c,
    ...(reason ? { reason } : {}),
  });
  const withChange = (next: Order, change: OrderChange): Order => ({
    ...next,
    changes: [...(order.changes ?? []), change],
  });

  if (edit.type === "anular") {
    const change = log({
      kind: "anular",
      dishName: `Ronda ${order.round}`,
      detail: "Ronda anulada",
    });
    return {
      ok: true,
      order: withChange({ ...order, status: "rechazado", rejectReason: reason }, change),
    };
  }

  if (edit.type === "agregar") {
    const err = checkLine(edit.line, dishes);
    if (err) return { ok: false, error: err };
    const dish = dishOf(edit.line.dishId)!;
    const note = edit.line.note?.trim();
    const item: OrderItem = {
      id: params.itemId,
      dishId: edit.line.dishId,
      variantId: edit.line.variantId,
      qty: edit.line.qty,
      ...(note ? { note } : {}),
      dinerId: STAFF_DINER_ID,
      unitPrice: unitPrice(dish, edit.line.variantId),
      addedByStaff: true,
    };
    const change = log({
      kind: "agregar",
      dishName: dish.name,
      detail: `+${edit.line.qty}`,
    });
    return { ok: true, order: withChange({ ...order, items: [...order.items, item] }, change) };
  }

  const item = order.items.find((i) => i.id === edit.itemId);
  if (!item || item.removed) return { ok: false, error: "Ese plato ya no está en el pedido" };
  const original = item.adjustedFrom ?? { qty: item.qty, variantId: item.variantId };
  let next: OrderItem;
  let change: OrderChange;

  if (edit.type === "quitar") {
    if (order.items.filter((i) => !i.removed && i.id !== item.id).length === 0)
      return { ok: false, error: "Si quitas todo, anula la ronda" };
    next = { ...item, removed: true, adjustReason: reason };
    change = log({ kind: "quitar", dishName: nameOf(item), detail: `Quitó ${item.qty}` });
  } else if (edit.type === "cantidad") {
    if (!Number.isInteger(edit.qty) || edit.qty < 1 || edit.qty > 20)
      return { ok: false, error: "La cantidad va de 1 a 20" };
    if (edit.qty === item.qty) return { ok: false, error: "La cantidad es la misma" };
    next = { ...item, qty: edit.qty, adjustReason: reason, adjustedFrom: original };
    change = log({
      kind: "cantidad",
      dishName: nameOf(item),
      detail: `${item.qty} → ${edit.qty}`,
    });
  } else {
    const variant = dishOf(item.dishId)?.variants.find((v) => v.id === edit.variantId);
    if (!variant) return { ok: false, error: "Elige una opción válida" };
    if (variant.id === item.variantId) return { ok: false, error: "Es la misma opción" };
    next = {
      ...item,
      variantId: variant.id,
      unitPrice: variant.price,
      adjustReason: reason,
      adjustedFrom: original,
    };
    change = log({
      kind: "variante",
      dishName: nameOf(item),
      detail: `${variantName(item.dishId, item.variantId)} → ${variant.name}`,
    });
  }
  return {
    ok: true,
    order: withChange(
      { ...order, items: order.items.map((i) => (i.id === item.id ? next : i)) },
      change,
    ),
  };
}

/** Cambios que la cocina todavía no ha visto (solo importan mientras la ronda está en cocina). */
export function unseenChanges(order: Order): OrderChange[] {
  if (!["confirmado", "en_preparacion", "listo"].includes(order.status)) return [];
  const seen = order.kitchenAckAt ? Date.parse(order.kitchenAckAt) : 0;
  return (order.changes ?? []).filter((c) => Date.parse(c.at) > seen);
}

export function acknowledgeChanges(order: Order, now: string): Order {
  return { ...order, kitchenAckAt: now };
}
