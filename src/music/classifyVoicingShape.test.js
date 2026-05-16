import { describe, expect, test } from "vitest";
import { classifyManualVoicingShape } from "./appVoicingStudyCore.js";

// OPEN_MIDI: [64, 59, 55, 50, 45, 40] (sIdx 0=HighE .. 5=LowE)
// pitchAt(sIdx, fret) = OPEN_MIDI[sIdx] + fret

function note(sIdx, fret, pc) {
  return { sIdx, fret, pc };
}

// Builds a minimal manualVoicing-like object (only .notes is used by classifyManualVoicingShape)
function voicing(notes) {
  return { notes };
}

// Builds a minimal detectedChord-like object (only .formula.intervals and .rootPc are used)
function chord(rootPc, intervals) {
  return { rootPc, formula: { intervals } };
}

describe("classifyManualVoicingShape — Drop 2 Set 1", () => {
  // "xx2211" on guitar: D=fret2(E), G=fret2(A), B=fret1(C), HighE=fret1(F)
  // Pitches: 52(E), 57(A), 60(C), 65(F) → relActual [0,5,8,13]
  // Fmaj7 (t=4,f=7,s=11): drop2 inv3 → [11,16,19,24] → rel [0,5,8,13] ✓
  test("xx2211 → Fmaj7/E (3ª inv) → Drop 2 Set 1", () => {
    const v = voicing([
      note(3, 2, 4),  // D string fret 2 = E (pc 4), midi 52
      note(2, 2, 9),  // G string fret 2 = A (pc 9), midi 57
      note(1, 1, 0),  // B string fret 1 = C (pc 0), midi 60
      note(0, 1, 5),  // HighE string fret 1 = F (pc 5), midi 65
    ]);
    const c = chord(5, [0, 4, 7, 11]); // Fmaj7: root=F(5), intervals [R,3M,5J,7M]
    expect(classifyManualVoicingShape(v, c)).toBe("drop2_set1");
  });

  // "xx3433" on guitar: D=fret3(F), G=fret4(B), B=fret3(D), HighE=fret3(G)
  // Pitches: 53(F), 59(B), 62(D), 67(G) → relActual [0,6,9,14]
  // G7 (t=4,f=7,s=10): drop2 inv3 → [10,16,19,24] → rel [0,6,9,14] ✓
  test("xx3433 → G7/F (3ª inv) → Drop 2 Set 1", () => {
    const v = voicing([
      note(3, 3, 5),  // D string fret 3 = F (pc 5), midi 53
      note(2, 4, 11), // G string fret 4 = B (pc 11), midi 59
      note(1, 3, 2),  // B string fret 3 = D (pc 2), midi 62
      note(0, 3, 7),  // HighE string fret 3 = G (pc 7), midi 67
    ]);
    const c = chord(7, [0, 4, 7, 10]); // G7: root=G(7), intervals [R,3M,5J,b7]
    expect(classifyManualVoicingShape(v, c)).toBe("drop2_set1");
  });
});

describe("classifyManualVoicingShape — close position (no drop)", () => {
  // Fmaj7 close root position: F(53), A(57), C(60), E(64) on strings 3,2,1,0
  // relActual [0,4,7,11] = close root → no drop form
  test("Fmaj7 close root position → null (Abierto/Cerrado handled externally)", () => {
    const v = voicing([
      note(3, 3, 5),  // D string fret 3 = F (pc 5), midi 53
      note(2, 2, 9),  // G string fret 2 = A (pc 9), midi 57
      note(1, 1, 0),  // B string fret 1 = C (pc 0), midi 60
      note(0, 0, 4),  // HighE fret 0 = E (pc 4), midi 64
    ]);
    const c = chord(5, [0, 4, 7, 11]); // Fmaj7
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });
});

