import { describe, expect, test } from "vitest";
import { describeRelativeTertianChord } from "./studyRelativeChord.js";

describe("studyRelativeChord", () => {
  test("devuelve el relativo mayor de un menor con septima", () => {
    expect(describeRelativeTertianChord({
      rootPc: 2,
      preferSharps: false,
      quality: "min",
      intervals: [0, 3, 7, 10],
      ext7: true,
    })).toEqual({
      kind: "mayor",
      label: "Fmaj7",
      shortText: "relativo mayor: Fmaj7",
    });
  });

  test("devuelve el relativo menor de un mayor con septima mayor", () => {
    expect(describeRelativeTertianChord({
      rootPc: 0,
      preferSharps: true,
      quality: "maj",
      intervals: [0, 4, 7, 11],
      ext7: true,
      layer: "tetrad",
    })).toEqual({
      kind: "menor",
      label: "Am7",
      shortText: "relativo menor: Am7",
    });
  });

  test("respeta la ortografia bemol en acordes bemolizados", () => {
    expect(describeRelativeTertianChord({
      rootPc: 8,
      preferSharps: false,
      quality: "maj",
      intervals: [0, 4, 7],
    })).toEqual({
      kind: "menor",
      label: "Fm",
      shortText: "relativo menor: Fm",
    });
  });

  test("no inventa relativo para dominantes ni suspensiones", () => {
    expect(describeRelativeTertianChord({
      rootPc: 7,
      preferSharps: true,
      quality: "dom",
      intervals: [0, 4, 7, 10],
      ext7: true,
    })).toBeNull();

    expect(describeRelativeTertianChord({
      rootPc: 0,
      preferSharps: true,
      quality: "maj",
      suspension: "sus4",
      intervals: [0, 5, 7],
    })).toBeNull();
  });
});
