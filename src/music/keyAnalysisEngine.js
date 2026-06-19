import { mod12, pcToName, computeAutoPreferSharps, preferSharpsFromMajorTonicPc } from "./appMusicBasics.js";

const NOTE_PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SCALES = {
  Mayor: {
    intervals: [0, 2, 4, 5, 7, 9, 11],
    qualities: ["maj", "min", "min", "maj", "maj", "min", "dim"],
    label: "mayor",
  },
  "Menor natural": {
    intervals: [0, 2, 3, 5, 7, 8, 10],
    qualities: ["min", "dim", "maj", "min", "min", "maj", "maj"],
    label: "menor",
  },
};

const SCORE_DIATONIC = 3;
const SCORE_FUNCTIONAL_DOM = 2;
const SCORE_SECONDARY_DOM = 1;

const DEGREE_LABELS_TRIAD = {
  Mayor: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  "Menor natural": ["i", "ii°", "III", "iv", "v", "VI", "VII"],
};

const DEGREE_LABELS_TETRAD = {
  Mayor: ["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø7"],
  "Menor natural": ["im7", "iiø7", "IIImaj7", "iv7", "v7", "VImaj7", "VII7"],
};

const TETRAD_QUALITIES = {
  Mayor: ["maj7", "min7", "min7", "maj7", "dom7", "min7", "hdim7"],
  "Menor natural": ["min7", "hdim7", "maj7", "min7", "min7", "maj7", "dom7"],
};

const CHROMATIC_DEGREE_NAMES_UPPER = [
  "I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII",
];

function suffixToQuality(suffix) {
  const s = suffix.trim();
  // Case-sensitive checks first
  if (s === "m" || s === "-") return "min";
  if (s === "" || s === "M") return "maj";
  if (s === "m6" || s === "m7" || s === "m9" || s === "m11" || s === "m13" || s === "-7" || s === "-9") return "min";
  if (s === "M7" || s === "M9" || s === "M11" || s === "M13") return "maj";
  if (s === "Δ" || s === "△" || s === "△7") return "maj";
  if (s === "ø" || s === "ø7") return "hdim";
  if (s === "°" || s === "°7") return "dim";
  const sl = s.toLowerCase();
  if (["maj", "major", "add9", "add2", "6", "maj6", "maj7", "maj9", "maj11", "maj13", "5", "2"].includes(sl)) return "maj";
  if (["min", "minor", "min6", "min7", "min9", "min11"].includes(sl)) return "min";
  if (["7", "9", "11", "13", "dom", "dom7", "7sus4", "sus47"].includes(sl)) return "dom";
  if (["sus4", "sus2", "sus"].includes(sl)) return "sus";
  if (["dim", "dim7", "o", "o7"].includes(sl)) return "dim";
  if (["m7b5", "m7(b5)", "hdim", "hdim7"].includes(sl)) return "hdim";
  if (["aug", "aug7"].includes(sl)) return "aug";
  return "maj";
}

function suffixHasSeventh(rawSuffix) {
  const s = rawSuffix.trim();
  return s.toLowerCase().includes("7") || ["Δ", "△", "△7", "ø", "ø7"].includes(s);
}

function parseChordToken(raw) {
  const token = raw.trim();
  if (!token) return null;

  // Separate slash bass: "A/E" or "D/F#"
  const slashIdx = token.indexOf("/");
  let chordPart = token;
  let bassText = null;
  if (slashIdx > 0) {
    chordPart = token.slice(0, slashIdx).trim();
    bassText = token.slice(slashIdx + 1).trim();
  }

  const letter = chordPart[0]?.toUpperCase();
  if (!letter || !(letter in NOTE_PCS)) return null;

  let rootPc = NOTE_PCS[letter];
  let i = 1;
  while (i < chordPart.length && chordPart[i] === "#") { rootPc += 1; i++; }
  while (i < chordPart.length && chordPart[i] === "b") { rootPc -= 1; i++; }
  rootPc = mod12(rootPc);

  const rawSuffix = chordPart.slice(i);
  const quality = suffixToQuality(rawSuffix);
  const hasSeventh = suffixHasSeventh(rawSuffix) || quality === "dom" || quality === "hdim";

  let bassRootPc = null;
  if (bassText) {
    const bl = bassText[0]?.toUpperCase();
    if (bl && bl in NOTE_PCS) {
      let bpc = NOTE_PCS[bl];
      let bi = 1;
      while (bi < bassText.length && bassText[bi] === "#") { bpc += 1; bi++; }
      while (bi < bassText.length && bassText[bi] === "b") { bpc -= 1; bi++; }
      bassRootPc = mod12(bpc);
    }
  }

  return { symbol: token, rootPc, quality, bassRootPc, hasSeventh };
}

