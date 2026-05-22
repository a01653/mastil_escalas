import { describe, expect, test } from "vitest";
import {
  analyzeScaleTensionsForChord,
  buildChordNamingExplanation,
  buildChordResolutionRoman,
  analyzeChordScaleCompatibility,
  actualInversionLabelFromVoicing,
  buildVoicingFromFretsLH,
  buildChordEnginePlan,
  computeInversionSelectorOptions,
  buildChordHeaderSummary,
  resolveCopiedVoicingAcrossStructures,
} from "./appVoicingStudyCore.js";
import { chordBassInterval, chordDisplayNameFromUI } from "./appMusicBasics.js";

// C Mayor scale intervals: 0 2 4 5 7 9 11
const C_MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
// G Mixolydian: 0 2 4 5 7 9 10 (G A B C D E F)
const G_MIXOLYDIAN_INTERVALS = [0, 2, 4, 5, 7, 9, 10];

describe("analyzeScaleTensionsForChord — séptimas", () => {
  test("G7 en G Mixolydio: b7 ya está en el acorde (se omite); 7M (F#) no disponible en escala", () => {
    // G7 intervals: 0(R) 4(3M) 7(5J) 10(b7) — chord has b7, so b7 is skipped entirely
    // 7M (intv 11, F#=pc6) is NOT in G mixolydian → unavailable
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 7,
      scaleIntervals: G_MIXOLYDIAN_INTERVALS,
      chordRootPc: 7,
      chordIntervals: [0, 4, 7, 10],
      preferSharps: true,
    });
    expect(result.sevenths.available).toEqual([]);
    expect(result.sevenths.unavailable).toContain("7M (F#)");
    // b7 is in the chord so it must not appear in either list
    expect(result.sevenths.available.some((s) => s.startsWith("b7"))).toBe(false);
    expect(result.sevenths.unavailable.some((s) => s.startsWith("b7"))).toBe(false);
  });

  test("Cm triad en C Mayor: b7 (Bb) no disponible, 7M (B) disponible", () => {
    // Cm = [0,3,7]. b7=Bb (pc10) not in C major → unavailable. 7M=B (pc11) in C major → available.
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 0,
      chordIntervals: [0, 3, 7],
      preferSharps: false,
    });
    expect(result.sevenths.available).toEqual(["7M (B)"]);
    expect(result.sevenths.unavailable).toEqual(["b7 (Bb)"]);
  });

  test("C triad en C Mayor: 7M (B) disponible, b7 (Bb) no disponible", () => {
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 0,
      chordIntervals: [0, 4, 7],
      preferSharps: false,
    });
    expect(result.sevenths.available).toEqual(["7M (B)"]);
    expect(result.sevenths.unavailable).toEqual(["b7 (Bb)"]);
  });

  test("Cmaj7 en C Mayor: ambas séptimas ya están en el acorde (se omiten)", () => {
    // Cmaj7 = [0,4,7,11] → 7M (intv 11) in chord → skipped. b7 (intv 10) not in chord → goes to unavailable.
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 0,
      chordIntervals: [0, 4, 7, 11],
      preferSharps: false,
    });
    // 7M is in the chord, must not appear in either list
    expect(result.sevenths.available.some((s) => s.startsWith("7M"))).toBe(false);
    // b7 (Bb) is not in chord and not in C major → unavailable
    expect(result.sevenths.unavailable).toEqual(["b7 (Bb)"]);
  });

  test("backward compatibility: available y unavailable siguen siendo tensiones superiores", () => {
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 0,
      chordIntervals: [0, 4, 7],
      preferSharps: false,
    });
    expect(result.available).toEqual(result.tensions.available);
    expect(result.unavailable).toEqual(result.tensions.unavailable);
  });
});

describe("analyzeScaleTensionsForChord — ortografía enarmónica", () => {
  test("G triad en C Mayor con preferSharps=true: b9 = Ab (no G#), b13 = Eb (no D#)", () => {
    // La regla: grados con prefijo 'b' siempre se muestran con bemol, independientemente de preferSharps
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 7,              // G
      chordIntervals: [0, 4, 7],   // G major triad
      preferSharps: true,          // contexto sostenido (Gmaj7)
    });
    // b9 de G = pc 8 = Ab/G# → debe ser Ab
    expect(result.tensions.unavailable).toContain("b9 (Ab)");
    expect(result.tensions.unavailable.some((s) => s.includes("G#"))).toBe(false);
    // b13 de G = pc 3 = Eb/D# → debe ser Eb
    expect(result.tensions.unavailable).toContain("b13 (Eb)");
    expect(result.tensions.unavailable.some((s) => s.includes("D#"))).toBe(false);
  });

  test("b7 en séptimas: siempre bemol aunque preferSharps=true", () => {
    // b7 de C = Bb (pc 10). Con preferSharps=true normalmente sería A#, pero debe ser Bb
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 0,
      chordIntervals: [0, 4, 7],   // C triad
      preferSharps: true,
    });
    expect(result.sevenths.unavailable).toContain("b7 (Bb)");
    expect(result.sevenths.unavailable.some((s) => s.includes("A#"))).toBe(false);
  });
});

describe("analyzeScaleTensionsForChord — tensiones superiores", () => {
  test("C triad en C Mayor: 9(D), 11(F), 13(A) disponibles; b9, #9, #11, b13 no disponibles", () => {
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 0,
      chordIntervals: [0, 4, 7],
      preferSharps: false,
    });
    // C triad HAS major third (intv 4), so hasNoThird = false → #9 label used, intv 4 not added
    expect(result.hasNoThird).toBe(false);
    expect(result.tensions.available).toContain("9 (D)");
    expect(result.tensions.available).toContain("11 (F)");
    expect(result.tensions.available).toContain("13 (A)");
    expect(result.tensions.unavailable).toContain("b9 (Db)");
    expect(result.tensions.unavailable).toContain("#9 (Eb)");
    expect(result.tensions.unavailable).toContain("#11 (Gb)");
    expect(result.tensions.unavailable).toContain("b13 (Ab)");
    // intv 4 must NOT appear as "3" (chord already has M3)
    expect(result.tensions.available.some((s) => /^3 /.test(s))).toBe(false);
    expect(result.tensions.unavailable.some((s) => /^3 /.test(s))).toBe(false);
  });

  test("G mixolydian: #11 no disponible para D triad", () => {
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 7,
      scaleIntervals: G_MIXOLYDIAN_INTERVALS,
      chordRootPc: 2,
      chordIntervals: [0, 4, 7],
      preferSharps: true,
    });
    expect(result.tensions.unavailable.some((s) => s.startsWith("#11"))).toBe(true);
  });
});

