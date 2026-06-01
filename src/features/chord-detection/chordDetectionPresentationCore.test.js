import { describe, expect, it } from "vitest";

import {
  buildChordDetectSelectedCandidateBadgeItems,
  buildChordDetectSelectedCandidateBassNote,
  buildChordDetectSelectedCandidateNotesText,
  buildChordDetectStaffEvents,
} from "./chordDetectionPresentationCore.js";

describe("chordDetectionPresentationCore", () => {
  it("staff events sin candidato usa spelling por preferSharps", () => {
    const result = buildChordDetectStaffEvents({
      selectedNotes: [
        { pc: 10, pitch: 58 },
        { pc: 1, pitch: 61 },
      ],
      selectedCandidate: null,
      preferSharps: false,
    });

    expect(result).toEqual([{
      notes: [58, 61],
      spelledNotes: ["Bb", "Db"],
    }]);
  });

  it("staff events con candidato usa spelling contextual del candidato", () => {
    const result = buildChordDetectStaffEvents({
      selectedNotes: [
        { pc: 10, pitch: 58 },
        { pc: 2, pitch: 62 },
        { pc: 7, pitch: 67 },
      ],
      selectedCandidate: {
        rootPc: 7,
        preferSharps: false,
        formula: {
          intervals: [0, 3, 7],
        },
      },
      preferSharps: true,
    });

    expect(result).toEqual([{
      notes: [58, 62, 67],
      spelledNotes: ["Bb", "D", "G"],
    }]);
  });

  it("notes text con candidato válido", () => {
    const result = buildChordDetectSelectedCandidateNotesText({
      selectedCandidate: {
        rootPc: 7,
        preferSharps: false,
        visibleNotes: ["G", "Bb", "D", "Bb"],
        externalBassInterval: 3,
      },
      preferSharps: true,
    });

    expect(result).toBe("G, Bb, D · bajo en Bb");
  });

  it("notes text vacío si no hay candidato", () => {
    const result = buildChordDetectSelectedCandidateNotesText({
      selectedCandidate: null,
      preferSharps: true,
    });

    expect(result).toBe("");
  });

  it("badge items con candidato válido", () => {
    const result = buildChordDetectSelectedCandidateBadgeItems({
      selectedCandidate: {
        formula: {
          intervals: [0, 4, 7, 11],
          degreeLabels: ["1", "3", "5", "7"],
        },
        rootPc: 5,
        preferSharps: false,
        visibleIntervals: [0, 4, 7, 11],
      },
      preferSharps: true,
    });

    expect(result).toEqual([
      { note: "F", degree: "1", role: "root" },
      { note: "A", degree: "3", role: "third" },
      { note: "C", degree: "5", role: "fifth" },
      { note: "E", degree: "7", role: "seventh" },
    ]);
  });

  it("badge items vacío si no hay candidato", () => {
    const result = buildChordDetectSelectedCandidateBadgeItems({
      selectedCandidate: null,
      preferSharps: true,
    });

    expect(result).toEqual([]);
  });

  it("bass note con candidato válido y spelling correcto", () => {
    const result = buildChordDetectSelectedCandidateBassNote({
      selectedCandidate: {
        rootPc: 7,
        bassPc: 10,
        preferSharps: false,
      },
      preferSharps: true,
    });

    expect(result).toBe("Bb");
  });

  it("bass note nulo si no hay candidato", () => {
    const result = buildChordDetectSelectedCandidateBassNote({
      selectedCandidate: null,
      preferSharps: true,
    });

    expect(result).toBeNull();
  });
});
