"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { PLANS, TRIAL_DAYS } from "@/lib/data/plans";
import { formatMoney } from "@/lib/domain/format";
import { cn } from "@/lib/cn";

/** Planes con el cambio mensual / anual. */
export function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <div>
      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Forma de pago"
          className="border-line bg-surface-2 inline-flex gap-1 rounded-full border p-1"
        >
          {(
            [
              [false, "Mensual"],
              [true, "Anual · 2 meses gratis"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={yearly === value}
              onClick={() => setYearly(value)}
              className={cn(
                "min-h-11 rounded-full px-5 text-[15px] font-semibold transition-colors",
                yearly === value ? "bg-ink text-bg" : "text-ink-soft hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
          const price = yearly ? Math.round(plan.yearly / 12) : plan.monthly;
          return (
            <article
              key={plan.id}
              aria-labelledby={`plan-${plan.id}`}
              className={cn(
                "bg-surface relative flex flex-col rounded-3xl border p-7",
                plan.highlight ? "border-ink shadow-float border-2" : "border-line shadow-card",
              )}
            >
              {plan.highlight && (
                <span className="bg-ink text-bg absolute -top-3.5 left-7 rounded-full px-3 py-1 text-xs font-semibold">
                  El más completo
                </span>
              )}
              <h3 id={`plan-${plan.id}`} className="font-display text-[28px] font-semibold">
                {plan.name}
              </h3>
              <p className="text-ink-soft mt-1 min-h-12 text-[15px]">{plan.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[44px] leading-none font-semibold tracking-tight tabular-nums">
                  {formatMoney(price, "COP")}
                </span>
                <span className="text-muted text-[15px]">al mes</span>
              </p>
              <p className="text-muted mt-1 min-h-5 text-[13px]">
                {yearly
                  ? `Pagas ${formatMoney(plan.yearly, "COP")} al año`
                  : `O ${formatMoney(plan.yearly, "COP")} al año (2 meses gratis)`}
              </p>
              <Link
                href={`/registro?plan=${plan.id}`}
                className={buttonClasses({
                  size: "lg",
                  block: true,
                  variant: plan.highlight ? undefined : "secondary",
                  className: "mt-6",
                })}
              >
                Probar {TRIAL_DAYS} días gratis
              </Link>
              <ul className="mt-6 flex flex-col gap-2.5 text-[15px]">
                {plan.includesPrevious && (
                  <li className="text-ink font-semibold">{plan.includesPrevious}, y además:</li>
                )}
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="text-accent-strong mt-0.5 size-4.5 shrink-0" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <div className="border-line bg-surface-2 mx-auto mt-6 flex max-w-4xl flex-col gap-1 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[17px] font-semibold">Vista 3D de tus platos</h3>
          <p className="text-ink-soft text-[15px]">
            Un servicio aparte, por plato: modelamos el plato (o usamos tu modelo) y tus clientes lo
            giran, lo separan y lo arman a su gusto.
          </p>
        </div>
        <p className="text-[15px] font-semibold whitespace-nowrap">Cotización por plato</p>
      </div>
    </div>
  );
}
