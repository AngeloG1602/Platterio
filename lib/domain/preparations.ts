import { fmtQty, parseQty, round3, type InventoryResult, type InventoryState } from "./inventory";
import type { InventoryItem, InventoryMove, Preparation, Recipe } from "./types";

/**
 * Preparaciones por lote (lasaña, sopa, arroz). El gasto real de estos platos ocurre al cocinar,
 * no al vender: por eso se registra la **producción** de un lote (gasta ingredientes y suma
 * porciones) y cada venta descuenta una porción. Las porciones son un producto de inventario más,
 * así que el agotado, los avisos, los ajustes y el informe de movimientos funcionan igual.
 * Una preparación puede usar porciones de otra (sub-recetas: la salsa de la lasaña).
 */

export interface PrepState extends InventoryState {
  preparations: Preparation[];
}

export interface PreparationDraft {
  name: string;
  /** Plato (y opción) que vende estas porciones. */
  dishId: string;
  variantId: string;
  yield: string;
  /** Con cuántas porciones se avisa que quedan pocas. */
  threshold: string;
  /** Unidad de lo que rinde: "porciones" por defecto; una salsa puede rendir "litros". */
  unit: string;
  lines: { itemId: string; qty: string }[];
}

export interface PreparationErrors {
  name?: string;
  dishId?: string;
  yield?: string;
  threshold?: string;
  lines?: string;
}

export const emptyPreparationDraft = (): PreparationDraft => ({
  name: "",
  dishId: "",
  variantId: "",
  yield: "10",
  threshold: "3",
  unit: "porciones",
  lines: [{ itemId: "", qty: "" }],
});

/** Preparaciones que usan el producto `itemId` como ingrediente. */
const usersOf = (preps: readonly Preparation[], itemId: string) =>
  preps.filter((p) => p.lines.some((l) => l.itemId === itemId));

/** ¿Producir `prep` terminaría gastando su propio producto? (A usa B y B usa A) */
function hasCycle(
  prep: { outputItemId: string; lines: { itemId: string }[] },
  all: readonly Preparation[],
) {
  const seen = new Set<string>();
  const walk = (itemId: string): boolean => {
    if (itemId === prep.outputItemId) return true;
    if (seen.has(itemId)) return false;
    seen.add(itemId);
    const maker = all.find((p) => p.outputItemId === itemId);
    return maker ? maker.lines.some((l) => walk(l.itemId)) : false;
  };
  return prep.lines.some((l) => walk(l.itemId));
}

