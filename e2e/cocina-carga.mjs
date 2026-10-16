// Prueba de carga de la cocina (RNF-02): con 12 pedidos activos deben verse todos, con su detalle,
// en una pantalla de 1280 por 800 sin desplazarse. Opcional: una ruta para guardar la captura.
// Uso: con la app corriendo, `node e2e/cocina-carga.mjs [N] [captura.png]` (E2E_URL para otra dirección).
import { addDish, BASE, check, entrarComo, joinTable, launch } from "./helpers.mjs";
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-CO" });
const hub = await ctx.newPage();
await hub.goto(`${BASE}/demo?demo=1`);
await hub.getByRole("button", { name: /Reiniciar datos/ }).click();
await hub.getByRole("button", { name: "Sí, reiniciar" }).click();
await hub.getByRole("radio", { name: /Almuerzo/ }).click();
const mk = async (n) => {
  const w = await ctx.newPage();
  await w.setViewportSize({ width: 1280, height: 900 });
  await w.goto(`${BASE}/mesero`);
  await entrarComo(w, n);
  return w;
};
const carlos = await mk("Carlos");
const daniela = await mk("Daniela");
const N = +(process.argv[2] ?? 12);
const dishes = ["pollo-crispy", "clasica-27", "limonada-de-coco", "aros-de-cebolla"];
let k = 0;
for (let mesa = 1; mesa <= 6 && k < N; mesa++) {
  const p = await ctx.newPage();
  await joinTable(p, mesa, `C${mesa}`);
  for (let ronda = 1; ronda <= 2 && k < N; ronda++) {
    await addDish(p, mesa, dishes[k % 4]);
    await addDish(p, mesa, dishes[(k + 1) % 4], { note: ronda === 1 ? "Sin cebolla" : undefined });
    await p.goto(`${BASE}/mesa/${mesa}/carrito`);
    await p.getByRole("button", { name: "Enviar pedido" }).click();
    await p.getByRole("button", { name: /Sí, enviar/ }).click();
    await p.waitForURL("**/pedido");
    const jefe = mesa <= 3 ? carlos : daniela;
    await jefe.goto(`${BASE}/mesero`);
    await jefe
      .getByRole("article", { name: new RegExp(`Mesa ${mesa} · Ronda ${ronda}`) })
      .getByRole("button", { name: /Confirmar y enviar a cocina/ })
      .click();
    k++;
  }
  await p.close();
}
const cocina = await ctx.newPage();
await cocina.setViewportSize({ width: 1280, height: 800 });
await cocina.goto(`${BASE}/cocina`);
await entrarComo(cocina, "Cocina");
await cocina.waitForTimeout(1500);
const info = await cocina.evaluate(() => {
  const m = document.querySelector("main");
  return {
    cards: document.querySelectorAll("main article").length,
    scroll: m.scrollHeight,
    client: m.clientHeight,
  };
});
check(`Se crearon ${N} pedidos en la cola`, info.cards === N, `${info.cards}`);
check(
  `Los ${N} pedidos caben en 1280 por 800 sin desplazarse`,
  info.scroll <= info.client,
  `contenido ${info.scroll} px, pantalla ${info.client} px`,
);
if (process.argv[3]) await cocina.screenshot({ path: process.argv[3] });
await browser.close();
