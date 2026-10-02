import type { DishCustomizationSpec } from "@/lib/domain/customization";
import type { RealPartRule } from "./real-models";
import type { StackLayer } from "./stack";

/**
 * Cómo se arma cada plato en 3D:
 * - "pila": capas una sobre otra (hamburguesas, sándwiches, perros).
 * - "plato": componentes repartidos sobre el plato (platos a la carta: calentado, bandeja,
 *   churrasco…). Cada ranura tiene su lugar; al separar, todo se levanta del plato.
 * Es puro: se prueba sin WebGL.
 */

export interface Placement {
  x: number;
  z: number;
  /** Giro sobre el eje vertical (radianes). */
  rot?: number;
  /** Escala de la pieza procedural (las piezas se diseñaron al tamaño de una hamburguesa). */
  scale?: number;
  /** Ranura sobre la que va encima (el huevo sobre el arroz). */
  on?: string;
  /** Cuánto se hunde en la pieza de abajo (fracción de su alto), para que no quede flotando. */
  sink?: number;
  /** Radio de la zona que se toca, en unidades de la pieza (antes de escalar). */
  hit?: number;
  /** Desplazamiento de cada unidad extra respecto a la anterior. */
  step?: [number, number];
}

export type DishLayout = { type: "pila" } | { type: "plato"; places: Record<string, Placement> };

const DISH_LAYOUTS: Record<string, DishLayout> = {
  "calentado-de-la-casa": {
    type: "plato",
    places: {
      calentado: { x: -1.6, z: 0.4, hit: 3.3, step: [0.9, -0.9] },
      huevo: {
        x: -1.4,
        z: 0.5,
        on: "calentado",
        sink: 0.05,
        scale: 0.46,
        hit: 4.2,
        step: [0.6, 1.4],
      },
      chorizo: { x: 3.1, z: -2.3, rot: 0.5, hit: 1.8, step: [0.6, 1.3] },
      arepa: { x: 3.4, z: 2.1, hit: 2.1, step: [0.5, 0.5] },
      aguacate: { x: -1.2, z: 4.6, rot: 0.2, scale: 0.5, hit: 4, step: [1.2, 0] },
      maduro: { x: -1.4, z: -4.3, rot: -0.15, hit: 2, step: [0.4, 0.9] },
    },
  },
};

export function layoutFor(dishId: string): DishLayout {
  return DISH_LAYOUTS[dishId] ?? { type: "pila" };
}

export interface PlacedLayer {
  layer: StackLayer;
  x: number;
  /** Centro de la pieza sobre el plato. */
  y: number;
  z: number;
  rot: number;
  scale: number;
  hit: number;
}

const unitOf = (layer: StackLayer) => Number(/_(\d+)$/.exec(layer.id)?.[1] ?? 1);

/**
 * Ubica los componentes sobre el plato. Con `explode` en 1 se levantan (lo que va encima de
 * otra pieza sube más) y se abren un poco hacia afuera, para ver cada uno por separado.
 */
export function placeOnPlate(
  layers: readonly StackLayer[],
  layout: Extract<DishLayout, { type: "plato" }>,
  explode: number,
): PlacedLayer[] {
  const e = Math.max(0, Math.min(1, explode));
  const tops = new Map<string, number>();
  const place = (layer: StackLayer, index: number): PlacedLayer => {
    const p = layout.places[layer.key] ?? {
      // Una ranura sin lugar definido va al borde del plato, repartida.
      x: Math.cos(index * 1.9) * 5,
      z: Math.sin(index * 1.9) * 5,
    };
    const scale = p.scale ?? 1;
    const unit = unitOf(layer) - 1;
    const [sx, sz] = p.step ?? [1.2, 0.4];
    const below = p.on ? (tops.get(p.on) ?? 0) : 0;
    const base = below * (1 - (p.sink ?? 0));
    const half = (layer.thickness * scale) / 2;
    if (unit === 0) tops.set(layer.key, base + half * 2);
    const level = p.on ? 2 : 1;
    const spread = 1 + 0.25 * e;
    return {
      layer,
      x: (p.x + sx * unit) * spread,
      z: (p.z + sz * unit) * spread,
      y: base + half + e * (1.6 * level + 0.6),
      rot: p.rot ?? 0,
      scale,
      hit: p.hit ?? 2,
    };
  };
  // Primero lo que va sobre el plato, después lo que va encima de otra pieza.
  const out = new Array<PlacedLayer>(layers.length);
  layers.forEach((l, i) => {
    if (!layout.places[l.key]?.on) out[i] = place(l, i);
  });
  layers.forEach((l, i) => {
    if (layout.places[l.key]?.on) out[i] = place(l, i);
  });
  return out;
}

/* ——— Convención de nombres de los modelos ——— */

/**
 * Lee los nombres de los nodos de un .glb y arma las reglas de piezas reales, sin escribir
 * código por cada plato. La convención:
 *   `carne` o `carne_1`      → la carne tal como viene (la ranura "carne")
 *   `carne@pollo`            → la carne reemplazada por "pollo"
 *   `pan_base`, `pan_tapa`   → las dos mitades del pan (también `pan_base@pan_papa`)
 * Lo que no calza con una ranura u opción del plato queda en `unknown`, para avisar.
 */
export function rulesFromNodeNames(
  names: readonly string[],
  spec: DishCustomizationSpec,
): { rules: RealPartRule[]; unknown: string[] } {
  const rules: RealPartRule[] = [];
  const unknown: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const [head = "", option] = name.split("@");
    const bread = /^pan_(base|tapa)$/.exec(head);
    const slotKey = bread ? "pan" : head.replace(/_\d+$/, "");
    const slot = spec.slots.find((s) => s.key === slotKey);
    const validOption = !option || slot?.replacements.some((o) => o.id === option);
    if (!slot || !validOption) {
      unknown.push(name);
      continue;
    }
    const part = bread?.[1] as "base" | "tapa" | undefined;
    // Si el modelo trae dos unidades (carne_1, carne_2), basta con una: las extra se repiten.
    const exists = rules.some((r) => r.slot === slotKey && r.option === option && r.part === part);
    if (!exists)
      rules.push({
        slot: slotKey,
        nodes: [name],
        ...(option ? { option } : {}),
        ...(part ? { part } : {}),
      });
  }
  return { rules, unknown };
}

export interface CoverageRow {
  slot: string;
  name: string;
  /** Opción (`undefined` = como viene) y si el modelo trae su pieza. */
  options: { id?: string; name: string; covered: boolean }[];
}

/** Qué ingredientes y opciones del plato tienen pieza real en el modelo. */
export function coverage(
  spec: DishCustomizationSpec,
  rules: readonly RealPartRule[],
): CoverageRow[] {
  const has = (slot: string, option?: string) =>
    rules.some((r) => r.slot === slot && r.option === option);
  return spec.slots.map((s) => ({
    slot: s.key,
    name: s.name,
    options: [
      { name: "Como viene", covered: has(s.key) },
      ...s.replacements.map((o) => ({ id: o.id, name: o.name, covered: has(s.key, o.id) })),
    ],
  }));
}
