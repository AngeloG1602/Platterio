"use client";

import { ChefHat, Clock3, Compass, Sparkles, Star, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { DishImage } from "@/components/dish/dish-image";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { Spice } from "@/components/ui/spice";
import { useRecommendations } from "@/lib/data";
import { ALLERGEN_LABEL } from "@/lib/domain/allergens";
import { priceRange } from "@/lib/domain/menu";
import { reasonLabel, slotHeadline, type RecommendationReason } from "@/lib/domain/recommender";
import type { Allergen } from "@/lib/domain/types";

const REASON_ICON: Record<RecommendationReason, LucideIcon> = {
  nuevo: Sparkles,
  popular: TrendingUp,
  calificado: Star,
  casa: ChefHat,
  franja: Clock3,
  descubre: Compass,
};

/** Carrusel de recomendados de la franja actual (US-15, US-16, US-17). */
export function Recommendations({
  base,
  restrictions,
}: {
  base: string;
  restrictions: Allergen[];
}) {
  const { recommendations, current } = useRecommendations(restrictions);
  if (recommendations.length === 0) return null;

  const subtitle = current.upcoming
    ? `Fuera de horario: lo mejor del ${current.slot?.name.toLowerCase() ?? "día"}`
    : restrictions.length > 0
      ? `Sin ${restrictions.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(", ")}`
      : "Elegidos para esta hora";

  return (
    <section aria-labelledby="recomendados" className="pt-6">
      <div className="flex items-end justify-between px-4">
        <div>
          <h2 id="recomendados" className="font-display text-[22px] leading-tight font-semibold">
            {slotHeadline(current.slot)}
          </h2>
          <p className="text-muted mt-0.5 text-[13px]">{subtitle}</p>
        </div>
      </div>
      <ul className="no-scrollbar mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
        {recommendations.map(({ dish, reason }, i) => {
          const Icon = REASON_ICON[reason];
          const { min, max } = priceRange(dish);
          return (
            <li key={dish.id} className="w-[15rem] shrink-0 snap-start">
              <Link
                href={`${base}/plato/${dish.id}`}
                className="group block rounded-xl outline-offset-4"
              >
                <div className="relative">
                  <DishImage
                    src={dish.photos[0]}
                    name={dish.name}
                    sizes="240px"
                    priority={i < 2}
                    className="shadow-card aspect-[4/3] w-full"
                    rounded="rounded-xl"
                    initialClassName="text-6xl"
                  />
                  <span className="bg-surface/92 text-ink shadow-card absolute top-2.5 left-2.5 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold backdrop-blur">
                    <Icon className="text-accent-strong size-3.5" aria-hidden />
                    {reasonLabel(reason, current.slot, current.upcoming)}
                  </span>
                </div>
                <div className="mt-2.5 px-0.5">
                  <h3 className="font-display truncate text-[17px] leading-snug font-semibold group-hover:underline">
                    {dish.name}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2.5">
                    <Price value={min} from={min !== max} className="text-[15px]" />
                    <Spice level={dish.spiceLevel} />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function RecommendationsSkeleton() {
  return (
    <div className="px-4 pt-6" aria-hidden>
      <Skeleton className="h-6 w-44" />
      <Skeleton className="mt-2 h-3.5 w-32" />
      <div className="mt-3 flex gap-3 overflow-hidden">
        {[0, 1].map((i) => (
          <div key={i} className="w-[15rem] shrink-0">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="mt-2.5 h-5 w-3/4" />
            <Skeleton className="mt-1.5 h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
