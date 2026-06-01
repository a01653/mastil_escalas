// @vitest-environment jsdom

import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useChordDetectionFeature } from "./useChordDetectionFeature.js";

let container = null;
let root = null;
let latestHarness = null;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function applyManualPattern(setChordDetectMode, setChordDetectSelectedKeys, pattern) {
  const FRET_CHARS = "0123456789ab";
  const source = String(pattern || "").toLowerCase();
  const newKeys = [];

  for (let i = 0; i < 6; i += 1) {
    const ch = source[i];
    if (ch === "x") continue;
    const fret = FRET_CHARS.indexOf(ch);
    if (fret === -1) continue;
    const sIdx = 5 - i;
    newKeys.push(`${sIdx}:${fret}`);
  }

  setChordDetectSelectedKeys(newKeys);
  setChordDetectMode(true);
}

function AutoselectHarness() {
  const chordDetection = useChordDetectionFeature({ maxFret: 15 });
  const {
    setChordDetectMode,
    chordDetectCandidateId, setChordDetectCandidateId,
    setChordRefEnabled,
    setChordRefNatural,
    setChordRefAcc,
    setChordRefQuality,
    setChordDetectSelectedKeys,
  } = chordDetection.state;
  const {
    lastChordDetectCandidateRef,
    pendingChordDetectCandidateRef,
    isManualCandidateSelectRef,
  } = chordDetection.refs;
  const {
    chordDetectCandidatesRanked,
    chordDetectSelectedCandidate,
  } = chordDetection.derived;

  function selectDetectedCandidate(candidate) {
    isManualCandidateSelectRef.current = true;
    lastChordDetectCandidateRef.current = candidate || null;
    pendingChordDetectCandidateRef.current = candidate || null;
    setChordDetectCandidateId(candidate?.id || null);
  }

  function clearChordDetectSelection() {
    pendingChordDetectCandidateRef.current = null;
    setChordDetectSelectedKeys([]);
    setChordDetectCandidateId(null);
    lastChordDetectCandidateRef.current = null;
  }

  function toggleChordDetectCell(sIdx, fret) {
    pendingChordDetectCandidateRef.current = chordDetectSelectedCandidate || lastChordDetectCandidateRef.current || null;
    const key = `${sIdx}:${fret}`;
    setChordDetectSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      const withoutSameString = prev.filter((x) => !String(x).startsWith(`${sIdx}:`));
      return [...withoutSameString, key];
    });
    setChordDetectMode(true);
  }

  useLayoutEffect(() => {
    latestHarness = {
      candidates: chordDetectCandidatesRanked,
      candidateId: chordDetectCandidateId,
      selectedCandidateName: chordDetectSelectedCandidate?.name || null,
      firstCandidateName: chordDetectCandidatesRanked[0]?.name || null,
      lastCandidateId: lastChordDetectCandidateRef.current?.id || null,
      pendingCandidateId: pendingChordDetectCandidateRef.current?.id || null,
      applyPattern: (pattern) => applyManualPattern(setChordDetectMode, setChordDetectSelectedKeys, pattern),
      clearSelection: clearChordDetectSelection,
      selectCandidate: selectDetectedCandidate,
      toggleCell: toggleChordDetectCell,
      setReferenceD7: () => {
        setChordRefEnabled(true);
        setChordRefNatural("D");
        setChordRefAcc(0);
        setChordRefQuality("7");
      },
      clearReference: () => setChordRefEnabled(false),
      getLivePendingCandidateId: () => pendingChordDetectCandidateRef.current?.id || null,
      getLiveLastCandidateId: () => lastChordDetectCandidateRef.current?.id || null,
    };
  });

  return null;
}

function renderHarness() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<AutoselectHarness />);
  });
}

function cleanupHarness() {
  if (root) {
    act(() => {
      root.unmount();
    });
  }
  root = null;
  if (container) {
    container.remove();
  }
  container = null;
  latestHarness = null;
}

