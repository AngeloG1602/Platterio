import { describe, expect, it } from "vitest";
import { unionById } from "./merge";

describe("mezcla de colecciones que solo crecen", () => {
  it("conserva lo que solo tiene una de las dos pestañas, sin repetir", () => {
    const local = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const incoming = [{ id: "a" }, { id: "b" }];
    expect(unionById(local, incoming).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(unionById(incoming, local).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("si no hay nada local o falta la colección, usa lo que llega", () => {
    expect(unionById(undefined, [{ id: "a" }])).toEqual([{ id: "a" }]);
    expect(unionById([], [{ id: "a" }])).toEqual([{ id: "a" }]);
    expect(unionById([{ id: "a" }], undefined)).toEqual([{ id: "a" }]);
  });

  it("no cambia las entradas ni los arreglos originales", () => {
    const local = [{ id: "x" }];
    const incoming = [{ id: "y" }];
    const out = unionById(local, incoming);
    expect(out).not.toBe(incoming);
    expect(local).toHaveLength(1);
    expect(incoming).toHaveLength(1);
  });
});
