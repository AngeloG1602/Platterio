import { describe, expect, it } from "vitest";
import { DISHES, WAITERS } from "@/lib/data/catalog";
import { rateDishes, ratableDishes, rateService } from "./feedback";
import type { Order, OrderStatus, TableSession } from "./types";

const NOW = "2026-09-28T13:00:00.000Z";
let n = 0;
const newId = (p = "id") => `${p}-${++n}`;
const session: TableSession = {
  id: "s1",
  tableId: "mesa-5",
  openedAt: NOW,
  cart: [],
  diners: [
    { id: "ana", alias: "Ana", deviceId: "a", restrictions: [] },
    { id: "luis", alias: "Luis", deviceId: "l", restrictions: [] },
  ],
};
const order = (id: string, status: OrderStatus, items: Array<[string, string]>): Order => ({
  id,
  sessionId: "s1",
  tableId: "mesa-5",
  round: 1,
  status,
  createdAt: NOW,
  items: items.map(([dishId, dinerId], i) => ({
    id: `${id}-${i}`,
    dishId,
    variantId: DISHES.find((d) => d.id === dishId)!.variants[0]!.id,
    qty: 1,
    dinerId,
    unitPrice: 1,
  })),
});
const orders = [
  order("o1", "entregado", [
    ["clasica-27", "ana"],
    ["gaseosa", "luis"],
    ["clasica-27", "luis"],
  ]),
  order("o2", "listo", [["brownie-con-helado", "ana"]]),
];

describe("platos por calificar", () => {
  it("solo incluye rondas entregadas, sin repetir, con lo mío primero", () => {
    const list = ratableDishes({ session, orders, dishes: DISHES, ratings: [], dinerId: "luis" });
    expect(list.map((r) => [r.dish.id, r.mine])).toEqual([
      ["clasica-27", true],
      ["gaseosa", true],
    ]);
    const ana = ratableDishes({ session, orders, dishes: DISHES, ratings: [], dinerId: "ana" });
    expect(ana.map((r) => r.dish.id)).toEqual(["clasica-27", "gaseosa"]);
    expect(ana.find((r) => r.dish.id === "gaseosa")?.mine).toBe(false);
  });

  it("si el comensal no pidió nada, puede calificar lo de la mesa", () => {
    const list = ratableDishes({ session, orders, dishes: DISHES, ratings: [], dinerId: "otro" });
    expect(list).toHaveLength(2);
  });
});

describe("calificar platos", () => {
  const ratable = ratableDishes({ session, orders, dishes: DISHES, ratings: [], dinerId: "ana" });

  it("crea calificaciones con estrellas y comentario opcional", () => {
    const r = rateDishes({
      drafts: [
        { orderId: "o1", dishId: "clasica-27", stars: 5, comment: "  Buenísima " },
        { orderId: "o1", dishId: "gaseosa", stars: 0 },
      ],
      ratable,
      dinerId: "ana",
      now: NOW,
      newId,
    });
    expect(r.ok && r.ratings.map((x) => [x.dishId, x.stars, x.comment])).toEqual([
      ["clasica-27", 5, "Buenísima"],
    ]);
  });

  it("las estrellas son obligatorias si hay comentario", () => {
    const r = rateDishes({
      drafts: [{ orderId: "o1", dishId: "gaseosa", stars: 0, comment: "Fría" }],
      ratable,
      dinerId: "ana",
      now: NOW,
      newId,
    });
    expect(r.ok).toBe(false);
  });

  it("no califica platos que no se entregaron ni repite los ya calificados", () => {
    expect(
      rateDishes({
        drafts: [{ orderId: "o2", dishId: "brownie-con-helado", stars: 5 }],
        ratable,
        dinerId: "ana",
        now: NOW,
        newId,
      }).ok,
    ).toBe(false);
    const again = ratableDishes({
      session,
      orders,
      dishes: DISHES,
      ratings: [
        { id: "x", dishId: "clasica-27", orderId: "o1", stars: 4, createdAt: NOW, dinerId: "ana" },
      ],
      dinerId: "ana",
    });
    const r = rateDishes({
      drafts: [{ orderId: "o1", dishId: "clasica-27", stars: 1 }],
      ratable: again,
      dinerId: "ana",
      now: NOW,
      newId,
    });
    expect(r.ok && r.ratings).toEqual([]);
  });
});

describe("calificar el servicio", () => {
  const base = {
    session,
    orders,
    existing: [],
    waiters: WAITERS,
    threshold: 3,
    dinerId: "ana",
    now: NOW,
    newId,
  };

  it("se asocia al mesero de la mesa y no alerta con buena nota", () => {
    const r = rateService({ ...base, stars: 4 });
    expect(r.ok && r.rating).toMatchObject({ waiterId: "daniela", stars: 4, sessionId: "s1" });
    expect(r.ok && r.alert).toBeUndefined();
  });

  it("por debajo del umbral genera la alerta de servicio bajo", () => {
    const r = rateService({ ...base, stars: 2 });
    expect(r.ok && r.alert).toMatchObject({
      type: "servicio_bajo",
      tableId: "mesa-5",
      waiterId: "daniela",
      stars: 2,
      resolved: false,
    });
    expect(
      rateService({ ...base, stars: 3 }).ok && rateService({ ...base, stars: 3 }),
    ).not.toHaveProperty("alert");
  });

  it("una sola vez por visita y solo con algo entregado", () => {
    const first = rateService({ ...base, stars: 5 });
    if (!first.ok) throw new Error();
    expect(rateService({ ...base, stars: 1, existing: [first.rating] })).toEqual({
      ok: false,
      error: "El servicio de esta visita ya fue calificado",
    });
    expect(rateService({ ...base, stars: 5, orders: [orders[1]!] }).ok).toBe(false);
    expect(rateService({ ...base, stars: 0 }).ok).toBe(false);
  });
});
