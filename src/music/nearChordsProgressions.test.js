import { describe, test, expect } from "vitest";
import {
  NEAR_CHORDS_PROGRESSIONS,
  NEAR_CHORDS_STYLES,
  DEFAULT_NEAR_PROGRESSION_ID,
  DEFAULT_NEAR_PROGRESSION_STYLE_ID,
  findNearProgression,
  getStyleById,
  getProgressionsForStyle,
  getProgressionParallelLabel,
  resolveProgressionDegrees,
} from "./nearChordsProgressions.js";

// C=0, D=2, E=4, F=5, G=7, A=9, B=11
// Bb=10, Ab=8, Eb=3, F#=6

const VALID_QUALITIES = ["maj", "min", "dom", "hdim", "dim", "aug"];
const VALID_STRUCTURES = ["triad", "tetrad"];
const VALID_MODES = ["major", "minor"];
const STYLE_IDS = NEAR_CHORDS_STYLES.map((s) => s.id).filter((id) => id !== "all");

describe("nearChordsProgressions — catálogo", () => {
  test("todos los ids son únicos", () => {
    const ids = NEAR_CHORDS_PROGRESSIONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("todas las progresiones tienen al menos 3 grados", () => {
    for (const p of NEAR_CHORDS_PROGRESSIONS) {
      expect(p.degrees.length, `${p.id}: degrees length`).toBeGreaterThanOrEqual(3);
    }
  });

  test("progresiones de 3 acordes tienen campo substitute con calidad válida", () => {
    for (const p of NEAR_CHORDS_PROGRESSIONS) {
      if (p.degrees.length === 3) {
        expect(p.substitute, `${p.id}: missing substitute`).toBeDefined();
        expect(p.substitute.semitones).toBeGreaterThanOrEqual(0);
        expect(VALID_QUALITIES, `${p.id}: invalid substitute quality`).toContain(p.substitute.quality);
      }
    }
  });

  test("cada grado tiene quality, semitones, ext7 y structure válidos", () => {
    for (const p of NEAR_CHORDS_PROGRESSIONS) {
      for (const deg of p.degrees) {
        expect(VALID_QUALITIES, `${p.id}: quality`).toContain(deg.quality);
        expect(typeof deg.semitones).toBe("number");
        expect(typeof deg.ext7).toBe("boolean");
        expect(VALID_STRUCTURES, `${p.id}: structure`).toContain(deg.structure);
      }
    }
  });

  test("cada progresión tiene campo mode válido", () => {
    for (const p of NEAR_CHORDS_PROGRESSIONS) {
      expect(VALID_MODES, `${p.id}: mode`).toContain(p.mode);
    }
  });

  test("cada progresión tiene un estilo válido", () => {
    for (const p of NEAR_CHORDS_PROGRESSIONS) {
      expect(STYLE_IDS, `${p.id}: invalid style "${p.style}"`).toContain(p.style);
    }
  });

  test("DEFAULT_NEAR_PROGRESSION_ID existe en el catálogo", () => {
    expect(findNearProgression(DEFAULT_NEAR_PROGRESSION_ID)).not.toBeNull();
  });

  test("DEFAULT_NEAR_PROGRESSION_STYLE_ID es 'all'", () => {
    expect(DEFAULT_NEAR_PROGRESSION_STYLE_ID).toBe("all");
  });

  test("findNearProgression devuelve null para id desconocido", () => {
    expect(findNearProgression("unknown-id")).toBeNull();
  });
});

describe("NEAR_CHORDS_STYLES", () => {
  test("contiene los estilos esperados", () => {
    const ids = NEAR_CHORDS_STYLES.map((s) => s.id);
    for (const expected of ["all", "pop", "rock", "jazz", "blues", "soul", "funk",
      "folk", "cinematic", "flamenco", "modal", "gospel", "latin", "metal"]) {
      expect(ids).toContain(expected);
    }
  });

  test("getStyleById retorna el estilo correcto", () => {
    expect(getStyleById("jazz")?.label).toBe("Jazz");
    expect(getStyleById("pop")?.label).toBe("Pop");
    expect(getStyleById("unknown")).toBeNull();
  });

  test("cada estilo tiene colorClass", () => {
    for (const s of NEAR_CHORDS_STYLES) {
      expect(s.colorClass, `${s.id}: missing colorClass`).toBeTruthy();
    }
  });
});

describe("getProgressionsForStyle", () => {
  test("'all' devuelve todas las progresiones", () => {
    expect(getProgressionsForStyle("all").length).toBe(NEAR_CHORDS_PROGRESSIONS.length);
  });

  test("filtra correctamente por estilo jazz", () => {
    const jazz = getProgressionsForStyle("jazz");
    expect(jazz.length).toBeGreaterThan(0);
    expect(jazz.every((p) => p.style === "jazz")).toBe(true);
  });

  test("filtra correctamente por estilo pop", () => {
    const pop = getProgressionsForStyle("pop");
    expect(pop.length).toBeGreaterThan(0);
    expect(pop.every((p) => p.style === "pop")).toBe(true);
  });
});

describe("resolveProgressionDegrees — C mayor (tonicPc=0, preferSharps=false)", () => {
  const tonicPc = 0;
  const preferSharps = false;

  test("I-V-vi-IV → C G Am F (triadas)", () => {
    const patches = resolveProgressionDegrees("I-V-vi-IV", tonicPc, preferSharps);
    expect(patches).toHaveLength(4);
    expect(patches[0]).toMatchObject({ rootPc: 0, quality: "maj", ext7: false, structure: "triad" });
    expect(patches[1]).toMatchObject({ rootPc: 7, quality: "maj", ext7: false, structure: "triad" });
    expect(patches[2]).toMatchObject({ rootPc: 9, quality: "min", ext7: false, structure: "triad" });
    expect(patches[3]).toMatchObject({ rootPc: 5, quality: "maj", ext7: false, structure: "triad" });
  });

  test("I-ii-IV-V → C Dm F G", () => {
    const patches = resolveProgressionDegrees("I-ii-IV-V", tonicPc, preferSharps);
    expect(patches[0]).toMatchObject({ rootPc: 0, quality: "maj" });
    expect(patches[1]).toMatchObject({ rootPc: 2, quality: "min" });
    expect(patches[2]).toMatchObject({ rootPc: 5, quality: "maj" });
    expect(patches[3]).toMatchObject({ rootPc: 7, quality: "maj" });
  });

  test("vi-IV-I-V → Am F C G", () => {
    const patches = resolveProgressionDegrees("vi-IV-I-V", tonicPc, preferSharps);
    expect(patches[0]).toMatchObject({ rootPc: 9, quality: "min" });
    expect(patches[1]).toMatchObject({ rootPc: 5, quality: "maj" });
    expect(patches[2]).toMatchObject({ rootPc: 0, quality: "maj" });
    expect(patches[3]).toMatchObject({ rootPc: 7, quality: "maj" });
  });

  test("I-bVII-IV-I → C Bb F C", () => {
    const patches = resolveProgressionDegrees("I-bVII-IV-I", tonicPc, preferSharps);
    expect(patches[0]).toMatchObject({ rootPc: 0,  quality: "maj" });
    expect(patches[1]).toMatchObject({ rootPc: 10, quality: "maj" });
    expect(patches[2]).toMatchObject({ rootPc: 5,  quality: "maj" });
    expect(patches[3]).toMatchObject({ rootPc: 0,  quality: "maj" });
  });

  test("I-IV-V (3 acordes) → C F G + sustituto vi (Am)", () => {
    const patches = resolveProgressionDegrees("I-IV-V", tonicPc, preferSharps);
    expect(patches).toHaveLength(4);
    expect(patches[0]).toMatchObject({ rootPc: 0, quality: "maj" });
    expect(patches[1]).toMatchObject({ rootPc: 5, quality: "maj" });
    expect(patches[2]).toMatchObject({ rootPc: 7, quality: "maj" });
    expect(patches[3]).toMatchObject({ rootPc: 9, quality: "min" });
  });

  test("ii7-V7-Imaj7 → Dm7 G7 Cmaj7 + VI7 sustituto", () => {
    const patches = resolveProgressionDegrees("ii7-V7-Imaj7", tonicPc, preferSharps);
    expect(patches).toHaveLength(4);
    expect(patches[0]).toMatchObject({ rootPc: 2, quality: "min",  ext7: true, structure: "tetrad" }); // Dm7
    expect(patches[1]).toMatchObject({ rootPc: 7, quality: "dom",  ext7: true, structure: "tetrad" }); // G7
    expect(patches[2]).toMatchObject({ rootPc: 0, quality: "maj",  ext7: true, structure: "tetrad" }); // Cmaj7
    expect(patches[3]).toMatchObject({ rootPc: 9, quality: "dom",  ext7: true, structure: "tetrad" }); // A7 (VI7 substitute)
  });

  test("iiø7-V7-i7 (jazz menor) → Dm7b5 G7 Cm7 + bVImaj7 sustituto", () => {
    const patches = resolveProgressionDegrees("iiø7-V7-i7", tonicPc, preferSharps);
    expect(patches[0]).toMatchObject({ rootPc: 2, quality: "hdim", ext7: true, structure: "tetrad" }); // Dm7b5
    expect(patches[1]).toMatchObject({ rootPc: 7, quality: "dom",  ext7: true, structure: "tetrad" }); // G7
    expect(patches[2]).toMatchObject({ rootPc: 0, quality: "min",  ext7: true, structure: "tetrad" }); // Cm7
    expect(patches[3]).toMatchObject({ rootPc: 8, quality: "maj",  ext7: true, structure: "tetrad" }); // Abmaj7
  });
});

describe("resolveProgressionDegrees — F mayor (tonicPc=5)", () => {
  const tonicPc = 5;

  test("I-V-vi-IV → F C Dm Bb", () => {
    const patches = resolveProgressionDegrees("I-V-vi-IV", tonicPc, false);
    expect(patches[0]).toMatchObject({ rootPc: 5,  quality: "maj" }); // F
    expect(patches[1]).toMatchObject({ rootPc: 0,  quality: "maj" }); // C  (5+7=12→0)
    expect(patches[2]).toMatchObject({ rootPc: 2,  quality: "min" }); // Dm (5+9=14→2)
    expect(patches[3]).toMatchObject({ rootPc: 10, quality: "maj" }); // Bb (5+5=10)
  });
});

describe("resolveProgressionDegrees — A menor (tonicPc=9)", () => {
  const tonicPc = 9;

  test("i-bVI-bVII (3 acordes) → Am F G + sustituto i (Am)", () => {
    const patches = resolveProgressionDegrees("i-bVI-bVII", tonicPc, false);
    expect(patches[0]).toMatchObject({ rootPc: 9, quality: "min" }); // Am
    expect(patches[1]).toMatchObject({ rootPc: 5, quality: "maj" }); // F  (9+8=17→5)
    expect(patches[2]).toMatchObject({ rootPc: 7, quality: "maj" }); // G  (9+10=19→7)
    expect(patches[3]).toMatchObject({ rootPc: 9, quality: "min" }); // Am (i substitute)
  });

  test("i-iv-v-i → Am Dm Em Am", () => {
    const patches = resolveProgressionDegrees("i-iv-v-i", tonicPc, false);
    expect(patches[0]).toMatchObject({ rootPc: 9, quality: "min" }); // Am
    expect(patches[1]).toMatchObject({ rootPc: 2, quality: "min" }); // Dm (9+5=14→2)
    expect(patches[2]).toMatchObject({ rootPc: 4, quality: "min" }); // Em (9+7=16→4)
    expect(patches[3]).toMatchObject({ rootPc: 9, quality: "min" }); // Am
  });

  test("i-bVII-bVI-bVII → Am G F G (rock menor)", () => {
    const patches = resolveProgressionDegrees("i-bVII-bVI-bVII", tonicPc, false);
    expect(patches[0]).toMatchObject({ rootPc: 9, quality: "min" });
    expect(patches[1]).toMatchObject({ rootPc: 7, quality: "maj" }); // G  (9+10=19→7)
    expect(patches[2]).toMatchObject({ rootPc: 5, quality: "maj" }); // F  (9+8=17→5)
    expect(patches[3]).toMatchObject({ rootPc: 7, quality: "maj" }); // G
  });

  test("i-bVII-bVI-V (cadencia andaluza) → Am G F E (V mayor)", () => {
    const patches = resolveProgressionDegrees("i-bVII-bVI-V", tonicPc, false);
    expect(patches[0]).toMatchObject({ rootPc: 9, quality: "min" }); // Am
    expect(patches[1]).toMatchObject({ rootPc: 7, quality: "maj" }); // G  (bVII)
    expect(patches[2]).toMatchObject({ rootPc: 5, quality: "maj" }); // F  (bVI)
    expect(patches[3]).toMatchObject({ rootPc: 4, quality: "maj" }); // E  (V mayor — 9+7=16→4)
  });
});

describe("resolveProgressionDegrees — Blues (tonicPc=9, A mayor)", () => {
  test("I7-IV7-I7-V7 → A7 D7 A7 E7 (todos dominantes)", () => {
    const patches = resolveProgressionDegrees("I7-IV7-I7-V7", 9, false);
    expect(patches[0]).toMatchObject({ rootPc: 9, quality: "dom", ext7: true, structure: "tetrad" }); // A7
    expect(patches[1]).toMatchObject({ rootPc: 2, quality: "dom", ext7: true, structure: "tetrad" }); // D7 (9+5=14→2)
    expect(patches[2]).toMatchObject({ rootPc: 9, quality: "dom", ext7: true, structure: "tetrad" }); // A7
    expect(patches[3]).toMatchObject({ rootPc: 4, quality: "dom", ext7: true, structure: "tetrad" }); // E7 (9+7=16→4)
  });
});

describe("getProgressionParallelLabel", () => {
  test("progresión menor sobre escala Mayor → devuelve etiqueta 'usa F menor paralelo'", () => {
    expect(getProgressionParallelLabel("iiø7-V7-i7", "Mayor", "F")).toBe("usa F menor paralelo");
  });

  test("progresión mayor sobre escala Mayor → null (sin préstamo)", () => {
    expect(getProgressionParallelLabel("I-V-vi-IV", "Mayor", "C")).toBeNull();
  });

  test("progresión menor sobre escala Menor natural → null (mismo modo)", () => {
    expect(getProgressionParallelLabel("i-bVII-bVI-V", "Menor natural", "A")).toBeNull();
  });

  test("progresión mayor sobre escala Menor natural → devuelve etiqueta 'usa A mayor paralelo'", () => {
    expect(getProgressionParallelLabel("I-V-vi-IV", "Menor natural", "A")).toBe("usa A mayor paralelo");
  });

  test("Jazz menor sobre escala Mayor con tónica Bb → 'usa Bb menor paralelo'", () => {
    expect(getProgressionParallelLabel("iiø7-V7-i7-VImaj7", "Mayor", "Bb")).toBe("usa Bb menor paralelo");
  });

  test("progresión menor sobre escala Dórico → null (Dórico es familia menor)", () => {
    expect(getProgressionParallelLabel("i-IV-i-IV", "Dórico", "D")).toBeNull();
  });

  test("id desconocido → null", () => {
    expect(getProgressionParallelLabel("unknown-id", "Mayor", "C")).toBeNull();
  });
});

describe("resolveProgressionDegrees — patches tienen los campos requeridos", () => {
  test("cada patch tiene todos los campos de slot requeridos", () => {
    const patches = resolveProgressionDegrees("I-V-vi-IV", 0, false);
    const required = [
      "rootPc", "quality", "suspension", "structure", "inversion",
      "form", "positionForm", "ext7", "ext6", "ext9", "ext11", "ext13",
      "spellPreferSharps",
    ];
    for (const patch of patches) {
      for (const field of required) {
        expect(patch).toHaveProperty(field);
      }
    }
  });

  test("resolveProgressionDegrees devuelve null para id desconocido", () => {
    expect(resolveProgressionDegrees("unknown", 0, false)).toBeNull();
  });
});
