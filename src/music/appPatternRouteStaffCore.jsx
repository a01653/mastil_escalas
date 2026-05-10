import * as AppStaticData from "./appStaticData.js";
const {
  STRINGS,
  OPEN_MIDI,
  hasInlayCell,
} = AppStaticData;

import * as AppMusicBasics from "./appMusicBasics.js";
const {
  mod12,
  pcToName,
  pitchAt,
  spellNoteFromChordInterval,
  CHORD_QUALITIES,
  CHORD_STRUCTURES,
  CHORD_FAMILIES,
  CHORD_QUARTAL_TYPES,
  CHORD_QUARTAL_VOICES,
  CHORD_QUARTAL_SPREADS,
  CHORD_QUARTAL_REFERENCES,
  CHORD_QUARTAL_SCALE_NAMES,
  CHORD_GUIDE_TONE_QUALITIES,
  CHORD_GUIDE_TONE_FORMS,
  CHORD_GUIDE_TONE_INVERSIONS,
  CHORD_INVERSIONS,
  CHORD_FORMS,
  intervalToChordToken,
  spellChordNotes,
  normalizeScaleName,
  buildScaleIntervals,
  hexToRgb,
  isDark,
  parsePosCode,
  positionsForPitch,
  findRootFretsOnLowE,
} = AppMusicBasics;

import * as AppVoicingStudyCore from "./appVoicingStudyCore.js";
const {
  positionFormFromEffectiveForm,
} = AppVoicingStudyCore;

// --------------------------------------------------------------------------
// BLOQUE: PATRONES Y FORMAS SOBRE EL MÁSTIL
// --------------------------------------------------------------------------

// ------------------------
// Patrones "reales"
// ------------------------

// Pentatónicas: 5 boxes
export const PENTA_BOX_STARTS_FROM_ROOT = [0, 2, 4, 7, 9];
export const PENTA_BOX_OFFSETS = [
  // Box 1
  [[0, 3], [0, 3], [0, 2], [0, 2], [0, 2], [0, 3]],
  // Box 2
  [[1, 3], [1, 3], [0, 2], [0, 3], [0, 3], [1, 3]],
  // Box 3
  [[1, 3], [1, 4], [0, 3], [0, 3], [1, 3], [1, 3]],
  // Box 4
  [[0, 3], [1, 3], [0, 2], [0, 2], [0, 3], [0, 3]],
  // Box 5
  [[1, 3], [1, 3], [0, 2], [0, 3], [0, 3], [1, 3]],
];

export function _buildPentBoxPatternsMerged({ rootPc, maxFret }) {
  // Legacy (no usado en rutas/patrones actuales; mantenido por compatibilidad)
  const rootFrets = findRootFretsOnLowE(rootPc, maxFret);

  const merged = Array.from({ length: 5 }, (_, idx) => ({
    idx,
    name: `Box ${idx + 1}`,
    cells: new Set(),
  }));

  for (const rootFret of rootFrets) {
    for (let b = 0; b < 5; b++) {
      const posStart = rootFret + PENTA_BOX_STARTS_FROM_ROOT[b];
      for (let sIdx = 0; sIdx < 6; sIdx++) {
        for (const off of PENTA_BOX_OFFSETS[b][sIdx]) {
          const fret = posStart + off;
          if (fret < 0 || fret > maxFret) continue;
          merged[b].cells.add(`${sIdx}:${fret}`);
        }
      }
    }
  }

  return merged;
}

// 2NPS: 5 patrones para cualquier escala de 5 notas (pentatónicas mayor/menor)
export function _build2NpsPatternsMerged({ rootPc, scaleIntervals, maxFret }) {
  if (scaleIntervals.length !== 5) return [];

  const rootFrets = findRootFretsOnLowE(rootPc, maxFret);
  const deltas = scaleIntervals.map((_, i) => {
    const a = scaleIntervals[i];
    const b = scaleIntervals[(i + 1) % 5];
    const d = (b - a + 12) % 12;
    return d === 0 ? 12 : d;
  });

  const merged = Array.from({ length: 5 }, (_, idx) => ({
    idx,
    name: `2NPS ${idx + 1}`,
    cells: new Set(),
  }));

  for (const rootFret of rootFrets) {
    for (let p = 0; p < 5; p++) {
      const startFret = rootFret + scaleIntervals[p];
      if (startFret < 0 || startFret > maxFret) continue;

      const startPitch = pitchAt(5, startFret);

      // 12 pitches ascendiendo (2 por cuerda)
      const pitches = [startPitch];
      let curPitch = startPitch;
      let deg = p;
      for (let k = 1; k < 12; k++) {
        const step = deltas[deg % 5];
        curPitch += step;
        pitches.push(curPitch);
        deg = (deg + 1) % 5;
      }

      // 2 por cuerda, 6ª->1ª
      let idxPitch = 0;
      for (let sIdx = 5; sIdx >= 0; sIdx--) {
        const p1 = pitches[idxPitch++];
        const p2 = pitches[idxPitch++];

        const f1 = p1 - OPEN_MIDI[sIdx];
        const f2 = p2 - OPEN_MIDI[sIdx];

        for (const fret of [f1, f2]) {
          if (!Number.isInteger(fret)) continue;
          if (fret < 0 || fret > maxFret) continue;
          merged[p].cells.add(`${sIdx}:${fret}`);
        }
      }
    }
  }

  return merged;
}

// 3NPS: 7 patrones para una escala de 7 notas
export function build3NpsPatternsMerged({ rootPc, scaleIntervals, maxFret }) {
  if (scaleIntervals.length !== 7) return [];

  const rootFrets = findRootFretsOnLowE(rootPc, maxFret);
  const deltas = scaleIntervals.map((_, i) => {
    const a = scaleIntervals[i];
    const b = scaleIntervals[(i + 1) % 7];
    const d = (b - a + 12) % 12;
    return d === 0 ? 12 : d;
  });

  const merged = Array.from({ length: 7 }, (_, idx) => ({
    idx,
    name: `3NPS ${idx + 1}`,
    cells: new Set(),
  }));

  for (const rootFret of rootFrets) {
    for (let p = 0; p < 7; p++) {
      const startFret = rootFret + scaleIntervals[p];
      if (startFret < 0 || startFret > maxFret) continue;

      const startPitch = pitchAt(5, startFret);

      // 18 pitches ascendiendo
      const pitches = [startPitch];
      let curPitch = startPitch;
      let deg = p;
      for (let k = 1; k < 18; k++) {
        const step = deltas[deg % 7];
        curPitch += step;
        pitches.push(curPitch);
        deg = (deg + 1) % 7;
      }

      // 3 por cuerda, 6ª->1ª (sIdx 5..0)
      let idxPitch = 0;
      for (let sIdx = 5; sIdx >= 0; sIdx--) {
        const p1 = pitches[idxPitch++];
        const p2 = pitches[idxPitch++];
        const p3 = pitches[idxPitch++];

        const f1 = p1 - OPEN_MIDI[sIdx];
        const f2 = p2 - OPEN_MIDI[sIdx];
        const f3 = p3 - OPEN_MIDI[sIdx];

        for (const fret of [f1, f2, f3]) {
          if (!Number.isInteger(fret)) continue;
          if (fret < 0 || fret > maxFret) continue;
          merged[p].cells.add(`${sIdx}:${fret}`);
        }
      }
    }
  }

  return merged;
}

// --------------------------------------------------------------------------
// BLOQUE: PATRONES COMO INSTANCIAS (para rutas y continuidad)
// --------------------------------------------------------------------------

// ------------------------
// Patrones como *instancias* (clave para evitar saltos absurdos)
// ------------------------

export function _build2NpsPatternInstances({ rootPc, scaleIntervals, maxFret }) {
  if (scaleIntervals.length !== 5) return [];

  const rootFrets = findRootFretsOnLowE(rootPc, maxFret);
  const deltas = scaleIntervals.map((_, i) => {
    const a = scaleIntervals[i];
    const b = scaleIntervals[(i + 1) % 5];
    const d = (b - a + 12) % 12;
    return d === 0 ? 12 : d;
  });

  const instances = [];
  const seen = new Set();

  for (const rootFret of rootFrets) {
    for (let p = 0; p < 5; p++) {
      const startFret = rootFret + scaleIntervals[p];
      if (startFret < 0 || startFret > maxFret) continue;

      const key = `${p}@${startFret}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const startPitch = pitchAt(5, startFret);

      // 12 pitches ascendiendo (2 por cuerda)
      const pitches = [startPitch];
      let curPitch = startPitch;
      let deg = p;
      for (let k = 1; k < 12; k++) {
        const step = deltas[deg % 5];
        curPitch += step;
        pitches.push(curPitch);
        deg = (deg + 1) % 5;
      }

      const cells = new Set();
      let idxPitch = 0;
      for (let sIdx = 5; sIdx >= 0; sIdx--) {
        const p1 = pitches[idxPitch++];
        const p2 = pitches[idxPitch++];

        const f1 = p1 - OPEN_MIDI[sIdx];
        const f2 = p2 - OPEN_MIDI[sIdx];

        for (const fret of [f1, f2]) {
          if (!Number.isInteger(fret)) continue;
          if (fret < 0 || fret > maxFret) continue;
          cells.add(`${sIdx}:${fret}`);
        }
      }

      if (cells.size >= 8) {
        instances.push({
          typeIdx: p,
          anchorFret: startFret,
          rootFret,
          name: `2NPS ${p + 1} @${startFret}`,
          cells,
        });
      }
    }
  }

  return instances;
}

export function build3NpsPatternInstances({ rootPc, scaleIntervals, maxFret }) {
  if (scaleIntervals.length !== 7) return [];

  const rootFrets = findRootFretsOnLowE(rootPc, maxFret);
  const deltas = scaleIntervals.map((_, i) => {
    const a = scaleIntervals[i];
    const b = scaleIntervals[(i + 1) % 7];
    const d = (b - a + 12) % 12;
    return d === 0 ? 12 : d;
  });

  const instances = [];
  const seen = new Set();

  for (const rootFret of rootFrets) {
    for (let p = 0; p < 7; p++) {
      const startFret = rootFret + scaleIntervals[p];
      if (startFret < 0 || startFret > maxFret) continue;

      const key = `${p}@${startFret}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const startPitch = pitchAt(5, startFret);

      // 18 pitches ascendiendo
      const pitches = [startPitch];
      let curPitch = startPitch;
      let deg = p;
      for (let k = 1; k < 18; k++) {
        const step = deltas[deg % 7];
        curPitch += step;
        pitches.push(curPitch);
        deg = (deg + 1) % 7;
      }

      const cells = new Set();
      let idxPitch = 0;
      for (let sIdx = 5; sIdx >= 0; sIdx--) {
        const p1 = pitches[idxPitch++];
        const p2 = pitches[idxPitch++];
        const p3 = pitches[idxPitch++];

        const f1 = p1 - OPEN_MIDI[sIdx];
        const f2 = p2 - OPEN_MIDI[sIdx];
        const f3 = p3 - OPEN_MIDI[sIdx];

        for (const fret of [f1, f2, f3]) {
          if (!Number.isInteger(fret)) continue;
          if (fret < 0 || fret > maxFret) continue;
          cells.add(`${sIdx}:${fret}`);
        }
      }

      if (cells.size >= 12) {
        instances.push({
          typeIdx: p,
          anchorFret: startFret,
          rootFret,
          name: `3NPS ${p + 1} @${startFret}`,
          cells,
        });
      }
    }
  }

  return instances;
}

export function buildInstanceMembershipMap(instances) {
  // cellKey -> [instanceIndex...]
  const map = new Map();
  for (let i = 0; i < instances.length; i++) {
    for (const key of instances[i].cells) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    }
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => a - b);
    map.set(k, arr);
  }
  return map;
}

// --------------------------------------------------------------------------
// BLOQUE: CAGED
// --------------------------------------------------------------------------

// ------------------------
// CAGED (5 patrones)
// - No rompe lo existente: se añade como modo opcional.
// - Implementación "posicional": cada forma define una ventana de 5 trastes anclada en una raíz típica.
// ------------------------

export const CAGED_ORDER = ["C", "A", "G", "E", "D"];
export const CAGED_DEFS = [
  // En afinación estándar, las raíces típicas por forma:
  // C/A: raíz en 5ª cuerda (A string)
  // G/E: raíz en 6ª cuerda (E string)
  // D: raíz en 4ª cuerda (D string)
  // offsetStart = dónde empieza la ventana (relativo al traste de la raíz) según la forma abierta.
  { name: "C", typeIdx: 0, anchorSIdx: 4, offsetStart: -3 },
  { name: "A", typeIdx: 1, anchorSIdx: 4, offsetStart: 0 },
  { name: "G", typeIdx: 2, anchorSIdx: 5, offsetStart: -3 },
  { name: "E", typeIdx: 3, anchorSIdx: 5, offsetStart: 0 },
  { name: "D", typeIdx: 4, anchorSIdx: 3, offsetStart: 0 },
];

export function findRootFretsOnString({ rootPc, sIdx, maxFret }) {
  const out = [];
  const base = STRINGS[sIdx].pc;
  for (let fret = 0; fret <= maxFret; fret++) {
    if (mod12(base + fret) === mod12(rootPc)) out.push(fret);
  }
  return out;
}

export function buildCagedPatternInstances({ rootPc, scaleIntervals, maxFret }) {
  // CAGED funciona con cualquier conjunto de PCs (mayor, menor, modos, pentas, personalizada).
  const scalePcs = new Set(scaleIntervals.map((i) => mod12(rootPc + i)));
  const instances = [];

  for (const def of CAGED_DEFS) {
    const roots = findRootFretsOnString({ rootPc, sIdx: def.anchorSIdx, maxFret });

    for (const rootFret of roots) {
      // Ventana de 5 trastes. Si cae cerca de la cejuela, incluimos cuerda al aire (start=0)
      // en lugar de descartar la forma.
      const maxStart = Math.max(0, maxFret - 4);
      let start = rootFret + def.offsetStart;
      start = Math.max(0, Math.min(maxStart, start));
      if (start <= 1) start = 0; // asegura incluir traste 0 en 1ª posición
      let end = Math.min(maxFret, start + 4);

      const cells = new Set();
      for (let sIdx = 0; sIdx < 6; sIdx++) {
        for (let fret = start; fret <= end; fret++) {
          const pc = mod12(STRINGS[sIdx].pc + fret);
          if (scalePcs.has(pc)) cells.add(`${sIdx}:${fret}`);
        }
      }

      // Evita instancias demasiado vacías
      if (cells.size >= 10) {
        instances.push({
          typeIdx: def.typeIdx,
          letter: def.name,
          anchorFret: rootFret, // traste donde cae la raíz del shape (cuerda ancla)
          windowStart: start,
          windowEnd: end,
          rootFret,
          name: `CAGED ${def.name} @${start}`,
          cells,
        });
      }
    }
  }

  return instances;
}

