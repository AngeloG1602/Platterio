import { inPeriod, orderTotal, type Period } from "./analytics";
import type {
  CashShift,
  Order,
  Payment,
  PaymentMethod,
  ShiftSummary,
  Table,
  TableSession,
  Waiter,
} from "./types";

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "efectivo",
  "tarjeta",
  "transferencia",
  "otro",
];
export const METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  otro: "Otro",
};

export type CashResult<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

const emptyByMethod = (): Record<PaymentMethod, number> => ({
  efectivo: 0,
  tarjeta: 0,
  transferencia: 0,
  otro: 0,
});

/* ——— Cuenta de una mesa ——— */

/** Lo que debe la sesión: todas sus rondas menos las rechazadas, con lo quitado descontado. */
export function sessionDue(orders: readonly Order[], sessionId: string): number {
  return orders
    .filter((o) => o.sessionId === sessionId && o.status !== "rechazado")
    .reduce((s, o) => s + orderTotal(o), 0);
}

export function sessionPaid(payments: readonly Payment[], sessionId: string): number {
  return payments.filter((p) => p.sessionId === sessionId).reduce((s, p) => s + p.amount, 0);
}

export interface Balance {
  due: number;
  paid: number;
  /** Lo que falta cobrar (nunca negativo). */
  pending: number;
}

export function sessionBalance(
  orders: readonly Order[],
  payments: readonly Payment[],
  sessionId: string,
): Balance {
  const due = sessionDue(orders, sessionId);
  const paid = sessionPaid(payments, sessionId);
  return { due, paid, pending: Math.max(0, due - paid) };
}

/* ——— Turno de caja ——— */

export const openShiftOf = (shifts: readonly CashShift[]) => shifts.find((s) => !s.closedAt);

export function openShift(
  shifts: readonly CashShift[],
  params: { openingFloat: number; now: string; id: string; by: string },
): CashResult<CashShift> {
  if (openShiftOf(shifts)) return fail("Ya hay una caja abierta");
  const { openingFloat } = params;
  if (!Number.isInteger(openingFloat) || openingFloat < 0 || openingFloat > 50_000_000)
    return fail("Escribe el fondo inicial en pesos (puede ser 0)");
  return {
    ok: true,
    value: { id: params.id, openedAt: params.now, openedBy: params.by, openingFloat },
  };
}

export function registerPayment(params: {
  shift: CashShift | undefined;
  session: TableSession;
  orders: readonly Order[];
  payments: readonly Payment[];
  amount: number;
  method: PaymentMethod;
  now: string;
  id: string;
  by: string;
}): CashResult<Payment> {
  const { shift, session, amount, method } = params;
  if (!shift) return fail("Abre la caja antes de cobrar");
  if (!PAYMENT_METHODS.includes(method)) return fail("Elige cómo pagó");
  if (!Number.isInteger(amount) || amount <= 0) return fail("Escribe cuánto pagó, en pesos");
  const { pending } = sessionBalance(params.orders, params.payments, session.id);
  if (pending === 0) return fail("Esta cuenta ya está pagada");
  if (amount > pending) return fail("Es más de lo que falta por cobrar");
  return {
    ok: true,
    value: {
      id: params.id,
      sessionId: session.id,
      tableId: session.tableId,
      shiftId: shift.id,
      amount,
      method,
      at: params.now,
      by: params.by,
    },
  };
}

/** Lo cobrado en el turno, por forma de pago, y el efectivo que debería haber en la caja. */
export function shiftTotals(shift: CashShift, payments: readonly Payment[]) {
  const own = payments.filter((p) => p.shiftId === shift.id);
  const byMethod = emptyByMethod();
  for (const p of own) byMethod[p.method] += p.amount;
  const total = own.reduce((s, p) => s + p.amount, 0);
  return {
    byMethod,
    total,
    payments: own.length,
    expectedCash: shift.openingFloat + byMethod.efectivo,
  };
}

