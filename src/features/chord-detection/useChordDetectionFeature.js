import { useRef, useState } from "react";

export function useChordDetectionFeature() {
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
  };
}
