import { normalizeText } from "./menu";
import type { Allergen, Dish, SpiceLevel } from "./types";

/** Borrador editable de un plato: los precios se escriben como texto ("22.900"). */
export interface DishDraft {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  variants: Array<{ id?: string; name: string; price: string }>;
  ingredients: Array<{ name: string; description: string; allergens: Allergen[] }>;
  spiceLevel: SpiceLevel;
  photos: string[];
  timeSlotIds: string[];
  active: boolean;
  featured: boolean;
  model3d?: { fileName: string; sizeBytes: number };
}

export interface DishFormErrors {
  name?: string;
  categoryId?: string;
  description?: string;
  variants?: string;
  variantRows?: Record<number, string>;
  ingredients?: string;
  ingredientRows?: Record<number, string>;
  photos?: string;
}

export const MODEL_MAX_BYTES = 4 * 1024 * 1024;
export const MODEL_ERROR = "Formato o tamaño no permitido (solo .glb hasta 4 MB)";

/** "22.900", "$22,900" o "22900" → 22900. Devuelve null si no es un precio válido. */
export function parsePrice(input: string): number | null {
  const digits = input.replace(/[$\s.,]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  return value > 0 && value <= 10_000_000 ? value : null;
}

export function emptyDraft(categoryId = ""): DishDraft {
  return {
    name: "",
    description: "",
    categoryId,
    variants: [{ name: "Única", price: "" }],
    ingredients: [{ name: "", description: "", allergens: [] }],
    spiceLevel: 0,
    photos: [],
    timeSlotIds: [],
    active: true,
    featured: false,
  };
}

export function dishToDraft(dish: Dish): DishDraft {
  return {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    categoryId: dish.categoryId,
    variants: dish.variants.map((v) => ({ id: v.id, name: v.name, price: String(v.price) })),
    ingredients: dish.ingredients.map((i) => ({
      name: i.name,
      description: i.description ?? "",
      allergens: [...i.allergens],
    })),
    spiceLevel: dish.spiceLevel,
    photos: [...dish.photos],
    timeSlotIds: [...dish.timeSlotIds],
    active: dish.active,
    featured: dish.featured,
    model3d: dish.model3d,
  };
}

/** Campos obligatorios (regla 9): nombre, precio, categoría, ingredientes y al menos una foto. */
export function validateDishDraft(
  draft: DishDraft,
  ctx: { categoryIds: readonly string[]; otherNames: readonly string[] },
): DishFormErrors {
  const e: DishFormErrors = {};
  const name = draft.name.trim();
  if (!name) e.name = "Escribe el nombre del plato";
  else if (name.length > 60) e.name = "Usa máximo 60 caracteres";
  else if (ctx.otherNames.some((n) => normalizeText(n) === normalizeText(name)))
    e.name = "Ya hay un plato con ese nombre";
  if (!draft.categoryId || !ctx.categoryIds.includes(draft.categoryId))
    e.categoryId = "Elige una categoría";
  if (draft.description.length > 200) e.description = "Usa máximo 200 caracteres";

  if (draft.variants.length === 0) e.variants = "Agrega al menos un precio";
  const variantRows: Record<number, string> = {};
  const names = new Set<string>();
  draft.variants.forEach((v, i) => {
    if (parsePrice(v.price) === null)
      variantRows[i] = "Escribe un precio válido, por ejemplo 22.900";
    else if (draft.variants.length > 1 && !v.name.trim())
      variantRows[i] = "Ponle nombre a la opción";
    const key = normalizeText(v.name);
    if (key && names.has(key)) variantRows[i] = "Hay dos opciones con el mismo nombre";
    names.add(key);
  });
  if (Object.keys(variantRows).length) e.variantRows = variantRows;

  const filled = draft.ingredients.filter((i) => i.name.trim());
  if (filled.length === 0) e.ingredients = "Agrega al menos un ingrediente";
  const ingredientRows: Record<number, string> = {};
  draft.ingredients.forEach((ing, i) => {
    if (!ing.name.trim() && (ing.description.trim() || ing.allergens.length))
      ingredientRows[i] = "Falta el nombre del ingrediente";
  });
  if (Object.keys(ingredientRows).length) e.ingredientRows = ingredientRows;

  if (draft.photos.length === 0) e.photos = "Sube al menos una foto";
  return e;
}

export function hasErrors(e: DishFormErrors): boolean {
  return Object.keys(e).length > 0;
}

/** Id legible y único a partir del nombre: "Clásica 27" → "clasica-27". */
export function slugify(name: string, taken: readonly string[]): string {
  const base =
    normalizeText(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "plato";
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** Convierte el borrador validado en un plato. */
export function draftToDish(
  draft: DishDraft,
  ctx: { takenIds: readonly string[]; now: string; existing?: Dish },
): Dish {
  const variantIds: string[] = [];
  const variants = draft.variants.map((v, i) => {
    const name = v.name.trim() || (draft.variants.length === 1 ? "Única" : `Opción ${i + 1}`);
    const id = v.id ?? slugify(name, variantIds);
    variantIds.push(id);
    return { id, name, price: parsePrice(v.price)! };
  });
  const dish: Dish = {
    id: ctx.existing?.id ?? slugify(draft.name, ctx.takenIds),
    name: draft.name.trim(),
    description: draft.description.trim(),
    categoryId: draft.categoryId,
    variants,
    ingredients: draft.ingredients
      .filter((i) => i.name.trim())
      .map((i) =>
        i.description.trim()
          ? { name: i.name.trim(), description: i.description.trim(), allergens: i.allergens }
          : { name: i.name.trim(), allergens: i.allergens },
      ),
    spiceLevel: draft.spiceLevel,
    photos: draft.photos,
    timeSlotIds: draft.timeSlotIds,
    active: draft.active,
    featured: draft.featured,
    createdAt: ctx.existing?.createdAt ?? ctx.now,
  };
  if (draft.model3d) dish.model3d = draft.model3d;
  return dish;
}

/** Valida el archivo del modelo 3D (US-12): extensión .glb y máximo 4 MB. */
export function validateModelFile(file: { name: string; size: number }): string | null {
  if (!/\.glb$/i.test(file.name) || file.size <= 0 || file.size > MODEL_MAX_BYTES)
    return MODEL_ERROR;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
