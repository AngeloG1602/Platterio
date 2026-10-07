"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { waiterActions } from "@/lib/data";
import { plural } from "@/lib/domain/format";
import type { StaffLine } from "@/lib/domain/staffOrders";
import type { Category, Dish } from "@/lib/domain/types";

interface Draft {
  variantId: string;
  qty: number;
  note: string;
}

/**
 * El personal arma el pedido de la mesa: elige platos, cantidades y notas. Sin `orderId` crea una
 * ronda nueva que va directo a cocina; con `orderId` agrega los platos a esa ronda.
 */
export function StaffOrderSheet({
  tableId,
  tableNumber,
  orderId,
  dishes,
  categories,
  onClose,
}: {
  tableId: string;
  tableNumber: number;
  orderId?: string;
  dishes: readonly Dish[];
  categories: readonly Category[];
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string>();
  const available = dishes.filter((d) => d.active);

  const lines: StaffLine[] = Object.entries(drafts)
    .filter(([, d]) => d.qty > 0)
    .map(([dishId, d]) => ({
      dishId,
      variantId: d.variantId,
      qty: d.qty,
      ...(d.note.trim() ? { note: d.note.trim() } : {}),
    }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => {
    const price = dishes
      .find((d) => d.id === l.dishId)
      ?.variants.find((v) => v.id === l.variantId)?.price;
    return s + (price ?? 0) * l.qty;
  }, 0);

  function patch(dish: Dish, change: Partial<Draft>) {
    setError(undefined);
    setDrafts((prev) => ({
      ...prev,
      [dish.id]: {
        variantId: dish.variants[0]!.id,
        qty: 0,
        note: "",
        ...prev[dish.id],
        ...change,
      },
    }));
  }

  function send() {
    if (orderId) {
      for (const line of lines) {
        const r = waiterActions.editOrder(orderId, { type: "agregar", line }, "");
        if (!r.ok) return setError(r.error);
      }
      toast.success(`Agregaste ${plural(count, "plato", "platos")}`, {
        description: "Cocina verá el aviso.",
      });
      return onClose();
    }
    const r = waiterActions.createOrder(tableId, lines);
    if (!r.ok) return setError(r.error);
    toast.success(`Pedido enviado a cocina · Mesa ${tableNumber}`, {
      description: r.openedPin
        ? `La mesa estaba libre: se abrió con el PIN ${r.openedPin}.`
        : undefined,
    });
    onClose();
  }

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={orderId ? "Agregar platos" : `Tomar pedido · Mesa ${tableNumber}`}
      description={
        orderId
          ? "Se suman a esta ronda y cocina recibe el aviso."
          : "Va directo a cocina, sin pasar por confirmación."
      }
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-danger-ink text-center text-sm font-medium">
              {error}
            </p>
          )}
          <Button block size="lg" disabled={count === 0} onClick={send}>
            {orderId ? "Agregar a la ronda" : "Enviar a cocina"}
            {count > 0 && (
              <>
                {" "}
                · {plural(count, "plato", "platos")} · <Price value={total} />
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pb-3">
        {categories.map((cat) => {
          const list = available.filter((d) => d.categoryId === cat.id);
          if (list.length === 0) return null;
          return (
            <section key={cat.id} aria-label={cat.name}>
              <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
                {cat.name}
              </h3>
              <ul className="divide-line mt-1 divide-y">
                {list.map((dish) => {
                  const d = drafts[dish.id];
                  const variant = dish.variants.find(
                    (v) => v.id === (d?.variantId ?? dish.variants[0]!.id),
                  );
                  return (
                    <li key={dish.id} className="flex flex-col gap-2 py-3">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[16px] leading-snug font-semibold">{dish.name}</p>
                          <Price value={variant?.price ?? 0} className="text-ink-soft text-sm" />
                        </div>
                        <QtyStepper
                          size="sm"
                          min={0}
                          label={`Cantidad de ${dish.name}`}
                          value={d?.qty ?? 0}
                          onChange={(qty) => patch(dish, { qty })}
                        />
                      </div>
                      {(d?.qty ?? 0) > 0 && (
                        <div className="flex gap-2">
                          {dish.variants.length > 1 && (
                            <Select
                              className="h-10 w-40"
                              aria-label={`Opción de ${dish.name}`}
                              value={d?.variantId}
                              onChange={(e) => patch(dish, { variantId: e.target.value })}
                            >
                              {dish.variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </Select>
                          )}
                          <Input
                            className="h-10 flex-1"
                            aria-label={`Nota para ${dish.name}`}
                            placeholder="Nota (sin cebolla…)"
                            maxLength={80}
                            value={d?.note ?? ""}
                            onChange={(e) => patch(dish, { note: e.target.value })}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}
