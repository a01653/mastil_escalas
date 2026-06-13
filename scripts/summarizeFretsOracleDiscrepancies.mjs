import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";

const DEFAULT_COMPARE_JSON = "reports/frets-oracle-compare.json";
const DEFAULT_INPUT = "reports/frets-oracle-compare-discrepancies.ndjson";
const DEFAULT_OUT_JSON = "reports/frets-oracle-discrepancies-summary.json";
const DEFAULT_OUT_MD = "reports/frets-oracle-discrepancies-summary.md";

const EXAMPLE_LIMIT = 20;
const FULL_LIST_LIMIT = 500;
const TOP_LIMIT = 50;

const NATURAL_PC = new Map([
  ["C", 0],
  ["D", 2],
  ["E", 4],
  ["F", 5],
  ["G", 7],
  ["A", 9],
  ["B", 11],
]);

const CATEGORY_DEFS = [
  ["criticalErrors", "Errores criticos"],
  ["noteMismatches", "Notas distintas"],
  ["bassMismatches", "Bajo distinto"],
  ["missingMustInclude", "mustInclude ausente"],
  ["missingMayInclude", "mayInclude ausente"],
  ["missingInformational", "informational ausente"],
  ["enharmonicOnly", "Solo enharmonia"],
  ["nameOnly", "Solo naming"],
  ["priorityOnly", "Solo prioridad"],
  ["appExtra", "Candidatos extra de la app"],
  ["mixedNonCritical", "Mixtas no criticas"],
];

