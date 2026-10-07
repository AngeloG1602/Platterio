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

export interface Restaurant {
  id: string;
  name: string;
  accentColor: string;
  logoUrl?: string;
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
