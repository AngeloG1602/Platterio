# Decisiones del mockup

Aquí se anotan las ambigüedades del brief y la decisión que se tomó para cada una. Todas se
pueden cambiar sin rehacer pantallas.

## Fase 0 — Base

1. **Fotos de los platos.** La red del entorno de desarrollo no permite descargar de Unsplash ni
   de Pexels. Cada plato ya apunta a `/public/platos/<id>.jpg`. Mientras no exista el archivo, la
   interfaz muestra el respaldo con degradado e inicial que pide §4. Para no hacer peticiones que
   van a fallar, `scripts/photo-manifest.mjs` lista las fotos disponibles y se ejecuta antes de
   `dev` y de `build`. Los nombres esperados están en `public/platos/LEEME.md`.
2. **Precios que faltan en la tabla (§11).** Salchipapa 27 "Para compartir": **$34.900**.
   Los platos sin variantes llevan una única variante, "Única" (en los Nuggets se llama "x10").
   Los tres sabores del jugo cuestan lo mismo.
3. **Ingredientes y alérgenos.** Los alérgenos de cada plato se derivan de sus ingredientes (§8).
   Por eso algunos ingredientes llevan varios; por ejemplo, el pan brioche lleva gluten, huevo y
   lácteos. Hay una prueba que verifica que el resultado coincida exactamente con la tabla de §11.
4. **Precio congelado en el pedido.** `OrderItem` guarda `unitPrice` al enviar la ronda. Así las
   ventas (regla 12) no cambian si luego se edita el precio del plato.
5. **Extensiones del modelo (§8).** `Order.preparingAt` para la línea de tiempo, y `Alert.stars` /
   `Alert.orderId` para mostrar la alerta sin cruzar tablas. `Diner.joinedAt` sirve para ordenar
   a los comensales.
6. **Historial de 14 días fuera del almacenamiento.** El historial sembrado se regenera de forma
   determinista a partir de `seedEpoch` (el momento de la siembra o del reinicio) y no se guarda
   en `localStorage`. Así el estado que se persiste y se transmite entre pestañas es pequeño (solo
   el catálogo y lo creado durante la demo). El historial siempre usa el catálogo original.
7. **Sincronización.** Cada cambio del store se envía completo por `BroadcastChannel`, y la
   pestaña que lo recibe lo aplica sin reenviarlo. Si dos pestañas cambian algo en el mismo
   instante, gana el último cambio; a ritmo humano no se nota. Cada pestaña además anuncia su
   presencia cada 2 s para mostrar cuántas hay conectadas.
8. **"Dispositivo" = pestaña.** El guion de §16 usa dos pestañas del mismo navegador como si
   fueran dos celulares (Ana y Luis). Por eso la identidad del dispositivo, las restricciones del
   cliente y el mesero elegido se guardan en `sessionStorage`: sobreviven a recargar, pero cada
   pestaña es un comensal distinto. Ojo: la opción "Duplicar pestaña" del navegador copia el
   `sessionStorage`; para la demo, abre las pestañas nuevas desde el hub.
9. **Reloj de la demo.** Todas las horas salen de un reloj virtual anclado, así que acelerar ×10
   no produce saltos. Al volver a ×1 se conserva la hora virtual (puede quedar adelantada). El
   botón "Reiniciar datos" lo vuelve a poner en hora.
10. **Hora simulada.** Elegir una franja en el panel fija la franja para las recomendaciones (en
    el punto medio de su horario), pero no mueve el reloj de los pedidos.
