"use client";

import { setClockScale, virtualNow } from "@/lib/domain/clock";
import { isValidHex } from "@/lib/domain/color";
import { addToCart, cartCount, removeCartItem, updateCartItem } from "@/lib/domain/cart";
import { submitRound } from "@/lib/domain/orders";
import {
  draftToDish,
  hasErrors,
  validateDishDraft,
  type DishDraft,
  type DishFormErrors,
} from "@/lib/domain/dishForm";
import {
  addTable,
  addWaiter,
  applyTimeSlots,
  removeTable,
  toggleTableAssignment,
  validateThreshold,
  validateTimeout,
} from "@/lib/domain/config";
import { validateTimeSlots, type SlotError } from "@/lib/domain/timeSlots";
import type { TimeSlot } from "@/lib/domain/types";
import {
  rateDishes,
  ratableDishes,
  rateService,
  type DishRatingDraft,
} from "@/lib/domain/feedback";
import { transitionOrder, type Actor } from "@/lib/domain/orderStatus";
import { adjustOrderItem, releaseSession, type ItemAdjustment } from "@/lib/domain/waiter";
import type { Order, OrderStatus } from "@/lib/domain/types";
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
  setWaiterSound(waiterSound: boolean) {
    useDeviceStore.setState({ waiterSound });
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

/* ——— Estados del pedido ——— */

function replaceOrder(order: Order) {
  useAppStore.setState((s) => ({ orders: s.orders.map((o) => (o.id === order.id ? order : o)) }));
}

/** Única puerta de escritura para cambiar el estado de un pedido (usa la máquina de estados). */
function moveOrder(orderId: string, to: OrderStatus, actor: Actor, reason?: string): ActionResult {
  const order = useAppStore.getState().orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "No encontramos ese pedido" };
  const result = transitionOrder(order, to, actor, nowIso(), reason);
  if (!result.ok) return result;
  replaceOrder(result.order);
  return { ok: true };
}

/** El mesero seleccionado en esta pestaña solo actúa sobre sus mesas. */
function checkWaiterTable(tableId: string): ActionResult {
  const { waiterId } = useDeviceStore.getState();
  const waiter = useAppStore.getState().waiters.find((w) => w.id === waiterId);
  if (!waiter) return { ok: false, error: "Elige quién eres antes de continuar" };
  if (!waiter.tableIds.includes(tableId))
    return { ok: false, error: "Esa mesa no está asignada a ti" };
  return { ok: true };
}

function withOrderTable(orderId: string, fn: () => ActionResult): ActionResult {
  const order = useAppStore.getState().orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "No encontramos ese pedido" };
  const check = checkWaiterTable(order.tableId);
  return check.ok ? fn() : check;
}

export const waiterActions = {
  confirm: (orderId: string) =>
    withOrderTable(orderId, () => moveOrder(orderId, "confirmado", "mesero")),
  reject: (orderId: string, reason: string) =>
    withOrderTable(orderId, () => moveOrder(orderId, "rechazado", "mesero", reason)),
  deliver: (orderId: string) =>
    withOrderTable(orderId, () => moveOrder(orderId, "entregado", "mesero")),
  adjustItem(
    orderId: string,
    itemId: string,
    change: ItemAdjustment,
    reason: string,
  ): ActionResult {
    return withOrderTable(orderId, () => {
      const state = useAppStore.getState();
      const order = state.orders.find((o) => o.id === orderId)!;
      const item = order.items.find((i) => i.id === itemId);
      const dish = state.dishes.find((d) => d.id === item?.dishId);
      const result = adjustOrderItem(order, itemId, change, reason, dish);
      if (!result.ok) return result;
      replaceOrder(result.order);
      return { ok: true };
    });
  },
  releaseTable(tableId: string): ActionResult {
    const check = checkWaiterTable(tableId);
    if (!check.ok) return check;
    const state = useAppStore.getState();
    const session = findOpenSession(state.sessions, tableId);
    if (!session) return { ok: false, error: "La mesa ya estaba libre" };
    const result = releaseSession(session, state.orders, nowIso());
    if (!result.ok) return result;
    replaceSession(session, result.session);
    return { ok: true };
  },
};

export const kitchenActions = {
  start: (orderId: string) => moveOrder(orderId, "en_preparacion", "cocina"),
  ready: (orderId: string) => moveOrder(orderId, "listo", "cocina"),
};

/* ——— Calificaciones (US-30, US-31, US-34) ——— */

