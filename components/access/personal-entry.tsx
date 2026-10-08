"use client";

import { ArrowRight, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginScreen } from "@/components/access/login-screen";
import { PlatterioLogo } from "@/components/brand/logos";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountsStore, useHydrated } from "@/lib/data";
import { HOME } from "@/lib/domain/access";
import { withBusiness } from "@/lib/domain/routes";

/**
 * Entrada del personal desde la dirección general: primero el código del negocio (su dirección
 * corta) y luego el PIN personal. Quien llega por la dirección de su negocio salta el primer paso.
 */
export function PersonalEntry() {
  const router = useRouter();
  const hydrated = useHydrated();
  const accounts = useAccountsStore((s) => s.accounts);
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  if (!hydrated) return <Skeleton className="mx-auto mt-10 h-96 max-w-md rounded-2xl" />;

  const business = accounts.find((a) => a.slug === slug);
  if (slug && business) {
    return (
      <LoginScreen
        title={`Entrar a ${business.businessName}`}
        subtitle="Escribe el PIN que te dio el administrador. Cada persona tiene el suyo."
        onSuccess={(user) => router.push(withBusiness(slug, HOME[user.role]))}
      />
    );
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toLowerCase();
    if (!accounts.some((a) => a.slug === normalized)) {
      setError("No encontramos un negocio con ese código. Pídeselo a tu administrador.");
      return;
    }
    setError(undefined);
    setSlug(normalized);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Link href="/" aria-label="Platterio, inicio" className="self-start">
        <PlatterioLogo />
      </Link>
      <span className="bg-accent-soft text-accent-strong mt-10 flex size-14 items-center justify-center rounded-2xl">
        <Store className="size-6" aria-hidden />
      </span>
      <h1 className="font-display mt-5 text-[34px] leading-tight font-semibold">
        Entrada del personal
      </h1>
      <p className="text-ink-soft mt-2 text-[16px]">
        Escribe el código de tu negocio y después tu PIN. No necesitas correo.
      </p>
      <form onSubmit={next} noValidate className="mt-6 flex flex-col gap-4">
        <Field
          label="Código del negocio"
          hint="Es la dirección corta de tu negocio, por ejemplo casa-verde."
          error={error}
        >
          {(p) => (
            <Input
              {...p}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="none"
              autoComplete="off"
              autoFocus
              placeholder="casa-verde"
            />
          )}
        </Field>
        <Button type="submit" size="lg" block disabled={!code.trim()}>
          Continuar <ArrowRight aria-hidden />
        </Button>
      </form>
      <p className="text-ink-soft mt-8 text-[15px]">
        ¿Eres el dueño?{" "}
        <Link href="/iniciar-sesion" className="text-accent-strong font-semibold underline">
          Entra con tu correo
        </Link>
        .
      </p>
    </main>
  );
}
