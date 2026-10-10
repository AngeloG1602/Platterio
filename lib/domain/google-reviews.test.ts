import { describe, expect, it } from "vitest";
import { parseGoogleReviewInput } from "./google-reviews";

const ID = "ChIJN1t_tDeuEmsRUsoyG83frY4";

describe("enlace de reseñas de Google", () => {
  it("convierte el identificador del lugar en el enlace de reseña", () => {
    expect(parseGoogleReviewInput(` ${ID} `)).toEqual({
      ok: true,
      kind: "placeid",
      url: `https://search.google.com/local/writereview?placeid=${ID}`,
    });
  });

  it("acepta el enlace de reseña con el identificador y lo deja limpio", () => {
    expect(
      parseGoogleReviewInput(
        `https://search.google.com/local/writereview?placeid=${ID}&utm_source=x`,
      ),
    ).toEqual({
      ok: true,
      kind: "placeid",
      url: `https://search.google.com/local/writereview?placeid=${ID}`,
    });
  });

  it("acepta el enlace corto de Pedir reseñas", () => {
    expect(parseGoogleReviewInput("https://g.page/r/CabcDEF123456/review")).toEqual({
      ok: true,
      kind: "link",
      url: "https://g.page/r/CabcDEF123456/review",
    });
    expect(parseGoogleReviewInput("g.page/r/CabcDEF123456/review/")).toMatchObject({ ok: true });
  });

  it("rechaza enlaces de otros sitios, aunque parezcan de Google", () => {
    for (const bad of [
      "https://evil.example.com/local/writereview?placeid=" + ID,
      "https://google.com.evil.example/r/abcdef12",
      "https://g.page.evil.com/r/CabcDEF123456",
      "javascript:alert(1)",
      "ftp://g.page/r/CabcDEF123456",
    ])
      expect(parseGoogleReviewInput(bad).ok, bad).toBe(false);
  });

  it("pide lo que falta con un mensaje claro", () => {
    expect(parseGoogleReviewInput("")).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Pega/),
    });
    expect(parseGoogleReviewInput("https://search.google.com/local/writereview")).toMatchObject({
      ok: false,
      error: expect.stringMatching(/placeid/),
    });
    expect(parseGoogleReviewInput("hola")).toMatchObject({ ok: false });
  });
});
