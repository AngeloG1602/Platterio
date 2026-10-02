"use client";

import { Box } from "lucide-react";

/** true si el navegador puede dibujar 3D (WebGL). Solo se llama en el cliente. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Respaldo cuando no hay 3D: la personalización sigue funcionando desde la lista. */
export function NoWebGL() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <Box className="text-muted size-10" strokeWidth={1.4} aria-hidden />
      <p className="font-display text-lg font-semibold">Este dispositivo no puede mostrar 3D</p>
      <p className="text-muted max-w-xs text-sm">
        Puedes personalizar el plato igual desde la lista de ingredientes.
      </p>
    </div>
  );
}
