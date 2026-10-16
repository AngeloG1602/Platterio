import { orderTotal, type Period } from "./analytics";
import { isCashPayment, METHOD_LABEL, sessionBalance } from "./cash";
import { isCourtesy, isCredit } from "./credit";
import { DELIVERY_TABLE_ID, placeLabel } from "./delivery";
import { STATUS_LABEL } from "./orderStatus";
import type {
  CreditAccount,
  Dish,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  Table,
  TableSession,
  Waiter,
} from "./types";

/**
 * Historial de pedidos: cada ronda con su detalle (qué, quién, cómo se pagó y en qué quedó la
 * cuenta), filtros combinables y filtros de tiempo (últimos minutos, rango de horas, días de la
 * semana). También la carga de trabajo por hora y día, para cuadrar los turnos del personal.
 */

/* ——— Filtros de tiempo ——— */

export interface HoursRange {
  /** "HH:MM" de 24 h. */
  from: string;
  /** "HH:MM"; si es menor o igual que `from`, la franja pasa la medianoche. */
  to: string;
}

export interface TimeFilter {
  /** Últimos N minutos hasta ahora (10, 60, 1440…). Si está, manda sobre el periodo. */
  recentMin?: number;
  /** Periodo de días (hoy, 7 días, fechas propias). */
  period?: Period;
  /** Días de la semana: 0 = lunes … 6 = domingo. Vacío = todos. */
  weekdays?: readonly number[];
  /** Franjas de horas. Vacío = todo el día. */
  hours?: readonly HoursRange[];
}

export const WEEKDAY_LABEL = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];
export const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Lunes = 0 … domingo = 6, en la hora local. */
export const weekdayOf = (date: Date) => (date.getDay() + 6) % 7;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const isHHMM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Una franja es válida si las dos horas son "HH:MM" y no son iguales (sería todo el día). */
export function validateHoursRange(r: HoursRange): string | null {
  if (!isHHMM(r.from) || !isHHMM(r.to)) return "Escribe las horas como 14:00";
  if (r.from === r.to) return "La hora de inicio y la de fin no pueden ser iguales";
  return null;
}

/** ¿La hora (en minutos desde medianoche) cae en la franja? El fin no entra; pasa medianoche. */
export function inHoursRange(minutes: number, r: HoursRange): boolean {
  const a = toMinutes(r.from);
  const b = toMinutes(r.to);
  return a < b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}

/** ¿Este momento cumple el filtro de tiempo? `now` es la hora actual (para "últimos N min"). */
export function matchesTime(iso: string | undefined, f: TimeFilter, now: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  if (f.recentMin !== undefined) {
    if (t < now - f.recentMin * 60_000 || t > now) return false;
  } else if (f.period && (t < f.period.from || t > f.period.to)) return false;
  const d = new Date(t);
  if (f.weekdays && f.weekdays.length > 0 && !f.weekdays.includes(weekdayOf(d))) return false;
  if (f.hours && f.hours.length > 0) {
    const m = d.getHours() * 60 + d.getMinutes();
    if (!f.hours.some((r) => inHoursRange(m, r))) return false;
  }
  return true;
}

/* ——— Filas del historial ——— */

export type AccountTag = "Por cobrar" | "Cobrado" | "Crédito" | "Cortesía";

export interface OrderRecord {
  order: Order;
  /** "Mesa 3" o "Domicilio D-XXXX". */
  place: string;
  /** Número corto para buscar: "M3-R1" o el código del domicilio. */
  number: string;
  tableId: string;
  waiter: string;
  total: number;
  /** Platos en una línea: "2× Clásica 27 · 1× Limonada". */
  itemsText: string;
  status: OrderStatus;
  statusLabel: string;
  /** Cómo va la cuenta de la mesa: puede tener varias etiquetas (cobro, crédito, cortesía…). */
  tags: AccountTag[];
  /** Formas de pago usadas en la cuenta, en texto: "Efectivo, Tarjeta". */
  methods: PaymentMethod[];
  /** Personas a cuyo nombre quedó crédito o cortesía. */
  people: string[];
  pending: number;
}

interface Source {
  orders: readonly Order[];
  sessions: readonly TableSession[];
  payments: readonly Payment[];
  tables: readonly Table[];
  waiters: readonly Waiter[];
  dishes: readonly Dish[];
  accounts: readonly CreditAccount[];
}

