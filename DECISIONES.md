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

## Fase 4 — Cocina y estados

45. **Qué ve la cocina.** Solo rondas confirmadas por el mesero (regla 1), en tres columnas y en
    orden de llegada a la cocina (la hora de confirmación). Los ítems que quitó el mesero no
    aparecen. La columna "Listos" muestra lo que espera al mesero y se vacía cuando lo entrega.
46. **Tiempo en la tarjeta.** Cuenta desde que el mesero confirmó. Desde los 10 min se pone
    ámbar ("va lento") y desde los 20 min en rojo ("atrasado"); con el tiempo ×10 eso es 1 y 2
    minutos reales. En "Listos" cuenta desde que se marcó listo.
47. **Un toque por paso.** Cada tarjeta tiene un único botón grande: "Empezar a preparar" o
    "Marcar listo". No hay "deshacer": la máquina de estados no permite retroceder y la cocina no
    marca "entregado".
48. **Tema oscuro.** La clase `theme-cocina` se aplica a toda la página mientras la cocina está
    abierta (así los toasts también salen oscuros) y se quita al salir.
49. **Línea de tiempo del cliente.** La ronda más reciente muestra la línea completa con la hora
    de cada paso. Las rondas anteriores muestran una barra de progreso compacta con su estado.
    Una ronda rechazada termina en "Rechazado" después de "Pendiente de confirmación".
    `Order.preparingAt` (extensión) guarda la hora de "En preparación".

## Fase 5 — Calificaciones

50. **Qué platos califica cada quien.** Solo platos de rondas entregadas (regla 7), uno por plato
    y ronda. Primero los que pidió el comensal; debajo, "También en la mesa", los de los demás,
    por si quiere opinar. Si el comensal no pidió nada a su nombre, ve todos los de la mesa.
51. **Estrellas obligatorias, platos opcionales.** Se puede dejar un plato sin calificar. Pero un
    comentario sin estrellas no se envía: la pantalla lo marca y pide las estrellas. Los
    comentarios tienen hasta 280 caracteres. Cada comensal califica un plato una sola vez por
    ronda (`DishRating.dinerId`, extensión).
52. **Servicio: una vez por visita.** La calificación del servicio es una por sesión de mesa
    (regla 8), no una por comensal. Si Ana ya calificó, Luis ve "El servicio ya fue calificado".
    Se asocia al mesero asignado a la mesa y guarda quién calificó (`ServiceRating.dinerId`).
53. **Alerta de servicio bajo.** Una calificación por debajo del umbral (menos de 3 estrellas por
    defecto) crea una alerta `servicio_bajo` con la mesa, el mesero y las estrellas. El panel la
    muestra al instante con un toast, y se puede marcar como resuelta o reabrir. El canal de
    WhatsApp aparece como "Próximamente".
54. **Cuándo se invita a calificar.** El ticket muestra "Califica tu experiencia" en cuanto hay
    algo entregado. La barra del menú lo muestra cuando todas las rondas terminaron y aún no se
    calificó el servicio.
55. **Panel del administrador en esta fase.** Se construyó la estructura (marca Platterio y menú
    lateral) y el bloque de alertas del Resumen. Las demás secciones aparecen marcadas "Fase 6"
    y se activan en la próxima fase.

## Fase 6 — Administrador

56. **Qué cuenta como venta.** Solo las rondas entregadas, con los precios congelados y sin ítems
    quitados (regla 12), en la fecha de entrega. "Pedidos del día" cuenta las rondas enviadas
    por las mesas, sin las rechazadas.
57. **Ticket promedio.** Ventas divididas entre visitas (sesiones de mesa con algo entregado), no
    entre rondas: una mesa que pide en dos rondas es una sola cuenta.
58. **Periodos.** Hoy, 7 días (por defecto), 14 días o fechas propias; siempre días completos desde
    la medianoche. Si el periodo no tiene datos se muestra "No hay datos para este periodo".
59. **Datos del panel.** Combinan el historial sembrado de 14 días con lo creado durante la demo,
    así que un pedido o una calificación nuevos se ven al instante en el panel.
60. **Pedidos por hora.** Las rondas de hoy (barras) frente al promedio de los 13 días anteriores
    (línea), entre las 7:00 a. m. y las 11:00 p. m.
