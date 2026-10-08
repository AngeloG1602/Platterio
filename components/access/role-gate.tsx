"use client";

import { LogOut, ShieldOff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LoginScreen } from "@/components/access/login-screen";
import { buttonClasses, Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiredScreen, useAccountStatus } from "@/components/account/account-status";
import {
  accountActions,
  authActions,
  useCurrentAccount,
  useCurrentStaff,
  useHydrated,
} from "@/lib/data";
import { can, HOME, ROLE_LABEL, type Permission } from "@/lib/domain/access";

/**
 * Deja ver una sección solo a quien tenga el permiso: sin sesión pide el PIN, y con sesión
 * pero sin permiso explica por qué no. (En el prototipo es una barrera de interfaz; con la base
 * de datos las mismas reglas se aplican en el servidor.)
 */
export function RoleGate({
  permission,
  label,
  children,
}: {
  permission: Permission;
  /** Nombre de la sección, para el aviso de entrada. */
  label: string;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const staff = useCurrentStaff();
  const account = useCurrentAccount();
  const status = useAccountStatus();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-md px-5 pt-10" aria-busy aria-label="Cargando">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-10 size-14 rounded-2xl" />
        <Skeleton className="mt-5 h-10 w-64" />
        <Skeleton className="mt-6 h-14 rounded-lg" />
      </div>
    );
  }
  if (!staff) return <LoginScreen title={`Entrar a ${label}`} />;
  if (account && status?.state === "vencida")
    return <ExpiredScreen email={account.email} businessName={account.businessName} />;
  if (!can(staff.role, permission)) return <NoAccess label={label} />;
  return <>{children}</>;
}

function NoAccess({ label }: { label: string }) {
  const staff = useCurrentStaff();
  if (!staff) return null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 text-center">
      <span className="bg-warning-soft text-warning-ink mx-auto flex size-14 items-center justify-center rounded-2xl">
        <ShieldOff className="size-6" aria-hidden />
      </span>
      <h1 className="font-display mt-5 text-[30px] leading-tight font-semibold">
        Esta sección no es para tu usuario
      </h1>
      <p className="text-ink-soft mt-2 text-[16px]">
        Entraste como {staff.name} ({ROLE_LABEL[staff.role].toLowerCase()}) y {label} es de otro
        rol.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={HOME[staff.role]} className={buttonClasses({})}>
          Ir a mi pantalla
        </Link>
        <Button variant="secondary" onClick={authActions.logout}>
          <LogOut aria-hidden /> Entrar con otro usuario
        </Button>
      </div>
    </main>
  );
}

/** Quién entró y el botón para salir; va en el encabezado de cada pantalla del personal. */
export function SessionButton({ className }: { className?: string }) {
  const staff = useCurrentStaff();
  if (!staff) return null;
  return (
    <div className={className}>
      <Button variant="secondary" size="sm" onClick={accountActions.signOut}>
        <LogOut aria-hidden />
        <span className="hidden sm:inline">{staff.name} ·</span> Salir
        <span className="sr-only"> de la sesión de {staff.name}</span>
      </Button>
    </div>
  );
}
