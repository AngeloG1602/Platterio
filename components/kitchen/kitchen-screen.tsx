"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BellRing, ChefHat, CircleCheck, Clock, Flame, PackageCheck, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { PlatterioMark, RestaurantMark } from "@/components/brand/logos";
import { RoleGate, SessionButton } from "@/components/access/role-gate";
import { DemoPanel } from "@/components/demo/demo-panel";
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
import { KITCHEN_COLUMNS, kitchenTimeLevel, type KitchenColumn } from "@/lib/domain/kitchen";
import { unseenChanges } from "@/lib/domain/staffOrders";
import { placeLabel } from "@/lib/domain/delivery";
import type { Dish, Order, Table, TableSession } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

const COLUMN: Record<
  KitchenColumn,
  { title: string; icon: LucideIcon; empty: string; hint: string }
> = {
  confirmado: {
    title: "Confirmados",
    icon: Clock,
    empty: "Sin pedidos nuevos",
    hint: "Cuando el mesero confirme uno, aparece aquí.",
  },
  en_preparacion: {
    title: "En preparación",
    icon: Flame,
    empty: "Nada en el fogón",
    hint: "Toca “Empezar a preparar” en un pedido confirmado.",
  },
  listo: {
    title: "Listos",
    icon: PackageCheck,
    empty: "Nada esperando",
    hint: "Lo que marques como listo le avisa al mesero.",
  },
};

/** Tablero de cocina (US-28): modo oscuro, letra grande y un toque para avanzar. */
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

