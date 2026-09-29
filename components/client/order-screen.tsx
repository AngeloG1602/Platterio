"use client";

import { Ban, CircleAlert, Clock, Plus, ReceiptText, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTicket } from "@/lib/data";
import { cartCount } from "@/lib/domain/cart";
import { formatTime, plural } from "@/lib/domain/format";
import { STATUS_MESSAGE } from "@/lib/domain/orderStatus";
import { describeAdjustment, type TicketRound } from "@/lib/domain/ticket";
import { cn } from "@/lib/cn";
import { ClientShell } from "./client-shell";
import { OrderProgress, OrderTimeline } from "./order-timeline";
import { LiveDot, ScreenHeader } from "./screen-header";
import { useTableActivity } from "./table-activity";
import { TableGate, type TableContext } from "./table-gate";

export function OrderScreen({ numero }: { numero: string }) {
  return (
    <ClientShell>
      <TableGate numero={numero} fallback={<OrderSkeleton />}>
        {(ctx) => <OrderTicket ctx={ctx} />}
      </TableGate>
    </ClientShell>
  );
}

/** Ticket de la mesa (US-24) y estado de cada ronda. */
function OrderTicket({ ctx }: { ctx: TableContext }) {
  useTableActivity(ctx);
  const ticket = useTicket(ctx.session);
  const pendingInCart = cartCount(ctx.session.cart);
  const latest = ticket.rounds[ticket.rounds.length - 1];

  return (
    <>
      <ScreenHeader
        title="Pedido de la mesa"
        subtitle={`Mesa ${ctx.table.number} · ${plural(ctx.session.diners.length, "comensal", "comensales")}`}
        backHref={`${ctx.base}/menu`}
        action={<LiveDot />}
      />

      {!latest ? (
        <EmptyState
          icon={ReceiptText}
          title="Tu mesa aún no ha pedido nada"
          description="Cuando envíen el pedido, aquí verán cada ronda y cómo va."
          action={
            <Link href={`${ctx.base}/menu`} className={buttonClasses({ variant: "secondary" })}>
              Ver la carta
            </Link>
          }
          className="my-auto"
        />
      ) : (
        <div className="flex flex-col gap-4 px-4 pt-4 pb-10">
          <LatestStatus round={latest} ctx={ctx} />

          {pendingInCart > 0 && (
            <Link
              href={`${ctx.base}/carrito`}
              className="border-accent-line bg-accent-soft flex items-center gap-3 rounded-xl border p-3.5"
            >
              <ShoppingBag className="text-accent-strong size-5 shrink-0" aria-hidden />
              <p className="flex-1 text-sm">
                <span className="font-semibold">
                  Hay {plural(pendingInCart, "plato", "platos")} sin enviar
                </span>
                <span className="text-ink-soft block text-[13px]">
                  Irán en la ronda {latest.round + 1}. Toca para revisarlos.
                </span>
              </p>
            </Link>
          )}

          {[...ticket.rounds].reverse().map((round) => (
            <RoundCard key={round.order.id} round={round} myDinerId={ctx.diner.id} />
          ))}

          <div className="bg-ink text-bg rounded-2xl p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-bg/80 text-[15px] font-medium">Total de la mesa</span>
              <Price value={ticket.total} className="text-2xl" />
            </div>
            <p className="text-bg/70 mt-1 text-[13px]">
              {plural(ticket.itemCount, "plato", "platos")} en{" "}
              {plural(ticket.rounds.length, "ronda", "rondas")}. El pago se hace con el mesero al
              final.
            </p>
          </div>

          <Link
            href={`${ctx.base}/menu`}
            className={buttonClasses({ variant: "secondary", size: "lg", block: true })}
          >
            <Plus aria-hidden /> Pedir algo más
          </Link>
          <p className="text-muted -mt-2 text-center text-[13px]">
            Lo que agreguen ahora irá en una nueva ronda.
          </p>
        </div>
      )}
    </>
  );
}