export function closeShift(params: {
  shift: CashShift;
  payments: readonly Payment[];
  countedCash: number;
  note?: string;
  now: string;
  by: string;
}): CashResult<CashShift> {
  const { shift, countedCash } = params;
  if (shift.closedAt) return fail("Esta caja ya estaba cerrada");
  if (!Number.isInteger(countedCash) || countedCash < 0)
    return fail("Escribe el efectivo que contaste, en pesos");
  const totals = shiftTotals(shift, params.payments);
  const difference = countedCash - totals.expectedCash;
  const note = params.note?.trim();
  if (difference !== 0 && !note) return fail("Hay diferencia: cuéntanos a qué se debe");
  const summary: ShiftSummary = { ...totals, countedCash, difference };
  return {
    ok: true,
    value: {
      ...shift,
      closedAt: params.now,
      closedBy: params.by,
      ...(note ? { note } : {}),
      summary,
    },
  };
}

/** Mesas abiertas con saldo por cobrar (para avisar antes de cerrar la caja). */
export function openTablesWithBalance(
  sessions: readonly TableSession[],
  orders: readonly Order[],
  payments: readonly Payment[],
  tables: readonly Table[],
) {
  return sessions
    .filter((s) => !s.closedAt)
    .map((s) => ({
      session: s,
      table: tables.find((t) => t.id === s.tableId),
      ...sessionBalance(orders, payments, s.id),
    }))
    .filter((x) => x.pending > 0)
    .sort((a, b) => (a.table?.number ?? 0) - (b.table?.number ?? 0));
}

/* ——— Reportes ——— */

/** Cobrado en el periodo por forma de pago. */
export function paymentsByMethod(payments: readonly Payment[], period: Period) {
  const byMethod = emptyByMethod();
  let count = 0;
  for (const p of payments) {
    if (!inPeriod(p.at, period)) continue;
    byMethod[p.method] += p.amount;
    count += 1;
  }
  const total = PAYMENT_METHODS.reduce((s, m) => s + byMethod[m], 0);
  return { byMethod, total, count };
}

export interface WaiterSales {
  waiterId: string;
  name: string;
  sales: number;
  rounds: number;
  visits: number;
  /** Rondas que el propio personal tomó o editó después de confirmar. */
  edits: number;
}

/** Ventas por mesero (el dueño de la mesa), con rondas entregadas en el periodo. */
export function salesByWaiter(
  orders: readonly Order[],
  waiters: readonly Waiter[],
  period: Period,
): WaiterSales[] {
  return waiters
    .map((w) => {
      const own = orders.filter(
        (o) =>
          o.status === "entregado" &&
          inPeriod(o.deliveredAt, period) &&
          w.tableIds.includes(o.tableId),
      );
      return {
        waiterId: w.id,
        name: w.name,
        sales: own.reduce((s, o) => s + orderTotal(o), 0),
        rounds: own.length,
        visits: new Set(own.map((o) => o.sessionId)).size,
        edits: own.reduce((s, o) => s + (o.changes?.length ?? 0), 0),
      };
    })
    .sort((a, b) => b.sales - a.sales);
}

export interface ChangeRow {
  at: string;
  tableNumber: number | null;
  round: number;
  by: string;
  kind: string;
  dishName: string;
  detail: string;
  reason: string;
}

/** Registro de cambios y anulaciones del personal en el periodo, del más reciente al más viejo. */
export function changeRows(
  orders: readonly Order[],
  tables: readonly Table[],
  period: Period,
): ChangeRow[] {
  return orders
    .flatMap((o) =>
      (o.changes ?? [])
        .filter((c) => inPeriod(c.at, period))
        .map((c) => ({
          at: c.at,
          tableNumber: tables.find((t) => t.id === o.tableId)?.number ?? null,
          round: o.round,
          by: c.by,
          kind: c.kind,
          dishName: c.dishName,
          detail: c.detail,
          reason: c.reason ?? "",
        })),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Sesiones cerradas en el periodo con algo por cobrar: dinero que no quedó registrado. */
export function unpaidSessions(
  sessions: readonly TableSession[],
  orders: readonly Order[],
  payments: readonly Payment[],
  tables: readonly Table[],
  period: Period,
) {
  return sessions
    .filter((s) => s.closedAt && inPeriod(s.closedAt, period))
    .map((s) => ({
      session: s,
      table: tables.find((t) => t.id === s.tableId),
      ...sessionBalance(orders, payments, s.id),
    }))
    .filter((x) => x.pending > 0)
    .sort((a, b) => b.session.closedAt!.localeCompare(a.session.closedAt!));
}

/* ——— CSV ——— */

/** CSV listo para Excel en español: separador ";" y comillas donde haga falta. */
export function toCsv(rows: readonly (readonly (string | number | null)[])[]): string {
  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(";")).join("\r\n");
}
