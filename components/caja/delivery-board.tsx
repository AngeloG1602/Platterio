"use client";

import { Bike, MapPin, Phone, Store } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ReasonPicker, resolveReason } from "@/components/waiter/reason-picker";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { toast } from "@/components/ui/toaster";
import {
  deliveryActions,
  useCurrentStaff,
  useDeliveryConfig,
  useDeliveryItems,
  useDishes,
  useLivePayments,
  useNow,
  useOrders,
} from "@/lib/data";
import { sessionBalance } from "@/lib/domain/cash";
import { can } from "@/lib/domain/access";
import {
  deliveryQueue,
  formatPhone,
  PAY_WITH_LABEL,
  type DeliveryItem,
  type DeliveryQueue,
} from "@/lib/domain/delivery";
import { formatElapsed, formatTime, plural } from "@/lib/domain/format";
import type { Dish } from "@/lib/domain/types";
import { PaymentSheet } from "./payment-sheet";

const REJECT_REASONS = [
  "Fuera de la zona",
  "No hay cocina",
  "Dirección incompleta",
  "Otro",
] as const;
const CANCEL_REASONS = [
  "Cliente no contesta",
  "Cliente canceló",
  "Se acabó un plato",
  "Otro",
] as const;

/** Cuántos pedidos nuevos esperan confirmación (para la marca en la pestaña). */
export function useNewDeliveryCount(): number {
  return useDeliveryItems().filter((i) => i.stage === "recibido").length;
}

/** Aviso cuando llega un pedido nuevo, sin repetir los que ya estaban al abrir la pantalla. */
export function useDeliveryArrivalNotice(items: readonly DeliveryItem[]) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const fresh = items.filter((i) => i.stage === "recibido");
    const ids = new Set(fresh.map((i) => i.order.id));
    const before = seen.current;
    seen.current = ids;
    if (!before) return;
    for (const i of fresh) {
      if (before.has(i.order.id)) continue;
      toast(
        `Nuevo ${i.info.type === "recoger" ? "pedido para recoger" : "domicilio"} · ${i.info.code}`,
        {
          id: `dom-${i.order.id}`,
          description: `${i.info.customerName} · ${plural(
            i.order.items.reduce((s, x) => s + x.qty, 0),
            "plato",
            "platos",
          )}`,
        },
      );
    }
  }, [items]);
}

/** Bandeja de domicilios y recogida para el encargado: del pedido nuevo a la entrega. */
export function DeliveryBoard() {
  const items = useDeliveryItems();
  const config = useDeliveryConfig();
  const dishes = useDishes();
  const now = useNow(15_000);
  const queue = useMemo(() => deliveryQueue(items, now), [items, now]);
  const [paying, setPaying] = useState<DeliveryItem | null>(null);
  const [reason, setReason] = useState<{
    item: DeliveryItem;
    kind: "rechazar" | "cancelar";
  } | null>(null);

  const all =
    queue.nuevos.length + queue.enCocina.length + queue.porSalir.length + queue.enCamino.length;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-5 pb-16 sm:px-6">
      {!config?.enabled && (
        <p className="bg-warning-soft text-warning-ink rounded-lg px-3 py-2 text-sm font-medium">
          Los domicilios están desactivados. El administrador los activa en Configuración.
        </p>
      )}
      {all === 0 && queue.cerrados.length === 0 && (
        <div className="border-line bg-surface rounded-2xl border p-6 text-center">
          <h2 className="font-display text-[20px] font-semibold">Sin pedidos por ahora</h2>
          <p className="text-muted mt-1 text-[15px]">
            Cuando un cliente pida desde <span className="font-semibold">/domicilio</span>, aparece
            aquí al instante.
          </p>
        </div>
      )}
      <Section
        title="Nuevos"
        hint="Confirma o rechaza."
        items={queue.nuevos}
        {...{ dishes, now, config, onPay: setPaying, onReason: setReason }}
      />
      <Section
        title="En cocina"
        items={queue.enCocina}
        {...{ dishes, now, config, onPay: setPaying, onReason: setReason }}
      />
      <Section
        title="Listos"
        hint="Despáchalos o entrégalos en el mostrador."
        items={queue.porSalir}
        {...{ dishes, now, config, onPay: setPaying, onReason: setReason }}
      />
      <Section
        title="En camino"
        items={queue.enCamino}
        {...{ dishes, now, config, onPay: setPaying, onReason: setReason }}
      />
      <Section
        title="Finalizados hoy"
        items={queue.cerrados}
        {...{ dishes, now, config, onPay: setPaying, onReason: setReason }}
      />

      {paying && (
        <PaymentSheet
          label={`Domicilio ${paying.info.code}`}
          sessionId={paying.session.id}
          onClose={() => setPaying(null)}
        />
      )}
      {reason && (
        <ReasonDialog item={reason.item} kind={reason.kind} onClose={() => setReason(null)} />
      )}
    </main>
  );
}

