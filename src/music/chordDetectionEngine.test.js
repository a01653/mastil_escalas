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
});
