/**
 * Informe de "mayInclude ausentes".
 *
 * Objetivo: antes de tocar el lector principal, caracterizar QUE lecturas de
 * nivel `mayInclude` propone el oraculo pero el lector real (analyzeFretsCore)
 * NO devuelve, para decidir cuales merecen mostrarse como "alternativas
 * razonables" y cuales deben quedar como "avanzadas / contextuales".
 *
 * Fuente de datos (informes ACTUALES, no se regeneran aqui):
 *   - reports/frets-oracle-compare-discrepancies.ndjson
 *       Veredicto autoritativo de que `mayInclude` faltan (avisos
 *       MISSING_MAY_INCLUDE producidos por compareFretsOracle.mjs).
 *   - El oraculo puro (analyzeFretsOracle) se re-ejecuta SOLO sobre los
 *       voicings afectados para recuperar la estructura completa del candidato
 *       (quality, intervals, category, missing, tensions). Es deterministico,
 *       asi que el conteo total coincide con el informe de comparacion.
 *
 * No modifica el lector principal ni los scripts existentes.
 *
 * Salidas:
 *   reports/frets-mayinclude-report.json
 *   reports/frets-mayinclude-report.md
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { analyzeFretsOracle, generateOracleVoicingPatterns } from "../src/music/fretsOracle.js";
import { analyzeFretsCore } from "../src/music/analyzeFretsCore.js";
import { mod12 } from "../src/music/chordDetectionEngine.js";

const DEFAULT_INPUT = "reports/frets-oracle-compare-discrepancies.ndjson";
const DEFAULT_COMPARE_JSON = "reports/frets-oracle-compare.json";
const DEFAULT_OUT_JSON = "reports/frets-mayinclude-report.json";
const DEFAULT_OUT_MD = "reports/frets-mayinclude-report.md";

const TOP_REPRESENTATIVE_MD = 50;
const TOP_REPRESENTATIVE_JSON = 200;
const EXAMPLES_MD = 25;
const EXAMPLES_JSON = 60;

// Orden por semitono para canonizar el patron de intervalo.
const LABEL_TO_SEMITONE = new Map([
  ["1", 0], ["b9", 1], ["b2", 1], ["9", 2], ["2", 2], ["#9", 3], ["b3", 3],
  ["3", 4], ["11", 5], ["4", 5], ["#11", 6], ["#4", 6], ["b5", 6], ["5", 7],
  ["#5", 8], ["b13", 8], ["b6", 8], ["13", 9], ["6", 9], ["b7", 10], ["7", 11],
]);

function parseArgs(argv) {
  const opts = {
    input: DEFAULT_INPUT,
    compareJson: DEFAULT_COMPARE_JSON,
    outJson: DEFAULT_OUT_JSON,
    outMd: DEFAULT_OUT_MD,
    limit: null,
    skipVerify: false,
    verifyStride: 37,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") opts.input = argv[++i] ?? opts.input;
    else if (arg === "--compare-json") opts.compareJson = argv[++i] ?? opts.compareJson;
    else if (arg === "--out-json") opts.outJson = argv[++i] ?? opts.outJson;
    else if (arg === "--out-md") opts.outMd = argv[++i] ?? opts.outMd;
    else if (arg === "--limit") opts.limit = Number(argv[++i]);
    else if (arg === "--skip-verify") opts.skipVerify = true;
    else if (arg === "--verify-stride") opts.verifyStride = Number(argv[++i]) || 37;
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

function printHelp() {
  console.log(`Uso: npm run report:frets-mayinclude -- [opciones]

Opciones:
  --input <ruta>         NDJSON de discrepancias. Default: ${DEFAULT_INPUT}
  --compare-json <ruta>  Resumen del comparador (para totales). Default: ${DEFAULT_COMPARE_JSON}
  --out-json <ruta>      Salida JSON. Default: ${DEFAULT_OUT_JSON}
  --out-md <ruta>        Salida Markdown. Default: ${DEFAULT_OUT_MD}
  --limit <n>            Procesa solo las primeras n filas con MISSING_MAY_INCLUDE (humo).
  --skip-verify          Omite la verificacion muestreada de cobertura del lector.
  --verify-stride <n>    Paso de muestreo de la verificacion (default 37).
`);
}

function normalizeName(name) {
  return String(name || "").trim();
}

function intervalPattern(intervals) {
  return (intervals || [])
    .slice()
    .sort((a, b) => (LABEL_TO_SEMITONE.get(a) ?? 99) - (LABEL_TO_SEMITONE.get(b) ?? 99))
    .join("·");
}

/** Familia de calidad legible para agrupar (mayor, menor, 7, maj7, m7, m7b5, sus...). */
function qualityFamily(candidate) {
  const base = String(candidate.category || "").split("-")[0];
  const intervals = candidate.intervals || [];
  const hasFlat3 = intervals.includes("b3");
  switch (base) {
    case "dominant": return "7 (dominante)";
    case "maj7": return "maj7";
    case "minor": return "m7";
    case "half-diminished": return "m7b5";
    case "suspended": return "sus";
    case "triadic": return hasFlat3 ? "menor (triada)" : "mayor (triada)";
    default: return base || "otro";
  }
}

