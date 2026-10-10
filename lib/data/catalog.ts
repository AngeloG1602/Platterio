import { DEFAULT_DELIVERY } from "@/lib/domain/delivery";
import { DEFAULT_RESERVATIONS } from "@/lib/domain/reservations";
import type { StaffUser } from "@/lib/domain/access";
import type {
  Allergen,
  Category,
  Dish,
  Ingredient,
  Restaurant,
  SpiceLevel,
  Table,
  TimeSlot,
  Variant,
} from "@/lib/domain/types";

/**
 * Catálogo inicial del restaurante ficticio "Fogón 27" (BRIEF §11).
 * Los alérgenos de cada plato se derivan de sus ingredientes; la prueba de catalog.test.ts
 * verifica que coincidan con la tabla del brief.
 */

export const RESTAURANT: Restaurant = {
  id: "fogon-27",
  name: "Fogón 27",
  accentColor: "#E4572E",
  delivery: DEFAULT_DELIVERY,
  reservations: DEFAULT_RESERVATIONS,
  serviceAlertThreshold: 3,
  confirmTimeoutMin: 3,
  sessionIdleMin: 30,
};

export const TIME_SLOTS: TimeSlot[] = [
  { id: "desayuno", name: "Desayuno", start: "07:00", end: "11:00" },
  { id: "almuerzo", name: "Almuerzo", start: "11:00", end: "15:00" },
  { id: "tarde", name: "Tarde", start: "15:00", end: "18:00" },
  { id: "noche", name: "Noche", start: "18:00", end: "23:00" },
];

export const CATEGORIES: Category[] = [
  { id: "desayunos", name: "Desayunos", order: 1 },
  { id: "hamburguesas", name: "Hamburguesas", order: 2 },
  { id: "perros", name: "Perros", order: 3 },
  { id: "para-compartir", name: "Para compartir", order: 4 },
  { id: "acompanamientos", name: "Acompañamientos", order: 5 },
  { id: "bebidas", name: "Bebidas", order: 6 },
  { id: "postres", name: "Postres", order: 7 },
];

export const TABLES: Table[] = [1, 2, 3, 4, 5, 6].map((number) => ({
  id: `mesa-${number}`,
  number,
}));

export const WAITERS = [
  { id: "carlos", name: "Carlos", tableIds: ["mesa-1", "mesa-2", "mesa-3"] },
  { id: "daniela", name: "Daniela", tableIds: ["mesa-4", "mesa-5", "mesa-6"] },
];

/**
 * Usuarios de la demo. Los PIN se muestran en la pantalla de entrada para poder probar cada
 * rol; en un negocio real los define el administrador y no se muestran nunca.
 */
export const STAFF: StaffUser[] = [
  { id: "marta", name: "Marta", role: "admin", pin: "246810", active: true },
  { id: "julian", name: "Julián", role: "encargado", pin: "135790", active: true },
  { id: "carlos", name: "Carlos", role: "mesero", pin: "1111", active: true, waiterId: "carlos" },
  {
    id: "daniela",
    name: "Daniela",
    role: "mesero",
    pin: "2222",
    active: true,
    waiterId: "daniela",
  },
  { id: "cocina", name: "Cocina", role: "cocina", pin: "3333", active: true },
];

const ALL_SLOTS = TIME_SLOTS.map((s) => s.id);
const CATALOG_DATE = "2026-08-01T12:00:00.000Z";

function ing(name: string, allergens: Allergen[] = [], description?: string): Ingredient {
  return description ? { name, description, allergens } : { name, allergens };
}

function single(price: number, name = "Única"): Variant[] {
  return [{ id: "unica", name, price }];
}

interface DishInput {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  variants: Variant[];
  ingredients: Ingredient[];
  spiceLevel?: SpiceLevel;
  timeSlotIds: string[];
  featured?: boolean;
  model3d?: Dish["model3d"];
}

function dish(input: DishInput): Dish {
  return {
    spiceLevel: 0,
    featured: false,
    active: true,
    photos: [`/platos/${input.id}.jpg`],
    createdAt: CATALOG_DATE,
    ...input,
  };
}

const burgerVariants = (price: number): Variant[] => [
  { id: "sencilla", name: "Sencilla", price },
  { id: "doble", name: "Doble", price: price + 7000 },
];

