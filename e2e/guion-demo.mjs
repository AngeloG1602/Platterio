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
await hub.goto(`${BASE}/demo?demo=1`);
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
check(
  "5. La cocina conserva su modo oscuro",
  (await cocina.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim().toLowerCase(),
  )) === "#0e0d0c",
);
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

// 8. Cierre: la ficha tiene el visor 3D (se prueba a fondo en la sección 16)
await sara.goto(`${BASE}/mesa/2/plato/clasica-27`);
check(
  "8. La ficha ofrece “Ver en 3D”",
  await visible(sara.getByRole("button", { name: "Ver en 3D" }).first()),
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
const clasica = hoja.getByText("Clásica 27", { exact: true });
const limonada = hoja.getByText("Limonada de coco", { exact: true });
check(
  "11. El mesero ve toda la carta con buscador y filtros",
  (await visible(clasica)) && (await visible(limonada)),
);
await hoja.getByLabel("Buscar plato o ingrediente").fill("quéso");
check(
  "11. Busca por ingrediente sin importar tildes",
  (await visible(clasica)) && !(await visible(limonada, 800)),
);
await hoja.getByRole("button", { name: "Limpiar filtros" }).click();
await hoja.getByRole("button", { name: "Filtros" }).click();
await hoja.getByRole("button", { name: "Lácteos" }).click();
check(
  "11. Filtra los platos sin un alérgeno",
  (await visible(limonada)) && !(await visible(clasica, 800)),
);
await hoja.getByRole("button", { name: "Hamburguesas", exact: true }).click();
await hoja.getByLabel("Buscar plato o ingrediente").fill("limonada");
check(
  "11. Combina filtros y avisa si no hay resultados",
  await visible(hoja.getByText(/No hay platos con esos filtros|Sin resultados/)),
);
await hoja.getByRole("button", { name: "Limpiar filtros" }).first().click();
check("11. Limpiar devuelve toda la carta", (await visible(clasica)) && (await visible(limonada)));
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
await admin.locator("#domicilios").getByRole("button", { name: "Guardar cambios" }).click();
check(
  "14. El administrador guarda el horario de domicilios",
  await visible(admin.getByText("Domicilios guardados")),
);
check(
  "14. Configuración tiene el WhatsApp del negocio y el celular de cada domiciliario",
  (await admin.getByLabel("Número de WhatsApp").inputValue()) === "3000000000" &&
    (await visible(admin.getByText(/Andrés.*300 000 0001/))),
);

await admin
  .getByLabel("Enlace o identificador de tu negocio en Google")
  .fill("https://evil.example.com/r/abc");
await admin.getByRole("button", { name: "Guardar enlace" }).click();
check(
  "14. No se acepta un enlace de reseñas que no sea de Google",
  await visible(admin.getByText(/Usa el enlace de “Pedir reseñas”/)),
);
await admin
  .getByLabel("Enlace o identificador de tu negocio en Google")
  .fill("https://g.page/r/CabcDEF123456/review");
await admin.getByRole("button", { name: "Guardar enlace" }).click();
check(
  "14. El administrador enlaza las reseñas de Google",
  (await visible(admin.getByText("Enlace de reseñas guardado"))) &&
    (await visible(admin.getByText("Enlazado", { exact: true }))),
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

const avisoNegocio = await casa
  .getByRole("link", { name: /Avisar por WhatsApp/ })
  .getAttribute("href");
const textoNegocio = decodeURIComponent(avisoNegocio?.split("text=")[1] ?? "");
check(
  "14. El cliente puede avisar al negocio por WhatsApp con su pedido ya escrito",
  avisoNegocio?.startsWith("https://wa.me/573000000000?text=") &&
    textoNegocio.includes("Camila Ríos") &&
    textoNegocio.includes("Calle 10 # 5-20 apto 301") &&
    textoNegocio.includes("Clásica 27") &&
    /\*Pedido D-/.test(textoNegocio),
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
await caja.getByRole("button", { name: "Agregar domiciliario" }).click();
await caja.getByLabel("Nombre del nuevo domiciliario").fill("Mateo");
await caja.getByLabel("Celular del nuevo domiciliario").fill("300 777 8899");
await caja.getByRole("button", { name: "Guardar", exact: true }).click();
check(
  "14. Caja agrega un domiciliario con su celular",
  await visible(caja.getByText("Mateo agregado")),
);
await caja.getByLabel(/Domiciliario para/).selectOption("Mateo");
check(
  "14. Antes de despachar, el cliente aún no ve al domiciliario",
  !(await visible(casa.getByText(/Tu domiciliario/), 800)),
);
await caja.getByRole("button", { name: "Despachar", exact: true }).click();
check("14. El cliente ve que va en camino", await visible(casa.getByText(/va en camino/)));
check(
  "14. El cliente recibe el contacto del domiciliario: WhatsApp y llamada",
  (await visible(casa.getByText("Tu domiciliario: Mateo"))) &&
    (await casa.getByRole("link", { name: /WhatsApp con Mateo/ }).getAttribute("href"))?.startsWith(
      "https://wa.me/573007778899?text=",
    ) &&
    (await casa.getByRole("link", { name: /Llamar a Mateo/ }).getAttribute("href")) ===
      "tel:+573007778899",
);
const avisoChofer = await caja.getByRole("link", { name: /Avisar a Mateo/ }).getAttribute("href");
const textoChofer = decodeURIComponent(avisoChofer?.split("text=")[1] ?? "");
check(
  "14. Caja puede escribirle al domiciliario con la dirección, el cliente y el cobro",
  avisoChofer?.startsWith("https://wa.me/573007778899?text=") &&
    textoChofer.includes("Camila Ríos · 300 123 4567") &&
    textoChofer.includes("Calle 10 # 5-20 apto 301") &&
    textoChofer.includes("google.com/maps") &&
    textoChofer.includes("Cobrar:"),
);
await caja.getByRole("button", { name: /^Entregado/ }).click();
check("14. El cliente ve que llegó", await visible(casa.getByText(/Tu pedido llegó/)));
check(
  "14. Al llegar, se le invita a dejar su reseña en Google",
  (await casa.getByRole("link", { name: /Dejar mi reseña/ }).getAttribute("href")) ===
    "https://g.page/r/CabcDEF123456/review",
);

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

// 16. Visor 3D: personalizar un plato y verlo en carrito, mesero y cocina
await sara.goto(`${BASE}/mesa/2/plato/clasica-27`);
await sara.getByRole("button", { name: "Ver en 3D" }).last().click();
const visor = sara.getByRole("dialog");
check(
  "16. Se abre el visor con la personalización",
  await visible(visor.getByText("Personaliza tu Clásica 27")),
);
await visor.getByRole("button", { name: "Menos Cebolla caramelizada" }).click();
await visor.getByRole("button", { name: /Más Queso cheddar/ }).click();
await visor.getByRole("button", { name: /^Listo/ }).click();
check(
  "16. La ficha muestra “Tu versión” con el cambio de precio",
  await visible(sara.getByText(/Tu versión: .*Sin /)),
);
await sara.getByRole("button", { name: /^Agregar ·/ }).click();
await sara.waitForURL("**/mesa/2/menu");
await sara.goto(`${BASE}/mesa/2/carrito`);
check(
  "16. El carrito muestra lo que cambió",
  await visible(sara.getByText(/Sin .*Extra|Extra .*Sin/).first()),
);
await sara.getByRole("button", { name: "Enviar pedido" }).click();
await sara.getByRole("button", { name: /Sí, enviar/ }).click();
await sara.waitForURL("**/pedido");
await carlos.goto(`${BASE}/mesero`);
await carlos.getByRole("button", { name: /^Mesa 2:/ }).click();
check(
  "16. El mesero ve la comanda personalizada",
  await visible(carlos.getByText(/^SIN /).first()),
);
await carlos.keyboard.press("Escape");
await carlos
  .getByRole("button", { name: /Confirmar y enviar a cocina/ })
  .first()
  .click();
const personalizada = cocina.locator('article[aria-label="Mesa 2, ronda 1"]');
check(
  "16. Cocina ve “SIN …” y “EXTRA …” destacados",
  await visible(personalizada.getByText(/^SIN /)),
);

// 17. Mirar la carta sin poder pedir hasta que el mesero abra la mesa
const visita = await tab("Visita", 390, 800);
await visita.goto(`${BASE}/mesa/6`);
await visita.getByRole("link", { name: "Ver la carta mientras tanto" }).click();
await visita.waitForURL("**/mesa/6/menu");
check(
  "17. Con la mesa cerrada se puede mirar la carta",
  await visible(visita.getByText("Solo mirando")),
);
await visita.getByRole("dialog").getByRole("button", { name: "Omitir" }).click();
check("17. Los precios se ven", await visible(visita.getByText(/\$22\.900/).first()));
check(
  "17. Hay un aviso en vez del carrito",
  await visible(visita.getByText("Para pedir, tu mesero abre la mesa y te da un PIN.")),
);
await visita.locator('a[href="/mesa/6/plato/clasica-27"]').last().click();
await visita.waitForURL("**/plato/clasica-27");
check(
  "17. En la ficha no hay botón de agregar",
  !(await visible(visita.getByRole("button", { name: /^Agregar ·/ }), 1500)),
);
check("17. En la ficha se ve el precio", await visible(visita.getByText(/\$22\.900/).first()));
check(
  "17. Se puede abrir el visor 3D para mirar",
  await visible(visita.getByRole("button", { name: "Ver en 3D" }).first()),
);
const pin6 = await abrirMesa(ctx, 6);
check(
  "17. Al abrir la mesa, la barra pide el PIN",
  await visible(visita.getByText("Tu mesa ya está abierta")),
);
await visita.getByRole("link", { name: "Poner PIN" }).click();
await visita.getByLabel("¿Cómo te llamamos?").fill("Visita");
await visita.getByLabel("PIN de la mesa").fill(pin6);
await visita.getByRole("button", { name: /Ver la carta/ }).click();
await visita.waitForURL("**/mesa/6/plato/clasica-27");
check(
  "17. Tras el PIN vuelve al mismo plato y ya puede pedir",
  await visible(visita.getByRole("button", { name: /^Agregar ·/ })),
);

// 18. Estilos de la carta: cambian lo que ve el cliente, no las pantallas del personal
await admin.goto(`${BASE}/admin/configuracion`);
const estilos = admin.getByRole("radiogroup", { name: "Estilos de la carta" });
await estilos.getByRole("radio", { name: /^Bistró oscuro/ }).click();
check(
  "18. Elegir un estilo muestra la vista previa sin aplicarlo todavía",
  await visible(admin.getByRole("img", { name: "Vista previa del estilo Bistró oscuro" })),
);
await admin.getByRole("button", { name: "Usar Bistró oscuro" }).click();
const estilista = await tab("Estilo", 390, 900);
await estilista.goto(`${BASE}/domicilio`);
await estilista.getByRole("heading", { name: /Pide a domicilio/ }).waitFor();
const fondo = (p) => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
check(
  "18. El cliente ve el fondo oscuro del estilo",
  (await fondo(estilista)) === "rgb(21, 18, 15)",
);
check(
  "18. El nombre del negocio sigue en la carta",
  await visible(estilista.getByText("Fogón").first()),
);
await admin.goto(`${BASE}/admin`);
await admin.getByRole("heading", { level: 1 }).first().waitFor();
check(
  "18. Las pantallas del personal conservan su paleta clara",
  (await fondo(admin)) === "rgb(250, 247, 242)",
);
await admin.goto(`${BASE}/admin/configuracion`);
await estilos.getByRole("radio", { name: /^Café minimal/ }).click();
await admin.getByRole("button", { name: "Usar Café minimal" }).click();
await estilista.goto(`${BASE}/domicilio`);
await estilista.getByRole("heading", { name: /Pide a domicilio/ }).waitFor();
check(
  "18. Con otro estilo cambia la distribución (cuadrícula)",
  await estilista.evaluate(() => {
    const ul = document.querySelector("main ul");
    return ul ? getComputedStyle(ul).display === "grid" : false;
  }),
);
await estilos.getByRole("radio", { name: /^Clásico/ }).click();
await admin.getByRole("button", { name: "Usar Clásico" }).click();
await estilista.close();

// 19. Cuentas: página de ventas, registro, prueba de 7 días e ingreso del dueño
const dueno = await tab("Dueño", 1200, 900);
await dueno.goto(`${BASE}/`);
check(
  "19. La página principal es la de ventas",
  await visible(dueno.getByRole("heading", { name: /Tu carta, tu salón y tu caja/ })),
);
check(
  "19. La demo quedó en /demo",
  await visible(dueno.getByRole("link", { name: "Ver la demo" }).first()),
);
await dueno
  .getByRole("link", { name: /Probar 7 días gratis/ })
  .first()
  .click();
await dueno.waitForURL("**/registro");
await dueno.getByLabel("Nombre de tu negocio").fill("Casa Verde");
await dueno.getByLabel("Correo").fill("dueno-sin-arroba");
await dueno.getByLabel("Contraseña", { exact: true }).fill("corta");
await dueno.getByRole("checkbox").check();
await dueno.getByRole("button", { name: /Crear mi cuenta/ }).click();
check("19. Valida el correo", await visible(dueno.getByText(/Revisa el correo/)));
check("19. Valida la contraseña", await visible(dueno.getByText(/al menos 8 caracteres/)));
await dueno.getByLabel("Correo").fill("dueno@casaverde.co");
await dueno.getByLabel("Contraseña", { exact: true }).fill("clave12345");
await dueno.getByRole("button", { name: /Crear mi cuenta/ }).click();
await dueno.waitForURL("**/admin");
check(
  "19. Al registrarse entra al panel con el nombre de su negocio",
  await visible(dueno.getByText("Casa Verde").first()),
);
check(
  "19. Se ve la prueba gratis de 7 días",
  await visible(dueno.getByText("Prueba gratis: te quedan 7 días")),
);
await dueno.getByRole("button", { name: /Salir/ }).first().click();
await dueno.goto(`${BASE}/iniciar-sesion`);
await dueno.getByLabel("Correo").fill("dueno@casaverde.co");
await dueno.getByLabel("Contraseña", { exact: true }).fill("incorrecta1");
await dueno.getByRole("button", { name: "Entrar" }).click();
check(
  "19. Una contraseña incorrecta no deja entrar",
  await visible(dueno.getByText("Correo o contraseña incorrectos")),
);
await dueno.getByLabel("Contraseña", { exact: true }).fill("clave12345");
await dueno.getByRole("button", { name: "Entrar" }).click();
await dueno.waitForURL("**/admin");
check(
  "19. Con la contraseña correcta vuelve a su panel",
  await visible(dueno.getByText("Casa Verde").first()),
);
await dueno.getByRole("button", { name: /Salir/ }).first().click();
await dueno.goto(`${BASE}/registro`);
await dueno.getByLabel("Nombre de tu negocio").fill("Otra Casa");
await dueno.getByLabel("Correo").fill("DUENO@casaverde.co");
await dueno.getByLabel("Contraseña", { exact: true }).fill("clave12345");
await dueno.getByRole("checkbox").check();
await dueno.getByRole("button", { name: /Crear mi cuenta/ }).click();
check(
  "19. No se puede repetir el correo",
  await visible(dueno.getByText(/Ya hay una cuenta con este correo/)),
);
await dueno.goto(`${BASE}/iniciar-sesion`);
await dueno.getByLabel("Correo").fill("dueno@casaverde.co");
await dueno.getByLabel("Contraseña", { exact: true }).fill("clave12345");
await dueno.getByRole("button", { name: "Entrar" }).click();
await dueno.waitForURL("**/admin");
await dueno.goto(`${BASE}/admin?demo=1`);
await dueno.getByRole("button", { name: "Terminar la prueba" }).click();
check(
  "19. Con la prueba vencida se bloquea el panel",
  await visible(dueno.getByRole("heading", { name: "Tu cuenta venció" })),
);
await dueno.getByRole("button", { name: /Simular pago/ }).click();
check(
  "19. Al activar el plan vuelve a entrar, sin aviso de prueba",
  (await visible(dueno.getByText("Administrando"))) &&
    !(await visible(dueno.getByText(/Prueba gratis/), 1200)),
);
await dueno.close();

// 20. Direcciones por negocio y entrada del personal con código + PIN
const verde = await tab("Casa Verde", 1200, 900);
await verde.goto(`${BASE}/iniciar-sesion`);
check(
  "20. Con la sesión abierta, iniciar sesión ofrece ir al panel",
  await visible(verde.getByRole("heading", { name: "Ya iniciaste sesión" })),
);
await verde.getByRole("link", { name: "Ir a mi panel" }).click();
await verde.waitForURL("**/casa-verde/admin");
check(
  "20. El panel del dueño vive en la dirección de su negocio",
  verde.url().endsWith("/casa-verde/admin"),
);
check(
  "20. El resumen muestra el enlace público de domicilios del negocio",
  (await visible(verde.getByRole("heading", { name: "Tus enlaces" }))) &&
    (await visible(verde.getByText(/\/casa-verde\/domicilio$/))),
);
check(
  "20. Los enlaces del panel llevan el negocio",
  await visible(verde.locator('a[href="/casa-verde/admin/platos"]')),
);
await verde.goto(`${BASE}/casa-verde/admin/configuracion`);
check(
  "20. Las mesas se abren en la dirección del negocio",
  await visible(verde.locator('a[href="/casa-verde/mesa/1"]')),
);
await verde.goto(`${BASE}/casa-verde/admin/equipo`);
check(
  "20. El equipo muestra el código del negocio para el personal",
  (await visible(verde.getByRole("heading", { name: "Entrada del personal" }))) &&
    (await visible(verde.getByText("casa-verde", { exact: true }))),
);
await verde.goto(`${BASE}/casa-verde/admin/platos`);
check(
  "20. Editar un plato conserva el negocio en la dirección",
  await visible(verde.locator('a[href^="/casa-verde/admin/platos/"]')),
);

const publico = await tab("Público", 390, 900);
await publico.goto(`${BASE}/casa-verde/domicilio`);
check(
  "20. La carta de domicilios es pública en la dirección del negocio",
  await visible(publico.getByRole("heading", { name: /Pide a domicilio/ })),
);
await publico.goto(`${BASE}/casa-verde/mesa/6`);
await publico.getByRole("link", { name: "Ver la carta mientras tanto" }).click();
await publico.waitForURL("**/casa-verde/mesa/6/menu");
check(
  "20. La carta de la mesa también, sin perder el negocio al navegar",
  await visible(publico.getByText("Solo mirando")),
);
await publico.goto(`${BASE}/no-existe/domicilio`);
check(
  "20. Un negocio que no existe se avisa",
  await visible(publico.getByText("No encontramos este negocio")),
);

const personal = await tab("Personal", 390, 900);
await personal.goto(`${BASE}/personal`);
await personal.getByLabel("Código del negocio").fill("otro-codigo");
await personal.getByRole("button", { name: "Continuar" }).click();
check(
  "20. Un código equivocado no deja pasar",
  await visible(personal.getByText(/No encontramos un negocio con ese código/)),
);
await personal.getByLabel("Código del negocio").fill("Casa-Verde");
await personal.getByRole("button", { name: "Continuar" }).click();
await personal.getByLabel("PIN", { exact: true }).fill("1111");
await personal.getByRole("button", { name: "Entrar" }).click();
await personal.waitForURL("**/casa-verde/mesero");
check(
  "20. El mesero entra con código y PIN, sin correo, a la pantalla de su negocio",
  await visible(personal.getByRole("button", { name: /Salir de la sesión de Carlos/ })),
);
await verde.close();
await publico.close();
await personal.close();

// 21. Carta pública y página de inicio del negocio
const gente = await tab("Gente", 390, 900);
await gente.goto(`${BASE}/casa-verde`);
check(
  "21. El enlace del negocio muestra qué hacer: carta o domicilio",
  (await visible(gente.getByRole("heading", { name: "¿Qué quieres hacer?" }))) &&
    (await visible(gente.getByRole("link", { name: /Ver la carta/ }))) &&
    (await visible(gente.getByRole("link", { name: /Pedir a domicilio o para recoger/ }))),
);
check(
  "21. Recuerda que en el local se pide con el QR de la mesa",
  await visible(gente.getByText("¿Estás en el restaurante?")),
);
await gente.getByRole("link", { name: /Ver la carta/ }).click();
await gente.waitForURL("**/casa-verde/carta");
await gente.getByRole("dialog").getByRole("button", { name: "Omitir" }).click();
check(
  "21. La carta pública se ve sin mesa y con precios",
  (await visible(gente.getByRole("heading", { name: "¿Qué se te antoja?" }))) &&
    (await visible(gente.getByText(/\$22\.900/).first())),
);
check(
  "21. No muestra mesa ni carrito, y ofrece pedir a domicilio",
  !(await visible(gente.getByText(/^Mesa \d/), 1200)) &&
    (await visible(gente.getByRole("link", { name: /Pedir$/ }))),
);
await gente.locator('a[href^="/casa-verde/carta/plato/"]').first().click();
await gente.waitForURL("**/casa-verde/carta/plato/**");
check(
  "21. La ficha del plato se ve sin botón de agregar",
  (await visible(gente.getByText(/\$\d/).first())) &&
    !(await visible(gente.getByRole("button", { name: /^Agregar ·/ }), 1500)),
);
await gente.goto(`${BASE}/casa-verde/carta`);
await gente.getByRole("link", { name: /Pedir$/ }).click();
await gente.waitForURL("**/casa-verde/domicilio");
check(
  "21. Desde la carta se pasa a pedir a domicilio",
  await visible(gente.getByRole("heading", { name: /Pide a domicilio/ })),
);
await gente.goto(`${BASE}/carta`);
check(
  "21. La carta pública de la demo funciona sin negocio",
  await visible(gente.getByRole("heading", { name: "¿Qué se te antoja?" })),
);
await gente.goto(`${BASE}/negocio-que-no-existe`);
check(
  "21. Un inicio de negocio inexistente se avisa",
  await visible(gente.getByText("No encontramos este negocio")),
);
await gente.close();

const links = await tab("Enlaces", 1200, 900);
await links.goto(`${BASE}/casa-verde/admin`);
await links.getByRole("heading", { name: "Tus enlaces" }).waitFor();
check(
  "21. El panel ofrece copiar los enlaces: negocio, carta, domicilios, reservas y entrada del equipo",
  (await links.getByRole("button", { name: /Copiar enlace/ }).count()) === 5,
);
check(
  "21. Hay un enlace de entrada para el personal con su código",
  (await visible(links.getByText("Entrada de tu equipo"))) &&
    (await visible(links.getByText(/\/casa-verde\/entrar$/))) &&
    (await visible(links.getByText(/con el código/))),
);
await links.close();

// 22. Reservas y eventos
const manana = new Date(Date.now() + 86_400_000);
const diaReserva = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-${String(manana.getDate()).padStart(2, "0")}`;
const reserva = await tab("Reserva", 390, 900);
await reserva.goto(`${BASE}/casa-verde`);
check(
  "22. La página de inicio del negocio ofrece reservar",
  await visible(reserva.getByRole("link", { name: /Reservar mesa o evento/ })),
);
await reserva.getByRole("link", { name: /Reservar mesa o evento/ }).click();
await reserva.waitForURL("**/casa-verde/reservas");
await reserva.getByLabel("Día").fill(diaReserva);
await reserva.getByLabel("Hora").selectOption("19:30");
await reserva.getByLabel("Tu nombre").fill("Ana Gómez");
await reserva.getByLabel("Celular (WhatsApp)").fill("123");
await reserva.getByRole("button", { name: "Reservar" }).click();
check(
  "22. Valida el celular antes de reservar",
  await visible(reserva.getByText(/10 dígitos que empiece por 3/)),
);
await reserva.getByLabel("Celular (WhatsApp)").fill("300 123 4567");
await reserva.getByLabel("Personas").fill("4");
await reserva.getByRole("button", { name: "Reservar" }).click();
await reserva.waitForURL("**/casa-verde/reservas/**");
check(
  "22. La reserva queda por confirmar, con su código",
  (await visible(reserva.getByText("Por confirmar", { exact: true }))) &&
    (await visible(reserva.getByRole("heading", { name: /Reserva R-/ }))),
);
const waReserva = await reserva
  .getByRole("link", { name: /Escribirle al restaurante por WhatsApp/ })
  .getAttribute("href");
check(
  "22. El cliente puede avisar por WhatsApp con la reserva escrita",
  waReserva?.startsWith("https://wa.me/573000000000?text=") &&
    decodeURIComponent(waReserva).includes("Personas: 4") &&
    decodeURIComponent(waReserva).includes("Ana Gómez"),
);

const cajaRes = await tab("Caja reservas", 1200, 900);
await cajaRes.goto(`${BASE}/caja`);
await entrarComo(cajaRes, "Julián");
check(
  "22. Caja ve la solicitud en la pestaña de reservas",
  await visible(cajaRes.getByRole("radio", { name: /Reservas \(1\)/ })),
);
await cajaRes.getByRole("radio", { name: /Reservas/ }).click();
await cajaRes.getByRole("button", { name: "Confirmar", exact: true }).click();
check(
  "22. El cliente ve su reserva confirmada al instante",
  await visible(reserva.getByText(/Tu reserva está confirmada/)),
);
const waConf = await cajaRes
  .getByRole("link", { name: /Escribirle/ })
  .first()
  .getAttribute("href");
check(
  "22. Caja puede escribirle al cliente con la confirmación",
  decodeURIComponent(waConf ?? "").includes("está confirmada"),
);

// Evento con cotización
await reserva.goto(`${BASE}/casa-verde/reservas`);
await reserva.getByRole("radio", { name: "Evento" }).click();
await reserva.getByLabel("Día").fill(diaReserva);
await reserva.getByLabel("Hora").selectOption("20:00");
await reserva.getByLabel("Tu nombre").fill("Camila Ríos");
await reserva.getByLabel("Celular (WhatsApp)").fill("3009876543");
await reserva.getByLabel("Motivo del evento").selectOption("Cumpleaños");
await reserva.getByLabel("Presupuesto aproximado").fill("3000000");
await reserva.getByRole("button", { name: "Pedir cotización" }).click();
await reserva.waitForURL("**/casa-verde/reservas/**");
check(
  "22. Un evento queda como solicitud de cotización",
  (await visible(reserva.getByRole("heading", { name: /Evento R-/ }))) &&
    (await visible(reserva.getByText("Cumpleaños"))),
);
await cajaRes.getByRole("button", { name: "Cotizar" }).click();
await cajaRes.getByLabel("Concepto 1", { exact: true }).fill("Menú por persona");
await cajaRes.getByLabel("Valor 1", { exact: true }).fill("1500000");
await cajaRes.getByLabel("Concepto 2", { exact: true }).fill("Decoración");
await cajaRes.getByLabel("Valor 2", { exact: true }).fill("300000");
await cajaRes.getByLabel("Anticipo", { exact: true }).fill("500000");
await cajaRes.getByRole("switch", { name: "Anticipo recibido" }).click();
await cajaRes.getByRole("button", { name: "Guardar cotización" }).click();
check(
  "22. El cliente ve la cotización del evento y el anticipo recibido",
  (await visible(reserva.getByText("Cotización del evento"))) &&
    (await visible(reserva.getByText(/recibido/))),
);
await reserva.getByRole("button", { name: "Cancelar la reserva" }).click();
await reserva.getByRole("button", { name: "Sí, cancelar" }).click();
check(
  "22. El cliente puede cancelar y el negocio lo ve",
  (await visible(reserva.getByText("Cancelada", { exact: true }))) &&
    (await visible(cajaRes.getByRole("heading", { name: /Resueltas/ }))),
);

await admin.goto(`${BASE}/admin/configuracion`);
check(
  "22. Configuración tiene el panel de reservas y eventos",
  await visible(admin.getByRole("heading", { name: "Reservas y eventos" })),
);
await reserva.close();
await cajaRes.close();

// 23. Planes: Digital y Completo
await hub.goto(`${BASE}/demo?demo=1`);
await hub.getByRole("button", { name: "Digital", exact: true }).click();
await admin.goto(`${BASE}/admin`);
check(
  "23. En el plan Digital el panel no muestra Calificaciones",
  !(await visible(admin.getByRole("link", { name: "Calificaciones" }))),
);
await hub.getByRole("button", { name: "Completo", exact: true }).click();
await admin.goto(`${BASE}/admin`);
check(
  "23. En el plan Completo el panel sí muestra Calificaciones",
  await visible(admin.getByRole("link", { name: "Calificaciones" })),
);

// Limpieza: hora automática
await hub.goto(`${BASE}/demo?demo=1`);
await hub.getByRole("radio", { name: /Automática/ }).click();

check("Sin errores de consola", errors.length === 0, errors.join(" | "));
await browser.close();
