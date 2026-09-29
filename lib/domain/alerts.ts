import { confirmLevel } from "./waiter";
import type { Alert, Order, Waiter } from "./types";

export const unconfirmedAlertId = (orderId: string) => `alerta-sin-confirmar-${orderId}`;

/**
 * Alertas "sin confirmar" para el administrador (US-27): una por pedido que supera el doble del
 * tiempo límite. Se resuelven solas cuando el pedido deja de estar pendiente.
 * Devuelve el mismo arreglo si no hay cambios (para no disparar renders ni transmisiones).
 */
export function syncUnconfirmedAlerts(params: {
  alerts: readonly Alert[];
  orders: readonly Order[];
  waiters: readonly Waiter[];
  now: number;
  timeoutMin: number;
}): readonly Alert[] {
  const { alerts, orders, waiters, now, timeoutMin } = params;
  let changed = false;
  const byId = new Map(alerts.map((a) => [a.id, a]));
  const next = alerts.map((a) => {
    if (a.type !== "sin_confirmar" || a.resolved || !a.orderId) return a;
    const order = orders.find((o) => o.id === a.orderId);
    if (order && order.status === "pendiente") return a;
    changed = true;
    return { ...a, resolved: true };
  });
  for (const order of orders) {
    if (order.status !== "pendiente") continue;
    if (confirmLevel(order.createdAt, now, timeoutMin) !== "critica") continue;
    const id = unconfirmedAlertId(order.id);
    if (byId.has(id)) continue;
    changed = true;
    next.push({
      id,
      type: "sin_confirmar",
      tableId: order.tableId,
      waiterId: waiters.find((w) => w.tableIds.includes(order.tableId))?.id,
      orderId: order.id,
      createdAt: new Date(now).toISOString(),
      resolved: false,
    });
  }
  return changed ? next : alerts;
}
