import { STATUS_LABEL, TIMELINE } from "./orderStatus";
import type { Order, OrderStatus } from "./types";

/* ——— Cola de cocina (US-28, US-80 a 85) ——— */

/** Estados en los que una ronda está en la cocina por hacer. "confirmado" es de datos antiguos. */
const IN_QUEUE = new Set<OrderStatus>(["confirmado", "en_preparacion"]);
/** Estados en los que una ronda ya llegó a la cocina alguna vez. */
const REACHED_KITCHEN = new Set<OrderStatus>([
  "confirmado",
  "en_preparacion",
  "listo",
  "entregado",
]);

/** Cuántos pedidos ya hechos guarda la vista de consulta. */
export const KITCHEN_DONE_LIMIT = 30;

/** Minutos desde la confirmación a partir de los cuales la tarjeta cambia de color. */
export const KITCHEN_WARN_MIN = 10;
export const KITCHEN_LATE_MIN = 20;

export interface KitchenTicket {
  order: Order;
  /**
   * Es un pedido de una mesa que ya había mandado otra ronda a la cocina. Se marca en rojo para
   * que no quede enterrado detrás de los de otras mesas; no cambia su lugar en la cola.
   */
  additional: boolean;
}

export interface KitchenView {
  /** Rondas por hacer, en orden de llegada a la cocina. */
  queue: KitchenTicket[];
  /** Rondas que la cocina ya marcó como listas, la más reciente primero. */
  done: Order[];
}

/** ¿La mesa ya había mandado una ronda anterior a la cocina? */
export function isAdditionalRound(order: Order, orders: readonly Order[]): boolean {
  return orders.some(
    (o) =>
      o.id !== order.id &&
      o.sessionId === order.sessionId &&
      o.round < order.round &&
      REACHED_KITCHEN.has(o.status),
  );
}

/**
 * Lo que ve la cocina. Solo entra lo que el mesero confirmó (regla 1). Una sola cola en orden de
 * llegada (la hora de confirmación) y, aparte, lo ya hecho para consultar. Los ítems quitados
 * por el mesero no se muestran.
 */
export function kitchenBoard(orders: readonly Order[]): KitchenView {
  const arrival = (o: Order) => o.confirmedAt ?? o.createdAt;
  const visible = (o: Order): Order => ({ ...o, items: o.items.filter((i) => !i.removed) });
  const queue = orders
    .filter((o) => IN_QUEUE.has(o.status))
    .sort((a, b) => arrival(a).localeCompare(arrival(b)))
    .map((o) => ({ order: visible(o), additional: isAdditionalRound(o, orders) }));
  const done = orders
    .filter((o) => o.status === "listo")
    .sort((a, b) => (b.readyAt ?? "").localeCompare(a.readyAt ?? ""))
    .slice(0, KITCHEN_DONE_LIMIT)
    .map(visible);
  return { queue, done };
}

export type KitchenDensity = "grande" | "media" | "compacta" | "minima";

/**
 * Cuánto detalle y cuántas columnas usa la cola según cuántos pedidos hay, para que todos
 * quepan en la pantalla sin desplazarse. Con pocos pedidos, letra grande; con muchos, tarjetas
 * más densas en más columnas (sin esconder ningún dato).
 */
export function kitchenLayout(count: number): { density: KitchenDensity; columns: number } {
  if (count <= 3) return { density: "grande", columns: Math.max(1, count) };
  if (count <= 6) return { density: "media", columns: 3 };
  if (count <= 12) return { density: "compacta", columns: 4 };
  return { density: "minima", columns: 5 };
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

/** Único paso de la cocina: marcar listo lo que está en la cola. */
export function kitchenNextStatus(status: OrderStatus): OrderStatus | null {
  return IN_QUEUE.has(status) ? "listo" : null;
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
