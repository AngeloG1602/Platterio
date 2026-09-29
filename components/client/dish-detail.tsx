"use client";

import { ArrowLeft, Plus, TriangleAlert, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DishImage } from "@/components/dish/dish-image";
import { Viewer3DSlot } from "@/components/dish/viewer-3d-slot";
import { AllergenChip, AllergenList } from "@/components/ui/allergen";
import { Button, buttonClasses, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Textarea } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Spice } from "@/components/ui/spice";
import { RatingSummary } from "@/components/ui/stars";
import { toast } from "@/components/ui/toaster";
import { cartActions, useCategories, useDevice, useDish, useDishRatingStats } from "@/lib/data";
import { ALLERGEN_LABEL, conflictingAllergens, dishAllergens } from "@/lib/domain/allergens";
import { formatCOP, plural } from "@/lib/domain/format";
import type { Dish } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { ClientShell } from "./client-shell";
import { useTableActivity } from "./table-activity";
import { TableGate, type TableContext } from "./table-gate";

const NOTE_MAX = 140;

export function DishDetailScreen({ numero, dishId }: { numero: string; dishId: string }) {
  return (
    <ClientShell>
      <TableGate numero={numero} fallback={<DishSkeleton />}>
        {(ctx) => <DishDetail ctx={ctx} dishId={dishId} />}
      </TableGate>
    </ClientShell>
  );
}

function useBack(fallback: string) {
  const router = useRouter();
  return () => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  };
}

function DishDetail({ ctx, dishId }: { ctx: TableContext; dishId: string }) {
  useTableActivity(ctx);
  const dish = useDish(dishId);
  const menuHref = `${ctx.base}/menu`;
  const back = useBack(menuHref);

  if (!dish || !dish.active) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Este plato ya no está disponible"
        description="Puede que se haya agotado o que la carta haya cambiado."
        action={
          <Link href={menuHref} className={buttonClasses({ variant: "secondary" })}>
            Volver a la carta
          </Link>
        }
        className="my-auto"
      />
    );
  }
  return <DishContent key={dish.id} dish={dish} ctx={ctx} onBack={back} />;
}

