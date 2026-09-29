import type { Metadata } from "next";
import { SalesAdmin } from "@/components/admin/sales-admin";

export const metadata: Metadata = { title: "Ventas" };

export default function SalesPage() {
  return <SalesAdmin />;
}
