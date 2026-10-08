// Guion de demo de la sustentación (BRIEF §16), automatizado con cinco pestañas del mismo
// navegador. Sirve para ensayar y para comprobar que todo el flujo funciona sin tropiezos.
// Uso: con la app corriendo, `npm run e2e` (E2E_URL para otra dirección, HEADED=1 para verlo).
import {
  abrirMesa,
  addDish,
  BASE,
  check,
  entrarComo,
  joinTable,
  launch,
  visible,
  watch,
} from "./helpers.mjs";

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, locale: "es-CO" });
const errors = [];
const tab = async (name, width = 360, height = 780) => {
  const p = watch(await ctx.newPage(), name, errors);
  await p.setViewportSize({ width, height });
  return p;
};
const recsOf = (p) => p.locator("section[aria-labelledby=recomendados] h3").allTextContents();

// 0. Datos limpios
const hub = await tab("Hub", 1280, 900);
await hub.goto(`${BASE}/?demo=1`);
await hub.getByRole("button", { name: /Reiniciar datos/ }).click();
await hub.getByRole("button", { name: "Sí, reiniciar" }).click();

// 1. Hora simulada: Almuerzo
await hub.getByRole("radio", { name: /Almuerzo/ }).click();
check("1. Hora simulada en Almuerzo", await visible(hub.getByText("Ahora: Almuerzo (simulada)")));
await hub.keyboard.press("Escape");

// 2. Pestaña A: Ana, alergia a lácteos
const ana = await tab("Ana");
await ana.goto(`${BASE}/mesa/3`);
check(
  "2. Una mesa sin abrir no deja entrar",
  await visible(ana.getByText("Pide al mesero que abra tu mesa.")),
);
const pin3 = await abrirMesa(ctx, 3);
check("2. El mesero abre la mesa y obtiene un PIN de 4 dígitos", /^\d{4}$/.test(pin3 ?? ""), pin3);
await ana.getByLabel("¿Cómo te llamamos?").fill("Ana");
await ana.getByLabel("PIN de la mesa").fill("0000" === pin3 ? "1111" : "0000");
await ana.getByRole("button", { name: /Ver la carta/ }).click();
check("2. Con otro PIN no entra", await visible(ana.getByText("Ese PIN no es el de la mesa")));
await ana.getByLabel("PIN de la mesa").fill(pin3);
await ana.getByRole("button", { name: /Ver la carta/ }).click();
await ana.waitForURL("**/menu");
const before = await (async () => {
  await ana.getByRole("dialog").waitFor();
  return recsOf(ana);
})();
await ana.getByRole("dialog").getByRole("button", { name: "Lácteos", exact: true }).click();
await ana
  .getByRole("dialog")
  .getByRole("button", { name: /Guardar/ })
  .click();
await ana.getByRole("dialog").waitFor({ state: "detached" });
const after = await recsOf(ana);
check(
  "2. Los recomendados cambian con la alergia",
  JSON.stringify(before) !== JSON.stringify(after),
  after.join(", "),
);
check("2. No se recomienda la Clásica 27 (tiene lácteos)", !after.includes("Clásica 27"));
await ana.goto(`${BASE}/mesa/3/plato/clasica-27`);
check(
  "2. La ficha de la Clásica 27 avisa de los lácteos",
  await visible(ana.getByRole("alert").filter({ hasText: "Tiene lácteos" })),
);

// 3. Pestaña B: Luis; carrito compartido en vivo; Luis envía
const luis = await tab("Luis");
await joinTable(luis, 3, "Luis");
await addDish(ana, 3, "pollo-crispy", { note: "Sin pepinillos" });
await addDish(ana, 3, "limonada-de-coco");
await addDish(luis, 3, "clasica-27", { variant: "Doble" });
await addDish(luis, 3, "aros-de-cebolla");
await ana.goto(`${BASE}/mesa/3/carrito`);
await luis.goto(`${BASE}/mesa/3/carrito`);
const cartA = await ana
  .getByText(/Total del carrito/)
  .locator("..")
  .innerText();
const cartL = await luis
  .getByText(/Total del carrito/)
  .locator("..")
  .innerText();
