# Platterio · Product Backlog (Scrum)

Documento único de guía para el proyecto de Ingeniería de Software: **épicas → historias de usuario →
criterios de aceptación → pruebas**. Es una vista ordenada de lo que ya se construyó y de lo que falta;
no cambia la forma en que se trabaja.

> **Numeración.** Las épicas EPIC-01 a EPIC-06 y las historias US-11 a US-34 vienen del `BRIEF.md`
> original y se conservan tal cual. Las épicas nuevas (EPIC-07 en adelante) y las historias desde
> US-35 se crearon al ampliar el producto. La redacción de las historias US-11 a US-34 está resumida
> a partir de la tabla de funciones del brief; si el equipo tiene el texto original, mantenlo.

## 1. Cómo leerlo

| Campo       | Significado                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prio**    | MoSCoW: **D** debe · **S** debería · **C** podría · **N** no por ahora                                                                                        |
| **Estado**  | **Hecho** (funciona en la demo) · **Prototipo** (funciona en local, pendiente base de datos o servicio real) · **Pendiente**                                  |
| **Pruebas** | **U** = prueba unitaria (archivo en `lib/domain/`) · **E** = sección del guion e2e (`e2e/guion-demo.mjs`) · **M** = prueba manual / de aceptación con usuario |
| **Pts**     | Puntos de historia (Fibonacci). Son una propuesta; el equipo los ajusta en la estimación                                                                      |

**Roles Scrum** (completar): Product Owner: ______ · Scrum Master: ______ · Equipo de desarrollo: ______ ·
Stakeholder / usuario experto: ______ (empleado de restaurante).

**Definición de Hecho (DoD):**

1. Cumple los criterios de aceptación.
2. Lógica de negocio en `/lib/domain` con pruebas unitarias que pasan.
3. Flujo cubierto por el guion e2e cuando involucra varias pantallas.
4. Sin errores de accesibilidad en la revisión automática (axe) y sin errores de consola.
5. TypeScript estricto, ESLint y Prettier sin errores; la compilación de producción pasa.
6. Texto de la interfaz en español colombiano.
7. Decisión importante registrada en `DECISIONES.md`.

## 2. Mapa de épicas

| Épica   | Tema                                            | Historias   | Estado           |
| ------- | ----------------------------------------------- | ----------- | ---------------- |
| EPIC-01 | Catálogo y contenido                            | US-11 a 14  | Hecho            |
| EPIC-02 | Descubrimiento y recomendación                  | US-15 a 17  | Hecho            |
| EPIC-03 | Visualización 3D                                | US-18 a 20  | Hecho            |
| EPIC-04 | Pedidos desde la mesa                           | US-21 a 24  | Hecho            |
| EPIC-05 | Servicio y confirmación                         | US-25 a 29  | Hecho            |
| EPIC-06 | Calificación y analítica                        | US-30 a 34  | Hecho            |
| EPIC-07 | Acceso, roles y equipo                          | US-35 a 38  | Hecho            |
| EPIC-08 | Pedido tomado por el personal                   | US-39 a 41  | Hecho            |
| EPIC-09 | Caja y cobros                                   | US-42 a 46  | Hecho            |
| EPIC-10 | Domicilios y recogida                           | US-47 a 51  | Hecho            |
| EPIC-11 | Marca del negocio                               | US-52 a 55  | Hecho            |
| EPIC-12 | Idiomas y monedas                               | US-56 a 58  | Hecho            |
| EPIC-13 | Cuentas y presencia pública                     | US-59 a 64  | Prototipo        |
| EPIC-14 | Reservas y eventos                              | US-65 a 67  | Hecho (v1)       |
| EPIC-15 | Fidelización                                    | US-68 a 70  | Parcial          |
| EPIC-16 | Planes y suscripción                            | US-71 a 73  | Prototipo        |
| EPIC-17 | Producción (base de datos y servicios reales)   | US-74 a 79  | Pendiente        |
| EPIC-18 | Calidad transversal (requisitos no funcionales) | RNF-01 a 06 | Hecho / continuo |

