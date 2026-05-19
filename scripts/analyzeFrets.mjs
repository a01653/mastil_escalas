/**
 * Wrapper CLI de analyzeFretsCore.
 * Este script solo lee argumentos, llama a analyzeFretsCore y formatea la salida.
 * Toda la lógica de análisis y ranking vive en src/music/analyzeFretsCore.js.
 *
 * Uso:
 *   npm run analyze:frets -- x5555x
 *   npm run analyze:frets -- x5555x --ref D7
 *   npm run analyze:frets -- 1320xx --ref Fmaj7
 *   npm run analyze:frets -- x-10-9-8-7-x
 *
 * --ref <acorde>  Prioriza lecturas compatibles con el acorde de referencia.
 *   Formatos: C, Cmaj7, C7, Cm, Cm7, Cm7b5, Cdim, Cdim7, Csus4, C7sus4
 *   Con alteraciones: Bb7, F#maj7, Dbmaj7, Eb7
 */

import { analyzeFretsCore } from "../src/music/analyzeFretsCore.js";
import { parseRefChord } from "../src/music/parseRefChord.js";
import { mod12, pcToName, spellChordNotes } from "../src/music/chordDetectionEngine.js";

// ─── Colores ANSI ─────────────────────────────────────────────────────────────

const R      = "\x1b[0m";
const BOLD   = "\x1b[1m";
const CYAN   = "\x1b[36m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM    = "\x1b[2m";
const AMBER  = "\x1b[33m";

// ─── Argumentos ───────────────────────────────────────────────────────────────

const args   = process.argv.slice(2);
const tabStr = args[0];

if (!tabStr || tabStr.startsWith("--")) {
  console.error(`${YELLOW}Uso: npm run analyze:frets -- <digitación> [--ref <acorde>]${R}`);
  console.error(`${DIM}Ejemplos:${R}`);
  console.error(`  npm run analyze:frets -- x5555x`);
  console.error(`  npm run analyze:frets -- x5555x --ref D7`);
  console.error(`  npm run analyze:frets -- 1320xx --ref Fmaj7`);
  console.error(`  npm run analyze:frets -- x-10-9-8-7-x`);
  process.exit(1);
}

const refIdx = args.indexOf("--ref");
const refRaw = refIdx !== -1 ? args[refIdx + 1] : null;

// Parsear referencia
let harmonyContext = null;
if (refRaw) {
  try {
    const { rootPc, quality } = parseRefChord(refRaw);
    harmonyContext = { enabled: true, rootPc, quality };
  } catch (err) {
    console.error(`${YELLOW}Error: ${err.message}${R}`);
    process.exit(1);
  }
}

// ─── Análisis (delegado a analyzeFretsCore) ───────────────────────────────────

let result;
try {
  result = analyzeFretsCore(tabStr, { harmonyContext });
} catch (err) {
  console.error(`${YELLOW}Error: ${err.message}${R}`);
  process.exit(1);
}

const { tabDisplay, pcSet, bassName, readings, rankedReadings, primary, promotedByReference } = result;

// Nombres de notas con la ortografía del candidato primario (display)
const pcSpelledMap = new Map();
if (primary?.formula?.intervals?.length) {
  const spelled = spellChordNotes({
    rootPc:         primary.rootPc,
    chordIntervals: primary.formula.intervals,
    preferSharps:   primary.preferSharps,
    degreeLabels:   primary.formula.degreeLabels,
  });
  primary.formula.intervals.forEach((intv, idx) => {
    if (spelled[idx]) pcSpelledMap.set(mod12(primary.rootPc + intv), spelled[idx]);
  });
}
const displayNoteNames = pcSet.map((pc) => {
  const prefer = primary?.preferSharps ?? false;
  return pcSpelledMap.get(mod12(pc)) ?? pcToName(pc, prefer);
});

// ─── Salida ───────────────────────────────────────────────────────────────────

console.log();
console.log(`${BOLD}Patrón:${R}      ${tabStr}  ${DIM}(${tabDisplay})${R}`);
console.log(`${BOLD}Notas:${R}       ${CYAN}${displayNoteNames.join(" ")}${R}`);
console.log(`${BOLD}Bajo:${R}        ${CYAN}${bassName}${R}`);

if (harmonyContext) {
  console.log(`${BOLD}Referencia:${R}  ${AMBER}${refRaw}${R}`);
  console.log(`${BOLD}Priorizar referencia:${R}  sí`);
} else {
  console.log(`${BOLD}Referencia:${R}  ${DIM}—${R}`);
}

console.log(`${BOLD}Primary:${R}     ${GREEN}${primary?.name ?? "(ninguno)"}${R}`);

if (!harmonyContext) {
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
} else {
  if (rankedReadings.length === 0) {
    console.log(`${DIM}Sin lecturas.${R}`);
  } else {
    console.log(`\n${BOLD}Alternativas (${rankedReadings.length}):${R}`);
    rankedReadings.forEach((r, i) => {
      const promoted = r.contextual || r.referencePromoted;
      const badge    = promoted ? `  ${AMBER}← por referencia${R}` : "";
      console.log(`  ${i + 1}. ${GREEN}${r.name ?? "(sin nombre)"}${R}${badge}`);
    });
  }
}

console.log();
