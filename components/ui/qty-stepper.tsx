"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label = "Cantidad",
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: "md" | "sm";
}) {
  const btn = cn(
    "flex items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2 disabled:opacity-35 disabled:hover:bg-transparent",
    size === "md" ? "size-11" : "size-10",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className="border-line-strong bg-surface inline-flex items-center rounded-full border"
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Quitar uno"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <output
        aria-live="polite"
        className={cn(
          "text-center font-semibold tabular-nums",
          size === "md" ? "w-8 text-base" : "w-6 text-sm",
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Agregar uno"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
