import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm } from "./noise";

/**
 * Geometrías procedurales de los ingredientes (sin archivos). Cada función devuelve una
 * geometría centrada en y = 0 con el grosor pedido, para apilar capas.
 *
 * Para que el visor vaya fluido, las piezas repetidas de una capa (aros de cebolla, tiras de
 * tocineta, rodajas…) se fusionan en una sola geometría: una capa = una llamada de dibujo.
 */

/** Pseudoaleatorio determinista: el mismo plato se ve igual en cada carga. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const RADIUS = 4.6;

/** Ángulo alrededor del eje vertical en [0, 1), para ruido que no deja costura. */
const turn = (x: number, z: number) => (Math.atan2(z, x) / (Math.PI * 2) + 1) % 1;

/**
 * Pieza de revolución. `shape` deforma cada vértice (radio y altura) con ruido; luego se
 * recalculan las normales y se sueldan la costura y los polos, que si no se ven como una raya.
 */
function lathe(
  points: Array<[number, number]>,
  segments = 64,
  shape?: (x: number, y: number, z: number, u: number) => [number, number, number],
) {
  const g = new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
  if (!shape) return g;
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const [nx, ny, nz] = shape(x, pos.getY(i), z, turn(x, z));
    pos.setXYZ(i, nx, ny, nz);
  }
  g.computeVertexNormals();
  const n = g.attributes.normal as THREE.BufferAttribute;
  const rows = points.length;
  const v = new THREE.Vector3();
  for (let j = 0; j < rows; j++) {
    // Costura: el primer y el último meridiano son copias del mismo borde.
    const a = j;
    const b = segments * rows + j;
    v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
    // Polos (radio 0): la normal apunta hacia arriba o hacia abajo.
    if (points[j]![0] === 0) {
      const up = j === 0 ? -1 : 1;
      for (let s = 0; s <= segments; s++) n.setXYZ(s * rows + j, 0, up, 0);
    }
  }
  return g;
}

/**
 * Proyección desde arriba (u = x, v = z). En piezas de revolución evita que la textura se
 * arremoline hacia el centro, como pasa con las coordenadas de torno.
 */
function planarUV(g: THREE.BufferGeometry, radius: number) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / (radius * 2) + 0.5, pos.getZ(i) / (radius * 2) + 0.5);
  }
  return g;
}

/* ——— Pan ——— */

/** Irregularidad leve del contorno del pan (ningún pan es un círculo perfecto). */
const breadShape =
  (seed: number, amount: number) =>
  (x: number, y: number, z: number, u: number): [number, number, number] => {
    const k = 1 + (fbm(u, 0.5, seed, 4, 3) - 0.5) * amount;
    return [x * k, y, z * k];
  };

/** Base del pan: la costra por fuera; la cara de arriba (el corte) es la miga, aparte. */
export function breadBase(thickness: number, seed = 3) {
  const h = thickness;
  const R = RADIUS;
  const pts: Array<[number, number]> = [[0, 0]];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push([R - 0.35 + Math.sin(a) * 0.35, 0.35 - Math.cos(a) * 0.35]);
  }
  pts.push([R, h - 0.2]);
  for (let i = 0; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    pts.push([R - 0.2 + Math.cos(a) * 0.2, h - 0.2 + Math.sin(a) * 0.2]);
  }
  return planarUV(lathe(pts, 72, breadShape(seed, 0.05)), R + 0.3).translate(0, -h / 2, 0);
}

/** Tapa del pan: domo con la costra más tostada arriba. La cara de abajo es la miga. */
export function breadTop(thickness: number, seed = 5) {
  const h = thickness;
  const R = RADIUS + 0.05;
  const pts: Array<[number, number]> = [[R - 0.25, 0]];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * (Math.PI / 2);
    pts.push([R * Math.cos(a) * (1 - 0.04 * Math.sin(a * 2)), h * Math.pow(Math.sin(a), 0.72)]);
  }
  pts[pts.length - 1] = [0, h];
  const g = lathe(pts, 72, (x, y, z, u) => {
    const [nx, , nz] = breadShape(seed, 0.05)(x, y, z, u);
    // La cima no es lisa: se levanta un poco en unas zonas más que en otras.
    const r = Math.hypot(x, z) / R;
    const bump = (fbm(u, r, seed + 9, 3, 2) - 0.5) * 0.18 * h * (1 - r * r);
    return [nx, y + bump, nz];
  });
  return planarUV(g, R + 0.3).translate(0, -h / 2, 0);
}

