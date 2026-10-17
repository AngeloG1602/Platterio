import { inPeriod, type Period } from "./analytics";
import { METHOD_LABEL, sessionBalance, toCsv } from "./cash";
import { formatMoney } from "./format";
import type {
  CreditAccount,
  Dish,
  Invoice,
  InvoiceLine,
  InvoicePayment,
  Order,
  Payment,
  TableSession,
} from "./types";

/**
 * Facturas: el comprobante que se genera cuando una cuenta queda saldada y se guarda para
 * consultarlo o reimprimirlo. Reglas puras. Es un comprobante interno del negocio; la factura
 * electrónica de la DIAN se hace con un proveedor autorizado (ver DECISIONES).
 */

export const invoiceCode = (n: number) => `F-${String(n).padStart(4, "0")}`;

/** Siguiente consecutivo. */
export const nextInvoiceNumber = (invoices: readonly Invoice[]) =>
  invoices.reduce((m, i) => Math.max(m, i.number), 0) + 1;

/** Un solo comprobante por cuenta: el id sale de la sesión, así no se repite. */
export const invoiceIdFor = (sessionId: string) => `fac-${sessionId}`;

export const invoiceFor = (invoices: readonly Invoice[], sessionId: string) =>
  invoices.find((i) => i.sessionId === sessionId);

/** Qué platos se cobraron: las rondas no rechazadas, sin lo quitado, juntando los iguales. */
export function invoiceLines(
  orders: readonly Order[],
  sessionId: string,
  dishes: readonly Dish[],
): InvoiceLine[] {
  const lines = new Map<string, InvoiceLine>();
  for (const o of orders) {
    if (o.sessionId !== sessionId || o.status === "rechazado") continue;
    for (const item of o.items) {
      if (item.removed) continue;
      const dish = dishes.find((d) => d.id === item.dishId);
      const variant = dish?.variants.find((v) => v.id === item.variantId);
      const name = `${dish?.name ?? "Plato"}${dish && dish.variants.length > 1 && variant ? ` · ${variant.name}` : ""}${item.custom ? " (personalizado)" : ""}`;
      const key = `${name}|${item.unitPrice}`;
      const prev = lines.get(key);
      const total = item.unitPrice * item.qty;
      lines.set(
        key,
        prev
          ? { ...prev, qty: prev.qty + item.qty, total: prev.total + total }
          : { name, qty: item.qty, unitPrice: item.unitPrice, total },
      );
    }
  }
  return [...lines.values()];
}

function paymentLabel(p: Payment, accounts: readonly CreditAccount[]): string {
  const who = accounts.find((a) => a.id === p.accountId)?.name;
  if (p.kind === "credito") return `A crédito${who ? ` · ${who}` : ""}`;
  if (p.kind === "cortesia") return `Cortesía${who ? ` · ${who}` : ""}`;
  return METHOD_LABEL[p.method];
}

/**
 * Arma el comprobante de una cuenta. Devuelve `null` si todavía queda saldo por cobrar o no hay
 * nada que cobrar: solo se factura lo saldado.
 */
export function buildInvoice(params: {
  session: TableSession;
  orders: readonly Order[];
  payments: readonly Payment[];
  dishes: readonly Dish[];
  accounts: readonly CreditAccount[];
  invoices: readonly Invoice[];
  place: string;
  waiter?: string;
  businessName: string;
  now: string;
  by: string;
}): Invoice | null {
  const { session } = params;
  const fee = session.delivery?.fee ?? 0;
  const balance = sessionBalance(params.orders, params.payments, session.id, fee);
  if (balance.due <= 0 || balance.pending > 0) return null;
  const lines = invoiceLines(params.orders, session.id, params.dishes);
  const deliveryFee = lines.length > 0 ? fee : 0;
  const payments: InvoicePayment[] = params.payments
    .filter((p) => p.sessionId === session.id)
    .map((p) => ({ label: paymentLabel(p, params.accounts), amount: p.amount }));
  const owner = params.payments.find((p) => p.sessionId === session.id && p.accountId);
  const account = owner && params.accounts.find((a) => a.id === owner.accountId);
  const customer = account
    ? { name: account.name, document: account.document, phone: account.phone }
    : session.delivery
      ? { name: session.delivery.customerName, phone: session.delivery.phone }
      : undefined;
  return {
    id: invoiceIdFor(session.id),
    number: nextInvoiceNumber(params.invoices),
    sessionId: session.id,
    issuedAt: params.now,
    issuedBy: params.by,
    businessName: params.businessName,
    place: params.place,
    ...(params.waiter ? { waiter: params.waiter } : {}),
    ...(customer
      ? {
          customer: {
            name: customer.name,
            ...(customer.document ? { document: customer.document } : {}),
            ...(customer.phone ? { phone: customer.phone } : {}),
          },
        }
      : {}),
    lines,
    deliveryFee,
    total: balance.due,
    payments,
  };
}