/**
 * Clasifica un candidato mayInclude ausente en un "tipo de lectura" (kind) y
 * emite un veredicto musical: util / limite / forzada, con motivo y regla.
 *
 * Recordatorio del oraculo: un candidato es mayInclude cuando falta exactamente
 * UNA nota estructural (missing.length === 1) o cuando lleva tensiones naturales
 * anadidas (9/11/13) sin alteradas. Por tanto:
 *   - Familia B (completa): missing 0, una o varias tensiones anadidas.
 *   - Familia A (fragmento): falta 1 nota (5 o 3).
 *
 * Nota de etiqueta: el oraculo etiqueta la 6ª como "13" (no distingue 6 vs 13
 * cuando no hay 7ª). Un "(add13)" sin 7ª es en realidad un acorde de 6ª.
 */
function classify(candidate) {
  const intervals = candidate.intervals || [];
  const missing = candidate.missing || [];
  const tensions = candidate.tensions || []; // ⊆ {9,11,13} en mayInclude
  const has = (lbl) => intervals.includes(lbl);
  const hasSeventh = has("7") || has("b7");
  const nMissing = missing.length;
  const nTens = tensions.length;
  const missing5only = nMissing === 1 && missing[0] === "5";
  const missingThird = missing.includes("3") || missing.includes("b3");
  const baseCategory = String(candidate.category || "").split("-")[0];

  const family = qualityFamily(candidate);
  const pattern = intervalPattern(intervals);
  const base = {
    family,
    pattern,
    missing: missing.slice(),
    tensions: tensions.slice(),
    inverted: !!candidate.inverted,
    baseCategory,
  };

  // 1) Omite la 3ª: sin tono que defina la calidad. Suele ser un sus2 disfrazado.
  if (missingThird) {
    return {
      ...base,
      kind: "omit3",
      verdict: "forzada",
      score: 0.1,
      rule: "OMIT3",
      reason: "Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte).",
    };
  }

  // 2) Suspendido con tension anadida (sus2/sus4 + 9/11/13): contextual.
  if (baseCategory === "suspended") {
    return {
      ...base,
      kind: "sus-extended",
      verdict: "limite",
      score: 0.45,
      rule: "SUS_EXT",
      reason: "Suspendido con tension anadida: lectura valida pero contextual.",
    };
  }

  // 3) Familia B: acorde completo (no falta estructura) con tensiones anadidas.
  if (nMissing === 0) {
    if (hasSeventh) {
      return {
        ...base,
        kind: "extended-complete-7th",
        verdict: "util",
        score: 0.95,
        rule: "EXT_7TH",
        reason: "Acorde extendido completo con 7ª (9/11/13, maj9, m9, m11...): nombre real y comun.",
      };
    }
    const onlyThirteen = nTens === 1 && tensions[0] === "13";
    const onlyEleven = nTens === 1 && tensions[0] === "11";
    if (onlyThirteen) {
      return {
        ...base,
        kind: "sixth-complete",
        verdict: "util",
        score: 0.85,
        rule: "SIXTH",
        reason: "Triada completa + 6ª: acorde de 6ª real (el oraculo lo etiqueta add13 por no tener 7ª).",
      };
    }
    if (tensions.includes("9")) {
      return {
        ...base,
        kind: "add9-complete",
        verdict: "util",
        score: 0.8,
        rule: "ADD9",
        reason: "Triada completa + 9ª (add9 / 6·9): nombre habitual y reconocible.",
      };
    }
    if (onlyEleven) {
      return {
        ...base,
        kind: "add11-complete",
        verdict: "limite",
        score: 0.4,
        rule: "ADD11",
        reason: "Triada mayor + 11: choca con la 3ª; valida pero contextual.",
      };
    }
    return {
      ...base,
      kind: "extended-complete-other",
      verdict: "limite",
      score: 0.5,
      rule: "EXT_OTHER",
      reason: "Acorde completo con tension anadida menos comun.",
    };
  }

  // 4) Familia A: fragmento que omite SOLO la 5ª (con 3ª presente).
  if (missing5only) {
    if (nTens === 0) {
      return {
        ...base,
        kind: "omit5",
        verdict: "util",
        score: 0.9,
        rule: "OMIT5",
        reason: "Omite solo la 5ª: idiomatico en guitarra (maj7(no5), m7(no5), 7(no5), triada).",
      };
    }
    if (nTens === 1 && tensions[0] === "13") {
      return {
        ...base,
        kind: "omit5-sixth",
        verdict: "util",
        score: 0.75,
        rule: "OMIT5_SIXTH",
        reason: "1-3-6 (6 sin 5ª): ambiguedad clasica con la inversion de la relativa menor; alternativa real.",
      };
    }
    if (nTens === 1 && tensions[0] === "9") {
      return {
        ...base,
        kind: "omit5-add9",
        verdict: "limite",
        score: 0.5,
        rule: "OMIT5_ADD9",
        reason: "add9 sin 5ª: reconocible pero algo incompleto.",
      };
    }
    if (nTens === 1) {
      return {
        ...base,
        kind: "omit5-tension",
        verdict: "forzada",
        score: 0.25,
        rule: "OMIT5_EXOTIC",
        reason: "Omite la 5ª y anade una tension poco comun (p.ej. add11 sin 5ª).",
      };
    }
    return {
      ...base,
      kind: "omit5-multi-tension",
      verdict: "forzada",
      score: 0.15,
      rule: "OMIT5_MULTI",
      reason: "Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura.",
    };
  }

  // 5) Resto (no deberia darse en mayInclude, pero por seguridad).
  return {
    ...base,
    kind: "other",
    verdict: "limite",
    score: 0.4,
    rule: "OTHER",
    reason: "Fragmento no contemplado por las reglas anteriores.",
  };
}

