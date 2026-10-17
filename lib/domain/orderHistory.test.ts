import { describe, expect, it } from "vitest";
import {
  filterRecords,
  inHoursRange,
  matchesTime,
  orderRecords,
  recordsCsvRows,
  summarizeRecords,
  validateHoursRange,
  weekdayOf,
  workload,
} from "./orderHistory";
import type { CreditAccount, Dish, Order, Payment, Table, TableSession, Waiter } from "./types";

// Fechas en hora local (los filtros por hora y día usan la hora local de quien mira).
// 2026-10-19 es lunes; 2026-10-24 es sábado.
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).toISOString();
const NOW = new Date(2026, 9, 19, 15, 0).getTime();

const tables: Table[] = [
  { id: "mesa-1", number: 1 },
  { id: "mesa-4", number: 4 },
];
const waiters: Waiter[] = [
  { id: "carlos", name: "Carlos", tableIds: ["mesa-1"] },
  { id: "daniela", name: "Daniela", tableIds: ["mesa-4"] },
];
const dishes = [{ id: "clasica-27", name: "Clásica 27" }] as Dish[];
const sessions: TableSession[] = [
  { id: "s1", tableId: "mesa-1", openedAt: at(19, 14), diners: [], cart: [] },
  { id: "s4", tableId: "mesa-4", openedAt: at(19, 14), diners: [], cart: [] },
];
const order = (
  id: string,
  sessionId: string,
  tableId: string,
  createdAt: string,
  over: Partial<Order> = {},
): Order => ({
  id,
  sessionId,
  tableId,
  round: 1,
  status: "entregado",
  createdAt,
  deliveredAt: createdAt,
  items: [
    { id: `${id}i`, dishId: "clasica-27", variantId: "v", qty: 2, dinerId: "x", unitPrice: 10_000 },
  ],
  ...over,
});
const pay = (sessionId: string, amount: number, over: Partial<Payment> = {}): Payment => ({
  id: `p-${sessionId}-${amount}`,
  sessionId,
  tableId: "mesa-1",
  amount,
  method: "efectivo",
  at: at(19, 15),
  by: "Julián",
  ...over,
});
const accounts: CreditAccount[] = [
  { id: "c1", name: "María Pérez", kind: "empleado", active: true, createdAt: at(1, 8) },
];

const orders = [
  order("a", "s1", "mesa-1", at(19, 14, 5)), // lunes 2:05 p. m.
  order("b", "s4", "mesa-4", at(19, 14, 55)), // lunes 2:55 p. m.
  order("c", "s1", "mesa-1", at(19, 14, 52), { round: 2, status: "rechazado" }),
  order("d", "s4", "mesa-4", at(24, 19, 30), { round: 2 }), // sábado 7:30 p. m.
];
const payments = [
  pay("s1", 20_000, { method: "tarjeta" }),
  pay("s4", 40_000, { kind: "credito", accountId: "c1" }),
];
const records = orderRecords({ orders, sessions, payments, tables, waiters, dishes, accounts });
const find = (id: string) => records.find((r) => r.order.id === id)!;

describe("filtros de tiempo", () => {
  it("últimos N minutos hasta ahora", () => {
    const f = { recentMin: 10 };
    expect(matchesTime(at(19, 14, 55), f, NOW)).toBe(true);
    expect(matchesTime(at(19, 14, 49), f, NOW)).toBe(false);
    expect(matchesTime(at(19, 15, 1), f, NOW)).toBe(false); // del futuro: no
    expect(matchesTime(at(19, 14, 5), { recentMin: 60 }, NOW)).toBe(true);
  });

  it("los últimos minutos mandan sobre el periodo", () => {
    const period = { from: new Date(2026, 9, 1).getTime(), to: NOW };
    expect(matchesTime(at(19, 14, 49), { recentMin: 10, period }, NOW)).toBe(false);
  });

  it("rango de horas: el fin no entra y puede pasar la medianoche", () => {
    const r = { from: "14:00", to: "15:00" };
    expect(inHoursRange(14 * 60, r)).toBe(true);
    expect(inHoursRange(14 * 60 + 59, r)).toBe(true);
    expect(inHoursRange(15 * 60, r)).toBe(false);
    const noche = { from: "22:00", to: "02:00" };
    expect(inHoursRange(23 * 60, noche)).toBe(true);
    expect(inHoursRange(60, noche)).toBe(true);
    expect(inHoursRange(12 * 60, noche)).toBe(false);
  });

  it("días de la semana y varias franjas combinadas (lunes a viernes a las 2, 5 y 7 p. m.)", () => {
    const f = {
      weekdays: [0, 1, 2, 3, 4],
      hours: [
        { from: "14:00", to: "15:00" },
        { from: "17:00", to: "18:00" },
        { from: "19:00", to: "20:00" },
      ],
    };
    expect(matchesTime(at(19, 14, 30), f, NOW)).toBe(true); // lunes 2:30
    expect(matchesTime(at(19, 16, 0), f, NOW)).toBe(false); // lunes 4:00
    expect(matchesTime(at(24, 19, 30), f, NOW)).toBe(false); // sábado 7:30
    expect(weekdayOf(new Date(2026, 9, 19))).toBe(0);
    expect(weekdayOf(new Date(2026, 9, 25))).toBe(6);
  });

  it("valida las franjas", () => {
    expect(validateHoursRange({ from: "14:00", to: "15:30" })).toBeNull();
    expect(validateHoursRange({ from: "2pm", to: "15:30" })).toBeTruthy();
    expect(validateHoursRange({ from: "14:00", to: "14:00" })).toBeTruthy();
  });
});

