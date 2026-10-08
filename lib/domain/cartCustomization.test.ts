import { describe, expect, it } from "vitest";
import { DISHES } from "@/lib/data/catalog";
import { customizationSpecFor } from "@/lib/data/customization-specs";
import { setLang } from "@/lib/i18n";
import { addToCart, cartTotal, itemUnitPrice, updateCartItem } from "./cart";
import {
  customizationOf,
  describeCustomization,
  EMPTY_CUSTOMIZATION,
  setUnits,
  toCartCustomization,
  toggleRemoved,
} from "./customization";
import { submitRound } from "./orders";
import { adjustOrderItem } from "./waiter";
import type { TableSession } from "./types";

const spec = customizationSpecFor("clasica-27")!;
const dish = DISHES.find((d) => d.id === "clasica-27")!;
const sinCebolla = toggleRemoved(spec, EMPTY_CUSTOMIZATION, "cebolla", "sencilla");
const conExtra = setUnits(spec, sinCebolla, "queso", 2, "sencilla");

describe("personalización en el carrito", () => {
  it("un plato como viene en la carta no guarda nada", () => {
    expect(toCartCustomization(spec, EMPTY_CUSTOMIZATION, "sencilla")).toBeUndefined();
  });

  it("congela precio, líneas de cocina y alérgenos", () => {
    const c = toCartCustomization(spec, conExtra, "sencilla")!;
    expect(c.kitchen).toEqual(["EXTRA Queso cheddar", "SIN Cebolla caramelizada"]);
    expect(c.priceDelta).toBeGreaterThan(0);
    expect(c.allergens).toContain("lacteos");
    expect(customizationOf(c)).toEqual({ counts: conExtra.counts, replaced: {} });
  });

  it("el precio de la línea suma lo que cambió y el total lo refleja", () => {
    const custom = toCartCustomization(spec, conExtra, "sencilla")!;
    const item = { dishId: dish.id, variantId: "sencilla", qty: 2, dinerId: "ana", custom };
    const base = dish.variants.find((v) => v.id === "sencilla")!.price;
    expect(itemUnitPrice(item, dish)).toBe(base + custom.priceDelta);
    const cart = addToCart([], item, "1");
    expect(cartTotal(cart, DISHES)).toBe((base + custom.priceDelta) * 2);
  });

  it("no junta líneas con distinta personalización", () => {
    const custom = toCartCustomization(spec, sinCebolla, "sencilla")!;
    const base = { dishId: dish.id, variantId: "sencilla", qty: 1, dinerId: "ana" };
    let cart = addToCart([], base, "1");
    cart = addToCart(cart, { ...base, custom }, "2");
    cart = addToCart(cart, { ...base, custom }, "3");
    expect(cart.map((c) => c.qty)).toEqual([1, 2]);
  });

  it("no deja cambiar la opción de un plato personalizado, pero sí la cantidad", () => {
    const custom = toCartCustomization(spec, sinCebolla, "sencilla")!;
    const cart = addToCart(
      [],
      { dishId: dish.id, variantId: "sencilla", qty: 1, dinerId: "ana", custom },
      "1",
    );
    expect(updateCartItem(cart, "1", "ana", { variantId: "doble" }).ok).toBe(false);
    expect(updateCartItem(cart, "1", "ana", { qty: 3 }).ok).toBe(true);
  });

  it("al enviar la ronda queda congelado el precio con la personalización", () => {
    const custom = toCartCustomization(spec, conExtra, "sencilla")!;
    const session: TableSession = {
      id: "s1",
      tableId: "mesa-3",
      openedAt: "2026-09-28T12:00:00.000Z",
      diners: [{ id: "ana", alias: "Ana", deviceId: "d", joinedAt: "x", restrictions: [] }],
      cart: [{ id: "i1", dishId: dish.id, variantId: "sencilla", qty: 1, dinerId: "ana", custom }],
    };
    const r = submitRound({
      session,
      orders: [],
      dishes: DISHES,
      dinerId: "ana",
      expectedItemIds: ["i1"],
      now: "2026-09-28T12:05:00.000Z",
      orderId: "o1",
    });
    if (!r.ok) throw new Error(r.error);
    const base = dish.variants.find((v) => v.id === "sencilla")!.price;
    expect(r.order.items[0]).toMatchObject({ unitPrice: base + custom.priceDelta, custom });
  });

  it("el mesero no cambia la opción de un plato personalizado", () => {
    const custom = toCartCustomization(spec, sinCebolla, "sencilla")!;
    const order = {
      id: "o1",
      sessionId: "s1",
      tableId: "mesa-3",
      round: 1,
      status: "pendiente" as const,
      createdAt: "x",
      items: [
        {
          id: "i1",
          dishId: dish.id,
          variantId: "sencilla",
          qty: 1,
          dinerId: "ana",
          unitPrice: 1,
          custom,
        },
      ],
    };
    const r = adjustOrderItem(order, "i1", { type: "variante", variantId: "doble" }, "Otro", dish);
    expect(r.ok).toBe(false);
  });
});

describe("texto para el cliente", () => {
  const custom = toCartCustomization(spec, conExtra, "sencilla")!;
  it("en español resume las líneas de cocina", () => {
    expect(describeCustomization(custom)).toBe("Extra Queso cheddar · Sin Cebolla caramelizada");
    expect(describeCustomization(undefined)).toBe("");
  });
  it("en inglés traduce el verbo y el ingrediente", () => {
    setLang("en");
    expect(describeCustomization(custom)).toBe("Extra Cheddar cheese · Without Caramelized onion");
    setLang("es");
  });
});
