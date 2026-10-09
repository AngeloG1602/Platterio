"use client";

import { Bike, BellRing, KeyRound } from "lucide-react";
import Link from "next/link";
import { useBusinessHref, useScreenPath } from "@/components/providers/business-scope";
import { Button, buttonClasses } from "@/components/ui/button";
import { tableActions, useDeliveryConfig, useOpenCalls } from "@/lib/data";
import type { Table } from "@/lib/domain/types";
import { t } from "@/lib/i18n";
import type { TableView } from "./table-gate";

/** Qué hacer cuando solo se está mirando la carta (sin haber entrado a la mesa). */
function useBrowseAction(table: Table) {
  const asked = useOpenCalls().some((c) => c.tableId === table.id && !c.resolved);
  return { asked, ask: () => tableActions.requestOpen(table.number) };
}

/**
 * Barra fija mientras se mira la carta sin pedir. Si el mesero ya abrió la mesa, lleva a poner el
 * PIN (y de vuelta a donde estaba); si no, permite avisarle.
 */
export function BrowseBar({ view }: { view: TableView }) {
  return view.table ? <TableBrowseBar view={view} table={view.table} /> : <PublicBar />;
}

/**
 * Barra de la carta pública (sin mesa): invita a pedir a domicilio o para recoger y recuerda que
 * en el restaurante se pide escaneando el QR de la mesa.
 */
function PublicBar() {
  const href = useBusinessHref();
  const delivery = useDeliveryConfig();
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-3">
      <div
        role="status"
        className="bg-ink text-bg shadow-float flex items-center gap-3 rounded-2xl px-4 py-3"
      >
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[15px] font-semibold">{t("Estás viendo la carta")}</span>
          <span className="text-bg/75 text-xs">
            {delivery?.enabled
              ? t(
                  "¿Quieres pedir? A domicilio o para recoger. En el restaurante, escanea el QR de tu mesa.",
                )
              : t("En el restaurante, escanea el QR de tu mesa para pedir.")}
          </span>
        </span>
        {delivery?.enabled && (
          <Link
            href={href("/domicilio")}
            className={buttonClasses({ size: "sm", className: "shrink-0" })}
          >
            <Bike aria-hidden /> {t("Pedir")}
          </Link>
        )}
      </div>
    </div>
  );
}

function TableBrowseBar({ view, table }: { view: TableView; table: Table }) {
  const { asked, ask } = useBrowseAction(table);
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
