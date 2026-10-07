/**
 * Unit tests — alteraciones de quinta y novena (definición común del acorde).
 *
 * Cubre la política del selector (chordAlterations.js), la definición común
 * (buildChordToneDefinition / chordDisplayNameFromUI / spellChordNotes con
 * degreeLabels), el plan del motor (quinta efectiva, bajos, inversiones, drops,
 * voicings reales) y la coherencia con las fórmulas del detector.
 *
 * Casos de aceptación del encargo: D7(b9), D7(#9)/E7(#9), G7(b9)/Bb7(b9),
 * Ebmaj9, Fm9, Am7(b5)/Dm7(b5), F°7 = Fdim7, G+7(b9) = G7(#5,b9), D7sus4.
 */

import { describe, expect, test } from "vitest";
import {
  allowedChordFifths,
  allowedChordNinths,
  chordAugmentedOptionState,
  chordFifthSelectorState,
  chordNinthSelectorState,
  defaultChordFifth,
  normalizeChordAlterations,
} from "./chordAlterations.js";
import { chordQualityDisplayValue, chordQualitySelectOptions, chordSuspensionSelectOptions } from "./appMusicBasics.js";
import {
  buildChordToneDefinition,
  chordDisplayNameFromUI,
  chordBassInterval,
  chordCanUseJsonCatalog,
  findChordDetectFormulaByUi,
  mod12,
  normalizeChordUiSpec,
  pcToName,
  spellChordNotes,
} from "./appMusicBasics.js";
import {
  buildChordEnginePlan,
  buildChordQualityChangePatch,
  buildChordStateNormalizationPatch,
  buildChordSuspensionChangePatch,
  buildChordControlHints,
  buildTetradEntryExtensionPatch,
  chordFifthOffsetFromUI,
  buildChordUiRestrictions,
  buildChordExtensionTogglePatch,
  computeInversionSelectorOptions,
  generateSearchVoicingsForPlan,
  actualInversionLabelFromVoicing,
} from "./appVoicingStudyCore.js";
import {
  CHORD_DETECT_FORMULAS,
  preferSharpsFromMajorTonicPc,
} from "./chordDetectionEngine.js";
import { sanitizeNearSlotValue } from "./appPatternRouteStaffCore.jsx";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const DEGREE_STEP = { 1: 0, 2: 1, 9: 1, 3: 2, 4: 3, 11: 3, 5: 4, 6: 5, 13: 5, 7: 6 };

const BASE = { ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, suspension: "none", omit: "none" };
const ui = (overrides) => ({ ...BASE, ...overrides });

function nameOf(rootPc, preferSharps, state) {
  return chordDisplayNameFromUI({ rootPc, preferSharps, ...state });
}

function spelledNotes(rootPc, preferSharps, state) {
  const definition = buildChordToneDefinition(state);
  return spellChordNotes({ rootPc, chordIntervals: definition.intervals, preferSharps, degreeLabels: definition.degreeLabels });
}

