import { noteNameToPc, preferSharpsFromMajorTonicPc } from "./chordDetectionEngine.js";
import { normalizeChordAlterations } from "./chordAlterations.js";

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

// Gramática única de cifrados de standards (JJazzLab / MusicXML / símbolos
// legacy). Cada base fija calidad, estructura y extensiones; detrás pueden ir
// alteraciones de quinta/novena (b5, #5, b9, #9) con o sin paréntesis. Lo que la
// app no puede construir (#11, b13, alt, dos novenas, alteraciones fuera de la
// política del selector...) NO se simplifica: el símbolo se rechaza con aviso.
const CHORD_SUFFIX_BASES = Object.freeze([
  ["m(maj9)", { quality: "minmaj7", structure: "chord", ext7: true, ext9: true }],
  ["m(maj7)", { quality: "minmaj7", structure: "tetrad", ext7: true }],
  ["mmaj9", { quality: "minmaj7", structure: "chord", ext7: true, ext9: true }],
  ["mmaj7", { quality: "minmaj7", structure: "tetrad", ext7: true }],
  ["m7b5", { quality: "hdim", structure: "tetrad", ext7: true }],
  ["m9b5", { quality: "hdim", structure: "chord", ext7: true, ext9: true }],
  ["m13", { quality: "min", structure: "chord", ext7: true, ext9: true, ext13: true }],
  ["m11", { quality: "min", structure: "chord", ext7: true, ext9: true, ext11: true }],
  ["m9", { quality: "min", structure: "chord", ext7: true, ext9: true }],
  ["m7", { quality: "min", structure: "tetrad", ext7: true }],
  ["m69", { quality: "min", structure: "chord", ext6: true, ext9: true }],
  ["m6", { quality: "min", structure: "tetrad", ext6: true }],
  ["madd9", { quality: "min", structure: "chord", ext9: true }],
  ["m", { quality: "min", structure: "triad" }],
  ["maj13", { quality: "maj", structure: "chord", ext7: true, ext9: true, ext13: true }],
  ["maj9", { quality: "maj", structure: "chord", ext7: true, ext9: true }],
  ["maj7", { quality: "maj", structure: "tetrad", ext7: true }],
  ["dim7", { quality: "dim", structure: "tetrad", ext7: true }],
  ["dim", { quality: "dim", structure: "triad" }],
  ["aug", { quality: "maj", structure: "triad", fifth: "#5" }],
  ["13sus4", { quality: "dom", suspension: "sus4", structure: "chord", ext7: true, ext9: true, ext13: true }],
  ["9sus4", { quality: "dom", suspension: "sus4", structure: "chord", ext7: true, ext9: true }],
  ["7sus4", { quality: "dom", suspension: "sus4", structure: "tetrad", ext7: true }],
  ["7sus2", { quality: "dom", suspension: "sus2", structure: "tetrad", ext7: true }],
  ["sus4", { quality: "maj", suspension: "sus4", structure: "triad" }],
  ["sus2", { quality: "maj", suspension: "sus2", structure: "triad" }],
  ["13", { quality: "dom", structure: "chord", ext7: true, ext9: true, ext13: true }],
  ["11", { quality: "dom", structure: "chord", ext7: true, ext9: true, ext11: true }],
  ["9", { quality: "dom", structure: "chord", ext7: true, ext9: true }],
  ["7", { quality: "dom", structure: "tetrad", ext7: true }],
  ["69", { quality: "maj", structure: "chord", ext6: true, ext9: true }],
  ["6", { quality: "maj", structure: "tetrad", ext6: true }],
  ["add9", { quality: "maj", structure: "chord", ext9: true }],
  ["", { quality: "maj", structure: "triad" }],
]);

