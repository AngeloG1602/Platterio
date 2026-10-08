"use client";

import { Check, Download, ExternalLink, Plus, Trash2 } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
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
} from "@/lib/data";
import { isValidHex, strongVariant } from "@/lib/domain/color";
import type { Table } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { TableAssignments } from "@/components/team/table-assignments";
import { BrandIdentityPanel } from "./brand-panel";
import { DeliveryPanel } from "./delivery-panel";
import { LocalePanel } from "./locale-panel";
import { PageHeader, Panel } from "./ui/page-header";
import { useBusinessHref } from "@/components/providers/business-scope";

const PRESETS = ["#E4572E", "#2F7A4F", "#2D5FA3", "#D69A1E", "#8C2F4B", "#1C1917"];

/** Configuración (US-21, US-27, US-34): marca, umbrales, mesas con QR y meseros. */
export function SettingsAdmin() {
  const href = useBusinessHref();
  const hydrated = useHydrated();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Lo que cambies aquí se aplica al instante en todas las vistas."
      />
      {hydrated ? (
        <>
          <BrandIdentityPanel />
          <div className="grid gap-6 lg:grid-cols-2">
            <BrandPanel />
            <RulesPanel />
          </div>
          <LocalePanel />
          <DeliveryPanel />
          <TablesPanel />
          <TableAssignments teamHref={href("/admin/equipo")} />
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

const IDLE_OPTIONS = [10, 15, 30, 45, 60, 90, 120, 180, 240];

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium">Cierre automático de mesas</p>
            <p className="text-muted max-w-sm text-[13px]">
              Una mesa se cierra sola cuando no tiene pedidos por entregar y pasan estos minutos sin
              actividad. El mesero puede cambiarlo para una mesa en particular.
            </p>
          </div>
          <Select
            className="h-11 w-36"
            aria-label="Minutos sin actividad para cerrar la mesa"
            value={restaurant.sessionIdleMin}
            onChange={(e) => {
              const r = configActions.setSessionIdle(Number(e.target.value));
              if (r.ok) toast.success("Cierre automático actualizado");
              else toast.error(r.error);
            }}
          >
            {[...new Set([...IDLE_OPTIONS, restaurant.sessionIdleMin])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
          </Select>
        </div>
      </div>
    </Panel>
  );
}

function TablesPanel() {
  const href = useBusinessHref();
  const tables = useTables();
  const openTables = useOpenTableNumbers();
  // Este panel solo se monta en el cliente (después de hidratar), así que window existe.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const [removing, setRemoving] = useState<Table | null>(null);

  return (
    <Panel
      title="Mesas y códigos QR"
      description="Imprime el QR de cada mesa: es fijo. Al escanearlo, el cliente entra con el PIN que le da el mesero al abrir la mesa."
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
                  value={`${origin}${href(`/mesa/${t.number}`)}`}
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
                href={href(`/mesa/${t.number}`)}
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
  const href = useBusinessHref();
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
            value={`${origin}${href(`/mesa/${table.number}`)}`}
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
