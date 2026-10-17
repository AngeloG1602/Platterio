// Captura las pantallas reales de la demo para el video de presentación.
// Uso: con la app corriendo (`npm run build && npm start`), `node video/captura/capturar.mjs`.
// Las imágenes quedan en video/captura/png (2x de resolución). E2E_URL cambia la dirección.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { abrirMesa, addDish, BASE, entrarComo, joinTable, visible } from "../../e2e/helpers.mjs";
import { chromium } from "playwright";

const OUT = fileURLToPath(new URL("./png/", import.meta.url));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "es-CO",
});
// Sin la pestaña flotante del panel de demo ni animaciones de entrada a medias.
await ctx.addInitScript(() => {
  const css = `[aria-label="Abrir panel de demo"]{display:none!important}
    nextjs-portal,[data-sonner-toaster]{display:none!important}`;
  const add = () => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  };
  if (document.head) add();
  else document.addEventListener("DOMContentLoaded", add);
});

const fallos = [];
// Cajas (en píxeles CSS) de lo que se toca o se resalta en cada captura, para animar el video.
const cajas = {};
const tab = async (w, h) => {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: w, height: h });
  return p;
};
async function shot(page, name, opts = {}) {
  try {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(opts.wait ?? 1200);
    const vp = page.viewportSize();
    cajas[name] = { w: vp.width, h: vp.height, boxes: {} };
    for (const [k, loc] of Object.entries(opts.boxes ?? {})) {
      const b = await loc
        .first()
        .boundingBox()
        .catch(() => null);
      if (b) cajas[name].boxes[k] = b;
      else console.log("  sin caja", name, k);
    }
    await page.screenshot({
      path: `${OUT}${name}.png`,
      fullPage: !!opts.full,
      animations: "disabled",
    });
    console.log("✔", name);
  } catch (e) {
    fallos.push(name);
    console.log("✘", name, e.message.split("\n")[0]);
  }
}
async function paso(nombre, fn) {
  try {
    await fn();
  } catch (e) {
    fallos.push(nombre);
    console.log("✘ paso", nombre, e.message.split("\n")[0]);
  }
}

// Datos limpios y hora de almuerzo
const hub = await tab(1280, 900);
await hub.goto(`${BASE}/demo?demo=1`);
await hub.getByRole("button", { name: /Reiniciar datos/ }).click();
await hub.getByRole("button", { name: "Sí, reiniciar" }).click();
await hub.getByRole("radio", { name: /Almuerzo/ }).click();
await hub.keyboard.press("Escape");

// Cliente: entra a la mesa con el PIN
const ana = await tab(390, 844);
let pin3;
await paso("cliente-entrada", async () => {
  await ana.goto(`${BASE}/mesa/3`);
  await shot(ana, "p-mesa-cerrada");
  pin3 = await abrirMesa(ctx, 3);
  await ana.reload();
  await ana.getByLabel("¿Cómo te llamamos?").fill("Ana");
  await ana.getByLabel("PIN de la mesa").fill(pin3);
  await shot(ana, "p-entrar", {
    boxes: {
      boton: ana.getByRole("button", { name: /Ver la carta/ }),
      pin: ana.getByLabel("PIN de la mesa"),
    },
  });
  await ana.getByRole("button", { name: /Ver la carta/ }).click();
  await ana.waitForURL("**/menu");
  await ana.getByRole("dialog").waitFor();
  await ana.getByRole("dialog").getByRole("button", { name: "Lácteos", exact: true }).click();
  await shot(ana, "p-alergias", {
    boxes: {
      lacteos: ana.getByRole("dialog").getByRole("button", { name: "Lácteos", exact: true }),
      guardar: ana.getByRole("dialog").getByRole("button", { name: /Guardar/ }),
    },
  });
  await ana
    .getByRole("dialog")
    .getByRole("button", { name: /Guardar/ })
    .click();
  await ana.getByRole("dialog").waitFor({ state: "detached" });
  await shot(ana, "p-carta");
  await shot(ana, "p-carta-larga", { full: true });
});

