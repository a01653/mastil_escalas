import { resolveGuideToneCopiedVoicing } from "../../music/appVoicingStudyCore.js";
import { formatChordName } from "../../music/chordDetectionEngine.js";

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
