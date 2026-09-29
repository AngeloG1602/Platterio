"use client";

import { useEffect, useRef } from "react";
import type { Category } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

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
  const tabs = [{ id: null, name: "Todo" }, ...[...categories].sort((a, b) => a.order - b.order)];

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [value]);

  return (
    <div className="border-line bg-bg/92 sticky top-0 z-20 border-b backdrop-blur-md">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Categorías"
        className="no-scrollbar flex gap-1 overflow-x-auto px-2"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = tabs.findIndex((t) => t.id === value);
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
                "relative h-12 shrink-0 px-3 text-[15px] whitespace-nowrap transition-colors",
                active ? "text-ink font-semibold" : "text-muted hover:text-ink font-medium",
              )}
            >
              {tab.name}
              <span
                aria-hidden
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