await paso("ficha-y-3d", async () => {
  await ana.goto(`${BASE}/mesa/3/plato/pollo-crispy`);
  await shot(ana, "p-ficha");
  await ana.goto(`${BASE}/mesa/3/plato/clasica-27`);
  await shot(ana, "p-ficha-lacteos", {
    boxes: {
      alerta: ana.getByRole("alert").filter({ hasText: "Tiene lácteos" }),
      boton3d: ana.getByRole("button", { name: "Ver en 3D" }).last(),
    },
  });
  await ana.getByRole("button", { name: "Ver en 3D" }).last().click();
  await ana.getByRole("dialog").waitFor();
  await shot(ana, "p-3d", {
    wait: 3500,
    boxes: {
      visor: ana.getByRole("dialog").locator("canvas"),
      listo: ana.getByRole("dialog").getByRole("button", { name: /^Listo/ }),
    },
  });
  await ana.keyboard.press("Escape");
});

// Segundo comensal y carrito compartido
const luis = await tab(390, 844);
await paso("carrito", async () => {
  await joinTable(luis, 3, "Luis", { pin: pin3 });
  await addDish(ana, 3, "pollo-crispy", { note: "Sin pepinillos" });
  await addDish(ana, 3, "limonada-de-coco");
  await addDish(luis, 3, "clasica-27", { variant: "Doble" });
  await addDish(luis, 3, "aros-de-cebolla");
  await ana.goto(`${BASE}/mesa/3/carrito`);
  await shot(ana, "p-carrito", {
    boxes: {
      enviar: ana.getByRole("button", { name: "Enviar pedido" }),
      envivo: ana.getByText("En vivo").first(),
    },
  });
  await luis.goto(`${BASE}/mesa/3/carrito`);
  await luis.getByRole("button", { name: "Enviar pedido" }).click();
  await shot(luis, "p-enviar", {
    boxes: {
      si: luis.getByRole("button", { name: /Sí, enviar/ }),
      dialogo: luis.getByRole("dialog"),
    },
  });
  await luis.getByRole("button", { name: /Sí, enviar/ }).click();
  await luis.waitForURL("**/pedido");
  await shot(luis, "p-pedido-enviado");
});

// Mesero
const carlos = await tab(1280, 800);
await paso("mesero", async () => {
  await carlos.goto(`${BASE}/mesero`);
  await entrarComo(carlos, "Carlos");
  await carlos.getByRole("article", { name: /Mesa 3 · Ronda 1/ }).waitFor();
  await shot(carlos, "w-mesero", {
    boxes: {
      ticket: carlos.getByRole("article", { name: /Mesa 3 · Ronda 1/ }),
      confirmar: carlos.getByRole("button", { name: /Confirmar y enviar a cocina/ }),
      mesa: carlos.getByRole("button", { name: /^Mesa 3:/ }),
    },
  });
  await carlos.getByRole("button", { name: /Confirmar y enviar a cocina/ }).click();
  await shot(carlos, "w-mesero-confirmado");
});
await paso("cliente-confirmado", async () => {
  await ana.goto(`${BASE}/mesa/3/pedido`);
  await shot(ana, "p-pedido-confirmado");
});

// Cocina
const cocina = await tab(1280, 800);
await paso("cocina", async () => {
  await cocina.goto(`${BASE}/cocina`);
  await entrarComo(cocina, "Cocina");
  await shot(cocina, "w-cocina", {
    boxes: {
      tarjeta: cocina.locator("article").first(),
      listo: cocina.getByRole("button", { name: "Listo", exact: true }).first(),
    },
  });
  await shot(cocina, "w-cocina-preparando", {
    boxes: {
      tarjeta: cocina.locator("article").first(),
      listo: cocina.getByRole("button", { name: "Listo", exact: true }),
    },
  });
  await ana.waitForTimeout(400);
  await shot(ana, "p-pedido-preparando");
  await cocina.getByRole("button", { name: "Listo", exact: true }).click();
  await shot(cocina, "w-cocina-listo", { boxes: { tarjeta: cocina.locator("article").first() } });
});
await paso("mesero-listo", async () => {
  await carlos.getByRole("button", { name: "Marcar entregado" }).waitFor();
  await shot(carlos, "w-mesero-listo", {
    boxes: { entregar: carlos.getByRole("button", { name: "Marcar entregado" }) },
  });
  await carlos.getByRole("button", { name: "Marcar entregado" }).click();
  await ana.waitForTimeout(400);
  await shot(ana, "p-pedido-entregado");
});
await paso("calificar", async () => {
  await ana.getByRole("link", { name: /Califica tu experiencia/ }).click();
  await ana.waitForURL("**/calificar");
  for (const [dish, stars] of [
    ["Pollo crispy", 5],
    ["Limonada de coco", 5],
  ]) {
    await ana
      .getByRole("radiogroup", { name: `Calificación de ${dish}` })
      .getByRole("radio", { name: new RegExp(`^${stars} estrellas`) })
      .click();
  }
  await shot(ana, "p-calificar", {
    boxes: {
      estrellas: ana.getByRole("radiogroup", { name: "Calificación de Pollo crispy" }),
      enviar: ana.getByRole("button", { name: /Enviar 2 calificaciones/ }),
    },
  });
});

