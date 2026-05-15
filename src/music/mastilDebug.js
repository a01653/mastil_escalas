/**
 * Helpers de diagnóstico accesibles desde la consola del navegador (solo dev).
 * No afectan el comportamiento de la app; solo leen el motor y formatean salida.
 *
 * Uso:
 *   window.mastilDebug.analyzeNotes(["D","G","C","E"], "D")
 *   window.mastilDebug.analyzeFrets("x5555x")
 */

import {
  analyzeSelectedNotes,
  mod12,
  noteNameToPc,
  pcToName,
  preferSharpsFromMajorTonicPc,
} from "./chordDetectionEngine.js";

// Afinación estándar LowE→HighE: E2 A2 D3 G3 B3 E4
const STRING_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/**
 * Convierte una cadena de digitación a un array de 6 enteros o null (muted).
 *
 * Formatos aceptados:
 *   "x5555x"         → un carácter por cuerda (frets 0-9)
 *   "x-5-5-5-5-x"   → separados por guion
 *   "x,5,5,5,5,x"   → separados por coma
 *   "x 5 5 5 5 x"   → separados por espacio
 *
 * Devuelve null en lugar del fret para cuerdas silenciadas.
 * Lanza Error si el formato no produce exactamente 6 tokens.
 *
 * @param {string} str
 * @returns {{ frets: (number|null)[], midiPitches: (number|null)[], pcs: (number|null)[] }}
 */
export function parseFretString(str) {
  const s = String(str || "").trim();

  let tokens;
  if (/[-,\s]/.test(s)) {
    // Formato separado
    tokens = s.split(/[-,\s]+/).filter((t) => t.length > 0);
  } else {
    // Un carácter por cuerda
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

function formatReading(r, idx) {
  const lines = [
    `  [${idx}] ${r.name ?? "(sin nombre)"}`,
    `       intervalPairsText : ${r.intervalPairsText ?? "—"}`,
    `       rootPc            : ${r.rootPc} (${pcToName(r.rootPc, r.preferSharps)})`,
    `       bassPc            : ${r.bassPc} (${pcToName(r.bassPc, r.preferSharps)})`,
    `       score             : ${r.score ?? "—"}`,
    `       probabilityScore  : ${r.probabilityScore ?? "—"}`,
    `       rankScore         : ${r.rankScore ?? "—"}`,
    `       missingLabels     : ${JSON.stringify(r.missingLabels ?? [])}`,
    `       visibleIntervals  : ${JSON.stringify(r.visibleIntervals ?? [])}`,
    `       visibleNotes      : ${JSON.stringify(r.visibleNotes ?? [])}`,
  ];
  return lines.join("\n");
}

/**
 * Analiza un conjunto de notas por nombre y lo pasa al motor de detección.
 * Imprime diagnóstico en consola y devuelve el objeto resultado.
 *
 * @param {string[]} noteNames  Ej: ["D","G","C","E"]
 * @param {string|null} bassName  Ej: "D"  (opcional; si null se infiere)
 * @returns {{ selectedNotes: object[], readings: object[], primary: object|null }}
 */
function analyzeNotes(noteNames, bassName = null) {
  if (!Array.isArray(noteNames) || noteNames.length === 0) {
    console.error("mastilDebug.analyzeNotes: noteNames debe ser un array no vacío.");
    return null;
  }

  const result = analyzeSelectedNotes(noteNames, bassName);
  const primary = result.primary;

  console.group(`mastilDebug.analyzeNotes(${JSON.stringify(noteNames)}, ${JSON.stringify(bassName)})`);
  console.log(`Notas     : ${noteNames.join(" ")}`);
  console.log(`Bajo      : ${bassName ?? "(auto)"}`);
  console.log(`Primary   : ${primary?.name ?? "(ninguno)"}`);
  console.log(`Readings  : ${result.readings.length}`);
  result.readings.forEach((r, i) => console.log(formatReading(r, i)));
  console.groupEnd();

  return result;
}

/**
 * Analiza una digitación de guitarra en formato LowE→HighE.
 * Calcula las notas reales, determina el bajo y llama al motor.
 *
 * @param {string} tabStr  Ej: "x5555x"  o  "x-5-5-5-5-x"
 * @returns {{ selectedNotes: object[], readings: object[], primary: object|null }|null}
 */
function analyzeFrets(tabStr) {
  let parsed;
  try {
    parsed = parseFretString(tabStr);
  } catch (err) {
    console.error(err.message);
    return null;
  }

  const { frets, midiPitches, pcs } = parsed;

  // Notas activas (cuerdas no silenciadas)
  const activeMidi = midiPitches.filter((m) => m !== null);
  if (activeMidi.length < 2) {
    console.error("mastilDebug.analyzeFrets: menos de 2 cuerdas activas — no hay acorde que analizar.");
    return null;
  }

  // Bajo real = nota MIDI más baja entre las activas
  const bassMidi = Math.min(...activeMidi);
  const bassPc = mod12(bassMidi);
  const preferSharps = preferSharpsFromMajorTonicPc(bassPc);
  const bassName = pcToName(bassPc, preferSharps);

  // PC-set único (mantiene orden de aparición)
  const pcSet = [];
  const seen = new Set();
  for (const pc of pcs) {
    if (pc !== null && !seen.has(pc)) {
      seen.add(pc);
      pcSet.push(pc);
    }
  }

  const noteNames = pcSet.map((pc) => pcToName(pc, preferSharps));
  const tabDisplay = frets.map((f) => (f === null ? "x" : String(f))).join("-");

  const result = analyzeSelectedNotes(noteNames, bassName);
  const primary = result.primary;

  console.group(`mastilDebug.analyzeFrets("${tabStr}")`);
  console.log(`Digitación: ${tabDisplay}  (LowE → HighE)`);
  console.log(`Notas     : ${noteNames.join(" ")}`);
  console.log(`Bajo      : ${bassName}`);
  console.log(`Primary   : ${primary?.name ?? "(ninguno)"}`);
  console.log(`Readings  : ${result.readings.length}`);
  result.readings.forEach((r, i) => console.log(formatReading(r, i)));
  console.groupEnd();

  return result;
}

/**
 * Registra window.mastilDebug. Llamar solo en modo desarrollo.
 */
export function registerMastilDebug() {
  if (typeof window === "undefined") return;
  window.mastilDebug = { analyzeNotes, analyzeFrets };
  console.info(
    "[mastilDebug] disponible en consola:\n" +
      "  window.mastilDebug.analyzeNotes([\"D\",\"G\",\"C\",\"E\"], \"D\")\n" +
      "  window.mastilDebug.analyzeFrets(\"x5555x\")\n" +
      "(activo porque import.meta.env.DEV=true o URL contiene ?debug=1)"
  );
}
