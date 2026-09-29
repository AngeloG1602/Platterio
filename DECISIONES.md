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
