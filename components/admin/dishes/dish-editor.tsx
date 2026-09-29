"use client";

import {
  ArrowLeft,
  Box,
  CircleAlert,
  ImagePlus,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { DishImage } from "@/components/dish/dish-image";
import { ALLERGEN_ICON, AllergenList } from "@/components/ui/allergen";
import { Button, buttonClasses, IconButton } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Spice } from "@/components/ui/spice";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { catalogActions, useCategories, useDishes, useHydrated, useTimeSlots } from "@/lib/data";
import { ALLERGEN_LABEL, dishAllergens, SPICE_LABEL } from "@/lib/domain/allergens";
import {
  dishToDraft,
  emptyDraft,
  formatBytes,
  parsePrice,
  validateDishDraft,
  validateModelFile,
  type DishDraft,
  type DishFormErrors,
} from "@/lib/domain/dishForm";
import { formatClock, formatCOP } from "@/lib/domain/format";
import { ALLERGENS, type SpiceLevel } from "@/lib/domain/types";
import { resizeImage } from "@/lib/image";
import { cn } from "@/lib/cn";

const MAX_PHOTOS = 4;

export function DishEditorScreen({ id }: { id: string }) {
  const hydrated = useHydrated();
  const dishes = useDishes();
  if (!hydrated) return <Skeleton className="mx-auto h-[70dvh] max-w-6xl rounded-2xl" />;
  const isNew = id === "nuevo";
  const dish = dishes.find((d) => d.id === id);
  if (!isNew && !dish) {
    return (
      <EmptyState
        icon={CircleAlert}
        title="No encontramos ese plato"
        action={
          <Link href="/admin/platos" className={buttonClasses({ variant: "secondary" })}>
            Volver a Platos
          </Link>
        }
      />
    );
  }
  return <DishEditor key={id} initial={dish ? dishToDraft(dish) : emptyDraft()} isNew={isNew} />;
}

