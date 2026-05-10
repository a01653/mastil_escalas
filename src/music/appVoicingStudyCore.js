import * as AppStaticData from "./appStaticData.js";
const {
  STRINGS,
} = AppStaticData;

import * as AppMusicBasics from "./appMusicBasics.js";

const mod12 = (...args) => AppMusicBasics.mod12(...args);
const pcToName = (...args) => AppMusicBasics.pcToName(...args);
const pitchAt = (...args) => AppMusicBasics.pitchAt(...args);
const intervalToDegreeToken = (...args) => AppMusicBasics.intervalToDegreeToken(...args);
const chordDisplayNameFromUI = (...args) => AppMusicBasics.chordDisplayNameFromUI(...args);
const chordDisplaySuffixOnly = (...args) => AppMusicBasics.chordDisplaySuffixOnly(...args);
const buildHarmonyDegreeChord = (...args) => AppMusicBasics.buildHarmonyDegreeChord(...args);
const romanizeDegreeNumber = (...args) => AppMusicBasics.romanizeDegreeNumber(...args);
const generateDropTetradVoicings = (...args) => AppMusicBasics.generateDropTetradVoicings(...args);
const buildChordIntervals = (...args) => AppMusicBasics.buildChordIntervals(...args);
const seventhOffsetForQuality = (...args) => AppMusicBasics.seventhOffsetForQuality(...args);
const chordBassInterval = (...args) => AppMusicBasics.chordBassInterval(...args);
const spellChordNotes = (...args) => AppMusicBasics.spellChordNotes(...args);
const spellFullyDiminishedSeventhNotes = (...args) => AppMusicBasics.spellFullyDiminishedSeventhNotes(...args);
const computeAutoPreferSharps = (...args) => AppMusicBasics.computeAutoPreferSharps(...args);

export function decodeChordDbFretChar(ch) {
  const c = String(ch || "").toLowerCase();
  if (!c) return null;
  if (c === "x") return null;
  const n = parseInt(c, 36); // 0-9,a-z
  return Number.isFinite(n) ? n : null;
}

export function parseChordDbFretsString(frets) {
  const s = String(frets || "").trim();
  if (s.length !== 6) return null;
  const out = [];
  for (let i = 0; i < 6; i++) out.push(decodeChordDbFretChar(s[i]));
  return out;
}

export function encodeChordDbFretChar(n) {
  if (n == null) return "x";
  if (n < 0) return "x";
  return n.toString(36);
}

export function fretsToChordDbString(fretsLH) {
  // LowE..HighE, 6 chars
  return fretsLH.map(encodeChordDbFretChar).join("");
}

export function fretsForPcOnString(sIdx, targetPc, maxFret) {
  const out = [];
  const base = STRINGS[sIdx].pc;
  for (let f = 0; f <= maxFret; f++) {
    if (mod12(base + f) === mod12(targetPc)) out.push(f);
  }
  return out;
}

export function buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret }) {
  // Dataset: LowE..HighE. UI uses 1ª..6ª => invertimos para notes.
  const notes = [];
  const mutedSIdx = [];
  for (let i = 0; i < 6; i++) {
    const fret = fretsLH[i];
    const sIdx = 5 - i;
    if (fret == null) {
      mutedSIdx.push(sIdx);
      continue;
    }
    if (fret < 0 || fret > maxFret) return null;
    const pc = mod12(STRINGS[sIdx].pc + fret);
    notes.push({ sIdx, fret, pc });
  }
  if (notes.length < 3) return null;

  // Bajo real (nota más grave)
  let bass = notes[0];
  for (const n of notes) {
    if (pitchAt(n.sIdx, n.fret) < pitchAt(bass.sIdx, bass.fret)) bass = n;
  }

  const frettedNotes = notes.filter((n) => n.fret > 0);
  const rangeNotes = frettedNotes.length ? frettedNotes : notes;
  const minFret = Math.min(...rangeNotes.map((n) => n.fret));
  const maxF = Math.max(...rangeNotes.map((n) => n.fret));
  const span = maxF - minFret;
  const reach = maxF - minFret + 1;
  const absoluteMinFret = Math.min(...notes.map((n) => n.fret));
  const absoluteMaxFret = Math.max(...notes.map((n) => n.fret));

  return {
    frets: fretsToChordDbString(fretsLH),
    notes,
    mutedSIdx,
    bassKey: `${bass.sIdx}:${bass.fret}`,
    bassPc: bass.pc,
    minFret,
    maxFret: maxF,
    span,
    reach,
    pitchSpan: Math.max(...notes.map((n) => pitchAt(n.sIdx, n.fret))) - Math.min(...notes.map((n) => pitchAt(n.sIdx, n.fret))),
    absoluteMinFret,
    absoluteMaxFret,
    relIntervals: new Set(notes.map((n) => mod12(n.pc - rootPc))),
  };
}

export function frettedSpanFromFrets(frets) {
  const arr = Array.isArray(frets) ? frets.filter((f) => Number.isFinite(f) && f >= 0) : [];
  const fretted = arr.filter((f) => f > 0);
  const ref = fretted.length ? fretted : arr;
  if (!ref.length) return 0;
  return Math.max(...ref) - Math.min(...ref);
}

export function isErgonomicVoicing(v, maxReachLimit = 4) {
  if (!v?.notes?.length) return false;

  const fretted = v.notes.filter((n) => n.fret > 0);
  const frets = fretted.map((n) => n.fret).sort((a, b) => a - b);
  const reach = frets.length
    ? (frets[frets.length - 1] - frets[0] + 1)
    : (v.reach ?? ((v.maxFret - v.minFret) + 1));

  // Distancia real entre notas pisadas. Las cuerdas al aire no deben inflar el alcance.
  if (reach > maxReachLimit) return false;

  // Evita huecos muy grandes entre dedos.
  for (let i = 1; i < frets.length; i++) {
    if (frets[i] - frets[i - 1] > 3) return false;
  }

  return true;
}

// --------------------------------------------------------------------------
// BLOQUE: GENERADORES DE VOICINGS
// --------------------------------------------------------------------------

export function generateTriadVoicings({ rootPc, thirdOffset, fifthOffset, inversion, maxFret, maxSpan = 4 }) {
  const targets = [0, thirdOffset, fifthOffset].map((x) => mod12(rootPc + x));

  // Sets de triadas "tocables": combinaciones de 3 cuerdas con salto máximo de 2 cuerdas
  // (p.ej. permite 4-3-1 como en 43,35,15) para que haya opciones en rangos estrechos.
  const sets = [];
  for (let a = 0; a < 6; a++) {
    for (let b = a + 1; b < 6; b++) {
      for (let c = b + 1; c < 6; c++) {
        if (c - a <= 3) sets.push([a, b, c]);
      }
    }
  }

  const wantedBass = inversion === "1" ? mod12(thirdOffset) : inversion === "2" ? mod12(fifthOffset) : 0;

  // Permutaciones de asignación grado->cuerda (una nota por cuerda)
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];

  const out = [];
  const seen = new Set();

  for (const set of sets) {
    for (const perm of perms) {
      const sA = set[0];
      const sB = set[1];
      const sC = set[2];

      const fa = fretsForPcOnString(sA, targets[perm[0]], maxFret);
      const fb = fretsForPcOnString(sB, targets[perm[1]], maxFret);
      const fc = fretsForPcOnString(sC, targets[perm[2]], maxFret);

      for (const f1 of fa) {
        for (const f2 of fb) {
          for (const f3 of fc) {
            const span = frettedSpanFromFrets([f1, f2, f3]);
            if (span > maxSpan) continue;

            // Construye fretsLH: LowE..HighE
            const fretsLH = [null, null, null, null, null, null];
            // set: indices UI 0..5. LH index = 5 - sIdx
            fretsLH[5 - sA] = f1;
            fretsLH[5 - sB] = f2;
            fretsLH[5 - sC] = f3;

            const v = buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
            if (!v || !isErgonomicVoicing(v, maxSpan)) continue;

            // Exactamente 3 notas y exactamente {1,3,5}
            if (v.notes.length !== 3) continue;

            const rel = v.relIntervals;
            if (rel.size !== 3) continue;
            if (![0, mod12(thirdOffset), mod12(fifthOffset)].every((x) => rel.has(x))) continue;

            const bassInt = mod12(v.bassPc - rootPc);
            if (bassInt !== wantedBass) continue;

            const key = `${v.frets}|${wantedBass}`;
            if (seen.has(key)) continue;
            seen.add(key);

            out.push({ ...v, span });
          }
        }
      }
    }
  }

  out.sort((a, b) => (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret));
  return out;
}

export function generateTetradVoicings({ rootPc, thirdOffset, fifthOffset, seventhOffset, inversion, maxFret, maxSpan = 5 }) {
  const targets = [0, thirdOffset, fifthOffset, seventhOffset].map((x) => mod12(rootPc + x));
  // 3 sets típicos de cuatriadas: (1-2-3-4), (2-3-4-5), (3-4-5-6)
  const sets = [
    [0, 1, 2, 3],
    [1, 2, 3, 4],
    [2, 3, 4, 5],
  ];

  const wantedBass =
    inversion === "1" ? mod12(thirdOffset) : inversion === "2" ? mod12(fifthOffset) : inversion === "3" ? mod12(seventhOffset) : 0;

  // Permutaciones 4!
  const perms = [];
  const arr = [0, 1, 2, 3];
  const permute = (a, l) => {
    if (l === a.length) {
      perms.push([...a]);
      return;
    }
    for (let i = l; i < a.length; i++) {
      [a[l], a[i]] = [a[i], a[l]];
      permute(a, l + 1);
      [a[l], a[i]] = [a[i], a[l]];
    }
  };
  permute(arr, 0);

  const out = [];
  const seen = new Set();

  for (const set of sets) {
    for (const perm of perms) {
      const pcs = [targets[perm[0]], targets[perm[1]], targets[perm[2]], targets[perm[3]]];
      const fretsList = pcs.map((pc, idx) => fretsForPcOnString(set[idx], pc, maxFret));

      for (const f1 of fretsList[0]) {
        for (const f2 of fretsList[1]) {
          for (const f3 of fretsList[2]) {
            for (const f4 of fretsList[3]) {
              const span = frettedSpanFromFrets([f1, f2, f3, f4]);
              if (span > maxSpan) continue;

              const fretsLH = [null, null, null, null, null, null];
              fretsLH[5 - set[0]] = f1;
              fretsLH[5 - set[1]] = f2;
              fretsLH[5 - set[2]] = f3;
              fretsLH[5 - set[3]] = f4;

              const v = buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
              if (!v || !isErgonomicVoicing(v, maxSpan)) continue;
              if (v.notes.length !== 4) continue;

              const rel = v.relIntervals;
              if (rel.size !== 4) continue;
              if (![0, mod12(thirdOffset), mod12(fifthOffset), mod12(seventhOffset)].every((x) => rel.has(x))) continue;

              const bassInt = mod12(v.bassPc - rootPc);
              if (bassInt !== wantedBass) continue;

              const key = `${v.frets}|${wantedBass}`;
              if (seen.has(key)) continue;
              seen.add(key);

              out.push({ ...v, span });
            }
          }
        }
      }
    }
  }

  out.sort((a, b) => (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret));
  return out;
}

export function chordToneFretsOnStringInWindow({ sIdx, rootPc, allowedIntervals, nearFrom, nearTo }) {
  const out = [];
  const openInterval = mod12(STRINGS[sIdx].pc - rootPc);
  if (allowedIntervals.has(openInterval)) out.push(0);
  for (let fret = nearFrom; fret <= nearTo; fret++) {
    const interval = mod12(STRINGS[sIdx].pc + fret - rootPc);
    if (allowedIntervals.has(interval)) out.push(fret);
  }
  return Array.from(new Set(out));
}

