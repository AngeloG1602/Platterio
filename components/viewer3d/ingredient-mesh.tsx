"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { StackLayer } from "@/lib/viewer3d/stack";
import {
  avocadoGeometry,
  baconGeometry,
  breadBase,
  breadTop,
  bumpyDisc,
  cheeseSlice,
  crumbFace,
  lettuceGeometry,
  patty,
  RADIUS,
  ringsGeometry,
  sesameGeometry,
  slicesGeometry,
  tomatoSlices,
} from "./geometry";
import {
  baconStripes,
  breadCrumb,
  breadCrust,
  lettuceVeins,
  pattySear,
  softDetail,
  tomatoFace,
} from "./textures";
import { FoodMaterial } from "./stage";

const ACCENT = new THREE.Color("#E4572E");
/** Las mallas visibles no se prueban con el puntero: solo la caja invisible de la capa. */
const NO_RAYCAST = () => {};

interface Props {
  layer: StackLayer;
  /** Altura objetivo del centro de la capa (se anima hacia ella con un resorte). */
  y: number;
  index: number;
  selected: boolean;
  hovered: boolean;
  onSelect: (key: string) => void;
  onHover: (key: string | null) => void;
  reducedMotion: boolean;
  /** La capa se quitó: se encoge y sube antes de desaparecer; al terminar avisa con `onLeft`. */
  leaving?: boolean;
  onLeft?: () => void;
}

/**
 * Una capa del plato. Cae a su sitio con un resorte (un rebote leve), sale animada cuando se
 * quita y resalta al pasar el cursor o seleccionarla. Pide cuadros solo mientras se mueve: el
 * lienzo dibuja bajo demanda y en reposo no gasta batería.
 */
export function IngredientMesh({
  layer,
  y,
  index,
  selected,
  hovered,
  onSelect,
  onHover,
  reducedMotion,
  leaving = false,
  onLeft,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);
  const motion = useRef({ vy: 0, appear: reducedMotion ? 1 : 0, va: 0, done: false });
  const invalidate = useThree((s) => s.invalidate);
  // Solo la posición inicial va como prop; luego manda el resorte (si no, cada cambio de
  // `y` la reiniciaría).
  const [startY] = useState(() => y + (reducedMotion ? 0 : 2.2 + index * 0.08));
  const hit = useMemo(
    () =>
      new THREE.CylinderGeometry(RADIUS + 0.4, RADIUS + 0.4, Math.max(0.4, layer.thickness), 24),
    [layer.thickness],
  );

  useEffect(() => invalidate(), [y, selected, hovered, leaving, invalidate]);
  useLayoutEffect(() => {
    group.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.userData.hitbox) o.raycast = NO_RAYCAST;
    });
  });

  useFrame((state, rawDelta) => {
    const g = group.current;
    const m = motion.current;
    if (!g || m.done) return;
    // Pasos cortos para que el resorte sea estable aunque el equipo vaya a pocos cuadros.
    const delta = Math.min(rawDelta, 0.25);
    const steps = Math.max(1, Math.ceil(delta * 120));
    const dt = delta / steps;
    let busy = false;

    const targetY = leaving ? y + 1.6 : y;
    if (reducedMotion) {
      g.position.y = targetY;
      m.vy = 0;
    } else {
      // Resorte semi-implícito: tensión 170, fricción 20 (se pasa un poquito y se asienta).
      for (let i = 0; i < steps; i++) {
        m.vy += ((targetY - g.position.y) * 170 - m.vy * 20) * dt;
        g.position.y += m.vy * dt;
      }
      busy ||= Math.abs(targetY - g.position.y) > 0.001 || Math.abs(m.vy) > 0.001;
    }

    if (leaving) {
      m.appear += (0 - m.appear) * (reducedMotion ? 1 : 1 - Math.exp(-delta * 11));
      if (m.appear < 0.03) {
        m.done = true;
        g.visible = false;
        onLeft?.();
        return;
      }
      busy = true;
    } else if (reducedMotion) {
      m.appear = 1;
    } else {
      for (let i = 0; i < steps; i++) {
        m.va += ((1 - m.appear) * 220 - m.va * 18) * dt;
        m.appear += m.va * dt;
      }
      busy ||= Math.abs(1 - m.appear) > 0.001 || Math.abs(m.va) > 0.001;
    }
    const a = Math.max(0, m.appear);
    g.scale.set(0.55 + 0.45 * a, 0.2 + 0.8 * a, 0.55 + 0.45 * a);

    const glow = leaving ? 0 : selected ? 0.3 : hovered ? 0.14 : 0;
    for (const mat of materials.current) {
      const next = reducedMotion
        ? glow
        : mat.emissiveIntensity + (glow - mat.emissiveIntensity) * (1 - Math.exp(-delta * 12));
      busy ||= Math.abs(glow - next) > 0.002;
      mat.emissiveIntensity = Math.abs(glow - next) > 0.002 ? next : glow;
    }
    if (busy) state.invalidate();
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
      name={leaving ? undefined : layer.id}
      position={[0, startY, 0]}
      userData={leaving ? {} : { ingredientKey: layer.key, name: layer.name }}
    >
      {!leaving && (
        <mesh
          geometry={hit}
          visible={false}
          userData={{ hitbox: true }}
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
        />
      )}
      <LayerBody layer={layer} register={register} />
    </group>
  );
}

