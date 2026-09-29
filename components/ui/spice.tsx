import { Flame } from "lucide-react";
import { SPICE_LABEL } from "@/lib/domain/allergens";
import type { SpiceLevel } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

/** Nivel de picante con 0 a 3 llamas. Con `showEmpty` dibuja las llamas apagadas. */
export function Spice({
  level,
  showEmpty = false,
  withLabel = false,
  className,
}: {
  level: SpiceLevel;
  showEmpty?: boolean;
  withLabel?: boolean;
  className?: string;
}) {
  if (level === 0 && !showEmpty && !withLabel) return null;
  const total = showEmpty ? 3 : level;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      role="img"
      aria-label={SPICE_LABEL[level]}
    >
      {total > 0 && (
        <span className="inline-flex items-center -space-x-0.5" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <Flame
              key={i}
              className={cn(
                "size-4",
                i < level ? "fill-accent/85 text-accent-strong" : "text-line-strong",
              )}
              strokeWidth={1.8}
            />
          ))}
        </span>
      )}
      {withLabel && (
        <span className="text-ink-soft text-[13px]" aria-hidden>
          {SPICE_LABEL[level]}
        </span>
      )}
    </span>
  );
}
