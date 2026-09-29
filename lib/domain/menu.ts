import { dishAllergens } from "./allergens";
import type { Allergen, Category, Dish, SpiceLevel } from "./types";

export interface MenuFilters {
  query: string;
  categoryId: string | null;
  withoutAllergens: Allergen[];
  spiceLevels: SpiceLevel[];
}

export const EMPTY_FILTERS: MenuFilters = {
  query: "",
  categoryId: null,
  withoutAllergens: [],
  spiceLevels: [],
};

/** Minúsculas y sin tildes: "Lácteos" → "lacteos". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Búsqueda por nombre o ingrediente; cada palabra debe aparecer en alguno de los dos. */
export function matchesQuery(dish: Dish, query: string): boolean {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = [dish.name, ...dish.ingredients.map((i) => i.name)].map(normalizeText);
  return tokens.every((t) => haystack.some((h) => h.includes(t)));
}

/** Filtros combinables del menú (BRIEF §6.1). Solo platos activos (regla 11). */
export function filterDishes(dishes: readonly Dish[], filters: MenuFilters): Dish[] {
  return dishes.filter((dish) => {
    if (!dish.active) return false;
    if (filters.categoryId && dish.categoryId !== filters.categoryId) return false;
    if (filters.spiceLevels.length > 0 && !filters.spiceLevels.includes(dish.spiceLevel))
      return false;
    if (filters.withoutAllergens.length > 0) {
      const allergens = dishAllergens(dish);
      if (filters.withoutAllergens.some((a) => allergens.includes(a))) return false;
    }
    return matchesQuery(dish, filters.query);
  });
}

/** Filtros aplicados además de la categoría (que vive en las pestañas). */
export function countRefinements(filters: MenuFilters): number {
  return filters.withoutAllergens.length + filters.spiceLevels.length;
}

export function isFiltering(filters: MenuFilters): boolean {
  return (
    Boolean(filters.query.trim()) || filters.categoryId !== null || countRefinements(filters) > 0
  );
}

export interface CategoryGroup {
  category: Category;
  dishes: Dish[];
}

/** Agrupa por categoría en el orden de la carta. Incluye categorías vacías si se pide. */
export function groupByCategory(
  dishes: readonly Dish[],
  categories: readonly Category[],
  { keepEmpty = false } = {},
): CategoryGroup[] {
  return [...categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({ category, dishes: dishes.filter((d) => d.categoryId === category.id) }))
    .filter((g) => keepEmpty || g.dishes.length > 0);
}

export function priceRange(dish: Pick<Dish, "variants">): { min: number; max: number } {
  const prices = dish.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
