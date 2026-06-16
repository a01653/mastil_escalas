import { mod12, pcToName, computeAutoPreferSharps } from "./appMusicBasics.js";

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
      const outsideChords = [];

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
          if (!outsideChords.includes(chord.symbol)) outsideChords.push(chord.symbol);
        }
      }

      const maxScore = chords.length * SCORE_DIATONIC;
      const percentage = Math.round((totalScore / maxScore) * 100);
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
        diatonicTable,
        chordDegrees,
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

  return { chords, keys, isEmpty: false, mode };
}
