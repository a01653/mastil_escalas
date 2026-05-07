function decodeQuotedValue(value) {
  return String(value || "")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, "\"")
    .trim();
}

function extractQuotedAttribute(raw, name) {
  const escapedName = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`attributes\\['${escapedName}'\\]\\s*=\\s*'((?:\\\\'|[^'])*)'`);
  const match = regex.exec(String(raw || ""));
  return match ? decodeQuotedValue(match[1]) : "";
}

function lilyRootToDisplay(rootToken) {
  const raw = String(rootToken || "").trim().toLowerCase();
  if (!raw) return "";
  const letter = raw[0].toUpperCase();
  if (raw.endsWith("is")) return `${letter}#`;
  if (raw.endsWith("es")) return `${letter}b`;
  return letter;
}

function normalizeLilySuffix(rawSuffix) {
  return String(rawSuffix || "")
    .trim()
    .replace(/^:/, "");
}

function splitLilySuffixAndBass(rawSuffix) {
  const suffix = normalizeLilySuffix(rawSuffix);
  const slashIdx = suffix.indexOf("/");
  if (slashIdx < 0) return { suffix, bass: "" };
  return {
    suffix: suffix.slice(0, slashIdx),
    bass: lilyRootToDisplay(suffix.slice(slashIdx + 1)),
  };
}

function lilySuffixToDisplayAndLoad(rawSuffix) {
  const { suffix, bass } = splitLilySuffixAndBass(rawSuffix);

  const mapped = (() => {
    switch (suffix) {
      case "":
        return { displaySuffix: "", loadSuffix: "" };
      case "maj":
        return { displaySuffix: "Δ", loadSuffix: "" };
      case "maj7":
        return { displaySuffix: "Δ7", loadSuffix: "Δ7" };
      case "6":
        return { displaySuffix: "6", loadSuffix: "6" };
      case "m":
        return { displaySuffix: "-", loadSuffix: "m" };
      case "m6":
        return { displaySuffix: "-6", loadSuffix: "m6" };
      case "m7":
        return { displaySuffix: "-7", loadSuffix: "m7" };
      case "m9":
        return { displaySuffix: "-9", loadSuffix: "m9" };
      case "m11":
        return { displaySuffix: "-11", loadSuffix: "m11" };
      case "m7.5-":
        return { displaySuffix: "-7b5", loadSuffix: "m7b5" };
      case "7":
        return { displaySuffix: "7", loadSuffix: "7" };
      case "9":
        return { displaySuffix: "9", loadSuffix: "9" };
      case "13":
        return { displaySuffix: "13", loadSuffix: "13" };
      case "7.9-":
        return { displaySuffix: "7b9", loadSuffix: "7" };
      case "7.5+":
        return { displaySuffix: "7#5", loadSuffix: "7" };
      case "7.5-":
        return { displaySuffix: "7b5", loadSuffix: "7" };
      case "7.9+":
        return { displaySuffix: "7#9", loadSuffix: "7" };
      case "dim":
        return { displaySuffix: "o", loadSuffix: "dim7" };
      case "dim7":
        return { displaySuffix: "o7", loadSuffix: "o7" };
      case "sus4":
        return { displaySuffix: "sus4", loadSuffix: "sus4" };
      case "7sus4":
        return { displaySuffix: "7sus4", loadSuffix: "7sus4" };
      default:
        return { displaySuffix: suffix, loadSuffix: suffix };
    }
  })();

  if (!bass) return mapped;
  return {
    displaySuffix: `${mapped.displaySuffix}/${bass}`,
    loadSuffix: mapped.loadSuffix,
  };
}

function parseDurationToken(rawDuration, fallbackDuration = 1) {
  const token = String(rawDuration || "").trim();
  if (!token) return fallbackDuration;
  const dotted = token.endsWith(".");
  const denominator = parseInt(dotted ? token.slice(0, -1) : token, 10);
  if (!Number.isFinite(denominator) || denominator <= 0) return fallbackDuration;
  const base = 1 / denominator;
  return dotted ? base * 1.5 : base;
}

