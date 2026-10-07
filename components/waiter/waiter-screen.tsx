"use client";

import { AnimatePresence } from "framer-motion";
import {
  BellRing,
  CircleCheck,
  ConciergeBell,
  Inbox,
  KeyRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PlatterioLogo, RestaurantMark } from "@/components/brand/logos";
import { DemoPanel } from "@/components/demo/demo-panel";
import { RoleGate, SessionButton } from "@/components/access/role-gate";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import {
  deviceActions,
  useCurrentStaff,
  useDevice,
  useDishes,
  useNow,
  useOpenCalls,
  useRestaurant,
  useTables,
  useWaiterBoard,
  waiterActions,
} from "@/lib/data";
import { formatTime, plural } from "@/lib/domain/format";
import type { Order, TableCall } from "@/lib/domain/types";
import type { TableOverview } from "@/lib/domain/waiter";
import { playChime, unlockSound } from "@/lib/sound";
import { cn } from "@/lib/cn";
import { TableMap } from "./table-map";
import { TableSheet } from "./table-sheet";
import { KitchenRow, PendingTicket, ReadyTicket } from "./tickets";

export function WaiterScreen() {
  return (
    <div className="bg-bg min-h-dvh">
      <RoleGate permission="mesas.propias" label="Mesero">
        <MyBoard />
      </RoleGate>
      <DemoPanel />
    </div>
  );
}

/** Las mesas del mesero que entró con su PIN. */
function MyBoard() {
  const staff = useCurrentStaff();
  if (!staff?.waiterId) return null;
  return <Board waiterId={staff.waiterId} />;
}

/** Aviso cuando un cliente pide que abran su mesa (con sonido suave si está activo). */
function useCallNotices(calls: TableCall[], sound: boolean) {
  const tables = useTables();
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const next = new Set(calls.map((c) => c.id));
    const before = seen.current;
    seen.current = next;
    if (!before) return;
    const fresh = calls.filter((c) => !before.has(c.id));
    fresh.forEach((c) =>
      toast.warning(
        `Mesa ${tables.find((t) => t.id === c.tableId)?.number ?? "?"} pide que la abras`,
        {
          id: `aviso-${c.id}`,
          description: "Ábrela y dale el PIN al cliente",
        },
      ),
    );
    if (sound && fresh.length) playChime("nuevo");
  }, [calls, tables, sound]);
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
  const { waiterSound } = useDevice();
  const now = useNow(1000);
  if (!waiter) return null;
  const occupied = overviews.filter((o) => o.status !== "libre").length;

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
          <SessionButton />
        </div>
      </header>

      <SalonView
        heading={`Hola, ${waiter.name}`}
        subheading={
          overviews.length
            ? `Mesas ${overviews.map((o) => o.table.number).join(", ")} · ${plural(occupied, "ocupada", "ocupadas")}`
            : "Sin mesas asignadas"
        }
        mapTitle="Tus mesas"
        emptyTitle="No tienes mesas asignadas"
        emptyDescription="Pídele al encargado o al administrador que te asigne mesas."
        overviews={overviews}
        pending={pending}
        ready={ready}
        inKitchen={inKitchen}
      />
      <footer className="pb-6 text-center">
        <PlatterioLogo tone="muted" className="scale-75" />
      </footer>
    </>
  );
}

/**
 * Mesas, pedidos por confirmar, en cocina y listos para entregar. Lo usan el mesero (sus mesas)
 * y el encargado de caja (todo el salón).
 */
export function SalonView({
  heading,
  subheading,
  mapTitle,
  emptyTitle,
  emptyDescription,
  overviews,
  pending,
  ready,
  inKitchen,
  className,
}: {
  heading: string;
  subheading: string;
  mapTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  overviews: TableOverview[];
  pending: Order[];
  ready: Order[];
  inKitchen: Order[];
  className?: string;
}) {
  const restaurant = useRestaurant();
  const dishes = useDishes();
  const { waiterSound } = useDevice();
  const now = useNow(1000);
  const [selected, setSelected] = useState<string | null>(null);

  const byTable = new Map(overviews.map((o) => [o.table.id, o]));
  useArrivalNotices(pending, ready, waiterSound);
  const allCalls = useOpenCalls();
  const calls = allCalls.filter((c) => !c.resolved && byTable.has(c.tableId));
  useCallNotices(calls, waiterSound);

  const ctxFor = (o: Order) => {
    const ov = byTable.get(o.tableId) as TableOverview;
    return { table: ov.table, diners: ov.session?.diners ?? [], dishes, now };
  };
  const selectedOverview = selected ? byTable.get(selected) : undefined;

  return (
    <>
      <main className={cn("mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6", className)}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[32px] leading-tight font-semibold">{heading}</h1>
            <p className="text-muted text-[15px]">{subheading}</p>
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
        {calls.length > 0 && (
          <section aria-labelledby="piden-mesa" className="mt-5">
            <h2 id="piden-mesa" className="sr-only">
              Mesas que piden que las abras
            </h2>
            <ul className="flex flex-col gap-2">
              {calls.map((c) => {
                const number = byTable.get(c.tableId)?.table.number;
                return (
                  <li
                    key={c.id}
                    className="border-warning/40 bg-warning-soft flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
                  >
                    <BellRing className="text-warning-ink size-5 shrink-0" aria-hidden />
                    <span className="flex-1 text-[15px] font-semibold">
                      La Mesa {number} pide que la abras
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        const r = waiterActions.openTable(c.tableId);
                        if (!r.ok) return toast.error("No se pudo abrir", { description: r.error });
                        setSelected(c.tableId);
                      }}
                    >
                      <KeyRound aria-hidden /> Abrir mesa
                      <span className="sr-only"> {number}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {overviews.length === 0 ? (
          <EmptyState
            icon={ConciergeBell}
            title={emptyTitle}
            description={emptyDescription}
            className="mt-10"
          />
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="flex flex-col gap-8">
              <section aria-labelledby="tus-mesas">
                <h2 id="tus-mesas" className="mb-3 text-lg font-semibold">
                  {mapTitle}
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
