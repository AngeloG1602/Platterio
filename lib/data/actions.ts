"use client";

import { setClockScale, virtualNow } from "@/lib/domain/clock";
import { isValidHex } from "@/lib/domain/color";
import { addToCart, cartCount } from "@/lib/domain/cart";
import { findOpenSession, joinTable, updateDinerRestrictions } from "@/lib/domain/session";
import type { Allergen } from "@/lib/domain/types";
import { newId } from "./ids";
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
  /** Guarda las restricciones en este dispositivo y en el comensal de su mesa abierta. */
  setRestrictions(restrictions: Allergen[]) {
    useDeviceStore.setState({ restrictions, restrictionsAnswered: true });
    const { deviceId } = useDeviceStore.getState();
    useAppStore.setState((s) => ({
      sessions: updateDinerRestrictions(s.sessions, deviceId, restrictions),
    }));
  },
  setWaiter(waiterId: string | null) {
    useDeviceStore.setState({ waiterId });
  },
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export const tableActions = {
  /** Entrar por QR: abre o se une a la sesión de la mesa con un alias. */
  join(tableNumber: number, alias: string): ActionResult {
    const state = useAppStore.getState();
    const table = state.tables.find((t) => t.number === tableNumber);
    if (!table) return { ok: false, error: "Esta mesa no existe" };
    const device = useDeviceStore.getState();
    const result = joinTable(state.sessions, {
      tableId: table.id,
      deviceId: device.deviceId,
      alias,
      restrictions: device.restrictions,
      now: nowIso(),
      newId,
    });
    if (!result.ok) return result;
    useAppStore.setState({ sessions: result.sessions });
    return { ok: true };
  },
};

export const cartActions = {
  /** Agrega al carrito compartido de la mesa, a nombre del comensal de este dispositivo. */
  add(
    tableId: string,
    item: { dishId: string; variantId: string; qty: number; note?: string },
  ): ActionResult & { count?: number } {
    const state = useAppStore.getState();
    const session = findOpenSession(state.sessions, tableId);
    const { deviceId } = useDeviceStore.getState();
    const diner = session?.diners.find((d) => d.deviceId === deviceId);
    if (!session || !diner) return { ok: false, error: "Primero entra a la mesa" };
    const dish = state.dishes.find((d) => d.id === item.dishId);
    if (!dish?.active) return { ok: false, error: "Este plato ya no está disponible" };
    if (!dish.variants.some((v) => v.id === item.variantId))
      return { ok: false, error: "Elige una opción válida" };
    const cart = addToCart(session.cart, { ...item, dinerId: diner.id }, newId("item"));
    useAppStore.setState((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? { ...x, cart } : x)),
    }));
    return { ok: true, count: cartCount(cart.filter((c) => c.dinerId === diner.id)) };
  },
};