describe("analyzeScaleTensionsForChord — sin tercera (sus/no3)", () => {
  test("Asus2 en G Mayor: C aparece como 'b3/#9 (C)' disponible", () => {
    // Asus2 = A B E = intervals [0,2,7] desde A(pc9). No tiene 3 ni b3.
    // G Mayor desde raíz A: G A B C D E F# → pcs {7,9,11,0,2,4,6}
    // intv 3 desde A = pc 0 = C → en G Mayor → disponible como "b3/#9"
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 7,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],   // G Mayor
      chordRootPc: 9,                              // A
      chordIntervals: [0, 2, 7],                   // Asus2
      preferSharps: false,
    });
    expect(result.hasNoThird).toBe(true);
    expect(result.tensions.available).toContain("b3/#9 (C)");
  });

  test("Asus2 en G Mayor: C# (intv 4) aparece como '3 (C#)' no disponible", () => {
    // intv 4 desde A = pc 1 = C# → NO en G Mayor → no disponible como "3"
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 7,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      chordRootPc: 9,
      chordIntervals: [0, 2, 7],
      preferSharps: true,
    });
    expect(result.hasNoThird).toBe(true);
    expect(result.tensions.unavailable).toContain("3 (C#)");
  });

  test("Csus4 en C Mayor: intv 3 (Eb) como 'b3/#9', intv 4 (E) como '3 (E)' disponible", () => {
    // Csus4 = C F G = [0,5,7]. hasNoThird = true.
    // intv 3 = Eb (pc3): not in C major → unavailable as "b3/#9 (Eb)"
    // intv 4 = E (pc4): in C major → available as "3 (E)"
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 0,
      chordIntervals: [0, 5, 7],
      preferSharps: false,
    });
    expect(result.hasNoThird).toBe(true);
    expect(result.tensions.available).toContain("3 (E)");
    expect(result.tensions.unavailable).toContain("b3/#9 (Eb)");
  });

  test("acorde con b3 (menor): intv 4 no aparece en ninguna lista", () => {
    // Cm triad = [0,3,7]. hasMinorThird = true → intv 4 no se añade a candidatos.
    const result = analyzeScaleTensionsForChord({
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      chordRootPc: 0,
      chordIntervals: [0, 3, 7],
      preferSharps: false,
    });
    expect(result.hasNoThird).toBe(false);
    // intv 4 (E) must NOT appear as "3"
    expect(result.tensions.available.some((s) => /^3 /.test(s))).toBe(false);
    expect(result.tensions.unavailable.some((s) => /^3 /.test(s))).toBe(false);
    // intv 3 label must NOT be "b3/#9" (chord already has b3)
    expect(result.tensions.available.some((s) => s.startsWith("b3/#9"))).toBe(false);
    expect(result.tensions.unavailable.some((s) => s.startsWith("b3/#9"))).toBe(false);
  });
});

describe("buildChordNamingExplanation — sus2/sus4", () => {
  test("sus2: explica los tres puntos clave", () => {
    const plan = { suspension: "sus2", layer: "triad" };
    const result = buildChordNamingExplanation(plan);
    expect(result).toContain("No aparece 3ª mayor ni 3ª menor.");
    expect(result).toContain("La 2ª sustituye a la 3ª, por eso se nombra sus2.");
    expect(result).toContain("Al no tener tercera, el acorde queda armónicamente abierto.");
  });

  test("sus4: explica los tres puntos clave", () => {
    const plan = { suspension: "sus4", layer: "triad" };
    const result = buildChordNamingExplanation(plan);
    expect(result).toContain("No aparece 3ª mayor ni 3ª menor.");
    expect(result).toContain("La 4ª sustituye a la 3ª, por eso se nombra sus4.");
    expect(result).toContain("Al no tener tercera, el acorde queda armónicamente abierto.");
  });

  test("sus2: no incluye frases de calidad mayor/menor/dom", () => {
    const plan = { suspension: "sus2", layer: "triad" };
    const result = buildChordNamingExplanation(plan);
    expect(result.some((l) => l.includes("La calidad sale"))).toBe(false);
    expect(result.some((l) => l.includes("La base es mayor"))).toBe(false);
  });

  test("sus4 con b7: incluye las tres líneas sus y también menciona la séptima", () => {
    const plan = { suspension: "sus4", layer: "tetrad", ext7: true, seventhOffset: 10 };
    const result = buildChordNamingExplanation(plan);
    expect(result).toContain("No aparece 3ª mayor ni 3ª menor.");
    expect(result).toContain("La 4ª sustituye a la 3ª, por eso se nombra sus4.");
    const hasSeventh = result.some((l) => l.includes("b7") || l.includes("Incluye"));
    expect(hasSeventh).toBe(true);
  });

  test("sus2 triada simple: exactamente 3 líneas de suspensión", () => {
    const plan = { suspension: "sus2", layer: "triad" };
    const result = buildChordNamingExplanation(plan);
    const susLines = result.filter((l) =>
      l.includes("No aparece") || l.includes("sus2") || l.includes("armónicamente abierto")
    );
    expect(susLines.length).toBe(3);
  });

  test("acorde mayor normal: no incluye texto de suspensión", () => {
    const plan = { quality: "maj", layer: "triad" };
    const result = buildChordNamingExplanation(plan);
    expect(result.some((l) => l.includes("sus"))).toBe(false);
    expect(result.some((l) => l.includes("No aparece"))).toBe(false);
  });
});