export function augmentVoicingsWithChordToneDuplicatesInWindow({ voicings, rootPc, allowedIntervals, requiredIntervals, allowedBassIntervals, nearFrom, nearTo, maxFret, maxSpan }) {
  const baseList = Array.isArray(voicings) ? voicings : [];
  const out = [];
  const seen = new Set();
  const mustHave = requiredIntervals instanceof Set ? requiredIntervals : new Set(Array.from(allowedIntervals || []).map(mod12));

  const pushVoicing = (v) => {
    if (!v?.frets) return;
    if (seen.has(v.frets)) return;
    seen.add(v.frets);
    out.push(v);
  };

  baseList.forEach(pushVoicing);

  for (const base of baseList) {
    const baseFretsLH = parseChordDbFretsString(base?.frets);
    if (!baseFretsLH) continue;

    const fretted = (base.notes || []).filter((n) => n.fret > 0);
    const center = fretted.length ? fretted.reduce((acc, n) => acc + n.fret, 0) / fretted.length : nearFrom;

    const stringDefs = Array.from({ length: 6 }, (_, sIdx) => {
      const baseFret = baseFretsLH[5 - sIdx];
      const ranked = chordToneFretsOnStringInWindow({ sIdx, rootPc, allowedIntervals, nearFrom, nearTo })
        .sort((a, b) => {
          const scoreA = a === 0 ? -100 : Math.abs(a - center);
          const scoreB = b === 0 ? -100 : Math.abs(b - center);
          return scoreA - scoreB || a - b;
        })
        .slice(0, 4);

      const alts = [];
      const addAlt = (fret) => {
        if (fret === baseFret) return;
        if (alts.includes(fret)) return;
        alts.push(fret);
      };

      if (baseFret == null) {
        ranked.forEach(addAlt);
      } else {
        if (ranked.includes(0) && baseFret !== 0) addAlt(0);
        if (sIdx === 0 || sIdx === 5) addAlt(null);
      }

      return { sIdx, alts };
    }).filter((x) => x.alts.length);

    if (!stringDefs.length) continue;

    const rec = (idx, fretsLH, changedCount) => {
      if (idx >= stringDefs.length) {
        if (changedCount === 0) return;
        const v = buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
        if (!v || !isErgonomicVoicing(v, maxSpan)) return;
        if (!v.notes.every((n) => n.fret === 0 || (n.fret >= nearFrom && n.fret <= nearTo))) return;

        const rel = new Set((v.notes || []).map((n) => mod12(n.pc - rootPc)));
        for (const intv of rel) {
          if (!allowedIntervals.has(intv)) return;
        }
        for (const intv of mustHave) {
          if (!rel.has(intv)) return;
        }

        const bassInt = mod12(v.bassPc - rootPc);
        if (Array.isArray(allowedBassIntervals) && allowedBassIntervals.length && !allowedBassIntervals.includes(bassInt)) return;

        pushVoicing({
          ...v,
          _form: base?._form,
          _sourceRootPc: base?._sourceRootPc,
        });
        return;
      }

      rec(idx + 1, fretsLH, changedCount);
      if (changedCount >= 2) return;

      const { sIdx, alts } = stringDefs[idx];
      for (const fret of alts) {
        const next = [...fretsLH];
        next[5 - sIdx] = fret;
        rec(idx + 1, next, changedCount + 1);
      }
    };

    rec(0, [...baseFretsLH], 0);
  }

  return out.sort((a, b) => (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret) || a.frets.localeCompare(b.frets));
}

export function augmentExactVoicingsWithOpenSubstitutions({ voicings, rootPc, allowedIntervals, requiredIntervals, allowedBassIntervals, nearFrom, nearTo, maxFret, maxSpan, exactNoteCount }) {
  const baseList = Array.isArray(voicings) ? voicings : [];
  const out = [];
  const seen = new Set();
  const mustHave = requiredIntervals instanceof Set ? requiredIntervals : new Set(Array.from(allowedIntervals || []).map(mod12));

  const pushBuiltIfValid = (fretsLH, baseMeta = null) => {
    if (!Array.isArray(fretsLH)) return;
    const v = buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
    if (!v || !isErgonomicVoicing(v, maxSpan)) return;
    if (!v.notes.every((n) => n.fret === 0 || (n.fret >= nearFrom && n.fret <= nearTo))) return;
    if (v.notes.length !== exactNoteCount) return;

    const rel = new Set((v.notes || []).map((n) => mod12(n.pc - rootPc)));
    for (const intv of rel) {
      if (!allowedIntervals.has(intv)) return;
    }
    for (const intv of mustHave) {
      if (!rel.has(intv)) return;
    }

    const bassInt = mod12(v.bassPc - rootPc);
    if (Array.isArray(allowedBassIntervals) && allowedBassIntervals.length && !allowedBassIntervals.includes(bassInt)) return;

    if (seen.has(v.frets)) return;
    seen.add(v.frets);
    out.push({
      ...v,
      _form: baseMeta?._form,
      _sourceRootPc: baseMeta?._sourceRootPc,
    });
  };

  baseList.forEach((v) => {
    if (!v?.frets) return;
    if (seen.has(v.frets)) return;
    seen.add(v.frets);
    out.push(v);
  });

  for (const base of baseList) {
    const baseFretsLH = parseChordDbFretsString(base?.frets);
    if (!baseFretsLH) continue;

    const openEligibleLhIdx = Array.from({ length: 6 }, (_, lhIdx) => {
      const sIdx = 5 - lhIdx;
      return allowedIntervals.has(mod12(STRINGS[sIdx].pc - rootPc));
    });

    const usedIdx = baseFretsLH.map((f, lhIdx) => ({ lhIdx, fret: f })).filter((x) => x.fret != null);
    const mutedIdx = baseFretsLH.map((f, lhIdx) => ({ lhIdx, fret: f })).filter((x) => x.fret == null);

    for (const item of usedIdx) {
      if (item.fret === 0) continue;
      if (!openEligibleLhIdx[item.lhIdx]) continue;
      const next = [...baseFretsLH];
      next[item.lhIdx] = 0;
      pushBuiltIfValid(next, base);
    }

    for (const add of mutedIdx) {
      if (!openEligibleLhIdx[add.lhIdx]) continue;
      for (const mute of usedIdx) {
        const next = [...baseFretsLH];
        next[add.lhIdx] = 0;
        next[mute.lhIdx] = null;
        pushBuiltIfValid(next, base);
      }
    }
  }

  return out.sort((a, b) => (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret) || a.frets.localeCompare(b.frets));
}

export function buildStringSetsForNoteCount(noteCount) {
  const out = [];
  const rec = (start, acc) => {
    if (acc.length === noteCount) {
      if (acc[acc.length - 1] - acc[0] <= noteCount) out.push([...acc]);
      return;
    }
    for (let s = start; s < 6; s++) {
      acc.push(s);
      rec(s + 1, acc);
      acc.pop();
    }
  };
  rec(0, []);
  return out;
}

export function buildPermutations(list) {
  const out = [];
  const a = [...list];
  const rec = (l) => {
    if (l === a.length) {
      out.push([...a]);
      return;
    }
    for (let i = l; i < a.length; i++) {
      [a[l], a[i]] = [a[i], a[l]];
      rec(l + 1);
      [a[l], a[i]] = [a[i], a[l]];
    }
  };
  rec(0);
  return out;
}

export function generateExactIntervalChordVoicings({ rootPc, intervals, bassInterval = 0, maxFret, maxSpan = 5 }) {
  const wanted = Array.from(new Set((intervals || []).map(mod12)));
  const noteCount = wanted.length;
  if (noteCount < 3 || noteCount > 6) return [];

  const stringSets = buildStringSetsForNoteCount(noteCount);
  const perms = buildPermutations(wanted);
  const out = [];
  const seen = new Set();
  const wantedBass = mod12(bassInterval);

  for (const set of stringSets) {
    for (const perm of perms) {
      const fretLists = perm.map((intv, idx) => fretsForPcOnString(set[idx], mod12(rootPc + intv), maxFret));
      const fretsLH = [null, null, null, null, null, null];

      const rec = (idx, minF, maxF2) => {
        if (idx === noteCount) {
          const v = buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
          if (!v || !isErgonomicVoicing(v, maxSpan)) return;
          if (v.notes.length !== noteCount) return;
          if (v.relIntervals.size !== wanted.length) return;
          if (!wanted.every((x) => v.relIntervals.has(x))) return;

          const bassInt = mod12(v.bassPc - rootPc);
          if (bassInt !== wantedBass) return;

          const key = `${v.frets}|${wantedBass}`;
          if (seen.has(key)) return;
          seen.add(key);
          out.push({ ...v, span: v.span });
          return;
        }

        for (const fret of fretLists[idx]) {
          const nextMin = fret > 0 ? (minF == null ? fret : Math.min(minF, fret)) : minF;
          const nextMax = fret > 0 ? (maxF2 == null ? fret : Math.max(maxF2, fret)) : maxF2;
          const nextSpan = nextMin == null || nextMax == null ? 0 : (nextMax - nextMin);
          if (nextSpan > maxSpan) continue;
          fretsLH[5 - set[idx]] = fret;
          rec(idx + 1, nextMin, nextMax);
          fretsLH[5 - set[idx]] = null;
        }
      };

      rec(0, null, null);
    }
  }

  out.sort((a, b) => (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret));
  return out;
}

export function isDropForm(form) {
  return String(form || "").startsWith("drop");
}

export function isOpenForm(form) {
  return String(form || "") === "open";
}

export function voicingPitchSpan(v) {
  if (!v?.notes?.length) return 0;
  const pitches = v.notes.map((n) => pitchAt(n.sIdx, n.fret));
  return Math.max(...pitches) - Math.min(...pitches);
}

export function isClosedPositionVoicing(v) {
  return voicingPitchSpan(v) <= 12;
}

export function filterVoicingsByForm(voicings, form) {
  const list = Array.isArray(voicings) ? voicings : [];
  if (isDropForm(form)) return list;
  if (isOpenForm(form)) return list.filter((v) => !isClosedPositionVoicing(v));
  return list.filter((v) => isClosedPositionVoicing(v));
}

export function positionFormFromEffectiveForm(form, fallback = "closed") {
  if (isDropForm(form)) return fallback;
  return isOpenForm(form) ? "open" : "closed";
}

export function _dropFormFromEffectiveForm(form) {
  return isDropForm(form) ? form : "none";
}

export function structureUsesManualForm(structure) {
  return structure !== "chord";
}

export function normalizeChordInversionSelection(value) {
  return ["root", "1", "2", "3", "all"].includes(value) ? value : "root";
}

export function normalizeChordFormToInversion(form) {
  const normalized = normalizeChordInversionSelection(form);
  return normalized === "all" ? "root" : normalized;
}

export function concreteInversionsForSelection(selection, allowThirdInversion = true) {
  const allowed = allowThirdInversion ? ["root", "1", "2", "3"] : ["root", "1", "2"];
  const normalized = normalizeChordInversionSelection(selection);
  if (normalized === "all") return allowed;
  return allowed.includes(normalized) ? [normalized] : ["root"];
}

export function positionFormLabel(value) {
  return value === "open" ? "Abierto" : "Cerrado";
}

export function selectedInversionLabel(value, allowThirdInversion = true) {
  const normalized = normalizeChordInversionSelection(value);
  if (normalized === "all") return "Todas las inversiones";
  const list = allowThirdInversion ? AppMusicBasics.CHORD_INVERSIONS : AppMusicBasics.CHORD_INVERSIONS.filter((x) => x.value !== "3");
  return list.find((x) => x.value === normalized)?.label || "Fundamental";
}

export function actualVoicingShapeSummary(voicing, requestedForm, positionForm) {
  if (voicing?._form && isDropForm(voicing._form)) {
    return {
      position: "Abierto",
      drop: AppMusicBasics.CHORD_FORMS.find((x) => x.value === voicing._form)?.label || "Drop",
    };
  }
  if (isDropForm(requestedForm)) {
    return {
      position: positionFormLabel(positionFormFromEffectiveForm(requestedForm, positionForm || "closed")),
      drop: AppMusicBasics.CHORD_FORMS.find((x) => x.value === requestedForm)?.label || "Drop",
    };
  }
  return {
    position: studyVoicingFormLabel(voicing, requestedForm),
    drop: null,
  };
}

