import { describe, expect, it } from "vitest";
import {
  activeWaiters,
  addStaff,
  assignableRoles,
  can,
  canAccessPath,
  canManage,
  canOperateTable,
  HOME,
  login,
  permissionForPath,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  setStaffActive,
  updateStaff,
  validatePin,
  type StaffUser,
} from "./access";
import type { Waiter } from "./types";

const staff: StaffUser[] = [
  { id: "marta", name: "Marta", role: "admin", pin: "246810", active: true },
  { id: "julian", name: "Julián", role: "encargado", pin: "135790", active: true },
  { id: "carlos", name: "Carlos", role: "mesero", pin: "1111", active: true, waiterId: "carlos" },
  { id: "cocina", name: "Cocina", role: "cocina", pin: "3333", active: true },
];
const waiters: Waiter[] = [{ id: "carlos", name: "Carlos", tableIds: ["mesa-1", "mesa-2"] }];
const state = { staff, waiters };

describe("permisos por rol", () => {
  it("el administrador puede todo y los demás roles, solo lo suyo", () => {
    // Todo menos "mesas propias": el administrador no es mesero, ve todo el salón.
    expect(PERMISSIONS.filter((p) => !can("admin", p))).toEqual(["mesas.propias"]);
    expect(can("encargado", "panel.admin")).toBe(false);
    expect(can("encargado", "equipo.todos")).toBe(false);
    expect(can("encargado", "mesas.asignar")).toBe(true);
    expect(can("mesero", "mesas.asignar")).toBe(false);
    expect(can("mesero", "cobrar")).toBe(false);
    expect(can("cocina", "pedidos.crear")).toBe(false);
    expect(can("cocina", "cocina.tablero")).toBe(true);
    expect(can(undefined, "cocina.tablero")).toBe(false);
  });

  it("cada rol tiene permisos sin repetir", () => {
    for (const role of ROLES) {
      expect(new Set(ROLE_PERMISSIONS[role]).size).toBe(ROLE_PERMISSIONS[role].length);
    }
  });

  it("el encargado opera todo el salón pero no entra al panel del administrador", () => {
    expect(canAccessPath("encargado", "/caja")).toBe(true);
    expect(canAccessPath("encargado", "/admin")).toBe(false);
    expect(canAccessPath("encargado", "/admin/ventas")).toBe(false);
    expect(canAccessPath("encargado", "/cocina")).toBe(true);
  });

  it("cada rol entra a su pantalla de inicio y no a la de los demás", () => {
    for (const role of ROLES) expect(canAccessPath(role, HOME[role])).toBe(true);
    expect(canAccessPath("mesero", "/cocina")).toBe(false);
    expect(canAccessPath("cocina", "/mesero")).toBe(false);
    expect(canAccessPath("admin", "/mesero")).toBe(false);
    expect(canAccessPath(undefined, "/admin")).toBe(false);
  });

  it("las rutas del cliente y las desconocidas no piden permiso", () => {
    expect(permissionForPath("/mesa/3/menu")).toBeNull();
    expect(permissionForPath("/administrador")).toBeNull();
    expect(canAccessPath(undefined, "/mesa/3")).toBe(true);
  });
});

describe("entrar con PIN", () => {
  it("el PIN identifica a la persona", () => {
    const r = login(staff, " 1111 ");
    expect(r.ok && r.value.id).toBe("carlos");
  });

  it("un PIN equivocado o de alguien desactivado no entra", () => {
    expect(login(staff, "9999")).toEqual({ ok: false, error: "PIN incorrecto" });
    const off = staff.map((u) => (u.id === "carlos" ? { ...u, active: false } : u));
    expect(login(off, "1111").ok).toBe(false);
  });

  it("el PIN del administrador y del encargado es más largo", () => {
    expect(validatePin("1234", "mesero")).toBeNull();
    expect(validatePin("1234", "admin")).toMatch(/6 a 8 dígitos/);
    expect(validatePin("123456", "encargado")).toBeNull();
    expect(validatePin("12a4", "mesero")).toMatch(/solo lleva números/);
    expect(validatePin("1234567", "cocina")).toMatch(/4 a 6 dígitos/);
  });
});