## 3. Historias por épica

### EPIC-01 · Catálogo y contenido

| ID    | Historia                                                                                                                              | Criterios de aceptación                                                                                                                                           | Prio | Pts | Estado | Pruebas                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --- | ------ | ---------------------------- |
| US-11 | Como administrador, quiero crear y editar platos con precio, variantes, ingredientes, fotos y franjas, para mantener mi carta al día. | Dado un formulario completo, cuando guardo, el plato aparece en la carta. Nombres únicos (sin distinguir tildes). Errores solo tras el primer intento de guardar. | D    | 8   | Hecho  | U `admin`, `menu` · E §7     |
| US-12 | Como administrador, quiero subir un modelo 3D del plato, para ofrecer la vista 3D.                                                    | Solo `.glb` de hasta 4 MB; si no cumple, mensaje claro.                                                                                                           | S    | 3   | Hecho  | U `admin` · E §16            |
| US-13 | Como cliente, quiero buscar y filtrar la carta por nombre, ingrediente, alérgeno y picante, para encontrar lo que puedo comer.        | Filtros combinables. Sin resultados: mensaje y botón para limpiar.                                                                                                | D    | 5   | Hecho  | U `menu`, `allergens` · E §2 |
| US-14 | Como cliente, quiero ver la carta con fotos, descripción, precio, picante y alérgenos, para decidir con información.                  | Los platos desactivados no aparecen. La ficha muestra galería, ingredientes y calificación.                                                                       | D    | 5   | Hecho  | U `menu` · E §2, §8          |

### EPIC-02 · Descubrimiento y recomendación

| ID    | Historia                                                                                                               | Criterios de aceptación                                                     | Prio | Pts | Estado | Pruebas                             |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- | --- | ------ | ----------------------------------- |
| US-15 | Como administrador, quiero definir franjas horarias sin solapamientos, para recomendar según la hora.                  | Un solapamiento se marca con "Las franjas se solapan".                      | S    | 3   | Hecho  | U `timeSlots`, `clock` · E §1       |
| US-16 | Como cliente, quiero indicar mis alergias para que no me recomienden ni me ofrezcan sin aviso platos con ese alérgeno. | Los recomendados cambian con la alergia; la ficha advierte "Tiene lácteos". | D    | 5   | Hecho  | U `recommender`, `allergens` · E §2 |
| US-17 | Como administrador, quiero marcar platos destacados, para que salgan primero en las recomendaciones.                   | Un plato destacado nuevo aparece de primero.                                | S    | 2   | Hecho  | U `recommender` · E §7              |

### EPIC-03 · Visualización 3D

| ID    | Historia                                                                                                                    | Criterios de aceptación                                           | Prio | Pts | Estado | Pruebas                                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---- | --- | ------ | ---------------------------------------------- |
| US-18 | Como cliente, quiero ver el plato en 3D y girarlo, para saber cómo luce.                                                    | La ficha ofrece "Ver en 3D". El visor se descarga solo si se usa. | S    | 8   | Hecho  | E §8, §16                                      |
| US-19 | Como cliente, quiero separar los ingredientes y personalizar el plato (quitar, extra, reemplazar), para pedirlo a mi gusto. | El precio, los alérgenos y la comanda se recalculan.              | S    | 8   | Hecho  | U `customization`, `cartCustomization` · E §16 |
| US-20 | Como cocina y mesero, quiero ver "SIN …" y "EXTRA …" destacados, para preparar bien el plato.                               | La personalización viaja al pedido y se ve en mesero y cocina.    | S    | 3   | Hecho  | U `cartCustomization` · E §16                  |

### EPIC-04 · Pedidos desde la mesa

