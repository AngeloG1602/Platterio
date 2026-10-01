"use client";

import * as THREE from "three";
import { fbm, hash, smooth } from "./noise";

/**
 * Texturas procedurales para dar realismo sin descargar imágenes. Se pintan una vez con ruido
 * determinista (repetible en horizontal para no dejar costuras en las piezas redondas) y se
 * guardan en caché. Cada una puede traer su mapa de relieve (normal map).
 */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const sstep = (a: number, b: number, x: number) => smooth(clamp01((x - a) / (b - a)));

/* ——— Lienzo ——— */

type RGB = [number, number, number];
type Painter = (u: number, v: number) => { color: RGB; height?: number };

interface Painted {
  map: THREE.CanvasTexture;
  normalMap?: THREE.CanvasTexture;
}

const cache = new Map<string, Painted>();

function canvasOf(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

/**
 * Sin `flipY`: la coordenada `v` de la geometría es la fila del lienzo contada desde arriba,
 * igual que en los pintores de abajo.
 */
function toTexture(canvas: HTMLCanvasElement, srgb: boolean, flipY = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.flipY = flipY;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Pinta color y, si el pintor da altura, calcula el normal map (Sobel). */
function paint(key: string, size: number, painter: Painter, normalStrength = 2): Painted {
  const hit = cache.get(key);
  if (hit) return hit;
  const colorCanvas = canvasOf(size);
  const ctx = colorCanvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const heights = new Float32Array(size * size);
  let hasHeight = false;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { color, height } = painter(x / size, y / size);
      const i = (y * size + x) * 4;
      img.data[i] = color[0];
      img.data[i + 1] = color[1];
      img.data[i + 2] = color[2];
      img.data[i + 3] = 255;
      if (height !== undefined) {
        heights[y * size + x] = height;
        hasHeight = true;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const result: Painted = { map: toTexture(colorCanvas, true) };
  if (hasHeight) {
    const nCanvas = canvasOf(size);
    const nctx = nCanvas.getContext("2d")!;
    const nimg = nctx.createImageData(size, size);
    const at = (x: number, y: number) => heights[((y + size) % size) * size + ((x + size) % size)]!;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * normalStrength;
        const dy = (at(x, y + 1) - at(x, y - 1)) * normalStrength;
        const len = Math.hypot(dx, dy, 1);
        const i = (y * size + x) * 4;
        nimg.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
        nimg.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
        nimg.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
        nimg.data[i + 3] = 255;
      }
    }
    nctx.putImageData(nimg, 0, 0);
    result.normalMap = toTexture(nCanvas, false);
  }
  cache.set(key, result);
  return result;
}

const shade = (base: number, k: number): RGB => {
  const v = Math.round(clamp01(base * k) * 255);
  return [v, v, v];
};
const tint = (rgb: RGB, k: number): RGB => [
  Math.round(clamp01((rgb[0] / 255) * k) * 255),
  Math.round(clamp01((rgb[1] / 255) * k) * 255),
  Math.round(clamp01((rgb[2] / 255) * k) * 255),
];
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];

/* ——— Texturas de ingredientes ——— */

/**
 * Costra del pan (en escala de grises: el color lo pone el material, así sirve para brioche,
 * pan de papa o sin gluten). Se proyecta desde arriba: más tostado en el centro (la cima) y
 * más claro hacia el borde, donde el pan crece en el horno.
 */
export function breadCrust() {
  return paint(
    "pan-costra",
    512,
    (u, v) => {
      const n = fbm(u, v, 3, 10, 4);
      const fine = fbm(u, v, 11, 64, 2);
      const r = Math.hypot(u - 0.5, v - 0.5) * 2;
      const toast = mix(0.78, 1.1, sstep(0.15, 0.95, r + (n - 0.5) * 0.25));
      const spots = sstep(0.62, 0.75, fbm(u, v, 21, 6, 3)) * 0.08;
      return {
        color: shade(1, toast * (0.9 + n * 0.14 + fine * 0.05) - spots),
        height: n * 0.6 + fine * 0.4,
      };
    },
    1.6,
  );
}

/** Miga del corte del pan: clara y porosa. */
export function breadCrumb() {
  return paint(
    "pan-miga",
    256,
    (u, v) => {
      const pores = fbm(u, v, 7, 40, 2);
      const hole = sstep(0.66, 0.74, pores);
      const base: RGB = [243, 222, 182];
      return {
        color: tint(base, 1 - hole * 0.1 + (fbm(u, v, 5, 8, 3) - 0.5) * 0.06),
        height: 1 - hole,
      };
    },
    3,
  );
}

/** Carne sellada: variación, zonas tostadas y vetas; relieve marcado. */
export function pattySear() {
  return paint(
    "carne-sellada",
    512,
    (u, v) => {
      const n = fbm(u, v, 13, 14, 5);
      const char = sstep(0.58, 0.72, fbm(u, v, 29, 9, 3));
      const fat = sstep(0.78, 0.82, fbm(u, v, 41, 36, 2)) * 0.25;
      const k = (0.82 + n * 0.3) * (1 - char * 0.45) + fat;
      return { color: shade(1, k), height: n * 0.8 + fbm(u, v, 3, 60, 2) * 0.3 };
    },
    4,
  );
}

