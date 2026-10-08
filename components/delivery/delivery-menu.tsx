"use client";

import { Clock, Receipt, ShoppingBag } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { MenuHeader } from "@/components/brand/menu-header";
import { ClientShell } from "@/components/client/client-shell";
import { DishCard } from "@/components/dish/dish-card";
import {
  CategoryHeading,
  dishLinkClass,
  DishList,
  useMenuStyle,
} from "@/components/dish/dish-layout";
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
import { localized, t } from "@/lib/i18n";

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
      <MenuHeader name={restaurant.name} />
      <div className="px-4">
        <h1 className="font-display mt-5 text-[30px] leading-[1.1] font-semibold tracking-tight">
          {t("Pide a domicilio o para recoger")}
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
              ? t("Abierto hasta las {time}", { time: config.closesAt })
              : t("Cerrado ahora · abrimos a las {time}", { time: config.opensAt })}
          </p>
        ) : (
          <p className="bg-warning-soft text-warning-ink mt-2 rounded-lg px-3 py-2 text-sm font-medium">
            {t("Por ahora no recibimos pedidos a domicilio.")}
          </p>
        )}
        {active && (
          <Link
            href={`/domicilio/seguimiento/${active.order.id}`}
            className="bg-accent-soft text-accent-strong mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold"
          >
            <Receipt className="size-5" aria-hidden /> {t("Seguir mi pedido")} {active.info.code}
          </Link>
        )}
      </div>

      <nav
        aria-label={t("Categorías")}
        className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {sections.map((s) => (
          <a
            key={s.category.id}
            href={`#cat-${s.category.id}`}
            className="bg-surface-2 text-ink-soft shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold"
          >
            {localized(s.category)}
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
            <CategoryHeading id={`h-${s.category.id}`}>{localized(s.category)}</CategoryHeading>
            <DishList>
              {s.dishes.map((d) => (
                <DishRow key={d.id} dish={d} onPick={setPicked} />
              ))}
            </DishList>
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
            <ShoppingBag aria-hidden /> {t("Ver mi pedido")} · {count} · <Price value={subtotal} />
          </Link>
        </div>
      )}
      {picked && <AddDishSheet dish={picked} onClose={() => setPicked(null)} />}
    </>
  );
}

const DishRow = memo(function DishRow({ dish, onPick }: { dish: Dish; onPick: (d: Dish) => void }) {
  const { layout } = useMenuStyle();
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(dish)}
        className={dishLinkClass(layout) + " w-full text-left"}
      >
        <DishCard dish={dish} />
        <span className="sr-only">{t("Agregar {dish}", { dish: localized(dish) })}</span>
      </button>
    </li>
  );
});

function MenuSkeleton() {
  return (
    <div className="px-4 pt-4" aria-busy aria-label={t("Cargando la carta")}>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-6 h-16 w-72" />
      <Skeleton className="mt-8 h-28 rounded-xl" />
      <Skeleton className="mt-4 h-28 rounded-xl" />
    </div>
  );
}
