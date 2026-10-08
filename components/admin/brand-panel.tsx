"use client";

import { Check, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { brandActions, restaurantActions, useDishes, useRestaurant } from "@/lib/data";
import { MenuHeader } from "@/components/brand/menu-header";
import { DishCard } from "@/components/dish/dish-card";
import { DishList, MenuStyleProvider } from "@/components/dish/dish-layout";
import { MENU_STYLES, type MenuStyle } from "@/lib/domain/menu-style";
import {
  brandVars,
  COVER_MAX_DATA_URL,
  coverTargetSize,
  validateCoverData,
  BODY_FONTS,
  FONTS,
  HEADING_FONTS,
  logoTargetSize,
  resolveBrand,
  TEMPLATES,
  validateLogoFile,
  type FontId,
  type Template,
} from "@/lib/domain/brand";
import { strongVariant } from "@/lib/domain/color";
import { cn } from "@/lib/cn";
import { Panel } from "./ui/page-header";

/** Identidad del negocio: logo, plantilla y tipografías. Se aplica al instante en toda la app. */
export function BrandIdentityPanel() {
  const restaurant = useRestaurant();
  const brand = resolveBrand(restaurant);
  return (
    <Panel
      title="Identidad de marca"
      description="Logo, estilo de la carta, colores y tipografías de tu negocio. El cliente lo ve en la carta, y el color de acento lo eliges abajo."
    >
      <div className="flex flex-col gap-8">
        <LogoField logo={brand.logo} name={restaurant.name} />
        <StyleSection currentId={brand.style.id} cover={brand.cover} />
        <section aria-labelledby="plantillas">
          <h3 id="plantillas" className="text-[15px] font-semibold">
            Paleta de colores
          </h3>
          <p className="text-muted text-[13px]">
            Cambia colores, tipografías y el acento de una vez. Luego puedes ajustar lo que quieras.
            {brand.style.colors
              ? ` El estilo ${brand.style.name} trae sus propios fondos, así que la paleta cambia sobre todo el acento.`
              : ""}
          </p>
          <div
            role="radiogroup"
            aria-label="Plantillas"
            className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {TEMPLATES.map((t) => (
              <TemplateCard key={t.id} template={t} selected={brand.template.id === t.id} />
            ))}
          </div>
        </section>
        <section aria-labelledby="tipografias" className="grid gap-4 sm:grid-cols-2">
          <h3 id="tipografias" className="text-[15px] font-semibold sm:col-span-2">
            Tipografías
          </h3>
          <FontSelect
            label="Títulos"
            value={brand.headingFont}
            options={HEADING_FONTS}
            onChange={(heading) => brandActions.setFonts({ heading })}
            sample="Hamburguesa de la casa"
            display
          />
          <FontSelect
            label="Texto"
            value={brand.bodyFont}
            options={BODY_FONTS}
            onChange={(body) => brandActions.setFonts({ body })}
            sample="Pan brioche, queso y salsa de la casa"
          />
          <div className="sm:col-span-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                brandActions.resetFonts();
                toast.success("Tipografías del estilo");
              }}
            >
              Volver a las del estilo
            </Button>
          </div>
        </section>
      </div>
    </Panel>
  );
}

function TemplateCard({ template, selected }: { template: Template; selected: boolean }) {
  const c = template.colors;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        const r = brandActions.applyTemplate(template.id);
        if (!r.ok) return toast.error(r.error);
        toast.success(`Plantilla ${template.name}`);
      }}
      className={cn(
        "rounded-xl border-2 p-3 text-left transition",
        selected ? "border-ink" : "border-line hover:border-line-strong",
      )}
    >
      <span
        aria-hidden
        className="block rounded-lg p-3"
        style={{ background: c.bg, border: `1px solid ${c.line}` }}
      >
        <span
          className="block text-[20px] leading-tight font-semibold"
          style={{ color: c.ink, fontFamily: FONTS[template.headingFont].family }}
        >
          Clásica 27
        </span>
        <span
          className="mt-0.5 block text-[12px]"
          style={{ color: c.muted, fontFamily: FONTS[template.bodyFont].family }}
        >
          Pan brioche, queso y salsa
        </span>
        <span className="mt-2 flex items-center gap-2">
          <span
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-white"
            style={{ background: strongVariant(template.accent) }}
          >
            Agregar
          </span>
          <span className="size-4 rounded-full" style={{ background: c.surface2 }} />
        </span>
      </span>
      <span className="mt-2 flex items-center gap-1.5 text-[15px] font-semibold">
        {selected && <Check className="size-4" aria-hidden />}
        {template.name}
      </span>
      <span className="text-muted block text-[13px]">{template.description}</span>
    </button>
  );
}