export function buildChordHeaderSummary({ name, plan, voicing, positionForm }) {
  if (!plan) return name || "";
  const parts = [name || ""];
  const layer = chordEngineLayerLabel(plan);
  if (layer && layer !== "—") parts.push(layer);

  const shape = actualVoicingShapeSummary(voicing, plan.form, positionForm);
  if (shape.position) parts.push(shape.position);
  if (shape.drop) parts.push(shape.drop);

  parts.push(voicing ? actualInversionLabelFromVoicing(plan, voicing) : selectedInversionLabel(plan.inversion, plan.ui?.allowThirdInversion));
  return parts.filter(Boolean).join(" - ");
}

export function bassIntervalsForSelection(plan) {
  const inversions = concreteInversionsForSelection(plan?.inversion, plan?.ui?.allowThirdInversion);
  return Array.from(new Set(inversions.map((inv) => chordBassInterval({
    quality: plan.quality,
    suspension: plan.suspension,
    structure: plan.structure,
    inversion: inv,
    chordIntervals: plan.intervals,
    ext7: plan.ext7,
    ext6: plan.ext6,
    ext9: plan.ext9,
    ext11: plan.ext11,
    ext13: plan.ext13,
  })).map(mod12)));
}

export function dedupeAndSortVoicings(list) {
  const map = new Map();
  for (const item of list || []) {
    if (!item?.frets) continue;
    const prev = map.get(item.frets);
    if (!prev) {
      map.set(item.frets, item);
      continue;
    }

    const prevCost = (prev.minFret ?? 0) * 10 + (prev.span ?? 0);
    const nextCost = (item.minFret ?? 0) * 10 + (item.span ?? 0);
    const prevHasDropMeta = !!prev._form && isDropForm(prev._form);
    const nextHasDropMeta = !!item._form && isDropForm(item._form);

    if (nextCost < prevCost) {
      map.set(item.frets, item);
      continue;
    }

    if (nextCost === prevCost) {
      if (nextHasDropMeta && !prevHasDropMeta) {
        map.set(item.frets, item);
        continue;
      }
      if ((item._sourceRootPc != null) && (prev._sourceRootPc == null)) {
        map.set(item.frets, item);
        continue;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret) || a.frets.localeCompare(b.frets));
}

export function buildOpenSupersetTetradVoicings({ rootCandidates, inversionChoices, plan, maxFret, maxSpan }) {
  const topVoiceOffset = plan.topVoiceOffset;
  if (topVoiceOffset == null) return [];

  const normalOpen = rootCandidates.flatMap((rootCandidate) =>
    inversionChoices.flatMap((inv) =>
      filterVoicingsByForm(generateTetradVoicings({
        rootPc: rootCandidate,
        thirdOffset: plan.thirdOffset,
        fifthOffset: plan.fifthOffset,
        seventhOffset: topVoiceOffset,
        inversion: inv,
        maxFret,
        maxSpan,
      }), "open").map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, rootCandidate))
    )
  );

  if (!plan.ui?.dropEligible) return dedupeAndSortVoicings(normalOpen);

  const dropForms = AppMusicBasics.CHORD_FORMS.filter((x) => isDropForm(x.value)).map((x) => x.value);
  const dropOpen = rootCandidates.flatMap((rootCandidate) =>
    inversionChoices.flatMap((inv) =>
      dropForms.flatMap((form) =>
        generateDropTetradVoicings({
          rootPc: rootCandidate,
          thirdOffset: plan.thirdOffset,
          fifthOffset: plan.fifthOffset,
          seventhOffset: plan.seventhOffset,
          form,
          inversion: inv,
          maxFret,
          maxSpan,
        }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, rootCandidate))
      )
    )
  );

  return dedupeAndSortVoicings([...normalOpen, ...dropOpen]);
}

export function isSymmetricDim7Plan(plan) {
  if (!plan) return false;
  if (plan.quality !== "dim") return false;
  const sig = Array.from(new Set((plan.intervals || []).map(mod12))).sort((a, b) => a - b).join(",");
  return sig === "0,3,6,9";
}

export function symmetricRootCandidatesForPlan(plan) {
  if (!isSymmetricDim7Plan(plan)) return [plan?.rootPc ?? 0];
  if (plan?.inversion !== "all") return [plan?.rootPc ?? 0];
  return [0, 3, 6, 9].map((shift) => mod12((plan?.rootPc ?? 0) + shift));
}

export function normalizeGeneratedVoicingForDisplay(voicing, displayRootPc, sourceRootPc) {
  if (!voicing) return voicing;
  return {
    ...voicing,
    relIntervals: new Set((voicing.notes || []).map((n) => mod12(n.pc - displayRootPc))),
    _sourceRootPc: sourceRootPc,
  };
}

export function singleAddOffsetFromUi({ ext6, ext9, ext11, ext13 }) {
  if (ext13) return 9;
  if (ext11) return 5;
  if (ext9) return 2;
  if (ext6) return 9;
  return null;
}

export function isStrictFourNoteDropEligible({ structure, ext7, ext6, ext9, ext11, ext13 }) {
  if (structure !== "tetrad") return false;
  const addCount = addSelectionCount({ ext6, ext9, ext11, ext13 });
  if (hasEffectiveSeventh({ structure, ext7, ext6, ext9, ext11, ext13 })) return addCount === 0;
  return addCount === 1;
}

export function addSelectionCount({ ext6, ext9, ext11, ext13 }) {
  return (ext6 ? 1 : 0) + (ext9 ? 1 : 0) + (ext11 ? 1 : 0) + (ext13 ? 1 : 0);
}

export function isSingleAddChordSelection({ ext7, ext6, ext9, ext11, ext13 }) {
  return !ext7 && addSelectionCount({ ext6, ext9, ext11, ext13 }) === 1;
}

export function isMultiAddChordSelection({ ext7, ext6, ext9, ext11, ext13 }) {
  return !ext7 && addSelectionCount({ ext6, ext9, ext11, ext13 }) >= 2;
}

export function buildMultiAddDisplaySuffix({ quality, suspension = "none", ext6, ext9, ext11, ext13 }) {
  const parts = [];
  if (ext6) parts.push("6");
  if (ext9) parts.push("9");
  if (ext11) parts.push("11");
  if (ext13) parts.push("13");
  if (!parts.length) return "";

  const sus = suspension || "none";
  if (sus === "sus2" || sus === "sus4") {
    return `${sus}(add${parts.join(",")})`;
  }
  if (ext6 && !ext13) {
    const extraParts = [];
    if (ext9) extraParts.push("9");
    if (ext11) extraParts.push("11");
    const base = quality === "min" ? "m6" : "6";
    return extraParts.length ? `${base}(add${extraParts.join(",")})` : base;
  }
  if (quality === "min") {
    return `m(add${parts.join(",")})`;
  }
  return `add${parts.join(",")}`;
}

export function hasEffectiveSeventh({ structure, ext7, ext6, ext9, ext11, ext13 }) {
  if (structure === "tetrad") {
    const addOnly = ((ext6 ? 1 : 0) + (ext9 ? 1 : 0) + (ext11 ? 1 : 0) + (ext13 ? 1 : 0)) > 0;
    return !addOnly;
  }
  return !!ext7;
}

export function chordThirdOffsetFromUI(quality, suspension) {
  if (suspension === "sus2") return 2;
  if (suspension === "sus4") return 5;
  return quality === "maj" || quality === "dom" ? 4 : 3;
}

export function chordFifthOffsetFromUI(quality, suspension) {
  if (suspension && suspension !== "none") return 7;
  return quality === "dim" || quality === "hdim" ? 6 : 7;
}

export function buildChordUiRestrictions({ structure, ext7, ext6, ext9, ext11, ext13 }) {
  const dropEligible = isStrictFourNoteDropEligible({ structure, ext7, ext6, ext9, ext11, ext13 });
  return {
    usesManualForm: structureUsesManualForm(structure),
    allowThirdInversion: structure !== "triad",
    dropEligible,
    ext: {
      showSeven: true,
      showSix: true,
      showNine: structure !== "triad",
      showEleven: structure !== "triad",
      showThirteen: structure !== "triad",
      canToggleSeven: structure === "chord",
      canToggleSix: structure !== "triad",
      canToggleNine: structure !== "triad",
      canToggleEleven: structure !== "triad",
      canToggleThirteen: structure !== "triad",
    },
  };
}

export function buildChordEnginePlan({
  rootPc,
  quality,
  suspension = "none",
  structure,
  inversion,
  form,
  ext7,
  ext6,
  ext9,
  ext11,
  ext13,
}) {
  const inversionSelection = normalizeChordInversionSelection(inversion);
  const inversionSingle = inversionSelection === "all" ? "root" : inversionSelection;
  const thirdOffset = chordThirdOffsetFromUI(quality, suspension);
  const fifthOffset = chordFifthOffsetFromUI(quality, suspension);
  const seventhOffset = hasEffectiveSeventh({ structure, ext7, ext6, ext9, ext11, ext13 }) ? seventhOffsetForQuality(quality) : null;
  const singleAddOffset = singleAddOffsetFromUi({ ext6, ext9, ext11, ext13 });
  const topVoiceOffset = seventhOffset ?? singleAddOffset;
  const intervals = buildChordIntervals({ quality, suspension, structure, ext7, ext6, ext9, ext11, ext13 });
  const bassInterval = chordBassInterval({
    quality,
    suspension,
    structure,
    inversion: inversionSingle,
    chordIntervals: intervals,
    ext7,
    ext6,
    ext9,
    ext11,
    ext13,
  });

  const strictDrop = isDropForm(form) && isStrictFourNoteDropEligible({ structure, ext7, ext6, ext9, ext11, ext13 });
  const singleAdd = isSingleAddChordSelection({ ext7, ext6, ext9, ext11, ext13 });
  const multiAdd = isMultiAddChordSelection({ ext7, ext6, ext9, ext11, ext13 });
  const triadOnly = structure === "triad" && !ext7 && !ext6;
  const tetradFamily = structure === "tetrad" || (structure === "triad" && (ext7 || ext6));
  const chordFamily = structure === "chord";
  const extended = chordFamily && !singleAdd && !multiAdd && (ext7 || ext6 || ext9 || ext11 || ext13);

  let layer = "unsupported";
  let generator = "none";

  if (strictDrop) {
    layer = "drop";
    generator = "drop";
  } else if (triadOnly) {
    layer = "triad";
    generator = "triad";
  } else if (tetradFamily && singleAdd) {
    layer = "add";
    generator = "tetrad";
  } else if (tetradFamily) {
    layer = "tetrad";
    generator = "tetrad";
  } else if (chordFamily && multiAdd) {
    layer = "multi_add";
    generator = "exact";
  } else if (chordFamily && singleAdd) {
    layer = "add";
    generator = "tetrad";
  } else if (extended) {
    layer = "extended";
    generator = "json";
  } else if (chordFamily) {
    layer = "chord";
    generator = "json";
  }

  const ui = buildChordUiRestrictions({ structure, ext7, ext6, ext9, ext11, ext13 });

  return {
    rootPc: mod12(rootPc),
    quality,
    suspension,
    structure,
    inversion: inversionSelection,
    inversionSingle,
    form,
    ext7,
    ext6,
    ext9,
    ext11,
    ext13,
    thirdOffset,
    fifthOffset,
    seventhOffset,
    singleAddOffset,
    topVoiceOffset,
    intervals,
    bassInterval,
    strictDrop,
    singleAdd,
    multiAdd,
    triadOnly,
    tetradFamily,
    chordFamily,
    extended,
    layer,
    generator,
    ui,
  };
}

