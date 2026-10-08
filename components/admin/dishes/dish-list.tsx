"use client";

import { Pencil, Plus, Search, SearchX, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DishImage } from "@/components/dish/dish-image";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingSummary } from "@/components/ui/stars";
import { toast } from "@/components/ui/toaster";
import {
  catalogActions,
  useCategories,
  useDishes,
  useDishRatingStats,
  useHydrated,
  useTimeSlots,
} from "@/lib/data";
import { matchesQuery, priceRange } from "@/lib/domain/menu";
import type { Dish } from "@/lib/domain/types";
import { customizationSpecFor } from "@/lib/data/customization-specs";
import { cn } from "@/lib/cn";
import { PageHeader } from "../ui/page-header";

/** Catálogo de platos (US-11): tabla con buscador, activar/desactivar y destacar. */
export function DishList() {
  const hydrated = useHydrated();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Platos"
        description="Todo lo que aparece en la carta. Los platos desactivados no se muestran ni se recomiendan, pero conservan su información."
        actions={
          <Link href="/admin/platos/nuevo" className={buttonClasses({})}>
            <Plus aria-hidden /> Nuevo plato
          </Link>
        }
      />
      {hydrated ? <Table /> : <Skeleton className="h-96 rounded-2xl" />}
    </div>
  );
}

function Table() {
  const dishes = useDishes();
  const categories = useCategories();
  const slots = useTimeSlots();
  const stats = useDishRatingStats();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [confirm, setConfirm] = useState<Dish | null>(null);

  const rows = useMemo(
    () =>
      dishes
        .filter((d) => (!category || d.categoryId === category) && matchesQuery(d, query))
        .sort((a, b) => {
          const ca = categories.find((c) => c.id === a.categoryId)?.order ?? 99;
          const cb = categories.find((c) => c.id === b.categoryId)?.order ?? 99;
          return ca - cb || a.name.localeCompare(b.name, "es");
        }),
    [dishes, categories, category, query],
  );
  const activeCount = dishes.filter((d) => d.active).length;

  return (
    <section className="border-line bg-surface shadow-card rounded-2xl border">
      <div className="border-line flex flex-wrap items-center gap-3 border-b p-4">
        <div className="relative min-w-60 flex-1">
          <Search
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o ingrediente"
            aria-label="Buscar platos"
            className="pl-10"
          />
        </div>
        <label className="sr-only" htmlFor="filtro-categoria">
          Categoría
        </label>
        <Select
          id="filtro-categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-52"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <p className="text-muted text-sm">
          {activeCount} activos de {dishes.length}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No hay platos que coincidan"
          description={query ? `Nada con “${query}”.` : undefined}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery("");
                setCategory("");
              }}
            >
              Limpiar búsqueda
            </Button>
          }
        />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-muted text-xs uppercase">
              <tr className="border-line border-b">
                <th scope="col" className="px-4 py-3 font-semibold tracking-wide">
                  Plato
                </th>
                <th scope="col" className="px-3 py-3 font-semibold tracking-wide">
                  Categoría
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold tracking-wide">
                  Precio
                </th>
                <th scope="col" className="px-3 py-3 font-semibold tracking-wide">
                  Franjas
                </th>
                <th scope="col" className="px-3 py-3 font-semibold tracking-wide">
                  Calificación
                </th>
                <th scope="col" className="px-3 py-3 text-center font-semibold tracking-wide">
                  Destacado
                </th>
                <th scope="col" className="px-3 py-3 text-center font-semibold tracking-wide">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {rows.map((dish) => {
                const { min, max } = priceRange(dish);
                const s = stats.get(dish.id);
                return (
                  <tr
                    key={dish.id}
                    className={cn(
                      "hover:bg-surface-2/50 transition-colors",
                      !dish.active && "text-muted",
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <DishImage
                          src={dish.photos[0]}
                          name={dish.name}
                          sizes="44px"
                          className={cn("size-11 shrink-0", !dish.active && "opacity-50 grayscale")}
                          initialClassName="text-lg"
                        />
                        <div className="min-w-0">
                          <p
                            className={cn("font-semibold", dish.active ? "text-ink" : "text-muted")}
                          >
                            {dish.name}
                          </p>
                          {customizationSpecFor(dish.id) ? (
                            <p className="text-success-ink text-xs font-medium">Visor 3D activo</p>
                          ) : (
                            dish.model3d && (
                              <p className="text-muted text-xs">
                                Modelo 3D subido, aún sin activar
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {categories.find((c) => c.id === dish.categoryId)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Price value={min} from={min !== max} />
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">
                      {dish.timeSlotIds.length === slots.length
                        ? "Todas"
                        : dish.timeSlotIds
                            .map((id) => slots.find((x) => x.id === id)?.name)
                            .filter(Boolean)
                            .join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <RatingSummary average={s?.average ?? null} count={s?.count ?? 0} compact />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        aria-pressed={dish.featured}
                        aria-label={
                          dish.featured
                            ? `Quitar ${dish.name} de destacados`
                            : `Destacar ${dish.name}`
                        }
                        onClick={() => {
                          catalogActions.setFeatured(dish.id, !dish.featured);
                          toast.success(
                            dish.featured
                              ? `${dish.name} ya no está destacado`
                              : `${dish.name} ahora es recomendado por la casa`,
                          );
                        }}
                        className="hover:bg-surface-2 inline-flex size-10 items-center justify-center rounded-full"
                      >
                        <Star
                          className={cn(
                            "size-5",
                            dish.featured ? "fill-[#E9A23B] text-[#C9851F]" : "text-line-strong",
                          )}
                          aria-hidden
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={dish.active}
                        aria-label={`${dish.name}: ${dish.active ? "activo" : "desactivado"}`}
                        onClick={() => {
                          if (dish.active) setConfirm(dish);
                          else {
                            catalogActions.setActive(dish.id, true);
                            toast.success(`${dish.name} vuelve a la carta`);
                          }
                        }}
                      >
                        <Badge tone={dish.active ? "success" : "neutral"}>
                          {dish.active ? "Activo" : "Desactivado"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/admin/platos/${dish.id}`}
                        className={buttonClasses({ variant: "ghost", size: "sm" })}
                      >
                        <Pencil aria-hidden /> Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`¿Desactivar ${confirm?.name ?? "el plato"}?`}
        description="Dejará de aparecer en la carta y en los recomendados. Su información, fotos y calificaciones se conservan, y puedes activarlo cuando quieras."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm) {
                  catalogActions.setActive(confirm.id, false);
                  toast(`${confirm.name} desactivado`, {
                    description: "Ya no aparece en la carta.",
                  });
                }
                setConfirm(null);
              }}
            >
              Desactivar
            </Button>
          </>
        }
      />
    </section>
  );
}
