import type { TimeSlot } from "./types";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "07:30" → 450 minutos desde medianoche. */
export function toMinutes(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Intervalo [inicio, fin) en minutos. Si fin <= inicio, la franja cruza la medianoche. */
function ranges(slot: TimeSlot): Array<[number, number]> {
  const start = toMinutes(slot.start);
  const end = toMinutes(slot.end);
  if (end > start) return [[start, end]];
  return [
    [start, 24 * 60],
    [0, end],
  ];
}

export function slotContains(slot: TimeSlot, minute: number): boolean {
  return ranges(slot).some(([a, b]) => minute >= a && minute < b);
}

export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  return ranges(a).some(([a1, a2]) => ranges(b).some(([b1, b2]) => a1 < b2 && b1 < a2));
}

export type SlotError =
  | { kind: "nombre"; slotId: string; message: string }
  | { kind: "formato"; slotId: string; message: string }
  | { kind: "vacia"; slotId: string; message: string }
  | { kind: "solape"; slotId: string; otherId: string; message: string };

/** Valida una lista de franjas: nombre, formato de hora, duración y que no se solapen (regla 10). */
export function validateTimeSlots(slots: TimeSlot[]): SlotError[] {
  const errors: SlotError[] = [];
  for (const slot of slots) {
    if (!slot.name.trim()) {
      errors.push({ kind: "nombre", slotId: slot.id, message: "Ponle un nombre a la franja" });
    }
    if (!HHMM.test(slot.start) || !HHMM.test(slot.end)) {
      errors.push({ kind: "formato", slotId: slot.id, message: "Usa horas válidas (HH:MM)" });
    } else if (slot.start === slot.end) {
      errors.push({
        kind: "vacia",
        slotId: slot.id,
        message: "El inicio y el fin no pueden ser iguales",
      });
    }
  }
  const valid = slots.filter((s) => HHMM.test(s.start) && HHMM.test(s.end) && s.start !== s.end);
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i]!;
      const b = valid[j]!;
      if (slotsOverlap(a, b)) {
        errors.push({
          kind: "solape",
          slotId: b.id,
          otherId: a.id,
          message: "Las franjas se solapan",
        });
      }
    }
  }
  return errors;
}

/** Franja activa a una hora dada, o null si el restaurante está fuera de franja. */
export function slotAt(slots: TimeSlot[], date: Date): TimeSlot | null {
  const minute = minutesOfDay(date);
  return slots.find((s) => slotContains(s, minute)) ?? null;
}

/**
 * Franja que se usa para recomendar: la activa, o si no hay ninguna, la próxima en abrir
 * (a las 2:00 a. m. se recomienda pensando en el desayuno). Ver DECISIONES.md.
 */
export function effectiveSlot(slots: TimeSlot[], date: Date): TimeSlot | null {
  const active = slotAt(slots, date);
  if (active || slots.length === 0) return active;
  const minute = minutesOfDay(date);
  const byDistance = [...slots].sort((a, b) => {
    const da = (toMinutes(a.start) - minute + 1440) % 1440;
    const db = (toMinutes(b.start) - minute + 1440) % 1440;
    return da - db;
  });
  return byDistance[0] ?? null;
}

/** Una hora representativa dentro de la franja (la mitad), útil para la hora simulada. */
export function slotMidpoint(slot: TimeSlot): number {
  const start = toMinutes(slot.start);
  let end = toMinutes(slot.end);
  if (end <= start) end += 1440;
  return Math.floor((start + (end - start) / 2) % 1440);
}
