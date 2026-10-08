"use client";

import { Languages } from "lucide-react";
import { setPreferredLang, useHydrated, useRestaurant } from "@/lib/data";
import { enabledLangs, getLang, LANG_LABEL, t } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/** Selector de idioma del cliente. Solo aparece si el negocio ofrece más de uno. */
export function LanguageBar() {
  const hydrated = useHydrated();
  const restaurant = useRestaurant();
  const langs = enabledLangs(restaurant.languages);
  if (!hydrated || langs.length < 2) return null;
  const active = getLang();
  return (
    <div className="flex items-center justify-end gap-1 px-4 pt-2">
      <Languages className="text-muted size-4" aria-hidden />
      <div role="group" aria-label={t("Idioma")} className="flex gap-0.5">
        {langs.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={l === active}
            onClick={() => setPreferredLang(l)}
            className={cn(
              "min-h-8 rounded-full px-2.5 text-[13px] font-semibold",
              l === active ? "bg-ink text-bg" : "text-ink-soft hover:bg-surface-2",
            )}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
