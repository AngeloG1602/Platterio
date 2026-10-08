"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PlatterioLogo } from "@/components/brand/logos";
import { Badge } from "@/components/ui/chip";
import { Button, buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { accountActions, useCurrentAccount, useHydrated } from "@/lib/data";

/** Marco de las pantallas de cuenta: logo, tarjeta y aviso de que es una versión de prueba. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const hydrated = useHydrated();
  const account = useCurrentAccount();
  return (
    <div className="bg-bg flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-5xl px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Platterio, inicio" className="inline-block">
          <PlatterioLogo />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-4 pb-12">
        {!hydrated ? (
          <div aria-busy aria-label="Cargando">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="mt-6 h-14 rounded-lg" />
            <Skeleton className="mt-3 h-14 rounded-lg" />
          </div>
        ) : account ? (
          <AlreadySignedIn
            businessName={account.businessName}
            email={account.email}
            slug={account.slug}
          />
        ) : (
          <>
            <h1 className="font-display text-[34px] leading-tight font-semibold">{title}</h1>
            <p className="text-ink-soft mt-2 text-[16px]">{subtitle}</p>
            <div className="border-line bg-surface shadow-card mt-6 rounded-2xl border p-5">
              {children}
            </div>
            <p className="text-ink-soft mt-5 text-center text-[15px]">{footer}</p>
            <p className="border-line text-muted mt-8 rounded-xl border border-dashed p-3 text-[13px]">
              <Badge tone="warning" className="mr-1.5 align-middle">
                Versión de prueba
              </Badge>
              Por ahora tu cuenta se guarda solo en este navegador, para que puedas probar todo el
              recorrido. La seguridad real de las cuentas llega con la base de datos.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function AlreadySignedIn({
  businessName,
  email,
  slug,
}: {
  businessName: string;
  email: string;
  slug: string;
}) {
  return (
    <div>
      <h1 className="font-display text-[30px] leading-tight font-semibold">Ya iniciaste sesión</h1>
      <p className="text-ink-soft mt-2 text-[16px]">
        Estás dentro de <b>{businessName}</b> con {email}.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href={`/${slug}/admin`} className={buttonClasses({ size: "lg" })}>
          Ir a mi panel
        </Link>
        <Button variant="secondary" size="lg" onClick={accountActions.signOut}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
