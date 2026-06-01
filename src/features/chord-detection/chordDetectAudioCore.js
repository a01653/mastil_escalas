export function midiToFreq(vMidi) {
  return 440 * Math.pow(2, (Number(vMidi) - 69) / 12);
}

export function scheduleChordDetectMidi(vCtx, vMidi, vStartTime, vDuration = 1.2) {
  const vOsc = vCtx.createOscillator();
  const vGain = vCtx.createGain();

  vOsc.type = "triangle";
  vOsc.frequency.setValueAtTime(midiToFreq(vMidi), vStartTime);

  vGain.gain.setValueAtTime(0.0001, vStartTime);
  vGain.gain.exponentialRampToValueAtTime(0.16, vStartTime + 0.02);
  vGain.gain.exponentialRampToValueAtTime(0.08, vStartTime + 0.18);
  vGain.gain.exponentialRampToValueAtTime(0.045, vStartTime + 0.6);
  vGain.gain.exponentialRampToValueAtTime(0.0001, vStartTime + Math.max(0.75, vDuration - 0.05));

  vOsc.connect(vGain);
  vGain.connect(vCtx.destination);

  vOsc.start(vStartTime);
  vOsc.stop(vStartTime + vDuration);
  vOsc.onended = () => {
    try { vOsc.disconnect(); } catch {
      // El nodo puede estar ya desconectado.
    }
    try { vGain.disconnect(); } catch {
      // El nodo puede estar ya desconectado.
    }
  };
}
