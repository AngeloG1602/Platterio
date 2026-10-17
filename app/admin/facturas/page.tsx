import type { Metadata } from "next";
import { InvoicesAdmin } from "@/components/invoices/invoices-admin";

export const metadata: Metadata = { title: "Facturas" };

export default function AdminInvoicesPage() {
  return <InvoicesAdmin />;
}
