/**
 * Direcciones por negocio: `/{negocio}/mesa/3/menu`, `/{negocio}/domicilio`, `/{negocio}/admin`…
 * Las pantallas viven en las rutas de siempre (`/mesa/3/menu`); el prefijo del negocio se quita al
 * servir la página (reescritura en next.config) y se vuelve a poner al armar cada enlace.
 * Sin prefijo se usa el negocio de la demo.
 */

/** Primer tramo de las pantallas de un negocio. */
export const BUSINESS_SECTIONS = [
  "admin",
  "mesero",
  "cocina",
  "caja",
  "mesa",
  "domicilio",
  "entrar",
] as const;

const SECTION_SET: ReadonlySet<string> = new Set(BUSINESS_SECTIONS);

export interface SplitPath {
  /** Dirección corta del negocio, o null en las rutas sin prefijo (la demo). */
  slug: string | null;
  /** Ruta de la pantalla, sin el prefijo (`/mesa/3/menu`). */
  path: string;
}

/** Separa el prefijo del negocio de la ruta. `/casa-verde/admin/platos` → casa-verde + /admin/platos. */
export function splitBusinessPath(pathname: string): SplitPath {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second] = parts;
  if (first && second && SECTION_SET.has(second) && !SECTION_SET.has(first)) {
    return { slug: first, path: `/${parts.slice(1).join("/")}` };
  }
  return { slug: null, path: pathname || "/" };
}

/** Pone el prefijo del negocio a una ruta (sin prefijo si es la demo). Respeta `?` y `#`. */
export function withBusiness(slug: string | null, path: string): string {
  return slug ? `/${slug}${path}` : path;
}

/** Expresión para next.config: qué negocios no son una sección de la plataforma. */
export const BUSINESS_SOURCE = `/:negocio((?!(?:${BUSINESS_SECTIONS.join("|")})$)[a-z0-9-]+)/:section(${BUSINESS_SECTIONS.join("|")})/:rest*`;
