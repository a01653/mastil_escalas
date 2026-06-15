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

// ════════════════════════════════════════════════════════════════════════════════
// BATERÍA DE REGRESIÓN v6.0.68
// ════════════════════════════════════════════════════════════════════════════════

// ── A) Regresión estricta ──────────────────────────────────────────────────────
// Estas aserciones fijan el comportamiento exacto. Si falla alguna, hay una
// regresión en el motor.

describe("A) Regresión estricta — diatónicos claros", () => {
  test("G | Em | C | D → G mayor y E menor al 100%", () => {
    const r = analyzeProgression("G | Em | C | D");
    const gMaj = r.keys.find((k) => k.label === "G mayor");
    const eMin = r.keys.find((k) => k.label === "E menor");
    expect(gMaj).toBeDefined();
    expect(eMin).toBeDefined();
    expect(gMaj.percentage).toBe(100);
    expect(eMin.percentage).toBe(100);
    // Todos diatónicos
    expect(gMaj.functionalChords).toHaveLength(0);
    expect(gMaj.outsideChords).toHaveLength(0);
  });

  test("Am | F | C | G → C mayor y A menor fuertes, sin orden forzado", () => {
    const r = analyzeProgression("Am | F | C | G");
    const labels = r.keys.map((k) => k.label);
    expect(labels).toContain("C mayor");
    expect(labels).toContain("A menor");
    expect(r.keys.find((k) => k.label === "C mayor").percentage).toBe(100);
    expect(r.keys.find((k) => k.label === "A menor").percentage).toBe(100);
  });
});

describe("A) Regresión estricta — slash chords", () => {
  test("D/F# | G | A | D → D mayor primero, D/F# y G y A y D diatónicos", () => {
    const r = analyzeProgression("D/F# | G | A | D");
    expect(r.keys[0].label).toBe("D mayor");
    expect(r.keys[0].percentage).toBe(100);
    const dMaj = r.keys.find((k) => k.label === "D mayor");
    expect(dMaj.diatonicChords).toContain("D/F#");
    expect(dMaj.diatonicChords).toContain("G");
    expect(dMaj.diatonicChords).toContain("A");
    expect(dMaj.diatonicChords).toContain("D");
    expect(dMaj.functionalChords).toHaveLength(0);
    // B menor también al 100% (relativa)
    expect(r.keys.find((k) => k.label === "B menor").percentage).toBe(100);
  });

  test("F#m | Bm | A/E | D/F# → D mayor primero, las cuatro tonalidades al 100%", () => {
    const r = analyzeProgression("F#m | Bm | A/E | D/F#");
    expect(r.keys[0].label).toBe("D mayor");
    const labels = r.keys.map((k) => k.label);
    expect(labels).toContain("D mayor");
    expect(labels).toContain("A mayor");
    expect(labels).toContain("F# menor");
    expect(labels).toContain("B menor");
    // Todos al 100%
    for (const lbl of ["D mayor", "A mayor", "F# menor", "B menor"]) {
      expect(r.keys.find((k) => k.label === lbl).percentage).toBe(100);
    }
    // Todos diatónicos en D mayor, sin funcionales ni fuera de tonalidad
    const dMaj = r.keys.find((k) => k.label === "D mayor");
    expect(dMaj.functionalChords).toHaveLength(0);
    expect(dMaj.outsideChords).toHaveLength(0);
  });
});

