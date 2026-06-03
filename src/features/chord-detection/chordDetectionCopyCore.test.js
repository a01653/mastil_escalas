import { describe, expect, it } from "vitest";

import {
  buildQuartalChordBuilderPatch,
  buildGuideToneChordBuilderPatch,
  buildTertianChordBuilderPatchFromDetectedCandidate,
  buildChordBuilderPatchFromDetectedCandidate,
} from "./chordDetectionCopyCore.js";
import {
  resolveGuideToneCopiedVoicing,
  buildChordCopyFingerprint,
  deriveDetectedCandidateCopyInversion,
  buildVoicingFromFretsLH,
} from "../../music/appVoicingStudyCore.js";

// ───────────────────────────────────────────────────────────────────────────
// Estos tests fijan la lógica de cálculo de las tres rutas de
// `applyDetectedCandidate` (App.jsx) antes de extraer la función pura grande.
// No ejercitan setters ni React: solo el cálculo puro que alimentará al patch.
// ───────────────────────────────────────────────────────────────────────────

// ── Ruta 1: Quartal ─────────────────────────────────────────────────────────
describe("ruta quartal — buildQuartalChordBuilderPatch", () => {
  it("aplica los valores por defecto cuando el uiPatch solo trae la familia y la raíz", () => {
    const patch = buildQuartalChordBuilderPatch({ family: "quartal", rootPc: 7 });
    expect(patch).toEqual({
      family: "quartal",
      rootPc: 7,
      spellPreferSharps: false,
      quartalType: "pure",
      quartalVoices: "4",
      quartalSpread: "closed",
      quartalReference: "root",
      quartalSelectedFrets: null,
      quartalVoicingIdx: 0,
      omit: "none",
    });
  });

  it("respeta los valores explícitos del uiPatch sin sobrescribirlos por defaults", () => {
    const patch = buildQuartalChordBuilderPatch({
      family: "quartal",
      rootPc: 2,
      spellPreferSharps: true,
      quartalType: "so-what",
      quartalVoices: "5",
      quartalSpread: "spread",
      quartalReference: "third",
    });
    expect(patch.rootPc).toBe(2);
    expect(patch.spellPreferSharps).toBe(true);
    expect(patch.quartalType).toBe("so-what");
    expect(patch.quartalVoices).toBe("5");
    expect(patch.quartalSpread).toBe("spread");
    expect(patch.quartalReference).toBe("third");
  });

  it("coacciona spellPreferSharps a booleano (truthy → true, falsy → false)", () => {
    expect(buildQuartalChordBuilderPatch({ rootPc: 0, spellPreferSharps: 1 }).spellPreferSharps).toBe(true);
    expect(buildQuartalChordBuilderPatch({ rootPc: 0, spellPreferSharps: 0 }).spellPreferSharps).toBe(false);
    expect(buildQuartalChordBuilderPatch({ rootPc: 0 }).spellPreferSharps).toBe(false);
  });

  it("siempre fuerza omit='none', quartalSelectedFrets=null, quartalVoicingIdx=0 y family='quartal'", () => {
    const patch = buildQuartalChordBuilderPatch({ rootPc: 9, quartalType: "pure" });
    expect(patch.family).toBe("quartal");
    expect(patch.omit).toBe("none");
    expect(patch.quartalSelectedFrets).toBeNull();
    expect(patch.quartalVoicingIdx).toBe(0);
  });
});

