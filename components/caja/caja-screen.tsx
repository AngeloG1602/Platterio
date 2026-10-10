"use client";

import { useState } from "react";
import { RoleGate, SessionButton } from "@/components/access/role-gate";
import { RestaurantMark, PlatterioLogo } from "@/components/brand/logos";
import { CashPanel } from "./cash-panel";
import { ReservationsBoard } from "./reservations-board";
import { DeliveryBoard, useDeliveryArrivalNotice, useNewDeliveryCount } from "./delivery-board";
import { DemoPanel } from "@/components/demo/demo-panel";
import { TableAssignments } from "@/components/team/table-assignments";
import { TeamManager } from "@/components/team/team-manager";
import { Segmented } from "@/components/ui/segmented";
import { SalonView } from "@/components/waiter/waiter-screen";
import {
  useDeliveryItems,
  useNewReservationCount,
  useNow,
  useRestaurant,
  useSalonBoard,
} from "@/lib/data";
import { formatTime, plural } from "@/lib/domain/format";

type Tab = "salon" | "domicilios" | "reservas" | "caja" | "mesas" | "equipo";

/**
 * Caja: para el encargado (y el administrador). Ve y opera todo el salón y administra al
 * equipo de servicio, pero no entra al panel completo del administrador.
 */
export function CajaScreen() {
  return (
    <div className="bg-bg min-h-dvh">
      <RoleGate permission="mesas.todas" label="Caja">
        <Caja />
      </RoleGate>
      <DemoPanel />
    </div>
  );
}

function Caja() {
  const restaurant = useRestaurant();
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>("salon");
  const board = useSalonBoard();
  const newDeliveries = useNewDeliveryCount();
  const newReservations = useNewReservationCount();
  useDeliveryArrivalNotice(useDeliveryItems());
  const occupied = board.overviews.filter((o) => o.status !== "libre").length;

  return (
    <>
      <header className="border-line bg-bg/92 sticky top-0 z-20 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <RestaurantMark name={restaurant.name} className="text-[13px]" />
          <span className="text-muted hidden text-sm sm:inline">· Caja</span>
          <span className="text-ink-soft ml-auto text-sm font-semibold tabular-nums">
            {formatTime(new Date(now))}
          </span>
          <SessionButton />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <Segmented
          label="Secciones de caja"
          value={tab}
          onChange={setTab}
          className="w-full sm:w-auto sm:min-w-[640px]"
          options={[
            { value: "salon", label: "Salón" },
            {
              value: "domicilios",
              label: newDeliveries > 0 ? `Domicilios (${newDeliveries})` : "Domicilios",
            },
            {
              value: "reservas",
              label: newReservations > 0 ? `Reservas (${newReservations})` : "Reservas",
            },
            { value: "caja", label: "Caja" },
            { value: "mesas", label: "Mesas y meseros" },
            { value: "equipo", label: "Equipo" },
          ]}
        />
      </div>

      {tab === "salon" && (
        <SalonView
          heading="Todo el salón"
          subheading={`${plural(board.overviews.length, "mesa", "mesas")} · ${plural(occupied, "ocupada", "ocupadas")}`}
          mapTitle="Mesas"
          emptyTitle="No hay mesas"
          emptyDescription="Agrega mesas en la configuración del administrador."
          overviews={board.overviews}
          pending={board.pending}
          ready={board.ready}
          inKitchen={board.inKitchen}
        />
      )}
      {tab === "domicilios" && <DeliveryBoard />}
      {tab === "reservas" && <ReservationsBoard />}
      {tab === "caja" && <CashPanel />}
      {tab === "mesas" && (
        <main className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6">
          <TableAssignments onTeam={() => setTab("equipo")} />
        </main>
      )}
      {tab === "equipo" && (
        <main className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6">
          <TeamManager />
        </main>
      )}
      <footer className="pb-6 text-center">
        <PlatterioLogo tone="muted" className="scale-75" />
      </footer>
    </>
  );
}
