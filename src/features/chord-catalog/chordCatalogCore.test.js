import { describe, test, expect } from "vitest";
import {
  chordDbUrl,
  chordDbUrlLocal,
  publicRelToLocal,
  buildChordDbFallbackUrl,
  buildChordDbCacheKey,
  buildChordDbBassSuffix,
  buildChordDbSuffixes,
  parseJsonResponseStrict,
  CHORD_DB_PAGES_BASE,
} from "./chordCatalogCore.js";

// ── chordDbUrl ────────────────────────────────────────────────────────────────

describe("chordDbUrl", () => {
  test("genera ruta relativa sin base para key y sufijo simples", () => {
    expect(chordDbUrl("G", "major")).toBe("chords-db/G/major.json");
  });

  test("G/B: keyName=G, suffix=major_b → chords-db/G/major_b.json", () => {
    expect(chordDbUrl("G", "major_b")).toBe("chords-db/G/major_b.json");
  });

  test("D/A: keyName=D, suffix=major_a → chords-db/D/major_a.json", () => {
    expect(chordDbUrl("D", "major_a")).toBe("chords-db/D/major_a.json");
  });

  test("codifica sostenido en keyName: A# → A%23", () => {
    expect(chordDbUrl("A#", "7")).toBe("chords-db/A%23/7.json");
  });

  test("formato 7: chords-db/C/7.json", () => {
    expect(chordDbUrl("C", "7")).toBe("chords-db/C/7.json");
  });
});

// ── chordDbUrlLocal + publicRelToLocal ────────────────────────────────────────

describe("chordDbUrlLocal", () => {
  test("termina con la ruta chords-db correcta", () => {
    expect(chordDbUrlLocal("G", "major")).toContain("chords-db/G/major.json");
  });

  test("coherente con publicRelToLocal para la misma ruta relativa", () => {
    const rel = chordDbUrl("G", "major");
    expect(chordDbUrlLocal("G", "major")).toBe(publicRelToLocal(rel));
  });
});

