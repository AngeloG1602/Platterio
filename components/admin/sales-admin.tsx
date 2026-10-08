"use client";

import { Banknote, ChartNoAxesColumn, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsData, useDishes, useHydrated, useTimeSlots } from "@/lib/data";
import { ALLERGEN_LABEL } from "@/lib/domain/allergens";
import {
  restrictionStats,
  salesByDay,
  salesSummary,
  topDishesBySlot,
} from "@/lib/domain/analytics";
import { formatMoney, formatShortDay, plural } from "@/lib/domain/format";
import { BarList, ColumnChart } from "./ui/charts";
import { PageHeader, Panel } from "./ui/page-header";
import { describePeriod, PeriodFilter, usePeriod } from "./ui/period-filter";
import { StatTile } from "./ui/stat-tile";

const compactCOP = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1).replace(".", ",")} M`
    : v >= 1000
      ? `$${Math.round(v / 1000)} mil`
      : formatMoney(v);

/** Ventas y preferencias (US-33). Las ventas salen de los pedidos entregados (regla 12). */
export function SalesAdmin() {
  const hydrated = useHydrated();
  const period = usePeriod("7d");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Ventas y preferencias"
        description="Lo vendido se calcula con los pedidos entregados y sus precios; el mockup no procesa pagos."
        actions={<PeriodFilter state={period} />}
      />
      {hydrated ? <Body state={period} /> : <Skeleton className="h-96 rounded-2xl" />}
    </div>
  );
}

function Body({ state }: { state: ReturnType<typeof usePeriod> }) {
  const { period } = state;
  const { orders, sessions } = useAnalyticsData();
  const dishes = useDishes();
  const slots = useTimeSlots();
  const [slotId, setSlotId] = useState(slots[1]?.id ?? slots[0]?.id ?? "");

  const summary = useMemo(() => salesSummary(orders, period), [orders, period]);
  const days = useMemo(() => salesByDay(orders, period), [orders, period]);
  const top = useMemo(
    () => topDishesBySlot(orders, dishes, slots, period),
    [orders, dishes, slots, period],
  );
  const restrictions = useMemo(() => restrictionStats(sessions, period), [sessions, period]);

  if (summary.delivered === 0 && summary.placed === 0) {
    return (
      <div className="border-line bg-surface rounded-2xl border">
        <EmptyState
          icon={ChartNoAxesColumn}
          title="No hay datos para este periodo"
          description={`No hubo pedidos ${describePeriod(period)}.`}
        />
      </div>
    );
  }

  return (
    <>
      <p className="text-muted -mt-2 text-sm first-letter:uppercase">{describePeriod(period)}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total vendido" icon={Banknote} value={formatMoney(summary.sales)} />
        <StatTile
          label="Pedidos entregados"
          icon={ReceiptText}
          value={summary.delivered}
          note={`${summary.placed} enviados por las mesas`}
        />
        <StatTile
          label="Ticket promedio"
          icon={Users}
          value={summary.avgTicket === null ? "—" : formatMoney(summary.avgTicket)}
          note={`${plural(summary.visits, "visita", "visitas")}`}
        />
        <StatTile
          label="Con restricciones"
          icon={ShieldCheck}
          value={
            restrictions.diners
              ? `${Math.round((restrictions.withRestrictions / restrictions.diners) * 100)} %`
              : "—"
          }
          note={`${restrictions.withRestrictions} de ${plural(restrictions.diners, "comensal", "comensales")}`}
        />
      </div>

      {days.length > 1 && (
        <Panel title="Ventas por día" description="Suma de las rondas entregadas cada día.">
          <ColumnChart
            caption="Ventas por día"
            valueLabel="Ventas"
            data={days.map((d) => ({ label: formatShortDay(new Date(d.date)), value: d.sales }))}
            format={compactCOP}
          />
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel
          title="Platos más pedidos por franja"
          description="Unidades en rondas entregadas, según la hora del pedido."
        >
          <Segmented
            label="Franja"
            value={slotId}
            onChange={setSlotId}
            options={slots.map((s) => ({ value: s.id, label: s.name }))}
          />
          <div className="mt-4">
            <BarList
              rows={(top[slotId] ?? []).map((x) => ({
                key: x.dish.id,
                label: x.dish.name,
                value: x.units,
                display: plural(x.units, "unidad", "unidades"),
              }))}
              empty={
                <p className="text-muted text-[15px]">
                  No hay pedidos en esta franja durante el periodo.
                </p>
              }
            />
          </div>
        </Panel>
        <Panel
          title="Restricciones más registradas"
          description="Agregadas por alérgeno, sin datos personales."
        >
          <BarList
            rows={restrictions.byAllergen.map((r) => ({
              key: r.allergen,
              label: ALLERGEN_LABEL[r.allergen],
              value: r.diners,
              display: plural(r.diners, "comensal", "comensales"),
            }))}
            empty={
              <p className="text-muted text-[15px]">
                Nadie registró restricciones en este periodo.
              </p>
            }
          />
        </Panel>
      </div>
    </>
  );
}
