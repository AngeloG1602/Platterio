/**
 * Utilidades de color para el acento configurable del restaurante.
 * El acento tal cual se usa en elementos decorativos; para texto y botones rellenos se deriva
 * una versión "fuerte" que cumple WCAG AA (4.5:1) con blanco.
 */

export type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: Rgb = [255, 255, 255];

/** Oscurece el color lo mínimo necesario para que el texto blanco cumpla el contraste pedido. */
export function strongVariant(hex: string, target = 4.5): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#1C1917";
  let current: Rgb = rgb;
  for (let i = 0; i < 40 && contrast(current, WHITE) < target; i++) {
    current = current.map((v) => v * 0.96) as Rgb;
  }
  return toHex(current);
}

export function isValidHex(hex: string): boolean {
  return parseHex(hex) !== null;
}
