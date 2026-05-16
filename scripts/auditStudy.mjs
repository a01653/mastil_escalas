/**
 * Auditoría del Modo Estudio — 12 casos en C Mayor.
 *
 * Recorre los casos de regresión y reporta para cada uno:
 *   - acorde y escala activa
 *   - diatónico / no diatónico + notas fuera de escala
 *   - clasificación como dominante
 *   - función esperada (relación V7, backdoor, tritono)
 *   - errores detectados
 *
 * Uso:
 *   npm run audit:study
 */

import {
  analyzeChordScaleCompatibility,
  isStudyDominantChord,
  buildDominantInfo,
  buildBackdoorDominantInfo,
  buildStudySubstitutionGuide,
  buildStudyChordSpecFromUi,
} from "../src/music/appVoicingStudyCore.js";

// ─── Constantes ───────────────────────────────────────────────────────────────

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const C = 0, D = 2, E = 4, F = 5, G = 7, A = 9, B = 11, Db = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildGuide(rootPc, name, plan, ps = false) {
  return buildStudySubstitutionGuide({
    chordRootPc: rootPc,
    chordName: name,
    plan,
    preferSharps: ps,
    harmonizedScale: null,
    backdoorDominantInfo: buildBackdoorDominantInfo(rootPc, ps),
    scaleNotesText: "C D E F G A B",
    scaleRootPc: C,
    scaleName: "Mayor",
    harmonyMode: "major",
    scaleIntervals: C_MAJOR,
  });
}

function findItem(sections, title) {
  for (const sec of sections) {
    const item = (sec.items || []).find((i) => i.title === title);
    if (item) return item;
  }
  return null;
}

// ─── Definición de casos ──────────────────────────────────────────────────────