export function chordEngineLayerLabel(plan) {
  switch (plan?.layer) {
    case "triad": return "Triada";
    case "tetrad": return "Cuatriada";
    case "add": return "Add";
    case "extended": return "Extendido";
    case "multi_add": return "Add múltiple";
    case "drop": return "Drop";
    case "chord": return "Acorde";
    case "quartal": return "Cuartal";
    case "guide_tones": return "Notas guía";
    default: return "—";
  }
}

export function chordEngineGeneratorLabel(plan) {
  switch (plan?.generator) {
    case "triad": return "Triad";
    case "tetrad": return "Tetrad";
    case "drop": return "Drop";
    case "exact": return "Exact";
    case "json": return "JSON";
    case "quartal": return "Quartal";
    default: return "—";
  }
}

export function studyVoicingFormLabel(voicing, form) {
  if (voicing?.quartalSpreadKind) {
    return voicing.quartalSpreadKind === "open" ? "Abierto" : "Cerrado";
  }
  if (isDropForm(form)) {
    return AppMusicBasics.CHORD_FORMS.find((x) => x.value === form)?.label || "Drop";
  }
  if (!voicing) return isOpenForm(form) ? "Abierto" : "Cerrado";
  return isClosedPositionVoicing(voicing) ? "Cerrado" : "Abierto";
}

export function explainStudyRules(plan) {
  if (!plan) return [];
  const out = [];
  if (plan.layer === "quartal") {
    out.push("En cuartales el voicing real depende del apilado abierto/cerrado y del número de voces.");
    if (plan.quartalReference === "scale") out.push("Si la referencia es diatónica, la raíz real puede desplazarse al grado generado.");
    return out;
  }
  if (plan.layer === "guide_tones") {
    out.push("Las notas guía usan shells de 3 notas con 1, 3 y 7/6 según la calidad.");
    return out;
  }
  if (!plan.ui?.usesManualForm) out.push("En estructura Acorde la forma es automática.");
  if (!plan.ui?.allowThirdInversion) out.push("La 3ª inversión no está disponible en triadas.");
  if (!plan.ui?.dropEligible) out.push("Los drops solo son válidos en cuatriadas estrictas de 4 notas.");
  if (plan.layer === "multi_add") out.push("Las combinaciones add múltiples usan el generador exacto de intervalos.");
  if (plan.layer === "extended") out.push("Los acordes extendidos usan el generador de voicings del dataset JSON.");
  if (plan.layer === "add") out.push("Los add simples se resuelven como cuatriadas sin 7ª real.");
  return out;
}

export function buildChordNamingExplanation(plan) {
  if (!plan) return [];
  const out = [];

  if (plan.layer === "quartal") {
    out.push("Se nombra cuartal porque las voces se apilan por cuartas respecto a la raíz actual.");
    if (plan.quartalType === "mixed") out.push("Es mixto porque combina al menos una 4ª aumentada con 4ªs justas.");
    else out.push("Es puro porque todas las cuartas del apilado son justas.");
    return out;
  }

  if (plan.layer === "guide_tones") {
    out.push("Se nombra como shell de notas guía porque conserva 1, 3 y 7/6 como núcleo armónico.");
    if (plan.guideToneQuality === "maj6") out.push("La tercera voz es 6 en lugar de 7, por eso el color resultante es 6.");
    return out;
  }

  if (plan.suspension === "sus2") out.push("Se nombra sus2 porque la 3ª se sustituye por 2ª.");
  else if (plan.suspension === "sus4") out.push("Se nombra sus4 porque la 3ª se sustituye por 4ª.");
  else if (plan.quality === "maj") out.push("La calidad sale de 3ª mayor y 5ª justa.");
  else if (plan.quality === "dom") out.push("La base es mayor y, cuando aparece la 7ª, se interpreta como dominante.");
  else if (plan.quality === "min") out.push("La calidad sale de 3ª menor y 5ª justa.");
  else if (plan.quality === "dim") out.push("La calidad sale de 3ª menor y 5ª disminuida.");
  else if (plan.quality === "hdim") out.push("Se interpreta como m7(b5): 3ª menor, 5ª disminuida y 7ª menor.");

  if (plan.layer === "triad") out.push("La estructura efectiva es una triada.");
  if (plan.layer === "tetrad") out.push("La estructura efectiva es una cuatriada.");
  if (plan.layer === "drop") out.push("El nombre mantiene el acorde, pero el voicing se fuerza como drop.");
  if (plan.layer === "extended") out.push("El sufijo extendido sale de 7ª y/o tensiones superiores.");
  if (plan.layer === "add") out.push("Se nombra como add porque añade tensión sin 7ª real.");
  if (plan.layer === "multi_add") out.push("Se nombra como add múltiple porque combina varias tensiones sin 7ª.");

  if (plan.ext7 && plan.seventhOffset != null) out.push(`Incluye ${intervalToDegreeToken(plan.seventhOffset)}, por eso aparece la 7ª.`);
  else if (plan.singleAddOffset != null) out.push(`La cuarta voz real es ${intervalToDegreeToken(plan.singleAddOffset)}.`);
  if (plan.ext6) out.push("Incluye 6 como color añadido.");
  if (plan.ext9) out.push("Incluye 9 como tensión añadida.");
  if (plan.ext11) out.push("Incluye 11 como tensión añadida.");
  if (plan.ext13) out.push("Incluye 13 como tensión añadida.");

  return out;
}

export function requestedFormLabel(plan) {
  if (!plan) return "—";
  if (isDropForm(plan.form)) return AppMusicBasics.CHORD_FORMS.find((x) => x.value === plan.form)?.label || "Drop";
  return isOpenForm(plan.form) ? "Abierto" : "Cerrado";
}

export function actualInversionLabelFromVoicing(plan, voicing) {
  if (!plan || !voicing) return "—";
  const bassInt = mod12(voicing.bassPc - plan.rootPc);
  if (bassInt === 0) return "Fundamental";
  if (bassInt === mod12(plan.thirdOffset)) return "1ª inversión";
  if (bassInt === mod12(plan.fifthOffset)) return "2ª inversión";
  if (plan.topVoiceOffset != null && bassInt === mod12(plan.topVoiceOffset)) return "3ª inversión";
  return `Bajo ${intervalToDegreeToken(bassInt)}`;
}

export function deriveDetectedCandidateCopyInversion(candidate) {
  if (!candidate?.uiPatch) return null;
  if (candidate.externalBassInterval != null) return null;

  const patch = candidate.uiPatch;
  const bassInterval = mod12(candidate.bassPc - candidate.rootPc);
  const thirdOffset = chordThirdOffsetFromUI(patch.quality, patch.suspension || "none");
  const fifthOffset = chordFifthOffsetFromUI(patch.quality, patch.suspension || "none");

  if (bassInterval === 0) return "root";
  if (bassInterval === mod12(thirdOffset)) return "1";
  if (bassInterval === mod12(fifthOffset)) return "2";

  if (hasEffectiveSeventh({
    structure: patch.structure,
    ext7: !!patch.ext7,
    ext6: !!patch.ext6,
    ext9: !!patch.ext9,
    ext11: !!patch.ext11,
    ext13: !!patch.ext13,
  })) {
    const seventhOffset = seventhOffsetForQuality(patch.quality);
    if (bassInterval === mod12(seventhOffset)) return "3";
    return null;
  }

  const addOffset = singleAddOffsetFromUi({
    ext6: !!patch.ext6,
    ext9: !!patch.ext9,
    ext11: !!patch.ext11,
    ext13: !!patch.ext13,
  });
  if (addOffset != null && bassInterval === mod12(addOffset)) return "3";
  return null;
}

export function analyzeVoicingVsPlan(plan, voicing, preferSharps) {
  if (!plan) {
    return {
      requested: [],
      actual: [],
      missing: [],
      extra: [],
      requestedForm: "—",
      actualForm: "—",
      actualNotes: [],
      requestedBass: "—",
      actualBass: "—",
      actualInversion: "—",
    };
  }

  const requested = Array.from(new Set((plan.intervals || []).map(mod12))).sort((a, b) => a - b);
  const actual = voicing ? Array.from(new Set(Array.from(voicing.relIntervals || []).map(mod12))).sort((a, b) => a - b) : [];
  const requestedTokens = requested.map((i) => intervalToDegreeToken(i));
  const actualTokens = actual.map((i) => intervalToDegreeToken(i));
  const missing = requested.filter((i) => !actual.includes(i)).map((i) => intervalToDegreeToken(i));
  const extra = actual.filter((i) => !requested.includes(i)).map((i) => intervalToDegreeToken(i));

  return {
    requested: requestedTokens,
    actual: actualTokens,
    missing,
    extra,
    requestedForm: requestedFormLabel(plan),
    actualForm: studyVoicingFormLabel(voicing, plan.form),
    actualNotes: voicing ? [...voicing.notes].sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret)).map((n) => pcToName(n.pc, preferSharps)) : [],
    requestedBass: pcToName(mod12(plan.rootPc + plan.bassInterval), preferSharps),
    actualBass: voicing ? pcToName(voicing.bassPc, preferSharps) : "—",
    actualInversion: actualInversionLabelFromVoicing(plan, voicing),
  };
}

export function analyzeScaleTensionsForChord({ activeScaleRootPc, scaleIntervals, chordRootPc, chordIntervals, preferSharps }) {
  const scalePcSet = new Set((scaleIntervals || []).map((i) => mod12(activeScaleRootPc + i)));
  const chordSet = new Set((chordIntervals || []).map(mod12));
  const candidates = [
    { intv: 1, label: "b9" },
    { intv: 2, label: "9" },
    { intv: 3, label: "#9" },
    { intv: 5, label: "11" },
    { intv: 6, label: "#11" },
    { intv: 8, label: "b13" },
    { intv: 9, label: "13" },
  ];

  const available = [];
  const unavailable = [];

  for (const c of candidates) {
    if (chordSet.has(c.intv)) continue;
    const notePc = mod12(chordRootPc + c.intv);
    const item = `${c.label} (${pcToName(notePc, preferSharps)})`;
    if (scalePcSet.has(notePc)) available.push(item);
    else unavailable.push(item);
  }

  return { available, unavailable };
}

export function buildDominantInfo(targetRootPc, preferSharps) {
  const rootPc = mod12(targetRootPc + 7);
  const rootName = pcToName(rootPc, preferSharps);
  const targetName = pcToName(mod12(targetRootPc), preferSharps);
  const notes = spellChordNotes({ rootPc, chordIntervals: [0, 4, 7, 10], preferSharps });
  return {
    rootPc,
    name: `${rootName}7`,
    notes,
    relation: `V7 \u2192 ${targetName}`,
  };
}

export function buildBackdoorDominantInfo(targetRootPc, preferSharps) {
  const rootPc = mod12(targetRootPc - 2);
  const rootName = pcToName(rootPc, preferSharps);
  const targetName = pcToName(mod12(targetRootPc), preferSharps);
  const notes = spellChordNotes({ rootPc, chordIntervals: [0, 4, 7, 10], preferSharps });
  return {
    rootPc,
    name: `${rootName}7`,
    notes,
    relation: `bVII7 \u2192 ${targetName}`,
  };
}

export function buildStudyChordLabel({ rootPc, preferSharps, quality, suspension = "none", structure = "triad", ext7 = false, ext6 = false, ext9 = false, ext11 = false, ext13 = false }) {
  return chordDisplayNameFromUI({
    rootPc,
    preferSharps,
    quality,
    suspension,
    structure,
    ext7,
    ext6,
    ext9,
    ext11,
    ext13,
  });
}