| ID    | Historia                                                                                                                                     | Criterios de aceptación                                                                                                                         | Prio | Pts | Estado | Pruebas                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --- | ------ | ------------------------------------------- |
| US-21 | Como cliente, quiero escanear el QR de mi mesa y unirme a la sesión con un alias y el PIN que da el mesero, para pedir con mis acompañantes. | Mesa sin abrir no deja pedir. PIN incorrecto: mensaje. El alias no se repite en la mesa. Al liberar la mesa, el siguiente QR abre sesión nueva. | D    | 5   | Hecho  | U `session`, `tableAccess` · E §2, §10, §17 |
| US-22 | Como comensal, quiero un carrito compartido en tiempo real, para armar el pedido entre todos.                                                | Todos ven los mismos ítems con el nombre de quién los agregó; el total se recalcula.                                                            | D    | 8   | Hecho  | U `cart` · E §3                             |
| US-23 | Como comensal, quiero enviar el pedido una sola vez y que lo adicional sea una ronda nueva.                                                  | Al enviar, todos ven "esperando confirmación". Cada envío es una ronda con precios congelados.                                                  | D    | 5   | Hecho  | U `orders` · E §3                           |
| US-24 | Como comensal, quiero ver el ticket de la mesa por ronda y por comensal, para saber qué se pidió y cuánto va.                                | Total de la mesa visible; rondas ordenadas.                                                                                                     | D    | 3   | Hecho  | U `orders` · E §3                           |

### EPIC-05 · Servicio y confirmación

| ID    | Historia                                                                                                    | Criterios de aceptación                                                                      | Prio | Pts | Estado | Pruebas                          |
| ----- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---- | --- | ------ | -------------------------------- |
| US-25 | Como mesero, quiero ver mis mesas y confirmar o rechazar los pedidos, para controlar lo que llega a cocina. | Solo ve sus mesas. Rechazar pide motivo. Nada llega a cocina sin confirmar.                  | D    | 8   | Hecho  | U `waiter`, `orderStatus` · E §4 |
| US-26 | Como mesero, quiero quitar o cambiar ítems con un motivo, para corregir errores (p. ej. plato agotado).     | El cliente ve el ajuste con su motivo.                                                       | D    | 5   | Hecho  | U `staffOrders` · E §4           |
| US-27 | Como administrador, quiero alerta cuando un pedido tarda en confirmarse, para que no se quede esperando.    | Pasado el límite (3 min), la tarjeta se pone en alerta; al doble, se avisa al administrador. | S    | 3   | Hecho  | U `waiter`, `clock`              |
| US-28 | Como cocina, quiero un tablero de pedidos confirmados que avanzo con un toque, para trabajar en orden.      | Tres columnas; solo pedidos confirmados; un botón por paso.                                  | D    | 5   | Hecho  | U `kitchen` · E §5               |
| US-29 | Como cliente y mesero, quiero ver el estado del pedido hasta "Entregado", para saber en qué va.             | Línea de tiempo en el celular; aviso de "listo" al mesero.                                   | D    | 5   | Hecho  | U `orderStatus` · E §5           |

### EPIC-06 · Calificación y analítica

| ID    | Historia                                                                                                  | Criterios de aceptación                                                | Prio | Pts | Estado | Pruebas                        |
| ----- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---- | --- | ------ | ------------------------------ |
| US-30 | Como comensal, quiero calificar los platos que me entregaron, para dar mi opinión.                        | Solo platos entregados; estrellas obligatorias, comentario opcional.   | D    | 3   | Hecho  | U `ratings`, `feedback` · E §6 |
| US-31 | Como comensal, quiero calificar el servicio una vez por visita.                                           | Una sola calificación del servicio por sesión.                         | D    | 2   | Hecho  | U `feedback` · E §6            |
| US-32 | Como administrador, quiero ver promedios, ranking de platos y comentarios, para mejorar la carta.         | Periodos hoy, 7, 14 días o fechas propias.                             | D    | 5   | Hecho  | U `admin`, `ratings` · E §7    |
| US-33 | Como administrador, quiero ver ventas, ticket promedio, pedidos por hora y platos más pedidos por franja. | Solo cuentan rondas entregadas; "No hay datos" si está vacío.          | D    | 5   | Hecho  | U `admin` · E §7               |
| US-34 | Como administrador, quiero una alerta cuando una mesa califica mal el servicio, para actuar a tiempo.     | Calificación menor al umbral crea alerta con mesa, mesero y estrellas. | D    | 3   | Hecho  | U `feedback` · E §6, §7        |

