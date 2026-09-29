"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { bowlGeometry, friesGeometry, onionRingsSide, saladGeometry } from "./geometry";
import { FoodMaterial } from "./stage";
import { paperCup, softDetail } from "./textures";

type V2 = [number, number];
const GLOW = new THREE.Color("#E4572E");

/**
 * Acompañante junto a la hamburguesa. `id` es la opción de acompañante elegida. Cada uno es
 * una o dos mallas (las piezas repetidas van fusionadas).
 */
export function SideDish({
  id,
  highlighted,
  onSelect,
  brand,
  accent,
}: {
  id: string;
  highlighted: boolean;
  onSelect: () => void;
  /** Nombre impreso en el vaso de papel. */
  brand: string;
  accent: string;
}) {
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);
  const register = (m: THREE.MeshStandardMaterial | null) => {
    if (m && !materials.current.includes(m)) {
      m.emissive = GLOW;
      materials.current.push(m);
    }
  };
  useFrame((state, delta) => {
    const target = highlighted ? 0.22 : 0;
    let busy = false;
    for (const m of materials.current) {
      const next =
        m.emissiveIntensity + (target - m.emissiveIntensity) * (1 - Math.exp(-delta * 12));
      const close = Math.abs(target - next) < 0.002;
      m.emissiveIntensity = close ? target : next;
      busy ||= !close;
    }
    if (busy) state.invalidate();
  });

  return (
    <group
      name={`acompanante_${id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {id === "papas" && <Fries register={register} brand={brand} accent={accent} />}
      {id === "papas_cheddar" && (
        <Fries register={register} brand={brand} accent={accent} cheddar />
      )}
      {id === "aros" && <OnionRings register={register} />}
      {id === "ensalada" && <Salad register={register} />}
    </group>
  );
}

type Register = (m: THREE.MeshStandardMaterial | null) => void;

/** Vaso de papel kraft con la franja del color del restaurante y su nombre. */
function Cup({ brand, accent }: { brand: string; accent: string }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(1.75, 1.35, 2.6, 48, 1, true), []);
  const bottom = useMemo(() => new THREE.CircleGeometry(1.35, 40).rotateX(-Math.PI / 2), []);
  const rim = useMemo(() => new THREE.TorusGeometry(1.75, 0.045, 8, 64).rotateX(Math.PI / 2), []);
  const paper = paperCup(accent, brand.toUpperCase());
  return (
    <group position={[0, 1.3, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <FoodMaterial
          map={paper.map}
          normalMap={paper.normalMap}
          normalScale={[0.3, 0.3] as V2}
          roughness={0.85}
          sheen={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={bottom} position={[0, -1.29, 0]}>
        <meshStandardMaterial color="#B98E5C" roughness={0.9} />
      </mesh>
      <mesh geometry={rim} position={[0, 1.3, 0]}>
        <meshStandardMaterial color="#D2AE7C" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Fries({
  register,
  brand,
  accent,
  cheddar = false,
}: {
  register: Register;
  brand: string;
  accent: string;
  cheddar?: boolean;
}) {
  const geo = useMemo(() => friesGeometry(), []);
  const sauce = useMemo(() => new THREE.SphereGeometry(1.2, 32, 16).scale(1.25, 0.35, 1.25), []);
  const detail = softDetail(31, 14);
  return (
    <group>
      <Cup brand={brand} accent={accent} />
      <mesh geometry={geo} castShadow>
        <FoodMaterial
          ref={register}
          vertexColors
          normalMap={detail.normalMap}
          normalScale={[0.4, 0.4] as V2}
          roughness={0.55}
          clearcoat={0.25}
          clearcoatRoughness={0.4}
        />
      </mesh>
      {cheddar && (
        <mesh geometry={sauce} position={[0, 3.35, 0]} castShadow>
          <FoodMaterial
            ref={register}
            color="#F2A81D"
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}

function OnionRings({ register }: { register: Register }) {
  const geo = useMemo(() => onionRingsSide(), []);
  const detail = softDetail(44, 18);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <FoodMaterial
        ref={register}
        color="#D39A48"
        map={detail.map}
        normalMap={detail.normalMap}
        normalScale={[1.2, 1.2] as V2}
        roughness={0.72}
        clearcoat={0.2}
      />
    </mesh>
  );
}

function Salad({ register }: { register: Register }) {
  const bowl = useMemo(() => bowlGeometry(), []);
  const leaves = useMemo(() => saladGeometry(), []);
  return (
    <group>
      <mesh geometry={bowl} castShadow receiveShadow>
        <FoodMaterial
          color="#F7F3EC"
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={leaves} castShadow>
        <FoodMaterial
          ref={register}
          vertexColors
          roughness={0.4}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
          sheen={0.4}
          sheenColor="#E8FFD0"
        />
      </mesh>
    </group>
  );
}
