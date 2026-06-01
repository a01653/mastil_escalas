import { useCallback, useMemo, useState } from "react";
import {
  buildScaleIntervals,
  buildScaleIntervalLabels,
  buildScaleTetradHarmonization,
  computeAutoPreferSharps,
  mod12,
  normalizeScaleName,
  parseTokensToIntervals,
  pickThirdOffsets,
  spellScaleNotes,
} from "../../music/appMusicBasics.js";
import { LETTERS, SCALE_PRESETS } from "../../music/appStaticData.js";
import {
  sanitizeBoolValue,
  sanitizeNumberValue,
  sanitizeOneOf,
} from "../../music/appPatternRouteStaffCore.jsx";

export function useTonalityFeature() {
  // ── Estado ────────────────────────────────────────────────────────────────

  const [rootPc, setRootPc] = useState(5); // F
  const [scaleRootLetter, setScaleRootLetter] = useState("F");
  const [scaleRootAcc, setScaleRootAcc] = useState(null); // null | "flat" | "sharp"
  const [scaleName, setScaleName] = useState("Mayor");
  const [harmonyMode, setHarmonyMode] = useState("diatonic"); // diatonic | functional_minor
  const [accMode, setAccMode] = useState("auto"); // auto | sharps | flats
  const [customInput, setCustomInput] = useState("1 b3 5 6");
  const [extraInput, setExtraInput] = useState("b2");
  const [showExtra, setShowExtra] = useState(false);

  // ── Derivados puros ───────────────────────────────────────────────────────

  const scaleIntervals = useMemo(
    () => buildScaleIntervals(scaleName, customInput, rootPc),
    [scaleName, customInput, rootPc]
  );

  const autoPreferSharps = useMemo(
    () => computeAutoPreferSharps({ rootPc, scaleName }),
    [rootPc, scaleName]
  );

  const preferSharps = accMode === "auto" ? autoPreferSharps : accMode === "sharps";

  const scaleIntervalLabels = useMemo(
    () => buildScaleIntervalLabels(scaleName, scaleIntervals),
    [scaleName, scaleIntervals]
  );

  const scalePcs = useMemo(
    () => new Set(scaleIntervals.map((i) => mod12(rootPc + i))),
    [scaleIntervals, rootPc]
  );

  const thirdOffsets = useMemo(() => pickThirdOffsets(scaleIntervals), [scaleIntervals]);

  const hasFifth = useMemo(
    () => new Set(scaleIntervals.map(mod12)).has(7),
    [scaleIntervals]
  );

  const extraIntervals = useMemo(
    () => parseTokensToIntervals({ input: extraInput, rootPc }),
    [extraInput, rootPc]
  );

  const extraPcs = useMemo(
    () => new Set(extraIntervals.map((i) => mod12(rootPc + i))),
    [extraIntervals, rootPc]
  );

  const spelledScaleNotes = useMemo(
    () => spellScaleNotes({ rootPc, scaleIntervals, preferSharps }),
    [rootPc, scaleIntervals, preferSharps]
  );

  const spelledExtraNotes = useMemo(
    () => spellScaleNotes({ rootPc, scaleIntervals: extraIntervals, preferSharps }),
    [rootPc, extraIntervals, preferSharps]
  );

  const scaleTetradHarmony = useMemo(
    () => buildScaleTetradHarmonization({ rootPc, scaleName, harmonyMode, scaleIntervals, spelledScaleNotes, preferSharps }),
    [rootPc, scaleName, harmonyMode, scaleIntervals, spelledScaleNotes, preferSharps]
  );

  // ── Hidratación desde localStorage ───────────────────────────────────────

  const applyFromConfig = useCallback((saved) => {
    if ("accMode" in saved) setAccMode(sanitizeOneOf(saved.accMode, ["auto", "sharps", "flats"], "auto"));
    if ("rootPc" in saved) setRootPc(sanitizeNumberValue(saved.rootPc, 5, 0, 11));
    if ("harmonyMode" in saved) setHarmonyMode(sanitizeOneOf(saved.harmonyMode, ["diatonic", "functional_minor"], "diatonic"));
    if ("scaleRootLetter" in saved) setScaleRootLetter(sanitizeOneOf(saved.scaleRootLetter, LETTERS, "F"));
    if ("scaleRootAcc" in saved) setScaleRootAcc(saved.scaleRootAcc == null ? null : sanitizeOneOf(saved.scaleRootAcc, ["flat", "sharp"], null));
    if ("scaleName" in saved) setScaleName(sanitizeOneOf(normalizeScaleName(saved.scaleName), Object.keys(SCALE_PRESETS), "Mayor"));
    if ("customInput" in saved && typeof saved.customInput === "string") setCustomInput(saved.customInput);
    if ("extraInput" in saved && typeof saved.extraInput === "string") setExtraInput(saved.extraInput);
    if ("showExtra" in saved) setShowExtra(sanitizeBoolValue(saved.showExtra, false));
  }, []);

  return {
    rootPc, setRootPc,
    scaleRootLetter, setScaleRootLetter,
    scaleRootAcc, setScaleRootAcc,
    scaleName, setScaleName,
    harmonyMode, setHarmonyMode,
    accMode, setAccMode,
    customInput, setCustomInput,
    extraInput, setExtraInput,
    showExtra, setShowExtra,

    scaleIntervals,
    autoPreferSharps,
    preferSharps,
    scaleIntervalLabels,
    scalePcs,
    thirdOffsets,
    hasFifth,
    extraIntervals,
    extraPcs,
    spelledScaleNotes,
    spelledExtraNotes,
    scaleTetradHarmony,

    applyFromConfig,
  };
}
