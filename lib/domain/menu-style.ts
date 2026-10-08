import type { FontId } from "./brand";

/** Cómo se acomodan los platos: lista con foto a la derecha, cuadrícula, carta impresa o tarjetas. */
export type DishLayout = "lista" | "cuadricula" | "carta" | "tarjetas";
/** Encabezado de la carta: a la izquierda, centrado o con foto de portada. */
export type HeaderLayout = "izquierda" | "centrado" | "portada";
export type TabsLayout = "linea" | "pildora";

export interface SurfaceColors {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  inkSoft: string;
  muted: string;
  line: string;
  lineStrong: string;
}

/**
 * Estilo de la carta: la forma de la página (distribución, esquinas, bordes, sombras, letra y, si
 * hace falta, fondo claro u oscuro). Los colores de acento, el logo y el nombre son del negocio y
 * se aplican encima de cualquier estilo.
 */
export interface MenuStyle {
  id: string;
  name: string;
  description: string;
  /** Para qué tipo de negocio va mejor. */
  suits: string;
  dark: boolean;
  layout: DishLayout;
  header: HeaderLayout;
  tabs: TabsLayout;
  /** Multiplica las esquinas redondeadas (1 = las de siempre, 0 = rectas). */
  radius: number;
  /** Sombra de las tarjetas, ya lista para CSS. */
  shadow: string;
  /** Grosor y trazo del borde de las tarjetas. */
  border: { width: string; style: "solid" | "dashed" };
  headingFont?: FontId;
  bodyFont?: FontId;
  /** Fondos propios del estilo; sin ellos se usa la paleta del negocio. */
  colors?: SurfaceColors;
  /** Acento sugerido (solo se ofrece, no se impone). */
  suggestedAccent: string;
}

const SOFT =
  "0 1px 0 rgb(28 25 23 / 0.03), 0 1px 3px rgb(28 25 23 / 0.06), 0 10px 24px -14px rgb(28 25 23 / 0.16)";

