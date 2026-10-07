/**
 * Copia desde "Investigar en mástil" hacia Acordes y Acordes cercanos sin
 * pérdida de alteraciones.
 *
 * - Los ejemplos del encargo se detectan con su nombre canónico y su uiPatch
 *   lleva la quinta y la novena alteradas.
 * - El patch de Acordes reproduce el patrón físico copiado (el voicing existe en
 *   el plan alterado) y el de Acordes cercanos conserva alteraciones y omisión.
 * - Invariante global: ninguna lectura copiable pierde ni añade notas al pasar
 *   al constructor (salvo los grados que la propia lectura declara ausentes).
 */

import { describe, expect, test } from "vitest";
import { detectChordReadings, detectOmitFromCandidate, mod12 } from "../../music/chordDetectionEngine.js";
import { buildChordToneDefinition, buildManualSelectionVoicing, chordDisplayNameFromUI, normalizeChordUiSpec } from "../../music/appMusicBasics.js";
import { buildChordEnginePlan, generateSearchVoicingsForPlan } from "../../music/appVoicingStudyCore.js";
import { buildChordBuilderPatchFromDetectedCandidate } from "./chordDetectionCopyCore.js";
import { buildNearSlotPatchFromDetectedCandidate } from "../near-chords/copyToNearSlot.js";

const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // sIdx 0 = 1ª (Mi agudo) … 5 = 6ª (Mi grave)

// "x5454x" (6ª→1ª) → notas seleccionadas como en el mástil.
function selectionFromFrets(frets) {
  return [...frets].map((ch, idx) => {
    if (ch === "x") return null;
    const sIdx = 5 - idx;
    const fret = parseInt(ch, 36);
    const pitch = OPEN_MIDI[sIdx] + fret;
    return { sIdx, fret, pitch, pc: mod12(pitch) };
  }).filter(Boolean);
}

function readingsFor(frets) {
  return detectChordReadings(selectionFromFrets(frets));
}

function soundingIntervals(candidate) {
  return [...new Set((candidate.visibleIntervals || []).map(mod12))].sort((a, b) => a - b);
}

function missingIntervals(candidate) {
  const formula = candidate.formula || {};
  return (candidate.missingLabels || [])
    .map((label) => formula.intervals?.[formula.degreeLabels?.indexOf(label)])
    .filter((x) => x != null)
    .map(mod12);
}

function definitionFor(candidate) {
  return buildChordToneDefinition({ ...candidate.uiPatch, omit: detectOmitFromCandidate(candidate) });
}

async function copyPatchFor(candidate, frets) {
  const selection = selectionFromFrets(frets);
  const manual = buildManualSelectionVoicing(selection, candidate.uiPatch.rootPc, 15);
  return buildChordBuilderPatchFromDetectedCandidate({
    candidate,
    manualCopiedVoicing: manual,
    detectedInversion: null,
    nextAllowOpenStrings: true,
    copiedHasOpenStrings: false,
    wantedFrets: manual.frets,
    requiredMaxDist: 5,
    chordMaxDist: 4,
    maxFret: 15,
    baseCatalogVoicings: [],
    fetchCatalogVoicings: async () => [],
  });
}

