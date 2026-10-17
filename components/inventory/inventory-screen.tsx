"use client";

import Link from "next/link";
import { RoleGate, SessionButton } from "@/components/access/role-gate";
import { RestaurantMark } from "@/components/brand/logos";
import { PageHeader } from "@/components/admin/ui/page-header";
import { DemoPanel } from "@/components/demo/demo-panel";
import { useBusinessHref } from "@/components/providers/business-scope";
import { buttonClasses } from "@/components/ui/button";
import { HOME } from "@/lib/domain/access";
import { useCurrentStaff, useRestaurant } from "@/lib/data";
import { InventoryPanel } from "./inventory-panel";

/** Inventario: pantalla de la despensa. También la ven el encargado y el administrador. */
export function InventoryScreen() {
  return (
    <div className="bg-bg min-h-dvh">
      <RoleGate permission="inventario" label="Inventario">
        <Inventory />
      </RoleGate>
      <DemoPanel />
    </div>
  );
}

function Inventory() {
  const restaurant = useRestaurant();
  const staff = useCurrentStaff();
  const href = useBusinessHref();
  return (
    <>
      <header className="border-line bg-bg/92 sticky top-0 z-20 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <RestaurantMark name={restaurant.name} className="text-[13px]" />
          <span className="text-muted hidden text-sm sm:inline">· Inventario</span>
          <div className="ml-auto flex items-center gap-2">
            {staff && staff.role !== "despensa" && (
              <Link
                href={href(HOME[staff.role])}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                Volver
              </Link>
            )}
            <SessionButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-5 pb-16 sm:px-6">
        <PageHeader
          title="Inventario"
          description="Bebidas y productos terminados: lo que hay, lo que entra, lo que sale y lo que se vende."
        />
        <InventoryPanel />
      </main>
    </>
  );
}
