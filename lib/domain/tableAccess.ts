import { newPin } from "./pin";
import type { Order, TableCall, TableSession } from "./types";

/**
 * Cómo se abre, se usa y se cierra una mesa. El QR de la mesa es fijo y no da acceso por sí
 * solo: el mesero abre la sesión y le da al cliente un PIN de 4 dígitos que solo vale mientras
 * esa sesión esté abierta.
 */

export const IDLE_MIN_RANGE = [5, 240] as const;

export type AccessResult<T> = { ok: true; value: T } | { ok: false; error: string };

const isOpen = (s: TableSession) => !s.closedAt;

/** Una mesa abierta por el personal: nace con su PIN y sin comensales. */
export function openSession(
  sessions: readonly TableSession[],
  params: {
    tableId: string;
    openedBy?: string;
    now: string;
    newId: (prefix: string) => string;
    rand?: () => number;
  },
): AccessResult<{ sessions: TableSession[]; session: TableSession }> {
  if (sessions.some((s) => isOpen(s) && s.tableId === params.tableId))
    return { ok: false, error: "La mesa ya está abierta" };
  const pin = newPin(
    sessions.filter(isOpen).flatMap((s) => (s.pin ? [s.pin] : [])),
    params.rand,
  );
  const session: TableSession = {
    id: params.newId("sesion"),
    tableId: params.tableId,
    openedAt: params.now,
    lastActivityAt: params.now,
    openedBy: params.openedBy,
    pin,
    diners: [],
    cart: [],
  };
  return { ok: true, value: { sessions: [...sessions, session], session } };
}

/** Minutos de inactividad que valen para esta sesión. */
export const idleLimitMin = (session: TableSession, businessDefault: number) =>
  session.idleCloseMin ?? businessDefault;

export function validateIdleMinutes(minutes: number): string | null {
  const [min, max] = IDLE_MIN_RANGE;
  return Number.isInteger(minutes) && minutes >= min && minutes <= max
    ? null
    : `El cierre automático va de ${min} a ${max} minutos`;
}

const ROUND_DONE = new Set(["entregado", "rechazado"]);

/** ¿Hay rondas sin entregar ni rechazar? Mientras las haya, la mesa nunca se cierra sola. */
export function hasOpenRounds(session: TableSession, orders: readonly Order[]): boolean {
  return orders.some((o) => o.sessionId === session.id && !ROUND_DONE.has(o.status));
}

/** Última actividad de la mesa: lo último entre su propia marca y los movimientos de sus rondas. */
export function lastActivity(session: TableSession, orders: readonly Order[]): number {
  const stamps = [session.lastActivityAt ?? session.openedAt];
  for (const o of orders) {
    if (o.sessionId !== session.id) continue;
    stamps.push(o.createdAt, o.confirmedAt ?? "", o.preparingAt ?? "", o.readyAt ?? "");
    stamps.push(o.deliveredAt ?? "");
  }
  return Math.max(...stamps.map((t) => (t ? Date.parse(t) : 0)));
}

/**
 * Mesas que ya pueden cerrarse solas: sin rondas pendientes y con más de `limite` minutos sin
 * actividad desde la última entrega (o desde que se abrió, si nunca pidieron).
 */
export function sessionsToAutoClose(params: {
  sessions: readonly TableSession[];
  orders: readonly Order[];
  now: number;
  defaultIdleMin: number;
}): string[] {
  return params.sessions
    .filter(isOpen)
    .filter((s) => !hasOpenRounds(s, params.orders))
    .filter(
      (s) =>
        params.now - lastActivity(s, params.orders) >=
        idleLimitMin(s, params.defaultIdleMin) * 60_000,
    )
    .map((s) => s.id);
}

export function closeSessions(
  sessions: readonly TableSession[],
  ids: readonly string[],
  now: string,
  reason: NonNullable<TableSession["closeReason"]>,
): TableSession[] {
  return sessions.map((s) =>
    ids.includes(s.id) && isOpen(s) ? { ...s, closedAt: now, cart: [], closeReason: reason } : s,
  );
}

/**
 * Cancelar la mesa: la cierra aunque tenga rondas sin entregar, que quedan rechazadas con el
 * motivo. Es para casos especiales (se fueron, error de mesa); queda en el historial.
 */
export function cancelSession(
  session: TableSession,
  orders: readonly Order[],
  now: string,
): AccessResult<{ session: TableSession; orders: Order[]; rejected: number }> {
  if (session.closedAt) return { ok: false, error: "La mesa ya estaba cerrada" };
  let rejected = 0;
  const next = orders.map((o) => {
    if (o.sessionId !== session.id || ROUND_DONE.has(o.status)) return o;
    rejected++;
    return { ...o, status: "rechazado" as const, rejectReason: "Mesa cancelada" };
  });
  return {
    ok: true,
    value: {
      session: { ...session, closedAt: now, cart: [], closeReason: "cancelada" },
      orders: next,
      rejected,
    },
  };
}

export function setIdleClose(
  session: TableSession,
  minutes: number | null,
): AccessResult<TableSession> {
  if (session.closedAt) return { ok: false, error: "La mesa ya estaba cerrada" };
  if (minutes === null) {
    const { idleCloseMin: _drop, ...rest } = session;
    void _drop;
    return { ok: true, value: rest };
  }
  const error = validateIdleMinutes(minutes);
  return error ? { ok: false, error } : { ok: true, value: { ...session, idleCloseMin: minutes } };
}

/* ——— Avisos de "abre mi mesa" ——— */

export function requestOpen(
  calls: readonly TableCall[],
  tableId: string,
  now: string,
  newId: (prefix: string) => string,
): TableCall[] {
  if (calls.some((c) => c.tableId === tableId && !c.resolved)) return [...calls];
  return [
    ...calls,
    { id: newId("aviso"), tableId, kind: "abrir_mesa", createdAt: now, resolved: false },
  ];
}

export function resolveCalls(calls: readonly TableCall[], tableId: string): TableCall[] {
  return calls.map((c) => (c.tableId === tableId && !c.resolved ? { ...c, resolved: true } : c));
}
