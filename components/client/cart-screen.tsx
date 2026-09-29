"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Pencil, ReceiptText, Send, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DishImage } from "@/components/dish/dish-image";
import { Button, buttonClasses, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { DishCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toaster";
import { cartActions, useDishes, useSessionOrders } from "@/lib/data";
import { cartCount, cartTotal, countByDiner, unitPrice } from "@/lib/domain/cart";
import { formatCOP, plural } from "@/lib/domain/format";
import type { CartItem, Dish } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { ClientShell } from "./client-shell";
import { LiveDot, ScreenHeader } from "./screen-header";
import { useTableActivity } from "./table-activity";
import { TableGate, type TableContext } from "./table-gate";

export function CartScreen({ numero }: { numero: string }) {
  return (
    <ClientShell>
      <TableGate numero={numero} fallback={<CartSkeleton />}>
        {(ctx) => <Cart ctx={ctx} />}
      </TableGate>
    </ClientShell>
  );
}

function Cart({ ctx }: { ctx: TableContext }) {
  useTableActivity(ctx);
  const router = useRouter();
  const dishes = useDishes();
  const orders = useSessionOrders(ctx.session.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState<CartItem | null>(null);
  const [initialIds] = useState(() => new Set(ctx.session.cart.map((i) => i.id)));

  const { cart, diners } = ctx.session;
  const count = cartCount(cart);
  const total = cartTotal(cart, dishes);
  const latest = orders[orders.length - 1];
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  // Primero lo mío, luego los demás en el orden en que entraron.
  const groups = [ctx.diner, ...diners.filter((d) => d.id !== ctx.diner.id)]
    .map((d) => ({ diner: d, items: cart.filter((c) => c.dinerId === d.id) }))
    .filter((g) => g.items.length > 0);

  function send() {
    const result = cartActions.submit(
      ctx.table.id,
      cart.map((c) => c.id),
    );
    setConfirmOpen(false);
    if (!result.ok) {
      toast.error("No se envió el pedido", { description: result.error });
      return;
    }
    toast.success("Pedido enviado", { description: "Esperando confirmación del mesero" });
    router.push(`${ctx.base}/pedido`);
  }

  return (
    <>
      <ScreenHeader
        title="Carrito de la mesa"
        subtitle={`Mesa ${ctx.table.number} · lo ven todos en la mesa`}
        backHref={`${ctx.base}/menu`}
        action={<LiveDot />}
      />

      <div className="flex flex-1 flex-col px-4 pb-36">
        <ul className="flex flex-wrap gap-1.5 pt-4" aria-label="Comensales en la mesa">
          {diners.map((d) => (
            <li
              key={d.id}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full pr-3 pl-1 text-[13px] font-medium",
                d.id === ctx.diner.id ? "bg-ink text-bg" : "bg-surface-2 text-ink-soft",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                  d.id === ctx.diner.id ? "bg-bg/15" : "bg-accent-soft text-accent-strong",
                )}
                aria-hidden
              >
                {d.alias.charAt(0).toUpperCase()}
              </span>
              {d.alias}
              {d.id === ctx.diner.id && " (tú)"}
            </li>
          ))}
        </ul>

        {latest && (
          <Link
            href={`${ctx.base}/pedido`}
            className="border-line bg-surface shadow-card mt-4 flex items-center gap-3 rounded-xl border p-3.5"
          >
            <ReceiptText className="text-accent-strong size-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {orders.length === 1
                  ? "Ya enviaron la ronda 1"
                  : `Ya enviaron ${orders.length} rondas`}
              </p>
              <p className="text-muted text-[13px]">
                {count > 0
                  ? `Lo de aquí irá en la ronda ${latest.round + 1}`
                  : "Toca para ver el estado"}
              </p>
            </div>
            <StatusBadge status={latest.status} short />
          </Link>
        )}

        {groups.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={latest ? "No hay platos nuevos en el carrito" : "Tu mesa aún no ha pedido nada"}
            description={
              latest
                ? "Si quieren algo más, agréguenlo desde la carta y se enviará como una nueva ronda."
                : "Explora la carta y agrega lo que se te antoje. Todos en la mesa verán el mismo carrito."
            }
            action={
              <Link href={`${ctx.base}/menu`} className={buttonClasses({ variant: "secondary" })}>
                Ver la carta <ArrowRight aria-hidden />
              </Link>
            }
            className="my-auto"
          />
        ) : (
          groups.map(({ diner, items }) => {
            const isMe = diner.id === ctx.diner.id;
            return (
              <section key={diner.id} aria-label={`Platos de ${diner.alias}`} className="pt-6">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-[19px] font-semibold">
                    {isMe ? `Tú · ${diner.alias}` : diner.alias}
                  </h2>
                  <Price value={cartTotal(items, dishes)} className="text-muted text-sm" />
                </div>
                <ul className="divide-line mt-1 divide-y">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "-mx-2 rounded-lg px-2",
                          !initialIds.has(item.id) && !isMe && "animate-flash",
                        )}
                      >
                        <CartRow
                          item={item}
                          dish={dishById.get(item.dishId)}
                          mine={isMe}
                          onEdit={() => setEditing(item)}
                          onQty={(qty) => {
                            const r = cartActions.update(ctx.table.id, item.id, { qty });
                            if (!r.ok) toast.error(r.error);
                          }}
                          onRemove={() => {
                            const r = cartActions.remove(ctx.table.id, item.id);
                            if (!r.ok) toast.error(r.error);
                            else toast(`Quitaste ${dishById.get(item.dishId)?.name ?? "el plato"}`);
                          }}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            );
          })
        )}
      </div>

      <div className="border-line bg-surface/95 pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t px-4 pt-3 backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-muted text-sm">
            Total del carrito · {plural(count, "plato", "platos")}
          </span>
          <Price value={total} className="text-xl" />
        </div>
        <Button size="lg" block disabled={count === 0} onClick={() => setConfirmOpen(true)}>
          <Send aria-hidden /> Enviar pedido
        </Button>
      </div>

      <SendDialog
        open={confirmOpen && count > 0}
        onOpenChange={setConfirmOpen}
        summary={countByDiner(cart, diners)}
        total={total}
        onConfirm={send}
      />
      {editing && (
        <EditItemSheet
          key={editing.id}
          item={cart.find((c) => c.id === editing.id) ?? editing}
          dish={dishById.get(editing.dishId)}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            const r = cartActions.update(ctx.table.id, editing.id, patch);
            if (!r.ok) toast.error(r.error);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function CartRow({
  item,
  dish,
  mine,
  onQty,
  onEdit,
  onRemove,
}: {
  item: CartItem;
  dish: Dish | undefined;
  mine: boolean;
  onQty: (qty: number) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const variant = dish?.variants.find((v) => v.id === item.variantId);
  const price = unitPrice(dish, item.variantId);
  const unavailable = !dish?.active;
  return (
    <div className="flex gap-3 py-3.5">
      <DishImage
        src={dish?.photos[0]}
        name={dish?.name ?? "?"}
        sizes="56px"
        className="size-14 shrink-0"
        initialClassName="text-2xl"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] leading-snug font-semibold">
            {!mine && <span className="text-accent-strong tabular-nums">{item.qty}× </span>}
            {dish?.name ?? "Plato"}
          </p>
          <Price value={price * item.qty} className="text-[15px]" />
        </div>
        <p className="text-muted text-[13px]">
          {dish && dish.variants.length > 1 && variant ? `${variant.name} · ` : ""}
          {formatCOP(price)} c/u
        </p>
        {item.note && <p className="text-ink-soft mt-1 text-[13px] italic">“{item.note}”</p>}
        {unavailable && (
          <p className="text-danger-ink mt-1 text-[13px] font-medium">Ya no está disponible</p>
        )}
        {mine && (
          <div className="mt-2 flex items-center gap-1">
            <QtyStepper
              size="sm"
              value={item.qty}
              onChange={onQty}
              label={`Cantidad de ${dish?.name ?? "plato"}`}
            />
            {dish && dish.variants.length > 1 && (
              <Button variant="ghost" size="sm" className="h-10" onClick={onEdit}>
                <Pencil aria-hidden /> Cambiar
              </Button>
            )}
            <IconButton
              label={`Quitar ${dish?.name ?? "plato"}`}
              className="text-muted hover:text-danger ml-auto"
              onClick={onRemove}
            >
              <Trash2 aria-hidden />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}

function SendDialog({
  open,
  onOpenChange,
  summary,
  total,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  summary: Array<{ dinerId: string; alias: string; count: number }>;
  total: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="¿Enviar a la cocina?"
      description="El mesero revisa el pedido y lo confirma antes de que pase a la cocina."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Seguir pidiendo
          </Button>
          <Button onClick={onConfirm}>
            <Send aria-hidden /> Sí, enviar
          </Button>
        </>
      }
    >
      <div className="bg-surface-2 rounded-xl p-4">
        <p className="text-[17px] font-semibold" aria-label="Platos por comensal">
          {summary.map((s) => `${s.alias} ${s.count}`).join(" · ")}
        </p>
        <div className="border-line mt-2 flex items-baseline justify-between border-t pt-2">
          <span className="text-muted text-sm">Total</span>
          <Price value={total} className="text-lg" />
        </div>
      </div>
    </Dialog>
  );
}

function EditItemSheet({
  item,
  dish,
  onClose,
  onSave,
}: {
  item: CartItem;
  dish: Dish | undefined;
  onClose: () => void;
  onSave: (patch: { qty: number; variantId: string }) => void;
}) {
  const [variantId, setVariantId] = useState(item.variantId);
  const [qty, setQty] = useState(item.qty);
  if (!dish) return null;
  const base = Math.min(...dish.variants.map((v) => v.price));
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={dish.name}
      description="Cambia la opción o la cantidad."
      footer={
        <Button block size="lg" onClick={() => onSave({ qty, variantId })}>
          Guardar · <Price value={unitPrice(dish, variantId) * qty} />
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pb-3">
        <Segmented
          label="Opción del plato"
          value={variantId}
          onChange={setVariantId}
          options={dish.variants.map((v) => ({
            value: v.id,
            label: v.name,
            hint: v.price === base ? formatCOP(v.price) : `+${formatCOP(v.price - base)}`,
          }))}
        />
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium">Cantidad</span>
          <QtyStepper value={qty} onChange={setQty} />
        </div>
      </div>
    </Sheet>
  );
}

function CartSkeleton() {
  return (
    <div aria-busy aria-label="Cargando el carrito" className="px-4 pt-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-4 h-8 w-40 rounded-full" />
      <DishCardSkeleton />
      <DishCardSkeleton />
    </div>
  );
}
