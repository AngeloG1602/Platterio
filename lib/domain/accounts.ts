/**
 * Cuentas de negocio: un dueño con correo y contraseña, una dirección corta para su carta y el
 * estado de su suscripción ("vigente hasta"). Funciones puras; el almacenamiento está en lib/data.
 */

export const DAY_MS = 86_400_000;
export const MIN_PASSWORD = 8;

export type AccountKind = "prueba" | "suscripcion";
export type AccountState = "prueba" | "activa" | "vencida";

export interface Account {
  id: string;
  email: string;
  businessName: string;
  /** Dirección corta única del negocio (parte de los enlaces públicos). */
  slug: string;
  /** Sal y huella de la contraseña (nunca la contraseña). */
  passwordSalt: string;
  passwordHash: string;
  createdAt: number;
  /** Fin de la prueba o de la suscripción pagada. */
  validUntil: number;
  kind: AccountKind;
  /** Plan que eligió al registrarse, si venía de la tabla de precios. */
  plan?: "esencial" | "profesional";
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function validateEmail(email: string): string | null {
  const e = normalizeEmail(email);
  if (!e) return "Escribe tu correo";
  if (e.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
    return "Revisa el correo: parece incompleto";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD)
    return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`;
  if (password.length > 100) return "La contraseña es demasiado larga";
  if (!password.trim()) return "La contraseña no puede ser solo espacios";
  return null;
}

export function validateBusinessName(name: string): string | null {
  const n = name.trim();
  if (n.length < 2) return "Escribe el nombre de tu negocio";
  if (n.length > 60) return "El nombre es demasiado largo (máximo 60 letras)";
  return null;
}

/** Dirección corta a partir del nombre: sin tildes, en minúsculas y con guiones. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  return slug || "negocio";
}

/** Palabras que no pueden ser el nombre de un negocio porque son rutas de la plataforma. */
const RESERVED = new Set([
  "admin",
  "personal",
  "carta",
  "cuenta",
  "soporte",
  "login",
  "negocio",
  "api",
  "app",
  "caja",
  "cocina",
  "demo",
  "domicilio",
  "entrar",
  "mesa",
  "mesero",
  "registro",
  "iniciar-sesion",
  "producto",
  "muestra",
  "laboratorio",
  "www",
  "ayuda",
  "precios",
]);

/** Slug libre: si ya existe o está reservado se le agrega un número. */
export function uniqueSlug(name: string, taken: readonly string[]): string {
  const base = slugify(name);
  const used = new Set(taken);
  if (!used.has(base) && !RESERVED.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export interface SignupInput {
  businessName: string;
  email: string;
  password: string;
}

export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

export function validateSignup(input: SignupInput): SignupErrors {
  const errors: SignupErrors = {};
  const b = validateBusinessName(input.businessName);
  const e = validateEmail(input.email);
  const p = validatePassword(input.password);
  if (b) errors.businessName = b;
  if (e) errors.email = e;
  if (p) errors.password = p;
  return errors;
}

export const trialEnd = (startMs: number, days: number) => startMs + days * DAY_MS;

export interface AccountStatus {
  state: AccountState;
  /** Días que quedan (0 si vence hoy o ya venció). */
  daysLeft: number;
  validUntil: number;
}

export function accountStatus(
  account: Pick<Account, "kind" | "validUntil">,
  nowMs: number,
): AccountStatus {
  const left = account.validUntil - nowMs;
  const daysLeft = Math.max(0, Math.ceil(left / DAY_MS));
  if (left <= 0) return { state: "vencida", daysLeft: 0, validUntil: account.validUntil };
  return {
    state: account.kind === "prueba" ? "prueba" : "activa",
    daysLeft,
    validUntil: account.validUntil,
  };
}

/** Mensaje corto del estado para el aviso de la cuenta. */
export function statusMessage(status: AccountStatus): string {
  if (status.state === "vencida") return "Tu cuenta venció";
  const dias = status.daysLeft === 1 ? "1 día" : `${status.daysLeft} días`;
  return status.state === "prueba" ? `Prueba gratis: te quedan ${dias}` : `Vigente: ${dias} más`;
}
