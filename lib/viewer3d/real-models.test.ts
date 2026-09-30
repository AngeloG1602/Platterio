import { describe, expect, it } from "vitest";
import { customizationSpecFor } from "@/lib/data/customization-specs";
import { EMPTY_CUSTOMIZATION, setReplacement, setUnits } from "@/lib/domain/customization";
import { realModelFor, realPartId, realRuleFor } from "./real-models";
import { buildStack } from "./stack";

const clasica = customizationSpecFor("clasica-27")!;
const model = realModelFor("clasica-27")!;
const E = EMPTY_CUSTOMIZATION;
const nodesOf = (stack: ReturnType<typeof buildStack>) =>
  stack.map((l) => realRuleFor(model, l)?.nodes.join("+") ?? "procedural");

describe("modelo real de la Clásica 27", () => {
  it("la Clásica como viene usa solo piezas reales", () => {
    expect(nodesOf(buildStack(clasica, E))).toEqual([
      "pan_base",
      "mostaza_1",
      "lechuga_1",
      "tomate_1",
      "carne_1",
      "queso_1",
      "cebolla_1",
      "pan_tapa",
    ]);
  });

  it("un reemplazo sin pieza real va procedural; uno con pieza real la reutiliza", () => {
    const c = setReplacement(
      clasica,
      setReplacement(clasica, setReplacement(clasica, E, "pan", "pan_papa"), "carne", "pollo"),
      "cebolla",
      "cebolla_morada",
    );
    const stack = buildStack(clasica, c);
    const by = (id: string) =>
      realRuleFor(
        model,
        stack.find((l) => l.id === id)!,
      );
    expect(by("pan_base")).toBeUndefined();
    expect(by("pan_tapa")).toBeUndefined();
    expect(by("carne_1")).toBeUndefined();
    // La cebolla morada es la del modelo tal cual; la caramelizada, la misma teñida.
    expect(by("cebolla_1")).toMatchObject({ nodes: ["cebolla_1"], option: "cebolla_morada" });
    expect(by("cebolla_1")?.tint).toBeUndefined();
    expect(
      realRuleFor(
        model,
        buildStack(clasica, E).find((l) => l.id === "cebolla_1")!,
      )?.tint,
    ).toBeTruthy();
  });

  it("las unidades extra repiten la misma pieza real", () => {
    const stack = buildStack(clasica, setUnits(clasica, E, "carne", 2, "doble"), "doble");
    const meats = stack.filter((l) => l.key === "carne").map((l) => realRuleFor(model, l));
    expect(meats).toHaveLength(2);
    expect(new Set(meats.map((r) => realPartId(r!))).size).toBe(1);
  });

  it("los adicionales que el modelo no trae van procedurales", () => {
    const stack = buildStack(clasica, setUnits(clasica, E, "tocineta", 1));
    expect(
      realRuleFor(
        model,
        stack.find((l) => l.key === "tocineta")!,
      ),
    ).toBeUndefined();
  });

  it("cada tinte distinto es una pieza distinta", () => {
    const ids = model.rules.map(realPartId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
