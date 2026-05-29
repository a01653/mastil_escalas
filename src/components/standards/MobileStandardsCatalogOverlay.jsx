import { createPortal } from "react-dom";

export default function MobileStandardsCatalogOverlay({ open, onClose, filters, catalog, selection, ui }) {
  if (!open) return null;

  const { standardsFilters, setStandardsFilters, standardsFiltersActive, resetStandardsFilters } = filters;
  const { standardsCatalogError, retryStandardsCatalogLoad, standardsCatalogLoading } = catalog;
  const { filteredStandards, selectedStandard, selectStandardItem } = selection;
  const { UI_LABEL_SM, UI_INPUT_SM, UI_BTN_SM } = ui;

  const mobileCatalogResultsLabel = standardsCatalogError
    ? "No he podido cargar el catálogo"
    : standardsCatalogLoading
      ? "Cargando catálogo..."
      : `${filteredStandards.length} resultados visibles`;

  return createPortal(
    <div
      className="fixed inset-0 z-[125] bg-slate-900/45 p-3 xl:hidden"
      onClick={onClose}
    >
      <div className="mx-auto flex h-full max-w-[720px] items-start justify-center">
        <div
          className="mt-2 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#c7d8e5] px-4 py-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-800">Buscar standard</div>
              <div className="mt-1 text-xs font-semibold text-slate-600">
                {mobileCatalogResultsLabel}
              </div>
            </div>
            <button
              type="button"
              className={UI_BTN_SM + " w-auto px-3"}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>

          <div className="overflow-y-auto p-4">
            <div className="space-y-3">
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
              ) : (
                <div className="max-h-[58vh] overflow-y-auto rounded-2xl border border-slate-200 bg-[#fbfdff]">
                  {filteredStandards.map((item) => {
                    const selected = item.id === selectedStandard?.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`block w-full border-t border-slate-200 px-3 py-2 text-left text-sm font-semibold transition-colors first:border-t-0 ${selected ? "bg-sky-50 text-slate-900" : "bg-white text-slate-700 hover:bg-sky-50"}`}
                        onClick={() => selectStandardItem(item.id, { closeMobileCatalog: true })}
                      >
                        <span className="block leading-5">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
