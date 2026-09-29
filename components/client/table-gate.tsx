"use client";

import { QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useHydrated, useMyDiner, useTableByNumber } from "@/lib/data";
import type { Diner, Table, TableSession } from "@/lib/domain/types";

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
      title="No encontramos esta mesa"
      description="Puede que el código QR esté desactualizado. Pídele ayuda al mesero o vuelve a escanear."
      action={
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Ir al inicio de la demo
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

  useEffect(() => {
    if (shouldRedirect) router.replace(`/mesa/${numero}`);
  }, [shouldRedirect, numero, router]);

  if (access.status === "invalid") return <InvalidTable />;
  if (access.status !== "ready") return <>{fallback}</>;
  return <>{children(access)}</>;
}
