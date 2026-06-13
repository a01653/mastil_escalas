const OPEN_MIDI_LOW_TO_HIGH = [40, 45, 50, 55, 59, 64];
const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const INTERVAL_LABELS = new Map([
  [0, "1"],
  [1, "b9"],
  [2, "9"],
  [3, "b3"],
  [4, "3"],
  [5, "11"],
  [6, "#11"],
  [7, "5"],
  [8, "b13"],
  [9, "13"],
  [10, "b7"],
  [11, "7"],
]);

const GOLDEN_VALUES = ["x", 0, 1, 2, 3, 4, 5];

function mod12(n) {
  const x = n % 12;
  return x < 0 ? x + 12 : x;
}

function pcName(pc) {
  return NOTE_NAMES_SHARP[mod12(pc)];
}

function normalizeFretToken(value, idx) {
  if (value === "x" || value === "X" || value == null) return "x";
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 24) {
    throw new Error(`Fret inválido en cuerda ${idx + 1}: ${value}`);
  }
  return n;
}

export function parseOracleVoicing(pattern) {
  const raw = String(pattern || "").trim();
  const tokens = /[-,\s]/.test(raw)
    ? raw.split(/[-,\s]+/).filter(Boolean)
    : raw.split("");

  if (tokens.length !== 6) {
    throw new Error(`Se esperaban 6 cuerdas en "${pattern}", recibidas ${tokens.length}`);
  }

  return tokens.map((token, idx) => normalizeFretToken(token, idx));
}

export function formatOracleVoicing(strings) {
  return strings.map((value) => (value === "x" ? "x" : String(value))).join("");
}

export function* generateOracleVoicingPatterns(values = GOLDEN_VALUES) {
  function* walk(prefix, depth) {
    if (depth === 6) {
      yield formatOracleVoicing(prefix);
      return;
    }
    for (const value of values) {
      prefix.push(value);
      yield* walk(prefix, depth + 1);
      prefix.pop();
    }
  }
  yield* walk([], 0);
}

function noteDataFromStrings(strings) {
  const sounding = [];
  strings.forEach((fret, stringIndex) => {
    if (fret === "x") return;
    const midi = OPEN_MIDI_LOW_TO_HIGH[stringIndex] + fret;
    sounding.push({
      stringIndex,
      fret,
      midi,
      pc: mod12(midi),
      note: pcName(midi),
    });
  });
  return sounding;
}

function uniqueByPitchClass(sounding) {
  const seen = new Set();
  const out = [];
  for (const item of sounding) {
    if (seen.has(item.pc)) continue;
    seen.add(item.pc);
    out.push(item);
  }
  return out;
}

function suffixWithAdds(base, adds, missing) {
  const parts = adds.map((label) => {
    if (String(label).startsWith("add")) return label;
    return ["9", "11", "13"].includes(label) ? `add${label}` : label;
  });
  for (const item of missing) parts.push(`no${item}`);
  if (!parts.length) return base;
  const inside = parts.join(",");
  if (!base) return `(${inside})`;
  if (base.endsWith(")")) return `${base.slice(0, -1)},${inside})`;
  return `${base}(${inside})`;
}

function classifyCategory(baseCategory, missing, adds) {
  if (baseCategory === "quartal") return "quartal";
  if (missing.length) return `${baseCategory}-fragment`;
  if (adds.length) return `${baseCategory}-extended`;
  return baseCategory;
}

