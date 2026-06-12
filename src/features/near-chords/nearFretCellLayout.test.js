import { describe, test, expect } from "vitest";
import {
  calibratedClusterPos,
  cornerStyle,
  fret0ClusterPos,
  fret0ClusterPosMobile,
  computeMobileFret0TopPadding,
  FRET0_ANCHOR_X,
  FRET0_SPACING,
  MOBILE_FRET0_ANCHOR_Y,
} from "./nearFretCellLayout.js";
import { WEB_FRET_ZERO_WIDTH_PX } from "../../music/appStaticData.js";

// Diámetro del marcador "cal" (h-[21px] w-[21px]).
const CAL_MARKER_DIAMETER = 21;
// Altura de la celda del traste 0 en móvil (h-[34px]).
const MOBILE_FRET0_CELL_HEIGHT = 34;

// ── fret0ClusterPos (DESKTOP) — crecimiento hacia la izquierda ────────────────

describe("fret0ClusterPos (desktop) — marcador único (n=1)", () => {
  test("queda centrado en el traste 0 (x = FRET0_ANCHOR_X)", () => {
    expect(fret0ClusterPos(1, 0).left).toBe(`${FRET0_ANCHOR_X}px`);
  });

  test("y centrado ('50%')", () => {
    expect(fret0ClusterPos(1, 0).top).toBe("50%");
  });
});

describe("fret0ClusterPos (desktop) — dos marcadores (n=2)", () => {
  test("idx=1 (rightmost) queda centrado en el traste 0", () => {
    expect(fret0ClusterPos(2, 1).left).toBe(`${FRET0_ANCHOR_X}px`);
  });

  test("idx=0 queda a la izquierda del traste 0 (x < FRET0_ANCHOR_X)", () => {
    expect(parseFloat(fret0ClusterPos(2, 0).left)).toBeLessThan(FRET0_ANCHOR_X);
  });

  test("separación entre los dos marcadores es exactamente FRET0_SPACING", () => {
    const x0 = parseFloat(fret0ClusterPos(2, 0).left);
    const x1 = parseFloat(fret0ClusterPos(2, 1).left);
    expect(x1 - x0).toBe(FRET0_SPACING);
  });

  test("el marcador rightmost no invade el traste 1 (borde derecho ≤ ancho celda)", () => {
    const rightEdge = parseFloat(fret0ClusterPos(2, 1).left) + CAL_MARKER_DIAMETER / 2;
    expect(rightEdge).toBeLessThanOrEqual(WEB_FRET_ZERO_WIDTH_PX);
  });
});

describe("fret0ClusterPos (desktop) — tres marcadores (n=3)", () => {
  const xs = [0, 1, 2].map((i) => parseFloat(fret0ClusterPos(3, i).left));

  test("idx=2 (rightmost) queda centrado en el traste 0", () => {
    expect(fret0ClusterPos(3, 2).left).toBe(`${FRET0_ANCHOR_X}px`);
  });

  test("los tres marcadores quedan de izquierda a derecha", () => {
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
  });

  test("separación uniforme de FRET0_SPACING", () => {
    expect(xs[1] - xs[0]).toBe(FRET0_SPACING);
    expect(xs[2] - xs[1]).toBe(FRET0_SPACING);
  });

  test("el marcador rightmost no invade el traste 1", () => {
    expect(xs[2] + CAL_MARKER_DIAMETER / 2).toBeLessThanOrEqual(WEB_FRET_ZERO_WIDTH_PX);
  });

  test("los marcadores anteriores quedan a la izquierda del traste 0", () => {
    expect(xs[0]).toBeLessThan(FRET0_ANCHOR_X);
    expect(xs[1]).toBeLessThan(FRET0_ANCHOR_X);
  });
});

