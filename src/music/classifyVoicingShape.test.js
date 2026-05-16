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
