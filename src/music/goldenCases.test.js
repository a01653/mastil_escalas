import { describe, expect, test } from "vitest";
import {
  analyzeSelectedNotes,
  mod12,
  noteNameToPc,
  pcToName,
  preferSharpsFromMajorTonicPc,
} from "./chordDetectionEngine.js";

function preferredRootName(pc) {
  return pcToName(pc, preferSharpsFromMajorTonicPc(pc));
}

function transposeNotes(noteNames, semitones) {
  return noteNames.map((n) => pcToName(mod12(noteNameToPc(n) + semitones), true));
}

/**
 * Casos dorados: comportamiento de detección esperado para voicings representativos.
 * Cada caso se prueba en su posición original y, si transpose=true, en las 12 transposiciones.
 *
 * Campos:
 *   id              - identificador corto
 *   description     - descripción legible
 *   notes[]         - nombres de notas (el primero determina la raíz base)
 *   bass            - nota del bajo
 *   expectedPrimary - fn(rootPc) => nombre primario esperado
 *   mustNotWin[]    - nombres que NO deben ser el primario (solo posición base)
 *   transpose       - si true, ejecutar 12 transposiciones
 */
const GOLDEN_CASES = [
  {
    id: "altered-dom-7#9b13",
    description: "7(#9,b13,no5): gana sobre Cm7 con add3 y otras lecturas erróneas",
    notes: ["C", "Eb", "E", "Ab", "Bb"],
    bass: "C",
    expectedPrimary: (pc) => `${preferredRootName(pc)}7(#9,b13,no5)`,
    mustNotWin: ["Cm7(add3,addb6,no5)", "Emaj7b5(addb6)/C", "Ab(add9,addb6)/C", "Bbm7(b5,add11,no3)/C"],
    transpose: true,
  },
  {
    id: "dom7sus4",
    description: "7sus4 (1,4,5,b7): gana sobre lecturas con bajo externo",
    notes: ["G", "C", "D", "F"],
    bass: "G",
    expectedPrimary: (pc) => `${preferredRootName(pc)}7sus4`,
    mustNotWin: ["Dm7(add11,no5)/G"],
    transpose: true,
  },
  {
    id: "dom7-not-sus4",
    description: "7 (1,3,5,b7): no debe confundirse con 7sus4",
    notes: ["G", "B", "D", "F"],
    bass: "G",
    expectedPrimary: () => "G7",
    mustNotWin: ["G7sus4"],
    transpose: false,
  },
  {
    id: "m7-basic",
    description: "m7 (1,b3,5,b7): detección básica en las 12 tonalidades",
    notes: ["A", "C", "E", "G"],
    bass: "A",
    expectedPrimary: (pc) => `${preferredRootName(pc)}m7`,
    mustNotWin: [],
    transpose: true,
  },
  {
    id: "m7b5-basic",
    description: "m7(b5) (1,b3,b5,b7): detección básica en las 12 tonalidades",
    notes: ["B", "D", "F", "A"],
    bass: "B",
    expectedPrimary: (pc) => `${preferredRootName(pc)}m7(b5)`,
    mustNotWin: [],
    transpose: true,
  },
  {
    id: "dim7-basic",
    description: "dim7 (1,b3,b5,bb7): detección básica en las 12 tonalidades",
    notes: ["B", "D", "F", "Ab"],
    bass: "B",
    expectedPrimary: (pc) => `${preferredRootName(pc)}dim7`,
    mustNotWin: [],
    transpose: true,
  },
  {
    id: "m7-not-altered",
    description: "m7 (1,b3,5,b7): sin 3 mayor, no activa heurística de dominante alterado",
    notes: ["C", "Eb", "G", "Bb"],
    bass: "C",
    expectedPrimary: () => "Cm7",
    mustNotWin: ["C7(#9,b13,no5)"],
    transpose: false,
  },
];

describe("goldenCases", () => {
  GOLDEN_CASES.forEach(({ id, description, notes, bass, expectedPrimary, mustNotWin, transpose }) => {
    const baseRootPc = noteNameToPc(notes[0]);

    test(`[${id}] ${description}`, () => {
      const result = analyzeSelectedNotes(notes, bass);
      const primary = result.primary?.name ?? null;
      const expected = expectedPrimary(baseRootPc);
      expect(primary, `debería ser "${expected}"`).toBe(expected);
      mustNotWin.forEach((bad) => {
        expect(primary, `"${bad}" no debe ganar`).not.toBe(bad);
      });
    });

    if (transpose) {
      test(`[${id}] 12 transposiciones detectan correctamente el tipo de acorde`, () => {
        for (let st = 0; st < 12; st += 1) {
          const tNotes = transposeNotes(notes, st);
          const tBass = pcToName(mod12(noteNameToPc(bass) + st), true);
          const rootPc = mod12(baseRootPc + st);
          const expected = expectedPrimary(rootPc);
          const result = analyzeSelectedNotes(tNotes, tBass);
          const primary = result.primary?.name ?? null;
          expect(
            primary,
            `+${st} st (${tBass}): esperado "${expected}", obtenido "${primary}"`
          ).toBe(expected);
        }
      });
    }
  });
});
