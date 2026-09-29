"use client";

import {
  ArrowLeft,
  Check,
  CircleAlert,
  Inbox,
  Plus,
  SearchX,
  Send,
  SlidersHorizontal,
  Trash2,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MadeWithPlatterio, PlatterioLogo, RestaurantMark } from "@/components/brand/logos";
import { DemoPanel } from "@/components/demo/demo-panel";
import { DishCard } from "@/components/dish/dish-card";
import { DishImage } from "@/components/dish/dish-image";
import { Viewer3DSlot } from "@/components/dish/viewer-3d-slot";
import { AllergenChip } from "@/components/ui/allergen";
import { Button, buttonClasses, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, FilterChip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { DishCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Spice } from "@/components/ui/spice";
import { RatingSummary, StarInput, Stars } from "@/components/ui/stars";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { restaurantActions, useDishes, useHydrated, useRestaurant } from "@/lib/data";
import { ALLERGENS, ORDER_STATUSES, type Allergen, type SpiceLevel } from "@/lib/domain/types";
import { formatElapsed } from "@/lib/domain/format";
import { strongVariant } from "@/lib/domain/color";
import { cn } from "@/lib/cn";

const ACCENTS = [
  { name: "Fogón 27", hex: "#E4572E" },
  { name: "Verde huerta", hex: "#2F7A4F" },
  { name: "Azul puerto", hex: "#2D5FA3" },
  { name: "Mostaza", hex: "#D69A1E" },
  { name: "Vino", hex: "#8C2F4B" },
];

const TOKENS = [
  ["--bg", "Fondo"],
  ["--surface", "Tarjetas"],
  ["--surface-2", "Relleno suave"],
  ["--ink", "Texto"],
  ["--muted", "Secundario"],
  ["--line", "Bordes"],
  ["--accent", "Acento"],
  ["--accent-strong", "Acento AA"],
  ["--success", "Éxito"],
  ["--warning", "Atención"],
  ["--danger", "Peligro"],
] as const;

export function Showcase() {
  const hydrated = useHydrated();
  const restaurant = useRestaurant();
  const dishes = useDishes();
  const [chips, setChips] = useState<Allergen[]>(["lacteos"]);
  const [qty, setQty] = useState(2);
  const [stars, setStars] = useState(0);
  const [variant, setVariant] = useState<"sencilla" | "doble">("sencilla");
  const [notify, setNotify] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [alias, setAlias] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const clasica = dishes.find((d) => d.id === "clasica-27");
  const diabla = dishes.find((d) => d.id === "la-diabla");
  const aliasError =
    submitted && !alias.trim() ? "Escribe cómo te llamamos en el pedido" : undefined;

  return (
    <div className="min-h-dvh">
      <header className="border-line bg-bg/85 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={buttonClasses({ variant: "ghost", size: "sm", className: "-ml-2" })}
            >
              <ArrowLeft aria-hidden /> Hub
            </Link>
            <span className="text-line-strong" aria-hidden>
              /
            </span>
            <span className="text-sm font-medium">Componentes</span>
          </div>
          <PlatterioLogo className="scale-90" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <div className="py-10">
          <p className="text-accent-strong mb-3 text-xs font-semibold tracking-[0.16em] uppercase">
            Sistema visual
          </p>
          <h1 className="font-display text-[40px] leading-[1.05] font-semibold tracking-tight sm:text-5xl">
            Muestra de componentes
          </h1>
          <p className="text-ink-soft mt-4 max-w-2xl text-[17px] leading-relaxed">
            Las piezas con las que se arman las cuatro vistas. Todo sale de los tokens: cambia el
            acento del restaurante y mira cómo se adapta.
          </p>
        </div>

        <Section
          title="Marca y acento"
          note="El acento es por restaurante y se guarda para todas las pestañas."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col gap-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <RestaurantMark name={restaurant.name} className="text-lg" />
                <MadeWithPlatterio />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Color de acento</p>
                <div
                  className="flex flex-wrap gap-2"
                  role="radiogroup"
                  aria-label="Color de acento"
                >
                  {ACCENTS.map((a) => {
                    const active = hydrated && restaurant.accentColor.toUpperCase() === a.hex;
                    return (
                      <button
                        key={a.hex}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => restaurantActions.setAccentColor(a.hex)}
                        className={cn(
                          "flex h-11 items-center gap-2 rounded-full border pr-3.5 pl-1.5 text-sm font-medium transition",
                          active
                            ? "border-ink bg-surface-2"
                            : "border-line-strong hover:border-ink/40",
                        )}
                      >
                        <span
                          className="flex size-8 items-center justify-center rounded-full"
                          style={{ background: a.hex }}
                        >
                          {active && <Check className="size-4 text-white" aria-hidden />}
                        </span>
                        {a.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-muted mt-2 text-[13px]">
                  Para texto y botones se usa una versión más oscura (
                  {hydrated ? strongVariant(restaurant.accentColor) : "…"}) que cumple contraste AA.
                </p>
              </div>
            </Card>
            <Card className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-4">
              {TOKENS.map(([token, label]) => (
                <div key={token}>
                  <div
                    className="border-line h-12 rounded-lg border"
                    style={{ background: `var(${token})` }}
                  />
                  <p className="mt-1.5 text-xs font-medium">{label}</p>
                  <p className="text-muted font-mono text-[11px]">{token}</p>
                </div>
              ))}
            </Card>
          </div>
        </Section>

        <Section
          title="Tipografía"
          note="Fraunces para títulos editoriales, Inter para la interfaz y cifras tabulares en precios."
        >
          <Card className="grid gap-6 p-6 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="font-display text-[44px] leading-[1.02] font-semibold tracking-tight">
                Clásica 27
              </p>
              <p className="font-display text-ink-soft mt-2 text-2xl font-medium">
                Para el almuerzo
              </p>
              <p className="text-muted mt-3 max-w-md text-[15px] leading-relaxed">
                Nuestra hamburguesa de siempre: carne de res a la parrilla, cheddar fundido y
                cebolla caramelizada en pan brioche.
              </p>
            </div>
            <div className="border-line flex flex-col justify-center gap-3 border-t pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
              {[22900, 29900, 7500, 124800].map((v) => (
                <div
                  key={v}
                  className="border-line flex items-baseline justify-between border-b border-dashed pb-2 last:border-0"
                >
                  <span className="text-muted text-sm">Precio</span>
                  <Price value={v} className="text-xl" />
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section
          title="Botones"
          note="Zona táctil mínima de 44 px. Nada de apariencia por defecto."
        >
          <Card className="flex flex-col gap-5 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() =>
                  toast.success("Agregado al pedido", { description: "Clásica 27 · Doble" })
                }
              >
                <Plus aria-hidden /> Agregar al pedido
              </Button>
              <Button variant="secondary">Ver ticket</Button>
              <Button variant="ghost">Omitir por ahora</Button>
              <Button variant="ink">Confirmar</Button>
              <Button variant="danger">
                <Trash2 aria-hidden /> Rechazar
              </Button>
              <Button disabled>
                <Send aria-hidden /> Enviar pedido
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">
                Enviar a la cocina · <Price value={52700} />
              </Button>
              <Button size="sm" variant="secondary">
                Pequeño (admin)
              </Button>
              <IconButton label="Filtros" variant="secondary">
                <SlidersHorizontal aria-hidden />
              </IconButton>
              <IconButton label="Quitar">
                <Trash2 aria-hidden />
              </IconButton>
            </div>
          </Card>
        </Section>

        <Section
          title="Alérgenos, picante y calificación"
          note="Siempre con ícono y texto; el conflicto con el cliente se marca en rojo y con aviso."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap gap-1.5">
                {ALLERGENS.map((a) => (
                  <AllergenChip key={a} allergen={a} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <AllergenChip allergen="lacteos" alert />
                <AllergenChip allergen="gluten" size="sm" />
                <AllergenChip allergen="huevo" size="sm" alert />
              </div>
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              {([0, 1, 2, 3] as SpiceLevel[]).map((l) => (
                <div key={l} className="flex items-center justify-between">
                  <Spice level={l} showEmpty withLabel />
                  <Spice level={l} />
                </div>
              ))}
              <div className="border-line mt-2 flex flex-wrap items-center gap-4 border-t pt-4">
                <RatingSummary average={4.64} count={128} />
                <RatingSummary average={4.2} count={9} compact />
                <RatingSummary average={null} count={0} />
                <Stars value={4} />
              </div>
            </Card>
          </div>
        </Section>

        <Section
          title="Filtros y controles"
          note="Chips combinables, control segmentado, cantidad, interruptor y estrellas."
        >
          <Card className="flex flex-col gap-6 p-5">
            <div>
              <p className="mb-2 text-sm font-medium">Sin estos alérgenos</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {ALLERGENS.map((a) => (
                  <FilterChip
                    key={a}
                    selected={chips.includes(a)}
                    onClick={() =>
                      setChips((c) => (c.includes(a) ? c.filter((x) => x !== a) : [...c, a]))
                    }
                  >
                    {chips.includes(a) && <Check aria-hidden />}
                    Sin{" "}
                    {a === "lacteos"
                      ? "lácteos"
                      : a === "frutos_secos"
                        ? "frutos secos"
                        : a === "mani"
                          ? "maní"
                          : a}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Segmented
                label="Variante"
                value={variant}
                onChange={setVariant}
                options={[
                  { value: "sencilla", label: "Sencilla", hint: "$22.900" },
                  { value: "doble", label: "Doble", hint: "+$7.000" },
                ]}
              />
              <div className="flex items-center justify-between gap-4">
                <QtyStepper value={qty} onChange={setQty} />
                <Price value={(variant === "doble" ? 29900 : 22900) * qty} className="text-xl" />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Switch
                checked={notify}
                onChange={setNotify}
                label="Sonido suave al llegar un pedido"
                description="Solo en la vista del mesero"
              />
              <StarInput value={stars} onChange={setStars} label="Califica el servicio" />
            </div>
          </Card>
        </Section>

        <Section
          title="Formularios"
          note="Etiquetas visibles y errores claros, conectados para lectores de pantalla."
        >
          <Card className="grid gap-5 p-5 md:grid-cols-2">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
                if (alias.trim())
                  toast.success(`¡Hola, ${alias.trim()}!`, {
                    description: "Ya estás en la Mesa 3.",
                  });
              }}
            >
              <Field
                label="¿Cómo te llamamos?"
                hint="Así sabrán qué pidió cada quien"
                error={aliasError}
              >
                {(p) => (
                  <Input
                    {...p}
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Ana"
                    maxLength={16}
                  />
                )}
              </Field>
              <Button type="submit">Entrar a la mesa</Button>
            </form>
            <Field
              label="Nota para la cocina"
              optional
              hint="Por ejemplo: sin cebolla, término medio"
            >
              {(p) => <Textarea {...p} placeholder="Sin cebolla, por favor" />}
            </Field>
          </Card>
        </Section>

        <Section title="Estados del pedido" note="Cada estado con ícono y texto.">
          <Card className="flex flex-wrap gap-2 p-5">
            {ORDER_STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
            <Badge tone="warning">
              <CircleAlert aria-hidden /> Sin confirmar · {formatElapsed(214_000)}
            </Badge>
          </Card>
        </Section>

        <Section
          title="Platos"
          note="Foto con respaldo elegante: si falta la imagen, degradado con la inicial. Nunca una imagen rota."
        >
          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <Card className="divide-line divide-y px-5">
              {hydrated && clasica && diabla ? (
                <>
                  <DishCard
                    dish={clasica}
                    rating={{ average: 4.7, count: 132 }}
                    restrictions={["lacteos"]}
                  />
                  <DishCard dish={diabla} rating={{ average: 4.4, count: 58 }} />
                </>
              ) : (
                <>
                  <DishCardSkeleton />
                  <DishCardSkeleton />
                </>
              )}
            </Card>
            <Card className="overflow-hidden">
              <div className="relative">
                <DishImage
                  src="/platos/clasica-27.jpg"
                  name="Clásica 27"
                  sizes="(min-width: 768px) 480px, 100vw"
                  className="aspect-[4/3] w-full"
                  rounded="rounded-none"
                  initialClassName="text-7xl"
                />
                <div className="absolute right-3 bottom-3">
                  <Viewer3DSlot
                    model={clasica?.model3d ?? { fileName: "clasica-27.glb", sizeBytes: 1 }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 p-4">
                {["Brasa BBQ", "Salchipapa 27", "Limonada de coco", "Brownie con helado"].map(
                  (n) => (
                    <DishImage key={n} name={n} sizes="96px" className="aspect-square" />
                  ),
                )}
              </div>
            </Card>
          </div>
        </Section>

        <Section
          title="Estados de lista"
          note="Cargando, vacío, sin resultados y error: todos diseñados."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="px-5 py-2">
              <p className="text-muted pt-3 text-xs font-semibold tracking-wide uppercase">
                Cargando
              </p>
              <DishCardSkeleton />
              <Skeleton className="mb-4 h-4 w-2/3" />
            </Card>
            <Card>
              <EmptyState
                icon={Inbox}
                title="Tu mesa aún no ha pedido nada"
                description="Explora la carta y agrega lo que se te antoje."
              />
            </Card>
            <Card>
              <EmptyState
                icon={SearchX}
                title="No hay platos que coincidan con estos filtros"
                action={
                  <Button variant="secondary" size="sm">
                    Limpiar filtros
                  </Button>
                }
              />
            </Card>
            <Card>
              <EmptyState
                tone="danger"
                icon={WifiOff}
                title="No pudimos cargar la carta"
                description="Revisa la conexión e inténtalo otra vez."
                action={
                  <Button variant="secondary" size="sm">
                    Reintentar
                  </Button>
                }
              />
            </Card>
          </div>
        </Section>

        <Section
          title="Capas y avisos"
          note="Hoja inferior, diálogo de confirmación y toasts; nada de alert()."
        >
          <Card className="flex flex-wrap gap-3 p-5">
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Abrir hoja inferior
            </Button>
            <Button variant="secondary" onClick={() => setDialog(true)}>
              Abrir confirmación
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.success("Pedido enviado", {
                  description: "Esperando confirmación del mesero",
                })
              }
            >
              Toast de éxito
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.warning("La Mesa 4 lleva 3 min sin confirmar")}
            >
              Toast de alerta
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.error("No se pudo enviar", { description: "Inténtalo de nuevo" })
              }
            >
              Toast de error
            </Button>
          </Card>
        </Section>

        <Section
          title="Cocina en modo oscuro"
          note="Alto contraste y letra grande para leer a distancia."
        >
          <div className="theme-cocina bg-bg text-ink rounded-2xl p-5">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  mesa: 3,
                  ronda: 1,
                  t: 184_000,
                  items: [
                    ["2×", "Clásica 27", "Doble", "Sin cebolla"],
                    ["1×", "Papas a la francesa", "Grande", ""],
                  ],
                },
                {
                  mesa: 5,
                  ronda: 2,
                  t: 612_000,
                  items: [["1×", "La Diabla", "Sencilla", "Término medio"]],
                },
                {
                  mesa: 1,
                  ronda: 1,
                  t: 1_020_000,
                  items: [
                    ["1×", "Salchipapa 27", "Para compartir", ""],
                    ["2×", "Limonada de coco", "", ""],
                  ],
                },
              ].map((o, i) => (
                <div
                  key={o.mesa}
                  className={cn(
                    "bg-surface rounded-xl border p-4",
                    i === 2 ? "border-danger" : "border-line",
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-display text-3xl font-semibold">Mesa {o.mesa}</p>
                    <p
                      className={cn(
                        "text-lg font-semibold tabular-nums",
                        i === 2 ? "text-danger-ink" : i === 1 ? "text-warning-ink" : "text-muted",
                      )}
                    >
                      {formatElapsed(o.t)}
                    </p>
                  </div>
                  <p className="text-muted text-sm">Ronda {o.ronda}</p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {o.items.map(([q, n, v, note]) => (
                      <li key={n}>
                        <p className="text-lg leading-snug font-semibold">
                          <span className="text-accent tabular-nums">{q}</span> {n}
                        </p>
                        {v && <p className="text-ink-soft text-[15px]">{v}</p>}
                        {note && (
                          <p className="bg-warning-soft text-warning-ink mt-1 inline-block rounded-md px-2 py-0.5 text-[15px] font-semibold">
                            Nota: {note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </main>

      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        title="¿Tienes alguna alergia?"
        description="Te avisamos en la carta y no te recomendamos esos platos. Puedes cambiarlo después."
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setSheet(false)}>
              Omitir
            </Button>
            <Button
              className="flex-[2]"
              onClick={() => {
                setSheet(false);
                toast.success("Listo, lo tendremos en cuenta");
              }}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => (
            <FilterChip
              key={a}
              selected={chips.includes(a)}
              onClick={() =>
                setChips((c) => (c.includes(a) ? c.filter((x) => x !== a) : [...c, a]))
              }
            >
              {chips.includes(a) && <Check aria-hidden />}
              <AllergenLabel a={a} />
            </FilterChip>
          ))}
        </div>
      </Sheet>

      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title="¿Desactivar la Clásica 27?"
        description="Dejará de aparecer en la carta y en los recomendados. Su información se conserva y puedes activarla cuando quieras."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDialog(false);
                toast("Plato desactivado");
              }}
            >
              Desactivar
            </Button>
          </>
        }
      />

      <DemoPanel />
    </div>
  );
}

function AllergenLabel({ a }: { a: Allergen }) {
  const labels: Record<Allergen, string> = {
    gluten: "Gluten",
    lacteos: "Lácteos",
    huevo: "Huevo",
    mani: "Maní",
    frutos_secos: "Frutos secos",
    soya: "Soya",
    mariscos: "Mariscos",
    pescado: "Pescado",
  };
  return <>{labels[a]}</>;
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="border-line border-t py-10">
      <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-8">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="text-muted max-w-md text-sm md:text-right">{note}</p>
      </div>
      {children}
    </section>
  );
}