/** Una fila por ronda, con todo lo que se quiere ver o buscar. */
export function orderRecords(src: Source): OrderRecord[] {
  const dishName = new Map(src.dishes.map((d) => [d.id, d.name]));
  const sessionOf = new Map(src.sessions.map((s) => [s.id, s]));
  const byAccount = new Map(src.accounts.map((a) => [a.id, a.name]));
  const paymentsBySession = new Map<string, Payment[]>();
  for (const p of src.payments) {
    const list = paymentsBySession.get(p.sessionId);
    if (list) list.push(p);
    else paymentsBySession.set(p.sessionId, [p]);
  }
  const accountOf = new Map<
    string,
    { tags: AccountTag[]; methods: PaymentMethod[]; people: string[]; pending: number }
  >();
  const accountFor = (sessionId: string) => {
    const cached = accountOf.get(sessionId);
    if (cached) return cached;
    const own = paymentsBySession.get(sessionId) ?? [];
    const session = sessionOf.get(sessionId);
    const { pending } = sessionBalance(src.orders, own, sessionId, session?.delivery?.fee);
    const tags: AccountTag[] = [];
    if (pending > 0) tags.push("Por cobrar");
    if (own.some(isCashPayment)) tags.push("Cobrado");
    if (own.some(isCredit)) tags.push("Crédito");
    if (own.some(isCourtesy)) tags.push("Cortesía");
    const methods = [...new Set(own.filter(isCashPayment).map((p) => p.method))];
    const people = [
      ...new Set(
        own
          .map((p) => (p.accountId ? byAccount.get(p.accountId) : undefined))
          .filter((n): n is string => Boolean(n)),
      ),
    ];
    const value = { tags, methods, people, pending };
    accountOf.set(sessionId, value);
    return value;
  };

  return src.orders.map((order) => {
    const place = placeLabel(order, src.tables, src.sessions);
    const session = sessionOf.get(order.sessionId);
    const tableNumber = src.tables.find((t) => t.id === order.tableId)?.number;
    const isDelivery = order.tableId === DELIVERY_TABLE_ID;
    const account =
      order.status === "rechazado"
        ? { tags: [], methods: [], people: [], pending: 0 }
        : accountFor(order.sessionId);
    return {
      order,
      place,
      number: isDelivery
        ? (session?.delivery?.code ?? "Domicilio")
        : `M${tableNumber ?? "?"}-R${order.round}`,
      tableId: order.tableId,
      waiter: isDelivery
        ? "—"
        : (src.waiters.find((w) => w.tableIds.includes(order.tableId))?.name ?? "—"),
      total: orderTotal(order),
      itemsText: order.items
        .filter((i) => !i.removed)
        .map((i) => `${i.qty}× ${dishName.get(i.dishId) ?? "Plato"}`)
        .join(" · "),
      status: order.status,
      statusLabel: STATUS_LABEL[order.status],
      ...account,
    };
  });
}

/* ——— Filtros del historial ——— */

export type PayFilter = "por_cobrar" | "cobrado" | "credito" | "cortesia" | PaymentMethod;

export const PAY_FILTER_LABEL: Record<string, string> = {
  por_cobrar: "Por cobrar",
  cobrado: "Cobrado",
  credito: "A crédito",
  cortesia: "Cortesía",
  ...METHOD_LABEL,
};

export interface OrderFilter {
  /** Busca en número, lugar, mesero, platos, formas de pago y personas. */
  text?: string;
  /** Id de la mesa, o `domicilio`. */
  tableId?: string;
  waiter?: string;
  status?: OrderStatus;
  pay?: PayFilter;
  time?: TimeFilter;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PAY_TAG: Partial<Record<PayFilter, AccountTag>> = {
  por_cobrar: "Por cobrar",
  cobrado: "Cobrado",
  credito: "Crédito",
  cortesia: "Cortesía",
};

/** Filas que cumplen todos los filtros, de la más reciente a la más antigua (por hora del pedido). */
export function filterRecords(
  records: readonly OrderRecord[],
  f: OrderFilter,
  now: number,
): OrderRecord[] {
  const q = f.text?.trim() ? fold(f.text.trim()) : "";
  return records
    .filter((r) => !f.tableId || r.tableId === f.tableId)
    .filter((r) => !f.waiter || r.waiter === f.waiter)
    .filter((r) => !f.status || r.status === f.status)
    .filter((r) => {
      if (!f.pay) return true;
      const tag = PAY_TAG[f.pay];
      return tag ? r.tags.includes(tag) : r.methods.includes(f.pay as PaymentMethod);
    })
    .filter((r) => !f.time || matchesTime(r.order.createdAt, f.time, now))
    .filter(
      (r) =>
        !q ||
        fold(
          [
            r.number,
            r.place,
            r.waiter,
            r.itemsText,
            r.statusLabel,
            r.tags.join(" "),
            r.methods.map((m) => METHOD_LABEL[m]).join(" "),
            r.people.join(" "),
          ].join(" "),
        ).includes(q),
    )
    .sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt));
}

