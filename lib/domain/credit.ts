import { inPeriod, type Period } from "./analytics";
import { METHOD_LABEL, PAYMENT_METHODS, sessionBalance, type CashResult } from "./cash";
import { formatMoney } from "./format";
import type {
  CashShift,
  CreditAccount,
  CreditKind,
  CreditPayment,
  Order,
  Payment,
  PaymentMethod,
  TableSession,
} from "./types";

/**
 * Crédito y cortesías. Una cuenta se puede cerrar sin que entre dinero a la caja si alguien con
 * permiso lo autoriza: a **crédito** (queda a nombre de una persona de la lista y se cobra después)
 * o como **cortesía** (no se cobra; es un gasto). Los dos quedan guardados como un `Payment` con
 * `kind`, así el saldo de la mesa baja y la mesa se cierra igual que si hubiera pagado, pero no
 * cuentan como dinero cobrado (ver `isCashPayment`).
 */

const fail = (error: string) => ({ ok: false as const, error });

export const CREDIT_KINDS: readonly CreditKind[] = ["empleado", "familia", "cliente"];
export const CREDIT_KIND_LABEL: Record<CreditKind, string> = {
  empleado: "Empleado",
  familia: "Dueño o familia",
  cliente: "Cliente especial",
};

export const COURTESY_REASONS = [
  "Dueño o familia",
  "Atención al cliente",
  "Error del servicio",
  "Otro",
] as const;
export type CourtesyReason = (typeof COURTESY_REASONS)[number];

/** Forma de pago de un abono: las de caja y el descuento de nómina (que no mueve la caja). */
export type RepaymentMethod = PaymentMethod | "nomina";
export const REPAYMENT_METHODS: readonly RepaymentMethod[] = [...PAYMENT_METHODS, "nomina"];
export const REPAYMENT_LABEL: Record<RepaymentMethod, string> = {
  ...METHOD_LABEL,
  nomina: "Descuento de nómina",
};

/* ——— Qué cuenta como dinero cobrado ——— */

export const isCredit = (p: Payment) => p.kind === "credito";
export const isCourtesy = (p: Payment) => p.kind === "cortesia";

/* ——— Personas con cuenta ——— */

export interface AccountDraft {
  name: string;
  kind: CreditKind;
  document?: string;
  phone?: string;
  /** Tope en pesos, como texto del formulario; vacío = sin tope. */
  limit?: string;
}
export type AccountErrors = Partial<Record<"name" | "document" | "phone" | "limit", string>>;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function validateAccount(
  draft: AccountDraft,
  existing: readonly CreditAccount[],
  editingId?: string,
): AccountErrors {
  const errors: AccountErrors = {};
  const name = draft.name.trim().replace(/\s+/g, " ");
  if (name.length < 3) errors.name = "Escribe el nombre completo";
  else if (existing.some((a) => a.id !== editingId && fold(a.name) === fold(name)))
    errors.name = "Ya hay una persona con ese nombre";
  const doc = draft.document?.replace(/[.\s-]/g, "") ?? "";
  if (doc && !/^\d{5,15}$/.test(doc)) errors.document = "La cédula o el NIT son solo números";
  const phone = draft.phone?.replace(/\s/g, "") ?? "";
  if (phone && !/^3\d{9}$/.test(phone))
    errors.phone = "El celular tiene 10 dígitos y empieza por 3";
  const limit = draft.limit?.replace(/\D/g, "") ?? "";
  if (draft.limit?.trim() && (!limit || Number(limit) <= 0))
    errors.limit = "Escribe el tope en pesos o déjalo vacío";
  return errors;
}

export function buildAccount(
  draft: AccountDraft,
  params: { id: string; now: string },
): CreditAccount {
  const document = draft.document?.replace(/[.\s-]/g, "");
  const phone = draft.phone?.replace(/\s/g, "");
  const limit = draft.limit?.replace(/\D/g, "");
  return {
    id: params.id,
    name: draft.name.trim().replace(/\s+/g, " "),
    kind: draft.kind,
    ...(document ? { document } : {}),
    ...(phone ? { phone } : {}),
    ...(limit ? { limit: Number(limit) } : {}),
    active: true,
    createdAt: params.now,
  };
}

/* ——— Deuda ——— */

/** Lo que debe la persona: todo lo cargado a su crédito menos lo que ha abonado. */
export function accountBalance(
  accountId: string,
  payments: readonly Payment[],
  creditPayments: readonly CreditPayment[],
): number {
  const charged = payments
    .filter((p) => isCredit(p) && p.accountId === accountId)
    .reduce((s, p) => s + p.amount, 0);
  const repaid = creditPayments
    .filter((c) => c.accountId === accountId)
    .reduce((s, c) => s + c.amount, 0);
  return Math.max(0, charged - repaid);
}

export interface StatementRow {
  at: string;
  kind: "cargo" | "abono";
  /** "Mesa 3", "Domicilio D-XXXX" o la forma del abono. */
  label: string;
  amount: number;
  by: string;
  authorizedBy?: string;
}

/** Movimientos de la cuenta de una persona, del más reciente al más viejo. */
export function accountStatement(
  accountId: string,
  payments: readonly Payment[],
  creditPayments: readonly CreditPayment[],
  placeOf: (p: Payment) => string,
): StatementRow[] {
  const charges: StatementRow[] = payments
    .filter((p) => isCredit(p) && p.accountId === accountId)
    .map((p) => ({
      at: p.at,
      kind: "cargo" as const,
      label: placeOf(p),
      amount: p.amount,
      by: p.by,
      ...(p.authorizedBy ? { authorizedBy: p.authorizedBy } : {}),
    }));
  const repayments: StatementRow[] = creditPayments
    .filter((c) => c.accountId === accountId)
    .map((c) => ({
      at: c.at,
      kind: "abono" as const,
      label: REPAYMENT_LABEL[c.method],
      amount: c.amount,
      by: c.by,
    }));
  return [...charges, ...repayments].sort((a, b) => b.at.localeCompare(a.at));
}

