import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Cifra del panel: etiqueta, valor en sans semibold (cifras proporcionales) y nota opcional. */
export function StatTile({
  label,
  value,
  note,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: LucideIcon;
  tone?: "neutral" | "danger";
}) {
  return (
    <div
      className={cn(
        "bg-surface shadow-card rounded-2xl border p-4",
        tone === "danger" ? "border-danger/30" : "border-line",
      )}
    >
      <p className="text-muted flex items-center gap-1.5 text-sm">
        {Icon && <Icon className="size-4" aria-hidden />}
        {label}
      </p>
      <p className="mt-1.5 text-[28px] leading-tight font-semibold tracking-tight">{value}</p>
      {note && <p className="text-muted mt-1 text-[13px]">{note}</p>}
    </div>
  );
}
