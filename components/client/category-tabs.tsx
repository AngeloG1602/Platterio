"use client";

import { useEffect, useRef } from "react";
import type { Category } from "@/lib/domain/types";
import { useMenuStyle } from "@/components/dish/dish-layout";
import { cn } from "@/lib/cn";
import { localized, t } from "@/lib/i18n";

/** Pestañas de categoría fijas arriba. "Todo" muestra la carta completa agrupada. */
export function CategoryTabs({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const pill = useMenuStyle().tabs === "pildora";
  const tabs = [
    { id: null, name: t("Todo") },
    ...[...categories]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, name: localized(c) })),
  ];

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [value]);

  return (
    <div
      className={cn("bg-bg/92 sticky top-0 z-20 backdrop-blur-md", !pill && "border-line border-b")}
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={t("Categorías")}
        className={cn("no-scrollbar flex overflow-x-auto", pill ? "gap-2 px-4 py-2" : "gap-1 px-2")}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = tabs.findIndex((x) => x.id === value);
          const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]!;
          onChange(next.id);
          requestAnimationFrame(() =>
            listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus(),
          );
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id ?? "todo"}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="lista-platos"
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative shrink-0 text-[15px] whitespace-nowrap transition-colors",
                pill ? "h-10 rounded-full border-2 px-4 font-semibold" : "h-12 px-3",
                pill &&
                  (active
                    ? "border-accent-strong bg-accent-strong text-accent-ink"
                    : "border-line-strong bg-surface text-ink-soft hover:text-ink"),
                !pill &&
                  (active ? "text-ink font-semibold" : "text-muted hover:text-ink font-medium"),
              )}
            >
              {tab.name}
              <span
                aria-hidden
                hidden={pill}
                className={cn(
                  "bg-accent absolute inset-x-3 bottom-0 h-[3px] rounded-full transition-transform duration-200",
                  active ? "scale-x-100" : "scale-x-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