// ── Ruta 2: Guide tones ─────────────────────────────────────────────────────
describe("ruta guide tones — resolveGuideToneCopiedVoicing", () => {
  it("reconoce un voicing de 3 notas como Fmaj7 (1-3-7) y conserva el patrón físico xx325x", () => {
    // xx325x: D(3)=F, G(2)=A, B(5)=E → notas F(5), A(9), E(4) sobre raíz F(5)
    // relativos {0,4,11} = guide tones de maj7.
    const voicing = {
      frets: "xx325x",
      notes: [{ pc: 5 }, { pc: 9 }, { pc: 4 }],
      reach: 3,
    };
    const result = resolveGuideToneCopiedVoicing({
      voicing,
      rootPc: 5,
      allowOpenStrings: false,
      maxSpan: 5,
      maxFret: 12,
    });
    expect(result).not.toBeNull();
    expect(result.guideToneQuality).toBe("maj7");
    expect(result.guideToneInversion).toBe("all");
    expect(result.voicing.frets).toBe("xx325x");
    expect(result.requiresOpenStrings).toBe(false);
  });

  it("devuelve null si el voicing no tiene frets", () => {
    expect(
      resolveGuideToneCopiedVoicing({
        voicing: { frets: "", notes: [{ pc: 5 }, { pc: 9 }, { pc: 4 }] },
        rootPc: 5,
        allowOpenStrings: false,
        maxSpan: 5,
        maxFret: 12,
      })
    ).toBeNull();
  });

  it("devuelve null si el voicing no tiene exactamente 3 notas", () => {
    // 2 notas
    expect(
      resolveGuideToneCopiedVoicing({
        voicing: { frets: "xx32xx", notes: [{ pc: 5 }, { pc: 9 }] },
        rootPc: 5,
        allowOpenStrings: false,
        maxSpan: 5,
        maxFret: 12,
      })
    ).toBeNull();
    // 4 notas
    expect(
      resolveGuideToneCopiedVoicing({
        voicing: { frets: "x3201x", notes: [{ pc: 0 }, { pc: 4 }, { pc: 7 }, { pc: 11 }] },
        rootPc: 0,
        allowOpenStrings: false,
        maxSpan: 5,
        maxFret: 12,
      })
    ).toBeNull();
  });

  it("devuelve null si la firma de 3 notas no corresponde a guide tones (p. ej. tríada mayor 1-3-5)", () => {
    // notas C(0), E(4), G(7) sobre raíz C → relativos {0,4,7}: no está en la tabla de guide tones.
    expect(
      resolveGuideToneCopiedVoicing({
        voicing: { frets: "xx2010", notes: [{ pc: 0 }, { pc: 4 }, { pc: 7 }] },
        rootPc: 0,
        allowOpenStrings: false,
        maxSpan: 5,
        maxFret: 12,
      })
    ).toBeNull();
  });
});

// ── Ruta 3: Tertian ─────────────────────────────────────────────────────────
describe("ruta tertian — buildChordCopyFingerprint", () => {
  it("produce una huella determinista con el orden de campos esperado", () => {
    const fp = buildChordCopyFingerprint({
      rootPc: 0,
      quality: "maj",
      suspension: "none",
      structure: "tetrad",
      ext7: true,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
      omit: "none",
      inversion: "all",
      form: "open",
      maxDist: 4,
      allowOpenStrings: false,
    });
    expect(fp).toBe("0|maj|none|tetrad|1|0|0|0|0|none|all|open|4|0");
  });

  it("cambia la huella cuando cambia una extensión o el flag de cuerdas al aire", () => {
    const base = {
      rootPc: 0, quality: "maj", suspension: "none", structure: "tetrad",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
      omit: "none", inversion: "all", form: "open", maxDist: 4, allowOpenStrings: false,
    };
    const withExt9 = buildChordCopyFingerprint({ ...base, ext9: true });
    const withOpen = buildChordCopyFingerprint({ ...base, allowOpenStrings: true });
    expect(withExt9).not.toBe(buildChordCopyFingerprint(base));
    expect(withOpen).not.toBe(buildChordCopyFingerprint(base));
    expect(withExt9).toBe("0|maj|none|tetrad|1|0|1|0|0|none|all|open|4|0");
    expect(withOpen).toBe("0|maj|none|tetrad|1|0|0|0|0|none|all|open|4|1");
  });
});

