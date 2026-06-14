// Núcleo puro para AGRUPAR (no reordenar) las lecturas detectadas en dos grupos
// de presentación: principales vs avanzadas/contextuales.
//
// IMPORTANTE: no cambia el lector, el ranking ni el Primary. Solo reparte la
// lista ya calculada (chordDetectCandidatesRanked) para que las lecturas
// avanzadas/contextuales puedan mostrarse en un bloque desplegable cerrado por
// defecto. Se reutilizan los marcadores ya existentes del candidato; no se
// introduce ninguna clasificación musical nueva. Es avanzada si la lectura es
// realmente cuartal, fragmentaria o contextual fuerte:
//   - formula.quartal → lectura cuartal
//   - fragment        → fragmento (harmonyContextRanking)
//   - contextual      → lectura contextual real (candidato sintético por referencia)
//
// NOTA: `referencePromoted` NO es criterio. Marca una lectura normal que solo
// subió al top por el acorde de referencia (sorted[0] reordenado); sigue siendo
// terciaria/normal. Por eso "por referencia" es una etiqueta informativa, no un
// motivo para esconderla. Si además es cuartal/fragmento/contextual, esos flags
// (no `referencePromoted`) la mandan a avanzadas.

/** ¿La lectura pertenece a la capa avanzada/contextual? Solo marcadores existentes. */
export function isAdvancedReading(candidate) {
  if (!candidate) return false;
  return !!(
    candidate.formula?.quartal ||
    candidate.fragment ||
    candidate.contextual
  );
}

/**
 * Reparte las lecturas en { main, advanced } conservando el orden de entrada.
 *
 * @param {object[]} candidates  Lista rankeada (chordDetectCandidatesRanked).
 * @param {string|number|null} keepVisibleId  Id que SIEMPRE va en `main` aunque sea
 *        avanzada (la lectura principal nunca debe quedar oculta en el bloque cerrado).
 * @returns {{ main: object[], advanced: object[] }}
 */
export function partitionDetectedReadings({ candidates, keepVisibleId = null } = {}) {
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  const main = [];
  const advanced = [];
  for (const c of list) {
    if (isAdvancedReading(c) && c.id !== keepVisibleId) {
      advanced.push(c);
    } else {
      main.push(c);
    }
  }
  return { main, advanced };
}
