"use client";

import { ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { restaurantActions, useRestaurant } from "@/lib/data";
import { Panel } from "./ui/page-header";

/** Enlace de reseñas de Google: después de calificar, a todos los clientes se les invita a dejar la suya. */
export function GoogleReviewsPanel() {
  const { googleReviewUrl } = useRestaurant();
  // Si cambia desde otra pestaña, se reinicia el campo.
  return <GoogleReviewsForm key={googleReviewUrl ?? "sin-enlace"} saved={googleReviewUrl} />;
}

function GoogleReviewsForm({ saved }: { saved: string | undefined }) {
  const [value, setValue] = useState(saved ?? "");
  const [error, setError] = useState<string>();

  function save() {
    const r = restaurantActions.setGoogleReviewUrl(value);
    if (!r.ok) return setError(r.error);
    setError(undefined);
    toast.success("Enlace de reseñas guardado");
  }

  return (
    <Panel
      title="Reseñas en Google"
      description="Después de calificar, tus clientes ven una invitación para dejar su reseña en tu perfil de Google. Es voluntaria y llega a todos por igual."
      action={
        saved ? <Badge tone="success">Enlazado</Badge> : <Badge tone="warning">Sin enlazar</Badge>
      }
    >
      <div className="flex flex-col gap-4">
        <ol className="text-ink-soft list-decimal space-y-1 pl-5 text-[14px]">
          <li>
            Busca tu negocio en Google Maps (o entra a tu Perfil de Negocio de Google) con la cuenta
            con la que lo administras.
          </li>
          <li>
            Toca <b>Pedir reseñas</b> (o “Compartir formulario de reseñas”) y copia el enlace. Se ve
            como <code>g.page/r/…</code>.
          </li>
          <li>
            Pégalo aquí y guarda. Si prefieres, también sirve el identificador del lugar (ChIJ…).
          </li>
        </ol>
        <Field label="Enlace o identificador de tu negocio en Google" error={error}>
          {(p) => (
            <Input
              {...p}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(undefined);
              }}
              autoCapitalize="none"
              placeholder="https://g.page/r/…"
            />
          )}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={!value.trim() || value.trim() === saved}>
            <Star aria-hidden /> Guardar enlace
          </Button>
          {saved && (
            <>
              <a
                href={saved}
                target="_blank"
                rel="noreferrer"
                className="border-line-strong hover:bg-surface-2 text-ink inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-[15px] font-medium"
              >
                <ExternalLink className="size-4" aria-hidden /> Probar el enlace
                <span className="sr-only"> en otra pestaña</span>
              </a>
              <Button
                variant="ghost"
                onClick={() => {
                  restaurantActions.setGoogleReviewUrl(null);
                  toast.success("Enlace quitado");
                }}
              >
                Quitar
              </Button>
            </>
          )}
        </div>
        <p className="text-muted text-[13px]">
          Google pide invitar a todos los clientes por igual y no escoger solo a los contentos, por
          eso Platterio se la muestra a todos los que califican. Ver y responder tus reseñas desde
          aquí llegará con las cuentas reales, conectando tu Perfil de Negocio de Google.
        </p>
      </div>
    </Panel>
  );
}
