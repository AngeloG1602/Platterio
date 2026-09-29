import { toMinutes } from "@/lib/domain/timeSlots";
import type {
  Alert,
  Allergen,
  Diner,
  Dish,
  DishRating,
  Order,
  OrderItem,
  ServiceRating,
  Stars,
  TableSession,
  Table,
  TimeSlot,
  Waiter,
} from "@/lib/domain/types";

/**
 * Historial sembrado de 14 días (BRIEF §11).
 *
 * No se guarda en localStorage: se regenera de forma determinista a partir de `seedEpoch`
 * (el momento en que se crearon o reiniciaron los datos). Así el estado que se persiste y se
 * transmite entre pestañas se mantiene liviano. Ver DECISIONES.md.
 */

export interface History {
  sessions: TableSession[];
  orders: Order[];
  dishRatings: DishRating[];
  serviceRatings: ServiceRating[];
}

export interface HistoryCatalog {
  dishes: Dish[];
  timeSlots: TimeSlot[];
  tables: Table[];
  waiters: Waiter[];
}

const DAYS = 14;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** PRNG determinista (mulberry32). */
function createRandom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!;
  const weighted = <T>(items: ReadonlyArray<readonly [T, number]>): T | null => {
    const total = items.reduce((sum, [, w]) => sum + w, 0);
    if (total <= 0) return null;
    let r = next() * total;
    for (const [item, w] of items) {
      r -= w;
      if (r <= 0) return item;
    }
    return items[items.length - 1]![0];
  };
  return { next, int, pick, weighted, chance: (p: number) => next() < p };
}

/** Qué tanto se pide cada plato en cada franja (para que "Popular a esta hora" tenga sentido). */
const POPULARITY: Record<string, Partial<Record<string, number>>> = {
  "calentado-de-la-casa": { desayuno: 6 },
  "arepa-rellena": { desayuno: 5 },
  "sandwich-de-desayuno": { desayuno: 3 },
  "clasica-27": { almuerzo: 7, noche: 5 },
  "brasa-bbq": { almuerzo: 4, noche: 5 },
  "la-diabla": { noche: 5 },
  "pollo-crispy": { almuerzo: 5, noche: 3 },
  "veggie-de-garbanzo": { almuerzo: 2, noche: 1.5 },
  "perro-de-la-casa": { tarde: 5, noche: 3 },
  "perro-suizo": { tarde: 3, noche: 3 },
  "salchipapa-27": { tarde: 6, noche: 4 },
  "papas-cheddar-tocineta": { tarde: 3, noche: 3 },
  "alitas-picantes": { tarde: 3, noche: 6 },
  "nuggets-de-pollo": { tarde: 3 },
  "papas-a-la-francesa": { desayuno: 0.3, almuerzo: 5, tarde: 2, noche: 4 },
  "aros-de-cebolla": { almuerzo: 2, noche: 2.5 },
  "limonada-de-coco": { desayuno: 1, almuerzo: 5, tarde: 4, noche: 3 },
  "jugo-natural": { desayuno: 5, almuerzo: 4, tarde: 2, noche: 1 },
  gaseosa: { desayuno: 0.5, almuerzo: 4, tarde: 3, noche: 5 },
  "malteada-de-arequipe": { tarde: 5, noche: 2 },
  "brownie-con-helado": { tarde: 3, noche: 3 },
  "cheesecake-de-maracuya": { tarde: 2, noche: 2 },
};

/** Calidad percibida de cada plato (promedio alrededor del cual caen las estrellas). */
const QUALITY: Record<string, number> = {
  "calentado-de-la-casa": 4.5,
  "arepa-rellena": 4.3,
  "sandwich-de-desayuno": 3.9,
  "clasica-27": 4.7,
  "brasa-bbq": 4.5,
  "la-diabla": 4.4,
  "pollo-crispy": 4.3,
  "veggie-de-garbanzo": 4.2,
  "perro-de-la-casa": 4.1,
  "perro-suizo": 4.3,
  "salchipapa-27": 4.4,
  "papas-cheddar-tocineta": 4.5,
  "alitas-picantes": 4.2,
  "nuggets-de-pollo": 3.6,
  "papas-a-la-francesa": 4.3,
  "aros-de-cebolla": 4.0,
  "limonada-de-coco": 4.8,
  "jugo-natural": 4.4,
  gaseosa: 4.5,
  "malteada-de-arequipe": 4.7,
  "brownie-con-helado": 4.6,
  "cheesecake-de-maracuya": 4.4,
};

/** Pedidos por franja y día: [mínimo, máximo]. */
const ORDERS_PER_SLOT: Record<string, [number, number]> = {
  desayuno: [3, 6],
  almuerzo: [9, 14],
  tarde: [4, 8],
  noche: [9, 15],
};

