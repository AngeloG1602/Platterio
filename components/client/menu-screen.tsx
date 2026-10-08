"use client";

import { Search, SearchX, ShieldCheck, SlidersHorizontal, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MadeWithPlatterio, RestaurantMark } from "@/components/brand/logos";
import { DishCard } from "@/components/dish/dish-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DishCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  useCategories,
  useCurrentSlot,
  useDevice,
  useDishes,
  useDishRatingStats,
  useRestaurant,
} from "@/lib/data";
import { ALLERGEN_LABEL } from "@/lib/domain/allergens";
import { countRefinements, filterDishes, groupByCategory, isFiltering } from "@/lib/domain/menu";
import { plural } from "@/lib/domain/format";
import type { Allergen, Dish } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { CategoryTabs } from "./category-tabs";
import { ClientShell } from "./client-shell";
import { FilterSheet, SPICE_FILTER_LABEL } from "./filter-sheet";
import { menuFilterActions, useMenuFilters } from "./menu-filters-store";
import { Recommendations, RecommendationsSkeleton } from "./recommendations";
import { RestrictionsSheet } from "./restrictions-sheet";
import { useTableActivity } from "./table-activity";
import { TableBar } from "./table-bar";
import { TableGate, type TableContext } from "./table-gate";
import { localized, t } from "@/lib/i18n";

export function MenuScreen({ numero }: { numero: string }) {
  return (
    <ClientShell>
      <TableGate numero={numero} fallback={<MenuSkeleton />}>
        {(ctx) => <Menu ctx={ctx} />}
      </TableGate>
    </ClientShell>
  );
}

