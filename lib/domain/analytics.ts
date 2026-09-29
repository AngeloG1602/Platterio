import { dishAllergens } from "./allergens";
import { bayesianAverage, globalAverage } from "./ratings";
import { minutesOfDay, slotContains } from "./timeSlots";
import type {
  Allergen,
  Dish,
  DishRating,
  Order,
  ServiceRating,
  TableSession,
  TimeSlot,
  Waiter,
} from "./types";

/* ——— Periodos ——— */

export type PeriodPreset = "hoy" | "7d" | "14d" | "personalizado";

export interface Period {
  from: number;
  to: number;
}

const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Rango de un preset. "Personalizado" usa las fechas dadas (días completos, inclusive). */
export function periodRange(
  preset: PeriodPreset,
  now: number,
  custom?: { from: string; to: string },
): Period {
  if (preset === "hoy") return { from: startOfDay(now), to: now };
  if (preset === "7d") return { from: startOfDay(now) - 6 * DAY, to: now };
  if (preset === "14d") return { from: startOfDay(now) - 13 * DAY, to: now };
  let a = custom?.from ?? "";
  let b = custom?.to ?? "";
  if (a && b && a > b) [a, b] = [b, a];
  const from = a ? new Date(`${a}T00:00:00`).getTime() : startOfDay(now) - 6 * DAY;
  const to = b ? new Date(`${b}T23:59:59.999`).getTime() : now;
  return { from, to };
}

export const inPeriod = (iso: string | undefined, p: Period) => {
  if (!iso) return false;
  const t = Date.parse(iso);
  return t >= p.from && t <= p.to;
};

const avg = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/* ——— Ventas (regla 12: solo pedidos entregados y sus precios) ——— */

export function orderTotal(order: Pick<Order, "items">): number {
  return order.items.reduce((s, i) => s + (i.removed ? 0 : i.unitPrice * i.qty), 0);
}

export interface SalesSummary {
  /** Suma de rondas entregadas en el periodo. */
  sales: number;
  /** Rondas entregadas. */
  delivered: number;
  /** Rondas enviadas por las mesas (sin contar rechazadas). */
  placed: number;
  /** Visitas (sesiones) con algo entregado. */
  visits: number;
  /** Ventas / visitas. */
  avgTicket: number | null;
}

export function salesSummary(orders: readonly Order[], period: Period): SalesSummary {
  const delivered = orders.filter(
    (o) => o.status === "entregado" && inPeriod(o.deliveredAt, period),
  );
  const sales = delivered.reduce((s, o) => s + orderTotal(o), 0);
  const visits = new Set(delivered.map((o) => o.sessionId)).size;
  return {
    sales,
    delivered: delivered.length,
    placed: orders.filter((o) => o.status !== "rechazado" && inPeriod(o.createdAt, period)).length,
    visits,
    avgTicket: visits ? sales / visits : null,
  };
}

export interface DayPoint {
  key: string;
  date: number;
  sales: number;
  orders: number;
}

/** Ventas y rondas entregadas por día del periodo (incluye días en cero). */
export function salesByDay(orders: readonly Order[], period: Period): DayPoint[] {
  const days: DayPoint[] = [];
  for (let d = startOfDay(period.from); d <= period.to; d = startOfDay(d + DAY + 3_600_000)) {
    const date = new Date(d);
    days.push({
      key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      date: d,
      sales: 0,
      orders: 0,
    });
  }
  for (const o of orders) {
    if (o.status !== "entregado" || !inPeriod(o.deliveredAt, period)) continue;
    const day = days.find((x) => x.date === startOfDay(Date.parse(o.deliveredAt!)));
    if (!day) continue;
    day.sales += orderTotal(o);
    day.orders += 1;
  }
  return days;
}

export interface HourPoint {
  hour: number;
  today: number;
  /** Promedio de los días anteriores de la ventana a esa hora. */
  average: number;
}

/** Rondas enviadas por hora hoy frente al promedio de los `baselineDays` anteriores. */
export function ordersByHour(
  orders: readonly Order[],
  now: number,
  { fromHour = 7, toHour = 23, baselineDays = 13 } = {},
): HourPoint[] {
  const today = startOfDay(now);
  const baseFrom = today - baselineDays * DAY;
  const points: HourPoint[] = [];
  for (let h = fromHour; h < toHour; h++) points.push({ hour: h, today: 0, average: 0 });
  for (const o of orders) {
    if (o.status === "rechazado") continue;
    const t = Date.parse(o.createdAt);
    const hour = new Date(t).getHours();
    const p = points.find((x) => x.hour === hour);
    if (!p) continue;
    if (t >= today && t <= now) p.today += 1;
    else if (t >= baseFrom && t < today) p.average += 1 / baselineDays;
  }
  return points.map((p) => ({ ...p, average: Math.round(p.average * 10) / 10 }));
}

