/**
 * Modelo de datos de Platterio (BRIEF §8).
 * Extensiones del mockup, documentadas en DECISIONES.md:
 * - OrderItem.unitPrice: precio congelado al enviar la ronda (las ventas no cambian si luego se edita el plato).
 * - Alert.stars / Alert.orderId: contexto para mostrar la alerta sin cruzar tablas.
 * - Diner.joinedAt: para ordenar comensales en la sesión.
 */

export const ALLERGENS = [
  "gluten",
  "lacteos",
  "huevo",
  "mani",
  "frutos_secos",
  "soya",
  "mariscos",
  "pescado",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export type SpiceLevel = 0 | 1 | 2 | 3;

export const ORDER_STATUSES = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "listo",
  "entregado",
  "rechazado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Stars = 1 | 2 | 3 | 4 | 5;

/** Identidad visual del negocio: plantilla base, tipografías propias y logo. */
export interface Brand {
  template: string;
  /** Estilo de la carta (distribución, esquinas, fondo claro u oscuro). Sin él, "clasico". */
  style?: string;
  /** Foto de portada del encabezado, como data URL. */
  cover?: string;
  headingFont?: string;
  bodyFont?: string;
  /** Logo reducido, como data URL (con la base de datos pasará a Storage). */
  logo?: string;
}

/** Domiciliario: nombre y, si se quiere escribirle por WhatsApp, su celular. */
export interface Driver {
  name: string;
  phone?: string;
}

/** Zona de reparto con su tarifa, pedido mínimo y tiempo estimado. */
export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  minOrder: number;
  etaMin: number;
}

/** Configuración de domicilios y recogida del negocio. */
export interface DeliveryConfig {
  enabled: boolean;
  /** También se puede pedir para recoger en el local. */
  pickup: boolean;
  /** Horario en que se reciben pedidos, "HH:MM" de 24 h (si cierra antes de abrir, cruza la medianoche). */
  opensAt: string;
  closesAt: string;
  zones: DeliveryZone[];
  /** Domiciliarios a los que se les puede asignar un pedido. */
  drivers: Driver[];
  /** WhatsApp del negocio, para que el cliente le avise su pedido (celular de 10 dígitos). */
  whatsapp?: string;
  /** Si el cliente ve el contacto del domiciliario mientras lleva su pedido (por defecto, sí). */
  shareDriver?: boolean;
  /** Minutos de preparación que se suman al tiempo de la zona. */
  prepMin: number;
}

export type FulfillmentType = "domicilio" | "recoger";
export type DeliveryPayWith = "efectivo" | "tarjeta" | "transferencia";

/** Datos del pedido a domicilio o para recoger; viven en la sesión del pedido. */
export interface DeliveryInfo {
  /** Código corto que ve el cliente, p. ej. "D-4K7Q". */
  code: string;
  type: FulfillmentType;
  customerName: string;
  phone: string;
  address?: string;
  reference?: string;
  zoneId?: string;
  zoneName?: string;
  fee: number;
  payWith: DeliveryPayWith;
  /** Con cuánto va a pagar en efectivo, para llevar el cambio. */
  cashFor?: number;
  note?: string;
  /** Minutos estimados que se le prometieron al cliente. */
  etaMin: number;
  driver?: string;
  /** Celular del domiciliario al despachar (se guarda en el pedido por si luego cambia). */
  driverPhone?: string;
  dispatchedAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  accentColor: string;
  logoUrl?: string;
  brand?: Brand;
  delivery?: DeliveryConfig;
  reservations?: ReservationConfig;
  /** Enlace para dejar una reseña en Google (se invita a todos los clientes por igual). */
  googleReviewUrl?: string;
  /** Plan contratado (en la demo se cambia desde el panel). Sin valor = Completo. */
  plan?: "digital" | "completo";
  /** Moneda en que están los precios (no se convierten al cambiarla). Por defecto, pesos colombianos. */
  currency?: string;
  /** Idiomas que ve el cliente. El español siempre está. */
  languages?: string[];
  serviceAlertThreshold: number;
  confirmTimeoutMin: number;
  /** Minutos sin actividad (y sin pedidos por entregar) para que una mesa se cierre sola. */
  sessionIdleMin: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  /** Nombre en inglés, si el negocio lo escribió. */
  en?: { name?: string };
}

