"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog, useHydrated } from "@/lib/data";
import {
  AUDIT_AREAS,
  auditArea,
  auditCsvRows,
  auditLabel,
  auditPeople,
  filterAudit,
  type AuditArea,
} from "@/lib/domain/audit";
import { toCsv } from "@/lib/domain/cash";
import { formatDay, formatTime, plural } from "@/lib/domain/format";
import { PageHeader, Panel } from "./ui/page-header";
import { describePeriod, PeriodFilter, usePeriod } from "./ui/period-filter";

const PAGE = 100;

function download(name: string, rows: (string | number | null)[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Auditoría: quién hizo qué, cuándo y quién lo autorizó. Solo lectura. */
export function AuditAdmin() {
  const hydrated = useHydrated();
  const period = usePeriod("7d");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Auditoría"
        description="Cada acción importante queda registrada con quién la hizo y, si hizo falta, quién la autorizó. No se puede editar ni borrar."
        actions={<PeriodFilter state={period} />}
      />
      {hydrated ? <Body period={period.period} /> : <Skeleton className="h-96 rounded-2xl" />}
    </div>
  );
}

function Body({ period }: { period: ReturnType<typeof usePeriod>["period"] }) {
  const log = useAuditLog();
  const [area, setArea] = useState<AuditArea | "">("");
  const [by, setBy] = useState("");
  const [text, setText] = useState("");
  const [shown, setShown] = useState(PAGE);
  const people = useMemo(() => auditPeople(log), [log]);
  const rows = useMemo(
    () =>
      filterAudit(log, {
        period,
        ...(area ? { area } : {}),
        ...(by ? { by } : {}),
        text,
      }),
    [log, period, area, by, text],
  );

  return (
    <>
      <p className="text-muted -mt-2 text-sm first-letter:uppercase">{describePeriod(period)}</p>
      <Panel
        title="Registro"
        description={`${plural(rows.length, "acción", "acciones")} con estos filtros.`}
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => download("auditoria.csv", auditCsvRows(rows))}
          >
            <Download aria-hidden /> CSV<span className="sr-only"> de la auditoría</span>
          </Button>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Área
            <Select
              value={area}
              onChange={(e) => {
                setArea(e.target.value as AuditArea | "");
                setShown(PAGE);
              }}
            >
              <option value="">Todas</option>
              {AUDIT_AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Persona
            <Select
              value={by}
              onChange={(e) => {
                setBy(e.target.value);
                setShown(PAGE);
              }}
            >
              <option value="">Todas</option>
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Buscar
            <Input
              value={text}
              placeholder="Mesa, plato, motivo…"
              onChange={(e) => {
                setText(e.target.value);
                setShown(PAGE);
              }}
            />
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted text-[15px]">
            {log.length === 0
              ? "Todavía no hay acciones registradas. Aparecerán aquí cuando el equipo trabaje."
              : "No hay acciones con estos filtros."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Acciones registradas</caption>
              <thead className="text-muted text-sm">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Cuándo
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Quién
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Acción
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Sobre
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {rows.slice(0, shown).map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                      {formatDay(new Date(e.at))}
                      <span className="text-muted"> · {formatTime(new Date(e.at))}</span>
                    </td>
                    <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                      {e.by}
                      {e.role && (
                        <span className="text-muted block text-sm font-normal">{e.role}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {auditLabel(e.action)}
                      <span className="text-muted block text-sm">{auditArea(e.action)}</span>
                    </td>
                    <td className="py-2.5 pr-4 font-medium whitespace-nowrap">{e.target}</td>
                    <td className="text-ink-soft py-2.5">
                      {e.detail}
                      {e.reason && (
                        <span className="block text-sm">
                          <span className="text-muted">Motivo:</span> {e.reason}
                        </span>
                      )}
                      {e.authorizedBy && (
                        <span className="block text-sm">
                          <span className="text-muted">Autorizó:</span> {e.authorizedBy}
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
  );
}