export const MENU_STYLES: readonly MenuStyle[] = [
  {
    id: "clasico",
    name: "Clásico",
    description: "Lista limpia con la foto a la derecha. El estilo de la casa.",
    suits: "Cualquier restaurante",
    dark: false,
    layout: "lista",
    header: "izquierda",
    tabs: "linea",
    radius: 1,
    shadow: SOFT,
    border: { width: "1px", style: "solid" },
    suggestedAccent: "#E4572E",
  },
  {
    id: "cafe",
    name: "Café minimal",
    description: "Mucho aire, cuadrícula de fotos grandes y letra limpia.",
    suits: "Cafeterías, brunch, panaderías",
    dark: false,
    layout: "cuadricula",
    header: "centrado",
    tabs: "pildora",
    radius: 1.3,
    shadow: "none",
    border: { width: "1px", style: "solid" },
    headingFont: "outfit",
    bodyFont: "dm-sans",
    colors: {
      bg: "#FFFFFF",
      surface: "#FFFFFF",
      surface2: "#F4F4F2",
      ink: "#18181B",
      inkSoft: "#3F3F46",
      muted: "#63636B",
      line: "#ECECEA",
      lineStrong: "#D6D6D2",
    },
    suggestedAccent: "#2F7A4F",
  },
  {
    id: "fresco",
    name: "Fresco redondeado",
    description: "Portada con tu foto, tarjetas muy redondeadas y pestañas en píldora.",
    suits: "Saludable, jugos, postres, heladerías",
    dark: false,
    layout: "tarjetas",
    header: "portada",
    tabs: "pildora",
    radius: 1.6,
    shadow: "0 2px 4px rgb(19 37 26 / 0.05), 0 14px 28px -16px rgb(19 37 26 / 0.22)",
    border: { width: "0px", style: "solid" },
    headingFont: "outfit",
    bodyFont: "dm-sans",
    suggestedAccent: "#1E8A7A",
  },
  {
    id: "bistro",
    name: "Bistró oscuro",
    description: "Fondo oscuro, serifa elegante y acentos dorados. Para la noche.",
    suits: "Restaurantes de noche, vinotecas, coctelería",
    dark: true,
    layout: "lista",
    header: "izquierda",
    tabs: "linea",
    radius: 0.9,
    shadow: "0 0 0 1px #342E27",
    border: { width: "1px", style: "solid" },
    headingFont: "playfair",
    bodyFont: "dm-sans",
    colors: {
      bg: "#15120F",
      surface: "#1F1B17",
      surface2: "#2A2520",
      ink: "#F5EFE6",
      inkSoft: "#DDD3C4",
      muted: "#B3A799",
      line: "#342E27",
      lineStrong: "#4A4238",
    },
    suggestedAccent: "#D4A24C",
  },
  {
    id: "gourmet",
    name: "Gourmet editorial",
    description: "Como una carta impresa: sin fotos, con puntos entre el plato y el precio.",
    suits: "Alta cocina, cartas cortas, tapas",
    dark: false,
    layout: "carta",
    header: "centrado",
    tabs: "linea",
    radius: 0.5,
    shadow: "none",
    border: { width: "1px", style: "solid" },
    headingFont: "playfair",
    bodyFont: "lora",
    suggestedAccent: "#8C2F4B",
  },
  {
    id: "parrilla",
    name: "Parrilla rústica",
    description: "Papel kraft, tarjetas con borde punteado como un tiquete.",
    suits: "Asaderos, parrillas, comida tradicional",
    dark: false,
    layout: "tarjetas",
    header: "izquierda",
    tabs: "pildora",
    radius: 0.6,
    shadow: "none",
    border: { width: "2px", style: "dashed" },
    headingFont: "lora",
    bodyFont: "inter",
    colors: {
      bg: "#E9DCC3",
      surface: "#F6EEDC",
      surface2: "#DCCBAA",
      ink: "#2B1D14",
      inkSoft: "#44321F",
      muted: "#5B4A38",
      line: "#CDBA97",
      lineStrong: "#9C8660",
    },
    suggestedAccent: "#8C2F4B",
  },
  {
    id: "urbano",
    name: "Urbano colorido",
    description: "Bordes gruesos, sombras duras y colores vivos. Con carácter.",
    suits: "Hamburguesas, comida rápida, bares jóvenes",
    dark: false,
    layout: "tarjetas",
    header: "izquierda",
    tabs: "pildora",
    radius: 0.55,
    shadow: "4px 4px 0 #111111",
    border: { width: "2px", style: "solid" },
    headingFont: "space-grotesk",
    bodyFont: "inter",
    colors: {
      bg: "#FFF1B8",
      surface: "#FFFFFF",
      surface2: "#FFE27A",
      ink: "#111111",
      inkSoft: "#2A2A2A",
      muted: "#4D4A3F",
      line: "#111111",
      lineStrong: "#111111",
    },
    suggestedAccent: "#E4572E",
  },
  {
    id: "mediterraneo",
    name: "Mediterráneo",
    description: "Portada luminosa, fondo claro azulado y esquinas suaves.",
    suits: "Mariscos, cocina mediterránea, terrazas",
    dark: false,
    layout: "cuadricula",
    header: "portada",
    tabs: "linea",
    radius: 1.2,
    shadow: "0 1px 2px rgb(16 38 58 / 0.06), 0 12px 24px -16px rgb(16 38 58 / 0.25)",
    border: { width: "1px", style: "solid" },
    headingFont: "lora",
    bodyFont: "dm-sans",
    colors: {
      bg: "#F2F7FB",
      surface: "#FFFFFF",
      surface2: "#E3EDF5",
      ink: "#10263A",
      inkSoft: "#2E4458",
      muted: "#556A7D",
      line: "#D9E5EE",
      lineStrong: "#BFD0DE",
    },
    suggestedAccent: "#1F6FB2",
  },
  {
    id: "neon",
    name: "Neón nocturno",
    description: "Oscuro y vibrante, con tarjetas que brillan con tu color.",
    suits: "Bares, discotecas, comida nocturna",
    dark: true,
    layout: "tarjetas",
    header: "centrado",
    tabs: "pildora",
    radius: 1.1,
    shadow: "0 0 0 1px #2D2D52, 0 10px 30px -14px rgb(0 0 0 / 0.8)",
    border: { width: "0px", style: "solid" },
    headingFont: "space-grotesk",
    bodyFont: "inter",
    colors: {
      bg: "#0B0B16",
      surface: "#15152B",
      surface2: "#1F1F3D",
      ink: "#F3F3FF",
      inkSoft: "#D6D6F0",
      muted: "#A9A9CC",
      line: "#2D2D52",
      lineStrong: "#43437A",
    },
    suggestedAccent: "#E040A0",
  },
];

export const DEFAULT_STYLE = MENU_STYLES[0]!;

export function styleById(id: string | undefined): MenuStyle {
  return MENU_STYLES.find((s) => s.id === id) ?? DEFAULT_STYLE;
}

const RADII = { sm: 8, md: 12, lg: 16, xl: 22, "2xl": 28 } as const;

/** Variables CSS de forma (esquinas, sombra, borde) de un estilo. */
export function shapeVars(style: MenuStyle): Record<string, string> {
  const vars: Record<string, string> = {
    "--shadow-card": style.shadow,
    "--card-bw": style.border.width,
    "--card-bs": style.border.style,
  };
  for (const [k, v] of Object.entries(RADII))
    vars[`--r-${k}`] = `${Math.round(v * style.radius)}px`;
  return vars;
}
