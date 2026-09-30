# Platos en 3D y personalización: propuesta

> Trabajo en paralelo, en la rama `claude/sweet-ride-idu644`. **No está en producción**: vive en
> la ruta `/laboratorio/3d`, que no tiene enlaces desde la app. Si Vercel despliega la rama, se
> puede abrir en su enlace de vista previa (`…-git-claude-sweet-rid-…vercel.app/laboratorio/3d`).

## 1. Qué hay en el prototipo

| Pieza                  | Qué hace                                                                                                                                                                                    | Dónde                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Visor 3D               | Hamburguesa en 3D sobre un plato, con acompañante al lado. Girar, acercar, giro automático, etiquetas.                                                                                      | `components/viewer3d/`                     |
| Despiece               | Un control separa las capas para ver cada ingrediente, con su nombre.                                                                                                                       | `lib/viewer3d/stack.ts`                    |
| Tocar un ingrediente   | Muestra nombre, descripción y alérgenos, y deja quitarlo, pedir extra o reemplazarlo ahí mismo.                                                                                             | `components/lab/lab-3d.tsx`                |
| Personalización        | Quitar, extra, reemplazar, adicionales (tocineta, huevo, aguacate, jalapeños) y cambio de acompañante. Recalcula precio, alérgenos, el resumen para el carrito y las líneas para la cocina. | `lib/domain/customization.ts` (20 pruebas) |
| Adaptar a mis alergias | Marca tus alergias y el plato se adapta solo: por ejemplo, sin lácteos → pan de papa y queso vegano. Avisa si algo no se puede evitar.                                                      | `adaptToRestrictions`                      |
| Plantilla .glb         | Exporta el plato actual como archivo 3D con un nodo por ingrediente (`pan_base`, `carne_1`, `queso_1`…), para que el modelador la use de referencia.                                        | `components/viewer3d/export-glb.ts`        |
| Probar un .glb         | Sube cualquier modelo: lo centra, lista sus partes (mallas, triángulos, peso), permite ocultarlas y separarlas. Sirve para evaluar escaneos antes de integrarlos.                           | `components/viewer3d/glb-scene.tsx`        |

Los tres platos del prototipo son los que ya tenían modelo 3D en el brief: Clásica 27, Brasa BBQ y
La Diabla, en Sencilla y Doble (la Doble apila dos carnes).

El modelo 3D del prototipo es **procedural**: está hecho con código, capa por capa, sin archivos.
Por eso ya se puede separar y cambiar ingrediente por ingrediente. Un modelo real se conecta con
la misma estructura (sección 4).

## 2. Qué podemos hacer (de menos a más)

1. **Personalización sin 3D.** Quitar, extra, reemplazar y acompañante en la ficha del plato, con
   precio, alérgenos y comanda. Es lo de más valor y no depende de tener modelos. _Recomendado
   como primer paso._
2. **Vista 3D del plato.** El botón "Vista 3D — próximamente" abre el visor (girar y acercar). Se
   carga solo al tocarlo.
3. **Despiece e información por ingrediente.** Separar capas y tocar cada ingrediente para ver sus
   alérgenos. Ayuda a decidir, que es el problema 1 del brief.
4. **Personalizar sobre el 3D.** Lo del laboratorio: el modelo cambia en vivo al quitar o
   reemplazar.
5. **Adaptar a mis alergias.** Conecta con las restricciones que el cliente ya marca al entrar.
6. **Más adelante: realidad aumentada** (ver el plato sobre la mesa). El mismo `.glb` sirve con
   `<model-viewer>` en Android y con Quick Look en iPhone (este necesita una versión `.usdz`).

## 3. Three.js en 5 minutos

Three.js dibuja 3D en el navegador con WebGL. Las piezas básicas son:

- **Escena:** el mundo donde se pone todo.
- **Cámara:** desde dónde se mira; usamos una de perspectiva.
- **Malla (mesh):** una **geometría** (la forma) más un **material** (color, brillo, textura).
- **Luces:** sin luz, los materiales realistas se ven negros.
- **Renderer:** pinta la escena en un `<canvas>` 60 veces por segundo.
- **Controles:** `OrbitControls` deja girar y acercar con el dedo o el mouse.

En React usamos **React Three Fiber**, que permite escribir Three.js como componentes, y **drei**,
que trae piezas listas: controles, sombras, etiquetas HTML y cargador de `.glb`. Un ejemplo
mínimo:

```tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export function Visor() {
  return (
    <Canvas camera={{ position: [10, 8, 12], fov: 32 }}>
      <hemisphereLight intensity={0.7} />
      <directionalLight position={[7, 14, 9]} intensity={1.6} />
      <mesh>
        {" "}
        {/* una "carne": cilindro café */}
        <cylinderGeometry args={[4.6, 4.6, 0.75, 64]} />
        <meshStandardMaterial color="#5A3121" roughness={0.95} />
      </mesh>
      <OrbitControls />
    </Canvas>
  );
}
```

