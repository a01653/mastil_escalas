import { useEffect, useMemo, useRef, useState } from "react";
import * as AppMusicBasics from "../../music/appMusicBasics.js";
import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";

const {
  preferSharpsFromMajorTonicPc,
  fnBuildQuartalPitchSets,
  guideToneDefinitionFromQuality,
  chordSuffixFromUI,
  buildChordIntervals,
} = AppMusicBasics;
const {
  isDropForm,
  isStrictFourNoteDropEligible,
  chordThirdOffsetFromUI,
  chordFifthOffsetFromUI,
  buildChordEnginePlan,
  buildChordCopyFingerprint,
} = AppVoicingStudyCore;

export function useChordBuilderState() {
  // -- Tertian -----------------------------------------------------------
  const [chordRootPc, setChordRootPc] = useState(5); // F
  const [chordSpellPreferSharps, setChordSpellPreferSharps] = useState(() => preferSharpsFromMajorTonicPc(5));
  const [chordFamily, setChordFamily] = useState("tertian");
  const [chordQuality, setChordQuality] = useState("maj");
  const [chordSuspension, setChordSuspension] = useState("none");
  const [chordStructure, setChordStructure] = useState("triad");
  const [chordInversion, setChordInversion] = useState("all");
  const [chordForm, setChordForm] = useState("open");
  const [chordPositionForm, setChordPositionForm] = useState("open");
  const [chordExt7, setChordExt7] = useState(false);
  const [chordExt6, setChordExt6] = useState(false);
  const [chordExt9, setChordExt9] = useState(false);
  const [chordExt11, setChordExt11] = useState(false);
  const [chordExt13, setChordExt13] = useState(false);
  const [chordOmit, setChordOmit] = useState("none");
  const [chordCopyNotice, setChordCopyNotice] = useState(null);
  const [chordCopiedEntry, setChordCopiedEntry] = useState(null); // { voicing, fingerprint } — patrón físico copiado

  // -- Quartal -----------------------------------------------------------
  const [chordQuartalType, setChordQuartalType] = useState("pure");
  const [chordQuartalVoices, setChordQuartalVoices] = useState("4");
  const [chordQuartalSpread, setChordQuartalSpread] = useState("closed");
  const [chordQuartalReference, setChordQuartalReference] = useState("root");
  const [chordQuartalScaleName, setChordQuartalScaleName] = useState("Mayor");
  const [chordQuartalVoicingIdx, setChordQuartalVoicingIdx] = useState(0);
  const [chordQuartalSelectedFrets, setChordQuartalSelectedFrets] = useState(null);

  // -- Guide tones -------------------------------------------------------
  const [guideToneQuality, setGuideToneQuality] = useState("maj7");
  const [guideToneForm, setGuideToneForm] = useState("closed");
  const [guideToneInversion, setGuideToneInversion] = useState("all");
  const [guideToneVoicingIdx, setGuideToneVoicingIdx] = useState(0);
  const [guideToneSelectedFrets, setGuideToneSelectedFrets] = useState(null);

  // -- Voicing selection -------------------------------------------------
  const [chordVoicingIdx, setChordVoicingIdx] = useState(0);
  const [chordSelectedFrets, setChordSelectedFrets] = useState(null);
  const [chordMaxDist, setChordMaxDist] = useState(4);
  const [chordAllowOpenStrings, setChordAllowOpenStrings] = useState(false);

  // -- Refs --------------------------------------------------------------
  const lastChordVoicingRef = useRef(null);
  const skipChordVoicingRefSyncRef = useRef(false);
  const pendingChordRestoreRef = useRef({ active: false, frets: null });
  const pendingChordCopyResolutionRef = useRef(null);
  const lastGuideToneVoicingRef = useRef(null);

  // -- Coherencia interna ------------------------------------------------
  // E1, E2, E3 llaman setState síncronamente para normalizar estado tras un cambio
  // del usuario (anti-patrón en React Compiler, pero comportamiento correcto en React
  // estándar pre-compiler). El bloque disable/enable suprime la advertencia del linter
  // solo en esta sección específica.
  /* eslint-disable react-hooks/set-state-in-effect */

  // E1: Dominante en Acorde siempre implica 7ª (sin ella es mayor, no dominante).
  // m7b5 también la implica. Degrada hdim→dim y dom→maj en triada sin 7ª.
  useEffect(() => {
    if (chordQuality === "dom" && chordStructure === "chord" && !chordExt7) {
      setChordExt7(true);
    }
    if (chordQuality === "hdim" && chordStructure === "chord" && !chordExt7) {
      setChordExt7(true);
    }
    if (chordQuality === "hdim" && chordStructure === "triad" && !chordExt7) {
      setChordQuality("dim");
    }
    if (chordQuality === "dom" && chordStructure === "triad" && !chordExt7) {
      setChordQuality("maj");
    }
  }, [chordQuality, chordStructure, chordExt7]);

  // E2: Si la forma drop ya no es elegible por la combinación estructura+extensiones,
  // se revierte a positionForm (o "closed") y se fuerza la inversión a raíz.
  useEffect(() => {
    if (!isDropForm(chordForm)) return;
    if (isStrictFourNoteDropEligible({
      structure: chordStructure,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
    })) return;
    setChordForm(chordPositionForm || "closed");
    setChordInversion("root");
  }, [chordForm, chordPositionForm, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]);

  // E3: Cuatriada: inicializa 7ª=true al entrar en tetrad.
  useEffect(() => {
    if (chordStructure === "tetrad") setChordExt7(true);
  }, [chordStructure]);

  /* eslint-enable react-hooks/set-state-in-effect */

  // E5: Limpia el aviso de copia tras 3,5 s.
  useEffect(() => {
    if (!chordCopyNotice) return;
    const t = window.setTimeout(() => setChordCopyNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [chordCopyNotice]);

  // -- Derivados Ola 1 ---------------------------------------------------
  // Solo dependen del estado declarado en este hook. Sin dependencias externas.

  const chordPreferSharps = chordSpellPreferSharps;

  const chordQuartalPitchSets = useMemo(() =>
    fnBuildQuartalPitchSets({
      rootPc: chordRootPc,
      voices: chordQuartalVoices,
      type: chordQuartalType,
      reference: chordQuartalReference,
      scaleName: chordQuartalScaleName,
    }),
    [chordRootPc, chordQuartalVoices, chordQuartalType, chordQuartalReference, chordQuartalScaleName]
  );

  const guideToneDef = useMemo(
    () => guideToneDefinitionFromQuality(guideToneQuality),
    [guideToneQuality]
  );

  const chordIntervals = useMemo(
    () => buildChordIntervals({
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
      omit: chordOmit,
    }),
    [chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordOmit]
  );

  const chordSuffix = useMemo(
    () => chordSuffixFromUI({
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
    }),
    [chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]
  );

  const chordThirdOffset = useMemo(
    () => chordThirdOffsetFromUI(chordQuality, chordSuspension),
    [chordQuality, chordSuspension]
  );

  const chordFifthOffset = useMemo(
    () => chordFifthOffsetFromUI(chordQuality, chordSuspension),
    [chordQuality, chordSuspension]
  );

  const chordEnginePlan = useMemo(
    () => buildChordEnginePlan({
      rootPc: chordRootPc,
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      inversion: chordInversion,
      form: chordForm,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
      omit: chordOmit,
    }),
    [chordRootPc, chordQuality, chordSuspension, chordStructure, chordInversion, chordForm, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordOmit]
  );

  const currentChordCopyFingerprint = useMemo(
    () => buildChordCopyFingerprint({
      rootPc: chordRootPc,
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
      omit: chordOmit,
      inversion: chordInversion,
      form: chordForm,
      maxDist: chordMaxDist,
      allowOpenStrings: chordAllowOpenStrings,
    }),
    [chordRootPc, chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordOmit, chordInversion, chordForm, chordMaxDist, chordAllowOpenStrings]
  );

  return {
    state: {
      chordRootPc, setChordRootPc,
      chordSpellPreferSharps, setChordSpellPreferSharps,
      chordFamily, setChordFamily,
      chordQuality, setChordQuality,
      chordSuspension, setChordSuspension,
      chordStructure, setChordStructure,
      chordInversion, setChordInversion,
      chordForm, setChordForm,
      chordPositionForm, setChordPositionForm,
      chordExt7, setChordExt7,
      chordExt6, setChordExt6,
      chordExt9, setChordExt9,
      chordExt11, setChordExt11,
      chordExt13, setChordExt13,
      chordOmit, setChordOmit,
      chordCopyNotice, setChordCopyNotice,
      chordCopiedEntry, setChordCopiedEntry,
      chordQuartalType, setChordQuartalType,
      chordQuartalVoices, setChordQuartalVoices,
      chordQuartalSpread, setChordQuartalSpread,
      chordQuartalReference, setChordQuartalReference,
      chordQuartalScaleName, setChordQuartalScaleName,
      chordQuartalVoicingIdx, setChordQuartalVoicingIdx,
      chordQuartalSelectedFrets, setChordQuartalSelectedFrets,
      guideToneQuality, setGuideToneQuality,
      guideToneForm, setGuideToneForm,
      guideToneInversion, setGuideToneInversion,
      guideToneVoicingIdx, setGuideToneVoicingIdx,
      guideToneSelectedFrets, setGuideToneSelectedFrets,
      chordVoicingIdx, setChordVoicingIdx,
      chordSelectedFrets, setChordSelectedFrets,
      chordMaxDist, setChordMaxDist,
      chordAllowOpenStrings, setChordAllowOpenStrings,
      // Derivados Ola 1
      chordPreferSharps,
      chordQuartalPitchSets,
      guideToneDef,
      chordIntervals,
      chordSuffix,
      chordThirdOffset,
      chordFifthOffset,
      chordEnginePlan,
      currentChordCopyFingerprint,
    },
    refs: {
      lastChordVoicingRef,
      skipChordVoicingRefSyncRef,
      pendingChordRestoreRef,
      pendingChordCopyResolutionRef,
      lastGuideToneVoicingRef,
    },
  };
}
