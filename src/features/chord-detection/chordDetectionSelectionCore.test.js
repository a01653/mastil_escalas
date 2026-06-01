import { describe, expect, it } from "vitest";

import { applyChordDetectCellToggle } from "./chordDetectionSelectionCore.js";

describe("applyChordDetectCellToggle", () => {
  it("añade una nota nueva", () => {
    const result = applyChordDetectCellToggle({
      selectedKeys: ["2:3"],
      sIdx: 1,
      fret: 5,
      windowSize: 6,
    });

    expect(result).toEqual({
      nextKeys: ["2:3", "1:5"],
      rejected: false,
      reason: null,
    });
  });

  it("quita una nota ya seleccionada", () => {
    const result = applyChordDetectCellToggle({
      selectedKeys: ["2:3", "1:5"],
      sIdx: 1,
      fret: 5,
      windowSize: 6,
    });

    expect(result).toEqual({
      nextKeys: ["2:3"],
      rejected: false,
      reason: null,
    });
  });

  it("reemplaza una nota en la misma cuerda", () => {
    const result = applyChordDetectCellToggle({
      selectedKeys: ["2:3", "1:5"],
      sIdx: 1,
      fret: 7,
      windowSize: 6,
    });

    expect(result).toEqual({
      nextKeys: ["2:3", "1:7"],
      rejected: false,
      reason: null,
    });
  });

  it("permite selección dentro del rango físico de 6 trastes", () => {
    const result = applyChordDetectCellToggle({
      selectedKeys: ["2:3", "1:7"],
      sIdx: 0,
      fret: 8,
      windowSize: 6,
    });

    expect(result).toEqual({
      nextKeys: ["2:3", "1:7", "0:8"],
      rejected: false,
      reason: null,
    });
  });

  it("rechaza selección si supera el rango físico", () => {
    const selectedKeys = ["2:3", "1:7"];
    const result = applyChordDetectCellToggle({
      selectedKeys,
      sIdx: 0,
      fret: 9,
      windowSize: 6,
    });

    expect(result).toEqual({
      nextKeys: selectedKeys,
      rejected: true,
      reason: "span_limit",
    });
  });

  it("al rechazar devuelve las keys originales sin mutarlas", () => {
    const selectedKeys = ["2:3", "1:7"];
    const snapshot = [...selectedKeys];

    const result = applyChordDetectCellToggle({
      selectedKeys,
      sIdx: 0,
      fret: 9,
      windowSize: 6,
    });

    expect(result.nextKeys).toBe(selectedKeys);
    expect(selectedKeys).toEqual(snapshot);
    expect(result.rejected).toBe(true);
    expect(result.reason).toBe("span_limit");
  });
});
