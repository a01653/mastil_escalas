/**
 * Convierte una cadena de digitación a datos de fret/MIDI/PC.
 * Módulo puro: sin efectos secundarios, sin dependencias de la app ni del navegador.
 */

import { mod12 } from "./chordDetectionEngine.js";

// Afinación estándar LowE→HighE: E2 A2 D3 G3 B3 E4
export const STRING_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/**
 * Formatos aceptados:
 *   "x5555x"       → un carácter por cuerda (frets 0-9)
 *   "x-5-5-5-5-x"  → separados por guion
 *   "x,5,5,5,5,x"  → separados por coma
 *   "x 5 5 5 5 x"  → separados por espacio
 *
 * @param {string} str
 * @returns {{ frets: (number|null)[], midiPitches: (number|null)[], pcs: (number|null)[] }}
 * @throws {Error} si el formato no produce exactamente 6 tokens o contiene tokens inválidos
 */
export function parseFretString(str) {
  const s = String(str || "").trim();

  let tokens;
  if (/[-,\s]/.test(s)) {
    tokens = s.split(/[-,\s]+/).filter((t) => t.length > 0);
  } else {
    tokens = s.split("");
  }

  if (tokens.length !== 6) {
    throw new Error(
      `analyzeFrets: se esperan exactamente 6 tokens (una por cuerda), ` +
        `se obtuvieron ${tokens.length} de "${str}"`
    );
  }

  const frets = tokens.map((tok, i) => {
    const t = tok.toLowerCase();
    if (t === "x") return null;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n) || n < 0 || n > 24) {
      throw new Error(
        `analyzeFrets: token inválido "${tok}" en posición ${i} (se esperaba dígito 0-24 o x)`
      );
    }
    return n;
  });

  const midiPitches = frets.map((f, i) => (f === null ? null : STRING_OPEN_MIDI[i] + f));
  const pcs = midiPitches.map((m) => (m === null ? null : mod12(m)));

  return { frets, midiPitches, pcs };
}
