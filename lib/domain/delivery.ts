import { inPeriod, orderTotal, startOfDay, type Period } from "./analytics";
import { unitPrice } from "./cart";
import { formatMoney } from "./format";
import type {
  DeliveryConfig,
  DeliveryInfo,
  DeliveryPayWith,
  DeliveryZone,
  Dish,
  FulfillmentType,
  Order,
  Table,
  TableSession,
} from "./types";
import { localized, t } from "@/lib/i18n";

/** Las sesiones de domicilio no tienen mesa: comparten este identificador. */
export const DELIVERY_TABLE_ID = "domicilio";
export const DELIVERY_DINER_ID = "cliente";

export const isDelivery = (s: Pick<TableSession, "delivery">): s is { delivery: DeliveryInfo } =>
  !!s.delivery;

export const DEFAULT_DELIVERY: DeliveryConfig = {
  enabled: true,
  pickup: true,
  opensAt: "11:00",
  closesAt: "22:00",
  prepMin: 20,
  drivers: ["Andrés", "Sebastián"],
  zones: [
    { id: "zona-centro", name: "Centro", fee: 4000, minOrder: 25000, etaMin: 20 },
    { id: "zona-norte", name: "Barrios del norte", fee: 6000, minOrder: 30000, etaMin: 30 },
    { id: "zona-sur", name: "Barrios del sur", fee: 8000, minOrder: 35000, etaMin: 40 },
  ],
};

export const PAY_WITH_LABEL: Record<DeliveryPayWith, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta (datáfono)",
  transferencia: "Transferencia",
};

/* ——— Horario ——— */

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

/** ¿Se están recibiendo pedidos a esta hora? Si cierra antes de abrir, cruza la medianoche. */
export function isDeliveryOpen(config: DeliveryConfig, nowMs: number): boolean {
  if (!config.enabled) return false;
  const d = new Date(nowMs);
  const now = d.getHours() * 60 + d.getMinutes();
  const open = minutes(config.opensAt);
  const close = minutes(config.closesAt);
  if (open === close) return true;
  return open < close ? now >= open && now < close : now >= open || now < close;
}

/* ——— Datos del cliente ——— */

/** Celular colombiano: 10 dígitos que empiezan por 3 (acepta +57, espacios y guiones). */
export function normalizePhone(text: string): string | null {
  let digits = text.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("57")) digits = digits.slice(2);
  return /^3\d{9}$/.test(digits) ? digits : null;
}

export function formatPhone(digits: string): string {
  return digits.length === 10
    ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : digits;
}

export interface CheckoutInput {
  type: FulfillmentType;
  name: string;
  phone: string;
  address: string;
  reference: string;
  zoneId: string;
  payWith: DeliveryPayWith;
  cashFor: string;
  note: string;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutInput | "cart", string>>;

export const MAX_CASH_FOR = 2_000_000;

export interface DeliveryTotals {
  subtotal: number;
  fee: number;
  total: number;
}

export const deliveryTotals = (subtotal: number, fee: number): DeliveryTotals => ({
  subtotal,
  fee,
  total: subtotal + fee,
});

export function zoneOf(config: DeliveryConfig, zoneId: string): DeliveryZone | undefined {
  return config.zones.find((z) => z.id === zoneId);
}

/** Valida el formulario. Devuelve los datos limpios o un error por campo. */
export function validateCheckout(
  input: CheckoutInput,
  config: DeliveryConfig,
  subtotal: number,
): { ok: true; info: Omit<DeliveryInfo, "code"> } | { ok: false; errors: CheckoutErrors } {
  const errors: CheckoutErrors = {};
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) errors.name = t("Escribe tu nombre (2 a 40 letras)");
  const phone = normalizePhone(input.phone);
  if (!phone) errors.phone = t("Escribe un celular de 10 dígitos que empiece por 3");

