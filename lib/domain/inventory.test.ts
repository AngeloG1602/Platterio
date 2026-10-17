import { describe, expect, it } from "vitest";
import {
  addItem,
  availableUnits,
  emptyItemDraft,
  filterMoves,
  isDishSoldOut,
  isSoldOut,
  limitingItem,
  parseQty,
  recipePortions,
  recipeToDraft,
  saveRecipe,
  soldTodayFn,
  validateRecipe,
  lowStockItems,
  movesCsvRows,
  registerMove,
  stockLevel,
  summarizeMoves,
  syncOrderStock,
  updateItem,
  validateItem,
  type InventoryState,
} from "./inventory";
import type { Dish, InventoryItem, Order, Recipe } from "./types";

const NOW = "2026-10-01T12:00:00.000Z";
const gaseosa: InventoryItem = {
  id: "gas-400",
  name: "Gaseosa 400 ml",
  unit: "botellas",
  qty: 10,
  threshold: 3,
  link: { dishId: "gaseosa", variantId: "400ml" },
  createdAt: NOW,
};
const state = (items: InventoryItem[] = [gaseosa]): InventoryState => ({ items, moves: [] });

const order = (over: Partial<Order> = {}): Order => ({
  id: "o1",
  sessionId: "s1",
  tableId: "mesa-3",
  round: 1,
  status: "en_preparacion",
  createdAt: NOW,
  items: [
    { id: "i1", dishId: "gaseosa", variantId: "400ml", qty: 3, dinerId: "a", unitPrice: 5500 },
    { id: "i2", dishId: "clasica-27", variantId: "sencilla", qty: 1, dinerId: "a", unitPrice: 1 },
  ],
  ...over,
});

describe("existencias y agotado", () => {
  it("clasifica el nivel de stock", () => {
    expect(stockLevel({ ...gaseosa, qty: 0 })).toBe("agotado");
    expect(stockLevel({ ...gaseosa, qty: 3 })).toBe("poco");
    expect(stockLevel(gaseosa)).toBe("bien");
    expect(lowStockItems([gaseosa, { ...gaseosa, id: "x", qty: 1 }])).toHaveLength(1);
  });

  it("un plato sin vínculo nunca se agota; con stock cero sí", () => {
    expect(isSoldOut({ items: [gaseosa] }, "clasica-27", "sencilla")).toBe(false);
    expect(isSoldOut({ items: [{ ...gaseosa, qty: 0 }] }, "gaseosa", "400ml")).toBe(true);
    expect(isSoldOut({ items: [{ ...gaseosa, qty: 0 }] }, "gaseosa", "1-5l")).toBe(false);
  });

  it("el vínculo sin variante vale para todas las opciones", () => {
    const all = { ...gaseosa, qty: 0, link: { dishId: "gaseosa" } };
    expect(isSoldOut({ items: [all] }, "gaseosa", "1-5l")).toBe(true);
  });

  it("el plato se agota cuando todas sus opciones lo están", () => {
    const dish = {
      id: "gaseosa",
      variants: [
        { id: "400ml", name: "a", price: 1 },
        { id: "1-5l", name: "b", price: 2 },
      ],
    } as Dish;
    const a = { ...gaseosa, qty: 0 };
    const b = { ...gaseosa, id: "g2", qty: 0, link: { dishId: "gaseosa", variantId: "1-5l" } };
    expect(isDishSoldOut({ items: [a] }, dish)).toBe(false);
    expect(isDishSoldOut({ items: [a, b] }, dish)).toBe(true);
  });

  it("calcula cuántas unidades quedan por pedir", () => {
    expect(availableUnits({ items: [gaseosa] }, "gaseosa", "400ml")).toBe(10);
    expect(availableUnits({ items: [gaseosa] }, "clasica-27", "sencilla")).toBeUndefined();
  });
});