describe("classifyManualVoicingShape — ambiguous / non-standard", () => {
  // Voicing using non-standard string set (e.g., strings 0,1,2,4 — skipping 3)
  // Pitch pattern may match a drop but string set doesn't match any known set → null
  test("4-note voicing on non-standard strings → null", () => {
    // Strings 0,1,2,4: HighE, B, G, A — doesn't match any DROP_SET_STRINGS entry
    const v = voicing([
      note(4, 0, 9),  // A string open = A, midi 45
      note(2, 2, 9),  // G string fret 2 = A, midi 57
      note(1, 2, 1),  // B string fret 2 = C#, midi 61
      note(0, 1, 5),  // HighE fret 1 = F, midi 65
    ]);
    const c = chord(5, [0, 4, 7, 11]); // Fmaj7
    // Pitch pattern [0,12,16,20] doesn't match any standard drop pattern either
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });

  // Triad (3 notes) → null (drop classification only for tetrads)
  test("3-note voicing (triad) → null", () => {
    const v = voicing([
      note(3, 3, 5), // F
      note(2, 2, 9), // A
      note(1, 1, 0), // C
    ]);
    const c = chord(5, [0, 4, 7]); // Fmaj triad
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });

  // Missing formula → null
  test("detected chord with no formula → null", () => {
    const v = voicing([
      note(3, 2, 4), note(2, 2, 9), note(1, 1, 0), note(0, 1, 5),
    ]);
    expect(classifyManualVoicingShape(v, { rootPc: 5 })).toBeNull();
    expect(classifyManualVoicingShape(v, null)).toBeNull();
    expect(classifyManualVoicingShape(null, { rootPc: 5, formula: { intervals: [0,4,7,11] } })).toBeNull();
  });
});

describe("classifyManualVoicingShape — Drop 2 root position (Set 1)", () => {
  // Fmaj7 drop2 root position: voices from low to high = 1-5-7-3 = F,C,E,A
  // getDropAbsoluteOrder t=4,f=7,s=11,drop2,root = [0,f,s,12+t] = [0,7,11,16]
  // relExp [0,7,11,16]. Pitches: F(53), C(60), E(64), A(69) on strings 3,2,1,0
  test("Fmaj7 drop2 root position → Drop 2 Set 1", () => {
    const v = voicing([
      note(3, 3, 5),  // D fret3 = F (pc5), midi 53
      note(2, 5, 0),  // G fret5 = C (pc0), midi 60
      note(1, 5, 4),  // B fret5 = E (pc4), midi 64
      note(0, 5, 9),  // HighE fret5 = A (pc9), midi 69
    ]);
    const c = chord(5, [0, 4, 7, 11]);
    expect(classifyManualVoicingShape(v, c)).toBe("drop2_set1");
  });
});

// ─── Batería final de falsos positivos ────────────────────────────────────────
// Casos 1-6 verifican que voicings parecidos a Drop no se clasifiquen como Drop.
// Casos 7-8: confirmación de regresión — ver los describe "Drop 2 Set 1" arriba
//   (xx2211 → Fmaj7/E y xx3433 → G7/F deben seguir dando "drop2_set1").

