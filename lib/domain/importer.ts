import { parseQty, round3 } from "./inventory";
import type { Dish, InventoryItem, Recipe } from "./types";

/**
 * Carga masiva desde Excel o CSV. Dos archivos: productos y recetas. Se acepta cualquier separador
 * (coma, punto y coma o tabulador), comillas, tildes y mayúsculas distintas en los encabezados.
 * Nada se guarda aquí: se devuelve una vista previa con los errores fila por fila.
 */

/** Minúsculas y sin tildes, para comparar nombres. */
export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

/** Lee un CSV (con comillas) detectando el separador. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", "\t", ","]
    .map((d) => [d, firstLine.split(d).length] as const)
    .sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim())) rows.push(row.map((x) => x.trim()));
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row.map((x) => x.trim()));
  return rows;
}

/** Posición de cada columna según los encabezados (alias aceptados). */
function columns(header: string[], wanted: Record<string, string[]>) {
  const names = header.map(norm);
  const out: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(wanted)) {
    const i = names.findIndex((n) => aliases.includes(n));
    out[key] = i;
  }
  return out;
}

/* ——— Productos ——— */

export const ITEMS_TEMPLATE = `Producto;Unidad;Existencias;Avisar desde;Costo por unidad;Unidad de compra;Equivale a
Carne de res molida;kg;20;3;22000;bulto;25
Pan de hamburguesa;unidades;80;12;600;paquete;12
Gaseosa 400 ml;botellas;24;6;1800;caja;24
`;

export interface ItemRow {
  line: number;
  name: string;
  unit: string;
  qty: number;
  threshold: number;
  cost?: number;
  purchase?: { unit: string; factor: number };
  /** Si trae error la fila no se importa. */
  error?: string;
  /** El producto ya existe: se omite. */
  existing?: boolean;
}

export function parseItemsCsv(
  text: string,
  existing: readonly InventoryItem[],
): {
  rows: ItemRow[];
  error?: string;
} {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], error: "El archivo no trae filas de productos" };
  const col = columns(table[0]!, {
    name: ["producto", "nombre"],
    unit: ["unidad"],
    qty: ["existencias", "cantidad", "stock"],
    threshold: ["avisar desde", "aviso", "minimo"],
    cost: ["costo por unidad", "costo"],
    pUnit: ["unidad de compra"],
    pFactor: ["equivale a", "equivale"],
  });
  if (col.name! < 0 || col.unit! < 0)
    return { rows: [], error: "Faltan las columnas «Producto» y «Unidad»" };
  const known = new Set(existing.map((i) => norm(i.name)));
  const seen = new Set<string>();
  const rows: ItemRow[] = table.slice(1).map((cells, idx) => {
    const get = (k: string) => (col[k]! >= 0 ? (cells[col[k]!] ?? "") : "");
    const name = get("name").replace(/\s+/g, " ").trim();
    const row: ItemRow = {
      line: idx + 2,
      name,
      unit: get("unit"),
      qty: get("qty") ? parseQty(get("qty")) : 0,
      threshold: get("threshold") ? parseQty(get("threshold")) : 0,
    };
    if (!name) row.error = "Falta el nombre";
    else if (!row.unit) row.error = "Falta la unidad";
    else if (!Number.isFinite(row.qty)) row.error = "Las existencias no son un número válido";
    else if (!Number.isFinite(row.threshold)) row.error = "«Avisar desde» no es un número válido";
    if (!row.error && get("cost")) {
      const c = parseQty(get("cost").replace(/[$\s]/g, ""));
      if (Number.isFinite(c)) row.cost = c;
      else row.error = "El costo no es un número válido";
    }
    if (!row.error && (get("pUnit") || get("pFactor"))) {
      const f = parseQty(get("pFactor"));
      if (!get("pUnit") || !(f > 0)) row.error = "La unidad de compra necesita a cuánto equivale";
      else row.purchase = { unit: get("pUnit"), factor: f };
    }
    if (!row.error) {
      const key = norm(name);
      if (seen.has(key)) row.error = "El producto está repetido en el archivo";
      else if (known.has(key)) row.existing = true;
      seen.add(key);
    }
    return row;
  });
  return { rows };
}

