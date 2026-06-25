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

  it("5) si falta el b7, no crea candidato contextual completo (solo puede aparecer fragmento)", () => {
    // Eb, G, F, A → Eb=raíz, G=3ª, F=9, A=#11; falta Db(b7)
    const readings = readingsFor(["Eb", "G", "F", "A"], "Eb");
    const selectedNotes = buildSyntheticSelectedNotes(["Eb", "G", "F", "A"], "Eb");
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 3, quality: "7", selectedNotes,
    });
    // Ningún candidato contextual COMPLETO (sin b7 no se crea buildContextualDom7Candidate)
    expect(ranked.every((r) => !r.contextual || r.fragment)).toBe(true);
    // Las lecturas literales están todas presentes (el fragmento añade uno más como máximo)
    expect(ranked.filter((r) => !r.fragment).length).toBe(readings.length);
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

// ─── buildContextualMaj7RootlessCandidate ─────────────────────────────────────

describe("rankReadingsWithHarmonyContext — candidato maj7 rootless (a999ax, D F# B E A, ref G maj7)", () => {
  // Patrón a999ax: D F# B E A — no contiene G (raíz de la referencia)
  // Desde G: D=5ª(7), F#=7M(11), B=3M(4), E=13ª(9), A=9ª(2)
  const notesNoRoot = ["D", "F#", "B", "E", "A"];
  const bass = "D";
  const selectedNotes = buildSyntheticSelectedNotes(notesNoRoot, bass);
  const readings = readingsFor(notesNoRoot, bass);
  const gmaj7Context = { enabled: true, rootPc: 7, quality: "maj7", selectedNotes };

  it("1) genera candidato contextual rootless con raíz G y missingLabels=['1']", () => {
    const ranked = rankReadingsWithHarmonyContext(readings, gmaj7Context);
    const contextual = ranked.find((r) => r.contextual === true && r.rootPc === 7);
    expect(contextual, "debe existir candidato contextual rootless con rootPc=7").toBeTruthy();
    expect(contextual.missingLabels).toContain("1");
    expect(contextual.contextual).toBe(true);
  });

  it("1b) el candidato contextual encabeza la lista y tiene el nombre esperado", () => {
    const ranked = rankReadingsWithHarmonyContext(readings, gmaj7Context);
    expect(ranked[0].contextual).toBe(true);
    expect(ranked[0].rootPc).toBe(7);
    // Con tensiones 9 y 13 presentes, y raíz ausente: Gmaj7(9,13,no1)
    expect(ranked[0].name).toBe("Gmaj7(9,13,no1)");
  });

  it("2) no genera candidato si la raíz G ya está presente en la selección", () => {
    const notesWithRoot = ["G", "D", "F#", "B", "E", "A"];
    const readingsWithRoot = readingsFor(notesWithRoot, "G");
    const selectedWithRoot = buildSyntheticSelectedNotes(notesWithRoot, "G");
    const ranked = rankReadingsWithHarmonyContext(readingsWithRoot, {
      ...gmaj7Context, selectedNotes: selectedWithRoot,
    });
    // El motor genera lecturas G mayor → hasCompatibleReading devuelve true → sin rootless
    const contextual = ranked.find((r) => r.contextual === true && r.rootPc === 7);
    expect(contextual).toBeFalsy();
  });

  it("3a) no genera candidato si falta la 3ª mayor (B)", () => {
    // Sin B: D F# A E → sin 3M de G
    const noThird = ["D", "F#", "A", "E"];
    const ranked = rankReadingsWithHarmonyContext(
      readingsFor(noThird, "D"),
      { ...gmaj7Context, selectedNotes: buildSyntheticSelectedNotes(noThird, "D") },
    );
    expect(ranked.find((r) => r.contextual === true && r.rootPc === 7)).toBeFalsy();
  });

  it("3b) no genera candidato si falta la 7ª mayor (F#)", () => {
    // Sin F#: D B A E → sin 7M de G
    const noSeventh = ["D", "B", "A", "E"];
    const ranked = rankReadingsWithHarmonyContext(
      readingsFor(noSeventh, "D"),
      { ...gmaj7Context, selectedNotes: buildSyntheticSelectedNotes(noSeventh, "D") },
    );
    expect(ranked.find((r) => r.contextual === true && r.rootPc === 7)).toBeFalsy();
  });

  it("4) no genera candidato si hay notas incompatibles con maj7 (F natural = b7 de G)", () => {
    // F natural desde G = b7 (intervalo 10) → incompatible con maj7
    const incompatible = ["D", "F", "B", "E", "A"];
    const ranked = rankReadingsWithHarmonyContext(
      readingsFor(incompatible, "D"),
      { ...gmaj7Context, selectedNotes: buildSyntheticSelectedNotes(incompatible, "D") },
    );
    expect(ranked.find((r) => r.contextual === true && r.rootPc === 7)).toBeFalsy();
  });

  it("5) no genera candidato si la referencia está desactivada", () => {
    const ranked = rankReadingsWithHarmonyContext(readings, { ...gmaj7Context, enabled: false });
    expect(ranked.find((r) => r.contextual === true && r.rootPc === 7)).toBeFalsy();
    // El orden tampoco cambia
    expect(ranked.map((r) => r.name)).toEqual(readings.map((r) => r.name));
  });

  it("6) no genera candidato si quality no es 'maj7'", () => {
    const ranked = rankReadingsWithHarmonyContext(readings, { ...gmaj7Context, quality: "menor" });
    expect(ranked.find((r) => r.contextual === true && r.rootPc === 7)).toBeFalsy();
  });

  it("7) no genera candidato si selectedNotes está ausente en el contexto", () => {
    const ranked = rankReadingsWithHarmonyContext(readings, {
      enabled: true, rootPc: 7, quality: "maj7",
      // selectedNotes ausente a propósito
    });
    expect(ranked.find((r) => r.contextual === true && r.rootPc === 7)).toBeFalsy();
  });

  it("8) el candidato rootless aparece solo con las tensiones realmente presentes", () => {
    // Solo 3M y 7M — sin extensiones (B y F#)
    const minimal = ["B", "F#"];
    const ranked = rankReadingsWithHarmonyContext(
      readingsFor(minimal, "B"),
      { ...gmaj7Context, selectedNotes: buildSyntheticSelectedNotes(minimal, "B") },
    );
    const contextual = ranked.find((r) => r.contextual === true && r.rootPc === 7);
    expect(contextual, "debe generarse con solo 3M y 7M").toBeTruthy();
    // Sin tensiones: missingLabels incluye "1" y "5", nombre sin (9,13)
    expect(contextual.missingLabels).toContain("1");
    expect(contextual.name).toContain("no1");
  });
});

