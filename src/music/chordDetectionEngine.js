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
  { id: "dom9sus4no5", intervals: [0, 2, 5, 10], degreeLabels: ["1", "9", "4", "b7"], suffix: "9sus4(no5)", ui: { quality: "dom", suspension: "sus4", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "6", intervals: [0, 4, 7, 9], degreeLabels: ["1", "3", "5", "6"], suffix: "6", ui: { quality: "maj", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: true, ext9: false, ext11: false, ext13: false } },
  { id: "m6", intervals: [0, 3, 7, 9], degreeLabels: ["1", "b3", "5", "6"], suffix: "m6", ui: { quality: "min", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: true, ext9: false, ext11: false, ext13: false } },
  { id: "add9", intervals: [0, 2, 4, 7], degreeLabels: ["1", "9", "3", "5"], suffix: "add9", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "madd9", intervals: [0, 2, 3, 7], degreeLabels: ["1", "9", "b3", "5"], suffix: "m(add9)", ui: { quality: "min", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "sus2add13no5", intervals: [0, 2, 9], degreeLabels: ["1", "2", "13"], suffix: "sus2add13(no5)", ui: null, manualOnly: true },
  { id: "add11", intervals: [0, 4, 5, 7], degreeLabels: ["1", "3", "11", "5"], suffix: "add11", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: true, ext13: false } },
  { id: "madd11", intervals: [0, 3, 5, 7], degreeLabels: ["1", "b3", "11", "5"], suffix: "m(add11)", ui: { quality: "min", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: false, ext9: false, ext11: true, ext13: false } },
  { id: "maj7add11", intervals: [0, 4, 5, 7, 11], degreeLabels: ["1", "3", "11", "5", "7"], suffix: "maj7(add11)", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: true, ext13: false } },
  { id: "maj7sus4add9sharp11", intervals: [0, 2, 6, 7, 11], degreeLabels: ["1", "9", "#11", "4", "7"], suffix: "maj7sus4(add9,#11)", ui: null },
  { id: "m6add11", intervals: [0, 3, 5, 7, 9], degreeLabels: ["1", "b3", "11", "5", "6"], suffix: "m6(add11)", ui: { quality: "min", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: false, ext6: true, ext9: false, ext11: true, ext13: false } },
  { id: "m7no5", intervals: [0, 3, 10], degreeLabels: ["1", "b3", "b7"], suffix: "m7(no5)", ui: null, manualOnly: true },
  { id: "dom7no5", intervals: [0, 4, 10], degreeLabels: ["1", "3", "b7"], suffix: "7(no5)", ui: null, manualOnly: true },
  { id: "dom7add11add13no5", intervals: [0, 4, 5, 9, 10], degreeLabels: ["1", "3", "11", "13", "b7"], suffix: "7(add11,13,no5)", ui: null },
  { id: "m7b5add11omit3", intervals: [0, 5, 6, 10], degreeLabels: ["1", "11", "b5", "b7"], suffix: "m7(b5,add11,no3)", ui: null, manualOnly: true },
  { id: "maddb13", intervals: [0, 3, 7, 8], degreeLabels: ["1", "b3", "5", "b13"], suffix: "m(addb13)", ui: null },
  { id: "maj9", intervals: [0, 2, 4, 7, 11], degreeLabels: ["1", "9", "3", "5", "7"], suffix: "maj9", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: false } },
  { id: "maj7add13", intervals: [0, 4, 7, 9, 11], degreeLabels: ["1", "3", "5", "13", "7"], suffix: "maj7(add13)", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: true } },
  { id: "maj7add13omit5", intervals: [0, 4, 9, 11], degreeLabels: ["1", "3", "13", "7"], suffix: "maj7(add13,no5)", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: true }, manualOnly: true },
  { id: "maj13", intervals: [0, 2, 4, 7, 9, 11], degreeLabels: ["1", "9", "3", "5", "13", "7"], suffix: "maj13", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: true } },
  { id: "maj13omit5", intervals: [0, 2, 4, 9, 11], degreeLabels: ["1", "9", "3", "13", "7"], suffix: "maj13(no5)", ui: { quality: "maj", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: true }, manualOnly: true },
  { id: "maj7sharp9", intervals: [0, 3, 4, 7, 11], degreeLabels: ["1", "#9", "3", "5", "7"], suffix: "maj7(#9)", ui: null, manualOnly: true },
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
  { id: "mmaj7", intervals: [0, 3, 7, 11], degreeLabels: ["1", "b3", "5", "7"], suffix: "m(maj7)", ui: { quality: "minmaj7", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "mmaj7add13", intervals: [0, 3, 7, 9, 11], degreeLabels: ["1", "b3", "5", "13", "7"], suffix: "m(maj7,13)", ui: { quality: "minmaj7", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: true } },
  { id: "m7b5", intervals: [0, 3, 6, 10], degreeLabels: ["1", "b3", "b5", "b7"], suffix: "m7(b5)", ui: { quality: "hdim", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "dim7", intervals: [0, 3, 6, 9], degreeLabels: ["1", "b3", "b5", "bb7"], suffix: "dim7", ui: { quality: "dim", suspension: "none", structure: "tetrad", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false } },
  { id: "maj7sharp5", intervals: [0, 4, 8, 11], degreeLabels: ["1", "3", "#5", "7"], suffix: "maj7#5", ui: null },
  { id: "7sharp5", intervals: [0, 4, 8, 10], degreeLabels: ["1", "3", "#5", "b7"], suffix: "7#5", ui: null },
  { id: "7flat5", intervals: [0, 4, 6, 10], degreeLabels: ["1", "3", "b5", "b7"], suffix: "7b5", ui: null },
  { id: "7sharp9no5", intervals: [0, 3, 4, 10], degreeLabels: ["1", "#9", "3", "b7"], suffix: "7(#9)", ui: null },
  { id: "dom13sharp11", intervals: [0, 2, 4, 6, 9, 10], degreeLabels: ["1", "9", "3", "#11", "13", "b7"], suffix: "13(#11,9)", ui: null },
  { id: "mmaj9", intervals: [0, 2, 3, 7, 11], degreeLabels: ["1", "9", "b3", "5", "7"], suffix: "m(maj9)", ui: { quality: "minmaj7", suspension: "none", structure: "chord", inversion: "all", form: "open", positionForm: "open", ext7: true, ext6: false, ext9: true, ext11: false, ext13: false } },
  // [0,2,6,7]: sus2 con #11 — dos framings del mismo voicing
  { id: "sus2sharp11",    intervals: [0, 2, 6, 7], degreeLabels: ["1", "2",  "#11", "5"], suffix: "sus2(#11)",     ui: null },
  { id: "add9sharp11no3", intervals: [0, 2, 6, 7], degreeLabels: ["1", "9",  "#11", "5"], suffix: "add9(#11,no3)", ui: null },
  // [0,7,11]: maj7 sin 3ª — naming estándar vs framing power chord
  { id: "maj7no3", intervals: [0, 7, 11], degreeLabels: ["1", "5", "7"], suffix: "maj7(no3)", ui: null },
  { id: "5maj7",   intervals: [0, 7, 11], degreeLabels: ["1", "5", "7"], suffix: "5(maj7)",   ui: null },
  // [0,2,4,5]: mayor con 9ª y 11ª, sin 5ª
  { id: "add9add11no5", intervals: [0, 2, 4, 5], degreeLabels: ["1", "9", "3", "11"], suffix: "add9,11(no5)", ui: null },
  // [0,4,5,10]: dom7 con 11ª, sin 5ª
  { id: "dom7add11no5", intervals: [0, 4, 5, 10], degreeLabels: ["1", "3", "11", "b7"], suffix: "7(add11,no5)", ui: null },
  // [0,3,7,8]: framing compacto de m(addb13)
  { id: "mflat13", intervals: [0, 3, 7, 8], degreeLabels: ["1", "b3", "5", "b13"], suffix: "m(b13)", ui: null },
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
  // En sus4 la 4ª suspende/sustituye a la 3ª → se ordena como si fuera la 3ª, antes de la 5ª
  if (label === "4" && formula?.ui?.suspension === "sus4") return "third";
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
  if (["min", "dim", "hdim", "minmaj7"].includes(formulaQuality)) return false;
  const labels = candidateVisibleDegreeLabels(candidate);
  return candidate.visibleIntervals.includes(0)
    && labels.some(isFifthDegreeLabel)
    && labels.some((label) => isSeventhDegreeLabel(label) || isSixthDegreeLabel(label));
}

function formulaDeclaresSeventh(formula) {
  const labels = Array.isArray(formula?.degreeLabels) ? formula.degreeLabels : [];
  return labels.some(isSeventhDegreeLabel);
}

function shouldFilterContradictoryPartialCoreCandidate(candidate) {
  if (!candidate || candidate.exact || candidate.formula?.allowDyad) return false;
  const id = String(candidate.formula?.id || "");
  const missing = Array.isArray(candidate.missingLabels) ? candidate.missingLabels : [];
  if (!missing.length) return false;

  // A formula whose name declares a seventh (dominant "7" writes the b7 simply as "7",
  // also "maj7", "m7", "dim7", "9"…) but is missing that very seventh produces a
  // contradictory label like "B7(add11,no5,nob7)": the seventh is the chord's defining
  // tone. Drop it — a cleaner reading without the "7" (e.g. "Badd11(no5)") already covers it.
  if (formulaDeclaresSeventh(candidate.formula) && missing.some(isSeventhDegreeLabel)) return true;

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
    && candidateHeardIntervalSignature(exact) === signature
    // Don't shadow when the exact uses an external bass but the inexact incorporates that
    // same note as an internal interval — the inexact offers richer harmonic context.
    && !(exact.externalBassInterval != null && candidate.externalBassInterval == null));
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
  if (["maj9", "9", "m9", "7sharp9", "7sharp9no5", "mmaj9", "maj7sharp9"].includes(id)) return 6;
  if (["dom13sharp11"].includes(id)) return 8;
  if (["m7flat13", "m7no5addb13"].includes(id)) return 8;
  if (["maj7add13", "maj7add13omit5", "maj13", "maj13omit5"].includes(id)) return 8;
  if (["m11flat13", "m11flat13omit3"].includes(id)) return 10;
  if (["mmaj7"].includes(id)) return 8;
  if (["mmaj7add13"].includes(id)) return 5;
  if (["maj7sharp5", "7sharp5", "7flat5", "maddb13", "mflat13"].includes(id)) return 12;
  if (["sus2sharp11"].includes(id)) return 3;
  if (["add9sharp11no3"].includes(id)) return 4;
  if (["maj7no3"].includes(id)) return 4;
  if (["5maj7"].includes(id)) return 6;
  if (["add9add11no5", "dom7add11no5"].includes(id)) return 5;
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

/** Devuelve etiqueta de extensión para "add" en un cuartal con nota añadida */
export function quartalAddedNoteLabel(interval) {
  const labels = {
    0: "1", 1: "b9", 2: "9", 3: "b3", 4: "3", 5: "11",
    6: "#11", 7: "5", 8: "b13", 9: "13", 10: "b7", 11: "7",
  };
  return labels[mod12(interval)] ?? String(mod12(interval));
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
      if (extras.length === 1 && mod12(extras[0]) !== mod12(bass.pc)) {
        // Caso nuevo: cadena cuartal + nota extra que NO es el bajo → lectura secundaria "Cuartal X(addN)"
        // Verificar que la nota extra no es simplemente una extensión cuartal de la cadena
        // (si lo fuera, la cadena larga ya la cubre como cuartal puro/mixto)
        const extraPc = mod12(extras[0]);
        const lastChainPc = chain.pcs[chain.pcs.length - 1];
        const firstChainPc = chain.pcs[0]; // = rootPc
        const extraExtendsChain = [5, 6].some((step) => mod12(lastChainPc + step) === extraPc);
        const extraPrependsChain = [5, 6].some((step) => mod12(extraPc + step) === firstChainPc);
        if (extraExtendsChain || extraPrependsChain) continue;
        // Verificar que las notas de la cadena cuartal ocupan posiciones CONSECUTIVAS
        // en el voicing ordenado por altura real. Ejemplo que debe rechazarse:
        //   xx9555 → B–C–E–A: cadena B–E–A salta C que está entre B y E en el voicing.
        const chainPcSetForConsec = new Set(chain.pcs.map(mod12));
        const chainIndicesInVoicing = ordered.reduce((acc, note, idx) => {
          if (chainPcSetForConsec.has(mod12(note.pc))) acc.push(idx);
          return acc;
        }, []);
        const minChainVoiceIdx = chainIndicesInVoicing[0] ?? 0;
        const maxChainVoiceIdx = chainIndicesInVoicing[chainIndicesInVoicing.length - 1] ?? 0;
        if ((maxChainVoiceIdx - minChainVoiceIdx + 1) !== chain.pcs.length) continue;
        const extraInterval = mod12(extraPc - rootPc);
        const addLabel = quartalAddedNoteLabel(extraInterval);
        const extraNoteName = spellNoteFromChordInterval(rootPc, extraInterval, preferSharps);
        const chainIntervals = chain.pcs.map((pc) => mod12(pc - rootPc));
        const chainNotes = spellChordNotes({ rootPc, chordIntervals: chainIntervals, preferSharps });
        const chainDegrees = chainIntervals.map((intv) => intervalToSimpleChordDegreeToken(intv));
        const allIntervals = [...chainIntervals, extraInterval];
        const allNotes = [...chainNotes, extraNoteName];
        const allDegrees = [...chainDegrees, intervalToSimpleChordDegreeToken(extraInterval)];
        const quartalTypeAdd = chain.steps.every((step) => step === 5) ? "pure" : "mixed";
        const typePrefix = quartalTypeAdd === "mixed" ? "Cuartal mixto" : "Cuartal";
        const rootNameAdd = pcToName(rootPc, preferSharps);
        const stepTextAdd = chain.steps.map(buildQuartalStepText).join(" · ");
        const bassNameAdd = pcToName(bass.pc, preferSharps);
        const intervalPairsTextAdd = `${chainNotes.join(" – ")} + ${extraNoteName} (add${addLabel}) · bajo en ${bassNameAdd}${stepTextAdd ? ` · ${stepTextAdd}` : ""}`;
        const addCandidate = {
          id: `quartal_add|${quartalTypeAdd}|${rootPc}|in|${chain.pcs.join(".")}.${extraPc}`,
          name: `${typePrefix} ${rootNameAdd}(add${addLabel})`,
          rootPc,
          bassPc: bass.pc,
          preferSharps,
          formula: {
            id: `quartal_add_${quartalTypeAdd}_${chain.pcs.length}`,
            intervals: allIntervals,
            degreeLabels: allDegrees,
            suffix: `(add${addLabel})`,
            ui: null,
            manualOnly: true,
            quartal: true,
            quartalType: quartalTypeAdd,
            quartalSteps: [...chain.steps],
            quartalHasAddedNote: true,
            quartalAddedNotes: [{ pc: extraPc, interval: extraInterval, label: addLabel }],
          },
          exact: false,
          score: Number((quartalTypeAdd === "mixed" ? 16 : 14).toFixed(2)),
          uiPatch: {
            rootPc,
            spellPreferSharps: preferSharps,
            family: "quartal",
            quartalType: quartalTypeAdd,
            quartalVoices: String(chain.pcs.length),
            quartalSpread: "closed",
            quartalReference: "root",
          },
          intervalPairsText: intervalPairsTextAdd,
          visibleNotes: allNotes,
          visibleIntervals: allIntervals,
          missingLabels: [],
          externalBassInterval: null,
        };
        addCandidate.probabilityScore = candidateProbabilityScore(addCandidate);
        const addDedupeKey = `${addCandidate.name}|${addCandidate.intervalPairsText}`;
        const prevAdd = seen.get(addDedupeKey);
        if (!prevAdd || addCandidate.probabilityScore < prevAdd.probabilityScore ||
            (addCandidate.probabilityScore === prevAdd.probabilityScore && addCandidate.score < prevAdd.score)) {
          seen.set(addDedupeKey, addCandidate);
        }
        continue;
      }

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
    const preferSharpEleventhOverFlatFifth = hasPerfectFifth && hasFlatFifth && (hasMajThird || hasMinThird || hasHeuristicSeventh);
    const hasBassTone = intervals.includes(mod12(bass.pc - rootPc));
    const bassInterval = mod12(bass.pc - rootPc);
    // When major 3rd + b7 coexist, the chord is dominant: b3 = #9 enharmonic, b6 = b13
    const isAlteredDominant = hasMajThird && hasMinSeventh && hasMinThird && !hasFlatFifth;
    // With major 3rd + maj7, an added minor 3rd is clearer as #9 than as m(maj7,add3).
    const isMajorSharpNineColor = hasMajThird && hasMajSeventh && hasMinThird && !hasFlatFifth;

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
    } else if (isMajorSharpNineColor) {
      quality = "maj";
      coreIntervals.push(4);
      if (hasPerfectFifth) coreIntervals.push(7);
      coreIntervals.push(11);
      baseSuffix = "maj7";
    } else if (hasMinThird) {
      quality = hasMajSeventh ? "minmaj7" : "min";
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
        if (isMajorSharpNineColor && s === 3) return "#9";
        if (quality === "dom" && s === 8) return "b13";
        if (preferSharpEleventhOverFlatFifth && s === 6) return "#11";
        if (s === 2) return hasMajThird || hasMinThird || hasHeuristicSeventh ? "9" : "2";
        if (s === 5) return useEleventhLabel ? "11" : "4";
        if (s === 9 && !hasDimSeventh) return useThirteenthLabel ? "13" : "6";
        return intervalToChordToken(s);
      });
    if (!hasPerfectFifth && !hasFlatFifth) addTokens.push("no5");

    const uniqueAddTokens = Array.from(new Set(addTokens.filter(Boolean)));
    const addTextTokens = uniqueAddTokens.filter((token) => token !== "no5");
    // Tokens not representable as UI extensions: the UI only supports 9, 11, 13, 6.
    // Chords with b2, b6, #4, b9, #9, b13 etc. cannot be faithfully copied to Acordes.
    const REPRESENTABLE_HEURISTIC_EXTENSIONS = new Set(["9", "11", "13", "6"]);
    const hasNonRepresentableExtension = !isAlteredDominant && addTextTokens.some((t) => !REPRESENTABLE_HEURISTIC_EXTENSIONS.has(t));
    let suffix;
    if (isAlteredDominant) {
      const no5Str = uniqueAddTokens.includes("no5") ? ",no5" : "";
      suffix = `7(${addTextTokens.join(",")}${no5Str})`;
    } else {
      if (!baseSuffix && addTextTokens.length === 2 && addTextTokens.includes("9") && addTextTokens.includes("#11") && !uniqueAddTokens.includes("no5")) {
        suffix = "add9(#11)";
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
    }

    const heuristicDegreeLabels = intervals.map((intv) => {
      const s = mod12(intv);
      if (isAlteredDominant) {
        if (s === 3) return "#9";
        if (s === 8) return "b13";
      }
      if (isMajorSharpNineColor && s === 3) return "#9";
      if (quality === "dom" && s === 8) return "b13";
      if (preferSharpEleventhOverFlatFifth && s === 6) return "#11";
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
      uiPatch: hasNonRepresentableExtension ? null : {
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
        // Si el bajo slash externo tiene grafía plana/sostenida que contradice preferSharpsChoice
        // (el sistema de letras de spellNoteFromChordInterval puede producir "Ab" aunque
        // preferSharpsChoice=true), derivamos el preferSharps efectivo del nombre real del bajo.
        let effectivePreferSharps = spelling.preferSharpsChoice;
        if (externalBassInterval != null) {
          const slashIdx = spelling.name.lastIndexOf("/");
          if (slashIdx >= 0) {
            const bassAccidental = spelling.name[slashIdx + 2] ?? "";
            if (bassAccidental === "b") effectivePreferSharps = false;
            else if (bassAccidental === "#") effectivePreferSharps = true;
          }
        }
        const candidate = {
          id: `${formula.id}|${rootPc}|${externalBassInterval == null ? "in" : externalBassInterval}|${missingLabels.join(",")}|${effectivePreferSharps ? "sharp" : "flat"}`,
          name: spelling.name,
          rootPc,
          bassPc: bass.pc,
          preferSharps: effectivePreferSharps,
          formula,
          exact,
          score,
          uiPatch: formula.allowDyad ? null : (formula.ui ? { rootPc, spellPreferSharps: effectivePreferSharps, ...formula.ui } : null),
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
  if (candidate?.formula?.quartalHasAddedNote) return 3; // Lectura secundaria: después de tercianos y cuartales normales
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

function enharmonicTwinKey(r) {
  return [
    r.rootPc,
    r.bassPc,
    (r.visibleIntervals || []).slice().sort((a, b) => a - b).join(","),
    (r.missingLabels || []).slice().sort().join(","),
    String(r.formula?.id || ""),
  ].join("|");
}

// Collapse readings that are the same chord written two enharmonic ways (G#m vs Abm,
// C#dim7 vs Dbdim7). Keep the spelling with fewer rare accidentals (Cb/Fb/E#/B#/double
// flats) so the surviving name reads cleanly; break ties with the per-root canonical
// spelling. Quartal readings are never collapsed. Different chord framings (e.g. the
// addb13/b13 coexistence pair) keep distinct formula ids, so each collapses only against
// its own enharmonic twin.
function collapseEnharmonicTwins(readings) {
  const groups = new Map();
  for (const r of readings) {
    if (r.formula?.quartal) continue;
    const k = enharmonicTwinKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }

  const dropKeys = new Set();
  for (const [, grp] of groups) {
    if (grp.length < 2) continue;
    if (new Set(grp.map((r) => !!r.preferSharps)).size < 2) continue; // not a sharp/flat twin
    let best = null;
    for (const r of grp) {
      const rare = candidateRareEnharmonicPenalty(r);
      const canonical = (!!r.preferSharps === preferSharpsFromMajorTonicPc(mod12(r.rootPc))) ? 0 : 1;
      if (!best || rare < best.rare || (rare === best.rare && canonical < best.canonical)) {
        best = { reading: r, rare, canonical };
      }
    }
    // The surviving spelling inherits the best (lowest) ranking of the pair so it keeps
    // the twin's position; otherwise the cleaner name could fall behind an unrelated
    // reading (e.g. a relative "E6/C#") that the dropped canonical twin outranked.
    const minRank = Math.min(...grp.map((r) => r.rankScore ?? r.probabilityScore ?? r.score ?? 999));
    const minProb = Math.min(...grp.map((r) => r.probabilityScore ?? 999));
    const minScore = Math.min(...grp.map((r) => r.score ?? 999));
    best.reading.rankScore = minRank;
    best.reading.probabilityScore = minProb;
    best.reading.score = minScore;
    for (const r of grp) {
      if (r !== best.reading) dropKeys.add(`${enharmonicTwinKey(r)}|${r.preferSharps ? "s" : "f"}`);
    }
  }
  if (!dropKeys.size) return readings;
  return readings.filter((r) =>
    r.formula?.quartal || !dropKeys.has(`${enharmonicTwinKey(r)}|${r.preferSharps ? "s" : "f"}`)
  );
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
  // Exception: pairs in COEXISTENCE_PAIRS are allowed to coexist (both survive) because they
  // represent intentional alternative framings of the same notes.
  const isHeuristicFormula = (r) => String(r?.formula?.id || "").startsWith("tertian_heuristic");
  const contentKey = (r) => [
    r.rootPc,
    r.bassPc,
    r.preferSharps ? "s" : "f",
    (r.visibleIntervals || []).slice().sort((a, b) => a - b).join(","),
    (r.missingLabels || []).slice().sort().join(","),
  ].join("|");

  const COEXISTENCE_PAIRS = new Set([
    ["sus2sharp11", "add9sharp11no3"].sort().join("|"),
    ["maj7no3", "5maj7"].sort().join("|"),
    ["maddb13", "mflat13"].sort().join("|"),
  ]);

  const contentWinners = new Map();
  // multiFormulaAllowedIds: contentKey → Set of formula IDs that are allowed to coexist
  const multiFormulaAllowedIds = new Map();
  for (const r of list) {
    if (r.formula?.quartal) continue;
    const k = contentKey(r);
    const prev = contentWinners.get(k);
    if (!prev) { contentWinners.set(k, r); continue; }
    const prevIsHeur = isHeuristicFormula(prev);
    const currIsHeur = isHeuristicFormula(r);
    const prevId = String(prev.formula?.id || "");
    const currId = String(r.formula?.id || "");
    const pairKey = [prevId, currId].sort().join("|");
    if (!prevIsHeur && !currIsHeur && COEXISTENCE_PAIRS.has(pairKey)) {
      // Intentional pair: both survive; record exactly which IDs are allowed
      if (!multiFormulaAllowedIds.has(k)) {
        multiFormulaAllowedIds.set(k, new Set([prevId, currId]));
      }
      continue;
    }
    const prevScore = prev.probabilityScore ?? 999;
    const currScore = r.probabilityScore ?? 999;
    const minScore = Math.min(prevScore, currScore);
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
    if (multiFormulaAllowedIds.has(k)) {
      // Only the exact IDs in the coexistence pair pass; a third explicit candidate is blocked
      if (multiFormulaAllowedIds.get(k).has(String(r.formula?.id || ""))) result.push(r);
      continue;
    }
    if (usedContentKeys.has(k)) continue;
    usedContentKeys.add(k);
    result.push(contentWinners.get(k) ?? r);
  }
  return collapseEnharmonicTwins(result);
}

function filterRareBassReadings(readings) {
  const RARE_BASS = new Set(["B#", "E#", "Cb", "Fb"]);
  const bassNote = (r) => {
    const slash = (r.name || "").lastIndexOf("/");
    return slash >= 0 ? r.name.slice(slash + 1) : null;
  };
  const pitchKey = (r) =>
    [
      r.rootPc,
      r.bassPc,
      (r.visibleIntervals || []).slice().sort((a, b) => a - b).join(","),
      (r.missingLabels || []).slice().sort().join(","),
    ].join("|");

  const cleanKeys = new Set();
  for (const r of readings) {
    const bn = bassNote(r);
    if (bn === null || !RARE_BASS.has(bn)) cleanKeys.add(pitchKey(r));
  }

  return readings.filter((r) => {
    const bn = bassNote(r);
    if (bn === null || !RARE_BASS.has(bn)) return true;
    return !cleanKeys.has(pitchKey(r));
  });
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
    if (hasCleanerExactCandidate && candidateIsMissingThirdSeventhLike(candidate)) {
      // Only penalize if there is an exact candidate from the same root+bass with at least as
      // many visible intervals — i.e. a more complete reading already covers this material.
      const candidateIntervalCount = (candidate.visibleIntervals || []).length;
      const hasMoreCompleteExact = exactCandidates.some((e) =>
        !String(e.formula?.id || "").startsWith("tertian_heuristic") &&
        e.rootPc === candidate.rootPc &&
        e.bassPc === candidate.bassPc &&
        (e.visibleIntervals || []).length >= candidateIntervalCount
      );
      if (hasMoreCompleteExact) extraPenalty += 18;
    }
    if (hasStrongBassRootFormula && candidate.bassPc !== candidate.rootPc && !candidate.formula?.quartal) {
      extraPenalty += 2.0;
    }
    candidate.rankScore = Number(((candidate.probabilityScore ?? 999) + extraPenalty).toFixed(2));
  });

  const ranked = rankChordReadings(filterRareBassReadings(dedupeRankedChordReadings(filtered))).slice(0, 12);
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
  // Fórmulas minor que tienen ui:null (uiPatch será null) → identificar por id
  if (["mmaj7", "mmaj7add13", "mmaj9"].includes(id)) return "min";
  if (quality === "min" || quality === "minmaj7") return "min";
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

function candidateActualPitchClassSet(candidate) {
  if (!candidate) return new Set();
  const root = candidate.rootPc;
  const pcs = new Set((candidate.visibleIntervals || []).map((interval) => mod12(root + interval)));
  pcs.add(candidate.bassPc);
  return pcs;
}

function candidateNonRootPitchClassSet(candidate) {
  if (!candidate) return new Set();
  const root = candidate.rootPc;
  const pcs = new Set(
    (candidate.visibleIntervals || [])
      .filter((interval) => mod12(interval) !== 0)
      .map((interval) => mod12(root + interval))
  );
  pcs.add(candidate.bassPc);
  return pcs;
}

function candidateContextUiShape(candidate) {
  const ui = candidate?.uiPatch || candidate?.formula?.ui || null;
  if (!ui) return null;
  return {
    suspension: String(ui.suspension || "none"),
    structure: String(ui.structure || ""),
    ext7: !!ui.ext7,
    ext6: !!ui.ext6,
    ext9: !!ui.ext9,
    ext11: !!ui.ext11,
    ext13: !!ui.ext13,
  };
}

function normalizeCandidateContinuityDegree(label) {
  const normalized = String(label || "").replace(/^[b#]+/, "");
  return normalized || String(label || "");
}

function candidateContinuityDegreeSet(candidate) {
  const labels = candidateVisibleDegreeLabels(candidate);
  if (labels.length) {
    return new Set(labels.map(normalizeCandidateContinuityDegree));
  }
  return new Set(Array.from(candidateContextIntervalSet(candidate)).map((interval) => String(mod12(interval))));
}

function candidateStructuralContinuityGroup(candidate) {
  if (!candidate) return "";
  if (candidate?.formula?.quartal) {
    return `quartal:${String(candidate.formula?.quartalType || "")}`;
  }
  return "tertian";
}

function symmetricDifferenceCount(aSet, bSet) {
  const union = new Set([...(aSet || []), ...(bSet || [])]);
  let diffCount = 0;
  union.forEach((value) => {
    if (!!aSet?.has(value) !== !!bSet?.has(value)) diffCount += 1;
  });
  return diffCount;
}

function candidateStructuralContinuityDistance(previousCandidate, candidate) {
  if (!previousCandidate || !candidate) return 999;
  if (candidate.rootPc !== previousCandidate.rootPc) return 999;

  const previousGroup = candidateStructuralContinuityGroup(previousCandidate);
  const nextGroup = candidateStructuralContinuityGroup(candidate);
  if (!previousGroup || previousGroup !== nextGroup) return 999;

  let score = 0;

  // Caso 3 de continuidad: desaparece la lectura exacta, pero sigue existiendo
  // otra lectura con la misma raíz y la misma "forma" armónica general aunque
  // cambie la cualidad de una sola nota estructural (3, 5, 7, 9, 11, 13...).
  score += symmetricDifferenceCount(
    candidateContinuityDegreeSet(previousCandidate),
    candidateContinuityDegreeSet(candidate)
  ) * 2;

  score += symmetricDifferenceCount(
    candidateContextIntervalSet(previousCandidate),
    candidateContextIntervalSet(candidate)
  );

  const previousShape = candidateContextUiShape(previousCandidate);
  const nextShape = candidateContextUiShape(candidate);
  if (!!previousShape !== !!nextShape) return 999;
  if (previousShape && nextShape) {
    if (previousShape.suspension !== nextShape.suspension) score += 4;
    if (previousShape.structure !== nextShape.structure) score += 4;
    if (previousShape.ext7 !== nextShape.ext7) score += 2;
    if (previousShape.ext6 !== nextShape.ext6) score += 2;
    if (previousShape.ext9 !== nextShape.ext9) score += 2;
    if (previousShape.ext11 !== nextShape.ext11) score += 2;
    if (previousShape.ext13 !== nextShape.ext13) score += 2;
  }

  score += symmetricDifferenceCount(
    new Set((previousCandidate?.missingLabels || []).map(normalizeCandidateContinuityDegree)),
    new Set((candidate?.missingLabels || []).map(normalizeCandidateContinuityDegree))
  ) * 2;

  if (candidate.bassPc !== previousCandidate.bassPc) {
    const previousBassInterval = mod12(previousCandidate.bassPc - previousCandidate.rootPc);
    const nextBassInterval = mod12(candidate.bassPc - candidate.rootPc);
    const forward = mod12(nextBassInterval - previousBassInterval);
    const backward = mod12(previousBassInterval - nextBassInterval);
    score += Math.min(forward, backward) <= 2 ? 1 : 3;
  }

  return score;
}

function candidatePitchLevelContinuityScore(previousCandidate, candidate) {
  if (!previousCandidate || !candidate) return 999;
  if (candidate.rootPc !== previousCandidate.rootPc) return 999;
  const previousGroup = candidateStructuralContinuityGroup(previousCandidate);
  const nextGroup = candidateStructuralContinuityGroup(candidate);
  if (!previousGroup || previousGroup !== nextGroup) return 999;

  const prevPcs = candidateActualPitchClassSet(previousCandidate);
  const nextPcs = candidateActualPitchClassSet(candidate);
  const prevOnly = [...prevPcs].filter((pc) => !nextPcs.has(pc));
  const nextOnly = [...nextPcs].filter((pc) => !prevPcs.has(pc));

  if (prevOnly.length === 0 && nextOnly.length === 0) return 0;
  if (prevOnly.length !== nextOnly.length) return 999;
  if (prevOnly.length > 2) return 999;

  if (prevOnly.length === 1) {
    return Math.min(mod12(nextOnly[0] - prevOnly[0]), mod12(prevOnly[0] - nextOnly[0]));
  }
  const [a, b] = prevOnly;
  const [x, y] = nextOnly;
  const cost1 = Math.min(mod12(x - a), mod12(a - x)) + Math.min(mod12(y - b), mod12(b - y));
  const cost2 = Math.min(mod12(y - a), mod12(a - y)) + Math.min(mod12(x - b), mod12(b - x));
  return Math.min(cost1, cost2);
}

function candidateRootDisplacedContinuityScore(previousCandidate, candidate) {
  if (!previousCandidate || !candidate) return 999;
  if (candidate.rootPc === previousCandidate.rootPc) return 999;
  if (candidate.bassPc !== previousCandidate.bassPc) return 999;
  const previousGroup = candidateStructuralContinuityGroup(previousCandidate);
  const nextGroup = candidateStructuralContinuityGroup(candidate);
  if (!previousGroup || previousGroup !== nextGroup) return 999;

  const rootShift = Math.min(
    mod12(candidate.rootPc - previousCandidate.rootPc),
    mod12(previousCandidate.rootPc - candidate.rootPc)
  );
  if (rootShift > 2) return 999;

  const prevNonRoot = candidateNonRootPitchClassSet(previousCandidate);
  const nextNonRoot = candidateNonRootPitchClassSet(candidate);
  const prevOnly = [...prevNonRoot].filter((pc) => !nextNonRoot.has(pc));
  const nextOnly = [...nextNonRoot].filter((pc) => !prevNonRoot.has(pc));
  const nonRootChanges = prevOnly.length + nextOnly.length;
  if (nonRootChanges > 2) return 999;

  return rootShift * 3 + nonRootChanges;
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

  const structuralContinuity = list
    .map((candidate) => ({ candidate, distance: candidateStructuralContinuityDistance(previousCandidate, candidate) }))
    .filter((entry) => entry.distance <= 3)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if ((a.candidate.rankScore ?? 999) !== (b.candidate.rankScore ?? 999)) return (a.candidate.rankScore ?? 999) - (b.candidate.rankScore ?? 999);
      return (a.candidate.score ?? 999) - (b.candidate.score ?? 999);
    })[0]?.candidate || null;
  if (structuralContinuity) return structuralContinuity;

  // Tier 1.5: misma raíz, desplazamiento cromático de pitch classes ≤ 2 semítonos.
  // Cubre cambios donde una nota se mueve 1–2 semitonos pero la etiqueta de grado
  // cambia de familia (p.ej. 13→#5) y el scoring por etiquetas supera el umbral de Tier 1.
  const pitchLevelContinuity = list
    .map((candidate) => ({ candidate, distance: candidatePitchLevelContinuityScore(previousCandidate, candidate) }))
    .filter((entry) => entry.distance <= 2)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if ((a.candidate.rankScore ?? 999) !== (b.candidate.rankScore ?? 999)) return (a.candidate.rankScore ?? 999) - (b.candidate.rankScore ?? 999);
      return (a.candidate.score ?? 999) - (b.candidate.score ?? 999);
    })[0]?.candidate || null;
  if (pitchLevelContinuity) return pitchLevelContinuity;

  // Tier 2: mismo root + misma familia + bajo diferente + ≤ 2 cambios de intervalos.
  // Diseñado para descensos cromáticos del bajo con raíz funcional preservada:
  //   Am(maj7)/G# → Am7/G → Am6/F#
  // candidateContextDistance suma +3 por cambio de bajo; si lo restamos y el resultado
  // sigue siendo ≤ 2, la continuidad armónica es clara y merece prioridad sobre la
  // lectura top genérica (C6/G, F#m7(b5)...).
  const contextualBassMove = list
    .map((candidate) => {
      if (candidate.bassPc === previousCandidate.bassPc) return null; // Mismo bajo: lo cubre Tier 3
      const d = candidateContextDistance(previousCandidate, candidate);
      if (d >= 999) return null; // Raíz o familia distintas
      // d = diffCount + 3 (bass penalty). Restamos el penalty para comparar solo intervalos.
      return { candidate, distance: d - 3 };
    })
    .filter((entry) => entry !== null && entry.distance <= 2)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if ((a.candidate.rankScore ?? 999) !== (b.candidate.rankScore ?? 999)) return (a.candidate.rankScore ?? 999) - (b.candidate.rankScore ?? 999);
      return (a.candidate.score ?? 999) - (b.candidate.score ?? 999);
    })[0]?.candidate || null;
  if (contextualBassMove) return contextualBassMove;

  // Tier 3: candidatos con distancia contextual ≤ 2 (lógica original)
  const contextual = list
    .map((candidate) => ({ candidate, distance: candidateContextDistance(previousCandidate, candidate) }))
    .filter((entry) => entry.distance <= 2)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if ((a.candidate.rankScore ?? 999) !== (b.candidate.rankScore ?? 999)) return (a.candidate.rankScore ?? 999) - (b.candidate.rankScore ?? 999);
      return (a.candidate.score ?? 999) - (b.candidate.score ?? 999);
    })[0]?.candidate || null;

  // Tier 5: raíz desplazada cromáticamente (≤ 2 semítonos), bajo preservado.
  // Cubre el caso en que la nota que funciona como raíz es la que se edita;
  // la nueva lectura puede tener una raíz distinta si las notas no-raíz se conservan.
  const rootDisplaced = list
    .map((candidate) => ({ candidate, distance: candidateRootDisplacedContinuityScore(previousCandidate, candidate) }))
    .filter((entry) => entry.distance < 999)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if ((a.candidate.rankScore ?? 999) !== (b.candidate.rankScore ?? 999)) return (a.candidate.rankScore ?? 999) - (b.candidate.rankScore ?? 999);
      return (a.candidate.score ?? 999) - (b.candidate.score ?? 999);
    })[0]?.candidate || null;
  if (rootDisplaced) return rootDisplaced;

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
  if (currentCandidate && prioritizeContext) return currentCandidate;

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

export function detectOmitFromCandidate(candidate) {
  const suffix = String(candidate?.formula?.suffix || "");
  const suspension = String(candidate?.uiPatch?.suspension || candidate?.formula?.ui?.suspension || "none");
  const missing = Array.isArray(candidate?.missingLabels) ? candidate.missingLabels : [];
  if (suffix.includes("no5") || missing.includes("5")) return "5";
  if ((suffix.includes("no3") || missing.includes("3")) && suspension === "none") return "3";
  if (suffix.includes("no1") || missing.includes("1")) return "1";
  return "none";
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
