import { describe, expect, it } from "vitest";
import { bayesianAverage, globalAverage, ratingStatsByDish } from "./ratings";
import type { Stars } from "./types";

const r = (dishId: string, stars: Stars) => ({ dishId, stars });

describe("calificaciones", () => {
  it("agrega por plato", () => {
    const stats = ratingStatsByDish([r("a", 5), r("a", 3), r("b", 4)]);
    expect(stats.get("a")).toEqual({ count: 2, sum: 8, average: 4 });
    expect(stats.get("b")?.average).toBe(4);
    expect(stats.get("c")).toBeUndefined();
  });

  it("calcula el promedio global", () => {
    expect(globalAverage([r("a", 5), r("b", 3)])).toBe(4);
    expect(globalAverage([])).toBeNull();
  });

  it("el bayesiano no premia a quien tiene pocas reseñas", () => {
    const m = 4.3;
    const dosDeCinco = bayesianAverage({ count: 2, sum: 10 }, m);
    const cienDeCuatroSeis = bayesianAverage({ count: 100, sum: 460 }, m);
    expect(cienDeCuatroSeis).toBeGreaterThan(dosDeCinco);
    expect(bayesianAverage({ count: 0, sum: 0 }, m)).toBe(m);
  });
});