describe("classifyManualVoicingShape — falsos positivos (batería final)", () => {

  // Caso 1: pc duplicada — F aparece en dos octavas distintas (mismo pc, ≠ pitch)
  // Pitches: F(53), A(57), C(60), F(65) → relActual [0,4,7,12]
  // Ningún drop pattern de Fmaj7 genera [0,4,7,12]
  test("caso 1: nota duplicada (F en octavas 53 y 65) en Fmaj7 → null", () => {
    const v = voicing([
      note(3, 3, 5),  // D fret3 = F (pc5), midi 53
      note(2, 2, 9),  // G fret2 = A (pc9), midi 57
      note(1, 1, 0),  // B fret1 = C (pc0), midi 60
      note(0, 1, 5),  // HighE fret1 = F (pc5), midi 65 — pc5 duplicada
    ]);
    const c = chord(5, [0, 4, 7, 11]); // Fmaj7
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });

  // Caso 2: cuerda al aire — Low E (sIdx=5) al aire como bajo, span de 20 st
  // Pitches: E(40), F(53), A(57), C(60) → relActual [0,13,17,20]
  // Span imposible para un drop estándar de 4 voces contiguas
  test("caso 2: Low E al aire como bajo de Fmaj7 (span 20 st) → null", () => {
    const v = voicing([
      note(5, 0, 4),  // LowE al aire = E (pc4), midi 40
      note(3, 3, 5),  // D fret3 = F (pc5), midi 53
      note(2, 2, 9),  // G fret2 = A (pc9), midi 57
      note(1, 1, 0),  // B fret1 = C (pc0), midi 60
    ]);
    const c = chord(5, [0, 4, 7, 11]); // Fmaj7
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });

  // Caso 3: voicing de 5 notas → null por longitud ≠ 4
  test("caso 3: voicing de 5 notas → null", () => {
    const v = voicing([
      note(5, 1, 5),  // LowE fret1 = F (pc5),  midi 41
      note(4, 3, 0),  // A fret3   = C (pc0),  midi 48
      note(3, 2, 4),  // D fret2   = E (pc4),  midi 52
      note(2, 2, 9),  // G fret2   = A (pc9),  midi 57
      note(1, 1, 0),  // B fret1   = C (pc0),  midi 60
    ]);
    const c = chord(5, [0, 4, 7, 11]); // Fmaj7
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });

  // Caso 4: bajo alterado un semitono — F# en lugar de F en el G7/F (xx3433)
  // Pitches: F#(54), B(59), D(62), G(67) → relActual [0,5,8,13]
  // [0,5,8,13] es el drop2-inv3 de Fmaj7, pero el chord es G7; ningún drop de G7 coincide
  test("caso 4: bajo F# (≠F) en voicing similar a G7 Drop 2 inv3 → null", () => {
    const v = voicing([
      note(3, 4, 6),  // D fret4 = F# (pc6), midi 54
      note(2, 4, 11), // G fret4 = B  (pc11), midi 59
      note(1, 3, 2),  // B fret3 = D  (pc2),  midi 62
      note(0, 3, 7),  // HighE fret3 = G (pc7), midi 67
    ]);
    const c = chord(7, [0, 4, 7, 10]); // G7
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });

  // Caso 5: voicing cuartal puro (cuartas perfectas de 5 st) en Set 1 con Fmaj7
  // Pitches: F(53), Bb(58), Eb(63), Ab(68) → relActual [0,5,10,15]
  // Ningún drop pattern de Fmaj7 genera [0,5,10,15]
  test("caso 5: voicing cuartal F-Bb-Eb-Ab en Set 1 con Fmaj7 → null", () => {
    const v = voicing([
      note(3, 3, 5),  // D fret3   = F  (pc5),  midi 53
      note(2, 3, 10), // G fret3   = Bb (pc10), midi 58
      note(1, 4, 3),  // B fret4   = Eb (pc3),  midi 63
      note(0, 4, 8),  // HighE fret4 = Ab (pc8), midi 68
    ]);
    const c = chord(5, [0, 4, 7, 11]); // Fmaj7
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });

  // Caso 6: fórmula de 5 intervalos (extensión add11) → null por intervals.length ≠ 4
  // El voicing es físicamente el mismo que el Drop 2 Set 1 de G7, pero el chord
  // detectado incluye una 5ª voz (add11), lo cual descarta la clasificación drop
  test("caso 6: chord G7add11 (5 intervalos) con voicing igual a xx3433 → null", () => {
    const v = voicing([
      note(3, 3, 5),  // D fret3 = F  (pc5),  midi 53
      note(2, 4, 11), // G fret4 = B  (pc11), midi 59
      note(1, 3, 2),  // B fret3 = D  (pc2),  midi 62
      note(0, 3, 7),  // HighE fret3 = G (pc7), midi 67
    ]);
    const c = chord(7, [0, 4, 7, 10, 5]); // G7add11: 5 intervalos → función retorna null
    expect(classifyManualVoicingShape(v, c)).toBeNull();
  });
});
