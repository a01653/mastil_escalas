import { describe, expect, it, vi } from "vitest";
import { midiToFreq, scheduleChordDetectMidi } from "./chordDetectAudioCore.js";

describe("midiToFreq", () => {
  it("MIDI 69 (A4) → 440 Hz", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 5);
  });

  it("MIDI 60 (C4) → ~261.63 Hz", () => {
    expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
  });
});

describe("scheduleChordDetectMidi", () => {
  function makeMockCtx() {
    const osc = {
      type: null,
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    };
    const gain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    return {
      ctx: { createOscillator: vi.fn(() => osc), createGain: vi.fn(() => gain), destination: {} },
      osc,
      gain,
    };
  }

  it("crea oscillator y gain, conecta nodos y programa start/stop", () => {
    const { ctx, osc, gain } = makeMockCtx();
    scheduleChordDetectMidi(ctx, 69, 0, 1.2);

    expect(ctx.createOscillator).toHaveBeenCalledOnce();
    expect(ctx.createGain).toHaveBeenCalledOnce();
    expect(osc.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(ctx.destination);
    expect(osc.start).toHaveBeenCalledWith(0);
    expect(osc.stop).toHaveBeenCalledWith(1.2);
  });

  it("usa la frecuencia correcta para el MIDI recibido", () => {
    const { ctx, osc } = makeMockCtx();
    scheduleChordDetectMidi(ctx, 69, 0.5, 1.2);

    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0.5);
  });
});