describe("A) Regresión estricta — dominante funcional en menor", () => {
  test("F# | Bm | A | D → B menor primero (92%), F# como dominante de Bm", () => {
    const r = analyzeProgression("F# | Bm | A | D");
    expect(r.keys[0].label).toBe("B menor");
    const bMin = r.keys.find((k) => k.label === "B menor");
    expect(bMin.percentage).toBe(92);
    expect(bMin.functionalChords.some((f) => f.explanation === "F# → dominante de Bm")).toBe(true);
    expect(bMin.diatonicChords).toContain("Bm");
    expect(bMin.diatonicChords).toContain("A");
    expect(bMin.diatonicChords).toContain("D");
  });

  test("E | Am | G | C → A menor primero (92%), E como dominante de Am", () => {
    const r = analyzeProgression("E | Am | G | C");
    expect(r.keys[0].label).toBe("A menor");
    const aMin = r.keys.find((k) => k.label === "A menor");
    expect(aMin.percentage).toBe(92);
    expect(aMin.functionalChords.some((f) => f.explanation === "E → dominante de Am")).toBe(true);
    expect(aMin.diatonicChords).toContain("Am");
    expect(aMin.diatonicChords).toContain("G");
    expect(aMin.diatonicChords).toContain("C");
  });

  test("Am | G | F | E → A menor primero (92%), E como dominante de Am", () => {
    const r = analyzeProgression("Am | G | F | E");
    expect(r.keys[0].label).toBe("A menor");
    const aMin = r.keys.find((k) => k.label === "A menor");
    expect(aMin.percentage).toBe(92);
    expect(aMin.functionalChords.some((f) => f.explanation === "E → dominante de Am")).toBe(true);
    expect(aMin.diatonicChords).toContain("Am");
    expect(aMin.diatonicChords).toContain("G");
    expect(aMin.diatonicChords).toContain("F");
  });

  test("B7 | Em | C | D → E menor primero, B7 como dominante de Em, G mayor alternativa", () => {
    const r = analyzeProgression("B7 | Em | C | D");
    expect(r.keys[0].label).toBe("E menor");
    const eMin = r.keys.find((k) => k.label === "E menor");
    expect(eMin.functionalChords.some((f) => f.explanation === "B7 → dominante de Em")).toBe(true);
    expect(eMin.diatonicChords).toContain("Em");
    expect(eMin.diatonicChords).toContain("C");
    expect(eMin.diatonicChords).toContain("D");
    // G mayor debe aparecer como alternativa
    expect(r.keys.some((k) => k.label === "G mayor")).toBe(true);
  });
});

describe("A) Regresión estricta — dominantes secundarios", () => {
  test("C | E7 | Am | F | G → A menor primero (93%), E7 como dominante de Am, C mayor alternativa", () => {
    const r = analyzeProgression("C | E7 | Am | F | G");
    expect(r.keys[0].label).toBe("A menor");
    const aMin = r.keys.find((k) => k.label === "A menor");
    expect(aMin.percentage).toBe(93);
    expect(aMin.functionalChords.some((f) => f.explanation === "E7 → dominante de Am")).toBe(true);
    // E7 no debe aparecer como diatónico estricto en A menor
    expect(aMin.diatonicChords).not.toContain("E7");
    // C mayor como alternativa
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    expect(cMaj.percentage).toBeGreaterThanOrEqual(80);
  });

  test("A7 | Dm | G | C → C mayor primero, A7 como dominante secundario de Dm", () => {
    const r = analyzeProgression("A7 | Dm | G | C");
    expect(r.keys[0].label).toBe("C mayor");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj.functionalChords.some((f) => f.explanation === "A7 → dominante secundario de Dm")).toBe(true);
    expect(cMaj.diatonicChords).toContain("Dm");
    expect(cMaj.diatonicChords).toContain("G");
    expect(cMaj.diatonicChords).toContain("C");
  });

  test("Dm7 | G7 | Cmaj7 | A7 | Dm7 | G7 → C mayor fuerte, A7 como dominante secundario de Dm", () => {
    const r = analyzeProgression("Dm7 | G7 | Cmaj7 | A7 | Dm7 | G7");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    expect(cMaj.percentage).toBeGreaterThanOrEqual(80);
    expect(cMaj.functionalChords.some((f) => f.explanation === "A7 → dominante secundario de Dm")).toBe(true);
    // Dm7, G7 y Cmaj7 son diatónicos (triada = min, maj, maj)
    expect(cMaj.diatonicChords).toContain("Dm7");
    expect(cMaj.diatonicChords).toContain("G7");
    expect(cMaj.diatonicChords).toContain("Cmaj7");
  });
});

