"use client";

import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { strongVariant } from "@/lib/domain/color";
import { useDeviceStore } from "@/lib/data/device";
import { useAppStore, useBootStore } from "@/lib/data/store";
import { startSync } from "@/lib/data/sync";

/** Lee los datos guardados, arranca la sincronización entre pestañas y aplica el color del restaurante. */
export function AppProviders({ children }: { children: ReactNode }) {
  const accent = useAppStore((s) => s.restaurant.accentColor);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    Promise.all([useAppStore.persist.rehydrate(), useDeviceStore.persist.rehydrate()]).then(() => {
      if (cancelled) return;
      useBootStore.setState({ hydrated: true });
      stop = startSync();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-strong", strongVariant(accent));
  }, [accent]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
