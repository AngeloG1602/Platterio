import type { Order, OrderStatus } from "./types";

/** Quién puede mover cada estado (regla 2). */
export type Actor = "mesero" | "cocina";

interface Transition {
  to: OrderStatus;
  by: Actor;
  requiresReason?: boolean;
}

const TRANSITIONS: Record<OrderStatus, Transition[]> = {
  pendiente: [
    { to: "confirmado", by: "mesero" },
    { to: "rechazado", by: "mesero", requiresReason: true },
  ],
  confirmado: [{ to: "en_preparacion", by: "cocina" }],
  en_preparacion: [{ to: "listo", by: "cocina" }],
  listo: [{ to: "entregado", by: "mesero" }],
  entregado: [],
  rechazado: [],
};

/** Orden de la línea de tiempo del cliente (rechazado queda fuera). */
export const TIMELINE: OrderStatus[] = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "listo",
  "entregado",
];

export function allowedTransitions(status: OrderStatus, actor: Actor): OrderStatus[] {
  return TRANSITIONS[status].filter((t) => t.by === actor).map((t) => t.to);
}

export function isFinal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export type TransitionResult = { ok: true; order: Order } | { ok: false; error: string };

/**
 * Única puerta para cambiar el estado de un pedido (BRIEF §10).
 * Valida el siguiente estado permitido, el actor y el motivo, y sella la hora del cambio.
 */
export function transitionOrder(
  order: Order,
  to: OrderStatus,
  actor: Actor,
  at: string,
  reason?: string,
): TransitionResult {
  const transition = TRANSITIONS[order.status].find((t) => t.to === to);
  if (!transition) {
    return {
      ok: false,
      error: `Un pedido ${STATUS_LABEL[order.status].toLowerCase()} no puede pasar a ${STATUS_LABEL[to].toLowerCase()}`,
    };
  }
  if (transition.by !== actor) {
    return {
      ok: false,
      error: `Ese cambio lo hace ${transition.by === "mesero" ? "el mesero" : "la cocina"}`,
    };
  }
  if (transition.requiresReason && !reason?.trim()) {
    return { ok: false, error: "Indica el motivo" };
  }
  if (to === "confirmado" && order.items.every((i) => i.removed)) {
    return { ok: false, error: "No puedes confirmar un pedido sin platos" };
  }

  const next: Order = { ...order, status: to };
  if (to === "confirmado") next.confirmedAt = at;
  if (to === "en_preparacion") next.preparingAt = at;
  if (to === "listo") next.readyAt = at;
  if (to === "entregado") next.deliveredAt = at;
  if (to === "rechazado") next.rejectReason = reason!.trim();
  return { ok: true, order: next };
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: "Pendiente de confirmación",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
  rechazado: "Rechazado",
};

/** Mensaje cercano para el cliente. */
export const STATUS_MESSAGE: Record<OrderStatus, string> = {
  pendiente: "Enviado — esperando confirmación del mesero",
  confirmado: "El mesero confirmó tu pedido",
  en_preparacion: "Tu pedido está en la cocina",
  listo: "¡Listo! Ya te lo llevan a la mesa",
  entregado: "Entregado. ¡Buen provecho!",
  rechazado: "El mesero no pudo aceptar este pedido",
};
