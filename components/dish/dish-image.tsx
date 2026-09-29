"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import photoManifest from "@/lib/data/photo-manifest.json";

const AVAILABLE = new Set<string>(photoManifest);

const PALETTES: Array<[string, string, string]> = [
  ["#F7DCC0", "#E39A67", "#B4532A"],
  ["#F4D6B0", "#DDA25A", "#9C5B1E"],
  ["#F3CDB9", "#D9775A", "#9E3F2A"],
  ["#EEDDBE", "#C9A26A", "#7F5B2C"],
  ["#F1D3C4", "#C98166", "#7E3B2B"],
  ["#EAD9C2", "#B98E62", "#6B4A2B"],
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Foto del plato con respaldo elegante: si la imagen no existe o falla, queda un degradado
 * cálido con la inicial del plato (nunca una imagen rota).
 */
export function DishImage({
  src,
  name,
  sizes,
  priority = false,
  className,
  rounded = "rounded-lg",
  initialClassName,
}: {
  src?: string;
  name: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  rounded?: string;
  initialClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [c1, c2, c3] = PALETTES[hash(name) % PALETTES.length]!;
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className={cn("bg-surface-2 relative isolate overflow-hidden", rounded, className)}>
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background: `radial-gradient(120% 90% at 20% 15%, ${c1} 0%, transparent 60%), linear-gradient(135deg, ${c1} 0%, ${c2} 55%, ${c3} 120%)`,
        }}
      >
        <span
          className={cn(
            "font-display leading-none font-semibold text-white/90 drop-shadow-[0_2px_6px_rgb(0_0_0/0.18)]",
            initialClassName ?? "text-[2.6em]",
          )}
        >
          {initial}
        </span>
      </div>
      {src && AVAILABLE.has(src) && !failed && (
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {(failed || !src || !AVAILABLE.has(src)) && <span className="sr-only">{name}</span>}
    </div>
  );
}