/** Crear y editar la ficha del plato (US-11, US-12), con validación de campos obligatorios. */
function DishEditor({ initial, isNew }: { initial: DishDraft; isNew: boolean }) {
  const router = useRouter();
  const categories = useCategories();
  const slots = useTimeSlots();
  const [draft, setDraft] = useState<DishDraft>(initial);
  const dishes = useDishes();
  // Después del primer intento de guardar, los errores se recalculan en vivo al corregir.
  const [submitted, setSubmitted] = useState(false);
  const errors: DishFormErrors = submitted
    ? validateDishDraft(draft, {
        categoryIds: categories.map((c) => c.id),
        otherNames: dishes.filter((d) => d.id !== draft.id).map((d) => d.name),
      })
    : {};
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [modelError, setModelError] = useState<string>();
  const photoInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof DishDraft>(key: K, value: DishDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const errorCount =
    Object.keys(errors).filter((k) => k !== "variantRows" && k !== "ingredientRows").length +
    Object.keys(errors.variantRows ?? {}).length +
    Object.keys(errors.ingredientRows ?? {}).length;
  const previewAllergens = dishAllergens({
    ingredients: draft.ingredients.filter((i) => i.name.trim()),
  });

  function save() {
    setSubmitted(true);
    const result = catalogActions.saveDish(draft);
    if (!result.ok) {
      toast.error("Revisa los campos marcados");
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"]')?.focus(),
      );
      return;
    }
    toast.success(isNew ? `${draft.name.trim()} ya está en la carta` : "Cambios guardados", {
      description: draft.active
        ? draft.featured
          ? "Aparece en la carta y en los recomendados."
          : "Ya lo ven los clientes."
        : "Está desactivado: no se muestra en la carta.",
    });
    router.push("/admin/platos");
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - draft.photos.length;
    const chosen = [...files].filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (chosen.length === 0)
      return toast.error(room === 0 ? `Máximo ${MAX_PHOTOS} fotos` : "Elige archivos de imagen");
    try {
      const urls = await Promise.all(chosen.map((f) => resizeImage(f)));
      setDraft((d) => ({ ...d, photos: [...d.photos, ...urls] }));
    } catch {
      toast.error("No pudimos leer una de las fotos");
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-28">
      <Link
        href="/admin/platos"
        className={buttonClasses({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ArrowLeft aria-hidden /> Platos
      </Link>
      <h1 className="font-display mt-2 text-[34px] leading-tight font-semibold">
        {isNew ? "Nuevo plato" : draft.name || "Editar plato"}
      </h1>

      {errorCount > 0 && (
        <div
          role="alert"
          className="border-danger/30 bg-danger-soft mt-4 flex items-start gap-3 rounded-xl border p-4"
        >
          <CircleAlert className="text-danger mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="text-danger-ink font-semibold">
              Faltan datos para guardar ({errorCount})
            </p>
            <p className="text-ink-soft text-sm">
              Son obligatorios: nombre, precio, categoría, ingredientes y al menos una foto.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card title="Información básica">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" error={errors.name} className="sm:col-span-2">
                {(p) => (
                  <Input
                    {...p}
                    value={draft.name}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={70}
                    placeholder="Por ejemplo: La Paisa"
                  />
                )}
              </Field>
              <Field label="Categoría" error={errors.categoryId}>
                {(p) => (
                  <Select
                    {...p}
                    value={draft.categoryId}
                    onChange={(e) => set("categoryId", e.target.value)}
                  >
                    <option value="">Elige una categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium">Picante</p>
                <Segmented
                  label="Nivel de picante"
                  value={String(draft.spiceLevel) as "0" | "1" | "2" | "3"}
                  onChange={(v) => set("spiceLevel", Number(v) as SpiceLevel)}
                  options={(["Sin", "Suave", "Medio", "Muy"] as const).map((label, l) => ({
                    value: String(l) as "0" | "1" | "2" | "3",
                    label,
                  }))}
                />
                <p className="text-muted mt-1.5 flex items-center gap-2 text-[13px]">
                  <Spice level={draft.spiceLevel} withLabel showEmpty />
                </p>
              </div>
              <Field
                label="Descripción"
                optional
                hint={`${draft.description.length}/200 · Una o dos líneas, apetitosa y concreta`}
                error={errors.description}
                className="sm:col-span-2"
              >
                {(p) => (
                  <Textarea
                    {...p}
                    value={draft.description}
                    onChange={(e) => set("description", e.target.value)}
                    maxLength={220}
                    rows={2}
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card
            title="Precios y opciones"
            description="Cada opción tiene su propio precio (Sencilla / Doble, tamaños, sabores)."
          >
            <ul className="flex flex-col gap-3">
              {draft.variants.map((v, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,160px)_44px] items-start gap-2"
                >
                  <Field label={`Opción ${i + 1}`} error={undefined}>
                    {(p) => (
                      <Input
                        {...p}
                        value={v.name}
                        placeholder={draft.variants.length === 1 ? "Única" : "Sencilla"}
                        onChange={(e) =>
                          set(
                            "variants",
                            draft.variants.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    )}
                  </Field>
                  <Field label="Precio" error={errors.variantRows?.[i]}>
                    {(p) => (
                      <Input
                        {...p}
                        inputMode="numeric"
                        value={v.price}
                        placeholder="22.900"
                        onChange={(e) =>
                          set(
                            "variants",
                            draft.variants.map((x, j) =>
                              j === i ? { ...x, price: e.target.value } : x,
                            ),
                          )
                        }
                        onBlur={() => {
                          const n = parsePrice(v.price);
                          if (n)
                            set(
                              "variants",
                              draft.variants.map((x, j) =>
                                j === i ? { ...x, price: formatCOP(n).slice(1) } : x,
                              ),
                            );
                        }}
                      />
                    )}
                  </Field>
                  <IconButton
                    label={`Quitar opción ${i + 1}`}
                    className="mt-6.5"
                    disabled={draft.variants.length === 1}
                    onClick={() =>
                      set(
                        "variants",
                        draft.variants.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => set("variants", [...draft.variants, { name: "", price: "" }])}
            >
              <Plus aria-hidden /> Agregar opción
            </Button>
          </Card>

          <Card
            title="Ingredientes"
            description="Los alérgenos del plato se calculan a partir de los de cada ingrediente."
            error={errors.ingredients}
          >
            <ul className="flex flex-col gap-4">
              {draft.ingredients.map((ing, i) => (
                <li key={i} className="border-line rounded-xl border p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] items-start gap-2">
                    <Field label="Ingrediente" error={errors.ingredientRows?.[i]}>
                      {(p) => (
                        <Input
                          {...p}
                          value={ing.name}
                          placeholder="Pan brioche"
                          onChange={(e) =>
                            set(
                              "ingredients",
                              draft.ingredients.map((x, j) =>
                                j === i ? { ...x, name: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      )}
                    </Field>
                    <Field label="Descripción" optional>
                      {(p) => (
                        <Input
                          {...p}
                          value={ing.description}
                          placeholder="Horneado en casa"
                          onChange={(e) =>
                            set(
                              "ingredients",
                              draft.ingredients.map((x, j) =>
                                j === i ? { ...x, description: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      )}
                    </Field>
                    <IconButton
                      label={`Quitar ingrediente ${i + 1}`}
                      className="mt-6.5"
                      disabled={draft.ingredients.length === 1}
                      onClick={() =>
                        set(
                          "ingredients",
                          draft.ingredients.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 aria-hidden />
                    </IconButton>
                  </div>
                  <fieldset className="mt-2">
                    <legend className="text-muted mb-1.5 text-[13px]">
                      Alérgenos de este ingrediente
                    </legend>
                    <div className="flex flex-wrap gap-1.5">
                      {ALLERGENS.map((a) => {
                        const Icon = ALLERGEN_ICON[a];
                        const on = ing.allergens.includes(a);
                        return (
                          <FilterChip
                            key={a}
                            selected={on}
                            className="h-9 px-3 text-[13px]"
                            onClick={() =>
                              set(
                                "ingredients",
                                draft.ingredients.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        allergens: on
                                          ? x.allergens.filter((y) => y !== a)
                                          : [...x.allergens, a],
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            <Icon aria-hidden strokeWidth={1.8} /> {ALLERGEN_LABEL[a]}
                          </FilterChip>
                        );
                      })}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() =>
                set("ingredients", [
                  ...draft.ingredients,
                  { name: "", description: "", allergens: [] },
                ])
              }
            >
              <Plus aria-hidden /> Agregar ingrediente
            </Button>
            <div className="bg-surface-2/70 mt-4 rounded-xl p-3">
              <p className="text-muted mb-2 text-[13px] font-medium">
                Así se verán los alérgenos en la carta
              </p>
              <AllergenList allergens={previewAllergens} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card
            title="Fotos"
            description={`Hasta ${MAX_PHOTOS}. La primera es la principal.`}
            error={errors.photos}
          >
            <div className="grid grid-cols-2 gap-2">
              {draft.photos.map((src, i) => (
                <div key={i} className="group relative">
                  <DishImage
                    src={src}
                    name={draft.name || "Plato"}
                    sizes="200px"
                    className="aspect-[4/3] w-full"
                  />
                  {i === 0 && (
                    <span className="bg-surface/90 absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold">
                      Principal
                    </span>
                  )}
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    {i > 0 && (
                      <IconButton
                        label="Usar como principal"
                        variant="surface"
                        className="size-9"
                        onClick={() =>
                          set("photos", [src, ...draft.photos.filter((_, j) => j !== i)])
                        }
                      >
                        <Star aria-hidden />
                      </IconButton>
                    )}
                    <IconButton
                      label={`Quitar foto ${i + 1}`}
                      variant="surface"
                      className="size-9"
                      onClick={() =>
                        set(
                          "photos",
                          draft.photos.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <X aria-hidden />
                    </IconButton>
                  </div>
                </div>
              ))}
              {draft.photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  data-error={Boolean(errors.photos)}
                  onClick={() => photoInput.current?.click()}
                  className={cn(
                    "text-muted hover:border-ink/40 hover:text-ink flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-sm font-medium transition-colors",
                    errors.photos ? "border-danger" : "border-line-strong",
                  )}
                >
                  <ImagePlus className="size-6" aria-hidden /> Subir foto
                </button>
              )}
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-label="Subir fotos del plato"
              onChange={(e) => {
                void addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </Card>

          <Card title="Visibilidad">
            <Switch
              checked={draft.active}
              onChange={(on) => (on ? set("active", true) : setConfirmDeactivate(true))}
              label="Activo en la carta"
              description="Si lo desactivas no se muestra ni se recomienda."
            />
            <Switch
              className="mt-2"
              checked={draft.featured}
              onChange={(on) => set("featured", on)}
              label="Destacado por la casa"
              description="Suma puntos en los recomendados."
            />
          </Card>

          <Card title="Franjas horarias" description="Cuándo se recomienda este plato.">
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => {
                const on = draft.timeSlotIds.includes(s.id);
                return (
                  <FilterChip
                    key={s.id}
                    selected={on}
                    onClick={() =>
                      set(
                        "timeSlotIds",
                        on
                          ? draft.timeSlotIds.filter((x) => x !== s.id)
                          : [...draft.timeSlotIds, s.id],
                      )
                    }
                  >
                    {s.name}
                    <span className="text-xs opacity-70">
                      {formatClock(s.start).replace(/:00/, "")}
                    </span>
                  </FilterChip>
                );
              })}
            </div>
          </Card>

          <Card
            title="Modelo 3D"
            description="Archivo .glb de hasta 4 MB. El visor llega en la siguiente épica; por ahora se guarda el nombre y el tamaño."
          >
            {draft.model3d ? (
              <div className="bg-surface-2 flex items-center gap-3 rounded-xl p-3">
                <Box className="text-accent-strong size-6" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{draft.model3d.fileName}</p>
                  <p className="text-muted text-[13px]">{formatBytes(draft.model3d.sizeBytes)}</p>
                </div>
                <IconButton label="Quitar modelo 3D" onClick={() => set("model3d", undefined)}>
                  <X aria-hidden />
                </IconButton>
              </div>
            ) : (
              <Button variant="secondary" block onClick={() => modelInput.current?.click()}>
                <Upload aria-hidden /> Subir archivo .glb
              </Button>
            )}
            {modelError && (
              <p
                role="alert"
                className="text-danger-ink mt-2 flex items-center gap-1.5 text-[13px] font-medium"
              >
                <CircleAlert className="size-4" aria-hidden /> {modelError}
              </p>
            )}
            <input
              ref={modelInput}
              type="file"
              accept=".glb,model/gltf-binary"
              className="sr-only"
              aria-label="Subir modelo 3D en formato .glb"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const error = validateModelFile({ name: file.name, size: file.size });
                setModelError(error ?? undefined);
                if (!error) set("model3d", { fileName: file.name, sizeBytes: file.size });
              }}
            />
          </Card>
        </div>
      </div>

      <div className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur lg:left-[288px]">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-5 py-3 sm:px-8 lg:px-10">
          <p className="text-muted mr-auto hidden text-sm sm:block">
            {draft.active
              ? "Se verá en la carta al guardar."
              : "Desactivado: no se mostrará en la carta."}{" "}
            Picante: {SPICE_LABEL[draft.spiceLevel].toLowerCase()}.
          </p>
          <Link href="/admin/platos" className={buttonClasses({ variant: "secondary" })}>
            Cancelar
          </Link>
          <Button onClick={save}>{isNew ? "Crear plato" : "Guardar cambios"}</Button>
        </div>
      </div>

      <Dialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title="¿Desactivar este plato?"
        description="Al guardar dejará de aparecer en la carta y en los recomendados. Su información se conserva."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeactivate(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                set("active", false);
                setConfirmDeactivate(false);
              }}
            >
              Desactivar
            </Button>
          </>
        }
      />
    </div>
  );
}

function Card({
  title,
  description,
  error,
  children,
}: {
  title: string;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "bg-surface shadow-card rounded-2xl border p-5",
        error ? "border-danger/40" : "border-line",
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-muted mt-0.5 mb-4 text-sm">{description}</p>}
      {!description && <div className="mb-4" />}
      {error && (
        <p className="text-danger-ink -mt-2 mb-3 flex items-center gap-1.5 text-[13px] font-medium">
          <CircleAlert className="size-4" aria-hidden /> {error}
        </p>
      )}
      {children}
    </section>
  );
}