### EPIC-07 · Acceso, roles y equipo

| ID    | Historia                                                                                                           | Criterios de aceptación                                                                 | Prio | Pts | Estado | Pruebas                     |
| ----- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---- | --- | ------ | --------------------------- |
| US-35 | Como administrador, quiero crear personas del equipo con rol y PIN, para que cada uno entre con lo suyo.           | Roles: administrador, encargado, mesero, cocina. PIN de 4 dígitos; se puede desactivar. | D    | 5   | Hecho  | U `access` · E §9           |
| US-36 | Como encargado, quiero asignar mesas a los meseros, para repartir el salón.                                        | Cada mesero ve solo sus mesas; al desactivarlo se liberan las suyas.                    | D    | 3   | Hecho  | U `waiter`, `access` · E §9 |
| US-37 | Como administrador, quiero que cada rol vea solo lo que le corresponde, para evitar errores y fraudes.             | Matriz de permisos aplicada en cada pantalla y acción.                                  | D    | 5   | Hecho  | U `access` · E §9           |
| US-38 | Como personal, quiero entrar con el código del negocio y mi PIN desde un enlace, para llegar rápido a mi pantalla. | `/personal` y `/{negocio}/entrar`.                                                      | S    | 3   | Hecho  | U `routes` · E §20          |

### EPIC-08 · Pedido tomado por el personal

| ID    | Historia                                                                                                      | Criterios de aceptación                                            | Prio | Pts | Estado | Pruebas                 |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---- | --- | ------ | ----------------------- |
| US-39 | Como mesero o caja, quiero tomar el pedido de una mesa a mano, con buscador y filtros como los del cliente.   | Hoja "Tomar pedido" con búsqueda por nombre/ingrediente y filtros. | D    | 5   | Hecho  | U `staffOrders` · E §11 |
| US-40 | Como encargado, quiero editar un pedido ya enviado con registro de quién cambió qué, para tener trazabilidad. | Cada cambio queda con motivo, persona y hora.                      | D    | 5   | Hecho  | U `staffOrders` · E §11 |
| US-41 | Como cocina, quiero ver los cambios sobre una ronda en curso, para no preparar lo equivocado.                 | La tarjeta muestra el cambio destacado.                            | S    | 2   | Hecho  | E §11                   |

### EPIC-09 · Caja y cobros

| ID    | Historia                                                                                                                                    | Criterios de aceptación                                                         | Prio | Pts | Estado | Pruebas                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---- | --- | ------ | --------------------------- |
| US-42 | Como cajero, quiero abrir y cerrar caja con un fondo, para controlar mi turno.                                                              | Un solo turno abierto a la vez; sin caja abierta no se cobra.                   | D    | 5   | Hecho  | U `cash` · E §13            |
| US-43 | Como cajero, quiero cobrar una mesa completa o en partes con varias formas de pago.                                                         | Efectivo, tarjeta y transferencia; la mesa sale de pendientes al quedar pagada. | D    | 8   | Hecho  | U `cash` · E §13            |
| US-44 | Como cajero, quiero que el cierre me pida explicar una diferencia de efectivo.                                                              | Con diferencia, el cierre exige una nota.                                       | D    | 3   | Hecho  | U `cash` · E §13            |
| US-45 | Como administrador, quiero reportes de lo vendido contra lo cobrado, por forma de pago, mesero y cambios del personal, con descarga en CSV. | Periodos configurables; descarga para el contador.                              | S    | 5   | Hecho  | U `admin`, `format` · E §13 |
| US-46 | Como dueño, quiero que el sistema no sume propina ni impuestos, para manejarlos como siempre.                                               | El precio de la carta es el precio final.                                       | D    | 1   | Hecho  | U `cash` (decisión 118)     |

### EPIC-10 · Domicilios y recogida

