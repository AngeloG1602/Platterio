"use client";

import { usePathname } from "next/navigation";
import { Fragment, useEffect, type ReactNode } from "react";
import { toast, Toaster } from "@/components/ui/toaster";
import { brandVars } from "@/lib/domain/brand";
import { useDeliveryClient } from "@/lib/data/delivery-store";
import { useLangStore } from "@/lib/data/lang-store";
import { isCurrency, setCurrency } from "@/lib/domain/format";
import { enabledLangs, pickLang, setLang } from "@/lib/i18n";
import { useDeviceStore } from "@/lib/data/device";
import { useAppStore, useBootStore } from "@/lib/data/store";
import { startSync } from "@/lib/data/sync";
import { startAlertWatcher } from "@/lib/data/alert-watcher";

/** Lee los datos guardados, arranca la sincronización entre pestañas y aplica el color del restaurante. */
export function AppProviders({ children }: { children: ReactNode }) {
  const accent = useAppStore((s) => s.restaurant.accentColor);
  const brand = useAppStore((s) => s.restaurant.brand);
  const currencySetting = useAppStore((s) => s.restaurant.currency);
  const languages = useAppStore((s) => s.restaurant.languages);
  const savedLang = useLangStore((s) => s.lang);
  const hydrated = useBootStore((s) => s.hydrated);
  const pathname = usePathname();

  // El idioma solo cambia lo que ve el cliente; el personal siempre trabaja en español.
  const customerView = pathname.startsWith("/mesa") || pathname.startsWith("/domicilio");
  const lang =
    hydrated && customerView
      ? pickLang({
          saved: savedLang,
          browser: typeof navigator === "undefined" ? null : navigator.language,
          enabled: enabledLangs(languages),
        })
      : "es";
  const currency = isCurrency(currencySetting) ? currencySetting : "COP";
  // Se fijan antes de pintar a los hijos, que leen el idioma y la moneda al formatear textos.
  setLang(lang);
  setCurrency(currency);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let stopWatcher: (() => void) | undefined;
    let cancelled = false;
    Promise.all([
      useAppStore.persist.rehydrate(),
      useDeviceStore.persist.rehydrate(),
      useDeliveryClient.persist.rehydrate(),
      useLangStore.persist.rehydrate(),
    ]).then(() => {
      if (cancelled) return;
      useBootStore.setState({ hydrated: true });
      if (!storageAvailable()) {
        toast.warning("Tu navegador no deja guardar datos", {
          description:
            "La demo funciona, pero se pierde al recargar. Sal del modo privado para conservarla.",
          duration: 8000,
        });
      }
      stop = startSync();
      stopWatcher = startAlertWatcher();
    });
    return () => {
      cancelled = true;
      stop?.();
      stopWatcher?.();
    };
  }, []);

  // La marca va en una hoja de estilos propia (no en el estilo de <html>) para que el modo oscuro de
  // la cocina, que es una clase de <html>, siga mandando sobre los colores de fondo y texto.
  useEffect(() => {
    const vars = brandVars({ accentColor: accent, brand });
    const COLORS = [
      "--bg",
      "--surface",
      "--surface-2",
      "--ink",
      "--ink-soft",
      "--muted",
      "--line",
      "--line-strong",
    ];
    const block = (names: string[]) =>
      names.map((n) => `${n}:${vars[n as keyof typeof vars]};`).join("");
    const rest = Object.keys(vars).filter((n) => !COLORS.includes(n));
    let el = document.getElementById("marca-del-negocio");
    if (!el) {
      el = document.createElement("style");
      el.id = "marca-del-negocio";
      document.head.appendChild(el);
    }
    el.textContent = `:root:not(.theme-cocina){${block(COLORS)}}:root{${block(rest)}}`;
  }, [accent, brand]);

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "es-CO";
  }, [lang]);

  return (
    <>
      {/* Al cambiar de idioma o de moneda se vuelve a pintar todo con los textos nuevos. */}
      <Fragment key={`${lang}-${currency}`}>{children}</Fragment>
      <Toaster />
    </>
  );
}

function storageAvailable(): boolean {
  try {
    const key = "platterio:prueba";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
