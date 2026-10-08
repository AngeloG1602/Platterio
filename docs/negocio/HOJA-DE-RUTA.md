# Hoja de ruta: de demo a producto vendible

Resume lo decidido y el orden de trabajo. Se actualiza al terminar cada fase.

## Decisiones tomadas

| Tema             | Decisión                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modelo           | Suscripción mensual y anual. Una cuenta por negocio, con usuarios y roles.                                                                          |
| Venta            | Hotmart (cobro con tarjeta) y también directo (transferencia o efectivo), con una fecha de "vigente hasta" por negocio.                             |
| Roles            | Administrador, encargado de caja, mesero y cocina.                                                                                                  |
| Acceso a la mesa | QR fijo en la mesa y PIN que da el mesero. La sesión se cierra por el mesero, por el negocio o sola por inactividad.                                |
| Editar pedidos   | El mesero siempre puede. No se bloquea: queda registro de quién cambió qué.                                                                         |
| 3D               | Servicio aparte, por plato. Con guía para que el negocio aporte su modelo.                                                                          |
| Reportes         | Todos van en el plan Esencial (son el diferenciador).                                                                                               |
| Plan Profesional | Domicilios, personalización a medida (se cobra aparte), tipografías propias, dominio propio, idiomas y monedas, importar menú, soporte prioritario. |
| Prueba           | 7 días con tarjeta, más la demo sin registro.                                                                                                       |
| Infraestructura  | Empezar gratis (desarrollo, demo, pruebas) y pasar a Vercel Pro y Supabase Pro con el primer cliente que pague.                                     |
| Orden            | Primero el software completo; la base de datos se conecta cuando el flujo esté validado.                                                            |

## Fases

| #   | Fase                                                                                                                                                                                                              | Estado                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | Usuarios y roles: entrada con PIN, permisos, equipo, caja                                                                                                                                                         | Hecha (pendiente de visto bueno) |
| 2   | Mesas con QR fijo, PIN del mesero y sesiones que se cierran                                                                                                                                                       | Hecha (pendiente de visto bueno) |
| 3   | Pedido del mesero y de caja, con edición y registro de cambios                                                                                                                                                    | Hecha (pendiente de visto bueno) |
| 4   | Marca por negocio: logo, paleta, tipografías y 9 estilos de carta (forma, claro/oscuro, portada)                                                                                                                  | Hecha (pendiente de visto bueno) |
| 5   | Reportes completos y cierre de caja                                                                                                                                                                               | Hecha (pendiente de visto bueno) |
| 6   | Domicilios                                                                                                                                                                                                        | Hecha (pendiente de visto bueno) |
| 7   | Idiomas (español e inglés) y monedas. Sin propina ni impuestos                                                                                                                                                    | Hecha (pendiente de visto bueno) |
| 8   | Vista 3D integrada a la ficha del plato                                                                                                                                                                           | Hecha (pendiente de visto bueno) |
| 9   | Base de datos y cuentas reales (ya probado en local: página de ventas en `/`, registro, ingreso del dueño y prueba de 7 días; incluye marca por negocio y tema a medida editable solo por nosotros, decisión 132) | Pendiente                        |
| 10  | Página de ventas, guías y cobros (maqueta de la página y guía preliminar hechas; faltan cobros y versión final)                                                                                                   | En curso                         |

## Rol por rol (fase 1)

| Capacidad                                        | Admin | Encargado | Mesero | Cocina |
| ------------------------------------------------ | :---: | :-------: | :----: | :----: |
| Panel completo (menú, marca, reportes completos) |   ✔   |           |        |        |
| Crear usuarios de cualquier rol                  |   ✔   |           |        |        |
| Crear y desactivar meseros y cocina              |   ✔   |     ✔     |        |        |
| Asignar mesas a meseros                          |   ✔   |     ✔     |        |        |
| Ver y operar todo el salón                       |   ✔   |     ✔     |        |        |
| Ver y operar sus mesas                           |       |           |   ✔    |        |
| Cancelar mesas, crear y editar pedidos, cobrar   |   ✔   |     ✔     |        |        |
| Crear, editar y confirmar pedidos de sus mesas   |       |           |   ✔    |        |
| Tablero de cocina                                |   ✔   |     ✔     |        |   ✔    |
| Marcar platos agotados                           |   ✔   |     ✔     |   ✔    |   ✔    |

Cancelar mesas se activó en la fase 2; crear y editar pedidos y cobrar, en la fase 3.

## Pendientes que no son de código

- Confirmar en Hotmart: comisión, cobro recurrente con los métodos de pago de Colombia, periodo de prueba en suscripciones y eventos (webhooks) disponibles.
- Hablar con un contador sobre facturación electrónica si se cobra directo.
- Revisión legal: política de privacidad, términos y contrato de tratamiento de datos (Ley 1581 de 2012).
- Nombre y dominio del producto.
