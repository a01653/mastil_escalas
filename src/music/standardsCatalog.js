import { noteNameToPc, preferSharpsFromMajorTonicPc } from "./chordDetectionEngine.js";

const DEFAULT_TERTIAN_SLOT = Object.freeze({
  family: "tertian",
  quality: "maj",
  suspension: "none",
  structure: "triad",
  inversion: "all",
  form: "open",
  positionForm: "open",
  ext7: false,
  ext6: false,
  ext9: false,
  ext11: false,
  ext13: false,
  maxDist: 4,
  allowOpenStrings: false,
  selFrets: null,
});

const CHORD_SUFFIX_TEMPLATES = Object.freeze({
  "": { quality: "maj", structure: "triad" },
  "6": { quality: "maj", structure: "tetrad", ext6: true },
  "maj7": { quality: "maj", structure: "tetrad", ext7: true },
  "7": { quality: "dom", structure: "tetrad", ext7: true },
  "9": { quality: "dom", structure: "chord", ext7: true, ext9: true },
  "13": { quality: "dom", structure: "chord", ext7: true, ext9: true, ext13: true },
  "m": { quality: "min", structure: "triad" },
  "m6": { quality: "min", structure: "tetrad", ext6: true },
  "m7": { quality: "min", structure: "tetrad", ext7: true },
  "m9": { quality: "min", structure: "chord", ext7: true, ext9: true },
  "m11": { quality: "min", structure: "chord", ext7: true, ext11: true },
  "m7b5": { quality: "hdim", structure: "tetrad", ext7: true },
  "dim7": { quality: "dim", structure: "tetrad", ext7: true },
  "sus4": { quality: "maj", suspension: "sus4", structure: "triad" },
  "7sus4": { quality: "dom", suspension: "sus4", structure: "tetrad", ext7: true },
});

const CHORD_SUFFIX_ALIASES = Object.freeze({
  maj6: "6",
  "Δ": "maj7",
  "Δ7": "maj7",
  "△": "maj7",
  "△7": "maj7",
  min: "m",
  min6: "m6",
  min7: "m7",
  min9: "m9",
  min11: "m11",
  "-": "m",
  "-6": "m6",
  "-7": "m7",
  "-9": "m9",
  "-11": "m11",
  "ø7": "m7b5",
  o7: "dim7",
});

function normalizeChordSuffix(rawSuffix) {
  const suffix = String(rawSuffix || "").trim();
  return CHORD_SUFFIX_ALIASES[suffix] || suffix;
}

export function parseStandardChordSymbol(symbol) {
  const raw = String(symbol || "").trim();
  if (!raw) throw new Error("Símbolo vacío.");

  const match = raw.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) throw new Error(`No reconozco la raíz de ${raw}.`);

  const [, rootName, rawSuffix] = match;
  const rootPc = noteNameToPc(rootName);
  if (rootPc == null) throw new Error(`No reconozco la nota ${rootName}.`);

  const suffix = normalizeChordSuffix(rawSuffix);
  const template = CHORD_SUFFIX_TEMPLATES[suffix];
  if (!template) throw new Error(`Aún no sé traducir ${raw} a la lógica interna de la app.`);

  const spellPreferSharps = rootName.includes("#")
    ? true
    : rootName.includes("b")
      ? false
      : preferSharpsFromMajorTonicPc(rootPc);

  return {
    symbol: raw,
    rootName,
    rootPc,
    spellPreferSharps,
    ...DEFAULT_TERTIAN_SLOT,
    ...template,
  };
}

export function buildNearSlotFromChordSymbol(symbol) {
  const parsed = parseStandardChordSymbol(symbol);
  return {
    enabled: true,
    family: parsed.family,
    rootPc: parsed.rootPc,
    quality: parsed.quality,
    suspension: parsed.suspension,
    structure: parsed.structure,
    inversion: parsed.inversion,
    form: parsed.form,
    positionForm: parsed.positionForm,
    ext7: parsed.ext7,
    ext6: parsed.ext6,
    ext9: parsed.ext9,
    ext11: parsed.ext11,
    ext13: parsed.ext13,
    quartalType: "pure",
    quartalVoices: "4",
    quartalSpread: "closed",
    quartalReference: "root",
    quartalScaleName: "Mayor",
    guideToneQuality: "maj7",
    guideToneForm: "closed",
    guideToneInversion: "all",
    spellPreferSharps: parsed.spellPreferSharps,
    maxDist: parsed.maxDist,
    allowOpenStrings: parsed.allowOpenStrings,
    selFrets: null,
  };
}

