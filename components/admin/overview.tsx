"use client";

import { Banknote, ReceiptText, Star, Users, Utensils } from "lucide-react";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRating } from "@/components/ui/stars";
import { useAnalyticsData, useHydrated, useNow } from "@/lib/data";
import { ordersByHour, periodRange, ratingSummary, salesSummary } from "@/lib/domain/analytics";
import { formatMoney, formatDay, plural } from "@/lib/domain/format";
import { AlertsPanel } from "./alerts-panel";
import { ColumnChart } from "./ui/charts";
import { PageHeader, Panel } from "./ui/page-header";
import { StatTile } from "./ui/stat-tile";

/** Resumen (US-32, US-33): ventas del día, pedidos, ticket promedio, calificaciones y alertas. */
export function AdminOverview() {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow={formatDay(new Date(now))}
        title="Resumen"
        description="Cómo va el día en el restaurante, en vivo."
      />
      {hydrated ? <OverviewBody now={now} /> : <Skeleton className="h-96 rounded-2xl" />}
    </div>
  );
}

function OverviewBody({ now }: { now: number }) {
  const { orders, dishRatings, serviceRatings } = useAnalyticsData();
  const minute = Math.floor(now / 60_000) * 60_000;
  const today = useMemo(() => salesSummary(orders, periodRange("hoy", minute)), [orders, minute]);
  const week = useMemo(
    () => ratingSummary(dishRatings, serviceRatings, periodRange("7d", minute)),
    [dishRatings, serviceRatings, minute],
  );
  const hours = useMemo(() => ordersByHour(orders, minute), [orders, minute]);
  const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "a. m." : "p. m."}`;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Ventas del día"
          icon={Banknote}
          value={formatMoney(today.sales)}
          note={`${plural(today.delivered, "ronda entregada", "rondas entregadas")}`}
        />
        <StatTile
          label="Pedidos del día"
          icon={ReceiptText}
          value={today.placed}
          note="Rondas enviadas por las mesas"
        />
        <StatTile
          label="Ticket promedio"
          icon={Users}
          value={today.avgTicket === null ? "—" : formatMoney(today.avgTicket)}
          note={`${plural(today.visits, "visita", "visitas")} con entrega`}
        />
        <StatTile
          label="Platos (7 días)"
          icon={Utensils}
          value={week.dishAverage === null ? "—" : <RatingValue value={week.dishAverage} />}
          note={plural(week.dishCount, "calificación", "calificaciones")}
        />
        <StatTile
          label="Servicio (7 días)"
          icon={Star}
          value={week.serviceAverage === null ? "—" : <RatingValue value={week.serviceAverage} />}
          note={plural(week.serviceCount, "calificación", "calificaciones")}
        />
      </div>

      <AlertsPanel />

      <Panel
        title="Pedidos por hora"
        description="Rondas enviadas hoy, comparadas con el promedio de los 13 días anteriores."
      >
        <ColumnChart
          caption="Pedidos por hora de hoy frente al promedio"
          valueLabel="Hoy"
          referenceLabel="Promedio 13 días"
          data={hours.map((h) => ({
            label: hourLabel(h.hour),
            value: h.today,
            reference: h.average,
          }))}
          format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","))}
        />
      </Panel>
    </>
  );
}

function RatingValue({ value }: { value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      {formatRating(value)}
      <span className="text-muted text-base font-medium">/ 5</span>
    </span>
  );
}
