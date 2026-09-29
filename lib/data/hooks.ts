"use client";

import { useEffect, useMemo, useState } from "react";
import { virtualNow } from "@/lib/domain/clock";
import { effectiveSlot, slotAt, slotMidpoint } from "@/lib/domain/timeSlots";
import { ratingStatsByDish } from "@/lib/domain/ratings";
import { recommend } from "@/lib/domain/recommender";
import { findOpenSession } from "@/lib/domain/session";
import { consolidateTicket } from "@/lib/domain/ticket";
import { tableOverview } from "@/lib/domain/waiter";
import { kitchenBoard } from "@/lib/domain/kitchen";
import { ratableDishes, waiterForTable } from "@/lib/domain/feedback";
import type { Allergen, Order, TableSession, TimeSlot } from "@/lib/domain/types";
import { useDeviceStore } from "./device";
import { getHistory, type History } from "./history";
import { HISTORY_CATALOG } from "./seed";
import { useAppStore, useBootStore } from "./store";
import { usePresenceStore } from "./sync";

/** Capa de lectura que usan las pantallas. */

export const useHydrated = () => useBootStore((s) => s.hydrated);
export const useRestaurant = () => useAppStore((s) => s.restaurant);
export const useCategories = () => useAppStore((s) => s.categories);
export const useTimeSlots = () => useAppStore((s) => s.timeSlots);
export const useDishes = () => useAppStore((s) => s.dishes);
export const useTables = () => useAppStore((s) => s.tables);
export const useWaiters = () => useAppStore((s) => s.waiters);
export const useAlerts = () => useAppStore((s) => s.alerts);
export const useDemoSettings = () => useAppStore((s) => s.demo);
export const useDevice = () => useDeviceStore();
export const useConnectedTabs = () => usePresenceStore((s) => Object.keys(s.peers).length + 1);
export const useSyncSupported = () => usePresenceStore((s) => s.supported);

/** Hora de la demo (acelerable). Se refresca cada `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const clock = useAppStore((s) => s.demo.clock);
  const [real, setReal] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setReal(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return virtualNow(clock, real);
}

export interface CurrentSlot {
  slot: TimeSlot | null;
  /** true si la franja viene del panel de demo. */
  simulated: boolean;
  /** true si el restaurante está fuera de franja y `slot` es la próxima en abrir. */
  upcoming: boolean;
  /** Fecha que se usa para calcular (con la hora simulada aplicada, si la hay). */
  at: Date;
}

export function useCurrentSlot(): CurrentSlot {
  const slots = useTimeSlots();
  const override = useAppStore((s) => s.demo.slotOverride);
  const now = useNow(15_000);
  const minuteKey = Math.floor(now / 60_000);
  return useMemo(() => {
    const date = new Date(minuteKey * 60_000);
    const forced = override ? slots.find((s) => s.id === override) : undefined;
    if (forced) {
      const at = new Date(date);
      const mid = slotMidpoint(forced);
      at.setHours(Math.floor(mid / 60), mid % 60, 0, 0);
      return { slot: forced, simulated: true, upcoming: false, at };
    }
    const active = slotAt(slots, date);
    return {
      slot: active ?? effectiveSlot(slots, date),
      simulated: false,
      upcoming: !active,
      at: date,
    };
  }, [slots, override, minuteKey]);
}

/** Historial sembrado de 14 días (derivado, no persistido). */
export function useHistory(): History {
  const seedEpoch = useAppStore((s) => s.seedEpoch);
  return useMemo(() => getHistory(HISTORY_CATALOG, seedEpoch), [seedEpoch]);
}

/* ——— Cliente ——— */

export function useTableByNumber(numero: number) {
  return useAppStore((s) => s.tables.find((t) => t.number === numero));
}

export function useOpenSession(tableId: string | undefined) {
  return useAppStore((s) => (tableId ? findOpenSession(s.sessions, tableId) : undefined));
}

/** Sesión abierta de la mesa y el comensal de este dispositivo (si ya entró). */
export function useMyDiner(tableId: string | undefined) {
  const session = useOpenSession(tableId);
  const deviceId = useDeviceStore((s) => s.deviceId);
  const diner = session?.diners.find((d) => d.deviceId === deviceId);
  return { session, diner };
}

export function useDish(id: string) {
  return useAppStore((s) => s.dishes.find((d) => d.id === id));
}

/** Pedidos de los últimos 14 días: historial sembrado + lo creado en la demo. */
export function useAllOrders() {
  const history = useHistory();
  const live = useAppStore((s) => s.orders);
  return useMemo(() => [...history.orders, ...live], [history, live]);
}

export function useAllDishRatings() {
  const history = useHistory();
  const live = useAppStore((s) => s.dishRatings);
  return useMemo(() => [...history.dishRatings, ...live], [history, live]);
}

