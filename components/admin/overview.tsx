"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated, useNow } from "@/lib/data";
import { formatDay } from "@/lib/domain/format";
import { AlertsPanel } from "./alerts-panel";

/** Resumen del administrador. En esta fase: alertas de servicio; la Fase 6 suma ventas y métricas. */
export function AdminOverview() {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-muted text-sm first-letter:uppercase">{formatDay(new Date(now))}</p>
      <h1 className="font-display text-[34px] leading-tight font-semibold">Resumen</h1>
      <div className="mt-6">
        {hydrated ? <AlertsPanel /> : <Skeleton className="h-48 rounded-2xl" />}
      </div>
    </div>
  );
}
