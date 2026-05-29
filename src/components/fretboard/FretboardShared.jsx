import * as AppStaticData from "../../music/appStaticData.js";
import * as AppMusicBasics from "../../music/appMusicBasics.js";

const {
  INLAY_SINGLE,
  INLAY_DOUBLE,
  fretGridCols,
  mobileFretHasInlay,
} = AppStaticData;

const { FRET_INLAY_BG } = AppMusicBasics;

// ── HoverCellNote ─────────────────────────────────────────────────────────────

export function HoverCellNote({ sIdx, fret, visible, hoverCellNoteText }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[6] hidden items-center justify-center text-[10px] font-semibold text-slate-500 group-hover:flex">
      {hoverCellNoteText(sIdx, fret)}
    </div>
  );
}

// ── FretInlayRow ──────────────────────────────────────────────────────────────

export function FretInlayRow({ kind, maxFret }) {
  const isDouble = kind === "double";
  return (
    <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
      <div className="text-xs font-medium text-slate-700" />
      {Array.from({ length: maxFret + 1 }, (_, fret) => {
        const has = isDouble ? INLAY_DOUBLE.has(fret) : INLAY_SINGLE.has(fret);
        return (
          <div key={fret} className="relative flex h-4 items-center justify-center">
            {has ? <div className="h-4 w-4 rounded-full opacity-95" style={{ backgroundColor: FRET_INLAY_BG }} /> : null}
          </div>
        );
      })}
    </div>
  );
}

// ── WebFretNumberHeader ───────────────────────────────────────────────────────

export function WebFretNumberHeader({ fret }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="text-[10px] text-slate-600">{fret}</div>
      <div className="mt-0.5 flex h-2.5 items-center justify-center gap-0.5">
        {mobileFretHasInlay(fret)
          ? Array.from({ length: INLAY_DOUBLE.has(fret) ? 2 : 1 }, (_, idx) => (
              <div key={idx} className="h-2.5 w-2.5 rounded-full opacity-90" style={{ backgroundColor: FRET_INLAY_BG }} />
            ))
          : null}
      </div>
    </div>
  );
}