function tokenizeChordBody(rawBody) {
  return String(rawBody || "")
    .replace(/%%.*$/gm, " ")
    .replace(/%.*$/gm, " ")
    .replace(/\\myEndLine\w*/g, " ")
    .replace(/\\(?:startChords|endChords|startSong|endSong|startPart|endPart|repeat|alternative|partial|LPC|RPC|OPC|COP|mySegno|myCoda|mark)\b/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\|/g, " | ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildMeasureFromEvents(events) {
  const chordEvents = events
    .map((event) => {
      const root = lilyRootToDisplay(event.root);
      if (!root) return null;
      const suffixes = lilySuffixToDisplayAndLoad(event.suffix);
      return {
        display: `${root}${suffixes.displaySuffix}`,
        load: `${root}${suffixes.loadSuffix}`,
      };
    })
    .filter(Boolean);

  const dedupedChordEvents = chordEvents.filter((event, idx) => {
    if (idx === 0) return true;
    const prev = chordEvents[idx - 1];
    return prev.display !== event.display || prev.load !== event.load;
  });

  return {
    chordEvents: dedupedChordEvents,
    chords: dedupedChordEvents.map((event) => event.display),
  };
}

function normalizeRepeatedMeasures(measures) {
  return measures.map((measure, idx) => {
    if (idx === 0) return { ...measure, repeat: false };
    const prev = measures[idx - 1];
    const sameLength = prev.chordEvents.length === measure.chordEvents.length;
    const sameEvents = sameLength && prev.chordEvents.every((event, eventIdx) => {
      const next = measure.chordEvents[eventIdx];
      return next && next.display === event.display && next.load === event.load;
    });
    return { ...measure, repeat: sameEvents };
  });
}

function parseChordSequenceToMeasures(rawBody) {
  const tokens = tokenizeChordBody(rawBody);
  const measures = [];
  let lastDuration = 1;
  let currentMeasureEvents = [];
  let currentMeasureFill = 0;

  const finalizeMeasure = () => {
    const measure = buildMeasureFromEvents(currentMeasureEvents);
    if (measure.chordEvents.length) measures.push(measure);
    currentMeasureEvents = [];
    currentMeasureFill = 0;
  };

  tokens.forEach((token) => {
    if (!token || token === "|") return;
    if (/^[sr](?:\d+(?:\.)?)?(?:\*\d+)?$/i.test(token)) {
      const spacerMatch = /^([sr])(\d+(?:\.)?)?(?:\*(\d+))?$/i.exec(token);
      if (spacerMatch?.[2]) lastDuration = parseDurationToken(spacerMatch[2], lastDuration);
      return;
    }

    const chordMatch = /^([a-g](?:is|es)?)(\d+(?:\.)?)?(?:\*(\d+))?(?::(.+))?$/i.exec(token);
    if (!chordMatch) return;

    const [, root, rawDuration, rawMultiplier, suffix = ""] = chordMatch;
    const duration = parseDurationToken(rawDuration, lastDuration);
    if (rawDuration) lastDuration = duration;
    const multiplier = Math.max(1, parseInt(rawMultiplier || "1", 10) || 1);
    let remaining = duration * multiplier;

    while (remaining > 1e-9) {
      const available = Math.max(0, 1 - currentMeasureFill);
      if (available <= 1e-9) {
        finalizeMeasure();
        continue;
      }
      const used = Math.min(available, remaining);
      currentMeasureEvents.push({ root, suffix });
      currentMeasureFill += used;
      remaining -= used;
      if (currentMeasureFill >= 1 - 1e-9) finalizeMeasure();
    }
  });

  if (currentMeasureEvents.length) finalizeMeasure();
  return normalizeRepeatedMeasures(measures);
}

function extractPartBlock(raw, partName) {
  const escaped = String(partName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`% if part=='${escaped}':([\\s\\S]*?)% endif`);
  const match = regex.exec(String(raw || ""));
  return match ? match[1] : "";
}

function countComplexity(text) {
  const body = String(text || "");
  return [
    /\\repeat\s+volta/g,
    /\\alternative/g,
    /\\repeatPercent/g,
    /\\unfoldRepeats/g,
  ].reduce((sum, regex) => sum + (body.match(regex) || []).length, 0);
}

export function chooseOpenbookChordPart(raw) {
  const candidates = ["ChordsFake", "ChordsReal"]
    .map((partName) => ({ partName, text: extractPartBlock(raw, partName) }))
    .filter((item) => item.text);

  if (!candidates.length) return null;

  return candidates
    .map((item) => ({ ...item, complexity: countComplexity(item.text) }))
    .sort((a, b) => a.complexity - b.complexity || a.partName.localeCompare(b.partName))[0];
}

function parseOpenbookSectionsFromChordBlock(rawBlock) {
  const lines = String(rawBlock || "").split(/\r?\n/);
  const sections = [];
  let activeLabel = "";
  let activeBuffer = [];
  let collecting = false;
  let globalBar = 1;

  const flush = () => {
    const body = activeBuffer.join(" ");
    activeBuffer = [];
    if (!body.trim()) return;
    const measures = parseChordSequenceToMeasures(body).map((measure, idx) => ({
      ...measure,
      bar: globalBar + idx,
    }));
    if (!measures.length) return;
    const firstBar = measures[0].bar;
    const lastBar = measures[measures.length - 1].bar;
    sections.push({
      id: `${activeLabel || "section"}-${sections.length + 1}`,
      label: activeLabel || `Sección ${sections.length + 1}`,
      bars: `${firstBar}-${lastBar}`,
      measures,
    });
    globalBar = lastBar + 1;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const markMatch = /\\myMark\s+"([^"]+)"/.exec(trimmed);
    if (markMatch) activeLabel = markMatch[1];
    if (/\\startPart\b/.test(trimmed)) {
      collecting = true;
      activeBuffer = [];
      return;
    }
    if (/\\endPart\b/.test(trimmed)) {
      collecting = false;
      flush();
      return;
    }
    if (collecting) activeBuffer.push(trimmed);
  });

  return sections;
}

