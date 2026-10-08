# Platterio · mockup navegable

Menú interactivo para restaurantes de comida rápida, demostrado con el restaurante ficticio
**Fogón 27**. El cliente escanea el QR de la mesa, explora la carta, pide solo o en grupo; el
mesero confirma, la cocina prepara, el cliente sigue el estado y califica, y el administrador lo
ve todo en su panel.

Es un prototipo **sin backend**: los datos viven en el navegador (Zustand + `localStorage`) y se
sincronizan al instante entre pestañas con `BroadcastChannel`. El brief completo está en
[`BRIEF.md`](./BRIEF.md) y cada decisión tomada frente a una ambigüedad, en
[`DECISIONES.md`](./DECISIONES.md).

## Arrancar

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Comando                                                 | Qué hace                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                                           | Servidor de desarrollo                                                |
| `npm run build` / `npm start`                           | Compilación y servidor de producción                                  |
| `npm test`                                              | Pruebas unitarias de la lógica de dominio (Vitest)                    |
| `npm run lint` · `npm run typecheck` · `npm run format` | ESLint, TypeScript estricto y Prettier                                |
| `npm run e2e`                                           | Recorre el guion de demo completo (necesita la app corriendo)         |
| `npm run e2e:a11y`                                      | Escaneo de accesibilidad WCAG 2.1 AA con axe-core de todas las vistas |

Los scripts de e2e usan Playwright con Chromium. Por defecto apuntan a `http://localhost:3000`;
usa `E2E_URL` para otra dirección y `HEADED=1` para ver el navegador:

```bash
npm run build && npm start &          # en otra terminal
npx playwright install chromium       # solo la primera vez
npm run e2e
```

## Usuarios de la demo

Las pantallas del personal piden PIN. En la pantalla de entrada, "Usuarios de la demo" permite
entrar sin escribirlo (solo existe en la demo).

| Usuario | Rol           | PIN    |
| ------- | ------------- | ------ |
| Marta   | Administrador | 246810 |
| Julián  | Encargado     | 135790 |
| Carlos  | Mesero        | 1111   |
| Daniela | Mesero        | 2222   |
| Cocina  | Cocina        | 3333   |

La sesión es por pestaña, así que cada pestaña puede ser una persona distinta.

## Guion de demo (5 minutos)

Todo se hace en **pestañas del mismo navegador**: cada pestaña cuenta como un celular o
dispositivo distinto. Ábrelas desde el hub (`/`) para que cada una tenga su propia identidad.

1. **Hub → Panel de demo** (o `/?demo=1`): toca _Reiniciar datos_ si vienes de un ensayo y pon
   la hora en **Almuerzo**.
