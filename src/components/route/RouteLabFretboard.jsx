import { WebFretNumberHeader } from "../fretboard/FretboardShared.jsx";
import { MusicStaff } from "../../music/appPatternRouteStaffCore.jsx";
import * as AppStaticData from "../../music/appStaticData.js";
import * as AppMusicBasics from "../../music/appMusicBasics.js";

const { STRINGS, fretGridCols, hasInlayCell, mobileVerticalFretBorderClass } = AppStaticData;
const { mod12, pcToName, rgba, FRET_CELL_BG, FRET_INLAY_BG, intervalToDegreeToken } = AppMusicBasics;

export default function RouteLabFretboard({
  route,
  derived,
  fretboard,
  ui,
}) {
  const {
    routeLabPickNext,
    setRouteLabStartCode,
    setRouteLabPickNext,
    setRouteLabEndCode,
  } = route;

  const {
    routeLabIndexByCell,
    routeLabText,
    routeLabResult,
    routeLabDebugLines,
    routeStaffEvents,
    routeKeySignature,
  } = derived;

  const {
    isNarrowBoardLayout, maxFret,
    scalePcs, showExtra, extraPcs, showNonScale,
    rootPc, preferSharps,
    scaleIntervalLabels, spelledScaleNotes, spelledExtraNotes, extraIntervals,
    thirdOffsets, scaleName, debugMode, colors,
  } = fretboard;

  const { Circle, HoverCellNote, MobileMainFretboard, labelForPc } = ui;

  function roleOfPc(pc) {
    const interval = mod12(pc - rootPc);
    const bluesBlue = scaleName === "Pentatónica menor + blue note" ? 6 : scaleName === "Pentatónica mayor + blue note" ? 3 : null;
    if (bluesBlue != null && interval === bluesBlue) return "extra";
    if (interval === 0) return "root";
    if (thirdOffsets.includes(interval)) return "third";
    if (interval === 7) return "fifth";
    return "other";
  }

  function getDisplayRole({ pc, inScale, inExtra }) {
    const role = roleOfPc(pc);
    if (role !== "other") return role;
    if (inExtra) return "extra";
    if (inScale) return "other";
    return null;
  }

  function renderCell({ sIdx, fret, cellClassName, compact }) {
    const pc = mod12(STRINGS[sIdx].pc + fret);
    const inScale = scalePcs.has(pc);
    const inExtra = showExtra && extraPcs.has(pc);
    const displayRole = getDisplayRole({ pc, inScale, inExtra });
    const cellKey = `${sIdx}:${fret}`;
    const routeIdx = routeLabIndexByCell.get(cellKey);
    const inRoute = routeIdx != null;
    const bgRoute = inRoute
      ? {
          backgroundImage: `linear-gradient(0deg, ${rgba(colors.route, 0.28)} 0%, ${rgba(colors.route, 0.28)} 100%)`,
          boxShadow: `inset 0 0 0 2px ${rgba("#000000", 0.9)}`,
        }
      : {};
    const shouldRender = inRoute || displayRole !== null || showNonScale;
    const effectiveRole = displayRole ?? roleOfPc(pc);

    const handleClick = () => {
      if (!inScale) return;
      const code = `${sIdx + 1}${fret}`;
      if (routeLabPickNext === "start") {
        setRouteLabStartCode(code);
        setRouteLabPickNext("end");
      } else {
        setRouteLabEndCode(code);
        setRouteLabPickNext("start");
      }
    };

    if (compact) {
      return (
        <div
          key={`${sIdx}-${fret}`}
          onClick={handleClick}
          className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${cellClassName} ${
            mobileVerticalFretBorderClass(fret)
          } ${inScale ? "cursor-pointer hover:ring-2 hover:ring-slate-300" : ""}`}
          style={{ backgroundColor: fret === 0 ? "transparent" : FRET_CELL_BG, ...bgRoute }}
        >
          <HoverCellNote sIdx={sIdx} fret={fret} visible={!shouldRender} />
          {shouldRender && (inRoute || displayRole !== null) ? (
            <Circle pc={pc} role={effectiveRole} fret={fret} sIdx={sIdx} badge={inRoute ? routeIdx : null} kingTags={[]} />
          ) : showNonScale ? (
            <div className="text-[10px] text-slate-400">{labelForPc(pc)}</div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        key={`${sIdx}-${fret}`}
        onClick={handleClick}
        className={`group relative isolate flex h-8 overflow-visible items-center justify-center rounded-lg border ${
          fret === 0 ? "border-slate-300" : "border-slate-200"
        } ${shouldRender && displayRole ? "z-[4]" : "z-0"} ${inScale ? "cursor-pointer hover:ring-2 hover:ring-slate-300" : ""}`}
        style={{ backgroundColor: FRET_CELL_BG, ...bgRoute }}
      >
        {hasInlayCell(fret, sIdx) ? (
          <div
            className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2"
            style={{ bottom: "-10px" }}
          >
            <div className="h-4 w-4 rounded-full opacity-95" style={{ backgroundColor: FRET_INLAY_BG }} />
          </div>
        ) : null}
        <HoverCellNote sIdx={sIdx} fret={fret} visible={!shouldRender} />
        {shouldRender && (inRoute || displayRole !== null) ? (
          <Circle pc={pc} role={effectiveRole} fret={fret} sIdx={sIdx} badge={inRoute ? routeIdx : null} kingTags={[]} />
        ) : showNonScale ? (
          <div className="text-[10px] text-slate-400">{labelForPc(pc)}</div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {isNarrowBoardLayout ? (
        <MobileMainFretboard
          renderCell={({ sIdx, fret, cellClassName }) => renderCell({ sIdx, fret, cellClassName, compact: true })}
        />
      ) : (
        <>
          <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
            <div className="text-xs font-semibold text-slate-600">Cuerda</div>
            {Array.from({ length: maxFret + 1 }, (_, fret) => (
              <WebFretNumberHeader key={fret} fret={fret} />
            ))}
          </div>

          <div className="mt-2 space-y-1">
            {STRINGS.map((st, sIdx) => (
              <div key={st.label} className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
                <div className="text-xs font-medium text-slate-700">{st.label}</div>
                {Array.from({ length: maxFret + 1 }, (_, fret) => renderCell({ sIdx, fret, cellClassName: "", compact: false }))}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 space-y-1 text-xs text-slate-600">
        <div>
          Escala activa ({pcToName(rootPc, preferSharps)}): {scaleIntervalLabels.join(" – ")}
        </div>
        <div>
          Escala activa ({pcToName(rootPc, preferSharps)}): {spelledScaleNotes.join(" – ")}
        </div>
        {debugMode && routeLabText ? (
          <>
            <div>
              <b>Ruta texto:</b> {routeLabText}
            </div>
            <div>
              <b>Coste total:</b> {routeLabResult.cost != null ? Number(routeLabResult.cost).toFixed(2) : "—"}
            </div>
            <details className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
              <summary className="cursor-pointer font-semibold text-slate-700">Por qué eligió esta ruta</summary>
              <div className="mt-2 space-y-1 text-slate-600">
                {routeLabDebugLines.length ? routeLabDebugLines.map((line, idx) => (
                  <div key={idx}>{line}</div>
                )) : <div>Sin detalle disponible.</div>}
              </div>
            </details>
          </>
        ) : null}

        {routeStaffEvents.length ? (
          <div className="mt-3">
            <div className="mb-1 text-xs font-semibold text-slate-700">Pentagrama 4/4</div>
            <MusicStaff
              events={routeStaffEvents}
              preferSharps={preferSharps}
              clefMode="treble"
              keySignature={routeKeySignature}
              inlineEventLabels={routeStaffEvents.map((evt) => evt?.spelledNotes?.[0] || "")}
            />
          </div>
        ) : null}

        {showExtra ? (
          <>
            <div>
              Extra ({pcToName(rootPc, preferSharps)}): {extraIntervals.map((i) => intervalToDegreeToken(i)).join(" – ")}
            </div>
            <div>
              Extra ({pcToName(rootPc, preferSharps)}): {spelledExtraNotes.join(" – ")}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