| ID    | Historia                                                                                                 | Criterios de aceptación                                                      | Prio | Pts | Estado | Pruebas                          |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---- | --- | ------ | -------------------------------- |
| US-47 | Como cliente, quiero pedir a domicilio o para recoger desde mi celular, sin QR de mesa.                  | Datos válidos (celular colombiano), zona con envío, pedido mínimo y horario. | D    | 8   | Hecho  | U `delivery` · E §14             |
| US-48 | Como cajero, quiero confirmar el domicilio y mandarlo a cocina, para que se prepare.                     | Flujo: recibido → confirmado → preparación → listo → en camino → entregado.  | D    | 5   | Hecho  | U `delivery` · E §14             |
| US-49 | Como cajero, quiero asignar un domiciliario y avisarle por WhatsApp con la dirección y el cobro.         | Enlace `wa.me` con el mensaje escrito.                                       | S    | 3   | Hecho  | U `whatsapp`, `delivery` · E §14 |
| US-50 | Como cliente, quiero seguir mi pedido y recibir el contacto del domiciliario, para coordinar la entrega. | WhatsApp y llamada al domiciliario cuando va en camino.                      | S    | 3   | Hecho  | U `delivery` · E §14             |
| US-51 | Como cliente, quiero avisar al negocio por WhatsApp con mi pedido ya escrito.                            | Enlace `wa.me` con nombre, dirección y platos.                               | S    | 2   | Hecho  | U `whatsapp` · E §14             |

### EPIC-11 · Marca del negocio

| ID    | Historia                                                                                                        | Criterios de aceptación                                                       | Prio | Pts | Estado | Pruebas                    |
| ----- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---- | --- | ------ | -------------------------- |
| US-52 | Como administrador, quiero poner mi logo, mi color y mis tipografías, para que la carta se vea como mi negocio. | Logo PNG/JPG/WebP hasta 3 MB; contraste AA garantizado.                       | S    | 5   | Hecho  | U `brand`, `color` · E §12 |
| US-53 | Como administrador, quiero elegir entre 9 estilos de carta, para adaptarla al tipo de negocio.                  | La vista previa no se aplica hasta confirmar; el personal conserva su paleta. | S    | 8   | Hecho  | U `brand` · E §18          |
| US-54 | Como administrador, quiero que el nombre y el logo del negocio se vean primero en mi panel.                     | Identidad del negocio en la cabecera del panel.                               | C    | 2   | Hecho  | E §12                      |
| US-55 | Como cliente, quiero que la cocina y la carta se lean bien en modo claro y oscuro.                              | La cocina siempre en modo oscuro; sin fallas de contraste.                    | S    | 3   | Hecho  | E §5, accesibilidad        |

### EPIC-12 · Idiomas y monedas

| ID    | Historia                                                                                   | Criterios de aceptación                                                           | Prio | Pts | Estado | Pruebas            |
| ----- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ---- | --- | ------ | ------------------ |
| US-56 | Como turista, quiero ver la carta en inglés y cambiar de idioma.                           | Se elige por el idioma del celular y se recuerda; el personal siempre ve español. | S    | 5   | Hecho  | U `format` · E §15 |
| US-57 | Como administrador, quiero escribir nombre y descripción en inglés de cada plato.          | Campos opcionales; si faltan, se usa español.                                     | C    | 3   | Hecho  | E §15              |
| US-58 | Como administrador, quiero elegir la moneda de los precios (COP, MXN, USD, EUR, PEN, CLP). | Cambia el símbolo; no convierte valores.                                          | C    | 3   | Hecho  | U `format` · E §15 |

### EPIC-13 · Cuentas y presencia pública

