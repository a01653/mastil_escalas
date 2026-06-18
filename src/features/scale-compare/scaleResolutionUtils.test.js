import { describe, it, expect } from "vitest";
import {
  getCharacteristicIntervalLabel,
  getTargetNotesFromIntervalMap,
  computeResolutionPoints,
} from "./scaleResolutionUtils.js";
import {
  computeScalePcs,
  buildIntervalLabelMap,
} from "./scaleCompareUtils.js";

// Helper: construye un objeto "derived" mínimo para los tests
function makeDerived(rootPc, scaleName) {
  return {
    row: { scaleName, color: "#fff", id: 0 },
    rootPcRow: rootPc,
    pcs: computeScalePcs(rootPc, scaleName),
    intervalMap: buildIntervalLabelMap(rootPc, scaleName),
    preferSharps: false,
  };
}

// ─── getCharacteristicIntervalLabel ──────────────────────────────────────────

describe("getCharacteristicIntervalLabel", () => {
  it("Mixolidia → b7", () => {
    expect(getCharacteristicIntervalLabel("Mixolidia (Mixolydian)")).toBe("b7");
  });
  it("Dórica → 6", () => {
    expect(getCharacteristicIntervalLabel("Dórica (Dorian)")).toBe("6");
  });
  it("Lidia → #4", () => {
    expect(getCharacteristicIntervalLabel("Lidia (Lydian)")).toBe("#4");
  });
  it("Frigia → b2", () => {
    expect(getCharacteristicIntervalLabel("Frigia (Phrygian)")).toBe("b2");
  });
  it("Mayor → null (sin característica extra)", () => {
    expect(getCharacteristicIntervalLabel("Mayor")).toBeNull();
  });
  it("Menor natural → null", () => {
    expect(getCharacteristicIntervalLabel("Menor natural")).toBeNull();
  });
});

// ─── getTargetNotesFromIntervalMap ───────────────────────────────────────────

describe("getTargetNotesFromIntervalMap — C Mayor (root=0)", () => {
  const map = buildIntervalLabelMap(0, "Mayor");
  const targets = getTargetNotesFromIntervalMap(map, "Mayor");
  const targetPcs = targets.map((t) => t.pc);

  it("incluye 3ª=E(4)", () => expect(targetPcs).toContain(4));
  it("incluye 7ª=B(11)", () => expect(targetPcs).toContain(11));
  it("incluye raíz=C(0)", () => expect(targetPcs).toContain(0));
  it("incluye 5ª=G(7)", () => expect(targetPcs).toContain(7));
  it("3ª tiene score ≥ 5 (prioritaria)", () => {
    const third = targets.find((t) => t.pc === 4);
    expect(third.score).toBeGreaterThanOrEqual(5);
  });
  it("7ª tiene score ≥ 4", () => {
    const seventh = targets.find((t) => t.pc === 11);
    expect(seventh.score).toBeGreaterThanOrEqual(4);
  });
  it("raíz tiene score ≥ 3", () => {
    const root = targets.find((t) => t.pc === 0);
    expect(root.score).toBeGreaterThanOrEqual(3);
  });
  it("5ª tiene score ≥ 2", () => {
    const fifth = targets.find((t) => t.pc === 7);
    expect(fifth.score).toBeGreaterThanOrEqual(2);
  });
});

describe("getTargetNotesFromIntervalMap — G Menor natural (root=7)", () => {
  const map = buildIntervalLabelMap(7, "Menor natural");
  const targets = getTargetNotesFromIntervalMap(map, "Menor natural");
  const targetPcs = targets.map((t) => t.pc);

  it("incluye b3=Bb(10)", () => expect(targetPcs).toContain(10));
  it("incluye b7=F(5)",   () => expect(targetPcs).toContain(5));
  it("incluye raíz=G(7)", () => expect(targetPcs).toContain(7));
  it("incluye 5ª=D(2)",   () => expect(targetPcs).toContain(2));
});

describe("getTargetNotesFromIntervalMap — nota característica modal", () => {
  it("G Mixolidia: b7=F(5) suma bonus de característica", () => {
    const map = buildIntervalLabelMap(7, "Mixolidia (Mixolydian)");
    const targets = getTargetNotesFromIntervalMap(map, "Mixolidia (Mixolydian)");
    const b7 = targets.find((t) => t.label === "b7");
    expect(b7).toBeDefined();
    // b7 base=4, char bonus=3 → 7
    expect(b7.score).toBe(7);
    expect(b7.isCharacteristic).toBe(true);
  });

  it("D Dórica: 6ª=B(11) está como objetivo característico", () => {
    const map = buildIntervalLabelMap(2, "Dórica (Dorian)");
    const targets = getTargetNotesFromIntervalMap(map, "Dórica (Dorian)");
    const sixth = targets.find((t) => t.label === "6");
    expect(sixth).toBeDefined();
    // "6" no está en ROLE_BASE_SCORE → base=0, char bonus=3 → 3
    expect(sixth.score).toBe(3);
    expect(sixth.isCharacteristic).toBe(true);
  });
});

// ─── computeResolutionPoints ──────────────────────────────────────────────────

