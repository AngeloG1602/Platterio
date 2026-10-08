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
  headingFont?: string;
  bodyFont?: string;
  /** Logo reducido, como data URL (con la base de datos pasará a Storage). */
  logo?: string;
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
  drivers: string[];
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
  dispatchedAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  accentColor: string;
  logoUrl?: string;
  brand?: Brand;
  delivery?: DeliveryConfig;
  serviceAlertThreshold: number;
  confirmTimeoutMin: number;
  /** Minutos sin actividad (y sin pedidos por entregar) para que una mesa se cierre sola. */
  sessionIdleMin: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

/** Horas en formato "HH:MM" de 24 h. */
export interface TimeSlot {
  id: string;
  name: string;
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

export interface CartItem {
  id: string;
  dishId: string;
  variantId: string;
  qty: number;
  note?: string;
  dinerId: string;
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
