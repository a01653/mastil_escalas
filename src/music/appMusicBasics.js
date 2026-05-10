import * as AppStaticData from "./appStaticData.js";
const {
  NOTES_SHARP,
  NOTES_FLAT,
  SCALE_PRESETS,
  SCALE_NAME_ALIASES,
  SCALE_INTERVAL_LABEL_OVERRIDES,
  TONALITY_CANDIDATE_SCALE_NAMES,
  MANUAL_SCALE_TETRAD_PRESETS,
  MANUAL_SCALE_HARMONY_PRESETS,
  STRINGS,
  OPEN_MIDI,
  LETTERS,
  NATURAL_PC,
  IONIAN_INTERVALS,
} = AppStaticData;

import {
  CHORD_DETECT_FORMULAS as CHORD_DETECT_FORMULAS_PURE,
  detectFormulaRole as detectFormulaRolePure,
} from "./chordDetectionEngine.js";

import * as AppVoicingStudyCore from "./appVoicingStudyCore.js";

export function mod12(n) {
  const x = n % 12;
  return x < 0 ? x + 12 : x;
}

export function pcToName(pc, preferSharps) {
  const list = preferSharps ? NOTES_SHARP : NOTES_FLAT;
  return list[mod12(pc)];
}

export function pcToDualName(pc) {
  const p = mod12(pc);
  const sharp = NOTES_SHARP[p];
  const flat = NOTES_FLAT[p];
  return sharp === flat ? sharp : `${sharp}/${flat}`;
}

// ------------------------
// Acordes UI: selector de Tono por letra + b/# (sin C#/Db en el combo)
// - El combo muestra solo C D E F G A B.
// - Los botones b/# desplazan 1 semitono y fijan la “ortografía” (C# vs Db).
// ------------------------
export const BLACK_PC_TO_LETTER_SHARP = { 1: "C", 3: "D", 6: "F", 8: "G", 10: "A" };
export const BLACK_PC_TO_LETTER_FLAT = { 1: "D", 3: "E", 6: "G", 8: "A", 10: "B" };

export function chordUiLetterFromPc(pc, preferSharps) {
  const p = mod12(pc);
  for (const [l, v] of Object.entries(NATURAL_PC)) {
    if (v === p) return l;
  }
  return preferSharps ? (BLACK_PC_TO_LETTER_SHARP[p] || "C") : (BLACK_PC_TO_LETTER_FLAT[p] || "D");
}

export function pitchAt(sIdx, fret) {
  return OPEN_MIDI[sIdx] + fret;
}

export function noteNameToPc(token) {
  const t = token.trim().toUpperCase();
  if (!t) return null;

  const letter = t[0];
  if (!Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) return null;

  let pc = NATURAL_PC[letter];
  const accidental = t.slice(1);

  if (accidental === "#") pc += 1;
  else if (accidental === "B") pc -= 1;
  else if (accidental === "##") pc += 2;
  else if (accidental === "BB") pc -= 2;
  else if (accidental) return null;

  return mod12(pc);
}

