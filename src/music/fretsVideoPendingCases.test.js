import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CASES_PATH = resolve(__dirname, "fretsVideoPendingCases.json");
const cases = JSON.parse(readFileSync(CASES_PATH, "utf8"));

describe("fretsVideoPendingCases", () => {
  it("carga un array JSON válido", () => {
    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThanOrEqual(3);
  });

  it("marca todos los casos como pending y no los activa como golden", () => {
    for (const entry of cases) {
      expect(entry.pending).toBe(true);
      expect(entry.golden ?? false).toBe(false);
    }
  });

  it("define voicing, notas, bajo y problema para cada caso", () => {
    for (const entry of cases) {
      expect(entry.voicing).toMatch(/^[x0-9a-z]{6}$/i);
      expect(Array.isArray(entry.notes)).toBe(true);
      expect(entry.notes.length).toBeGreaterThan(0);
      expect(typeof entry.bass).toBe("string");
      expect(entry.bass.length).toBeGreaterThan(0);
      expect(typeof entry.problem).toBe("string");
      expect(entry.problem.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.currentReaderMain)).toBe(true);
      expect(Array.isArray(entry.currentReaderAdvanced)).toBe(true);
      expect(Array.isArray(entry.currentOracleExtras)).toBe(true);
    }
  });

  it("mantiene voicings únicos para evitar ambigüedad al activar futuros golden", () => {
    const voicings = cases.map((entry) => entry.voicing);
    expect(new Set(voicings).size).toBe(voicings.length);
  });
});