export function validatePreparation(
  draft: PreparationDraft,
  items: readonly InventoryItem[],
  preps: readonly Preparation[],
  recipes: readonly Recipe[],
  editingId?: string,
): PreparationErrors {
  const errors: PreparationErrors = {};
  const name = draft.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Escribe el nombre de la preparación";
  else if (preps.some((p) => p.id !== editingId && p.name.toLowerCase() === name.toLowerCase()))
    errors.name = "Ya hay una preparación con ese nombre";
  if (!(parseQty(draft.yield) > 0)) errors.yield = "Escribe cuánto rinde un lote (mayor que cero)";
  if (!Number.isFinite(parseQty(draft.threshold)))
    errors.threshold = "Escribe desde cuántas porciones avisar (0 o más)";

  const editing = preps.find((p) => p.id === editingId);
  if (draft.dishId) {
    const clash = items.find(
      (i) =>
        i.id !== editing?.outputItemId &&
        i.link?.dishId === draft.dishId &&
        (i.link.variantId ?? "") === draft.variantId,
    );
    if (clash) errors.dishId = `${clash.name} ya está vinculado a ese plato`;
    else if (
      recipes.some(
        (r) =>
          r.dishId === draft.dishId && (!r.variantId || (r.variantId ?? "") === draft.variantId),
      )
    )
      errors.dishId = "Ese plato tiene una receta por venta. Quítala: se vende por lote";
  }

  const lines = draft.lines.filter((l) => l.itemId || l.qty.trim());
  if (lines.length === 0) errors.lines = "Agrega al menos un ingrediente";
  else if (lines.some((l) => !items.some((i) => i.id === l.itemId)))
    errors.lines = "Elige el producto de cada ingrediente";
  else if (new Set(lines.map((l) => l.itemId)).size !== lines.length)
    errors.lines = "Un producto no puede repetirse en la preparación";
  else if (lines.some((l) => !(parseQty(l.qty) > 0)))
    errors.lines = "Escribe cuánto gasta un lote de cada ingrediente (mayor que cero)";
  else if (editing && lines.some((l) => l.itemId === editing.outputItemId))
    errors.lines = "Una preparación no puede gastar su propio producto";
  else if (
    editing &&
    hasCycle(
      { outputItemId: editing.outputItemId, lines },
      preps.filter((p) => p.id !== editing.id),
    )
  )
    errors.lines = "Esas preparaciones se usan entre sí: una no puede depender de la otra";
  return errors;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "preparacion";

const uniqueId = (base: string, taken: readonly { id: string }[]) => {
  let id = base;
  for (let n = 2; taken.some((t) => t.id === id); n++) id = `${base}-${n}`;
  return id;
};

const linkOf = (draft: PreparationDraft): InventoryItem["link"] =>
  draft.dishId
    ? { dishId: draft.dishId, ...(draft.variantId ? { variantId: draft.variantId } : {}) }
    : undefined;

const toLines = (draft: PreparationDraft) =>
  draft.lines.filter((l) => l.itemId).map((l) => ({ itemId: l.itemId, qty: parseQty(l.qty) }));

/** Crea la preparación y su producto de porciones (sin existencias: se llena produciendo). */
export function addPreparation(
  state: PrepState,
  draft: PreparationDraft,
  recipes: readonly Recipe[],
  now: string,
): InventoryResult<PrepState> {
  if (Object.keys(validatePreparation(draft, state.items, state.preparations, recipes)).length > 0)
    return { ok: false, error: "Revisa los datos de la preparación" };
  const name = draft.name.trim().replace(/\s+/g, " ");
  const base = slug(name);
  const itemId = uniqueId(`${base}-porciones`, state.items);
  const link = linkOf(draft);
  const item: InventoryItem = {
    id: itemId,
    name: `${name} (${draft.unit.trim() || "porciones"})`,
    unit: draft.unit.trim() || "porciones",
    qty: 0,
    threshold: parseQty(draft.threshold),
    ...(link ? { link } : {}),
    createdAt: now,
  };
  const prep: Preparation = {
    id: uniqueId(base, state.preparations),
    name,
    outputItemId: itemId,
    yield: parseQty(draft.yield),
    lines: toLines(draft),
    createdAt: now,
  };
  return {
    ok: true,
    value: {
      ...state,
      items: [...state.items, item],
      preparations: [...state.preparations, prep],
    },
  };
}

export function updatePreparation(
  state: PrepState,
  id: string,
  draft: PreparationDraft,
  recipes: readonly Recipe[],
): InventoryResult<PrepState> {
  const prep = state.preparations.find((p) => p.id === id);
  if (!prep) return { ok: false, error: "Esa preparación no existe" };
  if (
    Object.keys(validatePreparation(draft, state.items, state.preparations, recipes, id)).length > 0
  )
    return { ok: false, error: "Revisa los datos de la preparación" };
  const name = draft.name.trim().replace(/\s+/g, " ");
  const link = linkOf(draft);
  return {
    ok: true,
    value: {
      ...state,
      items: state.items.map((i) => {
        if (i.id !== prep.outputItemId) return i;
        const { link: _old, ...rest } = i;
        void _old;
        const unit = draft.unit.trim() || i.unit;
        return {
          ...rest,
          name: `${name} (${unit})`,
          unit,
          threshold: parseQty(draft.threshold),
          ...(link ? { link } : {}),
        };
      }),
      preparations: state.preparations.map((p) =>
        p.id === id ? { ...p, name, yield: parseQty(draft.yield), lines: toLines(draft) } : p,
      ),
    },
  };
}

/** Quita la preparación. Su producto de porciones se queda con lo que tenga, sin vínculo de receta. */
export function removePreparation(state: PrepState, id: string): InventoryResult<PrepState> {
  const prep = state.preparations.find((p) => p.id === id);
  if (!prep) return { ok: false, error: "Esa preparación no existe" };
  const dependents = usersOf(
    state.preparations.filter((p) => p.id !== id),
    prep.outputItemId,
  );
  if (dependents.length > 0)
    return {
      ok: false,
      error: `${dependents[0]!.name} usa esta preparación. Quítala de esa receta primero.`,
    };
  return {
    ok: true,
    value: { ...state, preparations: state.preparations.filter((p) => p.id !== id) },
  };
}

/** Cuántos lotes alcanzan con lo que hay. */
export function batchesPossible(prep: Preparation, items: readonly InventoryItem[]): number {
  const counts = prep.lines.map((l) => {
    const item = items.find((i) => i.id === l.itemId);
    return item ? Math.max(0, Math.floor(round3(item.qty / l.qty) + 1e-9)) : 0;
  });
  return counts.length ? Math.min(...counts) : 0;
}

/** Lo que gastaría producir `batches` lotes, con lo que hay de cada ingrediente. */
export function productionNeeds(
  prep: Preparation,
  batches: number,
  items: readonly InventoryItem[],
) {
  return prep.lines.map((l) => {
    const item = items.find((i) => i.id === l.itemId);
    const need = round3(l.qty * batches);
    return {
      itemId: l.itemId,
      name: item?.name ?? "producto eliminado",
      unit: item?.unit ?? "",
      need,
      have: item?.qty ?? 0,
      enough: !!item && item.qty >= need,
    };
  });
}

/**
 * Registra la producción de `batches` lotes: gasta los ingredientes y suma las porciones. Todo o
 * nada: si falta un ingrediente no cambia nada. Los movimientos llevan el mismo motivo para
 * poder ver juntos lo gastado y lo producido.
 */
export function produce(
  state: PrepState,
  input: { preparationId: string; batches: number },
  by: string,
  now: string,
  moveId: string,
): InventoryResult<PrepState> {
  const prep = state.preparations.find((p) => p.id === input.preparationId);
  if (!prep) return { ok: false, error: "Esa preparación no existe" };
  const { batches } = input;
  if (!(batches > 0) || round3(batches) !== batches || batches > 1000)
    return { ok: false, error: "Escribe cuántos lotes (mayor que cero, hasta 3 decimales)" };
  const out = state.items.find((i) => i.id === prep.outputItemId);
  if (!out) return { ok: false, error: "Falta el producto de las porciones" };
  const needs = productionNeeds(prep, batches, state.items);
  const short = needs.find((n) => !n.enough);
  if (short)
    return {
      ok: false,
      error: `No alcanza ${short.name}: quedan ${fmtQty(short.have)} y se necesitan ${fmtQty(short.need)}.`,
    };

  const reason = `Producción: ${fmtQty(batches)} × ${prep.name}`;
  const moves: InventoryMove[] = [];
  const qtyOf = new Map(state.items.map((i) => [i.id, i.qty]));
  for (const n of needs) {
    const balance = round3((qtyOf.get(n.itemId) ?? 0) - n.need);
    qtyOf.set(n.itemId, balance);
    moves.push({
      id: `${moveId}-${n.itemId}`,
      itemId: n.itemId,
      at: now,
      by,
      kind: "produccion",
      delta: -n.need,
      balance,
      reason,
    });
  }
  const made = round3(prep.yield * batches);
  const outBalance = round3((qtyOf.get(out.id) ?? 0) + made);
  qtyOf.set(out.id, outBalance);
  moves.push({
    id: `${moveId}-${out.id}`,
    itemId: out.id,
    at: now,
    by,
    kind: "produccion",
    delta: made,
    balance: outBalance,
    reason,
  });
  return {
    ok: true,
    value: {
      ...state,
      items: state.items.map((i) => (qtyOf.has(i.id) ? { ...i, qty: qtyOf.get(i.id)! } : i)),
      moves: [...state.moves, ...moves],
    },
  };
}
