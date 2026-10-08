import { slugify } from "./dishForm";
import type { Waiter } from "./types";

/**
 * Usuarios, roles y permisos de un negocio. Son reglas puras: la pantalla pregunta `can(...)` y
 * las acciones validan con las mismas funciones, así que la lógica es una sola.
 *
 * Nota: en el prototipo el PIN se guarda en el navegador y NO es seguridad real. Con la base de
 * datos, el acceso pasa a Supabase Auth y estas reglas se aplican también en el servidor.
 */

export const ROLES = ["admin", "encargado", "mesero", "cocina"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  encargado: "Encargado de caja",
  mesero: "Mesero",
  cocina: "Cocina",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Todo: menú, marca, reportes completos y usuarios.",
  encargado: "Opera el salón: mesas, pedidos, cobro y equipo de servicio. Sin el panel completo.",
  mesero: "Atiende sus mesas: abre la mesa, toma y confirma pedidos.",
  cocina: "Ve el tablero de cocina y avanza los pedidos.",
};

export const PERMISSIONS = [
  /** Entrar al panel del administrador: menú, marca, reportes completos, configuración. */
  "panel.admin",
  /** Crear y administrar usuarios de cualquier rol. */
  "equipo.todos",
  /** Crear y administrar meseros y cocina. */
  "equipo.personal",
  "mesas.asignar",
  /** Ver y operar todas las mesas del salón. */
  "mesas.todas",
  /** Ver y operar solo las mesas asignadas. */
  "mesas.propias",
  "mesas.cancelar",
  "pedidos.crear",
  "pedidos.editar",
  /** Confirmar un pedido y enviarlo a cocina. */
  "pedidos.confirmar",
  "cobrar",
  "cocina.tablero",
  "agotados",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    "panel.admin",
    "equipo.todos",
    "equipo.personal",
    "mesas.asignar",
    "mesas.todas",
    "mesas.cancelar",
    "pedidos.crear",
    "pedidos.editar",
    "pedidos.confirmar",
    "cobrar",
    "cocina.tablero",
    "agotados",
  ],
  encargado: [
    "equipo.personal",
    "mesas.asignar",
    "mesas.todas",
    "mesas.cancelar",
    "pedidos.crear",
    "pedidos.editar",
    "pedidos.confirmar",
    "cobrar",
    "cocina.tablero",
    "agotados",
  ],
  mesero: ["mesas.propias", "pedidos.crear", "pedidos.editar", "pedidos.confirmar", "agotados"],
  cocina: ["cocina.tablero", "agotados"],
};

export const can = (role: Role | undefined, permission: Permission): boolean =>
  !!role && ROLE_PERMISSIONS[role].includes(permission);

/* ——— Rutas ——— */

/** Qué permiso exige cada sección (se compara por prefijo de la ruta). */
const ROUTE_PERMISSION: ReadonlyArray<readonly [string, Permission]> = [
  ["/admin", "panel.admin"],
  ["/caja", "mesas.todas"],
  ["/mesero", "mesas.propias"],
  ["/cocina", "cocina.tablero"],
];

export function permissionForPath(pathname: string): Permission | null {
  const hit = ROUTE_PERMISSION.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return hit ? hit[1] : null;
}

export function canAccessPath(role: Role | undefined, pathname: string): boolean {
  const needed = permissionForPath(pathname);
  return needed === null ? true : can(role, needed);
}

/** Pantalla de inicio de cada rol. */
export const HOME: Record<Role, string> = {
  admin: "/admin",
  encargado: "/caja",
  mesero: "/mesero",
  cocina: "/cocina",
};

/* ——— Usuarios ——— */

export interface StaffUser {
  id: string;
  name: string;
  role: Role;
  /** Solo dígitos. Ver la nota de arriba: en el prototipo no es seguridad real. */
  pin: string;
  active: boolean;
  /** Para los meseros: su ficha de mesero (mesas asignadas, calificaciones). */
  waiterId?: string;
}

export type AccessResult<T> = { ok: true; value: T } | { ok: false; error: string };

const PIN_LENGTH: Record<Role, readonly [number, number]> = {
  admin: [6, 8],
  encargado: [6, 8],
  mesero: [4, 6],
  cocina: [4, 6],
};

export function pinHint(role: Role): string {
  const [min, max] = PIN_LENGTH[role];
  return min === max ? `${min} dígitos` : `${min} a ${max} dígitos`;
}

