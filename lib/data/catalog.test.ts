import { describe, expect, it } from "vitest";
import { dishAllergens } from "@/lib/domain/allergens";
import { validateTimeSlots } from "@/lib/domain/timeSlots";
import type { Allergen } from "@/lib/domain/types";
import { CATEGORIES, DISHES, TIME_SLOTS } from "./catalog";

/** Tabla del BRIEF §11: precio base, picante y alérgenos. */
const BRIEF: Record<string, [number, number, Allergen[]]> = {
  "calentado-de-la-casa": [16900, 0, ["huevo"]],
  "arepa-rellena": [9900, 0, ["huevo", "lacteos"]],
  "sandwich-de-desayuno": [13900, 0, ["gluten", "huevo", "lacteos"]],
  "clasica-27": [22900, 0, ["gluten", "lacteos", "huevo"]],
  "brasa-bbq": [27900, 1, ["gluten", "lacteos"]],
  "la-diabla": [26900, 3, ["gluten", "lacteos", "huevo"]],
  "pollo-crispy": [23900, 1, ["gluten", "huevo"]],
  "veggie-de-garbanzo": [24900, 0, ["gluten", "soya"]],
  "perro-de-la-casa": [15900, 0, ["gluten", "lacteos"]],
  "perro-suizo": [18900, 1, ["gluten", "lacteos"]],
  "salchipapa-27": [21900, 0, ["lacteos"]],
  "papas-cheddar-tocineta": [16900, 0, ["lacteos"]],
  "alitas-picantes": [24900, 2, ["gluten"]],
  "nuggets-de-pollo": [17900, 0, ["gluten", "huevo"]],
  "papas-a-la-francesa": [7900, 0, []],
  "aros-de-cebolla": [8900, 0, ["gluten", "huevo"]],
  "limonada-de-coco": [9900, 0, []],
  "jugo-natural": [7500, 0, []],
  gaseosa: [5500, 0, []],
  "malteada-de-arequipe": [13900, 0, ["lacteos"]],
  "brownie-con-helado": [12900, 0, ["gluten", "huevo", "lacteos", "frutos_secos"]],
  "cheesecake-de-maracuya": [11900, 0, ["gluten", "lacteos", "huevo"]],
};

describe("catálogo de Fogón 27", () => {
  it("tiene los 22 platos del brief", () => {
    expect(DISHES.map((d) => d.id).sort()).toEqual(Object.keys(BRIEF).sort());
  });

  it.each(DISHES.map((d) => [d.name, d] as const))("%s coincide con la tabla", (_, dish) => {
    const [price, spice, allergens] = BRIEF[dish.id]!;
    expect(dish.variants[0]!.price).toBe(price);
    expect(dish.spiceLevel).toBe(spice);
    expect(dishAllergens(dish).sort()).toEqual([...allergens].sort());
  });

  it("cumple los campos obligatorios y referencias válidas", () => {
    const categoryIds = new Set(CATEGORIES.map((c) => c.id));
    const slotIds = new Set(TIME_SLOTS.map((s) => s.id));
    for (const dish of DISHES) {
      expect(dish.name && dish.description).toBeTruthy();
      expect(categoryIds.has(dish.categoryId)).toBe(true);
      expect(dish.ingredients.length).toBeGreaterThan(0);
      expect(dish.photos.length).toBeGreaterThan(0);
      expect(dish.timeSlotIds.every((id) => slotIds.has(id))).toBe(true);
      expect(new Set(dish.variants.map((v) => v.id)).size).toBe(dish.variants.length);
    }
  });

  it("solo la Clásica 27 arranca destacada y hay tres platos con modelo 3D", () => {
    expect(DISHES.filter((d) => d.featured).map((d) => d.id)).toEqual(["clasica-27"]);
    expect(DISHES.filter((d) => d.model3d).length).toBe(3);
  });

  it("las franjas del restaurante no se solapan", () => {
    expect(validateTimeSlots(TIME_SLOTS)).toEqual([]);
  });
});