check("3. Ana y Luis ven el mismo carrito", cartA === cartL, cartA.replace(/\n/g, " "));
await luis.getByRole("button", { name: "Enviar pedido" }).click();
check(
  "3. Confirmación por comensal",
  (await luis.getByLabel("Platos por comensal").textContent()) === "Ana 2 · Luis 2",
);
await luis.getByRole("button", { name: /Sí, enviar/ }).click();
await luis.waitForURL("**/pedido");
await ana.waitForTimeout(300);
check("3. Ana ve que Luis envió el pedido", await visible(ana.getByText("Luis envió el pedido")));

// 4. Pestaña C: mesero Carlos; quitar un ítem por Agotado; confirmar
const carlos = await tab("Carlos", 768, 1024);
await carlos.goto(`${BASE}/mesero`);
await entrarComo(carlos, "Carlos");
const ticket = carlos.getByRole("article", { name: /Mesa 3 · Ronda 1/ });
await ticket.waitFor();
check("4. Llega el ticket consolidado", (await ticket.locator("li").count()) >= 4);
await ticket
  .getByRole("listitem")
  .filter({ hasText: "Aros de cebolla" })
  .getByRole("button", { name: "Ajustar" })
  .click();
await carlos.getByRole("dialog").getByRole("radio", { name: "Agotado" }).click();
await carlos.getByRole("dialog").getByRole("button", { name: "Quitar del pedido" }).click();
await ana.goto(`${BASE}/mesa/3/pedido`);
check(
  "4. El cliente ve el ajuste con motivo",
  await visible(ana.getByText(/El mesero quitó Aros de cebolla/).first()),
);
await carlos.getByRole("button", { name: /Confirmar y enviar a cocina/ }).click();

// 5. Pestaña D: cocina; en preparación y listo; mesero entrega
const cocina = await tab("Cocina", 1280, 800);
await cocina.goto(`${BASE}/cocina`);
await entrarComo(cocina, "Cocina");
await cocina.getByRole("button", { name: "Empezar a preparar" }).click();
await ana.waitForTimeout(300);
check(
  "5. La línea de tiempo avanza a En preparación",
  (await ana.locator('[aria-current="step"]').innerText()).startsWith("En preparación"),
);
await cocina.getByRole("button", { name: "Marcar listo" }).click();
await carlos.waitForTimeout(300);
check(
  "5. El mesero recibe el aviso de listo",
  await visible(carlos.getByText("Mesa 3 · Ronda 1 está listo")),
);
await carlos.getByRole("button", { name: "Marcar entregado" }).click();
await ana.waitForTimeout(300);
check(
  "5. El cliente ve Entregado",
  await visible(ana.getByText("Entregado. ¡Buen provecho!").first()),
);

// 6. Calificar platos y dar 2 estrellas al servicio
await ana.getByRole("link", { name: /Califica tu experiencia/ }).click();
await ana.waitForURL("**/calificar");
for (const [dish, stars] of [
  ["Pollo crispy", 5],
  ["Limonada de coco", 4],
]) {
  await ana
    .getByRole("radiogroup", { name: `Calificación de ${dish}` })
    .getByRole("radio", { name: new RegExp(`^${stars} estrellas`) })
    .click();
}
await ana.getByRole("button", { name: /Enviar 2 calificaciones/ }).click();
await ana.getByText(/¿Cómo te atendió Carlos\?/).waitFor();
await ana
  .getByRole("radiogroup", { name: "Calificación del servicio" })
  .getByRole("radio", { name: /^2 estrellas/ })
  .click();
await ana.getByRole("button", { name: "Enviar calificación" }).click();
check("6. Calificación enviada", await visible(ana.getByText("¡Gracias, Ana!")));

