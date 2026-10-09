# Ideas y plus diferenciadores: análisis guardado

Estado: **analizado, sin implementar**. Se evalúa y se implementa por etapas, una a la vez, con visto
bueno de cada una. Fecha del análisis: 9 de octubre de 2026.

## Resumen en una tabla

| Idea                             | Qué es                                               | Costo para el negocio                                    | Depende de la fase 9       | Esfuerzo                                                 | Orden |
| -------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- | -------------------------- | -------------------------------------------------------- | ----- |
| Recompra por WhatsApp (campañas) | Guardar clientes con su permiso y enviarles anuncios | Gratis asistido; con la API, un cobro por mensaje        | Solo la parte automática   | Medio (asistido) / Grande (API)                          | 1     |
| Reseñas en Google (sin filtro)   | Invitar a todos a dejar su reseña tras calificar     | Gratis                                                   | No                         | Pequeño                                                  | 1     |
| Reservas y eventos con WhatsApp  | Enlace público, solicitud, confirmación y estados    | Gratis con enlaces; recordatorios automáticos con la API | Parcial                    | Medio                                                    | 2     |
| Varias sedes                     | Una marca con varias sedes, cada una con lo suyo     | Se cobra por sede adicional                              | **Sí, el modelo de datos** | Grande si se hace tarde; medio si se diseña en la fase 9 | 2     |
| Que no se caiga sin internet     | Seguir trabajando si se corta la conexión            | Sin costo recurrente                                     | Sí                         | Pequeño → Muy grande según el alcance                    | 2     |
| Inventario                       | Stock por ingrediente y costos                       | Sin costo recurrente                                     | Sí                         | Grande y delicado                                        | 3     |

## 1. Recompra por WhatsApp (campañas)

**Qué sería.** Cada pedido a domicilio ya guarda nombre y celular. Con el permiso del cliente, el
negocio los reúne en una lista de **Clientes** y puede crear una **campaña**: sube una imagen, escribe
el texto (y una oferta con vigencia), elige a quién va (por ejemplo, los que no piden hace 30 días) y
la programa. El cliente recibe el mensaje con un botón para pedir.

**Cómo se enviaría, en dos etapas**

- **Asistida (gratis, se puede hacer ya).** El sistema arma la lista de quienes aceptaron y, por cada
  persona, un botón que abre WhatsApp con el mensaje escrito. Es uno a uno y sin imagen adjunta (va
  con un enlace). Sirve para decenas de clientes, no para cientos.
- **Automática (con la API oficial de WhatsApp Business).** Necesita servidor (fase 9), una cuenta de
  Meta Business verificada, un número del negocio y **plantillas de marketing aprobadas por Meta**
  (admiten imagen, texto y botones). Meta cobra **por mensaje** desde el 1 de julio de 2025. Una fuente
  de terceros ubica el mensaje de marketing en Colombia alrededor de US$0,0125, es decir, unos US$12,5
  por cada 1.000 mensajes; **hay que confirmarlo en la tarifa oficial de Meta antes de fijar precios**.
  Meta también limita cuántos mensajes se pueden enviar según la calidad del número.
- Modelo de negocio posible: paquete de mensajes en el plan Profesional, o cobrar el consumo al costo.

**Reglas que hay que cumplir (Colombia)**

- **Ley 1581 de 2012 (datos personales):** para usar los datos con fines de mercadeo se necesita
  autorización previa, expresa e informada, una política de tratamiento y la posibilidad de retirarse.
- **Ley 2300 de 2023 ("Dejen de fregar"):** su artículo 5 aplica a los mensajes publicitarios por
  aplicaciones de mensajería: lunes a viernes de 7:00 a. m. a 7:00 p. m., sábados de 8:00 a. m. a
  3:00 p. m., nunca domingos ni festivos; hay que identificarse y decir el motivo. La vigila la SIC.
- **Cómo lo resolvería el sistema:** casilla **no premarcada** en el pedido ("Quiero recibir ofertas
  de este restaurante por WhatsApp"), con la fecha y el texto aceptado guardados; solo se escribe a
  quien aceptó; la campaña solo se puede programar en el horario permitido; cada mensaje dice quién
  escribe y trae "Responde BAJA para no recibir más"; quien se da de baja queda bloqueado; tope de
  frecuencia (por ejemplo, un mensaje por semana); no se permite importar listas sin permiso.
- Los textos legales (consentimiento y política de datos) los debe revisar un abogado antes de lanzar.

**Plan por pasos:** (a) casilla de consentimiento + pantalla Clientes (nombre, celular, último pedido,
cuántos pedidos, permiso); (b) campañas asistidas con vista previa tipo WhatsApp; (c) con la fase 9,
envío automático por la API con plantillas.

## 2. Reseñas en Google

**Corrección importante.** La idea de pedir la reseña **solo a quien calificó bien** se llama "filtrar
reseñas" y **la política de Google la prohíbe** (no se puede desalentar las reseñas negativas ni pedir
selectivamente las positivas). Puede costar la eliminación de reseñas, menos visibilidad o la
suspensión del perfil. Una fuente indica que Google reforzó el control en abril de 2026; es de un solo
blog, hay que mirarlo en la política oficial de Google.

