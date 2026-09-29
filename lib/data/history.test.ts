import { describe, expect, it } from "vitest";
import { DISHES, TABLES, TIME_SLOTS, WAITERS } from "./catalog";
import { generateHistory, seedAlerts } from "./history";

const catalog = { dishes: DISHES, timeSlots: TIME_SLOTS, tables: TABLES, waiters: WAITERS };
const EPOCH = new Date(2026, 8, 28, 13, 30).getTime();
const history = generateHistory(catalog, EPOCH);

describe("historial sembrado", () => {
  it("es determinista para el mismo momento de siembra", () => {
    expect(generateHistory(catalog, EPOCH)).toEqual(history);
  });

  it("cubre 14 días con un volumen creíble", () => {
    const days = new Set(history.orders.map((o) => new Date(o.createdAt).toDateString()));
    expect(days.size).toBe(14);
    expect(history.orders.length).toBeGreaterThan(300);
    expect(history.dishRatings.length).toBeGreaterThan(150);
  });

  it("no tiene nada en el futuro y todo está entregado", () => {
    for (const o of history.orders) {
      expect(o.status).toBe("entregado");
      expect(Date.parse(o.deliveredAt!)).toBeLessThanOrEqual(EPOCH);
    }
    for (const r of history.dishRatings) expect(Date.parse(r.createdAt)).toBeLessThanOrEqual(EPOCH);
  });

  it("los precios congelados coinciden con las variantes", () => {
    for (const o of history.orders) {
      for (const item of o.items) {
        const dish = DISHES.find((d) => d.id === item.dishId)!;
        expect(dish.variants.find((v) => v.id === item.variantId)?.price).toBe(item.unitPrice);
      }
    }
  });

  it("solo califica platos que estaban en el pedido", () => {
    const orders = new Map(history.orders.map((o) => [o.id, o]));
    for (const r of history.dishRatings) {
      expect(orders.get(r.orderId)?.items.some((i) => i.dishId === r.dishId)).toBe(true);
    }
  });

  it("incluye reseñas negativas y una alerta de servicio bajo sin resolver", () => {
    const negatives = history.dishRatings.filter((r) => r.stars <= 2 && r.comment);
    expect(negatives.length).toBeGreaterThanOrEqual(3);
    const alerts = seedAlerts(history, WAITERS);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "servicio_bajo",
      tableId: "mesa-5",
      waiterId: "daniela",
      stars: 2,
      resolved: false,
    });
  });

  it("una calificación de servicio por visita", () => {
    const sessions = history.serviceRatings.map((r) => r.sessionId);
    expect(new Set(sessions).size).toBe(sessions.length);
  });
});