export function parseProgressionText(text) {
  if (!text?.trim()) return [];
  // Split by |, comma, newline, tab first; then split each token by spaces
  const primary = text.split(/[|,\n\r]+|\t/).map((t) => t.trim()).filter(Boolean);
  const tokens = primary.flatMap((t) => t.split(/\s+/).filter(Boolean));
  return tokens.map(parseChordToken).filter(Boolean);
}

function buildChromaticDegreeLabel(interval, quality, hasSeventh) {
  const upperBase = CHROMATIC_DEGREE_NAMES_UPPER[interval];
  const isMinorLike = quality === "min" || quality === "dim" || quality === "hdim";
  const base = isMinorLike
    ? upperBase.replace(/[IVX]+/g, (m) => m.toLowerCase())
    : upperBase;
  if (quality === "maj" && hasSeventh) return `${base}maj7`;
  if (quality === "maj") return base;
  if (quality === "min" && hasSeventh) return `${base}7`;
  if (quality === "min") return base;
  if (quality === "dom") return `${base}7`;
  if (quality === "dim" && hasSeventh) return `${base}°7`;
  if (quality === "dim") return `${base}°`;
  if (quality === "hdim") return `${base}ø7`;
  if (quality === "aug") return `${base}+`;
  return base;
}

function buildDegrees(tonicPc, scaleName) {
  const { intervals, qualities } = SCALES[scaleName];
  return intervals.map((iv, i) => ({ rootPc: mod12(tonicPc + iv), quality: qualities[i] }));
}

// Map extended/dom qualities to the base triad quality for diatonic matching
function triadQuality(q) {
  if (q === "dom") return "maj";
  if (q === "hdim") return "dim";
  return q;
}

function degreeChordName(rootPc, quality, preferSharps) {
  const name = pcToName(rootPc, preferSharps);
  if (quality === "min") return `${name}m`;
  if (quality === "dim") return `${name}dim`;
  return name;
}

function tetradChordName(rootPc, tetradQuality, preferSharps) {
  const name = pcToName(rootPc, preferSharps);
  if (tetradQuality === "maj7") return `${name}maj7`;
  if (tetradQuality === "min7") return `${name}m7`;
  if (tetradQuality === "dom7") return `${name}7`;
  if (tetradQuality === "hdim7") return `${name}m7b5`;
  return name;
}

export function buildDiatonicTable(tonicPc, scaleName, preferSharps, chords, mode) {
  const { intervals, qualities } = SCALES[scaleName];
  const degreeLabels = mode === "tetrad" ? DEGREE_LABELS_TETRAD[scaleName] : DEGREE_LABELS_TRIAD[scaleName];
  const tetradQuals = TETRAD_QUALITIES[scaleName];
  return intervals.map((iv, i) => {
    const rootPc = mod12(tonicPc + iv);
    const triadQual = qualities[i];
    const tetradQual = tetradQuals[i];
    const name = mode === "tetrad"
      ? tetradChordName(rootPc, tetradQual, preferSharps)
      : degreeChordName(rootPc, triadQual, preferSharps);
    // Match using triad quality regardless of display mode
    const usedBy = chords
      .filter((c) => c.rootPc === rootPc && triadQuality(c.quality) === triadQual)
      .map((c) => c.symbol);
    return { degree: degreeLabels[i], name, rootPc, quality: triadQual, tetradQuality: tetradQual, used: usedBy.length > 0, usedBy };
  });
}

