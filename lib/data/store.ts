"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSeedState, DATA_VERSION, type AppData } from "./seed";

/**
 * Store único del mockup. Las pantallas no lo usan directamente: pasan por los hooks y
 * acciones de /lib/data, para poder cambiarlo luego por Supabase.
 */
export const useAppStore = create<AppData>()(
  persist(() => createSeedState(Date.now()), {
    name: "platterio:datos",
    version: DATA_VERSION,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
    // Si cambia la forma de los datos, se vuelve a sembrar en lugar de migrar.
    migrate: () => createSeedState(Date.now()),
  }),
);

/** Indica si ya se leyeron los datos guardados (evita parpadeos y desajustes al hidratar). */
export const useBootStore = create<{ hydrated: boolean }>(() => ({ hydrated: false }));
