/**
 * Mezcla de colecciones que solo crecen (cobros, abonos, auditoría) al sincronizar pestañas.
 * Si una pestaña con datos viejos escribe justo después de que otra agregó un registro, el
 * registro no se pierde: se queda lo de las dos, sin repetir, por `id`.
 */
export function unionById<T extends { id: string }>(
  local: readonly T[] | undefined,
  incoming: readonly T[] | undefined,
): T[] {
  const base = incoming ?? [];
  if (!local || local.length === 0) return [...base];
  const seen = new Set(base.map((x) => x.id));
  const extra = local.filter((x) => !seen.has(x.id));
  return extra.length === 0 ? [...base] : [...base, ...extra];
}
