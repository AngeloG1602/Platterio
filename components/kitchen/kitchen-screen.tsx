"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BellRing, ChefHat, ChevronsDown, CircleAlert, PackageCheck, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PlatterioMark, RestaurantMark } from "@/components/brand/logos";
import { RoleGate, SessionButton } from "@/components/access/role-gate";
import { DemoPanel } from "@/components/demo/demo-panel";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toaster";
import {
  kitchenActions,
  useDishes,
  useKitchenBoard,
  useSessions,
  useNow,
  useRestaurant,
  useTables,
} from "@/lib/data";
import { formatElapsed, formatTime, plural } from "@/lib/domain/format";
import {
  kitchenLayout,
  kitchenTimeLevel,
  type KitchenDensity,
  type KitchenTicket,
} from "@/lib/domain/kitchen";
import { unseenChanges } from "@/lib/domain/staffOrders";
import { placeLabel } from "@/lib/domain/delivery";
import type { Dish, Order, Table, TableSession } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

type View = "por_hacer" | "hechos";

/** Tamaños de la tarjeta según la densidad de la cola (más pedidos, más compacta). */
const SIZE: Record<
  KitchenDensity,
  {
    place: string;
    item: string;
    sub: string;
    pad: string;
    gap: string;
    button: string;
    timer: string;
  }
> = {
  grande: {
    place: "text-[34px]",
    item: "text-[21px]",
    sub: "text-[17px]",
    pad: "p-4",
    gap: "gap-3",
    button: "h-15 text-lg",
    timer: "text-xl",
  },
  media: {
    place: "text-[28px]",
    item: "text-[18px]",
    sub: "text-[15px]",
    pad: "p-3.5",
    gap: "gap-2.5",
    button: "h-13 text-[17px]",
    timer: "text-lg",
  },
  compacta: {
    place: "text-[22px]",
    item: "text-[16px]",
    sub: "text-[14px]",
    pad: "p-3",
    gap: "gap-2",
    button: "h-11 text-[16px]",
    timer: "text-base",
  },
  minima: {
    place: "text-[19px]",
    item: "text-[14px]",
    sub: "text-[13px]",
    pad: "p-2.5",
    gap: "gap-1.5",
    button: "h-10 text-[15px]",
    timer: "text-[15px]",
  },
};

/** Cola de cocina (US-28): modo oscuro, letra grande y un solo toque, "Listo". */
export function KitchenScreen() {
  // Tema oscuro en toda la página (incluidos los toasts) mientras la cocina esté abierta.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-cocina");
    return () => root.classList.remove("theme-cocina");
  }, []);

  return (
    <div className="bg-bg text-ink min-h-dvh">
      <RoleGate permission="cocina.tablero" label="Cocina">
        <Board />
      </RoleGate>
      <DemoPanel />
    </div>
  );
}

function useNewOrderNotice(
  confirmed: Order[],
  tables: readonly Table[],
  sessions: readonly TableSession[],
) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(confirmed.map((o) => o.id));
    const before = seen.current;
    seen.current = ids;
    if (!before) return;
    for (const o of confirmed) {
      if (before.has(o.id)) continue;
      toast(`Nuevo pedido · ${placeLabel(o, tables, sessions)}`, {
        id: `cocina-${o.id}`,
        icon: <ChefHat className="text-accent size-5" aria-hidden />,
        description: `Ronda ${o.round} · ${plural(
          o.items.reduce((s, i) => s + i.qty, 0),
          "plato",
          "platos",
        )}`,
      });
    }
  }, [confirmed, tables, sessions]);
}

/** Avisa cuando el personal cambia una ronda que ya está en cocina. */
function useChangeNotice(
  orders: readonly Order[],
  tables: readonly Table[],
  sessions: readonly TableSession[],
) {
  const seen = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    const counts = new Map(orders.map((o) => [o.id, unseenChanges(o).length]));
    if (seen.current) {
      for (const o of orders) {
        const now = counts.get(o.id) ?? 0;
        if (now > (seen.current.get(o.id) ?? 0)) {
          toast.warning(`Cambio en ${placeLabel(o, tables, sessions)}`, {
            description: `Ronda ${o.round}: revisa lo que cambió el mesero.`,
          });
        }
      }
    }
    seen.current = counts;
  }, [orders, tables, sessions]);
}