**Lo que sí se puede (y es útil):** después de calificar, **a todos** se les invita a dejar su reseña en
Google con un enlace directo (necesita el identificador del lugar de Google del negocio). Aparte, a
quien califica mal se le ofrece, sin condicionar nada, un canal privado ("lamentamos lo que pasó,
cuéntanos") y le llega la alerta privada al dueño, como ya existe. Sin incentivos. Costo: ninguno.

## 3. Reservas y eventos con WhatsApp

**Qué sería.** Un enlace público `/{negocio}/reservas` (y un botón en la página de inicio del
negocio) con dos caminos:

- **Reserva de mesa:** fecha, hora, número de personas, nombre y celular. Confirmación automática si
  hay cupo, o manual.
- **Evento:** fecha, hora, número de personas, motivo (cumpleaños, empresarial, boda…), tipo de menú,
  zona o decoración, presupuesto aproximado y notas. Queda como **solicitud** y el negocio la cotiza.

**Flujo.** Llega a un panel "Reservas" con aviso; botón de WhatsApp con la confirmación ya escrita;
estados: solicitada, confirmada, rechazada (con motivo), cancelada, realizada; el cliente ve su estado y
puede cancelar. Para eventos: cotización con ítems (menú por persona, alquiler, decoración), total,
**anticipo registrado a mano** (sin pasarela de pago) y política de cancelación.

**Costos.** Con enlaces `wa.me` es gratis. Los recordatorios automáticos usan la API, y los mensajes de
tipo "utilidad" (confirmaciones y recordatorios) son más baratos que los de marketing; las respuestas
dentro de las 24 horas que siguen a un mensaje del cliente no se cobran (según la documentación de
Meta; confirmar las tarifas vigentes).

**Riesgos a resolver:** doble reserva (capacidad por franja), cancelaciones tardías y "no llegó".

## 4. Varias sedes

**Qué sería.** Una marca con varias sedes. Cada sede tiene sus mesas, su equipo, su caja y turnos, sus
domicilios (zonas, horario, WhatsApp) y su carta (compartida o con precios propios). El dueño ve el
consolidado y cada sede por separado. El personal puede tener acceso a una sede o a todas. El enlace
público pregunta "¿en qué sede?" y cada sede tiene sus QR. Se cobra una **sede adicional**.

**Decisión de fondo.** Esto no es una pantalla: es el modelo de datos (marca → sedes). Si no se diseña
desde el principio de la fase 9, después es muy costoso. **Recomendación: diseñar la base de datos con
sedes desde la fase 9 y lanzar la función después.** Para el cliente de dos ciudades se puede arrancar
con dos cuentas separadas y migrarlas cuando esté lista.

## 5. Que no se caiga sin internet

Hay tres niveles, de menos a más complejo:

1. **Aplicación instalable (PWA):** abre aunque no haya conexión, avisa "sin conexión" y reintenta sola.
   Esfuerzo pequeño.
2. **Cola de pedidos del mesero:** el mesero sigue tomando pedidos y se envían al volver la conexión.
   Cocina no los ve mientras tanto. Hay que resolver conflictos (mesa cerrada, plato agotado o precio
   cambiado mientras no había conexión). Esfuerzo medio-grande y depende de la base de datos.
3. **Todo el salón sin internet** (mesero, cocina y caja hablando entre sí por la red local): muy
   complejo y caro; no lo recomiendo por ahora.

**Recomendación:** hacer el nivel 1 pronto y el nivel 2 después de la base de datos, solo para "agregar
pedido". Sin costo recurrente para el negocio.

## 6. Inventario

Tres niveles: (1) marcar platos o ingredientes como **agotados** a mano (ya hay una base); (2) **stock
por ingrediente** que se descuenta al vender (exige una receta con cantidades por plato) con avisos; (3)
compras, proveedores y mermas (ya es un programa de gestión completo). El riesgo es que el inventario
solo sirve si el negocio lo cuenta con disciplina; si no, los datos engañan. **Recomendación:** empezar
por el **costo y margen por plato** (no exige conteos) y dejar el stock para después.

## Orden propuesto, por etapas

- **Etapa 0 (se puede hacer ya, sin la fase 9):** consentimiento y pantalla de Clientes; campañas
  asistidas; invitación a reseña en Google sin filtro; aplicación instalable con aviso "sin conexión";
  dejar escrito el modelo de sedes para la fase 9.
- **Etapa 1 (con la fase 9):** sedes en la base de datos; API de WhatsApp (plantillas de utilidad y de
  marketing); reservas con confirmación; cola de pedidos sin conexión.
- **Etapa 2:** eventos con cotización; margen por plato y stock simple; ideas con IA (importar la carta
  desde una foto, sugerencias al dueño).

## Decisiones pendientes (del dueño del producto)

1. ¿Cobrar las campañas como paquete de mensajes o pasar el costo al negocio?
2. ¿Quién es el dueño del número de WhatsApp de las campañas? Lo normal: un número propio de cada
   negocio, verificado en Meta.
3. ¿Se contrata a un proveedor de la API (BSP) o se conecta directo con Meta? Se decide en la fase 9.
4. Revisión legal de los textos de consentimiento y de la política de tratamiento de datos.
5. ¿Qué plan incluye cada cosa? Propuesta: reservas y campañas en Profesional; sedes como cobro por
   sede adicional.

## Fuentes consultadas

- Meta: precios de la plataforma de WhatsApp Business (https://developers.facebook.com/docs/whatsapp/pricing)
- Política de reseñas de Google y filtrado de reseñas (varias fuentes; confirmar en la política oficial)
- Ley 2300 de 2023 (CRC y prensa económica); confirmar el texto de los artículos 3 y 5 en el Diario Oficial
