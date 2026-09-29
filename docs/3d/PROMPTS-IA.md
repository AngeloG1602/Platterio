# Imágenes realistas con IA: serie de prompts

Mientras no haya producto real para fotografiar, estas imágenes se generan con IA. Hay tres
series, cada una con un fin distinto:

| Serie                          | Para qué                                                          | Formato                           | Dónde van                         |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------- | --------------------------------- |
| **A. Fotos del menú**          | La foto de cada plato en la carta                                 | 4:3 horizontal, 1200 px o más     | `public/platos/<id>.jpg`          |
| **B. Ingredientes para el 3D** | Convertir cada ingrediente en modelo 3D con una IA de imagen a 3D | 1:1, 2048 px, fondo blanco        | `modelos/fotos/<ingrediente>.png` |
| **C. Texturas**                | "Pegar" la foto real sobre las formas 3D actuales                 | 1:1, 2048 px, vista cenital plana | `public/texturas/<textura>.png`   |

La serie A se puede usar de inmediato: la app muestra sola cualquier foto que esté en
`public/platos/` con el nombre correcto. Las series B y C alimentan el visor 3D.

## Antes de empezar

- **Herramienta:** sirve cualquier generador actual: ChatGPT (imágenes), Gemini, Midjourney,
  Flux o Ideogram. Para las series B y C conviene uno que **edite con imagen de referencia**
  (ChatGPT o Gemini), porque así las piezas salen parecidas entre sí.
- **Los prompts van en inglés:** los generadores siguen mejor los términos de fotografía en
  inglés. Lo que va entre `[corchetes]` se cambia en cada prompt.
- **Consistencia:** cuando salga una imagen que les guste, úsenla de referencia para las
  demás. En Midjourney es `--sref <url>`; en ChatGPT o Gemini, adjúntenla y digan "match the
  lighting, background and style of the attached image". Generen varias opciones de cada una
  y quédense con la mejor.
- **Revisar contra la carta:** la IA a veces inventa ingredientes. Cada foto tiene que mostrar
  lo que dice la descripción, ni más ni menos, sobre todo por los alérgenos (que la Veggie no
  tenga queso, que la limonada de coco no parezca con leche).
- **Honestidad con los clientes:** son imágenes ilustrativas. Antes de usarlas con clientes
  reales, cámbienlas por fotos del producto o márquenlas como "imagen de referencia". El
  Estatuto del Consumidor (Ley 1480 de 2011) exige que la información sea veraz.

### Prompt negativo (para las herramientas que lo aceptan)

En Midjourney va con `--no`; en otras, en el campo "negative prompt".

```text
text, letters, logo, watermark, brand names, hands, people, cutlery in foreground, plastic look, CGI look, cartoon, illustration, oversaturated colors, extra ingredients, duplicated items, deformed food, blurry subject, frame, border
```

---

## Serie A · Fotos del menú (22 platos)

### Bloque de estilo A

Se pega al final de cada prompt de esta serie:

```text
Professional food photography for a restaurant menu app. Shot at a 45-degree angle with an 85mm lens, shallow depth of field, the dish sharp and centered with generous empty margin around it. Soft warm natural window light from the left, gentle realistic shadows. Appetizing but honest, true-to-life portion, real texture visible (crumbs, grill marks, melted cheese, glossy sauce). Served on a matte off-white ceramic plate on a dark walnut wood table, softly blurred warm cream background. Natural colors, not oversaturated. Horizontal 4:3, high resolution. No text, no logos, no people, no hands.
```

Para bebidas y postres se cambia "on a matte off-white ceramic plate" por lo que diga el
prompt (vaso, copa, plato de postre).

### Desayunos

**calentado-de-la-casa**

```text
A Colombian "calentado" breakfast: red beans and white rice sautéed together with hogao (a tomato and scallion sofrito), topped with a sunny-side-up fried egg with a bright runny yolk, a grilled chorizo sliced in half, and a small grilled white corn arepa with light char marks on the side. [BLOQUE DE ESTILO A]
```

**arepa-rellena**

```text
A thick white corn arepa grilled on a flat-top with light char marks, split open like a pocket and stuffed with soft scrambled eggs and fresh white farmer's cheese (queso campesino) melting and oozing out of the side. [BLOQUE DE ESTILO A]
```

