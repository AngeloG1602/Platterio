"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { accountActions } from "@/lib/data";
import { AuthShell } from "./auth-shell";
import { PasswordInput } from "./password-field";

/** Ingreso del dueño con correo y contraseña. El personal entra con su PIN en su pantalla. */
export function SigninForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Escribe tu correo y tu contraseña");
      return;
    }
    setBusy(true);
    const r = await accountActions.signIn(email, password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setPassword("");
      return;
    }
    router.push("/admin");
  }

  return (
    <AuthShell
      title="Inicia sesión"
      subtitle="Entra a tu negocio con tu correo y tu contraseña."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="text-accent-strong font-semibold underline">
            Prueba 7 días gratis
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Correo">
          {(p) => (
            <Input
              {...p}
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          )}
        </Field>
        <Field label="Contraseña">
          {(p) => (
            <PasswordInput
              {...p}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-danger-ink text-[14px] font-medium">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" block disabled={busy}>
          <LogIn aria-hidden /> {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className="text-muted border-line mt-5 border-t pt-4 text-[14px]">
        ¿Eres mesero, de cocina o de caja? No necesitas correo: entra con tu PIN desde la pantalla
        de tu rol (por ejemplo{" "}
        <Link href="/mesero" className="text-accent-strong font-semibold underline">
          mesero
        </Link>
        ).
      </p>
    </AuthShell>
  );
}
