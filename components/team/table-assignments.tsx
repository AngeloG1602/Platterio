"use client";

import { Check, TriangleAlert, UserPlus } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/admin/ui/page-header";
import { buttonClasses, Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { toast } from "@/components/ui/toaster";
import { configActions, useActiveWaiters, useTables, useWaiters } from "@/lib/data";

/** Asigna las mesas a los meseros: cada mesa tiene un solo mesero. */
export function TableAssignments({
  teamHref,
  onTeam,
}: {
  /** Enlace a la sección de equipo (para crear meseros). */
  teamHref?: string;
  /** O una acción que lleva a esa sección, si está en la misma pantalla. */
  onTeam?: () => void;
}) {
  const everyone = useWaiters();
  const waiters = useActiveWaiters();
  const tables = useTables();
  const unassigned = tables.filter((t) => !everyone.some((w) => w.tableIds.includes(t.id)));

  return (
    <Panel
      title="Meseros y mesas"
      description="Cada mesa tiene un solo mesero. Toca una mesa para asignarla o quitarla."
      action={
        teamHref ? (
          <Link href={teamHref} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <UserPlus aria-hidden /> Agregar mesero
          </Link>
        ) : onTeam ? (
          <Button variant="secondary" size="sm" onClick={onTeam}>
            <UserPlus aria-hidden /> Agregar mesero
          </Button>
        ) : undefined
      }
    >
      {unassigned.length > 0 && (
        <p className="bg-warning-soft text-warning-ink mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          Sin mesero: {unassigned.map((t) => `Mesa ${t.number}`).join(", ")}. Sus pedidos no le
          llegarán a nadie.
        </p>
      )}
      {waiters.length === 0 ? (
        <p className="text-muted text-[15px]">
          Todavía no hay meseros. Créalos en la sección de equipo y vuelve para asignarles mesas.
        </p>
      ) : (
        <ul className="divide-line flex flex-col divide-y">
          {waiters.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="font-display bg-accent-soft text-accent-strong flex size-10 items-center justify-center rounded-full font-semibold">
                {w.name.charAt(0)}
              </span>
              <span className="w-28 font-semibold">{w.name}</span>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={`Mesas de ${w.name}`}
              >
                {tables.map((t) => {
                  const on = w.tableIds.includes(t.id);
                  const other = waiters.find((x) => x.id !== w.id && x.tableIds.includes(t.id));
                  return (
                    <FilterChip
                      key={t.id}
                      selected={on}
                      className="h-9 px-3 text-[13px]"
                      title={other && !on ? `Ahora es de ${other.name}` : undefined}
                      onClick={() => {
                        const r = configActions.toggleAssignment(w.id, t.id);
                        if (!r.ok) toast.error(r.error);
                      }}
                    >
                      {on && <Check aria-hidden />} Mesa {t.number}
                      {other && !on && (
                        <span className="text-muted text-xs font-normal">· {other.name}</span>
                      )}
                    </FilterChip>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
