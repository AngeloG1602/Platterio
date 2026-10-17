import { fmtQty, round3, type InventoryResult, type InventoryState } from "./inventory";
import { unitCost } from "./costing";
import type { InventoryItem, InventoryMove, Preparation, Recipe, StockCount } from "./types";

/**
 * Conteo físico y desviaciones. Las recetas dan lo que debería haberse gastado; el conteo dice lo
 * que hay de verdad. La diferencia entre las dos (merma, desperdicio, porciones grandes, robo) es lo
 * que se le muestra al dueño, y si se repite el sistema propone ajustar las recetas. Nada se
 * ajusta solo: el dueño decide.
 */

export interface CountInput {
  itemId: string;
  counted: number;
  /** Solo en el cierre del día: dar de baja lo contado (se bota lo que sobró). */
  discard?: boolean;
}

/**
 * Registra un conteo: cada diferencia queda como un ajuste con motivo «Conteo físico» (o «Cierre
 * del día»). Solo se cuentan las líneas que traen cantidad. Todo o nada.
 */
export function applyCount(
  state: InventoryState,
  lines: readonly CountInput[],
  options: { scope: StockCount["scope"]; by: string; now: string; id: string },
): InventoryResult<{ state: InventoryState; count: StockCount }> {
  if (lines.length === 0)
    return { ok: false, error: "Escribe lo que contaste de al menos un producto" };
  const reason = options.scope === "cierre" ? "Cierre del día" : "Conteo físico";
  const seen = new Set<string>();
  const items = new Map(state.items.map((i) => [i.id, i]));
  const moves: InventoryMove[] = [];
  const out: StockCount["lines"] = [];
  for (const line of lines) {
    const item = items.get(line.itemId);
    if (!item) return { ok: false, error: "Hay un producto que ya no existe" };
    if (seen.has(line.itemId))
      return { ok: false, error: `${item.name} está repetido en el conteo` };
    seen.add(line.itemId);
    if (!Number.isFinite(line.counted) || line.counted < 0 || round3(line.counted) !== line.counted)
      return { ok: false, error: `Revisa lo contado de ${item.name}` };
    const diff = round3(line.counted - item.qty);
    out.push({
      itemId: item.id,
      name: item.name,
      unit: item.unit,
      expected: item.qty,
      counted: line.counted,
      diff,
      ...(item.cost !== undefined ? { cost: item.cost } : {}),
    });
    let balance = item.qty;
    if (diff !== 0) {
      balance = line.counted;
      moves.push({
        id: `${options.id}-${item.id}`,
        itemId: item.id,
        at: options.now,
        by: options.by,
        kind: "ajuste",
        delta: diff,
        balance,
        reason,
      });
    }
    if (line.discard && options.scope === "cierre" && balance > 0) {
      moves.push({
        id: `${options.id}-${item.id}-baja`,
        itemId: item.id,
        at: options.now,
        by: options.by,
        kind: "salida",
        delta: -balance,
        balance: 0,
        reason: "Sobró del día",
      });
      balance = 0;
    }
    items.set(item.id, { ...item, qty: balance });
  }
  return {
    ok: true,
    value: {
      state: {
        ...state,
        items: state.items.map((i) => items.get(i.id) ?? i),
        moves: [...state.moves, ...moves],
      },
      count: { id: options.id, at: options.now, by: options.by, scope: options.scope, lines: out },
    },
  };
}

export interface Deviation {
  itemId: string;
  name: string;
  unit: string;
  /** Conteos de este producto que entran en el cálculo. */
  counts: number;
  /** Lo que faltó (positivo) o sobró (negativo) en total frente a lo esperado. */
  missing: number;
  /** Lo que se gastó según el sistema (pedidos y producción) en ese tiempo. */
  consumed: number;
  /** Faltante sobre lo gastado: 0,12 = se gastó 12 % más de lo que dicen las recetas. */
  pct: number | undefined;
  /** Valor del faltante en pesos, si se sabe el costo. */
  value: number | undefined;
}

/**
 * Desviaciones por producto: lo que faltó en cada conteo, frente a lo que el sistema dice que se
 * gastó desde el conteo anterior de ese producto.
 */
