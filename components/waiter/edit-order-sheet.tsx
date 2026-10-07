"use client";

import { Ban, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toaster";
import { useCategories, useOrders, waiterActions } from "@/lib/data";
import { formatTime } from "@/lib/domain/format";
import { isEditable } from "@/lib/domain/staffOrders";
import { EDIT_REASONS } from "@/lib/domain/waiter";
import type { Diner, Dish, OrderItem } from "@/lib/domain/types";
import { AdjustSheet } from "./adjust-sheet";
import { OrderLines } from "./order-lines";
import { ReasonPicker, resolveReason } from "./reason-picker";
import { StaffOrderSheet } from "./staff-order-sheet";

/**
 * Editar una ronda en cualquier estado: quitar, cambiar cantidad u opción, agregar platos o
 * anularla. El personal puede siempre, pero cada cambio queda con quién, cuándo y por qué.
 */
export function EditOrderSheet({
  orderId,
  tableNumber,
  dishes,
  diners,
  onClose,
}: {
  orderId: string;
  tableNumber: number;
  dishes: readonly Dish[];
  diners: readonly Diner[];
  onClose: () => void;
}) {
  const order = useOrders().find((o) => o.id === orderId);
  const categories = useCategories();
  const [adjusting, setAdjusting] = useState<OrderItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [error, setError] = useState<string>();
  if (!order) return null;
  const editable = isEditable(order);
  const changes = order.changes ?? [];

  function voidRound() {
    const why = resolveReason(reason, other);
    if (!why) return setError(reason === "Otro" ? "Escribe el motivo" : "Elige un motivo");
    const r = waiterActions.editOrder(orderId, { type: "anular" }, why);
    if (!r.ok) return setError(r.error);
    toast.success(`Ronda ${order!.round} anulada`);
    setVoiding(false);
    onClose();
  }

  return (
    <>
      <Sheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={`Mesa ${tableNumber} · Ronda ${order.round}`}
        description={
          editable
            ? "Puedes cambiar lo que haga falta. Todo queda registrado con tu nombre y el motivo."
            : "Esta ronda está anulada."
        }
        footer={
          editable ? (
            <div className="flex flex-col gap-2">
              <Button block size="lg" onClick={() => setAdding(true)}>
                <Plus aria-hidden /> Agregar platos
              </Button>
              <Button variant="ghost" block onClick={() => setVoiding(true)}>
                <Ban aria-hidden /> Anular ronda
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-5 pb-3">
          <StatusBadge status={order.status} />
          <OrderLines
            order={order}
            dishes={dishes}
            diners={diners}
            onAdjust={editable ? setAdjusting : undefined}
          />
          {changes.length > 0 && (
            <section aria-label="Registro de cambios">
              <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
                Registro de cambios
              </h3>
              <ul className="divide-line mt-1 divide-y text-[14px]">
                {[...changes].reverse().map((c) => (
                  <li key={c.id} className="py-2">
                    <p>
                      <span className="font-semibold">{c.dishName}</span> · {c.detail}
                    </p>
                    <p className="text-muted text-[13px]">
                      {c.by} · {formatTime(new Date(c.at))}
                      {c.reason ? ` · ${c.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Sheet>
      {adjusting && (
        <AdjustSheet
          afterConfirm
          orderId={orderId}
          item={adjusting}
          dish={dishes.find((d) => d.id === adjusting.dishId)}
          onClose={() => setAdjusting(null)}
        />
      )}
      {adding && (
        <StaffOrderSheet
          tableId={order.tableId}
          tableNumber={tableNumber}
          orderId={orderId}
          dishes={dishes}
          categories={categories}
          onClose={() => setAdding(false)}
        />
      )}
      <Dialog
        open={voiding}
        onOpenChange={setVoiding}
        title={`¿Anular la ronda ${order.round}?`}
        description="Deja de contar en la cuenta y cocina recibe el aviso. Elige el motivo."
        footer={
          <>
            <Button variant="secondary" onClick={() => setVoiding(false)}>
              Volver
            </Button>
            <Button variant="danger" onClick={voidRound}>
              Sí, anular
            </Button>
          </>
        }
      >
        <ReasonPicker
          options={EDIT_REASONS}
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
    </>
  );
}
