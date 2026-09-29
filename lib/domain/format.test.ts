import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatCOP,
  formatDay,
  formatElapsed,
  formatPriceDelta,
  formatSlotRange,
  formatTime,
  plural,
} from "./format";

describe("formatCOP", () => {
  it("usa punto como separador de miles y sin decimales", () => {
    expect(formatCOP(22900)).toBe("$22.900");
    expect(formatCOP(1250000)).toBe("$1.250.000");
    expect(formatCOP(900)).toBe("$900");
    expect(formatCOP(0)).toBe("$0");
  });
  it("redondea y maneja negativos", () => {
    expect(formatCOP(22899.6)).toBe("$22.900");
    expect(formatCOP(-7000)).toBe("-$7.000");
  });
  it("muestra diferencias con signo", () => {
    expect(formatPriceDelta(7000)).toBe("+$7.000");
    expect(formatPriceDelta(-3000)).toBe("-$3.000");
    expect(formatPriceDelta(0)).toBe("");
  });
});

describe("fechas y horas", () => {
  it("formatea en 12 h con a. m. / p. m.", () => {
    expect(formatTime(new Date(2026, 8, 28, 0, 5))).toBe("12:05 a. m.");
    expect(formatTime(new Date(2026, 8, 28, 9, 30))).toBe("9:30 a. m.");
    expect(formatTime(new Date(2026, 8, 28, 12, 0))).toBe("12:00 p. m.");
    expect(formatTime(new Date(2026, 8, 28, 18, 45))).toBe("6:45 p. m.");
    expect(formatClock("15:00")).toBe("3:00 p. m.");
  });
  it("formatea rangos de franja compactos", () => {
    expect(formatSlotRange("07:00", "11:00")).toBe("7 – 11 a. m.");
    expect(formatSlotRange("11:00", "15:00")).toBe("11 a. m. – 3 p. m.");
    expect(formatSlotRange("18:30", "23:00")).toBe("6:30 – 11 p. m.");
  });
  it("formatea el día como 'lunes 28 de sept.'", () => {
    expect(formatDay(new Date(2026, 8, 28))).toBe("lunes 28 de sept.");
  });
  it("formatea duraciones", () => {
    expect(formatElapsed(75_000)).toBe("1:15");
    expect(formatElapsed(3_700_000)).toBe("1 h 01 min");
    expect(formatElapsed(-10)).toBe("0:00");
  });
  it("pluraliza", () => {
    expect(plural(1, "plato", "platos")).toBe("1 plato");
    expect(plural(3, "plato", "platos")).toBe("3 platos");
  });
});