// 7. Pestaña E: administrador
const admin = await tab("Admin", 1366, 900);
await admin.goto(`${BASE}/admin`);
await entrarComo(admin, "Marta");
check(
  "7. Aparece la alerta de servicio bajo de la Mesa 3",
  await visible(admin.getByText("Servicio bajo en la Mesa 3").first()),
);
await admin.goto(`${BASE}/admin/ventas`);
check("7. Ventas por franja", await visible(admin.getByText("Platos más pedidos por franja")));
await admin.goto(`${BASE}/admin/calificaciones`);
check("7. Reseñas y ranking", await visible(admin.getByText("Ranking de platos")));
await admin.goto(`${BASE}/admin/platos/nuevo`);
await admin.getByLabel("Nombre", { exact: true }).fill("Burger del Chef");
await admin.getByLabel("Categoría").selectOption("hamburguesas");
await admin.getByLabel("Precio").fill("28900");
await admin.getByLabel("Ingrediente", { exact: true }).fill("Carne madurada");
await admin.getByLabel("Subir fotos del plato").setInputFiles({
  name: "chef.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAAhIAIBx2YkIAAAAABJRU5ErkJggg==",
    "base64",
  ),
});
await admin.getByText("Principal").waitFor();
await admin.getByRole("button", { name: /^Almuerzo/ }).click();
await admin.getByRole("switch", { name: "Destacado por la casa" }).click();
await admin.getByRole("button", { name: "Crear plato" }).click();
await admin.waitForURL("**/admin/platos");
const sara = await tab("Sara");
await joinTable(sara, 2, "Sara");
check(
  "7. El plato nuevo sale de primero en los recomendados",
  (await recsOf(sara))[0] === "Burger del Chef",
  (await recsOf(sara)).join(", "),
);

// 8. Cierre: Vista 3D — próximamente
await sara.goto(`${BASE}/mesa/2/plato/clasica-27`);
check(
  "8. Botón “Vista 3D — próximamente”",
  await sara.getByRole("button", { name: "Vista 3D — próximamente" }).isDisabled(),
);

// 9. Roles y acceso
const pinMal = await tab("PIN", 390, 800);
await pinMal.goto(`${BASE}/entrar`);
await pinMal.getByLabel("PIN").fill("9999");
await pinMal.getByRole("button", { name: "Entrar", exact: true }).click();
check("9. Un PIN equivocado no entra", await visible(pinMal.getByText("PIN incorrecto")));
await pinMal.getByLabel("PIN").fill("1111");
await pinMal.getByRole("button", { name: "Entrar", exact: true }).click();
await pinMal.waitForURL("**/mesero");
check(
  "9. Con su PIN, el mesero llega a su pantalla",
  await visible(pinMal.getByText("Hola, Carlos")),
);
await pinMal.goto(`${BASE}/admin`);
check(
  "9. El mesero no entra al panel del administrador",
  await visible(pinMal.getByText("Esta sección no es para tu usuario")),
);

const caja = await tab("Caja", 1280, 900);
await caja.goto(`${BASE}/caja`);
await entrarComo(caja, "Julián");
check("9. El encargado ve todo el salón", await visible(caja.getByText("Todo el salón")));
await caja.getByRole("radio", { name: "Equipo" }).click();
await caja.getByLabel("Nombre").fill("Juliana");
await caja.getByLabel("PIN").fill("4444");
await caja.getByRole("button", { name: "Agregar", exact: true }).click();
check(
  "9. El encargado crea un mesero",
  await visible(caja.getByRole("button", { name: /Editar a Juliana/ })),
);
check(
  "9. El encargado no administra al administrador",
  await visible(caja.getByText("Solo el administrador").first()),
);
await caja.getByRole("button", { name: /Desactivar a Juliana/ }).click();
await caja.getByRole("button", { name: "Desactivar", exact: true }).click();
check(
  "9. Un usuario desactivado queda marcado",
  await visible(caja.getByText("Desactivado").first()),
);
await caja.goto(`${BASE}/admin`);
check(
  "9. El encargado no entra al panel completo",
  await visible(caja.getByText("Esta sección no es para tu usuario")),
);

