import { inPeriod, type Period } from "./analytics";

/**
 * Registro de acciones (auditoría): quién hizo qué, cuándo y, si aplica, quién lo autorizó.
 * Solo se agrega: desde la interfaz no se edita ni se borra. Lo consulta el administrador.
 */

export type AuditArea = "Pedidos" | "Cocina" | "Mesas" | "Caja" | "Inventario" | "Equipo";
export const AUDIT_AREAS: readonly AuditArea[] = [
  "Pedidos",
  "Cocina",
  "Mesas",
  "Caja",
  "Inventario",
  "Equipo",
];

export const AUDIT_ACTIONS = {
  "pedido.crear": { label: "Tomó un pedido", area: "Pedidos" },
  "pedido.confirmar": { label: "Confirmó un pedido", area: "Pedidos" },
  "pedido.rechazar": { label: "Rechazó un pedido", area: "Pedidos" },
  "pedido.ajustar": { label: "Ajustó un plato", area: "Pedidos" },
  "pedido.editar": { label: "Editó un pedido", area: "Pedidos" },
  "pedido.entregar": { label: "Entregó un pedido", area: "Pedidos" },
  "cocina.listo": { label: "Marcó un pedido listo", area: "Cocina" },
  "mesa.abrir": { label: "Abrió una mesa", area: "Mesas" },
  "mesa.liberar": { label: "Liberó una mesa", area: "Mesas" },
  "mesa.cancelar": { label: "Canceló una mesa", area: "Mesas" },
  "mesa.transferir": { label: "Pasó una mesa a otra", area: "Mesas" },
  "mesa.liberar_al_pagar": { label: "La mesa se liberó al pagarse", area: "Mesas" },
  "mesa.cerrar_inactividad": { label: "La mesa se cerró por inactividad", area: "Mesas" },
  "domicilio.despachar": { label: "Despachó un domicilio", area: "Pedidos" },
  "caja.abrir": { label: "Abrió la caja", area: "Caja" },
  "caja.cobrar": { label: "Registró un cobro", area: "Caja" },
  "factura.reimprimir": { label: "Reimprimió una factura", area: "Caja" },
  "caja.cerrar": { label: "Cerró la caja", area: "Caja" },
  "credito.cargar": { label: "Cerró una cuenta a crédito", area: "Caja" },
  "cortesia.registrar": { label: "Registró una cortesía", area: "Caja" },
  "credito.abonar": { label: "Recibió un abono de crédito", area: "Caja" },
  "credito.persona_crear": { label: "Agregó una persona a crédito", area: "Caja" },
  "credito.persona_editar": { label: "Editó una persona a crédito", area: "Caja" },
  "inventario.crear": { label: "Agregó un producto al inventario", area: "Inventario" },
  "inventario.editar": { label: "Editó un producto del inventario", area: "Inventario" },
  "inventario.entrada": { label: "Registró una entrada de inventario", area: "Inventario" },
  "inventario.salida": { label: "Registró una salida de inventario", area: "Inventario" },
  "inventario.receta": { label: "Guardó una receta", area: "Inventario" },
  "inventario.receta_quitar": { label: "Quitó una receta", area: "Inventario" },
  "inventario.preparacion": { label: "Guardó una preparación", area: "Inventario" },
  "inventario.preparacion_quitar": { label: "Quitó una preparación", area: "Inventario" },
  "inventario.producir": { label: "Registró una producción", area: "Inventario" },
  "inventario.ajuste": { label: "Ajustó el inventario", area: "Inventario" },
  "equipo.crear": { label: "Creó un usuario", area: "Equipo" },
  "equipo.editar": { label: "Editó un usuario", area: "Equipo" },
  "equipo.activar": { label: "Activó un usuario", area: "Equipo" },
  "equipo.desactivar": { label: "Desactivó un usuario", area: "Equipo" },
} as const satisfies Record<string, { label: string; area: AuditArea }>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** Quien actúa cuando no hay una persona detrás (cierres y liberaciones automáticas). */
export const AUDIT_SYSTEM = "Sistema";

export interface AuditEntry {
  id: string;
  at: string;
  /** Nombre de quien hizo la acción, o "Sistema". */
  by: string;
  /** Rol de quien actuó, si fue una persona. */
  role?: string;
  action: AuditAction;
  /** Sobre qué: "Mesa 3 · Ronda 1", "Caja", "Camila (mesero)". */
  target: string;
  detail?: string;
  reason?: string;
  /** Quién autorizó la acción, cuando hace falta una autorización. */
  authorizedBy?: string;
}

/** Cuántas entradas se guardan; las más viejas se descartan primero. */
export const AUDIT_LIMIT = 1500;

/** Agrega una entrada al final (la más reciente) respetando el límite. Nunca modifica las demás. */
export function appendAudit(log: readonly AuditEntry[], entry: AuditEntry): AuditEntry[] {
  const next = [...log, entry];
  return next.length > AUDIT_LIMIT ? next.slice(next.length - AUDIT_LIMIT) : next;
}

export const auditLabel = (action: AuditAction) => AUDIT_ACTIONS[action].label;
export const auditArea = (action: AuditAction): AuditArea => AUDIT_ACTIONS[action].area;

export interface AuditFilter {
  area?: AuditArea;
  by?: string;
  action?: AuditAction;
  /** Busca en el objeto, el detalle, el motivo y quien autorizó. */
  text?: string;
  period?: Period;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Entradas que cumplen todos los filtros, de la más reciente a la más antigua. */
export function filterAudit(log: readonly AuditEntry[], f: AuditFilter = {}): AuditEntry[] {
  const q = f.text?.trim() ? fold(f.text.trim()) : "";
  return log
    .filter((e) => !f.area || auditArea(e.action) === f.area)
    .filter((e) => !f.by || e.by === f.by)
    .filter((e) => !f.action || e.action === f.action)
    .filter((e) => !f.period || inPeriod(e.at, f.period))
    .filter(
      (e) =>
        !q ||
        fold(
          [e.target, e.detail, e.reason, e.authorizedBy, e.by, auditLabel(e.action)].join(" "),
        ).includes(q),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Personas (y "Sistema") que aparecen en el registro, para el filtro. */
export function auditPeople(log: readonly AuditEntry[]): string[] {
  return [...new Set(log.map((e) => e.by))].sort((a, b) => a.localeCompare(b, "es"));
}

/** Filas para el CSV, con encabezado. */
export function auditCsvRows(entries: readonly AuditEntry[]): (string | number)[][] {
  return [
    ["Fecha", "Hora", "Persona", "Rol", "Área", "Acción", "Sobre", "Detalle", "Motivo", "Autorizó"],
    ...entries.map((e) => {
      const d = new Date(e.at);
      return [
        d.toLocaleDateString("es-CO"),
        d.toLocaleTimeString("es-CO"),
        e.by,
        e.role ?? "",
        auditArea(e.action),
        auditLabel(e.action),
        e.target,
        e.detail ?? "",
        e.reason ?? "",
        e.authorizedBy ?? "",
      ];
    }),
  ];
}
