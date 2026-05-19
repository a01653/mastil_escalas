/**
 * Batería de regresión para el comportamiento de "por referencia" en selección manual.
 *
 * Invariantes que garantizan estos tests:
 *   A. Un candidato solo recibe marca "por referencia" si su raíz coincide con la referencia.
 *   B. Un candidato contextual (dom7 sintético) solo se crea si raíz Y b7 están presentes.
 *   C. referencePromoted=true solo aparece si el ranking cambió (el winner sin ref era otro).
 *   D. Si el winner con referencia ya era el winner sin referencia, NO se marca referencePromoted.
 *   E. "Notas seleccionadas" usa nombres absolutos (pcToName) nunca nombres funcionales del acorde.
 *
 * Tipos de candidato "por referencia":
 *   - contextual=true       → candidato sintético creado por la referencia (no existía en motor)
 *   - referencePromoted=true → candidato existente promovido al primer puesto por la referencia
 *   En ambos casos: promotedByReference=true en la respuesta de analyzeFretsCore.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { analyzeFretsCore } from "./analyzeFretsCore.js";
import {
  mod12,
  pcToName,
  preferSharpsFromMajorTonicPc,
  buildSyntheticSelectedNotes,
  detectChordReadings,
} from "./chordDetectionEngine.js";
import { rankReadingsWithHarmonyContext } from "./harmonyContextRanking.js";

// Helpers
function withRef(pattern, rootPc, quality) {
  return analyzeFretsCore(pattern, {
    harmonyContext: { enabled: true, rootPc, quality },
  });
}

function withoutRef(pattern) {
  return analyzeFretsCore(pattern);
}

// ─── Caso 1: x6x665 + Eb7 → candidato contextual ────────────────────────────
// Notas: Eb(3), Db(1), F(5), A(9)
// Raíz Eb(3) y b7 Db(1) presentes → dominante con tensiones 9(F) y #11(A)

describe("Caso 1 — x6x665 + Eb7: candidato contextual creado", () => {
  let result;
  beforeAll(() => { result = withRef("x6x665", 3, "7"); });

  it("primary.name = Eb7(9,#11,no3,no5)", () => {
    expect(result.primary?.name).toBe("Eb7(9,#11,no3,no5)");
  });

  it("primary.contextual = true", () => {
    expect(result.primary?.contextual).toBe(true);
  });

  it("primary.referencePromoted es falsy (es contextual, no promovido)", () => {
    expect(result.primary?.referencePromoted).toBeFalsy();
  });

  it("promotedByReference = true (contextual activa la bandera)", () => {
    expect(result.promotedByReference).toBe(true);
  });

  it("noteNames contiene Eb, Db, F, A", () => {
    expect(result.noteNames).toContain("Eb");
    expect(result.noteNames).toContain("Db");
    expect(result.noteNames).toContain("F");
    expect(result.noteNames).toContain("A");
  });

  it("noteNames NO contiene Bbb (nombre funcional, no absoluto)", () => {
    expect(result.noteNames).not.toContain("Bbb");
  });

  it("bass = Eb (cuerda 5, traste 6)", () => {
    expect(result.bassName).toBe("Eb");
  });
});

// ─── Caso 2: x6x665 sin referencia → no hay candidato por referencia ─────────

describe("Caso 2 — x6x665 sin referencia: no hay candidato por referencia", () => {
  let result;
  beforeAll(() => { result = withoutRef("x6x665"); });

  it("primary.name ≠ Eb7(9,#11,no3,no5)", () => {
    expect(result.primary?.name).not.toBe("Eb7(9,#11,no3,no5)");
  });

  it("primary.contextual es falsy", () => {
    expect(result.primary?.contextual).toBeFalsy();
  });

  it("promotedByReference = false", () => {
    expect(result.promotedByReference).toBe(false);
  });

  it("ningún reading tiene contextual=true", () => {
    expect(result.readings.some((r) => r.contextual)).toBe(false);
  });
});

// ─── Caso 3: x5555x sin referencia → Cadd9/D, sin badge ─────────────────────

describe("Caso 3 — x5555x sin referencia: winner natural, sin badge", () => {
  let result;
  beforeAll(() => { result = withoutRef("x5555x"); });

  it("primary.name = Cadd9/D", () => {
    expect(result.primary?.name).toBe("Cadd9/D");
  });

  it("primary.contextual es falsy", () => {
    expect(result.primary?.contextual).toBeFalsy();
  });

  it("promotedByReference = false", () => {
    expect(result.promotedByReference).toBe(false);
  });
});

// ─── Caso 4: x5555x + D7 → D9sus4(no5) referencePromoted ────────────────────
// D9sus4(no5) es lectura existente del motor con rootPc=2; la referencia D7
// la sube al primer puesto (era segunda), generando referencePromoted=true.

describe("Caso 4 — x5555x + D7: candidato existente promovido por referencia", () => {
  let result;
  beforeAll(() => { result = withRef("x5555x", 2, "7"); });

  it("primary.name = D9sus4(no5)", () => {
    expect(result.primary?.name).toBe("D9sus4(no5)");
  });

  it("primary.referencePromoted = true", () => {
    expect(result.primary?.referencePromoted).toBe(true);
  });

  it("primary.contextual es falsy (es promovido, no sintético)", () => {
    expect(result.primary?.contextual).toBeFalsy();
  });

  it("promotedByReference = true", () => {
    expect(result.promotedByReference).toBe(true);
  });
});

// ─── Caso 5: x5555x + F7 → sin promoción (raíz F no encaja) ─────────────────
// Notas: D, G, C, E. Ninguna es F → contextMatchScore = 0 para todos.

describe("Caso 5 — x5555x + F7: raíz F no está en las notas, no hay promoción", () => {
  let result;
  beforeAll(() => { result = withRef("x5555x", 5, "7"); });

  it("primary.name = Cadd9/D (sin cambio de ranking)", () => {
    expect(result.primary?.name).toBe("Cadd9/D");
  });

  it("promotedByReference = false", () => {
    expect(result.promotedByReference).toBe(false);
  });

  it("D9sus4(no5) en rankedReadings NO tiene referencePromoted", () => {
    const d9 = result.rankedReadings.find((r) => r.name === "D9sus4(no5)");
    expect(d9?.referencePromoted).toBeFalsy();
  });

  it("D9sus4(no5) en rankedReadings NO tiene contextual", () => {
    const d9 = result.rankedReadings.find((r) => r.name === "D9sus4(no5)");
    expect(d9?.contextual).toBeFalsy();
  });
});

// ─── Caso 6: x5555x + G7 / A7 / B7 → D9sus4 no marcado ─────────────────────
// Invariante A: sin coincidencia de raíz no hay ningún tipo de promoción.

describe("Caso 6 — x5555x + G7/A7/B7: raíz no coincide, D9sus4 no marcado", () => {
  it("x5555x + G7 → promotedByReference = false", () => {
    expect(withRef("x5555x", 7, "7").promotedByReference).toBe(false);
  });

  it("x5555x + G7 → D9sus4(no5) sin referencePromoted", () => {
    const r = withRef("x5555x", 7, "7");
    expect(r.rankedReadings.find((c) => c.name === "D9sus4(no5)")?.referencePromoted).toBeFalsy();
  });

  it("x5555x + A7 → promotedByReference = false", () => {
    expect(withRef("x5555x", 9, "7").promotedByReference).toBe(false);
  });

  it("x5555x + A7 → D9sus4(no5) sin referencePromoted", () => {
    const r = withRef("x5555x", 9, "7");
    expect(r.rankedReadings.find((c) => c.name === "D9sus4(no5)")?.referencePromoted).toBeFalsy();
  });

  it("x5555x + B7 → promotedByReference = false", () => {
    expect(withRef("x5555x", 11, "7").promotedByReference).toBe(false);
  });

  it("x5555x + B7 → D9sus4(no5) sin referencePromoted", () => {
    const r = withRef("x5555x", 11, "7");
    expect(r.rankedReadings.find((c) => c.name === "D9sus4(no5)")?.referencePromoted).toBeFalsy();
  });
});

// ─── Caso 7: x5555x + E7 → candidato contextual E7(#9,b13,no3,no5) ──────────
// Notas: D(2), G(7), C(0), E(4). Raíz E(4) y b7 D(2) presentes.
// Tensiones: G = #9 de E, C = b13 de E. Falta 3ª y 5ª → no3,no5.

describe("Caso 7 — x5555x + E7: candidato contextual con tensiones #9 y b13", () => {
  let result;
  beforeAll(() => { result = withRef("x5555x", 4, "7"); });

  it("primary.name = E7(#9,b13,no3,no5)", () => {
    expect(result.primary?.name).toBe("E7(#9,b13,no3,no5)");
  });

  it("primary.contextual = true", () => {
    expect(result.primary?.contextual).toBe(true);
  });

  it("promotedByReference = true", () => {
    expect(result.promotedByReference).toBe(true);
  });

  it("raíz E (pc 4) presente en las notas (condición necesaria para contextual)", () => {
    // pcSet o noteNames deben contener E
    expect(result.noteNames).toContain("E");
  });

  it("b7 D (pc 2) presente en las notas (condición necesaria para dom7 contextual)", () => {
    expect(result.noteNames).toContain("D");
  });

  it("nombre incluye no3 (3ª ausente en el voicing)", () => {
    expect(result.primary?.name).toContain("no3");
  });

  it("nombre incluye no5 (5ª ausente en el voicing)", () => {
    expect(result.primary?.name).toContain("no5");
  });
});

// ─── Caso 8: referencia activa pero raíz NO está en las notas ────────────────
// x5555x (D,G,C,E) + A7: A (pc 9) no está → requiredCore falla → no contextual.

describe("Caso 8 — referencia activa sin raíz en las notas: no se crea candidato contextual", () => {
  let result;
  beforeAll(() => { result = withRef("x5555x", 9, "7"); });   // A7, A no en {D,G,C,E}

  it("primary no es contextual", () => {
    expect(result.primary?.contextual).toBeFalsy();
  });

  it("promotedByReference = false", () => {
    expect(result.promotedByReference).toBe(false);
  });

  it("ningún reading en rankedReadings tiene contextual=true", () => {
    expect(result.rankedReadings.some((r) => r.contextual)).toBe(false);
  });

  it("primary.name = Cadd9/D (ranking inalterado)", () => {
    expect(result.primary?.name).toBe("Cadd9/D");
  });
});

// ─── Caso 9: referencia activa con raíz pero sin b7 → no contextual ──────────
// x32010 = C mayor abierto (C, E, G). Referencia C7: C(raíz) presente, Bb(b7) ausente.
// requiredCore exige b7 → buildContextualDom7Candidate devuelve null.

describe("Caso 9 — raíz presente pero b7 ausente: no se crea candidato contextual dom7", () => {
  let result;
  beforeAll(() => { result = withRef("x32010", 0, "7"); });   // C7, raíz C en {C,E,G}, Bb ausente

  it("primary no es contextual", () => {
    expect(result.primary?.contextual).toBeFalsy();
  });

  it("promotedByReference = false", () => {
    expect(result.promotedByReference).toBe(false);
  });

  it("ningún reading en rankedReadings tiene contextual=true", () => {
    expect(result.rankedReadings.some((r) => r.contextual)).toBe(false);
  });

  it("C (raíz) sí está en las notas (verifica que la condición de raíz no es el problema)", () => {
    expect(result.noteNames).toContain("C");
  });

  it("Bb (b7 de C) NO está en las notas (es la condición que bloquea el contextual)", () => {
    expect(result.noteNames).not.toContain("Bb");
  });
});

// ─── Caso 10: referencia coincide con el winner natural → no marcar promoted ──
// 3x343x = G7 ya es el candidato primario sin referencia.
// Con referencia G7, el ranking confirma G7 en primer lugar → sorted[0] === readings[0]
// → NO se añade referencePromoted.

describe("Caso 10 — referencia coincide con winner natural: no referencePromoted", () => {
  let resultSin;
  let resultCon;
  beforeAll(() => {
    resultSin = withoutRef("3x343x");
    resultCon = withRef("3x343x", 7, "7");   // G7
  });

  it("sin referencia, primary = G7", () => {
    expect(resultSin.primary?.name).toBe("G7");
  });

  it("con referencia G7, primary sigue siendo G7", () => {
    expect(resultCon.primary?.name).toBe("G7");
  });

  it("primary.referencePromoted es falsy (no hubo cambio de orden)", () => {
    expect(resultCon.primary?.referencePromoted).toBeFalsy();
  });

  it("primary.contextual es falsy (el motor ya detecta G7, no se crea sintético)", () => {
    expect(resultCon.primary?.contextual).toBeFalsy();
  });

  it("promotedByReference = false", () => {
    expect(resultCon.promotedByReference).toBe(false);
  });
});

// ─── Invariante global: rootPc de candidato marcado === rootPc de la referencia ─
//
// Si cand.referencePromoted === true o cand.contextual === true,
// entonces cand.rootPc === harmonyContext.rootPc.
//
// Evita la regresión donde F7/G7/A7/B7 marcaban D9sus4(no5) en x5555x
// porque contextMatchScore evaluaba quality sin verificar primero la raíz.

describe("Invariante: todo candidato marcado por referencia tiene rootPc === referencia", () => {
  const CASES = [
    // Bug original: referencias con raíz distinta a D promovían D9sus4
    ["x5555x", 5, "7",      "x5555x + F7"],
    ["x5555x", 7, "7",      "x5555x + G7"],
    ["x5555x", 9, "7",      "x5555x + A7"],
    ["x5555x", 11, "7",     "x5555x + B7"],
    // Casos donde sí debe haber candidato marcado (raíz coincide)
    ["x5555x", 2, "7",      "x5555x + D7"],   // referencePromoted en D9sus4
    ["x5555x", 4, "7",      "x5555x + E7"],   // contextual E7(#9,b13,...)
    ["x6x665", 3, "7",      "x6x665 + Eb7"],  // contextual Eb7(9,#11,...)
    // Casos con calidades no-dom
    ["3x343x", 7, "7",      "3x343x + G7"],   // winner natural, ningún marcado
    ["xx5432", 7, "maj7",   "xx5432 + Gmaj7"],
    ["1320xx", 5, "maj7",   "1320xx + Fmaj7"],
    // Referencia cuya raíz no está en las notas
    ["x32010", 0, "7",      "x32010 + C7"],   // C presente, Bb ausente
    ["x6x665", 5, "7",      "x6x665 + F7"],   // F presente, raíz Eb distinta a F
  ];

  for (const [pattern, rootPc, quality, label] of CASES) {
    it(`${label}: ningún candidato marcado tiene rootPc ≠ ${rootPc}`, () => {
      const { rankedReadings } = analyzeFretsCore(pattern, {
        harmonyContext: { enabled: true, rootPc, quality },
      });
      const marked = rankedReadings.filter((c) => c.contextual || c.referencePromoted);
      for (const cand of marked) {
        expect(cand.rootPc).toBe(rootPc);
      }
    });
  }
});

// ─── Transpuesta del caso contextual dom7 — 12 semitonos ─────────────────────
//
// Caso base: Eb7(9,#11,no3,no5)  — notas Eb, Db, F, A  — bajo Eb  — ref Eb7
// Intervalos desde la raíz: root(0), b7(10), 9(2), #11(6)
//
// Para cada transposición:
//   - Se construyen las notas y la referencia desde pitch classes (no digitación fija).
//   - Se validan estructura e intervalos; el spelling exacto solo se exige en t=0 (Eb).

describe("Transpuesta del caso contextual dom7 — 12 semitonos", () => {
  const BASE_ROOT_PC   = 3;               // Eb
  const DOM7_INTERVALS = [0, 10, 2, 6];   // root, b7, 9, #11

  // Construye notas y ranking para una transposición dada (semitones relativo a Eb).
  function getRankedContextual(semitones) {
    const rootPc      = mod12(BASE_ROOT_PC + semitones);
    const pcs         = DOM7_INTERVALS.map((i) => mod12(rootPc + i));
    const preferSharps = preferSharpsFromMajorTonicPc(rootPc);
    const noteNames   = pcs.map((pc) => pcToName(pc, preferSharps));
    const bassName    = pcToName(rootPc, preferSharps);
    const selectedNotes  = buildSyntheticSelectedNotes(noteNames, bassName);
    const readings       = detectChordReadings(selectedNotes);
    const harmonyContext = { enabled: true, rootPc, quality: "7" };
    const ranked = rankReadingsWithHarmonyContext(readings, { ...harmonyContext, selectedNotes });
    return { ranked, rootPc };
  }

  // Precalcular las 12 transposiciones una sola vez.
  const RESULTS = {};
  beforeAll(() => {
    for (let t = 0; t < 12; t++) {
      RESULTS[t] = getRankedContextual(t);
    }
  });

  // ── Assertions exactas para el caso base Eb (t=0) ──────────────────────────

  describe("caso base Eb (t=0) — spelling exacto", () => {
    it('name === "Eb7(9,#11,no3,no5)"', () => {
      expect(RESULTS[0].ranked[0]?.name).toBe("Eb7(9,#11,no3,no5)");
    });

    it('intervalPairsText === "1=Eb, b7=Db, 9=F, #11=A"', () => {
      expect(RESULTS[0].ranked[0]?.intervalPairsText).toBe("1=Eb, b7=Db, 9=F, #11=A");
    });

    it("visibleNotes contiene 'A'", () => {
      expect(RESULTS[0].ranked[0]?.visibleNotes).toContain("A");
    });

    it("visibleNotes NO contiene 'Bbb'", () => {
      expect(RESULTS[0].ranked[0]?.visibleNotes).not.toContain("Bbb");
    });

    it("rootPc === 3 (Eb)", () => {
      expect(RESULTS[0].ranked[0]?.rootPc).toBe(3);
    });
  });

  // ── Invariantes estructurales para las 12 transposiciones ────────────────────
  // No se exige spelling; se validan tipo, rootPc, intervalos, fórmula y missings.

  const SEMITONES = Array.from({ length: 12 }, (_, t) => t);

  it.each(SEMITONES)("t=%i → ranked[0].contextual === true", (t) => {
    expect(RESULTS[t].ranked[0]?.contextual).toBe(true);
  });

  it.each(SEMITONES)("t=%i → ranked[0].rootPc === harmonyContext.rootPc", (t) => {
    expect(RESULTS[t].ranked[0]?.rootPc).toBe(RESULTS[t].rootPc);
  });

  it.each(SEMITONES)('t=%i → name contiene "7(9,#11,no3,no5)"', (t) => {
    expect(RESULTS[t].ranked[0]?.name).toContain("7(9,#11,no3,no5)");
  });

  it.each(SEMITONES)("t=%i → visibleIntervals ordenados === [0,2,6,10]", (t) => {
    const sorted = [...(RESULTS[t].ranked[0]?.visibleIntervals ?? [])].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 2, 6, 10]);
  });

  it.each(SEMITONES)('t=%i → degreeLabels contiene "1", "b7", "9", "#11"', (t) => {
    const labels = RESULTS[t].ranked[0]?.formula?.degreeLabels ?? [];
    expect(labels).toContain("1");
    expect(labels).toContain("b7");
    expect(labels).toContain("9");
    expect(labels).toContain("#11");
  });

  it.each(SEMITONES)('t=%i → missingLabels contiene "3" y "5"', (t) => {
    const missing = RESULTS[t].ranked[0]?.missingLabels ?? [];
    expect(missing).toContain("3");
    expect(missing).toContain("5");
  });
});
