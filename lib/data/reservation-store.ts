"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Lo que el cliente guarda en su celular al reservar: sus datos para no escribirlos otra vez y las
 * reservas que hizo (para volver a ver cómo van y poder cancelarlas).
 */
export interface ReservationClientState {
  profile: { name?: string; phone?: string };
  ids: string[];
}

export const useReservationClient = create<ReservationClientState>()(
  persist((): ReservationClientState => ({ profile: {}, ids: [] }), {
    name: "platterio:reservas",
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
    version: 1,
  }),
);
