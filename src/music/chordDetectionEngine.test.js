import { describe, expect, test } from "vitest";
import {
  analyzeSelectedNotes,
  detectChordReadings,
  formatChordName,
  mod12,
  noteNameToPc,
  pickDefaultChordCandidate,
  pcToName,
  preferSharpsFromMajorTonicPc,
  resolveDetectedCandidateFromContext,
  spellNoteFromChordInterval,
} from "./chordDetectionEngine.js";
import * as AppMusicBasics from "./appMusicBasics.js";

function readingNames(result) {
  return result.readings.map((reading) => reading.name);
}

function getReading(result, name) {
  const reading = result.readings.find((item) => item.name === name);
  expect(reading, `No encuentro la lectura ${name}`).toBeTruthy();
  return reading;
}

function legendNotes(reading) {
  return reading.legend.map((item) => item.note);
}

function legendDegrees(reading) {
  return reading.legend.map((item) => item.degree);
}

function transposeNotes(noteNames, semitones, preferSharps = true) {
  return noteNames.map((note) => pcToName(mod12(noteNameToPc(note) + semitones), preferSharps));
}

function expectSlashMatchesBass(reading) {
  if (reading.bassPc === reading.rootPc) return;
  const expectedBass = spellNoteFromChordInterval(
    reading.rootPc,
    reading.externalBassInterval != null ? reading.externalBassInterval : mod12(reading.bassPc - reading.rootPc),
    reading.preferSharps
  );
  expect(reading.name.endsWith(`/${expectedBass}`)).toBe(true);
}

function expectRequiredDegrees(reading, requiredDegrees) {
  const degrees = legendDegrees(reading);
  requiredDegrees.forEach((degree) => {
    expect(degrees).toContain(degree);
  });
}

function preferredRootName(rootPc) {
  return pcToName(rootPc, preferSharpsFromMajorTonicPc(rootPc));
}

const TEST_STRING_PCS = [4, 11, 7, 2, 9, 4];
const TEST_OPEN_MIDI = [64, 59, 55, 50, 45, 40];

function detectedReadingsFromPositions(positions) {
  return detectChordReadings(
    positions.map(({ sIdx, fret }) => ({
      key: `${sIdx}:${fret}`,
      sIdx,
      fret,
      pc: mod12(TEST_STRING_PCS[sIdx] + fret),
      pitch: TEST_OPEN_MIDI[sIdx] + fret,
    }))
  );
}

function simulateDefaultSelectionSequence(steps, prioritizeContext) {
  let previousCandidate = null;
  let selectedPositions = [];

  steps.forEach((step) => {
    selectedPositions = [...selectedPositions, step];
    const candidates = detectedReadingsFromPositions(selectedPositions);
    previousCandidate = pickDefaultChordCandidate({
      candidates,
      previousCandidate,
      prioritizeContext,
    });
  });

  return previousCandidate;
}

function expectNamedReadingAcrossTranspositions({ notes, bass, expectedNameForRootPc, requiredDegrees = null }) {
  const baseRootPc = noteNameToPc(notes[0]);
  for (let semitones = 0; semitones < 12; semitones += 1) {
    const transposedNotes = transposeNotes(notes, semitones, true);
    const transposedBass = pcToName(mod12(noteNameToPc(bass) + semitones), true);
    const expectedName = expectedNameForRootPc(mod12(baseRootPc + semitones), transposedBass);
    const result = analyzeSelectedNotes(transposedNotes, transposedBass);
    const reading = getReading(result, expectedName);

    if (requiredDegrees?.length) {
      expectRequiredDegrees(reading, requiredDegrees);
    }
  }
}