describe("stock de los pedidos", () => {
  it("descuenta al confirmar y no al estar pendiente", () => {
    const pending = syncOrderStock(state(), order({ status: "pendiente" }), "Carlos", NOW);
    expect(pending.ok && pending.value.items[0]!.qty).toBe(10);
    const r = syncOrderStock(state(), order(), "Carlos", NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.items[0]!.qty).toBe(7);
    expect(r.value.moves).toEqual([
      expect.objectContaining({ kind: "consumo", delta: -3, balance: 7, orderId: "o1" }),
    ]);
  });

  it("repetir la operación no descuenta dos veces", () => {
    const once = syncOrderStock(state(), order(), "Carlos", NOW);
    if (!once.ok) throw new Error();
    const twice = syncOrderStock(once.value, order(), "Carlos", NOW);
    expect(twice.ok && twice.value.items[0]!.qty).toBe(7);
    expect(twice.ok && twice.value.moves).toHaveLength(1);
  });

  it("devuelve el stock si se rechaza, se quita o se reduce un ítem", () => {
    const once = syncOrderStock(state(), order(), "Carlos", NOW);
    if (!once.ok) throw new Error();
    const rejected = syncOrderStock(once.value, order({ status: "rechazado" }), "Carlos", NOW);
    expect(rejected.ok && rejected.value.items[0]!.qty).toBe(10);
    const reduced = syncOrderStock(
      once.value,
      order({ items: [{ ...order().items[0]!, qty: 1 }] }),
      "Carlos",
      NOW,
    );
    expect(reduced.ok && reduced.value.items[0]!.qty).toBe(9);
    const removed = syncOrderStock(
      once.value,
      order({ items: [{ ...order().items[0]!, removed: true }] }),
      "Carlos",
      NOW,
    );
    expect(removed.ok && removed.value.items[0]!.qty).toBe(10);
    expect(removed.ok && removed.value.moves.at(-1)?.kind).toBe("devolucion");
  });

  it("no deja el stock en negativo y no cambia nada si no alcanza", () => {
    const r = syncOrderStock(state([{ ...gaseosa, qty: 2 }]), order(), "Carlos", NOW);
    expect(r).toEqual({
      ok: false,
      error: "No alcanza Gaseosa 400 ml: quedan 2 y se necesitan 3.",
    });
    const zero = syncOrderStock(state([{ ...gaseosa, qty: 0 }]), order(), "Carlos", NOW);
    expect(zero).toEqual({ ok: false, error: "Gaseosa 400 ml está agotado." });
  });

  it("los ids de los movimientos son estables entre pestañas", () => {
    const a = syncOrderStock(state(), order(), "Carlos", NOW);
    const b = syncOrderStock(state(), order(), "Daniela", NOW);
    expect(a.ok && b.ok && a.value.moves[0]!.id === b.value.moves[0]!.id).toBe(true);
  });
});

