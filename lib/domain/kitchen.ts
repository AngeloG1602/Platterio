import { STATUS_LABEL, TIMELINE } from "./orderStatus";
import type { Order, OrderStatus } from "./types";

/* ——— Tablero de cocina (US-28) ——— */

export type KitchenColumn = "confirmado" | "en_preparacion" | "listo";

export const KITCHEN_COLUMNS: KitchenColumn[] = ["confirmado", "en_preparacion", "listo"];

/** Minutos desde la confirmación a partir de los cuales la tarjeta cambia de color. */
export const KITCHEN_WARN_MIN = 10;
export const KITCHEN_LATE_MIN = 20;

/**
 * Pedidos del tablero por columna. Solo entra lo que el mesero confirmó (regla 1), en orden de
 * llegada a la cocina. Los ítems quitados por el mesero no se muestran.
 */
export function kitchenBoard(orders: readonly Order[]): Record<KitchenColumn, Order[]> {
  const arrival = (o: Order) => o.confirmedAt ?? o.createdAt;
  const board: Record<KitchenColumn, Order[]> = { confirmado: [], en_preparacion: [], listo: [] };
  for (const order of orders) {
    if (
      order.status === "confirmado" ||
      order.status === "en_preparacion" ||
      order.status === "listo"
    ) {
      board[order.status].push({ ...order, items: order.items.filter((i) => !i.removed) });
    }
  }
  for (const col of KITCHEN_COLUMNS)
    board[col].sort((a, b) => arrival(a).localeCompare(arrival(b)));
  return board;
}

export type KitchenTimeLevel = "normal" | "lento" | "atrasado";

/** Nivel de urgencia según los minutos desde que el mesero confirmó. */
export function kitchenTimeLevel(
  order: Pick<Order, "confirmedAt" | "createdAt">,
  now: number,
): KitchenTimeLevel {
  const minutes = (now - Date.parse(order.confirmedAt ?? order.createdAt)) / 60_000;
  if (minutes >= KITCHEN_LATE_MIN) return "atrasado";
  if (minutes >= KITCHEN_WARN_MIN) return "lento";
  return "normal";
}

/** Siguiente paso que puede dar la cocina con un toque. */
export function kitchenNextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "confirmado") return "en_preparacion";
  if (status === "en_preparacion") return "listo";
  return null;
}

/* ——— Línea de tiempo del cliente (US-29) ——— */

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  at?: string;
  state: "hecho" | "actual" | "pendiente";
}

const STAMP: Partial<Record<OrderStatus, keyof Order>> = {
  pendiente: "createdAt",
  confirmado: "confirmedAt",
  en_preparacion: "preparingAt",
  listo: "readyAt",
  entregado: "deliveredAt",
};

/**
 * Pasos de la ronda con su hora. Si se rechazó, la línea termina en "Rechazado" después de
 * "Pendiente de confirmación".
 */
export function orderTimeline(order: Order): TimelineStep[] {
  if (order.status === "rechazado") {
    return [
      { status: "pendiente", label: STATUS_LABEL.pendiente, at: order.createdAt, state: "hecho" },
      { status: "rechazado", label: STATUS_LABEL.rechazado, state: "actual" },
    ];
  }
  const current = TIMELINE.indexOf(order.status);
  return TIMELINE.map((status, i) => {
    const key = STAMP[status];
    const at = key ? (order[key] as string | undefined) : undefined;
    return {
      status,
      label: STATUS_LABEL[status],
      at: i <= current ? at : undefined,
      state:
        i < current
          ? "hecho"
          : i === current
            ? status === "entregado"
              ? "hecho"
              : "actual"
            : "pendiente",
    };
  });
}

/** Avance de 0 a 1 para la barra de progreso de la ronda. */
export function timelineProgress(order: Pick<Order, "status">): number {
  if (order.status === "rechazado") return 0;
  return TIMELINE.indexOf(order.status) / (TIMELINE.length - 1);
}
