import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { applyChordDetectCellToggle } from "./chordDetectionSelectionCore.js";
import { useChordDetectionAudio } from "./useChordDetectionAudio.js";

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
  const [chordDetectClearMinHeight, setChordDetectClearMinHeight] = useState(null);

  // ── Refs de detección manual ──────────────────────────────────────────────
  const lastChordDetectCandidateRef = useRef(null);
  const pendingChordDetectCandidateRef = useRef(null);
  const isManualCandidateSelectRef = useRef(false);
  const chordDetectPanelRef = useRef(null);
  const chordDetectInvestigationAreaRef = useRef(null);
  const chordDetectViewportFramesRef = useRef([]);
  const chordDetectViewportTimersRef = useRef([]);
  const chordDetectSelectedKeysRef = useRef(chordDetectSelectedKeys);

  useLayoutEffect(() => {
    chordDetectSelectedKeysRef.current = chordDetectSelectedKeys;
  }, [chordDetectSelectedKeys]);

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

  const selectDetectedCandidate = useCallback((candidate) => {
    isManualCandidateSelectRef.current = true;
    lastChordDetectCandidateRef.current = candidate || null;
    pendingChordDetectCandidateRef.current = candidate || null;
    setChordDetectCandidateId(candidate?.id || null);
  }, [setChordDetectCandidateId]);

  const clearChordDetectSelection = useCallback(() => {
    pendingChordDetectCandidateRef.current = null;
    setChordDetectSelectedKeys([]);
    setChordDetectCandidateId(null);
    lastChordDetectCandidateRef.current = null;
  }, [setChordDetectCandidateId, setChordDetectSelectedKeys]);

  const capturePendingCandidateBeforeSelectionEdit = useCallback(() => {
    pendingChordDetectCandidateRef.current = chordDetectSelectedCandidate || lastChordDetectCandidateRef.current || null;
  }, [chordDetectSelectedCandidate]);

  const toggleChordDetectCellSelection = useCallback(({
    sIdx,
    fret,
    windowSize = MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE,
  }) => {
    capturePendingCandidateBeforeSelectionEdit();
    const selectedKeys = chordDetectSelectedKeysRef.current;
    const result = applyChordDetectCellToggle({
      selectedKeys,
      sIdx,
      fret,
      windowSize,
    });
    if (result.nextKeys !== selectedKeys) {
      setChordDetectSelectedKeys(result.nextKeys);
    }
    return result;
  }, [capturePendingCandidateBeforeSelectionEdit, setChordDetectSelectedKeys]);

  // ── Viewport/focus stabilizers ──────────────────────────────────────────────
  const clearChordDetectViewportStabilizers = useCallback(() => {
    if (typeof window === "undefined") return;
    chordDetectViewportFramesRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
    chordDetectViewportFramesRef.current = [];
    chordDetectViewportTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    chordDetectViewportTimersRef.current = [];
  }, [chordDetectViewportFramesRef, chordDetectViewportTimersRef]);

  function focusChordDetectPanelWithoutScroll() {
    if (typeof document === "undefined") return;
    const panel = chordDetectPanelRef.current;
    if (panel instanceof HTMLElement && typeof panel.focus === "function") {
      try {
        panel.focus({ preventScroll: true });
        return;
      } catch {
        // Older browsers may not support the preventScroll option.
      }
      try {
        panel.focus();
        return;
      } catch {
        // If focus fails, blur the active control below.
      }
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function preserveChordDetectViewportScroll({ blurActive = false, focusPanel = false } = {}) {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (focusPanel) {
      focusChordDetectPanelWithoutScroll();
    } else if (blurActive && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    clearChordDetectViewportStabilizers();

    const restore = () => {
      const currentX = window.scrollX || document.documentElement.scrollLeft || 0;
      const currentY = window.scrollY || document.documentElement.scrollTop || 0;
      if (Math.abs(currentX - scrollX) > 1 || Math.abs(currentY - scrollY) > 1) {
        window.scrollTo(scrollX, scrollY);
      }
    };

    const restoreFrames = (remaining) => {
      const frameId = window.requestAnimationFrame(() => {
        chordDetectViewportFramesRef.current = chordDetectViewportFramesRef.current.filter((id) => id !== frameId);
        restore();
        if (remaining > 1) restoreFrames(remaining - 1);
      });
      chordDetectViewportFramesRef.current.push(frameId);
    };

    [0, 60, 140, 320, 700].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        restore();
        chordDetectViewportTimersRef.current = chordDetectViewportTimersRef.current.filter((id) => id !== timerId);
      }, delay);
      chordDetectViewportTimersRef.current.push(timerId);
    });

    restore();
    restoreFrames(12);
  }

  useEffect(() => () => {
    clearChordDetectViewportStabilizers();
  }, [clearChordDetectViewportStabilizers]);

  const audio = useChordDetectionAudio({ chordDetectPlaybackNotes, chordDetectSelectedKeys });

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
      chordDetectClearMinHeight, setChordDetectClearMinHeight,
    },
    refs: {
      lastChordDetectCandidateRef,
      pendingChordDetectCandidateRef,
      isManualCandidateSelectRef,
      chordDetectPanelRef,
      chordDetectInvestigationAreaRef,
      chordDetectViewportFramesRef,
      chordDetectViewportTimersRef,
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
    actions: {
      selectDetectedCandidate,
      clearChordDetectSelection,
      capturePendingCandidateBeforeSelectionEdit,
      toggleChordDetectCellSelection,
    },
    viewport: {
      clearChordDetectViewportStabilizers,
      focusChordDetectPanelWithoutScroll,
      preserveChordDetectViewportScroll,
    },
    audio,
  };
}
