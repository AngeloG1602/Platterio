// Genera el PDF de la guía de usuario a partir de docs/guia/guia.html (con las capturas de
// docs/guia/img, que salen de e2e/capturas.mjs). Uso: `node scripts/guia-pdf.mjs`.
import { chromium } from "playwright";

const html = new URL("../docs/guia/guia.html", import.meta.url).href;
const out = new URL("../docs/guia/Guia-de-usuario-preliminar.pdf", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="font-family: Inter, sans-serif; font-size: 8px; color: #716a64; width: 100%; padding: 0 17mm; display: flex; justify-content: space-between;"><span>Platterio · Guía de usuario (preliminar)</span><span class="pageNumber"></span></div>',
});
await browser.close();
console.log("PDF listo:", out);
