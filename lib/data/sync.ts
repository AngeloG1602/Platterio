"use client";

import { create } from "zustand";
import type { AppData } from "./seed";
import { useAppStore } from "./store";

/**
 * "Tiempo real" simulado: cada cambio del store se transmite por BroadcastChannel y las demás
 * pestañas del mismo navegador lo aplican al instante. Además cada pestaña anuncia su presencia
 * para mostrar cuántas están conectadas en el panel de demo.
 */

type SyncMessage = { type: "state"; from: string; state: AppData } | { type: "ping"; from: string };

const CHANNEL = "platterio";
const PING_EVERY = 2_000;
const PRESENCE_TTL = 5_000;

const tabId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const usePresenceStore = create<{ peers: Record<string, number>; supported: boolean }>(
  () => ({
    peers: {},
    supported: true,
  }),
);

let channel: BroadcastChannel | null = null;
let applyingRemote = false;

export function startSync(): () => void {
  if (channel) return () => undefined;
  if (typeof BroadcastChannel === "undefined") {
    usePresenceStore.setState({ supported: false });
    return () => undefined;
  }
  const ch = new BroadcastChannel(CHANNEL);
  channel = ch;

  ch.onmessage = (event: MessageEvent<SyncMessage>) => {
    const msg = event.data;
    if (msg.from === tabId) return;
    if (msg.type === "state") {
      applyingRemote = true;
      try {
        useAppStore.setState(msg.state, true);
      } finally {
        applyingRemote = false;
      }
    }
    usePresenceStore.setState((s) => ({ peers: { ...s.peers, [msg.from]: Date.now() } }));
  };

  const unsubscribe = useAppStore.subscribe((state) => {
    if (applyingRemote) return;
    ch.postMessage({ type: "state", from: tabId, state } satisfies SyncMessage);
  });

  const ping = () => {
    ch.postMessage({ type: "ping", from: tabId } satisfies SyncMessage);
    const now = Date.now();
    usePresenceStore.setState((s) => {
      const peers = Object.fromEntries(
        Object.entries(s.peers).filter(([, seen]) => now - seen < PRESENCE_TTL),
      );
      return Object.keys(peers).length === Object.keys(s.peers).length ? s : { peers };
    });
  };
  ping();
  const interval = window.setInterval(ping, PING_EVERY);

  return () => {
    window.clearInterval(interval);
    unsubscribe();
    ch.close();
    channel = null;
  };
}
