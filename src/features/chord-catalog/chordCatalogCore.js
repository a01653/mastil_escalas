/**
 * chordCatalogCore.js — Helpers puros de construcción, validación, fetch y lookup para
 * el catálogo JSON de acordes.
 *
 * Sin estado React. Expone: construcción de clave/sufijo/URL, sufijo _bass, validación de
 * respuestas JSON, fetch con fallback local → GitHub Pages, y la función pura de lookup
 * de voicings (lookupChordCatalogVoicings) que ensureChordDbCatalogVoicings envuelve
 * inyectando el estado React.
 */

import { pcToName, chordCanUseJsonCatalog, chordSuffixFromUI } from "../../music/appMusicBasics.js";
import { chordDbKeyNameFromPc } from "../../music/chordDbCatalog.js";

// Base del sitio (Vite) para que fetch a /public funcione en localhost y GitHub Pages.
// En producción (Pages) suele ser "/mastil_escalas/" y en dev "/".
// Evitar import.meta.env.BASE_URL sin optional chaining: puede fallar fuera de Vite.
const APP_BASE =
  import.meta && import.meta.env && import.meta.env.BASE_URL
    ? import.meta.env.BASE_URL
    : "/";

// Fallback absoluto cuando la URL local no resuelve (sandbox, previsualización externa).
export const CHORD_DB_PAGES_BASE = "https://a01653.github.io/mastil_pruebas/";

/**
 * Ruta relativa dentro de /public, sin base. Ejemplo: "chords-db/G/major_b.json".
 * Codifica keyName para manejar "A#" → "A%23" correctamente.
 */
export function chordDbUrl(keyName, suffix) {
  const folder = encodeURIComponent(keyName);
  const file = encodeURIComponent(`${suffix}.json`);
  return `chords-db/${folder}/${file}`;
}

/**
 * Ruta local para fetch respetando APP_BASE.
 * En dev: "/chords-db/G/major.json"; en Pages: "/mastil_escalas/chords-db/G/major.json".
 */
export function chordDbUrlLocal(keyName, suffix) {
  const base = String(APP_BASE || "/");
  const b = base.endsWith("/") ? base : base + "/";
  return `${b}${chordDbUrl(keyName, suffix)}`;
}

/**
 * Convierte una ruta relativa de /public a URL local con APP_BASE.
 * Equivalente a chordDbUrlLocal pero acepta un path ya construido.
 */
export function publicRelToLocal(rel) {
  const base = String(APP_BASE || "/");
  const b = base.endsWith("/") ? base : base + "/";
  const r = String(rel || "").replace(/^\/+/, "");
  return `${b}${r}`;
}

/**
 * URL absoluta de fallback en GitHub Pages.
 * Se intenta cuando la URL local devuelve un error HTTP.
 */
export function buildChordDbFallbackUrl(urlRel) {
  return `${CHORD_DB_PAGES_BASE}${urlRel}`;
}

/**
 * Clave canónica para chordDbCache y chordDbCacheErr.
 * Ejemplo: buildChordDbCacheKey("G", "major_b") → "G/major_b"
 */
export function buildChordDbCacheKey(keyName, suffix) {
  return `${keyName}/${suffix}`;
}

/**
 * Construye el sufijo _bass (p. ej. "major_b" para G/B).
 * Devuelve null cuando bassPc es null (sin bajo específico).
 *
 * @param {string} suffixBase   - Sufijo del acorde sin bajo, p. ej. "major"
 * @param {number|null} bassPc  - Pitch class del bajo, o null
 * @param {boolean} preferSharps - Si true usa sostenidos; si false usa bemoles
 */
export function buildChordDbBassSuffix(suffixBase, bassPc, preferSharps) {
  if (bassPc == null) return null;
  return `${suffixBase}_${pcToName(bassPc, preferSharps).toLowerCase()}`;
}

/**
 * Devuelve la lista ordenada de sufijos a intentar: primero el genérico,
 * luego el específico de bajo si difiere.
 *
 * El orden garantiza que el catálogo sin restricción de bajo se prueba primero
 * y el de bajo específico actúa como fallback cuando preferredFrets no está
 * en el primero.
 *
 * Ejemplo: buildChordDbSuffixes("major", "major_b") → ["major", "major_b"]
 *
 * @param {string}      suffixBase  - Sufijo base, p. ej. "major"
 * @param {string|null} bassSuffix  - Sufijo con bajo, o null
 */
export function buildChordDbSuffixes(suffixBase, bassSuffix) {
  return bassSuffix && bassSuffix !== suffixBase
    ? [suffixBase, bassSuffix]
    : [suffixBase];
}

/**
 * Valida que la respuesta HTTP tiene Content-Type JSON y devuelve el cuerpo parseado.
 * Lanza Error si el Content-Type no incluye "json" (adjuntando una muestra del cuerpo
 * para facilitar el diagnóstico). Si el cuerpo es JSON inválido, el error de parseo
 * de res.json() se propaga al caller sin modificar.
 *
 * @param {Response} res          - Respuesta fetch ya confirmada como ok
 * @param {string}   urlForError  - URL usada en el mensaje de error para diagnóstico
 */
