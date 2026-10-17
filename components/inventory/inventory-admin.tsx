"use client";

import { PageHeader } from "@/components/admin/ui/page-header";
import { InventoryPanel } from "./inventory-panel";

/** Inventario dentro del panel del administrador. */
export function InventoryAdmin() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inventario"
        description="Bebidas y productos terminados: lo que hay, lo que entra, lo que sale y lo que se vende."
      />
      <InventoryPanel />
    </div>
  );
}
