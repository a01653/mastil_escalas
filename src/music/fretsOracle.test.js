import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { analyzeFretsOracle, generateOracleVoicingPatterns } from "./fretsOracle.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const goldenCases = JSON.parse(readFileSync(resolve(__dirname, "fretsOracleGoldenCases.json"), "utf8"));

describe("fretsOracle", () => {
  it("genera el espacio bruto x/0..5 de 7^6 patrones", () => {
    let count = 0;
    let first = null;
    let last = null;
    for (const voicing of generateOracleVoicingPatterns()) {
      first ??= voicing;
      last = voicing;
      count += 1;
    }
    expect(count).toBe(117649);
    expect(first).toBe("xxxxxx");
    expect(last).toBe("555555");
  });

  it("x02440 conserva lecturas B7(add11,no5)/A y Emaj7(add11,no3)/A", () => {
    const oracle = analyzeFretsOracle("x02440");
    const names = oracle.candidates.map((candidate) => candidate.name);
    expect(oracle.notes).toEqual(["A", "E", "B", "D#", "E"]);
    expect(oracle.uniqueNotes).toEqual(["A", "E", "B", "D#"]);
    expect(oracle.bass).toBe("A");
    expect(names).toContain("B7(add11,no5)/A");
    expect(names).toContain("Emaj7(add11,no3)/A");
    expect(oracle.mayInclude).toContain("B7(add11,no5)/A");
    expect(oracle.mayInclude).toContain("Emaj7(add11,no3)/A");
  });

  it("002200 no inventa E7sus4(no3) porque falta b7/D", () => {
    const oracle = analyzeFretsOracle("002200");
    const names = oracle.candidates.map((candidate) => candidate.name);
    expect(oracle.notes).toEqual(["E", "A", "E", "A", "B", "E"]);
    expect(oracle.uniqueNotes).toEqual(["E", "A", "B"]);
    expect(oracle.bass).toBe("E");
    expect(names).toContain("Asus2/E");
    expect(names).not.toContain("E7sus4(no3)");
  });

  it("no obliga lecturas cuartales automaticas como mustInclude", () => {
    const oracle = analyzeFretsOracle("xxx135");
    const quartalNames = oracle.candidates
      .filter((candidate) => candidate.category === "quartal")
      .map((candidate) => candidate.name);
    expect(quartalNames.length).toBeGreaterThan(0);
    for (const name of quartalNames) {
      expect(oracle.mustInclude).not.toContain(name);
      expect(oracle.informational).toContain(name);
    }
  });

  it("los casos dorados tienen notas, bajo y expectativas explicitas", () => {
    expect(goldenCases.length).toBeGreaterThanOrEqual(2);
    for (const testCase of goldenCases) {
      expect(testCase.voicing).toMatch(/^[xX0-9]{6}$/);
      expect(testCase.notes?.length).toBeGreaterThanOrEqual(3);
      expect(testCase.bass).toBeTruthy();
      expect(
        Boolean(testCase.mustInclude?.length)
          || Boolean(testCase.mustIncludeAny?.length)
          || Boolean(testCase.preferred)
      ).toBe(true);
    }
  });
});
