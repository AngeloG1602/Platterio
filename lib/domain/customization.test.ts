import { describe, expect, it } from "vitest";
import { dishAllergens } from "@/lib/domain/allergens";
import { DISHES } from "@/lib/data/catalog";
import { CUSTOMIZATION_SPECS, customizationSpecFor } from "@/lib/data/customization-specs";
import { buildStack, layerPositions, stackHeight } from "@/lib/viewer3d/stack";
import {
  adaptToRestrictions,
  allergenChanges,
  EMPTY_CUSTOMIZATION,
  kitchenLines,
  priceDelta,
  resolveIngredients,
  resultingAllergens,
  setReplacement,
  setSide,
  setUnits,
  summarize,
  toggleRemoved,
  unitsOf,
  validateCustomization,
} from "./customization";

const clasica = customizationSpecFor("clasica-27")!;
const E = EMPTY_CUSTOMIZATION;

describe("especificaciones de personalización", () => {
  it.each(CUSTOMIZATION_SPECS.map((s) => [s.dishId, s] as const))(
    "%s: sin cambios tiene los alérgenos del catálogo",
    (id, spec) => {
      const dish = DISHES.find((d) => d.id === id)!;
      expect(resultingAllergens({ ...spec, sides: undefined }, E).sort()).toEqual(
        dishAllergens(dish).sort(),
      );
    },
  );

  it("las claves de ranura son únicas", () => {
    for (const spec of CUSTOMIZATION_SPECS) {
      expect(new Set(spec.slots.map((s) => s.key)).size).toBe(spec.slots.length);
    }
  });
});

describe("quitar, extra y adicionales", () => {
  it("quita y vuelve a poner un ingrediente removible", () => {
    const sin = toggleRemoved(clasica, E, "cebolla");
    expect(unitsOf(clasica, sin, "cebolla")).toBe(0);
    expect(kitchenLines(clasica, sin)).toEqual(["SIN Cebolla caramelizada"]);
    expect(toggleRemoved(clasica, sin, "cebolla")).toEqual(E);
  });

  it("no deja quitar lo que no es removible", () => {
    expect(toggleRemoved(clasica, E, "carne")).toBe(E);
    expect(unitsOf(clasica, setUnits(clasica, E, "pan", 0), "pan")).toBe(1);
    expect(validateCustomization(clasica, { counts: { carne: 0 }, replaced: {} })).toEqual([
      "Carne de res 150 g no se puede quitar",
    ]);
  });

  it("cobra extras y adicionales dentro de sus límites", () => {
    let c = setUnits(clasica, E, "queso", 5); // máximo 1 + 2
    expect(unitsOf(clasica, c, "queso")).toBe(3);
    c = setUnits(clasica, c, "tocineta", 1);
    expect(priceDelta(clasica, c)).toBe(2 * 3000 + 3500);
    expect(kitchenLines(clasica, c)).toEqual(["EXTRA Queso cheddar ×2", "AGREGAR Tocineta"]);
    expect(summarize(clasica, c)).toBe("Extra Queso cheddar ×2 · Con Tocineta");
  });

  it("la variante Doble trae dos carnes y el extra se cuenta sobre eso", () => {
    expect(unitsOf(clasica, E, "carne", "doble")).toBe(2);
    const c = setUnits(clasica, E, "carne", 3, "doble");
    expect(priceDelta(clasica, c, "doble")).toBe(7000);
    expect(unitsOf(clasica, setUnits(clasica, E, "carne", 1, "doble"), "carne", "doble")).toBe(2);
  });

  it("quitar no descuenta del precio", () => {
    expect(priceDelta(clasica, toggleRemoved(clasica, E, "tomate"))).toBe(0);
  });
});

