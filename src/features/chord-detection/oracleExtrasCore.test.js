import { describe, expect, it } from "vitest";
import { computeOracleExtras, oraclePatternFromKeys } from "./oracleExtrasCore.js";

// ── oraclePatternFromKeys ────────────────────────────────────────────────────
// Orden de strings: sIdx 0 = cuerda high-e (1ª), sIdx 5 = cuerda low-E (6ª).
// fretsLH invierte: fretsLH[5 - sIdx] → fretsLH[0] = low-E, fretsLH[5] = high-e.

describe("oraclePatternFromKeys", () => {
  it("reconstruye x02440 desde selectedKeys (voicing Asus2(#11))", () => {
    // "x02440": low-E=x, A=0, D=2, G=4, B=4, high-e=0
    // sIdx: 5=low-E(x,omit), 4=A(0), 3=D(2), 2=G(4), 1=B(4), 0=high-e(0)
    const keys = ["4:0", "3:2", "2:4", "1:4", "0:0"];
    expect(oraclePatternFromKeys(keys)).toBe("x02440");
  });

  it("reconstruye 002200 desde selectedKeys (voicing Esus4/Asus2)", () => {
    // "002200": todas las cuerdas suenan
    const keys = ["5:0", "4:0", "3:2", "2:2", "1:0", "0:0"];
    expect(oraclePatternFromKeys(keys)).toBe("002200");
  });

  it("reconstruye x42200 desde selectedKeys (voicing Aadd9/C#)", () => {
    // "x42200": low-E=x, A=4, D=2, G=2, B=0, high-e=0
    const keys = ["4:4", "3:2", "2:2", "1:0", "0:0"];
    expect(oraclePatternFromKeys(keys)).toBe("x42200");
  });

  it("sin keys devuelve xxxxxx (voicing vacío)", () => {
    expect(oraclePatternFromKeys([])).toBe("xxxxxx");
    expect(oraclePatternFromKeys(null)).toBe("xxxxxx");
  });

  it("cuerda única suena correctamente", () => {
    // sIdx=5 (low-E) fret=3
    expect(oraclePatternFromKeys(["5:3"])).toBe("3xxxxx");
  });

  it("soporta trastes > 9 (codificados en base36)", () => {
    // sIdx=0 (high-e) fret=12 → toString(36) = 'c'
    expect(oraclePatternFromKeys(["0:12"])).toBe("xxxxxc");
  });
});

// ── computeOracleExtras — deduplicación ──────────────────────────────────────

