import { describe, expect, it } from "vitest";
import { syncOrderStock } from "./inventory";
import {
  addPreparation,
  batchesPossible,
  emptyPreparationDraft,
  produce,
  productionNeeds,
  removePreparation,
  updatePreparation,
  validatePreparation,
  type PrepState,
} from "./preparations";
import type { InventoryItem, Order, Recipe } from "./types";

const NOW = "2026-10-01T12:00:00.000Z";
const item = (id: string, name: string, qty: number, unit = "kg"): InventoryItem => ({
  id,
  name,
  unit,
  qty,
  threshold: 1,
  createdAt: NOW,
});
const start = (): PrepState => ({
  items: [item("pasta", "Pasta", 5), item("carne", "Carne", 6)],
  moves: [],
  preparations: [],
});
const draft = (over = {}) => ({
  ...emptyPreparationDraft(),
  name: "Lasaña",
  dishId: "lasana",
  yield: "12",
  lines: [
    { itemId: "pasta", qty: "2" },
    { itemId: "carne", qty: "3" },
  ],
  ...over,
});
const made = (): PrepState => {
  const r = addPreparation(start(), draft(), [], NOW);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe("crear la preparación", () => {
  it("crea la preparación y su producto de porciones vinculado al plato", () => {
    const s = made();
    expect(s.preparations[0]).toMatchObject({
      id: "lasana",
      outputItemId: "lasana-porciones",
      yield: 12,
    });
    expect(s.items.at(-1)).toMatchObject({
      id: "lasana-porciones",
      name: "Lasaña (porciones)",
      qty: 0,
      link: { dishId: "lasana" },
    });
  });

  it("valida nombre, rendimiento, ingredientes y vínculos", () => {
    const s = made();
    const v = (d = {}, recipes: Recipe[] = []) =>
      validatePreparation({ ...draft(d), name: "Sopa" }, s.items, s.preparations, recipes);
    expect(v({ name: "", yield: "0" }).yield).toBeTruthy();
    expect(validatePreparation(draft({ name: " " }), s.items, [], [])).toMatchObject({
      name: expect.any(String),
    });
    expect(validatePreparation(draft(), s.items, s.preparations, [])).toMatchObject({
      name: "Ya hay una preparación con ese nombre",
    });
    expect(v({ lines: [] }).lines).toMatch(/al menos/);
    expect(v({ lines: [{ itemId: "pasta", qty: "0" }] }).lines).toBeTruthy();
    expect(v({ dishId: "lasana" }).dishId).toMatch(/ya está vinculado/);
    expect(
      v({ dishId: "sopa" }, [{ id: "r", dishId: "sopa", lines: [{ itemId: "pasta", qty: 1 }] }])
        .dishId,
    ).toMatch(/receta por venta/);
  });
});

describe("producir un lote", () => {
  it("gasta ingredientes y suma porciones, con movimientos de producción", () => {
    const r = produce(made(), { preparationId: "lasana", batches: 2 }, "Rosa", NOW, "p1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.fromEntries(r.value.items.map((i) => [i.id, i.qty]))).toEqual({
      pasta: 1,
      carne: 0,
      "lasana-porciones": 24,
    });
    expect(r.value.moves.map((m) => [m.kind, m.delta, m.balance, m.reason])).toEqual([
      ["produccion", -4, 1, "Producción: 2 × Lasaña"],
      ["produccion", -6, 0, "Producción: 2 × Lasaña"],
      ["produccion", 24, 24, "Producción: 2 × Lasaña"],
    ]);
  });

  it("todo o nada: si falta un ingrediente no cambia nada", () => {
    const s = made();
    expect(produce(s, { preparationId: "lasana", batches: 3 }, "Rosa", NOW, "p")).toEqual({
      ok: false,
      error: "No alcanza Pasta: quedan 5 y se necesitan 6.",
    });
    expect(batchesPossible(s.preparations[0]!, s.items)).toBe(2);
    expect(productionNeeds(s.preparations[0]!, 3, s.items).map((n) => n.enough)).toEqual([
      false,
      false,
    ]);
  });

  it("pide una cantidad de lotes válida", () => {
    const s = made();
    for (const batches of [0, -1, 1.2345]) {
      expect(produce(s, { preparationId: "lasana", batches }, "R", NOW, "p").ok).toBe(false);
    }
    expect(produce(s, { preparationId: "x", batches: 1 }, "R", NOW, "p").ok).toBe(false);
    expect(produce(s, { preparationId: "lasana", batches: 0.5 }, "R", NOW, "p").ok).toBe(true);
  });
});

