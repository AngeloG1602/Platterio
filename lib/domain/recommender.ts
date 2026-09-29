import { conflictingAllergens } from "./allergens";
import { bayesianAverage, globalAverage, ratingStatsByDish } from "./ratings";
import { minutesOfDay, slotContains } from "./timeSlots";
import type { Allergen, Dish, DishRating, Order, TimeSlot } from "./types";

/**
 * Motor de recomendación por reglas ponderadas (BRIEF §9).
 *
 *   puntaje = 0.35·franja + 0.25·popularidad + 0.25·calificación + 0.15·destacado
 */

export const WEIGHTS = {
  franja: 0.35,
  popularidad: 0.25,
  calificacion: 0.25,
  destacado: 0.15,
} as const;

export type RecommendationReason =
  "nuevo" | "popular" | "calificado" | "casa" | "franja" | "descubre";

export const REASON_LABEL: Record<RecommendationReason, string> = {
  nuevo: "Nuevo en la casa",
  popular: "Popular a esta hora",
  calificado: "Mejor calificado",
  casa: "Recomendado por la casa",
  franja: "Ideal para esta hora",
  descubre: "Para descubrir",
};

export interface ScoreBreakdown {
  franja: number;
  popularidad: number;
  calificacion: number;
  destacado: number;
}

export interface Recommendation {
  dish: Dish;
  score: number;
  reason: RecommendationReason;
  breakdown: ScoreBreakdown;
  /** Plato destacado sin pedidos ni calificaciones: se muestra primero (ver DECISIONES.md). */
  coldStart: boolean;
}

export interface RecommendInput {
  dishes: readonly Dish[];
  slot: TimeSlot | null;
  now: Date;
  orders: ReadonlyArray<Pick<Order, "createdAt" | "items" | "status">>;
  ratings: ReadonlyArray<Pick<DishRating, "dishId" | "stars">>;
  restrictions?: readonly Allergen[];
  limit?: number;
  windowDays?: number;
  /** Máximo de platos por categoría en el carrusel, para que no salgan solo bebidas. */
  perCategory?: number;
}

/** Umbrales para que un componente cuente como "motivo" (evita decir "popular" de algo que casi no se pide). */
const REASON_MIN = { popularidad: 0.5, calificacion: 0.6 };

/** Unidades pedidas por plato en la ventana, total y dentro de la franja. */
export function unitsOrdered(
  orders: RecommendInput["orders"],
  now: Date,
  windowDays: number,
  slot: TimeSlot | null,
): { inSlot: Map<string, number>; total: Map<string, number> } {
  const from = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const inSlot = new Map<string, number>();
  const total = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "rechazado") continue;
    const created = new Date(order.createdAt);
    const t = created.getTime();
    if (t < from || t > now.getTime()) continue;
    const matchesSlot = slot ? slotContains(slot, minutesOfDay(created)) : true;
    for (const item of order.items) {
      if ("removed" in item && item.removed) continue;
      total.set(item.dishId, (total.get(item.dishId) ?? 0) + item.qty);
      if (matchesSlot) inSlot.set(item.dishId, (inSlot.get(item.dishId) ?? 0) + item.qty);
    }
  }
  return { inSlot, total };
}

function pickReason(b: ScoreBreakdown, featured: boolean): RecommendationReason {
  const options: Array<[RecommendationReason, number]> = [];
  if (featured) options.push(["casa", WEIGHTS.destacado]);
  if (b.popularidad >= REASON_MIN.popularidad)
    options.push(["popular", WEIGHTS.popularidad * b.popularidad]);
  if (b.calificacion >= REASON_MIN.calificacion)
    options.push(["calificado", WEIGHTS.calificacion * b.calificacion]);
  if (options.length === 0) return b.franja ? "franja" : "descubre";
  options.sort((a, z) => z[1] - a[1]);
  return options[0]![0];
}

export function recommend(input: RecommendInput): Recommendation[] {
  const {
    dishes,
    slot,
    now,
    orders,
    ratings,
    restrictions = [],
    limit = 6,
    windowDays = 14,
    perCategory = 2,
  } = input;

  const candidates = dishes.filter(
    (d) => d.active && conflictingAllergens(d, restrictions).length === 0,
  );
  if (candidates.length === 0) return [];

  const { inSlot, total } = unitsOrdered(orders, now, windowDays, slot);
  const stats = ratingStatsByDish(ratings);
  const m = globalAverage(ratings) ?? 4;

  const maxUnits = Math.max(0, ...candidates.map((d) => inSlot.get(d.id) ?? 0));
  const bayes = new Map(
    candidates.map((d) => [d.id, bayesianAverage(stats.get(d.id) ?? { count: 0, sum: 0 }, m)]),
  );
  const bayesValues = [...bayes.values()];
  const minB = Math.min(...bayesValues);
  const maxB = Math.max(...bayesValues);

  const scored: Recommendation[] = [];
  for (const dish of candidates) {
    const hasOrders = (total.get(dish.id) ?? 0) > 0;
    const hasRatings = (stats.get(dish.id)?.count ?? 0) > 0;
    const coldStart = !hasOrders && !hasRatings;
    // Arranque en frío: sin pedidos ni calificaciones solo aparece si está destacado.
    if (coldStart && !dish.featured) continue;

    const breakdown: ScoreBreakdown = {
      franja: slot && dish.timeSlotIds.includes(slot.id) ? 1 : 0,
      popularidad: maxUnits > 0 ? (inSlot.get(dish.id) ?? 0) / maxUnits : 0,
      calificacion: maxB > minB ? (bayes.get(dish.id)! - minB) / (maxB - minB) : 0.5,
      destacado: dish.featured ? 1 : 0,
    };
    const score =
      WEIGHTS.franja * breakdown.franja +
      WEIGHTS.popularidad * breakdown.popularidad +
      WEIGHTS.calificacion * breakdown.calificacion +
      WEIGHTS.destacado * breakdown.destacado;

    scored.push({
      dish,
      score,
      breakdown,
      coldStart,
      reason: coldStart ? "nuevo" : pickReason(breakdown, dish.featured),
    });
  }

  scored.sort((a, b) => {
    if (a.coldStart !== b.coldStart) return a.coldStart ? -1 : 1;
    if (a.coldStart && b.coldStart) return b.dish.createdAt.localeCompare(a.dish.createdAt);
    return b.score - a.score || a.dish.name.localeCompare(b.dish.name, "es");
  });
  return diversify(scored, limit, perCategory);
}

/** Toma los mejores respetando el tope por categoría; si faltan, completa con los que quedaron. */
function diversify(sorted: Recommendation[], limit: number, perCategory: number): Recommendation[] {
  const picked: Recommendation[] = [];
  const skipped: Recommendation[] = [];
  const perCat = new Map<string, number>();
  for (const rec of sorted) {
    if (picked.length === limit) break;
    const n = perCat.get(rec.dish.categoryId) ?? 0;
    if (n < perCategory || rec.coldStart) {
      picked.push(rec);
      perCat.set(rec.dish.categoryId, n + 1);
    } else skipped.push(rec);
  }
  for (const rec of skipped) {
    if (picked.length === limit) break;
    picked.push(rec);
  }
  return picked.sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
}

/** Título del carrusel según la franja: "Para el almuerzo". */
export function slotHeadline(slot: TimeSlot | null): string {
  if (!slot) return "Recomendados";
  const known: Record<string, string> = {
    desayuno: "Para el desayuno",
    almuerzo: "Para el almuerzo",
    tarde: "Para la tarde",
    noche: "Para la noche",
  };
  return known[slot.id] ?? `Para ${slot.name.toLowerCase()}`;
}
