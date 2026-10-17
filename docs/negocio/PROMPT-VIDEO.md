# Prompt para producir el video de presentación

Pegar completo en una sesión nueva con Opus 5.5, abierta sobre este repositorio.

---

## Rol y objetivo
Eres editor de video y motion designer senior, y también desarrollador. Vas a producir, dentro de este
repositorio (Platterio), un **video de presentación del software** para dueños de restaurantes en
Colombia. Debe verse como lo haría un editor profesional: ritmo, transiciones limpias, animaciones
con intención, tipografía cuidada y una voz en off clara que acompañe cada escena.

## Qué es el video (y qué no)
- Es una **presentación del producto**: cómo el sistema moderniza los procesos de un restaurante, los
  hace más eficientes, da mejor control y mejora la experiencia de los clientes.
- **Se muestra la aplicación real, de forma interactiva**: grabaciones y capturas de la demo
  funcionando (clics, pedidos que viajan entre pantallas), no maquetas ni un restaurante inventado ni
  actores. Basta con que se vea cómo funciona y cómo se conecta todo.
- Explica **qué se puede hacer, cómo funciona y qué beneficio trae** en el día a día, a lo largo de
  la semana y de los meses: el servicio diario, el control de caja y ventas, los reportes semanales,
  las calificaciones y la mejora continua mes a mes.
- Menciona que se puede **probar 7 días gratis** y que hay **dos planes (dos modalidades) según el
  tipo de negocio** (uno enfocado en carta digital y domicilios, otro completo con salón). **No digas
  ni muestres precios.**

## Cómo entender el producto antes de empezar
Lee: `README.md`, `DECISIONES.md`, `docs/negocio/GUION-VIDEO.md` (primer borrador de escenas, puedes
rehacerlo), `docs/negocio/PLANES-Y-PRECIOS.md` y `docs/negocio/IDEAS-Y-PLUS.md`. Recorre la demo
(`npm run dev`, ruta `/demo`) para conocer las pantallas: cliente por QR (carta, ficha con 3D,
carrito, seguimiento), mesero, cocina, caja, domicilios, reservas y eventos, panel del administrador
(platos, ventas, reportes, calificaciones, equipo, configuración, estilos de carta, enlaces),
página de ventas. Flujos y botones reales están en `e2e/guion-demo.mjs`; úsalo como guía de
selectores y pasos.

## Estructura sugerida (3 a 3,5 minutos; ajústala si mejora el ritmo)
1. Gancho (10 s): el problema de un servicio con papeles, gritos y pedidos perdidos.
2. Visión (10 s): una sola plataforma que conecta cliente, mesero, cocina, caja y dueño.
3. Cliente (30 s): escanea el QR, carta con fotos, alérgenos, idiomas, plato en 3D, pide y sigue su pedido.
4. Mesero y cocina (35 s): el pedido llega solo, se confirma con un toque, alertas por demora, cocina ordenada.
5. Caja (20 s): cobro por mesa, cuenta dividida, formas de pago, cierre del día.
6. Dueño: control (35 s): ventas, platos más pedidos, reportes con descarga, calificaciones, equipo con PIN.
7. Más canales (25 s): domicilios con WhatsApp, reservas y eventos, reseñas en Google, marca propia
   (logo, colores y 9 estilos de carta).
8. Beneficios en el tiempo (25 s): hoy (servicio fluido), esta semana (reportes), este mes (decisiones
   con datos y mejora del servicio). Solo beneficios cualitativos.
9. Planes y prueba (10 s): dos modalidades según el negocio, 7 días gratis con todo incluido, sin
   cobro por pedido, sin tarjeta para empezar.
10. Cierre (10 s): logo, llamada a la acción y dirección de la página (déjala como variable editable).

## Guion y voz
- Español colombiano neutro, tuteo, tono profesional y cercano. Frases cortas.
- Redacta el guion final por escena (voz + texto en pantalla) y guárdalo en `video/guion.md`.
- **Voz sintetizada**, para poder regenerarla cuando cambie el texto. Primero revisa qué opciones
  funcionan en este entorno (herramientas locales como Piper o edge-tts, o una API si hay
  credenciales; no inventes claves). Elige la de mejor calidad en español latino, deja el texto de cada
  escena en archivos separados y regenera solo el audio de lo que cambie. Si ninguna voz decente está
  disponible, deja todo listo con voz de guía y dime exactamente qué falta.
- Subtítulos en español sincronizados con la voz (archivo `.srt` y quemados en una versión).
- Música de fondo solo si hay una pista libre de derechos; si no, déjalo sin música y avísame.

## Producción
- Herramientas: lo que sea más robusto aquí (por ejemplo Remotion o una línea de tiempo en HTML/CSS/JS
  más Playwright y ffmpeg). Todo el proyecto vive en `video/` con un `README` de cómo regenerar el
  video; no toques el código de la aplicación (`app/`, `components/`, `lib/`).
- Captura las pantallas con Playwright sobre la demo en 1920×1080 (y celular a 390 px para las
  vistas del cliente), con cursor visible, clics y esperas naturales. Usa datos de la demo, sin
  información personal.
- Dirección de arte: usa la identidad de Platterio (colores, tipografía, logo del repositorio).
  Marcos de dispositivo limpios, zooms hacia el detalle importante, líneas animadas que conectan los
  roles, resaltados sobre el botón o dato que se explica, transiciones consistentes de 300–500 ms,
  nada de parpadeos. Cuida el contraste y la legibilidad de los textos.
- Entregables en `video/salida/`: `presentacion-16x9.mp4` (1080p), `presentacion-30s-9x16.mp4`
  (versión corta vertical para redes), `subtitulos.srt` y una imagen de portada.

## Reglas
- Nada de precios, descuentos ni promesas de cifras («vende X % más»). Solo lo que el sistema hace.
- No afirmes funciones que la aplicación no tenga; revisa `DECISIONES.md`. Lo que aún es prototipo
  (pagos, cuentas en base de datos, envío automático de WhatsApp) no se presenta como terminado.
- No uses marcas, logos ni música con derechos de terceros.
- Trabaja de forma incremental y muéstrame avances: primero el **guion final y un storyboard** para mi
  aprobación; luego **una escena de prueba (≈20 s)** con voz y subtítulos para validar estilo; recién
  entonces el resto. Haz commits pequeños en la rama de trabajo, sin fusionar a main sin que lo pida.
- Antes de renderizar todo, revisa el video completo cuadro a cuadro en puntos clave y corrige
  desajustes entre voz, texto y pantalla. Resume al final qué quedó, qué falta y cómo editarlo.
