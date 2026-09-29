"use client";

import { Check, Download, ExternalLink, Plus, TriangleAlert, Trash2, UserPlus } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  configActions,
  restaurantActions,
  useHydrated,
  useOpenTableNumbers,
  useRestaurant,
  useTables,
  useWaiters,
} from "@/lib/data";
import { isValidHex, strongVariant } from "@/lib/domain/color";
import type { Table } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { PageHeader, Panel } from "./ui/page-header";

const PRESETS = ["#E4572E", "#2F7A4F", "#2D5FA3", "#D69A1E", "#8C2F4B", "#1C1917"];

/** Configuración (US-21, US-27, US-34): marca, umbrales, mesas con QR y meseros. */
export function SettingsAdmin() {
  const hydrated = useHydrated();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Lo que cambies aquí se aplica al instante en todas las vistas."
      />
      {hydrated ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <BrandPanel />
            <RulesPanel />
          </div>
          <TablesPanel />
          <WaitersPanel />
        </>
      ) : (
        <Skeleton className="h-96 rounded-2xl" />
      )}
    </div>
  );
}

function BrandPanel() {
  const restaurant = useRestaurant();
  // Se reinicia el campo cuando el color cambia desde otra pestaña.
  return <BrandForm key={restaurant.accentColor} />;
}

function BrandForm() {
  const restaurant = useRestaurant();
  const [hex, setHex] = useState(restaurant.accentColor);
  const apply = (value: string) => {
    if (!isValidHex(value)) return toast.error("Escribe un color en formato #RRGGBB");
    restaurantActions.setAccentColor(
      value.startsWith("#") ? value.toUpperCase() : `#${value.toUpperCase()}`,
    );
    toast.success("Color del restaurante actualizado");
  };
  return (
    <Panel
      title="Color del restaurante"
      description="Lo ve el cliente en botones, pestañas y recomendados. Platterio calcula una versión con buen contraste para textos y botones."
    >
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colores sugeridos">
        {PRESETS.map((c) => {
          const active = restaurant.accentColor.toUpperCase() === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={c}
              onClick={() => apply(c)}
              className={cn(
                "ring-offset-surface flex size-11 items-center justify-center rounded-full ring-offset-2 transition",
                active && "ring-ink ring-2",
              )}
              style={{ background: c }}
            >
              {active && <Check className="size-5 text-white" aria-hidden />}
            </button>
          );
        })}
      </div>
      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply(hex.trim());
        }}
      >
        <div className="flex-1">
          <label htmlFor="hex" className="mb-1.5 block text-sm font-medium">
            Color personalizado
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="Elegir color"
              value={isValidHex(hex) ? (hex.startsWith("#") ? hex : `#${hex}`) : "#E4572E"}
              onChange={(e) => setHex(e.target.value.toUpperCase())}
              className="border-line-strong bg-surface h-11 w-14 cursor-pointer rounded-lg border p-1"
            />
            <Input
              id="hex"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              maxLength={7}
              className="font-mono"
            />
          </div>
        </div>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>
      <div className="bg-surface-2 mt-4 flex items-center gap-3 rounded-xl p-3 text-sm">
        <span
          className="rounded-lg px-3 py-2 font-semibold text-white"
          style={{ background: strongVariant(restaurant.accentColor) }}
        >
          Agregar al pedido
        </span>
        <span className="text-muted">Así se ve un botón en la carta.</span>
      </div>
    </Panel>
  );
}

function RulesPanel() {
  const restaurant = useRestaurant();
  return (
    <Panel title="Alertas y tiempos">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-[15px] font-medium">Umbral de alerta de servicio</p>
          <p className="text-muted mb-2 text-[13px]">
            Se alerta cuando una mesa califica el servicio por debajo de este número.
          </p>
          <Segmented
            label="Umbral de estrellas"
            value={String(restaurant.serviceAlertThreshold) as "1" | "2" | "3" | "4" | "5"}
            onChange={(v) => {
              const r = configActions.setThreshold(Number(v));
              if (r.ok)
                toast.success(`Alerta con menos de ${v} ${v === "1" ? "estrella" : "estrellas"}`);
            }}
            options={(["1", "2", "3", "4", "5"] as const).map((v) => ({
              value: v,
              label: `${v} ★`,
            }))}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium">Tiempo límite de confirmación</p>
            <p className="text-muted text-[13px]">
              La tarjeta del mesero se pone en alerta a los {restaurant.confirmTimeoutMin} min y se
              avisa al administrador a los {restaurant.confirmTimeoutMin * 2} min.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <QtyStepper
              value={restaurant.confirmTimeoutMin}
              min={1}
              max={30}
              label="Minutos"
              onChange={(v) => configActions.setConfirmTimeout(v)}
            />
            <span className="text-muted text-sm">min</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TablesPanel() {
  const tables = useTables();
  const openTables = useOpenTableNumbers();
  // Este panel solo se monta en el cliente (después de hidratar), así que window existe.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const [removing, setRemoving] = useState<Table | null>(null);

  return (
    <Panel
      title="Mesas y códigos QR"
      description="Imprime el QR de cada mesa. Al escanearlo, el cliente abre la carta de esa mesa."
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            configActions.addTable();
            toast.success(`Mesa ${Math.max(0, ...tables.map((t) => t.number)) + 1} agregada`);
          }}
        >
          <Plus aria-hidden /> Agregar mesa
        </Button>
      }
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tables.map((t) => (
          <li key={t.id} className="border-line flex flex-col items-center rounded-xl border p-3">
            <div className="flex w-full items-center justify-between">
              <p className="font-display text-lg font-semibold">Mesa {t.number}</p>
              <IconButton
                label={`Quitar Mesa ${t.number}`}
                className="text-muted size-9"
                onClick={() => setRemoving(t)}
              >
                <Trash2 aria-hidden />
              </IconButton>
            </div>
            <div className="mt-1 rounded-lg bg-white p-2">
              {origin ? (
                <QRCodeSVG
                  value={`${origin}/mesa/${t.number}`}
                  size={112}
                  level="M"
                  aria-label={`Código QR de la Mesa ${t.number}`}
                  role="img"
                />
              ) : (
                <Skeleton className="size-28" />
              )}
            </div>
            <p className="text-muted mt-1 text-xs">
              {openTables.includes(t.number) ? "Con clientes" : "Libre"}
            </p>
            <div className="mt-2 flex w-full gap-1">
              <QrDownload table={t} origin={origin} />
              <a
                href={`/mesa/${t.number}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Abrir la Mesa ${t.number} en otra pestaña`}
                className="text-muted hover:bg-surface-2 hover:text-ink flex size-9 items-center justify-center rounded-md"
              >
                <ExternalLink className="size-4" aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`¿Quitar la Mesa ${removing?.number ?? ""}?`}
        description="Su QR dejará de funcionar y se quitará de los meseros. El historial de ventas se conserva."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removing) {
                  const r = configActions.removeTable(removing.id);
                  if (r.ok) toast(`Mesa ${removing.number} quitada`);
                  else toast.error(r.error);
                }
                setRemoving(null);
              }}
            >
              Quitar mesa
            </Button>
          </>
        }
      />
    </Panel>
  );
}

