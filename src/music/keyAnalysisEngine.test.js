import { describe, test, expect, beforeAll } from "vitest";
import { analyzeProgression, parseProgressionText, buildDiatonicTable, computeModalCenters } from "./keyAnalysisEngine.js";

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

  test("Eb en C mayor es intercambio modal (bIII prestado), no fuera de tonalidad", () => {
    const r = analyzeProgression("C Eb G Am"); // Eb = bIII prestado de C menor
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    if (cMaj) {
      expect(cMaj.outsideChords).not.toContain("Eb");
      const ic = cMaj.interchangeChords.find((c) => c.symbol === "Eb");
      expect(ic).toBeDefined();
      expect(ic.isInterchange).toBe(true);
      expect(ic.degreeLabel).toBe("bIII");
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

// ════════════════════════════════════════════════════════════════════════════════
// TABLA DE GRADOS — v6.0.69
// ════════════════════════════════════════════════════════════════════════════════

describe("Tabla de grados — modo tríada", () => {
  test("C F G Am → C mayor, tabla tríadas, grados I IV V vi usados", () => {
    const r = analyzeProgression("C | F | G | Am");
    expect(r.mode).toBe("triad");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    const table = cMaj.diatonicTable;
    expect(table).toHaveLength(7);
    // Nombres de las tríadas diatónicas de C mayor
    expect(table.map((d) => d.name)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    // Grados
    expect(table.map((d) => d.degree)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    // Marcados como usados: I (C), IV (F), V (G), vi (Am)
    expect(table.find((d) => d.degree === "I").used).toBe(true);
    expect(table.find((d) => d.degree === "ii").used).toBe(false);
    expect(table.find((d) => d.degree === "iii").used).toBe(false);
    expect(table.find((d) => d.degree === "IV").used).toBe(true);
    expect(table.find((d) => d.degree === "V").used).toBe(true);
    expect(table.find((d) => d.degree === "vi").used).toBe(true);
    expect(table.find((d) => d.degree === "vii°").used).toBe(false);
    // Mapa chord → grado
    expect(cMaj.chordDegrees).toMatchObject({ C: "I", F: "IV", G: "V", Am: "vi" });
  });

  test("D G A Bm → D mayor, tabla tríadas, grados I IV V vi usados", () => {
    const r = analyzeProgression("D | G | A | Bm");
    expect(r.mode).toBe("triad");
    const dMaj = r.keys.find((k) => k.label === "D mayor");
    expect(dMaj).toBeDefined();
    const table = dMaj.diatonicTable;
    expect(table.map((d) => d.name)).toEqual(["D", "Em", "F#m", "G", "A", "Bm", "C#dim"]);
    expect(table.find((d) => d.degree === "I").used).toBe(true);
    expect(table.find((d) => d.degree === "IV").used).toBe(true);
    expect(table.find((d) => d.degree === "V").used).toBe(true);
    expect(table.find((d) => d.degree === "vi").used).toBe(true);
    expect(dMaj.chordDegrees).toMatchObject({ D: "I", G: "IV", A: "V", Bm: "vi" });
  });

  test("F# Bm A D → B menor, tabla tríadas, grados i III VII usados; F# no diatónico", () => {
    const r = analyzeProgression("F# | Bm | A | D");
    expect(r.mode).toBe("triad");
    const bMin = r.keys.find((k) => k.label === "B menor");
    expect(bMin).toBeDefined();
    const table = bMin.diatonicTable;
    expect(table.map((d) => d.name)).toEqual(["Bm", "C#dim", "D", "Em", "F#m", "G", "A"]);
    expect(table.map((d) => d.degree)).toEqual(["i", "ii°", "III", "iv", "v", "VI", "VII"]);
    // Bm → i, D → III, A → VII
    expect(table.find((d) => d.degree === "i").used).toBe(true);
    expect(table.find((d) => d.degree === "III").used).toBe(true);
    expect(table.find((d) => d.degree === "VII").used).toBe(true);
    // F# major no está en B menor natural (es el v que debería ser F#m); F# major → dominante funcional
    expect(bMin.chordDegrees["F#"]).toBeUndefined();
    expect(bMin.functionalChords.some((f) => f.symbol === "F#")).toBe(true);
  });
});

describe("Tabla de grados — modo tétrada", () => {
  test("Cmaj7 Dm7 Em7 Fmaj7 → C mayor, tabla tétradas, 4 grados usados", () => {
    const r = analyzeProgression("Cmaj7 | Dm7 | Em7 | Fmaj7");
    expect(r.mode).toBe("tetrad");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    const table = cMaj.diatonicTable;
    expect(table.map((d) => d.degree)).toEqual(["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø7"]);
    expect(table.map((d) => d.name)).toEqual(["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]);
    expect(table.find((d) => d.degree === "Imaj7").used).toBe(true);
    expect(table.find((d) => d.degree === "ii7").used).toBe(true);
    expect(table.find((d) => d.degree === "iii7").used).toBe(true);
    expect(table.find((d) => d.degree === "IVmaj7").used).toBe(true);
    expect(table.find((d) => d.degree === "V7").used).toBe(false);   // G7 no está en la progresión
    expect(table.find((d) => d.degree === "viiø7").used).toBe(false); // Bm7b5 no está
    expect(cMaj.chordDegrees).toMatchObject({ Cmaj7: "Imaj7", Dm7: "ii7", Em7: "iii7", Fmaj7: "IVmaj7" });
  });

  test("Dm7 G7 Cmaj7 → C mayor, V7 y ii7 e Imaj7 usados", () => {
    const r = analyzeProgression("Dm7 | G7 | Cmaj7");
    expect(r.mode).toBe("tetrad");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    expect(cMaj.diatonicTable.find((d) => d.degree === "ii7").used).toBe(true);
    expect(cMaj.diatonicTable.find((d) => d.degree === "V7").used).toBe(true);
    expect(cMaj.diatonicTable.find((d) => d.degree === "Imaj7").used).toBe(true);
    expect(cMaj.chordDegrees).toMatchObject({ Dm7: "ii7", G7: "V7", Cmaj7: "Imaj7" });
  });

  test("Am7 Bm7b5 Cmaj7 Dm7 → A menor, tabla tétradas", () => {
    const r = analyzeProgression("Am7 | Bm7b5 | Cmaj7 | Dm7");
    expect(r.mode).toBe("tetrad");
    const aMin = r.keys.find((k) => k.label === "A menor");
    expect(aMin).toBeDefined();
    const table = aMin.diatonicTable;
    expect(table.map((d) => d.degree)).toEqual(["im7", "iiø7", "IIImaj7", "iv7", "v7", "VImaj7", "VII7"]);
    expect(table.map((d) => d.name)).toEqual(["Am7", "Bm7b5", "Cmaj7", "Dm7", "Em7", "Fmaj7", "G7"]);
    expect(table.find((d) => d.degree === "im7").used).toBe(true);
    expect(table.find((d) => d.degree === "iiø7").used).toBe(true);
    expect(table.find((d) => d.degree === "IIImaj7").used).toBe(true);
    expect(table.find((d) => d.degree === "iv7").used).toBe(true);
  });

  test("G (tríada) en progresión tétrada marca V7 como usado", () => {
    // Si hay otros acordes con 7ª, el modo es tetrad; una tríada sola debe marcar su grado
    const r = analyzeProgression("C | Dm7 | G | Am");
    expect(r.mode).toBe("tetrad");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj.diatonicTable.find((d) => d.degree === "V7").used).toBe(true);
    expect(cMaj.chordDegrees["G"]).toBe("V7");
  });
});

describe("hasSeventh — detección de 7ª en acordes", () => {
  test("G7 → hasSeventh true; G → false", () => {
    const r7 = parseProgressionText("G7");
    expect(r7[0].hasSeventh).toBe(true);
    const r = parseProgressionText("G");
    expect(r[0].hasSeventh).toBe(false);
  });

  test("Cmaj7, Am7, Bm7b5, Fmaj7 → hasSeventh true", () => {
    for (const sym of ["Cmaj7", "Am7", "Bm7b5", "Fmaj7"]) {
      expect(parseProgressionText(sym)[0].hasSeventh).toBe(true);
    }
  });

  test("C, Am, Bdim, F#m → hasSeventh false", () => {
    for (const sym of ["C", "Am", "Bdim", "F#m"]) {
      expect(parseProgressionText(sym)[0].hasSeventh).toBe(false);
    }
  });

  test("Dm (tríada) → mode triad; Dm7 → mode tetrad", () => {
    expect(analyzeProgression("C F Dm G").mode).toBe("triad");
    expect(analyzeProgression("C F Dm7 G").mode).toBe("tetrad");
  });
});

describe("buildDiatonicTable — función exportada", () => {
  test("C mayor tríadas", () => {
    const table = buildDiatonicTable(0, "Mayor", true, [], "triad");
    expect(table.map((d) => d.name)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(table.map((d) => d.degree)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(table.every((d) => !d.used)).toBe(true);
  });

  test("C mayor tétradas", () => {
    const table = buildDiatonicTable(0, "Mayor", true, [], "tetrad");
    expect(table.map((d) => d.name)).toEqual(["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]);
    expect(table.map((d) => d.degree)).toEqual(["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø7"]);
  });

  test("A menor tríadas", () => {
    const table = buildDiatonicTable(9, "Menor natural", false, [], "triad");
    expect(table.map((d) => d.name)).toEqual(["Am", "Bdim", "C", "Dm", "Em", "F", "G"]);
    expect(table.map((d) => d.degree)).toEqual(["i", "ii°", "III", "iv", "v", "VI", "VII"]);
  });

  test("A menor tétradas", () => {
    const table = buildDiatonicTable(9, "Menor natural", false, [], "tetrad");
    expect(table.map((d) => d.name)).toEqual(["Am7", "Bm7b5", "Cmaj7", "Dm7", "Em7", "Fmaj7", "G7"]);
    expect(table.map((d) => d.degree)).toEqual(["im7", "iiø7", "IIImaj7", "iv7", "v7", "VImaj7", "VII7"]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// CENTROS MODALES — computeModalCenters y analyzeProgression.modalCenters
// ════════════════════════════════════════════════════════════════════════════════

describe("computeModalCenters — E F# C#m", () => {
  const chords = parseProgressionText("E F# C#m");

  test("devuelve array no vacío", () => {
    const centers = computeModalCenters(chords);
    expect(Array.isArray(centers)).toBe(true);
    expect(centers.length).toBeGreaterThan(0);
  });

  test("E lidio aparece como primer centro modal (score más alto)", () => {
    const centers = computeModalCenters(chords);
    expect(centers[0].label).toBe("E lidio");
  });

  test("E lidio tiene suggestedExpand = true", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    expect(eLidio).toBeDefined();
    expect(eLidio.suggestedExpand).toBe(true);
  });

  test("E lidio summary correcto: E = I, F# = II, C#m = vi", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    expect(eLidio.summary).toBe("E = I, F# = II, C#m = vi");
  });

  test("E lidio chordDegrees correcto", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    expect(eLidio.chordDegrees).toMatchObject({ E: "I", "F#": "II", "C#m": "vi" });
  });

  test("E lidio parentLabel es B mayor", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    expect(eLidio.parentLabel).toBe("B mayor");
  });

  test("E lidio modeNotes son E F# G# A# B C# D#", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    expect(eLidio.modeNotes).toEqual(["E", "F#", "G#", "A#", "B", "C#", "D#"]);
  });

  test("C# dórico aparece y tiene resumen correcto", () => {
    const centers = computeModalCenters(chords);
    const csharpDor = centers.find((c) => c.label === "C# dórico");
    expect(csharpDor).toBeDefined();
    expect(csharpDor.summary).toBe("E = III, F# = IV, C#m = i");
  });

  test("F# mixolidio aparece y tiene resumen correcto", () => {
    const centers = computeModalCenters(chords);
    const fsharpMix = centers.find((c) => c.label === "F# mixolidio");
    expect(fsharpMix).toBeDefined();
    expect(fsharpMix.summary).toBe("E = bVII, F# = I, C#m = v");
  });

  test("B jónico / mayor aparece (modo principal)", () => {
    const centers = computeModalCenters(chords);
    const bJon = centers.find((c) => c.label === "B jónico / mayor");
    expect(bJon).toBeDefined();
    expect(bJon.summary).toBe("E = IV, F# = V, C#m = ii");
  });

  test("G# eólico / menor natural aparece (modo principal)", () => {
    const centers = computeModalCenters(chords);
    const gsMin = centers.find((c) => c.label === "G# eólico / menor natural");
    expect(gsMin).toBeDefined();
    expect(gsMin.summary).toBe("E = VI, F# = VII, C#m = iv");
  });

  test("D# frigio NO aparece (tónica D# ausente en la progresión)", () => {
    const centers = computeModalCenters(chords);
    const dFrig = centers.find((c) => c.modeName === "frigio" && c.tonicPc === 3);
    expect(dFrig).toBeUndefined();
  });

  test("ningún locrio aparece en los centros", () => {
    const centers = computeModalCenters(chords);
    expect(centers.every((c) => c.modeName !== "locrio")).toBe(true);
  });

  test("E lidio diatonicTable tiene 7 grados con E, F# y C#m marcados como usados", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    expect(eLidio.diatonicTable).toHaveLength(7);
    expect(eLidio.diatonicTable.find((d) => d.degree === "I").used).toBe(true);   // E
    expect(eLidio.diatonicTable.find((d) => d.degree === "II").used).toBe(true);  // F#
    expect(eLidio.diatonicTable.find((d) => d.degree === "vi").used).toBe(true);  // C#m
    expect(eLidio.diatonicTable.find((d) => d.degree === "#iv°").used).toBe(false);
    expect(eLidio.diatonicTable.find((d) => d.degree === "V").used).toBe(false);
  });

  test("E lidio suggestedScales incluye E lidio, B mayor, E pentatónica mayor y C# pentatónica menor", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    const scaleNames = eLidio.suggestedScales.map((s) => s.name);
    expect(scaleNames).toContain("E lidio");
    expect(scaleNames).toContain("B mayor");
    expect(scaleNames).toContain("E pentatónica mayor");
    expect(scaleNames).toContain("C# pentatónica menor");
  });

  test("E pentatónica mayor tiene notas E F# G# B C#", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    const pentaMaj = eLidio.suggestedScales.find((s) => s.name === "E pentatónica mayor");
    expect(pentaMaj).toBeDefined();
    expect(pentaMaj.notes).toEqual(["E", "F#", "G#", "B", "C#"]);
  });

  test("C# pentatónica menor tiene notas C# E F# G# B", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    const pentaMin = eLidio.suggestedScales.find((s) => s.name === "C# pentatónica menor");
    expect(pentaMin).toBeDefined();
    expect(pentaMin.notes).toEqual(["C#", "E", "F#", "G#", "B"]);
  });

  test("E pentatónica mayor y C# pentatónica menor tienen relativeNote de equivalencia", () => {
    const centers = computeModalCenters(chords);
    const eLidio = centers.find((c) => c.label === "E lidio");
    const pentaMaj = eLidio.suggestedScales.find((s) => s.name === "E pentatónica mayor");
    const pentaMin = eLidio.suggestedScales.find((s) => s.name === "C# pentatónica menor");
    expect(pentaMaj.relativeNote).toMatch(/mismas notas/i);
    expect(pentaMin.relativeNote).toMatch(/mismas notas/i);
  });

  test("orden esperado: E lidio, C# dórico, F# mixolidio antes de B jónico y G# eólico", () => {
    const centers = computeModalCenters(chords);
    const eLidioIdx = centers.findIndex((c) => c.label === "E lidio");
    const csharpDorIdx = centers.findIndex((c) => c.label === "C# dórico");
    const fsharpMixIdx = centers.findIndex((c) => c.label === "F# mixolidio");
    const bJonIdx = centers.findIndex((c) => c.label === "B jónico / mayor");
    const gsMinIdx = centers.findIndex((c) => c.label === "G# eólico / menor natural");
    expect(eLidioIdx).toBeLessThan(csharpDorIdx);
    expect(eLidioIdx).toBeLessThan(fsharpMixIdx);
    expect(eLidioIdx).toBeLessThan(bJonIdx);
    expect(eLidioIdx).toBeLessThan(gsMinIdx);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PENTATÓNICAS SUGERIDAS — v6.0.82
// ════════════════════════════════════════════════════════════════════════════════

describe("suggestedScales para C# dórico (modo menor)", () => {
  const chords = parseProgressionText("E F# C#m");

  test("C# dórico primer elemento pentatónico es C# pentatónica menor", () => {
    const centers = computeModalCenters(chords);
    const csharpDor = centers.find((c) => c.label === "C# dórico");
    expect(csharpDor).toBeDefined();
    const pentas = csharpDor.suggestedScales.filter((s) => s.name.includes("pentatónica"));
    expect(pentas[0].name).toBe("C# pentatónica menor");
  });

  test("C# dórico incluye C# pentatónica menor con notas C# E F# G# B", () => {
    const centers = computeModalCenters(chords);
    const csharpDor = centers.find((c) => c.label === "C# dórico");
    const pentaMin = csharpDor.suggestedScales.find((s) => s.name === "C# pentatónica menor");
    expect(pentaMin).toBeDefined();
    expect(pentaMin.notes).toEqual(["C#", "E", "F#", "G#", "B"]);
  });

  test("C# dórico incluye E pentatónica mayor (relativa de C# penta menor)", () => {
    const centers = computeModalCenters(chords);
    const csharpDor = centers.find((c) => c.label === "C# dórico");
    const scaleNames = csharpDor.suggestedScales.map((s) => s.name);
    expect(scaleNames).toContain("E pentatónica mayor");
  });

  test("C# dórico NO prioriza C# pentatónica mayor sobre C# pentatónica menor", () => {
    const centers = computeModalCenters(chords);
    const csharpDor = centers.find((c) => c.label === "C# dórico");
    const scaleNames = csharpDor.suggestedScales.map((s) => s.name);
    const pentaMinIdx = scaleNames.indexOf("C# pentatónica menor");
    const pentaMajIdx = scaleNames.indexOf("C# pentatónica mayor");
    // C# penta menor debe aparecer
    expect(pentaMinIdx).toBeGreaterThanOrEqual(0);
    // C# penta mayor no debe aparecer, o si aparece debe ser después de la menor
    if (pentaMajIdx >= 0) {
      expect(pentaMinIdx).toBeLessThan(pentaMajIdx);
    }
  });

  test("C# dórico pentatónicas tienen relativeNote de equivalencia", () => {
    const centers = computeModalCenters(chords);
    const csharpDor = centers.find((c) => c.label === "C# dórico");
    const pentaMin = csharpDor.suggestedScales.find((s) => s.name === "C# pentatónica menor");
    const pentaMaj = csharpDor.suggestedScales.find((s) => s.name === "E pentatónica mayor");
    expect(pentaMin?.relativeNote).toMatch(/mismas notas/i);
    expect(pentaMaj?.relativeNote).toMatch(/mismas notas/i);
  });
});

describe("suggestedScales — B mayor con E F# C#m incluye C# pentatónica menor", () => {
  test("B mayor suggestedScales incluye C# pentatónica menor (C#m diatónico en la progresión)", () => {
    const r = analyzeProgression("E F# C#m");
    const bMaj = r.keys.find((k) => k.label === "B mayor");
    expect(bMaj).toBeDefined();
    const scaleNames = bMaj.suggestedScales.map((s) => s.name);
    expect(scaleNames).toContain("C# pentatónica menor");
  });

  test("B mayor suggestedScales C# pentatónica menor tiene notas C# E F# G# B", () => {
    const r = analyzeProgression("E F# C#m");
    const bMaj = r.keys.find((k) => k.label === "B mayor");
    const pentaMin = bMaj.suggestedScales.find((s) => s.name === "C# pentatónica menor");
    expect(pentaMin).toBeDefined();
    expect(pentaMin.notes).toEqual(["C#", "E", "F#", "G#", "B"]);
  });

  test("B mayor suggestedScales sigue incluyendo B mayor, B penta mayor, G# menor, G# penta menor", () => {
    const r = analyzeProgression("E F# C#m");
    const bMaj = r.keys.find((k) => k.label === "B mayor");
    const scaleNames = bMaj.suggestedScales.map((s) => s.name);
    expect(scaleNames).toContain("B mayor");
    expect(scaleNames).toContain("B pentatónica mayor");
    expect(scaleNames).toContain("G# menor natural");
    expect(scaleNames).toContain("G# pentatónica menor");
  });

  test("C mayor + Am F G no añade pentatónicas extra a C mayor (Am es la relativa estándar)", () => {
    const r = analyzeProgression("C Am F G");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    const extraPentas = cMaj.suggestedScales.filter(
      (s) => s.id && s.id.startsWith("key-penta-min-ctx-")
    );
    // Am (vi) ya está como relativa estándar → no debe añadir extra
    expect(extraPentas).toHaveLength(0);
  });
});

describe("analyzeProgression — campo modalCenters", () => {
  test("E F# C#m → modalCenters devuelve B mayor y G# menor como tonalidades principales y centros modales", () => {
    const r = analyzeProgression("E F# C#m");
    expect(r.modalCenters).toBeDefined();
    expect(Array.isArray(r.modalCenters)).toBe(true);
    expect(r.modalCenters.length).toBeGreaterThan(0);
    // Tonalidades principales intactas
    const labels = r.keys.map((k) => k.label);
    expect(labels).toContain("B mayor");
    expect(labels).toContain("G# menor");
  });

  test("vacío → modalCenters es array vacío", () => {
    const r = analyzeProgression("");
    expect(r.modalCenters).toBeUndefined(); // isEmpty path devuelve antes
  });

  test("C F G Am → modalCenters incluye C jónico / mayor y A eólico / menor natural", () => {
    const r = analyzeProgression("C F G Am");
    expect(r.modalCenters.length).toBeGreaterThan(0);
    const labels = r.modalCenters.map((c) => c.label);
    expect(labels).toContain("C jónico / mayor");
    expect(labels).toContain("A eólico / menor natural");
    expect(labels).toContain("F lidio");
    expect(labels).toContain("G mixolidio");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// INTERCAMBIO MODAL — v6.0.83
// ════════════════════════════════════════════════════════════════════════════════

describe("INTERCAMBIO MODAL — Fmaj7 Am7 Bbmaj7 Gm7 Dbmaj7", () => {
  let result;
  beforeAll(() => { result = analyzeProgression("Fmaj7 Am7 Bbmaj7 Gm7 Dbmaj7"); });

  test("F mayor es la tonalidad principal detectada", () => {
    expect(result.keys[0].label).toBe("F mayor");
  });

  test("Dbmaj7 no aparece en outsideChords", () => {
    const fMaj = result.keys.find((k) => k.label === "F mayor");
    expect(fMaj.outsideChords).not.toContain("Dbmaj7");
  });

  test("Dbmaj7 → bVImaj7 en interchangeChords", () => {
    const fMaj = result.keys.find((k) => k.label === "F mayor");
    const ic = fMaj.interchangeChords.find((c) => c.symbol === "Dbmaj7");
    expect(ic).toBeDefined();
    expect(ic.degreeLabel).toBe("bVImaj7");
    expect(ic.isInterchange).toBe(true);
  });

  test("Dbmaj7 indica intercambio desde F eólico / menor natural", () => {
    const fMaj = result.keys.find((k) => k.label === "F mayor");
    const ic = fMaj.interchangeChords.find((c) => c.symbol === "Dbmaj7");
    expect(ic.sources).toContain("eólico / menor natural");
  });

  test("acordes diatónicos preservados en chordDegrees", () => {
    const fMaj = result.keys.find((k) => k.label === "F mayor");
    expect(fMaj.chordDegrees["Fmaj7"]).toBe("Imaj7");
    expect(fMaj.chordDegrees["Am7"]).toBe("iii7");
    expect(fMaj.chordDegrees["Bbmaj7"]).toBe("IVmaj7");
    expect(fMaj.chordDegrees["Gm7"]).toBe("ii7");
  });
});

describe("INTERCAMBIO MODAL — casos genéricos", () => {
  test("C mayor: Abmaj7 → bVImaj7, prestado de C eólico / menor natural", () => {
    const r = analyzeProgression("C Abmaj7 F G");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    const ic = cMaj.interchangeChords.find((c) => c.symbol === "Abmaj7");
    expect(ic).toBeDefined();
    expect(ic.degreeLabel).toBe("bVImaj7");
    expect(ic.sources).toContain("eólico / menor natural");
    expect(ic.isInterchange).toBe(true);
  });

  test("C mayor: Fm → iv, prestado de C eólico / menor natural", () => {
    const r = analyzeProgression("C Fm G Am");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    const ic = cMaj.interchangeChords.find((c) => c.symbol === "Fm");
    expect(ic).toBeDefined();
    expect(ic.degreeLabel).toBe("iv");
    expect(ic.sources).toContain("eólico / menor natural");
    expect(ic.isInterchange).toBe(true);
  });

  test("G mayor: Cm → iv, prestado de G eólico / menor natural", () => {
    const r = analyzeProgression("G Cm D Em");
    const gMaj = r.keys.find((k) => k.label === "G mayor");
    expect(gMaj).toBeDefined();
    const ic = gMaj.interchangeChords.find((c) => c.symbol === "Cm");
    expect(ic).toBeDefined();
    expect(ic.degreeLabel).toBe("iv");
    expect(ic.sources).toContain("eólico / menor natural");
    expect(ic.isInterchange).toBe(true);
  });

  test("C mayor: Bb triad → bVII, prestado de C mixolidio o C eólico", () => {
    const r = analyzeProgression("C Bb F G");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    const ic = cMaj.interchangeChords.find((c) => c.symbol === "Bb");
    expect(ic).toBeDefined();
    expect(ic.degreeLabel).toBe("bVII");
    expect(ic.isInterchange).toBe(true);
    expect(ic.sources.some((s) => s.includes("mixolidio") || s.includes("eólico"))).toBe(true);
  });

  test("acorde realmente fuera de tonalidad queda en outsideChords", () => {
    // F# mayor en C mayor no pertenece a ningún modo paralelo de C
    // F# es #IV en C, no aparece con calidad maj en ningún modo paralelo
    const r = analyzeProgression("C F# G Am");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    // F# major en C: interval = 6 (#IV), no tiene calidad maj en modos paralelos de C
    // (en lidio sería #iv° que es diminuido, no mayor)
    const ic = cMaj.interchangeChords.find((c) => c.symbol === "F#");
    if (ic) {
      // Si por algún modo encaja, igualmente el acorde debe clasificarse consistentemente
      expect(ic.isInterchange).toBe(true);
    } else {
      expect(cMaj.outsideChords).toContain("F#");
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// INTERCAMBIO MODAL — prioridad del modo de origen (v6.0.84)
// ════════════════════════════════════════════════════════════════════════════════

describe("INTERCAMBIO MODAL — prioridad del modo de origen", () => {
  test("F mayor: Dbmaj7 muestra F eólico / menor natural como origen principal", () => {
    const r = analyzeProgression("Fmaj7 Am7 Bbmaj7 Gm7 Dbmaj7");
    const fMaj = r.keys.find((k) => k.label === "F mayor");
    const ic = fMaj.interchangeChords.find((c) => c.symbol === "Dbmaj7");
    expect(ic.sourceDescription).toContain("eólico / menor natural");
    expect(ic.explanation).toContain("eólico / menor natural");
    expect(ic.explanation).not.toContain("frigio");
  });

  test("C mayor: Fm muestra C eólico / menor natural como origen principal", () => {
    const r = analyzeProgression("C Fm G Am");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    const ic = cMaj.interchangeChords.find((c) => c.symbol === "Fm");
    expect(ic.sourceDescription).toContain("eólico / menor natural");
    expect(ic.explanation).toContain("eólico / menor natural");
    expect(ic.explanation).not.toContain("frigio");
  });

  test("G mayor: Cm muestra G eólico / menor natural como origen principal", () => {
    const r = analyzeProgression("G Cm D Em");
    const gMaj = r.keys.find((k) => k.label === "G mayor");
    const ic = gMaj.interchangeChords.find((c) => c.symbol === "Cm");
    expect(ic.sourceDescription).toContain("eólico / menor natural");
    expect(ic.explanation).toContain("eólico / menor natural");
    expect(ic.explanation).not.toContain("frigio");
  });

  test("C mayor: Bb prioriza C mixolidio en explanation", () => {
    const r = analyzeProgression("C Bb F G");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    const ic = cMaj.interchangeChords.find((c) => c.symbol === "Bb");
    expect(ic.sourceDescription).toContain("mixolidio");
    expect(ic.explanation).toContain("mixolidio");
  });

  test("C mayor: Db prioriza C frigio (único modo con bII mayor)", () => {
    const r = analyzeProgression("C Db F G");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    const ic = cMaj.interchangeChords.find((c) => c.symbol === "Db");
    expect(ic.sourceDescription).toContain("frigio");
    expect(ic.explanation).toContain("frigio");
  });

  test("sources sigue conteniendo todos los modos coincidentes aunque solo uno sea principal", () => {
    // Dbmaj7 en F encaja en frigio Y eólico; sources debe tener ambos
    const r = analyzeProgression("Fmaj7 Dbmaj7 Bbmaj7");
    const fMaj = r.keys.find((k) => k.label === "F mayor");
    const ic = fMaj.interchangeChords.find((c) => c.symbol === "Dbmaj7");
    expect(ic.sources).toContain("eólico / menor natural");
    expect(ic.sources).toContain("frigio");
    expect(ic.sources.length).toBeGreaterThanOrEqual(2);
  });
});

describe("REFUERZO I-IV-V — primer acorde como tónica con intercambio modal (v6.0.85)", () => {
  test("C F G Bb: C mayor aparece en keys y su score está dentro del rango de F mayor", () => {
    const r = analyzeProgression("C F G Bb");
    const fMaj = r.keys.find((k) => k.label === "F mayor");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(fMaj).toBeDefined();
    expect(cMaj).toBeDefined();
    // El bonus I-IV-V debe dejar C mayor a no más de 1 punto de F mayor
    expect(cMaj.score).toBeGreaterThanOrEqual(fMaj.score - 1);
  });

  test("C F G Bb: F mayor también aparece en keys (no se elimina)", () => {
    const r = analyzeProgression("C F G Bb");
    expect(r.keys.find((k) => k.label === "F mayor")).toBeDefined();
  });

  test("C F G Bb: Bb en C mayor es bVII prestado de C mixolidio", () => {
    const r = analyzeProgression("C F G Bb");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj).toBeDefined();
    const ic = cMaj.interchangeChords.find((c) => c.symbol === "Bb");
    expect(ic).toBeDefined();
    expect(ic.degreeLabel).toBe("bVII");
    expect(ic.sourceDescription).toContain("mixolidio");
  });

  test("C F G Am: sin acordes fuera de escala, el bonus no se aplica (ambas tonalidades al 100%)", () => {
    const r = analyzeProgression("C F G Am");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    const aMin = r.keys.find((k) => k.label === "A menor");
    expect(cMaj).toBeDefined();
    expect(aMin).toBeDefined();
    // No hay outsideChordSymbols → no bonus → percentage sin inflación
    expect(cMaj.percentage).toBe(100);
    expect(aMin.percentage).toBe(100);
  });

  test("G D Em C Eb: G mayor reforzado como tónica de I-IV-V con Eb como intercambio", () => {
    const r = analyzeProgression("G D Em C Eb");
    const gMaj = r.keys.find((k) => k.label === "G mayor");
    expect(gMaj).toBeDefined();
    // G(I), C(IV) y D(V) son diatónicos; Eb es intercambio → bonus I-IV-V activo
    expect(gMaj.interchangeChords.some((ic) => ic.symbol === "Eb")).toBe(true);
    // G mayor debe ser la tonalidad principal o quedar en keys
    expect(r.keys[0].label).toBe("G mayor");
  });

  test("Am F C G: primer acorde menor, bonus no aplica; C mayor y A menor permanecen", () => {
    const r = analyzeProgression("Am F C G");
    const labels = r.keys.map((k) => k.label);
    expect(labels).toContain("C mayor");
    expect(labels).toContain("A menor");
    // Primer acorde Am es menor → sin bonus I-IV-V en ninguna clave mayor
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj.percentage).toBe(100);
  });

  test("C F G Bb: hasFunctionalBonus=true en C mayor", () => {
    const r = analyzeProgression("C F G Bb");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj.hasFunctionalBonus).toBe(true);
  });

  test("C F G Bb: hasFunctionalBonus=false en F mayor (C es V, no I)", () => {
    const r = analyzeProgression("C F G Bb");
    const fMaj = r.keys.find((k) => k.label === "F mayor");
    expect(fMaj.hasFunctionalBonus).toBe(false);
  });

  test("C F G Am: hasFunctionalBonus=false cuando todos los acordes son diatónicos", () => {
    const r = analyzeProgression("C F G Am");
    const cMaj = r.keys.find((k) => k.label === "C mayor");
    expect(cMaj.hasFunctionalBonus).toBe(false);
  });

  test("G D Em C Eb: hasFunctionalBonus=true en G mayor (I-IV-V con Eb fuera)", () => {
    const r = analyzeProgression("G D Em C Eb");
    const gMaj = r.keys.find((k) => k.label === "G mayor");
    expect(gMaj.hasFunctionalBonus).toBe(true);
  });
});