61. **Ranking de platos.** Se ordena con el mismo promedio bayesiano del recomendador. La barra
    muestra el promedio simple y el número de reseñas.
62. **Más pedidos por franja.** La franja se asigna por la hora en que se envió la ronda y se
    cuentan unidades entregadas.
63. **Restricciones.** Se cuentan comensales por alérgeno a partir de las visitas del periodo, sin
    nombres ni datos personales.
64. **Fotos subidas.** Sin servidor de archivos, cada foto se reduce a JPEG de máximo 960 px y se
    guarda como data URL (unos 60–120 KB). Hasta 4 fotos por plato; la primera es la principal.
    Con backend real se reemplaza por subida a almacenamiento.
65. **Modelo 3D.** Se valida la extensión `.glb` y el tamaño (máx. 4 MB). Si no cumple, sale
    "Formato o tamaño no permitido (solo .glb hasta 4 MB)". Solo se guardan el nombre y el
    tamaño.
66. **Id del plato.** Se crea a partir del nombre ("La Paisa" → `la-paisa`) y no cambia aunque se
    renombre. No hay "eliminar": los platos se desactivan (regla 11) para conservar su historial.
67. **Nombres únicos.** Dos platos no pueden llamarse igual, sin distinguir tildes ni mayúsculas.
68. **Precios.** Se aceptan "22.900", "$22.900" o "22900". Con una sola opción, se llama "Única".
69. **Validación del formulario.** Los errores aparecen al primer intento de guardar y a partir de
    ahí se recalculan en vivo mientras se corrigen, con un resumen arriba.
70. **Franjas.** Se editan juntas y se guardan con un botón. El solapamiento se marca en vivo en
    la fila ("Las franjas se solapan") y bloquea el guardado. Si se elimina una franja, se quita
    también de los platos y de la hora simulada.
71. **Vista previa de recomendaciones.** Usa el mismo recomendador del cliente, a la mitad de cada
    franja, sin restricciones, y muestra el puntaje de cada plato para poder explicarlo en la
    sustentación.
72. **Mesas y meseros.** No se puede quitar una mesa con clientes. Una mesa tiene un solo mesero:
    asignarla a otro se la quita al anterior. Si queda una mesa sin mesero, se avisa.
73. **QR.** Cada mesa apunta a `<dominio>/mesa/<número>`. "PNG" descarga una tarjeta imprimible
    con el nombre del restaurante, la mesa y el QR.
74. **Gráficas.** Una sola serie va en el color del restaurante y no lleva leyenda; con dos series
    (hoy frente al promedio) hay leyenda. Barras de máximo 24 px con extremo redondeado,
    retícula de línea fina, tooltip al pasar el cursor y botón "Ver tabla" para accesibilidad.
    Las cifras grandes van en sans, no en la serif de los títulos.

## Fase 7 — Pulido

75. **Contraste del acento, más estricto.** El color fuerte del acento ahora se calcula para
    5,3:1 con blanco (antes 4,5:1). Así, usado como texto, también cumple AA sobre el fondo
    crema y sobre el acento suave; con `#E4572E` queda `#B24424`. axe-core lo detectó.
76. **Gráficas y teclado.** La capa de teclado de Recharts se desactiva porque la gráfica es
    decorativa (`aria-hidden`) y sus datos están en "Ver tabla", que sí es accesible.
77. **Páginas de error propias.** 404 ("Esta página no está en la carta"), error de pantalla con
    "Reintentar" y un error global de último recurso, todas en español.
78. **Aviso al reiniciar la demo.** Si se reinician los datos con un cliente dentro de una mesa,
    su pestaña dice "Se reiniciaron los datos de la demo" en vez de "La mesa se liberó".
79. **Sin almacenamiento.** Si el navegador no permite `localStorage` (algunos modos privados), la
    demo funciona igual y avisa que los datos se perderán al recargar.
80. **Guion automatizado.** `npm run e2e` recorre el guion de la sección 16 con cinco pestañas (las
    del cliente a 360 px) y `npm run e2e:a11y` escanea las 18 vistas con axe-core (WCAG 2.1 AA).
    Usan Playwright como dependencia de desarrollo; no forman parte de `npm test` porque necesitan
    la app corriendo.
