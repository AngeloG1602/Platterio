"use client";

import {
  ArrowRight,
  Bike,
  Clock,
  MessageCircle,
  QrCode,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MadeWithPlatterio } from "@/components/brand/logos";
import { MenuHeader } from "@/components/brand/menu-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccountsStore,
  useDeliveryConfig,
  useHydrated,
  useNow,
  useRestaurant,
} from "@/lib/data";
import { isDeliveryOpen } from "@/lib/domain/delivery";
import { withBusiness } from "@/lib/domain/routes";
import { waLink } from "@/lib/domain/whatsapp";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { ClientShell } from "./client-shell";

/**
 * Página de inicio de un negocio (`/casa-verde`): el enlace único que se comparte en Instagram,
 * Google Maps o WhatsApp. Lleva a la carta para mirar, a los domicilios o a pedir en la mesa.
 */
export function BusinessHome({ slug }: { slug: string }) {
  return (
    <ClientShell>
      <Home slug={slug} />
    </ClientShell>
  );
}

function Home({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const restaurant = useRestaurant();
  const delivery = useDeliveryConfig();
  const known = useAccountsStore((s) => s.accounts.some((a) => a.slug === slug));
  const now = useNow(60_000);

  if (!hydrated) {
    return (
      <div className="px-4 pt-6" aria-busy aria-label={t("Cargando")}>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-8 h-28 rounded-2xl" />
        <Skeleton className="mt-3 h-28 rounded-2xl" />
      </div>
    );
  }
  if (!known) {
    return (
      <EmptyState
        icon={Store}
        title={t("No encontramos este negocio")}
        description={t("Revisa la dirección o el código QR que te compartieron.")}
        className="my-auto"
      />
    );
  }

  const deliveryOn = Boolean(delivery?.enabled);
  const open = delivery ? isDeliveryOpen(delivery, now) : false;

  return (
    <>
      <MenuHeader name={restaurant.name} />
      <main className="flex flex-1 flex-col px-4 pt-6 pb-10">
        <h1 className="font-display text-[30px] leading-[1.1] font-semibold tracking-tight">
          {t("¿Qué quieres hacer?")}
        </h1>
        <div className="mt-5 flex flex-col gap-3">
          <Choice
            href={withBusiness(slug, "/carta")}
            icon={<UtensilsCrossed className="size-6" aria-hidden />}
            title={t("Ver la carta")}
            text={t("Platos, ingredientes y precios, para mirar con calma.")}
          />
          {deliveryOn ? (
            <Choice
              href={withBusiness(slug, "/domicilio")}
              icon={<Bike className="size-6" aria-hidden />}
              title={t("Pedir a domicilio o para recoger")}
              text={
                open && delivery
                  ? t("Abierto hasta las {time}", { time: delivery.closesAt })
                  : t("Cerrado ahora · abrimos a las {time}", { time: delivery?.opensAt ?? "" })
              }
              badge={
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                    open ? "bg-success-soft text-success-ink" : "bg-warning-soft text-warning-ink",
                  )}
                >
                  <Clock className="size-3.5" aria-hidden />
                  {open ? t("Abierto") : t("Cerrado")}
                </span>
              }
            />
          ) : (
            <div className="border-line text-muted rounded-2xl border border-dashed p-4 text-[15px]">
              <p className="text-ink-soft font-semibold">{t("Pedir a domicilio o para recoger")}</p>
              <p className="mt-0.5">{t("Por ahora no recibimos pedidos a domicilio.")}</p>
            </div>
          )}
        </div>
        {delivery?.whatsapp && (
          <a
            href={
              waLink(delivery.whatsapp, `Hola ${restaurant.name}, quisiera hacer una consulta.`) ??
              undefined
            }
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonClasses({ variant: "ghost", block: true }),
              "text-ink-soft mt-3 justify-center",
            )}
          >
            <MessageCircle aria-hidden /> {t("Escríbenos por WhatsApp")}
          </a>
        )}
        <section
          aria-labelledby="en-el-local"
          className="bg-surface-2 mt-6 flex items-start gap-3 rounded-2xl p-4"
        >
          <QrCode className="text-ink-soft mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <h2 id="en-el-local" className="text-[15px] font-semibold">
              {t("¿Estás en el restaurante?")}
            </h2>
            <p className="text-ink-soft mt-0.5 text-[14px]">
              {t("Escanea el QR de tu mesa para pedir desde tu celular.")}
            </p>
          </div>
        </section>
        <MadeWithPlatterio className="mt-auto pt-10" />
      </main>
    </>
  );
}

function Choice({
  href,
  icon,
  title,
  text,
  badge,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  text: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonClasses({ variant: "secondary" }),
        "bg-surface shadow-card h-auto min-h-24 w-full justify-start gap-4 rounded-2xl px-4 py-4 text-left whitespace-normal",
      )}
    >
      <span className="bg-accent-soft text-accent-strong flex size-12 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="font-display text-[19px] leading-tight font-semibold">{title}</span>
        <span className="text-ink-soft text-[14px] font-normal">{text}</span>
        {badge}
      </span>
      <ArrowRight className="text-muted size-5 shrink-0" aria-hidden />
    </Link>
  );
}
