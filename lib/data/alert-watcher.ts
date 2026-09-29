"use client";

import { syncUnconfirmedAlerts } from "@/lib/domain/alerts";
import { virtualNow } from "@/lib/domain/clock";
import { useAppStore } from "./store";

/**
 * Revisa cada segundo los pedidos sin confirmar y crea o resuelve las alertas para el
 * administrador (US-27). Corre en cualquier pestaña abierta; el id de la alerta es
 * determinista, así que si dos pestañas la crean a la vez no se duplica.
 */
export function startAlertWatcher(): () => void {
  const tick = () => {
    const s = useAppStore.getState();
    const next = syncUnconfirmedAlerts({
      alerts: s.alerts,
      orders: s.orders,
      waiters: s.waiters,
      now: virtualNow(s.demo.clock, Date.now()),
      timeoutMin: s.restaurant.confirmTimeoutMin,
    });
    if (next !== s.alerts) useAppStore.setState({ alerts: [...next] });
  };
  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}
