"use client";

import { Bounds, OrbitControls, useBounds, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { KTX2Loader } from "three-stdlib";
import {
  canvasQuality,
  Effects,
  PerfProbe,
  QualityContext,
  Stage,
  type PerfStats,
  type Quality,
} from "./stage";
import { hasWebGL, NoWebGL } from "./webgl";

const WEBGL = typeof window !== "undefined" && hasWebGL();

/**
 * Cargador de texturas KTX2 (Basis): texturas comprimidas que la GPU usa sin descomprimir, así
 * un modelo real pesa y ocupa mucho menos memoria. Uno solo para toda la página.
 */
let ktx2: KTX2Loader | null = null;
function ktx2Loader(gl: THREE.WebGLRenderer) {
  ktx2 ??= new KTX2Loader().setTranscoderPath("/basis/").detectSupport(gl);
  return ktx2;
}

export interface GlbPart {
  name: string;
  meshes: number;
  triangles: number;
}

/**
 * Visor de un .glb real: lo centra y escala, reconoce sus partes (nodos de primer nivel) y
 * permite ocultarlas y separarlas. Es la base para conectar los modelos definitivos.
 */
export default function GlbScene({
  url,
  explode,
  hidden,
  onParts,
  quality = "alta",
  onStats,
}: {
  url: string;
  explode: number;
  hidden: string[];
  onParts: (parts: GlbPart[]) => void;
  quality?: Quality;
  onStats?: (s: PerfStats) => void;
}) {
  if (!WEBGL) return <NoWebGL />;
  return (
    <Canvas
      frameloop="demand"
      shadows="percentage"
      dpr={canvasQuality(quality).dpr}
      camera={{ position: [10, 8, 12], fov: 32 }}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping }}
      role="img"
      aria-label="Vista previa del modelo 3D subido"
    >
      <QualityContext value={quality}>
        <Suspense fallback={null}>
          <Stage quality={quality} />
          <Bounds fit clip observe margin={1.3}>
            <Model url={url} explode={explode} hidden={hidden} onParts={onParts} />
          </Bounds>
          <Effects quality={quality} />
        </Suspense>
      </QualityContext>
      <OrbitControls makeDefault enableDamping />
      <PerfProbe onStats={onStats} />
    </Canvas>
  );
}

/** Nodos que forman el plato: baja por envoltorios de un solo hijo hasta encontrar varias partes. */
function partsOf(root: THREE.Object3D): THREE.Object3D[] {
  let node = root;
  while (node.children.length === 1 && node.children[0]!.children.length > 0)
    node = node.children[0]!;
  return node.children.length ? node.children : [node];
}

function Model({
  url,
  explode,
  hidden,
  onParts,
}: {
  url: string;
  explode: number;
  hidden: string[];
  onParts: (p: GlbPart[]) => void;
}) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  // Draco (geometría comprimida), meshopt (geometría y animaciones) y KTX2 (texturas).
  const gltf = useGLTF(url, "/draco/", true, (loader) => loader.setKTX2Loader(ktx2Loader(gl)));
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Centrar sobre el piso y escalar a ~10 unidades de ancho.
  const { parts, baseY, step, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const s = 10 / Math.max(size.x, size.z, size.y, 1e-3);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.set(-center.x, -box.min.y, -center.z);
    const list = partsOf(scene)
      .map((o) => ({ o, y: new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y }))
      .sort((a, b) => a.y - b.y)
      .map((x) => x.o);
    return {
      parts: list,
      baseY: new Map(list.map((o) => [o.uuid, o.position.y])),
      step: (size.y / Math.max(1, list.length)) * 1.6,
      scale: s,
    };
  }, [scene]);

  useEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    onParts(
      parts.map((p, i) => {
        let meshes = 0;
        let triangles = 0;
        p.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            meshes++;
            const g = mesh.geometry;
            triangles += (g.index ? g.index.count : g.attributes.position!.count) / 3;
          }
        });
        return { name: p.name || `parte_${i + 1}`, meshes, triangles: Math.round(triangles) };
      }),
    );
  }, [scene, parts, onParts]);

  useEffect(() => {
    parts.forEach((p, i) => {
      p.position.y = (baseY.get(p.uuid) ?? 0) + i * step * explode;
      p.visible = !hidden.includes(p.name || `parte_${i + 1}`);
    });
    invalidate();
  }, [parts, baseY, step, explode, hidden, invalidate]);

  // Al separar, el modelo crece: la cámara se aleja para que quepa entero.
  const bounds = useBounds();
  useEffect(() => {
    bounds.refresh().clip().fit();
  }, [bounds, explode]);

  return (
    <group scale={scale}>
      <primitive object={scene} />
    </group>
  );
}
