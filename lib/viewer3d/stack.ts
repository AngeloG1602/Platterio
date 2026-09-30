import {
  resolveIngredients,
  type Customization,
  type DishCustomizationSpec,
  type ResolvedIngredient,
  type VisualKind,
} from "@/lib/domain/customization";

/**
 * Pila de capas del modelo 3D (de abajo hacia arriba) a partir de la personalización.
 * Es pura: el visor la dibuja y las pruebas la verifican sin WebGL.
 */

/** Grosor de cada tipo de capa en unidades de la escena (1 ≈ 1 cm). */
export const THICKNESS: Record<VisualKind | "pan_base" | "pan_tapa", number> = {
  pan_base: 0.55,
  pan_tapa: 1.25,
  pan: 0.55,
  envoltura_lechuga: 0.3,
  carne: 0.75,
  pollo: 0.8,
  vegetal: 0.75,
  queso: 0.12,
  lechuga: 0.28,
  tomate: 0.3,
  cebolla: 0.22,
  cebolla_crocante: 0.3,
  salsa: 0.08,
  tocineta: 0.18,
  huevo: 0.3,
  aguacate: 0.25,
  jalapeno: 0.15,
  pepinillo: 0.12,
};

export interface StackLayer {
  /** Único en la pila: `pan_base`, `carne_1`, `carne_2`… (nombre del nodo en el .glb). */
  id: string;
  /** Ranura de ingrediente a la que pertenece (para seleccionar y personalizar). */
  key: string;
  kind: VisualKind;
  /** Base o tapa del pan (el pan es una sola ranura con dos capas). */
  part?: "base" | "tapa";
  color: string;
  thickness: number;
  name: string;
  state: ResolvedIngredient["state"];
  /** Opción de reemplazo (para saber si hay pieza real del ingrediente original). */
  optionId?: string;
}

export function buildStack(
  spec: DishCustomizationSpec,
  c: Customization,
  variantId?: string,
): StackLayer[] {
  const resolved = resolveIngredients(spec, c, variantId);
  const bread = resolved.find(
    (r) => r.visual.kind === "pan" || r.visual.kind === "envoltura_lechuga",
  );
  const layers: StackLayer[] = [];
  const breadLayer = (part: "base" | "tapa"): StackLayer | null =>
    bread
      ? {
          id: `${bread.key}_${part}`,
          key: bread.key,
          kind: bread.visual.kind,
          part,
          color: bread.visual.color,
          thickness:
            bread.visual.kind === "pan"
              ? THICKNESS[part === "base" ? "pan_base" : "pan_tapa"]
              : THICKNESS.envoltura_lechuga,
          name: bread.name,
          state: bread.state,
          optionId: bread.optionId,
        }
      : null;

  const base = breadLayer("base");
  if (base) layers.push(base);
  for (const ing of resolved) {
    if (ing === bread) continue;
    for (let i = 1; i <= ing.units; i++) {
      layers.push({
        id: `${ing.key}_${i}`,
        key: ing.key,
        kind: ing.visual.kind,
        color: ing.visual.color,
        thickness: THICKNESS[ing.visual.kind],
        name: ing.name,
        state: ing.state,
        optionId: ing.optionId,
      });
    }
  }
  const top = breadLayer("tapa");
  if (top) layers.push(top);
  return layers;
}

/**
 * Altura (centro) de cada capa. Con `explode` en 0 van apiladas; en 1 se separan `gap` entre sí
 * para la vista de despiece.
 */
export function layerPositions(stack: readonly StackLayer[], explode: number, gap = 0.9): number[] {
  const e = Math.max(0, Math.min(1, explode));
  let y = 0;
  return stack.map((layer, i) => {
    const center = y + layer.thickness / 2 + i * gap * e;
    y += layer.thickness;
    return center;
  });
}

export function stackHeight(stack: readonly StackLayer[], explode = 0, gap = 0.9): number {
  if (stack.length === 0) return 0;
  const last = stack.length - 1;
  return layerPositions(stack, explode, gap)[last]! + stack[last]!.thickness / 2;
}
