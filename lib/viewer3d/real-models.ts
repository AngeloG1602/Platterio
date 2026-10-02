import type { StackLayer } from "./stack";

/**
 * Modelos 3D reales (escaneados o hechos por un modelador) y qué pieza del archivo usa cada
 * ingrediente. Si una capa no tiene pieza real (un reemplazo o un adicional que el modelo no
 * trae), el visor la dibuja con la versión procedural. Es puro: se prueba sin WebGL.
 */

export interface RealPartRule {
  /** Ranura del ingrediente (`pan`, `carne`, `queso`…). */
  slot: string;
  /** Opción de reemplazo; sin ella, la regla es para el ingrediente original. */
  option?: string;
  /** Solo para el pan: base o tapa. */
  part?: "base" | "tapa";
  /** Nodos del .glb que forman la pieza. */
  nodes: string[];
  /**
   * Color que se multiplica sobre la textura, para variantes del mismo ingrediente (la cebolla
   * morada del modelo, dorada, pasa por caramelizada).
   */
  tint?: string;
}

export interface RealModel {
  dishId: string;
  url: string;
  /** Crédito del autor (obligatorio con licencias CC BY). Sin él, es un modelo de prueba. */
  credit?: { title: string; author: string; source: string; license: string; licenseUrl: string };
  /** Nombre del archivo, para los modelos que se suben a probar. */
  fileName?: string;
  rules: RealPartRule[];
}

export const REAL_MODELS: RealModel[] = [
  {
    dishId: "clasica-27",
    url: "/modelos/hamburguesa-explosiva.glb",
    credit: {
      title: "Hamburguesa Explosiva Con Queso",
      author: "Roberto Domínguez",
      source: "Sketchfab",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.es",
    },
    rules: [
      { slot: "pan", part: "base", nodes: ["pan_base"] },
      { slot: "pan", part: "tapa", nodes: ["pan_tapa"] },
      { slot: "carne", nodes: ["carne_1"] },
      { slot: "queso", nodes: ["queso_1"] },
      { slot: "lechuga", nodes: ["lechuga_1"] },
      { slot: "tomate", nodes: ["tomate_1"] },
      // Las salsas usan las tiras de salsa del modelo, teñidas del color de cada una.
      { slot: "salsa", nodes: ["mostaza_1"], tint: "#FFF1D2" },
      { slot: "salsa", option: "mayo_chipotle", nodes: ["mostaza_1"], tint: "#F29A5C" },
      { slot: "salsa", option: "salsa_bbq", nodes: ["salsa_1"], tint: "#6E3A2C" },
      { slot: "cebolla", nodes: ["cebolla_1"], tint: "#D89A55" },
      { slot: "cebolla", option: "cebolla_morada", nodes: ["cebolla_1"] },
    ],
  },
];

export function realModelFor(dishId: string): RealModel | undefined {
  return REAL_MODELS.find((m) => m.dishId === dishId);
}

/** Regla de la pieza real para una capa, o `undefined` si esa capa va procedural. */
export function realRuleFor(
  model: RealModel,
  layer: Pick<StackLayer, "key" | "optionId" | "part">,
): RealPartRule | undefined {
  return model.rules.find(
    (r) =>
      r.slot === layer.key &&
      r.option === layer.optionId &&
      (r.part === undefined || r.part === layer.part),
  );
}

/** Nombre único de la pieza (nodos + tinte), para preparar cada una una sola vez. */
export const realPartId = (r: RealPartRule) => `${r.nodes.join("+")}${r.tint ? `@${r.tint}` : ""}`;
