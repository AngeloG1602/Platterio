// Graba la composición cuadro a cuadro y arma el video con ffmpeg.
// Uso: node video/render/render.mjs --f h|v [--fps 30] [--workers 3] [--desde s --hasta s]
//      node video/render/render.mjs --f h --fotos 1.2,5,30   (solo cuadros sueltos en PNG)
import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const VIDEO = path.join(RAIZ, "video");
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const F = arg("f", "h");
const FPS = +arg("fps", 30);
const WORKERS = +arg("workers", 3);
const SUBS = arg("subs", F === "v" ? "1" : "0");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const [Wd, Hd] = F === "v" ? [1080, 1920] : [1920, 1080];

const TIPOS = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = http.createServer((req, res) => {
  const file = path.join(RAIZ, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(RAIZ) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TIPOS[path.extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(0, ok));
const URL_ = `http://127.0.0.1:${server.address().port}/video/escenas/index.html?f=${F}&subs=${SUBS}`;

const ARGS = ["--force-color-profile=srgb", "--font-render-hinting=none"];
const browser = await chromium.launch({ args: ARGS });
async function abrir(propio = false) {
  const b = propio ? await chromium.launch({ args: ARGS }) : browser;
  const page = await b.newPage({ viewport: { width: Wd, height: Hd }, deviceScaleFactor: 1 });
  page.on("console", (m) => m.type() === "error" && console.log("consola:", m.text()));
  await page.goto(URL_);
  await page.waitForFunction(() => window.LISTO || window.ERROR, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.ERROR);
  if (err) throw new Error(err);
  return page;
}
let FOTO = false;
const cuadro = async (page, t) => {
  await page.evaluate((t) => window.render(t), t);
  return page.screenshot({
    type: FOTO ? "png" : "jpeg",
    quality: FOTO ? undefined : 95,
    clip: { x: 0, y: 0, width: Wd, height: Hd },
  });
};

const salida = path.join(VIDEO, "salida");
await mkdir(salida, { recursive: true });

const fotos = arg("fotos");
FOTO = !!fotos;
if (fotos) {
  const page = await abrir();
  const dir = path.join(VIDEO, "salida", "fotos");
  await mkdir(dir, { recursive: true });
  for (const t of fotos.split(",").map(Number)) {
    await writeFile(path.join(dir, `${F}-${t.toFixed(2)}.png`), await cuadro(page, t));
  }
  console.log("Fotos en", dir);
} else {
  const page0 = await abrir();
  const total = await page0.evaluate(() => window.DURACION);
  const sfx = await page0.evaluate(() => window.SFX);
  await page0.close();
  await writeFile(
    path.join(VIDEO, "render", `sfx-${F}.json`),
    JSON.stringify({ total, fps: FPS, sfx }, null, 1),
  );
  const desde = +arg("desde", 0),
    hasta = +arg("hasta", total);
  const n0 = Math.round(desde * FPS),
    n1 = Math.round(hasta * FPS);
  const porWorker = Math.ceil((n1 - n0) / WORKERS);
  const tmp = path.join(VIDEO, "render", `tmp-${F}`);
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const t0 = Date.now();
  let hechos = 0;
  const partes = await Promise.all(
    Array.from({ length: WORKERS }, async (_, w) => {
      const a = n0 + w * porWorker,
        b = Math.min(n1, a + porWorker);
      const out = path.join(tmp, `parte-${w}.mp4`);
      if (a >= b) return null;
      const page = await abrir(true);
      const ff = spawn(
        FFMPEG,
        [
          "-y",
          "-loglevel",
          "error",
          "-f",
          "image2pipe",
          "-framerate",
          String(FPS),
          "-c:v",
          "mjpeg",
          "-i",
          "-",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "14",
          "-pix_fmt",
          "yuv420p",
          "-r",
          String(FPS),
          out,
        ],
        { stdio: ["pipe", "inherit", "inherit"] },
      );
      for (let n = a; n < b; n++) {
        const buf = await cuadro(page, n / FPS);
        if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once("drain", ok));
        hechos++;
        if (hechos % 150 === 0) {
          const s = (Date.now() - t0) / 1000;
          console.log(
            `${hechos}/${n1 - n0} cuadros · ${s.toFixed(0)} s · faltan ~${((s / hechos) * (n1 - n0 - hechos)).toFixed(0)} s`,
          );
        }
      }
      ff.stdin.end();
      await new Promise((ok, ko) =>
        ff.on("close", (c) => (c ? ko(new Error(`ffmpeg ${c}`)) : ok())),
      );
      await page.context().browser().close();
      return out;
    }),
  );
  const lista = path.join(tmp, "lista.txt");
  await writeFile(
    lista,
    partes
      .filter(Boolean)
      .map((p) => `file '${p}'`)
      .join("\n"),
  );
  const mudo = path.join(tmp, "mudo.mp4");
  await new Promise((ok, ko) =>
    spawn(
      FFMPEG,
      ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", mudo],
      { stdio: "inherit" },
    ).on("close", (c) => (c ? ko(new Error("concat")) : ok())),
  );
  console.log(`Video sin audio: ${mudo} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
await browser.close();
server.close();