function parseArgs(argv) {
  const opts = {
    input: DEFAULT_INPUT,
    compareJson: DEFAULT_COMPARE_JSON,
    outJson: DEFAULT_OUT_JSON,
    outMd: DEFAULT_OUT_MD,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") opts.input = argv[++i] ?? opts.input;
    else if (arg === "--compare-json") opts.compareJson = argv[++i] ?? opts.compareJson;
    else if (arg === "--out-json") opts.outJson = argv[++i] ?? opts.outJson;
    else if (arg === "--out-md") opts.outMd = argv[++i] ?? opts.outMd;
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

function printHelp() {
  console.log(`Uso: npm run summarize:frets-oracle-discrepancies -- [opciones]

Opciones:
  --input <ruta>          NDJSON de discrepancias. Default: ${DEFAULT_INPUT}
  --compare-json <ruta>   Resumen del comparador. Default: ${DEFAULT_COMPARE_JSON}
  --out-json <ruta>       Salida JSON. Default: ${DEFAULT_OUT_JSON}
  --out-md <ruta>         Salida Markdown. Default: ${DEFAULT_OUT_MD}
`);
}

function notePc(note) {
  const match = String(note || "").trim().match(/^([A-Ga-g])([#b]*)$/);
  if (!match) return null;
  let pc = NATURAL_PC.get(match[1].toUpperCase());
  for (const accidental of match[2]) {
    if (accidental === "#") pc += 1;
    else if (accidental === "b") pc -= 1;
  }
  const mod = pc % 12;
  return mod < 0 ? mod + 12 : mod;
}

function samePitchDifferentSpelling(a, b) {
  const pa = notePc(a);
  const pb = notePc(b);
  return pa != null && pb != null && pa === pb && String(a) !== String(b);
}

function arraysSamePcDifferentSpelling(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual)) return false;
  if (expected.length !== actual.length) return false;
  let different = false;
  for (let i = 0; i < expected.length; i += 1) {
    const pe = notePc(expected[i]);
    const pa = notePc(actual[i]);
    if (pe == null || pa == null || pe !== pa) return false;
    if (String(expected[i]) !== String(actual[i])) different = true;
  }
  return different;
}

function issueIsEnharmonic(issue) {
  if (Array.isArray(issue.expected) || Array.isArray(issue.actual)) {
    return arraysSamePcDifferentSpelling(issue.expected, issue.actual);
  }
  if (typeof issue.expected === "string" && typeof issue.actual === "string") {
    return samePitchDifferentSpelling(issue.expected, issue.actual);
  }
  return false;
}

function issuePattern(issue) {
  const type = issue.type || "UNKNOWN";
  if (type === "RENAMED_READING") return `${type}:${issue.expected ?? "?"}->${issue.actual ?? "?"}`;
  if (type === "MISSING_EXPECTED_READING" || type === "MISSING_MUST_INCLUDE" || type === "MISSING_MAY_INCLUDE" || type === "MISSING_INFORMATIONAL") {
    return `${type}:${issue.expected ?? JSON.stringify(issue.expectedAny ?? "?")}`;
  }
  if (type === "DUBIOUS_READING" || type === "APP_EXTRA_READING") return `${type}:${issue.actual ?? issue.forbidden ?? "?"}`;
  if (type === "NOTES_MISMATCH" || type === "BASS_MISMATCH") {
    return `${type}:${JSON.stringify(issue.expected)}->${JSON.stringify(issue.actual)}`;
  }
  if (type === "PRIMARY_INCORRECT") return `${type}:${issue.expected ?? "?"}->${issue.actual ?? "?"}`;
  return type;
}

function increment(map, key, sample) {
  const prev = map.get(key);
  if (prev) {
    prev.count += 1;
    if (prev.examples.length < 5) prev.examples.push(sample);
  } else {
    map.set(key, { pattern: key, count: 1, examples: [sample] });
  }
}

function pushLimited(arr, item, limit = EXAMPLE_LIMIT) {
  if (arr.length < limit) arr.push(item);
}

function classify(row) {
  const issues = Array.isArray(row.issues) ? row.issues : [];
  const notices = Array.isArray(row.notices) ? row.notices : [];
  const all = [...issues, ...notices];
  const issueTypes = new Set(issues.map((issue) => issue.type));
  const noticeTypes = new Set(notices.map((issue) => issue.type));
  const allTypes = new Set(all.map((issue) => issue.type));
  const hasNotes = issues.some((issue) => issue.type === "NOTES_MISMATCH" && !issueIsEnharmonic(issue));
  const hasBass = issues.some((issue) => issue.type === "BASS_MISMATCH" && !issueIsEnharmonic(issue));
  const critical = hasNotes || hasBass;
  const hasMustMissing = issueTypes.has("MISSING_MUST_INCLUDE") || issueTypes.has("MISSING_EXPECTED_READING");
  const hasMayMissing = noticeTypes.has("MISSING_MAY_INCLUDE");
  const hasInformationalMissing = noticeTypes.has("MISSING_INFORMATIONAL");
  const hasRename = allTypes.has("RENAMED_READING");
  const hasPriority = issueTypes.has("PRIMARY_INCORRECT");
  const hasAppExtra = allTypes.has("APP_EXTRA_READING") || allTypes.has("DUBIOUS_READING");
  const hasEnharmonic = allTypes.has("ENHARMONIC_NOTES") || allTypes.has("ENHARMONIC_BASS") || all.some(issueIsEnharmonic);

  const categories = [];
  if (critical) categories.push("criticalErrors");
  if (hasNotes) categories.push("noteMismatches");
  if (hasBass) categories.push("bassMismatches");
  if (hasMustMissing && !critical) categories.push("missingMustInclude");
  if (hasMayMissing && !critical) categories.push("missingMayInclude");
  if (hasInformationalMissing && !critical) categories.push("missingInformational");
  if (hasEnharmonic && !critical && !hasMustMissing && !hasMayMissing && !hasInformationalMissing && !hasRename && !hasPriority && !hasAppExtra) {
    categories.push("enharmonicOnly");
  }
  if (hasRename && !critical && !hasMustMissing && !hasMayMissing && !hasInformationalMissing && !hasPriority && !hasAppExtra) {
    categories.push("nameOnly");
  }
  if (hasPriority && !critical && !hasMustMissing && !hasRename) categories.push("priorityOnly");
  if (hasAppExtra && !critical) categories.push("appExtra");
  if (!critical && categories.length === 0) categories.push("mixedNonCritical");

  return {
    critical,
    blocking: issues.length > 0,
    categories,
    signature: all.map((issue) => issue.type).sort().join("+") || "UNKNOWN",
  };
}

function compactRow(row) {
  return {
    voicing: row.voicing,
    issues: row.issues,
    notices: row.notices,
    appPrimary: row.appPrimary,
    appReadings: row.appReadings,
    oracleCandidates: row.oracleCandidates,
    oracleMustInclude: row.oracleMustInclude,
    oracleMayInclude: row.oracleMayInclude,
    oracleInformational: row.oracleInformational,
  };
}

function loadCompareSummary(path) {
  if (!existsSync(path)) return null;
  const json = JSON.parse(readFileSync(path, "utf8"));
  return json.summary ?? null;
}

async function summarize(opts) {
  const inputPath = resolve(process.cwd(), opts.input);
  if (!existsSync(inputPath)) {
    throw new Error(`No existe ${opts.input}. Ejecuta primero npm run compare:frets-oracle`);
  }

  const categoryCounts = Object.fromEntries(CATEGORY_DEFS.map(([key]) => [key, 0]));
  const categoryExamples = Object.fromEntries(CATEGORY_DEFS.map(([key]) => [key, []]));
  const issueTypeCounts = {};
  const noticeTypeCounts = {};
  const topPatterns = new Map();
  const topRealPatterns = new Map();
  const criticalExamples = [];
  const nonCriticalExamples = [];
  const criticalFullList = [];
  const nonCriticalFullList = [];
  const problematicVoicings = new Map();

  let discrepancyRows = 0;
  let criticalRows = 0;
  let nonCriticalRows = 0;
  let blockingRows = 0;

  const rl = createInterface({
    input: createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    discrepancyRows += 1;
    const info = classify(row);
    const compact = compactRow(row);

    if (info.critical) {
      criticalRows += 1;
      pushLimited(criticalExamples, compact);
      pushLimited(criticalFullList, compact, FULL_LIST_LIMIT);
      increment(problematicVoicings, row.voicing, compact);
    } else {
      nonCriticalRows += 1;
      pushLimited(nonCriticalExamples, compact);
      pushLimited(nonCriticalFullList, compact, FULL_LIST_LIMIT);
    }
    if (info.blocking) blockingRows += 1;

    for (const category of info.categories) {
      categoryCounts[category] += 1;
      pushLimited(categoryExamples[category], compact);
    }

    increment(topPatterns, info.signature, compact);
    for (const issue of row.issues || []) {
      issueTypeCounts[issue.type] = (issueTypeCounts[issue.type] ?? 0) + 1;
      increment(topPatterns, issuePattern(issue), compact);
      increment(topRealPatterns, issuePattern(issue), compact);
    }
    for (const notice of row.notices || []) {
      noticeTypeCounts[notice.type] = (noticeTypeCounts[notice.type] ?? 0) + 1;
      increment(topPatterns, issuePattern(notice), compact);
    }
  }

  const compareSummary = loadCompareSummary(resolve(process.cwd(), opts.compareJson));
  const totalCompared = compareSummary?.total ?? null;
  const totalOk = compareSummary?.passed ?? null;
  const totalDiscrepancies = compareSummary?.failed ?? blockingRows;
  const noticesByType = compareSummary?.noticesByType ?? {};
  const enharmonicIgnored = (noticesByType.ENHARMONIC_NOTES ?? 0) + (noticesByType.ENHARMONIC_BASS ?? 0);

  return {
    generatedAt: new Date().toISOString(),
    source: {
      input: inputPath,
      compareJson: resolve(process.cwd(), opts.compareJson),
    },
    totals: {
      compared: totalCompared,
      ok: totalOk,
      discrepancies: totalDiscrepancies,
      discrepancyRows,
      blockingRows,
      criticalRows,
      nonCriticalRows,
      okReal: totalOk,
      enharmonicIgnored,
    },
    categoryCounts,
    issueTypeCounts,
    noticeTypeCounts,
    topPatterns: [...topPatterns.values()].sort((a, b) => b.count - a.count).slice(0, TOP_LIMIT),
    topRealPatterns: [...topRealPatterns.values()].sort((a, b) => b.count - a.count).slice(0, 20),
    requestedBreakdown: {
      compared: totalCompared,
      okReal: totalOk,
      criticalErrors: criticalRows,
      missingMustInclude: categoryCounts.missingMustInclude,
      missingMayInclude: noticeTypeCounts.MISSING_MAY_INCLUDE ?? 0,
      missingInformational: noticeTypeCounts.MISSING_INFORMATIONAL ?? 0,
      enharmonicIgnored,
    },
    critical: {
      count: criticalRows,
      examples: criticalExamples,
      listSample: criticalFullList,
      topVoicings: [...problematicVoicings.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    },
    nonCritical: {
      count: nonCriticalRows,
      examples: nonCriticalExamples,
      listSample: nonCriticalFullList,
    },
    categoryExamples,
  };
}

function mdTable(rows, columns) {
  if (!rows.length) return "_Sin casos._\n";
  const header = `| ${columns.map((c) => c.label).join(" |")} |`;
  const sep = `| ${columns.map(() => "---").join(" |")} |`;
  const body = rows.map((row) => `| ${columns.map((c) => String(c.value(row)).replace(/\|/g, "\\|")).join(" |")} |`);
  return [header, sep, ...body].join("\n");
}

function issueSummary(row) {
  return (row.issues || []).map((issue) => {
    if (issue.expected !== undefined || issue.actual !== undefined) {
      return `${issue.type}: ${JSON.stringify(issue.expected)} -> ${JSON.stringify(issue.actual)}`;
    }
    if (issue.expectedAny) return `${issue.type}: any ${JSON.stringify(issue.expectedAny)}`;
    if (issue.forbidden) return `${issue.type}: forbidden ${issue.forbidden}`;
    return issue.type;
  }).join("; ");
}

function writeMarkdown(summary, outPath) {
  const lines = [];
  lines.push("# Resumen de discrepancias del oraculo de voicings");
  lines.push("");
  lines.push(`- Total comparado: ${summary.totals.compared ?? "desconocido"}`);
  lines.push(`- OK real: ${summary.totals.okReal ?? summary.totals.ok ?? "desconocido"}`);
  lines.push(`- Fallos bloqueantes: ${summary.totals.discrepancies}`);
  lines.push(`- Filas con avisos/analisis: ${summary.totals.discrepancyRows}`);
  lines.push(`- Errores criticos reales (notas o bajo): ${summary.totals.criticalRows}`);
  lines.push(`- Errores no criticos / criterio musical: ${summary.totals.nonCriticalRows}`);
  lines.push(`- Enharmonias ignoradas como no criticas: ${summary.totals.enharmonicIgnored}`);
  lines.push("");

  lines.push("## Resumen solicitado");
  lines.push("");
  lines.push(mdTable([
    { label: "Total comparados", count: summary.requestedBreakdown.compared ?? "desconocido" },
    { label: "OK real", count: summary.requestedBreakdown.okReal ?? "desconocido" },
    { label: "Errores criticos", count: summary.requestedBreakdown.criticalErrors },
    { label: "mustInclude ausentes", count: summary.requestedBreakdown.missingMustInclude },
    { label: "mayInclude ausentes", count: summary.requestedBreakdown.missingMayInclude },
    { label: "informational ausentes", count: summary.requestedBreakdown.missingInformational },
    { label: "Enharmonias ignoradas", count: summary.requestedBreakdown.enharmonicIgnored },
  ], [
    { label: "Metrica", value: (row) => row.label },
    { label: "Casos", value: (row) => row.count },
  ]));
  lines.push("");

  lines.push("## Desglose por tipo");
  lines.push("");
  lines.push(mdTable(CATEGORY_DEFS.map(([key, label]) => ({ key, label, count: summary.categoryCounts[key] ?? 0 })), [
    { label: "Tipo", value: (row) => row.label },
    { label: "Casos", value: (row) => row.count },
  ]));
  lines.push("");

  lines.push("## Top 50 patrones de error");
  lines.push("");

  lines.push("## Top 20 fallos reales pendientes");
  lines.push("");
  lines.push(mdTable(summary.topRealPatterns, [
    { label: "Patron", value: (row) => row.pattern },
    { label: "Casos", value: (row) => row.count },
    { label: "Ejemplo", value: (row) => row.examples[0]?.voicing ?? "" },
  ]));
  lines.push("");
  lines.push(mdTable(summary.topPatterns, [
    { label: "Patron", value: (row) => row.pattern },
    { label: "Casos", value: (row) => row.count },
    { label: "Ejemplo", value: (row) => row.examples[0]?.voicing ?? "" },
  ]));
  lines.push("");

  for (const [key, label] of CATEGORY_DEFS) {
    lines.push(`## 20 ejemplos: ${label}`);
    lines.push("");
    lines.push(mdTable(summary.categoryExamples[key] || [], [
      { label: "Voicing", value: (row) => row.voicing },
      { label: "Primary app", value: (row) => row.appPrimary ?? "" },
      { label: "Issues", value: issueSummary },
    ]));
    lines.push("");
  }

  lines.push("## Lista separada: errores criticos");
  lines.push("");
  lines.push(`Total criticos: ${summary.critical.count}. Se muestran hasta ${FULL_LIST_LIMIT} en JSON y 20 aqui.`);
  lines.push("");
  lines.push(mdTable(summary.critical.examples, [
    { label: "Voicing", value: (row) => row.voicing },
    { label: "Primary app", value: (row) => row.appPrimary ?? "" },
    { label: "Issues", value: issueSummary },
  ]));
  lines.push("");

  lines.push("## Lista separada: errores no criticos");
  lines.push("");
  lines.push(`Total no criticos: ${summary.nonCritical.count}. Se muestran hasta ${FULL_LIST_LIMIT} en JSON y 20 aqui.`);
  lines.push("");
  lines.push(mdTable(summary.nonCritical.examples, [
    { label: "Voicing", value: (row) => row.voicing },
    { label: "Primary app", value: (row) => row.appPrimary ?? "" },
    { label: "Issues", value: issueSummary },
  ]));
  lines.push("");

  lines.push("## 10 patrones criticos mas problematicos");
  lines.push("");
  lines.push(mdTable(summary.critical.topVoicings, [
    { label: "Voicing", value: (row) => row.pattern },
    { label: "Casos", value: (row) => row.count },
    { label: "Primer issue", value: (row) => issueSummary(row.examples[0] ?? {}) },
  ]));
  lines.push("");

  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
  process.exit(0);
}

const summary = await summarize(opts);
const outJson = resolve(process.cwd(), opts.outJson);
const outMd = resolve(process.cwd(), opts.outMd);
mkdirSync(dirname(outJson), { recursive: true });
mkdirSync(dirname(outMd), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
writeMarkdown(summary, outMd);

console.log(`Resumen JSON: ${outJson}`);
console.log(`Resumen MD: ${outMd}`);
console.log(`Criticos: ${summary.totals.criticalRows}`);
console.log(`No criticos: ${summary.totals.nonCriticalRows}`);
