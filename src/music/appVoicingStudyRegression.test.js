/**
 * Batería de regresión para el Modo Estudio.
 *
 * Cubre 12 acordes en C Mayor y valida:
 *   - compatibilidad acorde/escala
 *   - clasificación como dominante
 *   - dominantes secundarios y backdoor
 *   - sustitución tritonal
 *   - interpolación II-V (distinción función principal / tonicización)
 *   - upper structures
 *   - advertencias diatónica/no-diatónica en el guide
 *   - spelling/enarmonía (Eb no D#, Cb no B en spelling de acordes)
 *
 * NO modifica ninguna función de producción.
 */

import { describe, expect, test } from "vitest";
import {
  analyzeChordScaleCompatibility,
  isStudyDominantChord,
  buildDominantInfo,
  buildBackdoorDominantInfo,
  buildStudySubstitutionGuide,
  buildStudyChordSpecFromUi,
} from "./appVoicingStudyCore.js";

// ─── Constantes ───────────────────────────────────────────────────────────────

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];

// Pitch classes
const C = 0, D = 2, E = 4, F = 5, G = 7, A = 9, B = 11;
const Db = 1;

// Planes diatónicas reutilizables
const PLAN_MAJ7  = { quality: "maj", intervals: [0, 4, 7, 11] };
const PLAN_MIN7  = { quality: "min", intervals: [0, 3, 7, 10] };
const PLAN_DOM7  = { quality: "dom", intervals: [0, 4, 7, 10] };
const PLAN_HDIM7 = { quality: "hdim", intervals: [0, 3, 6, 10] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function compat(chordRootPc, chordIntervals, chordName, preferSharps = false) {
  return analyzeChordScaleCompatibility({
    chordRootPc,
    chordIntervals,
    activeScaleRootPc: C,
    scaleIntervals: C_MAJOR,
    scaleName: "Mayor",
    chordName,
    preferSharps,
  });
}

function guide(chordRootPc, chordName, plan, preferSharps = false) {
  return buildStudySubstitutionGuide({
    chordRootPc,
    chordName,
    plan,
    preferSharps,
    harmonizedScale: null,
    backdoorDominantInfo: buildBackdoorDominantInfo(chordRootPc, preferSharps),
    scaleNotesText: "C D E F G A B",
    scaleRootPc: C,
    scaleName: "Mayor",
    harmonyMode: "major",
    scaleIntervals: C_MAJOR,
  });
}

// Busca un item por título dentro de cualquier sección del guide
function findItem(sections, title) {
  for (const sec of sections) {
    const item = (sec.items || []).find((i) => i.title === title);
    if (item) return item;
  }
  return null;
}

// ─── 1. Compatibilidad acorde/escala ─────────────────────────────────────────

describe("compatibilidad — acordes diatónicos de C Mayor", () => {
  test("caso 1 — Cmaj7 (Imaj7): completamente diatónico", () => {
    const r = compat(C, [0, 4, 7, 11], "Cmaj7");
    expect(r.isDiatonic).toBe(true);
    expect(r.notesOutOfScale).toHaveLength(0);
    expect(r.diatonicSuggestion).toBeNull();
  });

  test("caso 2 — Dm7 (IIm7): completamente diatónico", () => {
    const r = compat(D, [0, 3, 7, 10], "Dm7");
    expect(r.isDiatonic).toBe(true);
    expect(r.notesOutOfScale).toHaveLength(0);
    expect(r.diatonicSuggestion).toBeNull();
  });

  test("caso 3 — G7 (V7): completamente diatónico", () => {
    const r = compat(G, [0, 4, 7, 10], "G7", true);
    expect(r.isDiatonic).toBe(true);
    expect(r.notesOutOfScale).toHaveLength(0);
  });

  test("caso 4 — G7/D (V7 2ª inversión): diatónico, mismos intervalos que G7", () => {
    const r = compat(G, [0, 4, 7, 10], "G7/D", true);
    expect(r.isDiatonic).toBe(true);
    expect(r.notesOutOfScale).toHaveLength(0);
  });

  test("caso 6 — Fmaj7 (IVmaj7): completamente diatónico", () => {
    const r = compat(F, [0, 4, 7, 11], "Fmaj7");
    expect(r.isDiatonic).toBe(true);
    expect(r.notesOutOfScale).toHaveLength(0);
  });

  test("caso 7 — Am7 (VIm7): completamente diatónico", () => {
    const r = compat(A, [0, 3, 7, 10], "Am7");
    expect(r.isDiatonic).toBe(true);
    expect(r.notesOutOfScale).toHaveLength(0);
  });

  test("caso 8 — Bm7(b5) (VIIm7b5): completamente diatónico", () => {
    const r = compat(B, [0, 3, 6, 10], "Bm7(b5)", true);
    expect(r.isDiatonic).toBe(true);
    expect(r.notesOutOfScale).toHaveLength(0);
  });
});

describe("compatibilidad — acordes no diatónicos en C Mayor", () => {
  test("caso 5 — Gmaj7: F# (7M) fuera de escala; sugiere G7 con b7", () => {
    const r = compat(G, [0, 4, 7, 11], "Gmaj7", true);
    expect(r.isDiatonic).toBe(false);
    expect(r.notesOutOfScale).toHaveLength(1);
    expect(r.notesOutOfScale[0].name).toBe("F#");
    expect(r.notesOutOfScale[0].intervalLabel).toBe("7M");
    expect(r.diatonicSuggestion).toContain("G7");
    expect(r.diatonicSuggestion).toContain("b7");
  });

  test("caso 9 — E7: G# (3ª) fuera de escala", () => {
    const r = compat(E, [0, 4, 7, 10], "E7", true);
    expect(r.isDiatonic).toBe(false);
    expect(r.notesOutOfScale).toHaveLength(1);
    expect(r.notesOutOfScale[0].name).toBe("G#");
    expect(r.notesOutOfScale[0].intervalLabel).toBe("3");
  });

  test("caso 10 — A7: C# (3ª) fuera de escala", () => {
    const r = compat(A, [0, 4, 7, 10], "A7", true);
    expect(r.isDiatonic).toBe(false);
    expect(r.notesOutOfScale).toHaveLength(1);
    expect(r.notesOutOfScale[0].name).toBe("C#");
    expect(r.notesOutOfScale[0].intervalLabel).toBe("3");
  });

  test("caso 11 — F7: Eb (b7) fuera de escala; spelling correcto Eb no D#", () => {
    const r = compat(F, [0, 4, 7, 10], "F7");
    expect(r.isDiatonic).toBe(false);
    expect(r.notesOutOfScale).toHaveLength(1);
    expect(r.notesOutOfScale[0].name).toBe("Eb");
    expect(r.notesOutOfScale[0].intervalLabel).toBe("b7");
    // garantía explícita: nunca D#
    expect(r.notesOutOfScale[0].name).not.toBe("D#");
  });

  test("caso 12 — Db7: Db (1ª) y Ab (5ª) fuera de escala", () => {
    const r = compat(Db, [0, 4, 7, 10], "Db7", false);
    expect(r.isDiatonic).toBe(false);
    const names = r.notesOutOfScale.map((n) => n.name);
    expect(names).toContain("Db");
    expect(names).toContain("Ab");
    const labels = r.notesOutOfScale.map((n) => n.intervalLabel);
    expect(labels).toContain("1");
    expect(labels).toContain("5");
  });
});

// ─── 2. Clasificación como dominante ─────────────────────────────────────────

describe("isStudyDominantChord", () => {
  test("G7, E7, A7, F7, Db7 → true (calidad dom, incluyen 3M y b7)", () => {
    expect(isStudyDominantChord(PLAN_DOM7)).toBe(true);
  });

  test("Cmaj7, Gmaj7, Fmaj7 → false (calidad maj)", () => {
    expect(isStudyDominantChord(PLAN_MAJ7)).toBe(false);
  });

  test("Dm7, Am7 → false (calidad min)", () => {
    expect(isStudyDominantChord(PLAN_MIN7)).toBe(false);
  });

  test("Bm7(b5) → false (calidad hdim, no es dominante)", () => {
    expect(isStudyDominantChord(PLAN_HDIM7)).toBe(false);
  });

  test("G7/D con bassInterval → sigue siendo dominante (mismos intervalos)", () => {
    const planG7D = { ...PLAN_DOM7, bassInterval: 7 };
    expect(isStudyDominantChord(planG7D)).toBe(true);
  });
});

// ─── 3. Dominantes externos y backdoor ───────────────────────────────────────

describe("buildDominantInfo — V7 primario y secundarios", () => {
  test("V7 de C = G7", () => {
    const r = buildDominantInfo(C, false);
    expect(r.name).toBe("G7");
    expect(r.relation).toContain("V7");
    expect(r.relation).toContain("C");
  });

  test("V7 de Am (pc=9) = E7 — dominante secundario V7/Am", () => {
    const r = buildDominantInfo(A, false);
    expect(r.name).toBe("E7");
    expect(r.relation).toContain("V7");
  });

  test("V7 de Dm (pc=2) = A7 — dominante secundario V7/Dm", () => {
    const r = buildDominantInfo(D, true);
    expect(r.name).toBe("A7");
    expect(r.relation).toContain("V7");
  });
});

describe("buildBackdoorDominantInfo — bVII7 modal", () => {
  test("backdoor de C = Bb7", () => {
    const r = buildBackdoorDominantInfo(C, false);
    expect(r.name).toBe("Bb7");
    expect(r.relation).toContain("bVII7");
    expect(r.relation).toContain("C");
  });

  test("backdoor de G = F7 — F7 puede funcionar como backdoor hacia G", () => {
    const r = buildBackdoorDominantInfo(G, true);
    expect(r.name).toBe("F7");
    expect(r.relation).toContain("bVII7");
    expect(r.relation).toContain("G");
  });
});

// ─── 4. Modo estudio — caso 1: Cmaj7 en C Mayor ──────────────────────────────

describe("guide — caso 1: Cmaj7 en C Mayor (Imaj7)", () => {
  const sections = guide(C, "Cmaj7", PLAN_MAJ7, false);

  test("no emite advertencia no-diatónica", () => {
    expect(sections[0].warning).toBeNull();
  });

  test("no emite advertencia de dominante diatónico", () => {
    expect(sections[1].warning).toBeNull();
  });

  test("identifica Am7 como relativo menor", () => {
    const relItem = findItem(sections, "Relativo menor");
    expect(relItem).not.toBeNull();
    expect(relItem.derivation.some((s) => s.includes("Am7"))).toBe(true);
  });
});

// ─── 5. Modo estudio — caso 2: Dm7 en C Mayor ────────────────────────────────

describe("guide — caso 2: Dm7 en C Mayor (IIm7)", () => {
  const sections = guide(D, "Dm7", PLAN_MIN7, false);

  test("no emite advertencia no-diatónica", () => {
    expect(sections[0].warning).toBeNull();
  });

  test("no emite advertencia de dominante diatónico", () => {
    expect(sections[1].warning).toBeNull();
  });
});

// ─── 6. Modo estudio — caso 3: G7 en C Mayor (V7 diatónico) ──────────────────

describe("guide — caso 3: G7 en C Mayor (V7)", () => {
  const sections = guide(G, "G7", PLAN_DOM7, true);

  test("advierte que G7 ya es el dominante diatónico", () => {
    expect(sections[1].warning).toContain("El acorde estudiado ya cumple función dominante");
  });

  test("sustituto tritonal directo de G7 es Db7", () => {
    const tritoneItem = findItem(sections, "Sustitución tritonal");
    const derivText = tritoneItem.derivation.join(" ");
    expect(derivText).toContain("Db7");
  });

  test("II-V principal es Dm7 - G7 → Cmaj7 (escala activa)", () => {
    const iivItem = findItem(sections, "Interpolación II-V");
    const derivText = iivItem.derivation.join(" ");
    expect(derivText).toContain("Dm7 - G7");
    expect(derivText).toContain("Cmaj7");
  });

  test("Am7 - D7 → G7 aparece solo como tonicización alternativa, no como función principal", () => {
    const iivItem = findItem(sections, "Interpolación II-V");
    // La tonicización Am7-D7→G7 debe estar marcada como alternativa
    const altLine = iivItem.derivation.find((s) => s.includes("Am7"));
    expect(altLine).toBeDefined();
    expect(altLine).toContain("Tonicización alternativa");
    // No debe ser la primera línea de derivación (no es la función principal)
    expect(iivItem.derivation[0]).not.toContain("Am7");
  });

  test("upper structure principal es A mayor/G7", () => {
    const usItem = findItem(sections, "Poliacordes / Upper Structures");
    const exampleText = usItem.examples.join(" ");
    expect(exampleText).toContain("A mayor/G7");
  });
});

// ─── 7. Modo estudio — caso 4: G7/D (inversión 2ª) ──────────────────────────

describe("guide — caso 4: G7/D en C Mayor (V7, 2ª inv.)", () => {
  const planG7D = { ...PLAN_DOM7, bassInterval: 7 };
  const sections = guide(G, "G7/D", planG7D, true);

  test("sigue siendo dominante diatónico (misma advertencia que G7)", () => {
    expect(sections[1].warning).toContain("El acorde estudiado ya cumple función dominante");
  });

  test("no emite advertencia no-diatónica (inversión no saca notas de escala)", () => {
    expect(sections[0].warning).toBeNull();
  });
});

// ─── 8. Modo estudio — caso 5: Gmaj7 (no diatónico) ─────────────────────────

describe("guide — caso 5: Gmaj7 en C Mayor (no diatónico)", () => {
  const sections = guide(G, "Gmaj7", PLAN_MAJ7, true);

  test("emite advertencia no-diatónica en sección diatónica", () => {
    expect(sections[0].warning).not.toBeNull();
    expect(sections[0].warning).toContain("Gmaj7 no es diatónico en C Mayor");
  });

  test("no emite advertencia de dominante diatónico (no es dominante)", () => {
    expect(sections[1].warning).toBeNull();
  });

  test("dominante secundario hacia G es D7", () => {
    const secDomItem = findItem(sections, "Dominante secundario");
    const derivText = secDomItem.derivation.join(" ");
    expect(derivText).toContain("D7");
  });
});

// ─── 9. Modo estudio — caso 6: Fmaj7 en C Mayor ─────────────────────────────

describe("guide — caso 6: Fmaj7 en C Mayor (IVmaj7)", () => {
  const sections = guide(F, "Fmaj7", PLAN_MAJ7, false);

  test("no emite advertencias (diatónico, no dominante)", () => {
    expect(sections[0].warning).toBeNull();
    expect(sections[1].warning).toBeNull();
  });
});

// ─── 10. Modo estudio — caso 7: Am7 en C Mayor ───────────────────────────────

describe("guide — caso 7: Am7 en C Mayor (VIm7)", () => {
  const sections = guide(A, "Am7", PLAN_MIN7, false);

  test("no emite advertencias (diatónico, no dominante)", () => {
    expect(sections[0].warning).toBeNull();
    expect(sections[1].warning).toBeNull();
  });

  test("relativo mayor de Am7 es Cmaj7", () => {
    const relItem = findItem(sections, "Relativo mayor");
    expect(relItem).not.toBeNull();
    expect(relItem.derivation.some((s) => s.includes("Cmaj7"))).toBe(true);
  });
});

// ─── 11. Modo estudio — caso 8: Bm7(b5) en C Mayor ──────────────────────────

describe("guide — caso 8: Bm7(b5) en C Mayor (VIIm7b5)", () => {
  const sections = guide(B, "Bm7(b5)", PLAN_HDIM7, true);

  test("no emite advertencias (diatónico, hdim no es dominante)", () => {
    expect(sections[0].warning).toBeNull();
    expect(sections[1].warning).toBeNull();
  });
});

// ─── 12. Modo estudio — caso 9: E7 (dominante secundario hacia Am) ───────────

describe("guide — caso 9: E7 en C Mayor (no diatónico, dom secundario V7/Am)", () => {
  const sections = guide(E, "E7", PLAN_DOM7, true);

  test("emite advertencia no-diatónica", () => {
    expect(sections[0].warning).not.toBeNull();
  });

  test("NO emite advertencia de dominante diatónico (E7 no es V7 de C Mayor)", () => {
    expect(sections[1].warning).toBeNull();
  });

  test("buildDominantInfo confirma que E7 es V7 de Am (dominante secundario)", () => {
    const v7ofAm = buildDominantInfo(A, false);
    expect(v7ofAm.name).toBe("E7");
  });
});

// ─── 13. Modo estudio — caso 10: A7 (dom. secundario hacia Dm) ───────────────

describe("compat + dominante — caso 10: A7 en C Mayor", () => {
  test("no diatónico (C# fuera de escala) y es dominante", () => {
    const r = compat(A, [0, 4, 7, 10], "A7", true);
    expect(r.isDiatonic).toBe(false);
    expect(isStudyDominantChord(PLAN_DOM7)).toBe(true);
  });

  test("buildDominantInfo confirma que A7 es V7 de Dm (dominante secundario)", () => {
    const v7ofDm = buildDominantInfo(D, true);
    expect(v7ofDm.name).toBe("A7");
  });
});

// ─── 14. Modo estudio — caso 11: F7 (backdoor) ───────────────────────────────

describe("compat + backdoor — caso 11: F7 en C Mayor", () => {
  test("no diatónico: Eb (b7) fuera de escala, spelling con bemol", () => {
    const r = compat(F, [0, 4, 7, 10], "F7", false);
    expect(r.isDiatonic).toBe(false);
    const b7entry = r.notesOutOfScale.find((n) => n.intervalLabel === "b7");
    expect(b7entry?.name).toBe("Eb");
    expect(b7entry?.name).not.toBe("D#");
  });

  test("backdoor de G confirma que F7 es bVII7 → G", () => {
    const backdoor = buildBackdoorDominantInfo(G, true);
    expect(backdoor.name).toBe("F7");
    expect(backdoor.relation).toContain("bVII7");
  });
});

// ─── 15. Modo estudio — caso 12: Db7 (tritono de G7) ────────────────────────

describe("guide — caso 12: Db7 en C Mayor (sustituto tritonal de G7)", () => {
  const sections = guide(Db, "Db7", PLAN_DOM7, false);

  test("no diatónico: emite advertencia en sección diatónica", () => {
    expect(sections[0].warning).not.toBeNull();
  });

  test("Db7 es dominante (isStudyDominantChord)", () => {
    expect(isStudyDominantChord(PLAN_DOM7)).toBe(true);
  });

  test("tritone de Db7 es G7 — confirma relación de sustitución tritonal con G7", () => {
    const tritoneItem = findItem(sections, "Sustitución tritonal");
    const derivText = tritoneItem.derivation.join(" ");
    expect(derivText).toContain("G7");
  });

  test("spelling de Db7: notas Db, F, Ab, Cb (b7 como Cb, no B)", () => {
    const spec = buildStudyChordSpecFromUi({
      rootPc: Db,
      preferSharps: false,
      quality: "dom",
      structure: "tetrad",
      ext7: true,
    });
    expect(spec.notes).toContain("Db");
    expect(spec.notes).toContain("F");
    expect(spec.notes).toContain("Ab");
    expect(spec.notes).toContain("Cb");
    expect(spec.notes).not.toContain("B");
  });
});

// ─── 16. Spelling y enarmonía — invariantes globales ─────────────────────────

describe("spelling — los grados 'b' usan siempre grafía bemol", () => {
  test("b7 de F con preferSharps=true sigue siendo Eb, no D#", () => {
    const r = compat(F, [0, 4, 7, 10], "F7", true);
    const b7 = r.notesOutOfScale.find((n) => n.intervalLabel === "b7");
    expect(b7?.name).toBe("Eb");
  });

  test("b7 de Bb con preferSharps=false es Ab, no G#", () => {
    const r = analyzeChordScaleCompatibility({
      chordRootPc: 10, chordIntervals: [0, 4, 7, 10],
      activeScaleRootPc: C, scaleIntervals: C_MAJOR,
      scaleName: "Mayor", chordName: "Bb7", preferSharps: false,
    });
    const b7 = r.notesOutOfScale.find((n) => n.intervalLabel === "b7");
    expect(b7?.name).toBe("Ab");
    expect(b7?.name).not.toBe("G#");
  });

  test("b3 con preferSharps=true usa grafía bemol (Gm7 en C Mayor: Bb no A#)", () => {
    // Gm7 en C Mayor: Bb (b3, pc10) no está en C Mayor → sale con grafía bemol
    // aunque el contexto del acorde tenga preferSharps=true
    const r = analyzeChordScaleCompatibility({
      chordRootPc: G, chordIntervals: [0, 3, 7, 10], // Gm7
      activeScaleRootPc: C, scaleIntervals: C_MAJOR,
      scaleName: "Mayor", chordName: "Gm7", preferSharps: true,
    });
    const b3 = r.notesOutOfScale.find((n) => n.intervalLabel === "b3");
    expect(b3?.name).toBe("Bb");
    expect(b3?.name).not.toBe("A#");
  });
});
