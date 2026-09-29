"use client";

import { setClockScale, virtualNow } from "@/lib/domain/clock";
import { isValidHex } from "@/lib/domain/color";
import type { Allergen } from "@/lib/domain/types";
import { useDeviceStore } from "./device";
import { createSeedState } from "./seed";
import { useAppStore } from "./store";

/** Capa de escritura que usan las pantallas. */

/** Hora actual de la demo en ISO (respeta el tiempo acelerado). */
export function nowIso(): string {
  return new Date(virtualNow(useAppStore.getState().demo.clock, Date.now())).toISOString();
}

export const demoActions = {
  setSlotOverride(slotId: string | null) {
    useAppStore.setState((s) => ({ demo: { ...s.demo, slotOverride: slotId } }));
  },
  setTimeScale(scale: number) {
    useAppStore.setState((s) => ({
      demo: { ...s.demo, clock: setClockScale(s.demo.clock, Date.now(), scale) },
    }));
  },
  resetData() {
    useAppStore.setState(createSeedState(Date.now()), true);
    useDeviceStore.setState({ restrictions: [], restrictionsAnswered: false, waiterId: null });
  },
};

export const restaurantActions = {
  setAccentColor(hex: string) {
    if (!isValidHex(hex)) return;
    useAppStore.setState((s) => ({ restaurant: { ...s.restaurant, accentColor: hex } }));
  },
};

export const deviceActions = {
  setRestrictions(restrictions: Allergen[]) {
    useDeviceStore.setState({ restrictions, restrictionsAnswered: true });
  },
  setWaiter(waiterId: string | null) {
    useDeviceStore.setState({ waiterId });
  },
};