**sandwich-de-desayuno**

```text
A breakfast sandwich on thick toasted artisan bread, filled with a fried egg with a runny yolk, sliced cooked ham and gratinated melted mozzarella, cut diagonally in half to show the layers, the two halves slightly offset. [BLOQUE DE ESTILO A]
```

### Hamburguesas

**clasica-27**

```text
A classic cheeseburger shown alone: a glossy golden-brown brioche bun with a few sesame seeds, a thick grilled beef patty with a dark seared crust, a slice of cheddar melted and draping over the edges, caramelized onions, one fresh green lettuce leaf, a slice of ripe red tomato and a creamy light house sauce. Stacked neatly, slightly taller than wide. [BLOQUE DE ESTILO A]
```

**brasa-bbq**

```text
A smoky BBQ burger: a soft pale-golden potato bun, a flame-grilled beef patty with visible char, two strips of crispy smoked bacon, a slice of melted provolone, a small nest of crispy fried onion strings on top, and a glossy dark panela BBQ sauce with a hint of chipotle dripping down one side. [BLOQUE DE ESTILO A]
```

**la-diabla**

```text
A spicy burger: a glossy brioche bun, a thick grilled beef patty, a slice of melted pepper jack cheese with visible red and green pepper flecks, pickled green jalapeño slices, a smear of orange chipotle mayonnaise and a drizzle of bright red-orange habanero sauce. One fresh red chili next to the plate as a hint of heat. [BLOQUE DE ESTILO A]
```

**pollo-crispy**

```text
A crispy chicken sandwich: a large golden panko-breaded fried chicken breast with a craggy crunchy coating, sticking out slightly past a soft brioche bun, topped with bright pickled purple and white cabbage slaw and a light orange lightly spicy mayonnaise. [BLOQUE DE ESTILO A]
```

**veggie-de-garbanzo**

```text
A vegan burger with no cheese: a whole wheat bun with oats on top, a golden seared chickpea and quinoa patty with visible grains and herbs, ripe avocado slices, a handful of fresh arugula and a creamy white vegan mayonnaise. Fresh and green-looking. [BLOQUE DE ESTILO A]
```

### Perros

**perro-de-la-casa**

```text
A Colombian-style hot dog: a long soft bun with a grilled American sausage, covered with gratinated melted mozzarella, a generous layer of crunchy thin potato sticks (papa ripio) on top and a drizzle of golden pineapple sauce. [BLOQUE DE ESTILO A]
```

**perro-suizo**

```text
A gourmet hot dog: a long soft bun with a thick smoked Swiss sausage with grill marks, wrapped with crispy bacon, topped with gratinated melted Colombian double-cream cheese (queso doble crema) and a few drops of red homemade chili sauce (ají). [BLOQUE DE ESTILO A]
```

### Para compartir

**salchipapa-27**

```text
A Colombian "salchipapa" for sharing: a generous mound of golden French fries mixed with sliced browned ranchera sausage, topped with finely grated white coastal cheese (queso costeño) and zigzag drizzles of pink sauce and yellow mustard. Served on a wide shallow plate. [BLOQUE DE ESTILO A]
```

**papas-cheddar-tocineta**

```text
Rustic skin-on potato wedges covered in hot, glossy, flowing cheddar cheese sauce, topped with crispy bacon bits and freshly chopped chives. Served in a shallow bowl. [BLOQUE DE ESTILO A]
```

**alitas-picantes**

```text
Eight crispy chicken wings coated in a glossy red-orange buffalo sauce, with fresh celery sticks and carrot sticks on the side of the plate. [BLOQUE DE ESTILO A]
```

**nuggets-de-pollo**

```text
Ten golden panko-breaded chicken breast nuggets, crunchy and irregular like homemade, with a small ramekin of honey mustard sauce. [BLOQUE DE ESTILO A]
```

### Acompañamientos

**papas-a-la-francesa**

```text
Golden crispy French fries, freshly fried, standing in a plain brown kraft paper cup with no printing, a few fries fallen on the plate, light sprinkle of salt. [BLOQUE DE ESTILO A]
```

**aros-de-cebolla**

