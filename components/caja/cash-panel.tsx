"use client";

import { Banknote, Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/admin/ui/page-header";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { toast } from "@/components/ui/toaster";
import {
  cashActions,
  useAllShifts,
  useLivePayments,
  useOpenShift,
  useOrders,
  useSessions,
  useTables,
} from "@/lib/data";
import { openTablesWithBalance, shiftTotals } from "@/lib/domain/cash";
import { formatMoney, formatDay, formatTime } from "@/lib/domain/format";
import { PaymentSheet } from "./payment-sheet";

const toNumber = (text: string) => Number(text.replace(/\D/g, ""));

/** Caja: abrir el turno con un fondo, cobrar mesas y cerrar contando el efectivo. */
export function CashPanel() {
  const shift = useOpenShift();
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-5 pb-16 sm:px-6">
      {shift ? <OpenShift /> : <ClosedShift />}
      <History />
    </main>
  );
}

function ClosedShift() {
  const [float, setFloat] = useState("100000");
  const [error, setError] = useState<string>();
  return (
    <Panel
      title="La caja está cerrada"
      description="Ábrela con el efectivo que hay en el cajón para empezar a cobrar."
    >
      <form
        className="flex max-w-md flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const r = cashActions.openShift(toNumber(float));
          if (!r.ok) return setError(r.error);
          toast.success("Caja abierta");
        }}
      >
        <Field label="Fondo inicial en efectivo" error={error}>
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={float}
              onChange={(e) => {
                setFloat(e.target.value.replace(/\D/g, ""));
                setError(undefined);
              }}
            />
          )}
        </Field>
        <Button type="submit" size="lg">
          <LockOpen aria-hidden /> Abrir caja
        </Button>
      </form>
    </Panel>
  );
}

function OpenShift() {
  const shift = useOpenShift()!;
  const payments = useLivePayments();
  const orders = useOrders();
  const sessions = useSessions();
  const tables = useTables();
  const [paying, setPaying] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const totals = shiftTotals(shift, payments);
  const owing = openTablesWithBalance(sessions, orders, payments, tables);
  const target = owing.find((x) => x.session.id === paying);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Cobrado en el turno"
          icon={Banknote}
          value={formatMoney(totals.total)}
          note={`${totals.payments} pagos`}
        />
        <StatTile
          label="Efectivo esperado"
          value={formatMoney(totals.expectedCash)}
          note={`Fondo ${formatMoney(shift.openingFloat)}`}
        />
        <StatTile label="Tarjeta" value={formatMoney(totals.byMethod.tarjeta)} />
        <StatTile label="Transferencia" value={formatMoney(totals.byMethod.transferencia)} />
      </div>

      <Panel
        title="Mesas por cobrar"
        description={`Caja abierta por ${shift.openedBy} a las ${formatTime(new Date(shift.openedAt))}.`}
        action={
          <Button variant="secondary" size="sm" onClick={() => setClosing(true)}>
            <Lock aria-hidden /> Cerrar caja
          </Button>
        }
      >
        {owing.length === 0 ? (
          <p className="text-muted text-[15px]">No hay mesas abiertas con saldo pendiente.</p>
        ) : (
          <ul className="divide-line divide-y">
            {owing.map((x) => (
              <li key={x.session.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex-1 font-semibold">Mesa {x.table?.number}</span>
                <span className="text-muted text-sm">
                  Pagado <Price value={x.paid} />
                </span>
                <span className="text-sm">
                  Falta <Price value={x.pending} />
                </span>
                <Button size="sm" onClick={() => setPaying(x.session.id)}>
                  Cobrar<span className="sr-only"> la Mesa {x.table?.number}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {target && (
        <PaymentSheet
          label={`Mesa ${target.table?.number ?? ""}`}
          sessionId={target.session.id}
          onClose={() => setPaying(null)}
        />
      )}
      {closing && (
        <CloseDialog
          expected={totals.expectedCash}
          owing={owing.length}
          onClose={() => setClosing(false)}
        />
      )}
    </>
  );
}

function CloseDialog({
  expected,
  owing,
  onClose,
}: {
  expected: number;
  owing: number;
  onClose: () => void;
}) {
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const diff = counted === "" ? null : toNumber(counted) - expected;

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Cerrar la caja"
      description={`Cuenta el efectivo del cajón. Debería haber ${formatMoney(expected)}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            onClick={() => {
              if (counted === "") return setError("Escribe el efectivo que contaste");
              const r = cashActions.closeShift(toNumber(counted), note);
              if (!r.ok) return setError(r.error);
              toast.success("Caja cerrada");
              onClose();
            }}
          >
            Cerrar caja
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {owing > 0 && (
          <p className="bg-warning-soft text-warning-ink rounded-lg px-3 py-2 text-sm font-medium">
            Hay {owing === 1 ? "una mesa" : `${owing} mesas`} con saldo por cobrar. Puedes cerrar
            igual, pero esos pagos quedarán sin registrar.
          </p>
        )}
        <Field label="Efectivo contado">
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={counted}
              onChange={(e) => {
                setCounted(e.target.value.replace(/\D/g, ""));
                setError(undefined);
              }}
            />
          )}
        </Field>
        {diff !== null && (
          <p
            aria-live="polite"
            className={
              diff === 0
                ? "text-success-ink text-sm font-medium"
                : "text-danger-ink text-sm font-medium"
            }
          >
            {diff === 0
              ? "La caja cuadra."
              : diff < 0
                ? `Faltan ${formatMoney(-diff)}.`
                : `Sobran ${formatMoney(diff)}.`}
          </p>
        )}
        <Field label="Nota" optional={diff === 0 || diff === null} error={error}>
          {(p) => (
            <Input
              {...p}
              value={note}
              maxLength={120}
              placeholder="Si hay diferencia, cuéntanos por qué"
              onChange={(e) => {
                setNote(e.target.value);
                setError(undefined);
              }}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}

function History() {
  const shifts = useAllShifts()
    .filter((s) => s.closedAt)
    .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!))
    .slice(0, 8);
  return (
    <Panel title="Cierres anteriores" description="Los últimos turnos cerrados.">
      {shifts.length === 0 ? (
        <p className="text-muted text-[15px]">Todavía no hay cierres.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">Cierres de caja</caption>
            <thead className="text-muted text-sm">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Día
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Cerró
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Cobrado
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Diferencia
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 pr-4">{formatDay(new Date(s.closedAt!))}</td>
                  <td className="py-2.5 pr-4">{s.closedBy}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatMoney(s.summary?.total ?? 0)}
                  </td>
                  <td
                    className={
                      "py-2.5 pr-4 text-right tabular-nums " +
                      ((s.summary?.difference ?? 0) === 0 ? "text-success-ink" : "text-danger-ink")
                    }
                  >
                    {(s.summary?.difference ?? 0) === 0
                      ? "Cuadra"
                      : formatMoney(s.summary!.difference)}
                    {s.note && <span className="text-muted block text-xs">{s.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
