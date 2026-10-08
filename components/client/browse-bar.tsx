"use client";

import { BellRing, KeyRound } from "lucide-react";
import Link from "next/link";
import { useBusinessHref, useScreenPath } from "@/components/providers/business-scope";
import { Button, buttonClasses } from "@/components/ui/button";
import { tableActions, useOpenCalls } from "@/lib/data";
import { t } from "@/lib/i18n";
import type { TableView } from "./table-gate";

/** Qué hacer cuando solo se está mirando la carta (sin haber entrado a la mesa). */
function useBrowseAction(view: TableView) {
  const asked = useOpenCalls().some((c) => c.tableId === view.table.id && !c.resolved);
  return { asked, ask: () => tableActions.requestOpen(view.table.number) };
}

/**
 * Barra fija mientras se mira la carta sin pedir. Si el mesero ya abrió la mesa, lleva a poner el
 * PIN (y de vuelta a donde estaba); si no, permite avisarle.
 */
export function BrowseBar({ view }: { view: TableView }) {
  const { asked, ask } = useBrowseAction(view);
  const screen = useScreenPath();
  const href = useBusinessHref();
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-3">
      <div
        role="status"
        className="bg-ink text-bg shadow-float flex items-center gap-3 rounded-2xl px-4 py-3"
      >
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[15px] font-semibold">
            {view.sessionOpen ? t("Tu mesa ya está abierta") : t("Estás mirando la carta")}
          </span>
          <span className="text-bg/75 text-xs">
            {view.sessionOpen
              ? t("Entra con el PIN que te dio el mesero para pedir.")
              : asked
                ? t("Ya avisamos al mesero. Cuando abra tu mesa, ponte el PIN para pedir.")
                : t("Para pedir, tu mesero abre la mesa y te da un PIN.")}
          </span>
        </span>
        {view.sessionOpen ? (
          <Link
            href={`${view.base}?next=${encodeURIComponent(href(screen))}`}
            className={buttonClasses({ size: "sm", className: "shrink-0" })}
          >
            <KeyRound aria-hidden /> {t("Poner PIN")}
          </Link>
        ) : (
          <Button size="sm" className="shrink-0" disabled={asked} onClick={ask}>
            <BellRing aria-hidden /> {asked ? t("Avisado") : t("Avisar al mesero")}
          </Button>
        )}
      </div>
    </div>
  );
}