type Register = (m: THREE.MeshStandardMaterial | null) => void;
type V2 = [number, number];

function LayerBody({ layer, register }: { layer: StackLayer; register: Register }) {
  const seed = useMemo(
    () => [...layer.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7),
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
      return <Lettuce layer={layer} seed={seed} register={register} wrap />;
    case "carne":
      return <Patty layer={layer} seed={seed} register={register} kind="carne" />;
    case "pollo":
      return <Patty layer={layer} seed={seed} register={register} kind="pollo" />;
    case "vegetal":
      return <Patty layer={layer} seed={seed} register={register} kind="vegetal" />;
    case "salsa":
      return <Sauce layer={layer} seed={seed} register={register} />;
    case "queso":
      return <Cheese layer={layer} register={register} />;
    case "lechuga":
      return <Lettuce layer={layer} seed={seed} register={register} />;
    case "tomate":
      return <Tomato layer={layer} register={register} />;
    case "cebolla":
      return (
        <Rings
          layer={layer}
          seed={seed}
          register={register}
          count={14}
          ringRadius={0.75}
          tube={0.09}
          arc={Math.PI * 1.4}
          spread={RADIUS - 0.9}
          lumpy={0}
          roughness={0.35}
          clearcoat={0.6}
        />
      );
    case "cebolla_crocante":
      return (
        <Rings
          layer={layer}
          seed={seed}
          register={register}
          count={26}
          ringRadius={0.35}
          tube={0.1}
          arc={Math.PI * 1.7}
          spread={RADIUS - 0.6}
          lumpy={0.5}
          roughness={0.85}
          clearcoat={0}
        />
      );
    case "jalapeno":
      return (
        <Rings
          layer={layer}
          seed={seed}
          register={register}
          count={10}
          ringRadius={0.45}
          tube={0.15}
          arc={Math.PI * 2}
          spread={RADIUS - 1}
          lumpy={0}
          roughness={0.3}
          clearcoat={0.8}
        />
      );
    case "pepinillo":
      return <Pickles layer={layer} seed={seed} register={register} />;
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

/* ——— Pan: costra con brillo suave (sheen) y la miga en la cara del corte ——— */

function BreadBase({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => breadBase(t), [t]);
  const cut = useMemo(() => crumbFace(RADIUS - 0.2, 1), []);
  const crust = breadCrust();
  const crumb = breadCrumb();
  return (
    <group>
      <mesh castShadow receiveShadow geometry={geo}>
        <FoodMaterial
          ref={register}
          color={layer.color}
          map={crust.map}
          normalMap={crust.normalMap}
          normalScale={[0.5, 0.5] as V2}
          roughness={0.62}
          sheen={0.6}
          sheenRoughness={0.5}
          sheenColor="#FFE2B8"
        />
      </mesh>
      <mesh geometry={cut} position={[0, t / 2, 0]} receiveShadow>
        <FoodMaterial
          ref={register}
          map={crumb.map}
          normalMap={crumb.normalMap}
          normalScale={[0.8, 0.8] as V2}
          roughness={0.95}
        />
      </mesh>
    </group>
  );
}

function BreadTop({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => breadTop(t), [t]);
  const cut = useMemo(() => crumbFace(RADIUS - 0.2, -1), []);
  const seeds = useMemo(() => sesameGeometry(t), [t]);
  const crust = breadCrust();
  const crumb = breadCrumb();
  return (
    <group>
      <mesh castShadow receiveShadow geometry={geo}>
        <FoodMaterial
          ref={register}
          color={layer.color}
          map={crust.map}
          normalMap={crust.normalMap}
          normalScale={[0.45, 0.45] as V2}
          roughness={0.5}
          sheen={0.7}
          sheenRoughness={0.45}
          sheenColor="#FFE2B8"
          clearcoat={0.18}
          clearcoatRoughness={0.55}
        />
      </mesh>
      <mesh geometry={cut} position={[0, -t / 2, 0]}>
        <FoodMaterial ref={register} map={crumb.map} roughness={0.95} />
      </mesh>
      <mesh geometry={seeds} castShadow>
        <FoodMaterial color="#F3E2BD" roughness={0.45} sheen={0.4} sheenColor="#FFFFFF" />
      </mesh>
    </group>
  );
}

/* ——— Proteínas ——— */

const PATTY: Record<
  "carne" | "pollo" | "vegetal",
  { radius: number; rough: number; roughness: number; clearcoat: number; normal: number }
> = {
  // La carne tiene brillo de grasa (clearcoat) sobre una superficie rugosa y sellada.
  carne: { radius: RADIUS + 0.1, rough: 1, roughness: 0.72, clearcoat: 0.12, normal: 1.1 },
  pollo: { radius: RADIUS + 0.35, rough: 1.6, roughness: 0.82, clearcoat: 0.1, normal: 1.4 },
  vegetal: { radius: RADIUS - 0.1, rough: 0.7, roughness: 0.9, clearcoat: 0.05, normal: 0.8 },
};

function Patty({
  layer,
  seed,
  register,
  kind,
}: {
  layer: StackLayer;
  seed: number;
  register: Register;
  kind: keyof typeof PATTY;
}) {
  const p = PATTY[kind];
  const t = layer.thickness;
  const geo = useMemo(() => patty(p.radius, t, seed, p.rough), [p.radius, t, seed, p.rough]);
  const sear = pattySear();
  return (
    <mesh castShadow receiveShadow geometry={geo}>
      <FoodMaterial
        ref={register}
        color={layer.color}
        map={sear.map}
        normalMap={sear.normalMap}
        normalScale={[p.normal, p.normal] as V2}
        roughness={p.roughness}
        clearcoat={p.clearcoat}
        clearcoatRoughness={0.4}
      />
    </mesh>
  );
}

function Egg({ layer, seed, register }: { layer: StackLayer; seed: number; register: Register }) {
  const t = layer.thickness;
  const white = useMemo(() => bumpyDisc(RADIUS - 0.4, t * 0.5, 0.16, seed), [t, seed]);
  const yolk = useMemo(
    () => new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1),
    [],
  );
  const detail = softDetail(21, 6);
  return (
    <group>
      <mesh geometry={white} castShadow receiveShadow>
        <FoodMaterial
          ref={register}
          color={layer.color}
          normalMap={detail.normalMap}
          normalScale={[0.3, 0.3] as V2}
          roughness={0.35}
          clearcoat={0.6}
          clearcoatRoughness={0.2}
        />
      </mesh>
      <mesh geometry={yolk} position={[0.6, t * 0.2, -0.4]} castShadow>
        <FoodMaterial
          ref={register}
          color="#F5B301"
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
    </group>
  );
}

function Bacon({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => baconGeometry(t), [t]);
  const stripes = baconStripes();
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <FoodMaterial
        ref={register}
        map={stripes.map}
        normalMap={stripes.normalMap}
        normalScale={[0.9, 0.9] as V2}
        roughness={0.5}
        clearcoat={0.45}
        clearcoatRoughness={0.35}
      />
    </mesh>
  );
}