  const domicilio = input.type === "domicilio";
  const zone = domicilio ? zoneOf(config, input.zoneId) : undefined;
  const address = input.address.trim().replace(/\s+/g, " ");
  if (domicilio) {
    if (!zone) errors.zoneId = t("Elige tu zona");
    if (address.length < 6 || address.length > 120)
      errors.address = t("Escribe la dirección completa");
    if (zone && subtotal < zone.minOrder)
      errors.cart = t("El pedido mínimo para {zone} es {amount}", {
        zone: zone.name,
        amount: formatMoney(zone.minOrder),
      });
  } else if (!config.pickup) {
    errors.type = t("Por ahora solo hacemos domicilios");
  }

  const fee = zone?.fee ?? 0;
  let cashFor: number | undefined;
  if (input.payWith === "efectivo" && input.cashFor.trim()) {
    const value = Number(input.cashFor.replace(/\D/g, ""));
    if (!Number.isInteger(value) || value > MAX_CASH_FOR)
      errors.cashFor = t("Escribe con cuánto vas a pagar");
    else if (value < subtotal + fee)
      errors.cashFor = t("Tiene que ser al menos el total del pedido");
    else cashFor = value;
  }

  const note = input.note.trim();
  if (note.length > 140) errors.note = t("Máximo 140 caracteres");
  const reference = input.reference.trim();
  if (reference.length > 80) errors.reference = t("Máximo 80 caracteres");
  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };

  const etaMin = (zone?.etaMin ?? 0) + config.prepMin;
  return {
    ok: true,
    info: {
      type: input.type,
      customerName: name,
      phone,
      ...(domicilio ? { address, zoneId: zone!.id, zoneName: zone!.name } : {}),
      ...(domicilio && reference ? { reference } : {}),
      fee,
      payWith: input.payWith,
      ...(cashFor ? { cashFor } : {}),
      ...(note ? { note } : {}),
      etaMin,
    },
  };
}

/* ——— Crear el pedido ——— */

export interface DeliveryCartLine {
  id: string;
  dishId: string;
  variantId: string;
  qty: number;
  note?: string;
}

export function deliverySubtotal(cart: readonly DeliveryCartLine[], dishes: readonly Dish[]) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  return cart.reduce((s, l) => s + unitPrice(byId.get(l.dishId), l.variantId) * l.qty, 0);
}

export const deliveryCount = (cart: readonly DeliveryCartLine[]) =>
  cart.reduce((s, l) => s + l.qty, 0);

export type PlaceResult =
  | { ok: true; session: TableSession; order: Order }
  | { ok: false; error: string; errors?: CheckoutErrors };

/** Convierte el carrito y el formulario en un pedido por confirmar (sesión + ronda única). */
export function placeDeliveryOrder(params: {
  config: DeliveryConfig | undefined;
  dishes: readonly Dish[];
  cart: readonly DeliveryCartLine[];
  input: CheckoutInput;
  nowMs: number;
  sessionId: string;
  orderId: string;
  code: string;
  itemId: () => string;
}): PlaceResult {
  const { config, dishes, cart, input, nowMs } = params;
  if (!config?.enabled)
    return { ok: false, error: t("Por ahora no recibimos pedidos a domicilio") };
  if (!isDeliveryOpen(config, nowMs))
    return {
      ok: false,
      error: t("Ahora estamos cerrados. Recibimos pedidos de {opens} a {closes}.", {
        opens: config.opensAt,
        closes: config.closesAt,
      }),
    };
  if (cart.length === 0) return { ok: false, error: t("Tu pedido está vacío") };
  const byId = new Map(dishes.map((d) => [d.id, d]));
  for (const line of cart) {
    const dish = byId.get(line.dishId);
    if (!dish?.active)
      return {
        ok: false,
        error: t("{dish} ya no está disponible. Quítalo para seguir.", {
          dish: dish ? localized(dish) : t("Un plato"),
        }),
      };
    if (!dish.variants.some((v) => v.id === line.variantId))
      return { ok: false, error: t("Elige otra opción de {dish}", { dish: localized(dish) }) };
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 20)
      return { ok: false, error: t("La cantidad va de 1 a 20") };
  }
  const subtotal = deliverySubtotal(cart, dishes);
  const checked = validateCheckout(input, config, subtotal);
  if (!checked.ok)
    return {
      ok: false,
      error: Object.values(checked.errors)[0] ?? t("Revisa tus datos"),
      errors: checked.errors,
    };

  const now = new Date(nowMs).toISOString();
  const session: TableSession = {
    id: params.sessionId,
    tableId: DELIVERY_TABLE_ID,
    openedAt: now,
    lastActivityAt: now,
    diners: [],
    cart: [],
    delivery: { ...checked.info, code: params.code },
  };
  const order: Order = {
    id: params.orderId,
    sessionId: params.sessionId,
    tableId: DELIVERY_TABLE_ID,
    round: 1,
    status: "pendiente",
    createdAt: now,
    sentByDinerId: DELIVERY_DINER_ID,
    items: cart.map((l) => ({
      id: params.itemId(),
      dishId: l.dishId,
      variantId: l.variantId,
      qty: l.qty,
      ...(l.note?.trim() ? { note: l.note.trim() } : {}),
      dinerId: DELIVERY_DINER_ID,
      unitPrice: unitPrice(byId.get(l.dishId), l.variantId),
    })),
  };
  return { ok: true, session, order };
}