/* ——— Consulta ——— */

export interface InvoiceFilter {
  text?: string;
  period?: Period;
}

/** Más recientes primero. Busca en el número, el lugar, el cliente y los platos. */
export function filterInvoices(invoices: readonly Invoice[], f: InvoiceFilter): Invoice[] {
  const q = f.text?.trim().toLowerCase();
  return invoices
    .filter((i) => !f.period || inPeriod(i.issuedAt, f.period))
    .filter(
      (i) =>
        !q ||
        [
          invoiceCode(i.number),
          i.place,
          i.customer?.name ?? "",
          i.waiter ?? "",
          ...i.lines.map((l) => l.name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
    )
    .sort((a, b) => b.number - a.number);
}

export function invoicesCsvRows(invoices: readonly Invoice[]): (string | number)[][] {
  return [
    ["Número", "Fecha", "Lugar", "Cliente", "Documento", "Total", "Pago"],
    ...invoices.map((i) => [
      invoiceCode(i.number),
      i.issuedAt,
      i.place,
      i.customer?.name ?? "",
      i.customer?.document ?? "",
      i.total,
      i.payments.map((p) => p.label).join(" + "),
    ]),
  ];
}

export { toCsv };

/* ——— Impresión ——— */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Página lista para imprimir en papel de comprobante (80 mm) o en hoja carta. Lleva su propio
 * estilo, así se imprime igual sin importar la pantalla desde la que se pida.
 */
export function invoiceHtml(invoice: Invoice, when: string): string {
  const row = (a: string, b: string, cls = "") =>
    `<tr class="${cls}"><td>${esc(a)}</td><td class="r">${esc(b)}</td></tr>`;
  const lines = invoice.lines
    .map((l) => row(`${l.qty} × ${l.name}`, formatMoney(l.total)))
    .join("");
  const fee = invoice.deliveryFee > 0 ? row("Envío", formatMoney(invoice.deliveryFee)) : "";
  const pays = invoice.payments.map((p) => row(p.label, formatMoney(p.amount))).join("");
  const customer = invoice.customer
    ? `<p>Cliente: ${esc(invoice.customer.name)}${invoice.customer.document ? ` · ${esc(invoice.customer.document)}` : ""}</p>`
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(invoiceCode(invoice.number))}</title>
<style>
  @page { margin: 6mm; }
  body { font: 13px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #000; max-width: 76mm; margin: 0 auto; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 2px; }
  p { margin: 2px 0; }
  .c { text-align: center; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  td { padding: 1px 0; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; padding-left: 8px; }
  .t td { border-top: 1px dashed #000; font-weight: 700; padding-top: 4px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
</style></head><body>
<h1>${esc(invoice.businessName)}</h1>
<p class="c">Comprobante ${esc(invoiceCode(invoice.number))}</p>
<hr>
<p>${esc(when)}</p>
<p>${esc(invoice.place)}${invoice.waiter ? ` · Atendió ${esc(invoice.waiter)}` : ""}</p>
${customer}
<table>${lines}${fee}<tr class="t"><td>Total</td><td class="r">${esc(formatMoney(invoice.total))}</td></tr></table>
<p>Pagado con:</p>
<table>${pays}</table>
<hr>
<p class="c">Gracias por tu visita.</p>
<p class="c">Este comprobante no es una factura electrónica de venta.</p>
</body></html>`;
}
