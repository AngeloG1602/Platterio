import { describe, expect, it } from "vitest";
import { DISHES } from "@/lib/data/catalog";
import { syncUnconfirmedAlerts, unconfirmedAlertId } from "./alerts";
import { adjustOrderItem, confirmLevel, releaseSession, tableOverview } from "./waiter";
import type { Order, OrderStatus, TableSession } from "./types";

const T0 = Date.parse("2026-09-28T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const table = { id: "mesa-3", number: 3 };
const session: TableSession = {
  id: "s1",
  tableId: "mesa-3",
  openedAt: iso(T0),
  diners: [],
  cart: [],
};
const clasica = DISHES.find((d) => d.id === "clasica-27")!;

function order(status: OrderStatus, over: Partial<Order> = {}): Order {
  return {
    id: `o-${status}`,
    sessionId: "s1",
    tableId: "mesa-3",
    round: 1,
    status,
    createdAt: iso(T0),
    items: [
      {
        id: "i1",
        dishId: "clasica-27",
        variantId: "sencilla",
        qty: 2,
        dinerId: "ana",
        unitPrice: 22900,
      },
      { id: "i2", dishId: "gaseosa", variantId: "400ml", qty: 1, dinerId: "luis", unitPrice: 5500 },
    ],
    ...over,
  };
}

describe("mapa de mesas", () => {
  it("libre sin sesión, con clientes sin pedidos", () => {
    expect(tableOverview(table, [], []).status).toBe("libre");
    expect(tableOverview(table, [{ ...session, closedAt: iso(T0) }], []).status).toBe("libre");
    expect(tableOverview(table, [session], []).status).toBe("con_clientes");
  });

  it("prioriza lo más urgente", () => {
    const s = [session];
    expect(tableOverview(table, s, [order("entregado")]).status).toBe("con_clientes");
    expect(tableOverview(table, s, [order("en_preparacion")]).status).toBe("en_cocina");
    expect(tableOverview(table, s, [order("en_preparacion"), order("listo")]).status).toBe("listo");
    expect(tableOverview(table, s, [order("listo"), order("pendiente")]).status).toBe("pendiente");
  });

  it("ignora pedidos de otras sesiones", () => {
    expect(
      tableOverview(table, [session], [order("pendiente", { sessionId: "vieja" })]).status,
    ).toBe("con_clientes");
  });
});

describe("tiempo sin confirmar", () => {
  it("pasa a alerta en el límite y a crítica en el doble", () => {
    const at = iso(T0);
    expect(confirmLevel(at, T0 + 2 * 60_000, 3)).toBe("a_tiempo");
    expect(confirmLevel(at, T0 + 3 * 60_000, 3)).toBe("alerta");
    expect(confirmLevel(at, T0 + 6 * 60_000, 3)).toBe("critica");
  });

  it("crea una alerta al administrador por pedido crítico y la resuelve al confirmar", () => {
    const waiters = [{ id: "carlos", name: "Carlos", tableIds: ["mesa-3"] }];
    const pending = order("pendiente");
    const early = syncUnconfirmedAlerts({
      alerts: [],
      orders: [pending],
      waiters,
      now: T0 + 4 * 60_000,
      timeoutMin: 3,
    });
    expect(early).toEqual([]);
    const late = syncUnconfirmedAlerts({
      alerts: [],
      orders: [pending],
      waiters,
      now: T0 + 6 * 60_000,
      timeoutMin: 3,
    });
    expect(late).toEqual([
      expect.objectContaining({
        id: unconfirmedAlertId(pending.id),
        type: "sin_confirmar",
        waiterId: "carlos",
        resolved: false,
      }),
    ]);
    const again = syncUnconfirmedAlerts({
      alerts: late,
      orders: [pending],
      waiters,
      now: T0 + 9 * 60_000,
      timeoutMin: 3,
    });
    expect(again).toBe(late);
    const confirmed = syncUnconfirmedAlerts({
      alerts: late,
      orders: [{ ...pending, status: "confirmado" }],
      waiters,
      now: T0 + 9 * 60_000,
      timeoutMin: 3,
    });
    expect(confirmed[0]!.resolved).toBe(true);
  });
});

describe("ajustes del mesero", () => {
  it("quita un ítem con motivo sin tocar el resto", () => {
    const r = adjustOrderItem(order("pendiente"), "i1", { type: "quitar" }, "Agotado", clasica);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.items[0]).toMatchObject({ removed: true, adjustReason: "Agotado" });
    expect(r.order.items[1]).toEqual(order("pendiente").items[1]);
  });

  it("cambia cantidad o variante y recuerda el original", () => {
    const qty = adjustOrderItem(
      order("pendiente"),
      "i1",
      { type: "cantidad", qty: 1 },
      "Cambio pedido por el cliente",
      clasica,
    );
    expect(qty.ok && qty.order.items[0]).toMatchObject({
      qty: 1,
      adjustedFrom: { qty: 2, variantId: "sencilla" },
    });
    const variant = adjustOrderItem(
      order("pendiente"),
      "i1",
      { type: "variante", variantId: "doble" },
      "Cambio pedido por el cliente",
      clasica,
    );
    expect(variant.ok && variant.order.items[0]).toMatchObject({
      variantId: "doble",
      unitPrice: 29900,
    });
  });

  it("exige motivo, pedido pendiente y cambios reales", () => {
    expect(adjustOrderItem(order("pendiente"), "i1", { type: "quitar" }, " ", clasica)).toEqual({
      ok: false,
      error: "Indica el motivo del cambio",
    });
    expect(
      adjustOrderItem(order("confirmado"), "i1", { type: "quitar" }, "Agotado", clasica).ok,
    ).toBe(false);
    expect(
      adjustOrderItem(order("pendiente"), "i1", { type: "cantidad", qty: 2 }, "Otro", clasica).ok,
    ).toBe(false);
    expect(
      adjustOrderItem(
        order("pendiente"),
        "i1",
        { type: "variante", variantId: "triple" },
        "Otro",
        clasica,
      ).ok,
    ).toBe(false);
  });

  it("no deja quitar el último ítem: para eso se rechaza", () => {
    const first = adjustOrderItem(order("pendiente"), "i1", { type: "quitar" }, "Agotado", clasica);
    if (!first.ok) throw new Error();
    expect(adjustOrderItem(first.order, "i2", { type: "quitar" }, "Agotado", undefined)).toEqual({
      ok: false,
      error: "Si quitas todo, mejor rechaza el pedido",
    });
  });
});

describe("liberar mesa", () => {
  it("no libera con rondas sin entregar", () => {
    expect(releaseSession(session, [order("listo")], iso(T0))).toEqual({
      ok: false,
      error: "Hay una ronda sin entregar",
    });
  });
  it("libera con todo entregado o rechazado y vacía el carrito", () => {
    const r = releaseSession(
      {
        ...session,
        cart: [{ id: "c", dishId: "gaseosa", variantId: "400ml", qty: 1, dinerId: "x" }],
      },
      [order("entregado"), order("rechazado")],
      iso(T0),
    );
    expect(r.ok && r.session).toMatchObject({ closedAt: iso(T0), cart: [] });
    if (r.ok) expect(releaseSession(r.session, [], iso(T0)).ok).toBe(false);
  });
});
