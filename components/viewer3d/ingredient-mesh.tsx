"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { StackLayer } from "@/lib/viewer3d/stack";
import {
  breadBase,
  breadTop,
  bumpyDisc,
  cheeseSlice,
  RADIUS,
  ruffledLeaf,
  scatter,
  sesameGeometry,
  wavyStrip,
} from "./geometry";

const ACCENT = new THREE.Color("#E4572E");

interface Props {
  layer: StackLayer;
  /** Altura objetivo del centro de la capa (se anima hacia ella). */
  y: number;
  index: number;
  selected: boolean;
  hovered: boolean;
  onSelect: (key: string) => void;
  onHover: (key: string | null) => void;
  reducedMotion: boolean;
}

/** Una capa del plato. Se anima hacia su altura y resalta al pasar el cursor o seleccionarla. */
export function IngredientMesh({
  layer,
  y,
  index,
  selected,
  hovered,
  onSelect,
  onHover,
  reducedMotion,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);
  const appear = useRef(reducedMotion ? 1 : 0);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const k = reducedMotion ? 1 : 1 - Math.exp(-delta * 9);
    g.position.y += (y - g.position.y) * k;
    appear.current += (1 - appear.current) * (reducedMotion ? 1 : 1 - Math.exp(-delta * 7));
    const s = 0.6 + 0.4 * appear.current;
    g.scale.set(s, 0.2 + 0.8 * appear.current, s);
    const glow = selected ? 0.32 : hovered ? 0.16 : 0;
    for (const m of materials.current) {
      m.emissiveIntensity +=
        (glow - m.emissiveIntensity) * (reducedMotion ? 1 : 1 - Math.exp(-delta * 12));
    }
  });

  const register = (m: THREE.MeshStandardMaterial | null) => {
    if (m && !materials.current.includes(m)) {
      m.emissive = ACCENT;
      m.emissiveIntensity = 0;
      materials.current.push(m);
    }
  };

  return (
    <group
      ref={group}
      name={layer.id}
      position={[0, y + (reducedMotion ? 0 : 2.5 + index * 0.1), 0]}
      userData={{ ingredientKey: layer.key, name: layer.name }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(layer.key);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(layer.key);
      }}
    >
      <LayerBody layer={layer} register={register} />
    </group>
  );
}

type Register = (m: THREE.MeshStandardMaterial | null) => void;

function Mat({
  color,
  roughness = 0.8,
  register,
  side,
  metalness = 0,
}: {
  color: string;
  roughness?: number;
  register: Register;
  side?: THREE.Side;
  metalness?: number;
}) {
  return (
    <meshStandardMaterial
      ref={register}
      color={color}
      roughness={roughness}
      metalness={metalness}
      side={side}
    />
  );
}