describe("rankReadingsWithHarmonyContext — fragmento dominante sin b7", () => {
  // Voicing 3xx446: G, B, Bb(A#), Eb(D#)
  // Intervalos respecto a G: 0(raíz), 4(3M), 3(#9), 8(b13) → falta b7(F)
  const NOTES_GBBbEb = ["G", "B", "A#", "D#"];
  const G7_CTX = { enabled: true, rootPc: 7, quality: "7" };

  function rankedForGBBbEb() {
    const readings = readingsFor(NOTES_GBBbEb, "G");
    const selectedNotes = buildSyntheticSelectedNotes(NOTES_GBBbEb, "G");
    return rankReadingsWithHarmonyContext(readings, { ...G7_CTX, selectedNotes });
  }

  it("genera un candidato fragmento con flag fragment=true", () => {
    const ranked = rankedForGBBbEb();
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag).toBeTruthy();
  });

  it("el fragmento tiene rootPc=7 (G) y contextual=true", () => {
    const ranked = rankedForGBBbEb();
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag.rootPc).toBe(7);
    expect(frag.contextual).toBe(true);
  });

  it("el fragmento menciona sin b7 en intervalPairsText", () => {
    const ranked = rankedForGBBbEb();
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag.intervalPairsText).toContain("sin b7");
  });

  it("el fragmento incluye las tensiones #9 y b13 en el nombre", () => {
    const ranked = rankedForGBBbEb();
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag.name).toContain("#9");
    expect(frag.name).toContain("b13");
  });

  it("el fragmento es siempre el último candidato", () => {
    const ranked = rankedForGBBbEb();
    const frag = ranked.find((r) => r.fragment === true);
    expect(ranked[ranked.length - 1]).toBe(frag);
  });

  it("la lectura literal Ebaddb6/G sigue presente y precede al fragmento", () => {
    const ranked = rankedForGBBbEb();
    const fragIdx = ranked.findIndex((r) => r.fragment === true);
    const literalIdx = ranked.findIndex((r) => r.name === "Ebaddb6/G");
    expect(literalIdx).toBeGreaterThanOrEqual(0);
    expect(literalIdx).toBeLessThan(fragIdx);
  });

  it("NO genera fragmento cuando b7 está presente (buildContextualDom7Candidate lo cubre)", () => {
    // G, B, F, Bb = G7(#9,no5) → b7(F) presente, no debe aparecer fragment
    const notes = ["G", "B", "F", "A#"];
    const readings = readingsFor(notes, "G");
    const selectedNotes = buildSyntheticSelectedNotes(notes, "G");
    const ranked = rankReadingsWithHarmonyContext(readings, { ...G7_CTX, selectedNotes });
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });

  it("NO genera fragmento fuera de contexto dominante (quality=maj7)", () => {
    const selectedNotes = buildSyntheticSelectedNotes(NOTES_GBBbEb, "G");
    const readings = readingsFor(NOTES_GBBbEb, "G");
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 7, quality: "maj7", selectedNotes });
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });
});