```text
Beer-battered onion rings, thick, golden and crunchy with an irregular batter, stacked loosely, with a small ramekin of dark BBQ sauce for dipping. [BLOQUE DE ESTILO A]
```

### Bebidas

**limonada-de-coco**

```text
A tall glass of Colombian coconut lemonade: creamy, pale ivory-green and frothy, blended with crushed ice, a lime wheel on the rim, condensation drops on the glass, on a dark walnut wood table. Dairy-free, fresh and cold. [BLOQUE DE ESTILO A]
```

**jugo-natural**

```text
Three glasses of fresh Colombian fruit juice blended with water, side by side: deep purple blackberry (mora), golden-green lulo, and bright orange mango, each with a little foam on top and condensation drops, a few whole fruits next to them. [BLOQUE DE ESTILO A]
```

**gaseosa**

```text
An unbranded glass soda bottle with no label, next to a glass of dark cola with ice cubes and bubbles, condensation drops, cold and refreshing, on a dark walnut wood table. No logos. [BLOQUE DE ESTILO A]
```

**malteada-de-arequipe**

```text
A thick milkshake made with vanilla ice cream and arequipe (Colombian dulce de leche) in a tall glass, caramel-colored, topped with a swirl of whipped cream and a drizzle of arequipe running down the inside of the glass, a paper straw. [BLOQUE DE ESTILO A]
```

### Postres

**brownie-con-helado**

```text
A warm chocolate brownie with walnuts, a scoop of vanilla ice cream starting to melt on top, and hot chocolate sauce poured over it, served on a small dessert plate. [BLOQUE DE ESTILO A]
```

**cheesecake-de-maracuya**

```text
A slice of creamy baked cheesecake on a golden cookie crumb base, topped with a bright yellow passion fruit (maracuyá) sauce with its black seeds, dripping slightly over the edge, on a small dessert plate. [BLOQUE DE ESTILO A]
```

---

## Serie B · Ingredientes para convertir en 3D

Cada ingrediente va **solo, completo y sobre fondo blanco**. Así lo piden las herramientas de
imagen a 3D (Tripo, Meshy, Hunyuan3D…). El resultado es un `.glb` por ingrediente, y el visor
los apila y arma cualquier combinación de la carta.

### Paso 0 · Referencia maestra (recomendado)

Primero se genera la hamburguesa "despiezada", para que todos los ingredientes salgan con el
mismo estilo. Después se le pide a la IA que extraiga cada pieza de esta imagen.

```text
Exploded view of a gourmet burger with every ingredient floating separately in a vertical stack with even gaps, from bottom to top: brioche bottom bun, creamy house sauce, green lettuce leaf, tomato slice, thick seared beef patty, slice of melted cheddar, caramelized onions, brioche top bun with a few sesame seeds. Pure white background, soft even studio lighting, everything in sharp focus, photorealistic real food, front view slightly from above. Square 1:1. No text.
```

Con esa imagen adjunta, cada ingrediente se pide así:

```text
Using the attached image as reference, show only the [ingrediente] on its own, exactly as it looks in the reference (same color, texture and size). [BLOQUE DE ESTILO B]
```

### Bloque de estilo B

```text
Single isolated food item, product photography for 3D reconstruction. Three-quarter view from slightly above (about 30 degrees). The whole object fully visible and centered, with about 15% empty margin, nothing cropped. Pure white seamless background, soft even diffuse studio lighting from all sides, only a faint soft shadow, no harsh highlights or reflections. Everything in sharp focus (deep depth of field), photorealistic real food texture. True scale for a 12 cm burger. No plate, no props, no other ingredients, no text. Square 1:1, high resolution.
```

### Panes

Cada pan tiene dos piezas, tapa y base, porque en el 3D se separan.