export function buildNearSlotsFromChordSymbols(symbols, maxSlots = 4) {
  return (Array.isArray(symbols) ? symbols : [])
    .slice(0, Math.max(1, maxSlots))
    .map((symbol) => buildNearSlotFromChordSymbol(symbol));
}

function buildMeasureBarLabel(barValue, fallbackIndex) {
  const raw = String(barValue ?? "").trim();
  if (!raw) return `Compás ${fallbackIndex + 1}`;
  if (/^\d+$/.test(raw)) return `Compás ${raw}`;
  return `Compás ${raw}`;
}

export function getStandardPhraseMeasures(phrase) {
  const measures = Array.isArray(phrase?.measures) ? phrase.measures : null;
  if (measures?.length) {
    let previousChords = [];
    return measures
      .map((measure, idx) => {
        const explicitChords = Array.isArray(measure?.chords)
          ? measure.chords.filter(Boolean)
          : measure?.chord
            ? [measure.chord]
            : [];
        const chords = explicitChords.length
          ? explicitChords
          : measure?.repeat && previousChords.length
            ? previousChords
            : [];
        if (!chords.length) return null;
        previousChords = chords;
        const bar = measure?.bar ?? null;
        return {
          bar,
          barLabel: buildMeasureBarLabel(bar, idx),
          chords,
        };
      })
      .filter(Boolean);
  }

  const legacyChords = Array.isArray(phrase?.chords) ? phrase.chords.filter(Boolean) : [];
  const rawBars = String(phrase?.bars || "").trim();
  const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(rawBars);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    return legacyChords.map((symbol, idx) => ({
      bar: start + idx,
      barLabel: `Compás ${start + idx}`,
      chords: [symbol],
    }));
  }

  const singleMatch = /^(\d+)$/.exec(rawBars);
  if (singleMatch) {
    return legacyChords.map((symbol) => ({
      bar: parseInt(singleMatch[1], 10),
      barLabel: `Compás ${singleMatch[1]}`,
      chords: [symbol],
    }));
  }

  return legacyChords.map((symbol, idx) => ({
    bar: null,
    barLabel: `Compás ${idx + 1}`,
    chords: [symbol],
  }));
}

export function flattenStandardPhraseChordSymbols(phrase, maxSymbols = Infinity) {
  return getStandardPhraseMeasures(phrase)
    .flatMap((measure) => measure.chords)
    .slice(0, Math.max(1, Number.isFinite(maxSymbols) ? maxSymbols : Infinity));
}

export function getStandardRealChartSections(standard) {
  const sections = Array.isArray(standard?.realForm?.sections) ? standard.realForm.sections : [];

  return sections
    .map((section, sectionIdx) => {
      let previousChords = [];
      const measures = (Array.isArray(section?.measures) ? section.measures : [])
        .map((measure, measureIdx) => {
          const explicitChordEvents = Array.isArray(measure?.chordEvents)
            ? measure.chordEvents.filter((event) => event?.display || event?.load).map((event) => ({
              display: String(event.display || event.load || "").trim(),
              load: String(event.load || event.display || "").trim(),
            })).filter((event) => event.display && event.load)
            : [];
          const explicitChords = explicitChordEvents.length
            ? explicitChordEvents.map((event) => event.display)
            : Array.isArray(measure?.chords)
              ? measure.chords.filter(Boolean)
              : measure?.chord
                ? [measure.chord]
                : [];
          const repeat = !!measure?.repeat;
          const resolvedChords = explicitChords.length
            ? explicitChords
            : repeat && previousChords.length
              ? previousChords
              : [];
          const resolvedChordEvents = explicitChordEvents.length
            ? explicitChordEvents
            : resolvedChords.map((symbol) => ({ display: symbol, load: symbol }));

          if (!resolvedChords.length) return null;
          previousChords = resolvedChords;

          return {
            bar: measure?.bar ?? null,
            barLabel: buildMeasureBarLabel(measure?.bar, measureIdx),
            chords: resolvedChords,
            chordEvents: resolvedChordEvents,
            repeat,
          };
        })
        .filter(Boolean);

      if (!measures.length) return null;

      return {
        id: section?.id || `${section?.label || "section"}-${sectionIdx}`,
        label: String(section?.label || `Sección ${sectionIdx + 1}`),
        bars: String(section?.bars || "").trim(),
        measures,
      };
    })
    .filter(Boolean);
}