function scoreChord(chord, tonicPc, scaleName, degrees) {
  const tq = triadQuality(chord.quality);

  // 1. Diatonic triad match
  for (const deg of degrees) {
    if (chord.rootPc === deg.rootPc && tq === deg.quality) {
      return { points: SCORE_DIATONIC, type: "diatonic" };
    }
  }

  // 2. Functional dominant in minor: harmonic minor V (major triad on degree 5)
  if (scaleName === "Menor natural" && tq === "maj" && chord.rootPc === mod12(tonicPc + 7)) {
    return { points: SCORE_FUNCTIONAL_DOM, type: "functional" };
  }

  // 3. Secondary dominant (major triad that resolves to a diatonic non-dim chord)
  if (tq === "maj") {
    // A dominant chord resolves down a fifth (up a fourth): target = root + 5
    const targetPc = mod12(chord.rootPc + 5);
    for (const deg of degrees) {
      if (deg.quality === "dim" || deg.quality === "hdim") continue;
      if (targetPc === deg.rootPc) {
        return { points: SCORE_SECONDARY_DOM, type: "secondary", targetPc };
      }
    }
  }

  return { points: 0, type: "outside" };
}

function buildChordExplanation(chord, tonicPc, scaleName, scoreInfo, preferSharps, degrees) {
  if (scoreInfo.type === "functional") {
    return `${chord.symbol} → dominante de ${pcToName(tonicPc, preferSharps)}m`;
  }
  if (scoreInfo.type === "secondary") {
    const deg = degrees.find((d) => d.rootPc === scoreInfo.targetPc);
    if (deg) {
      const nm = pcToName(scoreInfo.targetPc, preferSharps);
      return `${chord.symbol} → dominante secundario de ${nm}${deg.quality === "min" ? "m" : ""}`;
    }
  }
  return chord.symbol;
}

// ─── Modal centers ────────────────────────────────────────────────────────────

const MODES_LIST = [
  {
    name: "jónico",
    displayName: "jónico / mayor",
    parentOffset: 0,
    intervals: [0, 2, 4, 5, 7, 9, 11],
    qualities: ["maj", "min", "min", "maj", "maj", "min", "dim"],
    degreeLabels: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  },
  {
    name: "dórico",
    displayName: "dórico",
    parentOffset: 2,
    intervals: [0, 2, 3, 5, 7, 9, 10],
    qualities: ["min", "min", "maj", "maj", "min", "dim", "maj"],
    degreeLabels: ["i", "ii", "III", "IV", "v", "vi°", "VII"],
  },
  {
    name: "frigio",
    displayName: "frigio",
    parentOffset: 4,
    intervals: [0, 1, 3, 5, 7, 8, 10],
    qualities: ["min", "maj", "maj", "min", "dim", "maj", "min"],
    degreeLabels: ["i", "bII", "III", "iv", "v°", "VI", "vii"],
  },
  {
    name: "lidio",
    displayName: "lidio",
    parentOffset: 5,
    intervals: [0, 2, 4, 6, 7, 9, 11],
    qualities: ["maj", "maj", "min", "dim", "maj", "min", "min"],
    degreeLabels: ["I", "II", "iii", "#iv°", "V", "vi", "vii"],
  },
  {
    name: "mixolidio",
    displayName: "mixolidio",
    parentOffset: 7,
    intervals: [0, 2, 4, 5, 7, 9, 10],
    qualities: ["maj", "min", "dim", "maj", "min", "min", "maj"],
    degreeLabels: ["I", "ii", "iii°", "IV", "v", "vi", "bVII"],
  },
  {
    name: "eólico",
    displayName: "eólico / menor natural",
    parentOffset: 9,
    intervals: [0, 2, 3, 5, 7, 8, 10],
    qualities: ["min", "dim", "maj", "min", "min", "maj", "maj"],
    degreeLabels: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
  },
  // Locrio omitted: diminished tonic is not a functional modal center
];

const PENTA_MAJ_IVS = [0, 2, 4, 7, 9];
const PENTA_MIN_IVS = [0, 3, 5, 7, 10];
const PENTA_MAJ_DEGREES = ["1", "2", "3", "5", "6"];
const PENTA_MIN_DEGREES = ["1", "b3", "4", "5", "b7"];