function LayerBody({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const seed = useMemo(
    () => [...layer.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7),
    [layer.id],
  );

  switch (layer.kind) {
    case "pan":
      return layer.part === "tapa" ? (
        <BreadTop layer={layer} register={register} />
      ) : (
        <BreadBase layer={layer} register={register} />
      );
    case "envoltura_lechuga":
      return (
        <Leaf
          color={layer.color}
          radius={RADIUS + 0.6}
          amplitude={0.45}
          waves={9}
          seed={seed}
          register={register}
          sheets={3}
        />
      );
    case "carne":
      return (
        <Disc
          color={layer.color}
          radius={RADIUS + 0.1}
          thickness={t}
          bump={0.05}
          seed={seed}
          register={register}
          roughness={0.95}
        />
      );
    case "pollo":
      return (
        <Disc
          color={layer.color}
          radius={RADIUS + 0.35}
          thickness={t}
          bump={0.12}
          seed={seed}
          register={register}
          roughness={0.9}
        />
      );
    case "vegetal":
      return (
        <Disc
          color={layer.color}
          radius={RADIUS - 0.1}
          thickness={t}
          bump={0.04}
          seed={seed}
          register={register}
          roughness={0.92}
        />
      );
    case "salsa":
      return (
        <Disc
          color={layer.color}
          radius={RADIUS - 0.35}
          thickness={t}
          bump={0.08}
          seed={seed}
          register={register}
          roughness={0.25}
        />
      );
    case "queso":
      return <Cheese layer={layer} register={register} />;
    case "lechuga":
      return (
        <Leaf
          color={layer.color}
          radius={RADIUS + 0.45}
          amplitude={0.32}
          waves={11}
          seed={seed}
          register={register}
          sheets={2}
        />
      );
    case "tomate":
      return <Tomato layer={layer} register={register} />;
    case "cebolla":
      return (
        <Rings
          color={layer.color}
          count={14}
          ringRadius={0.75}
          tube={0.09}
          arc={Math.PI * 1.4}
          spread={RADIUS - 0.9}
          seed={seed}
          register={register}
        />
      );
    case "cebolla_crocante":
      return (
        <Rings
          color={layer.color}
          count={26}
          ringRadius={0.35}
          tube={0.1}
          arc={Math.PI * 1.7}
          spread={RADIUS - 0.6}
          seed={seed}
          register={register}
        />
      );
    case "jalapeno":
      return (
        <Rings
          color={layer.color}
          count={10}
          ringRadius={0.45}
          tube={0.15}
          arc={Math.PI * 2}
          spread={RADIUS - 1}
          seed={seed}
          register={register}
        />
      );
    case "pepinillo":
      return (
        <Rings
          color={layer.color}
          count={8}
          ringRadius={0.6}
          tube={0.2}
          arc={Math.PI * 2}
          spread={RADIUS - 1.2}
          seed={seed}
          register={register}
        />
      );
    case "tocineta":
      return <Bacon layer={layer} register={register} />;
    case "huevo":
      return <Egg layer={layer} seed={seed} register={register} />;
    case "aguacate":
      return <Avocado layer={layer} register={register} />;
    default:
      return null;
  }
}

function BreadBase({ layer, register }: { layer: StackLayer; register: Register }) {
  const geo = useMemo(() => breadBase(layer.thickness), [layer.thickness]);
  return (
    <mesh castShadow receiveShadow geometry={geo}>
      <Mat color={layer.color} roughness={0.75} register={register} />
    </mesh>
  );
}

function Cheese({ layer, register }: { layer: StackLayer; register: Register }) {
  const geo = useMemo(() => cheeseSlice(layer.thickness), [layer.thickness]);
  return (
    <mesh castShadow receiveShadow geometry={geo}>
      <Mat color={layer.color} roughness={0.45} register={register} />
    </mesh>
  );
}

function BreadTop({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => breadTop(t), [t]);
  const seeds = useMemo(() => sesameGeometry(t), [t]);
  return (
    <group>
      <mesh castShadow receiveShadow geometry={geo}>
        <Mat color={layer.color} roughness={0.6} register={register} />
      </mesh>
      <mesh geometry={seeds} castShadow>
        <meshStandardMaterial color="#F6E7C8" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Disc({
  color,
  radius,
  thickness,
  bump,
  seed,
  register,
  roughness,
}: {
  color: string;
  radius: number;
  thickness: number;
  bump: number;
  seed: number;
  register: Register;
  roughness: number;
}) {
  const geo = useMemo(
    () => bumpyDisc(radius, thickness, bump, seed),
    [radius, thickness, bump, seed],
  );
  return (
    <mesh castShadow receiveShadow geometry={geo}>
      <Mat color={color} roughness={roughness} register={register} />
    </mesh>
  );
}

function Leaf({
  color,
  radius,
  amplitude,
  waves,
  seed,
  register,
  sheets,
}: {
  color: string;
  radius: number;
  amplitude: number;
  waves: number;
  seed: number;
  register: Register;
  sheets: number;
}) {
  const geos = useMemo(
    () =>
      Array.from({ length: sheets }, (_, i) =>
        ruffledLeaf(radius - i * 0.35, amplitude, waves + i, seed + i * 13),
      ),
    [radius, amplitude, waves, seed, sheets],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh
          key={i}
          geometry={g}
          position={[0, i * 0.07 - 0.05, 0]}
          rotation={[0, i * 0.7, 0]}
          castShadow
          receiveShadow
        >
          <Mat color={color} roughness={0.55} register={register} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Tomato({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const slice = useMemo(() => new THREE.CylinderGeometry(1.95, 1.95, t, 40), [t]);
  const inner = useMemo(() => new THREE.CylinderGeometry(1.35, 1.35, t + 0.02, 32), [t]);
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        return (
          <group key={i} position={[Math.cos(a) * 2.25, 0, Math.sin(a) * 2.25]}>
            <mesh geometry={slice} castShadow receiveShadow>
              <Mat color={layer.color} roughness={0.35} register={register} />
            </mesh>
            <mesh geometry={inner}>
              <Mat color="#F07A5A" roughness={0.4} register={register} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Rings({
  color,
  count,
  ringRadius,
  tube,
  arc,
  spread,
  seed,
  register,
}: {
  color: string;
  count: number;
  ringRadius: number;
  tube: number;
  arc: number;
  spread: number;
  seed: number;
  register: Register;
}) {
  const geo = useMemo(
    () => new THREE.TorusGeometry(ringRadius, tube, 10, 28, arc),
    [ringRadius, tube, arc],
  );
  const spots = useMemo(() => scatter(count, spread, seed), [count, spread, seed]);
  return (
    <group>
      {spots.map((s, i) => (
        <mesh
          key={i}
          geometry={geo}
          position={[s.x, 0, s.z]}
          rotation={[Math.PI / 2 + s.tilt, 0, s.rot]}
          scale={s.s}
          castShadow
        >
          <Mat color={color} roughness={0.6} register={register} />
        </mesh>
      ))}
    </group>
  );
}

function Bacon({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => wavyStrip(RADIUS * 2 * 0.95, 1.25, t * 0.6, 3.5, 0.12), [t]);
  return (
    <group>
      {[-1.1, 0.4, 1.8].map((z, i) => (
        <mesh
          key={i}
          geometry={geo}
          position={[0, (i % 2) * 0.05, z - 0.4]}
          rotation={[0, 0.15 * (i - 1), 0]}
          castShadow
          receiveShadow
        >
          <Mat color={i % 2 ? "#B8554A" : layer.color} roughness={0.55} register={register} />
        </mesh>
      ))}
    </group>
  );
}

function Egg({ layer, seed, register }: { layer: StackLayer; seed: number; register: Register }) {
  const t = layer.thickness;
  const white = useMemo(() => bumpyDisc(RADIUS - 0.4, t * 0.5, 0.14, seed), [t, seed]);
  const yolk = useMemo(
    () => new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1),
    [],
  );
  return (
    <group>
      <mesh geometry={white} castShadow receiveShadow>
        <Mat color={layer.color} roughness={0.35} register={register} />
      </mesh>
      <mesh geometry={yolk} position={[0.6, t * 0.2, -0.4]} castShadow>
        <Mat color="#F5B301" roughness={0.25} register={register} />
      </mesh>
    </group>
  );
}

function Avocado({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => new THREE.CylinderGeometry(1.5, 1.5, t, 32, 1, false, 0, Math.PI), [t]);
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          geometry={geo}
          position={[-2.4 + i * 1.6, 0, (i % 2) * 0.8 - 0.4]}
          rotation={[0, Math.PI / 2 + (i % 2) * Math.PI, 0]}
          castShadow
          receiveShadow
        >
          <Mat color={layer.color} roughness={0.5} register={register} />
        </mesh>
      ))}
    </group>
  );
}

export { RADIUS };
