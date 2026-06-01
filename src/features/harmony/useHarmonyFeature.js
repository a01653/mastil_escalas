import { useMemo } from "react";

export function useHarmonyFeature({ scaleTetradHarmony }) {
  const scaleTetradDegreesText = useMemo(
    () => scaleTetradHarmony.map((x) => x.degreeName).join(" · "),
    [scaleTetradHarmony]
  );

  const scaleTetradNotesText = useMemo(
    () => scaleTetradHarmony.map((x) => x.noteName).join(" · "),
    [scaleTetradHarmony]
  );

  return {
    scaleTetradDegreesText,
    scaleTetradNotesText,
  };
}
