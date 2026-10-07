import { describe, expect, it } from "vitest";
import { CATEGORIES, DISHES, TABLES, TIME_SLOTS, WAITERS } from "@/lib/data/catalog";
import {
  dishRanking,
  ordersByHour,
  periodRange,
  ratingSummary,
  recentComments,
  restrictionStats,
  salesByDay,
  salesSummary,
  serviceByWaiter,
  topDishesBySlot,
} from "./analytics";
import {
  addTable,
  applyTimeSlots,
  removeTable,
  toggleTableAssignment,
  validateThreshold,
  validateTimeout,
} from "./config";
import {
  dishToDraft,
  draftToDish,
  emptyDraft,
  formatBytes,
  MODEL_ERROR,
  parsePrice,
  slugify,
  validateDishDraft,
  validateModelFile,
} from "./dishForm";
import type { Order, OrderStatus, TableSession } from "./types";

const NOW = new Date(2026, 8, 29, 14, 0).getTime();
const at = (daysAgo: number, h: number, m = 0) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
let n = 0;
function order(
  status: OrderStatus,
  daysAgo: number,
  hour: number,
  items: Array<[string, number, number]>,
  over: Partial<Order> = {},
): Order {
  const created = at(daysAgo, hour);
  return {
    id: `o${++n}`,
    sessionId: over.sessionId ?? `s${n}`,
    tableId: "mesa-1",
    round: 1,
    status,
    createdAt: created,
    deliveredAt: status === "entregado" ? at(daysAgo, hour, 30) : undefined,
    items: items.map(([dishId, qty, price], i) => ({
      id: `i${n}-${i}`,
      dishId,
      variantId: "unica",
      qty,
      dinerId: "d",
      unitPrice: price,
    })),
    ...over,
  };
}

describe("periodos", () => {
  it("hoy, 7 y 14 días empiezan a medianoche", () => {
    expect(new Date(periodRange("hoy", NOW).from).getHours()).toBe(0);
    expect(periodRange("7d", NOW).from).toBe(new Date(2026, 8, 23).getTime());
    expect(periodRange("14d", NOW).from).toBe(new Date(2026, 8, 16).getTime());
  });
  it("personalizado usa días completos y corrige el orden", () => {
    const p = periodRange("personalizado", NOW, { from: "2026-09-20", to: "2026-09-18" });
    expect(p.from).toBe(new Date(2026, 8, 18).getTime());
    expect(new Date(p.to).getDate()).toBe(20);
  });
});

describe("ventas", () => {
  const orders = [
    order("entregado", 0, 12, [["clasica-27", 2, 22900]], { sessionId: "a" }),
    order("entregado", 0, 13, [["gaseosa", 1, 5500]], { sessionId: "a" }),
    order("entregado", 0, 12, [["limonada-de-coco", 1, 9900]], { sessionId: "b" }),
    {
      ...order("entregado", 0, 12, [["aros-de-cebolla", 1, 8900]], { sessionId: "b" }),
      items: [
        {
          id: "x",
          dishId: "aros-de-cebolla",
          variantId: "unica",
          qty: 1,
          dinerId: "d",
          unitPrice: 8900,
          removed: true,
        },
      ],
    },
    order("pendiente", 0, 13, [["clasica-27", 1, 22900]]),
    order("rechazado", 0, 13, [["clasica-27", 1, 22900]]),
    order("entregado", 3, 20, [["la-diabla", 1, 26900]]),
  ];

  it("solo suma lo entregado, sin ítems quitados (regla 12)", () => {
    const s = salesSummary(orders, periodRange("hoy", NOW));
    expect(s.sales).toBe(22900 * 2 + 5500 + 9900);
    expect(s.delivered).toBe(4);
    expect(s.placed).toBe(5);
    expect(s.visits).toBe(2);
    expect(s.avgTicket).toBe((22900 * 2 + 5500 + 9900) / 2);
  });

  it("sin datos devuelve ceros y ticket nulo", () => {
    const s = salesSummary([], periodRange("hoy", NOW));
    expect(s).toMatchObject({ sales: 0, delivered: 0, avgTicket: null });
  });

  it("agrupa ventas por día incluyendo días vacíos", () => {
    const days = salesByDay(orders, periodRange("7d", NOW));
    expect(days).toHaveLength(7);
    expect(days[6]!.sales).toBe(22900 * 2 + 5500 + 9900);
    expect(days[3]!.sales).toBe(26900);
    expect(days[0]!.sales).toBe(0);
  });

  it("cuenta pedidos por hora hoy frente al promedio de días anteriores", () => {
    const points = ordersByHour(orders, NOW, { baselineDays: 13 });
    expect(points.find((p) => p.hour === 12)?.today).toBe(3);
    expect(points.find((p) => p.hour === 13)?.today).toBe(2);
    expect(points.find((p) => p.hour === 20)?.average).toBe(0.1);
  });

  it("más pedidos por franja con cantidades", () => {
    const top = topDishesBySlot(orders, DISHES, TIME_SLOTS, periodRange("14d", NOW));
    expect(top.almuerzo!.map((x) => [x.dish.id, x.units])).toEqual([
      ["clasica-27", 2],
      ["gaseosa", 1],
      ["limonada-de-coco", 1],
    ]);
    expect(top.noche!.map((x) => x.dish.id)).toEqual(["la-diabla"]);
  });
});

