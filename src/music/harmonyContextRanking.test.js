import { describe, it, expect } from "vitest";
import { rankReadingsWithHarmonyContext } from "./harmonyContextRanking.js";
import { analyzeSelectedNotes, buildSyntheticSelectedNotes, resolveDetectedCandidateFromContext, pickDefaultChordCandidate } from "./chordDetectionEngine.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function readingsFor(noteNames, bassName) {
  return analyzeSelectedNotes(noteNames, bassName).readings;
}

// ─── rankReadingsWithHarmonyContext ───────────────────────────────────────────

describe("rankReadingsWithHarmonyContext — contexto desactivado", () => {
  it("devuelve el mismo orden cuando enabled=false", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: false, rootPc: 2, quality: "7" });
    expect(ranked.map((r) => r.name)).toEqual(readings.map((r) => r.name));
  });

  it("devuelve el mismo orden cuando harmonyContext es null", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const ranked = rankReadingsWithHarmonyContext(readings, null);
    expect(ranked.map((r) => r.name)).toEqual(readings.map((r) => r.name));
  });

  it("sin contexto, x5555x sigue dando Cadd9/D como primary", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: false, rootPc: 2, quality: "7" });
    expect(ranked[0].name).toBe("Cadd9/D");
  });

  it("sin contexto, 1320xx sigue dando Cadd11/F como primary", () => {
    const readings = readingsFor(["F", "C", "E", "G"], "F");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: false, rootPc: 5, quality: "maj7" });
    expect(ranked[0].name).toBe("Cadd11/F");
  });
});

describe("rankReadingsWithHarmonyContext — contexto D7 con x5555x", () => {
  it("prioriza D9sus4(no5) cuando contexto es D7 (rootPc=2, quality='7')", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 2, quality: "7" });
    expect(ranked[0].name).toBe("D9sus4(no5)");
  });

  it("Cadd9/D sigue apareciendo en la lista aunque no sea primary", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 2, quality: "7" });
    expect(ranked.some((r) => r.name === "Cadd9/D")).toBe(true);
  });

  it("no elimina lecturas: la lista tiene el mismo número de elementos", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 2, quality: "7" });
    expect(ranked.length).toBe(readings.length);
  });
});

describe("rankReadingsWithHarmonyContext — contexto C mayor con x5555x", () => {
  it("con referencia C (rootPc=0, quality='Mayor'), Cadd9/D sigue siendo primary", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 0, quality: "Mayor" });
    expect(ranked[0].name).toBe("Cadd9/D");
  });
});

describe("rankReadingsWithHarmonyContext — contexto Fmaj7 con 1320xx", () => {
  it("prioriza Fmaj9(no3) cuando contexto es Fmaj7 (rootPc=5, quality='maj7')", () => {
    const readings = readingsFor(["F", "C", "E", "G"], "F");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 5, quality: "maj7" });
    expect(ranked[0].name).toBe("Fmaj9(no3)");
  });

  it("Cadd11/F sigue apareciendo en la lista", () => {
    const readings = readingsFor(["F", "C", "E", "G"], "F");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 5, quality: "maj7" });
    expect(ranked.some((r) => r.name === "Cadd11/F")).toBe(true);
  });
});

describe("rankReadingsWithHarmonyContext — contexto sin encaje", () => {
  it("si el contexto no encaja con ninguna lectura, mantiene el primary original", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    // F# dim: ninguna lectura tiene rootPc=6 ni quality=dim
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 6, quality: "dim" });
    expect(ranked[0].name).toBe(readings[0].name);
    expect(ranked.map((r) => r.name)).toEqual(readings.map((r) => r.name));
  });
});

// ─── Comportamiento del checkbox renombrado (continuidad de lectura) ───────────

