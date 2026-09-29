# Platterio — Brief para construir el mockup con Claude Code

> Documento para poner en la raíz del repositorio (por ejemplo, como `BRIEF.md`) y pedirle a Claude Code que lo lea completo antes de escribir código. Recoge los requisitos funcionales y no funcionales del proyecto (épicas EPIC-01 a EPIC-06, historias US-11 a US-34), adaptados a un prototipo navegable **sin la parte 3D**.

---

## 0. Cómo usar este documento con Claude Code

1. Crea una carpeta vacía, copia este archivo como `BRIEF.md` y abre Claude Code ahí.
2. Pega el **prompt inicial** de la sección 17.
3. Pídele que trabaje **por fases** (sección 15) y que al final de cada fase te muestre lo que se puede probar antes de seguir.
4. Revisa cada fase en el navegador y corrige el rumbo antes de avanzar. No le pidas todo de una vez.

---

## 1. Qué es Platterio

Platterio es una aplicación web de menú interactivo para restaurantes de comida rápida. Reemplaza la carta impresa por una experiencia en el celular del cliente, al que se entra escaneando un QR en la mesa.

Resuelve dos problemas:

1. **La carta no da información suficiente para decidir.** No muestra cómo luce el plato, sus ingredientes, sus alérgenos ni su nivel de picante, así que el cliente pide a ciegas.
2. **El dueño se entera tarde del mal servicio.** Normalmente lo sabe por una reseña días después, cuando ya no puede corregir nada.

Para eso ofrece un catálogo con información completa, recomendaciones según la hora del día, pedidos desde la mesa (individuales o en grupo) con **confirmación obligatoria del mesero**, seguimiento del pedido y calificaciones de plato y de servicio por separado, con alerta al administrador.

El producto está pensado para configurarse en cualquier restaurante. **En este mockup se usa un restaurante inventado de ejemplo: "Fogón 27"** (hamburguesas y comida rápida, Colombia). Todos los datos son de prueba.

---

## 2. Objetivo y alcance del mockup

**Objetivo:** un prototipo navegable, prolijo y realista, que permita demostrar en la sustentación el flujo completo: el cliente escanea el QR, explora, pide (solo o en grupo), el mesero confirma, cocina prepara, el cliente sigue el estado, califica, y el administrador ve todo en su panel.

**Incluye cuatro vistas conectadas:**

| Vista | Dispositivo objetivo | Quién la usa |
|---|---|---|
| Cliente | Celular (375–430 px de ancho) | Comensal que escanea el QR |
| Mesero | Tablet vertical o celular | Mesero |
| Cocina | Tablet horizontal / pantalla | Personal de cocina |
| Administrador | Escritorio (≥1280 px) | Dueño / administrador |

**No incluye (por ahora):**

- Visualización 3D y despiece (EPIC-03, US-18 a US-20). Se deja **el espacio reservado** en la ficha del plato con un botón deshabilitado "Vista 3D — próximamente", para que se note que es parte del producto.
- Backend real, base de datos y autenticación real.
- Pagos, integración POS, inventario, domicilios, realidad aumentada.
- Envío real por WhatsApp (la alerta se muestra solo dentro de la plataforma).

---

## 3. Stack técnico

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript estricto** | Rutas por vista, fácil de desplegar en Vercel |
| Estilos | **Tailwind CSS** con tokens de diseño propios (variables CSS) | Control total del diseño, nada de apariencia de plantilla |
| Componentes base | shadcn/ui **solo como punto de partida**, restilizado con los tokens | Accesibilidad sin verse genérico |
| Iconos | lucide-react | Consistentes y livianos |
| Animación | framer-motion (transiciones cortas, 150–250 ms) | Micro-interacciones sin exceso |
| Estado | **Zustand** con persistencia en `localStorage` | Los datos sobreviven a recargar la página |
| "Tiempo real" simulado | **BroadcastChannel** entre pestañas del mismo navegador | Una pestaña como cliente y otra como mesero se actualizan al instante, sin servidor |
| QR | librería `qrcode` o `qrcode.react` | Generar el QR de cada mesa en el panel |
| Gráficas | Recharts | Panel de ventas y calificaciones |
| Fechas | date-fns con locale `es` | Formatos en español |

