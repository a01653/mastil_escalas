/**
 * Funciones de posicionamiento absoluto para marcadores de notas en celdas
 * de la cuadrícula del mástil de Acordes cercanos.
 *
 * Hay dos tipos de celda:
 *   - Celda normal (traste 1+): 60-70 px de ancho — usa calibratedClusterPos / cornerStyle.
 *   - Celda del traste 0 (cuerda al aire):
 *       Desktop: 22 px de ancho — usa fret0ClusterPos (crece hacia la izquierda).
 *       Móvil:   36 px de ancho (columna de cuerda) — usa fret0ClusterPosMobile (crece hacia arriba).
 *
 * Layout desktop (fret0ClusterPos):
 *   El marcador más a la derecha (idx=n-1) se centra en la columna del traste 0.
 *   Los anteriores crecen hacia la izquierda, separados FRET0_SPACING px.
 *   El desbordamiento hacia la columna de etiquetas es intencional.
 *   Nunca se invade la columna del traste 1.
 *
 * Layout móvil (fret0ClusterPosMobile):
 *   El traste 0 es la FILA SUPERIOR del mástil vertical.
 *   El marcador más abajo (idx=n-1, el más cercano al mástil) se centra en la celda.
 *   Los anteriores crecen hacia arriba, separados FRET0_SPACING px.
 *   El desbordamiento hacia arriba queda en el padding reservado por computeMobileFret0TopPadding.
 *   Nunca se invade la columna de otra cuerda ni la fila del traste 1.
 */

import {
  WEB_FRET_ZERO_WIDTH_PX,
} from "../../music/appStaticData.js";

/** Posicionamiento calibrado para celdas de traste normal (60-70 px de ancho). */
export function calibratedClusterPos(n, idx) {
  if (n === 2) {
    const p = [
      { x: 19, y: 16 },
      { x: 52, y: 16 },
    ][idx];
    return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
  }
  if (n === 4) {
    const p = [
      { x: 35, y: 6 },
      { x: 12, y: 14 },
      { x: 57, y: 14 },
      { x: 34, y: 25 },
    ][idx];
    return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
  }
  if (n === 3) {
    const p = [
      { x: 12, y: 14 },
      { x: 34, y: 14 },
      { x: 57, y: 14 },
    ][idx];
    return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
  }
  return null;
}

/** Posicionamiento alternativo por esquinas para celdas de traste normal. */
export function cornerStyle(n, idx) {
  if (n <= 1) return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (n === 2) {
    return idx === 0
      ? { left: 16, top: "50%", transform: "translateY(-50%)" }
      : { right: 16, top: "50%", transform: "translateY(-50%)" };
  }
  return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
}

/**
 * Posicionamiento horizontal para clusters en la celda del traste 0 (22 px de ancho).
 *
 * Regla visual:
 *   - idx = n-1 (rightmost): centrado en la columna del traste 0 (x = ANCHOR_X = 11 px).
 *   - idx = n-2, n-3, …: desplazados hacia la izquierda de FRET0_SPACING en FRET0_SPACING px.
 *   - y siempre centrado verticalmente ("50%").
 *
 * El desbordamiento hacia la izquierda (área de etiquetas) es intencional —
 * nunca se produce desbordamiento hacia el traste 1.
 */
const FRET0_ANCHOR_X = WEB_FRET_ZERO_WIDTH_PX / 2;  // 11 px — centro de la celda del traste 0
const FRET0_SPACING = 18;                             // px entre centros de marcadores

export function fret0ClusterPos(n, idx) {
  // El marcador más a la derecha (idx = n-1) ancla en FRET0_ANCHOR_X.
  // Los marcadores anteriores se desplazan FRET0_SPACING px hacia la izquierda por cada posición.
  const x = FRET0_ANCHOR_X - (n - 1 - idx) * FRET0_SPACING;
  return { left: `${x}px`, top: "50%", transform: "translate(-50%, -50%)" };
}

// Exportar constantes para que los tests puedan verificar la invariante exacta.
export { FRET0_ANCHOR_X, FRET0_SPACING };

// ── fret0ClusterPosMobile — crecimiento hacia arriba (layout móvil) ───────────

// Altura de la celda del traste 0 en móvil: h-[34px] (mobileVerticalFretCellClass).
const MOBILE_FRET0_CELL_HEIGHT_PX = 34;
export const MOBILE_FRET0_ANCHOR_Y = MOBILE_FRET0_CELL_HEIGHT_PX / 2;  // 17 px — centro vertical

/**
 * Posicionamiento vertical para clusters en el traste 0 en móvil.
 *
 * En móvil el mástil está girado: los trastes son filas y el traste 0 es la fila superior.
 * El marcador más abajo (idx = n-1, más cercano al mástil) se ancla en el centro de la celda.
 * Los marcadores anteriores se desplazan hacia arriba con paso FRET0_SPACING.
 *
 * El caller (NearChordsPanel) debe reservar espacio sobre el traste 0 llamando a
 * computeMobileFret0TopPadding(maxCluster) y pasarlo como fret0TopPadding a MobileMainFretboard.
 */
export function fret0ClusterPosMobile(n, idx) {
  // idx = n-1 (bottommost/closest to fret 1): y = MOBILE_FRET0_ANCHOR_Y (center of cell)
  // idx = n-2: y = MOBILE_FRET0_ANCHOR_Y - FRET0_SPACING (above cell)
  // idx = n-3: y = MOBILE_FRET0_ANCHOR_Y - 2*FRET0_SPACING (further above)
  const y = MOBILE_FRET0_ANCHOR_Y - (n - 1 - idx) * FRET0_SPACING;
  return { left: "50%", top: `${y}px`, transform: "translate(-50%, -50%)" };
}

/**
 * Padding superior (px) que MobileMainFretboard debe reservar entre la cabecera
 * de cuerdas y la fila del traste 0 para que los marcadores que desbordan hacia
 * arriba sean completamente visibles.
 */
export function computeMobileFret0TopPadding(maxCluster) {
  // Cada marcador extra ocupa FRET0_SPACING px por encima del anterior.
  // El margen de ~6.5 px sobre el marcador más alto sale de la propia separación.
  return Math.max(0, (maxCluster - 1) * FRET0_SPACING);
}