export interface RecordsSummary {
  orders: number;
  /** Rondas entregadas: lo vendido. */
  sold: number;
  soldTotal: number;
  rejected: number;
  inProgress: number;
}

export function summarizeRecords(rows: readonly OrderRecord[]): RecordsSummary {
  const sold = rows.filter((r) => r.status === "entregado");
  return {
    orders: rows.length,
    sold: sold.length,
    soldTotal: sold.reduce((s, r) => s + r.total, 0),
    rejected: rows.filter((r) => r.status === "rechazado").length,
    inProgress: rows.filter((r) => r.status !== "entregado" && r.status !== "rechazado").length,
  };
}

/** Filas para el CSV, con encabezado. */
export function recordsCsvRows(rows: readonly OrderRecord[]): (string | number)[][] {
  return [
    [
      "Fecha",
      "Hora",
      "Pedido",
      "Lugar",
      "Mesero",
      "Platos",
      "Total",
      "Estado",
      "Cuenta",
      "Formas de pago",
      "Personas",
    ],
    ...rows.map((r) => {
      const d = new Date(r.order.createdAt);
      return [
        d.toLocaleDateString("es-CO"),
        d.toLocaleTimeString("es-CO"),
        r.number,
        r.place,
        r.waiter,
        r.itemsText,
        r.total,
        r.statusLabel,
        r.tags.join(", "),
        r.methods.map((m) => METHOD_LABEL[m]).join(", "),
        r.people.join(", "),
      ];
    }),
  ];
}

/* ——— Carga de trabajo ——— */

export type WorkloadMetric = "pedidos" | "ventas";

export interface Workload {
  /** [día de la semana 0-6][hora 0-23]. */
  cells: number[][];
  max: number;
  total: number;
  /** Las horas con más carga, de mayor a menor. */
  peaks: { weekday: number; hour: number; value: number }[];
  /** Total por hora del día (suma de todos los días). */
  byHour: number[];
  /** Total por día de la semana. */
  byWeekday: number[];
}

/**
 * Pedidos (o ventas entregadas) por día de la semana y hora, en el periodo. Sirve para ver dónde
 * hay más trabajo y cuadrar horarios. Los rechazados no cuentan.
 */
export function workload(
  rows: readonly OrderRecord[],
  period: Period,
  metric: WorkloadMetric,
): Workload {
  const cells = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const r of rows) {
    if (r.status === "rechazado") continue;
    if (metric === "ventas" && r.status !== "entregado") continue;
    const iso =
      metric === "ventas" ? (r.order.deliveredAt ?? r.order.createdAt) : r.order.createdAt;
    const t = Date.parse(iso);
    if (t < period.from || t > period.to) continue;
    const d = new Date(t);
    cells[weekdayOf(d)]![d.getHours()]! += metric === "ventas" ? r.total : 1;
  }
  const flat = cells.flatMap((row, weekday) =>
    row.map((value, hour) => ({ weekday, hour, value })),
  );
  const byHour = Array.from({ length: 24 }, (_, h) => cells.reduce((s, row) => s + row[h]!, 0));
  return {
    cells,
    max: Math.max(0, ...flat.map((c) => c.value)),
    total: flat.reduce((s, c) => s + c.value, 0),
    peaks: flat
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value || a.weekday - b.weekday || a.hour - b.hour)
      .slice(0, 5),
    byHour,
    byWeekday: cells.map((row) => row.reduce((s, v) => s + v, 0)),
  };
}