export function deviations(
  counts: readonly StockCount[],
  moves: readonly InventoryMove[],
  items: readonly InventoryItem[],
  preps: readonly Preparation[] = [],
): Deviation[] {
  const byItem = new Map<string, { at: number; diff: number }[]>();
  for (const c of [...counts].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)))
    for (const l of c.lines)
      byItem.set(l.itemId, [
        ...(byItem.get(l.itemId) ?? []),
        { at: Date.parse(c.at), diff: l.diff },
      ]);
  const out: Deviation[] = [];
  for (const [itemId, list] of byItem) {
    const item = items.find((i) => i.id === itemId);
    if (!item) continue;
    let missing = 0;
    let consumed = 0;
    let prev = -Infinity;
    for (const c of list) {
      missing += -c.diff;
      for (const m of moves) {
        if (m.itemId !== itemId) continue;
        const t = Date.parse(m.at);
        if (t <= prev || t > c.at) continue;
        const spends =
          m.kind === "consumo" ||
          m.kind === "devolucion" ||
          (m.kind === "produccion" && m.delta < 0);
        if (spends) consumed += -m.delta;
      }
      prev = c.at;
    }
    const cost = unitCost(item, items, preps);
    out.push({
      itemId,
      name: item.name,
      unit: item.unit,
      counts: list.length,
      missing: round3(missing),
      consumed: round3(consumed),
      pct: consumed > 0 ? round3(missing / consumed) : undefined,
      value: cost !== undefined ? Math.round(missing * cost) : undefined,
    });
  }
  return out.sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || b.missing - a.missing);
}

/** Cuánto es una desviación grande como para proponer ajustar las recetas. */
export const CALIBRATION_THRESHOLD = 0.05;

export interface Calibration {
  itemId: string;
  name: string;
  /** Cuánto cambiarían las cantidades: +0,12 sube 12 %. */
  percent: number;
  recipes: number;
  preparations: number;
  text: string;
}

/**
 * Sugerencias de ajuste: con al menos dos conteos y una desviación sostenida, propone subir (o
 * bajar) las cantidades de las recetas y preparaciones que usan el producto.
 */
export function calibrations(
  devs: readonly Deviation[],
  recipes: readonly Recipe[],
  preps: readonly Preparation[],
): Calibration[] {
  const out: Calibration[] = [];
  for (const d of devs) {
    if (d.counts < 2 || d.pct === undefined || Math.abs(d.pct) < CALIBRATION_THRESHOLD) continue;
    const r = recipes.filter((x) => x.lines.some((l) => l.itemId === d.itemId)).length;
    const p = preps.filter((x) => x.lines.some((l) => l.itemId === d.itemId)).length;
    if (r + p === 0) continue;
    const pct = Math.round(Math.abs(d.pct) * 100);
    out.push({
      itemId: d.itemId,
      name: d.name,
      percent: d.pct,
      recipes: r,
      preparations: p,
      text:
        d.pct > 0
          ? `${d.name} se gastó ${pct} % más de lo que dicen tus recetas (faltaron ${fmtQty(d.missing)} ${d.unit}).`
          : `${d.name} se gastó ${pct} % menos de lo que dicen tus recetas (sobraron ${fmtQty(-d.missing)} ${d.unit}).`,
    });
  }
  return out;
}

/** Aplica la sugerencia: cambia la cantidad del producto en las recetas y preparaciones que lo usan. */
export function applyCalibration(
  recipes: readonly Recipe[],
  preps: readonly Preparation[],
  itemId: string,
  percent: number,
): { recipes: Recipe[]; preparations: Preparation[] } {
  const scale = (qty: number) => Math.max(0.001, round3(qty * (1 + percent)));
  const lines = <L extends { itemId: string; qty: number }>(ls: L[]) =>
    ls.map((l) => (l.itemId === itemId ? { ...l, qty: scale(l.qty) } : l));
  return {
    recipes: recipes.map((r) => ({ ...r, lines: lines(r.lines) })),
    preparations: preps.map((p) => ({ ...p, lines: lines(p.lines) })),
  };
}
