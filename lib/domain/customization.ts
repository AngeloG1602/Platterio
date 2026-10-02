import { ALLERGEN_LABEL } from "./allergens";
import { ALLERGENS, type Allergen } from "./types";

/**
 * Personalización de un plato: quitar, pedir extra o reemplazar ingredientes, agregar
 * adicionales y cambiar el acompañante. Funciones puras; el visor 3D y el pedido leen de aquí.
 *
 * Modelo: cada plato tiene "ranuras". Una ranura incluida arranca en 1 (se puede quitar o pedir
 * extra); un adicional arranca en 0 (se agrega). Cualquier ranura puede tener reemplazos.
 */

/** Forma visual de una capa en el modelo 3D (y nombre del nodo en un .glb real). */
export type VisualKind =
  | "pan"
  | "carne"
  | "pollo"
  | "vegetal"
  | "queso"
  | "lechuga"
  | "tomate"
  | "cebolla"
  | "cebolla_crocante"
  | "salsa"
  | "tocineta"
  | "huevo"
  | "aguacate"
  | "jalapeno"
  | "pepinillo"
  | "envoltura_lechuga"
  // Platos a la carta (se sirven repartidos en el plato, no apilados).
  | "calentado"
  | "arroz"
  | "chorizo"
  | "arepa"
  | "maduro";

export interface Visual {
  kind: VisualKind;
  /** Color principal de la capa (hex). */
  color: string;
}

export interface IngredientOption {
  id: string;
  name: string;
  /** Diferencia de precio frente a lo original (COP). */
  priceDelta: number;
  allergens: Allergen[];
  description?: string;
  visual?: Visual;
}

export interface IngredientSlot {
  /** Clave estable; también nombra el nodo del modelo 3D (`ing_<key>`). */
  key: string;
  name: string;
  description?: string;
  allergens: Allergen[];
  /** true = viene en el plato; false = adicional que se puede agregar. */
  included: boolean;
  /** Si se puede quitar (solo aplica a incluidas). */
  removable: boolean;
  /** Unidades extra permitidas por encima de lo incluido (o máximo de un adicional). */
  maxExtra: number;
  /** Precio por unidad extra o por unidad de adicional. */
  extraPrice: number;
  replacements: IngredientOption[];
  visual: Visual;
}

export interface SideGroup {
  name: string;
  defaultId: string;
  options: IngredientOption[];
}

export interface DishCustomizationSpec {
  dishId: string;
  slots: IngredientSlot[];
  sides?: SideGroup;
  /** Unidades base de una ranura según la variante (p. ej. la Doble trae 2 carnes). */
  variantUnits?: Record<string, Record<string, number>>;
}

export interface Customization {
  /** Unidades por ranura. Ausente = valor por defecto (1 si es incluida, 0 si es adicional). */
  counts: Record<string, number>;
  /** Reemplazo elegido por ranura (id de la opción). */
  replaced: Record<string, string>;
  /** Acompañante elegido (id de la opción). Ausente = el de la casa. */
  side?: string;
}

export const EMPTY_CUSTOMIZATION: Customization = { counts: {}, replaced: {} };

const slotOf = (spec: DishCustomizationSpec, key: string) => spec.slots.find((s) => s.key === key);

/** Unidades con las que viene la ranura (según la variante del plato). */
export function baseUnits(
  spec: DishCustomizationSpec,
  slot: IngredientSlot,
  variantId?: string,
): number {
  if (!slot.included) return 0;
  return (variantId && spec.variantUnits?.[variantId]?.[slot.key]) || 1;
}

export function unitsOf(
  spec: DishCustomizationSpec,
  c: Customization,
  key: string,
  variantId?: string,
): number {
  const slot = slotOf(spec, key);
  if (!slot) return 0;
  return c.counts[key] ?? baseUnits(spec, slot, variantId);
}

export function limits(spec: DishCustomizationSpec, slot: IngredientSlot, variantId?: string) {
  const base = baseUnits(spec, slot, variantId);
  return { min: slot.included && !slot.removable ? base : 0, max: base + slot.maxExtra, base };
}

/** Cambia las unidades de una ranura (quitar = 0). Respeta los límites y limpia el reemplazo si queda en 0. */
export function setUnits(
  spec: DishCustomizationSpec,
  c: Customization,
  key: string,
  units: number,
  variantId?: string,
): Customization {
  const slot = slotOf(spec, key);
  if (!slot) return c;
  const { min, max, base } = limits(spec, slot, variantId);
  const value = Math.max(min, Math.min(max, Math.round(units)));
  const counts = { ...c.counts };
  if (value === base) delete counts[key];
  else counts[key] = value;
  const replaced = { ...c.replaced };
  if (value === 0) delete replaced[key];
  return { ...c, counts, replaced };
}