export function buildStudyChordSpecFromUi({
  rootPc,
  preferSharps,
  quality,
  suspension = "none",
  structure = "triad",
  ext7 = false,
  ext6 = false,
  ext9 = false,
  ext11 = false,
  ext13 = false,
  labelOverride = "",
}) {
  const safeRootPc = mod12(rootPc);
  const chordIntervals = Array.from(new Set(buildChordIntervals({
    quality,
    suspension,
    structure,
    ext7,
    ext6,
    ext9,
    ext11,
    ext13,
  }).map(mod12))).sort((a, b) => a - b);
  const safePreferSharps = !!preferSharps;
  const label = labelOverride || buildStudyChordLabel({
    rootPc: safeRootPc,
    preferSharps: safePreferSharps,
    quality,
    suspension,
    structure,
    ext7,
    ext6,
    ext9,
    ext11,
    ext13,
  });
  const notes = spellChordNotes({ rootPc: safeRootPc, chordIntervals, preferSharps: safePreferSharps });
  return {
    rootPc: safeRootPc,
    preferSharps: safePreferSharps,
    label,
    chordIntervals,
    notes,
  };
}

export function buildStudyChordSpecCustom({ rootPc, preferSharps, chordIntervals, label }) {
  const safeRootPc = mod12(rootPc);
  const safePreferSharps = !!preferSharps;
  const uniqueIntervals = Array.from(new Set((chordIntervals || []).map(mod12))).sort((a, b) => a - b);
  return {
    rootPc: safeRootPc,
    preferSharps: safePreferSharps,
    label: label || pcToName(safeRootPc, safePreferSharps),
    chordIntervals: uniqueIntervals,
    notes: spellChordNotes({ rootPc: safeRootPc, chordIntervals: uniqueIntervals, preferSharps: safePreferSharps }),
  };
}

export function buildStudyChordSpecFromPlan({ rootPc, preferSharps, plan, labelOverride = "" }) {
  const safeRootPc = mod12(rootPc);
  const safePreferSharps = !!preferSharps;
  const planIntervals = Array.isArray(plan?.intervals) && plan.intervals.length
    ? Array.from(new Set(plan.intervals.map(mod12))).sort((a, b) => a - b)
    : [];
  const fallbackIntervals = plan?.quality
    ? Array.from(new Set(buildChordIntervals({
        quality: plan.quality,
        suspension: plan.suspension || "none",
        structure: plan.structure || "triad",
        ext7: !!plan.ext7,
        ext6: !!plan.ext6,
        ext9: !!plan.ext9,
        ext11: !!plan.ext11,
        ext13: !!plan.ext13,
      }).map(mod12))).sort((a, b) => a - b)
    : [];
  const chordIntervals = planIntervals.length ? planIntervals : fallbackIntervals;
  const notes = spellChordNotes({ rootPc: safeRootPc, chordIntervals, preferSharps: safePreferSharps });
  const label = labelOverride || (
    plan?.quality
      ? buildStudyChordLabel({
          rootPc: safeRootPc,
          preferSharps: safePreferSharps,
          quality: plan.quality,
          suspension: plan.suspension || "none",
          structure: plan.structure || "triad",
          ext7: !!plan.ext7,
          ext6: !!plan.ext6,
          ext9: !!plan.ext9,
          ext11: !!plan.ext11,
          ext13: !!plan.ext13,
        })
      : `${pcToName(safeRootPc, safePreferSharps)} (${chordIntervals.map((i) => intervalToDegreeToken(i)).join(" · ")})`
  );
  return {
    rootPc: safeRootPc,
    preferSharps: safePreferSharps,
    label,
    chordIntervals,
    notes,
  };
}

export function buildStudyChordSpecFromDegree(degree, fallbackPreferSharps) {
  if (!degree?.supported) return null;
  return buildStudyChordSpecFromUi({
    rootPc: degree.rootPc,
    preferSharps: degree.spellPreferSharps ?? fallbackPreferSharps,
    quality: degree.quality,
    suspension: degree.suspension || "none",
    structure: degree.structure,
    ext7: !!degree.ext7,
    ext6: !!degree.ext6,
    ext9: !!degree.ext9,
    ext11: !!degree.ext11,
    ext13: !!degree.ext13,
    labelOverride: degree.name,
  });
}

export function buildStudyChordSpecFromScaleDegree({ tonicPc, scaleName, harmonyMode, scaleIntervals, degreeIndex, withSeventh, preferSharps }) {
  const built = buildHarmonyDegreeChord({ scaleName, harmonyMode, scaleIntervals, degreeIndex, withSeventh });
  if (!built) return null;
  const rootPc = mod12(tonicPc + built.rootOffset);
  const suffix = chordDisplaySuffixOnly({
    quality: built.quality,
    suspension: built.suspension || "none",
    structure: built.structure,
    ext7: !!built.ext7,
    ext6: !!built.ext6,
    ext9: !!built.ext9,
    ext11: !!built.ext11,
    ext13: !!built.ext13,
  });
  const degreeLabel = `${AppMusicBasics.ROMAN_DEGREES[degreeIndex] || romanizeDegreeNumber(degreeIndex + 1)}${suffix}`;
  const spec = buildStudyChordSpecFromUi({
    rootPc,
    preferSharps,
    quality: built.quality,
    suspension: built.suspension || "none",
    structure: built.structure,
    ext7: !!built.ext7,
    ext6: !!built.ext6,
    ext9: !!built.ext9,
    ext11: !!built.ext11,
    ext13: !!built.ext13,
  });
  return {
    ...spec,
    degreeLabel,
  };
}

export function buildStudyStaffNotesForChord({ rootPc, chordIntervals }) {
  const uniqueIntervals = Array.from(new Set((chordIntervals || []).map(mod12))).sort((a, b) => a - b);
  // C3 = 48. Así la raíz real del acorde coincide con su pc sin desplazarla a otra clase de nota.
  const baseMidi = 48 + mod12(rootPc);
  return uniqueIntervals.map((intv) => baseMidi + intv);
}

export function buildStudyStaffGroup(title, specs, caption = "", options = {}) {
  const safeSpecs = Array.isArray(specs) ? specs.filter((spec) => spec?.chordIntervals?.length) : [];
  return {
    title,
    caption,
    labels: safeSpecs.map((spec) => spec.label),
    keySignature: options.keySignature,
    events: safeSpecs.map((spec) => ({
      notes: buildStudyStaffNotesForChord(spec),
      spelledNotes: Array.isArray(spec.notes) ? [...spec.notes] : [],
      preferSharps: spec.preferSharps,
    })),
  };
}

export function buildStudyPitchClassSet(spec) {
  return new Set((spec?.chordIntervals || []).map((intv) => mod12((spec?.rootPc || 0) + intv)));
}

export function describeSharedStudyNotes(aSpec, bSpec, preferSharps) {
  const aSet = buildStudyPitchClassSet(aSpec);
  const bSet = buildStudyPitchClassSet(bSpec);
  const shared = Array.from(aSet)
    .filter((pc) => bSet.has(pc))
    .sort((a, b) => a - b)
    .map((pc) => pcToName(pc, preferSharps));
  return {
    count: shared.length,
    text: shared.join(" · ") || "ninguna",
  };
}

export function describeDistinctStudyNotes(aSpec, bSpec, preferSharps) {
  const aSet = buildStudyPitchClassSet(aSpec);
  const bSet = buildStudyPitchClassSet(bSpec);
  const onlyInA = Array.from(aSet)
    .filter((pc) => !bSet.has(pc))
    .sort((a, b) => a - b)
    .map((pc) => pcToName(pc, preferSharps));
  const onlyInB = Array.from(bSet)
    .filter((pc) => !aSet.has(pc))
    .sort((a, b) => a - b)
    .map((pc) => pcToName(pc, preferSharps));
  return {
    onlyInA,
    onlyInB,
    onlyInAText: onlyInA.join(" · ") || "ninguna",
    onlyInBText: onlyInB.join(" · ") || "ninguna",
  };
}

export function buildDominantTritoneExplanation(dominantSpec, substituteSpec) {
  if (!dominantSpec || !substituteSpec) return "";
  const dominantThird = spellChordNotes({ rootPc: dominantSpec.rootPc, chordIntervals: [4], preferSharps: dominantSpec.preferSharps })[0];
  const dominantSeventh = spellChordNotes({ rootPc: dominantSpec.rootPc, chordIntervals: [10], preferSharps: dominantSpec.preferSharps })[0];
  const substituteThird = spellChordNotes({ rootPc: substituteSpec.rootPc, chordIntervals: [4], preferSharps: substituteSpec.preferSharps })[0];
  const substituteSeventh = spellChordNotes({ rootPc: substituteSpec.rootPc, chordIntervals: [10], preferSharps: substituteSpec.preferSharps })[0];
  return `${dominantSpec.label} tiene ${dominantThird} como 3ª y ${dominantSeventh} como b7ª; ${substituteSpec.label} tiene ${substituteThird} como 3ª y ${substituteSeventh} como b7ª. El tritono se invierte: la 3ª de uno pasa a ser la b7ª del otro y viceversa.`;
}

export function isStudyDominantChord(plan) {
  const ints = new Set((plan?.intervals || []).map(mod12));
  return plan?.quality === "dom" && ints.has(4) && ints.has(10);
}

export function studyChordPlaneLabelFromSpec(spec) {
  const count = Array.isArray(spec?.chordIntervals) ? spec.chordIntervals.length : 0;
  if (count >= 4) return "cuatriadas";
  if (count === 3) return "triadas";
  if (count === 2) return "diadas";
  return "acordes";
}