describe("reemplazos y acompañante", () => {
  it("reemplaza con diferencia de precio y cambia alérgenos", () => {
    const c = setReplacement(clasica, E, "queso", "queso_vegano");
    expect(priceDelta(clasica, c)).toBe(2500);
    expect(resultingAllergens({ ...clasica, sides: undefined }, c)).toEqual([
      "gluten",
      "lacteos",
      "huevo",
      "soya",
    ]);
    expect(kitchenLines(clasica, c)).toEqual(["CAMBIAR Queso cheddar → Queso vegano"]);
    expect(resolveIngredients(clasica, c).find((i) => i.key === "queso")).toMatchObject({
      name: "Queso vegano",
      state: "reemplazado",
    });
  });

  it("reemplazar algo quitado lo vuelve a poner; quitarlo borra el reemplazo", () => {
    let c = toggleRemoved(clasica, E, "cebolla");
    c = setReplacement(clasica, c, "cebolla", "cebolla_morada");
    expect(unitsOf(clasica, c, "cebolla")).toBe(1);
    c = toggleRemoved(clasica, c, "cebolla");
    expect(c.replaced.cebolla).toBeUndefined();
    expect(setReplacement(clasica, E, "queso", "no-existe")).toBe(E);
    expect(
      setReplacement(clasica, setReplacement(clasica, E, "queso", "provolone"), "queso", null),
    ).toEqual(E);
  });

  it("el extra de un ingrediente reemplazado lleva el nombre nuevo", () => {
    const c = setUnits(clasica, setReplacement(clasica, E, "queso", "provolone"), "queso", 2);
    expect(kitchenLines(clasica, c)).toEqual([
      "CAMBIAR Queso cheddar → Queso provolone",
      "EXTRA Queso provolone",
    ]);
    expect(priceDelta(clasica, c)).toBe(1000 + 3000);
  });

  it("cambia el acompañante con su precio y alérgenos", () => {
    const c = setSide(clasica, E, "papas_cheddar");
    expect(priceDelta(clasica, c)).toBe(4000);
    expect(kitchenLines(clasica, c)).toEqual(["ACOMPAÑANTE Papas con cheddar"]);
    expect(setSide(clasica, c, "papas")).toEqual(E);
    expect(setSide(clasica, E, "pizza")).toBe(E);
  });

  it("valida personalizaciones que llegan de afuera", () => {
    expect(
      validateCustomization(clasica, {
        counts: { queso: 9, nada: 1 },
        replaced: { pan: "baguette" },
        side: "sopa",
      }),
    ).toEqual([
      "Queso cheddar: máximo 3",
      "Ingrediente desconocido: nada",
      "Reemplazo no disponible para Pan brioche",
      "Acompañante no disponible",
    ]);
  });
});

describe("adaptar a mis alergias", () => {
  it("sin lácteos: reemplaza pan y queso por opciones seguras", () => {
    const r = adaptToRestrictions(clasica, E, ["lacteos"]);
    expect(r.changes).toEqual(["Pan brioche → Pan de papa", "Queso cheddar → Queso vegano"]);
    expect(resultingAllergens(clasica, r.customization)).not.toContain("lacteos");
    expect(r.unresolved).toEqual([]);
  });

  it("sin gluten ni huevo: pan envuelto en lechuga, cambia la salsa y el acompañante si hace falta", () => {
    const start = setSide(clasica, E, "aros");
    const r = adaptToRestrictions(clasica, start, ["gluten", "huevo"]);
    const after = resultingAllergens(clasica, r.customization);
    expect(after).not.toContain("gluten");
    expect(after).not.toContain("huevo");
    expect(r.changes).toContain("Pan brioche → Envuelta en lechuga");
    expect(r.changes).toContain("Aros de cebolla → Papas a la francesa");
    const before = resultingAllergens(clasica, start);
    expect(allergenChanges(before, after).removed).toEqual(["Gluten", "Huevo"]);
  });
});

describe("pila de capas para el visor 3D", () => {
  it("pan abajo y arriba, ingredientes en orden, sin lo quitado", () => {
    const stack = buildStack(clasica, toggleRemoved(clasica, E, "tomate"));
    expect(stack.map((l) => l.id)).toEqual([
      "pan_base",
      "salsa_1",
      "lechuga_1",
      "carne_1",
      "queso_1",
      "cebolla_1",
      "pan_tapa",
    ]);
  });

  it("repite capas por unidades (Doble y extras) y agrega adicionales", () => {
    const c = setUnits(clasica, setUnits(clasica, E, "queso", 2, "doble"), "tocineta", 2, "doble");
    const ids = buildStack(clasica, c, "doble").map((l) => l.id);
    expect(ids.filter((id) => id.startsWith("carne_"))).toEqual(["carne_1", "carne_2"]);
    expect(ids.filter((id) => id.startsWith("queso_"))).toEqual(["queso_1", "queso_2"]);
    expect(ids.slice(-3)).toEqual(["tocineta_1", "tocineta_2", "pan_tapa"]);
  });

  it("un reemplazo cambia el aspecto de la capa", () => {
    const stack = buildStack(clasica, setReplacement(clasica, E, "pan", "envuelta_lechuga"));
    expect(stack[0]).toMatchObject({
      id: "pan_base",
      kind: "envoltura_lechuga",
      name: "Envuelta en lechuga",
    });
  });

  it("el despiece separa las capas sin cambiar su orden", () => {
    const stack = buildStack(clasica, E);
    const closed = layerPositions(stack, 0);
    const open = layerPositions(stack, 1);
    expect(closed[0]).toBeCloseTo(stack[0]!.thickness / 2);
    expect(open.every((y, i) => i === 0 || y > open[i - 1]!)).toBe(true);
    expect(stackHeight(stack, 1)).toBeGreaterThan(stackHeight(stack, 0));
  });
});
