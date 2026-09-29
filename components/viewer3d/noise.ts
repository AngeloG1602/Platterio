/**
 * Ruido determinista (sin Math.random): el mismo plato se ve igual en cada carga. Lo usan las
 * texturas procedurales y las geometrías (relieve de la carne, bordes del pan…).
 */

export function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 144269504) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const smooth = (t: number) => t * t * (3 - 2 * t);

/** Ruido de valor 2D en [0, 1], periódico en x cada `period` celdas. */
export function noise(x: number, y: number, seed: number, period: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const x0 = ((xi % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const a = hash(x0, yi, seed);
  const b = hash(x1, yi, seed);
  const c = hash(x0, yi + 1, seed);
  const d = hash(x1, yi + 1, seed);
  const u = smooth(xf);
  const v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Ruido fractal (varias octavas). `u`, `v` en [0, 1]; `scale` = celdas en la primera octava. */
export function fbm(u: number, v: number, seed: number, scale = 8, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let s = scale;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(u * s, v * s, seed + o * 17, s);
    norm += amp;
    amp *= 0.5;
    s *= 2;
  }
  return sum / norm;
}