81. **Después de agregar un plato** la ficha vuelve a la pantalla anterior (la carta, en el flujo
    normal) para conservar los filtros y la posición.

## Hacia el producto vendible — Fase 1: usuarios y roles

82. **Nuevo rumbo del producto.** Platterio pasa de demo a producto por suscripción, con una
    cuenta por negocio, usuarios con rol y base de datos real (decisiones y orden de trabajo en
    `docs/negocio/HOJA-DE-RUTA.md`). Primero se termina el software sobre el almacenamiento local
    y la base de datos se conecta al final; por eso las reglas van en funciones puras.
83. **Cuatro roles.** Administrador, encargado de caja, mesero y cocina, con una matriz de
    permisos (`lib/domain/access.ts`). El encargado opera todo el salón, asigna mesas, administra
    al equipo de servicio y cobra, pero no entra al panel completo (menú, marca, reportes
    completos, usuarios de cualquier rol). El administrador no tiene "mesas propias": no es mesero.
84. **Entrada con PIN.** El PIN identifica a la persona, por eso no se repite en el negocio.
    Administrador y encargado: 6 a 8 dígitos; mesero y cocina: 4 a 6. Sin lista pública de
    nombres. En la demo, la pantalla de entrada ofrece los usuarios de ejemplo con su PIN (marcado
    "Solo en la demo") para probar cada rol.
85. **El prototipo no es seguridad real.** Los PIN y la sesión viven en el navegador; las guardas
    de ruta son de interfaz. Con la base de datos, el acceso pasa a Supabase Auth y las mismas
    reglas se aplican en el servidor (RLS). Pendiente entonces: limitar intentos y cerrar sesión
    por inactividad.
86. **La sesión de quien entra es por pestaña** (sessionStorage), igual que la identidad del
    dispositivo en la demo: cada pestaña puede ser una persona distinta. En el producto real será
    persistente en el dispositivo.
87. **Quién administra a quién.** El administrador crea y modifica cualquier rol; el encargado,
    solo meseros y cocina. Nadie se desactiva a sí mismo y siempre queda un administrador activo.
88. **No se borra a nadie, se desactiva.** Así el historial de pedidos y calificaciones conserva
    el nombre. Un mesero desactivado deja libres sus mesas (se avisa al desactivarlo).
89. **Crear un mesero crea su ficha.** El alta de mesero ya no está en Configuración: se hace en
    "Equipo", con su PIN, y la ficha (mesas, calificaciones) se crea con él. Asignar mesas sigue
    en Configuración y en la Caja.
90. **Operar una mesa depende de quién entró.** El mesero actúa solo sobre sus mesas; el
    encargado y el administrador, sobre todas. Antes bastaba con elegir un mesero de una lista.
91. **Caja (`/caja`).** Pantalla del encargado: el mismo salón del mesero pero con todas las
    mesas, más "Mesas y meseros" y "Equipo". El administrador también puede entrar.

## Fase 2: mesas con QR fijo y PIN

92. **El QR de la mesa es fijo y no da acceso por sí solo.** Escanearlo sin una sesión abierta
    muestra "Pide al mesero que abra tu mesa", con un botón para avisarle. Así nadie puede pedir
    con un enlace guardado en el historial ni desde fuera del local.
93. **El mesero (o el encargado, o el administrador) abre la mesa.** Cada sesión nace con un PIN
    de 4 dígitos, sin repetirse entre las mesas abiertas, que el mesero da de palabra o muestra
    como QR (`/mesa/N?pin=XXXX`, que lo trae prellenado). El PIN solo vale mientras la sesión
    esté abierta. Un mesero solo abre sus mesas; encargado y administrador, todas.
94. **Entrar exige el PIN, una sola vez por dispositivo.** El que ya está dentro vuelve a entrar
    sin PIN. Si la mesa se cierra y se abre otra vez, la sesión nueva tiene otro PIN y todos
    deben entrar de nuevo. Antes de entrar no se muestran los nombres de quienes ya están
    (solo cuántos).
