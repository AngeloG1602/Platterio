"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Allergen } from "@/lib/domain/types";
import { newId } from "./ids";

/**
 * Datos de este "dispositivo". En la demo cada pestaña cuenta como un celular distinto, por eso
 * se guardan en sessionStorage (sobreviven a recargar, pero no se comparten entre pestañas).
 */
interface DeviceState {
  deviceId: string;
  restrictions: Allergen[];
  /** true cuando el cliente ya respondió u omitió la pregunta de restricciones. */
  restrictionsAnswered: boolean;
  /** Persona que entró con su PIN en este dispositivo (sesión de esta pestaña). */
  staffId: string | null;
  /** Sonido suave al llegar un pedido en la vista del mesero. */
  waiterSound: boolean;
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (): DeviceState => ({
      deviceId: newId("dispositivo"),
      restrictions: [],
      restrictionsAnswered: false,
      staffId: null,
      waiterSound: false,
    }),
    {
      name: "platterio:dispositivo",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);
