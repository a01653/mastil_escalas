import { useMemo, useRef, useState } from "react";
import {
  MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE,
  normalizeVisibleFrets,
} from "../../music/appStaticData.js";

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
      chordDetectWindowStartMin,
      chordDetectWindowAllowedStartMax,
      chordDetectWindowFrom,
      chordDetectWindowTo,
      chordDetectVisibleFrets,
    },
  };
}
