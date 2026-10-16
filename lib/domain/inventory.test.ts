import { describe, expect, it } from "vitest";
import {
  addItem,
  availableUnits,
  emptyItemDraft,
  filterMoves,
  isDishSoldOut,
  isSoldOut,
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
import type { Dish, InventoryItem, Order } from "./types";

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
    expect(isSoldOut([gaseosa], "clasica-27", "sencilla")).toBe(false);
    expect(isSoldOut([{ ...gaseosa, qty: 0 }], "gaseosa", "400ml")).toBe(true);
    expect(isSoldOut([{ ...gaseosa, qty: 0 }], "gaseosa", "1-5l")).toBe(false);
  });

  it("el vínculo sin variante vale para todas las opciones", () => {
    const all = { ...gaseosa, qty: 0, link: { dishId: "gaseosa" } };
    expect(isSoldOut([all], "gaseosa", "1-5l")).toBe(true);
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
    expect(isDishSoldOut([a], dish)).toBe(false);
    expect(isDishSoldOut([a, b], dish)).toBe(true);
  });

  it("calcula cuántas unidades quedan por pedir", () => {
    expect(availableUnits([gaseosa], "gaseosa", "400ml")).toBe(10);
    expect(availableUnits([gaseosa], "clasica-27", "sencilla")).toBeUndefined();
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
