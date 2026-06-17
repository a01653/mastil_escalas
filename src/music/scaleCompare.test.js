import { describe, it, expect } from "vitest";
import {
  computeScalePcs,
  buildIntervalLabelMap,
  toggleScaleCompareVisible,
  rootPcFromLetterAcc,
  SCALE_COMPARE_ROW_DEFAULTS,
} from "../features/scale-compare/scaleCompareUtils.js";
import { SCALE_PRESETS } from "./appStaticData.js";

// ─── rootPcFromLetterAcc ──────────────────────────────────────────────────────

describe("rootPcFromLetterAcc", () => {
  it("C natural = 0", () => expect(rootPcFromLetterAcc("C", "")).toBe(0));
  it("D natural = 2", () => expect(rootPcFromLetterAcc("D", "")).toBe(2));
  it("Bb = 10",       () => expect(rootPcFromLetterAcc("B", "b")).toBe(10));
  it("F# = 6",        () => expect(rootPcFromLetterAcc("F", "#")).toBe(6));
  it("A natural = 9", () => expect(rootPcFromLetterAcc("A", "")).toBe(9));
});

// ─── computeScalePcs ─────────────────────────────────────────────────────────

describe("computeScalePcs", () => {
  it("C Mayor tiene 7 notas incluyendo C=0, E=4, G=7", () => {
    const pcs = computeScalePcs(0, "Mayor");
    expect(pcs.size).toBe(7);
    expect(pcs.has(0)).toBe(true); // C
    expect(pcs.has(4)).toBe(true); // E
    expect(pcs.has(7)).toBe(true); // G
  });

  it("A Menor natural contiene A=9, C=0, E=4", () => {
    const pcs = computeScalePcs(9, "Menor natural");
    expect(pcs.has(9)).toBe(true); // A
    expect(pcs.has(0)).toBe(true); // C
    expect(pcs.has(4)).toBe(true); // E
  });

  it("C Pentatónica mayor tiene 5 notas", () => {
    const pcs = computeScalePcs(0, "Pentatónica mayor");
    expect(pcs.size).toBe(5);
  });

  it("escala inválida devuelve Set vacío", () => {
    expect(computeScalePcs(0, "NoExiste").size).toBe(0);
  });

  it("el rootPc afecta el resultado: G Mayor no tiene F=5 pero sí F#=6", () => {
    const pcs = computeScalePcs(7, "Mayor");
    expect(pcs.has(5)).toBe(false); // F natural
    expect(pcs.has(6)).toBe(true);  // F#
  });
});

// ─── buildIntervalLabelMap ────────────────────────────────────────────────────

describe("buildIntervalLabelMap", () => {
  it("C Mayor: C=0 → '1', E=4 → '3', G=7 → '5'", () => {
    const map = buildIntervalLabelMap(0, "Mayor");
    expect(map.get(0)).toBe("1");
    expect(map.get(4)).toBe("3");
    expect(map.get(7)).toBe("5");
  });

  it("A Menor natural: A=9 → '1', C=0 → 'b3'", () => {
    const map = buildIntervalLabelMap(9, "Menor natural");
    expect(map.get(9)).toBe("1");
    expect(map.get(0)).toBe("b3");
  });

  it("escala inválida devuelve Map vacío", () => {
    expect(buildIntervalLabelMap(0, "NoExiste").size).toBe(0);
  });
});

// ─── toggleScaleCompareVisible (FIFO) ────────────────────────────────────────

describe("toggleScaleCompareVisible — FIFO", () => {
  it("añade fila al estado vacío", () => {
    expect(toggleScaleCompareVisible([], 0)).toEqual([0]);
  });

  it("añade segunda fila: [0] → [0, 2]", () => {
    expect(toggleScaleCompareVisible([0], 2)).toEqual([0, 2]);
  });

  it("con 2 ya visibles, FIFO: descarta la más antigua", () => {
    // [0, 2] + 1 → [2, 1]  (0 se descarta)
    expect(toggleScaleCompareVisible([0, 2], 1)).toEqual([2, 1]);
  });

  it("quitar una fila visible la elimina del array", () => {
    expect(toggleScaleCompareVisible([0, 2], 0)).toEqual([2]);
  });

  it("quitar la única fila visible deja array vacío", () => {
    expect(toggleScaleCompareVisible([3], 3)).toEqual([]);
  });

  it("FIFO secuencia completa: [1,3] → [3,2] → [2,0]", () => {
    let v = [1, 3];
    v = toggleScaleCompareVisible(v, 2); // [3, 2]
    expect(v).toEqual([3, 2]);
    v = toggleScaleCompareVisible(v, 0); // [2, 0]
    expect(v).toEqual([2, 0]);
  });

  it("nunca tiene más de 2 elementos", () => {
    let v = [];
    v = toggleScaleCompareVisible(v, 0);
    v = toggleScaleCompareVisible(v, 1);
    v = toggleScaleCompareVisible(v, 2);
    v = toggleScaleCompareVisible(v, 3);
    expect(v.length).toBeLessThanOrEqual(2);
  });

  it("no muta el array original", () => {
    const original = [0, 1];
    toggleScaleCompareVisible(original, 2);
    expect(original).toEqual([0, 1]);
  });
});

// ─── SCALE_COMPARE_ROW_DEFAULTS ──────────────────────────────────────────────

describe("SCALE_COMPARE_ROW_DEFAULTS", () => {
  it("tiene exactamente 4 filas con ids 0-3", () => {
    expect(SCALE_COMPARE_ROW_DEFAULTS.length).toBe(4);
    expect(SCALE_COMPARE_ROW_DEFAULTS.map((r) => r.id)).toEqual([0, 1, 2, 3]);
  });

  it("cada fila tiene scaleName válido en SCALE_PRESETS", () => {
    SCALE_COMPARE_ROW_DEFAULTS.forEach((r) => {
      expect(Object.keys(SCALE_PRESETS)).toContain(r.scaleName);
    });
  });

  it("cada fila tiene color en formato hex", () => {
    SCALE_COMPARE_ROW_DEFAULTS.forEach((r) => {
      expect(r.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
