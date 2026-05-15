import { describe, it, expect } from "vitest";
import { parseFretString, analyzeNotes } from "./mastilDebug.js";

// Afinación estándar LowE→HighE: E2(40) A2(45) D3(50) G3(55) B3(59) E4(64)

// ─── parseFretString ──────────────────────────────────────────────────────────

describe("parseFretString", () => {
  it("parsea formato compacto x5555x → notas D G C E, bajo D", () => {
    const { frets, midiPitches, pcs } = parseFretString("x5555x");
    expect(frets).toEqual([null, 5, 5, 5, 5, null]);
    expect(midiPitches).toEqual([null, 50, 55, 60, 64, null]);
    // PC: 50%12=2(D), 55%12=7(G), 60%12=0(C), 64%12=4(E)
    expect(pcs).toEqual([null, 2, 7, 0, 4, null]);
  });

  it("parsea formato separado por guiones x-5-5-5-5-x", () => {
    const { frets, pcs } = parseFretString("x-5-5-5-5-x");
    expect(frets).toEqual([null, 5, 5, 5, 5, null]);
    expect(pcs).toEqual([null, 2, 7, 0, 4, null]);
  });

  it("parsea formato separado por comas x,5,5,5,5,x", () => {
    const { frets } = parseFretString("x,5,5,5,5,x");
    expect(frets).toEqual([null, 5, 5, 5, 5, null]);
  });

  it("parsea formato separado por espacios 'x 5 5 5 5 x'", () => {
    const { frets } = parseFretString("x 5 5 5 5 x");
    expect(frets).toEqual([null, 5, 5, 5, 5, null]);
  });

  it("parsea C mayor abierto x32010", () => {
    const { frets, pcs } = parseFretString("x32010");
    expect(frets).toEqual([null, 3, 2, 0, 1, 0]);
    // A+3=48→PC=0(C), D+2=52→PC=4(E), G+0=55→PC=7(G), B+1=60→PC=0(C), E+0=64→PC=4(E)
    expect(pcs).toEqual([null, 0, 4, 7, 0, 4]);
  });

  it("parsea E mayor abierto 022100", () => {
    const { frets, pcs } = parseFretString("022100");
    expect(frets).toEqual([0, 2, 2, 1, 0, 0]);
    // E+0=40→4, A+2=47→11(B), D+2=52→4(E), G+1=56→8(Ab/G#), B+0=59→11(B), E+0=64→4(E)
    expect(pcs).toEqual([4, 11, 4, 8, 11, 4]);
  });

  it("parsea trastes de 2 dígitos en formato separado x-10-9-8-7-x", () => {
    const { frets, midiPitches } = parseFretString("x-10-9-8-7-x");
    expect(frets).toEqual([null, 10, 9, 8, 7, null]);
    expect(midiPitches).toEqual([null, 55, 59, 63, 66, null]);
  });

  it("lanza error si no son 6 tokens", () => {
    expect(() => parseFretString("x5555")).toThrow(/6 tokens/);
    expect(() => parseFretString("x555555x")).toThrow(/6 tokens/);
  });

  it("lanza error en token inválido", () => {
    expect(() => parseFretString("x5z55x")).toThrow(/token inválido/);
  });

  it("acepta fret 0 (cuerda al aire)", () => {
    const { frets, midiPitches } = parseFretString("000000");
    expect(frets).toEqual([0, 0, 0, 0, 0, 0]);
    expect(midiPitches).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it("todas las cuerdas silenciadas devuelve array de null", () => {
    const { frets, pcs } = parseFretString("xxxxxx");
    expect(frets).toEqual([null, null, null, null, null, null]);
    expect(pcs).toEqual([null, null, null, null, null, null]);
  });
});

// ─── analyzeNotes ─────────────────────────────────────────────────────────────

describe("analyzeNotes — bajo añadido automáticamente", () => {
  it("añade F a las notas efectivas cuando no está en la lista", () => {
    const result = analyzeNotes(["C", "E", "G"], "F");
    // El motor recibe ["F","C","E","G"] con bajo F
    // Las notas seleccionadas deben incluir F (PC=5)
    const pcs = result.selectedNotes.map((n) => n.pc);
    expect(pcs).toContain(5); // F = PC 5
  });

  it("primary es Cadd11/F cuando bajo F se añade automáticamente", () => {
    const result = analyzeNotes(["C", "E", "G"], "F");
    expect(result.primary?.name).toBe("Cadd11/F");
  });

  it("analyzeNotes(['F','C','E','G'], 'F') da el mismo primary que con bajo añadido", () => {
    const r1 = analyzeNotes(["C", "E", "G"], "F");
    const r2 = analyzeNotes(["F", "C", "E", "G"], "F");
    expect(r1.primary?.name).toBe(r2.primary?.name);
  });

  it("no duplica el bajo cuando ya está en las notas", () => {
    const result = analyzeNotes(["C", "E", "G"], "C");
    // C = PC 0; debe aparecer exactamente una vez en selectedNotes
    const cNotes = result.selectedNotes.filter((n) => n.pc === 0);
    expect(cNotes.length).toBe(1);
  });
});
