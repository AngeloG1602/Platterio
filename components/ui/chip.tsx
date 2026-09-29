import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Chip seleccionable para filtros (aria-pressed). */
export function FilterChip({
  selected,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
        "transition-colors duration-150 [&_svg]:size-4",
        selected
          ? "border-ink bg-ink text-bg"
          : "border-line-strong bg-surface text-ink-soft hover:border-ink/40 hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-soft border-line",
  accent: "bg-accent-soft text-accent-strong border-accent-line",
  success: "bg-success-soft text-success-ink border-success/25",
  warning: "bg-warning-soft text-warning-ink border-warning/30",
  danger: "bg-danger-soft text-danger-ink border-danger/25",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
