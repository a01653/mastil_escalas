import PanelBlock from "../PanelBlock.jsx";
import StandardRealSelectionBar from "./StandardRealSelectionBar.jsx";
import StandardRealChartSections from "./StandardRealChartSections.jsx";

export default function StandardChartPanel({
  loading,
  error,
  hasChart,
  selection,
  actions,
  compact,
  btnClass,
}) {
  return (
    <PanelBlock
      data-testid="standards-chart-panel"
      level="subsection"
      title="Forma"
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          Cargando standard...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm leading-6 text-rose-700">
          {error}
        </div>
      ) : hasChart ? (
        <div className="space-y-3">
          <StandardRealSelectionBar
            selection={selection.selectedStandardRealSelection}
            selectionCount={selection.standardsRealSelectionIds.length}
            onLoadSelection={actions.applySelectedStandardRealEventsToNearChords}
            onClearSelection={actions.clearRealSelection}
            onToggleEvent={actions.toggleStandardRealEventSelection}
            ui={{ UI_BTN_SM: btnClass }}
          />
          <StandardRealChartSections
            hasChart={hasChart}
            compact={compact}
            sections={selection.selectedStandardRealSections}
            standardId={selection.selectedStandard?.id}
            selectionIds={selection.standardsRealSelectionIds}
            onToggleEvent={actions.toggleStandardRealEventSelection}
          />
        </div>
      ) : null}
    </PanelBlock>
  );
}
