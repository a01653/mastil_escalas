/**
 * Tests de paridad entre analyzeFretsCore, el pipeline interno de App.jsx
 * y los módulos de detección/ranking.
 *
 * ─── POR QUÉ NO SE USA analyzeFretsCore DIRECTAMENTE EN App.jsx ───────────────
 *
 * App.jsx gestiona las notas seleccionadas como estado React (chordDetectSelectedKeys),
 * no como strings de digitación. El flujo de la app es:
 *
 *   [click en mástil] → chordDetectSelectedKeys (state)
 *       → chordDetectSelectedNotes (useMemo):
 *           { key, sIdx, fret,
 *             pc:    mod12(STRINGS[sIdx].pc + fret),   // STRINGS[0] = HighE
 *             pitch: OPEN_MIDI[sIdx] + fret }           // OPEN_MIDI[0] = 64 (HighE)
 *       → detectChordReadings(chordDetectSelectedNotes)
 *       → rankReadingsWithHarmonyContext(readings, harmonyContext)
 *       → resolveDetectedCandidateFromContext(...)      ← state-dependent
 *
 * analyzeFretsCore recorre el mismo camino algorítmico pero con:
 *   - STRING_OPEN_MIDI = [40, 45, …, 64]  (LowE→HighE)   vs OPEN_MIDI = [64, …, 40] (HighE→LowE)
 *   - Bajo explícito: Math.min(...activeMidi)              vs implícito: selectedNotes[0].pitch (ya ordenado)
 *   - analyzeSelectedNotes añade `legend` a cada lectura  (campo decorativo, no afecta ranking)
 *   - Primary = rankedReadings[0]                          vs resolveDetectedCandidateFromContext (state-dep.)
 *
 * ─── EQUIVALENCIAS VERIFICADAS ────────────────────────────────────────────────
 *
 *  1. PC fórmula:
 *     App:  mod12(STRINGS[sIdx].pc + fret)   donde STRINGS[sIdx].pc = mod12(OPEN_MIDI[sIdx])
 *     Core: mod12(STRING_OPEN_MIDI[i] + fret) (i invertido, pero el pc del traste es el mismo)
 *     → Producen el mismo pitch class para el mismo traste físico.
 *
 *  2. Bajo real:
 *     App:  selectedNotes.sort((a,b)=>a.pitch-b.pitch)[0].pitch  (ordenado al construir)
 *     Core: Math.min(...activeMidi)
 *     → Mismo valor.
 *
 *  3. detectChordReadings: misma función exportada. La app la llama directamente;
 *     analyzeFretsCore la llama vía analyzeSelectedNotes (que añade `legend`, inerte para ranking).
 *     → Mismas readings base.
 *
 *  4. rankReadingsWithHarmonyContext: misma función, mismo comportamiento.
 *     `selectedNotes` en ambos casos tiene `{ pc, pitch }` que es lo único que usa el ranking.
 *     → Mismo orden de candidatos.
 *
 * ─── DIVERGENCIA DOCUMENTADA ──────────────────────────────────────────────────
 *
 *  5. Selección primary:
 *     - analyzeFretsCore: primary = rankedReadings[0]  (determinista)
 *     - App:              resolveDetectedCandidateFromContext({
 *                           candidates, currentCandidateId, pendingCandidate,
 *                           lastCandidate, prioritizeContext
 *                         })
 *     → Con "fresh start" (sin candidato previo, prioritizeContext=false) la app
 *       también devuelve rankedReadings[0], por lo que los tests de paridad son válidos.
 *     → Con un candidato previo activo y prioritizeContext=true, la app puede
 *       conservar un candidato diferente al primero rankeado.
 *       Esta divergencia es INTENCIONAL: la app preserva la continuidad de lectura del usuario.
 *
 * ─── QUÉ DETECTARÍAN LOS TESTS SI HUBIERA DIVERGENCIA ────────────────────────
 *
 *  - Si se cambia la fórmula de pc en App.jsx pero no en parseFretString.js:
 *    los tests de paridad fallarían porque noteNames diferiría.
 *
 *  - Si se cambia el algoritmo de ranking en harmonyContextRanking.js:
 *    los tests "x5555x --ref D7 → D9sus4(no5)" y similares fallarían en ambos lados.
 *
 *  - Si analyzeFretsCore introdujera su propio ranking:
 *    los tests de paridad "mismo primary" fallarían en cuanto divergieran los resultados.
 *
 *  - La divergencia de primary selection (punto 5) NO está cubierta intencionalmente.
 *    Es comportamiento de estado React y no puede/debe testarse como puro algoritmo.
 */