/** ¿Hay contenido fuera de la vista? Para avisar que quedan pedidos más abajo. */
function useHiddenBelow(ref: React.RefObject<HTMLElement | null>, count: number) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setHidden(el.scrollHeight - el.scrollTop - el.clientHeight > 24);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [ref, count]);
  return hidden;
}

function Board() {
  const { queue, done } = useKitchenBoard();
  const tables = useTables();
  const dishes = useDishes();
  const restaurant = useRestaurant();
  const now = useNow(1000);
  const sessions = useSessions();
  const [view, setView] = useState<View>("por_hacer");
  const orders = queue.map((t) => t.order);
  useNewOrderNotice(orders, tables, sessions);
  useChangeNotice([...orders, ...done], tables, sessions);

  return (
    <>
      <header className="border-line flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3 lg:px-8">
        <RestaurantMark name={restaurant.name} className="text-[15px]" />
        <span className="text-muted text-lg font-semibold">Cocina</span>
        <Segmented
          label="Vista de la cocina"
          value={view}
          onChange={setView}
          className="min-w-72"
          options={[
            { value: "por_hacer", label: `Por hacer (${queue.length})` },
            { value: "hechos", label: `Hechos (${done.length})` },
          ]}
        />
        <span className="font-display ml-auto text-2xl font-semibold tabular-nums">
          {formatTime(new Date(now))}
        </span>
        <SessionButton />
      </header>

      {view === "por_hacer" ? (
        <Queue queue={queue} tables={tables} sessions={sessions} dishes={dishes} now={now} />
      ) : (
        <DoneList done={done} tables={tables} sessions={sessions} dishes={dishes} now={now} />
      )}
    </>
  );
}

