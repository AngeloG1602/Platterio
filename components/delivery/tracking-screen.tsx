"use client";

import { ArrowLeft, Check, MapPin, Phone, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ClientShell } from "@/components/client/client-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  deliveryClientActions,
  useDeliveryClient,
  useDeliveryOrder,
  useDishes,
  useHydrated,
} from "@/lib/data";
import {
  customerCanCancel,
  deliveryTimeline,
  formatPhone,
  PAY_WITH_LABEL,
  stageMessage,
} from "@/lib/domain/delivery";
import { formatTime } from "@/lib/domain/format";
import { cn } from "@/lib/cn";

export function TrackingScreen({ id }: { id: string }) {
  return (
    <ClientShell>
      <Tracking id={id} />
    </ClientShell>
  );
}

function Tracking({ id }: { id: string }) {
  const hydrated = useHydrated();
  const item = useDeliveryOrder(id);
  const dishes = useDishes();
  const mine = useDeliveryClient((s) => s.orderIds.includes(id));
  const [confirming, setConfirming] = useState(false);

  if (!hydrated)
    return (
      <div className="px-4 pt-6" aria-busy aria-label="Cargando">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40 rounded-xl" />
      </div>
    );
  if (!item) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-[26px] font-semibold">No encontramos ese pedido</h1>
        <Link href="/domicilio" className="text-accent-strong font-semibold underline">
          Ir a la carta
        </Link>
      </main>
    );
  }

  const { info, order, stage, total } = item;
  const steps = deliveryTimeline(order, info);
  const lines = order.items.filter((i) => !i.removed);
  const cancelled = stage === "cancelado";
  const pickup = info.type === "recoger";

  return (
    <>
      <header className="flex items-center gap-2 px-2 pt-3">
        <Link
          href="/domicilio"
          aria-label="Volver a la carta"
          className="hover:bg-surface-2 flex size-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div>
          <h1 className="font-display text-[22px] leading-tight font-semibold">
            Pedido {info.code}
          </h1>
          <p className="text-muted text-[13px]">{pickup ? "Para recoger" : "A domicilio"}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-10">
        <section
          aria-live="polite"
          className={cn(
            "rounded-2xl p-4 text-[16px] font-medium",
            cancelled ? "bg-danger-soft text-danger-ink" : "bg-accent-soft text-accent-strong",
          )}
        >
          {stageMessage(stage, info)}
          {cancelled && order.rejectReason && (
            <span className="mt-1 block text-sm font-normal">Motivo: {order.rejectReason}</span>
          )}
          {!cancelled && stage !== "entregado" && (
            <span className="mt-1 block text-sm font-normal">
              Tiempo estimado: unos {info.etaMin} min desde las{" "}
              {formatTime(new Date(order.createdAt))}.
            </span>
          )}
        </section>

        {!cancelled && (
          <ol aria-label="Estado del pedido" className="flex flex-col">
            {steps.map((step, i) => (
              <li
                key={step.key}
                aria-current={step.state === "actual" ? "step" : undefined}
                className="relative flex gap-3.5 pb-4 last:pb-0"
              >
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-7 bottom-0 left-[13px] w-0.5 rounded-full",
                      step.state === "hecho" ? "bg-accent" : "bg-line",
                    )}
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                    step.state === "hecho" && "border-accent bg-accent text-white",
                    step.state === "actual" && "border-accent bg-surface",
                    step.state === "pendiente" && "border-line-strong bg-surface",
                  )}
                >
                  {step.state === "hecho" ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : step.state === "actual" ? (
                    <span className="bg-accent size-2.5 rounded-full" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "pt-0.5 text-[16px]",
                    step.state === "pendiente" ? "text-muted" : "font-semibold",
                  )}
                >
                  {step.label}
                  <span className="sr-only">
                    {step.state === "hecho"
                      ? " (listo)"
                      : step.state === "actual"
                        ? " (ahora)"
                        : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}

        <section aria-label="Detalle" className="border-line rounded-xl border">
          <ul className="divide-line divide-y px-4">
            {lines.map((l) => {
              const dish = dishes.find((d) => d.id === l.dishId);
              const variant = dish?.variants.find((v) => v.id === l.variantId);
              return (
                <li key={l.id} className="flex justify-between gap-3 py-2.5 text-[15px]">
                  <span>
                    {l.qty}× {dish?.name ?? "Plato"}
                    {dish && dish.variants.length > 1 && variant ? ` · ${variant.name}` : ""}
                    {l.note && <span className="text-muted block text-sm">Nota: {l.note}</span>}
                  </span>
                  <Price value={l.unitPrice * l.qty} className="text-sm" />
                </li>
              );
            })}
          </ul>
          <dl className="border-line bg-surface-2 flex flex-col gap-1 rounded-b-xl border-t px-4 py-3 text-[15px]">
            {info.fee > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">Envío</dt>
                <dd>
                  <Price value={info.fee} />
                </dd>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>
                <Price value={total} />
              </dd>
            </div>
            <div className="text-muted text-[13px]">
              Pago: {PAY_WITH_LABEL[info.payWith]}
              {info.cashFor ? ` · pagas con $${info.cashFor.toLocaleString("es-CO")}` : ""}
            </div>
          </dl>
        </section>

        <section aria-label="Entrega" className="text-ink-soft flex flex-col gap-1.5 text-[15px]">
          {pickup ? (
            <p className="flex items-center gap-2">
              <Store className="size-4 shrink-0" aria-hidden /> Lo recoges en el local
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {info.address} · {info.zoneName}
                {info.reference && (
                  <span className="text-muted block text-sm">{info.reference}</span>
                )}
              </span>
            </p>
          )}
          <p className="flex items-center gap-2">
            <Phone className="size-4 shrink-0" aria-hidden /> {info.customerName} ·{" "}
            {formatPhone(info.phone)}
          </p>
        </section>

        {mine && customerCanCancel(order) && (
          <Button variant="secondary" block onClick={() => setConfirming(true)}>
            Cancelar pedido
          </Button>
        )}
      </main>

      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Cancelar tu pedido?"
        description="Solo se puede cancelar mientras no lo hayamos confirmado."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const r = deliveryClientActions.cancel(order.id);
                setConfirming(false);
                if (!r.ok) return toast.error("No se pudo cancelar", { description: r.error });
                toast.success("Pedido cancelado");
              }}
            >
              Sí, cancelar
            </Button>
          </>
        }
      />
    </>
  );
}