/** Quitar o volver a poner un ingrediente incluido. */
export function toggleRemoved(
  spec: DishCustomizationSpec,
  c: Customization,
  key: string,
  variantId?: string,
): Customization {
  const slot = slotOf(spec, key);
  if (!slot?.included || !slot.removable) return c;
  const current = unitsOf(spec, c, key, variantId);
  return setUnits(spec, c, key, current === 0 ? baseUnits(spec, slot, variantId) : 0, variantId);
}

/** Elige un reemplazo (o null para volver al original). Si el ingrediente estaba quitado, lo vuelve a poner. */
export function setReplacement(
  spec: DishCustomizationSpec,
  c: Customization,
  key: string,
  optionId: string | null,
  variantId?: string,
): Customization {
  const slot = slotOf(spec, key);
  if (!slot) return c;
  const replaced = { ...c.replaced };
  if (!optionId) {
    delete replaced[key];
    return { ...c, replaced };
  }
  if (!slot.replacements.some((o) => o.id === optionId)) return c;
  replaced[key] = optionId;
  let next: Customization = { ...c, replaced };
  if (unitsOf(spec, next, key, variantId) === 0)
    next = setUnits(spec, next, key, Math.max(1, baseUnits(spec, slot, variantId)), variantId);
  return { ...next, replaced };
}

export function setSide(
  spec: DishCustomizationSpec,
  c: Customization,
  optionId: string,
): Customization {
  if (!spec.sides?.options.some((o) => o.id === optionId)) return c;
  if (optionId === spec.sides.defaultId) {
    const next = { ...c };
    delete next.side;
    return next;
  }
  return { ...c, side: optionId };
}

/** Errores de una personalización (por ejemplo, si llega de otro dispositivo o de una versión vieja). */
export function validateCustomization(
  spec: DishCustomizationSpec,
  c: Customization,
  variantId?: string,
): string[] {
  const errors: string[] = [];
  for (const [key, units] of Object.entries(c.counts)) {
    const slot = slotOf(spec, key);
    if (!slot) {
      errors.push(`Ingrediente desconocido: ${key}`);
      continue;
    }
    const { min, max } = limits(spec, slot, variantId);
    if (!Number.isInteger(units) || units < min || units > max) {
      errors.push(
        units < min && min > 0 ? `${slot.name} no se puede quitar` : `${slot.name}: máximo ${max}`,
      );
    }
  }
  for (const [key, optionId] of Object.entries(c.replaced)) {
    const slot = slotOf(spec, key);
    if (!slot?.replacements.some((o) => o.id === optionId))
      errors.push(`Reemplazo no disponible para ${slot?.name ?? key}`);
    else if (unitsOf(spec, c, key, variantId) === 0)
      errors.push(`${slot.name} está quitado; no se puede reemplazar`);
  }
  if (c.side && !spec.sides?.options.some((o) => o.id === c.side))
    errors.push("Acompañante no disponible");
  return errors;
}

/** Lo que realmente lleva el plato después de personalizarlo. */
export interface ResolvedIngredient {
  key: string;
  name: string;
  originalName: string;
  units: number;
  allergens: Allergen[];
  visual: Visual;
  state: "normal" | "extra" | "reemplazado" | "agregado";
  /** Opción de reemplazo elegida; `undefined` si es el ingrediente original. */
  optionId?: string;
}

export function resolveIngredients(
  spec: DishCustomizationSpec,
  c: Customization,
  variantId?: string,
): ResolvedIngredient[] {
  const out: ResolvedIngredient[] = [];
  for (const slot of spec.slots) {
    const units = unitsOf(spec, c, slot.key, variantId);
    if (units === 0) continue;
    const option = slot.replacements.find((o) => o.id === c.replaced[slot.key]);
    const base = baseUnits(spec, slot, variantId);
    out.push({
      key: slot.key,
      name: option?.name ?? slot.name,
      originalName: slot.name,
      units,
      allergens: option?.allergens ?? slot.allergens,
      visual: option?.visual ?? slot.visual,
      optionId: option?.id,
      state: option
        ? "reemplazado"
        : !slot.included
          ? "agregado"
          : units > base
            ? "extra"
            : "normal",
    });
  }
  return out;
}

export function sideOf(
  spec: DishCustomizationSpec,
  c: Customization,
): IngredientOption | undefined {
  if (!spec.sides) return undefined;
  return spec.sides.options.find((o) => o.id === (c.side ?? spec.sides!.defaultId));
}

/** Alérgenos resultantes, en orden canónico (incluye el acompañante). */
export function resultingAllergens(
  spec: DishCustomizationSpec,
  c: Customization,
  variantId?: string,
): Allergen[] {
  const found = new Set<Allergen>(
    resolveIngredients(spec, c, variantId).flatMap((i) => i.allergens),
  );
  for (const a of sideOf(spec, c)?.allergens ?? []) found.add(a);
  return ALLERGENS.filter((a) => found.has(a));
}