describe("chordDetectionEngine", () => {
  test("D G C F B con bajo D no debe generar Bminor/D", () => {
    const result = analyzeSelectedNotes(["D", "G", "C", "F", "B"], "D");
    const names = readingNames(result);

    expect(names).not.toContain("Bminor/D");
    expect(names).toContain("Dm7(add11,13,no5)");
    expect(names).toContain("G7(add11)/D");
    expect(names).toContain("Bdim(addb2,addb6)/D");
    expect(names).toContain("Cuartal mixto D");
    expect(result.primary?.name).toBe("Cuartal mixto D");

    const quartal = getReading(result, "Cuartal mixto D");
    expect(legendNotes(quartal)).toEqual(["D", "G", "C", "F", "B"]);
    expect(legendDegrees(quartal)).toEqual(["1", "4", "b7", "b3", "6"]);
  });

  test("la leyenda funcional sigue la lectura seleccionada y respeta 11/13", () => {
    const result = analyzeSelectedNotes(["D", "G", "C", "F", "B"], "D");
    const reading = getReading(result, "Dm7(add11,13,no5)");

    expect(legendNotes(reading)).toEqual(["D", "F", "C", "G", "B"]);
    expect(legendDegrees(reading)).toEqual(["1", "b3", "b7", "11", "13"]);
  });

  test("la lectura disminuida cromática mantiene orden por grado desde la raíz", () => {
    const result = analyzeSelectedNotes(["D", "G", "C", "F", "B"], "D");
    const reading = getReading(result, "Bdim(addb2,addb6)/D");

    expect(legendNotes(reading)).toEqual(["B", "C", "D", "F", "G"]);
    expect(legendDegrees(reading)).toEqual(["1", "b2", "b3", "b5", "b6"]);
  });

  test("A D G F B con bajo A prioriza Dm6(add11)/A y usa 6 en vez de 13", () => {
    const result = analyzeSelectedNotes(["A", "D", "G", "F", "B"], "A");
    const names = readingNames(result);

    expect(names).toContain("Dm6(add11)/A");
    expect(names).not.toContain("Dm(add4,add6)/A");
    expect(names).not.toContain("Dm(add11,13)/A");
    expect(result.primary?.name).toBe("Dm6(add11)/A");

    const reading = getReading(result, "Dm6(add11)/A");
    expect(reading.intervalPairsText).toBe("1=D, b3=F, 5=A, 6=B, 11=G");
    expect(reading.visibleNotes).toEqual(["D", "F", "A", "B", "G"]);
    expect(legendNotes(reading)).toEqual(["D", "F", "A", "B", "G"]);
    expect(legendDegrees(reading)).toEqual(["1", "b3", "5", "6", "11"]);
  });

  test("765680 debe priorizar Em(maj7,13)/B sobre Eb7 raro", () => {
    const result = analyzeSelectedNotes(["B", "Eb", "G", "Db", "G", "E"], "B");
    const names = readingNames(result);

    expect(result.primary?.name).toBe("Em(maj7,13)/B");
    expect(names).toContain("Em(maj7,13)/B");
    expect(names[0]).not.toBe("Eb7(addb2,addb6,no5)/Cb");

    const reading = getReading(result, "Em(maj7,13)/B");
    expect(reading.intervalPairsText).toBe("1=E, b3=G, 5=B, 7=D#, 13=C#");
    expect(legendNotes(reading)).toEqual(["E", "G", "B", "D#", "C#"]);
    expect(legendDegrees(reading)).toEqual(["1", "b3", "5", "7", "13"]);
  });

  test("x5658x propone la lectura funcional Dm7(b5,add11,no3)", () => {
    const result = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 8 },
    ]);

    expect(result[0]?.name).toBe("Dm7(b5,add11,no3)");

    const reading = result.find((candidate) => candidate.name === "Dm7(b5,add11,no3)");
    expect(reading).toBeTruthy();
    expect(reading.intervalPairsText).toBe("1=D, b5=Ab, b7=C, 11=G");
    expect(reading.visibleNotes).toEqual(["D", "Ab", "C", "G"]);
  });

  test("snapshots del caso obligatorio", () => {
    const result = analyzeSelectedNotes(["D", "G", "C", "F", "B"], "D");
    expect(result.readings.map((reading) => reading.name).slice(0, 5)).toMatchInlineSnapshot(`
      [
        "Cuartal mixto D",
        "Dm7(add11,13,no5)",
        "G7(add11)/D",
        "Bdim(addb2,addb6)/D",
        "Cuartal mixto G/D",
      ]
    `);
  });

  test("dyad 1-b3 no se nombra como triada menor completa", () => {
    const result = analyzeSelectedNotes(["D", "F"], "D");
    const names = readingNames(result);

    expect(names).toContain("Dm(no5)");
    expect(names).not.toContain("Dm");
  });

  test("dyad 1-b7 se marca como parcial y no inventa tercera ni quinta", () => {
    const result = analyzeSelectedNotes(["D", "C"], "D");
    const names = readingNames(result);

    expect(names).toContain("D7(no3,no5)");
    expect(names).not.toContain("D7");
  });

  test("dyad 1-4 mantiene lectura parcial de sus", () => {
    const result = analyzeSelectedNotes(["D", "G"], "D");
    expect(readingNames(result)).toContain("Dsus4(no5)");
  });

  test("dyad 1-b5 no se llama dim completo", () => {
    const result = analyzeSelectedNotes(["B", "F"], "B");
    const names = readingNames(result);

    expect(names).toContain("B(b5,no3)");
    expect(names).not.toContain("Bdim");
  });

  test("triada menor completa", () => {
    const result = analyzeSelectedNotes(["D", "F", "A"], "D");
    const reading = getReading(result, "Dm");
    expectRequiredDegrees(reading, ["1", "b3", "5"]);
  });

  test("triada disminuida completa", () => {
    const result = analyzeSelectedNotes(["D", "F", "Ab"], "D");
    const reading = getReading(result, "Ddim");
    expectRequiredDegrees(reading, ["1", "b3", "b5"]);
  });

  test("shell menor 1-b3-b7 se nombra como m7(no5)", () => {
    const result = analyzeSelectedNotes(["D", "F", "C"], "D");
    const names = readingNames(result);
    expect(names).toContain("Dm7(no5)");
    expect(names).not.toContain("Dm");
    expect(names.filter((name) => name === "Dm7(no5)")).toHaveLength(1);
  });

  test("shell dominante 1-3-b7 se nombra como 7(no5)", () => {
    const result = analyzeSelectedNotes(["D", "F#", "C"], "D");
    expect(readingNames(result)).toContain("D7(no5)");
  });

  test("estructura cuartal parcial de tres notas", () => {
    const result = analyzeSelectedNotes(["D", "G", "C"], "D");
    const quartal = result.readings.find((reading) => reading.name.startsWith("Cuartal D"));
    expect(quartal).toBeTruthy();
    expect(legendNotes(quartal)).toEqual(["D", "G", "C"]);
  });

  test("D G B conserva una lectura triádica razonable con bajo distinto", () => {
    const result = analyzeSelectedNotes(["D", "G", "B"], "D");
    expect(readingNames(result)).toContain("G/D");
  });

  test("las transposiciones del caso cuartal mantienen estructura y orden visual", () => {
    const baseNotes = ["D", "G", "C", "F", "B"];
    const baseLegendPcs = [2, 7, 0, 5, 11];

    for (let semitones = 0; semitones < 12; semitones += 1) {
      const notes = transposeNotes(baseNotes, semitones, true);
      const bass = pcToName(mod12(noteNameToPc("D") + semitones), true);
      const result = analyzeSelectedNotes(notes, bass);
      const primary = result.primary;

      expect(primary?.formula?.quartal, `fallo en transposición ${semitones}`).toBe(true);
      expect(primary?.formula?.quartalType, `fallo en transposición ${semitones}`).toBe("mixed");
      expect(primary?.rootPc, `fallo en transposición ${semitones}`).toBe(mod12(2 + semitones));
      expect(formatChordName(primary)).toBe(`Cuartal mixto ${pcToName(primary.rootPc, primary.preferSharps)}`);
      expect(legendNotes(primary).map((note) => noteNameToPc(note))).toEqual(
        baseLegendPcs.map((pc) => mod12(pc + semitones))
      );
    }
  });

  test("E A D F# incluye lectura cuartal secundaria con nota añadida add9", () => {
    const result = analyzeSelectedNotes(["E", "A", "D", "F#"], "E");
    const names = readingNames(result);
    expect(names).toContain("Cuartal E(add9)");
    const addReading = getReading(result, "Cuartal E(add9)");
    expect(addReading.formula.quartalHasAddedNote).toBe(true);
    expect(legendNotes(addReading)).toEqual(["E", "A", "D", "F#"]);
    expect(legendDegrees(addReading)).toEqual(["1", "4", "b7", "2"]);
    // No debe reemplazar la lectura funcional principal
    expect(names).toContain("E9sus4(no5)");
    // La lectura cuartal-add debe ir después de las lecturas funcionales
    const addIdx = names.indexOf("Cuartal E(add9)");
    const sus4Idx = names.indexOf("E9sus4(no5)");
    expect(addIdx).toBeGreaterThan(sus4Idx);
  });

  test("las transposiciones del caso cuartal con nota añadida mantienen detección", () => {
    const baseNotes = ["E", "A", "D", "F#"];
    for (let semitones = 0; semitones < 12; semitones++) {
      const notes = transposeNotes(baseNotes, semitones, true);
      const bass = pcToName(mod12(noteNameToPc("E") + semitones), true);
      const result = analyzeSelectedNotes(notes, bass);
      // Debe haber alguna lectura cuartal con nota añadida
      const hasAddReading = result.readings.some((r) => r.formula?.quartalHasAddedNote === true);
      expect(hasAddReading, `fallo en transposición ${semitones}`).toBe(true);
      const addReading = result.readings.find((r) => r.formula?.quartalHasAddedNote === true);
      // La raíz cuartal debe ser la nota grave de la cadena (transpuesta de E)
      expect(addReading.rootPc, `raíz cuartal fallo en transposición ${semitones}`).toBe(mod12(4 + semitones));
      // Debe haber exactamente 1 nota añadida con intervalo 2 (9ª mayor)
      expect(addReading.formula.quartalAddedNotes).toHaveLength(1);
      expect(addReading.formula.quartalAddedNotes[0].interval).toBe(2);
      expect(addReading.formula.quartalAddedNotes[0].label).toBe("9");
    }
  });

  test("solo una cuarta aislada no genera lectura cuartal", () => {
    // Solo dos notas: una cuarta no forma cadena de 3
    const result = analyzeSelectedNotes(["E", "A"], "E");
    const hasQuartal = result.readings.some((r) => r.formula?.quartal === true);
    expect(hasQuartal).toBe(false);
    // Tres notas donde solo hay una cuarta (E→A=4J, A→B=2 semitonos) tampoco genera quartalHasAddedNote
    const result2 = analyzeSelectedNotes(["E", "A", "B"], "E");
    const hasQuartalAdd = result2.readings.some((r) => r.formula?.quartalHasAddedNote === true);
    expect(hasQuartalAdd).toBe(false);
  });

  test("cuartal puro de 4 voces no genera lectura quartalHasAddedNote", () => {
    // E-A-D-G: cadena cuartal pura de 4 voces, sin nota extra fuera de la cadena
    const result = analyzeSelectedNotes(["E", "A", "D", "G"], "E");
    const names = readingNames(result);
    // Debe haber un cuartal puro E con 4 voces
    expect(names.some((n) => n === "Cuartal E")).toBe(true);
    // No debe haber ninguna lectura quartalHasAddedNote
    const hasAddReading = result.readings.some((r) => r.formula?.quartalHasAddedNote === true);
    expect(hasAddReading).toBe(false);
  });

  test("xx2232 (E-A-D-F#) genera Cuartal E(add9): cadena E-A-D consecutiva en el voicing", () => {
    // Patrón real en guitarra: sIdx=3 fret=2 (E), sIdx=2 fret=2 (A), sIdx=1 fret=3 (D), sIdx=0 fret=2 (F#)
    const readings = detectedReadingsFromPositions([
      { sIdx: 3, fret: 2 }, // E  MIDI 52
      { sIdx: 2, fret: 2 }, // A  MIDI 57
      { sIdx: 1, fret: 3 }, // D  MIDI 62
      { sIdx: 0, fret: 2 }, // F# MIDI 66
    ]);
    const names = readings.map((r) => r.name);
    expect(names).toContain("Cuartal E(add9)");
  });

  test("xx9555 (B-C-E-A) no genera Cuartal B(addb9): cadena B-E-A no es consecutiva (C está entre B y E)", () => {
    // Patrón real: sIdx=3 fret=9 (B MIDI 59), sIdx=2 fret=5 (C MIDI 60), sIdx=1 fret=5 (E MIDI 64), sIdx=0 fret=5 (A MIDI 69)
    const readings = detectedReadingsFromPositions([
      { sIdx: 3, fret: 9 }, // B  MIDI 59
      { sIdx: 2, fret: 5 }, // C  MIDI 60
      { sIdx: 1, fret: 5 }, // E  MIDI 64
      { sIdx: 0, fret: 5 }, // A  MIDI 69
    ]);
    const names = readings.map((r) => r.name);
    expect(names).not.toContain("Cuartal B(addb9)");
    // Tampoco debe generar ninguna lectura quartalHasAddedNote
    const hasAddReading = readings.some((r) => r.formula?.quartalHasAddedNote === true);
    expect(hasAddReading).toBe(false);
  });

  test("las reglas se validan también por transposición y varias raíces en familias básicas", () => {
    expectNamedReadingAcrossTranspositions({
      notes: ["D", "F", "A"],
      bass: "D",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}m`,
      requiredDegrees: ["1", "b3", "5"],
    });

    expectNamedReadingAcrossTranspositions({
      notes: ["D", "F", "Ab"],
      bass: "D",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}dim`,
      requiredDegrees: ["1", "b3", "b5"],
    });

    expectNamedReadingAcrossTranspositions({
      notes: ["D", "F", "C"],
      bass: "D",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}m7(no5)`,
      requiredDegrees: ["1", "b3", "b7"],
    });

    expectNamedReadingAcrossTranspositions({
      notes: ["D", "F#", "C"],
      bass: "D",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}7(no5)`,
      requiredDegrees: ["1", "3", "b7"],
    });

    expectNamedReadingAcrossTranspositions({
      notes: ["D", "G"],
      bass: "D",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}sus4(no5)`,
      requiredDegrees: ["1", "4"],
    });

    expectNamedReadingAcrossTranspositions({
      notes: ["B", "F"],
      bass: "B",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}(b5,no3)`,
      requiredDegrees: ["1", "b5"],
    });

    expectNamedReadingAcrossTranspositions({
      notes: ["D", "G", "B"],
      bass: "D",
      expectedNameForRootPc: (rootPc) => {
        const triadRootPc = mod12(rootPc + 5);
        const preferSharps = preferSharpsFromMajorTonicPc(triadRootPc);
        return `${pcToName(triadRootPc, preferSharps)}/${spellNoteFromChordInterval(triadRootPc, 7, preferSharps)}`;
      },
      requiredDegrees: ["1", "3", "5"],
    });
  });

  test("sin contexto dos secuencias distintas con el mismo voicing final acaban en el mismo candidato por defecto", () => {
    const finalVoicing = [
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 5 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
      { sIdx: 0, fret: 7 },
    ];
    const reverseVoicing = [...finalVoicing].reverse();
    const directResult = simulateDefaultSelectionSequence(finalVoicing, false);
    const reverseResult = simulateDefaultSelectionSequence(reverseVoicing, false);
    const finalCandidates = detectedReadingsFromPositions(finalVoicing);

    expect(finalCandidates[0]?.name).toBe("Cuartal mixto D");
    expect(directResult?.name).toBe(finalCandidates[0]?.name);
    expect(reverseResult?.name).toBe(finalCandidates[0]?.name);
  });

  test("sin contexto x55567 selecciona por defecto Cuartal mixto D", () => {
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 5 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
      { sIdx: 0, fret: 7 },
    ]);
    const selected = pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate: finalCandidates.find((candidate) => candidate.name === "G7(add11)/D") || null,
      prioritizeContext: false,
    });

    expect(selected?.name).toBe("Cuartal mixto D");
  });

  test("con contexto mantiene la lectura anterior solo si sigue existiendo entre los candidatos", () => {
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 5 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
      { sIdx: 0, fret: 7 },
    ]);
    const previousCompatible = finalCandidates.find((candidate) => candidate.name === "G7(add11)/D") || null;
    const previousMissing = analyzeSelectedNotes(["D", "F", "A"], "D").primary;

    expect(previousCompatible).toBeTruthy();
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate: previousCompatible,
      prioritizeContext: true,
    })?.name).toBe("G7(add11)/D");
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate: previousMissing,
      prioritizeContext: true,
    })?.name).toBe("Cuartal mixto D");
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate: null,
      prioritizeContext: true,
    })?.name).toBe("Cuartal mixto D");
  });

  test("con contexto x5658x -> x5656x recuerda la familia semidisminuida previa", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 8 },
    ])[0];
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
    ]);

    expect(previousCandidate?.name).toBe("Dm7(b5,add11,no3)");
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Dm7(b5)");
  });

  test("con contexto Ab6(no5)/Ebb -> x5658x mantiene la lectura en Ab/Ebb", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
    ]).find((candidate) => candidate.name === "Ab6(no5)/Ebb");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 8 },
    ]);

    expect(previousCandidate?.name).toBe("Ab6(no5)/Ebb");
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Abmaj7b5/Ebb");
  });

  test("la resolución contextual del selector conserva Dm al pasar x5658x -> x5656x", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 8 },
    ]).find((candidate) => candidate.name === "Dm7(b5,add11,no3)");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
    ]);

    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: previousCandidate?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Dm7(b5)");
  });

  test("la resolución contextual del selector conserva Ab al pasar Ab6(no5)/Ebb -> x5658x", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
    ]).find((candidate) => candidate.name === "Ab6(no5)/Ebb");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 8 },
    ]);

    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: previousCandidate?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Abmaj7b5/Ebb");
  });

  test("la resolución contextual corrige una preselección prematura del primer candidato al volver x5658x -> x5656x", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 8 },
    ]).find((candidate) => candidate.name === "Dm7(b5,add11,no3)");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
    ]);
    const prematureFirst = finalCandidates.find((candidate) => candidate.name === "Fm6/D");

    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: prematureFirst?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Dm7(b5)");
  });

  test("la resolución contextual corrige una preselección prematura del primer candidato al pasar Ab6(no5)/Ebb -> x5658x", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
    ]).find((candidate) => candidate.name === "Ab6(no5)/Ebb");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 8 },
    ]);
    const prematureFirst = finalCandidates.find((candidate) => candidate.name === "Dm7(b5,add11,no3)");

    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: prematureFirst?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Abmaj7b5/Ebb");
  });

  test("mantiene la lectura estructural equivalente al pasar Gmaj7(add13,no5)/F# -> Gm(maj7,13,no5)/F#", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 3, fret: 4 },
      { sIdx: 2, fret: 4 },
      { sIdx: 1, fret: 5 },
      { sIdx: 0, fret: 3 },
    ]).find((candidate) => candidate.name === "Gmaj7(add13,no5)/F#");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 3, fret: 4 },
      { sIdx: 2, fret: 3 },
      { sIdx: 1, fret: 5 },
      { sIdx: 0, fret: 3 },
    ]);

    // Caso 3 que faltaba en cobertura: desaparece la lectura exacta, pero sigue
    // existiendo su equivalente estructural y debe preferirse antes que el top rankeado.
    expect(previousCandidate?.name).toBe("Gmaj7(add13,no5)/F#");
    expect(finalCandidates[0]?.name).toBe("F#7(addb2,no5)");
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate,
      prioritizeContext: false,
    })?.name).toBe("F#7(addb2,no5)");
    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: previousCandidate?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Gm(maj7,13,no5)/F#");
  });

  test("mantiene la lectura estructural equivalente al pasar Gmaj7(add13,no5)/F# -> G7(add13,no5)/F", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 3, fret: 4 },
      { sIdx: 2, fret: 4 },
      { sIdx: 1, fret: 5 },
      { sIdx: 0, fret: 3 },
    ]).find((candidate) => candidate.name === "Gmaj7(add13,no5)/F#");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 3, fret: 3 },
      { sIdx: 2, fret: 4 },
      { sIdx: 1, fret: 5 },
      { sIdx: 0, fret: 3 },
    ]);

    expect(previousCandidate?.name).toBe("Gmaj7(add13,no5)/F#");
    expect(finalCandidates[0]?.name).toBe("Em(addb2)/F");
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate,
      prioritizeContext: false,
    })?.name).toBe("Em(addb2)/F");
    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: previousCandidate?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("G7(add13,no5)/F");
  });

  test("mantiene continuidad por desplazamiento de raíz: Gmaj7(add13,no5)/F# → xx4454 → lectura con raíz G#", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 3, fret: 4 },
      { sIdx: 2, fret: 4 },
      { sIdx: 1, fret: 5 },
      { sIdx: 0, fret: 3 },
    ]).find((candidate) => candidate.name === "Gmaj7(add13,no5)/F#");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 3, fret: 4 },
      { sIdx: 2, fret: 4 },
      { sIdx: 1, fret: 5 },
      { sIdx: 0, fret: 4 }, // G → G# (la fundamental se desplaza 1 semítono)
    ]);

    expect(previousCandidate?.name).toBe("Gmaj7(add13,no5)/F#");
    expect(finalCandidates[0]?.rootPc).not.toBe(8); // El top por ranking no tiene raíz G#/Ab (pc=8)
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate,
      prioritizeContext: false,
    })?.name).toBe(finalCandidates[0]?.name); // Sin contexto: primer candidato
    const result = resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: previousCandidate?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    });
    expect(result?.rootPc).toBe(8); // Con contexto: raíz desplazada a G#/Ab (pc=8)
    expect(result?.name).not.toBe(finalCandidates[0]?.name);
  });

  test("mantiene continuidad por raíz desplazada: Eb(b5,add9)/F → xx3253 → Em(add11,no5)/F", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 3, fret: 3 },
      { sIdx: 2, fret: 2 },
      { sIdx: 1, fret: 4 },
      { sIdx: 0, fret: 3 },
    ]).find((candidate) => candidate.name === "Eb(b5,add9)/F");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 3, fret: 3 },
      { sIdx: 2, fret: 2 },
      { sIdx: 1, fret: 5 }, // Eb → E (la raíz sube 1 semítono)
      { sIdx: 0, fret: 3 },
    ]);

    expect(previousCandidate?.name).toBe("Eb(b5,add9)/F");
    expect(finalCandidates[0]?.name).toBe("Fmaj7(add9,no5)"); // Top por ranking
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate,
      prioritizeContext: false,
    })?.name).toBe("Fmaj7(add9,no5)"); // Sin contexto: primer candidato
    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: previousCandidate?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Em(add11,no5)/F"); // Con contexto: continuidad por raíz desplazada
  });

  test("mantiene continuidad estructural al desplazar una extensión un semítono: Gmaj7(add13,no5)/F# → Gmaj7#5/F#", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 3, fret: 4 },
      { sIdx: 2, fret: 4 },
      { sIdx: 1, fret: 5 },
      { sIdx: 0, fret: 3 },
    ]).find((candidate) => candidate.name === "Gmaj7(add13,no5)/F#");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 3, fret: 4 },
      { sIdx: 2, fret: 4 },
      { sIdx: 1, fret: 4 }, // E → D# (la 13ª se convierte en #5, 1 semítono abajo)
      { sIdx: 0, fret: 3 },
    ]);

    expect(previousCandidate?.name).toBe("Gmaj7(add13,no5)/F#");
    expect(finalCandidates[0]?.name).toBe("Baddb6/F#"); // Top por ranking
    expect(pickDefaultChordCandidate({
      candidates: finalCandidates,
      previousCandidate,
      prioritizeContext: false,
    })?.name).toBe("Baddb6/F#"); // Sin contexto: primer candidato
    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: previousCandidate?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Gmaj7#5/F#"); // Con contexto: continuidad por pitch class shift
  });

  test("si no existe continuidad estructural clara, mantiene la caída al primer candidato rankeado", () => {
    const previousCandidate = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 8 },
    ]).find((candidate) => candidate.name === "Cuartal mixto Ab");
    const finalCandidates = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 6 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
    ]);

    expect(previousCandidate?.name).toBe("Cuartal mixto Ab");
    expect(finalCandidates[0]?.name).toBe("Dm7(b5)");
    expect(resolveDetectedCandidateFromContext({
      candidates: finalCandidates,
      currentCandidateId: previousCandidate?.id || null,
      pendingCandidate: previousCandidate,
      lastCandidate: previousCandidate,
      prioritizeContext: true,
    })?.name).toBe("Dm7(b5)");
  });

  test("con contexto Am(maj7)/G# → xx5555 prioriza Am7/G sobre C6/G (bajo baja semitono, raíz A preservada)", () => {
    // xx6555: G#(MIDI 56) – C(60) – E(64) – A(69)
    const candidates6555 = detectedReadingsFromPositions([
      { sIdx: 3, fret: 6 }, // G# pc=8
      { sIdx: 2, fret: 5 }, // C  pc=0
      { sIdx: 1, fret: 5 }, // E  pc=4
      { sIdx: 0, fret: 5 }, // A  pc=9
    ]);
    const prevAmMaj7 = candidates6555.find((c) => c.name === "Am(maj7)/G#");
    expect(prevAmMaj7, "Am(maj7)/G# debe existir en las lecturas de xx6555").toBeTruthy();

    // xx5555: G(MIDI 55) – C(60) – E(64) – A(69)
    const candidates5555 = detectedReadingsFromPositions([
      { sIdx: 3, fret: 5 }, // G  pc=7
      { sIdx: 2, fret: 5 }, // C  pc=0
      { sIdx: 1, fret: 5 }, // E  pc=4
      { sIdx: 0, fret: 5 }, // A  pc=9
    ]);
    const names5555 = candidates5555.map((c) => c.name);
    expect(names5555).toContain("Am7/G");
    expect(names5555).toContain("C6/G"); // La alternativa sigue disponible en la lista

    // Sin contexto → C6/G (u otro) queda primero, no Am7/G
    const withoutCtx = pickDefaultChordCandidate({ candidates: candidates5555, prioritizeContext: false });
    expect(withoutCtx?.name).not.toBe("Am7/G");

    // Con contexto → Am7/G debe quedar primero (mismo root A, misma familia min, bajo -1 semitono)
    const withCtx = pickDefaultChordCandidate({
      candidates: candidates5555,
      previousCandidate: prevAmMaj7,
      prioritizeContext: true,
    });
    expect(withCtx?.name).toBe("Am7/G");
  });

  test("con contexto Am7/G → xx4555 prioriza Am6/F# sobre F#m7(b5) (bajo baja semitono, raíz A preservada)", () => {
    // xx5555: G – C – E – A
    const candidates5555 = detectedReadingsFromPositions([
      { sIdx: 3, fret: 5 }, // G  pc=7
      { sIdx: 2, fret: 5 }, // C  pc=0
      { sIdx: 1, fret: 5 }, // E  pc=4
      { sIdx: 0, fret: 5 }, // A  pc=9
    ]);
    const prevAm7G = candidates5555.find((c) => c.name === "Am7/G");
    expect(prevAm7G, "Am7/G debe existir en las lecturas de xx5555").toBeTruthy();

    // xx4555: F#(MIDI 54) – C(60) – E(64) – A(69)
    const candidates4555 = detectedReadingsFromPositions([
      { sIdx: 3, fret: 4 }, // F# pc=6
      { sIdx: 2, fret: 5 }, // C  pc=0
      { sIdx: 1, fret: 5 }, // E  pc=4
      { sIdx: 0, fret: 5 }, // A  pc=9
    ]);
    const names4555 = candidates4555.map((c) => c.name);
    expect(names4555).toContain("Am6/F#");
    expect(names4555).toContain("F#m7(b5)"); // La alternativa sigue disponible

    // Sin contexto → F#m7(b5) (u otro) queda primero, no Am6/F#
    const withoutCtx = pickDefaultChordCandidate({ candidates: candidates4555, prioritizeContext: false });
    expect(withoutCtx?.name).not.toBe("Am6/F#");

    // Con contexto → Am6/F# debe quedar primero (mismo root A, misma familia min, bajo -1 semitono)
    const withCtx = pickDefaultChordCandidate({
      candidates: candidates4555,
      previousCandidate: prevAm7G,
      prioritizeContext: true,
    });
    expect(withCtx?.name).toBe("Am6/F#");
  });

  // --------------------------------------------------------------------------
  // TRANSPOSICIONES (12 semitonos) de los dos descensos de bajo
  // --------------------------------------------------------------------------

  test("12 transposiciones: Am(maj7)/baixo → Am7/baixo-1 — Tier 2 conserva raíz min en todos los casos", () => {
    // Notas base equivalentes a xx6555 (Am(maj7)/G#) y xx5555 (Am7/G)
    const base6 = { notes: ["G#", "C", "E", "A"], bassPc: 8 };  // Am(maj7)/G#
    const base5 = { notes: ["G", "C", "E", "A"], bassPc: 7 };   // Am7/G
    const rootPc0 = 9; // A

    for (let s = 0; s < 12; s++) {
      const expectedRoot   = mod12(rootPc0 + s);
      const expectedBass6  = mod12(base6.bassPc + s);
      const expectedBass5  = mod12(base5.bassPc + s);

      // Obtener candidato previo: Am(maj7)/G# transpuesto
      const notes6 = transposeNotes(base6.notes, s, true);
      const bassName6 = pcToName(expectedBass6, true);
      const result6 = analyzeSelectedNotes(notes6, bassName6);
      const prevAmMaj7 = result6.readings.find(
        (c) => c.rootPc === expectedRoot && c.bassPc === expectedBass6 &&
               !c.formula?.quartal &&
               (c.visibleIntervals ?? []).map((i) => mod12(i)).includes(11), // maj7
      );
      expect(prevAmMaj7, `Am(maj7)/${bassName6} debe existir para s+${s}`).toBeTruthy();

      // Nuevos candidatos: Am7/G transpuesto
      const notes5 = transposeNotes(base5.notes, s, true);
      const bassName5 = pcToName(expectedBass5, true);
      const result5 = analyzeSelectedNotes(notes5, bassName5);
      const am7Candidate = result5.readings.find(
        (c) => c.rootPc === expectedRoot && c.bassPc === expectedBass5 && !c.formula?.quartal,
      );
      expect(am7Candidate, `Am7/${bassName5} debe existir para s+${s}`).toBeTruthy();

      // Con contexto: gana lectura con raíz preservada y nuevo bajo
      const withCtx = pickDefaultChordCandidate({
        candidates: result5.readings,
        previousCandidate: prevAmMaj7,
        prioritizeContext: true,
      });
      expect(withCtx?.rootPc, `raíz preservada s+${s}`).toBe(expectedRoot);
      expect(withCtx?.bassPc, `bajo correcto s+${s}`).toBe(expectedBass5);
      expect(withCtx?.formula?.quartal, `no cuartal s+${s}`).toBeFalsy();
    }
  });

  test("12 transposiciones: Am7/baixo → Am6/baixo-1 — Tier 2 conserva raíz min en todos los casos", () => {
    // Notas base equivalentes a xx5555 (Am7/G) y xx4555 (Am6/F#)
    const base5 = { notes: ["G", "C", "E", "A"], bassPc: 7 };   // Am7/G
    const base4 = { notes: ["F#", "C", "E", "A"], bassPc: 6 };  // Am6/F#
    const rootPc0 = 9; // A

    for (let s = 0; s < 12; s++) {
      const expectedRoot  = mod12(rootPc0 + s);
      const expectedBass5 = mod12(base5.bassPc + s);
      const expectedBass4 = mod12(base4.bassPc + s);

      // Obtener candidato previo: Am7/G transpuesto
      const notes5 = transposeNotes(base5.notes, s, true);
      const bassName5 = pcToName(expectedBass5, true);
      const result5 = analyzeSelectedNotes(notes5, bassName5);
      const prevAm7 = result5.readings.find(
        (c) => c.rootPc === expectedRoot && c.bassPc === expectedBass5 &&
               !c.formula?.quartal &&
               (c.visibleIntervals ?? []).map((i) => mod12(i)).includes(10), // b7
      );
      expect(prevAm7, `Am7/${bassName5} debe existir para s+${s}`).toBeTruthy();

      // Nuevos candidatos: Am6/F# transpuesto
      const notes4 = transposeNotes(base4.notes, s, true);
      const bassName4 = pcToName(expectedBass4, true);
      const result4 = analyzeSelectedNotes(notes4, bassName4);
      const am6Candidate = result4.readings.find(
        (c) => c.rootPc === expectedRoot && c.bassPc === expectedBass4 && !c.formula?.quartal,
      );
      expect(am6Candidate, `Am6/${bassName4} debe existir para s+${s}`).toBeTruthy();

      // Con contexto: gana lectura con raíz preservada y nuevo bajo
      const withCtx = pickDefaultChordCandidate({
        candidates: result4.readings,
        previousCandidate: prevAm7,
        prioritizeContext: true,
      });
      expect(withCtx?.rootPc, `raíz preservada s+${s}`).toBe(expectedRoot);
      expect(withCtx?.bassPc, `bajo correcto s+${s}`).toBe(expectedBass4);
      expect(withCtx?.formula?.quartal, `no cuartal s+${s}`).toBeFalsy();
    }
  });

  // --------------------------------------------------------------------------
  // TESTS NEGATIVOS: el contexto no debe conservar raíz "por inercia"
  // --------------------------------------------------------------------------

  test("negativo: Am7/G → A7/G (familia min→dom) — contexto no da bonus, resultado igual que sin contexto", () => {
    // Contexto previo: Am7/G (familia min, raíz A)
    const result5555 = analyzeSelectedNotes(["G", "C", "E", "A"], "G");
    const prevAm7G = result5555.readings.find((c) => c.name === "Am7/G");
    expect(prevAm7G, "Am7/G debe existir en xx5555").toBeTruthy();

    // Nuevo acorde: A7/G — familia dom, misma raíz A, mismo bajo G
    // A-C#-E-G con bajo G → candidatos A7/G o G6 u otros dom/maj, NINGUNO min-A
    const resultA7G = analyzeSelectedNotes(["G", "A", "C#", "E"], "G");
    expect(resultA7G.readings.some((c) => c.name.includes("A7"))).toBe(true);

    const withCtx = pickDefaultChordCandidate({
      candidates: resultA7G.readings,
      previousCandidate: prevAm7G,
      prioritizeContext: true,
    });
    const withoutCtx = pickDefaultChordCandidate({
      candidates: resultA7G.readings,
      prioritizeContext: false,
    });

    // Con contexto = sin contexto = list[0]: la familia cambió (min→dom), ningún Tier activa bonus Am
    expect(withCtx?.name).toBe(withoutCtx?.name);
    expect(withCtx?.name).toBe(resultA7G.readings[0]?.name);
    // El resultado no es de familia min con raíz A
    expect(withCtx?.name).not.toMatch(/^Am/);
  });

  test("negativo: Am7/G → A-B-C/A (dSinBajo=3 > 2) — Tier 2 no activa, cae a list[0] igual que sin contexto", () => {
    // Contexto previo: Am7/G — intervalSet = {0, 3, 7, 10}
    const result5555 = analyzeSelectedNotes(["G", "C", "E", "A"], "G");
    const prevAm7G = result5555.readings.find((c) => c.name === "Am7/G");
    expect(prevAm7G, "Am7/G debe existir").toBeTruthy();

    // Nuevo pitch set: A-B-C con bajo A
    // Intervalos desde A: {0, 2, 3} (root, 9ª, b3). Faltan 5ª(7) y b7(10).
    // dSinBajo = |{7,10} removidos| + |{2} añadido| = 3 > 2 → Tier 2 no activa
    // Cambio de bajo (G→A) tampoco activa Tier 3 (d total=6 > 2)
    const resultABC = analyzeSelectedNotes(["A", "B", "C"], "A");
    // Verificar que existe alguna lectura con raíz A (el test es útil aunque la familia sea la misma)
    expect(resultABC.readings.some((c) => c.rootPc === 9), "debe haber lectura raíz A para A-B-C").toBe(true);

    const withCtx = pickDefaultChordCandidate({
      candidates: resultABC.readings,
      previousCandidate: prevAm7G,
      prioritizeContext: true,
    });
    const withoutCtx = pickDefaultChordCandidate({
      candidates: resultABC.readings,
      prioritizeContext: false,
    });

    // Con contexto = sin contexto = list[0]: dSinBajo=3 supera el umbral, el bonus no aplica
    expect(withCtx?.name).toBe(withoutCtx?.name);
    expect(withCtx?.name).toBe(resultABC.readings[0]?.name);
  });

  test("todas las transposiciones de B-C-E-A no generan lectura quartalHasAddedNote (nota intermedia rompe consecutividad)", () => {
    // Equivalente transpuesto de xx9555: la nota intermedia (C, transpuesta) sigue
    // quedando entre las dos primeras notas de la cadena cuartal (B–E–A, transpuestas).
    for (let semitones = 0; semitones < 12; semitones++) {
      const notes = transposeNotes(["B", "C", "E", "A"], semitones, true);
      const bass = notes[0]; // La primera nota (transpuesta de B) es siempre el bajo
      const result = analyzeSelectedNotes(notes, bass);
      const hasAddReading = result.readings.some((r) => r.formula?.quartalHasAddedNote === true);
      expect(hasAddReading, `falso positivo cuartal-add en transposición +${semitones}`).toBe(false);
    }
  });

  test("invariantes básicas de nomenclatura y bajo en casos curados", () => {
    const curatedBases = [
      { notes: ["D", "F", "A"], bass: "D" },
      { notes: ["D", "F", "Ab"], bass: "D" },
      { notes: ["D", "F", "C"], bass: "D" },
      { notes: ["D", "F#", "C"], bass: "D" },
      { notes: ["D", "G", "C", "F", "B"], bass: "D" },
      { notes: ["D", "G", "B"], bass: "D" },
    ];
    const curated = [];

    for (const entry of curatedBases) {
      for (let semitones = 0; semitones < 12; semitones += 1) {
        curated.push(
          analyzeSelectedNotes(
            transposeNotes(entry.notes, semitones, true),
            pcToName(mod12(noteNameToPc(entry.bass) + semitones), true)
          )
        );
      }
    }

    for (const result of curated) {
      for (const reading of result.readings) {
        expectSlashMatchesBass(reading);

        if (reading.formula?.id === "min") {
          expectRequiredDegrees(reading, ["1", "b3", "5"]);
        }
        if (reading.formula?.id === "dim") {
          expectRequiredDegrees(reading, ["1", "b3", "b5"]);
        }
        if (reading.formula?.id === "m7b5") {
          expectRequiredDegrees(reading, ["1", "b3", "b5", "b7"]);
        }
        if (reading.formula?.id === "dim7") {
          expectRequiredDegrees(reading, ["1", "b3", "b5", "bb7"]);
        }

        const degrees = legendDegrees(reading);
        expect(reading.name.includes("minor")).toBe(false);
        expect(reading.name.includes("major")).toBe(false);

        const looksMinorFamily = /^([A-G][b#]?m(?!aj))/.test(reading.name);
        if (looksMinorFamily && !reading.name.includes("no5")) {
          if (degrees.includes("b5") && !degrees.includes("5")) {
            throw new Error(`Lectura contradictoria: ${reading.name} -> ${degrees.join(",")}`);
          }
        }
      }
    }
  });

  test("x3234x detecta C7(#9) con alias Hendrix chord", () => {
    // C(sIdx4,f3) E(sIdx3,f2) Bb(sIdx2,f3) D#(sIdx1,f4), bajo C
    const result = analyzeSelectedNotes(["C", "E", "Bb", "D#"], "C");
    const hendrix = result.readings.find((r) => r.name === "C7(#9)");
    expect(hendrix, "debe existir lectura C7(#9)").toBeTruthy();
    expect(hendrix.aliases).toContain("Hendrix chord");
    expect(hendrix.displayName).toBe("C7(#9) · Hendrix chord");
    expect(legendDegrees(hendrix)).toContain("#9");
    expect(legendNotes(hendrix)).toContain("D#");
  });

  test("8989aa detecta C13(#11,9) con alias Mystic chord y #11=F#", () => {
    // C(sIdx5,f8) F#(sIdx4,f9) Bb(sIdx3,f8) E(sIdx2,f9) A(sIdx1,f10) D(sIdx0,f10), bajo C
    const result = analyzeSelectedNotes(["C", "F#", "Bb", "E", "A", "D"], "C");
    const mystic = result.readings.find((r) => r.name === "C13(#11,9)");
    expect(mystic, "debe existir lectura C13(#11,9)").toBeTruthy();
    expect(mystic.aliases).toContain("Mystic chord");
    expect(mystic.displayName).toBe("C13(#11,9) · Mystic chord");
    expect(legendDegrees(mystic)).toContain("#11");
    expect(legendNotes(mystic)).toContain("F#");
    expect(legendNotes(mystic)).not.toContain("Gb");
  });

  test("021002 detecta Em(maj9) con alias James Bond chord", () => {
    // E(sIdx5,f0) B(sIdx4,f2) D#(sIdx3,f1) G(sIdx2,f0) B(sIdx1,f0) F#(sIdx0,f2), bajo E
    const result = analyzeSelectedNotes(["E", "B", "D#", "G", "F#"], "E");
    const jamesBond = result.readings.find((r) => r.name === "Em(maj9)");
    expect(jamesBond, "debe existir lectura Em(maj9)").toBeTruthy();
    expect(jamesBond.aliases).toContain("James Bond chord");
    expect(jamesBond.displayName).toBe("Em(maj9) · James Bond chord");
    expect(legendDegrees(jamesBond)).toContain("9");
    expect(legendDegrees(jamesBond)).toContain("7");
    const tagged = result.readings.filter((r) => r.aliases?.includes("James Bond chord"));
    expect(tagged.map((r) => r.name)).toEqual(["Em(maj9)"]);
    expect(result.primary?.name).toBe("Em(maj9)");
    expect(result.primary?.displayName).toBe("Em(maj9) · James Bond chord");
  });

  test("x55565 detecta Dm7(add11) con alias So What chord", () => {
    const readings = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 5 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
      { sIdx: 0, fret: 5 },
    ]);
    const soWhat = readings.find((r) => r.name === "Dm7(add11)");
    expect(soWhat, "debe existir lectura Dm7(add11)").toBeTruthy();
    expect(soWhat.aliases).toContain("So What chord");
    expect(soWhat.displayName).toBe("Dm7(add11) · So What chord");
  });

  test("x55565 no marca So What chord en todos los candidatos", () => {
    const readings = detectedReadingsFromPositions([
      { sIdx: 4, fret: 5 },
      { sIdx: 3, fret: 5 },
      { sIdx: 2, fret: 5 },
      { sIdx: 1, fret: 6 },
      { sIdx: 0, fret: 5 },
    ]);
    const tagged = readings.filter((r) => r.aliases?.includes("So What chord"));
    expect(tagged).toHaveLength(1);
    expect(tagged[0].name).toBe("Dm7(add11)");
  });

  test("x3434x sigue siendo Cm7(b5) sin alias especiales", () => {
    const readings = detectedReadingsFromPositions([
      { sIdx: 4, fret: 3 },
      { sIdx: 3, fret: 4 },
      { sIdx: 2, fret: 3 },
      { sIdx: 1, fret: 4 },
    ]);
    const cm7b5 = readings.find((r) => r.name === "Cm7(b5)");
    expect(cm7b5, "debe existir lectura Cm7(b5)").toBeTruthy();
    expect(cm7b5.aliases ?? []).toHaveLength(0);
    expect(cm7b5.displayName).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Batería dom7sus4 / dom7sus2
  // ---------------------------------------------------------------------------

  test("xx5768 (G,D,F,C) primario debe ser G7sus4, no Dm7(add11,no5)/G", () => {
    // sIdx3=D str fret5=G, sIdx2=G str fret7=D, sIdx1=B str fret6=F, sIdx0=E str fret8=C
    const readings = detectedReadingsFromPositions([
      { sIdx: 3, fret: 5 },
      { sIdx: 2, fret: 7 },
      { sIdx: 1, fret: 6 },
      { sIdx: 0, fret: 8 },
    ]);
    expect(readings[0]?.name).toBe("G7sus4");

    const g7sus4 = readings.find((r) => r.name === "G7sus4");
    expect(g7sus4, "debe existir lectura G7sus4").toBeTruthy();
    expect(g7sus4.formula.id).toBe("dom7sus4");
    expect(g7sus4.formula.degreeLabels).toEqual(["1", "4", "5", "b7"]);
    expect(g7sus4.rootPc).toBe(7);
    expect(g7sus4.bassPc).toBe(7);
    expect(g7sus4.exact).toBe(true);

    const names = readings.map((r) => r.name);
    expect(names).toContain("Dm7(add11,no5)/G");
  });

  test("dom7sus4 se detecta en las 12 transposiciones", () => {
    expectNamedReadingAcrossTranspositions({
      notes: ["G", "C", "D", "F"],
      bass: "G",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}7sus4`,
      requiredDegrees: ["1", "4", "5", "b7"],
    });
  });

  test("dom7sus2 (G,A,D,F) se detecta como G7sus2", () => {
    const result = analyzeSelectedNotes(["G", "A", "D", "F"], "G");
    const reading = getReading(result, "G7sus2");
    expect(reading.formula.id).toBe("dom7sus2");
    expect(reading.exact).toBe(true);
    expectRequiredDegrees(reading, ["1", "2", "5", "b7"]);
  });

  test("dom7sus2 se detecta en las 12 transposiciones", () => {
    expectNamedReadingAcrossTranspositions({
      notes: ["G", "A", "D", "F"],
      bass: "G",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}7sus2`,
      requiredDegrees: ["1", "2", "5", "b7"],
    });
  });

  test("dom7sus4 con bajo externo (primera inversión) C7sus4/F", () => {
    const result = analyzeSelectedNotes(["F", "C", "G", "Bb"], "F");
    const reading = getReading(result, "C7sus4/F");
    expect(reading.formula.id).toBe("dom7sus4");
    expect(reading.rootPc).toBe(0);
    expect(reading.bassPc).toBe(5);
    expectRequiredDegrees(reading, ["1", "4", "5", "b7"]);
    expectSlashMatchesBass(reading);
  });

  test("3 notas G,C,F prefieren Csus4/G sobre G7sus4(no5)", () => {
    const result = analyzeSelectedNotes(["G", "C", "F"], "G");
    const names = readingNames(result);
    expect(names).toContain("Csus4/G");
    expect(names).not.toContain("G7sus4");
  });

  test("C7sus4 (C,F,G,Bb) intervalPairsText en orden 1,4,5,b7 — no mezclar orden físico con orden armónico", () => {
    const result = analyzeSelectedNotes(["C", "F", "G", "Bb"], "C");
    const c7sus4 = getReading(result, "C7sus4");
    expect(c7sus4.intervalPairsText).toBe("1=C, 4=F, 5=G, b7=Bb");
  });

  test("dom9sus4(no5) intervalPairsText sigue el orden armónico: 1,4,b7,9", () => {
    const result = analyzeSelectedNotes(["D", "G", "C", "E"], "D");
    const d9sus4 = getReading(result, "D9sus4(no5)");
    expect(d9sus4.intervalPairsText).toBe("1=D, 4=G, b7=C, 9=E");
  });

  test("sus4 triad (G,C,D) no genera G7sus4 ni G7sus4(no5)", () => {
    const result = analyzeSelectedNotes(["G", "C", "D"], "G");
    const names = readingNames(result);
    expect(names).toContain("Gsus4");
    expect(names).not.toContain("G7sus4");
    expect(names).not.toContain("G7sus4(no5)");
  });

  test("dom7sus4 sin la 4ta (G,D,F) no genera G7sus4", () => {
    const result = analyzeSelectedNotes(["G", "D", "F"], "G");
    const names = readingNames(result);
    expect(names).not.toContain("G7sus4");
    expect(names).not.toContain("G7sus4(no4)");
  });

  test("Gm (G,Bb,D) no se confunde con G7sus4", () => {
    const result = analyzeSelectedNotes(["G", "Bb", "D"], "G");
    const names = readingNames(result);
    expect(names).toContain("Gm");
    expect(names).not.toContain("G7sus4");
  });

  test("G7 (G,B,D,F) no se confunde con G7sus4", () => {
    const result = analyzeSelectedNotes(["G", "B", "D", "F"], "G");
    const names = readingNames(result);
    expect(names).toContain("G7");
    expect(names).not.toContain("G7sus4");
  });

  test("dom7sus4 aparece en la lista de lecturas de xx5768 junto a Dm7(add11,no5)/G y Cuartal D", () => {
    const result = analyzeSelectedNotes(["G", "D", "F", "C"], "G");
    const names = readingNames(result);
    expect(names).toContain("G7sus4");
    expect(names).toContain("Dm7(add11,no5)/G");
    expect(result.primary?.name).toBe("G7sus4");
  });

  // --- Dominante alterado: 3 mayor + b7 + b3(=#9) ---

  test("8x899b (C,Bb,E,Ab,Eb) primario es C7(#9,b13,no5), no Cm7(add3,...)", () => {
    // sIdx 5=low E +8=C, 3=D +8=Bb, 2=G +9=E, 1=B +9=Ab, 0=high E +11=Eb
    const readings = detectedReadingsFromPositions([
      { sIdx: 5, fret: 8 },
      { sIdx: 3, fret: 8 },
      { sIdx: 2, fret: 9 },
      { sIdx: 1, fret: 9 },
      { sIdx: 0, fret: 11 },
    ]);
    expect(readings[0]?.name).toBe("C7(#9,b13,no5)");
    expect(readings.map((r) => r.name)).not.toContain("Cm7(add3,addb6,no5)");
  });

  test("C7(#9,b13,no5): primario y grados correctos", () => {
    const result = analyzeSelectedNotes(["C", "Eb", "E", "Ab", "Bb"], "C");
    expect(result.primary?.name).toBe("C7(#9,b13,no5)");
    expect(readingNames(result)).not.toContain("Cm7(add3,addb6,no5)");
    const reading = getReading(result, "C7(#9,b13,no5)");
    expect(legendDegrees(reading)).toContain("#9");
    expect(legendDegrees(reading)).toContain("3");
    expect(legendDegrees(reading)).toContain("b13");
    expect(legendDegrees(reading)).toContain("b7");
  });

  test("C7(#9,b13,no5): Eb se deletrea D# (#9), Ab se deletrea Ab (b13)", () => {
    const result = analyzeSelectedNotes(["C", "Eb", "E", "Ab", "Bb"], "C");
    const reading = getReading(result, "C7(#9,b13,no5)");
    expect(legendNotes(reading)).toContain("D#");
    expect(legendNotes(reading)).toContain("Ab");
    expect(legendNotes(reading)).not.toContain("Eb");
  });

  test("dominante alterado (1,b3,3,b6,b7) se detecta en las 12 transposiciones", () => {
    expectNamedReadingAcrossTranspositions({
      notes: ["C", "Eb", "E", "Ab", "Bb"],
      bass: "C",
      expectedNameForRootPc: (rootPc) => `${preferredRootName(rootPc)}7(#9,b13,no5)`,
      requiredDegrees: ["#9", "3", "b13", "b7"],
    });
  });

  test("dominante alterado con quinta (C,Eb,E,G,Ab,Bb) contiene lectura C7 con #9", () => {
    const result = analyzeSelectedNotes(["C", "Eb", "E", "G", "Ab", "Bb"], "C");
    const names = readingNames(result);
    expect(names.some((n) => n.startsWith("C7(") && n.includes("#9"))).toBe(true);
    expect(names).not.toContain("Cm7(add3,addb6)");
  });

  test("Cm7 normal (C,Eb,G,Bb) no se ve afectado por la heurística alterada", () => {
    const result = analyzeSelectedNotes(["C", "Eb", "G", "Bb"], "C");
    const names = readingNames(result);
    expect(names).toContain("Cm7");
    expect(names).not.toContain("C7(#9,b13,no5)");
  });
});

