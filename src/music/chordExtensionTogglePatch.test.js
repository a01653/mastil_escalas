/**
 * Unit tests — buildChordExtensionTogglePatch y buildTetradEntryExtensionPatch.
 *
 * Regla compartida entre Acordes y Acordes cercanos: activar una extensión add
 * (6/9/11/13) nunca apaga la 7ª. En cuatriada sin omit las adds son excluyentes
 * entre sí; con omit activo conviven hasta el presupuesto de slots. 6 y 13 se
 * excluyen siempre (misma clase de altura).
 *
 * Regresión v6.0.33: en Acordes cercanos, F cuatriada + ext7 + omit5, activar 9
 * apagaba la 7ª y el acorde pasaba de Fmaj7(add9,no5) a Fadd9(no5).
 */

import { describe, expect, test } from "vitest";
import { buildChordExtensionTogglePatch, buildTetradEntryExtensionPatch } from "./appVoicingStudyCore.js";

describe("buildChordExtensionTogglePatch — la 7ª nunca se apaga", () => {
  test("tetrad + omit=5: activar 9 no incluye ext7 en el patch", () => {
    const patch = buildChordExtensionTogglePatch({ structure: "tetrad", omit: "5", ext: "9", value: true });
    expect(patch).toEqual({ ext9: true });
    expect("ext7" in patch).toBe(false);
  });

  test("tetrad + omit=none: activar 9 apaga 11 y 13 pero no la 7ª", () => {
    const patch = buildChordExtensionTogglePatch({ structure: "tetrad", omit: "none", ext: "9", value: true });
    expect(patch).toEqual({ ext9: true, ext11: false, ext13: false });
  });

  test("tetrad + omit=none: activar 11 apaga 9 y 13 pero no la 7ª", () => {
    const patch = buildChordExtensionTogglePatch({ structure: "tetrad", omit: "none", ext: "11", value: true });
    expect(patch).toEqual({ ext11: true, ext9: false, ext13: false });
  });

  test("tetrad + omit=none: activar 13 apaga 6, 9 y 11 pero no la 7ª", () => {
    const patch = buildChordExtensionTogglePatch({ structure: "tetrad", omit: "none", ext: "13", value: true });
    expect(patch).toEqual({ ext13: true, ext6: false, ext9: false, ext11: false });
  });

  test("tetrad + omit=5: activar 13 solo apaga 6 (las adds conviven con omit)", () => {
    const patch = buildChordExtensionTogglePatch({ structure: "tetrad", omit: "5", ext: "13", value: true });
    expect(patch).toEqual({ ext13: true, ext6: false });
  });

  test("structure=chord: activar 9 no apaga nada", () => {
    const patch = buildChordExtensionTogglePatch({ structure: "chord", omit: "none", ext: "9", value: true });
    expect(patch).toEqual({ ext9: true });
  });

  test("structure=chord: 6 y 13 siguen siendo excluyentes", () => {
    expect(buildChordExtensionTogglePatch({ structure: "chord", omit: "none", ext: "6", value: true }))
      .toEqual({ ext6: true, ext13: false });
    expect(buildChordExtensionTogglePatch({ structure: "chord", omit: "none", ext: "13", value: true }))
      .toEqual({ ext13: true, ext6: false });
  });

  test("desactivar una extensión no toca las demás", () => {
    expect(buildChordExtensionTogglePatch({ structure: "tetrad", omit: "none", ext: "9", value: false }))
      .toEqual({ ext9: false });
    expect(buildChordExtensionTogglePatch({ structure: "tetrad", omit: "5", ext: "13", value: false }))
      .toEqual({ ext13: false });
  });
});

describe("buildTetradEntryExtensionPatch — entrar en cuatriada", () => {
  test("sin extensiones previas: activa la 7ª y deja las adds apagadas", () => {
    const patch = buildTetradEntryExtensionPatch({ ext7: false, ext6: false, ext9: false, ext11: false, ext13: false, omit: "none" });
    expect(patch).toEqual({ ext7: true, ext6: false, ext9: false, ext11: false, ext13: false });
  });

  test("desde chord con ext9+ext11 y omit=none: conserva la primera add dentro del presupuesto", () => {
    const patch = buildTetradEntryExtensionPatch({ ext7: false, ext6: false, ext9: true, ext11: true, ext13: false, omit: "none" });
    expect(patch).toEqual({ ext7: true, ext6: false, ext9: true, ext11: false, ext13: false });
  });

  test("con ext7 previa y omit=none: las adds se recortan (presupuesto ocupado por la 7ª)", () => {
    const patch = buildTetradEntryExtensionPatch({ ext7: true, ext6: false, ext9: true, ext11: false, ext13: false, omit: "none" });
    expect(patch).toEqual({ ext7: true, ext6: false, ext9: false, ext11: false, ext13: false });
  });

  test("con ext7 previa y omit=5: una add cabe en el slot extra", () => {
    const patch = buildTetradEntryExtensionPatch({ ext7: true, ext6: false, ext9: true, ext11: false, ext13: false, omit: "5" });
    expect(patch).toEqual({ ext7: true, ext6: false, ext9: true, ext11: false, ext13: false });
  });
});
