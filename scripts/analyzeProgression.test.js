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

// ════════════════════════════════════════════════════════════════════════════════
// BATERÍA DE REGRESIÓN v6.0.68
// ════════════════════════════════════════════════════════════════════════════════

// ── A) Regresión estricta — CLI ───────────────────────────────────────────────
describe("A) Regresión estricta CLI — dominante funcional en menor", () => {
  test("E | Am | G | C → A menor primero, E como dominante de Am", () => {
    const json = runCLIJson("E | Am | G | C");
    expect(json.ok).toBe(true);
    expect(json.keys[0].label).toBe("A menor");
    const aMin = json.keys.find((k) => k.label === "A menor");
    expect(aMin.functionalChords.some((f) => f.explanation === "E → dominante de Am")).toBe(true);
  });

  test("Am | G | F | E → A menor primero, E como dominante de Am (output humano)", () => {
    const out = runCLI("Am | G | F | E");
    const lines = out.split("\n");
    const keyLine = lines.find((l) => l.includes("mayor") || l.includes("menor"));
    expect(keyLine).toMatch(/A menor/);
    expect(out).toMatch(/dominante de Am/);
  });
});

describe("A) Regresión estricta CLI — dominantes secundarios", () => {
  test("C | E7 | Am | F | G → A menor primero (93%), E7 como dominante, C mayor alternativa", () => {
    const json = runCLIJson("C | E7 | Am | F | G");
    expect(json.ok).toBe(true);
    expect(json.keys[0].label).toBe("A menor");
    const aMin = json.keys.find((k) => k.label === "A menor");
    expect(aMin.percentage).toBe(93);
    expect(aMin.functionalChords.some((f) => f.explanation === "E7 → dominante de Am")).toBe(true);
    expect(aMin.diatonicChords).not.toContain("E7");
    const cMaj = json.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    expect(cMaj.percentage).toBeGreaterThanOrEqual(80);
  });

  test("A7 | Dm | G | C → C mayor primero, A7 como dominante secundario de Dm", () => {
    const json = runCLIJson("A7 | Dm | G | C");
    expect(json.ok).toBe(true);
    expect(json.keys[0].label).toBe("C mayor");
    const cMaj = json.keys.find((k) => k.label === "C mayor");
    expect(cMaj.functionalChords.some((f) => f.explanation === "A7 → dominante secundario de Dm")).toBe(true);
  });

  test("G | Em | C | D → G mayor y E menor al 100%, todos diatónicos", () => {
    const json = runCLIJson("G | Em | C | D");
    expect(json.ok).toBe(true);
    const gMaj = json.keys.find((k) => k.label === "G mayor");
    expect(gMaj).toBeDefined();
    expect(gMaj.percentage).toBe(100);
    expect(gMaj.functionalChords).toHaveLength(0);
    expect(gMaj.outsideChords).toHaveLength(0);
    expect(json.keys.find((k) => k.label === "E menor").percentage).toBe(100);
  });

  test("F#m | Bm | A/E | D/F# → D mayor primero, las cuatro tonalidades al 100%", () => {
    const json = runCLIJson("F#m | Bm | A/E | D/F#");
    expect(json.ok).toBe(true);
    expect(json.keys[0].label).toBe("D mayor");
    const labels = json.keys.map((k) => k.label);
    for (const lbl of ["D mayor", "A mayor", "F# menor", "B menor"]) {
      expect(labels).toContain(lbl);
      expect(json.keys.find((k) => k.label === lbl).percentage).toBe(100);
    }
  });
});

// ── B) Comportamiento documentado — CLI ───────────────────────────────────────
describe("B) Comportamiento documentado CLI — modal / blues (no rompe)", () => {
  test("C | Bb | F | C — no rompe; resultado aproximado (bVII prestado)", () => {
    const json = runCLIJson("C | Bb | F | C");
    expect(json.ok).toBe(true);
    expect(json.keys.length).toBeGreaterThan(0);
    // Comportamiento actual: F mayor o D menor (C, Bb, F diatónicos en F mayor)
    const labels = json.keys.map((k) => k.label);
    expect(labels.some((l) => l === "F mayor" || l === "D menor" || l === "C mayor")).toBe(true);
  });

  test("D | C | G | D — no rompe; resultado aproximado (mixolidio)", () => {
    const json = runCLIJson("D | C | G | D");
    expect(json.ok).toBe(true);
    expect(json.keys.length).toBeGreaterThan(0);
    const labels = json.keys.map((k) => k.label);
    expect(labels.some((l) => l === "G mayor" || l === "E menor" || l === "D mayor")).toBe(true);
  });

  test("A7 | D7 | A7 | E7 | D7 | A7 — blues I7-IV7-V7: no rompe, tónico A presente", () => {
    // Limitación: el motor no detecta blues. No fijamos el label exacto ("A mayor")
    // para no bloquear una mejora futura que detecte "A blues" / "A dominante blues".
    const json = runCLIJson("A7 | D7 | A7 | E7 | D7 | A7");
    expect(json.ok).toBe(true);
    expect(json.keys.length).toBeGreaterThan(0);
    expect(json.keys.some((k) => k.label.startsWith("A "))).toBe(true);
  });

  test("E7 | A7 | B7 | A7 — blues, no rompe", () => {
    const json = runCLIJson("E7 | A7 | B7 | A7");
    expect(json.ok).toBe(true);
    expect(json.keys.length).toBeGreaterThan(0);
    const labels = json.keys.map((k) => k.label);
    expect(labels.some((l) => l === "E mayor" || l === "C# menor" || l === "A mayor")).toBe(true);
  });

  test("C | Ab | Bb | C — no rompe (intercambio modal, resultado ambiguo)", () => {
    const json = runCLIJson("C | Ab | Bb | C");
    expect(json.ok).toBe(true);
    expect(json.keys.length).toBeGreaterThan(0);
  });
});
