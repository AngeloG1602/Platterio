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

## Cómo se aplica correctamente en un sistema como Platterio (segunda investigación)

Fuentes ahora más cercanas a la DIAN (el sitio `micrositios.dian.gov.co` no se pudo abrir desde
este entorno, así que lo de abajo viene de los resultados de búsqueda; verificar el texto vigente).

1. **Tres vías oficiales** (Resolución 000042 de 2020): software propio, proveedor tecnológico o el
   servicio gratuito de la DIAN. Ser *proveedor tecnológico* nosotros mismos exige requisitos
   pesados (ISO 27001 o carta de compromiso, patrimonio de 20.000 UVT, resolución de
   autorización), así que **no conviene**. Lo práctico: cada restaurante se habilita como
   facturador y nosotros emitimos **a través de un proveedor autorizado por API**.
2. **Habilitación del restaurante:** registrarse como facturador electrónico, asociar un *modo de
   operación* (proveedor tecnológico), **superar el set de pruebas** en el ambiente de habilitación
   (la cantidad de documentos varía según la guía; confirmar en el portal) y pasar a «Habilitado».
   Se necesita firma/certificado digital y una resolución de numeración con prefijo.
3. **Dos documentos distintos:**
   - **Factura electrónica de venta**: cuando el cliente pide factura con sus datos (crédito fiscal,
     empresas). Lleva validación previa de la DIAN y CUFE.
   - **Documento equivalente electrónico, tiquete POS** (Resolución 165 de 2023): reemplaza el
     tiquete de caja para quien optó por documentos equivalentes. Debe identificar al adquirente;
     **no** da derecho a IVA descontable ni a costos y deducciones: si el cliente los necesita,
     debe pedir factura de venta. Exige proveedor autorizado y el anexo técnico propio.
   El cronograma de implementación del tiquete POS depende del tipo de contribuyente: verificar.
4. **Dónde encaja Platterio:** al saldarse la cuenta (hoy ya generamos el comprobante), el servidor
   envía los datos al proveedor, que arma el XML UBL 2.1, lo firma, lo valida con la DIAN y
   devuelve CUFE, QR y PDF. Se guardan el estado, el CUFE y el PDF junto al comprobante.
5. **Proveedores con API que aparecieron** (sin precios verificados): Factus, Alanube (con Alegra),
   MATIAS API (modalidad software propio, sandbox, desde ~COP 400.000 al año por 10.000
   documentos según su página), Muisca, Plemsi, FacturaLatam. Dataico y la API de Alegra no pude
   revisarlas.

**Lo que tendría que cambiar en Platterio:** datos fiscales del negocio (NIT, régimen,
responsabilidades, resolución y prefijo, certificado), captura opcional de los datos del cliente al
cobrar («¿factura a nombre de alguien?»), impuesto por plato (IVA o impoconsumo 8 %), notas
crédito para anular, reintentos y contingencia si la DIAN no responde, y un servidor que guarde
las llaves y asigne el consecutivo.

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
