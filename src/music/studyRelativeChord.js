const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function mod12(value) {
  const normalized = value % 12;
  return normalized < 0 ? normalized + 12 : normalized;
}

function pcToName(pc, preferSharps) {
  return (preferSharps ? NOTES_SHARP : NOTES_FLAT)[mod12(pc)];
}

export function describeRelativeTertianChord({
  rootPc,
  preferSharps = false,
  quality,
  suspension = "none",
  intervals = [],
  ext7 = false,
  ext6 = false,
  ext9 = false,
  ext11 = false,
  ext13 = false,
  layer = "tertian",
}) {
  if (["quartal", "guide_tones"].includes(layer)) return null;
  if (!["maj", "min"].includes(quality)) return null;
  if ((suspension || "none") !== "none") return null;
  if (ext6 || ext9 || ext11 || ext13) return null;

  const safeIntervals = Array.isArray(intervals) ? intervals.map(mod12) : [];
  const hasSeventh = !!ext7 || safeIntervals.includes(10) || safeIntervals.includes(11);
  const relativeIsMajor = quality === "min";
  const relativeKind = relativeIsMajor ? "mayor" : "menor";
  const relativeRootPc = mod12(rootPc + (relativeIsMajor ? 3 : 9));
  const relativeRootName = pcToName(relativeRootPc, preferSharps);
  const label = relativeIsMajor
    ? `${relativeRootName}${hasSeventh ? "maj7" : ""}`
    : `${relativeRootName}${hasSeventh ? "m7" : "m"}`;

  return {
    kind: relativeKind,
    label,
    shortText: `relativo ${relativeKind}: ${label}`,
  };
}
