/**
 * CLI: analiza la tonalidad probable de una progresión de acordes.
 * Reutiliza el mismo motor que usa la tarjeta "Analizador de tonalidad / progresión" en la UI.
 *
 * Uso:
 *   npm run analyze:progression -- "F# | Bm | A/E | D/F#"
 *   npm run analyze:progression -- "C F G Am"
 *   npm run analyze:progression -- "Am | F | C | G"
 *   npm run analyze:progression -- "F# | Bm | A/E | D/F#" --json
 *
 * Separadores aceptados: | coma salto-de-línea espacios
 * Slash chords aceptados: A/E  D/F#
 *
 * --json  Imprime SOLO JSON válido en stdout. Sin colores ni texto extra.
 */

import { analyzeProgression } from "../src/music/keyAnalysisEngine.js";

// ─── Colores ANSI ──────────────────────────────────────────────────────────────

const R     = "\x1b[0m";
const BOLD  = "\x1b[1m";
const CYAN  = "\x1b[36m";
const GREEN = "\x1b[32m";
const DIM   = "\x1b[2m";
const AMBER = "\x1b[33m";

// ─── Argumentos ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let progression = null;
let useJson = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--json") {
    useJson = true;
  } else if (!arg.startsWith("--") && progression == null) {
    progression = arg;
  }
}

// ─── Validar argumento ─────────────────────────────────────────────────────────

if (!progression || !progression.trim()) {
  if (useJson) {
    process.stdout.write(JSON.stringify({ ok: false, error: "Falta la progresión", code: "MISSING_PROGRESSION" }) + "\n");
  } else {
    console.error(`${AMBER}Uso: npm run analyze:progression -- "<progresión>"${R}`);
    console.error(`${DIM}Ejemplos:${R}`);
    console.error(`  npm run analyze:progression -- "F# | Bm | A/E | D/F#"`);
    console.error(`  npm run analyze:progression -- "C F G Am"`);
    console.error(`  npm run analyze:progression -- "Am | F | C | G"`);
  }
  process.exit(1);
}

// ─── Análisis ──────────────────────────────────────────────────────────────────

const result = analyzeProgression(progression);

// ─── Salida JSON ───────────────────────────────────────────────────────────────

if (useJson) {
  process.stdout.write(JSON.stringify({ ok: true, progression, ...result }, null, 2) + "\n");
  process.exit(0);
}

// ─── Helper: imprimir bloque de una tonalidad ─────────────────────────────────

function printKeyBlock(keyData, isMain) {
  if (keyData.diatonicChords.length) {
    console.log();
    console.log(`${BOLD}Acordes diatónicos:${R} ${keyData.diatonicChords.join(", ")}`);
  }

  if (keyData.diatonicTable?.length) {
    console.log();
    console.log(`${BOLD}Grados en ${keyData.label}:${R}`);
    const maxDeg = Math.max(...keyData.diatonicTable.map((d) => d.degree.length));
    for (const d of keyData.diatonicTable) {
      const deg = d.degree.padEnd(maxDeg + 2);
      const coloredName = d.used ? `${GREEN}${d.name}${R}` : d.name;
      console.log(`  ${BOLD}${deg}${R}→ ${coloredName}`);
    }
  }

  const diatonicEntries = Object.entries(keyData.chordDegrees ?? {});
  if (diatonicEntries.length) {
    console.log();
    console.log(`${BOLD}Acordes introducidos:${R}`);
    const maxLen = Math.max(...diatonicEntries.map(([sym]) => sym.length));
    for (const [sym, deg] of diatonicEntries) {
      console.log(`  ${sym.padEnd(maxLen + 2)}→ ${GREEN}${deg}${R}`);
    }
  }

  if (keyData.functionalChords.length) {
    console.log();
    console.log(`${BOLD}Acordes funcionales/no diatónicos:${R}`);
    keyData.functionalChords.forEach((f) => console.log(`  - ${AMBER}${f.explanation}${R}`));
  }

  if (keyData.outsideChords.length) {
    console.log();
    console.log(`${BOLD}Fuera de tonalidad:${R}`);
    keyData.outsideChords.forEach((ch) => console.log(`  - ${DIM}${ch}${R}`));
  }
}

// ─── Salida humana ─────────────────────────────────────────────────────────────

console.log();
console.log(`${BOLD}Progresión:${R} ${CYAN}${progression}${R}`);

if (result.isEmpty || !result.keys.length) {
  console.log();
  console.log(`${DIM}No se encontró ninguna tonalidad con encaje razonable.${R}`);
  console.log();
  process.exit(0);
}

const chordSymbols = result.chords.map((c) => c.symbol);
console.log(`${BOLD}Acordes detectados:${R} ${DIM}${chordSymbols.join("  ")}${R}`);

const [best, ...rest] = result.keys;
const alternatives = rest.filter((k) => k.score >= best.score - 1);

console.log();
console.log(`${BOLD}Tonalidad probable:${R}`);
console.log(`  ${GREEN}${best.label}${R} — encaje ${BOLD}${best.strength}${R} (${best.percentage}%)`);

printKeyBlock(best, true);

if (alternatives.length) {
  for (const alt of alternatives) {
    console.log();
    console.log(`${BOLD}Opción alternativa:${R} ${alt.label} (${alt.percentage}%)`);
    printKeyBlock(alt, false);
  }
}

console.log();
