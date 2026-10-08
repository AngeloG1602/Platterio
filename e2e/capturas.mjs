// Capturas de pantalla de todo el sistema para la guía de usuario y la página de ventas.
// Recorre un día típico (cliente, mesero, cocina, caja, administrador, domicilio) con datos de
// demostración. Uso: con la app corriendo, `E2E_URL=http://localhost:3100 node e2e/capturas.mjs`.
import { mkdirSync } from "node:fs";
import { addDish, BASE, entrarComo, launch } from "./helpers.mjs";

const OUT = new URL("../docs/guia/img/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1.5,
  locale: "es-CO",
});
const tab = async (w, h) => {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: w, height: h });
  return p;
};
const shot = async (page, name, { full = false, clip, locator } = {}) => {
  await page.waitForTimeout(450);
  const options = { path: `${OUT}${name}.jpg`, type: "jpeg", quality: 82 };
  if (locator) await locator.screenshot(options);
  else await page.screenshot({ ...options, fullPage: full, ...(clip ? { clip } : {}) });
  console.log("✔", name);
};
const pause = (p, ms = 600) => p.waitForTimeout(ms);

// 0. Datos limpios, hora de almuerzo
const hub = await tab(1100, 800);
await hub.goto(`${BASE}/?demo=1`);
await hub.getByRole("button", { name: /Reiniciar datos/ }).click();
await hub.getByRole("button", { name: "Sí, reiniciar" }).click();
await hub.getByRole("radio", { name: /Almuerzo/ }).click();
await hub.keyboard.press("Escape");
await shot(hub, "00-inicio");

// 1. Cliente mirando con la mesa cerrada
const guest = await tab(390, 844);
await guest.goto(`${BASE}/mesa/6`);
await shot(guest, "c01-mesa-cerrada");
await guest.getByRole("link", { name: "Ver la carta mientras tanto" }).click();
await guest.waitForURL("**/menu");
await guest.getByRole("dialog").waitFor();
await shot(guest, "c02-alergias");
await guest.getByRole("dialog").getByRole("button", { name: "Omitir" }).click();
await pause(guest);
await shot(guest, "c03-carta-sin-pedir");

// 2. Mesero: salón y apertura de mesa
const carlos = await tab(900, 1000);
await carlos.goto(`${BASE}/mesero`);
await shot(carlos, "s01-entrar-con-pin");
await entrarComo(carlos, "Carlos");
await pause(carlos, 900);
await shot(carlos, "s02-salon-mesero");
await carlos.getByRole("button", { name: /^Mesa 3:/ }).click();
await pause(carlos);
await shot(carlos, "s03-mesa-libre");
await carlos.getByRole("button", { name: /Abrir mesa/ }).click();
await carlos.getByLabel("PIN de la mesa 3", { exact: true }).waitFor();
await shot(carlos, "s04-mesa-abierta-pin");
const pin3 = (await carlos.getByLabel("PIN de la mesa 3", { exact: true }).textContent())?.trim();
await carlos.keyboard.press("Escape");

// 3. Cliente entra con el PIN, personaliza en 3D y pide
const ana = await tab(390, 844);
await ana.goto(`${BASE}/mesa/3`);
await ana.getByLabel("¿Cómo te llamamos?").fill("Ana");
await ana.getByLabel("PIN de la mesa").fill(pin3);
await shot(ana, "c04-entrada-con-pin");
await ana.getByRole("button", { name: /Ver la carta/ }).click();
await ana.waitForURL("**/menu");
await ana.getByRole("dialog").getByRole("button", { name: "Omitir" }).click();
await pause(ana, 900);
await shot(ana, "c05-carta");
await ana.locator('a[href="/mesa/3/plato/clasica-27"]').last().click();
await ana.waitForURL("**/plato/clasica-27");
await pause(ana, 900);
await shot(ana, "c06-ficha-plato");
await ana.getByRole("button", { name: "Ver en 3D" }).last().click();
const visor = ana.getByRole("dialog");
await visor.getByText("Personaliza tu Clásica 27").waitFor();
await pause(ana, 3500);
await shot(ana, "c07-visor-3d");
await visor.locator('input[type="range"]').fill("60");
await pause(ana, 1800);
await shot(ana, "c08-visor-separado");
await visor.locator('input[type="range"]').fill("0");
await visor.getByRole("button", { name: "Menos Cebolla caramelizada" }).click();
await visor.getByRole("button", { name: /Más Queso cheddar/ }).click();
await visor.getByRole("heading", { name: "Ingredientes" }).scrollIntoViewIfNeeded();
await pause(ana, 900);
await shot(ana, "c09-visor-ingredientes");
await visor.getByRole("button", { name: /^Listo/ }).click();
await ana.getByText(/Tu versión/).scrollIntoViewIfNeeded();
await pause(ana);
await shot(ana, "c10-ficha-personalizada");
await ana.getByRole("button", { name: /^Agregar ·/ }).click();
await ana.waitForURL("**/menu");
await addDish(ana, 3, "salchipapa-27", { qty: 1 });
await ana.goto(`${BASE}/mesa/3/carrito`);
await pause(ana);
await shot(ana, "c11-carrito");
await ana.getByRole("button", { name: "Enviar pedido" }).click();
await pause(ana);
await shot(ana, "c12-enviar-pedido");
await ana.getByRole("button", { name: /Sí, enviar/ }).click();
await ana.waitForURL("**/pedido");
await pause(ana, 900);
await shot(ana, "c13-pedido-estado");

