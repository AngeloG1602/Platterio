"use client";

import { Clock, Receipt, ShoppingBag } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { RestaurantMark } from "@/components/brand/logos";
import { ClientShell } from "@/components/client/client-shell";
import { DishImage } from "@/components/dish/dish-image";
import { buttonClasses } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCategories,
  useDeliveryClient,
  useDeliveryConfig,
  useDeliveryItems,
  useDishes,
  useHydrated,
  useNow,
  useRestaurant,
} from "@/lib/data";
import { deliveryCount, deliverySubtotal, isDeliveryOpen } from "@/lib/domain/delivery";
import type { Dish } from "@/lib/domain/types";

// La hoja de "agregar" solo se descarga cuando alguien toca un plato.
const AddDishSheet = dynamic(() => import("./add-dish-sheet").then((m) => m.AddDishSheet), {
  ssr: false,
});

/** Carta para pedir a domicilio o recoger: ligera, sin mesa ni PIN. */
export function DeliveryMenu() {
  return (
    <ClientShell>
      <Menu />
    </ClientShell>
  );
}

function Menu() {
  const hydrated = useHydrated();
  const restaurant = useRestaurant();
  const config = useDeliveryConfig();
  const categories = useCategories();
  const dishes = useDishes();
  const cart = useDeliveryClient((s) => s.cart);
  const orderIds = useDeliveryClient((s) => s.orderIds);
  const items = useDeliveryItems();
  const now = useNow(60_000);
  const [picked, setPicked] = useState<Dish | null>(null);

  const open = config ? isDeliveryOpen(config, now) : false;
  const sections = useMemo(
    () =>
      [...categories]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          category: c,
          dishes: dishes.filter((d) => d.active && d.categoryId === c.id),
        }))
        .filter((s) => s.dishes.length > 0),
    [categories, dishes],
  );
  const subtotal = useMemo(() => deliverySubtotal(cart, dishes), [cart, dishes]);
  const count = deliveryCount(cart);
  const active = useMemo(
    () =>
      items.find(
        (i) => orderIds.includes(i.order.id) && i.stage !== "entregado" && i.stage !== "cancelado",
      ),
    [items, orderIds],
  );

  if (!hydrated) return <MenuSkeleton />;

  return (
    <>
      <header className="px-4 pt-4">
        <RestaurantMark name={restaurant.name} className="text-[14px]" />
        <h1 className="font-display mt-5 text-[30px] leading-[1.1] font-semibold tracking-tight">
          Pide a domicilio o para recoger
        </h1>
        {config?.enabled ? (
          <p
            className={
              "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold " +
              (open ? "bg-success-soft text-success-ink" : "bg-warning-soft text-warning-ink")
            }
          >
            <Clock className="size-3.5" aria-hidden />
            {open
              ? `Abierto hasta las ${config.closesAt}`
              : `Cerrado ahora · abrimos a las ${config.opensAt}`}
          </p>
        ) : (
          <p className="bg-warning-soft text-warning-ink mt-2 rounded-lg px-3 py-2 text-sm font-medium">
            Por ahora no recibimos pedidos a domicilio.
          </p>
        )}
        {active && (
          <Link
            href={`/domicilio/seguimiento/${active.order.id}`}
            className="bg-accent-soft text-accent-strong mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold"
          >
            <Receipt className="size-5" aria-hidden /> Seguir mi pedido {active.info.code}
          </Link>
        )}
      </header>

      <nav
        aria-label="Categorías"
        className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {sections.map((s) => (
          <a
            key={s.category.id}
            href={`#cat-${s.category.id}`}
            className="bg-surface-2 text-ink-soft shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold"
          >
            {s.category.name}
          </a>
        ))}
      </nav>

      <main className="flex-1 px-4 pb-32">
        {sections.map((s) => (
          <section
            key={s.category.id}
            id={`cat-${s.category.id}`}
            aria-labelledby={`h-${s.category.id}`}
            className="pt-6 [contain-intrinsic-size:auto_600px] [content-visibility:auto]"
          >
            <h2 id={`h-${s.category.id}`} className="font-display text-[22px] font-semibold">
              {s.category.name}
            </h2>
            <ul className="divide-line divide-y">
              {s.dishes.map((d) => (
                <DishRow key={d.id} dish={d} onPick={setPicked} />
              ))}
            </ul>
          </section>
        ))}
      </main>

      {count > 0 && (
        <div className="from-bg via-bg/95 pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md bg-gradient-to-t to-transparent px-4 pt-6 pb-4">
          <Link
            href="/domicilio/pedido"
            className={buttonClasses({
              size: "lg",
              block: true,
              className: "shadow-float pointer-events-auto",
            })}
          >
            <ShoppingBag aria-hidden /> Ver mi pedido · {count} · <Price value={subtotal} />
          </Link>
        </div>
      )}
      {picked && <AddDishSheet dish={picked} onClose={() => setPicked(null)} />}
    </>
  );
}

const DishRow = memo(function DishRow({ dish, onPick }: { dish: Dish; onPick: (d: Dish) => void }) {
  const prices = dish.variants.map((v) => v.price);
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(dish)}
        className="flex w-full gap-4 py-4 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-[17px] leading-snug font-semibold">{dish.name}</span>
          <span className="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">
            {dish.description}
          </span>
          <Price
            value={Math.min(...prices)}
            from={new Set(prices).size > 1}
            className="mt-2 text-[15px]"
          />
        </span>
        <DishImage
          src={dish.photos[0]}
          name={dish.name}
          sizes="96px"
          className="shadow-card size-24 shrink-0"
          rounded="rounded-xl"
        />
        <span className="sr-only">Agregar {dish.name}</span>
      </button>
    </li>
  );
});

function MenuSkeleton() {
  return (
    <div className="px-4 pt-4" aria-busy aria-label="Cargando la carta">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-6 h-16 w-72" />
      <Skeleton className="mt-8 h-28 rounded-xl" />
      <Skeleton className="mt-4 h-28 rounded-xl" />
    </div>
  );
}
