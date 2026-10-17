import { describe, expect, it } from "vitest";
import {
  ITEMS_TEMPLATE,
  RECIPES_TEMPLATE,
  norm,
  parseCsv,
  parseItemsCsv,
  parseRecipesCsv,
} from "./importer";
import type { Dish, InventoryItem } from "./types";

const NOW = "2026-10-01T12:00:00.000Z";
const items: InventoryItem[] = [
  { id: "carne", name: "Carne de res molida", unit: "kg", qty: 1, threshold: 1, createdAt: NOW },
  { id: "pan", name: "Pan de hamburguesa", unit: "unidades", qty: 1, threshold: 1, createdAt: NOW },
];
const dishes = [
  {
    id: "clasica-27",
    name: "Clásica 27",
    variants: [
      { id: "sencilla", name: "Sencilla", price: 1 },
      { id: "doble", name: "Doble", price: 2 },
    ],
  },
] as Dish[];

describe("leer CSV", () => {
  it("detecta el separador y maneja comillas, BOM y saltos de línea de Excel", () => {
    expect(parseCsv('﻿a;b;c\r\n1;"x;y";3\r\n\r\n')).toEqual([
      ["a", "b", "c"],
      ["1", "x;y", "3"],
    ]);
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv('a;b\n"di ""hola""";2')[1]).toEqual(['di "hola"', "2"]);
    expect(norm("  Clásica   27 ")).toBe("clasica 27");
  });
});

describe("productos", () => {
  it("la plantilla es válida y trae costo y unidad de compra", () => {
    const { rows, error } = parseItemsCsv(ITEMS_TEMPLATE, []);
    expect(error).toBeUndefined();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      name: "Carne de res molida",
      qty: 20,
      cost: 22000,
      purchase: { unit: "bulto", factor: 25 },
    });
    expect(rows.every((r) => !r.error)).toBe(true);
  });

  it("marca los errores por fila, los repetidos y los que ya existen", () => {
    const csv =
      "Producto,Unidad,Existencias\nSal,kg,abc\n,kg,1\nSal,kg,2\nSal,kg,3\nCarne de res molida,kg,1";
    const { rows } = parseItemsCsv(csv, items);
    expect(rows.map((r) => r.error ?? (r.existing ? "existe" : "ok"))).toEqual([
      "Las existencias no son un número válido",
      "Falta el nombre",
      "ok",
      "El producto está repetido en el archivo",
      "existe",
    ]);
  });

  it("pide las columnas mínimas", () => {
    expect(parseItemsCsv("Nombre\nx", []).error).toMatch(/Producto/);
    expect(parseItemsCsv("Producto;Unidad", []).error).toMatch(/no trae filas/);
  });
});

describe("recetas", () => {
  it("agrupa las filas por plato y opción", () => {
    const { rows } = parseRecipesCsv(RECIPES_TEMPLATE, dishes, items, []);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      dishId: "clasica-27",
      variantId: "doble",
      dailyMax: 40,
      ingredients: [
        { itemId: "carne", qty: 0.3 },
        { itemId: "pan", qty: 1 },
      ],
    });
    expect(rows.every((r) => !r.error)).toBe(true);
  });

  it("avisa de platos, opciones y productos que no existen y de lo que reemplaza", () => {
    const csv = [
      "plato;opcion;ingrediente;cantidad",
      "Pizza;;Carne de res molida;1",
      "Clásica 27;Triple;Carne de res molida;1",
      "Clásica 27;Sencilla;Queso;1",
      "Clásica 27;Doble;Pan de hamburguesa;0",
      "Clásica 27;;Pan de hamburguesa;1",
    ].join("\n");
    const { rows } = parseRecipesCsv(csv, dishes, items, [
      { id: "r", dishId: "clasica-27", lines: [{ itemId: "pan", qty: 1 }] },
    ]);
    expect(
      rows.map((r) => r.error?.replace(/Fila \d+: /, "") ?? (r.replaces ? "reemplaza" : "ok")),
    ).toEqual([
      "no existe el plato «Pizza»",
      "«Clásica 27» no tiene la opción «Triple»",
      "no existe el producto «Queso»",
      "la cantidad debe ser mayor que cero",
      "reemplaza",
    ]);
  });
});
