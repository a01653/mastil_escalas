/**
 * Re-ranking contextual de lecturas de acorde.
 *
 * No modifica el motor de detección. Solo reordena la lista de readings
 * devuelta por detectChordReadings() según un acorde de referencia.
 *
 * Si no hay ninguna lectura compatible con el contexto, devuelve el orden
 * original exacto del motor.
 *
 * Candidato contextual dom7: cuando la referencia es un dominante 7 y no existe
 * ninguna lectura con esa raíz y calidad dominante, se genera un candidato
 * sintético que explica las notas seleccionadas como tensiones del acorde.
 *
 * Candidato contextual maj7 rootless: cuando la referencia es maj7 y la raíz
 * no está presente físicamente, se genera un candidato sintético con no1 que
 * explica las notas como 3ª, 5ª, 7M y extensiones del acorde de referencia.
 */

import { mod12, pcToName, preferSharpsFromMajorTonicPc, spellChordNotes } from "./chordDetectionEngine.js";

// Mapeo de etiquetas UI → calidad del motor (formula.ui.quality)
const QUALITY_ENGINE_MAP = {
  "Mayor": "maj",
  "maj7":  "maj",
  "7":     "dom",
  "menor": "min",
  "m7":    "min",
  "m7(b5)": "hdim",
  "dim":   "dim",
  "dim7":  "dim",
  "sus4":  null,  // se comprueba por suspension, no por quality
  "7sus4": "dom",
};

// Intervalos válidos para un dominante 7 (core + tensiones)
const DOM7_TENSION_DATA = {
  coreIntervals:  [0, 4, 7, 10],
  coreLabels:     { 0: "1", 4: "3", 7: "5", 10: "b7" },
  requiredCore:   new Set([0, 10]),    // raíz y b7 son obligatorios
  tensionSet:     new Set([1, 2, 3, 6, 8, 9]),
  tensionLabels:  { 1: "b9", 2: "9", 3: "#9", 6: "#11", 8: "b13", 9: "13" },
  baseSuffix:     "7",
};

// Intervalos válidos para maj7 rootless (la raíz 0 está ausente por definición)
const MAJ7_ROOTLESS_DATA = {
  coreIntervals:  [0, 4, 7, 11],           // 1, 3, 5, 7M (0 siempre faltará)
  coreLabels:     { 0: "1", 4: "3", 7: "5", 11: "7" },
  requiredCore:   new Set([4, 11]),         // 3ª mayor y 7M son obligatorias
  tensionSet:     new Set([2, 5, 9]),       // 9, 11, 13
  tensionLabels:  { 2: "9", 5: "11", 9: "13" },
  allValid:       new Set([2, 4, 5, 7, 9, 11]), // intervalos permitidos (sin raíz)
  baseSuffix:     "maj7",
};

function contextMatchScore(reading, rootPc, quality) {
  if (reading.rootPc !== rootPc) return 0;

  let qualMatch = false;
  const engineQ    = QUALITY_ENGINE_MAP[quality];
  const readingQ   = reading.formula?.ui?.quality;
  const readingSus = reading.formula?.ui?.suspension;

  if (quality === "sus4") {
    qualMatch = readingSus === "sus4" || readingSus === "sus2";
  } else if (engineQ != null) {
    qualMatch = readingQ === engineQ;
  }

  // Raíz coincide: 2 puntos base + 1 por calidad compatible → máximo 3
  return 2 + (qualMatch ? 1 : 0);
}

// Devuelve true si ya existe alguna lectura con la raíz y calidad compatibles.
function hasCompatibleReading(readings, refRootPc, quality) {
  const engineQ = QUALITY_ENGINE_MAP[quality];
  if (engineQ == null) return false;
  return readings.some((r) => r.rootPc === refRootPc && r.formula?.ui?.quality === engineQ);
}

