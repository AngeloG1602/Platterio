"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CheckoutInput, DeliveryCartLine } from "@/lib/domain/delivery";

/**
 * Lo que el cliente de domicilios guarda en su celular: el carrito, sus datos para no
 * escribirlos otra vez y los pedidos que hizo (para volver a ver cómo van). Va aparte del
 * estado del negocio: es del cliente y se queda en su navegador.
 */
export interface DeliveryClientState {
  cart: DeliveryCartLine[];
  profile: Partial<
    Pick<CheckoutInput, "name" | "phone" | "address" | "reference" | "zoneId" | "payWith">
  >;
  orderIds: string[];
}

export const useDeliveryClient = create<DeliveryClientState>()(
  persist((): DeliveryClientState => ({ cart: [], profile: {}, orderIds: [] }), {
    name: "platterio:domicilio",
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
    version: 1,
  }),
);
