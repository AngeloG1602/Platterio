# Platterio · Requisitos de las mejoras (entrevista con el stakeholder)

Documento de trabajo para implementar las mejoras que salieron de la reunión con un empleado de un
restaurante que usa un sistema parecido. Reúne lo que se habló, lo que se decidió, los requisitos
funcionales y no funcionales, las reglas de negocio, los cambios técnicos previstos y el orden en que
conviene construirlo.

Las notas originales de la reunión se perdieron: lo que sigue se reconstruyó de memoria y se confirmó
con el equipo en una ronda de preguntas. Lo que no está confirmado figura en la sección 9.

## 1. Resumen

| Bloque | Mejora                                                 | Valor                                                 |
| ------ | ------------------------------------------------------ | ----------------------------------------------------- |
| 1      | Cocina ágil: una cola, un botón, sin pasos intermedios | Menos fricción en hora pico                           |
| 2      | Cobro obligatorio y liberación de la mesa al pagar     | No se pierde dinero; menos trabajo del mesero         |
| 3      | Auditoría de acciones                                  | Saber quién hizo y autorizó qué; base de lo siguiente |
| 4      | Cambio de mesa                                         | Resuelve el caso real del cliente que se cambia       |
| 5      | Consumos a crédito y cortesías                         | Empleados, dueño y clientes especiales                |
| 6      | Historial, filtros y análisis por horario              | Revisar pedidos y cuadrar turnos del personal         |
| 7      | Inventario (etapa 1) y rol de despensa                 | Control de mercancía, avisos y agotado automático     |
| 8      | Facturas guardadas y reimprimibles                     | Todos los negocios manejan facturas                   |
| 9      | Inventario por receta y factura electrónica            | Etapa 2, después de investigar                        |

## 2. Decisiones tomadas

| #   | Tema                    | Decisión                                                                                                                                                                                                                                                              |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Estados para el cliente | Se conserva "Confirmado por el mesero" (valida el pedido). Al llegar a cocina el cliente ve "En preparación". Sin tiempos ni promesas                                                                                                                                 |
| D2  | Cocina                  | Los tres bloques (por empezar, en preparación, listos) se reemplazan por una cola única en orden de llegada. Un solo botón: "Listo". El tiempo que lleva cada pedido es solo de uso interno                                                                           |
| D3  | Vista de pedidos hechos | La cocina puede cambiar a una lista de los pedidos ya listos, para consultar si faltó algo                                                                                                                                                                            |
| D4  | Colores                 | Rojo para los adicionales de una mesa que ya tenía pedidos en cocina. Otros colores solo para casos especiales, siempre con etiqueta (nunca solo color)                                                                                                               |
| D5  | Orden                   | Siempre de llegada; los adicionales no saltan la fila                                                                                                                                                                                                                 |
| D6  | Cambio de mesa          | Lo transfieren mesero, encargado o caja; nunca el cliente. Se mueve todo y los celulares pasan solos, sin otro PIN. La mesa vieja queda libre                                                                                                                         |
| D7  | Liberar la mesa         | Se libera sola cuando queda pagada por completo. El mesero y caja pueden liberarla a mano (sin saldo)                                                                                                                                                                 |
| D8  | Cobro                   | Todo pasa por caja. No se cierra ni se libera una mesa con saldo. Reemplaza la decisión 109                                                                                                                                                                           |
| D9  | Inventario              | Por etapas. Etapa 1: bebidas y productos terminados, avisos de poco stock y "agotado" automático. El stock se descuenta cuando el mesero confirma el pedido y se devuelve si se rechaza o se quita el ítem. Etapa 2: platos por receta. Reemplaza la decisión 142 (c) |
| D10 | Rol de despensa         | Rol nuevo que solo ve y carga el inventario                                                                                                                                                                                                                           |
| D11 | Crédito y cortesía      | Crédito: persona autorizada, queda con saldo y se salda al cobrarse. Cortesía: dueño o familia, sin deuda, se registra como gasto. Ambos se muestran aparte de las ventas cobradas. Los autoriza el administrador o el encargado                                      |
| D12 | Auditoría               | Cada acción relevante registra quién la hizo y, si aplica, quién la autorizó                                                                                                                                                                                          |
| D13 | Facturas                | Se genera una factura de cada pedido aunque el negocio no use factura electrónica; se guarda y se puede reimprimir. Reemplaza la decisión 118. La factura electrónica ante la DIAN se investiga primero                                                               |

## 3. Requisitos funcionales

Prioridad: **D** debe · **S** debería · **C** podría.

