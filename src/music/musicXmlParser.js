function splitBassSuffix(rawSuffix) {
  const suffix = String(rawSuffix || "").trim();
  const slashIdx = suffix.indexOf("/");
  if (slashIdx < 0) return { suffix, bass: "" };
  return {
    suffix: suffix.slice(0, slashIdx),
    bass: suffix.slice(slashIdx + 1),
  };
}

const EXACT_SUFFIX_MAP = Object.freeze({
  "": { displaySuffix: "", loadSuffix: "" },
  "2": { displaySuffix: "add9", loadSuffix: "" },
  "6": { displaySuffix: "6", loadSuffix: "6" },
  "69": { displaySuffix: "6/9", loadSuffix: "6" },
  "7": { displaySuffix: "7", loadSuffix: "7" },
  "9": { displaySuffix: "9", loadSuffix: "9" },
  "13": { displaySuffix: "13", loadSuffix: "13" },
  "+": { displaySuffix: "+", loadSuffix: "" },
  "sus": { displaySuffix: "sus4", loadSuffix: "sus4" },
  "7sus": { displaySuffix: "7sus4", loadSuffix: "7sus4" },
  "7susb9": { displaySuffix: "7sus4b9", loadSuffix: "7sus4" },
  "9sus": { displaySuffix: "9sus", loadSuffix: "7sus4" },
  "13sus": { displaySuffix: "13sus", loadSuffix: "7sus4" },
  "M7": { displaySuffix: "Δ7", loadSuffix: "maj7" },
  "M9": { displaySuffix: "Δ9", loadSuffix: "maj7" },
  "M7#5": { displaySuffix: "Δ7#5", loadSuffix: "maj7" },
  "M7#11": { displaySuffix: "Δ7#11", loadSuffix: "maj7" },
  "M9#11": { displaySuffix: "Δ9#11", loadSuffix: "maj7" },
  "m": { displaySuffix: "-", loadSuffix: "m" },
  "m+": { displaySuffix: "-+", loadSuffix: "m" },
  "m6": { displaySuffix: "-6", loadSuffix: "m6" },
  "m7": { displaySuffix: "-7", loadSuffix: "m7" },
  "m9": { displaySuffix: "-9", loadSuffix: "m9" },
  "m11": { displaySuffix: "-11", loadSuffix: "m11" },
  "m69": { displaySuffix: "-6/9", loadSuffix: "m6" },
  "m7b5": { displaySuffix: "-7b5", loadSuffix: "m7b5" },
  "m7M": { displaySuffix: "-Δ7", loadSuffix: "m" },
  "dim": { displaySuffix: "o", loadSuffix: "dim7" },
  "dim7": { displaySuffix: "o7", loadSuffix: "o7" },
  "°": { displaySuffix: "o", loadSuffix: "dim7" },
  "o": { displaySuffix: "o", loadSuffix: "dim7" },
});

function inferFallbackLoadSuffix(rawSuffix) {
  const suffix = String(rawSuffix || "").trim();
  if (!suffix) return "";
  if (/^M/.test(suffix)) return "maj7";
  if (/^m7b5/.test(suffix)) return "m7b5";
  if (/^m11/.test(suffix)) return "m11";
  if (/^m9/.test(suffix)) return "m9";
  if (/^m7/.test(suffix)) return "m7";
  if (/^m6/.test(suffix)) return "m6";
  if (/^m/.test(suffix)) return "m";
  if (/^(dim7|o7)/.test(suffix)) return "o7";
  if (/^(dim|°|o)/.test(suffix)) return "dim7";
  if (/sus/i.test(suffix)) return /^7|^9|^13/.test(suffix) ? "7sus4" : "sus4";
  if (/^13/.test(suffix)) return "13";
  if (/^9/.test(suffix)) return "9";
  if (/^7/.test(suffix)) return "7";
  if (/^6/.test(suffix)) return "6";
  return "";
}

function normalizeDisplaySuffix(rawSuffix) {
  const suffix = String(rawSuffix || "").trim();
  if (!suffix) return "";

  return suffix
    .replace(/^M9/, "Δ9")
    .replace(/^M7/, "Δ7")
    .replace(/^m7b5/, "-7b5")
    .replace(/^m11/, "-11")
    .replace(/^m9/, "-9")
    .replace(/^m7M/, "-Δ7")
    .replace(/^m7/, "-7")
    .replace(/^m69/, "-6/9")
    .replace(/^m6/, "-6")
    .replace(/^m\+/, "-+")
    .replace(/^(dim|°|o)7?$/, (match) => (match.endsWith("7") ? "o7" : "o"))
    .replace(/^m/, "-");
}

