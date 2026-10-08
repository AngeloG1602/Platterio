"use client";

import { Banknote, Download, ReceiptText, TriangleAlert, Pencil } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllShifts, useAnalyticsData, useHydrated, useTables, useWaiters } from "@/lib/data";
import { inPeriod, salesSummary, type Period } from "@/lib/domain/analytics";
import {
  changeRows,
  METHOD_LABEL,
  PAYMENT_METHODS,
  paymentsByMethod,
  salesByWaiter,
  toCsv,
  unpaidSessions,
} from "@/lib/domain/cash";
import { deliveryStats } from "@/lib/domain/delivery";
import { formatMoney, formatDay, formatTime, plural } from "@/lib/domain/format";
import { BarList } from "./ui/charts";
import { PageHeader, Panel } from "./ui/page-header";
import { describePeriod, PeriodFilter, usePeriod } from "./ui/period-filter";
import { StatTile } from "./ui/stat-tile";

const KIND_LABEL: Record<string, string> = {
  agregar: "Agregó",
  quitar: "Quitó",
  cantidad: "Cantidad",
  variante: "Opción",
  anular: "Anuló ronda",
};

function download(name: string, rows: (string | number | null)[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = (iso: string) => `${formatDay(new Date(iso))} ${formatTime(new Date(iso))}`;

function CsvButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>
      <Download aria-hidden /> CSV<span className="sr-only"> de {label}</span>
    </Button>
  );
}

/** Reportes completos: ventas, cobros, meseros, cambios del personal, cobros pendientes y cierres. */
export function ReportsAdmin() {
  const hydrated = useHydrated();
  const period = usePeriod("7d");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Reportes"
        description="Lo vendido, lo cobrado y lo que cambió el personal. Todo se puede descargar en CSV para Excel."
        actions={<PeriodFilter state={period} />}
      />
      {hydrated ? <Body period={period.period} /> : <Skeleton className="h-96 rounded-2xl" />}
    </div>
  );
}

