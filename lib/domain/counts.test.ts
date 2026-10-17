import { describe, expect, it } from "vitest";
import { dishCosts, unitCost } from "./costing";
import { applyCalibration, applyCount, calibrations, deviations } from "./counts";
import { registerMove, validateItem, emptyItemDraft, updateItem, addItem } from "./inventory";
import type { Dish, InventoryItem, InventoryMove, Preparation, Recipe, StockCount } from "./types";

const NOW = "2026-10-01T12:00:00.000Z";
const at = (h: number) => `2026-10-01T${String(h).padStart(2, "0")}:00:00.000Z`;
const carne: InventoryItem = {
  id: "carne",
  name: "Carne",
  unit: "kg",
  qty: 10,
  threshold: 2,
  cost: 20000,
  createdAt: NOW,
};
const pan: InventoryItem = {
  id: "pan",
  name: "Pan",
  unit: "unidades",
  qty: 30,
  threshold: 5,
  cost: 500,
  createdAt: NOW,
};
const state = { items: [carne, pan], moves: [] as InventoryMove[] };

describe("conteo físico", () => {
  it("guarda lo esperado, lo contado y registra un ajuste por cada diferencia", () => {
    const r = applyCount(
      state,
      [
        { itemId: "carne", counted: 9.4 },
        { itemId: "pan", counted: 30 },
      ],
      { scope: "todo", by: "Rosa", now: NOW, id: "c1" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.state.items.map((i) => i.qty)).toEqual([9.4, 30]);
    expect(r.value.state.moves).toHaveLength(1);
    expect(r.value.state.moves[0]).toMatchObject({
      kind: "ajuste",
      delta: -0.6,
      balance: 9.4,
      reason: "Conteo físico",
    });
    expect(r.value.count.lines[0]).toMatchObject({
      expected: 10,
      counted: 9.4,
      diff: -0.6,
      cost: 20000,
    });
  });

  it("valida y es todo o nada", () => {
    const opts = { scope: "todo" as const, by: "R", now: NOW, id: "c" };
    expect(applyCount(state, [], opts).ok).toBe(false);
    expect(applyCount(state, [{ itemId: "x", counted: 1 }], opts).ok).toBe(false);
    expect(applyCount(state, [{ itemId: "carne", counted: -1 }], opts).ok).toBe(false);
    expect(
      applyCount(
        state,
        [
          { itemId: "carne", counted: 1 },
          { itemId: "carne", counted: 2 },
        ],
        opts,
      ).ok,
    ).toBe(false);
  });

  it("el cierre del día puede dar de baja lo que sobró", () => {
    const r = applyCount(state, [{ itemId: "pan", counted: 12, discard: true }], {
      scope: "cierre",
      by: "R",
      now: NOW,
      id: "c",
    });
    if (!r.ok) throw new Error();
    expect(r.value.state.items[1]!.qty).toBe(0);
    expect(r.value.state.moves.map((m) => [m.kind, m.delta, m.reason])).toEqual([
      ["ajuste", -18, "Cierre del día"],
      ["salida", -12, "Sobró del día"],
    ]);
  });
});

describe("desviaciones y calibración", () => {
  const sale = (h: number, delta: number): InventoryMove => ({
    id: `s${h}`,
    itemId: "carne",
    at: at(h),
    by: "Pedido",
    kind: "consumo",
    delta,
    balance: 0,
    orderId: "o",
  });
  const count = (id: string, h: number, diff: number): StockCount => ({
    id,
    at: at(h),
    by: "R",
    scope: "todo",
    lines: [{ itemId: "carne", name: "Carne", unit: "kg", expected: 5, counted: 5 + diff, diff }],
  });
  const recipe: Recipe = { id: "r", dishId: "d", lines: [{ itemId: "carne", qty: 0.15 }] };
  const moves = [sale(2, -4), sale(5, -4)];

  it("compara lo que faltó con lo que se gastó y valora el faltante", () => {
    const d = deviations([count("a", 3, -0.5), count("b", 6, -0.5)], moves, [carne]);
    expect(d[0]).toMatchObject({ counts: 2, missing: 1, consumed: 8, pct: 0.125, value: 20000 });
  });

  it("propone ajustar recetas solo con dos conteos y desviación sostenida", () => {
    const one = deviations([count("a", 3, -0.5)], moves, [carne]);
    expect(calibrations(one, [recipe], [])).toEqual([]);
    const two = deviations([count("a", 3, -0.5), count("b", 6, -0.5)], moves, [carne]);
    const [c] = calibrations(two, [recipe], []);
    expect(c).toMatchObject({ itemId: "carne", percent: 0.125, recipes: 1 });
    expect(c!.text).toContain("13 % más");
    const small = deviations([count("a", 3, -0.1), count("b", 6, -0.1)], moves, [carne]);
    expect(calibrations(small, [recipe], [])).toEqual([]);
  });

  it("aplica el ajuste a recetas y preparaciones", () => {
    const prep: Preparation = {
      id: "p",
      name: "P",
      outputItemId: "x",
      yield: 5,
      lines: [
        { itemId: "carne", qty: 2 },
        { itemId: "pan", qty: 1 },
      ],
      createdAt: NOW,
    };
    const r = applyCalibration([recipe], [prep], "carne", 0.1);
    expect(r.recipes[0]!.lines[0]!.qty).toBe(0.165);
    expect(r.preparations[0]!.lines.map((l) => l.qty)).toEqual([2.2, 1]);
  });
});

describe("costos", () => {
  const dishes = [
    { id: "burger", name: "Burger", variants: [{ id: "u", name: "Única", price: 20000 }] },
    { id: "otro", name: "Otro", variants: [{ id: "u", name: "Única", price: 10000 }] },
  ] as Dish[];
  const recipes: Recipe[] = [
    {
      id: "r1",
      dishId: "burger",
      lines: [
        { itemId: "carne", qty: 0.15 },
        { itemId: "pan", qty: 1 },
      ],
    },
    { id: "r2", dishId: "otro", lines: [{ itemId: "sin", qty: 1 }] },
  ];
  const sin: InventoryItem = {
    id: "sin",
    name: "Sin costo",
    unit: "u",
    qty: 1,
    threshold: 0,
    createdAt: NOW,
  };

  it("suma lo que gasta la receta y calcula el margen", () => {
    const rows = dishCosts(dishes, { items: [carne, pan, sin], recipes }, []);
    expect(rows[0]).toMatchObject({
      name: "Burger",
      cost: 3500,
      margin: 16500,
      marginPct: 0.825,
      missing: [],
    });
  });

  it("si falta un costo lo marca en lugar de dar una cifra engañosa", () => {
    const rows = dishCosts(dishes, { items: [carne, pan, sin], recipes }, []);
    expect(rows[1]).toMatchObject({ name: "Otro", missing: ["Sin costo"] });
  });

  it("el costo de una porción sale de lo que gasta un lote entre lo que rinde", () => {
    const out: InventoryItem = {
      id: "salsa",
      name: "Salsa",
      unit: "porciones",
      qty: 0,
      threshold: 0,
      createdAt: NOW,
    };
    const prep: Preparation = {
      id: "p",
      name: "Salsa",
      outputItemId: "salsa",
      yield: 10,
      lines: [
        { itemId: "carne", qty: 1 },
        { itemId: "pan", qty: 10 },
      ],
      createdAt: NOW,
    };
    expect(unitCost(out, [carne, pan, out], [prep])).toBe(2500);
  });
});

describe("costo y unidad de compra en los productos", () => {
  it("valida el costo y la unidad de compra", () => {
    const d = { ...emptyItemDraft(), name: "Gaseosa" };
    expect(validateItem({ ...d, cost: "abc" }, []).cost).toBeTruthy();
    expect(validateItem({ ...d, purchaseUnit: "caja" }, []).purchaseFactor).toBeTruthy();
    expect(validateItem({ ...d, purchaseFactor: "24" }, []).purchaseUnit).toBeTruthy();
    expect(
      validateItem({ ...d, cost: "1200", purchaseUnit: "caja", purchaseFactor: "24" }, []),
    ).toEqual({});
  });

  it("guarda y quita el costo y la unidad de compra", () => {
    const d = {
      ...emptyItemDraft(),
      name: "Gaseosa",
      cost: "1.200",
      purchaseUnit: "caja",
      purchaseFactor: "24",
    };
    const added = addItem({ items: [], moves: [] }, { ...d, cost: "1200" }, "A", NOW, "m");
    if (!added.ok) throw new Error();
    expect(added.value.item).toMatchObject({ cost: 1200, purchase: { unit: "caja", factor: 24 } });
    const cleared = updateItem(added.value, added.value.item.id, {
      ...emptyItemDraft(),
      name: "Gaseosa",
    });
    expect(cleared.ok && cleared.value.items[0]!.cost).toBeUndefined();
  });

  it("una entrada con el precio pagado actualiza el costo por unidad", () => {
    const r = registerMove(
      { items: [carne], moves: [] },
      { itemId: "carne", kind: "entrada", amount: 10, reason: "", totalPrice: 250000 },
      "A",
      NOW,
      "m",
    );
    expect(r.ok && r.value.items[0]!.cost).toBe(25000);
  });
});