describe("buildChordResolutionRoman", () => {
  test("maj con 7M → Imaj7", () => {
    const plan = { quality: "maj", intervals: [0, 4, 7, 11] };
    expect(buildChordResolutionRoman(plan)).toBe("Imaj7");
  });

  test("maj triad sin 7 → I", () => {
    const plan = { quality: "maj", intervals: [0, 4, 7] };
    expect(buildChordResolutionRoman(plan)).toBe("I");
  });

  test("dom con b7 → I7", () => {
    const plan = { quality: "dom", intervals: [0, 4, 7, 10] };
    expect(buildChordResolutionRoman(plan)).toBe("I7");
  });

  test("min con b7 → Im7", () => {
    const plan = { quality: "min", intervals: [0, 3, 7, 10] };
    expect(buildChordResolutionRoman(plan)).toBe("Im7");
  });

  test("min triad sin 7 → Im", () => {
    const plan = { quality: "min", intervals: [0, 3, 7] };
    expect(buildChordResolutionRoman(plan)).toBe("Im");
  });

  test("hdim → Im7(b5)", () => {
    const plan = { quality: "hdim", intervals: [0, 3, 6, 10] };
    expect(buildChordResolutionRoman(plan)).toBe("Im7(b5)");
  });

  test("dim con dim7 (intv 9) → Idim7", () => {
    // dim7 usa intv 9 (doble bemol 7 = 6ª mayor = 9 semitonos)
    // pero hasMin7 comprueba intv 10, que no está → Idim
    const plan = { quality: "dim", intervals: [0, 3, 6, 9] };
    expect(buildChordResolutionRoman(plan)).toBe("Idim");
  });

  test("sus2 → Isus2", () => {
    const plan = { quality: "maj", suspension: "sus2", intervals: [0, 2, 7] };
    expect(buildChordResolutionRoman(plan)).toBe("Isus2");
  });

  test("sus4 → Isus4", () => {
    const plan = { quality: "maj", suspension: "sus4", intervals: [0, 5, 7] };
    expect(buildChordResolutionRoman(plan)).toBe("Isus4");
  });

  test("null plan → I", () => {
    expect(buildChordResolutionRoman(null)).toBe("I");
  });
});

describe("analyzeChordScaleCompatibility", () => {
  test("Gmaj7 en C Mayor: F# fuera de escala, diatónico sugiere G7", () => {
    const result = analyzeChordScaleCompatibility({
      chordRootPc: 7,                    // G
      chordIntervals: [0, 4, 7, 11],     // Gmaj7
      activeScaleRootPc: 0,              // C
      scaleIntervals: C_MAJOR_INTERVALS,
      scaleName: "Mayor",
      chordName: "Gmaj7",
      preferSharps: true,
    });
    expect(result.isDiatonic).toBe(false);
    expect(result.notesInScale).toContain("G");
    expect(result.notesInScale).toContain("B");
    expect(result.notesInScale).toContain("D");
    expect(result.notesOutOfScale).toHaveLength(1);
    expect(result.notesOutOfScale[0].name).toBe("F#");
    expect(result.notesOutOfScale[0].intervalLabel).toBe("7M");
    expect(result.diatonicSuggestion).toContain("Gmaj7 no es diatónico");
    expect(result.diatonicSuggestion).toContain("G7");
    expect(result.diatonicSuggestion).toContain("b7");
  });

  test("Cmaj7 en C Mayor: completamente diatónico", () => {
    const result = analyzeChordScaleCompatibility({
      chordRootPc: 0,
      chordIntervals: [0, 4, 7, 11],     // Cmaj7
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      scaleName: "Mayor",
      chordName: "Cmaj7",
      preferSharps: false,
    });
    expect(result.isDiatonic).toBe(true);
    expect(result.notesOutOfScale).toHaveLength(0);
    expect(result.diatonicSuggestion).toBeNull();
  });

  test("D7 en C Mayor: F# fuera de escala (3ª del D7)", () => {
    const result = analyzeChordScaleCompatibility({
      chordRootPc: 2,                    // D
      chordIntervals: [0, 4, 7, 10],     // D7
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      scaleName: "Mayor",
      chordName: "D7",
      preferSharps: true,
    });
    expect(result.isDiatonic).toBe(false);
    expect(result.notesOutOfScale).toHaveLength(1);
    expect(result.notesOutOfScale[0].name).toBe("F#");
    expect(result.notesOutOfScale[0].intervalLabel).toBe("3");
  });

  test("F7 en C Mayor: Eb fuera de escala (b7 del F7)", () => {
    const result = analyzeChordScaleCompatibility({
      chordRootPc: 5,                    // F
      chordIntervals: [0, 4, 7, 10],     // F7
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      scaleName: "Mayor",
      chordName: "F7",
      preferSharps: false,
    });
    expect(result.isDiatonic).toBe(false);
    expect(result.notesOutOfScale).toHaveLength(1);
    expect(result.notesOutOfScale[0].name).toBe("Eb");
    expect(result.notesOutOfScale[0].intervalLabel).toBe("b7");
  });

  test("Am7 en C Mayor: completamente diatónico", () => {
    const result = analyzeChordScaleCompatibility({
      chordRootPc: 9,                    // A
      chordIntervals: [0, 3, 7, 10],     // Am7
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      scaleName: "Mayor",
      chordName: "Am7",
      preferSharps: false,
    });
    expect(result.isDiatonic).toBe(true);
    expect(result.notesOutOfScale).toHaveLength(0);
  });

  test("F7 con preferSharps=true: b7 de F debe ser Eb, no D#", () => {
    // Este es el caso del bug reportado: Gmaj7 usa preferSharps=true pero la b7 de F debe ser Eb
    const result = analyzeChordScaleCompatibility({
      chordRootPc: 5,                    // F
      chordIntervals: [0, 4, 7, 10],     // F7
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      scaleName: "Mayor",
      chordName: "F7",
      preferSharps: true,                // contexto de acorde con sostenidos
    });
    expect(result.notesOutOfScale[0].name).toBe("Eb");       // no D#
    expect(result.notesOutOfScale[0].intervalLabel).toBe("b7");
  });

  test("Bb7 con preferSharps=false: b7 de Bb debe ser Ab", () => {
    // Bb = pc 10, b7 de Bb = pc 10+10=20 mod 12=8 = Ab/G#
    const result = analyzeChordScaleCompatibility({
      chordRootPc: 10,                   // Bb
      chordIntervals: [0, 4, 7, 10],     // Bb7
      activeScaleRootPc: 0,
      scaleIntervals: C_MAJOR_INTERVALS,
      scaleName: "Mayor",
      chordName: "Bb7",
      preferSharps: false,
    });
    expect(result.isDiatonic).toBe(false);
    const b7Note = result.notesOutOfScale.find((n) => n.intervalLabel === "b7");
    expect(b7Note?.name).toBe("Ab");
  });
});

