"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { waiterActions } from "@/lib/data";
import { formatCOP } from "@/lib/domain/format";
import { ADJUST_REASONS, type ItemAdjustment } from "@/lib/domain/waiter";
import type { Dish, OrderItem } from "@/lib/domain/types";
import { ReasonPicker, resolveReason } from "./reason-picker";

type Mode = "quitar" | "cantidad" | "variante";

/** Ajustar un ítem antes de confirmar (US-26): quitar, cambiar cantidad o variante, con motivo. */
export function AdjustSheet({
  orderId,
  item,
  dish,
  onClose,
}: {
  orderId: string;
  item: OrderItem;
  dish: Dish | undefined;
  onClose: () => void;
}) {
  const hasVariants = (dish?.variants.length ?? 0) > 1;
  const [mode, setMode] = useState<Mode>("quitar");
  const [qty, setQty] = useState(item.qty);
  const [variantId, setVariantId] = useState(item.variantId);
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [error, setError] = useState<string>();

  function save() {
    const why = resolveReason(reason, other);
    if (!why) {
      setError(reason === "Otro" ? "Escribe el motivo" : "Elige un motivo");
      return;
    }
    const change: ItemAdjustment =
      mode === "quitar"
        ? { type: "quitar" }
        : mode === "cantidad"
          ? { type: "cantidad", qty }
          : { type: "variante", variantId };
    const r = waiterActions.adjustItem(orderId, item.id, change, why);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast.success(mode === "quitar" ? `Quitaste ${dish?.name ?? "el ítem"}` : "Ajuste guardado", {
      description: "El cliente verá el cambio con el motivo.",
    });
    onClose();
  }

  const modes = [
    { value: "quitar" as const, label: "Quitar" },
    { value: "cantidad" as const, label: "Cantidad" },
    ...(hasVariants ? [{ value: "variante" as const, label: "Opción" }] : []),
  ];

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Ajustar ${dish?.name ?? "ítem"}`}
      description="Solo cambia este ítem; el resto del pedido queda igual."
      footer={
        <Button block size="lg" variant={mode === "quitar" ? "danger" : "primary"} onClick={save}>
          {mode === "quitar" ? "Quitar del pedido" : "Guardar ajuste"}
        </Button>
      }
    >
      <div className="flex flex-col gap-6 pb-3">
        <Segmented
          label="Qué quieres hacer"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(undefined);
          }}
          options={modes}
        />
        {mode === "cantidad" && (
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-medium">Nueva cantidad</span>
            <QtyStepper value={qty} onChange={setQty} />
          </div>
        )}
        {mode === "variante" && dish && (
          <Segmented
            label="Nueva opción"
            value={variantId}
            onChange={setVariantId}
            options={dish.variants.map((v) => ({
              value: v.id,
              label: v.name,
              hint: formatCOP(v.price),
            }))}
          />
        )}
        <ReasonPicker
          options={ADJUST_REASONS}
          value={reason}
          onChange={(v) => {
            setReason(v);
            setError(undefined);
          }}
          other={other}
          onOtherChange={(v) => {
            setOther(v);
            setError(undefined);
          }}
          error={error}
        />
      </div>
    </Sheet>
  );
}