// 4. Mesero confirma; cocina prepara
await carlos.reload();
await pause(carlos, 900);
await shot(carlos, "s05-pedido-por-confirmar");
await carlos
  .getByRole("button", { name: /Confirmar y enviar a cocina/ })
  .first()
  .click();
await pause(carlos);
await carlos.getByRole("button", { name: /^Mesa 3:/ }).click();
await pause(carlos);
await shot(carlos, "s06-ficha-mesa");
await carlos.getByRole("button", { name: "Tomar pedido" }).click();
await pause(carlos, 900);
await shot(carlos, "s07-tomar-pedido");
await carlos.keyboard.press("Escape");
await carlos.keyboard.press("Escape");
await carlos.getByRole("button", { name: /^Mesa 3:/ }).click();
await carlos.getByRole("button", { name: /Editar.*ronda 1/ }).click();
await pause(carlos);
await shot(carlos, "s08-editar-ronda");
await carlos.keyboard.press("Escape");
await carlos.keyboard.press("Escape");

const cocina = await tab(1100, 720);
await cocina.goto(`${BASE}/cocina`);
await entrarComo(cocina, "Cocina");
await pause(cocina, 900);
await shot(cocina, "s09-cocina");
await cocina
  .getByRole("button", { name: /Empezar a preparar/ })
  .first()
  .click();
await pause(cocina);
await cocina
  .getByRole("button", { name: /Marcar listo/ })
  .first()
  .click();
await pause(cocina, 700);
await ana.reload();
await pause(ana, 900);
await shot(ana, "c14-pedido-listo");

// 5. Administrador: horario de domicilios, marca y reportes
const admin = await tab(1100, 900);
await admin.goto(`${BASE}/admin`);
await entrarComo(admin, "Marta");
await pause(admin, 1200);
await shot(admin, "a01-resumen");
await admin.goto(`${BASE}/admin/configuracion`);
await admin.getByLabel("Abre", { exact: true }).fill("00:00");
await admin.getByLabel("Cierra", { exact: true }).fill("00:00");
await admin.getByRole("button", { name: "Guardar cambios" }).click();
await pause(admin);
await shot(admin, "a02-configuracion", { full: true });
await admin.goto(`${BASE}/admin/reportes`);
await pause(admin, 1500);
await shot(admin, "a03-reportes", { full: true });
await admin.goto(`${BASE}/admin/equipo`);
await pause(admin, 900);
await shot(admin, "a04-equipo");
await admin.goto(`${BASE}/admin/platos/clasica-27`);
await pause(admin, 900);
await shot(admin, "a05-editar-plato", { full: true });
await admin.goto(`${BASE}/admin/ventas`);
await pause(admin, 1500);
await shot(admin, "a06-ventas", { full: true });

// 6. Domicilio del cliente
const casa = await tab(390, 844);
await casa.goto(`${BASE}/domicilio`);
await pause(casa, 900);
await shot(casa, "d01-domicilio-carta");
await casa
  .getByRole("button", { name: /Clásica 27/ })
  .first()
  .click();
await pause(casa);
await shot(casa, "d02-domicilio-agregar");
await casa.getByRole("button", { name: "Agregar uno" }).click();
await casa.getByRole("button", { name: /^Agregar ·/ }).click();
await casa.getByRole("link", { name: /Ver mi pedido/ }).click();
await casa.getByLabel("Nombre").fill("Camila Ríos");
await casa.getByLabel("Celular").fill("300 123 4567");
await casa.getByLabel("Zona").selectOption("zona-centro");
await casa.getByLabel("Dirección").fill("Calle 10 # 5-20 apto 301");
await pause(casa);
await shot(casa, "d03-domicilio-pedido", { full: true });
await casa.getByRole("button", { name: /Hacer el pedido/ }).click();
await casa.waitForURL("**/domicilio/seguimiento/**");
await pause(casa, 900);
await shot(casa, "d04-domicilio-seguimiento");

// 7. Caja
const caja = await tab(1100, 800);
await caja.goto(`${BASE}/caja`);
await entrarComo(caja, "Julián");
await pause(caja, 900);
await shot(caja, "s10-caja-salon");
await caja.getByRole("radio", { name: /Domicilios/ }).click();
await pause(caja, 900);
await shot(caja, "s11-caja-domicilios");
await caja.getByRole("button", { name: "Confirmar" }).click();
await pause(caja, 900);
await caja.getByRole("radio", { name: "Caja", exact: true }).click();
await pause(caja);
await shot(caja, "s12-caja-cerrada");
await caja.getByRole("button", { name: "Abrir caja" }).click();
await pause(caja, 900);
await shot(caja, "s13-caja-turno");
await caja.getByRole("button", { name: /Cobrar.*Mesa 3/ }).click();
await pause(caja, 900);
await shot(caja, "s14-cobrar");
await caja.keyboard.press("Escape");
await caja.getByRole("radio", { name: "Mesas y meseros" }).click();
await pause(caja);
await shot(caja, "s15-mesas-meseros");

// 8. Otros idiomas (celular en inglés)
const en = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1.5,
  locale: "en-US",
});
const enPage = await en.newPage();
await enPage.goto(`${BASE}/domicilio`);
await enPage.waitForTimeout(900);
await enPage.screenshot({ path: `${OUT}d05-domicilio-ingles.jpg`, type: "jpeg", quality: 82 });
console.log("✔ d05-domicilio-ingles");

await hub.goto(`${BASE}/?demo=1`);
await hub.getByRole("radio", { name: /Automática/ }).click();
await browser.close();
