import { describe, test, expect, vi, afterEach } from "vitest";
import {
  chordDbUrl,
  chordDbUrlLocal,
  publicRelToLocal,
  buildChordDbFallbackUrl,
  buildChordDbCacheKey,
  buildChordDbBassSuffix,
  buildChordDbSuffixes,
  parseJsonResponseStrict,
  fetchChordDbJsonWithFallback,
  lookupChordCatalogVoicings,
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

// ── fetchChordDbJsonWithFallback ──────────────────────────────────────────────

function makeFetchMock({ localOk, localCt = "application/json", localBody = '{"positions":[]}',
                         fallbackOk, fallbackCt = "application/json", fallbackBody = '{"positions":[{"frets":"320003"}]}' }) {
  return vi.fn(async (url) => {
    const isLocal = !String(url).includes("github.io");
    if (isLocal) {
      if (!localOk) return { ok: false, status: 404, url };
      return {
        ok: true, url,
        headers: { get: (n) => n === "content-type" ? localCt : null },
        text: async () => localBody,
        json: async () => JSON.parse(localBody),
      };
    }
    // Fallback
    if (!fallbackOk) return { ok: false, status: 404, url };
    return {
      ok: true, url,
      headers: { get: (n) => n === "content-type" ? fallbackCt : null },
      text: async () => fallbackBody,
      json: async () => JSON.parse(fallbackBody),
    };
  });
}

describe("fetchChordDbJsonWithFallback", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  test("local OK: devuelve json correcto y no llama al fallback", async () => {
    const mockFetch = makeFetchMock({ localOk: true, fallbackOk: false });
    vi.stubGlobal("fetch", mockFetch);

    const { json, usedUrl } = await fetchChordDbJsonWithFallback("chords-db/C/major.json");

    expect(json).toEqual({ positions: [] });
    expect(usedUrl).toBeTruthy();
    // Solo debería haberse llamado una vez (URL local)
    const urls = mockFetch.mock.calls.map(([u]) => u);
    expect(urls.some((u) => u.includes("github.io"))).toBe(false);
  });

  test("local 404 + fallback OK: devuelve json del fallback", async () => {
    const mockFetch = makeFetchMock({ localOk: false, fallbackOk: true });
    vi.stubGlobal("fetch", mockFetch);

    const { json } = await fetchChordDbJsonWithFallback("chords-db/C/major.json");

    expect(json.positions).toHaveLength(1);
    expect(json.positions[0].frets).toBe("320003");
    // Debe haberse llamado con la URL del fallback
    const urls = mockFetch.mock.calls.map(([u]) => u);
    expect(urls.some((u) => u.includes("github.io"))).toBe(true);
  });

  test("local 404 + fallback 404: lanza error", async () => {
    vi.stubGlobal("fetch", makeFetchMock({ localOk: false, fallbackOk: false }));

    await expect(
      fetchChordDbJsonWithFallback("chords-db/C/major.json")
    ).rejects.toThrow();
  });

  test("local OK pero content-type incorrecto: lanza error de parseJsonResponseStrict", async () => {
    vi.stubGlobal("fetch", makeFetchMock({ localOk: true, localCt: "text/html", localBody: "<html/>",
                                           fallbackOk: false }));

    await expect(
      fetchChordDbJsonWithFallback("chords-db/C/major.json")
    ).rejects.toThrow("text/html");
  });

  test("local 404 + fallback OK pero content-type incorrecto: lanza error", async () => {
    vi.stubGlobal("fetch", makeFetchMock({ localOk: false,
                                           fallbackOk: true, fallbackCt: "text/plain",
                                           fallbackBody: "plain text" }));

    await expect(
      fetchChordDbJsonWithFallback("chords-db/C/major.json")
    ).rejects.toThrow();
  });
});

// ── lookupChordCatalogVoicings ────────────────────────────────────────────────

// Helpers para construir params base y cache plano
const BASE_PARAMS = {
  rootPc: 2,       // D
  quality: "maj",
  suspension: "none",
  ext7: false, ext6: false, ext9: false, ext11: false, ext13: false,
  omit: "none",
  bassPc: null,
  preferredFrets: null,
  preferSharps: false,
};

function makePositions(...frets) {
  return frets.map((f) => ({ frets: f }));
}

function makeJson(positions) {
  return { key: "D", suffix: "major", positions };
}

function makeFetch2(respsByUrl) {
  return vi.fn(async (url) => {
    const entry = Object.entries(respsByUrl).find(([k]) => url.includes(k));
    if (!entry) return { ok: false, status: 404, url };
    const { ok = true, ct = "application/json", body } = entry[1];
    if (!ok) return { ok: false, status: 404, url };
    return {
      ok: true, url,
      headers: { get: (n) => n === "content-type" ? ct : null },
      text: async () => JSON.stringify(body),
      json: async () => body,
    };
  });
}

