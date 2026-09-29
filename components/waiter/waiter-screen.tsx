"use client";

import { AnimatePresence } from "framer-motion";
import { ArrowLeftRight, CircleCheck, ConciergeBell, Inbox, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PlatterioLogo, RestaurantMark } from "@/components/brand/logos";
import { DemoPanel } from "@/components/demo/demo-panel";
import { buttonClasses, Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  deviceActions,
  useDevice,
  useDishes,
  useHydrated,
  useNow,
  useRestaurant,
  useTables,
  useWaiterBoard,
  useWaiters,
} from "@/lib/data";
import { formatTime, plural } from "@/lib/domain/format";
import type { Order } from "@/lib/domain/types";
import type { TableOverview } from "@/lib/domain/waiter";
import { playChime, unlockSound } from "@/lib/sound";
import { cn } from "@/lib/cn";
import { TableMap } from "./table-map";
import { TableSheet } from "./table-sheet";
import { KitchenRow, PendingTicket, ReadyTicket } from "./tickets";

export function WaiterScreen() {
  const hydrated = useHydrated();
  const { waiterId } = useDevice();
  const waiters = useWaiters();

  // Entrar con ?mesero=carlos desde el hub.
  useEffect(() => {
    if (!hydrated) return;
    const wanted = new URLSearchParams(window.location.search).get("mesero");
    if (wanted && waiters.some((w) => w.id === wanted)) {
      deviceActions.setWaiter(wanted);
      window.history.replaceState(null, "", "/mesero");
    }
  }, [hydrated, waiters]);

  const valid = waiters.some((w) => w.id === waiterId);
  return (
    <div className="bg-bg min-h-dvh">
      {!hydrated ? <BoardSkeleton /> : valid ? <Board waiterId={waiterId!} /> : <WaiterPicker />}
      <DemoPanel />
    </div>
  );
}

