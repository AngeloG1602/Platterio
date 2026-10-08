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

/**
 * Avisa cuando la sesión en la que estaba el dispositivo desaparece: o se reiniciaron los datos
 * de la demo, o el mesero liberó la mesa. Devuelve `true` en ese momento (para decidir si se
 * redirige).
 */
function useSessionEndNotice(access: TableAccess) {
  const seedEpoch = useSeedEpoch();
  const readyAt = useRef<number | null>(null);
  const isGuest = access.status === "guest";
  useEffect(() => {
    if (access.status === "ready") readyAt.current = seedEpoch;
    if (!isGuest || readyAt.current === null) return;
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
  }, [access.status, isGuest, seedEpoch]);
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
  useSessionEndNotice(access);

  useEffect(() => {
    if (shouldRedirect) router.replace(`/mesa/${numero}`);
  }, [shouldRedirect, numero, router]);

  if (access.status === "invalid") return <InvalidTable />;
  if (access.status !== "ready") return <>{fallback}</>;
  return <>{children(access)}</>;
}

/**
 * Lo que ve quien abre una pantalla de la carta: si ya entró a la mesa (`member`) puede pedir; si
 * no, puede mirar la carta con sus precios pero no pedir hasta que el mesero abra la mesa y le dé el
 * PIN (`sessionOpen` dice si el mesero ya la abrió).
 */
export interface TableView {
  table: Table;
  base: string;
  member: TableContext | null;
  sessionOpen: boolean;
}

/** Como `TableGate`, pero deja pasar a quien todavía no ha entrado, solo para mirar. */
export function TableViewGate({
  numero,
  fallback,
  children,
}: {
  numero: string;
  fallback: ReactNode;
  children: (view: TableView) => ReactNode;
}) {
  const access = useTableAccess(numero);
  useSessionEndNotice(access);
  if (access.status === "invalid") return <InvalidTable />;
  if (access.status === "loading") return <>{fallback}</>;
  if (access.status === "ready")
    return (
      <>{children({ table: access.table, base: access.base, member: access, sessionOpen: true })}</>
    );
  return (
    <>
      {children({
        table: access.table,
        base: `/mesa/${access.table.number}`,
        member: null,
        sessionOpen: Boolean(access.session),
      })}
    </>
  );
}