export function degreeTokenToSemitones(token) {
  // grados vs escala mayor: 1=0,2=2,3=4,4=5,5=7,6=9,7=11
  // IMPORTANTE: aquí SOLO aceptamos grados 1–7 (para no confundir con semitonos "10" etc.)
  const t = token.trim();
  if (!t) return null;
  const m = t.match(/^([b#]{0,2})([0-9]+)$/i);
  if (!m) return null;

  const acc = (m[1] || "").toLowerCase();
  const degRaw = parseInt(m[2], 10);
  if (!Number.isFinite(degRaw) || degRaw < 1 || degRaw > 7) return null;

  const deg = degRaw;
  const majorDegreeToSemi = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
  let semi = majorDegreeToSemi[deg];

  for (const ch of acc) {
    if (ch === "b") semi -= 1;
    if (ch === "#") semi += 1;
  }

  return mod12(semi);
}

export function intervalToDegreeToken(semi) {
  // cromático relativo a la raíz
  const map = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"];
  return map[mod12(semi)];
}

export function intervalToSimpleChordDegreeToken(semi) {
  const map = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];
  return map[mod12(semi)];
}

// ============================================================================
// MOTOR DE ACORDES Y NOMENCLATURA
// ============================================================================

// ------------------------
// Acordes
// ------------------------

// --------------------------------------------------------------------------
// BLOQUE: DATASET / JSON DE DIGITACIONES
// --------------------------------------------------------------------------

// Dataset de digitaciones (voicings) para NO inventar acordes:
// https://github.com/szaza/guitar-chords-db-json (MIT)
// En runtime usamos alias de carpeta sin "#" para que preview y producción sirvan bien los JSON.

export function chordSuffixFromUI({ quality, suspension = "none", structure, ext7, ext6, ext9, ext11, ext13 }) {
  const sus = suspension || "none";
  const isSus = sus !== "none";
  const q = quality;
  const isMajLike = q === "maj" || q === "dom";
  const isMin = q === "min";

  // Normaliza combinaciones raras: sus + dim/ø no es habitual.
  const q2 = isSus && (q === "dim" || q === "hdim") ? "maj" : q;

  // TRIADAS
  if (structure === "triad") {
    if (isSus) {
      if (ext7) {
        if (q2 === "dom") return sus === "sus4" ? "7sus4" : "7sus2";
        if (q2 === "maj") return sus === "sus4" ? "maj7sus4" : "maj7sus2";
        return sus === "sus4" ? "m7sus4" : "m7sus2";
      }
      if (ext6) return sus === "sus4" ? "sus4add6" : "sus2add6";
      return sus === "sus4" ? "sus4" : "sus2";
    }

    if (ext6 && !ext7) return isMin ? "m6" : "6";
    if (isMajLike) return "major";
    if (isMin) return "minor";
    return "dim";
  }

  // CUATRIADAS
  if (structure === "tetrad") {
    const addCount = (ext6 ? 1 : 0) + (ext9 ? 1 : 0) + (ext11 ? 1 : 0) + (ext13 ? 1 : 0);

    // add6/add9/add11/add13 (sin 7ª)
    if (!ext7 && addCount === 1) {
      if (ext6) return isMin ? "m6" : "6";
      if (ext13) return isMin ? "m(add13)" : "add13";
      if (ext11) return isMin ? "m(add11)" : "add11";
      if (ext9) return isMin ? "m(add9)" : "add9";
    }

    if (isSus) {
      if (q2 === "dom") return sus === "sus4" ? "7sus4" : "7sus2";
      if (q2 === "maj") return sus === "sus4" ? "maj7sus4" : "maj7sus2";
      return sus === "sus4" ? "m7sus4" : "m7sus2";
    }

    if (q2 === "maj") return "maj7";
    if (q2 === "dom") return "7";
    if (q2 === "min") return "m7";
    if (q2 === "hdim") return "m7b5";
    return "dim7";
  }

  // ACORDES (con extensiones)
  if (q2 === "hdim") return "m7b5";

  if (isSus) {
    if (ext7) {
      if (q2 === "dom") return sus === "sus4" ? "7sus4" : "7sus2";
      if (q2 === "maj") return sus === "sus4" ? "maj7sus4" : "maj7sus2";
      if (q2 === "min") return sus === "sus4" ? "m7sus4" : "m7sus2";
    }
    if (ext6 && !ext7 && !ext9 && !ext11 && !ext13) return isMin ? "m6" : "6";
    return sus === "sus4" ? "sus4" : "sus2";
  }

  // add6 puro (sin 7/9/11/13)
  if (ext6 && !ext7 && !ext9 && !ext11 && !ext13) return isMin ? "m6" : "6";

  if (q2 === "dim") {
    if (ext13 || ext11 || ext9 || ext7) return "dim7";
    return "dim";
  }

  // Dominantes
  if (q2 === "dom") {
    // Sin 7ª, un “dominante” deja de ser dominante: lo nombramos como mayor/add*.
    if (!ext7) {
      if (ext13) return "add13";
      if (ext11) return "add11";
      if (ext9) return "add9";
      if (ext6) return "6";
      return "major";
    }
    if (ext13) return "13";
    if (ext11) return "11";
    if (ext9) return "9";
    return "7";
  }

  // Maj / min
  if (q2 === "maj") {
    if (ext13) return ext7 ? "maj13" : "add13";
    if (ext11) return ext7 ? "maj11" : "add11";
    if (ext9) return ext7 ? "maj9" : "add9";
    if (ext7) return "maj7";
    if (ext6) return "6";
    return "major";
  }

  if (q2 === "min") {
    if (ext13) return ext7 ? "m13" : "m(add13)";
    if (ext11) return ext7 ? "m11" : "m(add11)";
    if (ext9) return ext7 ? "m9" : "m(add9)";
    if (ext7) return "m7";
    if (ext6) return "m6";
    return "minor";
  }

  return "major";
}

// Nombre legible del acorde a partir de la selección actual (sin inventar digitaciones).
export const CHORD_SUFFIX_DISPLAY = {
  major: "",
  minor: "m",
  dim: "dim",
  maj7: "maj7",
  "7": "7",
  m7: "m7",
  m7b5: "m7(b5)",
  dim7: "dim7",

  // 6 / add6 (estándar)
  "6": "6",
  m6: "m6",

  // sus
  sus2: "sus2",
  sus4: "sus4",
  "7sus2": "7sus2",
  "7sus4": "7sus4",
  maj7sus2: "maj7sus2",
  maj7sus4: "maj7sus4",
  m7sus2: "m7sus2",
  m7sus4: "m7sus4",
  sus2add6: "sus2(add6)",
  sus4add6: "sus4(add6)",

  // add*
  add9: "add9",
  add11: "add11",
  add13: "add13",
  "m(add9)": "m(add9)",
  "m(add11)": "m(add11)",
  "m(add13)": "m(add13)",
  sus2add9: "sus2add9",
  sus4add9: "sus4add9",
  sus2add11: "sus2add11",
  sus4add11: "sus4add11",
  sus2add13: "sus2add13",
  sus4add13: "sus4add13",

  maj9: "maj9",
  m9: "m9",
  "9": "9",
  "11": "11",
  "13": "13",
  maj11: "maj11",
  m11: "m11",
  maj13: "maj13",
  m13: "m13",
};

export function chordEffectiveStructureForName(structure, ext7, ext6, suspension) {
  // Si el usuario marca 7 en “Triada”, en la práctica es una cuatriada.
  // Si marca 6 en “Triada”, solo lo tratamos como "6" (cuatriada) cuando NO hay suspensión.
  // Ej: Csus2 + 6 debe mostrarse como Csus2(add6), no como C6.
  const sus = suspension || "none";
  const isSus = sus !== "none";

  if (structure === "triad" && ext7) return "tetrad";
  if (structure === "triad" && ext6 && !isSus) return "tetrad";
  return structure;
}

export function chordDisplayNameFromUI({ rootPc, preferSharps, quality, suspension = "none", structure, ext7, ext6, ext9, ext11, ext13 }) {
  const rootName = pcToName(mod12(rootPc), !!preferSharps);
  const effStructure = chordEffectiveStructureForName(structure, !!ext7, !!ext6, suspension);

  if (AppVoicingStudyCore.isMultiAddChordSelection({ ext7: !!ext7, ext6: !!ext6, ext9: !!ext9, ext11: !!ext11, ext13: !!ext13 })) {
    return `${rootName}${AppVoicingStudyCore.buildMultiAddDisplaySuffix({ quality, suspension, ext6: !!ext6, ext9: !!ext9, ext11: !!ext11, ext13: !!ext13 })}`;
  }

  let suf = chordSuffixFromUI({
    quality,
    suspension,
    structure: effStructure,
    ext7: !!ext7,
    ext6: !!ext6,
    ext9: !!ext9,
    ext11: !!ext11,
    ext13: !!ext13,
  });

  if (effStructure === "triad" && quality === "dom" && !ext7) suf = "major";

  let disp = "";
  if (suf && CHORD_SUFFIX_DISPLAY[suf] != null) disp = CHORD_SUFFIX_DISPLAY[suf];
  else if (typeof suf === "string" && suf.startsWith("m(")) disp = suf;
  else if (typeof suf === "string") disp = suf;

  return `${rootName}${disp}`;
}

export function chordDisplaySuffixOnly({ quality, suspension = "none", structure, ext7, ext6, ext9, ext11, ext13 }) {
  const effStructure = chordEffectiveStructureForName(structure, !!ext7, !!ext6, suspension);

  if (AppVoicingStudyCore.isMultiAddChordSelection({ ext7: !!ext7, ext6: !!ext6, ext9: !!ext9, ext11: !!ext11, ext13: !!ext13 })) {
    return AppVoicingStudyCore.buildMultiAddDisplaySuffix({ quality, suspension, ext6: !!ext6, ext9: !!ext9, ext11: !!ext11, ext13: !!ext13 });
  }

  let suf = chordSuffixFromUI({
    quality,
    suspension,
    structure: effStructure,
    ext7: !!ext7,
    ext6: !!ext6,
    ext9: !!ext9,
    ext11: !!ext11,
    ext13: !!ext13,
  });

  if (effStructure === "triad" && quality === "dom" && !ext7) suf = "major";

  if (suf && CHORD_SUFFIX_DISPLAY[suf] != null) return CHORD_SUFFIX_DISPLAY[suf];
  if (typeof suf === "string") return suf;
  return "";
}

export function detectSupportedTriadQuality(thirdOffset, fifthOffset) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  if (t === 4 && f === 7) return "maj";
  if (t === 3 && f === 7) return "min";
  if (t === 3 && f === 6) return "dim";
  return null;
}

export function detectSupportedTetradQuality(thirdOffset, fifthOffset, seventhOffset) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  const s = mod12(seventhOffset);
  if (t === 4 && f === 7 && s === 11) return "maj";
  if (t === 4 && f === 7 && s === 10) return "dom";
  if (t === 3 && f === 7 && s === 10) return "min";
  if (t === 3 && f === 6 && s === 10) return "hdim";
  if (t === 3 && f === 6 && s === 9) return "dim";
  return null;
}

export function buildScaleDegreeChord({ scaleIntervals, degreeIndex, withSeventh = false }) {
  const n = scaleIntervals.length;
  if (n < (withSeventh ? 4 : 3)) return null;

  const rootOffset = mod12(scaleIntervals[degreeIndex % n]);
  const thirdOffset = mod12(scaleIntervals[(degreeIndex + 2) % n] - rootOffset);
  const fifthOffset = mod12(scaleIntervals[(degreeIndex + 4) % n] - rootOffset);

  if (withSeventh) {
    const seventhOffset = mod12(scaleIntervals[(degreeIndex + 6) % n] - rootOffset);
    const quality = detectSupportedTetradQuality(thirdOffset, fifthOffset, seventhOffset);
    if (!quality) return null;
    return {
      rootOffset,
      quality,
      suspension: "none",
      structure: "tetrad",
      inversion: "all",
      form: "open",
      ext7: true,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
    };
  }

  const quality = detectSupportedTriadQuality(thirdOffset, fifthOffset);
  if (!quality) return null;
  return {
    rootOffset,
    quality,
    suspension: "none",
    structure: "triad",
    inversion: "all",
    form: "open",
    ext7: false,
    ext6: false,
    ext9: false,
    ext11: false,
    ext13: false,
  };
}

export function isMinorHarmonyScaleName(scaleName) {
  const n = normalizeScaleName(scaleName);
  return [
    "Menor natural",
    "Menor armónica",
    "Menor melódica (asc)",
    "Eólica (Aeolian)",
  ].includes(n);
}

export function buildHarmonyDegreeChord({ scaleName, harmonyMode, scaleIntervals, degreeIndex, withSeventh = false }) {
  const built = buildScaleDegreeChord({ scaleIntervals, degreeIndex, withSeventh });
  const normalized = normalizeScaleName(scaleName);

  if (
    harmonyMode === "functional_minor" &&
    isMinorHarmonyScaleName(normalized) &&
    scaleIntervals.length >= 7 &&
    degreeIndex === 4
  ) {
    const rootOffset = mod12(scaleIntervals[degreeIndex % scaleIntervals.length]);
    if (withSeventh) {
      return {
        rootOffset,
        quality: "dom",
        suspension: "none",
        structure: "tetrad",
        inversion: "root",
        form: "closed",
        ext7: true,
        ext6: false,
        ext9: false,
        ext11: false,
        ext13: false,
      };
    }
    return {
      rootOffset,
      quality: "maj",
      suspension: "none",
      structure: "triad",
      inversion: "root",
      form: "open",
      positionForm: "open",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
    };
  }

  return built;
}

export const ROMAN_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

export function romanizeDegreeNumber(n) {
  return ROMAN_DEGREES[n - 1] || String(n);
}

export function romanDegreeFromInterval(interval) {
  const tok = intervalToDegreeToken(interval);
  const accidental = tok.replace(/[0-9]/g, "");
  const num = parseInt(tok.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(num)) return tok;
  return `${accidental}${romanizeDegreeNumber(num)}`;
}

