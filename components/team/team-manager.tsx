"use client";

import { KeyRound, Pencil, UserCheck, UserPlus, UserX } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { teamActions, useCurrentStaff, useStaff, useTables, useWaiters } from "@/lib/data";
import {
  assignableRoles,
  canManage,
  pinHint,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  ROLES,
  type Role,
  type StaffUser,
} from "@/lib/domain/access";

/**
 * Equipo del negocio: quién entra al sistema y con qué rol. El administrador crea cualquier rol;
 * el encargado, solo meseros y cocina. A nadie se le borra: se desactiva y el historial se conserva.
 */
export function TeamManager() {
  const staff = useStaff();
  const actor = useCurrentStaff();
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [deactivating, setDeactivating] = useState<StaffUser | null>(null);
  if (!actor) return null;

  const grouped = ROLES.map((role) => ({
    role,
    users: staff.filter((u) => u.role === role),
  })).filter((g) => g.users.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <AddUserForm actorRole={actor.role} />

      <Panel
        title="Usuarios"
        description="Cada persona entra con su propio PIN. Los PIN no se muestran: si alguien lo olvida, se le asigna uno nuevo."
      >
        <div className="flex flex-col gap-6">
          {grouped.map(({ role, users }) => (
            <section key={role} aria-labelledby={`rol-${role}`}>
              <h3 id={`rol-${role}`} className="text-[15px] font-semibold">
                {ROLE_LABEL[role]}
                <span className="text-muted ml-2 text-[13px] font-normal">
                  {ROLE_DESCRIPTION[role]}
                </span>
              </h3>
              <ul className="divide-line mt-1 divide-y">
                {users.map((u) => {
                  const manageable = canManage(actor.role, u.role);
                  const me = u.id === actor.id;
                  return (
                    <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span
                        className={
                          "font-display flex size-10 items-center justify-center rounded-full font-semibold " +
                          (u.active
                            ? "bg-accent-soft text-accent-strong"
                            : "bg-surface-2 text-muted")
                        }
                      >
                        {u.name.charAt(0)}
                      </span>
                      <span className="min-w-32 flex-1">
                        <span className={"block font-semibold " + (u.active ? "" : "text-muted")}>
                          {u.name}
                          {me && (
                            <span className="text-muted ml-1.5 text-sm font-normal">(tú)</span>
                          )}
                        </span>
                      </span>
                      {u.active ? <Badge tone="success">Activo</Badge> : <Badge>Desactivado</Badge>}
                      {manageable ? (
                        <div className="flex gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => setEditing(u)}>
                            <Pencil aria-hidden /> Editar
                            <span className="sr-only"> a {u.name}</span>
                          </Button>
                          {u.active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={me}
                              title={me ? "No puedes desactivarte a ti mismo" : undefined}
                              onClick={() => setDeactivating(u)}
                            >
                              <UserX aria-hidden /> Desactivar
                              <span className="sr-only"> a {u.name}</span>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const r = teamActions.setActive(u.id, true);
                                if (!r.ok) return toast.error(r.error);
                                toast.success(`${u.name} volvió a entrar al sistema`);
                              }}
                            >
                              <UserCheck aria-hidden /> Activar
                              <span className="sr-only"> a {u.name}</span>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted text-[13px]">Solo el administrador</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Panel>

      {editing && <EditDialog key={editing.id} user={editing} onClose={() => setEditing(null)} />}
      <DeactivateDialog user={deactivating} onClose={() => setDeactivating(null)} />
    </div>
  );
}

function AddUserForm({ actorRole }: { actorRole: Role }) {
  const roles = assignableRoles(actorRole);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(roles.includes("mesero") ? "mesero" : roles[0]!);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Panel
      title="Agregar usuario"
      description="Un mesero nuevo queda sin mesas: asígnale las suyas después."
    >
      <form
        className="grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const r = teamActions.add({ name, role, pin });
          if (!r.ok) return setError(r.error);
          toast.success(`${name.trim()} agregado`, {
            description:
              role === "mesero"
                ? "Asígnale mesas para que reciba pedidos."
                : "Ya puede entrar con su PIN.",
          });
          setName("");
          setPin("");
          setError(null);
        }}
      >
        <Field label="Nombre">
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Ej. Juliana"
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="Rol">
          {(p) => (
            <Select {...p} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="PIN" hint={pinHint(role)}>
          {(p) => (
            <Input
              {...p}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              type="password"
            />
          )}
        </Field>
        <Button type="submit">
          <UserPlus aria-hidden /> Agregar
        </Button>
        {error && (
          <p role="alert" className="text-danger-ink text-sm font-medium sm:col-span-4">
            {error}
          </p>
        )}
      </form>
    </Panel>
  );
}

function EditDialog({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const [name, setName] = useState(user.name);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const patch: { name?: string; pin?: string } = {};
    if (name.trim() !== user.name) patch.name = name;
    if (pin) patch.pin = pin;
    if (!patch.name && !patch.pin) return onClose();
    const r = teamActions.update(user.id, patch);
    if (!r.ok) return setError(r.error);
    toast.success("Cambios guardados", {
      description: patch.pin ? "Avísale su nuevo PIN en persona." : undefined,
    });
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Editar a ${user.name}`}
      description={`${ROLE_LABEL[user.role]}. Deja el PIN vacío para no cambiarlo.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>
            <KeyRound aria-hidden /> Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nombre">
          {(p) => (
            <Input {...p} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
          )}
        </Field>
        <Field label="Nuevo PIN" hint={pinHint(user.role)} optional>
          {(p) => (
            <Input
              {...p}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              type="password"
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-danger-ink text-sm font-medium">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function DeactivateDialog({ user, onClose }: { user: StaffUser | null; onClose: () => void }) {
  const waiterTables = useWaiterTableNumbers(user);
  if (!user) return null;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`¿Desactivar a ${user.name}?`}
      description={
        <>
          Dejará de poder entrar al sistema. Su historial de pedidos y calificaciones se conserva y
          puedes volver a activarlo cuando quieras.
          {waiterTables.length > 0 && (
            <>
              {" "}
              <strong>
                Sus mesas ({waiterTables.map((n) => `Mesa ${n}`).join(", ")}) quedarán sin mesero
              </strong>{" "}
              hasta que las asignes a otra persona.
            </>
          )}
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const r = teamActions.setActive(user.id, false);
              if (!r.ok) {
                toast.error(r.error);
              } else {
                toast.success(`${user.name} desactivado`, {
                  description: r.released?.length
                    ? `Sus ${r.released.length} mesas quedaron sin mesero.`
                    : undefined,
                });
              }
              onClose();
            }}
          >
            Desactivar
          </Button>
        </>
      }
    />
  );
}

function useWaiterTableNumbers(user: StaffUser | null): number[] {
  const waiters = useWaiters();
  const tables = useTables();
  const w = waiters.find((x) => x.id === user?.waiterId);
  return tables.filter((t) => w?.tableIds.includes(t.id)).map((t) => t.number);
}