/** Descarga una tarjeta imprimible (PNG) con el nombre del restaurante, la mesa y el QR. */
function QrDownload({ table, origin }: { table: Table; origin: string }) {
  const restaurant = useRestaurant();
  const holder = useRef<HTMLDivElement>(null);
  function download() {
    const qr = holder.current?.querySelector("canvas");
    if (!qr) return;
    const card = document.createElement("canvas");
    card.width = 600;
    card.height = 780;
    const ctx = card.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, card.width, card.height);
    ctx.fillStyle = "#1C1917";
    ctx.textAlign = "center";
    ctx.font = "600 40px 'Fraunces Variable', Georgia, serif";
    ctx.fillText(restaurant.name, 300, 80);
    ctx.fillStyle = strongVariant(restaurant.accentColor);
    ctx.font = "700 64px 'Inter Variable', sans-serif";
    ctx.fillText(`Mesa ${table.number}`, 300, 165);
    ctx.drawImage(qr, 100, 200, 400, 400);
    ctx.fillStyle = "#44403C";
    ctx.font = "500 26px 'Inter Variable', sans-serif";
    ctx.fillText("Escanea para ver la carta y pedir", 300, 660);
    ctx.fillStyle = "#716A64";
    ctx.font = "400 20px 'Inter Variable', sans-serif";
    ctx.fillText("Hecho con Platterio", 300, 730);
    const a = document.createElement("a");
    a.href = card.toDataURL("image/png");
    a.download = `qr-mesa-${table.number}.png`;
    a.click();
  }
  return (
    <>
      <div ref={holder} className="hidden" aria-hidden>
        {origin && (
          <QRCodeCanvas
            value={`${origin}/mesa/${table.number}`}
            size={400}
            level="M"
            marginSize={1}
          />
        )}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="flex-1"
        onClick={download}
        disabled={!origin}
      >
        <Download aria-hidden /> PNG
      </Button>
    </>
  );
}

function WaitersPanel() {
  const waiters = useWaiters();
  const tables = useTables();
  const [name, setName] = useState("");
  const unassigned = tables.filter((t) => !waiters.some((w) => w.tableIds.includes(t.id)));
  return (
    <Panel
      title="Meseros y mesas"
      description="Cada mesa tiene un solo mesero. Toca una mesa para asignarla o quitarla."
    >
      {unassigned.length > 0 && (
        <p className="bg-warning-soft text-warning-ink mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
          <TriangleAlert className="size-4" aria-hidden />
          Sin mesero: {unassigned.map((t) => `Mesa ${t.number}`).join(", ")}. Sus pedidos no le
          llegarán a nadie.
        </p>
      )}
      <ul className="divide-line flex flex-col divide-y">
        {waiters.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="font-display bg-accent-soft text-accent-strong flex size-10 items-center justify-center rounded-full font-semibold">
              {w.name.charAt(0)}
            </span>
            <span className="w-28 font-semibold">{w.name}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Mesas de ${w.name}`}>
              {tables.map((t) => {
                const on = w.tableIds.includes(t.id);
                const other = waiters.find((x) => x.id !== w.id && x.tableIds.includes(t.id));
                return (
                  <FilterChip
                    key={t.id}
                    selected={on}
                    className="h-9 px-3 text-[13px]"
                    title={other && !on ? `Ahora es de ${other.name}` : undefined}
                    onClick={() => configActions.toggleAssignment(w.id, t.id)}
                  >
                    {on && <Check aria-hidden />} Mesa {t.number}
                    {other && !on && (
                      <span className="text-muted text-xs font-normal">· {other.name}</span>
                    )}
                  </FilterChip>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const r = configActions.addWaiter(name);
          if (!r.ok) return toast.error(r.error);
          toast.success(`${name.trim()} agregado`, {
            description: "Asígnale mesas para que reciba pedidos.",
          });
          setName("");
        }}
      >
        <label htmlFor="nuevo-mesero" className="sr-only">
          Nombre del mesero
        </label>
        <Input
          id="nuevo-mesero"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del nuevo mesero"
          maxLength={24}
        />
        <Button type="submit" variant="secondary">
          <UserPlus aria-hidden /> Agregar
        </Button>
      </form>
    </Panel>
  );
}
