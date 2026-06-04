import { useEffect, useMemo, useRef, useState } from "react";
import * as AppMusicBasics from "../../music/appMusicBasics.js";
import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";

const {
  preferSharpsFromMajorTonicPc,
  fnBuildQuartalPitchSets,
  fnGenerateQuartalVoicings,
  guideToneDefinitionFromQuality,
  guideToneBassIntervalsForSelection,
  chordSuffixFromUI,
  buildChordIntervals,
  buildChordDegreeLabelsFromUi,
  spellChordNotes,
  chordBassInterval,
  CHORD_QUARTAL_TYPES,
  pcToName,
  mod12,
  voicingHasOpenStrings,
} = AppMusicBasics;
const {
  isDropForm,
  isStrictFourNoteDropEligible,
  chordThirdOffsetFromUI,
  chordFifthOffsetFromUI,
  augmentExactVoicingsWithOpenSubstitutions,
  buildChordEnginePlan,
  buildChordCopyFingerprint,
  computeInversionSelectorOptions,
  dedupeAndSortVoicings,
  filterVoicingsByForm,
  generateExactIntervalChordVoicings,
  normalizeChordFormToInversion,
  normalizeGeneratedVoicingForDisplay,
  parseChordDbFretsString,
  buildVoicingFromFretsLH,
  selectClosestPhysicalVoicingIndex,
} = AppVoicingStudyCore;

