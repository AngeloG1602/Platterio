"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { deliveryClientActions } from "@/lib/data";
import { formatCOP } from "@/lib/domain/format";
import type { Dish } from "@/lib/domain/types";

/** Elegir opción, cantidad y nota de un plato antes de agregarlo al pedido. */
export function AddDishSheet({ dish, onClose }: { dish: Dish; onClose: () => void }) {
  const [variantId, setVariantId] = useState(dish.variants[0]!.id);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const variant = dish.variants.find((v) => v.id === variantId)!;

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={dish.name}
      description={dish.description}
      footer={
        <Button
          block
          size="lg"
          onClick={() => {
            const r = deliveryClientActions.add({ dishId: dish.id, variantId, qty, note });
            if (!r.ok) return toast.error(r.error);
            toast.success(`${dish.name} agregado`);
            onClose();
          }}
        >
          Agregar · <Price value={variant.price * qty} />
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pb-3">
        {dish.variants.length > 1 && (
          <Segmented
            label="Opción"
            value={variantId}
            onChange={setVariantId}
            options={dish.variants.map((v) => ({
              value: v.id,
              label: v.name,
              hint: formatCOP(v.price),
            }))}
          />
        )}
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium">Cantidad</span>
          <QtyStepper value={qty} onChange={setQty} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nota-plato" className="text-sm font-medium">
            Nota para la cocina <span className="text-muted font-normal">(opcional)</span>
          </label>
          <Input
            id="nota-plato"
            value={note}
            maxLength={80}
            placeholder="Sin cebolla, bien cocida…"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Sheet>
  );
}
