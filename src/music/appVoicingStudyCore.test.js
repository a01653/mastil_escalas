import { describe, expect, test } from "vitest";
import {
  analyzeScaleTensionsForChord,
  buildChordNamingExplanation,
  buildChordResolutionRoman,
  analyzeChordScaleCompatibility,
} from "./appVoicingStudyCore.js";

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