function buildContextualSuffix(baseSuffix, tensionLabels, missingLabels) {
  const parts = [...tensionLabels, ...missingLabels.map((l) => `no${l}`)];
  if (!parts.length) return baseSuffix;
  const partsStr = parts.join(",");
  if (!baseSuffix) return `(${partsStr})`;
  if (baseSuffix.endsWith(")")) return `${baseSuffix.slice(0, -1)},${partsStr})`;
  return `${baseSuffix}(${partsStr})`;
}

/**
 * Intenta generar un candidato contextual de tipo dominante 7.
 * Solo se crea si:
 *   - quality === "7"
 *   - selectedNotes es no vacío
 *   - la raíz Y el b7 están presentes en la selección
 *   - todas las notas son explicables como grados/tensiones del dominante
 *   - NO existe ya una lectura aislada con esa raíz y calidad dom
 *
 * Devuelve null si alguna condición no se cumple.
 */
function buildContextualDom7Candidate(harmonyContext, readings) {
  const { rootPc: rootPcRaw, selectedNotes } = harmonyContext;
  if (!Array.isArray(selectedNotes) || selectedNotes.length === 0) return null;

  const rootPc = mod12(rootPcRaw);

  // Si ya existe lectura dominante con esa raíz, el motor ya lo cubre
  if (hasCompatibleReading(readings, rootPc, "7")) return null;

  const data = DOM7_TENSION_DATA;
  const allValid = new Set([...data.coreIntervals, ...data.tensionSet]);
  const uniquePcs = Array.from(new Set(selectedNotes.map((n) => mod12(n.pc))));
  const selectedIntervals = uniquePcs.map((pc) => mod12(pc - rootPc));
  const selectedIntervalSet = new Set(selectedIntervals);

  // Raíz (0) y b7 (10) son obligatorios para que sea un dominante 7
  for (const req of data.requiredCore) {
    if (!selectedIntervalSet.has(req)) return null;
  }

  // Todas las notas deben ser explicables como grados o tensiones válidas
  for (const intv of selectedIntervals) {
    if (!allValid.has(intv)) return null;
  }

  const corePresent   = data.coreIntervals.filter((i) =>  selectedIntervalSet.has(i));
  const coreMissing   = data.coreIntervals.filter((i) => !selectedIntervalSet.has(i));
  const tensionsPresent = [...data.tensionSet]
    .filter((i) => selectedIntervalSet.has(i))
    .sort((a, b) => a - b);

  // Sin tensiones no hay información nueva respecto al análisis aislado del motor
  if (tensionsPresent.length === 0) return null;

  const missingLabels       = coreMissing.map((i) => data.coreLabels[i]);
  const tensionLabelStrings = tensionsPresent.map((i) => data.tensionLabels[i]);

  // Orden en el nombre e intervalPairsText: core presente (orden formula) → tensiones asc
  const pairsData = [
    ...corePresent.map((i) => ({ intv: i, label: data.coreLabels[i] })),
    ...tensionsPresent.map((i) => ({ intv: i, label: data.tensionLabels[i] })),
  ];

  const preferSharps = preferSharpsFromMajorTonicPc(rootPc);
  const rootName     = pcToName(rootPc, preferSharps);
  const suffix       = buildContextualSuffix(data.baseSuffix, tensionLabelStrings, missingLabels);
  const name         = `${rootName}${suffix}`;

  // Nombres de notas usando spellChordNotes para consistencia con el motor
  const noteNames = spellChordNotes({
    rootPc,
    chordIntervals: pairsData.map((p) => p.intv),
    preferSharps,
    degreeLabels:   pairsData.map((p) => p.label),
  });

  const intervalPairsText = pairsData
    .map(({ label }, idx) => `${label}=${noteNames[idx]}`)
    .join(", ");

  // Fórmula sintética: permite que buildChordLegend y buildDetectedCandidateNoteNameForPc
  // funcionen correctamente cuando este candidato esté seleccionado
  const syntheticFormula = {
    id:          "contextual_dom7",
    intervals:   pairsData.map((p) => p.intv),
    degreeLabels: pairsData.map((p) => p.label),
    quartal:     false,
    ui:          null,
    suffix,
  };

  const missingThird = coreMissing.includes(4);
  const rankScore    = Number((-10 + (missingThird ? 5 : 0)).toFixed(2));

  return {
    id:                   `contextual|${rootPc}|7|${uniquePcs.slice().sort((a, b) => a - b).join(",")}`,
    name,
    rootPc,
    bassPc:               rootPc,
    preferSharps,
    formula:              syntheticFormula,
    exact:                coreMissing.length === 0,
    score:                0,
    probabilityScore:     rankScore,
    rankScore:            String(rankScore),
    uiPatch:              null,   // no se puede copiar al constructor de acordes
    intervalPairsText,
    visibleNotes:         noteNames,
    visibleIntervals:     pairsData.map((p) => p.intv),
    missingLabels,
    externalBassInterval: null,
    contextual:           true,   // bandera para la etiqueta visual
    missingThird,
  };
}

