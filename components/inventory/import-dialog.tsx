"use client";

import { Download, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { inventoryActions, useDishes, useInventory, useRecipes } from "@/lib/data";
import { formatMoney, plural } from "@/lib/domain/format";
import {
  ITEMS_TEMPLATE,
  RECIPES_TEMPLATE,
  parseItemsCsv,
  parseRecipesCsv,
} from "@/lib/domain/importer";
import { fmtQty } from "@/lib/domain/inventory";
import { downloadText } from "./download";

type Mode = "productos" | "recetas";

/** Carga masiva de productos o recetas desde un archivo de Excel guardado como CSV, o pegando las filas. */
export function ImportDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const items = useInventory();
  const dishes = useDishes();
  const recipes = useRecipes();
  const [text, setText] = useState("");
  const isItems = mode === "productos";

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    return isItems ? parseItemsCsv(text, items) : parseRecipesCsv(text, dishes, items, recipes);
  }, [text, isItems, items, dishes, recipes]);

  const rows = parsed?.rows ?? [];
  const valid = isItems
    ? (rows as ReturnType<typeof parseItemsCsv>["rows"]).filter((r) => !r.error && !r.existing)
    : (rows as ReturnType<typeof parseRecipesCsv>["rows"]).filter((r) => !r.error);

  async function pickFile(file: File | undefined) {
    if (file) setText(await file.text());
  }

  function submit() {
    if (!parsed) return;
    const r = isItems
      ? inventoryActions.importItems(parsed.rows as ReturnType<typeof parseItemsCsv>["rows"])
      : inventoryActions.importRecipes(parsed.rows as ReturnType<typeof parseRecipesCsv>["rows"]);
    if (!r.ok) return toast.error(r.error);
    const n = "created" in r ? r.created : "saved" in r ? r.saved : 0;
    toast.success(
      isItems
        ? `${plural(n ?? 0, "producto cargado", "productos cargados")}`
        : `${plural(n ?? 0, "receta cargada", "recetas cargadas")}`,
    );
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={isItems ? "Cargar productos desde un archivo" : "Cargar recetas desde un archivo"}
      description={
        isItems
          ? "Guarda tu hoja de Excel como CSV y súbela, o pega las filas. Los productos que ya existen se omiten."
          : "Una fila por ingrediente. Si ya hay una receta del mismo plato y opción, se reemplaza."
      }
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={valid.length === 0}>
            {valid.length > 0
              ? `Cargar ${plural(valid.length, isItems ? "producto" : "receta", isItems ? "productos" : "recetas")}`
              : "Cargar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadText(
                isItems ? "plantilla-productos.csv" : "plantilla-recetas.csv",
                isItems ? ITEMS_TEMPLATE : RECIPES_TEMPLATE,
              )
            }
          >
            <Download aria-hidden /> Descargar plantilla
          </Button>
          <label className="border-line-strong bg-surface hover:bg-surface-2 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold">
            <Upload className="size-4" aria-hidden /> Elegir archivo
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              aria-label="Archivo CSV"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
        </div>
        <Field label="O pega las filas aquí" optional>
          {(p) => (
            <Textarea
              {...p}
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isItems ? "Producto;Unidad;Existencias…" : "Plato;Opción;Ingrediente;Cantidad"
              }
            />
          )}
        </Field>

        {parsed?.error && (
          <p role="alert" className="text-danger-ink text-sm">
            {parsed.error}
          </p>
        )}
        {rows.length > 0 && (
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Vista previa de la carga</caption>
              <thead className="text-muted">
                <tr>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {isItems ? "Producto" : "Receta"}
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {isItems ? "Datos" : "Ingredientes"}
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {isItems
                  ? (rows as ReturnType<typeof parseItemsCsv>["rows"]).map((r) => (
                      <tr key={r.line}>
                        <th scope="row" className="py-1.5 pr-3 font-medium">
                          {r.name || "—"}
                        </th>
                        <td className="text-ink-soft py-1.5 pr-3">
                          {fmtQty(r.qty)} {r.unit}
                          {r.cost !== undefined && ` · ${formatMoney(r.cost)} c/u`}
                        </td>
                        <td className={r.error ? "text-danger-ink py-1.5" : "py-1.5"}>
                          {r.error
                            ? `Fila ${r.line}: ${r.error}`
                            : r.existing
                              ? "Ya existe"
                              : "Nuevo"}
                        </td>
                      </tr>
                    ))
                  : (rows as ReturnType<typeof parseRecipesCsv>["rows"]).map((r) => (
                      <tr key={r.lines[0]}>
                        <th scope="row" className="py-1.5 pr-3 font-medium">
                          {r.dishName || "—"}
                          {r.variantName ? ` · ${r.variantName}` : ""}
                        </th>
                        <td className="text-ink-soft py-1.5 pr-3">
                          {r.ingredients.map((i) => `${fmtQty(i.qty)} ${i.name}`).join(" · ")}
                          {r.dailyMax !== undefined && ` · tope ${r.dailyMax}`}
                        </td>
                        <td className={r.error ? "text-danger-ink py-1.5" : "py-1.5"}>
                          {r.error ?? (r.replaces ? "Reemplaza la actual" : "Nueva")}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Dialog>
  );
}
