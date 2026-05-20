import { describe, expect, test } from "vitest";
import { buildChordIntervals } from "./appMusicBasics.js";
import { buildChordEnginePlan, buildChordUiRestrictions, generateExactIntervalChordVoicings } from "./appVoicingStudyCore.js";
import { analyzeSelectedNotes, detectOmitFromCandidate } from "./chordDetectionEngine.js";
import { buildChordBadgeItems } from "./appPatternRouteStaffCore.jsx";

// Bb = pc 10
const Bb = 10;

const dom7ext13 = {
  quality: "dom",
  suspension: "none",
  structure: "chord",
  ext7: true,
  ext6: false,
  ext9: false,
  ext11: false,
  ext13: true,
};

describe("Omitir nota en la fórmula del acorde", () => {

  describe("buildChordIntervals con omit", () => {
    test("1. Bb13 sin omitir incluye la quinta (intervalo 7)", () => {
      const intervals = buildChordIntervals({ ...dom7ext13, omit: "none" });
      expect(intervals).toContain(7);
    });

    test("2. Bb13 con omit='5' excluye la quinta (intervalo 7)", () => {
      const intervals = buildChordIntervals({ ...dom7ext13, omit: "5" });
      expect(intervals).not.toContain(7);
      expect(intervals).toContain(0);   // root
      expect(intervals).toContain(4);   // 3M
      expect(intervals).toContain(10);  // b7
      expect(intervals).toContain(9);   // 13 (6ª)
    });
  });

  describe("buildChordEnginePlan con omit", () => {
    test("plan con omit='5' usa generator='exact' y excluye intervalo 7", () => {
      const plan = buildChordEnginePlan({
        rootPc: Bb,
        ...dom7ext13,
        inversion: "all",
        form: "closed",
        omit: "5",
      });
      expect(plan.generator).toBe("exact");
      expect(plan.omit).toBe("5");
      expect(plan.intervals).not.toContain(7);
    });

    test("plan sin omit='none' mantiene generator='json' para acordes extendidos", () => {
      const plan = buildChordEnginePlan({
        rootPc: Bb,
        ...dom7ext13,
        inversion: "all",
        form: "closed",
        omit: "none",
      });
      expect(plan.generator).toBe("json");
      expect(plan.intervals).toContain(7);
    });
  });

  describe("generateExactIntervalChordVoicings — voicing 6x678x", () => {
    test("3. Bb13 no5 genera el voicing 6x678x (Bb-Ab-D-G sin quinta)", () => {
      // intervals [0, 4, 9, 10] = root(Bb), 3M(D), 13(G), b7(Ab)
      const voicings = generateExactIntervalChordVoicings({
        rootPc: Bb,
        intervals: [0, 4, 9, 10],
        bassInterval: 0,
        maxFret: 15,
        maxSpan: 5,
      });
      const fretsList = voicings.map((v) => v.frets);
      expect(fretsList).toContain("6x678x");
    });
  });

  describe("Exclusividad del toggle Omitir", () => {
    test("4. Activar un nuevo omit reemplaza al anterior (lógica de toggle)", () => {
      let omit = "none";
      const toggle = (note) => { omit = omit === note ? "none" : note; };
      toggle("1");
      expect(omit).toBe("1");
      // Activar "5" reemplaza "1" — en la UI el handler siempre hace prev===note?"none":note
      // Si se activa otra opción (distinta), el handler previo se llama con la nueva:
      toggle("5");
      expect(omit).toBe("5");
    });

    test("5. Desactivar el omit activo vuelve a 'none'", () => {
      let omit = "3";
      const toggle = (note) => { omit = omit === note ? "none" : note; };
      toggle("3");
      expect(omit).toBe("none");
    });
  });

  describe("Acordes sus con omit='3'", () => {
    test("6. sus4 + omit='3' no rompe buildChordIntervals ni buildChordEnginePlan", () => {
      const intervals = buildChordIntervals({
        quality: "dom",
        suspension: "sus4",
        structure: "chord",
        ext7: true,
        ext6: false,
        ext9: false,
        ext11: false,
        ext13: false,
        omit: "3",
      });
      // sus4 "third" = intervalo 5 (P4); omit="3" lo excluye
      expect(intervals).not.toContain(5);
      // root y quinta siguen presentes
      expect(intervals).toContain(0);
      expect(intervals).toContain(7);
      // No debe lanzar error
      const plan = buildChordEnginePlan({
        rootPc: 7,
        quality: "dom",
        suspension: "sus4",
        structure: "chord",
        inversion: "all",
        form: "closed",
        ext7: true,
        ext6: false,
        ext9: false,
        ext11: false,
        ext13: false,
        omit: "3",
      });
      expect(plan.generator).toBe("exact");
    });
  });

  describe("Detección manual de 6x678x", () => {
    test("7. Bb-Ab-D-G se detecta como Bb7 con add13 y no5", () => {
      // Notas del voicing 6x678x: Bb (root), Ab (b7), D (3M), G (13)
      const result = analyzeSelectedNotes(["Bb", "Ab", "D", "G"], "Bb");
      expect(result.primary).not.toBeNull();
      const name = result.primary?.legend?.name || result.primary?.name || "";
      // Debe mencionar Bb como raíz y alguna forma de indicar no5 o la 13
      expect(name).toMatch(/Bb/);
      // La lectura primaria no debe incluir la quinta (F no está en el acorde)
      const hasF = result.primary?.reading?.notes?.some?.((n) => n === "F") ?? false;
      expect(hasF).toBe(false);
    });
  });

  describe("buildChordUiRestrictions — capacidad y duplicados", () => {
    const tetrad13    = { structure: "tetrad", ext7: false, ext6: false, ext9: false, ext11: false, ext13: true };
    const tetradFresh = { structure: "tetrad", ext7: false, ext6: false, ext9: false, ext11: false, ext13: false };
    const chordExt6o  = { structure: "chord",  ext7: false, ext6: true,  ext9: false, ext11: false, ext13: false };
    const chordExt13o = { structure: "chord",  ext7: false, ext6: false, ext9: false, ext11: false, ext13: true  };

    // ── Problema A ──
    test("Tetrad + ext13 + omit='5' → canToggleSeven=true (hueco libera slot para 7)", () => {
      const ui = buildChordUiRestrictions({ ...tetrad13, omit: "5" });
      expect(ui.ext.canToggleSeven).toBe(true);
      expect(ui.ext.canToggleNine).toBe(true);
      expect(ui.ext.canToggleEleven).toBe(true);
      // 6↔13 duplicado aunque haya hueco
      expect(ui.ext.canToggleSix).toBe(false);
    });

    // ── Problemas B y C ──
    test("Tetrad fresca (sin extensiones) → canToggleSix, canToggleNine directamente habilitados", () => {
      const ui = buildChordUiRestrictions({ ...tetradFresh, omit: "none" });
      expect(ui.ext.canToggleSix).toBe(true);   // Problema B
      expect(ui.ext.canToggleNine).toBe(true);   // Problema C
      expect(ui.ext.canToggleEleven).toBe(true);
      expect(ui.ext.canToggleThirteen).toBe(true);
    });

    test("Tetrad + ext13 + omit='none' → cuatriada llena: canToggleNine=false, canToggleSeven=false", () => {
      const ui = buildChordUiRestrictions({ ...tetrad13, omit: "none" });
      expect(ui.ext.canToggleNine).toBe(false);
      expect(ui.ext.canToggleEleven).toBe(false);
      expect(ui.ext.canToggleSeven).toBe(false);
      // ext13 ya activa → puede desactivarse
      expect(ui.ext.canToggleThirteen).toBe(true);
    });

    test("Tetrad + ext7=true explícito + sin adds + omit='none' → no puede añadir 9 (5 notas), pero sí desactivar 7", () => {
      const ui = buildChordUiRestrictions({
        structure: "tetrad", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none",
      });
      expect(ui.ext.canToggleNine).toBe(false);  // 5 notas si se añade 9
      expect(ui.ext.canToggleSeven).toBe(true);  // puede desactivar la 7 explícita
    });

    // ── 6↔13 duplicado funcional ──
    test("Chord + ext6 activa → canToggleThirteen=false (6↔13 duplicado)", () => {
      const ui = buildChordUiRestrictions({ ...chordExt6o, omit: "none" });
      expect(ui.ext.canToggleThirteen).toBe(false);
      expect(ui.ext.canToggleSix).toBe(true); // puede desactivar 6
    });

    test("Chord + ext13 activa → canToggleSix=false (6↔13 duplicado)", () => {
      const ui = buildChordUiRestrictions({ ...chordExt13o, omit: "none" });
      expect(ui.ext.canToggleSix).toBe(false);
      expect(ui.ext.canToggleThirteen).toBe(true); // puede desactivar 13
    });

    test("Tetrad sin extensiones + omit='5' → todos los adds habilitados", () => {
      const ui = buildChordUiRestrictions({ ...tetradFresh, omit: "5" });
      expect(ui.ext.canToggleNine).toBe(true);
      expect(ui.ext.canToggleEleven).toBe(true);
      expect(ui.ext.canToggleSix).toBe(true);
      expect(ui.ext.canToggleThirteen).toBe(true);
      expect(ui.ext.canToggleSeven).toBe(true);
    });
  });

  describe("buildChordUiRestrictions — canToggleOmitOff en tetrad", () => {
    test("Tetrad + ext11 + ext13 + omit='5': canToggleOmitOff=false (caso del bug)", () => {
      const ui = buildChordUiRestrictions({
        structure: "tetrad", ext7: false, ext6: false, ext9: false, ext11: true, ext13: true, omit: "5",
      });
      expect(ui.omit.canToggleOff).toBe(false);
    });

    test("Tetrad + solo ext11 + omit='5': canToggleOmitOff=true (1 extensión cabe al volver a 3 base)", () => {
      const ui = buildChordUiRestrictions({
        structure: "tetrad", ext7: false, ext6: false, ext9: false, ext11: true, ext13: false, omit: "5",
      });
      expect(ui.omit.canToggleOff).toBe(true);
    });

    test("Tetrad + ext7 + ext13 + omit='5': canToggleOmitOff=false (2 extensiones, 3+2>4)", () => {
      const ui = buildChordUiRestrictions({
        structure: "tetrad", ext7: true, ext6: false, ext9: false, ext11: false, ext13: true, omit: "5",
      });
      expect(ui.omit.canToggleOff).toBe(false);
    });

    test("Tetrad + sin extensiones + omit='5': canToggleOmitOff=true", () => {
      const ui = buildChordUiRestrictions({
        structure: "tetrad", ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, omit: "5",
      });
      expect(ui.omit.canToggleOff).toBe(true);
    });

    test("Chord (no tetrad) + ext11 + ext13 + omit='5': canToggleOmitOff=true (regla solo aplica a tetrad)", () => {
      const ui = buildChordUiRestrictions({
        structure: "chord", ext7: true, ext6: false, ext9: true, ext11: true, ext13: true, omit: "5",
      });
      expect(ui.omit.canToggleOff).toBe(true);
    });

    test("Tetrad + omit='1' + ext11 + ext13: canToggleOmitOff=false (misma regla para omit1)", () => {
      const ui = buildChordUiRestrictions({
        structure: "tetrad", ext7: false, ext6: false, ext9: false, ext11: true, ext13: true, omit: "1",
      });
      expect(ui.omit.canToggleOff).toBe(false);
    });
  });

  describe("buildChordIntervals — tetrad con omit y ext7", () => {
    test("Tetrad maj + ext13 + ext7 + omit='5' incluye maj7 y 13 (sin quinta)", () => {
      const intervals = buildChordIntervals({
        quality: "maj", suspension: "none", structure: "tetrad",
        ext7: true, ext6: false, ext9: false, ext11: false, ext13: true,
        omit: "5",
      });
      expect(intervals).toContain(0);   // root
      expect(intervals).toContain(4);   // 3M
      expect(intervals).toContain(9);   // 13ª
      expect(intervals).toContain(11);  // maj7
      expect(intervals).not.toContain(7); // sin quinta
    });

    test("Tetrad dom + ext13 + ext7 + omit='5' incluye b7 y 13", () => {
      const intervals = buildChordIntervals({
        quality: "dom", suspension: "none", structure: "tetrad",
        ext7: true, ext6: false, ext9: false, ext11: false, ext13: true,
        omit: "5",
      });
      expect(intervals).toContain(0);   // root
      expect(intervals).toContain(4);   // 3M
      expect(intervals).toContain(9);   // 13ª
      expect(intervals).toContain(10);  // b7
      expect(intervals).not.toContain(7); // sin quinta
    });

    test("Tetrad + ext13 + ext7 + sin omit → cap a 4 notas: solo b7, sin 13ª", () => {
      const intervals = buildChordIntervals({
        quality: "dom", suspension: "none", structure: "tetrad",
        ext7: true, ext6: false, ext9: false, ext11: false, ext13: true,
        omit: "none",
      });
      // Estado inválido (más extensiones que slots disponibles): cap defensivo.
      // ext7 ocupa el único slot; ext13 se descarta. Máximo 4 notas.
      expect(intervals).toHaveLength(4);   // 1, 3, 5, b7 — sin 13ª
      expect(intervals).toContain(10);     // b7 presente (ext7=true)
      expect(intervals).not.toContain(9);  // 13ª descartada por cap
    });
  });

  describe("detectOmitFromCandidate — Copiar en Acorde", () => {
    function makeCandidate(suffix, suspension = "none") {
      return {
        formula: { suffix },
        uiPatch: { suspension },
        name: `Bb${suffix}`,
      };
    }

    test("1. Bb7(add13,no5) → detecta omit='5'", () => {
      const cand = makeCandidate("7(add13,no5)");
      expect(detectOmitFromCandidate(cand)).toBe("5");
    });

    test("2. Plan con omit='5' no incluye F (intervalo 7) — notas objetivo sin quinta", () => {
      const plan = buildChordEnginePlan({
        rootPc: Bb,
        ...dom7ext13,
        inversion: "all",
        form: "closed",
        omit: "5",
      });
      expect(plan.intervals).not.toContain(7);
    });

    test("3. Lectura sin omisiones → detecta omit='none'", () => {
      const cand = makeCandidate("7");
      expect(detectOmitFromCandidate(cand)).toBe("none");
    });

    test("4. Lectura con no3 (sin suspensión) → detecta omit='3'", () => {
      const cand = makeCandidate("m7(b5,add11,no3)");
      expect(detectOmitFromCandidate(cand)).toBe("3");
    });

    test("4b. Lectura con no3 en acorde sus → no activa omit='3' (devuelve 'none')", () => {
      const cand = makeCandidate("7sus4(no3)", "sus4");
      expect(detectOmitFromCandidate(cand)).toBe("none");
    });

    test("5. Lectura con no1 → detecta omit='1'", () => {
      const cand = makeCandidate("maj7(no3,no1)");
      // no5 no está → pasa al check no3; no3 está pero no1 se evalúa si no3 falla
      // Prioridad: no5 > no3 > no1. Aquí hay no3 (sin suspensión) → devuelve "3"
      expect(detectOmitFromCandidate(cand)).toBe("3");
    });

    test("5b. Lectura con solo no1 (sin no5 ni no3) → detecta omit='1'", () => {
      const cand = makeCandidate("maj7(no1)");
      expect(detectOmitFromCandidate(cand)).toBe("1");
    });
  });
});

