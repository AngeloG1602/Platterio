import { describe, expect, it } from "vitest";
import { allowedTransitions, isFinal, transitionOrder } from "./orderStatus";
import type { Order } from "./types";

const base: Order = {
  id: "o1",
  sessionId: "s1",
  tableId: "mesa-3",
  round: 1,
  status: "pendiente",
  createdAt: "2026-09-28T12:00:00.000Z",
  items: [
    {
      id: "i1",
      dishId: "clasica-27",
      variantId: "sencilla",
      qty: 1,
      dinerId: "d1",
      unitPrice: 22900,
    },
  ],
};
const AT = "2026-09-28T12:05:00.000Z";

describe("máquina de estados del pedido", () => {
  it("recorre el camino feliz con los actores correctos", () => {
    let order = base;
    const steps = [
      ["confirmado", "mesero"],
      ["en_preparacion", "cocina"],
      ["listo", "cocina"],
      ["entregado", "mesero"],
    ] as const;
    for (const [to, actor] of steps) {
      const r = transitionOrder(order, to, actor, AT);
      expect(r.ok).toBe(true);
      if (r.ok) order = r.order;
    }
    expect(order.status).toBe("entregado");
    expect(order.confirmedAt).toBe(AT);
    expect(order.preparingAt).toBe(AT);
    expect(order.readyAt).toBe(AT);
    expect(order.deliveredAt).toBe(AT);
    expect(isFinal(order.status)).toBe(true);
  });

  it("ningún pedido llega a cocina sin confirmación del mesero", () => {
    const r = transitionOrder(base, "en_preparacion", "cocina", AT);
    expect(r.ok).toBe(false);
    expect(allowedTransitions("pendiente", "cocina")).toEqual([]);
  });

  it("valida el actor", () => {
    const r = transitionOrder(base, "confirmado", "cocina", AT);
    expect(r).toEqual({ ok: false, error: "Ese cambio lo hace el mesero" });
  });

  it("rechazar exige motivo y lo guarda", () => {
    expect(transitionOrder(base, "rechazado", "mesero", AT, "  ").ok).toBe(false);
    const r = transitionOrder(base, "rechazado", "mesero", AT, " Cocina cerrada ");
    expect(r.ok && r.order.rejectReason).toBe("Cocina cerrada");
    expect(r.ok && isFinal(r.order.status)).toBe(true);
  });

  it("no confirma un pedido con todos los ítems quitados", () => {
    const empty: Order = { ...base, items: base.items.map((i) => ({ ...i, removed: true })) };
    expect(transitionOrder(empty, "confirmado", "mesero", AT).ok).toBe(false);
  });

  it("no permite retroceder ni saltar estados", () => {
    const listo: Order = { ...base, status: "listo" };
    expect(transitionOrder(listo, "en_preparacion", "cocina", AT).ok).toBe(false);
    expect(transitionOrder(base, "entregado", "mesero", AT).ok).toBe(false);
  });

  it("no modifica el pedido original", () => {
    transitionOrder(base, "confirmado", "mesero", AT);
    expect(base.status).toBe("pendiente");
    expect(base.confirmedAt).toBeUndefined();
  });
});
