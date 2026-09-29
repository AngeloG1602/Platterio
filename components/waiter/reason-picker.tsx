"use client";

import { FilterChip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/field";

/** Motivo rápido con opción "Otro" que pide escribirlo (regla 5: todo ajuste exige motivo). */
export function ReasonPicker({
  options,
  value,
  onChange,
  other,
  onOtherChange,
  label = "Motivo",
  error,
}: {
  options: readonly string[];
  value: string | null;
  onChange: (v: string) => void;
  other: string;
  onOtherChange: (v: string) => void;
  label?: string;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-[15px] font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <FilterChip
            key={o}
            role="radio"
            aria-pressed={undefined}
            aria-checked={value === o}
            selected={value === o}
            onClick={() => onChange(o)}
          >
            {o}
          </FilterChip>
        ))}
      </div>
      {value === "Otro" && (
        <Field label="Cuéntale al cliente qué pasó" error={error}>
          {(p) => (
            <Input
              {...p}
              value={other}
              onChange={(e) => onOtherChange(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder="Por ejemplo: se acabó el pan brioche"
            />
          )}
        </Field>
      )}
      {error && value !== "Otro" && (
        <p className="text-danger-ink text-[13px] font-medium">{error}</p>
      )}
    </fieldset>
  );
}

export function resolveReason(value: string | null, other: string): string {
  if (!value) return "";
  return value === "Otro" ? other.trim() : value;
}