/** Código corto y fácil de dictar, a partir del final del id (sin letras que se confunden). */
export function deliveryCode(id: string): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + id.charCodeAt(i % id.length);
  }
  return `D-${out}`;
}

/* ——— Etapas ——— */

export type DeliveryStage =
  "recibido" | "confirmado" | "preparando" | "listo" | "en_camino" | "entregado" | "cancelado";

export function deliveryStage(order: Pick<Order, "status">, info: DeliveryInfo): DeliveryStage {
  switch (order.status) {
    case "rechazado":
      return "cancelado";
    case "pendiente":
      return "recibido";
    case "confirmado":
      return "confirmado";
    case "en_preparacion":
      return "preparando";
    case "listo":
      return info.dispatchedAt ? "en_camino" : "listo";
    case "entregado":
      return "entregado";
  }
}

export interface DeliveryStep {
  key: string;
  label: string;
  state: "hecho" | "actual" | "pendiente";
}

/** Pasos que ve el cliente; cambian según sea domicilio o recogida. */
export function deliveryTimeline(order: Pick<Order, "status">, info: DeliveryInfo): DeliveryStep[] {
  const stage = deliveryStage(order, info);
  const pickup = info.type === "recoger";
  const labels = [
    t("Recibido"),
    t("Confirmado"),
    t("En preparación"),
    pickup ? t("Listo para recoger") : t("En camino"),
    t("Entregado"),
  ];
  // Paso en curso. "Listo" de un domicilio aún sin domiciliario sigue marcado como preparación.
  const current: Record<DeliveryStage, number> = {
    recibido: 0,
    confirmado: 1,
    preparando: 2,
    listo: pickup ? 3 : 2,
    en_camino: 3,
    entregado: labels.length,
    cancelado: -1,
  };
  const at = current[stage];
  return labels.map((label, i) => ({
    key: `paso-${i}`,
    label,
    state: at < 0 ? "pendiente" : i < at ? "hecho" : i === at ? "actual" : "pendiente",
  }));
}

/** Frase para el cliente según la etapa. */
export function stageMessage(stage: DeliveryStage, info: DeliveryInfo): string {
  const pickup = info.type === "recoger";
  switch (stage) {
    case "recibido":
      return t("Recibimos tu pedido. En un momento lo confirmamos.");
    case "confirmado":
      return t("Tu pedido está confirmado y pasa a la cocina.");
    case "preparando":
      return t("Lo estamos preparando.");
    case "listo":
      return pickup
        ? t("Tu pedido está listo. Puedes pasar a recogerlo.")
        : t("Tu pedido está listo y esperando al domiciliario.");
    case "en_camino":
      return info.driver
        ? t("{driver} va en camino con tu pedido.", { driver: info.driver })
        : t("Tu pedido va en camino.");
    case "entregado":
      return pickup
        ? t("Pedido entregado. ¡Buen provecho!")
        : t("Tu pedido llegó. ¡Buen provecho!");
    case "cancelado":
      return t("Este pedido se canceló.");
  }
}

