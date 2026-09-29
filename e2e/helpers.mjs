// Utilidades compartidas por los scripts de e2e (Playwright).
import { chromium } from "playwright";

export const BASE = process.env.E2E_URL ?? "http://localhost:3000";

export async function launch() {
  return chromium.launch({ headless: process.env.HEADED ? false : true });
}

/** Registra errores de consola y de página para reportarlos al final. */
export function watch(page, name, errors) {
  page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  return page;
}

export async function joinTable(page, table, alias, { restriction } = {}) {
  await page.goto(`${BASE}/mesa/${table}`);
  await page.getByLabel("¿Cómo te llamamos?").fill(alias);
  await page.getByRole("button", { name: /Ver la carta/ }).click();
  await page.waitForURL(`**/mesa/${table}/menu`);
  const sheet = page.getByRole("dialog");
  await sheet.waitFor();
  if (restriction) {
    await sheet.getByRole("button", { name: restriction, exact: true }).click();
    await sheet.getByRole("button", { name: /Guardar/ }).click();
  } else {
    await sheet.getByRole("button", { name: "Omitir" }).click();
  }
  await sheet.waitFor({ state: "detached" });
}

export async function addDish(page, table, dishId, { variant, qty = 1, note } = {}) {
  // Como un cliente real: desde la carta entra al plato y, al agregar, vuelve a la carta.
  await page.goto(`${BASE}/mesa/${table}/menu`);
  await page.locator(`a[href="/mesa/${table}/plato/${dishId}"]`).last().click();
  const add = page.getByRole("button", { name: /^Agregar ·/ });
  await add.waitFor();
  if (variant) await page.getByRole("radio", { name: new RegExp(variant) }).click();
  for (let i = 1; i < qty; i++) await page.getByRole("button", { name: "Agregar uno" }).click();
  if (note) await page.getByLabel(/Nota para la cocina/).fill(note);
  await add.click();
  await page.waitForURL(`**/mesa/${table}/menu`);
}

export function check(label, ok, detail = "") {
  console.log(`${ok ? "✔" : "✘"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

/** Espera a que el elemento sea visible (hasta `timeout` ms) y devuelve si lo logró. */
export async function visible(locator, timeout = 4000) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}
