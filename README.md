# Platterio · mockup navegable

Menú interactivo para restaurantes, con el restaurante de ejemplo **Fogón 27**. Este prototipo no
tiene backend: todo vive en el navegador y se sincroniza entre pestañas. El brief completo está en
[`BRIEF.md`](./BRIEF.md) y las decisiones tomadas en [`DECISIONES.md`](./DECISIONES.md).

## Arrancar

```bash
npm install
npm run dev        # http://localhost:3000
```

| Comando                              | Qué hace                                 |
| ------------------------------------ | ---------------------------------------- |
| `npm run dev`                        | Servidor de desarrollo                   |
| `npm run build`                      | Compilación de producción                |
| `npm test`                           | Pruebas de la lógica de dominio (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint y TypeScript estricto             |
| `npm run format`                     | Prettier                                 |

## Rutas disponibles

- `/` — Hub de demo: entrar como cliente (mesas 1–6), mesero, cocina o administrador.
- `/?demo=1` — Abre el panel de demo (hora simulada, tiempo ×10, reiniciar datos).
- `/muestra` — Muestra de los componentes con el estilo final.
- `/mesa/[numero]` — Entrada del cliente (lo que abre el QR): alias y comensales de la mesa.
- `/mesa/[numero]/menu` — Recomendados por franja, pestañas de categoría, buscador y filtros.
- `/mesa/[numero]/plato/[id]` — Ficha del plato con variantes, ingredientes, alérgenos y nota.

## Estructura

```
app/                 Rutas (App Router)
components/ui/       Componentes base con los tokens de diseño
components/dish/     Foto con respaldo, tarjeta de plato, espacio del visor 3D
components/demo/     Panel de demo
lib/domain/          Lógica de negocio pura y con pruebas (franjas, estados, formatos…)
lib/data/            Capa de datos: catálogo, historial sembrado, store y sincronización
public/platos/       Fotos de los platos (ver LEEME.md)
```

Las pantallas solo usan los hooks y las acciones de `lib/data`. Para cambiar a Supabase se
reemplaza esa capa, no las pantallas.

## Estado por fases

- [x] Fase 0 — Base
- [x] Fase 1 — Menú del cliente
- [ ] Fase 2 — Pedido
- [ ] Fase 3 — Mesero
- [ ] Fase 4 — Cocina y estados
- [ ] Fase 5 — Calificaciones
- [ ] Fase 6 — Administrador
- [ ] Fase 7 — Pulido