**Arquitectura:** toda la lógica de negocio va en una capa de dominio (`/lib/domain`) separada de la interfaz, con funciones puras: calcular recomendaciones, cambiar el estado del pedido, consolidar el ticket, validar franjas horarias. Así, más adelante se cambia el store local por Supabase sin reescribir las pantallas.

---

## 4. Dirección de diseño (para que NO se vea genérico)

**Concepto:** "la carta de un buen restaurante, en el celular". Cálido, editorial y limpio. Las fotos de la comida son el protagonista; la interfaz se aparta.

**Dos capas de marca:**

- **El restaurante** (Fogón 27) es lo que ve el cliente: su nombre, su color de acento y sus fotos.
- **Platterio** aparece discreto ("Hecho con Platterio" al pie del menú) y como marca propia en el panel administrativo.

El color de acento se define **por restaurante** con una variable CSS. Esto demuestra que el producto es configurable para otros negocios.

**Tokens iniciales** (Claude Code puede afinarlos, pero sin perder el carácter):

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#FAF7F2` | Fondo cálido (no blanco puro) |
| `--surface` | `#FFFFFF` | Tarjetas |
| `--ink` | `#1C1917` | Texto principal |
| `--muted` | `#78716C` | Texto secundario |
| `--line` | `#E7E2DA` | Bordes y divisores |
| `--accent` | `#E4572E` | Color del restaurante (configurable) |
| `--success` / `--warning` / `--danger` | `#2F855A` / `#B7791F` / `#C53030` | Estados |

- **Tipografía:** títulos con una serif editorial (por ejemplo Fraunces) y la interfaz con una sans legible (por ejemplo Inter). Precios con cifras tabulares.
- **Vista de cocina en modo oscuro**, con alto contraste y letra grande, pensada para leerse a distancia en un ambiente con luz fuerte.
- **Fotos:** imágenes reales de comida de bancos gratuitos (Unsplash o Pexels), guardadas en `/public/platos` y optimizadas con `next/image`. Si falta una foto, se muestra un respaldo elegante (degradado con la inicial del plato), nunca una imagen rota.

**Reglas anti-genérico:**

- Nada de "Lorem ipsum". Todo el texto va en español de Colombia, tuteando, con un tono cercano y concreto (por ejemplo, "Tu pedido está en la cocina", no "Estado: 2").
- Precios en formato colombiano: `$22.900`.
- Cada lista tiene diseñados sus estados **vacío, cargando (skeleton), sin resultados y error**.
- Confirmaciones y avisos con *toasts* y transiciones suaves, no con `alert()`.
- Picante con 0 a 3 íconos de llama; alérgenos como chips con ícono y texto (nunca solo color).
- Botones y zonas táctiles de al menos 44×44 px.
- No dejar el aspecto por defecto de shadcn: bordes, radios, sombras y tipografía salen de los tokens.

---

## 5. Mapa de rutas

| Ruta | Vista |
|---|---|
| `/` | **Hub de demo**: tarjetas para entrar como Cliente (Mesa 1–6), Mesero, Cocina o Administrador, más acceso al panel de control de demo |
| `/mesa/[numero]` | Entrada del cliente (lo que abre el QR) |
| `/mesa/[numero]/menu` | Menú: recomendados, categorías, buscador y filtros |
| `/mesa/[numero]/plato/[id]` | Ficha del plato |
| `/mesa/[numero]/carrito` | Carrito compartido de la mesa |
| `/mesa/[numero]/pedido` | Ticket de la mesa y estado del pedido |
| `/mesa/[numero]/calificar` | Calificar platos y servicio |
| `/mesero` | Mesas y tickets del mesero (selector de mesero al entrar) |
| `/cocina` | Tablero de cocina |
| `/admin` | Resumen (dashboard) |
| `/admin/platos` y `/admin/platos/[id]` | Gestión del catálogo |
| `/admin/recomendaciones` | Destacados y franjas horarias |
| `/admin/calificaciones` | Calificaciones y reseñas |
| `/admin/ventas` | Ventas y preferencias |
| `/admin/configuracion` | Mesas y QR, meseros, umbrales y tiempos |

No hay login real: el hub de demo reemplaza la autenticación.

