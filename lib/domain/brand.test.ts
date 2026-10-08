import { describe, expect, it } from "vitest";
import {
  BODY_FONTS,
  brandVars,
  FONTS,
  HEADING_FONTS,
  logoTargetSize,
  resolveBrand,
  TEMPLATES,
  templateById,
  templateContrastIssues,
  validateLogoData,
  validateLogoFile,
} from "./brand";
import { contrast, parseHex } from "./color";

describe("plantillas", () => {
  it("todas cumplen contraste AA para el texto", () => {
    for (const t of TEMPLATES) expect(templateContrastIssues(t), t.name).toEqual([]);
  });

  it("usan solo tipografías incluidas y el texto corrido es de las permitidas", () => {
    for (const t of TEMPLATES) {
      expect(FONTS[t.headingFont]).toBeDefined();
      expect(HEADING_FONTS).toContain(t.headingFont);
      expect(BODY_FONTS).toContain(t.bodyFont);
    }
  });

  it("ids únicos y una plantilla desconocida cae en la de la casa", () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(templateById("nope").id).toBe("calido");
    expect(templateById(undefined).id).toBe("calido");
  });

  it("el acento de cada plantilla alcanza contraste con blanco tras oscurecerlo", () => {
    for (const t of TEMPLATES) {
      const vars = brandVars({ accentColor: t.accent, brand: { template: t.id } });
      expect(contrast(parseHex(vars["--accent-strong"])!, [255, 255, 255])).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
});

describe("marca efectiva", () => {
  it("sin marca usa la plantilla de la casa y el acento del negocio", () => {
    const r = resolveBrand({ accentColor: "#123456" });
    expect(r).toMatchObject({ accent: "#123456", headingFont: "fraunces", bodyFont: "inter" });
  });

  it("las tipografías propias ganan a las de la plantilla", () => {
    const r = resolveBrand({
      accentColor: "#E4572E",
      brand: { template: "moderno", headingFont: "lora" },
    });
    expect(r.headingFont).toBe("lora");
    expect(r.bodyFont).toBe("inter");
  });

  it("entrega las variables CSS de color y letra", () => {
    const v = brandVars({ accentColor: "#2D5FA3", brand: { template: "moderno" } });
    expect(v["--bg"]).toBe("#F6F7F9");
    expect(v["--accent"]).toBe("#2D5FA3");
    expect(v["--brand-serif"]).toContain("Space Grotesk");
  });
});

describe("logo", () => {
  it("acepta PNG, JPG y WebP livianos", () => {
    expect(validateLogoFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateLogoFile({ type: "image/svg+xml", size: 1000 })).toMatch(/PNG, JPG o WebP/);
    expect(validateLogoFile({ type: "image/png", size: 4 * 1024 * 1024 })).toMatch(/3 MB/);
  });

  it("valida el logo ya reducido", () => {
    expect(validateLogoData("data:image/png;base64,AAAA")).toBeNull();
    expect(validateLogoData("data:text/html;base64,AAAA")).toMatch(/no es una imagen/);
    expect(validateLogoData("data:image/png;base64," + "A".repeat(300_001))).toMatch(/pesado/);
  });

  it("reduce sin deformar y nunca agranda", () => {
    expect(logoTargetSize(1024, 512)).toEqual({ width: 512, height: 256 });
    expect(logoTargetSize(200, 100)).toEqual({ width: 200, height: 100 });
  });
});