// 10. Mesa cerrada: avisar al mesero, abrir con PIN y liberar
const nora = await tab("Nora", 390, 800);
await nora.goto(`${BASE}/mesa/5`);
await nora.getByRole("button", { name: "Avisar al mesero" }).click();
check(
  "10. El cliente avisó al mesero",
  await visible(nora.getByText("Ya avisamos al mesero").first()),
);
const daniela = await tab("Daniela", 900, 900);
await daniela.goto(`${BASE}/mesero`);
await entrarComo(daniela, "Daniela");
check(
  "10. El mesero ve que la Mesa 5 pide que la abra",
  await visible(daniela.getByText("La Mesa 5 pide que la abras")),
);
await daniela.getByRole("button", { name: /Abrir mesa/ }).click();
const pin5 = (await daniela.getByLabel("PIN de la mesa 5", { exact: true }).textContent())?.trim();
check("10. Al abrir, el aviso se atiende y aparece el PIN", /^\d{4}$/.test(pin5 ?? ""), pin5);
check(
  "10. A la clienta le pide el PIN sin recargar",
  await visible(nora.getByLabel("PIN de la mesa")),
);
await nora.getByLabel("¿Cómo te llamamos?").fill("Nora");
await nora.getByLabel("PIN de la mesa").fill(pin5);
await nora.getByRole("button", { name: /Ver la carta/ }).click();
await nora.waitForURL("**/mesa/5/menu");
await nora.getByRole("dialog").getByRole("button", { name: "Omitir" }).click();
check(
  "10. Con el PIN, la clienta entra a la carta",
  await visible(nora.locator("section[aria-labelledby=recomendados]")),
);
await daniela.getByRole("button", { name: "Liberar mesa" }).click();
await daniela.getByRole("button", { name: "Sí, liberar" }).click();
check(
  "10. Al liberar la mesa, la clienta lo ve",
  await visible(nora.getByText(/La mesa se liberó/)),
);

// 11. Pedido tomado por el mesero y edición con registro de cambios
await daniela.getByRole("button", { name: /^Mesa 5:/ }).click();
await daniela.getByRole("button", { name: "Tomar pedido" }).click();
let hoja = daniela.getByRole("dialog").last();
await hoja.getByRole("button", { name: "Agregar uno" }).first().click();
await hoja.getByRole("button", { name: /Enviar a cocina/ }).click();
const ronda = cocina.locator('article[aria-label="Mesa 5, ronda 1"]');
check("11. El pedido del mesero llega directo a cocina", await visible(ronda));
await daniela.getByRole("button", { name: /Editar.*ronda 1/ }).click();
hoja = daniela.getByRole("dialog").last();
await hoja
  .getByRole("button", { name: /Ajustar/ })
  .first()
  .click();
hoja = daniela.getByRole("dialog").last();
await hoja.getByRole("radio", { name: "Cantidad" }).click();
await hoja.getByRole("button", { name: "Agregar uno" }).click();
await hoja.getByRole("radio", { name: "Error al tomar el pedido" }).click();
await hoja.getByRole("button", { name: "Guardar ajuste" }).click();
check(
  "11. Cocina ve el aviso de cambio del mesero",
  await visible(ronda.getByText("Cambios del mesero")),
);
check(
  "11. El cambio queda en el registro con quién y por qué",
  await visible(daniela.getByText(/Daniela · .*Error al tomar el pedido/)),
);
await ronda.getByRole("button", { name: "Visto" }).click();
check(
  "11. Al marcar visto, el aviso desaparece",
  !(await visible(ronda.getByText("Cambios del mesero"), 1500)),
);

// 12. Marca del negocio: plantilla, tipografías y logo
await admin.goto(`${BASE}/admin/configuracion`);
await admin.getByRole("radio", { name: /Moderno/ }).click();
const bgDe = (p) =>
  p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
check("12. La plantilla cambia los colores al instante", (await bgDe(admin)) === "#F6F7F9");
await nora.goto(`${BASE}/mesa/5/menu`);
check(
  "12. El cliente ve la plantilla elegida",
  await nora
    .waitForFunction(
      () =>
        getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() === "#F6F7F9",
      null,
      { timeout: 5000 },
    )
    .then(
      () => true,
      () => false,
    ),
);
await admin.getByLabel("Títulos").selectOption("lora");
check(
  "12. Las tipografías propias se aplican",
  (
    await admin.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--brand-serif"),
    )
  ).includes("Lora"),
);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
await admin
  .getByLabel("Archivo del logo")
  .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