export function pickCagedViewPatterns({ instances, maxFret }) {
  // Queremos 5 shapes *posicionales* (una ventana por letra), NO la unión de todas las copias.
  // Si un shape existe en varias posiciones dentro del rango, elegimos una instancia "representativa"
  // para evitar fondos alternos por solapamientos masivos.
  const usableMaxStart = Math.max(0, maxFret - 4);
  const targets = [0, 1, 2, 3, 4].map((k) => Math.round((k * usableMaxStart) / 4));

  const chosen = [];
  for (let t = 0; t < 5; t++) {
    const letter = CAGED_ORDER[t];
    const def = CAGED_DEFS.find((d) => d.name === letter);
    if (!def) continue;

    const cands = instances
      .filter((x) => x.letter === letter)
      .filter((x) => x.windowStart >= 0 && x.windowStart <= usableMaxStart)
      .sort((a, b) => {
        const da = Math.abs(a.windowStart - targets[t]);
        const db = Math.abs(b.windowStart - targets[t]);
        if (da !== db) return da - db;
        return a.windowStart - b.windowStart;
      });

    const inst = cands[0];
    if (!inst) continue;

    chosen.push({
      idx: def.typeIdx, // 0..4 (C,A,G,E,D)
      name: `CAGED ${letter}`,
      cells: inst.cells,
      windowStart: inst.windowStart,
    });
  }

  return chosen;
}

export function _mergeCagedInstancesToPatterns(instances) {
  const patterns = CAGED_DEFS.map((d) => ({ idx: d.typeIdx, name: `CAGED ${d.name}`, cells: new Set() }));
  for (const inst of instances) {
    const p = patterns[inst.typeIdx];
    if (!p) continue;
    for (const key of inst.cells) p.cells.add(key);
  }
  // Orden C-A-G-E-D
  return CAGED_ORDER.map((letter) => patterns.find((p) => p.name.endsWith(letter))).filter(Boolean);
}

// --------------------------------------------------------------------------
// BLOQUE: CAJAS PENTATÓNICAS
// --------------------------------------------------------------------------

// ------------------------
// Pentatónicas: cajas (5 boxes) por ventanas de 5 trastes
// NOTA: en pentatónicas el concepto "box" es posicional; dejamos 2–3 notas/cuerda según ventana.
// ------------------------

// Pentatónicas: offsets de inicio de las 5 cajas (relativos a la raíz en 6ª cuerda)
// - Menor: patrón típico 0,3,5,7,10
// - Mayor: patrón típico 0,2,4,7,9
export const PENTA_BOX_START_OFFSETS_MINOR = [0, 3, 5, 7, 10];
export const PENTA_BOX_START_OFFSETS_MAJOR = [0, 2, 4, 7, 9];

export function buildPentatonicBoxInstances({ rootPc, scaleIntervals, maxFret }) {
  if (scaleIntervals.length !== 5) return [];

  const scalePcs = new Set(scaleIntervals.map((i) => mod12(rootPc + i)));
  const rootFrets = findRootFretsOnLowE(rootPc, maxFret);

  const instances = [];
  const seen = new Set();

  const isMajorPenta =
    scaleIntervals.length === 5 &&
    scaleIntervals.every((v, i) => v === [0, 2, 4, 7, 9][i]);
  const isMinorPenta =
    scaleIntervals.length === 5 &&
    scaleIntervals.every((v, i) => v === [0, 3, 5, 7, 10][i]);

  const startOffsets = isMajorPenta
    ? PENTA_BOX_START_OFFSETS_MAJOR
    : isMinorPenta
      ? PENTA_BOX_START_OFFSETS_MINOR
      : PENTA_BOX_START_OFFSETS_MINOR;

  for (const rf of rootFrets) {
    for (let b = 0; b < 5; b++) {
      const boxStart = rf + startOffsets[b];
      if (boxStart < 0 || boxStart > maxFret) continue;
      const boxEnd = Math.min(maxFret, boxStart + 4);

      const key = `${b}@${boxStart}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const cells = new Set();

      for (let sIdx = 0; sIdx < 6; sIdx++) {
        const frets = [];
        for (let f = boxStart; f <= boxEnd; f++) {
          const pc = mod12(STRINGS[sIdx].pc + f);
          if (scalePcs.has(pc)) frets.push(f);
        }

        // Bordes: extendemos 1 traste si faltan notas
        if (frets.length < 2) {
          for (const f of [boxStart - 1, boxEnd + 1]) {
            if (f < 0 || f > maxFret) continue;
            const pc = mod12(STRINGS[sIdx].pc + f);
            if (scalePcs.has(pc)) frets.push(f);
          }
        }

        const uniq = Array.from(new Set(frets.filter((x) => x >= 0 && x <= maxFret))).sort((a, b) => a - b);

        // Para que sea "box" real: 2 notas por cuerda.
        // Si hay 3 (pasos 2-2), cogemos extremos (borde inferior y superior)
        // para no "rellenar" el patrón.
        const pick = uniq.length <= 2 ? uniq : [uniq[0], uniq[uniq.length - 1]];
        pick.forEach((x) => cells.add(`${sIdx}:${x}`));
      }

      if (cells.size >= 10) {
        instances.push({ typeIdx: b, anchorFret: boxStart, rootFret: rf, name: `Box ${b + 1} @${boxStart}`, cells });
      }
    }
  }

  return instances;
}

export function mergeInstancesToPatterns(instances, typeCount, namePrefix) {
  const patterns = Array.from({ length: typeCount }, (_, idx) => ({ idx, name: `${namePrefix} ${idx + 1}`, cells: new Set() }));
  for (const inst of instances) {
    if (inst.typeIdx == null) continue;
    if (inst.typeIdx < 0 || inst.typeIdx >= typeCount) continue;
    for (const key of inst.cells) patterns[inst.typeIdx].cells.add(key);
  }
  return patterns;
}

// ------------------------
// Ruta musical
// ------------------------

// ============================================================================
// RUTA MUSICAL
// ============================================================================

export function buildPitchSequence({ rootPc, scaleIntervals, startPitch, endPitch }) {
  if (scaleIntervals.length < 2) return { pitches: [], dir: 0, error: "Escala demasiado corta" };
  if (startPitch === endPitch) return { pitches: [startPitch], dir: 0, error: "Mismo tono" };

  const dir = endPitch > startPitch ? 1 : -1;
  const idxMap = new Map(scaleIntervals.map((x, i) => [mod12(x), i]));
  const n = scaleIntervals.length;

  const startI = mod12(startPitch - rootPc);
  const endI = mod12(endPitch - rootPc);
  if (!idxMap.has(startI) || !idxMap.has(endI)) {
    return { pitches: [], dir, error: "Inicio y/o fin no están en la escala" };
  }

  const pitches = [startPitch];
  let p = startPitch;
  let guard = 0;

  while ((dir === 1 && p < endPitch) || (dir === -1 && p > endPitch)) {
    const i = mod12(p - rootPc);
    const idx = idxMap.get(i);
    if (idx === undefined) return { pitches: [], dir, error: "Ruta cayó fuera de la escala" };

    const nextIdx = (idx + (dir === 1 ? 1 : -1) + n) % n;
    const nextI = mod12(scaleIntervals[nextIdx]);

    let delta;
    if (dir === 1) delta = (nextI - i + 12) % 12;
    else delta = (i - nextI + 12) % 12;
    if (delta === 0) delta = 12;

    p = p + dir * delta;
    pitches.push(p);

    guard++;
    if (guard > 300) return { pitches: [], dir, error: "Ruta demasiado larga" };
  }

  if (p !== endPitch) return { pitches: [], dir, error: "No se puede llegar siguiendo la escala" };

  return { pitches, dir, error: null };
}

export function movementCost(a, b) {
  const ds = Math.abs(a.sIdx - b.sIdx);
  const df = Math.abs(a.fret - b.fret);

  // Penaliza saltos grandes (pero deja que existan)
  const farStringPenalty = ds > 1 ? (ds - 1) * 6 : 0;
  const farFretPenalty = df > 4 ? (df - 4) * 2.0 : 0;

  // Bonus por "slide"/continuidad en la misma cuerda con saltos pequeños
  const sameStringBonus = ds === 0 ? (df <= 1 ? 0.6 : df === 2 ? 0.25 : 0) : 0;

  const base = df + 1.2 * ds + farStringPenalty + farFretPenalty - sameStringBonus;
  return Math.max(0.05, base);
}

export function cleanUiText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

export function nearestControlLabel(el) {
  let node = el;
  while (node && node !== document.body) {
    const wrappingLabel = node.closest && node.closest("label");
    const wrappingText = cleanUiText((wrappingLabel && wrappingLabel.textContent) || "");
    if (wrappingText) return wrappingText;

    const parent = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const idx = siblings.indexOf(node);
      for (let i = idx - 1; i >= 0; i--) {
        const sib = siblings[i];
        const direct = sib.matches && sib.matches("label") ? sib : null;
        const nested = sib.querySelector ? sib.querySelector("label") : null;
        const text = cleanUiText(((direct || nested) && (direct || nested).textContent) || "");
        if (text) return text;
      }
    }

    node = node.parentElement;
  }
  return "";
}

export function inferControlTitle(el) {
  const existing = cleanUiText(el.getAttribute && el.getAttribute("title"));
  if (existing) return existing;

  const tag = String(el.tagName || "").toLowerCase();
  const type = String((el.getAttribute && el.getAttribute("type")) || "").toLowerCase();
  const ownText = cleanUiText(el.textContent || "");
  const label = nearestControlLabel(el);
  const labelNorm = cleanUiText(label).toLowerCase();

  if (tag === "select") {
    if (labelNorm.startsWith("nota raíz")) return "Elige la tónica de la escala.";
    if (labelNorm === "escala") return "Selecciona la escala o modo activo.";
    if (labelNorm === "trastes") return "Define hasta qué traste se muestra el mástil.";
    if (labelNorm === "tono") return "Elige la nota base del acorde.";
    if (labelNorm.startsWith("calidad")) return "Elige la calidad del acorde y, si quieres, una suspensión.";
    if (labelNorm === "estructura") return "Elige si trabajas con 3, 4 o más notas.";
    if (labelNorm === "forma") return "Elige la disposición del acorde: cerrado, abierto o drop.";
    if (labelNorm.startsWith("inversión")) return "Elige qué nota del acorde queda en el bajo.";
    if (labelNorm.startsWith("voicing")) return "Selecciona una digitación concreta del acorde actual.";
    if (labelNorm.startsWith("digitación en rango")) return "Selecciona una digitación dentro del rango de trastes.";
    if (labelNorm === "dist.") return "Limita la distancia máxima entre el primer y el último traste.";
    if (labelNorm === "modo ruta") return "Define cómo se calcula la ruta musical.";
    if (labelNorm === "patrón") return "Fija un patrón concreto o deja la elección automática.";
    if (labelNorm.startsWith("máx. notas")) return "Limita cuántas notas consecutivas puede tocar la ruta en una misma cuerda.";
    if (labelNorm === "inicio") return "Traste inicial del rango visible en acordes cercanos.";
    if (labelNorm === "tamaño") return "Cantidad de trastes que abarca el rango visible.";
    return label || "Seleccionar";
  }

  if (tag === "input" && type === "color") return label ? (label + ": elegir color") : "Elegir color";
  if (tag === "input" && type === "checkbox") {
    if (labelNorm.includes("permitir cuerdas al aire")) return "Permite usar cuerdas al aire como opción de voicing. La distancia se calcula solo con las notas pisadas.";
    return label || "Activar o desactivar";
  }
  if (tag === "input") return label || "Introducir valor";

  if (tag === "button") {
    if (ownText === "Estudiar") return "Abre el análisis del acorde, del voicing y de sus tensiones.";
    if (ownText === "Auto") return "Deja que la aplicación elija automáticamente.";
    if (ownText === "Notas") return "Muestra el nombre de las notas.";
    if (ownText === "Intervalos") return "Muestra el grado o intervalo.";
    if (ownText === "Escala") return "Muestra u oculta el mástil de la escala.";
    if (ownText === "Patrones") return "Muestra u oculta el mástil de patrones.";
    if (ownText === "Ruta") return "Muestra u oculta el mástil de la ruta musical.";
    if (ownText === "Acordes") return "Muestra u oculta el panel de acordes.";
    if (ownText === "Ver todo") return "Muestra también las notas que no pertenecen a la escala.";
    if (ownText === "Extra ON" || ownText === "Extra OFF") return "Activa o desactiva las notas extra.";
    return label || ownText || "Botón";
  }

  return label || ownText || "";
}

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function sanitizeBoolValue(v, fallback) {
  return typeof v === "boolean" ? v : fallback;
}

export function sanitizeNumberValue(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function sanitizeOneOf(v, allowed, fallback) {
  return allowed.includes(v) ? v : fallback;
}

export function sanitizeColorValue(v, fallback) {
  return typeof v === "string" && HEX_COLOR_RE.test(v) ? v : fallback;
}

export function mixHexColors(baseHex, targetHex, weight = 0.5) {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);
  if (!base || !target) return baseHex || targetHex || "#ffffff";
  const ratio = Math.max(0, Math.min(1, Number(weight) || 0));
  const channel = (a, b) => Math.round((a * (1 - ratio)) + (b * ratio));
  const toHex = (value) => value.toString(16).padStart(2, "0");
  return `#${toHex(channel(base.r, target.r))}${toHex(channel(base.g, target.g))}${toHex(channel(base.b, target.b))}`;
}

export function unwrapPersistedPayload(raw) {
  if (raw && typeof raw === "object" && raw.config && typeof raw.config === "object") {
    return {
      version: Number(raw.version) || 0,
      config: raw.config,
    };
  }
  return {
    version: 0,
    config: raw && typeof raw === "object" ? raw : {},
  };
}

export function sanitizeNearSlotValue(value, fallback) {
  const slot = value && typeof value === "object" ? value : {};
  return {
    ...fallback,
    enabled: sanitizeBoolValue(slot.enabled, fallback.enabled),
    family: sanitizeOneOf(slot.family, CHORD_FAMILIES.map((x) => x.value), fallback.family || "tertian"),
    rootPc: sanitizeNumberValue(slot.rootPc, fallback.rootPc, 0, 11),
    quality: sanitizeOneOf(slot.quality, CHORD_QUALITIES.map((q) => q.value), fallback.quality),
    suspension: sanitizeOneOf(slot.suspension, ["none", "sus2", "sus4"], fallback.suspension),
    structure: sanitizeOneOf(slot.structure, CHORD_STRUCTURES.map((s) => s.value), fallback.structure),
    inversion: sanitizeOneOf(slot.inversion, CHORD_INVERSIONS.map((x) => x.value), fallback.inversion),
    form: sanitizeOneOf(slot.form, CHORD_FORMS.map((x) => x.value), fallback.form),
    positionForm: sanitizeOneOf(slot.positionForm, ["closed", "open"], positionFormFromEffectiveForm(slot.form, fallback.positionForm || "open")),
    ext7: sanitizeBoolValue(slot.ext7, fallback.ext7),
    ext6: sanitizeBoolValue(slot.ext6, fallback.ext6),
    ext9: sanitizeBoolValue(slot.ext9, fallback.ext9),
    ext11: sanitizeBoolValue(slot.ext11, fallback.ext11),
    ext13: sanitizeBoolValue(slot.ext13, fallback.ext13),
    quartalType: sanitizeOneOf(slot.quartalType, CHORD_QUARTAL_TYPES.map((x) => x.value), fallback.quartalType || "pure"),
    quartalVoices: sanitizeOneOf(String(slot.quartalVoices ?? ""), CHORD_QUARTAL_VOICES.map((x) => x.value), fallback.quartalVoices || "4"),
    quartalSpread: sanitizeOneOf(slot.quartalSpread, CHORD_QUARTAL_SPREADS.map((x) => x.value), fallback.quartalSpread || "closed"),
    quartalReference: sanitizeOneOf(slot.quartalReference, CHORD_QUARTAL_REFERENCES.map((x) => x.value), fallback.quartalReference || "root"),
    quartalScaleName: sanitizeOneOf(normalizeScaleName(slot.quartalScaleName), CHORD_QUARTAL_SCALE_NAMES, fallback.quartalScaleName || "Mayor"),
    guideToneQuality: sanitizeOneOf(slot.guideToneQuality, CHORD_GUIDE_TONE_QUALITIES.map((x) => x.value), fallback.guideToneQuality || "maj7"),
    guideToneForm: sanitizeOneOf(slot.guideToneForm, CHORD_GUIDE_TONE_FORMS.map((x) => x.value), fallback.guideToneForm || "closed"),
    guideToneInversion: sanitizeOneOf(slot.guideToneInversion, CHORD_GUIDE_TONE_INVERSIONS.map((x) => x.value), fallback.guideToneInversion || "all"),
    spellPreferSharps: sanitizeBoolValue(slot.spellPreferSharps, fallback.spellPreferSharps),
    maxDist: sanitizeOneOf(Number(slot.maxDist), [4, 5, 6], fallback.maxDist),
    allowOpenStrings: sanitizeBoolValue(slot.allowOpenStrings, fallback.allowOpenStrings),
    selFrets: typeof slot.selFrets === "string" || slot.selFrets == null ? slot.selFrets : fallback.selFrets,
  };
}

export function sanitizePresetCollection(raw, {
  quickPresetCount = 3,
  uiConfigVersion = 1,
  appVersion = "",
} = {}) {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length: quickPresetCount }, (_, i) => {
    const item = arr[i];
    if (!item || typeof item !== "object") return null;
    const payload = unwrapPersistedPayload(item.payload || item).config;
    if (!payload || typeof payload !== "object") return null;
    return {
      name: typeof item.name === "string" && cleanUiText(item.name) ? cleanUiText(item.name).slice(0, 40) : `Preset ${i + 1}`,
      savedAt: typeof item.savedAt === "string" ? item.savedAt : "",
      payload: {
        version: uiConfigVersion,
        appVersion,
        config: payload,
      },
    };
  });
}

