# Factura electrónica (DIAN): investigación previa

Estado: **investigación, sin implementar**. Lo que sigue sale de búsquedas en la web, en su mayoría
blogs de proveedores de software; **no encontré una fuente oficial de la DIAN** entre los
resultados. Antes de decidir hay que verificar todo en el sitio de la DIAN y con un contador.

## Lo que parece cierto (a confirmar)

- La DIAN permite emitir factura electrónica por tres vías: desarrollo propio, el servicio gratuito
  de la DIAN o un **proveedor tecnológico autorizado**. Para un producto como Platterio, que sirve a
  muchos negocios, la vía realista es integrar un proveedor autorizado por API.
- El tiquete de máquina registradora en papel se reemplazó por el **documento equivalente
  electrónico POS** (Resolución 000165 de 2023, según varias fuentes). Se usa para el consumidor
  final sin identificar; la **factura electrónica de venta** se emite cuando el cliente pide factura
  con sus datos (NIT o cédula). Una fuente dice que el POS no tiene el límite de 5 UVT; otra dice que
  el régimen SIMPLE de ingresos bajos aún puede usar documento equivalente. Las fuentes no coinciden
  sobre quién está obligado a qué: **depende del régimen del restaurante**.
- Un POS no incluye por sí solo la facturación ante la DIAN: el proveedor debe estar habilitado y
  soportar los dos documentos (factura y documento equivalente POS).
- En restaurantes aparece el **impuesto al consumo (8 %)** en lugar del IVA; mal registrado puede
  invalidar el documento. Sin verificar en fuente oficial.

## Qué implicaría para Platterio

1. **Datos fiscales del negocio** (NIT, régimen, resolución de numeración, prefijo) y del cliente
   (documento, correo) cuando pida factura. Hoy solo guardamos nombre, documento y celular de las
   personas a crédito.
2. **Numeración autorizada por la DIAN**, distinta del consecutivo interno `F-0001` de los
   comprobantes de hoy. El consecutivo lo asigna el proveedor o el servidor, nunca el navegador.
3. **Integración con un proveedor autorizado** por API (candidatos a evaluar: Alegra, Siigo, Factus,
   Dataico, entre otros; no obtuve precios por documento ni documentación de API). Requiere servidor:
   no se puede hacer solo en el navegador porque hay llaves secretas y la numeración debe ser única.
4. **Impuestos por plato** (IVA o impoconsumo) en la carta, hoy ausentes.
5. **Contingencia y notas crédito** (anulaciones, errores) y envío del PDF/XML al cliente.

## Recomendación

No implementarlo en el prototipo. Dejarlo para la fase de cuentas y base de datos (Fase 9), cuando
exista servidor: allí se elige proveedor (pidiendo cotización a 2 o 3), se agregan datos fiscales a
la configuración del negocio y se reemplaza el comprobante interno por el documento electrónico,
conservando el comprobante actual como respaldo. Mientras tanto, el comprobante dice
expresamente que **no es una factura electrónica de venta**.

## Fuentes consultadas (no oficiales)

- [Facturación electrónica DIAN 2026: guía completa (siemprealdia.co)](https://siemprealdia.co/colombia/impuestos/sistema-de-facturacion-electronica-en-colombia/)
- [¿Tu restaurante está obligado a facturar electrónicamente? (warocol.com)](https://warocol.com/blog/obligados-facturar-electronicamente-restaurante-colombia)
- [Factura electrónica vs POS electrónico (bibisoft.co)](https://bibisoft.co/facturacion-electronica-vs-pos-electronico-lo-que-todo-restaurante-en-colombia-debe-saber)
- [Facturación electrónica DIAN para restaurantes (posiblerestoapp.cloud)](https://posiblerestoapp.cloud/blog/facturacion-electronica-dian-restaurantes/)
- [Proveedores autorizados de facturación electrónica (Siigo)](https://www.siigo.com/blog/empresario/proveedores-autorizados-facturacion-electronica/)
- [Alegra vs Siigo (Alegra)](https://blog.alegra.com/colombia/alegra-vs-siigo-colombia/)