describe("resolveDetectedCandidateFromContext — continuidad de lectura", () => {
  it("sin candidato previo, devuelve el primero de la lista", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const result = resolveDetectedCandidateFromContext({
      candidates: readings,
      currentCandidateId: null,
      pendingCandidate: null,
      lastCandidate: null,
      prioritizeContext: false,
    });
    expect(result?.name).toBe(readings[0].name);
  });

  it("con prioritizeContext=true y mismo candidato, lo conserva", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const current = readings[0];
    const result = resolveDetectedCandidateFromContext({
      candidates: readings,
      currentCandidateId: current.id,
      pendingCandidate: null,
      lastCandidate: null,
      prioritizeContext: true,
    });
    expect(result?.id).toBe(current.id);
  });

  it("pickDefaultChordCandidate sin contexto siempre devuelve el primero", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const result = pickDefaultChordCandidate({ candidates: readings, prioritizeContext: false });
    expect(result?.name).toBe(readings[0].name);
  });

  it("con prioritizeContext=false y candidato previo existente, devuelve el primero de la lista (no conserva)", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const previousId = readings[0].id; // Cadd9/D era el primero sin contexto
    const result = resolveDetectedCandidateFromContext({
      candidates: readings,
      currentCandidateId: previousId,
      pendingCandidate: null,
      lastCandidate: null,
      prioritizeContext: false,
    });
    expect(result?.id).toBe(readings[0].id);
  });
});

// ─── Integración ranking + selección (casos del informe de bug) ───────────────

describe("Integración ranking + resolveDetectedCandidateFromContext — Caso A (D7 + x5555x)", () => {
  it("lectura anterior OFF + referencia D7 → selecciona D9sus4(no5), no Cadd9/D", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const previousId = readings[0].id; // Cadd9/D era el primero sin contexto
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 2, quality: "7" });
    expect(ranked[0].name).toBe("D9sus4(no5)");

    const result = resolveDetectedCandidateFromContext({
      candidates: ranked,
      currentCandidateId: previousId,
      pendingCandidate: null,
      lastCandidate: null,
      prioritizeContext: false,
    });
    expect(result?.name).toBe("D9sus4(no5)");
  });

  it("lectura anterior ON + referencia D7 → conserva Cadd9/D aunque no sea el primero rankeado", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const previousId = readings[0].id; // Cadd9/D
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 2, quality: "7" });

    const result = resolveDetectedCandidateFromContext({
      candidates: ranked,
      currentCandidateId: previousId,
      pendingCandidate: null,
      lastCandidate: null,
      prioritizeContext: true,
    });
    expect(result?.name).toBe("Cadd9/D");
  });
});

describe("Integración ranking + resolveDetectedCandidateFromContext — Caso B (C mayor + x5555x)", () => {
  it("lectura anterior OFF + referencia C mayor → selecciona Cadd9/D (sigue siendo el primero)", () => {
    const readings = readingsFor(["D", "G", "C", "E"], "D");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 0, quality: "Mayor" });
    expect(ranked[0].name).toBe("Cadd9/D");

    const result = resolveDetectedCandidateFromContext({
      candidates: ranked,
      currentCandidateId: null,
      pendingCandidate: null,
      lastCandidate: null,
      prioritizeContext: false,
    });
    expect(result?.name).toBe("Cadd9/D");
  });
});

describe("Integración ranking + resolveDetectedCandidateFromContext — Caso C (Fmaj7 + 1320xx)", () => {
  it("lectura anterior OFF + referencia Fmaj7 → selecciona Fmaj9(no3), no Cadd11/F", () => {
    const readings = readingsFor(["F", "C", "E", "G"], "F");
    const previousId = readings[0].id; // Cadd11/F era el primero sin contexto
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 5, quality: "maj7" });
    expect(ranked[0].name).toBe("Fmaj9(no3)");

    const result = resolveDetectedCandidateFromContext({
      candidates: ranked,
      currentCandidateId: previousId,
      pendingCandidate: null,
      lastCandidate: null,
      prioritizeContext: false,
    });
    expect(result?.name).toBe("Fmaj9(no3)");
  });

  it("lectura anterior ON + referencia Fmaj7 → conserva Cadd11/F aunque no sea el primero rankeado", () => {
    const readings = readingsFor(["F", "C", "E", "G"], "F");
    const previousId = readings[0].id; // Cadd11/F
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 5, quality: "maj7" });

    const result = resolveDetectedCandidateFromContext({
      candidates: ranked,
      currentCandidateId: previousId,
      pendingCandidate: null,
      lastCandidate: null,
      prioritizeContext: true,
    });
    expect(result?.name).toBe("Cadd11/F");
  });
});

// ─── Candidato contextual dom7 ────────────────────────────────────────────────

