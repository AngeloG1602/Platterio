import { accentOnDark, contrast, parseHex, strongVariantOn } from "./color";
import { shapeVars, styleById, type MenuStyle } from "./menu-style";
import type { Brand, Restaurant } from "./types";

/** Tipografías incluidas (se sirven desde la propia app, sin pedirle nada a Google). */
export const FONTS = {
  fraunces: { label: "Fraunces", family: '"Fraunces Variable", "Iowan Old Style", Georgia, serif' },
  playfair: { label: "Playfair Display", family: '"Playfair Display Variable", Georgia, serif' },
  lora: { label: "Lora", family: '"Lora Variable", Georgia, serif' },
  outfit: { label: "Outfit", family: '"Outfit Variable", ui-sans-serif, system-ui, sans-serif' },
  "space-grotesk": {
    label: "Space Grotesk",
    family: '"Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif',
  },
  "dm-sans": {
    label: "DM Sans",
    family: '"DM Sans Variable", ui-sans-serif, system-ui, sans-serif',
  },
  inter: {
    label: "Inter",
    family: '"Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
} as const;
export type FontId = keyof typeof FONTS;
export const FONT_IDS = Object.keys(FONTS) as FontId[];

/** Para títulos y para texto corrido; cada lista es la que se ofrece en su selector. */
export const HEADING_FONTS: FontId[] = [
  "fraunces",
  "playfair",
  "lora",
  "outfit",
  "space-grotesk",
  "inter",
];
export const BODY_FONTS: FontId[] = ["inter", "dm-sans", "outfit", "lora"];

export interface Template {
  id: string;
  name: string;
  description: string;
  accent: string;
  headingFont: FontId;
  bodyFont: FontId;
  colors: {
    bg: string;
    surface: string;
    surface2: string;
    ink: string;
    inkSoft: string;
    muted: string;
    line: string;
    lineStrong: string;
  };
}

export const TEMPLATES: readonly Template[] = [
  {
    id: "calido",
    name: "Cálido",
    description: "Crema y terracota, con títulos editoriales. La plantilla de la casa.",
    accent: "#E4572E",
    headingFont: "fraunces",
    bodyFont: "inter",
    colors: {
      bg: "#FAF7F2",
      surface: "#FFFFFF",
      surface2: "#F3EEE6",
      ink: "#1C1917",
      inkSoft: "#44403C",
      muted: "#716A64",
      line: "#E7E2DA",
      lineStrong: "#D6CEC3",
    },
  },
  {
    id: "clasico",
    name: "Clásico",
    description: "Marfil y verde bosque con tipografía de restaurante de mantel.",
    accent: "#2F7A4F",
    headingFont: "playfair",
    bodyFont: "dm-sans",
    colors: {
      bg: "#FBF8F1",
      surface: "#FFFFFF",
      surface2: "#F1EDE1",
      ink: "#1F2A24",
      inkSoft: "#3F4B44",
      muted: "#5C665F",
      line: "#E5E0D2",
      lineStrong: "#D2CBB8",
    },
  },
  {
    id: "moderno",
    name: "Moderno",
    description: "Grises limpios y azul, con letra geométrica. Para marcas urbanas.",
    accent: "#2D5FA3",
    headingFont: "space-grotesk",
    bodyFont: "inter",
    colors: {
      bg: "#F6F7F9",
      surface: "#FFFFFF",
      surface2: "#EBEEF2",
      ink: "#14181F",
      inkSoft: "#3B4350",
      muted: "#5F6877",
      line: "#E1E5EA",
      lineStrong: "#CDD3DB",
    },
  },
  {
    id: "fresco",
    name: "Fresco",
    description: "Verdes suaves y turquesa. Ideal para jugos, ensaladas y cafés.",
    accent: "#1E8A7A",
    headingFont: "outfit",
    bodyFont: "dm-sans",
    colors: {
      bg: "#F4FAF6",
      surface: "#FFFFFF",
      surface2: "#E6F1EA",
      ink: "#13251A",
      inkSoft: "#34483B",
      muted: "#5C6F63",
      line: "#DCE9E0",
      lineStrong: "#C5D7CB",
    },
  },
  {
    id: "rustico",
    name: "Rústico",
    description: "Tonos tierra y vino, con serifa cálida. Parrillas y comida de casa.",
    accent: "#8C2F4B",
    headingFont: "lora",
    bodyFont: "inter",
    colors: {
      bg: "#F7F0E6",
      surface: "#FFFDF9",
      surface2: "#EDE2D1",
      ink: "#2B1D14",
      inkSoft: "#503F33",
      muted: "#6F6052",
      line: "#E3D6C3",
      lineStrong: "#CFBFA8",
    },
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0]!;

export function templateById(id: string | undefined): Template {
  return TEMPLATES.find((t) => t.id === id) ?? DEFAULT_TEMPLATE;
}

const asFont = (id: string | undefined, fallback: FontId): FontId =>
  id && id in FONTS ? (id as FontId) : fallback;

/** Marca efectiva de un negocio: estilo y plantilla elegidos, con los cambios propios encima. */
export function resolveBrand(restaurant: Pick<Restaurant, "accentColor" | "brand">) {
  const brand: Brand | undefined = restaurant.brand;
  const template = templateById(brand?.template);
  const style = styleById(brand?.style);
  const headingFont = asFont(brand?.headingFont, style.headingFont ?? template.headingFont);
  const bodyFont = asFont(brand?.bodyFont, style.bodyFont ?? template.bodyFont);
  return {
    template,
    style,
    /** Fondos y textos: los del estilo si trae los suyos, y si no, los de la paleta. */
    colors: style.colors ?? template.colors,
    accent: restaurant.accentColor,
    headingFont,
    bodyFont,
    logo: brand?.logo,
    cover: brand?.cover,
  };
}

/**
 * Variables CSS de la marca. Con `styled: false` (pantallas del personal) solo se aplica la paleta:
 * el estilo de la carta (fondo oscuro, esquinas, etc.) es solo para lo que ve el cliente.
 */
export function brandVars(
  restaurant: Pick<Restaurant, "accentColor" | "brand">,
  { styled = true }: { styled?: boolean } = {},
) {
  const resolved = resolveBrand(restaurant);
  const { template, accent, headingFont, bodyFont } = resolved;
  const style: MenuStyle | null = styled ? resolved.style : null;
  const c = style ? resolved.colors : template.colors;
  const dark = style?.dark ?? false;
  const onDark = dark ? accentOnDark(accent, [c.bg, c.surface, c.surface2]) : null;
  return {
    "--bg": c.bg,
    "--surface": c.surface,
    "--surface-2": c.surface2,
    "--ink": c.ink,
    "--ink-soft": c.inkSoft,
    "--muted": c.muted,
    "--line": c.line,
    "--line-strong": c.lineStrong,
    "--accent": accent,
    "--accent-strong": onDark?.strong ?? strongVariantOn(accent, [c.bg, c.surface2]),
    "--accent-ink": onDark?.ink ?? "#FFFFFF",
    "--overlay": dark ? "rgb(0 0 0 / 0.6)" : "rgb(28 25 23 / 0.45)",
    "--brand-serif": FONTS[headingFont].family,
    "--brand-sans": FONTS[bodyFont].family,
    ...(style
      ? shapeVars(style)
      : { "--shadow-card": SOFT_SHADOW, "--card-bw": "1px", "--card-bs": "solid" }),
    "color-scheme": dark ? "dark" : "light",
    ...(dark ? DARK_STATUS : {}),
  } as Record<string, string>;
}

/** Colores de estado (éxito, aviso, error) legibles sobre fondos oscuros; son los de la cocina. */
const DARK_STATUS = {
  "--success": "#48BB78",
  "--success-ink": "#68D391",
  "--success-soft": "color-mix(in oklab, #48bb78 18%, var(--surface))",
  "--warning": "#ECC94B",
  "--warning-ink": "#F6E05E",
  "--warning-soft": "color-mix(in oklab, #ecc94b 16%, var(--surface))",
  "--danger": "#FC8181",
  "--danger-ink": "#FEB2B2",
  "--danger-soft": "color-mix(in oklab, #fc8181 16%, var(--surface))",
};

const SOFT_SHADOW = styleById("clasico").shadow;

/** Contrastes mínimos de la plantilla: texto sobre fondo y sobre tarjeta (AA = 4,5). */
export function templateContrastIssues(t: Template): string[] {
  const issues: string[] = [];
  const pairs: [string, string, string][] = [
    ["ink", t.colors.ink, t.colors.bg],
    ["inkSoft", t.colors.inkSoft, t.colors.bg],
    ["muted", t.colors.muted, t.colors.bg],
    ["muted", t.colors.muted, t.colors.surface2],
    ["muted", t.colors.muted, t.colors.surface],
    ["ink", t.colors.ink, t.colors.surface2],
  ];
  for (const [name, fg, bg] of pairs) {
    const a = parseHex(fg);
    const b = parseHex(bg);
    if (!a || !b || contrast(a, b) < 4.5) issues.push(`${name} ${fg} sobre ${bg}`);
  }
  return issues;
}

/* ——— Logo ——— */

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const LOGO_MAX_INPUT_BYTES = 3 * 1024 * 1024;
export const LOGO_MAX_SIDE = 512;
/** Tope del logo ya reducido; se guarda en el navegador, y luego en la base de datos. */
export const LOGO_MAX_DATA_URL = 300_000;

export function validateLogoFile(file: { type: string; size: number }): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type))
    return "El logo debe ser una imagen PNG, JPG o WebP";
  if (file.size > LOGO_MAX_INPUT_BYTES)
    return "El logo pesa más de 3 MB. Usa una imagen más liviana.";
  return null;
}

export function validateLogoData(dataUrl: string): string | null {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl))
    return "El logo no es una imagen válida";
  if (dataUrl.length > LOGO_MAX_DATA_URL)
    return "El logo sigue siendo muy pesado. Prueba con una imagen más simple.";
  return null;
}

/** Tamaño al que se reduce el logo para guardarlo (nunca se agranda). */
export function logoTargetSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/* ——— Foto de portada ——— */

export const COVER_MAX_SIDE = 1280;
export const COVER_MAX_DATA_URL = 450_000;

export function validateCoverData(dataUrl: string): string | null {
  if (!/^data:image\/(jpeg|webp);base64,/.test(dataUrl))
    return "La portada no es una imagen válida";
  if (dataUrl.length > COVER_MAX_DATA_URL)
    return "La portada sigue siendo muy pesada. Prueba con otra foto.";
  return null;
}

/** Tamaño al que se reduce la portada (nunca se agranda). */
export function coverTargetSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, COVER_MAX_SIDE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Contrastes del estilo (los que traen colores propios), con el mismo criterio que las plantillas. */
export function styleContrastIssues(style: MenuStyle): string[] {
  return style.colors ? templateContrastIssues({ ...TEMPLATES[0]!, colors: style.colors }) : [];
}
