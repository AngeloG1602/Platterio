"use client";

import {
  ArrowLeft,
  Box,
  Check,
  Download,
  FlaskConical,
  Gauge,
  Layers,
  RotateCcw,
  Rotate3d,
  Tag,
  Upload,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import { AllergenChip } from "@/components/ui/allergen";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Price } from "@/components/ui/price";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { exportDishGlb } from "@/components/viewer3d/export-glb";
import type { GlbPart } from "@/components/viewer3d/glb-scene";
import type { Quality, QualitySetting } from "@/components/viewer3d/stage";
import { useDishes, useHydrated, useRestaurant } from "@/lib/data";
import { CUSTOMIZATION_SPECS } from "@/lib/data/customization-specs";
import {
  allergenChanges,
  EMPTY_CUSTOMIZATION,
  kitchenLines,
  priceDelta,
  resultingAllergens,
  setSide,
  sideOf,
  summarize,
  type Customization,
} from "@/lib/domain/customization";
import { formatBytes, validateModelFile } from "@/lib/domain/dishForm";
import { formatMoney, formatPriceDelta } from "@/lib/domain/format";
import { type Allergen } from "@/lib/domain/types";
import { coverage, layoutFor, rulesFromNodeNames } from "@/lib/viewer3d/layouts";
import { realModelFor, type RealModel, type RealPartRule } from "@/lib/viewer3d/real-models";
import { buildStack } from "@/lib/viewer3d/stack";
import { cn } from "@/lib/cn";
import { RestrictionsPanel, SelectedCard, SlotRow } from "@/components/viewer3d/customizer-parts";
import { createStatsStore, PerfHud } from "./perf-hud";

// Three.js solo se descarga al abrir el laboratorio, nunca en el resto de la app.
const ViewerLoading = () => (
  <div className="flex h-full items-center justify-center">
    <Skeleton className="size-full rounded-none" />
    <p className="text-muted absolute text-sm font-medium">Cargando el modelo 3D…</p>
  </div>
);
const DishScene = dynamic(() => import("@/components/viewer3d/dish-scene"), {
  ssr: false,
  loading: ViewerLoading,
});
const GlbScene = dynamic(() => import("@/components/viewer3d/glb-scene"), {
  ssr: false,
  loading: ViewerLoading,
});

const SIDE_KEY = "__acompanante";

