import { describe, expect, test } from "vitest";
import { chordDbKeyNameFromPc } from "./chordDbCatalog.js";

describe("chordDbCatalog", () => {
  test("usa carpetas seguras para todas las doce raíces", () => {
    expect(Array.from({ length: 12 }, (_, pc) => chordDbKeyNameFromPc(pc))).toEqual([
      "C",
      "Db",
      "D",
      "Eb",
      "E",
      "F",
      "Gb",
      "G",
      "Ab",
      "A",
      "Bb",
      "B",
    ]);
  });

  test("normaliza valores fuera de rango sin exponer sostenidos en la ruta", () => {
    expect(chordDbKeyNameFromPc(-9)).toBe("Eb");
    expect(chordDbKeyNameFromPc(13)).toBe("Db");
    expect(chordDbKeyNameFromPc(22)).toBe("Bb");
  });
});
