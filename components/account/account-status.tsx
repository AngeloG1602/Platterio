"use client";

import { Hourglass, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { accountActions, useCurrentAccount } from "@/lib/data";
import { accountStatus, statusMessage, type AccountStatus } from "@/lib/domain/accounts";

/** Estado de la cuenta con sesión abierta (undefined si se usa la demo sin cuenta). */
export function useAccountStatus(): AccountStatus | undefined {
  const account = useCurrentAccount();
  const signedIn = Boolean(account);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!signedIn) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [signedIn]);
  return account ? accountStatus(account, now) : undefined;
}

/** Franja del panel con los días que quedan de la prueba. */
export function TrialBanner() {
  const status = useAccountStatus();
  if (!status || status.state !== "prueba") return null;
  const urgent = status.daysLeft <= 2;
  return (
    <div
      role="status"
      className={
        "mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-[15px] " +
        (urgent
          ? "border-warning/40 bg-warning-soft text-warning-ink"
          : "border-accent-line bg-accent-soft text-accent-strong")
      }
    >
      <Hourglass className="size-5 shrink-0" aria-hidden />
      <span className="font-semibold">{statusMessage(status)}</span>
      <span className="text-ink-soft hidden sm:inline">
        Sin tarjeta. Elige tu plan cuando quieras seguir.
      </span>
      <Link
        href="/#planes"
        className="ml-auto font-semibold underline underline-offset-2"
        aria-label="Ver planes para activar mi cuenta"
      >
        Ver planes
      </Link>
    </div>
  );
}

/** Pantalla que reemplaza al software cuando la prueba o la suscripción terminó. */
export function ExpiredScreen({ email, businessName }: { email: string; businessName: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 text-center">
      <span className="bg-warning-soft text-warning-ink mx-auto flex size-14 items-center justify-center rounded-2xl">
        <Hourglass className="size-6" aria-hidden />
      </span>
      <h1 className="font-display mt-5 text-[32px] leading-tight font-semibold">
        Tu cuenta venció
      </h1>
      <p className="text-ink-soft mt-2 text-[16px]">
        La cuenta de <b>{businessName}</b> ({email}) ya no está vigente. Tus datos están guardados:
        al activar un plan vuelves a entrar a todo, tal como lo dejaste.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/#planes" className={buttonClasses({ size: "lg" })}>
          Ver planes y activar
        </Link>
        <Button variant="secondary" size="lg" onClick={accountActions.signOut}>
          <LogOut aria-hidden /> Cerrar sesión
        </Button>
      </div>
      <div className="border-line mt-8 rounded-xl border border-dashed p-3 text-left">
        <Badge tone="warning">Solo en la demo</Badge>
        <p className="text-muted mt-1.5 text-[13px]">
          Todavía no hay cobros. Para seguir probando, simula que el pago ya entró.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={accountActions.simulateActivation}
        >
          Simular pago (30 días)
        </Button>
      </div>
    </main>
  );
}
