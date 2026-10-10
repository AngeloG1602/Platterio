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
  "carta",
  "reservas",
  "entrar",
] as const;

/** Páginas de la plataforma que cuelgan directo de la raíz (no son un negocio). */
const PLATFORM_PAGES: ReadonlySet<string> = new Set([
  "registro",
  "iniciar-sesion",
  "personal",
  "demo",
  "producto",
  "muestra",
  "laboratorio",
  "negocio",
]);

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

/** `/casa-verde` (sin pantalla detrás): la página de inicio de un negocio. Devuelve su código. */
export function businessHomeSlug(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const [only] = parts;
  if (parts.length !== 1 || !only) return null;
  return SECTION_SET.has(only) || PLATFORM_PAGES.has(only) ? null : only;
}

/** Pantallas que ve el cliente del negocio (carta, domicilios, inicio), no el personal. */
export function isCustomerPath(pathname: string): boolean {
  const { path } = splitBusinessPath(pathname);
  return (
    path.startsWith("/mesa") ||
    path.startsWith("/domicilio") ||
    path.startsWith("/carta") ||
    path.startsWith("/reservas") ||
    businessHomeSlug(pathname) !== null
  );
}

/** Rewrite de next.config: `/casa-verde` se sirve con `/negocio/casa-verde`. */
export const BUSINESS_HOME_SOURCE = `/:negocio((?!(?:${[...SECTION_SET, ...PLATFORM_PAGES].join("|")})$)[a-z0-9-]+)`;
