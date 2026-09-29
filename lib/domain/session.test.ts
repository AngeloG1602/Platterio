import { describe, expect, it } from "vitest";
import { findOpenSession, joinTable, updateDinerRestrictions, validateAlias } from "./session";
import type { TableSession } from "./types";

let n = 0;
const newId = (p: string) => `${p}-${++n}`;
const NOW = "2026-09-28T12:00:00.000Z";

describe("sesión de mesa", () => {
  it("el primer escaneo abre la sesión y el segundo se une a la misma", () => {
    const a = joinTable([], {
      tableId: "mesa-3",
      deviceId: "dev-a",
      alias: "Ana",
      restrictions: ["lacteos"],
      now: NOW,
      newId,
    });
    expect(a.ok && a.created).toBe(true);
    if (!a.ok) return;
    const b = joinTable(a.sessions, {
      tableId: "mesa-3",
      deviceId: "dev-b",
      alias: " Luis ",
      restrictions: [],
      now: NOW,
      newId,
    });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.created).toBe(false);
    expect(b.sessionId).toBe(a.sessionId);
    expect(b.sessions).toHaveLength(1);
    expect(b.sessions[0]!.diners.map((d) => d.alias)).toEqual(["Ana", "Luis"]);
  });

  it("otra mesa tiene su propia sesión y una sesión cerrada no se reutiliza", () => {
    const closed: TableSession = {
      id: "vieja",
      tableId: "mesa-3",
      openedAt: NOW,
      closedAt: NOW,
      diners: [],
      cart: [],
    };
    const r = joinTable([closed], {
      tableId: "mesa-3",
      deviceId: "d",
      alias: "Ana",
      restrictions: [],
      now: NOW,
      newId,
    });
    expect(r.ok && r.created).toBe(true);
    expect(r.ok && r.sessionId).not.toBe("vieja");
    expect(findOpenSession(r.ok ? r.sessions : [], "mesa-4")).toBeUndefined();
  });

  it("el mismo dispositivo que vuelve a escanear conserva su comensal", () => {
    const a = joinTable([], {
      tableId: "mesa-1",
      deviceId: "d",
      alias: "Ana",
      restrictions: [],
      now: NOW,
      newId,
    });
    if (!a.ok) throw new Error();
    const again = joinTable(a.sessions, {
      tableId: "mesa-1",
      deviceId: "d",
      alias: "Anita",
      restrictions: ["mani"],
      now: NOW,
      newId,
    });
    expect(again.ok && again.dinerId).toBe(a.dinerId);
    expect(again.ok && again.sessions[0]!.diners).toEqual([
      expect.objectContaining({ alias: "Anita", restrictions: ["mani"] }),
    ]);
  });

  it("valida el alias", () => {
    const a = joinTable([], {
      tableId: "mesa-1",
      deviceId: "d1",
      alias: "Ana",
      restrictions: [],
      now: NOW,
      newId,
    });
    if (!a.ok) throw new Error();
    const session = a.sessions[0];
    expect(validateAlias("   ", session, "d2")).toMatch(/Escribe/);
    expect(validateAlias("x".repeat(17), session, "d2")).toMatch(/máximo/);
    expect(validateAlias("ANA", session, "d2")).toMatch(/Ya hay alguien/);
    expect(validateAlias("Ana", session, "d1")).toBeNull();
    expect(
      joinTable(a.sessions, {
        tableId: "mesa-1",
        deviceId: "d2",
        alias: "ána",
        restrictions: [],
        now: NOW,
        newId,
      }).ok,
    ).toBe(false);
  });

  it("actualiza restricciones solo del dispositivo y en sesiones abiertas", () => {
    const a = joinTable([], {
      tableId: "mesa-1",
      deviceId: "d1",
      alias: "Ana",
      restrictions: [],
      now: NOW,
      newId,
    });
    if (!a.ok) throw new Error();
    const next = updateDinerRestrictions(a.sessions, "d1", ["gluten"]);
    expect(next[0]!.diners[0]!.restrictions).toEqual(["gluten"]);
    expect(updateDinerRestrictions(a.sessions, "otro", ["gluten"])).toEqual(a.sessions);
  });
});