function findCandidate(pattern) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
  const candidate = latestHarness?.candidates?.find((item) => regex.test(item?.name || ""));
  expect(candidate, `No se encontró candidato ${regex}. Disponibles: ${(latestHarness?.candidates || []).map((item) => item.name).join(" | ")}`).toBeTruthy();
  return candidate;
}

beforeEach(() => {
  renderHarness();
});

afterEach(() => {
  cleanupHarness();
});

describe("política React de autoselección de detección manual", () => {
  it("mantiene la selección manual cuando el candidato sigue existiendo tras cambiar el ranking", async () => {
    await act(async () => {
      latestHarness.setReferenceD7();
      latestHarness.applyPattern("x5555x");
    });

    expect(latestHarness.firstCandidateName).toBe("D9sus4(no5)");
    const manualCandidate = findCandidate(/^Cadd9\/D$/);
    expect(manualCandidate.id).not.toBe(latestHarness.candidates[0].id);

    await act(async () => {
      latestHarness.selectCandidate(manualCandidate);
    });

    expect(latestHarness.selectedCandidateName).toBe("Cadd9/D");

    await act(async () => {
      latestHarness.clearReference();
    });

    expect(latestHarness.firstCandidateName).toBe("Cadd9/D");
    expect(latestHarness.selectedCandidateName).toBe("Cadd9/D");
    expect(latestHarness.candidateId).toBe(manualCandidate.id);
  });

  it("si el candidato manual desaparece, cae a una resolución automática válida", async () => {
    await act(async () => {
      latestHarness.applyPattern("x5658x");
    });

    const disappearingCandidate = findCandidate(/^Cuartal mixto Ab$/);

    await act(async () => {
      latestHarness.selectCandidate(disappearingCandidate);
    });

    expect(latestHarness.selectedCandidateName).toBe(disappearingCandidate.name);

    await act(async () => {
      latestHarness.applyPattern("x5656x");
    });

    expect((latestHarness.candidates || []).some((candidate) => candidate.id === disappearingCandidate.id)).toBe(false);
    expect(latestHarness.selectedCandidateName).toBe("Dm7(b5)");
    expect(latestHarness.candidateId).not.toBe(disappearingCandidate.id);
  });

  it("usa pendingCandidate durante la edición física y evita saltar al primer candidato erróneo", async () => {
    await act(async () => {
      latestHarness.applyPattern("x5656x");
    });

    const previousCandidate = findCandidate(/^Ab6\(no5\)\/Ebb$/);

    await act(async () => {
      latestHarness.selectCandidate(previousCandidate);
    });

    expect(latestHarness.selectedCandidateName).toBe("Ab6(no5)/Ebb");

    await act(async () => {
      latestHarness.toggleCell(1, 8);
      expect(latestHarness.getLivePendingCandidateId()).toBe(previousCandidate.id);
    });

    expect(latestHarness.firstCandidateName).toBe("Dm7(b5,add11,no3)");
    expect(latestHarness.selectedCandidateName).toBe("Abmaj7b5/Ebb");
    expect(latestHarness.selectedCandidateName).not.toBe(latestHarness.firstCandidateName);
  });

  it("al vaciar la selección física limpia candidateId y refs de continuidad", async () => {
    await act(async () => {
      latestHarness.applyPattern("x5555x");
    });

    const selectedIdBeforeClear = latestHarness.candidateId;
    expect(selectedIdBeforeClear).not.toBeNull();
    expect(latestHarness.getLiveLastCandidateId()).toBe(selectedIdBeforeClear);

    await act(async () => {
      latestHarness.clearSelection();
    });

    expect(latestHarness.candidateId).toBeNull();
    expect(latestHarness.selectedCandidateName).toBeNull();
    expect(latestHarness.lastCandidateId).toBeNull();
    expect(latestHarness.pendingCandidateId).toBeNull();
  });
});
