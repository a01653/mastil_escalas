import { describe, expect, test } from "vitest";
import {
  computeGuitaristicScore,
  filterGuitaristicVoicings,
  buildVoicingFromFretsLH,
  parseChordDbFretsString,
} from "./appVoicingStudyCore.js";

// ─── helper ───────────────────────────────────────────────────────────────────

/**
 * Builds a voicing object from a frets string.
 * rootPc is irrelevant for guitaristic scoring (only physical fields used).
 */
function mkv(frets, opts = {}) {
  const { rootPc = 0, maxFret = 22, catalogIdx } = opts;
  const fretsLH = parseChordDbFretsString(frets);
  if (!fretsLH) throw new Error(`Invalid frets string: "${frets}"`);
  const v = buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
  if (!v) throw new Error(`buildVoicingFromFretsLH returned null for: "${frets}"`);
  if (catalogIdx != null) v._catalogIdx = catalogIdx;
  return v;
}

// ─── computeGuitaristicScore ──────────────────────────────────────────────────

describe("computeGuitaristicScore — canonical open and barre forms", () => {
  test("x32010 (C open) scores high", () => {
    // snd=5, open=2, clean, minFret=1, span=2 → 10+6+0 = 16
    expect(computeGuitaristicScore(mkv("x32010"))).toBeGreaterThanOrEqual(14);
  });

  test("x35553 (C/A-shape barre) scores high", () => {
    // snd=5, barre, clean, minFret=3, span=2 → 10+0+4 = 14
    expect(computeGuitaristicScore(mkv("x35553"))).toBeGreaterThanOrEqual(12);
  });

  test("133211 (F barre, 6 strings) scores high", () => {
    // snd=6, barre, clean, minFret=1, span=2 → 12+0+4 = 16
    expect(computeGuitaristicScore(mkv("133211"))).toBeGreaterThanOrEqual(14);
  });

  test("xx0232 (D open) scores high", () => {
    // snd=4, open=1, barre(2 appears 2×), clean, minFret=2, span=1 → 8+3+4 = 15
    expect(computeGuitaristicScore(mkv("xx0232"))).toBeGreaterThanOrEqual(13);
  });

  test("022100 (E open) scores high", () => {
    // snd=5, open=1, barre(1 appears 2×?), minFret=1, span=2
    // Decoded: [null,2,2,1,0,0] → fretted=[2,2,1], min=1, count(1)=1 → no barre
    // open=2 (indices 4,5) → 10+6+0 = 16
    expect(computeGuitaristicScore(mkv("022100"))).toBeGreaterThanOrEqual(13);
  });

  test("320003 (G open) scores high", () => {
    // snd=5, open=3, minimal span
    expect(computeGuitaristicScore(mkv("320003"))).toBeGreaterThanOrEqual(13);
  });

  test("x02220 (A open) scores high", () => {
    // snd=5, open=1, barre(2 appears 3×), clean
    expect(computeGuitaristicScore(mkv("x02220"))).toBeGreaterThanOrEqual(12);
  });
});

describe("computeGuitaristicScore — penalizes fragmented and high-position forms", () => {
  test("13x2xx (F fragment, 3 strings only) scores low", () => {
    // snd=3, internal_mute=1 → 6-4 = 2
    expect(computeGuitaristicScore(mkv("13x2xx"))).toBeLessThan(8);
  });

  test("x32x53 (C with internal mute) penalized", () => {
    // snd=4, internal_mute=1 → 8-4 = 4
    expect(computeGuitaristicScore(mkv("x32x53"))).toBeLessThan(8);
  });

  test("87xx88 (C with 2 internal mutes) scores near zero or negative", () => {
    // snd=4, internal_mutes=2 → 8-8 = 0
    expect(computeGuitaristicScore(mkv("87xx88"))).toBeLessThanOrEqual(2);
  });

  test("133211 scores higher than 13x2xx", () => {
    expect(computeGuitaristicScore(mkv("133211"))).toBeGreaterThan(
      computeGuitaristicScore(mkv("13x2xx"))
    );
  });

  test("kmmlkk (C barre at fret 20) is penalized for high position", () => {
    const highScore = computeGuitaristicScore(mkv("kmmlkk"));
    // snd=6, clean barre, but minFret=20 → -(20-7)=-13 → 12+4-13=3
    expect(highScore).toBeLessThan(8);
  });

  test("xfhhhf (C barre at fret 15) is below habitual threshold", () => {
    const score = computeGuitaristicScore(mkv("xfhhhf"));
    // snd=5, clean barre, minFret=15 → 10+4-(15-7)=14-8=6
    expect(score).toBeLessThan(8);
  });
});