### 3.1 Cocina (bloque 1)

| ID    | Requisito                                                                                                                                                                | Prio |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| RF-01 | Cuando el mesero confirma una ronda, esta llega a la cocina directamente en preparación, con el tiempo corriendo desde ese momento. No hay botón de empezar              | D    |
| RF-02 | La vista principal de cocina es una sola cola con las rondas por hacer, en orden de llegada, a pantalla completa y sin columnas por estado                               | D    |
| RF-03 | Cada tarjeta muestra todo el detalle: mesa, ronda, platos, variantes, notas, personalizaciones (SIN y EXTRA) y cambios del mesero                                        | D    |
| RF-04 | Cada tarjeta tiene un único botón, "Listo", que la saca de la cola y avisa al mesero                                                                                     | D    |
| RF-05 | Cuando hay más pedidos de los que caben, la cola reduce la densidad antes de pedir desplazamiento y muestra cuántos quedan fuera de la vista. Ningún pedido queda oculto | D    |
| RF-06 | La ronda adicional de una mesa que ya tiene rondas por hacer o en cocina se muestra en rojo, con la etiqueta "Adicional · Mesa N", sin cambiar su lugar en la cola       | D    |
| RF-07 | Otros casos especiales (pedido atrasado, cambio del mesero, alergia) usan un color y una etiqueta propios. Se definen con el stakeholder                                 | S    |
| RF-08 | La tarjeta muestra el tiempo transcurrido y cambia de color según el retraso (ya existe)                                                                                 | D    |
| RF-09 | Vista adicional, cambiable desde la misma pantalla, con los pedidos ya marcados como listos, con su detalle y hora                                                       | S    |
| RF-10 | La línea de tiempo del cliente muestra Pendiente de confirmación, Confirmado, En preparación, Listo y Entregado, sin tiempos estimados                                   | D    |

### 3.2 Mesas (bloque 4 y parte del 2)

| ID    | Requisito                                                                                                                                         | Prio |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| RF-11 | Mesero, encargado y administrador pueden transferir la sesión de una mesa a otra mesa libre. El cliente no puede                                  | D    |
| RF-12 | La transferencia mueve todo: comensales, carrito, rondas, pagos y cambios. Queda el registro "movida de la mesa 1 a la 2", con quién y cuándo     | D    |
| RF-13 | Los celulares conectados pasan a la mesa nueva sin escanear otra vez ni pedir otro PIN                                                            | D    |
| RF-14 | La mesa de origen queda libre al terminar y su QR abre una sesión nueva                                                                           | D    |
| RF-15 | La mesa se libera sola cuando su cuenta queda pagada por completo. Un pago parcial no la libera                                                   | D    |
| RF-16 | Mesero y caja pueden liberar a mano una mesa sin saldo. Con saldo, solo si el saldo se pasa a crédito o cortesía con autorización (RF-30 y RF-31) | D    |

### 3.3 Cobro obligatorio (bloque 2)

| ID    | Requisito                                                                                                | Prio |
| ----- | -------------------------------------------------------------------------------------------------------- | ---- |
| RF-17 | Ninguna mesa con saldo se cierra, se libera ni se cierra por inactividad. Queda "por cobrar"             | D    |
| RF-18 | Las mesas por cobrar se ven en Caja aunque la caja esté cerrada, con el aviso "Abre la caja para cobrar" | D    |
| RF-19 | Los cobros solo se registran con un turno de caja abierto (ya existe) y quedan en ese turno              | D    |
| RF-20 | Mesero y administrador ven un aviso cuando una mesa se entrega y la caja está cerrada                    | S    |
| RF-21 | El reporte de vendido contra cobrado muestra las mesas por cobrar y no se descuadra                      | D    |

### 3.4 Roles y permisos

| ID    | Requisito                                                                                                                                                                                                                  | Prio |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| RF-22 | Rol nuevo **despensa**: entra con PIN y solo ve y carga el inventario. No ve ventas, caja ni reportes                                                                                                                      | D    |
| RF-23 | El administrador y el encargado también ven y cargan el inventario                                                                                                                                                         | D    |
| RF-24 | Permisos nuevos: transferir mesa (mesero, encargado, administrador); autorizar crédito y cortesía (encargado, administrador); ver el historial y las facturas (encargado, administrador); ver la auditoría (administrador) | D    |

### 3.5 Inventario (bloque 7)

