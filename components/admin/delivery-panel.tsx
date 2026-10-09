"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { deliveryConfigActions, useDeliveryConfig } from "@/lib/data";
import { newId } from "@/lib/data/ids";
import { addDriver, DEFAULT_DELIVERY, formatPhone, normalizePhone } from "@/lib/domain/delivery";
import type { DeliveryConfig, DeliveryZone } from "@/lib/domain/types";
import { Panel } from "./ui/page-header";

/** Domicilios y recogida: horario, zonas con tarifa, domiciliarios. Se guarda con el botón. */
export function DeliveryPanel() {
  const saved = useDeliveryConfig() ?? DEFAULT_DELIVERY;
  // Si cambia desde otra pestaña, se reinicia el borrador.
  return <DeliveryForm key={JSON.stringify(saved)} saved={saved} />;
}

const num = (text: string) => Number(text.replace(/\D/g, ""));

function DeliveryForm({ saved }: { saved: DeliveryConfig }) {
  const [draft, setDraft] = useState<DeliveryConfig>(saved);
  const [driver, setDriver] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [error, setError] = useState<string>();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = (p: Partial<DeliveryConfig>) => {
    setDraft((d) => ({ ...d, ...p }));
    setError(undefined);
  };
  const setZone = (id: string, p: Partial<DeliveryZone>) =>
    patch({ zones: draft.zones.map((z) => (z.id === id ? { ...z, ...p } : z)) });

  return (
    <Panel
      title="Domicilios y recogida"
      description="Lo que el cliente ve en /domicilio. Los cambios se aplican al guardar."
      action={
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() => {
            const { whatsapp, ...rest } = draft;
            const wa = whatsapp?.trim();
            const r = deliveryConfigActions.save({
              ...rest,
              ...(wa ? { whatsapp: normalizePhone(wa) ?? wa } : {}),
              zones: draft.zones.map((z) => ({ ...z, name: z.name.trim() })),
            });
            if (!r.ok) return setError(r.error);
            toast.success("Domicilios guardados");
          }}
        >
          Guardar cambios
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col">
          <Switch
            label="Recibir pedidos a domicilio"
            checked={draft.enabled}
            onChange={(enabled) => patch({ enabled })}
          />
          <Switch
            label="Permitir recoger en el local"
            description="Sin envío ni zona."
            checked={draft.pickup}
            onChange={(pickup) => patch({ pickup })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Abre">
            {(p) => (
              <Input
                {...p}
                type="time"
                value={draft.opensAt}
                onChange={(e) => patch({ opensAt: e.target.value })}
              />
            )}
          </Field>
          <Field label="Cierra">
            {(p) => (
              <Input
                {...p}
                type="time"
                value={draft.closesAt}
                onChange={(e) => patch({ closesAt: e.target.value })}
              />
            )}
          </Field>
          <Field label="Preparación (min)" hint="Se suma al tiempo de la zona">
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={draft.prepMin}
                onChange={(e) => patch({ prepMin: num(e.target.value) })}
              />
            )}
          </Field>
        </div>

        <section aria-labelledby="zonas">
          <h3 id="zonas" className="text-[15px] font-semibold">
            Zonas de reparto
          </h3>
          <ul className="mt-2 flex flex-col gap-3">
            {draft.zones.map((z) => (
              <li
                key={z.id}
                className="border-line grid gap-3 rounded-xl border p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:items-end"
              >
                <Field label="Zona">
                  {(p) => (
                    <Input
                      {...p}
                      value={z.name}
                      maxLength={30}
                      onChange={(e) => setZone(z.id, { name: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Envío ($)">
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      value={z.fee}
                      onChange={(e) => setZone(z.id, { fee: num(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Mínimo ($)">
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      value={z.minOrder}
                      onChange={(e) => setZone(z.id, { minOrder: num(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Tiempo (min)">
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      value={z.etaMin}
                      onChange={(e) => setZone(z.id, { etaMin: num(e.target.value) })}
                    />
                  )}
                </Field>
                <IconButton
                  label={`Quitar la zona ${z.name || "sin nombre"}`}
                  variant="ghost"
                  onClick={() => patch({ zones: draft.zones.filter((x) => x.id !== z.id) })}
                >
                  <X aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() =>
              patch({
                zones: [
                  ...draft.zones,
                  { id: newId("zona"), name: "", fee: 5000, minOrder: 25000, etaMin: 30 },
                ],
              })
            }
          >
            <Plus aria-hidden /> Agregar zona
          </Button>
        </section>

        <section aria-labelledby="whatsapp-negocio">
          <h3 id="whatsapp-negocio" className="text-[15px] font-semibold">
            WhatsApp del negocio
          </h3>
          <p className="text-muted text-[13px]">
            El cliente ve un botón para avisarte su pedido por WhatsApp, con todo el detalle ya
            escrito. Además del aviso a Caja, ayuda a hablar rápido con él.
          </p>
          <Field
            label="Número de WhatsApp"
            hint="Celular de 10 dígitos. Déjalo vacío para no mostrar el botón."
          >
            {(p) => (
              <Input
                {...p}
                className="mt-2 max-w-xs"
                inputMode="tel"
                value={draft.whatsapp ?? ""}
                placeholder="300 123 4567"
                onChange={(e) => patch({ whatsapp: e.target.value })}
              />
            )}
          </Field>
        </section>

        <section aria-labelledby="domiciliarios">
          <h3 id="domiciliarios" className="text-[15px] font-semibold">
            Domiciliarios
          </h3>
          <p className="text-muted text-[13px]">
            Con su celular puedes escribirle por WhatsApp el pedido y, si quieres, el cliente lo ve
            cuando el pedido va en camino.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {draft.drivers.map((d) => (
              <li
                key={d.name}
                className="bg-surface-2 flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm font-medium"
              >
                {d.name}
                <span className="text-muted font-normal">
                  {d.phone ? `· ${formatPhone(d.phone)}` : "· sin celular"}
                </span>
                <IconButton
                  label={`Quitar a ${d.name}`}
                  variant="ghost"
                  className="size-8"
                  onClick={() => patch({ drivers: draft.drivers.filter((x) => x.name !== d.name) })}
                >
                  <X aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex max-w-lg flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const r = addDriver(draft, { name: driver, phone: driverPhone });
              if (!r.ok) return setError(r.error);
              patch({ drivers: r.config.drivers });
              setDriver("");
              setDriverPhone("");
            }}
          >
            <Input
              aria-label="Nombre del domiciliario"
              className="w-40"
              value={driver}
              maxLength={30}
              placeholder="Nombre"
              onChange={(e) => setDriver(e.target.value)}
            />
            <Input
              aria-label="Celular del domiciliario"
              className="w-44"
              inputMode="tel"
              value={driverPhone}
              placeholder="Celular (WhatsApp)"
              onChange={(e) => setDriverPhone(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              Agregar
            </Button>
          </form>
          <div className="mt-4">
            <Switch
              label="Mostrar al cliente el contacto del domiciliario"
              description="Cuando el pedido sale, el cliente ve su nombre y puede escribirle o llamarle. Solo se ve mientras va en camino."
              checked={draft.shareDriver !== false}
              onChange={(shareDriver) => patch({ shareDriver })}
            />
          </div>
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
