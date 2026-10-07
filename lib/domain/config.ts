import { slugify } from "./dishForm";
import type { Dish, Table, TableSession, TimeSlot, Waiter } from "./types";

export type ConfigResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Agrega la siguiente mesa (número consecutivo). */
export function addTable(tables: readonly Table[]): Table[] {
  const next = Math.max(0, ...tables.map((t) => t.number)) + 1;
  return [...tables, { id: `mesa-${next}`, number: next }];
}

/** Quita una mesa si no tiene visita abierta; también la saca de los meseros. */
export function removeTable(
  state: {
    tables: readonly Table[];
    sessions: readonly TableSession[];
    waiters: readonly Waiter[];
  },
  tableId: string,
): ConfigResult<{ tables: Table[]; waiters: Waiter[] }> {
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return { ok: false, error: "Esa mesa no existe" };
  if (state.sessions.some((s) => s.tableId === tableId && !s.closedAt)) {
    return {
      ok: false,
      error: `La Mesa ${table.number} tiene clientes. Libérala antes de quitarla.`,
    };
  }
  return {
    ok: true,
    value: {
      tables: state.tables.filter((t) => t.id !== tableId),
      waiters: state.waiters.map((w) => ({
        ...w,
        tableIds: w.tableIds.filter((id) => id !== tableId),
      })),
    },
  };
}

/** Asigna una mesa a un mesero (una mesa tiene un solo mesero) o se la quita si ya era suya. */
export function toggleTableAssignment(
  waiters: readonly Waiter[],
  waiterId: string,
  tableId: string,
): Waiter[] {
  const owner = waiters.find((w) => w.id === waiterId);
  if (!owner) return [...waiters];
  const had = owner.tableIds.includes(tableId);
  return waiters.map((w) => {
    if (w.id === waiterId)
      return {
        ...w,
        tableIds: had ? w.tableIds.filter((id) => id !== tableId) : [...w.tableIds, tableId],
      };
    return had ? w : { ...w, tableIds: w.tableIds.filter((id) => id !== tableId) };
  });
}

export function validateThreshold(value: number): string | null {
  return Number.isInteger(value) && value >= 1 && value <= 5
    ? null
    : "El umbral va de 1 a 5 estrellas";
}

export function validateTimeout(value: number): string | null {
  return Number.isInteger(value) && value >= 1 && value <= 30
    ? null
    : "El tiempo límite va de 1 a 30 minutos";
}

/** Guarda franjas: asigna ids a las nuevas y limpia de los platos las franjas eliminadas. */
export function applyTimeSlots(
  slots: ReadonlyArray<Omit<TimeSlot, "id"> & { id?: string }>,
  dishes: readonly Dish[],
): { slots: TimeSlot[]; dishes: Dish[] } {
  const ids: string[] = [];
  const next = slots.map((s) => {
    const id = s.id ?? slugify(s.name, ids);
    ids.push(id);
    return { id, name: s.name.trim(), start: s.start, end: s.end };
  });
  return {
    slots: next,
    dishes: dishes.map((d) => ({
      ...d,
      timeSlotIds: d.timeSlotIds.filter((id) => ids.includes(id)),
    })),
  };
}
