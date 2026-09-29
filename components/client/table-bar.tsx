"use client";

import { ChevronRight, ReceiptText, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Price } from "@/components/ui/price";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDishes, useSessionOrders } from "@/lib/data";
import { cartCount, cartTotal } from "@/lib/domain/cart";
import { plural } from "@/lib/domain/format";
import type { TableContext } from "./table-gate";

/** Barra inferior del menú: el carrito compartido o, si ya enviaron, el estado del pedido. */
export function TableBar({ ctx }: { ctx: TableContext }) {
  const dishes = useDishes();
  const orders = useSessionOrders(ctx.session.id);
  const count = cartCount(ctx.session.cart);
  const latest = orders[orders.length - 1];
  if (count === 0 && !latest) return null;

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-3">
      {count > 0 ? (
        <Link
          href={`${ctx.base}/carrito`}
          className="bg-accent-strong text-accent-ink shadow-float flex h-15 items-center gap-3 rounded-2xl px-4 transition active:scale-[0.99]"
        >
          <span className="relative flex size-9 items-center justify-center rounded-full bg-white/18">
            <ShoppingBag className="size-5" aria-hidden />
            <span className="text-accent-strong absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold tabular-nums">
              {count}
            </span>
          </span>
          <span className="flex flex-1 flex-col leading-tight">
            <span className="text-[15px] font-semibold">Ver carrito de la mesa</span>
            <span className="text-xs text-white/85">
              {plural(count, "plato", "platos")}
              {latest ? ` · irá en la ronda ${latest.round + 1}` : " sin enviar"}
            </span>
          </span>
          <Price value={cartTotal(ctx.session.cart, dishes)} className="text-[15px]" />
        </Link>
      ) : (
        latest && (
          <Link
            href={`${ctx.base}/pedido`}
            className="border-line bg-surface shadow-float flex h-15 items-center gap-3 rounded-2xl border px-4 transition active:scale-[0.99]"
          >
            <ReceiptText className="text-accent-strong size-5 shrink-0" aria-hidden />
            <span className="flex flex-1 flex-col gap-0.5 leading-tight">
              <span className="text-[15px] font-semibold">Pedido de la mesa</span>
              <span className="text-muted text-xs">
                {plural(orders.length, "ronda", "rondas")} · toca para ver el estado
              </span>
            </span>
            <StatusBadge status={latest.status} short />
            <ChevronRight className="text-muted size-4" aria-hidden />
          </Link>
        )
      )}
    </div>
  );
}
