import { BookOpen, ChevronLeft, ChevronRight, Eraser, Music, Play, Volume2, VolumeX } from "lucide-react";
import { CopyVoicingButton } from "./ChordsPanel.jsx";
import { CHORD_FORMS, FRET_INLAY_BG, buildDetectedCandidateBackgroundLabelForPc, buildDetectedCandidateNoteNameForPc, mod12 } from "../../music/appMusicBasics.js";
import { classifyManualVoicingShape, studyVoicingFormLabel, formatBassLabelForTitle } from "../../music/appVoicingStudyCore.js";
import { STRINGS, fretGridCols, hasInlayCell } from "../../music/appStaticData.js";
import { ChordNoteBadgeStrip, MusicStaff } from "../../music/appPatternRouteStaffCore.jsx";

export default function ManualChordPanel({ layout, reading, actions, reference, patternInput, fretboard, candidates, staff, ui }) {
  const { isCompactLayout, isMobileLayout, isNarrowBoardLayout } = layout;
  const {
    chordDetectSelectedNotes,
    chordDetectSelectedCandidate,
    studyData,
    chordDetectPhysicalPatternText,
    chordPreferSharps,
    chordDetectSelectedCandidateBadgeItems,
    chordDetectSelectedCandidateBassNote,
    colors,
  } = reading;
  const {
    chordDetectClickAudio,
    setChordDetectClickAudio,
    fnPlayChordDetectSelection,
    fnPlayChordDetectVoicingTogether,
    clearChordDetectSelection,
    openMainChordStudy,
  } = actions;
  const {
    chordDetectPrioritizeContext,
    updateChordDetectPrioritizeContext,
    chordRefEnabled,
    setChordRefEnabled,
    chordRefNatural,
    setChordRefNatural,
    CHORD_REF_NATURAL_LETTERS,
    chordRefAcc,
    setChordRefAcc,
    chordRefQuality,
    setChordRefQuality,
    CHORD_REF_QUALITIES,
  } = reference;
  const { voicingInputText, setVoicingInputText, setChordDetectSelectedKeys, chordDetectMode, setChordDetectMode } = patternInput;
  const {
    chordDetectPanelRef,
    chordDetectPlayingKeys,
    chordDetectSelectedKeys,
    setChordDetectWindowStart,
    chordDetectWindowStartMin,
    chordDetectWindowFrom,
    chordDetectWindowTo,
    chordDetectWindowAllowedStartMax,
    MobileMainFretboard: MobileMainFretboardView,
    chordDetectVisibleFrets,
    toggleChordDetectCell,
    mobileVerticalFretBorderClass,
    HoverCellNote: HoverCellNoteView,
    ChordInvestigationCircle: ChordInvestigationCircleView,
    showNonScale,
    showIntervalsLabel,
    showNotesLabel,
    labelForCellAt,
    maxFret,
  } = fretboard;
  const {
    InfoTitle: InfoTitleView,
    DETECTED_CHORDS_INFO_TEXT,
    chordDetectCandidatesRanked,
    chordDetectCandidateId,
    selectDetectedCandidate,
    formatChordNamePure,
    applyDetectedCandidate,
  } = candidates;
  const { chordDetectStaffEvents, chordDetectSelectionPositionsText } = staff;
  const { UI_BTN_SM } = ui;

  const selectedMap = new Map();

  if (chordDetectSelectedNotes.length) {
    const bassKey = chordDetectSelectedNotes[0]?.key || null;
    for (const n of chordDetectSelectedNotes) {
      selectedMap.set(`${n.sIdx}:${n.fret}`, {
        pc: n.pc,
        isBass: n.key === bassKey,
        isPlaying: chordDetectPlayingKeys.includes(n.key),
      });
    }
  }

  const selectedStrings = new Set(chordDetectSelectedNotes.map((n) => n.sIdx));
  const chordDetectIconButtonBaseClass = "inline-flex h-7 w-7 items-center justify-center rounded-xl border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

  // ── Lectura detectada (computed at top level) ────────────────────────────
  const cand = chordDetectSelectedCandidate;
  let chordPart = null;
  if (cand) {
    const plan = studyData?.plan;
    const voicing = studyData?.voicing;
    // Try to classify the manual voicing drop form; fall back to Abierto/Cerrado
    const detectedFormValue = classifyManualVoicingShape(voicing, cand);
    const dropLabel = detectedFormValue
      ? CHORD_FORMS.find((x) => x.value === detectedFormValue)?.label
      : null;
    const posLabel = studyVoicingFormLabel(voicing, plan?.form);
    const invLabel = formatBassLabelForTitle(studyData?.inversionLabel);
    const parts = [cand.name];
    if (dropLabel) parts.push(dropLabel);
    parts.push(posLabel);
    if (invLabel && invLabel !== "Fundamental") parts.push(invLabel);
    chordPart = parts.filter(Boolean).join(" · ");
  }
  const physicalPatternSuffix = chordDetectPhysicalPatternText ? ` (${chordDetectPhysicalPatternText})` : "";

  // Mapa sIdx → nombre de nota seleccionada (para mostrar en el mástil).
  // Usa buildDetectedCandidateNoteNameForPc (sistema de letras musicales) para que
  // el spelling coincida con la lectura activa: Gm/Bb → "Bb", no "A#".
  const prefer = chordDetectSelectedCandidate?.preferSharps ?? chordPreferSharps;
  const stringSelectedNoteName = {};
  for (const n of chordDetectSelectedNotes) {
    stringSelectedNoteName[n.sIdx] = buildDetectedCandidateNoteNameForPc(n.pc, chordDetectSelectedCandidate, prefer);
  }

  return (
    <div
      ref={chordDetectPanelRef}
      tabIndex={-1}
      aria-label="Selección manual"
      className="focus:outline-none"
    >

      {/* ══════════════════════════════════════════════════════════════════
          Cuadro 1 — Lectura detectada
      ══════════════════════════════════════════════════════════════════ */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
        {/* Bloque voicing + botones — extraído para reusar en desktop (derecha) y compacto (abajo) */}
        {(() => {
          const voicingAndButtons = (
            <>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-slate-600">Voicing</div>
                <div className="flex items-center gap-1.5">
                  <CopyVoicingButton frets={chordDetectPhysicalPatternText || null} />
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    aria-label="Voicing"
                    value={chordDetectPhysicalPatternText || "—"}
                    className="h-7 w-[88px] cursor-default rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 focus:outline-none"
                    data-testid="manual-voicing-display"
                  />
                </div>
              </div>
              <button
                type="button"
                className={`${chordDetectIconButtonBaseClass} ${chordDetectClickAudio ? "border-emerald-300 bg-emerald-50 text-emerald-700 enabled:hover:border-emerald-400 enabled:hover:bg-emerald-100 enabled:hover:text-emerald-800" : "border-slate-200 bg-white text-slate-500 enabled:hover:border-emerald-300 enabled:hover:bg-emerald-50 enabled:hover:text-emerald-700"}`}
                title={chordDetectClickAudio ? "Desactivar sonido al pulsar" : "Activar sonido al pulsar"}
                aria-label={chordDetectClickAudio ? "Desactivar sonido al pulsar" : "Activar sonido al pulsar"}
                aria-pressed={chordDetectClickAudio}
                onClick={() => setChordDetectClickAudio((value) => !value)}
              >
                {chordDetectClickAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className={`${chordDetectIconButtonBaseClass} border-slate-200 bg-white text-slate-600 enabled:hover:border-sky-300 enabled:hover:bg-sky-50 enabled:hover:text-sky-700`}
                title="Reproducir la selección actual cuerda a cuerda, de 6ª a 1ª"
                aria-label="Reproducir la selección actual cuerda a cuerda, de 6ª a 1ª"
                onClick={() => fnPlayChordDetectSelection()}
                disabled={!chordDetectSelectedKeys.length}
              >
                <Play className="h-4 w-4 fill-current" />
              </button>
              <button
                type="button"
                className={`${chordDetectIconButtonBaseClass} border-slate-200 bg-white text-slate-600 enabled:hover:border-indigo-300 enabled:hover:bg-indigo-50 enabled:hover:text-indigo-700`}
                title="Reproducir todo el voicing a la vez"
                aria-label="Reproducir todo el voicing a la vez"
                onClick={() => fnPlayChordDetectVoicingTogether()}
                disabled={!chordDetectSelectedKeys.length}
              >
                <Music className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`${chordDetectIconButtonBaseClass} ${chordDetectSelectedKeys.length ? "border-slate-200 bg-white text-slate-600 enabled:hover:border-rose-300 enabled:hover:bg-rose-50 enabled:hover:text-rose-700" : "cursor-not-allowed border-slate-200 bg-white text-slate-300 opacity-50"}`}
                title="Limpiar selección manual"
                aria-label="Limpiar selección manual"
                aria-disabled={!chordDetectSelectedKeys.length}
                onMouseDown={(e) => {
                  if (chordDetectSelectedKeys.length) e.preventDefault();
                }}
                onClick={clearChordDetectSelection}
              >
                <Eraser className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`${chordDetectIconButtonBaseClass} border-slate-200 bg-white text-slate-600 enabled:hover:border-amber-300 enabled:hover:bg-amber-50 enabled:hover:text-amber-700`}
                title="Abre el análisis del acorde activo en el constructor"
                aria-label="Estudiar acorde"
                onClick={openMainChordStudy}
              >
                <BookOpen className="h-4 w-4" />
              </button>
            </>
          );

          if (!isCompactLayout) {
            // ── Desktop full (>1280px): nombre+badges a la izquierda, voicing+botones a la derecha ──
            return (
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  {/* Lectura detectada */}
                  <div className="mb-2 flex min-h-[34px] flex-wrap items-center gap-x-1 text-lg font-bold">
                    {chordPart ? (() => {
                      const dotIdx = chordPart.indexOf(" · ");
                      const baseName = dotIdx >= 0 ? chordPart.slice(0, dotIdx) : chordPart;
                      const restPart = dotIdx >= 0 ? chordPart.slice(dotIdx) : "";
                      return (
                        <>
                          <span className="font-bold text-sky-700">{baseName}</span>
                          {restPart ? <span className="font-bold text-slate-950">{restPart}</span> : null}
                        </>
                      );
                    })() : (
                      <span className="text-slate-400">
                        Sin lectura detectada todavía{physicalPatternSuffix}
                      </span>
                    )}
                  </div>
                  {/* ChordNoteBadgeStrip */}
                  <div className="min-h-[42px]">
                    {cand ? (
                      <div className="overflow-x-auto pb-1">
                        <ChordNoteBadgeStrip
                          items={chordDetectSelectedCandidateBadgeItems}
                          bassNote={chordDetectSelectedCandidateBassNote}
                          colorMap={colors}
                          wrap={false}
                        />
                      </div>
                    ) : (
                      <div aria-hidden="true" className="h-[42px]" />
                    )}
                  </div>
                </div>
                {/* Voicing + botones a la derecha */}
                <div className="flex shrink-0 flex-wrap items-end gap-2 pt-1">
                  {voicingAndButtons}
                </div>
              </div>
            );
          } else {
            // ── Compacto/móvil (≤1279px): nombre, badges y botones en columna ──
            return (
              <>
                {/* Lectura detectada */}
                <div className={`mb-2 flex min-h-[34px] flex-wrap items-center gap-x-1 ${isMobileLayout ? "text-sm font-semibold leading-snug" : "text-lg font-bold"}`}>
                  {chordPart ? (() => {
                    const dotIdx = chordPart.indexOf(" · ");
                    const baseName = dotIdx >= 0 ? chordPart.slice(0, dotIdx) : chordPart;
                    const restPart = dotIdx >= 0 ? chordPart.slice(dotIdx) : "";
                    return (
                      <>
                        <span className="font-semibold text-sky-700">{baseName}</span>
                        {restPart ? <span className="font-semibold text-slate-950">{restPart}</span> : null}
                      </>
                    );
                  })() : (
                    <span className="text-slate-400">
                      Sin lectura detectada todavía{physicalPatternSuffix}
                    </span>
                  )}
                </div>
                {/* ChordNoteBadgeStrip */}
                <div className="min-h-[42px]">
                  {cand ? (
                    <div className="overflow-x-auto pb-1">
                      <ChordNoteBadgeStrip
                        items={chordDetectSelectedCandidateBadgeItems}
                        bassNote={chordDetectSelectedCandidateBassNote}
                        colorMap={colors}
                        wrap={false}
                      />
                    </div>
                  ) : (
                    <div aria-hidden="true" className="h-[42px]" />
                  )}
                </div>
                {/* Voicing + botones — debajo */}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {voicingAndButtons}
                </div>
              </>
            );
          }
        })()}

        {/* Mantener/Referencia + Input patrón (desktop/compacto) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-3">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700" title="Intenta conservar la lectura funcional previa cuando el cambio de notas es pequeño.">
            <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
              <input
                type="checkbox"
                checked={chordDetectPrioritizeContext}
                onChange={(e) => updateChordDetectPrioritizeContext(e.target.checked)}
                className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0"
              />
              <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordDetectPrioritizeContext ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span>
            </span>
            Mantener lectura anterior
          </label>
          <div className="flex items-center gap-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700" title="Usa el acorde de referencia como pista para priorizar lecturas compatibles.">
              <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={chordRefEnabled}
                  onChange={(e) => setChordRefEnabled(e.target.checked)}
                  className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0"
                />
                <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordRefEnabled ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span>
              </span>
              Referencia:
            </label>
            <select
              value={chordRefNatural}
              onChange={(e) => setChordRefNatural(e.target.value)}
              disabled={!chordRefEnabled}
              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {CHORD_REF_NATURAL_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <button
              type="button"
              disabled={!chordRefEnabled}
              className={`h-6 w-6 rounded-lg border text-xs font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${chordRefAcc === -1 ? "border-sky-400 bg-sky-100 text-sky-800" : "border-slate-200 bg-white text-slate-600 enabled:hover:bg-sky-50"}`}
              onClick={() => setChordRefAcc(chordRefAcc === -1 ? 0 : -1)}
            >b</button>
            <button
              type="button"
              disabled={!chordRefEnabled}
              className={`h-6 w-6 rounded-lg border text-xs font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${chordRefAcc === 1 ? "border-sky-400 bg-sky-100 text-sky-800" : "border-slate-200 bg-white text-slate-600 enabled:hover:bg-sky-50"}`}
              onClick={() => setChordRefAcc(chordRefAcc === 1 ? 0 : 1)}
            >#</button>
            <select
              value={chordRefQuality}
              onChange={(e) => setChordRefQuality(e.target.value)}
              disabled={!chordRefEnabled}
              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {CHORD_REF_QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          {!isMobileLayout && (
            <div className="ml-auto flex items-center gap-1.5">
              <input
                type="text"
                maxLength={6}
                placeholder="x8989b"
                value={voicingInputText}
                onChange={(e) => setVoicingInputText(e.target.value.toLowerCase())}
                className="h-8 w-20 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                data-testid="chord-detect-pattern-input"
              />
              <button
                disabled={voicingInputText.length !== 6}
                data-testid="chord-detect-apply-btn"
                onClick={() => {
                  const FRET_CHARS = "0123456789ab";
                  const newKeys = [];
                  for (let i = 0; i < 6; i++) {
                    const ch = voicingInputText[i];
                    if (ch === "x") continue;
                    const fret = FRET_CHARS.indexOf(ch);
                    if (fret === -1) continue;
                    const sIdx = 5 - i;
                    newKeys.push(`${sIdx}:${fret}`);
                  }
                  setChordDetectSelectedKeys(newKeys);
                  if (!chordDetectMode) setChordDetectMode(true);
                }}
                className="h-8 rounded-xl border border-sky-600 bg-sky-600 px-3 text-xs font-semibold text-white shadow-sm transition disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 enabled:hover:bg-sky-700"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Cuadro 2 — Mástil
      ══════════════════════════════════════════════════════════════════ */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">

        {/* Controles de rango de trastes — móvil: incluye input patrón a la derecha */}
        {isMobileLayout ? (
          <div className="mb-2 flex items-center gap-1.5">
            <div className="text-xs font-semibold text-slate-700">Trastes</div>
            <button
              type="button"
              className={UI_BTN_SM}
              title="Mover rango 1 traste a la izquierda"
              onClick={() => setChordDetectWindowStart((start) => Math.max(chordDetectWindowStartMin, start - 1))}
              disabled={chordDetectWindowFrom <= chordDetectWindowStartMin}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-xs text-slate-600 tabular-nums">
              {chordDetectWindowFrom}–{chordDetectWindowTo}
            </div>
            <button
              type="button"
              className={UI_BTN_SM}
              title="Mover rango 1 traste a la derecha"
              onClick={() => setChordDetectWindowStart((start) => Math.min(chordDetectWindowAllowedStartMax, start + 1))}
              disabled={chordDetectWindowFrom >= chordDetectWindowAllowedStartMax}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {/* Input patrón — alineado a la derecha */}
            <div className="ml-auto flex items-center gap-1.5">
              <input
                type="text"
                maxLength={6}
                placeholder="x8989b"
                value={voicingInputText}
                onChange={(e) => setVoicingInputText(e.target.value.toLowerCase())}
                className="h-8 w-20 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                data-testid="chord-detect-pattern-input"
              />
              <button
                disabled={voicingInputText.length !== 6}
                data-testid="chord-detect-apply-btn"
                onClick={() => {
                  const FRET_CHARS = "0123456789ab";
                  const newKeys = [];
                  for (let i = 0; i < 6; i++) {
                    const ch = voicingInputText[i];
                    if (ch === "x") continue;
                    const fret = FRET_CHARS.indexOf(ch);
                    if (fret === -1) continue;
                    const sIdx = 5 - i;
                    newKeys.push(`${sIdx}:${fret}`);
                  }
                  setChordDetectSelectedKeys(newKeys);
                  if (!chordDetectMode) setChordDetectMode(true);
                }}
                className="h-8 rounded-xl border border-sky-600 bg-sky-600 px-3 text-xs font-semibold text-white shadow-sm transition disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 enabled:hover:bg-sky-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        ) : null}

        {/* Mástil de investigación */}
        {isNarrowBoardLayout ? (
          <MobileMainFretboardView
            frets={chordDetectVisibleFrets}
            renderStringFooter={(sIdx) =>
              stringSelectedNoteName[sIdx]
                ? <span className="text-[10px] font-bold text-sky-600">{stringSelectedNoteName[sIdx]}</span>
                : null
            }
            renderCell={({ sIdx, fret, cellClassName }) => {
              const key = `${sIdx}:${fret}`;
              const item = selectedMap.get(key);

              return (
                <button
                  key={`${sIdx}-${fret}`}
                  type="button"
                  onClick={() => toggleChordDetectCell(sIdx, fret)}
                  className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${cellClassName} ${
                    mobileVerticalFretBorderClass(fret)
                  } ${item?.isPlaying ? "ring-2 ring-sky-300 ring-offset-1 ring-offset-white" : ""} ${fret === 0 ? "bg-transparent" : "bg-slate-50 hover:ring-2 hover:ring-slate-300"}`}
                >
                    <HoverCellNoteView sIdx={sIdx} fret={fret} visible={!item} />
                  {item ? (
                    <ChordInvestigationCircleView
                      pc={item.pc}
                      fret={fret}
                      sIdx={sIdx}
                      candidate={chordDetectSelectedCandidate}
                      isBass={item.isBass}
                      isPlaying={item.isPlaying}
                      compactOpen={fret === 0}
                    />
                  ) : (fret === 0 && !selectedStrings.has(sIdx) ? (
                    <span className="text-base font-semibold leading-none text-slate-400">X</span>
                  ) : (showNonScale ? (
                    <div className="text-[10px] text-slate-400">{chordDetectSelectedCandidate ? buildDetectedCandidateBackgroundLabelForPc(mod12(STRINGS[sIdx].pc + fret), chordDetectSelectedCandidate, chordPreferSharps, showIntervalsLabel, showNotesLabel) : labelForCellAt(sIdx, fret)}</div>
                  ) : null))}
                </button>
              );
            }}
          />
        ) : (
          <>
            <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
              <div className="text-xs font-semibold text-slate-600">Cuerda</div>
              {Array.from({ length: maxFret + 1 }, (_, fret) => (
                <div key={fret} className="relative flex flex-col items-center">
                  <div className="text-[10px] text-slate-600">{fret}</div>
                </div>
              ))}
            </div>

            <div className="mt-2 space-y-1">
              {STRINGS.map((st, sIdx) => (
                <div key={st.label} className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-700">{st.label}</span>
                    {selectedStrings.has(sIdx) && stringSelectedNoteName[sIdx] ? (
                      <span className="text-[10px] font-bold text-sky-600">{stringSelectedNoteName[sIdx]}</span>
                    ) : null}
                  </div>
                  {Array.from({ length: maxFret + 1 }, (_, fret) => {
                    const key = `${sIdx}:${fret}`;
                    const item = selectedMap.get(key);
                    return (
                      <button
                        key={`${sIdx}-${fret}`}
                        type="button"
                        data-testid={`chord-detect-cell-${sIdx}-${fret}`}
                        onClick={() => toggleChordDetectCell(sIdx, fret)}
                        className={`group relative isolate flex h-8 overflow-visible items-center justify-center rounded-lg border ${fret === 0 ? "border-slate-300" : "border-slate-200"} ${item ? "z-[4]" : "z-0"} ${item?.isPlaying ? "ring-2 ring-sky-300 ring-offset-1 ring-offset-white" : ""} bg-slate-50 hover:ring-2 hover:ring-slate-300`}
                      >
                          <HoverCellNoteView sIdx={sIdx} fret={fret} visible={!item} />
                        {hasInlayCell(fret, sIdx) ? (
                          <div className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 -translate-y-1/2" style={{ top: "78%" }}>
                            <div className="h-4 w-4 rounded-full opacity-80" style={{ backgroundColor: FRET_INLAY_BG }} />
                          </div>
                        ) : null}
                        {item ? <ChordInvestigationCircleView pc={item.pc} fret={fret} sIdx={sIdx} candidate={chordDetectSelectedCandidate} isBass={item.isBass} isPlaying={item.isPlaying} /> : (fret === 0 && !selectedStrings.has(sIdx) ? <span className="text-base font-semibold leading-none text-slate-400">X</span> : (showNonScale ? <div className="text-[10px] text-slate-400">{chordDetectSelectedCandidate ? buildDetectedCandidateBackgroundLabelForPc(mod12(STRINGS[sIdx].pc + fret), chordDetectSelectedCandidate, chordPreferSharps, showIntervalsLabel, showNotesLabel) : labelForCellAt(sIdx, fret)}</div> : null))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-3 text-xs text-slate-600">
          {chordDetectSelectedNotes.length
            ? "Pulsa de nuevo sobre una nota para quitarla."
            : "Pulsa en el mástil para seleccionar notas."}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Cuadro 3 — Posibles acordes
      ══════════════════════════════════════════════════════════════════ */}
			<div className="mb-3 rounded-xl border border-slate-200 bg-white">
			  <div className="px-3 pt-3">
				<div className="text-base font-bold text-slate-900">
				  <InfoTitleView label="Posibles acordes" info={DETECTED_CHORDS_INFO_TEXT} alwaysShow />
				</div>
				<div className="mt-0.5 text-xs text-slate-600">
				  {chordDetectSelectedNotes.length
					? "Selecciona una lectura para copiarla a la sección Acorde."
					: "Añade notas en el mástil para ver lecturas posibles."}
				</div>
			  </div>

			  <div className="px-3 pb-3 pt-2">
          <div className="space-y-2" data-testid="detected-chord-list">
            {chordDetectCandidatesRanked.length ? chordDetectCandidatesRanked.map((cand) => (
              <div key={cand.id} data-testid={`detected-chord-${cand.id}`} className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-xs text-slate-700 ${cand.contextual || cand.referencePromoted ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-sky-50"}`}>
                <label className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="radio"
                    name="detected-chord"
                    checked={chordDetectCandidateId === cand.id}
                    onChange={() => selectDetectedCandidate(cand)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <div className="min-w-0">
                    {(cand.contextual || cand.referencePromoted) && (
                      <div className="mb-0.5">
                        <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">por referencia</span>
                      </div>
                    )}
                    <div data-testid={`detected-chord-name-${cand.id}`} className="font-bold text-slate-800">{formatChordNamePure(cand)}</div>
                    <div>{cand.intervalPairsText}</div>
                  </div>
                </label>
                <button
                  type="button"
                  data-testid={`detected-copy-${cand.id}`}
                  className={UI_BTN_SM + " w-auto shrink-0 px-3"}
                  onClick={() => applyDetectedCandidate(cand)}
                  disabled={!cand.uiPatch}
                  title={cand.uiPatch ? "Copiar esta lectura a la sección Acorde" : "Esta lectura no es compatible con el constructor superior"}
                >
                  Copiar en Acorde
                </button>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-sky-50 px-3 py-3 text-xs text-slate-500">
                No hay lecturas claras todavía. Empieza con 3 o 4 notas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pentagrama — sin cambios */}
      {chordDetectStaffEvents.length ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-base font-bold text-slate-900">Pentagrama de la selección actual</div>
          <div className="mt-1 text-xs text-slate-600">
            Se dibuja al pulsar notas, sin esperar a elegir un acorde posible: {chordDetectSelectionPositionsText}
          </div>
          <div className="mt-2">
            <MusicStaff
              events={chordDetectStaffEvents}
              preferSharps={chordDetectSelectedCandidate?.preferSharps ?? chordPreferSharps}
              clefMode="guitar"
              keySignature={{ type: null, count: 0 }}
              showFooter
              footerLabels={[chordDetectSelectedCandidate?.name || "Selección"]}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
