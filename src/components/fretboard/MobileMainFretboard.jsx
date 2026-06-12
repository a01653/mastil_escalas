import * as AppStaticData from "../../music/appStaticData.js";
import * as AppMusicBasics from "../../music/appMusicBasics.js";

const {
  STRINGS,
  INLAY_DOUBLE,
  MOBILE_VERTICAL_FRETBOARD_COLS,
  MOBILE_VERTICAL_FRET_LABEL_COL,
  MOBILE_VERTICAL_STRING_ORDER,
  MOBILE_CHORD_NUT_WIDTH,
  MOBILE_CHORD_NUT_BG,
  normalizeVisibleFrets,
  mobileVerticalFretGridCols,
  mobileVerticalFretRowMarginTop,
  mobileVerticalFretCellClass,
  mobileStringHeaderParts,
  mobileFretHasInlay,
  mobileInlayGridColumns,
} = AppStaticData;

const { FRET_INLAY_BG } = AppMusicBasics;

export function MobileMainFretboard({ renderCell, frets = null, renderStringFooter = null, maxFret, fret0TopPadding = 0 }) {
  const visibleFrets = normalizeVisibleFrets(
    Array.isArray(frets) && frets.length
      ? frets
      : Array.from({ length: maxFret + 1 }, (_, fret) => fret),
    maxFret
  );
  const showOpenNutLine = visibleFrets.includes(0) && visibleFrets.includes(1);

  return (
    <div className="mx-auto w-fit max-w-full">
      <div className="relative grid items-center gap-1" style={{ gridTemplateColumns: MOBILE_VERTICAL_FRETBOARD_COLS }}>
        <div className="absolute right-full mr-1 text-xs font-semibold text-slate-600" style={{ width: MOBILE_VERTICAL_FRET_LABEL_COL }}>
          Traste
        </div>
        {MOBILE_VERTICAL_STRING_ORDER.map((sIdx) => {
          const parts = mobileStringHeaderParts(STRINGS[sIdx].label);
          return (
            <div key={sIdx} className="flex flex-col items-center justify-center text-center" title={STRINGS[sIdx].label}>
              <div className="text-xs font-medium leading-none text-slate-700">{parts.number}</div>
              <div className="mt-1 text-[10px] font-medium leading-none text-slate-500">{parts.openNote}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-2" style={fret0TopPadding > 0 ? { paddingTop: `${fret0TopPadding}px` } : undefined}>
        {visibleFrets.map((fret, fretIdx) => (
          <div
            key={fret}
            className="relative grid items-center gap-1"
            style={{
              gridTemplateColumns: mobileVerticalFretGridCols(),
              marginTop: mobileVerticalFretRowMarginTop(fret, visibleFrets[fretIdx - 1]),
            }}
          >
            <div
              className="absolute right-full mr-1 flex items-center justify-center"
              style={{ width: MOBILE_VERTICAL_FRET_LABEL_COL, height: "100%" }}
            >
              {fret === 0 ? null : <div className="text-[10px] text-slate-600">{fret}</div>}
              {mobileFretHasInlay(fret) ? (
                <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col items-center justify-center">
                  {Array.from({ length: INLAY_DOUBLE.has(fret) ? 2 : 1 }, (_, idx) => (
                    <div key={idx} className={`${idx ? "mt-0.5" : ""} h-2.5 w-2.5 rounded-full opacity-90`} style={{ backgroundColor: FRET_INLAY_BG }} />
                  ))}
                </div>
              ) : null}
            </div>
            {visibleFrets[fretIdx - 1] === 0 ? (
              <div
                className="pointer-events-none absolute inset-x-0 -top-0.5 -translate-y-1/2 rounded-full"
                style={{
                  zIndex: showOpenNutLine && fret === 1 ? 2 : -1,
                  height: MOBILE_CHORD_NUT_WIDTH,
                  backgroundColor: showOpenNutLine && fret === 1 ? MOBILE_CHORD_NUT_BG : "var(--panel-bg, #ffffff)",
                }}
                aria-hidden="true"
              />
            ) : null}
            {MOBILE_VERTICAL_STRING_ORDER.map((sIdx) => renderCell({ sIdx, fret, cellClassName: mobileVerticalFretCellClass(fret) }))}
            {mobileFretHasInlay(fret) ? (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[3] -translate-y-1/2">
                <div className="grid items-center gap-1" style={{ gridTemplateColumns: mobileVerticalFretGridCols() }}>
                  {mobileInlayGridColumns(fret).map((gridColumn) => (
                    <div key={`inlay-${fret}-${gridColumn}`} className="flex items-center justify-center" style={{ gridColumn }}>
                      <div className="h-3.5 w-3.5 rounded-full opacity-90" style={{ backgroundColor: FRET_INLAY_BG }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {/* Fila de pie: nota seleccionada por cuerda (opcional) */}
        {renderStringFooter && (
          <div className="relative mt-1 grid items-center gap-1" style={{ gridTemplateColumns: mobileVerticalFretGridCols() }}>
            {MOBILE_VERTICAL_STRING_ORDER.map((sIdx) => (
              <div key={sIdx} className="flex h-4 items-center justify-center">
                {renderStringFooter(sIdx)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
