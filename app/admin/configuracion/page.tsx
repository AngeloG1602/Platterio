import type { Metadata } from "next";
import { SettingsAdmin } from "@/components/admin/settings-admin";

export const metadata: Metadata = { title: "Configuración" };

export default function SettingsPage() {
  return <SettingsAdmin />;
}
