"use client";

import { useGLTF } from "@react-three/drei";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { realPartId, realRuleFor, type RealModel } from "@/lib/viewer3d/real-models";
import type { StackLayer } from "@/lib/viewer3d/stack";
import { RADIUS } from "./geometry";

/**
 * Piezas de un modelo real (.glb partido por ingrediente) listas para apilar: a la escala del
 * visor, centradas en el eje del plato y con su grosor medido. El visor las usa en lugar de la
 * versión procedural cuando el ingrediente tiene pieza real.
 */

export interface RealPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Grosor del "cuerpo" de la pieza (sin lo que cuelga por los bordes, como el queso). */
  thickness: number;
}

interface RealParts {
  model: RealModel;
  byId: Map<string, RealPart>;
}

const RealPartsContext = createContext<RealParts | null>(null);

/** Pieza real de una capa, o `undefined` si esa capa va procedural. */
export function useRealPart() {
  const ctx = useContext(RealPartsContext);
  return useMemo(
    () =>
      (layer: StackLayer): RealPart | undefined => {
        if (!ctx) return undefined;
        const rule = realRuleFor(ctx.model, layer);
        return rule ? ctx.byId.get(realPartId(rule)) : undefined;
      },
    [ctx],
  );
}

export function RealPartsProvider({ model, children }: { model?: RealModel; children: ReactNode }) {
  if (!model) return <RealPartsContext value={null}>{children}</RealPartsContext>;
  return <LoadedParts model={model}>{children}</LoadedParts>;
}

function LoadedParts({ model, children }: { model: RealModel; children: ReactNode }) {
  // Suspende hasta que el .glb carga (va dentro del Suspense de la escena).
  const gltf = useGLTF(model.url, "/draco/", true);
  const value = useMemo(() => ({ model, byId: prepareParts(gltf.scene, model) }), [gltf, model]);
  return <RealPartsContext value={value}>{children}</RealPartsContext>;
}

/* ——— Preparación ——— */

/**
 * Copia la geometría en Float32. Los modelos comprimidos traen posiciones cuantizadas (enteros
 * normalizados) y transformarlas en su formato original las recortaría.
 */
function toFloat(g: THREE.BufferGeometry) {
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const a = g.getAttribute(name);
    if (!a) continue;
    const arr = new Float32Array(a.count * a.itemSize);
    const get = [a.getX, a.getY, a.getZ, a.getW] as const;
    for (let i = 0; i < a.count; i++)
      for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = get[k]!.call(a, i);
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  if (g.index) out.setIndex(Array.from(g.index.array));
  return out;
}

function geometryOf(scene: THREE.Object3D, nodes: string[]) {
  const parts: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  for (const name of nodes) {
    scene.getObjectByName(name)?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      parts.push(toFloat(mesh.geometry).applyMatrix4(mesh.matrixWorld));
      materials.push(Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material);
    });
  }
  const material = materials[0];
  if (!parts.length || !material) return null;
  return { geometry: parts.length === 1 ? parts[0]! : mergeGeometries(parts)!, material };
}

function prepareParts(scene: THREE.Object3D, model: RealModel) {
  scene.updateMatrixWorld(true);
  const byId = new Map<string, RealPart>();

  // Escala y centro salen de la base del pan: queda del ancho del pan procedural.
  const base = geometryOf(scene, ["pan_base"]);
  if (!base) return byId;
  base.geometry.computeBoundingBox();
  const box = base.geometry.boundingBox!;
  const scale = (RADIUS * 2 + 0.2) / Math.max(1e-6, box.max.x - box.min.x);
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;

  for (const rule of model.rules) {
    const id = realPartId(rule);
    if (byId.has(id)) continue;
    const found = geometryOf(scene, rule.nodes);
    if (!found) continue;
    const g = found.geometry.translate(-cx, 0, -cz).scale(scale, scale, scale);

    // Grosor del cuerpo: alto de la pieza cerca del centro; lo que cuelga por el borde (el
    // queso) no cuenta para apilar. Si la pieza no pasa por el centro (rodajas, aros), se usa
    // la pieza entera.
    const pos = g.getAttribute("position");
    let lo = Infinity,
      hi = -Infinity,
      alo = Infinity,
      ahi = -Infinity,
      core = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      alo = Math.min(alo, y);
      ahi = Math.max(ahi, y);
      if (Math.hypot(pos.getX(i), pos.getZ(i)) < RADIUS * 0.5) {
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
        core++;
      }
    }
    if (core < 30) [lo, hi] = [alo, ahi];
    g.translate(0, -(lo + hi) / 2, 0);
    g.computeBoundingSphere();

    const material = found.material.clone();
    if (rule.tint && "color" in material) (material.color as THREE.Color).set(rule.tint);
    byId.set(id, { geometry: g, material, thickness: Math.max(0.06, hi - lo) });
  }
  return byId;
}
