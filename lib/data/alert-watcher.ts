"use client";

import { syncUnconfirmedAlerts } from "@/lib/domain/alerts";
import { virtualNow } from "@/lib/domain/clock";
import { closeSessions, sessionsToAutoClose } from "@/lib/domain/tableAccess";
import { useAppStore } from "./store";

/**
 * Cierra las mesas que llevan demasiado tiempo sin actividad y sin rondas por entregar. Se
 * calcula siempre sobre el estado actual, así que si dos pestañas lo hacen a la vez no pasa nada.
 */
function autoCloseTables() {
  const s = useAppStore.getState();
  if (!s.sessions.some((x) => !x.closedAt)) return;
  const now = virtualNow(s.demo.clock, Date.now());
  const ids = sessionsToAutoClose({
    sessions: s.sessions,
    orders: s.orders,
    now,
    defaultIdleMin: s.restaurant.sessionIdleMin,
  });
  if (ids.length === 0) return;
  useAppStore.setState({
    sessions: closeSessions(s.sessions, ids, new Date(now).toISOString(), "inactividad"),
  });
}

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
    autoCloseTables();
  };
  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}
