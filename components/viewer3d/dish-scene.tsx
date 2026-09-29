"use client";

import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { layerPositions, stackHeight, type StackLayer } from "@/lib/viewer3d/stack";
import { plateGeometry } from "./geometry";
import { hasWebGL, NoWebGL } from "./webgl";

// Este módulo solo se carga en el cliente (dynamic import sin SSR).
const WEBGL = typeof window !== "undefined" && hasWebGL();
import { IngredientMesh } from "./ingredient-mesh";
import { SideDish } from "./sides";

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
}

const GAP = 1.3;

/**
 * Escena 3D del plato con React Three Fiber (Three.js en React). Se carga solo en el cliente
 * y bajo demanda (dynamic import), para no sumar Three.js al resto de la app.
 */
export default function DishScene(props: DishSceneProps) {
  const reducedMotion = useReducedMotion();
  if (!WEBGL) return <NoWebGL />;
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [11, 9, 13], fov: 32, near: 0.1, far: 200 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => props.onSelect(null)}
      aria-label="Modelo 3D del plato. Arrastra para girar y usa la rueda o dos dedos para acercar."
      role="img"
    >
      <SceneContents {...props} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

function SceneContents({
  stack,
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
}: DishSceneProps & { reducedMotion: boolean }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const positions = useMemo(() => layerPositions(stack, explode, GAP), [stack, explode]);
  const height = useMemo(() => stackHeight(stack, explode, GAP), [stack, explode]);
  const plate = useMemo(() => plateGeometry(), []);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    onSceneReady?.(scene);
  }, [scene, onSceneReady]);
  useEffect(() => {
    camera.position.set(11, 9, 13);
    camera.lookAt(0, 2.5, 0);
  }, [resetSignal, camera]);

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

  const PLATE_Y = 0.2;
  return (
    <>
      <color attach="background" args={["#F3EEE6"]} />
      <hemisphereLight args={["#FFF8EF", "#B89A7A", 0.75]} />
      <directionalLight
        position={[7, 14, 9]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-9, 6, -7]} intensity={0.45} color="#FFE6CC" />

      <group name="plato">
        <mesh geometry={plate} receiveShadow castShadow name="plato_ceramica">
          <meshStandardMaterial color="#FBFAF7" roughness={0.25} />
        </mesh>
        <group name="hamburguesa" position={[-1.4, PLATE_Y, 0]}>
          {stack.map((layer, i) => (
            <group key={layer.id}>
              <IngredientMesh
                layer={layer}
                y={positions[i]!}
                index={i}
                selected={selectedKey === layer.key}
                hovered={hovered === layer.key}
                onSelect={(k) => onSelect(k === selectedKey ? null : k)}
                onHover={setHovered}
                reducedMotion={reducedMotion}
              />
              {(showLabels || selectedKey === layer.key) && firstOfKey[i] && (
                <Html
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
              )}
            </group>
          ))}
        </group>
        {sideId && (
          <group position={[5.4, PLATE_Y + 0.05, 1.2]}>
            <SideDish
              id={sideId}
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

      <CameraRig height={height} resetSignal={resetSignal} />
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.32}
        scale={26}
        blur={2.6}
        far={10}
        resolution={512}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        target={[0, Math.min(6, 1.5 + height / 2), 0]}
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

/**
 * Aleja la cámara lo justo para que el plato quepa: según la forma de la pantalla (en el
 * celular el cuadro es más angosto) y la altura de la hamburguesa (en el despiece crece).
 * Solo se ajusta cuando cambian esas cosas; el resto del tiempo manda el usuario.
 */
function CameraRig({ height, resetSignal }: { height: number; resetSignal?: number }) {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const target = useRef<number | null>(null);
  useEffect(() => {
    target.current = (21 + height * 1.1) / Math.min(1, aspect * 0.95);
  }, [height, aspect, resetSignal]);
  useFrame((_, delta) => {
    if (target.current === null) return;
    const len = camera.position.length();
    const next = len + (target.current - len) * (1 - Math.exp(-delta * 5));
    camera.position.setLength(next);
    if (Math.abs(next - target.current) < 0.05) target.current = null;
  });
  return null;
}