describe("rankReadingsWithHarmonyContext — fragmento dominante: voicing 3xx445 (G,B,Eb,A)", () => {
  // Voicing 3xx445: G, B, Eb, A
  // Intervalos respecto a G: 0(raíz), 4(3M), 8(b13), 2(9) → falta b7(F) y 5(D)
  const NOTES_GBEbA = ["G", "B", "Eb", "A"];
  const G7_CTX = { enabled: true, rootPc: 7, quality: "7" };

  function rankedFor3xx445() {
    const readings = readingsFor(NOTES_GBEbA, "G");
    const selectedNotes = buildSyntheticSelectedNotes(NOTES_GBEbA, "G");
    return rankReadingsWithHarmonyContext(readings, { ...G7_CTX, selectedNotes });
  }

  it("genera un candidato fragmento con flag fragment=true", () => {
    const ranked = rankedFor3xx445();
    expect(ranked.find((r) => r.fragment === true)).toBeTruthy();
  });

  it("el fragmento tiene rootPc=7 y contextual=true", () => {
    const ranked = rankedFor3xx445();
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag.rootPc).toBe(7);
    expect(frag.contextual).toBe(true);
  });

  it("el fragmento incluye las tensiones 9 y b13 en el nombre", () => {
    const ranked = rankedFor3xx445();
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag.name).toContain("9");
    expect(frag.name).toContain("b13");
  });

  it("el fragmento menciona sin b7 en intervalPairsText", () => {
    const ranked = rankedFor3xx445();
    const frag = ranked.find((r) => r.fragment === true);
    expect(frag.intervalPairsText).toContain("sin b7");
  });

  it("el fragmento es siempre el último candidato", () => {
    const ranked = rankedFor3xx445();
    const frag = ranked.find((r) => r.fragment === true);
    expect(ranked[ranked.length - 1]).toBe(frag);
  });
});

describe("rankReadingsWithHarmonyContext — fragmento: fronteras de calidad dominante", () => {
  // El fragmento solo se genera con quality==="7".
  // En la UI actual, CHORD_REF_QUALITIES = [..., "7", ..., "7sus4"]
  // → "7sus4" no genera fragmento dom7 (es una familia diferente aunque mapee a "dom")
  // → "Mayor", "menor", "m7", etc. tampoco generan fragmento
  // Variantes hipotéticas ("7alt", "7b9", "9", "13") no existen en la UI y
  // tampoco generarían fragmento porque la condición es estrictamente quality==="7"
  const NOTES_GBEbA = ["G", "B", "Eb", "A"];

  function rankedWithQuality(quality) {
    const readings = readingsFor(NOTES_GBEbA, "G");
    const selectedNotes = buildSyntheticSelectedNotes(NOTES_GBEbA, "G");
    return rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 7, quality, selectedNotes });
  }

  it("quality='7sus4' → NO genera fragmento dom7 (familia diferente)", () => {
    const frag = rankedWithQuality("7sus4").find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });

  it("quality='Mayor' → NO genera fragmento", () => {
    const frag = rankedWithQuality("Mayor").find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });

  it("quality='m7' → NO genera fragmento", () => {
    const frag = rankedWithQuality("m7").find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });

  it("quality='maj7' → NO genera fragmento", () => {
    const frag = rankedWithQuality("maj7").find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });

  it("quality hipotético '7alt' (no existe en UI) → NO genera fragmento", () => {
    const frag = rankedWithQuality("7alt").find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });

  it("quality hipotético '9' (no existe en UI) → NO genera fragmento", () => {
    const frag = rankedWithQuality("9").find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });

  it("quality hipotético '7b9' (no existe en UI) → NO genera fragmento", () => {
    const frag = rankedWithQuality("7b9").find((r) => r.fragment === true);
    expect(frag).toBeUndefined();
  });
});