export const ROUTE_LAB_DEFAULT_TUNING = {
  sameStringDirectionalBonusNear: 1.35,
  sameStringDirectionalBonusFar: 0.7,
  switchWhenSameStringForwardPenalty: 3.1,
  worseThanSameStringGoalBase: 4.6,
  worseThanSameStringGoalScale: 1.75,
  corridorPenalty: 1.25,
  openStringWithAlternativePenalty: 4.2,
  overshootNearEndAlt: 8.5,
  overshootNearEndNoAlt: 4.0,
  overshootTwoStepsAlt: 5.5,
  overshootTwoStepsNoAlt: 2.4,
  overshootMidAlt: 3.0,
  overshootMidNoAlt: 1.2,
  templateStayBonus: 1.2,
  templateEnterBonus: 0.55,
  templateNeighborBonus: 0.4,
  templateMissPenalty: 1.1,
  resolveToGoalBonus: 1.8,
  lateStringBreakBonus: 2.8,
  lateSameStringPenalty: 6.5,
  lateOvershootPenalty: 10.5,
};

export const ROUTE_LAB_FIXED_TESTS = [
  {
    id: "penta_major_f_63_110",
    label: "Penta mayor F · 63 \u2192 110",
    rootPc: 5,
    scaleName: "Pentatónica mayor",
    startCode: "63",
    endCode: "110",
    maxFret: 15,
    maxPerString: 4,
    checks: [
      { type: "excludeCode", code: "212", severity: "soft" },
      { type: "excludeCode", code: "412", severity: "soft" },
    ],
  },
  {
    id: "penta_major_f_11_110",
    label: "Penta mayor F · 11 \u2192 110",
    rootPc: 5,
    scaleName: "Pentatónica mayor",
    startCode: "11",
    endCode: "110",
    maxFret: 15,
    maxPerString: 4,
    checks: [],
  },
  {
    id: "major_f_11_112",
    label: "Mayor F · 11 \u2192 112",
    rootPc: 5,
    scaleName: "Mayor",
    startCode: "11",
    endCode: "112",
    maxFret: 15,
    maxPerString: 4,
    checks: [],
  },
  {
    id: "minor_natural_f_61_113",
    label: "Menor natural F · 61 \u2192 113",
    rootPc: 5,
    scaleName: "Menor natural",
    startCode: "61",
    endCode: "113",
    maxFret: 15,
    maxPerString: 4,
    checks: [],
  },
  {
    id: "blues_minor_f_61_17",
    label: "Blues menor F · 61 \u2192 17",
    rootPc: 5,
    scaleName: "Pentatónica menor + blue note",
    startCode: "61",
    endCode: "17",
    maxFret: 15,
    maxPerString: 4,
    checks: [],
  },
  {
    id: "bebop_major_f_10_63",
    label: "Bebop mayor F · 10 \u2192 63",
    rootPc: 5,
    scaleName: "Bebop mayor",
    startCode: "10",
    endCode: "63",
    maxFret: 15,
    maxPerString: 4,
    checks: [],
  },
];

export const ROUTE_LAB_BENCHMARK_SPECS = [
  { scaleName: "Pentatónica mayor", rootPc: 5, maxFret: 15, maxPerString: 4, targetAsc: 12 },
  { scaleName: "Pentatónica menor", rootPc: 5, maxFret: 15, maxPerString: 4, targetAsc: 12 },
  { scaleName: "Mayor", rootPc: 5, maxFret: 15, maxPerString: 4, targetAsc: 12 },
  { scaleName: "Menor natural", rootPc: 5, maxFret: 15, maxPerString: 4, targetAsc: 12 },
  { scaleName: "Pentatónica menor + blue note", rootPc: 5, maxFret: 15, maxPerString: 4, targetAsc: 10 },
  { scaleName: "Bebop mayor", rootPc: 5, maxFret: 15, maxPerString: 4, targetAsc: 10 },
];

export function routeLabTemplateFamily(scaleName, scaleIntervals) {
  const normalized = normalizeScaleName(scaleName || "");
  if (normalized.startsWith("Pentatónica") && scaleIntervals.length >= 5) return "penta";
  if (normalized.startsWith("Bebop")) return "bebop";
  if ((normalized === "Mayor" || normalized === "Menor natural") && scaleIntervals.length === 7) return "major_minor";
  return null;
}

export function routeLabTemplateCorridorHits(cells, startPos, endPos) {
  const minString = Math.min(startPos.sIdx, endPos.sIdx);
  const maxString = Math.max(startPos.sIdx, endPos.sIdx);
  const minFret = Math.min(startPos.fret, endPos.fret) - 2;
  const maxFret = Math.max(startPos.fret, endPos.fret) + 2;
  let hits = 0;

  for (const cell of cells || []) {
    const [sStr, fStr] = String(cell).split(":");
    const sIdx = parseInt(sStr, 10);
    const fret = parseInt(fStr, 10);
    if (!Number.isFinite(sIdx) || !Number.isFinite(fret)) continue;
    if (sIdx < minString || sIdx > maxString) continue;
    if (fret < minFret || fret > maxFret) continue;
    hits += 1;
  }

  return hits;
}

export function _buildRouteLabTemplateContext({ rootPc, scaleName, scaleIntervals, maxFret, startPos, endPos }) {
  const family = routeLabTemplateFamily(scaleName, scaleIntervals);
  if (!family || !startPos || !endPos) {
    return { enabled: false, family: null, instances: [], preferredIds: new Set(), membership: new Map(), anchorById: new Map(), stringCountById: new Map() };
  }

  const instances = family === "penta"
    ? buildPentatonicBoxInstances({ rootPc, scaleIntervals, maxFret })
    : build3NpsPatternInstances({ rootPc, scaleIntervals, maxFret });

  if (!instances.length) {
    return { enabled: false, family, instances: [], preferredIds: new Set(), membership: new Map(), anchorById: new Map(), stringCountById: new Map() };
  }

  const startKey = `${startPos.sIdx}:${startPos.fret}`;
  const endKey = `${endPos.sIdx}:${endPos.fret}`;

  const ranked = instances
    .map((inst, idx) => {
      const anchor = inst.anchorFret ?? inst.rootFret ?? inst.windowStart ?? 0;
      const hasStart = inst.cells.has(startKey);
      const hasEnd = inst.cells.has(endKey);
      const corridorHits = routeLabTemplateCorridorHits(inst.cells, startPos, endPos);
      const startDist = Math.abs(anchor - startPos.fret);
      const endDist = Math.abs(anchor - endPos.fret);
      const score =
        (hasStart ? 10 : 0) +
        (hasEnd ? 8 : 0) +
        (corridorHits * 0.35) -
        (startDist * 0.55) -
        (endDist * 0.3);

      return { idx, anchor, score };
    })
    .sort((a, b) => b.score - a.score || a.anchor - b.anchor);

  const chosen = ranked.filter((item, idx) => item.score > 0 || idx < 3).slice(0, 4);
  if (!chosen.length && ranked.length) chosen.push(ranked[0]);

  const preferredIds = new Set(chosen.map((item) => item.idx));
  const membership = new Map();
  const anchorById = new Map();

  for (const item of chosen) {
    anchorById.set(item.idx, item.anchor);
    for (const cell of instances[item.idx].cells) {
      if (!membership.has(cell)) membership.set(cell, []);
      membership.get(cell).push(item.idx);
    }
  }

  for (const [cell, ids] of membership.entries()) {
    membership.set(cell, ids.sort((a, b) => a - b));
  }

    const stringCountById = new Map();
  for (const item of chosen) {
    const counts = [0, 0, 0, 0, 0, 0];
    for (const cell of instances[item.idx].cells) {
      const [sStr] = String(cell).split(":");
      const sIdx = parseInt(sStr, 10);
      if (Number.isFinite(sIdx) && sIdx >= 0 && sIdx < 6) counts[sIdx] += 1;
    }
    stringCountById.set(item.idx, counts);
  }

  return {
    enabled: preferredIds.size > 0,
    family,
    instances,
    preferredIds,
    membership,
    anchorById,
    stringCountById,
  };
}

export function inferRouteLabPreferredNotesPerString(scaleName, scaleIntervals, requestedMax) {
  const normalized = normalizeScaleName(scaleName || "");
  const requested = Math.max(1, Math.min(5, Number(requestedMax) || 3));

  const isCompactFamily = normalized.includes("Pentatónica") || normalized.includes("blue note") || scaleIntervals.length <= 6;
  const isLinearFamily = normalized.includes("Bebop") || scaleIntervals.length >= 7;

  let nativeTarget = requested;
  if (isCompactFamily) nativeTarget = 2;
  else if (isLinearFamily) nativeTarget = 3;

  const phraseTarget = nativeTarget;
  const softTarget = Math.min(4, Math.max(nativeTarget, requested));
  const hardLimit = Math.min(4, Math.max(softTarget, nativeTarget + 1));

  return {
    nativeTarget,
    requested,
    phraseTarget,
    softTarget,
    hardLimit,
  };
}

export function routeLabCodesFromPath(path) {
  return (Array.isArray(path) ? path : []).map((n) => `${n.sIdx + 1}${n.fret}`);
}

export function routeLabMaxRun(path) {
  const list = Array.isArray(path) ? path : [];
  if (!list.length) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < list.length; i++) {
    if (list[i].sIdx === list[i - 1].sIdx) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}

export function routeLabFretReversalCount(path) {
  const list = Array.isArray(path) ? path : [];
  let prevSign = 0;
  let count = 0;

  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1];
    const cur = list[i];
    const df = cur.fret - prev.fret;
    const ds = Math.abs(cur.sIdx - prev.sIdx);
    if (df === 0) continue;

    const sign = df > 0 ? 1 : -1;
    const guitaristicDiagonal = ds === 1 && Math.abs(df) <= 3;

    if (guitaristicDiagonal) continue;

    if (prevSign !== 0 && sign !== prevSign) count += 1;
    prevSign = sign;
  }

  return count;
}

