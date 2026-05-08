function normalizeTitleFromSlug(slug) {
  return String(slug || "")
    .replace(/\.sng$/i, "")
    .split(/[-_]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  if (/^dim7/.test(suffix)) return "o7";
  if (/^dim/.test(suffix)) return "dim7";
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

function dedupeChordEvents(events) {
  return (Array.isArray(events) ? events : []).filter((event, idx, list) => {
    if (!event?.display || !event?.load) return false;
    if (idx === 0) return true;
    const prev = list[idx - 1];
    return prev.display !== event.display || prev.load !== event.load;
  });
}

function normalizeRepeatedMeasures(measures) {
  return (Array.isArray(measures) ? measures : []).map((measure, idx) => {
    if (idx === 0) return { ...measure, repeat: false };
    const prev = measures[idx - 1];
    const sameLength = prev.chordEvents.length === measure.chordEvents.length;
    const sameEvents = sameLength && prev.chordEvents.every((event, eventIdx) => {
      const next = measure.chordEvents[eventIdx];
      return next && next.display === event.display && next.load === event.load;
    });
    return {
      ...measure,
      repeat: sameEvents,
    };
  });
}

function buildPhrasesFromSections(sections) {
  return (Array.isArray(sections) ? sections : []).flatMap((section) => {
    const measures = Array.isArray(section?.measures) ? section.measures : [];
    const chunks = [];

    for (let idx = 0; idx < measures.length; idx += 4) {
      const slice = measures.slice(idx, idx + 4);
      if (!slice.length) continue;
      const firstBar = slice[0].bar;
      const lastBar = slice[slice.length - 1].bar;
      chunks.push({
        section: section.label,
        bars: `${firstBar}-${lastBar}`,
        label: `Tramo ${Math.floor(idx / 4) + 1}`,
        measures: slice.map((measure) => ({
          bar: measure.bar,
          repeat: measure.repeat,
          chordEvents: measure.chordEvents,
          chords: measure.chords,
        })),
      });
    }

    return chunks;
  });
}

function extractSections(raw) {
  return [...String(raw || "").matchAll(/<CLI__SectionImpl[^>]*\sspName="([^"]*)"[^>]*\sspTs="([^"]*)"[^>]*\sspBarIndex="(\d+)"/g)]
    .map((match, idx) => ({
      id: `section-${idx + 1}`,
      label: String(match[1] || "").trim() || `Sección ${idx + 1}`,
      timeSignature: String(match[2] || "").trim(),
      barIndex: parseInt(match[3], 10),
    }))
    .filter((section) => Number.isFinite(section.barIndex))
    .sort((a, b) => a.barIndex - b.barIndex);
}

function extractChordEvents(raw) {
  return [...String(raw || "").matchAll(/<CLI__ChordSymbolImpl[\s\S]*?<\/CLI__ChordSymbolImpl>/g)]
    .map((blockMatch) => {
      const block = blockMatch[0];
      const chordMatch = /<spChord[^>]*\sspName="([^"]+)"/.exec(block);
      const posMatch = /<spPos[^>]*\sspPos="\[(\d+):(\d+)\]"/.exec(block);
      if (!chordMatch || !posMatch) return null;
      return {
        symbol: chordMatch[1],
        barIndex: parseInt(posMatch[1], 10),
        beatIndex: parseInt(posMatch[2], 10),
      };
    })
    .filter(Boolean)
    .filter((event) => Number.isFinite(event.barIndex) && Number.isFinite(event.beatIndex))
    .sort((a, b) => a.barIndex - b.barIndex || a.beatIndex - b.beatIndex);
}

function buildSectionsFromSong(raw) {
  const sections = extractSections(raw);
  const chordEvents = extractChordEvents(raw);
  if (!chordEvents.length) throw new Error("No encuentro símbolos de acorde utilizables en el fichero de JJazzLab.");

  const resolvedSections = sections.length
    ? sections
    : [{ id: "section-1", label: "A", timeSignature: "FOUR_FOUR", barIndex: chordEvents[0].barIndex }];
  const lastBarIndex = chordEvents[chordEvents.length - 1].barIndex;
  const chordEventsByBar = chordEvents.reduce((map, event) => {
    const current = map.get(event.barIndex) || [];
    current.push(normalizeChordEventSymbol(event.symbol));
    map.set(event.barIndex, current);
    return map;
  }, new Map());

  return resolvedSections
    .map((section, idx) => {
      const nextSection = resolvedSections[idx + 1] || null;
      const endBarIndex = nextSection ? nextSection.barIndex - 1 : lastBarIndex;
      const measures = [];
      let previousChordEvents = [];

      for (let barIndex = section.barIndex; barIndex <= endBarIndex; barIndex += 1) {
        const explicitChordEvents = dedupeChordEvents(chordEventsByBar.get(barIndex) || []);
        const chordEventsForBar = explicitChordEvents.length ? explicitChordEvents : previousChordEvents;
        if (!chordEventsForBar.length) continue;
        previousChordEvents = chordEventsForBar;
        measures.push({
          bar: barIndex + 1,
          chords: chordEventsForBar.map((event) => event.display),
          chordEvents: chordEventsForBar,
        });
      }

      if (!measures.length) return null;
      const normalizedMeasures = normalizeRepeatedMeasures(measures);
      const firstBar = normalizedMeasures[0].bar;
      const lastBar = normalizedMeasures[normalizedMeasures.length - 1].bar;
      return {
        id: section.id,
        label: section.label,
        bars: `${firstBar}-${lastBar}`,
        timeSignature: section.timeSignature,
        measures: normalizedMeasures,
      };
    })
    .filter(Boolean);
}

export function parseJJazzLabStandard(raw, { id = "", titleFallback = "" } = {}) {
  const sections = buildSectionsFromSong(raw);
  if (!sections.length) throw new Error("No pude convertir el chart de JJazzLab a compases utilizables.");

  const totalMeasures = sections.reduce((sum, section) => sum + section.measures.length, 0);
  const formLabel = sections.map((section) => section.label).join("");
  const title = String(titleFallback || "").trim() || normalizeTitleFromSlug(id) || id;

  return {
    id,
    title,
    composers: [],
    year: null,
    defaultKey: "",
    form: `${formLabel || "Forma"} · ${totalMeasures} compases`,
    overview: "",
    realForm: {
      sections,
    },
    phrases: buildPhrasesFromSections(sections),
  };
}
