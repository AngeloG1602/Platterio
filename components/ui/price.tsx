import { formatCOP } from "@/lib/domain/format";
import { cn } from "@/lib/cn";

export function Price({
  value,
  className,
  from = false,
}: {
  value: number;
  className?: string;
  /** Muestra "Desde" cuando el plato tiene variantes con precios distintos. */
  from?: boolean;
}) {
  return (
    <span className={cn("font-semibold tracking-tight whitespace-nowrap tabular-nums", className)}>
      {from && <span className="text-muted mr-1 text-[0.8em] font-normal">Desde</span>}
      {formatCOP(value)}
    </span>
  );
}
