"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { waiterActions } from "@/lib/data";
import { REJECT_REASONS } from "@/lib/domain/waiter";
import { ReasonPicker, resolveReason } from "./reason-picker";

export function RejectDialog({
  orderId,
  label,
  onClose,
}: {
  orderId: string;
  label: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [error, setError] = useState<string>();

  function reject() {
    const why = resolveReason(reason, other);
    if (!why) {
      setError(reason === "Otro" ? "Escribe el motivo" : "Elige un motivo");
      return;
    }
    const r = waiterActions.reject(orderId, why);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast(`${label} rechazado`, { description: `Motivo: ${why}. El cliente ya lo ve.` });
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`¿Rechazar ${label.toLowerCase()}?`}
      description="El pedido no pasa a la cocina y la mesa ve el motivo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={reject}>
            Rechazar pedido
          </Button>
        </>
      }
    >
      <ReasonPicker
        options={REJECT_REASONS}
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
    </Dialog>
  );
}