export function tetradSuffixFromOffsets(thirdOffset, fifthOffset, seventhOffset) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  const s = mod12(seventhOffset);
  if (t === 4 && f === 7 && s === 11) return "maj7";
  if (t === 4 && f === 7 && s === 10) return "7";
  if (t === 3 && f === 7 && s === 10) return "m7";
  if (t === 3 && f === 7 && s === 11) return "m(maj7)";
  if (t === 3 && f === 6 && s === 10) return "m7(b5)";
  if (t === 3 && f === 6 && s === 9) return "dim7";
  if (t === 4 && f === 8 && s === 11) return "maj7#5";
  if (t === 4 && f === 8 && s === 10) return "7#5";
  if (t === 4 && f === 6 && s === 10) return "7b5";
  return "?";
}

export function buildManualScaleHarmonySpecs({ rootPc, scaleName, scaleIntervals, spelledScaleNotes, preferSharps }) {
  const normalized = normalizeScaleName(scaleName);
  const preset = MANUAL_SCALE_HARMONY_PRESETS[normalized];
  if (!preset?.length) return null;

  return preset.map((item) => {
    const rootOffset = scaleIntervals[item.scaleIdx];
    const rootNote = spelledScaleNotes[item.scaleIdx] || pcToName(mod12(rootPc + rootOffset), preferSharps);
    const suffix = chordDisplaySuffixOnly({
      quality: item.quality,
      suspension: item.suspension || "none",
      structure: item.structure,
      ext7: !!item.ext7,
      ext6: !!item.ext6,
      ext9: !!item.ext9,
      ext11: !!item.ext11,
      ext13: !!item.ext13,
    });
    const name = `${rootNote}${suffix}`;

    return {
      rootPc: mod12(rootPc + rootOffset),
      quality: item.quality,
      suspension: item.suspension || "none",
      structure: item.structure,
      inversion: "root",
      form: "open",
      positionForm: "open",
      ext7: !!item.ext7,
      ext6: !!item.ext6,
      ext9: !!item.ext9,
      ext11: !!item.ext11,
      ext13: !!item.ext13,
      spellPreferSharps: preferSharps,
      supported: true,
      noteName: rootNote,
      name,
      degreeName: `${item.degreeLabel}${suffix}`,
      scaleIdx: item.scaleIdx,
    };
  });
}

export function buildScaleTetradHarmonization({ rootPc, scaleName, harmonyMode, scaleIntervals, spelledScaleNotes, preferSharps }) {
  const normalized = normalizeScaleName(scaleName);
  const n = scaleIntervals.length;
  if (n < 4) return [];

  const manualHarmony = buildManualScaleHarmonySpecs({ rootPc, scaleName: normalized, scaleIntervals, spelledScaleNotes, preferSharps });
  if (manualHarmony?.length) {
    return manualHarmony.map((item) => ({
      degreeName: item.degreeName,
      noteName: item.name,
    }));
  }

  const manualPreset = MANUAL_SCALE_TETRAD_PRESETS[normalized];
  if (manualPreset && manualPreset.length) {
    return manualPreset.map((item) => {
      const noteRoot = spelledScaleNotes[item.scaleIdx] || pcToName(mod12(rootPc + scaleIntervals[item.scaleIdx]), preferSharps);
      return {
        degreeName: `${item.degreeLabel}${item.suffix}`,
        noteName: `${noteRoot}${item.suffix}`,
      };
    });
  }

  return scaleIntervals.map((rootOffset, i) => {
    const functionalMinorDominant =
      harmonyMode === "functional_minor" &&
      isMinorHarmonyScaleName(normalized) &&
      n >= 7 &&
      i === 4;

    const thirdOffset = mod12(scaleIntervals[(i + 2) % n] - rootOffset);
    const fifthOffset = mod12(scaleIntervals[(i + 4) % n] - rootOffset);
    const seventhOffset = mod12(scaleIntervals[(i + 6) % n] - rootOffset);
    const suffix = functionalMinorDominant ? "7" : tetradSuffixFromOffsets(thirdOffset, fifthOffset, seventhOffset);
    const degreeBase = romanDegreeFromInterval(rootOffset);
    const degreeName = `${degreeBase}${suffix}`;
    const noteRoot = spelledScaleNotes[i] || pcToName(mod12(rootPc + rootOffset), preferSharps);

    return {
      degreeName,
      noteName: `${noteRoot}${suffix}`,
    };
  });
}

export function slotChordTonalitySignature(slot) {
  if (!slot) return null;
  return {
    rootPc: mod12(slot.rootPc),
    suffix: chordDisplaySuffixOnly({
      quality: slot.quality,
      suspension: slot.suspension || "none",
      structure: slot.structure,
      ext7: !!slot.ext7,
      ext6: !!slot.ext6,
      ext9: !!slot.ext9,
      ext11: !!slot.ext11,
      ext13: !!slot.ext13,
    }),
  };
}

export function buildTonalityDegreeCandidate({ tonicPc, scaleName, harmonyMode, degreeIndex, withSeventh }) {
  const scaleIntervals = buildScaleIntervals(scaleName, "", tonicPc);
  const preferSharps = computeAutoPreferSharps({ rootPc: tonicPc, scaleName });
  const built = buildHarmonyDegreeChord({ scaleName, harmonyMode, scaleIntervals, degreeIndex, withSeventh });
  if (!built) return null;

  const rootPc = mod12(tonicPc + built.rootOffset);
  const noteName = pcToName(rootPc, preferSharps);
  const suffix = chordDisplaySuffixOnly({
    quality: built.quality,
    suspension: built.suspension,
    structure: built.structure,
    ext7: built.ext7,
    ext6: built.ext6,
    ext9: built.ext9,
    ext11: built.ext11,
    ext13: built.ext13,
  });

  return {
    rootPc,
    suffix,
    degreeIndex,
    degreeLabel: ROMAN_DEGREES[degreeIndex] || String(degreeIndex + 1),
    noteLabel: `${noteName}${suffix}`,
  };
}

export function formatTonalityLabel(scaleName, tonicPc) {
  const preferSharps = computeAutoPreferSharps({ rootPc: tonicPc, scaleName });
  const tonicName = pcToName(tonicPc, preferSharps);
  if (scaleName === "Mayor") return `${tonicName} mayor`;
  if (scaleName === "Menor natural") return `${tonicName} menor`;
  return `${tonicName} ${scaleName}`;
}

export function analyzeChordSetTonality({ slots, harmonyMode }) {
  const selected = (slots || []).filter((s) => !!s?.enabled);
  if (!selected.length) return { selectedNames: [], labels: [], text: "(ninguna)" };

  if (selected.some((slot) => String(slot?.family || "tertian") !== "tertian")) {
    return {
      selectedNames: [],
      labels: [],
      text: "No disponible con familias cuartales o de notas guía activas",
    };
  }

  const selectedNames = selected.map((slot) => chordDisplayNameFromUI({
    rootPc: slot.rootPc,
    preferSharps: slot.spellPreferSharps ?? preferSharpsFromMajorTonicPc(mod12(slot.rootPc)),
    quality: slot.quality,
    suspension: slot.suspension || "none",
    structure: slot.structure,
    ext7: !!slot.ext7,
    ext6: !!slot.ext6,
    ext9: !!slot.ext9,
    ext11: !!slot.ext11,
    ext13: !!slot.ext13,
  }));

  const results = [];

  for (const scaleName of TONALITY_CANDIDATE_SCALE_NAMES) {
    for (let tonicPc = 0; tonicPc < 12; tonicPc++) {
      let ok = true;

      for (const slot of selected) {
        const target = slotChordTonalitySignature(slot);
        const withSeventh = slot.structure === "tetrad" || !!slot.ext7;
        let found = false;

        for (let degreeIndex = 0; degreeIndex < 7; degreeIndex++) {
          const cand = buildTonalityDegreeCandidate({ tonicPc, scaleName, harmonyMode, degreeIndex, withSeventh });
          if (!cand) continue;
          if (cand.rootPc === target.rootPc && cand.suffix === target.suffix) {
            found = true;
            break;
          }
        }

        if (!found) {
          ok = false;
          break;
        }
      }

      if (ok) results.push(formatTonalityLabel(scaleName, tonicPc));
    }
  }

  const labels = Array.from(new Set(results));
  return {
    selectedNames,
    labels,
    text: labels.length ? labels.join(" · ") : "No clara con los acordes seleccionados",
  };
}