| Archivo               | Prompt (+ bloque B)                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pan_brioche_tapa`    | `The top half of a brioche burger bun, 12 cm wide, glossy golden-brown egg-washed dome with a few sesame seeds, flat cut side facing down.`     |
| `pan_brioche_base`    | `The bottom half of a brioche burger bun, 12 cm wide, cut side facing up showing soft lightly toasted crumb, golden crust on the sides.`        |
| `pan_papa_tapa`       | `The top half of a soft potato burger bun, 12 cm wide, smooth pale-golden slightly shiny crust, no seeds, flat cut side facing down.`           |
| `pan_papa_base`       | `The bottom half of a soft potato burger bun, 12 cm wide, cut side facing up showing soft yellowish crumb.`                                     |
| `pan_sin_gluten_tapa` | `The top half of a gluten-free burger bun, 12 cm wide, denser, light beige matte crust with small cracks, no seeds, flat cut side facing down.` |
| `pan_sin_gluten_base` | `The bottom half of a gluten-free burger bun, 12 cm wide, cut side facing up showing a dense fine crumb.`                                       |
| `envoltura_lechuga`   | `Three large crisp iceberg lettuce leaves layered into a cup shape, used as a burger wrap instead of bread, 14 cm wide.`                        |

### Proteínas

| Archivo             | Prompt (+ bloque B)                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `carne_res`         | `A thick grilled beef burger patty, 12.5 cm wide and 2 cm thick, dark seared crust with grill texture, juicy, slightly irregular edges.` |
| `pollo_plancha`     | `A grilled chicken breast fillet pounded flat to burger size, 12 cm, golden with dark grill marks, juicy.`                               |
| `medallon_garbanzo` | `A round chickpea and quinoa veggie patty, 12 cm, golden seared crust, visible chickpeas, quinoa grains and green herbs.`                |
| `pollo_crispy`      | `A large panko-breaded fried chicken breast, golden, craggy and crunchy coating, irregular shape about 14 cm.`                           |
| `tocineta`          | `Two strips of crispy smoked bacon, cooked and wavy, clear stripes of lean meat and rendered fat, about 13 cm long.`                     |
| `huevo_frito`       | `A sunny-side-up fried egg, round about 11 cm, bright glossy yolk in the center, slightly crispy lacy golden edges.`                     |

### Quesos

Las láminas se piden "suavizadas" para que caigan por el borde como en la hamburguesa.

| Archivo             | Prompt (+ bloque B)                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `queso_cheddar`     | `A square slice of orange cheddar cheese, 9 cm, slightly softened by heat, corners gently curling downward.`          |
| `queso_provolone`   | `A round slice of pale yellow provolone cheese, 11 cm, slightly softened by heat, edges gently drooping.`             |
| `queso_pepper_jack` | `A square slice of pepper jack cheese, 9 cm, pale ivory with visible red and green pepper flecks, slightly softened.` |
| `queso_vegano`      | `A square slice of plant-based vegan cheese, 9 cm, smooth matte pale ivory, slightly softened, corners curling down.` |

### Vegetales y adicionales

| Archivo                | Prompt (+ bloque B)                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `lechuga`              | `A single fresh green leaf lettuce leaf, crisp, ruffled wavy edges, lying almost flat and slightly curved, about 14 cm.`  |
| `tomate`               | `A single round slice of ripe red tomato, 7 cm wide and 7 mm thick, seed chambers with jelly and seeds clearly visible.`  |
| `cebolla_caramelizada` | `A small flat round heap of caramelized onion strands, glossy amber brown, spread in a circle about 9 cm.`                |
| `cebolla_morada`       | `Thin rings of raw red onion, separated and loosely scattered in a circle about 9 cm, purple edges and white layers.`     |
| `cebolla_crocante`     | `A small flat round pile of crispy fried onion strings, golden brown and crunchy, about 9 cm.`                            |
| `aguacate`             | `Four slices of ripe avocado fanned out, bright green fading to yellow-green near the pit side, dark green skin removed.` |
| `jalapenos`            | `A small scatter of pickled green jalapeño rings with seeds, glossy, in a circle about 8 cm.`                             |

### Acompañantes

| Archivo         | Prompt (+ bloque B)                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `papas_vaso`    | `Golden crispy French fries standing in a plain brown kraft paper cup with no printing, about 9 cm tall cup.`       |
| `aros_cebolla`  | `Four beer-battered onion rings loosely stacked, thick golden crunchy irregular batter.`                            |
| `ensalada`      | `A small round white ceramic bowl of fresh house salad: mixed green leaves, cherry tomatoes, thin cucumber slices.` |
| `papas_cheddar` | `Golden French fries in a plain brown kraft paper cup, topped with glossy melted cheddar cheese sauce.`             |

Las salsas **no se generan**: son casi planas y brillantes, y hechas con código ya se ven bien.

### Más vistas del mismo ingrediente (opcional)

Algunas herramientas (Tripo, Meshy) arman mejor el 3D si reciben 3 o 4 vistas del mismo
objeto. Con la imagen buena adjunta:

```text
Using the attached image, show exactly the same [ingrediente] from [the side at eye level | directly above | the back], with the same lighting, the same white background, the same scale and every detail identical. Do not change the object.
```

---

## Serie C · Texturas para las formas 3D actuales

Esta serie sirve para el camino rápido: las formas que ya tiene el visor quedan con la foto
"pegada" encima. Hay dos tipos: fotos cenitales de la pieza completa y texturas que se
repiten en mosaico sin costuras.

### Bloque de estilo C

```text
Straight top-down orthographic view at exactly 90 degrees, no perspective. Perfectly flat, even, shadowless diffuse lighting like a flatbed scanner, no specular highlights, no reflections, no vignette. Everything in sharp focus. Only the true color and surface detail of the food, photorealistic. Square 1:1, 2048 x 2048 px. No text.
```

### Cenitales de la pieza completa (centrada, fondo blanco puro, ocupando el 90 % del cuadro)

| Archivo               | Prompt (+ bloque C)                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tapa_brioche_arriba` | `The round top of a golden-brown brioche burger bun seen from directly above, with a few sesame seeds, on pure white.`                               |
| `miga_pan`            | `The flat cut face of a halved brioche bun seen from directly above: soft pale crumb with small air pockets, thin golden crust ring, on pure white.` |
| `carne_arriba`        | `A seared beef burger patty seen from directly above, dark brown crust with grill texture, on pure white.`                                           |
| `cheddar_arriba`      | `A square slice of orange cheddar seen from directly above, lying flat, on pure white.`                                                              |
| `lechuga_arriba`      | `A fresh green lettuce leaf spread flat seen from directly above, veins clearly visible, on pure white.`                                             |
| `tomate_arriba`       | `A round slice of ripe red tomato seen from directly above, seed chambers visible, on pure white.`                                                   |
| `huevo_arriba`        | `A sunny-side-up fried egg seen from directly above, round, yolk centered, on pure white.`                                                           |