describe("vender porciones", () => {
  const order = (qty: number, status: Order["status"] = "en_preparacion"): Order => ({
    id: "o1",
    sessionId: "s",
    tableId: "mesa-1",
    round: 1,
    status,
    createdAt: NOW,
    items: [{ id: "i", dishId: "lasana", variantId: "u", qty, dinerId: "a", unitPrice: 1 }],
  });

  it("cada pedido descuenta porciones, no ingredientes, y se agota al acabarse", () => {
    const produced = produce(made(), { preparationId: "lasana", batches: 1 }, "R", NOW, "p");
    if (!produced.ok) throw new Error();
    const sold = syncOrderStock(produced.value, order(5), "Ana", NOW);
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    const qty = Object.fromEntries(sold.value.items.map((i) => [i.id, i.qty]));
    expect(qty).toEqual({ pasta: 3, carne: 3, "lasana-porciones": 7 });
    const tooMany = syncOrderStock(produced.value, order(13), "Ana", NOW);
    expect(tooMany).toEqual({
      ok: false,
      error: "No alcanza Lasaña (porciones): quedan 12 y se necesitan 13.",
    });
  });

  it("sin producir no hay porciones: el plato está agotado", () => {
    expect(syncOrderStock(made(), order(1), "Ana", NOW)).toEqual({
      ok: false,
      error: "Lasaña (porciones) está agotado.",
    });
  });
});

describe("sub-recetas, edición y baja", () => {
  it("una preparación puede usar las porciones de otra", () => {
    let s = made();
    const salsa = addPreparation(
      s,
      {
        ...emptyPreparationDraft(),
        name: "Salsa",
        unit: "litros",
        yield: "4",
        lines: [{ itemId: "carne", qty: "1" }],
      },
      [],
      NOW,
    );
    if (!salsa.ok) throw new Error();
    s = salsa.value;
    const withSalsa = updatePreparation(
      s,
      "lasana",
      draft({ lines: [{ itemId: "salsa-porciones", qty: "2" }] }),
      [],
    );
    expect(withSalsa.ok).toBe(true);
    if (!withSalsa.ok) return;
    expect(removePreparation(withSalsa.value, "salsa")).toEqual({
      ok: false,
      error: "Lasaña usa esta preparación. Quítala de esa receta primero.",
    });
    // Lo contrario crearía un ciclo.
    const cycle = updatePreparation(
      withSalsa.value,
      "salsa",
      {
        ...emptyPreparationDraft(),
        name: "Salsa",
        unit: "litros",
        lines: [{ itemId: "lasana-porciones", qty: "1" }],
      },
      [],
    );
    expect(cycle).toEqual({ ok: false, error: "Revisa los datos de la preparación" });
  });

  it("al editar se actualiza el producto de salida y al quitar se conservan las existencias", () => {
    const s = made();
    const edited = updatePreparation(
      s,
      "lasana",
      draft({ name: "Lasaña de carne", threshold: "5", dishId: "" }),
      [],
    );
    expect(edited.ok && edited.value.items.at(-1)).toMatchObject({
      name: "Lasaña de carne (porciones)",
      threshold: 5,
    });
    expect(edited.ok && edited.value.items.at(-1)?.link).toBeUndefined();
    const removed = removePreparation(s, "lasana");
    expect(removed.ok && removed.value.preparations).toEqual([]);
    expect(removed.ok && removed.value.items.some((i) => i.id === "lasana-porciones")).toBe(true);
  });
});