describe("actualInversionLabelFromVoicing — extensiones add vs inversiones reales", () => {
  const planAdd9 = buildChordEnginePlan({
    rootPc: 10, quality: "maj", suspension: "none", structure: "tetrad",
    inversion: "root", form: "open",
    ext7: false, ext6: false, ext9: true, ext11: false, ext13: false,
  });
  const planDom7 = buildChordEnginePlan({
    rootPc: 0, quality: "dom", suspension: "none", structure: "tetrad",
    inversion: "root", form: "open",
    ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
  });
  const planAdd6 = buildChordEnginePlan({
    rootPc: 0, quality: "maj", suspension: "none", structure: "tetrad",
    inversion: "root", form: "open",
    ext7: false, ext6: true, ext9: false, ext11: false, ext13: false,
  });

  test("Bbadd9/C: bajo C (9ª) → 'Bajo 9', no '3ª inversión'", () => {
    expect(actualInversionLabelFromVoicing(planAdd9, { bassPc: 0 })).toBe("Bajo 9");
  });

  test("C7/Bb: bajo Bb (b7) → '3ª inversión' correctamente", () => {
    expect(actualInversionLabelFromVoicing(planDom7, { bassPc: 10 })).toBe("3ª inversión");
  });

  test("Cadd6/A: bajo A (6ª) → 'Bajo 6', no '3ª inversión'", () => {
    expect(actualInversionLabelFromVoicing(planAdd6, { bassPc: 9 })).toBe("Bajo 6");
  });

  test("Bbadd9 fundamental → 'Fundamental'", () => {
    expect(actualInversionLabelFromVoicing(planAdd9, { bassPc: 10 })).toBe("Fundamental");
  });
});

