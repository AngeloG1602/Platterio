import { STAFF_DINER_ID, STAFF_DINER_LABEL } from "./staffOrders";
import type { Diner, Dish, Order, OrderItem, OrderStatus, Variant } from "./types";

export interface TicketLine {
  item: OrderItem;
  dish: Dish | undefined;
  variant: Variant | undefined;
  /** 0 si el mesero quitó el ítem. */
  lineTotal: number;
}

export interface TicketDinerGroup {
  dinerId: string;
  alias: string;
  lines: TicketLine[];
  subtotal: number;
}

export interface TicketRound {
  order: Order;
  round: number;
  status: OrderStatus;
  groups: TicketDinerGroup[];
  /** Ítems ajustados o quitados por el mesero, con su motivo (regla 5). */
  adjustments: TicketLine[];
  subtotal: number;
  itemCount: number;
}

export interface Ticket {
  rounds: TicketRound[];
  /** Total de la mesa: rondas no rechazadas, sin ítems quitados. */
  total: number;
  itemCount: number;
}

export function lineTotal(item: OrderItem): number {
  return item.removed ? 0 : item.unitPrice * item.qty;
}

/**
 * Consolida el ticket de la mesa (US-24, regla 4): todas las rondas de la sesión, agrupadas
 * por comensal, con subtotales y total. Las rondas rechazadas se muestran pero no suman.
 */
export function consolidateTicket(params: {
  sessionId: string;
  orders: readonly Order[];
  dishes: readonly Dish[];
  diners: readonly Diner[];
}): Ticket {
  const dishById = new Map(params.dishes.map((d) => [d.id, d]));
  const aliasOf = (id: string) =>
    id === STAFF_DINER_ID
      ? STAFF_DINER_LABEL
      : (params.diners.find((d) => d.id === id)?.alias ?? "Alguien de la mesa");
  const dinerOrder = (id: string) => {
    const i = params.diners.findIndex((d) => d.id === id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const rounds = params.orders
    .filter((o) => o.sessionId === params.sessionId)
    .sort((a, b) => a.round - b.round)
    .map<TicketRound>((order) => {
      const lines = order.items.map<TicketLine>((item) => {
        const dish = dishById.get(item.dishId);
        return {
          item,
          dish,
          variant: dish?.variants.find((v) => v.id === item.variantId),
          lineTotal: lineTotal(item),
        };
      });
      const dinerIds = [...new Set(order.items.map((i) => i.dinerId))].sort(
        (a, b) => dinerOrder(a) - dinerOrder(b),
      );
      const groups = dinerIds.map<TicketDinerGroup>((dinerId) => {
        const own = lines.filter((l) => l.item.dinerId === dinerId);
        return {
          dinerId,
          alias: aliasOf(dinerId),
          lines: own,
          subtotal: own.reduce((s, l) => s + l.lineTotal, 0),
        };
      });
      const counts = order.status !== "rechazado";
      const subtotal = counts ? lines.reduce((s, l) => s + l.lineTotal, 0) : 0;
      const itemCount = counts
        ? lines.filter((l) => !l.item.removed).reduce((s, l) => s + l.item.qty, 0)
        : 0;
      return {
        order,
        round: order.round,
        status: order.status,
        groups,
        adjustments: lines.filter((l) => l.item.adjustReason),
        subtotal,
        itemCount,
      };
    });

  return {
    rounds,
    total: rounds.reduce((s, r) => s + r.subtotal, 0),
    itemCount: rounds.reduce((s, r) => s + r.itemCount, 0),
  };
}

/** Frase para el cliente sobre un ajuste del mesero (regla 5), sin el motivo. */
export function describeAdjustment(line: Pick<TicketLine, "item" | "dish" | "variant">): string {
  const { item, dish, variant } = line;
  const name = dish?.name ?? "un plato";
  if (item.removed) return `El mesero quitó ${name}`;
  const from = item.adjustedFrom;
  if (!from) return `El mesero ajustó ${name}`;
  const fromVariant = dish?.variants.find((v) => v.id === from.variantId)?.name;
  const qtyChanged = from.qty !== item.qty;
  const variantChanged = from.variantId !== item.variantId;
  if (qtyChanged && variantChanged) {
    return `El mesero cambió ${name}: ${from.qty}× ${fromVariant ?? ""} → ${item.qty}× ${variant?.name ?? ""}`
      .replace(/\s+/g, " ")
      .trim();
  }
  if (qtyChanged) return `El mesero cambió ${name} de ${from.qty} a ${item.qty}`;
  return `El mesero cambió ${name} de ${fromVariant ?? "la opción original"} a ${variant?.name ?? "otra opción"}`;
}
