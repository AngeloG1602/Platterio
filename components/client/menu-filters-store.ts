"use client";

import { create } from "zustand";
import { EMPTY_FILTERS, type MenuFilters } from "@/lib/domain/menu";

/** Filtros del menú de esta pestaña. Se conservan al entrar a un plato y volver. */
export const useMenuFilters = create<MenuFilters>(() => EMPTY_FILTERS);

export const menuFilterActions = {
  set(patch: Partial<MenuFilters>) {
    useMenuFilters.setState(patch);
  },
  toggleAllergen(a: MenuFilters["withoutAllergens"][number]) {
    useMenuFilters.setState((s) => ({
      withoutAllergens: s.withoutAllergens.includes(a)
        ? s.withoutAllergens.filter((x) => x !== a)
        : [...s.withoutAllergens, a],
    }));
  },
  toggleSpice(level: MenuFilters["spiceLevels"][number]) {
    useMenuFilters.setState((s) => ({
      spiceLevels: s.spiceLevels.includes(level)
        ? s.spiceLevels.filter((x) => x !== level)
        : [...s.spiceLevels, level].sort(),
    }));
  },
  clearRefinements() {
    useMenuFilters.setState({ withoutAllergens: [], spiceLevels: [] });
  },
  clearAll() {
    useMenuFilters.setState(EMPTY_FILTERS);
  },
};