/**
 * Intenta fetch de `urlRel` con URL local primero; si falla, intenta el fallback en GitHub Pages.
 * Valida el Content-Type con parseJsonResponseStrict.
 *
 * @param {string} urlRel - Ruta relativa dentro de /public, p. ej. "chords-db/G/major.json"
 * @returns {{ json: object, usedUrl: string }} JSON parseado y URL que devolvió la respuesta
 * @throws {Error} Si ambas URLs devuelven error HTTP o la respuesta no es JSON válido
 */
export async function fetchChordDbJsonWithFallback(urlRel) {
  const urlLocal = publicRelToLocal(urlRel);
  const urlFallbackAbs = buildChordDbFallbackUrl(urlRel);

  let res = await fetch(urlLocal, { cache: "no-store" });
  if (res.ok) {
    const json = await parseJsonResponseStrict(res, res.url || urlLocal);
    return { json, usedUrl: res.url || urlLocal };
  }

  const localStatus = res.status;
  const localUrl = res.url || urlLocal;
  res = await fetch(urlFallbackAbs, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `local ${localUrl} (${localStatus}) | fallback ${urlFallbackAbs} (${res.status})`
    );
  }

  const json = await parseJsonResponseStrict(res, res.url || urlFallbackAbs);
  return { json, usedUrl: res.url || urlFallbackAbs };
}

/**
 * Lógica pura de búsqueda de voicings en el catálogo JSON.
 * No depende de estado React; recibe el estado como parámetros.
 *
 * Flujo para cada sufijo (sufijo base + sufijo _bass si difieren):
 *   1. Cache hit  → devuelve posiciones inmediatamente.
 *   2. Cache error → `continue` (no escribe en cacheErr).
 *   3. Fetch      → llama `onCacheSet(cacheKey, json)` si ok; `continue` si falla.
 *   4. preferredFrets → si el fret buscado no está en las posiciones, `continue` al siguiente sufijo.
 *
 * @param {object}   params
 * @param {number}   params.rootPc
 * @param {string}   params.quality
 * @param {string}   [params.suspension]
 * @param {boolean}  [params.ext7]
 * @param {boolean}  [params.ext6]
 * @param {boolean}  [params.ext9]
 * @param {boolean}  [params.ext11]
 * @param {boolean}  [params.ext13]
 * @param {string}   [params.omit]
 * @param {number|null} [params.bassPc]
 * @param {string|null} [params.preferredFrets]
 * @param {boolean}  params.preferSharps   - Ortografía de nota del bajo
 * @param {object}   params.cache          - Snapshot de chordDbCache
 * @param {object}   params.cacheErr       - Snapshot de chordDbCacheErr
 * @param {function} params.onCacheSet     - (cacheKey, json) => void — actualiza chordDbCache
 * @returns {Promise<Array>} Posiciones del catálogo, o [] si no hay resolución
 */
export async function lookupChordCatalogVoicings({
  rootPc,
  quality,
  suspension,
  ext7,
  ext6,
  ext9,
  ext11,
  ext13,
  omit,
  bassPc = null,
  preferredFrets = null,
  preferSharps,
  cache,
  cacheErr,
  onCacheSet,
}) {
  if (!chordCanUseJsonCatalog({
    quality,
    structure: "chord",
    ext7: !!ext7,
    ext6: !!ext6,
    ext9: !!ext9,
    ext11: !!ext11,
    ext13: !!ext13,
  })) return [];

  const suffixBase = chordSuffixFromUI({
    quality,
    suspension: suspension || "none",
    structure: "chord",
    ext7: !!ext7,
    ext6: !!ext6,
    ext9: !!ext9,
    ext11: !!ext11,
    ext13: !!ext13,
    omit: omit || "none",
  });
  if (!suffixBase) return [];

  const bassSuffix = buildChordDbBassSuffix(suffixBase, bassPc, preferSharps);
  const suffixes = buildChordDbSuffixes(suffixBase, bassSuffix);

  const keyName = chordDbKeyNameFromPc(rootPc);
  for (const suffix of suffixes) {
    const cacheKey = buildChordDbCacheKey(keyName, suffix);

    const cached = cache[cacheKey];
    if (cached?.positions?.length) return cached.positions;

    if (cacheErr[cacheKey]) continue;

    const urlRel = chordDbUrl(keyName, suffix);

    try {
      const { json } = await fetchChordDbJsonWithFallback(urlRel);
      onCacheSet(cacheKey, json);
      const positions = json?.positions?.length ? json.positions : [];
      if (!preferredFrets) return positions;
      const wanted = String(preferredFrets || "").trim().toLowerCase();
      if (!wanted) return positions;
      if (positions.some((pos) => String(pos?.frets || "").trim().toLowerCase() === wanted)) {
        return positions;
      }
    } catch {
      continue;
    }
  }
  return [];
}

export async function parseJsonResponseStrict(res, urlForError) {
  const contentType = String(res.headers?.get?.("content-type") || "").toLowerCase();
  if (!contentType.includes("json")) {
    const sample = (await res.text()).slice(0, 80).replace(/\s+/g, " ").trim();
    throw new Error(
      `Respuesta no JSON en ${urlForError}: ${contentType || "sin content-type"}${sample ? ` · ${sample}` : ""}`
    );
  }
  return res.json();
}
