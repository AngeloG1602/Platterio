"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { seeded } from "./geometry";

/** Acompañante junto a la hamburguesa. `id` es la opción de acompañante elegida. */
export function SideDish({
  id,
  highlighted,
  onSelect,
}: {
  id: string;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const emissive = highlighted ? 0.25 : 0;
  return (
    <group
      name={`acompanante_${id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {id === "papas" && <Fries emissive={emissive} />}
      {id === "papas_cheddar" && <Fries emissive={emissive} cheddar />}
      {id === "aros" && <OnionRings emissive={emissive} />}
      {id === "ensalada" && <Salad emissive={emissive} />}
    </group>
  );
}

const glow = new THREE.Color("#E4572E");

function Cup({ color = "#C9A06A" }: { color?: string }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(1.75, 1.35, 2.6, 40, 1, true), []);
  const bottom = useMemo(() => new THREE.CircleGeometry(1.35, 40).rotateX(-Math.PI / 2), []);
  return (
    <group position={[0, 1.3, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={bottom} position={[0, -1.29, 0]}>
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.62, 0.04, 8, 48]} />
        <meshStandardMaterial color="#E4572E" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Fries({ emissive, cheddar = false }: { emissive: number; cheddar?: boolean }) {
  const sticks = useMemo(() => {
    const rand = seeded(42);
    return Array.from({ length: 34 }, () => {
      const r = Math.sqrt(rand()) * 1.2;
      const th = rand() * Math.PI * 2;
      return {
        x: Math.cos(th) * r,
        z: Math.sin(th) * r,
        h: 2.6 + rand() * 1.4,
        rx: (rand() - 0.5) * 0.5,
        rz: (rand() - 0.5) * 0.5,
      };
    });
  }, []);
  const geo = useMemo(() => new THREE.BoxGeometry(0.26, 1, 0.26), []);
  return (
    <group>
      <Cup />
      {sticks.map((s, i) => (
        <mesh
          key={i}
          geometry={geo}
          position={[s.x, s.h / 2 + 0.4, s.z]}
          scale={[1, s.h, 1]}
          rotation={[s.rx, 0, s.rz]}
          castShadow
        >
          <meshStandardMaterial
            color="#F2C14E"
            roughness={0.6}
            emissive={glow}
            emissiveIntensity={emissive}
          />
        </mesh>
      ))}
      {cheddar && (
        <mesh position={[0, 3.35, 0]} scale={[1.25, 0.35, 1.25]} castShadow>
          <sphereGeometry args={[1.2, 24, 16]} />
          <meshStandardMaterial
            color="#F2A81D"
            roughness={0.3}
            emissive={glow}
            emissiveIntensity={emissive}
          />
        </mesh>
      )}
    </group>
  );
}

function OnionRings({ emissive }: { emissive: number }) {
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[(i % 2) * 0.35 - 0.2, 0.35 + i * 0.52, (i % 3) * 0.2]}
          rotation={[Math.PI / 2 - 0.25 + i * 0.12, 0, i * 0.8]}
          castShadow
          receiveShadow
        >
          <torusGeometry args={[1.05, 0.34, 16, 36]} />
          <meshStandardMaterial
            color="#D9A04A"
            roughness={0.85}
            emissive={glow}
            emissiveIntensity={emissive}
          />
        </mesh>
      ))}
    </group>
  );
}

function Salad({ emissive }: { emissive: number }) {
  const bowl = useMemo(() => {
    const pts = [
      [0, 0],
      [1.2, 0],
      [2.1, 0.6],
      [2.4, 1.3],
      [2.3, 1.35],
      [2.0, 0.75],
      [1.1, 0.2],
      [0, 0.18],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 48);
    g.computeVertexNormals();
    return g;
  }, []);
  const leaves = useMemo(() => {
    const rand = seeded(9);
    return Array.from({ length: 26 }, () => {
      const r = Math.sqrt(rand()) * 1.8;
      const th = rand() * Math.PI * 2;
      return {
        x: Math.cos(th) * r,
        z: Math.sin(th) * r,
        y: 0.7 + rand() * 0.6,
        s: 0.35 + rand() * 0.3,
        red: rand() > 0.82,
      };
    });
  }, []);
  return (
    <group>
      <mesh geometry={bowl} castShadow receiveShadow>
        <meshStandardMaterial color="#F7F3EC" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]} scale={[l.s * 1.4, l.s * 0.6, l.s]} castShadow>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial
            color={l.red ? "#D9412B" : i % 3 ? "#7DB84A" : "#5E9A35"}
            roughness={0.5}
            emissive={glow}
            emissiveIntensity={emissive}
          />
        </mesh>
      ))}
    </group>
  );
}