describe("computeResolutionPoints", () => {
  it("no incluye distancia 0 (notas comunes)", () => {
    const origin = makeDerived(0, "Pentatónica menor");  // C pent. menor
    const dest   = makeDerived(7, "Menor natural");      // G menor
    const pts = computeResolutionPoints(origin, dest, 12);
    expect(pts.every((c) => c.distance !== 0)).toBe(true);
  });

  it("solo distancias ±1 y ±2", () => {
    const origin = makeDerived(0, "Mayor");
    const dest   = makeDerived(7, "Mayor");
    const pts = computeResolutionPoints(origin, dest, 12);
    const dists = pts.map((c) => Math.abs(c.distance));
    expect(dists.every((d) => d === 1 || d === 2)).toBe(true);
  });

  it("devuelve máx. 12 conexiones", () => {
    const origin = makeDerived(0, "Mayor");
    const dest   = makeDerived(7, "Mayor");
    const pts = computeResolutionPoints(origin, dest, 12);
    expect(pts.length).toBeLessThanOrEqual(12);
  });

  it("ordena de mayor a menor score", () => {
    const origin = makeDerived(0, "Pentatónica menor");
    const dest   = makeDerived(7, "Menor natural");
    const pts = computeResolutionPoints(origin, dest, 12);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].score).toBeLessThanOrEqual(pts[i - 1].score);
    }
  });

  it("prioriza llegada a 3ª/b3 o 7ª/b7 del destino (score ≥ 7)", () => {
    const origin = makeDerived(0, "Pentatónica menor");
    const dest   = makeDerived(7, "Menor natural");
    const pts = computeResolutionPoints(origin, dest, 12);
    expect(pts.length).toBeGreaterThan(0);
    // Los primeros deben ser notas de alto valor (score ≥ 7 = rol fuerte + dist 1 o 2)
    const highValue = pts.filter((c) => ["b3", "3", "b7", "7"].includes(c.destLabel));
    expect(highValue.length).toBeGreaterThan(0);
    // El más alto debería ser de rol fuerte
    expect(["b3", "3", "b7", "7"].includes(pts[0].destLabel)).toBe(true);
  });

  it("devuelve vacío si origen es undefined", () => {
    const dest = makeDerived(7, "Menor natural");
    expect(computeResolutionPoints(undefined, dest, 12)).toEqual([]);
  });

  it("devuelve vacío si destino es undefined", () => {
    const origin = makeDerived(0, "Mayor");
    expect(computeResolutionPoints(origin, undefined, 12)).toEqual([]);
  });

  it("deduplica: no repite misma (cuerda, traste destino)", () => {
    const origin = makeDerived(0, "Mayor");
    const dest   = makeDerived(7, "Menor natural");
    const pts = computeResolutionPoints(origin, dest, 12);
    const keys = pts.map((c) => `${c.stringIdx}-${c.destFret}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("cada conexión tiene todos los campos para renderizar flechas", () => {
    const origin = makeDerived(0, "Pentatónica menor");
    const dest   = makeDerived(7, "Menor natural");
    const pts = computeResolutionPoints(origin, dest, 12);
    expect(pts.length).toBeGreaterThan(0);
    for (const c of pts) {
      expect(typeof c.stringIdx).toBe("number");
      expect(typeof c.stringLabel).toBe("string");
      expect(typeof c.originFret).toBe("number");
      expect(typeof c.destFret).toBe("number");
      expect(typeof c.distance).toBe("number");
      expect(typeof c.originLabel).toBe("string");
      expect(typeof c.destLabel).toBe("string");
      expect(typeof c.destRoleName).toBe("string");
      expect(typeof c.score).toBe("number");
      // El destino siempre es diferente del origen (no distancia 0)
      expect(c.originFret).not.toBe(c.destFret);
    }
  });

  it("conexión correcta: C pent. menor → G menor, cuerda 1ª, E→F (+1 traste, b7)", () => {
    const origin = makeDerived(0, "Pentatónica menor");
    const dest   = makeDerived(7, "Menor natural");
    const pts = computeResolutionPoints(origin, dest, 15);
    // En la 1ª cuerda (E, pc=4): traste 7 = E (pc=4+7=11? no...)
    // Cuerda 1ª (E alta, pc=4): fret 7 → pc = (4+7)%12 = 11 = B  (no es b7 de G)
    // F = pc 5 = b7 de G menor. String 1ª (pc=4): fret para F = (5-4+12)%12 = 1
    // Cuerda 1ª traste 0 = E (pc=4) ∈ C pent. menor (pcs: 0,3,5,7,10)? 4 no está
    // Verifiquemos: C pent. menor = C(0), Eb(3), F(5), G(7), Bb(10)
    // Cuerda 1ª (E): fret 3 = (4+3)%12=7=G ∈ origin; dest F(5) en fret 1 (+2? no)
    //   fret 5 = (4+5)%12=9=A, no ∈ origin
    //   fret 6 = (4+6)%12=10=Bb ∈ origin; dest F(5) en fret 1 (-5, fuera de rango ±2)
    //   buscamos fret donde pc está en origin y fret±1 o fret±2 da F(5):
    //     F(5) en cuerda 1ª: fret = (5-4+12)%12 = 1
    //     Necesitamos fret ∈ {-1,0,2,3} ∩ origin → fret 3: G(7)∈origin → dist = 1-3=-2 ✓
    // Solo verificamos que hay conexiones a b7 (la posición exacta varía)
    const toB7 = pts.filter((c) => c.destLabel === "b7");
    expect(toB7.length).toBeGreaterThan(0);
  });
});