11. **Fuera de horario.** Si no hay ninguna franja activa (por ejemplo a las 2:00 a. m.), se
    recomienda con la próxima franja en abrir y la interfaz lo indica ("Fuera de horario · sigue
    desayuno").
12. **Umbral de servicio.** "Por debajo del umbral" significa estrictamente menor: con umbral 3,
    las calificaciones de 1 y 2 estrellas generan alerta.
13. **Contraste del acento.** `#E4572E` con texto blanco no llega a AA (3,7:1). Se usa tal cual
    en elementos decorativos. Para botones y texto se calcula `--accent-strong`, el mismo tono
    oscurecido hasta cumplir 4,5:1, y funciona con cualquier acento que configure el restaurante.
    `--muted` pasó de `#78716C` a `#716A64` por la misma razón (4,47:1 → 5:1 sobre el fondo).
14. **Componentes base.** En lugar de generar shadcn/ui y restilizarlo, se escribieron componentes
    propios sobre Radix (diálogo y hoja inferior) y sonner (toasts), directamente con los tokens.
    El resultado es el mismo que pide §3 (accesible y sin aspecto por defecto), con menos código.
15. **Tipografías autoalojadas.** Fraunces e Inter vienen de `@fontsource-variable`, no de Google
    Fonts en tiempo de compilación, para que `next build` no dependa de la red.

## Fase 1 — Menú del cliente

16. **Normalización de la calificación en el recomendador.** El promedio bayesiano se lleva a
    0–1 comparándolo con los demás platos candidatos (mín–máx). Si se dividiera sobre la escala
    fija de 1 a 5, las diferencias (4,2 frente a 4,7) casi no pesarían. La popularidad se
    normaliza igual: el plato más pedido en la franja vale 1.
17. **Arranque en frío.** Un plato sin pedidos (en 14 días) ni calificaciones solo aparece si
    está destacado y, en ese caso, va **de primero** con el motivo "Nuevo en la casa". Con la
    fórmula sola, un plato nuevo nunca superaría a la Clásica 27, y el guion de la demo (§16,
    paso 7) espera verlo de primero. El administrador lo destacó a propósito y no hay datos para
    ordenarlo de otra forma.
18. **Motivo del recomendado.** Es el componente que más aporta al puntaje entre popularidad,
    calificación y destacado. Para no decir "Popular a esta hora" de algo que casi no se pide, la
    popularidad solo cuenta como motivo desde 0,5 y la calificación desde 0,6. Si ninguno
    alcanza, el motivo es "Ideal para esta hora" (o "Para descubrir" fuera de franja).
19. **Variedad en el carrusel.** Como casi todos piden bebida, las bebidas dominaban el
    carrusel. Se muestran máximo 2 platos por categoría; si no alcanza, se completa con los
    siguientes. Los platos nuevos destacados no cuentan para ese tope.
20. **Pestañas y filtro de categoría son lo mismo.** Las pestañas fijas ("Todo" y cada
    categoría) son el filtro de categoría y se combinan con la búsqueda y los demás filtros. En
    "Todo" la carta se agrupa por categoría. La hoja de filtros también permite elegir la
    categoría, sincronizada con las pestañas.
21. **Picante como selección múltiple.** El filtro de picante acepta varios niveles a la vez
    ("Sin picante" + "Suave", o "Medio" + "Muy picante"), en lugar de un máximo, para que sirva
    tanto a quien evita el picante como a quien lo busca.
22. **Búsqueda.** Por nombre del plato o de sus ingredientes (no por descripción), sin importar
    tildes ni mayúsculas. Si se escriben varias palabras, todas deben aparecer.
23. **Alias.** Obligatorio, de hasta 16 caracteres, y no se puede repetir en la misma mesa (sin
    distinguir tildes ni mayúsculas). Si el mismo dispositivo vuelve a escanear, conserva su
    comensal y va directo al menú.
24. **Restricciones.** Cerrar la hoja de la primera visita equivale a "Omitir" y no se vuelve a
    preguntar en esa pestaña. Se cambian desde el ícono de escudo del encabezado. La carta avisa
    con el chip del alérgeno en rojo y con ícono de alerta; la ficha muestra un aviso completo.
25. **"Agregar al pedido" en la Fase 1.** El botón ya guarda en el carrito compartido de la mesa
    (con la nota y la variante) y lo confirma con un toast. La pantalla del carrito y el envío
    llegan en la Fase 2.
26. **Botón del panel de demo.** Pasó a ser una pestaña pequeña pegada al borde izquierdo, a
    media altura, para no tapar precios ni la barra de "Agregar".

## Fase 2 — Pedido

27. **Quién edita qué en el carrito.** Todos ven el carrito completo de la mesa, agrupado por
    comensal (el propio primero). Cada uno solo cambia la cantidad o la variante, o elimina, lo
    que agregó. De los demás ve el plato, la cantidad, la nota y el precio.
28. **Líneas que se juntan.** Si un comensal agrega el mismo plato con la misma variante y la
    misma nota, se suma a la línea que ya tenía en vez de crear otra.
29. **Envío una sola vez.** Al confirmar se envían exactamente los ítems que se veían en
    pantalla. Si mientras tanto otro celular ya envió (el carrito quedó vacío) o el carrito
    cambió, el envío se rechaza con "Alguien de la mesa ya envió el pedido" o "El carrito cambió.
    Revísalo antes de enviar." Así nunca se crean dos rondas con los mismos platos. Si el
    carrito se vacía mientras el diálogo está abierto, el diálogo se cierra solo.
30. **Rondas.** Cada envío es una ronda nueva, con número consecutivo dentro de la sesión. Lo
    que se agrega después del envío queda en el carrito y la interfaz avisa que "irá en la ronda
    N". `Order.sentByDinerId` (extensión) guarda quién envió cada ronda.
31. **Precios congelados.** Al enviar, cada ítem guarda su `unitPrice`. El carrito, antes de
    enviarse, muestra el precio vigente del plato.
32. **Ticket.** Muestra todas las rondas de la sesión (la más reciente arriba), agrupadas por
    comensal. Los ítems quitados por el mesero aparecen tachados con su motivo y no suman. Las
    rondas rechazadas se muestran con el motivo y no suman al total.
33. **Avisos en vivo.** Cuando otro comensal agrega algo o envía el pedido, las demás pestañas
    de la mesa muestran un toast ("Luis agregó 1× Gaseosa", "Luis envió el pedido"), y en el
    carrito el ítem nuevo se resalta un momento. Los cambios propios no generan aviso.
34. **Comensal simulado (panel de demo).** Entra a la mesa elegida con un nombre libre de la
    lista (Camila, Andrés…), abriendo la sesión si no existía, y agrega un plato al azar de la
    franja actual (o de la simulada).
35. **Motivo fuera de horario.** Si no hay franja activa, el motivo nombra la franja que viene
    ("Popular en el desayuno") en lugar de "a esta hora".

## Fase 3 — Mesero

36. **Mesero por pestaña.** El mesero elegido se guarda en `sessionStorage`, como el comensal:
    cada pestaña puede ser un mesero distinto. Desde el hub se entra directo con
    `/mesero?mesero=carlos`. Las acciones verifican que la mesa sea del mesero elegido.
37. **Prioridad del estado en el mapa.** Si una mesa tiene varias rondas en estados distintos,
    manda lo más urgente: por confirmar > listo para entregar > en cocina > con clientes > libre.
38. **Tiempo sin confirmar.** Desde el límite (3 min por defecto) la tarjeta pasa a alerta
    (borde y contador ámbar). Desde el doble del límite pasa a crítica (rojo) y se crea una
    alerta `sin_confirmar` para el administrador. Esa alerta se resuelve sola cuando el pedido se
    confirma o se rechaza. Un vigilante revisa esto cada segundo en cualquier pestaña abierta; el
    id de la alerta es determinista (`alerta-sin-confirmar-<pedido>`), así que no se duplica.
39. **Ajustes.** Se puede quitar un ítem, cambiar su cantidad o cambiar su variante, solo antes
    de confirmar y siempre con motivo ("Agotado", "Cambio pedido por el cliente" u "Otro",
    escrito). No se puede quitar el último ítem: para eso está "Rechazar". El ítem guarda
    `adjustedFrom` (extensión) para que el cliente vea qué cambió ("de 2 a 1", "de Sencilla a
    Doble"). Un cambio de variante toma el precio de la nueva.
40. **Motivos de rechazo.** Lista rápida: "Cocina cerrada", "Pedido duplicado", "Mesa
    equivocada" u "Otro" (escrito).
41. **Liberar mesa.** Solo se puede cuando todas las rondas están entregadas o rechazadas. Lo que
    quede en el carrito sin enviar se descarta. Los celulares de la mesa vuelven a la entrada con
    el aviso "La mesa se liberó".
42. **Avisos al cliente.** Cada cambio de estado de una ronda y cada ajuste llegan como toast a
    los celulares de la mesa, y el ticket muestra los ajustes con su motivo.
43. **Sonido.** Está apagado por defecto (los navegadores exigen un toque antes de reproducir
    audio). Al activarlo desde el ícono de volumen suena una muestra; después, un pedido nuevo o
    uno listo suenan con un aviso corto generado con Web Audio, sin archivos.
44. **"Listo → Entregado".** Ya está en la vista del mesero; se activa cuando la cocina (Fase 4) marque la ronda como lista.