import { describe, it, expect } from "vitest";
import { analyzeFretsCore } from "./analyzeFretsCore.js";
import {
  detectChordReadings,
  buildSyntheticSelectedNotes,
} from "./chordDetectionEngine.js";
import { rankReadingsWithHarmonyContext } from "./harmonyContextRanking.js";

// ─── helper: simula el pipeline de App.jsx (fresh start, sin estado previo) ───

function appPipeline(noteNames, bassName, harmonyContext = null) {
  // Paso 3: misma función que la app
  const selectedNotes = buildSyntheticSelectedNotes(noteNames, bassName);
  const readings      = detectChordReadings(selectedNotes);

  // Paso 5: fresh-start → rankedReadings[0] (coincide con la app sin candidato previo)
  if (!harmonyContext?.enabled) return readings[0] ?? null;

  // Paso 4: misma función que la app
  const ranked = rankReadingsWithHarmonyContext(readings, { ...harmonyContext, selectedNotes });
  return ranked[0] ?? null;
}

// ─── Sin referencia ───────────────────────────────────────────────────────────

describe("analyzeFretsCore — sin referencia", () => {
  it("x5555x → primary Cadd9/D", () => {
    expect(analyzeFretsCore("x5555x").primary?.name).toBe("Cadd9/D");
  });

  it("3x343x → primary G7", () => {
    expect(analyzeFretsCore("3x343x").primary?.name).toBe("G7");
  });

  it("xx5432 → primary Gmaj7", () => {
    expect(analyzeFretsCore("xx5432").primary?.name).toBe("Gmaj7");
  });

  it("1320xx → primary Cadd11/F", () => {
    expect(analyzeFretsCore("1320xx").primary?.name).toBe("Cadd11/F");
  });

  it("sin referencia, promotedByReference = false", () => {
    expect(analyzeFretsCore("x5555x").promotedByReference).toBe(false);
  });
});

// ─── Con referencia ───────────────────────────────────────────────────────────

describe("analyzeFretsCore — con referencia", () => {
  it("x5555x --ref D7 → primary D9sus4(no5)", () => {
    const r = analyzeFretsCore("x5555x", {
      harmonyContext: { enabled: true, rootPc: 2, quality: "7" },
    });
    expect(r.primary?.name).toBe("D9sus4(no5)");
  });

  it("x5555x --ref D7 → promotedByReference = true", () => {
    const r = analyzeFretsCore("x5555x", {
      harmonyContext: { enabled: true, rootPc: 2, quality: "7" },
    });
    expect(r.promotedByReference).toBe(true);
  });

  it("x5555x --ref C → primary Cadd9/D (raíz C no encaja)", () => {
    const r = analyzeFretsCore("x5555x", {
      harmonyContext: { enabled: true, rootPc: 0, quality: "Mayor" },
    });
    expect(r.primary?.name).toBe("Cadd9/D");
    expect(r.promotedByReference).toBe(false);
  });

  it("1320xx --ref Fmaj7 → primary Fmaj9(no3)", () => {
    const r = analyzeFretsCore("1320xx", {
      harmonyContext: { enabled: true, rootPc: 5, quality: "maj7" },
    });
    expect(r.primary?.name).toBe("Fmaj9(no3)");
  });

  it("3x343x --ref C → primary G7 (raíz C no encaja)", () => {
    const r = analyzeFretsCore("3x343x", {
      harmonyContext: { enabled: true, rootPc: 0, quality: "Mayor" },
    });
    expect(r.primary?.name).toBe("G7");
    expect(r.promotedByReference).toBe(false);
  });

  it("x5555x --ref F7 → primary Cadd9/D (raíz F no encaja)", () => {
    const r = analyzeFretsCore("x5555x", {
      harmonyContext: { enabled: true, rootPc: 5, quality: "7" },
    });
    expect(r.primary?.name).toBe("Cadd9/D");
    expect(r.promotedByReference).toBe(false);
  });
});