Cargar un modelo real y ocultar un ingrediente por nombre:

```tsx
import { useGLTF } from "@react-three/drei";

function Plato({ quitar }: { quitar: string[] }) {
  const { scene } = useGLTF("/modelos/clasica-27.glb", "/draco/");
  scene.traverse((nodo) => {
    if (quitar.includes(nodo.name)) nodo.visible = false; // p. ej. "cebolla_1"
  });
  return <primitive object={scene} />;
}
```

Dónde está cada cosa en el repositorio:

- `components/viewer3d/geometry.ts`: formas de cada ingrediente (pan con domo, carne irregular, queso que se derrite, lechuga ondulada…).
- `components/viewer3d/ingredient-mesh.tsx`: una capa, su animación y el resaltado al tocarla.
- `components/viewer3d/dish-scene.tsx`: escena, luces, plato, cámara y etiquetas.
- `lib/viewer3d/stack.ts`: de la personalización salen las capas en orden (función pura, probada).

## 4. Cómo tener los platos reales en 3D

> **Ya probado con un modelo real:** "Hamburguesa Explosiva Con Queso" de Roberto Domínguez (Sketchfab, CC BY 4.0).
> Venía en una sola malla con un hueso por ingrediente, como la mayoría de los modelos "explosivos". `npm run modelos:separar -- <entrada.glb> <salida.glb>` la parte en un nodo por ingrediente (`pan_base`, `carne_1`, `queso_1`, `salsa_1`, `mostaza_1`, `lechuga_1`, `pepinillo_1`, `tomate_1`, `cebolla_1`, `pan_tapa`), pasa el material a metal/rugosidad y lo comprime: de 14,6 MB a 1,4 MB. Se ve en el laboratorio, pestaña "Probar un .glb" → "Ver modelo de ejemplo". Los créditos están en `public/modelos/CREDITOS.md`.

> Sin producto para fotografiar todavía: la serie de prompts para generar las fotos del menú, los ingredientes y las texturas con IA está en [`PROMPTS-IA.md`](./PROMPTS-IA.md).

| Opción                                                                               | Cómo                                                               | A favor                                           | En contra                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **A. Escaneo con celular** (fotogrametría: Polycam, Luma, KIRI Engine, RealityScan…) | Fotos o video alrededor del plato; la app arma el modelo           | Se ve real, barato, rápido                        | Sale **en una sola pieza**: para separar ingredientes hay que escanearlos por separado y armarlos en Blender. Requiere limpieza |
| **B. Modelado por un artista** (Blender)                                             | Se modela cada ingrediente y se texturiza con fotos del plato real | Separable desde el inicio, liviano, control total | Cuesta tiempo y dinero por plato                                                                                                |
| **C. Procedural** (lo del prototipo)                                                 | Formas generadas por código                                        | Gratis, inmediato, siempre separable              | Estilo ilustrado, no fotográfico                                                                                                |
| **D. Imagen a 3D con IA**                                                            | Se sube una foto y la herramienta genera el modelo                 | Muy rápido                                        | Calidad variable, una sola pieza, hay que revisar licencias                                                                     |

**Recomendación:** empezar con **C** para todo lo que va por capas (hamburguesas, perros). Hacer
un **piloto con A** para la Clásica 27:

1. Escanear por separado el pan (base y tapa), la carne, la lechuga y el tomate; el queso y las salsas pueden quedar procedurales.
2. Armar el plato en Blender con la plantilla del laboratorio.
3. Comprimir y probar el resultado en "Probar un .glb".

### Especificación del archivo (para quien haga los modelos)

- **Formato:** `.glb` (glTF 2.0 binario), **máximo 4 MB**; el panel ya lo valida.
- **Escala y orientación:** 1 unidad ≈ 1 cm, eje Y hacia arriba, la base del plato en y = 0 y el plato centrado en el origen.
- **Un nodo por capa, en el primer nivel**, con estos nombres: `pan_base`, `salsa_1`, `lechuga_1`, `tomate_1`, `carne_1`, `carne_2` (Doble), `queso_1`, `cebolla_1`, `pan_tapa`, `acompanante_papas`, `plato_ceramica`.
  - Las claves son las de `lib/data/customization-specs.ts`.
  - El botón **Plantilla .glb** del laboratorio descarga un archivo con esta estructura, listo para abrir en Blender.