---

## 6. Funcionalidades por vista

### 6.1 Cliente (celular)

| Funcionalidad | Qué debe hacer | Historia |
|---|---|---|
| Entrar por QR | Al abrir `/mesa/3` se abre (o se une a) la sesión de la mesa 3. Se muestra el nombre del restaurante y "Mesa 3". El cliente escribe un alias corto ("Ana") para identificar sus platos en el pedido grupal. | US-21 |
| Restricciones (opcional) | En la primera visita, una hoja inferior pregunta por alergias o dieta (lista fija de alérgenos). Se puede omitir y cambiar después. Se guarda por dispositivo. | US-16 |
| Recomendados | Carrusel al inicio con los recomendados de la franja actual ("Para el almuerzo"). Cada tarjeta lleva un motivo corto: "Popular a esta hora", "Mejor calificado", "Recomendado por la casa". No recomienda platos con alérgenos del cliente. | US-15, US-16, US-17 |
| Catálogo | Pestañas de categoría fijas arriba, lista de platos con foto, nombre, descripción corta, precio, picante y alérgenos. Los platos desactivados no aparecen. | US-13, US-14 |
| Buscador y filtros | Búsqueda por nombre o ingrediente. Filtros combinables: categoría, "sin" alérgenos y nivel de picante. Si no hay resultados: "No hay platos que coincidan con estos filtros" y un botón para limpiarlos. | US-13 |
| Ficha del plato | Galería de fotos, nombre, precio, descripción, selector de variante (sencilla/doble) con precio actualizado, ingredientes, alérgenos destacados, picante, calificación promedio con número de reseñas, botón deshabilitado "Vista 3D — próximamente" (solo en platos marcados con modelo), nota para cocina opcional, cantidad y "Agregar al pedido". Si el plato tiene un alérgeno del cliente: aviso visible, pero se puede agregar. | US-14, US-16 |
| Carrito compartido | Todos los celulares de la mesa ven el mismo carrito en tiempo real, con el nombre de quién agregó cada plato. Se puede cambiar cantidad o variante y eliminar los ítems propios. El total se recalcula al instante. Botón "Enviar pedido" deshabilitado si el carrito está vacío. | US-22, US-23 |
| Envío del pedido | El pedido se envía una sola vez y todos los celulares ven "Enviado — esperando confirmación del mesero". Si alguien agrega algo después, se crea una **nueva ronda** de la mesa. | US-22, US-23 |
| Ticket de la mesa | Todo lo pedido, agrupado por ronda y por comensal, con el total de la mesa. | US-24 |
| Estado del pedido | Línea de tiempo: Pendiente de confirmación → Confirmado → En preparación → Listo → Entregado. Si se rechaza, muestra "Rechazado" y el motivo. Si el mesero quita o cambia un ítem, aparece un aviso con el motivo. | US-29, US-26 |
| Calificar | Después de "Entregado" se habilita "Califica tu experiencia", con dos pasos separados: 1) estrellas y comentario opcional por cada plato pedido; 2) estrellas para el servicio, una sola vez por visita. | US-30, US-31 |

**Regla del pedido grupal (decisión para el mockup):** cualquier comensal de la mesa puede enviar el pedido, pero antes aparece una confirmación que muestra cuántos platos agregó cada uno ("Ana 2 · Luis 1 · ¿Enviar a la cocina?"). Esta regla estaba pendiente (impedimento del Daily 9); el mockup la deja implementada y fácil de cambiar.

### 6.2 Mesero (tablet / celular)

| Funcionalidad | Qué debe hacer | Historia |
|---|---|---|
| Elegir mesero | Al entrar se elige quién es (Carlos o Daniela). Solo ve sus mesas asignadas. | US-25 |
| Mapa de mesas | Cuadrícula de mesas con su estado: libre, con clientes, pedido pendiente (resaltado), en cocina, listo para entregar. | US-25 |
| Recibir y confirmar | Los tickets nuevos aparecen al instante (sonido suave opcional) con un contador de tiempo. Botones "Confirmar" (pasa a cocina) y "Rechazar" (pide un motivo). | US-25 |
| Ajustar ítems | Antes de confirmar puede quitar un ítem o cambiar su cantidad o variante, siempre con un motivo (lista rápida: "Agotado", "Cambio pedido por el cliente", "Otro"). El resto del ticket no cambia. | US-26 |
| Alerta sin confirmar | Si un pedido pasa del tiempo límite (3 min por defecto, configurable), la tarjeta se pone en alerta. Si pasa el doble del tiempo, se avisa también al administrador. | US-27 |
| Pedido listo | Cuando cocina marca "Listo", el mesero recibe un aviso y marca "Entregado". | US-28, US-29 |
| Liberar mesa | Al irse los clientes, "Liberar mesa" cierra la sesión; el siguiente escaneo abre una sesión nueva. | US-21 |

