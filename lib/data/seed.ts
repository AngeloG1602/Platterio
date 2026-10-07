import type { StaffUser } from "@/lib/domain/access";
import { createClock, type DemoClock } from "@/lib/domain/clock";
import type {
  Alert,
  CashShift,
  Category,
  Dish,
  DishRating,
  Order,
  Payment,
  Restaurant,
  ServiceRating,
  Table,
  TableCall,
  TableSession,
  TimeSlot,
  Waiter,
} from "@/lib/domain/types";
import { CATEGORIES, DISHES, RESTAURANT, STAFF, TABLES, TIME_SLOTS, WAITERS } from "./catalog";
import { getHistory, seedAlerts, type HistoryCatalog } from "./history";

export const DATA_VERSION = 4;

export interface DemoSettings {
  /** Franja forzada desde el panel de demo; null = según la hora real. */
  slotOverride: string | null;
  clock: DemoClock;
}

/** Estado compartido: se persiste en localStorage y se transmite entre pestañas. Solo datos, sin funciones. */
export interface AppData {
  version: number;
  /** Momento en que se sembraron los datos; de aquí se regenera el historial de 14 días. */
  seedEpoch: number;
  restaurant: Restaurant;
  categories: Category[];
  timeSlots: TimeSlot[];
  dishes: Dish[];
  waiters: Waiter[];
  /** Usuarios del negocio (administrador, encargado, meseros, cocina). */
  staff: StaffUser[];
  tables: Table[];
  /** Sesiones, pedidos y calificaciones creados durante la demo (el historial va aparte). */
  sessions: TableSession[];
  /** Avisos de clientes al personal (hoy: "abre mi mesa"). */
  calls: TableCall[];
  orders: Order[];
  /** Cobros registrados en caja durante la demo (el historial va aparte). */
  payments: Payment[];
  /** Turnos de caja de la demo; a lo sumo uno abierto. */
  shifts: CashShift[];
  dishRatings: DishRating[];
  serviceRatings: ServiceRating[];
  alerts: Alert[];
  demo: DemoSettings;
}

/** El historial siempre se calcula sobre el catálogo original, para que sea estable. */
export const HISTORY_CATALOG: HistoryCatalog = {
  dishes: DISHES,
  timeSlots: TIME_SLOTS,
  tables: TABLES,
  waiters: WAITERS,
};

const clone = <T>(value: T): T => structuredClone(value);

export function createSeedState(now: number): AppData {
  const seedEpoch = Math.floor(now / 1000) * 1000;
  const history = getHistory(HISTORY_CATALOG, seedEpoch);
  return {
    version: DATA_VERSION,
    seedEpoch,
    restaurant: clone(RESTAURANT),
    categories: clone(CATEGORIES),
    timeSlots: clone(TIME_SLOTS),
    dishes: clone(DISHES),
    waiters: clone(WAITERS),
    staff: clone(STAFF),
    tables: clone(TABLES),
    sessions: [],
    calls: [],
    orders: [],
    payments: [],
    shifts: [],
    dishRatings: [],
    serviceRatings: [],
    alerts: seedAlerts(history, WAITERS),
    demo: { slotOverride: null, clock: createClock(seedEpoch) },
  };
}
