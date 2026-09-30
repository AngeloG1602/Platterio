"use client";

import { Html, OrbitControls, Preload } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { layerPositions, stackHeight, type StackLayer } from "@/lib/viewer3d/stack";
import { plateGeometry } from "./geometry";
import type { RealModel } from "@/lib/viewer3d/real-models";
import { IngredientMesh } from "./ingredient-mesh";
import { RealPartsProvider, useRealPart } from "./real-parts";
import { SideDish } from "./sides";
import {
  canvasQuality,
  Effects,
  FoodMaterial,
  PerfProbe,
  QualityContext,
  Stage,
  type PerfStats,
  type Quality,
  type QualitySetting,
} from "./stage";
import { hasWebGL, NoWebGL } from "./webgl";

// Este módulo solo se carga en el cliente (dynamic import sin SSR).
const WEBGL = typeof window !== "undefined" && hasWebGL();

export const SIDE_KEY = "__acompanante";

export interface DishSceneProps {
  stack: StackLayer[];
  sideId?: string;
  sideName?: string;
  explode: number;
  autoRotate: boolean;
  showLabels: boolean;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  /** Recibe la escena para exportarla como .glb. */
  onSceneReady?: (scene: THREE.Scene) => void;
  /** Cambia para volver a la cámara inicial. */
  resetSignal?: number;
  /** "auto" empieza en alta y baja sola si el equipo no alcanza ~35 fps. */
  quality?: QualitySetting;
  /** Calidad con la que se está dibujando (útil cuando está en automático). */
  onQualityChange?: (q: Quality) => void;
  onStats?: (s: PerfStats) => void;
  /** Nombre y color del restaurante, para el vaso de papel. */
  brand?: string;
  /** Modelo real del plato; los ingredientes que no tengan pieza real se dibujan procedurales. */
  realModel?: RealModel;
  accent?: string;
}

const GAP = 1.3;
const PLATE_Y = 0.2;
const START = new THREE.Vector3(11, 9, 13);

/** Identidad visual de una capa: si cambia (p. ej. carne → pollo), la vieja sale y entra la nueva. */
const uidOf = (l: StackLayer) => `${l.id}:${l.kind}:${l.color}`;

interface Ghost {
  uid: string;
  layer: StackLayer;
  y: number;
  index: number;
}

/**
 * Escena 3D del plato con React Three Fiber (Three.js en React). Se carga solo en el cliente
 * y bajo demanda (dynamic import), para no sumar Three.js al resto de la app.
 *
 * Dibuja bajo demanda (`frameloop="demand"`): solo pinta cuadros mientras algo se mueve (una
 * capa que cae, la cámara, el giro automático). Quieto, no gasta batería.
 */
export default function DishScene(props: DishSceneProps) {
  const reducedMotion = useReducedMotion();
  const [autoLevel, setAutoLevel] = useState<Quality>("alta");
  const setting = props.quality ?? "auto";
  const quality: Quality = setting === "auto" ? autoLevel : setting;
  const { onQualityChange } = props;
  useEffect(() => {
    onQualityChange?.(quality);
  }, [quality, onQualityChange]);

  if (!WEBGL) return <NoWebGL />;
  return (
    <Canvas
      frameloop="demand"
      shadows="percentage"
      dpr={canvasQuality(quality).dpr}
      camera={{ position: START.toArray(), fov: 32, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        toneMapping: THREE.NeutralToneMapping,
        powerPreference: "high-performance",
      }}
      onPointerMissed={() => props.onSelect(null)}
      aria-label="Modelo 3D del plato. Arrastra para girar y usa la rueda o dos dedos para acercar."
      role="img"
    >
      <QualityContext value={quality}>
        <Suspense fallback={null}>
          <Stage quality={quality} />
          <RealPartsProvider model={props.realModel}>
            <SceneContents {...props} reducedMotion={reducedMotion} />
          </RealPartsProvider>
          <Effects quality={quality} />
          <Preload all />
        </Suspense>
      </QualityContext>
      <PerfProbe
        onSlow={setting === "auto" ? () => setAutoLevel("rapida") : undefined}
        onStats={props.onStats}
      />
    </Canvas>
  );
}