describe("candidato contextual dom7 — x6x665 (Eb, Db, F, A)", () => {
  const NOTES = ["Eb", "Db", "F", "A"];

  it("1) sin referencia mantiene el primario actual del motor", () => {
    const readings = readingsFor(NOTES, "Eb");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: false, rootPc: 3, quality: "7" });
    expect(ranked.map((r) => r.name)).toEqual(readings.map((r) => r.name));
  });

  it("2) con referencia Eb7 crea candidato contextual como primero", () => {
    const readings = readingsFor(NOTES, "Eb");
    const selectedNotes = buildSyntheticSelectedNotes(NOTES, "Eb");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 3, quality: "7", selectedNotes,
    });
    expect(ranked[0].contextual).toBe(true);
    expect(ranked[0].name).toBe("Eb7(9,#11,no3,no5)");
  });

  it("2b) el intervalPairsText del candidato contextual es correcto", () => {
    const readings = readingsFor(NOTES, "Eb");
    const selectedNotes = buildSyntheticSelectedNotes(NOTES, "Eb");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 3, quality: "7", selectedNotes,
    });
    expect(ranked[0].intervalPairsText).toBe("1=Eb, b7=Db, 9=F, #11=A");
  });

  it("2c) las lecturas aisladas siguen presentes y la lista crece en 1", () => {
    const readings = readingsFor(NOTES, "Eb");
    const selectedNotes = buildSyntheticSelectedNotes(NOTES, "Eb");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 3, quality: "7", selectedNotes,
    });
    expect(ranked.length).toBe(readings.length + 1);
    expect(ranked.some((r) => r.name === "F7#5/Eb")).toBe(true);
    expect(ranked.some((r) => r.name === "A(b5,addb6)/Eb")).toBe(true);
  });

  it("2d) visibleNotes del candidato contextual no contiene ortografías aberrantes (Bbb) para pc=A", () => {
    // Regresión: #11 sobre Eb es A (pc=9). Sin degreeLabels, spellChordNotes lo
    // interpreta como grado 5 (b5) → letra B → Bbb. El candidato contextual
    // debe usar spellChordNotes con degreeLabels y producir "A", no "Bbb".
    const readings = readingsFor(NOTES, "Eb");
    const selectedNotes = buildSyntheticSelectedNotes(NOTES, "Eb");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 3, quality: "7", selectedNotes,
    });
    const contextual = ranked[0];
    expect(contextual.visibleNotes).toContain("A");
    expect(contextual.visibleNotes).not.toContain("Bbb");
  });
});

describe("candidato contextual dom7 — x5555x NO genera sintético (ya existe lectura compatible)", () => {
  const NOTES_D = ["D", "G", "C", "E"];

  it("3) con referencia D7 prioriza D9sus4(no5) y NO genera candidato sintético", () => {
    const readings = readingsFor(NOTES_D, "D");
    const selectedNotes = buildSyntheticSelectedNotes(NOTES_D, "D");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 2, quality: "7", selectedNotes,
    });
    expect(ranked[0].contextual).toBeUndefined();
    expect(ranked[0].name).toBe("D9sus4(no5)");
    expect(ranked.length).toBe(readings.length);   // sin candidato extra
    expect(ranked.every((r) => !r.contextual)).toBe(true);
  });
});

describe("candidato contextual dom7 — condiciones de rechazo", () => {
  it("4) si falta la raíz, no crea candidato contextual", () => {
    // Db, F, A sin Eb → raíz (Eb=pc3) ausente
    const readings = readingsFor(["Db", "F", "A"], "Db");
    const selectedNotes = buildSyntheticSelectedNotes(["Db", "F", "A"], "Db");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 3, quality: "7", selectedNotes,
    });
    expect(ranked.every((r) => !r.contextual)).toBe(true);
    expect(ranked.length).toBe(readings.length);
  });

  it("5) si falta el b7, no crea candidato contextual", () => {
    // Eb, G, F, A → Eb=raíz, G=3ª, F=9, A=#11; falta Db(b7)
    const readings = readingsFor(["Eb", "G", "F", "A"], "Eb");
    const selectedNotes = buildSyntheticSelectedNotes(["Eb", "G", "F", "A"], "Eb");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 3, quality: "7", selectedNotes,
    });
    expect(ranked.every((r) => !r.contextual)).toBe(true);
    expect(ranked.length).toBe(readings.length);
  });

  it("6) sin selectedNotes en el contexto, nunca crea candidato contextual", () => {
    const readings = readingsFor(["Eb", "Db", "F", "A"], "Eb");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 3, quality: "7",
      // selectedNotes ausente a propósito
    });
    expect(ranked.every((r) => !r.contextual)).toBe(true);
    expect(ranked.length).toBe(readings.length);
  });
});