function candidateLevel({ baseCategory, missing, adds, quality }) {
  if (baseCategory === "quartal") return "informational";
  if (missing.length >= 2) return "informational";
  if (/(^|[,(])(?:b9|#9|#11|b13)(?:[,)]|$)/.test(quality)) return "informational";
  if (/\((?:b3|3|b7|7)(?:[,)]|$)/.test(quality)) return "informational";
  if (missing.length === 1) return "mayInclude";
  if (adds.length > 0) return "mayInclude";
  return "mustInclude";
}

function candidateName({ rootName, bassName, quality }) {
  const base = `${rootName}${quality}`;
  return rootName === bassName ? base : `${base}/${bassName}`;
}

function makeCandidate({ rootPc, bassPc, quality, intervals, missing = [], category, baseCategory, evidence, score }) {
  const rootName = pcName(rootPc);
  const bassName = pcName(bassPc);
  const tensions = intervals.filter((label) => ["b9", "9", "#9", "11", "#11", "b13", "13"].includes(label));
  const adds = tensions.filter((label) => !["b9", "#9", "#11", "b13"].includes(label));
  return {
    name: candidateName({ rootName, bassName, quality }),
    root: rootName,
    bass: bassName,
    quality,
    intervals,
    missing,
    tensions,
    inverted: rootPc !== bassPc,
    category,
    level: candidateLevel({ baseCategory: baseCategory || category, missing, adds, quality }),
    evidence,
    score,
  };
}

function degreeSetForRoot(uniquePcs, rootPc) {
  return new Set(uniquePcs.map((pc) => mod12(pc - rootPc)));
}

function labelsFromDegrees(degrees, opts = {}) {
  const labels = [];
  for (const degree of [...degrees].sort((a, b) => a - b)) {
    if (opts.skip?.has(degree)) continue;
    if (opts.preferSharp9 && degree === 3) labels.push("#9");
    else labels.push(INTERVAL_LABELS.get(degree) ?? String(degree));
  }
  return labels;
}

function buildTertianCandidates({ uniquePcs, rootPc, bassPc }) {
  const degrees = degreeSetForRoot(uniquePcs, rootPc);
  if (!degrees.has(0)) return [];

  const out = [];
  const has = (n) => degrees.has(n);

  const addTemplate = ({ base, required, optionalMissing, skip, baseCategory, score }) => {
    if (!required.every(has)) return;
    const optionalDegreeByLabel = { "3": 4, "b3": 3, "5": 7 };
    const missing = optionalMissing.filter((label) => !has(optionalDegreeByLabel[label]));
    const adds = labelsFromDegrees(degrees, { skip });
    const presentStructuralDegrees = optionalMissing
      .map((label) => optionalDegreeByLabel[label])
      .filter((degree) => degree != null && has(degree));
    const quality = suffixWithAdds(base, adds, missing);
    const intervals = [
      ...labelsFromDegrees(new Set([...required, ...presentStructuralDegrees]), { preferSharp9: base.startsWith("7") }),
      ...adds,
    ];
    out.push(makeCandidate({
      rootPc,
      bassPc,
      quality,
      intervals: [...new Set(intervals)],
      missing,
      category: classifyCategory(baseCategory, missing, adds),
      baseCategory,
      evidence: [...degrees].sort((a, b) => a - b),
      score: score + missing.length * 1.5 + adds.length * 0.5,
    }));
  };

  addTemplate({
    base: "7",
    required: [0, 4, 10],
    optionalMissing: ["5"],
    skip: new Set([0, 4, 7, 10]),
    baseCategory: "dominant",
    score: 1,
  });

  addTemplate({
    base: "maj7",
    required: [0, 11],
    optionalMissing: ["3", "5"],
    skip: new Set([0, 4, 7, 11]),
    baseCategory: "maj7",
    score: has(4) ? 1.1 : 2.2,
  });

  addTemplate({
    base: "m7",
    required: [0, 3, 10],
    optionalMissing: ["5"],
    skip: new Set([0, 3, 7, 10]),
    baseCategory: "minor",
    score: 1.2,
  });

  addTemplate({
    base: "m7(b5)",
    required: [0, 3, 6, 10],
    optionalMissing: [],
    skip: new Set([0, 3, 6, 10]),
    baseCategory: "half-diminished",
    score: 1.1,
  });

  addTemplate({
    base: "",
    required: [0, 4],
    optionalMissing: ["5"],
    skip: new Set([0, 4, 7]),
    baseCategory: "triadic",
    score: has(7) ? 0.7 : 2.3,
  });

  addTemplate({
    base: "m",
    required: [0, 3],
    optionalMissing: ["5"],
    skip: new Set([0, 3, 7]),
    baseCategory: "triadic",
    score: has(7) ? 0.7 : 2.4,
  });

  if (has(0) && has(2) && has(7)) {
    const adds = labelsFromDegrees(degrees, { skip: new Set([0, 2, 7]) });
    out.push(makeCandidate({
      rootPc,
      bassPc,
      quality: suffixWithAdds("sus2", adds, []),
      intervals: ["1", "2", "5", ...adds],
      category: classifyCategory("suspended", [], adds),
      baseCategory: "suspended",
      evidence: [...degrees].sort((a, b) => a - b),
      score: 0.8 + adds.length * 0.5,
    }));
    out.push(makeCandidate({
      rootPc,
      bassPc,
      quality: suffixWithAdds("add9", adds, ["3"]),
      intervals: ["1", "5", "9", ...adds],
      missing: ["3"],
      category: classifyCategory("triadic", ["3"], adds),
      baseCategory: "triadic",
      evidence: [...degrees].sort((a, b) => a - b),
      score: 2 + adds.length * 0.5,
    }));
  }

  if (has(0) && has(5) && has(7)) {
    const adds = labelsFromDegrees(degrees, { skip: new Set([0, 5, 7]) });
    out.push(makeCandidate({
      rootPc,
      bassPc,
      quality: suffixWithAdds("sus4", adds, []),
      intervals: ["1", "4", "5", ...adds],
      category: classifyCategory("suspended", [], adds),
      baseCategory: "suspended",
      evidence: [...degrees].sort((a, b) => a - b),
      score: 0.8 + adds.length * 0.5,
    }));
  }

  return out;
}

function buildQuartalCandidate({ uniquePcs, bassPc }) {
  if (uniquePcs.length < 3) return null;
  const sorted = [...uniquePcs].sort((a, b) => a - b);
  for (const rootPc of uniquePcs) {
    const ordered = [rootPc];
    let current = rootPc;
    let okSteps = 0;
    while (ordered.length < uniquePcs.length) {
      const next = uniquePcs.find((pc) => mod12(pc - current) === 5 || mod12(pc - current) === 6);
      if (next == null || ordered.includes(next)) break;
      const step = mod12(next - current);
      if (step === 5 || step === 6) okSteps += 1;
      ordered.push(next);
      current = next;
    }
    if (ordered.length >= 3 && okSteps >= 2) {
      return {
        name: `Cuartal ${pcName(rootPc)}`,
        root: pcName(rootPc),
        bass: pcName(bassPc),
        quality: "quartal",
        intervals: ordered.map((pc) => pcName(pc)),
        missing: [],
        tensions: [],
        inverted: rootPc !== bassPc,
        category: "quartal",
        level: "informational",
        evidence: sorted,
        score: 3,
      };
    }
  }
  return null;
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const candidate of candidates.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))) {
    const key = `${candidate.name}|${candidate.intervals.join(".")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

function candidateNamesByLevel(candidates, level) {
  return candidates
    .filter((candidate) => candidate.level === level)
    .map((candidate) => candidate.name);
}

export function analyzeFretsOracle(pattern, options = {}) {
  const {
    minSoundingStrings = 3,
    minUniquePitchClasses = 3,
    includeDyads = false,
  } = options;

  const strings = Array.isArray(pattern) ? pattern.map(normalizeFretToken) : parseOracleVoicing(pattern);
  const voicing = formatOracleVoicing(strings);
  const sounding = noteDataFromStrings(strings);

  if (sounding.length === 0) return null;
  if (!includeDyads && sounding.length < minSoundingStrings) return null;

  const uniqueItems = uniqueByPitchClass(sounding);
  if (!includeDyads && uniqueItems.length < minUniquePitchClasses) return null;

  const uniquePcs = uniqueItems.map((item) => item.pc);
  const bassItem = sounding.reduce((lo, item) => (item.midi < lo.midi ? item : lo), sounding[0]);
  const bassPc = bassItem.pc;

  const candidates = [];
  for (const rootPc of uniquePcs) {
    candidates.push(...buildTertianCandidates({ uniquePcs, rootPc, bassPc }));
  }
  const quartal = buildQuartalCandidate({ uniquePcs, bassPc });
  if (quartal) candidates.push(quartal);

  const dedupedCandidates = dedupeCandidates(candidates);

  return {
    voicing,
    strings,
    soundingStrings: sounding.length,
    notes: sounding.map((item) => item.note),
    uniqueNotes: uniquePcs.map(pcName),
    pitchClasses: uniquePcs,
    bass: pcName(bassPc),
    candidates: dedupedCandidates,
    preferred: null,
    mustInclude: candidateNamesByLevel(dedupedCandidates, "mustInclude"),
    mayInclude: candidateNamesByLevel(dedupedCandidates, "mayInclude"),
    informational: candidateNamesByLevel(dedupedCandidates, "informational"),
  };
}