### 6.3 Cocina (tablet horizontal, modo oscuro)

| Funcionalidad | Qué debe hacer | Historia |
|---|---|---|
| Tablero | Tres columnas: **Confirmados · En preparación · Listos**. Solo aparecen pedidos confirmados por el mesero, en orden de llegada. | US-28 |
| Tarjeta de pedido | Número de mesa, ronda, ítems con cantidad, variante y notas para cocina bien visibles, y tiempo transcurrido (con cambio de color al pasar de cierto tiempo). | US-28 |
| Avanzar estado | Un toque mueve el pedido: Confirmado → En preparación → Listo. El cambio llega al instante al mesero y al cliente. | US-28, US-29 |

### 6.4 Administrador (escritorio)

| Funcionalidad | Qué debe hacer | Historia |
|---|---|---|
| Resumen | Tarjetas con ventas del día, pedidos del día, ticket promedio, calificación promedio de platos y de servicio; alertas activas; gráfica de pedidos por hora. | US-32, US-33 |
| Catálogo de platos | Tabla con buscador. Crear y editar la ficha: nombre, categoría, descripción, precio, variantes con precio propio, ingredientes (con descripción y alérgenos por ingrediente), picante (0–3), fotos, franjas horarias, activo/desactivado, destacado. Validación de campos obligatorios con mensajes claros. | US-11 |
| Modelo 3D | Campo para subir un archivo `.glb`: valida extensión y tamaño (máx. 4 MB) y muestra "Formato o tamaño no permitido (solo .glb hasta 4 MB)" si no cumple. Solo guarda el nombre y el tamaño del archivo (no hay visor). | US-12 |
| Recomendaciones | Marcar o quitar platos destacados. Gestionar franjas horarias (nombre, inicio, fin) sin permitir solapamientos ("Las franjas se solapan"). Vista previa de lo que verá el cliente en cada franja. | US-17, US-15 |
| Calificaciones y reseñas | Promedios de plato y de servicio por separado (últimos 7 días por defecto, con filtro de fechas), ranking de platos y comentarios del más reciente al más antiguo. | US-32 |
| Ventas y preferencias | Total vendido y número de pedidos por periodo, platos más pedidos por franja horaria, restricciones más registradas (agregadas, sin datos personales). "No hay datos para este periodo" si está vacío. | US-33 |
| Alertas de servicio | Si una mesa califica el servicio por debajo del umbral (3 estrellas por defecto), aparece una alerta destacada con la mesa, el mesero y la calificación. Canal WhatsApp visible como "próximamente". | US-34 |
| Configuración | Mesas (agregar o quitar) con su QR descargable, meseros y sus mesas asignadas, umbral de alerta de servicio, tiempo límite de confirmación y color de acento del restaurante. | US-21, US-27, US-34 |

---

## 7. Reglas de negocio

1. Ningún pedido llega a cocina sin la confirmación del mesero.
2. Estados del pedido: `pendiente → confirmado → en_preparacion → listo → entregado`, o `rechazado` (con motivo). El mesero marca "confirmado" y "entregado"; cocina marca "en preparación" y "listo".
3. Todos los celulares que escanean el QR de una mesa comparten una sola sesión y un solo carrito. La sesión se cierra cuando el mesero libera la mesa.
4. Cada envío es una ronda. Todas las rondas de una sesión forman un solo ticket de la mesa.
5. Todo ajuste o rechazo (de un ítem o del pedido completo) exige un motivo, y el cliente lo ve.
6. Las restricciones alimentarias **no bloquean**: el catálogo avisa; el recomendador no sugiere esos platos.
7. Solo se califican platos de pedidos entregados. Las estrellas son obligatorias y el comentario es opcional.
8. La calificación de servicio es una por visita y queda asociada al mesero de la mesa.
9. Campos obligatorios de un plato: nombre, precio, categoría, ingredientes y al menos una foto.
10. Las franjas horarias no pueden solaparse.
11. Un plato desactivado no se muestra ni se recomienda, pero conserva su información.
12. Las "ventas" se calculan con los pedidos entregados y sus precios (el MVP no procesa pagos).

