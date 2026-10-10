import { describe, expect, it } from "vitest";
import {
  canAddUser,
  clientsToCover,
  minimumWageShare,
  monthlyEquivalent,
  netAfterHotmart,
  planAllows,
  PLAN_LIMITS,
  resolvePlan,
  SMMLV_2026,
  yearlySaving,
} from "./pricing";

describe("plan de cada negocio", () => {
  it("sin plan guardado tiene todo (demo y prueba)", () => {
    expect(resolvePlan(undefined)).toBe("completo");
    expect(resolvePlan("otro")).toBe("completo");
    expect(resolvePlan("digital")).toBe("digital");
    expect(planAllows(undefined, "salon")).toBe(true);
  });

  it("el Digital no incluye el salón ni lo demás del Completo", () => {
    for (const f of PLAN_LIMITS.completo.features) {
      expect(planAllows("completo", f)).toBe(true);
      expect(planAllows("digital", f)).toBe(false);
    }
  });

  it("limita las personas del equipo según el plan", () => {
    expect(canAddUser("digital", 2)).toEqual({ ok: true });
    expect(canAddUser("digital", 3)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Digital/),
    });
    expect(canAddUser("completo", 19)).toEqual({ ok: true });
    expect(canAddUser("completo", 20)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Completo/),
    });
  });
});

describe("cuentas de precios", () => {
  it("el anual de 2 meses gratis ahorra un sexto", () => {
    expect(yearlySaving(149_000, 1_490_000)).toEqual({ pesos: 298_000, percent: 17 });
    expect(yearlySaving(149_000, 700_000)).toEqual({ pesos: 1_088_000, percent: 61 });
    expect(yearlySaving(100, 5_000).pesos).toBe(0);
  });

  it("calcula el equivalente mensual", () => {
    expect(monthlyEquivalent(1_490_000)).toBe(124_167);
    expect(monthlyEquivalent(700_000)).toBe(58_333);
  });

  it("compara con el salario mínimo de 2026", () => {
    expect(SMMLV_2026).toBe(1_750_905);
    expect(minimumWageShare(1_490_000)).toBeCloseTo(0.851, 2);
    expect(minimumWageShare(700_000)).toBeCloseTo(0.4, 2);
  });

  it("el plan Completo anual cuesta menos que un salario mínimo", () => {
    expect(1_490_000).toBeLessThan(SMMLV_2026);
  });
});

describe("proyección", () => {
  const trm = 3216;
  it("descuenta la comisión de Hotmart", () => {
    expect(netAfterHotmart(700_000, trm)).toBe(629_092);
    expect(netAfterHotmart(149_000, trm)).toBe(132_641);
    expect(netAfterHotmart(69_000, trm)).toBe(60_561);
  });

  it("cuenta los clientes para cubrir el hosting", () => {
    const infra = 1_785_000;
    expect(clientsToCover(infra, netAfterHotmart(700_000, trm))).toBe(3);
    expect(clientsToCover(infra, netAfterHotmart(1_490_000, trm))).toBe(2);
    expect(clientsToCover(infra, netAfterHotmart(69_000, trm) * 12)).toBe(3);
    expect(clientsToCover(infra, 0)).toBe(Infinity);
  });
});
