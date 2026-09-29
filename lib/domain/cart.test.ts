import { describe, expect, it } from "vitest";
import { DISHES } from "@/lib/data/catalog";
import { addToCart, cartCount, cartTotal } from "./cart";

describe("carrito", () => {
  it("agrega líneas y suma la cantidad cuando es la misma línea del mismo comensal", () => {
    let cart = addToCart(
      [],
      { dishId: "clasica-27", variantId: "doble", qty: 1, dinerId: "ana" },
      "1",
    );
    cart = addToCart(
      cart,
      { dishId: "clasica-27", variantId: "doble", qty: 2, dinerId: "ana", note: "  " },
      "2",
    );
    expect(cart).toHaveLength(1);
    expect(cart[0]!.qty).toBe(3);
    expect(cart[0]!.note).toBeUndefined();
  });

  it("separa por comensal, variante y nota", () => {
    let cart = addToCart(
      [],
      { dishId: "clasica-27", variantId: "doble", qty: 1, dinerId: "ana" },
      "1",
    );
    cart = addToCart(
      cart,
      { dishId: "clasica-27", variantId: "doble", qty: 1, dinerId: "luis" },
      "2",
    );
    cart = addToCart(
      cart,
      { dishId: "clasica-27", variantId: "sencilla", qty: 1, dinerId: "ana" },
      "3",
    );
    cart = addToCart(
      cart,
      { dishId: "clasica-27", variantId: "doble", qty: 1, dinerId: "ana", note: "Sin cebolla" },
      "4",
    );
    expect(cart).toHaveLength(4);
  });

  it("calcula cantidad y total con el precio de la variante", () => {
    const cart = [
      { id: "1", dishId: "clasica-27", variantId: "doble", qty: 2, dinerId: "ana" },
      { id: "2", dishId: "gaseosa", variantId: "400ml", qty: 1, dinerId: "luis" },
    ];
    expect(cartCount(cart)).toBe(3);
    expect(cartTotal(cart, DISHES)).toBe(29900 * 2 + 5500);
  });
});