function Queue({
  queue,
  tables,
  sessions,
  dishes,
  now,
}: {
  queue: KitchenTicket[];
  tables: readonly Table[];
  sessions: readonly TableSession[];
  dishes: readonly Dish[];
  now: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const hidden = useHiddenBelow(ref, queue.length);
  const { density, columns } = kitchenLayout(queue.length);

  if (queue.length === 0) {
    return (
      <main className="grid h-[calc(100dvh-65px)] place-items-center p-6">
        <div className="border-line-strong flex w-full max-w-xl flex-col items-center rounded-2xl border border-dashed px-8 py-16 text-center">
          <PlatterioMark className="text-line-strong size-12" />
          <p className="text-ink-soft mt-5 text-2xl font-semibold">Nada por hacer</p>
          <p className="text-muted mt-1 text-[17px]">
            Cuando el mesero confirme un pedido, aparece aquí.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      ref={ref}
      aria-label="Pedidos por hacer, en orden de llegada"
      className="relative h-[calc(100dvh-65px)] overflow-y-auto p-3 lg:p-4"
    >
      <ol
        style={{ "--cols": columns } as React.CSSProperties}
        className={cn(
          "grid list-none grid-cols-1 content-start items-start sm:grid-cols-2 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))]",
          density === "grande" ? "gap-4" : "gap-3",
        )}
      >
        <AnimatePresence initial={false}>
          {queue.map((ticket, i) => (
            <li key={ticket.order.id} className="min-w-0">
              <KitchenCard
                ticket={ticket}
                position={i + 1}
                place={placeLabel(ticket.order, tables, sessions)}
                dishes={dishes}
                now={now}
                density={density}
              />
            </li>
          ))}
        </AnimatePresence>
      </ol>
      {hidden && (
        <div className="pointer-events-none sticky bottom-2 flex justify-center">
          <span
            role="status"
            className="bg-warning flex items-center gap-2 rounded-full px-5 py-2.5 text-[16px] font-bold text-[#0e0d0c] shadow-lg"
          >
            <ChevronsDown className="size-5" aria-hidden /> Hay más pedidos abajo
          </span>
        </div>
      )}
    </main>
  );
}

function DoneList({
  done,
  tables,
  sessions,
  dishes,
  now,
}: {
  done: Order[];
  tables: readonly Table[];
  sessions: readonly TableSession[];
  dishes: readonly Dish[];
  now: number;
}) {
  if (done.length === 0) {
    return (
      <main className="grid h-[calc(100dvh-65px)] place-items-center p-6">
        <p className="text-muted text-xl">Todavía no hay pedidos hechos.</p>
      </main>
    );
  }
  return (
    <main
      aria-label="Pedidos ya hechos"
      className="h-[calc(100dvh-65px)] overflow-y-auto p-3 lg:p-5"
    >
      <p className="text-muted mb-3 px-1 text-[15px]">
        Los últimos pedidos que marcaste como listos, para consultar si faltó algo.
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {done.map((o) => (
          <li key={o.id} className="bg-surface border-success/40 rounded-xl border-2 p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-[22px] font-semibold">
                {placeLabel(o, tables, sessions)}
              </p>
              <p className="text-success-ink flex items-center gap-1.5 text-[15px] font-semibold">
                <PackageCheck className="size-4" aria-hidden />
                Listo a las {formatTime(new Date(o.readyAt ?? o.createdAt))}
              </p>
            </div>
            <p className="text-muted text-[14px]">
              Ronda {o.round} · hace {formatElapsed(now - Date.parse(o.readyAt ?? o.createdAt))}
            </p>
            <ul className="border-line mt-2.5 flex flex-col gap-1 border-t pt-2.5">
              {o.items.map((item) => {
                const dish = dishes.find((d) => d.id === item.dishId);
                const variant = dish?.variants.find((v) => v.id === item.variantId);
                return (
                  <li key={item.id} className="text-[16px] leading-snug">
                    <span className="text-accent font-semibold tabular-nums">{item.qty}×</span>{" "}
                    {dish?.name ?? "Plato"}
                    {dish && dish.variants.length > 1 && variant ? ` · ${variant.name}` : ""}
                    {item.custom && item.custom.kitchen.length > 0 && (
                      <span className="text-ink-soft"> ({item.custom.kitchen.join(", ")})</span>
                    )}
                    {item.note && <span className="text-warning-ink"> — {item.note}</span>}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}

function KitchenCard({
  ticket,
  position,
  place,
  dishes,
  now,
  density,
}: {
  ticket: KitchenTicket;
  position: number;
  place: string;
  dishes: readonly Dish[];
  now: number;
  density: KitchenDensity;
}) {
  const { order, additional } = ticket;
  const size = SIZE[density];
  const compact = density === "compacta" || density === "minima";
  const level = kitchenTimeLevel(order, now);
  const elapsed = now - Date.parse(order.confirmedAt ?? order.createdAt);
  const changes = unseenChanges(order);

  function done() {
    const r = kitchenActions.ready(order.id);
    if (!r.ok) toast.error("No se pudo marcar", { description: r.error });
    else toast.success(`${place} lista`, { description: "Le avisamos al mesero." });
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.22 }}
      aria-label={`${place}, ronda ${order.round}${additional ? ", adicional" : ""}`}
      className={cn(
        "bg-surface flex flex-col overflow-hidden rounded-xl border-2",
        additional
          ? "border-danger"
          : level === "atrasado"
            ? "border-warning"
            : level === "lento"
              ? "border-warning/50"
              : "border-line",
      )}
    >
      {additional && (
        <p className="bg-danger flex items-center gap-2 px-3 py-1.5 text-[15px] font-bold tracking-wide text-[#0e0d0c] uppercase">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {compact ? "Adicional" : `Adicional · ${place} ya tiene pedidos`}
        </p>
      )}
      <div className={cn("flex flex-1 flex-col", size.pad, size.gap)}>
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("font-display leading-tight font-semibold", size.place)}>
              <span className="text-muted mr-2 text-[0.55em] tabular-nums">#{position}</span>
              {place}
              {compact && (
                <span className={cn("text-muted ml-2 font-sans font-normal", size.sub)}>
                  · Ronda {order.round}
                </span>
              )}
            </p>
            {!compact && <p className={cn("text-muted", size.sub)}>Ronda {order.round}</p>}
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-0.5 font-semibold tabular-nums",
              size.timer,
              level === "atrasado"
                ? "bg-warning text-[#0e0d0c]"
                : level === "lento"
                  ? "bg-warning-soft text-warning-ink"
                  : "text-ink-soft",
            )}
            aria-label={`Lleva ${formatElapsed(elapsed)}${level === "atrasado" ? ", atrasado" : ""}`}
          >
            <Timer className="size-[1em]" aria-hidden />
            {formatElapsed(elapsed)}
            {level === "atrasado" && <span className="text-[0.8em] uppercase">Atrasado</span>}
          </span>
        </header>

        {changes.length > 0 && (
          <section
            aria-label="Cambios del mesero"
            className="bg-warning-soft text-warning-ink rounded-lg p-2.5"
          >
            <p className={cn("flex items-center gap-2 font-semibold", size.sub)}>
              <BellRing className="size-[1.1em]" aria-hidden /> Cambios del mesero
            </p>
            <ul className={cn("mt-1 flex flex-col gap-0.5", size.sub)}>
              {changes.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold">{c.dishName}</span> · {c.detail}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => kitchenActions.acknowledgeChanges(order.id)}
              className="bg-warning-ink mt-2 h-10 w-full rounded-lg text-[15px] font-semibold text-white"
            >
              Visto
            </button>
          </section>
        )}

        <ul className={cn("border-line flex flex-1 flex-col border-t pt-2.5", size.gap)}>
          {order.items.map((item) => {
            const dish = dishes.find((d) => d.id === item.dishId);
            const variant = dish?.variants.find((v) => v.id === item.variantId);
            return (
              <li key={item.id} className={item.removed ? "opacity-60" : undefined}>
                {item.addedByStaff && !item.removed && (
                  <p className="text-warning-ink text-[13px] font-semibold uppercase">Nuevo</p>
                )}
                <p className={cn("leading-snug font-semibold", size.item)}>
                  <span className="text-accent tabular-nums">{item.qty}×</span>{" "}
                  {dish?.name ?? "Plato"}
                  {dish && dish.variants.length > 1 && variant && (
                    <span className={cn("text-ink-soft font-normal", size.sub)}>
                      {" "}
                      · {variant.name}
                    </span>
                  )}
                </p>
                {item.custom && (
                  <ul className="mt-1 flex flex-wrap gap-1" aria-label="Personalización">
                    {item.custom.kitchen.map((line) => (
                      <li
                        key={line}
                        className={cn(
                          "w-fit rounded-md px-2 py-0.5 font-bold",
                          size.sub,
                          line.startsWith("SIN")
                            ? "bg-danger-soft text-danger-ink"
                            : line.startsWith("EXTRA") || line.startsWith("AGREGAR")
                              ? "bg-success-soft text-success-ink"
                              : "bg-accent-soft text-accent-strong",
                        )}
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
                {item.note && (
                  <p
                    className={cn(
                      "bg-warning-soft text-warning-ink mt-1 inline-block rounded-md px-2 py-0.5 font-semibold",
                      size.sub,
                    )}
                  >
                    Nota: {item.note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={done}
          className={cn(
            "bg-success flex w-full items-center justify-center gap-2.5 rounded-xl font-semibold text-[#0e0d0c] transition active:scale-[0.98]",
            size.button,
          )}
        >
          <PackageCheck className="size-[1.3em]" aria-hidden /> Listo
        </button>
      </div>
    </motion.article>
  );
}
