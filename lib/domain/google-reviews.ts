/**
 * Enlace para que los clientes dejen una reseña en Google. Se acepta el identificador del lugar
 * (Place ID, empieza por "ChIJ") o el enlace de "Pedir reseñas" del Perfil de Negocio de Google, y
 * solo de dominios de Google (no se aceptan enlaces a otros sitios).
 */

const PLACE_ID = /^ChIJ[\w-]{10,}$/;

const writeReview = (placeId: string) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

export type GoogleReviewResult =
  { ok: true; url: string; kind: "placeid" | "link" } | { ok: false; error: string };

export function parseGoogleReviewInput(input: string): GoogleReviewResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "Pega el enlace de reseñas de tu negocio en Google" };
  if (PLACE_ID.test(text)) return { ok: true, url: writeReview(text), kind: "placeid" };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, error: "Eso no parece un enlace ni un identificador de lugar de Google" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    return { ok: false, error: "El enlace debe empezar por https://" };
  const host = url.hostname.toLowerCase();

  if (host === "search.google.com" && url.pathname.startsWith("/local/writereview")) {
    const id = url.searchParams.get("placeid");
    return id && PLACE_ID.test(id)
      ? { ok: true, url: writeReview(id), kind: "placeid" }
      : { ok: false, error: "Al enlace le falta el identificador del lugar (placeid)" };
  }
  if (host === "g.page" && /^\/r\/[\w-]{6,}(\/review)?\/?$/.test(url.pathname)) {
    return { ok: true, url: `https://g.page${url.pathname.replace(/\/$/, "")}`, kind: "link" };
  }
  return {
    ok: false,
    error:
      "Usa el enlace de “Pedir reseñas” de tu Perfil de Negocio (empieza por g.page/r/…) o el identificador del lugar (empieza por ChIJ)",
  };
}
