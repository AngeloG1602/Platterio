"use client";

import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ADDONS, FOUNDER, PLANS, SUPPORT, TRIAL_DAYS } from "@/lib/data/plans";
import { formatMoney } from "@/lib/domain/format";
import {
  minimumWageShare,
  monthlyEquivalent,
  SMMLV_2026,
  yearlySaving,
} from "@/lib/domain/pricing";
import { cn } from "@/lib/cn";

const cop = (n: number) => formatMoney(n, "COP");

/** Planes con el cambio mensual / anual, precio de fundador y servicios aparte. */
export function Pricing() {
  const [yearly, setYearly] = useState(false);
  const completo = PLANS.find((p) => p.id === "completo")!;
  const share = Math.round(minimumWageShare(completo.yearly!) * 100);
  const founderShare = Math.round(minimumWageShare(FOUNDER.yearly) * 100);

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
          const annual = yearly && plan.yearly !== undefined;
          const price = annual ? monthlyEquivalent(plan.yearly!) : plan.monthly;
          const saving = plan.yearly ? yearlySaving(plan.monthly, plan.yearly) : null;
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
              <p className="text-ink-soft mt-1 min-h-16 text-[15px]">{plan.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[44px] leading-none font-semibold tracking-tight tabular-nums">
                  {cop(price)}
                </span>
                <span className="text-muted text-[15px]">al mes</span>
              </p>
              <p className="text-muted mt-1 min-h-10 text-[13px]">
                {annual && plan.yearly
                  ? `Pagas ${cop(plan.yearly)} al año${saving ? ` (ahorras ${cop(saving.pesos)})` : ""}`
                  : plan.yearly
                    ? `O ${cop(plan.yearly)} al año (2 meses gratis)`
                    : "Solo mensual, sin permanencia."}
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

      <section
        aria-labelledby="fundador"
        className="border-accent-line bg-accent-soft mx-auto mt-6 max-w-4xl rounded-3xl border p-6"
      >
        <h3 id="fundador" className="flex items-center gap-2 text-[19px] font-semibold">
          <Sparkles className="text-accent-strong size-5" aria-hidden />
          Precio de fundador: Completo por {cop(FOUNDER.yearly)} el primer año
        </h3>
        <p className="text-ink-soft mt-2 text-[15px]">
          Para los primeros {FOUNDER.spots} restaurantes, con pago anual único. Incluye la carga de
          tu carta sin costo y el <b>precio congelado {FOUNDER.months} meses</b>: pase lo que pase
          con los precios, pagas lo mismo todo el año. A cambio nos cuentas qué mejorar y nos dejas
          un testimonio. Al año renueva al precio anual normal, con aviso de 30 días.
        </p>
        <Link
          href="/registro?plan=completo&fundador=1"
          className={buttonClasses({ className: "mt-4" })}
        >
          Quiero ser fundador
        </Link>
      </section>

      <section
        aria-labelledby="sueldo"
        className="border-line bg-surface mx-auto mt-6 max-w-4xl rounded-3xl border p-6"
      >
        <h3 id="sueldo" className="text-[19px] font-semibold">
          Menos que un sueldo mínimo, por todo un año
        </h3>
        <p className="text-ink-soft mt-2 text-[15px]">
          El plan Completo anual cuesta el <b>{share} %</b> de un solo mes de salario mínimo en 2026
          ({cop(SMMLV_2026)}), y con el precio de fundador, el <b>{founderShare} %</b>. Es como
          pagar por un año a alguien que trabaja todos los días, a toda hora y sin descanso: toma
          los pedidos, avisa a la cocina, cuenta tu caja y te dice cómo vas.
        </p>
      </section>

      <section
        aria-labelledby="extras"
        className="border-line bg-surface-2 mx-auto mt-6 max-w-4xl rounded-3xl border p-6"
      >
        <h3 id="extras" className="text-[17px] font-semibold">
          Servicios que se pagan aparte
        </h3>
        <ul className="divide-line mt-3 divide-y">
          {ADDONS.map((a) => (
            <li
              key={a.name}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
            >
              <div>
                <p className="text-[15px] font-semibold">{a.name}</p>
                <p className="text-ink-soft text-[14px]">{a.note}</p>
              </div>
              <p className="text-[15px] font-semibold whitespace-nowrap">{a.price}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-muted mx-auto mt-4 max-w-4xl text-center text-[13px]">
        Soporte: {SUPPORT.hours}. {SUPPORT.outside} Plan Digital, respuesta {SUPPORT.standardReply};
        plan Completo, {SUPPORT.priorityReply}.
      </p>
    </div>
  );
}
