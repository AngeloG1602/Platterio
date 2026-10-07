import type { Metadata } from "next";
import { RoleGate } from "@/components/access/role-gate";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { default: "Administrador", template: "%s · Administrador" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate permission="panel.admin" label="el panel del administrador">
      <AdminShell>{children}</AdminShell>
    </RoleGate>
  );
}