export function spellNoteFromChordInterval(rootPc, interval, preferSharps) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootLetter = rootName[0];
  const rootIdx = Math.max(0, LETTERS.indexOf(rootLetter));
  const deg = chordDegreeNumberFromInterval(interval);
  const letter = LETTERS[(rootIdx + (deg - 1)) % 7];
  const pc = mod12(rootPc + interval);
  return spellPcWithLetter(pc, letter);
}

export function buildDetectedCandidateNoteNameForPc(pc, candidate, preferSharpsFallback) {
  const prefer = candidate?.preferSharps ?? preferSharpsFallback;
  if (!candidate) return pcToName(pc, prefer);
  const interval = mod12(pc - candidate.rootPc);
  const idx = candidate.formula.intervals.findIndex((x) => mod12(x) === interval);
  if (idx >= 0) {
    const spelled = spellChordNotes({ rootPc: candidate.rootPc, chordIntervals: candidate.formula.intervals, preferSharps: prefer });
    return spelled[idx];
  }
  return spellNoteFromChordInterval(candidate.rootPc, interval, prefer);
}

export function buildDetectedCandidateDegreeLabelForPc(pc, candidate) {
  if (!candidate) return null;
  const interval = mod12(pc - candidate.rootPc);
  const idx = candidate.formula.intervals.findIndex((x) => mod12(x) === interval);
  return idx >= 0 ? String(candidate.formula.degreeLabels[idx] || "") : null;
}

export function buildDetectedCandidateLabelForPc(pc, candidate, preferSharpsFallback, showIntervals = true, showNotes = true) {
  const noteName = buildDetectedCandidateNoteNameForPc(pc, candidate, preferSharpsFallback);
  if (!candidate) return noteName;

  const interval = mod12(pc - candidate.rootPc);
  const degree = buildDetectedCandidateDegreeLabelForPc(pc, candidate) || intervalToSimpleChordDegreeToken(interval);

  if (!showIntervals && !showNotes) return degree;
  if (showIntervals && showNotes) return `${degree}-${noteName}`;
  if (showIntervals) return degree;
  return noteName;
}

export function buildDetectedCandidateBackgroundLabelForPc(pc, candidate, preferSharpsFallback, showIntervals = true, showNotes = true) {
  if (!candidate) return pcToName(pc, preferSharpsFallback);

  const prefer = candidate.preferSharps ?? preferSharpsFallback;
  const interval = mod12(pc - candidate.rootPc);
  const degree = buildDetectedCandidateDegreeLabelForPc(pc, candidate) || intervalToSimpleChordDegreeToken(interval);
  const noteName = spellNoteFromChordInterval(candidate.rootPc, interval, prefer);

  if (!showIntervals && !showNotes) return degree;
  if (showIntervals && showNotes) return `${degree}-${noteName}`;
  if (showIntervals) return degree;
  return noteName;
}

export function buildDetectedCandidateRoleForPc(pc, candidate) {
  if (!candidate) return "other";
  const interval = mod12(pc - candidate.rootPc);
  return detectFormulaRolePure(candidate.formula, interval);
}

export function buildManualSelectionVoicing(selectedNotes, rootPc, maxFret) {
  if (!Array.isArray(selectedNotes) || !selectedNotes.length) return null;
  const fretsLH = [null, null, null, null, null, null];
  for (const n of selectedNotes) {
    if (!n) continue;
    fretsLH[5 - n.sIdx] = n.fret;
  }
  return AppVoicingStudyCore.buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
}

export function clampChordMaxDistForReach(reach) {
  const allowed = [4, 5, 6];
  const wanted = Math.max(0, Number(reach) || 0);
  return allowed.find((value) => value >= wanted) ?? allowed[allowed.length - 1];
}

export function buildCloseTetradAbsoluteOrders(thirdOffset, fifthOffset, seventhOffset) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  const s = mod12(seventhOffset);
  return {
    root: [0, t, f, s],
    "1": [t, f, s, 12],
    "2": [f, s, 12, 12 + t],
    "3": [s, 12, 12 + t, 12 + f],
  };
}

export function applyDropToAbsoluteOrder(absOrder, dropKind) {
  const arr = [...absOrder];
  if (dropKind === "drop2") arr[2] -= 12;
  else if (dropKind === "drop3") arr[1] -= 12;
  else if (dropKind === "drop24") {
    arr[2] -= 12;
    arr[0] -= 12;
  }
  return arr.sort((a, b) => a - b);
}

export function dropInversionLabelFromBassInt(bassInt, thirdOffset, fifthOffset, seventhOffset) {
  const b = mod12(bassInt);
  if (b === 0) return "Fundamental";
  if (b === mod12(thirdOffset)) return "1ª inv.";
  if (b === mod12(fifthOffset)) return "2ª inv.";
  if (b === mod12(seventhOffset)) return "3ª inv.";
  return `Inv. ${b}`;
}

export function dropKindFromForm(form) {
  if (String(form).startsWith("drop24")) return "drop24";
  if (String(form).startsWith("drop3")) return "drop3";
  return "drop2";
}

export function getDropAbsoluteOrder({ thirdOffset, fifthOffset, seventhOffset, dropKind, inversion }) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  const s = mod12(seventhOffset);
  const inv = ["root", "1", "2", "3"].includes(inversion) ? inversion : "root";

  // Convenio de esta app: la inversión se nombra por el BAJO REAL del drop resultante.
  // Drop 2:
  // Fundamental = 1-5-7-3
  // 1ª inv.    = 3-7-1-5
  // 2ª inv.    = 5-1-3-7
  // 3ª inv.    = 7-3-5-1
  if (dropKind === "drop2") {
    if (inv === "root") return [0, f, s, 12 + t];
    if (inv === "1") return [t, s, 12, 12 + f];
    if (inv === "2") return [f, 12, 12 + t, 12 + s];
    return [s, 12 + t, 12 + f, 24];
  }

  // Drop 3:
  // Fundamental = 1-7-3-5
  // 1ª inv.    = 3-1-5-7
  // 2ª inv.    = 5-3-7-1
  // 3ª inv.    = 7-5-1-3
  if (dropKind === "drop3") {
    if (inv === "root") return [0, s, 12 + t, 12 + f];
    if (inv === "1") return [t, 12, 12 + f, 12 + s];
    if (inv === "2") return [f, 12 + t, 12 + s, 24];
    return [s, 12 + f, 24, 24 + t];
  }

  // Drop 2+4:
  // Fundamental = 1-5-3-7
  // 1ª inv.    = 3-7-5-1
  // 2ª inv.    = 5-1-7-3
  // 3ª inv.    = 7-3-1-5
  if (dropKind === "drop24") {
    if (inv === "root") return [0, f, 12 + t, 12 + s];
    if (inv === "1") return [t, s, 12 + f, 24];
    if (inv === "2") return [f, 12, 12 + s, 24 + t];
    return [s, 12 + t, 24, 24 + f];
  }

  const closeMap = buildCloseTetradAbsoluteOrders(thirdOffset, fifthOffset, seventhOffset);
  return applyDropToAbsoluteOrder(closeMap[inv], dropKind);
}