const CASES = [
  {
    id: 1,
    label: "Cmaj7 en C Mayor",
    voicing: "x32000",
    rootPc: C,
    name: "Cmaj7",
    plan: { quality: "maj", intervals: [0, 4, 7, 11] },
    ps: false,
    expectedDiatonic: true,
    expectedDominant: false,
    expectedFunction: "Imaj7 de C Mayor",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (!compat.isDiatonic) errors.push("FALLO: debería ser diatónico");
      if (isDom) errors.push("FALLO: no debe ser dominante");
      if (sections[0].warning) errors.push("FALLO: sec[0].warning debe ser null");
      if (sections[1].warning) errors.push("FALLO: sec[1].warning debe ser null");
      const relItem = findItem(sections, "Relativo menor");
      if (!relItem) errors.push("FALLO: falta sección 'Relativo menor'");
      else if (!relItem.derivation.some((s) => s.includes("Am7")))
        errors.push("FALLO: relativo menor debe incluir Am7");
      return errors;
    },
  },
  {
    id: 2,
    label: "Dm7 en C Mayor",
    voicing: "xx0211",
    rootPc: D,
    name: "Dm7",
    plan: { quality: "min", intervals: [0, 3, 7, 10] },
    ps: false,
    expectedDiatonic: true,
    expectedDominant: false,
    expectedFunction: "IIm7 de C Mayor",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (!compat.isDiatonic) errors.push("FALLO: debería ser diatónico");
      if (isDom) errors.push("FALLO: no debe ser dominante");
      if (sections[0].warning) errors.push("FALLO: sec[0].warning debe ser null");
      if (sections[1].warning) errors.push("FALLO: sec[1].warning debe ser null");
      return errors;
    },
  },
  {
    id: 3,
    label: "G7 en C Mayor",
    voicing: "3x343x",
    rootPc: G,
    name: "G7",
    plan: { quality: "dom", intervals: [0, 4, 7, 10] },
    ps: true,
    expectedDiatonic: true,
    expectedDominant: true,
    expectedFunction: "V7 de C Mayor",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (!compat.isDiatonic) errors.push("FALLO: G7 debe ser diatónico en C Mayor");
      if (!isDom) errors.push("FALLO: G7 debe ser dominante");
      if (!sections[1].warning?.includes("ya cumple función dominante"))
        errors.push("FALLO: sec[1].warning debe indicar que ya es dominante diatónico");
      const tritone = findItem(sections, "Sustitución tritonal");
      const tritText = tritone?.derivation?.join(" ") || "";
      if (!tritText.includes("Db7"))
        errors.push("FALLO: tritono de G7 debe ser Db7");
      const iiv = findItem(sections, "Interpolación II-V");
      const iivText = iiv?.derivation?.join(" ") || "";
      if (!iivText.includes("Dm7 - G7"))
        errors.push("FALLO: II-V principal debe incluir 'Dm7 - G7'");
      if (!iivText.includes("Cmaj7"))
        errors.push("FALLO: II-V principal debe resolver a Cmaj7");
      const altLine = iiv?.derivation?.find((s) => s.includes("Am7"));
      if (!altLine)
        errors.push("FALLO: Am7-D7→G7 debe aparecer como tonicización alternativa");
      else if (!altLine.includes("Tonicización alternativa"))
        errors.push("FALLO: Am7-D7→G7 debe estar marcado como 'Tonicización alternativa'");
      const us = findItem(sections, "Poliacordes / Upper Structures");
      const usText = us?.examples?.join(" ") || "";
      if (!usText.includes("A mayor/G7"))
        errors.push("FALLO: upper structure principal debe ser A mayor/G7");
      return errors;
    },
  },
  {
    id: 4,
    label: "G7/D en C Mayor",
    voicing: "x5546x",
    rootPc: G,
    name: "G7/D",
    plan: { quality: "dom", intervals: [0, 4, 7, 10], bassInterval: 7 },
    ps: true,
    expectedDiatonic: true,
    expectedDominant: true,
    expectedFunction: "V7/2ª inversión de C Mayor",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (!compat.isDiatonic) errors.push("FALLO: G7/D debe ser diatónico");
      if (!isDom) errors.push("FALLO: G7/D debe ser dominante");
      if (!sections[1].warning?.includes("ya cumple función dominante"))
        errors.push("FALLO: debe tener advertencia de dominante diatónico");
      if (sections[0].warning)
        errors.push("FALLO: sec[0].warning debe ser null (es diatónico)");
      return errors;
    },
  },
  {
    id: 5,
    label: "Gmaj7 en C Mayor",
    voicing: "xx5432",
    rootPc: G,
    name: "Gmaj7",
    plan: { quality: "maj", intervals: [0, 4, 7, 11] },
    ps: true,
    expectedDiatonic: false,
    expectedDominant: false,
    expectedFunction: "no diatónico — en C Mayor sobre G se espera G7",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (compat.isDiatonic) errors.push("FALLO: Gmaj7 NO debe ser diatónico");
      if (compat.notesOutOfScale.length !== 1)
        errors.push("FALLO: exactamente 1 nota fuera de escala (F#)");
      const fsharp = compat.notesOutOfScale[0];
      if (fsharp?.name !== "F#")
        errors.push(`FALLO: nota fuera de escala debe ser F#, obtenido: ${fsharp?.name}`);
      if (fsharp?.intervalLabel !== "7M")
        errors.push(`FALLO: intervalo debe ser 7M, obtenido: ${fsharp?.intervalLabel}`);
      if (!compat.diatonicSuggestion?.includes("G7"))
        errors.push("FALLO: diatonicSuggestion debe mencionar G7");
      if (!compat.diatonicSuggestion?.includes("b7"))
        errors.push("FALLO: diatonicSuggestion debe mencionar b7");
      if (isDom) errors.push("FALLO: Gmaj7 no es dominante");
      if (!sections[0].warning?.includes("Gmaj7 no es diatónico en C Mayor"))
        errors.push("FALLO: sec[0].warning debe indicar que Gmaj7 no es diatónico en C Mayor");
      const secDom = findItem(sections, "Dominante secundario");
      if (!secDom?.derivation?.join(" ").includes("D7"))
        errors.push("FALLO: dominante secundario hacia G debe ser D7");
      return errors;
    },
  },
  {
    id: 6,
    label: "Fmaj7 en C Mayor",
    voicing: "xx3210",
    rootPc: F,
    name: "Fmaj7",
    plan: { quality: "maj", intervals: [0, 4, 7, 11] },
    ps: false,
    expectedDiatonic: true,
    expectedDominant: false,
    expectedFunction: "IVmaj7 de C Mayor",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (!compat.isDiatonic) errors.push("FALLO: Fmaj7 debe ser diatónico");
      if (isDom) errors.push("FALLO: Fmaj7 no es dominante");
      if (sections[0].warning) errors.push("FALLO: sec[0].warning debe ser null");
      if (sections[1].warning) errors.push("FALLO: sec[1].warning debe ser null");
      return errors;
    },
  },
  {
    id: 7,
    label: "Am7 en C Mayor",
    voicing: "x02010",
    rootPc: A,
    name: "Am7",
    plan: { quality: "min", intervals: [0, 3, 7, 10] },
    ps: false,
    expectedDiatonic: true,
    expectedDominant: false,
    expectedFunction: "VIm7 de C Mayor",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (!compat.isDiatonic) errors.push("FALLO: Am7 debe ser diatónico");
      if (isDom) errors.push("FALLO: Am7 no es dominante");
      if (sections[0].warning) errors.push("FALLO: sec[0].warning debe ser null");
      if (sections[1].warning) errors.push("FALLO: sec[1].warning debe ser null");
      const relItem = findItem(sections, "Relativo mayor");
      if (!relItem) errors.push("FALLO: falta sección 'Relativo mayor'");
      else if (!relItem.derivation.some((s) => s.includes("Cmaj7")))
        errors.push("FALLO: relativo mayor de Am7 debe ser Cmaj7");
      return errors;
    },
  },
  {
    id: 8,
    label: "Bm7(b5) en C Mayor",
    voicing: "x2323x",
    rootPc: B,
    name: "Bm7(b5)",
    plan: { quality: "hdim", intervals: [0, 3, 6, 10] },
    ps: true,
    expectedDiatonic: true,
    expectedDominant: false,
    expectedFunction: "VIIm7(b5) de C Mayor — dominante sin tónica (hdim, no dom)",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (!compat.isDiatonic) errors.push("FALLO: Bm7(b5) debe ser diatónico");
      if (isDom) errors.push("FALLO: Bm7(b5) no es dominante (hdim ≠ dom)");
      if (sections[0].warning) errors.push("FALLO: sec[0].warning debe ser null");
      if (sections[1].warning) errors.push("FALLO: sec[1].warning debe ser null");
      return errors;
    },
  },
  {
    id: 9,
    label: "E7 en C Mayor",
    voicing: "020100",
    rootPc: E,
    name: "E7",
    plan: { quality: "dom", intervals: [0, 4, 7, 10] },
    ps: true,
    expectedDiatonic: false,
    expectedDominant: true,
    expectedFunction: "no diatónico — dominante secundario V7/Am",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (compat.isDiatonic) errors.push("FALLO: E7 NO debe ser diatónico (G#)");
      if (!isDom) errors.push("FALLO: E7 debe ser dominante");
      if (!sections[0].warning) errors.push("FALLO: sec[0].warning debe ser no null");
      if (sections[1].warning)
        errors.push("FALLO: sec[1].warning debe ser null (E7 no es el dominante diatónico de C)");
      // Verificar que buildDominantInfo(Am) = E7
      const v7ofAm = buildDominantInfo(A, false);
      if (v7ofAm.name !== "E7")
        errors.push(`FALLO: V7 de Am debe ser E7, obtenido: ${v7ofAm.name}`);
      return errors;
    },
  },
  {
    id: 10,
    label: "A7 en C Mayor",
    voicing: "x02020",
    rootPc: A,
    name: "A7",
    plan: { quality: "dom", intervals: [0, 4, 7, 10] },
    ps: true,
    expectedDiatonic: false,
    expectedDominant: true,
    expectedFunction: "no diatónico — dominante secundario V7/Dm",
    checks: (compat, isDom) => {
      const errors = [];
      if (compat.isDiatonic) errors.push("FALLO: A7 NO debe ser diatónico (C#)");
      const c = compat.notesOutOfScale.find((n) => n.intervalLabel === "3");
      if (c?.name !== "C#")
        errors.push(`FALLO: nota fuera de escala debe ser C#, obtenido: ${c?.name}`);
      if (!isDom) errors.push("FALLO: A7 debe ser dominante");
      const v7ofDm = buildDominantInfo(D, true);
      if (v7ofDm.name !== "A7")
        errors.push(`FALLO: V7 de Dm debe ser A7, obtenido: ${v7ofDm.name}`);
      return errors;
    },
  },
  {
    id: 11,
    label: "F7 en C Mayor",
    voicing: "131211",
    rootPc: F,
    name: "F7",
    plan: { quality: "dom", intervals: [0, 4, 7, 10] },
    ps: false,
    expectedDiatonic: false,
    expectedDominant: true,
    expectedFunction: "no diatónico — backdoor bVII7 → G",
    checks: (compat, isDom) => {
      const errors = [];
      if (compat.isDiatonic) errors.push("FALLO: F7 NO debe ser diatónico (Eb)");
      const b7 = compat.notesOutOfScale.find((n) => n.intervalLabel === "b7");
      if (b7?.name !== "Eb")
        errors.push(`FALLO: b7 de F debe ser Eb, obtenido: ${b7?.name}`);
      if (b7?.name === "D#") errors.push("FALLO: spelling incorrecto D# en lugar de Eb");
      if (!isDom) errors.push("FALLO: F7 debe ser dominante");
      const backdoor = buildBackdoorDominantInfo(G, true);
      if (backdoor.name !== "F7")
        errors.push(`FALLO: backdoor de G debe ser F7, obtenido: ${backdoor.name}`);
      return errors;
    },
  },
  {
    id: 12,
    label: "Db7 en C Mayor",
    voicing: "x4646x",
    rootPc: Db,
    name: "Db7",
    plan: { quality: "dom", intervals: [0, 4, 7, 10] },
    ps: false,
    expectedDiatonic: false,
    expectedDominant: true,
    expectedFunction: "no diatónico — sustituto tritonal de G7",
    checks: (compat, isDom, sections) => {
      const errors = [];
      if (compat.isDiatonic) errors.push("FALLO: Db7 NO debe ser diatónico");
      const names = compat.notesOutOfScale.map((n) => n.name);
      if (!names.includes("Db")) errors.push("FALLO: Db debe estar fuera de escala");
      if (!names.includes("Ab")) errors.push("FALLO: Ab debe estar fuera de escala");
      if (!isDom) errors.push("FALLO: Db7 debe ser dominante");
      if (!sections[0].warning) errors.push("FALLO: sec[0].warning debe ser no null");
      const tritone = findItem(sections, "Sustitución tritonal");
      const tritText = tritone?.derivation?.join(" ") || "";
      if (!tritText.includes("G7"))
        errors.push("FALLO: tritono de Db7 debe ser G7");
      // Spelling de notas del acorde
      const spec = buildStudyChordSpecFromUi({
        rootPc: Db, preferSharps: false, quality: "dom", structure: "tetrad", ext7: true,
      });
      const specNotes = spec.notes;
      if (!specNotes.includes("Db")) errors.push("FALLO: nota Db no encontrada en el chord spec");
      if (!specNotes.includes("Ab")) errors.push("FALLO: nota Ab no encontrada en el chord spec");
      if (!specNotes.includes("Cb")) errors.push("FALLO: b7 de Db debe ser Cb en el chord spec");
      if (specNotes.includes("B")) errors.push("ADVERTENCIA: b7 de Db aparece como B en el chord spec en lugar de Cb");
      return errors;
    },
  },
];