// ---------------------------------------------------------------------------
// computeInversionSelectorOptions — etiquetas dinámicas del selector de inversión
// ---------------------------------------------------------------------------
describe("computeInversionSelectorOptions — etiquetas dinámicas del selector", () => {
  function planFor(params) {
    return buildChordEnginePlan(params);
  }

  test("Cmaj7 (cuatriada tertiana estándar): etiquetas ordinales 1ª/2ª/3ª inversión", () => {
    const plan = planFor({ rootPc: 0, quality: "maj", structure: "tetrad", ext7: true });
    const opts = computeInversionSelectorOptions(plan);
    const values = opts.map((o) => o.value);
    const labels = opts.map((o) => o.label);
    expect(values).toEqual(["root", "1", "2", "3", "all"]);
    expect(labels[1]).toBe("1ª inversión");
    expect(labels[2]).toBe("2ª inversión");
    expect(labels[3]).toBe("3ª inversión");
  });

  test("Cm (tríada): solo Fundamental, 1ª, 2ª inversión, Todas — sin 3ª", () => {
    const plan = planFor({ rootPc: 0, quality: "min", structure: "triad" });
    const opts = computeInversionSelectorOptions(plan);
    const values = opts.map((o) => o.value);
    expect(values).toEqual(["root", "1", "2", "all"]);
    expect(values).not.toContain("3");
  });

  test("Fadd11(no5): etiquetas semánticas — Fundamental, Bajo 11, Todas — sin 3ª inversión", () => {
    // F=5, ext11, omit=5 → degrees=[0,4,5] after omit → posiciones 0,1,2
    const plan = planFor({ rootPc: 5, quality: "maj", structure: "tetrad", ext11: true, omit: "5" });
    const opts = computeInversionSelectorOptions(plan);
    const values = opts.map((o) => o.value);
    const labels = opts.map((o) => o.label);
    expect(values).not.toContain("3");
    expect(labels).toContain("Bajo 11");
    expect(labels).not.toContain("3ª inversión");
    expect(labels[0]).toBe("Fundamental");
    expect(labels[labels.length - 1]).toBe("Todas");
  });

  test("Cadd9: sin omit — etiquetas semánticas incluyen Bajo 9", () => {
    const plan = planFor({ rootPc: 0, quality: "maj", structure: "tetrad", ext9: true });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).toContain("Bajo 9");
    expect(labels).not.toContain("3ª inversión");
  });

  test("C7 (dom7, tetrad estándar): etiquetas ordinales sin mezcla semántica", () => {
    const plan = planFor({ rootPc: 0, quality: "dom", structure: "tetrad", ext7: true });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels[1]).toBe("1ª inversión");
    expect(labels[2]).toBe("2ª inversión");
    expect(labels[3]).toBe("3ª inversión");
    expect(labels.some((l) => l.startsWith("Bajo"))).toBe(false);
  });

  test("Fmaj7(no5): etiquetas todas semánticas — Fundamental, Bajo 3, Bajo 7, Todas — sin '3ª inversión'", () => {
    // F=5, maj7, omit=5 → degrees=[0,4,11] después de omit → 3 posiciones
    const plan = planFor({ rootPc: 5, quality: "maj", structure: "tetrad", ext7: true, omit: "5" });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).toContain("Fundamental");
    expect(labels).toContain("Bajo 3");
    expect(labels).toContain("Bajo 7");
    expect(labels).toContain("Todas");
    expect(labels).not.toContain("3ª inversión");
    expect(labels).not.toContain("1ª inversión");
    expect(labels).not.toContain("2ª inversión");
  });

  test("Fmaj7 completo (sin omit): etiquetas ordinales — incluye '3ª inversión'", () => {
    const plan = planFor({ rootPc: 5, quality: "maj", structure: "tetrad", ext7: true });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).toContain("1ª inversión");
    expect(labels).toContain("2ª inversión");
    expect(labels).toContain("3ª inversión");
    expect(labels).not.toContain("Bajo 3");
    expect(labels).not.toContain("Bajo 7");
  });

  test("C7(no5): etiquetas semánticas — Bajo b7, no '3ª inversión'", () => {
    // dom7, omit=5 → degrees=[0,4,10] → Bajo b7 para la 7ª
    const plan = planFor({ rootPc: 0, quality: "dom", structure: "tetrad", ext7: true, omit: "5" });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).toContain("Bajo b7");
    expect(labels).not.toContain("3ª inversión");
  });

  test("Fdim con add (isNonStandard): b5 aparece como 'Bajo b5', no 'Bajo #4'", () => {
    // Fdim(add9): singleAdd=true → isNonStandard=true → fallback genérico para b5
    const plan = planFor({ rootPc: 5, quality: "dim", structure: "tetrad", ext9: true });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).not.toContain("Bajo #4");
    expect(labels).toContain("Bajo b5");
  });

  test("Fdim7 completo (sin add/omit): b5 aparece como '2ª inversión' (etiqueta ordinal correcta)", () => {
    // Fdim7 estándar: isNonStandard=false → ordinal para todos
    const plan = planFor({ rootPc: 5, quality: "dim", structure: "tetrad", ext7: true });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).toContain("2ª inversión");
    expect(labels).not.toContain("Bajo #4");
    expect(labels).not.toContain("Bajo b5");
  });

  test("null plan → devuelve CHORD_INVERSIONS de fallback", () => {
    const opts = computeInversionSelectorOptions(null);
    expect(Array.isArray(opts)).toBe(true);
    expect(opts.length).toBeGreaterThan(0);
  });

  test("Fdim7(add13,no1): sin 'Fundamental', con 'Bajo b3', 'Bajo b5', 'Bajo 13'", () => {
    // Fdim7 + ext13 + omit1: raíz omitida → 'Fundamental' no debe aparecer
    const plan = planFor({ rootPc: 5, quality: "dim", structure: "tetrad", ext7: true, ext13: true, omit: "1" });
    const opts = computeInversionSelectorOptions(plan);
    const values = opts.map((o) => o.value);
    const labels = opts.map((o) => o.label);
    expect(labels).not.toContain("Fundamental");
    expect(values).not.toContain("root");
    expect(labels).toContain("Bajo b3");
    expect(labels).toContain("Bajo b5");
    expect(labels).toContain("Bajo 13");
    expect(labels[labels.length - 1]).toBe("Todas");
  });

  test("Fdim7(add13,no1): opciones en orden correcto — b3, b5, 13, Todas", () => {
    const plan = planFor({ rootPc: 5, quality: "dim", structure: "tetrad", ext7: true, ext13: true, omit: "1" });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).toEqual(["Bajo b3", "Bajo b5", "Bajo 13", "Todas"]);
  });

  test("Fmaj7 completo (sin omit): sigue teniendo 'Fundamental' — no regresión", () => {
    const plan = planFor({ rootPc: 5, quality: "maj", structure: "tetrad", ext7: true });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels[0]).toBe("Fundamental");
  });
});

// ---------------------------------------------------------------------------
// actualInversionLabelFromVoicing — fuente única (unificada con labelForInversionBass)
// ---------------------------------------------------------------------------
describe("actualInversionLabelFromVoicing — fuente única tras unificación", () => {
  test("Fadd13: bajo D (singleAdd, bassInt=9) → 'Bajo 13', no 'Bajo 6'", () => {
    // F=5, D=pc2, bassInt=mod12(2-5)=9. singleAdd=true (ext13 sin ext7)
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "root", form: "open",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: true,
    });
    expect(actualInversionLabelFromVoicing(plan, { bassPc: 2 })).toBe("Bajo 13");
  });

  test("Fadd11,13: bajo D (multiAdd=true, bassInt=9) → 'Bajo 13', no 'Bajo 6'", () => {
    // F=5, ext11+ext13 sin ext7 → multiAdd=true; ext13 prioritario en singleAddOffset
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "root", form: "open",
      ext7: false, ext6: false, ext9: false, ext11: true, ext13: true,
    });
    expect(actualInversionLabelFromVoicing(plan, { bassPc: 2 })).toBe("Bajo 13");
  });

  test("Fdim(add9): bajo Cb/B (bassInt=6, isNonStandard) → 'Bajo b5', no '2ª inversión'", () => {
    // F=5, Cb/B=pc11, bassInt=mod12(11-5)=6. singleAdd=true (ext9 sin ext7)
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "dim", suspension: "none", structure: "tetrad",
      inversion: "root", form: "open",
      ext7: false, ext6: false, ext9: true, ext11: false, ext13: false,
    });
    expect(actualInversionLabelFromVoicing(plan, { bassPc: 11 })).toBe("Bajo b5");
  });

  test("Fmaj7 completo (estándar): bajo E (bassInt=11) → '3ª inversión'", () => {
    // F=5, E=pc4, bassInt=mod12(4-5)=11. isNonStandard=false → ordinal
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "root", form: "open",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
    });
    expect(actualInversionLabelFromVoicing(plan, { bassPc: 4 })).toBe("3ª inversión");
  });

  test("Fmaj7(no5): bajo E (bassInt=11, omit=5) → 'Bajo 7'", () => {
    // omit=5 → isNonStandard=true → ordinal desactivado → genérico: 'Bajo 7'
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "root", form: "open",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "5",
    });
    expect(actualInversionLabelFromVoicing(plan, { bassPc: 4 })).toBe("Bajo 7");
  });
});