function SceneContents({
  stack: logicalStack,
  sideId,
  sideName,
  explode,
  autoRotate,
  showLabels,
  selectedKey,
  onSelect,
  onSceneReady,
  resetSignal,
  reducedMotion,
  brand = "Fogón 27",
  accent = "#E4572E",
}: DishSceneProps & { reducedMotion: boolean }) {
  const [hovered, setHovered] = useState<string | null>(null);
  // Las capas con pieza real se apilan con el grosor medido de esa pieza.
  const realOf = useRealPart();
  const stack = useMemo(
    () =>
      logicalStack.map((l) => {
        const real = realOf(l);
        return real ? { ...l, thickness: real.thickness } : l;
      }),
    [logicalStack, realOf],
  );
  const positions = useMemo(() => layerPositions(stack, explode, GAP), [stack, explode]);
  const height = useMemo(() => stackHeight(stack, explode, GAP), [stack, explode]);
  const plate = useMemo(() => plateGeometry(), []);
  const scene = useThree((s) => s.scene);

  // Capas que se acaban de quitar: siguen en escena mientras hacen su animación de salida.
  const [prevStack, setPrevStack] = useState(stack);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  if (prevStack !== stack) {
    const live = new Set(stack.map(uidOf));
    const prevY = layerPositions(prevStack, explode, GAP);
    const gone = prevStack.flatMap((layer, index) =>
      live.has(uidOf(layer)) ? [] : [{ uid: uidOf(layer), layer, y: prevY[index]!, index }],
    );
    setGhosts((g) => [...g.filter((x) => !live.has(x.uid)), ...(reducedMotion ? [] : gone)]);
    setPrevStack(stack);
  }

  useEffect(() => {
    onSceneReady?.(scene);
  }, [scene, onSceneReady]);

  // Primera capa de cada ingrediente, para poner una sola etiqueta por ingrediente.
  const firstOfKey = useMemo(() => {
    const seen = new Set<string>();
    return stack.map((l) => (seen.has(l.key) ? false : (seen.add(l.key), true)));
  }, [stack]);
  const units = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of stack) m.set(l.key, (m.get(l.key) ?? 0) + (l.part === "tapa" ? 0 : 1));
    return m;
  }, [stack]);

  // La cámara mira al ingrediente seleccionado (o al centro del plato).
  const selectedIndex = stack.findIndex((l) => l.key === selectedKey);
  const focusY =
    selectedKey === SIDE_KEY
      ? 2.2
      : selectedIndex >= 0
        ? PLATE_Y + positions[selectedIndex]!
        : 1.5 + height / 2;

  return (
    <>
      <group name="plato">
        <mesh geometry={plate} receiveShadow castShadow name="plato_ceramica">
          <FoodMaterial color="#F7F2EA" roughness={0.18} clearcoat={1} clearcoatRoughness={0.06} />
        </mesh>
        <group name="hamburguesa" position={[-1.4, PLATE_Y, 0]}>
          {stack.map((layer, i) => (
            <IngredientMesh
              key={uidOf(layer)}
              layer={layer}
              y={positions[i]!}
              index={i}
              selected={selectedKey === layer.key}
              hovered={hovered === layer.key}
              onSelect={(k) => onSelect(k === selectedKey ? null : k)}
              onHover={setHovered}
              reducedMotion={reducedMotion}
              real={realOf(layer)}
            />
          ))}
          {ghosts.map((g) => (
            <IngredientMesh
              key={`salida-${g.uid}`}
              layer={g.layer}
              y={g.y}
              index={g.index}
              selected={false}
              hovered={false}
              onSelect={() => {}}
              onHover={() => {}}
              reducedMotion={reducedMotion}
              real={realOf(g.layer)}
              leaving
              onLeft={() => setGhosts((list) => list.filter((x) => x.uid !== g.uid))}
            />
          ))}
          {stack.map(
            (layer, i) =>
              (showLabels || selectedKey === layer.key) &&
              firstOfKey[i] && (
                <Html
                  key={layer.id}
                  position={[5.4, positions[i]!, 0]}
                  center={false}
                  zIndexRange={[20, 0]}
                  style={{ pointerEvents: "auto" }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(layer.key === selectedKey ? null : layer.key)}
                    className={`shadow-card -translate-y-1/2 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedKey === layer.key
                        ? "border-ink bg-ink text-bg"
                        : "border-line bg-surface/95 text-ink"
                    }`}
                  >
                    {layer.name}
                    {(units.get(layer.key) ?? 0) > 1 && ` ×${units.get(layer.key)}`}
                  </button>
                </Html>
              ),
          )}
        </group>
        {sideId && (
          <group position={[5.4, PLATE_Y + 0.05, 1.2]}>
            <SideDish
              id={sideId}
              brand={brand}
              accent={accent}
              highlighted={selectedKey === SIDE_KEY}
              onSelect={() => onSelect(selectedKey === SIDE_KEY ? null : SIDE_KEY)}
            />
            {showLabels && sideName && (
              <Html position={[0, 4.6, 0]} center zIndexRange={[20, 0]}>
                <span className="border-line bg-surface/95 shadow-card rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
                  {sideName}
                </span>
              </Html>
            )}
          </group>
        )}
      </group>

      <CameraRig height={height} focusY={focusY} resetSignal={resetSignal} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={10}
        maxDistance={70}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.08}
        autoRotate={autoRotate && !reducedMotion}
        autoRotateSpeed={0.9}
        enableDamping
      />
    </>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

