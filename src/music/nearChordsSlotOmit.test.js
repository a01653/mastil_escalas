/**
 * Unit tests — nearChords slot: pass-through de omit y ext9/11/13 al plan.
 *
 * buildSlotVoicings en App.jsx no es exportable, pero el comportamiento
 * se puede verificar directamente a través de buildChordEnginePlan
 * y buildChordIntervals con los mismos parámetros que usa buildSlotVoicings.
 * También verifica sanitizeNearSlotValue con el nuevo campo omit.
 */

import { describe, expect, test } from "vitest";
import { buildChordEnginePlan } from "./appVoicingStudyCore.js";
import { sanitizeNearSlotValue } from "../music/appPatternRouteStaffCore.jsx";

// Slot base: C mayor tríada (igual que buildEmptyNearSlot con rootPc=0)
const BASE_SLOT = {
  rootPc: 0,
  quality: "maj",
  suspension: "none",
  structure: "triad",
  inversion: "all",
  form: "open",
  ext7: false,
  ext6: false,
  ext9: false,
  ext11: false,
  ext13: false,
  omit: "none",
};

function planFromSlot(slot) {
  return buildChordEnginePlan({
    rootPc: slot.rootPc,
    quality: slot.quality,
    suspension: slot.suspension || "none",
    structure: slot.structure,
    inversion: slot.inversion,
    form: slot.form,
    ext7: !!slot.ext7,
    ext6: !!slot.ext6,
    ext9: !!slot.ext9,
    ext11: !!slot.ext11,
    ext13: !!slot.ext13,
    omit: slot.omit || "none",
  });
}

describe("nearChords slot — omit pass-through al plan", () => {

  test("1. omit='none' (default): C mayor tríada incluye 1, 3, 5 en intervals", () => {
    const plan = planFromSlot(BASE_SLOT);
    expect(plan.intervals).toContain(0);  // 1
    expect(plan.intervals).toContain(4);  // 3
    expect(plan.intervals).toContain(7);  // 5
  });

  test("2. omit='5': plan excluye la quinta (intervalo 7)", () => {
    const plan = planFromSlot({ ...BASE_SLOT, omit: "5" });
    expect(plan.intervals).not.toContain(7);
    expect(plan.intervals).toContain(0); // 1
    expect(plan.intervals).toContain(4); // 3
  });

  test("3. omit='1': plan excluye la fundamental (intervalo 0)", () => {
    const plan = planFromSlot({ ...BASE_SLOT, omit: "1" });
    expect(plan.intervals).not.toContain(0);
    expect(plan.intervals).toContain(4); // 3
    expect(plan.intervals).toContain(7); // 5
  });

  test("4. omit='3': plan excluye la tercera (intervalo 4)", () => {
    const plan = planFromSlot({ ...BASE_SLOT, omit: "3" });
    expect(plan.intervals).not.toContain(4);
    expect(plan.intervals).toContain(0); // 1
    expect(plan.intervals).toContain(7); // 5
  });

  test("5. ext9=true, structure='tetrad': plan incluye novena (intervalo 2)", () => {
    const plan = planFromSlot({ ...BASE_SLOT, structure: "tetrad", ext9: true });
    expect(plan.intervals).toContain(2); // 9
    expect(plan.intervals).toContain(0); // 1
    expect(plan.intervals).toContain(4); // 3
  });

  test("6. omit='none' produce resultado idéntico al plan sin campo omit explícito", () => {
    const withOmitNone = buildChordEnginePlan({
      rootPc: 0, quality: "maj", suspension: "none", structure: "triad",
      inversion: "all", form: "open",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false,
      omit: "none",
    });
    const withoutOmit = buildChordEnginePlan({
      rootPc: 0, quality: "maj", suspension: "none", structure: "triad",
      inversion: "all", form: "open",
      ext7: false, ext6: false, ext9: false, ext11: false, ext13: false,
    });
    expect(withOmitNone.intervals).toEqual(withoutOmit.intervals);
    expect(withOmitNone.bassInterval).toEqual(withoutOmit.bassInterval);
  });
});

describe("nearChords slot — sanitizeNearSlotValue con campo omit", () => {
  const fallback = { ...BASE_SLOT, enabled: false, spellPreferSharps: false, maxDist: 4,
    allowOpenStrings: false, positionForm: "open", quartalType: "pure",
    quartalVoices: "4", quartalSpread: "closed", quartalReference: "root",
    quartalScaleName: "Mayor", guideToneQuality: "maj7", guideToneForm: "closed",
    guideToneInversion: "all", selFrets: null, family: "tertian" };

  test("1. omit='5' se conserva tras sanitize", () => {
    const result = sanitizeNearSlotValue({ ...fallback, omit: "5" }, fallback);
    expect(result.omit).toBe("5");
  });

  test("2. omit='none' se conserva tras sanitize", () => {
    const result = sanitizeNearSlotValue({ ...fallback, omit: "none" }, fallback);
    expect(result.omit).toBe("none");
  });

  test("3. omit ausente usa el default del fallback ('none')", () => {
    const { omit: _omit, ...slotWithoutOmit } = fallback;
    const result = sanitizeNearSlotValue(slotWithoutOmit, fallback);
    expect(result.omit).toBe("none");
  });

  test("4. omit con valor inválido cae back a 'none'", () => {
    const result = sanitizeNearSlotValue({ ...fallback, omit: "7" }, fallback);
    expect(result.omit).toBe("none");
  });
});
