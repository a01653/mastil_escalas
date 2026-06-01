import { describe, expect, it } from "vitest";

import {
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
});
