/**
 * Analiza una digitación de guitarra desde la línea de comandos.
 *
 * Uso:
 *   npm run analyze:frets -- x5555x
 *   npm run analyze:frets -- 3x343x
 *   npm run analyze:frets -- x-10-9-8-7-x
 *
 * Formato de digitación: un carácter por cuerda (0-9) o separados por - / , / espacio.
 *   'x' = cuerda silenciada. Orden: string 6 (LowE) → string 1 (HighE).
 */

import { parseFretString } from "../src/music/mastilDebug.js";
import {
  analyzeSelectedNotes,
  mod12,
  pcToName,
  preferSharpsFromMajorTonicPc,
  spellChordNotes,
} from "../src/music/chordDetectionEngine.js";

// ─── Colores ANSI ─────────────────────────────────────────────────────────────

const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

// ─── Main ─────────────────────────────────────────────────────────────────────

const tabStr = process.argv[2];

if (!tabStr) {
  console.error(`${YELLOW}Uso: npm run analyze:frets -- <digitación>${R}`);
  console.error(`${DIM}Ejemplos:${R}`);
  console.error(`  npm run analyze:frets -- x5555x`);
  console.error(`  npm run analyze:frets -- x32010`);
  console.error(`  npm run analyze:frets -- x-10-9-8-7-x`);
  process.exit(1);
}

let parsed;
try {
  parsed = parseFretString(tabStr);
} catch (err) {
  console.error(`${YELLOW}Error: ${err.message}${R}`);
  process.exit(1);
}

const { frets, midiPitches, pcs } = parsed;

const activeMidi = midiPitches.filter((m) => m !== null);
if (activeMidi.length < 2) {
  console.error(`${YELLOW}Error: menos de 2 cuerdas activas — no hay acorde que analizar.${R}`);
  process.exit(1);
}

// Bajo real = nota MIDI más baja entre las activas
const bassMidi = Math.min(...activeMidi);
const bassPc = mod12(bassMidi);
const preferSharps = preferSharpsFromMajorTonicPc(bassPc);
const bassName = pcToName(bassPc, preferSharps);

// PC-set único (mantiene orden de aparición de grave a agudo)
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
const readings = result.readings ?? [];

// Construir mapa pc→nombre usando la ortografía con degreeLabels del candidato primario
// (igual que App.jsx) para que el bajo en context dom7sus4 muestre "Bb" no "A#"
const pcSpelledMap = new Map();
if (primary?.formula?.intervals?.length) {
  const spelled = spellChordNotes({
    rootPc: primary.rootPc,
    chordIntervals: primary.formula.intervals,
    preferSharps: primary.preferSharps,
    degreeLabels: primary.formula.degreeLabels,
  });
  primary.formula.intervals.forEach((intv, idx) => {
    if (spelled[idx]) pcSpelledMap.set(mod12(primary.rootPc + intv), spelled[idx]);
  });
}
const displayNoteNames = pcSet.map((pc) => pcSpelledMap.get(mod12(pc)) ?? pcToName(pc, preferSharps));

// ─── Salida ───────────────────────────────────────────────────────────────────

console.log();
console.log(`${BOLD}Patrón:${R}  ${tabStr}  ${DIM}(${tabDisplay})${R}`);
console.log(`${BOLD}Notas:${R}   ${CYAN}${displayNoteNames.join(" ")}${R}`);
console.log(`${BOLD}Bajo:${R}    ${CYAN}${bassName}${R}`);
console.log(`${BOLD}Primary:${R} ${GREEN}${primary?.name ?? "(ninguno)"}${R}`);

if (readings.length === 0) {
  console.log(`${DIM}Sin lecturas.${R}`);
} else {
  console.log(`\n${BOLD}Lecturas (${readings.length}):${R}`);
  readings.forEach((r, i) => {
    const rankInfo = r.rankScore != null
      ? `  ${DIM}rank=${r.rankScore}${R}`
      : r.score != null
        ? `  ${DIM}score=${r.score}${R}`
        : "";
    const missing = r.missingLabels?.length
      ? `  ${DIM}missing=[${r.missingLabels.join(",")}]${R}`
      : "";
    console.log(`  ${i + 1}. ${GREEN}${r.name ?? "(sin nombre)"}${R}${rankInfo}${missing}`);
    console.log(`     ${DIM}fórmula: ${r.intervalPairsText ?? "—"}${R}`);
    console.log(`     ${DIM}raíz: ${pcToName(r.rootPc, r.preferSharps)}  bajo: ${pcToName(r.bassPc, r.preferSharps)}${R}`);
  });
}

console.log();
