import { ALLERGENS, type Allergen, type Dish } from "./types";

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: "Gluten",
  lacteos: "Lácteos",
  huevo: "Huevo",
  mani: "Maní",
  frutos_secos: "Frutos secos",
  soya: "Soya",
  mariscos: "Mariscos",
  pescado: "Pescado",
};

/** Alérgenos del plato, derivados de sus ingredientes y en el orden canónico. */
export function dishAllergens(dish: Pick<Dish, "ingredients">): Allergen[] {
  const found = new Set(dish.ingredients.flatMap((i) => i.allergens));
  return ALLERGENS.filter((a) => found.has(a));
}

/** Alérgenos del plato que coinciden con las restricciones del cliente. */
export function conflictingAllergens(
  dish: Pick<Dish, "ingredients">,
  restrictions: readonly Allergen[],
): Allergen[] {
  if (restrictions.length === 0) return [];
  return dishAllergens(dish).filter((a) => restrictions.includes(a));
}

export const SPICE_LABEL = [
  "Sin picante",
  "Picante suave",
  "Picante medio",
  "Muy picante",
] as const;
