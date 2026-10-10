# Guion del video de presentación — Platterio

**Duración:** ~85 s · **Formato:** 16:9 (versión vertical 9:16 recortada para redes) · **Tono:** cercano,
colombiano neutro, seguro, sin tecnicismos. Tuteo. **Voz:** una sola, cálida y a ritmo tranquilo
(~150 palabras por minuto; el texto de voz suma ~190 palabras). **Música:** instrumental suave que sube
un poco en el cierre. **Subtítulos:** siempre, en español (mucha gente lo ve sin sonido).

**Idea central:** «Tu restaurante, sin filas para pedir y sin pedidos perdidos.»
**Una sola promesa por escena.** Nada de precios en el video (cambian); los precios van en la
descripción y en la página. Lo único que se dice es «pruébalo 7 días gratis».

## Escenas

| # | Tiempo | Qué se ve | Voz en off | Texto en pantalla | Transición |
|---|---|---|---|---|---|
| 1 | 0–8 s | Salón lleno, mesero con la libreta, cliente levantando la mano sin que lo vean. Animación de pedidos de papel que se apilan y uno cae al piso. | «Hora pico. Tú lo sabes: mesero corriendo, comandas que se pierden y clientes esperando para pedir.» | «¿Te suena?» | Corte seco al negro, luego zoom al QR. |
| 2 | 8–20 s | Celular escaneando el QR de la mesa; la carta se abre con fotos, precios y filtros de alérgenos. Un plato gira en 3D. | «Con Platterio, tu cliente escanea el QR de la mesa y ve tu carta con fotos, precios y alérgenos. Sin instalar nada, en español o en inglés.» | «Escanea. Mira. Pide.» | El plato 3D «sale» de la pantalla y se vuelve el pedido. |
| 3 | 20–32 s | El pedido viaja con una línea animada a la pantalla del mesero, que lo confirma con un toque. Aparece el aviso «Mesa 5». | «El pedido le llega directo al mesero, que lo confirma con un toque. Y si se demora, el sistema te avisa antes de que el cliente se queje.» | «Cero comandas perdidas» | Deslizamiento lateral (la línea continúa hacia la cocina). |
| 4 | 32–44 s | Pantalla de cocina con tarjetas por estado; una pasa de «Preparando» a «Listo» y suena el aviso. | «La cocina ve cada pedido en orden y marca cuándo está listo. Todos saben qué pasa, sin gritar al otro lado del salón.» | «Cocina en orden» | Zoom a la caja. |
| 5 | 44–54 s | Caja cerrando una mesa: cobro dividido, formas de pago, cierre del día. | «En caja cobras por mesa, divides la cuenta y cierras el día con todo cuadrado: efectivo, tarjeta y transferencias.» | «Cierre sin sorpresas» | Los números se convierten en barras de un reporte. |
| 6 | 54–64 s | Panel del administrador: ventas del día, platos más pedidos, calificaciones. Cambio rápido de la carta con la paleta y el logo del negocio. | «Y tú, desde tu panel: ventas, platos más pedidos y calificaciones. Con tu logo, tus colores y la plantilla que más te guste.» | «Tu marca, tu carta» | Mosaico: domicilio, reservas, reseñas aparecen como tarjetas. |
| 7 | 64–74 s | Tarjetas animadas: domicilios con WhatsApp, reservas y eventos, reseñas en Google. | «También recibes domicilios con aviso por WhatsApp, reservas y eventos, y puedes invitar a tus clientes a dejarte una reseña en Google.» | «Domicilios · Reservas · Reseñas» | Las tarjetas se juntan en el logo de Platterio. |
| 8 | 74–85 s | Logo de Platterio, un restaurante real de ejemplo detrás. Botón «Pruébalo 7 días gratis» y la dirección de la página. | «Sin cobro por pedido ni contratos. Pruébalo siete días gratis con todo incluido y míralo funcionando en tu propio restaurante.» | «Pruébalo 7 días gratis · [dirección de la página]» | Fundido a negro con el logo. |

## Texto completo de la voz (para grabar o sintetizar)
Hora pico. Tú lo sabes: mesero corriendo, comandas que se pierden y clientes esperando para pedir.
Con Platterio, tu cliente escanea el QR de la mesa y ve tu carta con fotos, precios y alérgenos. Sin
instalar nada, en español o en inglés. El pedido le llega directo al mesero, que lo confirma con un
toque. Y si se demora, el sistema te avisa antes de que el cliente se queje. La cocina ve cada pedido
en orden y marca cuándo está listo. En caja cobras por mesa, divides la cuenta y cierras el día con
todo cuadrado. Y tú, desde tu panel: ventas, platos más pedidos y calificaciones, con tu logo, tus
colores y la plantilla que más te guste. También recibes domicilios con aviso por WhatsApp, reservas
y eventos, y puedes invitar a tus clientes a dejarte una reseña en Google. Sin cobro por pedido ni
contratos. Pruébalo siete días gratis y míralo funcionando en tu propio restaurante.

## Estilo visual y de movimiento
- Usar las pantallas reales de la demo (no maquetas) con un marco de celular/tablet limpio.
- Paleta de Platterio; fondo claro, acentos del color de marca. Los textos en pantalla, grandes y
  cortos (máx. 5 palabras).
- Animaciones: entradas suaves (200–400 ms), una sola idea por escena, líneas que «conectan» los roles
  (cliente → mesero → cocina → caja → panel) para dar continuidad.
- Evitar parpadeos y movimientos bruscos; respetar accesibilidad (contraste, subtítulos).

## Antes de producirlo (decisiones por tomar)
1. **Voz:** grabada por una persona (más cálida, mejor para confiar) o sintetizada (más rápida y
   barata de rehacer cuando cambie el producto).
2. **Restaurante de ejemplo:** usar la demo actual o grabar un negocio real piloto (con permiso) para
   dar prueba social. Mejor lo segundo cuando haya un piloto.
3. **Cómo se produce:** animación en código (escenas HTML/Remotion con las pantallas reales)
   renderizada a video. Permite rehacerlo barato cuando cambien pantallas. Las capturas deben tomarse
   de la demo, sin datos personales.
4. **Versiones:** una de ~85 s para la página y una de 30 s vertical para redes (escenas 1, 2, 3 y 8).
5. **Revisión legal:** no prometer cifras («vende más», «ahorra X %») sin respaldo; solo lo que el
   sistema hace.
6. **Dirección y llamada a la acción:** definir el dominio final antes de renderizar.
