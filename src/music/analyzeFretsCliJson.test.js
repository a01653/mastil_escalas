/**
 * Tests de la interfaz CLI de analyzeFrets.mjs: flags --json y --all.
 * Ejecuta el script como subproceso para verificar comportamiento real de salida.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeFretsCore } from "./analyzeFretsCore.js";
import { parseFretString } from "./parseFretString.js";
import { partitionDetectedReadings } from "../features/chord-detection/chordReadingGroupsCore.js";
import { computeOracleExtras } from "../features/chord-detection/oracleExtrasCore.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SCRIPT = resolve(__dirname, "../../scripts/analyzeFrets.mjs");

function run(...args) {
  const result = spawnSync("node", [SCRIPT, ...args], { encoding: "utf-8" });
  return { exitCode: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function runJson(...args) {
  const { exitCode, stdout, stderr } = run(...args, "--json");
  let json = null;
  try { json = JSON.parse(stdout); } catch { /* ignore parse error */ }
  return { exitCode, json, raw: stdout, stderr };
}

function runNpmJsonScript(pattern) {
  const result = spawnSync("npm", ["run", "--silent", "analyze:frets:json", "--", pattern], {
    encoding: "utf-8",
    shell: true,
  });
  let json = null;
  try { json = JSON.parse(result.stdout); } catch { /* ignore parse error */ }
  return { exitCode: result.status ?? 1, json, raw: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return String(text || "").replace(/\x1b\[[0-9;]*m/g, "");
}

function patternToSelectedKeys(pattern) {
  const { frets } = parseFretString(pattern);
  return frets.flatMap((fret, lowEIndex) => (
    fret == null ? [] : [`${5 - lowEIndex}:${fret}`]
  ));
}

// ─── --json: estructura y parseo ─────────────────────────────────────────────

describe("--json: salida es JSON válido", () => {
  it("x5555x --json produce JSON parseable", () => {
    const { json } = runJson("x5555x");
    expect(json).not.toBeNull();
  });

  it("ok=true en éxito", () => {
    expect(runJson("x5555x").json?.ok).toBe(true);
  });

  it("stdout no contiene secuencias ANSI", () => {
    const { raw } = runJson("x5555x");
    // eslint-disable-next-line no-control-regex
    expect(raw).not.toMatch(/\x1b\[/);
  });

  it("campos de primer nivel presentes", () => {
    const { json } = runJson("x5555x");
    expect(json).toHaveProperty("pattern");
    expect(json).toHaveProperty("normalizedPattern");
    expect(json).toHaveProperty("notes");
    expect(json).toHaveProperty("bass");
    expect(json).toHaveProperty("reference");
    expect(json).toHaveProperty("prioritizeReference");
    expect(json).toHaveProperty("primary");
    expect(json).toHaveProperty("readings");
    expect(json).toHaveProperty("readingsMain");
    expect(json).toHaveProperty("readingsAdvanced");
    expect(json).toHaveProperty("oracleExtras");
  });

  it("x5555x --json → pattern y normalizedPattern correctos", () => {
    const { json } = runJson("x5555x");
    expect(json.pattern).toBe("x5555x");
    expect(json.normalizedPattern).toBe("x-5-5-5-5-x");
  });

  it("x5555x --json → notes=['D','G','C','E'], bass='D'", () => {
    const { json } = runJson("x5555x");
    expect(json.notes).toEqual(["D", "G", "C", "E"]);
    expect(json.bass).toBe("D");
  });

  it("x5555x --json → reference=null, prioritizeReference=false", () => {
    const { json } = runJson("x5555x");
    expect(json.reference).toBeNull();
    expect(json.prioritizeReference).toBe(false);
  });

  it("--json mantiene compatibilidad: readings sigue presente y añade partición separada", () => {
    const { json } = runJson("x5555x");
    expect(Array.isArray(json.readings)).toBe(true);
    expect(Array.isArray(json.readingsMain)).toBe(true);
    expect(Array.isArray(json.readingsAdvanced)).toBe(true);
    expect(Array.isArray(json.oracleExtras)).toBe(true);
    expect(json.readings[0]?.name).toBe("Cadd9/D");
  });

  it("4x2440 --json → bass='G#' alineado con la grafía de la primaria (no 'Ab')", () => {
    // Tras collapseEnharmonicTwins las lecturas usan G# (Emaj7/G#, G#m(addb13), …);
    // el bajo del encabezado no debe contradecirlas mostrando la canónica 'Ab'.
    const { json } = runJson("4x2440");
    expect(json.bass).toBe("G#");
    expect(json.primary?.name).toBe("Emaj7/G#");
    expect(json.readings.map((r) => r.name)).not.toContain("Abm(b13)");
  });
});

// ─── --json: primary sin referencia ──────────────────────────────────────────

describe("--json: primary sin referencia", () => {
  it("x5555x --json → primary.name = Cadd9/D", () => {
    expect(runJson("x5555x").json?.primary?.name).toBe("Cadd9/D");
  });

  it("x5555x --json → primary.promotedByReference = false", () => {
    expect(runJson("x5555x").json?.primary?.promotedByReference).toBe(false);
  });

  it("x5555x --json → readings[0].name = Cadd9/D", () => {
    const { json } = runJson("x5555x");
    expect(json?.readings[0]?.name).toBe("Cadd9/D");
  });

  it("x5555x --json → readings array no vacío", () => {
    const { json } = runJson("x5555x");
    expect(json?.readings.length).toBeGreaterThan(0);
  });

  it("x5555x --json → primary tiene campos root, bass, formula, rank", () => {
    const { json } = runJson("x5555x");
    expect(json?.primary).toHaveProperty("root");
    expect(json?.primary).toHaveProperty("bass");
    expect(json?.primary).toHaveProperty("formula");
    expect(json?.primary).toHaveProperty("rank");
  });

  it("x5555x --json → rank es número", () => {
    const { json } = runJson("x5555x");
    expect(typeof json?.primary?.rank).toBe("number");
  });
});

// ─── --json: primary con referencia ──────────────────────────────────────────

describe("--json: primary con referencia", () => {
  it("x5555x --ref D7 --json → primary.name = D9sus4(no5)", () => {
    expect(runJson("x5555x", "--ref", "D7").json?.primary?.name).toBe("D9sus4(no5)");
  });

  it("x5555x --ref D7 --json → primary.promotedByReference = true", () => {
    expect(runJson("x5555x", "--ref", "D7").json?.primary?.promotedByReference).toBe(true);
  });

  it("x5555x --ref D7 --json → reference='D7', prioritizeReference=true", () => {
    const { json } = runJson("x5555x", "--ref", "D7");
    expect(json?.reference).toBe("D7");
    expect(json?.prioritizeReference).toBe(true);
  });

  it("x5555x --ref C --json → primary.name = Cadd9/D (raíz no encaja)", () => {
    expect(runJson("x5555x", "--ref", "C").json?.primary?.name).toBe("Cadd9/D");
  });

  it("x5555x --ref C --json → primary.promotedByReference = false", () => {
    expect(runJson("x5555x", "--ref", "C").json?.primary?.promotedByReference).toBe(false);
  });

  it("1320xx --ref Fmaj7 --json → primary.name = Fmaj9(no3)", () => {
    expect(runJson("1320xx", "--ref", "Fmaj7").json?.primary?.name).toBe("Fmaj9(no3)");
  });

  it("--json readings mantiene todos los candidatos con --ref", () => {
    const { json } = runJson("x5555x", "--ref", "D7");
    // El candidato promovido es el primero
    expect(json?.readings[0]?.name).toBe("D9sus4(no5)");
    // Cadd9/D sigue en la lista
    expect(json?.readings.some((r) => r.name === "Cadd9/D")).toBe(true);
  });
});

// ─── --json: errores ──────────────────────────────────────────────────────────

describe("--json: errores", () => {
  it("referencia inválida --json → ok=false", () => {
    const { json } = runJson("x5555x", "--ref", "Pepito");
    expect(json?.ok).toBe(false);
  });

  it("referencia inválida --json → exit code != 0", () => {
    expect(runJson("x5555x", "--ref", "Pepito").exitCode).not.toBe(0);
  });

  it("referencia inválida --json → campo error y code", () => {
    const { json } = runJson("x5555x", "--ref", "Pepito");
    expect(json?.error).toBeTruthy();
    expect(json?.code).toBe("INVALID_REFERENCE");
  });

  it("referencia inválida --json → stdout es JSON puro (no texto de error)", () => {
    const { raw } = runJson("x5555x", "--ref", "Pepito");
    // No debe haber texto ANSI ni mensajes humanos mezclados
    // eslint-disable-next-line no-control-regex
    expect(raw).not.toMatch(/\x1b\[/);
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

// ─── --all: salida detallada con --ref ────────────────────────────────────────

describe("--all con --ref: muestra detalle completo", () => {
  it("x5555x --ref D7 --all → exit code 0", () => {
    expect(run("x5555x", "--ref", "D7", "--all").exitCode).toBe(0);
  });

  it("x5555x --ref D7 --all → stdout contiene 'fórmula:'", () => {
    const { stdout } = run("x5555x", "--ref", "D7", "--all");
    expect(stdout).toMatch(/fórmula:/);
  });

  it("x5555x --ref D7 --all → stdout contiene 'raíz:'", () => {
    const { stdout } = run("x5555x", "--ref", "D7", "--all");
    expect(stdout).toMatch(/raíz:/);
  });

  it("x5555x --ref D7 --all → stdout contiene '← por referencia'", () => {
    const { stdout } = run("x5555x", "--ref", "D7", "--all");
    expect(stdout).toMatch(/← por referencia/);
  });

  it("x5555x --ref D7 sin --all → stdout mantiene el detalle por secciones", () => {
    const { stdout } = run("x5555x", "--ref", "D7");
    expect(stripAnsi(stdout)).toContain("Lecturas principales");
    expect(stripAnsi(stdout)).toContain("fórmula:");
  });

  it("--json ignora --all (siempre incluye todos los campos)", () => {
    const withAll    = runJson("x5555x", "--ref", "D7", "--all");
    const withoutAll = runJson("x5555x", "--ref", "D7");
    expect(withAll.json?.readings.length).toBe(withoutAll.json?.readings.length);
    expect(withAll.json?.primary?.name).toBe(withoutAll.json?.primary?.name);
  });

  it("npm run analyze:frets:json -- x02440 acepta --json antes del patrón", () => {
    const { exitCode, json } = runNpmJsonScript("x02440");
    expect(exitCode).toBe(0);
    expect(json?.ok).toBe(true);
    expect(json?.pattern).toBe("x02440");
    expect(json?.readings.some((reading) => reading.name === "B7(add11,no5)/A")).toBe(true);
  });
});

describe("salida humana: secciones como la UI", () => {
  it("304030 muestra la sección 'Lecturas extra del oráculo'", () => {
    const { exitCode, stdout } = run("304030");
    expect(exitCode).toBe(0);
    expect(stripAnsi(stdout)).toContain("Lecturas extra del oráculo");
  });

  it("304030 incluye Gmaj7(add9,add13,no3) en extras si el oráculo lo devuelve", () => {
    const pattern = "304030";
    const result = analyzeFretsCore(pattern);
    const oracle = computeOracleExtras(patternToSelectedKeys(pattern), result.rankedReadings);
    const expectedName = "Gmaj7(add9,add13,no3)";
    const { json } = runJson(pattern);
    const { stdout } = run(pattern);
    const cleanStdout = stripAnsi(stdout);
    const oracleHasExpected = oracle.extras.some((extra) => extra.name === expectedName);

    if (oracleHasExpected) {
      expect(cleanStdout).toContain(expectedName);
      expect(json?.oracleExtras.some((extra) => extra.name === expectedName)).toBe(true);
    } else {
      expect(json?.oracleExtras.some((extra) => extra.name === expectedName)).toBe(false);
    }
  });

  it("x02440 muestra normales, avanzadas/contextuales y extras o 'ninguna' según corresponda", () => {
    const pattern = "x02440";
    const result = analyzeFretsCore(pattern);
    const primaryId = result.primary?.id ?? result.rankedReadings[0]?.id ?? null;
    const { main, advanced } = partitionDetectedReadings({
      candidates: result.rankedReadings,
      keepVisibleId: primaryId,
    });
    const oracle = computeOracleExtras(patternToSelectedKeys(pattern), result.rankedReadings);
    const { exitCode, stdout } = run(pattern);
    const cleanStdout = stripAnsi(stdout);

    expect(exitCode).toBe(0);
    expect(cleanStdout).toContain("Lecturas principales (");
    expect(cleanStdout).toContain("Lecturas avanzadas / contextuales (");
    expect(cleanStdout).toContain("Lecturas extra del oráculo");

    if (advanced.length === 0) {
      expect(cleanStdout).toContain("Lecturas avanzadas / contextuales: ninguna");
    } else {
      expect(cleanStdout).toContain(advanced[0].name);
    }

    if (oracle.extras.length === 0) {
      expect(cleanStdout).toContain("Lecturas extra del oráculo: ninguna");
    } else {
      expect(cleanStdout).toContain(oracle.extras[0].name);
    }

    expect(cleanStdout).toContain(main[0].name);
  });
});
