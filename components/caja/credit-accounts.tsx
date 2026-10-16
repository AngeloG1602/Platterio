"use client";

import { Download, Plus, UserPen, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Panel } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import {
  creditActions,
  useCreditAccounts,
  useCreditPayments,
  useLivePayments,
  useOpenShift,
  useSessions,
  useTables,
} from "@/lib/data";
import { toCsv } from "@/lib/domain/cash";
import {
  accountBalance,
  accountStatement,
  CREDIT_KIND_LABEL,
  CREDIT_KINDS,
  REPAYMENT_LABEL,
  REPAYMENT_METHODS,
  type AccountErrors,
  type RepaymentMethod,
} from "@/lib/domain/credit";
import { placeLabel } from "@/lib/domain/delivery";
import { formatDay, formatMoney, formatTime, plural } from "@/lib/domain/format";
import type { CreditAccount, CreditKind } from "@/lib/domain/types";

const toNumber = (text: string) => Number(text.replace(/\D/g, ""));

/** Formulario para agregar o editar a una persona con cuenta a crédito. */
export function AccountDialog({
  account,
  onClose,
  onSaved,
}: {
  account?: CreditAccount;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<CreditKind>(account?.kind ?? "empleado");
  const [document, setDocument] = useState(account?.document ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [limit, setLimit] = useState(account?.limit ? String(account.limit) : "");
  const [errors, setErrors] = useState<AccountErrors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = creditActions.saveAccount({ name, kind, document, phone, limit }, account?.id);
    if (!r.ok) return setErrors(r.errors);
    toast.success(account ? "Cambios guardados" : `${name.trim()} agregada`);
    onSaved?.(r.id);
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={account ? `Editar a ${account.name}` : "Agregar una persona a crédito"}
      description="A su nombre quedan los consumos a crédito. La cédula sirve para que la cuenta salga a su nombre."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cuenta-form">
            Guardar
          </Button>
        </>
      }
    >
      <form id="cuenta-form" onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        <Field label="Nombre completo" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="Tipo">
          {(p) => (
            <Select {...p} value={kind} onChange={(e) => setKind(e.target.value as CreditKind)}>
              {CREDIT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {CREDIT_KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Cédula o NIT" optional error={errors.document}>
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
          )}
        </Field>
        <Field label="Celular" optional error={errors.phone}>
          {(p) => (
            <Input
              {...p}
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Tope de crédito en pesos"
          optional
          hint="Si lo dejas vacío, no hay tope."
          error={errors.limit}
        >
          {(p) => (
            <Input
              {...p}
              inputMode="numeric"
              value={limit}
              onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

function download(name: string, rows: (string | number | null)[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Pestaña "Crédito": las personas con cuenta, lo que debe cada una y sus abonos. */
export function CreditTab() {
  const accounts = useCreditAccounts();
  const payments = useLivePayments();
  const repayments = useCreditPayments();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      accounts
        .map((a) => ({ account: a, debt: accountBalance(a.id, payments, repayments) }))
        .sort((a, b) => b.debt - a.debt || a.account.name.localeCompare(b.account.name, "es")),
    [accounts, payments, repayments],
  );
  const total = rows.reduce((s, r) => s + r.debt, 0);
  const selected = accounts.find((a) => a.id === openId);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-5 pb-16 sm:px-6">
      <Panel
        title="Cuentas a crédito"
        description={
          rows.length > 0
            ? `Se debe ${formatMoney(total)} en total. Un crédito lo autoriza quien está en Caja, y queda a nombre de la persona.`
            : "Las personas a las que se les fía (empleados, dueño o familia, clientes especiales) aparecen aquí con lo que deben."
        }
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Agregar persona
          </Button>
        }
      >
        {rows.length === 0 ? (
          <p className="text-muted text-[15px]">Todavía no hay personas con cuenta a crédito.</p>
        ) : (
          <ul className="divide-line divide-y">
            {rows.map(({ account, debt }) => (
              <li key={account.id} className="flex flex-wrap items-center gap-3 py-3">
                <UserRound className="text-muted size-5" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{account.name}</span>
                  {!account.active && <span className="text-muted"> · desactivada</span>}
                  <span className="text-muted block text-sm">
                    {CREDIT_KIND_LABEL[account.kind]}
                    {account.limit ? ` · tope ${formatMoney(account.limit)}` : ""}
                  </span>
                </span>
                <span className="text-sm">
                  Debe <Price value={debt} className={debt > 0 ? "text-danger-ink" : undefined} />
                </span>
                <Button size="sm" variant="secondary" onClick={() => setOpenId(account.id)}>
                  Ver cuenta<span className="sr-only"> de {account.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {adding && <AccountDialog onClose={() => setAdding(false)} />}
      {selected && <AccountSheet account={selected} onClose={() => setOpenId(null)} />}
    </main>
  );
}

function AccountSheet({ account, onClose }: { account: CreditAccount; onClose: () => void }) {
  const payments = useLivePayments();
  const repayments = useCreditPayments();
  const tables = useTables();
  const sessions = useSessions();
  const shift = useOpenShift();
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<RepaymentMethod>("efectivo");
  const debt = accountBalance(account.id, payments, repayments);
  const [amount, setAmount] = useState(String(debt || ""));
  const [error, setError] = useState<string>();
  const statement = accountStatement(account.id, payments, repayments, (p) =>
    placeLabel(p, tables, sessions),
  );

  function repay(e: React.FormEvent) {
    e.preventDefault();
    const value = toNumber(amount);
    const r = creditActions.repay(account.id, value, method);
    if (!r.ok) return setError(r.error);
    toast.success(`Abono registrado · ${account.name}`, {
      description: `${REPAYMENT_LABEL[method]} · ${formatMoney(value)}`,
    });
    setError(undefined);
    setAmount(String(Math.max(0, debt - value) || ""));
  }

  return (
    <>
      <Sheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={account.name}
        description={`${CREDIT_KIND_LABEL[account.kind]}${account.document ? ` · ${account.document}` : ""}${account.phone ? ` · ${account.phone}` : ""}`}
      >
        <div className="flex flex-col gap-5 pb-3">
          <div className="bg-surface-2 flex items-baseline justify-between rounded-xl p-3">
            <span className="text-muted text-sm">Debe</span>
            <Price value={debt} className="text-2xl" />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <UserPen aria-hidden /> Editar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const r = creditActions.setAccountActive(account.id, !account.active);
                if (!r.ok) toast.error(r.error);
              }}
            >
              {account.active ? "Desactivar" : "Activar"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={statement.length === 0}
              onClick={() =>
                download(`cuenta-${account.name.toLowerCase().replace(/\s+/g, "-")}.csv`, [
                  ["Fecha", "Hora", "Movimiento", "Detalle", "Valor", "Registró", "Autorizó"],
                  ...statement.map((r) => [
                    formatDay(new Date(r.at)),
                    formatTime(new Date(r.at)),
                    r.kind === "cargo" ? "Crédito" : "Abono",
                    r.label,
                    r.kind === "cargo" ? r.amount : -r.amount,
                    r.by,
                    r.authorizedBy ?? "",
                  ]),
                ])
              }
            >
              <Download aria-hidden /> CSV<span className="sr-only"> de la cuenta</span>
            </Button>
          </div>

          {debt > 0 && (
            <form onSubmit={repay} noValidate className="flex flex-col gap-3.5">
              <h3 className="text-sm font-semibold">Registrar un pago</h3>
              <Select
                aria-label="Forma de pago del abono"
                value={method}
                onChange={(e) => setMethod(e.target.value as RepaymentMethod)}
              >
                {REPAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {REPAYMENT_LABEL[m]}
                  </option>
                ))}
              </Select>
              {method !== "nomina" && !shift && (
                <p
                  role="alert"
                  className="bg-warning-soft text-warning-ink rounded-lg px-3 py-2 text-sm"
                >
                  Abre la caja para recibir pagos en efectivo, tarjeta o transferencia.
                </p>
              )}
              <Field label="Valor que paga" error={error}>
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value.replace(/\D/g, ""));
                      setError(undefined);
                    }}
                  />
                )}
              </Field>
              <Button type="submit" block>
                Registrar pago
              </Button>
            </form>
          )}

          <section aria-label="Movimientos de la cuenta">
            <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
              {plural(statement.length, "movimiento", "movimientos")}
            </h3>
            {statement.length === 0 ? (
              <p className="text-muted mt-1 text-[15px]">Todavía no tiene consumos a crédito.</p>
            ) : (
              <ul className="divide-line mt-1 divide-y text-[15px]">
                {statement.map((r, i) => (
                  <li key={`${r.at}-${i}`} className="flex items-center gap-3 py-2">
                    <span className="flex-1">
                      {r.kind === "cargo" ? "Crédito" : "Abono"} · {r.label}
                      <span className="text-muted block text-[13px]">
                        {formatDay(new Date(r.at))} · {formatTime(new Date(r.at))} · {r.by}
                        {r.authorizedBy ? ` · autorizó ${r.authorizedBy}` : ""}
                      </span>
                    </span>
                    <span className={r.kind === "abono" ? "text-success-ink" : undefined}>
                      <Price
                        value={r.kind === "abono" ? -r.amount : r.amount}
                        className="text-sm"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Sheet>
      {editing && <AccountDialog account={account} onClose={() => setEditing(false)} />}
    </>
  );
}

/** Para elegir a la persona en el cobro: lista de activas y "Agregar persona". */
export function AccountPicker({
  value,
  onChange,
  optional,
  error,
  label = "Persona",
}: {
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
  error?: string;
  label?: string;
}) {
  const accounts = useCreditAccounts().filter((a) => a.active);
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} optional={optional} error={error}>
        {(p) => (
          <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{optional ? "Sin persona" : "Elige a la persona"}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {CREDIT_KIND_LABEL[a.kind]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => setAdding(true)}
      >
        <Plus aria-hidden /> Agregar persona
      </Button>
      {adding && <AccountDialog onClose={() => setAdding(false)} onSaved={onChange} />}
    </div>
  );
}
