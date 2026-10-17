"use client";

import { Download } from "lucide-react";
import { Panel } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { useDishes, usePreparations, useStockView } from "@/lib/data";
import { dishCosts } from "@/lib/domain/costing";
import { formatMoney } from "@/lib/domain/format";
import { downloadCsv } from "./download";

/** Costo y margen de cada plato que gasta inventario. */
export function CostsPanel() {
  const dishes = useDishes();
  const stock = useStockView();
  const preps = usePreparations();
  const rows = dishCosts(dishes, stock, preps).sort(
    (a, b) =>
      (a.missing.length > 0 ? 1 : 0) - (b.missing.length > 0 ? 1 : 0) || a.marginPct - b.marginPct,
  );

  return (
    <Panel
      title="Costo por plato"
      description="Lo que cuesta lo que gasta cada plato según su receta o su preparación, frente a su precio. Los de menor margen salen primero."
      action={
        <Button
          variant="secondary"
          size="sm"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv("costos.csv", [
              ["Plato", "Precio", "Costo", "Margen", "Margen %", "Faltan costos"],
              ...rows.map((r) => [
                r.name,
                r.price,
                r.cost,
                r.margin,
                Math.round(r.marginPct * 100),
                r.missing.join(" + "),
              ]),
            ])
          }
        >
          <Download aria-hidden /> CSV<span className="sr-only"> de los costos</span>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="text-muted text-[15px]">
          Todavía no hay platos con receta o preparación. Agrega una para ver su costo.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">Costo por plato</caption>
            <thead className="text-muted text-sm">
              <tr>
                {["Plato", "Precio", "Costo", "Margen", "Margen %"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className={`py-2 pr-4 font-medium ${h === "Plato" ? "" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {rows.map((r) => (
                <tr key={`${r.dishId}-${r.variantId}`} className="align-top">
                  <th scope="row" className="py-2.5 pr-4 font-medium">
                    {r.name}
                    {r.missing.length > 0 && (
                      <span className="mt-0.5 block text-sm font-normal">
                        <Badge tone="warning">Faltan costos</Badge>{" "}
                        <span className="text-muted">{r.missing.join(", ")}</span>
                      </span>
                    )}
                  </th>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(r.price)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {r.missing.length > 0 ? "—" : formatMoney(Math.round(r.cost))}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {r.missing.length > 0 ? "—" : formatMoney(Math.round(r.margin))}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {r.missing.length > 0 ? "—" : `${Math.round(r.marginPct * 100)} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
