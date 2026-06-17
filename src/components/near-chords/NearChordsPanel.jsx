import React from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import PanelBlock from "../PanelBlock.jsx";
import NearChordSlot from "./NearChordSlot.jsx";
import { InfoTitle as InfoTitleImpl } from "../ui/AppUiPrimitives.jsx";
import { MobileMainFretboard as MobileMainFretboardImpl } from "../fretboard/MobileMainFretboard.jsx";
import { HoverCellNote as HoverCellNoteImpl } from "../fretboard/FretboardShared.jsx";
import FretNoteMarker from "../fretboard/FretNoteMarker.jsx";

import { calibratedClusterPos, cornerStyle, fret0ClusterPos, fret0ClusterPosMobile, mobileNonFret0ClusterPos, computeMobileFret0TopPadding, FRET0_SPACING } from "../../features/near-chords/nearFretCellLayout.js";
import * as AppStaticData from "../../music/appStaticData.js";
const {
  NEAR_CHORDS_INFO_TEXT,
  NEAR_AUTO_SCALE_INFO_TEXT,
  NEAR_CHORD_SLOT_COLORS,
  STRINGS,
  FRET_CELL_BG,
  FRET_INLAY_BG,
  fretGridCols,
  normalizeVisibleFrets,
  hasInlayCell,
  mobileVerticalFretBorderClass,
} = AppStaticData;

import * as AppMusicBasics from "../../music/appMusicBasics.js";
const {
  mod12,
  pcToName,
  pcToDualName,
  intervalToSimpleChordDegreeToken,
  intervalToChordToken,
} = AppMusicBasics;

import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";
const { buildChordUiRestrictions } = AppVoicingStudyCore;

import * as AppPatternRouteStaffCore from "../../music/appPatternRouteStaffCore.jsx";
const {
  formatChordBadgeDegree,
  chordBadgeRoleFromDegreeLabel,
  chordFormulaBadgeRoleFromDegreeLabel,
} = AppPatternRouteStaffCore;

