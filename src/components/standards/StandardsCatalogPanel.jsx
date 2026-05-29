import PanelBlock from "../PanelBlock.jsx";

export default function StandardsCatalogPanel({ filters, catalog, selection, ui }) {
  const { standardsFilters, setStandardsFilters, standardsFiltersActive, resetStandardsFilters } = filters;
  const { standardsCatalogError, retryStandardsCatalogLoad, standardsCatalogLoading, collectionLabel } = catalog;
  const { filteredStandards, selectedStandard, selectStandardItem } = selection;
  const { UI_LABEL_SM, UI_INPUT_SM, UI_BTN_SM } = ui;

  return (
    <PanelBlock
      data-testid="standards-catalog-panel"
      level="subsection"
      title="Catálogo"
      description={collectionLabel}
      bodyClassName="space-y-3"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className={UI_LABEL_SM}>Filtros</label>
          {standardsFiltersActive ? (
            <button
              type="button"
              className="text-xs font-semibold text-sky-700 transition-colors hover:text-sky-900"
              onClick={resetStandardsFilters}
            >
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Título</span>
            <input
              className={UI_INPUT_SM + " w-full"}
              value={standardsFilters.title}
              onChange={(e) => setStandardsFilters((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="All of Me"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Compositor</span>
            <input
              className={UI_INPUT_SM + " w-full"}
              value={standardsFilters.composer}
              onChange={(e) => setStandardsFilters((prev) => ({ ...prev, composer: e.target.value }))}
              placeholder="Cole Porter"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Año</span>
            <input
              className={UI_INPUT_SM + " w-full"}
              value={standardsFilters.year}
              onChange={(e) => setStandardsFilters((prev) => ({ ...prev, year: e.target.value }))}
              placeholder="1934"
              inputMode="numeric"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Tono</span>
            <input
              className={UI_INPUT_SM + " w-full"}
              value={standardsFilters.key}
              onChange={(e) => setStandardsFilters((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="Bb, Gm, C..."
            />
          </label>
        </div>
      </div>

      {standardsCatalogError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
          <div>{standardsCatalogError}</div>
          <button
            type="button"
            className={UI_BTN_SM + " mt-3 w-auto px-3"}
            onClick={retryStandardsCatalogLoad}
          >
            Reintentar catálogo
          </button>
        </div>
      ) : standardsCatalogLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          Cargando catálogo de standards...
        </div>
      ) : !filteredStandards.length ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          No encuentro standards con ese filtro.
        </div>
      ) : null}

      {!standardsCatalogLoading && !standardsCatalogError && filteredStandards.length ? (
        <div data-testid="standards-list" className="max-h-[28rem] space-y-2 overflow-y-auto pr-1 xl:max-h-[70vh]">
          {filteredStandards.map((item) => {
            const selected = item.id === selectedStandard?.id;
            return (
              <button
                key={item.id}
                data-testid={`standard-item-${item.id}`}
                type="button"
                className={`w-full rounded-2xl border px-3 py-3 text-left shadow-sm transition-colors ${selected ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-sky-50"}`}
                onClick={() => selectStandardItem(item.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                  </div>
                  {item.year ? (
                    <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {item.year}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </PanelBlock>
  );
}
