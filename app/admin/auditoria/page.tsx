import type { Metadata } from "next";
import { AuditAdmin } from "@/components/admin/audit-admin";

export const metadata: Metadata = { title: "Auditoría" };

export default function AuditPage() {
  return <AuditAdmin />;
}
