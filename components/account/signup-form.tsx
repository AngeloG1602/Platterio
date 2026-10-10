"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { accountActions } from "@/lib/data";
import { PLANS, TRIAL_DAYS } from "@/lib/data/plans";
import type { SignupErrors } from "@/lib/domain/accounts";
import { AuthShell } from "./auth-shell";
import { PasswordInput } from "./password-field";

/** Registro del dueño: crea su negocio y empieza la prueba gratis, sin tarjeta. */
export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get("plan");
  const founder = params.get("fundador") === "1";
  const plan = PLANS.find((p) => p.id === planId);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<SignupErrors & { terms?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!accepted) {
      setErrors({ terms: "Para crear la cuenta debes aceptar los términos" });
      return;
    }
    setBusy(true);
    const r = await accountActions.signUp({
      businessName,
      email,
      password,
      ...(plan ? { plan: plan.id } : {}),
    });
    setBusy(false);
    if (!r.ok) {
      setErrors({ ...r.fields, ...(r.fields ? {} : { form: r.error }) });
      return;
    }
    router.push(`/${r.account.slug}/admin`);
  }

  return (
    <AuthShell
      title={`Prueba Platterio ${TRIAL_DAYS} días gratis`}
      subtitle="Crea tu cuenta y arma tu carta. No pedimos tarjeta para empezar."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/iniciar-sesion" className="text-accent-strong font-semibold underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {plan && (
          <p className="bg-accent-soft text-accent-strong rounded-lg px-3 py-2 text-[14px] font-semibold">
            Plan elegido: {plan.name}
            {founder ? " (oferta Fundador)" : ""}. Podrás cambiarlo cuando quieras.
          </p>
        )}
        <Field label="Nombre de tu negocio" error={errors.businessName}>
          {(p) => (
            <Input
              {...p}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              autoComplete="organization"
              placeholder="Ej.: Fogón 27"
              maxLength={60}
            />
          )}
        </Field>
        <Field label="Correo" error={errors.email}>
          {(p) => (
            <Input
              {...p}
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
            />
          )}
        </Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres." error={errors.password}>
          {(p) => (
            <PasswordInput
              {...p}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>
        <div>
          <label className="flex items-start gap-3 text-[14px]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              aria-describedby={errors.terms ? "terminos-error" : undefined}
              className="accent-accent-strong mt-0.5 size-5 shrink-0"
            />
            <span className="text-ink-soft">
              Acepto los términos de uso y la política de tratamiento de datos personales.
            </span>
          </label>
          {errors.terms && (
            <p
              id="terminos-error"
              role="alert"
              className="text-danger-ink mt-1.5 text-[13px] font-medium"
            >
              {errors.terms}
            </p>
          )}
        </div>
        {errors.form && (
          <p role="alert" className="text-danger-ink text-[14px] font-medium">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? "Creando tu cuenta…" : "Crear mi cuenta"} <ArrowRight aria-hidden />
        </Button>
      </form>
    </AuthShell>
  );
}
