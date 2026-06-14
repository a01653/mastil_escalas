// Núcleo puro para calcular las lecturas "extra del oráculo": candidatos que
// analyzeFretsOracle genera para el voicing actual pero que el lector real no devuelve.
//
// IMPORTANTE: solo informativas — no afectan Primary, ranking, Posibles acordes
// ni Lecturas avanzadas/contextuales. No usa reports/*.ndjson en runtime.
//
// Deduplicación doble:
//   1. Nombre normalizado (trim + lowercase)
//   2. Firma rootPc + PCs relativos del voicing (captura enharmonías y renombrados)

import { analyzeFretsOracle } from "../../music/fretsOracle.js";

// Oracle siempre usa sostenidos (NOTE_NAMES_SHARP).
const SHARP_PC = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };

function sharpToPc(name) {
  const pc = SHARP_PC[name];
  return pc != null ? pc : -1;
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Firma "rootPc:rel0,rel1,..." donde relN son los PCs del voicing relativos a rootPc.
// Al usar los PCs del voicing (no los del candidato) la firma es idéntica para
// oracle y app si analizan el mismo voicing con la misma raíz.
function pcSig(rootPc, voicingPcs) {
  const rels = voicingPcs.map((pc) => (pc - rootPc + 12) % 12).sort((a, b) => a - b);
  return `${rootPc}:${rels.join(",")}`;
}

function assignGroupKey(c) {
  if (c.category === "quartal") return "cuartal";
  if (c.category?.endsWith("-fragment")) return "fragmentaria";
  if (c.category?.startsWith("suspended")) return "sus";
  if (c.missing?.includes("3") || c.missing?.includes("b3")) return "sin-3a";
  if (c.missing?.some((m) => ["5", "#5", "b5"].includes(m))) return "sin-5a";
  return "otras";
}

// Reconstruye el array fretsLH[0..5] (low E → high e) desde selectedKeys.
// selectedKeys: array de strings "sIdx:fret" donde sIdx 0=high e, 5=low E.
function selectedKeysToFretsLH(selectedKeys) {
  const fretsLH = [null, null, null, null, null, null];
  for (const key of selectedKeys || []) {
    const [sStr, fStr] = String(key).split(":");
    const sIdx = Number.parseInt(sStr, 10);
    const fret = Number.parseInt(fStr, 10);
    if (Number.isFinite(sIdx) && Number.isFinite(fret) && sIdx >= 0 && sIdx <= 5) {
      fretsLH[5 - sIdx] = fret;
    }
  }
  return fretsLH;
}

/**
 * Reconstruye la cadena de patrón "x02440" desde selectedKeys.
 * Exportado para tests unitarios y diagnóstico.
 */
export function oraclePatternFromKeys(selectedKeys) {
  const fretsLH = selectedKeysToFretsLH(selectedKeys);
  return fretsLH.map((n) => (n == null ? "x" : n.toString(36))).join("");
}

const GROUP_LABELS = {
  "sin-3a": "Sin 3ª",
  "sin-5a": "Sin 5ª",
  sus: "Sus con tensiones",
  fragmentaria: "Fragmentarias",
  cuartal: "Cuartal",
  otras: "Otras",
};
export const ORACLE_GROUP_ORDER = ["sin-3a", "sin-5a", "sus", "fragmentaria", "cuartal", "otras"];
export { GROUP_LABELS as ORACLE_GROUP_LABELS };

/**
 * Calcula las lecturas del oráculo que NO devuelve el lector real.
 *
 * @param {string[]} selectedKeys  chordDetectSelectedKeys del hook de detección.
 * @param {object[]} appCandidates chordDetectCandidatesRanked del lector real.
 * @returns {{ extras: object[], pattern: string }}
 *   extras: candidatos del oráculo no duplicados, con campo `groupKey`.
 *   pattern: cadena reconstruida (diagnóstico).
 */
export function computeOracleExtras(selectedKeys, appCandidates) {
  const fretsLH = selectedKeysToFretsLH(selectedKeys);
  const allMuted = fretsLH.every((n) => n == null);
  if (allMuted) return { extras: [], pattern: "xxxxxx" };

  // Pasar como array para que fretsOracle soporte trastes > 9 (sin parseOracleVoicing).
  const oracleInput = fretsLH.map((n) => (n == null ? "x" : n));

  let oracle;
  try {
    oracle = analyzeFretsOracle(oracleInput);
  } catch {
    return { extras: [], pattern: oraclePatternFromKeys(selectedKeys) };
  }
  if (!oracle) return { extras: [], pattern: oraclePatternFromKeys(selectedKeys) };

  const voicingPcs = oracle.pitchClasses;

  // ── Conjuntos de deduplicación del lector real ──────────────────────────
  const appNames = new Set((appCandidates || []).map((c) => normalizeName(c.name)));
  const appSigs = new Set(
    (appCandidates || [])
      .filter((c) => c.rootPc != null)
      .map((c) => pcSig(c.rootPc, voicingPcs))
  );

  const extras = [];
  for (const c of oracle.candidates) {
    if (appNames.has(normalizeName(c.name))) continue;
    const rootPc = sharpToPc(c.root);
    if (rootPc !== -1 && appSigs.has(pcSig(rootPc, voicingPcs))) continue;
    extras.push({ ...c, groupKey: assignGroupKey(c) });
  }

  return { extras, pattern: oraclePatternFromKeys(selectedKeys) };
}
