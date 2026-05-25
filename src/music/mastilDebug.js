/**
 * Helpers de diagnóstico accesibles desde la consola del navegador (solo dev).
 * No afectan el comportamiento de la app; solo leen el motor y formatean salida.
 *
 * Uso:
 *   window.mastilDebug.analyzeNotes(["D","G","C","E"], "D")
 *   window.mastilDebug.analyzeFrets("x5555x")
 *   window.mastilDebug.analyzeFrets("x5555x", { harmonyContext: { enabled: true, rootPc: 2, quality: "7" } })
 */

import {
  analyzeSelectedNotes,
  noteNameToPc,
  pcToName,
} from "./chordDetectionEngine.js";
import { analyzeFretsCore } from "./analyzeFretsCore.js";

// Re-export para compatibilidad con importadores existentes (tests, CLI legacy)
export { parseFretString } from "./parseFretString.js";

function formatReading(r, idx) {
  const lines = [
    `  [${idx}] ${r.name ?? "(sin nombre)"}`,
    `       intervalPairsText : ${r.intervalPairsText ?? "—"}`,
    `       rootPc            : ${r.rootPc} (${pcToName(r.rootPc, r.preferSharps)})`,
    `       bassPc            : ${r.bassPc} (${pcToName(r.bassPc, r.preferSharps)})`,
    `       score             : ${r.score ?? "—"}`,
    `       probabilityScore  : ${r.probabilityScore ?? "—"}`,
    `       rankScore         : ${r.rankScore ?? "—"}`,
    `       missingLabels     : ${JSON.stringify(r.missingLabels ?? [])}`,
    `       visibleIntervals  : ${JSON.stringify(r.visibleIntervals ?? [])}`,
    `       visibleNotes      : ${JSON.stringify(r.visibleNotes ?? [])}`,
  ];
  return lines.join("\n");
}

/**
 * Analiza un conjunto de notas por nombre y lo pasa al motor de detección.
 *
 * Si bassName se indica y su pitch class no está ya en noteNames, se añade
 * automáticamente al conjunto de notas antes de llamar al motor.
 *
 * @param {string[]} noteNames  Ej: ["C","E","G"]
 * @param {string|null} bassName  Ej: "F"  (opcional)
 * @returns {{ selectedNotes: object[], readings: object[], primary: object|null }}
 */
export function analyzeNotes(noteNames, bassName = null) {
  if (!Array.isArray(noteNames) || noteNames.length === 0) {
    console.error("mastilDebug.analyzeNotes: noteNames debe ser un array no vacío.");
    return null;
  }

  let effectiveNotes = noteNames.slice();
  let bassAdded = false;

  if (bassName != null) {
    const bassPc = noteNameToPc(bassName);
    const alreadyPresent =
      bassPc != null && effectiveNotes.some((n) => noteNameToPc(n) === bassPc);
    if (bassPc != null && !alreadyPresent) {
      effectiveNotes = [bassName, ...effectiveNotes];
      bassAdded = true;
    }
  }

  const result = analyzeSelectedNotes(effectiveNotes, bassName);
  const primary = result.primary;

  console.group(
    `mastilDebug.analyzeNotes(${JSON.stringify(noteNames)}, ${JSON.stringify(bassName)})`
  );
  if (bassAdded) {
    console.warn(`Bajo ${bassName} añadido automáticamente a las notas analizadas.`);
  }
  console.log(`Notas efectivas: ${effectiveNotes.join(" ")}`);
  console.log(`Bajo           : ${bassName ?? "(auto)"}`);
  console.log(`Primary        : ${primary?.name ?? "(ninguno)"}`);
  console.log(`Readings       : ${result.readings.length}`);
  result.readings.forEach((r, i) => console.log(formatReading(r, i)));
  console.groupEnd();

  return result;
}

/**
 * Analiza una digitación de guitarra en formato LowE→HighE.
 * Usa analyzeFretsCore internamente para garantizar paridad con el CLI.
 *
 * @param {string} tabStr  Ej: "x5555x"  o  "x-5-5-5-5-x"
 * @param {{ harmonyContext?: object }} options
 * @returns {object|null}
 */
export function analyzeFrets(tabStr, options = {}) {
  let result;
  try {
    result = analyzeFretsCore(tabStr, options);
  } catch (err) {
    console.error(`mastilDebug.analyzeFrets: ${err.message}`);
    return null;
  }

  const { tabDisplay, noteNames, bassName, readings, rankedReadings, primary, harmonyContext } = result;

  console.group(`mastilDebug.analyzeFrets("${tabStr}")`);
  console.log(`Digitación: ${tabDisplay}  (LowE → HighE)`);
  console.log(`Notas     : ${noteNames.join(" ")}`);
  console.log(`Bajo      : ${bassName}`);
  if (harmonyContext) {
    console.log(`Referencia: rootPc=${harmonyContext.rootPc} quality=${harmonyContext.quality}`);
    console.log(`Primary   : ${primary?.name ?? "(ninguno)"}${result.promotedByReference ? "  ← por referencia" : ""}`);
    console.log(`Rankeadas : ${rankedReadings.length}`);
    rankedReadings.forEach((r, i) => console.log(formatReading(r, i)));
  } else {
    console.log(`Primary   : ${primary?.name ?? "(ninguno)"}`);
    console.log(`Readings  : ${readings.length}`);
    readings.forEach((r, i) => console.log(formatReading(r, i)));
  }
  console.groupEnd();

  return result;
}

/**
 * Registra window.mastilDebug. Llamar solo en modo desarrollo.
 */
export function registerMastilDebug() {
  if (typeof window === "undefined") return;
  window.mastilDebug = { analyzeNotes, analyzeFrets };
  console.info(
    "[mastilDebug] disponible en consola:\n" +
      "  window.mastilDebug.analyzeNotes([\"D\",\"G\",\"C\",\"E\"], \"D\")\n" +
      "  window.mastilDebug.analyzeFrets(\"x5555x\")\n" +
      "  window.mastilDebug.analyzeFrets(\"x5555x\", { harmonyContext: { enabled: true, rootPc: 2, quality: \"7\" } })\n" +
      "(activo porque import.meta.env.DEV=true o URL contiene ?debug=1)"
  );
}