export function routeLabHasAdjacentSequence(codes, seq) {
  const list = Array.isArray(codes) ? codes : [];
  const wanted = Array.isArray(seq) ? seq : [];
  if (!wanted.length || wanted.length > list.length) return false;
  for (let i = 0; i <= list.length - wanted.length; i++) {
    let ok = true;
    for (let j = 0; j < wanted.length; j++) {
      if (list[i + j] !== wanted[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function routeLabGoalSideOvershootCount(path, startPos, endPos) {
  const list = Array.isArray(path) ? path : [];
  const fretDir = endPos?.fret === startPos?.fret ? 0 : (endPos?.fret > startPos?.fret ? 1 : -1);
  if (!list.length || fretDir === 0) return 0;
  let count = 0;
  for (let i = 1; i < list.length - 1; i++) {
    const fret = list[i]?.fret;
    if (!Number.isFinite(fret)) continue;
    if (fretDir > 0 && fret > endPos.fret) count += 1;
    if (fretDir < 0 && fret < endPos.fret) count += 1;
  }
  return count;
}

export function evaluateRouteLabGenericQuality({ result, startPos, endPos, scaleName, scaleIntervals, maxPerString }) {
  const phrasing = inferRouteLabPreferredNotesPerString(scaleName, scaleIntervals, maxPerString);
  const maxRun = routeLabMaxRun(result.path);
  const reversals = routeLabFretReversalCount(result.path);
  const overshootCount = routeLabGoalSideOvershootCount(result.path, startPos, endPos);
  const hardFailures = [];
  const softFailures = [];

  if (result.reason) hardFailures.push(result.reason);

  if (!result.reason && maxRun > phrasing.hardLimit) {
    hardFailures.push(`Bloque máximo ${maxRun} > ${phrasing.hardLimit}`);
  } else if (!result.reason && maxRun > phrasing.softTarget) {
    softFailures.push(`Bloque máximo ${maxRun} > ${phrasing.softTarget}`);
  }

  if (!result.reason && reversals > 2) softFailures.push(`Retrocesos ${reversals} > 2`);
  else if (!result.reason && reversals > 1) softFailures.push(`Retrocesos ${reversals} > 1`);

  if (!result.reason && overshootCount > 1) softFailures.push(`Se pasa del objetivo ${overshootCount} veces`);
  else if (!result.reason && overshootCount > 0) softFailures.push(`Se pasa del objetivo ${overshootCount} vez`);

  return {
    maxRun,
    reversals,
    overshootCount,
    hardFailures,
    softFailures,
    metrics: {
      noRoute: !!result.reason,
      runHard: !result.reason && maxRun > phrasing.hardLimit,
      reversalHard: false,
      runWarn: !result.reason && maxRun > phrasing.softTarget && maxRun <= phrasing.hardLimit,
      reversalWarn: !result.reason && reversals > 1,
      overshootWarn: !result.reason && overshootCount > 0,
    },
  };
}

export function evaluateRouteLabFixedTest(test, tuning = ROUTE_LAB_DEFAULT_TUNING) {
  const intervals = buildScaleIntervals(test.scaleName, "", test.rootPc);
  const startPos = parsePosCode(test.startCode);
  const endPos = parsePosCode(test.endCode);
  const result = computeRouteLab({
    rootPc: test.rootPc,
    scaleName: test.scaleName,
    scaleIntervals: intervals,
    maxFret: test.maxFret,
    startPos,
    endPos,
    maxNotesPerString: test.maxPerString,
    tuning,
  });

  const codes = routeLabCodesFromPath(result.path);
  const generic = evaluateRouteLabGenericQuality({
    result,
    startPos,
    endPos,
    scaleName: test.scaleName,
    scaleIntervals: intervals,
    maxPerString: test.maxPerString,
  });

  const hardFailures = [...generic.hardFailures];
  const softFailures = [...generic.softFailures];

  const pushFailure = (severity, text) => {
    if (severity === "soft") softFailures.push(text);
    else hardFailures.push(text);
  };

  for (const check of test.checks || []) {
    const severity = check.severity || "hard";
    if (check.type === "includeSeq" && !routeLabHasAdjacentSequence(codes, check.seq)) {
      pushFailure(severity, `Falta ${check.seq.join(" \u2192 ")}`);
    }
    if (check.type === "excludeSeq" && routeLabHasAdjacentSequence(codes, check.seq)) {
      pushFailure(severity, `Sobra ${check.seq.join(" \u2192 ")}`);
    }
    if (check.type === "excludeCode" && codes.includes(check.code)) {
      pushFailure(severity, `Incluye ${check.code}`);
    }
  }

  return {
    ...test,
    result,
    codes,
    text: codes.join(" \u2192 "),
    maxRun: generic.maxRun,
    reversals: generic.reversals,
    overshootCount: generic.overshootCount,
    ok: hardFailures.length === 0,
    warning: hardFailures.length === 0 && softFailures.length > 0,
    failures: [...hardFailures, ...softFailures],
    hardFailures,
    softFailures,
    metrics: generic.metrics,
  };
}

export function _runRouteLabFixedTests(tuning = ROUTE_LAB_DEFAULT_TUNING) {
  return ROUTE_LAB_FIXED_TESTS.map((test) => evaluateRouteLabFixedTest(test, tuning));
}

export function _summarizeRouteLabFixedResults(results) {
  const total = results.length;
  const passed = results.filter((x) => x.ok && !x.warning).length;
  const warning = results.filter((x) => x.warning).length;
  const failed = results.filter((x) => !x.ok).length;
  return { total, passed, warning, failed };
}

export function buildRouteLabScalePositions({ rootPc, scaleName, maxFret }) {
  const intervals = buildScaleIntervals(scaleName, "", rootPc);
  const scalePcSet = new Set(intervals.map((i) => mod12(rootPc + i)));
  const positions = [];
  for (let sIdx = 0; sIdx < 6; sIdx++) {
    for (let fret = 0; fret <= Math.min(maxFret, 12); fret++) {
      const pc = mod12(STRINGS[sIdx].pc + fret);
      if (!scalePcSet.has(pc)) continue;
      positions.push({
        sIdx,
        fret,
        pc,
        pitch: pitchAt(sIdx, fret),
        code: `${sIdx + 1}${fret}`,
      });
    }
  }
  positions.sort((a, b) => a.pitch - b.pitch || a.sIdx - b.sIdx || a.fret - b.fret);
  return { intervals, positions };
}

export function _buildRouteLabBenchmarkCases() {
  const out = [];

  for (const spec of ROUTE_LAB_BENCHMARK_SPECS) {
    const { positions } = buildRouteLabScalePositions(spec);
    if (positions.length < 8) continue;

    const lowCutPitch = positions[Math.max(0, Math.floor((positions.length - 1) * 0.35))]?.pitch ?? positions[positions.length - 1].pitch;
    const highCutPitch = positions[Math.max(0, Math.floor((positions.length - 1) * 0.65))]?.pitch ?? positions[0].pitch;
    const lowPool = positions.filter((p) => p.pitch <= lowCutPitch);
    const highPool = positions.filter((p) => p.pitch >= highCutPitch);
    const asc = [];
    const seen = new Set();

    for (let i = 0; i < lowPool.length && asc.length < (spec.targetAsc || 12); i += 2) {
      const start = lowPool[i];
      for (let j = 0; j < highPool.length && asc.length < (spec.targetAsc || 12); j += 2) {
        const end = highPool[j];
        const pitchGap = end.pitch - start.pitch;
        const stringGap = Math.abs(end.sIdx - start.sIdx);
        if (pitchGap < 7 || pitchGap > 19) continue;
        if (stringGap < 2) continue;
        if (start.code === end.code) continue;

        const key = `${spec.scaleName}|${start.code}|${end.code}`;
        if (seen.has(key)) continue;
        seen.add(key);
        asc.push({
          id: key,
          label: `${spec.scaleName} · ${start.code} \u2192 ${end.code}`,
          rootPc: spec.rootPc,
          scaleName: spec.scaleName,
          startCode: start.code,
          endCode: end.code,
          maxFret: spec.maxFret,
          maxPerString: spec.maxPerString,
        });
      }
    }

    const desc = asc.map((item) => ({
      ...item,
      id: `${item.id}|desc`,
      label: `${item.scaleName} · ${item.endCode} \u2192 ${item.startCode}`,
      startCode: item.endCode,
      endCode: item.startCode,
    }));

    out.push(...asc, ...desc);
  }

  return out;
}

export function evaluateRouteLabBenchmarkCase(test, tuning = ROUTE_LAB_DEFAULT_TUNING) {
  const intervals = buildScaleIntervals(test.scaleName, "", test.rootPc);
  const startPos = parsePosCode(test.startCode);
  const endPos = parsePosCode(test.endCode);
  const result = computeRouteLab({
    rootPc: test.rootPc,
    scaleName: test.scaleName,
    scaleIntervals: intervals,
    maxFret: test.maxFret,
    startPos,
    endPos,
    maxNotesPerString: test.maxPerString,
    tuning,
  });
  const generic = evaluateRouteLabGenericQuality({
    result,
    startPos,
    endPos,
    scaleName: test.scaleName,
    scaleIntervals: intervals,
    maxPerString: test.maxPerString,
  });

  return {
    ...test,
    result,
    text: routeLabCodesFromPath(result.path).join(" \u2192 "),
    maxRun: generic.maxRun,
    reversals: generic.reversals,
    overshootCount: generic.overshootCount,
    ok: generic.hardFailures.length === 0,
    warning: generic.hardFailures.length === 0 && generic.softFailures.length > 0,
    hardFailures: generic.hardFailures,
    softFailures: generic.softFailures,
    metrics: generic.metrics,
  };
}

export function _summarizeRouteLabBenchmark(cases, tuning = ROUTE_LAB_DEFAULT_TUNING) {
  const results = cases.map((test) => evaluateRouteLabBenchmarkCase(test, tuning));
  const byScaleMap = new Map();

  for (const item of results) {
    if (!byScaleMap.has(item.scaleName)) {
      byScaleMap.set(item.scaleName, { scaleName: item.scaleName, total: 0, passed: 0, warning: 0, failed: 0 });
    }
    const row = byScaleMap.get(item.scaleName);
    row.total += 1;
    if (!item.ok) row.failed += 1;
    else if (item.warning) row.warning += 1;
    else row.passed += 1;
  }

  const total = results.length;
  const passed = results.filter((x) => x.ok && !x.warning).length;
  const warning = results.filter((x) => x.warning).length;
  const failed = results.filter((x) => !x.ok).length;
  const noRoute = results.filter((x) => x.metrics.noRoute).length;
  const overshootWarnings = results.filter((x) => x.metrics.overshootWarn).length;
  const runWarnings = results.filter((x) => x.metrics.runWarn || x.metrics.runHard).length;
  const reversalWarnings = results.filter((x) => x.metrics.reversalWarn || x.metrics.reversalHard).length;

  return {
    total,
    passed,
    warning,
    failed,
    noRoute,
    overshootWarnings,
    runWarnings,
    reversalWarnings,
    byScale: Array.from(byScaleMap.values()),
    results,
  };
}

export function buildRouteLabPitchLine({ rootPc, scaleIntervals, startPitch, endPitch }) {
  const ordered = Array.from(new Set((scaleIntervals || []).map(mod12))).sort((a, b) => a - b);
  if (ordered.length < 2) return { pitches: [], pitchDirection: 0, error: "Escala demasiado corta" };
  if (startPitch === endPitch) return { pitches: [startPitch], pitchDirection: 0, error: null };

  const startRel = mod12(startPitch - rootPc);
  const endRel = mod12(endPitch - rootPc);
  const startIdx = ordered.indexOf(startRel);
  const endIdx = ordered.indexOf(endRel);
  if (startIdx < 0 || endIdx < 0) {
    return { pitches: [], pitchDirection: 0, error: "Inicio y/o fin no están en la escala" };
  }

  const pitchDirection = endPitch > startPitch ? 1 : -1;
  const pitches = [startPitch];
  let currentPitch = startPitch;
  let currentIdx = startIdx;
  let guard = 0;

  while ((pitchDirection === 1 && currentPitch < endPitch) || (pitchDirection === -1 && currentPitch > endPitch)) {
    const nextIdx = pitchDirection === 1
      ? (currentIdx + 1) % ordered.length
      : (currentIdx - 1 + ordered.length) % ordered.length;

    const curRel = ordered[currentIdx];
    const nextRel = ordered[nextIdx];
    let step = pitchDirection === 1
      ? ((nextRel - curRel + 12) % 12)
      : ((curRel - nextRel + 12) % 12);
    if (step === 0) step = 12;

    currentPitch += pitchDirection * step;
    pitches.push(currentPitch);
    currentIdx = nextIdx;

    guard += 1;
    if (guard > 400) return { pitches: [], pitchDirection, error: "Ruta demasiado larga" };
  }

  if (currentPitch !== endPitch) {
    return { pitches: [], pitchDirection, error: "No se puede llegar siguiendo la escala" };
  }

  return { pitches, pitchDirection, error: null };
}

export function computeRouteLab({
  rootPc,
  scaleName,
  scaleIntervals,
  maxFret,
  startPos,
  endPos,
  maxNotesPerString,
}) {
  if (!startPos || !endPos) return { path: [], cost: null, reason: "Posición inválida", debugSteps: [] };
  if (startPos.fret > maxFret || endPos.fret > maxFret) return { path: [], cost: null, reason: "Aumenta trastes", debugSteps: [] };

  const startPitch = pitchAt(startPos.sIdx, startPos.fret);
  const endPitch = pitchAt(endPos.sIdx, endPos.fret);
  const pitchLine = buildRouteLabPitchLine({ rootPc, scaleIntervals, startPitch, endPitch });
  if (pitchLine.error) return { path: [], cost: null, reason: pitchLine.error, debugSteps: [] };

  const normalizedScale = normalizeScaleName(scaleName || "");
  const family = routeLabTemplateFamily(normalizedScale, scaleIntervals);
  const width = family === "penta" || family === "major_minor" ? 5 : 6;
  const phrasing = inferRouteLabPreferredNotesPerString(scaleName, scaleIntervals, maxNotesPerString);
  const targetStringDir = endPos.sIdx === startPos.sIdx ? 0 : (endPos.sIdx > startPos.sIdx ? 1 : -1);
  const targetFretDir = endPos.fret === startPos.fret ? 0 : (endPos.fret > startPos.fret ? 1 : -1);
  const maxStringJump = family === "bebop" ? 2 : 1;
  const maxFretJump = family === "bebop" ? 6 : 5;

  const boxStartsForFret = (fret) => {
    const maxStart = Math.max(0, maxFret - (width - 1));
    const lo = Math.max(0, fret - (width - 1));
    const hi = Math.min(fret, maxStart);
    const out = [];
    for (let start = lo; start <= hi; start++) out.push(start);
    return out.length ? out : [Math.max(0, Math.min(maxStart, fret))];
  };

  const corridorStarts = Array.from(new Set([
    ...boxStartsForFret(startPos.fret),
    ...boxStartsForFret(endPos.fret),
    ...boxStartsForFret(Math.floor((startPos.fret + endPos.fret) / 2)),
  ])).sort((a, b) => a - b);

  const corridorDeviation = (fret) => {
    if (!corridorStarts.length) return 0;
    let best = Number.POSITIVE_INFINITY;
    for (const start of corridorStarts) {
      const end = start + width - 1;
      if (fret >= start && fret <= end) return 0;
      const dev = fret < start ? (start - fret) : (fret - end);
      if (dev < best) best = dev;
    }
    return Number.isFinite(best) ? best : 0;
  };

  const scalePcSet = new Set(scaleIntervals.map((i) => mod12(rootPc + i)));
  const boxCache = new Map();
  const getBoxInfo = (start) => {
    if (boxCache.has(start)) return boxCache.get(start);
    const end = Math.min(maxFret, start + width - 1);
    const stringFrets = Array.from({ length: 6 }, () => []);
    for (let sIdx = 0; sIdx < 6; sIdx++) {
      for (let fret = start; fret <= end; fret++) {
        const pc = mod12(STRINGS[sIdx].pc + fret);
        if (scalePcSet.has(pc)) stringFrets[sIdx].push(fret);
      }
    }
    const info = { start, end, stringFrets };
    boxCache.set(start, info);
    return info;
  };

  const cellInBox = (boxStart, pos) => {
    if (!pos) return false;
    return getBoxInfo(boxStart).stringFrets[pos.sIdx].includes(pos.fret);
  };

  const candidates = pitchLine.pitches.map((pitch, idx) => {
    if (idx === 0) return [{ sIdx: startPos.sIdx, fret: startPos.fret, pc: mod12(STRINGS[startPos.sIdx].pc + startPos.fret) }];
    if (idx === pitchLine.pitches.length - 1) return [{ sIdx: endPos.sIdx, fret: endPos.fret, pc: mod12(STRINGS[endPos.sIdx].pc + endPos.fret) }];
    return positionsForPitch(pitch, maxFret);
  });

  if (candidates.some((arr) => !arr.length)) {
    return { path: [], cost: null, reason: "Hay notas de la línea sin posición en este rango", debugSteps: [] };
  }

  const futureCoverage = (boxStart, fromIndex, lookahead = 4) => {
    let hits = 0;
    for (let i = fromIndex; i < Math.min(candidates.length, fromIndex + lookahead); i++) {
      if (candidates[i].some((cand) => cellInBox(boxStart, cand))) hits += 1;
    }
    return hits;
  };

  const nextSameStringOptions = (boxStart, fromIndex, sIdx) => {
    if (fromIndex >= candidates.length) return [];
    return candidates[fromIndex].filter((cand) => cand.sIdx === sIdx && cellInBox(boxStart, cand));
  };

  const sameStringChainPotential = (boxStart, fromIndex, sIdx) => {
    let len = 0;
    for (let j = fromIndex; j < candidates.length; j++) {
      const ok = candidates[j].some((cand) => cand.sIdx === sIdx && cellInBox(boxStart, cand));
      if (!ok) break;
      len += 1;
    }
    return len;
  };

  const movementCost = (a, b) => {
    const ds = Math.abs(a.sIdx - b.sIdx);
    const df = Math.abs(a.fret - b.fret);
    const farStringPenalty = ds > 1 ? (ds - 1) * 7 : 0;
    const farFretPenalty = df > 4 ? (df - 4) * 2.4 : 0;
    const sameStringBonus = ds === 0 ? (df <= 1 ? 0.8 : df === 2 ? 0.35 : 0) : 0;
    return Math.max(0.05, df + 1.25 * ds + farStringPenalty + farFretPenalty - sameStringBonus);
  };

  const compareCost = (a, b) => {
    if (!b) return -1;
    if (a.primary !== b.primary) return a.primary - b.primary;
    return a.smooth - b.smooth;
  };

  const addCost = (a, primary, smooth) => ({
    primary: a.primary + primary,
    smooth: a.smooth + smooth,
  });

  const costToNumber = (cost) => Number((cost.primary * 10 + cost.smooth).toFixed(2));

  const encodeKey = (i, sIdx, fret, runCount, fretTrend, boxStart) => `${i}|${sIdx}|${fret}|${runCount}|${fretTrend}|${boxStart}`;
  const decodeKey = (key) => {
    const [i, sIdx, fret, runCount, fretTrend, boxStart] = String(key).split("|").map((x) => parseInt(x, 10));
    return { i, sIdx, fret, runCount, fretTrend, boxStart };
  };

  const parent = new Map();
  const posByKey = new Map();
  const edgeMeta = new Map();
  let prev = new Map();

  for (const boxStart of boxStartsForFret(startPos.fret)) {
    const startKey = encodeKey(0, startPos.sIdx, startPos.fret, 1, 0, boxStart);
    const startCost = {
      primary: 0,
      smooth: (Math.abs(startPos.fret - (boxStart + ((width - 1) / 2))) * 0.08) - (futureCoverage(boxStart, 1, 4) * 0.35) - (nextSameStringOptions(boxStart, 1, startPos.sIdx).length * 4),
    };
    prev.set(startKey, startCost);
    parent.set(startKey, null);
    posByKey.set(startKey, candidates[0][0]);
  }

  for (let i = 1; i < candidates.length; i++) {
    const cur = new Map();

    for (const [prevKey, prevCost] of prev.entries()) {
      const prevInfo = decodeKey(prevKey);
      const prevPos = posByKey.get(prevKey);
      const remainingStepsAfter = candidates.length - 1 - i;
      const currentBoxSameString = candidates[i].filter((cand) => cand.sIdx === prevInfo.sIdx && cellInBox(prevInfo.boxStart, cand));
      const currentBoxAny = candidates[i].filter((cand) => cellInBox(prevInfo.boxStart, cand));
      const oldFutureCoverage = futureCoverage(prevInfo.boxStart, i, 4);
      const currentBoxStringCount = getBoxInfo(prevInfo.boxStart).stringFrets[prevInfo.sIdx]?.length || 1;
      const currentStringTarget = Math.min(phrasing.hardLimit, Math.max(phrasing.phraseTarget, currentBoxStringCount));

      const feasible = [];
      for (const cand of candidates[i]) {
        const dsSigned = cand.sIdx - prevInfo.sIdx;
        const ds = Math.abs(dsSigned);
        const dfSigned = cand.fret - prevInfo.fret;
        const df = Math.abs(dfSigned);
        if (ds > maxStringJump) continue;
        if (df > maxFretJump) continue;
        if (Math.abs(endPos.sIdx - cand.sIdx) > remainingStepsAfter) continue;
        feasible.push({ cand, dsSigned, ds, dfSigned, df });
      }

      if (!feasible.length) continue;

      const sameStringForward = feasible
        .filter((item) => item.ds === 0 && item.df <= 3 && (targetFretDir === 0 || item.dfSigned === 0 || Math.sign(item.dfSigned) === targetFretDir))
        .sort((a, b) => (a.df - b.df) || (corridorDeviation(a.cand.fret) - corridorDeviation(b.cand.fret)) || (Math.abs(endPos.fret - a.cand.fret) - Math.abs(endPos.fret - b.cand.fret)));
      const bestSameStringForward = sameStringForward[0] || null;

      for (const item of feasible) {
        const { cand, dsSigned, ds, dfSigned, df } = item;
        const sameString = ds === 0;
        const nextRun = sameString ? prevInfo.runCount + 1 : 1;
        if (nextRun > phrasing.hardLimit) continue;

        const stepTrend = dfSigned === 0 ? 0 : (dfSigned > 0 ? 1 : -1);
        const nextTrend = stepTrend === 0 ? prevInfo.fretTrend : stepTrend;
        const overshoot = targetFretDir > 0
          ? Math.max(0, cand.fret - endPos.fret)
          : targetFretDir < 0
            ? Math.max(0, endPos.fret - cand.fret)
            : 0;

        let boxStarts = boxStartsForFret(cand.fret).filter((boxStart) => cellInBox(boxStart, cand));
        if (!boxStarts.length) boxStarts = boxStartsForFret(cand.fret);

        const rankedBoxes = boxStarts
          .map((boxStart) => ({
            boxStart,
            futureSameCount: nextSameStringOptions(boxStart, i + 1, cand.sIdx).length,
            futureCoverage: futureCoverage(boxStart, i + 1, 4),
          }))
          .sort((a, b) => (b.futureSameCount - a.futureSameCount) || (b.futureCoverage - a.futureCoverage) || (Math.abs(a.boxStart - prevInfo.boxStart) - Math.abs(b.boxStart - prevInfo.boxStart)));

        const bestFutureSameCount = rankedBoxes.length ? rankedBoxes[0].futureSameCount : 0;
        const bestFutureCoverage = rankedBoxes.length ? rankedBoxes[0].futureCoverage : 0;

        for (const boxInfo of rankedBoxes) {
          const { boxStart, futureSameCount, futureCoverage: nextBoxCoverage } = boxInfo;
          const sameBox = boxStart === prevInfo.boxStart;
          const center = boxStart + ((width - 1) / 2);
          const nextBoxStringCount = getBoxInfo(boxStart).stringFrets[cand.sIdx]?.length || 1;
          const nextStringTarget = Math.min(phrasing.hardLimit, Math.max(phrasing.phraseTarget, nextBoxStringCount));
          let primary = 0;
          let smooth = 0;

          smooth += movementCost(prevPos, cand);

          if (bestSameStringForward && !sameString && prevInfo.runCount < currentStringTarget) {
            primary += 42;
          }

          if (bestSameStringForward && sameString && cand.sIdx === bestSameStringForward.cand.sIdx && cand.fret === bestSameStringForward.cand.fret) {
            smooth -= 4.5;
          }

          if (!sameString && currentBoxSameString.length && prevInfo.runCount < currentStringTarget) {
            primary += 24;
          }

          if (!sameBox && currentBoxAny.length) {
            primary += oldFutureCoverage >= 2 ? 28 : 18;
          }

          if (futureSameCount > 0) {
            smooth -= 1.4 * futureSameCount;
          } else if (bestFutureSameCount > 0) {
            primary += 8;
          }

          if (!sameBox) {
            const boxShift = Math.abs(boxStart - prevInfo.boxStart);
            if (boxShift > 3) continue;
            primary += 4 + (boxShift * 0.9);
            if (oldFutureCoverage >= 2) primary += 4;
          } else {
            smooth -= 0.8;
          }

          if (prevInfo.fretTrend !== 0 && stepTrend !== 0 && stepTrend !== prevInfo.fretTrend) {
            if (!(ds === 1 && df <= 2)) primary += 5;
          }

          if (targetFretDir !== 0 && stepTrend !== 0 && stepTrend !== targetFretDir) {
            if (!(ds === 1 && df <= 2)) primary += 4.2;
          }

          if (targetStringDir !== 0 && dsSigned !== 0 && Math.sign(dsSigned) !== targetStringDir) {
            primary += 0.8;
          }

          if (nextRun > nextStringTarget) {
            primary += (nextRun - nextStringTarget) * (family === "penta" ? 18 : 7);
          } else if (sameString && nextRun <= nextStringTarget) {
            smooth -= 1.2;
          }

          if (sameString && stepTrend !== 0 && targetFretDir !== 0 && stepTrend === targetFretDir) {
            smooth -= 1.8;
          }

          if (ds === 1 && df <= 2) smooth -= 0.9;

          smooth += corridorDeviation(cand.fret) * 0.6;
          smooth += Math.abs(cand.fret - center) * 0.08;
          smooth -= nextBoxCoverage * 1.25;
          smooth -= bestFutureCoverage * 0.15;

          if (overshoot > 0) {
            const hasNonOvershootingAlternative = feasible.some((x) => {
              if (targetFretDir > 0) return x.cand.fret <= endPos.fret;
              if (targetFretDir < 0) return x.cand.fret >= endPos.fret;
              return true;
            });
            primary += overshoot * (remainingStepsAfter <= 2 ? 8 : 3.2);
            if (hasNonOvershootingAlternative) primary += 10;
          }

          const sameStringPotential = sameStringChainPotential(boxStart, i, cand.sIdx);
          if (sameStringPotential > nextStringTarget) {
            primary += (sameStringPotential - nextStringTarget) * (family === "penta" ? 16 : 6);
          }

          if (remainingStepsAfter <= 2 && futureSameCount > 0 && !sameString) {
            primary += 7;
          }

          const totalCost = addCost(prevCost, primary, smooth);
          const nextKey = encodeKey(i, cand.sIdx, cand.fret, nextRun, nextTrend, boxStart);

          if (!cur.has(nextKey) || compareCost(totalCost, cur.get(nextKey)) < 0) {
            cur.set(nextKey, totalCost);
            parent.set(nextKey, prevKey);
            posByKey.set(nextKey, cand);
            edgeMeta.set(nextKey, {
              from: `${prevPos.sIdx + 1}${prevPos.fret}`,
              to: `${cand.sIdx + 1}${cand.fret}`,
              sameString,
              ds,
              df,
              runCount: nextRun,
              corridorDev: Number(corridorDeviation(cand.fret).toFixed(2)),
              targetSideOvershoot: Number(overshoot.toFixed(2)),
              hadSameStringForward: !!bestSameStringForward,
              bestSameStringForwardFret: bestSameStringForward ? bestSameStringForward.cand.fret : null,
              hadNonOvershootingAlternative: overshoot > 0 && feasible.some((x) => {
                if (targetFretDir > 0) return x.cand.fret <= endPos.fret;
                if (targetFretDir < 0) return x.cand.fret >= endPos.fret;
                return true;
              }),
              stepCost: Number((primary * 10 + smooth).toFixed(2)),
              totalCost: costToNumber(totalCost),
              templateText: `caja=${boxStart}-${boxStart + width - 1} · caja activa=${sameBox ? "sí" : "no"} · continuidad=${futureSameCount} · cobertura=${nextBoxCoverage}`,
            });
          }
        }
      }
    }

    if (!cur.size) return { path: [], cost: null, reason: "No encontré ruta con estas reglas", debugSteps: [] };
    prev = cur;
  }

  let bestKey = null;
  let bestCost = null;
  for (const [key, cost] of prev.entries()) {
    const info = decodeKey(key);
    if (info.sIdx !== endPos.sIdx || info.fret !== endPos.fret) continue;
    if (!bestCost || compareCost(cost, bestCost) < 0) {
      bestCost = cost;
      bestKey = key;
    }
  }

  if (!bestKey) return { path: [], cost: null, reason: "No pude terminar exactamente en el destino", debugSteps: [] };

  const path = [];
  const debugSteps = [];
  let walk = bestKey;
  while (walk) {
    path.push(posByKey.get(walk));
    if (edgeMeta.has(walk)) debugSteps.push(edgeMeta.get(walk));
    walk = parent.get(walk);
  }

  path.reverse();
  debugSteps.reverse();

  return {
    path,
    debugSteps,
    cost: costToNumber(bestCost),
    reason: null,
  };
}

export function computeMusicalRoute({
  rootPc,
  scaleIntervals,
  maxFret,
  startPos,
  endPos,
  routeMode, // free | pattern | pos
  fixedPatternIdx,
  allowPatternSwitch,
  patternSwitchPenalty,
  maxNotesPerString,
  preferNps,
  preferVertical = false,
  strictFretDirection = false,
  forcedFretTrend = 0,
  patternInstances,
  instanceMembership,
  preferKeepPattern,
  // pos-mode
  positionWindowSize = 6,
  maxPositionShiftPerStep = 2,
  positionShiftPenalty = 0.7,
  // hard constraints (tocabilidad)
  maxFretJumpPerStep = 7,
  maxStringJumpPerStep = 2,
  // evitar "teletransporte" entre copias del mismo patrón
  maxInstanceShift = 4,
  // empuja a elegir la instancia cuya ancla está cerca del inicio
  initAnchorPenalty = 0.9,
}) {
  if (!startPos || !endPos) return { path: [], cost: null, reason: "Posición inválida" };
  if (startPos.fret > maxFret || endPos.fret > maxFret) return { path: [], cost: null, reason: "Aumenta trastes" };

  const startPitch = pitchAt(startPos.sIdx, startPos.fret);
  const endPitch = pitchAt(endPos.sIdx, endPos.fret);

  const seq = buildPitchSequence({ rootPc, scaleIntervals, startPitch, endPitch });
  if (seq.error) return { path: [], cost: null, reason: seq.error };
  if (seq.dir === 0) return { path: [], cost: null, reason: "No hay recorrido (mismo tono)" };

  const pitches = seq.pitches;
  const npsTarget = scaleIntervals.length === 7 ? 3 : scaleIntervals.length === 5 ? 2 : Math.min(3, maxNotesPerString);

  const windowSize = Math.max(3, Math.min(12, positionWindowSize));
  const maxPosStart = Math.max(0, maxFret - (windowSize - 1));

  function posStartsForFret(fret) {
    const lo = Math.max(0, fret - (windowSize - 1));
    const hi = Math.min(fret, maxPosStart);
    const arr = [];
    for (let ps = lo; ps <= hi; ps++) arr.push(ps);
    return arr.length ? arr : [Math.max(0, Math.min(maxPosStart, fret))];
  }

  function inWindow(posStart, fret) {
    return fret >= posStart && fret <= posStart + windowSize - 1;
  }

  function allowedInstancesForCell(cellKey) {
    if (routeMode === "free") return [0];

    // si no hay instancias, actúa como libre (pero con pos-window si aplica)
    if (!patternInstances || patternInstances.length === 0) return [0];

    const arr = (instanceMembership && instanceMembership.get(cellKey)) || [];
    if (!arr.length) return [];

    if (fixedPatternIdx == null) return arr;
    return arr.filter((instIdx) => patternInstances[instIdx].typeIdx === fixedPatternIdx);
  }

  const candidates = pitches.map((pitch, i) => {
    if (i === 0) return [{ sIdx: startPos.sIdx, fret: startPos.fret, pc: mod12(STRINGS[startPos.sIdx].pc + startPos.fret) }];
    if (i === pitches.length - 1)
      return [{ sIdx: endPos.sIdx, fret: endPos.fret, pc: mod12(STRINGS[endPos.sIdx].pc + endPos.fret) }];
    return positionsForPitch(pitch, maxFret);
  });

  const parent = new Map();
  const posByKey = new Map();

  // Estado: i|sIdx|fret|consec|instIdx|posStart|fretTrend
  // fretTrend: 0 = aún sin dirección fijada, 1 = subiendo trastes, -1 = bajando trastes.
  // Aquí la dirección se mide contra la nota anterior, no contra el inicio del bloque,
  // para que un salto 7 -> 3 cuente como retroceso real.
  function key(i, sIdx, fret, consec, instIdx, posStart, fretTrend) {
    return `${i}|${sIdx}|${fret}|${consec}|${instIdx}|${posStart}|${fretTrend}`;
  }

  function parseKey(k) {
    const [i, s, f, c, inst, ps, trend] = k.split("|").map((x) => parseInt(x, 10));
    return { i, sIdx: s, fret: f, consec: c, instIdx: inst, posStart: ps, fretTrend: trend };
  }

  function stepFeasible(prevPos, candPos) {
    const df = Math.abs(candPos.fret - prevPos.fret);
    const ds = Math.abs(candPos.sIdx - prevPos.sIdx);
    if (df > maxFretJumpPerStep || ds > maxStringJumpPerStep) return false;
    return true;
  }

  function nextFretTrend(prevTrend, prevPos, candPos) {
    if (forcedFretTrend === 1 || forcedFretTrend === -1) return forcedFretTrend;
    const signedDf = candPos.fret - prevPos.fret;
    if (signedDf === 0) return prevTrend;
    const stepTrend = signedDf > 0 ? 1 : -1;
    return prevTrend === 0 ? stepTrend : prevTrend;
  }

  function strictTrendFeasible(prevTrend, prevPos, candPos) {
    if (!strictFretDirection) return true;
    const signedDf = candPos.fret - prevPos.fret;
    if (signedDf === 0) return true;
    const stepTrend = signedDf > 0 ? 1 : -1;
    const targetTrend = (forcedFretTrend === 1 || forcedFretTrend === -1) ? forcedFretTrend : prevTrend;
    return targetTrend === 0 || stepTrend === targetTrend;
  }

  function trendReversalPenalty(prevTrend, prevPos, candPos) {
    if (strictFretDirection) return 0;
    const signedDf = candPos.fret - prevPos.fret;
    if (signedDf === 0) return 0;
    const stepTrend = signedDf > 0 ? 1 : -1;
    if (prevTrend === 0 || stepTrend === prevTrend) return 0;
    return 12 + 2.5 * Math.abs(signedDf);
  }

  let prev = new Map();

  const startCellKey = `${startPos.sIdx}:${startPos.fret}`;
  const startInsts = allowedInstancesForCell(startCellKey);
  if (routeMode !== "free" && startInsts.length === 0) {
    return { path: [], cost: null, reason: "El inicio no cae en ningún patrón permitido" };
  }

  const startPosStarts = routeMode === "pos" ? posStartsForFret(startPos.fret) : [0];

  for (const instIdx of startInsts.length ? startInsts : [0]) {
    for (const ps of startPosStarts) {
      if (routeMode === "pos" && !inWindow(ps, startPos.fret)) continue;
      const k = key(0, startPos.sIdx, startPos.fret, 1, instIdx, ps, 0);
      {
      const anchor = patternInstances?.[instIdx]?.anchorFret ?? startPos.fret;
      const initCost = routeMode === "free" ? 0 : initAnchorPenalty * Math.abs(anchor - startPos.fret);
      prev.set(k, initCost);
    }
      parent.set(k, null);
      posByKey.set(k, candidates[0][0]);
    }
  }

  for (let i = 1; i < candidates.length; i++) {
    const cur = new Map();

    for (const [pk, pcost] of prev.entries()) {
      const prevInfo = parseKey(pk);
      const prevPos = posByKey.get(pk);

      // sticky instance: si hay opción dentro de la misma instancia, obligar
      let mustStayInst = false;
      let mustChangeString = false; // preferVertical: fuerza cambio de cuerda si existe opción viable
      if (preferKeepPattern && routeMode !== "free" && patternInstances && patternInstances.length) {
        for (const cand of candidates[i]) {
          const sameString = cand.sIdx === prevInfo.sIdx;
          const newConsec = sameString ? prevInfo.consec + 1 : 1;
          if (newConsec > maxNotesPerString) continue;
          if (!stepFeasible(prevPos, cand)) continue;
          if (!strictTrendFeasible(prevInfo.fretTrend, prevPos, cand)) continue;

          const cellKey = `${cand.sIdx}:${cand.fret}`;
          const insts = allowedInstancesForCell(cellKey);
          if (insts.includes(prevInfo.instIdx)) {
            // en pos-mode también comprobar ventana
            if (routeMode === "pos") {
              const posStarts = posStartsForFret(cand.fret);
              const ok = posStarts.some((ps) => inWindow(ps, cand.fret) && Math.abs(ps - prevInfo.posStart) <= maxPositionShiftPerStep);
              if (!ok) continue;
            }
            mustStayInst = true;
            break;
          }
        }
      }

      // preferVertical: si existe una opción que cambie de cuerda (adyacente) con poco salto de traste, obligar.
      if (preferVertical) {
        for (const cand of candidates[i]) {
          const sameString = cand.sIdx === prevInfo.sIdx;
          const newConsec = sameString ? prevInfo.consec + 1 : 1;
          if (newConsec > maxNotesPerString) continue;
          if (!stepFeasible(prevPos, cand)) continue;

          const dsStep = Math.abs(cand.sIdx - prevInfo.sIdx);
          const dfStep = Math.abs(cand.fret - prevPos.fret);
          if (dsStep !== 1) continue;
          if (dfStep > 2) continue;

          const cellKey = `${cand.sIdx}:${cand.fret}`;
          const instsAll = allowedInstancesForCell(cellKey);
          if (routeMode !== "free" && instsAll.length === 0) continue;

          // Si estamos en patrón fijo, respeta la instancia actual cuando corresponda
          if (routeMode !== "free") {
            if (mustStayInst) {
              if (!instsAll.includes(prevInfo.instIdx)) continue;
            }
          }

          // pos-mode: respeta ventana
          if (routeMode === "pos") {
            const posStarts = posStartsForFret(cand.fret);
            const ok = posStarts.some((ps) => inWindow(ps, cand.fret) && Math.abs(ps - prevInfo.posStart) <= maxPositionShiftPerStep);
            if (!ok) continue;
          }

          mustChangeString = true;
          break;
        }
      }

      for (const cand of candidates[i]) {
        const sameString = cand.sIdx === prevInfo.sIdx;
        if (mustChangeString && sameString) continue;
        const newConsec = sameString ? prevInfo.consec + 1 : 1;
        if (newConsec > maxNotesPerString) continue;
        if (!stepFeasible(prevPos, cand)) continue;
        if (!strictTrendFeasible(prevInfo.fretTrend, prevPos, cand)) continue;

        const cellKey = `${cand.sIdx}:${cand.fret}`;
        const instsAll = allowedInstancesForCell(cellKey);
        if (routeMode !== "free" && instsAll.length === 0) continue;

        const insts = mustStayInst ? instsAll.filter((x) => x === prevInfo.instIdx) : instsAll;
        if (mustStayInst && insts.length === 0) continue;

        const baseMove = movementCost(prevPos, cand);
        // Si quieres ruta "vertical" (cambiar cuerda) no penalizamos cambios de cuerda por NPS.
        const npsPenalty = preferNps && !preferVertical && !sameString && prevInfo.consec < npsTarget ? 2.2 : 0;
        const reversalPenalty = trendReversalPenalty(prevInfo.fretTrend, prevPos, cand);

        // Preferir verticalidad: penaliza quedarse en la misma cuerda, premia cambio de cuerda cercano.
        const dsStep = Math.abs(cand.sIdx - prevInfo.sIdx);
        const dfStep = Math.abs(cand.fret - prevInfo.fret);
        const verticalPenalty = preferVertical && dsStep === 0 && dfStep > 0 ? 1.4 : 0;
        const verticalBonus = preferVertical && dsStep === 1 && dfStep <= 1 ? 0.35 : 0;

        const posStartCandidates = routeMode === "pos" ? posStartsForFret(cand.fret) : [prevInfo.posStart];

        for (const psNew of posStartCandidates) {
          if (routeMode === "pos") {
            if (!inWindow(psNew, cand.fret)) continue;
            const shift = Math.abs(psNew - prevInfo.posStart);
            if (shift > maxPositionShiftPerStep) continue;
          }

          const posCost = routeMode === "pos" ? Math.abs(psNew - prevInfo.posStart) * positionShiftPenalty : 0;

          for (const instIdx of insts.length ? insts : [0]) {
            if (!allowPatternSwitch && routeMode !== "free" && instIdx !== prevInfo.instIdx) continue;

            let switchPenalty = 0;
            if (routeMode !== "free" && instIdx !== prevInfo.instIdx) {
              const aPrev = patternInstances?.[prevInfo.instIdx]?.anchorFret ?? prevInfo.fret;
              const aNew = patternInstances?.[instIdx]?.anchorFret ?? cand.fret;
              const typePrev = patternInstances?.[prevInfo.instIdx]?.typeIdx ?? -1;
              const typeNew = patternInstances?.[instIdx]?.typeIdx ?? -1;
              {
              const anchorDiff = Math.abs(aNew - aPrev);
              if (anchorDiff > maxInstanceShift) continue;
              switchPenalty = patternSwitchPenalty + 0.7 * anchorDiff + (typePrev !== typeNew ? 1.6 : 0);
            }
            }

            const nk = key(
              i,
              cand.sIdx,
              cand.fret,
              newConsec,
              instIdx,
              psNew,
              nextFretTrend(prevInfo.fretTrend, prevPos, cand)
            );
            const cost = pcost + baseMove + npsPenalty + reversalPenalty + switchPenalty + posCost + verticalPenalty - verticalBonus;

            if (!cur.has(nk) || cost < cur.get(nk)) {
              cur.set(nk, cost);
              parent.set(nk, pk);
              posByKey.set(nk, cand);
            }
          }
        }
      }
    }

    if (!cur.size) {
      return {
        path: [],
        cost: null,
        reason: strictFretDirection
          ? "No encontré ruta estricta con estos límites"
          : "No encontré ruta con estos límites/patrones",
      };
    }
    prev = cur;
  }

  let bestKey = null;
  let bestCost = Infinity;

  for (const [k, c] of prev.entries()) {
    const info = parseKey(k);
    if (info.sIdx === endPos.sIdx && info.fret === endPos.fret) {
      if (c < bestCost) {
        bestCost = c;
        bestKey = k;
      }
    }
  }

  if (!bestKey) return { path: [], cost: null, reason: "No pude terminar exactamente en el destino" };

  const path = [];
  let k = bestKey;
  while (k) {
    path.push(posByKey.get(k));
    k = parent.get(k);
  }
  path.reverse();

  return { path, cost: bestCost, reason: null };
}

export const STAFF_LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

export function midiToSpelledPitch(midi, preferSharps) {
  const pc = mod12(midi);
  const name = pcToName(pc, preferSharps);
  const letter = name[0] || "C";
  const accidentalRaw = name.slice(1);
  const accidental = accidentalRaw === "#" ? "\u266F" : accidentalRaw === "b" ? "\u266D" : accidentalRaw;
  const octave = Math.floor(midi / 12) - 1;
  return { midi, name, letter, accidental, octave };
}

export function spelledPitchFromNameAndMidi(name, midi) {
  const raw = String(name || "").trim() || "C";
  const letter = raw[0]?.toUpperCase?.() || "C";
  const accidentalRaw = raw.slice(1);
  const accidental = accidentalRaw
    .split("#").join("\u266F")
    .split("b").join("\u266D");
  const octave = Math.floor(midi / 12) - 1;
  return { midi, name: raw, letter, accidental, octave };
}

export function staffStepFromPitch(spelled, clef) {
  const baseOctave = clef === "bass" ? 2 : 4;
  const baseLetter = clef === "bass" ? "G" : "E";
  const diatonic = (spelled.octave * 7) + STAFF_LETTER_INDEX[spelled.letter];
  const base = (baseOctave * 7) + STAFF_LETTER_INDEX[baseLetter];
  return diatonic - base;
}

export function staffYFromStep(step, top, lineGap) {
  return top + (lineGap * 4) - (step * (lineGap / 2));
}

export function ledgerLineSteps(step) {
  const out = [];
  if (step < 0) {
    for (let s = 0; s >= step; s -= 2) out.push(s);
  } else if (step > 8) {
    for (let s = 8; s <= step; s += 2) out.push(s);
  }
  return out.filter((s) => s < 0 || s > 8);
}

export function resolveStaffSpec(events, clefMode) {
  if (clefMode === "treble") return { clef: "treble", transpose: 0 };
  if (clefMode === "bass") return { clef: "bass", transpose: 0 };
  if (clefMode === "guitar") return { clef: "treble", transpose: 12 };

  const midis = (events || []).flatMap((evt) => Array.isArray(evt?.notes) ? evt.notes : []);
  const avg = midis.length ? midis.reduce((a, b) => a + b, 0) / midis.length : 60;
  return avg < 54 ? { clef: "bass", transpose: 0 } : { clef: "treble", transpose: 0 };
}

export const TREBLE_KEY_SIGNATURE_STEPS = {
  sharp: [8, 5, 9, 6, 3, 7, 4],
  flat: [4, 7, 3, 6, 2, 5, 8],
};

export const BASS_KEY_SIGNATURE_STEPS = {
  sharp: [6, 3, 7, 4, 1, 5, 2],
  flat: [2, 5, 1, 4, 0, 3, 6],
};

export function keySignatureStepsForClef(clef, type) {
  return clef === "bass" ? BASS_KEY_SIGNATURE_STEPS[type] || [] : TREBLE_KEY_SIGNATURE_STEPS[type] || [];
}

export const KEY_SIGNATURE_LETTER_ORDER = {
  sharp: ["F", "C", "G", "D", "A", "E", "B"],
  flat: ["B", "E", "A", "D", "G", "C", "F"],
};

export function keySignatureLetterAccidentals(keySignature) {
  const type = keySignature?.type || null;
  const count = Math.max(0, Math.min(7, Number(keySignature?.count) || 0));
  const map = new Map();
  if (!type || !count) return map;

  const letters = KEY_SIGNATURE_LETTER_ORDER[type] || [];
  const accidental = type === "sharp" ? "\u266F" : "\u266D";
  letters.slice(0, count).forEach((letter) => map.set(letter, accidental));
  return map;
}

export function displayedAccidentalForNote(note, signatureMap) {
  const keyAccidental = signatureMap?.get(note.letter) || "";
  const noteAccidental = note.accidental || "";
  if (noteAccidental === keyAccidental) return "";
  if (!noteAccidental && keyAccidental) return "\u266E";
  return noteAccidental;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function staffBulletGlyph(level) {
  if (level <= 0) return "◦";
  if (level === 1) return "▪";
  return "–";
}

export function formatStudyLineWithBoldPrefixHtml(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const colonIdx = raw.indexOf(":");
  if (colonIdx <= 0) return escapeHtml(raw);
  const label = raw.slice(0, colonIdx + 1);
  const rest = raw.slice(colonIdx + 1).trim();
  return `<b>${escapeHtml(label)}</b>${rest ? ` ${escapeHtml(rest)}` : ""}`;
}

export function buildStudyStructuredLinesHtml(lines, level = 0) {
  const safeLines = Array.isArray(lines) ? lines.map((line) => String(line || "").trim()).filter(Boolean) : [];
  if (!safeLines.length) return "";

  const parts = [];
  let idx = 0;
  while (idx < safeLines.length) {
    const line = safeLines[idx];
    const isHeading = /:\s*$/.test(line);
    if (isHeading) {
      const children = [];
      idx += 1;
      while (idx < safeLines.length && !/:\s*$/.test(safeLines[idx])) {
        children.push(safeLines[idx]);
        idx += 1;
      }
      parts.push(
        `<div class="pdf-study-line-group">` +
          `<div class="pdf-study-line"><span class="pdf-study-bullet">${escapeHtml(staffBulletGlyph(level))}</span><span><b>${escapeHtml(line)}</b></span></div>` +
          `<div class="pdf-study-children">${buildStudyStructuredLinesHtml(children, level + 1)}</div>` +
        `</div>`
      );
      continue;
    }

    parts.push(
      `<div class="pdf-study-line">` +
        `<span class="pdf-study-bullet">${escapeHtml(staffBulletGlyph(level))}</span>` +
        `<span>${formatStudyLineWithBoldPrefixHtml(line)}</span>` +
      `</div>`
    );
    idx += 1;
  }

  return `<div class="pdf-study-lines">${parts.join("")}</div>`;
}

export function buildStudyOuterBlockHtml(label, content) {
  if (!content || (Array.isArray(content) && !content.length)) return "";
  const heading = `<div class="pdf-study-line pdf-study-line--outer"><span class="pdf-study-bullet">●</span><span><b>${escapeHtml(label)}:</b>${Array.isArray(content) ? "" : ` ${escapeHtml(content)}`}</span></div>`;
  const body = Array.isArray(content)
    ? `<div class="pdf-study-children">${buildStudyStructuredLinesHtml(content, 0)}</div>`
    : "";
  return `<div class="pdf-study-block">${heading}${body}</div>`;
}

export function buildMusicStaffRenderState({ events, preferSharps, clefMode = "guitar", beatsPerBar = 4, beatUnit = 4, keySignature = null, inlineEventLabels = null }) {
  const safeEvents = Array.isArray(events) ? events.filter((evt) => Array.isArray(evt?.notes) && evt.notes.length) : [];
  if (!safeEvents.length) return null;

  const { clef, transpose } = resolveStaffSpec(safeEvents, clefMode);
  const lineGap = 14;
  const staffTop = 28;
  const signatureType = keySignature?.type || null;
  const signatureCount = Math.max(0, Math.min(7, Number(keySignature?.count) || 0));
  const signatureGlyph = signatureType === "sharp" ? "\u266F" : signatureType === "flat" ? "\u266D" : "";
  const signatureSteps = signatureType ? keySignatureStepsForClef(clef, signatureType).slice(0, signatureCount) : [];
  const signatureWidth = signatureSteps.length ? (signatureSteps.length * 11) + 8 : 0;
  const signatureMap = keySignatureLetterAccidentals(keySignature);
  const idealNoteSpacing = 38;
  const minNoteSpacing = 24;
  const targetInnerWidth = 880;
  const eventCount = Math.max(1, safeEvents.length);
  const noteSpacing = Math.max(minNoteSpacing, Math.min(idealNoteSpacing, targetInnerWidth / Math.max(eventCount, beatsPerBar)));
  const measureWidth = noteSpacing * beatsPerBar;
  const leftPad = 86 + signatureWidth;
  const rightPad = 24;
  const measures = Math.max(1, Math.ceil(safeEvents.length / beatsPerBar));
  const width = leftPad + (measures * measureWidth) + rightPad;
  const staffBottom = staffTop + (lineGap * 4);
  const clefGlyph = clef === "bass" ? "\uD834\uDD22" : "\uD834\uDD1E";
  const inlineLabelFontSize = 12;
  const inlineLabelGap = 8;
  const inlineLabelBaselineOffset = 14;
  const inlineLabelTopPad = 12;
  const inlineLabelBottomPad = 4;

  const renderedEvents = safeEvents.map((evt, idx) => {
    const measureIdx = Math.floor(idx / beatsPerBar);
    const beatIdx = idx % beatsPerBar;
    const x = leftPad + (measureIdx * measureWidth) + 22 + (beatIdx * noteSpacing);
    const eventPreferSharps = typeof evt?.preferSharps === "boolean" ? evt.preferSharps : preferSharps;
    const notes = evt.notes
      .map((midi, noteIdx) => {
        const renderedMidi = midi + transpose;
        const spelledName = Array.isArray(evt?.spelledNotes) ? evt.spelledNotes[noteIdx] : "";
        return spelledName
          ? spelledPitchFromNameAndMidi(spelledName, renderedMidi)
          : midiToSpelledPitch(renderedMidi, eventPreferSharps);
      })
      .map((spelled) => {
        const step = staffStepFromPitch(spelled, clef);
        const displayAccidental = displayedAccidentalForNote(spelled, signatureMap);
        return { ...spelled, step, displayAccidental };
      })
      .sort((a, b) => a.step - b.step);
    const avgStep = notes.reduce((sum, note) => sum + note.step, 0) / notes.length;
    const stemDown = avgStep >= 4;
    return { x, notes, stemDown };
  });

  const resolvedInlineEventLabels = Array.isArray(inlineEventLabels)
    ? safeEvents.map((_, idx) => {
        const raw = inlineEventLabels[idx];
        return raw == null ? "" : String(raw);
      })
    : [];

  const renderedEventsWithLayout = renderedEvents.map((evt, idx) => {
    if (!evt.notes.length) {
      return { ...evt, top: staffTop - 8, bottom: staffBottom + 8, inlineLabelY: null };
    }
    const stemNote = evt.stemDown ? evt.notes[0] : evt.notes[evt.notes.length - 1];
    const stemY = staffYFromStep(stemNote.step, staffTop, lineGap);
    const stemEndY = evt.stemDown ? stemY + 30 : stemY - 30;
    const noteExtents = evt.notes.map((note) => {
      const y = staffYFromStep(note.step, staffTop, lineGap);
      const ledgerYs = ledgerLineSteps(note.step).map((step) => staffYFromStep(step, staffTop, lineGap));
      const ledgerTop = ledgerYs.length ? Math.min(...ledgerYs) - 2 : y - 7;
      const ledgerBottom = ledgerYs.length ? Math.max(...ledgerYs) + 2 : y + 7;
      const noteTop = y - 7;
      const noteBottom = y + 7;
      const accidentalTop = note.displayAccidental ? y - 10 : noteTop;
      const accidentalBottom = note.displayAccidental ? y + 6 : noteBottom;
      return {
        top: Math.min(noteTop, ledgerTop, accidentalTop, stemY, stemEndY),
        bottom: Math.max(noteBottom, ledgerBottom, accidentalBottom, stemY, stemEndY),
      };
    });
    const top = Math.min(...noteExtents.map((entry) => entry.top));
    const bottom = Math.max(...noteExtents.map((entry) => entry.bottom));
    const hasInlineLabel = Boolean(resolvedInlineEventLabels[idx]);
    const inlineLabelY = hasInlineLabel
      ? (evt.stemDown ? top - inlineLabelGap : bottom + inlineLabelBaselineOffset)
      : null;
    return { ...evt, top, bottom, inlineLabelY };
  });

  const verticalExtents = renderedEventsWithLayout.map((evt) => {
    const labelTop = evt.inlineLabelY != null ? evt.inlineLabelY - inlineLabelTopPad : evt.top;
    const labelBottom = evt.inlineLabelY != null ? evt.inlineLabelY + inlineLabelBottomPad : evt.bottom;
    return {
      top: Math.min(evt.top, labelTop),
      bottom: Math.max(evt.bottom, labelBottom),
    };
  });

  const contentTop = verticalExtents.length ? Math.min(staffTop - 12, ...verticalExtents.map((x) => x.top)) - 8 : staffTop - 20;
  const contentBottom = verticalExtents.length ? Math.max(staffBottom + 12, ...verticalExtents.map((x) => x.bottom)) + 8 : staffBottom + 20;
  const height = Math.max(132, contentBottom - contentTop);

  return {
    safeEvents,
    clef,
    transpose,
    lineGap,
    staffTop,
    staffBottom,
    signatureType,
    signatureCount,
    signatureGlyph,
    signatureSteps,
    signatureWidth,
    signatureMap,
    noteSpacing,
    measureWidth,
    leftPad,
    rightPad,
    measures,
    width,
    height,
    contentTop,
    contentBottom,
    inlineLabelFontSize,
    clefGlyph,
    beatsPerBar,
    beatUnit,
    renderedEvents: renderedEventsWithLayout,
    inlineEventLabels: resolvedInlineEventLabels,
  };
}

export function buildMusicStaffSvgMarkup({ events, preferSharps, clefMode = "guitar", beatsPerBar = 4, beatUnit = 4, keySignature = null, inlineEventLabels = null }) {
  const state = buildMusicStaffRenderState({ events, preferSharps, clefMode, beatsPerBar, beatUnit, keySignature, inlineEventLabels });
  if (!state) return "";

  const {
    lineGap,
    staffTop,
    staffBottom,
    signatureGlyph,
    signatureSteps,
    signatureWidth,
    measures,
    measureWidth,
    leftPad,
    width,
    height,
    contentTop,
    inlineLabelFontSize,
    clef,
    clefGlyph,
    beatsPerBar: safeBeatsPerBar,
    beatUnit: safeBeatUnit,
    renderedEvents,
    inlineEventLabels: safeInlineEventLabels,
  } = state;

  const staffLines = [0, 1, 2, 3, 4]
    .map((line) => {
      const y = staffTop + (line * lineGap);
      return `<line x1="16" y1="${y}" x2="${width - 12}" y2="${y}" stroke="#475569" stroke-width="1" />`;
    })
    .join("");

  const measureLines = Array.from({ length: measures - 1 }, (_, i) => {
    const x = leftPad + ((i + 1) * measureWidth);
    return `<line x1="${x}" y1="${staffTop - 1}" x2="${x}" y2="${staffBottom + 1}" stroke="#475569" stroke-width="1" />`;
  }).join("");

  const signatureMarks = signatureSteps.map((step, idx) => {
    const x = 58 + (idx * 11);
    const y = staffYFromStep(step, staffTop, lineGap) + 4;
    return `<text x="${x}" y="${y}" font-size="18" fill="#0f172a">${escapeHtml(signatureGlyph)}</text>`;
  }).join("");

  const eventMarkup = renderedEvents.map((evt) => {
    const noteMarkup = evt.notes.map((note) => {
      const y = staffYFromStep(note.step, staffTop, lineGap);
      const ledgerMarkup = ledgerLineSteps(note.step).map((step) => {
        const ly = staffYFromStep(step, staffTop, lineGap);
        return `<line x1="${evt.x - 10}" y1="${ly}" x2="${evt.x + 10}" y2="${ly}" stroke="#475569" stroke-width="1" />`;
      }).join("");
      const accidentalMarkup = note.displayAccidental
        ? `<text x="${evt.x - 18}" y="${y + 4}" font-size="14" fill="#0f172a">${escapeHtml(note.displayAccidental)}</text>`
        : "";
      return `<g>${ledgerMarkup}${accidentalMarkup}<ellipse cx="${evt.x}" cy="${y}" rx="6.8" ry="5.1" transform="rotate(-20 ${evt.x} ${y})" fill="#0f172a" /></g>`;
    }).join("");

    let stemMarkup = "";
    if (evt.notes.length) {
      const stemNote = evt.stemDown ? evt.notes[0] : evt.notes[evt.notes.length - 1];
      const stemY = staffYFromStep(stemNote.step, staffTop, lineGap);
      const x = evt.stemDown ? evt.x - 6 : evt.x + 6;
      const y1 = stemY;
      const y2 = evt.stemDown ? stemY + 30 : stemY - 30;
      stemMarkup = `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#0f172a" stroke-width="1.4" />`;
    }
    return `<g>${noteMarkup}${stemMarkup}</g>`;
  }).join("");

  const inlineLabelMarkup = safeInlineEventLabels
    .map((label, idx) => {
      if (!label) return "";
      return `<text x="${renderedEvents[idx]?.x ?? 0}" y="${renderedEvents[idx]?.inlineLabelY ?? 0}" text-anchor="middle" font-size="${inlineLabelFontSize}" font-weight="600" fill="#475569">${escapeHtml(label)}</text>`;
    })
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 ${contentTop} ${width} ${height}" role="img" aria-label="Pentagrama">` +
      staffLines +
      measureLines +
      `<line x1="16" y1="${staffTop - 1}" x2="16" y2="${staffBottom + 1}" stroke="#475569" stroke-width="1" />` +
      `<line x1="${width - 12}" y1="${staffTop - 1}" x2="${width - 12}" y2="${staffBottom + 1}" stroke="#475569" stroke-width="1.5" />` +
      `<text x="30" y="${clef === "bass" ? staffTop + 37 : staffTop + 42}" font-size="${clef === "bass" ? 34 : 42}" fill="#0f172a">${escapeHtml(clefGlyph)}</text>` +
      signatureMarks +
      `<text x="${62 + signatureWidth}" y="${staffTop + 16}" font-size="16" font-weight="700" fill="#0f172a">${safeBeatsPerBar}</text>` +
      `<text x="${62 + signatureWidth}" y="${staffTop + 38}" font-size="16" font-weight="700" fill="#0f172a">${safeBeatUnit}</text>` +
      eventMarkup +
      inlineLabelMarkup +
    `</svg>`
  );
}

export function studyRoleFromPlanInterval(interval, plan) {
  const safeInterval = mod12(interval);
  if (safeInterval === 0) return "root";
  if (safeInterval === mod12(plan?.thirdOffset ?? 4)) return "third";
  if (safeInterval === mod12(plan?.fifthOffset ?? 7)) return "fifth";
  if (plan?.ext7 && plan?.seventhOffset != null && safeInterval === mod12(plan.seventhOffset)) return "seventh";
  if (plan?.ext13 && safeInterval === 9) return "thirteenth";
  if (plan?.ext11 && safeInterval === 5) return "eleventh";
  if (plan?.ext9 && safeInterval === 2) return "ninth";
  if (plan?.ext6 && safeInterval === 9) return "sixth";
  return "other";
}

export function buildStudyDisplayLabelForPc({ pc, rootPc, preferSharps, plan, showIntervalsLabel, showNotesLabel }) {
  const interval = mod12(pc - rootPc);
  const note = spellNoteFromChordInterval(rootPc, interval, preferSharps);
  const degree = intervalToChordToken(interval, {
    ext6: !!plan?.ext6,
    ext9: !!plan?.ext9 && plan?.structure !== "triad",
    ext11: !!plan?.ext11 && plan?.structure !== "triad",
    ext13: !!plan?.ext13 && plan?.structure !== "triad",
  });

  if (!showIntervalsLabel && !showNotesLabel) return degree;
  if (showIntervalsLabel && showNotesLabel) return `${degree}-${note}`;
  if (showIntervalsLabel) return degree;
  return note;
}

export function buildStudyBadgeItemsFromPlan({ rootPc, preferSharps, plan }) {
  if (!plan?.intervals?.length) return [];
  const safeIntervals = Array.from(new Set(plan.intervals.map(mod12))).sort((a, b) => a - b);
  const notes = spellChordNotes({ rootPc, chordIntervals: safeIntervals, preferSharps });
  return buildChordBadgeItems({
    notes,
    intervals: safeIntervals,
    ext6: !!plan.ext6,
    ext9: !!plan.ext9,
    ext11: !!plan.ext11,
    ext13: !!plan.ext13,
    structure: plan.structure || "triad",
  });
}

export function buildPdfChordBadgeStripHtml({ items, bassNote, colorMap }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length && !bassNote) return "";

  const itemHtml = safeItems.map((item) => {
    const bg = (colorMap && colorMap[item.role]) || (colorMap && colorMap.other) || "#0ea5e9";
    const fg = isDark(bg) ? "#ffffff" : "#0f172a";
    return (
      `<div class="pdf-badge-item">` +
        `<div class="pdf-badge-note">${escapeHtml(item.note)}</div>` +
        `<div class="pdf-badge-degree" style="background:${escapeHtml(bg)};color:${escapeHtml(fg)};">${escapeHtml(item.degree)}</div>` +
      `</div>`
    );
  }).join("");

  const bassHtml = bassNote
    ? (
        `<div class="pdf-badge-item pdf-badge-item--bass">` +
          `<div class="pdf-badge-note">${escapeHtml(bassNote)}</div>` +
          `<div class="pdf-badge-degree pdf-badge-degree--bass">Bajo</div>` +
        `</div>`
      )
    : "";

  return `<div class="pdf-badge-strip">${itemHtml}${bassHtml}</div>`;
}

export function buildPdfCompactVoicingFretboardHtml({
  voicing,
  rootPc,
  preferSharps,
  plan,
  colors,
  showIntervalsLabel,
  showNotesLabel,
}) {
  if (!voicing?.notes?.length || !plan) return "";

  const sortedNotes = [...voicing.notes].sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret));
  const notesMap = new Map();
  for (const n of sortedNotes) {
    notesMap.set(`${n.sIdx}:${n.fret}`, {
      pc: n.pc,
      isBass: `${n.sIdx}:${n.fret}` === voicing.bassKey,
    });
  }
  const mutedStrings = new Set(Array.isArray(voicing?.mutedSIdx) ? voicing.mutedSIdx : []);

  const fretted = sortedNotes.map((n) => n.fret).filter((fret) => fret > 0);
  const maxFret = fretted.length ? Math.max(...fretted) : 0;
  const lastVisibleFret = Math.max(14, maxFret || 4);
  const displayFrets = Array.from({ length: lastVisibleFret + 1 }, (_, idx) => idx);

  const headerHtml = displayFrets.map((fret) => `<div class="pdf-mini-neck-head${fret === 0 ? " pdf-mini-neck-head--open" : ""}">${fret}</div>`).join("");
  const rowsHtml = STRINGS.map((st, sIdx) => {
    const cellsHtml = displayFrets.map((fret) => {
      const item = notesMap.get(`${sIdx}:${fret}`);
      const inlay = fret > 0 && hasInlayCell(fret, sIdx)
        ? `<span class="pdf-mini-neck-inlay${item ? " pdf-mini-neck-inlay--active" : ""}"></span>`
        : "";
      const mutedAtOpen = fret === 0 && mutedStrings.has(sIdx);
      if (!item) {
        return (
          `<div class="pdf-mini-neck-cell${fret === 0 ? " pdf-mini-neck-cell--open" : ""}">` +
            inlay +
            (mutedAtOpen ? `<span class="pdf-mini-neck-muted">X</span>` : "") +
          `</div>`
        );
      }

      const interval = mod12(item.pc - rootPc);
      const role = studyRoleFromPlanInterval(interval, plan);
      const bg = colors?.[role] || colors?.other || "#e2e8f0";
      const fg = role === "other" ? "#0f172a" : (isDark(bg) ? "#ffffff" : "#0f172a");
      const label = buildStudyDisplayLabelForPc({
        pc: item.pc,
        rootPc,
        preferSharps,
        plan,
        showIntervalsLabel,
        showNotesLabel,
      });
      return (
        `<div class="pdf-mini-neck-cell${fret === 0 ? " pdf-mini-neck-cell--open" : ""}">` +
          inlay +
          `<span class="pdf-mini-neck-dot${item.isBass ? " pdf-mini-neck-dot--bass" : ""}" style="background:${escapeHtml(bg)};color:${escapeHtml(fg)};">${escapeHtml(label)}</span>` +
        `</div>`
      );
    }).join("");
    return `<div class="pdf-mini-neck-string">${escapeHtml(st.label)}</div>${cellsHtml}`;
  }).join("");

  const fullColumns = `36px 28px repeat(${Math.max(0, displayFrets.length - 1)}, minmax(0, 1fr))`;
  return (
    `<div class="pdf-mini-neck" style="grid-template-columns:${fullColumns};">` +
      `<div class="pdf-mini-neck-corner"></div>${headerHtml}` +
      rowsHtml +
    `</div>`
  );
}

export function formatChordBadgeDegree(label) {
  const s = String(label || "");
  if (!s) return "";
  if (s === "1") return "1";
  return s;
}

export function chordBadgeRoleFromDegreeLabel(label, interval) {
  const s = String(label || "").toLowerCase();
  const intv = mod12(interval ?? 0);
  if (intv === 0 || s === "1") return "root";
  if (s === "3" || s === "b3" || s === "#3") return "third";
  if (s === "5" || s === "b5" || s === "#5") return "fifth";
  if (s === "6" || s === "b6" || s === "#6") return "sixth";
  if (s.includes("7")) return "seventh";
  if (s.includes("13")) return "thirteenth";
  if (s === "4" || s === "b4" || s === "#4" || s.includes("11")) return "eleventh";
  if (s === "2" || s === "b2" || s === "#2" || s.includes("9")) return "ninth";
  return "other";
}

export function chordFormulaBadgeRoleFromDegreeLabel(label, interval) {
  const s = String(label || "").toLowerCase();
  if (s === "2" || s === "4") return "third";
  return chordBadgeRoleFromDegreeLabel(label, interval);
}

export function _chordBadgeRoleOrder(role) {
  switch (role) {
    case "root": return 0;
    case "third": return 1;
    case "fifth": return 2;
    case "sixth": return 3;
    case "seventh": return 4;
    case "ninth": return 5;
    case "eleventh": return 6;
    case "thirteenth": return 7;
    default: return 8;
  }
}

export function buildChordBadgeItems({ notes, intervals, degreeLabels, ext6 = false, ext9 = false, ext11 = false, ext13 = false, structure = "triad" }) {
  const safeNotes = Array.isArray(notes) ? notes : [];
  const safeIntervals = Array.isArray(intervals) ? intervals : [];

  return safeNotes
    .map((note, idx) => {
      const rawInterval = safeIntervals[idx] ?? 0;
      const fallback = intervalToChordToken(rawInterval, {
        ext6,
        ext9: ext9 && structure !== "triad",
        ext11: ext11 && structure !== "triad",
        ext13: ext13 && structure !== "triad",
      });
      const degreeRaw = String(degreeLabels?.[idx] || fallback);
      const degree = formatChordBadgeDegree(degreeRaw);
      const role = chordFormulaBadgeRoleFromDegreeLabel(degreeRaw, rawInterval);
      return note && degree ? { note, degree, role, interval: mod12(rawInterval) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      return a.interval - b.interval;
    })
    .map((item) => ({ note: item.note, degree: item.degree, role: item.role }));
}

export function ChordNoteBadgeStrip({ items, bassNote, bassLabel = "Bajo", colorMap, wrap = true, className = "" }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length && !bassNote) return null;
  const outerClassName = wrap
    ? "flex flex-wrap items-end gap-x-3 gap-y-2"
    : "flex min-w-max flex-nowrap items-end gap-3";

  return (
    <div className={`${outerClassName} ${className}`.trim()}>
      {safeItems.length ? (
        <div className={wrap ? "flex flex-wrap items-end gap-x-3 gap-y-2" : "flex flex-nowrap items-end gap-3"}>
          {safeItems.map((item, idx) => {
            const bg = (colorMap && colorMap[item.role]) || (colorMap && colorMap.other) || "#0ea5e9";
            const fg = isDark(bg) ? "#ffffff" : "#0f172a";
            return (
              <div key={item.note + "-" + item.degree + "-" + idx} className="flex min-w-[34px] flex-col items-center gap-1">
                <div className="text-[11px] font-semibold text-slate-700">{item.note}</div>
                <div
                  className="min-w-[34px] rounded-md px-2 py-1 text-center text-[10px] font-semibold leading-none shadow-sm"
                  style={{ backgroundColor: bg, color: fg }}
                >
                  {item.degree}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {bassNote ? (
        <div className="flex min-w-[46px] flex-col items-center gap-1">
          <div className="text-[11px] font-semibold text-slate-700">{bassNote}</div>
          <div className="min-w-[46px] rounded-md bg-slate-700 px-2 py-1 text-center text-[10px] font-semibold leading-none text-white shadow-sm">
            {bassLabel}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MusicStaff({ events, preferSharps, clefMode = "guitar", beatsPerBar = 4, beatUnit = 4, keySignature = null, footerLabels = null, showFooter = false, inlineEventLabels = null }) {
  const state = buildMusicStaffRenderState({ events, preferSharps, clefMode, beatsPerBar, beatUnit, keySignature, inlineEventLabels });
  if (!state) return null;

  const {
    lineGap,
    staffTop,
    staffBottom,
    signatureType,
    signatureGlyph,
    signatureSteps,
    signatureWidth,
    measureWidth,
    leftPad,
    measures,
    width,
    height,
    contentTop,
    inlineLabelFontSize,
    clef,
    clefGlyph,
    renderedEvents,
    safeEvents,
    inlineEventLabels: safeInlineEventLabels,
  } = state;

  const footerRows = showFooter
    ? safeEvents.map((evt, idx) => {
        const label = Array.isArray(footerLabels) && footerLabels[idx]
          ? footerLabels[idx]
          : safeEvents.length === 1
            ? "Notas"
            : `Evento ${idx + 1}`;
        const noteCells = Array.isArray(evt?.spelledNotes) && evt.spelledNotes.length
          ? evt.spelledNotes
          : (renderedEvents[idx]?.notes || []).map((note) => note.name).filter(Boolean);
        return { label, noteCells: noteCells.length ? noteCells : ["—"] };
      })
    : [];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-2">
        <svg
          width={width}
          height={height}
          viewBox={`0 ${contentTop} ${width} ${height}`}
          className="block"
          role="img"
          aria-label="Pentagrama en 4 por 4 con la ruta en negras"
        >
          {[0, 1, 2, 3, 4].map((line) => {
            const y = staffTop + (line * lineGap);
            return <line key={line} x1={16} y1={y} x2={width - 12} y2={y} stroke="#475569" strokeWidth="1" />;
          })}

          {Array.from({ length: measures - 1 }, (_, i) => {
            const x = leftPad + ((i + 1) * measureWidth);
            return <line key={i} x1={x} y1={staffTop - 1} x2={x} y2={staffBottom + 1} stroke="#475569" strokeWidth="1" />;
          })}

          <line x1={16} y1={staffTop - 1} x2={16} y2={staffBottom + 1} stroke="#475569" strokeWidth="1" />
          <line x1={width - 12} y1={staffTop - 1} x2={width - 12} y2={staffBottom + 1} stroke="#475569" strokeWidth="1.5" />

          <text
            x="30"
            y={clef === "bass" ? staffTop + 37 : staffTop + 42}
            fontSize={clef === "bass" ? "34" : "42"}
            fill="#0f172a"
            style={{ fontFamily: "\"Segoe UI Symbol\", \"Noto Music\", serif" }}
          >
            {clefGlyph}
          </text>

          {signatureSteps.map((step, idx) => {
            const x = 58 + (idx * 11);
            const y = staffYFromStep(step, staffTop, lineGap) + 4;
            return <text key={`${signatureType}-${idx}`} x={x} y={y} fontSize="18" fill="#0f172a">{signatureGlyph}</text>;
          })}

          <text x={62 + signatureWidth} y={staffTop + 16} fontSize="16" fontWeight="700" fill="#0f172a">{beatsPerBar}</text>
          <text x={62 + signatureWidth} y={staffTop + 38} fontSize="16" fontWeight="700" fill="#0f172a">{beatUnit}</text>

          {renderedEvents.map((evt, evtIdx) => (
            <g key={evtIdx}>
              {evt.notes.map((note, noteIdx) => {
                const y = staffYFromStep(note.step, staffTop, lineGap);
                const lines = ledgerLineSteps(note.step);
                return (
                  <g key={noteIdx}>
                    {lines.map((step) => {
                      const ly = staffYFromStep(step, staffTop, lineGap);
                      return <line key={step} x1={evt.x - 10} y1={ly} x2={evt.x + 10} y2={ly} stroke="#475569" strokeWidth="1" />;
                    })}
                    {note.displayAccidental ? <text x={evt.x - 18} y={y + 4} fontSize="14" fill="#0f172a">{note.displayAccidental}</text> : null}
                    <ellipse cx={evt.x} cy={y} rx="6.8" ry="5.1" transform={`rotate(-20 ${evt.x} ${y})`} fill="#0f172a" />
                  </g>
                );
              })}

              {evt.notes.length ? (() => {
                const stemNote = evt.stemDown ? evt.notes[0] : evt.notes[evt.notes.length - 1];
                const stemY = staffYFromStep(stemNote.step, staffTop, lineGap);
                const x = evt.stemDown ? evt.x - 6 : evt.x + 6;
                const y1 = stemY;
                const y2 = evt.stemDown ? stemY + 30 : stemY - 30;
                return <line x1={x} y1={y1} x2={x} y2={y2} stroke="#0f172a" strokeWidth="1.4" />;
              })() : null}
            </g>
          ))}

          {safeInlineEventLabels.map((label, idx) => (
            label ? (
              <text
                key={`inline-label-${idx}`}
                x={renderedEvents[idx]?.x ?? 0}
                y={renderedEvents[idx]?.inlineLabelY ?? 0}
                textAnchor="middle"
                fontSize={inlineLabelFontSize}
                fontWeight="600"
                fill="#475569"
              >
                {label}
              </text>
            ) : null
          ))}
        </svg>
      </div>
      {footerRows.length ? (
        <div className="overflow-x-auto text-xs leading-5 text-slate-600">
          <table className="inline-table w-auto border-separate border-spacing-x-2 border-spacing-y-1 font-mono text-[12px]">
            <tbody>
              {footerRows.map((row, rowIdx) => (
                <tr key={`${row.label}-${rowIdx}`}>
                  <td className="pr-2 font-semibold text-slate-700 text-left align-top whitespace-nowrap">{`${row.label}:`}</td>
                  {row.noteCells.map((note, noteIdx) => (
                    <td key={`${row.label}-${rowIdx}-${noteIdx}`} className="min-w-[20px] px-1 text-center align-top whitespace-nowrap">
                      {note}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
