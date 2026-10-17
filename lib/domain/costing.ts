import { requirements, round3, type StockView } from "./inventory";
import type { Dish, InventoryItem, Preparation } from "./types";

/**
 * Costo por plato. Cada producto tiene un costo por unidad de uso (lo que cuesta un kg, una botella);
 * el de una preparación sale de lo que gasta un lote entre lo que rinde (con sub-recetas). El
 * costo de un plato es la suma de lo que gasta su receta; si a algún ingrediente le falta el
 * costo, el resultado queda marcado como incompleto en lugar de mostrar una cifra engañosa.
 */

/** Costo de una unidad de este producto, o `undefined` si no se sabe. */
export function unitCost(
  item: InventoryItem,
  items: readonly InventoryItem[],
  preps: readonly Preparation[],
  depth = 0,
): number | undefined {
  const maker = preps.find((p) => p.outputItemId === item.id);
  if (!maker) return item.cost;
  if (depth > 6 || !(maker.yield > 0)) return undefined;
  let total = 0;
  for (const l of maker.lines) {
    const ingredient = items.find((i) => i.id === l.itemId);
    const c = ingredient ? unitCost(ingredient, items, preps, depth + 1) : undefined;
    if (c === undefined) return undefined;
    total += c * l.qty;
  }
  return round3(total / maker.yield);
}

export interface DishCost {
  dishId: string;
  variantId: string;
  /** "Clásica 27 · Doble" */
  name: string;
  price: number;
  /** Lo que cuesta lo que se sabe; incompleto si `missing` trae algo. */
  cost: number;
  margin: number;
  /** Margen sobre el precio (0 a 1). */
  marginPct: number;
  missing: string[];
}

/** Costo y margen de cada opción de plato que gasta inventario. */
export function dishCosts(
  dishes: readonly Dish[],
  stock: StockView,
  preps: readonly Preparation[],
): DishCost[] {
  const rows: DishCost[] = [];
  for (const dish of dishes) {
    for (const variant of dish.variants) {
      const reqs = requirements(stock, dish.id, variant.id);
      if (reqs.length === 0) continue;
      let cost = 0;
      const missing: string[] = [];
      for (const { item, per } of reqs) {
        const c = unitCost(item, stock.items, preps);
        if (c === undefined) missing.push(item.name);
        else cost += c * per;
      }
      cost = round3(cost);
      const margin = round3(variant.price - cost);
      rows.push({
        dishId: dish.id,
        variantId: variant.id,
        name: dish.variants.length > 1 ? `${dish.name} · ${variant.name}` : dish.name,
        price: variant.price,
        cost,
        margin,
        marginPct: variant.price > 0 ? round3(margin / variant.price) : 0,
        missing,
      });
    }
  }
  return rows;
}
