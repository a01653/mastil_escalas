import { createElement, useMemo } from "react";
import * as AppStaticData from "../../music/appStaticData.js";
import * as AppMusicBasics from "../../music/appMusicBasics.js";

const {
  STRINGS,
  fretsForCompactVoicing,
  normalizeVisibleFrets,
  fretGridCols,
  mobileVerticalFretBorderClass,
  fretCellStyleForLayout,
  hasInlayCell,
  fretNoteSizeClass,
} = AppStaticData;

const {
  isDark,
  rgba,
  FRET_CELL_BG,
  FRET_INLAY_BG,
  mod12,
  spellNoteFromChordInterval,
  pcToName,
} = AppMusicBasics;

// ── ChordCircle ──────────────────────────────────────────────────────────────

export function ChordCircle({ role, isBass, displayLabel, titleText, fret = 1, compactOpen = false, colors, isNarrowBoardLayout }) {
  const bg = colors[role] || colors.other;
  const dark = isDark(bg);

  return (
    <div
      className={`relative z-20 inline-flex ${fretNoteSizeClass(fret, isNarrowBoardLayout, compactOpen)} items-center justify-center rounded-full text-[10px] font-semibold`}
      style={{
        backgroundColor: bg,
        color: role === "other" ? "#0f172a" : dark ? "#ffffff" : "#0f172a",
        boxShadow: isBass
          ? `inset 0 0 0 2px ${rgba("#000000", 0.95)}`
          : `0 0 0 2px ${rgba(bg, 0.25)}`,
      }}
      title={titleText}
    >
      {displayLabel}
    </div>
  );
}

// ── GuideToneCircle ───────────────────────────────────────────────────────────

export function GuideToneCircle({ pc, isBass, fret = 1, compactOpen = false, colors, isNarrowBoardLayout, guideToneRoleOfPc, labelForGuideTonePc, chordRootPc, chordPreferSharps }) {
  const role = guideToneRoleOfPc(pc);
  const bg = colors[role] || colors.other;
  const dark = isDark(bg);
  return (
    <div
      className={`relative z-20 inline-flex ${fretNoteSizeClass(fret, isNarrowBoardLayout, compactOpen)} items-center justify-center rounded-full text-[10px] font-semibold`}
      style={{
        backgroundColor: bg,
        color: role === "other" ? "#0f172a" : dark ? "#ffffff" : "#0f172a",
        boxShadow: isBass ? `inset 0 0 0 2px ${rgba("#000000", 0.95)}` : `0 0 0 2px ${rgba(bg, 0.25)}`,
      }}
      title={`${spellNoteFromChordInterval(chordRootPc, mod12(pc - chordRootPc), chordPreferSharps)} · ${labelForGuideTonePc(pc)}${isBass ? " · bajo" : ""}`}
    >
      {labelForGuideTonePc(pc)}
    </div>
  );
}

// ── ChordFretboard ────────────────────────────────────────────────────────────

