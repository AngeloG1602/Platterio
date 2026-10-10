"use client";

import { ArrowLeft, CalendarCheck, CalendarX, Check, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MadeWithPlatterio } from "@/components/brand/logos";
import { MenuHeader } from "@/components/brand/menu-header";
import { useBusinessHref } from "@/components/providers/business-scope";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  reservationClientActions,
  useDeliveryConfig,
  useHydrated,
  useReservation,
  useReservationClient,
  useReservationConfig,
  useReservations,
  useRestaurant,
} from "@/lib/data";
import { formatMoney } from "@/lib/domain/format";
import {
  availableTimes,
  messageReservationToBusiness,
  quoteTotal,
  reservationWhen,
  STATUS_LABEL,
  type ReservationErrors,
} from "@/lib/domain/reservations";
import type { ReservationKind, ReservationStatus } from "@/lib/domain/types";
import { waLink } from "@/lib/domain/whatsapp";
import { cn } from "@/lib/cn";
import { ClientShell } from "./client-shell";

const dayInput = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUS_TONE: Record<ReservationStatus, "warning" | "success" | "danger" | "neutral"> = {
  solicitada: "warning",
  confirmada: "success",
  rechazada: "danger",
  cancelada: "neutral",
  realizada: "neutral",
};

/** Formulario público para reservar una mesa o pedir un evento. */
export function ReservationScreen() {
  return (
    <ClientShell>
      <ReservationForm />
    </ClientShell>
  );
}

function ReservationForm() {
  const hydrated = useHydrated();
  const config = useReservationConfig();
  if (!hydrated) {
    return (
      <div className="px-4 pt-6" aria-busy aria-label="Cargando">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-12 rounded-xl" />
        <Skeleton className="mt-3 h-12 rounded-xl" />
      </div>
    );
  }
  if (!config.enabled) {
    return (
      <EmptyState
        icon={CalendarX}
        title="Por ahora no recibimos reservas por aquí"
        description="Escríbenos o llámanos y con gusto te ayudamos."
        className="my-auto"
      />
    );
  }
  return <FormBody />;
}

