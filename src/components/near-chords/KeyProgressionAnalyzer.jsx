import React, { useState, useCallback, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { analyzeProgression } from "../../music/keyAnalysisEngine.js";

export default function KeyProgressionAnalyzer({
  open,
  setOpen,
  input,
  setInput,
  expandedModal,
  setExpandedModal,
  modalScaleIdxs,
  setModalScaleIdxs,
  keyScaleIdxs,
  setKeyScaleIdxs,
  expandedKeys,
  setExpandedKeys,
  modalSectionOpen,
  setModalSectionOpen,
}) {
  const [result, setResult] = useState(null);
  const autoAnalyzedRef = useRef(false);

  useEffect(() => {
    if (!autoAnalyzedRef.current && input.trim()) {
      autoAnalyzedRef.current = true;
      setResult(analyzeProgression(input));
    }
  }, [input]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(() => setOpen((p) => !p), [setOpen]);

  const handleAnalyze = useCallback(() => {
    setResult(analyzeProgression(input));
  }, [input]);

  const handleKeyDown = useCallback(
    (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAnalyze(); },
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
            Separa con espacios,{" "}
            <code className="rounded bg-slate-100 px-1">|</code>, comas o saltos de línea.
            Acepta slash chords como{" "}
            <code className="rounded bg-slate-100 px-1">A/E</code>.
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
              <KeyAnalysisResult
                result={result}
                expandedModal={expandedModal}
                setExpandedModal={setExpandedModal}
                modalScaleIdxs={modalScaleIdxs}
                setModalScaleIdxs={setModalScaleIdxs}
                keyScaleIdxs={keyScaleIdxs}
                setKeyScaleIdxs={setKeyScaleIdxs}
                expandedKeys={expandedKeys}
                setExpandedKeys={setExpandedKeys}
                modalSectionOpen={modalSectionOpen}
                setModalSectionOpen={setModalSectionOpen}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers compartidos
// ─────────────────────────────────────────────────────────────────────────────

const BADGE_USED = "rounded border px-1.5 py-0.5 font-mono text-xs font-bold text-white";
const BADGE_USED_STYLE = { background: "#0284C7", borderColor: "#0369A1" };

function DetailLabel({ children }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </div>
  );
}

function BlockHeader({ children, slate = false }) {
  return (
    <div
      className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${
        slate ? "text-slate-500" : "text-sky-700"
      }`}
    >
      {children}
    </div>
  );
}

function DiatonicTable({ diatonicTable, label, testId, hideLabel = false }) {
  if (!diatonicTable?.length) return null;
  return (
    <div>
      {!hideLabel && (
        <div className="mb-1.5 font-semibold text-slate-700">Grados en {label}:</div>
      )}
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
              className={`text-center font-mono text-xs font-bold ${
                d.used ? "text-slate-800" : "text-slate-400"
              }`}
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

function ChordDegreesMap({ chordDegrees, hideHeader = false }) {
  const entries = Object.entries(chordDegrees ?? {});
  if (!entries.length) return null;
  return (
    <div>
      {!hideHeader && (
        <div className="mb-1 font-semibold text-slate-700">Acordes introducidos:</div>
      )}
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

function ScaleCombo({ scales, selectedIdx, onSelect, testIdPrefix = "modal" }) {
  const selected = scales[selectedIdx] ?? scales[0];
  return (
    <div data-testid={`${testIdPrefix}-scale-combo`}>
      <DetailLabel>Escalas sugeridas</DetailLabel>
      <select
        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
        value={selectedIdx}
        onChange={(e) => onSelect(Number(e.target.value))}
        data-testid={`${testIdPrefix}-scale-select`}
        aria-label="Escala sugerida"
      >
        {scales.map((s, i) => (
          <option key={s.id} value={i}>{s.name}</option>
        ))}
      </select>
      {selected && (
        <div className="mt-1.5 space-y-1">
          <div
            className="overflow-x-auto rounded border border-sky-100 bg-sky-50 p-2"
            data-testid={`${testIdPrefix}-scale-notes`}
          >
            {selected.degrees?.length ? (
              <div
                className="inline-grid gap-x-2.5 gap-y-0.5"
                style={{
                  gridTemplateColumns: `repeat(${selected.notes.length}, minmax(28px, auto))`,
                }}
              >
                {selected.degrees.map((d, i) => (
                  <div key={`d-${i}`} className="text-center font-mono text-[10px] text-slate-400">
                    {d}
                  </div>
                ))}
                {selected.notes.map((n, i) => (
                  <div key={`n-${i}`} className="text-center font-mono text-xs font-semibold text-slate-800">
                    {n}
                  </div>
                ))}
              </div>
            ) : (
              <span className="font-mono text-xs tracking-wide text-slate-700">
                {selected.notes.join("  ")}
              </span>
            )}
          </div>
          {selected.relativeNote && (
            <div
              className="text-[10px] italic text-slate-400"
              data-testid={`${testIdPrefix}-scale-relative-note`}
            >
              {selected.relativeNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Acordeón de tonalidad — controlado desde App.jsx
// ─────────────────────────────────────────────────────────────────────────────

function KeyAccordion({
  keyData,
  isMain,
  index,
  keyScaleIdxs,
  setKeyScaleIdxs,
  expandedKeys,
  setExpandedKeys,
}) {
  // Si el usuario ha establecido explícitamente un estado, usarlo;
  // de lo contrario, el default es: main=abierto, alternativas=cerradas.
  const isOpen =
    expandedKeys?.[keyData.label] !== undefined
      ? expandedKeys[keyData.label]
      : isMain;

  const handleToggle = useCallback(() => {
    setExpandedKeys((prev) => ({ ...prev, [keyData.label]: !isOpen }));
  }, [keyData.label, isOpen, setExpandedKeys]);

  const scaleIdx = keyScaleIdxs?.[keyData.label] ?? 0;
  const handleScaleSelect = useCallback(
    (idx) => setKeyScaleIdxs((prev) => ({ ...prev, [keyData.label]: idx })),
    [keyData.label, setKeyScaleIdxs]
  );

  const testIdBase = isMain ? "key-block-main" : `key-block-alt-${index}`;

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${
        isOpen ? "border-sky-300 shadow-sm" : "border-sky-100 hover:border-sky-200"
      }`}
      data-testid={testIdBase}
    >
      <button
        type="button"
        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors ${
          isOpen
            ? "bg-sky-50 text-slate-800"
            : "bg-white text-slate-700 hover:bg-sky-50"
        }`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        data-testid={`${testIdBase}-toggle`}
      >
        <span
          className={`shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-90 text-sky-600" : "text-slate-400"
          }`}
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          {isMain ? (
            <>
              <span className="text-slate-500">Tonalidad probable: </span>
              <span className="font-bold text-sky-700">{keyData.label}</span>
              {" — encaje "}
              <span>{keyData.strength}</span>
              <span className="ml-1 text-slate-400">({keyData.percentage}%)</span>
            </>
          ) : (
            <>
              <span className="text-slate-500">Alternativa: </span>
              <span className="font-semibold text-slate-700">{keyData.label}</span>
              {" — encaje "}
              <span>{keyData.strength}</span>
              <span className="ml-1 text-slate-400">({keyData.percentage}%)</span>
            </>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 border-t border-sky-100 bg-white p-3 text-xs text-slate-700">
          {keyData.diatonicChords.length > 0 && (
            <div className="rounded-md border border-sky-100 bg-sky-50 p-2">
              <BlockHeader>Acordes diatónicos</BlockHeader>
              <span>{keyData.diatonicChords.join(", ")}</span>
            </div>
          )}

          {keyData.diatonicTable?.length > 0 && (
            <div className="rounded-md border border-sky-100 bg-sky-50 p-2">
              <BlockHeader>Grados en {keyData.label}</BlockHeader>
              <DiatonicTable
                diatonicTable={keyData.diatonicTable}
                label={keyData.label}
                testId={isMain ? "diatonic-table" : `diatonic-table-alt-${keyData.label}`}
                hideLabel
              />
            </div>
          )}

          {Object.keys(keyData.chordDegrees ?? {}).length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <BlockHeader slate>Acordes introducidos</BlockHeader>
              <ChordDegreesMap chordDegrees={keyData.chordDegrees} hideHeader />
            </div>
          )}

          {keyData.functionalChords.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <BlockHeader slate>Acordes funcionales / no diatónicos</BlockHeader>
              <ul className="mt-0.5 space-y-0.5 pl-3">
                {keyData.functionalChords.map((f, i) => (
                  <li key={i}>{f.explanation}</li>
                ))}
              </ul>
            </div>
          )}

          {keyData.outsideChords.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <span className="font-semibold text-slate-600">Fuera de tonalidad: </span>
              <span className="text-slate-500">{keyData.outsideChords.join(", ")}</span>
            </div>
          )}

          {keyData.suggestedScales?.length > 0 && (
            <ScaleCombo
              scales={keyData.suggestedScales}
              selectedIdx={scaleIdx}
              onSelect={handleScaleSelect}
              testIdPrefix="key"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Centros modales — sectionOpen controlado desde App.jsx
// ─────────────────────────────────────────────────────────────────────────────

function ModalCenterDetail({ mc, scaleIdx, onScaleSelect }) {
  return (
    <div className="space-y-2 text-xs text-slate-700">
      <div className="rounded-md border border-sky-100 bg-sky-50 p-2 space-y-2">
        <div>
          <DetailLabel>Escala madre</DetailLabel>
          <span className="font-mono text-slate-700">{mc.parentLabel}</span>
        </div>
        <div>
          <DetailLabel>Notas</DetailLabel>
          <span
            className="font-mono tracking-wide text-slate-800"
            data-testid="modal-center-notes"
          >
            {mc.modeNotes.join("  ")}
          </span>
        </div>
      </div>

      {mc.diatonicTable?.length > 0 && (
        <div className="rounded-md border border-sky-100 bg-sky-50 p-2">
          <DiatonicTable
            diatonicTable={mc.diatonicTable}
            label={mc.label}
            testId={`modal-diatonic-${mc.dedupKey}`}
          />
        </div>
      )}

      {Object.keys(mc.chordDegrees ?? {}).length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <BlockHeader slate>Acordes introducidos</BlockHeader>
          <ChordDegreesMap chordDegrees={mc.chordDegrees} hideHeader />
        </div>
      )}

      {mc.suggestedScales?.length > 0 && (
        <ScaleCombo
          scales={mc.suggestedScales}
          selectedIdx={scaleIdx}
          onSelect={onScaleSelect}
        />
      )}
    </div>
  );
}

function ModalCentersSection({
  modalCenters,
  expandedModal,
  setExpandedModal,
  modalScaleIdxs,
  setModalScaleIdxs,
  sectionOpen,
  setSectionOpen,
}) {
  if (!modalCenters?.length) return null;

  const handleToggleCenter = (label) => {
    setExpandedModal((prev) => (prev === label ? null : label));
  };

  const handleScaleSelect = (label, idx) => {
    setModalScaleIdxs((prev) => ({ ...prev, [label]: idx }));
  };

  return (
    <div
      className="rounded-xl border border-sky-200 bg-white shadow-sm overflow-hidden"
      data-testid="modal-centers-section"
    >
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left border-b border-sky-200 bg-sky-100 transition-colors hover:bg-sky-200"
        onClick={() => setSectionOpen((v) => !v)}
        data-testid="modal-centers-toggle"
        aria-expanded={sectionOpen}
      >
        <span
          className={`shrink-0 transition-transform duration-150 ${
            sectionOpen ? "rotate-90 text-sky-700" : "text-sky-600"
          }`}
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-sky-950">
          Centros modales compatibles
        </span>
      </button>

      {sectionOpen && (
        <div className="p-2 space-y-1.5" data-testid="modal-centers-list">
          {modalCenters.map((mc) => {
            const isExpanded = expandedModal === mc.label;
            const scaleIdx = modalScaleIdxs?.[mc.label] ?? 0;
            return (
              <div
                key={mc.dedupKey}
                className={`overflow-hidden rounded-lg border transition-colors ${
                  isExpanded
                    ? "border-sky-300 shadow-sm"
                    : "border-sky-100 hover:border-sky-200"
                }`}
                data-testid={`modal-center-${mc.dedupKey}`}
              >
                <button
                  type="button"
                  className={`flex w-full items-start gap-1.5 px-2.5 py-2 text-left text-xs transition-colors ${
                    isExpanded
                      ? "bg-sky-50 font-medium text-slate-800"
                      : "bg-white text-slate-700 hover:bg-sky-50"
                  }`}
                  onClick={() => handleToggleCenter(mc.label)}
                  aria-expanded={isExpanded}
                  data-testid={`modal-center-toggle-${mc.dedupKey}`}
                >
                  <span
                    className={`mt-0.5 shrink-0 transition-all duration-150 ${
                      isExpanded ? "rotate-90 text-sky-600" : "text-slate-400"
                    }`}
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`font-semibold ${
                        isExpanded ? "text-slate-800" : "text-slate-700"
                      }`}
                    >
                      {mc.label}
                    </span>
                    <span className="ml-1.5 text-slate-400">—</span>
                    <span
                      className="ml-1.5 font-mono text-slate-500"
                      data-testid={`modal-summary-${mc.dedupKey}`}
                    >
                      {mc.summary}
                    </span>
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-sky-100 bg-white px-3 pb-3 pt-2.5">
                    <ModalCenterDetail
                      mc={mc}
                      scaleIdx={scaleIdx}
                      onScaleSelect={(idx) => handleScaleSelect(mc.label, idx)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resultado del análisis — dos tarjetas
// ─────────────────────────────────────────────────────────────────────────────

function KeyAnalysisResult({
  result,
  expandedModal,
  setExpandedModal,
  modalScaleIdxs,
  setModalScaleIdxs,
  keyScaleIdxs,
  setKeyScaleIdxs,
  expandedKeys,
  setExpandedKeys,
  modalSectionOpen,
  setModalSectionOpen,
}) {
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
    <div className="space-y-3">
      {/* Tarjeta 1: Tonalidades detectadas */}
      <div className="overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm">
        <div className="border-b border-sky-200 bg-sky-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-sky-950">
          Tonalidades detectadas
        </div>
        <div className="space-y-1.5 p-2">
          <KeyAccordion
            keyData={best}
            isMain={true}
            index={0}
            keyScaleIdxs={keyScaleIdxs}
            setKeyScaleIdxs={setKeyScaleIdxs}
            expandedKeys={expandedKeys}
            setExpandedKeys={setExpandedKeys}
          />
          {alternatives.map((k, i) => (
            <KeyAccordion
              key={k.label}
              keyData={k}
              isMain={false}
              index={i}
              keyScaleIdxs={keyScaleIdxs}
              setKeyScaleIdxs={setKeyScaleIdxs}
              expandedKeys={expandedKeys}
              setExpandedKeys={setExpandedKeys}
            />
          ))}
        </div>
      </div>

      {/* Tarjeta 2: Centros modales compatibles */}
      {result.modalCenters?.length > 0 && (
        <ModalCentersSection
          modalCenters={result.modalCenters}
          expandedModal={expandedModal}
          setExpandedModal={setExpandedModal}
          modalScaleIdxs={modalScaleIdxs}
          setModalScaleIdxs={setModalScaleIdxs}
          sectionOpen={modalSectionOpen}
          setSectionOpen={setModalSectionOpen}
        />
      )}
    </div>
  );
}
