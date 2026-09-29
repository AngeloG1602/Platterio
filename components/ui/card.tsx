import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("border-line bg-surface shadow-card rounded-xl border", className)}
      {...props}
    />
  );
}

export function SectionTitle({
  eyebrow,
  title,
  className,
  action,
}: {
  eyebrow?: string;
  title: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && (
          <p className="text-accent-strong mb-1 text-xs font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-ink text-2xl leading-tight font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}