export const customerCanCancel = (order: Pick<Order, "status">) => order.status === "pendiente";

/* ——— Despacho ——— */

export function dispatchDelivery(
  session: TableSession,
  order: Order,
  driver: string,
  now: string,
): { ok: true; session: TableSession } | { ok: false; error: string } {
  const info = session.delivery;
  if (!info) return { ok: false, error: "Ese pedido no es a domicilio" };
  if (info.type !== "domicilio") return { ok: false, error: "Ese pedido es para recoger" };
  if (order.status !== "listo") return { ok: false, error: "El pedido todavía no está listo" };
  if (info.dispatchedAt) return { ok: false, error: "Ese pedido ya salió" };
  const who = driver.trim();
  if (!who || who.length > 30) return { ok: false, error: "Elige quién lo lleva" };
  return {
    ok: true,
    session: { ...session, delivery: { ...info, driver: who, dispatchedAt: now } },
  };
}

/* ——— Bandeja del personal ——— */

export interface DeliveryItem {
  session: TableSession;
  info: DeliveryInfo;
  order: Order;
  stage: DeliveryStage;
  total: number;
}

export interface DeliveryQueue {
  nuevos: DeliveryItem[];
  enCocina: DeliveryItem[];
  porSalir: DeliveryItem[];
  enCamino: DeliveryItem[];
  cerrados: DeliveryItem[];
}

export function deliveryItems(
  sessions: readonly TableSession[],
  orders: readonly Order[],
): DeliveryItem[] {
  const byId = new Map<string, Order>();
  for (const o of orders)
    if (o.tableId === DELIVERY_TABLE_ID && !byId.has(o.sessionId)) byId.set(o.sessionId, o);
  const items: DeliveryItem[] = [];
  for (const session of sessions) {
    const info = session.delivery;
    const order = byId.get(session.id);
    if (!info || !order) continue;
    items.push({
      session,
      info,
      order,
      stage: deliveryStage(order, info),
      total: orderTotal(order) + info.fee,
    });
  }
  return items;
}

/** Agrupa los pedidos por lo que toca hacer con ellos; los finalizados son los de hoy. */
export function deliveryQueue(items: readonly DeliveryItem[], now: number): DeliveryQueue {
  const queue: DeliveryQueue = {
    nuevos: [],
    enCocina: [],
    porSalir: [],
    enCamino: [],
    cerrados: [],
  };
  const today = startOfDay(now);
  for (const it of items) {
    if (it.stage === "recibido") queue.nuevos.push(it);
    else if (it.stage === "confirmado" || it.stage === "preparando") queue.enCocina.push(it);
    else if (it.stage === "listo") queue.porSalir.push(it);
    else if (it.stage === "en_camino") queue.enCamino.push(it);
    else if (Date.parse(it.session.openedAt) >= today) queue.cerrados.push(it);
  }
  const byOpened = (a: DeliveryItem, b: DeliveryItem) =>
    a.session.openedAt.localeCompare(b.session.openedAt);
  for (const key of ["nuevos", "enCocina", "porSalir", "enCamino"] as const)
    queue[key].sort(byOpened);
  queue.cerrados.sort((a, b) => byOpened(b, a));
  return queue;
}

/* ——— Reporte ——— */

export interface DeliveryStats {
  orders: number;
  delivered: number;
  cancelled: number;
  pickups: number;
  /** Total de lo que se cobró por envío en pedidos entregados. */
  fees: number;
  sales: number;
  /** Promedio de minutos entre pedir y entregar. */
  avgMinutes: number | null;
  /** Entregados dentro del tiempo prometido. */
  onTime: number;
  byZone: { name: string; orders: number; sales: number }[];
}