describe("computeOracleExtras — deduplicación", () => {
  // x02440: Asus2(#11) como lectura principal en app; el oráculo añade "Cuartal E"
  // que el lector no incluye con ese nombre (tiene "Cuartal mixto B").
  const KEYS_X02440 = ["4:0", "3:2", "2:4", "1:4", "0:0"];

  it("devuelve extras vacíos para selectedKeys vacíos", () => {
    const { extras, pattern } = computeOracleExtras([], []);
    expect(extras).toHaveLength(0);
    expect(pattern).toBe("xxxxxx");
  });

  it("no incluye lecturas cuyo nombre exacto ya está en appCandidates", () => {
    // Si el app candidate tiene exactamente "Asus2(#11)", el oráculo tampoco lo duplica.
    const appCands = [
      { name: "Asus2(#11)", rootPc: 9 },
      { name: "B7(add11,no5)/A", rootPc: 11 },
      { name: "Aadd9(#11,no3)", rootPc: 9 },
      { name: "Emaj7(add11,no3)/A", rootPc: 4 },
    ];
    const { extras } = computeOracleExtras(KEYS_X02440, appCands);
    const names = extras.map((e) => e.name);
    expect(names).not.toContain("Asus2(#11)");
    expect(names).not.toContain("B7(add11,no5)/A");
    expect(names).not.toContain("Aadd9(#11,no3)");
    expect(names).not.toContain("Emaj7(add11,no3)/A");
  });

  it("no incluye lecturas cuya firma rootPc+PCs coincide, aunque el nombre difiera", () => {
    // Simula un renamed: el oráculo tiene "B(add11,b7,no5)/A" y el app "B7(add11,no5)/A".
    // Misma raíz (B = pc 11) y mismo voicing → misma firma → duplicado.
    const appCands = [
      { name: "Asus2(#11)", rootPc: 9 },
      { name: "B7(add11,no5)/A", rootPc: 11 }, // misma raíz que "B(add11,b7,no5)/A" del oráculo
    ];
    const { extras } = computeOracleExtras(KEYS_X02440, appCands);
    // El candidato del oráculo con root B no debe aparecer si B=pc11 ya está en app.
    expect(extras.every((e) => e.root !== "B")).toBe(true);
  });

  it("incluye lecturas genuinamente nuevas del oráculo", () => {
    // Con app vacía, todos los candidatos del oráculo son extras.
    const { extras } = computeOracleExtras(KEYS_X02440, []);
    expect(extras.length).toBeGreaterThan(0);
  });

  it("todos los extras tienen campo groupKey válido", () => {
    const { extras } = computeOracleExtras(KEYS_X02440, []);
    const validKeys = new Set(["sin-3a", "sin-5a", "sus", "fragmentaria", "cuartal", "otras"]);
    for (const e of extras) {
      expect(validKeys.has(e.groupKey)).toBe(true);
    }
  });

  it("304030 deduplica equivalentes con raíz G y conserva la lectura canónica maj7", () => {
    const keys304030 = ["5:3", "4:0", "3:4", "2:0", "1:3", "0:0"];
    const { extras } = computeOracleExtras(keys304030, []);
    const gNames = extras.filter((e) => e.root === "G").map((e) => e.name);
    expect(gNames).toEqual(["Gmaj7(add9,add13,no3)"]);
  });

  it("034030 deduplica sus vs maj7 equivalentes y conserva Gmaj7(add11,add13,no3)/E", () => {
    const keys034030 = ["5:0", "4:3", "3:4", "2:0", "1:3", "0:0"];
    const { extras } = computeOracleExtras(keys034030, []);
    const gNames = extras.filter((e) => e.root === "G").map((e) => e.name);
    expect(gNames).toEqual(["Gmaj7(add11,add13,no3)/E"]);
  });
});

// ── computeOracleExtras — groupKey ───────────────────────────────────────────

describe("computeOracleExtras — groupKey de candidatos sintéticos", () => {
  // Usamos 002200 (Esus4/Asus2) para tener un voicing real.
  const KEYS_002200 = ["5:0", "4:0", "3:2", "2:2", "1:0", "0:0"];

  it("candidato cuartal recibe groupKey 'cuartal'", () => {
    const { extras } = computeOracleExtras(KEYS_002200, []);
    // Buscar si hay algún cuartal entre los extras.
    const quartal = extras.find((e) => e.category === "quartal");
    if (quartal) expect(quartal.groupKey).toBe("cuartal");
  });

  it("candidato fragment recibe groupKey 'fragmentaria'", () => {
    const { extras } = computeOracleExtras(KEYS_002200, []);
    const frag = extras.find((e) => e.category?.endsWith("-fragment"));
    if (frag) expect(frag.groupKey).toBe("fragmentaria");
  });
});

// ── groupKey directo con candidatos sintéticos ────────────────────────────────
// Tests de asignación pura de groupKey (sin necesidad de un voicing real).

import { computeOracleExtras as ce } from "./oracleExtrasCore.js";

// Helper: llama computeOracleExtras con un voicing real (002200) y filtra
// solo el candidato cuyo name coincide, para verificar su groupKey.
// Alternativa: testear la función interna. Como assignGroupKey es interna,
// verificamos a través de los resultados de voicings reales.

describe("groupKey — via voicing real 002200", () => {
  const KEYS = ["5:0", "4:0", "3:2", "2:2", "1:0", "0:0"];

  it("extras no vacíos tienen groupKey reconocido", () => {
    const { extras } = ce(KEYS, []);
    const validKeys = new Set(["sin-3a", "sin-5a", "sus", "fragmentaria", "cuartal", "otras"]);
    for (const e of extras) {
      expect(validKeys.has(e.groupKey), `groupKey inesperado: ${e.groupKey} en ${e.name}`).toBe(true);
    }
  });

  it("voicing x42200: extras no vacíos (oráculo detecta más que el lector)", () => {
    const KEYS_X42200 = ["4:4", "3:2", "2:2", "1:0", "0:0"];
    const { extras } = ce(KEYS_X42200, []);
    // El oráculo suele proponer más candidatos que el lector real.
    expect(extras.length).toBeGreaterThan(0);
  });
});