- **Reemplazos:** nodos alternativos con el sufijo `@opción`, ocultos por defecto. Por ejemplo, `queso_1@queso_vegano` y `pan_tapa@pan_sin_gluten`. _(Por implementar en el visor de archivos; el procedural ya lo hace.)_
- **Extras:** `queso_2`, `tocineta_2`… Si no vienen en el archivo, el visor podrá duplicar la capa 1. _(Por implementar.)_
- **Presupuesto:** menos de 50.000 triángulos en todo el plato, texturas de máximo 1024 px y un material por ingrediente.
- **Compresión:** con [gltf-transform](https://gltf-transform.dev):

  ```bash
  npx @gltf-transform/cli optimize entrada.glb salida.glb --compress draco --texture-compress webp
  ```

  El visor ya trae el decodificador Draco en `public/draco/`, sin depender de un CDN.

## 5. Reglas de personalización (lo que hay que decidir)

El prototipo usa estas reglas; todas se pueden cambiar en `lib/domain/customization.ts`:

- **Ranuras:** cada plato tiene "ranuras" de ingrediente.
  - Las **incluidas** se pueden quitar (si el restaurante lo permite), pedir con extra (con precio y un máximo) o reemplazar por opciones (con diferencia de precio).
  - Los **adicionales** arrancan en cero y se agregan.
- **Quitar no descuenta.** Es lo usual en comida rápida; se puede cambiar.
- **Base según tamaño:** la Doble trae 2 carnes de base, y el extra se cobra sobre eso.
- **Reemplazo de algo quitado:** si se reemplaza un ingrediente quitado, vuelve a ponerse.
- **Alérgenos:** se recalculan con los de cada reemplazo y los del acompañante. La interfaz dice "Ya no tiene lácteos · Ahora tiene soya".
- **Comanda:** `SIN Cebolla caramelizada`, `CAMBIAR Queso cheddar → Queso vegano`, `EXTRA Queso cheddar ×2`, `AGREGAR Tocineta`, `ACOMPAÑANTE Aros de cebolla`.
- **Resumen para el carrito:** "Sin cebolla · Queso vegano · Con Tocineta".
- **Adaptar a mis alergias:** usa el primer reemplazo seguro; si no hay, quita el ingrediente si se puede; si no, avisa ("pregúntale al mesero"). Nunca bloquea el pedido.
- **Acompañante (combo):** es una **propuesta**. Hoy las papas se venden aparte; hay que decidir si los platos traen acompañante.

## 6. Cómo se integraría al producto (cuando lo decidan)

| Paso | Cambio                                                                                                                                                     | Tamaño aproximado            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | `Dish.customization` en los datos, y en el panel: por ingrediente, removible / extra / precio / reemplazos                                                 | Mediano                      |
| 2    | `CartItem` y `OrderItem` guardan la personalización; el precio unitario incluye la diferencia; el carrito junta líneas solo si la personalización es igual | Pequeño                      |
| 3    | Ficha del cliente: sección "Personalizar" en lista (sin 3D), con "Adaptar a mis alergias"                                                                  | Mediano                      |
| 4    | Mesero y cocina: las líneas `SIN / EXTRA / CAMBIAR` debajo de cada ítem, bien visibles                                                                     | Pequeño                      |
| 5    | Botón "Vista 3D": abre el visor en una hoja, cargado solo al tocarlo                                                                                       | Pequeño (el visor ya existe) |
| 6    | Panel: ingredientes más quitados y agregados (dice qué cambiar en la carta)                                                                                | Pequeño                      |
| 7    | Conectar modelos `.glb` reales con los nombres de nodos de la sección 4                                                                                    | Mediano, por plato           |

## 7. Realismo, rendimiento, compatibilidad y accesibilidad

### Realismo (implementado en el laboratorio)

- **Luz de estudio real (HDRI):** `public/hdri/apartment.exr` (Poly Haven, CC0, 100 KB) da reflejos y relleno de un espacio real, más una luz principal cálida con sombra suave. Mapeo de tonos neutro (`NeutralToneMapping`), fiel al color de la comida.
- **Materiales físicos** (`MeshPhysicalMaterial`): brillo de grasa en la carne, capa brillante en salsas, queso, tomate y yema (`clearcoat`), pelusa suave en el pan y la lechuga (`sheen`).
- **Texturas procedurales** (`components/viewer3d/textures.ts`): se pintan en el navegador con ruido determinista, sin descargar imágenes. Costra del pan más tostada en la cima, miga en las caras cortadas, carne sellada, nervaduras de la lechuga, cámaras y semillas del tomate, vetas de la tocineta y madera de la mesa. Cada una trae su mapa de relieve (normal map).
- **Formas orgánicas** (`geometry.ts`): contornos irregulares en el pan y la carne, carne de bordes abombados, queso que se derrite más en unas zonas que en otras, lechuga arrugada, tocineta ondulada y ajonjolí en forma de lágrima.
- **Escena:** mesa de madera que se funde con el fondo (niebla), plato de cerámica esmaltada y vaso de papel con el nombre y el color del restaurante.
- **Oclusión ambiental (N8AO), solo en calidad alta:** oscurece donde un ingrediente toca otro. Es lo que más "asienta" las capas.

Con esto se ve como una buena ilustración 3D, **no como una foto**. El fotorrealismo de verdad solo llega con modelos escaneados o hechos por un modelador (sección 4). El visor ya está listo para recibirlos: el mismo estudio de luz sirve para los `.glb`.

### Fluidez (implementado)

- **Dibuja solo cuando algo cambia** (`frameloop="demand"`): quieto no pinta cuadros ni gasta batería. Las animaciones piden cuadros mientras se mueven y paran solas.
- **Una llamada de dibujo por capa:** las piezas repetidas (aros, tiras de tocineta, rodajas de tomate, papas, ensalada) van fusionadas en una sola geometría. La hamburguesa con papas son ~27 llamadas de dibujo en calidad rápida.
- **Toque preciso y barato:** cada capa se toca por un cilindro invisible, y no se revisan los miles de triángulos de las mallas visibles.
- **Animaciones con resorte:** cada capa cae a su sitio con un rebote leve y **sale animada al quitarla**. Si se reemplaza (carne → pollo), la vieja sale y la nueva entra. El resorte avanza por pasos cortos, así que también se ve bien en equipos lentos.
- **La cámara acompaña:** se encuadra según la pantalla y la altura del despiece, y mira al ingrediente que se toca.
- **Calidad adaptable:**
  - _Alta:_ hasta 2× de resolución, sombras 2048 y oclusión ambiental.
  - _Rápida:_ hasta 1,25×, sombras 1024, sin posprocesado, y los materiales sin `clearcoat` ni `sheen`.
  - _Automática_ empieza en alta y baja sola si la mediana de los cuadros cae de ~35 fps.
- **Medidor de rendimiento** (botón del velocímetro): fps, llamadas de dibujo y triángulos. Muestra "En reposo" cuando no se está dibujando.
- **Precarga:** `<Preload all />` compila los materiales y sube las texturas al empezar, para que el primer giro no dé tirones.
- **Modelos reales livianos:** el visor de `.glb` acepta geometría comprimida con Draco o meshopt y texturas KTX2/Basis (`public/basis/`). Las texturas KTX2 llegan comprimidas a la GPU y ocupan ~4–6 veces menos memoria que un PNG.

Para medirlo en un teléfono real: abrir `/laboratorio/3d`, activar el medidor y girar o separar. Los números de este informe salen de un navegador sin GPU (renderizado por software), que no sirve para medir fps.

### Compatibilidad y accesibilidad

- **Solo se descarga donde se usa:** Three.js solo baja en la ruta del laboratorio. La carta sigue en ~708 KB de JavaScript sin él (medido). Integrado al producto, se descarga al tocar "Vista 3D".
- **Movimiento reducido:** respeta "reducir movimiento": sin giro automático ni animaciones.
- **Accesibilidad:** todo lo que se hace en 3D también se puede hacer desde la lista. El 3D complementa, no es obligatorio. Las etiquetas del modelo son botones accesibles con teclado.
- **Sin 3D en el dispositivo:** si no hay WebGL, la personalización funciona igual desde la lista.
- **Plantilla .glb:** ahora incluye las texturas, así que pesa ~3,5 MB. Es una plantilla de nombres y proporciones, no el modelo final.

## 8. Riesgos y decisiones pendientes

- Qué platos e ingredientes se pueden personalizar. Lo decide el restaurante, y afecta la operación de cocina.
- Precios: si quitar descuenta, cuánto cuesta cada extra y si los reemplazos tienen costo.
- Combos con acompañante: sí o no.
- Quién hace los modelos, con qué presupuesto y con qué nivel de realismo.
- Alérgenos: el cálculo refleja los ingredientes, no la contaminación cruzada en cocina. Hay que dejar el aviso visible.
- La comanda puede llenarse con muchos cambios; conviene un límite por plato.

## 9. Próximos pasos sugeridos

1. Revisar el laboratorio en su enlace de vista previa (en celular y en computador).
2. Decidir las reglas de la sección 5 y la lista de platos personalizables.
3. Integrar la personalización en la ficha, el carrito y la cocina (pasos 1–4), aún sin 3D.
4. Piloto de escaneo de la Clásica 27 con la especificación de la sección 4.
5. Conectar el visor al `.glb` real (con reemplazos `@opción`) y activar el botón "Vista 3D".
