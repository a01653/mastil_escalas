import { Search } from "lucide-react";
import { STANDARDS_INFO_TEXT } from "../../music/appStaticData.js";
import PanelBlock from "../PanelBlock.jsx";
import MobileStandardsCatalogOverlay from "./MobileStandardsCatalogOverlay.jsx";
import StandardsCatalogPanel from "./StandardsCatalogPanel.jsx";
import StandardDetailPanel from "./StandardDetailPanel.jsx";
import StandardChartPanel from "./StandardChartPanel.jsx";

export default function StandardsPanel({
  layout,
  notice,
  catalog,
  mobileCatalog,
  selection,
  chart,
  actions,
  ui,
}) {
  const { isMobileLayout } = layout;
  const { selectedStandard } = selection;
  const { standardsLoadingId, selectedStandardHasRealChart, standardsError } = chart;
  const { UI_BTN_SM, UI_LABEL_SM, UI_INPUT_SM, InfoTitle } = ui;
  const { setMobileStandardsCatalogOpen } = mobileCatalog;

  const noticeClass = notice?.type === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const mobileCatalogSummary = selectedStandard
    ? [selectedStandard.title, selectedStandard.year].filter(Boolean).join(" · ")
    : catalog.collectionLabel;

  const chartLoading = selectedStandard
    ? standardsLoadingId === selectedStandard.id && !selectedStandardHasRealChart
    : false;
  const chartError = standardsError && !selectedStandardHasRealChart ? standardsError : null;

  return (
    <>
    <PanelBlock
      title={<InfoTitle label="Standards de jazz" info={STANDARDS_INFO_TEXT} alwaysShow />}
      titleTooltip={!isMobileLayout ? STANDARDS_INFO_TEXT : ""}
      bodyClassName="space-y-3"
    >
      {notice ? (
        <div className={`rounded-2xl border px-3 py-2 text-sm ${noticeClass}`}>
          {notice.text}
        </div>
      ) : null}

      {isMobileLayout ? (
        <div className="space-y-3">
          <PanelBlock
            level="subsection"
            title="Catálogo"
            description={mobileCatalogSummary}
            headerAside={(
              <button
                type="button"
                className={UI_BTN_SM + " inline-flex w-auto items-center gap-1.5 px-3"}
                onClick={() => setMobileStandardsCatalogOpen(true)}
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            )}
          >
            <div className="text-sm text-slate-600">
              Usa el buscador para filtrar por título, compositor, año o tono y cargar un standard en esta vista.
            </div>
          </PanelBlock>

          {selectedStandard ? (
            <div className="space-y-3">
              <StandardDetailPanel standard={selectedStandard} />

              <StandardChartPanel
                loading={chartLoading}
                error={chartError}
                hasChart={selectedStandardHasRealChart}
                selection={selection}
                actions={actions}
                compact={isMobileLayout}
                btnClass={UI_BTN_SM}
              />
            </div>
          ) : (
            <PanelBlock
              level="subsection"
              title="Ficha"
              description="Selecciona un tema para abrir su forma completa."
            >
              <div className="text-sm text-slate-600">Aquí aparecerá la forma completa del standard seleccionado.</div>
            </PanelBlock>
          )}
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[290px_minmax(0,1fr)]">
          <StandardsCatalogPanel
            filters={{ standardsFilters: catalog.standardsFilters, setStandardsFilters: catalog.setStandardsFilters, standardsFiltersActive: catalog.standardsFiltersActive, resetStandardsFilters: catalog.resetStandardsFilters }}
            catalog={{ standardsCatalogError: catalog.standardsCatalogError, retryStandardsCatalogLoad: catalog.retryStandardsCatalogLoad, standardsCatalogLoading: catalog.standardsCatalogLoading, collectionLabel: catalog.collectionLabel }}
            selection={{ filteredStandards: catalog.filteredStandards, selectedStandard, selectStandardItem: catalog.selectStandardItem }}
            ui={{ UI_LABEL_SM, UI_INPUT_SM, UI_BTN_SM }}
          />

          {selectedStandard ? (
            <div className="space-y-3">
              <StandardDetailPanel standard={selectedStandard} />

              <StandardChartPanel
                loading={chartLoading}
                error={chartError}
                hasChart={selectedStandardHasRealChart}
                selection={selection}
                actions={actions}
                compact={isMobileLayout}
                btnClass={UI_BTN_SM}
              />
            </div>
          ) : (
            <PanelBlock
              level="subsection"
              title="Ficha"
              description="Selecciona un tema para abrir su forma completa."
            >
              <div className="text-sm text-slate-600">Aquí aparecerá la forma completa del standard seleccionado.</div>
            </PanelBlock>
          )}
        </div>
      )}
    </PanelBlock>

    <MobileStandardsCatalogOverlay
      open={mobileCatalog.mobileStandardsCatalogOpen}
      onClose={() => mobileCatalog.setMobileStandardsCatalogOpen(false)}
      filters={{ standardsFilters: catalog.standardsFilters, setStandardsFilters: catalog.setStandardsFilters, standardsFiltersActive: catalog.standardsFiltersActive, resetStandardsFilters: catalog.resetStandardsFilters }}
      catalog={{ standardsCatalogError: catalog.standardsCatalogError, retryStandardsCatalogLoad: catalog.retryStandardsCatalogLoad, standardsCatalogLoading: catalog.standardsCatalogLoading }}
      selection={{ filteredStandards: catalog.filteredStandards, selectedStandard: selection.selectedStandard, selectStandardItem: catalog.selectStandardItem }}
      ui={{ UI_LABEL_SM, UI_INPUT_SM, UI_BTN_SM }}
    />
    </>
  );
}
