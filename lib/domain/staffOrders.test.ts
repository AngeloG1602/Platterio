import { describe, expect, it } from "vitest";
import { DISHES } from "@/lib/data/catalog";
import { consolidateTicket } from "./ticket";
import {
  acknowledgeChanges,
  createStaffOrder,
  editOrder,
  unseenChanges,
  STAFF_DINER_ID,
} from "./staffOrders";
import type { Order, TableSession } from "./types";

const session: TableSession = {
  id: "s1",
  tableId: "mesa-3",
  openedAt: "2026-09-28T12:00:00.000Z",
  diners: [],
  cart: [],
};
const clasica = DISHES.find((d) => d.id === "clasica-27")!;
const [v1, v2] = clasica.variants;
let n = 0;
const newId = () => `id-${++n}`;

function make(lines = [{ dishId: clasica.id, variantId: v1!.id, qty: 2 }]): Order {
  const r = createStaffOrder({
    session,
    orders: [],
    dishes: DISHES,
    lines,
    staffName: "Carlos",
    now: "2026-09-28T12:05:00.000Z",
    orderId: "o1",
    newId,
  });
  if (!r.ok) throw new Error(r.error);
  return r.order;
}

function edit(
  order: Order,
  e: Parameters<typeof editOrder>[0]["edit"],
  reason = "Lo pidió el cliente",
) {
  return editOrder({
    order,
    edit: e,
    reason,
    dishes: DISHES,
    staffName: "Julián",
    now: "2026-09-28T12:10:00.000Z",
    changeId: newId(),
    itemId: newId(),
  });
}

describe("pedido tomado por el personal", () => {
  it("nace confirmado, va a cocina y se marca como del personal", () => {
    const o = make();
    expect(o).toMatchObject({ status: "confirmado", createdBy: "Carlos", round: 1 });
    expect(o.items[0]).toMatchObject({ dinerId: STAFF_DINER_ID, unitPrice: v1!.price });
  });

  it("rechaza mesa cerrada, pedido vacío y platos inválidos", () => {
    const base = { orders: [], dishes: DISHES, staffName: "C", now: "x", orderId: "o", newId };
    expect(
      createStaffOrder({ ...base, session: { ...session, closedAt: "x" }, lines: [] }).ok,
    ).toBe(false);
    expect(createStaffOrder({ ...base, session, lines: [] }).ok).toBe(false);
    const bad = { dishId: clasica.id, variantId: "no-existe", qty: 1 };
    expect(createStaffOrder({ ...base, session, lines: [bad] }).ok).toBe(false);
    expect(
      createStaffOrder({ ...base, session, lines: [{ ...bad, variantId: v1!.id, qty: 21 }] }).ok,
    ).toBe(false);
  });

  it("en el ticket aparece como Mesero", () => {
    const t = consolidateTicket({ sessionId: "s1", orders: [make()], dishes: DISHES, diners: [] });
    expect(t.rounds[0]!.groups[0]!.alias).toBe("Mesero");
  });
});

describe("editar una ronda ya confirmada", () => {
  it("cambia la cantidad, guarda el original y registra quién y por qué", () => {
    const o = make();
    const r = edit(o, { type: "cantidad", itemId: o.items[0]!.id, qty: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.items[0]).toMatchObject({ qty: 3, adjustedFrom: { qty: 2 } });
    expect(r.order.changes).toHaveLength(1);
    expect(r.order.changes![0]).toMatchObject({
      kind: "cantidad",
      by: "Julián",
      detail: "2 → 3",
      reason: "Lo pidió el cliente",
    });
  });

  it("cambiar de variante actualiza el precio", () => {
    const o = make();
    const r = edit(o, { type: "variante", itemId: o.items[0]!.id, variantId: v2!.id });
    expect(r.ok && r.order.items[0]!.unitPrice).toBe(v2!.price);
  });

  it("exige motivo salvo al agregar", () => {
    const o = make();
    expect(edit(o, { type: "quitar", itemId: o.items[0]!.id }, " ").ok).toBe(false);
    const add = edit(
      o,
      { type: "agregar", line: { dishId: clasica.id, variantId: v1!.id, qty: 1 } },
      "",
    );
    expect(add.ok && add.order.items).toHaveLength(2);
    expect(add.ok && add.order.items[1]!.addedByStaff).toBe(true);
  });

  it("no deja quitar el último plato: se anula la ronda", () => {
    const o = make();
    const r = edit(o, { type: "quitar", itemId: o.items[0]!.id });
    expect(r).toEqual({ ok: false, error: "Si quitas todo, anula la ronda" });
    const v = edit(o, { type: "anular" }, "Mesa equivocada");
    expect(v.ok && v.order).toMatchObject({ status: "rechazado", rejectReason: "Mesa equivocada" });
  });

  it("una ronda anulada ya no se edita", () => {
    const o = make();
    const v = edit(o, { type: "anular" });
    if (!v.ok) throw new Error();
    expect(
      edit(v.order, { type: "agregar", line: { dishId: clasica.id, variantId: v1!.id, qty: 1 } })
        .ok,
    ).toBe(false);
  });
});

describe("avisos a cocina", () => {
  it("los cambios sin ver se acumulan hasta que cocina los reconoce", () => {
    const o = make();
    const a = edit(o, { type: "cantidad", itemId: o.items[0]!.id, qty: 3 });
    if (!a.ok) throw new Error();
    expect(unseenChanges(a.order)).toHaveLength(1);
    const seen = acknowledgeChanges(a.order, "2026-09-28T12:11:00.000Z");
    expect(unseenChanges(seen)).toHaveLength(0);
    const b = edit(seen, {
      type: "agregar",
      line: { dishId: clasica.id, variantId: v1!.id, qty: 1 },
    });
    if (!b.ok) throw new Error();
    expect(
      unseenChanges({
        ...b.order,
        changes: b.order.changes!.map((c, i) => (i ? { ...c, at: "2026-09-28T12:12:00.000Z" } : c)),
      }),
    ).toHaveLength(1);
  });

  it("en pendiente o entregado no hay aviso a cocina", () => {
    const a = edit(make(), {
      type: "agregar",
      line: { dishId: clasica.id, variantId: v1!.id, qty: 1 },
    });
    if (!a.ok) throw new Error();
    expect(unseenChanges({ ...a.order, status: "entregado" })).toEqual([]);
  });
});
