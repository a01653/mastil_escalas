import { describe, expect, test } from "vitest";
import {
  buildNearSlotFromChordSymbol,
  buildNearSlotsFromChordSymbols,
  flattenStandardPhraseChordSymbols,
  getStandardRealChartSections,
  getStandardPhraseMeasures,
  parseStandardChordSymbol,
} from "./standardsCatalog.js";

describe("standardsCatalog", () => {
  test("traduce Bb6 a una cuatriada mayor con 6 y ortografía en bemoles", () => {
    const chord = parseStandardChordSymbol("Bb6");

    expect(chord.rootPc).toBe(10);
    expect(chord.quality).toBe("maj");
    expect(chord.structure).toBe("tetrad");
    expect(chord.ext6).toBe(true);
    expect(chord.ext7).toBe(false);
    expect(chord.spellPreferSharps).toBe(false);
  });

  test("traduce F7 a dominante con séptima menor", () => {
    const slot = buildNearSlotFromChordSymbol("F7");

    expect(slot.rootPc).toBe(5);
    expect(slot.quality).toBe("dom");
    expect(slot.structure).toBe("tetrad");
    expect(slot.ext7).toBe(true);
    expect(slot.ext9).toBe(false);
  });

  test("traduce Cm7 y Bm7b5 con la nomenclatura interna correcta", () => {
    const minor = buildNearSlotFromChordSymbol("Cm7");
    const halfDim = buildNearSlotFromChordSymbol("Bm7b5");

    expect(minor.quality).toBe("min");
    expect(minor.ext7).toBe(true);
    expect(halfDim.quality).toBe("hdim");
    expect(halfDim.ext7).toBe(true);
  });

  test("detecta sostenidos como preferencia de ortografía", () => {
    const chord = parseStandardChordSymbol("F#7");
    expect(chord.spellPreferSharps).toBe(true);
  });

  test("acepta grafía de folio para mayor con delta y menor con guion", () => {
    const major = parseStandardChordSymbol("CΔ7");
    const minorSix = parseStandardChordSymbol("F-6");

    expect(major.quality).toBe("maj");
    expect(major.ext7).toBe(true);
    expect(minorSix.quality).toBe("min");
    expect(minorSix.ext6).toBe(true);
  });

  test("genera slots ordenados a partir de una frase de cuatro acordes", () => {
    const slots = buildNearSlotsFromChordSymbols(["Bb6", "G7", "Cm7", "F7"]);

    expect(slots).toHaveLength(4);
    expect(slots.map((slot) => slot.rootPc)).toEqual([10, 7, 0, 5]);
    expect(slots.map((slot) => slot.quality)).toEqual(["maj", "dom", "min", "dom"]);
  });

  test("rechaza sufijos que aún no están soportados", () => {
    expect(() => parseStandardChordSymbol("F7b9")).toThrow(/Aún no sé traducir/);
  });

  test("normaliza compases con más de un acorde", () => {
    const measures = getStandardPhraseMeasures({
      bars: "1-2",
      measures: [
        { bar: 1, chords: ["Fmaj7"] },
        { bar: 2, chords: ["Em7", "A7"] },
      ],
    });

    expect(measures).toHaveLength(2);
    expect(measures[0].barLabel).toBe("Compás 1");
    expect(measures[1].barLabel).toBe("Compás 2");
    expect(measures[1].chords).toEqual(["Em7", "A7"]);
  });

  test("resuelve compases repetidos dentro de una reducción de estudio", () => {
    const measures = getStandardPhraseMeasures({
      bars: "1-4",
      measures: [
        { bar: 1, chords: ["CΔ7"] },
        { bar: 2, repeat: true },
        { bar: 3, chords: ["E7"] },
        { bar: 4, repeat: true },
      ],
    });

    expect(measures.map((measure) => measure.chords)).toEqual([
      ["CΔ7"],
      ["CΔ7"],
      ["E7"],
      ["E7"],
    ]);
  });

  test("aplana los cambios armónicos de un tramo respetando el orden interno del compás", () => {
    const symbols = flattenStandardPhraseChordSymbols({
      bars: "5-6",
      measures: [
        { bar: 5, chords: ["Dm7", "G7"] },
        { bar: 6, chords: ["Cmaj7", "A7"] },
      ],
    });

    expect(symbols).toEqual(["Dm7", "G7", "Cmaj7", "A7"]);
  });

  test("resuelve barras repetidas en un chart real sin perder los compases partidos", () => {
    const sections = getStandardRealChartSections({
      realForm: {
        sections: [
          {
            label: "A",
            bars: "1-4",
            measures: [
              { bar: 1, chords: ["CΔ7"] },
              { bar: 2, repeat: true },
              { bar: 3, chords: ["D-7", "G7"] },
              { bar: 4, repeat: true },
            ],
          },
        ],
      },
    });

    expect(sections).toHaveLength(1);
    expect(sections[0].measures.map((measure) => measure.barLabel)).toEqual([
      "Compás 1",
      "Compás 2",
      "Compás 3",
      "Compás 4",
    ]);
    expect(sections[0].measures[1].repeat).toBe(true);
    expect(sections[0].measures[1].chords).toEqual(["CΔ7"]);
    expect(sections[0].measures[3].chords).toEqual(["D-7", "G7"]);
  });
});
