"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  MessageCircle,
  RotateCcw,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Stars } from "@/components/ui/stars";
import { toast } from "@/components/ui/toaster";
import { alertActions, useAlerts, useNow, useRestaurant, useTables, useWaiters } from "@/lib/data";
import { formatRelative } from "@/lib/domain/format";
import type { Alert } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

/** Alertas de servicio (US-34, US-27): servicio bajo y pedidos sin confirmar. */
export function AlertsPanel() {
  const alerts = useAlerts();
  const tables = useTables();
  const waiters = useWaiters();
  const restaurant = useRestaurant();
  const now = useNow(15_000);
  const [showResolved, setShowResolved] = useState(false);

  const active = alerts
    .filter((a) => !a.resolved)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const resolved = alerts
    .filter((a) => a.resolved)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tableNumber = (id: string) => tables.find((t) => t.id === id)?.number ?? "?";
  const waiterName = (id?: string) => waiters.find((w) => w.id === id)?.name ?? "sin asignar";

  // Aviso en vivo cuando llega una alerta nueva.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(alerts.map((a) => a.id));
    const before = seen.current;
    seen.current = ids;
    if (!before) return;
    for (const a of alerts) {
      if (before.has(a.id) || a.resolved) continue;
      toast.error(
        a.type === "servicio_bajo"
          ? `Servicio bajo en la Mesa ${tableNumber(a.tableId)}`
          : `Pedido sin confirmar en la Mesa ${tableNumber(a.tableId)}`,
        {
          id: `alerta-${a.id}`,
          icon: <BellRing className="text-danger size-5" aria-hidden />,
          description:
            a.type === "servicio_bajo"
              ? `Calificaron con ${a.stars} estrellas · ${waiterName(a.waiterId)}`
              : `Mesero: ${waiterName(a.waiterId)}`,
        },
      );
    }
  });

  return (
    <section
      aria-labelledby="alertas"
      className="border-line bg-surface shadow-card rounded-2xl border p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="alertas" className="flex items-center gap-2 text-lg font-semibold">
            <BellRing className="text-danger size-5" aria-hidden /> Alertas de servicio
            {active.length > 0 && <Badge tone="danger">{active.length} activas</Badge>}
          </h2>
          <p className="text-muted mt-0.5 text-sm">
            Servicio calificado con menos de {restaurant.serviceAlertThreshold} estrellas y pedidos
            que pasan del doble del tiempo de confirmación ({restaurant.confirmTimeoutMin * 2} min).
          </p>
        </div>
        <div className="border-line-strong text-muted flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
          <MessageCircle className="size-4" aria-hidden />
          Avisar por WhatsApp
          <Badge>Próximamente</Badge>
        </div>
      </div>

      {active.length === 0 ? (
        <p className="bg-success-soft text-success-ink mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-medium">
          <CircleCheck className="size-5" aria-hidden /> Todo en orden: no hay alertas activas.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {active.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertRow
                  alert={a}
                  table={tableNumber(a.tableId)}
                  waiter={waiterName(a.waiterId)}
                  now={now}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {resolved.length > 0 && (
        <div className="border-line mt-4 border-t pt-3">
          <button
            type="button"
            aria-expanded={showResolved}
            onClick={() => setShowResolved((v) => !v)}
            className="text-ink-soft flex min-h-11 items-center gap-1.5 text-sm font-semibold"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", showResolved && "rotate-180")}
              aria-hidden
            />
            Resueltas ({resolved.length})
          </button>
          {showResolved && (
            <ul className="mt-2 flex flex-col gap-2">
              {resolved.map((a) => (
                <li key={a.id}>
                  <AlertRow
                    alert={a}
                    table={tableNumber(a.tableId)}
                    waiter={waiterName(a.waiterId)}
                    now={now}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function AlertRow({
  alert,
  table,
  waiter,
  now,
}: {
  alert: Alert;
  table: number | string;
  waiter: string;
  now: number;
}) {
  const low = alert.type === "servicio_bajo";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-xl border p-4",
        alert.resolved
          ? "border-line bg-bg"
          : low
            ? "border-danger/30 bg-danger-soft"
            : "border-warning/40 bg-warning-soft",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          alert.resolved
            ? "bg-surface-2 text-muted"
            : low
              ? "bg-danger text-white"
              : "bg-warning text-white",
        )}
        aria-hidden
      >
        {low ? <Star className="size-5" /> : <Clock className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold">
          {low ? `Servicio bajo en la Mesa ${table}` : `Pedido sin confirmar en la Mesa ${table}`}
        </p>
        <p className="text-ink-soft mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
          {low ? (
            <>
              <Stars value={alert.stars ?? 0} /> <span>{alert.stars} de 5</span>
            </>
          ) : (
            <span>Pasó el doble del tiempo límite</span>
          )}
          <span aria-hidden>·</span>
          <span>Mesero: {waiter}</span>
          <span aria-hidden>·</span>
          <span>{formatRelative(new Date(alert.createdAt), new Date(now))}</span>
        </p>
      </div>
      {alert.resolved ? (
        <Button variant="ghost" size="sm" onClick={() => alertActions.reopen(alert.id)}>
          <RotateCcw aria-hidden /> Reabrir
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => alertActions.resolve(alert.id)}>
          <Check aria-hidden /> Marcar resuelta
        </Button>
      )}
    </div>
  );
}
