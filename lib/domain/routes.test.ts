import { describe, expect, it } from "vitest";
import { splitBusinessPath, withBusiness } from "./routes";

describe("direcciones por negocio", () => {
  it("separa el negocio de la pantalla", () => {
    expect(splitBusinessPath("/casa-verde/admin/platos")).toEqual({
      slug: "casa-verde",
      path: "/admin/platos",
    });
    expect(splitBusinessPath("/casa-verde/mesa/3/menu")).toEqual({
      slug: "casa-verde",
      path: "/mesa/3/menu",
    });
    expect(splitBusinessPath("/casa-verde/domicilio")).toEqual({
      slug: "casa-verde",
      path: "/domicilio",
    });
  });

  it("las rutas sin negocio son las de la demo", () => {
    expect(splitBusinessPath("/mesa/3/menu")).toEqual({ slug: null, path: "/mesa/3/menu" });
    expect(splitBusinessPath("/admin")).toEqual({ slug: null, path: "/admin" });
    expect(splitBusinessPath("/")).toEqual({ slug: null, path: "/" });
    expect(splitBusinessPath("/registro")).toEqual({ slug: null, path: "/registro" });
  });

  it("una sección no se toma por negocio", () => {
    expect(splitBusinessPath("/admin/mesa")).toEqual({ slug: null, path: "/admin/mesa" });
    expect(splitBusinessPath("/mesa/entrar")).toEqual({ slug: null, path: "/mesa/entrar" });
  });

  it("un negocio sin pantalla detrás no es una ruta de negocio", () => {
    expect(splitBusinessPath("/casa-verde")).toEqual({ slug: null, path: "/casa-verde" });
  });

  it("arma la ruta con o sin negocio", () => {
    expect(withBusiness("casa-verde", "/mesa/3/menu")).toBe("/casa-verde/mesa/3/menu");
    expect(withBusiness(null, "/mesa/3/menu")).toBe("/mesa/3/menu");
    expect(withBusiness("casa-verde", "/mesa/3?pin=1234")).toBe("/casa-verde/mesa/3?pin=1234");
  });

  it("separar y volver a armar devuelve la misma ruta", () => {
    for (const p of ["/casa-verde/admin", "/x1/mesa/12/plato/clasica-27", "/mesa/1"]) {
      const { slug, path } = splitBusinessPath(p);
      expect(withBusiness(slug, path)).toBe(p);
    }
  });
});
