"use client";

import {
  ChefHat,
  Download,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { describePeriod, PeriodFilter, usePeriod } from "@/components/admin/ui/period-filter";
import { Panel } from "@/components/admin/ui/page-header";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";
import {
  inventoryActions,
  useDishes,
  useRecipes,
  useFeature,
  useInventory,
  useInventoryMoves,
} from "@/lib/data";
import { toCsv } from "@/lib/domain/cash";
import { formatDay, formatTime, plural } from "@/lib/domain/format";
import {
  emptyItemDraft,
  emptyRecipeDraft,
  fmtQty,
  limitingItem,
  parseQty,
  recipePortions,
  recipeToDraft,
  type RecipeDraft,
  type RecipeErrors,
  filterMoves,
  MANUAL_REASONS,
  MOVE_LABEL,
  movesCsvRows,
  STOCK_LABEL,
  stockLevel,
  summarizeMoves,
  type ItemDraft,
  type ItemErrors,
  type ManualKind,
} from "@/lib/domain/inventory";
import type { Dish, InventoryItem, InventoryMoveKind, Recipe } from "@/lib/domain/types";

type View = "existencias" | "recetas" | "movimientos";

function download(name: string, rows: (string | number | null)[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const LEVEL_TONE = { agotado: "danger", poco: "warning", bien: "success" } as const;

/** Inventario: existencias de los productos terminados, sus movimientos y los avisos de poco stock. */
export function InventoryPanel() {
  const enabled = useFeature("inventario");
  const items = useInventory();
  const [view, setView] = useState<View>("existencias");

  if (!enabled)
    return (
      <Panel title="Inventario">
        <p className="text-muted text-[15px]">
          El inventario viene con el plan Completo. Con él, las bebidas y los productos terminados
          se descuentan solos cuando el mesero confirma el pedido.
        </p>
      </Panel>
    );

  return (
    <>
      <Segmented
        label="Vista del inventario"
        value={view}
        onChange={setView}
        className="w-full sm:w-[28rem]"
        options={[
          { value: "existencias", label: "Existencias" },
          { value: "recetas", label: "Recetas" },
          { value: "movimientos", label: "Movimientos" },
        ]}
      />
      {view === "existencias" && <Stock items={items} />}
      {view === "recetas" && <Recipes items={items} />}
      {view === "movimientos" && <Movements items={items} />}
    </>
  );
}

/* ——— Existencias ——— */

function Stock({ items }: { items: readonly InventoryItem[] }) {
  const dishes = useDishes();
  const [editing, setEditing] = useState<InventoryItem | "nuevo" | null>(null);
  const [moving, setMoving] = useState<{ item: InventoryItem; kind: ManualKind } | null>(null);
  const low = items.filter((i) => stockLevel(i) === "poco").length;
  const out = items.filter((i) => stockLevel(i) === "agotado").length;
  const dishName = (item: InventoryItem) => {
    if (!item.link) return "Solo cuenta";
    const dish = dishes.find((d) => d.id === item.link!.dishId);
    const variant = dish?.variants.find((v) => v.id === item.link!.variantId);
    return dish ? `${dish.name}${variant ? ` · ${variant.name}` : ""}` : "Plato eliminado";
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Productos" value={items.length} />
        <StatTile
          label="Con poco stock"
          value={low}
          tone={low > 0 ? "danger" : "neutral"}
          note="En su límite de aviso o por debajo"
        />
        <StatTile
          label="Agotados"
          value={out}
          tone={out > 0 ? "danger" : "neutral"}
          note="No se pueden pedir"
        />
      </div>

      <Panel
        title="Existencias"
        description="Lo que está vinculado a un plato baja solo cuando el mesero confirma el pedido y vuelve si se rechaza o se quita."
        action={
          <Button size="sm" onClick={() => setEditing("nuevo")}>
            <PackagePlus aria-hidden /> Agregar producto
          </Button>
        }
      >
        {items.length === 0 ? (
          <p className="text-muted text-[15px]">Todavía no hay productos en el inventario.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Existencias</caption>
              <thead className="text-muted text-sm">
                <tr>
                  {["Producto", "Existencias", "Avisar desde", "Se descuenta de", "Estado", ""].map(
                    (h, i) => (
                      <th key={i} scope="col" className="py-2 pr-4 font-medium">
                        {h || <span className="sr-only">Acciones</span>}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {items.map((item) => {
                  const level = stockLevel(item);
                  return (
                    <tr key={item.id} className="align-middle">
                      <th scope="row" className="py-2.5 pr-4 font-medium">
                        {item.name}
                      </th>
                      <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                        <strong>{fmtQty(item.qty)}</strong>{" "}
                        <span className="text-muted">{item.unit}</span>
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">{fmtQty(item.threshold)}</td>
                      <td className="text-ink-soft py-2.5 pr-4">{dishName(item)}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={LEVEL_TONE[level]}>{STOCK_LABEL[level]}</Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setMoving({ item, kind: "entrada" })}
                          >
                            <Plus aria-hidden /> Entrada
                            <span className="sr-only"> de {item.name}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setMoving({ item, kind: "salida" })}
                          >
                            <Minus aria-hidden /> Salida
                            <span className="sr-only"> de {item.name}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setMoving({ item, kind: "ajuste" })}
                          >
                            <SlidersHorizontal aria-hidden /> Ajustar
                            <span className="sr-only"> {item.name}</span>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                            <Pencil aria-hidden /> Editar
                            <span className="sr-only"> {item.name}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <ItemDialog
          item={editing === "nuevo" ? null : editing}
          dishes={dishes}
          onClose={() => setEditing(null)}
        />
      )}
      {moving && <MoveDialog {...moving} onClose={() => setMoving(null)} />}
    </>
  );
}

const MOVE_COPY: Record<ManualKind, { title: string; amount: string; cta: string }> = {
  entrada: { title: "Entrada", amount: "Cantidad que llega", cta: "Registrar entrada" },
  salida: { title: "Salida", amount: "Cantidad que sale", cta: "Registrar salida" },
  ajuste: { title: "Ajuste", amount: "Cantidad contada", cta: "Guardar ajuste" },
};

function MoveDialog({
  item,
  kind,
  onClose,
}: {
  item: InventoryItem;
  kind: ManualKind;
  onClose: () => void;
}) {
  const copy = MOVE_COPY[kind];
  const reasons = MANUAL_REASONS[kind];
  const [amount, setAmount] = useState(kind === "ajuste" ? fmtQty(item.qty) : "");
  const [reason, setReason] = useState(reasons[0]!);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string>();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = detail.trim() ? `${reason}: ${detail.trim()}` : reason;
    const r = inventoryActions.move(item.id, kind, parseQty(amount), text);
    if (!r.ok) return setError(r.error);
    toast.success(`${copy.title} de ${item.name} registrada`);
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${copy.title} · ${item.name}`}
      description={`Ahora hay ${fmtQty(item.qty)} ${item.unit}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="movimiento-form">
            {copy.cta}
          </Button>
        </>
      }
    >
      <form id="movimiento-form" onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <Field label={copy.amount} error={error}>
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.,]/g, ""));
                setError(undefined);
              }}
            />
          )}
        </Field>
        <Field label="Motivo">
          {(p) => (
            <Select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Detalle" optional>
          {(p) => <Input {...p} value={detail} onChange={(e) => setDetail(e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}

function ItemDialog({
  item,
  dishes,
  onClose,
}: {
  item: InventoryItem | null;
  dishes: readonly Dish[];
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ItemDraft>(() =>
    item
      ? {
          name: item.name,
          unit: item.unit,
          qty: fmtQty(item.qty),
          threshold: fmtQty(item.threshold),
          dishId: item.link?.dishId ?? "",
          variantId: item.link?.variantId ?? "",
        }
      : emptyItemDraft(),
  );
  const [errors, setErrors] = useState<ItemErrors>({});
  const dish = dishes.find((d) => d.id === draft.dishId);
  const set = (patch: Partial<ItemDraft>) => setDraft((d) => ({ ...d, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = item ? inventoryActions.updateItem(item.id, draft) : inventoryActions.addItem(draft);
    if (!r.ok) {
      if (r.errors) return setErrors(r.errors);
      return toast.error(r.error);
    }
    toast.success(item ? "Cambios guardados" : `${draft.name.trim()} agregado`);
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={item ? `Editar ${item.name}` : "Agregar un producto"}
      description="Si lo vinculas a un plato, baja solo cuando ese plato se confirma. Las existencias cambian con entradas, salidas y ajustes."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="producto-form">
            Guardar
          </Button>
        </>
      }
    >
      <form id="producto-form" onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <Field label="Nombre" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={draft.name}
              autoComplete="off"
              onChange={(e) => set({ name: e.target.value })}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad" error={errors.unit}>
            {(p) => (
              <Input {...p} value={draft.unit} onChange={(e) => set({ unit: e.target.value })} />
            )}
          </Field>
          <Field label="Avisar desde" error={errors.threshold}>
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={draft.threshold}
                onChange={(e) => set({ threshold: e.target.value.replace(/[^\d.,]/g, "") })}
              />
            )}
          </Field>
        </div>
        {!item && (
          <Field label="Existencias iniciales" error={errors.qty}>
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={draft.qty}
                onChange={(e) => set({ qty: e.target.value.replace(/[^\d.,]/g, "") })}
              />
            )}
          </Field>
        )}
        <Field label="Se descuenta del plato" optional error={errors.dishId}>
          {(p) => (
            <Select
              {...p}
              value={draft.dishId}
              onChange={(e) => set({ dishId: e.target.value, variantId: "" })}
            >
              <option value="">Ninguno: solo llevar la cuenta</option>
              {dishes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {dish && dish.variants.length > 1 && (
          <Field label="Opción del plato">
            {(p) => (
              <Select
                {...p}
                value={draft.variantId}
                onChange={(e) => set({ variantId: e.target.value })}
              >
                <option value="">Todas las opciones</option>
                {dish.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </form>
    </Dialog>
  );
}

/* ——— Recetas ——— */

function Recipes({ items }: { items: readonly InventoryItem[] }) {
  const recipes = useRecipes();
  const dishes = useDishes();
  const [editing, setEditing] = useState<Recipe | "nueva" | null>(null);
  const [removing, setRemoving] = useState<Recipe | null>(null);
  const label = (r: Recipe) => {
    const dish = dishes.find((d) => d.id === r.dishId);
    const variant = dish?.variants.find((v) => v.id === r.variantId);
    return `${dish?.name ?? "Plato eliminado"}${variant ? ` · ${variant.name}` : ""}`;
  };

  return (
    <>
      <Panel
        title="Recetas"
        description="Con la receta, cada plato gasta sus ingredientes clave al confirmarse. Si falta uno, el plato queda agotado. El tope diario limita cuántos se venden por día."
        action={
          <Button size="sm" onClick={() => setEditing("nueva")}>
            <ChefHat aria-hidden /> Agregar receta
          </Button>
        }
      >
        {recipes.length === 0 ? (
          <p className="text-muted text-[15px]">Todavía no hay recetas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Recetas</caption>
              <thead className="text-muted text-sm">
                <tr>
                  {["Plato", "Ingredientes por unidad", "Alcanza para", "Tope diario", ""].map(
                    (h, i) => (
                      <th key={i} scope="col" className="py-2 pr-4 font-medium">
                        {h || <span className="sr-only">Acciones</span>}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {recipes.map((r) => {
                  const limit = limitingItem(r, items);
                  const portions = recipePortions(r, items);
                  return (
                    <tr key={r.id} className="align-top">
                      <th scope="row" className="py-2.5 pr-4 font-medium">
                        {label(r)}
                      </th>
                      <td className="text-ink-soft py-2.5 pr-4">
                        {r.lines
                          .map((l) => {
                            const item = items.find((i) => i.id === l.itemId);
                            return `${fmtQty(l.qty)} ${item?.unit ?? ""} de ${item?.name ?? "producto eliminado"}`;
                          })
                          .join(" · ")}
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                        <strong>{plural(portions, "plato", "platos")}</strong>
                        {limit && portions < 10 && (
                          <span className="text-muted block text-sm">
                            Se acaba {limit.item.name}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">{r.dailyMax ?? "Sin tope"}</td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                            <Pencil aria-hidden /> Editar
                            <span className="sr-only"> receta de {label(r)}</span>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRemoving(r)}>
                            Quitar<span className="sr-only"> receta de {label(r)}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {editing && (
        <RecipeDialog
          recipe={editing === "nueva" ? null : editing}
          items={items}
          dishes={dishes}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <Dialog
          open
          onOpenChange={(o) => !o && setRemoving(null)}
          title={`Quitar la receta de ${label(removing)}`}
          description="El plato deja de gastar ingredientes al confirmarse. Lo ya descontado no cambia."
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const r = inventoryActions.removeRecipe(removing.id);
                  if (!r.ok) return toast.error(r.error);
                  toast.success("Receta quitada");
                  setRemoving(null);
                }}
              >
                Quitar receta
              </Button>
            </>
          }
        />
      )}
    </>
  );
}

function RecipeDialog({
  recipe,
  items,
  dishes,
  onClose,
}: {
  recipe: Recipe | null;
  items: readonly InventoryItem[];
  dishes: readonly Dish[];
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<RecipeDraft>(() =>
    recipe ? recipeToDraft(recipe) : emptyRecipeDraft(),
  );
  const [errors, setErrors] = useState<RecipeErrors>({});
  const dish = dishes.find((d) => d.id === draft.dishId);
  const set = (patch: Partial<RecipeDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setLine = (i: number, patch: Partial<RecipeDraft["lines"][number]>) =>
    set({ lines: draft.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = inventoryActions.saveRecipe(draft, recipe?.id);
    if (!r.ok) {
      if (r.errors) return setErrors(r.errors);
      return toast.error(r.error);
    }
    toast.success("Receta guardada");
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={recipe ? "Editar receta" : "Agregar una receta"}
      description="Escribe solo los ingredientes clave y lo que gasta una unidad del plato."
      className="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="receta-form">
            Guardar receta
          </Button>
        </>
      }
    >
      <form id="receta-form" onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <Field label="Plato" error={errors.dishId}>
          {(p) => (
            <Select
              {...p}
              value={draft.dishId}
              onChange={(e) => set({ dishId: e.target.value, variantId: "" })}
            >
              <option value="">Elige un plato</option>
              {dishes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {dish && dish.variants.length > 1 && (
          <Field label="Opción del plato">
            {(p) => (
              <Select
                {...p}
                value={draft.variantId}
                onChange={(e) => set({ variantId: e.target.value })}
              >
                <option value="">Todas las opciones</option>
                {dish.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Ingredientes por unidad</legend>
          {draft.lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                aria-label={`Producto del ingrediente ${i + 1}`}
                value={l.itemId}
                onChange={(e) => setLine(i, { itemId: e.target.value })}
                className="min-w-0 flex-1"
              >
                <option value="">Elige un producto</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.unit})
                  </option>
                ))}
              </Select>
              <Input
                aria-label={`Cantidad del ingrediente ${i + 1}`}
                inputMode="decimal"
                placeholder="0,15"
                className="w-24"
                value={l.qty}
                onChange={(e) => setLine(i, { qty: e.target.value.replace(/[^\d.,]/g, "") })}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={draft.lines.length === 1}
                onClick={() => set({ lines: draft.lines.filter((_, j) => j !== i) })}
              >
                Quitar<span className="sr-only"> ingrediente {i + 1}</span>
              </Button>
            </div>
          ))}
          {errors.lines && (
            <p role="alert" className="text-danger-ink text-sm">
              {errors.lines}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="self-start"
            onClick={() => set({ lines: [...draft.lines, { itemId: "", qty: "" }] })}
          >
            <Plus aria-hidden /> Agregar ingrediente
          </Button>
        </fieldset>
        <Field
          label="Tope diario de ventas"
          optional
          hint="Cuántas unidades se pueden vender al día. Vacío: sin tope."
          error={errors.dailyMax}
        >
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={draft.dailyMax}
              onChange={(e) => set({ dailyMax: e.target.value.replace(/\D/g, "") })}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

/* ——— Movimientos ——— */

function Movements({ items }: { items: readonly InventoryItem[] }) {
  const moves = useInventoryMoves();
  const period = usePeriod("7d");
  const [itemId, setItemId] = useState("");
  const [kind, setKind] = useState<InventoryMoveKind | "">("");
  const rows = useMemo(
    () => filterMoves(moves, { itemId, kind: kind || undefined, period: period.period }),
    [moves, itemId, kind, period.period],
  );
  const sum = summarizeMoves(rows);
  const name = (id: string) => items.find((i) => i.id === id)?.name ?? id;

  return (
    <>
      <Panel title="Filtros">
        <div className="flex flex-col gap-4">
          <PeriodFilter state={period} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Producto
              <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Todos</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Movimiento
              <Select
                value={kind}
                onChange={(e) => setKind(e.target.value as InventoryMoveKind | "")}
              >
                <option value="">Todos</option>
                {(Object.keys(MOVE_LABEL) as InventoryMoveKind[]).map((k) => (
                  <option key={k} value={k}>
                    {MOVE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Entradas" value={sum.entered} note="unidades que llegaron" />
        <StatTile label="Vendido" value={sum.sold} note="descontado por pedidos" />
        <StatTile label="Salidas" value={sum.out} note="dañado, consumo interno…" />
      </div>

      <Panel
        title="Movimientos"
        description={`${plural(rows.length, "movimiento", "movimientos")} · ${describePeriod(period.period)}, del más reciente al más antiguo.`}
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => download("inventario.csv", movesCsvRows(rows, items))}
          >
            <Download aria-hidden /> CSV<span className="sr-only"> de los movimientos</span>
          </Button>
        }
      >
        {rows.length === 0 ? (
          <p className="text-muted text-[15px]">No hay movimientos con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Movimientos</caption>
              <thead className="text-muted text-sm">
                <tr>
                  {["Cuándo", "Producto", "Movimiento", "Cambio", "Quedan", "Quién", "Motivo"].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className={`py-2 pr-4 font-medium ${h === "Cambio" || h === "Quedan" ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {rows.slice(0, 200).map((m) => (
                  <tr key={m.id} className="align-top">
                    <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                      {formatDay(new Date(m.at))}
                      <span className="text-muted"> · {formatTime(new Date(m.at))}</span>
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{name(m.itemId)}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{MOVE_LABEL[m.kind]}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{m.balance}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{m.by}</td>
                    <td className="text-ink-soft py-2.5">{m.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && (
              <p className="text-muted mt-3 text-sm">
                Se muestran los 200 más recientes. Descarga el CSV para ver todos.
              </p>
            )}
          </div>
        )}
      </Panel>
    </>
  );
}