/** Lechuga: nervadura central y nervios que salen del centro, bordes más claros. */
export function lettuceVeins() {
  return paint(
    "lechuga",
    384,
    (u, v) => {
      const x = u - 0.5;
      const y = v - 0.5;
      const r = Math.hypot(x, y) * 2;
      const a = Math.atan2(y, x);
      const warp = fbm(u, v, 9, 6, 3) * 0.6;
      const veins = Math.pow(Math.abs(Math.cos(a * 7 + warp * 4)), 30) * sstep(0.1, 0.6, r);
      const mottle = fbm(u, v, 15, 12, 3);
      const k = 0.78 + mottle * 0.18 + veins * 0.28 + sstep(0.75, 1, r) * 0.12;
      return { color: shade(1, k), height: veins * 0.8 + mottle * 0.2 };
    },
    3,
  );
}

/** Cara de la rodaja de tomate (coordenadas del disco de un cilindro). */
export function tomatoFace() {
  return paint(
    "tomate-cara",
    256,
    (u, v) => {
      const x = u - 0.5;
      const y = v - 0.5;
      const r = Math.hypot(x, y) * 2;
      const a = Math.atan2(y, x);
      const skin: RGB = [168, 26, 18];
      const flesh: RGB = [214, 52, 36];
      const gel: RGB = [238, 118, 70];
      const seed: RGB = [242, 206, 120];
      const n = fbm(u, v, 5, 10, 3);
      if (r > 0.95) return { color: skin, height: 0.4 };
      // Seis cámaras con gel y semillas entre la pared y el centro.
      const lobe = Math.cos(a * 6 + 0.4) * 0.5 + 0.5;
      const chamber = sstep(0.28, 0.34, r) * (1 - sstep(0.74, 0.8, r)) * sstep(0.35, 0.55, lobe);
      const seedDots = sstep(0.8, 0.86, fbm(u, v, 31, 48, 1)) * chamber;
      let c = lerpRGB(flesh, gel, chamber * 0.85);
      c = lerpRGB(c, seed, seedDots);
      c = tint(c, 0.92 + n * 0.14);
      return { color: c, height: (1 - chamber) * 0.6 + seedDots * 0.5 };
    },
    2.5,
  );
}

/** Tocineta: franjas de carne y grasa a lo largo. */
export function baconStripes() {
  return paint(
    "tocineta",
    256,
    (u, v) => {
      const band = Math.sin(v * Math.PI * 5 + fbm(u, v, 3, 6, 3) * 5) * 0.5 + 0.5;
      const fat = sstep(0.62, 0.75, band);
      const meat: RGB = [150, 44, 36];
      const fatC: RGB = [236, 196, 168];
      const crisp = fbm(u, v, 17, 20, 3);
      return {
        color: tint(lerpRGB(meat, fatC, fat), 0.8 + crisp * 0.3),
        height: fat * 0.6 + crisp * 0.4,
      };
    },
    3,
  );
}

/** Relieve genérico (queso, salsa, cebolla, aguacate): variación suave en gris. */
export function softDetail(seed: number, scale = 10) {
  return paint(
    `detalle-${seed}-${scale}`,
    256,
    (u, v) => {
      const n = fbm(u, v, seed, scale, 4);
      return { color: shade(1, 0.9 + n * 0.16), height: n };
    },
    1.2,
  );
}