export function useChordBuilderTertianSelectionBlock({
  chordVoicings,
  chordCopiedEntry,
  currentChordCopyFingerprint,
  chordVoicingIdx,
  setChordVoicingIdx,
  chordSelectedFrets,
  setChordSelectedFrets,
  chordRootPc,
  maxFret,
  storageHydrated,
  lastChordVoicingRef,
  skipChordVoicingRefSyncRef,
  pendingChordRestoreRef,
}) {
  /* eslint-disable react-hooks/refs */
  const chordVoicingsDisplay = useMemo(() => {
    if (!chordCopiedEntry?.voicing?.frets) return chordVoicings;
    if (chordCopiedEntry.fingerprint !== currentChordCopyFingerprint) return chordVoicings;
    if (chordVoicings.some((v) => v.frets === chordCopiedEntry.voicing.frets)) return chordVoicings;
    return [{ ...chordCopiedEntry.voicing, isCopied: true }, ...chordVoicings];
  }, [chordVoicings, chordCopiedEntry, currentChordCopyFingerprint]);

  const chordResolvedSelection = useMemo(() => {
    const list = chordVoicingsDisplay;
    if (!list.length) return { idx: 0, voicing: null, frets: null, waitingPending: false };

    const normalizedCurrentIdx = Math.max(0, Math.min(chordVoicingIdx, list.length - 1));
    const currentVoicing = list[normalizedCurrentIdx] || list[0] || null;
    const currentFrets = currentVoicing?.frets ?? null;

    if (pendingChordRestoreRef.current.active) {
      const wanted = pendingChordRestoreRef.current.frets;
      if (wanted == null) {
        return { idx: normalizedCurrentIdx, voicing: currentVoicing, frets: currentFrets, waitingPending: false };
      }
      const restoredIdx = list.findIndex((v) => v.frets === wanted);
      if (restoredIdx >= 0) {
        return { idx: restoredIdx, voicing: list[restoredIdx] || null, frets: wanted, waitingPending: false };
      }
      return { idx: normalizedCurrentIdx, voicing: currentVoicing, frets: currentFrets, waitingPending: true };
    }

    const keepIdx = chordSelectedFrets ? list.findIndex((v) => v.frets === chordSelectedFrets) : -1;
    if (keepIdx >= 0) {
      return { idx: keepIdx, voicing: list[keepIdx] || null, frets: chordSelectedFrets, waitingPending: false };
    }

    const ref = chordSelectedFrets
      ? buildVoicingFromFretsLH({
          fretsLH: parseChordDbFretsString(chordSelectedFrets),
          rootPc: chordRootPc,
          maxFret,
        })
      : lastChordVoicingRef.current;
    const idx = selectClosestPhysicalVoicingIndex(ref, list, { fallbackIndex: normalizedCurrentIdx });
    const voicing = list[idx] || list[0] || null;
    return { idx, voicing, frets: voicing?.frets ?? null, waitingPending: false };
  }, [chordVoicingsDisplay, chordVoicingIdx, chordSelectedFrets, chordRootPc, maxFret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!storageHydrated) return;
    if (!chordVoicingsDisplay.length) {
      if (!pendingChordRestoreRef.current.active && chordVoicingIdx !== 0) setChordVoicingIdx(0);
      return;
    }

    if (chordResolvedSelection.waitingPending) return;

    if (pendingChordRestoreRef.current.active) {
      pendingChordRestoreRef.current = { active: false, frets: null };
    }

    if (chordResolvedSelection.idx !== chordVoicingIdx) {
      skipChordVoicingRefSyncRef.current = true;
      setChordVoicingIdx(chordResolvedSelection.idx);
    }
    if ((chordResolvedSelection.frets ?? null) !== (chordSelectedFrets ?? null)) {
      setChordSelectedFrets(chordResolvedSelection.frets ?? null);
    }
  }, [storageHydrated, chordVoicingsDisplay.length, chordVoicingIdx, chordSelectedFrets, chordResolvedSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = {
    chordVoicingsDisplay,
    chordResolvedSelection,
    activeChordVoicing: chordResolvedSelection.voicing,
  };
  return result;
  /* eslint-enable react-hooks/refs */
}

export function useChordBuilderTertianVoicingRefSync({
  storageHydrated,
  chordResolvedSelection,
  lastChordVoicingRef,
  skipChordVoicingRefSyncRef,
}) {
  useEffect(() => {
    if (!storageHydrated) return;
    const current = chordResolvedSelection.voicing;

    if (skipChordVoicingRefSyncRef.current) {
      skipChordVoicingRefSyncRef.current = false;
      return;
    }
    if (current) lastChordVoicingRef.current = current;
  }, [storageHydrated, chordResolvedSelection]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useChordBuilderState({ maxFret } = {}) {
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
  const skipGuideToneVoicingRefSyncRef = useRef(false);

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
  // Derivados base del builder; algunos dependen del parámetro externo maxFret.

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

  const chordQuartalVoicings = useMemo(() => {
    const all = fnGenerateQuartalVoicings({
      pitchSets: chordQuartalPitchSets,
      maxDist: chordMaxDist,
      allowOpenStrings: chordAllowOpenStrings,
      maxFret,
    });

    return all.filter((v) => {
      const kind = v?.quartalSpreadKind || "closed";
      return chordQuartalSpread === "open" ? kind === "open" : kind === "closed";
    });
  }, [chordQuartalPitchSets, chordMaxDist, chordAllowOpenStrings, chordQuartalSpread, maxFret]);

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

  // -- Derivados Ola 2 ---------------------------------------------------
  // Dependen de derivados de Ola 1 o requieren imports de nivel medio.

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!chordQuartalVoicings.length) {
      setChordQuartalVoicingIdx(0);
      setChordQuartalSelectedFrets(null);
      return;
    }

    if (chordQuartalSelectedFrets) {
      const idx = chordQuartalVoicings.findIndex((v) => v.frets === chordQuartalSelectedFrets);
      if (idx >= 0) {
        setChordQuartalVoicingIdx(idx);
        return;
      }
    }

    setChordQuartalVoicingIdx(0);
    setChordQuartalSelectedFrets(chordQuartalVoicings[0].frets);
  }, [chordQuartalVoicings, chordQuartalSelectedFrets]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeQuartalVoicingRaw = chordQuartalVoicings[chordQuartalVoicingIdx] || null;

  const activeQuartalVoicing = useMemo(() => {
    if (!activeQuartalVoicingRaw) return null;
    if (Array.isArray(activeQuartalVoicingRaw.notes)) return activeQuartalVoicingRaw;
    return { ...activeQuartalVoicingRaw, notes: [] };
  }, [activeQuartalVoicingRaw]);

  const chordQuartalCurrentRootPc = useMemo(() => {
    const pcs = Array.isArray(activeQuartalVoicing?.quartalOrderedPcs) && activeQuartalVoicing.quartalOrderedPcs.length
      ? activeQuartalVoicing.quartalOrderedPcs
      : Array.isArray(chordQuartalPitchSets?.[0]?.pcs) && chordQuartalPitchSets[0].pcs.length
        ? chordQuartalPitchSets[0].pcs
        : null;

    return pcs ? mod12(pcs[0]) : chordRootPc;
  }, [activeQuartalVoicing, chordQuartalPitchSets, chordRootPc]);

  const chordQuartalDisplayName = useMemo(() => {
    const rootName = pcToName(chordQuartalCurrentRootPc, chordPreferSharps);
    const typeLabel = CHORD_QUARTAL_TYPES.find((x) => x.value === chordQuartalType)?.label || "Cuartal puro";
    return `${rootName} ${typeLabel}`;
  }, [chordQuartalCurrentRootPc, chordPreferSharps, chordQuartalType]);

  const guideToneDisplayName = useMemo(() => {
    const rootName = pcToName(chordRootPc, chordPreferSharps);
    return `${rootName}${guideToneDef.suffix}`;
  }, [chordRootPc, chordPreferSharps, guideToneDef]);

  const guideToneVoicings = useMemo(() => {
    const bassIntervals = guideToneBassIntervalsForSelection(guideToneDef, guideToneInversion);
    const baseList = bassIntervals.flatMap((bassInterval) =>
      generateExactIntervalChordVoicings({
        rootPc: chordRootPc,
        intervals: guideToneDef.intervals,
        bassInterval,
        maxFret,
        maxSpan: chordMaxDist,
      }).map((v) => normalizeGeneratedVoicingForDisplay(v, chordRootPc, chordRootPc))
    );

    const allowedIntervals = new Set(guideToneDef.intervals.map(mod12));
    const requiredIntervals = new Set(guideToneDef.intervals.map(mod12));
    let list = dedupeAndSortVoicings(baseList);

    if (!chordAllowOpenStrings) {
      list = list.filter((v) => !voicingHasOpenStrings(v));
    }

    if (chordAllowOpenStrings) {
      list = augmentExactVoicingsWithOpenSubstitutions({
        voicings: list,
        rootPc: chordRootPc,
        allowedIntervals,
        requiredIntervals,
        allowedBassIntervals: bassIntervals,
        nearFrom: 0,
        nearTo: maxFret,
        maxFret,
        maxSpan: chordMaxDist,
        exactNoteCount: 3,
      });
    }

    list = filterVoicingsByForm(dedupeAndSortVoicings(list), guideToneForm);
    return list.slice(0, 60);
  }, [guideToneDef, guideToneInversion, chordRootPc, maxFret, chordMaxDist, chordAllowOpenStrings, guideToneForm]);

  const guideToneVoicingsSig = useMemo(() => guideToneVoicings.map((v) => v.frets).join("|"), [guideToneVoicings]);

  const chordDegreeLabels = useMemo(
    () => buildChordDegreeLabelsFromUi({
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
      chordIntervals,
    }),
    [chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordIntervals]
  );

  const chordSpelledNotes = useMemo(
    () => spellChordNotes({ rootPc: chordRootPc, chordIntervals, preferSharps: chordPreferSharps }),
    [chordRootPc, chordIntervals, chordPreferSharps]
  );

  const chordInversionOptions = useMemo(
    () => computeInversionSelectorOptions(chordEnginePlan, chordPreferSharps),
    [chordEnginePlan, chordPreferSharps]
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  // E4: Sanitiza la inversión cuando la opción seleccionada deja de existir (ej. omit activa
  // reduce los grados efectivos y "3ª inversión" ya no es una posición válida).
  useEffect(() => {
    if (!chordInversionOptions.some((o) => o.value === chordInversion)) {
      setChordInversion("all");
    }
  }, [chordInversionOptions, chordInversion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const chordBassInt = useMemo(
    () =>
      chordBassInterval({
        quality: chordQuality,
        suspension: chordSuspension,
        structure: chordStructure,
        inversion: normalizeChordFormToInversion(chordInversion),
        chordIntervals,
        ext7: chordExt7,
        ext6: chordExt6,
        ext9: chordExt9,
        ext11: chordExt11,
        ext13: chordExt13,
      }),
    [chordQuality, chordSuspension, chordStructure, chordInversion, chordIntervals, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]
  );

  const chordBassPc = useMemo(() => mod12(chordRootPc + chordBassInt), [chordRootPc, chordBassInt]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!guideToneVoicings.length) {
      lastGuideToneVoicingRef.current = null;
      if (guideToneVoicingIdx !== 0) setGuideToneVoicingIdx(0);
      if (guideToneSelectedFrets !== null) setGuideToneSelectedFrets(null);
      return;
    }

    const keepIdx = guideToneSelectedFrets ? guideToneVoicings.findIndex((v) => v.frets === guideToneSelectedFrets) : -1;
    if (keepIdx >= 0) {
      if (keepIdx !== guideToneVoicingIdx) {
        skipGuideToneVoicingRefSyncRef.current = true;
        setGuideToneVoicingIdx(keepIdx);
      }
      return;
    }

    const ref = lastGuideToneVoicingRef.current;
    const idx = selectClosestPhysicalVoicingIndex(ref, guideToneVoicings);
    const nextFrets = guideToneVoicings[idx]?.frets ?? guideToneVoicings[0]?.frets ?? null;
    if (idx !== guideToneVoicingIdx) {
      skipGuideToneVoicingRefSyncRef.current = true;
      setGuideToneVoicingIdx(idx);
    }
    if (nextFrets !== guideToneSelectedFrets) setGuideToneSelectedFrets(nextFrets);
  }, [guideToneVoicingIdx, guideToneVoicings, guideToneVoicingsSig, guideToneSelectedFrets]);

  useEffect(() => {
    const current = guideToneVoicings[guideToneVoicingIdx] || guideToneVoicings[0] || null;

    if (skipGuideToneVoicingRefSyncRef.current) {
      skipGuideToneVoicingRefSyncRef.current = false;
      return;
    }

    const selectedStillExists = !!guideToneSelectedFrets && guideToneVoicings.some((v) => v.frets === guideToneSelectedFrets);
    if (!selectedStillExists) {
      const nextFrets = current?.frets ?? null;
      if (nextFrets !== (guideToneSelectedFrets ?? null)) setGuideToneSelectedFrets(nextFrets);
    }

    if (current) lastGuideToneVoicingRef.current = current;
  }, [guideToneVoicingIdx, guideToneVoicings, guideToneVoicingsSig, guideToneSelectedFrets]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeGuideToneVoicing = guideToneVoicings[guideToneVoicingIdx] || guideToneVoicings[0] || null;

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
      chordQuartalVoicings,
      activeQuartalVoicing,
      chordQuartalCurrentRootPc,
      chordQuartalDisplayName,
      guideToneDef,
      guideToneVoicings,
      activeGuideToneVoicing,
      chordIntervals,
      chordSuffix,
      chordThirdOffset,
      chordFifthOffset,
      chordEnginePlan,
      currentChordCopyFingerprint,
      // Derivados Ola 2
      guideToneDisplayName,
      chordDegreeLabels,
      chordSpelledNotes,
      chordInversionOptions,
      chordBassInt,
      chordBassPc,
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
