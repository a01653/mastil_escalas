import { beforeAll, describe, expect, test } from "vitest";
import { analyzeSelectedNotes, mod12, noteNameToPc } from "./chordDetectionEngine.js";

// All 12 pitch classes with one canonical name each
const NOTES_12 = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

function* choose(arr, k) {
  if (k === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of choose(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

function buildInputs() {
  const inputs = [];

  // All C(12,3)=220 three-note combos × every note in combo as bass = 660 inputs
  for (const combo of choose(NOTES_12, 3)) {
    for (const bass of combo) {
      inputs.push({ notes: combo, bass });
    }
  }

  // C(12,4)=495 four-note combos — take every 4th to keep suite fast (~124 inputs)
  let idx = 0;
  for (const combo of choose(NOTES_12, 4)) {
    if (idx % 4 === 0) inputs.push({ notes: combo, bass: combo[0] });
    idx++;
  }

  return inputs;
}

// Pre-computed results (populated in beforeAll)
let RESULTS = [];

describe("detectionInvariants", () => {
  beforeAll(() => {
    const inputs = buildInputs();
    RESULTS = inputs.map(({ notes, bass }) => ({
      label: `[${notes.join(",")}/${bass}]`,
      result: analyzeSelectedNotes(notes, bass),
    }));
  }, 60_000);

  // Invariant 1: si quality es min/dim/hdim, no debe faltar el b3
  test("min/dim/hdim quality no tiene b3 faltante", { timeout: 30_000 }, () => {
    const violations = [];
    const thirdRe = /^[b#]?3$/;
    for (const { label, result } of RESULTS) {
      for (const r of result.readings) {
        const q = r.formula?.ui?.quality;
        if (!q || !["min", "dim", "hdim"].includes(q)) continue;
        if (r.missingLabels?.some((l) => thirdRe.test(l))) {
          violations.push(`${label} "${r.name}": quality=${q} missingLabels=${JSON.stringify(r.missingLabels)}`);
        }
      }
    }
    if (violations.length) {
      expect.fail(`${violations.length} violation(es):\n${violations.join("\n")}`);
    }
  });

  // Invariant 2: si quality es dim o hdim, b5 (intervalo 6) debe estar visible
  test("dim/hdim quality siempre tiene b5 en visibleIntervals", { timeout: 30_000 }, () => {
    const violations = [];
    for (const { label, result } of RESULTS) {
      for (const r of result.readings) {
        const q = r.formula?.ui?.quality;
        if (!q || !["dim", "hdim"].includes(q)) continue;
        if (!r.visibleIntervals?.some((v) => mod12(v) === 6)) {
          violations.push(`${label} "${r.name}": quality=${q} visibleIntervals=${JSON.stringify(r.visibleIntervals)}`);
        }
      }
    }
    if (violations.length) {
      expect.fail(`${violations.length} violation(es):\n${violations.join("\n")}`);
    }
  });

  // Invariant 3: slash /X en el nombre debe coincidir con el bajo real
  test("slash /X coincide con el bajo real (bassPc)", { timeout: 30_000 }, () => {
    const slashRe = /\/([A-Ga-g][b#]{0,2})$/;
    const violations = [];
    for (const { label, result } of RESULTS) {
      for (const r of result.readings) {
        const match = slashRe.exec(r.name);
        if (!match) continue;
        const slashPc = noteNameToPc(match[1]);
        if (slashPc == null) continue;
        if (mod12(slashPc) !== mod12(r.bassPc)) {
          violations.push(`${label} "${r.name}": slash=${match[1]}(pc=${slashPc}) ≠ bassPc=${r.bassPc}`);
        }
      }
    }
    if (violations.length) {
      expect.fail(`${violations.length} violation(es):\n${violations.join("\n")}`);
    }
  });

  // Invariant 4: no hay dos lecturas tercianas con misma raíz/bajo/intervalos y distinto sufijo
  // (excluye duplicados enarmónicos: "Ab" vs "G#" son la misma tríada, sufijo idéntico "")
  test("no hay alias duplicados para misma raíz/bajo/intervalos (no quartal)", { timeout: 30_000 }, () => {
    // Strip root note name and bass note name; compare only the structural suffix
    const rootRe = /^[A-G][#b]{0,2}/;
    const bassRe = /\/[A-G][#b]{0,2}$/;
    function chordSuffix(name) {
      return String(name || "").replace(rootRe, "").replace(bassRe, "");
    }

    const violations = [];
    for (const { label, result } of RESULTS) {
      const seen = new Map(); // key → { name, suffix }
      for (const r of result.readings) {
        if (r.formula?.quartal) continue;
        const key = [
          r.rootPc,
          r.bassPc,
          (r.visibleIntervals || []).slice().sort((a, b) => a - b).join(","),
          (r.missingLabels || []).slice().sort().join(","),
        ].join("|");
        const suffix = chordSuffix(r.name);
        const prev = seen.get(key);
        if (prev !== undefined && prev.suffix !== suffix) {
          violations.push(`${label} alias duplicado: "${prev.name}" y "${r.name}" (sufijos: "${prev.suffix}" vs "${suffix}")`);
        } else if (prev === undefined) {
          seen.set(key, { name: r.name, suffix });
        }
      }
    }
    if (violations.length) {
      expect.fail(`${violations.length} violation(es):\n${violations.join("\n")}`);
    }
  });
});
