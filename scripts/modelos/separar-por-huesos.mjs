/**
 * Prepara un modelo 3D con esqueleto (como los de Sketchfab) para el visor de Platterio.
 *
 * Muchos modelos "explosivos" traen toda la comida en UNA malla con un hueso por ingrediente,
 * que es lo que se anima al separarlos. El visor necesita lo contrario: un nodo por ingrediente
 * (`pan_base`, `carne_1`, `queso_1`…), para ocultarlos, separarlos y personalizarlos.
 *
 * Este script:
 *   1. "hornea" la pose de reposo (el plato armado) y parte la malla por hueso dominante;
 *   2. nombra cada parte según la tabla PARTES (hueso → ingrediente);
 *   3. quita esqueleto y animaciones, y pasa el material a metal/rugosidad (el formato que
 *      lee Three.js; el especular/brillo quedó obsoleto);
 *   4. comprime: texturas WebP de 2048 px como máximo y geometría con meshopt.
 *
 * Uso: node scripts/modelos/separar-por-huesos.mjs <entrada.glb> <salida.glb>
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, meshopt, metalRough, prune, textureCompress } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";

/** Hueso (sin el sufijo ".N" ni "_jnt") → nombre del ingrediente en el visor. */
const PARTES = [
  [/^Lower_Bread/i, "pan_base"],
  [/^Patty/i, "carne_1"],
  [/^cheese/i, "queso_1"],
  [/^lettuce/i, "lechuga_1"],
  [/^Tomato/i, "tomate_1"],
  [/^Pickle/i, "pepinillo_1"],
  [/^Onion/i, "cebolla_1"],
  [/^ketchup/i, "salsa_1"],
  [/^Mustard/i, "mostaza_1"],
  [/^Top_bread/i, "pan_tapa"],
];

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) {
  console.error("Uso: node scripts/modelos/separar-por-huesos.mjs <entrada.glb> <salida.glb>");
  process.exit(1);
}

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(entrada);
const root = doc.getRoot();

const parteDe = (hueso) => {
  const limpio = hueso.replace(/\.\d+$/, "");
  return PARTES.find(([re]) => re.test(limpio))?.[1] ?? null;
};

/* ——— Matrices 4×4 (column-major, como glTF) ——— */
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const apply = (m, [x, y, z], w = 1) => [
  m[0] * x + m[4] * y + m[8] * z + m[12] * w,
  m[1] * x + m[5] * y + m[9] * z + m[13] * w,
  m[2] * x + m[6] * y + m[10] * z + m[14] * w,
];
/** Inversa transpuesta del bloque 3×3, para transformar normales con escalas no uniformes. */
const normalMatrix = (m) => {
  const [a, b, c, d, e, f, g, h, i] = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  const A = e * i - f * h,
    B = -(d * i - f * g),
    C = d * h - e * g;
  const det = a * A + b * B + c * C || 1;
  // Columnas de la inversa transpuesta.
  return [
    A / det,
    B / det,
    C / det,
    0,
    -(b * i - c * h) / det,
    (a * i - c * g) / det,
    -(a * h - b * g) / det,
    0,
    (b * f - c * e) / det,
    -(a * f - c * d) / det,
    (a * e - b * d) / det,
    0,
    0,
    0,
    0,
    1,
  ];
};

const escena = root.listScenes()[0];
const plato = doc.createNode("plato");
let total = 0;

