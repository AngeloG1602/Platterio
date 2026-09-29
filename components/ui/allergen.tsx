import {
  Bean,
  Egg,
  Fish,
  Milk,
  Nut,
  Shrimp,
  TreeDeciduous,
  TriangleAlert,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ALLERGEN_LABEL } from "@/lib/domain/allergens";
import type { Allergen } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

export const ALLERGEN_ICON: Record<Allergen, LucideIcon> = {
  gluten: Wheat,
  lacteos: Milk,
  huevo: Egg,
  mani: Nut,
  frutos_secos: TreeDeciduous,
  soya: Bean,
  mariscos: Shrimp,
  pescado: Fish,
};

/** Alérgeno como chip con ícono y texto (nunca solo color). `alert` lo marca como conflicto con el cliente. */
export function AllergenChip({
  allergen,
  alert = false,
  size = "md",
  className,
}: {
  allergen: Allergen;
  alert?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = alert ? TriangleAlert : ALLERGEN_ICON[allergen];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]",
        alert
          ? "border-danger/30 bg-danger-soft text-danger-ink"
          : "border-line bg-surface-2/60 text-ink-soft",
        className,
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={1.8} />
      {ALLERGEN_LABEL[allergen]}
      {alert && <span className="sr-only"> (tienes esta restricción)</span>}
    </span>
  );
}

export function AllergenList({
  allergens,
  restrictions = [],
  size,
  className,
}: {
  allergens: Allergen[];
  restrictions?: readonly Allergen[];
  size?: "sm" | "md";
  className?: string;
}) {
  if (allergens.length === 0) {
    return <span className={cn("text-muted text-xs", className)}>Sin alérgenos declarados</span>;
  }
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Alérgenos">
      {allergens.map((a) => (
        <li key={a}>
          <AllergenChip allergen={a} alert={restrictions.includes(a)} size={size} />
        </li>
      ))}
    </ul>
  );
}