function Menu({ ctx }: { ctx: TableContext }) {
  useTableActivity(ctx);
  const restaurant = useRestaurant();
  const categories = useCategories();
  const dishes = useDishes();
  const stats = useDishRatingStats();
  const device = useDevice();
  const current = useCurrentSlot();
  const filters = useMenuFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [restrictionsOpen, setRestrictionsOpen] = useState(false);
  const [restrictionsKey, setRestrictionsKey] = useState(0);

  const restrictions = device.restrictions;
  const askFirstTime = !device.restrictionsAnswered;
  const results = useMemo(() => filterDishes(dishes, filters), [dishes, filters]);
  const filtering = isFiltering(filters);
  const refinements = countRefinements(filters);
  const showRecommendations = !filtering;

  const openRestrictions = () => {
    setRestrictionsKey((k) => k + 1);
    setRestrictionsOpen(true);
  };

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <RestaurantMark name={restaurant.name} className="text-[14px]" />
        <div className="flex items-center gap-1">
          <span className="bg-surface-2 text-ink-soft rounded-full px-3 py-1.5 text-[13px] font-semibold">
            {t("Mesa {n}", { n: ctx.table.number })} · {ctx.diner.alias}
          </span>
          <button
            type="button"
            onClick={openRestrictions}
            aria-label={
              restrictions.length
                ? t("Tus restricciones: {list}. Cambiar", {
                    list: restrictions.map((a) => t(ALLERGEN_LABEL[a])).join(", "),
                  })
                : t("Agregar restricciones alimentarias")
            }
            className="text-ink hover:bg-surface-2 relative flex size-11 items-center justify-center rounded-full"
          >
            <ShieldCheck className="size-5.5" strokeWidth={1.8} aria-hidden />
            {restrictions.length > 0 && (
              <span className="bg-accent-strong text-accent-ink absolute top-1.5 right-1.5 flex size-4.5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums">
                {restrictions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="px-4 pt-5">
        <p className="text-muted text-[13px] font-medium">
          {t("Hola, {name}", { name: ctx.diner.alias })}
          {current.slot && !current.upcoming ? ` · ${localized(current.slot)}` : ""}
        </p>
        <h1 className="font-display mt-0.5 text-[30px] leading-[1.1] font-semibold tracking-tight">
          {t("¿Qué se te antoja?")}
        </h1>
        <SearchRow refinements={refinements} onOpenFilters={() => setFiltersOpen(true)} />
        {restrictions.length > 0 && (
          <p className="text-muted mt-2.5 text-[13px]">
            {t("Te avisamos si un plato tiene")}{" "}
            <span className="text-ink-soft font-medium">
              {restrictions.map((a) => t(ALLERGEN_LABEL[a]).toLowerCase()).join(", ")}
            </span>
            .{" "}
            <button
              type="button"
              onClick={openRestrictions}
              className="text-accent-strong font-semibold underline-offset-2 hover:underline"
            >
              {t("Cambiar")}
            </button>
          </p>
        )}
      </div>

      {showRecommendations && <Recommendations base={ctx.base} restrictions={restrictions} />}

      <div className="mt-5">
        <CategoryTabs
          categories={categories}
          value={filters.categoryId}
          onChange={(id) => menuFilterActions.set({ categoryId: id })}
        />
        {refinements > 0 && <ActiveFilters />}
        <div id="lista-platos" role="tabpanel" aria-live="polite" className="px-4 pb-8">
          <DishResults
            dishes={dishes}
            results={results}
            filtering={filtering}
            base={ctx.base}
            restrictions={restrictions}
            stats={stats}
          />
        </div>
      </div>

      <MadeWithPlatterio className="mt-auto pb-28" />
      <TableBar ctx={ctx} />

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        categories={categories}
        restrictions={restrictions}
        resultCount={results.length}
      />
      <RestrictionsSheet
        key={restrictionsKey}
        open={askFirstTime || restrictionsOpen}
        onOpenChange={setRestrictionsOpen}
        initial={restrictions}
        firstTime={askFirstTime}
      />
    </>
  );
}

function SearchRow({
  refinements,
  onOpenFilters,
}: {
  refinements: number;
  onOpenFilters: () => void;
}) {
  const query = useMenuFilters((s) => s.query);
  return (
    <div className="mt-4 flex gap-2">
      <div className="relative flex-1">
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => menuFilterActions.set({ query: e.target.value })}
          placeholder={t("Plato o ingrediente")}
          aria-label={t("Buscar por nombre o ingrediente")}
          enterKeyHint="search"
          className="border-line-strong bg-surface placeholder:text-muted/80 focus:border-accent focus:ring-accent/15 h-12 w-full rounded-xl border pr-11 pl-11 text-[15px] outline-none focus:ring-4 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => menuFilterActions.set({ query: "" })}
            aria-label={t("Borrar búsqueda")}
            className="text-muted hover:text-ink absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center"
          >
            <X className="size-4.5" aria-hidden />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label={refinements ? t("Filtros ({n} activos)", { n: refinements }) : t("Filtros")}
        className={cn(
          "relative flex size-12 shrink-0 items-center justify-center rounded-xl border transition-colors",
          refinements
            ? "border-ink bg-ink text-bg"
            : "border-line-strong bg-surface text-ink hover:bg-surface-2",
        )}
      >
        <SlidersHorizontal className="size-5" aria-hidden />
        {refinements > 0 && (
          <span className="border-bg bg-accent-strong text-accent-ink absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 text-[11px] font-bold tabular-nums">
            {refinements}
          </span>
        )}
      </button>
    </div>
  );
}

function ActiveFilters() {
  const filters = useMenuFilters();
  const chips: Array<{ key: string; label: string; remove: () => void }> = [
    ...filters.withoutAllergens.map((a) => ({
      key: a,
      label: t("Sin {list}", { list: t(ALLERGEN_LABEL[a]).toLowerCase() }),
      remove: () => menuFilterActions.toggleAllergen(a),
    })),
    ...filters.spiceLevels.map((l) => ({
      key: `p${l}`,
      label: t(SPICE_FILTER_LABEL[l]),
      remove: () => menuFilterActions.toggleSpice(l),
    })),
  ];
  return (
    <div
      className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pt-3"
      aria-label={t("Filtros activos")}
    >
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          aria-label={t("Quitar filtro: {label}", { label: c.label })}
          className="bg-surface-2 text-ink-soft hover:text-ink inline-flex h-9 shrink-0 items-center gap-1 rounded-full pr-2 pl-3 text-[13px] font-medium"
        >
          {c.label}
          <X className="size-3.5" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={menuFilterActions.clearRefinements}
        className="text-accent-strong h-9 shrink-0 px-2 text-[13px] font-semibold"
      >
        {t("Limpiar")}
      </button>
    </div>
  );
}

function DishResults({
  dishes,
  results,
  filtering,
  base,
  restrictions,
  stats,
}: {
  dishes: Dish[];
  results: Dish[];
  filtering: boolean;
  base: string;
  restrictions: Allergen[];
  stats: ReturnType<typeof useDishRatingStats>;
}) {
  const categories = useCategories();
  const filters = useMenuFilters();
  const onlyCategory =
    filters.categoryId !== null && !filters.query.trim() && countRefinements(filters) === 0;

  if (results.length === 0) {
    const category = categories.find((c) => c.id === filters.categoryId);
    const categoryIsEmpty =
      onlyCategory && !dishes.some((d) => d.active && d.categoryId === filters.categoryId);
    if (categoryIsEmpty) {
      return (
        <EmptyState
          icon={UtensilsCrossed}
          title={t("{name} no tiene platos por ahora", {
            name: category ? localized(category) : t("Esta categoría"),
          })}
          description={t("Vuelve más tarde o mira el resto de la carta.")}
          action={
            <Button variant="secondary" onClick={() => menuFilterActions.set({ categoryId: null })}>
              {t("Ver toda la carta")}
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={SearchX}
        title={t("No hay platos que coincidan con estos filtros")}
        description={
          filters.query.trim() ? t("Buscaste “{q}”.", { q: filters.query.trim() }) : undefined
        }
        action={
          <Button variant="secondary" onClick={menuFilterActions.clearAll}>
            {t("Limpiar filtros")}
          </Button>
        }
      />
    );
  }

  const groups = groupByCategory(results, categories);
  return (
    <>
      {filtering && !onlyCategory && (
        <p className="text-muted pt-4 text-[13px] font-medium">
          {plural(results.length, "plato", "platos")}
        </p>
      )}
      {groups.map(({ category, dishes: list }) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`} className="pt-5">
          <h2
            id={`cat-${category.id}`}
            className="font-display flex items-baseline gap-2 text-[22px] font-semibold"
          >
            {localized(category)}
            <span className="text-muted font-sans text-[13px] font-medium tabular-nums">
              {list.length}
            </span>
          </h2>
          <ul className="divide-line divide-y">
            {list.map((dish) => {
              const s = stats.get(dish.id);
              return (
                <li key={dish.id}>
                  <Link
                    href={`${base}/plato/${dish.id}`}
                    className="hover:bg-surface-2/60 -mx-2 block rounded-xl px-2 transition-colors"
                  >
                    <DishCard
                      dish={dish}
                      restrictions={restrictions}
                      rating={{ average: s?.average ?? null, count: s?.count ?? 0 }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

function MenuSkeleton() {
  return (
    <div aria-busy aria-label={t("Cargando la carta")}>
      <div className="flex items-center justify-between px-4 pt-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
      <div className="px-4 pt-6">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-2 h-8 w-56" />
        <Skeleton className="mt-4 h-12 rounded-xl" />
      </div>
      <RecommendationsSkeleton />
      <div className="border-line mt-6 flex gap-4 border-b px-4 pb-3">
        {[48, 72, 60, 80].map((w) => (
          <Skeleton key={w} className="h-5" style={{ width: w }} />
        ))}
      </div>
      <div className="divide-line divide-y px-4">
        <DishCardSkeleton />
        <DishCardSkeleton />
        <DishCardSkeleton />
      </div>
    </div>
  );
}
