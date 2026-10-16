import { describe, expect, it } from "vitest";
import {
  appendAudit,
  AUDIT_ACTIONS,
  AUDIT_LIMIT,
  auditCsvRows,
  auditPeople,
  filterAudit,
  type AuditEntry,
} from "./audit";

const T0 = Date.parse("2026-10-10T15:00:00.000Z");
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();
const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  id: `a${Math.random()}`,
  at: at(0),
  by: "Carlos",
  role: "mesero",
  action: "pedido.confirmar",
  target: "Mesa 3 · Ronda 1",
  ...over,
});

describe("registro de acciones", () => {
  it("agrega al final y no toca las entradas anteriores", () => {
    const first = entry({ id: "1" });
    const log = [first];
    const next = appendAudit(log, entry({ id: "2" }));
    expect(next.map((e) => e.id)).toEqual(["1", "2"]);
    expect(next[0]).toBe(first);
    expect(log).toHaveLength(1);
  });

  it("descarta lo más viejo al pasar el límite", () => {
    let log: AuditEntry[] = [];
    for (let i = 0; i < AUDIT_LIMIT + 5; i++) log = appendAudit(log, entry({ id: `e${i}` }));
    expect(log).toHaveLength(AUDIT_LIMIT);
    expect(log[0]!.id).toBe("e5");
    expect(log.at(-1)!.id).toBe(`e${AUDIT_LIMIT + 4}`);
  });

  it("cada acción tiene su texto y su área", () => {
    for (const a of Object.values(AUDIT_ACTIONS)) {
      expect(a.label.length).toBeGreaterThan(3);
      expect(["Pedidos", "Cocina", "Mesas", "Caja", "Equipo"]).toContain(a.area);
    }
  });
});

describe("consulta del registro", () => {
  const log = [
    entry({
      id: "1",
      at: at(0),
      by: "Carlos",
      action: "pedido.confirmar",
      target: "Mesa 3 · Ronda 1",
    }),
    entry({
      id: "2",
      at: at(5),
      by: "Julián",
      action: "caja.cobrar",
      target: "Mesa 3",
      detail: "$51.300 en efectivo",
    }),
    entry({
      id: "3",
      at: at(9),
      by: "Sistema",
      role: undefined,
      action: "mesa.liberar_al_pagar",
      target: "Mesa 3",
    }),
    entry({
      id: "4",
      at: at(20),
      by: "Marta",
      action: "equipo.crear",
      target: "Pedro (mesero)",
      authorizedBy: "Marta",
    }),
  ];

  it("va de lo más reciente a lo más antiguo", () => {
    expect(filterAudit(log).map((e) => e.id)).toEqual(["4", "3", "2", "1"]);
  });

  it("filtra por área, persona y acción", () => {
    expect(filterAudit(log, { area: "Caja" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterAudit(log, { by: "Sistema" }).map((e) => e.id)).toEqual(["3"]);
    expect(filterAudit(log, { action: "equipo.crear" }).map((e) => e.id)).toEqual(["4"]);
  });

  it("busca sin distinguir tildes ni mayúsculas, también en el detalle y quien autorizó", () => {
    expect(filterAudit(log, { text: "MESA 3" })).toHaveLength(3);
    expect(filterAudit(log, { text: "efectivo" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterAudit(log, { text: "julian" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterAudit(log, { text: "pedro" }).map((e) => e.id)).toEqual(["4"]);
  });

  it("combina filtros y lista las personas", () => {
    expect(filterAudit(log, { area: "Mesas", text: "mesa 3" }).map((e) => e.id)).toEqual(["3"]);
    expect(auditPeople(log)).toEqual(["Carlos", "Julián", "Marta", "Sistema"]);
  });

  it("arma el CSV con encabezado y una fila por entrada", () => {
    const rows = auditCsvRows(filterAudit(log));
    expect(rows[0]).toContain("Autorizó");
    expect(rows).toHaveLength(5);
    expect(rows[1]![5]).toBe("Creó un usuario");
  });
});
