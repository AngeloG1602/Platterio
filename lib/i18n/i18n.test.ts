import { afterEach, describe, expect, it } from "vitest";
import { CATEGORIES, DISHES, TIME_SLOTS } from "@/lib/data/catalog";
import { ALLERGEN_LABEL, SPICE_LABEL } from "@/lib/domain/allergens";
import { STATUS_LABEL, STATUS_MESSAGE } from "@/lib/domain/orderStatus";
import { REASON_LABEL } from "@/lib/domain/recommender";
import { enabledLangs, interpolate, localized, pickLang, setLang, t, tn } from "./index";
import { EN } from "./en";

afterEach(() => setLang("es"));

describe("t()", () => {
  it("en español devuelve el mismo texto y completa las marcas", () => {
    expect(t("Ver la carta")).toBe("Ver la carta");
    expect(t("Mesa {n}", { n: 3 })).toBe("Mesa 3");
  });
  it("en inglés traduce y, si falta, cae en el español", () => {
    setLang("en");
    expect(t("Ver la carta")).toBe("See the menu");
    expect(t("Mesa {n}", { n: 3 })).toBe("Table 3");
    expect(t("Este texto no está traducido")).toBe("Este texto no está traducido");
  });
  it("deja intactas las marcas sin valor", () => {
    expect(interpolate("Hola {name}", {})).toBe("Hola {name}");
  });
  it("pluraliza con la palabra traducida", () => {
    setLang("en");
    expect(tn(1, "plato", "platos")).toBe("1 dish");
    expect(tn(3, "plato", "platos")).toBe("3 dishes");
  });
});

describe("idioma inicial", () => {
  it("el español siempre está disponible", () => {
    expect(enabledLangs(undefined)).toEqual(["es", "en"]);
    expect(enabledLangs(["en"])).toEqual(["es", "en"]);
    expect(enabledLangs(["es"])).toEqual(["es"]);
    expect(enabledLangs(["fr", "es"])).toEqual(["es"]);
  });
  it("gana lo que eligió el cliente, luego el navegador, si el negocio lo ofrece", () => {
    const both = enabledLangs(["es", "en"]);
    expect(pickLang({ saved: "es", browser: "en-US", enabled: both })).toBe("es");
    expect(pickLang({ saved: null, browser: "en-US", enabled: both })).toBe("en");
    expect(pickLang({ saved: null, browser: "fr-FR", enabled: both })).toBe("es");
    expect(pickLang({ saved: "en", browser: "en-US", enabled: ["es"] })).toBe("es");
    expect(pickLang({ saved: null, browser: "en-GB", enabled: ["es"] })).toBe("es");
  });
});

describe("datos del negocio", () => {
  const dish = { name: "Clásica 27", description: "Hola", en: { name: "Classic 27" } };
  it("usa la traducción propia, luego el diccionario y por último el español", () => {
    expect(localized(dish, "name", "es")).toBe("Clásica 27");
    expect(localized(dish, "name", "en")).toBe("Classic 27");
    expect(localized({ name: "Pan brioche" }, "name", "en")).toBe("Brioche bun");
    expect(localized(dish, "description", "en")).toBe("Hola");
  });
});

describe("diccionario", () => {
  const marks = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  it("cada traducción conserva las mismas marcas y no está vacía", () => {
    for (const [es, en] of Object.entries(EN)) {
      expect(en.trim(), es).not.toBe("");
      expect(marks(en), es).toEqual(marks(es));
    }
  });
  it("traduce todo el catálogo de la demo", () => {
    const missing: string[] = [];
    const need = (s: string | undefined) => {
      if (s && !(s in EN)) missing.push(s);
    };
    CATEGORIES.forEach((c) => need(c.name));
    TIME_SLOTS.forEach((s) => need(s.name));
    for (const d of DISHES) {
      need(d.name);
      need(d.description);
      d.variants.forEach((v) => need(v.name));
      d.ingredients.forEach((i) => {
        need(i.name);
        need(i.description);
      });
    }
    expect(missing).toEqual([]);
  });
  it("traduce las etiquetas fijas que ve el cliente", () => {
    const labels = [
      ...Object.values(ALLERGEN_LABEL),
      ...SPICE_LABEL,
      ...Object.values(STATUS_LABEL),
      ...Object.values(STATUS_MESSAGE),
      ...Object.values(REASON_LABEL),
    ];
    expect(labels.filter((l) => !(l in EN))).toEqual([]);
  });
});
