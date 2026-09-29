import { cn } from "@/lib/cn";

/** Marca de Platterio: un plato visto desde arriba con el borde abierto. */
export function PlatterioMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)} fill="none">
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeDasharray="70 18"
        strokeLinecap="round"
        transform="rotate(-50 16 16)"
      />
      <circle cx="16" cy="16" r="8.5" fill="currentColor" opacity="0.14" />
      <circle cx="16" cy="16" r="8.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="24.6" cy="7.4" r="2.2" fill="var(--accent)" />
    </svg>
  );
}

export function PlatterioLogo({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        tone === "ink" ? "text-ink" : "text-muted",
        className,
      )}
    >
      <PlatterioMark />
      <span className="font-display text-[22px] leading-none font-semibold tracking-tight">
        platterio
      </span>
    </span>
  );
}

/** Marca tipográfica del restaurante de ejemplo. */
export function RestaurantMark({ name, className }: { name: string; className?: string }) {
  const match = /^(.*?)(\s*\d+)$/.exec(name);
  const words = match ? match[1]! : name;
  const number = match ? match[2]!.trim() : null;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="font-display text-[1.6em] leading-none font-semibold tracking-tight">
        {words}
      </span>
      {number && (
        <span className="bg-accent-strong text-accent-ink inline-flex h-[1.5em] min-w-[1.5em] items-center justify-center rounded-full px-1.5 text-[0.95em] leading-none font-bold tabular-nums">
          {number}
        </span>
      )}
    </span>
  );
}

export function MadeWithPlatterio({ className }: { className?: string }) {
  return (
    <p className={cn("text-muted flex items-center justify-center gap-1.5 text-xs", className)}>
      Hecho con
      <span className="font-display text-ink-soft inline-flex items-center gap-1 text-sm font-semibold">
        <PlatterioMark className="size-4" />
        platterio
      </span>
    </p>
  );
}