describe("fret0ClusterPos (desktop) — cuatro marcadores (n=4)", () => {
  const xs = [0, 1, 2, 3].map((i) => parseFloat(fret0ClusterPos(4, i).left));

  test("idx=3 (rightmost) queda centrado en el traste 0", () => {
    expect(fret0ClusterPos(4, 3).left).toBe(`${FRET0_ANCHOR_X}px`);
  });

  test("los cuatro marcadores quedan de izquierda a derecha", () => {
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  });

  test("separación uniforme de FRET0_SPACING", () => {
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBe(FRET0_SPACING);
  });

  test("el marcador rightmost no invade el traste 1", () => {
    expect(xs[3] + CAL_MARKER_DIAMETER / 2).toBeLessThanOrEqual(WEB_FRET_ZERO_WIDTH_PX);
  });
});

// ── fret0ClusterPosMobile — crecimiento hacia arriba ─────────────────────────

describe("fret0ClusterPosMobile — marcador único (n=1)", () => {
  test("queda centrado en la celda del traste 0 (y = MOBILE_FRET0_ANCHOR_Y)", () => {
    expect(fret0ClusterPosMobile(1, 0).top).toBe(`${MOBILE_FRET0_ANCHOR_Y}px`);
  });

  test("x centrado horizontalmente ('50%') — no invade la columna de otra cuerda", () => {
    expect(fret0ClusterPosMobile(1, 0).left).toBe("50%");
  });
});

describe("fret0ClusterPosMobile — dos marcadores (n=2)", () => {
  test("idx=1 (bottommost/más cercano al mástil) queda centrado en la celda", () => {
    expect(fret0ClusterPosMobile(2, 1).top).toBe(`${MOBILE_FRET0_ANCHOR_Y}px`);
  });

  test("idx=0 queda por encima del centro (y < MOBILE_FRET0_ANCHOR_Y → desborda hacia arriba)", () => {
    expect(parseFloat(fret0ClusterPosMobile(2, 0).top)).toBeLessThan(MOBILE_FRET0_ANCHOR_Y);
  });

  test("separación vertical entre los dos marcadores es exactamente FRET0_SPACING", () => {
    const y0 = parseFloat(fret0ClusterPosMobile(2, 0).top);
    const y1 = parseFloat(fret0ClusterPosMobile(2, 1).top);
    expect(y1 - y0).toBe(FRET0_SPACING);
  });

  test("ambos marcadores tienen x = '50%' — no invaden otras columnas", () => {
    expect(fret0ClusterPosMobile(2, 0).left).toBe("50%");
    expect(fret0ClusterPosMobile(2, 1).left).toBe("50%");
  });

  test("el marcador bottommost no invade la fila del traste 1 (borde inferior ≤ altura celda)", () => {
    const bottomEdge = parseFloat(fret0ClusterPosMobile(2, 1).top) + CAL_MARKER_DIAMETER / 2;
    expect(bottomEdge).toBeLessThanOrEqual(MOBILE_FRET0_CELL_HEIGHT);
  });
});

describe("fret0ClusterPosMobile — tres marcadores (n=3)", () => {
  const ys = [0, 1, 2].map((i) => parseFloat(fret0ClusterPosMobile(3, i).top));

  test("idx=2 (bottommost) queda centrado en la celda", () => {
    expect(fret0ClusterPosMobile(3, 2).top).toBe(`${MOBILE_FRET0_ANCHOR_Y}px`);
  });

  test("los tres marcadores se apilan de arriba a abajo (y0 < y1 < y2)", () => {
    expect(ys[0]).toBeLessThan(ys[1]);
    expect(ys[1]).toBeLessThan(ys[2]);
  });

  test("separación uniforme de FRET0_SPACING", () => {
    expect(ys[1] - ys[0]).toBe(FRET0_SPACING);
    expect(ys[2] - ys[1]).toBe(FRET0_SPACING);
  });

  test("los marcadores anteriores al bottommost desbordan hacia arriba (y < MOBILE_FRET0_ANCHOR_Y)", () => {
    expect(ys[0]).toBeLessThan(MOBILE_FRET0_ANCHOR_Y);
    expect(ys[1]).toBeLessThan(MOBILE_FRET0_ANCHOR_Y);
  });

  test("el marcador bottommost no invade la fila del traste 1", () => {
    expect(ys[2] + CAL_MARKER_DIAMETER / 2).toBeLessThanOrEqual(MOBILE_FRET0_CELL_HEIGHT);
  });

  test("ningún marcador invade las columnas de otras cuerdas (x siempre '50%')", () => {
    for (let i = 0; i < 3; i++) expect(fret0ClusterPosMobile(3, i).left).toBe("50%");
  });
});

