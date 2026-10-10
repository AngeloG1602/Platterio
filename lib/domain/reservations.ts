import { normalizePhone } from "./delivery";
import { formatClock, formatDay, formatMoney } from "./format";
import type {
  Reservation,
  ReservationConfig,
  ReservationKind,
  ReservationQuote,
  ReservationStatus,
} from "./types";

export const DEFAULT_RESERVATIONS: ReservationConfig = {
  enabled: true,
  opensAt: "12:00",
  closesAt: "21:00",
  slotMin: 30,
  capacityPerSlot: 40,
  maxParty: 10,
  autoConfirm: false,
  advanceDays: 60,
  minHours: 2,
  events: {
    enabled: true,
    minPeople: 12,
    occasions: ["Cumpleaños", "Reunión de empresa", "Celebración familiar", "Grado", "Otro"],
  },
};

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  solicitada: "Por confirmar",
  confirmada: "Confirmada",
  rechazada: "No disponible",
  cancelada: "Cancelada",
  realizada: "Realizada",
};

/** Es una reserva que ocupa cupo (todavía no se resolvió en contra). */
const HOLDS = new Set<ReservationStatus>(["solicitada", "confirmada"]);

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Fecha y hora locales de una reserva, en milisegundos (NaN si el día no existe). */
export function reservationMs(date: string, time: string): number {
  const d = DAY.exec(date);
  const t = HHMM.exec(time);
  if (!d || !t) return NaN;
  const [y, m, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const ms = new Date(y, m - 1, day, Number(t[1]), Number(t[2])).getTime();
  const check = new Date(ms);
  // Descarta días imposibles como 2026-02-31, que JavaScript corre al mes siguiente.
  return check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === day
    ? ms
    : NaN;
}

/** Horas en que se puede reservar, de la apertura al cierre, cada `slotMin` minutos. */
export function slotTimes(config: ReservationConfig): string[] {
  if (!HHMM.test(config.opensAt) || !HHMM.test(config.closesAt) || config.slotMin < 5) return [];
  const out: string[] = [];
  for (let m = minutesOf(config.opensAt); m <= minutesOf(config.closesAt); m += config.slotMin)
    out.push(hhmm(m));
  return out;
}

/** Personas ya apartadas a esa hora (solicitadas o confirmadas). */
export function usedCapacity(
  reservations: readonly Reservation[],
  date: string,
  time: string,
  excludeId?: string,
): number {
  return reservations
    .filter((r) => r.id !== excludeId && r.date === date && r.time === time && HOLDS.has(r.status))
    .reduce((sum, r) => sum + r.people, 0);
}

export interface SlotAvailability {
  time: string;
  available: boolean;
  /** Personas que todavía caben a esa hora. */
  left: number;
}

/** Qué horas están libres un día para cierto número de personas. */
export function availableTimes(
  config: ReservationConfig,
  reservations: readonly Reservation[],
  date: string,
  people: number,
  nowMs: number,
): SlotAvailability[] {
  return slotTimes(config).map((time) => {
    const left = Math.max(0, config.capacityPerSlot - usedCapacity(reservations, date, time));
    const ms = reservationMs(date, time);
    const farEnough = ms >= nowMs + config.minHours * 3_600_000;
    return { time, left, available: farEnough && left >= people };
  });
}

export interface ReservationInput {
  kind: ReservationKind;
  name: string;
  phone: string;
  date: string;
  time: string;
  people: number;
  occasion?: string;
  details?: string;
  budget?: number;
  note?: string;
}

export type ReservationErrors = Partial<Record<keyof ReservationInput, string>>;

export function validateReservation(
  input: ReservationInput,
  config: ReservationConfig,
  reservations: readonly Reservation[],
  nowMs: number,
): ReservationErrors {
  const e: ReservationErrors = {};
  const name = input.name.trim();
  if (name.length < 2) e.name = "Escribe tu nombre";
  else if (name.length > 60) e.name = "El nombre es muy largo";
  if (!normalizePhone(input.phone)) e.phone = "Escribe un celular de 10 dígitos que empiece por 3";

  const ms = reservationMs(input.date, input.time);
  if (!DAY.test(input.date) || Number.isNaN(reservationMs(input.date, "00:00")))
    e.date = "Elige un día";
  else if (!slotTimes(config).includes(input.time)) e.time = "Elige una hora de la lista";
  else if (ms < nowMs + config.minHours * 3_600_000)
    e.time = `Reserva con al menos ${config.minHours} horas de anticipación`;
  else if (ms > nowMs + config.advanceDays * 86_400_000)
    e.date = `Se reserva hasta con ${config.advanceDays} días de anticipación`;

  if (!Number.isInteger(input.people) || input.people < 1) e.people = "Indica cuántas personas son";
  else if (input.kind === "mesa" && input.people > config.maxParty)
    e.people = `Para más de ${config.maxParty} personas pide un evento`;
  else if (input.kind === "evento" && input.people < config.events.minPeople)
    e.people = `Los eventos son desde ${config.events.minPeople} personas`;
  else if (input.people > 500) e.people = "Para más de 500 personas escríbenos directamente";

  if (input.kind === "evento") {
    if (!config.events.enabled) e.kind = "Por ahora no recibimos eventos por aquí";
    if (!input.occasion?.trim()) e.occasion = "Cuéntanos el motivo del evento";
    if ((input.details ?? "").length > 500) e.details = "Máximo 500 letras";
    if (input.budget !== undefined && (!Number.isInteger(input.budget) || input.budget < 0))
      e.budget = "Escribe el presupuesto solo con números";
  }
  if ((input.note ?? "").length > 300) e.note = "Máximo 300 letras";

  if (!e.date && !e.time && !e.people && input.kind === "mesa") {
    const left = config.capacityPerSlot - usedCapacity(reservations, input.date, input.time);
    if (left < input.people) e.time = "Esa hora ya no tiene cupo. Elige otra.";
  }
  return e;
}

/** Código corto a partir del id: R-7KQ2. */
export function reservationCode(id: string): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + id.charCodeAt(i % id.length);
  }
  return `R-${out}`;
}

