import { describe, test, expect } from "vitest";
import { buildNearSlotPatchFromDetectedCandidate } from "./copyToNearSlot.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
// bassPc: nota real que el motor de detección encuentra en el bajo.
// externalBassInterval: solo se rellena cuando el bajo NO es tono del acorde.
// Para inversiones normales (e.g. Asus2/E donde E sí es tono), externalBassInterval=null.

function makeTertianCandidate({
  rootPc, quality, suspension = "none", structure = "triad",
  ext7 = false, ext6 = false, ext9 = false, ext11 = false, ext13 = false,
  form = "open", preferSharps = false,
  bassPc = null,          // nota real del bajo
  externalBassInterval = null, // solo para bajos que NO son tono del acorde
} = {}) {
  return {
    uiPatch: {
      family: "tertian",
      rootPc,
      quality,
      suspension,
      structure,
      ext7, ext6, ext9, ext11, ext13,
      form,
      positionForm: form,
      spellPreferSharps: preferSharps,
      inversion: "root",
    },
    bassPc: bassPc ?? rootPc, // si no se especifica, la raíz es el bajo
    externalBassInterval,
  };
}

// ── Candidatos de prueba ──────────────────────────────────────────────────────

// E = pc 4, A = pc 9, B = pc 11
// Esus4 = E(4) + A(9) + B(11) → A es tono del acorde (5ª - su4), externalBassInterval=null
const ESUS4_A = makeTertianCandidate({
  rootPc: 4, quality: "sus", suspension: "sus4", structure: "triad",
  form: "open", preferSharps: true,
  bassPc: 9,               // A en el bajo (2ª inversión de Esus4)
  externalBassInterval: null, // A es tono del acorde → motor lo deja null
});

// A = pc 9, B = pc 11, E = pc 4
// Asus2 = A(9) + B(11) + E(4) → E es la 5ª, tono del acorde, externalBassInterval=null
// Este es exactamente el caso del bug reportado: xx2200 → Asus2/E
const ASUS2_E = makeTertianCandidate({
  rootPc: 9, quality: "sus", suspension: "sus2", structure: "triad",
  form: "closed", preferSharps: true,
  bassPc: 4,               // E en el bajo (2ª inversión de Asus2)
  externalBassInterval: null, // E es tono del acorde → motor lo deja null
});

// C = pc 0, G = pc 7
// C mayor = C(0) + E(4) + G(7) → G es la 5ª, tono del acorde
const C_G = makeTertianCandidate({
  rootPc: 0, quality: "maj", structure: "triad",
  bassPc: 7,               // G en el bajo (2ª inversión de C)
  externalBassInterval: null,
});

// Cmaj7 en posición fundamental — sin bajo slash
const CMAJ7 = makeTertianCandidate({
  rootPc: 0, quality: "maj", structure: "tetrad",
  ext7: true, form: "closed", preferSharps: false,
  bassPc: 0,               // C en el bajo
  externalBassInterval: null,
});

// Slash bass externo (no tono del acorde): Cm/F# — F# no es tono de Cm
// Cm = C(0) + Eb(3) + G(7). F# = pc 6, que no pertenece a Cm.
const CM_FS = makeTertianCandidate({
  rootPc: 0, quality: "min", structure: "triad",
  bassPc: 6,               // F# en el bajo (no tono del acorde)
  externalBassInterval: 6, // el motor sí lo rellena aquí
});

// ── Test del bug: Asus2/E (xx2200) ───────────────────────────────────────────

describe("bug Asus2/E: inversión con bajo como tono del acorde", () => {
  test("slashBassPc es E (pc 4), no null", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ASUS2_E);
    expect(patch.slashBassPc).toBe(4); // E
  });

  test("root sigue siendo A (pc 9)", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ASUS2_E);
    expect(patch.rootPc).toBe(9);
  });

  test("quality=sus, suspension=sus2", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ASUS2_E);
    expect(patch.quality).toBe("sus");
    expect(patch.suspension).toBe("sus2");
  });

  test("no aparece como fundamental (slashBassPc !== rootPc)", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ASUS2_E);
    expect(patch.slashBassPc).not.toBe(patch.rootPc);
    expect(patch.slashBassPc).not.toBeNull();
  });

  test("selFrets es null: no se copia el patrón xx2200", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ASUS2_E);
    expect(patch.selFrets).toBeNull();
  });
});

