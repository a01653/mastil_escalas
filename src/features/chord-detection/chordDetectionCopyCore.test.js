import { describe, expect, it } from "vitest";

import { buildQuartalChordBuilderPatch, buildGuideToneChordBuilderPatch } from "./chordDetectionCopyCore.js";
import {
  resolveGuideToneCopiedVoicing,
  buildChordCopyFingerprint,
  deriveDetectedCandidateCopyInversion,
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
