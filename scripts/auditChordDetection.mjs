/**
 * Auditoría de detección de acordes.
 *
 * Genera 15 tipos × 12 raíces = 180 combinaciones de acordes en posición fundamental,
 * ejecuta el motor de detección sobre cada una, y reporta:
 *   - Primario (mejor lectura) y su rankScore
 *   - 2º candidato y su rankScore
 *   - Gap (diferencia de scores)
 *   - Casos dudosos (gap < GAP_THRESHOLD) para revisión manual
 *
 * Uso:
 *   node scripts/auditChordDetection.mjs
 *   npm run audit:chords
 */

import {
  analyzeSelectedNotes,
  mod12,
  pcToName,
  preferSharpsFromMajorTonicPc,
} from "../src/music/chordDetectionEngine.js";

const CHORD_TYPES = [
  { id: "major",   intervals: [0, 4, 7] },
  { id: "minor",   intervals: [0, 3, 7] },
  { id: "dom7",    intervals: [0, 4, 7, 10] },
  { id: "m7",      intervals: [0, 3, 7, 10] },
  { id: "maj7",    intervals: [0, 4, 7, 11] },
  { id: "dim7",    intervals: [0, 3, 6, 9] },
  { id: "m7b5",    intervals: [0, 3, 6, 10] },
  { id: "7sus4",   intervals: [0, 5, 7, 10] },
  { id: "7sus2",   intervals: [0, 2, 7, 10] },
  { id: "7#9b13",  intervals: [0, 3, 4, 8, 10] },
  { id: "dom9",    intervals: [0, 4, 7, 10, 2] },
  { id: "m9",      intervals: [0, 3, 7, 10, 2] },
  { id: "maj9",    intervals: [0, 4, 7, 11, 2] },
  { id: "7b5",     intervals: [0, 4, 6, 10] },
  { id: "7#5",     intervals: [0, 4, 8, 10] },
];

const GAP_THRESHOLD = 1.0;

function preferredRootName(pc) {
  return pcToName(pc, preferSharpsFromMajorTonicPc(pc));
}

function buildChordNotes(rootPc, intervals) {
  const preferSharps = preferSharpsFromMajorTonicPc(rootPc);
  return intervals.map((intv) => pcToName(mod12(rootPc + intv), preferSharps));
}

function pad(s, n) {
  return String(s ?? "").padEnd(n);
}

const results = [];
const doubtfulCases = [];

for (const chordType of CHORD_TYPES) {
  for (let rootPc = 0; rootPc < 12; rootPc++) {
    const noteNames = buildChordNotes(rootPc, chordType.intervals);
    const bassNote = preferredRootName(rootPc);
    const result = analyzeSelectedNotes(noteNames, bassNote);
    const readings = result.readings;
    const best = readings[0];
    const second = readings[1];

    const bestScore = best?.rankScore ?? 999;
    const secondScore = second?.rankScore ?? 999;
    const gap = second ? Number((secondScore - bestScore).toFixed(2)) : 999;
    const isDoubtful = gap < GAP_THRESHOLD;

    const entry = {
      type: chordType.id,
      root: bassNote,
      notes: noteNames.join(" "),
      primary: best?.name ?? "(none)",
      primaryScore: best != null ? String((best.rankScore ?? 0).toFixed(2)) : "-",
      second: second?.name ?? "-",
      secondScore: second != null ? String((second.rankScore ?? 0).toFixed(2)) : "-",
      gap: gap === 999 ? "∞" : gap.toFixed(2),
      doubtful: isDoubtful,
    };

    results.push(entry);
    if (isDoubtful) doubtfulCases.push(entry);
  }
}

const SEP = "=".repeat(110);
const DASH = "-".repeat(110);

console.log(`\n${SEP}`);
console.log("AUDITORÍA DE DETECCIÓN DE ACORDES");
console.log(`${results.length} combinaciones | Dudosas (gap < ${GAP_THRESHOLD}): ${doubtfulCases.length}`);
console.log(`${SEP}\n`);

console.log(
  pad("Tipo", 10) +
  pad("Raíz", 5) +
  pad("Notas", 20) +
  pad("Primario", 26) +
  pad("Score", 7) +
  pad("2º candidato", 26) +
  pad("Score", 7) +
  pad("Gap", 6) +
  "⚠"
);
console.log(DASH);

for (const r of results) {
  console.log(
    pad(r.type, 10) +
    pad(r.root, 5) +
    pad(r.notes, 20) +
    pad(r.primary, 26) +
    pad(r.primaryScore, 7) +
    pad(r.second, 26) +
    pad(r.secondScore, 7) +
    pad(r.gap, 6) +
    (r.doubtful ? "⚠" : "")
  );
}

if (doubtfulCases.length > 0) {
  console.log(`\n${SEP}`);
  console.log(`CASOS DUDOSOS — gap < ${GAP_THRESHOLD} (revisión manual recomendada)`);
  console.log(DASH);
  for (const r of doubtfulCases) {
    console.log(`\n  [${r.type} / ${r.root}]  ${r.notes}`);
    console.log(`    → "${r.primary}" (score ${r.primaryScore})`);
    console.log(`    vs "${r.second}" (score ${r.secondScore})  — gap = ${r.gap}`);
  }
  console.log("");
} else {
  console.log(`\n✓ Sin casos dudosos.\n`);
}
