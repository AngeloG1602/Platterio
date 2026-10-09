import { describe, expect, it } from "vitest";
import { DISHES } from "@/lib/data/catalog";
import {
  addDriver,
  customerCanCancel,
  DEFAULT_DELIVERY,
  deliveryCode,
  deliveryItems,
  deliveryQueue,
  deliveryStage,
  deliveryStats,
  deliveryTimeline,
  dispatchDelivery,
  isDeliveryOpen,
  normalizePhone,
  placeDeliveryOrder,
  validateCheckout,
  validateDeliveryConfig,
  type CheckoutInput,
} from "./delivery";
import type { DeliveryInfo, Order } from "./types";

const clasica = DISHES.find((d) => d.id === "clasica-27")!;
const v = clasica.variants[0]!;
const cart = [{ id: "l1", dishId: clasica.id, variantId: v.id, qty: 2 }];
const subtotal = v.price * 2;
const at = (h: number, m = 0) => new Date(2026, 9, 7, h, m).getTime();
const input: CheckoutInput = {
  type: "domicilio",
  name: " Ana  Gómez ",
  phone: "+57 300 123 4567",
  address: "Calle 10 # 5-20 apto 301",
  reference: "Portón negro",
  zoneId: "zona-centro",
  payWith: "efectivo",
  cashFor: "",
  note: "",
};
const place = (over: Partial<Parameters<typeof placeDeliveryOrder>[0]> = {}) => {
  let n = 0;
  return placeDeliveryOrder({
    config: DEFAULT_DELIVERY,
    dishes: DISHES,
    cart,
    input,
    nowMs: at(13),
    sessionId: "s1",
    orderId: "o1",
    code: "D-TEST",
    itemId: () => `i${++n}`,
    ...over,
  });
};

describe("horario", () => {
  it("abre dentro del horario y cierra fuera", () => {
    expect(isDeliveryOpen(DEFAULT_DELIVERY, at(13))).toBe(true);
    expect(isDeliveryOpen(DEFAULT_DELIVERY, at(10, 59))).toBe(false);
    expect(isDeliveryOpen(DEFAULT_DELIVERY, at(22))).toBe(false);
    expect(isDeliveryOpen({ ...DEFAULT_DELIVERY, enabled: false }, at(13))).toBe(false);
  });
  it("un horario que cruza la medianoche", () => {
    const night = { ...DEFAULT_DELIVERY, opensAt: "18:00", closesAt: "02:00" };
    expect(isDeliveryOpen(night, at(23))).toBe(true);
    expect(isDeliveryOpen(night, at(1))).toBe(true);
    expect(isDeliveryOpen(night, at(12))).toBe(false);
  });
});

describe("celular", () => {
  it("acepta formatos comunes y rechaza los inválidos", () => {
    expect(normalizePhone("+57 300 123 4567")).toBe("3001234567");
    expect(normalizePhone("300-123-4567")).toBe("3001234567");
    expect(normalizePhone("6012345678")).toBeNull();
    expect(normalizePhone("30012345")).toBeNull();
  });
});

describe("formulario", () => {
  it("limpia los datos y calcula el tiempo prometido", () => {
    const r = validateCheckout(input, DEFAULT_DELIVERY, subtotal);
    expect(r.ok && r.info).toMatchObject({
      customerName: "Ana Gómez",
      phone: "3001234567",
      zoneName: "Centro",
      fee: 4000,
      etaMin: 40,
    });
  });
  it("pide cada dato y respeta el pedido mínimo de la zona", () => {
    const r = validateCheckout(
      { ...input, name: "", phone: "1", address: "x", zoneId: "" },
      DEFAULT_DELIVERY,
      subtotal,
    );
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["address", "name", "phone", "zoneId"]);
    const low = validateCheckout(input, DEFAULT_DELIVERY, 10000);
    expect(!low.ok && low.errors.cart).toMatch(/mínimo para Centro/);
  });
  it("recoger no pide dirección ni zona y no cobra envío", () => {
    const r = validateCheckout(
      { ...input, type: "recoger", address: "", zoneId: "" },
      DEFAULT_DELIVERY,
      5000,
    );
    expect(r.ok && r.info).toMatchObject({ fee: 0, etaMin: 20 });
    expect(r.ok && r.info.address).toBeUndefined();
    const off = validateCheckout(
      { ...input, type: "recoger" },
      { ...DEFAULT_DELIVERY, pickup: false },
      5000,
    );
    expect(off.ok).toBe(false);
  });
  it("con cuánto paga: debe alcanzar para el total", () => {
    const bad = validateCheckout({ ...input, cashFor: "20000" }, DEFAULT_DELIVERY, subtotal);
    expect(!bad.ok && bad.errors.cashFor).toMatch(/al menos el total/);
    const ok = validateCheckout({ ...input, cashFor: "100.000" }, DEFAULT_DELIVERY, subtotal);
    expect(ok.ok && ok.info.cashFor).toBe(100000);
    const card = validateCheckout(
      { ...input, payWith: "tarjeta", cashFor: "1" },
      DEFAULT_DELIVERY,
      subtotal,
    );
    expect(card.ok && card.info.cashFor).toBeUndefined();
  });
});

