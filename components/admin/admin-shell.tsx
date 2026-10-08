"use client";

import {
  ArrowLeft,
  ChartColumn,
  FileSpreadsheet,
  LayoutDashboard,
  MessageSquareText,
  Settings2,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { TrialBanner } from "@/components/account/account-status";
import { PlatterioLogo, RestaurantMark } from "@/components/brand/logos";
import { SessionButton } from "@/components/access/role-gate";
import { DemoPanel } from "@/components/demo/demo-panel";
import { useAlerts, useRestaurant } from "@/lib/data";
import { cn } from "@/lib/cn";
import { useBusinessHref, useScreenPath } from "@/components/providers/business-scope";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Secciones del panel. Se activan a medida que se construyen (Fase 6). */
const NAV: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/platos", label: "Platos", icon: UtensilsCrossed },
  { href: "/admin/recomendaciones", label: "Recomendaciones", icon: Sparkles },
  { href: "/admin/calificaciones", label: "Calificaciones", icon: MessageSquareText },
  { href: "/admin/ventas", label: "Ventas", icon: ChartColumn },
  { href: "/admin/reportes", label: "Reportes", icon: FileSpreadsheet },
  { href: "/admin/equipo", label: "Equipo", icon: Users },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings2 },
];

/** Estructura del panel del administrador: identidad del negocio, navegación lateral y contenido. */
export function AdminShell({ children }: { children: ReactNode }) {
  const screen = useScreenPath();
  const href = useBusinessHref();
  const restaurant = useRestaurant();
  const openAlerts = useAlerts().filter((a) => !a.resolved).length;

  return (
    <div className="bg-bg min-h-dvh lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
      <a
        href="#contenido"
        className="bg-ink text-bg sr-only z-50 rounded-lg px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <aside className="border-line bg-surface border-b lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <div>
            <p className="text-muted mb-1.5 text-[13px]">Administrando</p>
            <RestaurantMark name={restaurant.name} className="text-[14px]" />
          </div>
        </div>
        <nav
          aria-label="Secciones del panel"
          className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/admin" ? screen === "/admin" : screen.startsWith(item.href);
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
              </>
            );
            const cls = cn(
              "flex h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors",
              active ? "bg-ink text-bg" : "text-ink-soft hover:bg-surface-2 hover:text-ink",
            );
            return (
              <Link
                key={item.href}
                href={href(item.href)}
                aria-current={active ? "page" : undefined}
                className={cls}
              >
                {content}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden flex-col gap-2 p-4 lg:flex">
          <SessionButton />
          <PlatterioLogo tone="muted" className="mx-3 mt-1 scale-75 self-start" />
          <Link
            href="/demo"
            className="text-muted hover:bg-surface-2 hover:text-ink flex h-11 items-center gap-2 rounded-lg px-3 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden /> Volver al hub de demo
          </Link>
        </div>
      </aside>
      <main
        id="contenido"
        tabIndex={-1}
        className="min-w-0 px-5 py-6 outline-none sm:px-8 lg:px-10 lg:py-8"
      >
        <TrialBanner />
        {children}
      </main>
      <DemoPanel />
    </div>
  );
}
