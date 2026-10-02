# Platos reales en 3D, para cualquier restaurante

Cómo pasar de "el menú de un restaurante" a "sus platos en 3D, realistas y personalizables",
de forma que se pueda repetir con cada cliente y con cualquier tipo de plato.

## 1. Qué hizo el proyecto del modelo de Sketchfab

El modelo "Hamburguesa Explosiva Con Queso" se diseñó así:

- **Una sola malla** de ~18 mil triángulos para toda la hamburguesa.
- **Un hueso por ingrediente**, con el que se anima la separación (abrir, "big bang").
- **Una sola textura "atlas"**: una imagen de 2048 px donde está "desdoblada" la piel de cada
  ingrediente: pan, carne, queso, rodaja de tomate, aro de cebolla, pepinillo, hoja de lechuga.
  Cada pieza 3D toma su parte de esa imagen.
- Las texturas están **pintadas a mano**, no son fotos. Por eso se ve bonito pero un poco
  "ilustrado".

La idea que vale la pena copiar: **una pieza por ingrediente, un solo material y una sola
imagen**. Así pesa poco (1,4 MB comprimido), se dibuja rápido y cada ingrediente se puede
mover, ocultar o repetir.

## 2. Cómo lo hace Platterio: el "paquete 3D" de cada plato

Cada plato del menú tiene dos cosas:

1. **Su personalización**, que es la fuente de verdad: ranuras (pan, carne, queso…),
   opciones de reemplazo, extras, precios y alérgenos (`lib/data/customization-specs.ts`).
   Esto ya mueve precio, alérgenos, carrito y comanda de cocina, con o sin 3D.
2. **Su modelo 3D** (opcional): un `.glb` con **un nodo por ingrediente**, nombrado con la
   convención de abajo. El visor lo lee y relaciona cada nodo con su ranura.

Lo que el modelo no traiga (un reemplazo, un adicional) se dibuja con la versión hecha con
código. Así un plato funciona desde el primer día y gana realismo a medida que llegan piezas.

### Dos formas de armar el plato

| Forma     | Para                                              | Cómo se ve                                                                                  |
| --------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Pila**  | Hamburguesas, sándwiches, perros, arepas rellenas | Capas de abajo hacia arriba. "Separar" las abre en vertical.                                |
| **Plato** | Platos a la carta: calentado, bandeja, churrasco… | Cada componente en su lugar del plato. "Separar" los levanta y abre. Lo de encima sube más. |

En el laboratorio, la Clásica 27 va en pila y el **Calentado de la casa** en plato (fríjoles
y arroz, huevo encima, chorizo, arepa; aguacate y maduro como adicionales). El lugar de cada
componente está en `lib/viewer3d/layouts.ts`.

### Convención de nombres de los nodos

| Nombre del nodo        | Qué es                                         |
| ---------------------- | ---------------------------------------------- |
| `carne` o `carne_1`    | El ingrediente tal como viene (ranura `carne`) |
| `carne@pollo`          | La carne reemplazada por la opción `pollo`     |
| `pan_base`, `pan_tapa` | Las dos mitades del pan                        |
| `pan_base@pan_papa`    | La base del pan cuando se cambia a pan de papa |

Las claves (`carne`, `pollo`, `pan_papa`…) son las de la personalización del plato. Si el
modelo trae dos unidades (`carne_1`, `carne_2`), basta con una: los extra se repiten solos.

En **"Probar un .glb"** del laboratorio, al subir un modelo se escoge el plato y aparece:

- qué ingredientes y opciones tienen pieza real;
- qué nodos no se reconocen, para renombrarlos;
- el botón **"Probar en el personalizador"**, que lo muestra de una vez en su plato.

## 3. Cómo conseguir los modelos de los platos de un cliente

Cada ingrediente y cada opción de reemplazo es una pieza. La lista sale directamente de la
personalización del plato (el validador la muestra). Tres caminos, de más a menos control:

