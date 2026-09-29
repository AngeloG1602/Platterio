"use client";

import { ChartNoAxesColumn, MessageSquareText, Star, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { DishImage } from "@/components/dish/dish-image";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRating, Stars } from "@/components/ui/stars";
import { useAnalyticsData, useDishes, useHydrated, useTables, useWaiters } from "@/lib/data";
import {
  dishRanking,
  ratingSummary,
  recentComments,
  serviceByWaiter,
} from "@/lib/domain/analytics";
import { formatRelative, plural } from "@/lib/domain/format";
import { BarList } from "./ui/charts";
import { PageHeader, Panel } from "./ui/page-header";
import { describePeriod, PeriodFilter, usePeriod } from "./ui/period-filter";
import { StatTile } from "./ui/stat-tile";

/** Calificaciones y reseñas (US-32): platos y servicio por separado, ranking y comentarios. */
export function RatingsAdmin() {
  const hydrated = useHydrated();
  const period = usePeriod("7d");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Calificaciones"
        description="La comida y la atención se califican por separado para saber qué corregir."
        actions={<PeriodFilter state={period} />}
      />
      {hydrated ? <Body state={period} /> : <Skeleton className="h-96 rounded-2xl" />}
    </div>
  );
}

function Body({ state }: { state: ReturnType<typeof usePeriod> }) {
  const { period, now } = state;
  const { orders, dishRatings, serviceRatings } = useAnalyticsData();
  const dishes = useDishes();
  const waiters = useWaiters();
  const tables = useTables();
  const [onlyLow, setOnlyLow] = useState(false);

  const summary = useMemo(
    () => ratingSummary(dishRatings, serviceRatings, period),
    [dishRatings, serviceRatings, period],
  );
  const ranking = useMemo(
    () => dishRanking(dishRatings, dishes, period),
    [dishRatings, dishes, period],
  );
  const waitersRows = useMemo(
    () => serviceByWaiter(serviceRatings, waiters, period),
    [serviceRatings, waiters, period],
  );
  const comments = useMemo(
    () => recentComments(dishRatings, period).filter((c) => !onlyLow || c.stars <= 2),
    [dishRatings, period, onlyLow],
  );
  const tableOf = (orderId: string) =>
    tables.find((t) => t.id === orders.find((o) => o.id === orderId)?.tableId)?.number;

  if (summary.dishCount === 0 && summary.serviceCount === 0) {
    return (
      <div className="border-line bg-surface rounded-2xl border">
        <EmptyState
          icon={ChartNoAxesColumn}
          title="No hay datos para este periodo"
          description={`Sin calificaciones ${describePeriod(period)}. Prueba con un rango más amplio.`}
        />
      </div>
    );
  }

  return (
    <>
      <p className="text-muted -mt-2 text-sm first-letter:uppercase">{describePeriod(period)}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Promedio de platos"
          icon={Utensils}
          value={summary.dishAverage === null ? "—" : formatRating(summary.dishAverage)}
          note={plural(summary.dishCount, "calificación", "calificaciones")}
        />
        <StatTile
          label="Promedio del servicio"
          icon={Star}
          value={summary.serviceAverage === null ? "—" : formatRating(summary.serviceAverage)}
          note={plural(summary.serviceCount, "visita calificada", "visitas calificadas")}
        />
        {waitersRows.map((w) => (
          <StatTile
            key={w.waiter.id}
            label={`Servicio de ${w.waiter.name}`}
            value={w.average === null ? "—" : formatRating(w.average)}
            note={plural(w.count, "calificación", "calificaciones")}
            tone={w.average !== null && w.average < 3 ? "danger" : "neutral"}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title="Ranking de platos"
          description="Ordenado con promedio bayesiano: un plato con dos reseñas de 5 no le gana a uno con cien de 4,6."
        >
          <BarList
            rows={ranking.map((r) => ({
              key: r.dish.id,
              label: (
                <span className="flex items-center gap-2">
                  <DishImage
                    src={r.dish.photos[0]}
                    name={r.dish.name}
                    sizes="28px"
                    className="size-7 shrink-0"
                    rounded="rounded-md"
                    initialClassName="text-xs"
                  />
                  <span className="truncate">{r.dish.name}</span>
                </span>
              ),
              value: r.average,
              display: `${formatRating(r.average)} · ${r.count}`,
            }))}
            empty={
              <p className="text-muted text-[15px]">
                Sin calificaciones de platos en este periodo.
              </p>
            }
          />
        </Panel>

        <Panel
          title="Comentarios"
          description="Del más reciente al más antiguo."
          action={
            <FilterChip
              selected={onlyLow}
              onClick={() => setOnlyLow((v) => !v)}
              className="h-9 text-[13px]"
            >
              Solo 1 y 2 estrellas
            </FilterChip>
          }
        >
          {comments.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title={onlyLow ? "Sin reseñas negativas" : "Sin comentarios"}
              description="En este periodo nadie dejó comentarios con ese filtro."
            />
          ) : (
            <ul
              className="divide-line -my-1 max-h-[640px] divide-y overflow-y-auto pr-1"
              tabIndex={0}
              aria-label="Comentarios de los clientes"
            >
              {comments.map((c) => {
                const dish = dishes.find((d) => d.id === c.dishId);
                const mesa = tableOf(c.orderId);
                return (
                  <li key={c.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{dish?.name ?? "Plato"}</p>
                      <Stars value={c.stars} />
                    </div>
                    <p className="text-ink-soft mt-1 text-[15px] leading-relaxed">“{c.comment}”</p>
                    <p className="text-muted mt-1 text-xs">
                      {mesa ? `Mesa ${mesa} · ` : ""}
                      {formatRelative(new Date(c.createdAt), new Date(now))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
