"use client";

import { setClockScale, virtualNow } from "@/lib/domain/clock";
import { isValidHex } from "@/lib/domain/color";
import { addToCart, cartCount, removeCartItem, updateCartItem } from "@/lib/domain/cart";
import { submitRound } from "@/lib/domain/orders";
import { effectiveSlot } from "@/lib/domain/timeSlots";
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

/** Sesión abierta de la mesa y el comensal de este dispositivo. */
function mine(tableId: string) {
  const state = useAppStore.getState();
  const session = findOpenSession(state.sessions, tableId);
  const { deviceId } = useDeviceStore.getState();
  const diner = session?.diners.find((d) => d.deviceId === deviceId);
  return { state, session, diner };
}

function replaceSession(session: { id: string }, patch: object) {
  useAppStore.setState((s) => ({
    sessions: s.sessions.map((x) => (x.id === session.id ? { ...x, ...patch } : x)),
  }));
}

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

  update(
    tableId: string,
    itemId: string,
    patch: { qty?: number; variantId?: string },
  ): ActionResult {
    const { session, diner } = mine(tableId);
    if (!session || !diner) return { ok: false, error: "Primero entra a la mesa" };
    const result = updateCartItem(session.cart, itemId, diner.id, patch);
    if (!result.ok) return result;
    replaceSession(session, { cart: result.cart });
    return { ok: true };
  },
  remove(tableId: string, itemId: string): ActionResult {
    const { session, diner } = mine(tableId);
    if (!session || !diner) return { ok: false, error: "Primero entra a la mesa" };
    const result = removeCartItem(session.cart, itemId, diner.id);
    if (!result.ok) return result;
    replaceSession(session, { cart: result.cart });
    return { ok: true };
  },
  /** Envía el carrito como nueva ronda. `expectedItemIds` son los ítems vistos al confirmar. */
  submit(tableId: string, expectedItemIds: string[]): ActionResult & { round?: number } {
    const { state, session, diner } = mine(tableId);
    if (!session || !diner) return { ok: false, error: "Primero entra a la mesa" };
    const result = submitRound({
      session,
      orders: state.orders,
      dishes: state.dishes,
      dinerId: diner.id,
      expectedItemIds,
      now: nowIso(),
      orderId: newId("pedido"),
    });
    if (!result.ok) return result;
    useAppStore.setState((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? result.session : x)),
      orders: [...s.orders, result.order],
    }));
    return { ok: true, round: result.order.round };
  },
};

const DEMO_ALIASES = [
  "Camila",
  "Andrés",
  "Valentina",
  "Mateo",
  "Sofía",
  "Julián",
  "Mariana",
  "Tomás",
];

export const demoDinerActions = {
  /**
   * Panel de demo: un comensal simulado entra a la mesa (o se une a la sesión abierta) y
   * agrega un plato de la franja actual al carrito compartido.
   */
  simulate(tableNumber: number): ActionResult & { alias?: string; dishName?: string } {
    const state = useAppStore.getState();
    const table = state.tables.find((t) => t.number === tableNumber);
    if (!table) return { ok: false, error: "Esa mesa no existe" };
    const open = findOpenSession(state.sessions, table.id);
    const taken = new Set(open?.diners.map((d) => d.alias.toLowerCase()) ?? []);
    const alias =
      DEMO_ALIASES.find((a) => !taken.has(a.toLowerCase())) ??
      `Invitado ${(open?.diners.length ?? 0) + 1}`;
    const deviceId = newId("demo");
    const joined = joinTable(state.sessions, {
      tableId: table.id,
      deviceId,
      alias,
      restrictions: [],
      now: nowIso(),
      newId,
    });
    if (!joined.ok) return joined;

    const slotId =
      state.demo.slotOverride ??
      effectiveSlot(state.timeSlots, new Date(virtualNow(state.demo.clock, Date.now())))?.id;
    const pool = state.dishes.filter(
      (d) => d.active && (!slotId || d.timeSlotIds.includes(slotId)),
    );
    const candidates = pool.length ? pool : state.dishes.filter((d) => d.active);
    const dish = candidates[Math.floor(Math.random() * candidates.length)];
    if (!dish) return { ok: false, error: "No hay platos activos" };
    const variant = dish.variants[Math.floor(Math.random() * dish.variants.length)]!;

    const sessions = joined.sessions.map((s) =>
      s.id === joined.sessionId
        ? {
            ...s,
            cart: addToCart(
              s.cart,
              { dishId: dish.id, variantId: variant.id, qty: 1, dinerId: joined.dinerId },
              newId("item"),
            ),
          }
        : s,
    );
    useAppStore.setState({ sessions });
    return {
      ok: true,
      alias,
      dishName: dish.variants.length > 1 ? `${dish.name} (${variant.name})` : dish.name,
    };
  },
};
