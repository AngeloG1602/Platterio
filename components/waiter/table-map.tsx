"use client";

import { Armchair, ChefHat, Clock, PackageCheck, TriangleAlert, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { plural } from "@/lib/domain/format";
import { confirmLevel, type TableOverview, type TableStatus } from "@/lib/domain/waiter";
import { cn } from "@/lib/cn";

const STATUS: Record<TableStatus, { label: string; icon: LucideIcon; className: string }> = {
  libre: {
    label: "Libre",
    icon: Armchair,
    className: "border-dashed border-line-strong bg-bg text-muted",
  },
  con_clientes: {
    label: "Con clientes",
    icon: Users,
    className: "border-line bg-surface text-ink",
  },
  pendiente: {
    label: "Por confirmar",
    icon: Clock,
    className: "border-warning bg-warning-soft text-ink",
  },
  en_cocina: {
    label: "En cocina",
    icon: ChefHat,
    className: "border-accent-line bg-accent-soft text-ink",
  },
  listo: {
    label: "Listo para entregar",
    icon: PackageCheck,
    className: "border-success/60 bg-success-soft text-ink",
  },
};

/** Cuadrícula de mesas del mesero con su estado (US-25). */
export function TableMap({
  overviews,
  now,
  timeoutMin,
  onSelect,
}: {
  overviews: TableOverview[];
  now: number;
  timeoutMin: number;
  onSelect: (tableId: string) => void;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2.5">
      {overviews.map((o) => {
        const s = STATUS[o.status];
        const oldest = o.pending[0];
        const level = oldest ? confirmLevel(oldest.createdAt, now, timeoutMin) : "a_tiempo";
        const alarm = level !== "a_tiempo";
        return (
          <li key={o.table.id}>
            <button
              type="button"
              onClick={() => onSelect(o.table.id)}
              aria-label={`Mesa ${o.table.number}: ${s.label}${alarm ? ", en alerta" : ""}`}
              className={cn(
                "relative flex h-28 w-full flex-col justify-between rounded-2xl border-2 p-3 text-left transition active:scale-[0.98]",
                s.className,
                alarm &&
                  (level === "critica"
                    ? "border-danger ring-danger/20 ring-4"
                    : "ring-warning/25 ring-4"),
              )}
            >
              <span className="flex items-start justify-between">
                <span className="font-display text-[30px] leading-none font-semibold tabular-nums">
                  {o.table.number}
                </span>
                {alarm ? (
                  <TriangleAlert
                    className={cn(
                      "size-5",
                      level === "critica" ? "text-danger" : "text-warning-ink",
                    )}
                    aria-hidden
                  />
                ) : (
                  <s.icon className="size-5 opacity-70" aria-hidden />
                )}
              </span>
              <span>
                <span className="block text-[13px] leading-tight font-semibold">{s.label}</span>
                <span className="text-muted block text-xs">
                  {o.session
                    ? plural(o.session.diners.length, "comensal", "comensales")
                    : "Sin sesión"}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
