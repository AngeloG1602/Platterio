import { describe, expect, it } from "vitest";
import {
  BODY_FONTS,
  brandVars,
  FONTS,
  HEADING_FONTS,
  coverTargetSize,
  logoTargetSize,
  resolveBrand,
  styleContrastIssues,
  validateCoverData,
  TEMPLATES,
  templateById,
  templateContrastIssues,
  validateLogoData,
  validateLogoFile,
} from "./brand";
import { contrast, parseHex } from "./color";
import { MENU_STYLES, styleById, shapeVars } from "./menu-style";

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
      expect(contrast(parseHex(vars["--accent-strong"]!)!, [255, 255, 255])).toBeGreaterThanOrEqual(
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

describe("estilos de la carta", () => {
  it("ids únicos y uno desconocido cae en el clásico", () => {
    expect(new Set(MENU_STYLES.map((s) => s.id)).size).toBe(MENU_STYLES.length);
    expect(styleById("nope").id).toBe("clasico");
    expect(styleById(undefined).id).toBe("clasico");
  });

  it("los fondos propios de cada estilo cumplen contraste AA", () => {
    for (const s of MENU_STYLES) expect(styleContrastIssues(s), s.name).toEqual([]);
  });

  it("los estilos oscuros traen fondos oscuros y los claros, claros", () => {
    for (const s of MENU_STYLES.filter((x) => x.colors)) {
      const bg = parseHex(s.colors!.bg)!;
      const ink = parseHex(s.colors!.ink)!;
      expect(contrast(bg, ink) > 7, s.name).toBe(true);
      const darkBg = bg.reduce((a, b) => a + b, 0) < 255 * 1.5;
      expect(darkBg, s.name).toBe(s.dark);
    }
  });

  it("el estilo clásico deja la paleta intacta", () => {
    const v = brandVars({
      accentColor: "#2D5FA3",
      brand: { template: "moderno", style: "clasico" },
    });
    expect(v["--bg"]).toBe("#F6F7F9");
    expect(v["--r-xl"]).toBe("22px");
    expect(v["--accent-ink"]).toBe("#FFFFFF");
  });

  it("un estilo con fondos propios los usa y trae su letra, pero la letra propia gana", () => {
    const base = { accentColor: "#E4572E", brand: { template: "calido", style: "bistro" } };
    expect(brandVars(base)["--bg"]).toBe("#15120F");
    expect(brandVars(base)["--brand-serif"]).toContain("Playfair");
    const own = { ...base, brand: { ...base.brand, headingFont: "lora" } };
    expect(brandVars(own)["--brand-serif"]).toContain("Lora");
  });

  it("sin 'styled' (personal) solo se aplica la paleta", () => {
    const v = brandVars(
      { accentColor: "#E4572E", brand: { template: "calido", style: "bistro" } },
      { styled: false },
    );
    expect(v["--bg"]).toBe("#FAF7F2");
    expect(v["color-scheme"]).toBe("light");
    expect(v["--r-xl"]).toBeUndefined();
  });

  it("en fondos oscuros el acento se aclara y el texto del botón es oscuro", () => {
    for (const accent of ["#E4572E", "#1C1917", "#2D5FA3", "#8C2F4B", "#D69A1E"]) {
      for (const style of MENU_STYLES.filter((s) => s.dark)) {
        const v = brandVars({
          accentColor: accent,
          brand: { template: "calido", style: style.id },
        });
        const strong = parseHex(v["--accent-strong"]!)!;
        expect(
          contrast(strong, parseHex(v["--accent-ink"]!)!),
          `${accent} ${style.id} botón`,
        ).toBeGreaterThanOrEqual(4.5);
        for (const bg of ["--bg", "--surface", "--surface-2"])
          expect(
            contrast(strong, parseHex(v[bg]!)!),
            `${accent} ${style.id} texto`,
          ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("en fondos oscuros los colores de estado se leen sobre sus fondos suaves", () => {
    for (const style of MENU_STYLES.filter((s) => s.dark)) {
      const v = brandVars({
        accentColor: "#E4572E",
        brand: { template: "calido", style: style.id },
      });
      for (const k of ["success", "warning", "danger"]) {
        expect(v[`--${k}-ink`], `${style.id} ${k}`).toBeDefined();
        expect(
          contrast(parseHex(v[`--${k}-ink`]!)!, parseHex(v["--surface"]!)!),
          `${style.id} ${k}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("en estilos claros con fondo propio el acento como texto cumple AA sobre fondo y tarjeta", () => {
    for (const accent of ["#E4572E", "#D69A1E", "#1E8A7A", "#2D5FA3"]) {
      for (const style of MENU_STYLES.filter((s) => !s.dark)) {
        const v = brandVars({
          accentColor: accent,
          brand: { template: "calido", style: style.id },
        });
        const strong = parseHex(v["--accent-strong"]!)!;
        expect(
          contrast(strong, [255, 255, 255]),
          `${accent} ${style.id} botón`,
        ).toBeGreaterThanOrEqual(4.5);
        for (const bg of ["--bg", "--surface-2"])
          expect(
            contrast(strong, parseHex(v[bg]!)!),
            `${accent} ${style.id} ${bg}`,
          ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("las esquinas escalan con el estilo", () => {
    expect(shapeVars(styleById("gourmet"))["--r-xl"]).toBe("11px");
    expect(shapeVars(styleById("fresco"))["--r-xl"]).toBe("35px");
  });

  it("hay nueve estilos, incluido el original", () => {
    expect(MENU_STYLES).toHaveLength(9);
    expect(MENU_STYLES[0]!.id).toBe("clasico");
  });
});

describe("portada", () => {
  it("acepta solo JPG o WebP livianos y reduce sin agrandar", () => {
    expect(validateCoverData("data:image/jpeg;base64,AAAA")).toBeNull();
    expect(validateCoverData("data:image/png;base64,AAAA")).toMatch(/no es una imagen/);
    expect(validateCoverData("data:image/webp;base64," + "A".repeat(450_001))).toMatch(/pesada/);
    expect(coverTargetSize(2560, 1280)).toEqual({ width: 1280, height: 640 });
    expect(coverTargetSize(800, 400)).toEqual({ width: 800, height: 400 });
  });
});
