import React from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import PanelBlock from "../PanelBlock.jsx";
import { CopyVoicingButton } from "../chords/ChordsPanel.jsx";
import { InfoTitle as InfoTitleImpl } from "../ui/AppUiPrimitives.jsx";
import { MobileMainFretboard as MobileMainFretboardImpl } from "../fretboard/MobileMainFretboard.jsx";
import { HoverCellNote as HoverCellNoteImpl } from "../fretboard/FretboardShared.jsx";

import * as AppStaticData from "../../music/appStaticData.js";
const {
  NEAR_CHORDS_INFO_TEXT,
  NEAR_AUTO_SCALE_INFO_TEXT,
  STRINGS,
  FRET_CELL_BG,
  FRET_INLAY_BG,
  fretGridCols,
  normalizeVisibleFrets,
  hasInlayCell,
  mobileVerticalFretBorderClass,
  NATURAL_PC,
  NATURAL_PCS,
  LETTERS,
} = AppStaticData;

import * as AppMusicBasics from "../../music/appMusicBasics.js";
const {
  mod12,
  pcToName,
  pcToDualName,
  chordUiLetterFromPc,
  intervalToSimpleChordDegreeToken,
  intervalToChordToken,
  isDark,
  fnBuildQuartalDegreeLabel,
  CHORD_QUALITIES,
  CHORD_STRUCTURES,
  CHORD_FAMILIES,
  CHORD_FORMS,
  CHORD_INVERSIONS,
  CHORD_QUARTAL_TYPES,
  CHORD_QUARTAL_VOICES,
  CHORD_QUARTAL_SPREADS,
  CHORD_QUARTAL_REFERENCES,
  CHORD_QUARTAL_SCALE_NAMES,
  CHORD_GUIDE_TONE_QUALITIES,
  CHORD_GUIDE_TONE_FORMS,
  CHORD_GUIDE_TONE_INVERSIONS,
} = AppMusicBasics;

import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";
const { isDropForm, hasEffectiveSeventh, buildChordUiRestrictions } = AppVoicingStudyCore;

import * as AppPatternRouteStaffCore from "../../music/appPatternRouteStaffCore.jsx";
const {
  formatChordBadgeDegree,
  chordBadgeRoleFromDegreeLabel,
  chordFormulaBadgeRoleFromDegreeLabel,
  ChordNoteBadgeStrip,
} = AppPatternRouteStaffCore;

// UI constants — same strings as in App.jsx
const UI_SELECT_SM = "h-7 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_SELECT_SM_TONE = "h-7 w-[60px] rounded-xl border border-slate-200 bg-white px-1 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_SELECT_SM_AUTO = "h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_BTN_SM = "h-7 w-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold shadow-sm hover:bg-sky-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_INPUT_SM = "h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_LABEL_SM = "block text-[11px] font-semibold text-slate-700";
const UI_EXT_GRID = "mt-1 grid grid-cols-3 gap-x-3 gap-y-1 text-xs";

// nearChords layout constants
const nearSlotDesktopEditorClass = "flex flex-wrap items-end gap-2";
const nearSlotDesktopVoicingClass = "shrink-0";
const nearSlotDesktopVoicingCompactClass = "shrink-0";
const chordMobileEditorGridClass = "grid min-w-0 items-start justify-items-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]";
const chordMobileEditorTertianGridClass = "grid min-w-0 items-start gap-2 [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]";

function fnMaxTextCh(items, fallback = 8) {
  const maxLen = (items || []).reduce((acc, item) => {
    const label = typeof item === "string" ? item : (item?.label ?? item?.value ?? "");
    return Math.max(acc, String(label).length);
  }, 0);
  return `${Math.max(maxLen, fallback)}ch`;
}

function hoverCellNoteText(sIdx, fret) {
  return pcToDualName(mod12(STRINGS[sIdx].pc + fret));
}

