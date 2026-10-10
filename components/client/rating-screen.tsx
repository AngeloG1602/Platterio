"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Heart, MessageSquarePlus, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DishImage } from "@/components/dish/dish-image";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { StarInput, Stars } from "@/components/ui/stars";
import { toast } from "@/components/ui/toaster";
import { feedbackActions, useRatableDishes, useServiceFeedback } from "@/lib/data";
import { COMMENT_MAX, type RatableDish } from "@/lib/domain/feedback";
import { plural } from "@/lib/domain/format";
import { cn } from "@/lib/cn";
import { ClientShell } from "./client-shell";
import { ScreenHeader } from "./screen-header";
import { useTableActivity } from "./table-activity";
import { TableGate, type TableContext } from "./table-gate";
import { localized, t } from "@/lib/i18n";
import { GoogleReviewInvite } from "./google-review-invite";

export function RatingScreen({ numero }: { numero: string }) {
  return (
    <ClientShell>
      <TableGate numero={numero} fallback={<RatingSkeleton />}>
        {(ctx) => <Rating ctx={ctx} />}
      </TableGate>
    </ClientShell>
  );
}

type Step = "platos" | "servicio" | "gracias";

/** Califica tu experiencia (US-30, US-31): platos y servicio por separado. */
function Rating({ ctx }: { ctx: TableContext }) {
  useTableActivity(ctx);
  const ratable = useRatableDishes(ctx.session, ctx.diner.id);
  const { rating: serviceRating } = useServiceFeedback(ctx.session);
  const pendingDishes = ratable.filter((r) => !r.existing);
  const [step, setStep] = useState<Step>(() =>
    pendingDishes.length === 0 && ratable.length > 0 ? "servicio" : "platos",
  );
  const [lowService, setLowService] = useState(false);

  if (ratable.length === 0) {
    return (
      <>
        <ScreenHeader title={t("Califica tu experiencia")} backHref={`${ctx.base}/pedido`} />
        <EmptyState
          icon={UtensilsCrossed}
          title={t("Aún no hay nada para calificar")}
          description={t(
            "Podrás calificar tus platos y el servicio cuando te entreguen el pedido.",
          )}
          action={
            <Link href={`${ctx.base}/pedido`} className={buttonClasses({ variant: "secondary" })}>
              {t("Ver el pedido")}
            </Link>
          }
          className="my-auto"
        />
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        title={t("Califica tu experiencia")}
        subtitle={t("Mesa {n}", { n: ctx.table.number })}
        backHref={`${ctx.base}/pedido`}
      />
      {step !== "gracias" && <Steps step={step} />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col"
        >
          {step === "platos" && (
            <DishStep ctx={ctx} ratable={ratable} onDone={() => setStep("servicio")} />
          )}
          {step === "servicio" && (
            <ServiceStep
              ctx={ctx}
              alreadyRatedBy={
                serviceRating
                  ? (ctx.session.diners.find((d) => d.id === serviceRating.dinerId)?.alias ??
                    t("Alguien de la mesa"))
                  : null
              }
              onDone={(low) => {
                setLowService(low);
                setStep("gracias");
              }}
            />
          )}
          {step === "gracias" && <Thanks ctx={ctx} low={lowService} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function Steps({ step }: { step: Step }) {
  const items: Array<[Step, string]> = [
    ["platos", t("Tus platos")],
    ["servicio", t("El servicio")],
  ];
  const current = items.findIndex(([s]) => s === step);
  return (
    <ol className="flex gap-2 px-4 pt-4" aria-label={t("Pasos")}>
      {items.map(([s, label], i) => (
        <li key={s} className="flex-1" aria-current={i === current ? "step" : undefined}>
          <span
            className={cn(
              "block h-1.5 rounded-full transition-colors",
              i <= current ? "bg-accent" : "bg-line",
            )}
          />
          <span
            className={cn(
              "mt-1.5 block text-[13px]",
              i === current ? "text-ink font-semibold" : "text-muted",
            )}
          >
            {i + 1}. {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DishStep({
  ctx,
  ratable,
  onDone,
}: {
  ctx: TableContext;
  ratable: RatableDish[];
  onDone: () => void;
}) {
  const [stars, setStars] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const keyOf = (r: RatableDish) => `${r.orderId}:${r.dish.id}`;
  const pending = ratable.filter((r) => !r.existing);
  const filled = pending.filter((r) => (stars[keyOf(r)] ?? 0) > 0).length;
  const firstOthers = ratable.findIndex((r) => !r.mine);

  function submit() {
    const drafts = pending.map((r) => ({
      orderId: r.orderId,
      dishId: r.dish.id,
      stars: stars[keyOf(r)] ?? 0,
      comment: comments[keyOf(r)],
    }));
    const result = feedbackActions.rateDishes(ctx.table.id, drafts);
    if (!result.ok) {
      const bad = pending.find((r) => r.dish.id === result.dishId);
      setErrorKey(bad ? keyOf(bad) : null);
      toast.error(t(result.error));
      return;
    }
    if (result.count)
      toast.success(
        t("Gracias: {n}", { n: plural(result.count, "plato calificado", "platos calificados") }),
      );
    onDone();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-5">
        <h2 className="font-display text-[26px] leading-tight font-semibold">
          {t("¿Qué tal estuvo la comida?")}
        </h2>
        <p className="text-muted mt-1 text-[15px]">
          {t("Califica cada plato. El comentario es opcional.")}
        </p>
      </div>
      <ul className="flex flex-col gap-3 px-4 pt-4 pb-36">
        {ratable.map((r, i) => {
          const key = keyOf(r);
          return (
            <li key={key}>
              {i === firstOthers && firstOthers > 0 && (
                <p className="text-muted mt-3 mb-2 text-xs font-semibold tracking-wide uppercase">
                  {t("También en la mesa")}
                </p>
              )}
              <article
                className={cn(
                  "bg-surface shadow-card rounded-2xl border p-4",
                  errorKey === key ? "border-danger" : "border-line",
                )}
              >
                <div className="flex items-center gap-3">
                  <DishImage
                    src={r.dish.photos[0]}
                    name={localized(r.dish)}
                    sizes="56px"
                    className="size-14 shrink-0"
                    initialClassName="text-2xl"
                  />
                  <h3 className="font-display flex-1 text-[18px] leading-snug font-semibold">
                    {localized(r.dish)}
                  </h3>
                </div>
                {r.existing ? (
                  <p className="text-success-ink mt-3 flex items-center gap-2 text-sm">
                    <Check className="size-4" aria-hidden /> {t("Ya lo calificaste")}{" "}
                    <Stars value={r.existing.stars} />
                  </p>
                ) : (
                  <>
                    <div className="mt-2 -ml-2">
                      <StarInput
                        value={stars[key] ?? 0}
                        onChange={(v) => {
                          setStars((s) => ({ ...s, [key]: v }));
                          if (errorKey === key) setErrorKey(null);
                        }}
                        label={t("Calificación de {dish}", { dish: localized(r.dish) })}
                      />
                    </div>
                    {open[key] ? (
                      <div className="mt-2">
                        <label htmlFor={`c-${key}`} className="sr-only">
                          {t("Comentario sobre {dish}", { dish: localized(r.dish) })}
                        </label>
                        <Textarea
                          id={`c-${key}`}
                          value={comments[key] ?? ""}
                          maxLength={COMMENT_MAX}
                          onChange={(e) => setComments((c) => ({ ...c, [key]: e.target.value }))}
                          placeholder={t("¿Qué te gustó o qué mejorarías?")}
                          rows={2}
                          className="min-h-20"
                          autoFocus
                        />
                        <p className="text-muted mt-1 text-right text-xs tabular-nums">
                          {(comments[key] ?? "").length}/{COMMENT_MAX}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpen((o) => ({ ...o, [key]: true }))}
                        className="text-accent-strong mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
                      >
                        <MessageSquarePlus className="size-4" aria-hidden />{" "}
                        {t("Agregar comentario")}
                      </button>
                    )}
                  </>
                )}
              </article>
            </li>
          );
        })}
      </ul>
      <div className="border-line bg-surface/95 pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t px-4 pt-3 backdrop-blur">
        <Button block size="lg" onClick={submit}>
          {filled > 0
            ? t("Enviar {n} y seguir", { n: plural(filled, "calificación", "calificaciones") })
            : t("Seguir al servicio")}
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function ServiceStep({
  ctx,
  alreadyRatedBy,
  onDone,
}: {
  ctx: TableContext;
  alreadyRatedBy: string | null;
  onDone: (low: boolean) => void;
}) {
  const { waiter, rating } = useServiceFeedback(ctx.session);
  const [stars, setStars] = useState(0);

  if (rating && alreadyRatedBy) {
    return (
      <div className="flex flex-1 flex-col px-4 pt-6">
        <h2 className="font-display text-[26px] leading-tight font-semibold">
          {t("El servicio ya fue calificado")}
        </h2>
        <p className="text-ink-soft mt-2 text-[15px]">
          {rating.dinerId === ctx.diner.id
            ? t("Tú calificaste la atención de esta visita. Se califica una sola vez por mesa.")
            : t("{name} calificó la atención de esta visita. Se califica una sola vez por mesa.", {
                name: alreadyRatedBy,
              })}
        </p>
        <div className="mt-4">
          <Stars value={rating.stars} />
        </div>
        <Button className="mt-8" size="lg" onClick={() => onDone(false)}>
          {t("Terminar")}
        </Button>
      </div>
    );
  }

  function submit() {
    const r = feedbackActions.rateService(ctx.table.id, stars);
    if (!r.ok) return toast.error(t(r.error));
    onDone(Boolean(r.lowAlert));
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-36">
      <span className="font-display bg-accent-soft text-accent-strong flex size-16 items-center justify-center rounded-full text-3xl font-semibold">
        {waiter?.name.charAt(0) ?? "?"}
      </span>
      <h2 className="font-display mt-4 text-[26px] leading-tight font-semibold">
        {t("¿Cómo te atendió {name}?", { name: waiter?.name ?? t("el mesero") })}
      </h2>
      <p className="text-muted mt-1 text-[15px]">
        {t("Una sola calificación por visita, aparte de la comida. Nos ayuda a mejorar a tiempo.")}
      </p>
      <div className="mt-6 -ml-2">
        <StarInput
          value={stars}
          onChange={setStars}
          label={t("Calificación del servicio")}
          size="lg"
        />
      </div>
      <div className="border-line bg-surface/95 pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t px-4 pt-3 backdrop-blur">
        <Button block size="lg" disabled={stars === 0} onClick={submit}>
          {t("Enviar calificación")}
        </Button>
      </div>
    </div>
  );
}

function Thanks({ ctx, low }: { ctx: TableContext; low: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-14 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="bg-accent-soft text-accent-strong flex size-20 items-center justify-center rounded-full"
      >
        <Heart className="size-9 fill-current" aria-hidden />
      </motion.span>
      <h2 className="font-display mt-6 text-[30px] leading-tight font-semibold">
        {t("¡Gracias, {name}!", { name: ctx.diner.alias })}
      </h2>
      <p className="text-ink-soft mt-3 max-w-xs text-[16px] leading-relaxed">
        {low
          ? t(
              "Sentimos que la atención no haya estado a la altura. Tu calificación ya le llegó al administrador para corregirlo hoy mismo.",
            )
          : t("Tu opinión nos ayuda a mejorar y a que otros elijan mejor.")}
      </p>
      <GoogleReviewInvite />
      <div className="mt-8 flex w-full flex-col gap-2">
        <Link
          href={`${ctx.base}/pedido`}
          className={buttonClasses({ variant: "secondary", size: "lg", block: true })}
        >
          {t("Volver al pedido")}
        </Link>
        <Link
          href={`${ctx.base}/menu`}
          className={buttonClasses({ variant: "ghost", block: true })}
        >
          {t("Ver la carta")}
        </Link>
      </div>
    </div>
  );
}

function RatingSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-4" aria-busy aria-label={t("Cargando")}>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}
