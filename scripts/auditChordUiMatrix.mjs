/**
 * Auditoría masiva de consistencia del constructor de acordes.
 *
 * Valida que para cada combinación de parámetros:
 *   1. IMPOSSIBLE_OPTION       — "Fundamental" no aparece cuando omit1 está activo.
 *   2. INVERSION_LABEL_MISMATCH — etiqueta del selector ≠ actualInversionLabelFromVoicing.
 *   3. ORDINAL_FUNCTIONAL_MIX  — etiquetas ordinales en acordes no-estándar o viceversa.
 *   4. MISSING_EXTENSION_BASS  — add activa sin opción de selector para ese bajo.
 *   5. EMPTY_VOICINGS_VALID    — (WARN) opción ofrecida pero 0 voicings generados.
 *   6. BASS_REAL_MISMATCH      — bajo real del primer voicing ≠ bajo esperado.
 *
 * Alteraciones de quinta y novena (cada combinación se recorre con todas las
 * quintas y novenas que ofrece el selector para ese estado):
 *   - ALTERATION_STATE_INVALID — la normalización cambia una alteración ofrecida.
 *   - TITLE_STATE_MISMATCH     — el nombre no refleja la alteración (o la muestra sin estar).
 *   - FUNCTIONAL_LABEL_MISMATCH — #9/#5/bb7 sin su grado (p. ej. #9 leído como b3).
 *   - CHECKBOX_CHIP_MISMATCH   — extensión marcada sin su grado en los chips.
 *   - ALTERED_USES_JSON        — un acorde alterado usaría el catálogo JSON.
 *   - QUALITY_SYNC_EQUIVALENCE — cuando el combo muestra otra calidad que la base
 *     (m7 + ♭5 → Semidisminuido, ø + 5 → Menor…), el acorde debe ser idéntico al de
 *     esa opción con su quinta: notas, grados, nombre, sufijo, catálogo y plan; la
 *     normalización no reescribe la base y la 3ª y el tipo de 7ª se conservan.
 *   - FIFTH_LOCKED / NINTH_LOCKED — la calidad bloquea la quinta (existiendo y sin
 *     omitir) o la novena (con la 9 activa).
 *   - AUG_SEVENTH_CONSERVED — elegir Aumentada da 3ª mayor + ♯5 conservando la 7ª
 *     que suena; si no puede (♭♭7 de Disminuido, "Omitir 5"), la opción está
 *     deshabilitada con explicación y el estado no cambia.
 *   - SUSPENSION_ROUND_TRIP — sus2/sus4 sustituyen solo la 3ª (quinta y 7ª se
 *     conservan) y al quitar la suspensión vuelve el estado exacto; si no puede
 *     (♭♭7 de Disminuido, "Omitir 3"), la opción está deshabilitada con
 *     explicación y el estado no cambia.
 *
 * Uso:
 *   npm run audit:chord-ui-matrix
 *   node scripts/auditChordUiMatrix.mjs [--json]
 */

import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  buildChordEnginePlan,
  computeInversionSelectorOptions,
  actualInversionLabelFromVoicing,
  bassIntervalsForSelection,
  generateTriadVoicings,
  generateTetradVoicings,
  generateExactIntervalChordVoicings,
  parseChordDbFretsString,
  buildVoicingFromFretsLH,
  buildChordStateNormalizationPatch,
  buildChordQualityChangePatch,
  buildChordSuspensionChangePatch,
} from "../src/music/appVoicingStudyCore.js";

import {
  mod12,
  pcToName,
  chordBassInterval,
  chordDisplayNameFromUI,
  normalizeChordUiSpec,
  buildChordToneDefinition,
  chordSuffixFromUI,
  chordCanUseJsonCatalog,
  chordQualitySelectOptions,
  chordSuspensionSelectOptions,
} from "../src/music/appMusicBasics.js";

import {
  chordFifthSelectorState,
  chordNinthSelectorState,
  isAlteredChordFifth,
  isAlteredChordNinth,
} from "../src/music/chordAlterations.js";

const __dir = dirname(fileURLToPath(import.meta.url));
let qualitySyncChecked = 0;
let augmentedChecked = 0;
let suspensionChecked = 0;
const ROOT = join(__dir, "..");
const REPORTS_DIR = join(ROOT, "reports");

const useJson = process.argv.includes("--json");

// ── Colores ANSI ──────────────────────────────────────────────────────────────
const R     = "\x1b[0m";
const BOLD  = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const AMBER = "\x1b[33m";
const DIM   = "\x1b[2m";
const CYAN  = "\x1b[36m";

// ── Espacio de combinaciones ───────────────────────────────────────────────────

const TONES = [
  { pc: 5,  label: "F",  preferSharps: false },
  { pc: 0,  label: "C",  preferSharps: false },
  { pc: 10, label: "Bb", preferSharps: false },
];

const QUALITIES = ["maj", "min", "dom", "minmaj7", "dim", "hdim"];

const SUSPENSIONS_BY_QUALITY = {
  maj:  ["none", "sus2", "sus4"],
  min:  ["none", "sus2", "sus4"],
  dom:  ["none", "sus2", "sus4"],
  minmaj7: ["none", "sus2", "sus4"],
  // La suspensión conserva la base: ø suspendido (7sus4(b5)) y Disminuido
  // suspendido sin 7ª (sus4(b5)); con ♭♭7 no es alcanzable (se salta abajo).
  dim:  ["none", "sus2", "sus4"],
  hdim: ["none", "sus2", "sus4"],
};

const OMITS = ["none", "1", "3", "5"];