95. **Aviso "abre mi mesa".** El cliente de una mesa cerrada puede avisar; al personal le sale
    una tarjeta "La Mesa N pide que la abras" con el botón para abrirla, y un aviso. No se
    duplican avisos sin atender y se atienden al abrir la mesa. Es la base de otros avisos
    futuros (llamar al mesero, pedir la cuenta).
96. **Cierre automático.** Una mesa se cierra sola cuando no tiene rondas sin entregar ni
    rechazar y pasan N minutos sin actividad (entrar, mover el carrito o cualquier movimiento de
    sus rondas; cuenta desde lo último). Nunca se cierra con rondas pendientes. El negocio lo
    define en Configuración (por defecto 30 min, de 5 a 240) y el mesero puede cambiarlo para una
    mesa en particular.
97. **Cancelar una mesa.** Solo el encargado y el administrador. Cierra la mesa aunque tenga
    rondas sin entregar, que quedan rechazadas con el motivo "Mesa cancelada". Es para casos
    especiales y queda el motivo de cierre en la sesión (`mesero`, `cancelada`, `inactividad`).
98. **El cierre automático lo ejecuta cualquier pestaña abierta** (junto al vigilante de
    alertas), calculando siempre sobre el estado actual, así que dos pestañas a la vez no se
    estorban. Con la base de datos pasará a una tarea en el servidor.
99. **La demo.** "Simular otro comensal" abre la mesa por su cuenta si estaba cerrada, como
    lo haría un mesero.
100.  **Pedido tomado por el personal.** El mesero (en sus mesas) y el encargado/administrador (en
      todas) pueden "Tomar pedido" en la ficha de la mesa. La ronda nace ya confirmada y va
      directo a cocina, porque quien la toma es quien la confirma. Si la mesa estaba libre se abre
      sola con su PIN. Los platos quedan a nombre de "Mesero" en el ticket y no se piden reseñas.
101.  **Editar siempre, con rastro.** Cualquier ronda que no esté anulada se puede tocar (quitar,
      cantidad, opción, agregar platos, anular la ronda), también ya entregada: "a riesgo de ellos",
      pero cada cambio guarda quién, cuándo, qué y el motivo en `Order.changes`. Todo cambio
      menos agregar exige motivo. No se deja quitar el último plato: se anula la ronda.
      El flujo de ajustar antes de confirmar (con aviso al cliente) queda igual.
102.  **Aviso a cocina.** Los cambios sobre una ronda en cocina aparecen en su tarjeta como
      "Cambios del mesero" (con aviso emergente) hasta que cocina toca "Visto"; los platos
      quitados se ven tachados y los agregados marcados "Nuevo".
103.  **Marca por negocio.** Cada negocio elige una plantilla (Cálido, Clásico, Moderno, Fresco,
      Rústico: colores de fondo y texto, color de acento y par de tipografías), y encima puede
      cambiar el acento, las tipografías y subir su logo. Se guarda en `Restaurant.brand` y se
      aplica como variables CSS a toda la app; la cocina conserva su modo oscuro. Todas las
      plantillas cumplen contraste AA (hay prueba que lo verifica); el acento siempre pasa por
      `strongVariant` para botones y textos.
104.  **Tipografías incluidas, no de Google.** Se sirven desde el paquete (Fontsource), sin pedir
      nada a servidores externos (privacidad y velocidad). Solo se descarga la que se usa.
      Subir tipografías propias queda fuera: con dominio propio y Storage (Fase 9) se evalúa.
105.  **Logo.** PNG, JPG o WebP de hasta 3 MB; el navegador lo reduce a 512 px y debe quedar
      bajo ~300 KB. Se guarda como data URL (con la base de datos pasa a Storage). No se acepta
      SVG para no meter código ajeno en la página.
106.  **Plan.** Plantillas, tipografías y logo se dejan abiertos en el prototipo; la restricción
      por plan (Profesional) se aplica en la Fase 10 junto con los cobros.
107.  **Cobro sin pasarela.** Platterio no procesa pagos: caja (encargado o administrador) registra
      lo que el cliente pagó, con la forma (efectivo, tarjeta, transferencia, otro). Una cuenta
      se puede pagar en partes y con varias formas; no se acepta más de lo que falta. El mesero
      no cobra (no tiene el permiso `cobrar`).
