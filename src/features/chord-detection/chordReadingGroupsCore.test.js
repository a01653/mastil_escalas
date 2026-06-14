import { describe, expect, it } from "vitest";

import {
  isAdvancedReading,
  partitionDetectedReadings,
} from "./chordReadingGroupsCore.js";

describe("isAdvancedReading", () => {
  it("marca cuartal/fragmento/contextual/referencePromoted como avanzadas", () => {
    expect(isAdvancedReading({ formula: { quartal: true } })).toBe(true);
    expect(isAdvancedReading({ fragment: true })).toBe(true);
    expect(isAdvancedReading({ contextual: true })).toBe(true);
    expect(isAdvancedReading({ referencePromoted: true })).toBe(true);
  });

  it("una lectura tertian normal no es avanzada; null tampoco", () => {
    expect(isAdvancedReading({ name: "Asus2(#11)", formula: {} })).toBe(false);
    expect(isAdvancedReading({ name: "B7(add11,no5)/A" })).toBe(false);
    expect(isAdvancedReading(null)).toBe(false);
  });
});

describe("partitionDetectedReadings", () => {
  // Modela chordDetectCandidatesRanked para x02440.
  const X02440 = [
    { id: "asus2#11", name: "Asus2(#11)" },
    { id: "b7add11no5", name: "B7(add11,no5)/A" },
    { id: "aadd9#11no3", name: "Aadd9(#11,no3)" },
    { id: "emaj7no3", name: "Emaj7(no3)/A" },
    { id: "e5maj7", name: "E5(maj7)/A" },
    { id: "emaj7add11no3", name: "Emaj7(add11,no3)/A" },
    { id: "quartalB", name: "Cuartal mixto B", formula: { quartal: true } },
  ];

  it("lista vacía devuelve grupos vacíos", () => {
    expect(partitionDetectedReadings({ candidates: [] })).toEqual({ main: [], advanced: [] });
  });

  it("separa cuartales al grupo avanzado y conserva el orden", () => {
    const { main, advanced } = partitionDetectedReadings({ candidates: X02440, keepVisibleId: "asus2#11" });
    expect(advanced.map((c) => c.id)).toEqual(["quartalB"]);
    expect(main.map((c) => c.id)).toEqual([
      "asus2#11",
      "b7add11no5",
      "aadd9#11no3",
      "emaj7no3",
      "e5maj7",
      "emaj7add11no3",
    ]);
  });

  it("la lectura principal nunca queda en el grupo avanzado aunque sea cuartal", () => {
    // Si el Primary es la cuartal, va en main; el resto avanzado queda vacío.
    const { main, advanced } = partitionDetectedReadings({ candidates: X02440, keepVisibleId: "quartalB" });
    expect(main.map((c) => c.id)).toContain("quartalB");
    expect(advanced).toEqual([]);
  });

  it("separa fragment/contextual/referencePromoted al grupo avanzado", () => {
    const list = [
      { id: "p", name: "Cmaj7" },
      { id: "frag", name: "C(add9,no3)", fragment: true },
      { id: "ctx", name: "Em7/C", contextual: true },
      { id: "ref", name: "A7/C", referencePromoted: true },
      { id: "ok", name: "Am7/C" },
    ];
    const { main, advanced } = partitionDetectedReadings({ candidates: list, keepVisibleId: "p" });
    expect(main.map((c) => c.id)).toEqual(["p", "ok"]);
    expect(advanced.map((c) => c.id)).toEqual(["frag", "ctx", "ref"]);
  });
});