| ID     | Requisito                                                                                                                                                                             | Prio |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| RF-25  | Cada producto terminado (bebidas, etc.) tiene existencias, unidad y umbral de aviso                                                                                                   | S    |
| RF-26  | Entradas, salidas y ajustes manuales con motivo, persona y hora                                                                                                                       | S    |
| RF-27  | Al confirmar el mesero una ronda, se descuenta el stock de sus productos. Si la ronda se rechaza o se quita o reduce un ítem, el stock vuelve                                         | S    |
| RF-28  | Aviso en el panel cuando el stock llega al umbral                                                                                                                                     | S    |
| RF-29  | Con stock cero, el producto aparece "agotado" en la carta y no se puede pedir; también en la toma de pedidos del personal                                                             | S    |
| RF-29b | Informe de movimientos de inventario por periodo                                                                                                                                      | S    |
| RF-29c | Etapa 2: receta por plato (ingredientes y cantidades), cálculo de cuántos platos salen del stock, plato agotado cuando falta un ingrediente clave, y cantidad máxima diaria por plato | C    |

### 3.6 Crédito y cortesías (bloque 5)

| ID    | Requisito                                                                                                                           | Prio |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| RF-30 | Cierre de cuenta a **crédito** a nombre de una persona autorizada (empleado, cliente especial): no se paga, queda con saldo         | D    |
| RF-31 | Cierre de cuenta como **cortesía** (dueño, familia): sin saldo, se registra como gasto                                              | D    |
| RF-32 | Lista de personas autorizadas, administrada por el administrador o el encargado. Quien no está en la lista no puede pedir a crédito | D    |
| RF-33 | Cada crédito o cortesía registra quién lo pidió, quién lo autorizó, qué se pidió y cuándo                                           | D    |
| RF-34 | Saldo por persona. Al cobrarse, el crédito se marca saldado. Descarga del saldo para descontar de nómina fuera del sistema          | S    |
| RF-35 | Los reportes separan ventas cobradas, créditos pendientes y cortesías. Estos dos últimos no cuentan como dinero cobrado             | D    |

### 3.7 Historial, reportes y análisis (bloque 6)

| ID    | Requisito                                                                                                                                          | Prio |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| RF-36 | Consulta de pedidos del día y de cualquier día, con detalle: platos, quién, forma de pago, estado y etiqueta (venta, rechazado, crédito, cortesía) | D    |
| RF-37 | Filtros combinables: número de pedido, mesa, mesero, forma de pago, estado y día. La vista inicial es la lista del día                             | D    |
| RF-38 | Filtros de tiempo sobre ventas y pedidos: rango de horas, días de la semana y últimos lapsos (10 minutos, 1 hora, 1 día)                           | D    |
| RF-39 | Panel de análisis de la carga: pedidos y ventas por hora y día de la semana, para cuadrar los horarios del personal                                | S    |
| RF-40 | Descarga en CSV de lo filtrado (ya existe para los reportes)                                                                                       | S    |

### 3.8 Facturas (bloque 8)

| ID    | Requisito                                                                                                                 | Prio |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ---- |
| RF-41 | Se genera una factura por cada pedido o mesa cobrada, con la información pertinente, y se guarda en el sistema            | S    |
| RF-42 | Se puede consultar y reimprimir cualquier factura                                                                         | S    |
| RF-43 | Impresión desde el navegador con formato de comprobante; conexión directa a la impresora del negocio queda por investigar | S    |
| RF-44 | Factura electrónica según la normativa colombiana, por medio de un proveedor autorizado. Investigación previa             | C    |

### 3.9 Auditoría (bloque 3)

| ID    | Requisito                                                                                                                                                                              | Prio |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| RF-45 | Registro único de acciones relevantes: pedidos, cambios, cobros, aperturas y cierres de caja, transferencias de mesa, créditos y cortesías, ajustes de inventario y cambios del equipo | D    |
| RF-46 | Cada registro guarda la persona, la acción, el objeto, la hora y, si aplica, quién autorizó y el motivo                                                                                | D    |
| RF-47 | El registro no se edita ni se borra desde la interfaz. El administrador lo consulta con filtros                                                                                        | D    |

## 4. Requisitos no funcionales

