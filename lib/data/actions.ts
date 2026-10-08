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
import {
  acknowledgeChanges,
  createStaffOrder,
  editOrder,
  type OrderEdit,
  type StaffLine,
} from "@/lib/domain/staffOrders";
import type { Order, OrderStatus } from "@/lib/domain/types";
import { effectiveSlot } from "@/lib/domain/timeSlots";
import { findOpenSession, joinTable, updateDinerRestrictions } from "@/lib/domain/session";
import {
  cancelSession,
  openSession,
  requestOpen,
  resolveCalls,
  setIdleClose,
  validateIdleMinutes,
} from "@/lib/domain/tableAccess";
import type { Allergen } from "@/lib/domain/types";
import {
  addStaff,
  can,
  canOperateTable,
  login,
  setStaffActive,
  updateStaff,
  type Permission,
  type Role,
  type StaffUser,
} from "@/lib/domain/access";
import {
  BODY_FONTS,
  DEFAULT_TEMPLATE,
  HEADING_FONTS,
  TEMPLATES,
  validateLogoData,
  type FontId,
} from "@/lib/domain/brand";
import type { Brand } from "@/lib/domain/types";
import { closeShift, openShift, registerPayment } from "@/lib/domain/cash";
import type { PaymentMethod } from "@/lib/domain/types";
import {
  customerCanCancel,
  DELIVERY_TABLE_ID,
  deliveryCode,
  dispatchDelivery,
  placeDeliveryOrder,
  validateDeliveryConfig,
  type CheckoutErrors,
  type CheckoutInput,
} from "@/lib/domain/delivery";
import type { DeliveryConfig } from "@/lib/domain/types";
import { useDeliveryClient, type DeliveryClientState } from "./delivery-store";
import { isCurrency } from "@/lib/domain/format";
import { enabledLangs } from "@/lib/i18n";
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
    useDeviceStore.setState({ restrictions: [], restrictionsAnswered: false, staffId: null });
    useDeliveryClient.setState({ cart: [], profile: {}, orderIds: [] });
  },
};

function patchBrand(patch: (brand: Brand) => Brand): ActionResult {
  const allowed = requirePermission("panel.admin");
  if (!allowed.ok) return allowed;
  useAppStore.setState((s) => ({
    restaurant: {
      ...s.restaurant,
      brand: patch(s.restaurant.brand ?? { template: DEFAULT_TEMPLATE.id }),
    },
  }));
  return { ok: true };
}

export const brandActions = {
  /** Cambia de plantilla: trae su color de acento y sus tipografías (se pierden las propias). */
  applyTemplate(id: string): ActionResult {
    const template = TEMPLATES.find((t) => t.id === id);
    if (!template) return { ok: false, error: "Esa plantilla no existe" };
    const r = patchBrand((b) => ({ template: template.id, logo: b.logo }));
    if (!r.ok) return r;
    useAppStore.setState((s) => ({
      restaurant: { ...s.restaurant, accentColor: template.accent },
    }));
    return { ok: true };
  },
  setFonts(fonts: { heading?: FontId; body?: FontId }): ActionResult {
    if (fonts.heading && !HEADING_FONTS.includes(fonts.heading))
      return { ok: false, error: "Esa tipografía no sirve para títulos" };
    if (fonts.body && !BODY_FONTS.includes(fonts.body))
      return { ok: false, error: "Esa tipografía no sirve para texto" };
    return patchBrand((b) => ({
      ...b,
      ...(fonts.heading ? { headingFont: fonts.heading } : {}),
      ...(fonts.body ? { bodyFont: fonts.body } : {}),
    }));
  },
  /** Vuelve a las tipografías de la plantilla. */
  resetFonts: (): ActionResult =>
    patchBrand((b) => ({ template: b.template, ...(b.logo ? { logo: b.logo } : {}) })),
  setLogo(dataUrl: string | null): ActionResult {
    if (dataUrl) {
      const error = validateLogoData(dataUrl);
      if (error) return { ok: false, error };
    }
    return patchBrand((b) => {
      const next: Brand = { ...b };
      if (dataUrl) next.logo = dataUrl;
      else delete next.logo;
      return next;
    });
  },
};

