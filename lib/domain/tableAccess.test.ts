import { describe, expect, it } from "vitest";
import { newPin } from "./pin";
import {
  cancelSession,
  closeSessions,
  hasOpenRounds,
  idleLimitMin,
  lastActivity,
  openSession,
  requestOpen,
  resolveCalls,
  sessionsToAutoClose,
  setIdleClose,
  validateIdleMinutes,
} from "./tableAccess";
import type { Order, TableCall, TableSession } from "./types";

let n = 0;
const newId = (p: string) => `${p}-${++n}`;
const T0 = Date.parse("2026-09-28T12:00:00.000Z");
const iso = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();

const session = (over: Partial<TableSession> = {}): TableSession => ({
  id: "s1",
  tableId: "mesa-3",
  openedAt: iso(0),
  lastActivityAt: iso(0),
  diners: [],
  cart: [],
  ...over,
});
const order = (over: Partial<Order> = {}): Order => ({
  id: "o1",
  sessionId: "s1",
  tableId: "mesa-3",
  round: 1,
  items: [],
  status: "entregado",
  createdAt: iso(1),
  ...over,
});

describe("abrir la mesa", () => {
  it("nace con PIN de 4 dígitos, sin comensales y a nombre de quien la abrió", () => {
    const r = openSession([], { tableId: "mesa-3", openedBy: "carlos", now: iso(0), newId });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.session).toMatchObject({
      tableId: "mesa-3",
      openedBy: "carlos",
      diners: [],
      cart: [],
    });
    expect(r.value.session.pin).toMatch(/^\d{4}$/);
  });

  it("no abre una mesa que ya está abierta, pero sí una cerrada", () => {
    const open = [session({ pin: "1234" })];
    expect(openSession(open, { tableId: "mesa-3", now: iso(5), newId })).toEqual({
      ok: false,
      error: "La mesa ya está abierta",
    });
    const closed = [session({ pin: "1234", closedAt: iso(4) })];
    expect(openSession(closed, { tableId: "mesa-3", now: iso(5), newId }).ok).toBe(true);
  });

  it("el PIN no se repite entre las mesas abiertas", () => {
    const sessions = [session({ tableId: "mesa-1", pin: "0000" })];
    // rand() = 0 daría "0000", que está en uso: debe elegir otro.
    const r = openSession(sessions, { tableId: "mesa-2", now: iso(0), newId, rand: () => 0 });
    expect(r.ok && r.value.session.pin).not.toBe("0000");
    expect(newPin(["0000", "0001"], () => 0)).toBe("0002");
  });

  it("los PIN de mesas cerradas se pueden volver a usar", () => {
    const sessions = [session({ tableId: "mesa-1", pin: "0000", closedAt: iso(1) })];
    const r = openSession(sessions, { tableId: "mesa-2", now: iso(2), newId, rand: () => 0 });
    expect(r.ok && r.value.session.pin).toBe("0000");
  });
});

