import { toCsv } from "@/lib/domain/cash";

/** Descarga filas como CSV que Excel abre bien (con BOM y UTF-8). */
export function downloadCsv(name: string, rows: (string | number | null)[][]) {
  downloadText(name, toCsv(rows));
}

/** Descarga un texto tal cual (para las plantillas, que ya vienen en CSV). */
export function downloadText(name: string, text: string) {
  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
