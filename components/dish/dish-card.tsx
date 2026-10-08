import { localized } from "@/lib/i18n";
import { AllergenList } from "@/components/ui/allergen";
import { Price } from "@/components/ui/price";
import { Spice } from "@/components/ui/spice";
import { RatingSummary } from "@/components/ui/stars";
import { dishAllergens } from "@/lib/domain/allergens";
import type { Allergen, Dish } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { DishImage } from "./dish-image";
import { useMenuStyle } from "./dish-layout";

/** Plato del menú; su distribución (lista, cuadrícula, carta o tarjeta) la define el estilo del negocio. */
export function DishCard({
  dish,
  restrictions = [],
  rating,
  className,
}: {
  dish: Dish;
  restrictions?: readonly Allergen[];
  rating?: { average: number | null; count: number };
  className?: string;
}) {
  const { layout } = useMenuStyle();
  const prices = dish.variants.map((v) => v.price);
  const price = (
    <Price value={Math.min(...prices)} from={new Set(prices).size > 1} className="text-[15px]" />
  );
  const name = localized(dish);
  const meta = (
    <>
      <Spice level={dish.spiceLevel} />
      {rating && <RatingSummary average={rating.average} count={rating.count} compact />}
    </>
  );
  const allergens = (
    <AllergenList
      allergens={dishAllergens(dish)}
      restrictions={restrictions}
      size="sm"
      className="mt-2.5"
    />
  );

  if (layout === "cuadricula") {
    return (
      <article className={cn("flex h-full flex-col", className)}>
        <DishImage
          src={dish.photos[0]}
          name={name}
          sizes="(max-width: 448px) 50vw, 224px"
          className="aspect-square w-full"
          rounded="rounded-xl"
        />
        <div className="flex flex-1 flex-col px-0.5 pt-2.5 pb-1">
          <h3 className="font-display text-ink text-[16px] leading-snug font-semibold">{name}</h3>
          <p className="text-muted mt-0.5 line-clamp-2 text-[13px] leading-snug">
            {localized(dish, "description")}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-2">
            {price}
            {meta}
          </div>
          {allergens}
        </div>
      </article>
    );
  }

  if (layout === "carta") {
    return (
      <article className={cn("py-3.5", className)}>
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-ink text-[17px] leading-snug font-semibold">{name}</h3>
          <span
            aria-hidden
            className="border-line-strong mb-1 min-w-4 flex-1 border-b border-dotted"
          />
          {price}
        </div>
        <p className="text-muted mt-0.5 text-sm leading-relaxed italic">
          {localized(dish, "description")}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">{meta}</div>
        {allergens}
      </article>
    );
  }

  const row = (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-display text-ink text-[17px] leading-snug font-semibold">{name}</h3>
        <p className="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">
          {localized(dish, "description")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {price}
          {meta}
        </div>
        {allergens}
      </div>
      <DishImage
        src={dish.photos[0]}
        name={name}
        sizes="112px"
        className={cn("shrink-0", layout === "tarjetas" ? "size-24" : "shadow-card size-28")}
        rounded={layout === "tarjetas" ? "rounded-lg" : "rounded-xl"}
      />
    </>
  );

  if (layout === "tarjetas") {
    return (
      <article
        className={cn(
          "bg-surface shadow-card border-line-strong flex gap-3.5 rounded-xl border-(length:--card-bw) [border-style:var(--card-bs)] p-3.5",
          className,
        )}
      >
        {row}
      </article>
    );
  }
  return <article className={cn("flex gap-4 py-4", className)}>{row}</article>;
}