describe("computeGuitaristicScore — relative ordering", () => {
  test("xx0232 (D open) scores higher than 2002x2 (D with internal mute)", () => {
    // xx0232: snd=4, open=1, barre(2×2), clean → 8+3+4=15
    // 2002x2: snd=5, open=2, barre(3×2), dirty (1 internal mute) → 10+6+0-4=12
    expect(computeGuitaristicScore(mkv("xx0232"))).toBeGreaterThan(
      computeGuitaristicScore(mkv("2002x2"))
    );
  });

  test("x32010 (C open) scores at least as high as x35553 (C barre)", () => {
    expect(computeGuitaristicScore(mkv("x32010"))).toBeGreaterThanOrEqual(
      computeGuitaristicScore(mkv("x35553"))
    );
  });

  test("133211 (F 6-string) scores higher than x33211 (F 5-string)", () => {
    // 133211: snd=6 → 12+0+4=16
    // x33211: snd=5 → 10+0+4=14
    expect(computeGuitaristicScore(mkv("133211"))).toBeGreaterThan(
      computeGuitaristicScore(mkv("x33211"))
    );
  });

  test("null / missing voicing returns -99", () => {
    expect(computeGuitaristicScore(null)).toBe(-99);
    expect(computeGuitaristicScore({})).toBe(-99);
    expect(computeGuitaristicScore({ frets: "xxx" })).toBe(-99); // invalid length
  });
});

// ─── filterGuitaristicVoicings ────────────────────────────────────────────────

describe("filterGuitaristicVoicings — level 'all'", () => {
  test("returns the input list unchanged", () => {
    const vs = [mkv("x32010"), mkv("x32x53"), mkv("13x2xx")];
    expect(filterGuitaristicVoicings("all", vs)).toBe(vs); // same reference
  });

  test("returns empty array for empty input", () => {
    expect(filterGuitaristicVoicings("all", [])).toEqual([]);
  });
});

describe("filterGuitaristicVoicings — level 'habitual'", () => {
  test("keeps canonical open/barre forms (x32010, x35553, 133211)", () => {
    const vs = [mkv("x32010"), mkv("x35553"), mkv("133211"), mkv("x32x53"), mkv("13x2xx")];
    const result = filterGuitaristicVoicings("habitual", vs);
    const fretsSet = new Set(result.map((v) => v.frets));
    expect(fretsSet.has("x32010")).toBe(true);
    expect(fretsSet.has("x35553")).toBe(true);
    expect(fretsSet.has("133211")).toBe(true);
  });

  test("excludes fragmented forms (x32x53, 13x2xx) when better alternatives exist", () => {
    const vs = [mkv("x32010"), mkv("x35553"), mkv("x32x53"), mkv("13x2xx")];
    const result = filterGuitaristicVoicings("habitual", vs);
    const fretsSet = new Set(result.map((v) => v.frets));
    expect(fretsSet.has("x32x53")).toBe(false);
    expect(fretsSet.has("13x2xx")).toBe(false);
  });

  test("falls back to 'all' if all voicings are low-scoring", () => {
    // Provide only fragmentary voicings that don't meet the habitual threshold
    const vs = [mkv("x32x53"), mkv("13x2xx"), mkv("87xx88")];
    const result = filterGuitaristicVoicings("habitual", vs);
    // Should fall back to full list
    expect(result.length).toBe(vs.length);
  });

  test("never returns empty list when input is non-empty", () => {
    const vs = [mkv("x32x53")];
    expect(filterGuitaristicVoicings("habitual", vs).length).toBeGreaterThan(0);
  });
});

