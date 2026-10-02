import { describe, expect, it } from "vitest";
import { customizationSpecFor } from "@/lib/data/customization-specs";
import { EMPTY_CUSTOMIZATION, setUnits, toggleRemoved } from "@/lib/domain/customization";
import { coverage, layoutFor, placeOnPlate, rulesFromNodeNames } from "./layouts";
import { buildStack } from "./stack";

const calentado = customizationSpecFor("calentado-de-la-casa")!;
const clasica = customizationSpecFor("clasica-27")!;
const E = EMPTY_CUSTOMIZATION;
const plate = layoutFor("calentado-de-la-casa");
if (plate.type !== "plato") throw new Error("el calentado debe ir en plato");

describe("platos a la carta", () => {
  it("las hamburguesas se apilan y el calentado va repartido en el plato", () => {
    expect(layoutFor("clasica-27").type).toBe("pila");
    expect(plate.type).toBe("plato");
  });

  it("cada componente tiene su lugar y el huevo va encima del arroz", () => {
    const placed = placeOnPlate(buildStack(calentado, E), plate, 0);
    const at = (key: string) => placed.find((p) => p.layer.key === key)!;
    expect(placed.map((p) => p.layer.key)).toEqual(["calentado", "huevo", "chorizo", "arepa"]);
    const base = at("calentado");
    // Encima del arroz, hundido un poco para que no quede flotando.
    expect(at("huevo").y).toBeGreaterThan(base.y);
    expect(at("huevo").y).toBeLessThan(base.y + base.layer.thickness);
    expect(at("chorizo").y).toBeCloseTo(at("chorizo").layer.thickness / 2);
  });

  it("las unidades extra van al lado, no en el mismo sitio", () => {
    const c = setUnits(calentado, E, "chorizo", 2);
    const chorizos = placeOnPlate(buildStack(calentado, c), plate, 0).filter(
      (p) => p.layer.key === "chorizo",
    );
    expect(chorizos).toHaveLength(2);
    expect(
      Math.hypot(chorizos[0]!.x - chorizos[1]!.x, chorizos[0]!.z - chorizos[1]!.z),
    ).toBeGreaterThan(1);
  });

  it("al separar, todo se levanta y lo de encima sube más", () => {
    const layers = buildStack(calentado, E);
    const closed = placeOnPlate(layers, plate, 0);
    const open = placeOnPlate(layers, plate, 1);
    open.forEach((p, i) => expect(p.y).toBeGreaterThan(closed[i]!.y));
    const lift = (key: string) => {
      const i = layers.findIndex((l) => l.key === key);
      return open[i]!.y - closed[i]!.y;
    };
    expect(lift("huevo")).toBeGreaterThan(lift("chorizo"));
  });

  it("quitar un componente lo saca del plato", () => {
    const keys = placeOnPlate(
      buildStack(calentado, toggleRemoved(calentado, E, "arepa")),
      plate,
      0,
    ).map((p) => p.layer.key);
    expect(keys).not.toContain("arepa");
  });
});

describe("convención de nombres de los modelos", () => {
  it("lee ingredientes, unidades, mitades del pan y reemplazos", () => {
    const { rules, unknown } = rulesFromNodeNames(
      [
        "pan_base",
        "pan_tapa",
        "carne_1",
        "carne_2",
        "carne@pollo",
        "queso",
        "pan_base@pan_papa",
        "mostaza_1",
        "carne@pato",
      ],
      clasica,
    );
    expect(rules).toEqual([
      { slot: "pan", part: "base", nodes: ["pan_base"] },
      { slot: "pan", part: "tapa", nodes: ["pan_tapa"] },
      { slot: "carne", nodes: ["carne_1"] },
      { slot: "carne", option: "pollo", nodes: ["carne@pollo"] },
      { slot: "queso", nodes: ["queso"] },
      { slot: "pan", option: "pan_papa", part: "base", nodes: ["pan_base@pan_papa"] },
    ]);
    // "mostaza" no es una ranura de la Clásica y "pato" no es una opción de la carne.
    expect(unknown).toEqual(["mostaza_1", "carne@pato"]);
  });

  it("el reporte de cobertura dice qué va real y qué procedural", () => {
    const { rules } = rulesFromNodeNames(["calentado", "huevo_1", "chorizo@salchicha"], calentado);
    const rows = coverage(calentado, rules);
    const row = (k: string) => rows.find((r) => r.slot === k)!;
    expect(row("calentado").options[0]).toMatchObject({ covered: true });
    expect(row("chorizo").options.map((o) => o.covered)).toEqual([false, true]);
    expect(row("arepa").options.every((o) => !o.covered)).toBe(true);
  });
});