interface Controls {
  target: THREE.Vector3;
  update: () => void;
}

/**
 * Encuadre automático. Aleja la cámara lo justo para que el plato quepa (según la forma de la
 * pantalla y la altura de la hamburguesa, que crece en el despiece) y sube o baja la mirada
 * hacia el ingrediente seleccionado. Solo actúa cuando cambian esas cosas; el resto del tiempo
 * manda el usuario.
 */
function CameraRig({
  height,
  focusY,
  resetSignal,
}: {
  height: number;
  focusY: number;
  resetSignal?: number;
}) {
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const get = useThree((s) => s.get);
  const goal = useRef<{ dist: number | null; y: number | null; snap: boolean }>({
    dist: null,
    y: null,
    snap: true,
  });
  const lastReset = useRef(resetSignal);

  useEffect(() => {
    goal.current.dist = (26 + height * 1.1) / Math.min(1, aspect * 0.95);
    get().invalidate();
  }, [height, aspect, resetSignal, get]);
  useEffect(() => {
    goal.current.y = focusY;
    get().invalidate();
  }, [focusY, resetSignal, get]);
  useEffect(() => {
    const { camera, controls, invalidate } = get();
    const c = controls as unknown as Controls | null;
    if (!c || resetSignal === lastReset.current) return;
    lastReset.current = resetSignal;
    // Vuelve al ángulo de partida a la misma distancia; luego el encuadre ajusta el resto.
    const dist = camera.position.distanceTo(c.target);
    camera.position.copy(c.target).addScaledVector(START.clone().normalize(), dist);
    c.update();
    invalidate();
  }, [resetSignal, get]);

  useFrame((state, delta) => {
    const controls = state.controls as unknown as Controls | null;
    if (!controls) return;
    moveCamera(state.camera, controls, goal.current, delta);
    if (goal.current.y !== null || goal.current.dist !== null) {
      controls.update();
      state.invalidate();
    }
  });
  return null;
}

const offset = new THREE.Vector3();

/** Un paso del encuadre: acerca la mirada y la distancia a su meta (el primer paso, de golpe). */
function moveCamera(
  camera: THREE.Camera,
  controls: Controls,
  goal: { dist: number | null; y: number | null; snap: boolean },
  delta: number,
) {
  const t = controls.target;
  const k = goal.snap ? 1 : 1 - Math.exp(-delta * 5);
  goal.snap = false;
  if (goal.y !== null) {
    const dy = (goal.y - t.y) * k;
    t.y += dy;
    camera.position.y += dy;
    if (Math.abs(goal.y - t.y) < 0.005) goal.y = null;
  }
  if (goal.dist !== null) {
    offset.subVectors(camera.position, t);
    const next = offset.length() + (goal.dist - offset.length()) * k;
    camera.position.copy(t).add(offset.setLength(next));
    if (Math.abs(next - goal.dist) < 0.02) goal.dist = null;
  }
}
