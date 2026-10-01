import type {
  DishCustomizationSpec,
  IngredientOption,
  IngredientSlot,
  Visual,
} from "@/lib/domain/customization";

/**
 * Personalización de las tres hamburguesas con modelo 3D (laboratorio).
 * El orden de las ranuras es el orden de las capas de abajo hacia arriba (el pan va en los dos
 * extremos). Los alérgenos por defecto coinciden con el catálogo (lo verifica una prueba).
 */

const V = (kind: Visual["kind"], color: string): Visual => ({ kind, color });

const BREAD = {
  brioche: V("pan", "#D98E3A"),
  papa: V("pan", "#E3A95C"),
  sinGluten: V("pan", "#E9C78A"),
  lechuga: V("envoltura_lechuga", "#6BA539"),
};

const opt = (
  id: string,
  name: string,
  priceDelta: number,
  allergens: IngredientOption["allergens"],
  visual?: Visual,
  description?: string,
): IngredientOption => ({
  id,
  name,
  priceDelta,
  allergens,
  ...(visual ? { visual } : {}),
  ...(description ? { description } : {}),
});

function slot(
  s: Partial<IngredientSlot> & Pick<IngredientSlot, "key" | "name" | "visual">,
): IngredientSlot {
  return {
    allergens: [],
    included: true,
    removable: true,
    maxExtra: 0,
    extraPrice: 0,
    replacements: [],
    ...s,
  };
}

const breadReplacements = (current: "brioche" | "papa") => [
  current === "brioche"
    ? opt("pan_papa", "Pan de papa", 0, ["gluten"], BREAD.papa)
    : opt("pan_brioche", "Pan brioche", 0, ["gluten", "huevo", "lacteos"], BREAD.brioche),
  opt(
    "pan_sin_gluten",
    "Pan sin gluten",
    3000,
    ["huevo"],
    BREAD.sinGluten,
    "Horneado aparte, sin trigo",
  ),
  opt(
    "envuelta_lechuga",
    "Envuelta en lechuga",
    0,
    [],
    BREAD.lechuga,
    "Sin pan: hojas de lechuga crespa",
  ),
];

const meat = (maxExtra = 1) =>
  slot({
    key: "carne",
    name: "Carne de res 150 g",
    removable: false,
    maxExtra,
    extraPrice: 7000,
    visual: V("carne", "#5A3121"),
    replacements: [
      opt("pollo", "Pechuga a la plancha", 0, [], V("pollo", "#C98A3E")),
      opt("garbanzo", "Medallón de garbanzo", 1000, [], V("vegetal", "#9C8A4A"), "El de la Veggie"),
    ],
  });

const veganCheese = opt(
  "queso_vegano",
  "Queso vegano",
  2500,
  ["soya"],
  V("queso", "#F6E7B5"),
  "A base de soya",
);

const addOns = (skip: string[] = []): IngredientSlot[] =>
  [
    slot({
      key: "tocineta",
      name: "Tocineta",
      included: false,
      maxExtra: 2,
      extraPrice: 3500,
      visual: V("tocineta", "#A8433A"),
    }),
    slot({
      key: "huevo",
      name: "Huevo frito",
      included: false,
      maxExtra: 1,
      extraPrice: 2500,
      allergens: ["huevo"],
      visual: V("huevo", "#FFF8EC"),
    }),
    slot({
      key: "aguacate",
      name: "Aguacate",
      included: false,
      maxExtra: 1,
      extraPrice: 3000,
      visual: V("aguacate", "#9DBF4A"),
    }),
    slot({
      key: "jalapeno",
      name: "Jalapeños",
      included: false,
      maxExtra: 1,
      extraPrice: 1500,
      visual: V("jalapeno", "#4E8B2E"),
    }),
  ].filter((s) => !skip.includes(s.key));

