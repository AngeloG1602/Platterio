import { describe, expect, it } from "vitest";
import { CATEGORIES, DISHES } from "@/lib/data/catalog";
import {
  countRefinements,
  EMPTY_FILTERS,
  filterDishes,
  groupByCategory,
  isFiltering,
  normalizeText,
  priceRange,
} from "./menu";

const ids = (filters: Partial<typeof EMPTY_FILTERS>) =>
  filterDishes(DISHES, { ...EMPTY_FILTERS, ...filters }).map((d) => d.id);

describe("filtros del menú", () => {
  it("sin filtros devuelve todos los activos", () => {
    expect(ids({})).toHaveLength(22);
    const withInactive = DISHES.map((d) => (d.id === "gaseosa" ? { ...d, active: false } : d));
    expect(filterDishes(withInactive, EMPTY_FILTERS).some((d) => d.id === "gaseosa")).toBe(false);
  });

  it("busca por nombre o ingrediente, sin importar tildes ni mayúsculas", () => {
    expect(normalizeText("  Lácteos ")).toBe("lacteos");
    expect(ids({ query: "clasica" })).toEqual(["clasica-27"]);
    expect(ids({ query: "JALAPEÑOS" })).toEqual(["la-diabla"]);
    expect(ids({ query: "tocineta" })).toEqual(
      expect.arrayContaining(["brasa-bbq", "perro-suizo", "papas-cheddar-tocineta"]),
    );
    expect(ids({ query: "pan brioche" })).toEqual(["clasica-27", "la-diabla"]);
    expect(ids({ query: "pizza" })).toEqual([]);
  });

  it("combina categoría, alérgenos excluidos y picante", () => {
    expect(ids({ categoryId: "hamburguesas", withoutAllergens: ["lacteos"] })).toEqual([
      "pollo-crispy",
      "veggie-de-garbanzo",
    ]);
    expect(
      ids({ categoryId: "hamburguesas", withoutAllergens: ["lacteos"], spiceLevels: [0] }),
    ).toEqual(["veggie-de-garbanzo"]);
    expect(ids({ spiceLevels: [2, 3] })).toEqual(["la-diabla", "alitas-picantes"]);
    expect(
      ids({ withoutAllergens: ["gluten", "lacteos", "huevo"], categoryId: "bebidas" }),
    ).toEqual(["limonada-de-coco", "jugo-natural", "gaseosa"]);
  });

  it("cuenta filtros y detecta si hay alguno", () => {
    expect(isFiltering(EMPTY_FILTERS)).toBe(false);
    expect(isFiltering({ ...EMPTY_FILTERS, query: "  " })).toBe(false);
    expect(isFiltering({ ...EMPTY_FILTERS, categoryId: "postres" })).toBe(true);
    expect(
      countRefinements({ ...EMPTY_FILTERS, withoutAllergens: ["gluten"], spiceLevels: [0, 1] }),
    ).toBe(3);
  });

  it("agrupa por categoría en el orden de la carta", () => {
    const groups = groupByCategory(
      filterDishes(DISHES, { ...EMPTY_FILTERS, spiceLevels: [3] }),
      CATEGORIES,
    );
    expect(groups.map((g) => g.category.id)).toEqual(["hamburguesas"]);
    const all = groupByCategory([], CATEGORIES, { keepEmpty: true });
    expect(all.map((g) => g.category.id)[0]).toBe("desayunos");
    expect(all.every((g) => g.dishes.length === 0)).toBe(true);
  });

  it("calcula el rango de precios", () => {
    expect(priceRange(DISHES.find((d) => d.id === "clasica-27")!)).toEqual({
      min: 22900,
      max: 29900,
    });
  });
});
