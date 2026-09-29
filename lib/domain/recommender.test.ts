import { describe, expect, it } from "vitest";
import { recommend, slotHeadline, unitsOrdered, WEIGHTS } from "./recommender";
import type { Dish, Order, Stars, TimeSlot } from "./types";

const almuerzo: TimeSlot = { id: "almuerzo", name: "Almuerzo", start: "11:00", end: "15:00" };
const noche: TimeSlot = { id: "noche", name: "Noche", start: "18:00", end: "23:00" };
const NOW = new Date(2026, 8, 28, 13, 0);

function dish(id: string, over: Partial<Dish> = {}): Dish {
  return {
    id,
    name: id,
    description: "",
    categoryId: "hamburguesas",
    variants: [{ id: "unica", name: "Única", price: 10000 }],
    ingredients: [{ name: "Pan", allergens: [] }],
    spiceLevel: 0,
    photos: ["/x.jpg"],
    timeSlotIds: ["almuerzo"],
    active: true,
    featured: false,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...over,
  };
}

let seq = 0;
function order(
  daysAgo: number,
  hour: number,
  items: Array<[string, number]>,
  status: Order["status"] = "entregado",
): Order {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 15, 0, 0);
  return {
    id: `o${++seq}`,
    sessionId: "s",
    tableId: "mesa-1",
    round: 1,
    status,
    createdAt: d.toISOString(),
    items: items.map(([dishId, qty], i) => ({
      id: `i${seq}-${i}`,
      dishId,
      variantId: "unica",
      qty,
      dinerId: "d",
      unitPrice: 10000,
    })),
  };
}

const ratings = (dishId: string, stars: Stars, n: number) =>
  Array.from({ length: n }, () => ({ dishId, stars }));

