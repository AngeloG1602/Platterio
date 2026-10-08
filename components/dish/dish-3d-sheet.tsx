"use client";

import { Layers, Rotate3d, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ModelCredit } from "./model-credit";
import { SelectedCard, SlotRow } from "@/components/viewer3d/customizer-parts";
import { Button, IconButton } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useRestaurant } from "@/lib/data";
import { RestrictionsAdapt } from "@/components/viewer3d/customizer-parts";
import {
  EMPTY_CUSTOMIZATION,
  priceDelta,
  setSide,
  sideOf,
  type Customization,
  type DishCustomizationSpec,
} from "@/lib/domain/customization";
import { formatPriceDelta } from "@/lib/domain/format";
import type { Allergen, Dish } from "@/lib/domain/types";
import { t } from "@/lib/i18n";
import { layoutFor } from "@/lib/viewer3d/layouts";
import { realModelFor } from "@/lib/viewer3d/real-models";
import { buildStack } from "@/lib/viewer3d/stack";
import { cn } from "@/lib/cn";

// Three.js solo se descarga cuando el cliente abre el visor.
const DishScene = dynamic(() => import("@/components/viewer3d/dish-scene"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full">
      <Skeleton className="size-full rounded-none" />
      <p className="text-muted absolute inset-0 flex items-center justify-center text-sm font-medium">
        {t("Cargando el modelo 3D…")}
      </p>
    </div>
  ),
});

const isAsServed = (c: Customization) =>
  !c.side && Object.keys(c.counts).length === 0 && Object.keys(c.replaced).length === 0;

/**
 * Visor 3D de la ficha del plato: gira, separa los ingredientes y personaliza (quitar, extra,
 * reemplazar, acompañante). Las elecciones viven en la ficha; aquí solo se editan.
 */
export function Dish3DSheet({
  dish,
  spec,
  variantId,
  custom,
  onChange,
  restrictions,
  onClose,
}: {
  dish: Dish;
  spec: DishCustomizationSpec;
  variantId: string;
  custom: Customization;
  onChange: (c: Customization) => void;
  restrictions: Allergen[];
  onClose: () => void;
}) {
  const restaurant = useRestaurant();
  const [explode, setExplode] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [reset, setReset] = useState(0);
  const [autoRotate, setAutoRotate] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const stack = useMemo(() => buildStack(spec, custom, variantId), [spec, custom, variantId]);
  const side = sideOf(spec, custom);
  const realModel = realModelFor(dish.id);
  const delta = priceDelta(spec, custom, variantId);
  const base = dish.variants.find((v) => v.id === variantId)?.price ?? 0;
  const selectedSlot = spec.slots.find((s) => s.key === selected);

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("Personaliza tu {dish}", { dish: dish.name })}
      description={t("Gira el plato, sepáralo y cámbialo a tu gusto. El precio se actualiza solo.")}
      footer={
        <Button block size="lg" onClick={onClose}>
          {t("Listo")} · <Price value={base + delta} />
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pb-3">
        <div className="border-line bg-surface-2 relative overflow-hidden rounded-2xl border">
          <div className="aspect-square w-full">
            <DishScene
              stack={stack}
              sideId={side?.id}
              sideName={side?.name}
              explode={explode}
              autoRotate={autoRotate && explode === 0 && !selected}
              showLabels={explode > 0.4}
              selectedKey={selected}
              onSelect={setSelected}
              resetSignal={reset}
              quality="auto"
              brand={restaurant.name}
              realModel={realModel}
              layout={layoutFor(dish.id)}
              accent={restaurant.accentColor}
            />
          </div>
          <div className="border-line bg-surface/90 absolute top-3 left-3 flex gap-1 rounded-full border p-1 backdrop-blur">
            <IconButton
              label={autoRotate ? t("Detener el giro") : t("Girar solo")}
              className="size-10"
              aria-pressed={autoRotate}
              onClick={() => setAutoRotate((v) => !v)}
            >
              <Rotate3d aria-hidden className={autoRotate ? "text-accent-strong" : ""} />
            </IconButton>
            <IconButton
              label={t("Volver a la vista inicial")}
              className="size-10"
              onClick={() => setReset((n) => n + 1)}
            >
              <RotateCcw aria-hidden />
            </IconButton>
          </div>
          <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2">
            {selectedSlot && (
              <SelectedCard
                spec={spec}
                slot={selectedSlot}
                custom={custom}
                variantId={variantId}
                onChange={onChange}
                onClose={() => setSelected(null)}
              />
            )}
            <label className="border-line bg-surface/90 shadow-card flex items-center gap-3 rounded-full border px-4 py-1 backdrop-blur">
              <Layers className="text-accent-strong size-4 shrink-0" aria-hidden />
              <span className="shrink-0 text-sm font-semibold">{t("Separar ingredientes")}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(explode * 100)}
                onChange={(e) => setExplode(Number(e.target.value) / 100)}
                className="h-11 w-full accent-[var(--accent-strong)]"
                aria-label={t("Separar ingredientes")}
              />
            </label>
          </div>
        </div>
        <p className="text-muted -mt-2 text-[13px]">
          {t(
            "Arrastra para girar · dos dedos para acercar · toca un ingrediente para ver sus opciones.",
          )}
        </p>
        {realModel?.credit && <ModelCredit credit={realModel.credit} />}

        {restrictions.length > 0 && (
          <RestrictionsAdapt
            spec={spec}
            custom={custom}
            variantId={variantId}
            restrictions={restrictions}
            onApply={onChange}
          />
        )}

        <section aria-labelledby="ing3d">
          <div className="flex items-center justify-between">
            <h2 id="ing3d" className="text-[17px] font-semibold">
              {t("Ingredientes")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              disabled={isAsServed(custom)}
              onClick={() => onChange(EMPTY_CUSTOMIZATION)}
            >
              <RotateCcw aria-hidden /> {t("Como viene")}
            </Button>
          </div>
          <ul className="divide-line mt-1 divide-y">
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
                  onChange={onChange}
                />
              ))}
          </ul>
          <h3 className="mt-4 text-[15px] font-semibold">{t("Agregar")}</h3>
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
                  onChange={onChange}
                />
              ))}
          </ul>
        </section>

        {spec.sides && (
          <section aria-labelledby="acomp3d">
            <h2 id="acomp3d" className="text-[17px] font-semibold">
              {t("Acompañante")}
            </h2>
            <div
              role="radiogroup"
              aria-labelledby="acomp3d"
              className="mt-2 grid grid-cols-2 gap-2"
            >
              {spec.sides.options.map((o) => {
                const active = side?.id === o.id;
                const bad = o.allergens.some((a) => restrictions.includes(a));
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(setSide(spec, custom, o.id))}
                    className={cn(
                      "flex min-h-14 flex-col justify-center rounded-xl border px-3 py-2 text-left transition-colors",
                      active
                        ? "border-ink bg-ink text-bg"
                        : "border-line-strong bg-surface hover:border-ink/40",
                    )}
                  >
                    <span className="text-sm font-semibold">{t(o.name)}</span>
                    <span className={cn("text-xs", active ? "text-bg/80" : "text-muted")}>
                      {o.priceDelta ? formatPriceDelta(o.priceDelta) : t("Incluido")}
                      {bad && ` · ${t("tiene tu alérgeno")}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}