// ─── Ejecutor ─────────────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";

let totalErrors = 0;
let totalCases = 0;
let passedCases = 0;

console.log(`\n${BOLD}═══ Auditoría Modo Estudio — 12 casos en C Mayor ═══${RESET}\n`);

for (const c of CASES) {
  totalCases++;
  const compatResult = analyzeChordScaleCompatibility({
    chordRootPc: c.rootPc,
    chordIntervals: c.plan.intervals,
    activeScaleRootPc: C,
    scaleIntervals: C_MAJOR,
    scaleName: "Mayor",
    chordName: c.name,
    preferSharps: c.ps,
  });
  const isDom = isStudyDominantChord(c.plan);
  const sections = buildGuide(c.rootPc, c.name, c.plan, c.ps);

  const errors = c.checks(compatResult, isDom, sections);
  const ok = errors.length === 0;

  const status = ok ? `${GREEN}✓ OK${RESET}` : `${RED}✗ ${errors.length} error(es)${RESET}`;
  const diatLabel = compatResult.isDiatonic
    ? `${GREEN}diatónico${RESET}`
    : `${YELLOW}no diatónico${RESET}`;
  const domLabel = isDom ? `${YELLOW}dominante${RESET}` : `${DIM}no dominante${RESET}`;

  const outOfScale = compatResult.notesOutOfScale.length
    ? compatResult.notesOutOfScale.map((n) => `${n.name}(${n.intervalLabel})`).join(", ")
    : "—";

  console.log(`${BOLD}Caso ${c.id}:${RESET} ${c.name}  [${c.voicing}]`);
  console.log(`  Escala activa : C Mayor`);
  console.log(`  Diatónico     : ${diatLabel}  (fuera de escala: ${outOfScale})`);
  console.log(`  Dominante     : ${domLabel}`);
  console.log(`  Función esp.  : ${c.expectedFunction}`);
  console.log(`  Resultado     : ${status}`);

  if (!ok) {
    for (const e of errors) {
      console.log(`    ${RED}→ ${e}${RESET}`);
    }
    totalErrors += errors.length;
  } else {
    passedCases++;
  }
  console.log();
}

// ─── Resumen ──────────────────────────────────────────────────────────────────

console.log(`${BOLD}═══ Resumen ═══${RESET}`);
console.log(`  Casos: ${totalCases}  Pasaron: ${GREEN}${passedCases}${RESET}  Fallaron: ${totalErrors > 0 ? RED : GREEN}${totalCases - passedCases}${RESET}  Errores totales: ${totalErrors > 0 ? RED : GREEN}${totalErrors}${RESET}`);

if (totalErrors > 0) {
  process.exit(1);
}