describe("cierre automático", () => {
  const base = { defaultIdleMin: 30 };

  it("cierra la mesa sin actividad después del tiempo del negocio", () => {
    const sessions = [session()];
    expect(sessionsToAutoClose({ ...base, sessions, orders: [], now: T0 + 29 * 60_000 })).toEqual(
      [],
    );
    expect(sessionsToAutoClose({ ...base, sessions, orders: [], now: T0 + 30 * 60_000 })).toEqual([
      "s1",
    ]);
  });

  it("cuenta desde la última entrega, no desde que se abrió", () => {
    const sessions = [session()];
    const orders = [order({ deliveredAt: iso(50) })];
    expect(lastActivity(sessions[0]!, orders)).toBe(T0 + 50 * 60_000);
    expect(sessionsToAutoClose({ ...base, sessions, orders, now: T0 + 70 * 60_000 })).toEqual([]);
    expect(sessionsToAutoClose({ ...base, sessions, orders, now: T0 + 80 * 60_000 })).toEqual([
      "s1",
    ]);
  });

  it("nunca cierra una mesa con rondas sin entregar", () => {
    const sessions = [session()];
    for (const status of ["pendiente", "confirmado", "en_preparacion", "listo"] as const) {
      const orders = [order({ status })];
      expect(hasOpenRounds(sessions[0]!, orders)).toBe(true);
      expect(sessionsToAutoClose({ ...base, sessions, orders, now: T0 + 999 * 60_000 })).toEqual(
        [],
      );
    }
    expect(hasOpenRounds(sessions[0]!, [order({ status: "rechazado" })])).toBe(false);
  });

  it("el tiempo de la mesa manda sobre el del negocio", () => {
    const s = session({ idleCloseMin: 10 });
    expect(idleLimitMin(s, 30)).toBe(10);
    expect(
      sessionsToAutoClose({ ...base, sessions: [s], orders: [], now: T0 + 10 * 60_000 }),
    ).toEqual(["s1"]);
  });

  it("ignora las mesas cerradas y las de otra sesión", () => {
    const sessions = [session({ closedAt: iso(5) }), session({ id: "s2" })];
    const orders = [order({ sessionId: "s2", status: "listo" })];
    expect(sessionsToAutoClose({ ...base, sessions, orders, now: T0 + 999 * 60_000 })).toEqual([]);
  });

  it("al cerrar queda el motivo, sin carrito, y no toca las demás ni las ya cerradas", () => {
    const sessions = [
      session({ cart: [{ id: "c", dishId: "d", variantId: "v", qty: 1, dinerId: "x" }] }),
      session({ id: "s2" }),
      session({ id: "s3", closedAt: iso(3), closeReason: "mesero" }),
    ];
    const next = closeSessions(sessions, ["s1", "s3"], iso(40), "inactividad");
    expect(next[0]).toMatchObject({ closedAt: iso(40), cart: [], closeReason: "inactividad" });
    expect(next[1]).toBe(sessions[1]);
    expect(next[2]).toBe(sessions[2]);
  });

  it("valida el tiempo de cierre automático", () => {
    expect(validateIdleMinutes(30)).toBeNull();
    expect(validateIdleMinutes(4)).toMatch(/5 a 240/);
    expect(validateIdleMinutes(241)).not.toBeNull();
    expect(validateIdleMinutes(10.5)).not.toBeNull();
  });
});

describe("cambiar y cancelar", () => {
  it("el mesero fija un tiempo para su mesa y puede volver al del negocio", () => {
    const r = setIdleClose(session(), 60);
    expect(r.ok && r.value.idleCloseMin).toBe(60);
    if (!r.ok) return;
    const back = setIdleClose(r.value, null);
    expect(back.ok && "idleCloseMin" in back.value).toBe(false);
    expect(setIdleClose(session(), 2).ok).toBe(false);
    expect(setIdleClose(session({ closedAt: iso(1) }), 30).ok).toBe(false);
  });

  it("cancelar cierra la mesa y rechaza solo las rondas sin entregar", () => {
    const orders = [
      order({ id: "o1", status: "entregado" }),
      order({ id: "o2", status: "pendiente" }),
      order({ id: "o3", status: "en_preparacion" }),
      order({ id: "o4", sessionId: "otra", status: "pendiente" }),
    ];
    const r = cancelSession(session({ pin: "1234" }), orders, iso(9));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.rejected).toBe(2);
    expect(r.value.session).toMatchObject({ closedAt: iso(9), closeReason: "cancelada", cart: [] });
    expect(r.value.orders.map((o) => o.status)).toEqual([
      "entregado",
      "rechazado",
      "rechazado",
      "pendiente",
    ]);
    expect(r.value.orders[1]!.rejectReason).toBe("Mesa cancelada");
    expect(cancelSession(session({ closedAt: iso(1) }), [], iso(9)).ok).toBe(false);
  });
});

describe("avisos de abrir la mesa", () => {
  it("no se duplican mientras el anterior siga sin atender", () => {
    const a = requestOpen([], "mesa-5", iso(0), newId);
    expect(a).toHaveLength(1);
    expect(requestOpen(a, "mesa-5", iso(1), newId)).toHaveLength(1);
    expect(requestOpen(a, "mesa-6", iso(1), newId)).toHaveLength(2);
  });

  it("al abrir la mesa, sus avisos quedan atendidos y se puede avisar de nuevo después", () => {
    const calls: TableCall[] = requestOpen([], "mesa-5", iso(0), newId);
    const done = resolveCalls(calls, "mesa-5");
    expect(done.every((c) => c.resolved)).toBe(true);
    expect(requestOpen(done, "mesa-5", iso(30), newId)).toHaveLength(2);
  });
});
