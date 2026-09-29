"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
  description,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-4", className)}>
      <div>
        <label htmlFor={id} className="text-ink text-[15px] font-medium">
          {label}
        </label>
        {description && <p className="text-muted text-[13px]">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200",
          "before:absolute before:-inset-2 before:content-['']",
          checked ? "bg-accent-strong" : "bg-line-strong",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "ease-out-soft size-5.5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-[23px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </div>
  );
}