function parseOpenbookKey(raw, preferredChordPartName) {
  const voicePartNames = preferredChordPartName === "ChordsFake"
    ? ["VoiceFake", "VoiceReal"]
    : ["VoiceReal", "VoiceFake"];

  const voiceBlock = voicePartNames
    .map((partName) => extractPartBlock(raw, partName))
    .find(Boolean) || String(raw || "");

  const keyMatch = /\\key\s+([a-g](?:is|es)?)\s+\\(major|minor)/i.exec(voiceBlock);
  if (!keyMatch) return "";
  const root = lilyRootToDisplay(keyMatch[1]);
  return keyMatch[2].toLowerCase() === "minor" ? `${root}m` : root;
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

function inferYear(raw) {
  const copyright = extractQuotedAttribute(raw, "copyright");
  const match = /\b(18|19|20)\d{2}\b/.exec(copyright);
  return match ? parseInt(match[0], 10) : null;
}

export function parseOpenbookStandard(raw, { id = "", titleFallback = "" } = {}) {
  const text = String(raw || "");
  const preferredChords = chooseOpenbookChordPart(text);
  if (!preferredChords?.text) throw new Error("No encuentro un bloque de acordes válido en este standard.");

  const sections = parseOpenbookSectionsFromChordBlock(preferredChords.text);
  if (!sections.length) throw new Error("No pude convertir los acordes de OpenBook a compases utilizables.");

  const title = extractQuotedAttribute(text, "title") || titleFallback || id;
  const composerText = extractQuotedAttribute(text, "composer");
  const structureText = extractQuotedAttribute(text, "structure");
  const composers = composerText
    ? composerText.split(/\s*,\s*/).map((item) => item.trim()).filter(Boolean)
    : [];
  const totalMeasures = sections.reduce((sum, section) => sum + section.measures.length, 0);

  return {
    id,
    title,
    composers,
    year: inferYear(text),
    defaultKey: parseOpenbookKey(text, preferredChords.partName),
    form: `${structureText || sections.map((section) => section.label).join("")} · ${totalMeasures} compases`,
    overview: "",
    realForm: {
      sections,
    },
    phrases: buildPhrasesFromSections(sections),
  };
}