describe("crear el pedido", () => {
  it("crea una sesión sin mesa y una ronda pendiente con precios congelados", () => {
    const r = place();
    if (!r.ok) throw new Error(r.error);
    expect(r.session).toMatchObject({
      tableId: "domicilio",
      delivery: { code: "D-TEST", fee: 4000 },
    });
    expect(r.order).toMatchObject({ status: "pendiente", round: 1, tableId: "domicilio" });
    expect(r.order.items[0]).toMatchObject({ qty: 2, unitPrice: v.price, dinerId: "cliente" });
  });
  it("no recibe pedidos cerrado, vacío o con platos inactivos", () => {
    expect(place({ nowMs: at(23) })).toMatchObject({
      ok: false,
      error: expect.stringContaining("cerrados"),
    });
    expect(place({ cart: [] })).toEqual({ ok: false, error: "Tu pedido está vacío" });
    const off = DISHES.map((d) => (d.id === clasica.id ? { ...d, active: false } : d));
    expect(place({ dishes: off }).ok).toBe(false);
    expect(place({ config: { ...DEFAULT_DELIVERY, enabled: false } }).ok).toBe(false);
  });
  it("devuelve los errores del formulario por campo", () => {
    const r = place({ input: { ...input, phone: "" } });
    expect(!r.ok && r.errors?.phone).toBeDefined();
  });
  it("el código es estable y legible", () => {
    expect(deliveryCode("sesion-abc")).toBe(deliveryCode("sesion-abc"));
    expect(deliveryCode("sesion-abc")).toMatch(/^D-[A-Z2-9]{4}$/);
  });
});

describe("etapas y línea de tiempo", () => {
  const info = (over: Partial<DeliveryInfo> = {}): DeliveryInfo => ({
    code: "D-1",
    type: "domicilio",
    customerName: "A",
    phone: "3",
    fee: 0,
    payWith: "efectivo",
    etaMin: 30,
    ...over,
  });
  it("listo sin domiciliario sigue siendo preparación; con él, en camino", () => {
    expect(deliveryStage({ status: "listo" }, info())).toBe("listo");
    expect(deliveryStage({ status: "listo" }, info({ dispatchedAt: "x" }))).toBe("en_camino");
    expect(deliveryStage({ status: "rechazado" }, info())).toBe("cancelado");
  });
  it("marca hecho, actual y pendiente", () => {
    const steps = deliveryTimeline({ status: "en_preparacion" }, info());
    expect(steps.map((s) => s.state)).toEqual([
      "hecho",
      "hecho",
      "actual",
      "pendiente",
      "pendiente",
    ]);
    expect(deliveryTimeline({ status: "listo" }, info({ type: "recoger" }))[3]).toMatchObject({
      label: "Listo para recoger",
      state: "actual",
    });
    expect(
      deliveryTimeline({ status: "entregado" }, info()).every((s) => s.state === "hecho"),
    ).toBe(true);
    expect(
      deliveryTimeline({ status: "rechazado" }, info()).every((s) => s.state === "pendiente"),
    ).toBe(true);
  });
  it("el cliente solo cancela antes de la confirmación", () => {
    expect(customerCanCancel({ status: "pendiente" })).toBe(true);
    expect(customerCanCancel({ status: "confirmado" })).toBe(false);
  });
});

describe("despacho", () => {
  const r = place();
  if (!r.ok) throw new Error();
  const ready: Order = { ...r.order, status: "listo" };
  it("solo sale un domicilio listo, con alguien que lo lleve, y una vez", () => {
    expect(dispatchDelivery(r.session, r.order, "Andrés", "n")).toEqual({
      ok: false,
      error: "El pedido todavía no está listo",
    });
    expect(dispatchDelivery(r.session, ready, " ", "n").ok).toBe(false);
    const ok = dispatchDelivery(r.session, ready, "Andrés", "n");
    if (!ok.ok) throw new Error();
    expect(ok.session.delivery).toMatchObject({ driver: "Andrés", dispatchedAt: "n" });
    expect(dispatchDelivery(ok.session, ready, "Otro", "m")).toEqual({
      ok: false,
      error: "Ese pedido ya salió",
    });
  });
  it("para recoger no hay despacho", () => {
    const p = place({ input: { ...input, type: "recoger" } });
    if (!p.ok) throw new Error();
    expect(dispatchDelivery(p.session, { ...p.order, status: "listo" }, "A", "n").ok).toBe(false);
  });
});