export const DISHES: Dish[] = [
  // Desayunos
  dish({
    id: "calentado-de-la-casa",
    name: "Calentado de la casa",
    description:
      "Fríjoles y arroz del día salteados con hogao, huevo frito, chorizo y arepa asada. El desayuno de siempre.",
    categoryId: "desayunos",
    variants: single(16900),
    ingredients: [
      ing("Fríjoles rojos", [], "Cocinados a fuego lento con plátano y cerdo"),
      ing("Arroz blanco"),
      ing("Hogao", [], "Tomate y cebolla larga sofritos"),
      ing("Huevo frito", ["huevo"]),
      ing("Chorizo antioqueño"),
      ing("Arepa de maíz asada"),
    ],
    timeSlotIds: ["desayuno"],
  }),
  dish({
    id: "arepa-rellena",
    name: "Arepa rellena de huevo y queso",
    description:
      "Arepa de maíz asada en plancha, rellena de huevo revuelto y queso campesino que se derrite.",
    categoryId: "desayunos",
    variants: single(9900),
    ingredients: [
      ing("Arepa de maíz blanco"),
      ing("Huevo revuelto", ["huevo"]),
      ing("Queso campesino", ["lacteos"]),
      ing("Mantequilla", ["lacteos"]),
    ],
    timeSlotIds: ["desayuno"],
  }),
  dish({
    id: "sandwich-de-desayuno",
    name: "Sándwich de desayuno",
    description: "Pan artesanal tostado con huevo frito, jamón de cerdo y mozzarella gratinada.",
    categoryId: "desayunos",
    variants: single(13900),
    ingredients: [
      ing("Pan de molde artesanal", ["gluten"]),
      ing("Huevo frito", ["huevo"]),
      ing("Jamón de cerdo"),
      ing("Queso mozzarella", ["lacteos"]),
      ing("Tomate"),
    ],
    timeSlotIds: ["desayuno"],
  }),

  // Hamburguesas
  dish({
    id: "clasica-27",
    name: "Clásica 27",
    description:
      "Nuestra hamburguesa de siempre: carne de res a la parrilla, cheddar fundido y cebolla caramelizada en pan brioche.",
    categoryId: "hamburguesas",
    variants: burgerVariants(22900),
    ingredients: [
      ing("Pan brioche", ["gluten", "huevo", "lacteos"], "Horneado en casa cada mañana"),
      ing("Carne de res 150 g", [], "Mezcla de cadera y falda, a la parrilla"),
      ing("Queso cheddar", ["lacteos"]),
      ing("Lechuga"),
      ing("Tomate"),
      ing("Cebolla caramelizada"),
      ing("Salsa de la casa", ["huevo"], "Mayonesa, mostaza y pepinillo"),
    ],
    timeSlotIds: ["almuerzo", "noche"],
    featured: true,
    model3d: { fileName: "clasica-27.glb", sizeBytes: 3_284_992 },
  }),
  dish({
    id: "brasa-bbq",
    name: "Brasa BBQ",
    description:
      "Carne a la brasa con tocineta ahumada, provolone y cebolla crocante, bañada en BBQ de panela con un toque de chipotle.",
    categoryId: "hamburguesas",
    variants: burgerVariants(27900),
    ingredients: [
      ing("Pan de papa", ["gluten"]),
      ing("Carne de res 150 g", [], "Asada al carbón"),
      ing("Tocineta ahumada"),
      ing("Queso provolone", ["lacteos"]),
      ing("Cebolla crocante", ["gluten"]),
      ing("Salsa BBQ de panela", [], "Con chipotle, pica suave"),
    ],
    spiceLevel: 1,
    timeSlotIds: ["almuerzo", "noche"],
    model3d: { fileName: "brasa-bbq.glb", sizeBytes: 3_712_000 },
  }),
  dish({
    id: "la-diabla",
    name: "La Diabla",
    description:
      "Para valientes: carne de res, pepper jack, jalapeños y salsa de habanero. Pica de verdad.",
    categoryId: "hamburguesas",
    variants: burgerVariants(26900),
    ingredients: [
      ing("Pan brioche", ["gluten", "huevo", "lacteos"]),
      ing("Carne de res 150 g"),
      ing("Queso pepper jack", ["lacteos"]),
      ing("Jalapeños encurtidos"),
      ing("Salsa de ají habanero", [], "Hecha en casa"),
      ing("Mayonesa de chipotle", ["huevo"]),
    ],
    spiceLevel: 3,
    timeSlotIds: ["noche"],
    model3d: { fileName: "la-diabla.glb", sizeBytes: 3_520_512 },
  }),
  dish({
    id: "pollo-crispy",
    name: "Pollo crispy",
    description:
      "Pechuga de pollo apanada y crocante con repollo encurtido y mayonesa ligeramente picante.",
    categoryId: "hamburguesas",
    variants: single(23900),
    ingredients: [
      ing("Pan de papa", ["gluten"]),
      ing("Pechuga apanada", ["gluten", "huevo"], "Marinada en suero costeño"),
      ing("Repollo morado encurtido"),
      ing("Pepinillos"),
      ing("Mayonesa picante", ["huevo"]),
    ],
    spiceLevel: 1,
    timeSlotIds: ["almuerzo", "noche"],
  }),
  dish({
    id: "veggie-de-garbanzo",
    name: "Veggie de garbanzo",
    description:
      "Medallón de garbanzo y quinua dorado en plancha, con aguacate, rúgula y mayonesa vegana en pan integral.",
    categoryId: "hamburguesas",
    variants: single(24900),
    ingredients: [
      ing("Pan integral", ["gluten"]),
      ing("Medallón de garbanzo y quinua"),
      ing("Aguacate"),
      ing("Rúgula"),
      ing("Tomate"),
      ing("Mayonesa vegana", ["soya"], "A base de leche de soya"),
    ],
    timeSlotIds: ["almuerzo", "noche"],
  }),

  // Perros
  dish({
    id: "perro-de-la-casa",
    name: "Perro de la casa",
    description:
      "Salchicha americana, mozzarella gratinada, papa ripio y salsa de piña. El perro de toda la vida.",
    categoryId: "perros",
    variants: single(15900),
    ingredients: [
      ing("Pan de perro", ["gluten"]),
      ing("Salchicha americana"),
      ing("Queso mozzarella", ["lacteos"]),
      ing("Papa ripio"),
      ing("Salsa de piña"),
      ing("Cebolla picada"),
    ],
    timeSlotIds: ["tarde", "noche"],
  }),
  dish({
    id: "perro-suizo",
    name: "Perro suizo",
    description:
      "Salchicha suiza ahumada con tocineta, queso doble crema gratinado y un toque de ají de la casa.",
    categoryId: "perros",
    variants: single(18900),
    ingredients: [
      ing("Pan de perro", ["gluten"]),
      ing("Salchicha suiza ahumada"),
      ing("Tocineta"),
      ing("Queso doble crema", ["lacteos"]),
      ing("Cebolla caramelizada"),
      ing("Ají de la casa", [], "Cilantro, cebolla y ají dulce"),
    ],
    spiceLevel: 1,
    timeSlotIds: ["tarde", "noche"],
  }),

  // Para compartir
  dish({
    id: "salchipapa-27",
    name: "Salchipapa 27",
    description:
      "Papas a la francesa con salchicha ranchera, queso costeño rallado y nuestras salsas. Para picar sin afán.",
    categoryId: "para-compartir",
    variants: [
      { id: "personal", name: "Personal", price: 21900 },
      { id: "compartir", name: "Para compartir", price: 34900 },
    ],
    ingredients: [
      ing("Papas a la francesa"),
      ing("Salchicha ranchera"),
      ing("Queso costeño rallado", ["lacteos"]),
      ing("Salsa de tomate"),
      ing("Salsa de piña"),
    ],
    timeSlotIds: ["tarde", "noche"],
  }),
  dish({
    id: "papas-cheddar-tocineta",
    name: "Papas cheddar y tocineta",
    description:
      "Papas rústicas bañadas en salsa de cheddar caliente con tocineta crocante y cebollín.",
    categoryId: "para-compartir",
    variants: single(16900),
    ingredients: [
      ing("Papas rústicas", [], "Con cáscara, cortadas a mano"),
      ing("Salsa de queso cheddar", ["lacteos"]),
      ing("Tocineta crocante"),
      ing("Cebollín"),
    ],
    timeSlotIds: ["tarde", "noche"],
  }),
  dish({
    id: "alitas-picantes",
    name: "Alitas picantes",
    description:
      "Alitas crocantes bañadas en salsa búfalo, con bastones de apio y zanahoria para bajar el picante.",
    categoryId: "para-compartir",
    variants: [
      { id: "x8", name: "x8", price: 24900 },
      { id: "x12", name: "x12", price: 33900 },
    ],
    ingredients: [
      ing("Alitas de pollo"),
      ing("Rebozado de harina y especias", ["gluten"]),
      ing("Salsa búfalo", [], "Ají cayena y mantequilla vegetal"),
      ing("Apio y zanahoria"),
    ],
    spiceLevel: 2,
    timeSlotIds: ["tarde", "noche"],
  }),
  dish({
    id: "nuggets-de-pollo",
    name: "Nuggets de pollo",
    description: "Diez nuggets de pechuga apanados en panko, con salsa de miel mostaza.",
    categoryId: "para-compartir",
    variants: single(17900, "x10"),
    ingredients: [
      ing("Pechuga de pollo"),
      ing("Apanado de panko y huevo", ["gluten", "huevo"]),
      ing("Salsa de miel mostaza"),
    ],
    timeSlotIds: ["tarde"],
  }),

  // Acompañamientos
  dish({
    id: "papas-a-la-francesa",
    name: "Papas a la francesa",
    description: "Papas en bastón, fritas al momento, crocantes por fuera y suaves por dentro.",
    categoryId: "acompanamientos",
    variants: [
      { id: "pequena", name: "Pequeña", price: 7900 },
      { id: "grande", name: "Grande", price: 10900 },
    ],
    ingredients: [ing("Papa pastusa"), ing("Sal marina")],
    timeSlotIds: ALL_SLOTS,
  }),
  dish({
    id: "aros-de-cebolla",
    name: "Aros de cebolla",
    description:
      "Aros de cebolla en rebozado de cerveza, dorados y crocantes, con salsa BBQ para untar.",
    categoryId: "acompanamientos",
    variants: single(8900),
    ingredients: [
      ing("Cebolla blanca"),
      ing("Rebozado de cerveza", ["gluten", "huevo"]),
      ing("Salsa BBQ"),
    ],
    timeSlotIds: ["almuerzo", "noche"],
  }),

  // Bebidas
  dish({
    id: "limonada-de-coco",
    name: "Limonada de coco",
    description: "Limón Tahití licuado con crema de coco y hielo. Cremosa, fresca y sin lácteos.",
    categoryId: "bebidas",
    variants: single(9900),
    ingredients: [ing("Limón Tahití"), ing("Crema de coco"), ing("Hielo")],
    timeSlotIds: ALL_SLOTS,
  }),
  dish({
    id: "jugo-natural",
    name: "Jugo natural en agua",
    description: "Fruta fresca licuada en agua. Escoge el sabor y dinos cómo te gusta de azúcar.",
    categoryId: "bebidas",
    variants: [
      { id: "mora", name: "Mora", price: 7500 },
      { id: "lulo", name: "Lulo", price: 7500 },
      { id: "mango", name: "Mango", price: 7500 },
    ],
    ingredients: [ing("Fruta fresca"), ing("Agua"), ing("Azúcar", [], "Opcional")],
    timeSlotIds: ALL_SLOTS,
  }),
  dish({
    id: "gaseosa",
    name: "Gaseosa",
    description: "Bien fría, en botella personal o para compartir en la mesa.",
    categoryId: "bebidas",
    variants: [
      { id: "400ml", name: "400 ml", price: 5500 },
      { id: "1-5l", name: "1,5 L", price: 9500 },
    ],
    ingredients: [ing("Gaseosa", [], "Pregunta por los sabores disponibles")],
    timeSlotIds: ALL_SLOTS,
  }),
  dish({
    id: "malteada-de-arequipe",
    name: "Malteada de arequipe",
    description:
      "Helado de vainilla, leche y arequipe batidos espesos, con crema chantilly encima.",
    categoryId: "bebidas",
    variants: single(13900),
    ingredients: [
      ing("Helado de vainilla", ["lacteos"]),
      ing("Leche entera", ["lacteos"]),
      ing("Arequipe", ["lacteos"]),
      ing("Crema chantilly", ["lacteos"]),
    ],
    timeSlotIds: ["tarde", "noche"],
  }),

  // Postres
  dish({
    id: "brownie-con-helado",
    name: "Brownie con helado",
    description:
      "Brownie tibio de chocolate con nueces, bola de helado de vainilla y salsa de chocolate caliente.",
    categoryId: "postres",
    variants: single(12900),
    ingredients: [
      ing("Brownie de chocolate", ["gluten", "huevo", "lacteos"]),
      ing("Nueces", ["frutos_secos"]),
      ing("Helado de vainilla", ["lacteos"]),
      ing("Salsa de chocolate"),
    ],
    timeSlotIds: ["tarde", "noche"],
  }),
  dish({
    id: "cheesecake-de-maracuya",
    name: "Cheesecake de maracuyá",
    description:
      "Cheesecake cremoso horneado sobre base de galleta, con salsa de maracuyá ácida y fresca.",
    categoryId: "postres",
    variants: single(11900),
    ingredients: [
      ing("Base de galleta", ["gluten"]),
      ing("Queso crema", ["lacteos"]),
      ing("Huevo", ["huevo"]),
      ing("Salsa de maracuyá"),
    ],
    timeSlotIds: ["tarde", "noche"],
  }),
];