/** Cara cortada del pan (miga). `facing` 1 mira hacia arriba, -1 hacia abajo. */
export function crumbFace(radius: number, facing: 1 | -1) {
  const g = new THREE.CircleGeometry(radius, 72);
  g.rotateX(facing === 1 ? -Math.PI / 2 : Math.PI / 2);
  return g;
}

/** Ajonjolí de la tapa en una sola geometría: granos en forma de lágrima, acostados. */
export function sesameGeometry(thickness: number, count = 70, seed = 7) {
  const rand = seeded(seed);
  const h = thickness;
  const R = RADIUS * 0.8;
  const grain = new THREE.SphereGeometry(0.1, 8, 6);
  // Lágrima: un extremo más delgado que el otro.
  const gp = grain.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const k = 1 - Math.max(0, x / 0.1) * 0.45;
    gp.setXYZ(i, x, gp.getY(i) * k, gp.getZ(i) * k);
  }
  grain.scale(1, 0.32, 0.55);
  grain.computeVertexNormals();
  const parts: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const normal = new THREE.Vector3();
  const align = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const rr = Math.sqrt(rand()) * R;
    const th = rand() * Math.PI * 2;
    const a = Math.acos(Math.min(1, rr / (RADIUS + 0.05)));
    const y = h * Math.pow(Math.sin(a), 0.72) - h / 2;
    // Se acuesta según la pendiente del domo y gira al azar sobre sí mismo.
    const slope = Math.min(1.2, (rr / (RADIUS + 0.05)) * 1.3);
    normal.set(Math.cos(th) * slope, 1, Math.sin(th) * slope).normalize();
    align.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2).premultiply(align);
    m.compose(new THREE.Vector3(Math.cos(th) * rr, y + 0.02, Math.sin(th) * rr), q, one);
    parts.push(grain.clone().applyMatrix4(m));
  }
  return mergeGeometries(parts)!;
}

/* ——— Proteínas ——— */

/**
 * Carne de hamburguesa: disco de bordes abombados, contorno irregular y superficie con relieve
 * (tiene anillos interiores para que el relieve se vea también arriba, no solo en el borde).
 */
export function patty(radius: number, thickness: number, seed: number, rough = 1) {
  const h = thickness;
  const pts: Array<[number, number]> = [[0, -h / 2]];
  for (const f of [0.3, 0.55, 0.75, 0.88]) pts.push([radius * f, -h / 2]);
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI;
    // Borde redondeado y un poco más ancho en el centro, como la carne al asarse.
    pts.push([radius * 0.9 + Math.cos(a) * radius * 0.1, Math.sin(a) * (h / 2)]);
  }
  for (const f of [0.88, 0.75, 0.55, 0.3]) pts.push([radius * f, h / 2]);
  pts.push([0, h / 2]);
  const g = lathe(pts, 96, (x, y, z, u) => {
    const r = Math.hypot(x, z) / radius;
    const edge = fbm(u, 0.3, seed, 5, 4) - 0.5;
    const k = 1 + edge * 0.12 * rough;
    const surface = (fbm(x / 9 + 0.5, z / 9 + 0.5, seed + 3, 6, 3) - 0.5) * 0.22 * h * rough;
    // Las caras se abomban un poco hacia el centro.
    const dome = Math.sign(y) * (1 - r * r) * 0.08 * h;
    return [x * k, y + surface + dome, z * k];
  });
  return planarUV(g, radius * 1.1);
}