export function ChordFretboard({
  voicing,
  emptyMessage = "",
  roleForPc,
  labelForPc,
  noteNameForPc,
  maxFret,
  isNarrowBoardLayout,
  showNonScale,
  colors,
  HoverCellNote: HoverCellNoteComponent,
  MobileMainFretboard: MobileMainFretboardComponent,
}) {
  const notesMap = useMemo(() => {
    const m = new Map();
    if (!voicing?.notes?.length) return m;
    for (const n of voicing.notes) {
      m.set(`${n.sIdx}:${n.fret}`, {
        pc: n.pc,
        isBass: `${n.sIdx}:${n.fret}` === voicing.bassKey,
      });
    }
    return m;
  }, [voicing]);

  const stringNoteMap = useMemo(() => {
    const m = new Map();
    if (!voicing?.notes?.length) return m;
    for (const n of voicing.notes) m.set(n.sIdx, { pc: n.pc });
    return m;
  }, [voicing]);

  const mutedStrings = useMemo(
    () => new Set(Array.isArray(voicing?.mutedSIdx) ? voicing.mutedSIdx : []),
    [voicing]
  );

  const displayFrets = isNarrowBoardLayout
    ? fretsForCompactVoicing(voicing, maxFret)
    : Array.from({ length: maxFret + 1 }, (_, fret) => fret);
  const mobileVisibleFrets = isNarrowBoardLayout ? normalizeVisibleFrets([0, ...displayFrets], maxFret) : null;
  const gridCols = fretGridCols(maxFret);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">

      {!voicing && emptyMessage ? (
        <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
          {emptyMessage}
        </div>
      ) : null}

      {isNarrowBoardLayout ? (
        createElement(MobileMainFretboardComponent, {
          frets: mobileVisibleFrets,
          renderStringFooter: (sIdx) => {
            const note = stringNoteMap.get(sIdx);
            return note && !mutedStrings.has(sIdx)
              ? <span className="text-[10px] font-bold text-sky-600">{noteNameForPc(note.pc)}</span>
              : null;
          },
          renderCell: ({ sIdx, fret, cellClassName }) => {
            const item = notesMap.get(`${sIdx}:${fret}`);
            const isMutedOpen = fret === 0 && mutedStrings.has(sIdx);

            return (
              <div
                key={`${sIdx}-${fret}`}
                className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${
                  mobileVerticalFretBorderClass(fret)
                } ${cellClassName}`}
                style={{ backgroundColor: fret === 0 ? "transparent" : FRET_CELL_BG }}
              >
                {createElement(HoverCellNoteComponent, { sIdx, fret, visible: !item && !isMutedOpen })}
                {item ? (
                  <ChordCircle
                    role={roleForPc(item.pc)}
                    isBass={item.isBass}
                    displayLabel={labelForPc(item.pc)}
                    titleText={`${noteNameForPc(item.pc)}${item.isBass ? " · bajo" : ""}`}
                    fret={fret}
                    compactOpen={fret === 0}
                    colors={colors}
                    isNarrowBoardLayout={isNarrowBoardLayout}
                  />
                ) : isMutedOpen ? (
                  <span className="text-base font-semibold leading-none text-slate-400">X</span>
                ) : showNonScale ? (
                  <div className="text-[10px] text-slate-400">{labelForPc(mod12(STRINGS[sIdx].pc + fret))}</div>
                ) : null}
              </div>
            );
          },
        })
      ) : (
        <>
          <div className="grid items-center gap-1" style={{ gridTemplateColumns: gridCols }}>
            <div className="text-xs font-semibold text-slate-600">Cuerda</div>
            {displayFrets.map((fret) => (
              <div key={fret} className="relative flex flex-col items-center">
                <div className="text-[10px] text-slate-600">{fret}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-2 space-y-1">
            {STRINGS.map((st, sIdx) => (
              <div
                key={st.label}
                className="grid items-center gap-1"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium text-slate-700">{st.label}</span>
                  {stringNoteMap.has(sIdx) && !mutedStrings.has(sIdx) ? (
                    <span className="text-[10px] font-bold text-sky-600">{noteNameForPc(stringNoteMap.get(sIdx).pc)}</span>
                  ) : null}
                </div>

                {displayFrets.map((fret) => {
                  const cellKey = `${sIdx}:${fret}`;
                  const item = notesMap.get(cellKey);

                  return (
                    <div
                      key={`${sIdx}-${fret}`}
                      className={`group relative isolate flex overflow-visible items-center justify-center rounded-lg border ${
                        fret === 0 ? "border-slate-300" : "border-slate-200"
                      } ${item ? "z-[4]" : "z-0"}`}
                      style={fretCellStyleForLayout(fret, false, { backgroundColor: FRET_CELL_BG })}
                    >
                      {createElement(HoverCellNoteComponent, { sIdx, fret, visible: !item })}

                      {hasInlayCell(fret, sIdx) ? (
                        <div
                          className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
                          style={{ top: "78%" }}
                        >
                          <div className="h-4 w-4 rounded-full opacity-80" style={{ backgroundColor: FRET_INLAY_BG }} />
                        </div>
                      ) : null}

                      {item ? (
                        <ChordCircle
                          role={roleForPc(item.pc)}
                          isBass={item.isBass}
                          displayLabel={labelForPc(item.pc)}
                          titleText={`${noteNameForPc(item.pc)}${item.isBass ? " · bajo" : ""}`}
                          fret={fret}
                          colors={colors}
                          isNarrowBoardLayout={isNarrowBoardLayout}
                        />
                      ) : fret === 0 && mutedStrings.has(sIdx) ? (
                        <span className="text-base font-semibold leading-none text-slate-400">X</span>
                      ) : showNonScale ? (
                        <div className="text-[10px] text-slate-400">{labelForPc(mod12(STRINGS[sIdx].pc + fret))}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── GuideToneFretboard ────────────────────────────────────────────────────────

export function GuideToneFretboard({
  voicing,
  emptyMessage = "",
  maxFret,
  isNarrowBoardLayout,
  showNonScale,
  chordPreferSharps,
  colors,
  HoverCellNote: HoverCellNoteComponent,
  MobileMainFretboard: MobileMainFretboardComponent,
  guideToneRoleOfPc,
  labelForGuideTonePc,
  chordRootPc,
  labelForCellAt,
}) {
  const notesMap = useMemo(() => {
    const m = new Map();
    if (!voicing?.notes?.length) return m;
    for (const n of voicing.notes) {
      m.set(`${n.sIdx}:${n.fret}`, {
        pc: n.pc,
        isBass: `${n.sIdx}:${n.fret}` === voicing.bassKey,
      });
    }
    return m;
  }, [voicing]);

  const mutedStrings = useMemo(
    () => new Set(Array.isArray(voicing?.mutedSIdx) ? voicing.mutedSIdx : []),
    [voicing]
  );

  const stringNoteMapGT = useMemo(() => {
    const m = new Map();
    if (!voicing?.notes?.length) return m;
    for (const n of voicing.notes) m.set(n.sIdx, { pc: n.pc });
    return m;
  }, [voicing]);

  const displayFrets = isNarrowBoardLayout
    ? fretsForCompactVoicing(voicing, maxFret)
    : Array.from({ length: maxFret + 1 }, (_, fret) => fret);
  const mobileVisibleFrets = isNarrowBoardLayout ? normalizeVisibleFrets([0, ...displayFrets], maxFret) : null;
  const gridCols = fretGridCols(maxFret);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">

      {!voicing && emptyMessage ? (
        <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
          {emptyMessage}
        </div>
      ) : null}

      {isNarrowBoardLayout ? (
        createElement(MobileMainFretboardComponent, {
          frets: mobileVisibleFrets,
          renderStringFooter: (sIdx) => {
            const note = stringNoteMapGT.get(sIdx);
            return note && !mutedStrings.has(sIdx)
              ? <span className="text-[10px] font-bold text-sky-600">{pcToName(note.pc, chordPreferSharps)}</span>
              : null;
          },
          renderCell: ({ sIdx, fret, cellClassName }) => {
            const item = notesMap.get(`${sIdx}:${fret}`);
            const isMutedOpen = fret === 0 && mutedStrings.has(sIdx);

            return (
              <div
                key={`${sIdx}-${fret}`}
                className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${
                  mobileVerticalFretBorderClass(fret)
                } ${cellClassName}`}
                style={{ backgroundColor: fret === 0 ? "transparent" : FRET_CELL_BG }}
              >
                {createElement(HoverCellNoteComponent, { sIdx, fret, visible: !item && !isMutedOpen })}
                {item ? (
                  <GuideToneCircle
                    pc={item.pc}
                    isBass={item.isBass}
                    fret={fret}
                    compactOpen={fret === 0}
                    colors={colors}
                    isNarrowBoardLayout={isNarrowBoardLayout}
                    guideToneRoleOfPc={guideToneRoleOfPc}
                    labelForGuideTonePc={labelForGuideTonePc}
                    chordRootPc={chordRootPc}
                    chordPreferSharps={chordPreferSharps}
                  />
                ) : isMutedOpen ? (
                  <span className="text-base font-semibold leading-none text-slate-400">X</span>
                ) : showNonScale ? (
                  <div className="text-[10px] text-slate-400">{labelForCellAt(sIdx, fret)}</div>
                ) : null}
              </div>
            );
          },
        })
      ) : (
        <>
          <div className="grid items-center gap-1" style={{ gridTemplateColumns: gridCols }}>
            <div className="text-xs font-semibold text-slate-600">Cuerda</div>
            {displayFrets.map((fret) => (
              <div key={fret} className="relative flex flex-col items-center">
                <div className="text-[10px] text-slate-600">{fret}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-2 space-y-1">
            {STRINGS.map((st, sIdx) => (
              <div key={st.label} className="grid items-center gap-1" style={{ gridTemplateColumns: gridCols }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium text-slate-700">{st.label}</span>
                  {stringNoteMapGT.has(sIdx) && !mutedStrings.has(sIdx) ? (
                    <span className="text-[10px] font-bold text-sky-600">{pcToName(stringNoteMapGT.get(sIdx).pc, chordPreferSharps)}</span>
                  ) : null}
                </div>
                {displayFrets.map((fret) => {
                  const cellKey = `${sIdx}:${fret}`;
                  const item = notesMap.get(cellKey);
                  return (
                    <div
                      key={`${sIdx}-${fret}`}
                      className={`group relative isolate flex overflow-visible items-center justify-center rounded-lg border ${fret === 0 ? "border-slate-300" : "border-slate-200"} ${item ? "z-[4]" : "z-0"}`}
                      style={fretCellStyleForLayout(fret, false, { backgroundColor: FRET_CELL_BG })}
                    >
                      {createElement(HoverCellNoteComponent, { sIdx, fret, visible: !item })}
                      {hasInlayCell(fret, sIdx) ? (
                        <div className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 -translate-y-1/2" style={{ top: "78%" }}>
                          <div className="h-4 w-4 rounded-full opacity-80" style={{ backgroundColor: FRET_INLAY_BG }} />
                        </div>
                      ) : null}
                      {item ? (
                        <GuideToneCircle
                          pc={item.pc}
                          isBass={item.isBass}
                          fret={fret}
                          colors={colors}
                          isNarrowBoardLayout={isNarrowBoardLayout}
                          guideToneRoleOfPc={guideToneRoleOfPc}
                          labelForGuideTonePc={labelForGuideTonePc}
                          chordRootPc={chordRootPc}
                          chordPreferSharps={chordPreferSharps}
                        />
                      ) : (fret === 0 && mutedStrings.has(sIdx) ? (
                        <span className="text-base font-semibold leading-none text-slate-400">X</span>
                      ) : (showNonScale ? (
                        <div className="text-[10px] text-slate-400">{labelForCellAt(sIdx, fret)}</div>
                      ) : null))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