describe("publicRelToLocal", () => {
  test("convierte ruta relativa de catálogo a URL local con base", () => {
    const rel = chordDbUrl("D", "major_a");
    const local = publicRelToLocal(rel);
    expect(local).toContain("chords-db/D/major_a.json");
  });

  test("elimina la barra inicial si ya la tiene", () => {
    const local = publicRelToLocal("/chords-db/G/major.json");
    expect(local).toContain("chords-db/G/major.json");
    expect(local).not.toMatch(/\/\//); // sin doble barra interior
  });
});

// ── buildChordDbFallbackUrl ───────────────────────────────────────────────────

describe("buildChordDbFallbackUrl", () => {
  test("antepone CHORD_DB_PAGES_BASE a la ruta relativa", () => {
    const rel = chordDbUrl("G", "major");
    expect(buildChordDbFallbackUrl(rel)).toBe(
      `${CHORD_DB_PAGES_BASE}chords-db/G/major.json`
    );
  });

  test("la URL de fallback contiene github.io", () => {
    expect(buildChordDbFallbackUrl(chordDbUrl("D", "major_a"))).toContain("github.io");
  });

  test("coincide con la construcción inline original: PAGES_BASE + urlRel", () => {
    const urlRel = chordDbUrl("G", "major_b");
    expect(buildChordDbFallbackUrl(urlRel)).toBe(`${CHORD_DB_PAGES_BASE}${urlRel}`);
  });
});

// ── buildChordDbCacheKey ──────────────────────────────────────────────────────

describe("buildChordDbCacheKey", () => {
  test("une keyName y suffix con barra: G/major_b", () => {
    expect(buildChordDbCacheKey("G", "major_b")).toBe("G/major_b");
  });

  test("D/A → D/major_a", () => {
    expect(buildChordDbCacheKey("D", "major_a")).toBe("D/major_a");
  });

  test("acorde sin bajo: C/major", () => {
    expect(buildChordDbCacheKey("C", "major")).toBe("C/major");
  });
});

// ── buildChordDbBassSuffix ────────────────────────────────────────────────────

describe("buildChordDbBassSuffix", () => {
  test("G/B: bassPc=11 (B) → 'major_b'", () => {
    // B (PC 11) es inequívoco en sostenidos y bemoles
    expect(buildChordDbBassSuffix("major", 11, false)).toBe("major_b");
    expect(buildChordDbBassSuffix("major", 11, true)).toBe("major_b");
  });

  test("D/A: bassPc=9 (A) → 'major_a'", () => {
    // A (PC 9) es inequívoco
    expect(buildChordDbBassSuffix("major", 9, false)).toBe("major_a");
    expect(buildChordDbBassSuffix("major", 9, true)).toBe("major_a");
  });

  test("F/C: bassPc=0 (C) → 'major_c'", () => {
    expect(buildChordDbBassSuffix("major", 0, false)).toBe("major_c");
  });

  test("bassPc=null → null (sin bajo externo)", () => {
    expect(buildChordDbBassSuffix("major", null, false)).toBeNull();
  });

  test("bemoles: PC 10 → 'bb' (Bb)", () => {
    expect(buildChordDbBassSuffix("7", 10, false)).toBe("7_bb");
  });

  test("sostenidos: PC 10 → 'a#' (A#)", () => {
    expect(buildChordDbBassSuffix("7", 10, true)).toBe("7_a#");
  });

  test("sufijo compuesto: maj7 con bajo B → 'maj7_b'", () => {
    expect(buildChordDbBassSuffix("maj7", 11, false)).toBe("maj7_b");
  });
});

// ── buildChordDbSuffixes ──────────────────────────────────────────────────────

describe("buildChordDbSuffixes", () => {
  test("con bajo distinto: [suffixBase, bassSuffix] (genérico primero, bajo segundo)", () => {
    // El genérico se prueba primero; el de bajo específico actúa como fallback
    expect(buildChordDbSuffixes("major", "major_b")).toEqual(["major", "major_b"]);
  });

  test("sin bajo (null): solo [suffixBase]", () => {
    expect(buildChordDbSuffixes("major", null)).toEqual(["major"]);
  });

  test("caso degenerado — bassSuffix igual a base: solo [suffixBase]", () => {
    expect(buildChordDbSuffixes("major", "major")).toEqual(["major"]);
  });

  test("sufijo 7 con bajo bb: ['7', '7_bb']", () => {
    expect(buildChordDbSuffixes("7", "7_bb")).toEqual(["7", "7_bb"]);
  });
});

// ── parseJsonResponseStrict ───────────────────────────────────────────────────

function makeResponse({ contentType, body = "{}", jsonParseThrows = false }) {
  return {
    headers: { get: (name) => (name === "content-type" ? contentType : null) },
    text: async () => body,
    json: jsonParseThrows
      ? async () => { throw new SyntaxError("Unexpected token"); }
      : async () => JSON.parse(body),
  };
}

describe("parseJsonResponseStrict", () => {
  test("content-type application/json: parsea y devuelve el objeto JSON", async () => {
    const res = makeResponse({
      contentType: "application/json",
      body: '{"positions":[{"frets":"x32010"}]}',
    });
    const result = await parseJsonResponseStrict(res, "http://example.com/C/major.json");
    expect(result).toEqual({ positions: [{ frets: "x32010" }] });
  });

  test("content-type con charset (application/json; charset=utf-8): parsea correctamente", async () => {
    const res = makeResponse({
      contentType: "application/json; charset=utf-8",
      body: '{"key":"G"}',
    });
    const result = await parseJsonResponseStrict(res, "http://example.com/G/major.json");
    expect(result).toEqual({ key: "G" });
  });

  test("content-type text/html: lanza error que incluye el tipo y una muestra del cuerpo", async () => {
    const res = makeResponse({
      contentType: "text/html",
      body: "<html><body>Not found</body></html>",
    });
    await expect(
      parseJsonResponseStrict(res, "http://example.com/missing.json")
    ).rejects.toThrow("text/html");
    // Nueva instancia porque text() ya fue consumida en la primera llamada
    const res2 = makeResponse({ contentType: "text/html", body: "<html>Not found</html>" });
    await expect(
      parseJsonResponseStrict(res2, "http://example.com/missing.json")
    ).rejects.toThrow("Not found");
  });

  test("content-type text/html: el mensaje de error menciona la URL recibida", async () => {
    const res = makeResponse({ contentType: "text/html", body: "" });
    await expect(
      parseJsonResponseStrict(res, "http://example.com/chord.json")
    ).rejects.toThrow("http://example.com/chord.json");
  });

  test("sin header content-type (null): lanza error con 'sin content-type'", async () => {
    const res = makeResponse({ contentType: null, body: "" });
    await expect(
      parseJsonResponseStrict(res, "http://example.com/chord.json")
    ).rejects.toThrow("sin content-type");
  });

  test("sin header content-type (undefined): lanza error con 'sin content-type'", async () => {
    const res = makeResponse({ contentType: undefined, body: "" });
    await expect(
      parseJsonResponseStrict(res, "http://example.com/chord.json")
    ).rejects.toThrow("sin content-type");
  });

  test("content-type application/json con cuerpo JSON inválido: propaga el error de parseo", async () => {
    const res = makeResponse({
      contentType: "application/json",
      jsonParseThrows: true,
    });
    await expect(
      parseJsonResponseStrict(res, "http://example.com/chord.json")
    ).rejects.toThrow();
  });

  test("content-type vnd.api+json (contiene 'json'): acepta y parsea", async () => {
    const res = makeResponse({
      contentType: "application/vnd.api+json",
      body: '{"data":null}',
    });
    const result = await parseJsonResponseStrict(res, "http://example.com/chord.json");
    expect(result).toEqual({ data: null });
  });
});