/** Disco irregular (salsa, clara del huevo): borde con ondulaciones suaves. */
export function bumpyDisc(
  radius: number,
  thickness: number,
  bumpiness: number,
  seed: number,
  segments = 72,
) {
  const g = new THREE.CylinderGeometry(radius, radius * 0.98, thickness, segments, 3, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const u = turn(x, z);
    const wobble = 1 + bumpiness * (fbm(u, 0.5, seed, 4, 3) - 0.5) * 2.2;
    const k = (r / radius) * wobble;
    const lift = Math.abs(y) > 1e-6 ? Math.sign(y) * (fbm(u, 0.2, seed + 1, 6, 2) - 0.5) : 0;
    pos.setXYZ(i, x * k, y + lift * bumpiness * thickness, z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Lámina de queso cuadrada que se derrite por las esquinas y los bordes. */
export function cheeseSlice(thickness: number, seed = 11) {
  const size = RADIUS * 2 * 0.86;
  const g = new THREE.BoxGeometry(size, thickness, size, 32, 1, 32);
  g.rotateY(Math.PI / 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    // Cae por fuera del pan, más en unas zonas que en otras (máximo ~0,7).
    const melt = 0.25 + fbm(turn(x, z), 0.5, seed, 5, 3) * 0.6;
    const over = Math.max(0, r - RADIUS * 0.88);
    const drop = Math.min(0.7, over * over * 0.45 * melt * 2);
    // El borde se estrecha al caer, como una gota.
    const pull = 1 - Math.min(0.08, drop * 0.1);
    pos.setXYZ(i, x * pull, pos.getY(i) - drop, z * pull);
  }
  g.computeVertexNormals();
  return g;
}

/* ——— Vegetales ——— */

/** Hoja ondulada y arrugada (lechuga y envoltura): varias hojas en una sola geometría. */
export function lettuceGeometry(
  radius: number,
  amplitude: number,
  waves: number,
  seed: number,
  sheets: number,
) {
  const parts = Array.from({ length: sheets }, (_, s) => {
    const R = radius - s * 0.35;
    const g = new THREE.RingGeometry(0, R, 120, 12);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const rand = seeded(seed + s * 13);
    const phase = rand() * Math.PI * 2;
    const w = waves + s;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z) / R;
      const th = Math.atan2(z, x);
      const edge = Math.pow(r, 2.2);
      const wave = Math.sin(w * th + phase) * 0.7 + Math.sin(w * 2.3 * th + phase * 1.7) * 0.3;
      // Arrugas finas encima de las ondas grandes.
      const crinkle = (fbm(turn(x, z), r, seed + s, 10, 2) - 0.5) * 0.35 * edge;
      const stretch = 1 + edge * 0.07 * Math.sin(w * th + phase * 0.5);
      pos.setXYZ(i, x * stretch, amplitude * (edge * wave + crinkle), z * stretch);
    }
    g.rotateY(s * 0.7);
    g.translate(0, s * 0.07 - 0.05, 0);
    return g;
  });
  const merged = mergeGeometries(parts)!;
  merged.computeVertexNormals();
  return merged;
}

/** Tres rodajas de tomate; el borde usa el color de la piel de la textura. */
export function tomatoSlices(thickness: number) {
  const parts = [0, 1, 2].map((i) => {
    const g = new THREE.CylinderGeometry(1.95, 1.95, thickness, 48, 1);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    // Los primeros vértices son el costado (2 filas × 49); toman un punto de piel de la textura.
    for (let v = 0; v < 2 * 49; v++) uv.setXY(v, 0.5, 0.004);
    const a = (i / 3) * Math.PI * 2 + 0.4;
    g.clearGroups();
    g.rotateY(i * 1.3);
    g.translate(Math.cos(a) * 2.25, (i % 2) * 0.02, Math.sin(a) * 2.25);
    return g;
  });
  return mergeGeometries(parts)!;
}

/** Aros (cebolla, jalapeño, cebolla crocante) repartidos en la capa, en una sola geometría. */
export function ringsGeometry(
  count: number,
  ringRadius: number,
  tube: number,
  arc: number,
  spread: number,
  seed: number,
  lumpy = 0,
) {
  const base = new THREE.TorusGeometry(ringRadius, tube, 10, 28, arc);
  if (lumpy > 0) {
    const pos = base.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const k = 1 + (fbm(turn(x, y), pos.getZ(i) + 0.5, seed, 8, 2) - 0.5) * lumpy;
      pos.setXYZ(i, x * k, y * k, pos.getZ(i) * k);
    }
    base.computeVertexNormals();
  }
  const m = new THREE.Matrix4();
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  return mergeGeometries(
    scatter(count, spread, seed).map((s) => {
      e.set(Math.PI / 2 + s.tilt, 0, s.rot);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3(s.s, s.s, s.s));
      return base.clone().applyMatrix4(m);
    }),
  )!;
}

/** Rodajas planas (pepinillos) en una sola geometría, con el borde ondulado. */
export function slicesGeometry(
  count: number,
  radius: number,
  thickness: number,
  spread: number,
  seed: number,
) {
  const base = new THREE.CylinderGeometry(radius, radius, thickness, 28, 1);
  const pos = base.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const k = 1 + Math.sin(Math.atan2(z, x) * 14) * 0.04;
    pos.setXYZ(i, x * k, pos.getY(i), z * k);
  }
  base.computeVertexNormals();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  return mergeGeometries(
    scatter(count, spread, seed).map((s) => {
      e.set(s.tilt, s.rot, s.tilt * 0.5);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3(s.s, 1, s.s));
      return base.clone().applyMatrix4(m);
    }),
  )!;
}