describe("recomendador", () => {
  it("los pesos suman 1", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("cuenta unidades por franja dentro de la ventana y sin rechazados ni quitados", () => {
    const orders = [
      order(1, 12, [["a", 2]]),
      order(1, 20, [["a", 1]]),
      order(20, 12, [["a", 5]]),
      order(2, 12, [["a", 4]], "rechazado"),
      {
        ...order(3, 12, [["a", 3]]),
        items: [
          {
            id: "x",
            dishId: "a",
            variantId: "unica",
            qty: 3,
            dinerId: "d",
            unitPrice: 1,
            removed: true,
          },
        ],
      },
    ];
    const { inSlot, total } = unitsOrdered(orders, NOW, 14, almuerzo);
    expect(inSlot.get("a")).toBe(2);
    expect(total.get("a")).toBe(3);
  });

  it("ordena por puntaje ponderado y favorece la franja actual", () => {
    const dishes = [dish("almuerzo-popular"), dish("de-noche", { timeSlotIds: ["noche"] })];
    const orders = [order(1, 12, [["almuerzo-popular", 5]]), order(1, 20, [["de-noche", 9]])];
    const recs = recommend({ dishes, slot: almuerzo, now: NOW, orders, ratings: [] });
    expect(recs.map((r) => r.dish.id)).toEqual(["almuerzo-popular", "de-noche"]);
    expect(recs[0]!.reason).toBe("popular");

    const night = recommend({ dishes, slot: noche, now: NOW, orders, ratings: [] });
    expect(night[0]!.dish.id).toBe("de-noche");
  });

  it("no recomienda platos con alérgenos del cliente", () => {
    const dishes = [
      dish("con-lacteos", { ingredients: [{ name: "Queso", allergens: ["lacteos"] }] }),
      dish("sin-lacteos"),
    ];
    const orders = [
      order(1, 12, [
        ["con-lacteos", 3],
        ["sin-lacteos", 1],
      ]),
    ];
    const recs = recommend({
      dishes,
      slot: almuerzo,
      now: NOW,
      orders,
      ratings: [],
      restrictions: ["lacteos"],
    });
    expect(recs.map((r) => r.dish.id)).toEqual(["sin-lacteos"]);
  });

  it("no recomienda platos desactivados", () => {
    const dishes = [dish("apagado", { active: false }), dish("prendido")];
    const orders = [
      order(1, 12, [
        ["apagado", 9],
        ["prendido", 1],
      ]),
    ];
    expect(
      recommend({ dishes, slot: almuerzo, now: NOW, orders, ratings: [] }).map((r) => r.dish.id),
    ).toEqual(["prendido"]);
  });

  it("el promedio bayesiano evita que dos reseñas de 5 ganen a cien de 4,6", () => {
    const dishes = [dish("pocas"), dish("muchas")];
    const orders = [
      order(1, 12, [
        ["pocas", 1],
        ["muchas", 1],
      ]),
    ];
    const rs = [
      ...ratings("pocas", 5, 2),
      ...ratings("muchas", 5, 60),
      ...ratings("muchas", 4, 40),
      ...ratings("otro", 3, 30),
    ];
    const recs = recommend({ dishes, slot: almuerzo, now: NOW, orders, ratings: rs });
    expect(recs[0]!.dish.id).toBe("muchas");
    expect(recs[0]!.breakdown.calificacion).toBe(1);
  });

  it("arranque en frío: sin pedidos ni calificaciones solo aparece si está destacado, y va primero", () => {
    const dishes = [
      dish("estrella"),
      dish("nuevo-sin-destacar", { createdAt: "2026-09-27T00:00:00.000Z" }),
      dish("nuevo-destacado", { featured: true, createdAt: "2026-09-28T00:00:00.000Z" }),
    ];
    const orders = [order(1, 12, [["estrella", 10]])];
    const recs = recommend({
      dishes,
      slot: almuerzo,
      now: NOW,
      orders,
      ratings: ratings("estrella", 5, 20),
    });
    expect(recs.map((r) => r.dish.id)).toEqual(["nuevo-destacado", "estrella"]);
    expect(recs[0]!.reason).toBe("nuevo");
  });

  it("muestra como máximo 6 y explica el motivo principal", () => {
    const dishes = Array.from({ length: 9 }, (_, i) =>
      dish(`p${i}`, { featured: i === 8, categoryId: `c${i}` }),
    );
    const orders = [
      order(
        1,
        12,
        dishes.slice(0, 8).map((d, i) => [d.id, i + 1] as [string, number]),
      ),
      order(1, 20, [["p8", 1]]),
    ];
    const rs = [...ratings("p0", 5, 50), ...ratings("p1", 3, 50)];
    const recs = recommend({ dishes, slot: almuerzo, now: NOW, orders, ratings: rs });
    expect(recs).toHaveLength(6);
    expect(recs.find((r) => r.dish.id === "p7")?.reason).toBe("popular");
    expect(recs.find((r) => r.dish.id === "p0")?.reason).toBe("calificado");
    expect(recs.find((r) => r.dish.id === "p8")?.reason).toBe("casa");
  });

  it("no mete más de 2 platos de la misma categoría si hay alternativas", () => {
    const bebidas = Array.from({ length: 4 }, (_, i) =>
      dish(`bebida${i}`, { categoryId: "bebidas" }),
    );
    const comida = [dish("hamburguesa"), dish("perro", { categoryId: "perros" })];
    const orders = [
      order(1, 12, [
        ...bebidas.map((d) => [d.id, 10] as [string, number]),
        ["hamburguesa", 1],
        ["perro", 1],
      ]),
    ];
    const recs = recommend({
      dishes: [...bebidas, ...comida],
      slot: almuerzo,
      now: NOW,
      orders,
      ratings: [],
      limit: 4,
    });
    expect(recs.filter((r) => r.dish.categoryId === "bebidas")).toHaveLength(2);
    expect(recs.map((r) => r.dish.id)).toEqual(expect.arrayContaining(["hamburguesa", "perro"]));
    const pocas = recommend({
      dishes: bebidas,
      slot: almuerzo,
      now: NOW,
      orders,
      ratings: [],
      limit: 4,
    });
    expect(pocas).toHaveLength(4);
  });

  it("titula el carrusel según la franja", () => {
    expect(slotHeadline(almuerzo)).toBe("Para el almuerzo");
    expect(slotHeadline(null)).toBe("Recomendados");
    expect(slotHeadline({ id: "x", name: "Brunch", start: "09:00", end: "12:00" })).toBe(
      "Para brunch",
    );
  });
});