/**
 * Intenta generar un candidato contextual rootless para referencia maj7.
 * Solo se crea si:
 *   - quality === "maj7"
 *   - selectedNotes no vacío
 *   - la raíz de referencia NO está físicamente en la selección
 *   - la 3ª mayor (4) y la 7M (11) están presentes
 *   - todas las notas son intervalos válidos de maj7 extendido (sin raíz)
 *   - NO existe ya una lectura con esa raíz y calidad mayor
 *
 * Devuelve null si alguna condición no se cumple.
 */
function buildContextualMaj7RootlessCandidate(harmonyContext, readings) {
  const { rootPc: rootPcRaw, selectedNotes } = harmonyContext;
  if (!Array.isArray(selectedNotes) || selectedNotes.length === 0) return null;

  const rootPc = mod12(rootPcRaw);

  // Si ya existe lectura mayor con esa raíz, el motor ya lo cubre
  if (hasCompatibleReading(readings, rootPc, "maj7")) return null;

  const data = MAJ7_ROOTLESS_DATA;
  const uniquePcs = Array.from(new Set(selectedNotes.map((n) => mod12(n.pc))));
  const selectedIntervals = uniquePcs.map((pc) => mod12(pc - rootPc));
  const selectedIntervalSet = new Set(selectedIntervals);

  // La raíz debe estar ausente (condición rootless)
  if (selectedIntervalSet.has(0)) return null;

  // Todas las notas deben ser intervalos válidos del maj7 extendido (sin raíz)
  for (const intv of selectedIntervals) {
    if (!data.allValid.has(intv)) return null;
  }

  // 3ª mayor y 7M son obligatorias para establecer la calidad maj7
  for (const req of data.requiredCore) {
    if (!selectedIntervalSet.has(req)) return null;
  }

  const corePresent     = data.coreIntervals.filter((i) =>  selectedIntervalSet.has(i));
  const coreMissing     = data.coreIntervals.filter((i) => !selectedIntervalSet.has(i));
  const tensionsPresent = [...data.tensionSet]
    .filter((i) => selectedIntervalSet.has(i))
    .sort((a, b) => a - b);

  const missingLabels       = coreMissing.map((i) => data.coreLabels[i]);
  const tensionLabelStrings = tensionsPresent.map((i) => data.tensionLabels[i]);

  // Orden en nombre e intervalPairsText: core presente (orden fórmula) → tensiones asc
  const pairsData = [
    ...corePresent.map((i) => ({ intv: i, label: data.coreLabels[i] })),
    ...tensionsPresent.map((i) => ({ intv: i, label: data.tensionLabels[i] })),
  ];

  const preferSharps = preferSharpsFromMajorTonicPc(rootPc);
  const rootName     = pcToName(rootPc, preferSharps);
  const suffix       = buildContextualSuffix(data.baseSuffix, tensionLabelStrings, missingLabels);
  const name         = `${rootName}${suffix}`;

  const noteNames = spellChordNotes({
    rootPc,
    chordIntervals: pairsData.map((p) => p.intv),
    preferSharps,
    degreeLabels:   pairsData.map((p) => p.label),
  });

  const intervalPairsText = pairsData
    .map(({ label }, idx) => `${label}=${noteNames[idx]}`)
    .join(", ");

  const syntheticFormula = {
    id:           "contextual_maj7_rootless",
    intervals:    pairsData.map((p) => p.intv),
    degreeLabels: pairsData.map((p) => p.label),
    quartal:      false,
    ui:           null,
    suffix,
  };

  // El bajo es la nota más grave de la selección (no la raíz, que está ausente)
  const bassPc              = mod12(selectedNotes[0].pc);
  const externalBassInterval = mod12(bassPc - rootPc); // siempre ≠ 0 porque raíz ausente

  // Penalty ligero por raíz ausente; extra si también falta la 5ª
  const missingFifth = coreMissing.includes(7);
  const rankScoreNum = Number((-8 + (missingFifth ? 3 : 0)).toFixed(2));

  return {
    id:                   `contextual|${rootPc}|maj7_rootless|${uniquePcs.slice().sort((a, b) => a - b).join(",")}`,
    name,
    rootPc,
    bassPc,
    preferSharps,
    formula:              syntheticFormula,
    exact:                false,   // siempre false: falta la raíz
    score:                0,
    probabilityScore:     rankScoreNum,
    rankScore:            String(rankScoreNum),
    uiPatch:              null,    // no se puede copiar al constructor de acordes
    intervalPairsText,
    visibleNotes:         noteNames,
    visibleIntervals:     pairsData.map((p) => p.intv),
    missingLabels,
    externalBassInterval,
    contextual:           true,    // bandera para la etiqueta visual
  };
}

