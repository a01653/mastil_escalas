import {
  resolveGuideToneCopiedVoicing,
  resolveCopiedVoicingAcrossStructures,
  buildChordCopyFingerprint,
} from "../../music/appVoicingStudyCore.js";
import { formatChordName, detectOmitFromCandidate } from "../../music/chordDetectionEngine.js";

// Núcleo puro del flujo "Copiar en Acorde" (detección manual → Chord Builder).
//
// Porciones extraíbles de la futura `buildChordBuilderPatchFromDetectedCandidate`.
// Cada función es un mapeo puro del candidato detectado a los valores con los que se
// configura el constructor; los setters siguen viviendo en el adaptador (App.jsx).
//
// IMPORTANTE: estos helpers todavía NO están todos cableados dentro de
// `applyDetectedCandidate` (App.jsx). La rama quartal sí consume
// `buildQuartalChordBuilderPatch` (desde v5.88); `buildGuideToneChordBuilderPatch`
// aún NO está cableada y solo se prueba en aislamiento para fijar el contrato antes
// de tocar la función grande y sus setters.
//
// Equivalencia exacta con el bloque inline `if (p.family === "quartal") { ... }`:
//   setChordFamily("quartal")           → family
//   setChordRootPc(p.rootPc)            → rootPc
//   setChordSpellPreferSharps(!!...)    → spellPreferSharps
//   setChordQuartalType(p... || "pure") → quartalType
//   setChordQuartalVoices(p... || "4")  → quartalVoices
//   setChordQuartalSpread(p... || ...)  → quartalSpread
//   setChordQuartalReference(p... ||..) → quartalReference
//   setChordQuartalSelectedFrets(null)  → quartalSelectedFrets
//   setChordQuartalVoicingIdx(0)        → quartalVoicingIdx
//   setChordOmit("none")                → omit
// (el `setChordDetectMode(false)` final es un efecto del adaptador, no parte del patch.)
export function buildQuartalChordBuilderPatch(uiPatch) {
  const p = uiPatch || {};
  return {
    family: "quartal",
    rootPc: p.rootPc,
    spellPreferSharps: !!p.spellPreferSharps,
    quartalType: p.quartalType || "pure",
    quartalVoices: p.quartalVoices || "4",
    quartalSpread: p.quartalSpread || "closed",
    quartalReference: p.quartalReference || "root",
    quartalSelectedFrets: null,
    quartalVoicingIdx: 0,
    omit: "none",
  };
}

// Rama guide-tones de `applyDetectedCandidate` (App.jsx líneas 2530–2558).
//
// Detecta si la selección física copiada corresponde a un voicing de guide tones
// (vía `resolveGuideToneCopiedVoicing`) y, en ese caso, devuelve el patch con el que
// el adaptador configura el constructor en modo "guide_tones". Es puro y síncrono:
// no depende de `ensureChordDbCatalogVoicings` (esa lógica es exclusiva de tertian).
//
// Devuelve `null` cuando no hay frets o cuando la resolución de guide tones falla,
// reproduciendo el doble gate inline `manualCopiedVoicing?.frets ? resolve(...) : null`
// + `if (guideToneCopy)`.
//
// IMPORTANTE: todavía NO está cableada en `applyDetectedCandidate`. El adaptador
// futuro precalcula `maxSpan = requiredMaxDist != null ? requiredMaxDist : chordMaxDist`,
// conserva el set condicional de `maxDist` (lee estado `chordMaxDist`), aplica las
// mutaciones de ref con `pendingRestore`/`pendingCopyResolution` y el efecto final
// `setChordDetectMode(false)`.
export function buildGuideToneChordBuilderPatch({
  candidate,
  manualCopiedVoicing,
  nextAllowOpenStrings,
  maxSpan,
  requiredMaxDist,
  maxFret,
}) {
  if (!manualCopiedVoicing?.frets) return null;
  const p = candidate?.uiPatch || {};
  const guideToneCopy = resolveGuideToneCopiedVoicing({
    voicing: manualCopiedVoicing,
    rootPc: p.rootPc,
    allowOpenStrings: nextAllowOpenStrings,
    maxSpan,
    maxFret,
  });
  if (!guideToneCopy) return null;

  const chordName = formatChordName(candidate);
  return {
    family: "guide_tones",
    rootPc: p.rootPc,
    spellPreferSharps: !!p.spellPreferSharps,
    guideToneQuality: guideToneCopy.guideToneQuality,
    guideToneForm: guideToneCopy.guideToneForm,
    guideToneInversion: guideToneCopy.guideToneInversion,
    allowOpenStrings: nextAllowOpenStrings || guideToneCopy.requiresOpenStrings,
    maxDist: requiredMaxDist,
    guideToneSelectedFrets: guideToneCopy.voicing.frets,
    guideToneVoicingIdx: 0,
    copiedEntry: null,
    pendingRestore: { active: false, frets: null },
    pendingCopyResolution: null,
    notice: `Copiado en Acorde: ${chordName}`,
  };
}

