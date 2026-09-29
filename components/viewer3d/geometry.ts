import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Geometrías procedurales de los ingredientes (sin archivos). Cada función devuelve una
 * geometría centrada en y = 0 con el grosor pedido, para apilar capas.
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

function lathe(points: Array<[number, number]>, segments = 64) {
  const g = new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
  g.computeVertexNormals();
  return g;
}

/** Base del pan: disco con borde redondeado. */
export function breadBase(thickness: number) {
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
  pts.push([0, h]);
  return lathe(pts).translate(0, -h / 2, 0);
}

/** Tapa del pan: domo. */
export function breadTop(thickness: number) {
  const h = thickness;
  const R = RADIUS + 0.05;
  const pts: Array<[number, number]> = [
    [0, 0],
    [R - 0.2, 0],
  ];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * (Math.PI / 2);
    pts.push([R * Math.cos(a) * (1 - 0.04 * Math.sin(a * 2)), h * Math.pow(Math.sin(a), 0.75)]);
  }
  pts.push([0, h]);
  return lathe(pts).translate(0, -h / 2, 0);
}

/** Ajonjolí de la tapa en una sola geometría (una malla en vez de decenas). */
export function sesameGeometry(thickness: number, count = 60, seed = 7) {
  const rand = seeded(seed);
  const h = thickness;
  const R = RADIUS * 0.8;
  const parts: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const rr = Math.sqrt(rand()) * R;
    const th = rand() * Math.PI * 2;
    const a = Math.acos(Math.min(1, rr / (RADIUS + 0.05)));
    const y = h * Math.pow(Math.sin(a), 0.75) - h / 2;
    // El grano queda acostado sobre la superficie, orientado al azar.
    const e = new THREE.Euler((rand() - 0.5) * 0.3, rand() * Math.PI * 2, (rand() - 0.5) * 0.3);
    q.setFromEuler(e);
    m.compose(
      new THREE.Vector3(Math.cos(th) * rr, y + 0.015, Math.sin(th) * rr),
      q,
      up.set(1, 1, 1),
    );
    parts.push(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 0.35, 0.5).applyMatrix4(m));
  }
  return mergeGeometries(parts)!;
}

/** Disco irregular (carne, pollo, medallón, huevo, salsa): borde con ondulaciones suaves. */
export function bumpyDisc(
  radius: number,
  thickness: number,
  bumpiness: number,
  seed: number,
  segments = 72,
) {
  const g = new THREE.CylinderGeometry(radius, radius * 0.98, thickness, segments, 3, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rand = seeded(seed);
  const phases = [rand() * 6, rand() * 6, rand() * 6];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const th = Math.atan2(z, x);
    const wobble =
      1 +
      bumpiness *
        (0.5 * Math.sin(3 * th + phases[0]!) +
          0.3 * Math.sin(7 * th + phases[1]!) +
          0.2 * Math.sin(13 * th + phases[2]!));
    const k = (r / radius) * wobble;
    pos.setXYZ(
      i,
      x * k,
      y +
        (Math.abs(y) > 1e-6
          ? Math.sign(y) * bumpiness * 0.4 * Math.sin(5 * th + phases[1]!) * thickness
          : 0),
      z * k,
    );
  }
  g.computeVertexNormals();
  return g;
}

/** Lámina de queso cuadrada que cae por las esquinas. */
export function cheeseSlice(thickness: number) {
  const size = RADIUS * 2 * 0.86;
  const g = new THREE.BoxGeometry(size, thickness, size, 24, 1, 24);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    // Las esquinas caen un poco sobre el borde, como queso fundido (máximo ~0,6).
    const over = Math.max(0, r - RADIUS * 0.9);
    pos.setY(i, pos.getY(i) - Math.min(0.6, over * over * 0.35));
  }
  g.rotateY(Math.PI / 4);
  g.computeVertexNormals();
  return g;
}

/** Hoja ondulada (lechuga y envoltura): anillo con ondas que crecen hacia el borde. */
export function ruffledLeaf(radius: number, amplitude: number, waves: number, seed: number) {
  const g = new THREE.RingGeometry(0, radius, 96, 10);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rand = seeded(seed);
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z) / radius;
    const th = Math.atan2(z, x);
    const edge = Math.pow(r, 2.2);
    const wave =
      Math.sin(waves * th + phase) * 0.7 + Math.sin(waves * 2.3 * th + phase * 1.7) * 0.3;
    const stretch = 1 + edge * 0.06 * Math.sin(waves * th + phase * 0.5);
    pos.setXYZ(i, x * stretch, amplitude * edge * wave, z * stretch);
  }
  g.computeVertexNormals();
  return g;
}

/** Tira ondulada (tocineta). */
export function wavyStrip(
  length: number,
  width: number,
  thickness: number,
  waves: number,
  amplitude: number,
) {
  const g = new THREE.BoxGeometry(length, thickness, width, 60, 1, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, pos.getY(i) + Math.sin((x / length) * Math.PI * 2 * waves) * amplitude);
  }
  g.computeVertexNormals();
  return g;
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
