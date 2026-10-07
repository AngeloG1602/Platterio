"use client";

import { useEffect, type ReactNode } from "react";
import { toast, Toaster } from "@/components/ui/toaster";
import { brandVars } from "@/lib/domain/brand";
import { useDeviceStore } from "@/lib/data/device";
import { useAppStore, useBootStore } from "@/lib/data/store";
import { startSync } from "@/lib/data/sync";
import { startAlertWatcher } from "@/lib/data/alert-watcher";

/** Lee los datos guardados, arranca la sincronización entre pestañas y aplica el color del restaurante. */
export function AppProviders({ children }: { children: ReactNode }) {
  const accent = useAppStore((s) => s.restaurant.accentColor);
  const brand = useAppStore((s) => s.restaurant.brand);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let stopWatcher: (() => void) | undefined;
    let cancelled = false;
    Promise.all([useAppStore.persist.rehydrate(), useDeviceStore.persist.rehydrate()]).then(() => {
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

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(brandVars({ accentColor: accent, brand })))
      root.style.setProperty(name, value);
  }, [accent, brand]);

  return (
    <>
      {children}
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
