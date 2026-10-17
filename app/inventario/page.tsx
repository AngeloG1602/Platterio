import type { Metadata } from "next";
import { InventoryScreen } from "@/components/inventory/inventory-screen";

export const metadata: Metadata = { title: "Inventario" };

export default function InventoryPage() {
  return <InventoryScreen />;
}
