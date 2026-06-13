import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { analyzeFretsCore } from "../src/music/analyzeFretsCore.js";
import { analyzeFretsOracle } from "../src/music/fretsOracle.js";
import { mod12, pcToName } from "../src/music/chordDetectionEngine.js";

const DEFAULT_INPUT = "reports/frets-oracle.ndjson";
const DEFAULT_REPORT_JSON = "reports/frets-oracle-compare.json";
const DEFAULT_REPORT_MD = "reports/frets-oracle-compare.md";
const DEFAULT_REPORT_NDJSON = "reports/frets-oracle-compare-discrepancies.ndjson";
const DEFAULT_GOLDEN_REPORT_JSON = "reports/frets-oracle-golden-compare.json";
const DEFAULT_GOLDEN_REPORT_MD = "reports/frets-oracle-golden-compare.md";
const DEFAULT_GOLDEN_REPORT_NDJSON = "reports/frets-oracle-golden-compare-discrepancies.ndjson";
const DEFAULT_GOLDEN = "src/music/fretsOracleGoldenCases.json";

const LABEL_TO_SEMITONE = new Map([
  ["1", 0],
  ["b2", 1],
  ["b9", 1],
  ["2", 2],
  ["9", 2],
  ["#2", 3],
  ["#9", 3],
  ["b3", 3],
  ["3", 4],
  ["4", 5],
  ["11", 5],
  ["#4", 6],
  ["#11", 6],
  ["b5", 6],
  ["5", 7],
  ["#5", 8],
  ["b6", 8],
  ["b13", 8],
  ["6", 9],
  ["13", 9],
  ["b7", 10],
  ["7", 11],
]);

const NATURAL_PC = new Map([
  ["C", 0],
  ["D", 2],
  ["E", 4],
  ["F", 5],
  ["G", 7],
  ["A", 9],
  ["B", 11],
]);