describe("productos", () => {
  const draft = { ...emptyItemDraft(), name: "Cerveza", unit: "botellas", qty: "24" };

  it("valida nombre, cantidades y vínculos repetidos", () => {
    expect(validateItem({ ...draft, name: " " }, []).name).toBeTruthy();
    expect(validateItem({ ...draft, name: "gaseosa 400 ML" }, [gaseosa]).name).toMatch(/Ya hay/);
    expect(validateItem({ ...draft, qty: "-1" }, []).qty).toBeTruthy();
    expect(validateItem({ ...draft, threshold: "x" }, []).threshold).toBeTruthy();
    expect(
      validateItem({ ...draft, dishId: "gaseosa", variantId: "400ml" }, [gaseosa]).dishId,
    ).toMatch(/ya está vinculado/);
  });

  it("crea el producto con su entrada inicial", () => {
    const r = addItem(state([]), draft, "Marta", NOW, "mov-1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.item).toMatchObject({ id: "cerveza", qty: 24, threshold: 5 });
    expect(r.value.moves[0]!).toMatchObject({ kind: "entrada", delta: 24, balance: 24 });
  });

  it("edita sin tocar las existencias y puede quitar el vínculo", () => {
    const r = updateItem(state(), "gas-400", {
      ...emptyItemDraft(),
      name: "Gaseosa chica",
      unit: "botellas",
      threshold: "6",
    });
    expect(r.ok && r.value.items[0]!).toMatchObject({
      name: "Gaseosa chica",
      qty: 10,
      threshold: 6,
    });
    expect(r.ok && r.value.items[0]!.link).toBeUndefined();
  });
});

describe("movimientos manuales", () => {
  it("entrada suma; salida y ajuste exigen motivo", () => {
    const e = registerMove(
      state(),
      { itemId: "gas-400", kind: "entrada", amount: 5, reason: "" },
      "Ana",
      NOW,
      "m1",
    );
    expect(e.ok && e.value.items[0]!.qty).toBe(15);
    expect(
      registerMove(
        state(),
        { itemId: "gas-400", kind: "salida", amount: 1, reason: " " },
        "Ana",
        NOW,
        "m2",
      ),
    ).toEqual({ ok: false, error: "Indica el motivo" });
  });

  it("la salida no baja de cero", () => {
    expect(
      registerMove(
        state(),
        { itemId: "gas-400", kind: "salida", amount: 11, reason: "Dañado o vencido" },
        "Ana",
        NOW,
        "m",
      ),
    ).toEqual({ ok: false, error: "Solo hay 10 botellas: no se puede sacar más." });
  });

  it("el ajuste guarda la diferencia con lo contado", () => {
    const r = registerMove(
      state(),
      { itemId: "gas-400", kind: "ajuste", amount: 8, reason: "Conteo físico" },
      "Ana",
      NOW,
      "m",
    );
    expect(r.ok && r.value.items[0]!.qty).toBe(8);
    expect(r.ok && r.value.moves[0]!).toMatchObject({ kind: "ajuste", delta: -2, balance: 8 });
    expect(
      registerMove(
        state(),
        { itemId: "gas-400", kind: "ajuste", amount: 10, reason: "x" },
        "Ana",
        NOW,
        "m",
      ).ok,
    ).toBe(false);
  });
});

describe("informe", () => {
  it("filtra, resume y exporta", () => {
    const a = syncOrderStock(state(), order(), "Carlos", "2026-10-01T12:00:00.000Z");
    if (!a.ok) throw new Error();
    const b = registerMove(
      a.value,
      { itemId: "gas-400", kind: "entrada", amount: 6, reason: "Compra a proveedor" },
      "Ana",
      "2026-10-01T13:00:00.000Z",
      "m2",
    );
    if (!b.ok) throw new Error();
    const { moves, items } = b.value;
    expect(filterMoves(moves, {}).map((m) => m.kind)).toEqual(["entrada", "consumo"]);
    expect(filterMoves(moves, { kind: "consumo" })).toHaveLength(1);
    expect(summarizeMoves(moves)).toEqual({ entered: 6, sold: 3, out: 0 });
    expect(movesCsvRows(filterMoves(moves, {}), items)[1]!.slice(1, 4)).toEqual([
      "Gaseosa 400 ml",
      "Entrada",
      "6",
    ]);
  });
});

describe("recetas", () => {
  const carne: InventoryItem = {
    id: "carne",
    name: "Carne",
    unit: "kg",
    qty: 1,
    threshold: 0.5,
    createdAt: NOW,
  };
  const pan: InventoryItem = { ...carne, id: "pan", name: "Pan", unit: "unidades", qty: 10 };
  const receta: Recipe = {
    id: "r1",
    dishId: "clasica-27",
    variantId: "sencilla",
    lines: [
      { itemId: "carne", qty: 0.15 },
      { itemId: "pan", qty: 1 },
    ],
  };
  const clasica = (qty: number, status: Order["status"] = "en_preparacion"): Order => ({
    ...order({ status }),
    items: [
      { id: "i1", dishId: "clasica-27", variantId: "sencilla", qty, dinerId: "a", unitPrice: 1 },
    ],
  });
  const withRecipes = (over: Partial<Recipe> = {}): InventoryState => ({
    items: [carne, pan],
    moves: [],
    recipes: [{ ...receta, ...over }],
  });

  it("calcula cuántos platos salen y qué ingrediente limita", () => {
    expect(recipePortions(receta, [carne, pan])).toBe(6);
    expect(limitingItem(receta, [carne, pan])?.item.name).toBe("Carne");
    expect(
      availableUnits({ items: [carne, pan], recipes: [receta] }, "clasica-27", "sencilla"),
    ).toBe(6);
    expect(
      availableUnits({ items: [carne, pan], recipes: [receta] }, "clasica-27", "doble"),
    ).toBeUndefined();
  });

  it("descuenta decimales sin acumular error y devuelve al rechazar", () => {
    const r = syncOrderStock(withRecipes(), clasica(3), "Ana", NOW);
    expect(r.ok && r.value.items.map((i) => i.qty)).toEqual([0.55, 7]);
    if (!r.ok) throw new Error();
    const back = syncOrderStock(r.value, clasica(3, "rechazado"), "Ana", NOW);
    expect(back.ok && back.value.items.map((i) => i.qty)).toEqual([1, 10]);
  });

  it("falla si falta un ingrediente clave y no cambia nada", () => {
    const r = syncOrderStock(withRecipes(), clasica(7), "Ana", NOW);
    expect(r).toEqual({ ok: false, error: "No alcanza Carne: quedan 1 y se necesitan 1,05." });
  });

  it("el plato se agota cuando falta un ingrediente clave", () => {
    const stock = { items: [{ ...carne, qty: 0.1 }, pan], recipes: [receta] };
    expect(isSoldOut(stock, "clasica-27", "sencilla")).toBe(true);
  });

  it("respeta el tope diario, también al confirmar", () => {
    const rules = withRecipes({ dailyMax: 4 });
    const sold = soldTodayFn([clasica(3)], Date.parse(NOW));
    const stock = { ...rules, sold };
    expect(availableUnits(stock, "clasica-27", "sencilla")).toBe(1);
    const other = { ...clasica(3), id: "o-viejo" };
    const r = syncOrderStock(
      rules,
      { ...clasica(2), id: "o-nuevo" },
      "Ana",
      NOW,
      [other],
      () => "Clásica 27",
    );
    expect(r).toEqual({
      ok: false,
      error: "Hoy solo se pueden vender 4 de Clásica 27. Ya se llegó al tope.",
    });
    const ok = syncOrderStock(rules, { ...clasica(1), id: "o-nuevo" }, "Ana", NOW, [other]);
    expect(ok.ok).toBe(true);
  });

  it("valida y guarda la receta", () => {
    const draft = {
      dishId: "clasica-27",
      variantId: "doble",
      lines: [
        { itemId: "carne", qty: "0,3" },
        { itemId: "pan", qty: "1" },
      ],
      dailyMax: "20",
    };
    expect(validateRecipe(draft, [carne, pan], [receta])).toEqual({});
    expect(
      validateRecipe({ ...draft, variantId: "sencilla" }, [carne, pan], [receta]).dishId,
    ).toMatch(/ya tiene/);
    expect(
      validateRecipe({ ...draft, lines: [{ itemId: "carne", qty: "0" }] }, [carne, pan], []).lines,
    ).toBeTruthy();
    expect(validateRecipe({ ...draft, lines: [] }, [carne, pan], []).lines).toMatch(/al menos/);
    expect(validateRecipe({ ...draft, dailyMax: "-1" }, [carne, pan], []).dailyMax).toBeTruthy();
    expect(saveRecipe([receta], draft, "r2")[1]).toEqual({
      id: "r2",
      dishId: "clasica-27",
      variantId: "doble",
      lines: [
        { itemId: "carne", qty: 0.3 },
        { itemId: "pan", qty: 1 },
      ],
      dailyMax: 20,
    });
    expect(recipeToDraft(receta).lines[0]).toEqual({ itemId: "carne", qty: "0,15" });
  });

  it("acepta cantidades con coma en entradas y salidas", () => {
    expect(parseQty("1,5")).toBe(1.5);
    expect(parseQty("1.25")).toBe(1.25);
    expect(Number.isNaN(parseQty("1,2345"))).toBe(true);
    const r = registerMove(
      { items: [carne], moves: [] },
      { itemId: "carne", kind: "entrada", amount: 2.5, reason: "" },
      "Ana",
      NOW,
      "m",
    );
    expect(r.ok && r.value.items[0]!.qty).toBe(3.5);
  });
});
