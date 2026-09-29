"use client";

import { Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRestaurant } from "@/lib/data";
import { cn } from "@/lib/cn";

/*
 * Gráficas del panel (guía de visualización): una serie → un color (el acento del
 * restaurante), barras de máximo 24 px con extremo redondeado, retícula de línea fina, tooltip
 * al pasar el cursor y una vista de tabla. El texto nunca va en el color de la serie.
 */

const MUTED = "#716A64";
const GRID = "#EEE9E1";

export interface ChartPoint {
  label: string;
  value: number;
  /** Serie de referencia opcional (línea). */
  reference?: number;
}

export function ColumnChart({
  data,
  valueLabel,
  referenceLabel,
  format = (v) => String(v),
  height = 260,
  caption,
}: {
  data: ChartPoint[];
  valueLabel: string;
  referenceLabel?: string;
  format?: (value: number) => string;
  height?: number;
  caption: string;
}) {
  const { accentColor } = useRestaurant();
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  const withReference = Boolean(referenceLabel);

  return (
    <figure aria-labelledby={id}>
      <figcaption id={id} className="sr-only">
        {caption}
      </figcaption>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {withReference ? (
          <ul className="text-ink-soft flex flex-wrap gap-4 text-[13px]" aria-label="Leyenda">
            <li className="flex items-center gap-1.5">
              <span
                className="h-3 w-2.5 rounded-t-sm"
                style={{ background: accentColor }}
                aria-hidden
              />
              {valueLabel}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: MUTED }} aria-hidden />
              {referenceLabel}
            </li>
          </ul>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="text-muted hover:bg-surface-2 hover:text-ink inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium"
        >
          <Table2 className="size-4" aria-hidden /> {asTable ? "Ver gráfica" : "Ver tabla"}
        </button>
      </div>
      {asTable ? (
        <DataTable
          head={["", valueLabel, ...(withReference ? [referenceLabel!] : [])]}
          rows={data.map((d) => [
            d.label,
            format(d.value),
            ...(withReference ? [format(d.reference ?? 0)] : []),
          ])}
        />
      ) : (
        <div style={{ height }} aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: GRID }}
                tick={{ fill: MUTED, fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: MUTED, fontSize: 12 }}
                tickFormatter={format}
                width={64}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(28,25,23,0.04)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="border-line bg-surface shadow-float rounded-lg border px-3 py-2 text-[13px]">
                      <p className="text-ink font-semibold">{label}</p>
                      {payload.map((p) => (
                        <p
                          key={String(p.dataKey)}
                          className="text-ink-soft flex items-center gap-1.5"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ background: p.dataKey === "value" ? accentColor : MUTED }}
                            aria-hidden
                          />
                          {p.dataKey === "value" ? valueLabel : referenceLabel}:{" "}
                          <span className="text-ink font-semibold tabular-nums">
                            {format(Number(p.value))}
                          </span>
                        </p>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Bar
                dataKey="value"
                fill={accentColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
              {withReference && (
                <Line
                  dataKey="reference"
                  type="monotone"
                  stroke={MUTED}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}

/** Barras horizontales en HTML: etiqueta, barra delgada con extremo redondeado y valor al final. */
export function BarList({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: ReactNode; value: number; display: string; hint?: ReactNode }>;
  empty?: ReactNode;
}) {
  const { accentColor } = useRestaurant();
  if (rows.length === 0) return <>{empty}</>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="text-ink min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{r.display}</span>
          </div>
          <div className="bg-surface-2 mt-1.5 h-2 w-full rounded-full" aria-hidden>
            <div
              className="h-2 rounded-l-sm rounded-r-full"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: accentColor }}
            />
          </div>
          {r.hint && <p className="text-muted mt-1 text-xs">{r.hint}</p>}
        </li>
      ))}
    </ul>
  );
}

export function DataTable({
  head,
  rows,
  className,
}: {
  head: string[];
  rows: ReactNode[][];
  className?: string;
}) {
  return (
    <div className={cn("border-line relative overflow-x-auto rounded-xl border", className)}>
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-muted text-xs uppercase">
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                scope="col"
                className={cn("px-3 py-2 font-semibold tracking-wide", i > 0 && "text-right")}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={cn("px-3 py-2", j > 0 && "text-right tabular-nums")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