export default function NearChordsPanel({
  visible,
  nearSlots,
  nearComputed,
  nearWindowSize,
  nearWindowSizeRaw,
  nearAutoScaleSync,
  nearBgColors,
  mobileNearChordEditorIdx,
  nearFrom,
  nearTo,
  nearStartMax,
  nearTonalityAnalysis,
  isMobileLayout,
  isNarrowBoardLayout,
  showNonScale,
  showIntervalsLabel,
  showNotesLabel,
  colors,
  maxFret,
  labelForCellAt,
  updateNearSlot,
  setNearWindowStart,
  setNearWindowSize,
  setNearWindowSizeRaw,
  setNearAutoScaleSync,
  setNearBgColor,
  setStudyTarget,
  setStudyOpen,
  setMobileNearChordEditorIdx,
  openMobileInfoPopover,
  nearSlotFamilyOf,
  buildNearSlotNoteMeta,
  buildNearSlotStudyEntry,
}) {
  const HoverCellNote = ({ sIdx, fret, visible: vis = true }) => (
    <HoverCellNoteImpl sIdx={sIdx} fret={fret} visible={vis} hoverCellNoteText={hoverCellNoteText} />
  );

  const InfoTitle = ({ label, info, alwaysShow = false }) => (
    <InfoTitleImpl label={label} info={info} alwaysShow={alwaysShow} isMobileLayout={isMobileLayout} onInfo={openMobileInfoPopover} />
  );

  const MobileMainFretboard = (props) => <MobileMainFretboardImpl {...props} maxFret={maxFret} />;

  const nearSelectWidthStyle = (items, fallback = 8) => (
    isMobileLayout ? undefined : { width: `calc(${fnMaxTextCh(items, fallback)} + 25px)` }
  );

  const spellChordNotesForSlot = (slot) => buildNearSlotNoteMeta(slot).notes;

  // Roles por slot (acordes cercanos)
  function slotRoleOfPc(pc, slot, voicing = null) {
    const meta = buildNearSlotNoteMeta(slot, voicing);
    const interval = mod12(pc - meta.rootPc);
    const idx = meta.intervals.findIndex((x) => mod12(x) === interval);
    const degreeRaw = String(meta.degreeLabels?.[idx] || intervalToSimpleChordDegreeToken(interval));
    return meta.family === "tertian"
      ? chordFormulaBadgeRoleFromDegreeLabel(degreeRaw, interval)
      : chordBadgeRoleFromDegreeLabel(degreeRaw, interval);
  }

  // Etiqueta por slot (acordes cercanos)
  function slotLabelForPc(slot, pc, voicing = null) {
    const meta = buildNearSlotNoteMeta(slot, voicing);
    const interval = mod12(pc - meta.rootPc);
    const idx = meta.intervals.findIndex((x) => mod12(x) === interval);
    const note = idx >= 0 ? meta.notes[idx] : pcToName(pc, meta.preferSharps);
    const degreeRaw = idx >= 0
      ? String(meta.degreeLabels[idx] || "")
      : meta.family === "tertian"
        ? intervalToChordToken(interval, {
            ext6: !!slot.ext6,
            ext9: !!slot.ext9 && slot.structure !== "triad",
            ext11: !!slot.ext11 && slot.structure !== "triad",
            ext13: !!slot.ext13 && slot.structure !== "triad",
          })
        : intervalToSimpleChordDegreeToken(interval);
    const tok = meta.family === "tertian" ? degreeRaw : formatChordBadgeDegree(degreeRaw);

    const showI = !!showIntervalsLabel;
    const showN = !!showNotesLabel;
    if (!showI && !showN) return tok;
    if (showI && showN) return `${tok}-${note}`;
    if (showI) return tok;
    return note;
  }

  function calibratedClusterPos(n, idx) {
    if (n === 2) {
      const p = [
        { x: 19, y: 16 },
        { x: 52, y: 16 },
      ][idx];
      return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
    }
    if (n === 4) {
      const p = [
        { x: 35, y: 6 },
        { x: 12, y: 14 },
        { x: 57, y: 14 },
        { x: 34, y: 25 },
      ][idx];
      return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
    }
    if (n === 3) {
      const p = [
        { x: 12, y: 14 },
        { x: 34, y: 14 },
        { x: 57, y: 14 },
      ][idx];
      return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
    }
    return null;
  }

  function cornerStyle(n, idx) {
    if (n <= 1) return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    if (n === 2) {
      return idx === 0
        ? { left: 16, top: "50%", transform: "translateY(-50%)" }
        : { right: 16, top: "50%", transform: "translateY(-50%)" };
    }
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  function Mini({ slotIdx, pc, role, size = "m" }) {
    const slot = nearSlots[slotIdx];
    const voicing = nearComputed.selected[slotIdx] || null;
    const chordBg = nearBgColors[slotIdx] || "#94a3b8";
    const ring = colors[role] || colors.other;
    const dark = isDark(chordBg);
    const sizeClass = size === "cal"
      ? "h-[21px] w-[21px] text-[8px]"
      : size === "pair"
        ? "h-[26px] w-[26px] text-[10px]"
        : size === "s"
          ? "h-6 w-6 text-[9px]"
          : "h-7 w-7 text-[10px]";

    return (
      <div
        className={`relative z-20 inline-flex items-center justify-center rounded-full font-bold ${sizeClass}`}
        title={`${slotLabelForPc(slot, pc, voicing)} · acorde ${slotIdx + 1}`}
      >
        <span
          className="absolute inset-0 z-[1] rounded-full"
          style={{
            backgroundColor: chordBg,
            border: `2px solid ${ring}`,
            boxSizing: "border-box",
          }}
        />
        <span className="relative z-[2]" style={{ color: dark ? "#fff" : "#0f172a" }}>
          {slotLabelForPc(slot, pc, voicing)}
        </span>
      </div>
    );
  }

  function renderNearChordsFretboard() {
    const baseSlotIdx = nearComputed.baseIdx;
    const baseSlot = baseSlotIdx >= 0 ? nearSlots[baseSlotIdx] : null;
    const basePlan = baseSlotIdx >= 0 ? (nearComputed.ranked[baseSlotIdx]?.plan || null) : null;
    const baseVoicing = baseSlotIdx >= 0 ? (nearComputed.selected[baseSlotIdx] || null) : null;
    const baseData = baseSlot ? buildNearSlotStudyEntry(baseSlot, basePlan, baseVoicing, baseSlotIdx) : null;
    const baseChordName = baseData?.chordName || null;
    const nearFretboardInfoText = `${baseChordName ? `Acorde activo: ${baseChordName}. ` : ""}Compara las digitaciones activas dentro del mismo rango. Relleno = color del acorde · borde = función · texto = nota/intervalo.`;
    const slotDataMaps = nearComputed.selected.map((v, idx) => {
      const notesMap = new Map();
      if (!nearSlots[idx]?.enabled || !v?.notes?.length) return { notesMap };
      for (const n of v.notes) {
        notesMap.set(`${n.sIdx}:${n.fret}`, {
          pc: n.pc,
          isBass: `${n.sIdx}:${n.fret}` === v.bassKey,
        });
      }
      return { notesMap };
    });

    const mobileVisibleFrets = isNarrowBoardLayout
      ? normalizeVisibleFrets([0, ...Array.from({ length: Math.max(0, nearTo - nearFrom + 1) }, (_, idx) => nearFrom + idx)], maxFret)
      : null;

    const usedStrings = new Set();
    nearComputed.selected.forEach((v, idx) => {
      if (!nearSlots[idx]?.enabled || !v?.notes?.length) return;
      v.notes.forEach((n) => usedStrings.add(n.sIdx));
    });

    const getItemsForCell = (sIdx, fret) => {
      const items = [];
      for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
        if (!nearSlots[slotIdx]?.enabled) continue;
        const n = slotDataMaps[slotIdx].notesMap.get(`${sIdx}:${fret}`);
        if (!n) continue;
        items.push({ slotIdx, pc: n.pc, role: slotRoleOfPc(n.pc, nearSlots[slotIdx], nearComputed.selected[slotIdx] || null) });
      }
      return items;
    };

    return (
      <PanelBlock
        level="subsection"
        title={<InfoTitle label="Mástil: acordes cercanos" info={nearFretboardInfoText} alwaysShow />}
        headerAside={<div className="flex flex-wrap items-end justify-end gap-3">
            <div className="flex items-end gap-1.5">
              <div className="text-xs font-semibold text-slate-700">Rango</div>
              <button
                type="button"
                className={UI_BTN_SM}
                title="Mover rango 1 traste a la izquierda"
                onClick={() => setNearWindowStart((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-end gap-1.5">
                <div>
                  <div className="text-[10px] font-semibold text-slate-600">Tamaño</div>
                  <input
                    className={UI_INPUT_SM + " w-14"}
                    value={nearWindowSizeRaw}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setNearWindowSizeRaw(raw);
                      const n = parseInt(raw, 10);
                      if (Number.isFinite(n) && n >= 1) setNearWindowSize(n);
                    }}
                    onBlur={() => setNearWindowSizeRaw(String(nearWindowSize))}
                  />
                </div>
              </div>

              <button
                type="button"
                className={UI_BTN_SM}
                title="Mover rango 1 traste a la derecha"
                onClick={() => setNearWindowStart((s) => Math.min(nearStartMax, s + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="ml-1 text-xs text-slate-600 tabular-nums">
                {nearFrom}–{nearTo}
              </div>
            </div>
          </div>}
        className="mt-3"
      >

        {isNarrowBoardLayout ? (
          <MobileMainFretboard
            frets={mobileVisibleFrets}
            renderCell={({ sIdx, fret, cellClassName }) => {
              const items = getItemsForCell(sIdx, fret);

              return (
                <div
                  key={`${sIdx}-${fret}`}
                  className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${
                    mobileVerticalFretBorderClass(fret)
                  } ${cellClassName}`}
                  style={{ backgroundColor: fret === 0 ? "transparent" : FRET_CELL_BG }}
                >
                  <HoverCellNote sIdx={sIdx} fret={fret} visible={!items.length} />
                  {fret >= nearFrom && fret <= nearTo ? (
                    <div className="pointer-events-none absolute inset-0 z-[2] rounded-lg" style={{ backgroundColor: "rgba(15, 23, 42, 0.04)" }} />
                  ) : null}
                  {items.length === 1 ? (
                    <div className="pointer-events-none relative z-[5]">
                      <Mini size={fret === 0 ? "s" : "m"} slotIdx={items[0].slotIdx} pc={items[0].pc} role={items[0].role} fret={fret} sIdx={sIdx} />
                    </div>
                  ) : items.length ? (
                    <div className="absolute inset-0 z-[5] pointer-events-none">
                      {items
                        .slice()
                        .sort((a, b) => a.slotIdx - b.slotIdx)
                        .slice(0, 4)
                        .map((it, i2) => {
                          const calibratedPos = calibratedClusterPos(items.length, i2);
                          const pos = calibratedPos || cornerStyle(items.length, i2);
                          const miniSize = fret === 0 ? "s" : (items.length === 2 ? "pair" : calibratedPos ? "cal" : "s");
                          return (
                            <div key={`${it.slotIdx}-${it.role}-${i2}`} className="absolute" style={pos}>
                              <Mini size={miniSize} slotIdx={it.slotIdx} pc={it.pc} role={it.role} fret={fret} sIdx={sIdx} />
                            </div>
                          );
                        })}
                    </div>
                  ) : (fret === 0 && !usedStrings.has(sIdx)) ? (
                    <span className="pointer-events-none relative z-[5] text-xs font-semibold text-slate-400">X</span>
                  ) : showNonScale ? (
                    <div className="pointer-events-none relative z-[1] text-[10px] text-slate-400">{labelForCellAt(sIdx, fret)}</div>
                  ) : null}
                </div>
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
                <React.Fragment key={st.label}>
                  <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
                    <div className="text-xs font-medium text-slate-700">{st.label}</div>

                    {Array.from({ length: maxFret + 1 }, (_, fret) => {
                      const items = getItemsForCell(sIdx, fret);

                      return (
                        <div
                          key={`${sIdx}-${fret}`}
                          className={`group relative isolate flex h-8 overflow-visible items-center justify-center rounded-lg border ${fret === 0 ? "border-slate-300" : "border-slate-200"} ${items.length ? "z-[4]" : "z-0"}`}
                          style={{ backgroundColor: FRET_CELL_BG }}
                        >
                          <HoverCellNote sIdx={sIdx} fret={fret} visible={!items.length} />
                          {hasInlayCell(fret, sIdx) ? (
                          <div className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 -translate-y-1/2" style={{ top: "78%" }}>
                            <div className="h-4 w-4 rounded-full opacity-80" style={{ backgroundColor: FRET_INLAY_BG }} />
                          </div>
                        ) : null}
                          {fret >= nearFrom && fret <= nearTo ? (
                            <div className="pointer-events-none absolute inset-0 z-[2] rounded-lg" style={{ backgroundColor: "rgba(15, 23, 42, 0.04)" }} />
                          ) : null}
                          {items.length === 1 ? (
                            <div className="pointer-events-none relative z-[5]">
                              <Mini size="m" slotIdx={items[0].slotIdx} pc={items[0].pc} role={items[0].role} fret={fret} sIdx={sIdx} />
                            </div>
                          ) : items.length ? (
                            <div className="absolute inset-0 z-[5] pointer-events-none">
                              {items
                                .slice()
                                .sort((a, b) => a.slotIdx - b.slotIdx)
                                .slice(0, 4)
                                .map((it, i2) => {
                                  const calibratedPos = calibratedClusterPos(items.length, i2);
                                  const pos = calibratedPos || cornerStyle(items.length, i2);
                                  const miniSize = items.length === 2 ? "pair" : calibratedPos ? "cal" : "s";
                                  return (
                                    <div key={`${it.slotIdx}-${it.role}-${i2}`} className="absolute" style={pos}>
                                      <Mini size={miniSize} slotIdx={it.slotIdx} pc={it.pc} role={it.role} fret={fret} sIdx={sIdx} />
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (fret === 0 && !usedStrings.has(sIdx)) ? (
                            <span className="pointer-events-none relative z-[5] text-xs font-semibold text-slate-400">X</span>
                          ) : showNonScale ? (
                            <div className="pointer-events-none relative z-[1] text-[10px] text-slate-400">{labelForCellAt(sIdx, fret)}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </PanelBlock>
    );
  }

  function renderNearSlotToneControl(slot, idx, disableAll, className = "min-w-0") {
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>Tono</label>
        <div className="mt-1 flex items-center gap-1.5">
          <select
            data-testid={`near-slot-${idx}-tone`}
            className={UI_SELECT_SM_TONE}
            style={{ width: "50px" }}
            value={chordUiLetterFromPc(slot.rootPc, !!slot.spellPreferSharps)}
            onChange={(e) => {
              const letter = e.target.value;
              if (Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) {
                updateNearSlot(idx, { rootPc: mod12(NATURAL_PC[letter]), selFrets: null });
              }
            }}
            disabled={disableAll}
          >
            {LETTERS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            type="button"
            className={`${UI_BTN_SM} ${!disableAll && (!NATURAL_PCS.has(mod12(slot.rootPc)) && !slot.spellPreferSharps) ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
            title="Bajar 1 semitono"
            onClick={() => {
              const letter = chordUiLetterFromPc(slot.rootPc, false);
              const nat = mod12(NATURAL_PC[letter]);
              const cur = mod12(slot.rootPc);
              if (cur !== nat) {
                updateNearSlot(idx, { rootPc: nat, selFrets: null, spellPreferSharps: false });
                return;
              }
              updateNearSlot(idx, { rootPc: mod12(nat - 1), selFrets: null, spellPreferSharps: false });
            }}
            disabled={disableAll}
          >
            b
          </button>
          <button
            type="button"
            className={`${UI_BTN_SM} ${!disableAll && (!NATURAL_PCS.has(mod12(slot.rootPc)) && slot.spellPreferSharps) ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
            title="Subir 1 semitono"
            onClick={() => {
              const letter = chordUiLetterFromPc(slot.rootPc, true);
              const nat = mod12(NATURAL_PC[letter]);
              const cur = mod12(slot.rootPc);
              if (cur !== nat) {
                updateNearSlot(idx, { rootPc: nat, selFrets: null, spellPreferSharps: true });
                return;
              }
              updateNearSlot(idx, { rootPc: mod12(nat + 1), selFrets: null, spellPreferSharps: true });
            }}
            disabled={disableAll}
          >
            #
          </button>
        </div>
      </div>
    );
  }

  function renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, className = "min-w-0 flex-1") {
    const family = nearSlotFamilyOf(slot);
    const voicingOptionLabels = options.map((v) => v.frets);
    const voicingOptionTitles = options.map((v) =>
      `${v.frets}${family === "quartal" && v.quartalDegree != null ? ` · ${fnBuildQuartalDegreeLabel(v.quartalDegree)}` : ""} — min ${v.minFret} · dist ${v.reach ?? (v.span + 1)}`
    );
    const voicingSelectClass = isMobileLayout
      ? `${UI_SELECT_SM} min-w-0 flex-1 max-w-[172px]`
      : `${UI_SELECT_SM_AUTO} w-[68px] max-w-[68px]`;
    const activeFrets = slot.selFrets || options[0]?.frets || null;
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>
          {isMobileLayout
            ? `Digitación en rango (${options.length} opciones)`
            : `Voicing (${options.length})`}
        </label>
        <div className="mt-1 flex items-center gap-1.5">
          <button
            type="button"
            className={UI_BTN_SM}
            title="Anterior"
            onClick={() => {
              if (!options.length) return;
              const cur = slot.selFrets ?? options[0].frets;
              let iCur = options.findIndex((v) => v.frets === cur);
              if (iCur < 0) iCur = 0;
              const iNew = (iCur - 1 + options.length) % options.length;
              updateNearSlot(idx, { selFrets: options[iNew].frets });
            }}
            disabled={disableAll || !options.length}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            data-testid={`near-slot-${idx}-voicing-select`}
            className={voicingSelectClass}
            value={slot.selFrets || "(auto)"}
            onChange={(e) => {
              const v = e.target.value;
              updateNearSlot(idx, { selFrets: v === "(auto)" ? null : v });
            }}
            disabled={disableAll}
          >
            <option value="(auto)">(auto)</option>
            {options.map((v, optionIdx) => (
              <option key={v.frets} value={v.frets} title={voicingOptionTitles[optionIdx]}>
                {voicingOptionLabels[optionIdx]}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={UI_BTN_SM}
            title="Siguiente"
            onClick={() => {
              if (!options.length) return;
              const cur = slot.selFrets ?? options[0].frets;
              let iCur = options.findIndex((v) => v.frets === cur);
              if (iCur < 0) iCur = 0;
              const iNew = (iCur + 1) % options.length;
              updateNearSlot(idx, { selFrets: options[iNew].frets });
            }}
            disabled={disableAll || !options.length}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <CopyVoicingButton
            frets={activeFrets}
            data-testid={`near-slot-${idx}-copy-voicing`}
            disabled={disableAll || !activeFrets}
          />
        </div>
      </div>
    );
  }

  function renderNearSlotDistControl(slot, idx, disableAll, className = "min-w-0") {
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>Dist.</label>
        <select
          className={UI_SELECT_SM + " mt-1"}
          style={{ width: "50px" }}
          value={slot.maxDist || 4}
          onChange={(e) => updateNearSlot(idx, { maxDist: parseInt(e.target.value, 10), selFrets: null })}
          disabled={disableAll}
        >
          {[4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    );
  }

  function renderNearSlotQuartalEditor(slot, idx, disableAll, options, errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div
        className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}
      >
        {renderNearSlotToneControl(slot, idx, disableAll, isMobileLayout ? "min-w-0" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(slot)}
            onChange={(e) => updateNearSlot(idx, { family: e.target.value, selFrets: null })}
            disabled={disableAll}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {slot.quartalReference === "scale" ? (
          <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
            <label className={UI_LABEL_SM}>Escala</label>
            <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_SCALE_NAMES, 8)} value={slot.quartalScaleName || "Mayor"} onChange={(e) => updateNearSlot(idx, { quartalScaleName: e.target.value, selFrets: null })} disabled={disableAll}>
              {CHORD_QUARTAL_SCALE_NAMES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.
Diatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.
Por eso el resultado puede no tener la misma raíz elegida.`}>Referencia</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_REFERENCES, 11)} value={slot.quartalReference || "root"} onChange={(e) => updateNearSlot(idx, { quartalReference: e.target.value, selFrets: null })} disabled={disableAll} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.
Diatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.
Por eso el resultado puede no tener la misma raíz elegida.`}>
            {CHORD_QUARTAL_REFERENCES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.
Abierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>Apilado</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_SPREADS, 8)} value={slot.quartalSpread || "closed"} onChange={(e) => updateNearSlot(idx, { quartalSpread: e.target.value, selFrets: null })} disabled={disableAll} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.
Abierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>
            {CHORD_QUARTAL_SPREADS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Voces</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_VOICES, 5)} value={slot.quartalVoices || "4"} onChange={(e) => updateNearSlot(idx, { quartalVoices: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_QUARTAL_VOICES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Puro: todas las cuartas son justas (4J).
Mixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>Tipo cuartal</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_TYPES, 10)} value={slot.quartalType || "pure"} onChange={(e) => updateNearSlot(idx, { quartalType: e.target.value, selFrets: null })} disabled={disableAll} title={`Puro: todas las cuartas son justas (4J).
Mixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>
            {CHORD_QUARTAL_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(slot, idx, disableAll, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, nearSlotDesktopVoicingClass)}
            {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotGuideToneEditor(slot, idx, disableAll, options, errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div
        className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}
      >
        {renderNearSlotToneControl(slot, idx, disableAll, isMobileLayout ? "min-w-0" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(slot)}
            onChange={(e) => updateNearSlot(idx, { family: e.target.value, selFrets: null })}
            disabled={disableAll}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Calidad</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_QUALITIES, 8)} value={slot.guideToneQuality || "maj7"} onChange={(e) => updateNearSlot(idx, { guideToneQuality: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_GUIDE_TONE_QUALITIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Forma</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_FORMS, 7)} value={slot.guideToneForm || "closed"} onChange={(e) => updateNearSlot(idx, { guideToneForm: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_GUIDE_TONE_FORMS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Inversión</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_INVERSIONS, 10)} value={slot.guideToneInversion || "all"} onChange={(e) => updateNearSlot(idx, { guideToneInversion: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_GUIDE_TONE_INVERSIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(slot, idx, disableAll, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, nearSlotDesktopVoicingClass)}
            {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotTertianEditor(slot, idx, disableAll, slotUi, options, errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div
        className={isMobileLayout ? chordMobileEditorTertianGridClass : nearSlotDesktopEditorClass}
      >
        {renderNearSlotToneControl(slot, idx, disableAll, isMobileLayout ? "min-w-0 col-span-2" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0 order-1" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(slot)}
            onChange={(e) => updateNearSlot(idx, { family: e.target.value, selFrets: null })}
            disabled={disableAll}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-5 col-span-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Calidad / Sus</label>
          <div className="mt-1 flex flex-nowrap gap-1.5">
            <select data-testid={`near-slot-${idx}-quality`} className={UI_SELECT_SM_AUTO} style={nearSelectWidthStyle(CHORD_QUALITIES, 8)} value={slot.quality} onChange={(e) => updateNearSlot(idx, { quality: e.target.value, selFrets: null })} disabled={disableAll}>
              {CHORD_QUALITIES.map((q) => (
                <option key={q.value} value={q.value} disabled={(q.value === "hdim" && slot.structure === "triad" && !slot.ext7) || (q.value === "dom" && slot.structure === "triad" && !slot.ext7)}>{q.label}</option>
              ))}
            </select>
            <select
              className={UI_SELECT_SM_AUTO}
              style={nearSelectWidthStyle(["Sus —", "sus2", "sus4"], 6)}
              value={slot.suspension || "none"}
              onChange={(e) => {
                const v = e.target.value;
                updateNearSlot(idx, { suspension: v, selFrets: null });
                if (v !== "none" && (slot.quality === "dim" || slot.quality === "hdim")) {
                  updateNearSlot(idx, { quality: "maj", selFrets: null });
                }
              }}
              disabled={disableAll}
              title="Suspensión: reemplaza la 3ª por 2ª o 4ª"
            >
              <option value="none">Sus —</option>
              <option value="sus2">sus2</option>
              <option value="sus4">sus4</option>
            </select>
          </div>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Estructura</label>
          <select
            data-testid={`near-slot-${idx}-structure`}
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_STRUCTURES, 9)}
            value={slot.structure}
            onChange={(e) => {
              const val = e.target.value;
              const patch = val === "triad"
                ? { ext6: false, ext7: false, ext9: false, ext11: false, ext13: false }
                : val === "chord"
                  ? {}
                  : { ext9: false, ext11: false, ext13: false };
              updateNearSlot(idx, {
                structure: val,
                selFrets: null,
                ...(val === "triad" || val === "tetrad" ? { inversion: "all", form: "open", positionForm: "open" } : {}),
                ...patch,
              });
            }}
            disabled={disableAll}
          >
            {CHORD_STRUCTURES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-4" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Forma</label>
          {slotUi.usesManualForm ? (
            <select
              className={UI_SELECT_SM_AUTO + " mt-1"}
              style={nearSelectWidthStyle(CHORD_FORMS, 9)}
              value={slot.form}
              onChange={(e) => {
                const v = e.target.value;
                updateNearSlot(idx, {
                  form: v,
                  positionForm: isDropForm(v) ? (slot.positionForm || "closed") : v,
                  selFrets: null,
                });
              }}
              disabled={disableAll}
              title="Elige la disposición del acorde: cerrado, abierto o drop"
            >
              {CHORD_FORMS.map((form) => (
                <option key={form.value} value={form.value} disabled={isDropForm(form.value) && !slotUi.dropEligible}>{form.label}</option>
              ))}
            </select>
          ) : (
            <div className="mt-1 inline-flex h-7 items-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-xs text-slate-500">Automática</div>
          )}
        </div>
        <div className={isMobileLayout ? "min-w-0 order-3" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Inversión</label>
          <select data-testid={`near-slot-${idx}-inversion`} className={UI_SELECT_SM_AUTO + " mt-1"} style={nearSelectWidthStyle(CHORD_INVERSIONS, 10)} value={slot.inversion} onChange={(e) => updateNearSlot(idx, { inversion: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_INVERSIONS.map((inv) => (
              <option key={inv.value} value={inv.value} disabled={!slotUi.allowThirdInversion && inv.value === "3"}>{inv.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-6 col-span-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Extensiones</label>
          <div className={UI_EXT_GRID}>
            {slotUi.ext.showSeven ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={hasEffectiveSeventh({ structure: slot.structure, ext7: slot.ext7, ext6: slot.ext6, ext9: slot.ext9, ext11: slot.ext11, ext13: slot.ext13 })} onChange={(e) => updateNearSlot(idx, { ext7: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleSeven} /> 7
              </label>
            ) : null}
            {slotUi.ext.showSix ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!slot.ext6} onChange={(e) => updateNearSlot(idx, { ext6: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleSix} /> 6
              </label>
            ) : null}
            {slotUi.ext.showNine ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" data-testid={`near-slot-${idx}-ext9`} checked={!!slot.ext9} onChange={(e) => updateNearSlot(idx, { ext9: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleNine} /> 9
              </label>
            ) : null}
            {slotUi.ext.showEleven ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" data-testid={`near-slot-${idx}-ext11`} checked={!!slot.ext11} onChange={(e) => updateNearSlot(idx, { ext11: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleEleven} /> 11
              </label>
            ) : null}
            {slotUi.ext.showThirteen ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" data-testid={`near-slot-${idx}-ext13`} checked={!!slot.ext13} onChange={(e) => updateNearSlot(idx, { ext13: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleThirteen} /> 13
              </label>
            ) : null}
          </div>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-7 col-span-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Omitir</label>
          <div className={UI_EXT_GRID}>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" data-testid={`near-slot-${idx}-omit-1`} checked={slot.omit === "1"} onChange={(e) => updateNearSlot(idx, { omit: e.target.checked ? "1" : "none", selFrets: null })} disabled={disableAll || (slot.omit === "1" && !slotUi.omit?.canToggleOff)} /> 1
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" data-testid={`near-slot-${idx}-omit-3`} checked={slot.omit === "3"} onChange={(e) => updateNearSlot(idx, { omit: e.target.checked ? "3" : "none", selFrets: null })} disabled={disableAll || slot.suspension !== "none" || (slot.omit === "3" && !slotUi.omit?.canToggleOff)} /> 3
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" data-testid={`near-slot-${idx}-omit-5`} checked={slot.omit === "5"} onChange={(e) => updateNearSlot(idx, { omit: e.target.checked ? "5" : "none", selFrets: null })} disabled={disableAll || (slot.omit === "5" && !slotUi.omit?.canToggleOff)} /> 5
            </label>
          </div>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(slot, idx, disableAll, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, nearSlotDesktopVoicingCompactClass)}
            {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotEditorFields(slot, idx, disableAll, slotUi, options, errMsg, opts = {}) {
    if (nearSlotFamilyOf(slot) === "quartal") {
      return renderNearSlotQuartalEditor(slot, idx, disableAll, options, errMsg, opts);
    }
    if (nearSlotFamilyOf(slot) === "guide_tones") {
      return renderNearSlotGuideToneEditor(slot, idx, disableAll, options, errMsg, opts);
    }
    return renderNearSlotTertianEditor(slot, idx, disableAll, slotUi, options, errMsg, opts);
  }

  function buildNearSlotRenderData(slot, idx) {
    const disableAll = !slot.enabled;
    const r = nearComputed.ranked[idx];
    const selectedVoicing = nearComputed.selected[idx] || null;
    const slotData = buildNearSlotStudyEntry(slot, r?.plan || null, selectedVoicing, idx);
    const notes = (slotData?.notes || spellChordNotesForSlot(slot)).join(", ");
    const slotDisplayName = slotData?.summary || "";
    const slotUi = r?.plan?.ui || buildChordUiRestrictions({
      structure: slot.structure,
      ext7: slot.ext7,
      ext6: slot.ext6,
      ext9: slot.ext9,
      ext11: slot.ext11,
      ext13: slot.ext13,
      omit: slot.omit || "none",
    });
    const rankedOptions = r?.ranked || [];
    const options = [...rankedOptions]
      .sort((a, b) => (a.minFret - b.minFret) || ((a.reach ?? (a.span + 1)) - (b.reach ?? (b.span + 1))) || (a.maxFret - b.maxFret) || a.frets.localeCompare(b.frets))
      .slice(0, idx === 0 ? 60 : 40);
    const errMsg = r?.err || null;
    const badgeMeta = buildNearSlotNoteMeta(slot, selectedVoicing);
    const badgeStripItems = badgeMeta ? badgeMeta.notes.map((note, noteIdx) => ({
      note,
      degree: badgeMeta.degreeLabels?.[noteIdx] || "",
      role: chordBadgeRoleFromDegreeLabel(badgeMeta.degreeLabels?.[noteIdx] || "", badgeMeta.intervals?.[noteIdx] ?? 0),
    })) : [];
    const slotLabel = `Acorde ${idx + 1}`;
    const titleText = `${slotLabel}${nearComputed.baseIdx === idx ? " (referencia)" : ""}`;

    return {
      disableAll,
      errMsg,
      options,
      slotData,
      slotUi,
      badgeStripItems,
      slotLabel,
      titleText,
      nearTitle: errMsg ? (
        <span className="inline-flex flex-wrap items-center gap-1">
          <span>{`${titleText} - `}</span>
          <span className="text-rose-400">{errMsg}</span>
        </span>
      ) : titleText,
      description: `${slotDisplayName} · Notas: ${notes}`,
    };
  }

  function renderNearSlotOpenStringsToggle(slot, idx, disableAll, className = "") {
    return (
      <label
        className={`inline-flex h-7 items-center gap-2 rounded-xl border px-2 text-xs font-semibold ${disableAll ? "cursor-not-allowed" : ""} ${className}`.trim()}
        style={disableAll ? {
          backgroundColor: "var(--control-disabled-bg)",
          borderColor: "var(--control-disabled-border)",
          color: "var(--control-disabled-text)",
        } : undefined}
        title="Permite usar cuerdas al aire como opción de voicing dentro del rango. La distancia se calcula solo con las notas pisadas."
      >
        <span>Permitir cuerdas al aire</span>
        <input
          type="checkbox"
          checked={slot.allowOpenStrings === true}
          onChange={(e) => updateNearSlot(idx, { allowOpenStrings: e.target.checked, selFrets: null })}
          disabled={disableAll}
          title="Permite usar cuerdas al aire como opción de voicing dentro del rango. La distancia se calcula solo con las notas pisadas."
          className="h-4 w-4 rounded border-slate-300"
        />
      </label>
    );
  }

  function renderMobileNearSlotCard(slot, idx, renderData) {
    const { disableAll, options, errMsg, slotData, badgeStripItems, slotLabel, titleText, description } = renderData;
    const titleMeta = titleText.startsWith(slotLabel) ? titleText.slice(slotLabel.length).trim() : "";
    const mobileDescription = titleMeta ? `${titleMeta} · ${description}` : description;

    return (
      <PanelBlock
        key={idx}
        data-testid={`near-slot-${idx}`}
        as="div"
        level="subsection"
        title={slotLabel}
        description={null}
        disabledHeader={disableAll}
        collapsed={!slot.enabled}
        bodyClassName="overflow-visible"
        headerAside={<div className="flex items-center gap-1.5">
            <button
              type="button"
              className={`${UI_BTN_SM} inline-flex items-center justify-center`}
              title="Abre el análisis del acorde, del voicing y de sus tensiones."
              onClick={() => {
                setStudyTarget(String(idx));
                setStudyOpen(true);
              }}
              disabled={disableAll}
              aria-label={`Estudiar Acorde ${idx + 1}`}
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <label className="inline-flex h-7 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm">
              <input
                type="checkbox"
                checked={!!slot.enabled}
                onChange={(e) => updateNearSlot(idx, { enabled: e.target.checked, selFrets: null })}
                className="h-4 w-4 rounded border-slate-300"
                title={`Activar/desactivar Acorde ${idx + 1}`}
              />
              <span>Activo</span>
            </label>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-sky-50 hover:text-slate-900"
              onClick={() => setMobileNearChordEditorIdx(idx)}
              aria-label={`Editar Acorde ${idx + 1}`}
            >
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>}
      >
        <div className="mb-3 text-[13px] font-semibold leading-5 text-slate-600">
          {mobileDescription}
        </div>
        {errMsg ? (
          <div className="mb-3 text-xs font-semibold text-rose-400">
            {errMsg}
          </div>
        ) : null}
        {badgeStripItems.length ? (
          <div>
            <ChordNoteBadgeStrip
              items={badgeStripItems}
              bassNote={slotData?.bassName || null}
              colorMap={colors}
            />
          </div>
        ) : null}
        <div className={badgeStripItems.length ? "mt-3" : ""}>
          {renderNearSlotOpenStringsToggle(slot, idx, disableAll)}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[210px] flex-1">
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg)}
          </div>
          {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
        </div>
      </PanelBlock>
    );
  }

  function renderMobileNearSlotEditorPortal() {
    if (!isMobileLayout || mobileNearChordEditorIdx == null || typeof document === "undefined") return null;
    const slot = nearSlots[mobileNearChordEditorIdx];
    if (!slot) return null;

    const { disableAll, options, errMsg, slotUi, titleText, description } = buildNearSlotRenderData(slot, mobileNearChordEditorIdx);
    const editorPanel = (
      <PanelBlock
        level="subsection"
        title={`Editar ${titleText}`}
        description={description}
        className="w-full max-h-[calc(100vh-6rem)] shadow-2xl"
        bodyClassName="max-h-[calc(100vh-11rem)] overflow-y-auto overflow-x-visible"
        headerAside={<button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-sky-50"
            onClick={() => setMobileNearChordEditorIdx(null)}
            aria-label="Cerrar edición de acorde cercano"
          >
            <X className="h-4 w-4" />
          </button>}
      >
        <div className="mb-3">
          <label className={UI_LABEL_SM}>Color del acorde</label>
          <div className="mt-1 inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-700">Fondo</span>
            <input
              type="color"
              value={nearBgColors[mobileNearChordEditorIdx]}
              onChange={(e) => setNearBgColor(mobileNearChordEditorIdx, e.target.value)}
              className="h-6 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
              disabled={disableAll}
            />
          </div>
        </div>
        {renderNearSlotEditorFields(slot, mobileNearChordEditorIdx, disableAll, slotUi, options, errMsg, { showMobileVoicing: false })}
      </PanelBlock>
    );

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xl:hidden">
        <div className="w-full max-w-[430px]">
          {editorPanel}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <>
      {visible ? (
        <PanelBlock
          data-testid="near-chords-panel"
          title={isMobileLayout ? (
            <span className="inline-flex items-center gap-2">
              <span>Acordes cercanos</span>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-600 hover:text-slate-900"
                onClick={(e) => openMobileInfoPopover(e, "Acordes cercanos", NEAR_CHORDS_INFO_TEXT)}
                aria-label="Información sobre Acordes cercanos"
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ) : "Acordes cercanos"}
          titleTooltip={!isMobileLayout ? NEAR_CHORDS_INFO_TEXT : ""}
          headerAside={<div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700" title={!isMobileLayout ? NEAR_AUTO_SCALE_INFO_TEXT : undefined}>
                <span>Auto escala</span>
                {isMobileLayout ? (
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-600 hover:text-slate-900"
                    onClick={(e) => openMobileInfoPopover(e, "Auto escala", NEAR_AUTO_SCALE_INFO_TEXT)}
                    aria-label="Información sobre Auto escala"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
              <button
                type="button"
                className={`rounded-xl px-2 py-1 text-xs ring-1 ring-slate-200 shadow-sm ${nearAutoScaleSync ? "bg-[#71a3c1] text-slate-900" : "bg-white"}`}
                onClick={() => setNearAutoScaleSync((v) => !v)}
                title="Activa o desactiva el ajuste automático de acordes cercanos según la escala"
              >
                {nearAutoScaleSync ? "ON" : "OFF"}
              </button>
            </div>}
          bodyClassName="space-y-3"
        >
          <div className="text-xs text-slate-600">
            <b>Posibles tonalidades:</b> {nearTonalityAnalysis.text}
          </div>

          <div className="space-y-2">
            {nearSlots.map((slot, idx) => {
              const { disableAll, options, errMsg, slotData, slotUi, badgeStripItems, slotLabel, titleText, nearTitle, description } = buildNearSlotRenderData(slot, idx);

              if (isMobileLayout) {
                return renderMobileNearSlotCard(slot, idx, { disableAll, options, errMsg, slotData, slotUi, badgeStripItems, slotLabel, titleText, nearTitle, description });
              }

              return (
                <PanelBlock
                  key={idx}
                  data-testid={`near-slot-${idx}`}
                  as="div"
                  level="subsection"
                  title={nearTitle}
                  description={description}
                  disabledHeader={disableAll}
                  collapsed={!slot.enabled}
                  bodyClassName="overflow-visible"
                  headerAside={<div className="flex items-center gap-2">
                      {renderNearSlotOpenStringsToggle(slot, idx, disableAll)}
                      <button
                        type="button"
                        className={UI_BTN_SM + " w-auto px-3"}
                        title="Abre el análisis del acorde, del voicing y de sus tensiones."
                        onClick={() => {
                          setStudyTarget(String(idx));
                          setStudyOpen(true);
                        }}
                        disabled={disableAll}
                      >
                        Estudiar
                      </button>
                      <span
                        className="text-xs font-semibold"
                        style={disableAll ? { color: "var(--control-disabled-text)" } : undefined}
                      >
                        Fondo
                      </span>
                      <input
                        type="color"
                        value={nearBgColors[idx]}
                        onChange={(e) => setNearBgColor(idx, e.target.value)}
                        className="h-6 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
                        disabled={disableAll}
                      />
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          data-testid={`near-slot-${idx}-enabled`}
                          type="checkbox"
                          checked={!!slot.enabled}
                          onChange={(e) => updateNearSlot(idx, { enabled: e.target.checked, selFrets: null })}
                          className="h-4 w-4 rounded border-slate-300"
                          title={`Activar/desactivar Acorde ${idx + 1}`}
                        />
                        Activo
                      </label>
                    </div>}
                  >
                  {badgeStripItems.length ? (
                    <div className="mb-3">
                      <ChordNoteBadgeStrip
                        items={badgeStripItems}
                        bassNote={slotData?.bassName || null}
                        colorMap={colors}
                      />
                    </div>
                  ) : null}
                  {nearSlotFamilyOf(slot) === "quartal"
                    ? renderNearSlotQuartalEditor(slot, idx, disableAll, options, errMsg)
                    : nearSlotFamilyOf(slot) === "guide_tones"
                      ? renderNearSlotGuideToneEditor(slot, idx, disableAll, options, errMsg)
                      : renderNearSlotTertianEditor(slot, idx, disableAll, slotUi, options, errMsg)}
                </PanelBlock>
              );
            })}
          </div>

          {renderNearChordsFretboard()}
        </PanelBlock>
      ) : null}
      {isMobileLayout && mobileNearChordEditorIdx != null ? (
        <div
          className="fixed inset-0 z-40 touch-none overscroll-contain bg-slate-900/35 xl:hidden"
          onClick={() => setMobileNearChordEditorIdx(null)}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        />
      ) : null}
      {renderMobileNearSlotEditorPortal()}
    </>
  );
}
