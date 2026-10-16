"use client";

import { Download, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAnalyticsData,
  useCreditAccounts,
  useDishes,
  useHydrated,
  useNow,
  useTables,
  useWaiters,
} from "@/lib/data";
import { toCsv } from "@/lib/domain/cash";
import { formatDay, formatMoney, formatTime, plural } from "@/lib/domain/format";
import { STATUS_LABEL } from "@/lib/domain/orderStatus";
import {
  filterRecords,
  orderRecords,
  PAY_FILTER_LABEL,
  recordsCsvRows,
  summarizeRecords,
  validateHoursRange,
  WEEKDAY_LABEL,
  WEEKDAY_SHORT,
  workload,
  type HoursRange,
  type OrderFilter,
  type PayFilter,
  type WorkloadMetric,
} from "@/lib/domain/orderHistory";
import { ORDER_STATUSES } from "@/lib/domain/types";
import type { OrderStatus } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { PageHeader, Panel } from "./ui/page-header";
import { describePeriod, PeriodFilter, usePeriod } from "./ui/period-filter";
import { StatTile } from "./ui/stat-tile";

const PAGE = 100;
type When = "10" | "60" | "1440" | "dias" | "otro";
type View = "lista" | "carga";

function download(name: string, rows: (string | number | null)[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "a. m." : "p. m."}`;

/** Historial de pedidos con filtros por hora y día, y la carga de trabajo (pantalla del administrador). */
export function OrdersAdmin() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Cada pedido con su detalle: qué se pidió, quién lo atendió, cómo se pagó y en qué quedó la cuenta. Filtra por hora, día, mesa o lo que necesites."
      />
      <OrdersHistory />
    </div>
  );
}

/** El mismo historial, para que caja lo consulte sin entrar al panel. */
export function OrdersHistory() {
  const hydrated = useHydrated();
  return hydrated ? <Body /> : <Skeleton className="h-96 rounded-2xl" />;
}

function Body() {
  const { orders, sessions, payments } = useAnalyticsData();
  const tables = useTables();
  const waiters = useWaiters();
  const dishes = useDishes();
  const accounts = useCreditAccounts();
  const now = useNow(15_000);
  const period = usePeriod("hoy");

  const [view, setView] = useState<View>("lista");
  const [metric, setMetric] = useState<WorkloadMetric>("pedidos");
  const [when, setWhen] = useState<When>("dias");
  const [custom, setCustom] = useState("30");
  const [unit, setUnit] = useState<"min" | "h">("min");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [hours, setHours] = useState<HoursRange[]>([]);
  const [tableId, setTableId] = useState("");
  const [waiter, setWaiter] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [pay, setPay] = useState<PayFilter | "">("");
  const [text, setText] = useState("");
  const [shown, setShown] = useState(PAGE);

  const records = useMemo(
    () => orderRecords({ orders, sessions, payments, tables, waiters, dishes, accounts }),
    [orders, sessions, payments, tables, waiters, dishes, accounts],
  );

  const customMin =
    Math.max(1, Math.round(Number(custom.replace(/\D/g, "")) || 0)) * (unit === "h" ? 60 : 1);
  const recentMin = when === "dias" ? undefined : when === "otro" ? customMin : Number(when);
  const validHours = hours.filter((r) => validateHoursRange(r) === null);
  const hoursError = hours.map((r) => validateHoursRange(r)).find(Boolean) ?? null;

  const filter: OrderFilter = {
    text,
    ...(tableId ? { tableId } : {}),
    ...(waiter ? { waiter } : {}),
    ...(status ? { status } : {}),
    ...(pay ? { pay } : {}),
    time: {
      ...(recentMin !== undefined ? { recentMin } : { period: period.period }),
      weekdays,
      hours: validHours,
    },
  };
  const rows = useMemo(
    () => filterRecords(records, filter, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filter` se arma con estos valores
    [records, text, tableId, waiter, status, pay, recentMin, period.period, weekdays, hours, now],
  );
  const summary = summarizeRecords(rows);
  const load = useMemo(
    () => workload(records, period.period, metric),
    [records, period.period, metric],
  );
  const dirty =
    text ||
    tableId ||
    waiter ||
    status ||
    pay ||
    weekdays.length ||
    hours.length ||
    when !== "dias";

  function reset() {
    setText("");
    setTableId("");
    setWaiter("");
    setStatus("");
    setPay("");
    setWeekdays([]);
    setHours([]);
    setWhen("dias");
    setShown(PAGE);
  }
  const touch =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setShown(PAGE);
    };

  return (
    <>
      <Segmented
        label="Vista"
        value={view}
        onChange={setView}
        className="w-full sm:w-80"
        options={[
          { value: "lista", label: "Pedidos" },
          { value: "carga", label: "Carga de trabajo" },
        ]}
      />

      {view === "carga" ? (
        <WorkloadView load={load} metric={metric} setMetric={setMetric} period={period} />
      ) : (
        <>
          <Panel
            title="Filtros"
            action={
              dirty ? (
                <Button variant="ghost" size="sm" onClick={reset}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  label="Cuándo"
                  value={when}
                  onChange={touch(setWhen)}
                  className="w-full lg:w-auto lg:min-w-[560px]"
                  options={[
                    { value: "10", label: "Últimos 10 min" },
                    { value: "60", label: "Última hora" },
                    { value: "1440", label: "Últimas 24 h" },
                    { value: "dias", label: "Por días" },
                    { value: "otro", label: "Otro lapso" },
                  ]}
                />
                {when === "dias" && <PeriodFilter state={period} />}
                {when === "otro" && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium" htmlFor="lapso">
                      Últimos
                    </label>
                    <Input
                      id="lapso"
                      inputMode="numeric"
                      value={custom}
                      onChange={(e) => touch(setCustom)(e.target.value.replace(/\D/g, ""))}
                      className="w-24"
                    />
                    <Select
                      aria-label="Unidad del lapso"
                      value={unit}
                      onChange={(e) => touch(setUnit)(e.target.value as "min" | "h")}
                      className="w-32"
                    >
                      <option value="min">minutos</option>
                      <option value="h">horas</option>
                    </Select>
                  </div>
                )}
              </div>

              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="mb-1.5 text-sm font-medium">Días de la semana</legend>
                {WEEKDAY_SHORT.map((d, i) => {
                  const on = weekdays.includes(i);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      aria-label={WEEKDAY_LABEL[i]}
                      onClick={() =>
                        touch(setWeekdays)(on ? weekdays.filter((x) => x !== i) : [...weekdays, i])
                      }
                      className={cn(
                        "h-10 min-w-12 rounded-lg border px-3 text-sm font-semibold transition-colors",
                        on
                          ? "bg-ink text-bg border-ink"
                          : "border-line-strong bg-surface text-ink-soft hover:bg-surface-2",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
                <span className="text-muted text-sm">
                  {weekdays.length === 0 ? "Todos los días" : ""}
                </span>
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm font-medium">Horas del día</legend>
                {hours.length === 0 && <p className="text-muted text-sm">Todo el día.</p>}
                {hours.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <label className="text-sm" htmlFor={`desde-h-${i}`}>
                      Desde
                    </label>
                    <Input
                      id={`desde-h-${i}`}
                      type="time"
                      value={r.from}
                      onChange={(e) =>
                        touch(setHours)(
                          hours.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)),
                        )
                      }
                      className="w-32"
                    />
                    <label className="text-sm" htmlFor={`hasta-h-${i}`}>
                      hasta
                    </label>
                    <Input
                      id={`hasta-h-${i}`}
                      type="time"
                      value={r.to}
                      onChange={(e) =>
                        touch(setHours)(
                          hours.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)),
                        )
                      }
                      className="w-32"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => touch(setHours)(hours.filter((_, j) => j !== i))}
                    >
                      <X aria-hidden /> Quitar<span className="sr-only"> la franja {i + 1}</span>
                    </Button>
                  </div>
                ))}
                {hoursError && (
                  <p role="alert" className="text-danger-ink text-sm">
                    {hoursError}
                  </p>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => touch(setHours)([...hours, { from: "14:00", to: "15:00" }])}
                >
                  <Plus aria-hidden /> Agregar franja
                </Button>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Mesa
                  <Select value={tableId} onChange={(e) => touch(setTableId)(e.target.value)}>
                    <option value="">Todas</option>
                    <option value="domicilio">Domicilios y recoger</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Mesa {t.number}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Mesero
                  <Select value={waiter} onChange={(e) => touch(setWaiter)(e.target.value)}>
                    <option value="">Todos</option>
                    {waiters.map((w) => (
                      <option key={w.id}>{w.name}</option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Estado
                  <Select
                    value={status}
                    onChange={(e) => touch(setStatus)(e.target.value as OrderStatus | "")}
                  >
                    <option value="">Todos</option>
                    {ORDER_STATUSES.filter((s) => s !== "confirmado").map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Cuenta
                  <Select
                    value={pay}
                    onChange={(e) => touch(setPay)(e.target.value as PayFilter | "")}
                  >
                    <option value="">Todas</option>
                    {Object.entries(PAY_FILTER_LABEL).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Buscar
                  <Input
                    value={text}
                    placeholder="Pedido, plato, persona…"
                    onChange={(e) => touch(setText)(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </Panel>

          <p className="text-muted -mt-2 text-sm first-letter:uppercase">
            {recentMin !== undefined
              ? `Últimos ${recentMin >= 60 && recentMin % 60 === 0 ? plural(recentMin / 60, "hora", "horas") : plural(recentMin, "minuto", "minutos")}`
              : describePeriod(period.period)}
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Pedidos" value={summary.orders} note="rondas con estos filtros" />
            <StatTile
              label="Vendido"
              value={formatMoney(summary.soldTotal)}
              note={plural(summary.sold, "ronda entregada", "rondas entregadas")}
            />
            <StatTile label="En curso" value={summary.inProgress} note="sin entregar todavía" />
            <StatTile label="Rechazados" value={summary.rejected} />
          </div>

          <Panel
            title="Pedidos"
            description={`${plural(rows.length, "pedido", "pedidos")} con estos filtros, del más reciente al más antiguo.`}
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={rows.length === 0}
                onClick={() => download("pedidos.csv", recordsCsvRows(rows))}
              >
                <Download aria-hidden /> CSV<span className="sr-only"> de los pedidos</span>
              </Button>
            }
          >
            {rows.length === 0 ? (
              <p className="text-muted text-[15px]">No hay pedidos con estos filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[15px]">
                  <caption className="sr-only">Pedidos</caption>
                  <thead className="text-muted text-sm">
                    <tr>
                      {["Cuándo", "Pedido", "Mesero", "Platos", "Total", "Estado", "Cuenta"].map(
                        (h) => (
                          <th
                            key={h}
                            scope="col"
                            className={cn("py-2 pr-4 font-medium", h === "Total" && "text-right")}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {rows.slice(0, shown).map((r) => (
                      <tr key={r.order.id} className="align-top">
                        <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                          {formatDay(new Date(r.order.createdAt))}
                          <span className="text-muted">
                            {" "}
                            · {formatTime(new Date(r.order.createdAt))}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                          {r.number}
                          <span className="text-muted block text-sm font-normal">{r.place}</span>
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">{r.waiter}</td>
                        <td className="text-ink-soft py-2.5 pr-4">{r.itemsText}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {formatMoney(r.total)}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">{r.statusLabel}</td>
                        <td className="py-2.5">
                          {r.tags.length === 0 ? (
                            <span className="text-muted">—</span>
                          ) : (
                            r.tags.join(" · ")
                          )}
                          {(r.methods.length > 0 || r.people.length > 0) && (
                            <span className="text-muted block text-sm">
                              {[...r.methods.map((m) => PAY_FILTER_LABEL[m]), ...r.people].join(
                                ", ",
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > shown && (
                  <div className="mt-4 flex justify-center">
                    <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                      Mostrar más ({rows.length - shown} restantes)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

function WorkloadView({
  load,
  metric,
  setMetric,
  period,
}: {
  load: ReturnType<typeof workload>;
  metric: WorkloadMetric;
  setMetric: (m: WorkloadMetric) => void;
  period: ReturnType<typeof usePeriod>;
}) {
  const fmt = (v: number) => (metric === "ventas" ? formatMoney(v) : String(v));
  const active = load.byHour.map((v, h) => (v > 0 ? h : -1)).filter((h) => h >= 0);
  const from = active.length ? Math.min(...active) : 8;
  const to = active.length ? Math.max(...active) : 22;
  const hourRange = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const busiestDay = load.byWeekday.indexOf(Math.max(...load.byWeekday));
  const busiestHour = load.byHour.indexOf(Math.max(...load.byHour));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Qué medir"
          value={metric}
          onChange={setMetric}
          className="w-full sm:w-72"
          options={[
            { value: "pedidos", label: "Pedidos" },
            { value: "ventas", label: "Ventas" },
          ]}
        />
        <PeriodFilter state={period} />
      </div>
      <p className="text-muted -mt-2 text-sm first-letter:uppercase">
        {describePeriod(period.period)}
      </p>

      {load.total === 0 ? (
        <Panel title="Carga de trabajo">
          <p className="text-muted text-[15px]">No hay pedidos en este periodo.</p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Día más movido"
              value={WEEKDAY_LABEL[busiestDay]!.replace(/^./, (c) => c.toUpperCase())}
              note={fmt(load.byWeekday[busiestDay]!)}
            />
            <StatTile
              label="Hora más movida"
              value={hourLabel(busiestHour)}
              note={fmt(load.byHour[busiestHour]!)}
            />
            <StatTile label="Total del periodo" value={fmt(load.total)} />
            <StatTile
              label="Franja de más trabajo"
              value={`${WEEKDAY_SHORT[load.peaks[0]!.weekday]} ${hourLabel(load.peaks[0]!.hour)}`}
              note={fmt(load.peaks[0]!.value)}
            />
          </div>

          <Panel
            title="Carga por día y hora"
            description="Más oscuro es más trabajo. Sirve para cuadrar los turnos del personal."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-sm">
                <caption className="sr-only">
                  {metric === "ventas" ? "Ventas" : "Pedidos"} por día de la semana y hora
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-14" />
                    {hourRange.map((h) => (
                      <th key={h} scope="col" className="text-muted px-0.5 text-xs font-medium">
                        {hourLabel(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAY_SHORT.map((d, wd) => (
                    <tr key={d}>
                      <th scope="row" className="text-ink-soft pr-2 text-left font-medium">
                        {d}
                      </th>
                      {hourRange.map((h) => {
                        const v = load.cells[wd]![h]!;
                        const pct = load.max > 0 ? Math.round((v / load.max) * 55) : 0;
                        return (
                          <td
                            key={h}
                            title={`${WEEKDAY_LABEL[wd]} ${hourLabel(h)}: ${fmt(v)}`}
                            className="text-ink h-9 rounded-md tabular-nums"
                            style={{
                              background:
                                v === 0
                                  ? "var(--surface-2)"
                                  : `color-mix(in oklab, var(--accent) ${Math.max(pct, 8)}%, var(--surface))`,
                            }}
                          >
                            {metric === "ventas"
                              ? v === 0
                                ? ""
                                : `${Math.round(v / 1000)}k`
                              : v === 0
                                ? ""
                                : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Franjas de más trabajo">
            <ol className="divide-line divide-y text-[15px]">
              {load.peaks.map((p) => (
                <li key={`${p.weekday}-${p.hour}`} className="flex items-center gap-3 py-2.5">
                  <span className="flex-1 font-medium">
                    {WEEKDAY_LABEL[p.weekday]!.replace(/^./, (c) => c.toUpperCase())},{" "}
                    {hourLabel(p.hour)}
                  </span>
                  <span className="tabular-nums">{fmt(p.value)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </>
      )}
    </>
  );
}