// Más mesas para que el salón se vea con movimiento
await paso("mas-mesas", async () => {
  const sara = await tab(390, 844);
  await joinTable(sara, 2, "Sara");
  await addDish(sara, 2, "clasica-27");
  await sara.goto(`${BASE}/mesa/2/carrito`);
  await sara.getByRole("button", { name: "Enviar pedido" }).click();
  await sara.getByRole("button", { name: /Sí, enviar/ }).click();
  await sara.waitForURL("**/pedido");
  await sara.close();
  const tomas = await tab(390, 844);
  await joinTable(tomas, 6, "Tomás");
  await addDish(tomas, 6, "pollo-crispy");
  await tomas.goto(`${BASE}/mesa/6/carrito`);
  await tomas.getByRole("button", { name: "Enviar pedido" }).click();
  await tomas.getByRole("button", { name: /Sí, enviar/ }).click();
  await tomas.waitForURL("**/pedido");
  await tomas.close();
  await carlos.goto(`${BASE}/mesero`);
  await shot(carlos, "w-mesero-salon");
  await carlos
    .getByRole("button", { name: /Confirmar y enviar a cocina/ })
    .first()
    .click();
  await cocina.goto(`${BASE}/cocina`);
  await shot(cocina, "w-cocina-varias");
});

// Caja
const caja = await tab(1440, 900);
await paso("caja", async () => {
  await caja.goto(`${BASE}/caja`);
  await entrarComo(caja, "Julián");
  await shot(caja, "w-caja-salon");
  await caja.getByRole("radio", { name: "Caja", exact: true }).click();
  await caja.getByRole("button", { name: "Abrir caja" }).click();
  await shot(caja, "w-caja-abierta", {
    boxes: {
      cobrar: caja.getByRole("button", { name: /Cobrar/ }).nth(1),
      resumen: caja.getByText("Cobrado en el turno"),
    },
  });
  await caja.waitForTimeout(3500);
  await caja
    .getByRole("button", { name: /Cobrar/ })
    .nth(1)
    .click();
  await shot(caja, "w-caja-cobro", {
    boxes: {
      dialogo: caja.getByRole("dialog"),
      registrar: caja.getByRole("button", { name: "Registrar pago" }),
    },
  });
  await caja.getByRole("button", { name: "Registrar pago" }).click();
  await caja.getByRole("button", { name: "Cerrar caja" }).click();
  await shot(caja, "w-caja-cierre", { boxes: { dialogo: caja.getByRole("dialog") } });
  await caja.keyboard.press("Escape");
});

// Domicilios (abiertos todo el día para la captura)
const admin = await tab(1440, 900);
await paso("horario", async () => {
  await admin.goto(`${BASE}/admin/configuracion`);
  await entrarComo(admin, "Marta");
  await admin.getByLabel("Abre", { exact: true }).fill("00:00");
  await admin.getByLabel("Cierra", { exact: true }).fill("00:00");
  await admin.locator("#domicilios").getByRole("button", { name: "Guardar cambios" }).click();
});
const casa = await tab(390, 844);
await paso("domicilios", async () => {
  await casa.goto(`${BASE}/domicilio`);
  await shot(casa, "p-domicilio");
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
  await shot(casa, "p-domicilio-datos");
  await casa.getByRole("button", { name: /Hacer el pedido/ }).click();
  await casa.waitForURL("**/domicilio/seguimiento/**");
  await shot(casa, "p-domicilio-recibido", {
    boxes: { whatsapp: casa.getByRole("link", { name: /Avisar por WhatsApp/ }) },
  });
  await caja.getByRole("radio", { name: /Domicilios/ }).click();
  await shot(caja, "w-caja-domicilios", {
    boxes: {
      pedido: caja.getByText(/Camila Ríos/).first(),
      confirmar: caja.getByRole("button", { name: "Confirmar" }),
    },
  });
  await caja.getByRole("button", { name: "Confirmar" }).click();
  const dom = cocina.locator('article[aria-label^="Domicilio D-"]');
  await shot(cocina, "w-cocina-domicilio");
  await dom.getByRole("button", { name: "Listo", exact: true }).click();
  await caja.getByRole("button", { name: "Agregar domiciliario" }).click();
  await caja.getByLabel("Nombre del nuevo domiciliario").fill("Mateo");
  await caja.getByLabel("Celular del nuevo domiciliario").fill("300 777 8899");
  await caja.getByRole("button", { name: "Guardar", exact: true }).click();
  await caja.getByLabel(/Domiciliario para/).selectOption("Mateo");
  await caja.getByRole("button", { name: "Despachar", exact: true }).click();
  await shot(caja, "w-caja-despachado");
  await casa.waitForTimeout(400);
  await shot(casa, "p-domicilio-camino", {
    boxes: { domiciliario: casa.getByText("Tu domiciliario: Mateo") },
  });
});