108.  **Turno de caja.** Se abre con un fondo en efectivo y solo hay uno abierto a la vez. Sin caja
      abierta no se registran pagos. Al cerrar se cuenta el efectivo: esperado = fondo + pagos en
      efectivo del turno. Si hay diferencia, la nota es obligatoria. El resumen queda congelado
      en el turno. Cerrar con mesas por cobrar se permite, pero se avisa.
109.  **Mesas cerradas sin cobro.** Liberar o auto-cerrar una mesa con saldo no se bloquea (el
      servicio no puede quedar atascado), pero la cuenta queda marcada y aparece en el reporte
      "Mesas cerradas sin cobro registrado", para que el dueño vea el dinero sin soporte.
110.  **Reportes.** Nueva sección `/admin/reportes` (Esencial): vendido vs. cobrado, cobrado por
      forma de pago, ventas por mesero, cambios y anulaciones del personal (con quién y por qué),
      mesas sin cobro y cierres de caja; todo con CSV (separador ";" y BOM, abre bien en Excel).
      El historial sembrado ahora trae cobros y un cierre por día, con algunas diferencias y un
      4 % de mesas sin cobro para que los reportes tengan qué mostrar.
111.  **Periodos hasta el final del minuto actual**, para que lo que acaba de pasar entre al reporte.
112.  **Un domicilio es una mesa sin mesa.** Cada pedido a domicilio o para recoger crea una
      sesión (`tableId: "domicilio"`, con sus datos en `session.delivery`) y una ronda. Así
      reutiliza sin duplicar la cocina, los estados, el cobro, el registro de cambios y las ventas.
      No aparece en el salón ni en las alertas de "sin confirmar" (esas son del mesero). Lo
      gestiona el encargado o el administrador, no el mesero.
113.  **Flujo del pedido.** Recibido → confirmado (caja) → en preparación y listo (cocina) →
      despachado con un domiciliario → entregado. Para recoger no hay despacho: se entrega en el
      mostrador. El cliente solo cancela mientras no lo hayan confirmado; después, solo el
      personal, con motivo y quedando en el registro de cambios.
114.  **Cobro al recibir.** Sin pasarela de pagos: el cliente elige cómo pagará (efectivo con
      cuánto paga para llevar cambio, tarjeta por datáfono o transferencia) y caja registra el
      pago como cualquier otro. El envío cuenta en la cuenta pero no en "ventas de platos". Un
      domicilio entregado aún se puede cobrar; si no se cobra, sale en "sin cobro registrado".
115.  **Zonas, mínimos y horario.** Cada zona tiene envío, pedido mínimo y tiempo; el tiempo
      prometido es el de la zona más la preparación del negocio. El horario puede cruzar la
      medianoche y se compara con la hora de la demo. Fuera de horario se puede armar el pedido
      pero no enviarlo.
116.  **Datos del cliente.** Nombre y celular colombiano (10 dígitos que empiezan por 3); se
      recuerdan en su navegador para el próximo pedido. El enlace de seguimiento lleva un
      identificador aleatorio. Con la base de datos (Fase 9) se suman límites de pedidos por
      celular y verificación para evitar pedidos falsos.
117.  **Rendimiento de la carta de domicilios.** Sin animaciones de librería en las pantallas del
      cliente; la hoja de "agregar plato" se descarga solo al tocar un plato; las secciones de la
      carta usan `content-visibility`, las filas están memorizadas y las fotos cargan perezosas.
118.  **Sin propina y sin impuestos.** Platterio no suma propina (ni sugerida ni automática) ni calcula
      impuestos: el precio de la carta es el precio final y cada negocio maneja la propina y sus
      obligaciones fiscales (impuesto al consumo, IVA, factura electrónica) como siempre. Quedan
      fuera a propósito y se dirá en los términos de uso que Platterio no es un sistema de
      facturación.
119.  **Idiomas: español e inglés, solo para el cliente.** El texto en español es la clave de
      traducción (`t("Ver la carta")`): si falta una traducción se ve el español, nunca una pantalla
      rota. Se traduce todo lo que ve el cliente (entrada a la mesa, carta, ficha, carrito, pedido,
      calificación y domicilios, con sus mensajes de error). El personal siempre ve español.