function WaiterPicker() {
  const waiters = useWaiters();
  const tables = useTables();
  const restaurant = useRestaurant();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-8">
      <RestaurantMark name={restaurant.name} className="text-[15px]" />
      <h1 className="font-display mt-10 text-[34px] leading-tight font-semibold">¿Quién eres?</h1>
      <p className="text-ink-soft mt-2 text-[16px]">Verás solo tus mesas y sus pedidos.</p>
      <ul className="mt-6 flex flex-col gap-3">
        {waiters.map((w) => {
          const numbers = tables.filter((t) => w.tableIds.includes(t.id)).map((t) => t.number);
          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => deviceActions.setWaiter(w.id)}
                className="border-line bg-surface shadow-card hover:border-ink/30 flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99]"
              >
                <span className="font-display bg-accent-soft text-accent-strong flex size-14 items-center justify-center rounded-full text-2xl font-semibold">
                  {w.name.charAt(0)}
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-semibold">{w.name}</span>
                  <span className="text-muted text-sm">
                    {numbers.length ? `Mesas ${numbers.join(", ")}` : "Sin mesas asignadas"}
                  </span>
                </span>
                <ConciergeBell className="text-muted size-5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <Link
        href="/"
        className={buttonClasses({ variant: "ghost", className: "mt-auto self-center" })}
      >
        Volver al hub de demo
      </Link>
    </main>
  );
}

/** Avisos de pedidos nuevos y rondas listas (con sonido suave si está activo). */
function useArrivalNotices(pending: Order[], ready: Order[], sound: boolean) {
  const tables = useTables();
  const seen = useRef<{ pending: Set<string>; ready: Set<string> } | null>(null);
  useEffect(() => {
    const next = {
      pending: new Set(pending.map((o) => o.id)),
      ready: new Set(ready.map((o) => o.id)),
    };
    const before = seen.current;
    seen.current = next;
    if (!before) return;
    const label = (o: Order) =>
      `Mesa ${tables.find((t) => t.id === o.tableId)?.number ?? "?"} · Ronda ${o.round}`;
    const newPending = pending.filter((o) => !before.pending.has(o.id));
    const newReady = ready.filter((o) => !before.ready.has(o.id));
    newPending.forEach((o) =>
      toast.warning(`Nuevo pedido · ${label(o)}`, {
        id: `nuevo-${o.id}`,
        description: "Revísalo y confírmalo",
      }),
    );
    newReady.forEach((o) =>
      toast.success(`${label(o)} está listo`, {
        id: `listo-${o.id}`,
        description: "Llévalo a la mesa",
      }),
    );
    if (sound && newPending.length) playChime("nuevo");
    else if (sound && newReady.length) playChime("listo");
  }, [pending, ready, tables, sound]);
}

function Board({ waiterId }: { waiterId: string }) {
  const { waiter, overviews, pending, ready, inKitchen } = useWaiterBoard(waiterId);
  const restaurant = useRestaurant();
  const dishes = useDishes();
  const { waiterSound } = useDevice();
  const now = useNow(1000);
  const [selected, setSelected] = useState<string | null>(null);

  const byTable = new Map(overviews.map((o) => [o.table.id, o]));
  useArrivalNotices(pending, ready, waiterSound);

  if (!waiter) return null;
  const occupied = overviews.filter((o) => o.status !== "libre").length;
  const ctxFor = (o: Order) => {
    const ov = byTable.get(o.tableId) as TableOverview;
    return { table: ov.table, diners: ov.session?.diners ?? [], dishes, now };
  };
  const selectedOverview = selected ? byTable.get(selected) : undefined;

  return (
    <>
      <header className="border-line bg-bg/92 sticky top-0 z-20 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <RestaurantMark name={restaurant.name} className="text-[13px]" />
          <span className="text-muted hidden text-sm sm:inline">· Meseros</span>
          <span className="text-ink-soft ml-auto text-sm font-semibold tabular-nums">
            {formatTime(new Date(now))}
          </span>
          <IconButton
            label={waiterSound ? "Silenciar avisos" : "Activar sonido de avisos"}
            onClick={() => {
              if (!waiterSound) {
                unlockSound();
                playChime("nuevo");
              }
              deviceActions.setWaiterSound(!waiterSound);
            }}
          >
            {waiterSound ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          </IconButton>
          <Button variant="secondary" size="sm" onClick={() => deviceActions.setWaiter(null)}>
            <ArrowLeftRight aria-hidden /> Cambiar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[32px] leading-tight font-semibold">
              Hola, {waiter.name}
            </h1>
            <p className="text-muted text-[15px]">
              {overviews.length
                ? `Mesas ${overviews.map((o) => o.table.number).join(", ")} · ${plural(occupied, "ocupada", "ocupadas")}`
                : "Sin mesas asignadas"}
            </p>
          </div>
          <dl className="flex gap-2">
            <Stat
              label="Por confirmar"
              value={pending.length}
              tone={pending.length ? "warning" : "neutral"}
            />
            <Stat label="Listos" value={ready.length} tone={ready.length ? "success" : "neutral"} />
            <Stat label="En cocina" value={inKitchen.length} tone="neutral" />
          </dl>
        </div>

        {overviews.length === 0 ? (
          <EmptyState
            icon={ConciergeBell}
            title="No tienes mesas asignadas"
            description="Pídele al administrador que te asigne mesas en Configuración."
            className="mt-10"
          />
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="flex flex-col gap-8">
              <section aria-labelledby="tus-mesas">
                <h2 id="tus-mesas" className="mb-3 text-lg font-semibold">
                  Tus mesas
                </h2>
                <TableMap
                  overviews={overviews}
                  now={now}
                  timeoutMin={restaurant.confirmTimeoutMin}
                  onSelect={setSelected}
                />
              </section>
              <section aria-labelledby="en-cocina">
                <h2 id="en-cocina" className="text-lg font-semibold">
                  En cocina
                </h2>
                {inKitchen.length === 0 ? (
                  <p className="text-muted mt-2 text-[15px]">Nada en la cocina por ahora.</p>
                ) : (
                  <ul className="divide-line mt-1 divide-y">
                    {inKitchen.map((o) => (
                      <KitchenRow key={o.id} order={o} table={ctxFor(o).table} now={now} />
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="flex flex-col gap-8">
              <section aria-labelledby="por-confirmar">
                <h2
                  id="por-confirmar"
                  className="mb-3 flex items-center gap-2 text-lg font-semibold"
                >
                  Por confirmar
                  {pending.length > 0 && (
                    <span className="bg-warning flex size-6 items-center justify-center rounded-full text-xs font-bold text-white tabular-nums">
                      {pending.length}
                    </span>
                  )}
                </h2>
                {pending.length === 0 ? (
                  <div className="border-line-strong rounded-2xl border border-dashed">
                    <EmptyState
                      icon={CircleCheck}
                      title="Todo al día"
                      description="Cuando una mesa envíe un pedido, aparece aquí al instante."
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                      {pending.map((o) => (
                        <PendingTicket
                          key={o.id}
                          order={o}
                          {...ctxFor(o)}
                          timeoutMin={restaurant.confirmTimeoutMin}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>

              <section aria-labelledby="listos">
                <h2 id="listos" className="mb-3 text-lg font-semibold">
                  Listos para entregar
                </h2>
                {ready.length === 0 ? (
                  <p className={cn("text-muted flex items-center gap-2 text-[15px]")}>
                    <Inbox className="size-4" aria-hidden /> Nada listo por ahora. Te avisamos
                    cuando la cocina termine.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                      {ready.map((o) => (
                        <ReadyTicket key={o.id} order={o} {...ctxFor(o)} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      {selectedOverview && (
        <TableSheet overview={selectedOverview} dishes={dishes} onClose={() => setSelected(null)} />
      )}
      <footer className="pb-6 text-center">
        <PlatterioLogo tone="muted" className="scale-75" />
      </footer>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "warning" | "success";
}) {
  return (
    <div
      className={cn(
        "min-w-20 rounded-xl border px-3 py-2",
        tone === "neutral" && "border-line bg-surface",
        tone === "warning" && "border-warning/40 bg-warning-soft",
        tone === "success" && "border-success/40 bg-success-soft",
      )}
    >
      <dt className="text-muted text-xs font-medium">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6" aria-busy aria-label="Cargando">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-2 h-4 w-40" />
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-8 h-64 rounded-2xl" />
    </div>
  );
}
