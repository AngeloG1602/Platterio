"use client";

import {
  Clock3,
  FastForward,
  RotateCcw,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import {
  demoActions,
  useConnectedTabs,
  useCurrentSlot,
  useDemoSettings,
  useNow,
  useSyncSupported,
  useTimeSlots,
} from "@/lib/data";
import { formatSlotRange, formatTime, plural } from "@/lib/domain/format";
import { cn } from "@/lib/cn";

const SLOT_ICON: Record<string, LucideIcon> = {
  desayuno: Sunrise,
  almuerzo: Sun,
  tarde: Sunset,
  noche: Moon,
};

const useDemoUi = create<{ open: boolean }>(() => ({ open: false }));

export function openDemoPanel() {
  useDemoUi.setState({ open: true });
}

/**
 * Panel de demo (BRIEF §10): pestaña flotante discreta + hoja con los controles.
 * Se abre también con `?demo=1` en la URL. Con `floating={false}` solo monta la hoja.
 */
export function DemoPanel({
  className,
  floating = true,
}: {
  className?: string;
  floating?: boolean;
}) {
  const open = useDemoUi((s) => s.open);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") === "1") openDemoPanel();
  }, []);

  return (
    <>
      {floating && (
        <button
          type="button"
          onClick={openDemoPanel}
          aria-label="Abrir panel de demo"
          title="Panel de demo"
          className={cn(
            // Pestaña pegada al borde izquierdo: discreta y sin tapar precios ni barras fijas.
            "group fixed top-[58%] left-0 z-40 flex h-12 w-6 items-center justify-center rounded-r-lg",
            "border-line bg-surface/85 text-muted shadow-card border border-l-0 backdrop-blur",
            "hover:text-ink transition-[width,color] hover:w-9 focus-visible:w-9",
            // Zona táctil de 44 px sin agrandar la pestaña.
            "before:absolute before:inset-y-0 before:left-0 before:w-11 before:content-['']",
            className,
          )}
        >
          <WandSparkles className="size-3.5" aria-hidden />
        </button>
      )}
      <DemoSheet open={open} onOpenChange={(o) => useDemoUi.setState({ open: o })} />
    </>
  );
}

export function DemoSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const slots = useTimeSlots();
  const demo = useDemoSettings();
  const current = useCurrentSlot();
  const now = useNow();
  const tabs = useConnectedTabs();
  const syncSupported = useSyncSupported();
  const [confirmReset, setConfirmReset] = useState(false);
  const fast = demo.clock.scale > 1;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Panel de demo"
        description="Controles para la presentación. El cliente real no ve este panel."
      >
        <div className="flex flex-col gap-6 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Hora de la demo"
              value={formatTime(new Date(now))}
              icon={<Clock3 className="size-3.5" aria-hidden />}
            />
            <Stat
              label="En vivo"
              value={syncSupported ? plural(tabs, "pestaña", "pestañas") : "Sin sincronía"}
              icon={
                <span className="relative flex size-2.5" aria-hidden>
                  <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-50" />
                  <span className="bg-success relative inline-flex size-2.5 rounded-full" />
                </span>
              }
            />
          </div>

          <section aria-labelledby="demo-franja">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 id="demo-franja" className="text-[15px] font-semibold">
                Hora simulada
              </h3>
              <span className="text-muted text-[13px]">
                {current.upcoming
                  ? `Fuera de horario · sigue ${current.slot?.name.toLowerCase() ?? ""}`
                  : `Ahora: ${current.slot?.name ?? "—"}${current.simulated ? " (simulada)" : ""}`}
              </span>
            </div>
            <div role="radiogroup" aria-labelledby="demo-franja" className="grid grid-cols-2 gap-2">
              <SlotOption
                active={demo.slotOverride === null}
                onClick={() => demoActions.setSlotOverride(null)}
                icon={Clock3}
                title="Automática"
                hint="Según el reloj"
                className="col-span-2"
              />
              {slots.map((slot) => (
                <SlotOption
                  key={slot.id}
                  active={demo.slotOverride === slot.id}
                  onClick={() => demoActions.setSlotOverride(slot.id)}
                  icon={SLOT_ICON[slot.id] ?? Clock3}
                  title={slot.name}
                  hint={formatSlotRange(slot.start, slot.end)}
                />
              ))}
            </div>
          </section>

          <section className="border-line rounded-xl border p-4">
            <Switch
              checked={fast}
              onChange={(on) => {
                demoActions.setTimeScale(on ? 10 : 1);
                toast.success(
                  on ? "El tiempo corre 10 veces más rápido" : "El tiempo volvió a la normalidad",
                );
              }}
              label="Acelerar el tiempo ×10"
              description="Las alertas de pedidos sin confirmar salen en segundos."
            />
            {fast && (
              <p className="text-accent-strong mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium">
                <FastForward className="size-4" aria-hidden /> Tiempo acelerado activo
              </p>
            )}
          </section>

          <section>
            <Button variant="secondary" block onClick={() => setConfirmReset(true)}>
              <RotateCcw aria-hidden /> Reiniciar datos
            </Button>
            <p className="text-muted mt-2 text-center text-[13px]">
              Vuelve al catálogo inicial y a 14 días de historial nuevos. Afecta a todas las
              pestañas.
            </p>
          </section>
        </div>
      </Sheet>

      <Dialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="¿Reiniciar los datos de la demo?"
        description="Se borran las mesas abiertas, los pedidos, las calificaciones y los cambios del catálogo. No se puede deshacer."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                demoActions.resetData();
                setConfirmReset(false);
                toast.success("Datos reiniciados", {
                  description: "Todo quedó como al principio.",
                });
              }}
            >
              Sí, reiniciar
            </Button>
          </>
        }
      />
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-surface-2 rounded-xl px-3.5 py-3">
      <p className="text-muted flex items-center gap-1.5 text-xs font-medium">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SlotOption({
  active,
  onClick,
  icon: Icon,
  title,
  hint,
  className,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  hint: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
        active ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface hover:border-ink/40",
        className,
      )}
    >
      <Icon
        className={cn("size-5 shrink-0", active ? "text-bg" : "text-accent-strong")}
        aria-hidden
        strokeWidth={1.8}
      />
      <span className="flex flex-col">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className={cn("text-xs tabular-nums", active ? "text-bg/75" : "text-muted")}>
          {hint}
        </span>
      </span>
    </button>
  );
}