/** Acompañante de combo (propuesta: hoy las papas se venden aparte). */
const SIDES = {
  name: "Acompañante",
  defaultId: "papas",
  options: [
    opt("papas", "Papas a la francesa", 0, []),
    opt("aros", "Aros de cebolla", 2000, ["gluten", "huevo"]),
    opt(
      "ensalada",
      "Ensalada de la casa",
      0,
      [],
      undefined,
      "Lechuga, tomate cherry y vinagreta de limón",
    ),
    opt("papas_cheddar", "Papas con cheddar", 4000, ["lacteos"]),
  ],
};

/**
 * Plato a la carta: los componentes van repartidos en el plato (ver lib/viewer3d/layouts.ts).
 * Sirve para probar el visor con platos que no son hamburguesas.
 */
const CALENTADO: DishCustomizationSpec = {
  dishId: "calentado-de-la-casa",
  slots: [
    slot({
      key: "calentado",
      name: "Fríjoles y arroz con hogao",
      removable: false,
      maxExtra: 1,
      extraPrice: 4000,
      visual: V("calentado", "#7A3B2C"),
      replacements: [
        opt("solo_arroz", "Solo arroz con hogao", 0, [], V("arroz", "#F2ECDF"), "Sin fríjoles"),
      ],
    }),
    slot({
      key: "huevo",
      name: "Huevo frito",
      allergens: ["huevo"],
      maxExtra: 1,
      extraPrice: 2500,
      visual: V("huevo", "#FFF8EC"),
    }),
    slot({
      key: "chorizo",
      name: "Chorizo antioqueño",
      maxExtra: 1,
      extraPrice: 4500,
      visual: V("chorizo", "#8A3A28"),
      replacements: [opt("salchicha", "Salchicha ranchera", 0, [], V("chorizo", "#C46A4E"))],
    }),
    slot({
      key: "arepa",
      name: "Arepa de maíz asada",
      maxExtra: 1,
      extraPrice: 2000,
      visual: V("arepa", "#EDD08E"),
      replacements: [
        opt("arepa_queso", "Arepa con quesito", 2500, ["lacteos"], V("arepa", "#F5E2A8")),
      ],
    }),
    slot({
      key: "aguacate",
      name: "Aguacate",
      included: false,
      maxExtra: 1,
      extraPrice: 3000,
      visual: V("aguacate", "#9DBF4A"),
    }),
    slot({
      key: "maduro",
      name: "Tajadas de maduro",
      included: false,
      maxExtra: 1,
      extraPrice: 2500,
      visual: V("maduro", "#D98A2B"),
    }),
  ],
};

