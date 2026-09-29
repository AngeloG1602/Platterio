import type { DishRating } from "./types";

export interface RatingStats {
  count: number;
  sum: number;
  average: number | null;
}

type RatingLike = Pick<DishRating, "dishId" | "stars">;

export const EMPTY_STATS: RatingStats = { count: 0, sum: 0, average: null };

/** Conteo, suma y promedio de estrellas por plato. */
export function ratingStatsByDish(ratings: readonly RatingLike[]): Map<string, RatingStats> {
  const map = new Map<string, RatingStats>();
  for (const r of ratings) {
    const prev = map.get(r.dishId) ?? EMPTY_STATS;
    const count = prev.count + 1;
    const sum = prev.sum + r.stars;
    map.set(r.dishId, { count, sum, average: sum / count });
  }
  return map;
}

/** Promedio global de todas las calificaciones (la `m` del promedio bayesiano). */
export function globalAverage(ratings: readonly RatingLike[]): number | null {
  if (ratings.length === 0) return null;
  return ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
}

/**
 * Promedio bayesiano (BRIEF §9): (C·m + suma) / (C + n).
 * Con C = 5, un plato con dos reseñas de 5 no le gana a uno con cien de 4,6.
 */
export function bayesianAverage(
  stats: Pick<RatingStats, "count" | "sum">,
  m: number,
  C = 5,
): number {
  return (C * m + stats.sum) / (C + stats.count);
}
