import { describe, expect, test } from "vitest";
import { computeFretWindow, fretFitsWindow, voicingFitsFretWindow, FRET_WINDOW_MAX_SIZE } from "./fretWindowCore.js";

const voicing = (frets) => ({ notes: frets.map((fret, sIdx) => ({ sIdx, fret })) });

describe("computeFretWindow: límites de la ventana de trastes", () => {
  test("Acordes por defecto (inicio 1, tamaño máximo) abarca todo el mástil visible", () => {
    for (const maxFret of [12, 15, 24]) {
      expect(computeFretWindow({ start: 1, size: FRET_WINDOW_MAX_SIZE, maxFret })).toMatchObject({ from: 1, to: maxFret, canMoveRight: false });
    }
  });

  test("Tamaño es el nº de trastes de la ventana y se recorta al final del mástil", () => {
    expect(computeFretWindow({ start: 3, size: 5, maxFret: 15 })).toMatchObject({ from: 3, to: 7, effectiveSize: 5, canMoveLeft: true, canMoveRight: true });
    expect(computeFretWindow({ start: 13, size: 5, maxFret: 15 })).toMatchObject({ from: 13, to: 15, effectiveSize: 3, canMoveRight: false });
    expect(computeFretWindow({ start: 0, size: 4, maxFret: 15 })).toMatchObject({ from: 0, to: 3, canMoveLeft: false });
  });

  test("mismo resultado que las fórmulas que usaba Acordes cercanos", () => {
    for (const maxFret of [12, 15, 24]) {
      for (let start = -2; start <= 26; start++) {
        for (let size = 0; size <= 26; size++) {
          const nearFrom = Math.max(0, Math.min(maxFret, Math.floor(Number(start) || 0)));
          const nearSize = Math.max(1, Math.floor(Number(size) || 1));
          const nearTo = Math.max(nearFrom, Math.min(maxFret, nearFrom + nearSize - 1));
          const nearStartMax = Math.max(0, maxFret - (nearSize - 1));
          expect(computeFretWindow({ start, size, maxFret })).toMatchObject({ from: nearFrom, to: nearTo, startMax: nearStartMax });
        }
      }
    }
  });
});

describe("voicingFitsFretWindow: el rango filtra posiciones; el traste 0 depende de cuerdas al aire", () => {
  const window = { from: 5, to: 8 };
  test("todas las notas pisadas dentro del rango", () => {
    expect(voicingFitsFretWindow(voicing([5, 7, 7, 6]), { ...window, allowOpenStrings: false })).toBe(true);
    expect(voicingFitsFretWindow(voicing([5, 7, 9, 6]), { ...window, allowOpenStrings: false })).toBe(false);
    expect(voicingFitsFretWindow(voicing([3, 5, 5]), { ...window, allowOpenStrings: true })).toBe(false);
  });

  test("traste 0: admitido solo con cuerdas al aire, aunque esté fuera del rango", () => {
    expect(voicingFitsFretWindow(voicing([0, 7, 7, 6]), { ...window, allowOpenStrings: true })).toBe(true);
    expect(voicingFitsFretWindow(voicing([0, 7, 7, 6]), { ...window, allowOpenStrings: false })).toBe(false);
    expect(fretFitsWindow(0, { from: 0, to: 4, allowOpenStrings: false })).toBe(false);
  });
});
