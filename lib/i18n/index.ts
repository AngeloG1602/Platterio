/**
 * Traducciones de la interfaz del cliente. El texto en español ES la clave (como en gettext):
 * `t("Ver la carta")` devuelve la traducción si hay una para el idioma activo y, si no, el propio
 * texto en español. Así una traducción que falte nunca rompe la pantalla.
 *
 * Los mensajes con datos usan marcas: `t("Mesa {n}", { n: 3 })`.
 * Solo se traduce lo que ve el cliente; las pantallas del personal siguen en español.
 */
import { EN } from "./en";

export const LANGS = ["es", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_LABEL: Record<Lang, string> = { es: "Español", en: "English" };

let current: Lang = "es";

export const getLang = (): Lang => current;
export function setLang(lang: Lang) {
  current = lang;
}

const DICTIONARIES: Record<Lang, Record<string, string>> = { es: {}, en: EN };

export type Vars = Record<string, string | number>;

export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** Traduce al idioma activo (o al indicado). */
export function t(source: string, vars?: Vars, lang: Lang = current): string {
  return interpolate(DICTIONARIES[lang][source] ?? source, vars);
}

/** Frases con número: `tn(2, "plato", "platos")` → "2 platos" / "2 dishes". */
export function tn(count: number, one: string, many: string, lang: Lang = current): string {
  return `${count} ${t(count === 1 ? one : many, undefined, lang)}`;
}

export const isLang = (value: unknown): value is Lang =>
  typeof value === "string" && (LANGS as readonly string[]).includes(value);

/** Idiomas que el negocio ofrece; el español siempre está. */
export function enabledLangs(configured: readonly string[] | undefined): Lang[] {
  const set = new Set<Lang>(["es"]);
  for (const l of configured ?? LANGS) if (isLang(l)) set.add(l);
  return LANGS.filter((l) => set.has(l));
}

/** Idioma inicial: el que guardó el cliente, o el de su navegador si el negocio lo ofrece. */
export function pickLang(options: {
  saved?: string | null;
  browser?: string | null;
  enabled: readonly Lang[];
}): Lang {
  const { saved, browser, enabled } = options;
  if (isLang(saved) && enabled.includes(saved)) return saved;
  const guess = browser?.toLowerCase().slice(0, 2);
  if (isLang(guess) && enabled.includes(guess)) return guess;
  return "es";
}

/** Texto de un dato del negocio (plato, categoría, franja): su traducción propia o la del diccionario. */
export function localized(
  source: { name: string; description?: string; en?: { name?: string; description?: string } },
  field: "name" | "description" = "name",
  lang: Lang = current,
): string {
  const text = source[field] ?? "";
  if (lang === "es") return text;
  return source.en?.[field]?.trim() || t(text, undefined, lang);
}