describe("calificaciones del panel", () => {
  const dishRatings = [
    {
      id: "r1",
      dishId: "clasica-27",
      orderId: "o",
      stars: 5 as const,
      createdAt: at(0, 12),
      comment: "Buenísima",
    },
    { id: "r2", dishId: "clasica-27", orderId: "o", stars: 4 as const, createdAt: at(1, 12) },
    {
      id: "r3",
      dishId: "nuggets-de-pollo",
      orderId: "o",
      stars: 2 as const,
      createdAt: at(2, 16),
      comment: "Fríos",
    },
    { id: "r4", dishId: "gaseosa", orderId: "o", stars: 5 as const, createdAt: at(20, 12) },
  ];
  const service = [
    { id: "s1", sessionId: "a", waiterId: "carlos", stars: 5 as const, createdAt: at(0, 13) },
    { id: "s2", sessionId: "b", waiterId: "daniela", stars: 2 as const, createdAt: at(1, 20) },
  ];
  const week = periodRange("7d", NOW);

  it("promedia platos y servicio por separado en el periodo", () => {
    expect(ratingSummary(dishRatings, service, week)).toEqual({
      dishAverage: 11 / 3,
      dishCount: 3,
      serviceAverage: 3.5,
      serviceCount: 2,
    });
  });

  it("ordena el ranking con promedio bayesiano", () => {
    expect(dishRanking(dishRatings, DISHES, week).map((r) => r.dish.id)).toEqual([
      "clasica-27",
      "nuggets-de-pollo",
    ]);
  });

  it("comentarios del más reciente al más antiguo", () => {
    expect(recentComments(dishRatings, week).map((r) => r.comment)).toEqual(["Buenísima", "Fríos"]);
  });

  it("servicio por mesero", () => {
    expect(serviceByWaiter(service, WAITERS, week).map((x) => [x.waiter.id, x.average])).toEqual([
      ["carlos", 5],
      ["daniela", 2],
    ]);
  });

  it("restricciones agregadas por alérgeno", () => {
    const sessions: TableSession[] = [
      {
        id: "a",
        tableId: "mesa-1",
        openedAt: at(0, 12),
        cart: [],
        diners: [
          { id: "1", alias: "Ana", deviceId: "x", restrictions: ["lacteos", "gluten"] },
          { id: "2", alias: "Luis", deviceId: "y", restrictions: ["lacteos"] },
        ],
      },
      {
        id: "b",
        tableId: "mesa-2",
        openedAt: at(30, 12),
        cart: [],
        diners: [{ id: "3", alias: "Sofi", deviceId: "z", restrictions: ["mani"] }],
      },
    ];
    expect(restrictionStats(sessions, week)).toEqual({
      diners: 2,
      withRestrictions: 2,
      byAllergen: [
        { allergen: "lacteos", diners: 2 },
        { allergen: "gluten", diners: 1 },
      ],
    });
  });
});