---

## 8. Modelo de datos (TypeScript)

```ts
type Allergen = 'gluten' | 'lacteos' | 'huevo' | 'mani' | 'frutos_secos' | 'soya' | 'mariscos' | 'pescado';
type SpiceLevel = 0 | 1 | 2 | 3;
type OrderStatus = 'pendiente' | 'confirmado' | 'en_preparacion' | 'listo' | 'entregado' | 'rechazado';

interface Restaurant { id: string; name: string; accentColor: string; logoUrl?: string; serviceAlertThreshold: number; confirmTimeoutMin: number; }
interface Category { id: string; name: string; order: number; }
interface TimeSlot { id: string; name: string; start: string; end: string; } // "07:00"
interface Ingredient { name: string; description?: string; allergens: Allergen[]; }
interface Variant { id: string; name: string; price: number; }           // "Sencilla", "Doble"
interface Dish {
  id: string; name: string; description: string; categoryId: string;
  variants: Variant[];            // al menos una; el precio vive en la variante
  ingredients: Ingredient[];      // los alérgenos del plato se derivan de aquí
  spiceLevel: SpiceLevel; photos: string[]; timeSlotIds: string[];
  active: boolean; featured: boolean;
  model3d?: { fileName: string; sizeBytes: number }; // solo metadatos en el mockup
  createdAt: string;
}
interface Waiter { id: string; name: string; tableIds: string[]; }
interface Table { id: string; number: number; }
interface Diner { id: string; alias: string; deviceId: string; restrictions: Allergen[]; }
interface TableSession { id: string; tableId: string; openedAt: string; closedAt?: string; diners: Diner[]; cart: CartItem[]; }
interface CartItem { id: string; dishId: string; variantId: string; qty: number; note?: string; dinerId: string; }
interface OrderItem extends CartItem { removed?: boolean; adjustReason?: string; }
interface Order {                 // una ronda
  id: string; sessionId: string; tableId: string; round: number; items: OrderItem[];
  status: OrderStatus; rejectReason?: string;
  createdAt: string; confirmedAt?: string; readyAt?: string; deliveredAt?: string;
}
interface DishRating { id: string; dishId: string; orderId: string; stars: 1|2|3|4|5; comment?: string; createdAt: string; }
interface ServiceRating { id: string; sessionId: string; waiterId: string; stars: 1|2|3|4|5; createdAt: string; }
interface Alert { id: string; type: 'servicio_bajo' | 'sin_confirmar'; tableId: string; waiterId?: string; createdAt: string; resolved: boolean; }
```

---

## 9. Motor de recomendación (reglas ponderadas)

Por cada plato activo y sin alérgenos del cliente:

```
puntaje = 0.35 · franja + 0.25 · popularidad + 0.25 · calificación + 0.15 · destacado
```

- **franja:** 1 si el plato pertenece a la franja horaria actual, 0 si no.
- **popularidad:** unidades pedidas en los últimos 14 días en esa franja, normalizadas de 0 a 1.
- **calificación:** promedio bayesiano normalizado. `(C·m + suma_estrellas) / (C + n)`, con `m` el promedio global y `C = 5`, para que un plato con dos reseñas de 5 no le gane a uno con cien de 4,6.
- **destacado:** 1 si el administrador lo marcó.
- **Arranque en frío:** un plato sin pedidos ni calificaciones solo aparece si está destacado.
- Se muestran los 6 mejores, cada uno con el motivo principal de su puntaje ("Popular a esta hora", "Mejor calificado", "Recomendado por la casa").

Esta función debe ser pura y tener pruebas unitarias.

---

## 10. Tiempo real simulado y panel de demo

