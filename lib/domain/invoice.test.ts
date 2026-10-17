import { describe, expect, it } from "vitest";
import {
  buildInvoice,
  filterInvoices,
  invoiceCode,
  invoiceHtml,
  invoiceLines,
  invoicesCsvRows,
  nextInvoiceNumber,
} from "./invoice";
import type { CreditAccount, Dish, Invoice, Order, Payment, TableSession } from "./types";

const NOW = "2026-10-01T12:00:00.000Z";
const dishes = [
  {
    id: "gaseosa",
    name: "Gaseosa",
    variants: [
      { id: "400ml", name: "400 ml", price: 5500 },
      { id: "1-5l", name: "1,5 L", price: 9500 },
    ],
  },
  { id: "clasica", name: "Clásica 27", variants: [{ id: "u", name: "Única", price: 20000 }] },
] as Dish[];
const session = {
  id: "s1",
  tableId: "mesa-3",
  openedAt: NOW,
  diners: [],
  cart: [],
} as TableSession;
const order = (over: Partial<Order> = {}): Order => ({
  id: "o1",
  sessionId: "s1",
  tableId: "mesa-3",
  round: 1,
  status: "entregado",
  createdAt: NOW,
  items: [
    { id: "i1", dishId: "gaseosa", variantId: "400ml", qty: 2, dinerId: "a", unitPrice: 5500 },
    { id: "i2", dishId: "clasica", variantId: "u", qty: 1, dinerId: "a", unitPrice: 20000 },
    { id: "i3", dishId: "gaseosa", variantId: "400ml", qty: 1, dinerId: "b", unitPrice: 5500 },
    {
      id: "i4",
      dishId: "gaseosa",
      variantId: "1-5l",
      qty: 1,
      dinerId: "b",
      unitPrice: 9500,
      removed: true,
    },
  ],
  ...over,
});
const pay = (amount: number, over: Partial<Payment> = {}): Payment => ({
  id: `p${amount}`,
  sessionId: "s1",
  tableId: "mesa-3",
  amount,
  method: "efectivo",
  at: NOW,
  by: "Julián",
  ...over,
});
const base = {
  session,
  orders: [order()],
  dishes,
  accounts: [] as CreditAccount[],
  invoices: [] as Invoice[],
  place: "Mesa 3",
  businessName: "Casa Verde",
  now: NOW,
  by: "Julián",
};

describe("líneas", () => {
  it("junta los platos iguales y deja fuera lo quitado y lo rechazado", () => {
    const lines = invoiceLines([order(), order({ id: "o2", status: "rechazado" })], "s1", dishes);
    expect(lines).toEqual([
      { name: "Gaseosa · 400 ml", qty: 3, unitPrice: 5500, total: 16500 },
      { name: "Clásica 27", qty: 1, unitPrice: 20000, total: 20000 },
    ]);
  });
});

describe("armar el comprobante", () => {
  it("solo se factura una cuenta saldada", () => {
    expect(buildInvoice({ ...base, payments: [pay(30000)] })).toBeNull();
    expect(buildInvoice({ ...base, payments: [] })).toBeNull();
  });

  it("guarda lo cobrado con su consecutivo", () => {
    const inv = buildInvoice({
      ...base,
      invoices: [{ number: 6 } as Invoice],
      payments: [pay(20000), pay(16500, { method: "tarjeta" })],
    })!;
    expect(inv).toMatchObject({
      id: "fac-s1",
      number: 7,
      total: 36500,
      deliveryFee: 0,
      place: "Mesa 3",
    });
    expect(inv.payments).toEqual([
      { label: "Efectivo", amount: 20000 },
      { label: "Tarjeta", amount: 16500 },
    ]);
    expect(invoiceCode(inv.number)).toBe("F-0007");
  });

  it("muestra el crédito y la cortesía con la persona y la pone como cliente", () => {
    const account = { id: "a1", name: "María Pérez", document: "123" } as CreditAccount;
    const inv = buildInvoice({
      ...base,
      accounts: [account],
      payments: [
        pay(10000),
        pay(26500, { kind: "credito", accountId: "a1", authorizedBy: "Julián" }),
      ],
    })!;
    expect(inv.payments[1]).toEqual({ label: "A crédito · María Pérez", amount: 26500 });
    expect(inv.customer).toEqual({ name: "María Pérez", document: "123" });
  });

  it("en un domicilio suma el envío y toma al cliente del pedido", () => {
    const delivery = {
      ...session,
      delivery: { code: "D-1", type: "domicilio", customerName: "Luis", phone: "300", fee: 4000 },
    } as TableSession;
    const inv = buildInvoice({
      ...base,
      session: delivery,
      place: "Domicilio D-1",
      payments: [pay(40500)],
    })!;
    expect(inv.deliveryFee).toBe(4000);
    expect(inv.total).toBe(40500);
    expect(inv.customer).toEqual({ name: "Luis", phone: "300" });
  });
});

describe("consulta e impresión", () => {
  const a = { ...buildInvoice({ ...base, payments: [pay(36500)] })!, number: 1 };
  const b = {
    ...a,
    id: "fac-s2",
    number: 2,
    place: "Mesa 5",
    issuedAt: "2026-10-02T12:00:00.000Z",
  };

  it("numera, busca y ordena del más reciente al más antiguo", () => {
    expect(nextInvoiceNumber([a, b])).toBe(3);
    expect(nextInvoiceNumber([])).toBe(1);
    expect(filterInvoices([a, b], {}).map((i) => i.number)).toEqual([2, 1]);
    expect(filterInvoices([a, b], { text: "mesa 5" }).map((i) => i.number)).toEqual([2]);
    expect(filterInvoices([a, b], { text: "f-0001" }).map((i) => i.number)).toEqual([1]);
    expect(filterInvoices([a, b], { text: "clásica" })).toHaveLength(2);
  });

  it("exporta a CSV", () => {
    expect(invoicesCsvRows([a])[1]).toEqual(["F-0001", NOW, "Mesa 3", "", "", 36500, "Efectivo"]);
  });

  it("el HTML de impresión trae lo esencial y escapa el texto", () => {
    const html = invoiceHtml({ ...a, businessName: "Casa <Verde>" }, "1 oct 2026");
    expect(html).toContain("F-0001");
    expect(html).toContain("Casa &lt;Verde&gt;");
    expect(html).toContain("3 × Gaseosa · 400 ml");
    expect(html).toContain("no es una factura electrónica");
  });
});
