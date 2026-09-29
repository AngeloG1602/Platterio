import { describe, expect, it } from "vitest";
import { conflictingAllergens, dishAllergens } from "./allergens";

const dish = {
  ingredients: [
    { name: "Pan brioche", allergens: ["gluten", "huevo", "lacteos"] as const },
    { name: "Queso cheddar", allergens: ["lacteos"] as const },
    { name: "Lechuga", allergens: [] as const },
  ].map((i) => ({ ...i, allergens: [...i.allergens] })),
};

describe("alérgenos", () => {
  it("se derivan de los ingredientes, sin repetir y en orden canónico", () => {
    expect(dishAllergens(dish)).toEqual(["gluten", "lacteos", "huevo"]);
  });
  it("detecta conflictos con las restricciones del cliente", () => {
    expect(conflictingAllergens(dish, ["lacteos", "mani"])).toEqual(["lacteos"]);
    expect(conflictingAllergens(dish, [])).toEqual([]);
  });
});
