"use client";

import { QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { toast } from "@/components/ui/toaster";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useHydrated, useMyDiner, useSeedEpoch, useTableByNumber } from "@/lib/data";
import type { Diner, Table, TableSession } from "@/lib/domain/types";
import { t } from "@/lib/i18n";

export interface TableContext {
  table: Table;
  session: TableSession;
  diner: Diner;
  base: string;
}

export type TableAccess =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "guest"; table: Table; session?: TableSession }
  | ({ status: "ready" } & TableContext);

/** Resuelve la mesa del QR y si este dispositivo ya entró a su sesión. */
export function useTableAccess(numero: string): TableAccess {
  const hydrated = useHydrated();
  const n = /^\d+$/.test(numero) ? Number(numero) : NaN;
  const table = useTableByNumber(n);
  const { session, diner } = useMyDiner(table?.id);
  if (!hydrated) return { status: "loading" };
  if (!table) return { status: "invalid" };
  if (!session || !diner) return { status: "guest", table, session };
  return { status: "ready", table, session, diner, base: `/mesa/${table.number}` };
}

export function InvalidTable() {
  return (
    <EmptyState
      icon={QrCode}
      title={t("No encontramos esta mesa")}
      description={t(
        "Puede que el código QR esté desactualizado. Pídele ayuda al mesero o vuelve a escanear.",
      )}
      action={
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          {t("Ir al inicio de la demo")}
        </Link>
      }
      className="my-auto"
    />
  );
}

/** Protege las pantallas de la mesa: si el dispositivo no ha entrado, lo manda a la entrada. */
export function TableGate({
  numero,
  fallback,
  children,
}: {
  numero: string;
  fallback: ReactNode;
  children: (ctx: TableContext) => ReactNode;
}) {
  const access = useTableAccess(numero);
  const router = useRouter();
  const shouldRedirect = access.status === "guest";
  const seedEpoch = useSeedEpoch();
  const readyAt = useRef<number | null>(null);

  useEffect(() => {
    if (access.status === "ready") readyAt.current = seedEpoch;
    if (!shouldRedirect) return;
    // Si estaba dentro y la sesión desapareció: o se reiniciaron los datos, o el mesero liberó la mesa.
    if (readyAt.current !== null) {
      if (readyAt.current !== seedEpoch) {
        toast(t("Se reiniciaron los datos de la demo"), {
          id: "demo-reiniciada",
          description: t("Vuelve a entrar a la mesa para empezar de nuevo."),
        });
      } else {
        toast.success(t("La mesa se liberó. ¡Gracias por venir!"), {
          id: "mesa-liberada",
          description: t("Si vuelves a escanear el QR se abre una visita nueva."),
        });
      }
      readyAt.current = null;
    }
    router.replace(`/mesa/${numero}`);
  }, [access.status, shouldRedirect, numero, router, seedEpoch]);

  if (access.status === "invalid") return <InvalidTable />;
  if (access.status !== "ready") return <>{fallback}</>;
  return <>{children(access)}</>;
}