export function buildStudyAnchorId(prefix, ...parts) {
  const slug = parts
    .map((part) => String(part || ""))
    .join("-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${slug || "item"}`;
}

export function buildStudySubstitutionGuide({ chordRootPc, chordName, plan, preferSharps, harmonizedScale, backdoorDominantInfo, scaleNotesText, scaleRootPc, scaleName, harmonyMode, scaleIntervals }) {
  const safeRootPc = mod12(chordRootPc ?? 0);
  const safePreferSharps = !!preferSharps;
  const targetSpec = buildStudyChordSpecFromPlan({ rootPc: safeRootPc, preferSharps: safePreferSharps, plan, labelOverride: chordName || "" });
  const diatonicPreferSharps = computeAutoPreferSharps({ rootPc: scaleRootPc, scaleName });
  const functionalPreferSharps = computeAutoPreferSharps({ rootPc: scaleRootPc, scaleName });
  const diatonicTargetSpec = buildStudyChordSpecFromPlan({ rootPc: safeRootPc, preferSharps: diatonicPreferSharps, plan, labelOverride: chordName || "" });
  const diatonicWithSeventh = targetSpec.chordIntervals.length >= 4;
  const harmonicPlaneLabel = studyChordPlaneLabelFromSpec(targetSpec);
  const targetPlaneText = `Plano de comparación aquí: ${harmonicPlaneLabel}, porque el acorde estudiado es ${targetSpec.label}.`;
  const dominantPlaneText = "Plano funcional aquí: dominantes y acordes de preparación hacia el acorde estudiado, no sustitución directa por misma especie.";
  const degreeSpec = (degreeIndex) => buildStudyChordSpecFromScaleDegree({
    tonicPc: scaleRootPc,
    scaleName,
    harmonyMode,
    scaleIntervals,
    degreeIndex,
    withSeventh: diatonicWithSeventh,
    preferSharps: diatonicPreferSharps,
  });
  const scaleSummary = harmonizedScale?.tonicName
    ? `${harmonizedScale.tonicName} ${harmonizedScale.scaleLabel}${scaleNotesText ? ` = ${scaleNotesText}` : ""}`
    : "Escala activa no disponible.";
  const currentIsDominant = isStudyDominantChord(plan);
  const sameRootDominantText = currentIsDominant
    ? `${targetSpec.label} ya está en plano dominante real.`
    : `${targetSpec.label} no está en plano dominante real tal como está escrito; para analizar sustituciones de dominante con esta raíz primero se convierte en ${buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "dom", structure: "tetrad", ext7: true }).label}.`;
  const targetDominantSpec = buildStudyChordSpecFromUi({
    rootPc: safeRootPc + 7,
    preferSharps: safePreferSharps,
    quality: "dom",
    structure: "tetrad",
    ext7: true,
  });
  const tritoneToTargetSpec = buildStudyChordSpecFromUi({
    rootPc: safeRootPc + 1,
    preferSharps: false,
    quality: "dom",
    structure: "tetrad",
    ext7: true,
  });
  const iiToTargetSpec = buildStudyChordSpecFromUi({
    rootPc: safeRootPc + 2,
    preferSharps: safePreferSharps,
    quality: "min",
    structure: "tetrad",
    ext7: true,
  });
  const diminishedToTargetSpec = buildStudyChordSpecFromUi({
    rootPc: targetDominantSpec.rootPc + 1,
    preferSharps: true,
    quality: "dim",
    structure: "tetrad",
    ext7: true,
  });
  const sameRootDominantSpec = buildStudyChordSpecFromUi({
    rootPc: safeRootPc,
    preferSharps: safePreferSharps,
    quality: "dom",
    structure: "tetrad",
    ext7: true,
  });
  const sameRootTritoneSpec = buildStudyChordSpecFromUi({
    rootPc: safeRootPc + 6,
    preferSharps: false,
    quality: "dom",
    structure: "tetrad",
    ext7: true,
  });
  const sameRootDiminishedSpec = buildStudyChordSpecFromUi({
    rootPc: safeRootPc + 1,
    preferSharps: true,
    quality: "dim",
    structure: "tetrad",
    ext7: true,
  });
  const leadingToneDimRootPc = mod12(safeRootPc - 1);
  const leadingToneDimPreferSharps = computeAutoPreferSharps({ rootPc: scaleRootPc, scaleName });
  const leadingToneDimToTargetSpec = {
    ...buildStudyChordSpecFromUi({
      rootPc: leadingToneDimRootPc,
      preferSharps: leadingToneDimPreferSharps,
      quality: "dim",
      structure: "tetrad",
      ext7: true,
    }),
    notes: spellFullyDiminishedSeventhNotes({
      rootPc: leadingToneDimRootPc,
      preferSharps: leadingToneDimPreferSharps,
    }),
  };
  const borrowedParallelSpec = plan?.quality === "maj"
    ? buildStudyChordSpecFromUi({
        rootPc: safeRootPc,
        preferSharps: safePreferSharps,
        quality: "min",
        structure: targetSpec.chordIntervals.length >= 4 ? "tetrad" : "triad",
        ext7: targetSpec.chordIntervals.length >= 4,
      })
    : plan?.quality === "min"
      ? buildStudyChordSpecFromUi({
          rootPc: safeRootPc,
          preferSharps: safePreferSharps,
          quality: "maj",
          structure: targetSpec.chordIntervals.length >= 4 ? "tetrad" : "triad",
          ext7: targetSpec.chordIntervals.length >= 4,
        })
      : null;
  const relativeSpec = plan?.quality === "maj"
    ? buildStudyChordSpecFromUi({
        rootPc: safeRootPc + 9,
        preferSharps: safePreferSharps,
        quality: "min",
        structure: targetSpec.chordIntervals.length >= 4 ? "tetrad" : "triad",
        ext7: targetSpec.chordIntervals.length >= 4,
      })
    : plan?.quality === "min"
      ? buildStudyChordSpecFromUi({
          rootPc: safeRootPc + 3,
          preferSharps: safePreferSharps,
          quality: "maj",
          structure: targetSpec.chordIntervals.length >= 4 ? "tetrad" : "triad",
          ext7: targetSpec.chordIntervals.length >= 4,
        })
      : null;
  const backdoorSpec = buildStudyChordSpecFromUi({
    rootPc: backdoorDominantInfo?.rootPc ?? (safeRootPc - 2),
    preferSharps: false,
    quality: "dom",
    structure: "tetrad",
    ext7: true,
    labelOverride: backdoorDominantInfo?.name || "",
  });
  const currentTargetSharedWithRelative = relativeSpec ? describeSharedStudyNotes(diatonicTargetSpec, relativeSpec, diatonicPreferSharps) : null;
  const currentTargetDistinctWithRelative = relativeSpec ? describeDistinctStudyNotes(diatonicTargetSpec, relativeSpec, diatonicPreferSharps) : null;
  const currentTargetSharedWithBorrowed = borrowedParallelSpec ? describeSharedStudyNotes(targetSpec, borrowedParallelSpec, safePreferSharps) : null;
  const targetDominantVsDim = describeSharedStudyNotes(targetDominantSpec, diminishedToTargetSpec, functionalPreferSharps);
  const currentDominantVsDim = describeSharedStudyNotes(sameRootDominantSpec, sameRootDiminishedSpec, functionalPreferSharps);
  const extensionBaseSpec = plan?.quality === "min"
    ? buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "min", structure: "tetrad", ext7: true })
    : plan?.quality === "dom"
      ? buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "dom", structure: "tetrad", ext7: true })
      : buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "maj", structure: "tetrad", ext7: true });
  const extensionAltA = plan?.quality === "min"
    ? buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "min", structure: "chord", ext7: true, ext9: true })
    : plan?.quality === "dom"
      ? buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "dom", structure: "chord", ext7: true, ext9: true })
      : buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "maj", structure: "chord", ext7: true, ext9: true });
  const extensionAltB = plan?.quality === "min"
    ? buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "min", structure: "tetrad", ext6: true })
    : plan?.quality === "dom"
      ? buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "dom", suspension: "sus4", structure: "tetrad", ext7: true })
      : buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "maj", structure: "tetrad", ext6: true });
  const sus2Spec = buildStudyChordSpecFromUi({
    rootPc: safeRootPc,
    preferSharps: safePreferSharps,
    quality: "maj",
    suspension: "sus2",
    structure: "triad",
  });
  const sus4Spec = buildStudyChordSpecFromUi({
    rootPc: safeRootPc,
    preferSharps: safePreferSharps,
    quality: "maj",
    suspension: "sus4",
    structure: "triad",
  });
  const upperStructureBase = buildStudyChordSpecFromUi({
    rootPc: targetDominantSpec.rootPc,
    preferSharps: targetDominantSpec.preferSharps,
    quality: "dom",
    structure: "tetrad",
    ext7: true,
  });
  const upperStructureTriadRoot = mod12(targetDominantSpec.rootPc + 2);
  const upperStructureTriadName = `${pcToName(upperStructureTriadRoot, false)} mayor`;
  const upperStructureCombined = buildStudyChordSpecCustom({
    rootPc: targetDominantSpec.rootPc,
    preferSharps: false,
    chordIntervals: [0, 4, 7, 10, 2, 6, 9],
    label: `${upperStructureTriadName}/${targetDominantSpec.label}`,
  });
  const pedalName = pcToName(safeRootPc, safePreferSharps);
  const pedalOptions = [1, 3, 4]
    .map((degreeIndex) => buildStudyChordSpecFromDegree(harmonizedScale?.degrees?.[degreeIndex], safePreferSharps))
    .filter(Boolean)
    .map((spec) => `${spec.label}/${pedalName}`);
  const coltraneCycle = [
    buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "maj", structure: "tetrad", ext7: true }),
    buildStudyChordSpecFromUi({ rootPc: safeRootPc + 3, preferSharps: false, quality: "dom", structure: "tetrad", ext7: true }),
    buildStudyChordSpecFromUi({ rootPc: safeRootPc + 8, preferSharps: false, quality: "maj", structure: "tetrad", ext7: true }),
    buildStudyChordSpecFromUi({ rootPc: safeRootPc + 11, preferSharps: false, quality: "dom", structure: "tetrad", ext7: true }),
    buildStudyChordSpecFromUi({ rootPc: safeRootPc + 4, preferSharps: safePreferSharps, quality: "maj", structure: "tetrad", ext7: true }),
  ];

  const diatonicItems = [
    {
      title: "Función de tónica",
      definition: "Sustituye un acorde por otro de la misma familia de reposo dentro de la tonalidad activa.",
      appliesWhen: "Aplica cuando quieres mantener sensación de llegada o estabilidad sin repetir exactamente el mismo acorde.",
      derivation: (() => {
        const specs = [0, 2, 5]
          .map((degreeIndex) => degreeSpec(degreeIndex))
          .filter(Boolean);
        const familyText = specs.map((spec) => `${spec.degreeLabel}: ${spec.label}`).join(" · ");
        const comparisons = specs
          .filter((spec) => spec.label !== diatonicTargetSpec.label)
          .map((spec) => {
            const shared = describeSharedStudyNotes(diatonicTargetSpec, spec, diatonicPreferSharps);
            return `${spec.label} comparte ${shared.count} ${shared.count === 1 ? "nota" : "notas"} con ${diatonicTargetSpec.label}: ${shared.text}.`;
          });
        return [
          `Escala activa: ${scaleSummary}.`,
          targetPlaneText,
          `Familia de tónica: ${familyText || "no disponible"}.`,
          ...comparisons,
        ];
      })(),
      examples: [
        "Si el acorde estudiado es la tónica, los candidatos naturales suelen ser III y VI.",
        "III suele sonar más abierto, etéreo o incompleto porque no contiene la tónica como bajo o centro.",
        "VI suele sonar más melancólico porque es el relativo menor natural de la tonalidad.",
      ],
      staffGroups: [
        buildStudyStaffGroup("Pentagrama de la familia tónica", [
          degreeSpec(0),
          degreeSpec(2),
          degreeSpec(5),
        ], "Orden: I · III · VI"),
      ],
    },
    {
      title: "Función de subdominante",
      definition: "Agrupa acordes que generan alejamiento de la tónica y preparan el camino hacia la dominante.",
      appliesWhen: "Úsala cuando quieras crear progresión armónica. En tonalidad mayor, IIm7 y IVmaj7 suelen funcionar muy bien como sustitutos entre sí.",
      derivation: (() => {
        const specs = [1, 3]
          .map((degreeIndex) => degreeSpec(degreeIndex))
          .filter(Boolean);
        const familyText = specs.map((spec) => `${spec.degreeLabel}: ${spec.label}`).join(" · ");
        const internalComparisons = specs.length >= 2
          ? (() => {
              const shared = describeSharedStudyNotes(specs[0], specs[1], diatonicPreferSharps);
              return `${specs[0].label} y ${specs[1].label} comparten ${shared.count} notas: ${shared.text}.`;
            })()
          : "No hay suficientes acordes para comparar la familia subdominante.";
        return [
          `Escala activa: ${scaleSummary}.`,
          `Plano de comparación aquí: sustitución interna dentro de la familia subdominante, no sustitución directa de ${diatonicTargetSpec.label}.`,
          `Familia de subdominante: ${familyText || "no disponible"}.`,
          internalComparisons,
          `Relación con ${diatonicTargetSpec.label}: estos acordes no se presentan aquí como sustitutos de la tónica, sino como acordes de preparación antes de la dominante.`,
        ];
      })(),
      examples: [
        `En ${harmonizedScale?.tonicName || pcToName(scaleRootPc, diatonicPreferSharps)} mayor puedes usar ${degreeSpec(3)?.label || "IV"} o ${degreeSpec(1)?.label || "II"} antes de ${degreeSpec(4)?.label || "V"} para preparar la resolución.`,
        `${degreeSpec(3)?.label || "IV"} suele sonar más amplio y pastoral; ${degreeSpec(1)?.label || "II"} más directo y más cercano al lenguaje II-V-I.`,
      ],
      staffGroups: [
        buildStudyStaffGroup("Pentagrama de la familia subdominante", [
          degreeSpec(1),
          degreeSpec(3),
        ], "Orden: II · IV"),
      ],
    },
    {
      title: "Función de dominante",
      definition: "Reúne acordes que contienen o insinúan tensión de resolución, especialmente alrededor del tritono tonal.",
      appliesWhen: "Sirve cuando quieres empujar hacia una llegada sin usar siempre el mismo V.",
      derivation: (() => {
        const specs = [4, 6]
          .map((degreeIndex) => degreeSpec(degreeIndex))
          .filter(Boolean);
        const familyText = specs.map((spec) => `${spec.degreeLabel}: ${spec.label}`).join(" · ");
        const internalComparisons = specs.length >= 2
          ? (() => {
              const shared = describeSharedStudyNotes(specs[0], specs[1], diatonicPreferSharps);
              return `${specs[1].label} comparte ${shared.count} ${shared.count === 1 ? "nota" : "notas"} con ${specs[0].label}: ${shared.text}. Por eso puede funcionar como un V7 sin tónica.`;
            })()
          : "No hay suficientes acordes para comparar la familia dominante.";
        return [
          `Escala activa: ${scaleSummary}.`,
          `Plano de comparación aquí: ${harmonicPlaneLabel}.`,
          `Familia de dominante: ${familyText || "no disponible"}.`,
          ...specs.map((spec) => {
            const shared = describeSharedStudyNotes(diatonicTargetSpec, spec, diatonicPreferSharps);
            return `${spec.label} comparte ${shared.count} ${shared.count === 1 ? "nota" : "notas"} con ${diatonicTargetSpec.label}: ${shared.text}.`;
          }),
          internalComparisons,
        ];
      })(),
      examples: [
        "En entorno tonal, el VIIº o m7(b5) puede funcionar como un V7 sin tónica, con una tensión más elegante o menos pesada que el dominante completo.",
      ],
      staffGroups: [
        buildStudyStaffGroup("Pentagrama de la familia dominante", [
          degreeSpec(4),
          degreeSpec(6),
        ], "Orden: V · VIIº"),
      ],
    },
    ...(relativeSpec ? [{
      title: plan?.quality === "maj" ? "Relativo menor" : "Relativo mayor",
      definition: "Intercambia un acorde con su relativo porque comparten gran parte del material sonoro. Aunque es una sustitución diatónica, suele estudiarse aparte por su importancia histórica y por lo mucho que se usa para cambiar el ánimo sin mover la tonalidad.",
      appliesWhen: "Es especialmente útil para variaciones sutiles. Con cuatriadas, la continuidad sonora es muy alta porque el bloque común suele ocupar tres de las cuatro notas.",
      derivation: [
        `Acorde base: ${diatonicTargetSpec.label}.`,
        targetPlaneText,
        `Relativo: ${relativeSpec.label}.`,
        `Notas compartidas: ${relativeSpec.label} y ${diatonicTargetSpec.label} comparten ${currentTargetSharedWithRelative?.count || 0} notas: ${currentTargetSharedWithRelative?.text || "ninguna"}.`,
        `Notas que se diferencian: ${relativeSpec.label} deja fuera ${currentTargetDistinctWithRelative?.onlyInAText || "ninguna"} de ${diatonicTargetSpec.label}, mientras que ${diatonicTargetSpec.label} deja fuera ${currentTargetDistinctWithRelative?.onlyInBText || "ninguna"} de ${relativeSpec.label}.`,
      ],
      examples: [
        "En una reharmonización suave, cambiar al relativo suele dar continuidad sin sonar a modulación.",
        plan?.quality === "maj"
          ? `${relativeSpec.label} añade un peso más melancólico que ${diatonicTargetSpec.label}.`
          : `${relativeSpec.label} aporta una lectura más luminosa y abierta que ${diatonicTargetSpec.label}.`,
      ],
      staffGroups: [
        buildStudyStaffGroup("Pentagrama del relativo", [targetSpec, relativeSpec], `Orden: ${targetSpec.label} · ${relativeSpec.label}`),
      ],
    }] : []),
  ];

  const chromaticItems = [
    {
      title: "Sustitución tritonal",
      definition: "Sustituye un dominante 7 por otro dominante 7 situado a un tritono. Funciona porque ambos comparten el mismo tritono tonal: la 3ª de uno pasa a ser la b7ª del otro y viceversa.",
      appliesWhen: "Solo aplica a acordes con función dominante real. Un maj7 no es dominante, porque no tiene 7ª menor.",
      derivation: [
        dominantPlaneText,
        `Si el objetivo es llegar a ${targetSpec.label}, su dominante natural es ${targetDominantSpec.label}.`,
        `El acorde a tritono de ${targetDominantSpec.label} es ${tritoneToTargetSpec.label}.`,
        buildDominantTritoneExplanation(targetDominantSpec, tritoneToTargetSpec),
        currentIsDominant
          ? `${targetSpec.label} ya es dominante, así que su sustituto tritonal directo es ${sameRootTritoneSpec.label}.`
          : `${targetSpec.label} no actúa como dominante tal como está escrito. Si quisieras usar esa raíz como dominante, habría que convertirlo en ${sameRootDominantSpec.label}; su sustituto tritonal sería ${sameRootTritoneSpec.label}.`,
      ],
      examples: [
        `${targetDominantSpec.label} \u2192 ${targetSpec.label}: resolución tradicional por salto de quinta.`,
        `${tritoneToTargetSpec.label} \u2192 ${targetSpec.label}: resolución cromática por semitono descendente en el bajo, con un color más suave y jazzístico.`,
      ],
      staffGroups: [
        buildStudyStaffGroup("Dominante real y sustituto tritonal hacia el acorde estudiado", [targetDominantSpec, tritoneToTargetSpec, targetSpec], `Orden: ${targetDominantSpec.label} · ${tritoneToTargetSpec.label} · ${targetSpec.label}`, { keySignature: { type: null, count: 0 } }),
        buildStudyStaffGroup("Si la misma raíz actuara como dominante", [sameRootDominantSpec, sameRootTritoneSpec], `Orden: ${sameRootDominantSpec.label} · ${sameRootTritoneSpec.label}`, { keySignature: { type: null, count: 0 } }),
      ],
    },
    {
      title: "Dominante por disminuido",
      definition: "Sustituye o comprime un dominante mediante un acorde disminuido séptima cuya raíz está medio tono por encima de la raíz del dominante original.",
      appliesWhen: "Se usa cuando quieres mantener la tensión del dominante añadiendo un color más inestable, simétrico y con una conducción de voces más cerrada.",
      derivation: [
        dominantPlaneText,
        `Si ${targetSpec.label} es el objetivo, su dominante es ${targetDominantSpec.label} (${targetDominantSpec.notes.join(" · ")}).`,
        `Un semitono por encima de la raíz del dominante aparece ${diminishedToTargetSpec.label} (${diminishedToTargetSpec.notes.join(" · ")}).`,
        `${diminishedToTargetSpec.label} comparte ${targetDominantVsDim.count} notas con ${targetDominantSpec.label}: ${targetDominantVsDim.text}. Son precisamente las notas que concentran la tensión y su resolución.`,
        currentIsDominant
          ? `Como ${targetSpec.label} ya es dominante, su disminuido asociado sería ${sameRootDiminishedSpec.label}.`
          : `Si quisieras usar la raíz de ${targetSpec.label} como dominante, pasarías primero a ${sameRootDominantSpec.label} y después a ${sameRootDiminishedSpec.label}.`,
      ],
      examples: [
        `${targetDominantSpec.label} \u2192 ${targetSpec.label} puede enriquecerse como ${diminishedToTargetSpec.label} \u2192 ${targetSpec.label}.`,
        `Lectura: crea un movimiento cromático en el bajo y una llegada muy compacta hacia ${targetSpec.label}.`,
      ],
      staffGroups: [
        buildStudyStaffGroup("Dominante y disminuido asociado hacia el acorde estudiado", [targetDominantSpec, diminishedToTargetSpec, targetSpec], `Orden: ${targetDominantSpec.label} · ${diminishedToTargetSpec.label} · ${targetSpec.label}`, { keySignature: { type: null, count: 0 } }),
        buildStudyStaffGroup("Conversión de la raíz actual a dominante + disminuido", [sameRootDominantSpec, sameRootDiminishedSpec], `Comparten ${currentDominantVsDim.count} notas: ${currentDominantVsDim.text}`, { keySignature: { type: null, count: 0 } }),
      ],
    },
    {
      title: "Interpolación II-V",
      definition: "No sustituye el destino: inserta su ii antes del V para preparar mejor la llegada.",
      appliesWhen: "Se usa cuando quieres una preparación más clara de jazz o pop sofisticado antes de resolver.",
      derivation: [
        dominantPlaneText,
        `Si ${targetSpec.label} es el acorde objetivo, su dominante es ${targetDominantSpec.label}.`,
        `El ii correspondiente es ${iiToTargetSpec.label}.`,
        `La cadena queda ${iiToTargetSpec.label} - ${targetDominantSpec.label} \u2192 ${targetSpec.label}.`,
        `También se llama dualización, porque conviertes un evento armónico de un solo acorde (${targetDominantSpec.label}) en un evento de dos (${iiToTargetSpec.label} - ${targetDominantSpec.label}).`,
      ],
      examples: [
        "Si el acorde actual ya fuera dominante, la interpolación consistiría en anteponerle su ii.",
      ],
      staffGroups: [
        buildStudyStaffGroup("Cadena II-V-I hacia el acorde estudiado", [iiToTargetSpec, targetDominantSpec, targetSpec], `Orden: ${iiToTargetSpec.label} · ${targetDominantSpec.label} · ${targetSpec.label}`, { keySignature: { type: null, count: 0 } }),
      ],
    },
  ];

  const borrowedItems = [
    ...(borrowedParallelSpec ? [{
      title: "Intercambio modal",
      definition: "Toma el mismo grado desde el modo paralelo para cambiar el color sin mover la raíz.",
      appliesWhen: "Muy útil cuando quieres oscurecer o aclarar un acorde manteniendo su posición estructural.",
      derivation: [
        `Partimos de ${targetSpec.label}.`,
        targetPlaneText,
        `El préstamo paralelo más directo es ${borrowedParallelSpec.label}.`,
        `${borrowedParallelSpec.label} comparte ${currentTargetSharedWithBorrowed?.count || 0} notas con ${targetSpec.label}: ${currentTargetSharedWithBorrowed?.text || "ninguna"}.`,
        "El contraste aparece sobre todo en la 3ª y la 7ª: al cambiarlas, cambias la especie del acorde sin mover la raíz.",
        "En la práctica es muy típico usarlo sobre I, IV o VI en mayor, o sobre i y iv en menor.",
      ],
      examples: [
        `Sustitución directa: ${targetSpec.label} \u2194 ${borrowedParallelSpec.label}.`,
        `Lectura: el cambio funciona porque mantiene el eje del acorde, pero altera las notas que definen su carácter mayor o menor.`,
      ],
      staffGroups: [
        buildStudyStaffGroup("Acorde original y préstamo modal paralelo", [targetSpec, borrowedParallelSpec], `Orden: ${targetSpec.label} · ${borrowedParallelSpec.label}`),
      ],
    }] : []),
    {
      title: "Dominante secundario",
      definition: "Convierte el acorde objetivo en una llegada temporal preparada por su propio V7. Si el objetivo es la tónica principal de la tonalidad, ese V7 se entiende como dominante primario; si el objetivo es otro grado, entonces sí hablamos propiamente de dominante secundario.",
      appliesWhen: "Aplica cuando quieres tonicizar momentáneamente el acorde estudiado aunque no cambies de tonalidad global.",
      derivation: [
        dominantPlaneText,
        `Aquí el acorde objetivo es ${targetSpec.label}.`,
        `Su dominante secundario es ${targetDominantSpec.label}.`,
        `La lectura funcional es V7/${targetSpec.label} \u2192 ${targetSpec.label}.`,
        `Si ${targetSpec.label} es la tónica principal del tono, ${targetDominantSpec.label} se describe con más rigor como dominante primario.`,
        sameRootDominantText,
      ],
      examples: [
        `${targetDominantSpec.label} \u2192 ${targetSpec.label}.`,
        currentIsDominant ? `${targetSpec.label} ya es un dominante. En ese caso la pregunta útil es: "¿de qué acorde es V7?"` : "",
      ].filter(Boolean),
      staffGroups: [
        buildStudyStaffGroup("Dominante secundario hacia el acorde estudiado", [targetDominantSpec, targetSpec], `Orden: ${targetDominantSpec.label} · ${targetSpec.label}`),
      ],
    },
    {
      title: "Séptima Sensible vii°/x",
      definition: "Usa el disminuido sensible del acorde objetivo en lugar de su dominante completo.",
      appliesWhen: "Sirve cuando quieres una preparación más compacta o más clásica que el V7 completo.",
      derivation: [
        dominantPlaneText,
        `Tomando ${targetSpec.label} como objetivo, su sensible armónica genera ${leadingToneDimToTargetSpec.label}.`,
        `${leadingToneDimToTargetSpec.label} resuelve por semitono hacia notas estructurales de ${targetSpec.label}.`,
      ],
      examples: [
        `${leadingToneDimToTargetSpec.label} \u2192 ${targetSpec.label}.`,
      ],
      staffGroups: [
        buildStudyStaffGroup("Sensible disminuida hacia el acorde estudiado", [leadingToneDimToTargetSpec, targetSpec], `Orden: ${leadingToneDimToTargetSpec.label} · ${targetSpec.label}`),
      ],
    },
    {
      title: "Backdoor dominant",
      definition: "Utiliza el acorde de séptima dominante construido sobre el séptimo grado bemol de la tonalidad como un dominante modal alternativo.",
      appliesWhen: "Funciona especialmente bien para resolver a un acorde maj7. Aporta un color soul, gospel o de jazz clásico mucho más fresco que el dominante tradicional.",
      derivation: [
        dominantPlaneText,
        `Acorde objetivo: ${targetSpec.label}.`,
        `Raíz del backdoor: ${pcToName(mod12(targetSpec.rootPc - 2), false)} (un tono entero por debajo de ${pcToName(targetSpec.rootPc, targetSpec.preferSharps)}).`,
        `Acorde resultante: ${backdoorSpec.label} (${backdoorSpec.notes.join(" · ")}).`,
        `No se basa en el tritono del V7 tradicional, sino en una resolución modal muy usada.`,
        `Lógica sonora: notas como ${backdoorSpec.notes[3] || "b7"} y ${backdoorSpec.notes[2] || "5"} del ${backdoorSpec.label} resuelven con mucha suavidad hacia notas estables de ${targetSpec.label}.`,
      ],
      examples: [
        `${backdoorSpec.label} \u2192 ${targetSpec.label}.`,
        `${buildStudyChordSpecFromUi({ rootPc: backdoorSpec.rootPc + 7, preferSharps: false, quality: "min", structure: "tetrad", ext7: true }).label} - ${backdoorSpec.label} \u2192 ${targetSpec.label}.`,
        "Lectura: se siente como una llegada inesperada pero muy satisfactoria.",
      ],
      staffGroups: [
        buildStudyStaffGroup("Comparación entre V7 normal y backdoor dominant", [targetDominantSpec, backdoorSpec, targetSpec], `Orden: ${targetDominantSpec.label} · ${backdoorSpec.label} · ${targetSpec.label}`),
        buildStudyStaffGroup("Cadena backdoor reforzada", [
          buildStudyChordSpecFromUi({ rootPc: backdoorSpec.rootPc + 7, preferSharps: false, quality: "min", structure: "tetrad", ext7: true }),
          backdoorSpec,
          targetSpec,
        ], `Orden: ${buildStudyChordSpecFromUi({ rootPc: backdoorSpec.rootPc + 7, preferSharps: false, quality: "min", structure: "tetrad", ext7: true }).label} · ${backdoorSpec.label} · ${targetSpec.label}`),
      ],
    },
  ];

  const colorItems = [
    {
      title: "Sustituciones por calidad y extensiones",
      definition: "Mantienen la raíz y la función básica, pero modifican la densidad y el brillo del acorde añadiendo o alterando notas de color como 6, 9, #11 o 13.",
      appliesWhen: "Se usa cuando quieres embellecer la armonía sin alterar el análisis funcional. Es una herramienta central de arreglo y orquestación.",
      derivation: plan?.quality === "maj" ? [
        "Plano estructural: misma raíz y misma función.",
        `Base: ${extensionBaseSpec.label} (${extensionBaseSpec.notes.join(" · ")}).`,
        `Variantes:`,
        `${extensionAltB.label} (${extensionAltB.notes.join(" · ")}): sustituye la 7ª por la 6ª y suele sonar más estable, más clásico o más cercano al swing.`,
        `${extensionAltA.label} (${extensionAltA.notes.join(" · ")}): añade la 9ª y abre más el acorde.`,
        `${buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "maj", structure: "chord", ext7: true, ext9: true, ext13: true }).label} (${buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "maj", structure: "chord", ext7: true, ext9: true, ext13: true }).notes.join(" · ")}): máxima densidad de color mayor en esta familia.`,
      ] : [
        `Plano aquí: mismo acorde, misma raíz y misma función básica; cambian solo las tensiones visibles alrededor de ${targetSpec.label}.`,
        `Base de referencia sobre esta raíz: ${extensionBaseSpec.label}.`,
        `Variantes de color cercanas: ${extensionAltA.label} y ${extensionAltB.label}.`,
        "No sustituyen la función por otra; reharmonizan el mismo punto con más o menos tensión.",
      ],
      examples: plan?.quality === "maj" ? [
        `${extensionBaseSpec.label} \u2192 ${extensionAltA.label} \u2192 ${extensionAltB.label}.`,
        "Lectura: no hay movimiento armónico real, pero sí un movimiento de interés. El acorde respira y evoluciona mientras la melodía se desarrolla.",
      ] : [
        `${extensionBaseSpec.label} \u2192 ${extensionAltA.label} \u2192 ${extensionAltB.label}.`,
      ],
      staffGroups: [
        buildStudyStaffGroup(
          "Misma raíz, distinto color armónico",
          plan?.quality === "maj"
            ? [
                extensionBaseSpec,
                extensionAltA,
                extensionAltB,
                buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "maj", structure: "chord", ext7: true, ext9: true, ext13: true }),
              ]
            : [extensionBaseSpec, extensionAltA, extensionAltB],
          plan?.quality === "maj"
            ? `Orden: ${extensionBaseSpec.label} · ${extensionAltA.label} · ${extensionAltB.label} · ${buildStudyChordSpecFromUi({ rootPc: safeRootPc, preferSharps: safePreferSharps, quality: "maj", structure: "chord", ext7: true, ext9: true, ext13: true }).label}`
            : `Orden: ${extensionBaseSpec.label} · ${extensionAltA.label} · ${extensionAltB.label}`
        ),
      ],
    },
    {
      title: "Acordes de suspensión",
      definition: "Sustituyen la 3ª por 2ª o 4ª para crear una tensión que pide resolver.",
      appliesWhen: "Funcionan bien como color flotante antes de volver a la 3ª o antes de resolver al siguiente acorde.",
      derivation: [
        "Plano aquí: misma raíz y misma función aproximada; la sustitución afecta a la 3ª del acorde.",
        `Sobre la raíz de ${targetSpec.label}, los modelos básicos son ${sus2Spec.label} y ${sus4Spec.label}.`,
        "La idea no es cambiar de función, sino retrasar la definición mayor o menor del acorde.",
      ],
      examples: [
        `${sus4Spec.label} suele resolver a ${targetSpec.label} o a su versión dominante.`,
      ],
      staffGroups: [
        buildStudyStaffGroup("Suspensiones básicas sobre la misma raíz", [sus2Spec, sus4Spec, targetSpec], `Orden: ${sus2Spec.label} · ${sus4Spec.label} · ${targetSpec.label}`),
      ],
    },
    {
      title: "Poliacordes / Upper Structures",
      definition: "Superponen una tríada superior sobre un dominante para generar tensiones complejas sin pensar nota por nota.",
      appliesWhen: "Se usan sobre dominantes cuando quieres tensiones 9, #11, 13 y derivados con una digitación mental simple.",
      derivation: [
        dominantPlaneText,
        `Si el objetivo es ${targetSpec.label}, su dominante es ${upperStructureBase.label}.`,
        `Una tríada de ${upperStructureTriadName} sobre ${upperStructureBase.label} produce 9, #11 y 13 respecto al bajo.`,
      ],
      examples: [
        `${upperStructureTriadName}/${upperStructureBase.label} como forma rápida de pensar un dominante alterado por color.`,
      ],
      staffGroups: [
        buildStudyStaffGroup("Dominante base y upper structure combinado", [upperStructureBase, upperStructureCombined], `Orden: ${upperStructureBase.label} · ${upperStructureCombined.label}`),
      ],
    },
  ];

  return [
    {
      title: "1. Sustituciones diatónicas",
      caption: "Se apoyan en la tonalidad activa y en la cantidad de notas comunes entre acordes de la misma escala.",
      items: diatonicItems,
    },
    {
      title: "2. Sustituciones cromáticas y jazz",
      caption: "Añaden acordes fuera de la escala para aumentar la tensión o clarificar la resolución.",
      items: chromaticItems,
    },
    {
      title: "3. Sustituciones por préstamo",
      caption: "Reinterpretan el acorde estudiado como objetivo temporal o toman color desde modos paralelos.",
      items: borrowedItems.filter((item) => item),
    },
    {
      title: "4. Estructura y color",
      caption: "No siempre cambias la función: a veces solo cambias la forma en que el acorde se presenta.",
      items: colorItems,
    },
    {
      title: "5. Avanzadas y extras",
      caption: "Recursos más abiertos para estudiar reharmonizaciones largas o con un color muy marcado.",
      items: [
        {
          title: "Nota pedal",
          definition: "Mantiene una nota fija en el bajo mientras cambian los acordes superiores.",
          appliesWhen: "Es útil cuando quieres sensación de eje, drone o tensión estática sin perder movimiento arriba.",
          derivation: [
            "Plano aquí: la sustitución no se basa en notas comunes ni en función equivalente, sino en mantener fijo el bajo.",
            `Aquí la nota pedal propuesta es ${pedalName}.`,
            pedalOptions.length
              ? `Opciones diatónicas con esa pedal: ${pedalOptions.join(" · ")}.`
              : "No hay suficientes acordes diatónicos claros para mostrar ejemplos de pedal en esta escala.",
          ],
          examples: [
            "La nota pedal no sustituye por identidad de notas comunes, sino por permanencia del bajo.",
          ],
          staffGroups: [],
        },
        {
          title: "Cambios Coltrane",
          definition: "Dividen la octava por terceras mayores y encadenan dominantes para mover el centro tonal muy rápido.",
          appliesWhen: "Es un recurso avanzado: deja de ser una sustitución puntual y pasa a ser una reharmonización completa.",
          derivation: [
            "Plano aquí: reharmonización de progresión completa, no equivalencia funcional de un único acorde.",
            `Tomando ${targetSpec.label} como punto de partida, una cadena posible es ${coltraneCycle.map((spec) => spec.label).join(" \u2192 ")}.`,
            "Úsalo cuando quieras densidad armónica alta y movimiento continuo entre centros lejanos.",
          ],
          examples: [
            "No suele sustituir un solo acorde aislado, sino rediseñar toda la progresión.",
          ],
          staffGroups: [
            buildStudyStaffGroup("Esquema simplificado de una cadena tipo Coltrane", coltraneCycle, `Orden: ${coltraneCycle.map((spec) => spec.label).join(" · ")}`),
          ],
        },
      ],
    },
  ].filter((section) => section.items.length);
}

// ============================================================================
// DETECCIÓN DE ACORDES DESDE NOTAS SELECCIONADAS
// La lógica musical de detección, nombre, ranking y leyenda vive en
// `src/music/chordDetectionEngine.js`.
// Aquí solo quedan helpers de continuidad y presentación para la UI.
// ============================================================================
