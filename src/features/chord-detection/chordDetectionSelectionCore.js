export function applyChordDetectCellToggle({
  selectedKeys,
  sIdx,
  fret,
  windowSize,
}) {
  const key = `${sIdx}:${fret}`;

  if (selectedKeys.includes(key)) {
    return {
      nextKeys: selectedKeys.filter((item) => item !== key),
      rejected: false,
      reason: null,
    };
  }

  const withoutSameString = selectedKeys.filter((item) => !String(item).startsWith(`${sIdx}:`));
  const nextKeys = [...withoutSameString, key];
  const fretted = nextKeys
    .map((item) => {
      const [, fretStr] = String(item || "").split(":");
      const parsed = Number.parseInt(fretStr, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    })
    .filter((value) => value != null);

  if (fretted.length) {
    const minFret = Math.min(...fretted);
    const maxFret = Math.max(...fretted);
    if ((maxFret - minFret + 1) > windowSize) {
      return {
        nextKeys: selectedKeys,
        rejected: true,
        reason: "span_limit",
      };
    }
  }

  return {
    nextKeys,
    rejected: false,
    reason: null,
  };
}
