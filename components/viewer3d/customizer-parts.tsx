"use client";

import { Check, Minus, Plus, ShieldCheck, WandSparkles, X } from "lucide-react";
import { AllergenChip, ALLERGEN_ICON } from "@/components/ui/allergen";
import { Button, IconButton } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { toast } from "@/components/ui/toaster";
import { ALLERGEN_LABEL } from "@/lib/domain/allergens";
import {
  adaptToRestrictions,
  limits,
  resultingAllergens,
  setReplacement,
  setUnits,
  toggleRemoved,
  unitsOf,
  type Customization,
  type DishCustomizationSpec,
  type IngredientSlot,
} from "@/lib/domain/customization";
import { formatPriceDelta } from "@/lib/domain/format";
import { ALLERGENS, type Allergen } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export function SlotRow({
  spec,
  slot,
  custom,
  variantId,
  restrictions,
  selected,
  onSelect,
  onChange,
}: {
  spec: DishCustomizationSpec;
  slot: IngredientSlot;
  custom: Customization;
  variantId: string;
  restrictions: Allergen[];
  selected: boolean;
  onSelect: () => void;
  onChange: (c: Customization) => void;
}) {
  const units = unitsOf(spec, custom, slot.key, variantId);
  const { min, max, base } = limits(spec, slot, variantId);
  const option = slot.replacements.find((o) => o.id === custom.replaced[slot.key]);
  const shownAllergens = option?.allergens ?? slot.allergens;
  const conflict = units > 0 && shownAllergens.some((a) => restrictions.includes(a));
  const removed = slot.included && units === 0;
  return (
    <li
      className={cn("-mx-2 rounded-lg px-2 py-2.5 transition-colors", selected && "bg-accent-soft")}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <span
            className={cn("block text-[15px] font-medium", removed && "text-muted line-through")}
          >
            {t(option?.name ?? slot.name)}
          </span>
          <span className="text-muted flex flex-wrap items-center gap-1 text-xs">
            {option && <>{t("en vez de {x}", { x: t(slot.name).toLowerCase() })} · </>}
            {!slot.included && units === 0 && `${formatPriceDelta(slot.extraPrice)} ${t("c/u")}`}
            {units > base && `${t("Extra")} ${formatPriceDelta((units - base) * slot.extraPrice)}`}
            {conflict && (
              <span className="text-danger-ink font-semibold">
                · {t("tiene")}{" "}
                {shownAllergens
                  .filter((a) => restrictions.includes(a))
                  .map((a) => t(ALLERGEN_LABEL[a]).toLowerCase())
                  .join(", ")}
              </span>
            )}
          </span>
        </button>
        {slot.included && slot.removable && units > 0 && units <= base && max === base && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(toggleRemoved(spec, custom, slot.key, variantId))}
          >
            {t("Quitar")}
          </Button>
        )}
        {removed && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange(toggleRemoved(spec, custom, slot.key, variantId))}
          >
            {t("Poner")}
          </Button>
        )}
        {max > min && !removed && (max > base || !slot.included) && (
          <div className="border-line-strong flex items-center rounded-full border">
            <button
              type="button"
              aria-label={t("Menos {x}", { x: t(slot.name) })}
              disabled={units <= min}
              onClick={() => onChange(setUnits(spec, custom, slot.key, units - 1, variantId))}
              className="flex size-10 items-center justify-center rounded-full disabled:opacity-30"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-5 text-center text-sm font-semibold tabular-nums">{units}</span>
            <button
              type="button"
              aria-label={t("Más {x}", { x: t(slot.name) })}
              disabled={units >= max}
              onClick={() => onChange(setUnits(spec, custom, slot.key, units + 1, variantId))}
              className="flex size-10 items-center justify-center rounded-full disabled:opacity-30"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
      {slot.replacements.length > 0 && units > 0 && (
        <div
          className="mt-1.5 flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label={t("Opciones de {x}", { x: t(slot.name) })}
        >
          {[
            { id: null as string | null, name: slot.name, priceDelta: 0 },
            ...slot.replacements,
          ].map((o) => {
            const active = (custom.replaced[slot.key] ?? null) === o.id;
            return (
              <FilterChip
                key={o.id ?? "original"}
                role="radio"
                aria-pressed={undefined}
                aria-checked={active}
                selected={active}
                className="h-9 px-3 text-[13px]"
                onClick={() => onChange(setReplacement(spec, custom, slot.key, o.id, variantId))}
              >
                {active && <Check aria-hidden />}
                {o.id === null ? t("Original") : t(o.name)}
                {o.priceDelta > 0 && (
                  <span className={active ? "text-bg/80" : "text-muted"}>
                    {formatPriceDelta(o.priceDelta)}
                  </span>
                )}
              </FilterChip>
            );
          })}
        </div>
      )}
    </li>
  );
}

