"use client";

import { ArrowRight, ScanQrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MadeWithPlatterio, RestaurantMark } from "@/components/brand/logos";
import { DishImage } from "@/components/dish/dish-image";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { tableActions, useDishes, useRestaurant } from "@/lib/data";
import { ALIAS_MAX } from "@/lib/domain/session";
import { ClientShell } from "./client-shell";
import { InvalidTable, useTableAccess } from "./table-gate";

const COLLAGE = ["clasica-27", "salchipapa-27", "limonada-de-coco"];

/** Lo que abre el QR de la mesa (US-21): se entra con un alias corto. */
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
      ) : access.status === "guest" ? (
        <EntryForm
          tableNumber={access.table.number}
          others={access.session?.diners.map((d) => d.alias) ?? []}
        />
      ) : (
        <EntrySkeleton />
      )}
    </ClientShell>
  );
}

function EntryForm({ tableNumber, others }: { tableNumber: number; others: string[] }) {
  const restaurant = useRestaurant();
  const dishes = useDishes();
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string>();
  const collage = COLLAGE.map((id) => dishes.find((d) => d.id === id)).filter(
    (d) => d !== undefined,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = tableActions.join(tableNumber, alias);
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

      {others.length > 0 && (
        <div className="bg-surface-2 mt-5 flex items-center gap-3 rounded-xl px-3.5 py-3">
          <div className="flex -space-x-2" aria-hidden>
            {others.slice(0, 4).map((name) => (
              <span
                key={name}
                className="border-surface-2 bg-accent-soft text-accent-strong flex size-8 items-center justify-center rounded-full border-2 text-[13px] font-bold"
              >
                {name.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <p className="text-ink-soft text-sm">
            Ya están en la mesa: <span className="text-ink font-semibold">{others.join(", ")}</span>
          </p>
        </div>
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
        <Button type="submit" size="lg" block>
          Ver la carta <ArrowRight aria-hidden />
        </Button>
      </form>

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