function buildSuggestedScales(tonicPc, modeDef, parentPc, parentPreferSharps) {
  const tonicPreferSharps = preferSharpsFromMajorTonicPc(parentPc);
  const tonicName = pcToName(tonicPc, tonicPreferSharps);
  // Modos menores (dórico, frigio, eólico): pentatónica menor del tónico primero.
  // Modos mayores (jónico, lidio, mixolidio): pentatónica mayor del tónico primero.
  const isMinorMode = modeDef.qualities[0] === "min";
  const scales = [];

  // 1. The mode itself
  scales.push({
    id: `mode-${tonicPc}-${modeDef.name}`,
    name: `${tonicName} ${modeDef.displayName}`,
    notes: modeDef.intervals.map((iv) => pcToName(mod12(tonicPc + iv), tonicPreferSharps)),
    degrees: modeDef.degreeLabels,
    relativeNote: null,
  });

  // 2. Parent major scale (skip if jónico — same notes as #1)
  if (modeDef.name !== "jónico") {
    const parentName = pcToName(parentPc, parentPreferSharps);
    scales.push({
      id: `parent-${parentPc}`,
      name: `${parentName} mayor`,
      notes: SCALES.Mayor.intervals.map((iv) => pcToName(mod12(parentPc + iv), parentPreferSharps)),
      degrees: DEGREE_LABELS_TRIAD.Mayor,
      relativeNote: null,
    });
  }

  if (isMinorMode) {
    // 3. Minor pentatonic of tonic (natural choice for minor modes)
    const pentaMinPcs = PENTA_MIN_IVS.map((iv) => mod12(tonicPc + iv));
    const pentaMinNotes = pentaMinPcs.map((pc) => pcToName(pc, tonicPreferSharps));
    // 4. Major pentatonic of bIII (relative major = intervals[2] above tonic)
    const bIIIPc = mod12(tonicPc + modeDef.intervals[2]);
    const bIIIPreferSharps = preferSharpsFromMajorTonicPc(parentPc);
    const bIIIName = pcToName(bIIIPc, bIIIPreferSharps);
    const pentaMajPcs = PENTA_MAJ_IVS.map((iv) => mod12(bIIIPc + iv));
    const pentaMajNotes = pentaMajPcs.map((pc) => pcToName(pc, bIIIPreferSharps));
    const pcSetMin = new Set(pentaMinPcs);
    const pcSetMaj = new Set(pentaMajPcs);
    const sameNotes = pcSetMin.size === pcSetMaj.size && [...pcSetMin].every((pc) => pcSetMaj.has(pc));
    scales.push({
      id: `penta-min-${tonicPc}`,
      name: `${tonicName} pentatónica menor`,
      notes: pentaMinNotes,
      degrees: PENTA_MIN_DEGREES,
      relativeNote: sameNotes ? `Mismas notas que ${bIIIName} pentatónica mayor, distinto centro tonal.` : null,
    });
    scales.push({
      id: `penta-maj-${bIIIPc}`,
      name: `${bIIIName} pentatónica mayor`,
      notes: pentaMajNotes,
      degrees: PENTA_MAJ_DEGREES,
      relativeNote: sameNotes ? `Mismas notas que ${tonicName} pentatónica menor, distinto centro tonal.` : null,
    });
  } else {
    // 3. Major pentatonic of tonic (natural choice for major modes)
    const pentaMajPcs = PENTA_MAJ_IVS.map((iv) => mod12(tonicPc + iv));
    const pentaMajNotes = pentaMajPcs.map((pc) => pcToName(pc, tonicPreferSharps));
    // 4. Minor pentatonic of vi (relative minor = intervals[5] above tonic)
    const viPc = mod12(tonicPc + modeDef.intervals[5]);
    const viPreferSharps = preferSharpsFromMajorTonicPc(parentPc);
    const viName = pcToName(viPc, viPreferSharps);
    const pentaMinPcs = PENTA_MIN_IVS.map((iv) => mod12(viPc + iv));
    const pentaMinNotes = pentaMinPcs.map((pc) => pcToName(pc, viPreferSharps));
    const pcSetMaj = new Set(pentaMajPcs);
    const pcSetMin = new Set(pentaMinPcs);
    const sameNotes = pcSetMaj.size === pcSetMin.size && [...pcSetMaj].every((pc) => pcSetMin.has(pc));
    scales.push({
      id: `penta-maj-${tonicPc}`,
      name: `${tonicName} pentatónica mayor`,
      notes: pentaMajNotes,
      degrees: PENTA_MAJ_DEGREES,
      relativeNote: sameNotes ? `Mismas notas que ${viName} pentatónica menor, distinto centro tonal.` : null,
    });
    scales.push({
      id: `penta-min-${viPc}`,
      name: `${viName} pentatónica menor`,
      notes: pentaMinNotes,
      degrees: PENTA_MIN_DEGREES,
      relativeNote: sameNotes ? `Mismas notas que ${tonicName} pentatónica mayor, distinto centro tonal.` : null,
    });
  }

  return scales;
}