function FontSelect({
  label,
  value,
  options,
  onChange,
  sample,
  display,
}: {
  label: string;
  value: FontId;
  options: FontId[];
  onChange: (v: FontId) => void;
  sample: string;
  display?: boolean;
}) {
  const id = `fuente-${label}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as FontId)}>
        {options.map((f) => (
          <option key={f} value={f}>
            {FONTS[f].label}
          </option>
        ))}
      </Select>
      <p
        className={cn("mt-2 text-[18px]", display && "font-semibold")}
        style={{ fontFamily: FONTS[value].family }}
      >
        {sample}
      </p>
    </div>
  );
}

function LogoField({ logo, name }: { logo?: string; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File) {
    const bad = validateLogoFile(file);
    if (bad) return toast.error(bad);
    setBusy(true);
    try {
      const dataUrl = await shrink(file);
      const r = brandActions.setLogo(dataUrl);
      if (!r.ok) return toast.error(r.error);
      toast.success("Logo actualizado");
    } catch {
      toast.error("No pudimos leer esa imagen");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section aria-labelledby="logo" className="flex flex-wrap items-center gap-4">
      <div className="border-line bg-surface-2 flex size-24 items-center justify-center overflow-hidden rounded-2xl border">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa del logo propio
          <img src={logo} alt={`Logo de ${name}`} className="size-full object-contain p-2" />
        ) : (
          <ImagePlus className="text-muted size-7" aria-hidden />
        )}
      </div>
      <div className="min-w-48 flex-1">
        <h3 id="logo" className="text-[15px] font-semibold">
          Logo
        </h3>
        <p className="text-muted text-[13px]">
          PNG, JPG o WebP, hasta 3 MB. Se reduce solo para que cargue rápido. Mejor si tiene fondo
          transparente.
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <ImagePlus aria-hidden /> {logo ? "Cambiar logo" : "Subir logo"}
          </Button>
          {logo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                brandActions.setLogo(null);
                toast.success("Logo quitado");
              }}
            >
              <Trash2 aria-hidden /> Quitar
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Archivo del logo"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
          }}
        />
      </div>
    </section>
  );
}

/** Reduce la imagen en el navegador; los PNG y WebP conservan su transparencia. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = logoTargetSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return file.type === "image/jpeg"
    ? canvas.toDataURL("image/jpeg", 0.85)
    : canvas.toDataURL("image/webp", 0.9);
}

/* ——— Estilo de la carta ——— */

function StyleSection({ currentId, cover }: { currentId: string; cover?: string }) {
  const restaurant = useRestaurant();
  const [pickedId, setPickedId] = useState(currentId);
  const picked = MENU_STYLES.find((s) => s.id === pickedId) ?? MENU_STYLES[0]!;
  const changed = picked.id !== currentId;
  return (
    <section aria-labelledby="estilos" className="flex flex-col gap-4">
      <div>
        <h3 id="estilos" className="text-[15px] font-semibold">
          Estilo de la carta
        </h3>
        <p className="text-muted text-[13px]">
          Cambia la forma de toda la carta: distribución, esquinas, tipo de letra y si el fondo es
          claro u oscuro. Tu logo, tu nombre y tu color de acento se mantienen en cualquiera.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,380px)]">
        <div
          role="radiogroup"
          aria-label="Estilos de la carta"
          className="grid content-start gap-3 sm:grid-cols-2"
        >
          {MENU_STYLES.map((s) => (
            <StyleCard
              key={s.id}
              style={s}
              selected={s.id === pickedId}
              current={s.id === currentId}
              onPick={() => setPickedId(s.id)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <StylePreview
            style={picked}
            accent={restaurant.accentColor}
            name={restaurant.name}
            template={restaurant.brand?.template ?? "calido"}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!changed}
              onClick={() => {
                const r = brandActions.applyStyle(picked.id);
                if (!r.ok) return toast.error(r.error);
                toast.success(`Estilo ${picked.name}`);
              }}
            >
              {changed ? `Usar ${picked.name}` : "Estilo en uso"}
            </Button>
            {picked.suggestedAccent.toUpperCase() !== restaurant.accentColor.toUpperCase() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  applyAccent(picked.suggestedAccent);
                }}
              >
                Probar su color sugerido
              </Button>
            )}
          </div>
          <p className="text-muted text-[13px]">
            Ideal para: {picked.suits}.
            {picked.plan === "profesional"
              ? " Incluido en el plan Profesional (en la demo puedes probar todos)."
              : " Incluido en todos los planes."}
          </p>
        </div>
      </div>
      <CoverField cover={cover} />
    </section>
  );
}

function applyAccent(hex: string) {
  restaurantActions.setAccentColor(hex);
  toast.success("Color de acento actualizado");
}

function StyleCard({
  style,
  selected,
  current,
  onPick,
}: {
  style: MenuStyle;
  selected: boolean;
  current: boolean;
  onPick: () => void;
}) {
  const c = style.colors;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={cn(
        "rounded-xl border-2 p-3 text-left transition",
        selected ? "border-ink" : "border-line hover:border-line-strong",
      )}
    >
      <span className="flex items-center gap-1.5 text-[15px] font-semibold">
        {selected && <Check className="size-4" aria-hidden />}
        {style.name}
        {current && (
          <span className="bg-accent-soft text-accent-strong rounded-full px-2 py-0.5 text-[11px] font-semibold">
            En uso
          </span>
        )}
        {style.plan === "profesional" && (
          <span className="bg-surface-2 text-ink-soft ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold">
            Profesional
          </span>
        )}
      </span>
      <span className="text-muted mt-0.5 block text-[13px]">{style.description}</span>
      <span aria-hidden className="mt-2 flex items-center gap-1.5">
        {[
          c?.bg ?? "#FAF7F2",
          c?.surface ?? "#FFFFFF",
          c?.ink ?? "#1C1917",
          style.suggestedAccent,
        ].map((hex, i) => (
          <span
            key={i}
            className="border-line-strong size-5 rounded-full border"
            style={{ background: hex }}
          />
        ))}
        <span className="text-muted ml-1 text-[12px]">
          {style.dark ? "Oscuro" : "Claro"} · {LAYOUT_LABEL[style.layout]}
        </span>
      </span>
    </button>
  );
}

const LAYOUT_LABEL = {
  lista: "Lista",
  cuadricula: "Cuadrícula",
  carta: "Carta impresa",
  tarjetas: "Tarjetas",
} as const;

/** Muestra el estilo con los platos y el logo reales del negocio, sin tocar lo guardado. */
function StylePreview({
  style,
  accent,
  name,
  template,
}: {
  style: MenuStyle;
  accent: string;
  name: string;
  template: string;
}) {
  const dishes = useDishes()
    .filter((d) => d.active)
    .slice(0, 3);
  const vars = brandVars(
    { accentColor: accent, brand: { template, style: style.id } },
    { styled: true },
  );
  return (
    <div
      role="img"
      aria-label={`Vista previa del estilo ${style.name}`}
      className="border-line-strong relative max-h-[560px] overflow-hidden rounded-2xl border"
    >
      <div
        className="bg-bg text-ink font-sans"
        style={vars as React.CSSProperties}
        aria-hidden
        inert
      >
        <MenuStyleProvider style={style}>
          <MenuHeader
            name={name}
            actions={
              <span className="bg-surface-2 text-ink-soft rounded-full px-3 py-1.5 text-[13px] font-semibold">
                Mesa 4
              </span>
            }
          />
          <div className="px-4 pt-4">
            <h4 className="font-display text-[24px] leading-tight font-semibold">
              ¿Qué se te antoja?
            </h4>
            <DishList>
              {dishes.map((d) => (
                <li key={d.id}>
                  <DishCard dish={d} />
                </li>
              ))}
            </DishList>
          </div>
        </MenuStyleProvider>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/10 to-transparent"
      />
    </div>
  );
}

function CoverField({ cover }: { cover?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type))
      return toast.error("La portada debe ser una imagen PNG, JPG o WebP");
    if (file.size > 8 * 1024 * 1024) return toast.error("La foto pesa más de 8 MB");
    setBusy(true);
    try {
      const dataUrl = await shrinkCover(file);
      const bad = validateCoverData(dataUrl);
      if (bad) return toast.error(bad);
      const r = brandActions.setCover(dataUrl);
      if (!r.ok) return toast.error(r.error);
      toast.success("Portada actualizada");
    } catch {
      toast.error("No pudimos leer esa imagen");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="border-line bg-surface-2 flex h-16 w-28 items-center justify-center overflow-hidden rounded-xl border">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa de la portada propia
          <img src={cover} alt="Portada actual" className="size-full object-cover" />
        ) : (
          <ImagePlus className="text-muted size-6" aria-hidden />
        )}
      </div>
      <div className="min-w-48 flex-1">
        <h4 className="text-[14px] font-semibold">Foto de portada</h4>
        <p className="text-muted text-[13px]">
          La ven los estilos con portada (Fresco redondeado y Mediterráneo). Una foto horizontal del
          local o de tu plato estrella funciona mejor.
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <ImagePlus aria-hidden /> {cover ? "Cambiar portada" : "Subir portada"}
          </Button>
          {cover && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                brandActions.setCover(null);
                toast.success("Portada quitada");
              }}
            >
              <Trash2 aria-hidden /> Quitar
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Archivo de la portada"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
          }}
        />
      </div>
    </div>
  );
}

/** Reduce la portada y la guarda como JPG; baja la calidad hasta que quede liviana. */
async function shrinkCover(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = coverTargetSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  let out = canvas.toDataURL("image/jpeg", 0.82);
  for (const q of [0.7, 0.58, 0.46]) {
    if (out.length <= COVER_MAX_DATA_URL) break;
    out = canvas.toDataURL("image/jpeg", q);
  }
  return out;
}
