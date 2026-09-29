"use client";

import { DoorOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Price } from "@/components/ui/price";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toaster";
import { waiterActions } from "@/lib/data";
import { cartCount } from "@/lib/domain/cart";
import { formatTime, plural } from "@/lib/domain/format";
import { consolidateTicket } from "@/lib/domain/ticket";
import type { Dish } from "@/lib/domain/types";
import type { TableOverview } from "@/lib/domain/waiter";

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
            : "Libre. Se abre cuando alguien escanee el QR de la mesa."
        }
        footer={
          session && (
            <div className="flex flex-col gap-2">
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
            </div>
          )
        }
      >
        {session && ticket && (
          <div className="flex flex-col gap-4 pb-3">
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