// Formas equivalentes → forma de la gramática. Se aplican en orden.
function normalizeChordSuffixAliases(rawSuffix) {
  let s = String(rawSuffix || "").trim().replace(/♭/g, "b").replace(/♯/g, "#").replace(/\s+/g, "");
  s = s
    .replace(/^(Δ|△)$/, "maj7")
    .replace(/^(Δ|△)/, "maj")
    .replace(/^-(?=Δ|△)/, "m")
    .replace(/^m(Δ|△|M)7?$/, "mmaj7")
    .replace(/^m7M$/, "mmaj7")
    .replace(/^m(Δ|△|M)7(?=[b#(])/, "mmaj7")
    .replace(/^m\+$/, "m#5")
    .replace(/^m(Δ|△|M)9$/, "mmaj9")
    .replace(/^min(?=$|[0-9(])/, "m")
    .replace(/^-/, "m")
    .replace(/^M$/, "")
    .replace(/^maj$/, "")
    .replace(/^M(?=[0-9])/, "maj")
    .replace(/^maj6$/, "6")
    .replace(/^ø7?$/, "m7b5")
    .replace(/^ø9$/, "m9b5")
    .replace(/^(°|o)7$/, "dim7")
    .replace(/^(°|o)$/, "dim")
    .replace(/^\+7/, "7#5")
    .replace(/^aug7/, "7#5")
    .replace(/^\+$/, "aug")
    .replace(/^(7|9|13)\+/, "$1#5")
    .replace(/^6\/9/, "69")
    .replace(/^m6\/9/, "m69")
    .replace(/^2$/, "add9")
    .replace(/^madd2$/, "madd9")
    .replace(/^(7|9|13)?sus(?!2|4)/, "$1sus4");
  return s;
}

const UNSUPPORTED_TOKEN_REASONS = Object.freeze([
  [/#11/, "♯11"],
  [/b13/, "♭13"],
  [/alt/, "alt"],
  [/(b9#9|#9b9)/, "♭9 y ♯9 a la vez"],
  // Con 3ª menor la ♯9 coincide con la ♭3: no añadiría ninguna nota.
  [/^(m(?!aj)|dim).*#9/, "♯9 sobre 3ª menor (coincide con la ♭3)"],
]);

// Traduce un sufijo de cifrado al estado del constructor, o null si no se
// puede construir exactamente (nunca se devuelve una versión simplificada).
export function parseStandardChordSuffix(rawSuffix) {
  const suffix = normalizeChordSuffixAliases(rawSuffix);
  for (const [base, template] of CHORD_SUFFIX_BASES) {
    if (!suffix.startsWith(base)) continue;
    const rest = suffix.slice(base.length).replace(/[(),]/g, "");
    const alterations = rest.match(/^(?:b5|#5|b9|#9)*$/) ? (rest.match(/b5|#5|b9|#9/g) || []) : null;
    if (alterations == null) continue;
    const fifths = alterations.filter((token) => token.endsWith("5"));
    const ninths = alterations.filter((token) => token.endsWith("9"));
    if (fifths.length > 1 || ninths.length > 1) return null;
    const spec = { ...DEFAULT_TERTIAN_SLOT, ...template };
    if (fifths.length && template.fifth && template.fifth !== fifths[0]) return null;
    const requestedFifth = fifths[0] ?? template.fifth ?? null;
    if (ninths.length) {
      if (!spec.ext7) return null;
      spec.ext9 = true;
      if (spec.structure === "tetrad") spec.structure = "chord";
    }
    // La política del selector decide qué alteraciones existen: si la normalización
    // cambiaría alguna pedida, el símbolo no es representable (no se carga otro acorde).
    const normalized = normalizeChordAlterations({ ...spec, fifth: requestedFifth ?? undefined, ninth: ninths[0] });
    if (requestedFifth && normalized.fifth !== requestedFifth) return null;
    if (ninths.length && normalized.ninth !== ninths[0]) return null;
    spec.fifth = normalized.fifth;
    spec.ninth = normalized.ninth;
    return spec;
  }
  return null;
}

export function describeUnsupportedChordSuffix(rawSuffix) {
  const suffix = normalizeChordSuffixAliases(rawSuffix);
  const reasons = UNSUPPORTED_TOKEN_REASONS.filter(([pattern]) => pattern.test(suffix)).map(([, label]) => label);
  return reasons.length ? `${reasons.join(", ")} aún no se puede construir en Acordes` : "";
}

export function parseStandardChordSymbol(symbol) {
  const raw = String(symbol || "").trim();
  if (!raw) throw new Error("Símbolo vacío.");

  const match = raw.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) throw new Error(`No reconozco la raíz de ${raw}.`);

  const [, rootName, rawSuffix] = match;
  const rootPc = noteNameToPc(rootName);
  if (rootPc == null) throw new Error(`No reconozco la nota ${rootName}.`);

  const template = parseStandardChordSuffix(rawSuffix);
  if (!template) {
    const reason = describeUnsupportedChordSuffix(rawSuffix);
    throw new Error(`Aún no sé traducir ${raw} a la lógica interna de la app${reason ? ` (${reason})` : ""}.`);
  }

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
    fifth: parsed.fifth,
    ninth: parsed.ninth,
    omit: "none",
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

// Variante tolerante para cargar una selección: cada símbolo se traduce por
// separado y los no soportados se devuelven con su motivo (slot = null), de
// modo que el resto se carga y la limitación se avisa sin sustituir el acorde.
export function resolveNearSlotsFromChordSymbols(symbols, maxSlots = 4) {
  return (Array.isArray(symbols) ? symbols : [])
    .slice(0, Math.max(1, maxSlots))
    .map((symbol) => {
      try {
        return { symbol, slot: buildNearSlotFromChordSymbol(symbol), error: null };
      } catch (error) {
        return { symbol, slot: null, error: String(error?.message || error) };
      }
    });
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