// ── Test 1: Esus4/A conserva el bajo A (inversión, no slash externo) ─────────

describe("Esus4/A: inversión con bajo como tono del acorde", () => {
  test("slashBassPc es A (pc 9)", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ESUS4_A);
    expect(patch.slashBassPc).toBe(9);
  });

  test("rootPc es E (pc 4)", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ESUS4_A);
    expect(patch.rootPc).toBe(4);
  });

  test("quality=sus, suspension=sus4", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ESUS4_A);
    expect(patch.quality).toBe("sus");
    expect(patch.suspension).toBe("sus4");
  });
});

// ── Test 2: C/G conserva el bajo G ───────────────────────────────────────────

test("C/G: slashBassPc es G (pc 7)", () => {
  const patch = buildNearSlotPatchFromDetectedCandidate(C_G);
  expect(patch.slashBassPc).toBe(7);
  expect(patch.rootPc).toBe(0);
});

// ── Test 3: Acorde sin slash → slashBassPc null ───────────────────────────────

describe("sin slash bass (posición fundamental)", () => {
  test("Cmaj7 con bassPc=rootPc: slashBassPc es null", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(CMAJ7);
    expect(patch.slashBassPc).toBeNull();
  });

  test("Cmaj7: rootPc=0, quality=maj, ext7=true", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(CMAJ7);
    expect(patch.rootPc).toBe(0);
    expect(patch.quality).toBe("maj");
    expect(patch.ext7).toBe(true);
  });
});

// ── Test 4: slash externo (no tono del acorde) también funciona ───────────────

test("Cm/F#: slashBassPc es F# (pc 6), bajo no tono del acorde", () => {
  const patch = buildNearSlotPatchFromDetectedCandidate(CM_FS);
  expect(patch.slashBassPc).toBe(6);
});

// ── Test 5: No se copia el patrón físico ─────────────────────────────────────

describe("sin frets físicos", () => {
  test("Asus2/E: selFrets es null", () => {
    expect(buildNearSlotPatchFromDetectedCandidate(ASUS2_E).selFrets).toBeNull();
  });

  test("Esus4/A: selFrets es null", () => {
    expect(buildNearSlotPatchFromDetectedCandidate(ESUS4_A).selFrets).toBeNull();
  });

  test("el patch no contiene strings con patrón de frets", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ASUS2_E);
    const fretPattern = /^[x\d]+$/;
    const stringValues = Object.values(patch).filter((v) => typeof v === "string");
    expect(stringValues.some((v) => fretPattern.test(v))).toBe(false);
  });
});

// ── Test 6: Independencia de slots ───────────────────────────────────────────

describe("independencia de slots", () => {
  test("el mismo candidato produce el mismo patch (la función es pura)", () => {
    expect(buildNearSlotPatchFromDetectedCandidate(ASUS2_E))
      .toEqual(buildNearSlotPatchFromDetectedCandidate(ASUS2_E));
  });

  test("candidatos distintos producen patches distintos", () => {
    const pSus = buildNearSlotPatchFromDetectedCandidate(ASUS2_E);
    const pMaj = buildNearSlotPatchFromDetectedCandidate(CMAJ7);
    expect(pSus.rootPc).not.toBe(pMaj.rootPc);
    expect(pSus.slashBassPc).not.toBe(pMaj.slashBassPc);
  });

  test("el patch no tiene campo slotIdx (el índice lo gestiona updateNearSlot)", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(ASUS2_E);
    expect(patch).not.toHaveProperty("slotIdx");
    expect(patch).not.toHaveProperty("idx");
  });
});

// ── Test 7: inversion="all" ───────────────────────────────────────────────────