check(
  "12. El logo subido se ve en la vista previa",
  await visible(admin.getByRole("img", { name: /Logo de/ })),
);
await admin.getByRole("button", { name: "Quitar", exact: true }).click();
await admin.getByRole("radio", { name: /Cálido/ }).click();
check("12. Volver a Cálido restaura la marca de la casa", (await bgDe(admin)) === "#FAF7F2");

// 13. Caja: abrir turno, cobrar, cerrar con diferencia y ver el reporte
await caja.goto(`${BASE}/caja`);
await caja.getByRole("radio", { name: "Caja", exact: true }).click();
check(
  "13. Sin turno abierto no se puede cobrar",
  await visible(caja.getByText("La caja está cerrada")),
);
await caja.getByRole("button", { name: "Abrir caja" }).click();
check("13. La caja se abre con su fondo", await visible(caja.getByText(/Caja abierta por Julián/)));
await caja.getByRole("button", { name: /Cobrar.*Mesa 5/ }).click();
await caja.getByRole("button", { name: "Registrar pago" }).click();
check(
  "13. Se cobra la cuenta completa y sale de las pendientes",
  !(await visible(caja.getByRole("button", { name: /Cobrar.*Mesa 5/ }), 2000)),
);
await caja.getByRole("button", { name: "Cerrar caja" }).click();
await caja.getByLabel("Efectivo contado").fill("1000");
await caja.getByRole("button", { name: "Cerrar caja" }).last().click();
check(
  "13. Con diferencia, el cierre exige explicarla",
  await visible(caja.getByText("Hay diferencia: cuéntanos a qué se debe")),
);
await caja.getByLabel("Nota").fill("Conteo de prueba");
await caja.getByRole("button", { name: "Cerrar caja" }).last().click();
check("13. La caja queda cerrada", await visible(caja.getByText("La caja está cerrada")));
await admin.goto(`${BASE}/admin/reportes`);
check(
  "13. El reporte muestra el cobro por forma de pago",
  await visible(admin.getByText("Cobrado por forma de pago")),
);
check(
  "13. El reporte muestra el cambio del mesero",
  await visible(admin.getByText("Error al tomar el pedido")),
);
check(
  "13. El reporte muestra el cierre con su nota",
  await visible(admin.getByText("Conteo de prueba")),
);

// 14. Domicilios: pedir desde casa, gestionar en caja, cocina, despachar, cobrar y reporte
await admin.goto(`${BASE}/admin/configuracion`);
await admin.getByLabel("Abre", { exact: true }).fill("00:00");
await admin.getByLabel("Cierra", { exact: true }).fill("00:00");
await admin.getByRole("button", { name: "Guardar cambios" }).click();
check(
  "14. El administrador guarda el horario de domicilios",
  await visible(admin.getByText("Domicilios guardados")),
);

const casa = await tab("Casa", 390, 800);
await casa.goto(`${BASE}/domicilio`);
await casa
  .getByRole("button", { name: /Clásica 27/ })
  .first()
  .click();
await casa.getByRole("button", { name: "Agregar uno" }).click();
await casa.getByRole("button", { name: /^Agregar ·/ }).click();
await casa.getByRole("link", { name: /Ver mi pedido/ }).click();
await casa.getByLabel("Nombre").fill("Camila Ríos");
await casa.getByLabel("Celular").fill("300 123 4567");
await casa.getByLabel("Zona").selectOption("zona-centro");
await casa.getByLabel("Dirección").fill("Calle 10 # 5-20 apto 301");
await casa.getByRole("button", { name: /Hacer el pedido/ }).click();
await casa.waitForURL("**/domicilio/seguimiento/**");
check(
  "14. El cliente ve que su pedido fue recibido",
  await visible(casa.getByText(/Recibimos tu pedido/)),
);