export const feedbackActions = {
  rateDishes(
    tableId: string,
    drafts: DishRatingDraft[],
  ): ActionResult & { count?: number; dishId?: string } {
    const { state, session, diner } = mine(tableId);
    if (!session || !diner) return { ok: false, error: "Primero entra a la mesa" };
    const history = [...state.dishRatings];
    const ratable = ratableDishes({
      session,
      orders: state.orders,
      dishes: state.dishes,
      ratings: history,
      dinerId: diner.id,
    });
    const result = rateDishes({
      drafts,
      ratable,
      dinerId: diner.id,
      now: nowIso(),
      newId: () => newId("resena"),
    });
    if (!result.ok) return result;
    if (result.ratings.length)
      useAppStore.setState((s) => ({ dishRatings: [...s.dishRatings, ...result.ratings] }));
    return { ok: true, count: result.ratings.length };
  },
  rateService(tableId: string, stars: number): ActionResult & { lowAlert?: boolean } {
    const { state, session, diner } = mine(tableId);
    if (!session || !diner) return { ok: false, error: "Primero entra a la mesa" };
    const result = rateService({
      session,
      orders: state.orders,
      existing: state.serviceRatings,
      waiters: state.waiters,
      stars,
      threshold: state.restaurant.serviceAlertThreshold,
      dinerId: diner.id,
      now: nowIso(),
      newId,
    });
    if (!result.ok) return result;
    useAppStore.setState((s) => ({
      serviceRatings: [...s.serviceRatings, result.rating],
      alerts: result.alert ? [...s.alerts, result.alert] : s.alerts,
    }));
    return { ok: true, lowAlert: Boolean(result.alert) };
  },
};

export const alertActions = {
  resolve(alertId: string) {
    useAppStore.setState((s) => ({
      alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)),
    }));
  },
  reopen(alertId: string) {
    useAppStore.setState((s) => ({
      alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, resolved: false } : a)),
    }));
  },
};

/* ——— Administrador ——— */

export const catalogActions = {
  /** Crea o actualiza un plato desde el formulario. Devuelve los errores si no pasa la validación. */
  saveDish(draft: DishDraft): { ok: true; id: string } | { ok: false; errors: DishFormErrors } {
    const state = useAppStore.getState();
    const existing = draft.id ? state.dishes.find((d) => d.id === draft.id) : undefined;
    const errors = validateDishDraft(draft, {
      categoryIds: state.categories.map((c) => c.id),
      otherNames: state.dishes.filter((d) => d.id !== existing?.id).map((d) => d.name),
    });
    if (hasErrors(errors)) return { ok: false, errors };
    const dish = draftToDish(draft, {
      takenIds: state.dishes.map((d) => d.id),
      now: nowIso(),
      existing,
    });
    useAppStore.setState((s) => ({
      dishes: existing ? s.dishes.map((d) => (d.id === dish.id ? dish : d)) : [...s.dishes, dish],
    }));
    return { ok: true, id: dish.id };
  },
  setActive(dishId: string, active: boolean) {
    useAppStore.setState((s) => ({
      dishes: s.dishes.map((d) => (d.id === dishId ? { ...d, active } : d)),
    }));
  },
  setFeatured(dishId: string, featured: boolean) {
    useAppStore.setState((s) => ({
      dishes: s.dishes.map((d) => (d.id === dishId ? { ...d, featured } : d)),
    }));
  },
};

export const slotActions = {
  /** Guarda las franjas si no se solapan (regla 10). */
  save(
    slots: Array<Omit<TimeSlot, "id"> & { id?: string }>,
  ): { ok: true } | { ok: false; errors: SlotError[] } {
    const withIds = slots.map((s, i) => ({ ...s, id: s.id ?? `nueva-${i}` }));
    const errors = validateTimeSlots(withIds);
    if (errors.length) return { ok: false, errors };
    const state = useAppStore.getState();
    const result = applyTimeSlots(slots, state.dishes);
    const override = result.slots.some((s) => s.id === state.demo.slotOverride)
      ? state.demo.slotOverride
      : null;
    useAppStore.setState((s) => ({
      timeSlots: result.slots,
      dishes: result.dishes,
      demo: { ...s.demo, slotOverride: override },
    }));
    return { ok: true };
  },
};

export const configActions = {
  setThreshold(value: number): ActionResult {
    const error = validateThreshold(value);
    if (error) return { ok: false, error };
    useAppStore.setState((s) => ({
      restaurant: { ...s.restaurant, serviceAlertThreshold: value },
    }));
    return { ok: true };
  },
  setConfirmTimeout(value: number): ActionResult {
    const error = validateTimeout(value);
    if (error) return { ok: false, error };
    useAppStore.setState((s) => ({ restaurant: { ...s.restaurant, confirmTimeoutMin: value } }));
    return { ok: true };
  },
  addTable() {
    useAppStore.setState((s) => ({ tables: addTable(s.tables) }));
  },
  removeTable(tableId: string): ActionResult {
    const s = useAppStore.getState();
    const r = removeTable(s, tableId);
    if (!r.ok) return r;
    useAppStore.setState(r.value);
    return { ok: true };
  },
  toggleAssignment(waiterId: string, tableId: string) {
    useAppStore.setState((s) => ({ waiters: toggleTableAssignment(s.waiters, waiterId, tableId) }));
  },
  addWaiter(name: string): ActionResult {
    const r = addWaiter(useAppStore.getState().waiters, name);
    if (!r.ok) return r;
    useAppStore.setState({ waiters: r.value });
    return { ok: true };
  },
};