| ID    | Historia                                                                                                                               | Criterios de aceptación                                                | Prio | Pts | Estado    | Pruebas                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---- | --- | --------- | ----------------------- |
| US-59 | Como dueño, quiero crear mi cuenta con correo y contraseña y empezar una prueba de 7 días sin tarjeta.                                 | Validación de datos; el negocio queda creado con una dirección propia. | D    | 8   | Prototipo | U `accounts` · E §19    |
| US-60 | Como dueño, quiero iniciar sesión y volver a mi panel.                                                                                 | Sesión local; avisos de estado de la prueba.                           | D    | 3   | Prototipo | U `accounts` · E §19    |
| US-61 | Como dueño, quiero una dirección corta para mi negocio y enlaces listos para copiar (carta, domicilios, reservas, entrada del equipo). | Panel "Tus enlaces" con botones de copiar.                             | S    | 3   | Hecho     | U `routes` · E §20, §21 |
| US-62 | Como cliente, quiero ver la carta del negocio sin escanear un QR, para decidir antes de ir.                                            | Carta pública solo de lectura, y página de inicio del negocio.         | S    | 5   | Hecho     | E §21                   |
| US-63 | Como cliente, quiero mirar la carta de una mesa cerrada mientras espero al mesero.                                                     | Puedo ver y avisar al mesero, pero no pedir.                           | S    | 3   | Hecho     | U `tableAccess` · E §17 |
| US-64 | Como visitante, quiero una página de ventas clara con la demo, para conocer el producto.                                               | Planes, preguntas frecuentes y demo sin registro.                      | S    | 5   | Hecho     | E §19, accesibilidad    |

### EPIC-14 · Reservas y eventos

| ID    | Historia                                                                                     | Criterios de aceptación                                   | Prio | Pts | Estado | Pruebas                              |
| ----- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---- | --- | ------ | ------------------------------------ |
| US-65 | Como cliente, quiero reservar mesa o pedir cotización de un evento desde mi celular.         | Respeta cupo por franja y anticipación; recibo un código. | S    | 8   | Hecho  | U `reservations` · E §22             |
| US-66 | Como cajero, quiero confirmar, rechazar o cotizar reservas y avisar al cliente por WhatsApp. | Estados con transiciones válidas; mensaje escrito.        | S    | 5   | Hecho  | U `reservations`, `whatsapp` · E §22 |
| US-67 | Como administrador, quiero configurar cupos, horarios y motivos de evento.                   | Cupo máximo por franja y por mesa.                        | S    | 3   | Hecho  | U `reservations` · E §22             |

### EPIC-15 · Fidelización

| ID    | Historia                                                                                            | Criterios de aceptación                                                                   | Prio | Pts | Estado                         | Pruebas                    |
| ----- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---- | --- | ------------------------------ | -------------------------- |
| US-68 | Como dueño, quiero invitar a mis clientes a dejar una reseña en Google, para mejorar mi reputación. | Solo enlaces de Google; la invitación es igual para todos (sin filtrar por calificación). | S    | 3   | Hecho                          | U `google-reviews` · E §14 |
| US-69 | Como dueño, quiero una lista de clientes con su permiso, para escribirles.                          | Casilla de consentimiento; vista previa del mensaje.                                      | C    | 5   | Pendiente                      | —                          |
| US-70 | Como dueño, quiero enviar un anuncio (imagen y texto) a varios clientes a la vez.                   | Envío masivo con la API de WhatsApp Business.                                             | C    | 13  | Pendiente (fase de producción) | —                          |

### EPIC-16 · Planes y suscripción

| ID    | Historia                                                                                                                 | Criterios de aceptación                                                                                | Prio | Pts | Estado    | Pruebas             |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---- | --- | --------- | ------------------- |
| US-71 | Como dueño, quiero elegir entre dos planes según mi negocio (Digital o Completo).                                        | La página de ventas muestra cada plan, la oferta Fundador y la comparación con desarrollo a la medida. | S    | 5   | Hecho     | U `pricing` · E §23 |
| US-72 | Como dueño con plan Digital, quiero hasta 3 personas en el equipo, y hasta 20 con el Completo.                           | Al llegar al tope se explica cómo ampliar.                                                             | S    | 3   | Prototipo | U `pricing`         |
| US-73 | Como dueño con plan Digital, quiero ver solo las funciones de mi plan (sin salón, calificaciones ni reportes completos). | Pestañas y secciones se ocultan según el plan.                                                         | S    | 5   | Prototipo | U `pricing` · E §23 |

