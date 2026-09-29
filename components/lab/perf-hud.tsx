"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { PerfStats, Quality, QualitySetting } from "@/components/viewer3d/stage";

/**
 * Medidor de rendimiento del visor. Las mediciones llegan cada medio segundo desde el lienzo;
 * van por un almacén aparte para que solo se vuelva a pintar este letrero y no todo el
 * laboratorio (ni la escena 3D).
 */
export function createStatsStore() {
  let current: PerfStats | null = null;
  const listeners = new Set<() => void>();
  return {
    set: (s: PerfStats) => {
      current = s;
      for (const l of listeners) l();
    },
    get: () => current,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export type StatsStore = ReturnType<typeof createStatsStore>;

const QUALITY_LABEL: Record<Quality, string> = { alta: "alta", rapida: "rápida" };

export function PerfHud({
  store,
  quality,
  setting,
}: {
  store: StatsStore;
  quality: Quality;
  setting: QualitySetting;
}) {
  const stats = useSyncExternalStore(store.subscribe, store.get, () => null);
  // Si no llegan mediciones, el lienzo está quieto (dibuja solo cuando algo se mueve).
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow(performance.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const idle = !stats || now - stats.at > 900;

  return (
    <div className="border-line bg-surface/90 shadow-card pointer-events-auto rounded-xl border px-3 py-2 font-mono text-[11px] leading-5 tabular-nums backdrop-blur">
      <p className="font-sans text-xs font-semibold">
        {idle ? "En reposo · 0 fps" : `${stats.fps} fps`}
      </p>
      <p className="text-ink-soft">
        {stats ? `${stats.drawCalls} llamadas de dibujo` : "—"}
        <br />
        {stats ? `${formatTriangles(stats.triangles)} triángulos` : "—"}
        <br />
        Calidad {QUALITY_LABEL[quality]}
        {setting === "auto" && " (auto)"}
      </p>
    </div>
  );
}

function formatTriangles(n: number) {
  return n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n);
}