/** Crea la reserva: las de mesa con cupo se confirman solas si el negocio lo activó. */
export function createReservation(p: {
  id: string;
  input: ReservationInput;
  config: ReservationConfig;
  reservations: readonly Reservation[];
  now: string;
}): Reservation {
  const { input, config } = p;
  const left = config.capacityPerSlot - usedCapacity(p.reservations, input.date, input.time);
  const auto = config.autoConfirm && input.kind === "mesa" && left >= input.people;
  const phone = normalizePhone(input.phone) ?? input.phone;
  return {
    id: p.id,
    code: reservationCode(p.id),
    kind: input.kind,
    name: input.name.trim(),
    phone,
    date: input.date,
    time: input.time,
    people: input.people,
    ...(input.kind === "evento"
      ? {
          occasion: input.occasion?.trim(),
          ...(input.details?.trim() ? { details: input.details.trim() } : {}),
          ...(input.budget ? { budget: input.budget } : {}),
        }
      : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    status: auto ? "confirmada" : "solicitada",
    createdAt: p.now,
    updatedAt: p.now,
  };
}

type Change = { ok: true; reservation: Reservation } | { ok: false; error: string };

const touch = (r: Reservation, patch: Partial<Reservation>, now: string): Reservation => ({
  ...r,
  ...patch,
  updatedAt: now,
});

export function confirmReservation(r: Reservation, now: string): Change {
  if (r.status !== "solicitada") return { ok: false, error: "Esa reserva ya se resolvió" };
  return { ok: true, reservation: touch(r, { status: "confirmada" }, now) };
}

export function rejectReservation(r: Reservation, reason: string, now: string): Change {
  if (r.status !== "solicitada") return { ok: false, error: "Esa reserva ya se resolvió" };
  const why = reason.trim();
  if (!why) return { ok: false, error: "Escribe el motivo: el cliente lo verá" };
  return { ok: true, reservation: touch(r, { status: "rechazada", reason: why }, now) };
}

export function cancelReservation(r: Reservation, reason: string, now: string): Change {
  if (r.status !== "solicitada" && r.status !== "confirmada")
    return { ok: false, error: "Esa reserva ya no se puede cancelar" };
  const why = reason.trim();
  return {
    ok: true,
    reservation: touch(r, { status: "cancelada", ...(why ? { reason: why } : {}) }, now),
  };
}

export function completeReservation(r: Reservation, now: string): Change {
  if (r.status !== "confirmada")
    return { ok: false, error: "Solo se marca realizada una confirmada" };
  return { ok: true, reservation: touch(r, { status: "realizada" }, now) };
}

export const quoteTotal = (q: Pick<ReservationQuote, "items">) =>
  q.items.reduce((sum, i) => sum + i.amount, 0);

/** Cotización de un evento: ítems con nombre, valores enteros y un anticipo que no pase del total. */
export function setQuote(r: Reservation, quote: ReservationQuote, now: string): Change {
  if (r.kind !== "evento") return { ok: false, error: "Solo los eventos llevan cotización" };
  if (r.status === "cancelada" || r.status === "rechazada")
    return { ok: false, error: "Esa reserva ya no está activa" };
  if (quote.items.length === 0) return { ok: false, error: "Agrega al menos un ítem" };
  for (const i of quote.items) {
    if (!i.label.trim() || i.label.trim().length > 60)
      return { ok: false, error: "Cada ítem necesita un nombre corto" };
    if (!Number.isInteger(i.amount) || i.amount < 0 || i.amount > 500_000_000)
      return { ok: false, error: `El valor de "${i.label.trim()}" no es válido` };
  }
  const total = quoteTotal(quote);
  if (!Number.isInteger(quote.deposit) || quote.deposit < 0 || quote.deposit > total)
    return { ok: false, error: "El anticipo no puede ser mayor que el total" };
  return {
    ok: true,
    reservation: touch(
      r,
      {
        quote: {
          items: quote.items.map((i) => ({ label: i.label.trim(), amount: i.amount })),
          deposit: quote.deposit,
          depositPaid: quote.depositPaid && quote.deposit > 0,
        },
      },
      now,
    ),
  };
}

export interface ReservationQueue {
  /** Por confirmar, la más próxima primero. */
  pending: Reservation[];
  /** Confirmadas que todavía no pasan, la más próxima primero. */
  upcoming: Reservation[];
  /** Confirmadas cuya hora ya pasó: falta marcarlas realizadas. */
  toClose: Reservation[];
  /** Resueltas (realizadas, canceladas, rechazadas), la más reciente primero. */
  past: Reservation[];
}

export function reservationQueue(
  reservations: readonly Reservation[],
  nowMs: number,
): ReservationQueue {
  const when = (r: Reservation) => reservationMs(r.date, r.time);
  const asc = (a: Reservation, b: Reservation) => when(a) - when(b);
  return {
    pending: reservations.filter((r) => r.status === "solicitada").sort(asc),
    upcoming: reservations.filter((r) => r.status === "confirmada" && when(r) >= nowMs).sort(asc),
    toClose: reservations.filter((r) => r.status === "confirmada" && when(r) < nowMs).sort(asc),
    past: reservations
      .filter((r) => r.status !== "solicitada" && r.status !== "confirmada")
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
  };
}

/** Cuándo es la reserva, en palabras: "viernes 17 de octubre · 7:30 p. m.". */
export function reservationWhen(r: Pick<Reservation, "date" | "time">): string {
  const ms = reservationMs(r.date, r.time);
  return Number.isNaN(ms)
    ? `${r.date} ${r.time}`
    : `${formatDay(new Date(ms))} · ${formatClock(r.time)}`;
}

export function validateReservationConfig(c: ReservationConfig): string | null {
  if (!HHMM.test(c.opensAt) || !HHMM.test(c.closesAt)) return "Escribe las horas como HH:MM";
  if (minutesOf(c.closesAt) < minutesOf(c.opensAt))
    return "La última hora no puede ser antes de la primera";
  if (![15, 30, 45, 60].includes(c.slotMin)) return "Las horas van cada 15, 30, 45 o 60 minutos";
  if (!Number.isInteger(c.capacityPerSlot) || c.capacityPerSlot < 1 || c.capacityPerSlot > 1000)
    return "El cupo por hora va de 1 a 1000 personas";
  if (!Number.isInteger(c.maxParty) || c.maxParty < 1 || c.maxParty > c.capacityPerSlot)
    return "El máximo por mesa no puede pasar del cupo por hora";
  if (!Number.isInteger(c.advanceDays) || c.advanceDays < 1 || c.advanceDays > 365)
    return "La anticipación máxima va de 1 a 365 días";
  if (!Number.isInteger(c.minHours) || c.minHours < 0 || c.minHours > 72)
    return "La anticipación mínima va de 0 a 72 horas";
  if (c.events.enabled) {
    if (!Number.isInteger(c.events.minPeople) || c.events.minPeople <= c.maxParty)
      return "Los eventos deben empezar en más personas que el máximo por mesa";
    const occ = c.events.occasions.map((o) => o.trim());
    if (occ.length === 0 || occ.some((o) => !o || o.length > 40))
      return "Cada motivo de evento necesita un nombre corto";
    if (new Set(occ.map((o) => o.toLowerCase())).size !== occ.length)
      return "Hay un motivo repetido";
  }
  return null;
}

/* ——— Mensajes de WhatsApp ——— */

const who = (r: Reservation) => (r.kind === "evento" ? "evento" : "reserva de mesa");

/** Lo que el cliente le escribe al negocio con su solicitud. */
export function messageReservationToBusiness(r: Reservation, restaurant: string): string {
  return [
    `Hola, hice una ${who(r)} en ${restaurant}.`,
    `*${r.code}* · ${reservationWhen(r)}`,
    `Personas: ${r.people}`,
    `A nombre de: ${r.name}`,
    ...(r.occasion ? [`Motivo: ${r.occasion}`] : []),
    ...(r.details ? [`Lo que buscamos: ${r.details}`] : []),
    ...(r.budget ? [`Presupuesto aproximado: ${formatMoney(r.budget)}`] : []),
    ...(r.note ? [`Nota: ${r.note}`] : []),
  ].join("\n");
}

/** Lo que el negocio le escribe al cliente según el estado de su reserva. */
export function messageReservationToCustomer(r: Reservation, restaurant: string): string {
  const base = `Hola ${r.name}, soy de ${restaurant}. Tu ${who(r)} *${r.code}* para el ${reservationWhen(r)} (${r.people} personas)`;
  switch (r.status) {
    case "confirmada":
      return `${base} está confirmada. ¡Te esperamos!${r.quote ? ` Total estimado del evento: ${formatMoney(quoteTotal(r.quote))}${r.quote.deposit ? `, anticipo de ${formatMoney(r.quote.deposit)}${r.quote.depositPaid ? " (recibido)" : ""}` : ""}.` : ""}`;
    case "rechazada":
      return `${base} no la pudimos confirmar: ${r.reason ?? "no tenemos disponibilidad"}. Escríbenos y buscamos otra opción.`;
    case "cancelada":
      return `${base} quedó cancelada${r.reason ? `: ${r.reason}` : ""}.`;
    case "realizada":
      return `${base}: ¡gracias por visitarnos!`;
    default:
      return `${base} está por confirmar. Te escribimos en cuanto la revisemos.${r.quote ? ` Cotización del evento: ${formatMoney(quoteTotal(r.quote))}.` : ""}`;
  }
}
