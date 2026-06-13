import { mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { analyzeFretsOracle, generateOracleVoicingPatterns } from "../src/music/fretsOracle.js";

const DEFAULT_OUT = "reports/frets-oracle.ndjson";

function parseArgs(argv) {
  const opts = {
    out: DEFAULT_OUT,
    format: "ndjson",
    limit: null,
    includeDyads: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") opts.out = argv[++i] ?? opts.out;
    else if (arg === "--format") opts.format = argv[++i] ?? opts.format;
    else if (arg === "--limit") opts.limit = Number(argv[++i]);
    else if (arg === "--include-dyads") opts.includeDyads = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

function printHelp() {
  console.log(`Uso: npm run generate:frets-oracle -- [opciones]

Opciones:
  --out <ruta>        Salida. Por defecto: ${DEFAULT_OUT}
  --format ndjson     JSON por linea. Recomendado para 117.649 combinaciones.
  --format json       Array JSON completo.
  --limit <n>         Genera solo los primeros n patrones para humo rapido.
  --include-dyads     No filtra dyads ni patrones de 2 pitch classes.
`);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
  process.exit(0);
}

if (!["ndjson", "json"].includes(opts.format)) {
  throw new Error(`Formato no soportado: ${opts.format}`);
}

const outPath = resolve(process.cwd(), opts.out);
mkdirSync(dirname(outPath), { recursive: true });

let total = 0;
let kept = 0;

if (opts.format === "json") {
  const rows = [];
  for (const voicing of generateOracleVoicingPatterns()) {
    total += 1;
    const row = analyzeFretsOracle(voicing, { includeDyads: opts.includeDyads });
    if (row) {
      rows.push(row);
      kept += 1;
    }
    if (opts.limit && total >= opts.limit) break;
  }
  writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
} else {
  const stream = createWriteStream(outPath, { encoding: "utf8" });
  for (const voicing of generateOracleVoicingPatterns()) {
    total += 1;
    const row = analyzeFretsOracle(voicing, { includeDyads: opts.includeDyads });
    if (row) {
      stream.write(`${JSON.stringify(row)}\n`);
      kept += 1;
    }
    if (opts.limit && total >= opts.limit) break;
  }
  await new Promise((resolveStream, rejectStream) => {
    stream.end((err) => (err ? rejectStream(err) : resolveStream()));
  });
}

console.log(`Oracle generado: ${outPath}`);
console.log(`Patrones recorridos: ${total}`);
console.log(`Casos conservados: ${kept}`);

