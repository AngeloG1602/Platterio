"use client";

import { TeamManager } from "@/components/team/team-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/lib/data";
import { PageHeader } from "./ui/page-header";
import { StaffEntryCard } from "./staff-entry-card";

/** Equipo: usuarios del negocio, sus roles y PIN. */
export function TeamAdmin() {
  const hydrated = useHydrated();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Equipo"
        description="Quién entra al sistema y qué puede hacer. Administrador, encargado de caja, meseros y cocina."
      />
      {hydrated && <StaffEntryCard />}
      {hydrated ? <TeamManager /> : <Skeleton className="h-96 rounded-2xl" />}
    </div>
  );
}
