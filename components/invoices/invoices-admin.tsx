"use client";

import { PageHeader } from "@/components/admin/ui/page-header";
import { InvoicesPanel } from "./invoices-panel";

/** Facturas dentro del panel del administrador. */
export function InvoicesAdmin() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Facturas"
        description="El comprobante de cada cuenta saldada, guardado para consultarlo o volver a imprimirlo."
      />
      <InvoicesPanel />
    </div>
  );
}
