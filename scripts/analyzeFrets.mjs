/**
 * Wrapper CLI de analyzeFretsCore.
 * Este script solo lee argumentos, llama a analyzeFretsCore y formatea la salida.
 * Toda la lógica de análisis y ranking vive en src/music/analyzeFretsCore.js.
 *
 * Uso:
 *   npm run analyze:frets -- x5555x
 *   npm run analyze:frets -- x5555x --ref D7
 *   npm run analyze:frets -- x5555x --json
 *   npm run analyze:frets -- x5555x --ref D7 --json
 *   npm run analyze:frets -- x5555x --ref D7 --all
 *   npm run analyze:frets -- 1320xx --ref Fmaj7
 *   npm run analyze:frets -- x-10-9-8-7-x
 *
 * --ref <acorde>  Prioriza lecturas compatibles con el acorde de referencia.
 *   Formatos: C, Cmaj7, C7, Cm, Cm7, Cm7b5, Cdim, Cdim7, Csus4, C7sus4
 *   Con alteraciones: Bb7, F#maj7, Dbmaj7, Eb7
 *
 * --json  Imprime SOLO JSON válido en stdout. Sin colores ni texto extra.
 *         Útil para scripts y comparaciones automáticas.
 *
 * --all   Muestra detalle completo (fórmula, rank, raíz, bajo) de todas las lecturas.
 *         Solo cambia la salida cuando se usa con --ref (sin --ref ya se muestra detalle).
 *         No tiene efecto sobre --json (JSON siempre incluye todos los campos).
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

const args = process.argv.slice(2);

let useJson = false;
let showAll = false;
let tabStr  = null;
let refRaw  = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--json") {
    useJson = true;
  } else if (arg === "--all") {
    showAll = true;
  } else if (arg === "--ref") {
    refRaw = args[i + 1] ?? null;
    i += 1;
  } else if (!arg.startsWith("--") && tabStr == null) {
    tabStr = arg;
  }
}

// ─── Salida de error (humana o JSON según modo) ───────────────────────────────

function exitWithError(message, code) {
  if (useJson) {
    process.stdout.write(JSON.stringify({ ok: false, error: message, code }) + "\n");
  } else {
    console.error(`${YELLOW}Error: ${message}${R}`);
  }
  process.exit(1);
}

// ─── Validación de argumentos ─────────────────────────────────────────────────

if (!tabStr || tabStr.startsWith("--")) {
  if (useJson) {
    exitWithError("Falta la digitación", "MISSING_PATTERN");
  }
  console.error(`${YELLOW}Uso: npm run analyze:frets -- <digitación> [--ref <acorde>] [--json] [--all]${R}`);
  console.error(`${DIM}Ejemplos:${R}`);
  console.error(`  npm run analyze:frets -- x5555x`);
  console.error(`  npm run analyze:frets -- x5555x --ref D7`);
  console.error(`  npm run analyze:frets -- x5555x --json`);
  console.error(`  npm run analyze:frets -- x5555x --ref D7 --json`);
  console.error(`  npm run analyze:frets -- x5555x --ref D7 --all`);
  process.exit(1);
}

// Parsear referencia
let harmonyContext = null;
if (refRaw) {
  try {
    const { rootPc, quality } = parseRefChord(refRaw);
    harmonyContext = { enabled: true, rootPc, quality };
  } catch (err) {
    exitWithError(err.message, "INVALID_REFERENCE");
  }
}

// ─── Análisis (delegado a analyzeFretsCore) ───────────────────────────────────

let result;
try {
  result = analyzeFretsCore(tabStr, { harmonyContext });
} catch (err) {
  exitWithError(err.message, "PARSE_ERROR");
}

const { tabDisplay, noteNames, pcSet, bassName, readings, rankedReadings, primary, promotedByReference } = result;

// ─── Serializador de lectura (para JSON) ──────────────────────────────────────

function serializeReading(r) {
  const rankRaw = r.rankScore != null ? r.rankScore : (r.score ?? null);
  const intervals = Array.isArray(r.legend) && r.legend.length
    ? r.legend.map((item) => String(item.degree || ""))
    : Array.isArray(r.formula?.degreeLabels) ? r.formula.degreeLabels.map(String) : [];
  const semitones = Array.isArray(r.visibleIntervals) && r.visibleIntervals.length
    ? r.visibleIntervals.map((n) => mod12(Number(n)))
    : Array.isArray(r.formula?.intervals) ? r.formula.intervals.map((n) => mod12(Number(n))) : [];
  return {
    name:               r.name ?? null,
    root:               pcToName(r.rootPc, r.preferSharps),
    bass:               pcToName(r.bassPc, r.preferSharps),
    formula:            r.intervalPairsText ?? null,
    intervals,
    semitones,
    missing:            Array.isArray(r.missingLabels) ? r.missingLabels.map(String) : [],
    category:           r.formula?.quartal ? "quartal" : (r.formula?.ui?.quality ?? r.formula?.id ?? null),
    rank:               rankRaw != null ? parseFloat(rankRaw) : null,
    promotedByReference: !!(r.contextual || r.referencePromoted),
  };
}

// ─── Salida JSON ──────────────────────────────────────────────────────────────

if (useJson) {
  const output = {
    ok:                 true,
    pattern:            tabStr,
    normalizedPattern:  tabDisplay,
    notes:              noteNames,
    bass:               bassName,
    reference:          refRaw ?? null,
    prioritizeReference: !!harmonyContext,
    primary:            primary ? serializeReading(primary) : null,
    readings:           rankedReadings.map(serializeReading),
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  process.exit(0);
}

// ─── Salida humana ────────────────────────────────────────────────────────────

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

// Lista de lecturas: detalle completo siempre, salvo con --ref sin --all (compacto)
const showCompact = harmonyContext && !showAll;

if (showCompact) {
  // --ref sin --all: lista compacta con badge de referencia
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
} else {
  // Sin --ref, o con --ref + --all: detalle completo
  const list = harmonyContext ? rankedReadings : readings;
  if (list.length === 0) {
    console.log(`${DIM}Sin lecturas.${R}`);
  } else {
    console.log(`\n${BOLD}Lecturas (${list.length}):${R}`);
    list.forEach((r, i) => {
      const promoted  = r.contextual || r.referencePromoted;
      const badge     = promoted ? `  ${AMBER}← por referencia${R}` : "";
      const rankInfo  = r.rankScore != null
        ? `  ${DIM}rank=${r.rankScore}${R}`
        : r.score != null
          ? `  ${DIM}score=${r.score}${R}`
          : "";
      const missing   = r.missingLabels?.length
        ? `  ${DIM}missing=[${r.missingLabels.join(",")}]${R}`
        : "";
      console.log(`  ${i + 1}. ${GREEN}${r.name ?? "(sin nombre)"}${R}${badge}${rankInfo}${missing}`);
      console.log(`     ${DIM}fórmula: ${r.intervalPairsText ?? "—"}${R}`);
      console.log(`     ${DIM}raíz: ${pcToName(r.rootPc, r.preferSharps)}  bajo: ${pcToName(r.bassPc, r.preferSharps)}${R}`);
    });
  }
}

console.log();
