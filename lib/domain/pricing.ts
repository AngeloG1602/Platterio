/**
 * Reglas de los planes: qué incluye cada uno, sus límites y las cuentas de precios. Funciones puras;
 * el catálogo con los valores y los textos está en lib/data/plans.ts.
 */

export type PlanId = "digital" | "completo";

/** Funciones que dependen del plan. */
export type Feature =
  | "salon" // QR por mesa con PIN, pedido desde la mesa, mesero, cocina de salón y cobro en caja
  | "calificaciones"
  | "reportes-completos"
  | "idiomas-y-monedas"
  | "dominio-propio";

export interface PlanLimits {
  /** Personas del equipo que pueden entrar con PIN (administrador, caja, meseros, cocina). */
  users: number;
  features: readonly Feature[];
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  digital: { users: 3, features: [] },
  completo: {
    users: 20,
    features: [
      "salon",
      "calificaciones",
      "reportes-completos",
      "idiomas-y-monedas",
      "dominio-propio",
    ],
  },
};

/** Un negocio sin plan guardado (o con uno desconocido) tiene todo: es la demo y la prueba. */
export const resolvePlan = (plan: string | undefined): PlanId =>
  plan === "digital" ? "digital" : "completo";

export const planAllows = (plan: string | undefined, feature: Feature): boolean =>
  PLAN_LIMITS[resolvePlan(plan)].features.includes(feature);

/** ¿Se puede agregar a otra persona al equipo? `active` = personas activas hoy. */
export function canAddUser(
  plan: string | undefined,
  active: number,
): { ok: true } | { ok: false; error: string } {
  const { users } = PLAN_LIMITS[resolvePlan(plan)];
  return active < users
    ? { ok: true }
    : {
        ok: false,
        error:
          resolvePlan(plan) === "digital"
            ? `El plan Digital incluye hasta ${users} personas en el equipo. Pasa al plan Completo para tener más.`
            : `El plan Completo incluye hasta ${users} personas en el equipo. Escríbenos si necesitas más.`,
      };
}

/** Salario mínimo mensual legal vigente en Colombia, 2026 (decreto 1469 de 2025). */
export const SMMLV_2026 = 1_750_905;

/** Cuánto es por mes un pago anual. */
export const monthlyEquivalent = (yearly: number) => Math.round(yearly / 12);

/** Cuánto se ahorra pagando el año de una vez frente a doce meses sueltos, en pesos y en %. */
export function yearlySaving(monthly: number, yearly: number): { pesos: number; percent: number } {
  const full = monthly * 12;
  const pesos = Math.max(0, full - yearly);
  return { pesos, percent: full > 0 ? Math.round((pesos / full) * 100) : 0 };
}

/** Qué parte de un salario mínimo mensual es un precio (0,85 = el 85 %). */
export const minimumWageShare = (price: number) => price / SMMLV_2026;

/* ——— Proyección de costos y clientes ——— */

/** Hotmart: porcentaje y fijo en dólares por venta (cifras de terceros; confirmar con Hotmart). */
export const HOTMART_PERCENT = 0.099;
export const HOTMART_FIXED_USD = 0.5;

/** Lo que queda de un pago después de la comisión de Hotmart. */
export function netAfterHotmart(gross: number, trm: number): number {
  return Math.round(gross - gross * HOTMART_PERCENT - HOTMART_FIXED_USD * trm);
}

/** Cuántos clientes hacen falta para cubrir un gasto anual (siempre se redondea hacia arriba). */
export function clientsToCover(annualCost: number, netPerClientPerYear: number): number {
  return netPerClientPerYear > 0 ? Math.ceil(annualCost / netPerClientPerYear) : Infinity;
}

/* ——— Comparación con mandarlo a hacer ——— */

/** Años de suscripción que se pagan con el costo de desarrollar el sistema a la medida. */
export const yearsOfSubscription = (buildCost: number, yearlyPrice: number) =>
  yearlyPrice > 0 ? buildCost / yearlyPrice : Infinity;
