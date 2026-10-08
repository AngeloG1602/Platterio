"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAppStore } from "@/lib/data/store";
import { styleById, type DishLayout, type MenuStyle } from "@/lib/domain/menu-style";
import { cn } from "@/lib/cn";

/** Permite mostrar un estilo distinto al guardado (la vista previa del panel). */
const StyleOverride = createContext<MenuStyle | null>(null);

export function MenuStyleProvider({ style, children }: { style: MenuStyle; children: ReactNode }) {
  return <StyleOverride.Provider value={style}>{children}</StyleOverride.Provider>;
}

/** Estilo de la carta del negocio (o el de la vista previa, si hay una). */
export function useMenuStyle(): MenuStyle {
  const override = useContext(StyleOverride);
  const saved = useAppStore((s) => s.restaurant.brand?.style);
  return override ?? styleById(saved);
}

/** Lista de platos de una categoría, acomodada según el estilo. */
export function DishList({ children, className }: { children: ReactNode; className?: string }) {
  const { layout } = useMenuStyle();
  return (
    <ul
      className={cn(
        layout === "lista" && "divide-line divide-y",
        layout === "cuadricula" && "grid grid-cols-2 gap-3 pt-3",
        layout === "carta" && "divide-line/70 divide-y",
        layout === "tarjetas" && "flex flex-col gap-3 pt-3",
        className,
      )}
    >
      {children}
    </ul>
  );
}

/** Clases del enlace que envuelve a cada plato. */
export function dishLinkClass(layout: DishLayout): string {
  return layout === "lista"
    ? "hover:bg-surface-2/60 -mx-2 block rounded-xl px-2 transition-colors"
    : "block h-full rounded-[inherit] transition-transform active:scale-[0.99]";
}

/** Título de categoría con el tono del estilo. */
export function CategoryHeading({
  id,
  count,
  children,
}: {
  id: string;
  count?: number;
  children: ReactNode;
}) {
  const { layout } = useMenuStyle();
  if (layout === "carta") {
    return (
      <h2
        id={id}
        className="font-display text-ink flex items-center gap-3 pt-2 pb-1 text-[15px] font-semibold tracking-[0.2em] uppercase"
      >
        <span aria-hidden className="bg-line-strong h-px flex-1" />
        {children}
        <span aria-hidden className="bg-line-strong h-px flex-1" />
      </h2>
    );
  }
  return (
    <h2 id={id} className="font-display flex items-baseline gap-2 text-[22px] font-semibold">
      {children}
      {count !== undefined && (
        <span className="text-muted font-sans text-[13px] font-medium tabular-nums">{count}</span>
      )}
    </h2>
  );
}