// Extension combinations por estructura
function extCombos(structure) {
  const combos = [];
  const mk = (overrides) => ({
    ext7: false, ext6: false, ext9: false, ext11: false, ext13: false,
    ...overrides,
  });

  if (structure === "triad") {
    // buildChordUiRestrictions: showNine/Eleven/Thirteen=false, canToggleSix=false,
    // canToggleSeven=false para triadas → solo la triada pura es alcanzable.
    combos.push(mk({}));
  } else if (structure === "tetrad") {
    // Requiere ext7 para generator!="none"; incluimos sin-ext7 para validar el caso
    combos.push(mk({ ext7: false })); // generator=none
    combos.push(mk({ ext7: true }));
    combos.push(mk({ ext7: true, ext9: true }));
    combos.push(mk({ ext7: true, ext11: true }));
    combos.push(mk({ ext7: true, ext13: true }));
    combos.push(mk({ ext7: true, ext9: true, ext11: true }));
    combos.push(mk({ ext7: true, ext9: true, ext13: true }));
    combos.push(mk({ ext7: true, ext11: true, ext13: true }));
    combos.push(mk({ ext7: true, ext9: true, ext11: true, ext13: true }));
    combos.push(mk({ ext7: false, ext6: true })); // add6 (tetradFamily singleAdd)
    combos.push(mk({ ext7: false, ext13: true })); // add13 (tetradFamily singleAdd)
  } else { // chord
    combos.push(mk({}));
    combos.push(mk({ ext7: true }));
    combos.push(mk({ ext7: true, ext9: true }));
    combos.push(mk({ ext7: true, ext11: true }));
    combos.push(mk({ ext7: true, ext13: true }));
    combos.push(mk({ ext7: true, ext9: true, ext11: true }));
    combos.push(mk({ ext7: true, ext9: true, ext13: true }));
    combos.push(mk({ ext7: true, ext11: true, ext13: true }));
    combos.push(mk({ ext7: true, ext9: true, ext11: true, ext13: true }));
    // singleAdd (no ext7)
    combos.push(mk({ ext6: true }));
    combos.push(mk({ ext9: true }));
    combos.push(mk({ ext11: true }));
    combos.push(mk({ ext13: true }));
    // multiAdd (no ext7, 2+ adds)
    combos.push(mk({ ext9: true, ext11: true }));
    combos.push(mk({ ext9: true, ext13: true }));
    combos.push(mk({ ext11: true, ext13: true }));
    combos.push(mk({ ext9: true, ext11: true, ext13: true }));
  }
  return combos;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isOrdinalLabel(label) {
  return ["1ª inversión", "2ª inversión", "3ª inversión"].includes(label);
}

function isBajoLabel(label) {
  return typeof label === "string" && label.startsWith("Bajo ");
}

// Genera voicings para una combinación concreta de plan + inversión.
// Solo para generadores rápidos (triad, tetrad, exact).
// Devuelve { voicings, skipped, reason }.
const MAX_FRET_AUDIT = 15; // App default useState(15)
const MAX_SPAN_AUDIT = 5;

function generateVoicingsForPlanAndInv(plan, invValue) {
  if (plan.generator === "none") {
    return { voicings: [], skipped: true, reason: "generator=none" };
  }
  if (plan.generator === "json") {
    return { voicings: [], skipped: true, reason: "generator=json (sin DB en script)" };
  }
  if (plan.generator === "drop") {
    return { voicings: [], skipped: true, reason: "generator=drop (no implementado en audit)" };
  }

  const bassInterval = chordBassInterval({
    quality: plan.quality,
    suspension: plan.suspension,
    structure: plan.structure,
    inversion: invValue,
    omit: plan.omit,
    ext7: plan.ext7,
    ext6: plan.ext6,
    ext9: plan.ext9,
    ext11: plan.ext11,
    ext13: plan.ext13,
    fifth: plan.fifth,
    ninth: plan.ninth,
  });

  if (plan.generator === "triad") {
    const voicings = generateTriadVoicings({
      rootPc: plan.rootPc,
      thirdOffset: plan.thirdOffset,
      fifthOffset: plan.fifthOffset,
      inversion: invValue,
      maxFret: MAX_FRET_AUDIT,
      maxSpan: MAX_SPAN_AUDIT,
    });
    return { voicings, skipped: false, bassInterval };
  }

  if (plan.generator === "tetrad") {
    const topVoiceOffset = plan.topVoiceOffset;
    if (topVoiceOffset == null) {
      return { voicings: [], skipped: true, reason: "topVoiceOffset=null" };
    }
    const voicings = generateTetradVoicings({
      rootPc: plan.rootPc,
      thirdOffset: plan.thirdOffset,
      fifthOffset: plan.fifthOffset,
      seventhOffset: topVoiceOffset,
      inversion: invValue,
      maxFret: MAX_FRET_AUDIT,
      maxSpan: MAX_SPAN_AUDIT,
    });
    return { voicings, skipped: false, bassInterval };
  }

  if (plan.generator === "exact") {
    const voicings = generateExactIntervalChordVoicings({
      rootPc: plan.rootPc,
      intervals: plan.intervals,
      bassInterval,
      maxFret: MAX_FRET_AUDIT,
      maxSpan: MAX_SPAN_AUDIT,
    });
    return { voicings, skipped: false, bassInterval };
  }

  return { voicings: [], skipped: true, reason: `generator=${plan.generator}` };
}

// ── Motor de auditoría ─────────────────────────────────────────────────────────

let idCounter = 0;
const results = [];
let totalPass = 0;
let totalWarn = 0;
let totalFail = 0;

function recordResult({
  tone, quality, structure, suspension, exts, omit, fifth, ninth, invOpt, invOptLabel,
  status, category, motivo,
  planName, selectorOpts, voicingCount, bassExpected, bassActual,
}) {
  const id = `M${String(++idCounter).padStart(5, "0")}`;
  const rec = {
    id, tone, quality, structure, suspension,
    ext7: exts.ext7, ext6: exts.ext6, ext9: exts.ext9, ext11: exts.ext11, ext13: exts.ext13,
    omit, fifth: fifth ?? null, ninth: ninth ?? null, invOpt, invOptLabel,
    status, category, motivo,
    planName: planName || "",
    selectorOpts: selectorOpts ? selectorOpts.map((o) => o.label) : [],
    voicingCount: voicingCount ?? null,
    bassExpected: bassExpected ?? null,
    bassActual: bassActual ?? null,
  };
  results.push(rec);
  if (status === "PASS") totalPass++;
  else if (status === "WARN") totalWarn++;
  else totalFail++;
  return rec;
}

// Coherencia de quinta/novena: estado normalizado, nombre, grados y chips.
function auditAlterationCoherence({ ctx, planBase, planName, quality, suspension, structure, exts, omit, fifth, ninth }) {
  const fail = (category, motivo) => recordResult({ ...ctx, invOpt: "-", invOptLabel: "-", status: "FAIL", category, motivo });
  const spec = normalizeChordUiSpec({ quality, suspension, structure, ...exts, omit, fifth, ninth });
  if (spec.fifth !== fifth || spec.ninth !== ninth) {
    fail("ALTERATION_STATE_INVALID", `selector ofrece fifth=${fifth} ninth=${ninth} pero el estado normalizado es fifth=${spec.fifth} ninth=${spec.ninth}`);
  }
  const labels = planBase.degreeLabels || [];
  if (labels.length !== planBase.intervals.length || labels.some((label) => !label)) {
    fail("FUNCTIONAL_LABEL_MISMATCH", `grados ${JSON.stringify(labels)} no alineados con intervalos ${JSON.stringify(planBase.intervals)}`);
    return;
  }
  const labelOf = (interval) => labels[planBase.intervals.indexOf(interval)];
  const fifthAltered = isAlteredChordFifth(spec.fifth, spec.quality, spec.suspension);
  // La novena alterada solo cuenta si suena (en cuatriada sin omisión la 9 no cabe).
  const ninthSounds = (planBase.toneRoles || []).includes("ninth");
  const ninthAltered = ninthSounds && isAlteredChordNinth(spec.ninth);
  const suffix = planName.replace(/^[A-G][b#]?/, "");

  if (fifthAltered) {
    const interval = { b5: 6, 5: 7, "#5": 8 }[spec.fifth];
    if (labelOf(interval) !== spec.fifth) fail("FUNCTIONAL_LABEL_MISMATCH", `quinta ${spec.fifth}: el intervalo ${interval} se etiqueta "${labelOf(interval)}"`);
    const fifthName = { "#5": "#5", b5: "b5", 5: "♮5" }[spec.fifth];
    const named = suffix.includes(fifthName) || (spec.fifth === "#5" && /^aug/.test(suffix));
    if (!named) fail("TITLE_STATE_MISMATCH", `quinta ${spec.fifth} activa pero el nombre "${planName}" no la refleja`);
  } else if (/#5|^aug/.test(suffix) || (suffix.includes("b5") && spec.quality !== "hdim")) {
    fail("TITLE_STATE_MISMATCH", `sin quinta alterada pero el nombre "${planName}" la muestra`);
  }

  if (ninthAltered) {
    const interval = spec.ninth === "#9" ? 3 : 1;
    if (labelOf(interval) !== spec.ninth) fail("FUNCTIONAL_LABEL_MISMATCH", `novena ${spec.ninth}: el intervalo ${interval} se etiqueta "${labelOf(interval)}"`);
    if (!suffix.includes(spec.ninth)) fail("TITLE_STATE_MISMATCH", `novena ${spec.ninth} activa pero el nombre "${planName}" no la refleja`);
    // Con 3ª (sin suspensión) la ♯9 solo se ofrece sobre 3ª mayor, que sigue sonando como 3.
    if (spec.ninth === "#9" && spec.suspension === "none" && labelOf(4) !== "3" && omit !== "3") fail("FUNCTIONAL_LABEL_MISMATCH", "#9 sin 3ª mayor etiquetada como 3");
    if (spec.ninth === "#9" && spec.suspension === "none" && labelOf(3) === "b3") fail("FUNCTIONAL_LABEL_MISMATCH", "#9 junto a una ♭3 (misma altura)");
  } else if (/b9|#9/.test(suffix)) {
    fail("TITLE_STATE_MISMATCH", `sin novena alterada pero el nombre "${planName}" la muestra`);
  }

  if (spec.quality === "dim" && spec.ext7 && labelOf(9) && labelOf(9) !== "bb7") {
    fail("FUNCTIONAL_LABEL_MISMATCH", `dim7: el intervalo 9 se etiqueta "${labelOf(9)}" (debe ser bb7)`);
  }

  // Cada extensión marcada que suena debe tener su grado en los chips.
  const present = new Set(planBase.toneRoles || []);
  const expectChip = (active, role, label) => {
    if (active && !present.has(role)) return;
    if (active && !labels.includes(label)) fail("CHECKBOX_CHIP_MISMATCH", `extensión ${label} activa y presente pero sin chip "${label}" (${labels.join(" ")})`);
  };
  expectChip(planBase.ext9, "ninth", spec.ninth);
  expectChip(planBase.ext11, "eleventh", "11");
  expectChip(planBase.ext13, "thirteenth", "13");

  if ((fifthAltered || ninthAltered) && planBase.generator === "json") {
    fail("ALTERED_USES_JSON", `acorde alterado con generator=json (el catálogo no garantiza la fórmula)`);
  }

  // La calidad no bloquea los selectores (regla de Calidad/Quinta/Novena).
  const fifthState = chordFifthSelectorState({ quality, suspension, omit });
  if (omit !== "5" && !fifthState.enabled) fail("FIFTH_LOCKED", `quinta bloqueada en ${quality}`);
  const ninthState = chordNinthSelectorState({ quality, suspension, structure, ext7: exts.ext7, ext9: exts.ext9 });
  if (exts.ext9 && structure !== "triad" && !ninthState.enabled) fail("NINTH_LOCKED", `novena bloqueada en ${quality} con la 9 activa`);

  auditAugmentedOption({ fail, quality, suspension, structure, exts, omit, fifth, ninth });
  if (suspension === "none") auditSuspensionRoundTrip({ fail, quality, structure, exts, omit, fifth, ninth });

  if (spec.displayQuality !== spec.uiQuality) {
    auditQualitySyncEquivalence({ fail, planBase, quality, suspension, structure, exts, omit, fifth, ninth, spec });
  }
}

// Aumentada conserva la 7ª que suena (o queda deshabilitada y el estado no cambia).
function auditAugmentedOption({ fail, quality, suspension, structure, exts, omit, fifth, ninth }) {
  const state = { rootPc: 0, preferSharps: false, quality, suspension, structure, ...exts, omit, fifth, ninth };
  const option = chordQualitySelectOptions(state).find((o) => o.value === "aug");
  const patch = buildChordQualityChangePatch(state, "aug");
  const SEVENTHS = ["7", "b7", "bb7"];
  const before = buildChordToneDefinition(state).degreeLabels;
  const seventhBefore = before.find((label) => SEVENTHS.includes(label)) || null;
  augmentedChecked++;
  if (option.disabled) {
    if (Object.keys(patch).length) fail("AUG_SEVENTH_CONSERVED", `Aumentada deshabilitada pero cambia el estado: ${JSON.stringify(patch)}`);
    if (!option.title) fail("AUG_SEVENTH_CONSERVED", "Aumentada deshabilitada sin explicación");
    const expectedDisabled = omit === "5" || (seventhBefore === "bb7");
    if (!expectedDisabled) fail("AUG_SEVENTH_CONSERVED", `Aumentada deshabilitada sin motivo (7ª ${seventhBefore}, omit ${omit})`);
    return;
  }
  const next = { ...state, ...patch };
  const settled = { ...next, ...buildChordStateNormalizationPatch(next) };
  const after = buildChordToneDefinition(settled).degreeLabels;
  const seventhAfter = after.find((label) => SEVENTHS.includes(label)) || null;
  if (seventhBefore !== seventhAfter) fail("AUG_SEVENTH_CONSERVED", `Aumentada cambia la 7ª: ${seventhBefore} → ${seventhAfter}`);
  if (omit !== "3" && !after.includes("3")) fail("AUG_SEVENTH_CONSERVED", `Aumentada sin 3ª mayor: ${after.join(" ")}`);
  if (!after.includes("#5")) fail("AUG_SEVENTH_CONSERVED", `Aumentada sin ♯5: ${after.join(" ")}`);
  if (normalizeChordUiSpec(settled).displayQuality !== "aug") fail("AUG_SEVENTH_CONSERVED", "el combo no muestra Aumentada tras elegirla");
}

// sus2/sus4 solo sustituyen la 3ª y la vuelta deja el estado idéntico (o la opción
// está deshabilitada y explicada sin cambiar nada).
function auditSuspensionRoundTrip({ fail, quality, structure, exts, omit, fifth, ninth }) {
  const settle = (state) => ({ ...state, ...buildChordStateNormalizationPatch(state) });
  const base = settle({ rootPc: 0, preferSharps: false, quality, suspension: "none", structure, ...exts, omit, fifth, ninth });
  const before = buildChordToneDefinition(base).degreeLabels;
  const seventhOf = (labels) => labels.find((label) => ["7", "b7", "bb7"].includes(label)) || null;
  const fifthOf = (labels) => labels.find((label) => ["5", "b5", "#5"].includes(label)) || null;
  for (const suspension of ["sus2", "sus4"]) {
    suspensionChecked++;
    const option = chordSuspensionSelectOptions(base).find((o) => o.value === suspension);
    const patch = buildChordSuspensionChangePatch(base, suspension);
    if (option.disabled) {
      if (Object.keys(patch).length) fail("SUSPENSION_ROUND_TRIP", `${suspension} deshabilitada pero cambia el estado: ${JSON.stringify(patch)}`);
      if (!option.title) fail("SUSPENSION_ROUND_TRIP", `${suspension} deshabilitada sin explicación`);
      const expected = omit === "3" || seventhOf(before) === "bb7";
      if (!expected) fail("SUSPENSION_ROUND_TRIP", `${suspension} deshabilitada sin motivo (7ª ${seventhOf(before)}, omit ${omit})`);
      continue;
    }
    const suspended = settle({ ...base, ...patch });
    const after = buildChordToneDefinition(suspended).degreeLabels;
    if (!after.includes(suspension === "sus2" ? "2" : "4")) fail("SUSPENSION_ROUND_TRIP", `${suspension} sin su grado: ${after.join(" ")}`);
    if (after.includes("3") || after.includes("b3")) fail("SUSPENSION_ROUND_TRIP", `${suspension} conserva la 3ª: ${after.join(" ")}`);
    if (seventhOf(before) !== seventhOf(after)) fail("SUSPENSION_ROUND_TRIP", `${suspension} cambia la 7ª: ${seventhOf(before)} → ${seventhOf(after)}`);
    if (fifthOf(before) !== fifthOf(after)) fail("SUSPENSION_ROUND_TRIP", `${suspension} cambia la quinta: ${fifthOf(before)} → ${fifthOf(after)}`);
    const back = settle({ ...suspended, ...buildChordSuspensionChangePatch(suspended, "none") });
    if (JSON.stringify(back) !== JSON.stringify(base)) fail("SUSPENSION_ROUND_TRIP", `quitar ${suspension} no recupera el acorde: ${JSON.stringify(base)} → ${JSON.stringify(back)}`);
  }
}

function hasSeventhForAudit(structure, exts) {
  return structure === "chord" ? exts.ext7 !== false : !!exts.ext7;
}

// Si el combo muestra otra calidad que la base, el acorde debe ser exactamente esa opción.
function auditQualitySyncEquivalence({ fail, planBase, quality, suspension, structure, exts, omit, fifth, ninth, spec }) {
  const state = { rootPc: 0, preferSharps: false, quality, suspension, structure, ...exts, omit, fifth, ninth };
  const shown = spec.displayQuality;
  if (shown === "aug") {
    // Aumentada es solo etiqueta: 3ª mayor + ♯5 y la 7ª de la base (aug / 7(#5) / maj7(#5)).
    const labels = buildChordToneDefinition(state).degreeLabels;
    const seventh = { maj: "7", dom: "b7" }[quality];
    const name = chordDisplayNameFromUI(state).replace(/^[A-G][b#]?/, "");
    if (spec.fifth !== "#5" || !["maj", "dom"].includes(quality)) fail("QUALITY_SYNC_EQUIVALENCE", `Aumentada con base ${quality} y quinta ${spec.fifth}`);
    if (omit !== "3" && !labels.includes("3")) fail("QUALITY_SYNC_EQUIVALENCE", `Aumentada sin 3ª mayor: ${labels.join(" ")}`);
    if (spec.ext7 !== false && hasSeventhForAudit(structure, exts) && !labels.includes(seventh)) fail("QUALITY_SYNC_EQUIVALENCE", `Aumentada pierde la 7ª de la base (${seventh}): ${labels.join(" ")}`);
    if (!/^aug|#5/.test(name)) fail("QUALITY_SYNC_EQUIVALENCE", `Aumentada con nombre "${name}"`);
    qualitySyncChecked++;
    return;
  }
  const reference = { ...state, quality: shown, fifth: spec.fifth };
  const refSpec = normalizeChordUiSpec(reference);
  if (refSpec.displayQuality !== shown || refSpec.fifth !== spec.fifth) {
    fail("QUALITY_SYNC_EQUIVALENCE", `la opción mostrada ${shown} no admite la quinta ${spec.fifth}`);
  }
  const patch = buildChordStateNormalizationPatch(state);
  if ("quality" in patch || "fifth" in patch) {
    fail("QUALITY_SYNC_EQUIVALENCE", `la normalización reescribe el estado: ${JSON.stringify(patch)}`);
  }
  const a = buildChordToneDefinition(state);
  const b = buildChordToneDefinition(reference);
  if (quality !== "dim" && a.degreeLabels.includes("bb7")) fail("QUALITY_SYNC_EQUIVALENCE", `aparece ♭♭7 sin base Disminuido: ${a.degreeLabels.join(" ")}`);
  const pairs = [
    ["intervalos", a.intervals.join(","), b.intervals.join(",")],
    ["grados", a.degreeLabels.join(","), b.degreeLabels.join(",")],
    ["nombre", chordDisplayNameFromUI(state), chordDisplayNameFromUI(reference)],
    ["sufijo", chordSuffixFromUI(state), chordSuffixFromUI(reference)],
    ["catálogo", String(chordCanUseJsonCatalog(state)), String(chordCanUseJsonCatalog(reference))],
  ];
  const refPlan = buildChordEnginePlan({ ...reference, inversion: "all", form: "open" });
  pairs.push(["plan", `${planBase.generator}/${planBase.layer}`, `${refPlan.generator}/${refPlan.layer}`]);
  for (const [what, x, y] of pairs) {
    if (x !== y) fail("QUALITY_SYNC_EQUIVALENCE", `${what}: ${quality}+${fifth} "${x}" ≠ ${shown} "${y}"`);
  }
  qualitySyncChecked++;
}

function auditCombination({ tone, quality, structure, suspension, exts, omit, fifth, ninth }) {
  const { pc: rootPc, label: toneLabel, preferSharps } = tone;
  const { ext7, ext6, ext9, ext11, ext13 } = exts;

  // Plan base (inversión="all" para computeInversionSelectorOptions)
  const planBase = buildChordEnginePlan({
    rootPc, quality, suspension, structure,
    inversion: "all", form: "closed",
    ext7, ext6, ext9, ext11, ext13, omit, fifth, ninth,
  });

  const planName = chordDisplayNameFromUI({
    rootPc, preferSharps, quality, suspension, structure,
    ext7, ext6, ext9, ext11, ext13, omit, fifth, ninth,
  });

  const selectorOpts = computeInversionSelectorOptions(planBase);
  const isNonStandard = !!(planBase.singleAdd || planBase.multiAdd || planBase.omit !== "none");

  const ctx = { tone: toneLabel, quality, structure, suspension, exts, omit, fifth, ninth, planName, selectorOpts };

  auditAlterationCoherence({ ctx, planBase, planName, quality, suspension, structure, exts, omit, fifth, ninth });

  // ── INVARIANT 1: No "Fundamental" si omit1 ─────────────────────────────────
  const hasFundamentalOpt = selectorOpts.some((o) => o.value === "root");
  if (omit === "1") {
    if (hasFundamentalOpt) {
      recordResult({
        ...ctx,
        invOpt: "root", invOptLabel: "Fundamental",
        status: "FAIL", category: "IMPOSSIBLE_OPTION",
        motivo: "omit1 activo pero 'Fundamental' aparece en el selector",
      });
    }
    // (pass silencioso para este invariante cuando no falla)
  }

  // ── INVARIANT 2 y 3: Consistencia etiqueta selector ↔ actualInversionLabelFromVoicing ──
  for (const opt of selectorOpts) {
    if (opt.value === "all") continue;

    const planForInv = buildChordEnginePlan({
      rootPc, quality, suspension, structure,
      inversion: opt.value, form: "closed",
      ext7, ext6, ext9, ext11, ext13, omit, fifth, ninth,
    });

    const bassInt = chordBassInterval({
      quality, suspension, structure,
      inversion: opt.value,
      omit, ext7, ext6, ext9, ext11, ext13, fifth, ninth,
    });

    const syntheticVoicing = { bassPc: mod12(rootPc + bassInt) };
    const actualLabel = actualInversionLabelFromVoicing(planForInv, syntheticVoicing);

    if (actualLabel !== opt.label) {
      recordResult({
        ...ctx,
        invOpt: opt.value, invOptLabel: opt.label,
        status: "FAIL", category: "INVERSION_LABEL_MISMATCH",
        motivo: `selector="${opt.label}" pero actualInversionLabelFromVoicing="${actualLabel}"`,
        bassExpected: bassInt,
      });
    }

    // ── INVARIANT 3: No mezclar ordinales y funcionales ────────────────────
    if (opt.value !== "root") {
      if (!isNonStandard) {
        // Acorde estándar: las opciones no-Fundamental DEBEN ser ordinales
        if (!isOrdinalLabel(opt.label) && opt.label !== "Fundamental") {
          // Podría ser "Bajo 7" para un dominante con omit → eso sería nonStandard.
          // Si llegamos aquí y no es ordinal, es mezcla.
          recordResult({
            ...ctx,
            invOpt: opt.value, invOptLabel: opt.label,
            status: "WARN", category: "ORDINAL_FUNCTIONAL_MIX",
            motivo: `Acorde estándar (isNonStandard=false) pero opción usa etiqueta no-ordinal: "${opt.label}"`,
          });
        }
      } else {
        // Acorde no-estándar: las opciones no-Fundamental NO DEBEN ser ordinales
        if (isOrdinalLabel(opt.label)) {
          recordResult({
            ...ctx,
            invOpt: opt.value, invOptLabel: opt.label,
            status: "FAIL", category: "ORDINAL_FUNCTIONAL_MIX",
            motivo: `Acorde no-estándar (add/omit) pero opción usa etiqueta ordinal: "${opt.label}"`,
          });
        }
      }
    }

    // ── INVARIANT 5 y 6: Voicings (solo tono F, generadores rápidos) ────────
    if (toneLabel === "F") {
      const { voicings, skipped, bassInterval: bInt } = generateVoicingsForPlanAndInv(planForInv, opt.value);

      if (!skipped) {
        if (voicings.length === 0 && planBase.intervals.length > 6) {
          // 7 notas distintas no caben en 6 cuerdas: la ausencia de posiciones es
          // correcta siempre que la interfaz explique el motivo (plan.tooManyNotes).
          if (!planForInv.tooManyNotes) {
            recordResult({
              ...ctx,
              invOpt: opt.value, invOptLabel: opt.label,
              status: "FAIL", category: "INSUFFICIENT_NOTES_MESSAGE_MISMATCH",
              motivo: `${planBase.intervals.length} notas distintas sin posición posible pero el plan no marca tooManyNotes`,
              voicingCount: 0,
            });
          } else {
            totalTooManyNotes++;
          }
        } else if (voicings.length === 0) {
          // Distinguir entre combinación musicalmente inválida vs. falta de voicings
          const minNotes = planBase.intervals?.length ?? 0;
          const motivo = minNotes < 3
            ? "Combinación con < 3 notas (musicalmente inválida)"
            : "0 voicings para inversión ofrecida en selector";
          const status = minNotes < 3 ? "WARN" : "WARN";
          recordResult({
            ...ctx,
            invOpt: opt.value, invOptLabel: opt.label,
            status, category: "EMPTY_VOICINGS_WITH_VALID_FILTER",
            motivo,
            voicingCount: 0,
            bassExpected: bInt ?? bassInt,
          });
        } else {
          // Verificar que el bajo real coincide con el esperado
          const expectedBassInt = mod12(bInt ?? bassInt);
          const actualBassInt = mod12(voicings[0].bassPc - rootPc);
          if (actualBassInt !== expectedBassInt) {
            recordResult({
              ...ctx,
              invOpt: opt.value, invOptLabel: opt.label,
              status: "FAIL", category: "BASS_REAL_MISMATCH",
              motivo: `Bajo esperado: ${expectedBassInt}, bajo real del voicing: ${actualBassInt}`,
              voicingCount: voicings.length,
              bassExpected: expectedBassInt,
              bassActual: actualBassInt,
            });
          }

          // ── INVARIANT 7: fórmula ↔ voicing — cada intervalo requerido debe aparecer ──
          const requiredIntervals = new Set(planBase.intervals.map((i) => mod12(i)));
          const voicingIntervals = new Set((voicings[0].notes || []).map((n) => mod12(n.pc - rootPc)));
          const missingIntervals = [...requiredIntervals].filter((i) => !voicingIntervals.has(i));
          if (missingIntervals.length > 0) {
            recordResult({
              ...ctx,
              invOpt: opt.value, invOptLabel: opt.label,
              status: "FAIL", category: "FORMULA_VOICING_MISMATCH",
              motivo: `Voicing falta intervalos ${missingIntervals.join(",")} (requeridos: ${[...requiredIntervals].join(",")}, voicing: ${[...voicingIntervals].join(",")})`,
              voicingCount: voicings.length,
            });
          }

          // ── INVARIANT 8: nota omitida no debe aparecer en el voicing ──────────────
          if (planBase.omit !== "none") {
            const omitInt = planBase.omit === "1" ? 0
              : planBase.omit === "3" ? mod12(planBase.thirdOffset)
              : planBase.omit === "5" ? mod12(planBase.fifthOffset)
              : null;
            if (omitInt !== null && voicingIntervals.has(omitInt)) {
              recordResult({
                ...ctx,
                invOpt: opt.value, invOptLabel: opt.label,
                status: "FAIL", category: "OMIT_NOT_PRESERVED",
                motivo: `Nota omitida (intervalo=${omitInt}, omit="${planBase.omit}") presente en el voicing`,
                voicingCount: voicings.length,
              });
            }
          }
        }
      }
    }
  }

  // ── INVARIANT 4: multiAdd — todas las extensiones activas tienen opción ────
  if (planBase.multiAdd && toneLabel === "F") {
    const activeAdds = [];
    // La 9 puede estar alterada (add b9 / add #9): su semitono sale del plan.
    if (ext9) activeAdds.push({ semi: mod12(planBase.ninthOffset ?? 2), token: planBase.ninth || "9" });
    if (ext11) activeAdds.push({ semi: 5, token: "11" });
    if (ext13) activeAdds.push({ semi: 9, token: "13" });
    if (ext6 && !ext13) activeAdds.push({ semi: 9, token: "6" });

    for (const add of activeAdds) {
      const hasOption = selectorOpts.some((o) => {
        if (o.value === "root" || o.value === "all") return false;
        const optBassInt = chordBassInterval({
          quality, suspension, structure,
          inversion: o.value,
          omit, ext7, ext6, ext9, ext11, ext13, fifth, ninth,
        });
        return mod12(optBassInt) === add.semi;
      });

      if (!hasOption) {
        recordResult({
          ...ctx,
          invOpt: `add${add.token}`, invOptLabel: `Bajo ${add.token}`,
          status: "WARN", category: "MISSING_EXTENSION_BASS_OPTION",
          motivo: `Extensión add${add.token} activa (semi=${add.semi}) pero sin opción de selector para ese bajo`,
        });
      }
    }
  }

  // ── INVARIANT 6: notas insuficientes — insufficientNotes debe estar marcado ─
  if (planBase.omit !== "none" && planBase.intervals.length < 3) {
    if (!planBase.insufficientNotes) {
      recordResult({
        ...ctx,
        invOpt: "-", invOptLabel: "-",
        status: "FAIL", category: "INSUFFICIENT_NOTES_MESSAGE_MISMATCH",
        motivo: `${planBase.intervals.length} nota(s) real(es) tras omit="${planBase.omit}" pero insufficientNotes no está marcado en el plan`,
      });
    }
    // (PASS silencioso cuando insufficientNotes === true)
  }

  // ── INVARIANT 10: calidades que implican 7ª deben tener ext7 activo en el plan ─
  // Dominante ("dom") y semidisminuido ("hdim") tienen la 7ª en su nombre/definición.
  // En estructura "chord" la 7ª no se fuerza automáticamente por estructura,
  // por lo que el useEffect de coherencia UI debe haberla activado.
  const qualityImplies7 = (quality === "dom" || quality === "hdim");
  if (qualityImplies7 && structure === "chord" && !planBase.ext7) {
    recordResult({
      ...ctx,
      invOpt: "-", invOptLabel: "-",
      status: "FAIL", category: "QUALITY_SEVENTH_SYNC_MISMATCH",
      motivo: `quality=${quality} structure=chord pero ext7=false en plan (la 7ª está implícita en el nombre de la calidad)`,
    });
  }
  if (qualityImplies7 && structure === "chord" && planBase.seventhOffset == null) {
    recordResult({
      ...ctx,
      invOpt: "-", invOptLabel: "-",
      status: "FAIL", category: "QUALITY_SEVENTH_SYNC_MISMATCH",
      motivo: `quality=${quality} structure=chord pero seventhOffset=null en plan`,
    });
  }
}

// ── Enumerar combinaciones ────────────────────────────────────────────────────

let totalCombos = 0;
let totalAlteredCombos = 0;
let totalTooManyNotes = 0;

for (const tone of TONES) {
  for (const quality of QUALITIES) {
    const suspensions = SUSPENSIONS_BY_QUALITY[quality];
    for (const suspension of suspensions) {
      for (const structure of ["triad", "tetrad", "chord"]) {
        for (const exts of extCombos(structure)) {
          // Sus2+ext9 y sus4+ext11 son UI-imposibles: el grado ya está incluido en la suspensión.
          if (suspension === "sus2" && exts.ext9) continue;
          if (suspension === "sus4" && exts.ext11) continue;
          // dom+chord+!ext7 y hdim+chord+!ext7 son UI-imposibles: el useEffect fuerza ext7=true.
          if ((quality === "dom" || quality === "hdim") && structure === "chord" && !exts.ext7) continue;
          // Disminuido suspendido con ♭♭7 no se representa: la interfaz no deja llegar (SUSPENSION_ROUND_TRIP).
          if (quality === "dim" && suspension !== "none" && hasSeventhForAudit(structure, exts)) continue;
          for (const omit of OMITS) {
            const fifths = chordFifthSelectorState({ quality, suspension, omit }).allowed;
            const ninths = chordNinthSelectorState({ quality, suspension, structure, ext7: exts.ext7, ext9: exts.ext9 }).allowed;
            for (const fifth of fifths) {
              for (const ninth of ninths) {
                totalCombos++;
                if (isAlteredChordFifth(fifth, quality, suspension) || isAlteredChordNinth(ninth)) totalAlteredCombos++;
                auditCombination({ tone, quality, structure, suspension, exts, omit, fifth, ninth });
              }
            }
          }
        }
      }
    }
  }
}

// ── INVARIANT 9: json DB E9 — voicings con 5ª ausente deben ser filtrados ─────
// Simula el filtro CORREGIDO de la app (required = plan.intervals) y verifica:
//   a) Voicings conocidos como incompletos (x7677x, 0x2132) NO sobreviven → 0 FAIL
//   b) Al menos 1 voicing válido sí sobrevive (la lista no queda vacía) → PASS
// Si el filtro regresa a la lógica anterior, estos FAILs aparecerán de nuevo.
{
  const e9DbPath = join(ROOT, "public/chords-db/E/9.json");
  let e9Db;
  try {
    e9Db = JSON.parse(readFileSync(e9DbPath, "utf-8"));
  } catch {
    e9Db = null;
  }

  if (e9Db?.positions?.length) {
    const e9RootPc = 4; // E
    const e9Plan = buildChordEnginePlan({
      rootPc: e9RootPc,
      quality: "dom",
      suspension: "none",
      structure: "chord",
      inversion: "root",
      form: "closed",
      ext7: true, ext6: false, ext9: true, ext11: false, ext13: false, omit: "none",
    });

    const e9Required = new Set(e9Plan.intervals.map(mod12)); // {0,2,4,7,10}
    const e9Allowed = new Set(e9Plan.intervals.map(mod12));
    const e9ExtraOk = new Set([2, 5, 9, 10, 11]);

    // Simular el filtro corregido de la app
    const survivingFrets = new Set();
    for (const p of e9Db.positions) {
      const fretsLH = parseChordDbFretsString(p?.frets);
      if (!fretsLH) continue;
      const v = buildVoicingFromFretsLH({ fretsLH, rootPc: e9RootPc, maxFret: MAX_FRET_AUDIT });
      if (!v) continue;

      let invalid = false;
      for (const r of v.relIntervals) {
        if (!e9Allowed.has(r) && !e9ExtraOk.has(r)) { invalid = true; break; }
      }
      if (invalid) continue;

      for (const r of e9Required) {
        if (!v.relIntervals.has(r)) { invalid = true; break; }
      }
      if (!invalid) survivingFrets.add(p.frets);
    }

    // a) Voicings incompletos NO deben sobrevivir el filtro corregido
    const knownIncompleteFrets = ["x7677x", "0x2132"];
    for (const frets of knownIncompleteFrets) {
      totalCombos++;
      if (survivingFrets.has(frets)) {
        recordResult({
          tone: "E", quality: "dom", structure: "chord", suspension: "none",
          exts: { ext7: true, ext6: false, ext9: true, ext11: false, ext13: false },
          omit: "none",
          invOpt: "root", invOptLabel: "Fundamental",
          status: "FAIL", category: "FORMULA_VOICING_MISMATCH",
          motivo: `DB E9: voicing "${frets}" sobrevive el filtro corregido pero falta la 5ª (intervalo 7) — regresión en el filtro json`,
          planName: "E9",
        });
      }
      // PASS silencioso si fue correctamente filtrado
    }

    // b) E9 debe seguir teniendo voicings válidos tras el filtro corregido
    totalCombos++;
    if (survivingFrets.size === 0) {
      recordResult({
        tone: "E", quality: "dom", structure: "chord", suspension: "none",
        exts: { ext7: true, ext6: false, ext9: true, ext11: false, ext13: false },
        omit: "none",
        invOpt: "root", invOptLabel: "Fundamental",
        status: "FAIL", category: "EMPTY_VOICINGS_WITH_VALID_FILTER",
        motivo: "DB E9: ningún voicing válido sobrevive el filtro corregido — E9 quedaría sin voicings en la app",
        planName: "E9",
      });
    }
    // PASS silencioso si survivingFrets.size > 0
  }
}

// ── Ordenar resultados ────────────────────────────────────────────────────────

const failures = results.filter((r) => r.status === "FAIL");
const warnings = results.filter((r) => r.status === "WARN");

// Agrupar por categoría
const byCategory = {};
for (const r of [...failures, ...warnings]) {
  const cat = r.category;
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(r);
}

// ── Consola ───────────────────────────────────────────────────────────────────

if (!useJson) {
  console.log(`\n${BOLD}═══════════════ Auditoría Chord UI Matrix ═══════════════${R}`);
  console.log(`${DIM}Combinaciones evaluadas: ${totalCombos} (con quinta o novena alterada: ${totalAlteredCombos})${R}`);
  console.log(`${DIM}Sin posición por >6 notas, con motivo explicado (correcto): ${totalTooManyNotes}${R}`);
  console.log(`${DIM}Calidad sincronizada en el combo, comprobada contra la opción mostrada: ${qualitySyncChecked}${R}`);
  console.log(`${DIM}Opción Aumentada comprobada (conserva la 7ª o queda deshabilitada): ${augmentedChecked}${R}`);
  console.log(`${DIM}Ida y vuelta de sus2/sus4 comprobada (o deshabilitada y explicada): ${suspensionChecked}${R}`);
  console.log(`Casos registrados: ${results.length} (${GREEN}PASS silenciosos${R} + ${AMBER}WARN${R} + ${RED}FAIL${R})\n`);
  console.log(`${GREEN}${BOLD}PASS (sin issue)${R}: total combinaciones evaluadas = ${totalCombos - warnings.length - failures.length}`);
  console.log(`${AMBER}${BOLD}WARN${R}: ${totalWarn}`);
  console.log(`${RED}${BOLD}FAIL${R}: ${totalFail}\n`);

  if (failures.length === 0 && warnings.length === 0) {
    console.log(`${GREEN}${BOLD}✓ Todo correcto. No se encontraron problemas.${R}\n`);
  }

  // Top fallos por categoría
  const cats = Object.keys(byCategory).sort((a, b) => {
    const aFail = byCategory[a].filter((x) => x.status === "FAIL").length;
    const bFail = byCategory[b].filter((x) => x.status === "FAIL").length;
    return bFail - aFail;
  });

  for (const cat of cats) {
    const items = byCategory[cat];
    const fails = items.filter((x) => x.status === "FAIL");
    const warns = items.filter((x) => x.status === "WARN");
    const color = fails.length ? RED : AMBER;
    console.log(`${color}${BOLD}[${cat}]${R} ${fails.length} FAIL / ${warns.length} WARN`);

    const sample = items.slice(0, 5);
    for (const r of sample) {
      const sc = r.status === "FAIL" ? RED : AMBER;
      console.log(`  ${sc}${r.status}${R} ${DIM}${r.id}${R} ${r.planName} | inv=${r.invOpt} | ${r.motivo}`);
    }
    if (items.length > 5) {
      console.log(`  ${DIM}... y ${items.length - 5} más${R}`);
    }
    console.log();
  }
}

// ── Informes ──────────────────────────────────────────────────────────────────

mkdirSync(REPORTS_DIR, { recursive: true });

// JSON
const jsonReport = {
  date: new Date().toISOString(),
  totalCombos,
  totalAlteredCombos,
  totalTooManyNotes,
  totalIssues: results.length,
  totalFail,
  totalWarn,
  byCategory: Object.fromEntries(
    Object.entries(byCategory).map(([k, v]) => [k, {
      fail: v.filter((x) => x.status === "FAIL").length,
      warn: v.filter((x) => x.status === "WARN").length,
    }]),
  ),
  issues: [...failures, ...warnings],
};
writeFileSync(join(REPORTS_DIR, "chord-ui-matrix-audit.json"), JSON.stringify(jsonReport, null, 2));

// Markdown
const mdLines = [
  "# Auditoría Chord UI Matrix",
  "",
  `**Fecha**: ${new Date().toLocaleString("es-ES")}`,
  `**Combinaciones evaluadas**: ${totalCombos} (con quinta o novena alterada: ${totalAlteredCombos})`,
  `**Issues registrados**: ${totalFail} FAIL + ${totalWarn} WARN`,
  "",
  "## Resumen por categoría",
  "",
  "| Categoría | FAIL | WARN |",
  "|-----------|------|------|",
];

for (const cat of Object.keys(byCategory).sort()) {
  const items = byCategory[cat];
  const f = items.filter((x) => x.status === "FAIL").length;
  const w = items.filter((x) => x.status === "WARN").length;
  mdLines.push(`| ${cat} | ${f} | ${w} |`);
}
mdLines.push("");

if (failures.length === 0 && warnings.length === 0) {
  mdLines.push("## ✓ Sin issues detectados");
  mdLines.push("");
} else {
  mdLines.push("## Detalle de issues");
  mdLines.push("");

  for (const cat of Object.keys(byCategory).sort()) {
    const items = byCategory[cat];
    if (!items.length) continue;
    mdLines.push(`### ${cat}`);
    mdLines.push("");
    mdLines.push("| ID | Status | Acorde | Inversión | Motivo |");
    mdLines.push("|----|--------|--------|-----------|--------|");
    for (const r of items.slice(0, 25)) {
      const motivo = r.motivo.replace(/\|/g, "\\|");
      mdLines.push(`| ${r.id} | ${r.status} | ${r.planName} (${r.quality},${r.structure},omit=${r.omit}) | ${r.invOptLabel} | ${motivo} |`);
    }
    if (items.length > 25) {
      mdLines.push(`| ... | | | | ... y ${items.length - 25} más |`);
    }
    mdLines.push("");
  }

  if (failures.length > 0) {
    mdLines.push("## Casos reproducibles (primeros 10 FAILs)");
    mdLines.push("");
    for (const r of failures.slice(0, 10)) {
      mdLines.push(`### ${r.id} — ${r.category}`);
      mdLines.push("");
      mdLines.push(`**Acorde**: ${r.planName}`);
      mdLines.push(`**Parámetros**: quality=${r.quality}, structure=${r.structure}, sus=${r.suspension}, omit=${r.omit}, fifth=${r.fifth}, ninth=${r.ninth}`);
      mdLines.push(`**Extensiones**: ext7=${r.ext7}, ext6=${r.ext6}, ext9=${r.ext9}, ext11=${r.ext11}, ext13=${r.ext13}`);
      mdLines.push(`**Inversión seleccionada**: value=${r.invOpt} / label="${r.invOptLabel}"`);
      mdLines.push(`**Motivo**: ${r.motivo}`);
      mdLines.push(`**Opciones del selector**: ${(r.selectorOpts || []).join(", ")}`);
      mdLines.push("");
      mdLines.push("**Pasos para reproducir en UI**:");
      mdLines.push(`1. Tono: ${r.tone}, Calidad: ${r.quality}, Estructura: ${r.structure}`);
      if (r.suspension !== "none") mdLines.push(`2. Sus: ${r.suspension}`);
      if (r.ext7) mdLines.push("- Marcar extensión 7");
      if (r.ext6) mdLines.push("- Marcar extensión 6");
      if (r.ext9) mdLines.push("- Marcar extensión 9");
      if (r.ext11) mdLines.push("- Marcar extensión 11");
      if (r.ext13) mdLines.push("- Marcar extensión 13");
      if (r.omit !== "none") mdLines.push(`- Marcar omit: ${r.omit}`);
      mdLines.push(`- Seleccionar inversión: "${r.invOptLabel}"`);
      mdLines.push("");
    }
  }
}

writeFileSync(join(REPORTS_DIR, "chord-ui-matrix-audit.md"), mdLines.join("\n"));

if (!useJson) {
  console.log(`${CYAN}Informe guardado en:${R}`);
  console.log(`  ${DIM}${join(REPORTS_DIR, "chord-ui-matrix-audit.json")}${R}`);
  console.log(`  ${DIM}${join(REPORTS_DIR, "chord-ui-matrix-audit.md")}${R}`);
}

if (useJson) {
  console.log(JSON.stringify({ totalCombos, totalAlteredCombos, totalFail, totalWarn }, null, 2));
}

// Exit code
process.exit(totalFail > 0 ? 1 : 0);