describe("deduplicación: condiciones de fusión", () => {
  // Distinta raíz → no fusionar aunque compartan bajo y notas

  test("Am7 y C6/A coexisten para {C,E,G,A} bajo=A — raíces distintas", () => {
    const result = analyzeSelectedNotes(["C", "E", "G", "A"], "A");
    const names = readingNames(result);
    expect(names).toContain("Am7");
    expect(names).toContain("C6/A");
    const am7 = result.readings.find((r) => r.name === "Am7");
    const c6a = result.readings.find((r) => r.name === "C6/A");
    expect(am7.rootPc).not.toBe(c6a.rootPc);
  });

  test("Cadd9/D y Em7(b13,no5)/D coexisten para {E,G,D,C} bajo=D — raíces distintas", () => {
    const result = analyzeSelectedNotes(["E", "G", "D", "C"], "D");
    const names = readingNames(result);
    expect(names).toContain("Cadd9/D");
    expect(names).toContain("Em7(b13,no5)/D");
    const cadd9 = result.readings.find((r) => r.name === "Cadd9/D");
    const em7 = result.readings.find((r) => r.name === "Em7(b13,no5)/D");
    expect(cadd9.rootPc).not.toBe(em7.rootPc);
  });

  // Mismo root/bajo/intervalos → fusionar alias, dejar solo uno

  test("una sola lectura con root=C y bajo=D para {C,E,G,D} bajo=D", () => {
    const result = analyzeSelectedNotes(["C", "E", "G", "D"], "D");
    const cRootDbass = result.readings.filter((r) => r.rootPc === 0 && r.bassPc === 2);
    expect(cRootDbass.length).toBe(1);
    expect(cRootDbass[0].name).toBe("Cadd9/D");
  });

  test("Em7(addb6,no5)/D no aparece — fusionado en Em7(b13,no5)/D para {E,G,D,C} bajo=D", () => {
    const result = analyzeSelectedNotes(["E", "G", "D", "C"], "D");
    const names = readingNames(result);
    expect(names).not.toContain("Em7(addb6,no5)/D");
    expect(names).not.toContain("Em7(no5)(b13)/D");
    const em7Readings = result.readings.filter((r) => r.rootPc === 4 && r.bassPc === 2);
    expect(em7Readings.length).toBe(1);
    expect(em7Readings[0].name).toBe("Em7(b13,no5)/D");
  });

  // Mismo root/bajo/mismos intervalos visibles pero distinto missingLabels → no fusionar

  test("Em7(b13,no5,nob7) y Em(addb13,no5) coexisten para {E,G,C} bajo=E — missingLabels distintos", () => {
    const result = analyzeSelectedNotes(["E", "G", "C"], "E");
    const eReadings = result.readings.filter((r) => r.rootPc === 4 && r.bassPc === 4);
    const names = eReadings.map((r) => r.name);
    expect(names).toContain("Em7(b13,no5,nob7)");
    expect(names).toContain("Em(addb13,no5)");
    // Confirmar que tienen missingLabels distintos (root de la no-fusión)
    const withNob7 = eReadings.find((r) => r.name === "Em7(b13,no5,nob7)");
    const withoutNob7 = eReadings.find((r) => r.name === "Em(addb13,no5)");
    expect(withNob7.missingLabels).toContain("b7");
    expect(withoutNob7.missingLabels).not.toContain("b7");
  });

  test("Bbadd9/C no genera variante enharmónica A#add9/B# — grafía B# eliminada", () => {
    // x3333x: C(bajo), F, Bb, D — detección Bbadd9/C; A# sería misma raíz/intervalos pero grafía rara
    const result = analyzeSelectedNotes(["C", "F", "Bb", "D"], "C");
    const names = readingNames(result);
    expect(names).toContain("Bbadd9/C");
    expect(names).not.toContain("A#add9/B#");
  });

  // ── Spelling enarmonía en inversiones (bug v5.22) ───────────────────────────
  test("Gm/Bb (xxx433): candidato detectado con nombre correcto", () => {
    // Notas: Bb(10), D(2), G(7) con bajo Bb → Gm/Bb (1ª inversión)
    const result = analyzeSelectedNotes(["Bb", "D", "G"], "Bb");
    const gm = result.readings.find((r) => r.name === "Gm/Bb");
    expect(gm).toBeDefined();
  });

  test("G/B (xxx433 original): preferSharps=true — la 3ª sigue siendo B, no Cb", () => {
    // Notas: B(11), D(2), G(7) con bajo B → G/B (1ª inversión mayor)
    const result = analyzeSelectedNotes(["B", "D", "G"], "B");
    const gmaj = result.readings.find((r) => r.name === "G/B");
    expect(gmaj).toBeDefined();
    expect(gmaj.preferSharps).toBe(true);
  });

  test("buildDetectedCandidateNoteNameForPc: Gm/Bb → b3 se spelllea Bb", () => {
    const result = analyzeSelectedNotes(["Bb", "D", "G"], "Bb");
    const gm = result.readings.find((r) => r.name === "Gm/Bb");
    expect(gm).toBeDefined();
    const { buildDetectedCandidateNoteNameForPc } = AppMusicBasics;
    const fallback = gm.preferSharps;
    // pc=10 (b3 de G), candidato Gm/Bb → debe dar "Bb"
    expect(buildDetectedCandidateNoteNameForPc(10, gm, fallback)).toBe("Bb");
    // pc=11 (3ª de G mayor), candidato G/B → debe dar "B"
    const gmaj = analyzeSelectedNotes(["B", "D", "G"], "B").readings.find((r) => r.name === "G/B");
    expect(buildDetectedCandidateNoteNameForPc(11, gmaj, gmaj?.preferSharps)).toBe("B");
  });

  test("nearChords tertian bassName: pcToName produce A# (bug) — spellNoteFromChordInterval produce Bb (fix)", () => {
    // Reproduce el escenario exacto de buildNearSlotStudyEntry rama tertian (App.jsx):
    // slot.rootPc=7 (G), voicing.bassPc=10 (Bb en 1ª inversión de Gm),
    // noteMeta.preferSharps = preferSharpsFromMajorTonicPc(7) = true (G mayor, 1 sostenido)
    const rootPc = 7;
    const bassPc = 10;
    const preferSharps = preferSharpsFromMajorTonicPc(rootPc);
    expect(preferSharps).toBe(true); // confirma el contexto: G usa preferSharps=true

    // Fórmula ANTERIOR (pcToName directo) → producía "A#": BUG documentado
    expect(pcToName(bassPc, preferSharps)).toBe("A#");

    // Fórmula ACTUAL (spellNoteFromChordInterval) → produce "Bb": CORRECTO
    const bassInterval = mod12(bassPc - rootPc); // = 3 (b3)
    const bassName = spellNoteFromChordInterval(rootPc, bassInterval, preferSharps);
    expect(bassName).toBe("Bb");
    expect(bassName).not.toBe("A#");
  });

  test("nearChords tertian bassName: G/B primera inversión → B (no Cb)", () => {
    const preferSharps = preferSharpsFromMajorTonicPc(7); // true
    const bassInterval = mod12(11 - 7); // M3 = 4
    expect(spellNoteFromChordInterval(7, bassInterval, preferSharps)).toBe("B");
  });

  test("nearChords tertian bassName: Dm/F primera inversión → F (no E#)", () => {
    const preferSharps = preferSharpsFromMajorTonicPc(2); // D = 2 sostenidos → true
    const bassInterval = mod12(5 - 2); // b3 = 3
    expect(spellNoteFromChordInterval(2, bassInterval, preferSharps)).toBe("F");
  });
});