120.  **Cómo se elige el idioma.** El negocio decide si ofrece inglés (Configuración → Idioma y
      moneda). El cliente ve el de su celular si el negocio lo ofrece, puede cambiarlo con el
      selector de arriba y se le recuerda en su navegador. Al cambiar, la pantalla se vuelve a
      pintar con los textos nuevos.
121.  **Platos en inglés.** Cada plato tiene campos opcionales de nombre y descripción en inglés
      (en la ficha del plato del panel). Si no los llena, se usa el diccionario (la carta de la demo
      está completa, con una prueba que lo verifica) y, si tampoco está, queda el español. Falta aún
      que la búsqueda de la carta entienda los nombres en inglés.
122.  **Moneda.** El negocio elige entre COP, MXN, USD, EUR, PEN y CLP. Cambia el símbolo y el
      separador de miles, pero **no convierte** los precios ya escritos, y los precios van en
      unidades enteras (sin centavos). Si un cliente necesita centavos, se pasa a guardar en la
      unidad menor de la moneda (cambio grande, se evalúa cuando haga falta).
123.  **El visor 3D vive en la ficha del plato.** Los platos que tienen personalización configurada
      (hoy Clásica 27, Brasa BBQ, La Diabla y el Calentado) muestran **Ver en 3D**: se abre una hoja
      con el plato girando, el control para separar los ingredientes y la lista para quitar, pedir
      extra, reemplazar o cambiar el acompañante. Al cerrar, la ficha muestra "Tu versión" con el
      cambio de precio y **Agregar** lo manda al carrito. El laboratorio sigue existiendo para
      probar modelos y comparte las piezas de la lista con la ficha.
124.  **La personalización queda congelada en el carrito y viaja con el pedido.** Cada línea guarda
      lo que suma al precio, las líneas de comanda (en español: "SIN Cebolla", "EXTRA Queso") y los
      alérgenos resultantes. El precio y la comanda los **recalcula la acción de agregar** a partir
      de las elecciones; no se confía en lo que mande el celular. Líneas con distinta
      personalización no se juntan. Quitar un ingrediente no descuenta (como en la propuesta).
      Cocina y mesero ven las líneas destacadas (rojo = sin, verde = extra/agregar); el cliente las
      ve en su idioma. Un plato personalizado no cambia de opción/tamaño ni en el carrito ni por
      el mesero: se quita y se vuelve a pedir (el precio de los extras depende del tamaño).
125.  **El 3D se descarga solo si se usa.** Three.js y el modelo (~1,3 MB) no se cargan con la ficha:
      se adelantan al acercar el dedo o el puntero al botón (salvo con "ahorro de datos") y, si no,
      al abrirlo. Dibuja solo cuando algo se mueve, baja la calidad si el equipo no da y respeta
      "reducir movimiento" (no gira solo). Sin WebGL queda el mensaje y la lista sigue sirviendo.
      El modelo CC BY muestra su crédito en el visor.
126.  **El 3D es un servicio por plato.** Un plato lo tiene activo cuando hay modelo y personalización
      configurados; en el panel se ve "Visor 3D activo" o "Modelo 3D subido, aún sin activar". La
      configuración la hacemos nosotros (hoy vive en código; con la base de datos, Fase 9, pasa a
      datos del plato) y el cobro por plato se aplica en la Fase 10. Pendiente: personalizar
      también desde `/domicilio` y desde "Tomar pedido" del mesero (hoy esos usan la nota).
127.  **Mirar la carta sin poder pedir.** Quien escanea el QR de una mesa cerrada, o una abierta sin
      haber puesto el PIN, puede ver la carta y la ficha de cada plato (con fotos, ingredientes,
      alérgenos, recomendados, filtros, **precios** y el visor 3D para mirar). Lo que no puede es
      agregar al carrito ni enviar: en vez de eso hay una barra fija ("Para pedir, tu mesero abre la
      mesa y te da un PIN") con **Avisar al mesero**; cuando el mesero abre la mesa, la barra
      cambia a **Poner PIN** y, al entrar, vuelve a la misma pantalla donde estaba. El carrito, el
      pedido y la calificación siguen pidiendo haber entrado. La carta es pública: mirarla no da
      acceso a nada, y el control de que solo pida quien está sentado no cambia.
