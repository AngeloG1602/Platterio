# Propuestas de inteligencia artificial en Platterio

Estado: **propuesta para discutir**, sin implementar. Parte de que hoy casi todo software dice tener
IA, así que lo que importa es poner IA donde dé una ventaja real y medible al dueño del negocio, y no
ponerla donde una regla exacta funciona mejor.

## 1. Principios

1. **La IA propone, la persona decide.** Toda cifra que venga de la IA se marca como estimada y la
   confirma el dueño antes de usarse.
2. **Nunca decide dinero ni stock.** Cobros, totales, facturas, descuentos de inventario, permisos y
   estados de pedido siguen siendo reglas exactas y verificables.
3. **Alérgenos: solo datos registrados.** El asistente responde con lo que ya está guardado en cada
   plato; ante la duda, remite al mesero.
4. **Valor sobre adorno.** Se prioriza lo que aprovecha los datos propios del negocio (ventas,
   pedidos, calificaciones, inventario), porque eso no lo tiene un chat genérico.
5. **Cada función con tope de uso y costo conocido**, incluida en el plan Completo con una cantidad
   de consultas.

## 2. Requisito previo: servidor y datos

Toda integración necesita un servidor que guarde la llave de la API y controle el uso. Por eso va
después de la fase de cuentas y base de datos. Los datos ya están bien estructurados (pedidos,
rondas, pagos, calificaciones, auditoría, inventario), que es lo difícil.

## 3. Prioridad

| # | Función | Valor | Dificultad | Necesita |
|---|---|---|---|---|
| 1 | Resumen semanal del negocio en lenguaje claro | Alto | Baja | Ventas y pedidos |
| 2 | Resumen de calificaciones y comentarios por tema | Alto | Baja | Calificaciones |
| 3 | Asistente de la carta con alérgenos | Alto | Media | Carta |
| 4 | Incorporación guiada y borrador de recetas | Alto | Media | Carta, inventario |
| 5 | Preguntarle a los datos (en lenguaje natural) | Alto | Media | Varias semanas de datos |
| 6 | Análisis de desviaciones del inventario | Alto | Media | Recetas y conteos |
| 7 | Pronóstico de producción y compras | Alto | Media-alta | Meses de datos |
| 8 | Detección de anomalías (cortesías, descuadres) | Alto | Media | Auditoría, caja |
| 9 | Respuestas a reseñas y textos de marketing | Medio | Baja | Reseñas |
| 10 | Traducción de la carta | Medio | Baja | Carta |
| 11 | Pedir por voz o texto libre | Medio | Media | Carta |
| 12 | Atención por WhatsApp (reservas, horarios) | Medio | Media-alta | WhatsApp API |

## 4. Funciones por área

**Dueño y administración (mayor retorno).** El dueño ya tiene los datos y no tiene tiempo de
analizarlos: resumen semanal con sugerencias, preguntas libres a los datos («¿qué mesero vende más
postres?»), tendencias en comentarios, alertas explicadas y detección de movimientos raros.

**Cliente.** Asistente de la carta (recomendaciones por gusto y restricciones), traducción
automática y pedido por texto o voz libre.

**Inventario y recetas.** Ver sección 5.

**Reservas, domicilios y marketing.** Respuestas por WhatsApp con escalamiento a una persona,
cotización de eventos y textos de promociones.

**Equipo de Platterio.** Soporte con la documentación e incorporación guiada de negocios nuevos
(conversar con el dueño y dejarle la carta, las mesas y los roles medio listos).

## 5. Inventario y recetas: el diseño correcto

### Lo que hay hoy (etapas 1 y 2 del prototipo)

- Productos con existencias, unidad y aviso de poco stock.
- Se descuenta **al confirmar el pedido** y se devuelve si se rechaza o se quita un plato.
- Recetas por plato u opción con ingredientes clave (decimales) y un tope diario.
- Plato agotado automático si falta un ingrediente clave.
- Entradas, salidas y ajustes con motivo; informe de movimientos; todo en la auditoría.

### Qué le falta (y por qué los datos saldrían falsos)

Hoy se supone que vender un plato gasta sus ingredientes. Eso es cierto en platos **a la orden**
(hamburguesa, parrilla) pero no en platos **por lote** (lasaña, sopa, arroz), donde el ingrediente
se gasta al preparar, antes de que haya pedidos.