// Rama tertian/default de `applyDetectedCandidate` (App.jsx líneas 2558–2689).
//
// Es la única rama async: para resolver el voicing copiado consulta el catálogo de
// acordes mediante `fetchCatalogVoicings` (inyectado = `ensureChordDbCatalogVoicings`),
// que es impuro (fetch + setChordDbCache + lee estado). Por eso NO se llama
// directamente desde aquí: se recibe como parámetro. El catálogo base (`chordDb?.positions`)
// también se inyecta como `baseCatalogVoicings`.
//
// El resto del cálculo (omit, inversión/forma, exactChordCatalogMatch,
// resolveCopiedVoicingAcrossStructures, denseOpenStringFallback, effectiveResolvedCopy,
// targetStructure, fingerprint/copiedEntry, pendingRestore/pendingCopyResolution, notice)
// replica verbatim la lógica inline.
//
// IMPORTANTE: todavía NO está cableada en `applyDetectedCandidate`. El adaptador futuro
// aplica los setters desde el patch, conserva `applyChordStructureSelection(patch.structure)`,
// el set condicional de `maxDist` (lee estado `chordMaxDist`), las mutaciones de ref
// (`pendingRestore`/`pendingCopyResolution`) y el efecto `setChordDetectMode(false)`.
export async function buildTertianChordBuilderPatchFromDetectedCandidate({
  candidate,
  manualCopiedVoicing,
  detectedInversion,
  nextAllowOpenStrings,
  copiedHasOpenStrings,
  wantedFrets,
  requiredMaxDist,
  chordMaxDist,
  maxFret,
  baseCatalogVoicings,
  fetchCatalogVoicings,
}) {
  const p = candidate?.uiPatch || {};
  const detectedOmit = detectOmitFromCandidate(candidate);
  const fpInversion = manualCopiedVoicing ? "all" : (detectedInversion || p.inversion || "root");
  const fpForm = p.form || p.positionForm || "open";
  const fpMaxDist = requiredMaxDist != null ? requiredMaxDist : chordMaxDist;
  let catalogVoicings = baseCatalogVoicings || [];
  if (manualCopiedVoicing?.frets) {
    const chordCatalogVoicings = await fetchCatalogVoicings({
      rootPc: p.rootPc,
      quality: p.quality,
      suspension: p.suspension || "none",
      ext7: !!p.ext7,
      ext6: !!p.ext6,
      ext9: !!p.ext9,
      ext11: !!p.ext11,
      ext13: !!p.ext13,
      omit: detectedOmit,
      bassPc: manualCopiedVoicing?.bassPc ?? null,
      preferredFrets: wantedFrets,
    });
    if (chordCatalogVoicings.length) {
      catalogVoicings = chordCatalogVoicings;
    }
  }
  const exactChordCatalogMatch = !!manualCopiedVoicing?.frets
    && catalogVoicings.some((pos) => String(pos?.frets || "").trim().toLowerCase() === String(wantedFrets || "").trim().toLowerCase());
  const resolvedCopy = manualCopiedVoicing?.frets
    ? resolveCopiedVoicingAcrossStructures({
        voicing: manualCopiedVoicing,
        rootPc: p.rootPc,
        quality: p.quality,
        suspension: p.suspension || "none",
        structure: p.structure,
        ext7: !!p.ext7,
        ext6: !!p.ext6,
        ext9: !!p.ext9,
        ext11: !!p.ext11,
        ext13: !!p.ext13,
        omit: detectedOmit,
        form: fpForm,
        allowOpenStrings: nextAllowOpenStrings,
        maxFret,
        maxSpan: fpMaxDist,
        catalogVoicings,
      })
    : null;
  const denseOpenStringFallback = !exactChordCatalogMatch
    && !resolvedCopy?.structure
    && !!manualCopiedVoicing?.frets
    && copiedHasOpenStrings
    && (manualCopiedVoicing.notes?.length ?? 0) >= 5;
  const effectiveResolvedCopy = exactChordCatalogMatch
    ? {
        structure: "chord",
        voicing: manualCopiedVoicing,
        compatibleWithCurrentFilters: false,
        matchesRequestedStructure: false,
        requiresStructureChange: true,
        requiresOpenStrings: true,
      }
    : (resolvedCopy || (denseOpenStringFallback
    ? {
        structure: "chord",
        voicing: manualCopiedVoicing,
        compatibleWithCurrentFilters: false,
        matchesRequestedStructure: false,
        requiresStructureChange: true,
        requiresOpenStrings: true,
      }
    : null));
  const targetStructure = effectiveResolvedCopy?.structure || p.structure;

  let restoreFrets = wantedFrets;
  let copiedEntry;
  if (manualCopiedVoicing?.frets) {
    const fp = buildChordCopyFingerprint({
      rootPc: p.rootPc,
      quality: p.quality,
      suspension: p.suspension || "none",
      structure: targetStructure,
      ext7: !!p.ext7,
      ext6: !!p.ext6,
      ext9: !!p.ext9,
      ext11: !!p.ext11,
      ext13: !!p.ext13,
      omit: detectedOmit,
      inversion: fpInversion,
      form: fpForm,
      maxDist: fpMaxDist,
      allowOpenStrings: nextAllowOpenStrings,
    });
    const preservedVoicing = effectiveResolvedCopy?.voicing || manualCopiedVoicing;
    copiedEntry = { voicing: preservedVoicing, fingerprint: fp };
  } else {
    copiedEntry = null;
    restoreFrets = null;
  }
  const pendingRestore = { active: true, frets: restoreFrets };
  const pendingCopyResolution = manualCopiedVoicing?.frets
    ? {
        frets: restoreFrets,
        structure: targetStructure,
        allowOpenStrings: nextAllowOpenStrings,
      }
    : null;

  const chordName = formatChordName(candidate);
  const omitLabel = detectedOmit !== "none" ? ` · Omitir ${detectedOmit}` : "";
  const notice = `Copiado en Acorde: ${chordName}${omitLabel}`;

  return {
    family: "tertian",
    rootPc: p.rootPc,
    spellPreferSharps: !!p.spellPreferSharps,
    quality: p.quality,
    suspension: p.suspension || "none",
    structure: targetStructure,
    allowOpenStrings: nextAllowOpenStrings,
    inversion: fpInversion,
    positionForm: p.positionForm || "open",
    form: fpForm,
    ext7: !!p.ext7,
    ext6: !!p.ext6,
    ext9: !!p.ext9,
    ext11: !!p.ext11,
    ext13: !!p.ext13,
    omit: detectedOmit,
    maxDist: requiredMaxDist,
    copiedEntry,
    restoreFrets,
    pendingRestore,
    pendingCopyResolution,
    notice,
  };
}