// --- Verificacion: ¿el lector real ya emite las lecturas mayInclude "utiles"? ---
// Replica el matching del comparador (presente si coincide el nombre, o el par
// raiz + firma de semitonos). Muestrea el espacio del oraculo para no recorrerlo
// entero, pero de forma deterministica (paso fijo) para que sea reproducible.

const NATURAL_PC = new Map([["C", 0], ["D", 2], ["E", 4], ["F", 5], ["G", 7], ["A", 9], ["B", 11]]);

function notePc(note) {
  const m = String(note || "").trim().match(/^([A-Ga-g])([#b]*)$/);
  if (!m) return null;
  let pc = NATURAL_PC.get(m[1].toUpperCase());
  for (const acc of m[2]) pc += acc === "#" ? 1 : -1;
  return mod12(pc);
}

function semitoneSigFromLabels(labels) {
  return [...new Set((labels || [])
    .map((l) => LABEL_TO_SEMITONE.get(String(l)))
    .filter((v) => v != null)
    .map(mod12))].sort((a, b) => a - b).join(".");
}

function semitoneSigFromApp(reading) {
  const src = Array.isArray(reading?.visibleIntervals) && reading.visibleIntervals.length
    ? reading.visibleIntervals
    : (reading?.formula?.intervals || []);
  return [...new Set(src.map((v) => mod12(Number(v))).filter(Number.isFinite))]
    .sort((a, b) => a - b).join(".");
}

function appMatchForCandidate(app, candidate) {
  const exact = normalizeName(candidate.name);
  if (app.names.has(exact)) return exact;
  const sig = semitoneSigFromLabels(candidate.intervals);
  const rootPc = notePc(candidate.root);
  if (rootPc == null) return null;
  const match = app.readings.find((r) => rootPc === mod12(r.rootPc) && semitoneSigFromApp(r) === sig);
  return match ? normalizeName(match.name) : null;
}

function verifyUtilCoverage(stride = 37) {
  let sampled = 0;
  let utilTotal = 0;
  let utilPresent = 0;
  const utilAbsentExamples = [];
  const presentExamples = [];
  const seenRules = new Map();
  let i = 0;
  for (const voicing of generateOracleVoicingPatterns()) {
    i += 1;
    if (i % stride !== 0) continue;
    let oracle;
    try { oracle = analyzeFretsOracle(voicing); } catch { continue; }
    if (!oracle) continue;
    const may = oracle.candidates.filter((c) => c.level === "mayInclude");
    if (!may.length) continue;
    let core;
    try { core = analyzeFretsCore(voicing); } catch { continue; }
    sampled += 1;
    const app = {
      names: new Set(core.rankedReadings.map((r) => normalizeName(r.name))),
      readings: core.rankedReadings,
    };
    for (const c of may) {
      const info = classify(c);
      if (info.verdict !== "util") continue;
      utilTotal += 1;
      const shownAs = appMatchForCandidate(app, c);
      if (shownAs) {
        utilPresent += 1;
        // Recoge ejemplos variados por regla para ilustrar la capa util.
        const perRule = seenRules.get(info.rule) ?? 0;
        if (presentExamples.length < 25 && perRule < 6) {
          seenRules.set(info.rule, perRule + 1);
          presentExamples.push({ voicing, oracleName: c.name, rule: info.rule, shownByReaderAs: shownAs, primary: core.primary?.name ?? null });
        }
      } else if (utilAbsentExamples.length < 20) {
        utilAbsentExamples.push({ voicing, candidate: c.name });
      }
    }
  }
  presentExamples.sort((a, b) => a.rule.localeCompare(b.rule));
  return {
    stride,
    sampledVoicings: sampled,
    utilLikeMayInclude: utilTotal,
    alreadyProducedByReader: utilPresent,
    absentFromReader: utilTotal - utilPresent,
    coveragePct: utilTotal ? +(100 * utilPresent / utilTotal).toFixed(2) : null,
    presentExamples,
    absentExamples: utilAbsentExamples,
  };
}

function bump(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function bumpExample(map, key, example) {
  const prev = map.get(key);
  if (prev) {
    prev.count += 1;
    if (prev.examples.length < 4) prev.examples.push(example);
  } else {
    map.set(key, { key, count: 1, examples: [example] });
  }
}

function sortedEntries(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
}

function loadCompareTotals(path) {
  const full = resolve(process.cwd(), path);
  if (!existsSync(full)) return null;
  try {
    const json = JSON.parse(readFileSync(full, "utf8"));
    return json.summary ?? null;
  } catch {
    return null;
  }
}

async function run(opts) {
  const inputPath = resolve(process.cwd(), opts.input);
  if (!existsSync(inputPath)) {
    throw new Error(`No existe ${opts.input}. Ejecuta antes: npm run compare:frets-oracle`);
  }

  let totalNotices = 0;            // total de avisos MISSING_MAY_INCLUDE
  let affectedVoicings = 0;        // filas (voicings) con al menos un mayInclude ausente
  let enriched = 0;                // candidatos reconstruidos desde el oraculo
  let unmatched = 0;               // candidatos que el oraculo ya no reproduce (drift)

  const byVerdict = new Map();
  const byKind = new Map();
  const byCategory = new Map();    // category cruda del oraculo
  const byFamily = new Map();
  const byPattern = new Map();
  const byRule = new Map();
  const representative = new Map(); // firma transposicion-invariante
  const usefulExamples = [];
  const forcedExamples = [];
  const borderlineExamples = [];
  const unmatchedExamples = [];

  const rl = createInterface({
    input: createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let processedRows = 0;
  for await (const line of rl) {
    if (!line.includes("MISSING_MAY_INCLUDE")) continue; // prefiltro barato
    const row = JSON.parse(line);
    const missingNames = (row.notices || [])
      .filter((n) => n.type === "MISSING_MAY_INCLUDE")
      .map((n) => normalizeName(n.expected));
    if (!missingNames.length) continue;

    affectedVoicings += 1;
    processedRows += 1;

    // Reconstruye candidatos del oraculo una sola vez por voicing.
    let oracleByName = null;
    try {
      const oracle = analyzeFretsOracle(row.voicing);
      oracleByName = new Map((oracle?.candidates || []).map((c) => [normalizeName(c.name), c]));
    } catch {
      oracleByName = new Map();
    }

    for (const name of missingNames) {
      totalNotices += 1;
      const candidate = oracleByName.get(name);
      if (!candidate) {
        unmatched += 1;
        if (unmatchedExamples.length < EXAMPLES_JSON) {
          unmatchedExamples.push({ voicing: row.voicing, expected: name, appPrimary: row.appPrimary ?? null });
        }
        continue;
      }
      enriched += 1;
      const info = classify(candidate);
      const example = {
        voicing: row.voicing,
        missing: name,
        appPrimary: row.appPrimary ?? null,
        appReadings: row.appReadings ?? [],
        family: info.family,
        pattern: info.pattern,
        kind: info.kind,
        verdict: info.verdict,
        rule: info.rule,
        reason: info.reason,
        oracleMustInclude: row.oracleMustInclude ?? [],
      };

      bump(byVerdict, info.verdict);
      bump(byKind, info.kind);
      bump(byCategory, candidate.category || "?");
      bump(byFamily, info.family);
      bump(byPattern, info.pattern || "?");
      bump(byRule, info.rule);

      const signature = `${info.family} :: ${info.pattern} :: miss[${info.missing.join(",")}] :: tens[${info.tensions.join(",")}] :: ${info.verdict}`;
      bumpExample(representative, signature, {
        voicing: row.voicing,
        missing: name,
        appPrimary: row.appPrimary ?? null,
      });

      if (info.verdict === "util" && usefulExamples.length < EXAMPLES_JSON) usefulExamples.push(example);
      else if (info.verdict === "forzada" && forcedExamples.length < EXAMPLES_JSON) forcedExamples.push(example);
      else if (info.verdict === "limite" && borderlineExamples.length < EXAMPLES_JSON) borderlineExamples.push(example);
    }

    if (opts.limit && processedRows >= opts.limit) break;
  }

  const compareSummary = loadCompareTotals(opts.compareJson);
  const compareMissingMay = compareSummary?.noticesByType?.MISSING_MAY_INCLUDE ?? null;

  // Verificacion clave: las lecturas mayInclude "utiles" ¿ya las emite el lector?
  const utilCoverage = opts.skipVerify ? null : verifyUtilCoverage(opts.verifyStride);

  const representativeSorted = [...representative.values()]
    .sort((a, b) => b.count - a.count)
    .map((entry) => {
      // El veredicto va al final de la firma.
      const verdict = entry.key.split(" :: ").pop();
      return { signature: entry.key, verdict, count: entry.count, examples: entry.examples };
    });

  const verdictCounts = {
    util: byVerdict.get("util") ?? 0,
    limite: byVerdict.get("limite") ?? 0,
    forzada: byVerdict.get("forzada") ?? 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    source: { input: inputPath, compareJson: resolve(process.cwd(), opts.compareJson) },
    totals: {
      missingMayIncludeNotices: totalNotices,
      affectedVoicings,
      enriched,
      unmatched,
      compareReportMissingMayInclude: compareMissingMay,
      consistentWithCompare: compareMissingMay == null ? null : compareMissingMay === totalNotices,
    },
    verdictCounts,
    verdictShare: {
      util: totalNotices ? +(verdictCounts.util / enriched * 100).toFixed(1) : 0,
      limite: totalNotices ? +(verdictCounts.limite / enriched * 100).toFixed(1) : 0,
      forzada: totalNotices ? +(verdictCounts.forzada / enriched * 100).toFixed(1) : 0,
    },
    utilCoverage,
    byKind: sortedEntries(byKind),
    byCategory: sortedEntries(byCategory),
    byFamily: sortedEntries(byFamily),
    byInterval: sortedEntries(byPattern),
    byRule: sortedEntries(byRule),
    topRepresentative: representativeSorted.slice(0, TOP_REPRESENTATIVE_JSON),
    examples: {
      useful: usefulExamples,
      borderline: borderlineExamples,
      forced: forcedExamples,
      unmatched: unmatchedExamples,
    },
    ruleProposal: buildRuleProposal(verdictCounts, byRule, utilCoverage),
  };
}

function buildRuleProposal(verdictCounts, byRule, utilCoverage) {
  const ruleCount = (rule) => byRule.get(rule) ?? 0;
  return {
    keyFinding: {
      text: "Ninguna lectura mayInclude 'util' esta ausente: el lector real ya las emite "
        + "todas (verificado por muestreo). El trabajo de 'alternativas razonables' es de "
        + "UI (mostrar rankedReadings[1..], no solo el Primary), no del lector. Las "
        + "mayInclude que SI faltan son todas contextuales o forzadas.",
      utilAbsent: verdictCounts.util,
      verifiedCoveragePct: utilCoverage?.coveragePct ?? null,
    },
    alreadyEmittedByReader: {
      description: "Lecturas mayInclude utiles que el lector ya devuelve (0 ausentes). "
        + "No requieren cambio de logica; solo exponerlas en la UI normal.",
      rules: [
        { id: "EXT_7TH", criterio: "Acorde extendido completo con 7ª (9/11/13, maj9, m9, m11).", ausentes: ruleCount("EXT_7TH") },
        { id: "SIXTH", criterio: "Triada completa + 6ª (etiquetar 6, no add13, cuando no hay 7ª).", ausentes: ruleCount("SIXTH") },
        { id: "ADD9", criterio: "Triada completa + 9ª (add9 / 6·9).", ausentes: ruleCount("ADD9") },
        { id: "OMIT5", criterio: "Fragmento que omite SOLO la 5ª con 3ª presente (maj7(no5), m7(no5), 7(no5)).", ausentes: ruleCount("OMIT5") },
        { id: "OMIT5_SIXTH", criterio: "1-3-6 (6 sin 5ª).", ausentes: ruleCount("OMIT5_SIXTH") },
      ],
    },
    advancedContextual: {
      description: "Las mayInclude que el lector NO emite. Todas contextuales/forzadas: "
        + "ocultas por defecto, solo con 'Mostrar lecturas avanzadas'.",
      rules: [
        { id: "SUS_EXT", criterio: "Suspendido con tension anadida (sus2/sus4 + 6/9/11/13).", ausentes: ruleCount("SUS_EXT") },
        { id: "OMIT3", criterio: "Fragmento que omite la 3ª (sin calidad definida; ya hay sus2/sus4 como lectura fuerte).", ausentes: ruleCount("OMIT3") },
        { id: "OMIT5_MULTI", criterio: "Omite la 5ª y apila 2+ tensiones (sobre-lectura).", ausentes: ruleCount("OMIT5_MULTI") },
        { id: "OMIT5_ADD9", criterio: "add9 sin 5ª (incompleto).", ausentes: ruleCount("OMIT5_ADD9") },
        { id: "OMIT5_EXOTIC", criterio: "Omite la 5ª y anade una tension exotica (add11 sin 5ª).", ausentes: ruleCount("OMIT5_EXOTIC") },
        { id: "ADD11", criterio: "Triada mayor + 11 (choque con la 3ª).", ausentes: ruleCount("ADD11") },
        { id: "EXT_OTHER", criterio: "Otros completos con tension menos comun.", ausentes: ruleCount("EXT_OTHER") },
      ],
    },
    summary: {
      util: verdictCounts.util,
      limite: verdictCounts.limite,
      forzada: verdictCounts.forzada,
    },
  };
}

// ---------- Markdown ----------

function mdTable(rows, columns) {
  if (!rows.length) return "_Sin casos._";
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((c) => String(c.value(row)).replace(/\|/g, "\\|")).join(" | ")} |`);
  return [header, sep, ...body].join("\n");
}

function exampleRow(ex) {
  return {
    voicing: ex.voicing,
    missing: ex.missing,
    appPrimary: ex.appPrimary ?? "",
    reason: ex.reason,
  };
}

function writeMarkdown(report) {
  const t = report.totals;
  const lines = [];
  lines.push("# Informe de lecturas `mayInclude` ausentes");
  lines.push("");
  lines.push(`Generado: ${report.generatedAt}`);
  lines.push("");
  lines.push("Caracteriza las lecturas que el oraculo marca como `mayInclude` pero el lector real");
  lines.push("(`analyzeFretsCore`) no devuelve, para decidir cuales mostrar como alternativas");
  lines.push("razonables y cuales dejar como avanzadas/contextuales. **No modifica el lector.**");
  lines.push("");
  lines.push("## Totales");
  lines.push("");
  lines.push(`- mayInclude ausentes (avisos MISSING_MAY_INCLUDE): **${t.missingMayIncludeNotices}**`);
  lines.push(`- Voicings afectados: ${t.affectedVoicings}`);
  lines.push(`- Candidatos reconstruidos desde el oraculo: ${t.enriched}`);
  lines.push(`- No reconstruidos (drift oraculo): ${t.unmatched}`);
  if (t.compareReportMissingMayInclude != null) {
    lines.push(`- Total segun informe de comparacion: ${t.compareReportMissingMayInclude}` +
      ` (${t.consistentWithCompare ? "coincide" : "NO coincide — regenera la comparacion"})`);
  }
  lines.push("");

  const cov = report.utilCoverage;
  lines.push("## Hallazgo principal");
  lines.push("");
  lines.push(`- Lecturas \`mayInclude\` **utiles** ausentes del lector: **${report.verdictCounts.util}**`);
  if (cov) {
    lines.push(`- Verificacion muestreada (1 de cada ${cov.stride} voicings, ${cov.sampledVoicings} muestras):`);
    lines.push(`  - mayInclude utiles encontradas: ${cov.utilLikeMayInclude}`);
    lines.push(`  - ya emitidas por el lector: ${cov.alreadyProducedByReader} (${cov.coveragePct}%)`);
    lines.push(`  - ausentes del lector: ${cov.absentFromReader}`);
  }
  lines.push("");
  lines.push("> El lector real (`analyzeFretsCore`) ya devuelve **todas** las lecturas `mayInclude` musicalmente");
  lines.push("> utiles (extendidos completos con 7ª, acordes de 6ª, add9, fragmentos que omiten solo la 5ª).");
  lines.push("> Por tanto, mostrar 'alternativas razonables' es trabajo de **UI** (exponer `rankedReadings[1..]`,");
  lines.push("> no solo el Primary), **no del lector**. Las `mayInclude` que de verdad faltan son **todas**");
  lines.push("> contextuales o forzadas (sus+tension, fragmentos sin 3ª, omit-5 con tensiones apiladas).");
  lines.push("");
  lines.push("## Reparto por veredicto musical");
  lines.push("");
  lines.push(mdTable([
    { k: "util (alternativa razonable)", v: report.verdictCounts.util, p: report.verdictShare.util },
    { k: "limite (contextual)", v: report.verdictCounts.limite, p: report.verdictShare.limite },
    { k: "forzada (avanzada)", v: report.verdictCounts.forzada, p: report.verdictShare.forzada },
  ], [
    { label: "Veredicto", value: (r) => r.k },
    { label: "Casos", value: (r) => r.v },
    { label: "%", value: (r) => `${r.p}%` },
  ]));
  lines.push("");

  lines.push("## Agrupacion por tipo de lectura (kind)");
  lines.push("");
  lines.push(mdTable(report.byKind, [
    { label: "Tipo", value: (r) => r.key },
    { label: "Casos", value: (r) => r.count },
  ]));
  lines.push("");

  lines.push("## Agrupacion por calidad de acorde");
  lines.push("");
  lines.push(mdTable(report.byFamily, [
    { label: "Calidad", value: (r) => r.key },
    { label: "Casos", value: (r) => r.count },
  ]));
  lines.push("");

  lines.push("### Categoria cruda del oraculo (detalle)");
  lines.push("");
  lines.push(mdTable(report.byCategory, [
    { label: "Categoria", value: (r) => r.key },
    { label: "Casos", value: (r) => r.count },
  ]));
  lines.push("");

  lines.push("## Agrupacion por patron de intervalo");
  lines.push("");
  lines.push(mdTable(report.byInterval.slice(0, 40), [
    { label: "Patron (semitonos ascendentes)", value: (r) => r.key },
    { label: "Casos", value: (r) => r.count },
  ]));
  lines.push("");
  if (report.byInterval.length > 40) {
    lines.push(`_(${report.byInterval.length - 40} patrones adicionales en el JSON.)_`);
    lines.push("");
  }

  lines.push(`## Top ${TOP_REPRESENTATIVE_MD} casos mas representativos`);
  lines.push("");
  lines.push(mdTable(report.topRepresentative.slice(0, TOP_REPRESENTATIVE_MD), [
    { label: "Firma (calidad :: patron :: faltan :: tensiones :: veredicto)", value: (r) => r.signature },
    { label: "Casos", value: (r) => r.count },
    { label: "Ejemplo", value: (r) => r.examples[0]?.voicing ?? "" },
    { label: "Lectura ausente", value: (r) => r.examples[0]?.missing ?? "" },
    { label: "Primary app", value: (r) => r.examples[0]?.appPrimary ?? "" },
  ]));
  lines.push("");

  lines.push("## Ejemplos donde la alternativa parece claramente util");
  lines.push("");
  lines.push("Ninguna alternativa util esta **ausente**: estas lecturas utiles ya las **emite el lector**");
  lines.push("(verificado por muestreo). Se listan como ejemplos de la capa que conviene mostrar en la UI");
  lines.push("normal como alternativa razonable junto al Primary.");
  lines.push("");
  lines.push(mdTable((report.utilCoverage?.presentExamples ?? []).slice(0, EXAMPLES_MD), [
    { label: "Voicing", value: (r) => r.voicing },
    { label: "Lectura util (oraculo)", value: (r) => r.oracleName },
    { label: "El lector la muestra como", value: (r) => r.shownByReaderAs },
    { label: "Primary app", value: (r) => r.primary ?? "" },
    { label: "Regla", value: (r) => r.rule },
  ]));
  lines.push("");

  lines.push("## Ejemplos donde la alternativa parece demasiado forzada");
  lines.push("");
  lines.push(mdTable(report.examples.forced.slice(0, EXAMPLES_MD).map(exampleRow), [
    { label: "Voicing", value: (r) => r.voicing },
    { label: "Lectura ausente", value: (r) => r.missing },
    { label: "Primary app", value: (r) => r.appPrimary },
    { label: "Motivo", value: (r) => r.reason },
  ]));
  lines.push("");

  lines.push("## Propuesta de reglas");
  lines.push("");
  lines.push(report.ruleProposal.keyFinding.text);
  lines.push("");
  lines.push("### 1) Capa util — ya la emite el lector (0 ausentes)");
  lines.push("");
  lines.push("_No requieren tocar el lector. Solo exponer en la UI normal `rankedReadings[1..]`._");
  lines.push("");
  lines.push(mdTable(report.ruleProposal.alreadyEmittedByReader.rules, [
    { label: "Regla", value: (r) => r.id },
    { label: "Criterio", value: (r) => r.criterio },
    { label: "Ausentes", value: (r) => r.ausentes },
  ]));
  lines.push("");
  lines.push("### 2) Capa avanzada / contextual — las que el lector NO emite");
  lines.push("");
  lines.push("_Ocultas por defecto, solo con 'Mostrar lecturas avanzadas'._");
  lines.push("");
  lines.push(mdTable(report.ruleProposal.advancedContextual.rules, [
    { label: "Regla", value: (r) => r.id },
    { label: "Criterio", value: (r) => r.criterio },
    { label: "Ausentes", value: (r) => r.ausentes },
  ]));
  lines.push("");

  lines.push("## Notas y limitaciones");
  lines.push("");
  lines.push("- El oraculo etiqueta la 6ª como `13` cuando no hay 7ª. Un `(add13)` sin 7ª es un acorde de 6ª;");
  lines.push("  al promover estas lecturas conviene renombrarlas a `6` en la UI.");
  lines.push("- Las diferencias enharmonicas no se cuentan aqui (las gestiona el comparador).");
  lines.push("- El veredicto es heuristico y deterministico (regla por candidato); ver columna 'Regla'.");
  lines.push("");

  return lines.join("\n");
}

// ---------- main ----------

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
  process.exit(0);
}

const report = await run(opts);
const outJson = resolve(process.cwd(), opts.outJson);
const outMd = resolve(process.cwd(), opts.outMd);
mkdirSync(dirname(outJson), { recursive: true });
mkdirSync(dirname(outMd), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(outMd, `${writeMarkdown(report)}\n`, "utf8");

console.log(`Informe JSON: ${outJson}`);
console.log(`Informe MD: ${outMd}`);
console.log(`mayInclude ausentes: ${report.totals.missingMayIncludeNotices}`);
console.log(`  util: ${report.verdictCounts.util} | limite: ${report.verdictCounts.limite} | forzada: ${report.verdictCounts.forzada}`);
if (report.utilCoverage) {
  const c = report.utilCoverage;
  console.log(`Verificacion lector (muestreo 1/${c.stride}): mayInclude utiles ${c.alreadyProducedByReader}/${c.utilLikeMayInclude} ya emitidas (${c.coveragePct}%), ausentes ${c.absentFromReader}`);
}
if (report.totals.consistentWithCompare === false) {
  console.warn("AVISO: el total no coincide con el informe de comparacion. Regenera con npm run compare:frets-oracle.");
}