function Board() {
  const board = useKitchenBoard();
  const tables = useTables();
  const dishes = useDishes();
  const restaurant = useRestaurant();
  const now = useNow(1000);
  const sessions = useSessions();
  useNewOrderNotice(board.confirmado, tables, sessions);
  useChangeNotice([...board.confirmado, ...board.en_preparacion, ...board.listo], tables, sessions);
  const total = board.confirmado.length + board.en_preparacion.length;

  return (
    <>
      <header className="border-line flex items-center gap-4 border-b px-5 py-3 lg:px-8">
        <RestaurantMark name={restaurant.name} className="text-[15px]" />
        <span className="text-muted text-lg font-semibold">Cocina</span>
        <span className="text-muted ml-auto flex items-center gap-2 text-[15px]">
          {plural(total, "pedido activo", "pedidos activos")}
        </span>
        <span className="font-display text-2xl font-semibold tabular-nums">
          {formatTime(new Date(now))}
        </span>
        <SessionButton />
      </header>

      <main className="grid gap-4 p-4 lg:h-[calc(100dvh-65px)] lg:grid-cols-3 lg:gap-5 lg:p-6">
        {KITCHEN_COLUMNS.map((col) => {
          const meta = COLUMN[col];
          const orders = board[col];
          return (
            <section
              key={col}
              aria-labelledby={`col-${col}`}
              className="bg-surface-2/60 flex min-h-0 flex-col rounded-2xl p-3 lg:p-4"
            >
              <h2
                id={`col-${col}`}
                className="mb-3 flex items-center gap-2.5 px-1 text-xl font-semibold"
              >
                <meta.icon
                  className={cn("size-6", col === "listo" ? "text-success" : "text-accent")}
                  aria-hidden
                />
                {meta.title}
                <span className="bg-surface ml-auto flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-lg tabular-nums">
                  {orders.length}
                </span>
              </h2>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
                {orders.length === 0 ? (
                  <div className="border-line-strong flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
                    <PlatterioMark className="text-line-strong size-10" />
                    <p className="text-ink-soft mt-4 text-xl font-semibold">{meta.empty}</p>
                    <p className="text-muted mt-1 text-[15px]">{meta.hint}</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {orders.map((o) => (
                      <KitchenCard
                        key={o.id}
                        order={o}
                        place={placeLabel(o, tables, sessions)}
                        dishes={dishes}
                        now={now}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}

function KitchenCard({
  order,
  place,
  dishes,
  now,
}: {
  order: Order;
  place: string;
  dishes: readonly Dish[];
  now: number;
}) {
  const level = kitchenTimeLevel(order, now);
  const ready = order.status === "listo";
  const elapsed =
    now -
    Date.parse(ready ? (order.readyAt ?? order.createdAt) : (order.confirmedAt ?? order.createdAt));
  const label = place;
  const changes = unseenChanges(order);

  function advance() {
    const r =
      order.status === "confirmado"
        ? kitchenActions.start(order.id)
        : kitchenActions.ready(order.id);
    if (!r.ok) toast.error("No se pudo avanzar", { description: r.error });
    else if (order.status === "en_preparacion")
      toast.success(`${label} lista`, { description: "Le avisamos al mesero." });
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.22 }}
      aria-label={`${label}, ronda ${order.round}`}
      className={cn(
        "bg-surface rounded-xl border-2 p-4",
        ready
          ? "border-success/40 opacity-80"
          : level === "atrasado"
            ? "border-danger"
            : level === "lento"
              ? "border-warning"
              : "border-line",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[34px] leading-tight font-semibold">{label}</p>
          <p className="text-muted mt-1 text-[15px]">Ronda {order.round}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xl font-semibold tabular-nums",
            ready
              ? "text-success-ink"
              : level === "atrasado"
                ? "bg-danger-soft text-danger-ink"
                : level === "lento"
                  ? "bg-warning-soft text-warning-ink"
                  : "text-ink-soft",
          )}
          aria-label={`${ready ? "Lista hace" : "Lleva"} ${formatElapsed(elapsed)}`}
        >
          <Timer className="size-5" aria-hidden />
          {formatElapsed(elapsed)}
        </span>
      </header>

      {changes.length > 0 && (
        <section
          aria-label="Cambios del mesero"
          className="bg-warning-soft text-warning-ink mt-4 rounded-lg p-3"
        >
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            <BellRing className="size-5" aria-hidden /> Cambios del mesero
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[16px]">
            {changes.map((c) => (
              <li key={c.id}>
                <span className="font-semibold">{c.dishName}</span> · {c.detail}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => kitchenActions.acknowledgeChanges(order.id)}
            className="bg-warning-ink mt-2.5 h-11 w-full rounded-lg text-[16px] font-semibold text-white"
          >
            Visto
          </button>
        </section>
      )}

      <ul className="border-line mt-4 flex flex-col gap-3 border-t pt-3">
        {order.items.map((item) => {
          const dish = dishes.find((d) => d.id === item.dishId);
          const variant = dish?.variants.find((v) => v.id === item.variantId);
          return (
            <li key={item.id} className={item.removed ? "opacity-60" : undefined}>
              {item.removed && (
                <p className="text-danger-ink text-[15px] font-semibold uppercase">Quitado</p>
              )}
              {item.addedByStaff && !item.removed && (
                <p className="text-warning-ink text-[15px] font-semibold uppercase">Nuevo</p>
              )}
              <p
                className={cn(
                  "text-[21px] leading-snug font-semibold",
                  item.removed && "line-through",
                )}
              >
                <span className="text-accent tabular-nums">{item.qty}×</span>{" "}
                {dish?.name ?? "Plato"}
              </p>
              {dish && dish.variants.length > 1 && variant && (
                <p className="text-ink-soft text-[17px]">{variant.name}</p>
              )}
              {item.custom && !item.removed && (
                <ul className="mt-1.5 flex flex-col gap-1" aria-label="Personalización">
                  {item.custom.kitchen.map((line) => (
                    <li
                      key={line}
                      className={cn(
                        "inline-block w-fit rounded-md px-2.5 py-0.5 text-[17px] font-bold",
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
                <p className="bg-warning-soft text-warning-ink mt-1.5 inline-block rounded-md px-2.5 py-1 text-[17px] font-semibold">
                  Nota: {item.note}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {ready ? (
        <p className="text-success-ink mt-4 flex items-center gap-2 text-[17px] font-medium">
          <CircleCheck className="size-5" aria-hidden /> Esperando al mesero
        </p>
      ) : (
        <button
          type="button"
          onClick={advance}
          className={cn(
            "mt-4 flex h-15 w-full items-center justify-center gap-2.5 rounded-xl text-lg font-semibold transition active:scale-[0.98]",
            order.status === "confirmado"
              ? "bg-accent-strong text-white"
              : "bg-success text-[#0e0d0c]",
          )}
        >
          {order.status === "confirmado" ? (
            <>
              <Flame className="size-6" aria-hidden /> Empezar a preparar
            </>
          ) : (
            <>
              <PackageCheck className="size-6" aria-hidden /> Marcar listo
            </>
          )}
        </button>
      )}
    </motion.article>
  );
}