test("inversion=all para que nearChords busque cualquier voicing en la zona", () => {
  expect(buildNearSlotPatchFromDetectedCandidate(ASUS2_E).inversion).toBe("all");
  expect(buildNearSlotPatchFromDetectedCandidate(ESUS4_A).inversion).toBe("all");
});

// ── Test 8: candidato null/sin uiPatch ───────────────────────────────────────

test("candidato null devuelve null", () => {
  expect(buildNearSlotPatchFromDetectedCandidate(null)).toBeNull();
});

test("candidato sin uiPatch devuelve null", () => {
  expect(buildNearSlotPatchFromDetectedCandidate({ name: "X" })).toBeNull();
});

// ── Test 9: bassPc === rootPc → sin slash bass ────────────────────────────────

test("candidato con bassPc igual a rootPc no genera slashBassPc", () => {
  const cand = makeTertianCandidate({ rootPc: 5, quality: "maj", bassPc: 5 });
  expect(buildNearSlotPatchFromDetectedCandidate(cand).slashBassPc).toBeNull();
});

// ── Helpers cuartal ───────────────────────────────────────────────────────────

function makeQuartalCandidate({
  rootPc, quartalType = "pure", quartalVoices = "4", quartalSpread = "closed",
  quartalReference = "root", preferSharps = false, bassPc = null,
} = {}) {
  return {
    uiPatch: {
      family: "quartal",
      rootPc,
      spellPreferSharps: preferSharps,
      quartalType,
      quartalVoices,
      quartalSpread,
      quartalReference,
    },
    bassPc: bassPc ?? rootPc,
  };
}

// ── Cuartal B del voicing x02200 ──────────────────────────────────────────────
// Cadena B(11)→E(4)→A(9), pasos [5,5], bajo real A (pc 9), raíz B (pc 11).
// Spread "open" porque en x02200 los saltos no son exactamente una 4ª en pitch.
const CUARTAL_B = makeQuartalCandidate({
  rootPc: 11,
  quartalType: "pure",
  quartalVoices: "3",
  quartalSpread: "open",
  quartalReference: "root",
  preferSharps: false,
  bassPc: 9,  // A (bajo real)
});

// ── Tests: Cuartal B (x02200) ─────────────────────────────────────────────────

describe("Cuartal B (x02200): preserva familia cuartal", () => {
  test("family es 'quartal', no 'tertian'", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(CUARTAL_B);
    expect(patch.family).toBe("quartal");
    expect(patch.family).not.toBe("tertian");
  });

  test("rootPc es B (pc 11)", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(CUARTAL_B);
    expect(patch.rootPc).toBe(11);
  });

  test("quartalType='pure', quartalVoices='3', quartalSpread='open'", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(CUARTAL_B);
    expect(patch.quartalType).toBe("pure");
    expect(patch.quartalVoices).toBe("3");
    expect(patch.quartalSpread).toBe("open");
  });

  test("NO contiene campos terciarios (quality, structure)", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(CUARTAL_B);
    expect(patch).not.toHaveProperty("quality");
    expect(patch).not.toHaveProperty("structure");
  });

  test("slashBassPc es null (cuartal no genera slash bass)", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(CUARTAL_B);
    expect(patch.slashBassPc).toBeNull();
  });

  test("slashBassPc null limpia slashBassPc previo al hacer merge con slot terciario", () => {
    // Si el slot ya tenía slashBassPc=9 de un copiado terciario anterior,
    // el patch cuartal debe sobreescribirlo con null (no heredarlo).
    const patch = buildNearSlotPatchFromDetectedCandidate(CUARTAL_B);
    expect(Object.prototype.hasOwnProperty.call(patch, "slashBassPc")).toBe(true);
    expect(patch.slashBassPc).toBeNull();
  });

  test("selFrets es null: no se copia el patrón físico", () => {
    const patch = buildNearSlotPatchFromDetectedCandidate(CUARTAL_B);
    expect(patch.selFrets).toBeNull();
  });
});
