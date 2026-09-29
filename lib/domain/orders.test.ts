import { describe, expect, it } from "vitest";
import { DISHES } from "@/lib/data/catalog";
import { addToCart, countByDiner, removeCartItem, updateCartItem } from "./cart";
import { submitRound } from "./orders";
import { consolidateTicket, describeAdjustment } from "./ticket";
import type { Order, TableSession } from "./types";

const NOW = "2026-09-28T12:30:00.000Z";
const diners = [
  { id: "ana", alias: "Ana", deviceId: "da", restrictions: [] },
  { id: "luis", alias: "Luis", deviceId: "dl", restrictions: [] },
];

function sessionWithCart(): TableSession {
  let cart = addToCart(
    [],
    { dishId: "clasica-27", variantId: "doble", qty: 2, dinerId: "ana" },
    "c1",
  );
  cart = addToCart(cart, { dishId: "gaseosa", variantId: "400ml", qty: 1, dinerId: "luis" }, "c2");
  return { id: "s1", tableId: "mesa-3", openedAt: NOW, diners, cart };
}

describe("carrito compartido", () => {
  it("solo el dueño cambia cantidad o variante", () => {
    const { cart } = sessionWithCart();
    const ok = updateCartItem(cart, "c1", "ana", { qty: 3, variantId: "sencilla" });
    expect(ok.ok && ok.cart.find((c) => c.id === "c1")).toMatchObject({
      qty: 3,
      variantId: "sencilla",
    });
    expect(updateCartItem(cart, "c1", "luis", { qty: 1 })).toEqual({
      ok: false,
      error: "Solo puedes cambiar lo que agregaste tú",
    });
    expect(updateCartItem(cart, "c1", "ana", { qty: 0 }).ok).toBe(false);
    expect(updateCartItem(cart, "nada", "ana", { qty: 1 }).ok).toBe(false);
  });

  it("solo el dueño elimina sus ítems", () => {
    const { cart } = sessionWithCart();
    expect(removeCartItem(cart, "c2", "ana").ok).toBe(false);
    const r = removeCartItem(cart, "c2", "luis");
    expect(r.ok && r.cart.map((c) => c.id)).toEqual(["c1"]);
  });

  it("resume cuántos platos agregó cada uno", () => {
    expect(countByDiner(sessionWithCart().cart, diners)).toEqual([
      { dinerId: "ana", alias: "Ana", count: 2 },
      { dinerId: "luis", alias: "Luis", count: 1 },
    ]);
  });
});

describe("envío de la ronda", () => {
  it("crea una ronda pendiente con precios congelados y vacía el carrito", () => {
    const session = sessionWithCart();
    const r = submitRound({
      session,
      orders: [],
      dishes: DISHES,
      dinerId: "luis",
      expectedItemIds: ["c1", "c2"],
      now: NOW,
      orderId: "o1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order).toMatchObject({
      round: 1,
      status: "pendiente",
      sentByDinerId: "luis",
      tableId: "mesa-3",
    });
    expect(r.order.items.map((i) => [i.dishId, i.unitPrice, i.qty])).toEqual([
      ["clasica-27", 29900, 2],
      ["gaseosa", 5500, 1],
    ]);
    expect(r.session.cart).toEqual([]);
  });

  it("un segundo envío con el carrito ya enviado no crea otra ronda", () => {
    const session = sessionWithCart();
    const first = submitRound({
      session,
      orders: [],
      dishes: DISHES,
      dinerId: "luis",
      expectedItemIds: ["c1", "c2"],
      now: NOW,
      orderId: "o1",
    });
    if (!first.ok) throw new Error();
    const second = submitRound({
      session: first.session,
      orders: [first.order],
      dishes: DISHES,
      dinerId: "ana",
      expectedItemIds: ["c1", "c2"],
      now: NOW,
      orderId: "o2",
    });
    expect(second).toEqual({ ok: false, error: "Alguien de la mesa ya envió el pedido" });
  });

  it("si el carrito cambió desde la confirmación, pide revisarlo", () => {
    const r = submitRound({
      session: sessionWithCart(),
      orders: [],
      dishes: DISHES,
      dinerId: "ana",
      expectedItemIds: ["c1"],
      now: NOW,
      orderId: "o1",
    });
    expect(r).toEqual({ ok: false, error: "El carrito cambió. Revísalo antes de enviar." });
  });

  it("no envía un carrito vacío ni con platos desactivados", () => {
    const empty = { ...sessionWithCart(), cart: [] };
    expect(
      submitRound({
        session: empty,
        orders: [],
        dishes: DISHES,
        dinerId: "ana",
        expectedItemIds: [],
        now: NOW,
        orderId: "o",
      }),
    ).toEqual({ ok: false, error: "El carrito está vacío" });
    const off = DISHES.map((d) => (d.id === "gaseosa" ? { ...d, active: false } : d));
    const r = submitRound({
      session: sessionWithCart(),
      orders: [],
      dishes: off,
      dinerId: "ana",
      expectedItemIds: ["c1", "c2"],
      now: NOW,
      orderId: "o",
    });
    expect(r.ok).toBe(false);
  });

  it("lo que se agrega después va en una nueva ronda", () => {
    const session = sessionWithCart();
    const first = submitRound({
      session,
      orders: [],
      dishes: DISHES,
      dinerId: "ana",
      expectedItemIds: ["c1", "c2"],
      now: NOW,
      orderId: "o1",
    });
    if (!first.ok) throw new Error();
    const cart = addToCart(
      [],
      { dishId: "brownie-con-helado", variantId: "unica", qty: 1, dinerId: "luis" },
      "c3",
    );
    const second = submitRound({
      session: { ...first.session, cart },
      orders: [first.order],
      dishes: DISHES,
      dinerId: "luis",
      expectedItemIds: ["c3"],
      now: NOW,
      orderId: "o2",
    });
    expect(second.ok && second.order.round).toBe(2);
  });
});