describe("fret0ClusterPosMobile — cuatro marcadores (n=4)", () => {
  const ys = [0, 1, 2, 3].map((i) => parseFloat(fret0ClusterPosMobile(4, i).top));

  test("idx=3 (bottommost) queda centrado en la celda", () => {
    expect(fret0ClusterPosMobile(4, 3).top).toBe(`${MOBILE_FRET0_ANCHOR_Y}px`);
  });

  test("los cuatro marcadores se apilan de arriba a abajo", () => {
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
  });

  test("separación uniforme de FRET0_SPACING", () => {
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBe(FRET0_SPACING);
  });

  test("el marcador bottommost no invade el traste 1", () => {
    expect(ys[3] + CAL_MARKER_DIAMETER / 2).toBeLessThanOrEqual(MOBILE_FRET0_CELL_HEIGHT);
  });
});

// ── computeMobileFret0TopPadding — espacio reservado sobre el traste 0 ────────

describe("computeMobileFret0TopPadding", () => {
  test("n=0: sin marcadores → sin padding", () => {
    expect(computeMobileFret0TopPadding(0)).toBe(0);
  });

  test("n=1: marcador único → sin padding (queda en la celda)", () => {
    expect(computeMobileFret0TopPadding(1)).toBe(0);
  });

  test("n=2: padding = 1 * FRET0_SPACING (espacio para 1 marcador extra hacia arriba)", () => {
    expect(computeMobileFret0TopPadding(2)).toBe(FRET0_SPACING);
  });

  test("n=3: padding = 2 * FRET0_SPACING", () => {
    expect(computeMobileFret0TopPadding(3)).toBe(2 * FRET0_SPACING);
  });

  test("n=4: padding = 3 * FRET0_SPACING", () => {
    expect(computeMobileFret0TopPadding(4)).toBe(3 * FRET0_SPACING);
  });

  test("padding es siempre ≥ 0", () => {
    expect(computeMobileFret0TopPadding(-1)).toBe(0);
  });
});

// ── calibratedClusterPos — desborda el traste 0 (correcto para traste 1+) ────

describe("calibratedClusterPos — coordenadas para celda normal (traste 1+)", () => {
  test("n=2 idx=1: x=52px (desborda los 22px del traste 0 → no usar en traste 0)", () => {
    const pos = calibratedClusterPos(2, 1);
    expect(parseFloat(pos.left)).toBeGreaterThan(WEB_FRET_ZERO_WIDTH_PX);
  });

  test("n=3 idx=2: x=57px (desborda los 22px del traste 0)", () => {
    expect(parseFloat(calibratedClusterPos(3, 2).left)).toBeGreaterThan(WEB_FRET_ZERO_WIDTH_PX);
  });

  test("n=4 idx=2: x=57px (desborda los 22px del traste 0)", () => {
    expect(parseFloat(calibratedClusterPos(4, 2).left)).toBeGreaterThan(WEB_FRET_ZERO_WIDTH_PX);
  });

  test("n fuera de rango devuelve null", () => {
    expect(calibratedClusterPos(5, 0)).toBeNull();
    expect(calibratedClusterPos(1, 0)).toBeNull();
  });
});

// ── cornerStyle ───────────────────────────────────────────────────────────────

describe("cornerStyle", () => {
  test("n=1: centrado al 50%", () => {
    const s = cornerStyle(1, 0);
    expect(s.left).toBe("50%");
    expect(s.top).toBe("50%");
  });

  test("n=2 idx=0: left=16", () => {
    expect(cornerStyle(2, 0).left).toBe(16);
  });

  test("n=2 idx=1: right=16", () => {
    expect(cornerStyle(2, 1).right).toBe(16);
  });
});
