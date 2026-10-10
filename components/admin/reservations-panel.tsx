"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { reservationConfigActions, useReservationConfig } from "@/lib/data";
import type { ReservationConfig } from "@/lib/domain/types";
import { Panel } from "./ui/page-header";

/** Reservas y eventos: horario, cupo, confirmación automática y motivos de evento. */
export function ReservationsPanel() {
  const saved = useReservationConfig();
  // Si cambia desde otra pestaña, se reinicia el borrador.
  return <ReservationsForm key={JSON.stringify(saved)} saved={saved} />;
}

const num = (text: string) => Number(text.replace(/\D/g, ""));

function ReservationsForm({ saved }: { saved: ReservationConfig }) {
  const [draft, setDraft] = useState<ReservationConfig>(saved);
  const [occasion, setOccasion] = useState("");
  const [error, setError] = useState<string>();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = (p: Partial<ReservationConfig>) => {
    setDraft((d) => ({ ...d, ...p }));
    setError(undefined);
  };
  const patchEvents = (p: Partial<ReservationConfig["events"]>) =>
    patch({ events: { ...draft.events, ...p } });

  return (
    <Panel
      title="Reservas y eventos"
      description="Lo que el cliente ve en /reservas. Los cambios se aplican al guardar."
      action={
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() => {
            const r = reservationConfigActions.save(draft);
            if (!r.ok) return setError(r.error);
            toast.success("Reservas guardadas");
          }}
        >
          Guardar cambios
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col">
          <Switch
            label="Recibir reservas"
            checked={draft.enabled}
            onChange={(enabled) => patch({ enabled })}
          />
          <Switch
            label="Confirmar solas las reservas de mesa con cupo"
            description="Si lo apagas, tú confirmas cada una desde Caja."
            checked={draft.autoConfirm}
            onChange={(autoConfirm) => patch({ autoConfirm })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Primera hora">
            {(p) => (
              <Input
                {...p}
                value={draft.opensAt}
                onChange={(e) => patch({ opensAt: e.target.value })}
              />
            )}
          </Field>
          <Field label="Última hora">
            {(p) => (
              <Input
                {...p}
                value={draft.closesAt}
                onChange={(e) => patch({ closesAt: e.target.value })}
              />
            )}
          </Field>
          <Field label="Una hora cada">
            {(p) => (
              <Select
                {...p}
                value={draft.slotMin}
                onChange={(e) => patch({ slotMin: Number(e.target.value) })}
              >
                {[15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minutos
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Cupo por hora" hint="Personas">
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={draft.capacityPerSlot}
                onChange={(e) => patch({ capacityPerSlot: num(e.target.value) })}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Máximo por mesa" hint="Personas">
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={draft.maxParty}
                onChange={(e) => patch({ maxParty: num(e.target.value) })}
              />
            )}
          </Field>
          <Field label="Anticipación mínima" hint="Horas">
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={draft.minHours}
                onChange={(e) => patch({ minHours: num(e.target.value) })}
              />
            )}
          </Field>
          <Field label="Anticipación máxima" hint="Días">
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={draft.advanceDays}
                onChange={(e) => patch({ advanceDays: num(e.target.value) })}
              />
            )}
          </Field>
        </div>

        <section aria-labelledby="eventos" className="border-line border-t pt-4">
          <h3 id="eventos" className="text-[15px] font-semibold">
            Eventos
          </h3>
          <Switch
            label="Recibir solicitudes de eventos"
            description="Celebraciones y reuniones grandes: el cliente cuenta qué busca y tú le envías una cotización."
            checked={draft.events.enabled}
            onChange={(enabled) => patchEvents({ enabled })}
          />
          {draft.events.enabled && (
            <>
              <Field label="Eventos desde" hint="Personas" className="mt-3 max-w-40">
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    value={draft.events.minPeople}
                    onChange={(e) => patchEvents({ minPeople: num(e.target.value) })}
                  />
                )}
              </Field>
              <p className="mt-4 text-sm font-medium">Motivos que puede elegir el cliente</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {draft.events.occasions.map((o) => (
                  <li
                    key={o}
                    className="bg-surface-2 flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm font-medium"
                  >
                    {o}
                    <IconButton
                      label={`Quitar ${o}`}
                      variant="ghost"
                      className="size-8"
                      onClick={() =>
                        patchEvents({ occasions: draft.events.occasions.filter((x) => x !== o) })
                      }
                    >
                      <X aria-hidden />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <form
                className="mt-3 flex max-w-sm gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = occasion.trim();
                  if (!name) return;
                  patchEvents({ occasions: [...draft.events.occasions, name] });
                  setOccasion("");
                }}
              >
                <Input
                  aria-label="Nuevo motivo de evento"
                  value={occasion}
                  maxLength={40}
                  placeholder="Ej.: Matrimonio"
                  onChange={(e) => setOccasion(e.target.value)}
                />
                <Button type="submit" variant="secondary">
                  <Plus aria-hidden /> Agregar
                </Button>
              </form>
            </>
          )}
        </section>

        {error && (
          <p role="alert" className="text-danger-ink text-sm font-medium">
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
}