/** Horas en formato "HH:MM" de 24 h. */
export interface TimeSlot {
  id: string;
  name: string;
  en?: { name?: string };
  start: string;
  end: string;
}

export interface Ingredient {
  name: string;
  description?: string;
  allergens: Allergen[];
}

export interface Variant {
  id: string;
  name: string;
  price: number;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  variants: Variant[];
  ingredients: Ingredient[];
  spiceLevel: SpiceLevel;
  photos: string[];
  timeSlotIds: string[];
  active: boolean;
  featured: boolean;
  model3d?: { fileName: string; sizeBytes: number };
  createdAt: string;
  /** Nombre y descripción en inglés, si el negocio los escribió. */
  en?: { name?: string; description?: string };
}

export interface Waiter {
  id: string;
  name: string;
  tableIds: string[];
}

export interface Table {
  id: string;
  number: number;
}

export interface Diner {
  id: string;
  alias: string;
  deviceId: string;
  restrictions: Allergen[];
  joinedAt?: string;
}

/**
 * Personalización de un plato elegida en el visor 3D, congelada al agregarlo al carrito: lo que
 * cambia el precio, lo que ve la cocina y los alérgenos resultantes.
 */
export interface CartCustomization {
  /** Elecciones del cliente, para volver a abrirlas en el visor. */
  choices: { counts: Record<string, number>; replaced: Record<string, string>; side?: string };
  /** Lo que suma (o resta) al precio de una unidad del plato. */
  priceDelta: number;
  /** Líneas de la comanda, en español: "SIN Cebolla caramelizada", "EXTRA Queso cheddar". */
  kitchen: string[];
  allergens: Allergen[];
}

export interface CartItem {
  id: string;
  dishId: string;
  variantId: string;
  qty: number;
  note?: string;
  dinerId: string;
  custom?: CartCustomization;
}

export interface TableSession {
  id: string;
  tableId: string;
  openedAt: string;
  closedAt?: string;
  diners: Diner[];
  cart: CartItem[];
  /** PIN de 4 dígitos que da el mesero al abrir la mesa. Las sesiones del historial no lo tienen. */
  pin?: string;
  /** Quién abrió la mesa (usuario del personal). */
  openedBy?: string;
  /** Última actividad: entrar, mover el carrito, etc. Los pedidos cuentan por sus fechas. */
  lastActivityAt?: string;
  /** Minutos de inactividad para cerrarse sola, si el mesero cambió el del negocio. */
  idleCloseMin?: number;
  closeReason?: "mesero" | "cancelada" | "inactividad";
  /** Si es un pedido a domicilio o para recoger (no hay mesa; `tableId` es `domicilio`). */
  delivery?: DeliveryInfo;
}

/** Aviso de un cliente al personal desde la mesa (hoy: pedir que abran la mesa). */
export interface TableCall {
  id: string;
  tableId: string;
  kind: "abrir_mesa";
  createdAt: string;
  resolved: boolean;
}

export interface OrderItem extends CartItem {
  unitPrice: number;
  removed?: boolean;
  adjustReason?: string;
  /** Cantidad y variante originales si el mesero las cambió (extensión del mockup). */
  adjustedFrom?: { qty: number; variantId: string };
  /** Lo agregó el personal después de que la ronda existía (extensión del mockup). */
  addedByStaff?: boolean;
}

/** Un cambio del personal sobre una ronda, para saber quién tocó qué y por qué. */
export interface OrderChange {
  id: string;
  at: string;
  /** Nombre de quien hizo el cambio. */
  by: string;
  kind: "agregar" | "quitar" | "cantidad" | "variante" | "anular";
  dishName: string;
  /** Texto corto con el antes y el después, p. ej. "2 → 3". */
  detail: string;
  reason?: string;
}

/** Una ronda de la mesa. */
export interface Order {
  id: string;
  sessionId: string;
  tableId: string;
  round: number;
  items: OrderItem[];
  status: OrderStatus;
  rejectReason?: string;
  createdAt: string;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  /** Comensal que envió la ronda (extensión del mockup). */
  sentByDinerId?: string;
  /** Quién creó la ronda: el personal la toma en la mesa (extensión del mockup). */
  createdBy?: string;
  /** Cambios del personal sobre la ronda, del más viejo al más nuevo. */
  changes?: OrderChange[];
  /** Hasta cuándo la cocina vio los cambios. */
  kitchenAckAt?: string;
}

