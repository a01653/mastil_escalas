/**
 * Núcleo compartido de análisis de digitación.
 *
 * Usado por:
 *   - scripts/analyzeFrets.mjs  (CLI)
 *   - src/music/mastilDebug.js  (window.mastilDebug.analyzeFrets)
 *
 * La app (App.jsx) usa las mismas funciones internas directamente:
 *   detectChordReadings → rankReadingsWithHarmonyContext
 * garantizando paridad algorítmica.
 */

import { parseFretString } from "./parseFretString.js";
import {
  analyzeSelectedNotes,
  mod12,
  pcToName,
  preferSharpsFromMajorTonicPc,
} from "./chordDetectionEngine.js";
import { rankReadingsWithHarmonyContext } from "./harmonyContextRanking.js";

/**
 * Analiza una digitación de guitarra y opcionalmente aplica re-ranking por referencia.
 *
 * @param {string} pattern  Digitación: "x5555x", "x-5-5-5-5-x", "1-3-2-0-x-x", etc.
 * @param {{ harmonyContext?: { enabled: boolean, rootPc: number, quality: string }|null }} options
 * @returns {{
 *   pattern: string,
 *   tabDisplay: string,
 *   noteNames: string[],
 *   pcSet: number[],
 *   bassName: string,
 *   selectedNotes: object[],
 *   readings: object[],
 *   rankedReadings: object[],
 *   primary: object|null,
 *   harmonyContext: object|null,
 *   promotedByReference: boolean,
 * }}
 * @throws {Error} si el patrón es inválido o hay menos de 2 cuerdas activas
 */
export function analyzeFretsCore(pattern, { harmonyContext = null } = {}) {
  const { frets, midiPitches, pcs } = parseFretString(pattern);

  const activeMidi = midiPitches.filter((m) => m !== null);
  if (activeMidi.length < 2) {
    throw new Error("menos de 2 cuerdas activas — no hay acorde que analizar");
  }

  const bassMidi     = Math.min(...activeMidi);
  const bassPc       = mod12(bassMidi);
  const preferSharps = preferSharpsFromMajorTonicPc(bassPc);
  const bassName     = pcToName(bassPc, preferSharps);

  const pcSet = [];
  const seen  = new Set();
  for (const pc of pcs) {
    if (pc !== null && !seen.has(pc)) {
      seen.add(pc);
      pcSet.push(pc);
    }
  }

  const noteNames  = pcSet.map((pc) => pcToName(pc, preferSharps));
  const tabDisplay = frets.map((f) => (f === null ? "x" : String(f))).join("-");

  const { selectedNotes, readings } = analyzeSelectedNotes(noteNames, bassName);

  const activeContext = harmonyContext?.enabled ? harmonyContext : null;

  const rankedReadings = activeContext
    ? rankReadingsWithHarmonyContext(readings, { ...activeContext, selectedNotes })
    : readings.slice();

  const primary = rankedReadings[0] ?? null;
  const promotedByReference = !!(primary?.contextual || primary?.referencePromoted);

  // El nombre del bajo a mostrar debe seguir la grafía elegida por el motor para la
  // lectura primaria (tras collapseEnharmonicTwins), no la canónica por bajo. Así el
  // encabezado no contradice las lecturas (p.ej. 4x2440: bajo "G#", no "Ab"). El
  // bassName canónico se conserva como entrada de análisis arriba.
  const displayBassName = (() => {
    if (!primary) return bassName;
    const slashIdx = String(primary.name || "").lastIndexOf("/");
    if (slashIdx >= 0) return primary.name.slice(slashIdx + 1);
    if (typeof primary.preferSharps === "boolean") return pcToName(bassPc, primary.preferSharps);
    return bassName;
  })();

  return {
    pattern,
    tabDisplay,
    noteNames,
    pcSet,
    bassName: displayBassName,
    selectedNotes,
    readings,
    rankedReadings,
    primary,
    harmonyContext: activeContext,
    promotedByReference,
  };
}