// Cada ejemplo toma una digitación real generada por el plan del constructor,
// la lee con el detector y la copia de vuelta: el ciclo debe cerrarse sin pérdidas.
const ui = (o) => ({ suspension: "none", ext6: false, ext9: false, ext11: false, ext13: false, omit: "none", ...o });
const EXAMPLES = [
  { rootPc: 2, name: "D7(b9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, ninth: "b9" }) },
  { rootPc: 2, name: "D7(b9,no5)", state: ui({ quality: "dom", structure: "tetrad", ext7: true, ext9: true, ninth: "b9", omit: "5" }) },
  { rootPc: 2, name: "D7(#9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, ninth: "#9" }) },
  { rootPc: 4, name: "E7(#9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, ninth: "#9" }) },
  { rootPc: 4, name: "E7(#9,no5)", state: ui({ quality: "dom", structure: "tetrad", ext7: true, ext9: true, ninth: "#9", omit: "5" }) },
  { rootPc: 7, name: "G7(b9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, ninth: "b9" }) },
  { rootPc: 10, name: "Bb7(b9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, ninth: "b9" }) },
  { rootPc: 7, name: "G7(#5,b9)", state: ui({ quality: "dom", structure: "chord", ext7: true, ext9: true, fifth: "#5", ninth: "b9" }) },
  { rootPc: 7, name: "G7(#5)", state: ui({ quality: "dom", structure: "tetrad", ext7: true, fifth: "#5" }) },
  { rootPc: 0, name: "C7(b5)", state: ui({ quality: "dom", structure: "tetrad", ext7: true, fifth: "b5" }) },
  { rootPc: 3, name: "Ebmaj9", state: ui({ quality: "maj", structure: "chord", ext7: true, ext9: true }) },
  { rootPc: 5, name: "Fm9", state: ui({ quality: "min", structure: "chord", ext7: true, ext9: true }) },
  { rootPc: 9, name: "Am7(b5)", state: ui({ quality: "hdim", structure: "tetrad", ext7: true }) },
  { rootPc: 2, name: "Dm7(b5)", state: ui({ quality: "hdim", structure: "tetrad", ext7: true }) },
  { rootPc: 5, name: "Fdim7", state: ui({ quality: "dim", structure: "tetrad", ext7: true }) },
  { rootPc: 2, name: "D7sus4", state: ui({ quality: "dom", suspension: "sus4", structure: "tetrad", ext7: true }) },
];

function rootPositionVoicingFor(example) {
  const plan = buildChordEnginePlan({ rootPc: example.rootPc, ...example.state, inversion: "root", form: "open" });
  const voicings = generateSearchVoicingsForPlan({ plan, maxFret: 15, maxSpan: 5 });
  return voicings.find((v) => mod12(v.bassPc - example.rootPc) === 0) || null;
}

describe("detección → constructor: ejemplos del encargo", () => {
  for (const example of EXAMPLES) {
    test(`${example.name}: digitación real → detector → constructor sin perder alteraciones`, async () => {
      const voicing = rootPositionVoicingFor(example);
      expect(voicing, "el plan debe ofrecer una posición fundamental").toBeTruthy();
      const frets = voicing.frets;
      const readings = readingsFor(frets);
      const candidate = readings.find((r) => r.name === example.name);
      expect(candidate, `${frets} → ${readings.slice(0, 5).map((r) => r.name).join(" | ")}`).toBeTruthy();
      const expected = normalizeChordUiSpec(example.state);
      expect(normalizeChordUiSpec({ ...candidate.uiPatch, omit: detectOmitFromCandidate(candidate) })).toMatchObject({
        quality: expected.quality,
        suspension: expected.suspension,
        fifth: expected.fifth,
        ninth: expected.ninth,
        omit: expected.omit,
      });

      // El constructor reproduce exactamente las notas de la lectura.
      expect(definitionFor(candidate).intervals).toEqual(soundingIntervals(candidate));

      // Copia a Acordes: el patrón físico existe en el plan alterado.
      const patch = await copyPatchFor(candidate, frets);
      expect(patch.family).toBe("tertian");
      expect(patch.omit).toBe(expected.omit);
      expect(normalizeChordUiSpec(patch)).toMatchObject({ fifth: expected.fifth, ninth: expected.ninth });
      expect(patch.copiedEntry?.voicing?.frets).toBe(frets);
      expect(buildChordToneDefinition(patch).intervals).toEqual(buildChordToneDefinition(example.state).intervals);

      // Copia a Acordes cercanos: mismas alteraciones y omisión.
      const nearPatch = buildNearSlotPatchFromDetectedCandidate(candidate);
      expect(normalizeChordUiSpec(nearPatch)).toMatchObject({ quality: expected.quality, fifth: expected.fifth, ninth: expected.ninth, omit: expected.omit });
      expect(buildChordToneDefinition(nearPatch).intervals).toEqual(buildChordToneDefinition(example.state).intervals);
    });
  }

  test("la b2 de un dominante se nombra b9 (nunca addb2) en las 12 tónicas", () => {
    for (let t = 0; t < 12; t++) {
      const notes = [0, 4, 7, 10, 13].map((interval, idx) => ({ pc: mod12(t + interval), pitch: 48 + t + interval + idx * 0 }));
      const names = detectChordReadings(notes).map((r) => r.name);
      expect(names[0], names.join(" | ")).toMatch(/7\(b9\)$/);
      expect(names.some((n) => n.includes("addb2") && n.startsWith(names[0].replace(/7\(b9\)$/, "")))).toBe(false);
    }
  });
});

describe("invariante: copiar una lectura nunca pierde ni inventa notas", () => {
  // Generador determinista (LCG) de selecciones de 3 a 6 notas.
  function* randomSelections(count) {
    let seed = 20261006;
    const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };
    for (let i = 0; i < count; i++) {
      const size = 3 + (next() % 4);
      const pitches = new Set();
      const base = 40 + (next() % 12);
      pitches.add(base);
      while (pitches.size < size) pitches.add(base + 1 + (next() % 24));
      yield [...pitches].sort((a, b) => a - b).map((pitch) => ({ pc: mod12(pitch), pitch }));
    }
  }

  test("en 1000 selecciones, toda lectura terciana copiable reproduce exactamente sus notas", { timeout: 60000 }, () => {
    let checked = 0;
    const failures = [];
    for (const selection of randomSelections(1000)) {
      for (const candidate of detectChordReadings(selection)) {
        if (!candidate.uiPatch || candidate.uiPatch.family) continue;
        if (candidate.formula?.quartal) continue;
        checked++;
        const definition = definitionFor(candidate);
        const sounding = soundingIntervals(candidate);
        const allowedExtra = new Set([...sounding, ...missingIntervals(candidate)]);
        const lost = sounding.filter((interval) => !definition.intervals.includes(interval));
        const invented = definition.intervals.filter((interval) => !allowedExtra.has(interval));
        if (lost.length || invented.length) {
          failures.push(`${candidate.name} [${candidate.formula?.id}] sonando ${sounding} → constructor ${definition.intervals}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(failures.slice(0, 10)).toEqual([]);
  });
});

// ── Copias habilitadas: ♭9/♯9 fuera de Dominante y m(maj7,♭5), en las 12 tónicas ─
describe("detección → Acordes y Acordes cercanos: combinaciones que antes no se podían copiar", () => {
  const NEW_COPIES = [
    { suffix: "m7(b9)", state: ui({ quality: "min", structure: "chord", ext7: true, ext9: true, ninth: "b9" }) },
    { suffix: "m7(b5,b9)", state: ui({ quality: "hdim", structure: "chord", ext7: true, ext9: true, ninth: "b9" }) },
    { suffix: "maj7(#9)", state: ui({ quality: "maj", structure: "chord", ext7: true, ext9: true, ninth: "#9" }) },
    { suffix: "maj7(b9)", state: ui({ quality: "maj", structure: "chord", ext7: true, ext9: true, ninth: "b9" }) },
    { suffix: "m(maj7,b5)", state: ui({ quality: "minmaj7", structure: "tetrad", ext7: true, fifth: "b5" }) },
  ];
  for (const example of NEW_COPIES) {
    test(`${example.suffix}: en las 12 tónicas el ciclo digitación → detector → Acordes/cercanos reproduce las notas`, async () => {
      let checked = 0;
      for (let rootPc = 0; rootPc < 12; rootPc++) {
        const voicing = rootPositionVoicingFor({ rootPc, state: example.state });
        if (!voicing) continue;
        const frets = voicing.frets;
        const readings = readingsFor(frets);
        const candidate = readings.find((r) => r.rootPc === rootPc && r.name.replace(/^[A-G][b#]?/, "") === example.suffix);
        expect(candidate, `${rootPc} ${frets} → ${readings.slice(0, 5).map((r) => r.name).join(" | ")}`).toBeTruthy();
        expect(candidate.uiPatch).toBeTruthy();
        expect(definitionFor(candidate).intervals).toEqual(soundingIntervals(candidate));
        const patch = await copyPatchFor(candidate, frets);
        expect(patch.copiedEntry?.voicing?.frets).toBe(frets);
        expect(buildChordToneDefinition(patch).intervals).toEqual(buildChordToneDefinition(example.state).intervals);
        expect(buildChordToneDefinition(patch).degreeLabels).toEqual(buildChordToneDefinition(example.state).degreeLabels);
        const nearPatch = buildNearSlotPatchFromDetectedCandidate(candidate);
        expect(buildChordToneDefinition(nearPatch).intervals).toEqual(buildChordToneDefinition(example.state).intervals);
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(10);
    });
  }
});

// ── Menor con ♯5 (alternativa de la lectura ♭13): copia exacta en las 12 tónicas ─
describe("detección → Acordes y Acordes cercanos: m(#5), m7(#5) y m(maj7,#5)", () => {
  const SHARP_FIFTH_COPIES = [
    { suffix: "m(#5)", state: ui({ quality: "min", structure: "triad", ext7: false, fifth: "#5" }) },
    { suffix: "m7(#5)", state: ui({ quality: "min", structure: "tetrad", ext7: true, fifth: "#5" }) },
    { suffix: "m(maj7,#5)", state: ui({ quality: "minmaj7", structure: "tetrad", ext7: true, fifth: "#5" }) },
  ];
  const nameOf = (state) => chordDisplayNameFromUI({ ...state, preferSharps: !!state.spellPreferSharps });
  for (const example of SHARP_FIFTH_COPIES) {
    test(`${example.suffix}: en las 12 tónicas digitación → detector → Acordes/cercanos con las mismas notas, grados y nombre`, async () => {
      let checked = 0;
      for (let rootPc = 0; rootPc < 12; rootPc++) {
        const voicing = rootPositionVoicingFor({ rootPc, state: example.state });
        expect(voicing, `sin posición fundamental para ${rootPc}`).toBeTruthy();
        const frets = voicing.frets;
        const readings = readingsFor(frets);
        const candidate = readings.find((r) => r.rootPc === rootPc && r.name.replace(/^[A-G][b#]?/, "") === example.suffix);
        expect(candidate, `${rootPc} ${frets} → ${readings.map((r) => r.name).join(" | ")}`).toBeTruthy();
        expect(candidate.formula.sharpFifthAlternative).toBe(true);
        expect(definitionFor(candidate).intervals).toEqual(soundingIntervals(candidate));

        const expected = buildChordToneDefinition(example.state);
        const patch = await copyPatchFor(candidate, frets);
        expect(patch.copiedEntry?.voicing?.frets).toBe(frets);
        expect(buildChordToneDefinition(patch).intervals).toEqual(expected.intervals);
        expect(buildChordToneDefinition(patch).degreeLabels).toEqual(expected.degreeLabels);
        expect(nameOf(patch)).toBe(candidate.name);

        const nearPatch = buildNearSlotPatchFromDetectedCandidate(candidate);
        expect(buildChordToneDefinition(nearPatch).intervals).toEqual(expected.intervals);
        expect(buildChordToneDefinition(nearPatch).degreeLabels).toEqual(expected.degreeLabels);
        expect(nameOf(nearPatch)).toBe(candidate.name);
        expect(nearPatch.slashBassPc).toBeNull();
        checked++;
      }
      expect(checked).toBe(12);
    });
  }
});
