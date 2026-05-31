import { getCompactStandardChordDisplay } from "../../music/appStaticData.js";

function buildMeasureRows(measures) {
  const rows = [];
  for (let idx = 0; idx < measures.length; idx += 4) {
    rows.push(measures.slice(idx, idx + 4));
  }
  return rows;
}

export default function StandardRealChartSections({
  isOverlay = false,
  hasChart,
  compact,
  sections,
  standardId,
  selectionIds,
  onToggleEvent,
}) {
  if (!hasChart) return null;

  const rowMinWidthClass = compact
    ? "min-w-0"
    : (isOverlay ? "min-w-[600px]" : "min-w-[560px]");
  const measureCellClass = compact
    ? "min-h-[72px] min-w-0 px-1.5 py-1.5"
    : (isOverlay ? "min-h-[68px] px-3 py-2" : "min-h-[60px] px-2.5 py-1.5");
  const emptyMeasureClass = compact
    ? "min-h-[72px]"
    : (isOverlay ? "min-h-[68px]" : "min-h-[60px]");
  const measureEventsClass = compact
    ? "mt-1 min-h-[46px] gap-1"
    : (isOverlay ? "mt-2 min-h-[36px] gap-1" : "mt-1.5 min-h-[32px] gap-1");
  const measureButtonClass = compact
    ? "px-1.5 py-1 text-[11px]"
    : (isOverlay ? "px-2.5 py-1.5 text-sm" : "px-2 py-1 text-[13px]");
  const repeatButtonClass = compact
    ? "h-7 min-w-[30px] px-1.5 text-xl"
    : (isOverlay ? "h-9 min-w-[44px] text-[26px]" : "h-8 min-w-[40px] text-2xl");

  const sid = standardId || "standard";

  return (
    <div className={`space-y-3 ${isOverlay ? "sm:space-y-4" : ""}`}>
      {sections.map((section, sectionIdx) => (
        <div key={`${sid}-${section.id}-${sectionIdx}`} className={`rounded-2xl border border-slate-300 bg-white shadow-sm ${isOverlay ? "p-4" : "p-3"}`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            <span className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {section.label}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {section.bars ? `Compases ${section.bars}` : `${section.measures.length} compases`}
            </span>
          </div>

          <div className={`mt-3 space-y-2 ${compact ? "" : "overflow-x-auto"}`}>
            {buildMeasureRows(section.measures).map((row, rowIdx) => (
              <div key={`${section.id}-row-${rowIdx}`} className={`grid ${rowMinWidthClass} grid-cols-4 overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfdff]`}>
                {Array.from({ length: 4 }, (_, colIdx) => {
                  const measure = row[colIdx] || null;
                  const measureIdx = rowIdx * 4 + colIdx;
                  if (!measure) {
                    return <div key={`${section.id}-row-${rowIdx}-empty-${colIdx}`} className={`${emptyMeasureClass} border-l border-slate-200 bg-slate-50/60 first:border-l-0`} />;
                  }
                  const chordEvents = Array.isArray(measure.chordEvents)
                    ? measure.chordEvents
                    : measure.chords.map((symbol) => ({ display: symbol, load: symbol }));
                  const displayChordEvents = chordEvents.map((event, eventIdx) => ({
                    ...event,
                    compactDisplay: getCompactStandardChordDisplay(event, chordEvents[eventIdx - 1] || null),
                  }));
                  return (
                    <div
                      key={`${sid}-${section.id}-${sectionIdx}-${measure.barLabel}-${measureIdx}`}
                      className={`${measureCellClass} border-l border-slate-200 first:border-l-0`}
                    >
                      <div className={`${compact ? "text-[9px]" : "text-[10px]"} font-semibold uppercase tracking-wide text-slate-400`}>
                        {measure.barLabel.replace("Compás ", "")}
                      </div>
                      <div className={`${measureEventsClass} flex flex-wrap items-start`}>
                        {measure.repeat && chordEvents.length === 1 ? (() => {
                          const eventId = `${sid}-${section.id}-${sectionIdx}-${measureIdx}-0`;
                          const selectedOrder = selectionIds.indexOf(eventId);
                          const selected = selectedOrder >= 0;
                          return (
                            <button
                              type="button"
                              className={`inline-flex ${repeatButtonClass} items-center justify-center rounded-xl border font-semibold leading-none transition-colors ${selected ? "border-sky-300 bg-sky-100 text-slate-900" : "border-slate-200 bg-white text-slate-400 hover:bg-sky-50"}`}
                              onClick={() => onToggleEvent(eventId)}
                              title={`${selected ? "Quitar" : "Añadir"} ${chordEvents[0].display}`}
                            >
                              %
                            </button>
                          );
                        })() : displayChordEvents.map((event, eventIdx) => {
                          const eventId = `${sid}-${section.id}-${sectionIdx}-${measureIdx}-${eventIdx}`;
                          const selectedOrder = selectionIds.indexOf(eventId);
                          const selected = selectedOrder >= 0;
                          return (
                            <button
                              key={`${eventId}-${event.display}`}
                              type="button"
                              className={`inline-flex max-w-full items-center gap-1 rounded-xl border ${measureButtonClass} font-semibold shadow-sm transition-colors ${selected ? "border-sky-300 bg-sky-100 text-slate-900" : "border-slate-200 bg-white text-slate-800 hover:bg-sky-50"}`}
                              onClick={() => onToggleEvent(eventId)}
                              title={`${selected ? "Quitar de la selección" : "Añadir a la selección"}: ${event.display}`}
                            >
                              <span className="break-all leading-tight">{event.compactDisplay}</span>
                              {selected ? (
                                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold text-white">
                                  {selectedOrder + 1}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
