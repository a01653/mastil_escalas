/**
 * Auditoría masiva de detección de acordes sobre voicings reales de guitarra.
 *
 * Modo cache (por defecto):
 *   Colapsa por PC-set + bajo-real → analiza cada combinación única una vez.
 *
 * Modo --no-cache:
 *   Analiza cada voicing físico con detectChordReadings() pasando objetos
 *   completos (pitch MIDI real). Confirma que el cache no oculta diferencias
 *   debidas al orden de pitches (cuartales, bajo, slash chord, etc.).
 *
 * Invariantes (ERROR):
 *   minor-no-b3      — calidad min/dim/hdim pero b3 en missingLabels
 *   dim-no-b5        — calidad dim/hdim pero b5 (intervalo 6) no visible
 *   m7b5-incomplete  — nombre "Xm7b5" pero sin b3/b5/b7 visibles
 *   slash-mismatch   — slash /X no coincide con bassPc de la lectura
 *   dedup-failure    — dos lecturas con mismo root/bajo/intervalos/missing
 *   altered-copy-loss      — la lectura es copiable pero Acordes perdería o añadiría notas
 *   dominant-addb2         — dominante con b2 nombrada "addb2" en lugar de b9
 *   altered-label-mismatch — #9/b9/#5 de la copia sin su grado funcional en la lectura
 *   altered-name-mismatch  — alteración de la copia ausente del nombre
 *
 * Invariantes (WARNING):
 *   contradictory-no3 — calidad minor/dim/hdim y "(no3)" en nombre
 *   m7b5-no5          — nombre contiene "m7b5" y "(no5)"
 *
 * Uso:
 *   npm run audit:chords
 *   npm run audit:chords -- --no-cache
 *   node scripts/auditChordDetection.mjs [--no-cache]
 */

import {
  analyzeSelectedNotes,
  detectChordReadings,
  detectOmitFromCandidate,
  mod12,
  noteNameToPc,
  pcToName,
  preferSharpsFromMajorTonicPc,
} from "../src/music/chordDetectionEngine.js";
import { buildChordToneDefinition, normalizeChordUiSpec } from "../src/music/appMusicBasics.js";
import { isAlteredChordFifth, isAlteredChordNinth } from "../src/music/chordAlterations.js";

let alteredReadingsChecked = 0;

// ─── Guitarra ─────────────────────────────────────────────────────────────

// Afinación estándar LowE → HighE
const STRING_OPEN_PCS  = [4, 9, 2, 7, 11, 4];   // E2 A2 D3 G3 B3 E4 (pitch class)
const STRING_OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // MIDI open string pitches

const USE_CACHE = !process.argv.includes("--no-cache");

// ─── Generadores ─────────────────────────────────────────────────────────

