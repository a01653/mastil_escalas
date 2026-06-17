import { SCALE_PRESETS, NEAR_CHORD_SLOT_COLORS } from "../../music/appStaticData.js";
import { mod12, intervalToDegreeToken } from "../../music/appMusicBasics.js";
import { noteNameToPc } from "../../music/appMusicBasics.js";

export const SCALE_COMPARE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
export const SCALE_COMPARE_ACCS = [
  { value: "", label: "♮" },
  { value: "b", label: "♭" },
  { value: "#", label: "♯" },
];
export const SCALE_COMPARE_NAMES = Object.keys(SCALE_PRESETS).filter(
  (k) => SCALE_PRESETS[k] !== null
);

export const SCALE_COMPARE_ROW_DEFAULTS = [
  { id: 0, rootLetter: "C", rootAcc: "", scaleName: "Mayor",                 color: NEAR_CHORD_SLOT_COLORS[0].bg },
  { id: 1, rootLetter: "A", rootAcc: "", scaleName: "Menor natural",          color: NEAR_CHORD_SLOT_COLORS[1].bg },
  { id: 2, rootLetter: "G", rootAcc: "", scaleName: "Mixolidia (Mixolydian)", color: NEAR_CHORD_SLOT_COLORS[2].bg },
  { id: 3, rootLetter: "D", rootAcc: "", scaleName: "Dórica (Dorian)",        color: NEAR_CHORD_SLOT_COLORS[3].bg },
];

/**
 * Convierte letra + accidental a pitch class (0-11).
 */
export function rootPcFromLetterAcc(letter, acc) {
  try { return noteNameToPc(letter + acc); } catch { return 0; }
}

/**
 * Calcula el set de pitch classes de una escala dado su rootPc y nombre.
 */
export function computeScalePcs(rootPc, scaleName) {
  const intervals = SCALE_PRESETS[scaleName];
  if (!intervals) return new Set();
  return new Set(intervals.map((i) => mod12(rootPc + i)));
}

/**
 * Construye un Map de pc → etiqueta de intervalo para una escala.
 */
export function buildIntervalLabelMap(rootPc, scaleName) {
  const intervals = SCALE_PRESETS[scaleName];
  if (!intervals) return new Map();
  const map = new Map();
  intervals.forEach((interval) => {
    map.set(mod12(rootPc + interval), intervalToDegreeToken(interval));
  });
  return map;
}

/**
 * Función FIFO pura para el toggle de escalas visibles (máximo 2).
 * No muta el array anterior.
 *
 * - Si rowId ya está en prev → lo quita.
 * - Si prev.length < 2 → lo añade al final.
 * - Si prev.length === 2 → descarta el más antiguo (FIFO) y añade el nuevo.
 */
export function toggleScaleCompareVisible(prev, rowId) {
  if (prev.includes(rowId)) return prev.filter((id) => id !== rowId);
  if (prev.length < 2) return [...prev, rowId];
  return [prev[1], rowId];
}
