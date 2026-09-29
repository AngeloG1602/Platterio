"use client";

import { motion } from "framer-motion";
import { Check, Clock, HandPlatter, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toaster";
import { waiterActions } from "@/lib/data";
import { formatElapsed, plural } from "@/lib/domain/format";
import { lineTotal } from "@/lib/domain/ticket";
import { confirmLevel } from "@/lib/domain/waiter";
import type { Diner, Dish, Order, OrderItem, Table } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { AdjustSheet } from "./adjust-sheet";
import { OrderLines } from "./order-lines";
import { RejectDialog } from "./reject-dialog";

interface TicketProps {
  order: Order;
  table: Table;
  diners: readonly Diner[];
  dishes: readonly Dish[];
  now: number;
}

const itemCount = (o: Order) => o.items.filter((i) => !i.removed).reduce((s, i) => s + i.qty, 0);

/** Ticket por confirmar (US-25): contador, alerta, ajustes, rechazar y confirmar. */
export function PendingTicket({
  order,
  table,
  diners,
  dishes,
  now,
  timeoutMin,
}: TicketProps & { timeoutMin: number }) {
  const [adjusting, setAdjusting] = useState<OrderItem | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const level = confirmLevel(order.createdAt, now, timeoutMin);
  const elapsed = now - Date.parse(order.createdAt);
  const label = `Mesa ${table.number} · Ronda ${order.round}`;
  const total = order.items.reduce((s, i) => s + lineTotal(i), 0);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      aria-label={`Pedido por confirmar, ${label}`}
      className={cn(
        "bg-surface shadow-card rounded-2xl border-2 p-4",
        level === "a_tiempo" && "border-line",
        level === "alerta" && "border-warning",
        level === "critica" && "border-danger",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[26px] leading-none font-semibold">
            Mesa {table.number}
          </h3>
          <p className="text-muted mt-1 text-sm">
            Ronda {order.round} · {plural(itemCount(order), "plato", "platos")}
          </p>
        </div>
        <TimerBadge level={level} elapsed={elapsed} />
      </header>

      {level !== "a_tiempo" && (
        <p
          role="alert"
          className={cn(
            "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
            level === "alerta"
              ? "bg-warning-soft text-warning-ink"
              : "bg-danger-soft text-danger-ink",
          )}
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {level === "alerta"
            ? `Lleva más de ${timeoutMin} min sin confirmar`
            : "Sigue sin confirmar: ya avisamos al administrador"}
        </p>
      )}

      <div className="border-line mt-4 border-t pt-3">
        <OrderLines order={order} dishes={dishes} diners={diners} onAdjust={setAdjusting} />
      </div>

      <div className="border-line-strong mt-3 flex items-baseline justify-between border-t border-dashed pt-3">
        <span className="text-muted text-sm">Total de la ronda</span>
        <Price value={total} className="text-lg" />
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          className="text-danger-ink flex-1"
          onClick={() => setRejecting(true)}
        >
          <X aria-hidden /> Rechazar
        </Button>
        <Button
          className="flex-[1.8]"
          onClick={() => {
            const r = waiterActions.confirm(order.id);
            if (r.ok)
              toast.success(`${label} confirmado`, { description: "Ya está en la cocina." });
            else toast.error("No se pudo confirmar", { description: r.error });
          }}
        >
          <Check aria-hidden /> Confirmar y enviar a cocina
        </Button>
      </div>

      {adjusting && (
        <AdjustSheet
          orderId={order.id}
          item={adjusting}
          dish={dishes.find((d) => d.id === adjusting.dishId)}
          onClose={() => setAdjusting(null)}
        />
      )}
      {rejecting && (
        <RejectDialog orderId={order.id} label={label} onClose={() => setRejecting(false)} />
      )}
    </motion.article>
  );
}

function TimerBadge({
  level,
  elapsed,
}: {
  level: ReturnType<typeof confirmLevel>;
  elapsed: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold tabular-nums",
        level === "a_tiempo" && "bg-surface-2 text-ink-soft",
        level === "alerta" && "bg-warning-soft text-warning-ink animate-pulse",
        level === "critica" && "bg-danger text-white",
      )}
      aria-label={`Hace ${formatElapsed(elapsed)} minutos`}
    >
      {level === "a_tiempo" ? (
        <Clock className="size-4" aria-hidden />
      ) : (
        <TriangleAlert className="size-4" aria-hidden />
      )}
      {formatElapsed(elapsed)}
    </span>
  );
}

/** Ronda lista en cocina (US-28, US-29): el mesero la entrega. */
export function ReadyTicket({ order, table, diners, dishes, now }: TicketProps) {
  const since = now - Date.parse(order.readyAt ?? order.createdAt);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="border-success/50 bg-success-soft rounded-2xl border-2 p-4"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[24px] leading-none font-semibold">
            Mesa {table.number}
          </h3>
          <p className="text-ink-soft mt-1 text-sm">
            Ronda {order.round} · lista hace {formatElapsed(since)}
          </p>
        </div>
        <StatusBadge status="listo" />
      </header>
      <div className="mt-3">
        <OrderLines order={order} dishes={dishes} diners={diners} size="sm" />
      </div>
      <Button
        block
        size="lg"
        className="bg-success mt-4 text-white"
        onClick={() => {
          const r = waiterActions.deliver(order.id);
          if (r.ok) toast.success(`Mesa ${table.number} · Ronda ${order.round} entregada`);
          else toast.error(r.error);
        }}
      >
        <HandPlatter aria-hidden /> Marcar entregado
      </Button>
    </motion.article>
  );
}

/** Rondas en cocina (solo lectura). */
export function KitchenRow({ order, table, now }: { order: Order; table: Table; now: number }) {
  const since = now - Date.parse(order.confirmedAt ?? order.createdAt);
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="font-display w-20 text-lg font-semibold">Mesa {table.number}</span>
      <span className="text-muted flex-1 text-sm">
        Ronda {order.round} · {plural(itemCount(order), "plato", "platos")}
      </span>
      <span className="text-muted text-sm tabular-nums">{formatElapsed(since)}</span>
      <StatusBadge status={order.status} />
    </li>
  );
}