/** Diferencia de precio de la personalización. Quitar no descuenta (ver propuesta). */
export function priceDelta(
  spec: DishCustomizationSpec,
  c: Customization,
  variantId?: string,
): number {
  let delta = 0;
  for (const slot of spec.slots) {
    const units = unitsOf(spec, c, slot.key, variantId);
    const base = baseUnits(spec, slot, variantId);
    if (units > base) delta += (units - base) * slot.extraPrice;
    const option = slot.replacements.find((o) => o.id === c.replaced[slot.key]);
    if (option && units > 0) delta += option.priceDelta;
  }
  const side = sideOf(spec, c);
  if (side) delta += side.priceDelta;
  return delta;
}

/** Líneas claras para la comanda de cocina. */
export function kitchenLines(
  spec: DishCustomizationSpec,
  c: Customization,
  variantId?: string,
): string[] {
  const lines: string[] = [];
  for (const slot of spec.slots) {
    const units = unitsOf(spec, c, slot.key, variantId);
    const base = baseUnits(spec, slot, variantId);
    const option = slot.replacements.find((o) => o.id === c.replaced[slot.key]);
    if (slot.included && units === 0) lines.push(`SIN ${slot.name}`);
    if (option && units > 0) lines.push(`CAMBIAR ${slot.name} → ${option.name}`);
    const shown = option?.name ?? slot.name;
    if (slot.included && units > base)
      lines.push(`EXTRA ${shown}${units - base > 1 ? ` ×${units - base}` : ""}`);
    if (!slot.included && units > 0) lines.push(`AGREGAR ${shown}${units > 1 ? ` ×${units}` : ""}`);
  }
  const side = sideOf(spec, c);
  if (spec.sides && side && side.id !== spec.sides.defaultId)
    lines.push(`ACOMPAÑANTE ${side.name}`);
  return lines;
}

/** Resumen corto para el carrito: "Sin cebolla · Extra queso · Pan sin gluten". */
export function summarize(
  spec: DishCustomizationSpec,
  c: Customization,
  variantId?: string,
): string {
  return kitchenLines(spec, c, variantId)
    .map((l) =>
      l
        .replace(/^SIN (.*)$/, "Sin $1")
        .replace(/^CAMBIAR .* → (.*)$/, "$1")
        .replace(/^EXTRA (.*)$/, "Extra $1")
        .replace(/^AGREGAR (.*)$/, "Con $1")
        .replace(/^ACOMPAÑANTE (.*)$/, "Con $1"),
    )
    .join(" · ");
}

export interface AdaptResult {
  customization: Customization;
  /** Cambios hechos, en lenguaje del cliente. */
  changes: string[];
  /** Ingredientes con conflicto que no se pudieron quitar ni reemplazar. */
  unresolved: string[];
}

/**
 * "Adaptar a mis alergias": para cada ingrediente con un alérgeno del cliente, usa el primer
 * reemplazo seguro; si no hay, lo quita si se puede; si no, lo reporta. Hace lo mismo con el
 * acompañante. No bloquea: el cliente decide si lo acepta.
 */
export function adaptToRestrictions(
  spec: DishCustomizationSpec,
  c: Customization,
  restrictions: readonly Allergen[],
  variantId?: string,
): AdaptResult {
  const conflicts = (list: readonly Allergen[]) => list.some((a) => restrictions.includes(a));
  let next = c;
  const changes: string[] = [];
  const unresolved: string[] = [];
  for (const ing of resolveIngredients(spec, c, variantId)) {
    if (!conflicts(ing.allergens)) continue;
    const slot = slotOf(spec, ing.key)!;
    const safe = slot.replacements.find((o) => !conflicts(o.allergens));
    const safeOriginal = !conflicts(slot.allergens);
    if (ing.state === "reemplazado" && safeOriginal) {
      next = setReplacement(spec, next, slot.key, null, variantId);
      changes.push(`${ing.name} → ${slot.name}`);
    } else if (safe && safe.id !== next.replaced[slot.key]) {
      next = setReplacement(spec, next, slot.key, safe.id, variantId);
      changes.push(`${ing.name} → ${safe.name}`);
    } else if (!slot.included || slot.removable) {
      next = setUnits(spec, next, slot.key, 0, variantId);
      changes.push(`Sin ${ing.name.toLowerCase()}`);
    } else {
      unresolved.push(ing.name);
    }
  }
  const side = sideOf(spec, next);
  if (spec.sides && side && conflicts(side.allergens)) {
    const safeSide = spec.sides.options.find((o) => !conflicts(o.allergens));
    if (safeSide) {
      next = setSide(spec, next, safeSide.id);
      changes.push(`${side.name} → ${safeSide.name}`);
    } else unresolved.push(side.name);
  }
  return { customization: next, changes, unresolved };
}

/** "Ya no tiene lácteos" / "Ahora tiene soya": diferencias de alérgenos frente al plato original. */
export function allergenChanges(before: readonly Allergen[], after: readonly Allergen[]) {
  return {
    removed: before.filter((a) => !after.includes(a)).map((a) => ALLERGEN_LABEL[a]),
    added: after.filter((a) => !before.includes(a)).map((a) => ALLERGEN_LABEL[a]),
  };
}
