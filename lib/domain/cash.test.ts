import { describe, expect, it } from "vitest";
import {
  changeRows,
  closeShift,
  openShift,
  openTablesWithBalance,
  paymentsByMethod,
  registerPayment,
  salesByWaiter,
  sessionBalance,
  shiftTotals,
  toCsv,
  unpaidSessions,
} from "./cash";
import type { CashShift, Order, Payment, Table, TableSession } from "./types";

const session: TableSession = {
  id: "s1",
  tableId: "mesa-3",
  openedAt: "2026-09-28T12:00:00.000Z",
  diners: [],
  cart: [],
};
const item = (id: string, qty: number, unitPrice: number, removed = false) => ({
  id,
  dishId: "d",
  variantId: "v",
  qty,
  unitPrice,
  dinerId: "x",
  removed,
});
const order = (over: Partial<Order> = {}): Order => ({
  id: "o1",
  sessionId: "s1",
  tableId: "mesa-3",
  round: 1,
  status: "entregado",
  createdAt: "2026-09-28T12:05:00.000Z",
  deliveredAt: "2026-09-28T12:30:00.000Z",
  items: [item("i1", 2, 10000), item("i2", 1, 5000, true)],
  ...over,
});
const tables: Table[] = [{ id: "mesa-3", number: 3 }];
const shift: CashShift = {
  id: "t1",
  openedAt: "2026-09-28T11:00:00.000Z",
  openedBy: "Julián",
  openingFloat: 100000,
};
const base = {
  shift,
  session,
  orders: [order()],
  payments: [] as Payment[],
  now: "x",
  id: "p1",
  by: "Julián",
};
const day = { from: Date.parse("2026-09-28T00:00:00Z"), to: Date.parse("2026-09-28T23:59:59Z") };

describe("cuenta de la mesa", () => {
  it("debe lo no rechazado, sin lo quitado, y resta lo pagado", () => {
    const orders = [order(), order({ id: "o2", status: "rechazado" })];
    expect(sessionBalance(orders, [], "s1")).toEqual({ due: 20000, paid: 0, pending: 20000 });
    const pay = { id: "p", sessionId: "s1", amount: 5000 } as Payment;
    expect(sessionBalance(orders, [pay], "s1").pending).toBe(15000);
  });
});

describe("cobrar", () => {
  it("exige caja abierta, monto válido y no pasarse del saldo", () => {
    expect(
      registerPayment({ ...base, shift: undefined, amount: 1000, method: "efectivo" }),
    ).toEqual({
      ok: false,
      error: "Abre la caja antes de cobrar",
    });
    expect(registerPayment({ ...base, amount: 0, method: "efectivo" }).ok).toBe(false);
    expect(registerPayment({ ...base, amount: 20001, method: "efectivo" })).toEqual({
      ok: false,
      error: "Es más de lo que falta por cobrar",
    });
    const ok = registerPayment({ ...base, amount: 8000, method: "tarjeta" });
    expect(ok.ok && ok.value).toMatchObject({ amount: 8000, method: "tarjeta", shiftId: "t1" });
  });

  it("permite pagar en partes y no cobra dos veces", () => {
    const first = registerPayment({ ...base, amount: 12000, method: "efectivo" });
    if (!first.ok) throw new Error();
    const rest = registerPayment({
      ...base,
      payments: [first.value],
      amount: 8000,
      method: "tarjeta",
      id: "p2",
    });
    expect(rest.ok).toBe(true);
    if (!rest.ok) throw new Error();
    expect(
      registerPayment({
        ...base,
        payments: [first.value, rest.value],
        amount: 1,
        method: "efectivo",
      }),
    ).toEqual({ ok: false, error: "Esta cuenta ya está pagada" });
  });
});