export function Lab3D() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<"plato" | "glb">("plato");
  const [tried, setTried] = useState<RealModel | null>(null);
  return (
    <div className="bg-bg min-h-dvh">
      <div className="bg-ink text-bg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm sm:px-6">
          <FlaskConical className="size-4" aria-hidden />
          <span className="font-semibold">Laboratorio 3D</span>
          <span className="text-bg/70 hidden sm:inline">
            · prototipo interno, no visible para los clientes
          </span>
          <Link
            href="/demo"
            className="text-bg/85 hover:text-bg ml-auto inline-flex min-h-9 items-center gap-1 rounded-md px-2"
          >
            <ArrowLeft className="size-4" aria-hidden /> Hub
          </Link>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[32px] leading-tight font-semibold sm:text-[40px]">
              Platos en 3D y personalización
            </h1>
            <p className="text-muted mt-1 max-w-2xl text-[15px]">
              Gira el plato, separa sus ingredientes y cámbialos: quitar, pedir extra, reemplazar o
              cambiar el acompañante. Todo recalcula precio, alérgenos y lo que ve la cocina.
            </p>
          </div>
          <Segmented
            label="Modo del laboratorio"
            value={tab}
            onChange={setTab}
            className="w-full sm:w-auto sm:min-w-[340px]"
            options={[
              { value: "plato", label: "Plato del menú" },
              { value: "glb", label: "Probar un .glb" },
            ]}
          />
        </div>
        <div className="mt-6">
          {!hydrated ? (
            <Skeleton className="h-[520px] rounded-2xl" />
          ) : tab === "plato" ? (
            <DishLab tried={tried} onDropTried={() => setTried(null)} />
          ) : (
            <GlbLab
              onTry={(model) => {
                setTried(model);
                setTab("plato");
                // El botón queda abajo; el visor del plato está arriba.
                window.scrollTo({ top: 0 });
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ——— Plato del menú ——— */

function DishLab({
  tried,
  onDropTried,
}: {
  /** Modelo subido en "Probar un .glb" para verlo en su plato. */
  tried: RealModel | null;
  onDropTried: () => void;
}) {
  const dishes = useDishes();
  const [dishId, setDishId] = useState(tried?.dishId ?? CUSTOMIZATION_SPECS[0]!.dishId);
  const spec = CUSTOMIZATION_SPECS.find((s) => s.dishId === dishId)!;
  const dish = dishes.find((d) => d.id === dishId);
  const [variantId, setVariantId] = useState(
    () => dishes.find((d) => d.id === dishId)?.variants[0]?.id ?? "sencilla",
  );
  const [custom, setCustom] = useState<Customization>(EMPTY_CUSTOMIZATION);
  const [explode, setExplode] = useState(0);
  const [labels, setLabels] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [reset, setReset] = useState(0);
  const [restrictions, setRestrictions] = useState<Allergen[]>([]);
  const [quality, setQuality] = useState<QualitySetting>("auto");
  const [modelKind, setModelKind] = useState<"real" | "procedural">("real");
  const realModel = tried?.dishId === dishId ? tried : realModelFor(dishId);
  const usingReal = realModel && modelKind === "real" ? realModel : undefined;
  const [drawing, setDrawing] = useState<Quality>("alta");
  const [showPerf, setShowPerf] = useState(false);
  const [statsStore] = useState(createStatsStore);
  const restaurant = useRestaurant();
  const sceneRef = useRef<THREE.Scene | null>(null);

  const stack = useMemo(() => buildStack(spec, custom, variantId), [spec, custom, variantId]);
  const side = sideOf(spec, custom);
  const basePrice = dish?.variants.find((v) => v.id === variantId)?.price ?? 0;
  const delta = priceDelta(spec, custom, variantId);
  const allergens = resultingAllergens(spec, custom, variantId);
  const originalAllergens = resultingAllergens(spec, EMPTY_CUSTOMIZATION, variantId);
  const changes = allergenChanges(originalAllergens, allergens);
  const lines = kitchenLines(spec, custom, variantId);
  const onSceneReady = useCallback((s: THREE.Scene) => {
    sceneRef.current = s;
  }, []);

  function chooseDish(id: string) {
    setDishId(id);
    setCustom(EMPTY_CUSTOMIZATION);
    setSelected(null);
    setVariantId(dishes.find((d) => d.id === id)?.variants[0]?.id ?? "sencilla");
  }

  const selectedSlot = spec.slots.find((s) => s.key === selected);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Segmented
            label="Plato"
            value={dishId}
            onChange={chooseDish}
            className="w-full sm:w-auto sm:min-w-0 sm:flex-[2]"
            options={CUSTOMIZATION_SPECS.map((s) => ({
              value: s.dishId,
              label: dishes.find((d) => d.id === s.dishId)?.name ?? s.dishId,
            }))}
          />
          <Segmented
            label="Tamaño"
            value={variantId}
            onChange={(v) => {
              setVariantId(v);
              setCustom((c) => ({
                ...c,
                counts: Object.fromEntries(Object.entries(c.counts).filter(([k]) => k !== "carne")),
              }));
            }}
            className="w-full sm:w-auto sm:min-w-0 sm:flex-1"
            options={(dish?.variants ?? []).map((v) => ({
              value: v.id,
              label: v.name,
              hint: formatMoney(v.price),
            }))}
          />
        </div>

        <div className="border-line bg-surface-2 shadow-card relative overflow-hidden rounded-2xl border">
          <div className="aspect-square w-full sm:aspect-[4/3]">
            <DishScene
              stack={stack}
              sideId={side?.id}
              sideName={side?.name}
              explode={explode}
              autoRotate={autoRotate && explode === 0 && !selected}
              showLabels={labels || explode > 0.4}
              selectedKey={selected}
              onSelect={setSelected}
              onSceneReady={onSceneReady}
              resetSignal={reset}
              quality={quality}
              onQualityChange={setDrawing}
              onStats={showPerf ? statsStore.set : undefined}
              brand={restaurant.name}
              realModel={usingReal}
              layout={layoutFor(dishId)}
              accent={restaurant.accentColor}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
            <div className="border-line bg-surface/90 shadow-card pointer-events-auto flex gap-1 rounded-full border p-1 backdrop-blur">
              <IconButton
                label={autoRotate ? "Detener el giro" : "Girar solo"}
                className="size-10"
                onClick={() => setAutoRotate((v) => !v)}
                aria-pressed={autoRotate}
              >
                <Rotate3d aria-hidden className={autoRotate ? "text-accent-strong" : ""} />
              </IconButton>
              <IconButton
                label={labels ? "Ocultar etiquetas" : "Mostrar etiquetas"}
                className="size-10"
                onClick={() => setLabels((v) => !v)}
                aria-pressed={labels}
              >
                <Tag aria-hidden className={labels ? "text-accent-strong" : ""} />
              </IconButton>
              <IconButton
                label="Volver a la vista inicial"
                className="size-10"
                onClick={() => setReset((n) => n + 1)}
              >
                <RotateCcw aria-hidden />
              </IconButton>
              <IconButton
                label={showPerf ? "Ocultar el medidor de rendimiento" : "Ver el rendimiento"}
                className="size-10"
                onClick={() => setShowPerf((v) => !v)}
                aria-pressed={showPerf}
              >
                <Gauge aria-hidden className={showPerf ? "text-accent-strong" : ""} />
              </IconButton>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="bg-surface/90 pointer-events-auto backdrop-blur"
              onClick={async () => {
                if (!sceneRef.current) return;
                try {
                  const size = await exportDishGlb(sceneRef.current, `plantilla-${dishId}.glb`);
                  toast.success("Plantilla .glb descargada", {
                    description: `${formatBytes(size)} · un nodo por ingrediente`,
                  });
                } catch {
                  toast.error("No se pudo exportar el modelo");
                }
              }}
            >
              <Download aria-hidden /> Plantilla .glb
            </Button>
          </div>

          {showPerf && (
            <div className="pointer-events-none absolute top-[4.25rem] left-3">
              <PerfHud store={statsStore} quality={drawing} setting={quality} />
            </div>
          )}

          <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2">
            {selectedSlot && (
              <SelectedCard
                spec={spec}
                slot={selectedSlot}
                custom={custom}
                variantId={variantId}
                onChange={setCustom}
                onClose={() => setSelected(null)}
              />
            )}
            {selected === SIDE_KEY && side && (
              <div className="border-line bg-surface/95 shadow-float rounded-xl border p-3 backdrop-blur">
                <p className="text-sm font-semibold">{side.name}</p>
                <p className="text-muted text-[13px]">Cámbialo en “Acompañante”.</p>
              </div>
            )}
            <label className="border-line bg-surface/90 shadow-card flex items-center gap-3 rounded-full border px-4 py-2 backdrop-blur">
              <Layers className="text-accent-strong size-4 shrink-0" aria-hidden />
              <span className="shrink-0 text-sm font-semibold">Separar ingredientes</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(explode * 100)}
                onChange={(e) => setExplode(Number(e.target.value) / 100)}
                className="h-11 w-full accent-[var(--accent-strong)]"
                aria-label="Separar ingredientes"
              />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-muted text-[13px] sm:max-w-md">
            Arrastra para girar · rueda o dos dedos para acercar · toca un ingrediente para ver sus
            opciones.{" "}
            {usingReal && !usingReal.credit ? (
              <>
                Modelo subido: {usingReal.fileName}. Lo que no trae se dibuja con código.{" "}
                <button
                  type="button"
                  onClick={onDropTried}
                  className="text-accent-strong font-medium underline underline-offset-2"
                >
                  Quitar
                </button>
              </>
            ) : usingReal?.credit ? (
              <>
                Modelo real: “{usingReal.credit.title}” de {usingReal.credit.author} (
                {usingReal.credit.source}), licencia{" "}
                <a
                  href={usingReal.credit.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-strong font-medium underline underline-offset-2"
                >
                  {usingReal.credit.license}
                </a>
                . Lo que el modelo no trae (reemplazos y adicionales) se dibuja con código.
              </>
            ) : (
              "El modelo es procedural (hecho con código); con un modelo real se ve igual de interactivo, ver la propuesta."
            )}
          </p>
          <div className="flex shrink-0 flex-col gap-3">
            {realModel && (
              <div className="flex flex-col gap-1">
                <span className="text-muted text-xs font-semibold" aria-hidden>
                  Modelo 3D
                </span>
                <Segmented
                  label="Modelo 3D"
                  value={modelKind}
                  onChange={setModelKind}
                  options={[
                    { value: "real", label: "Real" },
                    { value: "procedural", label: "Hecho con código" },
                  ]}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-muted text-xs font-semibold" aria-hidden>
                Calidad del visor
              </span>
              <Segmented
                label="Calidad del visor"
                value={quality}
                onChange={setQuality}
                options={[
                  { value: "auto", label: "Automática" },
                  { value: "alta", label: "Alta" },
                  { value: "rapida", label: "Rápida" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <RestrictionsPanel
          spec={spec}
          custom={custom}
          variantId={variantId}
          restrictions={restrictions}
          onRestrictions={setRestrictions}
          onApply={(c) => setCustom(c)}
        />
        <section
          className="border-line bg-surface shadow-card rounded-2xl border p-4"
          aria-labelledby="ing"
        >
          <div className="flex items-center justify-between">
            <h2 id="ing" className="text-lg font-semibold">
              Ingredientes
            </h2>
            <Button
              variant="ghost"
              size="sm"
              disabled={custom === EMPTY_CUSTOMIZATION}
              onClick={() => setCustom(EMPTY_CUSTOMIZATION)}
            >
              <RotateCcw aria-hidden /> Como viene
            </Button>
          </div>
          <ul className="divide-line mt-2 divide-y">
            {spec.slots
              .filter((s) => s.included)
              .map((slot) => (
                <SlotRow
                  key={slot.key}
                  spec={spec}
                  slot={slot}
                  custom={custom}
                  variantId={variantId}
                  restrictions={restrictions}
                  selected={selected === slot.key}
                  onSelect={() => setSelected(slot.key)}
                  onChange={setCustom}
                />
              ))}
          </ul>
          <h3 className="mt-4 text-[15px] font-semibold">Agregar</h3>
          <ul className="divide-line mt-1 divide-y">
            {spec.slots
              .filter((s) => !s.included)
              .map((slot) => (
                <SlotRow
                  key={slot.key}
                  spec={spec}
                  slot={slot}
                  custom={custom}
                  variantId={variantId}
                  restrictions={restrictions}
                  selected={selected === slot.key}
                  onSelect={() => setSelected(slot.key)}
                  onChange={setCustom}
                />
              ))}
          </ul>
        </section>

        {spec.sides && (
          <section
            className="border-line bg-surface shadow-card rounded-2xl border p-4"
            aria-labelledby="acomp"
          >
            <h2 id="acomp" className="text-lg font-semibold">
              Acompañante
            </h2>
            <div role="radiogroup" aria-labelledby="acomp" className="mt-2 grid grid-cols-2 gap-2">
              {spec.sides.options.map((o) => {
                const active = side?.id === o.id;
                const bad = o.allergens.some((a) => restrictions.includes(a));
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCustom((c) => setSide(spec, c, o.id))}
                    className={cn(
                      "flex min-h-14 flex-col justify-center rounded-xl border px-3 py-2 text-left transition-colors",
                      active
                        ? "border-ink bg-ink text-bg"
                        : "border-line-strong bg-surface hover:border-ink/40",
                    )}
                  >
                    <span className="text-sm font-semibold">{o.name}</span>
                    <span className={cn("text-xs", active ? "text-bg/80" : "text-muted")}>
                      {o.priceDelta ? formatPriceDelta(o.priceDelta) : "Incluido"}
                      {bad && " · tiene tu alérgeno"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="bg-ink text-bg rounded-2xl p-4" aria-labelledby="resumen">
          <h2 id="resumen" className="sr-only">
            Resumen
          </h2>
          <div className="text-bg/80 flex items-baseline justify-between text-sm">
            <span>
              {dish?.name} · {dish?.variants.find((v) => v.id === variantId)?.name}
            </span>
            <Price value={basePrice} />
          </div>
          <div className="text-bg/80 flex items-baseline justify-between text-sm">
            <span>Personalización</span>
            <span className="tabular-nums">{delta ? formatPriceDelta(delta) : "$0"}</span>
          </div>
          <div className="border-bg/20 mt-2 flex items-baseline justify-between border-t pt-2">
            <span className="font-semibold">Total</span>
            <Price value={basePrice + delta} className="text-2xl" />
          </div>
          {(changes.removed.length > 0 || changes.added.length > 0) && (
            <p className="text-bg/85 mt-2 text-[13px]">
              {changes.removed.length > 0 && (
                <>Ya no tiene {changes.removed.join(", ").toLowerCase()}. </>
              )}
              {changes.added.length > 0 && (
                <>Ahora tiene {changes.added.join(", ").toLowerCase()}.</>
              )}
            </p>
          )}
          {summarize(spec, custom, variantId) && (
            <p className="text-bg/85 mt-2 text-[13px]">
              En el carrito:{" "}
              <span className="text-bg font-semibold">{summarize(spec, custom, variantId)}</span>
            </p>
          )}
        </section>

        <section
          className="border-line bg-surface shadow-card rounded-2xl border p-4"
          aria-labelledby="alerg"
        >
          <h2 id="alerg" className="text-[15px] font-semibold">
            Alérgenos del plato
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allergens.length ? (
              allergens.map((a) => (
                <AllergenChip key={a} allergen={a} alert={restrictions.includes(a)} size="sm" />
              ))
            ) : (
              <span className="text-muted text-sm">Sin alérgenos declarados</span>
            )}
          </div>
          <h2 className="mt-4 text-[15px] font-semibold">Así llega a la cocina</h2>
          {lines.length === 0 ? (
            <p className="text-muted mt-1 text-sm">Como viene en la carta.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-[#1A1816] p-3 font-mono text-[13px] text-[#F7F3EC]">
              {lines.map((l) => (
                <li
                  key={l}
                  className={cn(
                    l.startsWith("SIN") && "text-[#FEB2B2]",
                    l.startsWith("EXTRA") && "text-[#F6E05E]",
                    l.startsWith("AGREGAR") && "text-[#9AE6B4]",
                  )}
                >
                  {l}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

/* ——— Probar un .glb ——— */

/** Modelo real de ejemplo, ya partido por ingrediente (scripts/modelos/separar-por-huesos.mjs). */
const SAMPLE_MODEL = {
  url: "/modelos/hamburguesa-explosiva.glb",
  name: "Hamburguesa Explosiva Con Queso",
  size: 1_378_176,
  warning: null,
  credit: {
    title: "Hamburguesa Explosiva Con Queso",
    author: "Roberto Domínguez",
    source: "Sketchfab",
  },
};

interface LabFile {
  url: string;
  name: string;
  size: number;
  warning: string | null;
  /** Crédito obligatorio de los modelos con licencia CC BY. */
  credit?: { title: string; author: string; source: string };
}

function GlbLab({ onTry }: { onTry: (model: RealModel) => void }) {
  const [file, setFile] = useState<LabFile | null>(null);
  const [parts, setParts] = useState<GlbPart[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [explode, setExplode] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const onParts = useCallback((p: GlbPart[]) => setParts(p), []);
  function openModel(next: LabFile) {
    if (file?.url.startsWith("blob:")) URL.revokeObjectURL(file.url);
    setHidden([]);
    setParts([]);
    setExplode(0);
    setFile(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="border-line bg-surface-2 shadow-card relative self-start overflow-hidden rounded-2xl border">
        <div className="aspect-square w-full sm:aspect-[4/3]">
          {file ? (
            <GlbScene
              key={file.url}
              url={file.url}
              explode={explode}
              hidden={hidden}
              onParts={onParts}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Box className="text-muted size-10" aria-hidden strokeWidth={1.4} />
              <p className="font-display text-xl font-semibold">Sube un modelo para probarlo</p>
              <p className="text-muted max-w-sm text-sm">
                Un escaneo o un modelo hecho en Blender. Si cada ingrediente es un nodo aparte,
                podrás ocultarlos y separarlos. Prueba con la plantilla que exporta la otra pestaña.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => input.current?.click()}>
                  <Upload aria-hidden /> Elegir archivo .glb
                </Button>
                <Button variant="secondary" onClick={() => openModel(SAMPLE_MODEL)}>
                  <Box aria-hidden /> Ver modelo de ejemplo
                </Button>
              </div>
            </div>
          )}
        </div>
        {file && (
          <label className="border-line bg-surface/90 shadow-card absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-full border px-4 py-2 backdrop-blur">
            <Layers className="text-accent-strong size-4 shrink-0" aria-hidden />
            <span className="shrink-0 text-sm font-semibold">Separar partes</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(explode * 100)}
              onChange={(e) => setExplode(Number(e.target.value) / 100)}
              className="h-11 w-full accent-[var(--accent-strong)]"
              aria-label="Separar partes"
            />
          </label>
        )}
        <input
          ref={input}
          type="file"
          accept=".glb,model/gltf-binary"
          className="sr-only"
          aria-label="Elegir archivo .glb"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (!/\.glb$/i.test(f.name)) return toast.error("Solo archivos .glb");
            openModel({
              url: URL.createObjectURL(f),
              name: f.name,
              size: f.size,
              warning: validateModelFile({ name: f.name, size: f.size }),
            });
          }}
        />
      </div>

      <aside className="flex flex-col gap-4">
        <section className="border-line bg-surface shadow-card rounded-2xl border p-4">
          <h2 className="text-lg font-semibold">Archivo</h2>
          {file ? (
            <>
              <p className="mt-1 text-[15px] font-medium break-all">{file.name}</p>
              <p className="text-muted text-sm">{formatBytes(file.size)}</p>
              {file.warning && (
                <Badge tone="warning" className="mt-2">
                  Pasa de 4 MB: hay que comprimirlo para el menú
                </Badge>
              )}
              {file.credit && (
                <p className="text-muted mt-2 text-[13px]">
                  Modelo: “{file.credit.title}” de {file.credit.author} ({file.credit.source}),
                  licencia{" "}
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/deed.es"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-strong font-medium underline underline-offset-2"
                  >
                    CC BY 4.0
                  </a>
                  . Partido por ingrediente y comprimido para la web.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
                  <Upload aria-hidden /> Cambiar archivo
                </Button>
                {file.url !== SAMPLE_MODEL.url && (
                  <Button variant="ghost" size="sm" onClick={() => openModel(SAMPLE_MODEL)}>
                    <Box aria-hidden /> Modelo de ejemplo
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted mt-1 text-sm">
              Aún no has subido un modelo. El archivo no sale de tu navegador.
            </p>
          )}
        </section>
        <section
          className="border-line bg-surface shadow-card rounded-2xl border p-4"
          aria-labelledby="partes"
        >
          <h2 id="partes" className="text-lg font-semibold">
            Partes del modelo
          </h2>
          <p className="text-muted text-[13px]">
            De abajo hacia arriba. Cada parte debería ser un ingrediente (pan_base, carne_1,
            queso_1…).
          </p>
          {parts.length === 0 ? (
            <p className="text-muted mt-2 text-sm">{file ? "Leyendo el modelo…" : "—"}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {parts.map((p) => (
                <li key={p.name}>
                  <Switch
                    checked={!hidden.includes(p.name)}
                    onChange={(on) =>
                      setHidden((h) => (on ? h.filter((x) => x !== p.name) : [...h, p.name]))
                    }
                    label={p.name}
                    description={`${p.meshes} ${p.meshes === 1 ? "malla" : "mallas"} · ${p.triangles.toLocaleString("es-CO")} triángulos`}
                  />
                </li>
              ))}
            </ul>
          )}
          {parts.length === 1 && (
            <p className="bg-warning-soft text-warning-ink mt-2 rounded-lg px-3 py-2 text-[13px] font-medium">
              Este modelo es una sola pieza: para separar ingredientes hay que cortarlo en partes
              (ver la propuesta).
            </p>
          )}
        </section>
        {file && parts.length > 0 && (
          <UseInDish
            names={parts.map((p) => p.name)}
            onTry={(dishId, rules) => onTry({ dishId, url: file.url, rules, fileName: file.name })}
          />
        )}
        <p className="text-muted px-1 text-[13px]">
          Cómo preparar los modelos:{" "}
          <code className="bg-surface-2 rounded px-1">docs/3d/PROPUESTA.md</code> en el repositorio.
        </p>
      </aside>
    </div>
  );
}

/**
 * Valida un modelo contra un plato del menú con la convención de nombres (carne, carne@pollo,
 * pan_base…): qué ingredientes y opciones trae como pieza real y qué nodos no reconoce. Si
 * cubre algo, se puede probar de una vez en el personalizador.
 */
function UseInDish({
  names,
  onTry,
}: {
  names: string[];
  onTry: (dishId: string, rules: RealPartRule[]) => void;
}) {
  const dishes = useDishes();
  const [dishId, setDishId] = useState(CUSTOMIZATION_SPECS[0]!.dishId);
  const spec = CUSTOMIZATION_SPECS.find((s) => s.dishId === dishId)!;
  const { rules, unknown } = rulesFromNodeNames(names, spec);
  const rows = coverage(spec, rules);
  const covered = rows.reduce((n, r) => n + r.options.filter((o) => o.covered).length, 0);
  const total = rows.reduce((n, r) => n + r.options.length, 0);

  return (
    <section
      className="border-line bg-surface shadow-card rounded-2xl border p-4"
      aria-labelledby="usar"
    >
      <h2 id="usar" className="text-lg font-semibold">
        Usar en un plato
      </h2>
      <p className="text-muted text-[13px]">
        Las partes se reconocen por su nombre: <code>carne</code>, <code>carne@pollo</code>,{" "}
        <code>pan_base</code>… Lo que falte se dibuja con código.
      </p>
      <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
        Plato
        <select
          value={dishId}
          onChange={(e) => setDishId(e.target.value)}
          className="border-line bg-surface h-11 rounded-xl border px-3 text-[15px] font-medium"
        >
          {CUSTOMIZATION_SPECS.map((s) => (
            <option key={s.dishId} value={s.dishId}>
              {dishes.find((d) => d.id === s.dishId)?.name ?? s.dishId}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-3 text-sm font-semibold">
        {covered} de {total} opciones con pieza real
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.slot} className="text-sm">
            <span className="font-medium">{r.name}</span>
            <span className="mt-1 flex flex-wrap gap-1">
              {r.options.map((o) => (
                <Badge key={o.id ?? "base"} tone={o.covered ? "success" : "neutral"}>
                  {o.covered ? <Check className="size-3" aria-hidden /> : null}
                  {o.name}
                  <span className="sr-only">{o.covered ? ": pieza real" : ": con código"}</span>
                </Badge>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {unknown.length > 0 && (
        <p className="bg-warning-soft text-warning-ink mt-3 rounded-lg px-3 py-2 text-[13px] font-medium">
          No se reconocen: {unknown.join(", ")}. Renómbralos con la convención o no se usarán.
        </p>
      )}
      <Button
        className="mt-3 w-full"
        disabled={rules.length === 0}
        onClick={() => onTry(dishId, rules)}
      >
        <Box aria-hidden /> Probar en el personalizador
      </Button>
    </section>
  );
}
