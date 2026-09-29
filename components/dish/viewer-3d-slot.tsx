import { Rotate3d } from "lucide-react";
import type { Dish } from "@/lib/domain/types";

/**
 * Espacio reservado para el visor 3D (EPIC-03, US-18 a US-20).
 * Punto de conexión: cuando exista el visor, este componente recibirá el modelo del plato
 * y montará la escena en lugar del botón deshabilitado.
 */
export function Viewer3DSlot({ model }: { model?: Dish["model3d"] }) {
  if (!model) return null;
  return (
    <button
      type="button"
      disabled
      aria-disabled
      className="border-line-strong bg-surface/90 text-muted inline-flex h-11 items-center gap-2 rounded-full border border-dashed px-4 text-sm font-medium backdrop-blur"
    >
      <Rotate3d aria-hidden className="size-4.5" strokeWidth={1.7} />
      Vista 3D — próximamente
    </button>
  );
}