function LatestStatus({ round, ctx }: { round: TicketRound; ctx: TableContext }) {
  const sentBy = ctx.session.diners.find((d) => d.id === round.order.sentByDinerId);
  const rejected = round.status === "rechazado";
  return (
    <section
      aria-live="polite"
      className={cn(
        "rounded-2xl border p-5",
        rejected ? "border-danger/30 bg-danger-soft" : "border-line bg-surface shadow-card",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted text-xs font-semibold tracking-[0.12em] uppercase">
          Ronda {round.round}
        </span>
        <StatusBadge status={round.status} />
      </div>
      <p className="font-display mt-3 text-[24px] leading-tight font-semibold">
        {STATUS_MESSAGE[round.status]}
      </p>
      {rejected && round.order.rejectReason && (
        <p className="text-danger-ink mt-2 flex items-start gap-2 text-[15px]">
          <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />
          Motivo: {round.order.rejectReason}
        </p>
      )}
      <p className="text-muted mt-2 flex items-center gap-1.5 text-[13px]">
        <Clock className="size-3.5" aria-hidden />
        Enviado {sentBy ? `por ${sentBy.id === ctx.diner.id ? "ti" : sentBy.alias} ` : ""}a las{" "}
        {formatTime(new Date(round.order.createdAt))}
      </p>
      <OrderTimeline order={round.order} />
    </section>
  );
}

function RoundCard({ round, myDinerId }: { round: TicketRound; myDinerId: string }) {
  const rejected = round.status === "rechazado";
  return (
    <section
      aria-label={`Ronda ${round.round}`}
      className="border-line bg-surface shadow-card rounded-2xl border p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[19px] font-semibold">Ronda {round.round}</h2>
        <StatusBadge status={round.status} short />
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <OrderProgress order={round.order} />
        <span className="text-muted shrink-0 text-[13px] tabular-nums">
          {formatTime(new Date(round.order.createdAt))}
        </span>
      </div>

      {round.adjustments.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {round.adjustments.map(({ item, dish, variant }) => (
            <li
              key={item.id}
              className="bg-warning-soft text-ink flex gap-2 rounded-lg px-3 py-2.5 text-sm"
            >
              <CircleAlert className="text-warning-ink mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">{describeAdjustment({ item, dish, variant })}</span>
                {item.adjustReason ? ` · Motivo: ${item.adjustReason}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {round.groups.map((group) => (
        <div key={group.dinerId} className="mt-4">
          <div className="border-line flex items-baseline justify-between border-b pb-1.5">
            <h3 className="text-sm font-semibold">
              {group.dinerId === myDinerId ? `Tú · ${group.alias}` : group.alias}
            </h3>
            {!rejected && <Price value={group.subtotal} className="text-muted text-[13px]" />}
          </div>
          <ul className="mt-1">
            {group.lines.map(({ item, dish, variant, lineTotal }) => (
              <li
                key={item.id}
                className={cn("flex items-start gap-3 py-2", item.removed && "text-muted")}
              >
                <span className="text-accent-strong w-7 shrink-0 text-[15px] font-semibold tabular-nums">
                  {item.qty}×
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[15px]", item.removed && "line-through")}>
                    {dish?.name ?? "Plato"}
                    {dish && dish.variants.length > 1 && variant ? (
                      <span className="text-muted"> · {variant.name}</span>
                    ) : null}
                  </p>
                  {item.note && <p className="text-ink-soft text-[13px] italic">“{item.note}”</p>}
                  {item.removed && (
                    <p className="text-warning-ink text-[13px] font-medium">
                      Quitado: {item.adjustReason}
                    </p>
                  )}
                </div>
                {!rejected && (
                  <Price
                    value={item.removed ? item.unitPrice * item.qty : lineTotal}
                    className={cn("text-[15px]", item.removed && "line-through")}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="border-line-strong mt-3 flex items-baseline justify-between border-t border-dashed pt-3">
        <span className="text-muted text-sm">
          {rejected
            ? "No suma al total"
            : `Subtotal · ${plural(round.itemCount, "plato", "platos")}`}
        </span>
        {!rejected && <Price value={round.subtotal} />}
      </div>
    </section>
  );
}

function OrderSkeleton() {
  return (
    <div aria-busy aria-label="Cargando el pedido" className="flex flex-col gap-4 px-4 pt-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