describe("bandeja del personal", () => {
  const make = (
    id: string,
    status: Order["status"],
    extra: Partial<DeliveryInfo> = {},
    openedAt = at(12),
  ) => {
    const r = place({ sessionId: `s-${id}`, orderId: `o-${id}`, nowMs: at(13) });
    if (!r.ok) throw new Error();
    return {
      session: {
        ...r.session,
        openedAt: new Date(openedAt).toISOString(),
        delivery: { ...r.session.delivery!, ...extra },
      },
      order: {
        ...r.order,
        status,
        ...(status === "entregado" ? { deliveredAt: new Date(at(13, 30)).toISOString() } : {}),
      },
    };
  };
  const rows = [
    make("a", "pendiente"),
    make("b", "en_preparacion"),
    make("c", "listo"),
    make("d", "listo", { dispatchedAt: "x" }),
    make("e", "entregado"),
    make("f", "rechazado", {}, at(12) - 3 * 86_400_000),
  ];
  const items = deliveryItems(
    rows.map((r) => r.session),
    rows.map((r) => r.order),
  );
  it("agrupa por lo que toca hacer y deja los finalizados de hoy", () => {
    const q = deliveryQueue(items, at(14));
    expect([q.nuevos, q.enCocina, q.porSalir, q.enCamino, q.cerrados].map((l) => l.length)).toEqual(
      [1, 1, 1, 1, 1],
    );
  });
  it("calcula el reporte del periodo", () => {
    const stats = deliveryStats(
      rows.map((r) => r.session),
      rows.map((r) => r.order),
      { from: at(0), to: at(23) },
    );
    expect(stats).toMatchObject({
      orders: 5,
      delivered: 1,
      cancelled: 0,
      fees: 4000,
      avgMinutes: 30,
    });
    expect(stats.byZone[0]).toMatchObject({ name: "Centro", orders: 1 });
    const all = deliveryStats(
      rows.map((r) => r.session),
      rows.map((r) => r.order),
      { from: at(0) - 5 * 86_400_000, to: at(23) },
    );
    expect(all.cancelled).toBe(1);
  });
});

describe("configuración", () => {
  it("la de la casa es válida y detecta errores", () => {
    expect(validateDeliveryConfig(DEFAULT_DELIVERY)).toBeNull();
    expect(validateDeliveryConfig({ ...DEFAULT_DELIVERY, opensAt: "9" })).toMatch(/HH:MM/);
    const z = DEFAULT_DELIVERY.zones[0]!;
    expect(validateDeliveryConfig({ ...DEFAULT_DELIVERY, zones: [z, { ...z, id: "b" }] })).toMatch(
      /repetida/,
    );
    expect(validateDeliveryConfig({ ...DEFAULT_DELIVERY, zones: [{ ...z, fee: -1 }] })).toMatch(
      /envío/,
    );
    expect(
      validateDeliveryConfig({ ...DEFAULT_DELIVERY, drivers: [{ name: "A" }, { name: "a" }] }),
    ).toMatch(/repetido/);
    expect(validateDeliveryConfig({ ...DEFAULT_DELIVERY, zones: [], pickup: false })).toMatch(
      /al menos una zona/,
    );
  });
});

describe("domiciliarios y WhatsApp", () => {
  it("agrega un domiciliario con su celular normalizado", () => {
    const r = addDriver(DEFAULT_DELIVERY, { name: " Mateo ", phone: "+57 300 777 8899" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.drivers.at(-1)).toEqual({ name: "Mateo", phone: "3007778899" });
  });

  it("el celular es opcional, pero si se escribe debe ser válido", () => {
    const sin = addDriver(DEFAULT_DELIVERY, { name: "Mateo", phone: "" });
    expect(sin.ok && sin.config.drivers.at(-1)).toEqual({ name: "Mateo" });
    expect(addDriver(DEFAULT_DELIVERY, { name: "Mateo", phone: "12345" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/10 dígitos/),
    });
  });

  it("no permite nombres vacíos, largos ni repetidos", () => {
    expect(addDriver(DEFAULT_DELIVERY, { name: " ", phone: "" }).ok).toBe(false);
    expect(addDriver(DEFAULT_DELIVERY, { name: "a".repeat(31), phone: "" }).ok).toBe(false);
    expect(addDriver(DEFAULT_DELIVERY, { name: "andrés", phone: "" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/ya está/),
    });
  });

  it("valida el WhatsApp del negocio y los celulares de los domiciliarios", () => {
    expect(validateDeliveryConfig({ ...DEFAULT_DELIVERY, whatsapp: "123" })).toMatch(/WhatsApp/);
    expect(validateDeliveryConfig({ ...DEFAULT_DELIVERY, whatsapp: undefined })).toBeNull();
    expect(
      validateDeliveryConfig({ ...DEFAULT_DELIVERY, drivers: [{ name: "A", phone: "99" }] }),
    ).toMatch(/celular/);
  });

  it("al despachar se guarda el celular del domiciliario en el pedido", () => {
    const session = {
      id: "s",
      delivery: {
        code: "D-1",
        type: "domicilio",
        customerName: "Ana",
        phone: "3001234567",
        fee: 0,
        payWith: "efectivo",
        etaMin: 30,
      },
    } as unknown as Parameters<typeof dispatchDelivery>[0];
    const order = { status: "listo" } as Parameters<typeof dispatchDelivery>[1];
    const r = dispatchDelivery(session, order, "Mateo", "2026-10-07T13:00:00Z", "3007778899");
    expect(r.ok && r.session.delivery).toMatchObject({
      driver: "Mateo",
      driverPhone: "3007778899",
      dispatchedAt: "2026-10-07T13:00:00Z",
    });
  });
});