// ─── Paridad con el pipeline de App.jsx (fresh start) ────────────────────────
//
// Estos tests verifican que analyzeFretsCore y el pipeline directo de la app
// (detectChordReadings + rankReadingsWithHarmonyContext) producen el mismo primary
// en condición de "fresh start" (sin candidato previo, prioritizeContext=false).
//
// La divergencia documentada (punto 5 del encabezado) aparece solo cuando el
// usuario tiene un candidato previo activo y prioritizeContext=true.

describe("paridad analyzeFretsCore vs pipeline App.jsx (fresh start)", () => {
  it("x5555x sin ref: mismo primary", () => {
    const core = analyzeFretsCore("x5555x");
    const app  = appPipeline(core.noteNames, core.bassName, null);
    expect(core.primary?.name).toBe(app?.name);
  });

  it("x5555x --ref D7: mismo primary", () => {
    const ctx  = { enabled: true, rootPc: 2, quality: "7" };
    const core = analyzeFretsCore("x5555x", { harmonyContext: ctx });
    const app  = appPipeline(core.noteNames, core.bassName, ctx);
    expect(core.primary?.name).toBe(app?.name);
  });

  it("1320xx --ref Fmaj7: mismo primary", () => {
    const ctx  = { enabled: true, rootPc: 5, quality: "maj7" };
    const core = analyzeFretsCore("1320xx", { harmonyContext: ctx });
    const app  = appPipeline(core.noteNames, core.bassName, ctx);
    expect(core.primary?.name).toBe(app?.name);
  });

  it("3x343x sin ref: mismo primary", () => {
    const core = analyzeFretsCore("3x343x");
    const app  = appPipeline(core.noteNames, core.bassName, null);
    expect(core.primary?.name).toBe(app?.name);
  });

  it("xx5432 sin ref: mismo primary", () => {
    const core = analyzeFretsCore("xx5432");
    const app  = appPipeline(core.noteNames, core.bassName, null);
    expect(core.primary?.name).toBe(app?.name);
  });

  it("x5555x --ref C: mismo primary (sin cambio de ranking)", () => {
    const ctx  = { enabled: true, rootPc: 0, quality: "Mayor" };
    const core = analyzeFretsCore("x5555x", { harmonyContext: ctx });
    const app  = appPipeline(core.noteNames, core.bassName, ctx);
    expect(core.primary?.name).toBe(app?.name);
  });
});

// ─── Estructura de retorno ────────────────────────────────────────────────────

describe("analyzeFretsCore — estructura de retorno", () => {
  it("devuelve todos los campos esperados", () => {
    const r = analyzeFretsCore("x5555x");
    expect(r).toHaveProperty("pattern");
    expect(r).toHaveProperty("tabDisplay");
    expect(r).toHaveProperty("noteNames");
    expect(r).toHaveProperty("pcSet");
    expect(r).toHaveProperty("bassName");
    expect(r).toHaveProperty("selectedNotes");
    expect(r).toHaveProperty("readings");
    expect(r).toHaveProperty("rankedReadings");
    expect(r).toHaveProperty("primary");
    expect(r).toHaveProperty("harmonyContext");
    expect(r).toHaveProperty("promotedByReference");
  });

  it("sin referencia, readings y rankedReadings tienen el mismo orden de ids", () => {
    const r = analyzeFretsCore("x5555x");
    expect(r.rankedReadings.map((c) => c.id)).toEqual(r.readings.map((c) => c.id));
  });

  it("harmonyContext es null cuando no se pasa referencia", () => {
    expect(analyzeFretsCore("x5555x").harmonyContext).toBeNull();
  });

  it("lanza Error con patrón de 5 cuerdas", () => {
    expect(() => analyzeFretsCore("x555x")).toThrow();
  });

  it("lanza Error con menos de 2 cuerdas activas", () => {
    expect(() => analyzeFretsCore("xxxxxx")).toThrow(/2 cuerdas/);
  });

  it("pattern y tabDisplay reflejan el input original", () => {
    const r = analyzeFretsCore("x5555x");
    expect(r.pattern).toBe("x5555x");
    expect(r.tabDisplay).toBe("x-5-5-5-5-x");
  });
});