function* choose(arr, k) {
  if (k === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of choose(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

function* cartesian(values, n) {
  if (n === 0) { yield []; return; }
  for (const v of values) {
    for (const rest of cartesian(values, n - 1)) {
      yield [v, ...rest];
    }
  }
}

// Trastes por número de notas (equilibrio cobertura/velocidad)
const FRET_SETS = {
  3: [0, 2, 4, 6, 8, 10, 12],   // 7^3 × C(6,3)=20  =  6 860
  4: [0, 3, 6, 9, 12],           // 5^4 × C(6,4)=15  =  9 375
  5: [0, 4, 8, 12],              // 4^5 × C(6,5)=6   =  6 144
  6: [0, 6, 12],                 // 3^6 × C(6,6)=1   =    729
};

function generateVoicings(noteCount) {
  const frets = FRET_SETS[noteCount];
  const voicings = [];

  for (const stringCombo of choose([0, 1, 2, 3, 4, 5], noteCount)) {
    for (const fretCombo of cartesian(frets, noteCount)) {
      const positions = stringCombo.map((sIdx, i) => ({
        sIdx,
        fret:  fretCombo[i],
        pc:    mod12(STRING_OPEN_PCS[sIdx]  + fretCombo[i]),
        pitch: STRING_OPEN_MIDI[sIdx] + fretCombo[i],
      }));

      // Bajo real = nota con pitch MIDI más bajo (no necesariamente la cuerda 0)
      const bassPos = positions.reduce((best, p) => (p.pitch < best.pitch ? p : best));
      const bassPc  = bassPos.pc;

      const pcSet = [...new Set(positions.map(p => p.pc))];
      if (pcSet.length < 3) continue; // menos de 3 alturas distintas

      voicings.push({ positions, bassPc, pcSet });
    }
  }

  return voicings;
}

// ─── Análisis ─────────────────────────────────────────────────────────────

function analyzeWithCache(pcSet, bassPc, cache) {
  const key = pcSet.slice().sort((a, b) => a - b).join(",") + "|" + bassPc;
  if (cache.has(key)) return { result: cache.get(key), cached: true };

  const preferSharps = preferSharpsFromMajorTonicPc(bassPc);
  const noteNames    = pcSet.map(pc => pcToName(pc, preferSharps));
  const bassName     = pcToName(bassPc, preferSharps);
  const result = analyzeSelectedNotes(noteNames, bassName);
  cache.set(key, result);
  return { result, cached: false };
}

function analyzeWithoutCache(positions) {
  const posObjects = positions.map(p => ({
    key:   `${p.sIdx}:${p.fret}`,
    sIdx:  p.sIdx,
    fret:  p.fret,
    pc:    p.pc,
    pitch: p.pitch,
  }));
  const readings = detectChordReadings(posObjects) || [];
  return { result: { readings }, cached: false };
}

// ─── Etiqueta de voicing ──────────────────────────────────────────────────

function voicingLabel(positions, pcSet, bassPc) {
  const fretMap   = new Map(positions.map(p => [p.sIdx, p.fret]));
  const tab       = [0,1,2,3,4,5].map(s => (fretMap.has(s) ? String(fretMap.get(s)) : "x")).join("-");
  const prefs     = preferSharpsFromMajorTonicPc(bassPc);
  const noteStr   = pcSet.map(pc => pcToName(pc, prefs)).join(",");
  const bassStr   = pcToName(bassPc, prefs);
  const pitchStr  = positions.map(p => p.pitch).join(",");
  return `[${tab}] {${noteStr}} bajo=${bassStr} pitches=[${pitchStr}]`;
}

// ─── Invariantes ─────────────────────────────────────────────────────────

function checkInvariants(reading, label, errors, warnings) {
  const q    = reading.formula?.ui?.quality;
  const name = reading.name ?? "";
  const vis  = new Set((reading.visibleIntervals || []).map(v => mod12(v)));
  const miss = reading.missingLabels || [];

  // 1. min/dim/hdim no debe tener b3 faltante
  if (q && ["min", "dim", "hdim"].includes(q)) {
    if (miss.some(l => /^[b#]?3$/.test(l))) {
      errors.push({
        rule: "minor-no-b3", label, name,
        detail: `quality=${q} pero missingLabels incluye tercera: ${JSON.stringify(miss)}`,
      });
    }
  }

  // 2. dim/hdim debe mostrar b5 (intervalo 6)
  if (q && ["dim", "hdim"].includes(q)) {
    if (!vis.has(6)) {
      errors.push({
        rule: "dim-no-b5", label, name,
        detail: `quality=${q} pero b5(6) no está en visibleIntervals: ${JSON.stringify([...vis])}`,
      });
    }
  }

  // 3. "Xm7b5" puro → b3(3), b5(6), b7(10) visibles
  if (/^[A-G][#b]{0,2}m7b5(\/[A-G][#b]{0,2})?$/.test(name)) {
    if (!vis.has(3) || !vis.has(6) || !vis.has(10)) {
      errors.push({
        rule: "m7b5-incomplete", label, name,
        detail: `m7b5 requiere b3(3),b5(6),b7(10) visibles; tiene: ${JSON.stringify([...vis].sort((a,b)=>a-b))}`,
      });
    }
  }

  // 4. Slash /X debe coincidir con bassPc de la lectura
  const slashMatch = /\/([A-Ga-g][b#]{0,2})$/.exec(name);
  if (slashMatch) {
    const slashPc = noteNameToPc(slashMatch[1]);
    if (slashPc != null && mod12(slashPc) !== mod12(reading.bassPc)) {
      errors.push({
        rule: "slash-mismatch", label, name,
        detail: `slash=${slashMatch[1]}(pc=${slashPc}) ≠ bassPc=${reading.bassPc}`,
      });
    }
  }

  // 5. Alteraciones de quinta/novena: la copia reproduce la lectura sin perder nada.
  checkAlterationInvariants(reading, label, errors);

  // W1. Calidad menor con (no3) en nombre
  if (q && ["min", "dim", "hdim"].includes(q) && /\(no[b#]?3\)/.test(name)) {
    warnings.push({
      rule: "contradictory-no3", label, name,
      detail: `quality=${q} con "(no3)" en el nombre`,
    });
  }

  // W2. m7b5 con (no5) en nombre
  if (/m7b5/.test(name) && /\(no5\)/.test(name)) {
    warnings.push({
      rule: "m7b5-no5", label, name,
      detail: `"m7b5" y "(no5)" coexisten en el nombre`,
    });
  }
}

function checkAlterationInvariants(reading, label, errors) {
  const name = reading.name ?? "";
  const labels = reading.formula?.degreeLabels || [];
  const intervals = (reading.formula?.intervals || []).map(mod12);
  const labelOf = (interval) => labels[intervals.indexOf(interval)];
  const q = reading.uiPatch?.quality || reading.formula?.ui?.quality;

  if (q === "dom" && /addb2/.test(name) && intervals.includes(4) && intervals.includes(10)) {
    errors.push({ rule: "dominant-addb2", label, name, detail: "la b2 de un dominante debe nombrarse b9" });
  }

  const patch = reading.uiPatch;
  if (!patch || patch.family || reading.formula?.quartal) return;
  const omit = detectOmitFromCandidate(reading);
  const spec = normalizeChordUiSpec({ ...patch, omit });
  const fifthAltered = isAlteredChordFifth(spec.fifth, spec.quality, spec.suspension);
  const ninthAltered = isAlteredChordNinth(spec.ninth);
  if (fifthAltered || ninthAltered) alteredReadingsChecked++;

  const sounding = [...new Set((reading.visibleIntervals || []).map(mod12))];
  const missing = (reading.missingLabels || []).map((l) => intervals[labels.indexOf(l)]).filter((x) => x != null);
  const built = buildChordToneDefinition(spec).intervals;
  const lost = sounding.filter((i) => !built.includes(i));
  const invented = built.filter((i) => !sounding.includes(i) && !missing.includes(i));
  if (lost.length || invented.length) {
    errors.push({ rule: "altered-copy-loss", label, name, detail: `suena [${sounding}] y Acordes construiría [${built}] (pierde [${lost}], añade [${invented}])` });
  }

  if (fifthAltered) {
    const interval = spec.fifth === "#5" ? 8 : 6;
    if (labelOf(interval) !== spec.fifth) errors.push({ rule: "altered-label-mismatch", label, name, detail: `quinta ${spec.fifth} etiquetada "${labelOf(interval)}"` });
    const named = spec.fifth === "#5" ? /#5|aug/.test(name) : /b5/.test(name);
    if (!named) errors.push({ rule: "altered-name-mismatch", label, name, detail: `quinta ${spec.fifth} no aparece en el nombre` });
  }
  if (ninthAltered) {
    const interval = spec.ninth === "#9" ? 3 : 1;
    if (labelOf(interval) !== spec.ninth) errors.push({ rule: "altered-label-mismatch", label, name, detail: `novena ${spec.ninth} etiquetada "${labelOf(interval)}"` });
    if (!name.includes(spec.ninth)) errors.push({ rule: "altered-name-mismatch", label, name, detail: `novena ${spec.ninth} no aparece en el nombre` });
  }
}

// ─── Auditoría de deduplicación ───────────────────────────────────────────

function contentKey(r) {
  return [
    r.rootPc,
    r.bassPc,
    r.preferSharps ? "s" : "f",
    (r.visibleIntervals || []).slice().sort((a, b) => a - b).join(","),
    (r.missingLabels   || []).slice().sort().join(","),
    // Lectura alternativa ♭13 sin 5ª: coexiste a propósito con la de ♯5 (mismas notas).
    r.formula?.flatThirteenthAlternative ? "b13alt" : "",
    // Y la alternativa ♯5 menor (m7(#5)) junto a su lectura ♭13 (m7(b13,no5)).
    r.formula?.sharpFifthAlternative ? "s5alt" : "",
  ].join("|");
}

// Alternativa ♯5 menor: va justo detrás de su lectura ♭13/♭6 (misma raíz, bajo y
// notas), es copiable con ♯5 y nunca aparece si suena la 5ª justa.
let sharpFifthAlternativesChecked = 0;
function checkSharpFifthAlternatives(readings, label, errors) {
  readings.forEach((r, idx) => {
    if (!r.formula?.sharpFifthAlternative) return;
    sharpFifthAlternativesChecked++;
    const prev = readings[idx - 1];
    const sameNotes = (a, b) => (a.visibleIntervals || []).slice().sort((x, y) => x - y).join(",") === (b.visibleIntervals || []).slice().sort((x, y) => x - y).join(",");
    const prevIdx8 = (prev?.formula?.intervals || []).findIndex((i) => ((i % 12) + 12) % 12 === 8);
    const prevLabel = prevIdx8 >= 0 ? prev.formula.degreeLabels[prevIdx8] : "";
    if (!prev || prev.rootPc !== r.rootPc || prev.bassPc !== r.bassPc || !sameNotes(prev, r) || !["b13", "b6"].includes(prevLabel)) {
      errors.push({ rule: "sharp5-alt-placement", label, name: r.name, detail: `no va justo detrás de su lectura ♭13 (anterior: ${prev?.name ?? "ninguna"})` });
    }
    if (idx === 0) errors.push({ rule: "sharp5-alt-primary", label, name: r.name, detail: "la alternativa ♯5 no puede ser la lectura principal" });
    if ((r.visibleIntervals || []).some((i) => ((i % 12) + 12) % 12 === 7)) errors.push({ rule: "sharp5-alt-with-fifth", label, name: r.name, detail: "ofrecida con 5ª justa" });
    if (r.uiPatch?.fifth !== "#5") errors.push({ rule: "sharp5-alt-copy", label, name: r.name, detail: `copia con quinta ${r.uiPatch?.fifth ?? "null"}` });
  });
}

const COEXISTENCE_PAIRS = new Set([
  ["sus2sharp11", "add9sharp11no3"].sort().join("|"),
  ["maj7no3", "5maj7"].sort().join("|"),
  ["maddb13", "mflat13"].sort().join("|"),
]);

function checkDedup(readings, label, errors) {
  const groups = new Map();
  for (const r of readings) {
    if (r.formula?.quartal) continue;
    const k = contentKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ name: r.name, formulaId: String(r?.formula?.id || "") });
  }
  for (const [, entries] of groups) {
    if (entries.length < 2) continue;
    if (entries.length === 2) {
      const pairKey = entries.map(e => e.formulaId).sort().join("|");
      if (COEXISTENCE_PAIRS.has(pairKey)) continue;
    }
    errors.push({
      rule: "dedup-failure", label,
      name: entries.map(e => e.name).join(" / "),
      detail: `${entries.length} lecturas con mismo root/bajo/intervalos/missing no deduplicadas`,
    });
  }
}

// ─── Bucle principal ──────────────────────────────────────────────────────

const errors   = [];
const warnings = [];
let totalVoicings   = 0;
let totalSkipped    = 0;
let totalCandidates = 0;
let cacheHits       = 0;

const cache = new Map(); // solo usado en modo cache

const t0 = Date.now();
process.stdout.write(`Generando voicings [${USE_CACHE ? "cache" : "sin cache"}]`);

for (const noteCount of [3, 4, 5, 6]) {
  const voicings = generateVoicings(noteCount);

  for (const { positions, bassPc, pcSet } of voicings) {
    totalVoicings++;
    if (totalVoicings % 2000 === 0) process.stdout.write(".");

    const { result, cached } = USE_CACHE
      ? analyzeWithCache(pcSet, bassPc, cache)
      : analyzeWithoutCache(positions);

    if (cached) cacheHits++;

    if (!result?.readings?.length) { totalSkipped++; continue; }

    const label = voicingLabel(positions, pcSet, bassPc);
    totalCandidates += result.readings.length;

    for (const r of result.readings) {
      checkInvariants(r, label, errors, warnings);
    }
    checkDedup(result.readings, label, errors);
    checkSharpFifthAlternatives(result.readings, label, errors);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
process.stdout.write("\n");

// ─── Informe ──────────────────────────────────────────────────────────────

const SEP  = "=".repeat(100);
const DASH = "-".repeat(100);

console.log(`\n${SEP}`);
console.log("AUDITORÍA DE DETECCIÓN DE ACORDES — GUITARRA REAL (LowE→HighE, trastes 0-12)");
console.log(SEP);
console.log(`  Modo                : ${USE_CACHE ? "cache (PC-set + bajo)" : "sin cache (voicings físicos)"}`);
console.log(`  Voicings físicos    : ${totalVoicings.toLocaleString()}`);
if (USE_CACHE) {
  console.log(`  Análisis únicos     : ${cache.size.toLocaleString()}  (${cacheHits.toLocaleString()} hits de cache)`);
} else {
  console.log(`  Análisis realizados : ${(totalVoicings - totalSkipped).toLocaleString()}`);
}
console.log(`  Candidatos revisados: ${totalCandidates.toLocaleString()}`);
console.log(`  Lecturas copiables con quinta/novena alterada verificadas: ${alteredReadingsChecked.toLocaleString()}`);
console.log(`  Alternativas ♯5 menores verificadas: ${sharpFifthAlternativesChecked.toLocaleString()}`);
console.log(`  Sin lectura         : ${totalSkipped}`);
console.log(`  Tiempo              : ${elapsed}s`);
console.log(`  ERRORES             : ${errors.length}`);
console.log(`  WARNINGS            : ${warnings.length}`);
console.log(SEP);

if (errors.length === 0 && warnings.length === 0) {
  console.log("\n✓ Sin errores ni warnings.\n");
  process.exit(0);
}

function reportGroup(title, items) {
  if (!items.length) return;
  const byRule = new Map();
  for (const item of items) {
    if (!byRule.has(item.rule)) byRule.set(item.rule, []);
    byRule.get(item.rule).push(item);
  }
  console.log(`\n${title}`);
  console.log(DASH);
  for (const [rule, group] of byRule) {
    console.log(`\n  [${rule}] — ${group.length} caso(s)`);
    for (const item of group.slice(0, 5)) {
      console.log(`    • ${item.label}`);
      console.log(`      "${item.name}" → ${item.detail}`);
    }
    if (group.length > 5) console.log(`    ... y ${group.length - 5} más`);
  }
  console.log("");
}

reportGroup("ERRORES", errors);
reportGroup("WARNINGS", warnings);

process.exit(errors.length > 0 ? 1 : 0);