describe("ruta tertian — deriveDetectedCandidateCopyInversion", () => {
  const maj7Patch = {
    quality: "maj",
    suspension: "none",
    structure: "tetrad",
    ext7: true,
    ext6: false,
    ext9: false,
    ext11: false,
    ext13: false,
  };
  const candidate = (bassPc, extra = {}) => ({ rootPc: 0, bassPc, uiPatch: maj7Patch, ...extra });

  it("bajo en la fundamental → 'root'", () => {
    expect(deriveDetectedCandidateCopyInversion(candidate(0))).toBe("root");
  });

  it("bajo en la 3ª → '1' (primera inversión)", () => {
    expect(deriveDetectedCandidateCopyInversion(candidate(4))).toBe("1");
  });

  it("bajo en la 5ª → '2' (segunda inversión)", () => {
    expect(deriveDetectedCandidateCopyInversion(candidate(7))).toBe("2");
  });

  it("bajo en la 7ª (con séptima efectiva) → '3' (tercera inversión)", () => {
    expect(deriveDetectedCandidateCopyInversion(candidate(11))).toBe("3");
  });

  it("devuelve null si el candidato trae un bajo externo (slash ajeno al acorde)", () => {
    expect(deriveDetectedCandidateCopyInversion(candidate(4, { externalBassInterval: 5 }))).toBeNull();
  });

  it("devuelve null si el candidato no tiene uiPatch", () => {
    expect(deriveDetectedCandidateCopyInversion({ rootPc: 0, bassPc: 0 })).toBeNull();
  });
});

// ── Ruta 2 (ensamblado de patch): buildGuideToneChordBuilderPatch ────────────
// Fija el patch que el adaptador aplicará en la rama guide-tones, antes de cablearlo.
describe("ruta guide tones — buildGuideToneChordBuilderPatch", () => {
  // xx325x: D(3)=F, G(2)=A, B(5)=E → notas F(5), A(9), E(4) sobre raíz F(5).
  const fVoicing = () => ({ frets: "xx325x", notes: [{ pc: 5 }, { pc: 9 }, { pc: 4 }], reach: 3 });
  const fCandidate = () => ({ uiPatch: { rootPc: 5, spellPreferSharps: false }, name: "Fmaj7(no5)" });

  it("caso positivo xx325x: produce un patch guide_tones con calidad/forma/inversión/frets correctos", () => {
    const patch = buildGuideToneChordBuilderPatch({
      candidate: fCandidate(),
      manualCopiedVoicing: fVoicing(),
      nextAllowOpenStrings: false,
      maxSpan: 5,
      requiredMaxDist: null,
      maxFret: 12,
    });
    expect(patch).not.toBeNull();
    expect(patch.family).toBe("guide_tones");
    expect(patch.rootPc).toBe(5);
    expect(patch.spellPreferSharps).toBe(false);
    expect(patch.guideToneQuality).toBe("maj7");
    expect(patch.guideToneInversion).toBe("all");
    expect(patch.guideToneSelectedFrets).toBe("xx325x");
    expect(patch.guideToneVoicingIdx).toBe(0);
    expect(patch.copiedEntry).toBeNull();
    expect(patch.pendingRestore).toEqual({ active: false, frets: null });
    expect(patch.pendingCopyResolution).toBeNull();
  });

  it("devuelve null si manualCopiedVoicing no tiene frets", () => {
    expect(
      buildGuideToneChordBuilderPatch({
        candidate: fCandidate(),
        manualCopiedVoicing: { frets: "", notes: [{ pc: 5 }, { pc: 9 }, { pc: 4 }] },
        nextAllowOpenStrings: false,
        maxSpan: 5,
        requiredMaxDist: null,
        maxFret: 12,
      })
    ).toBeNull();
    expect(
      buildGuideToneChordBuilderPatch({
        candidate: fCandidate(),
        manualCopiedVoicing: null,
        nextAllowOpenStrings: false,
        maxSpan: 5,
        requiredMaxDist: null,
        maxFret: 12,
      })
    ).toBeNull();
  });

  it("devuelve null si la firma no es de guide tones (tríada mayor 1-3-5)", () => {
    expect(
      buildGuideToneChordBuilderPatch({
        candidate: { uiPatch: { rootPc: 0, spellPreferSharps: false }, name: "C" },
        manualCopiedVoicing: { frets: "xx2010", notes: [{ pc: 0 }, { pc: 4 }, { pc: 7 }] },
        nextAllowOpenStrings: false,
        maxSpan: 5,
        requiredMaxDist: null,
        maxFret: 12,
      })
    ).toBeNull();
  });

  it("allowOpenStrings combina nextAllowOpenStrings || requiresOpenStrings", () => {
    // nextAllowOpenStrings=true → el OR es true sin depender de requiresOpenStrings.
    const patchTrue = buildGuideToneChordBuilderPatch({
      candidate: fCandidate(),
      manualCopiedVoicing: fVoicing(),
      nextAllowOpenStrings: true,
      maxSpan: 5,
      requiredMaxDist: null,
      maxFret: 12,
    });
    expect(patchTrue.allowOpenStrings).toBe(true);
    // nextAllowOpenStrings=false y xx325x sin cuerdas al aire → requiresOpenStrings=false → false.
    const patchFalse = buildGuideToneChordBuilderPatch({
      candidate: fCandidate(),
      manualCopiedVoicing: fVoicing(),
      nextAllowOpenStrings: false,
      maxSpan: 5,
      requiredMaxDist: null,
      maxFret: 12,
    });
    expect(patchFalse.allowOpenStrings).toBe(false);
  });

  it("maxDist es un passthrough exacto de requiredMaxDist", () => {
    const patch4 = buildGuideToneChordBuilderPatch({
      candidate: fCandidate(),
      manualCopiedVoicing: fVoicing(),
      nextAllowOpenStrings: false,
      maxSpan: 4,
      requiredMaxDist: 4,
      maxFret: 12,
    });
    expect(patch4.maxDist).toBe(4);
    const patchNull = buildGuideToneChordBuilderPatch({
      candidate: fCandidate(),
      manualCopiedVoicing: fVoicing(),
      nextAllowOpenStrings: false,
      maxSpan: 5,
      requiredMaxDist: null,
      maxFret: 12,
    });
    expect(patchNull.maxDist).toBeNull();
  });

  it("notice conserva exactamente el formato 'Copiado en Acorde: <nombre>'", () => {
    const patch = buildGuideToneChordBuilderPatch({
      candidate: fCandidate(),
      manualCopiedVoicing: fVoicing(),
      nextAllowOpenStrings: false,
      maxSpan: 5,
      requiredMaxDist: null,
      maxFret: 12,
    });
    expect(patch.notice).toBe("Copiado en Acorde: Fmaj7(no5)");
  });
});

