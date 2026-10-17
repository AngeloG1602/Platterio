"use client";

import { CookingPot } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useCurrentStaff, useFeature, useInventory, usePreparations } from "@/lib/data";
import { can } from "@/lib/domain/access";
import { fmtQty } from "@/lib/domain/inventory";
import type { Preparation } from "@/lib/domain/types";
import { ProduceDialog } from "./inventory-panel";

/** Botón de la cocina para registrar la producción de un lote sin salir del tablero. */
export function KitchenProduction() {
  const enabled = useFeature("inventario");
  const staff = useCurrentStaff();
  const preps = usePreparations();
  const items = useInventory();
  const [open, setOpen] = useState(false);
  const [producing, setProducing] = useState<Preparation | null>(null);
  if (!enabled || preps.length === 0 || !can(staff?.role, "produccion")) return null;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <CookingPot aria-hidden /> Producción
      </Button>
      <Dialog
        open={open && !producing}
        onOpenChange={setOpen}
        title="Producción"
        description="Registra lo que se cocinó por lote. Se gastan los ingredientes y se suman las porciones."
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <ul className="flex flex-col gap-2">
          {preps.map((p) => {
            const out = items.find((i) => i.id === p.outputItemId);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted block text-sm">
                    Hay {fmtQty(out?.qty ?? 0)} {out?.unit ?? "porciones"}
                  </span>
                </span>
                <Button size="sm" onClick={() => setProducing(p)}>
                  Producir<span className="sr-only"> {p.name}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      </Dialog>
      {producing && <ProduceDialog prep={producing} onClose={() => setProducing(null)} />}
    </>
  );
}
