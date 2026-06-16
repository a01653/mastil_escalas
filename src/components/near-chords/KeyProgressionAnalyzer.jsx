import React, { useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { analyzeProgression } from "../../music/keyAnalysisEngine.js";

const STORAGE_KEY = "key_analyzer_open";

function readStoredOpen() {
  try { return window.localStorage.getItem(STORAGE_KEY) === "1"; }
  catch { return false; }
}

function writeStoredOpen(val) {
  try { window.localStorage.setItem(STORAGE_KEY, val ? "1" : "0"); }
  catch { /* localStorage no disponible */ }
}

export default function KeyProgressionAnalyzer() {
  const [open, setOpen] = useState(readStoredOpen);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      writeStoredOpen(!prev);
      return !prev;
    });
  }, []);

  const handleAnalyze = useCallback(() => {
    setResult(analyzeProgression(input));
  }, [input]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAnalyze();
    },
    [handleAnalyze]
  );

  return (
    <section
      className="rounded-md border border-slate-200 bg-white shadow-sm"
      data-testid="key-analyzer"
    >
      <button
        type="button"
        data-testid="key-analyzer-toggle"
        className="flex w-full items-center justify-between gap-2 rounded-t-md px-3 py-2 text-left"
        style={{ backgroundColor: "var(--section-header-bg, #c7d8e5)" }}
        onClick={handleToggle}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-slate-800">
            Analizador de tonalidad / progresión
          </div>
          {!open && (
            <div className="mt-0.5 text-xs text-slate-500">
              Escribe acordes de una canción o fragmento para estimar la tonalidad probable.
            </div>
          )}
        </div>
        <div className="shrink-0 text-slate-600">
          {open ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      </button>

      {open && (
        <div className="space-y-3 bg-white p-3">
          <p className="text-xs text-slate-600">
            Escribe acordes de una canción o fragmento para estimar la tonalidad probable.
            Separa con espacios, <code className="rounded bg-slate-100 px-1">|</code>, comas o saltos de línea.
            Acepta slash chords como <code className="rounded bg-slate-100 px-1">A/E</code>.
          </p>

          <textarea
            data-testid="key-analyzer-input"
            className="w-full rounded border border-slate-300 p-2 font-mono text-sm focus:border-slate-500 focus:outline-none"
            rows={2}
            placeholder="Ej.: F# | Bm | A/E | D/F#"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="key-analyzer-btn"
              className="rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              onClick={handleAnalyze}
            >
              Analizar
            </button>
            <span className="text-xs text-slate-400">o Ctrl+Enter</span>
          </div>

          {result && (
            <div data-testid="key-analyzer-result">
              <KeyAnalysisResult result={result} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Badge de acorde usado ────────────────────────────────────────────────────
// #0284C7 = sky-600; borde #0369A1 = sky-700

const BADGE_USED = "rounded border px-1.5 py-0.5 font-mono text-xs font-bold text-white";
const BADGE_USED_STYLE = { background: "#0284C7", borderColor: "#0369A1" };

function DiatonicTable({ diatonicTable, label, testId }) {
  if (!diatonicTable?.length) return null;
  return (
    <div>
      <div className="mb-1.5 font-semibold text-slate-700">Grados en {label}:</div>
      <div className="overflow-x-auto">
        <div
          data-testid={testId ?? "diatonic-table"}
          style={{
            display: "inline-grid",
            gridTemplateColumns: `repeat(${diatonicTable.length}, minmax(60px, 84px))`,
            columnGap: "8px",
            rowGap: "4px",
          }}
        >
          {diatonicTable.map((d) => (
            <div
              key={`deg-${d.degree}`}
              className={`text-center font-mono text-xs font-bold ${d.used ? "text-slate-800" : "text-slate-400"}`}
            >
              {d.degree}
            </div>
          ))}
          {diatonicTable.map((d) => (
            <div key={`name-${d.degree}`} className="flex justify-center">
              {d.used ? (
                <span className={BADGE_USED} style={BADGE_USED_STYLE}>
                  {d.name}
                </span>
              ) : (
                <span className="font-mono text-xs text-slate-400">{d.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChordDegreesMap({ chordDegrees }) {
  const entries = Object.entries(chordDegrees ?? {});
  if (!entries.length) return null;
  return (
    <div>
      <div className="mb-1 font-semibold text-slate-700">Acordes introducidos:</div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono">
        {entries.map(([sym, deg]) => (
          <span key={sym}>
            <span className="font-semibold text-sky-800">{sym}</span>
            <span className="mx-1 text-slate-400">→</span>
            <span className="text-sky-600">{deg}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function KeyBlock({ keyData, isMain }) {
  return (
    <div className={isMain ? "space-y-2" : "space-y-1.5 border-t border-slate-200 pt-2"}>
      <div>
        {isMain ? (
          <>
            <span className="font-semibold text-slate-800">Tonalidad probable: </span>
            <span className="font-bold text-sky-700">{keyData.label}</span>
            {" — encaje "}
            <span>{keyData.strength}</span>
            <span className="ml-1 text-slate-400">({keyData.percentage}%)</span>
          </>
        ) : (
          <>
            <span className="font-semibold text-slate-600">Alternativa: </span>
            <span className="font-semibold text-slate-700">{keyData.label}</span>
            <span className="ml-1 text-slate-400">({keyData.percentage}%)</span>
          </>
        )}
      </div>

      {keyData.diatonicChords.length > 0 && (
        <div>
          <span className="font-semibold">Acordes diatónicos: </span>
          <span>{keyData.diatonicChords.join(", ")}</span>
        </div>
      )}

      {keyData.diatonicTable?.length > 0 && (
        <DiatonicTable
          diatonicTable={keyData.diatonicTable}
          label={keyData.label}
          testId={isMain ? "diatonic-table" : `diatonic-table-alt-${keyData.label}`}
        />
      )}

      {Object.keys(keyData.chordDegrees ?? {}).length > 0 && (
        <ChordDegreesMap chordDegrees={keyData.chordDegrees} />
      )}

      {keyData.functionalChords.length > 0 && (
        <div>
          <div className="font-semibold">Acordes funcionales/no diatónicos:</div>
          <ul className="mt-0.5 space-y-0.5 pl-3">
            {keyData.functionalChords.map((f, i) => (
              <li key={i}>{f.explanation}</li>
            ))}
          </ul>
        </div>
      )}

      {keyData.outsideChords.length > 0 && (
        <div>
          <span className="font-semibold">Fuera de tonalidad: </span>
          <span className="text-slate-500">{keyData.outsideChords.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

function KeyAnalysisResult({ result }) {
  if (result.isEmpty || !result.keys.length) {
    return (
      <p className="text-xs text-slate-500">
        {result.isEmpty
          ? "Introduce una progresión para analizar."
          : "No se encontró ninguna tonalidad con encaje razonable."}
      </p>
    );
  }

  const [best, ...rest] = result.keys;
  const alternatives = rest.filter((k) => k.score >= best.score - 1);

  return (
    <div className="space-y-2 rounded border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
      <KeyBlock keyData={best} isMain={true} />
      {alternatives.map((k) => (
        <KeyBlock key={k.label} keyData={k} isMain={false} />
      ))}
    </div>
  );
}
