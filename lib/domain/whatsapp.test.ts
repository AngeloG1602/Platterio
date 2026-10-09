import { describe, expect, it } from "vitest";
import {
  mapsLink,
  messageCustomerToDriver,
  messageToBusiness,
  messageToDriver,
  orderLines,
  telLink,
  waLink,
  waNumber,
} from "./whatsapp";
import type { DeliveryInfo, Dish, Order } from "./types";

const info: DeliveryInfo = {
  code: "D-4K7Q",
  type: "domicilio",
  customerName: "Camila Ríos",
  phone: "3001234567",
  address: "Calle 10 # 5-20",
  reference: "Casa azul, segundo piso",
  zoneId: "zona-centro",
  zoneName: "Centro",
  fee: 4000,
  payWith: "efectivo",
  cashFor: 50000,
  note: "Timbre dañado, llamar",
  etaMin: 30,
};

const dishes = [
  {
    id: "clasica-27",
    name: "Clásica 27",
    variants: [
      { id: "sencilla", name: "Sencilla", price: 20000 },
      { id: "doble", name: "Doble", price: 26000 },
    ],
  },
  { id: "limonada", name: "Limonada", variants: [{ id: "u", name: "Única", price: 6000 }] },
] as unknown as Dish[];

const order = {
  items: [
    {
      id: "1",
      dishId: "clasica-27",
      variantId: "doble",
      qty: 2,
      note: "bien cocida",
      custom: { kitchen: ["SIN Cebolla"] },
    },
    { id: "2", dishId: "limonada", variantId: "u", qty: 1 },
    { id: "3", dishId: "limonada", variantId: "u", qty: 5, removed: true },
  ],
} as unknown as Order;

describe("números de WhatsApp", () => {
  it("agrega el prefijo del país a un celular de 10 dígitos", () => {
    expect(waNumber("300 123 4567")).toBe("573001234567");
    expect(waNumber("3001234567")).toBe("573001234567");
  });
  it("acepta el número ya con prefijo, con + o sin él", () => {
    expect(waNumber("+57 300 123 4567")).toBe("573001234567");
    expect(waNumber("573001234567")).toBe("573001234567");
  });
  it("rechaza lo que no es un celular", () => {
    expect(waNumber("6012345678")).toBeNull();
    expect(waNumber("30012345")).toBeNull();
    expect(waNumber("")).toBeNull();
  });
  it("arma el enlace con el texto codificado", () => {
    const link = waLink("3001234567", "Hola & adiós\nlínea 2")!;
    expect(link.startsWith("https://wa.me/573001234567?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1]!)).toBe("Hola & adiós\nlínea 2");
    expect(waLink("123", "x")).toBeNull();
    expect(telLink("3001234567")).toBe("tel:+573001234567");
  });
  it("arma el enlace al mapa con dirección y zona", () => {
    expect(mapsLink(info)).toContain("query=Calle%2010%20%23%205-20%2C%20Centro");
    expect(mapsLink({})).toBeNull();
  });
});

describe("mensajes", () => {
  it("lista los platos con opción, personalización y nota, sin los quitados", () => {
    expect(orderLines(order, dishes)).toEqual([
      "2× Clásica 27 (Doble) · SIN Cebolla · Nota: bien cocida",
      "1× Limonada",
    ]);
  });

  it("el mensaje al negocio trae pedido, total, pago y dirección", () => {
    const text = messageToBusiness({
      restaurant: "Fogón 27",
      info,
      lines: orderLines(order, dishes),
      total: 62000,
    });
    expect(text).toContain("*Pedido D-4K7Q*");
    expect(text).toContain("• 2× Clásica 27 (Doble) · SIN Cebolla · Nota: bien cocida");
    expect(text).toContain("con envío de");
    expect(text).toContain("paga con");
    expect(text).toContain("Calle 10 # 5-20 (Centro)");
    expect(text).toContain("Referencia: Casa azul, segundo piso");
    expect(text).toContain("Nota: Timbre dañado, llamar");
    expect(text).toContain("300 123 4567");
  });

  it("para recoger no lleva dirección ni referencia", () => {
    const text = messageToBusiness({
      restaurant: "Fogón 27",
      info: { ...info, type: "recoger", fee: 0, address: undefined, reference: undefined },
      lines: [],
      total: 10000,
    });
    expect(text).toContain("para recoger");
    expect(text).not.toContain("Dirección");
    expect(text).not.toContain("envío");
  });

  it("el mensaje al domiciliario trae a dónde ir, a quién y cuánto cobrar", () => {
    const text = messageToDriver({
      restaurant: "Fogón 27",
      driver: "Andrés",
      info,
      lines: ["1× Limonada"],
      total: 62000,
      pending: 62000,
    });
    expect(text).toContain("Hola Andrés");
    expect(text).toContain("Camila Ríos · 300 123 4567");
    expect(text).toContain("Mapa: https://www.google.com/maps/search/");
    expect(text).toContain("Cobrar:");
    expect(text).toContain("cambio");
  });

  it("si ya está pago, el domiciliario no cobra nada", () => {
    const text = messageToDriver({
      restaurant: "Fogón 27",
      driver: "Andrés",
      info: { ...info, payWith: "transferencia", cashFor: undefined },
      lines: [],
      total: 62000,
      pending: 0,
    });
    expect(text).toContain("Cobrar: nada, ya está pago");
  });

  it("el cliente se presenta al domiciliario", () => {
    expect(messageCustomerToDriver({ restaurant: "Fogón 27", driver: "Andrés", info })).toBe(
      "Hola Andrés, soy Camila Ríos, del pedido D-4K7Q de Fogón 27.",
    );
  });
});