// ── chordBassInterval — coherencia con computeInversionSelectorOptions ────────

describe("chordBassInterval — consistencia con selector (omit1 y triad+add)", () => {
  // Bug resuelto: omit1 desplazaba el índice posicional (degrees[1]=fifth en vez de degrees[0]=third)

  test("Fmaj(no1): inversion='1' → bajo 3ª (interval=4), no 5ª", () => {
    // Con omit1, el primer no-raíz es el tercero. Antes retornaba degrees[1]=fifth.
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "triad",
      inversion: "1", omit: "1",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false,
    })).toBe(4);
  });

  test("Fmaj(no1): inversion='2' → bajo 5ª (interval=7), no 3ª", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "triad",
      inversion: "2", omit: "1",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false,
    })).toBe(7);
  });

  test("Fmaj7(no1): inversion='1' → bajo 3ª (interval=4)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "1", omit: "1",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
    })).toBe(4);
  });

  test("Fmaj7(no1): inversion='3' → bajo 7ª (interval=11)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "3", omit: "1",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
    })).toBe(11);
  });

  test("Fdim7(add13,no1): inversion='1' → bajo b3 (interval=3)", () => {
    expect(chordBassInterval({ quality: "dim", suspension: "none", structure: "tetrad",
      inversion: "1", omit: "1",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: true,
    })).toBe(3);
  });

  test("Fdim7(add13,no1): inversion='3' → bajo dim7/13 (interval=9)", () => {
    expect(chordBassInterval({ quality: "dim", suspension: "none", structure: "tetrad",
      inversion: "3", omit: "1",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: true,
    })).toBe(9);
  });

  // Bug resuelto: structure="triad" con add no incluía el grado add
  test("F(add6) triad: inversion='3' → bajo 6ª (interval=9), no 5ª", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "triad",
      inversion: "3", omit: "none",
      ext7: false, ext6: true, ext9: false, ext11: false, ext13: false,
    })).toBe(9);
  });

  test("F(add9) triad: inversion='3' → bajo 9ª (interval=2), no 5ª", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "triad",
      inversion: "3", omit: "none",
      ext7: false, ext6: false, ext9: true, ext11: false, ext13: false,
    })).toBe(2);
  });

  test("F(add13) chord: inversion='3' → bajo 13ª (interval=9)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "chord",
      inversion: "3", omit: "none",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: true,
    })).toBe(9);
  });

  // Sin regresión para acordes estándar (sin omit, con 7ª)
  test("Fmaj7 (sin omit): inversion='1' → bajo 3ª (interval=4)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "1", omit: "none",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
    })).toBe(4);
  });

  test("Fmaj7 (sin omit): inversion='3' → bajo 7ª (interval=11)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "3", omit: "none",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
    })).toBe(11);
  });

  test("Fdim7 (sin omit): inversion='2' → bajo b5 (interval=6)", () => {
    expect(chordBassInterval({ quality: "dim", suspension: "none", structure: "tetrad",
      inversion: "2", omit: "none",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
    })).toBe(6);
  });
});

// ── chordDisplayNameFromUI — dim + add sin 7ª ─────────────────────────────────
describe("chordDisplayNameFromUI — dim+add sin séptima conserva calidad", () => {
  const base = { rootPc: 5, preferSharps: false, omit: "none", suspension: "none" };
  const exts = (ext9, ext11, ext13) => ({ ext7: false, ext6: false, ext9, ext11, ext13 });

  test("Fdim(add9) structure=tetrad: nombre correcto", () => {
    expect(chordDisplayNameFromUI({ ...base, quality: "dim", structure: "tetrad", ...exts(true,false,false) }))
      .toBe("Fdim(add9)");
  });
  test("Fdim(add11) structure=tetrad: nombre correcto", () => {
    expect(chordDisplayNameFromUI({ ...base, quality: "dim", structure: "tetrad", ...exts(false,true,false) }))
      .toBe("Fdim(add11)");
  });
  test("Fdim(add13) structure=tetrad: nombre correcto", () => {
    expect(chordDisplayNameFromUI({ ...base, quality: "dim", structure: "tetrad", ...exts(false,false,true) }))
      .toBe("Fdim(add13)");
  });
  test("Fdim(add9) structure=chord: nombre correcto", () => {
    expect(chordDisplayNameFromUI({ ...base, quality: "dim", structure: "chord", ...exts(true,false,false) }))
      .toBe("Fdim(add9)");
  });
  test("Fdim7 (con ext7) no cambia: 'Fdim7'", () => {
    expect(chordDisplayNameFromUI({ ...base, quality: "dim", structure: "tetrad", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false }))
      .toBe("Fdim7");
  });
});

// ── buildChordHeaderSummary — etiqueta funcional cuando no hay voicing ─────────
describe("buildChordHeaderSummary — etiqueta funcional para acorde no-estándar sin voicing", () => {
  test("Fdim(add9) inv=2 sin voicing: summary contiene 'Bajo b5', no '2ª inversión'", () => {
    const plan = buildChordEnginePlan({ rootPc: 5, quality: "dim", suspension: "none", structure: "tetrad",
      inversion: "2", form: "closed",
      ext7: false, ext6: false, ext9: true, ext11: false, ext13: false, omit: "none",
    });
    const summary = buildChordHeaderSummary({ name: "Fdim(add9)", plan, voicing: null, positionForm: "closed" });
    expect(summary).toContain("Bajo b5");
    expect(summary).not.toContain("2ª inversión");
  });

  test("Fmaj7(no5) inv=1 sin voicing: summary contiene 'Bajo 3', no '1ª inversión'", () => {
    const plan = buildChordEnginePlan({ rootPc: 5, quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "1", form: "closed",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "5",
    });
    const summary = buildChordHeaderSummary({ name: "Fmaj7(no5)", plan, voicing: null, positionForm: "closed" });
    expect(summary).toContain("Bajo 3");
    expect(summary).not.toContain("1ª inversión");
  });

  test("Fmaj7 (estándar) inv=1 sin voicing: summary contiene '1ª inversión' (ordinal correcto)", () => {
    const plan = buildChordEnginePlan({ rootPc: 5, quality: "maj", suspension: "none", structure: "tetrad",
      inversion: "1", form: "closed",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none",
    });
    const summary = buildChordHeaderSummary({ name: "Fmaj7", plan, voicing: null, positionForm: "closed" });
    expect(summary).toContain("1ª inversión");
  });

  test("Asus2 con voicing x0220x: el sufijo del voicing queda al final del summary", () => {
    const plan = buildChordEnginePlan({ rootPc: 9, quality: "maj", suspension: "sus2", structure: "triad",
      inversion: "all", form: "open",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none",
    });
    const voicing = buildVoicingFromFretsLH({ fretsLH: [null, 0, 2, 2, 0, null], rootPc: 9, maxFret: 15 });
    const summary = buildChordHeaderSummary({ name: "Asus2", plan, voicing, positionForm: "open" });
    expect(summary).toContain("(x0220x)");
    expect(summary.endsWith("(x0220x)")).toBe(true);
  });
});