// ── Ruta 3 (async): buildTertianChordBuilderPatchFromDetectedCandidate ────────
// Fija el patch tertian (la rama async con fetch de catálogo inyectado), antes de cablearlo.
describe("ruta tertian — buildTertianChordBuilderPatchFromDetectedCandidate", () => {
  // Asus2 x0220x: voicing físico real conocido (reusado de los tests de
  // resolveCopiedVoicingAcrossStructures). Desde Triada resuelve a estructura "chord".
  const asus2Voicing = () => buildVoicingFromFretsLH({ fretsLH: [null, 0, 2, 2, 0, null], rootPc: 9, maxFret: 15 });
  const asus2Candidate = () => ({
    uiPatch: { rootPc: 9, quality: "maj", suspension: "sus2", structure: "triad", spellPreferSharps: false },
    formula: { suffix: "sus2" },
    name: "Asus2",
  });
  const baseArgs = (overrides = {}) => ({
    candidate: asus2Candidate(),
    manualCopiedVoicing: asus2Voicing(),
    detectedInversion: null,
    nextAllowOpenStrings: true,
    copiedHasOpenStrings: false,
    wantedFrets: "x0220x",
    requiredMaxDist: null,
    chordMaxDist: 4,
    maxFret: 15,
    baseCatalogVoicings: [],
    fetchCatalogVoicings: async () => [],
    ...overrides,
  });

  it("1. exactChordCatalogMatch: el catálogo contiene wantedFrets → fuerza structure 'chord' y preserva el voicing manual", async () => {
    const manual = asus2Voicing();
    const patch = await buildTertianChordBuilderPatchFromDetectedCandidate(baseArgs({
      manualCopiedVoicing: manual,
      fetchCatalogVoicings: async () => [{ frets: "x0220x" }],
    }));
    expect(patch.structure).toBe("chord");
    expect(patch.copiedEntry.voicing).toBe(manual); // preservedVoicing = manualCopiedVoicing
  });

  it("2. denseOpenStringFallback: 6 cuerdas al aire (≥5 notas) sin resolución → fuerza structure 'chord'", async () => {
    const allOpen = buildVoicingFromFretsLH({ fretsLH: [0, 0, 0, 0, 0, 0], rootPc: 4, maxFret: 15 });
    const patch = await buildTertianChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { rootPc: 4, quality: "maj", suspension: "none", structure: "chord", spellPreferSharps: true }, formula: { suffix: "" }, name: "E" },
      manualCopiedVoicing: allOpen,
      copiedHasOpenStrings: true,
      wantedFrets: allOpen.frets,
      fetchCatalogVoicings: async () => [],
    }));
    expect(patch.structure).toBe("chord");
    expect(patch.copiedEntry.voicing).toBe(allOpen); // fallback usa el voicing manual
  });

  it("3. resolvedCopy normal: targetStructure = resolvedCopy.structure", async () => {
    const patch = await buildTertianChordBuilderPatchFromDetectedCandidate(baseArgs({
      fetchCatalogVoicings: async () => [], // sin exactMatch → usa resolveCopiedVoicingAcrossStructures
    }));
    expect(patch.structure).toBe("chord"); // Asus2 x0220x desde triad resuelve a 'chord'
    expect(patch.restoreFrets).toBe("x0220x");
  });

  it("4. ruta sin frets / note-set: copiedEntry null, restoreFrets null, pendingRestore {active,frets:null}, pendingCopyResolution null", async () => {
    let fetched = false;
    const patch = await buildTertianChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { rootPc: 2, quality: "min", suspension: "none", structure: "chord", spellPreferSharps: false }, formula: { suffix: "m" }, name: "Dm" },
      manualCopiedVoicing: null,
      nextAllowOpenStrings: false,
      wantedFrets: null,
      fetchCatalogVoicings: async () => { fetched = true; return []; },
    }));
    expect(patch.copiedEntry).toBeNull();
    expect(patch.restoreFrets).toBeNull();
    expect(patch.pendingRestore).toEqual({ active: true, frets: null });
    expect(patch.pendingCopyResolution).toBeNull();
    expect(patch.structure).toBe("chord"); // = p.structure
    expect(patch.inversion).toBe("root"); // detectedInversion || p.inversion || "root"
    expect(fetched, "no debe consultar el catálogo cuando no hay frets").toBe(false);
  });

  it("5. copiedEntry: fingerprint coherente con targetStructure y preservedVoicing = manual en exactMatch", async () => {
    const manual = asus2Voicing();
    const patch = await buildTertianChordBuilderPatchFromDetectedCandidate(baseArgs({
      manualCopiedVoicing: manual,
      fetchCatalogVoicings: async () => [{ frets: "x0220x" }],
    }));
    const expectedFp = buildChordCopyFingerprint({
      rootPc: 9, quality: "maj", suspension: "sus2", structure: "chord",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false,
      omit: "none", inversion: "all", form: "open", maxDist: 4, allowOpenStrings: true,
    });
    expect(patch.copiedEntry.fingerprint).toBe(expectedFp);
    expect(patch.copiedEntry.voicing).toBe(manual);
  });

  it("6. notice: incluye omitLabel cuando detectedOmit !== 'none' y lo omite cuando 'none'", async () => {
    const withOmit = await buildTertianChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { rootPc: 10, quality: "dom", suspension: "none", structure: "chord", spellPreferSharps: false }, formula: { suffix: "7(add13,no5)" }, name: "Bb7(add13,no5)" },
      manualCopiedVoicing: null,
      wantedFrets: null,
    }));
    expect(withOmit.omit).toBe("5");
    expect(withOmit.notice).toBe("Copiado en Acorde: Bb7(add13,no5) · Omitir 5");

    const noOmit = await buildTertianChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { rootPc: 10, quality: "dom", suspension: "none", structure: "chord", spellPreferSharps: false }, formula: { suffix: "7" }, name: "Bb7" },
      manualCopiedVoicing: null,
      wantedFrets: null,
    }));
    expect(noOmit.omit).toBe("none");
    expect(noOmit.notice).toBe("Copiado en Acorde: Bb7");
  });

  it("7. pendingCopyResolution: {frets, structure, allowOpenStrings} cuando hay frets", async () => {
    const patch = await buildTertianChordBuilderPatchFromDetectedCandidate(baseArgs({
      fetchCatalogVoicings: async () => [],
    }));
    expect(patch.pendingCopyResolution).toEqual({
      frets: "x0220x",
      structure: "chord",
      allowOpenStrings: true,
    });
  });
});