// Comprueba que cada nota deletreada usa la letra de su grado funcional y la altura correcta.
function expectFunctionalSpelling(rootPc, preferSharps, state) {
  const definition = buildChordToneDefinition(state);
  const notes = spelledNotes(rootPc, preferSharps, state);
  const rootLetterIdx = LETTERS.indexOf(pcToName(rootPc, preferSharps)[0]);
  definition.degreeLabels.forEach((label, idx) => {
    const degree = Number(String(label).replace(/^[b#]+/, ""));
    const expectedLetter = LETTERS[(rootLetterIdx + DEGREE_STEP[degree]) % 7];
    expect(notes[idx][0], `${label} sobre ${pcToName(rootPc, preferSharps)}`).toBe(expectedLetter);
    const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[notes[idx][0]];
    const accidental = notes[idx].slice(1);
    const shift = (accidental.match(/#/g) || []).length - (accidental.match(/b/g) || []).length;
    expect(mod12(natural + shift)).toBe(mod12(rootPc + definition.intervals[idx]));
  });
}

const ACCEPTANCE = [
  { id: "7(b9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, ninth: "b9" }), suffix: "7(b9)", labels: ["1", "b9", "3", "5", "b7"], intervals: [0, 1, 4, 7, 10] },
  { id: "7(#9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, ninth: "#9" }), suffix: "7(#9)", labels: ["1", "#9", "3", "5", "b7"], intervals: [0, 3, 4, 7, 10] },
  { id: "maj9", state: ui({ quality: "maj", structure: "chord", ext7: true, ext9: true }), suffix: "maj9", labels: ["1", "9", "3", "5", "7"], intervals: [0, 2, 4, 7, 11] },
  { id: "m9", state: ui({ quality: "min", structure: "chord", ext7: true, ext9: true }), suffix: "m9", labels: ["1", "9", "b3", "5", "b7"], intervals: [0, 2, 3, 7, 10] },
  { id: "m7(b5)", state: ui({ quality: "hdim", structure: "tetrad", ext7: true }), suffix: "m7(b5)", labels: ["1", "b3", "b5", "b7"], intervals: [0, 3, 6, 10] },
  { id: "dim7", state: ui({ quality: "dim", structure: "tetrad", ext7: true }), suffix: "dim7", labels: ["1", "b3", "b5", "bb7"], intervals: [0, 3, 6, 9] },
  { id: "7(#5,b9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, fifth: "#5", ninth: "b9" }), suffix: "7(#5,b9)", labels: ["1", "b9", "3", "#5", "b7"], intervals: [0, 1, 4, 8, 10] },
  { id: "7sus4", state: ui({ quality: "dom", suspension: "sus4", structure: "tetrad", ext7: true }), suffix: "7sus4", labels: ["1", "4", "5", "b7"], intervals: [0, 5, 7, 10] },
];

describe("política del selector (chordAlterations.js)", () => {
  test("quinta: ♭5/5/♯5 en todas las calidades y con suspensión (la calidad no la limita)", () => {
    for (const quality of ["maj", "dom", "min", "minmaj7", "dim", "hdim"]) {
      expect(allowedChordFifths({ quality })).toEqual(["b5", "5", "#5"]);
      expect(chordFifthSelectorState({ quality }).enabled).toBe(true);
    }
    expect(chordFifthSelectorState({ quality: "dom", suspension: "sus4" }).enabled).toBe(true);
  });

  test("novena: ♭9/9/♯9 mientras la 9 esté activa; con 3ª menor la ♯9 (= ♭3) no se ofrece", () => {
    const dom = { quality: "dom", structure: "chord", ext7: true, ext9: true };
    for (const quality of ["maj", "dom"]) {
      expect(allowedChordNinths({ ...dom, quality })).toEqual(["b9", "9", "#9"]);
      expect(allowedChordNinths({ ...dom, quality, ext7: false })).toEqual(["b9", "9", "#9"]);
    }
    for (const quality of ["min", "minmaj7", "hdim", "dim"]) {
      expect(allowedChordNinths({ ...dom, quality })).toEqual(["b9", "9"]);
    }
    expect(allowedChordNinths({ ...dom, suspension: "sus4" })).toEqual(["b9", "9", "#9"]);
    expect(allowedChordNinths({ ...dom, quality: "min", suspension: "sus4" })).toEqual(["b9", "9", "#9"]);
    expect(allowedChordNinths({ ...dom, ext9: false })).toEqual(["9"]);
    expect(allowedChordNinths({ ...dom, structure: "triad" })).toEqual(["9"]);
  });

  test("valores por defecto: la quinta sale de la calidad y la novena es natural", () => {
    expect(defaultChordFifth("maj")).toBe("5");
    expect(defaultChordFifth("hdim")).toBe("b5");
    expect(defaultChordFifth("dim")).toBe("b5");
    expect(normalizeChordAlterations({ quality: "dim", structure: "tetrad", ext7: true })).toEqual({ fifth: "b5", ninth: "9" });
    expect(normalizeChordAlterations({ quality: "dom", structure: "chord", ext7: true, ext9: true })).toEqual({ fifth: "5", ninth: "9" });
  });

  test("estado de los selectores: habilitación y ayuda", () => {
    expect(chordFifthSelectorState({ quality: "dom" }).enabled).toBe(true);
    expect(chordFifthSelectorState({ quality: "dom", omit: "5" })).toMatchObject({ enabled: false, allowed: ["5"] });
    expect(chordFifthSelectorState({ quality: "hdim", omit: "5" })).toMatchObject({ enabled: false, allowed: ["b5"] });
    expect(chordFifthSelectorState({ quality: "hdim" })).toMatchObject({ enabled: true, allowed: ["b5", "5", "#5"] });
    expect(chordNinthSelectorState({ quality: "dom", structure: "chord", ext7: true, ext9: false })).toMatchObject({ enabled: false });
    expect(chordNinthSelectorState({ quality: "dom", structure: "chord", ext7: true, ext9: false }).hint).toMatch(/Activa la extensión 9/);
    // Dominante sin 7ª: la novena sigue editable (ya no exige la 7ª).
    expect(chordNinthSelectorState({ quality: "dom", structure: "chord", ext7: false, ext9: true }).enabled).toBe(true);
    const minor = chordNinthSelectorState({ quality: "min", structure: "chord", ext7: true, ext9: true });
    expect(minor.enabled).toBe(true);
    expect(minor.options.find((o) => o.value === "#9").disabled).toBe(true);
    expect(minor.options.find((o) => o.value === "b9").disabled).toBe(false);
    expect(minor.hint).toMatch(/♭3/);
  });
});

describe("casos de aceptación en las 12 tónicas", () => {
  for (const testCase of ACCEPTANCE) {
    test(`${testCase.id}: fórmula, grados, nombre y deletreo por grado`, () => {
      for (let rootPc = 0; rootPc < 12; rootPc++) {
        for (const preferSharps of [preferSharpsFromMajorTonicPc(rootPc), true, false]) {
          const definition = buildChordToneDefinition(testCase.state);
          expect(definition.intervals).toEqual(testCase.intervals);
          expect(definition.degreeLabels).toEqual(testCase.labels);
          expect(nameOf(rootPc, preferSharps, testCase.state)).toBe(`${pcToName(rootPc, preferSharps)}${testCase.suffix}`);
          expectFunctionalSpelling(rootPc, preferSharps, testCase.state);
        }
      }
    });
  }

  test("ejemplos concretos del encargo con sus notas reales", () => {
    const [dom7b9, dom7s9, maj9, m9, m7b5, dim7, aug7b9, sus4] = ACCEPTANCE.map((c) => c.state);
    expect(spelledNotes(2, true, dom7b9)).toEqual(["D", "Eb", "F#", "A", "C"]);
    expect(spelledNotes(2, true, dom7s9)).toEqual(["D", "E#", "F#", "A", "C"]);
    expect(spelledNotes(4, true, dom7s9)).toEqual(["E", "F##", "G#", "B", "D"]);
    expect(spelledNotes(7, true, dom7b9)).toEqual(["G", "Ab", "B", "D", "F"]);
    expect(spelledNotes(10, false, dom7b9)).toEqual(["Bb", "Cb", "D", "F", "Ab"]);
    expect(spelledNotes(3, false, maj9)).toEqual(["Eb", "F", "G", "Bb", "D"]);
    expect(spelledNotes(5, false, m9)).toEqual(["F", "G", "Ab", "C", "Eb"]);
    expect(spelledNotes(9, true, m7b5)).toEqual(["A", "C", "Eb", "G"]);
    expect(spelledNotes(2, true, m7b5)).toEqual(["D", "F", "Ab", "C"]);
    expect(spelledNotes(5, false, dim7)).toEqual(["F", "Ab", "Cb", "Ebb"]);
    expect(spelledNotes(7, true, aug7b9)).toEqual(["G", "Ab", "B", "D#", "F"]);
    expect(spelledNotes(2, true, sus4)).toEqual(["D", "G", "A", "C"]);
    expect(nameOf(7, true, aug7b9)).toBe("G7(#5,b9)");
    expect(nameOf(5, false, dim7)).toBe("Fdim7");
  });

  test("♯9 conserva la 3ª mayor y no se etiqueta como ♭3", () => {
    const definition = buildChordToneDefinition(ACCEPTANCE[1].state);
    expect(definition.degreeLabels).toContain("3");
    expect(definition.degreeLabels).toContain("#9");
    expect(definition.degreeLabels).not.toContain("b3");
    expect(definition.roles[definition.intervals.indexOf(3)]).toBe("ninth");
    expect(definition.roles[definition.intervals.indexOf(4)]).toBe("third");
  });

  test("♯5 no se etiqueta como ♭13 ni ♭♭7 como 6", () => {
    const aug = buildChordToneDefinition(ui({ quality: "dom", structure: "tetrad", ext7: true, fifth: "#5" }));
    expect(aug.degreeLabels).toEqual(["1", "3", "#5", "b7"]);
    expect(aug.roles[aug.intervals.indexOf(8)]).toBe("fifth");
    const dim = buildChordToneDefinition(ui({ quality: "dim", structure: "chord", ext7: true }));
    expect(dim.degreeLabels).toEqual(["1", "b3", "b5", "bb7"]);
    expect(dim.roles[dim.intervals.indexOf(9)]).toBe("seventh");
  });

  test("Menor + sus4 + 7 es D7sus4 (Re–Sol–La–Do), no Dm7(add11)", () => {
    const minSus = ui({ quality: "min", suspension: "sus4", structure: "tetrad", ext7: true });
    expect(nameOf(2, true, minSus)).toBe("D7sus4");
    expect(spelledNotes(2, true, minSus)).toEqual(["D", "G", "A", "C"]);
    const madd11 = ui({ quality: "min", structure: "chord", ext7: true, ext11: true });
    expect(nameOf(2, true, madd11)).toBe("Dm7(add11)");
    expect(spelledNotes(2, true, madd11)).toEqual(["D", "F", "G", "A", "C"]);
  });
});

describe("nombres canónicos de alteraciones y combinaciones", () => {
  const dom9 = ui({ quality: "dom", structure: "chord", ext7: true, ext9: true });
  test("cambio 9 → ♭9 → ♯9", () => {
    expect(nameOf(2, true, { ...dom9, ninth: "9" })).toBe("D9");
    expect(nameOf(2, true, { ...dom9, ninth: "b9" })).toBe("D7(b9)");
    expect(nameOf(2, true, { ...dom9, ninth: "#9" })).toBe("D7(#9)");
  });

  test("cambio de quinta y combinación ♯5 + ♭9", () => {
    const dom7 = ui({ quality: "dom", structure: "tetrad", ext7: true });
    expect(nameOf(7, true, { ...dom7, fifth: "b5" })).toBe("G7(b5)");
    expect(nameOf(7, true, { ...dom7, fifth: "#5" })).toBe("G7(#5)");
    expect(nameOf(7, true, { ...dom9, fifth: "#5" })).toBe("G9(#5)");
    expect(nameOf(7, true, { ...dom9, fifth: "#5", ninth: "b9" })).toBe("G7(#5,b9)");
    expect(nameOf(7, true, { ...dom9, fifth: "b5", ninth: "#9" })).toBe("G7(b5,#9)");
  });

  test("tríadas y cuatriadas mayores alteradas", () => {
    expect(nameOf(0, false, ui({ quality: "maj", structure: "triad", fifth: "#5" }))).toBe("Caug");
    expect(nameOf(0, false, ui({ quality: "maj", structure: "triad", fifth: "b5" }))).toBe("C(b5)");
    expect(nameOf(0, false, ui({ quality: "maj", structure: "tetrad", ext7: true, fifth: "#5" }))).toBe("Cmaj7(#5)");
    expect(nameOf(0, false, ui({ quality: "maj", structure: "tetrad", ext7: true, fifth: "b5" }))).toBe("Cmaj7(b5)");
  });

  test("13 con ♭9, 7sus4(♭9) y 9sus4", () => {
    expect(nameOf(2, true, { ...dom9, ext13: true, ninth: "b9" })).toBe("D13(b9)");
    const sus = ui({ quality: "dom", suspension: "sus4", structure: "chord", ext7: true, ext9: true });
    expect(nameOf(2, true, sus)).toBe("D9sus4");
    expect(nameOf(2, true, { ...sus, ninth: "b9" })).toBe("D7sus4(b9)");
    expect(nameOf(2, true, { ...sus, ext13: true })).toBe("D13sus4");
  });

  test("ø9 → m9(b5) y dim7 con 9 → dim7(add9)", () => {
    expect(nameOf(9, true, ui({ quality: "hdim", structure: "chord", ext7: true, ext9: true }))).toBe("Am9(b5)");
    expect(nameOf(9, true, ui({ quality: "hdim", structure: "chord", ext7: true, ext9: true, ext11: true }))).toBe("Am11(b5)");
    expect(nameOf(5, false, ui({ quality: "dim", structure: "chord", ext7: true, ext9: true }))).toBe("Fdim7(add9)");
    expect(nameOf(5, false, ui({ quality: "dim", structure: "chord", ext7: true, ext9: true, ext11: true }))).toBe("Fdim7(add9,11)");
  });

  test("regresiones: maj9, m9, m7(b5), dim7 y suspendidos sin alteraciones", () => {
    expect(nameOf(3, false, ACCEPTANCE[2].state)).toBe("Ebmaj9");
    expect(nameOf(5, false, ACCEPTANCE[3].state)).toBe("Fm9");
    expect(nameOf(9, true, ACCEPTANCE[4].state)).toBe("Am7(b5)");
    expect(nameOf(5, false, ACCEPTANCE[5].state)).toBe("Fdim7");
    expect(nameOf(0, false, ui({ quality: "maj", suspension: "sus2", structure: "triad" }))).toBe("Csus2");
    expect(nameOf(0, false, ui({ quality: "maj", suspension: "sus4", structure: "triad", ext6: true }))).toBe("Csus4(add6)");
    expect(nameOf(0, false, ui({ quality: "maj", suspension: "sus4", structure: "chord", ext6: true }))).toBe("Csus4(add6)");
    expect(nameOf(0, false, ui({ quality: "maj", suspension: "sus4", structure: "chord", ext9: true }))).toBe("Csus4(add9)");
    expect(nameOf(0, false, ui({ quality: "dom", suspension: "sus2", structure: "tetrad", ext7: true }))).toBe("C7sus2");
  });
});

describe("transiciones: el estado nunca contradice lo visible", () => {
  const dom = ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, fifth: "#5", ninth: "#9" });

  test("cambiar a Menor desde D7(#5,#9) (combo Aumentada): la ♯5 de Aumentada no se arrastra y la ♯9 (= ♭3) vuelve a 9", () => {
    expect(buildChordStateNormalizationPatch({ ...dom, quality: "min" })).toEqual({ ninth: "9" });
    const minor = { ...dom, ...buildChordQualityChangePatch(dom, "min") };
    const settled = { ...minor, ...buildChordStateNormalizationPatch(minor) };
    expect(settled).toMatchObject({ quality: "min", fifth: "5", ninth: "9" });
    expect(nameOf(2, true, settled)).toBe("Dm9");
  });

  test("cambiar a sus4 conserva quinta y novena alteradas (sin 3ª la ♯9 no coincide con nada)", () => {
    expect(buildChordStateNormalizationPatch({ ...dom, suspension: "sus4" })).toEqual({});
    expect(nameOf(2, true, { ...dom, suspension: "sus4" })).toBe("D7sus4(#5,#9)");
  });

  test("Omitir 5 retira la quinta alterada; apagar la 9 retira su variante", () => {
    expect(buildChordStateNormalizationPatch({ ...dom, omit: "5" })).toEqual({ fifth: "5" });
    expect(buildChordStateNormalizationPatch({ ...dom, ext9: false })).toEqual({ ninth: "9" });
    expect(buildChordExtensionTogglePatch({ structure: "chord", ext: "9", value: false })).toEqual({ ext9: false, ninth: "9" });
  });

  test("tríada: sin novena posible", () => {
    expect(buildChordStateNormalizationPatch({ ...dom, structure: "triad", ext7: false, ext9: false })).toMatchObject({ ninth: "9" });
  });

  test("dim7: 6/13 se desactivan (misma altura que bb7) y el selector lo explica", () => {
    expect(buildChordStateNormalizationPatch(ui({ quality: "dim", structure: "chord", ext7: true, ext13: true, fifth: "b5", ninth: "9" }))).toEqual({ ext13: false });
    const restrictions = buildChordUiRestrictions({ quality: "dim", structure: "chord", ext7: true });
    expect(restrictions.ext.canToggleSix).toBe(false);
    expect(restrictions.ext.canToggleThirteen).toBe(false);
    expect(restrictions.ext.sixThirteenBlockedByDim7).toBe(true);
    const dimTriad = buildChordUiRestrictions({ quality: "dim", structure: "chord", ext7: false });
    expect(dimTriad.ext.canToggleThirteen).toBe(true);
  });

  test("elegir dim o m7(b5) retira la suspensión; elegir otra calidad la conserva", () => {
    expect(buildChordQualityChangePatch({ suspension: "sus4" }, "hdim")).toEqual({ quality: "hdim", suspension: "none" });
    expect(buildChordQualityChangePatch({ suspension: "sus4" }, "dim")).toEqual({ quality: "dim", suspension: "none" });
    expect(buildChordQualityChangePatch({ suspension: "sus4" }, "dom")).toEqual({ quality: "dom" });
  });

  test("configuración antigua sin campos nuevos: misma interpretación que antes", () => {
    const legacy = { quality: "dom", structure: "chord", ext7: true, ext9: true, ext6: false, ext11: false, ext13: false, suspension: "none", omit: "none" };
    expect(normalizeChordUiSpec(legacy)).toMatchObject({ fifth: "5", ninth: "9" });
    expect(buildChordToneDefinition(legacy).intervals).toEqual([0, 2, 4, 7, 10]);
    expect(nameOf(2, true, legacy)).toBe("D9");
    const legacyDim = { ...legacy, quality: "hdim", ext9: false };
    expect(normalizeChordUiSpec(legacyDim).fifth).toBe("b5");
  });

  test("slots restaurados: alteraciones válidas se conservan; ausentes no se heredan del slot previo", () => {
    const fallback = { enabled: true, family: "tertian", rootPc: 0, quality: "dom", suspension: "none", structure: "chord", inversion: "all", ext7: true, ext6: false, ext9: true, ext11: false, ext13: false, fifth: "#5", ninth: "b9", maxDist: 4, omit: "none", spellPreferSharps: false, allowOpenStrings: false, selFrets: null };
    const restored = sanitizeNearSlotValue({ ...fallback, fifth: "b5", ninth: "#9" }, fallback);
    expect(restored).toMatchObject({ fifth: "b5", ninth: "#9" });
    const legacySlot = { ...fallback };
    delete legacySlot.fifth;
    delete legacySlot.ninth;
    const fromLegacy = sanitizeNearSlotValue(legacySlot, fallback);
    expect(fromLegacy.fifth).toBeUndefined();
    expect(fromLegacy.ninth).toBeUndefined();
    expect(normalizeChordUiSpec(fromLegacy)).toMatchObject({ fifth: "5", ninth: "9" });
    expect(sanitizeNearSlotValue({ ...fallback, fifth: "x", ninth: 9 }, fallback)).toMatchObject({ fifth: undefined, ninth: undefined });
  });
});

describe("motor: omisiones, bajo, inversiones, drops y voicings reales", () => {
  test("cuatriada con Omitir: D7(b9,no5) y rootless D7(b9,no1) (sin forzar 5 notas en 4)", () => {
    const tetrad = ui({ quality: "dom", structure: "tetrad", ext7: true, ext9: true, ninth: "b9" });
    expect(buildChordToneDefinition({ ...tetrad, omit: "5" }).intervals).toEqual([0, 1, 4, 10]);
    expect(nameOf(2, true, { ...tetrad, omit: "5" })).toBe("D7(b9,no5)");
    expect(buildChordToneDefinition({ ...tetrad, omit: "1" }).intervals).toEqual([1, 4, 7, 10]);
    expect(nameOf(2, true, { ...tetrad, omit: "1" })).toBe("D7(b9,no1)");
    // Sin omisión la cuatriada no admite 7ª + 9: el selector no lo permite.
    expect(buildChordUiRestrictions({ quality: "dom", structure: "tetrad", ext7: true, ext9: false }).ext.canToggleNine).toBe(false);
  });

  test("Acorde con 7ª y 9ª alterada tiene cinco grados", () => {
    const plan = buildChordEnginePlan({ rootPc: 2, ...ACCEPTANCE[0].state, inversion: "all", form: "open" });
    expect(plan.intervals).toHaveLength(5);
    expect(plan.layer).toBe("extended");
    expect(plan.generator).toBe("exact");
  });

  test("quinta alterada efectiva en plan, bajo e inversión (2ª inversión = ♯5)", () => {
    const state = ui({ quality: "dom", structure: "tetrad", ext7: true, fifth: "#5" });
    // Posición abierta: la cuatriada cerrada apenas cabe en la guitarra (también G7 natural).
    const plan = buildChordEnginePlan({ rootPc: 7, ...state, inversion: "2", form: "open" });
    expect(plan.fifthOffset).toBe(8);
    expect(plan.bassInterval).toBe(8);
    expect(chordBassInterval({ ...state, inversion: "2" })).toBe(8);
    const labels = computeInversionSelectorOptions(plan).map((o) => o.label);
    expect(labels).toEqual(["Fundamental", "1ª inversión", "2ª inversión", "3ª inversión", "Todas"]);
    const voicings = generateSearchVoicingsForPlan({ plan, maxFret: 15, maxSpan: 4 });
    expect(voicings.length).toBeGreaterThan(0);
    for (const voicing of voicings) {
      expect(mod12(voicing.bassPc - 7)).toBe(8);
      expect(actualInversionLabelFromVoicing(plan, voicing)).toBe("2ª inversión");
    }
  });

  test("drop 2 compatible con 7(♯5); no con 7 + 9 alterada (5 grados)", () => {
    const state = ui({ quality: "dom", structure: "tetrad", ext7: true, fifth: "#5" });
    const plan = buildChordEnginePlan({ rootPc: 7, ...state, inversion: "root", form: "drop2_set2" });
    expect(plan.generator).toBe("drop");
    const voicings = generateSearchVoicingsForPlan({ plan, maxFret: 15, maxSpan: 5 });
    expect(voicings.length).toBeGreaterThan(0);
    for (const voicing of voicings) {
      expect(new Set(voicing.notes.map((n) => mod12(n.pc - 7)))).toEqual(new Set([0, 4, 8, 10]));
    }
    const nineB9 = buildChordUiRestrictions(ACCEPTANCE[0].state);
    expect(nineB9.dropEligible).toBe(false);
  });

  // Cuerdas al aire solo en una tónica: la sustitución por cuerdas al aire es la parte
  // más costosa y su lógica es independiente de la alteración.
  test("voicings reales: cada posición contiene exactamente la fórmula alterada", { timeout: 20000 }, () => {
    for (const testCase of [ACCEPTANCE[0], ACCEPTANCE[1], ACCEPTANCE[6]]) {
      for (const rootPc of [2, 7, 10]) {
        const plan = buildChordEnginePlan({ rootPc, ...testCase.state, inversion: "all", form: "open" });
        const voicings = generateSearchVoicingsForPlan({ plan, maxFret: 15, maxSpan: 5, allowOpenStrings: rootPc === 7 });
        expect(voicings.length, `${testCase.id} en ${pcToName(rootPc, false)}`).toBeGreaterThan(0);
        for (const voicing of voicings) {
          const rel = new Set(voicing.notes.map((n) => mod12(n.pc - rootPc)));
          expect([...rel].sort((a, b) => a - b)).toEqual(testCase.intervals);
        }
      }
    }
  });

  test("sin posiciones válidas el plan lo indica (no sustituye el acorde)", () => {
    const plan = buildChordEnginePlan({ rootPc: 7, ...ACCEPTANCE[6].state, inversion: "all", form: "open" });
    const voicings = generateSearchVoicingsForPlan({ plan, maxFret: 3, maxSpan: 2 });
    expect(voicings).toEqual([]);
    expect(plan.intervals).toEqual([0, 1, 4, 8, 10]);
  });

  test("las alteraciones no usan el catálogo JSON (usa el generador exacto)", () => {
    expect(chordCanUseJsonCatalog(ui({ quality: "dom", structure: "chord", ext7: true, ext9: true }))).toBe(true);
    expect(chordCanUseJsonCatalog(ACCEPTANCE[0].state)).toBe(false);
    expect(chordCanUseJsonCatalog(ui({ quality: "dom", structure: "chord", ext7: true, fifth: "#5" }))).toBe(false);
  });
});

describe("coherencia con las fórmulas del detector", () => {
  // Omisión implícita en el sufijo de la fórmula (igual que detectOmitFromCandidate).
  const omitFromSuffix = (formula) => (/no5/.test(formula.suffix) ? "5" : /no3/.test(formula.suffix) ? "3" : /no1/.test(formula.suffix) ? "1" : "none");

  test("cada fórmula con ui reproduce sus intervalos y grados con la definición común", () => {
    const withUi = CHORD_DETECT_FORMULAS.filter((formula) => formula.ui);
    expect(withUi.length).toBeGreaterThan(20);
    for (const formula of withUi) {
      const definition = buildChordToneDefinition({ ...formula.ui, omit: omitFromSuffix(formula) });
      const formulaPairs = formula.intervals.map((interval, idx) => `${mod12(interval)}:${formula.degreeLabels[idx]}`).sort();
      const definitionPairs = definition.intervals.map((interval, idx) => `${interval}:${definition.degreeLabels[idx]}`).sort();
      expect(definitionPairs, formula.id).toEqual(formulaPairs);
    }
  });

  test("las fórmulas alteradas del encargo existen y se encuentran desde la UI", () => {
    expect(findChordDetectFormulaByUi(ACCEPTANCE[0].state)?.id).toBe("7flat9");
    expect(findChordDetectFormulaByUi(ACCEPTANCE[1].state)?.id).toBe("7sharp9");
    expect(findChordDetectFormulaByUi(ACCEPTANCE[6].state)?.id).toBe("7sharp5flat9");
    expect(findChordDetectFormulaByUi(ui({ quality: "dom", structure: "tetrad", ext7: true, fifth: "#5" }))?.id).toBe("7sharp5");
    expect(findChordDetectFormulaByUi(ui({ quality: "dom", structure: "tetrad", ext7: true, fifth: "b5" }))?.id).toBe("7flat5");
    // Sin alteraciones sigue encontrando la fórmula natural.
    expect(findChordDetectFormulaByUi(ui({ quality: "dom", structure: "chord", ext7: true, ext9: true }))?.id).toBe("9");
  });
});

// ── Menor con ♭5: tríada disminuida y m7(♭5) sin convertir la calidad ─────────
describe("Menor con ♭5 (equivalente a Disminuido / Semidisminuido)", () => {
  const STRUCTURES = ["triad", "tetrad", "chord"];
  const base = (overrides = {}) => ({
    rootPc: 9, preferSharps: false, quality: "maj", suspension: "none", structure: "tetrad",
    ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none",
    inversion: "all", form: "open", fifth: "5", ninth: "9", ...overrides,
  });
  // Mismo flujo que los paneles: cada acción aplica su patch y después la normalización.
  const settle = (state) => ({ ...state, ...buildChordStateNormalizationPatch(state) });
  const toQuality = (state, quality) => settle({ ...state, ...buildChordQualityChangePatch(state, quality) });

  test.each(STRUCTURES)("%s: Menor → 7 → ♭5 y Menor → ♭5 → 7 llegan al mismo Am7(b5) con 7ª menor", (structure) => {
    const minor = toQuality(settle(base({ structure })), "min");
    const seventhFirst = settle({ ...settle({ ...minor, ext7: true }), fifth: "b5" });
    const flatFiveFirst = settle({ ...settle({ ...minor, fifth: "b5" }), ext7: true });
    expect(seventhFirst).toEqual(flatFiveFirst);
    // La selección sigue siendo Menor con ♭5: no se convierte en dim/ø.
    expect(flatFiveFirst.quality).toBe("min");
    expect(flatFiveFirst.fifth).toBe("b5");
    expect(buildChordStateNormalizationPatch(flatFiveFirst)).toEqual({});
    const definition = buildChordToneDefinition(flatFiveFirst);
    expect(definition.intervals).toEqual([0, 3, 6, 10]);
    expect(definition.degreeLabels).toEqual(["1", "b3", "b5", "b7"]);
    expect(definition.degreeLabels).not.toContain("bb7");
    expect(chordDisplayNameFromUI(flatFiveFirst)).toBe("Am7(b5)");
  });

  test.each(STRUCTURES)("%s: Menor → ♭5 sin 7ª es la tríada disminuida (Adim); quitar la 7ª vuelve a Adim", (structure) => {
    const minor = toQuality(settle(base({ structure })), "min");
    const triad = settle({ ...minor, fifth: "b5" });
    expect(buildChordToneDefinition(triad).degreeLabels).toEqual(["1", "b3", "b5"]);
    expect(chordDisplayNameFromUI(triad)).toBe("Adim");
    const withSeventh = settle({ ...triad, ext7: true });
    const withoutSeventh = settle({ ...withSeventh, ext7: false });
    expect(chordDisplayNameFromUI(withoutSeventh)).toBe("Adim");
    expect(withoutSeventh.quality).toBe("min");
  });

  test("en las 12 tónicas: Menor+♭5 se nombra como dim sin 7ª y como m7(b5) con 7ª", () => {
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      const preferSharps = preferSharpsFromMajorTonicPc(rootPc);
      const root = pcToName(rootPc, preferSharps);
      const minor = base({ rootPc, preferSharps, quality: "min", fifth: "b5" });
      expect(chordDisplayNameFromUI({ ...minor, ext7: false })).toBe(`${root}dim`);
      expect(chordDisplayNameFromUI({ ...minor, ext7: true })).toBe(`${root}m7(b5)`);
    }
  });

  // Equivalencia completa con la calidad existente en todas las formas (drops incluidos).
  const FORMS = ["open", "closed", "drop2_set1", "drop2_set2", "drop2_set3", "drop3_set1", "drop3_set2", "drop24_set1", "drop24_set2"];
  const INVERSIONS = ["all", "root", "1", "2", "3"];
  const EXTENSIONS = [
    {}, { ext7: true }, { ext7: true, ext9: true }, { ext7: true, ext11: true }, { ext7: true, ext13: true },
    { ext7: true, ext9: true, ext11: true }, { ext6: true }, { ext9: true }, { ext9: true, ext11: true },
  ];
  test("plan, nombre, catálogo, inversiones y digitaciones idénticos a ø (con 7ª) y dim (sin 7ª)", { timeout: 60000 }, () => {
    let compared = 0;
    for (const structure of STRUCTURES) for (const ext of EXTENSIONS) for (const omit of ["none", "1", "3"]) {
      if (structure === "triad" && (ext.ext9 || ext.ext11 || ext.ext13)) continue;
      for (const form of FORMS) for (const inversion of INVERSIONS) {
        const minor = base({ quality: "min", fifth: "b5", structure, ext7: false, ...ext, omit, form, inversion });
        const hasSeventh = !!minor.ext7;
        const reference = { ...minor, quality: hasSeventh ? "hdim" : "dim" };
        const a = buildChordEnginePlan(minor);
        const b = buildChordEnginePlan(reference);
        expect(chordDisplayNameFromUI(minor)).toBe(chordDisplayNameFromUI(reference));
        expect(buildChordToneDefinition(minor).degreeLabels).toEqual(buildChordToneDefinition(reference).degreeLabels);
        expect(chordCanUseJsonCatalog(minor)).toBe(chordCanUseJsonCatalog(reference));
        expect([a.generator, a.layer, a.quality, a.bassInterval, a.topVoiceOffset, a.intervals.join(",")])
          .toEqual([b.generator, b.layer, b.quality, b.bassInterval, b.topVoiceOffset, b.intervals.join(",")]);
        expect(computeInversionSelectorOptions(a)).toEqual(computeInversionSelectorOptions(b));
        expect(buildChordUiRestrictions(minor).ext).toEqual(buildChordUiRestrictions(reference).ext);
        if (a.generator !== "json" && inversion !== "all") {
          const frets = (plan) => generateSearchVoicingsForPlan({ plan, maxFret: 15, maxSpan: 5 }).map((v) => v.frets);
          expect(frets(a)).toEqual(frets(b));
        }
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });

  test("los drops de m7(b5) existen y coinciden con Semidisminuido", () => {
    for (const form of ["drop2_set1", "drop2_set2", "drop3_set1", "drop24_set1"]) {
      const minor = base({ quality: "min", fifth: "b5", ext7: true, form, inversion: "root" });
      const plan = buildChordEnginePlan(minor);
      expect(plan.generator).toBe("drop");
      const voicings = generateSearchVoicingsForPlan({ plan, maxFret: 15, maxSpan: 6 });
      expect(voicings.length).toBeGreaterThan(0);
      const reference = generateSearchVoicingsForPlan({ plan: buildChordEnginePlan({ ...minor, quality: "hdim" }), maxFret: 15, maxSpan: 6 });
      expect(voicings.map((v) => v.frets)).toEqual(reference.map((v) => v.frets));
    }
  });

  test("cambios de calidad: la ♭5 implícita de dim/ø no se arrastra; la explícita se conserva si cabe", () => {
    const hdim = settle(base({ quality: "hdim", fifth: "b5", ext7: true }));
    expect(hdim.fifth).toBe("b5");
    const minor = toQuality(hdim, "min");
    expect(minor.fifth).toBe("5");
    expect(chordDisplayNameFromUI(minor)).toBe("Am7");
    const dimTriad = settle(base({ quality: "dim", fifth: "b5" }));
    expect(chordDisplayNameFromUI(toQuality(dimTriad, "min"))).toBe("Am");

    // Am7(b5) se muestra como Semidisminuido: su ♭5 va implícita y no se arrastra.
    const minorFlatFive = settle(base({ quality: "min", fifth: "b5", ext7: true }));
    expect(chordDisplayNameFromUI(toQuality(minorFlatFive, "maj"))).toBe("Amaj7");
    expect(chordDisplayNameFromUI(toQuality(minorFlatFive, "dom"))).toBe("A7");
    const minMaj = toQuality(minorFlatFive, "minmaj7");
    expect(minMaj.fifth).toBe("5");
    expect(chordDisplayNameFromUI(minMaj)).toBe("Am(maj7)");
    // Elegir Semidisminuido desde Menor+♭5 mantiene el mismo acorde.
    expect(chordDisplayNameFromUI(toQuality(minorFlatFive, "hdim"))).toBe("Am7(b5)");
    // Con suspensión la quinta sigue siendo editable y se conserva.
    const sus = settle({ ...minorFlatFive, suspension: "sus4" });
    expect(sus.fifth).toBe("b5");
    expect(chordDisplayNameFromUI(sus)).toBe("A7sus4(b5)");
  });

  test("selector de quinta: editable en Menor, m(maj7) y Semidisminuido (la calidad no lo bloquea)", () => {
    for (const quality of ["min", "minmaj7", "hdim", "dim"]) {
      const fifth = buildChordUiRestrictions(base({ quality, ext7: true })).alterations.fifth;
      expect(fifth.enabled).toBe(true);
      expect(fifth.options.filter((o) => !o.disabled).map((o) => o.value)).toEqual(["b5", "5", "#5"]);
    }
  });

  test("Acordes cercanos: el slot conserva Menor+♭5 al sanear y al normalizar", () => {
    const slot = sanitizeNearSlotValue({ enabled: true, family: "tertian", rootPc: 9, quality: "min", suspension: "none", structure: "tetrad", ext7: true, fifth: "b5", ninth: "9" }, {});
    expect(slot.quality).toBe("min");
    expect(slot.fifth).toBe("b5");
    expect(buildChordStateNormalizationPatch(slot)).toEqual({});
    expect(chordDisplayNameFromUI({ ...slot, preferSharps: false })).toBe("Am7(b5)");
    // Cambio de calidad del slot con el mismo patch que usa NearChordSlot: al pasar
    // por Semidisminuido la ♭5 queda implícita en ø y al volver a Menor da m7.
    const viaHdim = toQuality({ ...slot, preferSharps: false }, "hdim");
    expect(chordDisplayNameFromUI(viaHdim)).toBe("Am7(b5)");
    const backToMinor = toQuality(viaHdim, "min");
    expect(backToMinor.fifth).toBe("5");
    expect(chordDisplayNameFromUI(backToMinor)).toBe("Am7");
  });

  test("Disminuido sin 7ª con adds se nombra dim (antes A6 / Aadd9,11)", () => {
    expect(chordDisplayNameFromUI(base({ quality: "dim", fifth: "b5", ext6: true }))).toBe("Adim(add6)");
    expect(chordDisplayNameFromUI(base({ quality: "dim", fifth: "b5", structure: "triad", ext6: true }))).toBe("Adim(add6)");
    expect(chordDisplayNameFromUI(base({ quality: "dim", fifth: "b5", structure: "chord", ext7: false, ext6: true }))).toBe("Adim(add6)");
    expect(chordDisplayNameFromUI(base({ quality: "dim", fifth: "b5", structure: "chord", ext7: false, ext9: true, ext11: true }))).toBe("Adim(add9,11)");
    expect(chordDisplayNameFromUI(base({ quality: "min", fifth: "b5", ext6: true }))).toBe("Adim(add6)");
  });
});

// ── Calidad, Quinta y Novena sincronizadas ───────────────────────────────────
// La calidad base guardada fija 3ª y tipo de 7ª; el combo muestra la opción que
// corresponde a las notas reales y la quinta/novena nunca quedan bloqueadas por
// la calidad. Mismo flujo que los paneles: patch de la acción + normalización.
describe("Calidad, Quinta y Novena sincronizadas (ida y vuelta)", () => {
  const settle = (state) => ({ ...state, ...buildChordStateNormalizationPatch(state) });
  const pick = (state, quality) => settle({ ...state, ...buildChordQualityChangePatch(state, quality) });
  const set = (state, patch) => settle({ ...state, ...patch });
  const start = (overrides = {}) => settle({
    rootPc: 9, preferSharps: false, quality: "maj", suspension: "none", structure: "chord",
    ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none",
    inversion: "all", form: "open", fifth: "5", ninth: "9", ...overrides,
  });
  const view = (state) => ({
    combo: chordQualityDisplayValue(state),
    name: chordDisplayNameFromUI(state),
    labels: buildChordToneDefinition(state).degreeLabels.join(","),
    fifthEditable: buildChordUiRestrictions(state).alterations.fifth.enabled,
  });

  test.each(["chord", "tetrad"])("%s — desde Menor: Am7 → ♭5 → Am7(b5) (combo Semidisminuido) → 5 → Am7 (combo Menor)", (structure) => {
    const am7 = pick(start({ structure }), "min");
    expect(view(am7)).toEqual({ combo: "min", name: "Am7", labels: "1,b3,5,b7", fifthEditable: true });
    const half = set(am7, { fifth: "b5" });
    expect(view(half)).toEqual({ combo: "hdim", name: "Am7(b5)", labels: "1,b3,b5,b7", fifthEditable: true });
    expect(half.quality).toBe("min");
    const back = set(half, { fifth: "5" });
    expect(view(back)).toEqual(view(am7));
    expect(back).toEqual(am7);
  });

  test.each(["chord", "tetrad"])("%s — desde Semidisminuido: Am7(b5) → 5 → Am7 (combo Menor, 7ª menor) → ♭5 → Am7(b5)", (structure) => {
    const half = pick(start({ structure }), "hdim");
    expect(view(half)).toEqual({ combo: "hdim", name: "Am7(b5)", labels: "1,b3,b5,b7", fifthEditable: true });
    const minor = set(half, { fifth: "5" });
    expect(view(minor)).toEqual({ combo: "min", name: "Am7", labels: "1,b3,5,b7", fifthEditable: true });
    expect(minor.quality).toBe("hdim");
    const back = set(minor, { fifth: "b5" });
    expect(back).toEqual(half);
  });

  test.each(["triad", "tetrad", "chord"])("%s — Menor → ♭5 antes de la 7 → Adim (combo Disminuido) → activar 7 → Am7(b5), nunca Adim7", (structure) => {
    const minor = set(pick(start({ structure }), "min"), { ext7: false });
    const dimTriad = set(minor, { fifth: "b5" });
    expect(view(dimTriad)).toMatchObject({ combo: "dim", name: "Adim", labels: "1,b3,b5" });
    const seventh = set(dimTriad, { ext7: true });
    expect(view(seventh)).toMatchObject({ combo: "hdim", name: "Am7(b5)", labels: "1,b3,b5,b7" });
    expect(buildChordToneDefinition(seventh).degreeLabels).not.toContain("bb7");
    // Y se deshace desde los mismos controles.
    expect(view(set(set(seventh, { ext7: false }), { fifth: "5" }))).toMatchObject({ combo: "min", name: "Am" });
  });

  test("Am7 → ♭9 conserva 3ª y 7ª menores (sigue en Menor, no pasa a Dominante) y vuelve a Am9", () => {
    const am9 = set(pick(start(), "min"), { ext9: true });
    expect(view(am9)).toMatchObject({ combo: "min", name: "Am9" });
    const flatNine = set(am9, { ninth: "b9" });
    expect(view(flatNine)).toMatchObject({ combo: "min", name: "Am7(b9)", labels: "1,b9,b3,5,b7" });
    expect(set(flatNine, { ninth: "9" })).toEqual(am9);
    // Igual desde Semidisminuido: Am9(b5) → ♭9 → Am7(b5,b9) → 9.
    const halfNine = set(pick(start(), "hdim"), { ext9: true });
    expect(view(halfNine).name).toBe("Am9(b5)");
    expect(view(set(halfNine, { ninth: "b9" }))).toMatchObject({ combo: "hdim", name: "Am7(b5,b9)" });
  });

  test("la novena es editable con la 9 activa en todas las calidades, también sin 7ª; con 3ª menor sin ♯9", () => {
    for (const quality of ["maj", "dom", "min", "minmaj7", "dim", "hdim"]) {
      for (const ext7 of [true, false]) {
        const state = set(pick(start(), quality), { ext7, ext9: true });
        const ninth = buildChordUiRestrictions(state).alterations.ninth;
        expect(ninth.enabled).toBe(true);
        const enabled = ninth.options.filter((o) => !o.disabled).map((o) => o.value);
        expect(enabled).toEqual(["min", "minmaj7", "dim", "hdim"].includes(quality) ? ["b9", "9"] : ["b9", "9", "#9"]);
      }
    }
  });

  test("sin calidad propia en el combo se muestra la de su 3ª y su 7ª y la alteración va en el nombre", () => {
    expect(view(set(pick(start(), "min"), { fifth: "#5" }))).toMatchObject({ combo: "min", name: "Am7(#5)" });
    expect(view(set(pick(start(), "minmaj7"), { fifth: "b5" }))).toMatchObject({ combo: "minmaj7", name: "Am(maj7,b5)" });
    expect(view(set(pick(start(), "minmaj7"), { fifth: "#5" }))).toMatchObject({ combo: "minmaj7", name: "Am(maj7,#5)" });
    expect(view(set(pick(start({ structure: "tetrad" }), "dim"), { fifth: "#5" }))).toMatchObject({ combo: "dim", name: "Adim7(#5)", labels: "1,b3,#5,bb7" });
    // La base Semidisminuido no se usa como etiqueta cuando contradice la quinta.
    expect(view(set(pick(start(), "hdim"), { fifth: "#5" }))).toMatchObject({ combo: "min", name: "Am7(#5)", labels: "1,b3,#5,b7" });
    expect(view(set(pick(start({ structure: "triad", ext7: false }), "min"), { fifth: "#5" }))).toMatchObject({ combo: "min", name: "Am(#5)" });
    expect(view(set(pick(start({ suspension: "sus4" }), "dom"), { fifth: "#5" }))).toMatchObject({ combo: "dom", name: "A7sus4(#5)" });
  });

  test("las alteraciones nunca reescriben la calidad base ni las demás notas", () => {
    for (const quality of ["maj", "dom", "min", "minmaj7", "dim", "hdim"]) {
      for (const fifth of ["b5", "5", "#5"]) {
        const state = set(pick(start({ structure: "tetrad" }), quality), { fifth });
        expect(state.quality).toBe(quality);
        expect(state.fifth).toBe(fifth);
        expect(buildChordStateNormalizationPatch(state)).toEqual({});
        const labels = buildChordToneDefinition(state).degreeLabels;
        const third = ["maj", "dom"].includes(quality) ? "3" : "b3";
        const seventh = { maj: "7", minmaj7: "7", dim: "bb7" }[quality] || "b7";
        expect(labels).toContain(third);
        expect(labels).toContain(seventh);
        expect(labels).toContain(fifth);
      }
    }
  });

  test("elegir una calidad en el combo deja ver exactamente esa opción", () => {
    const half = set(pick(start(), "min"), { fifth: "b5" });
    for (const quality of ["maj", "dom", "min", "minmaj7", "dim", "hdim"]) {
      expect(chordQualityDisplayValue(pick(half, quality))).toBe(quality);
    }
    // La quinta se conserva solo si con ella el combo sigue mostrando la opción elegida:
    // Am7(#5) → Mayor daría Aumentada, así que vuelve a la 5 (Amaj7).
    const sharp = set(pick(start(), "min"), { fifth: "#5" });
    expect(view(pick(sharp, "maj")).name).toBe("Amaj7");
    expect(view(pick(sharp, "hdim")).name).toBe("Am7(b5)");
    const flatFiveMajor = set(pick(start({ rootPc: 0 }), "maj"), { fifth: "b5" });
    expect(view(pick(flatFiveMajor, "dom"))).toMatchObject({ combo: "dom", name: "C7(b5)" });
  });

  test("Acordes cercanos: el mismo slot sincroniza calidad y conserva la base al guardar", () => {
    const slot = sanitizeNearSlotValue({ enabled: true, family: "tertian", rootPc: 9, quality: "hdim", suspension: "none", structure: "tetrad", ext7: true, fifth: "5", ninth: "9" }, {});
    expect(slot).toMatchObject({ quality: "hdim", fifth: "5" });
    expect(chordQualityDisplayValue(slot)).toBe("min");
    expect(chordDisplayNameFromUI({ ...slot, preferSharps: false })).toBe("Am7");
    expect(buildChordStateNormalizationPatch(slot)).toEqual({});
  });
});

// ── Recorrido ♭5 → ♯5 → 5 → ♭5 y calidad Aumentada ──────────────────────────
describe("Calidad visible según las notas reales y opción Aumentada", () => {
  const settle = (state) => ({ ...state, ...buildChordStateNormalizationPatch(state) });
  const pick = (state, quality) => settle({ ...state, ...buildChordQualityChangePatch(state, quality) });
  const set = (state, patch) => settle({ ...state, ...patch });
  const start = (overrides = {}) => settle({
    rootPc: 9, preferSharps: false, quality: "maj", suspension: "none", structure: "chord",
    ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none",
    inversion: "all", form: "open", fifth: "5", ninth: "9", ...overrides,
  });
  const view = (state) => {
    const definition = buildChordToneDefinition(state);
    return {
      combo: chordQualityDisplayValue(state),
      name: chordDisplayNameFromUI(state),
      labels: definition.degreeLabels.join(","),
      notes: spellChordNotes({ rootPc: state.rootPc, chordIntervals: definition.intervals, preferSharps: state.preferSharps, degreeLabels: definition.degreeLabels }).join(" "),
    };
  };
  const TOUR = [
    ["b5", { combo: "hdim", name: "Am7(b5)", labels: "1,b3,b5,b7", notes: "A C Eb G" }],
    ["#5", { combo: "min", name: "Am7(#5)", labels: "1,b3,#5,b7", notes: "A C E# G" }],
    ["5", { combo: "min", name: "Am7", labels: "1,b3,5,b7", notes: "A C E G" }],
    ["b5", { combo: "hdim", name: "Am7(b5)", labels: "1,b3,b5,b7", notes: "A C Eb G" }],
  ];

  test.each(["min", "hdim"])("recorrido ♭5 → ♯5 → 5 → ♭5 desde %s: combo, nombre, grados y notas coinciden", (quality) => {
    let state = pick(start(), quality);
    for (const [fifth, expected] of TOUR) {
      state = set(state, { fifth });
      expect(view(state)).toEqual(expected);
      expect(state.quality).toBe(quality); // la base (tipo de 7ª) no cambia
    }
  });

  test.each([
    ["Mayor tríada", "maj", false, { combo: "aug", name: "Caug", labels: "1,3,#5", notes: "C E G#" }, { combo: "maj", name: "C" }],
    ["Mayor con 7", "maj", true, { combo: "aug", name: "Cmaj7(#5)", labels: "1,3,#5,7", notes: "C E G# B" }, { combo: "maj", name: "Cmaj7" }],
    ["Dominante", "dom", true, { combo: "aug", name: "C7(#5)", labels: "1,3,#5,b7", notes: "C E G# Bb" }, { combo: "dom", name: "C7" }],
  ])("%s → ♯5 muestra Aumentada conservando la 7ª; → 5 vuelve a su calidad", (label, quality, ext7, sharp, back) => {
    const base = pick(start({ rootPc: 0, ext7 }), quality);
    const augmented = set(base, { fifth: "#5" });
    expect(view(augmented)).toEqual(sharp);
    expect(augmented.quality).toBe(quality);
    expect(view(set(augmented, { fifth: "5" }))).toMatchObject(back);
  });

  test.each([
    ["Mayor tríada", "maj", false, "Caug", "1,3,#5"],
    ["Cmaj7", "maj", true, "Cmaj7(#5)", "1,3,#5,7"],
    ["C7", "dom", true, "C7(#5)", "1,3,#5,b7"],
    ["Cm7 (♭7 conservada)", "min", true, "C7(#5)", "1,3,#5,b7"],
    ["Cm(maj7) (7ª mayor conservada)", "minmaj7", true, "Cmaj7(#5)", "1,3,#5,7"],
    ["Cm tríada", "min", false, "Caug", "1,3,#5"],
  ])("elegir Aumentada directamente desde %s: 3ª mayor, ♯5 y la misma 7ª", (label, quality, ext7, name, labels) => {
    const augmented = pick(pick(start({ rootPc: 0, ext7 }), quality), "aug");
    expect(view(augmented)).toMatchObject({ combo: "aug", name, labels });
    expect(augmented.fifth).toBe("#5");
    expect(["maj", "dom"]).toContain(augmented.quality); // Aumentada no se guarda
  });

  test("Aumentada no decide la 7ª: desde Cm (♭7 latente) activar la 7 da C7(#5); desde C (7ª mayor) da Cmaj7(#5)", () => {
    const fromMinor = pick(pick(start({ rootPc: 0, ext7: false }), "min"), "aug");
    expect(view(set(fromMinor, { ext7: true })).name).toBe("C7(#5)");
    const fromMajor = pick(pick(start({ rootPc: 0, ext7: false }), "maj"), "aug");
    expect(view(set(fromMajor, { ext7: true })).name).toBe("Cmaj7(#5)");
  });

  test("con 3ª menor la ♯5 sigue siendo de Menor (no Aumentada)", () => {
    expect(view(set(pick(start({ rootPc: 0, ext7: false }), "min"), { fifth: "#5" }))).toMatchObject({ combo: "min", name: "Cm(#5)", labels: "1,b3,#5" });
    expect(view(set(pick(start({ rootPc: 0 }), "min"), { fifth: "#5" }))).toMatchObject({ combo: "min", name: "Cm7(#5)" });
  });

  test("desde Aumentada, elegir Mayor o Dominante deja ver esa opción con la 5 justa", () => {
    const augmented = pick(start({ rootPc: 0 }), "aug");
    expect(view(pick(augmented, "maj"))).toMatchObject({ combo: "maj", name: "Cmaj7" });
    expect(view(pick(augmented, "dom"))).toMatchObject({ combo: "dom", name: "C7" });
    expect(view(pick(augmented, "min"))).toMatchObject({ combo: "min", name: "Cm7" });
  });

  test("Aumentada no se guarda: el estado guardado y saneado nunca usa 'aug'", () => {
    const slot = sanitizeNearSlotValue({ enabled: true, family: "tertian", rootPc: 0, quality: "aug", structure: "triad", fifth: "#5" }, { quality: "maj" });
    expect(slot.quality).toBe("maj");
    expect(chordQualityDisplayValue(slot)).toBe("aug");
    // Si llega un estado externo con "aug", equivale a Mayor con ♯5.
    expect(normalizeChordUiSpec({ quality: "aug", structure: "triad" })).toMatchObject({ uiQuality: "maj", fifth: "#5", displayQuality: "aug" });
  });

  test("Dominante y m7(b5) elegidos en Acorde activan la 7ª (regla compartida por ambos paneles)", () => {
    const triad = start({ rootPc: 0, ext7: false });
    expect(pick(triad, "dom")).toMatchObject({ quality: "dom", ext7: true });
    expect(pick(triad, "hdim")).toMatchObject({ quality: "hdim", ext7: true, fifth: "b5" });
    expect(pick(triad, "min").ext7).toBe(false);
  });
});

// ── Aumentada conserva la séptima: con ♭♭7 (o sin quinta) no se aplica ────────
// Disminuido con 7ª pediría 1–3–♯5–♭♭7, que el constructor aún no representa: la
// opción se deshabilita con su explicación y elegirla no cambia nada (nunca pasa
// a ♭7 en silencio). Con "Omitir 5" no hay quinta que aumentar.
describe("Aumentada desde Disminuido con 7ª y con Omitir 5", () => {
  const settle = (state) => ({ ...state, ...buildChordStateNormalizationPatch(state) });
  const pick = (state, quality) => settle({ ...state, ...buildChordQualityChangePatch(state, quality) });
  const start = (overrides = {}) => settle({
    rootPc: 0, preferSharps: false, quality: "maj", suspension: "none", structure: "tetrad",
    ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none",
    inversion: "all", form: "open", fifth: "5", ninth: "9", ...overrides,
  });
  const augOption = (state) => chordQualitySelectOptions(state).find((option) => option.value === "aug");
  const labelsOf = (state) => buildChordToneDefinition(state).degreeLabels.join(",");

  test.each([
    ["Cdim7 (cuatriada)", { structure: "tetrad", ext7: true }, "b5"],
    ["Cdim7 (acorde)", { structure: "chord", ext7: true }, "b5"],
    ["Cdim7(♮5)", { structure: "tetrad", ext7: true }, "5"],
    ["Cdim7(#5)", { structure: "tetrad", ext7: true }, "#5"],
  ])("%s: Aumentada deshabilitada y explicada; elegirla no cambia la ♭♭7", (_, overrides, fifth) => {
    const dim7 = settle({ ...pick(start(overrides), "dim"), fifth });
    const before = { name: chordDisplayNameFromUI(dim7), labels: labelsOf(dim7) };
    expect(before.labels).toContain("bb7");
    const option = augOption(dim7);
    expect(option.disabled).toBe(true);
    expect(option.label).toBe("Aumentada (el constructor no admite ♭♭7)");
    expect(option.title).toMatch(/^Limitación del constructor/);
    expect(option.title).toContain("1–3–♯5–♭♭7");
    expect(buildChordQualityChangePatch(dim7, "aug")).toEqual({});
    const after = pick(dim7, "aug");
    expect({ name: chordDisplayNameFromUI(after), labels: labelsOf(after) }).toEqual(before);
    expect(after.quality).toBe("dim");
  });

  test("sin 7ª (Cdim tríada) Aumentada está disponible y da Caug", () => {
    const dim = pick(start({ structure: "triad", ext7: false }), "dim");
    expect(augOption(dim).disabled).toBe(false);
    const augmented = pick(dim, "aug");
    expect(chordDisplayNameFromUI(augmented)).toBe("Caug");
    expect(labelsOf(augmented)).toBe("1,3,#5");
  });

  test("al quitar la 7 de Cdim7 la opción se habilita; con la 7 vuelve a deshabilitarse", () => {
    const dim7 = pick(start({ structure: "chord", ext7: true }), "dim");
    expect(augOption(dim7).disabled).toBe(true);
    expect(augOption(settle({ ...dim7, ext7: false })).disabled).toBe(false);
  });

  test.each([["min", "C7(#5)", "1,3,#5,b7"], ["hdim", "C7(#5)", "1,3,#5,b7"], ["minmaj7", "Cmaj7(#5)", "1,3,#5,7"]])(
    "desde %s con 7ª Aumentada conserva su séptima: %s", (quality, name, labels) => {
      const state = pick(start(), quality);
      expect(augOption(state).disabled).toBe(false);
      const augmented = pick(state, "aug");
      expect(chordDisplayNameFromUI(augmented)).toBe(name);
      expect(labelsOf(augmented)).toBe(labels);
    });

  test("con Omitir 5 Aumentada se deshabilita (no hay quinta) y elegirla no cambia nada", () => {
    const noFifth = pick(start({ omit: "5" }), "dom");
    const option = augOption(noFifth);
    expect(option.disabled).toBe(true);
    expect(option.title).toMatch(/Omitir 5/);
    expect(buildChordQualityChangePatch(noFifth, "aug")).toEqual({});
  });

  test("Dominante y m7(b5) siguen deshabilitadas en tríada sin 7ª (regla compartida por ambos paneles)", () => {
    const options = chordQualitySelectOptions(start({ structure: "triad", ext7: false }));
    expect(options.filter((option) => option.disabled).map((option) => option.value).sort()).toEqual(["dom", "hdim"]);
  });

  test("chordAugmentedOptionState: la limitación se explica como del constructor, no como imposibilidad", () => {
    const state = chordAugmentedOptionState({ quality: "dim", hasSeventh: true });
    expect(state).toMatchObject({ enabled: false, reason: "bb7" });
    expect(state.hint).not.toMatch(/no existe|imposible/i);
    expect(chordAugmentedOptionState({ quality: "dim", hasSeventh: false }).enabled).toBe(true);
    expect(chordAugmentedOptionState({ quality: "dom", hasSeventh: true, omit: "5" })).toMatchObject({ enabled: false, reason: "omit5" });
  });
});

// ── Suspensión: sustituye la 3ª y conserva quinta, séptima y extensiones ──────
// Antes, sus2/sus4 desde Disminuido o Semidisminuido pasaban a Mayor con 5ª justa
// (Cm7(b5) → Cmaj7sus4: ♭5 y ♭7 perdidas) y al quitarla no volvía el acorde.
describe("Suspensión: conserva quinta, séptima y extensiones (ida y vuelta)", () => {
  const settle = (state) => ({ ...state, ...buildChordStateNormalizationPatch(state) });
  const pick = (state, quality) => settle({ ...state, ...buildChordQualityChangePatch(state, quality) });
  const suspend = (state, suspension) => settle({ ...state, ...buildChordSuspensionChangePatch(state, suspension) });
  const start = (overrides = {}) => settle({
    rootPc: 0, preferSharps: false, quality: "maj", suspension: "none", structure: "tetrad",
    ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none",
    inversion: "all", form: "open", fifth: "5", ninth: "9", ...overrides,
  });
  const view = (state) => {
    const definition = buildChordToneDefinition(state);
    return {
      name: chordDisplayNameFromUI(state),
      labels: definition.degreeLabels.join(","),
      notes: spellChordNotes({ rootPc: state.rootPc, chordIntervals: definition.intervals, preferSharps: false, degreeLabels: definition.degreeLabels }).join(" "),
    };
  };
  const SUSPENDED_HALF_DIM = {
    sus4: { name: "C7sus4(b5)", labels: "1,4,b5,b7", notes: "C F Gb Bb" },
    sus2: { name: "C7sus2(b5)", labels: "1,2,b5,b7", notes: "C D Gb Bb" },
  };

  for (const structure of ["tetrad", "chord"]) {
    for (const suspension of ["sus4", "sus2"]) {
      test(`${structure}: Cm7(b5) → ${suspension} → ${SUSPENDED_HALF_DIM[suspension].name} → sin sus vuelve exactamente a Cm7(b5)`, () => {
        const halfDim = pick(start({ structure }), "hdim");
        expect(view(halfDim)).toEqual({ name: "Cm7(b5)", labels: "1,b3,b5,b7", notes: "C Eb Gb Bb" });
        const suspended = suspend(halfDim, suspension);
        expect(view(suspended)).toEqual(SUSPENDED_HALF_DIM[suspension]);
        expect(suspended.quality).toBe("hdim");
        expect(view(suspended).labels).not.toMatch(/(^|,)7(,|$)/); // nunca 7ª mayor
        const back = suspend(suspended, "none");
        expect(back).toEqual(halfDim);
      });
    }
  }

  test("Menor + 7 + ♭5 (Am7(b5) construido desde Menor) suspende igual y vuelve a Menor con ♭5", () => {
    const minorFlatFive = settle({ ...pick(start(), "min"), fifth: "b5" });
    const suspended = suspend(minorFlatFive, "sus4");
    expect(view(suspended)).toEqual(SUSPENDED_HALF_DIM.sus4);
    expect(suspend(suspended, "none")).toEqual(minorFlatFive);
  });

  test.each(["triad", "tetrad", "chord"])("%s: Cdim → sus4/sus2 → Csus4(b5)/Csus2(b5) → vuelve a Cdim", (structure) => {
    const dim = pick(start({ structure, ext7: false }), "dim");
    expect(view(dim).name).toBe("Cdim");
    for (const [suspension, name, labels] of [["sus4", "Csus4(b5)", "1,4,b5"], ["sus2", "Csus2(b5)", "1,2,b5"]]) {
      const suspended = suspend(dim, suspension);
      expect(view(suspended)).toMatchObject({ name, labels });
      expect(suspend(suspended, "none")).toEqual(dim);
    }
  });

  test.each(["tetrad", "chord"])("%s: Cdim7 → sus2/sus4 no se aplica (♭♭7 no representable) y nunca pasa a 7ª mayor", (structure) => {
    const dim7 = pick(start({ structure }), "dim");
    expect(view(dim7).labels).toBe("1,b3,b5,bb7");
    for (const suspension of ["sus4", "sus2"]) {
      expect(buildChordSuspensionChangePatch(dim7, suspension)).toEqual({});
      expect(suspend(dim7, suspension)).toEqual(dim7);
    }
    const options = chordSuspensionSelectOptions(dim7);
    expect(options.filter((option) => option.disabled).map((option) => option.value)).toEqual(["sus2", "sus4"]);
    expect(options.find((option) => option.value === "sus4").label).toBe("sus4 (el constructor no admite ♭♭7)");
    expect(options.find((option) => option.value === "sus4").title).toMatch(/^Limitación del constructor/);
  });

  test("Disminuido suspendido: la 7 no se puede activar (sería ♭♭7) ni la activa entrar en cuatriada", () => {
    const suspendedDim = suspend(pick(start({ structure: "chord", ext7: false }), "dim"), "sus4");
    const plan = buildChordEnginePlan(suspendedDim);
    expect(plan.ui.ext.canToggleSeven).toBe(false);
    expect(plan.ui.ext.sevenBlockedBySuspendedDim).toBe(true);
    expect(buildTetradEntryExtensionPatch(suspendedDim).ext7).toBe(false);
    expect(buildTetradEntryExtensionPatch({ ...suspendedDim, quality: "dom" }).ext7).toBe(true);
    expect(buildChordControlHints(suspendedDim).extensions.map((hint) => hint.term)).toEqual(["7"]);
  });

  test("un estado externo Disminuido + sus + 7 conserva la ♭♭7 y recupera la 3ª (nunca 7ª mayor)", () => {
    const external = settle({ ...pick(start(), "dim"), suspension: "sus4" });
    expect(external.suspension).toBe("none");
    expect(view(external)).toMatchObject({ name: "Cdim7", labels: "1,b3,b5,bb7" });
  });

  test.each([
    ["Cm9(b5) ⇄ C9sus4(b5)", { structure: "chord", ext9: true }, "hdim", "9", "C9sus4(b5)", "1,9,4,b5,b7"],
    ["Cm7(b5,b9) ⇄ C7sus4(b5,b9)", { structure: "chord", ext9: true }, "hdim", "b9", "C7sus4(b5,b9)", "1,b9,4,b5,b7"],
  ])("extensiones conservadas: %s", (_, overrides, quality, ninth, name, labels) => {
    const chord = settle({ ...pick(start(overrides), quality), ninth });
    const suspended = suspend(chord, "sus4");
    expect(view(suspended)).toMatchObject({ name, labels });
    expect(suspend(suspended, "none")).toEqual(chord);
  });

  test("con «Omitir 3» la suspensión no se aplica (no hay tercera) y la omisión no se pierde", () => {
    const noThird = settle({ ...pick(start(), "dom"), omit: "3" });
    expect(buildChordSuspensionChangePatch(noThird, "sus4")).toEqual({});
    const options = chordSuspensionSelectOptions(noThird);
    expect(options.filter((option) => option.disabled).map((option) => option.value)).toEqual(["sus2", "sus4"]);
    expect(options.find((option) => option.value === "sus2").title).toMatch(/Omitir 3/);
  });

  test.each(["maj", "dom", "min", "minmaj7"])("%s: la ida y vuelta por sus4/sus2 sigue sin cambios", (quality) => {
    for (const structure of ["tetrad", "chord", "triad"]) {
      const chord = pick(start({ structure, ext7: structure !== "triad" }), quality);
      for (const suspension of ["sus4", "sus2"]) {
        const suspended = suspend(chord, suspension);
        expect(suspended.quality).toBe(chord.quality);
        expect(suspend(suspended, "none")).toEqual(chord);
      }
    }
  });

  test("la quinta efectiva respeta la quinta alterada también con suspensión", () => {
    expect(chordFifthOffsetFromUI("hdim", "sus4", "b5")).toBe(6);
    expect(chordFifthOffsetFromUI("dom", "sus4", "#5")).toBe(8);
    expect(chordFifthOffsetFromUI("hdim", "sus4", undefined)).toBe(7);
    expect(chordFifthOffsetFromUI("dim", "none", undefined)).toBe(6);
  });

  test("explicaciones de opciones deshabilitadas agrupadas por control (consultables en móvil)", () => {
    const dim7 = pick(start(), "dim");
    const hints = buildChordControlHints(dim7);
    expect(hints.qualitySus.map((hint) => hint.term)).toEqual(["Aumentada", "sus2 y sus4"]);
    expect(hints.extensions.map((hint) => hint.term)).toEqual(["6 y 13"]);
    const minorNinth = { ...pick(start({ structure: "chord", ext9: true }), "min") };
    expect(buildChordControlHints(minorNinth).alterations.map((hint) => hint.term)).toEqual(["♯9"]);
    expect(buildChordControlHints(pick(start({ structure: "chord", ext9: true }), "dom"))).toEqual({ qualitySus: [], alterations: [], extensions: [] });
  });
});