### Diseño propuesto

1. **Insumos:** lo que se compra, con su existencia (ya existe).
2. **Preparaciones:** receta de lote con ingredientes y **rendimiento** («1 bandeja de lasaña = 12
   porciones»).
3. **Producción:** la cocina registra el lote con un toque («hoy 2 bandejas»); ahí se descuentan los
   insumos, que es el gasto real aunque nadie haya pedido.
4. **Porciones disponibles:** el lote deja porciones como stock del plato; cada pedido descuenta una
   porción. Al acabarse, el plato queda agotado solo.
5. **Cierre del día:** se anotan las sobras y mermas.
6. **Modo por plato:** cada plato se marca «a la orden» o «por lote»; un mismo negocio mezcla ambos.

### Cómo mantener los datos honestos

- **Conteo físico** periódico de los ingredientes importantes y **reporte de desviación**
  (esperado frente a contado).
- **Calibración:** si la desviación se repite, el sistema propone ajustar la receta; el dueño decide.
- **Solo ingredientes clave:** sal, aceite y especias no se controlan por plato.
- **Origen de cada cantidad:** estimada, confirmada por el dueño o calibrada con conteo.
- Se comunica como **control aproximado con conteos**, no como inventario perfecto.

### Dónde entra la IA aquí (y dónde no)

No decide los descuentos. Sí puede: armar el borrador de preparaciones desde texto, voz o la foto
del cuaderno del cocinero; sugerir rendimientos típicos (solo como punto de partida); explicar
desviaciones y proponer calibraciones; pronosticar cuánto producir el día siguiente; y limpiar
nombres y unidades duplicados.

### Fases

1. **Sin IA (prototipo):** preparaciones, producción, porciones disponibles, conteo físico y reporte
   de desviación. Carga masiva desde Excel, plantillas por tipo de negocio, conversión de unidades y
   costo por plato.
2. **Con IA (con servidor):** borrador de recetas, calibración sugerida y pronóstico de producción.

### Carga de trabajo para el dueño (estimación mía, sin medir)

Empezar con los 10 platos más vendidos: una a dos horas con ayuda. Día a día: un toque por lote y un
conteo semanal corto. Si se siente como trabajo extra, lo abandonan: hay que diseñarlo para que sea
muy breve y mostrar el beneficio (costo por plato, desperdicio).

## 6. Costos (con los precios de lista de Anthropic a octubre de 2026)

| Modelo | Entrada / salida por millón de tokens |
|---|---|
| Haiku 5.5 | $0,10 / $0,50 |
| Sonnet 5.5 | $2 / $10 |
| Opus 5.5 | $4 / $20 |

Estimaciones (supuestos míos: ~1.000 tokens de entrada y ~500 de salida por tarea, hasta 3 veces
más salida por el razonamiento del modelo):

- Sugerir una receta: ~$0,0004 (Haiku), ~$0,007 (Sonnet), ~$0,014 (Opus).
- Cargar 40 recetas de una carta: ~$0,015 / ~$0,28 / ~$0,56 (la API por lotes cuesta la mitad).
- Uso mensual típico por restaurante (carga inicial + ~100 consultas): menos de $0,10 con Haiku,
  $1 a $2 con Sonnet, $2 a $4 con Opus. Con un dólar a ~$4.000 COP (supuesto) son $400 a $16.000
  COP al mes, frente a $149.000 COP del plan Completo.
- El costo grande es construir el servidor, los topes de uso y las pantallas; no las consultas.

## 7. Recomendación

1. Primero, sin IA: preparaciones, producción, conteos y desviaciones (los datos tienen que ser
   confiables antes de analizarlos).
2. Con servidor: resumen semanal y de calificaciones (rápido, barato y visible), luego asistente de la
   carta con alérgenos, incorporación guiada y recetas sugeridas.
3. Cuando haya meses de datos: preguntas libres, pronóstico de producción y compras, y anomalías.
4. Ofrecer la IA como parte del plan Completo con un tope de consultas, y un extra más adelante si
   hace falta.

## 8. Preguntas abiertas

- ¿Los primeros clientes cocinan sobre todo a la carta o por lotes (almuerzos y menú del día)?
- ¿Quién registra la producción: la cocina en su pantalla o la despensa?
- ¿La IA va incluida en el plan o como complemento?