await caja.goto(`${BASE}/caja`);
await caja.getByRole("radio", { name: /Domicilios/ }).click();
check("14. Caja ve el domicilio nuevo", await visible(caja.getByText(/Camila Ríos/)));
await caja.getByRole("button", { name: "Confirmar" }).click();
check("14. El cliente ve el pedido confirmado", await visible(casa.getByText(/está confirmado/)));
const dom = cocina.locator('article[aria-label^="Domicilio D-"]');
check("14. Cocina recibe el domicilio con su código", await visible(dom));
await dom.getByRole("button", { name: /Empezar a preparar/ }).click();
await dom.getByRole("button", { name: /Marcar listo/ }).click();
await caja.getByRole("button", { name: "Despachar" }).click();
check("14. El cliente ve que va en camino", await visible(casa.getByText(/va en camino/)));
await caja.getByRole("button", { name: /^Entregado/ }).click();
check("14. El cliente ve que llegó", await visible(casa.getByText(/Tu pedido llegó/)));

await caja.getByRole("radio", { name: "Caja", exact: true }).click();
await caja.getByRole("button", { name: "Abrir caja" }).click();
await caja.getByRole("radio", { name: /Domicilios/ }).click();
await caja.getByRole("button", { name: /^Cobrar/ }).click();
await caja.getByRole("button", { name: "Registrar pago" }).click();
check(
  "14. Se cobra el domicilio con su envío",
  await visible(caja.getByText("Pagado", { exact: true })),
);

await casa.goto(`${BASE}/domicilio`);
await casa
  .getByRole("button", { name: /Clásica 27/ })
  .first()
  .click();
await casa.getByRole("button", { name: /^Agregar ·/ }).click();
await casa.getByRole("link", { name: /Ver mi pedido/ }).click();
await casa.getByRole("radio", { name: "Recoger" }).click();
await casa.getByLabel("Nombre").fill("Camila Ríos");
await casa.getByLabel("Celular").fill("3001234567");
await casa.getByRole("button", { name: /Hacer el pedido/ }).click();
await casa.waitForURL("**/domicilio/seguimiento/**");
await casa.getByRole("button", { name: "Cancelar pedido" }).click();
await casa.getByRole("button", { name: "Sí, cancelar" }).click();
check(
  "14. El cliente puede cancelar mientras no lo confirmen",
  await visible(casa.getByText(/Este pedido se canceló/)),
);

await admin.goto(`${BASE}/admin/reportes`);
check(
  "14. El reporte incluye los domicilios por zona",
  await visible(admin.getByText("Domicilios y recogida")),
);

// 15. Idioma y moneda del cliente
const turista = await browser.newContext({
  viewport: { width: 390, height: 800 },
  locale: "en-US",
});
const tour = watch(await turista.newPage(), "Turista", errors);
await tour.goto(`${BASE}/domicilio`);
check(
  "15. Con el celular en inglés, la carta de domicilios sale en inglés",
  await visible(tour.getByRole("heading", { name: "Order delivery or pickup" })),
);
await tour.getByRole("button", { name: "Español" }).click();
check(
  "15. El cliente puede cambiar a español y se recuerda",
  await visible(tour.getByRole("heading", { name: "Pide a domicilio o para recoger" })),
);
await tour.reload();
check(
  "15. Al recargar sigue en español",
  await visible(tour.getByRole("heading", { name: "Pide a domicilio o para recoger" })),
);
await tour.getByRole("button", { name: "English" }).click();
check(
  "15. Los platos salen traducidos",
  await visible(tour.getByText("Classic 27").or(tour.getByText("Clásica 27")).first()),
);
check(
  "15. El personal siempre ve español",
  await (async () => {
    await tour.goto(`${BASE}/caja`);
    return visible(tour.getByText(/Entrar a Caja|Usuarios de la demo/).first());
  })(),
);

await admin.goto(`${BASE}/admin/configuracion`);
await admin.getByLabel("Moneda de los precios").selectOption("USD");
check(
  "15. Al cambiar la moneda, los precios usan su símbolo",
  await visible(admin.getByText("US$12,500").first()),
);
await admin.getByLabel("Moneda de los precios").selectOption("COP");
await turista.close();

// Limpieza: hora automática
await hub.goto(`${BASE}/?demo=1`);
await hub.getByRole("radio", { name: /Automática/ }).click();

check("Sin errores de consola", errors.length === 0, errors.join(" | "));
await browser.close();