function DishContent({ dish, ctx, onBack }: { dish: Dish; ctx: TableContext; onBack: () => void }) {
  const categories = useCategories();
  const stats = useDishRatingStats().get(dish.id);
  const { restrictions } = useDevice();
  const [variantId, setVariantId] = useState(dish.variants[0]!.id);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const variant = dish.variants.find((v) => v.id === variantId) ?? dish.variants[0]!;
  const base = Math.min(...dish.variants.map((v) => v.price));
  const conflicts = conflictingAllergens(dish, restrictions);
  const category = categories.find((c) => c.id === dish.categoryId);

  function add() {
    const result = cartActions.add(ctx.table.id, { dishId: dish.id, variantId, qty, note });
    if (!result.ok) {
      toast.error("No se pudo agregar", { description: result.error });
      return;
    }
    const variantText = dish.variants.length > 1 ? ` · ${variant.name}` : "";
    toast.success("Agregado al pedido de la mesa", {
      description: `${qty}× ${dish.name}${variantText}. Llevas ${plural(result.count ?? qty, "plato", "platos")}.`,
    });
    onBack();
  }

  return (
    <>
      <Gallery dish={dish} onBack={onBack} />

      <div className="bg-bg relative -mt-6 flex-1 rounded-t-3xl px-4 pt-6 pb-32">
        {category && (
          <p className="text-accent-strong text-xs font-semibold tracking-[0.14em] uppercase">
            {category.name}
          </p>
        )}
        <h1 className="font-display mt-1.5 text-[30px] leading-[1.1] font-semibold tracking-tight">
          {dish.name}
        </h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <RatingSummary average={stats?.average ?? null} count={stats?.count ?? 0} />
          <Spice level={dish.spiceLevel} withLabel />
        </div>
        <p className="text-ink-soft mt-4 text-[16px] leading-relaxed">{dish.description}</p>

        {conflicts.length > 0 && (
          <div
            role="alert"
            className="border-danger/25 bg-danger-soft mt-5 flex gap-3 rounded-xl border p-4"
          >
            <TriangleAlert className="text-danger mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="text-danger-ink text-[15px] font-semibold">
                Tiene {conflicts.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(" y ")}
              </p>
              <p className="text-ink-soft mt-0.5 text-sm leading-relaxed">
                Lo marcaste como restricción. Puedes pedirlo igual; si tienes dudas, pregúntale al
                mesero.
              </p>
            </div>
          </div>
        )}

        {dish.variants.length > 1 && (
          <section aria-labelledby="opciones" className="mt-7">
            <h2 id="opciones" className="mb-2.5 text-[15px] font-semibold">
              Elige una opción
            </h2>
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
          </section>
        )}

        <section aria-labelledby="ingredientes" className="mt-7">
          <h2 id="ingredientes" className="text-[15px] font-semibold">
            Ingredientes
          </h2>
          <ul className="divide-line mt-1 divide-y">
            {dish.ingredients.map((ing) => (
              <li key={ing.name} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-ink text-[15px]">{ing.name}</p>
                  {ing.description && (
                    <p className="text-muted mt-0.5 text-[13px]">{ing.description}</p>
                  )}
                </div>
                {ing.allergens.length > 0 && (
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {ing.allergens.map((a) => (
                      <AllergenChip
                        key={a}
                        allergen={a}
                        size="sm"
                        alert={restrictions.includes(a)}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="alergenos" className="bg-surface-2/70 mt-6 rounded-xl p-4">
          <h2 id="alergenos" className="mb-2.5 text-[15px] font-semibold">
            Alérgenos
          </h2>
          <AllergenList allergens={dishAllergens(dish)} restrictions={restrictions} />
        </section>

        <section className="mt-7">
          <Field
            label="Nota para la cocina"
            optional
            hint={`${note.length}/${NOTE_MAX} · Por ejemplo: sin cebolla, salsa aparte`}
          >
            {(p) => (
              <Textarea
                {...p}
                value={note}
                maxLength={NOTE_MAX}
                onChange={(e) => setNote(e.target.value)}
                placeholder="¿Algún cambio?"
                rows={2}
                className="min-h-20"
              />
            )}
          </Field>
        </section>
      </div>

      <div className="border-line bg-surface/95 pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t px-4 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <QtyStepper value={qty} onChange={setQty} />
          <Button size="lg" className="flex-1" onClick={add}>
            <Plus aria-hidden /> Agregar · <Price value={variant.price * qty} />
          </Button>
        </div>
      </div>
    </>
  );
}

function Gallery({ dish, onBack }: { dish: Dish; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const photos = dish.photos.length > 0 ? dish.photos : [undefined];
  return (
    <div className="relative">
      <div
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        aria-label={`Fotos de ${dish.name}`}
      >
        {photos.map((src, i) => (
          <DishImage
            key={src ?? i}
            src={src}
            name={dish.name}
            sizes="(min-width: 448px) 448px, 100vw"
            priority={i === 0}
            rounded="rounded-none"
            initialClassName="text-8xl"
            className="aspect-[5/4] w-full shrink-0 snap-center"
          />
        ))}
      </div>
      <IconButton
        label="Volver a la carta"
        variant="surface"
        onClick={onBack}
        className="absolute top-3 left-3"
      >
        <ArrowLeft aria-hidden />
      </IconButton>
      {photos.length > 1 && (
        <div className="absolute bottom-9 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
          {photos.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full bg-white transition-all",
                i === index ? "w-5" : "w-1.5 opacity-60",
              )}
            />
          ))}
        </div>
      )}
      <div className="absolute right-3 bottom-9">
        <Viewer3DSlot model={dish.model3d} />
      </div>
    </div>
  );
}

function DishSkeleton() {
  return (
    <div aria-busy aria-label="Cargando el plato">
      <Skeleton className="aspect-[5/4] w-full rounded-none" />
      <div className="px-4 pt-6">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-3 h-8 w-3/4" />
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-5 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-7 h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
