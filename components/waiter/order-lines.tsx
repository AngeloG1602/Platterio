import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAFF_DINER_ID, STAFF_DINER_LABEL } from "@/lib/domain/staffOrders";
import type { Diner, Dish, Order, OrderItem } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

/** Ítems de una ronda agrupados por comensal, con notas y ajustes bien visibles. */
export function OrderLines({
  order,
  dishes,
  diners,
  onAdjust,
  size = "md",
}: {
  order: Order;
  dishes: readonly Dish[];
  diners: readonly Diner[];
  onAdjust?: (item: OrderItem) => void;
  size?: "md" | "sm";
}) {
  const byDish = new Map(dishes.map((d) => [d.id, d]));
  const dinerIds = [...new Set(order.items.map((i) => i.dinerId))];
  return (
    <div className="flex flex-col gap-3">
      {dinerIds.map((dinerId) => (
        <div key={dinerId}>
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            {dinerId === STAFF_DINER_ID
              ? STAFF_DINER_LABEL
              : (diners.find((d) => d.id === dinerId)?.alias ?? "Comensal")}
          </p>
          <ul className="mt-1">
            {order.items
              .filter((i) => i.dinerId === dinerId)
              .map((item) => {
                const dish = byDish.get(item.dishId);
                const variant = dish?.variants.find((v) => v.id === item.variantId);
                const from = item.adjustedFrom;
                const fromVariant = dish?.variants.find((v) => v.id === from?.variantId);
                return (
                  <li key={item.id} className="flex items-start gap-2 py-1.5">
                    <span
                      className={cn(
                        "text-accent-strong w-8 shrink-0 font-semibold tabular-nums",
                        size === "md" ? "text-[17px]" : "text-[15px]",
                        item.removed && "text-muted",
                      )}
                    >
                      {item.qty}×
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          size === "md" ? "text-[17px]" : "text-[15px]",
                          "leading-snug",
                          item.removed && "text-muted line-through",
                        )}
                      >
                        <span className="font-semibold">{dish?.name ?? "Plato"}</span>
                        {dish && dish.variants.length > 1 && variant && (
                          <span className="text-ink-soft"> · {variant.name}</span>
                        )}
                      </p>
                      {item.custom && (
                        <ul className="mt-1 flex flex-col gap-0.5">
                          {item.custom.kitchen.map((line) => (
                            <li key={line} className="text-ink text-sm font-semibold">
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.note && (
                        <p className="bg-warning-soft text-warning-ink mt-1 inline-block rounded-md px-2 py-0.5 text-sm font-semibold">
                          Nota: {item.note}
                        </p>
                      )}
                      {item.adjustReason && (
                        <p className="text-muted mt-1 text-[13px]">
                          {item.removed
                            ? `Quitado · ${item.adjustReason}`
                            : `Antes: ${from?.qty ?? item.qty}× ${fromVariant && dish && dish.variants.length > 1 ? fromVariant.name : ""} · ${item.adjustReason}`}
                        </p>
                      )}
                    </div>
                    {onAdjust && !item.removed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted h-10"
                        onClick={() => onAdjust(item)}
                      >
                        <Pencil aria-hidden /> Ajustar
                      </Button>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
