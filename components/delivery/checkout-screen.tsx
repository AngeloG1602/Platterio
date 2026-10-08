"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClientShell } from "@/components/client/client-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  deliveryClientActions,
  useDeliveryClient,
  useDeliveryConfig,
  useDishes,
  useHydrated,
  useNow,
} from "@/lib/data";
import {
  deliverySubtotal,
  deliveryTotals,
  isDeliveryOpen,
  PAY_WITH_LABEL,
  zoneOf,
  type CheckoutErrors,
  type CheckoutInput,
} from "@/lib/domain/delivery";
import { formatMoney } from "@/lib/domain/format";
import type { DeliveryPayWith, FulfillmentType } from "@/lib/domain/types";
import { localized, t } from "@/lib/i18n";
import { useBusinessHref } from "@/components/providers/business-scope";

export function CheckoutScreen() {
  return (
    <ClientShell>
      <Checkout />
    </ClientShell>
  );
}

function Checkout() {
  const href = useBusinessHref();
  const hydrated = useHydrated();
  const router = useRouter();
  const config = useDeliveryConfig();
  const dishes = useDishes();
  const cart = useDeliveryClient((s) => s.cart);
  const profile = useDeliveryClient((s) => s.profile);
  const now = useNow(60_000);
  const [form, setForm] = useState<CheckoutInput | null>(null);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [sending, setSending] = useState(false);

  const values: CheckoutInput = form ?? {
    type: "domicilio",
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    reference: profile.reference ?? "",
    zoneId: profile.zoneId ?? "",
    payWith: profile.payWith ?? "efectivo",
    cashFor: "",
    note: "",
  };
  const set = <K extends keyof CheckoutInput>(key: K, value: CheckoutInput[K]) => {
    setForm({ ...values, [key]: value });
    setErrors((e) => ({
      ...e,
      [key]: undefined,
      ...(key === "zoneId" ? { cart: undefined } : {}),
    }));
  };

  const byId = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);
  const subtotal = useMemo(() => deliverySubtotal(cart, dishes), [cart, dishes]);
  const zone = config && values.type === "domicilio" ? zoneOf(config, values.zoneId) : undefined;
  const totals = deliveryTotals(subtotal, zone?.fee ?? 0);

  if (!hydrated || !config) {
    return (
      <div className="px-4 pt-6" aria-busy aria-label={t("Cargando")}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40 rounded-xl" />
      </div>
    );
  }
  const open = isDeliveryOpen(config, now);

  if (cart.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-[26px] font-semibold">{t("Tu pedido está vacío")}</h1>
        <p className="text-ink-soft">{t("Agrega algo de la carta para continuar.")}</p>
        <Link href={href("/domicilio")} className="text-accent-strong font-semibold underline">
          {t("Volver a la carta")}
        </Link>
      </main>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const r = deliveryClientActions.place(values);
    if (!r.ok) {
      setSending(false);
      if (r.errors) setErrors(r.errors);
      return toast.error(t("No pudimos enviar tu pedido"), { description: r.error });
    }
    router.push(href(`/domicilio/seguimiento/${r.orderId}`));
  }

  return (
    <>
      <header className="flex items-center gap-2 px-2 pt-3">
        <Link
          href={href("/domicilio")}
          aria-label={t("Volver a la carta")}
          className="hover:bg-surface-2 flex size-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="font-display text-[24px] font-semibold">{t("Tu pedido")}</h1>
      </header>

      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-10">
        <ul className="divide-line divide-y">
          {cart.map((l) => {
            const dish = byId.get(l.dishId);
            const variant = dish?.variants.find((v) => v.id === l.variantId);
            return (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] leading-snug font-semibold">
                    {dish ? localized(dish) : t("Plato")}
                  </p>
                  {dish && dish.variants.length > 1 && variant && (
                    <p className="text-ink-soft text-sm">{t(variant.name)}</p>
                  )}
                  {l.note && (
                    <p className="text-muted text-sm">{t("Nota: {note}", { note: l.note })}</p>
                  )}
                  <Price value={(variant?.price ?? 0) * l.qty} className="text-sm" />
                </div>
                <QtyStepper
                  size="sm"
                  min={0}
                  label={t("Cantidad de {dish}", { dish: dish ? localized(dish) : t("plato") })}
                  value={l.qty}
                  onChange={(q) => deliveryClientActions.setQty(l.id, q)}
                />
                <button
                  type="button"
                  aria-label={t("Quitar {dish}", { dish: dish ? localized(dish) : t("plato") })}
                  onClick={() => deliveryClientActions.setQty(l.id, 0)}
                  className="text-muted hover:bg-surface-2 flex size-10 items-center justify-center rounded-full"
                >
                  <Trash2 className="size-4.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>

        {config.pickup && (
          <Segmented
            label={t("¿Cómo lo quieres?")}
            value={values.type}
            onChange={(t: FulfillmentType) => set("type", t)}
            options={[
              { value: "domicilio", label: t("A domicilio") },
              { value: "recoger", label: t("Recoger") },
            ]}
          />
        )}

        <fieldset className="flex flex-col gap-4">
          <legend className="font-display mb-1 text-[19px] font-semibold">{t("Tus datos")}</legend>
          <Field label={t("Nombre")} error={errors.name}>
            {(p) => (
              <Input
                {...p}
                autoComplete="name"
                value={values.name}
                maxLength={40}
                onChange={(e) => set("name", e.target.value)}
              />
            )}
          </Field>
          <Field label={t("Celular")} error={errors.phone} hint={t("Para avisarte si algo cambia")}>
            {(p) => (
              <Input
                {...p}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={values.phone}
                maxLength={16}
                onChange={(e) => set("phone", e.target.value)}
              />
            )}
          </Field>
          {values.type === "domicilio" && (
            <>
              <Field label={t("Zona")} error={errors.zoneId}>
                {(p) => (
                  <Select
                    {...p}
                    value={values.zoneId}
                    onChange={(e) => set("zoneId", e.target.value)}
                  >
                    <option value="">{t("Elige tu zona")}</option>
                    {config.zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} · {t("envío")} {formatMoney(z.fee)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t("Dirección")} error={errors.address}>
                {(p) => (
                  <Input
                    {...p}
                    autoComplete="street-address"
                    value={values.address}
                    maxLength={120}
                    placeholder={t("Calle 10 # 5-20, apto 301")}
                    onChange={(e) => set("address", e.target.value)}
                  />
                )}
              </Field>
              <Field label={t("Referencia")} optional error={errors.reference}>
                {(p) => (
                  <Input
                    {...p}
                    value={values.reference}
                    maxLength={80}
                    placeholder={t("Portón negro, frente al parque")}
                    onChange={(e) => set("reference", e.target.value)}
                  />
                )}
              </Field>
            </>
          )}
          <Field label={t("Nota para el pedido")} optional error={errors.note}>
            {(p) => (
              <Textarea
                {...p}
                rows={2}
                value={values.note}
                maxLength={140}
                onChange={(e) => set("note", e.target.value)}
              />
            )}
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="font-display mb-1 text-[19px] font-semibold">
            {t("Cómo vas a pagar")}
          </legend>
          <Segmented
            label={t("Forma de pago")}
            value={values.payWith}
            onChange={(v: DeliveryPayWith) => set("payWith", v)}
            options={(Object.keys(PAY_WITH_LABEL) as DeliveryPayWith[]).map((k) => ({
              value: k,
              label: k === "tarjeta" ? t("Tarjeta") : t(PAY_WITH_LABEL[k]),
            }))}
          />
          <p className="text-muted text-[13px]">
            {values.type === "domicilio"
              ? t("El pago se hace al recibir el pedido.")
              : t("El pago se hace al recogerlo.")}
          </p>
          {values.payWith === "efectivo" && (
            <Field
              label={t("¿Con cuánto pagas?")}
              optional
              error={errors.cashFor}
              hint={t("Para llevarte el cambio")}
            >
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  value={values.cashFor}
                  placeholder="100000"
                  onChange={(e) => set("cashFor", e.target.value.replace(/\D/g, ""))}
                />
              )}
            </Field>
          )}
        </fieldset>

        <section aria-label={t("Resumen")} className="bg-surface-2 rounded-xl p-4">
          <dl className="flex flex-col gap-1.5 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t("Subtotal")}</dt>
              <dd>
                <Price value={totals.subtotal} />
              </dd>
            </div>
            {values.type === "domicilio" && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">
                  {t("Envío")}
                  {zone ? ` · ${zone.name}` : ""}
                </dt>
                <dd>
                  {zone ? (
                    <Price value={totals.fee} />
                  ) : (
                    <span className="text-muted">{t("Elige tu zona")}</span>
                  )}
                </dd>
              </div>
            )}
            <div className="border-line mt-1 flex justify-between border-t pt-2 text-[17px] font-semibold">
              <dt>{t("Total")}</dt>
              <dd>
                <Price value={totals.total} />
              </dd>
            </div>
          </dl>
          {zone && (
            <p className="text-muted mt-2 text-[13px]">
              {t("Llega en unos {n} min · pedido mínimo {amount}", {
                n: zone.etaMin + config.prepMin,
                amount: formatMoney(zone.minOrder),
              })}
            </p>
          )}
        </section>

        {errors.cart && (
          <p
            role="alert"
            className="bg-warning-soft text-warning-ink rounded-lg px-3 py-2 text-sm font-medium"
          >
            {errors.cart}
          </p>
        )}
        {!open && (
          <p
            role="alert"
            className="bg-warning-soft text-warning-ink rounded-lg px-3 py-2 text-sm font-medium"
          >
            {t("Ahora estamos cerrados. Recibimos pedidos de {opens} a {closes}.", {
              opens: config.opensAt,
              closes: config.closesAt,
            })}
          </p>
        )}
        <Button type="submit" size="lg" block disabled={sending || !open}>
          {t("Hacer el pedido")} · <Price value={totals.total} />
        </Button>
      </form>
    </>
  );
}