// ── buildChordEnginePlan — flag insufficientNotes ────────────────────────────
describe("buildChordEnginePlan — insufficientNotes detecta < 3 notas tras omit", () => {
  const base = { quality: "maj", suspension: "none", form: "closed", inversion: "root" };

  test("F(no1) chord sin ext: insufficientNotes=true, generator=none", () => {
    const plan = buildChordEnginePlan({ ...base, rootPc: 5, structure: "chord",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, omit: "1" });
    expect(plan.insufficientNotes).toBe(true);
    expect(plan.generator).toBe("none");
    expect(plan.intervals.length).toBeLessThan(3);
  });

  test("F(no3) chord sin ext: insufficientNotes=true", () => {
    const plan = buildChordEnginePlan({ ...base, rootPc: 5, structure: "chord",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, omit: "3" });
    expect(plan.insufficientNotes).toBe(true);
  });

  test("F(no5) chord sin ext: insufficientNotes=true", () => {
    const plan = buildChordEnginePlan({ ...base, rootPc: 5, structure: "chord",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, omit: "5" });
    expect(plan.insufficientNotes).toBe(true);
  });

  test("Fadd13(no1) chord: 3 notas → insufficientNotes=false, generator=exact", () => {
    const plan = buildChordEnginePlan({ ...base, rootPc: 5, structure: "chord",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: true, omit: "1" });
    expect(plan.insufficientNotes).toBe(false);
    expect(plan.generator).toBe("exact");
    expect(plan.intervals.length).toBeGreaterThanOrEqual(3);
  });

  test("Fmaj7(no5) chord: 3 notas → insufficientNotes=false", () => {
    const plan = buildChordEnginePlan({ ...base, rootPc: 5, structure: "chord",
      ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "5" });
    expect(plan.insufficientNotes).toBe(false);
    expect(plan.intervals.length).toBeGreaterThanOrEqual(3);
  });

  test("F sin omit: insufficientNotes=false siempre", () => {
    const plan = buildChordEnginePlan({ ...base, rootPc: 5, structure: "chord",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none" });
    expect(plan.insufficientNotes).toBe(false);
  });
});

// ── computeInversionSelectorOptions — multiAdd expone todas las extensiones ──
describe("computeInversionSelectorOptions — multiAdd expone todas las extensiones add", () => {
  test("Fadd9,11: selector incluye 'Bajo 9' Y 'Bajo 11' en posiciones 3 y 4", () => {
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "maj", suspension: "none", structure: "chord",
      inversion: "root", form: "closed",
      ext7: false, ext6: false, ext9: true, ext11: true, ext13: false,
    });
    const opts = computeInversionSelectorOptions(plan);
    const values = opts.map((o) => o.value);
    const labels = opts.map((o) => o.label);
    expect(values).toContain("4");
    expect(labels).toContain("Bajo 9");
    expect(labels).toContain("Bajo 11");
    expect(labels).not.toContain("3ª inversión");
    expect(labels[labels.length - 1]).toBe("Todas");
  });

  test("Fadd9,11: orden correcto — root, Bajo 3, Bajo 5, Bajo 9, Bajo 11, Todas", () => {
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "maj", suspension: "none", structure: "chord",
      inversion: "root", form: "closed",
      ext7: false, ext6: false, ext9: true, ext11: true, ext13: false,
    });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).toEqual(["Fundamental", "Bajo 3", "Bajo 5", "Bajo 9", "Bajo 11", "Todas"]);
  });

  test("Fadd9,11,13: selector incluye posiciones 1-5 con etiquetas semánticas", () => {
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "maj", suspension: "none", structure: "chord",
      inversion: "root", form: "closed",
      ext7: false, ext6: false, ext9: true, ext11: true, ext13: true,
    });
    const opts = computeInversionSelectorOptions(plan);
    const values = opts.map((o) => o.value);
    const labels = opts.map((o) => o.label);
    expect(values).toContain("5");
    expect(labels).toEqual(["Fundamental", "Bajo 3", "Bajo 5", "Bajo 9", "Bajo 11", "Bajo 13", "Todas"]);
  });

  test("Fm(add9,13): selector incluye 'Bajo 9' y 'Bajo 13'", () => {
    const plan = buildChordEnginePlan({
      rootPc: 5, quality: "min", suspension: "none", structure: "chord",
      inversion: "root", form: "closed",
      ext7: false, ext6: false, ext9: true, ext11: false, ext13: true,
    });
    const opts = computeInversionSelectorOptions(plan);
    const labels = opts.map((o) => o.label);
    expect(labels).toContain("Bajo 9");
    expect(labels).toContain("Bajo 13");
  });
});

