"use client";

import type { ReactNode } from "react";
import { useMenuStyle } from "@/components/dish/dish-layout";
import { useAppStore } from "@/lib/data/store";
import { RestaurantMark } from "./logos";

/**
 * Encabezado de la carta según el estilo: a la izquierda, centrado, o con foto de portada.
 * `actions` son los botones de la derecha (mesa, restricciones…).
 */
export function MenuHeader({ name, actions }: { name: string; actions?: ReactNode }) {
  const { header } = useMenuStyle();
  const cover = useAppStore((s) => s.restaurant.brand?.cover);

  if (header === "portada") {
    return (
      <header className="relative isolate flex h-44 flex-col justify-between overflow-hidden rounded-b-2xl px-4 pt-4 pb-4">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- portada propia del negocio, ya reducida
          <img src={cover} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 -z-20"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 40%, #000))",
            }}
          />
        )}
        <span
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/25 to-black/10"
        />
        <div className="flex min-h-11 justify-end">
          {actions && (
            <div className="bg-bg/90 flex items-center gap-1 rounded-full p-0.5 backdrop-blur">
              {actions}
            </div>
          )}
        </div>
        <RestaurantMark name={name} className="text-[14px]" onPhoto />
      </header>
    );
  }

  if (header === "centrado") {
    return (
      <header className="px-4 pt-4">
        {actions && <div className="flex min-h-11 items-center justify-end gap-1">{actions}</div>}
        <div className="flex justify-center pt-1">
          <RestaurantMark name={name} className="text-[14px]" stacked />
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4">
      <RestaurantMark name={name} className="text-[14px]" />
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  );
}