describe("filterGuitaristicVoicings — level 'essential'", () => {
  test("keeps canonical forms (x32010, xx0232)", () => {
    const vs = [mkv("x32010"), mkv("x35553"), mkv("xx0232"), mkv("x32x53"), mkv("x32013")];
    const result = filterGuitaristicVoicings("essential", vs);
    const fretsSet = new Set(result.map((v) => v.frets));
    expect(fretsSet.has("x32010")).toBe(true);
    expect(fretsSet.has("xx0232")).toBe(true);
  });

  test("133211 (F barre) passes essential; 13x2xx does not", () => {
    const vs = [mkv("133211"), mkv("13x2xx")];
    const result = filterGuitaristicVoicings("essential", vs);
    const fretsSet = new Set(result.map((v) => v.frets));
    expect(fretsSet.has("133211")).toBe(true);
    expect(fretsSet.has("13x2xx")).toBe(false);
  });

  test("falls back to 'habitual' when no essential voicings exist", () => {
    // Only habitual forms, nothing essential (score 8–12)
    // Use a form with score exactly in habitual range: xfecdc (minFret=12 → score=9)
    const vs = [mkv("xfecdc"), mkv("x32x53")];
    const essential = filterGuitaristicVoicings("essential", vs);
    const fretsSet = new Set(essential.map((v) => v.frets));
    // xfecdc scores 9 (habitual but not essential); x32x53 scores 4 (not habitual)
    expect(essential.length).toBe(1);
    expect(fretsSet.has("xfecdc")).toBe(true);
  });

  test("falls back to 'all' when both essential and habitual are empty", () => {
    const vs = [mkv("x32x53"), mkv("13x2xx"), mkv("87xx88")];
    const result = filterGuitaristicVoicings("essential", vs);
    expect(result.length).toBe(vs.length);
  });

  test("never returns empty list when input is non-empty", () => {
    const vs = [mkv("x32x53")];
    expect(filterGuitaristicVoicings("essential", vs).length).toBeGreaterThan(0);
  });
});

describe("filterGuitaristicVoicings — ordering and _catalogIdx tie-break", () => {
  test("higher-scored voicing comes first in habitual tier", () => {
    // x32010 (score~16) vs x35553 (score~14) — x32010 should be first
    const vs = [mkv("x35553"), mkv("x32010")]; // intentionally reversed
    const result = filterGuitaristicVoicings("habitual", vs);
    expect(result[0].frets).toBe("x32010");
  });

  test("lower _catalogIdx wins when scores are equal", () => {
    // Use same-score forms x35553 and 87558x (both score 14)
    const vA = mkv("x35553", { catalogIdx: 3 });  // earlier in catalog
    const vB = mkv("87558x", { catalogIdx: 1 });  // even earlier in catalog
    // Both should have the same score (14); vB should come first (catalogIdx=1 < 3)
    const scoreA = computeGuitaristicScore(vA);
    const scoreB = computeGuitaristicScore(vB);
    expect(scoreA).toBe(scoreB); // prerequisite: same score
    const result = filterGuitaristicVoicings("habitual", [vA, vB]);
    expect(result[0]).toBe(vB); // _catalogIdx 1 wins over 3
  });

  test("within same score tier, original order used when _catalogIdx absent", () => {
    // x32010 and 875558 both score 16; neither has _catalogIdx.
    // Original order should determine position.
    const v1 = mkv("x32010");
    const v2 = mkv("875558");
    expect(computeGuitaristicScore(v1)).toBe(computeGuitaristicScore(v2)); // both 16
    const result = filterGuitaristicVoicings("habitual", [v1, v2]);
    expect(result[0]).toBe(v1); // original order preserved for equal score
  });
});

describe("filterGuitaristicVoicings — edge cases", () => {
  test("null / undefined input returns empty array", () => {
    expect(filterGuitaristicVoicings("habitual", null)).toEqual([]);
    expect(filterGuitaristicVoicings("habitual", undefined)).toEqual([]);
  });

  test("single-voicing list always returns that voicing regardless of level", () => {
    const vs = [mkv("x32x53")]; // score 4 — below habitual
    expect(filterGuitaristicVoicings("habitual",  vs)).toEqual(vs);
    expect(filterGuitaristicVoicings("essential", vs)).toEqual(vs);
  });
});