// ── chordBassInterval — posiciones 4 y 5 para multiAdd ───────────────────────
describe("chordBassInterval — posiciones 4 y 5 en acordes multiAdd", () => {
  test("Fadd9,11: inversion='3' → bajo 9ª (interval=2)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "chord",
      inversion: "3", omit: "none",
      ext7: false, ext6: false, ext9: true, ext11: true, ext13: false,
    })).toBe(2);
  });

  test("Fadd9,11: inversion='4' → bajo 11ª (interval=5)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "chord",
      inversion: "4", omit: "none",
      ext7: false, ext6: false, ext9: true, ext11: true, ext13: false,
    })).toBe(5);
  });

  test("Fadd9,11,13: inversion='4' → bajo 11ª (interval=5)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "chord",
      inversion: "4", omit: "none",
      ext7: false, ext6: false, ext9: true, ext11: true, ext13: true,
    })).toBe(5);
  });

  test("Fadd9,11,13: inversion='5' → bajo 13ª (interval=9)", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "chord",
      inversion: "5", omit: "none",
      ext7: false, ext6: false, ext9: true, ext11: true, ext13: true,
    })).toBe(9);
  });

  test("Fadd9 (singleAdd): inversion='3' → sigue retornando bajo 9ª (interval=2) — sin regresión", () => {
    expect(chordBassInterval({ quality: "maj", suspension: "none", structure: "chord",
      inversion: "3", omit: "none",
      ext7: false, ext6: false, ext9: true, ext11: false, ext13: false,
    })).toBe(2);
  });
});

describe("resolveCopiedVoicingAcrossStructures", () => {
  test("Asus2 x0220x: desde Triada con cuerdas al aire activas resuelve el voicing real en Acorde", () => {
    const manualVoicing = buildVoicingFromFretsLH({
      fretsLH: [null, 0, 2, 2, 0, null],
      rootPc: 9,
      maxFret: 15,
    });

    const resolved = resolveCopiedVoicingAcrossStructures({
      voicing: manualVoicing,
      rootPc: 9,
      quality: "maj",
      suspension: "sus2",
      structure: "triad",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
      omit: "none",
      form: "open",
      allowOpenStrings: true,
      maxFret: 15,
      maxSpan: 4,
    });

    expect(resolved.structure).toBe("chord");
    expect(resolved.voicing?.frets).toBe("x0220x");
    expect(resolved.analysis.relIntervals).toEqual([0, 2, 7]);
    expect(resolved.analysis.hasOpenStrings).toBe(true);
    expect(resolved.analysis.soundingStringsCount).toBe(4);
    expect(resolved.analysis.hasExtensions).toBe(false);
    expect(resolved.compatibleWithCurrentFilters).toBe(false);
    expect(resolved.matchesRequestedStructure).toBe(false);
    expect(resolved.requiresStructureChange).toBe(true);
    expect(resolved.requiresOpenStrings).toBe(false);
  });

  test("Asus2 x0220x: en Acorde con cuerdas al aire activas se resuelve como voicing normal", () => {
    const manualVoicing = buildVoicingFromFretsLH({
      fretsLH: [null, 0, 2, 2, 0, null],
      rootPc: 9,
      maxFret: 15,
    });

    const resolved = resolveCopiedVoicingAcrossStructures({
      voicing: manualVoicing,
      rootPc: 9,
      quality: "maj",
      suspension: "sus2",
      structure: "chord",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
      omit: "none",
      form: "open",
      allowOpenStrings: true,
      maxFret: 15,
      maxSpan: 4,
    });

    expect(resolved.structure).toBe("chord");
    expect(resolved.voicing?.frets).toBe("x0220x");
    expect(resolved.compatibleWithCurrentFilters).toBe(true);
    expect(resolved.matchesRequestedStructure).toBe(true);
    expect(resolved.requiresStructureChange).toBe(false);
    expect(resolved.requiresOpenStrings).toBe(false);
  });

  test("Asus2 002200 y x0220x: el catálogo real resuelve ambos patrones como voicings de Acorde", () => {
    const catalogVoicings = [{ frets: "002200" }, { frets: "x0220x" }];

    const voicing002200 = buildVoicingFromFretsLH({
      fretsLH: [0, 0, 2, 2, 0, 0],
      rootPc: 9,
      maxFret: 15,
    });
    const resolved002200 = resolveCopiedVoicingAcrossStructures({
      voicing: voicing002200,
      rootPc: 9,
      quality: "maj",
      suspension: "sus2",
      structure: "triad",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
      omit: "none",
      form: "open",
      allowOpenStrings: false,
      maxFret: 15,
      maxSpan: 4,
      catalogVoicings,
    });

    expect(resolved002200.structure).toBe("chord");
    expect(resolved002200.voicing?.frets).toBe("002200");
    expect(resolved002200.analysis.hasOpenStrings).toBe(true);
    expect(resolved002200.analysis.soundingStringsCount).toBe(6);
    expect(resolved002200.compatibleWithCurrentFilters).toBe(false);
    expect(resolved002200.matchesRequestedStructure).toBe(false);
    expect(resolved002200.requiresStructureChange).toBe(true);
    expect(resolved002200.requiresOpenStrings).toBe(true);

    const voicingX0220x = buildVoicingFromFretsLH({
      fretsLH: [null, 0, 2, 2, 0, null],
      rootPc: 9,
      maxFret: 15,
    });
    const resolvedX0220x = resolveCopiedVoicingAcrossStructures({
      voicing: voicingX0220x,
      rootPc: 9,
      quality: "maj",
      suspension: "sus2",
      structure: "triad",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
      omit: "none",
      form: "open",
      allowOpenStrings: false,
      maxFret: 15,
      maxSpan: 4,
      catalogVoicings,
    });

    expect(resolvedX0220x.structure).toBe("chord");
    expect(resolvedX0220x.voicing?.frets).toBe("x0220x");
    expect(resolvedX0220x.analysis.hasOpenStrings).toBe(true);
    expect(resolvedX0220x.analysis.soundingStringsCount).toBe(4);
    expect(resolvedX0220x.compatibleWithCurrentFilters).toBe(false);
    expect(resolvedX0220x.matchesRequestedStructure).toBe(false);
    expect(resolvedX0220x.requiresStructureChange).toBe(true);
    expect(resolvedX0220x.requiresOpenStrings).toBe(true);
  });
});
