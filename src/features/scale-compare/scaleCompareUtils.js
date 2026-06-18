import { SCALE_PRESETS, NEAR_CHORD_SLOT_COLORS } from "../../music/appStaticData.js";
import { mod12, intervalToDegreeToken } from "../../music/appMusicBasics.js";
import { noteNameToPc } from "../../music/appMusicBasics.js";
import { sanitizeColorValue, sanitizeBoolValue } from "../../music/appPatternRouteStaffCore.jsx";

export const SCALE_COMPARE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
export const SCALE_COMPARE_ACCS = [
  { value: "", label: "♮" },
  { value: "b", label: "♭" },
  { value: "#", label: "♯" },
];
export const SCALE_COMPARE_NAMES = Object.keys(SCALE_PRESETS).filter(
  (k) => SCALE_PRESETS[k] !== null
);

// Progresión 2-5-1-4 en C: D G C F, todas Mayor
export const SCALE_COMPARE_ROW_DEFAULTS = [
  { id: 0, rootLetter: "D", rootAcc: "", scaleName: "Mayor", color: NEAR_CHORD_SLOT_COLORS[0].bg },
  { id: 1, rootLetter: "G", rootAcc: "", scaleName: "Mayor", color: NEAR_CHORD_SLOT_COLORS[1].bg },
  { id: 2, rootLetter: "C", rootAcc: "", scaleName: "Mayor", color: NEAR_CHORD_SLOT_COLORS[2].bg },
  { id: 3, rootLetter: "F", rootAcc: "", scaleName: "Mayor", color: NEAR_CHORD_SLOT_COLORS[3].bg },
];

// Filas 0 (D) y 1 (G) visibles por defecto
export const SCALE_COMPARE_VISIBLE_DEFAULTS = [0, 1];

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

const VALID_ROW_IDS = [0, 1, 2, 3];
const VALID_ACCS = ["", "b", "#"];

/**
 * Normaliza/migra la sección del Comparador de escalas desde un objeto de
 * configuración guardado (puede ser parcial, antiguo o corrupto).
 *
 * Casos cubiertos:
 *  1. Config completa y válida       → se respeta íntegramente.
 *  2. Config sin scaleCompareRows    → se aplican SCALE_COMPARE_ROW_DEFAULTS.
 *  3. Config con filas parciales     → campos faltantes/inválidos → defaults de fila.
 *  4. Color inválido en fila         → color por defecto de esa fila.
 *  5. scaleName inválido             → "Mayor".
 *  6. rootLetter/rootAcc inválido    → valores por defecto de la fila.
 *  7. Más de 2 visibles              → se recorta a los primeros 2.
 *  8. ID visible inválido            → se limpia.
 *  9. Sin scaleCompareVisible        → SCALE_COMPARE_VISIBLE_DEFAULTS [0,1].
 * 10. showResolutionPoints ausente   → false.
 *
 * @param {object|null|undefined} saved  Objeto de configuración completo (top-level).
 * @returns {{ rows: object[], visible: number[], showResolutionPoints: boolean }}
 */
export function normalizeScaleCompareConfig(saved) {
  // ── filas ──────────────────────────────────────────────────────────────────
  const savedRows = Array.isArray(saved?.scaleCompareRows) ? saved.scaleCompareRows : null;
  const rows = SCALE_COMPARE_ROW_DEFAULTS.map((def, i) => {
    const s = savedRows ? savedRows[i] : null;
    if (!s || s.id !== def.id) return def;
    return {
      ...def,
      rootLetter: SCALE_COMPARE_LETTERS.includes(s.rootLetter) ? s.rootLetter : def.rootLetter,
      rootAcc: VALID_ACCS.includes(s.rootAcc) ? s.rootAcc : def.rootAcc,
      scaleName: Object.prototype.hasOwnProperty.call(SCALE_PRESETS, s.scaleName) ? s.scaleName : def.scaleName,
      color: sanitizeColorValue(s.color, def.color),
    };
  });

  // ── visibles ────────────────────────────────────────────────────────────────
  // Solo usar defaults si el campo no está presente en absoluto.
  // Un array vacío [] es un estado legítimo (el usuario desactivó todo).
  const rawVisible = Array.isArray(saved?.scaleCompareVisible)
    ? saved.scaleCompareVisible
    : SCALE_COMPARE_VISIBLE_DEFAULTS;
  const visible = rawVisible
    .filter((id) => VALID_ROW_IDS.includes(id))
    .slice(0, 2);

  // ── puntos de resolución ────────────────────────────────────────────────────
  const showResolutionPoints = sanitizeBoolValue(saved?.showResolutionPoints, false);

  return { rows, visible, showResolutionPoints };
}