/**
 * Reordena readings según un acorde de referencia armónico.
 *
 * @param {object[]} readings  Lista de readings del motor (inmutables).
 * @param {{ enabled: boolean, rootPc: number, quality: string, selectedNotes?: object[] }} harmonyContext
 * @returns {object[]}  Nueva lista (mismos objetos, nuevo orden; puede incluir candidato contextual al inicio).
 */
export function rankReadingsWithHarmonyContext(readings, harmonyContext) {
  if (!harmonyContext?.enabled || !Array.isArray(readings) || readings.length === 0) {
    return readings?.slice() ?? [];
  }

  const { rootPc, quality } = harmonyContext;

  // Intentar generar candidato contextual (dom7 o maj7 rootless)
  const contextualCandidate = quality === "7"
    ? buildContextualDom7Candidate(harmonyContext, readings)
    : quality === "maj7"
      ? buildContextualMaj7RootlessCandidate(harmonyContext, readings)
      : null;

  const scored = readings.map((r) => ({
    reading: r,
    match:   contextMatchScore(r, rootPc, quality),
  }));

  const bestMatch = Math.max(...scored.map((s) => s.match));

  const sorted = bestMatch === 0
    ? readings.slice()
    : scored
        .slice()
        .sort((a, b) => {
          if (b.match !== a.match) return b.match - a.match;
          return (a.reading.rankScore ?? a.reading.score ?? 999) -
                 (b.reading.rankScore ?? b.reading.score ?? 999);
        })
        .map((s) => s.reading);

  if (contextualCandidate) {
    return [contextualCandidate, ...sorted];
  }

  // El candidato ganador cambió por efecto de la referencia: marcarlo como promovido.
  if (sorted[0] && sorted[0] !== readings[0]) {
    const promotedWinner = { ...sorted[0], referencePromoted: true };
    return [promotedWinner, ...sorted.slice(1)];
  }

  return sorted;
}