const MAIN_CATEGORIES = new Set(["desayunos", "hamburguesas", "perros", "para-compartir"]);

const ALIASES = [
  "Ana",
  "Luis",
  "Camila",
  "Andrés",
  "Valentina",
  "Juan",
  "Sofía",
  "Mateo",
  "Laura",
  "Santiago",
  "Felipe",
  "Mariana",
  "Julián",
  "Paula",
  "Sebastián",
  "Natalia",
  "Tomás",
  "Isabela",
];

const RESTRICTION_ODDS: Array<[Allergen, number]> = [
  ["lacteos", 0.12],
  ["gluten", 0.08],
  ["mani", 0.04],
  ["huevo", 0.03],
  ["frutos_secos", 0.03],
  ["mariscos", 0.02],
  ["soya", 0.01],
];

const COMMENTS: Record<
  "comida" | "bebida" | "postre",
  Record<"alta" | "media" | "baja", string[]>
> = {
  comida: {
    alta: [
      "Espectacular, volvería solo por esto.",
      "Todo muy fresco y bien servido.",
      "Llegó rapidísimo y calientico.",
      "Buenísimo, la salsa de la casa es otra cosa.",
      "Porción generosa y con mucho sabor.",
      "De lo mejor que he comido por el sector.",
    ],
    media: [
      "Muy rico, aunque le faltó un poquito de sal.",
      "Buena porción por el precio.",
      "Rico, pero lo esperaba un poco más caliente.",
    ],
    baja: ["Normal, nada del otro mundo.", "Se demoró bastante y llegó tibio."],
  },
  bebida: {
    alta: ["Súper refrescante.", "Bien fría y en su punto de azúcar.", "La pediría otra vez."],
    media: ["Rica, pero muy dulce para mi gusto."],
    baja: ["Le faltaba hielo."],
  },
  postre: {
    alta: ["El cierre perfecto.", "Delicioso, no muy dulce.", "Para repetir."],
    media: ["Rico, aunque la porción es pequeña."],
    baja: ["Estaba un poco seco."],
  },
};

/** Reseñas negativas fijas para que la demo sea creíble. [días atrás, franja, plato, estrellas, comentario] */
const FIXED_NEGATIVE: Array<[number, string, string, Stars, string]> = [
  [
    5,
    "noche",
    "la-diabla",
    1,
    "Pedí término medio y la carne llegó seca. Una lástima porque la salsa es buena.",
  ],
  [
    3,
    "tarde",
    "nuggets-de-pollo",
    2,
    "Los nuggets llegaron fríos y blandos. No los volvería a pedir.",
  ],
  [1, "desayuno", "sandwich-de-desayuno", 2, "El pan estaba duro y el huevo pasado. Esperaba más."],
];

/** Calificación de servicio baja de ayer que deja una alerta sin resolver. */
export const LOW_SERVICE_EVENT = {
  daysAgo: 1,
  slotId: "noche",
  tableId: "mesa-5",
  stars: 2 as Stars,
};

