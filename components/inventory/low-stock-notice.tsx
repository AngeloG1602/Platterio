"use client";

import { PackageX } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/admin/ui/page-header";
import { useBusinessHref } from "@/components/providers/business-scope";
import { Badge } from "@/components/ui/chip";
import { useFeature, useInventory } from "@/lib/data";
import { fmtQty, lowStockItems, stockLevel } from "@/lib/domain/inventory";

/** Aviso en el resumen del administrador cuando un producto llega al límite o se agota. */
export function LowStockNotice() {
  const enabled = useFeature("inventario");
  const href = useBusinessHref();
  const low = lowStockItems(useInventory());
  if (!enabled || low.length === 0) return null;
  return (
    <Panel
      title="Inventario por reponer"
      description="Productos en su límite de aviso o agotados."
      action={
        <Link href={href("/admin/inventario")} className="text-accent-strong text-sm font-semibold">
          Ver inventario
        </Link>
      }
    >
      <ul className="flex flex-col gap-2">
        {low.map((i) => (
          <li key={i.id} className="flex items-center gap-3 text-[15px]">
            <PackageX className="text-warning-ink size-5 shrink-0" aria-hidden />
            <span className="flex-1 font-medium">{i.name}</span>
            <span className="tabular-nums">
              {fmtQty(i.qty)} {i.unit}
            </span>
            <Badge tone={stockLevel(i) === "agotado" ? "danger" : "warning"}>
              {stockLevel(i) === "agotado" ? "Agotado" : "Poco stock"}
            </Badge>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
