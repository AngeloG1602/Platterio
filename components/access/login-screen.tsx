"use client";

import { KeyRound, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RestaurantMark } from "@/components/brand/logos";
import { buttonClasses, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { authActions, useRestaurant, useStaff } from "@/lib/data";
import { ROLE_LABEL, type StaffUser } from "@/lib/domain/access";

/**
 * Entrada del personal: el PIN identifica a cada persona. En el prototipo se listan los
 * usuarios de la demo con su PIN para poder probar cada rol; en un negocio real eso no existe.
 */
export function LoginScreen({
  title = "Entra con tu PIN",
  subtitle,
  onSuccess,
}: {
  title?: string;
  subtitle?: string;
  onSuccess?: (user: StaffUser) => void;
}) {
  const restaurant = useRestaurant();
  const staff = useStaff();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = authActions.login(pin);
    if (!r.ok) {
      setError(r.error);
      setPin("");
      return;
    }
    setError(null);
    setPin("");
    if (r.user) onSuccess?.(r.user);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <RestaurantMark name={restaurant.name} className="text-[15px]" />
      <span className="bg-accent-soft text-accent-strong mt-10 flex size-14 items-center justify-center rounded-2xl">
        <Lock className="size-6" aria-hidden />
      </span>
      <h1 className="font-display mt-5 text-[34px] leading-tight font-semibold">{title}</h1>
      <p className="text-ink-soft mt-2 text-[16px]">
        {subtitle ?? "Escribe el PIN que te dio el administrador. Cada persona tiene el suyo."}
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3" noValidate>
        <label htmlFor="pin" className="text-ink text-sm font-medium">
          PIN
        </label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          aria-invalid={!!error}
          aria-describedby={error ? "pin-error" : undefined}
          className="h-14 text-center text-2xl tracking-[0.5em]"
          placeholder="••••"
        />
        {error && (
          <p id="pin-error" role="alert" className="text-danger-ink text-sm font-medium">
            {error}. Revisa los números e intenta de nuevo.
          </p>
        )}
        <Button type="submit" size="lg" block disabled={pin.length < 4}>
          <KeyRound aria-hidden /> Entrar
        </Button>
      </form>

      <details className="border-line bg-surface mt-8 rounded-2xl border p-4">
        <summary className="cursor-pointer text-[15px] font-semibold">
          Usuarios de la demo
          <Badge tone="warning" className="ml-2 align-middle">
            Solo en la demo
          </Badge>
        </summary>
        <p className="text-muted mt-2 text-[13px]">
          Para probar cada rol sin escribir el PIN. En un negocio real, los PIN no se muestran.
        </p>
        <ul className="divide-line mt-2 divide-y">
          {staff
            .filter((u) => u.active)
            .map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">{u.name}</span>
                  <span className="text-muted text-[13px]">
                    {ROLE_LABEL[u.role]} · PIN <span className="tabular-nums">{u.pin}</span>
                  </span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    authActions.loginAsDemo(u.id);
                    onSuccess?.(u);
                  }}
                >
                  Entrar<span className="sr-only"> como {u.name}</span>
                </Button>
              </li>
            ))}
        </ul>
      </details>

      <Link
        href="/"
        className={buttonClasses({ variant: "ghost", className: "mt-auto self-center" })}
      >
        Volver al hub de demo
      </Link>
    </main>
  );
}