describe("ticket de la mesa", () => {
  const orders: Order[] = [
    {
      id: "o1",
      sessionId: "s1",
      tableId: "mesa-3",
      round: 1,
      status: "confirmado",
      createdAt: NOW,
      items: [
        {
          id: "a",
          dishId: "clasica-27",
          variantId: "doble",
          qty: 2,
          dinerId: "luis",
          unitPrice: 29900,
        },
        { id: "b", dishId: "gaseosa", variantId: "400ml", qty: 1, dinerId: "ana", unitPrice: 5500 },
        {
          id: "c",
          dishId: "aros-de-cebolla",
          variantId: "unica",
          qty: 1,
          dinerId: "ana",
          unitPrice: 8900,
          removed: true,
          adjustReason: "Agotado",
        },
      ],
    },
    {
      id: "o2",
      sessionId: "s1",
      tableId: "mesa-3",
      round: 2,
      status: "rechazado",
      rejectReason: "Cocina cerrada",
      createdAt: NOW,
      items: [
        {
          id: "d",
          dishId: "brownie-con-helado",
          variantId: "unica",
          qty: 1,
          dinerId: "ana",
          unitPrice: 12900,
        },
      ],
    },
    {
      id: "o3",
      sessionId: "s1",
      tableId: "mesa-3",
      round: 3,
      status: "pendiente",
      createdAt: NOW,
      items: [
        {
          id: "e",
          dishId: "limonada-de-coco",
          variantId: "unica",
          qty: 2,
          dinerId: "ana",
          unitPrice: 9900,
        },
      ],
    },
    {
      id: "otra",
      sessionId: "s2",
      tableId: "mesa-1",
      round: 1,
      status: "pendiente",
      createdAt: NOW,
      items: [],
    },
  ];
  const ticket = consolidateTicket({ sessionId: "s1", orders, dishes: DISHES, diners });

  it("incluye solo las rondas de la sesión, en orden", () => {
    expect(ticket.rounds.map((r) => r.round)).toEqual([1, 2, 3]);
  });

  it("agrupa por comensal en el orden de llegada a la mesa", () => {
    expect(ticket.rounds[0]!.groups.map((g) => [g.alias, g.subtotal])).toEqual([
      ["Ana", 5500],
      ["Luis", 59800],
    ]);
  });

  it("los ítems quitados no suman y quedan como ajustes con motivo", () => {
    expect(ticket.rounds[0]!.subtotal).toBe(65300);
    expect(ticket.rounds[0]!.itemCount).toBe(3);
    expect(ticket.rounds[0]!.adjustments.map((l) => l.item.adjustReason)).toEqual(["Agotado"]);
  });

  it("las rondas rechazadas no suman al total", () => {
    expect(ticket.rounds[1]!.subtotal).toBe(0);
    expect(ticket.total).toBe(65300 + 19800);
    expect(ticket.itemCount).toBe(5);
  });
});

describe("aviso de ajustes al cliente", () => {
  const clasica = DISHES.find((d) => d.id === "clasica-27")!;
  const base = {
    id: "x",
    dishId: "clasica-27",
    variantId: "doble",
    qty: 1,
    dinerId: "ana",
    unitPrice: 29900,
  };
  const line = (item: typeof base & Record<string, unknown>) => ({
    item,
    dish: clasica,
    variant: clasica.variants.find((v) => v.id === item.variantId),
  });
  it("describe quitar, cantidad y variante", () => {
    expect(describeAdjustment(line({ ...base, removed: true, adjustReason: "Agotado" }))).toBe(
      "El mesero quitó Clásica 27",
    );
    expect(
      describeAdjustment(line({ ...base, adjustedFrom: { qty: 2, variantId: "doble" } })),
    ).toBe("El mesero cambió Clásica 27 de 2 a 1");
    expect(
      describeAdjustment(line({ ...base, adjustedFrom: { qty: 1, variantId: "sencilla" } })),
    ).toBe("El mesero cambió Clásica 27 de Sencilla a Doble");
    expect(
      describeAdjustment(line({ ...base, adjustedFrom: { qty: 2, variantId: "sencilla" } })),
    ).toBe("El mesero cambió Clásica 27: 2× Sencilla → 1× Doble");
  });
});