/** Vaso de papel kraft con la franja y el nombre del restaurante. */
export function paperCup(accent: string, label: string) {
  const key = `vaso-${accent}-${label}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = paint(
    `kraft`,
    256,
    (u, v) => {
      const fiber = fbm(u, v * 4, 8, 20, 3);
      return { color: tint([196, 154, 104], 0.9 + fiber * 0.15), height: fiber };
    },
    1,
  );
  const canvas = canvasOf(512);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(base.map.image as HTMLCanvasElement, 0, 0, 512, 512);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 300, 512, 90);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const x of [128, 384]) ctx.fillText(label, x, 346);
  const result = { map: toTexture(canvas, true, true), normalMap: base.normalMap };
  cache.set(key, result);
  return result;
}

/** Madera de la mesa: vetas largas con variación, se repite en mosaico. */
export function woodGrain() {
  const t = paint(
    "madera",
    256,
    (u, v) => {
      const warp = fbm(u, v, 4, 3, 3) * 2.5;
      const rings = Math.sin((v * 9 + warp) * Math.PI) * 0.5 + 0.5;
      const fine = fbm(u * 0.3, v * 3, 12, 40, 2);
      const plank = Math.floor(v * 4);
      const plankTone = 0.9 + hash(plank, 1, 77) * 0.18;
      const light: RGB = [150, 104, 68];
      const dark: RGB = [96, 62, 38];
      const c = tint(lerpRGB(light, dark, rings * 0.55 + fine * 0.3), plankTone);
      const gap = sstep(0.985, 1, (v * 4) % 1);
      return { color: tint(c, 1 - gap * 0.6), height: rings * 0.4 + fine * 0.3 - gap };
    },
    2,
  );
  // Solo la usa la mesa, que la repite en mosaico.
  for (const tex of [t.map, t.normalMap]) {
    if (!tex) continue;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
  }
  return t;
}

/* ——— Platos a la carta ——— */

/**
 * Granos repartidos en celdas (arroz, fríjoles): devuelve 1 dentro de un grano. Cada celda tiene
 * un grano con posición, giro y largo al azar; `fill` es la probabilidad de que haya grano.
 */
function grains(u: number, v: number, cells: number, seed: number, long: number, fill = 1) {
  const cx = Math.floor(u * cells);
  const cy = Math.floor(v * cells);
  let best = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx;
      const gy = cy + dy;
      const wx = ((gx % cells) + cells) % cells;
      if (hash(wx, gy, seed + 3) > fill) continue;
      const px = (gx + hash(wx, gy, seed)) / cells;
      const py = (gy + hash(wx, gy, seed + 1)) / cells;
      const a = hash(wx, gy, seed + 2) * Math.PI;
      const ox = (u - px) * cells;
      const oy = (v - py) * cells;
      const along = ox * Math.cos(a) + oy * Math.sin(a);
      const across = -ox * Math.sin(a) + oy * Math.cos(a);
      const d = Math.hypot(along / long, across / 0.34);
      best = Math.max(best, 1 - sstep(0.75, 1, d));
    }
  }
  return best;
}

/**
 * Arroz con fríjoles y hogao (calentado) o solo arroz con hogao. Colores reales en la textura;
 * el relieve marca cada grano.
 */
export function riceMix(beans: boolean) {
  return paint(
    beans ? "calentado" : "arroz",
    512,
    (u, v) => {
      const rice = grains(u, v, 70, 5, 0.9);
      const riceC: RGB = beans ? [214, 186, 160] : [246, 240, 228];
      const gap: RGB = beans ? [120, 62, 44] : [226, 214, 196];
      let c = lerpRGB(gap, riceC, rice);
      let h = rice * 0.6;
      if (beans) {
        const bean = grains(u, v, 26, 17, 1.35, 0.55);
        c = lerpRGB(c, [92, 34, 26], bean);
        h = Math.max(h, bean);
      }
      // Hogao: puntos de tomate y cebolla larga.
      const hogao = sstep(0.7, 0.76, fbm(u, v, 29, 30, 2));
      c = lerpRGB(c, [206, 72, 38], hogao * 0.85);
      const scallion = sstep(0.8, 0.84, fbm(u, v, 41, 44, 2));
      c = lerpRGB(c, [110, 150, 60], scallion * 0.8);
      return { color: tint(c, 0.92 + fbm(u, v, 3, 6, 2) * 0.16), height: h };
    },
    2.5,
  );
}

/** Arepa de maíz asada: masa clara con marcas de la plancha y bordes tostados. */
export function arepaChar() {
  return paint(
    "arepa",
    512,
    (u, v) => {
      const x = u - 0.5;
      const y = v - 0.5;
      const r = Math.hypot(x, y) * 2;
      const masa = 0.88 + fbm(u, v, 7, 18, 3) * 0.16;
      const grill =
        Math.pow(Math.max(0, Math.sin((x + y * 0.3) * 38)), 10) *
        sstep(0.35, 0.7, fbm(u, v, 13, 5, 2));
      const char = sstep(0.62, 0.78, fbm(u, v, 19, 7, 3)) * 0.5;
      const edge = sstep(0.8, 1, r) * 0.25;
      const k = masa * (1 - grill * 0.3 - char * 0.3 - edge);
      return { color: shade(1, k), height: masa - grill * 0.6 + fbm(u, v, 3, 60, 2) * 0.3 };
    },
    2,
  );
}

/** Chorizo o salchicha: tripa con grasa, marcas de parrilla y brillo irregular. */
export function sausageSkin() {
  return paint(
    "chorizo",
    256,
    (u, v) => {
      const n = fbm(u, v, 23, 10, 4);
      const fat = sstep(0.8, 0.86, fbm(u, v, 31, 40, 2)) * 0.3;
      const grill = Math.pow(Math.max(0, Math.sin(v * Math.PI * 9)), 12) * 0.35;
      const k = 0.82 + n * 0.25 + fat - grill;
      return { color: shade(1, k), height: n + fat - grill };
    },
    3,
  );
}

/** Tajada de maduro: dorada en el centro, caramelizada y oscura en los bordes. */
export function maduroGlaze() {
  return paint(
    "maduro",
    256,
    (u, v) => {
      const r = Math.hypot((u - 0.5) * 1.3, (v - 0.5) * 3) * 2;
      const n = fbm(u, v, 11, 12, 3);
      const golden: RGB = [236, 170, 70];
      const caramel: RGB = [150, 70, 24];
      const c = lerpRGB(golden, caramel, clamp01(sstep(0.45, 1, r) + (n - 0.5) * 0.5));
      return { color: tint(c, 0.9 + n * 0.2), height: n };
    },
    1.5,
  );
}
