"use client";

import { Download, Eye, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { describePeriod, PeriodFilter, usePeriod } from "@/components/admin/ui/period-filter";
import { Panel } from "@/components/admin/ui/page-header";
import { StatTile } from "@/components/admin/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { invoiceActions, useInvoices } from "@/lib/data";
import { toCsv } from "@/lib/domain/cash";
import { formatDay, formatMoney, formatTime, plural } from "@/lib/domain/format";
import { filterInvoices, invoiceCode, invoicesCsvRows } from "@/lib/domain/invoice";
import type { Invoice } from "@/lib/domain/types";
import { printInvoice } from "./print-invoice";

function download(name: string, rows: (string | number | null)[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Facturas guardadas: se consultan, se buscan y se reimprimen. */
export function InvoicesPanel() {
  const invoices = useInvoices();
  const period = usePeriod("7d");
  const [text, setText] = useState("");
  const [open, setOpen] = useState<Invoice | null>(null);
  const rows = useMemo(
    () => filterInvoices(invoices, { text, period: period.period }),
    [invoices, text, period.period],
  );
  const total = rows.reduce((s, i) => s + i.total, 0);

  return (
    <>
      <Panel title="Filtros">
        <div className="flex flex-col gap-4">
          <PeriodFilter state={period} />
          <label className="flex max-w-md flex-col gap-1.5 text-sm font-medium">
            Buscar
            <Input
              value={text}
              placeholder="Número, mesa, cliente o plato…"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile label="Facturas" value={rows.length} note={describePeriod(period.period)} />
        <StatTile label="Total facturado" value={formatMoney(total)} note="Con estos filtros" />
      </div>

      <Panel
        title="Facturas"
        description={`${plural(rows.length, "factura", "facturas")}, de la más reciente a la más antigua. Se genera una al quedar saldada cada cuenta.`}
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => download("facturas.csv", invoicesCsvRows(rows))}
          >
            <Download aria-hidden /> CSV<span className="sr-only"> de las facturas</span>
          </Button>
        }
      >
        {rows.length === 0 ? (
          <p className="text-muted text-[15px]">No hay facturas con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">Facturas</caption>
              <thead className="text-muted text-sm">
                <tr>
                  {["Número", "Cuándo", "Lugar", "Cliente", "Total", "Pago", ""].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`py-2 pr-4 font-medium ${h === "Total" ? "text-right" : ""}`}
                    >
                      {h || <span className="sr-only">Acciones</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {rows.slice(0, 200).map((i) => (
                  <tr key={i.id} className="align-top">
                    <th scope="row" className="py-2.5 pr-4 font-semibold whitespace-nowrap">
                      {invoiceCode(i.number)}
                    </th>
                    <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                      {formatDay(new Date(i.issuedAt))}
                      <span className="text-muted"> · {formatTime(new Date(i.issuedAt))}</span>
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{i.place}</td>
                    <td className="py-2.5 pr-4">{i.customer?.name ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(i.total)}</td>
                    <td className="text-ink-soft py-2.5 pr-4">
                      {i.payments.map((p) => p.label).join(" + ")}
                    </td>
                    <td className="py-2.5 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setOpen(i)}>
                        <Eye aria-hidden /> Ver
                        <span className="sr-only"> {invoiceCode(i.number)}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && (
              <p className="text-muted mt-3 text-sm">
                Se muestran las 200 más recientes. Descarga el CSV para ver todas.
              </p>
            )}
          </div>
        )}
      </Panel>

      {open && <InvoiceDialog invoice={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function InvoiceDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const at = new Date(invoice.issuedAt);
  function print() {
    const r = invoiceActions.reprint(invoice.id);
    if (!r.ok) return toast.error(r.error);
    printInvoice(invoice);
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Factura ${invoiceCode(invoice.number)}`}
      description={`${invoice.place} · ${formatDay(at)} · ${formatTime(at)} · la generó ${invoice.issuedBy}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={print}>
            <Printer aria-hidden /> Imprimir
          </Button>
        </>
      }
    >
      <div className="bg-surface-2 rounded-xl p-4 font-mono text-[13px] leading-relaxed">
        <p className="text-center font-semibold">{invoice.businessName}</p>
        {invoice.waiter && <p className="text-muted text-center">Atendió {invoice.waiter}</p>}
        {invoice.customer && (
          <p className="mt-2">
            Cliente: {invoice.customer.name}
            {invoice.customer.document ? ` · ${invoice.customer.document}` : ""}
          </p>
        )}
        <ul className="mt-3 flex flex-col gap-1">
          {invoice.lines.map((l) => (
            <li key={`${l.name}-${l.unitPrice}`} className="flex justify-between gap-3">
              <span>
                {l.qty} × {l.name}
              </span>
              <span className="tabular-nums">{formatMoney(l.total)}</span>
            </li>
          ))}
          {invoice.deliveryFee > 0 && (
            <li className="flex justify-between gap-3">
              <span>Envío</span>
              <span className="tabular-nums">{formatMoney(invoice.deliveryFee)}</span>
            </li>
          )}
        </ul>
        <p className="border-ink/30 mt-3 flex justify-between border-t border-dashed pt-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(invoice.total)}</span>
        </p>
        <ul className="text-ink-soft mt-3 flex flex-col gap-1">
          {invoice.payments.map((p, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{p.label}</span>
              <span className="tabular-nums">{formatMoney(p.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