type SectionProps = {
  title: string;
  hint?: string;
  items: DeliveryItem[];
  dishes: readonly Dish[];
  now: number;
  config: ReturnType<typeof useDeliveryConfig>;
  onPay: (i: DeliveryItem) => void;
  onReason: (r: { item: DeliveryItem; kind: "rechazar" | "cancelar" }) => void;
};

function Section({ title, hint, items, ...rest }: SectionProps) {
  if (items.length === 0) return null;
  const id = `dom-${title.replace(/\s/g, "-")}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-[20px] font-semibold">
        {title}
        <span className="text-muted ml-2 text-[15px] font-normal">{items.length}</span>
      </h2>
      {hint && <p className="text-muted text-[13px]">{hint}</p>}
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {items.map((i) => (
          <li key={i.order.id}>
            <DeliveryCard item={i} {...rest} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const DeliveryCard = memo(function DeliveryCard({
  item,
  dishes,
  now,
  config,
  onPay,
  onReason,
}: Omit<SectionProps, "title" | "hint" | "items"> & { item: DeliveryItem }) {
  const staff = useCurrentStaff();
  const orders = useOrders();
  const payments = useLivePayments();
  const [driver, setDriver] = useState(config?.drivers[0] ?? "");
  const { info, order, stage } = item;
  const balance = sessionBalance(orders, payments, item.session.id, info.fee);
  const age = now - Date.parse(order.createdAt);
  const closed = stage === "entregado" || stage === "cancelado";
  const lines = order.items.filter((l) => !l.removed);

  const run = (r: { ok: boolean; error?: string }, ok: string) =>
    r.ok ? toast.success(ok) : toast.error("No se pudo", { description: r.error });

  return (
    <article
      aria-label={`${info.code}, ${info.customerName}`}
      className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-4"
    >
      <header className="flex items-start gap-3">
        <span className="bg-accent-soft text-accent-strong flex size-10 shrink-0 items-center justify-center rounded-full">
          {info.type === "recoger" ? (
            <Store className="size-5" aria-hidden />
          ) : (
            <Bike className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-tight font-semibold">
            {info.code} · {info.customerName}
          </p>
          <p className="text-muted text-[13px]">
            {info.type === "recoger" ? "Para recoger" : "A domicilio"} ·{" "}
            {formatTime(new Date(order.createdAt))}
            {!closed && ` · hace ${formatElapsed(age)}`}
          </p>
        </div>
        <Price value={item.total} className="text-[17px]" />
      </header>

      <div className="text-ink-soft flex flex-col gap-1 text-[14px]">
        {info.type === "domicilio" && (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {info.address} · {info.zoneName}
              {info.reference && <span className="text-muted block">{info.reference}</span>}
            </span>
          </p>
        )}
        <p className="flex items-center gap-2">
          <Phone className="size-4 shrink-0" aria-hidden />
          <a href={`tel:${info.phone}`} className="underline-offset-2 hover:underline">
            {formatPhone(info.phone)}
          </a>
        </p>
      </div>

      <ul className="bg-surface-2 divide-line divide-y rounded-lg px-3 text-[14px]">
        {lines.map((l) => {
          const dish = dishes.find((d) => d.id === l.dishId);
          const variant = dish?.variants.find((v) => v.id === l.variantId);
          return (
            <li key={l.id} className="py-1.5">
              <span className="font-semibold">{l.qty}×</span> {dish?.name ?? "Plato"}
              {dish && dish.variants.length > 1 && variant ? ` · ${variant.name}` : ""}
              {l.note && (
                <span className="text-warning-ink block font-semibold">Nota: {l.note}</span>
              )}
            </li>
          );
        })}
      </ul>
      {info.note && <p className="text-warning-ink text-sm font-semibold">Pedido: {info.note}</p>}

      <p className="text-ink-soft text-[13px]">
        {PAY_WITH_LABEL[info.payWith]}
        {info.cashFor
          ? ` · paga con $${info.cashFor.toLocaleString("es-CO")} (cambio $${(info.cashFor - item.total).toLocaleString("es-CO")})`
          : ""}
        {info.fee > 0 && ` · envío $${info.fee.toLocaleString("es-CO")}`}
        {" · "}
        {stage === "cancelado" ? (
          <span className="text-danger-ink font-semibold">{order.rejectReason ?? "Cancelado"}</span>
        ) : balance.pending === 0 ? (
          <span className="text-success-ink font-semibold">Pagado</span>
        ) : (
          <span className="font-semibold">
            Falta <Price value={balance.pending} />
          </span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {stage === "recibido" && (
          <>
            <Button
              size="sm"
              onClick={() => run(deliveryActions.confirm(order.id), `${info.code} confirmado`)}
            >
              Confirmar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReason({ item, kind: "rechazar" })}
            >
              Rechazar
            </Button>
          </>
        )}
        {(stage === "confirmado" || stage === "preparando") && (
          <p className="text-muted text-sm">
            {stage === "confirmado" ? "Esperando a la cocina" : "En preparación"}
          </p>
        )}
        {stage === "listo" && info.type === "domicilio" && (
          <>
            <Select
              className="h-10 w-40"
              aria-label={`Domiciliario para ${info.code}`}
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
            >
              {(config?.drivers ?? []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              onClick={() =>
                run(deliveryActions.dispatch(order.id, driver), `${info.code} salió con ${driver}`)
              }
            >
              Despachar
            </Button>
          </>
        )}
        {((stage === "listo" && info.type === "recoger") || stage === "en_camino") && (
          <Button
            size="sm"
            onClick={() => run(deliveryActions.deliver(order.id), `${info.code} entregado`)}
          >
            {info.type === "recoger"
              ? "Entregado al cliente"
              : `Entregado${info.driver ? ` · ${info.driver}` : ""}`}
          </Button>
        )}
        {!closed && stage !== "recibido" && (
          <Button variant="ghost" size="sm" onClick={() => onReason({ item, kind: "cancelar" })}>
            Cancelar
          </Button>
        )}
        {can(staff?.role, "cobrar") && stage !== "cancelado" && balance.pending > 0 && (
          <Button variant="secondary" size="sm" onClick={() => onPay(item)}>
            Cobrar<span className="sr-only"> {info.code}</span>
          </Button>
        )}
      </div>
    </article>
  );
});

function ReasonDialog({
  item,
  kind,
  onClose,
}: {
  item: DeliveryItem;
  kind: "rechazar" | "cancelar";
  onClose: () => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [error, setError] = useState<string>();
  const reject = kind === "rechazar";
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${reject ? "Rechazar" : "Cancelar"} ${item.info.code}`}
      description={
        reject ? "El cliente verá el motivo." : "Se avisa a cocina y el cliente ve el motivo."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const why = resolveReason(value, other);
              if (!why) return setError(value === "Otro" ? "Escribe el motivo" : "Elige un motivo");
              const r = reject
                ? deliveryActions.reject(item.order.id, why)
                : deliveryActions.cancelActive(item.order.id, why);
              if (!r.ok) return setError(r.error);
              toast.success(`${item.info.code} ${reject ? "rechazado" : "cancelado"}`);
              onClose();
            }}
          >
            {reject ? "Rechazar pedido" : "Cancelar pedido"}
          </Button>
        </>
      }
    >
      <ReasonPicker
        options={reject ? REJECT_REASONS : CANCEL_REASONS}
        value={value}
        onChange={(v) => {
          setValue(v);
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

export type { DeliveryQueue };