function Body({ period }: { period: Period }) {
  const { orders, sessions, payments } = useAnalyticsData();
  const shifts = useAllShifts();
  const waiters = useWaiters();
  const tables = useTables();

  const summary = useMemo(() => salesSummary(orders, period), [orders, period]);
  const paid = useMemo(() => paymentsByMethod(payments, period), [payments, period]);
  const byWaiter = useMemo(() => salesByWaiter(orders, waiters, period), [orders, waiters, period]);
  const changes = useMemo(() => changeRows(orders, tables, period), [orders, tables, period]);
  const unpaid = useMemo(
    () => unpaidSessions(sessions, orders, payments, tables, period),
    [sessions, orders, payments, tables, period],
  );
  const closes = useMemo(
    () =>
      shifts
        .filter((s) => s.closedAt && inPeriod(s.closedAt, period))
        .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!)),
    [shifts, period],
  );
  const delivery = useMemo(
    () => deliveryStats(sessions, orders, period),
    [sessions, orders, period],
  );
  const unpaidTotal = unpaid.reduce((s, x) => s + x.pending, 0);

  return (
    <>
      <p className="text-muted -mt-2 text-sm first-letter:uppercase">{describePeriod(period)}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Vendido"
          icon={ReceiptText}
          value={formatMoney(summary.sales)}
          note={plural(summary.delivered, "ronda entregada", "rondas entregadas")}
        />
        <StatTile
          label="Cobrado en caja"
          icon={Banknote}
          value={formatMoney(paid.total)}
          note={plural(paid.count, "pago", "pagos")}
        />
        <StatTile
          label="Sin cobro registrado"
          icon={TriangleAlert}
          tone={unpaidTotal > 0 ? "danger" : "neutral"}
          value={formatMoney(unpaidTotal)}
          note={plural(unpaid.length, "mesa cerrada", "mesas cerradas")}
        />
        <StatTile
          label="Cambios del personal"
          icon={Pencil}
          value={changes.length}
          note="en rondas ya tomadas"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Cobrado por forma de pago"
          action={
            <CsvButton
              label="cobros por forma de pago"
              onClick={() =>
                download("cobros-por-forma-de-pago.csv", [
                  ["Forma de pago", "Valor"],
                  ...PAYMENT_METHODS.map((m) => [METHOD_LABEL[m], paid.byMethod[m]]),
                ])
              }
            />
          }
        >
          <BarList
            rows={PAYMENT_METHODS.map((m) => ({
              key: m,
              label: METHOD_LABEL[m],
              value: paid.byMethod[m],
              display: formatMoney(paid.byMethod[m]),
            }))}
            empty={<p className="text-muted text-[15px]">No hay cobros en este periodo.</p>}
          />
        </Panel>

        <Panel
          title="Ventas por mesero"
          description="Según las mesas que atiende cada uno."
          action={
            <CsvButton
              label="ventas por mesero"
              onClick={() =>
                download("ventas-por-mesero.csv", [
                  ["Mesero", "Ventas", "Rondas", "Visitas", "Cambios"],
                  ...byWaiter.map((w) => [w.name, w.sales, w.rounds, w.visits, w.edits]),
                ])
              }
            />
          }
        >
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">Ventas por mesero</caption>
            <thead className="text-muted text-sm">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Mesero
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Ventas
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Visitas
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Cambios
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {byWaiter.map((w) => (
                <tr key={w.waiterId}>
                  <th scope="row" className="py-2.5 pr-3 font-semibold">
                    {w.name}
                  </th>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney(w.sales)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{w.visits}</td>
                  <td className="py-2.5 text-right tabular-nums">{w.edits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel
        title="Domicilios y recogida"
        description="Pedidos hechos desde /domicilio en el periodo."
        action={
          <CsvButton
            label="domicilios por zona"
            onClick={() =>
              download("domicilios-por-zona.csv", [
                ["Zona", "Pedidos entregados", "Ventas"],
                ...delivery.byZone.map((z) => [z.name, z.orders, z.sales]),
              ])
            }
          />
        }
      >
        {delivery.orders === 0 ? (
          <p className="text-muted text-[15px]">No hubo pedidos a domicilio en este periodo.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <dl className="grid grid-cols-2 gap-3 text-[15px]">
              <div>
                <dt className="text-muted text-sm">Pedidos</dt>
                <dd className="text-xl font-semibold">{delivery.orders}</dd>
              </div>
              <div>
                <dt className="text-muted text-sm">Entregados</dt>
                <dd className="text-xl font-semibold">{delivery.delivered}</dd>
              </div>
              <div>
                <dt className="text-muted text-sm">Cancelados</dt>
                <dd className="text-xl font-semibold">{delivery.cancelled}</dd>
              </div>
              <div>
                <dt className="text-muted text-sm">Para recoger</dt>
                <dd className="text-xl font-semibold">{delivery.pickups}</dd>
              </div>
              <div>
                <dt className="text-muted text-sm">Tiempo promedio</dt>
                <dd className="text-xl font-semibold">
                  {delivery.avgMinutes === null ? "—" : `${Math.round(delivery.avgMinutes)} min`}
                </dd>
              </div>
              <div>
                <dt className="text-muted text-sm">A tiempo</dt>
                <dd className="text-xl font-semibold">
                  {delivery.delivered
                    ? `${Math.round((delivery.onTime / delivery.delivered) * 100)} %`
                    : "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted text-sm">Envíos cobrados</dt>
                <dd className="text-xl font-semibold">{formatMoney(delivery.fees)}</dd>
              </div>
            </dl>
            <BarList
              rows={delivery.byZone.map((z) => ({
                key: z.name,
                label: z.name,
                value: z.sales,
                display: `${formatMoney(z.sales)} · ${z.orders}`,
              }))}
              empty={<p className="text-muted text-[15px]">Aún no hay entregas.</p>}
            />
          </div>
        )}
      </Panel>

      <Panel
        title="Cambios y anulaciones del personal"
        description="Quién tocó una ronda ya tomada, qué cambió y por qué."
        action={
          <CsvButton
            label="cambios del personal"
            onClick={() =>
              download("cambios-del-personal.csv", [
                ["Fecha", "Mesa", "Ronda", "Quién", "Tipo", "Plato", "Detalle", "Motivo"],
                ...changes.map((c) => [
                  stamp(c.at),
                  c.tableNumber,
                  c.round,
                  c.by,
                  KIND_LABEL[c.kind] ?? c.kind,
                  c.dishName,
                  c.detail,
                  c.reason,
                ]),
              ])
            }
          />
        }
      >
        {changes.length === 0 ? (
          <p className="text-muted text-[15px]">Nadie cambió rondas en este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Cambios del personal</caption>
              <thead className="text-muted text-sm">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Cuándo
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Mesa
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Quién
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Cambio
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {changes.slice(0, 40).map((c, i) => (
                  <tr key={`${c.at}-${i}`}>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{stamp(c.at)}</td>
                    <td className="py-2.5 pr-4">{c.tableNumber ?? "—"}</td>
                    <td className="py-2.5 pr-4">{c.by}</td>
                    <td className="py-2.5 pr-4">
                      <span className="font-semibold">{c.dishName}</span> · {c.detail}
                    </td>
                    <td className="text-ink-soft py-2.5">{c.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {changes.length > 40 && (
              <p className="text-muted mt-2 text-sm">
                Se muestran 40 de {changes.length}; el CSV trae todos.
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="Mesas cerradas sin cobro registrado"
        description="Cuentas que se cerraron con saldo: revisa si se cobraron fuera de caja."
        action={
          <CsvButton
            label="mesas sin cobro"
            onClick={() =>
              download("mesas-sin-cobro.csv", [
                ["Cierre", "Mesa", "Cuenta", "Pagado", "Falta"],
                ...unpaid.map((x) => [
                  stamp(x.session.closedAt!),
                  x.table?.number ?? null,
                  x.due,
                  x.paid,
                  x.pending,
                ]),
              ])
            }
          />
        }
      >
        {unpaid.length === 0 ? (
          <p className="text-muted text-[15px]">Todas las cuentas cerradas quedaron cobradas.</p>
        ) : (
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">Mesas sin cobro</caption>
            <thead className="text-muted text-sm">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Cierre
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Mesa
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Falta
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {unpaid.slice(0, 20).map((x) => (
                <tr key={x.session.id}>
                  <td className="py-2.5 pr-4">{stamp(x.session.closedAt!)}</td>
                  <td className="py-2.5 pr-4">
                    {x.session.delivery
                      ? `Domicilio ${x.session.delivery.code}`
                      : (x.table?.number ?? "—")}
                  </td>
                  <td className="text-danger-ink py-2.5 text-right tabular-nums">
                    {formatMoney(x.pending)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title="Cierres de caja"
        description="Cada turno con lo cobrado y si el efectivo cuadró."
        action={
          <CsvButton
            label="cierres de caja"
            onClick={() =>
              download("cierres-de-caja.csv", [
                [
                  "Cierre",
                  "Cerró",
                  "Fondo",
                  "Efectivo",
                  "Tarjeta",
                  "Transferencia",
                  "Otro",
                  "Total",
                  "Esperado",
                  "Contado",
                  "Diferencia",
                  "Nota",
                ],
                ...closes.map((s) => [
                  stamp(s.closedAt!),
                  s.closedBy ?? "",
                  s.openingFloat,
                  s.summary?.byMethod.efectivo ?? 0,
                  s.summary?.byMethod.tarjeta ?? 0,
                  s.summary?.byMethod.transferencia ?? 0,
                  s.summary?.byMethod.otro ?? 0,
                  s.summary?.total ?? 0,
                  s.summary?.expectedCash ?? 0,
                  s.summary?.countedCash ?? 0,
                  s.summary?.difference ?? 0,
                  s.note ?? "",
                ]),
              ])
            }
          />
        }
      >
        {closes.length === 0 ? (
          <p className="text-muted text-[15px]">No hubo cierres de caja en este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Cierres de caja</caption>
              <thead className="text-muted text-sm">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Cierre
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Cerró
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Cobrado
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {closes.map((s) => {
                  const diff = s.summary?.difference ?? 0;
                  return (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-4 whitespace-nowrap">{stamp(s.closedAt!)}</td>
                      <td className="py-2.5 pr-4">{s.closedBy}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {formatMoney(s.summary?.total ?? 0)}
                      </td>
                      <td
                        className={
                          "py-2.5 text-right tabular-nums " +
                          (diff === 0 ? "text-success-ink" : "text-danger-ink")
                        }
                      >
                        {diff === 0 ? "Cuadra" : formatMoney(diff)}
                        {s.note && <span className="text-muted block text-xs">{s.note}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