export function buildKeyScales(tonicPc, scaleName, preferSharps, chords = null) {
  const tonicName = pcToName(tonicPc, preferSharps);
  const scales = [];

  if (scaleName === "Mayor") {
    // 1. Tonic major
    scales.push({
      id: `key-major-${tonicPc}`,
      name: `${tonicName} mayor`,
      notes: SCALES.Mayor.intervals.map((iv) => pcToName(mod12(tonicPc + iv), preferSharps)),
      degrees: DEGREE_LABELS_TRIAD.Mayor,
      relativeNote: null,
    });

    // 2. Tonic major pentatonic
    scales.push({
      id: `key-penta-maj-${tonicPc}`,
      name: `${tonicName} pentatónica mayor`,
      notes: PENTA_MAJ_IVS.map((iv) => pcToName(mod12(tonicPc + iv), preferSharps)),
      degrees: PENTA_MAJ_DEGREES,
      relativeNote: null,
    });

    // 3. Relative minor natural (vi = +9 semitones)
    const viPc = mod12(tonicPc + 9);
    const viName = pcToName(viPc, preferSharps);
    scales.push({
      id: `key-minor-${viPc}`,
      name: `${viName} menor natural`,
      notes: SCALES["Menor natural"].intervals.map((iv) => pcToName(mod12(viPc + iv), preferSharps)),
      degrees: DEGREE_LABELS_TRIAD["Menor natural"],
      relativeNote: null,
    });

    // 4. Relative minor pentatonic
    scales.push({
      id: `key-penta-min-${viPc}`,
      name: `${viName} pentatónica menor`,
      notes: PENTA_MIN_IVS.map((iv) => pcToName(mod12(viPc + iv), preferSharps)),
      degrees: PENTA_MIN_DEGREES,
      relativeNote: `Mismas notas que ${tonicName} pentatónica mayor, distinto centro tonal.`,
    });

    // 5. Extra: minor pentatonics for diatonic minor chord roots that appear in the
    //    progression and are NOT the standard relative (vi) already covered above.
    if (chords && chords.length > 0) {
      const majorDegrees = SCALES.Mayor.intervals.map((iv, i) => ({
        rootPc: mod12(tonicPc + iv),
        quality: SCALES.Mayor.qualities[i],
      }));
      const coveredPcs = new Set([viPc]);
      for (const chord of chords) {
        if (coveredPcs.has(chord.rootPc)) continue;
        const isDiatonicMinor = majorDegrees.some(
          (d) => d.rootPc === chord.rootPc && d.quality === "min"
        );
        if (!isDiatonicMinor) continue;
        coveredPcs.add(chord.rootPc);
        const extraName = pcToName(chord.rootPc, preferSharps);
        scales.push({
          id: `key-penta-min-ctx-${chord.rootPc}`,
          name: `${extraName} pentatónica menor`,
          notes: PENTA_MIN_IVS.map((iv) => pcToName(mod12(chord.rootPc + iv), preferSharps)),
          degrees: PENTA_MIN_DEGREES,
          relativeNote: null,
        });
      }
    }
  } else {
    // Menor natural

    // 1. Tonic minor natural
    scales.push({
      id: `key-minor-${tonicPc}`,
      name: `${tonicName} menor natural`,
      notes: SCALES["Menor natural"].intervals.map((iv) => pcToName(mod12(tonicPc + iv), preferSharps)),
      degrees: DEGREE_LABELS_TRIAD["Menor natural"],
      relativeNote: null,
    });

    // 2. Tonic minor pentatonic
    scales.push({
      id: `key-penta-min-${tonicPc}`,
      name: `${tonicName} pentatónica menor`,
      notes: PENTA_MIN_IVS.map((iv) => pcToName(mod12(tonicPc + iv), preferSharps)),
      degrees: PENTA_MIN_DEGREES,
      relativeNote: null,
    });

    // 3. Relative major (III = +3 semitones)
    const IIIPc = mod12(tonicPc + 3);
    const IIIName = pcToName(IIIPc, preferSharps);
    scales.push({
      id: `key-major-${IIIPc}`,
      name: `${IIIName} mayor`,
      notes: SCALES.Mayor.intervals.map((iv) => pcToName(mod12(IIIPc + iv), preferSharps)),
      degrees: DEGREE_LABELS_TRIAD.Mayor,
      relativeNote: null,
    });

    // 4. Relative major pentatonic
    scales.push({
      id: `key-penta-maj-${IIIPc}`,
      name: `${IIIName} pentatónica mayor`,
      notes: PENTA_MAJ_IVS.map((iv) => pcToName(mod12(IIIPc + iv), preferSharps)),
      degrees: PENTA_MAJ_DEGREES,
      relativeNote: `Mismas notas que ${tonicName} pentatónica menor, distinto centro tonal.`,
    });
  }

  return scales;
}