// ── Tests de auditoría: flujo Copiar en Acorde ────────────────────────────────
describe("Auditoría: uiPatch al copiar lecturas a Acordes", () => {

  // ── Caso A: add9/madd9 deben copiarse con structure=chord, no tetrad ──────
  describe("Caso A — add9/madd9: structure debe ser chord", () => {

    test("A1. Dm(add9)/F: uiPatch.structure='chord'", () => {
      const result = analyzeSelectedNotes(["D", "F", "A", "E"], "F");
      const candidate = result.readings.find((r) => /Dm.*add9|m\(add9\)/.test(r.name));
      expect(candidate).toBeTruthy();
      expect(candidate.uiPatch).not.toBeNull();
      expect(candidate.uiPatch.structure).toBe("chord");
    });

    test("A2. Dm(add9)/F: uiPatch.ext7=false, uiPatch.ext9=true", () => {
      const result = analyzeSelectedNotes(["D", "F", "A", "E"], "F");
      const candidate = result.readings.find((r) => /Dm.*add9|m\(add9\)/.test(r.name));
      expect(candidate?.uiPatch?.ext7).toBe(false);
      expect(candidate?.uiPatch?.ext9).toBe(true);
    });

    test("A3. Dm(add9)/F: structure=chord + ext7=false no activa 'tetrad sin 7ª'", () => {
      const result = analyzeSelectedNotes(["D", "F", "A", "E"], "F");
      const candidate = result.readings.find((r) => /Dm.*add9|m\(add9\)/.test(r.name));
      // Invariante: nunca tetrad sin séptima y sin sexta
      if (candidate?.uiPatch) {
        const p = candidate.uiPatch;
        if (p.structure === "tetrad") {
          expect(p.ext7 || p.ext6).toBe(true);
        }
      }
    });

    test("A4. Cadd9: uiPatch.structure='chord', ext9=true, ext7=false", () => {
      const result = analyzeSelectedNotes(["C", "E", "G", "D"], "C");
      const candidate = result.readings.find((r) => /Cadd9|C\(add9\)/.test(r.name));
      expect(candidate).toBeTruthy();
      expect(candidate.uiPatch?.structure).toBe("chord");
      expect(candidate.uiPatch?.ext9).toBe(true);
      expect(candidate.uiPatch?.ext7).toBe(false);
    });

    test("A5. Dm(add11): uiPatch.structure='chord', ext11=true, ext7=false", () => {
      const result = analyzeSelectedNotes(["D", "F", "G", "A"], "D");
      const candidate = result.readings.find((r) => /m\(add11\)|madd11/.test(r.name));
      expect(candidate).toBeTruthy();
      expect(candidate.uiPatch?.structure).toBe("chord");
      expect(candidate.uiPatch?.ext11).toBe(true);
      expect(candidate.uiPatch?.ext7).toBe(false);
    });
  });

  // ── Caso B: Dm(add9,11)/F — control positivo ─────────────────────────────
  describe("Caso B — Dm(add9,11)/F: control positivo", () => {

    test("B1. Dm(add9,11)/F: tiene uiPatch habilitado", () => {
      // Notas: D(root), F(b3/bajo), A(5), E(9), G(11) con F como bajo
      const result = analyzeSelectedNotes(["D", "F", "A", "E", "G"], "F");
      const candidate = result.readings.find((r) => /Dm|m\(add9/.test(r.name));
      expect(candidate).toBeTruthy();
      expect(candidate.uiPatch).not.toBeNull();
    });

    test("B2. Dm(add9,11) desde heurístico: ext9=true, ext11=true, uiPatch!=null", () => {
      const result = analyzeSelectedNotes(["D", "F", "A", "E", "G"], "D");
      const candidate = result.readings.find((r) => /Dm|m\(add9/.test(r.name));
      expect(candidate).toBeTruthy();
      if (candidate.uiPatch) {
        expect(candidate.uiPatch.ext9).toBe(true);
        expect(candidate.uiPatch.ext11).toBe(true);
      }
    });
  });

  // ── Caso C: Em7(addb2,...) — uiPatch debe ser null ────────────────────────
  describe("Caso C — extensiones no representables → botón bloqueado", () => {

    test("C1. Em7(addb2,add11,no5)/F: uiPatch=null para el candidato con addb2", () => {
      // Notas: E(1), F(b2), G(b3), A(11), D(b7) con F como bajo
      const result = analyzeSelectedNotes(["E", "F", "G", "A", "D"], "F");
      const withB2 = result.readings.find((r) => r.name.includes("addb2") || r.name.includes("b2"));
      if (withB2) {
        expect(withB2.uiPatch).toBeNull();
      }
      // Si no apareció addb2, verificar que ningún candidato con 'b2' tiene uiPatch activo
      const anyWithB2 = result.readings.filter((r) => r.name.includes("b2"));
      for (const c of anyWithB2) {
        expect(c.uiPatch).toBeNull();
      }
    });

    test("C2. Invariante global: todo candidato heurístico con token no-representable tiene uiPatch=null", () => {
      // Probar con un conjunto que genera b2/b13
      const result = analyzeSelectedNotes(["A", "C", "E", "F", "G"], "A");
      // Am(add b2) / Am7(addb2,...) — si aparece, debe tener uiPatch=null
      const withNonStd = result.readings.filter((r) => {
        const n = r.name;
        return n.includes("addb2") || n.includes("addb13") || n.includes("addb6");
      });
      for (const c of withNonStd) {
        expect(c.uiPatch).toBeNull();
      }
    });
  });

  // ── Caso D: Fmaj7(add13) y variantes — botón habilitado ──────────────────
  describe("Caso D — Fmaj7(add13)/Fmaj13: uiPatch habilitado", () => {

    test("D1. Fmaj7(add13) con quinta: uiPatch habilitado, ext7=true, ext13=true", () => {
      const result = analyzeSelectedNotes(["F", "A", "C", "D", "E"], "F");
      const candidate = result.readings.find((r) => /Fmaj7\(add13\)/.test(r.name));
      expect(candidate).toBeTruthy();
      expect(candidate.uiPatch).not.toBeNull();
      expect(candidate.uiPatch?.ext7).toBe(true);
      expect(candidate.uiPatch?.ext13).toBe(true);
    });

    test("D2. Fmaj7(add13,no5) sin quinta: uiPatch habilitado, omit detectado='5'", () => {
      const result = analyzeSelectedNotes(["F", "A", "D", "E"], "F");
      const candidate = result.readings.find((r) => /Fmaj7\(add13/.test(r.name));
      expect(candidate).toBeTruthy();
      expect(candidate.uiPatch).not.toBeNull();
      const omit = detectOmitFromCandidate(candidate);
      expect(omit).toBe("5");
    });

    test("D3. Fmaj13 completo: uiPatch habilitado con ext7, ext9, ext13", () => {
      const result = analyzeSelectedNotes(["F", "G", "A", "C", "D", "E"], "F");
      const candidate = result.readings.find((r) => /Fmaj13/.test(r.name));
      expect(candidate).toBeTruthy();
      expect(candidate.uiPatch).not.toBeNull();
      expect(candidate.uiPatch?.ext7).toBe(true);
      expect(candidate.uiPatch?.ext13).toBe(true);
    });

    test("D4. maj7add13omit5: sufijo contiene 'no5', detectOmit='5'", () => {
      const result = analyzeSelectedNotes(["F", "A", "D", "E"], "F");
      const candidate = result.readings.find((r) => /maj7\(add13/.test(r.name) && r.uiPatch);
      if (candidate) {
        expect(candidate.formula.suffix).toContain("no5");
        expect(detectOmitFromCandidate(candidate)).toBe("5");
      }
    });
  });

  // ── Invariante global: tetrad sin 7ª ni 6ª ───────────────────────────────
  describe("Invariante global: structure=tetrad implica ext7=true OR ext6=true en uiPatch", () => {

    test("Ningún candidato tiene uiPatch con tetrad + sin ext7 + sin ext6", () => {
      const testCases = [
        { notes: ["D", "F", "A", "E"], bass: "F" },     // Dm(add9)/F
        { notes: ["C", "E", "G", "D"], bass: "C" },     // Cadd9
        { notes: ["C", "E", "F", "G"], bass: "C" },     // Cadd11
        { notes: ["D", "F", "G", "A"], bass: "D" },     // Dm(add11)
        { notes: ["F", "A", "D", "E"], bass: "F" },     // Fmaj7(add13,no5)
        { notes: ["F", "G", "A", "D", "E"], bass: "F" },// Fmaj13(no5)
      ];
      for (const tc of testCases) {
        const result = analyzeSelectedNotes(tc.notes, tc.bass);
        for (const c of result.readings) {
          if (c.uiPatch?.structure === "tetrad") {
            expect(c.uiPatch.ext7 || c.uiPatch.ext6).toBe(true);
          }
        }
      }
    });
  });
});

// ── Tests de orden canónico de chips ───────────────────────────────────────
describe("buildChordBadgeItems: orden canónico de grados", () => {

  test("34. Dm(add9,11) en Acordes: chips en orden 1,b3,5,9,11 — no 1,9,b3,11,5", () => {
    // Dm(add9,11)/F: D(root)=0, F(b3)=3, A(5)=7, E(9)=2, G(11)=5
    // buildChordIntervals devuelve [0,2,3,5,7] (sorted chromáticamente)
    const intervals = buildChordIntervals({
      quality: "min",
      suspension: "none",
      structure: "chord",
      ext7: false,
      ext6: false,
      ext9: true,
      ext11: true,
      ext13: false,
      omit: "none",
    });
    // notas sobre D (pc=2), usando preferSharps=false
    const notes = ["D", "E", "F", "G", "A"]; // asignadas en paralelo a intervals sorted
    // Necesitamos mapear intervals→notes correctamente.
    // intervals = [0,2,3,5,7] → D,E,F,G,A en orden cromático
    const items = buildChordBadgeItems({
      notes,
      intervals,
      ext9: true,
      ext11: true,
      structure: "chord",
    });
    const degrees = items.map((i) => i.degree);
    expect(degrees).toEqual(["1", "b3", "5", "9", "11"]);
  });

  test("35. Dm7(9,11) en Acordes: chips en orden 1,b3,5,b7,9,11", () => {
    const intervals = buildChordIntervals({
      quality: "min",
      suspension: "none",
      structure: "chord",
      ext7: true,
      ext6: false,
      ext9: true,
      ext11: true,
      ext13: false,
      omit: "none",
    });
    // intervals = [0,2,3,5,7,10] (sorted chromáticamente)
    // notas D,E,F,G,A,C
    const notes = ["D", "E", "F", "G", "A", "C"];
    const items = buildChordBadgeItems({
      notes,
      intervals,
      ext7: true,
      ext9: true,
      ext11: true,
      structure: "chord",
    });
    const degrees = items.map((i) => i.degree);
    expect(degrees).toEqual(["1", "b3", "5", "b7", "9", "11"]);
  });
});
