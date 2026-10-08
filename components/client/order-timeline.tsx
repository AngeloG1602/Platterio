"use client";

import { motion } from "framer-motion";
import { Ban, Check } from "lucide-react";
import { formatTime } from "@/lib/domain/format";
import { orderTimeline, timelineProgress } from "@/lib/domain/kitchen";
import type { Order } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

/**
 * Línea de tiempo de la ronda (US-29): Pendiente de confirmación → Confirmado → En preparación
 * → Listo → Entregado, o Rechazado con su motivo. Avanza sola con cada cambio.
 */
export function OrderTimeline({ order }: { order: Order }) {
  const steps = orderTimeline(order);
  return (
    <ol className="relative mt-4" aria-label={t("Estado del pedido")}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const rejected = step.status === "rechazado";
        return (
          <li
            key={step.status}
            className="relative flex gap-3.5 pb-4 last:pb-0"
            aria-current={step.state === "actual" ? "step" : undefined}
          >
            {!last && (
              <span
                aria-hidden
                className="bg-line absolute top-7 bottom-0 left-[13px] w-0.5 overflow-hidden rounded-full"
              >
                <motion.span
                  className="bg-accent block w-full"
                  initial={false}
                  animate={{ height: step.state === "hecho" ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </span>
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                rejected && "border-danger bg-danger text-white",
                !rejected && step.state === "hecho" && "border-accent bg-accent text-white",
                !rejected && step.state === "actual" && "border-accent bg-surface",
                step.state === "pendiente" && "border-line-strong bg-surface",
              )}
            >
              {rejected ? (
                <Ban className="size-3.5" />
              ) : step.state === "hecho" ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : step.state === "actual" ? (
                <span className="relative flex size-2.5">
                  <span className="bg-accent absolute inline-flex size-full animate-ping rounded-full opacity-60" />
                  <span className="bg-accent relative inline-flex size-2.5 rounded-full" />
                </span>
              ) : null}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pt-0.5">
              <span
                className={cn(
                  "text-[15px]",
                  step.state === "pendiente" ? "text-muted" : "text-ink font-semibold",
                  rejected && "text-danger-ink",
                )}
              >
                {t(step.label)}
                <span className="sr-only">
                  {step.state === "hecho"
                    ? ` (${t("hecho")})`
                    : step.state === "actual"
                      ? ` (${t("ahora")})`
                      : ` (${t("pendiente")})`}
                </span>
              </span>
              {step.at && (
                <span className="text-muted shrink-0 text-[13px] tabular-nums">
                  {formatTime(new Date(step.at))}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Barra de progreso compacta para rondas anteriores. */
export function OrderProgress({ order }: { order: Order }) {
  const value = timelineProgress(order);
  return (
    <div
      className="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-label={t("Avance de la ronda")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <motion.div
        className={cn(
          "h-full rounded-full",
          order.status === "rechazado" ? "bg-danger" : "bg-accent",
        )}
        initial={false}
        animate={{ width: order.status === "rechazado" ? "100%" : `${Math.max(6, value * 100)}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}
