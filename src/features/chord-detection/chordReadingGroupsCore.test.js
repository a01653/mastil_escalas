import { describe, expect, it } from "vitest";

import {
  isAdvancedReading,
  partitionDetectedReadings,
} from "./chordReadingGroupsCore.js";

describe("isAdvancedReading", () => {
  it("marca cuartal/fragmento/contextual como avanzadas", () => {
    expect(isAdvancedReading({ formula: { quartal: true } })).toBe(true);
    expect(isAdvancedReading({ fragment: true })).toBe(true);
    expect(isAdvancedReading({ contextual: true })).toBe(true);
  });

  it("referencePromoted por sí solo NO es avanzada (es solo informativo)", () => {
    expect(isAdvancedReading({ name: "B9sus4(no5)/C#", referencePromoted: true })).toBe(false);
  });

  it("referencePromoted combinado con cuartal/fragment/contextual sí es avanzada", () => {
    expect(isAdvancedReading({ referencePromoted: true, formula: { quartal: true } })).toBe(true);
    expect(isAdvancedReading({ referencePromoted: true, fragment: true })).toBe(true);
    expect(isAdvancedReading({ referencePromoted: true, contextual: true })).toBe(true);
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

  it("separa fragment/contextual al grupo avanzado, pero referencePromoted solo se queda en main", () => {
    const list = [
      { id: "p", name: "Cmaj7" },
      { id: "frag", name: "C(add9,no3)", fragment: true },
      { id: "ctx", name: "Em7/C", contextual: true },
      { id: "ref", name: "A7/C", referencePromoted: true }, // solo por referencia → main
      { id: "ok", name: "Am7/C" },
    ];
    const { main, advanced } = partitionDetectedReadings({ candidates: list, keepVisibleId: "p" });
    expect(main.map((c) => c.id)).toEqual(["p", "ref", "ok"]);
    expect(advanced.map((c) => c.id)).toEqual(["frag", "ctx"]);
  });

  it("una lectura solo referencePromoted (sin quartal/fragment/contextual) NO se mueve a avanzadas", () => {
    // Regresión hotfix 6.0.59: x42200 con referencia B promueve B9sus4(no5)/C#
    // con referencePromoted:true; aunque NO sea la seleccionada, debe quedar en main.
    const list = [
      { id: "aadd9", name: "Aadd9/C#" }, // seleccionada (keepVisibleId)
      { id: "esus4", name: "Esus4/C#" },
      { id: "b9sus4", name: "B9sus4(no5)/C#", referencePromoted: true },
      { id: "quartal", name: "Cuartal B/C#", formula: { quartal: true } },
    ];
    const { main, advanced } = partitionDetectedReadings({ candidates: list, keepVisibleId: "aadd9" });
    expect(main.map((c) => c.id)).toContain("b9sus4");
    expect(advanced.map((c) => c.id)).toEqual(["quartal"]);
  });
});