- Un único store (Zustand) con persistencia; cada cambio se transmite por `BroadcastChannel` para que las otras pestañas se actualicen al instante.
- Las transiciones de estado del pedido pasan por **una sola función** que valida cuál es el siguiente estado permitido (máquina de estados).
- **Panel de control de demo** (botón flotante discreto, o abrir `/?demo=1`):
  - **Hora simulada:** elegir Desayuno, Almuerzo, Tarde o Noche para mostrar cómo cambian las recomendaciones.
  - **Acelerar el tiempo** (×10) para que las alertas de "sin confirmar" se vean en segundos.
  - **Simular otro comensal** en la mesa, que agrega un plato al carrito compartido.
  - **Reiniciar datos** a su estado inicial.
- Para el pedido grupal real: abrir `/mesa/3` en dos pestañas o en dos celulares conectados al mismo navegador de demo.

---

## 11. Datos de prueba (restaurante ficticio "Fogón 27")

- **Franjas:** Desayuno 07:00–11:00 · Almuerzo 11:00–15:00 · Tarde 15:00–18:00 · Noche 18:00–23:00.
- **Mesas:** 1 a 6. **Meseros:** Carlos (mesas 1–3) y Daniela (mesas 4–6).
- **Historial sembrado:** 14 días de pedidos entregados, calificaciones y reseñas, para que el panel del administrador y el recomendador tengan datos desde el primer momento. Incluir dos o tres reseñas negativas y una alerta de servicio bajo sin resolver, para que la demo sea creíble.

| Categoría | Plato | Precio (COP) | Variantes | Picante | Alérgenos | Franjas |
|---|---|---|---|---|---|---|
| Desayunos | Calentado de la casa | 16.900 | — | 0 | huevo | Desayuno |
| Desayunos | Arepa rellena de huevo y queso | 9.900 | — | 0 | huevo, lácteos | Desayuno |
| Desayunos | Sándwich de desayuno | 13.900 | — | 0 | gluten, huevo, lácteos | Desayuno |
| Hamburguesas | Clásica 27 ⭐ (con modelo 3D) | 22.900 | Sencilla / Doble +7.000 | 0 | gluten, lácteos, huevo | Almuerzo, Noche |
| Hamburguesas | Brasa BBQ (con modelo 3D) | 27.900 | Sencilla / Doble +7.000 | 1 | gluten, lácteos | Almuerzo, Noche |
| Hamburguesas | La Diabla (con modelo 3D) | 26.900 | Sencilla / Doble +7.000 | 3 | gluten, lácteos, huevo | Noche |
| Hamburguesas | Pollo crispy | 23.900 | — | 1 | gluten, huevo | Almuerzo, Noche |
| Hamburguesas | Veggie de garbanzo | 24.900 | — | 0 | gluten, soya | Almuerzo, Noche |
| Perros | Perro de la casa | 15.900 | — | 0 | gluten, lácteos | Tarde, Noche |
| Perros | Perro suizo | 18.900 | — | 1 | gluten, lácteos | Tarde, Noche |
| Para compartir | Salchipapa 27 | 21.900 | Personal / Para compartir | 0 | lácteos | Tarde, Noche |
| Para compartir | Papas cheddar y tocineta | 16.900 | — | 0 | lácteos | Tarde, Noche |
| Para compartir | Alitas picantes | 24.900 | x8 / x12 +9.000 | 2 | gluten | Tarde, Noche |
| Para compartir | Nuggets de pollo | 17.900 | x10 | 0 | gluten, huevo | Tarde |
| Acompañamientos | Papas a la francesa | 7.900 | Pequeña / Grande +3.000 | 0 | — | Todas |
| Acompañamientos | Aros de cebolla | 8.900 | — | 0 | gluten, huevo | Almuerzo, Noche |
| Bebidas | Limonada de coco | 9.900 | — | 0 | — | Todas |
| Bebidas | Jugo natural en agua | 7.500 | Mora / Lulo / Mango | 0 | — | Todas |
| Bebidas | Gaseosa | 5.500 | 400 ml / 1,5 L +4.000 | 0 | — | Todas |
| Bebidas | Malteada de arequipe | 13.900 | — | 0 | lácteos | Tarde, Noche |
| Postres | Brownie con helado | 12.900 | — | 0 | gluten, huevo, lácteos, frutos secos | Tarde, Noche |
| Postres | Cheesecake de maracuyá | 11.900 | — | 0 | gluten, lácteos, huevo | Tarde, Noche |