describe("filas del historial", () => {
  it("cada ronda trae su lugar, número, mesero, platos y total", () => {
    expect(find("a")).toMatchObject({
      place: "Mesa 1",
      number: "M1-R1",
      waiter: "Carlos",
      total: 20_000,
    });
    expect(find("a").itemsText).toBe("2× Clásica 27");
    expect(find("d")).toMatchObject({ number: "M4-R2", waiter: "Daniela" });
  });

  it("etiqueta la cuenta: cobrada, a crédito (con la persona) y rechazada sin cuenta", () => {
    expect(find("a").tags).toEqual(["Cobrado"]);
    expect(find("a").methods).toEqual(["tarjeta"]);
    expect(find("b").tags).toEqual(["Crédito"]);
    expect(find("b").people).toEqual(["María Pérez"]);
    expect(find("c").tags).toEqual([]);
    expect(find("c").statusLabel).toBe("Rechazado");
  });

  it("marca por cobrar lo que aún debe", () => {
    const rec = orderRecords({ orders, sessions, payments: [], tables, waiters, dishes, accounts });
    expect(rec.find((r) => r.order.id === "a")!.tags).toEqual(["Por cobrar"]);
    expect(rec.find((r) => r.order.id === "a")!.pending).toBe(20_000);
  });
});

describe("filtrar el historial", () => {
  const ids = (rows: { order: Order }[]) => rows.map((r) => r.order.id);

  it("va de lo más reciente a lo más antiguo", () => {
    expect(ids(filterRecords(records, {}, NOW))).toEqual(["d", "b", "c", "a"]);
  });

  it("por mesa, mesero, estado y forma de pago", () => {
    expect(ids(filterRecords(records, { tableId: "mesa-4" }, NOW))).toEqual(["d", "b"]);
    expect(ids(filterRecords(records, { waiter: "Carlos" }, NOW))).toEqual(["c", "a"]);
    expect(ids(filterRecords(records, { status: "rechazado" }, NOW))).toEqual(["c"]);
    expect(ids(filterRecords(records, { pay: "tarjeta" }, NOW))).toEqual(["a"]);
    expect(ids(filterRecords(records, { pay: "credito" }, NOW))).toEqual(["d", "b"]);
  });

  it("busca por número, platos y persona, sin tildes", () => {
    expect(ids(filterRecords(records, { text: "m4-r2" }, NOW))).toEqual(["d"]);
    expect(ids(filterRecords(records, { text: "clasica" }, NOW))).toHaveLength(4);
    expect(ids(filterRecords(records, { text: "maria perez" }, NOW))).toEqual(["d", "b"]);
  });

  it("combina todo con el filtro de tiempo (la última hora de un mesero)", () => {
    expect(
      ids(filterRecords(records, { waiter: "Daniela", time: { recentMin: 60 } }, NOW)),
    ).toEqual(["b"]);
    expect(
      ids(
        filterRecords(
          records,
          { time: { hours: [{ from: "14:00", to: "15:00" }], weekdays: [0] } },
          NOW,
        ),
      ),
    ).toEqual(["b", "c", "a"]);
  });

  it("resume lo vendido, rechazado y en curso", () => {
    const rows = filterRecords(records, {}, NOW);
    expect(summarizeRecords(rows)).toEqual({
      orders: 4,
      sold: 3,
      soldTotal: 60_000,
      rejected: 1,
      inProgress: 0,
    });
  });

  it("arma el CSV con encabezado", () => {
    const csv = recordsCsvRows(filterRecords(records, {}, NOW));
    expect(csv).toHaveLength(5);
    expect(csv[0]).toContain("Pedido");
    expect(csv[1]![2]).toBe("M4-R2");
  });
});

describe("carga de trabajo", () => {
  const period = { from: new Date(2026, 9, 1).getTime(), to: NOW + 7 * 86_400_000 };

  it("cuenta los pedidos por día de la semana y hora, sin los rechazados", () => {
    const w = workload(records, period, "pedidos");
    expect(w.cells[0]![14]).toBe(2); // lunes 2 p. m.: a y b
    expect(w.cells[5]![19]).toBe(1); // sábado 7 p. m.: d
    expect(w.total).toBe(3);
    expect(w.byHour[14]).toBe(2);
    expect(w.byWeekday[0]).toBe(2);
    expect(w.peaks[0]).toEqual({ weekday: 0, hour: 14, value: 2 });
  });

  it("las ventas suman el valor de lo entregado", () => {
    const w = workload(records, period, "ventas");
    expect(w.cells[0]![14]).toBe(40_000);
    expect(w.max).toBe(40_000);
  });

  it("solo cuenta lo que cae dentro del periodo", () => {
    const w = workload(records, { from: NOW - 3_600_000, to: NOW }, "pedidos");
    expect(w.total).toBe(2);
  });
});
