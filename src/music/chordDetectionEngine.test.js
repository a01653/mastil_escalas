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
});