export interface DishRating {
  id: string;
  dishId: string;
  orderId: string;
  stars: Stars;
  comment?: string;
  createdAt: string;
  /** Comensal que calificó (extensión del mockup, para no duplicar). */
  dinerId?: string;
}

export interface ServiceRating {
  id: string;
  sessionId: string;
  waiterId: string;
  stars: Stars;
  createdAt: string;
  /** Comensal que calificó (extensión del mockup). */
  dinerId?: string;
}

export type AlertType = "servicio_bajo" | "sin_confirmar";

export interface Alert {
  id: string;
  type: AlertType;
  tableId: string;
  waiterId?: string;
  createdAt: string;
  resolved: boolean;
  stars?: number;
  orderId?: string;
}

/* ——— Cobro y cierre de caja ——— */

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "otro";

/** Un pago registrado por caja contra la cuenta de una mesa (una cuenta puede tener varios). */
export interface Payment {
  id: string;
  sessionId: string;
  tableId: string;
  shiftId?: string;
  amount: number;
  method: PaymentMethod;
  at: string;
  /** Nombre de quien registró el pago. */
  by: string;
}

/** Resumen congelado al cerrar el turno de caja. */
export interface ShiftSummary {
  byMethod: Record<PaymentMethod, number>;
  total: number;
  payments: number;
  /** Efectivo que debía haber: fondo inicial + pagos en efectivo. */
  expectedCash: number;
  countedCash: number;
  /** Contado menos esperado: negativo es faltante, positivo es sobrante. */
  difference: number;
}

/** Turno de caja: se abre con un fondo y se cierra contando el efectivo. */
export interface CashShift {
  id: string;
  openedAt: string;
  openedBy: string;
  openingFloat: number;
  closedAt?: string;
  closedBy?: string;
  note?: string;
  summary?: ShiftSummary;
}

/* ——— Reservas y eventos ——— */

export type ReservationKind = "mesa" | "evento";
export type ReservationStatus =
  "solicitada" | "confirmada" | "rechazada" | "cancelada" | "realizada";

export interface ReservationQuoteItem {
  label: string;
  amount: number;
}

/** Cotización de un evento: ítems, total y anticipo (que se registra a mano, sin pasarela de pago). */
export interface ReservationQuote {
  items: ReservationQuoteItem[];
  deposit: number;
  depositPaid: boolean;
}

export interface Reservation {
  id: string;
  /** Código corto que ve el cliente, p. ej. "R-7KQ2". */
  code: string;
  kind: ReservationKind;
  name: string;
  phone: string;
  /** Día en formato AAAA-MM-DD, hora HH:MM. */
  date: string;
  time: string;
  people: number;
  /** Solo eventos: el motivo (cumpleaños, empresa…) y lo que quieren. */
  occasion?: string;
  details?: string;
  /** Presupuesto aproximado del cliente, en la moneda del negocio. */
  budget?: number;
  note?: string;
  status: ReservationStatus;
  /** Motivo del rechazo o de la cancelación. */
  reason?: string;
  createdAt: string;
  updatedAt: string;
  quote?: ReservationQuote;
}

export interface ReservationConfig {
  enabled: boolean;
  /** Primera y última hora en que se puede reservar, "HH:MM". */
  opensAt: string;
  closesAt: string;
  /** Cada cuántos minutos hay una hora disponible. */
  slotMin: number;
  /** Personas que caben por hora (suma de todas las reservas de esa hora). */
  capacityPerSlot: number;
  /** Máximo de personas en una reserva de mesa. */
  maxParty: number;
  /** Las reservas de mesa con cupo se confirman solas. */
  autoConfirm: boolean;
  /** Hasta cuántos días adelante se puede reservar. */
  advanceDays: number;
  /** Con cuántas horas de anticipación como mínimo. */
  minHours: number;
  events: { enabled: boolean; minPeople: number; occasions: string[] };
}
