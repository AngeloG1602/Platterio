import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--surface-2)_0%,color-mix(in_oklab,var(--surface-2)_40%,var(--surface))_50%,var(--surface-2)_100%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

/** Tarjeta de plato en carga, con la misma geometría que la real. */
export function DishCardSkeleton() {
  return (
    <div className="flex gap-4 py-4" aria-hidden>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="mt-1 h-5 w-20" />
      </div>
      <Skeleton className="size-24 shrink-0 rounded-lg" />
    </div>
  );
}
