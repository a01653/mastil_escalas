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
  mod12,
  noteNameToPc,
  pcToName,
  preferSharpsFromMajorTonicPc,
} from "../src/music/chordDetectionEngine.js";

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

// ─── Auditoría de deduplicación ───────────────────────────────────────────

function contentKey(r) {
  return [
    r.rootPc,
    r.bassPc,
    r.preferSharps ? "s" : "f",
    (r.visibleIntervals || []).slice().sort((a, b) => a - b).join(","),
    (r.missingLabels   || []).slice().sort().join(","),
  ].join("|");
}

function checkDedup(readings, label, errors) {
  const groups = new Map();
  for (const r of readings) {
    if (r.formula?.quartal) continue;
    const k = contentKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r.name);
  }
  for (const [, names] of groups) {
    if (names.length < 2) continue;
    errors.push({
      rule: "dedup-failure", label,
      name: names.join(" / "),
      detail: `${names.length} lecturas con mismo root/bajo/intervalos/missing no deduplicadas`,
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
