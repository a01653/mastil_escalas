import { describe, test, expect } from "vitest";
import { analyzeProgression, parseProgressionText } from "./keyAnalysisEngine.js";

// ── parseProgressionText ──────────────────────────────────────────────────────

describe("parseProgressionText", () => {
  test("espacio como separador", () => {
    const r = parseProgressionText("C F G Am");
    expect(r.map((c) => c.symbol)).toEqual(["C", "F", "G", "Am"]);
    expect(r.find((c) => c.symbol === "Am").quality).toBe("min");
    expect(r.find((c) => c.symbol === "C").quality).toBe("maj");
  });

  test("pipe como separador", () => {
    const r = parseProgressionText("F# | Bm | A/E | D/F#");
    expect(r).toHaveLength(4);
    expect(r[0]).toMatchObject({ rootPc: 6, quality: "maj" });   // F#
    expect(r[1]).toMatchObject({ rootPc: 11, quality: "min" });  // Bm
    expect(r[2]).toMatchObject({ rootPc: 9, quality: "maj", bassRootPc: 4 });  // A/E
    expect(r[3]).toMatchObject({ rootPc: 2, quality: "maj", bassRootPc: 6 }); // D/F#
  });

  test("coma como separador", () => {
    const r = parseProgressionText("Am, F, C, G");
    expect(r.map((c) => c.symbol)).toEqual(["Am", "F", "C", "G"]);
  });

  test("salto de línea como separador", () => {
    const r = parseProgressionText("D\nG\nA\nD");
    expect(r.map((c) => c.symbol)).toEqual(["D", "G", "A", "D"]);
  });

  test("vacío devuelve array vacío", () => {
    expect(parseProgressionText("")).toEqual([]);
    expect(parseProgressionText("   ")).toEqual([]);
  });

  test("slash chord extrae bajo", () => {
    const r = parseProgressionText("D/F#");
    expect(r[0]).toMatchObject({ rootPc: 2, quality: "maj", bassRootPc: 6 });
  });

  test("Bb7 → Bb dominante (rootPc=10)", () => {
    const r = parseProgressionText("Bb7");
    expect(r[0]).toMatchObject({ rootPc: 10, quality: "dom" });
  });

  test("F#m7 → F# menor (rootPc=6)", () => {
    const r = parseProgressionText("F#m7");
    expect(r[0]).toMatchObject({ rootPc: 6, quality: "min" });
  });
});

// ── analyzeProgression ────────────────────────────────────────────────────────

