"use client";

import { Check, Flame } from "lucide-react";
import { ALLERGEN_ICON } from "@/components/ui/allergen";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { ALLERGEN_LABEL } from "@/lib/domain/allergens";
import { plural } from "@/lib/domain/format";
import { ALLERGENS, type Allergen, type Category, type SpiceLevel } from "@/lib/domain/types";
import { menuFilterActions, useMenuFilters } from "./menu-filters-store";

export const SPICE_FILTER_LABEL: Record<SpiceLevel, string> = {
  0: "Sin picante",
  1: "Suave",
  2: "Medio",
  3: "Muy picante",
};

/** Filtros combinables: categoría, "sin" alérgenos y nivel de picante (US-13). */
export function FilterSheet({
  open,
  onOpenChange,
  categories,
  restrictions,
  resultCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  restrictions: Allergen[];
  resultCount: number;
}) {
  const filters = useMenuFilters();
  const usingMine =
    restrictions.length > 0 && restrictions.every((a) => filters.withoutAllergens.includes(a));

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filtros"
      footer={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              menuFilterActions.clearRefinements();
              menuFilterActions.set({ categoryId: null });
            }}
          >
            Limpiar
          </Button>
          <Button
            className="flex-[1.6]"
            onClick={() => onOpenChange(false)}
            disabled={resultCount === 0}
          >
            {resultCount === 0 ? "Sin resultados" : `Ver ${plural(resultCount, "plato", "platos")}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-7 pb-3">
        <section aria-labelledby="f-alergenos">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h3 id="f-alergenos" className="text-[15px] font-semibold">
              Sin estos alérgenos
            </h3>
            {restrictions.length > 0 && !usingMine && (
              <button
                type="button"
                className="text-accent-strong min-h-11 text-sm font-semibold"
                onClick={() =>
                  menuFilterActions.set({
                    withoutAllergens: [...new Set([...filters.withoutAllergens, ...restrictions])],
                  })
                }
              >
                Usar mis restricciones
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => {
              const Icon = ALLERGEN_ICON[a];
              const on = filters.withoutAllergens.includes(a);
              return (
                <FilterChip
                  key={a}
                  selected={on}
                  onClick={() => menuFilterActions.toggleAllergen(a)}
                >
                  {on ? <Check aria-hidden /> : <Icon aria-hidden strokeWidth={1.8} />}
                  {ALLERGEN_LABEL[a]}
                </FilterChip>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="f-picante">
          <h3 id="f-picante" className="mb-2.5 text-[15px] font-semibold">
            Nivel de picante
          </h3>
          <div className="flex flex-wrap gap-2">
            {([0, 1, 2, 3] as SpiceLevel[]).map((level) => {
              const on = filters.spiceLevels.includes(level);
              return (
                <FilterChip
                  key={level}
                  selected={on}
                  onClick={() => menuFilterActions.toggleSpice(level)}
                >
                  {level > 0 && (
                    <span className="inline-flex -space-x-1.5" aria-hidden>
                      {Array.from({ length: level }, (_, i) => (
                        <Flame key={i} className={on ? "" : "text-accent-strong"} />
                      ))}
                    </span>
                  )}
                  {SPICE_FILTER_LABEL[level]}
                </FilterChip>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="f-categoria">
          <h3 id="f-categoria" className="mb-2.5 text-[15px] font-semibold">
            Categoría
          </h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="f-categoria">
            {[{ id: null, name: "Todas" }, ...categories].map((c) => (
              <FilterChip
                key={c.id ?? "todas"}
                role="radio"
                aria-pressed={undefined}
                aria-checked={filters.categoryId === c.id}
                selected={filters.categoryId === c.id}
                onClick={() => menuFilterActions.set({ categoryId: c.id })}
              >
                {c.name}
              </FilterChip>
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  );
}
