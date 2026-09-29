import { describe, expect, it } from "vitest";
import { contrast, isValidHex, parseHex, strongVariant } from "./color";

describe("color de acento", () => {
  it("interpreta hex de 3 y 6 dígitos", () => {
    expect(parseHex("#E4572E")).toEqual([228, 87, 46]);
    expect(parseHex("fff")).toEqual([255, 255, 255]);
    expect(isValidHex("#12345")).toBe(false);
  });

  it("la variante fuerte cumple AA con blanco", () => {
    for (const hex of ["#E4572E", "#F4B400", "#22C55E", "#0EA5E9"]) {
      const strong = parseHex(strongVariant(hex))!;
      expect(contrast(strong, [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("no toca un color que ya cumple", () => {
    expect(strongVariant("#1C1917")).toBe("#1C1917");
  });
});
