/**
 * Re-ranking contextual de lecturas de acorde.
 *
 * No modifica el motor de detección. Solo reordena la lista de readings
 * devuelta por detectChordReadings() según un acorde de referencia.
 *
 * Si no hay ninguna lectura compatible con el contexto, devuelve el orden
 * original exacto del motor.
 */

// Mapeo de etiquetas UI → calidad del motor (formula.ui.quality)
const QUALITY_ENGINE_MAP = {
  "Mayor": "maj",
  "maj7":  "maj",
  "7":     "dom",
  "menor": "min",
  "m7":    "min",
  "m7(b5)": "hdim",
  "dim":   "dim",
  "dim7":  "dim",
  "sus4":  null,  // se comprueba por suspension, no por quality
  "7sus4": "dom",
};

function contextMatchScore(reading, rootPc, quality) {
  const rootMatch = reading.rootPc === rootPc;

  let qualMatch = false;
  const engineQ  = QUALITY_ENGINE_MAP[quality];
  const readingQ  = reading.formula?.ui?.quality;
  const readingSus = reading.formula?.ui?.suspension;

  if (quality === "sus4") {
    // contexto sus4 → encaja con cualquier acorde suspendido (maj o dom)
    qualMatch = readingSus === "sus4" || readingSus === "sus2";
  } else if (engineQ != null) {
    qualMatch = readingQ === engineQ;
  }

  // 2 puntos por raíz, 1 por calidad → máximo 3
  return (rootMatch ? 2 : 0) + (qualMatch ? 1 : 0);
}

/**
 * Reordena readings según un acorde de referencia armónico.
 *
 * @param {object[]} readings  Lista de readings del motor (inmutables).
 * @param {{ enabled: boolean, rootPc: number, quality: string }} harmonyContext
 * @returns {object[]}  Nueva lista (mismos objetos, nuevo orden).
 */
export function rankReadingsWithHarmonyContext(readings, harmonyContext) {
  if (!harmonyContext?.enabled || !Array.isArray(readings) || readings.length === 0) {
    return readings.slice();
  }

  const { rootPc, quality } = harmonyContext;

  const scored = readings.map((r) => ({
    reading: r,
    match: contextMatchScore(r, rootPc, quality),
  }));

  const bestMatch = Math.max(...scored.map((s) => s.match));
  if (bestMatch === 0) {
    // Ninguna lectura encaja con el contexto → preservar orden del motor
    return readings.slice();
  }

  return scored
    .slice()
    .sort((a, b) => {
      if (b.match !== a.match) return b.match - a.match; // mayor match primero
      // Desempate: mejor rankScore del motor (menor = mejor)
      return (a.reading.rankScore ?? a.reading.score ?? 999) -
             (b.reading.rankScore ?? b.reading.score ?? 999);
    })
    .map((s) => s.reading);
}