export function computeModalCenters(chords) {
  if (!chords || !chords.length) return [];

  const allCenters = [];
  const chordRootPcs = new Set(chords.map((c) => c.rootPc));
  const firstRootPc = chords[0].rootPc;
  const lastRootPc = chords[chords.length - 1].rootPc;

  for (let parentPc = 0; parentPc < 12; parentPc++) {
    const parentDegrees = SCALES.Mayor.intervals.map((iv, i) => ({
      rootPc: mod12(parentPc + iv),
      quality: SCALES.Mayor.qualities[i],
    }));

    // All chords must fit diatonically in this parent major scale
    const allFit = chords.every((chord) => {
      const tq = triadQuality(chord.quality);
      return parentDegrees.some((d) => d.rootPc === chord.rootPc && d.quality === tq);
    });
    if (!allFit) continue;

    const parentPreferSharps = preferSharpsFromMajorTonicPc(parentPc);

    for (const modeDef of MODES_LIST) {
      const modalTonicPc = mod12(parentPc + modeDef.parentOffset);
      const isMainMode = modeDef.name === "jónico" || modeDef.name === "eólico";
      if (!chordRootPcs.has(modalTonicPc) && !isMainMode) continue;

      const tonicPreferSharps = preferSharpsFromMajorTonicPc(parentPc);
      const tonicName = pcToName(modalTonicPc, tonicPreferSharps);
      const label = `${tonicName} ${modeDef.displayName}`;

      // Deduplicate by (tonicPc, modeName)
      const dedupKey = `${modalTonicPc}-${modeDef.name}`;
      if (allCenters.some((c) => c.dedupKey === dedupKey)) continue;

      // Degree mapping for each unique chord
      const seen = new Set();
      const chordDegrees = {};
      for (const chord of chords) {
        if (seen.has(chord.symbol)) continue;
        seen.add(chord.symbol);
        const interval = mod12(chord.rootPc - modalTonicPc);
        const degIdx = modeDef.intervals.indexOf(interval);
        if (degIdx >= 0) chordDegrees[chord.symbol] = modeDef.degreeLabels[degIdx];
      }

      // Summary line: "E = I, F# = II, C#m = vi"
      const summaryParts = chords
        .filter((c, i, arr) => arr.findIndex((x) => x.symbol === c.symbol) === i)
        .map((c) => (chordDegrees[c.symbol] ? `${c.symbol} = ${chordDegrees[c.symbol]}` : null))
        .filter(Boolean);
      const summary = summaryParts.join(", ");

      // Score
      let score = chords.length; // base: all chords fit
      if (firstRootPc === modalTonicPc) score += 4;
      if (lastRootPc === modalTonicPc) score += 3;
      score += chords.filter((c) => c.rootPc === modalTonicPc).length * 2;

      // Diatonic table
      const diatonicTable = modeDef.intervals.map((iv, i) => {
        const rootPc = mod12(modalTonicPc + iv);
        const quality = modeDef.qualities[i];
        const name = degreeChordName(rootPc, quality, tonicPreferSharps);
        const usedBy = chords
          .filter((c) => c.rootPc === rootPc && triadQuality(c.quality) === quality)
          .map((c) => c.symbol);
        return { degree: modeDef.degreeLabels[i], name, rootPc, quality, used: usedBy.length > 0, usedBy };
      });

      const parentName = pcToName(parentPc, parentPreferSharps);
      const modeNotes = modeDef.intervals.map((iv) => pcToName(mod12(modalTonicPc + iv), tonicPreferSharps));
      const suggestedScales = buildSuggestedScales(modalTonicPc, modeDef, parentPc, parentPreferSharps);

      allCenters.push({
        dedupKey,
        label,
        tonicPc: modalTonicPc,
        modeName: modeDef.name,
        modeDisplayName: modeDef.displayName,
        parentTonicPc: parentPc,
        parentLabel: `${parentName} mayor`,
        modeNotes,
        diatonicTable,
        chordDegrees,
        summary,
        score,
        suggestedScales,
        suggestedExpand: false,
      });
    }
  }

  allCenters.sort((a, b) => b.score - a.score);

  // Mark the top-scoring center as suggested for auto-expand
  if (allCenters.length > 0) allCenters[0].suggestedExpand = true;

  return allCenters;
}