export function validatePin(pin: string, role: Role): string | null {
  if (!/^\d+$/.test(pin)) return "El PIN solo lleva números";
  const [min, max] = PIN_LENGTH[role];
  if (pin.length < min || pin.length > max)
    return `El PIN de ${ROLE_LABEL[role].toLowerCase()} lleva ${pinHint(role)}`;
  return null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Entrar con el PIN: el PIN identifica a la persona, por eso no se repite en el negocio. */
export function login(staff: readonly StaffUser[], pin: string): AccessResult<StaffUser> {
  const user = staff.find((u) => u.active && u.pin === pin.trim());
  return user ? { ok: true, value: user } : { ok: false, error: "PIN incorrecto" };
}

/** Quién puede crear o administrar a quién. */
export function canManage(actor: Role, target: Role): boolean {
  if (can(actor, "equipo.todos")) return true;
  return can(actor, "equipo.personal") && (target === "mesero" || target === "cocina");
}

/** Roles que `actor` puede asignar al crear un usuario. */
export const assignableRoles = (actor: Role): Role[] => ROLES.filter((r) => canManage(actor, r));

interface TeamState {
  staff: readonly StaffUser[];
  waiters: readonly Waiter[];
}
interface TeamNext {
  staff: StaffUser[];
  waiters: Waiter[];
}

export function addStaff(
  state: TeamState,
  input: { name: string; role: Role; pin: string },
  actor: Role,
): AccessResult<TeamNext> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!canManage(actor, input.role))
    return { ok: false, error: "No puedes crear usuarios con ese rol" };
  if (!name) return { ok: false, error: "Escribe el nombre" };
  if (state.staff.some((u) => same(u.name, name)))
    return { ok: false, error: "Ya hay un usuario con ese nombre" };
  const pinError = validatePin(input.pin, input.role);
  if (pinError) return { ok: false, error: pinError };
  if (state.staff.some((u) => u.pin === input.pin))
    return { ok: false, error: "Ese PIN ya lo usa otra persona. Elige otro." };

  const id = slugify(name, [...state.staff.map((u) => u.id), ...state.waiters.map((w) => w.id)]);
  const user: StaffUser = {
    id,
    name,
    role: input.role,
    pin: input.pin,
    active: true,
    ...(input.role === "mesero" ? { waiterId: id } : {}),
  };
  return {
    ok: true,
    value: {
      staff: [...state.staff, user],
      waiters:
        input.role === "mesero"
          ? [...state.waiters, { id, name, tableIds: [] }]
          : [...state.waiters],
    },
  };
}

/** Cambia el nombre o el PIN. El nombre del mesero también se actualiza en su ficha. */
export function updateStaff(
  state: TeamState,
  userId: string,
  patch: { name?: string; pin?: string },
  actor: Role,
): AccessResult<TeamNext> {
  const user = state.staff.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "Ese usuario no existe" };
  if (!canManage(actor, user.role))
    return { ok: false, error: "No puedes modificar a este usuario" };

  let name = user.name;
  if (patch.name !== undefined) {
    name = patch.name.trim().replace(/\s+/g, " ");
    if (!name) return { ok: false, error: "Escribe el nombre" };
    if (state.staff.some((u) => u.id !== userId && same(u.name, name)))
      return { ok: false, error: "Ya hay un usuario con ese nombre" };
  }
  let pin = user.pin;
  if (patch.pin !== undefined) {
    const pinError = validatePin(patch.pin, user.role);
    if (pinError) return { ok: false, error: pinError };
    if (state.staff.some((u) => u.id !== userId && u.pin === patch.pin))
      return { ok: false, error: "Ese PIN ya lo usa otra persona. Elige otro." };
    pin = patch.pin;
  }
  return {
    ok: true,
    value: {
      staff: state.staff.map((u) => (u.id === userId ? { ...u, name, pin } : u)),
      waiters: state.waiters.map((w) => (w.id === user.waiterId ? { ...w, name } : w)),
    },
  };
}

/**
 * Activa o desactiva a alguien (no se borra: el historial de pedidos y calificaciones lo
 * conserva). Un mesero desactivado deja libres sus mesas.
 */
export function setStaffActive(
  state: TeamState,
  userId: string,
  active: boolean,
  actor: { id: string; role: Role },
): AccessResult<TeamNext & { released: string[] }> {
  const user = state.staff.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "Ese usuario no existe" };
  if (!canManage(actor.role, user.role))
    return { ok: false, error: "No puedes modificar a este usuario" };
  if (!active && user.id === actor.id)
    return { ok: false, error: "No puedes desactivarte a ti mismo" };
  if (
    !active &&
    user.role === "admin" &&
    !state.staff.some((u) => u.id !== user.id && u.role === "admin" && u.active)
  )
    return { ok: false, error: "Debe quedar al menos un administrador activo" };

  const released =
    !active && user.waiterId
      ? (state.waiters.find((w) => w.id === user.waiterId)?.tableIds ?? [])
      : [];
  return {
    ok: true,
    value: {
      staff: state.staff.map((u) => (u.id === userId ? { ...u, active } : u)),
      waiters: state.waiters.map((w) =>
        w.id === user.waiterId && !active ? { ...w, tableIds: [] } : w,
      ),
      released: [...released],
    },
  };
}

/** Meseros que pueden recibir mesas (los desactivados no). */
export function activeWaiters(waiters: readonly Waiter[], staff: readonly StaffUser[]): Waiter[] {
  const inactive = new Set(staff.filter((u) => !u.active && u.waiterId).map((u) => u.waiterId));
  return waiters.filter((w) => !inactive.has(w.id));
}

/**
 * ¿Puede esta persona operar sobre la mesa? Quien ve todo el salón sí; el mesero, solo las suyas.
 */
export function canOperateTable(
  user: StaffUser | undefined,
  waiters: readonly Waiter[],
  tableId: string,
): boolean {
  if (!user?.active) return false;
  if (can(user.role, "mesas.todas")) return true;
  if (!can(user.role, "mesas.propias")) return false;
  return !!waiters.find((w) => w.id === user.waiterId)?.tableIds.includes(tableId);
}