/* ——— Queso y salsas: brillantes ——— */

function Cheese({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => cheeseSlice(t), [t]);
  const detail = softDetail(5, 5);
  return (
    <mesh castShadow receiveShadow geometry={geo}>
      <FoodMaterial
        ref={register}
        color={layer.color}
        map={detail.map}
        normalMap={detail.normalMap}
        normalScale={[0.25, 0.25] as V2}
        roughness={0.38}
        clearcoat={0.5}
        clearcoatRoughness={0.25}
        sheen={0.3}
        sheenColor="#FFE9A8"
      />
    </mesh>
  );
}

function Sauce({ layer, seed, register }: { layer: StackLayer; seed: number; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => bumpyDisc(RADIUS - 0.35, t, 0.1, seed), [t, seed]);
  const detail = softDetail(13, 4);
  return (
    <mesh castShadow receiveShadow geometry={geo}>
      <FoodMaterial
        ref={register}
        color={layer.color}
        normalMap={detail.normalMap}
        normalScale={[0.35, 0.35] as V2}
        roughness={0.18}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

/* ——— Vegetales ——— */

function Lettuce({
  layer,
  seed,
  register,
  wrap = false,
}: {
  layer: StackLayer;
  seed: number;
  register: Register;
  wrap?: boolean;
}) {
  const geo = useMemo(
    () =>
      wrap
        ? lettuceGeometry(RADIUS + 0.6, 0.45, 9, seed, 3)
        : lettuceGeometry(RADIUS + 0.45, 0.32, 11, seed, 2),
    [wrap, seed],
  );
  const veins = lettuceVeins();
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <FoodMaterial
        ref={register}
        color={layer.color}
        map={veins.map}
        normalMap={veins.normalMap}
        normalScale={[0.6, 0.6] as V2}
        roughness={0.45}
        clearcoat={0.35}
        clearcoatRoughness={0.3}
        sheen={0.5}
        sheenColor="#E8FFD0"
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Tomato({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => tomatoSlices(t), [t]);
  const face = tomatoFace();
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <FoodMaterial
        ref={register}
        map={face.map}
        normalMap={face.normalMap}
        normalScale={[0.5, 0.5] as V2}
        roughness={0.28}
        clearcoat={0.9}
        clearcoatRoughness={0.12}
      />
    </mesh>
  );
}

function Rings({
  layer,
  seed,
  register,
  count,
  ringRadius,
  tube,
  arc,
  spread,
  lumpy,
  roughness,
  clearcoat,
}: {
  layer: StackLayer;
  seed: number;
  register: Register;
  count: number;
  ringRadius: number;
  tube: number;
  arc: number;
  spread: number;
  lumpy: number;
  roughness: number;
  clearcoat: number;
}) {
  const geo = useMemo(
    () => ringsGeometry(count, ringRadius, tube, arc, spread, seed, lumpy),
    [count, ringRadius, tube, arc, spread, seed, lumpy],
  );
  return (
    <mesh geometry={geo} castShadow>
      <FoodMaterial
        ref={register}
        color={layer.color}
        roughness={roughness}
        clearcoat={clearcoat}
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
}

function Pickles({
  layer,
  seed,
  register,
}: {
  layer: StackLayer;
  seed: number;
  register: Register;
}) {
  const geo = useMemo(
    () => slicesGeometry(8, 0.6, layer.thickness, RADIUS - 1.2, seed),
    [layer.thickness, seed],
  );
  const detail = softDetail(8, 12);
  return (
    <mesh geometry={geo} castShadow>
      <FoodMaterial
        ref={register}
        color={layer.color}
        map={detail.map}
        roughness={0.3}
        clearcoat={0.8}
        clearcoatRoughness={0.15}
      />
    </mesh>
  );
}

function Avocado({ layer, register }: { layer: StackLayer; register: Register }) {
  const t = layer.thickness;
  const geo = useMemo(() => avocadoGeometry(t), [t]);
  const detail = softDetail(17, 7);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <FoodMaterial
        ref={register}
        color={layer.color}
        map={detail.map}
        normalMap={detail.normalMap}
        normalScale={[0.3, 0.3] as V2}
        roughness={0.42}
        clearcoat={0.4}
        clearcoatRoughness={0.3}
      />
    </mesh>
  );
}