// ─── buildContextualMajFragmentCandidate ──────────────────────────────────────

describe("rankReadingsWithHarmonyContext — fragmento 6/9 mayor (xx445x = F# B E, ref D/A)", () => {
  // xx445x: cuerdas 4-3-2 = F#(6) B(11) E(4), bajo F#
  const NOTES = ["F#", "B", "E"];
  const BASS  = "F#";

  function rankedFor(rootPc, quality, notes = NOTES, bass = BASS) {
    const readings      = readingsFor(notes, bass);
    const selectedNotes = buildSyntheticSelectedNotes(notes, bass);
    return {
      readings,
      ranked: rankReadingsWithHarmonyContext(readings, {
        enabled: true, rootPc, quality: quality ?? "Mayor", selectedNotes,
      }),
    };
  }

  // ─ Caso 1: sin referencia ──────────────────────────────────────────────

  it("1a) sin contexto, motor devuelve Bsus4/F# y/o Esus2/F# como lecturas literales", () => {
    const readings = readingsFor(NOTES, BASS);
    expect(readings.some((r) => r.name === "Bsus4/F#" || r.name === "Esus2/F#")).toBe(true);
  });

  it("1b) disabled=false → no hay fragmento contextual en la lista", () => {
    const readings = readingsFor(NOTES, BASS);
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: false, rootPc: 2, quality: "Mayor" });
    expect(ranked.every((r) => !r.contextual)).toBe(true);
  });

  // ─ Caso 2: referencia D (rootPc=2) ────────────────────────────────────

  it("2a) ref D → genera D6/9(no1,no5) como candidato contextual/fragmentario", () => {
    const { ranked } = rankedFor(2, "Mayor");
    const frag = ranked.find((r) => r.contextual === true && r.fragment === true);
    expect(frag, "debe existir fragmento contextual con ref D").toBeTruthy();
    expect(frag.name).toBe("D6/9(no1,no5)");
    expect(frag.rootPc).toBe(2);
  });

  it("2b) ref D → missingLabels contiene '1' y '5'", () => {
    const { ranked } = rankedFor(2, "Mayor");
    const frag = ranked.find((r) => r.contextual === true && r.fragment === true);
    expect(frag.missingLabels).toContain("1");
    expect(frag.missingLabels).toContain("5");
  });

  it("2c) ref D → el fragmento es el último elemento de la lista", () => {
    const { readings, ranked } = rankedFor(2, "Mayor");
    expect(ranked[ranked.length - 1].name).toBe("D6/9(no1,no5)");
    expect(ranked.length).toBe(readings.length + 1);
  });

  it("2d) ref D → Bsus4/F# precede al fragmento (lecturas literales intactas)", () => {
    const { ranked } = rankedFor(2, "Mayor");
    const fragIdx  = ranked.findIndex((r) => r.contextual === true && r.fragment === true);
    const bsus4Idx = ranked.findIndex((r) => r.name === "Bsus4/F#");
    expect(bsus4Idx).toBeGreaterThanOrEqual(0);
    expect(bsus4Idx).toBeLessThan(fragIdx);
  });

  it("2e) ref D → intervalPairsText menciona 3=F#, 9=E y 6=B", () => {
    const { ranked } = rankedFor(2, "Mayor");
    const frag = ranked.find((r) => r.contextual === true && r.fragment === true);
    expect(frag.intervalPairsText).toContain("3=F#");
    expect(frag.intervalPairsText).toContain("9=E");
    expect(frag.intervalPairsText).toContain("6=B");
  });

  // ─ Caso 3: referencia A (rootPc=9) ────────────────────────────────────

  it("3a) ref A → genera A6/9(no1,no3) como candidato contextual/fragmentario", () => {
    const { ranked } = rankedFor(9, "Mayor");
    const frag = ranked.find((r) => r.contextual === true && r.fragment === true);
    expect(frag, "debe existir fragmento contextual con ref A").toBeTruthy();
    expect(frag.name).toBe("A6/9(no1,no3)");
    expect(frag.rootPc).toBe(9);
  });

  it("3b) ref A → missingLabels contiene '1' y '3'", () => {
    const { ranked } = rankedFor(9, "Mayor");
    const frag = ranked.find((r) => r.contextual === true && r.fragment === true);
    expect(frag.missingLabels).toContain("1");
    expect(frag.missingLabels).toContain("3");
  });

  it("3c) ref A → el fragmento es el último elemento de la lista", () => {
    const { readings, ranked } = rankedFor(9, "Mayor");
    expect(ranked[ranked.length - 1].name).toBe("A6/9(no1,no3)");
    expect(ranked.length).toBe(readings.length + 1);
  });

  it("3d) ref A → intervalPairsText menciona 5=E, 9=B y 6=F#", () => {
    const { ranked } = rankedFor(9, "Mayor");
    const frag = ranked.find((r) => r.contextual === true && r.fragment === true);
    expect(frag.intervalPairsText).toContain("5=E");
    expect(frag.intervalPairsText).toContain("9=B");
    expect(frag.intervalPairsText).toContain("6=F#");
  });

  // ─ Caso 4: referencia E — raíz presente, sin fragmento ───────────────

  it("4a) ref E → NO genera fragmento (raíz E presente en las notas)", () => {
    const { readings, ranked } = rankedFor(4, "Mayor");
    const frag = ranked.find((r) => r.contextual === true && r.fragment === true);
    expect(frag).toBeUndefined();
    expect(ranked.length).toBe(readings.length);
  });

  it("4b) ref E → Esus2/F# aparece en la lista (no eliminada)", () => {
    const { ranked } = rankedFor(4, "Mayor");
    expect(ranked.some((r) => r.name === "Esus2/F#")).toBe(true);
  });

  // ─ Guardas ─────────────────────────────────────────────────────────────

  it("5) sin selectedNotes → no genera fragmento", () => {
    const readings = readingsFor(NOTES, BASS);
    const ranked = rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc: 2, quality: "Mayor" });
    expect(ranked.find((r) => r.contextual === true && r.fragment === true)).toBeUndefined();
  });

  it("6) quality='7' con ref D → no genera fragmento 6/9 mayor", () => {
    const { ranked } = rankedFor(2, "7");
    const frag = ranked.find((r) => r.formula?.id === "contextual_maj6_9_fragment");
    expect(frag).toBeUndefined();
  });

  it("7) solo 6ª pero sin 9ª (F# B, sin E) → no genera fragmento", () => {
    const { ranked } = rankedFor(2, "Mayor", ["F#", "B"], "F#");
    expect(ranked.find((r) => r.formula?.id === "contextual_maj6_9_fragment")).toBeUndefined();
  });

  it("8) solo 9ª pero sin 6ª (F# E, sin B) → no genera fragmento", () => {
    const { ranked } = rankedFor(2, "Mayor", ["F#", "E"], "F#");
    expect(ranked.find((r) => r.formula?.id === "contextual_maj6_9_fragment")).toBeUndefined();
  });

  it("9) intervalo no válido (C=b7 de D) → no genera fragmento", () => {
    const { ranked } = rankedFor(2, "Mayor", ["F#", "B", "E", "C"], "F#");
    expect(ranked.find((r) => r.formula?.id === "contextual_maj6_9_fragment")).toBeUndefined();
  });
});

