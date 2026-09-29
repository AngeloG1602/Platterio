"use client";

import { CircleAlert, Plus, Star, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { DishImage } from "@/components/dish/dish-image";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  catalogActions,
  slotActions,
  useAllDishRatings,
  useAllOrders,
  useDishes,
  useHydrated,
  useNow,
  useTimeSlots,
} from "@/lib/data";
import { formatClock } from "@/lib/domain/format";
import { priceRange } from "@/lib/domain/menu";
import { REASON_LABEL, recommend, slotHeadline, WEIGHTS } from "@/lib/domain/recommender";
import { slotMidpoint, toMinutes, validateTimeSlots, type SlotError } from "@/lib/domain/timeSlots";
import type { TimeSlot } from "@/lib/domain/types";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/cn";
import { PageHeader, Panel } from "./ui/page-header";

/** Recomendaciones (US-15, US-17): destacados, franjas sin solapamiento y vista previa. */
export function RecommendationsAdmin() {
  const hydrated = useHydrated();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Recomendaciones"
        description="El carrusel del cliente mezcla la franja actual, lo más pedido, lo mejor calificado y lo que destaque la casa."
      />
      {hydrated ? (
        <>
          <Featured />
          <SlotsEditor />
          <Preview />
        </>
      ) : (
        <Skeleton className="h-96 rounded-2xl" />
      )}
    </div>
  );
}