// UI constants — same strings as in App.jsx
const UI_BTN_SM = "h-7 w-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold shadow-sm hover:bg-sky-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_INPUT_SM = "h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";


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


  function buildNearSlotRenderData(slot, idx) {
    const disableAll = !slot.enabled;
    const r = nearComputed.ranked[idx];
    const selectedVoicing = nearComputed.selected[idx] || null;
    const slotData = buildNearSlotStudyEntry(slot, r?.plan || null, selectedVoicing, idx);
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
    const slotChordName = slotData?.chordName || null;
    const titleText = slotChordName
      ? `${slotChordName} · ${slotLabel}`
      : slotLabel;
    const titleJsx = (
      <span data-testid={`near-slot-${idx}-title`}>
        <span
          data-testid={`near-slot-${idx}-title-chord`}
          className={!disableAll && slotChordName ? "text-sky-700" : undefined}
          style={disableAll && slotChordName ? { color: "oklch(0.75 0.05 233.17)" } : undefined}
        >
          {slotChordName || slotLabel}
        </span>
        {slotChordName
          ? <span className={disableAll ? "text-slate-400" : undefined}>{` · ${slotLabel}`}</span>
          : null}
      </span>
    );

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
          {titleJsx}{" - "}
          <span className="text-rose-400">{errMsg}</span>
        </span>
      ) : titleJsx,
      description: disableAll
        ? <span className="text-slate-400">{slotDisplayName}</span>
        : slotDisplayName,
    };
  }

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

  function Mini({ slotIdx, pc, size = "m" }) {
    const slot = nearSlots[slotIdx];
    const voicing = nearComputed.selected[slotIdx] || null;
    const chordBg = nearBgColors[slotIdx] || NEAR_CHORD_SLOT_COLORS[slotIdx]?.bg || "#94a3b8";
    const ring = NEAR_CHORD_SLOT_COLORS[slotIdx]?.border || "#64748b";
    const label = slotLabelForPc(slot, pc, voicing);
    return (
      <FretNoteMarker
        color={chordBg}
        ring={ring}
        label={label}
        size={size}
        title={`${label} · acorde ${slotIdx + 1}`}
      />
    );
  }

  function renderNearChordsFretboard() {
    const baseSlotIdx = nearComputed.baseIdx;
    const baseSlot = baseSlotIdx >= 0 ? nearSlots[baseSlotIdx] : null;
    const basePlan = baseSlotIdx >= 0 ? (nearComputed.ranked[baseSlotIdx]?.plan || null) : null;
    const baseVoicing = baseSlotIdx >= 0 ? (nearComputed.selected[baseSlotIdx] || null) : null;
    const baseData = baseSlot ? buildNearSlotStudyEntry(baseSlot, basePlan, baseVoicing, baseSlotIdx) : null;
    const baseChordName = baseData?.chordName || null;
    const nearFretboardInfoText = `${baseChordName ? `Acorde activo: ${baseChordName}. ` : ""}Compara las digitaciones activas dentro del mismo rango. Relleno y borde = color del acorde · texto = nota/intervalo.`;
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

    // Padding superior para el mástil móvil: espacio entre cabecera de cuerdas y
    // traste 0 para que los marcadores que desbordan hacia arriba sean visibles.
    const maxMobileFret0Cluster = (isNarrowBoardLayout && mobileVisibleFrets?.includes(0))
      ? Math.max(0, ...STRINGS.map((_, sIdx) => getItemsForCell(sIdx, 0).length))
      : 0;
    const mobileFret0ExtraTopPx = computeMobileFret0TopPadding(maxMobileFret0Cluster);

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
            fret0TopPadding={mobileFret0ExtraTopPx}
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
                      <Mini size={fret === 0 ? "s" : "m"} slotIdx={items[0].slotIdx} pc={items[0].pc} fret={fret} sIdx={sIdx} />
                    </div>
                  ) : items.length ? (
                    <div className="absolute inset-0 z-[5] pointer-events-none">
                      {items
                        .slice()
                        .sort((a, b) => a.slotIdx - b.slotIdx)
                        .slice(0, 4)
                        .map((it, i2) => {
                          const pos = fret === 0
                            ? fret0ClusterPosMobile(items.length, i2)
                            : mobileNonFret0ClusterPos(items.length, i2);
                          return (
                            <div key={`${it.slotIdx}-${it.role}-${i2}`} className="absolute" style={pos}>
                              <Mini size="cal" slotIdx={it.slotIdx} pc={it.pc} fret={fret} sIdx={sIdx} />
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
                          data-testid={`nc-fret-cell-${sIdx}-${fret}`}
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
                              <Mini size={fret === 0 ? "s" : "m"} slotIdx={items[0].slotIdx} pc={items[0].pc} fret={fret} sIdx={sIdx} />
                            </div>
                          ) : items.length ? (
                            <div className="absolute inset-0 z-[5] pointer-events-none">
                              {items
                                .slice()
                                .sort((a, b) => a.slotIdx - b.slotIdx)
                                .slice(0, 4)
                                .map((it, i2) => {
                                  const pos = fret === 0
                                    ? fret0ClusterPos(items.length, i2)
                                    : (calibratedClusterPos(items.length, i2) || cornerStyle(items.length, i2));
                                  const miniSize = fret === 0 ? "cal" : (items.length === 2 ? "pair" : calibratedClusterPos(items.length, i2) ? "cal" : "s");
                                  return (
                                    <div key={`${it.slotIdx}-${it.role}-${i2}`} className="absolute" style={pos}>
                                      <Mini size={miniSize} slotIdx={it.slotIdx} pc={it.pc} fret={fret} sIdx={sIdx} />
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
            <b>Tonalidades diatónicas estrictas de los acordes activos:</b> {nearTonalityAnalysis.text}
          </div>

          <div className="space-y-2">
            {nearSlots.map((slot, idx) => (
              <NearChordSlot
                key={idx}
                slot={slot}
                idx={idx}
                renderData={buildNearSlotRenderData(slot, idx)}
                isMobileLayout={isMobileLayout}
                nearBgColors={nearBgColors}
                colors={colors}
                updateNearSlot={updateNearSlot}
                setStudyTarget={setStudyTarget}
                setStudyOpen={setStudyOpen}
                setMobileNearChordEditorIdx={setMobileNearChordEditorIdx}
                mobileNearChordEditorIdx={mobileNearChordEditorIdx}
                setNearBgColor={setNearBgColor}
                nearSlotFamilyOf={nearSlotFamilyOf}
              />
            ))}
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
    </>
  );
}