/* ——— Registrar crédito y cortesía ——— */

interface Settle {
  shift: CashShift | undefined;
  session: TableSession;
  orders: readonly Order[];
  payments: readonly Payment[];
  amount: number;
  now: string;
  id: string;
  /** Quien lo registra y lo autoriza (encargado o administrador). */
  by: string;
}

function checkSettle(p: Settle): CashResult<number> {
  if (!p.shift) return fail("Abre la caja antes de cerrar una cuenta a crédito o cortesía");
  if (!Number.isInteger(p.amount) || p.amount <= 0) return fail("Escribe el valor, en pesos");
  const { pending } = sessionBalance(p.orders, p.payments, p.session.id, p.session.delivery?.fee);
  if (pending === 0) return fail("Esta cuenta ya está saldada");
  if (p.amount > pending) return fail("Es más de lo que falta por cobrar");
  return { ok: true, value: pending };
}

/** Cierra (todo o parte de) la cuenta a crédito a nombre de una persona autorizada. */
export function registerCredit(
  params: Settle & {
    account: CreditAccount | undefined;
    creditPayments: readonly CreditPayment[];
  },
): CashResult<Payment> {
  const { account } = params;
  if (!account) return fail("Elige a la persona a cuyo nombre queda el crédito");
  if (!account.active) return fail(`${account.name} está desactivada`);
  const checked = checkSettle(params);
  if (!checked.ok) return checked;
  if (account.limit !== undefined) {
    const debt = accountBalance(account.id, params.payments, params.creditPayments);
    if (debt + params.amount > account.limit)
      return fail(
        `Pasa el tope de ${account.name}: debe ${formatMoney(debt)} de ${formatMoney(account.limit)}`,
      );
  }
  return {
    ok: true,
    value: {
      id: params.id,
      sessionId: params.session.id,
      tableId: params.session.tableId,
      shiftId: params.shift!.id,
      amount: params.amount,
      method: "otro",
      at: params.now,
      by: params.by,
      kind: "credito",
      accountId: account.id,
      authorizedBy: params.by,
    },
  };
}

/** Cierra (todo o parte de) la cuenta como cortesía: no se cobra y queda como gasto. */
export function registerCourtesy(
  params: Settle & { reason: string; account?: CreditAccount },
): CashResult<Payment> {
  if (!COURTESY_REASONS.includes(params.reason as CourtesyReason))
    return fail("Elige el motivo de la cortesía");
  const checked = checkSettle(params);
  if (!checked.ok) return checked;
  return {
    ok: true,
    value: {
      id: params.id,
      sessionId: params.session.id,
      tableId: params.session.tableId,
      shiftId: params.shift!.id,
      amount: params.amount,
      method: "otro",
      at: params.now,
      by: params.by,
      kind: "cortesia",
      reason: params.reason,
      authorizedBy: params.by,
      ...(params.account ? { accountId: params.account.id } : {}),
    },
  };
}

/** Abono a la deuda de una persona. El descuento de nómina no necesita la caja abierta. */
export function registerRepayment(params: {
  account: CreditAccount | undefined;
  shift: CashShift | undefined;
  debt: number;
  amount: number;
  method: RepaymentMethod;
  now: string;
  id: string;
  by: string;
}): CashResult<CreditPayment> {
  const { account, amount, method } = params;
  if (!account) return fail("No encontramos a esa persona");
  if (!REPAYMENT_METHODS.includes(method)) return fail("Elige cómo paga");
  if (!Number.isInteger(amount) || amount <= 0) return fail("Escribe cuánto abona, en pesos");
  if (params.debt === 0) return fail(`${account.name} no debe nada`);
  if (amount > params.debt) return fail("Es más de lo que debe");
  if (method !== "nomina" && !params.shift) return fail("Abre la caja antes de recibir el abono");
  return {
    ok: true,
    value: {
      id: params.id,
      accountId: account.id,
      amount,
      method,
      at: params.now,
      by: params.by,
      ...(method !== "nomina" ? { shiftId: params.shift!.id } : {}),
    },
  };
}

/* ——— Resumen para los reportes ——— */

export interface CreditSummary {
  /** Crédito otorgado en el periodo. */
  credited: number;
  /** Abonos recibidos en el periodo (todas las formas). */
  repaid: number;
  /** Cortesías del periodo: un gasto, no una venta cobrada. */
  courtesies: number;
  courtesyCount: number;
  /** Lo que se debe hoy, sumando a todas las personas (no depende del periodo). */
  outstanding: number;
  debtors: number;
}

export function creditSummary(
  accounts: readonly CreditAccount[],
  payments: readonly Payment[],
  creditPayments: readonly CreditPayment[],
  period: Period,
): CreditSummary {
  const debts = accounts.map((a) => accountBalance(a.id, payments, creditPayments));
  return {
    credited: payments
      .filter((p) => isCredit(p) && inPeriod(p.at, period))
      .reduce((s, p) => s + p.amount, 0),
    repaid: creditPayments.filter((c) => inPeriod(c.at, period)).reduce((s, c) => s + c.amount, 0),
    courtesies: payments
      .filter((p) => isCourtesy(p) && inPeriod(p.at, period))
      .reduce((s, p) => s + p.amount, 0),
    courtesyCount: payments.filter((p) => isCourtesy(p) && inPeriod(p.at, period)).length,
    outstanding: debts.reduce((s, d) => s + d, 0),
    debtors: debts.filter((d) => d > 0).length,
  };
}
