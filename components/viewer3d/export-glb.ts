"use client";

import * as THREE from "three";

/**
 * Exporta el plato actual como .glb con un nodo por capa en el primer nivel
 * (plato_ceramica, pan_base, salsa_1, carne_1, queso_1… pan_tapa, acompanante_papas).
 * Sirve de plantilla para el modelador: el modelo real debe usar los mismos nombres.
 */
export async function exportDishGlb(scene: THREE.Scene, fileName: string): Promise<number> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  const source = scene.getObjectByName("plato");
  if (!source) throw new Error("No hay plato en la escena");
  source.updateWorldMatrix(true, true);

  const root = new THREE.Group();
  root.name = "plato";
  const picked: THREE.Object3D[] = [];
  source.traverse((o) => {
    const isPart =
      o.name === "plato_ceramica" ||
      o.name.startsWith("acompanante_") ||
      typeof o.userData.ingredientKey === "string";
    if (isPart && !picked.some((p) => isAncestor(p, o))) picked.push(o);
  });
  for (const o of picked) {
    const copy = o.clone(true);
    // Posición final en el mundo, sin la animación de entrada (escala 1).
    o.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
    copy.scale.set(1, 1, 1);
    copy.name = o.name;
    copy.userData = { ...o.userData };
    root.add(copy);
  }
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(root, { binary: true, onlyVisible: true });
  const blob = new Blob([result as ArrayBuffer], { type: "model/gltf-binary" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return blob.size;
}

function isAncestor(ancestor: THREE.Object3D, node: THREE.Object3D): boolean {
  for (let p = node.parent; p; p = p.parent) if (p === ancestor) return true;
  return false;
}