export const localeActions = {
  setCurrency(code: string): ActionResult {
    const allowed = requirePermission("panel.admin");
    if (!allowed.ok) return allowed;
    if (!isCurrency(code)) return { ok: false, error: "Esa moneda no está disponible" };
    useAppStore.setState((s) => ({ restaurant: { ...s.restaurant, currency: code } }));
    return { ok: true };
  },
  /** Idiomas que ve el cliente; el español siempre está. */
  setLanguages(languages: string[]): ActionResult {
    const allowed = requirePermission("panel.admin");
    if (!allowed.ok) return allowed;
    const valid = enabledLangs(languages);
    useAppStore.setState((s) => ({ restaurant: { ...s.restaurant, languages: valid } }));
    return { ok: true };
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
  setWaiterSound(waiterSound: boolean) {
    useDeviceStore.setState({ waiterSound });
  },
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export const tableActions = {
  /** Entrar a la mesa que abrió el mesero: con un alias y el PIN de la mesa. */
  join(tableNumber: number, alias: string, pin?: string): ActionResult {
    const state = useAppStore.getState();
    const table = state.tables.find((t) => t.number === tableNumber);
    if (!table) return { ok: false, error: "Esta mesa no existe" };
    const device = useDeviceStore.getState();
    const result = joinTable(state.sessions, {
      tableId: table.id,
      deviceId: device.deviceId,
      alias,
      restrictions: device.restrictions,
      pin,
      now: nowIso(),
      newId,
    });
    if (!result.ok) return result;
    useAppStore.setState({ sessions: result.sessions });
    return { ok: true };
  },
  /** Desde una mesa cerrada: avisar al personal para que la abra. */
  requestOpen(tableNumber: number): ActionResult {
    const state = useAppStore.getState();
    const table = state.tables.find((t) => t.number === tableNumber);
    if (!table) return { ok: false, error: "Esta mesa no existe" };
    if (findOpenSession(state.sessions, table.id)) return { ok: true };
    useAppStore.setState({ calls: requestOpen(state.calls, table.id, nowIso(), newId) });
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

/** Cualquier cambio en la mesa cuenta como actividad (para el cierre automático). */
function replaceSession(session: { id: string }, patch: object) {
  const now = nowIso();
  useAppStore.setState((s) => ({
    sessions: s.sessions.map((x) =>
      x.id === session.id ? { ...x, lastActivityAt: now, ...patch } : x,
    ),
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
    // Si la mesa no estaba abierta, la abre el propio panel de demo (como lo haría un mesero).
    let sessions = state.sessions;
    let open = findOpenSession(sessions, table.id);
    if (!open) {
      const opened = openSession(sessions, { tableId: table.id, now: nowIso(), newId });
      if (!opened.ok) return opened;
      sessions = opened.value.sessions;
      open = opened.value.session;
    }
    const taken = new Set(open.diners.map((d) => d.alias.toLowerCase()));
    const alias =
      DEMO_ALIASES.find((a) => !taken.has(a.toLowerCase())) ??
      `Invitado ${(open?.diners.length ?? 0) + 1}`;
    const deviceId = newId("demo");
    const joined = joinTable(sessions, {
      tableId: table.id,
      deviceId,
      alias,
      restrictions: [],
      pin: open.pin,
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

    const withCart = joined.sessions.map((s) =>
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
    useAppStore.setState({ sessions: withCart, calls: resolveCalls(state.calls, table.id) });
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

/** Quien entró en esta pestaña (con PIN) y sigue activo. */
function currentStaff(): StaffUser | undefined {
  const { staffId } = useDeviceStore.getState();
  return useAppStore.getState().staff.find((u) => u.id === staffId && u.active);
}

/** Exige un permiso a quien entró en esta pestaña. */
function requirePermission(permission: Permission): ActionResult & { actor?: StaffUser } {
  const actor = currentStaff();
  if (!actor) return { ok: false, error: "Entra con tu PIN para continuar" };
  if (!can(actor.role, permission)) return { ok: false, error: "No tienes permiso para esto" };
  return { ok: true, actor };
}

/** El mesero solo actúa sobre sus mesas; el encargado y el administrador, sobre todas. */
function checkWaiterTable(tableId: string): ActionResult {
  const actor = currentStaff();
  if (!actor) return { ok: false, error: "Entra con tu PIN para continuar" };
  if (!canOperateTable(actor, useAppStore.getState().waiters, tableId))
    return { ok: false, error: "Esa mesa no está asignada a ti" };
  return { ok: true };
}

export const authActions = {
  /** Entrar con el PIN. El PIN identifica a la persona. */
  login(pin: string): ActionResult & { user?: StaffUser } {
    const r = login(useAppStore.getState().staff, pin);
    if (!r.ok) return r;
    useDeviceStore.setState({ staffId: r.value.id });
    return { ok: true, user: r.value };
  },
  /** Atajo de la demo: entrar como alguien sin escribir el PIN. */
  loginAsDemo(staffId: string): ActionResult {
    const user = useAppStore.getState().staff.find((u) => u.id === staffId && u.active);
    if (!user) return { ok: false, error: "Ese usuario no está disponible" };
    useDeviceStore.setState({ staffId: user.id });
    return { ok: true };
  },
  logout() {
    useDeviceStore.setState({ staffId: null });
  },
};

export const teamActions = {
  add(input: { name: string; role: Role; pin: string }): ActionResult {
    const actor = currentStaff();
    if (!actor) return { ok: false, error: "Entra con tu PIN para continuar" };
    const r = addStaff(useAppStore.getState(), input, actor.role);
    if (!r.ok) return r;
    useAppStore.setState(r.value);
    return { ok: true };
  },
  update(userId: string, patch: { name?: string; pin?: string }): ActionResult {
    const actor = currentStaff();
    if (!actor) return { ok: false, error: "Entra con tu PIN para continuar" };
    const r = updateStaff(useAppStore.getState(), userId, patch, actor.role);
    if (!r.ok) return r;
    useAppStore.setState(r.value);
    return { ok: true };
  },
  setActive(userId: string, active: boolean): ActionResult & { released?: string[] } {
    const actor = currentStaff();
    if (!actor) return { ok: false, error: "Entra con tu PIN para continuar" };
    const r = setStaffActive(useAppStore.getState(), userId, active, actor);
    if (!r.ok) return r;
    useAppStore.setState({ staff: r.value.staff, waiters: r.value.waiters });
    return { ok: true, released: r.value.released };
  },
};

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
  /**
   * El personal toma el pedido en la mesa: va directo a cocina. Si la mesa estaba libre,
   * se abre sola (con su PIN) para que la cuenta quede en una sesión.
   */
  createOrder(
    tableId: string,
    lines: StaffLine[],
  ): ActionResult & { orderId?: string; openedPin?: string } {
    const allowed = requirePermission("pedidos.crear");
    if (!allowed.ok) return allowed;
    const check = checkWaiterTable(tableId);
    if (!check.ok) return check;
    const state = useAppStore.getState();
    const now = nowIso();
    let sessions = state.sessions;
    let session = findOpenSession(sessions, tableId);
    let openedPin: string | undefined;
    if (!session) {
      const opened = openSession(sessions, {
        tableId,
        openedBy: allowed.actor!.id,
        now,
        newId,
      });
      if (!opened.ok) return opened;
      sessions = opened.value.sessions;
      session = opened.value.session;
      openedPin = session.pin;
    }
    const r = createStaffOrder({
      session,
      orders: state.orders,
      dishes: state.dishes,
      lines,
      staffName: allowed.actor!.name,
      now,
      orderId: newId("pedido"),
      newId: () => newId("item"),
    });
    if (!r.ok) return r;
    const sid = session.id;
    useAppStore.setState((s) => ({
      sessions: sessions.map((x) => (x.id === sid ? { ...x, lastActivityAt: now } : x)),
      orders: [...s.orders, r.order],
      calls: openedPin ? resolveCalls(s.calls, tableId) : s.calls,
    }));
    return { ok: true, orderId: r.order.id, openedPin };
  },
  /** Edita una ronda en cualquier estado menos anulada; queda registrado quién, cuándo y por qué. */
  editOrder(orderId: string, edit: OrderEdit, reason: string): ActionResult {
    const allowed = requirePermission("pedidos.editar");
    if (!allowed.ok) return allowed;
    return withOrderTable(orderId, () => {
      const state = useAppStore.getState();
      const order = state.orders.find((o) => o.id === orderId)!;
      const r = editOrder({
        order,
        edit,
        reason,
        dishes: state.dishes,
        staffName: allowed.actor!.name,
        now: nowIso(),
        changeId: newId("cambio"),
        itemId: newId("item"),
      });
      if (!r.ok) return r;
      replaceOrder(r.order);
      return { ok: true };
    });
  },
  /** Abre la mesa: genera su PIN y atiende los avisos de "abre mi mesa". */
  openTable(tableId: string): ActionResult & { pin?: string } {
    const check = checkWaiterTable(tableId);
    if (!check.ok) return check;
    const state = useAppStore.getState();
    const r = openSession(state.sessions, {
      tableId,
      openedBy: currentStaff()?.id,
      now: nowIso(),
      newId,
    });
    if (!r.ok) return r;
    useAppStore.setState({
      sessions: r.value.sessions,
      calls: resolveCalls(state.calls, tableId),
    });
    return { ok: true, pin: r.value.session.pin };
  },
  /** Cierra la mesa aunque tenga rondas sin entregar, que quedan rechazadas. */
  cancelTable(tableId: string): ActionResult & { rejected?: number } {
    const allowed = requirePermission("mesas.cancelar");
    if (!allowed.ok) return allowed;
    const state = useAppStore.getState();
    const session = findOpenSession(state.sessions, tableId);
    if (!session) return { ok: false, error: "La mesa ya estaba cerrada" };
    const r = cancelSession(session, state.orders, nowIso());
    if (!r.ok) return r;
    useAppStore.setState((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? r.value.session : x)),
      orders: r.value.orders,
    }));
    return { ok: true, rejected: r.value.rejected };
  },
  /** Minutos sin actividad para que esta mesa se cierre sola (`null`: el del negocio). */
  setIdleClose(tableId: string, minutes: number | null): ActionResult {
    const check = checkWaiterTable(tableId);
    if (!check.ok) return check;
    const session = findOpenSession(useAppStore.getState().sessions, tableId);
    if (!session) return { ok: false, error: "La mesa ya estaba cerrada" };
    const r = setIdleClose(session, minutes);
    if (!r.ok) return r;
    useAppStore.setState((s) => ({
      sessions: s.sessions.map((x) => (x.id === session.id ? r.value : x)),
    }));
    return { ok: true };
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
  /** La cocina vio los cambios que hizo el personal en la ronda. */
  acknowledgeChanges(orderId: string): ActionResult {
    const order = useAppStore.getState().orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "No encontramos ese pedido" };
    replaceOrder(acknowledgeChanges(order, nowIso()));
    return { ok: true };
  },
};

/* ——— Domicilios y recogida ——— */

function closeDeliverySession(sessionId: string, reason: "mesero" | "cancelada") {
  const closedAt = nowIso();
  useAppStore.setState((s) => ({
    sessions: s.sessions.map((x) =>
      x.id === sessionId && !x.closedAt ? { ...x, closedAt, closeReason: reason } : x,
    ),
  }));
}

function deliveryOrder(orderId: string) {
  const state = useAppStore.getState();
  const order = state.orders.find((o) => o.id === orderId && o.tableId === DELIVERY_TABLE_ID);
  const session = order && state.sessions.find((x) => x.id === order.sessionId);
  return order && session?.delivery ? { order, session, state } : null;
}

/** Acciones del cliente: armar el carrito, pedir y cancelar antes de que lo confirmen. */
export const deliveryClientActions = {
  add(line: { dishId: string; variantId: string; qty: number; note?: string }): ActionResult {
    const dish = useAppStore.getState().dishes.find((d) => d.id === line.dishId);
    if (!dish?.active) return { ok: false, error: "Ese plato no está disponible" };
    if (!dish.variants.some((v) => v.id === line.variantId))
      return { ok: false, error: "Elige una opción" };
    const note = line.note?.trim() || undefined;
    useDeliveryClient.setState((s) => {
      const same = s.cart.find(
        (l) => l.dishId === line.dishId && l.variantId === line.variantId && l.note === note,
      );
      if (same)
        return {
          cart: s.cart.map((l) => (l === same ? { ...l, qty: Math.min(20, l.qty + line.qty) } : l)),
        };
      return { cart: [...s.cart, { id: newId("linea"), ...line, ...(note ? { note } : {}) }] };
    });
    return { ok: true };
  },
  setQty(lineId: string, qty: number) {
    useDeliveryClient.setState((s) => ({
      cart:
        qty < 1
          ? s.cart.filter((l) => l.id !== lineId)
          : s.cart.map((l) => (l.id === lineId ? { ...l, qty: Math.min(20, qty) } : l)),
    }));
  },
  clear: () => useDeliveryClient.setState({ cart: [] }),
  saveProfile(profile: DeliveryClientState["profile"]) {
    useDeliveryClient.setState((s) => ({ profile: { ...s.profile, ...profile } }));
  },
  place(input: CheckoutInput): ActionResult & { orderId?: string; errors?: CheckoutErrors } {
    const state = useAppStore.getState();
    const cart = useDeliveryClient.getState().cart;
    const nowMs = virtualNow(state.demo.clock, Date.now());
    const sessionId = newId("sesion");
    const orderId = newId("pedido");
    const r = placeDeliveryOrder({
      config: state.restaurant.delivery,
      dishes: state.dishes,
      cart,
      input,
      nowMs,
      sessionId,
      orderId,
      code: deliveryCode(sessionId),
      itemId: () => newId("item"),
    });
    if (!r.ok) return r;
    useAppStore.setState((s) => ({
      sessions: [...s.sessions, r.session],
      orders: [...s.orders, r.order],
    }));
    useDeliveryClient.setState((s) => ({
      cart: [],
      orderIds: [orderId, ...s.orderIds].slice(0, 20),
      profile: {
        name: input.name,
        phone: input.phone,
        address: input.address,
        reference: input.reference,
        zoneId: input.zoneId,
        payWith: input.payWith,
      },
    }));
    return { ok: true, orderId };
  },
  /** El cliente cancela mientras nadie lo ha confirmado. */
  cancel(orderId: string): ActionResult {
    const found = deliveryOrder(orderId);
    if (!found) return { ok: false, error: "No encontramos ese pedido" };
    if (!useDeliveryClient.getState().orderIds.includes(orderId))
      return { ok: false, error: "Ese pedido no es de este celular" };
    if (!customerCanCancel(found.order))
      return { ok: false, error: "Ya lo estamos preparando. Llámanos si necesitas cambiarlo." };
    const r = transitionOrder(
      found.order,
      "rechazado",
      "mesero",
      nowIso(),
      "Cancelado por el cliente",
    );
    if (!r.ok) return r;
    replaceOrder(r.order);
    closeDeliverySession(found.session.id, "cancelada");
    return { ok: true };
  },
};

/** Acciones del personal (encargado y administrador) sobre los pedidos a domicilio. */
export const deliveryActions = {
  confirm: (orderId: string) => waiterActions.confirm(orderId),
  /** Rechaza un pedido nuevo con motivo. */
  reject(orderId: string, reason: string): ActionResult {
    const r = waiterActions.reject(orderId, reason);
    const found = deliveryOrder(orderId);
    if (r.ok && found) closeDeliverySession(found.session.id, "cancelada");
    return r;
  },
  /** Cancela un pedido que ya estaba en cocina o listo; queda el motivo y quién lo hizo. */
  cancelActive(orderId: string, reason: string): ActionResult {
    const r = waiterActions.editOrder(orderId, { type: "anular" }, reason);
    const found = deliveryOrder(orderId);
    if (r.ok && found) closeDeliverySession(found.session.id, "cancelada");
    return r;
  },
  dispatch(orderId: string, driver: string): ActionResult {
    const allowed = requirePermission("mesas.todas");
    if (!allowed.ok) return allowed;
    const found = deliveryOrder(orderId);
    if (!found) return { ok: false, error: "No encontramos ese pedido" };
    const r = dispatchDelivery(found.session, found.order, driver, nowIso());
    if (!r.ok) return r;
    useAppStore.setState((s) => ({
      sessions: s.sessions.map((x) => (x.id === found.session.id ? r.session : x)),
    }));
    return { ok: true };
  },
  /** Entregado al cliente (en su puerta o en el mostrador). */
  deliver(orderId: string): ActionResult {
    const r = waiterActions.deliver(orderId);
    const found = deliveryOrder(orderId);
    if (r.ok && found) closeDeliverySession(found.session.id, "mesero");
    return r;
  },
};

export const deliveryConfigActions = {
  save(config: DeliveryConfig): ActionResult {
    const allowed = requirePermission("panel.admin");
    if (!allowed.ok) return allowed;
    const error = validateDeliveryConfig(config);
    if (error) return { ok: false, error };
    useAppStore.setState((s) => ({ restaurant: { ...s.restaurant, delivery: config } }));
    return { ok: true };
  },
};

/* ——— Caja: turnos y cobros ——— */

export const cashActions = {
  openShift(openingFloat: number): ActionResult {
    const allowed = requirePermission("cobrar");
    if (!allowed.ok) return allowed;
    const r = openShift(useAppStore.getState().shifts, {
      openingFloat,
      now: nowIso(),
      id: newId("turno"),
      by: allowed.actor!.name,
    });
    if (!r.ok) return r;
    useAppStore.setState((s) => ({ shifts: [...s.shifts, r.value] }));
    return { ok: true };
  },
  /** Registra un pago contra la cuenta de una mesa abierta o de un pedido a domicilio. */
  pay(sessionId: string, amount: number, method: PaymentMethod): ActionResult {
    const allowed = requirePermission("cobrar");
    if (!allowed.ok) return allowed;
    const state = useAppStore.getState();
    const session = state.sessions.find((x) => x.id === sessionId);
    // Los domicilios se pueden cobrar también ya entregados (el cobro suele ser al llegar).
    if (!session || (session.closedAt && !session.delivery))
      return { ok: false, error: "La mesa ya no está abierta" };
    const r = registerPayment({
      shift: state.shifts.find((x) => !x.closedAt),
      session,
      orders: state.orders,
      payments: state.payments,
      amount,
      method,
      now: nowIso(),
      id: newId("pago"),
      by: allowed.actor!.name,
    });
    if (!r.ok) return r;
    useAppStore.setState((s) => ({ payments: [...s.payments, r.value] }));
    if (!session.closedAt) replaceSession(session, {});
    return { ok: true };
  },
  closeShift(countedCash: number, note?: string): ActionResult {
    const allowed = requirePermission("cobrar");
    if (!allowed.ok) return allowed;
    const state = useAppStore.getState();
    const shift = state.shifts.find((x) => !x.closedAt);
    if (!shift) return { ok: false, error: "No hay una caja abierta" };
    const r = closeShift({
      shift,
      payments: state.payments,
      countedCash,
      note,
      now: nowIso(),
      by: allowed.actor!.name,
    });
    if (!r.ok) return r;
    useAppStore.setState((s) => ({
      shifts: s.shifts.map((x) => (x.id === shift.id ? r.value : x)),
    }));
    return { ok: true };
  },
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
  setSessionIdle(value: number): ActionResult {
    const error = validateIdleMinutes(value);
    if (error) return { ok: false, error };
    useAppStore.setState((s) => ({ restaurant: { ...s.restaurant, sessionIdleMin: value } }));
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
  toggleAssignment(waiterId: string, tableId: string): ActionResult {
    const check = requirePermission("mesas.asignar");
    if (!check.ok) return check;
    useAppStore.setState((s) => ({ waiters: toggleTableAssignment(s.waiters, waiterId, tableId) }));
    return { ok: true };
  },
};