function parseArgs(argv) {
  const opts = {
    input: DEFAULT_INPUT,
    golden: null,
    useGoldenFile: false,
    limit: null,
    outJson: DEFAULT_REPORT_JSON,
    outMd: DEFAULT_REPORT_MD,
    outNdjson: DEFAULT_REPORT_NDJSON,
    failOnGolden: true,
    failOnOracle: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") opts.input = argv[++i] ?? opts.input;
    else if (arg === "--golden") {
      opts.useGoldenFile = true;
      const maybePath = argv[i + 1];
      if (maybePath && !maybePath.startsWith("--")) {
        opts.golden = maybePath;
        i += 1;
      }
    } else if (arg === "--limit") opts.limit = Number(argv[++i]);
    else if (arg === "--out-json") opts.outJson = argv[++i] ?? opts.outJson;
    else if (arg === "--out-md") opts.outMd = argv[++i] ?? opts.outMd;
    else if (arg === "--out-ndjson") opts.outNdjson = argv[++i] ?? opts.outNdjson;
    else if (arg === "--fail-on-oracle") opts.failOnOracle = true;
    else if (arg === "--no-fail-on-golden") opts.failOnGolden = false;
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

function printHelp() {
  console.log(`Uso: npm run compare:frets-oracle -- [opciones]

Opciones:
  --input <ruta>       Oracle NDJSON/JSON. Por defecto: ${DEFAULT_INPUT}
  --golden [ruta]      Compara los casos dorados. Ruta por defecto: ${DEFAULT_GOLDEN}
  --limit <n>          Limita casos leidos del oracle.
  --fail-on-oracle     Devuelve exit code 1 si hay discrepancias del oracle masivo.
  --no-fail-on-golden  No falla aunque fallen dorados.
`);
}

function unique(values) {
  return [...new Set(values)];
}

function notePc(note) {
  const match = String(note || "").trim().match(/^([A-Ga-g])([#b]*)$/);
  if (!match) return null;
  let pc = NATURAL_PC.get(match[1].toUpperCase());
  for (const accidental of match[2]) {
    if (accidental === "#") pc += 1;
    else if (accidental === "b") pc -= 1;
  }
  return mod12(pc);
}

function notePcSignature(notes) {
  return (notes || []).map(notePc).join("|");
}

function samePitchDifferentSpelling(expected, actual) {
  const expectedPc = notePc(expected);
  const actualPc = notePc(actual);
  return expectedPc != null && actualPc != null && expectedPc === actualPc && expected !== actual;
}

function sameNoteSetDifferentSpelling(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false;
  if (notePcSignature(expected) !== notePcSignature(actual)) return false;
  return expected.some((note, idx) => note !== actual[idx]);
}

function names(list) {
  return (list || []).map((item) => item?.name).filter(Boolean);
}

function normalizeName(name) {
  return String(name || "").trim();
}

function semitoneSignatureFromLabels(labels) {
  return unique((labels || [])
    .map((label) => LABEL_TO_SEMITONE.get(String(label)))
    .filter((value) => value != null)
    .map((value) => mod12(value)))
    .sort((a, b) => a - b)
    .join(".");
}

function semitoneSignatureFromApp(reading) {
  const source = Array.isArray(reading?.visibleIntervals) && reading.visibleIntervals.length
    ? reading.visibleIntervals
    : (reading?.formula?.intervals || []);
  return unique(source
    .map((value) => mod12(Number(value)))
    .filter((value) => Number.isFinite(value)))
    .sort((a, b) => a - b)
    .join(".");
}

function serializeAppReading(reading) {
  const rankRaw = reading?.rankScore != null ? reading.rankScore : (reading?.score ?? null);
  return {
    name: reading?.name ?? null,
    root: pcToName(reading?.rootPc ?? 0, reading?.preferSharps),
    bass: pcToName(reading?.bassPc ?? 0, reading?.preferSharps),
    intervals: Array.isArray(reading?.legend) && reading.legend.length
      ? reading.legend.map((item) => String(item.degree || ""))
      : Array.isArray(reading?.formula?.degreeLabels) ? reading.formula.degreeLabels.map(String) : [],
    semitones: Array.isArray(reading?.visibleIntervals) && reading.visibleIntervals.length
      ? reading.visibleIntervals.map((n) => mod12(Number(n)))
      : Array.isArray(reading?.formula?.intervals) ? reading.formula.intervals.map((n) => mod12(Number(n))) : [],
    missing: Array.isArray(reading?.missingLabels) ? reading.missingLabels.map(String) : [],
    category: reading?.formula?.quartal ? "quartal" : (reading?.formula?.ui?.quality ?? reading?.formula?.id ?? null),
    rank: rankRaw != null ? Number(rankRaw) : null,
  };
}

function appAnalyze(voicing) {
  const result = analyzeFretsCore(voicing);
  return {
    ok: true,
    voicing,
    uniqueNotes: result.noteNames,
    bass: result.bassName,
    primary: result.primary ? serializeAppReading(result.primary) : null,
    readings: result.rankedReadings.map(serializeAppReading),
    rawReadings: result.rankedReadings,
  };
}

function loadCases(path, limit) {
  const fullPath = resolve(process.cwd(), path);
  const raw = readFileSync(fullPath, "utf8").trim();
  if (!raw) return [];
  if (raw.startsWith("[")) {
    return JSON.parse(raw).slice(0, limit ?? undefined);
  }
  const rows = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
    if (limit && rows.length >= limit) break;
  }
  return rows;
}

function loadGoldenCases(path) {
  const fullPath = resolve(process.cwd(), path);
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function effectiveExpectedNames(oracleCase) {
  if (oracleCase.mustIncludeAny?.length) return [];
  if (Array.isArray(oracleCase.mustInclude)) return oracleCase.mustInclude;
  return names(oracleCase.candidates);
}

function addIssue(issues, type, message, extra = {}) {
  issues.push({ type, message, ...extra });
}

function addNotice(notices, type, message, extra = {}) {
  notices.push({ type, message, ...extra });
}

function expectedNamesByLevel(oracleCase, level) {
  if (Array.isArray(oracleCase[level]) && oracleCase[level].length) {
    return oracleCase[level].map(normalizeName);
  }
  return (oracleCase.candidates || [])
    .filter((candidate) => candidate.level === level)
    .map((candidate) => normalizeName(candidate.name));
}

function candidateByName(oracleCase, name) {
  return (oracleCase.candidates || []).find((candidate) => normalizeName(candidate.name) === normalizeName(name));
}

function equivalentAppReading(app, expectedCandidate) {
  const expectedSig = semitoneSignatureFromLabels(expectedCandidate?.intervals);
  if (!expectedCandidate || !expectedSig) return null;
  return app.rawReadings.find((reading) => notePc(expectedCandidate.root) === mod12(reading.rootPc)
    && semitoneSignatureFromApp(reading) === expectedSig);
}

function compareExpectedCandidate({ appNames, app, oracleCase, expectedName, level, issues, notices, golden }) {
  if (appNames.has(expectedName)) return;
  const expectedCandidate = candidateByName(oracleCase, expectedName);
  const renamed = equivalentAppReading(app, expectedCandidate);
  if (renamed) {
    const target = golden ? issues : notices;
    addIssue(target, "RENAMED_READING", "Lectura presente con formula equivalente pero nombre distinto", {
      expected: expectedName,
      actual: renamed.name,
      level,
    });
    return;
  }

  const typeByLevel = {
    mustInclude: "MISSING_MUST_INCLUDE",
    mayInclude: "MISSING_MAY_INCLUDE",
    informational: "MISSING_INFORMATIONAL",
  };
  const target = level === "mustInclude" ? issues : notices;
  addIssue(target, typeByLevel[level] || "MISSING_EXPECTED_READING", "Lectura esperada ausente", {
    expected: expectedName,
    level,
  });
}

function compareCase(inputCase, { golden = false } = {}) {
  const voicing = inputCase.voicing;
  const oracleCase = inputCase.candidates ? inputCase : {
    ...analyzeFretsOracle(voicing),
    ...inputCase,
  };

  const app = appAnalyze(voicing);
  const appNames = new Set(names(app.readings).map(normalizeName));
  const issues = [];
  const notices = [];

  const expectedUniqueNotes = unique(inputCase.uniqueNotes || inputCase.notes || oracleCase.uniqueNotes || []);
  if (expectedUniqueNotes.length && notePcSignature(expectedUniqueNotes) !== notePcSignature(app.uniqueNotes)) {
    addIssue(issues, "NOTES_MISMATCH", "Diferencia en notas calculadas", {
      expected: expectedUniqueNotes,
      actual: app.uniqueNotes,
    });
  } else if (sameNoteSetDifferentSpelling(expectedUniqueNotes, app.uniqueNotes)) {
    addNotice(notices, "ENHARMONIC_NOTES", "Mismas notas por pitch class con spelling distinto", {
      expected: expectedUniqueNotes,
      actual: app.uniqueNotes,
    });
  }

  const expectedBass = inputCase.bass || oracleCase.bass;
  if (expectedBass && notePc(expectedBass) !== notePc(app.bass)) {
    addIssue(issues, "BASS_MISMATCH", "Diferencia en bajo", {
      expected: expectedBass,
      actual: app.bass,
    });
  } else if (expectedBass && samePitchDifferentSpelling(expectedBass, app.bass)) {
    addNotice(notices, "ENHARMONIC_BASS", "Mismo bajo por pitch class con spelling distinto", {
      expected: expectedBass,
      actual: app.bass,
    });
  }

  const expectedNames = effectiveExpectedNames(oracleCase).map(normalizeName);
  const mayIncludeNames = golden ? [] : expectedNamesByLevel(oracleCase, "mayInclude");
  const informationalNames = golden ? [] : expectedNamesByLevel(oracleCase, "informational");

  for (const expectedName of expectedNames) {
    compareExpectedCandidate({ appNames, app, oracleCase, expectedName, level: "mustInclude", issues, notices, golden });
  }
  for (const expectedName of mayIncludeNames) {
    compareExpectedCandidate({ appNames, app, oracleCase, expectedName, level: "mayInclude", issues, notices, golden });
  }
  for (const expectedName of informationalNames) {
    compareExpectedCandidate({ appNames, app, oracleCase, expectedName, level: "informational", issues, notices, golden });
  }

  if (inputCase.mustIncludeAny?.length) {
    const ok = inputCase.mustIncludeAny.some((expectedName) => appNames.has(normalizeName(expectedName)));
    if (!ok) {
      addIssue(issues, "MISSING_EXPECTED_READING", "No aparece ninguna lectura esperada del grupo mustIncludeAny", {
        expectedAny: inputCase.mustIncludeAny,
      });
    }
  }

  for (const forbiddenName of inputCase.mustNotInclude || []) {
    if (appNames.has(normalizeName(forbiddenName))) {
      addIssue(issues, "DUBIOUS_READING", "La aplicacion devuelve un candidato dudoso o demasiado forzado", {
        forbidden: forbiddenName,
      });
    }
  }

  if (inputCase.preferred) {
    const primaryName = app.primary?.name ?? null;
    if (primaryName !== inputCase.preferred) {
      addIssue(issues, "PRIMARY_INCORRECT", "Primary incorrecto", {
        expected: inputCase.preferred,
        actual: primaryName,
      });
    }
  }

  if (!golden && oracleCase.candidates?.length) {
    const oracleByRootAndSig = new Set(oracleCase.candidates.map((candidate) => {
      return `${notePc(candidate.root)}|${semitoneSignatureFromLabels(candidate.intervals)}`;
    }));
    for (const appReading of app.rawReadings) {
      const key = `${mod12(appReading.rootPc)}|${semitoneSignatureFromApp(appReading)}`;
      if (!oracleByRootAndSig.has(key)) {
        addNotice(notices, "APP_EXTRA_READING", "La aplicacion devuelve un candidato que el oraculo no considera razonable", {
          actual: appReading.name,
        });
      }
    }
  }

  return {
    voicing,
    golden,
    ok: issues.length === 0,
    issues,
    notices,
    oracle: {
      uniqueNotes: oracleCase.uniqueNotes,
      bass: oracleCase.bass,
      candidates: oracleCase.candidates || [],
      preferred: inputCase.preferred ?? oracleCase.preferred ?? null,
      mustInclude: expectedNames,
      mayInclude: mayIncludeNames,
      informational: informationalNames,
    },
    app: {
      uniqueNotes: app.uniqueNotes,
      bass: app.bass,
      primary: app.primary,
      readings: app.readings,
    },
  };
}

function summarize(results) {
  const byType = new Map();
  const noticesByType = new Map();
  for (const result of results) {
    for (const issue of result.issues) {
      byType.set(issue.type, (byType.get(issue.type) ?? 0) + 1);
    }
    for (const notice of result.notices || []) {
      noticesByType.set(notice.type, (noticesByType.get(notice.type) ?? 0) + 1);
    }
  }
  return {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    noted: results.filter((result) => result.ok && (result.notices || []).length).length,
    byType: Object.fromEntries([...byType.entries()].sort()),
    noticesByType: Object.fromEntries([...noticesByType.entries()].sort()),
  };
}

async function writeReports({ results, summary, outJson, outMd, outNdjson }) {
  const jsonPath = resolve(process.cwd(), outJson);
  const mdPath = resolve(process.cwd(), outMd);
  const ndjsonPath = resolve(process.cwd(), outNdjson);
  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(mdPath), { recursive: true });
  mkdirSync(dirname(ndjsonPath), { recursive: true });

  const notable = results.filter((item) => !item.ok || item.notices?.length);
  const failures = results.filter((item) => !item.ok);
  const sampleFailures = failures.slice(0, 1000);
  writeFileSync(jsonPath, `${JSON.stringify({
    summary,
    reportFiles: {
      markdown: mdPath,
      discrepanciesNdjson: ndjsonPath,
    },
    sampleLimit: sampleFailures.length,
    sampleFailures,
  }, null, 2)}\n`, "utf8");

  const discrepancyStream = createWriteStream(ndjsonPath, { encoding: "utf8" });
  for (const result of notable) {
    discrepancyStream.write(`${JSON.stringify({
      voicing: result.voicing,
      golden: result.golden,
      issues: result.issues,
      notices: result.notices || [],
      appPrimary: result.app.primary?.name ?? null,
      appReadings: result.app.readings.map((reading) => reading.name),
      oracleCandidates: result.oracle.candidates.map((candidate) => candidate.name),
      oracleMustInclude: result.oracle.mustInclude,
      oracleMayInclude: result.oracle.mayInclude,
      oracleInformational: result.oracle.informational,
    })}\n`);
  }
  await new Promise((resolveStream, rejectStream) => {
    discrepancyStream.end((err) => (err ? rejectStream(err) : resolveStream()));
  });

  const lines = [
    "# Comparacion frets oracle",
    "",
    `- Total: ${summary.total}`,
    `- OK real: ${summary.passed}`,
    `- Fallos: ${summary.failed}`,
    `- Casos con avisos no bloqueantes: ${summary.noted}`,
    "",
    "## Fallos por tipo",
    "",
    ...Object.entries(summary.byType).map(([type, count]) => `- ${type}: ${count}`),
    "",
    "## Avisos no bloqueantes por tipo",
    "",
    ...Object.entries(summary.noticesByType).map(([type, count]) => `- ${type}: ${count}`),
    "",
    "## Primeras discrepancias",
    "",
  ];

  for (const result of failures.slice(0, 100)) {
    lines.push(`### ${result.voicing}${result.golden ? " (golden)" : ""}`);
    for (const issue of result.issues) {
      lines.push(`- ${issue.type}: ${issue.message}`);
      if (issue.expected) lines.push(`  Esperado: ${JSON.stringify(issue.expected)}`);
      if (issue.expectedAny) lines.push(`  Esperado cualquiera: ${JSON.stringify(issue.expectedAny)}`);
      if (issue.actual) lines.push(`  Actual: ${JSON.stringify(issue.actual)}`);
      if (issue.forbidden) lines.push(`  Prohibido: ${JSON.stringify(issue.forbidden)}`);
    }
    lines.push("");
  }

  writeFileSync(mdPath, `${lines.join("\n")}\n`, "utf8");
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
  process.exit(0);
}

let rows;
let goldenMode = opts.useGoldenFile;
if (goldenMode) {
  if (opts.outJson === DEFAULT_REPORT_JSON) opts.outJson = DEFAULT_GOLDEN_REPORT_JSON;
  if (opts.outMd === DEFAULT_REPORT_MD) opts.outMd = DEFAULT_GOLDEN_REPORT_MD;
  if (opts.outNdjson === DEFAULT_REPORT_NDJSON) opts.outNdjson = DEFAULT_GOLDEN_REPORT_NDJSON;
  rows = loadGoldenCases(opts.golden || DEFAULT_GOLDEN);
} else {
  if (!existsSync(resolve(process.cwd(), opts.input))) {
    console.error(`No existe ${opts.input}. Ejecuta primero npm run generate:frets-oracle`);
    process.exit(1);
  }
  rows = loadCases(opts.input, opts.limit);
}

const results = rows.map((row) => compareCase(row, { golden: goldenMode || row.golden === true }));
const summary = summarize(results);
await writeReports({ results, summary, outJson: opts.outJson, outMd: opts.outMd, outNdjson: opts.outNdjson });

console.log(`Comparados: ${summary.total}`);
console.log(`OK: ${summary.passed}`);
console.log(`Fallos: ${summary.failed}`);
console.log(`Informe JSON: ${resolve(process.cwd(), opts.outJson)}`);
console.log(`Informe MD: ${resolve(process.cwd(), opts.outMd)}`);
console.log(`Discrepancias NDJSON: ${resolve(process.cwd(), opts.outNdjson)}`);

const shouldFail = goldenMode ? opts.failOnGolden && summary.failed > 0 : opts.failOnOracle && summary.failed > 0;
if (shouldFail) process.exit(1);
