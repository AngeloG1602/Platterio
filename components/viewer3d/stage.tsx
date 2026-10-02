"use client";

import { Environment } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { createContext, useContext, useEffect, useMemo, useRef, type ComponentProps } from "react";
import * as THREE from "three";
import { woodGrain } from "./textures";

/**
 * El "estudio" donde se ve el plato, compartido por el visor procedural y el de .glb:
 * luz de estudio real (HDRI), luz principal con sombra, mesa de madera que se funde con el
 * fondo, oclusión ambiental (sombras de contacto entre ingredientes) y el medidor de
 * rendimiento que baja la calidad sola si el equipo no da abasto.
 */

export type Quality = "alta" | "rapida";
export type QualitySetting = "auto" | Quality;

export const BACKGROUND = "#F3EEE6";

export interface PerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  /** Momento de la última medición (performance.now()); si es viejo, el lienzo está en reposo. */
  at: number;
}

/** Calidad con la que se dibuja, para que los materiales se simplifiquen en "rápida". */
export const QualityContext = createContext<Quality>("alta");

/**
 * Material de la comida: físico (brillo de grasa o salsa con `clearcoat`, pelusa suave del pan
 * con `sheen`). En calidad rápida apaga esas dos capas, que son lo más caro de sombrear.
 */
export function FoodMaterial({
  clearcoat,
  clearcoatRoughness,
  sheen,
  sheenRoughness,
  sheenColor,
  ...props
}: ComponentProps<"meshPhysicalMaterial">) {
  const fast = useContext(QualityContext) === "rapida";
  return fast ? (
    <meshPhysicalMaterial {...props} />
  ) : (
    <meshPhysicalMaterial
      {...props}
      clearcoat={clearcoat}
      clearcoatRoughness={clearcoatRoughness}
      sheen={sheen}
      sheenRoughness={sheenRoughness}
      sheenColor={sheenColor}
    />
  );
}

/** Opciones del <Canvas> según la calidad. */
export function canvasQuality(q: Quality) {
  return {
    dpr: (q === "alta" ? [1, 2] : [1, 1.25]) as [number, number],
    shadowMapSize: q === "alta" ? 2048 : 1024,
  };
}

export function Stage({ quality, tableRadius = 90 }: { quality: Quality; tableRadius?: number }) {
  const { shadowMapSize } = canvasQuality(quality);
  const wood = woodGrain();
  const table = useMemo(
    () => new THREE.CircleGeometry(tableRadius, 64).rotateX(-Math.PI / 2),
    [tableRadius],
  );
  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 42, 95]} />
      {/* Luz de estudio fotográfico (HDRI de Poly Haven, CC0): reflejos y relleno realistas. */}
      <Environment files="/hdri/apartment.exr" environmentIntensity={0.7} />
      <directionalLight
        key={shadowMapSize}
        position={[8, 16, 10]}
        intensity={1.5}
        color="#FFF1DE"
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={quality === "alta" ? 6 : 3}
      />
      <mesh geometry={table} position={[0, -0.01, 0]} receiveShadow name="mesa">
        <FoodMaterial
          map={wood.map}
          normalMap={wood.normalMap}
          normalScale={[0.35, 0.35] as [number, number]}
          roughness={0.62}
          clearcoat={0.25}
          clearcoatRoughness={0.5}
        />
      </mesh>
    </>
  );
}

/**
 * Posprocesado solo en calidad alta: oclusión ambiental (N8AO) para que los ingredientes se
 * asienten unos sobre otros, y el mapeo de tonos neutro (fiel a los colores de la comida).
 */
export function Effects({ quality }: { quality: Quality }) {
  if (quality !== "alta") return null;
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={1.6} distanceFalloff={0.8} intensity={2.4} quality="medium" halfRes />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};

/**
 * Mide el rendimiento con los cuadros que de verdad se dibujan (el lienzo va bajo demanda, así
 * que en reposo no cuenta). Usa la mediana: el primer cuadro tras un reposo trae un salto
 * largo que no es lentitud. Si la mediana cae de ~35 fps, avisa con `onSlow` una sola vez.
 * Cada medio segundo reporta fps, llamadas de dibujo y triángulos.
 */
export function PerfProbe({
  onSlow,
  onStats,
}: {
  onSlow?: () => void;
  onStats?: (s: PerfStats) => void;
}) {
  const get = useThree((s) => s.get);
  const samples = useRef<number[]>([]);
  const last = useRef({ report: 0, slowSent: false });

  useEffect(() => {
    // Sumamos lo de todos los pasos de un cuadro (sombras, posprocesado) y reiniciamos a mano.
    const { info } = get().gl;
    const prev = info.autoReset;
    info.autoReset = false;
    return () => {
      info.autoReset = prev;
    };
  }, [get]);

  useFrame(({ gl }, delta) => {
    const { calls, triangles } = gl.info.render;
    gl.info.reset();
    if (delta > 0 && delta < 1.5) {
      samples.current.push(delta);
      if (samples.current.length > 40) samples.current.shift();
    }
    const list = samples.current;
    const typical = median(list);
    if (!last.current.slowSent && list.length >= 40 && typical > 1 / 35) {
      last.current.slowSent = true;
      onSlow?.();
    }
    const now = performance.now();
    if (onStats && now - last.current.report > 500) {
      last.current.report = now;
      onStats({
        fps: typical ? Math.round(1 / median(list.slice(-15))) : 0,
        drawCalls: calls,
        triangles,
        at: now,
      });
    }
  }, -1);

  return null;
}
