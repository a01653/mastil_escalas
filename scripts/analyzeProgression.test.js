/**
 * Tests de integración para scripts/analyzeProgression.mjs
 * Ejecuta el script real vía child_process y verifica la salida.
 */

import { describe, test, expect } from "vitest";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "analyzeProgression.mjs");

function runCLI(arg) {
  return execSync(`node "${SCRIPT}" "${arg}"`, { encoding: "utf-8", cwd: path.join(__dirname, "..") });
}

function runCLIJson(arg) {
  const raw = execSync(`node "${SCRIPT}" "${arg}" --json`, { encoding: "utf-8", cwd: path.join(__dirname, "..") });
  return JSON.parse(raw);
}

describe("analyzeProgression CLI — salida humana", () => {
  test("C | F | G | Am → menciona C mayor", () => {
    const out = runCLI("C | F | G | Am");
    expect(out).toMatch(/C mayor/);
  });

  test("F# | Bm | A/E | D/F# → B menor como primera opción", () => {
    const out = runCLI("F# | Bm | A/E | D/F#");
    expect(out).toMatch(/B menor/);
    expect(out).toMatch(/dominante de Bm/);
  });

  test("C | E7 | Am | F | G → menciona C mayor o A menor", () => {
    const out = runCLI("C | E7 | Am | F | G");
    expect(out.match(/C mayor|A menor/)).toBeTruthy();
  });

  test("D | G | A | D → menciona D mayor", () => {
    const out = runCLI("D | G | A | D");
    expect(out).toMatch(/D mayor/);
  });

  test("B7 | Em | C | D → menciona E menor (B7 = dominante de Em)", () => {
    const out = runCLI("B7 | Em | C | D");
    expect(out).toMatch(/E menor/);
    expect(out).toMatch(/dominante de Em/);
  });

  test("Am | G | F | E → menciona A menor", () => {
    const out = runCLI("Am | G | F | E");
    expect(out).toMatch(/A menor/);
    expect(out).toMatch(/dominante de Am/);
  });
});

describe("analyzeProgression CLI — salida JSON", () => {
  test("C F G Am → JSON válido con B menor o C mayor", () => {
    const json = runCLIJson("C F G Am");
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.keys)).toBe(true);
    const labels = json.keys.map((k) => k.label);
    expect(labels).toContain("C mayor");
  });

  test("F# | Bm | A/E | D/F# → JSON con B menor primero", () => {
    const json = runCLIJson("F# | Bm | A/E | D/F#");
    expect(json.ok).toBe(true);
    expect(json.keys[0].label).toBe("B menor");
    const bMin = json.keys.find((k) => k.label === "B menor");
    expect(bMin.functionalChords.some((f) => f.explanation.includes("dominante de Bm"))).toBe(true);
  });
});
