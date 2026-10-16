import { describe, expect, it } from "vitest";
import {
  isAdditionalRound,
  KITCHEN_DONE_LIMIT,
  kitchenBoard,
  kitchenLayout,
  kitchenNextStatus,
  kitchenTimeLevel,
  orderTimeline,
  timelineProgress,
} from "./kitchen";
import type { Order, OrderStatus } from "./types";

const T0 = Date.parse("2026-09-28T12:00:00.000Z");
const iso = (min: number) => new Date(T0 + min * 60_000).toISOString();

function order(
  id: string,
  status: OrderStatus,
  confirmedMin?: number,
  over: Partial<Order> = {},
): Order {
  return {
    id,
    sessionId: "s",
    tableId: "mesa-1",
    round: 1,
    status,
    createdAt: iso(0),
    confirmedAt: confirmedMin === undefined ? undefined : iso(confirmedMin),
    items: [
      {
        id: `${id}-a`,
        dishId: "clasica-27",
        variantId: "doble",
        qty: 1,
        dinerId: "d",
        unitPrice: 1,
      },
      {
        id: `${id}-b`,
        dishId: "aros-de-cebolla",
        variantId: "unica",
        qty: 1,
        dinerId: "d",
        unitPrice: 1,
        removed: true,
        adjustReason: "Agotado",
      },
    ],
    ...over,
  };
}

describe("cola de cocina", () => {
  const view = kitchenBoard([
    order("p", "pendiente"),
    order("c2", "confirmado", 5, { sessionId: "s2" }),
    order("c1", "confirmado", 2, { sessionId: "s1" }),
    order("e", "en_preparacion", 1, { sessionId: "s3" }),
    order("l", "listo", 0, { sessionId: "s4", readyAt: iso(3) }),
    order("l2", "listo", 0, { sessionId: "s5", readyAt: iso(8) }),
    order("x", "entregado", 0, { sessionId: "s6" }),
    order("r", "rechazado", undefined, { sessionId: "s7" }),
  ]);

  it("es una sola cola en orden de llegada, solo con lo confirmado por el mesero", () => {
    expect(view.queue.map((t) => t.order.id)).toEqual(["e", "c1", "c2"]);
  });

  it("lo ya listo va aparte, lo más reciente primero", () => {
    expect(view.done.map((o) => o.id)).toEqual(["l2", "l"]);
  });

  it("oculta los ítems que quitó el mesero", () => {
    expect(view.queue[1]!.order.items.map((i) => i.dishId)).toEqual(["clasica-27"]);
  });

  it("marca como adicional la ronda de una mesa que ya había mandado otra a la cocina", () => {
    const v = kitchenBoard([
      order("a1", "en_preparacion", 0, { sessionId: "m1", round: 1 }),
      order("b1", "en_preparacion", 1, { sessionId: "m2", round: 1 }),
      order("a2", "en_preparacion", 5, { sessionId: "m1", round: 2 }),
    ]);
    expect(v.queue.map((t) => [t.order.id, t.additional])).toEqual([
      ["a1", false],
      ["b1", false],
      ["a2", true],
    ]);
  });

  it("el adicional no salta la fila ni cuenta si la ronda anterior no llegó a la cocina", () => {
    const v = kitchenBoard([
      order("a1", "rechazado", undefined, { sessionId: "m1", round: 1 }),
      order("a2", "en_preparacion", 1, { sessionId: "m1", round: 2 }),
      order("c1", "en_preparacion", 2, { sessionId: "m2", round: 1 }),
    ]);
    expect(v.queue.map((t) => [t.order.id, t.additional])).toEqual([
      ["a2", false],
      ["c1", false],
    ]);
    // Una ronda anterior ya entregada también hace adicional a la siguiente.
    expect(
      isAdditionalRound(order("n", "en_preparacion", 0, { sessionId: "m", round: 2 }), [
        order("v", "entregado", 0, { sessionId: "m", round: 1 }),
      ]),
    ).toBe(true);
  });

  it("limita lo hecho para consultar", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      order(`l${i}`, "listo", 0, { sessionId: `s${i}`, readyAt: iso(i) }),
    );
    expect(kitchenBoard(many).done).toHaveLength(KITCHEN_DONE_LIMIT);
  });

  it("cambia de color según el tiempo desde la confirmación", () => {
    const o = order("t", "en_preparacion", 0);
    expect(kitchenTimeLevel(o, T0 + 9 * 60_000)).toBe("normal");
    expect(kitchenTimeLevel(o, T0 + 10 * 60_000)).toBe("lento");
    expect(kitchenTimeLevel(o, T0 + 20 * 60_000)).toBe("atrasado");
  });

  it("el único paso de la cocina es marcar listo", () => {
    expect(kitchenNextStatus("en_preparacion")).toBe("listo");
    expect(kitchenNextStatus("confirmado")).toBe("listo");
    expect(kitchenNextStatus("listo")).toBeNull();
    expect(kitchenNextStatus("pendiente")).toBeNull();
  });
});

describe("distribución de la cola", () => {
  it("usa letra grande con pocos pedidos y tarjetas más densas con muchos", () => {
    expect(kitchenLayout(1)).toEqual({ density: "grande", columns: 1 });
    expect(kitchenLayout(3)).toEqual({ density: "grande", columns: 3 });
    expect(kitchenLayout(6)).toEqual({ density: "media", columns: 3 });
    expect(kitchenLayout(12)).toEqual({ density: "compacta", columns: 4 });
    expect(kitchenLayout(13)).toEqual({ density: "minima", columns: 5 });
    expect(kitchenLayout(0).columns).toBe(1);
  });
});

describe("línea de tiempo del cliente", () => {
  it("marca lo hecho con su hora, lo actual y lo pendiente", () => {
    const steps = orderTimeline(order("o", "en_preparacion", 2, { preparingAt: iso(4) }));
    expect(steps.map((s) => [s.status, s.state])).toEqual([
      ["pendiente", "hecho"],
      ["confirmado", "hecho"],
      ["en_preparacion", "actual"],
      ["listo", "pendiente"],
      ["entregado", "pendiente"],
    ]);
    expect(steps[1]!.at).toBe(iso(2));
    expect(steps[3]!.at).toBeUndefined();
    expect(timelineProgress({ status: "en_preparacion" })).toBe(0.5);
  });

  it("entregado queda completo", () => {
    const steps = orderTimeline(order("o", "entregado", 1, { deliveredAt: iso(20) }));
    expect(steps.every((s) => s.state === "hecho")).toBe(true);
    expect(timelineProgress({ status: "entregado" })).toBe(1);
  });

  it("rechazado corta la línea después de pendiente", () => {
    const steps = orderTimeline(
      order("o", "rechazado", undefined, { rejectReason: "Cocina cerrada" }),
    );
    expect(steps.map((s) => s.status)).toEqual(["pendiente", "rechazado"]);
    expect(timelineProgress({ status: "rechazado" })).toBe(0);
  });
});