describe("lookupChordCatalogVoicings", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  // ── 1: chordCanUseJsonCatalog false → [] ────────────────────────────────────
  test("chordCanUseJsonCatalog false (quality=minmaj7): devuelve []", async () => {
    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      quality: "minmaj7",  // chordCanUseJsonCatalog siempre false para minmaj7
      cache: {}, cacheErr: {}, onCacheSet: vi.fn(),
    });
    expect(result).toEqual([]);
  });

  // ── 2: chordCanUseJsonCatalog false (add sin 7) → [] ───────────────────────
  test("chordCanUseJsonCatalog false (ext9 sin ext7): devuelve []", async () => {
    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      ext9: true, ext7: false,
      cache: {}, cacheErr: {}, onCacheSet: vi.fn(),
    });
    expect(result).toEqual([]);
  });

  // ── Nota: el guard `!suffixBase` es defensivo — chordSuffixFromUI siempre
  //    devuelve string no vacío. Se documenta aquí; la rama muerta queda cubierta
  //    estructuralmente por tests de extracción unitaria futura. ─────────────────

  // ── 3: cache hit → posiciones sin fetch ─────────────────────────────────────
  test("cache hit en primer sufijo: devuelve posiciones sin hacer fetch", async () => {
    const onCacheSet = vi.fn();
    vi.stubGlobal("fetch", vi.fn());  // no debe llamarse

    const positions = makePositions("xx0232", "x54030");
    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      cache: { "D/major": makeJson(positions) },
      cacheErr: {},
      onCacheSet,
    });

    expect(result).toEqual(positions);
    expect(fetch).not.toHaveBeenCalled();
    expect(onCacheSet).not.toHaveBeenCalled();
  });

  // ── 4: cacheErr primer sufijo → salta; cache hit en segundo ─────────────────
  test("cacheErr en primer sufijo: salta al segundo; cache hit en segundo devuelve positions", async () => {
    vi.stubGlobal("fetch", vi.fn());  // no debe llamarse

    const positions = makePositions("x0x232");
    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      bassPc: 9,  // A → suffixes = ["major", "major_a"]
      cache: { "D/major_a": makeJson(positions) },
      cacheErr: { "D/major": "fetch fallido" },
      onCacheSet: vi.fn(),
    });

    expect(result).toEqual(positions);
    expect(fetch).not.toHaveBeenCalled();
  });

  // ── 5: cache miss + fetch OK → llama onCacheSet y devuelve posiciones ────────
  test("cache miss y fetch OK: llama onCacheSet(cacheKey, json) y devuelve posiciones", async () => {
    const json = makeJson(makePositions("xx0232"));
    vi.stubGlobal("fetch", makeFetch2({ "major.json": { body: json } }));
    const onCacheSet = vi.fn();

    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      cache: {}, cacheErr: {}, onCacheSet,
    });

    expect(result).toEqual(json.positions);
    expect(onCacheSet).toHaveBeenCalledOnce();
    expect(onCacheSet).toHaveBeenCalledWith("D/major", json);
  });

  // ── 6: fetch falla en primer sufijo → continue; segundo succeeds ─────────────
  test("fetch falla en primer sufijo: continúa al segundo y devuelve posiciones del segundo", async () => {
    const json2 = makeJson(makePositions("x0x232"));
    vi.stubGlobal("fetch", makeFetch2({
      "major.json": { ok: false },      // primer sufijo: 404
      "major_a.json": { body: json2 }, // segundo sufijo: ok
    }));
    const onCacheSet = vi.fn();

    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      bassPc: 9,  // A → ["major", "major_a"]
      cache: {}, cacheErr: {}, onCacheSet,
    });

    expect(result).toEqual(json2.positions);
    expect(onCacheSet).toHaveBeenCalledWith("D/major_a", json2);
  });

  // ── 7: preferredFrets encontrado en primer sufijo → no fetches segundo ───────
  test("preferredFrets hallado en primer sufijo: no llega a fetchear el sufijo _bass", async () => {
    const json1 = makeJson(makePositions("xx0232", "x54030"));
    const fetchMock = makeFetch2({ "major.json": { body: json1 } });
    vi.stubGlobal("fetch", fetchMock);
    const onCacheSet = vi.fn();

    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      bassPc: 2,            // D → ["major", "major_d"]
      preferredFrets: "xx0232",  // está en json1
      cache: {}, cacheErr: {}, onCacheSet,
    });

    expect(result).toEqual(json1.positions);
    // Solo debe haberse fetched "major.json", nunca "major_d.json"
    const urls = fetchMock.mock.calls.map(([u]) => u);
    expect(urls.some((u) => u.includes("major_d.json"))).toBe(false);
    expect(urls.some((u) => u.includes("major.json"))).toBe(true);
  });

  // ── 8: preferredFrets no encontrado en primer sufijo → prueba sufijo _bass ───
  test("preferredFrets no en primer sufijo: prueba el sufijo _bass y devuelve sus posiciones", async () => {
    const json1 = makeJson(makePositions("x54030"));       // no tiene "x0x232"
    const json2 = makeJson(makePositions("x0x232", "x9b0x0")); // sí tiene "x0x232"
    const fetchMock = makeFetch2({
      "major.json":   { body: json1 },
      "major_a.json": { body: json2 },
    });
    vi.stubGlobal("fetch", fetchMock);
    const onCacheSet = vi.fn();

    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      bassPc: 9,             // A → ["major", "major_a"]
      preferredFrets: "x0x232",
      cache: {}, cacheErr: {}, onCacheSet,
    });

    expect(result).toEqual(json2.positions);
    const urls = fetchMock.mock.calls.map(([u]) => u);
    expect(urls.some((u) => u.includes("major_a.json"))).toBe(true);
  });

  // ── 9: nunca escribe en error-cache ──────────────────────────────────────────
  test("fetch falla en todos los sufijos: cacheErr no se muta y onCacheSet no se llama", async () => {
    vi.stubGlobal("fetch", makeFetch2({}));  // 404 para todo
    const cacheErr = {};
    const onCacheSet = vi.fn();

    const result = await lookupChordCatalogVoicings({
      ...BASE_PARAMS,
      bassPc: 9,  // dos sufijos: major, major_a
      cache: {}, cacheErr, onCacheSet,
    });

    expect(result).toEqual([]);
    expect(Object.keys(cacheErr)).toHaveLength(0);  // no mutado
    expect(onCacheSet).not.toHaveBeenCalled();
  });
});
