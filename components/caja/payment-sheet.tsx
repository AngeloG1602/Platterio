"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import {
  cashActions,
  useCreditAccounts,
  useOrders,
  useLivePayments,
  useOpenShift,
  useSessions,
} from "@/lib/data";
import { COURTESY_REASONS } from "@/lib/domain/credit";
import { AccountPicker } from "./credit-accounts";
import { METHOD_LABEL, PAYMENT_METHODS, sessionBalance } from "@/lib/domain/cash";
import { formatMoney, formatTime } from "@/lib/domain/format";
import type { PaymentMethod } from "@/lib/domain/types";

type Mode = "cobrar" | "credito" | "cortesia";

/** Cobrar la cuenta de una mesa: pago completo o en partes, con la forma de pago. */
export function PaymentSheet({
  label,
  sessionId,
  onClose,
}: {
  /** "Mesa 5" o "Domicilio D-4K7Q". */
  label: string;
  sessionId: string;
  onClose: () => void;
}) {
  const orders = useOrders();
  const payments = useLivePayments();
  const shift = useOpenShift();
  const fee = useSessions().find((x) => x.id === sessionId)?.delivery?.fee;
  const balance = sessionBalance(orders, payments, sessionId, fee);
  const own = payments.filter((p) => p.sessionId === sessionId);
  const [mode, setMode] = useState<Mode>("cobrar");
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [amount, setAmount] = useState(String(balance.pending || ""));
  const [accountId, setAccountId] = useState("");
  const [reason, setReason] = useState<string>(COURTESY_REASONS[0]);
  const [error, setError] = useState<string>();
  const accounts = useCreditAccounts();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(/\D/g, ""));
    const r =
      mode === "credito"
        ? cashActions.credit(sessionId, accountId, value)
        : mode === "cortesia"
          ? cashActions.courtesy(sessionId, value, reason, accountId || undefined)
          : cashActions.pay(sessionId, value, method);
    if (!r.ok) return setError(r.error);
    const invoiced = r.invoiceId ? " · Factura guardada" : "";
    const who = accounts.find((a) => a.id === accountId)?.name;
    toast.success(
      mode === "credito"
        ? `A crédito de ${who} · ${label}`
        : mode === "cortesia"
          ? `Cortesía registrada · ${label}`
          : `Pago registrado · ${label}`,
      {
        description:
          mode === "cobrar"
            ? `${METHOD_LABEL[method]} · ${formatMoney(value)}${invoiced}`
            : mode === "credito"
              ? `${formatMoney(value)} · queda debiendo${invoiced}`
              : `${formatMoney(value)} · ${reason}${invoiced}`,
      },
    );
    setError(undefined);
    const left = balance.pending - value;
    if (left <= 0) return onClose();
    setAmount(String(left));
  }

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Cobrar · ${label}`}
      description="Registra lo que pagó el cliente. Puede pagar en partes y con varias formas."
    >
      <div className="flex flex-col gap-5 pb-3">
        <dl className="bg-surface-2 grid grid-cols-3 gap-2 rounded-xl p-3 text-center">
          <div>
            <dt className="text-muted text-xs">Cuenta</dt>
            <dd>
              <Price value={balance.due} className="text-[17px]" />
            </dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Pagado</dt>
            <dd>
              <Price value={balance.paid} className="text-[17px]" />
            </dd>
          </div>
          <div>
            <dt className="text-muted text-xs">Falta</dt>
            <dd>
              <Price value={balance.pending} className="text-[17px]" />
            </dd>
          </div>
        </dl>

        {!shift ? (
          <p
            role="alert"
            className="bg-warning-soft text-warning-ink rounded-lg px-3 py-2 text-sm font-medium"
          >
            La caja está cerrada. Ábrela en la pestaña Caja para poder cobrar.
          </p>
        ) : balance.pending === 0 ? (
          <p className="bg-success-soft text-success-ink rounded-lg px-3 py-2 text-sm font-medium">
            La cuenta está pagada.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Segmented
              label="Cómo se cierra la cuenta"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setAccountId("");
                setError(undefined);
              }}
              options={[
                { value: "cobrar", label: "Cobrar" },
                { value: "credito", label: "A crédito" },
                { value: "cortesia", label: "Cortesía" },
              ]}
            />
            {mode === "cobrar" && (
              <Segmented
                label="Forma de pago"
                value={method}
                onChange={setMethod}
                options={PAYMENT_METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))}
              />
            )}
            {mode === "credito" && (
              <>
                <p className="bg-surface-2 text-ink-soft rounded-lg px-3 py-2 text-sm">
                  Queda a nombre de la persona y se cobra después. Lo autorizas tú, y queda
                  registrado.
                </p>
                <AccountPicker value={accountId} onChange={setAccountId} />
              </>
            )}
            {mode === "cortesia" && (
              <>
                <p className="bg-surface-2 text-ink-soft rounded-lg px-3 py-2 text-sm">
                  No se cobra y no deja deuda: queda como gasto. Lo autorizas tú, y queda
                  registrado.
                </p>
                <Field label="Motivo">
                  {(p) => (
                    <Select {...p} value={reason} onChange={(e) => setReason(e.target.value)}>
                      {COURTESY_REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <AccountPicker
                  value={accountId}
                  onChange={setAccountId}
                  optional
                  label="A nombre de"
                />
              </>
            )}
            <Field
              label={
                mode === "cobrar" ? "Valor que paga ahora" : "Valor de la cuenta que se cierra"
              }
              error={error}
            >
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
            <Button type="submit" size="lg" block>
              {mode === "cobrar"
                ? "Registrar pago"
                : mode === "credito"
                  ? "Cerrar a crédito"
                  : "Registrar cortesía"}
            </Button>
          </form>
        )}

        {own.length > 0 && (
          <section aria-label="Pagos registrados">
            <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">Pagos</h3>
            <ul className="divide-line mt-1 divide-y text-[15px]">
              {own.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <span className="flex-1">
                    {p.kind === "credito"
                      ? `A crédito · ${accounts.find((a) => a.id === p.accountId)?.name ?? "persona"}`
                      : p.kind === "cortesia"
                        ? `Cortesía · ${p.reason ?? ""}`
                        : METHOD_LABEL[p.method]}
                    <span className="text-muted block text-[13px]">
                      {p.by} · {formatTime(new Date(p.at))}
                      {p.authorizedBy ? ` · autorizó ${p.authorizedBy}` : ""}
                    </span>
                  </span>
                  <Price value={p.amount} className="text-sm" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Sheet>
  );
}
