"use client";

import { Check, Flame, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { ALLERGEN_ICON } from "@/components/ui/allergen";
import { FilterChip } from "@/components/ui/chip";
import { SPICE_FILTER_LABEL } from "@/components/client/filter-sheet";
import { ALLERGEN_LABEL } from "@/lib/domain/allergens";
import { plural } from "@/lib/domain/format";
import { countRefinements, EMPTY_FILTERS, isFiltering, type MenuFilters } from "@/lib/domain/menu";
import { ALLERGENS, type Category, type SpiceLevel } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

const toggle = <T,>(list: readonly T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/**
 * Buscador y filtros para elegir platos rápido al tomar un pedido: texto (nombre o ingrediente),
 * categoría, "sin" alérgenos y picante. Es como lo ve el cliente, pero local a la hoja del pedido.
 */
export function DishFilterBar({
  categories,
  filters,
  onChange,
  resultCount,
}: {
  categories: readonly Category[];
  filters: MenuFilters;
  onChange: (next: MenuFilters) => void;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);
  const refinements = countRefinements(filters);
  const patch = (p: Partial<MenuFilters>) => onChange({ ...filters, ...p });

  return (
    <div className="bg-surface sticky -top-3 z-10 -mx-5 flex flex-col gap-2.5 px-5 pt-3 pb-3">
      <div className="relative">
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => patch({ query: e.target.value })}
          placeholder="Plato o ingrediente"
          aria-label="Buscar plato o ingrediente"
          enterKeyHint="search"
          className="border-line-strong bg-surface placeholder:text-muted/80 focus:border-accent focus:ring-accent/15 h-12 w-full rounded-xl border pr-11 pl-11 text-[15px] outline-none focus:ring-4 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => patch({ query: "" })}
            aria-label="Borrar búsqueda"
            className="text-muted hover:text-ink absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center"
          >
            <X className="size-4.5" aria-hidden />
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        <FilterChip
          selected={open || refinements > 0}
          aria-expanded={open}
          aria-controls="filtros-pedido"
          onClick={() => setOpen((o) => !o)}
        >
          <SlidersHorizontal aria-hidden />
          Filtros{refinements > 0 && <span className="tabular-nums">· {refinements}</span>}
        </FilterChip>
        {[{ id: null, name: "Todo" }, ...categories].map((c) => (
          <FilterChip
            key={c.id ?? "todo"}
            selected={filters.categoryId === c.id}
            onClick={() => patch({ categoryId: c.id })}
          >
            {c.name}
          </FilterChip>
        ))}
      </div>

      {open && (
        <div
          id="filtros-pedido"
          className="border-line bg-surface-2 flex flex-col gap-4 rounded-xl border p-3.5"
        >
          <section aria-labelledby="fp-alergenos">
            <h4 id="fp-alergenos" className="mb-2 text-[14px] font-semibold">
              Sin estos alérgenos
            </h4>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((a) => {
                const Icon = ALLERGEN_ICON[a];
                const on = filters.withoutAllergens.includes(a);
                return (
                  <FilterChip
                    key={a}
                    selected={on}
                    onClick={() => patch({ withoutAllergens: toggle(filters.withoutAllergens, a) })}
                  >
                    {on ? <Check aria-hidden /> : <Icon aria-hidden strokeWidth={1.8} />}
                    {ALLERGEN_LABEL[a]}
                  </FilterChip>
                );
              })}
            </div>
          </section>
          <section aria-labelledby="fp-picante">
            <h4 id="fp-picante" className="mb-2 text-[14px] font-semibold">
              Nivel de picante
            </h4>
            <div className="flex flex-wrap gap-2">
              {([0, 1, 2, 3] as SpiceLevel[]).map((level) => {
                const on = filters.spiceLevels.includes(level);
                return (
                  <FilterChip
                    key={level}
                    selected={on}
                    onClick={() =>
                      patch({ spiceLevels: toggle(filters.spiceLevels, level).sort() })
                    }
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
        </div>
      )}

      <div className="flex min-h-5 items-center justify-between gap-3" aria-live="polite">
        <p className={cn("text-muted text-[13px]", !isFiltering(filters) && "sr-only")}>
          {resultCount === 0 ? "Sin resultados" : plural(resultCount, "plato", "platos")}
        </p>
        {isFiltering(filters) && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-accent-strong min-h-8 text-[13px] font-semibold"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