### EPIC-17 · Producción (backlog futuro)

| ID    | Historia                                                                                                       | Criterios de aceptación                                                                  | Prio | Pts | Estado    | Pruebas                                                |
| ----- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---- | --- | --------- | ------------------------------------------------------ |
| US-74 | Como negocio, quiero que mis datos se guarden en una base de datos y estén separados de los de otros negocios. | Datos por negocio con control de acceso; los dispositivos se sincronizan en tiempo real. | D    | 21  | Pendiente | Pruebas de integración y de aislamiento entre negocios |
| US-75 | Como dueño, quiero cuentas reales con verificación de correo y recuperación de contraseña.                     | Contraseñas protegidas en servidor.                                                      | D    | 13  | Pendiente | Pruebas de seguridad                                   |
| US-76 | Como negocio, quiero que el PIN del personal tenga límite de intentos, para evitar adivinarlo.                 | Bloqueo temporal tras varios fallos.                                                     | D    | 5   | Pendiente | Pruebas de seguridad                                   |
| US-77 | Como dueño, quiero pagar mi suscripción en línea y que el plan se aplique solo.                                | Cobro recurrente; el plan y los límites los fija el pago.                                | D    | 13  | Pendiente | Pruebas de integración con la pasarela                 |
| US-78 | Como cliente, quiero recibir avisos automáticos por WhatsApp (pedido, reserva).                                | API de WhatsApp Business.                                                                | C    | 13  | Pendiente | —                                                      |
| US-79 | Como dueño con varias sedes, quiero administrarlas bajo una misma cuenta.                                      | Un usuario con varios negocios.                                                          | C    | 13  | Pendiente | —                                                      |

## 4. Requisitos no funcionales (EPIC-18)

| ID     | Requisito                                                                                              | Cómo se comprueba                                       | Estado    |
| ------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | --------- |
| RNF-01 | **Accesibilidad:** sin fallas detectables en todas las pantallas (WCAG AA).                            | `npm run e2e:a11y` (axe)                                | Hecho     |
| RNF-02 | **Rendimiento:** la ficha no carga el 3D si no se usa; la carta de domicilios sin animaciones pesadas. | Revisión de la compilación y medición manual            | Hecho     |
| RNF-03 | **Calidad de código:** TypeScript estricto, ESLint y Prettier.                                         | `tsc`, `eslint`, `prettier --check`                     | Hecho     |
| RNF-04 | **Lógica separada de la interfaz:** reglas de negocio en funciones puras con pruebas.                  | `npm test` (381 pruebas unitarias en la última corrida) | Hecho     |
| RNF-05 | **Compatibilidad móvil:** cliente desde 360 px; mesero y cocina en tableta.                            | Guion e2e con varios tamaños de pantalla                | Hecho     |
| RNF-06 | **Privacidad:** solo los datos necesarios; Ley 1581 de 2012.                                           | Revisión con un abogado antes de lanzar                 | Pendiente |

## 5. Plan de pruebas

| Nivel                | Qué prueba                                                                            | Herramienta                          | Dónde                                   |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| Unitarias            | Reglas de negocio: pedidos, estados, caja, recomendaciones, reservas, precios         | Vitest                               | `lib/domain/*.test.ts`                  |
| De integración / e2e | Flujos completos entre varias pantallas (cliente → mesero → cocina → caja → reportes) | Playwright                           | `e2e/guion-demo.mjs` (secciones 1 a 23) |
| Accesibilidad        | Contraste, etiquetas, estructura                                                      | Playwright + axe                     | `e2e/accesibilidad.mjs`                 |
| Aceptación           | El usuario real confirma que cada historia resuelve su problema                       | Entrevista y demo con el stakeholder | Sección 6                               |

### Casos de aceptación manual (para la sesión con el stakeholder)

