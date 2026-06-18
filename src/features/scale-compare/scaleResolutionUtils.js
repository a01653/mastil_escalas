import { mod12 } from "../../music/appMusicBasics.js";
import { STRINGS } from "../../music/appStaticData.js";

// Nota característica que distingue cada modo (además de las notas-rol estándar).
// Orden importante: Mixolidia debe aparecer antes que Lidia para evitar
// que "lidia" dentro de "Mixolidia" active el patrón equivocado.
const CHARACTERISTIC_PATTERNS = [
  { pattern: /mixolidia|mixolydian/i,  label: "b7"  }, // b7: rasgo de Mixolidia (antes que Lidia)
  { pattern: /\blidia\b|\blydian\b/i,  label: "#4"  }, // 4ª aum.: rasgo de Lidia
  { pattern: /dórica|dorian/i,         label: "6"   }, // 6ª mayor: distingue Dórica de Menor nat.
  { pattern: /frigia|phrygian/i,       label: "b2"  }, // 2ª menor: rasgo de Frigia
];

export function getCharacteristicIntervalLabel(scaleName) {
  const match = CHARACTERISTIC_PATTERNS.find((c) => c.pattern.test(scaleName));
  return match ? match.label : null;
}

// Puntuación base por rol en la escala destino
const ROLE_BASE_SCORE = { "b3": 5, "3": 5, "b7": 4, "7": 4, "1": 3, "5": 2 };

// Nombre legible para mostrar en la lista
const ROLE_DISPLAY_NAME = {
  "1": "raíz", "b3": "b3", "3": "3ª", "5": "5ª", "b7": "b7", "7": "7ª",
};

/**
 * Devuelve las notas-objetivo de la escala destino con su puntuación.
 * @param {Map<number,string>} intervalMap  pc → token de intervalo
 * @param {string}             scaleName    nombre de la escala
 * @returns {{ pc, label, score, roleName, isCharacteristic }[]}
 */
export function getTargetNotesFromIntervalMap(intervalMap, scaleName) {
  const charLabel = getCharacteristicIntervalLabel(scaleName);
  const targets = [];
  for (const [pc, label] of intervalMap) {
    const baseScore = ROLE_BASE_SCORE[label] ?? 0;
    const isCharacteristic = Boolean(charLabel && label === charLabel);
    const totalScore = baseScore + (isCharacteristic ? 3 : 0);
    if (totalScore > 0) {
      targets.push({
        pc,
        label,
        score: totalScore,
        roleName: ROLE_DISPLAY_NAME[label] ?? label,
        isCharacteristic,
      });
    }
  }
  return targets;
}

/**
 * Detecta conexiones útiles desde la escala origen hacia la escala destino.
 *
 * Solo considera movimientos de ±1 o ±2 trastes en la misma cuerda.
 * No incluye distancia 0 (notas comunes son evidentes visualmente).
 * Deduplica por (cuerda, traste destino) y devuelve máx. 12, ordenadas por score.
 *
 * @param {{ pcs: Set<number>, intervalMap: Map<number,string>, row: { scaleName: string } }} originDerived
 * @param {{ pcs: Set<number>, intervalMap: Map<number,string>, row: { scaleName: string } }} destDerived
 * @param {number} maxFret
 * @returns {ResolutionConnection[]}
 */
export function computeResolutionPoints(originDerived, destDerived, maxFret = 12) {
  if (!originDerived || !destDerived) return [];

  const targets = getTargetNotesFromIntervalMap(
    destDerived.intervalMap,
    destDerived.row.scaleName
  );
  if (targets.length === 0) return [];

  const targetByPc = new Map(targets.map((t) => [t.pc, t]));
  const connections = [];

  STRINGS.forEach((st, sIdx) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const originPc = mod12(st.pc + fret);
      if (!originDerived.pcs.has(originPc)) continue;

      for (const dist of [-2, -1, 1, 2]) {
        const destFret = fret + dist;
        if (destFret < 0 || destFret > maxFret) continue;
        const destPc = mod12(st.pc + destFret);
        const target = targetByPc.get(destPc);
        if (!target) continue;

        const distScore = Math.abs(dist) === 1 ? 3 : 2;
        connections.push({
          stringIdx: sIdx,
          stringLabel: st.label,
          originFret: fret,
          destFret,
          originPc,
          destPc,
          originLabel: originDerived.intervalMap.get(originPc) ?? "·",
          destLabel: target.label,
          destRoleName: target.roleName,
          isCharacteristic: target.isCharacteristic,
          distance: dist,
          score: target.score + distScore,
        });
      }
    }
  });

  // Deduplicar: (cuerda, traste destino) → conservar la de mayor score
  const bestByKey = new Map();
  for (const c of connections) {
    const key = `${c.stringIdx}-${c.destFret}`;
    if (!bestByKey.has(key) || bestByKey.get(key).score < c.score) {
      bestByKey.set(key, c);
    }
  }

  return [...bestByKey.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
