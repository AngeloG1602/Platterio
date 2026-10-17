import { formatDay, formatTime } from "@/lib/domain/format";
import { invoiceHtml } from "@/lib/domain/invoice";
import type { Invoice } from "@/lib/domain/types";

/**
 * Imprime una factura desde el navegador: la arma en un marco oculto con su propio estilo de
 * comprobante y abre el diálogo de impresión. La conexión directa a la impresora del negocio se
 * deja para cuando haya una instalación real (ver DECISIONES).
 */
export function printInvoice(invoice: Invoice) {
  const at = new Date(invoice.issuedAt);
  const html = invoiceHtml(invoice, `${formatDay(at)} · ${formatTime(at)}`);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) return frame.remove();
  win.document.open();
  win.document.write(html);
  win.document.close();
  const done = () => setTimeout(() => frame.remove(), 1000);
  win.addEventListener("afterprint", done);
  // Da un momento para que cargue la letra antes de abrir el diálogo.
  setTimeout(() => {
    win.focus();
    win.print();
    done();
  }, 150);
}
