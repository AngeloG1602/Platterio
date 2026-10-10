import { describe, expect, it } from "vitest";
import {
  accountStatus,
  DAY_MS,
  slugify,
  statusMessage,
  trialEnd,
  uniqueSlug,
  validateEmail,
  validatePassword,
  validateSignup,
} from "./accounts";

describe("validación del registro", () => {
  it("acepta datos correctos", () => {
    expect(
      validateSignup({ businessName: "Fogón 27", email: "dueno@fogon.co", password: "secreta123" }),
    ).toEqual({});
  });

  it("explica cada error en español", () => {
    const e = validateSignup({ businessName: " ", email: "no-es-correo", password: "corta" });
    expect(e.businessName).toMatch(/nombre de tu negocio/);
    expect(e.email).toMatch(/correo/);
    expect(e.password).toMatch(/al menos 8/);
  });

  it("el correo no distingue mayúsculas ni espacios", () => {
    expect(validateEmail("  Dueno@Fogon.CO ")).toBeNull();
    expect(validateEmail("")).toMatch(/Escribe tu correo/);
  });

  it("la contraseña no puede ser solo espacios", () => {
    expect(validatePassword("        ")).toMatch(/solo espacios/);
    expect(validatePassword("a".repeat(101))).toMatch(/larga/);
  });
});

describe("dirección corta del negocio", () => {
  it("quita tildes y signos", () => {
    expect(slugify("Fogón 27")).toBe("fogon-27");
    expect(slugify("  ¡Café & Pan! ")).toBe("cafe-pan");
    expect(slugify("###")).toBe("negocio");
  });

  it("no corta a la mitad de un guion", () => {
    expect(slugify("a".repeat(29) + " bbbb").endsWith("-")).toBe(false);
  });

  it("agrega un número si ya existe o es una ruta reservada", () => {
    expect(uniqueSlug("Fogón 27", [])).toBe("fogon-27");
    expect(uniqueSlug("Fogón 27", ["fogon-27"])).toBe("fogon-27-2");
    expect(uniqueSlug("Fogón 27", ["fogon-27", "fogon-27-2"])).toBe("fogon-27-3");
    expect(uniqueSlug("Admin", [])).toBe("admin-2");
    expect(uniqueSlug("Demo", [])).toBe("demo-2");
    expect(uniqueSlug("Personal", [])).toBe("personal-2");
    expect(uniqueSlug("Mesa", [])).toBe("mesa-2");
    expect(uniqueSlug("Reservas", [])).toBe("reservas-2");
  });
});

describe("estado de la cuenta", () => {
  const t0 = Date.UTC(2026, 9, 8, 12);
  const trial = { kind: "prueba" as const, validUntil: trialEnd(t0, 7) };

  it("la prueba dura 7 días", () => {
    expect(trial.validUntil - t0).toBe(7 * DAY_MS);
    expect(accountStatus(trial, t0)).toMatchObject({ state: "prueba", daysLeft: 7 });
  });

  it("cuenta los días que quedan, redondeando hacia arriba", () => {
    expect(accountStatus(trial, t0 + 6 * DAY_MS + 1000).daysLeft).toBe(1);
    expect(accountStatus(trial, t0 + 3 * DAY_MS).daysLeft).toBe(4);
  });

  it("vence justo al cumplirse el plazo", () => {
    expect(accountStatus(trial, trial.validUntil - 1).state).toBe("prueba");
    expect(accountStatus(trial, trial.validUntil)).toMatchObject({ state: "vencida", daysLeft: 0 });
    expect(accountStatus(trial, trial.validUntil + DAY_MS).state).toBe("vencida");
  });

  it("una suscripción vigente es activa, y vencida al terminar", () => {
    const paid = { kind: "suscripcion" as const, validUntil: t0 + 30 * DAY_MS };
    expect(accountStatus(paid, t0).state).toBe("activa");
    expect(accountStatus(paid, t0 + 31 * DAY_MS).state).toBe("vencida");
  });

  it("redacta el mensaje", () => {
    expect(statusMessage(accountStatus(trial, t0))).toBe("Prueba gratis: te quedan 7 días");
    expect(statusMessage(accountStatus(trial, t0 + 6.5 * DAY_MS))).toBe(
      "Prueba gratis: te quedan 1 día",
    );
    expect(statusMessage(accountStatus(trial, t0 + 9 * DAY_MS))).toBe("Tu cuenta venció");
  });
});
