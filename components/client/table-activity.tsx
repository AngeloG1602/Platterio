"use client";

import { Send, ShoppingBag } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/toaster";
import { useDishes, useSessionOrders } from "@/lib/data";
import type { CartItem } from "@/lib/domain/types";
import type { TableContext } from "./table-gate";

/**
 * Avisos en vivo de lo que hacen los demás comensales de la mesa: platos agregados al carrito
 * compartido y rondas enviadas. Solo avisa de cambios ajenos y posteriores a abrir la pantalla.
 */
export function useTableActivity({ session, diner }: TableContext) {
  const dishes = useDishes();
  const orders = useSessionOrders(session.id);
  const prevCart = useRef<Map<string, CartItem> | null>(null);
  const prevOrders = useRef<Set<string> | null>(null);

  useEffect(() => {
    const current = new Map(session.cart.map((i) => [i.id, i]));
    const before = prevCart.current;
    prevCart.current = current;
    if (!before) return;
    for (const item of current.values()) {
      if (item.dinerId === diner.id) continue;
      const added = item.qty - (before.get(item.id)?.qty ?? 0);
      if (added <= 0) continue;
      const who = session.diners.find((d) => d.id === item.dinerId)?.alias ?? "Alguien";
      const dish = dishes.find((d) => d.id === item.dishId);
      toast(`${who} agregó ${added}× ${dish?.name ?? "un plato"}`, {
        id: `agrego-${item.id}-${item.qty}`,
        icon: <ShoppingBag className="text-accent-strong size-5" aria-hidden />,
        description: "Al carrito compartido de la mesa",
      });
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
        session.diners.find((d) => d.id === order.sentByDinerId)?.alias ?? "Alguien de la mesa";
      toast.success(`${who} envió el pedido`, {
        id: `envio-${order.id}`,
        icon: <Send className="text-success size-5" aria-hidden />,
        description: `Ronda ${order.round} · esperando confirmación del mesero`,
      });
    }
  }, [orders, session.diners, diner.id]);
}