function commentKind(dish: Dish): "comida" | "bebida" | "postre" {
  if (dish.categoryId === "bebidas") return "bebida";
  if (dish.categoryId === "postres") return "postre";
  return "comida";
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function generateHistory(catalog: HistoryCatalog, seedEpoch: number): History {
  const rand = createRandom(270_927);
  const sessions: TableSession[] = [];
  const orders: Order[] = [];
  const dishRatings: DishRating[] = [];
  const serviceRatings: ServiceRating[] = [];

  const dishById = new Map(catalog.dishes.map((d) => [d.id, d]));
  const waiterOf = (tableId: string) =>
    catalog.waiters.find((w) => w.tableIds.includes(tableId))?.id ?? catalog.waiters[0]!.id;
  const today = startOfLocalDay(seedEpoch);
  let seq = 0;
  const id = (prefix: string) => `h-${prefix}-${++seq}`;
  const iso = (ms: number) => new Date(ms).toISOString();

  const candidates = (slotId: string, filter: (d: Dish) => boolean) =>
    catalog.dishes
      .filter((d) => filter(d) && d.timeSlotIds.includes(slotId))
      .map((d) => [d, POPULARITY[d.id]?.[slotId] ?? 0.5] as const);

  const starsFor = (dish: Dish): Stars => {
    const q = QUALITY[dish.id] ?? 4.2;
    const value = Math.round(q + (rand.next() + rand.next() - 1) * 1.3);
    return Math.min(5, Math.max(1, value)) as Stars;
  };

  const makeDiners = (count: number, openedAt: number): Diner[] => {
    const used = new Set<string>();
    return Array.from({ length: count }, () => {
      let alias = rand.pick(ALIASES);
      while (used.has(alias)) alias = rand.pick(ALIASES);
      used.add(alias);
      const restrictions = RESTRICTION_ODDS.filter(([, p]) => rand.chance(p)).map(([a]) => a);
      return {
        id: id("comensal"),
        alias,
        deviceId: id("dispositivo"),
        restrictions,
        joinedAt: iso(openedAt),
      };
    });
  };

  const makeItems = (slotId: string, diners: Diner[]): OrderItem[] => {
    const items: OrderItem[] = [];
    const add = (dish: Dish | null, dinerId: string) => {
      if (!dish) return;
      const variant = rand.chance(0.7) ? dish.variants[0]! : rand.pick(dish.variants);
      const existing = items.find(
        (i) => i.dishId === dish.id && i.variantId === variant.id && i.dinerId === dinerId,
      );
      if (existing) existing.qty += 1;
      else
        items.push({
          id: id("item"),
          dishId: dish.id,
          variantId: variant.id,
          qty: rand.chance(0.12) ? 2 : 1,
          dinerId,
          unitPrice: variant.price,
        });
    };
    const mains = candidates(slotId, (d) => MAIN_CATEGORIES.has(d.categoryId));
    const drinks = candidates(slotId, (d) => d.categoryId === "bebidas");
    const sides = candidates(slotId, (d) => d.categoryId === "acompanamientos");
    const desserts = candidates(slotId, (d) => d.categoryId === "postres");
    for (const diner of diners) {
      add(rand.weighted(mains), diner.id);
      if (rand.chance(0.7)) add(rand.weighted(drinks), diner.id);
      if (rand.chance(0.3)) add(rand.weighted(sides), diner.id);
      if (rand.chance(0.15)) add(rand.weighted(desserts), diner.id);
    }
    return items;
  };

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dayStart = today - daysAgo * DAY;
    const weekday = new Date(dayStart).getDay();
    const weekendBoost = weekday === 5 || weekday === 6 ? 1.3 : weekday === 0 ? 1.15 : 1;

    for (const slot of catalog.timeSlots) {
      const [min, max] = ORDERS_PER_SLOT[slot.id] ?? [3, 6];
      const count = Math.round(rand.int(min, max) * weekendBoost);
      const slotStart = dayStart + toMinutes(slot.start) * MINUTE;
      const slotLength = (toMinutes(slot.end) - toMinutes(slot.start)) * MINUTE;

      for (let n = 0; n < count; n++) {
        const openedAt = slotStart + Math.floor(rand.next() * (slotLength - 50 * MINUTE));
        const lowService =
          daysAgo === LOW_SERVICE_EVENT.daysAgo && slot.id === LOW_SERVICE_EVENT.slotId && n === 0;
        const table = lowService
          ? catalog.tables.find((t) => t.id === LOW_SERVICE_EVENT.tableId)!
          : rand.pick(catalog.tables);
        const diners = makeDiners(
          rand.weighted([
            [1, 3],
            [2, 4],
            [3, 2],
            [4, 1],
          ]) ?? 2,
          openedAt,
        );
        const rounds = rand.chance(0.22) ? 2 : 1;
        const session: TableSession = {
          id: id("sesion"),
          tableId: table.id,
          openedAt: iso(openedAt),
          diners,
          cart: [],
        };

        let cursor = openedAt + rand.int(4, 12) * MINUTE;
        let lastDelivered = cursor;
        let skipSession = false;
        const sessionOrders: Order[] = [];
        for (let round = 1; round <= rounds; round++) {
          const createdAt = cursor;
          const confirmedAt = createdAt + rand.int(1, 3) * MINUTE + rand.int(0, 59) * 1000;
          const preparingAt = confirmedAt + rand.int(1, 4) * MINUTE;
          const readyAt = preparingAt + rand.int(7, 16) * MINUTE;
          const deliveredAt = readyAt + rand.int(1, 3) * MINUTE;
          if (deliveredAt > seedEpoch) {
            skipSession = true;
            break;
          }
          const items =
            round === 1
              ? makeItems(slot.id, diners)
              : makeItems(slot.id, diners.slice(0, 1)).slice(0, 2);
          sessionOrders.push({
            id: id("pedido"),
            sessionId: session.id,
            tableId: table.id,
            round,
            items,
            status: "entregado",
            createdAt: iso(createdAt),
            confirmedAt: iso(confirmedAt),
            preparingAt: iso(preparingAt),
            readyAt: iso(readyAt),
            deliveredAt: iso(deliveredAt),
          });
          lastDelivered = deliveredAt;
          cursor = deliveredAt + rand.int(10, 25) * MINUTE;
        }
        if (skipSession || sessionOrders.length === 0) continue;

        const closedAt = lastDelivered + rand.int(15, 40) * MINUTE;
        if (closedAt < seedEpoch) session.closedAt = iso(closedAt);
        sessions.push(session);
        orders.push(...sessionOrders);

        // Calificaciones de platos (regla 7: solo pedidos entregados).
        const ratedAt = lastDelivered + rand.int(8, 30) * MINUTE;
        if (rand.chance(0.45) && ratedAt < seedEpoch) {
          for (const order of sessionOrders) {
            const rated = new Set<string>();
            for (const item of order.items) {
              if (rated.has(item.dishId)) continue;
              rated.add(item.dishId);
              const dish = dishById.get(item.dishId)!;
              const stars = starsFor(dish);
              const bucket =
                stars >= 5 ? "alta" : stars === 4 ? (rand.chance(0.5) ? "alta" : "media") : "baja";
              const rating: DishRating = {
                id: id("resena"),
                dishId: dish.id,
                orderId: order.id,
                stars,
                createdAt: iso(ratedAt),
              };
              if (rand.chance(0.3)) rating.comment = rand.pick(COMMENTS[commentKind(dish)][bucket]);
              dishRatings.push(rating);
            }
          }
        }

        // Calificación de servicio (una por visita, asociada al mesero de la mesa).
        if (lowService || (rand.chance(0.55) && ratedAt < seedEpoch)) {
          const waiterId = waiterOf(table.id);
          const base = waiterId === "carlos" ? 4.6 : 4.4;
          const stars = lowService
            ? LOW_SERVICE_EVENT.stars
            : (Math.min(5, Math.max(3, Math.round(base + (rand.next() - 0.5) * 1.6))) as Stars);
          serviceRatings.push({
            id: lowService ? "h-servicio-bajo" : id("servicio"),
            sessionId: session.id,
            waiterId,
            stars,
            createdAt: iso(ratedAt),
          });
        }
      }
    }
  }

  // Reseñas negativas fijas: se enganchan al primer pedido de ese día y franja que tenga el plato
  // (o, si no lo tiene, se le agrega el plato a ese pedido para que la reseña sea coherente).
  for (const [daysAgo, slotId, dishId, stars, comment] of FIXED_NEGATIVE) {
    const dayStart = today - daysAgo * DAY;
    const slot = catalog.timeSlots.find((s) => s.id === slotId);
    const dish = dishById.get(dishId);
    if (!slot || !dish) continue;
    const from = dayStart + toMinutes(slot.start) * MINUTE;
    const to = dayStart + toMinutes(slot.end) * MINUTE;
    const order = orders.find((o) => {
      const t = Date.parse(o.createdAt);
      return t >= from && t < to;
    });
    if (!order) continue;
    if (!order.items.some((i) => i.dishId === dishId)) {
      order.items.push({
        id: id("item"),
        dishId,
        variantId: dish.variants[0]!.id,
        qty: 1,
        dinerId: order.items[0]?.dinerId ?? "anonimo",
        unitPrice: dish.variants[0]!.price,
      });
    }
    dishRatings.push({
      id: id("resena"),
      dishId,
      orderId: order.id,
      stars,
      comment,
      createdAt: iso(Date.parse(order.deliveredAt!) + 20 * MINUTE),
    });
  }

  dishRatings.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { sessions, orders, dishRatings, serviceRatings };
}

/** Alertas iniciales: la calificación baja de ayer queda sin resolver. */
export function seedAlerts(history: History, waiters: Waiter[]): Alert[] {
  const rating = history.serviceRatings.find((r) => r.id === "h-servicio-bajo");
  if (!rating) return [];
  const session = history.sessions.find((s) => s.id === rating.sessionId);
  return [
    {
      id: "alerta-servicio-inicial",
      type: "servicio_bajo",
      tableId: session?.tableId ?? LOW_SERVICE_EVENT.tableId,
      waiterId: rating.waiterId ?? waiters[0]?.id,
      createdAt: rating.createdAt,
      resolved: false,
      stars: rating.stars,
    },
  ];
}

let cache: { key: string; value: History } | null = null;

/** Versión memorizada: el historial solo se recalcula si cambia `seedEpoch`. */
export function getHistory(catalog: HistoryCatalog, seedEpoch: number): History {
  const key = `${seedEpoch}`;
  if (cache?.key !== key) cache = { key, value: generateHistory(catalog, seedEpoch) };
  return cache.value;
}
