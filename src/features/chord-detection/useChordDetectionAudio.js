import { useCallback, useEffect, useRef, useState } from "react";
import { pitchAt } from "../../music/appMusicBasics.js";
import { scheduleChordDetectMidi } from "./chordDetectAudioCore.js";

export function useChordDetectionAudio({ chordDetectPlaybackNotes, chordDetectSelectedKeys }) {
  const [chordDetectPlayingKeys, setChordDetectPlayingKeys] = useState([]);
  const chordDetectAudioCtxRef = useRef(null);
  const chordDetectPlaybackTimersRef = useRef([]);

  async function fnGetChordDetectAudioCtx() {
    if (typeof window === "undefined") return null;
    const vAudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!vAudioCtor) return null;

    let vCtx = chordDetectAudioCtxRef.current;
    if (!vCtx) {
      vCtx = new vAudioCtor();
      chordDetectAudioCtxRef.current = vCtx;
    }

    if (vCtx.state === "suspended") {
      try {
        await vCtx.resume();
      } catch {
        // El gesto de usuario puede no habilitar audio en todos los navegadores.
      }
    }

    return vCtx;
  }

  const clearChordDetectPlaybackVisuals = useCallback(() => {
    chordDetectPlaybackTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    chordDetectPlaybackTimersRef.current = [];
    setChordDetectPlayingKeys([]);
  }, []);

  async function playChordDetectNote(sIdx, fret) {
    const vCtx = await fnGetChordDetectAudioCtx();
    if (!vCtx) return;
    scheduleChordDetectMidi(vCtx, pitchAt(sIdx, fret), vCtx.currentTime, 1.2);
  }

  async function playChordDetectSelection() {
    if (!chordDetectPlaybackNotes.length) return;
    const vCtx = await fnGetChordDetectAudioCtx();
    if (!vCtx) return;

    const vNotes = chordDetectPlaybackNotes;
    const vStep = 0.14;
    const vDuration = 0.5;
    const vNow = vCtx.currentTime;

    clearChordDetectPlaybackVisuals();

    vNotes.forEach((vNote, vIdx) => {
      scheduleChordDetectMidi(vCtx, vNote.pitch, vNow + (vIdx * vStep), vDuration);
      const timerId = window.setTimeout(() => {
        setChordDetectPlayingKeys([vNote.key]);
      }, Math.max(0, Math.round(vIdx * vStep * 1000)));
      chordDetectPlaybackTimersRef.current.push(timerId);
    });

    const clearTimerId = window.setTimeout(() => {
      setChordDetectPlayingKeys([]);
      chordDetectPlaybackTimersRef.current = [];
    }, Math.max(0, Math.round(((vNotes.length - 1) * vStep * 1000) + (vDuration * 1000))));
    chordDetectPlaybackTimersRef.current.push(clearTimerId);
  }

  async function playChordDetectVoicingTogether() {
    if (!chordDetectPlaybackNotes.length) return;
    const vCtx = await fnGetChordDetectAudioCtx();
    if (!vCtx) return;

    const vNotes = chordDetectPlaybackNotes;
    const vDuration = 1.25;
    const vNow = vCtx.currentTime;

    clearChordDetectPlaybackVisuals();
    vNotes.forEach((vNote) => {
      scheduleChordDetectMidi(vCtx, vNote.pitch, vNow, vDuration);
    });
    setChordDetectPlayingKeys(vNotes.map((vNote) => vNote.key));

    const clearTimerId = window.setTimeout(() => {
      setChordDetectPlayingKeys([]);
      chordDetectPlaybackTimersRef.current = [];
    }, Math.max(0, Math.round(vDuration * 1000)));
    chordDetectPlaybackTimersRef.current.push(clearTimerId);
  }

  useEffect(() => {
    return () => {
      clearChordDetectPlaybackVisuals();
      const vCtx = chordDetectAudioCtxRef.current;
      if (vCtx && typeof vCtx.close === "function") {
        vCtx.close().catch(() => {});
      }
      chordDetectAudioCtxRef.current = null;
    };
  }, [clearChordDetectPlaybackVisuals]);

  useEffect(() => {
    if (chordDetectPlayingKeys.some((key) => !chordDetectSelectedKeys.includes(key))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      clearChordDetectPlaybackVisuals();
    }
  }, [chordDetectPlayingKeys, chordDetectSelectedKeys, clearChordDetectPlaybackVisuals]);

  return {
    chordDetectPlayingKeys,
    setChordDetectPlayingKeys,
    clearChordDetectPlaybackVisuals,
    playChordDetectNote,
    playChordDetectSelection,
    playChordDetectVoicingTogether,
  };
}