/** Tajadas de aguacate en abanico, en una sola geometría. */
export function avocadoGeometry(thickness: number) {
  const base = new THREE.CylinderGeometry(1.5, 1.5, thickness, 32, 1, false, 0, Math.PI);
  return mergeGeometries(
    [0, 1, 2, 3].map((i) =>
      base
        .clone()
        .rotateY(Math.PI / 2 + (i % 2) * Math.PI)
        .translate(-2.4 + i * 1.6, 0, (i % 2) * 0.8 - 0.4),
    ),
  )!;
}

/* ——— Otros ——— */

/** Tres tiras de tocineta onduladas y arrugadas, en una sola geometría. */
export function baconGeometry(thickness: number, seed = 5) {
  const length = RADIUS * 2 * 0.95;
  const width = 1.25;
  return mergeGeometries(
    [-1.1, 0.4, 1.8].map((z, i) => {
      const g = new THREE.BoxGeometry(length, thickness * 0.6, width, 70, 1, 6);
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        const zz = pos.getZ(v);
        const wave = Math.sin((x / length) * Math.PI * 2 * (3.5 + i * 0.3) + i) * 0.13;
        const curl = (fbm(x / length + 0.5, zz / width + 0.5, seed + i, 5, 2) - 0.5) * 0.16;
        pos.setXYZ(v, x, pos.getY(v) + wave + curl, zz * (1 + curl * 0.6));
      }
      g.computeVertexNormals();
      g.rotateY(0.15 * (i - 1));
      g.translate(0, (i % 2) * 0.05, z - 0.4);
      return g;
    }),
  )!;
}

/** Posiciones repartidas dentro del disco del plato (aros, jalapeños, trozos). */
export function scatter(count: number, maxRadius: number, seed: number) {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => {
    const r = Math.sqrt(rand()) * maxRadius;
    const th = rand() * Math.PI * 2;
    return {
      x: Math.cos(th) * r,
      z: Math.sin(th) * r,
      rot: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.35,
      s: 0.85 + rand() * 0.3,
    };
  });
}

/** Plato de cerámica. */
export function plateGeometry() {
  const pts: Array<[number, number]> = [
    [0, 0],
    [5.2, 0],
    [6.1, 0.12],
    [8.2, 0.55],
    [8.9, 0.75],
    [9.05, 0.68],
    [8.3, 0.46],
    [6.2, 0.26],
    [0, 0.2],
  ];
  return lathe(pts, 96);
}

/* ——— Acompañantes ——— */

/**
 * Papas a la francesa: bastones de bordes redondeados en una sola geometría, con color por
 * vértice (unas más doradas que otras y las puntas más tostadas).
 */
export function friesGeometry(count = 34, seed = 42) {
  const rand = seeded(seed);
  const gold = new THREE.Color("#F2C14E");
  const deep = new THREE.Color("#D8942C");
  const tip = new THREE.Color("#B8742A");
  const c = new THREE.Color();
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const h = 2.6 + rand() * 1.4;
    const g = new RoundedBoxGeometry(0.28, h, 0.28, 2, 0.06);
    const tone = rand();
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const endness = Math.abs(pos.getY(v)) / (h / 2);
      c.copy(gold).lerp(deep, tone * 0.7);
      c.lerp(tip, Math.max(0, endness - 0.8) * 3);
      colors.set([c.r, c.g, c.b], v * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const r = Math.sqrt(rand()) * 1.2;
    const th = rand() * Math.PI * 2;
    g.rotateX((rand() - 0.5) * 0.5);
    g.rotateZ((rand() - 0.5) * 0.5);
    g.translate(Math.cos(th) * r, h / 2 + 0.4, Math.sin(th) * r);
    parts.push(g);
  }
  return mergeGeometries(parts)!;
}

