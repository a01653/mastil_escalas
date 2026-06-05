/**
 * chordCatalogCore.js — Helpers puros de construcción para el catálogo JSON de acordes.
 *
 * Sin estado React, sin fetch, sin efectos secundarios.
 * Expone únicamente lógica de construcción de clave, sufijo, URLs y sufijo _bass.
 */

import { pcToName } from "../../music/appMusicBasics.js";

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