// Prioridad musical para modos de origen en intercambio modal (clave mayor).
// Cuando un acorde encaja en varios modos paralelos, el más frecuente en la práctica
// recibe preferencia. La clave es el intervalo desde la tónica.
const INTERCHANGE_MODE_PRIORITY = {
  1: "frigio",      // bII → origen neapolitano / frigio
  3: "eólico",      // bIII → menor natural
  5: "eólico",      // iv → menor natural
  8: "eólico",      // bVI → menor natural
  10: "mixolidio",  // bVII (mayor/dom) → mixolidio; minor → eólico (ver código)
};

function selectPrimaryInterchangeSource(interval, quality, sources) {
  if (sources.length <= 1) return sources[0] ?? null;
  const tq = triadQuality(quality);
  // bVII con calidad menor: preferir eólico sobre mixolidio
  let preferredName = INTERCHANGE_MODE_PRIORITY[interval];
  if (interval === 10 && tq !== "maj") preferredName = "eólico";
  if (preferredName) {
    const found = sources.find((s) => s.includes(preferredName));
    if (found) return found;
  }
  return sources[0];
}

function detectModalInterchange(tonicPc, scaleName, preferSharps, outsideChordsData) {
  const mainModeName = scaleName === "Mayor" ? "jónico" : "eólico";
  const tonicName = pcToName(tonicPc, preferSharps);
  const result = [];
  for (const chord of outsideChordsData) {
    const interval = mod12(chord.rootPc - tonicPc);
    const tq = triadQuality(chord.quality);
    const sources = [];
    for (const modeDef of MODES_LIST) {
      if (modeDef.name === mainModeName) continue;
      const degIdx = modeDef.intervals.indexOf(interval);
      if (degIdx < 0) continue;
      if (modeDef.qualities[degIdx] !== tq) continue;
      sources.push(modeDef.displayName);
    }
    const degreeLabel = buildChromaticDegreeLabel(interval, chord.quality, chord.hasSeventh);
    const isInterchange = sources.length > 0;
    // Seleccionar el modo de origen musicalmente más relevante para la explicación principal
    const primarySource = isInterchange
      ? selectPrimaryInterchangeSource(interval, chord.quality, sources)
      : null;
    const sourceDescription = isInterchange ? `${tonicName} ${primarySource}` : null;
    result.push({
      symbol: chord.symbol,
      interval,
      degreeLabel,
      sources,
      sourceDescription,
      explanation: isInterchange
        ? `${chord.symbol} → ${degreeLabel}, prestado de ${sourceDescription}`
        : null,
      isInterchange,
    });
  }
  return result;
}

