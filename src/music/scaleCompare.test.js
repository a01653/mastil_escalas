import { describe, it, expect } from "vitest";
import {
  computeScalePcs,
  buildIntervalLabelMap,
  toggleScaleCompareVisible,
  rootPcFromLetterAcc,
  SCALE_COMPARE_ROW_DEFAULTS,
  SCALE_COMPARE_VISIBLE_DEFAULTS,
  normalizeScaleCompareConfig,
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

  it("progresión 2-5-1-4 en C: D G C F Mayor", () => {
    const letters = SCALE_COMPARE_ROW_DEFAULTS.map((r) => r.rootLetter);
    expect(letters).toEqual(["D", "G", "C", "F"]);
  });

  it("todas las filas usan escala Mayor por defecto", () => {
    SCALE_COMPARE_ROW_DEFAULTS.forEach((r) => {
      expect(r.scaleName).toBe("Mayor");
    });
  });

  it("todas las filas sin alteración por defecto", () => {
    SCALE_COMPARE_ROW_DEFAULTS.forEach((r) => {
      expect(r.rootAcc).toBe("");
    });
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

// ─── SCALE_COMPARE_VISIBLE_DEFAULTS ──────────────────────────────────────────

describe("SCALE_COMPARE_VISIBLE_DEFAULTS", () => {
  it("son [0, 1] (fila D y G visibles por defecto)", () => {
    expect(SCALE_COMPARE_VISIBLE_DEFAULTS).toEqual([0, 1]);
  });

  it("no excede el máximo de 2 visibles", () => {
    expect(SCALE_COMPARE_VISIBLE_DEFAULTS.length).toBeLessThanOrEqual(2);
  });
});

// ─── normalizeScaleCompareConfig ─────────────────────────────────────────────

describe("normalizeScaleCompareConfig", () => {
  it("sin config → aplica defaults D/G/C/F Mayor y visibles [0,1]", () => {
    const result = normalizeScaleCompareConfig(undefined);
    expect(result.rows.map((r) => r.rootLetter)).toEqual(["D", "G", "C", "F"]);
    result.rows.forEach((r) => expect(r.scaleName).toBe("Mayor"));
    expect(result.visible).toEqual([0, 1]);
    expect(result.showResolutionPoints).toBe(false);
  });

  it("config vacía {} → aplica todos los defaults", () => {
    const result = normalizeScaleCompareConfig({});
    expect(result.rows.map((r) => r.rootLetter)).toEqual(["D", "G", "C", "F"]);
    expect(result.visible).toEqual([0, 1]);
    expect(result.showResolutionPoints).toBe(false);
  });

  it("config con scaleCompareRows válidas → las restaura", () => {
    const saved = {
      scaleCompareRows: [
        { id: 0, rootLetter: "A", rootAcc: "", scaleName: "Menor natural", color: "#aabbcc" },
        { id: 1, rootLetter: "E", rootAcc: "", scaleName: "Mayor",          color: "#112233" },
        { id: 2, rootLetter: "D", rootAcc: "#", scaleName: "Dórica (Dorian)", color: "#445566" },
        { id: 3, rootLetter: "G", rootAcc: "b", scaleName: "Mixolidia (Mixolydian)", color: "#778899" },
      ],
      scaleCompareVisible: [1, 2],
    };
    const result = normalizeScaleCompareConfig(saved);
    expect(result.rows[0].rootLetter).toBe("A");
    expect(result.rows[0].scaleName).toBe("Menor natural");
    expect(result.rows[2].rootAcc).toBe("#");
    expect(result.rows[3].rootAcc).toBe("b");
    expect(result.visible).toEqual([1, 2]);
  });

  it("scaleCompareVisible vacío [] se respeta (usuario desactivó todo)", () => {
    const result = normalizeScaleCompareConfig({ scaleCompareVisible: [] });
    expect(result.visible).toEqual([]);
  });

  it("más de 2 visibles → recorta a los 2 primeros", () => {
    const result = normalizeScaleCompareConfig({ scaleCompareVisible: [0, 1, 2, 3] });
    expect(result.visible).toEqual([0, 1]);
  });

  it("IDs inválidos en visible → se limpian", () => {
    const result = normalizeScaleCompareConfig({ scaleCompareVisible: [99, 0, -1, 2] });
    expect(result.visible).toEqual([0, 2]);
  });

  it("scaleName inválido en fila → usa 'Mayor' como fallback", () => {
    const saved = {
      scaleCompareRows: [
        { id: 0, rootLetter: "C", rootAcc: "", scaleName: "EscalaInventada", color: "#000000" },
        ...SCALE_COMPARE_ROW_DEFAULTS.slice(1).map((r) => ({ ...r })),
      ],
    };
    const result = normalizeScaleCompareConfig(saved);
    expect(result.rows[0].scaleName).toBe("Mayor");
  });

  it("color inválido en fila → usa color por defecto de esa fila", () => {
    const saved = {
      scaleCompareRows: [
        { id: 0, rootLetter: "D", rootAcc: "", scaleName: "Mayor", color: "no-es-hex" },
        ...SCALE_COMPARE_ROW_DEFAULTS.slice(1).map((r) => ({ ...r })),
      ],
    };
    const result = normalizeScaleCompareConfig(saved);
    expect(result.rows[0].color).toBe(SCALE_COMPARE_ROW_DEFAULTS[0].color);
  });

  it("rootLetter inválido → usa letra por defecto de la fila", () => {
    const saved = {
      scaleCompareRows: [
        { id: 0, rootLetter: "H", rootAcc: "", scaleName: "Mayor", color: "#aabbcc" },
        ...SCALE_COMPARE_ROW_DEFAULTS.slice(1).map((r) => ({ ...r })),
      ],
    };
    const result = normalizeScaleCompareConfig(saved);
    expect(result.rows[0].rootLetter).toBe(SCALE_COMPARE_ROW_DEFAULTS[0].rootLetter);
  });

  it("id incorrecto en fila → usa defaults de esa posición", () => {
    const saved = {
      scaleCompareRows: [
        { id: 99, rootLetter: "A", rootAcc: "", scaleName: "Mayor", color: "#aabbcc" },
        ...SCALE_COMPARE_ROW_DEFAULTS.slice(1).map((r) => ({ ...r })),
      ],
    };
    const result = normalizeScaleCompareConfig(saved);
    // fila 0 con id=99 → no coincide con def.id=0 → usa default
    expect(result.rows[0]).toMatchObject(SCALE_COMPARE_ROW_DEFAULTS[0]);
  });

  it("showResolutionPoints se restaura si está en config", () => {
    const result = normalizeScaleCompareConfig({ showResolutionPoints: true });
    expect(result.showResolutionPoints).toBe(true);
  });

  it("showResolutionPoints ausente → false por defecto", () => {
    const result = normalizeScaleCompareConfig({});
    expect(result.showResolutionPoints).toBe(false);
  });

  it("showResolutionPoints con valor no-booleano → false", () => {
    const result = normalizeScaleCompareConfig({ showResolutionPoints: "yes" });
    expect(result.showResolutionPoints).toBe(false);
  });
});
