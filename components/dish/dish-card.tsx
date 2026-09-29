import { AllergenList } from "@/components/ui/allergen";
import { Price } from "@/components/ui/price";
import { Spice } from "@/components/ui/spice";
import { RatingSummary } from "@/components/ui/stars";
import { dishAllergens } from "@/lib/domain/allergens";
import type { Allergen, Dish } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { DishImage } from "./dish-image";

/** Fila de plato del menú: texto a la izquierda, foto a la derecha. */
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
  const prices = dish.variants.map((v) => v.price);
  const minPrice = Math.min(...prices);
  return (
    <article className={cn("flex gap-4 py-4", className)}>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-display text-ink text-[17px] leading-snug font-semibold">
          {dish.name}
        </h3>
        <p className="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">{dish.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Price value={minPrice} from={new Set(prices).size > 1} className="text-[15px]" />
          <Spice level={dish.spiceLevel} />
          {rating && <RatingSummary average={rating.average} count={rating.count} compact />}
        </div>
        <AllergenList
          allergens={dishAllergens(dish)}
          restrictions={restrictions}
          size="sm"
          className="mt-2.5"
        />
      </div>
      <DishImage
        src={dish.photos[0]}
        name={dish.name}
        sizes="112px"
        className="shadow-card size-28 shrink-0"
        rounded="rounded-xl"
      />
    </article>
  );
}