| ID     | Categoría            | Requisito                                                                                                                                                                  | Cómo se comprueba                       |
| ------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| RNF-01 | Eficiencia en cocina | El cocinero resuelve cada pedido con un toque. Sin menús, confirmaciones ni desplazamientos en la vista principal                                                          | Recorrido del guion e2e contando toques |
| RNF-02 | Visibilidad          | Con 12 pedidos activos se ven todos en una pantalla de 1280 por 800, con su detalle legible                                                                                | Prueba con 12 rondas sembradas          |
| RNF-03 | Rendimiento          | La cola de cocina, el historial y los reportes responden en menos de 300 ms con 1.000 pedidos. El historial pagina                                                         | Medición con datos sembrados            |
| RNF-04 | Tiempo real          | Un cambio en una pantalla llega a las demás en menos de 1 s en el mismo navegador                                                                                          | Guion e2e con varias pestañas           |
| RNF-05 | Accesibilidad        | Contraste AA. Los colores de cocina siempre van acompañados de etiqueta o ícono. Sin fallas de axe                                                                         | `npm run e2e:a11y`                      |
| RNF-06 | Integridad           | El stock no baja de cero. Un pago no supera el saldo. Una transferencia no deja una mesa en dos sesiones. Las operaciones compuestas se hacen en un solo cambio de estado  | Pruebas unitarias de las reglas         |
| RNF-07 | Seguridad            | Cada acción valida el permiso del rol en el dominio, no solo en la interfaz. Crédito y cortesía exigen autorización                                                        | Pruebas de permisos                     |
| RNF-08 | Auditabilidad        | Toda acción relevante deja registro con autor y hora; el registro es de solo lectura                                                                                       | Pruebas del registro                    |
| RNF-09 | Compatibilidad       | Los datos existentes siguen funcionando: los pedidos antiguos en estado "confirmado" se muestran en la cola. Se sube la versión de los datos de la demo si cambia su forma | Prueba de migración                     |
| RNF-10 | Mantenibilidad       | Reglas de negocio en `/lib/domain` como funciones puras con pruebas; la interfaz solo las usa                                                                              | Pruebas unitarias y revisión            |
| RNF-11 | Usabilidad           | Textos en español colombiano, mensajes claros que dicen qué hacer, y confirmación solo para acciones que no se pueden deshacer                                             | Revisión con el stakeholder             |
| RNF-12 | Privacidad           | Los créditos guardan solo nombre y datos mínimos de la persona; Ley 1581 de 2012                                                                                           | Revisión legal antes de lanzar          |
| RNF-13 | Planes               | Las funciones nuevas se asignan a un plan: cocina ágil y cobro obligatorio en ambos; inventario, crédito y análisis en el Completo                                         | Prueba de planes                        |

## 5. Reglas de negocio

1. Un pedido no se finaliza sin cobrarse. Una mesa con saldo solo sale de "por cobrar" cuando se paga, se pasa a crédito o se declara cortesía con autorización.
2. La mesa se libera sola únicamente cuando su saldo es cero. Una mesa sin consumo se puede liberar a mano.
3. Confirmar el pedido lo envía a la cocina y descuenta el stock en el mismo paso. Rechazarlo o quitar un ítem devuelve el stock.
4. La cola de cocina va siempre en orden de llegada. El rojo marca el adicional de una mesa que ya tiene pedidos en curso; no cambia el orden.
5. El cliente nunca ve tiempos estimados. La cocina sí ve el tiempo transcurrido.
6. Transferir una mesa conserva la cuenta, los pagos y el historial; la mesa de origen queda libre.
7. El crédito exige persona autorizada y un autorizador; la cortesía exige un autorizador. Ninguno cuenta como dinero cobrado.
8. El inventario nunca queda negativo. Un producto con stock cero no se puede pedir.
9. Toda acción relevante se registra con quién la hizo y quién la autorizó.

## 6. Cambios técnicos previstos

