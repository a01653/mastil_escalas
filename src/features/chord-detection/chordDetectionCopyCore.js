// Núcleo puro del flujo "Copiar en Acorde" (detección manual → Chord Builder).
//
// Primera porción extraíble de la futura `buildChordBuilderPatchFromDetectedCandidate`.
// Aquí solo vive la rama quartal, que es un mapeo puro del `uiPatch` del candidato a
// los valores con los que se configura el constructor en modo cuartal.
//
// IMPORTANTE: todavía NO está cableada dentro de `applyDetectedCandidate` (App.jsx).
// El cableado se hará en una fase posterior; por ahora solo se prueba en aislamiento
// para fijar el contrato antes de tocar la función grande y sus setters.
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
