"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

const one = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatRating(value: number): string {
  return one.format(value);
}

/** Calificación promedio: estrella + número + reseñas. */
export function RatingSummary({
  average,
  count,
  className,
  compact = false,
}: {
  average: number | null;
  count: number;
  className?: string;
  compact?: boolean;
}) {
  if (average === null || count === 0) {
    return <span className={cn("text-muted text-[13px]", className)}>{t("Aún sin reseñas")}</span>;
  }
  return (
    <span
      className={cn("text-ink-soft inline-flex items-center gap-1 text-[13px]", className)}
      aria-label={t("Calificación {n} de 5, {count} reseñas", { n: formatRating(average), count })}
    >
      <Star aria-hidden className="size-4 fill-[#E9A23B] text-[#C9851F]" strokeWidth={1.5} />
      <span className="text-ink font-semibold tabular-nums">{formatRating(average)}</span>
      <span className="text-muted tabular-nums">
        {compact ? `(${count})` : `· ${count} ${t(count === 1 ? "reseña" : "reseñas")}`}
      </span>
    </span>
  );
}

/** Estrellas de solo lectura. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex gap-0.5", className)}
      role="img"
      aria-label={t("{n} de 5 estrellas", { n: value })}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            "size-4",
            n <= Math.round(value) ? "fill-[#E9A23B] text-[#C9851F]" : "text-line-strong",
          )}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

const STAR_WORDS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

/** Selector de estrellas accesible (radiogroup), con zonas táctiles de 44 px. */
export function StarInput({
  value,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  onChange: (stars: 1 | 2 | 3 | 4 | 5) => void;
  label: string;
  size?: "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex flex-wrap items-center gap-x-3">
      <div role="radiogroup" aria-label={label} className="flex" onMouseLeave={() => setHover(0)}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${t(n === 1 ? "estrella" : "estrellas")} — ${t(STAR_WORDS[n]!)}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="flex size-11 items-center justify-center rounded-full transition-transform active:scale-90"
          >
            <Star
              aria-hidden
              className={cn(
                size === "lg" ? "size-8" : "size-7",
                "transition-colors",
                n <= shown ? "fill-[#E9A23B] text-[#C9851F]" : "text-line-strong",
              )}
              strokeWidth={1.4}
            />
          </button>
        ))}
      </div>
      <span className="text-ink-soft min-w-20 text-sm font-medium" aria-live="polite">
        {t(STAR_WORDS[shown]!)}
      </span>
    </div>
  );
}