// ── Dispatcher: buildChordBuilderPatchFromDetectedCandidate ───────────────────
// Verifica la prioridad quartal → guide-tones → tertian, el gating del catálogo
// (solo tertian con frets lo consulta) y que es async.
describe("dispatcher — buildChordBuilderPatchFromDetectedCandidate", () => {
  const failFetch = async () => { throw new Error("fetchCatalogVoicings no debe llamarse"); };
  const baseArgs = (overrides = {}) => ({
    candidate: undefined,
    manualCopiedVoicing: null,
    detectedInversion: null,
    nextAllowOpenStrings: false,
    copiedHasOpenStrings: false,
    wantedFrets: null,
    requiredMaxDist: null,
    chordMaxDist: 4,
    maxFret: 15,
    baseCatalogVoicings: [],
    fetchCatalogVoicings: failFetch,
    ...overrides,
  });

  it("1. familia quartal → patch family 'quartal' sin consultar el catálogo", async () => {
    const patch = await buildChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { family: "quartal", rootPc: 7, spellPreferSharps: false } },
    }));
    expect(patch.family).toBe("quartal");
    expect(patch.rootPc).toBe(7);
  });

  it("2. match guide-tones (xx325x) → patch family 'guide_tones' sin consultar el catálogo", async () => {
    const patch = await buildChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { rootPc: 5, spellPreferSharps: false }, name: "Fmaj7(no5)" },
      manualCopiedVoicing: { frets: "xx325x", notes: [{ pc: 5 }, { pc: 9 }, { pc: 4 }], reach: 3 },
      wantedFrets: "xx325x",
      maxFret: 12,
    }));
    expect(patch.family).toBe("guide_tones");
    expect(patch.guideToneQuality).toBe("maj7");
  });

  it("3. guide-tones null + tertian con frets → patch family 'tertian' y SÍ consulta el catálogo", async () => {
    let fetched = false;
    const asus2 = buildVoicingFromFretsLH({ fretsLH: [null, 0, 2, 2, 0, null], rootPc: 9, maxFret: 15 });
    const patch = await buildChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { rootPc: 9, quality: "maj", suspension: "sus2", structure: "triad", spellPreferSharps: false }, formula: { suffix: "sus2" }, name: "Asus2" },
      manualCopiedVoicing: asus2,
      nextAllowOpenStrings: true,
      wantedFrets: "x0220x",
      fetchCatalogVoicings: async () => { fetched = true; return []; },
    }));
    expect(patch.family).toBe("tertian");
    expect(patch.structure).toBe("chord");
    expect(fetched, "tertian con frets debe consultar el catálogo").toBe(true);
  });

  it("4. es async: devuelve una Promise que resuelve al patch correcto", async () => {
    const result = buildChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { family: "quartal", rootPc: 0, spellPreferSharps: false } },
    }));
    expect(result).toBeInstanceOf(Promise);
    const patch = await result;
    expect(patch.family).toBe("quartal");
  });

  it("5. tertian sin frets (note-set) no consulta el catálogo", async () => {
    let fetched = false;
    const patch = await buildChordBuilderPatchFromDetectedCandidate(baseArgs({
      candidate: { uiPatch: { rootPc: 2, quality: "min", suspension: "none", structure: "chord", spellPreferSharps: false }, formula: { suffix: "m" }, name: "Dm" },
      manualCopiedVoicing: null,
      fetchCatalogVoicings: async () => { fetched = true; return []; },
    }));
    expect(patch.family).toBe("tertian");
    expect(fetched, "tertian sin frets no debe consultar el catálogo").toBe(false);
  });
});
