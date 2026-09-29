// Escaneo de accesibilidad (axe-core, WCAG 2.1 A/AA) de todas las vistas con datos reales.
// Uso: con la app corriendo, `npm run e2e:a11y` (E2E_URL para otra dirección).
import AxeBuilder from "@axe-core/playwright";
import { addDish, BASE, joinTable, launch, watch } from "./helpers.mjs";

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const errors = [];
const page = watch(await ctx.newPage(), "a11y", errors);

// Datos: una mesa con pedido entregado, para que todas las pantallas tengan contenido.
await joinTable(page, 3, "Ana", { restriction: "Lácteos" });
await addDish(page, 3, "pollo-crispy");
await page.goto(`${BASE}/mesa/3/carrito`);
await page.getByRole("button", { name: "Enviar pedido" }).click();
await page.getByRole("button", { name: /Sí, enviar/ }).click();
await page.waitForURL("**/pedido");

const pages = [
  ["Hub", "/", 1280],
  ["Muestra", "/muestra", 1280],
  ["Menú", "/mesa/3/menu", 390],
  ["Ficha", "/mesa/3/plato/clasica-27", 390],
  ["Carrito", "/mesa/3/carrito", 390],
  ["Pedido", "/mesa/3/pedido", 390],
  ["Calificar", "/mesa/3/calificar", 390],
  ["Mesero", "/mesero?mesero=carlos", 768],
  ["Cocina", "/cocina", 1280],
  ["Admin resumen", "/admin", 1366],
  ["Admin platos", "/admin/platos", 1366],
  ["Admin ficha", "/admin/platos/clasica-27", 1366],
  ["Admin recomendaciones", "/admin/recomendaciones", 1366],
  ["Admin calificaciones", "/admin/calificaciones", 1366],
  ["Admin ventas", "/admin/ventas", 1366],
  ["Admin configuración", "/admin/configuracion", 1366],
  ["No encontrada", "/esto-no-existe", 390],
];

const guest = watch(
  await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(),
  "invitado",
  errors,
);
let total = 0;
for (const [name, path, width] of [["Entrada QR", "/mesa/3", 390], ...pages]) {
  const p = name === "Entrada QR" ? guest : page;
  await p.setViewportSize({ width, height: 900 });
  const errorsBefore = errors.length;
  await p.goto(BASE + path);
  await p.waitForTimeout(900);
  // La página inexistente responde 404 a propósito: no es un error de la app.
  if (path === "/esto-no-existe") errors.splice(errorsBefore);
  const result = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  total += result.violations.length;
  console.log(
    `${result.violations.length ? "✘" : "✔"} ${name} (${path}) — ${result.violations.length} problemas`,
  );
  for (const v of result.violations) {
    console.log(`   · [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 3))
      console.log(`       ${n.target.join(" ")} ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`);
  }
}
console.log(errors.length ? `Errores de consola:\n${errors.join("\n")}` : "Sin errores de consola");
console.log(total ? `Total: ${total} problemas` : "Sin problemas de accesibilidad detectados");
await browser.close();
if (total) process.exitCode = 1;