describe("turno de caja", () => {
  it("abre con un fondo y solo una caja a la vez", () => {
    const a = openShift([], { openingFloat: 50000, now: "n", id: "t", by: "J" });
    expect(a.ok && a.value.openingFloat).toBe(50000);
    expect(openShift([shift], { openingFloat: 0, now: "n", id: "t", by: "J" })).toEqual({
      ok: false,
      error: "Ya hay una caja abierta",
    });
    expect(openShift([], { openingFloat: -1, now: "n", id: "t", by: "J" }).ok).toBe(false);
  });

  const pays: Payment[] = [
    {
      id: "a",
      sessionId: "s1",
      tableId: "mesa-3",
      shiftId: "t1",
      amount: 12000,
      method: "efectivo",
      at: "x",
      by: "J",
    },
    {
      id: "b",
      sessionId: "s1",
      tableId: "mesa-3",
      shiftId: "t1",
      amount: 8000,
      method: "tarjeta",
      at: "x",
      by: "J",
    },
    {
      id: "c",
      sessionId: "s2",
      tableId: "mesa-3",
      shiftId: "otro",
      amount: 999,
      method: "efectivo",
      at: "x",
      by: "J",
    },
  ];

  it("el efectivo esperado es fondo + pagos en efectivo del turno", () => {
    expect(shiftTotals(shift, pays)).toMatchObject({
      total: 20000,
      expectedCash: 112000,
      payments: 2,
    });
  });

  it("cierra cuadrado sin nota y descuadrado con nota obligatoria", () => {
    const ok = closeShift({ shift, payments: pays, countedCash: 112000, now: "n", by: "J" });
    expect(ok.ok && ok.value.summary?.difference).toBe(0);
    const bad = closeShift({ shift, payments: pays, countedCash: 110000, now: "n", by: "J" });
    expect(bad).toEqual({ ok: false, error: "Hay diferencia: cuéntanos a qué se debe" });
    const noted = closeShift({
      shift,
      payments: pays,
      countedCash: 110000,
      note: "Cambio mal dado",
      now: "n",
      by: "J",
    });
    expect(noted.ok && noted.value.summary?.difference).toBe(-2000);
    expect(
      closeShift({
        shift: { ...shift, closedAt: "x" },
        payments: pays,
        countedCash: 0,
        now: "n",
        by: "J",
      }).ok,
    ).toBe(false);
  });
});

describe("reportes", () => {
  it("separa lo cobrado por forma de pago", () => {
    const pays = [
      { amount: 5000, method: "efectivo", at: "2026-09-28T13:00:00Z" },
      { amount: 7000, method: "tarjeta", at: "2026-09-28T14:00:00Z" },
      { amount: 1, method: "tarjeta", at: "2026-09-20T14:00:00Z" },
    ] as Payment[];
    const r = paymentsByMethod(pays, day);
    expect(r).toMatchObject({ total: 12000, count: 2 });
    expect(r.byMethod.tarjeta).toBe(7000);
  });

  it("ventas por mesero según la mesa que atiende", () => {
    const r = salesByWaiter(
      [order()],
      [
        { id: "c", name: "Carlos", tableIds: ["mesa-3"] },
        { id: "d", name: "Daniela", tableIds: [] },
      ],
      day,
    );
    expect(r[0]).toMatchObject({ name: "Carlos", sales: 20000, visits: 1 });
    expect(r[1]).toMatchObject({ name: "Daniela", sales: 0 });
  });

  it("lista los cambios del personal con mesa y motivo", () => {
    const o = order({
      changes: [
        {
          id: "c",
          at: "2026-09-28T12:40:00.000Z",
          by: "Julián",
          kind: "quitar",
          dishName: "Papas",
          detail: "Quitó 1",
          reason: "Agotado",
        },
      ],
    });
    expect(changeRows([o], tables, day)).toEqual([
      {
        at: "2026-09-28T12:40:00.000Z",
        tableNumber: 3,
        round: 1,
        by: "Julián",
        kind: "quitar",
        dishName: "Papas",
        detail: "Quitó 1",
        reason: "Agotado",
      },
    ]);
  });

  it("detecta mesas cerradas sin cobrar y abiertas con saldo", () => {
    const closed = { ...session, closedAt: "2026-09-28T13:00:00.000Z" };
    expect(unpaidSessions([closed], [order()], [], tables, day)).toHaveLength(1);
    expect(
      unpaidSessions(
        [closed],
        [order()],
        [{ sessionId: "s1", amount: 20000 } as Payment],
        tables,
        day,
      ),
    ).toHaveLength(0);
    expect(openTablesWithBalance([session], [order()], [], tables)[0]!.pending).toBe(20000);
  });
});

describe("CSV", () => {
  it("usa punto y coma y protege comillas y saltos de línea", () => {
    expect(
      toCsv([
        ["a", 'di"jo', "x;y"],
        [1, null, "l1\nl2"],
      ]),
    ).toBe('a;"di""jo";"x;y"\r\n1;;"l1\nl2"');
  });
});
