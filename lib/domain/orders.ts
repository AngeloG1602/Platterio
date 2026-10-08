import { itemUnitPrice } from "./cart";
import type { Dish, Order, TableSession } from "./types";
import { localized, t } from "@/lib/i18n";

export type SubmitResult =
  { ok: true; order: Order; session: TableSession } | { ok: false; error: string };

/**
 * Envía el carrito de la mesa como una nueva ronda (US-22, US-23, regla 4).
 *
 * `expectedItemIds` son los ítems que el comensal vio al confirmar. Si mientras tanto otro
 * celular ya envió (el carrito cambió o quedó vacío), se rechaza en vez de crear una ronda doble.
 */
export function submitRound(params: {
  session: TableSession;
  orders: readonly Order[];
  dishes: readonly Dish[];
  dinerId: string;
  expectedItemIds: readonly string[];
  now: string;
  orderId: string;
}): SubmitResult {
  const { session, orders, dishes, dinerId, expectedItemIds, now, orderId } = params;
  if (session.closedAt) return { ok: false, error: "La mesa ya se cerró" };
  if (!session.diners.some((d) => d.id === dinerId))
    return { ok: false, error: "Primero entra a la mesa" };
  if (session.cart.length === 0) {
    return {
      ok: false,
      error: expectedItemIds.length
        ? "Alguien de la mesa ya envió el pedido"
        : "El carrito está vacío",
    };
  }
  const current = new Set(session.cart.map((c) => c.id));
  const sameCart =
    expectedItemIds.length === current.size && expectedItemIds.every((id) => current.has(id));
  if (!sameCart) return { ok: false, error: "El carrito cambió. Revísalo antes de enviar." };

  const byId = new Map(dishes.map((d) => [d.id, d]));
  const unavailable = session.cart.find((c) => !byId.get(c.dishId)?.active);
  const unavailableDish = unavailable ? byId.get(unavailable.dishId) : undefined;
  if (unavailable) {
    return {
      ok: false,
      error: t("{dish} ya no está disponible. Quítalo para enviar.", {
        dish: unavailableDish ? localized(unavailableDish) : t("Un plato"),
      }),
    };
  }

  const round = orders.filter((o) => o.sessionId === session.id).length + 1;
  const order: Order = {
    id: orderId,
    sessionId: session.id,
    tableId: session.tableId,
    round,
    status: "pendiente",
    createdAt: now,
    sentByDinerId: dinerId,
    items: session.cart.map((c) => ({
      ...c,
      unitPrice: itemUnitPrice(c, byId.get(c.dishId)),
    })),
  };
  return { ok: true, order, session: { ...session, cart: [] } };
}
