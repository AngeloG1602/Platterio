// Genera lib/data/photo-manifest.json con las fotos que existen en /public/platos.
// Así las tarjetas solo piden imágenes reales y el resto usa el respaldo con degradado.
import { readdirSync, writeFileSync } from "node:fs";

const dir = new URL("../public/platos/", import.meta.url);
const files = readdirSync(dir)
  .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
  .sort()
  .map((f) => `/platos/${f}`);
writeFileSync(
  new URL("../lib/data/photo-manifest.json", import.meta.url),
  JSON.stringify(files, null, 2) + "\n",
);
console.log(`Fotos de platos disponibles: ${files.length}`);