/** Aros de cebolla apanados (acompañante): superficie grumosa, una sola geometría. */
export function onionRingsSide(seed = 3) {
  const parts = [0, 1, 2, 3].map((i) => {
    const g = new THREE.TorusGeometry(1.05, 0.34, 18, 44);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      const y = pos.getY(v);
      const z = pos.getZ(v);
      const k = 1 + (fbm(turn(x, y), z + 0.5, seed + i, 12, 3) - 0.5) * 0.12;
      pos.setXYZ(v, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    g.rotateX(Math.PI / 2 - 0.25 + i * 0.12);
    g.rotateY(i * 0.8);
    g.translate((i % 2) * 0.35 - 0.2, 0.35 + i * 0.52, (i % 3) * 0.2);
    return g;
  });
  return mergeGeometries(parts)!;
}

/** Ensalada: hojas y tomates cherry en una sola geometría con color por vértice. */
export function saladGeometry(seed = 9) {
  const rand = seeded(seed);
  const greens = ["#7DB84A", "#5E9A35", "#9CC95B"].map((h) => new THREE.Color(h));
  const red = new THREE.Color("#D9412B");
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 30; i++) {
    const r = Math.sqrt(rand()) * 1.8;
    const th = rand() * Math.PI * 2;
    const cherry = rand() > 0.84;
    const s = 0.35 + rand() * 0.3;
    const g = cherry
      ? new THREE.SphereGeometry(0.38, 16, 12)
      : new THREE.SphereGeometry(1, 14, 8).scale(s * 1.4, s * 0.45, s);
    if (!cherry) {
      // Hoja arrugada, no un huevo.
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        const z = pos.getZ(v);
        pos.setY(v, pos.getY(v) + Math.sin(x * 9 + i) * Math.cos(z * 7) * 0.07);
      }
      g.computeVertexNormals();
      g.rotateZ((rand() - 0.5) * 0.8);
      g.rotateY(rand() * Math.PI);
    }
    const color = cherry ? red : greens[i % 3]!;
    const colors = new Float32Array(g.attributes.position!.count * 3);
    for (let v = 0; v < colors.length; v += 3) colors.set([color.r, color.g, color.b], v);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.translate(Math.cos(th) * r, 0.7 + rand() * 0.6, Math.sin(th) * r);
    parts.push(g);
  }
  return mergeGeometries(parts)!;
}

/** Tazón de la ensalada. */
export function bowlGeometry() {
  return lathe(
    [
      [0, 0],
      [1.2, 0],
      [2.1, 0.6],
      [2.4, 1.3],
      [2.3, 1.35],
      [2.0, 0.75],
      [1.1, 0.2],
      [0, 0.18],
    ],
    48,
  );
}

/* ——— Platos a la carta ——— */

/** Porción servida con cuchara (arroz, calentado): domo bajo y grumoso. */
export function moundGeometry(radius: number, height: number, seed: number) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 24; i++) {
    // Loma suave: sube rápido desde el borde y se aplana arriba, como servida con cuchara.
    const r = 1 - i / 24;
    pts.push([radius * r, height * Math.pow(1 - r * r, 0.85)]);
  }
  pts[pts.length - 1] = [0, height];
  const g = lathe(pts, 72, (x, y, z, u) => {
    const r = Math.hypot(x, z) / radius;
    const k = 1 + (fbm(u, 0.5, seed, 5, 3) - 0.5) * 0.28;
    const lump =
      (fbm(x / 8 + 0.5, z / 8 + 0.5, seed + 4, 8, 3) - 0.5) * 0.5 * height * (1 - r * r * 0.6);
    return [x * k, Math.max(0, y + lump), z * k];
  });
  return planarUV(g, radius * 1.2).translate(0, -height / 2, 0);
}

/** Arepa: disco grueso de bordes redondeados, un poco irregular. */
export function arepaGeometry(radius: number, thickness: number, seed = 13) {
  const h = thickness;
  const pts: Array<[number, number]> = [[0, 0]];
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI;
    pts.push([radius - h / 2 + Math.cos(a) * (h / 2), h / 2 + Math.sin(a) * (h / 2)]);
  }
  pts.push([0, h]);
  const g = lathe(pts, 72, (x, y, z, u) => {
    const k = 1 + (fbm(u, 0.5, seed, 4, 3) - 0.5) * 0.08;
    return [x * k, y, z * k];
  });
  return planarUV(g, radius * 1.05).translate(0, -h / 2, 0);
}

/** Chorizo acostado: cápsula algo curva, con el amarre marcado en las puntas. */
export function sausageGeometry(radius = 0.45, length = 2.6) {
  const g = new THREE.CapsuleGeometry(radius, length, 8, 20);
  g.rotateZ(Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const half = length / 2 + radius;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = x / half;
    // Curva suave y el estrangulamiento del amarre cerca de las puntas.
    const pinch = 1 - 0.18 * Math.exp(-Math.pow((Math.abs(t) - 0.8) * 9, 2));
    pos.setXYZ(i, x, pos.getY(i) * pinch, pos.getZ(i) * pinch + t * t * 0.35);
  }
  g.computeVertexNormals();
  return g;
}

/** Dos tajadas de maduro, largas, curvas y aplanadas, en una sola geometría. */
export function maduroGeometry() {
  return mergeGeometries(
    [0, 1].map((i) => {
      const g = new THREE.SphereGeometry(1, 28, 14).scale(1.7, 0.22, 0.55);
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        pos.setZ(v, pos.getZ(v) + x * x * 0.18);
      }
      g.computeVertexNormals();
      planarUV(g, 1.8);
      g.translate(i * 0.35, i * 0.12, i * 1.25);
      return g;
    }),
  )!;
}
