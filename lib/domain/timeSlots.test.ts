import { describe, expect, it } from "vitest";
import { effectiveSlot, slotAt, slotMidpoint, slotsOverlap, validateTimeSlots } from "./timeSlots";
import type { TimeSlot } from "./types";

const slots: TimeSlot[] = [
  { id: "desayuno", name: "Desayuno", start: "07:00", end: "11:00" },
  { id: "almuerzo", name: "Almuerzo", start: "11:00", end: "15:00" },
  { id: "tarde", name: "Tarde", start: "15:00", end: "18:00" },
  { id: "noche", name: "Noche", start: "18:00", end: "23:00" },
];
const at = (h: number, m = 0) => new Date(2026, 8, 28, h, m);

describe("franjas horarias", () => {
  it("encuentra la franja activa con fin exclusivo", () => {
    expect(slotAt(slots, at(7))?.id).toBe("desayuno");
    expect(slotAt(slots, at(10, 59))?.id).toBe("desayuno");
    expect(slotAt(slots, at(11))?.id).toBe("almuerzo");
    expect(slotAt(slots, at(22, 59))?.id).toBe("noche");
    expect(slotAt(slots, at(23, 30))).toBeNull();
  });

  it("fuera de horario usa la próxima franja en abrir", () => {
    expect(effectiveSlot(slots, at(2))?.id).toBe("desayuno");
    expect(effectiveSlot(slots, at(23, 30))?.id).toBe("desayuno");
    expect(effectiveSlot(slots, at(12))?.id).toBe("almuerzo");
    expect(effectiveSlot([], at(12))).toBeNull();
  });

  it("franjas contiguas no se solapan; las que se cruzan sí", () => {
    expect(slotsOverlap(slots[0]!, slots[1]!)).toBe(false);
    expect(slotsOverlap(slots[0]!, { id: "x", name: "Brunch", start: "10:00", end: "12:00" })).toBe(
      true,
    );
  });

  it("soporta franjas que cruzan la medianoche", () => {
    const madrugada: TimeSlot = { id: "m", name: "Madrugada", start: "22:00", end: "02:00" };
    expect(slotsOverlap(madrugada, slots[3]!)).toBe(true);
    expect(slotsOverlap(madrugada, slots[0]!)).toBe(false);
    expect(slotAt([madrugada], at(1))?.id).toBe("m");
  });

  it("la lista del restaurante es válida", () => {
    expect(validateTimeSlots(slots)).toEqual([]);
  });

  it("reporta solapes, nombres vacíos y horas inválidas", () => {
    const errors = validateTimeSlots([
      ...slots,
      { id: "brunch", name: "Brunch", start: "10:00", end: "12:00" },
      { id: "sin-nombre", name: "  ", start: "23:00", end: "23:30" },
      { id: "mala", name: "Mala", start: "25:00", end: "26:00" },
      { id: "vacia", name: "Vacía", start: "05:00", end: "05:00" },
    ]);
    const kinds = errors.map((e) => `${e.kind}:${e.slotId}`);
    expect(kinds).toContain("solape:brunch");
    expect(kinds).toContain("nombre:sin-nombre");
    expect(kinds).toContain("formato:mala");
    expect(kinds).toContain("vacia:vacia");
    expect(errors.find((e) => e.kind === "solape")?.message).toBe("Las franjas se solapan");
  });

  it("calcula el punto medio de la franja", () => {
    expect(slotMidpoint(slots[1]!)).toBe(13 * 60);
    expect(slotMidpoint({ id: "m", name: "M", start: "22:00", end: "02:00" })).toBe(0);
  });
});