describe("analyzeProgression", () => {
  test("vacío → isEmpty", () => {
    const r = analyzeProgression("");
    expect(r.isEmpty).toBe(true);
    expect(r.keys).toHaveLength(0);
  });

  test("C F G Am → C mayor y A menor con 100% encaje", () => {
    const r = analyzeProgression("C F G Am");
    expect(r.isEmpty).toBe(false);
    const labels = r.keys.map((k) => k.label);
    expect(labels).toContain("C mayor");
    expect(labels).toContain("A menor");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    const aMin = r.keys.find((k) => k.label === "A menor");
    expect(cMaj.percentage).toBe(100);
    expect(aMin.percentage).toBe(100);
    expect(cMaj.strength).toBe("fuerte");
    expect(aMin.strength).toBe("fuerte");
  });

  test("F#m Bm A D → D mayor y B menor como opciones diatónicas fuertes", () => {
    const r = analyzeProgression("F#m Bm A D");
    const labels = r.keys.map((k) => k.label);
    expect(labels).toContain("D mayor");
    expect(labels).toContain("B menor");
    const d = r.keys.find((k) => k.label === "D mayor");
    const b = r.keys.find((k) => k.label === "B menor");
    expect(d.percentage).toBe(100);
    expect(b.percentage).toBe(100);
  });

  test("F# Bm A D → B menor primera opción, F# como dominante de Bm", () => {
    const r = analyzeProgression("F# Bm A D");
    expect(r.isEmpty).toBe(false);
    expect(r.keys[0].label).toBe("B menor");
    const bMinor = r.keys.find((k) => k.label === "B menor");
    expect(bMinor).toBeDefined();
    const fsharp = bMinor.functionalChords.find((f) => f.symbol === "F#");
    expect(fsharp).toBeDefined();
    expect(fsharp.explanation).toMatch(/dominante de Bm/);
    // F# y los demás en la lista correcta
    expect(bMinor.diatonicChords).toContain("Bm");
    expect(bMinor.diatonicChords).toContain("A");
    expect(bMinor.diatonicChords).toContain("D");
  });

  test("D/F# G A D → D mayor primera opción con 100%", () => {
    const r = analyzeProgression("D/F# G A D");
    expect(r.keys[0].label).toBe("D mayor");
    expect(r.keys[0].percentage).toBe(100);
    // D/F# es diatónico en D mayor (I con bajo en 3ª)
    expect(r.keys[0].diatonicChords).toContain("D/F#");
  });

  test("Am F C G → C mayor y A menor como opciones fuertes", () => {
    const r = analyzeProgression("Am F C G");
    const labels = r.keys.map((k) => k.label);
    expect(labels).toContain("C mayor");
    expect(labels).toContain("A menor");
    const c = r.keys.find((k) => k.label === "C mayor");
    const a = r.keys.find((k) => k.label === "A menor");
    expect(c.percentage).toBe(100);
    expect(a.percentage).toBe(100);
  });

  test("F# | Bm | A/E | D/F# → B menor primera opción, F# como dominante", () => {
    const r = analyzeProgression("F# | Bm | A/E | D/F#");
    expect(r.keys[0].label).toBe("B menor");
    const bMinor = r.keys.find((k) => k.label === "B menor");
    expect(bMinor.functionalChords.some((f) => f.explanation.includes("dominante de Bm"))).toBe(true);
    expect(bMinor.diatonicChords).toContain("Bm");
    expect(bMinor.diatonicChords).toContain("A/E");
    expect(bMinor.diatonicChords).toContain("D/F#");
  });

  test("acordes fuera de tonalidad quedan en outsideChords", () => {
    const r = analyzeProgression("C Eb G Am"); // Eb no encaja en C mayor
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    if (cMaj) {
      expect(cMaj.outsideChords).toContain("Eb");
    }
  });

  // ── Progresiones adicionales del comando analyze:progression ─────────────────

  test("D G A Bm → D mayor y B menor con encaje alto", () => {
    const r = analyzeProgression("D | G | A | Bm");
    const labels = r.keys.map((k) => k.label);
    expect(labels).toContain("D mayor");
    expect(labels).toContain("B menor");
    expect(r.keys.find((k) => k.label === "D mayor").percentage).toBe(100);
  });

  test("E Am G C → C mayor o A menor con encaje alto", () => {
    const r = analyzeProgression("E | Am | G | C");
    // E mayor no es diatónico en C mayor (Em lo es), pero es dominante de Am
    const labels = r.keys.map((k) => k.label);
    expect(labels.some((l) => l === "C mayor" || l === "A menor")).toBe(true);
  });

  test("A7 Dm G C → C mayor primera opción (cadencias II-V-I)", () => {
    const r = analyzeProgression("A7 | Dm | G | C");
    expect(r.keys[0].label).toBe("C mayor");
  });

  test("B7 Em C D → E menor primera opción (B7 = dominante de Em)", () => {
    const r = analyzeProgression("B7 | Em | C | D");
    expect(r.keys[0].label).toBe("E menor");
    const eMin = r.keys.find((k) => k.label === "E menor");
    expect(eMin.functionalChords.some((f) => f.explanation.includes("dominante de Em"))).toBe(true);
    // G mayor también aparece con encaje moderado
    const gMaj = r.keys.find((k) => k.label === "G mayor");
    expect(gMaj).toBeDefined();
  });

  test("C E7 Am F G → tonalidad con encaje moderado incluye C mayor o A menor", () => {
    const r = analyzeProgression("C | E7 | Am | F | G");
    const labels = r.keys.map((k) => k.label);
    expect(labels.some((l) => l === "C mayor" || l === "A menor")).toBe(true);
  });

  test("Am G F E → A menor o C mayor con encaje alto", () => {
    const r = analyzeProgression("Am | G | F | E");
    const labels = r.keys.map((k) => k.label);
    // E mayor en A menor = dominante funcional → A menor debería puntuar alto
    expect(labels).toContain("A menor");
    const aMin = r.keys.find((k) => k.label === "A menor");
    expect(aMin.strength).not.toBe("débil");
  });
});