describe("formulario de plato", () => {
  const ctx = { categoryIds: CATEGORIES.map((c) => c.id), otherNames: DISHES.map((d) => d.name) };

  it("interpreta precios colombianos", () => {
    expect(parsePrice("22.900")).toBe(22900);
    expect(parsePrice("$ 22,900")).toBe(22900);
    expect(parsePrice("0")).toBeNull();
    expect(parsePrice("veinte")).toBeNull();
  });

  it("exige nombre, precio, categoría, ingredientes y foto (regla 9)", () => {
    const e = validateDishDraft(emptyDraft(), ctx);
    expect(Object.keys(e).sort()).toEqual([
      "categoryId",
      "ingredients",
      "name",
      "photos",
      "variantRows",
    ]);
    expect(e.photos).toBe("Sube al menos una foto");
  });

  it("no repite nombres y valida filas de variantes e ingredientes", () => {
    const draft = {
      ...emptyDraft("hamburguesas"),
      name: "clásica 27",
      photos: ["x"],
      ingredients: [{ name: "", description: "algo", allergens: [] }],
      variants: [
        { name: "Sencilla", price: "1" },
        { name: "sencilla", price: "2" },
      ],
    };
    const e = validateDishDraft(draft, ctx);
    expect(e.name).toBe("Ya hay un plato con ese nombre");
    expect(e.variantRows?.[1]).toBe("Hay dos opciones con el mismo nombre");
    expect(e.ingredientRows?.[0]).toBe("Falta el nombre del ingrediente");
  });

  it("convierte el borrador en un plato con id único", () => {
    const draft = {
      ...emptyDraft("hamburguesas"),
      name: "  La Paisa ",
      photos: ["data:image/jpeg;base64,x"],
      variants: [{ name: "", price: "25.900" }],
      ingredients: [
        { name: "Carne", description: "", allergens: [] },
        { name: " ", description: "", allergens: [] },
      ],
      timeSlotIds: ["almuerzo"],
      featured: true,
    };
    const dish = draftToDish(draft, { takenIds: ["la-paisa"], now: "2026-09-29T12:00:00.000Z" });
    expect(dish).toMatchObject({
      id: "la-paisa-2",
      name: "La Paisa",
      variants: [{ id: "unica", name: "Única", price: 25900 }],
      featured: true,
    });
    expect(dish.ingredients).toEqual([{ name: "Carne", allergens: [] }]);
  });

  it("ida y vuelta con un plato existente conserva id y fecha", () => {
    const clasica = DISHES.find((d) => d.id === "clasica-27")!;
    const back = draftToDish(dishToDraft(clasica), { takenIds: [], now: "x", existing: clasica });
    expect(back).toEqual(clasica);
    expect(slugify("Ñame con Queso!", [])).toBe("name-con-queso");
  });

  it("valida el modelo 3D", () => {
    expect(validateModelFile({ name: "clasica.glb", size: 3_000_000 })).toBeNull();
    expect(validateModelFile({ name: "clasica.gltf", size: 1000 })).toBe(MODEL_ERROR);
    expect(validateModelFile({ name: "clasica.GLB", size: 5 * 1024 * 1024 })).toBe(MODEL_ERROR);
    expect(formatBytes(3_284_992)).toBe("3,1 MB");
  });
});

describe("configuración", () => {
  it("agrega y quita mesas; no quita una con clientes", () => {
    const tables = addTable(TABLES);
    expect(tables.at(-1)).toEqual({ id: "mesa-7", number: 7 });
    const open: TableSession = { id: "s", tableId: "mesa-3", openedAt: "x", cart: [], diners: [] };
    expect(removeTable({ tables, sessions: [open], waiters: WAITERS }, "mesa-3").ok).toBe(false);
    const r = removeTable({ tables, sessions: [], waiters: WAITERS }, "mesa-3");
    expect(r.ok && r.value.tables.some((t) => t.id === "mesa-3")).toBe(false);
    expect(r.ok && r.value.waiters[0]!.tableIds).toEqual(["mesa-1", "mesa-2"]);
  });

  it("una mesa tiene un solo mesero", () => {
    const moved = toggleTableAssignment(WAITERS, "daniela", "mesa-3");
    expect(moved.find((w) => w.id === "carlos")!.tableIds).toEqual(["mesa-1", "mesa-2"]);
    expect(moved.find((w) => w.id === "daniela")!.tableIds).toContain("mesa-3");
    const back = toggleTableAssignment(moved, "daniela", "mesa-3");
    expect(back.some((w) => w.tableIds.includes("mesa-3"))).toBe(false);
  });

  it("valida umbral y tiempo límite", () => {
    expect(validateThreshold(3)).toBeNull();
    expect(validateThreshold(6)).not.toBeNull();
    expect(validateTimeout(0)).not.toBeNull();
    expect(validateTimeout(3)).toBeNull();
  });

  it("al guardar franjas limpia las eliminadas de los platos", () => {
    const { slots, dishes } = applyTimeSlots(
      [
        ...TIME_SLOTS.filter((s) => s.id !== "tarde"),
        { name: "Brunch", start: "06:00", end: "07:00" },
      ],
      DISHES,
    );
    expect(slots.at(-1)!.id).toBe("brunch");
    expect(dishes.some((d) => d.timeSlotIds.includes("tarde"))).toBe(false);
  });
});
