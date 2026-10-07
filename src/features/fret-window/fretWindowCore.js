// ============================================================================
// VENTANA DE TRASTES (Rango + Tamaño) — lógica compartida
// ----------------------------------------------------------------------------
// La usan el mástil de Acordes y el de Acordes cercanos, cada uno con su propio
// estado. La ventana FILTRA las posiciones disponibles (no solo sombrea el
// dibujo): una posición entra si todas sus notas pisadas caen en [from, to].
// Excepción: el traste 0 (cuerda al aire) no depende de la ventana, solo de
// "Permitir cuerdas al aire". Tamaño = nº de trastes que abarca la ventana; no
// sustituye a la distancia máxima entre dedos (Dist).
// ============================================================================

export const FRET_WINDOW_MIN_START = 0;
export const FRET_WINDOW_MAX_SIZE = 24;
// Rango completo de Acordes: desde el traste 1 hasta el último configurado (el
// tamaño máximo se recorta a maxFret). Es el estado inicial, el de las
// configuraciones antiguas sin rango y el que restablece «Todo el mástil».
export const FULL_NECK_WINDOW = Object.freeze({ start: 1, size: FRET_WINDOW_MAX_SIZE });

// Límites efectivos de la ventana dentro del mástil visible (0..maxFret).
// `startMax` es el mayor inicio con el que la ventana completa cabe en el mástil.
export function computeFretWindow({ start, size, maxFret } = {}) {
  const lastFret = Math.max(0, Math.floor(Number(maxFret) || 0));
  const from = Math.max(FRET_WINDOW_MIN_START, Math.min(lastFret, Math.floor(Number(start) || 0)));
  const safeSize = Math.max(1, Math.floor(Number(size) || 1));
  const to = Math.max(from, Math.min(lastFret, from + safeSize - 1));
  const startMax = Math.max(FRET_WINDOW_MIN_START, lastFret - (safeSize - 1));
  return {
    from,
    to,
    startMax,
    effectiveSize: to - from + 1,
    canMoveLeft: from > FRET_WINDOW_MIN_START,
    canMoveRight: to < lastFret,
  };
}

// ¿Puede sonar este traste con la ventana? El 0 solo con cuerdas al aire.
export function fretFitsWindow(fret, { from, to, allowOpenStrings } = {}) {
  if (fret === 0) return !!allowOpenStrings;
  return fret >= from && fret <= to;
}

// Una posición cabe en la ventana si todas sus notas caben.
export function voicingFitsFretWindow(voicing, window) {
  return (voicing?.notes || []).every((note) => fretFitsWindow(note.fret, window));
}
