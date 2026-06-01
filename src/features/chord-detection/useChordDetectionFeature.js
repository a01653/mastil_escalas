import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE,
  STRINGS,
  normalizeVisibleFrets,
} from "../../music/appStaticData.js";
import { mod12, pitchAt } from "../../music/appMusicBasics.js";
import {
  detectChordReadings as detectChordReadingsPure,
  resolveDetectedCandidateFromContext as resolveDetectedCandidateFromContextPure,
} from "../../music/chordDetectionEngine.js";
import { rankReadingsWithHarmonyContext as rankReadingsWithHarmonyContextPure } from "../../music/harmonyContextRanking.js";

const CHORD_REF_NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function useChordDetectionFeature({ maxFret }) {
  // ── Estado de detección manual ────────────────────────────────────────────
  const [chordDetectMode, setChordDetectMode] = useState(false);
  const [chordDetectClickAudio, setChordDetectClickAudio] = useState(false);
  const [chordDetectPrioritizeContext, setChordDetectPrioritizeContext] = useState(true);
  const [chordDetectPrioritizeContextTouched, setChordDetectPrioritizeContextTouched] = useState(false);
  const [chordRefNatural, setChordRefNatural] = useState("C");
  const [chordRefAcc, setChordRefAcc] = useState(0);
  const [chordRefQuality, setChordRefQuality] = useState("7");
  const [chordRefEnabled, setChordRefEnabled] = useState(false);
  const [chordDetectSelectedKeys, setChordDetectSelectedKeys] = useState([]);
  const [chordDetectCandidateId, setChordDetectCandidateId] = useState(null);
  const [voicingInputText, setVoicingInputText] = useState("");
  const [chordDetectWindowStart, setChordDetectWindowStart] = useState(1);
  const [chordDetectPlayingKeys, setChordDetectPlayingKeys] = useState([]);
  const [chordDetectClearMinHeight, setChordDetectClearMinHeight] = useState(null);

  // ── Refs de detección manual ──────────────────────────────────────────────
  const chordDetectAudioCtxRef = useRef(null);
  const lastChordDetectCandidateRef = useRef(null);
  const pendingChordDetectCandidateRef = useRef(null);
  const isManualCandidateSelectRef = useRef(false);
  const chordDetectPanelRef = useRef(null);
  const chordDetectInvestigationAreaRef = useRef(null);
  const chordDetectViewportFramesRef = useRef([]);
  const chordDetectViewportTimersRef = useRef([]);
  const chordDetectPlaybackTimersRef = useRef([]);

  const chordDetectSelectedFrettedRange = useMemo(() => {
    const fretted = chordDetectSelectedKeys
      .map((key) => {
        const [, fretStr] = String(key || "").split(":");
        return Number.parseInt(fretStr, 10);
      })
      .filter((fret) => Number.isFinite(fret) && fret > 0);

    if (!fretted.length) return null;

    return {
      min: Math.min(...fretted),
      max: Math.max(...fretted),
    };
  }, [chordDetectSelectedKeys]);

  const chordDetectWindowStartMax = useMemo(
    () => Math.max(1, maxFret - (MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE - 1)),
    [maxFret]
  );

  const chordDetectWindowStartMin = useMemo(
    () => chordDetectSelectedFrettedRange
      ? Math.max(1, chordDetectSelectedFrettedRange.max - (MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE - 1))
      : 1,
    [chordDetectSelectedFrettedRange]
  );

  const chordDetectWindowAllowedStartMax = useMemo(
    () => chordDetectSelectedFrettedRange
      ? Math.max(
          chordDetectWindowStartMin,
          Math.min(chordDetectWindowStartMax, chordDetectSelectedFrettedRange.min)
        )
      : chordDetectWindowStartMax,
    [chordDetectSelectedFrettedRange, chordDetectWindowStartMax, chordDetectWindowStartMin]
  );

  const chordDetectWindowFrom = useMemo(
    () => Math.max(
      chordDetectWindowStartMin,
      Math.min(chordDetectWindowAllowedStartMax, Math.floor(Number(chordDetectWindowStart) || 1))
    ),
    [chordDetectWindowAllowedStartMax, chordDetectWindowStart, chordDetectWindowStartMin]
  );

  const chordDetectWindowTo = useMemo(
    () => Math.max(
      chordDetectWindowFrom,
      Math.min(maxFret, chordDetectWindowFrom + MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE - 1)
    ),
    [chordDetectWindowFrom, maxFret]
  );

  const chordDetectVisibleFrets = useMemo(
    () => normalizeVisibleFrets(
      [0, ...Array.from(
        { length: Math.max(0, chordDetectWindowTo - chordDetectWindowFrom + 1) },
        (_, idx) => chordDetectWindowFrom + idx
      )],
      maxFret
    ),
    [chordDetectWindowFrom, chordDetectWindowTo, maxFret]
  );

  const chordDetectSelectedNotes = useMemo(() => {
    return chordDetectSelectedKeys
      .map((key) => {
        const [sStr, fStr] = String(key || "").split(":");
        const sIdx = Number.parseInt(sStr, 10);
        const fret = Number.parseInt(fStr, 10);
        if (!Number.isFinite(sIdx) || !Number.isFinite(fret)) return null;
        return {
          key,
          sIdx,
          fret,
          pc: mod12(STRINGS[sIdx].pc + fret),
          pitch: pitchAt(sIdx, fret),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.pitch - b.pitch);
  }, [chordDetectSelectedKeys]);

  const chordDetectCandidates = useMemo(
    () => detectChordReadingsPure(chordDetectSelectedNotes),
    [chordDetectSelectedNotes]
  );

  const chordDetectPlaybackNotes = useMemo(
    () => [...chordDetectSelectedNotes].sort((a, b) => b.sIdx - a.sIdx || a.fret - b.fret),
    [chordDetectSelectedNotes]
  );

  const chordDetectCandidatesRanked = useMemo(() => {
    const harmonyContext = {
      enabled: chordRefEnabled,
      rootPc: ((CHORD_REF_NATURAL_PC[chordRefNatural] ?? 0) + chordRefAcc + 12) % 12,
      quality: chordRefQuality,
      selectedNotes: chordDetectSelectedNotes,
    };
    return rankReadingsWithHarmonyContextPure(chordDetectCandidates, harmonyContext);
  }, [chordDetectCandidates, chordRefEnabled, chordRefNatural, chordRefAcc, chordRefQuality, chordDetectSelectedNotes]);

  const chordDetectSelectionSignature = useMemo(
    () => [...chordDetectSelectedKeys].sort().join("|"),
    [chordDetectSelectedKeys]
  );

  const chordDetectSelectedCandidate = useMemo(
    () => chordDetectCandidatesRanked.find((c) => c.id === chordDetectCandidateId) || null,
    [chordDetectCandidatesRanked, chordDetectCandidateId]
  );

  useLayoutEffect(() => {
    if (chordDetectSelectedCandidate) {
      lastChordDetectCandidateRef.current = chordDetectSelectedCandidate;
      pendingChordDetectCandidateRef.current = null;
    }
  }, [chordDetectSelectedCandidate, lastChordDetectCandidateRef, pendingChordDetectCandidateRef]);

  useLayoutEffect(() => {
    if (chordDetectSelectedKeys.length) return;
    lastChordDetectCandidateRef.current = null;
    pendingChordDetectCandidateRef.current = null;
  }, [chordDetectSelectedKeys.length, lastChordDetectCandidateRef, pendingChordDetectCandidateRef]);

  useLayoutEffect(() => {
    if (!chordDetectMode) return;

    // Selección explícita del usuario: siempre respetarla si el candidato sigue en la lista.
    if (isManualCandidateSelectRef.current) {
      isManualCandidateSelectRef.current = false;
      const exists = chordDetectCandidateId != null && chordDetectCandidatesRanked.some((c) => c.id === chordDetectCandidateId);
      if (exists) return;
    }

    const nextId = resolveDetectedCandidateFromContextPure({
      candidates: chordDetectCandidatesRanked,
      currentCandidateId: chordDetectCandidateId,
      pendingCandidate: pendingChordDetectCandidateRef.current,
      lastCandidate: lastChordDetectCandidateRef.current,
      prioritizeContext: chordDetectPrioritizeContext,
    })?.id || null;
    if (!chordDetectCandidatesRanked.length) {
      // Mantiene la política existente: sin candidatos, la selección actual debe limpiarse inmediatamente.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (chordDetectCandidateId !== null) setChordDetectCandidateId(null);
      return;
    }
    if ((chordDetectCandidateId || null) !== nextId) {
      setChordDetectCandidateId(nextId);
    }
    if (pendingChordDetectCandidateRef.current && nextId) {
      pendingChordDetectCandidateRef.current = null;
    }
  }, [chordDetectMode, chordDetectSelectionSignature, chordDetectCandidatesRanked, chordDetectCandidateId, chordDetectPrioritizeContext, isManualCandidateSelectRef, lastChordDetectCandidateRef, pendingChordDetectCandidateRef, setChordDetectCandidateId]);

  return {
    state: {
      chordDetectMode, setChordDetectMode,
      chordDetectClickAudio, setChordDetectClickAudio,
      chordDetectPrioritizeContext, setChordDetectPrioritizeContext,
      chordDetectPrioritizeContextTouched, setChordDetectPrioritizeContextTouched,
      chordRefNatural, setChordRefNatural,
      chordRefAcc, setChordRefAcc,
      chordRefQuality, setChordRefQuality,
      chordRefEnabled, setChordRefEnabled,
      chordDetectSelectedKeys, setChordDetectSelectedKeys,
      chordDetectCandidateId, setChordDetectCandidateId,
      voicingInputText, setVoicingInputText,
      chordDetectWindowStart, setChordDetectWindowStart,
      chordDetectPlayingKeys, setChordDetectPlayingKeys,
      chordDetectClearMinHeight, setChordDetectClearMinHeight,
    },
    refs: {
      chordDetectAudioCtxRef,
      lastChordDetectCandidateRef,
      pendingChordDetectCandidateRef,
      isManualCandidateSelectRef,
      chordDetectPanelRef,
      chordDetectInvestigationAreaRef,
      chordDetectViewportFramesRef,
      chordDetectViewportTimersRef,
      chordDetectPlaybackTimersRef,
    },
    derived: {
      chordDetectSelectedNotes,
      chordDetectCandidates,
      chordDetectCandidatesRanked,
      chordDetectSelectedCandidate,
      chordDetectPlaybackNotes,
      chordDetectSelectionSignature,
      chordDetectWindowStartMin,
      chordDetectWindowAllowedStartMax,
      chordDetectWindowFrom,
      chordDetectWindowTo,
      chordDetectVisibleFrets,
    },
  };
}
