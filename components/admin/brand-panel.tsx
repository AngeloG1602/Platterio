"use client";

import { Check, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { brandActions, useRestaurant } from "@/lib/data";
import {
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
      description="Logo, plantilla y tipografías de tu negocio. El cliente lo ve en la carta, y el color de acento lo eliges abajo."
    >
      <div className="flex flex-col gap-8">
        <LogoField logo={brand.logo} name={restaurant.name} />
        <section aria-labelledby="plantillas">
          <h3 id="plantillas" className="text-[15px] font-semibold">
            Plantilla
          </h3>
          <p className="text-muted text-[13px]">
            Cambia colores, tipografías y el acento de una vez. Luego puedes ajustar lo que quieras.
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
                toast.success("Tipografías de la plantilla");
              }}
            >
              Volver a las de la plantilla
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
