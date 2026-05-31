export default function StandardRealSelectionBar({
  isOverlay = false,
  selection,
  selectionCount,
  onLoadSelection,
  onClearSelection,
  onToggleEvent,
  ui,
}) {
  const { UI_BTN_SM } = ui;
  const wrapperClass = isOverlay
    ? "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm";

  return (
    <div className={wrapperClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selección del chart real</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={UI_BTN_SM + " w-auto px-3"}
            onClick={onLoadSelection}
            disabled={!selection.length}
          >
            Cargar selección
          </button>
          <button
            type="button"
            className={UI_BTN_SM + " w-auto px-3"}
            onClick={onClearSelection}
            disabled={!selectionCount}
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selection.length ? selection.map((event, idx) => (
          <button
            key={event.id}
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-left shadow-sm transition-colors hover:bg-sky-100"
            onClick={() => onToggleEvent(event.id)}
            title="Quitar este cambio de la selección"
          >
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[11px] font-semibold text-white">
              {idx + 1}
            </span>
            <span className="text-sm font-semibold text-slate-800">{event.symbol}</span>
            <span className="text-xs text-slate-500">{event.section.label} · {event.measure.barLabel}</span>
          </button>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Aún no has seleccionado cambios del chart.
          </div>
        )}
      </div>
    </div>
  );
}
