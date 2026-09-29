import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Estado vacío / sin resultados / error, con tono cercano y una acción opcional. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "danger";
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex flex-col items-center px-6 py-10 text-center", className)}
    >
      <div
        className={cn(
          "mb-4 flex size-14 items-center justify-center rounded-2xl",
          tone === "danger" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted",
        )}
      >
        <Icon className="size-6" strokeWidth={1.6} aria-hidden />
      </div>
      <p className="font-display text-ink text-lg leading-snug font-semibold">{title}</p>
      {description && (
        <p className="text-muted mt-1.5 max-w-xs text-[15px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
