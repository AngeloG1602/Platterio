import { normalizeText } from "./menu";
import type { Allergen, TableSession } from "./types";
import { t } from "@/lib/i18n";

export const ALIAS_MAX = 16;

export function findOpenSession<T extends Pick<TableSession, "tableId" | "closedAt">>(
  sessions: readonly T[],
  tableId: string,
): T | undefined {
  return sessions.find((s) => s.tableId === tableId && !s.closedAt);
}

/** Valida el alias: obligatorio, corto y sin repetirse con otro comensal de la mesa. */
export function validateAlias(
  alias: string,
  session: TableSession | undefined,
  deviceId: string,
): string | null {
  const clean = alias.trim().replace(/\s+/g, " ");
  if (!clean) return t("Escribe cómo te llamamos en el pedido");
  if (clean.length > ALIAS_MAX) return t("Usa máximo {n} caracteres", { n: ALIAS_MAX });
  const taken = session?.diners.some(
    (d) => d.deviceId !== deviceId && normalizeText(d.alias) === normalizeText(clean),
  );
  if (taken)
    return t("Ya hay alguien llamado {name} en la mesa. Prueba con otro nombre o una inicial.", {
      name: clean,
    });
  return null;
}

export type JoinResult =
  | { ok: true; sessions: TableSession[]; sessionId: string; dinerId: string }
  | { ok: false; error: string };

/**
 * Entrar a una mesa que el mesero abrió: hace falta el PIN de la sesión. Si el dispositivo ya
 * estaba dentro, no lo pide de nuevo y solo actualiza su alias y restricciones. Una mesa
 * cerrada no deja entrar: hay que pedirle al mesero que la abra.
 */
export function joinTable(
  sessions: readonly TableSession[],
  params: {
    tableId: string;
    deviceId: string;
    alias: string;
    restrictions: Allergen[];
    /** PIN que dio el mesero (no hace falta si el dispositivo ya estaba en la mesa). */
    pin?: string;
    now: string;
    newId: (prefix: string) => string;
  },
): JoinResult {
  const open = findOpenSession(sessions, params.tableId);
  if (!open)
    return { ok: false, error: "Esta mesa aún no está abierta. Pídele al mesero que la abra." };
  const existing = open.diners.find((d) => d.deviceId === params.deviceId);
  if (!existing && open.pin) {
    const pin = (params.pin ?? "").trim();
    if (!pin) return { ok: false, error: "Escribe el PIN que te dio el mesero" };
    if (pin !== open.pin) return { ok: false, error: "Ese PIN no es el de la mesa" };
  }
  const error = validateAlias(params.alias, open, params.deviceId);
  if (error) return { ok: false, error };
  const alias = params.alias.trim().replace(/\s+/g, " ");

  const dinerId = existing?.id ?? params.newId("comensal");
  const diners = existing
    ? open.diners.map((d) =>
        d.id === existing.id ? { ...d, alias, restrictions: params.restrictions } : d,
      )
    : [
        ...open.diners,
        {
          id: dinerId,
          alias,
          deviceId: params.deviceId,
          restrictions: params.restrictions,
          joinedAt: params.now,
        },
      ];
  return {
    ok: true,
    sessions: sessions.map((s) =>
      s.id === open.id ? { ...s, diners, lastActivityAt: params.now } : s,
    ),
    sessionId: open.id,
    dinerId,
  };
}

/** Actualiza las restricciones del comensal de este dispositivo en las sesiones abiertas. */
export function updateDinerRestrictions(
  sessions: readonly TableSession[],
  deviceId: string,
  restrictions: Allergen[],
): TableSession[] {
  return sessions.map((s) =>
    s.closedAt || !s.diners.some((d) => d.deviceId === deviceId)
      ? s
      : {
          ...s,
          diners: s.diners.map((d) => (d.deviceId === deviceId ? { ...d, restrictions } : d)),
        },
  );
}