| Caso  | Historia      | Pasos                                                              | Resultado esperado                                     | ¿Cumple? | Observaciones |
| ----- | ------------- | ------------------------------------------------------------------ | ------------------------------------------------------ | -------- | ------------- |
| CA-01 | US-21, 22, 23 | Abrir una mesa, entrar con dos celulares, armar y enviar un pedido | Ambos ven el mismo carrito; el mesero recibe el pedido | ☐        |               |
| CA-02 | US-25, 26     | Quitar un plato "agotado" y confirmar                              | El cliente ve el motivo; cocina recibe el pedido       | ☐        |               |
| CA-03 | US-28, 29     | Preparar y marcar listo en cocina                                  | El mesero recibe el aviso; el cliente ve el estado     | ☐        |               |
| CA-04 | US-43, 44     | Cobrar en partes y cerrar caja con diferencia                      | Se exige la nota; el reporte muestra el cobro          | ☐        |               |
| CA-05 | US-47, 48, 49 | Pedir un domicilio y despacharlo                                   | El cliente recibe el contacto del domiciliario         | ☐        |               |
| CA-06 | US-65, 66     | Reservar y confirmar                                               | El cliente ve la reserva confirmada                    | ☐        |               |
| CA-07 | US-16, 14     | Elegir una alergia y revisar la carta                              | Se advierte y no se recomienda ese plato               | ☐        |               |
| CA-08 | US-32, 33     | Ver ventas y calificaciones                                        | Cifras coherentes con lo hecho                         | ☐        |               |

## 6. Cómo usarlo con la entrevista al stakeholder

1. **Antes de la demo,** pregúntale por sus procesos y anota necesidades como "rol – necesidad – para qué",
   con la frase textual.
2. **Durante la demo,** ejecuta los casos CA-01 a CA-08 y marca si cumple.
3. **Después,** para cada necesidad nueva crea una historia con el formato:

| ID    | Historia                                       | Criterios de aceptación (Dado/Cuando/Entonces) | Prio | Pts | Fuente                          |
| ----- | ---------------------------------------------- | ---------------------------------------------- | ---- | --- | ------------------------------- |
| US-80 | Como [rol], quiero [acción], para [beneficio]. | Dado…, cuando…, entonces…                      |      |     | Entrevista del __/10, cita: "…" |

4. Las que ya estén cubiertas se marcan **Validada por el stakeholder**; las que no, entran al Product
   Backlog (EPIC nueva o la que corresponda) con su prioridad.
5. Revisa cada historia con **INVEST**: independiente, negociable, valiosa, estimable, pequeña y
   verificable.

## 7. Propuesta de agrupación en sprints (para la documentación)

Las fechas y la duración las pone el equipo; esta es solo una forma lógica de agrupar lo que se
construyó, en el orden en que dependen las historias.

| Sprint     | Meta                                      | Historias                             |
| ---------- | ----------------------------------------- | ------------------------------------- |
| 1          | El cliente puede ver la carta y pedir     | EPIC-01, EPIC-02, EPIC-04             |
| 2          | El pedido llega, se confirma y se prepara | EPIC-05, EPIC-06 (calificar)          |
| 3          | El dueño controla su negocio              | EPIC-06 (analítica), EPIC-07, EPIC-08 |
| 4          | Se cobra y se cierra caja                 | EPIC-09                               |
| 5          | Nuevos canales y diferenciales            | EPIC-10, EPIC-03, EPIC-12             |
| 6          | Cada negocio con su marca y su dirección  | EPIC-11, EPIC-13                      |
| 7          | Reservas, reseñas y planes                | EPIC-14, EPIC-15, EPIC-16             |
| Siguientes | Producción real                           | EPIC-17                               |

## 8. Registro de decisiones y trazabilidad

Las decisiones técnicas y de producto están numeradas en [`DECISIONES.md`](../../DECISIONES.md); cada
historia puede citarlas (por ejemplo, US-46 ↔ decisión 118). La hoja de ruta de negocio está en
[`docs/negocio/HOJA-DE-RUTA.md`](../negocio/HOJA-DE-RUTA.md) y los planes y precios en
[`docs/negocio/PLANES-Y-PRECIOS.md`](../negocio/PLANES-Y-PRECIOS.md).
