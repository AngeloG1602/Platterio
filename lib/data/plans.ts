/**
 * Planes y precios de la página de ventas. Son valores de EJEMPLO para la versión preliminar:
 * se definen aquí, en un solo lugar, para ajustarlos cuando se decida la política comercial.
 */
export interface Plan {
  id: "esencial" | "profesional";
  name: string;
  tagline: string;
  /** Pesos colombianos por mes, pagando mes a mes. */
  monthly: number;
  /** Pesos colombianos por año (dos meses menos que doce). */
  yearly: number;
  highlight?: boolean;
  /** Primer punto de la lista: lo que hereda del plan anterior. */
  includesPrevious?: string;
  features: string[];
}

export const TRIAL_DAYS = 7;

export const PLANS: Plan[] = [
  {
    id: "esencial",
    name: "Esencial",
    tagline: "Todo para atender el salón y saber cómo te va.",
    monthly: 79_000,
    yearly: 790_000,
    features: [
      "Carta con fotos, ingredientes y alérgenos, sin límite de platos",
      "QR fijo por mesa y PIN que da el mesero",
      "Pedido desde el celular, tomado por el mesero o por caja",
      "Tablero de cocina y avisos en vivo",
      "Usuarios con roles: administrador, caja, mesero y cocina",
      "Cobro, turnos y cierre de caja",
      "Reportes completos con descarga en CSV",
      "Tu logo, tu color y 9 estilos de carta listos (claros y oscuros), con foto de portada",
    ],
  },
  {
    id: "profesional",
    name: "Profesional",
    tagline: "Para crecer: domicilios, tu marca completa y más idiomas.",
    monthly: 129_000,
    yearly: 1_290_000,
    highlight: true,
    includesPrevious: "Todo lo del plan Esencial",
    features: [
      "Domicilios y pedidos para recoger, con seguimiento para el cliente",
      "Diseño a medida de tu carta y tus pantallas (se cotiza aparte) y tipografías propias",
      "Carta en varios idiomas y moneda a tu elección",
      "Dominio propio para tu carta",
      "Importar tu menú desde una hoja de cálculo",
      "Soporte prioritario",
    ],
  },
];
