import { describe, expect, it } from "vitest";
import {
  kitchenBoard,
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

describe("tablero de cocina", () => {
  const board = kitchenBoard([
    order("p", "pendiente"),
    order("c2", "confirmado", 5),
    order("c1", "confirmado", 2),
    order("e", "en_preparacion", 1),
    order("l", "listo", 0),
    order("x", "entregado", 0),
    order("r", "rechazado"),
  ]);

  it("solo muestra lo confirmado por el mesero, por columna", () => {
    expect(board.confirmado.map((o) => o.id)).toEqual(["c1", "c2"]);
    expect(board.en_preparacion.map((o) => o.id)).toEqual(["e"]);
    expect(board.listo.map((o) => o.id)).toEqual(["l"]);
  });

  it("oculta los ítems que quitó el mesero", () => {
    expect(board.confirmado[0]!.items.map((i) => i.dishId)).toEqual(["clasica-27"]);
  });

  it("cambia de color según el tiempo desde la confirmación", () => {
    const o = order("t", "en_preparacion", 0);
    expect(kitchenTimeLevel(o, T0 + 9 * 60_000)).toBe("normal");
    expect(kitchenTimeLevel(o, T0 + 10 * 60_000)).toBe("lento");
    expect(kitchenTimeLevel(o, T0 + 20 * 60_000)).toBe("atrasado");
  });

  it("un toque avanza confirmado → en preparación → listo", () => {
    expect(kitchenNextStatus("confirmado")).toBe("en_preparacion");
    expect(kitchenNextStatus("en_preparacion")).toBe("listo");
    expect(kitchenNextStatus("listo")).toBeNull();
    expect(kitchenNextStatus("pendiente")).toBeNull();
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