export function generateDropTetradVoicings({ rootPc, thirdOffset, fifthOffset, seventhOffset, form, inversion = "root", maxFret, maxSpan = 6 }) {
  const setDefs = DROP_FORM_STRING_SETS[form] || [];
  if (!setDefs.length) return [];

  const dropKind = dropKindFromForm(form);
  const invMap = { root: 0, "1": 1, "2": 2, "3": 3 };
  const wantedInvIdx = invMap[inversion] ?? 0;
  const absOrderBase = getDropAbsoluteOrder({
    thirdOffset,
    fifthOffset,
    seventhOffset,
    dropKind,
    inversion,
  });

  const out = [];
  const seen = new Set();

  for (const set of setDefs) {
    const stringsLowToHigh = [...set].sort((a, b) => b - a);
    const pcsLowToHigh = absOrderBase.map((x) => mod12(rootPc + x));

    const lowerK = Math.max(...stringsLowToHigh.map((sIdx, i) => OPEN_MIDI[sIdx] - absOrderBase[i]));
    const upperK = Math.min(...stringsLowToHigh.map((sIdx, i) => OPEN_MIDI[sIdx] + maxFret - absOrderBase[i]));

    for (let K = lowerK; K <= upperK; K++) {
      const fretsPerLowToHigh = [];
      const pitches = [];
      let ok = true;

      for (let i = 0; i < 4; i++) {
        const targetPitch = K + absOrderBase[i];
        const sIdx = stringsLowToHigh[i];
        const fret = targetPitch - OPEN_MIDI[sIdx];
        if (!Number.isInteger(fret) || fret < 0 || fret > maxFret) {
          ok = false;
          break;
        }
        fretsPerLowToHigh.push({ sIdx, fret, targetPitch, pc: pcsLowToHigh[i] });
        pitches.push(targetPitch);
      }
      if (!ok) continue;

      for (let i = 1; i < pitches.length; i++) {
        if (pitches[i] <= pitches[i - 1]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const span = AppVoicingStudyCore.frettedSpanFromFrets(fretsPerLowToHigh.map((x) => x.fret));
      if (span > maxSpan) continue;

      const fretsLH = [null, null, null, null, null, null];
      for (const n of fretsPerLowToHigh) fretsLH[5 - n.sIdx] = n.fret;

      const v = AppVoicingStudyCore.buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
      if (!v || !AppVoicingStudyCore.isErgonomicVoicing(v, maxSpan)) continue;
      if (v.notes.length !== 4) continue;

      const rel = new Set(v.notes.map((n) => mod12(n.pc - rootPc)));
      if (![0, mod12(thirdOffset), mod12(fifthOffset), mod12(seventhOffset)].every((x) => rel.has(x))) continue;

      const lowToHighActual = [...v.notes]
        .sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret))
        .map((n) => mod12(n.pc - rootPc));

      const expected = absOrderBase.map((x) => mod12(x));
      if (lowToHighActual.join(",") !== expected.join(",")) continue;

      const bassInt = mod12(v.bassPc - rootPc);
      const invLabel = dropInversionLabelFromBassInt(bassInt, thirdOffset, fifthOffset, seventhOffset);
      const key = `${form}|${inversion}|${v.frets}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        ...v,
        span,
        _form: form,
        _dropInvIdx: wantedInvIdx,
        _dropInvLabel: invLabel,
      });
    }
  }

  out.sort((a, b) => (a.minFret - b.minFret) || (a.maxFret - b.maxFret) || (a.span - b.span));
  return out;
}

// --------------------------------------------------------------------------
// BLOQUE: OPCIONES DE UI PARA ACORDES
// --------------------------------------------------------------------------

export const CHORD_QUALITIES = [
  { value: "maj", label: "Mayor" },
  { value: "dom", label: "Dominante (7)" },
  { value: "min", label: "Menor" },
  { value: "dim", label: "Disminuido" },
  { value: "hdim", label: "m7(b5)" },
];

export const CHORD_STRUCTURES = [
  { value: "triad", label: "Triada" },
  { value: "tetrad", label: "Cuatriada" },
  { value: "chord", label: "Acorde" },
];

export const CHORD_FAMILIES = [
  { value: "tertian", label: "Terciaria" },
  { value: "quartal", label: "Cuartal" },
  { value: "guide_tones", label: "Notas guía" },
];

export const CHORD_QUARTAL_TYPES = [
  { value: "pure", label: "Cuartal puro" },
  { value: "mixed", label: "Cuartal mixto" },
];

export const CHORD_QUARTAL_VOICES = [
  { value: "3", label: "3 voces" },
  { value: "4", label: "4 voces" },
  { value: "5", label: "5 voces" },
];

export const CHORD_QUARTAL_SPREADS = [
  { value: "closed", label: "Cerrado" },
  { value: "open", label: "Abierto" },
];

export const CHORD_QUARTAL_REFERENCES = [
  { value: "root", label: "Desde raíz" },
  { value: "scale", label: "Diatónico a escala" },
];

export const CHORD_QUARTAL_SCALE_NAMES = Object.keys(SCALE_PRESETS).filter((name) => name !== "Personalizada");

export const CHORD_GUIDE_TONE_QUALITIES = [
  { value: "maj7", label: "Maj7" },
  { value: "min7", label: "m7" },
  { value: "dom7", label: "7" },
  { value: "maj6", label: "6" },
];

export const CHORD_GUIDE_TONE_FORMS = [
  { value: "closed", label: "Cerrado" },
  { value: "open", label: "Abierto" },
];

export const CHORD_GUIDE_TONE_INVERSIONS = [
  { value: "root", label: "Fundamental" },
  { value: "1", label: "1ª inversión" },
  { value: "all", label: "Todas" },
];

export function guideToneDefinitionFromQuality(quality) {
  switch (quality) {
    case "min7":
      return { quality, intervals: [0, 3, 10], degreeLabels: ["1", "b3", "b7"], suffix: "m7" };
    case "dom7":
      return { quality, intervals: [0, 4, 10], degreeLabels: ["1", "3", "b7"], suffix: "7" };
    case "maj6":
      return { quality, intervals: [0, 4, 9], degreeLabels: ["1", "3", "6"], suffix: "6" };
    case "maj7":
    default:
      return { quality: "maj7", intervals: [0, 4, 11], degreeLabels: ["1", "3", "7"], suffix: "maj7" };
  }
}

export function guideToneBassIntervalsForSelection(definition, inversion) {
  const ints = Array.isArray(definition?.intervals) ? definition.intervals.map(mod12) : [0, 4, 11];
  const normalized = ["root", "1", "all"].includes(inversion) ? inversion : "root";
  const selected = normalized === "all" ? ["root", "1"] : [normalized];
  return Array.from(new Set(selected.map((inv) => {
    if (inv === "1") return ints[1] ?? 0;
    return ints[0] ?? 0;
  }).map(mod12)));
}

export function voicingHasOpenStrings(voicing) {
  return Array.isArray(voicing?.notes) && voicing.notes.some((n) => Number(n?.fret) === 0);
}

export const QUARTAL_OPEN_STRING_PCS = [4, 11, 7, 2, 9, 4];
export const QUARTAL_OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40];
export const QUARTAL_PC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function fnBuildQuartalNoteName(vPc) {
  return QUARTAL_PC_NAMES[mod12(vPc)] || "?";
}

export function fnBuildQuartalDegreeLabel(vDegree) {
  if (typeof vDegree !== "number") return "";
  return `grado ${romanizeDegreeNumber(vDegree + 1)}`;
}

export function fnBuildQuartalVoicingNotes(vStringIndices, vFrets, vMidis, vOrderedPcs) {
  return vStringIndices.map((vStringIdx, vIdx) => {
    const vFret = vFrets[vIdx];
    const vMidi = vMidis[vIdx];
    const vPc = mod12(vOrderedPcs[vIdx]);
    const vName = fnBuildQuartalNoteName(vPc);
    return {
      sIdx: vStringIdx,
      stringIndex: vStringIdx,
      stringIdx: vStringIdx,
      string: vStringIdx + 1,
      fret: vFret,
      midi: vMidi,
      pc: vPc,
      pitchClass: vPc,
      noteName: vName,
      name: vName,
      label: vName,
      isOpen: vFret === 0,
    };
  });
}

export function fnBuildIndexCombinations(vLength, vChoose) {
  const vResult = [];
  function fnWalk(vStart, vAcc) {
    if (vAcc.length === vChoose) {
      vResult.push([...vAcc]);
      return;
    }
    for (let i = vStart; i < vLength; i += 1) {
      vAcc.push(i);
      fnWalk(i + 1, vAcc);
      vAcc.pop();
    }
  }
  fnWalk(0, []);
  return vResult;
}

export function fnBuildQuartalPitchSets({ rootPc, voices, type, reference, scaleName = "Mayor" }) {
  const vVoices = Math.max(3, Math.min(5, parseInt(String(voices), 10) || 4));
  const vMap = new Map();
  const fnPush = (vPcs, vMeta = {}) => {
    const vNorm = vPcs.map((v) => mod12(v));
    const vKey = vNorm.join("-");
    if (!vMap.has(vKey)) vMap.set(vKey, { pcs: vNorm, ...vMeta });
  };

  if (reference === "scale") {
    const vScaleIntervalsRaw = buildScaleIntervals(scaleName, "", rootPc);
    const vScaleIntervals = Array.isArray(vScaleIntervalsRaw) ? vScaleIntervalsRaw.map((v) => mod12(v)) : [];
    const vScale = vScaleIntervals.map((v) => mod12(rootPc + v));
    const vScaleLen = vScale.length;

    if (vScaleLen >= 3) {
      for (let vDegree = 0; vDegree < vScaleLen; vDegree += 1) {
        const vPcs = [];
        for (let i = 0; i < vVoices; i += 1) vPcs.push(vScale[(vDegree + i * 3) % vScaleLen]);
        const vSteps = [];
        for (let i = 0; i < vPcs.length - 1; i += 1) vSteps.push(mod12(vPcs[i + 1] - vPcs[i]));
        const vPure = vSteps.every((v) => v === 5);
        if ((type === "pure" && vPure) || (type === "mixed" && !vPure)) {
          fnPush(vPcs, { degree: vDegree, steps: vSteps, scaleName });
        }
      }
    }
  } else if (type === "pure") {
    fnPush(Array.from({ length: vVoices }, (_, i) => mod12(rootPc + i * 5)), { steps: Array.from({ length: Math.max(0, vVoices - 1) }, () => 5) });
  } else {
    for (let vAlteredIdx = 0; vAlteredIdx < vVoices - 1; vAlteredIdx += 1) {
      const vPcs = [mod12(rootPc)];
      let vCursor = mod12(rootPc);
      const vSteps = [];
      for (let i = 0; i < vVoices - 1; i += 1) {
        const vStep = i === vAlteredIdx ? 6 : 5;
        vSteps.push(vStep);
        vCursor = mod12(vCursor + vStep);
        vPcs.push(vCursor);
      }
      fnPush(vPcs, { alteredIndex: vAlteredIdx, steps: vSteps });
    }
  }

  if (!vMap.size && reference !== "scale") {
    fnPush(Array.from({ length: vVoices }, (_, i) => mod12(rootPc + i * 5)), { fallback: true, steps: Array.from({ length: Math.max(0, vVoices - 1) }, () => 5) });
  }

  return Array.from(vMap.values());
}

export function fnBuildQuartalFretString(vStringIndices, vFrets) {
  const vOut = ["x", "x", "x", "x", "x", "x"];
  vStringIndices.forEach((vStringIdx, vIdx) => {
    vOut[5 - vStringIdx] = String(vFrets[vIdx]);
  });
  return vOut.join("");
}

export function fnGetQuartalSpreadKind(vMidis, vSteps) {
  const vSafeMidis = Array.isArray(vMidis) ? vMidis : [];
  const vSafeSteps = Array.isArray(vSteps) ? vSteps : [];
  if (vSafeMidis.length < 2) return "closed";

  for (let i = 0; i < vSafeMidis.length - 1; i += 1) {
    const vDiff = vSafeMidis[i + 1] - vSafeMidis[i];
    const vExpected = Number(vSafeSteps[i] || 5);
    if (vDiff !== vExpected) return "open";
  }

  return "closed";
}

export function fnGenerateQuartalVoicings({ pitchSets, maxDist, allowOpenStrings, maxFret }) {
  const vCombos = [
    ...fnBuildIndexCombinations(6, 3),
    ...fnBuildIndexCombinations(6, 4),
    ...fnBuildIndexCombinations(6, 5),
  ];
  const vWantedSizes = new Set(pitchSets.map((v) => v.pcs.length));
  const vResults = [];
  const vSeen = new Set();
  const vMaxDist = Math.max(4, Math.min(8, Number(maxDist) || 5));
  const vMinFret = allowOpenStrings ? 0 : 1;
  const vMaxFret = Math.max(4, Math.min(24, Number(maxFret) || 15));

  for (const vPitchSet of pitchSets) {
    const vOrderedPcs = Array.isArray(vPitchSet?.pcs) ? [...vPitchSet.pcs] : [];
    if (!vOrderedPcs.length) continue;

    for (const vCombo of vCombos) {
      if (!vWantedSizes.has(vCombo.length) || vCombo.length !== vOrderedPcs.length) continue;

      const vStrings = [...vCombo].sort((a, b) => b - a);
      const vCandidates = vStrings.map((vStringIdx, vIdx) => {
        const vTargetPc = vOrderedPcs[vIdx];
        const vOpenPc = QUARTAL_OPEN_STRING_PCS[vStringIdx];
        const vOpenMidi = QUARTAL_OPEN_STRING_MIDI[vStringIdx];
        const vList = [];
        for (let vFret = vMinFret; vFret <= vMaxFret; vFret += 1) {
          if (mod12(vOpenPc + vFret) !== vTargetPc) continue;
          vList.push({ fret: vFret, midi: vOpenMidi + vFret });
        }
        return vList;
      });
      if (vCandidates.some((v) => !v.length)) continue;

      const fnWalk = (vIdx, vFrets, vMidis) => {
        if (vIdx === vCandidates.length) {
          const vPositive = vFrets.filter((v) => v > 0);
          const vMin = vPositive.length ? Math.min(...vPositive) : 0;
          const vMax = vPositive.length ? Math.max(...vPositive) : 0;
          const vReach = vPositive.length ? (vMax - vMin + 1) : 1;
          if (vReach > vMaxDist) return;

          const vSpreadKind = fnGetQuartalSpreadKind(vMidis, vPitchSet.steps);
          const vFretsText = fnBuildQuartalFretString(vStrings, vFrets);
          const vKey = `${vFretsText}|${vPitchSet.pcs.join("-")}|${vSpreadKind}`;
          if (vSeen.has(vKey)) return;
          vSeen.add(vKey);

          const vNotes = fnBuildQuartalVoicingNotes(vStrings, vFrets, vMidis, vOrderedPcs);
          const vBass = vNotes.length
            ? [...vNotes].sort((a, b) => a.midi - b.midi)[0]
            : null;

          vResults.push({
            frets: vFretsText,
            span: Math.max(0, vMax - vMin),
            reach: vReach,
            notes: vNotes,
            bassKey: vBass ? `${vBass.sIdx}:${vBass.fret}` : null,
            bassPc: vBass ? vBass.pc : null,
            minFret: vMin,
            maxFret: vMax,
            pitchSpan: vMidis.length ? (Math.max(...vMidis) - Math.min(...vMidis)) : 0,
            quartalPcs: [...vPitchSet.pcs],
            quartalOrderedPcs: [...vOrderedPcs],
            quartalRotation: 0,
            quartalSpreadKind: vSpreadKind,
            quartalSteps: Array.isArray(vPitchSet.steps) ? [...vPitchSet.steps] : [],
            quartalDegree: typeof vPitchSet.degree === "number" ? vPitchSet.degree : null,
            quartalReference: vPitchSet.reference || null,
          });
          return;
        }

        for (const vCandidate of vCandidates[vIdx]) {
          if (vMidis.length && vCandidate.midi <= vMidis[vMidis.length - 1]) continue;
          vFrets.push(vCandidate.fret);
          vMidis.push(vCandidate.midi);
          fnWalk(vIdx + 1, vFrets, vMidis);
          vFrets.pop();
          vMidis.pop();
        }
      };

      fnWalk(0, [], []);
    }
  }

  vResults.sort((a, b) => {
    if ((a.minFret ?? 0) !== (b.minFret ?? 0)) return (a.minFret ?? 0) - (b.minFret ?? 0);
    if ((a.reach ?? 0) !== (b.reach ?? 0)) return (a.reach ?? 0) - (b.reach ?? 0);
    return String(a.frets || "").localeCompare(String(b.frets || ""));
  });

  return vResults;
}

export const CHORD_INVERSIONS = [
  { value: "root", label: "Fundamental" },
  { value: "1", label: "1ª inversión" },
  { value: "2", label: "2ª inversión" },
  { value: "3", label: "3ª inversión" },
  { value: "all", label: "Todas" },
];

export const CHORD_FORMS = [
  { value: "closed", label: "Cerrado" },
  { value: "open", label: "Abierto" },
  { value: "drop2_set1", label: "Drop 2 Set 1" },
  { value: "drop2_set2", label: "Drop 2 Set 2" },
  { value: "drop2_set3", label: "Drop 2 Set 3" },
  { value: "drop3_set1", label: "Drop 3 Set 1" },
  { value: "drop3_set2", label: "Drop 3 Set 2" },
  { value: "drop24_set1", label: "Drop 2+4 Set 1" },
  { value: "drop24_set2", label: "Drop 2+4 Set 2" },
];

export const DROP_FORM_OPTIONS = [
  { value: "none", label: "—" },
  ...CHORD_FORMS.filter((x) => String(x.value || "").startsWith("drop")),
];

export const DROP_FORM_STRING_SETS = {
  drop2_set1: [[0, 1, 2, 3]],
  drop2_set2: [[1, 2, 3, 4]],
  drop2_set3: [[2, 3, 4, 5]],
  drop3_set1: [[0, 1, 2, 4]],
  drop3_set2: [[1, 2, 3, 5]],
  drop24_set1: [[0, 1, 3, 4]],
  drop24_set2: [[1, 2, 4, 5]],
};

export function buildChordIntervals({ quality, suspension, structure, ext7, ext6, ext9, ext11, ext13 }) {
  const sus = suspension || "none";
  const third = sus === "sus2" ? 2 : sus === "sus4" ? 5 : quality === "maj" || quality === "dom" ? 4 : 3;
  const fifth = sus !== "none" ? 7 : quality === "dim" || quality === "hdim" ? 6 : 7;

  const out = [0, third, fifth];

  // CUATRIADA "teórica":
  // - Por defecto incluye 7ª.
  // - Si activas 6/9/11/13 (solo una), se convierte en add6/add9/add11/add13 (sin 7ª).
  if (structure === "tetrad") {
    const addCount = (ext6 ? 1 : 0) + (ext9 ? 1 : 0) + (ext11 ? 1 : 0) + (ext13 ? 1 : 0);
    if (addCount) {
      const addInt = ext13 ? 9 : ext11 ? 5 : ext9 ? 2 : 9; // ext6 por defecto
      out.push(addInt);
      return Array.from(new Set(out.map(mod12))).sort((a, b) => a - b);
    }
  }

  // 7ª
  const wants7 = structure !== "triad";
  if (wants7) {
    let seventh = 10;
    if (quality === "maj") seventh = 11; // maj7
    if (quality === "dim") seventh = 9; // dim7 (bb7)
    if (quality === "hdim") seventh = 10; // ø7

    // en "Acorde" se puede desactivar 7 con el checkbox
    if (!(structure === "chord" && ext7 === false) && !(structure === "tetrad" && ext7 === false)) {
      out.push(seventh);
    }
  } else {
    // triada: si el usuario marca 7, lo añadimos
    if (ext7) {
      let seventh = 10;
      if (quality === "maj") seventh = 11;
      if (quality === "dim") seventh = 9;
      if (quality === "hdim") seventh = 10;
      out.push(seventh);
    }
  }

  // extensiones (en "Acorde" sí pueden coexistir)
  if (structure === "chord") {
    if (ext6) out.push(9);
    if (ext9) out.push(2);
    if (ext11) out.push(5);
    if (ext13) out.push(9);
  }

  // add6 en triada
  if (structure === "triad" && ext6) out.push(9);

  return Array.from(new Set(out.map(mod12))).sort((a, b) => a - b);
}

export function seventhOffsetForQuality(quality) {
  if (quality === "maj") return 11;
  if (quality === "dim") return 9;
  // min/dom/hdim
  return 10;
}

export function chordBassInterval({ quality, suspension, structure, inversion, ext7, ext6, ext9, ext11, ext13 }) {
  const sus = suspension || "none";
  const third = sus === "sus2" ? 2 : sus === "sus4" ? 5 : quality === "maj" || quality === "dom" ? 4 : 3;
  const fifth = sus !== "none" ? 7 : quality === "dim" || quality === "hdim" ? 6 : 7;

  const has7 = !!ext7;
  let degrees = [0, third, fifth];

  if (has7) {
    const seventh = seventhOffsetForQuality(quality);
    degrees = [0, third, fifth, seventh];
  } else if (structure !== "triad") {
    // cuatriada/chord sin 7ª: el 4º grado será add6/add9/add11/add13 (si existe)
    const addInt = ext13 ? 9 : ext11 ? 5 : ext9 ? 2 : ext6 ? 9 : null;
    if (addInt != null) degrees = [0, third, fifth, addInt];
  }

  if (inversion === "1") return degrees[1] ?? 0;
  if (inversion === "2") return degrees[2] ?? 0;
  if (inversion === "3") return degrees[3] ?? degrees[0];
  return degrees[0];
}

export function intervalToChordToken(semi, { ext6, ext9, ext11, ext13 }) {
  const s = mod12(semi);

  // En contexto de acordes preferimos el deletreo funcional del acorde.
  // Ej.: m7(b5) debe mostrar b5, no #4.
  if (s === 6) return "b5";

  const base = intervalToDegreeToken(s);

  // Para acordes mostramos 6/9/11/13 solo en su grado natural.
  if (ext13 && s === 9) return "13";
  if (ext11 && s === 5) return "11";
  if (ext9 && s === 2) return "9";
  if (ext6 && s === 9) return "6";

  return base;
}

export function findChordDetectFormulaByUi({ quality, suspension = "none", structure, ext7, ext6, ext9, ext11, ext13 }) {
  return CHORD_DETECT_FORMULAS_PURE.find((formula) => {
    const ui = formula?.ui;
    if (!ui) return false;
    return ui.quality === quality
      && (ui.suspension || "none") === (suspension || "none")
      && ui.structure === structure
      && !!ui.ext7 === !!ext7
      && !!ui.ext6 === !!ext6
      && !!ui.ext9 === !!ext9
      && !!ui.ext11 === !!ext11
      && !!ui.ext13 === !!ext13;
  }) || null;
}

export function buildChordDegreeLabelsFromUi({ quality, suspension = "none", structure, ext7, ext6, ext9, ext11, ext13, chordIntervals }) {
  const formula = findChordDetectFormulaByUi({ quality, suspension, structure, ext7, ext6, ext9, ext11, ext13 });
  const safeIntervals = Array.isArray(chordIntervals) ? chordIntervals.map(mod12) : [];
  if (!formula?.degreeLabels?.length || !safeIntervals.length) return null;

  const formulaIntervals = (formula.intervals || []).map(mod12);
  const labels = safeIntervals.map((interval) => {
    const idx = formulaIntervals.findIndex((x) => x === mod12(interval));
    return idx >= 0 ? String(formula.degreeLabels[idx] || "") : "";
  });

  return labels.every(Boolean) ? labels : null;
}

export function degreeNumberFromInterval(interval) {
  const tok = intervalToDegreeToken(interval);
  const n = parseInt(tok.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 1;
}

export function spellPcWithLetter(targetPc, letter) {
  const base = NATURAL_PC[letter];
  let diff = ((targetPc - base + 6) % 12) - 6; // -6..5

  // Para nuestras escalas, normalmente cae en -2..2.
  // Si no, se fuerza a la representación más cercana.
  if (diff > 2) diff -= 12;
  if (diff < -2) diff += 12;

  let acc = "";
  if (diff === 1) acc = "#";
  else if (diff === 2) acc = "##";
  else if (diff === -1) acc = "b";
  else if (diff === -2) acc = "bb";
  else if (diff !== 0) acc = diff > 0 ? "#".repeat(diff) : "b".repeat(-diff);

  return `${letter}${acc}`;
}

export function spellScaleNotes({ rootPc, scaleIntervals, preferSharps }) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootLetter = rootName[0];
  const rootIdx = Math.max(0, LETTERS.indexOf(rootLetter));

  return scaleIntervals.map((interval) => {
    const deg = degreeNumberFromInterval(interval);
    const letter = LETTERS[(rootIdx + (deg - 1)) % 7];
    const pc = mod12(rootPc + interval);
    return spellPcWithLetter(pc, letter);
  });
}

export function chordDegreeNumberFromInterval(interval) {
  const s = mod12(interval);
  if (s === 0) return 1;
  if (s === 1 || s === 2) return 2;
  if (s === 3 || s === 4) return 3;
  if (s === 5) return 4;
  if (s === 6 || s === 7) return 5;
  if (s === 8 || s === 9) return 6;
  if (s === 10 || s === 11) return 7;
  return 1;
}

export function spellChordNotes({ rootPc, chordIntervals, preferSharps }) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootLetter = rootName[0];
  const rootIdx = Math.max(0, LETTERS.indexOf(rootLetter));

  return chordIntervals.map((interval) => {
    const deg = chordDegreeNumberFromInterval(interval);
    const letter = LETTERS[(rootIdx + (deg - 1)) % 7];
    const pc = mod12(rootPc + interval);
    return spellPcWithLetter(pc, letter);
  });
}

export function spellFullyDiminishedSeventhNotes({ rootPc, preferSharps }) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootLetter = rootName[0];
  const rootIdx = Math.max(0, LETTERS.indexOf(rootLetter));
  const intervals = [0, 3, 6, 9];
  const degreeOffsets = [0, 2, 4, 6]; // 1, b3, b5, bb7

  return intervals.map((interval, idx) => {
    const letter = LETTERS[(rootIdx + degreeOffsets[idx]) % 7];
    const pc = mod12(rootPc + interval);
    return spellPcWithLetter(pc, letter);
  });
}

export function parseTokensToIntervals({ input, rootPc }) {
  const clean = String(input || "").replace(/,/g, " ").trim();
  const raw = clean ? clean.split(/ +/).map((x) => x.trim()).filter(Boolean) : [];

  const intervals = [];
  for (const tok of raw) {
    // Semitonos explícitos: s0..s11 (ej: s3)
    const sm = tok.match(/^s(-?[0-9]+)$/i);
    if (sm) {
      intervals.push(mod12(parseInt(sm[1], 10)));
      continue;
    }

    // Grados (1..7, con b/#): 1, b3, #4...
    const degSemi = degreeTokenToSemitones(tok);
    if (degSemi !== null) {
      intervals.push(degSemi);
      continue;
    }

    // Semitonos puros (0..11). Ojo: 1..7 se tratan como grados arriba.
    if (/^-?[0-9]+$/.test(tok)) {
      const n = parseInt(tok, 10);
      if (Number.isFinite(n)) intervals.push(mod12(n));
      continue;
    }

    // Notas (F, Ab, C#...)
    const pc = noteNameToPc(tok);
    if (pc !== null) {
      intervals.push(mod12(pc - rootPc));
      continue;
    }
  }

  // La raíz siempre está
  intervals.push(0);
  return Array.from(new Set(intervals.map(mod12))).sort((a, b) => a - b);
}

export function normalizeScaleName(name) {
  return SCALE_NAME_ALIASES[name] || name;
}

export function buildScaleIntervalLabels(scaleName, scaleIntervals) {
  const normalized = normalizeScaleName(scaleName || "");
  const override = SCALE_INTERVAL_LABEL_OVERRIDES[normalized];
  if (Array.isArray(override) && override.length === (scaleIntervals || []).length) return [...override];
  return (scaleIntervals || []).map((i) => intervalToDegreeToken(i));
}

export function scaleOptionLabel(name) {
  const ints = SCALE_PRESETS[name];
  if (!Array.isArray(ints)) return name;
  return `${name} (${buildScaleIntervalLabels(name, ints).join(" ")})`;
}

export function buildScaleIntervals(scaleName, customInput, rootPc) {
  const preset = SCALE_PRESETS[normalizeScaleName(scaleName)];
  if (preset) return preset;
  return parseTokensToIntervals({ input: customInput, rootPc });
}

export function pickThirdOffsets(intervals) {
  const set = new Set(intervals.map(mod12));
  const thirds = [];
  if (set.has(3)) thirds.push(3);
  if (set.has(4)) thirds.push(4);
  return thirds;
}

export function hexToRgb(hex) {
  const h = (hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

export function rgba(hex, a) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

export const FRET_CELL_BG = "rgba(248, 250, 252, 0.72)";
export const FRET_INLAY_BG = "var(--fret-inlay-bg, #9fc0d4)";

export function isDark(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const y = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return y < 0.55;
}

export function parsePosCode(code) {
  // <cuerda><traste> ej: 11 => cuerda 1 traste 1; 610 => cuerda 6 traste 10
  const s = String(code || "").trim();
  const m = s.match(/^([1-6])([0-9]{1,2})$/);
  if (!m) return null;
  const stringNumber = parseInt(m[1], 10);
  const fret = parseInt(m[2], 10);
  if (!Number.isFinite(fret) || fret < 0 || fret > 24) return null;
  return { stringNumber, sIdx: stringNumber - 1, fret };
}

export function sanitizePosCodeInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 3);
}

export function positionsForPitch(pitch, maxFret) {
  const out = [];
  for (let sIdx = 0; sIdx < 6; sIdx++) {
    const fret = pitch - OPEN_MIDI[sIdx];
    if (Number.isInteger(fret) && fret >= 0 && fret <= maxFret) {
      out.push({ sIdx, fret, pc: mod12(STRINGS[sIdx].pc + fret) });
    }
  }
  return out;
}

export function findRootFretsOnLowE(rootPc, maxFret) {
  const lowE = STRINGS[5].pc;
  const out = [];
  for (let fret = 0; fret <= maxFret; fret++) {
    if (mod12(lowE + fret) === mod12(rootPc)) out.push(fret);
  }
  return out;
}

export function buildMembershipMap(patterns) {
  const map = new Map();
  for (const p of patterns) {
    for (const key of p.cells) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p.idx);
    }
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => a - b);
    map.set(k, arr);
  }
  return map;
}

// --------------------------------------------------------------------------
// BLOQUE: ARMADURA / AUTO-NOTACIÓN (# / b)
// --------------------------------------------------------------------------

// ------------------------
// Auto armadura (#/b)
// ------------------------
export function getParentMajorTonicPc({ rootPc, scaleName }) {
  // Modos: tonic del mayor (jónico) que comparte armadura.
  // Dórica = 2º grado, etc.
  const modeDegreeByName = {
    "Jónica (Ionian)": 1,
    "Dórica (Dorian)": 2,
    "Frigia (Phrygian)": 3,
    "Lidia (Lydian)": 4,
    "Mixolidia (Mixolydian)": 5,
    "Eólica (Aeolian)": 6,
    "Locria (Locrian)": 7,
  };

  if (scaleName === "Mayor") return rootPc;
  if (scaleName === "Pentatónica mayor") return rootPc;

  // Menores: armadura de la relativa mayor
  if (scaleName === "Menor natural" || scaleName === "Pentatónica menor") {
    return mod12(rootPc + 3);
  }

  if (modeDegreeByName[scaleName]) {
    const deg = modeDegreeByName[scaleName];
    return mod12(rootPc - IONIAN_INTERVALS[deg - 1]);
  }

  // Personalizada: no sabemos
  return rootPc;
}

export function preferSharpsFromMajorTonicPc(tonicPc) {
  // Heurística "armadura típica" (mayor).
  // Flats: F, Bb, Eb, Ab, Db
  // Sharps: G, D, A, E, B
  // Ambiguos (F#/Gb, C#/Db) se deciden por convención simple.
  const flats = new Set([5, 10, 3, 8, 1]);
  const sharps = new Set([7, 2, 9, 4, 11]);
  if (flats.has(tonicPc)) return false;
  if (sharps.has(tonicPc)) return true;
  if (tonicPc === 6) return true; // F# vs Gb (tie)
  return true; // C o por defecto
}

export function computeAutoPreferSharps({ rootPc, scaleName }) {
  const parent = getParentMajorTonicPc({ rootPc, scaleName });
  return preferSharpsFromMajorTonicPc(parent);
}

export const MAJOR_KEY_SIGNATURES = {
  0: { type: null, count: 0 },
  7: { type: "sharp", count: 1 },
  2: { type: "sharp", count: 2 },
  9: { type: "sharp", count: 3 },
  4: { type: "sharp", count: 4 },
  11: { type: "sharp", count: 5 },
  6: { type: "sharp", count: 6 },
  1: { type: "flat", count: 5 },
  5: { type: "flat", count: 1 },
  10: { type: "flat", count: 2 },
  3: { type: "flat", count: 3 },
  8: { type: "flat", count: 4 },
};

export const SCALE_NAMES_WITH_KEY_SIGNATURE = new Set([
  "Mayor",
  "Menor natural",
  "Menor armónica",
  "Menor melódica (asc)",
  "Pentatónica mayor",
  "Pentatónica menor",
  "Pentatónica mayor + blue note",
  "Pentatónica menor + blue note",
  "Jónica (Ionian)",
  "Dórica (Dorian)",
  "Frigia (Phrygian)",
  "Lidia (Lydian)",
  "Mixolidia (Mixolydian)",
  "Eólica (Aeolian)",
  "Locria (Locrian)",
]);

export function keySignatureParentMajorTonicPc({ rootPc, scaleName }) {
  const normalized = normalizeScaleName(scaleName);
  if (!SCALE_NAMES_WITH_KEY_SIGNATURE.has(normalized)) return null;
  if (normalized === "Menor armónica" || normalized === "Menor melódica (asc)") return mod12(rootPc + 3);
  if (normalized === "Pentatónica mayor + blue note") return rootPc;
  if (normalized === "Pentatónica menor + blue note") return mod12(rootPc + 3);
  return getParentMajorTonicPc({ rootPc, scaleName: normalized });
}

export function resolveKeySignatureForScale({ rootPc, scaleName }) {
  const parentMajorPc = keySignatureParentMajorTonicPc({ rootPc, scaleName });
  if (parentMajorPc == null) return null;
  const spec = MAJOR_KEY_SIGNATURES[parentMajorPc];
  if (!spec || !spec.count) return { type: null, count: 0, tonicPc: parentMajorPc };
  return { ...spec, tonicPc: parentMajorPc };
}
