"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang } from "@/lib/i18n";

/** Idioma que eligió el cliente en este navegador (el personal siempre ve español). */
export const useLangStore = create<{ lang: Lang | null }>()(
  persist(() => ({ lang: null as Lang | null }), {
    name: "platterio:idioma",
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  }),
);

export const setPreferredLang = (lang: Lang) => useLangStore.setState({ lang });