// Dispatcher unificado del flujo "Copiar en Acorde".
//
// Compone los tres builders por familia con la prioridad de producción:
//   1. Quartal     → buildQuartalChordBuilderPatch(p)            (sync)
//   2. Guide-tones → buildGuideToneChordBuilderPatch({...})      (sync; null → cae a tertian)
//   3. Tertian     → buildTertianChordBuilderPatchFromDetectedCandidate({...})  (async)
//
// Devuelve una unión discriminada por `family` ("quartal" | "guide_tones" | "tertian").
// Con un `uiPatch` válido nunca devuelve null: tertian es el default y siempre produce patch.
//
// Reglas que replica del inline:
// - Solo tertian consulta el catálogo: quartal y guide-tones NO llaman a `fetchCatalogVoicings`.
// - `maxSpan` de guide-tones = `requiredMaxDist != null ? requiredMaxDist : chordMaxDist`.
// - La caída guide-tones → tertian se preserva con `if (guideTonePatch) return guideTonePatch`.
//
// Es async por la rama tertian; quartal/guide-tones se resuelven de forma síncrona dentro
// de la promesa (sin tocar el catálogo). Los guards `!candidate` / `!candidate.uiPatch`
// (que disparan setters de detección/estudio) quedan en el adaptador, no aquí.
//
// IMPORTANTE: todavía NO está cableado en `applyDetectedCandidate`.
export async function buildChordBuilderPatchFromDetectedCandidate({
  candidate,
  manualCopiedVoicing,
  detectedInversion,
  nextAllowOpenStrings,
  copiedHasOpenStrings,
  wantedFrets,
  requiredMaxDist,
  chordMaxDist,
  maxFret,
  baseCatalogVoicings,
  fetchCatalogVoicings,
}) {
  const p = candidate?.uiPatch || {};

  if (p.family === "quartal") {
    return buildQuartalChordBuilderPatch(p);
  }

  const guideTonePatch = buildGuideToneChordBuilderPatch({
    candidate,
    manualCopiedVoicing,
    nextAllowOpenStrings,
    maxSpan: requiredMaxDist != null ? requiredMaxDist : chordMaxDist,
    requiredMaxDist,
    maxFret,
  });
  if (guideTonePatch) {
    return guideTonePatch;
  }

  return buildTertianChordBuilderPatchFromDetectedCandidate({
    candidate,
    manualCopiedVoicing,
    detectedInversion,
    nextAllowOpenStrings,
    copiedHasOpenStrings,
    wantedFrets,
    requiredMaxDist,
    chordMaxDist,
    maxFret,
    baseCatalogVoicings,
    fetchCatalogVoicings,
  });
}
