/**
 * Planes, precios y extras de la página de ventas. Los valores son una PROPUESTA de arranque
 * (para validar con dueños de restaurantes): se definen aquí, en un solo lugar, para ajustarlos.
 * Todos en pesos colombianos. Las reglas (límites y funciones por plan) están en lib/domain/pricing.ts.
 */
import type { PlanId } from "@/lib/domain/pricing";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Pesos por mes, pagando mes a mes. */
  monthly: number;
  /** Pesos por año (dos meses menos que doce). Sin valor, el plan es solo mensual. */
  yearly?: number;
  highlight?: boolean;
  /** Primer punto de la lista: lo que hereda del plan anterior. */
  includesPrevious?: string;
  features: string[];
}

export const TRIAL_DAYS = 7;

/** Precio de lanzamiento del plan Completo anual: primeros clientes, primer año. */
export const FOUNDER = {
  spots: 10,
  yearly: 700_000,
  months: 12,
};

export const PLANS: Plan[] = [
  {
    id: "digital",
    name: "Digital",
    tagline: "Para vender más con tu carta, domicilios y reservas, sin montar un salón conectado.",
    monthly: 69_000,
    features: [
      "Carta con fotos, ingredientes y alérgenos, sin límite de platos",
      "9 estilos de carta, tu logo, tus colores y foto de portada",
      "Carta pública, página de inicio de tu negocio y QR",
      "Domicilios y pedidos para recoger, con seguimiento y WhatsApp",
      "Reservas y eventos, con cotización y WhatsApp",
      "Invitación a dejar reseñas en Google",
      "Tablero de domicilios y reservas, y cocina para tus domicilios",
      "Hasta 3 personas en el equipo, con PIN",
      "Soporte por WhatsApp, de lunes a sábado",
    ],
  },
  {
    id: "completo",
    name: "Completo",
    tagline: "Para el restaurante con flujo: salón, meseros, cocina y caja trabajando juntos.",
    monthly: 149_000,
    yearly: 1_490_000,
    highlight: true,
    includesPrevious: "Todo lo del plan Digital",
    features: [
      "QR fijo por mesa y PIN que da el mesero; pedido desde el celular con carrito compartido",
      "Mesero con buscador y filtros, tablero de cocina y avisos en vivo",
      "Cobro, turnos y cierre de caja",
      "Calificaciones por plato y por servicio, con alertas",
      "Reportes completos con descarga en CSV",
      "Carta en varios idiomas y moneda a tu elección",
      "Dominio propio para tu carta",
      "Hasta 20 personas en el equipo, con PIN",
      "Soporte prioritario: respuesta en máximo 2 horas hábiles",
    ],
  },
];

/** Servicios que se pagan aparte, en cualquier plan. Precios tentativos. */
export const ADDONS: { name: string; price: string; note: string }[] = [
  {
    name: "Vista 3D de un plato",
    price: "De $80.000 a $150.000 por plato",
    note: "Una sola vez. Modelamos el plato (o usamos tu modelo) y tus clientes lo giran y lo arman a su gusto.",
  },
  {
    name: "Diseño a medida",
    price: "Desde $900.000",
    note: "Tu carta y tus pantallas con un diseño hecho para tu marca. Se cotiza.",
  },
  {
    name: "Carga de tu carta y capacitación",
    price: "De $300.000 a $500.000",
    note: "Una sola vez. Incluida en el precio de fundador.",
  },
  {
    name: "Otro negocio o sede",
    price: "50 % del plan",
    note: "Para quien tiene más de un restaurante bajo el mismo dueño.",
  },
];

/** Atención al cliente: lo que se promete, claro y sin sorpresas. */
export const SUPPORT = {
  hours: "lunes a sábado, de 8 a. m. a 6 p. m. (hora de Colombia)",
  outside: "Fuera de ese horario respondemos el siguiente día hábil.",
  standardReply: "en el mismo día hábil",
  priorityReply: "en máximo 2 horas hábiles",
};
