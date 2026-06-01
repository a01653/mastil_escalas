// @vitest-environment jsdom

import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useChordDetectionAudio } from "./useChordDetectionAudio.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container = null;
let root = null;
let latestHarness = null;

function AudioHarness({ playbackNotes = [], selectedKeys = [] }) {
  const audio = useChordDetectionAudio({
    chordDetectPlaybackNotes: playbackNotes,
    chordDetectSelectedKeys: selectedKeys,
  });
  useLayoutEffect(() => {
    latestHarness = audio;
  });
  return null;
}

function renderHarness(props = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<AudioHarness {...props} />);
  });
}

function cleanupHarness() {
  if (root) act(() => { root.unmount(); });
  root = null;
  if (container) container.remove();
  container = null;
  latestHarness = null;
}

beforeEach(() => renderHarness());
afterEach(() => cleanupHarness());

describe("useChordDetectionAudio", () => {
  it("chordDetectPlayingKeys arranca vacío", () => {
    expect(latestHarness.chordDetectPlayingKeys).toEqual([]);
  });

  it("clearChordDetectPlaybackVisuals resetea chordDetectPlayingKeys a []", () => {
    // selectedKeys debe incluir las playing keys para que el guard no las limpie antes
    act(() => root.render(<AudioHarness selectedKeys={["2:3", "4:5"]} />));
    act(() => latestHarness.setChordDetectPlayingKeys(["2:3", "4:5"]));
    expect(latestHarness.chordDetectPlayingKeys).toEqual(["2:3", "4:5"]);

    act(() => latestHarness.clearChordDetectPlaybackVisuals());
    expect(latestHarness.chordDetectPlayingKeys).toEqual([]);
  });

  it("guard de sync: si una key sonando ya no está en selection, limpia playingKeys", () => {
    act(() => root.render(<AudioHarness selectedKeys={["2:3", "4:5"]} />));
    act(() => latestHarness.setChordDetectPlayingKeys(["2:3"]));
    expect(latestHarness.chordDetectPlayingKeys).toEqual(["2:3"]);

    // La selection ya no incluye "2:3" → el guard debe limpiar
    act(() => root.render(<AudioHarness selectedKeys={[]} />));
    expect(latestHarness.chordDetectPlayingKeys).toEqual([]);
  });

  it("guard de sync: no limpia si todas las keys sonando siguen en selection", () => {
    act(() => root.render(<AudioHarness selectedKeys={["2:3", "4:5"]} />));
    act(() => latestHarness.setChordDetectPlayingKeys(["2:3"]));

    // La selection sigue incluyendo "2:3" → no debe limpiar
    act(() => root.render(<AudioHarness selectedKeys={["2:3", "0:0"]} />));
    expect(latestHarness.chordDetectPlayingKeys).toEqual(["2:3"]);
  });
});