export function SelectedCard({
  spec,
  slot,
  custom,
  variantId,
  onChange,
  onClose,
}: {
  spec: DishCustomizationSpec;
  slot: IngredientSlot;
  custom: Customization;
  variantId: string;
  onChange: (c: Customization) => void;
  onClose: () => void;
}) {
  const units = unitsOf(spec, custom, slot.key, variantId);
  const option = slot.replacements.find((o) => o.id === custom.replaced[slot.key]);
  const allergens = option?.allergens ?? slot.allergens;
  return (
    <div
      className="border-line bg-surface/95 shadow-float rounded-xl border p-3 backdrop-blur"
      role="dialog"
      aria-label={t("Opciones de {x}", { x: t(slot.name) })}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t(option?.name ?? slot.name)}</p>
          <p className="text-muted text-[13px]">
            {option?.description
              ? t(option.description)
              : slot.description
                ? t(slot.description)
                : slot.included
                  ? t("Viene en el plato")
                  : `${t("Adicional")} · ${formatPriceDelta(slot.extraPrice)}`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {allergens.length ? (
              allergens.map((a) => <AllergenChip key={a} allergen={a} size="sm" />)
            ) : (
              <span className="text-muted text-xs">{t("Sin alérgenos")}</span>
            )}
          </div>
        </div>
        <IconButton label={t("Cerrar")} className="size-9" onClick={onClose}>
          <X aria-hidden />
        </IconButton>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {slot.included && slot.removable && (
          <Button
            size="sm"
            variant={units === 0 ? "primary" : "secondary"}
            onClick={() => onChange(toggleRemoved(spec, custom, slot.key, variantId))}
          >
            {units === 0 ? t("Volver a ponerlo") : t("Quitar")}
          </Button>
        )}
        {!slot.included && (
          <Button
            size="sm"
            onClick={() => onChange(setUnits(spec, custom, slot.key, units > 0 ? 0 : 1, variantId))}
          >
            {units > 0
              ? t("Quitar adicional")
              : `${t("Agregar")} ${formatPriceDelta(slot.extraPrice)}`}
          </Button>
        )}
        {slot.included && slot.maxExtra > 0 && units > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onChange(setUnits(spec, custom, slot.key, units + 1, variantId))}
            disabled={units >= limits(spec, slot, variantId).max}
          >
            <Plus aria-hidden /> {t("Extra")}{" "}
            {slot.extraPrice ? formatPriceDelta(slot.extraPrice) : t("sin costo")}
          </Button>
        )}
        {slot.replacements.map((o) => (
          <Button
            key={o.id}
            size="sm"
            variant={custom.replaced[slot.key] === o.id ? "ink" : "ghost"}
            onClick={() =>
              onChange(
                setReplacement(
                  spec,
                  custom,
                  slot.key,
                  custom.replaced[slot.key] === o.id ? null : o.id,
                  variantId,
                ),
              )
            }
          >
            {t(o.name)}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function RestrictionsPanel({
  spec,
  custom,
  variantId,
  restrictions,
  onRestrictions,
  onApply,
}: {
  spec: DishCustomizationSpec;
  custom: Customization;
  variantId: string;
  restrictions: Allergen[];
  onRestrictions: (r: Allergen[]) => void;
  onApply: (c: Customization) => void;
}) {
  const conflicts = resultingAllergens(spec, custom, variantId).filter((a) =>
    restrictions.includes(a),
  );
  return (
    <section
      className="border-line bg-surface shadow-card rounded-2xl border p-4"
      aria-labelledby="mis-alergias"
    >
      <h2 id="mis-alergias" className="flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck className="text-accent-strong size-5" aria-hidden /> {t("Mis alergias")}
      </h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ALLERGENS.map((a) => {
          const Icon = ALLERGEN_ICON[a];
          const on = restrictions.includes(a);
          return (
            <FilterChip
              key={a}
              selected={on}
              className="h-9 px-3 text-[13px]"
              onClick={() =>
                onRestrictions(on ? restrictions.filter((x) => x !== a) : [...restrictions, a])
              }
            >
              <Icon aria-hidden strokeWidth={1.8} /> {t(ALLERGEN_LABEL[a])}
            </FilterChip>
          );
        })}
      </div>
      {restrictions.length > 0 && (
        <div className="mt-3">
          {conflicts.length === 0 ? (
            <p className="text-success-ink flex items-center gap-1.5 text-sm font-medium">
              <Check className="size-4" aria-hidden />{" "}
              {t("Así como está, el plato no tiene tus alérgenos.")}
            </p>
          ) : (
            <Button
              block
              onClick={() => {
                const r = adaptToRestrictions(spec, custom, restrictions, variantId);
                onApply(r.customization);
                if (r.changes.length)
                  toast.success(t("Plato adaptado"), {
                    description: r.changes.map((c) => t(c)).join(" · "),
                  });
                if (r.unresolved.length)
                  toast.warning(t("No se pudo evitar todo"), {
                    description: t("Sigue teniendo: {list}. Pregúntale al mesero.", {
                      list: r.unresolved.map((c) => t(c)).join(", "),
                    }),
                  });
              }}
            >
              <WandSparkles aria-hidden /> {t("Adaptar a mis alergias")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** Para el cliente: sus alergias vienen del celular; solo se ofrece adaptar el plato. */
export function RestrictionsAdapt({
  spec,
  custom,
  variantId,
  restrictions,
  onApply,
}: {
  spec: DishCustomizationSpec;
  custom: Customization;
  variantId: string;
  restrictions: Allergen[];
  onApply: (c: Customization) => void;
}) {
  const conflicts = resultingAllergens(spec, custom, variantId).filter((a) =>
    restrictions.includes(a),
  );
  if (conflicts.length === 0)
    return (
      <p className="text-success-ink flex items-center gap-1.5 text-sm font-medium">
        <Check className="size-4" aria-hidden />{" "}
        {t("Así como está, el plato no tiene tus alérgenos.")}
      </p>
    );
  return (
    <div className="bg-danger-soft rounded-xl p-3">
      <p className="text-danger-ink text-sm font-semibold">
        {t("Tiene {list}", {
          list: conflicts.map((a) => t(ALLERGEN_LABEL[a]).toLowerCase()).join(t(" y ")),
        })}
      </p>
      <Button
        className="mt-2"
        block
        onClick={() => {
          const r = adaptToRestrictions(spec, custom, restrictions, variantId);
          onApply(r.customization);
          if (r.changes.length)
            toast.success(t("Plato adaptado"), {
              description: r.changes.map((c) => t(c)).join(" · "),
            });
          if (r.unresolved.length)
            toast.warning(t("No se pudo evitar todo"), {
              description: t("Sigue teniendo: {list}. Pregúntale al mesero.", {
                list: r.unresolved.map((c) => t(c)).join(", "),
              }),
            });
        }}
      >
        <WandSparkles aria-hidden /> {t("Adaptar a mis alergias")}
      </Button>
    </div>
  );
}
