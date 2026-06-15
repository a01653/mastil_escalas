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
      <div>
        <span className="font-semibold text-slate-800">Tonalidad probable: </span>
        <span className="font-bold text-sky-700">{best.label}</span>
        {" — encaje "}
        <span>{best.strength}</span>
        <span className="ml-1 text-slate-400">({best.percentage}%)</span>
      </div>

      {best.diatonicChords.length > 0 && (
        <div>
          <span className="font-semibold">Acordes diatónicos: </span>
          <span>{best.diatonicChords.join(", ")}</span>
        </div>
      )}

      {best.functionalChords.length > 0 && (
        <div>
          <div className="font-semibold">Acordes funcionales/no diatónicos:</div>
          <ul className="mt-0.5 space-y-0.5 pl-3">
            {best.functionalChords.map((f, i) => (
              <li key={i}>{f.explanation}</li>
            ))}
          </ul>
        </div>
      )}

      {best.outsideChords.length > 0 && (
        <div>
          <span className="font-semibold">Fuera de tonalidad: </span>
          <span className="text-slate-500">{best.outsideChords.join(", ")}</span>
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="border-t border-slate-200 pt-2 text-slate-500">
          <span className="font-semibold text-slate-600">Opciones alternativas: </span>
          {alternatives.map((k) => `${k.label} (${k.percentage}%)`).join(" · ")}
        </div>
      )}
    </div>
  );
}
