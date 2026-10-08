"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountsStore } from "@/lib/data/accounts-store";
import { useBootStore } from "@/lib/data/store";
import { splitBusinessPath, withBusiness } from "@/lib/domain/routes";

function subscribeToHistory(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

/**
 * Dirección corta del negocio en la URL (null en las rutas de la demo, sin prefijo).
 * El servidor sirve la pantalla ya sin prefijo (reescritura), así que al hidratar se parte de
 * "sin negocio" y se lee la dirección real justo después: así no hay diferencias con el servidor.
 */
export function useBusinessSlug(): string | null {
  usePathname(); // vuelve a pintar cuando se navega dentro de la app
  const path = useSyncExternalStore(
    subscribeToHistory,
    () => window.location.pathname,
    () => null,
  );
  return path === null ? null : splitBusinessPath(path).slug;
}

/** Ruta de la pantalla sin el prefijo del negocio (igual en el servidor y en el navegador). */
export function useScreenPath(): string {
  return splitBusinessPath(usePathname()).path;
}

/** Arma enlaces dentro del mismo negocio: `href("/mesa/3/menu")` → `/casa-verde/mesa/3/menu`. */
export function useBusinessHref(): (path: string) => string {
  const slug = useBusinessSlug();
  return useCallback((path: string) => withBusiness(slug, path), [slug]);
}

/**
 * Si la URL trae un negocio, comprueba que exista. (En esta versión local todos comparten los
 * mismos datos; con la base de datos cada negocio tendrá los suyos.)
 */
export function BusinessScope({ children }: { children: ReactNode }) {
  const slug = useBusinessSlug();
  const hydrated = useBootStore((s) => s.hydrated);
  const known = useAccountsStore((s) => (slug ? s.accounts.some((a) => a.slug === slug) : true));
  if (!slug || (hydrated && known)) return <>{children}</>;
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-md px-5 pt-10" aria-busy aria-label="Cargando">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-8 h-10 w-64" />
      </div>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <EmptyState
        icon={Store}
        title="No encontramos este negocio"
        description="Revisa la dirección o el código QR. Si eres el dueño, inicia sesión para ver tus enlaces."
        action={
          <Link href="/iniciar-sesion" className={buttonClasses({ variant: "secondary" })}>
            Iniciar sesión
          </Link>
        }
      />
    </main>
  );
}