function FormBody() {
  const router = useRouter();
  const href = useBusinessHref();
  const restaurant = useRestaurant();
  const config = useReservationConfig();
  const reservations = useReservations();
  const profile = useReservationClient((s) => s.profile);
  // La hora se toma una vez al abrir; basta para armar el calendario.
  const [today] = useState(() => Date.now());

  const [kind, setKind] = useState<ReservationKind>("mesa");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [people, setPeople] = useState("2");
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [occasion, setOccasion] = useState("");
  const [details, setDetails] = useState("");
  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ReservationErrors>({});
  const [formError, setFormError] = useState<string>();

  const n = Number(people) || 0;
  const slots = useMemo(
    () => (date ? availableTimes(config, reservations, date, Math.max(1, n), today) : []),
    [config, reservations, date, n, today],
  );

  const set = (fn: () => void, key?: keyof ReservationErrors) => {
    fn();
    setFormError(undefined);
    if (key) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = reservationClientActions.create({
      kind,
      name,
      phone,
      date,
      time,
      people: n,
      ...(kind === "evento"
        ? {
            occasion,
            details,
            ...(budget.trim() ? { budget: Number(budget.replace(/\D/g, "")) } : {}),
          }
        : {}),
      note,
    });
    if (!r.ok) {
      setErrors(r.errors);
      setFormError(r.error);
      return;
    }
    toast.success("Recibimos tu solicitud");
    router.push(href(`/reservas/${r.id}`));
  }

  const maxDate = dayInput(today + config.advanceDays * 86_400_000);
  const eventsOn = config.events.enabled;

  return (
    <>
      <MenuHeader name={restaurant.name} />
      <main className="flex flex-1 flex-col px-4 pt-6 pb-10">
        <h1 className="font-display text-[30px] leading-[1.1] font-semibold tracking-tight">
          Reserva con nosotros
        </h1>
        <p className="text-ink-soft mt-2 text-[16px]">
          Elige el día y la hora. Te confirmamos por WhatsApp.
        </p>

        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
          {eventsOn && (
            <Segmented
              label="Tipo de reserva"
              value={kind}
              onChange={(v) => {
                setKind(v);
                setFormError(undefined);
                setErrors({});
                setPeople(v === "evento" ? String(config.events.minPeople) : "2");
              }}
              options={[
                { value: "mesa", label: "Mesa" },
                { value: "evento", label: "Evento" },
              ]}
            />
          )}
          {kind === "evento" && (
            <p className="text-muted text-[14px]">
              Para celebraciones desde {config.events.minPeople} personas. Te respondemos con una
              cotización.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Día" error={errors.date}>
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  min={dayInput(today)}
                  max={maxDate}
                  value={date}
                  onChange={(e) =>
                    set(() => {
                      setDate(e.target.value);
                      setTime("");
                    }, "date")
                  }
                />
              )}
            </Field>
            <Field label="Personas" error={errors.people}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  value={people}
                  onChange={(e) =>
                    set(() => setPeople(e.target.value.replace(/\D/g, "")), "people")
                  }
                />
              )}
            </Field>
          </div>

          <Field label="Hora" error={errors.time} hint={date ? undefined : "Primero elige el día."}>
            {(p) => (
              <Select
                {...p}
                value={time}
                disabled={!date}
                onChange={(e) => set(() => setTime(e.target.value), "time")}
              >
                <option value="">Elige una hora</option>
                {slots.map((s) => (
                  <option key={s.time} value={s.time} disabled={!s.available}>
                    {s.time}
                    {s.available ? "" : " · no disponible"}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Tu nombre" error={errors.name}>
            {(p) => (
              <Input
                {...p}
                value={name}
                autoComplete="name"
                onChange={(e) => set(() => setName(e.target.value), "name")}
              />
            )}
          </Field>
          <Field label="Celular (WhatsApp)" error={errors.phone}>
            {(p) => (
              <Input
                {...p}
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                placeholder="300 123 4567"
                onChange={(e) => set(() => setPhone(e.target.value), "phone")}
              />
            )}
          </Field>

          {kind === "evento" && (
            <>
              <Field label="Motivo del evento" error={errors.occasion}>
                {(p) => (
                  <Select
                    {...p}
                    value={occasion}
                    onChange={(e) => set(() => setOccasion(e.target.value), "occasion")}
                  >
                    <option value="">Elige el motivo</option>
                    {config.events.occasions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label="¿Qué estás buscando?"
                optional
                hint="Tipo de menú, decoración, música, alguna necesidad especial."
                error={errors.details}
              >
                {(p) => (
                  <Textarea
                    {...p}
                    maxLength={500}
                    value={details}
                    onChange={(e) => set(() => setDetails(e.target.value), "details")}
                  />
                )}
              </Field>
              <Field label="Presupuesto aproximado" optional error={errors.budget}>
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    value={budget}
                    placeholder="Ej.: 2000000"
                    onChange={(e) => set(() => setBudget(e.target.value), "budget")}
                  />
                )}
              </Field>
            </>
          )}

          <Field label="Algo más que debamos saber" optional error={errors.note}>
            {(p) => (
              <Input
                {...p}
                maxLength={300}
                value={note}
                placeholder="Silla para bebé, alergias, celebración…"
                onChange={(e) => set(() => setNote(e.target.value), "note")}
              />
            )}
          </Field>

          {formError && (
            <p role="alert" className="text-danger-ink text-[14px] font-medium">
              {formError}
            </p>
          )}
          <Button type="submit" size="lg" block>
            <CalendarCheck aria-hidden /> {kind === "evento" ? "Pedir cotización" : "Reservar"}
          </Button>
        </form>
        <MadeWithPlatterio className="mt-auto pt-10" />
      </main>
    </>
  );
}

/** Seguimiento de una reserva: estado, detalle, cotización y WhatsApp con el negocio. */
export function ReservationStatusScreen({ id }: { id: string }) {
  return (
    <ClientShell>
      <ReservationStatus id={id} />
    </ClientShell>
  );
}

function ReservationStatus({ id }: { id: string }) {
  const hydrated = useHydrated();
  const href = useBusinessHref();
  const restaurant = useRestaurant();
  const delivery = useDeliveryConfig();
  const reservation = useReservation(id);
  const mine = useReservationClient((s) => s.ids.includes(id));
  const [confirming, setConfirming] = useState(false);

  if (!hydrated)
    return (
      <div className="px-4 pt-6" aria-busy aria-label="Cargando">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40 rounded-xl" />
      </div>
    );
  if (!reservation)
    return (
      <EmptyState
        icon={CalendarX}
        title="No encontramos esa reserva"
        action={
          <Link href={href("/reservas")} className={buttonClasses({ variant: "secondary" })}>
            Hacer una reserva
          </Link>
        }
        className="my-auto"
      />
    );

  const r = reservation;
  const open = r.status === "solicitada" || r.status === "confirmada";
  const message = {
    solicitada: "Recibimos tu solicitud. Te confirmamos por WhatsApp en cuanto la revisemos.",
    confirmada: "¡Tu reserva está confirmada! Te esperamos.",
    rechazada: `No pudimos confirmarla${r.reason ? `: ${r.reason}` : ""}. Escríbenos y buscamos otra opción.`,
    cancelada: `Esta reserva se canceló${r.reason ? `: ${r.reason}` : ""}.`,
    realizada: "Gracias por visitarnos.",
  }[r.status];
  const wa = delivery?.whatsapp
    ? waLink(delivery.whatsapp, messageReservationToBusiness(r, restaurant.name))
    : null;

  return (
    <>
      <header className="flex items-center gap-2 px-2 pt-3">
        <Link
          href={href("/reservas")}
          aria-label="Hacer otra reserva"
          className="hover:bg-surface-2 flex size-11 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div>
          <h1 className="font-display text-[22px] leading-tight font-semibold">
            {r.kind === "evento" ? "Evento" : "Reserva"} {r.code}
          </h1>
          <p className="text-muted text-[13px]">{restaurant.name}</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-10">
        <section
          aria-live="polite"
          className={cn(
            "rounded-2xl p-4 text-[16px] font-medium",
            r.status === "rechazada" || r.status === "cancelada"
              ? "bg-danger-soft text-danger-ink"
              : "bg-accent-soft text-accent-strong",
          )}
        >
          <Badge tone={STATUS_TONE[r.status]} className="mb-2">
            {STATUS_LABEL[r.status]}
          </Badge>
          <p>{message}</p>
        </section>

        <dl className="border-line divide-line divide-y rounded-xl border px-4 text-[15px]">
          <Row label="Cuándo" value={reservationWhen(r)} />
          <Row label="Personas" value={String(r.people)} icon={<Users className="size-4" />} />
          <Row label="A nombre de" value={r.name} />
          {r.occasion && <Row label="Motivo" value={r.occasion} />}
          {r.details && <Row label="Lo que buscas" value={r.details} />}
          {r.budget ? <Row label="Presupuesto" value={formatMoney(r.budget)} /> : null}
          {r.note && <Row label="Nota" value={r.note} />}
        </dl>

        {r.quote && (
          <section aria-label="Cotización" className="border-line rounded-xl border">
            <h2 className="px-4 pt-3 text-[15px] font-semibold">Cotización del evento</h2>
            <ul className="divide-line divide-y px-4">
              {r.quote.items.map((i) => (
                <li key={i.label} className="flex justify-between gap-3 py-2 text-[15px]">
                  <span>{i.label}</span>
                  <span className="tabular-nums">{formatMoney(i.amount)}</span>
                </li>
              ))}
            </ul>
            <dl className="border-line bg-surface-2 flex flex-col gap-1 rounded-b-xl border-t px-4 py-3 text-[15px]">
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(quoteTotal(r.quote))}</dd>
              </div>
              {r.quote.deposit > 0 && (
                <div className="text-ink-soft flex justify-between">
                  <dt>Anticipo</dt>
                  <dd className="tabular-nums">
                    {formatMoney(r.quote.deposit)} ·{" "}
                    {r.quote.depositPaid ? "recibido" : "pendiente"}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {wa && open && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "secondary", block: true })}
          >
            <MessageCircle aria-hidden /> Escribirle al restaurante por WhatsApp
          </a>
        )}
        {mine && open && (
          <Button variant="ghost" block onClick={() => setConfirming(true)}>
            Cancelar la reserva
          </Button>
        )}
        <p className="text-muted text-center text-[13px]">
          Guarda esta página: aquí ves cómo va tu reserva.
        </p>
      </main>

      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Cancelar tu reserva?"
        description="Se libera el cupo y el restaurante lo ve al instante."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const res = reservationClientActions.cancel(r.id);
                setConfirming(false);
                if (!res.ok) return toast.error("No se pudo cancelar", { description: res.error });
                toast.success("Reserva cancelada");
              }}
            >
              <Check aria-hidden /> Sí, cancelar
            </Button>
          </>
        }
      />
    </>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