/* ——— Recetas ——— */

export const RECIPES_TEMPLATE = `Plato;Opción;Ingrediente;Cantidad;Tope diario
Clásica 27;Sencilla;Carne de res molida;0,15;
Clásica 27;Sencilla;Pan de hamburguesa;1;
Clásica 27;Doble;Carne de res molida;0,3;40
Clásica 27;Doble;Pan de hamburguesa;1;40
`;

export interface RecipeRow {
  /** Filas del archivo que forman esta receta. */
  lines: number[];
  dishId: string;
  dishName: string;
  variantId?: string;
  variantName?: string;
  ingredients: { itemId: string; name: string; qty: number }[];
  dailyMax?: number;
  error?: string;
  /** Ya hay una receta para ese plato y opción: se reemplaza. */
  replaces?: boolean;
}

export function parseRecipesCsv(
  text: string,
  dishes: readonly Dish[],
  items: readonly InventoryItem[],
  recipes: readonly Recipe[],
): { rows: RecipeRow[]; error?: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], error: "El archivo no trae filas de recetas" };
  const col = columns(table[0]!, {
    dish: ["plato"],
    variant: ["opcion", "variante"],
    item: ["ingrediente", "producto"],
    qty: ["cantidad"],
    max: ["tope diario", "tope"],
  });
  if (col.dish! < 0 || col.item! < 0 || col.qty! < 0)
    return { rows: [], error: "Faltan las columnas «Plato», «Ingrediente» y «Cantidad»" };

  const groups = new Map<string, RecipeRow>();
  const order: string[] = [];
  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const get = (k: string) => (col[k]! >= 0 ? (cells[col[k]!] ?? "") : "");
    const dishText = get("dish");
    const dish = dishes.find((d) => norm(d.name) === norm(dishText));
    const variantText = get("variant");
    const variant = variantText
      ? dish?.variants.find((v) => norm(v.name) === norm(variantText))
      : undefined;
    const key = `${norm(dishText)}|${norm(variantText)}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        lines: [],
        dishId: dish?.id ?? "",
        dishName: dishText,
        ...(variant ? { variantId: variant.id, variantName: variant.name } : {}),
        ingredients: [],
      };
      if (!dishText) group.error = `Fila ${line}: falta el plato`;
      else if (!dish) group.error = `Fila ${line}: no existe el plato «${dishText}»`;
      else if (variantText && !variant)
        group.error = `Fila ${line}: «${dishText}» no tiene la opción «${variantText}»`;
      else
        group.replaces = recipes.some(
          (r) => r.dishId === dish.id && (r.variantId ?? "") === (variant?.id ?? ""),
        );
      groups.set(key, group);
      order.push(key);
    }
    group.lines.push(line);
    const item = items.find((i) => norm(i.name) === norm(get("item")));
    const qty = parseQty(get("qty"));
    if (!group.error) {
      if (!item) group.error = `Fila ${line}: no existe el producto «${get("item")}»`;
      else if (!(qty > 0)) group.error = `Fila ${line}: la cantidad debe ser mayor que cero`;
      else if (group.ingredients.some((g) => g.itemId === item.id))
        group.error = `Fila ${line}: «${item.name}» está repetido en la receta`;
      else group.ingredients.push({ itemId: item.id, name: item.name, qty: round3(qty) });
    }
    const max = get("max");
    if (max && !group.error) {
      if (/^\d+$/.test(max) && Number(max) > 0) group.dailyMax = Number(max);
      else group.error = `Fila ${line}: el tope diario debe ser un entero mayor que cero`;
    }
  });
  return { rows: order.map((k) => groups.get(k)!) };
}
