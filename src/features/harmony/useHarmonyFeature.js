import { useMemo } from "react";
import {
  buildHarmonyDegreeChord,
  buildManualScaleHarmonySpecs,
  chordDisplaySuffixOnly,
  mod12,
  normalizeScaleName,
  pcToName,
} from "../../music/appMusicBasics.js";
import { MANUAL_SCALE_TETRAD_PRESETS } from "../../music/appStaticData.js";

export function useHarmonyFeature({
  scaleTetradHarmony,
  rootPc,
  scaleName,
  scaleIntervals,
  harmonyMode,
  preferSharps,
  spelledScaleNotes,
  withSeventh,
}) {
  const scaleTetradDegreesText = useMemo(
    () => scaleTetradHarmony.map((x) => x.degreeName).join(" · "),
    [scaleTetradHarmony]
  );

  const scaleTetradNotesText = useMemo(
    () => scaleTetradHarmony.map((x) => x.noteName).join(" · "),
    [scaleTetradHarmony]
  );

  // Acordes de la escala activa (armonización real según la escala seleccionada)
  const harmonizedScale = useMemo(() => {
    const manualHarmony = buildManualScaleHarmonySpecs({ rootPc, scaleName, scaleIntervals, spelledScaleNotes, preferSharps });

    if (manualHarmony?.length) {
      return {
        tonicName: spelledScaleNotes[0] || pcToName(rootPc, preferSharps),
        scaleLabel: scaleName,
        withSeventh: true,
        degrees: manualHarmony,
        names: manualHarmony.map((item) => item.name),
        preferredDegreeIdx: [1, 2, 3].filter((i) => i < manualHarmony.length),
      };
    }

    const degrees = scaleIntervals.map((interval, i) => {
      const built = buildHarmonyDegreeChord({ scaleName, harmonyMode, scaleIntervals, degreeIndex: i, withSeventh });
      const noteName = spelledScaleNotes[i] || pcToName(mod12(rootPc + interval), preferSharps);
      const chordRootPc2 = mod12(rootPc + interval);

      if (!built) {
        return {
          rootPc: chordRootPc2,
          supported: false,
          name: `${noteName}?`,
          noteName,
        };
      }

      const suffix = chordDisplaySuffixOnly({
        quality: built.quality,
        suspension: built.suspension,
        structure: built.structure,
        ext7: built.ext7,
        ext6: built.ext6,
        ext9: built.ext9,
        ext11: built.ext11,
        ext13: built.ext13,
      });

      return {
        ...built,
        rootPc: chordRootPc2,
        spellPreferSharps: preferSharps,
        supported: true,
        noteName,
        name: `${noteName}${suffix}`,
      };
    });

    return {
      tonicName: spelledScaleNotes[0] || pcToName(rootPc, preferSharps),
      scaleLabel: scaleName,
      withSeventh,
      degrees,
      preferredDegreeIdx: [1, 3, 4].filter((i) => i < degrees.length),
      names: (MANUAL_SCALE_TETRAD_PRESETS[normalizeScaleName(scaleName)] || (withSeventh && scaleTetradHarmony.length)) ? scaleTetradHarmony.map((x) => x.noteName) : degrees.map((d) => d.name),
    };
  }, [withSeventh, scaleIntervals, spelledScaleNotes, scaleTetradHarmony, rootPc, harmonyMode, preferSharps, scaleName]);

  return {
    scaleTetradDegreesText,
    scaleTetradNotesText,
    harmonizedScale,
  };
}