### Mosaicos sin costuras

En Midjourney se agrega `--tile`. En las demás herramientas, el prompt ya pide el mosaico,
pero hay que revisar que los bordes empaten: la imagen se desplaza a la mitad y se mira si
queda una línea. Si falla, yo la puedo corregir con un script.

| Archivo         | Prompt (+ bloque C)                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `costra_pan`    | `Seamless tileable texture of golden-brown brioche bread crust, fine egg-wash sheen, subtle cracks.` |
| `miga_mosaico`  | `Seamless tileable texture of soft white bread crumb, small irregular air pockets.`                  |
| `carne_mosaico` | `Seamless tileable texture of seared ground beef surface, dark caramelized crust, juicy.`            |
| `madera_mesa`   | `Seamless tileable texture of dark walnut wood table planks, natural grain, matte oiled finish.`     |
| `papel_kraft`   | `Seamless tileable texture of plain brown kraft paper, fine fibers, no printing.`                    |

---

## Qué sigue cuando tengan las imágenes

1. **Serie A:** se guardan en `public/platos/` con el id del plato (`clasica-27.jpg`…) y la
   app las muestra sola. Es lo que más cambia la carta con menos trabajo.
2. **Serie B:** cada imagen se sube a una herramienta de imagen a 3D (Tripo, Meshy o
   Hunyuan3D) y se descarga en `.glb`. Se puede probar de una vez en el laboratorio, en la
   pestaña "Probar un .glb". Con los archivos, yo los optimizo (bajan de 20–50 MB a 1–3 MB),
   les pongo los nombres que espera el visor y los conecto a la personalización.
3. **Serie C:** yo conecto las texturas a las formas actuales y las comparamos en el
   laboratorio con la versión procedural.

Para el piloto basta con la Clásica 27: la foto A, los siete ingredientes de la serie B
(`pan_brioche_tapa`, `pan_brioche_base`, `carne_res`, `queso_cheddar`, `lechuga`, `tomate`,
`cebolla_caramelizada`) y las papas en vaso.
