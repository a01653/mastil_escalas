export const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function mod12(n) {
  const x = n % 12;
  return x < 0 ? x + 12 : x;
}

export function pcToName(pc, preferSharps = true) {
  return (preferSharps ? NOTES_SHARP : NOTES_FLAT)[mod12(pc)];
}

export function noteNameToPc(token) {
  const t = String(token || "").trim().toUpperCase();
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

export function intervalToDegreeToken(semi) {
  return ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"][mod12(semi)];
}

export function intervalToSimpleChordDegreeToken(semi) {
  return ["1", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"][mod12(semi)];
}

export function intervalToChordToken(semi, { ext6 = false, ext9 = false, ext11 = false, ext13 = false } = {}) {
  const s = mod12(semi);
  if (s === 6) return "b5";
  const base = intervalToDegreeToken(s);
  if (ext13 && s === 9) return "13";
  if (ext11 && s === 5) return "11";
  if (ext9 && s === 2) return "9";
  if (ext6 && s === 9) return "6";
  return base;
}

function degreeNumberFromLabel(label) {
  const s = String(label || "").replace(/^b+|^#+/, "");
  const num = parseInt(s, 10);
  if (!Number.isFinite(num)) return null;
  if (num === 9) return 2;
  if (num === 11) return 4;
  if (num === 13) return 6;
  if (num >= 1 && num <= 7) return num;
  return null;
}

function chordDegreeNumberFromInterval(interval) {
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

function spellPcWithLetter(targetPc, letter) {
  const base = NATURAL_PC[letter];
  let diff = ((targetPc - base + 6) % 12) - 6;
  if (diff > 2) diff -= 12;
  if (diff < -2) diff += 12;

  let accidental = "";
  if (diff === 1) accidental = "#";
  else if (diff === 2) accidental = "##";
  else if (diff === -1) accidental = "b";
  else if (diff === -2) accidental = "bb";
  else if (diff !== 0) accidental = diff > 0 ? "#".repeat(diff) : "b".repeat(-diff);

  return `${letter}${accidental}`;
}

export function spellChordNotes({ rootPc, chordIntervals, preferSharps = true, degreeLabels = null }) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootIdx = Math.max(0, LETTERS.indexOf(rootName[0]));
  return (Array.isArray(chordIntervals) ? chordIntervals : []).map((interval, i) => {
    const label = Array.isArray(degreeLabels) ? degreeLabels[i] : null;
    const fromLabel = label != null ? degreeNumberFromLabel(label) : null;
    const degree = fromLabel != null ? fromLabel : chordDegreeNumberFromInterval(interval);
    const letter = LETTERS[(rootIdx + (degree - 1)) % 7];
    return spellPcWithLetter(mod12(rootPc + interval), letter);
  });
}

export function spellNoteFromChordInterval(rootPc, interval, preferSharps = true) {
  return spellChordNotes({ rootPc, chordIntervals: [interval], preferSharps })[0];
}

export function preferSharpsFromMajorTonicPc(tonicPc) {
  const flats = new Set([5, 10, 3, 8, 1]);
  const sharps = new Set([7, 2, 9, 4, 11]);
  if (flats.has(tonicPc)) return false;
  if (sharps.has(tonicPc)) return true;
  if (tonicPc === 6) return true;
  return true;
}

export const CHORD_DETECT_FORMULAS = [
  { id: "5", intervals: [0, 7], degreeLabels: ["1", "5"], suffix: "5", ui: null, manualOnly: true, allowDyad: true },
  { id: "sus2no5", intervals: [0, 2], degreeLabels: ["1", "2"], suffix: "sus2(no5)", ui: null, manualOnly: true, allowDyad: true },
  { id: "sus4no5", intervals: [0, 5], degreeLabels: ["1", "4"], suffix: "sus4(no5)", ui: null, manualOnly: true, allowDyad: true },
  { id: "majno5", intervals: [0, 4], degreeLabels: ["1", "3"], suffix: "(no5)", ui: null, manualOnly: true, allowDyad: true },
  { id: "minno5", intervals: [0, 3], degreeLabels: ["1", "b3"], suffix: "m(no5)", ui: null, manualOnly: true, allowDyad: true },
  { id: "dom7no3no5", intervals: [0, 10], degreeLabels: ["1", "b7"], suffix: "7(no3,no5)", ui: null, manualOnly: true, allowDyad: true },
  { id: "maj7no3no5", intervals: [0, 11], degreeLabels: ["1", "7"], suffix: "maj7(no3,no5)", ui: null, manualOnly: true, allowDyad: true },
  { id: "flat5no3", intervals: [0, 6], degreeLabels: ["1", "b5"], suffix: "(b5,no3)", ui: null, manualOnly: true, allowDyad: true },
  { id: "maj", intervals: [0, 4, 7], degreeLabels: ["1", "3", "5"], suffix: "", ui: { quality: "maj", suspension: "none", structure: "triad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "min", intervals: [0, 3, 7], degreeLabels: ["1", "b3", "5"], suffix: "m", ui: { quality: "min", suspension: "none", structure: "triad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "dim", intervals: [0, 3, 6], degreeLabels: ["1", "b3", "b5"], suffix: "dim", ui: { quality: "dim", suspension: "none", structure: "triad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "sus2", intervals: [0, 2, 7], degreeLabels: ["1", "2", "5"], suffix: "sus2", ui: { quality: "maj", suspension: "sus2", structure: "triad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "sus4", intervals: [0, 5, 7], degreeLabels: ["1", "4", "5"], suffix: "sus4", ui: { quality: "maj", suspension: "sus4", structure: "triad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "dom7sus4", intervals: [0, 5, 7, 10], degreeLabels: ["1", "4", "5", "b7"], suffix: "7sus4", ui: { quality: "dom", suspension: "sus4", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "dom7sus2", intervals: [0, 2, 7, 10], degreeLabels: ["1", "2", "5", "b7"], suffix: "7sus2", ui: { quality: "dom", suspension: "sus2", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "6", intervals: [0, 4, 7, 9], degreeLabels: ["1", "3", "5", "6"], suffix: "6", ui: { quality: "maj", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: true, ext9: false, ext11: false, ext13: false } },
  { id: "m6", intervals: [0, 3, 7, 9], degreeLabels: ["1", "b3", "5", "6"], suffix: "m6", ui: { quality: "min", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: true, ext9: false, ext11: false, ext13: false } },
  { id: "add9", intervals: [0, 2, 4, 7], degreeLabels: ["1", "9", "3", "5"], suffix: "add9", ui: { quality: "maj", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "madd9", intervals: [0, 2, 3, 7], degreeLabels: ["1", "9", "b3", "5"], suffix: "m(add9)", ui: { quality: "min", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "sus2add13no5", intervals: [0, 2, 9], degreeLabels: ["1", "2", "13"], suffix: "sus2add13(no5)", ui: null, manualOnly: true },
  { id: "add11", intervals: [0, 4, 5, 7], degreeLabels: ["1", "3", "11", "5"], suffix: "add11", ui: { quality: "maj", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: true, ext13: false } },
  { id: "madd11", intervals: [0, 3, 5, 7], degreeLabels: ["1", "b3", "11", "5"], suffix: "m(add11)", ui: { quality: "min", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: true, ext13: false } },
  { id: "maj7add11", intervals: [0, 4, 5, 7, 11], degreeLabels: ["1", "3", "11", "5", "7"], suffix: "maj7(add11)", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: true, ext13: false } },
  { id: "maj7sus4add9sharp11", intervals: [0, 2, 6, 7, 11], degreeLabels: ["1", "9", "#11", "4", "7"], suffix: "maj7sus4(add9,#11)", ui: null },
  { id: "m6add11", intervals: [0, 3, 5, 7, 9], degreeLabels: ["1", "b3", "11", "5", "6"], suffix: "m6(add11)", ui: { quality: "min", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: true, ext9: false, ext11: true, ext13: false } },
  { id: "m7no5", intervals: [0, 3, 10], degreeLabels: ["1", "b3", "b7"], suffix: "m7(no5)", ui: null, manualOnly: true },
  { id: "dom7no5", intervals: [0, 4, 10], degreeLabels: ["1", "3", "b7"], suffix: "7(no5)", ui: null, manualOnly: true },
  { id: "dom7add11add13no5", intervals: [0, 4, 5, 9, 10], degreeLabels: ["1", "3", "11", "13", "b7"], suffix: "7(add11,13,no5)", ui: null },
  { id: "m7b5add11omit3", intervals: [0, 5, 6, 10], degreeLabels: ["1", "11", "b5", "b7"], suffix: "m7(b5,add11,no3)", ui: null, manualOnly: true },
  { id: "maddb13", intervals: [0, 3, 7, 8], degreeLabels: ["1", "b3", "5", "b13"], suffix: "m(addb13)", ui: null },
  { id: "maj9", intervals: [0, 2, 4, 7, 11], degreeLabels: ["1", "9", "3", "5", "7"], suffix: "maj9", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "maj7add13", intervals: [0, 4, 7, 9, 11], degreeLabels: ["1", "3", "5", "13", "7"], suffix: "maj7(add13)", ui: null },
  { id: "maj7add13omit5", intervals: [0, 4, 9, 11], degreeLabels: ["1", "3", "13", "7"], suffix: "maj7(add13)", ui: null, manualOnly: true },
  { id: "maj13", intervals: [0, 2, 4, 7, 9, 11], degreeLabels: ["1", "9", "3", "5", "13", "7"], suffix: "maj13", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: true } },
  { id: "maj13omit5", intervals: [0, 2, 4, 9, 11], degreeLabels: ["1", "9", "3", "13", "7"], suffix: "maj13", ui: null, manualOnly: true },
  { id: "9", intervals: [0, 2, 4, 7, 10], degreeLabels: ["1", "9", "3", "5", "b7"], suffix: "9", ui: { quality: "dom", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "7sharp9", intervals: [0, 3, 4, 7, 10], degreeLabels: ["1", "#9", "3", "5", "b7"], suffix: "7(#9)", ui: null, manualOnly: true },
  { id: "m9", intervals: [0, 2, 3, 7, 10], degreeLabels: ["1", "9", "b3", "5", "b7"], suffix: "m9", ui: { quality: "min", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "m7flat13", intervals: [0, 3, 7, 8, 10], degreeLabels: ["1", "b3", "5", "b13", "b7"], suffix: "m7(b13)", ui: null, manualOnly: true },
  { id: "m7no5addb13", intervals: [0, 3, 8, 10], degreeLabels: ["1", "b3", "b13", "b7"], suffix: "m7(b13,no5)", ui: null, manualOnly: true },
  { id: "m11flat13", intervals: [0, 3, 5, 7, 8, 10], degreeLabels: ["1", "b3", "11", "5", "b13", "b7"], suffix: "m11(b13)", ui: null },
  { id: "m11flat13omit3", intervals: [0, 5, 7, 8, 10], degreeLabels: ["1", "11", "5", "b13", "b7"], suffix: "m11(b13)", ui: null, manualOnly: true },
  { id: "maj7", intervals: [0, 4, 7, 11], degreeLabels: ["1", "3", "5", "7"], suffix: "maj7", ui: { quality: "maj", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "7", intervals: [0, 4, 7, 10], degreeLabels: ["1", "3", "5", "b7"], suffix: "7", ui: { quality: "dom", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "m7", intervals: [0, 3, 7, 10], degreeLabels: ["1", "b3", "5", "b7"], suffix: "m7", ui: { quality: "min", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "mmaj7", intervals: [0, 3, 7, 11], degreeLabels: ["1", "b3", "5", "7"], suffix: "m(maj7)", ui: null },
  { id: "mmaj7add13", intervals: [0, 3, 7, 9, 11], degreeLabels: ["1", "b3", "5", "13", "7"], suffix: "m(maj7,13)", ui: null },
  { id: "m7b5", intervals: [0, 3, 6, 10], degreeLabels: ["1", "b3", "b5", "b7"], suffix: "m7(b5)", ui: { quality: "hdim", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "dim7", intervals: [0, 3, 6, 9], degreeLabels: ["1", "b3", "b5", "bb7"], suffix: "dim7", ui: { quality: "dim", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "maj7sharp5", intervals: [0, 4, 8, 11], degreeLabels: ["1", "3", "#5", "7"], suffix: "maj7#5", ui: null },
  { id: "7sharp5", intervals: [0, 4, 8, 10], degreeLabels: ["1", "3", "#5", "b7"], suffix: "7#5", ui: null },
  { id: "7flat5", intervals: [0, 4, 6, 10], degreeLabels: ["1", "3", "b5", "b7"], suffix: "7b5", ui: null },
  { id: "7sharp9no5", intervals: [0, 3, 4, 10], degreeLabels: ["1", "#9", "3", "b7"], suffix: "7(#9)", ui: null },
  { id: "dom13sharp11", intervals: [0, 2, 4, 6, 9, 10], degreeLabels: ["1", "9", "3", "#11", "13", "b7"], suffix: "13(#11,9)", ui: null },
  { id: "mmaj9", intervals: [0, 2, 3, 7, 11], degreeLabels: ["1", "9", "b3", "5", "7"], suffix: "m(maj9)", ui: null },
];

function appendMissingDegreesToSuffix(baseSuffix, missingDegrees) {
  if (!missingDegrees?.length) return baseSuffix;
  const miss = missingDegrees.map((label) => `no${label}`).join(",");
  if (!baseSuffix) return `(${miss})`;
  if (baseSuffix.endsWith(")")) return `${baseSuffix.slice(0, -1)},${miss})`;
  return `${baseSuffix}(${miss})`;
}

export function detectFormulaRole(formula, interval) {
  const idx = formula?.intervals?.findIndex((value) => mod12(value) === mod12(interval));
  const label = idx >= 0 ? String(formula.degreeLabels[idx] || "") : "";
  if (mod12(interval) === 0) return "root";
  if (label === "b2" || label === "#2" || label === "2") return "ninth";
  if (label === "b6" || label === "#6" || label === "6") return "sixth";
  if (label.includes("13")) return "thirteenth";
  if (label === "4" || label === "b4" || label === "#4" || label.includes("11")) return "eleventh";
  if (label.includes("9")) return "ninth";
  if (label.includes("7")) return "seventh";
  if (label.includes("5")) return "fifth";
  if (label.includes("3")) return "third";
  return "other";
}

function detectedRoleOrder(role) {
  switch (role) {
    case "root": return 0;
    case "third": return 1;
    case "fifth": return 2;
    case "sixth": return 3;
    case "seventh": return 4;
    case "ninth": return 5;
    case "eleventh": return 6;
    case "thirteenth": return 7;
    default: return 8;
  }
}

function detectedCandidateBadgeNeedsChromaticOrderLabel(label) {
  const s = String(label || "").toLowerCase();
  return s === "b2" || s === "2" || s === "#2" || s === "b4" || s === "#4" || s === "b6" || s === "#6" || s === "bb7";
}

function detectedDisplaySortMode(formula, labels) {
  if (formula?.quartal) return "source";
  return (Array.isArray(labels) ? labels : []).some(detectedCandidateBadgeNeedsChromaticOrderLabel) ? "chromatic" : "functional";
}

function sortDetectedDisplayEntries(entries, sortMode) {
  return [...entries].sort((a, b) => {
    if (sortMode === "source") return a.idx - b.idx;
    if (sortMode === "chromatic") {
      if (a.intv !== b.intv) return a.intv - b.intv;
      return a.idx - b.idx;
    }
    if (a.order !== b.order) return a.order - b.order;
    if (a.intv !== b.intv) return a.intv - b.intv;
    return a.idx - b.idx;
  });
}

function buildDetectedVisibleFormulaItems({ formula, noteNames, coreSelected }) {
  const selectedSet = new Set((coreSelected || []).map(mod12));
  const items = (formula?.intervals || [])
    .map((intv, idx) => {
      const interval = mod12(intv);
      if (!selectedSet.has(interval)) return null;
      return {
        intv: interval,
        idx,
        label: String(formula?.degreeLabels?.[idx] || ""),
        note: noteNames?.[idx] || "",
        order: detectedRoleOrder(detectFormulaRole(formula, interval)),
      };
    })
    .filter(Boolean);
  return sortDetectedDisplayEntries(items, detectedDisplaySortMode(formula, items.map((item) => item.label)));
}

function isExtensionLikeDegreeLabel(label) {
  const s = String(label || "").toLowerCase();
  return s.includes("6") || s.includes("7") || s.includes("9") || s.includes("11") || s.includes("13");
}

function isOptionalSlashTensionInterval(interval) {
  const intv = mod12(interval);
  return intv === 1 || intv === 2 || intv === 5 || intv === 6 || intv === 8 || intv === 9;
}

function isThirdDegreeLabel(label) {
  const s = String(label || "").toLowerCase();
  return s === "3" || s === "b3" || s === "#3";
}

function isFifthDegreeLabel(label) {
  return String(label || "").toLowerCase().includes("5");
}

function isSeventhDegreeLabel(label) {
  return String(label || "").toLowerCase().includes("7");
}

function isSixthDegreeLabel(label) {
  const s = String(label || "").toLowerCase();
  return s === "6" || s.includes("13");
}

function suffixSemanticallyContainsDegree(suffix, label) {
  const s = String(suffix || "").toLowerCase();
  const l = String(label || "").toLowerCase();
  return !!s && !!l && s.includes(l);
}

function candidateVisibleDegreeLabels(candidate) {
  if (!candidate?.formula?.intervals?.length) return [];
  return candidate.formula.intervals
    .map((intv, idx) => candidate.visibleIntervals.includes(mod12(intv)) ? String(candidate.formula.degreeLabels[idx] || "") : null)
    .filter(Boolean);
}

function candidateHasCompleteTriad(candidate) {
  const labels = candidateVisibleDegreeLabels(candidate);
  return candidate.visibleIntervals.includes(0)
    && labels.some(isThirdDegreeLabel)
    && labels.some(isFifthDegreeLabel);
}

function candidateIsMissingThirdSeventhLike(candidate) {
  if (!(candidate?.missingLabels || []).some(isThirdDegreeLabel)) return false;
  return candidateVisibleDegreeLabels(candidate).some((label) => isSeventhDegreeLabel(label) || isSixthDegreeLabel(label));
}

function allowMissingThirdCandidate(candidate) {
  if (!candidate || candidate.missingLabels.length !== 1) return false;
  if (!isThirdDegreeLabel(candidate.missingLabels[0])) return false;
  if (candidate.externalBassInterval != null) return false;
  // If quality encodes the third in the chord name (m, dim, hdim), missing it produces
  // a contradictory label like "Gm6(nob3)" — block the candidate entirely
  const formulaQuality = String(candidate.formula?.ui?.quality || "");
  if (["min", "dim", "hdim"].includes(formulaQuality)) return false;
  const labels = candidateVisibleDegreeLabels(candidate);
  return candidate.visibleIntervals.includes(0)
    && labels.some(isFifthDegreeLabel)
    && labels.some((label) => isSeventhDegreeLabel(label) || isSixthDegreeLabel(label));
}

function shouldFilterContradictoryPartialCoreCandidate(candidate) {
  if (!candidate || candidate.exact || candidate.formula?.allowDyad) return false;
  const id = String(candidate.formula?.id || "");
  const missing = Array.isArray(candidate.missingLabels) ? candidate.missingLabels : [];
  if (!missing.length) return false;

  if (["dim", "dim7", "m7b5"].includes(id)) {
    return missing.some((label) => isThirdDegreeLabel(label) || isFifthDegreeLabel(label) || isSeventhDegreeLabel(label));
  }
  if (["maj", "min"].includes(id)) {
    return missing.some((label) => isThirdDegreeLabel(label) || isFifthDegreeLabel(label));
  }
  if (["7", "m7", "maj7"].includes(id)) {
    return missing.some((label) => isThirdDegreeLabel(label) || isFifthDegreeLabel(label) || isSeventhDegreeLabel(label));
  }
  if (id === "dom7sus4") return missing.includes("4");
  if (id === "dom7sus2") return missing.includes("2");
  return false;
}

function candidateHeardIntervalSignature(candidate) {
  const intervals = [...(candidate?.visibleIntervals || [])];
  if (candidate?.externalBassInterval != null) intervals.push(mod12(candidate.externalBassInterval));
  return Array.from(new Set(intervals.map(mod12))).sort((a, b) => a - b).join(",");
}

function shouldFilterExternalBassSubsetCandidate(candidate, exactCandidates) {
  if (candidate?.formula?.quartal) return false;
  if (!candidate || candidate.externalBassInterval == null) return false;
  if (isOptionalSlashTensionInterval(candidate.externalBassInterval)) return false;
  const wanted = new Set([...candidate.visibleIntervals, mod12(candidate.externalBassInterval)].map(mod12));
  return exactCandidates.some((exact) => {
    if (!exact?.exact) return false;
    if (exact.rootPc !== candidate.rootPc || exact.bassPc !== candidate.bassPc) return false;
    const exactIntervals = new Set((exact.visibleIntervals || []).map(mod12));
    for (const interval of wanted) {
      if (!exactIntervals.has(interval)) return false;
    }
    return true;
  });
}

function shouldFilterExactSubsetCandidate(candidate, exactCandidates) {
  if (candidate?.formula?.quartal || !candidate?.exact) return false;
  const signature = candidateHeardIntervalSignature(candidate);
  if (!signature) return false;
  return exactCandidates.some((other) => {
    if (!other?.exact || other === candidate) return false;
    if (other.rootPc !== candidate.rootPc || other.bassPc !== candidate.bassPc) return false;
    if (candidateHeardIntervalSignature(other) !== signature) return false;
    const ownCount = (candidate.formula?.intervals || []).length;
    const otherCount = (other.formula?.intervals || []).length;
    if (otherCount !== ownCount) return otherCount > ownCount;
    return (other.missingLabels?.length || 0) < (candidate.missingLabels?.length || 0);
  });
}

function shouldFilterInexactCandidateShadowedByExact(candidate, exactCandidates) {
  if (candidate?.formula?.quartal || !candidate || candidate.exact) return false;
  if (candidate.externalBassInterval != null && isOptionalSlashTensionInterval(candidate.externalBassInterval)) return false;
  const signature = candidateHeardIntervalSignature(candidate);
  if (!signature) return false;
  return exactCandidates.some((exact) => exact?.exact
    && exact.rootPc === candidate.rootPc
    && exact.bassPc === candidate.bassPc
    && candidateHeardIntervalSignature(exact) === signature);
}

function candidateFormulaComplexityPenalty(candidate) {
  const id = String(candidate?.formula?.id || "");
  if (["maj", "min", "sus2", "sus4"].includes(id)) return 0;
  if (["dom7sus4", "dom7sus2"].includes(id)) return 1;
  if (["6", "m6", "add9", "madd9", "add11", "madd11", "sus2add13no5", "dom7no3no5", "maj7no3no5", "flat5no3", "m7b5add11omit3"].includes(id)) return 2;
  if (["maj7add11"].includes(id)) return 5;
  if (["maj7sus4add9sharp11", "dom7add11add13no5"].includes(id)) return 10;
  if (["m6add11"].includes(id)) return 5;
  if (["maj7", "7", "m7", "m7b5", "dim7", "m7no5", "dom7no5"].includes(id)) return 4;
  if (["maj9", "9", "m9", "7sharp9", "7sharp9no5", "mmaj9"].includes(id)) return 6;
  if (["dom13sharp11"].includes(id)) return 8;
  if (["m7flat13", "m7no5addb13"].includes(id)) return 8;
  if (["maj7add13", "maj7add13omit5", "maj13", "maj13omit5"].includes(id)) return 8;
  if (["m11flat13", "m11flat13omit3"].includes(id)) return 10;
  if (["mmaj7"].includes(id)) return 8;
  if (["mmaj7add13"].includes(id)) return 5;
  if (["maj7sharp5", "7sharp5", "7flat5", "maddb13"].includes(id)) return 12;
  return 7;
}

const RARE_ENHARMONIC_SPELLINGS = new Set(["Cb", "Fb", "E#", "B#"]);

function noteEnharmonicPenalty(note) {
  const spelled = String(note || "");
  if (!spelled) return 0;
  if (spelled.includes("bb") || spelled.includes("##")) return 2.4;
  return RARE_ENHARMONIC_SPELLINGS.has(spelled) ? 1.2 : 0;
}

function candidateRareEnharmonicPenalty(candidate) {
  const notes = Array.isArray(candidate?.visibleNotes) ? candidate.visibleNotes : [];
  const notePenalty = notes.reduce((sum, note) => sum + noteEnharmonicPenalty(note), 0);
  const bassPenalty = candidate?.externalBassInterval != null
    ? noteEnharmonicPenalty(spellNoteFromChordInterval(candidate.rootPc, candidate.externalBassInterval, !!candidate.preferSharps))
    : 0;
  return notePenalty + bassPenalty;
}

function candidateHasAwkwardHeuristicCluster(candidate, visibleLabels) {
  if (!String(candidate?.formula?.id || "").startsWith("tertian_heuristic")) return false;
  const labels = (Array.isArray(visibleLabels) ? visibleLabels : []).map((label) => String(label || "").toLowerCase());
  const hasB2 = labels.includes("b2");
  const hasB6 = labels.includes("b6");
  const hasFifth = labels.some((label) => label === "5" || label === "b5" || label === "#5");
  const hasNo5 = String(candidate?.formula?.suffix || "").includes("no5");
  return hasB2 && hasB6 && !hasFifth && hasNo5;
}

function candidateHasStructuralAlteredFifth(candidate) {
  const id = String(candidate?.formula?.id || "");
  return [
    "dim",
    "dim7",
    "m7b5",
    "m7b5add11omit3",
    "flat5no3",
    "7flat5",
    "maj7sharp5",
    "7sharp5",
  ].includes(id);
}

function candidateProbabilityScore(candidate) {
  if (!candidate) return 999;

  if (candidate?.formula?.quartal) {
    const quartalSize = (candidate.formula?.intervals || []).length;
    let score = candidate.formula?.quartalType === "pure" ? 5 : 7;
    if (candidate.exact) score -= 2;
    else score += 3;
    if (quartalSize > 3) score -= (quartalSize - 3) * 1.1;
    if (candidate.externalBassInterval != null) score += 2.5;
    if (candidate.bassPc === candidate.rootPc) score -= 1.5;
    return Number(score.toFixed(2));
  }

  const formulaId = String(candidate?.formula?.id || "");
  if (formulaId.startsWith("tertian_heuristic")) {
    let score = candidate.exact ? 0.5 : 3;
    const heuristicQuality = String(candidate?.formula?.ui?.quality || "");
    const visibleLabels = candidateVisibleDegreeLabels(candidate);
    const diminishedCore = heuristicQuality === "dim"
      ? new Set(["1", "b3", "b5", "bb7"])
      : heuristicQuality === "hdim"
        ? new Set(["1", "b3", "b5", "b7"])
        : null;
    const diminishedExtras = diminishedCore
      ? visibleLabels.filter((label) => !diminishedCore.has(String(label || ""))).length
      : 0;
    if (candidate.externalBassInterval != null) score += 1.5;
    if (candidate.bassPc !== candidate.rootPc) score += 0.35;
    if (heuristicQuality === "dim") score += 4.5;
    if (heuristicQuality === "hdim") score += 2.5;
    if (diminishedExtras) score += diminishedExtras * 2.5;
    const hasContradictoryThirds = visibleLabels.includes("b3") && visibleLabels.includes("3");
    if (hasContradictoryThirds) score += 2.5;
    if (candidateHasAwkwardHeuristicCluster(candidate, visibleLabels)) score += 3.5;
    if (!candidate.formula?.alteredDominant) score += candidateRareEnharmonicPenalty(candidate);
    return Number(score.toFixed(2));
  }

  let score = 0;
  const formulaSize = (candidate.formula?.intervals || []).length;
  const triadCore = candidateHasCompleteTriad(candidate);
  const externalBass = candidate.externalBassInterval != null;
  const visibleLabels = candidateVisibleDegreeLabels(candidate);
  const hasAlteredFifth = visibleLabels.some((label) => {
    const s = String(label || "").toLowerCase();
    return s === "b5" || s === "#5";
  });

  score += candidateFormulaComplexityPenalty(candidate);
  score += (candidate.missingLabels?.length || 0) * 9;
  if (candidate.missingLabels?.some(isThirdDegreeLabel)) score += 5;
  if (candidate.exact) score -= 2;
  else score += 2;
  if (triadCore) score -= 3;
  if (hasAlteredFifth && !candidateHasStructuralAlteredFifth(candidate)) score += 8;

  if (externalBass) {
    if (triadCore && formulaSize === 3 && (candidate.missingLabels?.length || 0) === 0) score -= 8;
    else if (triadCore) score -= 2;
    else score += 4;
  } else if (candidate.bassPc !== candidate.rootPc) {
    score += 1;
  }

  score += Math.max(0, formulaSize - 3) * 1.2;
  score += ((candidate.name || "").match(/[?#b?]/g) || []).length * 0.15;
  const preferredSharps = preferSharpsFromMajorTonicPc(candidate.rootPc ?? 0);
  if (typeof candidate.preferSharps === "boolean" && candidate.preferSharps !== preferredSharps) score += 1.5;
  return Number(score.toFixed(2));
}

export function buildQuartalStepText(step) {
  return step === 6 ? "A4" : "4J";
}

export function buildQuartalChainsFromSelected({ rootPc, selectedPcs, allowMixed = true }) {
  const pcs = Array.from(new Set((selectedPcs || []).map(mod12)));
  const selectedSet = new Set(pcs);
  if (!selectedSet.has(mod12(rootPc))) return [];

  const out = [];
  const seen = new Set();
  const maxLen = Math.min(5, pcs.length);

  const walk = (chain, steps) => {
    if (chain.length >= 3) {
      const key = `${chain.join(",")}|${steps.join(",")}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ pcs: [...chain], steps: [...steps] });
      }
    }

    if (chain.length >= maxLen) return;
    const last = chain[chain.length - 1];
    for (const step of allowMixed ? [5, 6] : [5]) {
      const nextPc = mod12(last + step);
      if (!selectedSet.has(nextPc) || chain.includes(nextPc)) continue;
      walk([...chain, nextPc], [...steps, step]);
    }
  };

  walk([mod12(rootPc)], []);
  return out;
}

function buildQuartalManualCandidates(selectedNotes) {
  const list = normalizeSelectedNotes(selectedNotes);
  if (list.length < 3) return [];

  const ordered = [...list].sort((a, b) => a.pitch - b.pitch);
  const bass = ordered[0];
  const uniquePcs = Array.from(new Set(ordered.map((note) => mod12(note.pc))));
  const seen = new Map();

  for (const rootPc of uniquePcs) {
    const preferSharps = preferSharpsFromMajorTonicPc(mod12(rootPc));
    const chains = buildQuartalChainsFromSelected({ rootPc, selectedPcs: uniquePcs, allowMixed: true });

    for (const chain of chains) {
      const chainSet = new Set(chain.pcs.map(mod12));
      const extras = uniquePcs.filter((pc) => !chainSet.has(mod12(pc)));
      if (extras.length > 1) continue;
      if (extras.length === 1 && mod12(extras[0]) !== mod12(bass.pc)) continue;

      const visibleIntervals = chain.pcs.map((pc) => mod12(pc - rootPc));
      const degreeLabels = visibleIntervals.map((intv) => intervalToSimpleChordDegreeToken(intv));
      const visibleNotes = spellChordNotes({ rootPc, chordIntervals: visibleIntervals, preferSharps });
      const externalBassInterval = extras.length ? mod12(bass.pc - rootPc) : null;
      const bassName = externalBassInterval == null ? pcToName(rootPc, preferSharps) : spellNoteFromChordInterval(rootPc, externalBassInterval, preferSharps);
      const quartalType = chain.steps.every((step) => step === 5) ? "pure" : "mixed";
      const rootName = pcToName(rootPc, preferSharps);
      const stepText = chain.steps.map(buildQuartalStepText).join(" · ");
      const intervalPairsText = `${visibleNotes.join(" – ")} · bajo en ${bassName}${stepText ? ` · ${stepText}` : ""}`;
      const exact = extras.length === 0 && chain.pcs.length === uniquePcs.length;
      const spreadKind = chain.steps.length
        ? chain.steps.every((step, idx) => {
            const left = ordered[idx];
            const right = ordered[idx + 1];
            return !!left && !!right && (right.pitch - left.pitch) === step;
          }) ? "closed" : "open"
        : "closed";

      const candidate = {
        id: `quartal|${quartalType}|${rootPc}|${externalBassInterval == null ? "in" : externalBassInterval}|${chain.pcs.join(".")}`,
        name: `${quartalType === "mixed" ? "Cuartal mixto" : "Cuartal"} ${rootName}${bassName !== rootName ? `/${bassName}` : ""}`,
        rootPc,
        bassPc: bass.pc,
        preferSharps,
        formula: {
          id: `quartal_${quartalType}_${visibleIntervals.length}`,
          intervals: visibleIntervals,
          degreeLabels,
          suffix: "",
          ui: null,
          manualOnly: true,
          quartal: true,
          quartalType,
          quartalSteps: [...chain.steps],
        },
        exact,
        score: Number(((exact ? 6 : 10) + (quartalType === "mixed" ? 2 : 0) + (externalBassInterval != null ? 2 : 0) - Math.max(0, chain.pcs.length - 3)).toFixed(2)),
        uiPatch: {
          rootPc,
          spellPreferSharps: preferSharps,
          family: "quartal",
          quartalType,
          quartalVoices: String(chain.pcs.length),
          quartalSpread: spreadKind,
          quartalReference: "root",
        },
        intervalPairsText,
        visibleNotes,
        visibleIntervals,
        missingLabels: [],
        externalBassInterval,
      };

      candidate.probabilityScore = candidateProbabilityScore(candidate);
      const dedupeKey = `${candidate.name}|${candidate.intervalPairsText}`;
      const prev = seen.get(dedupeKey);
      if (!prev || candidate.probabilityScore < prev.probabilityScore || (candidate.probabilityScore === prev.probabilityScore && candidate.score < prev.score)) {
        seen.set(dedupeKey, candidate);
      }
    }
  }

  return Array.from(seen.values());
}

function formatHeuristicAddText(tokens) {
  const safe = Array.isArray(tokens) ? tokens.map((token) => String(token || "").trim()).filter(Boolean) : [];
  if (!safe.length) return "";
  const noAddPrefix = new Set(["b9", "#9", "b13", "#11"]);
  const allNoAdd = safe.every((token) => noAddPrefix.has(token));
  if (allNoAdd) return safe.join(",");
  const needsRepeatedAdd = safe.some((token) => !noAddPrefix.has(token) && (/^(bb|b|#)/i.test(token) || /^(2|4|6)$/.test(token)));
  if (needsRepeatedAdd) return safe.map((token) => (noAddPrefix.has(token) ? token : `add${token}`)).join(",");
  return `add${safe.join(",")}`;
}

function appendDescriptorToChordSuffix(baseSuffix, descriptorText) {
  const base = String(baseSuffix || "");
  const descriptor = String(descriptorText || "").trim();
  if (!descriptor) return base;
  if (!base) return descriptor;
  if (base.endsWith(")")) return `${base.slice(0, -1)},${descriptor})`;
  return `${base}(${descriptor})`;
}

function buildHeuristicTertianCandidates(selectedNotes) {
  const list = normalizeSelectedNotes(selectedNotes);
  if (list.length < 3) return [];

  const ordered = [...list].sort((a, b) => a.pitch - b.pitch);
  const bass = ordered[0];
  const uniquePcs = Array.from(new Set(ordered.map((note) => mod12(note.pc))));
  const seen = new Map();

  for (const rootPc of uniquePcs) {
    const preferSharps = preferSharpsFromMajorTonicPc(mod12(rootPc));
    const intervals = Array.from(new Set(uniquePcs.map((pc) => mod12(pc - rootPc)))).sort((a, b) => a - b);
    if (!intervals.includes(0)) continue;

    const hasMajThird = intervals.includes(4);
    const hasMinThird = intervals.includes(3);
    const hasPerfectFifth = intervals.includes(7);
    const hasFlatFifth = intervals.includes(6);
    const hasMajSeventh = intervals.includes(11);
    const hasMinSeventh = intervals.includes(10);
    const hasDimSeventh = intervals.includes(9) && hasMinThird && hasFlatFifth && !hasMinSeventh && !hasMajSeventh;
    const hasHeuristicSeventh = hasMajSeventh || hasMinSeventh || hasDimSeventh;
    if (!hasMajThird && !hasMinThird) continue;
    if (!hasPerfectFifth && !hasFlatFifth && !hasHeuristicSeventh) continue;

    const has9 = intervals.includes(2);
    const has11 = intervals.includes(5);
    const has13 = intervals.includes(9) && !hasDimSeventh;
    const useSixthLabel = has13 && !hasHeuristicSeventh;
    const useThirteenthLabel = has13 && hasHeuristicSeventh;
    const useEleventhLabel = has11 && (hasMajThird || hasMinThird || hasHeuristicSeventh);
    const hasBassTone = intervals.includes(mod12(bass.pc - rootPc));
    const bassInterval = mod12(bass.pc - rootPc);
    // When major 3rd + b7 coexist, the chord is dominant: b3 = #9 enharmonic, b6 = b13
    const isAlteredDominant = hasMajThird && hasMinSeventh && hasMinThird && !hasFlatFifth;

    let quality = "maj";
    let baseSuffix = "";
    const coreIntervals = [0];

    if (hasMinThird && hasFlatFifth) {
      if (hasMinSeventh) {
        quality = "hdim";
        baseSuffix = "m7(b5)";
        coreIntervals.push(3, 6, 10);
      } else if (hasDimSeventh) {
        quality = "dim";
        baseSuffix = "dim7";
        coreIntervals.push(3, 6, 9);
      } else {
        quality = "dim";
        baseSuffix = "dim";
        coreIntervals.push(3, 6);
      }
    } else if (isAlteredDominant) {
      quality = "dom";
      coreIntervals.push(4, 10);
      if (hasPerfectFifth) coreIntervals.push(7);
      baseSuffix = "7";
    } else if (hasMinThird) {
      quality = "min";
      coreIntervals.push(3);
      if (hasPerfectFifth) coreIntervals.push(7);
      if (hasPerfectFifth && useSixthLabel) {
        baseSuffix = "m6";
        coreIntervals.push(9);
      } else if (hasMajSeventh) {
        baseSuffix = "m(maj7)";
        coreIntervals.push(11);
      } else if (hasMinSeventh) {
        baseSuffix = "m7";
        coreIntervals.push(10);
      } else {
        baseSuffix = "m";
      }
    } else if (hasMajThird && hasFlatFifth && !hasPerfectFifth) {
      quality = hasMinSeventh ? "dom" : "maj";
      if (hasMajSeventh) {
        baseSuffix = "maj7b5";
        coreIntervals.push(4, 6, 11);
      } else if (hasMinSeventh) {
        baseSuffix = "7b5";
        coreIntervals.push(4, 6, 10);
      } else {
        baseSuffix = "(b5)";
        coreIntervals.push(4, 6);
      }
    } else {
      quality = hasMinSeventh ? "dom" : "maj";
      coreIntervals.push(4);
      if (hasPerfectFifth) coreIntervals.push(7);
      if (hasPerfectFifth && useSixthLabel) {
        baseSuffix = "6";
        coreIntervals.push(9);
      } else if (hasMajSeventh) {
        baseSuffix = "maj7";
        coreIntervals.push(11);
      } else if (hasMinSeventh) {
        baseSuffix = "7";
        coreIntervals.push(10);
      } else {
        baseSuffix = "";
      }
    }

    const coreSet = new Set(coreIntervals.map(mod12));
    const addTokens = intervals
      .filter((intv) => !coreSet.has(mod12(intv)))
      .map((intv) => {
        const s = mod12(intv);
        if (isAlteredDominant) {
          if (s === 3) return "#9";
          if (s === 8) return "b13";
        }
        if (quality === "dom" && s === 8) return "b13";
        if (s === 2) return hasMajThird || hasMinThird || hasHeuristicSeventh ? "9" : "2";
        if (s === 5) return useEleventhLabel ? "11" : "4";
        if (s === 9 && !hasDimSeventh) return useThirteenthLabel ? "13" : "6";
        return intervalToChordToken(s);
      });
    if (!hasPerfectFifth && !hasFlatFifth) addTokens.push("no5");

    const uniqueAddTokens = Array.from(new Set(addTokens.filter(Boolean)));
    const addTextTokens = uniqueAddTokens.filter((token) => token !== "no5");
    let suffix;
    if (isAlteredDominant) {
      const no5Str = uniqueAddTokens.includes("no5") ? ",no5" : "";
      suffix = `7(${addTextTokens.join(",")}${no5Str})`;
    } else {
      let addText = formatHeuristicAddText(addTextTokens);
      if (baseSuffix === "m(maj7)" && addTextTokens.length === 1 && addTextTokens[0] === "13") {
        addText = "13";
      }
      const suffixDescriptor = `${addText}${uniqueAddTokens.includes("no5") ? `${addText ? "," : ""}no5` : ""}`;
      suffix = appendDescriptorToChordSuffix(baseSuffix, suffixDescriptor);
      if (baseSuffix === "m(maj7)" && addTextTokens.length === 1 && addTextTokens[0] === "9" && !uniqueAddTokens.includes("no5")) {
        suffix = "m(maj9)";
      }
    }

    const heuristicDegreeLabels = intervals.map((intv) => {
      const s = mod12(intv);
      if (isAlteredDominant) {
        if (s === 3) return "#9";
        if (s === 8) return "b13";
      }
      if (quality === "dom" && s === 8) return "b13";
      return intervalToChordToken(intv, { ext6: useSixthLabel, ext9: has9, ext11: useEleventhLabel, ext13: useThirteenthLabel });
    });
    const noteNames = spellChordNotes({ rootPc, chordIntervals: intervals, preferSharps, degreeLabels: heuristicDegreeLabels });
    const slashBassChoice = bass.pc !== rootPc ? `/${spellNoteFromChordInterval(rootPc, bassInterval, preferSharps)}` : "";
    const formula = {
      id: `tertian_heuristic_${quality}_${intervals.length}`,
      intervals,
      alteredDominant: isAlteredDominant,
      degreeLabels: heuristicDegreeLabels,
      suffix,
      ui: {
        quality,
        suspension: "none",
        structure: "chord",
        inversion: "all",
        form: "open",
        positionForm: "open",
        ext7: hasHeuristicSeventh,
        ext6: useSixthLabel,
        ext9: has9,
        ext11: useEleventhLabel,
        ext13: useThirteenthLabel,
      },
    };
    const visibleItems = buildDetectedVisibleFormulaItems({ formula, noteNames, coreSelected: intervals });
    const candidate = {
      id: `tertian_heuristic|${rootPc}|${bassInterval}|${intervals.join(".")}|${preferSharps ? "sharp" : "flat"}`,
      name: `${pcToName(rootPc, preferSharps)}${suffix}${slashBassChoice}`,
      rootPc,
      bassPc: bass.pc,
      preferSharps,
      formula,
      exact: true,
      score: Number(((hasBassTone ? 0 : 1) + (bass.pc !== rootPc ? 0.5 : 0) + Math.max(0, intervals.length - 4) * 0.5).toFixed(2)),
      uiPatch: {
        rootPc,
        spellPreferSharps: preferSharps,
        quality,
        suspension: "none",
        structure: "chord",
        inversion: "all",
        form: "open",
        positionForm: "open",
        ext7: hasHeuristicSeventh,
        ext6: useSixthLabel,
        ext9: has9,
        ext11: useEleventhLabel,
        ext13: useThirteenthLabel,
      },
      intervalPairsText: visibleItems.map((item) => `${item.label}=${item.note}`).join(", "),
      visibleNotes: visibleItems.map((item) => item.note),
      visibleIntervals: intervals,
      missingLabels: [],
      externalBassInterval: hasBassTone ? null : bassInterval,
    };

    candidate.probabilityScore = candidateProbabilityScore(candidate);
    const dedupeKey = `${candidate.name}|${candidate.intervalPairsText}`;
    const prev = seen.get(dedupeKey);
    if (!prev || candidate.probabilityScore < prev.probabilityScore || (candidate.probabilityScore === prev.probabilityScore && candidate.score < prev.score)) {
      seen.set(dedupeKey, candidate);
    }
  }

  return Array.from(seen.values());
}

function normalizeSelectedNotes(selectedNotes) {
  const list = Array.isArray(selectedNotes) ? selectedNotes : [];
  return list
    .map((item, idx) => {
      if (item && typeof item === "object" && Number.isFinite(item.pc)) {
        return {
          ...item,
          pc: mod12(item.pc),
          pitch: Number.isFinite(item.pitch) ? item.pitch : idx,
        };
      }
      if (typeof item === "string") {
        const pc = noteNameToPc(item);
        return pc == null ? null : { pc, pitch: idx };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.pitch - b.pitch);
}

function collectFormulaCandidates(selectedNotes) {
  const list = normalizeSelectedNotes(selectedNotes);
  if (!list.length) return [];

  const bass = list[0];
  const uniquePcs = Array.from(new Set(list.map((note) => mod12(note.pc))));
  const seen = new Map();

  for (const rootPc of uniquePcs) {
    const preferSharps = preferSharpsFromMajorTonicPc(mod12(rootPc));
    const bassInterval = mod12(bass.pc - rootPc);
    const selectedIntervalsAll = Array.from(new Set(uniquePcs.map((pc) => mod12(pc - rootPc)))).sort((a, b) => a - b);

    for (const formula of CHORD_DETECT_FORMULAS) {
      const formulaIntervals = formula.intervals.map(mod12);
      const formulaSet = new Set(formulaIntervals);
      const externalBassInterval = formulaSet.has(bassInterval) ? null : bassInterval;
      const coreSelected = externalBassInterval == null ? selectedIntervalsAll : selectedIntervalsAll.filter((interval) => interval !== externalBassInterval);
      const extras = coreSelected.filter((interval) => !formulaSet.has(interval));
      if (extras.length || !coreSelected.includes(0)) continue;

      const matches = formulaIntervals.filter((interval) => coreSelected.includes(interval));
      const missing = formulaIntervals.filter((interval) => !coreSelected.includes(interval));
      const minRequiredMatches = formula.allowDyad ? Math.min(formulaIntervals.length, 2) : Math.min(formulaIntervals.length, 3);
      if (matches.length < minRequiredMatches) continue;
      if (formula.allowDyad) {
        if (selectedIntervalsAll.length !== 2 || externalBassInterval != null || missing.length > 0) continue;
      } else if (missing.length > 1) {
        continue;
      }

      const missingLabels = formulaIntervals
        .map((intv, idx) => !coreSelected.includes(intv) ? formula.degreeLabels[idx] : null)
        .filter(Boolean);
      const suffix = appendMissingDegreesToSuffix(formula.suffix, missingLabels);
      const buildNameVariant = (preferSharpsChoice) => {
        const noteNamesChoice = spellChordNotes({ rootPc, chordIntervals: formulaIntervals, preferSharps: preferSharpsChoice, degreeLabels: formula.degreeLabels });
        let slashBassChoice = "";
        if (bass.pc !== rootPc) {
          const bassIdx = formulaIntervals.findIndex((interval) => interval === bassInterval);
          slashBassChoice = `/${bassIdx >= 0 ? noteNamesChoice[bassIdx] : spellNoteFromChordInterval(rootPc, bassInterval, preferSharpsChoice)}`;
        }
        return {
          preferSharpsChoice,
          noteNames: noteNamesChoice,
          name: `${pcToName(rootPc, preferSharpsChoice)}${suffix}${slashBassChoice}`,
        };
      };

      const spellings = [buildNameVariant(preferSharps)];
      const alternate = buildNameVariant(!preferSharps);
      if (alternate.name !== spellings[0].name) spellings.push(alternate);

      const exact = missing.length === 0;
      const slashPenalty = bass.pc === rootPc ? 0 : (externalBassInterval == null ? 1 : 3);
      const score = (exact ? 0 : 20) + slashPenalty + missing.length * 6 + Math.max(0, 4 - matches.length) + (formula.allowDyad ? 14 : 0);

      for (const spelling of spellings) {
        const visibleItems = buildDetectedVisibleFormulaItems({ formula, noteNames: spelling.noteNames, coreSelected });
        const visiblePairs = visibleItems.map((item) => `${item.label}=${item.note}`);
        const candidate = {
          id: `${formula.id}|${rootPc}|${externalBassInterval == null ? "in" : externalBassInterval}|${missingLabels.join(",")}|${spelling.preferSharpsChoice ? "sharp" : "flat"}`,
          name: spelling.name,
          rootPc,
          bassPc: bass.pc,
          preferSharps: spelling.preferSharpsChoice,
          formula,
          exact,
          score,
          uiPatch: formula.allowDyad ? null : (formula.ui ? { rootPc, spellPreferSharps: spelling.preferSharpsChoice, ...formula.ui } : null),
          intervalPairsText: visiblePairs.join(", "),
          visibleNotes: visibleItems.map((item) => item.note),
          visibleIntervals: matches,
          missingLabels,
          externalBassInterval,
        };

        candidate.probabilityScore = candidateProbabilityScore(candidate);
        const dedupeKey = `${candidate.name}|${candidate.intervalPairsText}`;
        const prev = seen.get(dedupeKey);
        if (!prev || candidate.probabilityScore < prev.probabilityScore || (candidate.probabilityScore === prev.probabilityScore && candidate.score < prev.score)) {
          seen.set(dedupeKey, candidate);
        }
      }
    }
  }

  return Array.from(seen.values());
}

function groupPriority(candidate) {
  if (candidate?.formula?.quartal) {
    const quartalSize = Array.isArray(candidate?.formula?.intervals) ? candidate.formula.intervals.length : 0;
    if (candidate.exact && quartalSize >= 4 && candidate.bassPc === candidate.rootPc) return -1;
    return quartalSize >= 4 ? 1 : 2;
  }
  return 0;
}

export function rankChordReadings(readings) {
  const list = Array.isArray(readings) ? [...readings] : [];
  list.sort((a, b) => {
    const aGroup = groupPriority(a);
    const bGroup = groupPriority(b);
    if (aGroup !== bGroup) return aGroup - bGroup;
    if ((a.rankScore ?? 999) !== (b.rankScore ?? 999)) return (a.rankScore ?? 999) - (b.rankScore ?? 999);
    if ((a.score ?? 999) !== (b.score ?? 999)) return (a.score ?? 999) - (b.score ?? 999);
    return String(a.name || "").localeCompare(String(b.name || ""), "es", { sensitivity: "base" });
  });
  return list;
}

function dedupeRankedChordReadings(readings) {
  // Pass 1: deduplicate by name|intervalPairsText (existing logic)
  const seen = new Map();
  for (const reading of Array.isArray(readings) ? readings : []) {
    const key = `${String(reading?.name || "")}|${String(reading?.intervalPairsText || "")}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, reading);
      continue;
    }

    const prevRank = prev.rankScore ?? prev.probabilityScore ?? prev.score ?? 999;
    const nextRank = reading.rankScore ?? reading.probabilityScore ?? reading.score ?? 999;
    if (nextRank < prevRank || (nextRank === prevRank && (reading.score ?? 999) < (prev.score ?? 999))) {
      seen.set(key, reading);
    }
  }
  const list = Array.from(seen.values());

  // Pass 2: for non-quartal candidates with identical content (root/bass/intervals/missing),
  // prefer formula name over heuristic name while keeping the lower (better) probabilityScore.
  // This resolves conflicts like "m(addb6)" vs "m(addb13)", "7(#9,no5)" vs "7(#9)", etc.
  const isHeuristicFormula = (r) => String(r?.formula?.id || "").startsWith("tertian_heuristic");
  const contentKey = (r) => [
    r.rootPc,
    r.bassPc,
    r.preferSharps ? "s" : "f",
    (r.visibleIntervals || []).slice().sort((a, b) => a - b).join(","),
    (r.missingLabels || []).slice().sort().join(","),
  ].join("|");

  const contentWinners = new Map();
  for (const r of list) {
    if (r.formula?.quartal) continue;
    const k = contentKey(r);
    const prev = contentWinners.get(k);
    if (!prev) { contentWinners.set(k, r); continue; }
    const prevScore = prev.probabilityScore ?? 999;
    const currScore = r.probabilityScore ?? 999;
    const minScore = Math.min(prevScore, currScore);
    const prevIsHeur = isHeuristicFormula(prev);
    const currIsHeur = isHeuristicFormula(r);
    let winner;
    if (prevIsHeur && !currIsHeur) winner = { ...r, probabilityScore: minScore };
    else if (!prevIsHeur && currIsHeur) winner = prevScore <= minScore ? prev : { ...prev, probabilityScore: minScore };
    else winner = currScore < prevScore ? r : prev;
    contentWinners.set(k, winner);
  }

  const usedContentKeys = new Set();
  const result = [];
  for (const r of list) {
    if (r.formula?.quartal) { result.push(r); continue; }
    const k = contentKey(r);
    if (usedContentKeys.has(k)) continue;
    usedContentKeys.add(k);
    result.push(contentWinners.get(k) ?? r);
  }
  return result;
}

function isSoWhatVoicing(selectedNotes) {
  const sorted = [...selectedNotes].sort((a, b) => a.pitch - b.pitch);
  if (sorted.length !== 5) return false;
  return (
    sorted[1].pitch - sorted[0].pitch === 5 &&
    sorted[2].pitch - sorted[1].pitch === 5 &&
    sorted[3].pitch - sorted[2].pitch === 5 &&
    sorted[4].pitch - sorted[3].pitch === 4
  );
}

function isSoWhatCandidate(candidate, selectedNotes) {
  if (!isSoWhatVoicing(selectedNotes)) return false;
  const labels = new Set(candidateVisibleDegreeLabels(candidate));
  const hasMinor11Color =
    labels.has("1") &&
    labels.has("b3") &&
    labels.has("5") &&
    labels.has("b7") &&
    (labels.has("11") || labels.has("4"));
  const name = String(candidate?.name || "");
  const isExpectedName =
    name.includes("m7(add11)") ||
    name.includes("m11") ||
    name.includes("m7(add4)");
  return hasMinor11Color && isExpectedName;
}

function decorateSpecialAliases(candidate, selectedNotes) {
  const visibleLabels = new Set(candidateVisibleDegreeLabels(candidate));
  const aliases = [];

  if (visibleLabels.has("1") && visibleLabels.has("#9") && visibleLabels.has("3") && visibleLabels.has("b7")) {
    const hasExtraAlterations = visibleLabels.has("b13") || visibleLabels.has("b9") || visibleLabels.has("#11") || visibleLabels.has("b5");
    aliases.push(hasExtraAlterations ? "Hendrix-type" : "Hendrix chord");
  }
  if (visibleLabels.has("1") && visibleLabels.has("9") && visibleLabels.has("3") && visibleLabels.has("#11") && visibleLabels.has("13") && visibleLabels.has("b7")) {
    aliases.push("Mystic chord");
  }
  if (visibleLabels.has("1") && visibleLabels.has("9") && visibleLabels.has("b3") && visibleLabels.has("5") && visibleLabels.has("7")) {
    aliases.push("James Bond chord");
  }
  if (isSoWhatCandidate(candidate, selectedNotes)) {
    aliases.push("So What chord");
  }

  if (!aliases.length) return candidate;
  return { ...candidate, aliases, displayName: `${candidate.name} · ${aliases.join(" · ")}` };
}

export function detectChordReadings(selectedNotes) {
  const list = normalizeSelectedNotes(selectedNotes);
  if (!list.length) return [];

  const raw = [
    ...collectFormulaCandidates(list),
    ...buildQuartalManualCandidates(list),
    ...buildHeuristicTertianCandidates(list),
  ];

  const exactSubsetSignatures = new Set(
    raw
      .filter((candidate) => candidate.exact)
      .map((candidate) => `${candidate.rootPc}|${candidate.bassPc}|${candidate.visibleIntervals.slice().sort((a, b) => a - b).join(",")}`)
  );
  const exactCandidates = raw.filter((candidate) => candidate.exact);
  const hasDirectExactDyad = exactCandidates.some((candidate) => candidate.formula?.allowDyad && candidate.externalBassInterval == null);

  const filtered = raw.filter((candidate) => {
    if (candidate.formula?.allowDyad) return true;
    if (hasDirectExactDyad && candidate.externalBassInterval != null) return false;
    if (candidate.missingLabels.some((label) => suffixSemanticallyContainsDegree(candidate.formula?.suffix, label))) return false;
    if (candidate.exact) return !shouldFilterExactSubsetCandidate(candidate, exactCandidates);
    if (shouldFilterContradictoryPartialCoreCandidate(candidate)) return false;
    if (shouldFilterInexactCandidateShadowedByExact(candidate, exactCandidates)) return false;
    if (shouldFilterExternalBassSubsetCandidate(candidate, exactCandidates)) return false;
    if (candidate.missingLabels.some(isThirdDegreeLabel) && !allowMissingThirdCandidate(candidate)) return false;
    if (candidate.missingLabels.length !== 1) return true;
    const missingLabel = candidate.missingLabels[0];
    if (!isExtensionLikeDegreeLabel(missingLabel)) return true;
    const signature = `${candidate.rootPc}|${candidate.bassPc}|${candidate.visibleIntervals.slice().sort((a, b) => a - b).join(",")}`;
    return !exactSubsetSignatures.has(signature);
  });

  const hasCleanerExactCandidate = exactCandidates.some((candidate) => candidate.exact);
  const hasStrongBassRootFormula = filtered.some((c) =>
    c.bassPc === c.rootPc &&
    c.exact &&
    !c.formula?.quartal &&
    !String(c.formula?.id || "").startsWith("tertian_heuristic") &&
    !(c.missingLabels?.length)
  );
  filtered.forEach((candidate) => {
    let extraPenalty = 0;
    if (hasCleanerExactCandidate && candidateIsMissingThirdSeventhLike(candidate)) extraPenalty += 18;
    if (hasStrongBassRootFormula && candidate.bassPc !== candidate.rootPc && !candidate.formula?.quartal) {
      extraPenalty += 2.0;
    }
    candidate.rankScore = Number(((candidate.probabilityScore ?? 999) + extraPenalty).toFixed(2));
  });

  const ranked = rankChordReadings(dedupeRankedChordReadings(filtered)).slice(0, 12);
  return ranked.map((candidate) => decorateSpecialAliases(candidate, list));
}

function formatChordBadgeDegree(label) {
  return String(label || "");
}

function chordBadgeRoleFromDegreeLabel(label, interval) {
  const s = String(label || "").toLowerCase();
  const intv = mod12(interval ?? 0);
  if (intv === 0 || s === "1") return "root";
  if (s === "3" || s === "b3" || s === "#3") return "third";
  if (s === "5" || s === "b5" || s === "#5") return "fifth";
  if (s === "6" || s === "b6" || s === "#6") return "sixth";
  if (s.includes("7")) return "seventh";
  if (s.includes("13")) return "thirteenth";
  if (s === "4" || s === "b4" || s === "#4" || s.includes("11")) return "eleventh";
  if (s === "2" || s === "b2" || s === "#2" || s.includes("9")) return "ninth";
  return "other";
}

export function buildChordLegend(candidate, preferSharpsFallback = true) {
  if (!candidate) return [];
  const prefer = candidate.preferSharps ?? preferSharpsFallback;
  const noteNames = spellChordNotes({
    rootPc: candidate.rootPc,
    chordIntervals: candidate.formula?.intervals || [],
    preferSharps: prefer,
    degreeLabels: candidate.formula?.degreeLabels,
  });
  const visibleItems = buildDetectedVisibleFormulaItems({
    formula: candidate.formula,
    noteNames,
    coreSelected: candidate.visibleIntervals,
  });
  return visibleItems.map((item) => ({
    note: item.note,
    degree: formatChordBadgeDegree(item.label),
    role: chordBadgeRoleFromDegreeLabel(item.label, item.intv),
  }));
}

export function buildDetectedCandidateBadgeItems(candidate, preferSharpsFallback = true) {
  return buildChordLegend(candidate, preferSharpsFallback);
}

export function formatChordName(reading) {
  return String(reading?.displayName || reading?.name || "");
}

function candidateContextFamily(candidate) {
  if (!candidate) return "";
  if (candidate?.formula?.quartal) {
    return `quartal:${String(candidate.formula?.quartalType || "")}`;
  }

  const id = String(candidate?.formula?.id || "").toLowerCase();
  const quality = String(candidate?.uiPatch?.quality || candidate?.formula?.ui?.quality || "").toLowerCase();
  const suspension = String(candidate?.uiPatch?.suspension || candidate?.formula?.ui?.suspension || "").toLowerCase();

  if (id.includes("m7b5") || quality === "hdim") return "hdim";
  if (id.startsWith("dim") || quality === "dim") return "dim";
  if (suspension === "sus2") return "sus2";
  if (suspension === "sus4") return "sus4";
  if (quality === "min") return "min";
  if (quality === "dom") return "dom";
  if (quality === "maj") return "maj";
  return "";
}

function candidateContextIntervalSet(candidate) {
  const set = new Set((candidate?.visibleIntervals || []).map(mod12));
  if (candidate?.externalBassInterval != null) {
    set.add(mod12(candidate.externalBassInterval));
  }
  return set;
}

function candidateContextDistance(previousCandidate, candidate) {
  if (!previousCandidate || !candidate) return 999;
  if (candidate.rootPc !== previousCandidate.rootPc) return 999;

  const previousFamily = candidateContextFamily(previousCandidate);
  const nextFamily = candidateContextFamily(candidate);
  if (!previousFamily || previousFamily !== nextFamily) return 999;

  const prevSet = candidateContextIntervalSet(previousCandidate);
  const nextSet = candidateContextIntervalSet(candidate);
  const union = new Set([...prevSet, ...nextSet]);
  let diffCount = 0;
  union.forEach((interval) => {
    if (prevSet.has(interval) !== nextSet.has(interval)) diffCount += 1;
  });

  let score = diffCount;
  if (candidate.bassPc !== previousCandidate.bassPc) score += 3;
  if (
    candidate.bassPc === previousCandidate.bassPc &&
    (candidate.externalBassInterval ?? null) !== (previousCandidate.externalBassInterval ?? null)
  ) {
    const previousBassInterval = previousCandidate.externalBassInterval == null
      ? mod12(previousCandidate.bassPc - previousCandidate.rootPc)
      : mod12(previousCandidate.externalBassInterval);
    const nextBassInterval = candidate.externalBassInterval == null
      ? mod12(candidate.bassPc - candidate.rootPc)
      : mod12(candidate.externalBassInterval);
    if (previousBassInterval !== nextBassInterval) score += 1;
  }
  return score;
}

export function pickDefaultChordCandidate({ candidates, previousCandidate = null, prioritizeContext = false } = {}) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!list.length) return null;
  if (!prioritizeContext) return list[0] || null;
  if (!previousCandidate) return list[0] || null;

  const exactMatch = list.find((candidate) => candidate?.id && previousCandidate?.id && candidate.id === previousCandidate.id) || null;
  if (exactMatch) return exactMatch;

  const contextual = list
    .map((candidate) => ({ candidate, distance: candidateContextDistance(previousCandidate, candidate) }))
    .filter((entry) => entry.distance <= 2)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if ((a.candidate.rankScore ?? 999) !== (b.candidate.rankScore ?? 999)) return (a.candidate.rankScore ?? 999) - (b.candidate.rankScore ?? 999);
      return (a.candidate.score ?? 999) - (b.candidate.score ?? 999);
    })[0]?.candidate || null;

  return contextual || list[0] || null;
}

export function resolveDetectedCandidateFromContext({
  candidates,
  currentCandidateId = null,
  pendingCandidate = null,
  lastCandidate = null,
  prioritizeContext = false,
} = {}) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!list.length) return null;

  if (pendingCandidate) {
    return pickDefaultChordCandidate({
      candidates: list,
      previousCandidate: pendingCandidate,
      prioritizeContext,
    }) || list[0] || null;
  }

  const currentCandidate = currentCandidateId
    ? list.find((candidate) => candidate?.id === currentCandidateId) || null
    : null;
  if (currentCandidate) return currentCandidate;

  const previousCandidate = lastCandidate || null;
  return pickDefaultChordCandidate({
    candidates: list,
    previousCandidate,
    prioritizeContext,
  }) || list[0] || null;
}

export function buildSyntheticSelectedNotes(noteNames, bassName = null) {
  const source = Array.isArray(noteNames) ? noteNames : [];
  const parsed = source
    .map((note, idx) => {
      const pc = noteNameToPc(note);
      return pc == null ? null : { note: String(note), pc, pitch: idx, inputIdx: idx };
    })
    .filter(Boolean);
  if (!parsed.length) return [];
  if (bassName == null) return parsed;

  const bassPc = noteNameToPc(bassName);
  if (bassPc == null) return parsed;
  const bassIdx = parsed.findIndex((note) => note.pc === bassPc);
  if (bassIdx <= 0) return parsed.map((note, idx) => ({ ...note, pitch: idx }));

  const ordered = [parsed[bassIdx], ...parsed.filter((_, idx) => idx !== bassIdx)];
  return ordered.map((note, idx) => ({ ...note, pitch: idx }));
}

export function analyzeSelectedNotes(noteNames, bassName = null) {
  const selectedNotes = buildSyntheticSelectedNotes(noteNames, bassName);
  const readings = detectChordReadings(selectedNotes).map((reading) => ({
    ...reading,
    legend: buildChordLegend(reading, reading.preferSharps),
  }));
  return {
    selectedNotes,
    readings,
    primary: readings[0] || null,
  };
}