export function useDishRatingStats() {
  const ratings = useAllDishRatings();
  return useMemo(() => ratingStatsByDish(ratings), [ratings]);
}

/** Recomendados de la franja actual para las restricciones dadas (BRIEF §9). */
export function useRecommendations(restrictions: readonly Allergen[]) {
  const dishes = useDishes();
  const orders = useAllOrders();
  const ratings = useAllDishRatings();
  const current = useCurrentSlot();
  const recommendations = useMemo(
    () => recommend({ dishes, slot: current.slot, now: current.at, orders, ratings, restrictions }),
    [dishes, current.slot, current.at, orders, ratings, restrictions],
  );
  return { recommendations, current };
}

/** Rondas de una sesión, en orden. */
export function useSessionOrders(sessionId: string | undefined) {
  const orders = useAppStore((s) => s.orders);
  return useMemo(
    () =>
      sessionId
        ? orders.filter((o) => o.sessionId === sessionId).sort((a, b) => a.round - b.round)
        : [],
    [orders, sessionId],
  );
}

/** Ticket consolidado de la sesión (US-24). */
export function useTicket(session: TableSession | undefined) {
  const orders = useSessionOrders(session?.id);
  const dishes = useDishes();
  return useMemo(
    () =>
      consolidateTicket({
        sessionId: session?.id ?? "",
        orders,
        dishes,
        diners: session?.diners ?? [],
      }),
    [session?.id, session?.diners, orders, dishes],
  );
}

/** Números de las mesas con sesión abierta. */
export function useOpenTableNumbers(): number[] {
  const sessions = useAppStore((s) => s.sessions);
  const tables = useTables();
  return useMemo(
    () =>
      tables
        .filter((t) => sessions.some((s) => s.tableId === t.id && !s.closedAt))
        .map((t) => t.number),
    [sessions, tables],
  );
}

/* ——— Mesero ——— */

export function useWaiter(waiterId: string | null) {
  return useAppStore((s) => s.waiters.find((w) => w.id === waiterId));
}

/** Mesas del mesero con su estado, y las rondas que requieren su atención. */
export function useWaiterBoard(waiterId: string | null) {
  const waiter = useWaiter(waiterId);
  const tables = useTables();
  const sessions = useAppStore((s) => s.sessions);
  const orders = useAppStore((s) => s.orders);
  return useMemo(() => {
    const mine = tables
      .filter((t) => waiter?.tableIds.includes(t.id))
      .sort((a, b) => a.number - b.number);
    const overviews = mine.map((t) => tableOverview(t, sessions, orders));
    const byCreated = (a: Order, b: Order) => a.createdAt.localeCompare(b.createdAt);
    return {
      waiter,
      overviews,
      pending: overviews.flatMap((o) => o.pending).sort(byCreated),
      ready: overviews
        .flatMap((o) => o.ready)
        .sort((a, b) => (a.readyAt ?? "").localeCompare(b.readyAt ?? "")),
      inKitchen: overviews.flatMap((o) => o.inKitchen).sort(byCreated),
    };
  }, [waiter, tables, sessions, orders]);
}

/* ——— Cocina ——— */

export function useKitchenBoard() {
  const orders = useAppStore((s) => s.orders);
  return useMemo(() => kitchenBoard(orders), [orders]);
}

/* ——— Calificaciones ——— */

/** Platos entregados que este comensal puede calificar, con lo que ya calificó. */
export function useRatableDishes(session: TableSession, dinerId: string) {
  const orders = useAppStore((s) => s.orders);
  const ratings = useAppStore((s) => s.dishRatings);
  const dishes = useDishes();
  return useMemo(
    () => ratableDishes({ session, orders, dishes, ratings, dinerId }),
    [session, orders, dishes, ratings, dinerId],
  );
}

/** Calificación de servicio de la visita (una por sesión) y el mesero de la mesa. */
export function useServiceFeedback(session: TableSession) {
  const rating = useAppStore((s) => s.serviceRatings.find((r) => r.sessionId === session.id));
  const waiter = useAppStore((s) => waiterForTable(s.waiters, session.tableId));
  return { rating, waiter };
}

/* ——— Administrador ——— */

/** Todos los datos para analítica: historial sembrado + lo creado en la demo. */
export function useAnalyticsData() {
  const history = useHistory();
  const orders = useAllOrders();
  const dishRatings = useAllDishRatings();
  const liveSessions = useAppStore((s) => s.sessions);
  const liveService = useAppStore((s) => s.serviceRatings);
  const sessions = useMemo(() => [...history.sessions, ...liveSessions], [history, liveSessions]);
  const serviceRatings = useMemo(
    () => [...history.serviceRatings, ...liveService],
    [history, liveService],
  );
  return { orders, sessions, dishRatings, serviceRatings };
}
