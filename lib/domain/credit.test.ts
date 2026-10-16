import { describe, expect, it } from "vitest";
import { paymentsByMethod, sessionBalance, shiftTotals } from "./cash";
import {
  accountBalance,
  accountStatement,
  buildAccount,
  creditSummary,
  registerCourtesy,
  registerCredit,
  registerRepayment,
  validateAccount,
} from "./credit";
import { sessionsPaidInFull } from "./tableAccess";
import type {
  CashShift,
  CreditAccount,
  CreditPayment,
  Order,
  Payment,
  TableSession,
} from "./types";

const T0 = Date.parse("2026-10-20T15:00:00.000Z");
const iso = (min: number) => new Date(T0 + min * 60_000).toISOString();
const period = { from: T0 - 86_400_000, to: T0 + 86_400_000 };

const shift: CashShift = { id: "t1", openedAt: iso(0), openedBy: "Julián", openingFloat: 100_000 };
const session: TableSession = {
  id: "s1",
  tableId: "mesa-3",
  openedAt: iso(0),
  diners: [],
  cart: [],
};
const orders: Order[] = [
  {
    id: "o1",
    sessionId: "s1",
    tableId: "mesa-3",
    round: 1,
    status: "entregado",
    createdAt: iso(1),
    items: [{ id: "i", dishId: "d", variantId: "v", qty: 2, dinerId: "x", unitPrice: 20_000 }],
  },
];
const maria = (over: Partial<CreditAccount> = {}): CreditAccount => ({
  id: "c1",
  name: "María Pérez",
  kind: "empleado",
  active: true,
  createdAt: iso(0),
  ...over,
});
const base = {
  shift,
  session,
  orders,
  payments: [] as Payment[],
  now: iso(5),
  id: "p1",
  by: "Julián",
};

describe("personas con cuenta", () => {
  it("pide el nombre completo y no repite personas (sin distinguir tildes)", () => {
    expect(validateAccount({ name: "Ma", kind: "empleado" }, []).name).toBeTruthy();
    expect(validateAccount({ name: "María Pérez", kind: "empleado" }, [])).toEqual({});
    expect(validateAccount({ name: "maria perez", kind: "empleado" }, [maria()]).name).toMatch(
      /Ya hay/,
    );
    expect(validateAccount({ name: "María Pérez", kind: "empleado" }, [maria()], "c1")).toEqual({});
  });

  it("valida cédula, celular y tope solo si se escriben", () => {
    const ok = { name: "Pedro Gómez", kind: "cliente" as const };
    expect(validateAccount({ ...ok, document: "1.020.304-5", phone: "300 123 4567" }, [])).toEqual(
      {},
    );
    expect(validateAccount({ ...ok, document: "12ab" }, []).document).toBeTruthy();
    expect(validateAccount({ ...ok, phone: "12345" }, []).phone).toBeTruthy();
    expect(validateAccount({ ...ok, limit: "abc" }, []).limit).toBeTruthy();
    expect(validateAccount({ ...ok, limit: "" }, [])).toEqual({});
  });

  it("arma la cuenta con datos limpios", () => {
    const a = buildAccount(
      {
        name: "  Pedro   Gómez ",
        kind: "cliente",
        document: "1.020.304-5",
        phone: "300 123 4567",
        limit: "200.000",
      },
      { id: "c9", now: iso(0) },
    );
    expect(a).toMatchObject({
      name: "Pedro Gómez",
      document: "102030 45".replace(" ", ""),
      phone: "3001234567",
      limit: 200_000,
      active: true,
    });
  });
});