// Reseñas de Google (el cliente al recibir)
await paso("admin-config", async () => {
  await admin.goto(`${BASE}/admin/configuracion`);
  await admin
    .getByLabel("Enlace o identificador de tu negocio en Google")
    .fill("https://g.page/r/CabcDEF123456/review");
  await admin.getByRole("button", { name: "Guardar enlace" }).click();
  await caja.getByRole("button", { name: /^Entregado/ }).click();
  await casa.waitForTimeout(500);
  await shot(casa, "p-resena-google", {
    boxes: { resena: casa.getByRole("link", { name: /Dejar mi reseña/ }) },
  });
});

// Reservas
const res = await tab(390, 844);
await paso("reservas", async () => {
  const manana = new Date(Date.now() + 86_400_000);
  const dia = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-${String(manana.getDate()).padStart(2, "0")}`;
  await res.goto(`${BASE}/reservas`);
  await res.getByLabel("Día").fill(dia);
  await res.getByLabel("Hora").selectOption({ index: 3 });
  await res.getByLabel("Tu nombre").fill("Ana Gómez");
  await res.getByLabel("Celular (WhatsApp)").fill("300 555 1234");
  await shot(res, "p-reserva", {
    boxes: { reservar: res.getByRole("button", { name: "Reservar" }) },
  });
  await res.getByRole("button", { name: "Reservar" }).click();
  await shot(res, "p-reserva-enviada");
  await caja.getByRole("radio", { name: /Reservas/ }).click();
  await shot(caja, "w-caja-reservas", {
    boxes: { confirmar: caja.getByRole("button", { name: "Confirmar", exact: true }) },
  });
});

// Panel del administrador
await paso("admin", async () => {
  for (const [ruta, nombre] of [
    ["/admin", "w-admin"],
    ["/admin/ventas", "w-admin-ventas"],
    ["/admin/calificaciones", "w-admin-calificaciones"],
    ["/admin/reportes", "w-admin-reportes"],
    ["/admin/equipo", "w-admin-equipo"],
    ["/admin/platos", "w-admin-platos"],
  ]) {
    await admin.goto(`${BASE}${ruta}`);
    await shot(admin, nombre, { wait: 1200, boxes: { main: admin.locator("main") } });
  }
  await admin.goto(`${BASE}/admin/configuracion`);
  await shot(admin, "w-admin-estilos");
});

// Estilos de la carta, vistos por el cliente
const estilos = [
  "Bistró oscuro",
  "Café minimal",
  "Neón nocturno",
  "Mediterráneo",
  "Gourmet editorial",
  "Urbano colorido",
  "Clásico",
];
for (const estilo of estilos) {
  await paso(`estilo ${estilo}`, async () => {
    await admin.goto(`${BASE}/admin/configuracion`);
    await admin
      .getByRole("radiogroup", { name: "Estilos de la carta" })
      .getByRole("radio", { name: new RegExp(`^${estilo}`) })
      .click();
    await admin.getByRole("button", { name: `Usar ${estilo}` }).click();
    await casa.goto(`${BASE}/domicilio`);
    await shot(
      casa,
      `p-estilo-${estilo
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z]+/g, "-")}`,
      { wait: 1200 },
    );
  });
}

// Carta en inglés
await paso("ingles", async () => {
  const tur = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: "en-US",
  });
  const t = await tur.newPage();
  await t.goto(`${BASE}/domicilio`);
  await t.addStyleTag({ content: `[aria-label="Abrir panel de demo"]{display:none!important}` });
  await visible(t.getByRole("heading", { name: "Order delivery or pickup" }));
  await shot(t, "p-ingles");
  await tur.close();
});

await browser.close();
await writeFile(`${OUT}../cajas.json`, JSON.stringify(cajas, null, 1));
console.log(fallos.length ? `Fallaron: ${fallos.join(", ")}` : "Todas las capturas listas");
