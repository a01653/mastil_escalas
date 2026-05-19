import { describe, it, expect } from "vitest";
import { parseRefChord } from "./parseRefChord.js";
import { analyzeSelectedNotes } from "./chordDetectionEngine.js";
import { rankReadingsWithHarmonyContext } from "./harmonyContextRanking.js";

// ─── parseRefChord — raíz ─────────────────────────────────────────────────────

describe("parseRefChord — raíz", () => {
  it("C → rootPc=0", () => expect(parseRefChord("C").rootPc).toBe(0));
  it("D → rootPc=2", () => expect(parseRefChord("D").rootPc).toBe(2));
  it("E → rootPc=4", () => expect(parseRefChord("E").rootPc).toBe(4));
  it("F → rootPc=5", () => expect(parseRefChord("F").rootPc).toBe(5));
  it("G → rootPc=7", () => expect(parseRefChord("G").rootPc).toBe(7));
  it("A → rootPc=9", () => expect(parseRefChord("A").rootPc).toBe(9));
  it("B → rootPc=11", () => expect(parseRefChord("B").rootPc).toBe(11));

  it("Bb → rootPc=10", () => expect(parseRefChord("Bb").rootPc).toBe(10));
  it("Eb → rootPc=3",  () => expect(parseRefChord("Eb").rootPc).toBe(3));
  it("Ab → rootPc=8",  () => expect(parseRefChord("Ab").rootPc).toBe(8));
  it("Db → rootPc=1",  () => expect(parseRefChord("Db").rootPc).toBe(1));
  it("Gb → rootPc=6",  () => expect(parseRefChord("Gb").rootPc).toBe(6));

  it("F# → rootPc=6",  () => expect(parseRefChord("F#").rootPc).toBe(6));
  it("C# → rootPc=1",  () => expect(parseRefChord("C#").rootPc).toBe(1));
  it("G# → rootPc=8",  () => expect(parseRefChord("G#").rootPc).toBe(8));
});

// ─── parseRefChord — calidades ────────────────────────────────────────────────

describe("parseRefChord — calidades (sobre C)", () => {
  it('C           → "Mayor"',    () => expect(parseRefChord("C").quality).toBe("Mayor"));
  it('Cmaj        → "Mayor"',    () => expect(parseRefChord("Cmaj").quality).toBe("Mayor"));
  it('Cmaj7       → "maj7"',     () => expect(parseRefChord("Cmaj7").quality).toBe("maj7"));
  it('CM7         → "maj7"',     () => expect(parseRefChord("CM7").quality).toBe("maj7"));
  it('C7          → "7"',        () => expect(parseRefChord("C7").quality).toBe("7"));
  it('Cm          → "menor"',    () => expect(parseRefChord("Cm").quality).toBe("menor"));
  it('Cmin        → "menor"',    () => expect(parseRefChord("Cmin").quality).toBe("menor"));
  it('Cm7         → "m7"',       () => expect(parseRefChord("Cm7").quality).toBe("m7"));
  it('Cm7b5       → "m7(b5)"',   () => expect(parseRefChord("Cm7b5").quality).toBe("m7(b5)"));
  it('Cm7(b5)     → "m7(b5)"',   () => expect(parseRefChord("Cm7(b5)").quality).toBe("m7(b5)"));
  it('Cdim        → "dim"',      () => expect(parseRefChord("Cdim").quality).toBe("dim"));
  it('Cdim7       → "dim7"',     () => expect(parseRefChord("Cdim7").quality).toBe("dim7"));
  it('Csus4       → "sus4"',     () => expect(parseRefChord("Csus4").quality).toBe("sus4"));
  it('C7sus4      → "7sus4"',    () => expect(parseRefChord("C7sus4").quality).toBe("7sus4"));
});

describe("parseRefChord — alteraciones + calidad", () => {
  it("Bb7    → rootPc=10, quality='7'",    () => expect(parseRefChord("Bb7")).toEqual({ rootPc: 10, quality: "7" }));
  it("F#maj7 → rootPc=6,  quality='maj7'", () => expect(parseRefChord("F#maj7")).toEqual({ rootPc: 6, quality: "maj7" }));
  it("Eb7    → rootPc=3,  quality='7'",    () => expect(parseRefChord("Eb7")).toEqual({ rootPc: 3, quality: "7" }));
  it("D7     → rootPc=2,  quality='7'",    () => expect(parseRefChord("D7")).toEqual({ rootPc: 2, quality: "7" }));
  it("Fmaj7  → rootPc=5,  quality='maj7'", () => expect(parseRefChord("Fmaj7")).toEqual({ rootPc: 5, quality: "maj7" }));
  it("Bbm7   → rootPc=10, quality='m7'",   () => expect(parseRefChord("Bbm7")).toEqual({ rootPc: 10, quality: "m7" }));
  it("Dbmaj7 → rootPc=1,  quality='maj7'", () => expect(parseRefChord("Dbmaj7")).toEqual({ rootPc: 1, quality: "maj7" }));
});

// ─── parseRefChord — errores ──────────────────────────────────────────────────

describe("parseRefChord — errores", () => {
  it("cadena vacía lanza Error",        () => expect(() => parseRefChord("")).toThrow());
  it("null lanza Error",                () => expect(() => parseRefChord(null)).toThrow());
  it("nota inválida (X7) lanza Error",  () => expect(() => parseRefChord("X7")).toThrow(/no reconocida/));
  it("calidad inválida (C???) lanza Error", () => expect(() => parseRefChord("C???")).toThrow(/no reconocida/));
  it("calidad inválida (C9add6) lanza Error", () => expect(() => parseRefChord("C9add6")).toThrow(/no reconocida/));
});

// ─── Integración: parseRefChord + rankReadingsWithHarmonyContext ───────────────

describe("Integración parseRefChord + ranking — casos del spec", () => {
  function ranked(noteNames, bassName, refStr) {
    const readings = analyzeSelectedNotes(noteNames, bassName).readings;
    if (!refStr) return readings;
    const { rootPc, quality } = parseRefChord(refStr);
    return rankReadingsWithHarmonyContext(readings, { enabled: true, rootPc, quality });
  }

  it("x5555x sin ref → primary Cadd9/D", () => {
    const r = ranked(["D", "G", "C", "E"], "D", null);
    expect(r[0].name).toBe("Cadd9/D");
  });

  it("x5555x --ref D7 → primary D9sus4(no5)", () => {
    const r = ranked(["D", "G", "C", "E"], "D", "D7");
    expect(r[0].name).toBe("D9sus4(no5)");
  });

  it("x5555x --ref C → primary Cadd9/D (referencia sin encaje de raíz)", () => {
    const r = ranked(["D", "G", "C", "E"], "D", "C");
    expect(r[0].name).toBe("Cadd9/D");
  });

  it("1320xx --ref Fmaj7 → primary Fmaj9(no3)", () => {
    const r = ranked(["F", "C", "E", "G"], "F", "Fmaj7");
    expect(r[0].name).toBe("Fmaj9(no3)");
  });

  it("x5555x --ref F7 → NO modifica el primario (rootPc F≠D)", () => {
    const r = ranked(["D", "G", "C", "E"], "D", "F7");
    expect(r[0].name).toBe("Cadd9/D");
  });
});