| Área                                                            | Cambio                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estados del pedido                                              | Se conservan los estados actuales para no migrar datos. La confirmación del mesero deja la ronda directamente en `en_preparacion` (con `confirmedAt` y `preparingAt` iguales). Los pedidos antiguos en `confirmado` se tratan como parte de la cola |
| Cocina (`lib/domain/kitchen.ts`, pantalla de cocina)            | `kitchenBoard` pasa a devolver una cola y una lista de hechos; `kitchenNextStatus` solo permite `en_preparacion` → `listo`; marca de adicional por mesa; densidad adaptable                                                                         |
| Sesiones (`lib/domain/tableAccess.ts`)                          | `sessionsToAutoClose` y la liberación manual consideran el saldo; nueva operación `transferSession`; cierre automático al pagar                                                                                                                     |
| Caja (`lib/domain/cash.ts`)                                     | Cierre de cuenta a crédito y cortesía; mesas por cobrar con caja cerrada; reglas de saldo                                                                                                                                                           |
| Roles (`lib/domain/access.ts`, tipos)                           | Rol `despensa` y permisos nuevos                                                                                                                                                                                                                    |
| Inventario (nuevo `lib/domain/inventory.ts`)                    | Productos, movimientos, descuento y devolución, umbrales, agotado                                                                                                                                                                                   |
| Crédito (nuevo `lib/domain/credit.ts`)                          | Personas autorizadas, saldos, cortesías                                                                                                                                                                                                             |
| Auditoría (nuevo `lib/domain/audit.ts`)                         | Registro de acciones con autor y autorizador; las acciones del store lo llaman                                                                                                                                                                      |
| Historial y análisis (`lib/domain/admin.ts` y nuevas pantallas) | Consulta por pedido, filtros de hora, panel de carga                                                                                                                                                                                                |
| Facturas (nuevo `lib/domain/invoice.ts`)                        | Numeración, contenido, almacenamiento y reimpresión                                                                                                                                                                                                 |
| Datos de la demo (`lib/data/seed.ts`)                           | Subir `DATA_VERSION` y sembrar inventario, personas autorizadas y un historial con las nuevas etiquetas                                                                                                                                             |
| Pruebas                                                         | Pruebas unitarias por regla; nuevas secciones del guion e2e; revisión de accesibilidad de las pantallas nuevas                                                                                                                                      |

## 7. Orden de construcción

| Orden | Bloque                                                            | Por qué primero                                                | Depende de |
| ----- | ----------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| 1     | Cocina ágil (RF-01 a 10)                                          | Mayor valor para el cocinero y sin dependencias                | —          |
| 2     | Cobro obligatorio y liberar al pagar (RF-15 a 21)                 | Evita pérdidas de dinero y el caso que se encontró probando    | —          |
| 3     | Auditoría (RF-45 a 47)                                            | Los siguientes bloques deben registrarse desde el primer día   | —          |
| 4     | Cambio de mesa (RF-11 a 14, 16)                                   | Resuelve un caso real y usa la auditoría                       | 2, 3       |
| 5     | Crédito y cortesías (RF-30 a 35)                                  | Es la excepción que permite cerrar una mesa con saldo          | 2, 3       |
| 6     | Historial y análisis (RF-36 a 40)                                 | Necesita las etiquetas de crédito y cortesía                   | 5          |
| 7     | Inventario etapa 1 y despensa (RF-22, 23, 25 a 29b)               | Es el más grande y se apoya en roles, auditoría y confirmación | 3          |
| 8     | Facturas (RF-41 a 43)                                             | Se apoya en el cobro y el historial                            | 2, 6       |
| 9     | Etapa 2: inventario por receta y factura electrónica (RF-29c, 44) | Requiere investigación                                         | 7, 8       |

Cada bloque se entrega con: reglas en el dominio y pruebas unitarias, pantalla, sección nueva en el guion e2e, revisión de accesibilidad, entrada en `DECISIONES.md` y actualización del README y de la hoja de ruta.

## 8. Decisiones del proyecto que cambian

| Decisión         | Hoy                                                              | Cambio                                                              |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| 109              | Liberar o cerrar una mesa con saldo no se bloquea; solo se marca | Se bloquea; la salida es pagar, crédito o cortesía autorizados      |
| 118              | Platterio no factura                                             | Se generan y guardan facturas; la electrónica queda por investigar  |
| 142 (c)          | Inventario: no por ahora                                         | Inventario por etapas, empezando por bebidas y productos terminados |
| 45 y 47 (cocina) | Tres columnas y un toque por paso                                | Cola única y un solo botón "Listo"                                  |

## 9. Por confirmar o investigar

| #   | Tema                                                                  | Recomendación                                                    |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Cuántos pedidos deben caber en pantalla en un día fuerte              | Diseñar para 12 y probar con ese volumen                         |
| 2   | Qué otros casos especiales merecen un color en cocina                 | Retraso, cambio del mesero y alergia, cada uno con etiqueta      |
| 3   | Qué hacer con una mesa con saldo cuando el cliente se fue sin pagar   | Dejarla por cobrar hasta que alguien autorice crédito o cortesía |
| 4   | Cómo se emite hoy la factura en el restaurante del stakeholder        | Investigarlo con él y con un contador                            |
| 5   | Normativa de la DIAN, proveedores y conexión con la impresora         | Investigación previa al bloque 9                                 |
| 6   | Si la cola de cocina debe mostrar un aviso sonoro al llegar un pedido | Sonido opcional y apagado por defecto, como en el mesero         |