2. **Pestaña A – Mesa 3 como "Ana"**: al escanear, la mesa aún está cerrada ("Pide al mesero que
   abra tu mesa"). En otra pestaña, **Carlos** toca la Mesa 3 → _Abrir mesa_ y obtiene el PIN
   (o muestra su QR). Ana entra con su nombre y ese PIN. En la hoja de alergias marca **Lácteos**. Los
   recomendados cambian (sale la Clásica 27) y la ficha de la Clásica 27 muestra el aviso de
   lácteos, aunque se puede pedir igual.
3. **Pestaña B – Mesa 3 como "Luis"**: cada uno agrega platos y ambos ven el mismo carrito en
   vivo, con avisos cuando el otro agrega algo. Luis toca _Enviar pedido_ y confirma
   "Ana 2 · Luis 2 · ¿Enviar a la cocina?".
4. **Pestaña C – Mesero Carlos** (hub → chip _Carlos_): llega el ticket con contador. _Ajustar_ →
   quitar un ítem por **Agotado**: el cliente ve el aviso con el motivo. _Confirmar y enviar a
   cocina_.
   - Para mostrar la alerta: activa **Acelerar el tiempo ×10** en el panel de demo antes de
     confirmar. A los ~18 s la tarjeta se pone en alerta y a los ~36 s se avisa al administrador.
5. **Pestaña D – Cocina** (entra como _Cocina_ en "Usuarios de la demo"): _Empezar a preparar_ y luego _Marcar listo_. El cliente ve avanzar
   la línea de tiempo y el mesero recibe el aviso. En el mesero: _Marcar entregado_.
6. **Pestaña A**: _Califica tu experiencia_ → estrellas a los platos → **2 estrellas** al
   servicio.
7. **Pestaña E – Administrador** (entra como _Marta_): aparece la alerta de servicio bajo de la Mesa 3. Recorre el
   Resumen, _Ventas_ (más pedidos por franja) y _Calificaciones_ (reseñas). En _Platos → Nuevo
   plato_, crea uno con foto, franja Almuerzo y **Destacado por la casa**: en el cliente sale de
   primero en los recomendados como "Nuevo en la casa".
8. **Cierre**: en la ficha de la Clásica 27 (también Brasa BBQ, La Diabla y el Calentado) toca
   **Ver en 3D**: gira el plato, sepáralo, quita la cebolla o pide queso extra. El precio se
   actualiza, **Agregar** lo manda al carrito con "Sin cebolla · Extra queso", y el mesero y la
   cocina lo ven en su comanda.

9. **Pedido del mesero**: con Carlos o Daniela en una mesa (libre o abierta), _Tomar pedido_ →
   elige platos y _Enviar a cocina_ (llega directo, sin confirmar). Luego _Editar_ la ronda →
   _Ajustar_ un plato con motivo: cocina ve el aviso **Cambios del mesero** y toca _Visto_; el
   registro de cambios queda en la hoja de la ronda.

10. **Marca**: como Marta, en _Configuración → Identidad de marca_ elige la plantilla
    **Moderno** (cambian colores, letra y acento al instante en todas las pestañas), sube un
    logo y cambia las tipografías. _Cálido_ vuelve a la marca de la casa.

11. **Caja y reportes**: como Julián, en `/caja` → _Caja_ abre el turno con el fondo, cobra una
    mesa (también desde su ficha, botón _Cobrar_) y cierra contando el efectivo: si no cuadra,
    pide la nota. Como Marta, `/admin/reportes` muestra lo cobrado por forma de pago, ventas por
    mesero, cambios del personal, mesas sin cobro y cierres; cada tabla se descarga en CSV.

12. **Domicilios**: abre `/domicilio` en el celular (pestaña nueva), arma un pedido, elige zona
    y envía. Como Julián, en `/caja` → _Domicilios_ confirma el pedido; la cocina lo prepara,
    caja lo _Despacha_ con un domiciliario y lo marca _Entregado_ mientras el cliente ve cada
    paso en su seguimiento. _Cobrar_ lo registra. Zonas, tarifas y horario: Marta, en
    _Configuración → Domicilios y recogida_.

13. **Idioma y moneda**: abre `/domicilio` con el celular en inglés (o usa el selector _Español /
    English_ de arriba): la carta, los platos y los mensajes salen en inglés. Como Marta, en
    _Configuración → Idioma y moneda_ cambia la moneda (ver el símbolo) o apaga el inglés; en la
    ficha de un plato puedes escribir su nombre y descripción en inglés. No hay propina ni
    impuestos a propósito (ver DECISIONES 118).

Atajos útiles: _Simular otro comensal_ (panel de demo) mete a alguien más a una mesa y le hace
agregar un plato; en _Configuración_ se descarga el QR imprimible de cada mesa.

## Rutas

| Ruta                                  | Vista                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/`                                   | Hub de demo: entrar como cliente (mesas), mesero, cocina o administrador                   |
| `/?demo=1`                            | Abre el panel de demo (hora simulada, tiempo ×10, simular comensal, reiniciar)             |
| `/muestra`                            | Muestra de componentes con el estilo final                                                 |
| `/domicilio`                          | Cliente: pide a domicilio o para recoger y sigue su pedido (`/domicilio/seguimiento/[id]`) |
| `/mesa/[numero]`                      | Entrada del cliente (QR fijo): pide al mesero que abra la mesa; con el PIN, entra          |
| `/mesa/[numero]/menu`                 | Recomendados por franja, categorías, buscador y filtros                                    |
| `/mesa/[numero]/plato/[id]`           | Ficha del plato                                                                            |
| `/mesa/[numero]/carrito`              | Carrito compartido de la mesa y envío                                                      |
| `/mesa/[numero]/pedido`               | Ticket de la mesa y línea de tiempo del pedido                                             |
| `/mesa/[numero]/calificar`            | Calificar platos y servicio                                                                |
| `/entrar`                             | Entrada del personal con PIN (lleva a la pantalla de su rol)                               |
| `/mesero`                             | Mesero: sus mesas y pedidos (pide PIN)                                                     |
| `/caja`                               | Encargado de caja: todo el salón, mesas y meseros, equipo (pide PIN)                       |
| `/cocina`                             | Tablero de cocina en modo oscuro (pide PIN)                                                |
| `/admin`                              | Resumen del administrador (pide PIN)                                                       |
| `/admin/equipo`                       | Usuarios del negocio: roles, PIN, activar y desactivar                                     |
| `/admin/platos`, `/admin/platos/[id]` | Catálogo; `nuevo` como id crea un plato                                                    |
| `/admin/recomendaciones`              | Destacados, franjas y vista previa                                                         |
| `/admin/calificaciones`               | Calificaciones y reseñas                                                                   |
| `/admin/ventas`                       | Ventas y preferencias                                                                      |
| `/admin/reportes`                     | Reportes completos: cobros, meseros, cambios, mesas sin cobro, cierres de caja (CSV)       |
| `/admin/configuracion`                | Color, umbrales, mesas con QR y meseros                                                    |

## Desplegar en Vercel

No necesita variables de entorno ni base de datos.

1. Sube el repositorio a GitHub.
2. En Vercel: _Add New → Project_, elige el repositorio y deja la configuración que detecta para
   Next.js (`npm run build`).
3. _Deploy_. Los QR de _Configuración_ apuntan al dominio desde donde se abra el panel.

Cada navegador tiene sus propios datos: la demo se hace con varias pestañas del mismo
navegador, no entre dispositivos distintos (para eso se reemplaza la capa de datos por Supabase;
ver abajo).

## Fotos de los platos

Pon las fotos en `public/platos/` con el id del plato como nombre (por ejemplo
`clasica-27.jpg`); la lista está en [`public/platos/LEEME.md`](./public/platos/LEEME.md).
Mientras no existan, se muestra un degradado cálido con la inicial del plato. Los platos creados
desde el panel guardan sus fotos subidas en el navegador.

## Estructura

```
app/                  Rutas (App Router)
components/ui/        Componentes base con los tokens de diseño
components/client/    Vista del cliente (entrada, menú, ficha, carrito, pedido, calificar)
components/waiter/    Vista del mesero
components/kitchen/   Tablero de cocina
components/admin/     Panel del administrador
components/demo/      Panel de demo
lib/domain/           Lógica de negocio pura y con pruebas (recomendador, estados del pedido,
                      ticket, franjas, analítica, validaciones…)
lib/data/             Capa de datos: catálogo, historial sembrado, store, sincronización,
                      hooks de lectura y acciones de escritura
e2e/                  Guion de demo y auditoría de accesibilidad (Playwright + axe-core)
```

**Para conectar un backend real**, las pantallas solo usan los hooks y las acciones de
`lib/data`: se reemplaza esa capa (por ejemplo por Supabase con suscripciones en tiempo real) sin
tocar las pantallas ni `lib/domain`. El visor 3D se conecta en
`components/dish/viewer-3d-slot.tsx`.

## Calidad

- TypeScript estricto sin `any`, ESLint y Prettier.
- 150+ pruebas unitarias del dominio: recomendador, máquina de estados, ticket, franjas,
  carrito, calificaciones, analítica y validaciones.
- Guion de demo automatizado (`npm run e2e`) y 0 problemas WCAG 2.1 AA en axe-core
  (`npm run e2e:a11y`) en las 18 vistas.
- Revisado de 360 px (cliente) a escritorio (panel).

## Laboratorio 3D (en desarrollo)

`/laboratorio/3d` es un prototipo interno, sin enlaces desde la app. Muestra platos en 3D con
Three.js (React Three Fiber): despiece por ingredientes y personalización (quitar, extra,
reemplazar, adicionales, acompañante), con precio, alérgenos y comanda recalculados. Usa luz de
estudio HDRI, materiales físicos y texturas procedurales. Dibuja solo cuando algo cambia, y trae
calidad automática y un medidor de rendimiento. La propuesta completa está en
[`docs/3d/PROPUESTA.md`](./docs/3d/PROPUESTA.md).

## Estado por fases

- [x] Fase 0 — Base
- [x] Fase 1 — Menú del cliente
- [x] Fase 2 — Pedido
- [x] Fase 3 — Mesero
- [x] Fase 4 — Cocina y estados
- [x] Fase 5 — Calificaciones
- [x] Fase 6 — Administrador
- [x] Fase 7 — Pulido
