"use client";

import { useEffect, useMemo, useState } from "react";
import { virtualNow } from "@/lib/domain/clock";
import { effectiveSlot, slotAt, slotMidpoint } from "@/lib/domain/timeSlots";
import type { TimeSlot } from "@/lib/domain/types";
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