export function deliveryStats(
  sessions: readonly TableSession[],
  orders: readonly Order[],
  period: Period,
): DeliveryStats {
  const items = deliveryItems(sessions, orders).filter((i) => inPeriod(i.session.openedAt, period));
  const delivered = items.filter((i) => i.stage === "entregado");
  const minutesOf = (i: DeliveryItem) =>
    (Date.parse(i.order.deliveredAt ?? i.order.createdAt) - Date.parse(i.order.createdAt)) / 60_000;
  const zones = new Map<string, { orders: number; sales: number }>();
  for (const i of delivered) {
    const name =
      i.info.type === "recoger" ? "Recoger en el local" : (i.info.zoneName ?? "Sin zona");
    const z = zones.get(name) ?? { orders: 0, sales: 0 };
    z.orders += 1;
    z.sales += orderTotal(i.order);
    zones.set(name, z);
  }
  return {
    orders: items.length,
    delivered: delivered.length,
    cancelled: items.filter((i) => i.stage === "cancelado").length,
    pickups: items.filter((i) => i.info.type === "recoger").length,
    fees: delivered.reduce((s, i) => s + i.info.fee, 0),
    sales: delivered.reduce((s, i) => s + orderTotal(i.order), 0),
    avgMinutes: delivered.length
      ? delivered.reduce((s, i) => s + minutesOf(i), 0) / delivered.length
      : null,
    onTime: delivered.filter((i) => minutesOf(i) <= i.info.etaMin).length,
    byZone: [...zones].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sales - a.sales),
  };
}

/* ——— Configuración ——— */

export function validateDeliveryConfig(config: DeliveryConfig): string | null {
  if (!HHMM.test(config.opensAt) || !HHMM.test(config.closesAt))
    return "Escribe el horario como HH:MM";
  if (!Number.isInteger(config.prepMin) || config.prepMin < 0 || config.prepMin > 120)
    return "La preparación va de 0 a 120 minutos";
  if (config.enabled && config.zones.length === 0 && !config.pickup)
    return "Agrega al menos una zona o activa recoger en el local";
  const names = new Set<string>();
  for (const z of config.zones) {
    const name = z.name.trim();
    if (!name) return "Cada zona necesita un nombre";
    if (names.has(name.toLowerCase())) return `La zona "${name}" está repetida`;
    names.add(name.toLowerCase());
    if (!Number.isInteger(z.fee) || z.fee < 0 || z.fee > 50_000)
      return `El envío de ${name} va de $0 a $50.000`;
    if (!Number.isInteger(z.minOrder) || z.minOrder < 0 || z.minOrder > 500_000)
      return `El pedido mínimo de ${name} va de $0 a $500.000`;
    if (!Number.isInteger(z.etaMin) || z.etaMin < 5 || z.etaMin > 180)
      return `El tiempo de ${name} va de 5 a 180 minutos`;
  }
  const drivers = config.drivers.map((d) => d.trim().toLowerCase());
  if (drivers.some((d) => !d || d.length > 30)) return "Cada domiciliario necesita un nombre corto";
  if (new Set(drivers).size !== drivers.length) return "Hay un domiciliario repetido";
  return null;
}

/** Dónde va un pedido: "Mesa 5", "Domicilio D-4K7Q" o "Recoger D-4K7Q". */
export function placeLabel(
  order: Pick<Order, "tableId" | "sessionId">,
  tables: readonly Table[],
  sessions: readonly TableSession[],
): string {
  if (order.tableId === DELIVERY_TABLE_ID) {
    const info = sessions.find((s) => s.id === order.sessionId)?.delivery;
    return info ? `${info.type === "recoger" ? "Recoger" : "Domicilio"} ${info.code}` : "Domicilio";
  }
  return `Mesa ${tables.find((t) => t.id === order.tableId)?.number ?? "?"}`;
}