export const CUSTOMIZATION_SPECS: DishCustomizationSpec[] = [
  {
    dishId: "clasica-27",
    variantUnits: { doble: { carne: 2 } },
    sides: SIDES,
    slots: [
      slot({
        key: "pan",
        name: "Pan brioche",
        removable: false,
        allergens: ["gluten", "huevo", "lacteos"],
        visual: BREAD.brioche,
        replacements: breadReplacements("brioche"),
      }),
      slot({
        key: "salsa",
        name: "Salsa de la casa",
        allergens: ["huevo"],
        maxExtra: 1,
        visual: V("salsa", "#F0C27A"),
        replacements: [
          opt("salsa_bbq", "Salsa BBQ", 0, [], V("salsa", "#6B2A1A")),
          opt("mayo_chipotle", "Mayonesa de chipotle", 0, ["huevo"], V("salsa", "#E08A45")),
        ],
      }),
      slot({
        key: "lechuga",
        name: "Lechuga",
        maxExtra: 1,
        extraPrice: 500,
        visual: V("lechuga", "#7DB84A"),
      }),
      slot({
        key: "tomate",
        name: "Tomate",
        maxExtra: 1,
        extraPrice: 1000,
        visual: V("tomate", "#D9412B"),
      }),
      meat(),
      slot({
        key: "queso",
        name: "Queso cheddar",
        allergens: ["lacteos"],
        maxExtra: 2,
        extraPrice: 3000,
        visual: V("queso", "#F2B233"),
        replacements: [
          opt("provolone", "Queso provolone", 1000, ["lacteos"], V("queso", "#F3E2A9")),
          veganCheese,
        ],
      }),
      slot({
        key: "cebolla",
        name: "Cebolla caramelizada",
        maxExtra: 1,
        extraPrice: 1500,
        visual: V("cebolla", "#A8652A"),
        replacements: [
          opt("cebolla_morada", "Cebolla morada cruda", 0, [], V("cebolla", "#A34C8C")),
        ],
      }),
      ...addOns(),
    ],
  },
  {
    dishId: "brasa-bbq",
    variantUnits: { doble: { carne: 2 } },
    sides: SIDES,
    slots: [
      slot({
        key: "pan",
        name: "Pan de papa",
        removable: false,
        allergens: ["gluten"],
        visual: BREAD.papa,
        replacements: breadReplacements("papa"),
      }),
      slot({
        key: "salsa",
        name: "Salsa BBQ de panela",
        maxExtra: 1,
        visual: V("salsa", "#6B2A1A"),
        replacements: [opt("salsa_casa", "Salsa de la casa", 0, ["huevo"], V("salsa", "#F0C27A"))],
      }),
      meat(),
      slot({
        key: "queso",
        name: "Queso provolone",
        allergens: ["lacteos"],
        maxExtra: 2,
        extraPrice: 3000,
        visual: V("queso", "#F3E2A9"),
        replacements: [
          opt("cheddar", "Queso cheddar", 0, ["lacteos"], V("queso", "#F2B233")),
          veganCheese,
        ],
      }),
      slot({
        key: "tocineta",
        name: "Tocineta ahumada",
        maxExtra: 2,
        extraPrice: 3500,
        visual: V("tocineta", "#A8433A"),
      }),
      slot({
        key: "cebolla_crocante",
        name: "Cebolla crocante",
        allergens: ["gluten"],
        maxExtra: 1,
        extraPrice: 1500,
        visual: V("cebolla_crocante", "#C9852F"),
        replacements: [
          opt("cebolla_caramelizada", "Cebolla caramelizada", 0, [], V("cebolla", "#A8652A")),
        ],
      }),
      ...addOns(["tocineta"]),
    ],
  },
  {
    dishId: "la-diabla",
    variantUnits: { doble: { carne: 2 } },
    sides: SIDES,
    slots: [
      slot({
        key: "pan",
        name: "Pan brioche",
        removable: false,
        allergens: ["gluten", "huevo", "lacteos"],
        visual: BREAD.brioche,
        replacements: breadReplacements("brioche"),
      }),
      slot({
        key: "mayonesa",
        name: "Mayonesa de chipotle",
        allergens: ["huevo"],
        maxExtra: 1,
        visual: V("salsa", "#E08A45"),
        replacements: [opt("mayo_vegana", "Mayonesa vegana", 0, ["soya"], V("salsa", "#F4E6C4"))],
      }),
      meat(),
      slot({
        key: "queso",
        name: "Queso pepper jack",
        allergens: ["lacteos"],
        maxExtra: 2,
        extraPrice: 3000,
        visual: V("queso", "#EEDC9A"),
        replacements: [veganCheese],
      }),
      slot({
        key: "jalapeno",
        name: "Jalapeños encurtidos",
        maxExtra: 1,
        extraPrice: 1500,
        visual: V("jalapeno", "#4E8B2E"),
      }),
      slot({
        key: "habanero",
        name: "Salsa de ají habanero",
        maxExtra: 1,
        visual: V("salsa", "#E0461F"),
        description: "Pica de verdad",
        replacements: [opt("salsa_suave", "Salsa BBQ (sin picante)", 0, [], V("salsa", "#6B2A1A"))],
      }),
      ...addOns(["jalapeno"]),
    ],
  },
  CALENTADO,
];

export function customizationSpecFor(dishId: string): DishCustomizationSpec | undefined {
  return CUSTOMIZATION_SPECS.find((s) => s.dishId === dishId);
}