// ── B) Comportamiento documentado / limitaciones ───────────────────────────────
// Estos tests NO fallan por orden exacto. Solo documentan el resultado actual
// y verifican que el motor no rompe. Si el algoritmo mejora en el futuro,
// actualizar las aserciones blandas.

describe("B) Comportamiento documentado — modal / bVII prestado", () => {
  test("C | Bb | F | C — no rompe; resultado probable: F mayor o D menor (mixolidio pendiente)", () => {
    const r = analyzeProgression("C | Bb | F | C");
    // El motor no tiene lógica de modos, interpreta lo más cercano en Mayor/Menor natural
    expect(r.isEmpty).toBe(false);
    expect(r.keys.length).toBeGreaterThan(0);
    // Comportamiento actual: F mayor o D menor como opciones principales (C, Bb, F son diatónicos en F mayor)
    const labels = r.keys.map((k) => k.label);
    expect(labels.some((l) => l === "F mayor" || l === "D menor" || l === "C mayor")).toBe(true);
    // Mejora futura: detectar C mixolidio (bVII prestado)
  });

  test("D | C | G | D — no rompe; resultado probable: G mayor o E menor (mixolidio pendiente)", () => {
    const r = analyzeProgression("D | C | G | D");
    expect(r.isEmpty).toBe(false);
    const labels = r.keys.map((k) => k.label);
    expect(labels.some((l) => l === "G mayor" || l === "E menor" || l === "D mayor")).toBe(true);
    // Mejora futura: detectar D mixolidio (bVII prestado)
  });

  test("C | Ab | Bb | C — no rompe; resultado ambiguo (intercambio modal)", () => {
    const r = analyzeProgression("C | Ab | Bb | C");
    expect(r.isEmpty).toBe(false);
    // El motor puede aproximar pero el resultado es discutible; solo verificar que no rompe
    expect(r.keys.length).toBeGreaterThan(0);
    // Mejora futura: detectar préstamo modal / modo paralelo
  });
});

describe("B) Comportamiento documentado — blues (limitación actual)", () => {
  test("A7 | D7 | A7 | E7 | D7 | A7 — blues I7-IV7-V7: no rompe, tónica A presente", () => {
    // Limitación: el motor no tiene lógica específica de blues.
    // Trata dom7 como tríada mayor para matching diatónico → A mayor aparece con encaje alto.
    // Mejora futura: detectar escala de blues y progresión I7-IV7-V7.
    // El test solo verifica que no rompe y que el tónico A aparece en alguna clave.
    // No fija si el resultado es "A mayor", "A blues" u otro — eso depende de la mejora futura.
    const r = analyzeProgression("A7 | D7 | A7 | E7 | D7 | A7");
    expect(r.isEmpty).toBe(false);
    expect(r.keys.length).toBeGreaterThan(0);
    // Al menos una clave con tónico A (Mayor, menor, blues…)
    expect(r.keys.some((k) => k.label.startsWith("A "))).toBe(true);
  });

  test("E7 | A7 | B7 | A7 — blues: no rompe, tónico E o A presente", () => {
    // Limitación similar al caso A7-D7. Mejora futura: detectar E blues.
    // El test solo verifica que no rompe y que un tónico razonable aparece.
    const r = analyzeProgression("E7 | A7 | B7 | A7");
    expect(r.isEmpty).toBe(false);
    expect(r.keys.length).toBeGreaterThan(0);
    const labels = r.keys.map((k) => k.label);
    expect(labels.some((l) => l.startsWith("E ") || l.startsWith("A ") || l.startsWith("C# "))).toBe(true);
  });
});
