"use client";

import { Ban, DoorOpen, KeyRound, NotebookPen, Pencil, Timer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Price } from "@/components/ui/price";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toaster";
import { Select } from "@/components/ui/field";
import { useCategories, useCurrentStaff, useRestaurant, waiterActions } from "@/lib/data";
import { can } from "@/lib/domain/access";
import { cartCount } from "@/lib/domain/cart";
import { formatTime, plural } from "@/lib/domain/format";
import { consolidateTicket } from "@/lib/domain/ticket";
import type { Dish } from "@/lib/domain/types";
import type { TableOverview } from "@/lib/domain/waiter";
import { EditOrderSheet } from "./edit-order-sheet";
import { StaffOrderSheet } from "./staff-order-sheet";

/** Detalle de una mesa: comensales, rondas, total y liberar mesa (US-21). */
export function TableSheet({
  overview,
  dishes,
  onClose,
}: {
  overview: TableOverview;
  dishes: readonly Dish[];
  onClose: () => void;
}) {
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [taking, setTaking] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const staff = useCurrentStaff();
  const restaurant = useRestaurant();
  const categories = useCategories();
  const canTake = can(staff?.role, "pedidos.crear");
  const canEdit = can(staff?.role, "pedidos.editar");
  const { table, session, orders } = overview;
  const ticket = session
    ? consolidateTicket({ sessionId: session.id, orders, dishes, diners: session.diners })
    : null;
  const open = orders.filter((o) => o.status !== "entregado" && o.status !== "rechazado");
  const unsent = session ? cartCount(session.cart) : 0;

  return (
    <>
      <Sheet
        open
        onOpenChange={(o) => !o && onClose()}
        title={`Mesa ${table.number}`}
        description={
          session
            ? `Abierta a las ${formatTime(new Date(session.openedAt))} · ${plural(session.diners.length, "comensal", "comensales")}`
            : "Libre. Ábrela cuando lleguen los clientes y dales el PIN."
        }
        footer={
          !session ? (
            <div className="flex flex-col gap-2">
              <Button
                block
                size="lg"
                onClick={() => {
                  const r = waiterActions.openTable(table.id);
                  if (!r.ok) return toast.error("No se pudo abrir", { description: r.error });
                  toast.success(`Mesa ${table.number} abierta`, {
                    description: `PIN ${r.pin}. Dáselo a los clientes o muéstrales el QR.`,
                  });
                }}
              >
                <KeyRound aria-hidden /> Abrir mesa
              </Button>
              {canTake && (
                <Button variant="secondary" block onClick={() => setTaking(true)}>
                  <NotebookPen aria-hidden /> Tomar pedido
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {canTake && (
                <Button block size="lg" onClick={() => setTaking(true)}>
                  <NotebookPen aria-hidden /> Tomar pedido
                </Button>
              )}
              {open.length > 0 && (
                <p className="text-muted text-center text-[13px]">
                  Para liberarla, primero entrega o rechaza{" "}
                  {open.length === 1
                    ? "la ronda pendiente"
                    : `las ${open.length} rondas pendientes`}
                  .
                </p>
              )}
              <Button
                variant="secondary"
                block
                size="lg"
                disabled={open.length > 0}
                onClick={() => setConfirmRelease(true)}
              >
                <DoorOpen aria-hidden /> Liberar mesa
              </Button>
              {can(staff?.role, "mesas.cancelar") && (
                <Button variant="ghost" block onClick={() => setConfirmCancel(true)}>
                  <Ban aria-hidden /> Cancelar mesa
                </Button>
              )}
            </div>
          )
        }
      >
        {session && ticket && (
          <div className="flex flex-col gap-4 pb-3">
            <TableAccessCard
              tableId={table.id}
              tableNumber={table.number}
              pin={session.pin}
              idleMin={session.idleCloseMin}
              defaultIdleMin={restaurant.sessionIdleMin}
            />
            <ul className="flex flex-wrap gap-1.5">
              {session.diners.map((d) => (
                <li
                  key={d.id}
                  className="bg-surface-2 rounded-full px-3 py-1 text-[13px] font-medium"
                >
                  {d.alias}
                </li>
              ))}
            </ul>
            {unsent > 0 && (
              <p className="bg-surface-2 text-ink-soft rounded-lg px-3 py-2 text-sm">
                Tienen {plural(unsent, "plato", "platos")} en el carrito sin enviar.
              </p>
            )}
            {ticket.rounds.length === 0 ? (
              <p className="text-muted text-[15px]">Aún no han enviado pedidos.</p>
            ) : (
              <ul className="divide-line border-line divide-y rounded-xl border">
                {ticket.rounds.map((r) => (
                  <li key={r.order.id} className="flex items-center gap-3 px-3.5 py-3">
                    <span className="flex-1 text-[15px] font-medium">Ronda {r.round}</span>
                    <StatusBadge status={r.status} />
                    <Price value={r.subtotal} className="w-20 text-right text-sm" />
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(r.order.id)}>
                        <Pencil aria-hidden /> Editar
                        <span className="sr-only"> la ronda {r.round}</span>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-muted text-[15px]">Total de la mesa</span>
              <Price value={ticket.total} className="text-xl" />
            </div>
          </div>
        )}
      </Sheet>
      {taking && (
        <StaffOrderSheet
          tableId={table.id}
          tableNumber={table.number}
          dishes={dishes}
          categories={categories}
          onClose={() => setTaking(false)}
        />
      )}
      {editingId && (
        <EditOrderSheet
          orderId={editingId}
          tableNumber={table.number}
          dishes={dishes}
          diners={session?.diners ?? []}
          onClose={() => setEditingId(null)}
        />
      )}
      <Dialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={`¿Cancelar la Mesa ${table.number}?`}
        description={
          open.length > 0
            ? `Se cierra la mesa y ${open.length === 1 ? "la ronda sin entregar queda rechazada" : `las ${open.length} rondas sin entregar quedan rechazadas`} con el motivo "Mesa cancelada". Úsalo solo en casos especiales.`
            : "Se cierra la mesa ahora mismo, sin esperar al cierre automático."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const r = waiterActions.cancelTable(table.id);
                setConfirmCancel(false);
                if (!r.ok) return toast.error("No se pudo cancelar", { description: r.error });
                toast.success(`Mesa ${table.number} cancelada`);
                onClose();
              }}
            >
              Sí, cancelar mesa
            </Button>
          </>
        }
      />
      <Dialog
        open={confirmRelease}
        onOpenChange={setConfirmRelease}
        title={`¿Liberar la Mesa ${table.number}?`}
        description="Se cierra la sesión de la mesa. El próximo escaneo del QR abre una sesión nueva."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRelease(false)}>
              Cancelar
            </Button>
            <Button
              variant="ink"
              onClick={() => {
                const r = waiterActions.releaseTable(table.id);
                setConfirmRelease(false);
                if (!r.ok) return toast.error("No se pudo liberar", { description: r.error });
                toast.success(`Mesa ${table.number} libre`);
                onClose();
              }}
            >
              Sí, liberar
            </Button>
          </>
        }
      />
    </>
  );
}

const IDLE_CHOICES = [15, 30, 60, 120];

/** PIN y QR de la mesa abierta, y cuánto tarda en cerrarse sola. */
function TableAccessCard({
  tableId,
  tableNumber,
  pin,
  idleMin,
  defaultIdleMin,
}: {
  tableId: string;
  tableNumber: number;
  pin?: string;
  idleMin?: number;
  defaultIdleMin: number;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const current = idleMin ?? defaultIdleMin;
  const choices = [...new Set([...IDLE_CHOICES, current])].sort((a, b) => a - b);
  return (
    <section
      aria-labelledby={`acceso-${tableId}`}
      className="border-line bg-surface-2 flex flex-col gap-4 rounded-xl border p-4"
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h3 id={`acceso-${tableId}`} className="text-muted text-xs font-semibold uppercase">
            Acceso de la mesa
          </h3>
          {pin ? (
            <>
              <p
                aria-label={`PIN de la mesa ${tableNumber}`}
                className="font-display mt-1 text-[44px] leading-none font-semibold tracking-[0.12em] tabular-nums"
              >
                {pin}
              </p>
              <p className="text-ink-soft mt-2 text-[13px]">
                Díselo a los clientes o muéstrales el QR. Solo vale mientras la mesa esté abierta.
              </p>
            </>
          ) : (
            <p className="text-ink-soft mt-1 text-[14px]">Esta mesa se abrió sin PIN.</p>
          )}
        </div>
        {pin && origin && (
          <QRCodeSVG
            value={`${origin}/mesa/${tableNumber}?pin=${pin}`}
            size={104}
            marginSize={1}
            title={`QR para entrar a la Mesa ${tableNumber}`}
            className="bg-white"
          />
        )}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <Timer className="text-muted size-4 shrink-0" aria-hidden />
        <span className="flex-1">
          Se cierra sola tras
          <span className="text-muted block text-xs">sin pedidos pendientes ni actividad</span>
        </span>
        <Select
          className="h-10 w-44"
          value={current}
          aria-label="Minutos de inactividad para cerrar la mesa"
          onChange={(e) => {
            const minutes = Number(e.target.value);
            const r = waiterActions.setIdleClose(
              tableId,
              minutes === defaultIdleMin ? null : minutes,
            );
            if (!r.ok) toast.error(r.error);
          }}
        >
          {choices.map((m) => (
            <option key={m} value={m}>
              {m} min
              {m === defaultIdleMin ? " (negocio)" : ""}
            </option>
          ))}
        </Select>
      </label>
    </section>
  );
}