⭐ = destacado por la casa al inicio. Cada plato debe tener una descripción de una o dos líneas, apetitosa y concreta, y sus ingredientes detallados (por ejemplo, Clásica 27: pan brioche, carne de res 150 g, queso cheddar, lechuga, tomate, cebolla caramelizada, salsa de la casa).

---

## 12. Requisitos no funcionales

| Tipo | Requisito |
|---|---|
| Responsive | Vista del cliente *mobile-first* y perfecta de 360 a 430 px. Mesero en tablet vertical y celular. Cocina en tablet horizontal (≥1024 px). Admin en escritorio (≥1280 px), usable en tablet. |
| Rendimiento | La primera carga del menú debe sentirse inmediata en un celular de gama media. Imágenes optimizadas y con carga diferida; nada de bloquear la interfaz. |
| Accesibilidad | Contraste WCAG AA, navegación con teclado en el panel, etiquetas en los formularios, alérgenos y estados comunicados con texto e ícono (no solo con color), zonas táctiles ≥ 44 px. |
| Idioma y formatos | Español (es-CO). Moneda `$22.900`, hora de 12 h con "a. m." / "p. m.", fechas como "lunes 28 de sept.". |
| Persistencia | Recargar la página no pierde el carrito, la sesión de mesa ni los pedidos. |
| Sincronización | Los cambios aparecen en las otras pestañas en menos de un segundo. |
| Calidad de código | TypeScript estricto, sin `any`, componentes pequeños, lógica de dominio en funciones puras con pruebas (recomendador, máquina de estados, validación de franjas, consolidación del ticket). ESLint y Prettier. |
| Despliegue | Debe compilar sin errores (`next build`) y poder publicarse en Vercel con un clic. |
| Extensibilidad | El acceso a datos pasa por una capa (`/lib/data`) para cambiar después a Supabase sin tocar las pantallas. El espacio del visor 3D queda como un componente vacío listo para conectar. |

---

## 13. Estados de interfaz obligatorios

- **Menú:** cargando (skeleton), sin resultados de búsqueda o filtros, categoría vacía.
- **Carrito:** vacío ("Tu mesa aún no ha pedido nada"), otro comensal agregando en vivo.
- **Pedido:** cada estado de la línea de tiempo, pedido rechazado con motivo, ítem ajustado con motivo.
- **Mesero:** sin mesas asignadas, sin pedidos pendientes ("Todo al día"), pedido en alerta.
- **Cocina:** columnas vacías con mensaje tranquilo.
- **Admin:** sin datos en el periodo, errores de validación en formularios, confirmación antes de desactivar un plato.

---

## 14. Trazabilidad: historia → pantalla

| Épica | Historias | Dónde se ve en el mockup |
|---|---|---|
| EPIC-01 Catálogo y contenido | US-11, US-12, US-13, US-14 | Admin › Platos · Cliente › Menú y ficha del plato |
| EPIC-02 Descubrimiento y recomendación | US-15, US-16, US-17 | Cliente › Recomendados y restricciones · Admin › Recomendaciones |
| EPIC-03 Visualización 3D | US-18, US-19, US-20 | **Fuera de este mockup** (espacio reservado en la ficha del plato) |
| EPIC-04 Pedidos | US-21, US-22, US-23, US-24 | Cliente › Entrada por QR, carrito compartido, ticket |
| EPIC-05 Servicio y confirmación | US-25 a US-29 | Mesero · Cocina · Cliente › Estado del pedido |
| EPIC-06 Reseñas, calificación y analítica | US-30 a US-34 | Cliente › Calificar · Admin › Resumen, calificaciones, ventas y alertas |

---

## 15. Plan de construcción por fases

Cada fase termina con algo que se puede abrir y probar.