/* ——— Calificaciones (US-32) ——— */

export interface RatingSummary {
  dishAverage: number | null;
  dishCount: number;
  serviceAverage: number | null;
  serviceCount: number;
}

export function ratingSummary(
  dish: readonly DishRating[],
  service: readonly ServiceRating[],
  period: Period,
): RatingSummary {
  const d = dish.filter((r) => inPeriod(r.createdAt, period)).map((r) => r.stars);
  const s = service.filter((r) => inPeriod(r.createdAt, period)).map((r) => r.stars);
  return {
    dishAverage: avg(d),
    dishCount: d.length,
    serviceAverage: avg(s),
    serviceCount: s.length,
  };
}

export interface DishRank {
  dish: Dish;
  average: number;
  count: number;
  /** Promedio bayesiano usado para ordenar (evita que pocas reseñas ganen). */
  score: number;
}

export function dishRanking(
  ratings: readonly DishRating[],
  dishes: readonly Dish[],
  period: Period,
): DishRank[] {
  const inside = ratings.filter((r) => inPeriod(r.createdAt, period));
  const m = globalAverage(inside) ?? 0;
  const rows: DishRank[] = [];
  for (const dish of dishes) {
    const own = inside.filter((r) => r.dishId === dish.id);
    if (!own.length) continue;
    const sum = own.reduce((s, r) => s + r.stars, 0);
    rows.push({
      dish,
      average: sum / own.length,
      count: own.length,
      score: bayesianAverage({ count: own.length, sum }, m),
    });
  }
  return rows.sort((a, b) => b.score - a.score || b.count - a.count);
}

export function serviceByWaiter(
  ratings: readonly ServiceRating[],
  waiters: readonly Waiter[],
  period: Period,
) {
  return waiters.map((waiter) => {
    const own = ratings
      .filter((r) => r.waiterId === waiter.id && inPeriod(r.createdAt, period))
      .map((r) => r.stars);
    return { waiter, average: avg(own), count: own.length };
  });
}

/** Comentarios del periodo, del más reciente al más antiguo. */
export function recentComments(ratings: readonly DishRating[], period: Period): DishRating[] {
  return ratings
    .filter((r) => r.comment && inPeriod(r.createdAt, period))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ——— Preferencias (US-33) ——— */

export interface DishUnits {
  dish: Dish;
  units: number;
}

/** Platos más pedidos en cada franja (por la hora del pedido), solo rondas entregadas. */
export function topDishesBySlot(
  orders: readonly Order[],
  dishes: readonly Dish[],
  slots: readonly TimeSlot[],
  period: Period,
  limit = 5,
): Record<string, DishUnits[]> {
  const counts: Record<string, Map<string, number>> = Object.fromEntries(
    slots.map((s) => [s.id, new Map()]),
  );
  for (const o of orders) {
    if (o.status !== "entregado" || !inPeriod(o.createdAt, period)) continue;
    const minute = minutesOfDay(new Date(o.createdAt));
    const slot = slots.find((s) => slotContains(s, minute));
    if (!slot) continue;
    for (const item of o.items) {
      if (item.removed) continue;
      const map = counts[slot.id]!;
      map.set(item.dishId, (map.get(item.dishId) ?? 0) + item.qty);
    }
  }
  const byId = new Map(dishes.map((d) => [d.id, d]));
  return Object.fromEntries(
    slots.map((s) => [
      s.id,
      [...counts[s.id]!.entries()]
        .map(([id, units]) => ({ dish: byId.get(id)!, units }))
        .filter((x) => x.dish)
        .sort((a, b) => b.units - a.units)
        .slice(0, limit),
    ]),
  );
}

/** Restricciones registradas por los comensales en el periodo (agregadas, sin datos personales). */
export function restrictionStats(
  sessions: readonly TableSession[],
  period: Period,
): {
  diners: number;
  withRestrictions: number;
  byAllergen: Array<{ allergen: Allergen; diners: number }>;
} {
  const counts = new Map<Allergen, number>();
  let diners = 0;
  let withRestrictions = 0;
  for (const s of sessions) {
    if (!inPeriod(s.openedAt, period)) continue;
    for (const d of s.diners) {
      diners += 1;
      if (d.restrictions.length) withRestrictions += 1;
      for (const a of d.restrictions) counts.set(a, (counts.get(a) ?? 0) + 1);
    }
  }
  return {
    diners,
    withRestrictions,
    byAllergen: [...counts.entries()]
      .map(([allergen, n]) => ({ allergen, diners: n }))
      .sort((a, b) => b.diners - a.diners),
  };
}

/** Alérgenos del plato (atajo para tablas). */
export const allergensOf = dishAllergens;
