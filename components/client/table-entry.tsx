"use client";

import { ArrowRight, BellRing, ScanQrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MadeWithPlatterio, RestaurantMark } from "@/components/brand/logos";
import { DishImage } from "@/components/dish/dish-image";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { tableActions, useDishes, useOpenCalls, useRestaurant } from "@/lib/data";
import { ALIAS_MAX } from "@/lib/domain/session";
import type { Table } from "@/lib/domain/types";
import { ClientShell } from "./client-shell";
import { InvalidTable, useTableAccess } from "./table-gate";

const COLLAGE = ["clasica-27", "salchipapa-27", "limonada-de-coco"];

/**
 * Lo que abre el QR de la mesa: el QR es fijo y no da acceso por sí solo. Si el mesero ya abrió
 * la mesa, se entra con un alias corto y el PIN que él da; si no, se le puede avisar.
 */
export function TableEntry({ numero }: { numero: string }) {
  const access = useTableAccess(numero);
  const router = useRouter();
  const ready = access.status === "ready";

  useEffect(() => {
    if (ready) router.replace(`/mesa/${numero}/menu`);
  }, [ready, numero, router]);

  return (
    <ClientShell>
      {access.status === "invalid" ? (
        <InvalidTable />
      ) : access.status === "guest" && !access.session ? (
        <ClosedTable table={access.table} />
      ) : access.status === "guest" ? (
        <EntryForm tableNumber={access.table.number} diners={access.session?.diners.length ?? 0} />
      ) : (
        <EntrySkeleton />
      )}
    </ClientShell>
  );
}

function EntryForm({ tableNumber, diners }: { tableNumber: number; diners: number }) {
  const restaurant = useRestaurant();
  const dishes = useDishes();
  const router = useRouter();
  const [alias, setAlias] = useState("");
  // El QR que muestra el mesero trae el PIN en el enlace (?pin=1234).
  const [pin, setPin] = useState(
    () => new URLSearchParams(window.location.search).get("pin")?.replace(/\D/g, "") ?? "",
  );
  const [error, setError] = useState<string>();
  const collage = COLLAGE.map((id) => dishes.find((d) => d.id === id)).filter(
    (d) => d !== undefined,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = tableActions.join(tableNumber, alias, pin);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(`/mesa/${tableNumber}/menu`);
  }

  return (
    <div className="pb-safe flex flex-1 flex-col px-5 pt-6">
      <div className="flex items-center justify-between">
        <RestaurantMark name={restaurant.name} className="text-[15px]" />
        <span className="border-line-strong bg-surface inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold">
          <ScanQrCode className="text-accent-strong size-4" aria-hidden />
          Mesa {tableNumber}
        </span>
      </div>

      <div className="relative mt-8 mb-9 h-44" aria-hidden>
        {collage.map((dish, i) => (
          <DishImage
            key={dish.id}
            src={dish.photos[0]}
            name={dish.name}
            sizes="160px"
            priority
            rounded="rounded-2xl"
            initialClassName="text-5xl"
            className={
              [
                "shadow-float absolute top-4 left-0 h-36 w-[42%] -rotate-6",
                "shadow-float absolute top-0 left-[29%] z-10 h-40 w-[42%]",
                "shadow-float absolute top-5 right-0 h-36 w-[42%] rotate-6",
              ][i]
            }
          />
        ))}
      </div>

      <h1 className="font-display text-[34px] leading-[1.08] font-semibold tracking-tight">
        Pide desde tu mesa, sin afán.
      </h1>
      <p className="text-ink-soft mt-3 text-[16px] leading-relaxed">
        Mira la carta con fotos, ingredientes y alérgenos. El mesero confirma tu pedido antes de que
        pase a la cocina.
      </p>

      {diners > 0 && (
        <p className="bg-surface-2 text-ink-soft mt-5 rounded-xl px-3.5 py-3 text-sm">
          Tu mesa ya está abierta y {diners === 1 ? "hay 1 persona" : `hay ${diners} personas`}{" "}
          dentro. Entra con el PIN que te dio el mesero.
        </p>
      )}

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        <Field
          label="¿Cómo te llamamos?"
          hint="Así sabrán qué pidió cada quien en el pedido de la mesa."
          error={error}
        >
          {(p) => (
            <Input
              {...p}
              value={alias}
              onChange={(e) => {
                setAlias(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder="Tu nombre o un apodo"
              autoComplete="given-name"
              enterKeyHint="go"
              maxLength={ALIAS_MAX + 4}
              className="h-12 text-base"
            />
          )}
        </Field>
        <Field label="PIN de la mesa" hint="Te lo da el mesero o viene en el QR que te muestra.">
          {(p) => (
            <Input
              {...p}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                if (error) setError(undefined);
              }}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="4 dígitos"
              className="h-12 text-base tabular-nums"
            />
          )}
        </Field>
        <Button type="submit" size="lg" block>
          Ver la carta <ArrowRight aria-hidden />
        </Button>
      </form>

      <MadeWithPlatterio className="mt-auto pt-10" />
    </div>
  );
}

function ClosedTable({ table }: { table: Table }) {
  const restaurant = useRestaurant();
  const asked = useOpenCalls().some((c) => c.tableId === table.id && !c.resolved);
  return (
    <div className="pb-safe flex flex-1 flex-col px-5 pt-6">
      <div className="flex items-center justify-between">
        <RestaurantMark name={restaurant.name} className="text-[15px]" />
        <span className="border-line-strong bg-surface inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold">
          <ScanQrCode className="text-accent-strong size-4" aria-hidden />
          Mesa {table.number}
        </span>
      </div>
      <span className="bg-accent-soft text-accent-strong mt-16 flex size-14 items-center justify-center rounded-2xl">
        <BellRing className="size-6" aria-hidden />
      </span>
      <h1 className="font-display mt-5 text-[34px] leading-[1.08] font-semibold tracking-tight">
        Pide al mesero que abra tu mesa.
      </h1>
      <p className="text-ink-soft mt-3 text-[16px] leading-relaxed">
        El mesero abre la mesa cuando llegas y te da un PIN para entrar a la carta. Así solo pide
        quien está sentado.
      </p>
      <Button
        size="lg"
        block
        className="mt-6"
        disabled={asked}
        onClick={() => tableActions.requestOpen(table.number)}
      >
        <BellRing aria-hidden /> {asked ? "Ya avisamos al mesero" : "Avisar al mesero"}
      </Button>
      {asked && (
        <p role="status" className="text-ink-soft mt-3 text-sm">
          Ya le avisamos al equipo. Cuando abran tu mesa, esta pantalla te pedirá el PIN.
        </p>
      )}
      <MadeWithPlatterio className="mt-auto pt-10" />
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-6" aria-busy aria-label="Cargando">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-8 mb-6 h-44 rounded-2xl" />
      <Skeleton className="h-9 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-6 h-12 rounded-lg" />
      <Skeleton className="h-13 rounded-xl" />
    </div>
  );
}
