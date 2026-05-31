import { useEffect, useMemo, useState } from "react";
import { getCompactStandardChordDisplay } from "../../music/appStaticData.js";
import { loadJJazzLabCatalogIndex, loadJJazzLabStandardFromPath } from "../../music/jjazzlabCatalog.js";
import { getStandardRealChartSections } from "../../music/standardsCatalog.js";

export function useStandardsFeature({
  standardsPanelActive,
  isMobileLayout,
  onApplyToNearChords,
}) {
  // ── Estado ────────────────────────────────────────────────────────────
  const [mobileStandardsCatalogOpen, setMobileStandardsCatalogOpen] = useState(false);
  const [standardsFilters, setStandardsFilters] = useState(() => ({
    title: "",
    composer: "",
    year: "",
    key: "",
  }));
  const [selectedStandardId, setSelectedStandardId] = useState(null);
  const [standardsRealSelectionIds, setStandardsRealSelectionIds] = useState([]);
  const [standardsLoadedMap, setStandardsLoadedMap] = useState({});
  const [standardsLoadingId, setStandardsLoadingId] = useState(null);
  const [standardsError, setStandardsError] = useState(null);
  const [standardsNotice, setStandardsNotice] = useState(null);
  const [standardsCatalogState, setStandardsCatalogState] = useState(() => ({
    status: "idle",
    items: [],
    collectionLabel: "",
    error: null,
  }));

  // ── Derivados del catálogo ────────────────────────────────────────────
  const shouldLoadStandardsCatalog = standardsPanelActive || mobileStandardsCatalogOpen;
  const standardsCatalogStatus = standardsCatalogState.status;
  const standardsCatalogLoading = standardsCatalogStatus === "idle" || standardsCatalogStatus === "loading";
  const standardsCatalogError = standardsCatalogState.error;
  const standardsItems = standardsCatalogState.items;
  const standardsCollectionLabel = standardsCatalogState.collectionLabel;
  const standardsCatalogSummary = standardsCollectionLabel
    || (standardsItems.length
      ? `${standardsItems.length} standards en la base de datos`
      : standardsCatalogError
        ? "No he podido cargar el catálogo."
        : "Cargando catálogo...");

  // ── Derivados de filtros ──────────────────────────────────────────────
  const standardsTitleQuery = standardsFilters.title.trim().toLowerCase();
  const standardsComposerQuery = standardsFilters.composer.trim().toLowerCase();
  const standardsYearQuery = standardsFilters.year.trim().toLowerCase();
  const standardsKeyQuery = standardsFilters.key.trim().toLowerCase();
  const standardsFiltersActive = !!(
    standardsTitleQuery
    || standardsComposerQuery
    || standardsYearQuery
    || standardsKeyQuery
  );

  // ── Efecto: carga catálogo ────────────────────────────────────────────
  useEffect(() => {
    if (!shouldLoadStandardsCatalog || standardsCatalogStatus !== "idle") return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandardsCatalogState((prev) => ({ ...prev, status: "loading", error: null }));

    loadJJazzLabCatalogIndex()
      .then(({ collectionLabel, items }) => {
        setStandardsCatalogState({
          status: "ready",
          items,
          collectionLabel,
          error: null,
        });
      })
      .catch((error) => {
        setStandardsCatalogState({
          status: "error",
          items: [],
          collectionLabel: "",
          error: error instanceof Error ? error.message : "No he podido cargar el catálogo de standards.",
        });
      });
  }, [shouldLoadStandardsCatalog, standardsCatalogStatus]);

  // ── useMemo: filteredStandards ────────────────────────────────────────
  const filteredStandards = useMemo(() => {
    if (!standardsFiltersActive) return standardsItems;
    return standardsItems.filter((item) => {
      const title = String(item?.title || "").toLowerCase();
      const defaultKey = String(item?.defaultKey || "").toLowerCase();
      const year = item?.year != null ? String(item.year).toLowerCase() : "";
      const composers = Array.isArray(item?.composers)
        ? item.composers.join(" ").toLowerCase()
        : "";

      if (standardsTitleQuery && !title.includes(standardsTitleQuery)) return false;
      if (standardsComposerQuery && !composers.includes(standardsComposerQuery)) return false;
      if (standardsYearQuery && !year.includes(standardsYearQuery)) return false;
      if (standardsKeyQuery && !defaultKey.includes(standardsKeyQuery)) return false;
      return true;
    });
  }, [
    standardsComposerQuery,
    standardsFiltersActive,
    standardsItems,
    standardsKeyQuery,
    standardsTitleQuery,
    standardsYearQuery,
  ]);

  // ── Efecto: auto-selección inicial ───────────────────────────────────
  useEffect(() => {
    if (!standardsItems.length) return;
    if (standardsItems.some((item) => item?.id === selectedStandardId)) return;
    const preferred = standardsItems.find((item) => item.id === "all-of-me") || standardsItems[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (preferred) setSelectedStandardId(preferred.id);
  }, [selectedStandardId, standardsItems]);

  // ── useMemo: standard seleccionado ───────────────────────────────────
  const selectedCatalogStandard = useMemo(() => {
    if (standardsFiltersActive && !filteredStandards.length) return null;
    const activeItems = filteredStandards.length ? filteredStandards : standardsItems;
    return activeItems.find((item) => item?.id === selectedStandardId) || activeItems[0] || null;
  }, [filteredStandards, standardsFiltersActive, standardsItems, selectedStandardId]);

  const selectedLoadedStandard = selectedCatalogStandard
    ? standardsLoadedMap[selectedCatalogStandard.id] || null
    : null;
  const selectedStandard = selectedLoadedStandard || selectedCatalogStandard || null;

  // ── Efecto: carga JJazzLab individual ────────────────────────────────
  useEffect(() => {
    const item = selectedCatalogStandard;
    if (!item?.hasJJazzLabSource || !item?.sourcePath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStandardsLoadingId(null);
      setStandardsError(null);
      return undefined;
    }
    if (standardsLoadedMap[item.id]) {
      setStandardsLoadingId(null);
      setStandardsError(null);
      return undefined;
    }

    let cancelled = false;
    setStandardsLoadingId(item.id);
    setStandardsError(null);

    loadJJazzLabStandardFromPath(item.sourcePath)
      .then((detail) => {
        if (cancelled) return;
        setStandardsLoadedMap((prev) => ({ ...prev, [item.id]: detail }));
        setStandardsLoadingId((current) => (current === item.id ? null : current));
      })
      .catch((error) => {
        if (cancelled) return;
        setStandardsError(`No pude leer ${item.title} desde JJazzLab: ${String(error?.message || error)}`);
        setStandardsLoadingId((current) => (current === item.id ? null : current));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCatalogStandard, standardsLoadedMap]);

  // ── useMemo: secciones y eventos del chart real ───────────────────────
  const selectedStandardRealSections = useMemo(
    () => getStandardRealChartSections(selectedStandard),
    [selectedStandard]
  );
  const selectedStandardHasRealChart = selectedStandardRealSections.length > 0;

  const selectedStandardRealEvents = useMemo(
    () => selectedStandardRealSections.flatMap((section, sectionIdx) => (
      section.measures.flatMap((measure, measureIdx) => {
        const chordEvents = Array.isArray(measure.chordEvents)
          ? measure.chordEvents
          : measure.chords.map((symbol) => ({ display: symbol, load: symbol }));
        return chordEvents.map((event, symbolIdx) => ({
          id: `${selectedStandard?.id || "standard"}-${section.id}-${sectionIdx}-${measureIdx}-${symbolIdx}`,
          section,
          sectionIdx,
          measure,
          measureIdx,
          symbol: getCompactStandardChordDisplay(event, chordEvents[symbolIdx - 1] || null),
          fullSymbol: event.display,
          loadSymbol: event.load,
          symbolIdx,
        }));
      })
    )),
    [selectedStandard, selectedStandardRealSections]
  );

  const selectedStandardRealEventMap = useMemo(
    () => new Map(selectedStandardRealEvents.map((event) => [event.id, event])),
    [selectedStandardRealEvents]
  );

  const selectedStandardRealSelection = useMemo(
    () => standardsRealSelectionIds.map((id) => selectedStandardRealEventMap.get(id)).filter(Boolean),
    [standardsRealSelectionIds, selectedStandardRealEventMap]
  );

  // ── Efecto: limpieza de selección obsoleta ────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandardsRealSelectionIds((prev) => prev.filter((id) => selectedStandardRealEventMap.has(id)));
  }, [selectedStandardRealEventMap]);

  // ── Efecto: auto-descarte de notice de éxito ─────────────────────────
  useEffect(() => {
    if (standardsNotice?.type !== "success") return undefined;
    const timeoutId = window.setTimeout(() => {
      setStandardsNotice((current) => (current?.type === "success" ? null : current));
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [standardsNotice]);

  // ── Efecto: cerrar overlay móvil al salir de mobile layout ───────────
  useEffect(() => {
    if (isMobileLayout) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileStandardsCatalogOpen(false);
  }, [isMobileLayout]);

  // ── Acciones ─────────────────────────────────────────────────────────
  function selectStandardItem(standardId, { closeMobileCatalog = false } = {}) {
    if (!standardId) return;
    setSelectedStandardId(standardId);
    setStandardsRealSelectionIds([]);
    setStandardsNotice(null);
    if (closeMobileCatalog) setMobileStandardsCatalogOpen(false);
  }

  function resetStandardsFilters() {
    setStandardsFilters({
      title: "",
      composer: "",
      year: "",
      key: "",
    });
  }

  function retryStandardsCatalogLoad() {
    setStandardsCatalogState((prev) => ({
      ...prev,
      status: "idle",
      error: null,
    }));
  }

  function toggleStandardRealEventSelection(eventId) {
    if (!eventId) return;
    if (standardsRealSelectionIds.includes(eventId)) {
      setStandardsRealSelectionIds((prev) => prev.filter((id) => id !== eventId));
      return;
    }
    if (standardsRealSelectionIds.length >= 4) {
      setStandardsNotice({
        type: "error",
        text: "El chart real permite seleccionar hasta 4 cambios a la vez para enviarlos a Acordes cercanos.",
      });
      return;
    }
    setStandardsRealSelectionIds((prev) => [...prev, eventId]);
  }

  function applySelectedStandardRealEventsToNearChords() {
    if (!selectedStandard || !selectedStandardRealSelection.length) {
      setStandardsNotice({ type: "error", text: "Selecciona al menos un cambio del chart real antes de cargarlo." });
      return;
    }
    const notice = onApplyToNearChords(
      selectedStandard,
      "selección del chart real",
      selectedStandardRealSelection.map((event) => event.loadSymbol || event.symbol)
    );
    if (notice) setStandardsNotice(notice);
  }

  function clearRealSelection() {
    setStandardsRealSelectionIds([]);
  }

  // ── Retorno ───────────────────────────────────────────────────────────
  return {
    notice: standardsNotice,

    catalog: {
      standardsCatalogLoading,
      standardsCatalogError,
      collectionLabel: standardsCatalogSummary,
      filteredStandards,
      standardsFiltersActive,
      standardsFilters,
      setStandardsFilters,
      resetStandardsFilters,
      retryStandardsCatalogLoad,
      selectStandardItem,
    },

    mobileCatalog: {
      mobileStandardsCatalogOpen,
      setMobileStandardsCatalogOpen,
    },

    selection: {
      selectedStandard,
      selectedStandardRealSections,
      selectedStandardRealEventMap,
      selectedStandardRealSelection,
      standardsRealSelectionIds,
    },

    chart: {
      standardsLoadingId,
      standardsError,
      selectedStandardHasRealChart,
    },

    actions: {
      clearRealSelection,
      toggleStandardRealEventSelection,
      applySelectedStandardRealEventsToNearChords,
    },
  };
}