describe("crear usuarios", () => {
  it("el administrador crea cualquier rol; el encargado, solo meseros y cocina", () => {
    expect(assignableRoles("admin")).toEqual(["admin", "encargado", "mesero", "cocina"]);
    expect(assignableRoles("encargado")).toEqual(["mesero", "cocina"]);
    expect(assignableRoles("mesero")).toEqual([]);
    expect(canManage("encargado", "admin")).toBe(false);
  });

  it("un mesero nuevo trae su ficha de mesero y queda sin mesas", () => {
    const r = addStaff(
      state,
      { name: " Juliana  Ríos ", role: "mesero", pin: "4444" },
      "encargado",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const user = r.value.staff.find((u) => u.name === "Juliana Ríos")!;
    expect(user).toMatchObject({ role: "mesero", active: true, waiterId: user.id });
    expect(r.value.waiters.find((w) => w.id === user.id)).toEqual({
      id: user.id,
      name: "Juliana Ríos",
      tableIds: [],
    });
  });

  it("el personal de cocina no crea ficha de mesero", () => {
    const r = addStaff(state, { name: "Pedro", role: "cocina", pin: "5555" }, "admin");
    expect(r.ok && r.value.waiters).toHaveLength(1);
  });

  it("rechaza permisos, nombre, PIN inválido y PIN repetido", () => {
    expect(addStaff(state, { name: "Ana", role: "admin", pin: "11112222" }, "encargado")).toEqual({
      ok: false,
      error: "No puedes crear usuarios con ese rol",
    });
    expect(addStaff(state, { name: "  ", role: "mesero", pin: "4444" }, "admin").ok).toBe(false);
    expect(addStaff(state, { name: "carlos", role: "mesero", pin: "4444" }, "admin")).toEqual({
      ok: false,
      error: "Ya hay un usuario con ese nombre",
    });
    expect(addStaff(state, { name: "Ana", role: "mesero", pin: "12" }, "admin").ok).toBe(false);
    expect(addStaff(state, { name: "Ana", role: "mesero", pin: "1111" }, "admin")).toEqual({
      ok: false,
      error: "Ese PIN ya lo usa otra persona. Elige otro.",
    });
  });
});

describe("editar y desactivar", () => {
  it("cambiar el nombre del mesero actualiza también su ficha", () => {
    const r = updateStaff(state, "carlos", { name: "Carlos Andrés" }, "encargado");
    expect(r.ok && r.value.waiters[0]!.name).toBe("Carlos Andrés");
  });

  it("cambiar el PIN valida largo y repetidos, y el encargado no toca al administrador", () => {
    expect(updateStaff(state, "carlos", { pin: "3333" }, "admin").ok).toBe(false);
    expect(updateStaff(state, "carlos", { pin: "7777" }, "admin").ok).toBe(true);
    expect(updateStaff(state, "marta", { pin: "99998888" }, "encargado")).toEqual({
      ok: false,
      error: "No puedes modificar a este usuario",
    });
  });

  it("desactivar a un mesero deja libres sus mesas, sin borrar su ficha", () => {
    const r = setStaffActive(state, "carlos", false, { id: "julian", role: "encargado" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.released).toEqual(["mesa-1", "mesa-2"]);
    expect(r.value.waiters[0]).toMatchObject({ id: "carlos", tableIds: [] });
    expect(r.value.staff.find((u) => u.id === "carlos")!.active).toBe(false);
    expect(activeWaiters(waiters, r.value.staff)).toEqual([]);
  });

  it("no te puedes desactivar ni dejar el negocio sin administrador", () => {
    expect(setStaffActive(state, "marta", false, { id: "marta", role: "admin" })).toEqual({
      ok: false,
      error: "No puedes desactivarte a ti mismo",
    });
    const two = [
      ...staff,
      { id: "luis", name: "Luis", role: "admin", pin: "11223344", active: true } as StaffUser,
    ];
    expect(
      setStaffActive({ staff: two, waiters }, "marta", false, { id: "luis", role: "admin" }).ok,
    ).toBe(true);
    const solo = setStaffActive(state, "marta", false, { id: "otro", role: "admin" });
    expect(solo).toEqual({ ok: false, error: "Debe quedar al menos un administrador activo" });
  });

  it("volver a activar a alguien no cambia sus mesas ni exige condiciones extra", () => {
    const off = setStaffActive(state, "carlos", false, { id: "julian", role: "encargado" });
    if (!off.ok) throw new Error("debía poder desactivarse");
    const on = setStaffActive(
      { staff: off.value.staff, waiters: off.value.waiters },
      "carlos",
      true,
      {
        id: "julian",
        role: "encargado",
      },
    );
    expect(on.ok && on.value.staff.find((u) => u.id === "carlos")!.active).toBe(true);
  });
});

describe("operar una mesa", () => {
  const user = (id: string) => staff.find((u) => u.id === id);
  it("el mesero opera solo sus mesas; encargado y administrador, todas", () => {
    expect(canOperateTable(user("carlos"), waiters, "mesa-1")).toBe(true);
    expect(canOperateTable(user("carlos"), waiters, "mesa-5")).toBe(false);
    expect(canOperateTable(user("julian"), waiters, "mesa-5")).toBe(true);
    expect(canOperateTable(user("marta"), waiters, "mesa-5")).toBe(true);
  });

  it("cocina, usuarios desactivados y sesión cerrada no operan mesas", () => {
    expect(canOperateTable(user("cocina"), waiters, "mesa-1")).toBe(false);
    expect(canOperateTable({ ...user("carlos")!, active: false }, waiters, "mesa-1")).toBe(false);
    expect(canOperateTable(undefined, waiters, "mesa-1")).toBe(false);
  });
});
