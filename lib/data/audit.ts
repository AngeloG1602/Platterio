"use client";

import { virtualNow } from "@/lib/domain/clock";
import { appendAudit, AUDIT_SYSTEM, type AuditAction } from "@/lib/domain/audit";
import { ROLE_LABEL } from "@/lib/domain/access";
import { useDeviceStore } from "./device";
import { newId } from "./ids";
import { useAppStore } from "./store";

export interface AuditExtra {
  detail?: string;
  reason?: string;
  authorizedBy?: string;
  /** Id fijo, para que una acción automática hecha desde varias pestañas quede una sola vez. */
  id?: string;
  /** La acción la hizo el sistema (cierres y liberaciones automáticas), no una persona. */
  system?: boolean;
}

/**
 * Deja constancia de una acción: quién la hizo (la persona que entró en esta pestaña con su PIN,
 * o el sistema), cuándo, sobre qué y, si hace falta, quién la autorizó y por qué. Se llama justo
 * después de que la acción se aplicó; las acciones que fallan no se registran.
 */
export function recordAudit(action: AuditAction, target: string, extra: AuditExtra = {}) {
  const state = useAppStore.getState();
  const staffId = useDeviceStore.getState().staffId;
  const person = extra.system ? undefined : state.staff.find((u) => u.id === staffId);
  const at = new Date(virtualNow(state.demo.clock, Date.now())).toISOString();
  useAppStore.setState((s) => ({
    audit: appendAudit(
      (s.audit ?? []).filter((e) => e.id !== extra.id),
      {
        id: extra.id ?? newId("aud"),
        at,
        by: person?.name ?? AUDIT_SYSTEM,
        ...(person ? { role: ROLE_LABEL[person.role] } : {}),
        action,
        target,
        ...(extra.detail ? { detail: extra.detail } : {}),
        ...(extra.reason?.trim() ? { reason: extra.reason.trim() } : {}),
        ...(extra.authorizedBy ? { authorizedBy: extra.authorizedBy } : {}),
      },
    ),
  }));
}

/** "Mesa 3" a partir del id de la mesa. */
export function tableName(tableId: string): string {
  const t = useAppStore.getState().tables.find((x) => x.id === tableId);
  return t ? `Mesa ${t.number}` : "Mesa";
}