function normalizeChordEventSymbol(rawSymbol) {
  const symbol = String(rawSymbol || "").trim().replace(/♭/g, "b").replace(/♯/g, "#");
  const match = /^([A-G](?:#|b)?)(.*)$/.exec(symbol);
  if (!match) return { display: symbol, load: symbol };

  const [, root, rawSuffix] = match;
  const { suffix, bass } = splitBassSuffix(rawSuffix);
  const exact = EXACT_SUFFIX_MAP[suffix];
  const displaySuffix = exact?.displaySuffix || normalizeDisplaySuffix(suffix);
  const loadSuffix = exact?.loadSuffix ?? inferFallbackLoadSuffix(suffix);
  const bassSuffix = bass ? `/${bass}` : "";

  return {
    display: `${root}${displaySuffix}${bassSuffix}`,
    load: `${root}${loadSuffix}`,
  };
}

const KIND_TEXT_BY_VALUE = Object.freeze({
  "major-seventh": "M7",
  dominant: "7",
  "minor-sixth": "m6",
  "minor-seventh": "m7",
  "half-diminished": "m7b5",
  "minor-ninth": "m9",
  diminished: "°",
});

function noteNameFromStepAlter(step, alterRaw) {
  const alter = Number.parseInt(String(alterRaw || "0").trim(), 10);
  const suffix = Number.isFinite(alter)
    ? alter > 0
      ? "#".repeat(alter)
      : "b".repeat(Math.abs(alter))
    : "";
  return `${String(step || "").trim()}${suffix}`;
}

function decodeXmlText(rawValue) {
  return String(rawValue || "")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number.parseInt(value, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text, pattern) {
  const match = pattern.exec(text);
  return match ? decodeXmlText(match[1]) : "";
}

function collectMatches(text, pattern) {
  return [...String(text || "").matchAll(pattern)]
    .map((match) => decodeXmlText(match[1]))
    .filter(Boolean);
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

const KEY_NAME_BY_MODE_AND_FIFTHS = Object.freeze({
  major: Object.freeze({
    "-7": "Cb",
    "-6": "Gb",
    "-5": "Db",
    "-4": "Ab",
    "-3": "Eb",
    "-2": "Bb",
    "-1": "F",
    0: "C",
    1: "G",
    2: "D",
    3: "A",
    4: "E",
    5: "B",
    6: "F#",
    7: "C#",
  }),
  minor: Object.freeze({
    "-7": "Abm",
    "-6": "Ebm",
    "-5": "Bbm",
    "-4": "Fm",
    "-3": "Cm",
    "-2": "Gm",
    "-1": "Dm",
    0: "Am",
    1: "Em",
    2: "Bm",
    3: "F#m",
    4: "C#m",
    5: "G#m",
    6: "D#m",
    7: "A#m",
  }),
});

function extractDefaultKey(rawXml) {
  const match = /<key\b[^>]*>[\s\S]*?<fifths>(-?\d+)<\/fifths>[\s\S]*?<mode>([^<]+)<\/mode>[\s\S]*?<\/key>/.exec(String(rawXml || ""));
  if (!match) return "";

  const fifths = Number.parseInt(match[1], 10);
  const mode = String(match[2] || "").trim().toLowerCase();
  if (!Number.isFinite(fifths)) return "";

  const modeMap = KEY_NAME_BY_MODE_AND_FIFTHS[mode] || KEY_NAME_BY_MODE_AND_FIFTHS.major;
  return String(modeMap[fifths] || "").trim();
}

function extractMusicXmlMetadata(rawXml, { id = "", title = "", composers = [] } = {}) {
  const xmlTitle = firstMatch(rawXml, /<work-title>([^<]+)<\/work-title>/)
    || firstMatch(rawXml, /<movement-title>([^<]+)<\/movement-title>/);
  const xmlComposers = collectMatches(rawXml, /<creator\b[^>]*type="composer"[^>]*>([^<]+)<\/creator>/g);

  return {
    id: String(id || "").trim(),
    title: String(title || xmlTitle || "").trim(),
    composers: uniqueStrings([...(Array.isArray(composers) ? composers : []), ...xmlComposers]),
  };
}

function parseEndingNumbers(rawValue) {
  return String(rawValue || "")
    .split(/[,\s]+/)
    .map((value) => Number.parseInt(value, 10))
    .filter(Number.isFinite);
}

function compactBarList(bars) {
  const values = [...new Set((Array.isArray(bars) ? bars : []).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!values.length) return "";
  const ranges = [];
  let start = values[0];
  let prev = values[0];

  for (let idx = 1; idx < values.length; idx += 1) {
    const value = values[idx];
    if (value === prev + 1) {
      prev = value;
      continue;
    }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    start = value;
    prev = value;
  }

  ranges.push(start === prev ? String(start) : `${start}-${prev}`);
  return ranges.join(", ");
}

function formatPassLabel(currentPass, totalPasses) {
  if (!Number.isFinite(currentPass) || currentPass <= 0 || !Number.isFinite(totalPasses) || totalPasses <= 1) return "";
  return `${currentPass}ª vuelta`;
}

function formatSectionLabel(baseLabel, currentPass, totalPasses) {
  const base = String(baseLabel || "Sección").trim() || "Sección";
  const passLabel = formatPassLabel(currentPass, totalPasses);
  return passLabel ? `${base} · ${passLabel}` : base;
}

function splitSectionLabel(label) {
  const parts = String(label || "")
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean);
  const base = parts[0] || "Sección";
  return {
    base,
    qualifier: parts.slice(1).join(" · "),
  };
}

function summarizeFormLabels(sectionLabels) {
  const labels = (Array.isArray(sectionLabels) ? sectionLabels : [])
    .map((label) => String(label || "").trim())
    .filter(Boolean);
  const summary = [];

  for (let idx = 0; idx < labels.length; ) {
    const first = splitSectionLabel(labels[idx]);
    const group = [first];
    idx += 1;

    while (idx < labels.length) {
      const next = splitSectionLabel(labels[idx]);
      if (next.base !== first.base) break;
      group.push(next);
      idx += 1;
    }

    if (group.length === 1) {
      summary.push(first.qualifier ? `${first.base} (${first.qualifier})` : first.base);
      continue;
    }

    const qualifiers = Array.from(new Set(group.map((item) => item.qualifier).filter(Boolean)));
    const plainCount = group.length - group.filter((item) => item.qualifier).length;

    if (!qualifiers.length) {
      summary.push(`${first.base}×${group.length}`);
      continue;
    }

    summary.push(`${first.base} (${qualifiers.join(" / ")})`);
    if (plainCount === 1) summary.push(first.base);
    else if (plainCount > 1) summary.push(`${first.base}×${plainCount}`);
  }

  return summary.join(" · ");
}

function buildPhrasesFromSections(sections) {
  return (Array.isArray(sections) ? sections : []).flatMap((section) => {
    const measures = Array.isArray(section?.measures) ? section.measures : [];
    const phrases = [];

    for (let idx = 0; idx < measures.length; idx += 4) {
      const slice = measures.slice(idx, idx + 4);
      if (!slice.length) continue;
      phrases.push({
        section: section.label,
        bars: compactBarList(slice.map((measure) => Number.parseInt(String(measure.bar), 10))),
        label: `Tramo ${Math.floor(idx / 4) + 1}`,
        measures: slice.map((measure) => ({
          bar: measure.bar,
          repeat: !!measure.repeat,
          chordEvents: measure.chordEvents,
          chords: measure.chords,
        })),
      });
    }

    return phrases;
  });
}

function dedupeChordEvents(events) {
  return (Array.isArray(events) ? events : []).filter((event, idx, list) => {
    if (!event?.display || !event?.load) return false;
    if (idx === 0) return true;
    const prev = list[idx - 1];
    return prev.display !== event.display || prev.load !== event.load;
  });
}

function parseHarmonySymbol(block) {
  const rootStep = firstMatch(block, /<root-step>([^<]+)<\/root-step>/);
  if (!rootStep) return null;
  const rootAlter = firstMatch(block, /<root-alter>([^<]+)<\/root-alter>/);
  const root = noteNameFromStepAlter(rootStep, rootAlter);
  const kindText = firstMatch(block, /<kind\b[^>]*text="([^"]*)"/);
  const kindValue = firstMatch(block, /<kind\b[^>]*>([^<]+)<\/kind>/);
  const suffix = kindText || KIND_TEXT_BY_VALUE[kindValue] || "";
  const bassStep = firstMatch(block, /<bass-step>([^<]+)<\/bass-step>/);
  const bassAlter = firstMatch(block, /<bass-alter>([^<]+)<\/bass-alter>/);
  const bass = bassStep ? `/${noteNameFromStepAlter(bassStep, bassAlter)}` : "";
  return `${root}${suffix}${bass}`;
}

function parseMeasures(rawXml) {
  const measureMatches = [...String(rawXml || "").matchAll(/<measure\b[^>]*number="([^"]+)"[^>]*>([\s\S]*?)<\/measure>/g)];
  const measures = [];
  let currentSectionLabel = "A";
  let activeEndingNumbers = null;

  for (const match of measureMatches) {
    const [, numberRaw, block] = match;
    const rehearsal = firstMatch(block, /<rehearsal>([^<]+)<\/rehearsal>/);
    const hasCoda = /<coda\/>/.test(block);
    const words = [...block.matchAll(/<words>([^<]+)<\/words>/g)].map((item) => String(item[1] || "").trim()).filter(Boolean);
    const hasFine = /<sound\b[^>]*fine="yes"/.test(block) || words.some((word) => /fine/i.test(word));

    if (rehearsal) currentSectionLabel = rehearsal;
    else if (hasCoda) currentSectionLabel = "Coda";

    const startingEndingNumbers = parseEndingNumbers(firstMatch(block, /<barline\b[^>]*location="left"[\s\S]*?<ending\b[^>]*number="([^"]+)"[^>]*type="start"/));
    if (startingEndingNumbers.length) activeEndingNumbers = startingEndingNumbers;

    const harmonyBlocks = [...block.matchAll(/<harmony\b[\s\S]*?<\/harmony>/g)];
    const chordEvents = dedupeChordEvents(
      harmonyBlocks
        .map((harmonyMatch) => parseHarmonySymbol(harmonyMatch[0]))
        .filter(Boolean)
        .map((symbol) => normalizeChordEventSymbol(symbol))
    );

    const repeatBackwardMatch = /<repeat\b[^>]*direction="backward"[^>]*(?:times="(\d+)")?/.exec(block);
    const repeatBackwardTimes = repeatBackwardMatch && repeatBackwardMatch[1]
      ? Number.parseInt(repeatBackwardMatch[1], 10)
      : null;

    const measure = {
      sourceNumber: String(numberRaw || "").trim(),
      bar: Number.parseInt(String(numberRaw || "").trim(), 10),
      sectionLabel: hasFine ? "Final" : currentSectionLabel,
      timeSignature: firstMatch(block, /<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>/) ? "" : "",
      chordEvents,
      words,
      endingNumbers: activeEndingNumbers ? [...activeEndingNumbers] : null,
      repeatStart: /<repeat\b[^>]*direction="forward"/.test(block),
      repeatBackwardTimes: Number.isFinite(repeatBackwardTimes) ? repeatBackwardTimes : null,
      hasRepeatEnd: /<repeat\b[^>]*direction="backward"/.test(block),
    };

    measures.push(measure);

    if (/<barline\b[^>]*location="right"[\s\S]*?<ending\b[^>]*type="(?:stop|discontinue)"/.test(block)) {
      activeEndingNumbers = null;
    }
  }

  return measures.filter((measure) => measure.chordEvents.length);
}

function buildRepeatBlocks(measures) {
  const stack = [];
  const blocksByStart = new Map();

  for (let idx = 0; idx < measures.length; idx += 1) {
    if (measures[idx].repeatStart) stack.push(idx);
    if (!measures[idx].hasRepeatEnd) continue;

    const startIdx = stack.length ? stack.pop() : 0;
    let sawEnding = false;
    let maxEndingNumber = null;

    for (let scanIdx = startIdx; scanIdx < measures.length; scanIdx += 1) {
      const endingNumbers = measures[scanIdx].endingNumbers || [];
      if (endingNumbers.length) {
        sawEnding = true;
        const localMax = Math.max(...endingNumbers);
        maxEndingNumber = maxEndingNumber == null ? localMax : Math.max(maxEndingNumber, localMax);
        continue;
      }
      if (sawEnding && scanIdx > idx) break;
    }

    let wordsPasses = null;
    for (let scanIdx = startIdx; scanIdx <= idx; scanIdx += 1) {
      for (const word of measures[scanIdx].words || []) {
        const passMatch = /(\d+)\s*[xX]/.exec(word);
        if (!passMatch) continue;
        const value = Number.parseInt(passMatch[1], 10);
        if (Number.isFinite(value) && value > 1) {
          wordsPasses = value;
        }
      }
    }

    const totalPasses = Number.isFinite(maxEndingNumber) && maxEndingNumber > 1
      ? maxEndingNumber
      : Number.isFinite(wordsPasses) && wordsPasses > 1
        ? wordsPasses
        : Number.isFinite(measures[idx].repeatBackwardTimes) && measures[idx].repeatBackwardTimes > 0
          ? measures[idx].repeatBackwardTimes + 1
          : 2;

    blocksByStart.set(startIdx, {
      startIdx,
      endIdx: idx,
      totalPasses,
      hasEndings: Number.isFinite(maxEndingNumber) && maxEndingNumber > 1,
    });
  }

  return blocksByStart;
}

function expandPlaybackMeasures(rawMeasures) {
  const measures = Array.isArray(rawMeasures) ? rawMeasures : [];
  const repeatBlocksByStart = buildRepeatBlocks(measures);
  const activeRepeatStack = [];
  let postRepeatContext = null;
  let idx = 0;
  let guard = 0;
  const output = [];

  while (idx >= 0 && idx < measures.length && guard < 10000) {
    guard += 1;
    const measure = measures[idx];
    const startingBlock = repeatBlocksByStart.get(idx);
    const activeTop = activeRepeatStack[activeRepeatStack.length - 1] || null;

    if (startingBlock && (!activeTop || activeTop.startIdx !== startingBlock.startIdx || activeTop.endIdx !== startingBlock.endIdx)) {
      activeRepeatStack.push({ ...startingBlock, currentPass: 1, sectionLabel: measure.sectionLabel });
    }

    if (postRepeatContext && measure.sectionLabel !== postRepeatContext.sectionLabel) {
      postRepeatContext = null;
    }

    const effectiveContext = activeRepeatStack[activeRepeatStack.length - 1] || postRepeatContext;
    const shouldPlayEnding = !measure.endingNumbers?.length
      || !effectiveContext
      || measure.endingNumbers.includes(effectiveContext.currentPass);

    if (shouldPlayEnding) {
      output.push({
        ...measure,
        playbackSectionLabel: formatSectionLabel(measure.sectionLabel, effectiveContext?.currentPass || null, effectiveContext?.totalPasses || null),
        playbackSectionBaseLabel: measure.sectionLabel,
      });
    }

    const activeBlock = activeRepeatStack[activeRepeatStack.length - 1] || null;
    if (activeBlock && activeBlock.endIdx === idx) {
      if (activeBlock.currentPass < activeBlock.totalPasses) {
        activeBlock.currentPass += 1;
        idx = activeBlock.startIdx;
        continue;
      }

      const finishedBlock = activeRepeatStack.pop();
      postRepeatContext = finishedBlock.hasEndings
        ? { ...finishedBlock, sectionLabel: measure.sectionLabel }
        : null;
      idx += 1;
      continue;
    }

    idx += 1;
  }

  return output;
}

function buildSectionsFromPlayback(playbackMeasures) {
  const sections = [];
  let current = null;

  for (const measure of Array.isArray(playbackMeasures) ? playbackMeasures : []) {
    if (!current || current.label !== measure.playbackSectionLabel) {
      if (current) sections.push(current);
      current = {
        id: `section-${sections.length + 1}`,
        label: measure.playbackSectionLabel,
        baseLabel: measure.playbackSectionBaseLabel,
        bars: "",
        timeSignature: "FOUR_FOUR",
        measures: [],
      };
    }

    current.measures.push({
      bar: measure.bar,
      chords: measure.chordEvents.map((event) => event.display),
      chordEvents: measure.chordEvents,
      repeat: false,
    });
  }

  if (current) sections.push(current);

  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    bars: compactBarList(section.measures.map((measure) => Number.parseInt(String(measure.bar), 10))),
    timeSignature: section.timeSignature,
    measures: section.measures,
  }));
}

export function parseMusicXmlStandard(rawXml, { id = "", title = "", composers = [] } = {}) {
  const metadata = extractMusicXmlMetadata(rawXml, { id, title, composers });
  const defaultKey = extractDefaultKey(rawXml);
  const measures = parseMeasures(rawXml);
  if (!measures.length) throw new Error("No encuentro compases utilizables en el MusicXML.");

  const playbackMeasures = expandPlaybackMeasures(measures);
  if (!playbackMeasures.length) throw new Error("No pude expandir las repeticiones del MusicXML.");

  const sections = buildSectionsFromPlayback(playbackMeasures);
  const formSummary = summarizeFormLabels(sections.map((section) => section.label));

  return {
    id: metadata.id,
    title: metadata.title,
    composers: metadata.composers,
    defaultKey,
    form: `${formSummary || "Roadmap"} · ${playbackMeasures.length} compases`,
    realForm: {
      sections,
    },
    phrases: buildPhrasesFromSections(sections),
  };
}
