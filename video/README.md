# Video de presentación de Platterio

Video de ~2:10 en dos formatos (horizontal 16:9 y vertical 9:16) que muestra la aplicación real.
Todo se genera con código: si cambian las pantallas, el texto o la voz, se vuelve a producir con
los mismos comandos.

## Cómo está hecho

| Paso      | Qué hace                                                                                                                                                        | Archivo                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Guion     | Texto de la voz por escena y frase (`decir` ayuda a la pronunciación).                                                                                          | `guion.json`                                                   |
| Capturas  | Playwright recorre la demo real (cliente, mesero, cocina, caja, administrador, domicilios, reservas, estilos) y guarda capturas 2x y la posición de cada botón. | `captura/capturar.mjs` → `captura/png/`, `captura/cajas.json`  |
| Voz       | Kokoro (local, sin internet), voz `ef_dora`. Calcula la línea de tiempo y los subtítulos.                                                                       | `voz/generar.py` → `voz/tiempos.json`, `salida/subtitulos.srt` |
| Animación | Página HTML con una línea de tiempo determinista: `render(t)` dibuja cada cuadro. Teléfonos, ventanas, toques, cursor, acercamientos, títulos y transiciones.   | `escenas/`                                                     |
| Grabación | Playwright graba cuadro a cuadro (30 fps) en paralelo y ffmpeg arma el video.                                                                                   | `render/render.mjs`                                            |
| Audio     | Música propia sintetizada (sin derechos de terceros), efectos y voz, con la música bajando cuando habla la voz.                                                 | `audio/mezclar.py`                                             |
| Final     | Une video y audio, normaliza a -14 LUFS (redes) y codifica en H.264.                                                                                            | `render/unir.py`                                               |

## Producirlo

Requisitos: Node y las dependencias del proyecto, Python 3 con
`pip install numpy soundfile kokoro-onnx imageio-ffmpeg pillow`, y los modelos de Kokoro en
`video/.modelos/` (`kokoro.onnx` y `voices.bin`, de
`github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0`).

```bash
npm run build && npx next start -p 3100 &              # la app real
E2E_URL=http://localhost:3100 node video/captura/capturar.mjs
python3 video/voz/generar.py
export FFMPEG=$(python3 -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
for f in h v; do
  node video/render/render.mjs --f $f --workers 4      # ~5 min cada uno
  python3 video/audio/mezclar.py $f
  python3 video/render/unir.py $f
done
```

Resultado en `video/salida/`: `platterio-horizontal.mp4`, `platterio-vertical.mp4` (con
subtítulos quemados) y `subtitulos.srt` (para subir aparte en YouTube o la página).

Para revisar cuadros sueltos sin grabar todo: `node video/render/render.mjs --f v --fotos 12,40,90`.
Para ver la animación en el navegador, sirve la raíz del repositorio y abre
`video/escenas/index.html?f=h` (o `?f=v`) y llama `render(t)` desde la consola.

## Cambios habituales

- **Texto de la voz:** edita `guion.json` y vuelve a correr desde `voz/generar.py`. Las escenas se
  acomodan solas a la nueva duración.
- **Otra voz:** cambia `voz` en `guion.json` (`ef_dora` femenina o `em_alex` masculina en español).
  Una voz neuronal colombiana (por ejemplo `es-CO-SalomeNeural`) suena más natural, pero en este
  entorno la red bloquea ese servicio.
- **Dirección de la página:** `sitio` en `guion.json` (sale en el cierre).
- **Pantallas nuevas:** vuelve a correr la captura; las cajas de los botones se actualizan solas.

## Reglas del contenido

Sin precios, sin cifras prometidas («vende X % más») y sin presentar como terminado lo que es
prototipo (pagos, cuentas en base de datos, envío automático de WhatsApp). Los logos de WhatsApp y
Google no se usan; solo se mencionan.