for (const nodo of root.listNodes()) {
  const skin = nodo.getSkin();
  const malla = nodo.getMesh();
  if (!skin || !malla) continue;
  const huesos = skin.listJoints();
  const ibm = skin.getInverseBindMatrices();
  const skinMats = huesos.map((j, k) => mul(j.getWorldMatrix(), ibm.getElement(k, [])));
  const partesHueso = huesos.map((j) => parteDe(j.getName()));

  for (const prim of malla.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const nor = prim.getAttribute("NORMAL");
    const uv = prim.getAttribute("TEXCOORD_0");
    const joints = prim.getAttribute("JOINTS_0");
    const weights = prim.getAttribute("WEIGHTS_0");
    const idx = prim.getIndices();
    const n = pos.getCount();

    // Posición y normal en la pose de reposo; parte = hueso con más peso.
    const P = new Float32Array(n * 3);
    const N = new Float32Array(n * 3);
    const parteVertice = new Array(n);
    const jv = [],
      wv = [],
      pv = [],
      nv = [];
    for (let v = 0; v < n; v++) {
      joints.getElement(v, jv);
      weights.getElement(v, wv);
      pos.getElement(v, pv);
      nor.getElement(v, nv);
      const m = new Array(16).fill(0);
      let mejor = 0;
      for (let k = 0; k < 4; k++) {
        if (wv[k] > wv[mejor]) mejor = k;
        if (!wv[k]) continue;
        const s = skinMats[jv[k]];
        for (let e = 0; e < 16; e++) m[e] += wv[k] * s[e];
      }
      P.set(apply(m, pv), v * 3);
      const nn = apply(normalMatrix(m), nv, 0);
      const len = Math.hypot(...nn) || 1;
      N.set(
        nn.map((x) => x / len),
        v * 3,
      );
      parteVertice[v] = partesHueso[jv[mejor]] ?? "otros";
    }

    // Triángulos por parte (manda el primer vértice; en estos modelos cada pieza es rígida).
    const tris = new Map();
    for (let t = 0; t < idx.getCount(); t += 3) {
      const a = idx.getScalar(t);
      const parte = parteVertice[a];
      if (!tris.has(parte)) tris.set(parte, []);
      tris.get(parte).push(a, idx.getScalar(t + 1), idx.getScalar(t + 2));
    }

    for (const [parte, lista] of tris) {
      const remap = new Map();
      const out = [];
      for (const v of lista) {
        if (!remap.has(v)) remap.set(v, remap.size);
        out.push(remap.get(v));
      }
      const m = remap.size;
      const p2 = new Float32Array(m * 3),
        n2 = new Float32Array(m * 3),
        u2 = new Float32Array(m * 2);
      const tmp = [];
      for (const [v, i] of remap) {
        p2.set(P.subarray(v * 3, v * 3 + 3), i * 3);
        n2.set(N.subarray(v * 3, v * 3 + 3), i * 3);
        u2.set(uv.getElement(v, tmp), i * 2);
      }
      const buf = root.listBuffers()[0];
      const nueva = doc
        .createPrimitive()
        .setMaterial(prim.getMaterial())
        .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(p2).setBuffer(buf))
        .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(n2).setBuffer(buf))
        .setAttribute(
          "TEXCOORD_0",
          doc.createAccessor().setType("VEC2").setArray(u2).setBuffer(buf),
        )
        .setIndices(
          doc
            .createAccessor()
            .setType("SCALAR")
            .setArray(m > 65535 ? new Uint32Array(out) : new Uint16Array(out))
            .setBuffer(buf),
        );
      plato.addChild(doc.createNode(parte).setMesh(doc.createMesh(parte).addPrimitive(nueva)));
      total += out.length / 3;
      console.log(`  ${parte.padEnd(12)} ${String(out.length / 3).padStart(6)} triángulos`);
    }
  }
}

// Fuera el modelo original, el esqueleto y las animaciones: queda solo el plato por partes.
for (const hijo of escena.listChildren()) escena.removeChild(hijo);
escena.addChild(plato);
root.listAnimations().forEach((a) => a.dispose());
root.listSkins().forEach((s) => s.dispose());

// Ordena las partes de abajo hacia arriba (así las lista el visor).
const alturaDe = (n) => {
  const a = n.getMesh().listPrimitives()[0].getAttribute("POSITION");
  return (a.getMin([])[1] + a.getMax([])[1]) / 2;
};
const partes = plato.listChildren().sort((a, b) => alturaDe(a) - alturaDe(b));
partes.forEach((p) => plato.removeChild(p));
partes.forEach((p) => plato.addChild(p));

await doc.transform(
  metalRough(),
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [2048, 2048], quality: 82 }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true);

await io.write(salida, doc);
console.log(`Listo: ${salida} · ${partes.length} partes · ${total} triángulos`);
