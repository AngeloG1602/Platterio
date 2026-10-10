"use client";

import {
  Clock3,
  FastForward,
  RotateCcw,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  UserPlus,
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
import { useAccountStatus } from "@/components/account/account-status";
import {
  accountActions,
  demoActions,
  demoDinerActions,
  restaurantActions,
  usePlan,
  useCurrentAccount,
  useOpenTableNumbers,
  useTables,
  useConnectedTabs,
  useCurrentSlot,
  useDemoSettings,
  useNow,
  useSyncSupported,
  useTimeSlots,
} from "@/lib/data";
import { PLAN_LIMITS } from "@/lib/domain/pricing";
import { statusMessage } from "@/lib/domain/accounts";
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

          <PlanSwitch />

          <SimulateDiner />

          <SimulateAccount />

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

/** Un comensal simulado entra a la mesa y agrega un plato al carrito compartido. */
function SimulateDiner() {
  const tables = useTables();
  const openTables = useOpenTableNumbers();
  const [picked, setPicked] = useState<number | null>(null);
  const tableNumber = picked ?? openTables[0] ?? 3;
  return (
    <section aria-labelledby="demo-comensal" className="border-line rounded-xl border p-4">
      <h3 id="demo-comensal" className="text-[15px] font-semibold">
        Simular otro comensal
      </h3>
      <p className="text-muted text-[13px]">
        Entra a la mesa y agrega un plato de la franja actual.
      </p>
      <div role="radiogroup" aria-label="Mesa" className="mt-3 grid grid-cols-6 gap-1.5">
        {tables.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={tableNumber === t.number}
            aria-label={`Mesa ${t.number}${openTables.includes(t.number) ? " (con clientes)" : ""}`}
            onClick={() => setPicked(t.number)}
            className={cn(
              "relative flex h-11 items-center justify-center rounded-lg border text-[15px] font-semibold tabular-nums transition-colors",
              tableNumber === t.number
                ? "border-ink bg-ink text-bg"
                : "border-line-strong bg-surface hover:border-ink/40",
            )}
          >
            {t.number}
            {openTables.includes(t.number) && (
              <span
                className="bg-success absolute top-1 right-1 size-1.5 rounded-full"
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>
      <Button
        variant="secondary"
        block
        className="mt-3"
        onClick={() => {
          const r = demoDinerActions.simulate(tableNumber);
          if (r.ok)
            toast.success(`${r.alias} entró a la Mesa ${tableNumber}`, {
              description: `Agregó ${r.dishName}`,
            });
          else toast.error(r.error);
        }}
      >
        <UserPlus aria-hidden /> Agregar comensal a la Mesa {tableNumber}
      </Button>
    </section>
  );
}

/** Controles para ver los avisos de la prueba gratis sin esperar siete días. */
function SimulateAccount() {
  const account = useCurrentAccount();
  const status = useAccountStatus();
  if (!account || !status) return null;
  return (
    <section aria-labelledby="demo-cuenta" className="border-line rounded-xl border p-4">
      <h3 id="demo-cuenta" className="text-[15px] font-semibold">
        Cuenta de prueba
      </h3>
      <p className="text-muted mt-0.5 text-[13px]">
        {account.businessName} · {statusMessage(status)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => accountActions.simulateDays(3)}>
          Adelantar 3 días
        </Button>
        <Button variant="secondary" size="sm" onClick={accountActions.expireNow}>
          Terminar la prueba
        </Button>
        <Button variant="secondary" size="sm" onClick={accountActions.simulateActivation}>
          Simular pago
        </Button>
      </div>
    </section>
  );
}

/** Prototipo: cambia el plan del negocio para ver qué incluye cada uno. */
function PlanSwitch() {
  const plan = usePlan();
  return (
    <section aria-labelledby="demo-plan" className="border-line rounded-xl border p-4">
      <h3 id="demo-plan" className="text-[15px] font-semibold">
        Plan del negocio
      </h3>
      <p className="text-muted mt-1 text-[13px]">
        Digital: hasta {PLAN_LIMITS.digital.users} personas, sin salón. Completo: hasta{" "}
        {PLAN_LIMITS.completo.users}, con todo.
      </p>
      <div className="mt-3 flex gap-2">
        {(["digital", "completo"] as const).map((id) => (
          <Button
            key={id}
            size="sm"
            variant={plan === id ? "primary" : "secondary"}
            aria-pressed={plan === id}
            onClick={() => restaurantActions.setPlan(id)}
          >
            {id === "digital" ? "Digital" : "Completo"}
          </Button>
        ))}
      </div>
    </section>
  );
}
