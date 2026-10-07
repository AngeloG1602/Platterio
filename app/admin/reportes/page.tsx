import type { Metadata } from "next";
import { ReportsAdmin } from "@/components/admin/reports-admin";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportsPage() {
  return <ReportsAdmin />;
}
