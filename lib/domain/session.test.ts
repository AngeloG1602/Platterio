import { describe, expect, it } from "vitest";
import { findOpenSession, joinTable, updateDinerRestrictions, validateAlias } from "./session";
import { openSession } from "./tableAccess";
import type { TableSession } from "./types";

let n = 0;
const newId = (p: string) => `${p}-${++n}`;
const NOW = "2026-09-28T12:00:00.000Z";
const LATER = "2026-09-28T12:05:00.000Z";

/** Mesa abierta por el mesero, con un PIN conocido. */
function opened(tableId = "mesa-3", pin = "4821"): TableSession[] {
  const r = openSession([], { tableId, openedBy: "carlos", now: NOW, newId, rand: () => 0 });
  if (!r.ok) throw new Error(r.error);
  return r.value.sessions.map((s) => ({ ...s, pin }));
}

const join = (
  sessions: TableSession[],
  over: Partial<Parameters<typeof joinTable>[1]> = {},
): ReturnType<typeof joinTable> =>
  joinTable(sessions, {
    tableId: "mesa-3",
    deviceId: "dev-a",
    alias: "Ana",
    restrictions: [],
    pin: "4821",
    now: LATER,
    newId,
    ...over,
  });

describe("entrar a la mesa", () => {
  it("con el PIN de la mesa entra, y el segundo comensal se une a la misma sesión", () => {
    const a = join(opened(), { restrictions: ["lacteos"] });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const b = join(a.sessions, { deviceId: "dev-b", alias: " Luis " });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.sessionId).toBe(a.sessionId);
    expect(b.sessions).toHaveLength(1);
    expect(b.sessions[0]!.diners.map((d) => d.alias)).toEqual(["Ana", "Luis"]);
  });

  it("escanear una mesa cerrada o sin abrir no deja entrar", () => {
    expect(join([])).toEqual({
      ok: false,
      error: "Esta mesa aún no está abierta. Pídele al mesero que la abra.",
    });
    const closed = opened().map((s) => ({ ...s, closedAt: LATER }));
    expect(join(closed).ok).toBe(false);
    expect(findOpenSession(closed, "mesa-3")).toBeUndefined();
  });

  it("sin PIN o con otro PIN no entra", () => {
    expect(join(opened(), { pin: undefined })).toEqual({
      ok: false,
      error: "Escribe el PIN que te dio el mesero",
    });
    expect(join(opened(), { pin: "0000" })).toEqual({
      ok: false,
      error: "Ese PIN no es el de la mesa",
    });
  });

  it("el PIN de otra mesa no vale", () => {
    const sessions = [...opened("mesa-3", "4821"), ...opened("mesa-4", "9999")].filter(
      (_, i, all) => all.findIndex((s) => s.tableId === all[i]!.tableId) === i,
    );
    expect(join(sessions, { tableId: "mesa-3", pin: "9999" }).ok).toBe(false);
    expect(join(sessions, { tableId: "mesa-4", pin: "9999" }).ok).toBe(true);
  });

  it("entrar marca actividad en la mesa", () => {
    const a = join(opened());
    expect(a.ok && a.sessions[0]!.lastActivityAt).toBe(LATER);
  });

  it("el mismo dispositivo que vuelve a escanear no necesita el PIN y conserva su comensal", () => {
    const a = join(opened());
    if (!a.ok) throw new Error();
    const again = join(a.sessions, { alias: "Anita", restrictions: ["mani"], pin: undefined });
    expect(again.ok && again.dinerId).toBe(a.dinerId);
    expect(again.ok && again.sessions[0]!.diners).toEqual([
      expect.objectContaining({ alias: "Anita", restrictions: ["mani"] }),
    ]);
  });

  it("una sesión nueva con otro PIN pide el PIN otra vez aunque el dispositivo hubiera estado", () => {
    const a = join(opened());
    if (!a.ok) throw new Error();
    const closed = a.sessions.map((s) => ({ ...s, closedAt: LATER }));
    const next = openSession(closed, { tableId: "mesa-3", now: LATER, newId, rand: () => 0.5 });
    if (!next.ok) throw new Error();
    expect(join(next.value.sessions, { pin: undefined }).ok).toBe(false);
    expect(join(next.value.sessions, { pin: next.value.session.pin }).ok).toBe(true);
  });
});

describe("alias y restricciones", () => {
  it("valida el alias", () => {
    const a = join(opened(), { deviceId: "d1" });
    if (!a.ok) throw new Error();
    const session = a.sessions[0];
    expect(validateAlias("   ", session, "d2")).toMatch(/Escribe/);
    expect(validateAlias("x".repeat(17), session, "d2")).toMatch(/máximo/);
    expect(validateAlias("ANA", session, "d2")).toMatch(/Ya hay alguien/);
    expect(validateAlias("Ana", session, "d1")).toBeNull();
    expect(join(a.sessions, { deviceId: "d2", alias: "ána" }).ok).toBe(false);
  });

  it("actualiza restricciones solo del dispositivo y en sesiones abiertas", () => {
    const a = join(opened(), { deviceId: "d1" });
    if (!a.ok) throw new Error();
    const next = updateDinerRestrictions(a.sessions, "d1", ["gluten"]);
    expect(next[0]!.diners[0]!.restrictions).toEqual(["gluten"]);
    expect(updateDinerRestrictions(a.sessions, "otro", ["gluten"])).toEqual(a.sessions);
  });
});
