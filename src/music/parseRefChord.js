/**
 * Parsea una cadena de acorde de referencia ("D7", "Fmaj7", "Bb7", etc.)
 * y devuelve { rootPc, quality } compatible con harmonyContextRanking.
 *
 * Lanza Error si la cadena no es reconocible.
 */

const ROOT_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Los valores deben coincidir con las claves de QUALITY_ENGINE_MAP en harmonyContextRanking.js
const QUALITY_MAP = new Map([
  // Case-sensitive (M7 vs m7, M vs m)
  ["M7",       "maj7"],
  ["M",        "Mayor"],
  // Normalizados a minúsculas
  ["",         "Mayor"],
  ["maj",      "Mayor"],
  ["major",    "Mayor"],
  ["maj7",     "maj7"],
  ["major7",   "maj7"],
  ["7",        "7"],
  ["m",        "menor"],
  ["min",      "menor"],
  ["minor",    "menor"],
  ["-",        "menor"],
  ["m7",       "m7"],
  ["min7",     "m7"],
  ["-7",       "m7"],
  ["m7b5",     "m7(b5)"],
  ["m7(b5)",   "m7(b5)"],
  ["min7b5",   "m7(b5)"],
  ["hdim",     "m7(b5)"],
  ["hdim7",    "m7(b5)"],
  ["ø",        "m7(b5)"],
  ["ø7",       "m7(b5)"],
  ["dim",      "dim"],
  ["dim7",     "dim7"],
  ["°",        "dim"],
  ["°7",       "dim7"],
  ["sus4",     "sus4"],
  ["sus",      "sus4"],
  ["7sus4",    "7sus4"],
  ["sus47",    "7sus4"],
]);

/**
 * @param {string} str  Ej.: "D7", "Fmaj7", "Bb7", "Cm7b5", "C7sus4"
 * @returns {{ rootPc: number, quality: string }}
 * @throws {Error} si la cadena no es reconocible
 */
export function parseRefChord(str) {
  if (!str || typeof str !== "string") {
    throw new Error(`Referencia inválida: "${str}"`);
  }
  const s = str.trim();
  if (!s) throw new Error(`Referencia vacía`);

  const letter = s[0].toUpperCase();
  if (!(letter in ROOT_PC)) {
    throw new Error(
      `Referencia inválida: "${str}" — nota "${s[0]}" no reconocida. Usa: C D E F G A B`
    );
  }

  let rootPc = ROOT_PC[letter];
  let rest = s.slice(1);

  // Flats (b): consumir greedy antes de la calidad.
  // Los nombres de calidad no empiezan por "b", así que es seguro.
  while (rest.startsWith("b")) {
    rootPc -= 1;
    rest = rest.slice(1);
  }
  // Sostenidos (#)
  while (rest.startsWith("#")) {
    rootPc += 1;
    rest = rest.slice(1);
  }
  rootPc = ((rootPc % 12) + 12) % 12;

  // Búsqueda case-sensitive primero (M7, M)
  if (QUALITY_MAP.has(rest)) {
    return { rootPc, quality: QUALITY_MAP.get(rest) };
  }
  // Búsqueda case-insensitive
  const restLower = rest.toLowerCase();
  if (QUALITY_MAP.has(restLower)) {
    return { rootPc, quality: QUALITY_MAP.get(restLower) };
  }

  throw new Error(
    `Referencia inválida: "${str}" — calidad "${rest}" no reconocida. ` +
    `Formatos aceptados: C, Cmaj7, C7, Cm, Cm7, Cm7b5, Cdim, Cdim7, Csus4, C7sus4`
  );
}
