import { normalizeText } from "./menu";
import type { Allergen, TableSession } from "./types";

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
  if (!clean) return "Escribe cómo te llamamos en el pedido";
  if (clean.length > ALIAS_MAX) return `Usa máximo ${ALIAS_MAX} caracteres`;
  const taken = session?.diners.some(
    (d) => d.deviceId !== deviceId && normalizeText(d.alias) === normalizeText(clean),
  );
  if (taken)
    return `Ya hay alguien llamado ${clean} en la mesa. Prueba con otro nombre o una inicial.`;
  return null;
}

export type JoinResult =
  | { ok: true; sessions: TableSession[]; sessionId: string; dinerId: string; created: boolean }
  | { ok: false; error: string };

/**
 * Entrar por QR (US-21, regla 3): abre la sesión de la mesa o se une a la abierta.
 * Si el dispositivo ya estaba en la sesión, solo actualiza su alias y restricciones.
 */
export function joinTable(
  sessions: readonly TableSession[],
  params: {
    tableId: string;
    deviceId: string;
    alias: string;
    restrictions: Allergen[];
    now: string;
    newId: (prefix: string) => string;
  },
): JoinResult {
  const open = findOpenSession(sessions, params.tableId);
  const error = validateAlias(params.alias, open, params.deviceId);
  if (error) return { ok: false, error };
  const alias = params.alias.trim().replace(/\s+/g, " ");

  if (!open) {
    const dinerId = params.newId("comensal");
    const session: TableSession = {
      id: params.newId("sesion"),
      tableId: params.tableId,
      openedAt: params.now,
      cart: [],
      diners: [
        {
          id: dinerId,
          alias,
          deviceId: params.deviceId,
          restrictions: params.restrictions,
          joinedAt: params.now,
        },
      ],
    };
    return {
      ok: true,
      sessions: [...sessions, session],
      sessionId: session.id,
      dinerId,
      created: true,
    };
  }

  const existing = open.diners.find((d) => d.deviceId === params.deviceId);
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
    sessions: sessions.map((s) => (s.id === open.id ? { ...s, diners } : s)),
    sessionId: open.id,
    dinerId,
    created: false,
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