| Fase | Contenido | Se acepta cuando… |
|---|---|---|
| 0. Base | Proyecto Next.js, tokens de diseño, tipografías, componentes base restilizados, tipos del modelo de datos, datos de prueba, store con persistencia y BroadcastChannel, hub de demo. | El hub abre y hay una página de muestra de componentes con el estilo final. |
| 1. Menú del cliente | Entrada por QR con alias, restricciones, recomendados por franja, categorías, buscador, filtros, ficha del plato con variantes. | Se navega todo el menú en un celular y los filtros combinados funcionan. |
| 2. Pedido | Carrito compartido en vivo, envío con confirmación, rondas, ticket de la mesa. | Dos pestañas de la misma mesa ven el mismo carrito y el envío crea una sola ronda. |
| 3. Mesero | Selector de mesero, mapa de mesas, confirmar, rechazar, ajustar ítems, alerta sin confirmar, entregar, liberar mesa. | Un pedido enviado desde el cliente aparece al instante en el mesero y la alerta salta con el tiempo acelerado. |
| 4. Cocina y estados | Tablero de cocina, avance de estados, línea de tiempo del cliente, aviso de "Listo" al mesero. | Un pedido recorre todos los estados y las tres vistas se actualizan solas. |
| 5. Calificaciones | Calificar platos y servicio, alerta de servicio bajo al admin. | Una calificación de 2 estrellas genera la alerta en el panel. |
| 6. Administrador | Resumen, catálogo (crear y editar con validaciones y el campo `.glb`), recomendaciones y franjas, calificaciones, ventas, configuración con QR. | Crear un plato nuevo lo muestra en el menú del cliente, y destacarlo lo pone en los recomendados. |
| 7. Pulido | Estados vacíos y de error, animaciones, accesibilidad, revisión en 360 px, `next build` limpio, guion de demo en el README. | Se puede hacer la demo completa (sección 16) sin tropiezos. |

---

## 16. Guion de demo para la sustentación (5 minutos)

1. Abrir el hub y, en el panel de demo, poner la hora en **Almuerzo**.
2. Pestaña A: entrar a **Mesa 3** como "Ana" y registrar alergia a lácteos. Ver que los recomendados cambian y que la ficha de la Clásica 27 muestra el aviso de lácteos.
3. Pestaña B: entrar a **Mesa 3** como "Luis". Cada uno agrega platos y ambos ven el carrito compartido en vivo. Luis envía el pedido.
4. Pestaña C (**Mesero** Carlos): llega el ticket consolidado. Quitar un ítem por "Agotado"; el cliente ve el aviso. Confirmar.
5. Pestaña D (**Cocina**): mover el pedido a "En preparación" y luego a "Listo". El cliente ve la línea de tiempo avanzar y el mesero recibe el aviso. El mesero marca "Entregado".
6. En la pestaña del cliente: calificar los platos y dar 2 estrellas al servicio.
7. Pestaña E (**Admin**): aparece la alerta de servicio bajo. Mostrar el resumen, las ventas por franja y las reseñas. Crear un plato nuevo, destacarlo y ver que aparece de primero en los recomendados del cliente.
8. Cerrar mostrando el botón "Vista 3D — próximamente" y explicando que es la siguiente épica (EPIC-03).

---

## 17. Prompt inicial para pegar en Claude Code

```
Lee completo BRIEF.md antes de escribir código. Vas a construir el mockup navegable de
Platterio descrito ahí: Next.js (App Router) + TypeScript estricto + Tailwind, sin backend,
con estado en Zustand persistido y sincronizado entre pestañas con BroadcastChannel.

Reglas:
- Trabaja por las fases de la sección 15, en orden. Antes de empezar cada fase, dime en
  pocas líneas qué vas a hacer; al terminarla, dime cómo probarla y espera mi visto bueno.
- El diseño tiene que verse como un producto real y cuidado, siguiendo la sección 4. Nada
  de apariencia de plantilla por defecto, nada de lorem ipsum, todo el texto en español
  de Colombia.
- La lógica de negocio (recomendador, estados del pedido, ticket, franjas) va en funciones
  puras dentro de /lib/domain, con pruebas.
- No implementes el visor 3D: deja el espacio reservado como dice la sección 2.
- Si algo del brief es ambiguo, propón una decisión razonable, anótala en DECISIONES.md
  y sigue.

Empieza por la Fase 0.
```