function Featured() {
  const dishes = useDishes();
  const [pick, setPick] = useState("");
  const featured = dishes.filter((d) => d.featured);
  const candidates = dishes.filter((d) => !d.featured && d.active);
  return (
    <Panel
      title="Destacados por la casa"
      description={`Suman ${Math.round(WEIGHTS.destacado * 100)} % del puntaje. Un plato nuevo destacado, sin pedidos ni reseñas todavía, sale de primero.`}
    >
      {featured.length === 0 ? (
        <p className="text-muted text-[15px]">No hay platos destacados.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {featured.map((d) => (
            <li
              key={d.id}
              className="border-line bg-bg flex items-center gap-2 rounded-full border py-1 pr-1 pl-1"
            >
              <DishImage
                src={d.photos[0]}
                name={d.name}
                sizes="32px"
                className="size-8"
                rounded="rounded-full"
                initialClassName="text-sm"
              />
              <span className="text-[15px] font-medium">{d.name}</span>
              {!d.active && <Badge>Desactivado</Badge>}
              <IconButton
                label={`Quitar ${d.name} de destacados`}
                className="size-9"
                onClick={() => {
                  catalogActions.setFeatured(d.id, false);
                  toast(`${d.name} ya no está destacado`);
                }}
              >
                <X aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <label htmlFor="destacar" className="sr-only">
          Plato para destacar
        </label>
        <Select
          id="destacar"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="w-72"
        >
          <option value="">Elige un plato para destacar</option>
          {candidates.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          disabled={!pick}
          onClick={() => {
            const dish = dishes.find((d) => d.id === pick);
            catalogActions.setFeatured(pick, true);
            setPick("");
            toast.success(`${dish?.name ?? "Plato"} destacado`, {
              description: "Ya suma en los recomendados.",
            });
          }}
        >
          <Star aria-hidden /> Destacar
        </Button>
      </div>
    </Panel>
  );
}

type SlotRow = Omit<TimeSlot, "id"> & { id?: string; key: string };

const toSlot = (r: SlotRow) => ({ id: r.id, name: r.name, start: r.start, end: r.end });

function SlotsEditor() {
  const saved = useTimeSlots();
  const [rows, setRows] = useState<SlotRow[]>(() => saved.map((s) => ({ ...s, key: s.id })));
  const [errors, setErrors] = useState<SlotError[]>([]);
  const dirty = JSON.stringify(rows.map(toSlot)) !== JSON.stringify(saved);
  const withIds = rows.map((r) => ({ ...toSlot(r), id: r.key }));
  const live = validateTimeSlots(withIds);
  const errorFor = (key: string) =>
    errors.find((e) => e.slotId === key) ??
    live.find((e) => e.slotId === key && e.kind === "solape");
  const update = (key: string, patch: Partial<SlotRow>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  function save() {
    // Se valida con la clave de cada fila para poder marcar la fila exacta.
    const problems = validateTimeSlots(withIds);
    if (problems.length) {
      setErrors(problems);
      toast.error(
        problems.some((e) => e.kind === "solape") ? "Las franjas se solapan" : "Revisa las franjas",
      );
      return;
    }
    const result = slotActions.save(rows.map(toSlot));
    if (!result.ok) return toast.error("Revisa las franjas");
    setErrors([]);
    toast.success("Franjas guardadas", {
      description: "Los recomendados ya usan los nuevos horarios.",
    });
  }

  return (
    <Panel
      title="Franjas horarias"
      description="No pueden solaparse. Si quitas una, se quita también de los platos que la tenían."
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setRows((r) => [
              ...r,
              { key: `n${Date.now()}`, name: "", start: "23:00", end: "23:30" },
            ])
          }
        >
          <Plus aria-hidden /> Agregar franja
        </Button>
      }
    >
      <DayBar rows={rows} />
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((row) => {
          const err = errorFor(row.key);
          return (
            <li key={row.key}>
              <div
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_minmax(0,150px)_minmax(0,150px)_44px] items-center gap-2 rounded-xl border p-2",
                  err ? "border-danger/50 bg-danger-soft" : "border-line",
                )}
              >
                <label className="sr-only" htmlFor={`n-${row.key}`}>
                  Nombre de la franja
                </label>
                <Input
                  id={`n-${row.key}`}
                  value={row.name}
                  placeholder="Nombre"
                  onChange={(e) => update(row.key, { name: e.target.value })}
                  aria-invalid={err?.kind === "nombre"}
                />
                <label className="sr-only" htmlFor={`s-${row.key}`}>
                  Inicio
                </label>
                <Input
                  id={`s-${row.key}`}
                  type="time"
                  value={row.start}
                  onChange={(e) => update(row.key, { start: e.target.value })}
                  aria-invalid={Boolean(err)}
                />
                <label className="sr-only" htmlFor={`e-${row.key}`}>
                  Fin
                </label>
                <Input
                  id={`e-${row.key}`}
                  type="time"
                  value={row.end}
                  onChange={(e) => update(row.key, { end: e.target.value })}
                  aria-invalid={Boolean(err)}
                />
                <IconButton
                  label={`Quitar ${row.name || "franja"}`}
                  onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                  disabled={rows.length === 1}
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </div>
              {err && (
                <p className="text-danger-ink mt-1 flex items-center gap-1.5 pl-2 text-[13px] font-medium">
                  <CircleAlert className="size-4" aria-hidden /> {err.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-end gap-2">
        {dirty && <span className="text-muted mr-auto text-sm">Tienes cambios sin guardar.</span>}
        <Button
          variant="secondary"
          disabled={!dirty}
          onClick={() => {
            setRows(saved.map((s) => ({ ...s, key: s.id })));
            setErrors([]);
          }}
        >
          Descartar
        </Button>
        <Button disabled={!dirty} onClick={save}>
          Guardar franjas
        </Button>
      </div>
    </Panel>
  );
}

/** Las franjas sobre las 24 horas del día. */
function DayBar({ rows }: { rows: SlotRow[] }) {
  const segments = rows.flatMap((r) => {
    if (!/^\d\d:\d\d$/.test(r.start) || !/^\d\d:\d\d$/.test(r.end) || r.start === r.end) return [];
    const a = toMinutes(r.start);
    const b = toMinutes(r.end);
    const parts =
      b > a
        ? [[a, b]]
        : [
            [a, 1440],
            [0, b],
          ];
    return parts.map(([x, y]) => ({
      key: `${r.key}-${x}`,
      left: (x! / 1440) * 100,
      width: ((y! - x!) / 1440) * 100,
      name: r.name,
    }));
  });
  return (
    <div aria-hidden>
      <div className="bg-surface-2 relative h-9 overflow-hidden rounded-lg">
        {segments.map((s, i) => (
          <div
            key={s.key}
            className={cn(
              "absolute inset-y-1 flex items-center justify-center overflow-hidden rounded-md text-xs font-semibold text-white",
              i % 2 ? "bg-ink" : "bg-accent-strong",
            )}
            style={{ left: `${s.left}%`, width: `calc(${s.width}% - 2px)` }}
          >
            <span className="truncate px-1">{s.name}</span>
          </div>
        ))}
      </div>
      <div className="text-muted mt-1 flex justify-between text-[11px] tabular-nums">
        {["12 a. m.", "6 a. m.", "12 p. m.", "6 p. m.", "12 a. m."].map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function Preview() {
  const slots = useTimeSlots();
  const dishes = useDishes();
  const orders = useAllOrders();
  const ratings = useAllDishRatings();
  const now = useNow(60_000);
  const [slotId, setSlotId] = useState(slots[1]?.id ?? slots[0]?.id ?? "");
  const slot = slots.find((s) => s.id === slotId) ?? slots[0] ?? null;
  const at = useMemo(() => {
    const d = new Date(Math.floor(now / 60_000) * 60_000);
    if (slot) {
      const m = slotMidpoint(slot);
      d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    }
    return d;
  }, [now, slot]);
  const recs = useMemo(
    () => recommend({ dishes, slot, now: at, orders, ratings }),
    [dishes, slot, at, orders, ratings],
  );

  return (
    <Panel
      title="Vista previa"
      description="Lo que verá un cliente sin restricciones en cada franja, con el puntaje de cada plato."
    >
      {slots.length > 0 && (
        <Segmented
          label="Franja"
          value={slot?.id ?? ""}
          onChange={setSlotId}
          options={slots.map((s) => ({
            value: s.id,
            label: s.name,
            hint: `${formatClock(s.start)}`,
          }))}
        />
      )}
      <h3 className="font-display mt-5 text-xl font-semibold">{slotHeadline(slot)}</h3>
      {recs.length === 0 ? (
        <p className="text-muted mt-2 text-[15px]">No hay platos para recomendar en esta franja.</p>
      ) : (
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recs.map((r, i) => {
            const { min } = priceRange(r.dish);
            return (
              <li key={r.dish.id} className="border-line flex gap-3 rounded-xl border p-3">
                <span className="font-display text-muted w-5 text-lg font-semibold tabular-nums">
                  {i + 1}
                </span>
                <DishImage
                  src={r.dish.photos[0]}
                  name={r.dish.name}
                  sizes="64px"
                  className="size-16 shrink-0"
                  initialClassName="text-2xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.dish.name}</p>
                  <p className="text-accent-strong text-[13px] font-medium">
                    {REASON_LABEL[r.reason]}
                  </p>
                  <p className="text-muted mt-0.5 text-xs tabular-nums">
                    Puntaje {r.score.toFixed(2).replace(".", ",")} ·{" "}
                    <Price value={min} className="font-normal" />
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