describe("cerrar la cuenta a crédito", () => {
  it("queda a nombre de la persona, con quién autorizó, y baja el saldo de la mesa", () => {
    const r = registerCredit({ ...base, account: maria(), creditPayments: [], amount: 40_000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      kind: "credito",
      accountId: "c1",
      authorizedBy: "Julián",
      amount: 40_000,
      shiftId: "t1",
    });
    expect(sessionBalance(orders, [r.value], "s1").pending).toBe(0);
  });

  it("permite repartir: una parte paga y el resto a crédito", () => {
    const cash: Payment = {
      id: "x",
      sessionId: "s1",
      tableId: "mesa-3",
      shiftId: "t1",
      amount: 15_000,
      method: "efectivo",
      at: iso(2),
      by: "Julián",
    };
    const r = registerCredit({
      ...base,
      payments: [cash],
      account: maria(),
      creditPayments: [],
      amount: 25_000,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(sessionBalance(orders, [cash, r.value], "s1").pending).toBe(0);
  });

  it("exige caja abierta, una persona activa y un valor que no pase lo que falta", () => {
    const common = {
      ...base,
      account: maria(),
      creditPayments: [] as CreditPayment[],
      amount: 10_000,
    };
    expect(registerCredit({ ...common, shift: undefined }).ok).toBe(false);
    expect(registerCredit({ ...common, account: undefined }).ok).toBe(false);
    expect(registerCredit({ ...common, account: maria({ active: false }) }).ok).toBe(false);
    expect(registerCredit({ ...common, amount: 40_001 }).ok).toBe(false);
    expect(registerCredit({ ...common, amount: 0 }).ok).toBe(false);
  });

  it("respeta el tope de la persona", () => {
    const account = maria({ limit: 50_000 });
    const before: Payment = {
      id: "viejo",
      sessionId: "otra",
      tableId: "mesa-1",
      amount: 30_000,
      method: "otro",
      at: iso(1),
      by: "J",
      kind: "credito",
      accountId: "c1",
    };
    const r = registerCredit({
      ...base,
      account,
      payments: [before],
      creditPayments: [],
      amount: 25_000,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Pasa el tope/);
    expect(
      registerCredit({ ...base, account, payments: [before], creditPayments: [], amount: 20_000 })
        .ok,
    ).toBe(true);
  });
});

describe("cortesía", () => {
  it("se registra con motivo, sin deuda, y cierra el saldo de la mesa", () => {
    const r = registerCourtesy({ ...base, reason: "Dueño o familia", amount: 40_000 });
    expect(r.ok && r.value).toMatchObject({
      kind: "cortesia",
      reason: "Dueño o familia",
      authorizedBy: "Julián",
    });
    if (r.ok) expect(accountBalance("c1", [r.value], [])).toBe(0);
  });

  it("exige un motivo de la lista", () => {
    expect(registerCourtesy({ ...base, reason: "porque sí", amount: 1_000 }).ok).toBe(false);
  });
});

describe("el crédito y la cortesía no son dinero cobrado", () => {
  const credit = registerCredit({ ...base, account: maria(), creditPayments: [], amount: 30_000 });
  const courtesy = registerCourtesy({ ...base, id: "p2", reason: "Otro", amount: 10_000 });
  const cash: Payment = {
    id: "c",
    sessionId: "s9",
    tableId: "mesa-1",
    shiftId: "t1",
    amount: 25_000,
    method: "efectivo",
    at: iso(3),
    by: "Julián",
  };
  if (!credit.ok || !courtesy.ok) throw new Error("falló");
  const payments = [cash, credit.value, courtesy.value];

  it("el turno solo cuenta lo que entró a la caja", () => {
    const t = shiftTotals(shift, payments);
    expect(t.total).toBe(25_000);
    expect(t.expectedCash).toBe(125_000);
    expect(paymentsByMethod(payments, period).total).toBe(25_000);
  });

  it("los abonos en efectivo sí entran al turno; el descuento de nómina no", () => {
    const abonos: CreditPayment[] = [
      {
        id: "a1",
        accountId: "c1",
        amount: 10_000,
        method: "efectivo",
        at: iso(9),
        by: "J",
        shiftId: "t1",
      },
      { id: "a2", accountId: "c1", amount: 5_000, method: "nomina", at: iso(9), by: "J" },
    ];
    expect(shiftTotals(shift, payments, abonos).expectedCash).toBe(135_000);
    expect(paymentsByMethod(payments, period, abonos).total).toBe(35_000);
    expect(accountBalance("c1", payments, abonos)).toBe(15_000);
  });

  it("la mesa se libera sola cuando todo está cerrado, aunque nadie haya pagado en efectivo", () => {
    expect(sessionsPaidInFull({ sessions: [session], orders, payments })).toEqual(["s1"]);
  });
});

describe("abonos y estado de cuenta", () => {
  const debt: Payment = {
    id: "d",
    sessionId: "s1",
    tableId: "mesa-3",
    amount: 30_000,
    method: "otro",
    at: iso(5),
    by: "Julián",
    kind: "credito",
    accountId: "c1",
    authorizedBy: "Julián",
  };
  const common = { account: maria(), shift, debt: 30_000, now: iso(60), id: "a", by: "Julián" };

  it("valida el abono", () => {
    expect(registerRepayment({ ...common, amount: 10_000, method: "efectivo" }).ok).toBe(true);
    expect(registerRepayment({ ...common, amount: 31_000, method: "efectivo" }).ok).toBe(false);
    expect(registerRepayment({ ...common, debt: 0, amount: 1_000, method: "efectivo" }).ok).toBe(
      false,
    );
    expect(
      registerRepayment({ ...common, shift: undefined, amount: 1_000, method: "tarjeta" }).ok,
    ).toBe(false);
  });

  it("el descuento de nómina no necesita la caja abierta", () => {
    const r = registerRepayment({ ...common, shift: undefined, amount: 30_000, method: "nomina" });
    expect(r.ok && r.value.shiftId).toBeUndefined();
  });

  it("arma el estado de cuenta, lo más reciente primero", () => {
    const abono: CreditPayment = {
      id: "a",
      accountId: "c1",
      amount: 10_000,
      method: "nomina",
      at: iso(60),
      by: "Julián",
    };
    const rows = accountStatement("c1", [debt], [abono], () => "Mesa 3");
    expect(rows.map((r) => [r.kind, r.label, r.amount])).toEqual([
      ["abono", "Descuento de nómina", 10_000],
      ["cargo", "Mesa 3", 30_000],
    ]);
    expect(rows[1]!.authorizedBy).toBe("Julián");
  });

  it("resume créditos, abonos, cortesías y lo que se debe hoy", () => {
    const cortesia: Payment = {
      ...debt,
      id: "k",
      kind: "cortesia",
      accountId: undefined,
      amount: 8_000,
    };
    const abono: CreditPayment = {
      id: "a",
      accountId: "c1",
      amount: 10_000,
      method: "nomina",
      at: iso(60),
      by: "J",
    };
    expect(creditSummary([maria()], [debt, cortesia], [abono], period)).toEqual({
      credited: 30_000,
      repaid: 10_000,
      courtesies: 8_000,
      courtesyCount: 1,
      outstanding: 20_000,
      debtors: 1,
    });
  });
});