export function analyzeProgression(text) {
  const chords = parseProgressionText(text);
  if (!chords.length) return { chords: [], keys: [], isEmpty: true, mode: "triad" };

  const mode = chords.some((c) => c.hasSeventh) ? "tetrad" : "triad";

  const results = [];

  for (const scaleName of ["Mayor", "Menor natural"]) {
    for (let tonicPc = 0; tonicPc < 12; tonicPc++) {
      const preferSharps = computeAutoPreferSharps({ rootPc: tonicPc, scaleName });
      const degrees = buildDegrees(tonicPc, scaleName);

      let totalScore = 0;
      const diatonicChords = [];
      const functionalChords = [];
      const outsideChordSymbols = [];
      const outsideChordObjects = [];

      for (const chord of chords) {
        const si = scoreChord(chord, tonicPc, scaleName, degrees);
        totalScore += si.points;

        if (si.type === "diatonic") {
          if (!diatonicChords.includes(chord.symbol)) diatonicChords.push(chord.symbol);
        } else if (si.type === "functional" || si.type === "secondary") {
          if (!functionalChords.find((f) => f.symbol === chord.symbol)) {
            functionalChords.push({
              symbol: chord.symbol,
              explanation: buildChordExplanation(chord, tonicPc, scaleName, si, preferSharps, degrees),
            });
          }
        } else {
          if (!outsideChordSymbols.includes(chord.symbol)) {
            outsideChordSymbols.push(chord.symbol);
            outsideChordObjects.push(chord);
          }
        }
      }

      // Bonus I-IV-V tonic-start: when the first chord is the I (major) of this key,
      // IV and V are diatonic, and at least one chord is non-diatonic, add a ranking
      // bonus equal to SCORE_FUNCTIONAL_DOM. Percentage is computed from the base score
      // to avoid showing >100%; the bonus only lifts the key in the ranking, ensuring
      // it appears as a strong alternative next to keys that happen to be fully diatonic.
      let bonusScore = 0;
      if (scaleName === "Mayor" && outsideChordSymbols.length > 0) {
        const firstChord = chords[0];
        if (triadQuality(firstChord.quality) === "maj" && firstChord.rootPc === tonicPc) {
          const ivPc = mod12(tonicPc + 5);
          const vPc = mod12(tonicPc + 7);
          const hasIV = chords.some((c) => c.rootPc === ivPc && diatonicChords.includes(c.symbol));
          const hasV = chords.some((c) => c.rootPc === vPc && diatonicChords.includes(c.symbol));
          if (hasIV && hasV) bonusScore = SCORE_FUNCTIONAL_DOM;
        }
      }

      const maxScore = chords.length * SCORE_DIATONIC;
      const percentage = Math.round((totalScore / maxScore) * 100);
      totalScore += bonusScore;
      const tonicCount = chords.filter((c) => c.rootPc === tonicPc).length;
      const tonicName = pcToName(tonicPc, preferSharps);
      const { label } = SCALES[scaleName];

      const diatonicTable = buildDiatonicTable(tonicPc, scaleName, preferSharps, chords, mode);

      // Map each diatonic input chord to its degree label
      const chordDegrees = {};
      for (const chord of chords) {
        const match = diatonicTable.find(
          (d) => d.rootPc === chord.rootPc && triadQuality(chord.quality) === d.quality
        );
        if (match && !chordDegrees[chord.symbol]) {
          chordDegrees[chord.symbol] = match.degree;
        }
      }

      const allInterchangeInfo = detectModalInterchange(tonicPc, scaleName, preferSharps, outsideChordObjects);
      const interchangeChords = allInterchangeInfo.filter((ic) => ic.isInterchange);
      const outsideChords = allInterchangeInfo.filter((ic) => !ic.isInterchange).map((ic) => ic.symbol);

      results.push({
        label: `${tonicName} ${label}`,
        tonicPc,
        scaleName,
        score: totalScore,
        percentage,
        tonicCount,
        strength: percentage >= 80 ? "fuerte" : percentage >= 50 ? "moderado" : "débil",
        diatonicChords,
        functionalChords,
        outsideChords,
        interchangeChords,
        diatonicTable,
        chordDegrees,
        hasFunctionalBonus: bonusScore > 0,
        suggestedScales: buildKeyScales(tonicPc, scaleName, preferSharps, chords),
      });
    }
  }

  // Sort: score DESC, tonicCount DESC, Mayor before Menor
  results.sort(
    (a, b) =>
      b.score - a.score ||
      b.tonicCount - a.tonicCount ||
      a.scaleName.localeCompare(b.scaleName)
  );

  const topScore = results[0]?.score ?? 0;
  const keys = results
    .filter((r) => r.percentage >= 40 && r.score >= topScore - SCORE_DIATONIC)
    .slice(0, 6);

  const modalCenters = computeModalCenters(chords);

  return { chords, keys, isEmpty: false, mode, modalCenters };
}
