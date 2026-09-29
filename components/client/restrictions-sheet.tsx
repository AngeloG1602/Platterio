"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { ALLERGEN_ICON } from "@/components/ui/allergen";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { deviceActions } from "@/lib/data";
import { ALLERGEN_LABEL } from "@/lib/domain/allergens";
import { ALLERGENS, type Allergen } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

/**
 * Pregunta opcional por alergias o dieta (US-16). No bloquea: la carta avisa y el recomendador
 * no sugiere esos platos. Se guarda por dispositivo.
 */
export function RestrictionsSheet({
  open,
  onOpenChange,
  initial,
  firstTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Allergen[];
  firstTime: boolean;
}) {
  const [selected, setSelected] = useState<Allergen[]>(initial);
  const toggle = (a: Allergen) =>
    setSelected((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));

  function save(next: Allergen[]) {
    deviceActions.setRestrictions(next);
    onOpenChange(false);
    if (next.length > 0) {
      toast.success("Listo, lo tendremos en cuenta", {
        description: `Te avisamos si un plato tiene ${next.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(", ")}.`,
      });
    } else if (!firstTime) {
      toast.success("Quitaste tus restricciones");
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o && firstTime) deviceActions.setRestrictions(initial);
        onOpenChange(o);
      }}
      title={firstTime ? "¿Tienes alguna alergia?" : "Tus restricciones"}
      description="Te avisamos en la carta y no te recomendamos esos platos. Puedes cambiarlo cuando quieras."
      footer={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => save(firstTime ? [] : selected.length ? [] : initial)}
          >
            {firstTime ? "Omitir" : selected.length ? "Quitar todas" : "Cancelar"}
          </Button>
          <Button className="flex-[1.6]" onClick={() => save(selected)}>
            {selected.length === 0 ? "No tengo restricciones" : `Guardar (${selected.length})`}
          </Button>
        </div>
      }
    >
      <fieldset>
        <legend className="sr-only">Alérgenos</legend>
        <div className="grid grid-cols-2 gap-2 pb-2">
          {ALLERGENS.map((a) => {
            const Icon = ALLERGEN_ICON[a];
            const active = selected.includes(a);
            return (
              <button
                key={a}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(a)}
                className={cn(
                  "flex h-13 items-center gap-2.5 rounded-xl border px-3.5 text-left text-[15px] font-medium transition-colors",
                  active
                    ? "border-ink bg-ink text-bg"
                    : "border-line-strong bg-surface text-ink hover:border-ink/40",
                )}
              >
                <Icon
                  className={cn("size-5 shrink-0", active ? "text-bg" : "text-muted")}
                  strokeWidth={1.7}
                  aria-hidden
                />
                <span className="flex-1">{ALLERGEN_LABEL[a]}</span>
                {active && <Check className="size-4" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>
    </Sheet>
  );
}