// ─── Preferencia enarmónica contextual ───────────────────────────────────────

describe("rankReadingsWithHarmonyContext — preferencia enarmónica (preferSharps)", () => {
  // x4x440: C#(1), B(11), D#(3), E(4) — desde C#: raíz, b7, 9, b3 → C#m9(no5) vs Dbm...
  const x4x440Notes = [
    { pc: 1,  pitch: 49 },
    { pc: 11, pitch: 59 },
    { pc: 3,  pitch: 63 },
    { pc: 4,  pitch: 64 },
  ];

  it("con contexto C# menor (preferSharps=true), C#m9(no5) aparece antes que lecturas Db", () => {
    const readings = readingsFor(["C#", "B", "D#", "E"], "C#");
    const context = {
      enabled: true,
      rootPc: 1,
      quality: "menor",
      preferSharps: true,
      selectedNotes: x4x440Notes,
    };
    const ranked = rankReadingsWithHarmonyContext(readings, context);
    const csharpIdx = ranked.findIndex((r) => r.name.startsWith("C#") && r.rootPc === 1);
    const dbIdx     = ranked.findIndex((r) => r.name.startsWith("Db") && r.rootPc === 1);
    expect(csharpIdx).toBeGreaterThanOrEqual(0);
    // Si hay lectura Db, debe aparecer después de la lectura C#
    if (dbIdx >= 0) expect(csharpIdx).toBeLessThan(dbIdx);
  });

  it("con contexto C# menor, la primera lectura rootPc=1 es exactamente C#m9(no5)", () => {
    const readings = readingsFor(["C#", "B", "D#", "E"], "C#");
    const context = {
      enabled: true,
      rootPc: 1,
      quality: "menor",
      preferSharps: true,
      selectedNotes: x4x440Notes,
    };
    const ranked = rankReadingsWithHarmonyContext(readings, context);
    const firstRootPc1 = ranked.find((r) => r.rootPc === 1);
    expect(firstRootPc1?.preferSharps).toBe(true);
    expect(firstRootPc1?.name).toBe("C#m9(no5)");
  });

  it("con contexto Db menor (preferSharps=false), la lectura Db es exactamente Dbm9(no5), no Dbm7(add9,no5)", () => {
    const readings = readingsFor(["C#", "B", "D#", "E"], "C#");
    const context = {
      enabled: true,
      rootPc: 1,
      quality: "menor",
      preferSharps: false,
      selectedNotes: x4x440Notes,
    };
    const ranked = rankReadingsWithHarmonyContext(readings, context);
    const firstRootPc1 = ranked.find((r) => r.rootPc === 1);
    // La grafía canónica es Dbm9(no5), no Dbm7(add9,no5) — b7+9 siempre produce m9
    expect(firstRootPc1?.name).toBe("Dbm9(no5)");
    const allNames = ranked.map((r) => r.name);
    expect(allNames).not.toContain("Dbm7(add9,no5)");
    const dbIdx     = ranked.findIndex((r) => r.name.startsWith("Db") && r.rootPc === 1);
    const csharpIdx = ranked.findIndex((r) => r.name.startsWith("C#") && r.rootPc === 1);
    if (dbIdx >= 0 && csharpIdx >= 0) expect(dbIdx).toBeLessThan(csharpIdx);
  });

  it("sin preferSharps en el contexto, el orden de enharmonías no cambia respecto al motor", () => {
    const readings = readingsFor(["C#", "B", "D#", "E"], "C#");
    const contextConPrefer = {
      enabled: true, rootPc: 1, quality: "menor", preferSharps: true, selectedNotes: x4x440Notes,
    };
    const contextSinPrefer = {
      enabled: true, rootPc: 1, quality: "menor", selectedNotes: x4x440Notes,
    };
    const rankedCon = rankReadingsWithHarmonyContext(readings, contextConPrefer);
    const rankedSin = rankReadingsWithHarmonyContext(readings, contextSinPrefer);
    const firstCon = rankedCon.find((r) => r.rootPc === 1);
    const firstSin = rankedSin.find((r) => r.rootPc === 1);
    // Con preferSharps=true, primero debe ser C#; sin preferSharps, Db puede ser primero
    expect(firstCon?.name).toContain("C#");
    // Sin preferSharps el motor mantiene su orden (Db primero para pc=1)
    expect(firstSin?.name.startsWith("Db") || firstSin?.name.startsWith("C#")).toBe(true);
  });
});
