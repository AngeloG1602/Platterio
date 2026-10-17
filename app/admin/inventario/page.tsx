import type { Metadata } from "next";
import { InventoryAdmin } from "@/components/inventory/inventory-admin";

export const metadata: Metadata = { title: "Inventario" };

export default function AdminInventoryPage() {
  return <InventoryAdmin />;
}
