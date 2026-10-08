"use client";

import { Send, ShoppingBag } from "lucide-react";
import { STATUS_MESSAGE } from "@/lib/domain/orderStatus";
import { describeAdjustment } from "@/lib/domain/ticket";
import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toaster";
import { useDishes, useSessionOrders } from "@/lib/data";
import type { CartItem, Order } from "@/lib/domain/types";
import type { TableContext } from "./table-gate";
import { localized, t } from "@/lib/i18n";

/**
 * Avisos en vivo de lo que hacen los demás comensales de la mesa: platos agregados al carrito
 * compartido y rondas enviadas. Solo avisa de cambios ajenos y posteriores a abrir la pantalla.
 */
export function useTableActivity({ session, diner }: TableContext) {
  const dishes = useDishes();
  const orders = useSessionOrders(session.id);
  const prevCart = useRef<Map<string, CartItem> | null>(null);
  const prevOrders = useRef<Set<string> | null>(null);
  const prevStates = useRef<Map<string, Order> | null>(null);

  useEffect(() => {
    const current = new Map(session.cart.map((i) => [i.id, i]));
    const before = prevCart.current;
    prevCart.current = current;
    if (!before) return;
    for (const item of current.values()) {
      if (item.dinerId === diner.id) continue;
      const added = item.qty - (before.get(item.id)?.qty ?? 0);
      if (added <= 0) continue;
      const who = session.diners.find((d) => d.id === item.dinerId)?.alias ?? t("Alguien");
      const dish = dishes.find((d) => d.id === item.dishId);
      toast(
        t("{who} agregó {n}× {dish}", {
          who,
          n: added,
          dish: dish ? localized(dish) : t("un plato"),
        }),
        {
          id: `agrego-${item.id}-${item.qty}`,
          icon: <ShoppingBag className="text-accent-strong size-5" aria-hidden />,
          description: t("Al carrito compartido de la mesa"),
        },
      );
    }
  }, [session.cart, session.diners, diner.id, dishes]);

  useEffect(() => {
    const ids = new Set(orders.map((o) => o.id));
    const before = prevOrders.current;
    prevOrders.current = ids;
    if (!before) return;
    for (const order of orders) {
      if (before.has(order.id) || order.sentByDinerId === diner.id) continue;
      const who =
        session.diners.find((d) => d.id === order.sentByDinerId)?.alias ?? t("Alguien de la mesa");
      toast.success(t("{who} envió el pedido", { who }), {
        id: `envio-${order.id}`,
        icon: <Send className="text-success size-5" aria-hidden />,
        description: t("Ronda {n} · esperando confirmación del mesero", { n: order.round }),
      });
    }
  }, [orders, session.diners, diner.id]);

  // Cambios del mesero y de la cocina: estado de la ronda y ajustes con motivo (US-26, US-29).
  useEffect(() => {
    const before = prevStates.current;
    prevStates.current = new Map(orders.map((o) => [o.id, o]));
    if (!before) return;
    for (const order of orders) {
      const prev = before.get(order.id);
      if (!prev) continue;
      for (const item of order.items) {
        const old = prev.items.find((i) => i.id === item.id);
        if (
          !old ||
          !item.adjustReason ||
          (old.adjustReason === item.adjustReason &&
            old.qty === item.qty &&
            old.variantId === item.variantId &&
            old.removed === item.removed)
        )
          continue;
        const dish = dishes.find((d) => d.id === item.dishId);
        toast.warning(
          t(
            describeAdjustment({
              item,
              dish,
              variant: dish?.variants.find((v) => v.id === item.variantId),
            }),
          ),
          {
            id: `ajuste-${item.id}-${item.qty}-${item.variantId}-${item.removed}`,
            description: t("Motivo: {reason}", { reason: t(item.adjustReason) }),
          },
        );
      }
      if (prev.status === order.status) continue;
      const title = t("Ronda {n}: {msg}", { n: order.round, msg: t(STATUS_MESSAGE[order.status]) });
      const id = `estado-${order.id}-${order.status}`;
      if (order.status === "rechazado")
        toast.error(title, {
          id,
          description: order.rejectReason
            ? t("Motivo: {reason}", { reason: t(order.rejectReason) })
            : undefined,
        });
      else toast.success(title, { id });
    }
  }, [orders, dishes]);
}
