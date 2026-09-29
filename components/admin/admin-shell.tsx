"use client";

import {
  ArrowLeft,
  ChartColumn,
  LayoutDashboard,
  MessageSquareText,
  Settings2,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PlatterioLogo } from "@/components/brand/logos";
import { DemoPanel } from "@/components/demo/demo-panel";
import { Badge } from "@/components/ui/chip";
import { useAlerts, useRestaurant } from "@/lib/data";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ready: boolean;
}

/** Secciones del panel. Se activan a medida que se construyen (Fase 6). */
const NAV: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, ready: true },
  { href: "/admin/platos", label: "Platos", icon: UtensilsCrossed, ready: false },
  { href: "/admin/recomendaciones", label: "Recomendaciones", icon: Sparkles, ready: false },
  { href: "/admin/calificaciones", label: "Calificaciones", icon: MessageSquareText, ready: false },
  { href: "/admin/ventas", label: "Ventas", icon: ChartColumn, ready: false },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings2, ready: false },
];

/** Estructura del panel del administrador: marca Platterio, navegación lateral y contenido. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const restaurant = useRestaurant();
  const openAlerts = useAlerts().filter((a) => !a.resolved).length;

  return (
    <div className="bg-bg min-h-dvh lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
      <aside className="border-line bg-surface border-b lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <PlatterioLogo />
          <div className="lg:mt-5">
            <p className="text-muted text-[13px]">Administrando</p>
            <p className="font-display text-lg leading-tight font-semibold">{restaurant.name}</p>
          </div>
        </div>
        <nav
          aria-label="Secciones del panel"
          className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const content = (
              <>
                <item.icon className="size-5 shrink-0" aria-hidden strokeWidth={1.8} />
                <span className="flex-1 whitespace-nowrap">{item.label}</span>
                {item.href === "/admin" && openAlerts > 0 && (
                  <span
                    className="bg-danger flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white tabular-nums"
                    aria-label={`${openAlerts} alertas activas`}
                  >
                    {openAlerts}
                  </span>
                )}
                {!item.ready && <Badge className="hidden lg:inline-flex">Fase 6</Badge>}
              </>
            );
            const cls = cn(
              "flex h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors",
              active ? "bg-ink text-bg" : "text-ink-soft hover:bg-surface-2 hover:text-ink",
              !item.ready && "pointer-events-none text-muted opacity-60",
            );
            return item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cls}
              >
                {content}
              </Link>
            ) : (
              <span key={item.href} aria-disabled className={cls}>
                {content}
              </span>
            );
          })}
        </nav>
        <div className="mt-auto hidden p-4 lg:block">
          <Link
            href="/"
            className="text-muted hover:bg-surface-2 hover:text-ink flex h-11 items-center gap-2 rounded-lg px-3 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden /> Volver al hub de demo
          </Link>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">{children}</main>
      <DemoPanel />
    </div>
  );
}
