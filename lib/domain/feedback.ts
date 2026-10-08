import type {
  Alert,
  Dish,
  DishRating,
  Order,
  ServiceRating,
  Stars,
  TableSession,
  Waiter,
} from "./types";
import { localized, t } from "@/lib/i18n";

export const COMMENT_MAX = 280;

export interface RatableDish {
  dish: Dish;
  orderId: string;
  /** El comensal pidió este plato él mismo. */
  mine: boolean;
  existing?: DishRating;
}

/**
 * Platos que el comensal puede calificar (US-30, regla 7): solo de rondas entregadas.
 * Un registro por plato y ronda; primero lo que pidió él. Si no pidió nada (otro pidió por
 * él), puede calificar todo lo de la mesa.
 */
export function ratableDishes(params: {
  session: TableSession;
  orders: readonly Order[];
  dishes: readonly Dish[];
  ratings: readonly DishRating[];
  dinerId: string;
}): RatableDish[] {
  const { session, orders, dishes, ratings, dinerId } = params;
  const delivered = orders.filter((o) => o.sessionId === session.id && o.status === "entregado");
  const all: RatableDish[] = [];
  const seen = new Set<string>();
  for (const order of delivered) {
    for (const item of order.items) {
      if (item.removed) continue;
      const key = `${order.id}:${item.dishId}`;
      const dish = dishes.find((d) => d.id === item.dishId);
      if (!dish) continue;
      const mine = item.dinerId === dinerId;
      const existing = seen.has(key)
        ? all.find((r) => `${r.orderId}:${r.dish.id}` === key)
        : undefined;
      if (existing) {
        existing.mine ||= mine;
        continue;
      }
      seen.add(key);
      all.push({
        dish,
        orderId: order.id,
        mine,
        existing: ratings.find(
          (r) => r.orderId === order.id && r.dishId === dish.id && r.dinerId === dinerId,
        ),
      });
    }
  }
  const mine = all.filter((r) => r.mine);
  return mine.length > 0 ? [...mine, ...all.filter((r) => !r.mine)] : all;
}

export interface DishRatingDraft {
  orderId: string;
  dishId: string;
  stars: number;
  comment?: string;
}

export type RateDishesResult =
  { ok: true; ratings: DishRating[] } | { ok: false; error: string; dishId?: string };

/** Valida y crea las calificaciones de platos: estrellas obligatorias, comentario opcional. */
export function rateDishes(params: {
  drafts: readonly DishRatingDraft[];
  ratable: readonly RatableDish[];
  dinerId: string;
  now: string;
  newId: () => string;
}): RateDishesResult {
  const { drafts, ratable, dinerId, now, newId } = params;
  const out: DishRating[] = [];
  for (const d of drafts) {
    const target = ratable.find((r) => r.orderId === d.orderId && r.dish.id === d.dishId);
    if (!target)
      return { ok: false, error: "Solo puedes calificar platos entregados", dishId: d.dishId };
    if (target.existing) continue;
    const comment = d.comment?.trim();
    if (!Number.isInteger(d.stars) || d.stars < 1 || d.stars > 5) {
      if (comment)
        return {
          ok: false,
          error: t("Ponle estrellas a {dish} para enviar tu comentario", {
            dish: localized(target.dish),
          }),
          dishId: d.dishId,
        };
      continue;
    }
    if (comment && comment.length > COMMENT_MAX) {
      return {
        ok: false,
        error: t("El comentario va hasta {n} caracteres", { n: COMMENT_MAX }),
        dishId: d.dishId,
      };
    }
    const rating: DishRating = {
      id: newId(),
      dishId: d.dishId,
      orderId: d.orderId,
      stars: d.stars as Stars,
      createdAt: now,
      dinerId,
    };
    if (comment) rating.comment = comment;
    out.push(rating);
  }
  return { ok: true, ratings: out };
}

/** Mesero de la mesa (el que la tiene asignada). */
export function waiterForTable(waiters: readonly Waiter[], tableId: string): Waiter | undefined {
  return waiters.find((w) => w.tableIds.includes(tableId));
}

export type RateServiceResult =
  { ok: true; rating: ServiceRating; alert?: Alert } | { ok: false; error: string };

/**
 * Calificación del servicio (US-31, regla 8): una por visita, asociada al mesero de la mesa.
 * Si queda por debajo del umbral, genera la alerta de servicio bajo (US-34).
 */
export function rateService(params: {
  session: TableSession;
  orders: readonly Order[];
  existing: readonly ServiceRating[];
  waiters: readonly Waiter[];
  stars: number;
  threshold: number;
  dinerId: string;
  now: string;
  newId: (prefix: string) => string;
}): RateServiceResult {
  const { session, orders, existing, waiters, stars, threshold, dinerId, now, newId } = params;
  if (!orders.some((o) => o.sessionId === session.id && o.status === "entregado")) {
    return { ok: false, error: "Podrás calificar cuando te entreguen el pedido" };
  }
  if (existing.some((r) => r.sessionId === session.id)) {
    return { ok: false, error: "El servicio de esta visita ya fue calificado" };
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5)
    return { ok: false, error: "Elige de 1 a 5 estrellas" };
  const waiter = waiterForTable(waiters, session.tableId);
  if (!waiter) return { ok: false, error: "Esta mesa no tiene mesero asignado" };
  const rating: ServiceRating = {
    id: newId("servicio"),
    sessionId: session.id,
    waiterId: waiter.id,
    stars: stars as Stars,
    createdAt: now,
    dinerId,
  };
  if (stars >= threshold) return { ok: true, rating };
  return {
    ok: true,
    rating,
    alert: {
      id: newId("alerta"),
      type: "servicio_bajo",
      tableId: session.tableId,
      waiterId: waiter.id,
      createdAt: now,
      resolved: false,
      stars,
    },
  };
}
