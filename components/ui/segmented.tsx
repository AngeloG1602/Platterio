"use client";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Control segmentado accesible (radiogroup). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("border-line bg-surface-2 flex gap-1 rounded-xl border p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-11 flex-1 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-150",
              active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
            {o.hint && (
              <span className="text-muted text-[11px] font-normal tabular-nums">{o.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
