"use client";

import { CalendarDays, MessageCircle, PartyPopper, Phone, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import {
  reservationActions,
  useReservationConfig,
  useReservations,
  useRestaurant,
} from "@/lib/data";
import { formatPhone } from "@/lib/domain/delivery";
import { formatMoney } from "@/lib/domain/format";
import {
  messageReservationToCustomer,
  quoteTotal,
  reservationQueue,
  reservationWhen,
  STATUS_LABEL,
} from "@/lib/domain/reservations";
import type { Reservation, ReservationQuote } from "@/lib/domain/types";
import { telLink, waLink } from "@/lib/domain/whatsapp";

/** Hora real, al minuto, para separar lo próximo de lo que ya pasó. */
function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Reservas de mesa y solicitudes de eventos: confirmar, cotizar, avisar por WhatsApp y cerrar. */
export function ReservationsBoard() {
  const reservations = useReservations();
  const config = useReservationConfig();
  const now = useClock();
  const queue = useMemo(() => reservationQueue(reservations, now), [reservations, now]);
  const [rejecting, setRejecting] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState<Reservation | null>(null);
  const [quoting, setQuoting] = useState<Reservation | null>(null);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-5 pb-16 sm:px-6">
      <div>
        <h2 className="font-display text-[22px] font-semibold">Reservas y eventos</h2>
        <p className="text-muted text-sm">
          {config.enabled
            ? "Las solicitudes llegan aquí. Confirma, cotiza los eventos y avisa al cliente por WhatsApp."
            : "Las reservas están desactivadas. Actívalas en Configuración."}
        </p>
      </div>

      {reservations.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Aún no hay reservas"
          description="Cuando un cliente reserve desde tu enlace, aparecerá aquí al instante."
        />
      )}

      <Section title="Por confirmar" count={queue.pending.length} empty="Nada por confirmar.">
        {queue.pending.map((r) => (
          <Card
            key={r.id}
            r={r}
            onReject={setRejecting}
            onCancel={setCancelling}
            onQuote={setQuoting}
          />
        ))}
      </Section>
      <Section
        title="Próximas"
        count={queue.upcoming.length}
        empty="No hay reservas confirmadas por venir."
      >
        {queue.upcoming.map((r) => (
          <Card
            key={r.id}
            r={r}
            onReject={setRejecting}
            onCancel={setCancelling}
            onQuote={setQuoting}
          />
        ))}
      </Section>
      {queue.toClose.length > 0 && (
        <Section title="Ya pasaron: ciérralas" count={queue.toClose.length} empty="">
          {queue.toClose.map((r) => (
            <Card
              key={r.id}
              r={r}
              onReject={setRejecting}
              onCancel={setCancelling}
              onQuote={setQuoting}
            />
          ))}
        </Section>
      )}
      {queue.past.length > 0 && (
        <Section title="Resueltas" count={queue.past.length} empty="">
          {queue.past.slice(0, 12).map((r) => (
            <Card
              key={r.id}
              r={r}
              onReject={setRejecting}
              onCancel={setCancelling}
              onQuote={setQuoting}
            />
          ))}
        </Section>
      )}

      {rejecting && (
        <ReasonDialog
          title={`No disponible · ${rejecting.code}`}
          description="El cliente verá el motivo."
          confirm="Rechazar"
          required
          onClose={() => setRejecting(null)}
          onSubmit={(reason) => reservationActions.reject(rejecting.id, reason)}
        />
      )}
      {cancelling && (
        <ReasonDialog
          title={`Cancelar ${cancelling.code}`}
          description="Se libera el cupo. El motivo es opcional."
          confirm="Cancelar reserva"
          onClose={() => setCancelling(null)}
          onSubmit={(reason) => reservationActions.cancel(cancelling.id, reason)}
        />
      )}
      {quoting && <QuoteDialog r={quoting} onClose={() => setQuoting(null)} />}
    </main>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  const id = `res-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="mb-2 text-[15px] font-semibold">
        {title} <span className="text-muted font-normal tabular-nums">({count})</span>
      </h3>
      {count === 0 ? (
        empty && <p className="text-muted text-sm">{empty}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{children}</div>
      )}
    </section>
  );
}

function Card({
  r,
  onReject,
  onCancel,
  onQuote,
}: {
  r: Reservation;
  onReject: (r: Reservation) => void;
  onCancel: (r: Reservation) => void;
  onQuote: (r: Reservation) => void;
}) {
  const restaurant = useRestaurant();
  const run = (res: { ok: boolean; error?: string }, ok: string) =>
    res.ok ? toast.success(ok) : toast.error("No se pudo", { description: res.error });
  const wa = waLink(r.phone, messageReservationToCustomer(r, restaurant.name));
  const active = r.status === "solicitada" || r.status === "confirmada";
  const total = r.quote ? quoteTotal(r.quote) : 0;

  return (
    <article
      aria-label={`${r.code}, ${r.name}`}
      className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-4"
    >
      <header className="flex items-start gap-3">
        <span className="bg-accent-soft text-accent-strong flex size-10 shrink-0 items-center justify-center rounded-full">
          {r.kind === "evento" ? (
            <PartyPopper className="size-5" aria-hidden />
          ) : (
            <CalendarDays className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-tight font-semibold">
            {r.code} · {r.name}
          </p>
          <p className="text-muted text-[13px]">
            {r.kind === "evento" ? "Evento" : "Mesa"} · {reservationWhen(r)}
          </p>
        </div>
        <Badge
          tone={
            r.status === "solicitada"
              ? "warning"
              : r.status === "confirmada"
                ? "success"
                : r.status === "realizada"
                  ? "neutral"
                  : "danger"
          }
        >
          {STATUS_LABEL[r.status]}
        </Badge>
      </header>

      <div className="text-ink-soft flex flex-col gap-1 text-[14px]">
        <p className="flex items-center gap-2">
          <Users className="size-4 shrink-0" aria-hidden /> {r.people} personas
          {r.occasion && ` · ${r.occasion}`}
        </p>
        <p className="flex items-center gap-2">
          <Phone className="size-4 shrink-0" aria-hidden />
          <a href={telLink(r.phone) ?? undefined} className="underline-offset-2 hover:underline">
            {formatPhone(r.phone)}
          </a>
        </p>
        {r.details && <p>Busca: {r.details}</p>}
        {r.budget ? <p>Presupuesto aproximado: {formatMoney(r.budget)}</p> : null}
        {r.note && <p className="text-warning-ink font-semibold">Nota: {r.note}</p>}
        {r.reason && <p className="text-muted">Motivo: {r.reason}</p>}
        {r.quote && (
          <p className="font-semibold">
            Cotización {formatMoney(total)}
            {r.quote.deposit > 0 &&
              ` · anticipo ${formatMoney(r.quote.deposit)} (${r.quote.depositPaid ? "recibido" : "pendiente"})`}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {r.status === "solicitada" && (
          <>
            <Button
              size="sm"
              onClick={() => run(reservationActions.confirm(r.id), `${r.code} confirmada`)}
            >
              Confirmar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onReject(r)}>
              No disponible
            </Button>
          </>
        )}
        {r.kind === "evento" && active && (
          <Button variant="secondary" size="sm" onClick={() => onQuote(r)}>
            {r.quote ? "Editar cotización" : "Cotizar"}
          </Button>
        )}
        {r.status === "confirmada" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => run(reservationActions.complete(r.id), `${r.code} realizada`)}
          >
            Marcar realizada
          </Button>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            <MessageCircle aria-hidden /> Escribirle<span className="sr-only"> a {r.name}</span>
          </a>
        )}
        {active && (
          <Button variant="ghost" size="sm" onClick={() => onCancel(r)}>
            Cancelar
          </Button>
        )}
      </div>
    </article>
  );
}

function ReasonDialog({
  title,
  description,
  confirm,
  required,
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  confirm: string;
  required?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => { ok: boolean; error?: string };
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const r = onSubmit(reason);
              if (!r.ok) return setError(r.error);
              toast.success("Listo");
              onClose();
            }}
          >
            {confirm}
          </Button>
        </>
      }
    >
      <label htmlFor="motivo-reserva" className="text-sm font-medium">
        Motivo{required ? "" : " (opcional)"}
      </label>
      <Input
        id="motivo-reserva"
        className="mt-1.5"
        value={reason}
        maxLength={120}
        placeholder="Ej.: ese día cerramos por evento privado"
        onChange={(e) => {
          setReason(e.target.value);
          setError(undefined);
        }}
      />
      {error && (
        <p role="alert" className="text-danger-ink mt-2 text-sm font-medium">
          {error}
        </p>
      )}
    </Dialog>
  );
}

function QuoteDialog({ r, onClose }: { r: Reservation; onClose: () => void }) {
  const [items, setItems] = useState(
    r.quote?.items.map((i) => ({ label: i.label, amount: String(i.amount) })) ?? [
      { label: "Menú por persona × " + r.people, amount: "" },
      { label: "", amount: "" },
    ],
  );
  const [deposit, setDeposit] = useState(String(r.quote?.deposit ?? 0));
  const [paid, setPaid] = useState(r.quote?.depositPaid ?? false);
  const [error, setError] = useState<string>();
  const digits = (t: string) => Number(t.replace(/\D/g, "")) || 0;
  const total = items.reduce((s, i) => s + digits(i.amount), 0);

  function save() {
    const quote: ReservationQuote = {
      items: items
        .filter((i) => i.label.trim() || digits(i.amount) > 0)
        .map((i) => ({ label: i.label, amount: digits(i.amount) })),
      deposit: digits(deposit),
      depositPaid: paid,
    };
    const res = reservationActions.setQuote(r.id, quote);
    if (!res.ok) return setError(res.error);
    toast.success("Cotización guardada");
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Cotizar ${r.code}`}
      description={`${r.name} · ${r.people} personas · ${reservationWhen(r)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={save}>Guardar cotización</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              aria-label={`Concepto ${i + 1}`}
              className="flex-1"
              value={it.label}
              maxLength={60}
              placeholder="Concepto"
              onChange={(e) =>
                setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <Input
              aria-label={`Valor ${i + 1}`}
              className="w-32"
              inputMode="numeric"
              value={it.amount}
              placeholder="Valor"
              onChange={(e) =>
                setItems(items.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))
              }
            />
            <button
              type="button"
              aria-label={`Quitar el concepto ${i + 1}`}
              className="text-muted hover:text-ink flex size-10 items-center justify-center"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setItems([...items, { label: "", amount: "" }])}
        >
          <Plus aria-hidden /> Agregar concepto
        </Button>
        <p className="text-[15px] font-semibold">Total: {formatMoney(total)}</p>
        <div className="flex items-center gap-2">
          <label htmlFor="anticipo" className="text-sm font-medium">
            Anticipo
          </label>
          <Input
            id="anticipo"
            className="w-36"
            inputMode="numeric"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
        </div>
        <Switch
          label="Anticipo recibido"
          description="Solo lo registras: Platterio no cobra ni recibe pagos."
          checked={paid}
          onChange={setPaid}
        />
        {error && (
          <p role="alert" className="text-danger-ink text-sm font-medium">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