| Camino                                        | Realismo           | Lo bueno                                                      | Lo difícil                                   |
| --------------------------------------------- | ------------------ | ------------------------------------------------------------- | -------------------------------------------- |
| **Modelador 3D** con fotos de referencia      | Alto y parejo      | Piezas limpias, livianas, nombradas como pedimos; atlas único | Costo por plato; hay que darle buenas fotos  |
| **Fotogrametría** (escanear cada ingrediente) | El más fotográfico | Es la comida real del cliente                                 | Sesión de captura; brillos y hojas salen mal |
| **IA de imagen a 3D** + retoque               | Variable           | Rápido y barato para probar                                   | Formas raras; casi siempre necesita retoque  |

**Recomendación:** fotogrametría o fotos reales del cliente como base, y un modelador que
limpie, nombre los nodos y una todo en un atlas. Para el primer cliente, conviene cotizar con
dos o tres modeladores con un plato de prueba antes de comprometer la carta entera.

### Lo que hace que se vea real

- **Texturas sacadas de fotos** del plato del cliente (color, relieve y rugosidad), no pintadas.
- **Escala real**: el pan de 12 cm, la carne de 2 cm. El visor normaliza, pero las
  proporciones entre piezas las pone el modelo.
- **La luz del visor** ya es realista: HDRI de estudio, sombras suaves y oclusión ambiental.
- **Pocos triángulos bien puestos** (10–40 mil por plato) y texturas de 2048 px o menos. Más
  no se nota en un celular y sí lo vuelve lento.

### Qué pedirle al cliente o al fotógrafo

- **Cada plato armado:** de frente, de lado y desde arriba, sobre fondo neutro.
- **Cada ingrediente por separado:** desde arriba y de lado, con una regla o una moneda para
  la escala.
- **Las opciones de reemplazo**: pan de papa, pollo, queso vegano…
- **Luz pareja**, sin flash.

## 4. Flujo para cada restaurante

1. **Menú y personalización:** se cargan los platos y, para los que se pueden personalizar,
   sus ranuras, opciones, precios y alérgenos. Esto funciona sin 3D.
2. **Lista de piezas:** sale de la personalización, una por ranura y por opción.
3. **Captura y modelado:** fotos o escaneo, luego el modelador. Se entrega un `.glb` con un
   nodo por pieza, nombrado con la convención.
4. **Preparación:** si el modelo viene con esqueleto (como el de Sketchfab),
   `npm run modelos:separar -- <entrada.glb> <salida.glb>` lo parte y lo comprime. Si viene
   por partes, solo hay que comprimirlo.
5. **Validación** en "Probar un .glb": cobertura completa y ningún nodo sin reconocer.
6. **Registro:** se agrega en `lib/viewer3d/real-models.ts` (plato, archivo y crédito si
   aplica). En el producto real esto lo haría el administrador al subir el archivo.

## 5. Cómo se integraría al menú (cuando se decida)

Hoy todo vive en `/laboratorio/3d` y no toca la app. La integración propuesta:

- **En la ficha del plato**, el botón "Vista 3D" abre el visor con la personalización al lado,
  la misma del laboratorio.
- **Al agregar al carrito**, la personalización viaja con el ítem:
  - el precio con extras (`priceDelta`);
  - los alérgenos resultantes;
  - las líneas para la cocina (`SIN Cebolla`, `EXTRA Queso`, `CAMBIAR Pan brioche → Pan de
papa`).

  El ticket, el mesero y el tablero de cocina ya muestran texto; solo hay que guardar esas
  líneas en el ítem.

- **En el panel del administrador**, al crear o editar un plato:
  - se define su personalización;
  - se sube su `.glb`, con la misma validación de cobertura del laboratorio.
- **Archivos:** los modelos irían a un almacenamiento con CDN (por ejemplo, Supabase Storage)
  y se descargan solo al abrir la vista 3D.

## 6. Qué hay hoy en el laboratorio y qué falta

Hecho:

- Hamburguesas en pila y el Calentado en plato.
- Modelo real de la Clásica 27, con tintes para variantes.
- Convención de nombres, validador de cobertura y "Probar en el personalizador".
- Script para partir modelos con esqueleto.

Falta:

- Modelos reales de los demás platos y de las opciones sin pieza (pan de papa, pollo,
  tocineta…).
- Que el huevo se acomode a la forma del arroz; hoy va plano encima.
- La integración al menú descrita arriba.
