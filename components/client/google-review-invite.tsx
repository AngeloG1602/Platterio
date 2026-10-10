"use client";

import { ExternalLink, Star } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { useRestaurant } from "@/lib/data";
import { t } from "@/lib/i18n";

/**
 * Invitación a dejar una reseña en Google. Se muestra a todos los que califican, sin importar las
 * estrellas que dieron: Google no permite pedir reseñas solo a los clientes contentos.
 */
export function GoogleReviewInvite() {
  const { googleReviewUrl, name } = useRestaurant();
  if (!googleReviewUrl) return null;
  return (
    <section
      aria-label={t("Reseña en Google")}
      className="border-line bg-surface shadow-card mt-8 flex w-full flex-col gap-2 rounded-2xl border p-4 text-left"
    >
      <p className="flex items-center gap-2 text-[16px] font-semibold">
        <Star className="text-accent-strong size-5" aria-hidden />
        {t("¿Nos dejas una reseña en Google?")}
      </p>
      <p className="text-ink-soft text-[14px]">
        {t("Es voluntaria y le ayuda mucho a {name}. Te toma un minuto.", { name })}
      </p>
      <a
        href={googleReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses({ variant: "secondary", block: true })}
      >
        <ExternalLink aria-hidden /> {t("Dejar mi reseña")}
        <span className="sr-only"> {t("(se abre en otra pestaña)")}</span>
      </a>
    </section>
  );
}
