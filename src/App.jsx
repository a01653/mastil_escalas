import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Blocks, BookOpen, ChevronLeft, ChevronRight, Eraser, HelpCircle, Info, Menu, Music, Play, Route, Search, Settings, Volume2, VolumeX, Waypoints, X } from "lucide-react";
import {
  buildDetectedCandidateBadgeItems as buildDetectedCandidateBadgeItemsPure,
  detectChordReadings as detectChordReadingsPure,
  formatChordName as formatChordNamePure,
  resolveDetectedCandidateFromContext as resolveDetectedCandidateFromContextPure,
} from "./music/chordDetectionEngine.js";
import { chordDbKeyNameFromPc } from "./music/chordDbCatalog.js";
import { describeRelativeTertianChord } from "./music/studyRelativeChord.js";
import { buildNearSlotsFromChordSymbols, getStandardRealChartSections } from "./music/standardsCatalog.js";
import { loadJJazzLabCatalogIndex, loadJJazzLabStandardFromPath } from "./music/jjazzlabCatalog.js";

import * as AppStaticData from "./music/appStaticData.js";
const {
  NOTES_SHARP,
  NOTES_FLAT,
  MOBILE_LAYOUT_WIDTH_MEDIA_QUERY,
  MOBILE_LAYOUT_TOUCH_MEDIA_QUERY,
  MOBILE_SECTION_OPTIONS,
  SCALE_INFO_TEXT,
  PATTERNS_INFO_TEXT,
  NEAR_CHORDS_INFO_TEXT,
  NEAR_AUTO_SCALE_INFO_TEXT,
  STANDARDS_INFO_TEXT,
  CHORDS_SECTION_INFO_TEXT,
  CHORD_EDITOR_INFO_TEXT,
  CHORD_STUDY_INFO_TEXT,
  CHORD_FRETBOARD_INFO_TEXT,
  DETECTED_CHORDS_INFO_TEXT,
  MOBILE_SECTION_SWIPE_COMMIT_RATIO,
  PRIMARY_BOARD_SECTIONS,
  TONAL_CONTEXT_TOOLTIP,
  MOBILE_VERTICAL_STRING_ORDER,
  WEB_FRET_LABEL_COL_PX,
  WEB_FRET_ZERO_WIDTH_PX,
  WEB_FRET_CELL_MIN_WIDTH_PX,
  WEB_FRET_CELL_MAX_WIDTH_PX,
  WEB_FRET_CELL_HEIGHT_PX,
  WEB_FRETBOARD_GRID_GAP_PX,
  PANEL_BODY_PADDING_X_PX,
  APP_WRAP_PADDING_X_PX,
  WEB_FRET_LABEL_COL,
  WEB_FRET_ZERO_WIDTH,
  WEB_FRET_CELL_WIDTH,
  WEB_FRET_CELL_HEIGHT,
  MOBILE_VERTICAL_STRING_COL_WIDTH,
  MOBILE_VERTICAL_FRET_LABEL_COL,
  MOBILE_VERTICAL_FRETBOARD_COLS,
  MOBILE_CHORD_FRET_LABEL_COL,
  MOBILE_CHORD_FRET_ZERO_WIDTH,
  MOBILE_CHORD_FRET_ZERO_HEIGHT,
  MOBILE_CHORD_FRET_CELL_WIDTH,
  MOBILE_CHORD_NUT_WIDTH,
  MOBILE_CHORD_NUT_BG,
  MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE,
  normalizeBoardVisibility,
  SCALE_PRESETS,
  MANUAL_SCALE_TETRAD_PRESETS,
  UI_SECTION_PANEL,
  STRINGS,
  INLAY_SINGLE,
  INLAY_DOUBLE,
  fretGridCols,
  fretsForCompactVoicing,
  getCompactStandardChordDisplay,
  normalizeVisibleFrets,
  fretCellStyleForLayout,
  fretNoteSizeClass,
  webAppWidthPx,
  mobileVerticalFretGridCols,
  mobileVerticalFretCellClass,
  mobileVerticalFretRowMarginTop,
  mobileVerticalFretBorderClass,
  mobileVerticalOpenNoteClass,
  mobileStringHeaderParts,
  mobileFretHasInlay,
  mobileInlayGridColumns,
  hasInlayCell,
  KING_BOX_DEFAULTS,
  buildKingBoxOverlayMap,
  LETTERS,
  NATURAL_PC,
  NATURAL_PCS,
} = AppStaticData;

import * as AppMusicBasics from "./music/appMusicBasics.js";
const {
  mod12,
  pcToName,
  pcToDualName,
  chordUiLetterFromPc,
  pitchAt,
  intervalToDegreeToken,
  intervalToSimpleChordDegreeToken,
  chordSuffixFromUI,
  chordDisplayNameFromUI,
  chordDisplaySuffixOnly,
  buildHarmonyDegreeChord,
  buildManualScaleHarmonySpecs,
  buildScaleTetradHarmonization,
  analyzeChordSetTonality,
  spellNoteFromChordInterval,
  buildDetectedCandidateNoteNameForPc,
  buildDetectedCandidateLabelForPc,
  buildDetectedCandidateBackgroundLabelForPc,
  buildDetectedCandidateRoleForPc,
  buildManualSelectionVoicing,
  clampChordMaxDistForReach,
  generateDropTetradVoicings,
  CHORD_QUALITIES,
  CHORD_STRUCTURES,
  CHORD_FAMILIES,
  CHORD_QUARTAL_TYPES,
  CHORD_QUARTAL_VOICES,
  CHORD_QUARTAL_SPREADS,
  CHORD_QUARTAL_REFERENCES,
  CHORD_QUARTAL_SCALE_NAMES,
  CHORD_GUIDE_TONE_QUALITIES,
  CHORD_GUIDE_TONE_FORMS,
  CHORD_GUIDE_TONE_INVERSIONS,
  guideToneDefinitionFromQuality,
  guideToneBassIntervalsForSelection,
  voicingHasOpenStrings,
  fnBuildQuartalDegreeLabel,
  fnBuildQuartalPitchSets,
  fnGenerateQuartalVoicings,
  CHORD_INVERSIONS,
  CHORD_FORMS,
  buildChordIntervals,
  seventhOffsetForQuality,
  chordBassInterval,
  intervalToChordToken,
  buildChordDegreeLabelsFromUi,
  spellScaleNotes,
  spellChordNotes,
  parseTokensToIntervals,
  normalizeScaleName,
  buildScaleIntervalLabels,
  scaleOptionLabel,
  buildScaleIntervals,
  pickThirdOffsets,
  rgba,
  FRET_CELL_BG,
  FRET_INLAY_BG,
  isDark,
  parsePosCode,
  sanitizePosCodeInput,
  buildMembershipMap,
  preferSharpsFromMajorTonicPc,
  computeAutoPreferSharps,
  resolveKeySignatureForScale,
} = AppMusicBasics;

import * as AppVoicingStudyCore from "./music/appVoicingStudyCore.js";
const {
  parseChordDbFretsString,
  buildVoicingFromFretsLH,
  isErgonomicVoicing,
  generateTriadVoicings,
  generateTetradVoicings,
  augmentVoicingsWithChordToneDuplicatesInWindow,
  augmentExactVoicingsWithOpenSubstitutions,
  generateExactIntervalChordVoicings,
  isDropForm,
  filterVoicingsByForm,
  positionFormFromEffectiveForm,
  normalizeChordFormToInversion,
  concreteInversionsForSelection,
  positionFormLabel,
  buildChordHeaderSummary,
  bassIntervalsForSelection,
  dedupeAndSortVoicings,
  buildOpenSupersetTetradVoicings,
  symmetricRootCandidatesForPlan,
  normalizeGeneratedVoicingForDisplay,
  isStrictFourNoteDropEligible,
  isSingleAddChordSelection,
  isMultiAddChordSelection,
  hasEffectiveSeventh,
  chordThirdOffsetFromUI,
  chordFifthOffsetFromUI,
  buildChordUiRestrictions,
  buildChordEnginePlan,
  chordEngineLayerLabel,
  chordEngineGeneratorLabel,
  studyVoicingFormLabel,
  explainStudyRules,
  buildChordNamingExplanation,
  actualInversionLabelFromVoicing,
  deriveDetectedCandidateCopyInversion,
  analyzeVoicingVsPlan,
  analyzeScaleTensionsForChord,
  buildDominantInfo,
  buildBackdoorDominantInfo,
  buildStudyAnchorId,
  buildStudySubstitutionGuide,
} = AppVoicingStudyCore;

import * as AppPatternRouteStaffCore from "./music/appPatternRouteStaffCore.jsx";
const {
  build3NpsPatternsMerged,
  build3NpsPatternInstances,
  buildInstanceMembershipMap,
  buildCagedPatternInstances,
  pickCagedViewPatterns,
  buildPentatonicBoxInstances,
  mergeInstancesToPatterns,
  cleanUiText,
  inferControlTitle,
  sanitizeBoolValue,
  sanitizeNumberValue,
  sanitizeOneOf,
  sanitizeColorValue,
  mixHexColors,
  unwrapPersistedPayload,
  sanitizeNearSlotValue,
  sanitizePresetCollection,
  ROUTE_LAB_DEFAULT_TUNING,
  computeRouteLab,
  computeMusicalRoute,
  escapeHtml,
  buildStudyOuterBlockHtml,
  buildMusicStaffSvgMarkup,
  buildStudyBadgeItemsFromPlan,
  buildPdfChordBadgeStripHtml,
  buildPdfCompactVoicingFretboardHtml,
  formatChordBadgeDegree,
  chordBadgeRoleFromDegreeLabel,
  chordFormulaBadgeRoleFromDegreeLabel,
  buildChordBadgeItems,
  ChordNoteBadgeStrip,
  MusicStaff,
} = AppPatternRouteStaffCore;


// Mástil interactivo
// - Escalas: pentatónicas (mayor/menor), mayor/menor natural, modos
// - Resaltado: raíz, 3ª, 5ª + extras
// - Vista: notas / intervalos
// - Patrones "reales":
//   * Pentatónicas: 5 boxes
//   * Escalas de 7 notas: 3NPS (7 patrones)
// - Ruta "musical": recorre la escala en orden (asc/desc por altura) y se restringe a patrones.
// - Notación: auto #/b según armadura (con override manual)

// ============================================================================
// ÍNDICE RÁPIDO DEL FICHERO
// 1. Catálogos y presets musicales
// 2. Mástil, afinación e inlays
// 3. Utilidades de notación y teoría básica
// 4. Motor de acordes y nomenclatura
// 5. Detección de acordes desde notas seleccionadas
// 6. Patrones, CAGED y cajas pentatónicas
// 7. Ruta musical
// 8. Componente principal
//    8.1 Estado general
//    8.2 Acorde principal
//    8.3 Acordes cercanos
//    8.4 Ruta musical
//    8.5 Persistencia y presets
//    8.6 Cálculos derivados
//    8.7 Componentes UI internos
//    8.8 Render
// ============================================================================


const MOBILE_BOTTOM_NAV_OPTIONS = [
  { value: "scale", label: "Escala", icon: Music },
  { value: "patterns", label: "Patrones", icon: Blocks },
  { value: "route", label: "Ruta", icon: Route },
  { value: "chords", label: "Acordes", icon: ChordDiagramIcon },
  { value: "nearChords", label: "Cercanos", icon: Waypoints },
  { value: "standards", label: "Standards", icon: BookOpen },
];

function ChordDiagramIcon({ className = "", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true" {...props}>
      <path d="M4.5 4h15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      {[5, 8.5, 12, 15.5, 19].map((x) => (
        <path key={x} d={`M${x} 4.9v15.1`} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      ))}
      {[8, 12, 16].map((y) => (
        <path key={y} d={`M5  ${y}h14`} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      ))}
      <circle cx="16.5" cy="7.2" r="1.75" fill="#145bf0" />
      <circle cx="12" cy="11.2" r="1.75" fill="#145bf0" />
      <circle cx="8.5" cy="15.2" r="1.75" fill="#145bf0" />
    </svg>
  );
}


const PanelBlock = React.forwardRef(function PanelBlock({
  as = "section",
  level = "section",
  title,
  description = null,
  titleTooltip = "",
  headerAside = null,
  disabledHeader = false,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  children,
  ...rest
}, ref) {
  const Tag = as;
  const headerStyle = {
    backgroundColor: disabledHeader
      ? "#f0f0f0"
      : level === "subsection"
        ? "var(--subsection-header-bg, #ebf2fa)"
      : "var(--section-header-bg, #c7d8e5)",
  };
  const headerSizeClass = level === "section" ? "min-h-[48px] items-center" : "min-h-[42px] items-center";

  return (
    <Tag ref={ref} className={`${UI_SECTION_PANEL} ${className}`.trim()} {...rest}>
      <div
        className={`flex flex-wrap ${headerSizeClass} justify-between gap-2 border-b border-slate-200 px-3 py-2 ${headerClassName}`.trim()}
        style={headerStyle}
      >
        <div className="min-w-0 flex-1">
          {title ? <div className={`${level === "section" ? "text-base" : "text-sm"} font-semibold text-slate-800`} title={titleTooltip || undefined}>{title}</div> : null}
          {description ? <div className="mt-0.5 text-xs text-slate-600">{description}</div> : null}
        </div>
        {headerAside ? <div className="min-w-0 shrink-0">{headerAside}</div> : null}
      </div>
      <div className={`bg-white p-3 ${bodyClassName}`.trim()}>{children}</div>
    </Tag>
  );
});

// ============================================================================
// MÁSTIL, AFINACIÓN E INLAYS

// Base del sitio (Vite) para que fetch a /public funcione en localhost y GitHub Pages.
// En producción (Pages) suele ser "/mastil_pruebas/" y en dev "/".
// OJO: nunca accedas a import.meta.env.BASE_URL sin optional chaining.
// En Vite existe import.meta.env.BASE_URL ("/" en dev, "/<repo>/" en GitHub Pages).
// Evitamos sintaxis TS "as any" porque puede romper el parser en algunos entornos.
const APP_BASE = (import.meta && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : "/";
// Fallback (cuando se ejecuta fuera del repo, p.ej. sandbox): GitHub Pages del proyecto
const PAGES_BASE = "https://a01653.github.io/mastil_pruebas/";
const UI_STORAGE_KEY = "mastil_interactivo_guitarra_config_v1";
const UI_PRESETS_STORAGE_KEY = "mastil_interactivo_guitarra_presets_v1";
const UI_STATUS_SESSION_KEY = "mastil_interactivo_guitarra_status_v1";
const QUICK_PRESET_COUNT = 3;
const UI_CONFIG_VERSION = 1;
const APP_VERSION = "4.14";

function chordDbUrl(keyName, suffix) {
  // Ruta RELATIVA dentro de /public (sin base) => chords-db/...
  const folder = encodeURIComponent(keyName); // A# => A%23
  const file = encodeURIComponent(`${suffix}.json`);
  return `chords-db/${folder}/${file}`;
}

function chordDbUrlLocal(keyName, suffix) {
  // Ruta para fetch respetando base (Pages)
  const base = String(APP_BASE || "/");
  const b = base.endsWith("/") ? base : base + "/";
  return `${b}${chordDbUrl(keyName, suffix)}`;
}

function publicRelToLocal(rel) {
  const base = String(APP_BASE || "/");
  const b = base.endsWith("/") ? base : base + "/";
  const r = String(rel || "").replace(/^\/+/, "");
  return `${b}${r}`;
}


export default function FretboardScalesPage() {
  // --------------------------------------------------------------------------
  // REFS Y ESTADO GENERAL DE LA APP
  // --------------------------------------------------------------------------

  const appRootRef = useRef(null);
  const tonalContextRef = useRef(null);
  const importConfigInputRef = useRef(null);
  const chordDetectAudioCtxRef = useRef(null);
  const mobileSectionPointerRef = useRef(null);
  const mobileSectionSlideRef = useRef(null);
  const mobileSectionSuppressClickRef = useRef(false);
  const mobileChordSummaryMeasureRef = useRef(null);
  const [mobileChordSummaryUseCompact, setMobileChordSummaryUseCompact] = useState(false);

  const [storageHydrated, setStorageHydrated] = useState(false);
  const [configNotice, setConfigNotice] = useState(null);
  const [quickPresets, setQuickPresets] = useState(() => Array.from({ length: QUICK_PRESET_COUNT }, () => null));
  const [selectedQuickPresetSlot, setSelectedQuickPresetSlot] = useState("0");
  const [manualOpen, setManualOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyTarget, setStudyTarget] = useState("main");
  const [mobileInfoPopover, setMobileInfoPopover] = useState(null);
  const mobileInfoPopoverOpen = !!mobileInfoPopover;

  // Notación (auto / override)
  // --------------------------------------------------------------------------
  // ESTADO: ESCALAS, VISTA Y MÁSTILES
  // --------------------------------------------------------------------------

  const [accMode, setAccMode] = useState("auto"); // auto | sharps | flats
  // Vista (pueden coexistir)
  const [showIntervalsLabel, setShowIntervalsLabel] = useState(true);
  const [showNotesLabel, setShowNotesLabel] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const [rootPc, setRootPc] = useState(5); // F
  const [scaleRootLetter, setScaleRootLetter] = useState("F");
  const [scaleRootAcc, setScaleRootAcc] = useState(null); // null | "flat" | "sharp"
  const [scaleName, setScaleName] = useState("Mayor");
  const [harmonyMode, setHarmonyMode] = useState("diatonic");
  const isNamedPentatonicScale = scaleName === "Pentatónica mayor" || scaleName === "Pentatónica menor";
  const isBluesScale = scaleName === "Pentatónica menor + blue note" || scaleName === "Pentatónica mayor + blue note";
  const isKingBoxEligibleScale = isNamedPentatonicScale || isBluesScale;
  const [maxFret, setMaxFret] = useState(15);

  const [showNonScale, setShowNonScale] = useState(false);

  const [customInput, setCustomInput] = useState("1 b3 5 6");

  // Extras (default OFF)
  const [extraInput, setExtraInput] = useState("b2");
  const [showExtra, setShowExtra] = useState(false);

  // Qué mástiles mostrar
  const [showBoards, setShowBoards] = useState(() => normalizeBoardVisibility({ chords: true, configuration: false }, "chords"));
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState("chords");
  const [mobileSectionTransition, setMobileSectionTransition] = useState(null);
  const [mobileSectionMotion, setMobileSectionMotion] = useState("none");
  const [mobileTonalContextOpen, setMobileTonalContextOpen] = useState(false);
  const [mobileChordEditorOpen, setMobileChordEditorOpen] = useState(false);
  const [mobileNearChordEditorIdx, setMobileNearChordEditorIdx] = useState(null);
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
  const [showKingBoxes, setShowKingBoxes] = useState(false);
  const [kingBoxMode, setKingBoxMode] = useState("bb");
  const [kingBoxColors, setKingBoxColors] = useState({
    bb: KING_BOX_DEFAULTS.bb.border,
    albert: KING_BOX_DEFAULTS.albert.border,
  });

  // Modo de patrones para el 2º mástil
  const [patternsMode, setPatternsMode] = useState("auto"); // auto | boxes | nps | caged

  // --------------------------------------------------------------------------
  // ESTADO: ACORDE PRINCIPAL
  // --------------------------------------------------------------------------

  // ------------------------
  // Acordes (panel opcional)
  // ------------------------
  const [chordRootPc, setChordRootPc] = useState(5); // F
  const [chordSpellPreferSharps, setChordSpellPreferSharps] = useState(() => preferSharpsFromMajorTonicPc(5));
  const [chordFamily, setChordFamily] = useState("tertian");
  const [chordQuartalType, setChordQuartalType] = useState("pure");
  const [chordQuartalVoices, setChordQuartalVoices] = useState("4");
  const [chordQuartalSpread, setChordQuartalSpread] = useState("closed");
  const [chordQuartalReference, setChordQuartalReference] = useState("root");
  const [chordQuartalScaleName, setChordQuartalScaleName] = useState("Mayor");
  const [chordQuartalVoicingIdx, setChordQuartalVoicingIdx] = useState(0);
  const [chordQuartalSelectedFrets, setChordQuartalSelectedFrets] = useState(null);
  const [guideToneQuality, setGuideToneQuality] = useState("maj7");
  const [guideToneForm, setGuideToneForm] = useState("closed");
  const [guideToneInversion, setGuideToneInversion] = useState("all");
  const [guideToneVoicingIdx, setGuideToneVoicingIdx] = useState(0);
  const [guideToneSelectedFrets, setGuideToneSelectedFrets] = useState(null);
  const lastGuideToneVoicingRef = useRef(null);
  const skipGuideToneVoicingRefSyncRef = useRef(false);
  const [chordQuality, setChordQuality] = useState("maj");
  const [chordSuspension, setChordSuspension] = useState("none");
  const [chordStructure, setChordStructure] = useState("triad");
  const [chordInversion, setChordInversion] = useState("all");
  const [chordForm, setChordForm] = useState("open");
  const [chordPositionForm, setChordPositionForm] = useState("open");
  const [chordExt7, setChordExt7] = useState(false);
  const [chordExt6, setChordExt6] = useState(false);
  const [chordExt9, setChordExt9] = useState(false);
  const [chordExt11, setChordExt11] = useState(false);
  const [chordExt13, setChordExt13] = useState(false);
  // --------------------------------------------------------------------------
  // ESTADO: DETECCIÓN DE ACORDES EN MÁSTIL
  // --------------------------------------------------------------------------

  const [chordDetectMode, setChordDetectMode] = useState(false);
  const [chordDetectClickAudio, setChordDetectClickAudio] = useState(false);
  const [chordDetectPrioritizeContext, setChordDetectPrioritizeContext] = useState(true);
  const [chordDetectPrioritizeContextTouched, setChordDetectPrioritizeContextTouched] = useState(false);
  const [chordDetectSelectedKeys, setChordDetectSelectedKeys] = useState([]);
  const [chordDetectCandidateId, setChordDetectCandidateId] = useState(null);
  const [voicingInputText, setVoicingInputText] = useState("");
  const [chordDetectWindowStart, setChordDetectWindowStart] = useState(1);
  const lastChordDetectCandidateRef = useRef(null);
  const pendingChordDetectCandidateRef = useRef(null);
  const chordDetectPanelRef = useRef(null);
  const chordDetectInvestigationAreaRef = useRef(null);
  const chordDetectViewportFramesRef = useRef([]);
  const chordDetectViewportTimersRef = useRef([]);
  const [chordDetectPlayingKeys, setChordDetectPlayingKeys] = useState([]);
  const [chordDetectClearMinHeight, setChordDetectClearMinHeight] = useState(null);
  const chordDetectPlaybackTimersRef = useRef([]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const widthMedia = window.matchMedia(MOBILE_LAYOUT_WIDTH_MEDIA_QUERY);
    const touchMedia = window.matchMedia(MOBILE_LAYOUT_TOUCH_MEDIA_QUERY);
    const sync = () => setIsMobileLayout(widthMedia.matches || touchMedia.matches);
    const subscribeMediaChange = (mediaQueryList) => {
      if (typeof mediaQueryList.addEventListener === "function" && typeof mediaQueryList.removeEventListener === "function") {
        mediaQueryList.addEventListener("change", sync);
        return () => mediaQueryList.removeEventListener("change", sync);
      }
      if (typeof mediaQueryList.addListener === "function" && typeof mediaQueryList.removeListener === "function") {
        mediaQueryList.addListener(sync);
        return () => mediaQueryList.removeListener(sync);
      }
      return () => {};
    };
    sync();
    const unsubscribeWidth = subscribeMediaChange(widthMedia);
    const unsubscribeTouch = subscribeMediaChange(touchMedia);
    return () => {
      unsubscribeWidth();
      unsubscribeTouch();
    };
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      setMobileMenuOpen(false);
      setMobileTonalContextOpen(false);
      setMobileChordEditorOpen(false);
      setMobileNearChordEditorIdx(null);
      setMobileInfoPopover(null);
      setMobileSectionTransition(null);
      setMobileSectionMotion("none");
      resetMobileSectionSlide();
      return;
    }
    const firstVisible = MOBILE_SECTION_OPTIONS.find((option) => showBoards[option.value])?.value || "chords";
    setMobileSectionTransition(null);
    setMobileSectionMotion("none");
    resetMobileSectionSlide();
    setMobileActiveSection(firstVisible);
  }, [isMobileLayout, showBoards]);

  useEffect(() => {
    if (chordDetectMode && mobileChordEditorOpen) {
      setMobileChordEditorOpen(false);
    }
  }, [chordDetectMode, mobileChordEditorOpen]);

  useEffect(() => {
    const startMax = Math.max(1, maxFret - (MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE - 1));
    setChordDetectWindowStart((start) => {
      const safeStart = Math.floor(Number(start) || 1);
      return Math.max(1, Math.min(startMax, safeStart));
    });
  }, [maxFret]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    if (!isMobileLayout || !(mobileInfoPopoverOpen || mobileChordEditorOpen || mobileNearChordEditorIdx != null || mobileTonalContextOpen)) return undefined;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const body = document.body;
    const html = document.documentElement;
    const prevBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      touchAction: body.style.touchAction,
    };
    const prevHtml = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = prevHtml.overflow;
      html.style.overscrollBehavior = prevHtml.overscrollBehavior;
      body.style.overflow = prevBody.overflow;
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.touchAction = prevBody.touchAction;
      window.scrollTo(0, scrollY);
    };
  }, [isMobileLayout, mobileInfoPopoverOpen, mobileChordEditorOpen, mobileNearChordEditorIdx, mobileTonalContextOpen]);


  // --------------------------------------------------------------------------
  // REGLAS DE COHERENCIA DE UI (sin cambiar sonido ni funcionalidad)
  // --------------------------------------------------------------------------

  useEffect(() => {
    // m7(b5) sin 7ª no existe como triada: se degrada a disminuido.
    if (chordQuality === "hdim" && chordStructure === "triad" && !chordExt7) {
      setChordQuality("dim");
    }
    // Dominante sin 7ª no es dominante: se degrada a mayor.
    if (chordQuality === "dom" && chordStructure === "triad" && !chordExt7) {
      setChordQuality("maj");
    }
  }, [chordQuality, chordStructure, chordExt7]);

  useEffect(() => {
    if (!isDropForm(chordForm)) return;
    if (isStrictFourNoteDropEligible({
      structure: chordStructure,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
    })) return;
    setChordForm(chordPositionForm || "closed");
    setChordInversion("root");
  }, [chordForm, chordPositionForm, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]);

  // Regla (cuatriada):
  // - Por defecto incluye 7ª.
  // - Si activas 9/11/13 (solo una), se desactiva 7ª y pasa a ser add9/add11/add13.
  useEffect(() => {
    if (chordStructure !== "tetrad") return;

    if (chordExt13) {
      if (chordExt11) setChordExt11(false);
      if (chordExt9) setChordExt9(false);
      if (chordExt6) setChordExt6(false);
    } else if (chordExt11) {
      if (chordExt9) setChordExt9(false);
      if (chordExt6) setChordExt6(false);
    } else if (chordExt9) {
      if (chordExt6) setChordExt6(false);
    }

    if (chordExt6) {
      if (chordExt9) setChordExt9(false);
      if (chordExt11) setChordExt11(false);
      if (chordExt13) setChordExt13(false);
    }

    const addCount = (chordExt6 ? 1 : 0) + (chordExt9 ? 1 : 0) + (chordExt11 ? 1 : 0) + (chordExt13 ? 1 : 0);
    setChordExt7(addCount === 0);
  }, [chordStructure, chordExt6, chordExt9, chordExt11, chordExt13]);


  // --------------------------------------------------------------------------
  // CARGA DE VOICINGS / DATASET JSON DEL ACORDE PRINCIPAL
  // --------------------------------------------------------------------------

  // Voicings de acordes (digitaciones tocables) desde dataset externo
  const [chordDb, setChordDb] = useState(null);
  const [chordDbError, setChordDbError] = useState(null);
  const [, setChordDbLastUrl] = useState(null);
  const [chordVoicingIdx, setChordVoicingIdx] = useState(0);
  const [chordSelectedFrets, setChordSelectedFrets] = useState(null);
  const [chordMaxDist, setChordMaxDist] = useState(4);
  const [chordAllowOpenStrings, setChordAllowOpenStrings] = useState(false);
  const lastChordVoicingRef = useRef(null);
  const skipChordVoicingRefSyncRef = useRef(false);
  const pendingChordRestoreRef = useRef({ active: false, frets: null });
  const lastNearVoicingsRef = useRef([null, null, null, null]);
  const skipNearVoicingRefSyncRef = useRef([false, false, false, false]);
  const pendingNearRestoreRef = useRef([
    { active: false, frets: null },
    { active: false, frets: null },
    { active: false, frets: null },
    { active: false, frets: null },
  ]);

  // --------------------------------------------------------------------------
  // ESTADO: ACORDES CERCANOS
  // --------------------------------------------------------------------------

  // ------------------------
  // Acordes (2): acordes cercanos por rango de trastes
  // - Hasta 4 acordes (slot 1 es base)
  // - Calcula digitaciones tocables dentro del rango y ordena por cercanía al acorde base
  // ------------------------
  const [nearWindowStart, setNearWindowStart] = useState(1); // inicio del rango (traste)
  const [nearWindowSize, setNearWindowSize] = useState(6); // tamaño del rango (nº de trastes, incluye inicio)
  const [nearWindowSizeRaw, setNearWindowSizeRaw] = useState("6"); // texto del input, puede estar vacío mientras el usuario edita
  const [nearAutoScaleSync, setNearAutoScaleSync] = useState(true);

  // Clamp del rango a 0–maxFret
  useEffect(() => {
    const size = Math.max(1, Math.floor(Number(nearWindowSize) || 1));
    const startMax = Math.max(0, maxFret - (size - 1));
    if (size !== nearWindowSize) {
      setNearWindowSize(size);
      setNearWindowSizeRaw(String(size));
    }
    setNearWindowStart((s) => {
      const v = Math.floor(Number(s) || 0);
      return Math.max(0, Math.min(startMax, v));
    });
  }, [nearWindowSize, maxFret]);

  const [nearSlots, setNearSlots] = useState(() => {
    const base = {
      enabled: true,
      family: chordFamily,
      rootPc: chordRootPc,
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      inversion: "all",
      form: "open",
      positionForm: "open",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
      quartalType: chordQuartalType,
      quartalVoices: chordQuartalVoices,
      quartalSpread: chordQuartalSpread,
      quartalReference: chordQuartalReference,
      quartalScaleName: chordQuartalScaleName,
      guideToneQuality,
      guideToneForm,
      guideToneInversion,
      spellPreferSharps: chordSpellPreferSharps,
      maxDist: 4,
      allowOpenStrings: false,
      selFrets: null,
    };

    const mkEmpty = () => ({
      enabled: false,
      family: "tertian",
      rootPc: chordRootPc,
      quality: "maj",
      suspension: "none",
      structure: "triad",
      inversion: "all",
      form: "open",
      positionForm: "open",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
      quartalType: "pure",
      quartalVoices: "4",
      quartalSpread: "closed",
      quartalReference: "root",
      quartalScaleName: "Mayor",
      guideToneQuality: "maj7",
      guideToneForm: "closed",
      guideToneInversion: "all",
      spellPreferSharps: chordSpellPreferSharps,
      maxDist: 4,
      allowOpenStrings: false,
      selFrets: null,
    });

    return [base, mkEmpty(), mkEmpty(), mkEmpty()];
  });
  const nearSlotsDropEligibilitySignature = useMemo(
    () => nearSlots.map((s) => `${s?.family || "tertian"}|${s?.form}|${s?.structure}|${s?.ext7 ? 1 : 0}|${s?.ext6 ? 1 : 0}|${s?.ext9 ? 1 : 0}|${s?.ext11 ? 1 : 0}|${s?.ext13 ? 1 : 0}`).join(";"),
    [nearSlots]
  );
  const nearSlotsExtensionSignature = useMemo(
    () => nearSlots.map((s) => `${s?.family || "tertian"}|${s?.structure}|${s?.ext6 ? 1 : 0}|${s?.ext7 ? 1 : 0}|${s?.ext9 ? 1 : 0}|${s?.ext11 ? 1 : 0}|${s?.ext13 ? 1 : 0}`).join(";"),
    [nearSlots]
  );
  const nearSlotsQualitySignature = useMemo(
    () => nearSlots.map((s) => `${s?.family || "tertian"}|${s?.quality}|${s?.structure}|${s?.ext7 ? 1 : 0}`).join(";"),
    [nearSlots]
  );

  useEffect(() => {
    setNearSlots((prev) => {
      let changed = false;
      const next = prev.map((slot) => {
        if (!slot) return slot;
        if (String(slot.family || "tertian") !== "tertian") return slot;
        if (!isDropForm(slot.form)) return slot;
        if (isStrictFourNoteDropEligible({
          structure: slot.structure,
          ext7: slot.ext7,
          ext6: slot.ext6,
          ext9: slot.ext9,
          ext11: slot.ext11,
          ext13: slot.ext13,
        })) return slot;
        changed = true;
        return { ...slot, form: slot.positionForm || "closed", inversion: "root", selFrets: null };
      });
      return changed ? next : prev;
    });
  }, [nearSlotsDropEligibilitySignature]);

  useEffect(() => {
    if (!storageHydrated) return;
    setNearSlots((prev) => {
      let changed = false;
      const next = prev.map((slot) => {
        if (!slot) return slot;
        if (String(slot.family || "tertian") !== "tertian") return slot;
        if (slot.structure !== "tetrad") return slot;

        let ext6 = !!slot.ext6;
        let ext9 = !!slot.ext9;
        let ext11 = !!slot.ext11;
        let ext13 = !!slot.ext13;

        if (ext13) {
          ext11 = false;
          ext9 = false;
          ext6 = false;
        } else if (ext11) {
          ext9 = false;
          ext6 = false;
        } else if (ext9) {
          ext6 = false;
        }

        if (ext6) {
          ext9 = false;
          ext11 = false;
          ext13 = false;
        }

        const addCount = (ext6 ? 1 : 0) + (ext9 ? 1 : 0) + (ext11 ? 1 : 0) + (ext13 ? 1 : 0);
        const ext7 = addCount === 0;

        if (ext6 !== !!slot.ext6 || ext9 !== !!slot.ext9 || ext11 !== !!slot.ext11 || ext13 !== !!slot.ext13 || ext7 !== !!slot.ext7) {
          changed = true;
          return { ...slot, ext6, ext7, ext9, ext11, ext13, selFrets: null };
        }
        return slot;
      });
      return changed ? next : prev;
    });
  }, [storageHydrated, nearSlotsExtensionSignature]);

  useEffect(() => {
    setNearSlots((prev) => {
      let changed = false;
      const next = prev.map((slot) => {
        if (!slot) return slot;
        if (String(slot.family || "tertian") !== "tertian") return slot;
        let quality = slot.quality;
        if (quality === "hdim" && slot.structure === "triad" && !slot.ext7) quality = "dim";
        if (quality === "dom" && slot.structure === "triad" && !slot.ext7) quality = "maj";
        if (quality !== slot.quality) {
          changed = true;
          return { ...slot, quality, selFrets: null };
        }
        return slot;
      });
      return changed ? next : prev;
    });
  }, [nearSlotsQualitySignature]);

  const [nearBgColors, setNearBgColors] = useState([
    "#8ACAF4", // Acorde 1 (base)  RGB(138,202,244)
    "#8DE8AD", // Acorde 2        RGB(141,232,173)
    "#FFF475", // Acorde 3        RGB(255,244,117)
    "#F53845", // Acorde 4        RGB(245,56,69)
  ]);
  const [clusterTestDots, setClusterTestDots] = useState([
    { x: 35, y: 6, size: 21, color: "#ef4444" },
    { x: 12, y: 14, size: 21, color: "#f59e0b" },
    { x: 57, y: 14, size: 21, color: "#10b981" },
    { x: 34, y: 25, size: 21, color: "#3b82f6" },
  ]);

  const [chordDbCache, setChordDbCache] = useState({}); // key => json
  const [chordDbCacheErr, setChordDbCacheErr] = useState({}); // key => string

  // --------------------------------------------------------------------------
  // ESTADO: RUTA MUSICAL
  // --------------------------------------------------------------------------

  // Ruta
  const [routeLabStartCode, setRouteLabStartCode] = useState("61");
  const [routeLabEndCode, setRouteLabEndCode] = useState("113");
  const [routeLabMaxPerString, setRouteLabMaxPerString] = useState(4);
  const [routeLabPickNext, setRouteLabPickNext] = useState("start");
  const [routeLabSwitchWhenSameStringForwardPenalty, setRouteLabSwitchWhenSameStringForwardPenalty] = useState(ROUTE_LAB_DEFAULT_TUNING.switchWhenSameStringForwardPenalty);
  const [routeLabWorseThanSameStringGoalBase, setRouteLabWorseThanSameStringGoalBase] = useState(ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalBase);
  const [routeLabWorseThanSameStringGoalScale, setRouteLabWorseThanSameStringGoalScale] = useState(ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalScale);
  const [routeLabCorridorPenalty, setRouteLabCorridorPenalty] = useState(ROUTE_LAB_DEFAULT_TUNING.corridorPenalty);
  const [routeLabOvershootNearEndAlt, setRouteLabOvershootNearEndAlt] = useState(ROUTE_LAB_DEFAULT_TUNING.overshootNearEndAlt);

  const [routeStartCode, setRouteStartCode] = useState("61");
  const [routeEndCode, setRouteEndCode] = useState("113");
  const [routeMaxPerString, setRouteMaxPerString] = useState(4);
  const [routeMode, setRouteMode] = useState("auto"); // auto | free | penta | nps | pos
  const [routePreferNps, setRoutePreferNps] = useState(true);
  const [routePreferVertical, setRoutePreferVertical] = useState(false);
  const [routeStrictFretDirection, setRouteStrictFretDirection] = useState(false);
  const [routeKeepPattern, setRouteKeepPattern] = useState(false);
  const [allowPatternSwitch, setAllowPatternSwitch] = useState(true);
  const [patternSwitchPenalty, setPatternSwitchPenalty] = useState(2.0);
  const [routeFixedPattern, setRouteFixedPattern] = useState("auto");
  const [routePickNext, setRoutePickNext] = useState("start"); // start | end

  // --------------------------------------------------------------------------
  // ESTADO: COLORES Y APARIENCIA
  // --------------------------------------------------------------------------

  // Colores
  const [colors, setColors] = useState({
    root: "#e11d48",
    third: "#0284c7",
    fifth: "#059669",
    other: "#bababa",
    extra: "#f59e0b",
    route: "#a78bfa",
    seventh: "#edbc07",
    sixth: "#d2b7b7",
    ninth: "#c99ed1",
    eleventh: "#b0a2e2",
    thirteenth: "#88f2c9",
  });

  const [patternColors, setPatternColors] = useState([
    "#c7d2fe",
    "#bae6fd",
    "#bbf7d0",
    "#fde68a",
    "#fecaca",
    "#ddd6fe",
    "#a7f3d0",
  ]);
  const [themePageBg, setThemePageBg] = useState("#f7f8f8");
  const [themeObjectBg, setThemeObjectBg] = useState("#ebf2fa");
  const [themeSectionHeaderBg, setThemeSectionHeaderBg] = useState("#c7d8e5");
  const [themeElementBg, setThemeElementBg] = useState("#ffffff");
  const [themeDisabledControlBg, setThemeDisabledControlBg] = useState("#f0f0f0");

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const prevHtmlBg = html.style.backgroundColor;
    const prevHtmlBgImage = html.style.backgroundImage;
    const prevBodyBg = body.style.backgroundColor;
    const prevBodyBgImage = body.style.backgroundImage;
    const prevRootBg = root?.style.backgroundColor || "";
    const prevRootBgImage = root?.style.backgroundImage || "";

    html.style.backgroundColor = themePageBg;
    html.style.backgroundImage = "none";
    body.style.backgroundColor = themePageBg;
    body.style.backgroundImage = "none";
    if (root) {
      root.style.backgroundColor = themePageBg;
      root.style.backgroundImage = "none";
    }

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      html.style.backgroundImage = prevHtmlBgImage;
      body.style.backgroundColor = prevBodyBg;
      body.style.backgroundImage = prevBodyBgImage;
      if (root) {
        root.style.backgroundColor = prevRootBg;
        root.style.backgroundImage = prevRootBgImage;
      }
    };
  }, [themePageBg]);

  // --------------------------------------------------------------------------
  // PERSISTENCIA / EXPORTACIÓN / PRESETS
  // --------------------------------------------------------------------------

  const persistedUiConfig = useMemo(() => ({
    accMode,
    showIntervalsLabel,
    showNotesLabel,
    showKingBoxes,
    kingBoxMode,
    kingBoxColors,
    rootPc,
    harmonyMode,
    scaleRootLetter,
    scaleRootAcc,
    scaleName,
    maxFret,
    showNonScale,
    customInput,
    extraInput,
    showExtra,
    showBoards,
    patternsMode,
    chordRootPc,
    chordSpellPreferSharps,
    chordFamily,
    chordQuartalType,
    chordQuartalVoices,
    chordQuartalSpread,
    chordQuartalReference,
    chordQuartalScaleName,
    chordQuartalVoicingIdx,
    chordQuartalSelectedFrets,
    guideToneQuality,
    guideToneForm,
    guideToneInversion,
    guideToneVoicingIdx,
    guideToneSelectedFrets,
    chordQuality,
    chordSuspension,
    chordStructure,
    chordInversion,
    chordForm,
    chordPositionForm,
    chordExt7,
    chordExt6,
    chordExt9,
    chordExt11,
    chordExt13,
    chordVoicingIdx,
    chordSelectedFrets,
    chordMaxDist,
    chordAllowOpenStrings,
    chordDetectWindowStart,
    chordDetectPrioritizeContext,
    chordDetectPrioritizeContextTouched,
    nearWindowStart,
    nearWindowSize,
    nearAutoScaleSync,
    nearSlots,
    nearBgColors,
    routeStartCode,
    routeEndCode,
    routeMaxPerString,
    routeLabStartCode,
    routeLabEndCode,
    routeLabMaxPerString,
    routeLabSwitchWhenSameStringForwardPenalty,
    routeLabWorseThanSameStringGoalBase,
    routeLabWorseThanSameStringGoalScale,
    routeLabCorridorPenalty,
    routeLabOvershootNearEndAlt,
    routeMode,
    routePreferNps,
    routePreferVertical,
    routeStrictFretDirection,
    routeKeepPattern,
    allowPatternSwitch,
    patternSwitchPenalty,
    routeFixedPattern,
    routePickNext,
    colors,
    patternColors,
    themePageBg,
    themeObjectBg,
    themeSectionHeaderBg,
    themeElementBg,
    themeDisabledControlBg,
  }), [
    accMode,
    showIntervalsLabel,
    showNotesLabel,
    showKingBoxes,
    kingBoxMode,
    kingBoxColors,
    rootPc,
    harmonyMode,
    scaleRootLetter,
    scaleRootAcc,
    scaleName,
    maxFret,
    showNonScale,
    customInput,
    extraInput,
    showExtra,
    showBoards,
    patternsMode,
    chordRootPc,
    chordSpellPreferSharps,
    chordFamily,
    chordQuartalType,
    chordQuartalVoices,
    chordQuartalSpread,
    chordQuartalReference,
    chordQuartalScaleName,
    chordQuartalVoicingIdx,
    chordQuartalSelectedFrets,
    guideToneQuality,
    guideToneForm,
    guideToneInversion,
    guideToneVoicingIdx,
    guideToneSelectedFrets,
    chordQuality,
    chordSuspension,
    chordStructure,
    chordInversion,
    chordForm,
    chordPositionForm,
    chordExt7,
    chordExt6,
    chordExt9,
    chordExt11,
    chordExt13,
    chordVoicingIdx,
    chordSelectedFrets,
    chordMaxDist,
    chordAllowOpenStrings,
    chordDetectWindowStart,
    chordDetectPrioritizeContext,
    chordDetectPrioritizeContextTouched,
    nearWindowStart,
    nearWindowSize,
    nearAutoScaleSync,
    nearSlots,
    nearBgColors,
    routeStartCode,
    routeEndCode,
    routeMaxPerString,
    routeLabStartCode,
    routeLabEndCode,
    routeLabMaxPerString,
    routeLabSwitchWhenSameStringForwardPenalty,
    routeLabWorseThanSameStringGoalBase,
    routeLabWorseThanSameStringGoalScale,
    routeLabCorridorPenalty,
    routeLabOvershootNearEndAlt,
    routeMode,
    routePreferNps,
    routePreferVertical,
    routeStrictFretDirection,
    routeKeepPattern,
    allowPatternSwitch,
    patternSwitchPenalty,
    routeFixedPattern,
    routePickNext,
    colors,
    patternColors,
    themePageBg,
    themeObjectBg,
    themeSectionHeaderBg,
    themeElementBg,
    themeDisabledControlBg,
  ]);

  const persistedUiPayload = useMemo(() => ({
    version: UI_CONFIG_VERSION,
    appVersion: APP_VERSION,
    config: persistedUiConfig,
  }), [persistedUiConfig]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") {
        setStorageHydrated(true);
        return;
      }

      const presetRaw = window.localStorage.getItem(UI_PRESETS_STORAGE_KEY);
      if (presetRaw) {
        try {
          setQuickPresets(sanitizePresetCollection(JSON.parse(presetRaw), {
            quickPresetCount: QUICK_PRESET_COUNT,
            uiConfigVersion: UI_CONFIG_VERSION,
            appVersion: APP_VERSION,
          }));
        } catch {
          // Preset corrupto: se ignora y se mantiene el valor por defecto.
        }
      }

      const queuedNotice = window.sessionStorage.getItem(UI_STATUS_SESSION_KEY);
      if (queuedNotice) {
        try {
          const parsedNotice = JSON.parse(queuedNotice);
          if (parsedNotice && typeof parsedNotice === "object") setConfigNotice(parsedNotice);
        } catch {
          // Aviso de sesión corrupto: no debe bloquear la carga de la app.
        }
        window.sessionStorage.removeItem(UI_STATUS_SESSION_KEY);
      }
      const raw = window.localStorage.getItem(UI_STORAGE_KEY);
      if (!raw) {
        setStorageHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw);
      const payload = unwrapPersistedPayload(parsed);
      const saved = payload.config || {};
      if (payload.version && payload.version !== UI_CONFIG_VERSION) {
        setConfigNotice({ type: "info", text: `Configuración antigua (v${payload.version}) cargada con saneado.` });
      }

      if ("accMode" in saved) setAccMode(sanitizeOneOf(saved.accMode, ["auto", "sharps", "flats"], "auto"));
      if ("showIntervalsLabel" in saved) setShowIntervalsLabel(sanitizeBoolValue(saved.showIntervalsLabel, true));
      if ("showNotesLabel" in saved) setShowNotesLabel(sanitizeBoolValue(saved.showNotesLabel, false));
      if ("showKingBoxes" in saved) setShowKingBoxes(sanitizeBoolValue(saved.showKingBoxes, false));
      if ("kingBoxMode" in saved) setKingBoxMode(sanitizeOneOf(saved.kingBoxMode, ["bb", "albert", "both"], "bb"));
      if (saved.kingBoxColors && typeof saved.kingBoxColors === "object") {
        setKingBoxColors((prev) => ({
          bb: sanitizeColorValue(saved.kingBoxColors.bb, prev.bb),
          albert: sanitizeColorValue(saved.kingBoxColors.albert, prev.albert),
        }));
      }
      if ("rootPc" in saved) setRootPc(sanitizeNumberValue(saved.rootPc, 5, 0, 11));
      if ("harmonyMode" in saved) setHarmonyMode(sanitizeOneOf(saved.harmonyMode, ["diatonic", "functional_minor"], "diatonic"));
      if ("scaleRootLetter" in saved) setScaleRootLetter(sanitizeOneOf(saved.scaleRootLetter, LETTERS, "F"));
      if ("scaleRootAcc" in saved) setScaleRootAcc(saved.scaleRootAcc == null ? null : sanitizeOneOf(saved.scaleRootAcc, ["flat", "sharp"], null));
      if ("scaleName" in saved) setScaleName(sanitizeOneOf(normalizeScaleName(saved.scaleName), Object.keys(SCALE_PRESETS), "Mayor"));
      if ("maxFret" in saved) setMaxFret(sanitizeNumberValue(saved.maxFret, 15, 12, 24));
      if ("showNonScale" in saved) setShowNonScale(sanitizeBoolValue(saved.showNonScale, false));
      if ("customInput" in saved && typeof saved.customInput === "string") setCustomInput(saved.customInput);
      if ("extraInput" in saved && typeof saved.extraInput === "string") setExtraInput(saved.extraInput);
      if ("showExtra" in saved) setShowExtra(sanitizeBoolValue(saved.showExtra, false));
      if (saved.showBoards && typeof saved.showBoards === "object") {
        setShowBoards((prev) => normalizeBoardVisibility({
          ...prev,
          scale: sanitizeBoolValue(saved.showBoards.scale, prev.scale),
          patterns: sanitizeBoolValue(saved.showBoards.patterns, prev.patterns),
          route: sanitizeBoolValue(saved.showBoards.route, prev.route),
          chords: sanitizeBoolValue(saved.showBoards.chords, prev.chords),
          nearChords: sanitizeBoolValue(saved.showBoards.nearChords, prev.nearChords),
          standards: sanitizeBoolValue(saved.showBoards.standards, prev.standards),
          configuration: sanitizeBoolValue(saved.showBoards.configuration, prev.configuration),
        }));
      }
      if ("patternsMode" in saved) setPatternsMode(sanitizeOneOf(saved.patternsMode, ["auto", "boxes", "nps", "caged"], "auto"));

      if ("chordRootPc" in saved) setChordRootPc(sanitizeNumberValue(saved.chordRootPc, 5, 0, 11));
      if ("chordSpellPreferSharps" in saved) setChordSpellPreferSharps(sanitizeBoolValue(saved.chordSpellPreferSharps, true));
      if ("chordFamily" in saved) setChordFamily(sanitizeOneOf(saved.chordFamily, CHORD_FAMILIES.map((x) => x.value), "tertian"));
      if ("chordQuartalType" in saved) setChordQuartalType(sanitizeOneOf(saved.chordQuartalType, CHORD_QUARTAL_TYPES.map((x) => x.value), "pure"));
      if ("chordQuartalVoices" in saved) setChordQuartalVoices(sanitizeOneOf(String(saved.chordQuartalVoices), CHORD_QUARTAL_VOICES.map((x) => x.value), "4"));
      if ("chordQuartalSpread" in saved) setChordQuartalSpread(sanitizeOneOf(saved.chordQuartalSpread, CHORD_QUARTAL_SPREADS.map((x) => x.value), "closed"));
      if ("chordQuartalReference" in saved) setChordQuartalReference(sanitizeOneOf(saved.chordQuartalReference, CHORD_QUARTAL_REFERENCES.map((x) => x.value), "root"));
      if ("chordQuartalScaleName" in saved) setChordQuartalScaleName(sanitizeOneOf(normalizeScaleName(saved.chordQuartalScaleName), CHORD_QUARTAL_SCALE_NAMES, "Mayor"));
      if ("chordQuartalVoicingIdx" in saved) setChordQuartalVoicingIdx(Math.max(0, sanitizeNumberValue(saved.chordQuartalVoicingIdx, 0, 0, 9999)));
      if ("chordQuartalSelectedFrets" in saved) setChordQuartalSelectedFrets(typeof saved.chordQuartalSelectedFrets === "string" ? saved.chordQuartalSelectedFrets : null);
      if ("guideToneQuality" in saved) setGuideToneQuality(sanitizeOneOf(saved.guideToneQuality, CHORD_GUIDE_TONE_QUALITIES.map((q) => q.value), "maj7"));
      if ("guideToneForm" in saved) setGuideToneForm(sanitizeOneOf(saved.guideToneForm, CHORD_GUIDE_TONE_FORMS.map((x) => x.value), "closed"));
      if ("guideToneInversion" in saved) setGuideToneInversion(sanitizeOneOf(saved.guideToneInversion, CHORD_GUIDE_TONE_INVERSIONS.map((x) => x.value), "all"));
      if ("guideToneVoicingIdx" in saved) setGuideToneVoicingIdx(sanitizeNumberValue(saved.guideToneVoicingIdx, 0, 0, 999));
      if ("guideToneSelectedFrets" in saved) setGuideToneSelectedFrets(typeof saved.guideToneSelectedFrets === "string" ? saved.guideToneSelectedFrets : null);
      if ("chordQuality" in saved) setChordQuality(sanitizeOneOf(saved.chordQuality, CHORD_QUALITIES.map((q) => q.value), "maj"));
      if ("chordSuspension" in saved) setChordSuspension(sanitizeOneOf(saved.chordSuspension, ["none", "sus2", "sus4"], "none"));
      if ("chordStructure" in saved) setChordStructure(sanitizeOneOf(saved.chordStructure, CHORD_STRUCTURES.map((s) => s.value), "triad"));
      if ("chordInversion" in saved) setChordInversion(sanitizeOneOf(saved.chordInversion, CHORD_INVERSIONS.map((x) => x.value), "root"));
      if ("chordForm" in saved) {
        const restoredChordForm = sanitizeOneOf(saved.chordForm, CHORD_FORMS.map((x) => x.value), "open");
        setChordForm(restoredChordForm);
        const restoredPosition = "chordPositionForm" in saved
          ? sanitizeOneOf(saved.chordPositionForm, ["closed", "open"], positionFormFromEffectiveForm(restoredChordForm))
          : positionFormFromEffectiveForm(restoredChordForm);
        setChordPositionForm(restoredPosition);
      } else if ("chordPositionForm" in saved) {
        setChordPositionForm(sanitizeOneOf(saved.chordPositionForm, ["closed", "open"], "open"));
      }
      if ("chordExt7" in saved) setChordExt7(sanitizeBoolValue(saved.chordExt7, false));
      if ("chordExt6" in saved) setChordExt6(sanitizeBoolValue(saved.chordExt6, false));
      if ("chordExt9" in saved) setChordExt9(sanitizeBoolValue(saved.chordExt9, false));
      if ("chordExt11" in saved) setChordExt11(sanitizeBoolValue(saved.chordExt11, false));
      if ("chordExt13" in saved) setChordExt13(sanitizeBoolValue(saved.chordExt13, false));
      if ("chordVoicingIdx" in saved) setChordVoicingIdx(sanitizeNumberValue(saved.chordVoicingIdx, 0, 0, 999));
      if ("chordSelectedFrets" in saved) {
        const restored = typeof saved.chordSelectedFrets === "string" || saved.chordSelectedFrets == null ? saved.chordSelectedFrets : null;
        setChordSelectedFrets(restored);
        pendingChordRestoreRef.current = { active: true, frets: restored };
      }
      if ("chordMaxDist" in saved) setChordMaxDist(sanitizeOneOf(Number(saved.chordMaxDist), [4, 5, 6], 4));
      if ("chordAllowOpenStrings" in saved) setChordAllowOpenStrings(sanitizeBoolValue(saved.chordAllowOpenStrings, false));
      if ("chordDetectWindowStart" in saved) setChordDetectWindowStart(sanitizeNumberValue(saved.chordDetectWindowStart, 1, 1, 24));
      if ("chordDetectPrioritizeContextTouched" in saved) {
        const restoredTouched = sanitizeBoolValue(saved.chordDetectPrioritizeContextTouched, false);
        setChordDetectPrioritizeContextTouched(restoredTouched);
        if ("chordDetectPrioritizeContext" in saved) {
          setChordDetectPrioritizeContext(sanitizeBoolValue(saved.chordDetectPrioritizeContext, true));
        }
      } else {
        // Legacy configs used false as a default, which broke continuity in the fretboard investigator.
        setChordDetectPrioritizeContext(true);
        setChordDetectPrioritizeContextTouched(false);
      }

      if ("nearWindowStart" in saved) setNearWindowStart(sanitizeNumberValue(saved.nearWindowStart, 1, 0, 24));
      if ("nearWindowSize" in saved) setNearWindowSize(sanitizeNumberValue(saved.nearWindowSize, 6, 1, 24));
      if ("nearAutoScaleSync" in saved) setNearAutoScaleSync(sanitizeBoolValue(saved.nearAutoScaleSync, true));
      if (Array.isArray(saved.nearSlots)) {
        pendingNearRestoreRef.current = Array.from({ length: 4 }, (_, i) => ({
          active: true,
          frets: typeof saved.nearSlots[i]?.selFrets === "string" || saved.nearSlots[i]?.selFrets == null ? (saved.nearSlots[i]?.selFrets ?? null) : null,
        }));
        setNearSlots((prev) => prev.map((slot, i) => sanitizeNearSlotValue(saved.nearSlots[i], slot)));
      }
      if (Array.isArray(saved.nearBgColors)) {
        setNearBgColors((prev) => prev.map((c, i) => sanitizeColorValue(saved.nearBgColors[i], c)));
      }

      if ("routeStartCode" in saved && typeof saved.routeStartCode === "string") setRouteStartCode(saved.routeStartCode);
      if ("routeEndCode" in saved && typeof saved.routeEndCode === "string") setRouteEndCode(saved.routeEndCode);
      if ("routeMaxPerString" in saved) setRouteMaxPerString(sanitizeNumberValue(saved.routeMaxPerString, 4, 1, 5));
      if ("routeLabStartCode" in saved && typeof saved.routeLabStartCode === "string") setRouteLabStartCode(saved.routeLabStartCode);
      if ("routeLabEndCode" in saved && typeof saved.routeLabEndCode === "string") setRouteLabEndCode(saved.routeLabEndCode);
      if ("routeLabMaxPerString" in saved) setRouteLabMaxPerString(sanitizeNumberValue(saved.routeLabMaxPerString, 4, 1, 5));
      if ("routeLabSwitchWhenSameStringForwardPenalty" in saved) setRouteLabSwitchWhenSameStringForwardPenalty(sanitizeNumberValue(saved.routeLabSwitchWhenSameStringForwardPenalty, ROUTE_LAB_DEFAULT_TUNING.switchWhenSameStringForwardPenalty, 0, 12));
      if ("routeLabWorseThanSameStringGoalBase" in saved) setRouteLabWorseThanSameStringGoalBase(sanitizeNumberValue(saved.routeLabWorseThanSameStringGoalBase, ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalBase, 0, 12));
      if ("routeLabWorseThanSameStringGoalScale" in saved) setRouteLabWorseThanSameStringGoalScale(sanitizeNumberValue(saved.routeLabWorseThanSameStringGoalScale, ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalScale, 0, 6));
      if ("routeLabCorridorPenalty" in saved) setRouteLabCorridorPenalty(sanitizeNumberValue(saved.routeLabCorridorPenalty, ROUTE_LAB_DEFAULT_TUNING.corridorPenalty, 0, 4));
      if ("routeLabOvershootNearEndAlt" in saved) setRouteLabOvershootNearEndAlt(sanitizeNumberValue(saved.routeLabOvershootNearEndAlt, ROUTE_LAB_DEFAULT_TUNING.overshootNearEndAlt, 0, 16));
      if ("routeMode" in saved) setRouteMode(sanitizeOneOf(saved.routeMode, ["auto", "free", "pos", "nps", "penta", "caged"], "auto"));
      if ("routePreferNps" in saved) setRoutePreferNps(sanitizeBoolValue(saved.routePreferNps, true));
      if ("routePreferVertical" in saved) setRoutePreferVertical(sanitizeBoolValue(saved.routePreferVertical, false));
      if ("routeStrictFretDirection" in saved) setRouteStrictFretDirection(sanitizeBoolValue(saved.routeStrictFretDirection, false));
      if ("routeKeepPattern" in saved) setRouteKeepPattern(sanitizeBoolValue(saved.routeKeepPattern, false));
      if ("allowPatternSwitch" in saved) setAllowPatternSwitch(sanitizeBoolValue(saved.allowPatternSwitch, true));
      if ("patternSwitchPenalty" in saved) setPatternSwitchPenalty(sanitizeNumberValue(saved.patternSwitchPenalty, 2, 0, 6));
      if ("routeFixedPattern" in saved && typeof saved.routeFixedPattern === "string") setRouteFixedPattern(saved.routeFixedPattern);
      if ("routePickNext" in saved) setRoutePickNext(sanitizeOneOf(saved.routePickNext, ["start", "end"], "start"));

      if (saved.colors && typeof saved.colors === "object") {
        setColors((prev) => ({
          ...prev,
          root: sanitizeColorValue(saved.colors.root, prev.root),
          third: sanitizeColorValue(saved.colors.third, prev.third),
          fifth: sanitizeColorValue(saved.colors.fifth, prev.fifth),
          other: sanitizeColorValue(saved.colors.other, prev.other),
          extra: sanitizeColorValue(saved.colors.extra, prev.extra),
          route: sanitizeColorValue(saved.colors.route, prev.route),
          seventh: sanitizeColorValue(saved.colors.seventh, prev.seventh),
          sixth: sanitizeColorValue(saved.colors.sixth, prev.sixth),
          ninth: sanitizeColorValue(saved.colors.ninth, prev.ninth),
          eleventh: sanitizeColorValue(saved.colors.eleventh, prev.eleventh),
          thirteenth: sanitizeColorValue(saved.colors.thirteenth, prev.thirteenth),
        }));
      }
      if (Array.isArray(saved.patternColors)) {
        setPatternColors((prev) => prev.map((c, i) => sanitizeColorValue(saved.patternColors[i], c)));
      }
      if ("themePageBg" in saved) setThemePageBg(sanitizeColorValue(saved.themePageBg, "#f7f8f8"));
      if ("themeObjectBg" in saved) setThemeObjectBg(sanitizeColorValue(saved.themeObjectBg, "#ebf2fa"));
      if ("themeSectionHeaderBg" in saved) setThemeSectionHeaderBg(sanitizeColorValue(saved.themeSectionHeaderBg, "#c7d8e5"));
      if ("themeElementBg" in saved) setThemeElementBg(sanitizeColorValue(saved.themeElementBg, "#ffffff"));
      if ("themeDisabledControlBg" in saved) setThemeDisabledControlBg(sanitizeColorValue(saved.themeDisabledControlBg, "#f0f0f0"));
    } catch {
      setConfigNotice({ type: "error", text: "Configuración guardada inválida. Se usaron valores seguros." });
    } finally {
      setStorageHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!storageHydrated) return;
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(persistedUiPayload));
    } catch {
      // Si localStorage falla, la sesión puede continuar sin persistencia.
    }
  }, [storageHydrated, persistedUiPayload]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(UI_PRESETS_STORAGE_KEY, JSON.stringify(quickPresets));
    } catch {
      // Si localStorage falla, los presets solo se mantienen en memoria.
    }
  }, [quickPresets]);

  useEffect(() => {
    if (!configNotice) return;
    const t = window.setTimeout(() => setConfigNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [configNotice]);

  function queueReloadNotice(type, text) {
    try {
      if (typeof window === "undefined") return;
      window.sessionStorage.setItem(UI_STATUS_SESSION_KEY, JSON.stringify({ type, text }));
    } catch {
      // Si sessionStorage falla, simplemente no se muestra aviso tras recargar.
    }
  }

  function exportUiConfig() {
    try {
      const raw = JSON.stringify(persistedUiPayload, null, 2);
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
      a.href = url;
      a.download = `mastil_interactivo_config_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setConfigNotice({ type: "success", text: "Configuración exportada." });
    } catch {
      setConfigNotice({ type: "error", text: "No pude exportar la configuración." });
    }
  }

  function buildImportedPayload(parsed) {
    const payload = unwrapPersistedPayload(parsed);
    return {
      version: UI_CONFIG_VERSION,
      appVersion: APP_VERSION,
      config: payload.config || {},
    };
  }

  function importUiConfigFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "");
        const parsed = JSON.parse(raw);
        const payload = buildImportedPayload(parsed);
        if (typeof window === "undefined") return;
        window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(payload));
        queueReloadNotice("success", "Configuración importada.");
        window.location.reload();
      } catch (e) {
        const msg = `No pude importar la configuración: ${String(e?.message || e)}`;
        setConfigNotice({ type: "error", text: msg });
        if (typeof window !== "undefined") window.alert(msg);
      }
    };
    reader.readAsText(file);
  }

  function resetUiConfig() {
    try {
      if (typeof window === "undefined") return;
      const ok = window.confirm("Se borrará la configuración guardada y se recargará la página. ¿Continuar?");
      if (!ok) return;
      window.localStorage.removeItem(UI_STORAGE_KEY);
      queueReloadNotice("info", "Configuración restablecida.");
      window.location.reload();
    } catch {
      // El usuario puede cancelar o el navegador puede bloquear la recarga.
    }
  }

  function _resetRouteLabTuning() {
    setRouteLabSwitchWhenSameStringForwardPenalty(ROUTE_LAB_DEFAULT_TUNING.switchWhenSameStringForwardPenalty);
    setRouteLabWorseThanSameStringGoalBase(ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalBase);
    setRouteLabWorseThanSameStringGoalScale(ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalScale);
    setRouteLabCorridorPenalty(ROUTE_LAB_DEFAULT_TUNING.corridorPenalty);
    setRouteLabOvershootNearEndAlt(ROUTE_LAB_DEFAULT_TUNING.overshootNearEndAlt);
  }

  function saveQuickPreset(slotIdx) {
    try {
      if (typeof window === "undefined") return;
      const currentName = quickPresets[slotIdx]?.name || `Preset ${slotIdx + 1}`;
      const asked = window.prompt(`Nombre para el preset ${slotIdx + 1}:`, currentName);
      if (asked === null) return;
      const name = cleanUiText(asked) || `Preset ${slotIdx + 1}`;
      setQuickPresets((prev) => {
        const next = [...prev];
        next[slotIdx] = {
          name,
          savedAt: new Date().toISOString(),
          payload: persistedUiPayload,
        };
        return next;
      });
      setConfigNotice({ type: "success", text: `Preset ${slotIdx + 1} guardado.` });
    } catch {
      setConfigNotice({ type: "error", text: "No pude guardar el preset." });
    }
  }

  function loadQuickPreset(slotIdx) {
    try {
      const preset = quickPresets[slotIdx];
      if (!preset?.payload) {
        setConfigNotice({ type: "error", text: `El preset ${slotIdx + 1} está vacío.` });
        return;
      }
      if (typeof window === "undefined") return;
      window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(preset.payload));
      queueReloadNotice("success", `Preset ${slotIdx + 1} cargado.`);
      window.location.reload();
    } catch {
      setConfigNotice({ type: "error", text: "No pude cargar el preset." });
    }
  }

  // --------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS: ESCALA ACTIVA, PCS Y DELETREO
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS: ESCALA ACTIVA, PCS Y DELETREO
  // --------------------------------------------------------------------------

  const scaleIntervals = useMemo(() => buildScaleIntervals(scaleName, customInput, rootPc), [scaleName, customInput, rootPc]);
  const usesFiveNoteBoxPatterns = scaleIntervals.length === 5;
  const scaleIntervalLabels = useMemo(() => buildScaleIntervalLabels(scaleName, scaleIntervals), [scaleName, scaleIntervals]);

  useEffect(() => {
    const root = appRootRef.current;
    if (!root) return;

    const controls = root.querySelectorAll("select, input, button");
    controls.forEach((el) => {
      const title = cleanUiText(el.getAttribute("title"));
      if (title) return;
      const inferred = inferControlTitle(el);
      if (inferred) el.setAttribute("title", inferred);
    });
  });

  // Ajuste lógico de modos según la escala elegida
  useEffect(() => {
    if (usesFiveNoteBoxPatterns && routeMode === "nps") setRouteMode("auto");
    if (!usesFiveNoteBoxPatterns && routeMode === "penta") setRouteMode("auto");
    if (!usesFiveNoteBoxPatterns && scaleIntervals.length !== 7 && routeMode === "nps") setRouteMode("auto");
  }, [usesFiveNoteBoxPatterns, scaleIntervals.length, routeMode]);
  const scalePcs = useMemo(() => new Set(scaleIntervals.map((i) => mod12(rootPc + i))), [scaleIntervals, rootPc]);

  const thirdOffsets = useMemo(() => pickThirdOffsets(scaleIntervals), [scaleIntervals]);
  const hasFifth = useMemo(() => new Set(scaleIntervals.map(mod12)).has(7), [scaleIntervals]);

  const extraIntervals = useMemo(() => parseTokensToIntervals({ input: extraInput, rootPc }), [extraInput, rootPc]);
  const extraPcs = useMemo(() => new Set(extraIntervals.map((i) => mod12(rootPc + i))), [extraIntervals, rootPc]);

  const autoPreferSharps = useMemo(() => computeAutoPreferSharps({ rootPc, scaleName }), [rootPc, scaleName]);
  const preferSharps = accMode === "auto" ? autoPreferSharps : accMode === "sharps";

  const _noteOptions = useMemo(() => {
    const list = preferSharps ? NOTES_SHARP : NOTES_FLAT;
    return list.map((n, i) => ({ label: n, pc: i }));
  }, [preferSharps]);

  // --------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS: ACORDE PRINCIPAL
  // --------------------------------------------------------------------------

  // Acordes: ortografía del nombre (C# vs Db). No depende de la notación global.
  const chordPreferSharps = chordSpellPreferSharps;

  const _chordNoteOptions = useMemo(() => {
    const list = chordPreferSharps ? NOTES_SHARP : NOTES_FLAT;
    return list.map((n, i) => ({ label: n, pc: i }));
  }, [chordPreferSharps]);

  const chordQuartalPitchSets = useMemo(() => {
    return fnBuildQuartalPitchSets({
      rootPc: chordRootPc,
      voices: chordQuartalVoices,
      type: chordQuartalType,
      reference: chordQuartalReference,
      scaleName: chordQuartalScaleName,
    });
  }, [chordRootPc, chordQuartalVoices, chordQuartalType, chordQuartalReference, chordQuartalScaleName]);

  const chordQuartalVoicings = useMemo(() => {
    const all = fnGenerateQuartalVoicings({
      pitchSets: chordQuartalPitchSets,
      maxDist: chordMaxDist,
      allowOpenStrings: chordAllowOpenStrings,
      maxFret,
    });

    return all.filter((v) => {
      const kind = v?.quartalSpreadKind || "closed";
      return chordQuartalSpread === "open" ? kind === "open" : kind === "closed";
    });
  }, [chordQuartalPitchSets, chordMaxDist, chordAllowOpenStrings, chordQuartalSpread, maxFret]);

  useEffect(() => {
    if (!chordQuartalVoicings.length) {
      setChordQuartalVoicingIdx(0);
      setChordQuartalSelectedFrets(null);
      return;
    }

    if (chordQuartalSelectedFrets) {
      const idx = chordQuartalVoicings.findIndex((v) => v.frets === chordQuartalSelectedFrets);
      if (idx >= 0) {
        setChordQuartalVoicingIdx(idx);
        return;
      }
    }

    setChordQuartalVoicingIdx(0);
    setChordQuartalSelectedFrets(chordQuartalVoicings[0].frets);
  }, [chordQuartalVoicings, chordQuartalSelectedFrets]);

  const activeQuartalVoicingRaw = chordQuartalVoicings[chordQuartalVoicingIdx] || null;

  const activeQuartalVoicing = useMemo(() => {
    if (!activeQuartalVoicingRaw) return null;
    if (Array.isArray(activeQuartalVoicingRaw.notes)) return activeQuartalVoicingRaw;
    return { ...activeQuartalVoicingRaw, notes: [] };
  }, [activeQuartalVoicingRaw]);

  const chordQuartalCurrentRootPc = useMemo(() => {
    const pcs = Array.isArray(activeQuartalVoicing?.quartalOrderedPcs) && activeQuartalVoicing.quartalOrderedPcs.length
      ? activeQuartalVoicing.quartalOrderedPcs
      : Array.isArray(chordQuartalPitchSets?.[0]?.pcs) && chordQuartalPitchSets[0].pcs.length
        ? chordQuartalPitchSets[0].pcs
        : null;

    return pcs ? mod12(pcs[0]) : chordRootPc;
  }, [activeQuartalVoicing, chordQuartalPitchSets, chordRootPc]);

  const chordQuartalDegreeText = useMemo(() => {
    if (chordQuartalReference !== "scale") return "";
    return fnBuildQuartalDegreeLabel(activeQuartalVoicing?.quartalDegree);
  }, [chordQuartalReference, activeQuartalVoicing]);

  const chordQuartalDisplayName = useMemo(() => {
    const rootName = pcToName(chordQuartalCurrentRootPc, chordPreferSharps);
    const typeLabel = CHORD_QUARTAL_TYPES.find((x) => x.value === chordQuartalType)?.label || "Cuartal puro";
    return `${rootName} ${typeLabel}`;
  }, [chordQuartalCurrentRootPc, chordPreferSharps, chordQuartalType]);

  const chordQuartalUiText = useMemo(() => {
    const voicesLabel = CHORD_QUARTAL_VOICES.find((x) => x.value === chordQuartalVoices)?.label || "4 voces";
    const spreadLabel = CHORD_QUARTAL_SPREADS.find((x) => x.value === chordQuartalSpread)?.label || "Cerrado";
    const tonicName = pcToName(chordRootPc, chordPreferSharps);
    const referenceLabel = chordQuartalReference === "scale"
      ? `Diatónico a la escala ${chordQuartalScaleName} de ${tonicName}`
      : `Desde raíz de ${tonicName}`;
    const degreeText = chordQuartalDegreeText ? ` · ${chordQuartalDegreeText}` : "";
    return `${voicesLabel} · ${spreadLabel} · ${referenceLabel}${degreeText}`;
  }, [chordQuartalVoices, chordQuartalSpread, chordQuartalReference, chordQuartalScaleName, chordQuartalDegreeText, chordRootPc, chordPreferSharps]);

  const chordQuartalStepText = useMemo(() => {
    if (!activeQuartalVoicing?.quartalSteps?.length) return "";
    return activeQuartalVoicing.quartalSteps.map((v) => (v === 6 ? "A4" : "4J")).join(" · ");
  }, [activeQuartalVoicing]);

  const chordQuartalBadgeItems = useMemo(() => {
    const orderedPcs = Array.isArray(activeQuartalVoicing?.quartalOrderedPcs) && activeQuartalVoicing.quartalOrderedPcs.length
      ? activeQuartalVoicing.quartalOrderedPcs
      : (Array.isArray(chordQuartalPitchSets?.[0]?.pcs) ? chordQuartalPitchSets[0].pcs : []);

    return orderedPcs.map((pc) => {
      const interval = mod12(pc - chordQuartalCurrentRootPc);
      const degreeRaw = intervalToSimpleChordDegreeToken(interval);
      return {
        note: spellNoteFromChordInterval(chordQuartalCurrentRootPc, interval, chordPreferSharps),
        degree: formatChordBadgeDegree(degreeRaw),
        role: chordBadgeRoleFromDegreeLabel(degreeRaw, interval),
      };
    });
  }, [activeQuartalVoicing, chordQuartalPitchSets, chordQuartalCurrentRootPc, chordPreferSharps]);

  const chordQuartalBassNote = useMemo(() => {
    if (activeQuartalVoicing?.bassPc == null) return null;
    const interval = mod12(activeQuartalVoicing.bassPc - chordQuartalCurrentRootPc);
    return spellNoteFromChordInterval(chordQuartalCurrentRootPc, interval, chordPreferSharps);
  }, [activeQuartalVoicing, chordQuartalCurrentRootPc, chordPreferSharps]);

  const guideToneDef = useMemo(() => guideToneDefinitionFromQuality(guideToneQuality), [guideToneQuality]);

  const guideToneDisplayName = useMemo(() => {
    const rootName = pcToName(chordRootPc, chordPreferSharps);
    return `${rootName}${guideToneDef.suffix}`;
  }, [chordRootPc, chordPreferSharps, guideToneDef]);

  const guideToneBadgeItems = useMemo(() => {
    return guideToneDef.intervals.map((interval, idx) => {
      const degreeRaw = guideToneDef.degreeLabels[idx] || intervalToSimpleChordDegreeToken(interval);
      return {
        note: spellNoteFromChordInterval(chordRootPc, interval, chordPreferSharps),
        degree: formatChordBadgeDegree(degreeRaw),
        role: chordBadgeRoleFromDegreeLabel(degreeRaw, interval),
      };
    });
  }, [guideToneDef, chordRootPc, chordPreferSharps]);

  const guideToneVoicings = useMemo(() => {
    const baseList = guideToneBassIntervalsForSelection(guideToneDef, guideToneInversion).flatMap((bassInterval) =>
      generateExactIntervalChordVoicings({
        rootPc: chordRootPc,
        intervals: guideToneDef.intervals,
        bassInterval,
        maxFret,
        maxSpan: chordMaxDist,
      }).map((v) => normalizeGeneratedVoicingForDisplay(v, chordRootPc, chordRootPc))
    );

    const allowedIntervals = new Set(guideToneDef.intervals.map(mod12));
    const requiredIntervals = new Set(guideToneDef.intervals.map(mod12));
    let list = dedupeAndSortVoicings(baseList);

    if (!chordAllowOpenStrings) {
      list = list.filter((v) => !voicingHasOpenStrings(v));
    }

    if (chordAllowOpenStrings) {
      list = augmentExactVoicingsWithOpenSubstitutions({
        voicings: list,
        rootPc: chordRootPc,
        allowedIntervals,
        requiredIntervals,
        allowedBassIntervals: guideToneBassIntervalsForSelection(guideToneDef, guideToneInversion),
        nearFrom: 0,
        nearTo: maxFret,
        maxFret,
        maxSpan: chordMaxDist,
        exactNoteCount: 3,
      });
    }

    list = filterVoicingsByForm(dedupeAndSortVoicings(list), guideToneForm);
    return list.slice(0, 60);
  }, [guideToneDef, guideToneInversion, chordRootPc, maxFret, chordMaxDist, chordAllowOpenStrings, guideToneForm]);

  const guideToneVoicingsSig = useMemo(() => guideToneVoicings.map((v) => v.frets).join("|"), [guideToneVoicings]);

  useEffect(() => {
    if (!guideToneVoicings.length) {
      lastGuideToneVoicingRef.current = null;
      if (guideToneVoicingIdx !== 0) setGuideToneVoicingIdx(0);
      if (guideToneSelectedFrets !== null) setGuideToneSelectedFrets(null);
      return;
    }

    const keepIdx = guideToneSelectedFrets ? guideToneVoicings.findIndex((v) => v.frets === guideToneSelectedFrets) : -1;
    if (keepIdx >= 0) {
      if (keepIdx !== guideToneVoicingIdx) {
        skipGuideToneVoicingRefSyncRef.current = true;
        setGuideToneVoicingIdx(keepIdx);
      }
      return;
    }

    const ref = lastGuideToneVoicingRef.current;
    const idx = nearestVoicingIndex(ref, guideToneVoicings);
    const nextFrets = guideToneVoicings[idx]?.frets ?? guideToneVoicings[0]?.frets ?? null;
    if (idx !== guideToneVoicingIdx) {
      skipGuideToneVoicingRefSyncRef.current = true;
      setGuideToneVoicingIdx(idx);
    }
    if (nextFrets !== guideToneSelectedFrets) setGuideToneSelectedFrets(nextFrets);
  }, [guideToneVoicingIdx, guideToneVoicings, guideToneVoicingsSig, guideToneSelectedFrets]);

  useEffect(() => {
    const current = guideToneVoicings[guideToneVoicingIdx] || guideToneVoicings[0] || null;

    if (skipGuideToneVoicingRefSyncRef.current) {
      skipGuideToneVoicingRefSyncRef.current = false;
      return;
    }

    const selectedStillExists = !!guideToneSelectedFrets && guideToneVoicings.some((v) => v.frets === guideToneSelectedFrets);
    if (!selectedStillExists) {
      const nextFrets = current?.frets ?? null;
      if (nextFrets !== (guideToneSelectedFrets ?? null)) setGuideToneSelectedFrets(nextFrets);
    }

    if (current) lastGuideToneVoicingRef.current = current;
  }, [guideToneVoicingIdx, guideToneVoicings, guideToneVoicingsSig, guideToneSelectedFrets]);

  const activeGuideToneVoicing = guideToneVoicings[guideToneVoicingIdx] || guideToneVoicings[0] || null;

  const guideToneBassNote = useMemo(() => {
    if (activeGuideToneVoicing?.bassPc != null) {
      return spellNoteFromChordInterval(chordRootPc, mod12(activeGuideToneVoicing.bassPc - chordRootPc), chordPreferSharps);
    }
    const bassInterval = guideToneBassIntervalsForSelection(guideToneDef, guideToneInversion === "all" ? "root" : guideToneInversion)[0] ?? 0;
    return spellNoteFromChordInterval(chordRootPc, bassInterval, chordPreferSharps);
  }, [activeGuideToneVoicing, chordRootPc, chordPreferSharps, guideToneDef, guideToneInversion]);

  const chordIntervals = useMemo(
    () =>
      buildChordIntervals({
        quality: chordQuality,
        suspension: chordSuspension,
        structure: chordStructure,
        ext7: chordExt7,
        ext6: chordExt6,
        ext9: chordExt9,
        ext11: chordExt11,
        ext13: chordExt13,
      }),
    [chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]
  );
  const chordDegreeLabels = useMemo(
    () => buildChordDegreeLabelsFromUi({
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
      chordIntervals,
    }),
    [chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordIntervals]
  );
  const chordSpelledNotes = useMemo(
    () => spellChordNotes({ rootPc: chordRootPc, chordIntervals, preferSharps: chordPreferSharps }),
    [chordRootPc, chordIntervals, chordPreferSharps]
  );
  const chordPcToSpelledName = useCallback((pc) => {
    const interval = mod12(pc - chordRootPc);
    const idx = chordIntervals.findIndex((x) => mod12(x) === interval);
    return idx >= 0 ? chordSpelledNotes[idx] : pcToName(pc, chordPreferSharps);
  }, [chordRootPc, chordIntervals, chordSpelledNotes, chordPreferSharps]);

  const chordSuffix = useMemo(
    () =>
      chordSuffixFromUI({
        quality: chordQuality,
        suspension: chordSuspension,
        structure: chordStructure,
        ext7: chordExt7,
        ext6: chordExt6,
        ext9: chordExt9,
        ext11: chordExt11,
        ext13: chordExt13,
      }),
    [chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]
  );

  // Necesarios antes de filtrar voicings (evita TDZ)
  const chordThirdOffset = useMemo(() => chordThirdOffsetFromUI(chordQuality, chordSuspension), [chordQuality, chordSuspension]);
  const chordFifthOffset = useMemo(() => chordFifthOffsetFromUI(chordQuality, chordSuspension), [chordQuality, chordSuspension]);
  const chordEnginePlan = useMemo(
    () => buildChordEnginePlan({
      rootPc: chordRootPc,
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      inversion: chordInversion,
      form: chordForm,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
    }),
    [chordRootPc, chordQuality, chordSuspension, chordStructure, chordInversion, chordForm, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]
  );

  const chordBassInt = useMemo(
    () =>
      chordBassInterval({
        quality: chordQuality,
        suspension: chordSuspension,
        structure: chordStructure,
        inversion: normalizeChordFormToInversion(chordInversion),
        chordIntervals,
        ext7: chordExt7,
        ext6: chordExt6,
        ext9: chordExt9,
        ext11: chordExt11,
        ext13: chordExt13,
      }),
    [chordQuality, chordSuspension, chordStructure, chordInversion, chordIntervals, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]
  );
  const chordBassPc = useMemo(() => mod12(chordRootPc + chordBassInt), [chordRootPc, chordBassInt]);

  const _chordPcs = useMemo(() => new Set(chordIntervals.map((i) => mod12(chordRootPc + i))), [chordIntervals, chordRootPc]);

  // Carga de digitaciones tocables (voicings)
  // Solo se necesita JSON cuando la estructura es "Acorde" (voicings completos).
  useEffect(() => {
    if (!showBoards.chords) return;

    if (chordStructure !== "chord") {
      setChordDb(null);
      setChordDbError(null);
      setChordDbLastUrl(null);
      return;
    }

    // Para acordes tipo add6/add9/add11/add13 (sin 7ª) usamos el generador (4 notas) y evitamos ruido de JSON.
    const addOnly = isSingleAddChordSelection({
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
    });
    const multiAdd = isMultiAddChordSelection({
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
    });
    if (addOnly || multiAdd) {
      setChordDb(null);
      setChordDbError(null);
      setChordDbLastUrl(null);
      return;
    }

    const suffix = chordSuffix;
    if (!suffix) {
      setChordDb(null);
      setChordDbError("No hay digitaciones para esta combinación (p.ej. menor add9 sin 7).");
      return;
    }

    let alive = true;
    const keyName = chordDbKeyNameFromPc(chordRootPc);
    const urlRel = chordDbUrl(keyName, suffix);
    const urlLocal = chordDbUrlLocal(keyName, suffix);
    const urlLocalAbs = new URL(urlLocal, window.location.href).href;
    const urlFallbackAbs = `${PAGES_BASE}${urlRel}`;

    setChordDbLastUrl(urlLocalAbs);

    (async () => {
      try {
        setChordDbError(null);

        let res = await fetch(urlLocal, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (!alive) return;
          setChordDbLastUrl(urlLocalAbs);
          setChordDb(json);
          return;
        }

        const localStatus = res.status;
        res = await fetch(urlFallbackAbs, { cache: "no-store" });
        const fbStatus = res.status;
        if (!res.ok) throw new Error(`No pude cargar digitaciones: local ${urlLocalAbs} (${localStatus}) | fallback ${urlFallbackAbs} (${fbStatus})`);

        const json = await res.json();
        if (!alive) return;
        setChordDbLastUrl(urlFallbackAbs);
        setChordDb(json);
      } catch (e) {
        if (!alive) return;
        setChordDb(null);
        setChordDbError(String(e?.message || e));
      }
    })();

    return () => {
      alive = false;
    };
  }, [showBoards.chords, chordRootPc, chordSuffix, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]);

  // Si se cierra el panel, limpia el último URL mostrado
  useEffect(() => {
    if (!showBoards.chords) setChordDbLastUrl(null);
  }, [showBoards.chords]);

  // Pre-carga de JSON para Acordes (2) cuando algún slot está en modo "Acorde"
  useEffect(() => {
    if (!showBoards.nearChords) return;

    const needed = [];
    for (let i = 0; i < nearSlots.length; i++) {
      const s = nearSlots[i];
      if (!s?.enabled) continue;
      if (String(s.family || "tertian") !== "tertian") continue;
      if (s.structure !== "chord") continue;

      const addOnly = isSingleAddChordSelection({
        ext7: s.ext7,
        ext6: s.ext6,
        ext9: s.ext9,
        ext11: s.ext11,
        ext13: s.ext13,
      });
      const multiAdd = isMultiAddChordSelection({
        ext7: s.ext7,
        ext6: s.ext6,
        ext9: s.ext9,
        ext11: s.ext11,
        ext13: s.ext13,
      });
      if (addOnly || multiAdd) continue;

      const suffix = chordSuffixFromUI({
        quality: s.quality,
        suspension: s.suspension || "none",
        structure: s.structure,
        ext7: s.ext7,
        ext6: s.ext6,
        ext9: s.ext9,
        ext11: s.ext11,
        ext13: s.ext13,
      });

      if (!suffix) continue;
      const keyName = chordDbKeyNameFromPc(s.rootPc);
      const urlRel = chordDbUrl(keyName, suffix);
      const cacheKey = `${keyName}/${suffix}`;
      if (chordDbCache[cacheKey] || chordDbCacheErr[cacheKey]) continue;
      needed.push({ cacheKey, urlRel });
    }

    if (!needed.length) return;

    let alive = true;
    (async () => {
      for (const it of needed) {
        try {
          const urlLocal = publicRelToLocal(it.urlRel);
          const urlLocalAbs = new URL(urlLocal, window.location.href).href;
          const urlFallbackAbs = `${PAGES_BASE}${it.urlRel}`;

          let res = await fetch(urlLocal, { cache: "no-store" });
          if (!res.ok) {
            const stLocal = res.status;
            res = await fetch(urlFallbackAbs, { cache: "no-store" });
            if (!res.ok) throw new Error(`${urlLocalAbs} (${stLocal}) | ${urlFallbackAbs} (${res.status})`);
          }

          const json = await res.json();
          if (!alive) return;
          setChordDbCache((prev) => ({ ...prev, [it.cacheKey]: json }));
        } catch (e) {
          if (!alive) return;
          setChordDbCacheErr((prev) => ({ ...prev, [it.cacheKey]: String(e?.message || e) }));
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [showBoards.nearChords, nearSlots, chordDbCache, chordDbCacheErr]);

  // --------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS: VOICINGS DEL ACORDE PRINCIPAL
  // --------------------------------------------------------------------------

  const chordVoicings = useMemo(() => {
    const plan = chordEnginePlan;
    const inversionChoices = concreteInversionsForSelection(plan.inversion, plan.ui?.allowThirdInversion);
    const selectedBassIntervals = bassIntervalsForSelection(plan);
    const rootCandidates = symmetricRootCandidatesForPlan(plan);
    const finalizeMainVoicings = (list) => {
      const base = dedupeAndSortVoicings(list);
      if (!chordAllowOpenStrings) return base.filter((v) => !voicingHasOpenStrings(v));
      const allowedIntervals = new Set((plan.intervals || []).map(mod12));
      const requiredIntervals = new Set((plan.intervals || []).map(mod12));

      if (plan.structure === "chord") {
        return augmentVoicingsWithChordToneDuplicatesInWindow({
          voicings: base,
          rootPc: plan.rootPc,
          allowedIntervals,
          requiredIntervals,
          allowedBassIntervals: selectedBassIntervals,
          nearFrom: 0,
          nearTo: maxFret,
          maxFret,
          maxSpan: chordMaxDist,
        });
      }

      const exactNoteCount = allowedIntervals.size;
      if (exactNoteCount < 3 || exactNoteCount > 4) return base;

      return augmentExactVoicingsWithOpenSubstitutions({
        voicings: base,
        rootPc: plan.rootPc,
        allowedIntervals,
        requiredIntervals,
        allowedBassIntervals: selectedBassIntervals,
        nearFrom: 0,
        nearTo: maxFret,
        maxFret,
        maxSpan: chordMaxDist,
        exactNoteCount,
      });
    };

    if (plan.generator === "triad") {
      const tri = dedupeAndSortVoicings(rootCandidates.flatMap((rootCandidate) =>
        inversionChoices.flatMap((inv) =>
          filterVoicingsByForm(generateTriadVoicings({
            rootPc: rootCandidate,
            thirdOffset: plan.thirdOffset,
            fifthOffset: plan.fifthOffset,
            inversion: inv,
            maxFret,
            maxSpan: chordMaxDist,
          }), plan.form).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, rootCandidate))
        )
      ));
      const finalTri = finalizeMainVoicings(tri);
      return finalTri.slice(0, 60);
    }

    if (plan.generator === "drop") {
      if (plan.topVoiceOffset == null) return [];
      const tet = dedupeAndSortVoicings(rootCandidates.flatMap((rootCandidate) =>
        inversionChoices.flatMap((inv) =>
          generateDropTetradVoicings({
            rootPc: rootCandidate,
            thirdOffset: plan.thirdOffset,
            fifthOffset: plan.fifthOffset,
            seventhOffset: plan.topVoiceOffset,
            form: plan.form,
            inversion: inv,
            maxFret,
            maxSpan: chordMaxDist,
          }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, rootCandidate))
        )
      ));
      const finalTet = finalizeMainVoicings(tet);
      return finalTet.slice(0, 60);
    }

    if (plan.generator === "tetrad") {
      const tet = plan.form === "open"
        ? buildOpenSupersetTetradVoicings({
            rootCandidates,
            inversionChoices,
            plan,
            maxFret,
            maxSpan: chordMaxDist,
          })
        : (() => {
            const topVoiceOffset = plan.topVoiceOffset;
            if (topVoiceOffset == null) return [];
            return dedupeAndSortVoicings(rootCandidates.flatMap((rootCandidate) =>
              inversionChoices.flatMap((inv) =>
                filterVoicingsByForm(generateTetradVoicings({
                  rootPc: rootCandidate,
                  thirdOffset: plan.thirdOffset,
                  fifthOffset: plan.fifthOffset,
                  seventhOffset: topVoiceOffset,
                  inversion: inv,
                  maxFret,
                  maxSpan: chordMaxDist,
                }), plan.form).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, rootCandidate))
              )
            ));
          })();
      const finalTet = finalizeMainVoicings(tet);
      return finalTet.slice(0, 60);
    }

    if (plan.generator === "exact") {
      const multi = dedupeAndSortVoicings(selectedBassIntervals.flatMap((bassInterval) => generateExactIntervalChordVoicings({
        rootPc: plan.rootPc,
        intervals: plan.intervals,
        bassInterval,
        maxFret,
        maxSpan: chordMaxDist,
      }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, plan.rootPc))));
      const finalMulti = finalizeMainVoicings(multi);
      return finalMulti.slice(0, 60);
    }

    if (plan.generator === "json") {
      if (!chordDb?.positions?.length) return [];

      const allowed = new Set(plan.intervals.map(mod12));
      const required = new Set([mod12(plan.thirdOffset)]);
      const noTensions = !plan.ext7 && !plan.ext6 && !plan.ext9 && !plan.ext11 && !plan.ext13;

      if (noTensions) {
        required.add(0);
        required.add(mod12(plan.fifthOffset));
      } else {
        if (plan.ext7 && plan.seventhOffset != null) required.add(mod12(plan.seventhOffset));
        if (plan.ext6) required.add(9);
        if (plan.ext9) required.add(2);
        if (plan.ext11) required.add(5);
        if (plan.ext13) required.add(9);
      }

      const outStrict = [];
      const outLoose = [];
      const seen = new Set();

      for (const p of chordDb.positions || []) {
        const fretsLH = parseChordDbFretsString(p?.frets);
        if (!fretsLH) continue;
        const v = buildVoicingFromFretsLH({ fretsLH, rootPc: plan.rootPc, maxFret });
        if (!v || !isErgonomicVoicing(v, chordMaxDist)) continue;

        const extraOk = new Set([2, 5, 9, 10, 11]);
        let invalid = false;
        let extraCount = 0;
        for (const r of v.relIntervals) {
          if (!allowed.has(r)) {
            if (extraOk.has(r)) extraCount++;
            else {
              invalid = true;
              break;
            }
          }
        }
        if (invalid) continue;
        for (const r of required) {
          if (!v.relIntervals.has(r)) {
            invalid = true;
            break;
          }
        }
        if (invalid) continue;

        const bi = mod12(v.bassPc - plan.rootPc);
        const key = `${v.frets}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const item = { ...v, _extra: extraCount };
        if (selectedBassIntervals.includes(bi)) outStrict.push(item);
        else if (plan.inversion !== "all") outLoose.push(item);
      }

      const list = outStrict.length ? outStrict : outLoose;
      list.sort((a, b) => ((a._extra ?? 0) - (b._extra ?? 0)) || (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret));
      const finalJson = finalizeMainVoicings(list);
      return finalJson.slice(0, 60);
    }

    return [];
  }, [chordEnginePlan, chordDb, chordMaxDist, chordAllowOpenStrings, maxFret]);

  const chordVoicingsSig = useMemo(() => chordVoicings.map((v) => v.frets).join("|"), [chordVoicings]);

  useEffect(() => {
    if (!storageHydrated) return;
    if (!chordVoicings.length) {
      if (!pendingChordRestoreRef.current.active && chordVoicingIdx !== 0) setChordVoicingIdx(0);
      return;
    }

    if (pendingChordRestoreRef.current.active) {
      const wanted = pendingChordRestoreRef.current.frets;
      if (wanted == null) {
        pendingChordRestoreRef.current = { active: false, frets: null };
      } else {
        const restoredIdx = chordVoicings.findIndex((v) => v.frets === wanted);
        if (restoredIdx >= 0) {
          if (restoredIdx !== chordVoicingIdx) {
            skipChordVoicingRefSyncRef.current = true;
            setChordVoicingIdx(restoredIdx);
          }
          if (chordSelectedFrets !== wanted) setChordSelectedFrets(wanted);
          pendingChordRestoreRef.current = { active: false, frets: null };
          return;
        }
        return;
      }
    }

    const keepIdx = chordSelectedFrets ? chordVoicings.findIndex((v) => v.frets === chordSelectedFrets) : -1;
    if (keepIdx >= 0) {
      if (keepIdx !== chordVoicingIdx) {
        skipChordVoicingRefSyncRef.current = true;
        setChordVoicingIdx(keepIdx);
      }
      return;
    }

    const ref = lastChordVoicingRef.current;
    const idx = nearestVoicingIndex(ref, chordVoicings);
    const nextFrets = chordVoicings[idx]?.frets ?? null;
    if (idx !== chordVoicingIdx) {
      skipChordVoicingRefSyncRef.current = true;
      setChordVoicingIdx(idx);
    }
    if (nextFrets !== chordSelectedFrets) setChordSelectedFrets(nextFrets);
  }, [storageHydrated, chordVoicings, chordVoicingsSig, chordVoicingIdx, chordSelectedFrets]);

  useEffect(() => {
    if (!storageHydrated) return;
    const current = chordVoicings[chordVoicingIdx] || chordVoicings[0] || null;
    const selectedStillExists = !!chordSelectedFrets && chordVoicings.some((v) => v.frets === chordSelectedFrets);

    if (!pendingChordRestoreRef.current.active && !selectedStillExists) {
      const nextFrets = current?.frets ?? null;
      if (nextFrets !== (chordSelectedFrets ?? null)) setChordSelectedFrets(nextFrets);
    }

    if (skipChordVoicingRefSyncRef.current) {
      skipChordVoicingRefSyncRef.current = false;
      return;
    }
    if (current) lastChordVoicingRef.current = current;
  }, [storageHydrated, chordVoicingIdx, chordVoicings, chordVoicingsSig, chordSelectedFrets]);

  const activeChordVoicing = chordVoicings[chordVoicingIdx] || chordVoicings[0] || null;

  // --------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS: DETECCIÓN DE ACORDES EN MÁSTIL
  // --------------------------------------------------------------------------

  const chordDetectSelectedNotes = useMemo(() => {
    return chordDetectSelectedKeys
      .map((key) => {
        const [sStr, fStr] = String(key || "").split(":");
        const sIdx = parseInt(sStr, 10);
        const fret = parseInt(fStr, 10);
        if (!Number.isFinite(sIdx) || !Number.isFinite(fret)) return null;
        return {
          key,
          sIdx,
          fret,
          pc: mod12(STRINGS[sIdx].pc + fret),
          pitch: pitchAt(sIdx, fret),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.pitch - b.pitch);
  }, [chordDetectSelectedKeys]);

  const chordDetectCandidates = useMemo(
    () => detectChordReadingsPure(chordDetectSelectedNotes),
    [chordDetectSelectedNotes]
  );

  const chordDetectPlaybackNotes = useMemo(
    () => [...chordDetectSelectedNotes].sort((a, b) => b.sIdx - a.sIdx || a.fret - b.fret),
    [chordDetectSelectedNotes]
  );

  const chordDetectSelectionSignature = useMemo(
    () => [...chordDetectSelectedKeys].sort().join("|"),
    [chordDetectSelectedKeys]
  );

  const chordDetectSelectedCandidate = useMemo(
    () => chordDetectCandidates.find((c) => c.id === chordDetectCandidateId) || null,
    [chordDetectCandidates, chordDetectCandidateId]
  );

  useLayoutEffect(() => {
    if (chordDetectSelectedCandidate) {
      lastChordDetectCandidateRef.current = chordDetectSelectedCandidate;
      pendingChordDetectCandidateRef.current = null;
    }
  }, [chordDetectSelectedCandidate]);

  useEffect(() => {
    if (!chordDetectMode) setChordDetectClearMinHeight(null);
  }, [chordDetectMode]);

  useLayoutEffect(() => {
    if (chordDetectSelectedKeys.length) return;
    lastChordDetectCandidateRef.current = null;
    pendingChordDetectCandidateRef.current = null;
  }, [chordDetectSelectedKeys.length]);

  useLayoutEffect(() => {
    if (!chordDetectMode) return;
    const nextId = resolveDetectedCandidateFromContextPure({
      candidates: chordDetectCandidates,
      currentCandidateId: chordDetectCandidateId,
      pendingCandidate: pendingChordDetectCandidateRef.current,
      lastCandidate: lastChordDetectCandidateRef.current,
      prioritizeContext: chordDetectPrioritizeContext,
    })?.id || null;
    if (!chordDetectCandidates.length) {
      if (chordDetectCandidateId !== null) setChordDetectCandidateId(null);
      return;
    }
    if ((chordDetectCandidateId || null) !== nextId) {
      setChordDetectCandidateId(nextId);
    }
    if (pendingChordDetectCandidateRef.current && nextId) {
      pendingChordDetectCandidateRef.current = null;
    }
  }, [chordDetectMode, chordDetectSelectionSignature, chordDetectCandidates, chordDetectCandidateId, chordDetectPrioritizeContext]);

  // --------------------------------------------------------------------------
  // HELPERS LOCALES: DETECCIÓN DE ACORDES (audio y selección)
  // --------------------------------------------------------------------------

  function fnMidiToFreq(vMidi) {
    return 440 * Math.pow(2, (Number(vMidi) - 69) / 12);
  }

  async function fnGetChordDetectAudioCtx() {
    if (typeof window === "undefined") return null;
    const vAudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!vAudioCtor) return null;

    let vCtx = chordDetectAudioCtxRef.current;
    if (!vCtx) {
      vCtx = new vAudioCtor();
      chordDetectAudioCtxRef.current = vCtx;
    }

    if (vCtx.state === "suspended") {
      try {
        await vCtx.resume();
      } catch {
        // El gesto de usuario puede no habilitar audio en todos los navegadores.
      }
    }

    return vCtx;
  }

  function fnScheduleChordDetectMidi(vCtx, vMidi, vStartTime, vDuration = 1.2) {
    const vOsc = vCtx.createOscillator();
    const vGain = vCtx.createGain();

    vOsc.type = "triangle";
    vOsc.frequency.setValueAtTime(fnMidiToFreq(vMidi), vStartTime);

    vGain.gain.setValueAtTime(0.0001, vStartTime);
    vGain.gain.exponentialRampToValueAtTime(0.16, vStartTime + 0.02);
    vGain.gain.exponentialRampToValueAtTime(0.08, vStartTime + 0.18);
    vGain.gain.exponentialRampToValueAtTime(0.045, vStartTime + 0.6);
    vGain.gain.exponentialRampToValueAtTime(0.0001, vStartTime + Math.max(0.75, vDuration - 0.05));

    vOsc.connect(vGain);
    vGain.connect(vCtx.destination);

    vOsc.start(vStartTime);
    vOsc.stop(vStartTime + vDuration);
    vOsc.onended = () => {
      try { vOsc.disconnect(); } catch {
        // El nodo puede estar ya desconectado.
      }
      try { vGain.disconnect(); } catch {
        // El nodo puede estar ya desconectado.
      }
    };
  }

  async function fnPlayChordDetectNote(sIdx, fret) {
    const vCtx = await fnGetChordDetectAudioCtx();
    if (!vCtx) return;
    fnScheduleChordDetectMidi(vCtx, pitchAt(sIdx, fret), vCtx.currentTime, 1.2);
  }

  function clearChordDetectViewportStabilizers() {
    if (typeof window === "undefined") return;
    chordDetectViewportFramesRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId));
    chordDetectViewportFramesRef.current = [];
    chordDetectViewportTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    chordDetectViewportTimersRef.current = [];
  }

  function focusChordDetectPanelWithoutScroll() {
    if (typeof document === "undefined") return;
    const panel = chordDetectPanelRef.current;
    if (panel instanceof HTMLElement && typeof panel.focus === "function") {
      try {
        panel.focus({ preventScroll: true });
        return;
      } catch {
        // Older browsers may not support the preventScroll option.
      }
      try {
        panel.focus();
        return;
      } catch {
        // If focus fails, blur the active control below.
      }
    }
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function preserveChordDetectViewportScroll({ blurActive = false, focusPanel = false } = {}) {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (focusPanel) {
      focusChordDetectPanelWithoutScroll();
    } else if (blurActive && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    clearChordDetectViewportStabilizers();

    const restore = () => {
      const currentX = window.scrollX || document.documentElement.scrollLeft || 0;
      const currentY = window.scrollY || document.documentElement.scrollTop || 0;
      if (Math.abs(currentX - scrollX) > 1 || Math.abs(currentY - scrollY) > 1) {
        window.scrollTo(scrollX, scrollY);
      }
    };

    const restoreFrames = (remaining) => {
      const frameId = window.requestAnimationFrame(() => {
        chordDetectViewportFramesRef.current = chordDetectViewportFramesRef.current.filter((id) => id !== frameId);
        restore();
        if (remaining > 1) restoreFrames(remaining - 1);
      });
      chordDetectViewportFramesRef.current.push(frameId);
    };

    [0, 60, 140, 320, 700].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        restore();
        chordDetectViewportTimersRef.current = chordDetectViewportTimersRef.current.filter((id) => id !== timerId);
      }, delay);
      chordDetectViewportTimersRef.current.push(timerId);
    });

    restore();
    restoreFrames(12);
  }

  function clearChordDetectPlaybackVisuals() {
    chordDetectPlaybackTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    chordDetectPlaybackTimersRef.current = [];
    setChordDetectPlayingKeys([]);
  }

  async function fnPlayChordDetectSelection() {
    if (!chordDetectPlaybackNotes.length) return;
    const vCtx = await fnGetChordDetectAudioCtx();
    if (!vCtx) return;

    const vNotes = chordDetectPlaybackNotes;
    const vStep = 0.14;
    const vDuration = 0.5;
    const vNow = vCtx.currentTime;

    clearChordDetectPlaybackVisuals();

    vNotes.forEach((vNote, vIdx) => {
      fnScheduleChordDetectMidi(vCtx, vNote.pitch, vNow + (vIdx * vStep), vDuration);
      const timerId = window.setTimeout(() => {
        setChordDetectPlayingKeys([vNote.key]);
      }, Math.max(0, Math.round(vIdx * vStep * 1000)));
      chordDetectPlaybackTimersRef.current.push(timerId);
    });

    const clearTimerId = window.setTimeout(() => {
      setChordDetectPlayingKeys([]);
      chordDetectPlaybackTimersRef.current = [];
    }, Math.max(0, Math.round(((vNotes.length - 1) * vStep * 1000) + (vDuration * 1000))));
    chordDetectPlaybackTimersRef.current.push(clearTimerId);
  }

  async function fnPlayChordDetectVoicingTogether() {
    if (!chordDetectPlaybackNotes.length) return;
    const vCtx = await fnGetChordDetectAudioCtx();
    if (!vCtx) return;

    const vNotes = chordDetectPlaybackNotes;
    const vDuration = 1.25;
    const vNow = vCtx.currentTime;

    clearChordDetectPlaybackVisuals();
    vNotes.forEach((vNote) => {
      fnScheduleChordDetectMidi(vCtx, vNote.pitch, vNow, vDuration);
    });
    setChordDetectPlayingKeys(vNotes.map((vNote) => vNote.key));

    const clearTimerId = window.setTimeout(() => {
      setChordDetectPlayingKeys([]);
      chordDetectPlaybackTimersRef.current = [];
    }, Math.max(0, Math.round(vDuration * 1000)));
    chordDetectPlaybackTimersRef.current.push(clearTimerId);
  }

  useEffect(() => {
    return () => {
      clearChordDetectPlaybackVisuals();
      const vCtx = chordDetectAudioCtxRef.current;
      if (vCtx && typeof vCtx.close === "function") {
        vCtx.close().catch(() => {});
      }
      chordDetectAudioCtxRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chordDetectPlayingKeys.some((key) => !chordDetectSelectedKeys.includes(key))) {
      clearChordDetectPlaybackVisuals();
    }
  }, [chordDetectPlayingKeys, chordDetectSelectedKeys]);

  useEffect(() => () => {
    clearChordDetectViewportStabilizers();
  }, []);

  function clearChordDetectSelection(e = null) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!chordDetectSelectedKeys.length) return;
    const areaHeight = chordDetectInvestigationAreaRef.current?.getBoundingClientRect?.().height ?? null;
    if (Number.isFinite(areaHeight) && areaHeight > 0) {
      setChordDetectClearMinHeight(Math.ceil(areaHeight));
    }
    preserveChordDetectViewportScroll({ focusPanel: true });
    clearChordDetectPlaybackVisuals();
    pendingChordDetectCandidateRef.current = null;
    setChordDetectSelectedKeys([]);
    setChordDetectCandidateId(null);
    lastChordDetectCandidateRef.current = null;
  }

  function selectDetectedCandidate(candidate) {
    lastChordDetectCandidateRef.current = candidate || null;
    pendingChordDetectCandidateRef.current = candidate || null;
    setChordDetectCandidateId(candidate?.id || null);
  }

  function updateChordDetectPrioritizeContext(value) {
    setChordDetectPrioritizeContext(!!value);
    setChordDetectPrioritizeContextTouched(true);
  }

  function applyDetectedCandidate(candidate) {
    if (!candidate) return;
    setChordDetectCandidateId(candidate.id);
    if (!candidate.uiPatch) return;
    setStudyTarget("main");

    const p = candidate.uiPatch;
    const detectedInversion = deriveDetectedCandidateCopyInversion(candidate);
    const manualCopiedVoicing = buildManualSelectionVoicing(chordDetectSelectedNotes, p.rootPc, maxFret);
    const wantedFrets = manualCopiedVoicing?.frets || null;
    const requiredMaxDist = manualCopiedVoicing?.reach ? clampChordMaxDistForReach(manualCopiedVoicing.reach) : null;

    if (p.family === "quartal") {
      setChordFamily("quartal");
      setChordRootPc(p.rootPc);
      setChordSpellPreferSharps(!!p.spellPreferSharps);
      setChordQuartalType(p.quartalType || "pure");
      setChordQuartalVoices(p.quartalVoices || "4");
      setChordQuartalSpread(p.quartalSpread || "closed");
      setChordQuartalReference(p.quartalReference || "root");
      setChordQuartalSelectedFrets(null);
      setChordQuartalVoicingIdx(0);
      return;
    }

    setChordFamily("tertian");
    setChordRootPc(p.rootPc);
    setChordSpellPreferSharps(!!p.spellPreferSharps);
    setChordQuality(p.quality);
    setChordSuspension(p.suspension || "none");
    setChordStructure(p.structure);
    setChordInversion(detectedInversion || p.inversion || "root");
    setChordPositionForm(p.positionForm || "open");
    setChordForm(p.form || p.positionForm || "open");
    setChordExt7(!!p.ext7);
    setChordExt6(!!p.ext6);
    setChordExt9(!!p.ext9);
    setChordExt11(!!p.ext11);
    setChordExt13(!!p.ext13);
    if (requiredMaxDist != null && requiredMaxDist !== chordMaxDist) {
      setChordMaxDist(requiredMaxDist);
    }
    pendingChordRestoreRef.current = { active: true, frets: wantedFrets };
    setChordSelectedFrets(wantedFrets);
    setChordVoicingIdx(0);
  }

  function toggleChordDetectCell(sIdx, fret) {
    if (chordDetectClickAudio) fnPlayChordDetectNote(sIdx, fret);
    pendingChordDetectCandidateRef.current = chordDetectSelectedCandidate || lastChordDetectCandidateRef.current || null;
    const areaHeight = chordDetectInvestigationAreaRef.current?.getBoundingClientRect?.().height ?? null;
    if (Number.isFinite(areaHeight) && areaHeight > 0) {
      setChordDetectClearMinHeight(Math.ceil(areaHeight));
    }
    preserveChordDetectViewportScroll();
    const key = `${sIdx}:${fret}`;
    setChordDetectSelectedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      const withoutSameString = prev.filter((x) => !String(x).startsWith(`${sIdx}:`));
      const next = [...withoutSameString, key];
      const fretted = next
        .map((item) => {
          const [, fretStr] = String(item || "").split(":");
          const parsed = parseInt(fretStr, 10);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        })
        .filter((value) => value != null);
      if (fretted.length) {
        const minFret = Math.min(...fretted);
        const maxFretSel = Math.max(...fretted);
        if ((maxFretSel - minFret + 1) > MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE) {
          setConfigNotice({ type: "info", text: "La selección manual no puede superar 6 trastes sin contar cuerdas al aire." });
          return prev;
        }
      }
      return next;
    });
  }

  const chordDetectSelectedNotesText = useMemo(
    () => chordDetectSelectedNotes
      .map((n) => buildDetectedCandidateNoteNameForPc(n.pc, chordDetectSelectedCandidate, chordPreferSharps))
      .join(", "),
    [chordDetectSelectedNotes, chordDetectSelectedCandidate, chordPreferSharps]
  );

  const chordDetectStaffEvents = useMemo(
    () => chordDetectSelectedNotes.length
      ? [{
          notes: [...chordDetectSelectedNotes].sort((a, b) => a.pitch - b.pitch).map((n) => n.pitch),
          spelledNotes: [...chordDetectSelectedNotes]
            .sort((a, b) => a.pitch - b.pitch)
            .map((n) => buildDetectedCandidateNoteNameForPc(n.pc, chordDetectSelectedCandidate, chordPreferSharps)),
        }]
      : [],
    [chordDetectSelectedNotes, chordDetectSelectedCandidate, chordPreferSharps]
  );

  const chordDetectSelectionPositionsText = useMemo(
    () => {
      if (!chordDetectSelectedNotes.length) return "";
      const positions = [...chordDetectSelectedNotes]
        .sort((a, b) => a.pitch - b.pitch)
        .map((n) => `${n.sIdx + 1}ª/${n.fret}`)
        .join(" · ");
      const manualVoicing = buildManualSelectionVoicing(chordDetectSelectedNotes, chordDetectSelectedCandidate?.rootPc ?? chordRootPc, maxFret);
      return manualVoicing?.frets ? `${positions} · ${manualVoicing.frets}` : positions;
    },
    [chordDetectSelectedNotes, chordDetectSelectedCandidate, chordRootPc, maxFret]
  );

  const _chordDetectSelectedCandidateNotesText = useMemo(() => {
    if (!chordDetectSelectedCandidate) return "";
    const coreNotes = Array.isArray(chordDetectSelectedCandidate.visibleNotes)
      ? chordDetectSelectedCandidate.visibleNotes.filter(Boolean)
      : [];
    const noteText = Array.from(new Set(coreNotes)).join(", ");
    if (chordDetectSelectedCandidate.externalBassInterval == null) return noteText;

    const bassName = spellNoteFromChordInterval(
      chordDetectSelectedCandidate.rootPc,
      chordDetectSelectedCandidate.externalBassInterval,
      chordDetectSelectedCandidate.preferSharps ?? chordPreferSharps
    );

    return noteText ? `${noteText} · bajo en ${bassName}` : `bajo en ${bassName}`;
  }, [chordDetectSelectedCandidate, chordPreferSharps]);

  const chordDetectSelectedCandidateScaleNotesText = useMemo(() => {
    if (!chordDetectSelectedCandidate) return "";
    return spellScaleNotes({
      rootPc: chordDetectSelectedCandidate.rootPc,
      scaleIntervals,
      preferSharps: chordDetectSelectedCandidate.preferSharps ?? chordPreferSharps,
    }).join(", ");
  }, [chordDetectSelectedCandidate, scaleIntervals, chordPreferSharps]);

  const chordDetectSelectedCandidateBadgeItems = useMemo(() => {
    return buildDetectedCandidateBadgeItemsPure(chordDetectSelectedCandidate, chordPreferSharps);
  }, [chordDetectSelectedCandidate, chordPreferSharps]);

  const chordDetectSelectedCandidateBassNote = useMemo(() => {
    if (!chordDetectSelectedCandidate) return null;
    const prefer = chordDetectSelectedCandidate.preferSharps ?? chordPreferSharps;
    const bassInterval = chordDetectSelectedCandidate.externalBassInterval != null
      ? chordDetectSelectedCandidate.externalBassInterval
      : mod12(chordDetectSelectedCandidate.bassPc - chordDetectSelectedCandidate.rootPc);

    return spellNoteFromChordInterval(chordDetectSelectedCandidate.rootPc, bassInterval, prefer);
  }, [chordDetectSelectedCandidate, chordPreferSharps]);

  const chordBaseDisplayName = chordDisplayNameFromUI({
        rootPc: chordRootPc,
        preferSharps: chordPreferSharps,
        quality: chordQuality,
        suspension: chordSuspension,
        structure: chordStructure,
        ext7: chordExt7,
        ext6: chordExt6,
        ext9: chordExt9,
        ext11: chordExt11,
        ext13: chordExt13,
      });

  const chordSectionDisplayName = buildChordHeaderSummary({
    name: chordBaseDisplayName,
    plan: chordEnginePlan,
    voicing: activeChordVoicing,
    positionForm: chordPositionForm,
  });

  const guideToneSectionDisplayName = useMemo(() => {
    const inversionLabel = CHORD_GUIDE_TONE_INVERSIONS.find((x) => x.value === guideToneInversion)?.label || "Todas";
    const formLabel = CHORD_GUIDE_TONE_FORMS.find((x) => x.value === guideToneForm)?.label || "Cerrado";
    return `${guideToneDisplayName} · Notas guía · ${formLabel} · ${inversionLabel}`;
  }, [guideToneDisplayName, guideToneForm, guideToneInversion]);
  const chordControlsTitle = chordFamily === "quartal"
    ? `Acorde ${chordQuartalDisplayName}${chordQuartalDegreeText ? ` · ${chordQuartalDegreeText}` : ""}`
    : chordFamily === "guide_tones"
      ? `Acorde ${guideToneSectionDisplayName}`
      : `Acorde ${chordSectionDisplayName}`;

  const chordHeaderBadgeItems = useMemo(
    () => buildChordBadgeItems({
      notes: chordSpelledNotes,
      intervals: chordIntervals,
      degreeLabels: chordDegreeLabels,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
      structure: chordStructure,
    }),
    [chordSpelledNotes, chordIntervals, chordDegreeLabels, chordExt6, chordExt9, chordExt11, chordExt13, chordStructure]
  );

  const chordHeaderBassNote = useMemo(() => {
    const bassPc = activeChordVoicing?.bassPc ?? chordBassPc;
    return chordPcToSpelledName(bassPc);
  }, [activeChordVoicing, chordBassPc, chordPcToSpelledName]);

  const chordDetectSelectedFrettedRange = useMemo(() => {
    const fretted = chordDetectSelectedNotes
      .map((n) => Number(n?.fret))
      .filter((fret) => Number.isFinite(fret) && fret > 0);
    if (!fretted.length) return null;
    return {
      min: Math.min(...fretted),
      max: Math.max(...fretted),
    };
  }, [chordDetectSelectedNotes]);

  const chordDetectWindowStartMax = useMemo(
    () => Math.max(1, maxFret - (MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE - 1)),
    [maxFret]
  );

  const chordDetectWindowStartMin = useMemo(
    () => chordDetectSelectedFrettedRange
      ? Math.max(1, chordDetectSelectedFrettedRange.max - (MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE - 1))
      : 1,
    [chordDetectSelectedFrettedRange]
  );

  const chordDetectWindowAllowedStartMax = useMemo(
    () => chordDetectSelectedFrettedRange
      ? Math.max(
          chordDetectWindowStartMin,
          Math.min(chordDetectWindowStartMax, chordDetectSelectedFrettedRange.min)
        )
      : chordDetectWindowStartMax,
    [chordDetectSelectedFrettedRange, chordDetectWindowStartMax, chordDetectWindowStartMin]
  );

  const chordDetectWindowFrom = useMemo(
    () => Math.max(
      chordDetectWindowStartMin,
      Math.min(chordDetectWindowAllowedStartMax, Math.floor(Number(chordDetectWindowStart) || 1))
    ),
    [chordDetectWindowStart, chordDetectWindowAllowedStartMax, chordDetectWindowStartMin]
  );

  const chordDetectWindowTo = useMemo(
    () => Math.max(chordDetectWindowFrom, Math.min(maxFret, chordDetectWindowFrom + MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE - 1)),
    [chordDetectWindowFrom, maxFret]
  );

  const chordDetectVisibleFrets = useMemo(
    () => normalizeVisibleFrets(
      [0, ...Array.from({ length: Math.max(0, chordDetectWindowTo - chordDetectWindowFrom + 1) }, (_, idx) => chordDetectWindowFrom + idx)],
      maxFret
    ),
    [chordDetectWindowFrom, chordDetectWindowTo, maxFret]
  );

  useEffect(() => {
    setChordDetectWindowStart((start) => {
      const safeStart = Math.floor(Number(start) || 1);
      return Math.max(chordDetectWindowStartMin, Math.min(chordDetectWindowAllowedStartMax, safeStart));
    });
  }, [chordDetectWindowAllowedStartMax, chordDetectWindowStartMin]);

  const nearFrom = useMemo(
    () => Math.max(0, Math.min(maxFret, Math.floor(Number(nearWindowStart) || 0))),
    [nearWindowStart, maxFret]
  );

  const nearTo = useMemo(() => {
    const size = Math.max(1, Math.floor(Number(nearWindowSize) || 1));
    return Math.max(nearFrom, Math.min(maxFret, nearFrom + size - 1));
  }, [nearFrom, nearWindowSize, maxFret]);

  const nearStartMax = useMemo(
    () => Math.max(0, maxFret - (Math.max(1, Math.floor(Number(nearWindowSize) || 1)) - 1)),
    [nearWindowSize, maxFret]
  );

  function updateNearSlot(idx, patch) {
    setNearSlots((prev) => prev.map((slot, i) => {
      if (i !== idx) return slot;
      const next = { ...slot, ...patch };
      if (Object.prototype.hasOwnProperty.call(patch || {}, "form") && !isDropForm(next.form)) {
        next.positionForm = next.form;
      }
      return next;
    }));
  }

  function buildEmptyNearSlot(rootPcValue = chordRootPc, spellPreferSharpsValue = chordSpellPreferSharps) {
    return {
      enabled: false,
      family: "tertian",
      rootPc: rootPcValue,
      quality: "maj",
      suspension: "none",
      structure: "triad",
      inversion: "all",
      form: "open",
      positionForm: "open",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
      quartalType: "pure",
      quartalVoices: "4",
      quartalSpread: "closed",
      quartalReference: "root",
      quartalScaleName: "Mayor",
      guideToneQuality: "maj7",
      guideToneForm: "closed",
      guideToneInversion: "all",
      spellPreferSharps: spellPreferSharpsValue,
      maxDist: 4,
      allowOpenStrings: false,
      selFrets: null,
    };
  }

  function applyStandardChordSetToNearChords(standard, label, symbols) {
    const title = standard?.title || "el standard";
    const cleanSymbols = Array.isArray(symbols) ? symbols.filter(Boolean) : [];
    const loadedSymbols = cleanSymbols.slice(0, 4);
    const truncated = cleanSymbols.length > loadedSymbols.length;

    if (!cleanSymbols.length) {
      setStandardsNotice({ type: "error", text: `No encuentro acordes para cargar desde ${title}.` });
      return;
    }

    try {
      const parsedSlots = buildNearSlotsFromChordSymbols(loadedSymbols, 4);
      pendingNearRestoreRef.current = Array.from({ length: 4 }, () => ({ active: true, frets: null }));
      setNearAutoScaleSync(false);
      setNearSlots((prev) => prev.map((slot, idx) => {
        if (idx < parsedSlots.length) {
          return sanitizeNearSlotValue(
            {
              ...buildEmptyNearSlot(parsedSlots[idx].rootPc, parsedSlots[idx].spellPreferSharps),
              ...parsedSlots[idx],
              enabled: true,
              selFrets: null,
            },
            slot
          );
        }
        return sanitizeNearSlotValue(buildEmptyNearSlot(rootPc, preferSharps), slot);
      }));
      setStandardsNotice({
        type: "success",
        text: `${title} · ${label}: cargado en Acordes cercanos. Auto escala se ha desactivado para respetar la armonía del standard.${truncated ? " Solo se han cargado los 4 primeros cambios porque Acordes cercanos admite 4." : ""}`,
      });
    } catch (e) {
      setStandardsNotice({ type: "error", text: `No pude cargar ${label}: ${String(e?.message || e)}` });
    }
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
    applyStandardChordSetToNearChords(
      selectedStandard,
      "selección del chart real",
      selectedStandardRealSelection.map((event) => event.loadSymbol || event.symbol)
    );
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

  function selectStandardItem(standardId, { closeMobileCatalog = false } = {}) {
    if (!standardId) return;
    setSelectedStandardId(standardId);
    setStandardsRealSelectionIds([]);
    setStandardsNotice(null);
    if (closeMobileCatalog) setMobileStandardsCatalogOpen(false);
  }

  const nearSlotFamilyOf = useCallback((slot) => {
    return sanitizeOneOf(String(slot?.family || "tertian"), CHORD_FAMILIES.map((item) => item.value), "tertian");
  }, []);

  const buildNearSlotQuartalPitchSets = useCallback((slot) => {
    return fnBuildQuartalPitchSets({
      rootPc: mod12(slot?.rootPc || 0),
      voices: slot?.quartalVoices || "4",
      type: slot?.quartalType || "pure",
      reference: slot?.quartalReference || "root",
      scaleName: slot?.quartalScaleName || "Mayor",
    });
  }, []);

  const buildNearSlotNoteMeta = useCallback((slot, voicing = null) => {
    const family = nearSlotFamilyOf(slot);

    if (family === "quartal") {
      const pitchSets = buildNearSlotQuartalPitchSets(slot);
      const orderedPcs = Array.isArray(voicing?.quartalOrderedPcs) && voicing.quartalOrderedPcs.length
        ? voicing.quartalOrderedPcs
        : (Array.isArray(pitchSets?.[0]?.pcs) ? pitchSets[0].pcs : []);
      const rootPc = orderedPcs.length ? mod12(orderedPcs[0]) : mod12(slot?.rootPc || 0);
      const preferSharps = slot?.spellPreferSharps ?? preferSharpsFromMajorTonicPc(rootPc);
      const intervals = orderedPcs.map((pc) => mod12(pc - rootPc));
      const degreeLabels = intervals.map((interval) => intervalToSimpleChordDegreeToken(interval));
      const notes = intervals.map((interval) => spellNoteFromChordInterval(rootPc, interval, preferSharps));
      return { family, rootPc, preferSharps, intervals, degreeLabels, notes };
    }

    if (family === "guide_tones") {
      const rootPc = mod12(slot?.rootPc || 0);
      const preferSharps = slot?.spellPreferSharps ?? preferSharpsFromMajorTonicPc(rootPc);
      const definition = guideToneDefinitionFromQuality(slot?.guideToneQuality || "maj7");
      const intervals = definition.intervals.map(mod12);
      const degreeLabels = [...definition.degreeLabels];
      const notes = intervals.map((interval) => spellNoteFromChordInterval(rootPc, interval, preferSharps));
      return { family, rootPc, preferSharps, intervals, degreeLabels, notes, definition };
    }

    const rootPc = mod12(slot?.rootPc || 0);
    const preferSharps = slot?.spellPreferSharps ?? preferSharpsFromMajorTonicPc(rootPc);
    const intervals = buildChordIntervals({
      quality: slot?.quality,
      suspension: slot?.suspension || "none",
      structure: slot?.structure,
      ext7: !!slot?.ext7,
      ext6: !!slot?.ext6,
      ext9: !!slot?.ext9,
      ext11: !!slot?.ext11,
      ext13: !!slot?.ext13,
    });
    const degreeLabels = intervals.map((interval) => intervalToChordToken(interval, {
      ext6: !!slot?.ext6,
      ext9: !!slot?.ext9 && slot?.structure !== "triad",
      ext11: !!slot?.ext11 && slot?.structure !== "triad",
      ext13: !!slot?.ext13 && slot?.structure !== "triad",
    }));
    const notes = spellChordNotes({ rootPc, chordIntervals: intervals, preferSharps });
    return { family, rootPc, preferSharps, intervals, degreeLabels, notes };
  }, [buildNearSlotQuartalPitchSets, nearSlotFamilyOf]);

  const buildNearSlotStudyEntry = useCallback((slot, plan, voicing, idx) => {
    if (!slot) return null;

    const family = nearSlotFamilyOf(slot);
    const noteMeta = buildNearSlotNoteMeta(slot, voicing);

    if (family === "quartal") {
      const typeLabel = CHORD_QUARTAL_TYPES.find((item) => item.value === (slot?.quartalType || "pure"))?.label || "Cuartal puro";
      const degreeText = slot?.quartalReference === "scale" ? fnBuildQuartalDegreeLabel(voicing?.quartalDegree) : "";
      const chordName = `${pcToName(noteMeta.rootPc, noteMeta.preferSharps)} ${typeLabel}${degreeText ? ` · ${degreeText}` : ""}`;
      const quartalVoicing = voicing
        ? {
            ...voicing,
            relIntervals: new Set((voicing.notes || []).map((n) => mod12(n.pc - noteMeta.rootPc))),
          }
        : null;
      const quartalPlan = {
        rootPc: noteMeta.rootPc,
        intervals: noteMeta.intervals,
        bassInterval: quartalVoicing?.bassPc != null ? mod12(quartalVoicing.bassPc - noteMeta.rootPc) : (noteMeta.intervals[0] ?? 0),
        thirdOffset: noteMeta.intervals[1] ?? 0,
        fifthOffset: noteMeta.intervals[2] ?? noteMeta.intervals[1] ?? 0,
        topVoiceOffset: noteMeta.intervals.length > 3 ? noteMeta.intervals[3] : null,
        form: slot?.quartalSpread || "closed",
        layer: "quartal",
        generator: "quartal",
        quartalType: slot?.quartalType || "pure",
        quartalReference: slot?.quartalReference || "root",
        quartalScaleName: slot?.quartalScaleName || "Mayor",
        quartalTonicPc: mod12(slot?.rootPc || 0),
        quartalSteps: Array.isArray(voicing?.quartalSteps) ? [...voicing.quartalSteps] : [],
        quartalDegree: typeof voicing?.quartalDegree === "number" ? voicing.quartalDegree : null,
        ui: { usesManualForm: true, allowThirdInversion: noteMeta.intervals.length > 3, dropEligible: false },
      };
      const spreadLabel = CHORD_QUARTAL_SPREADS.find((item) => item.value === (slot?.quartalSpread || "closed"))?.label || "Cerrado";
      const inversionLabel = quartalVoicing ? actualInversionLabelFromVoicing(quartalPlan, quartalVoicing) : "Según voicing";
      return {
        rootPc: noteMeta.rootPc,
        preferSharps: noteMeta.preferSharps,
        title: `Acorde cercano ${idx + 1}`,
        chordName,
        notes: noteMeta.notes,
        intervals: noteMeta.degreeLabels,
        plan: quartalPlan,
        voicing: quartalVoicing,
        positionForm: slot?.quartalSpread || "closed",
        bassName: quartalVoicing?.bassPc != null ? spellNoteFromChordInterval(noteMeta.rootPc, mod12(quartalVoicing.bassPc - noteMeta.rootPc), noteMeta.preferSharps) : "—",
        inversionLabel,
        summary: `${chordName} - ${spreadLabel} - ${inversionLabel}`,
      };
    }

    if (family === "guide_tones") {
      const definition = noteMeta.definition || guideToneDefinitionFromQuality(slot?.guideToneQuality || "maj7");
      const guidePlan = {
        rootPc: noteMeta.rootPc,
        intervals: noteMeta.intervals,
        bassInterval: voicing?.bassPc != null
          ? mod12(voicing.bassPc - noteMeta.rootPc)
          : (guideToneBassIntervalsForSelection(definition, slot?.guideToneInversion || "all")[0] ?? 0),
        thirdOffset: noteMeta.intervals[1] ?? 0,
        fifthOffset: noteMeta.intervals[2] ?? noteMeta.intervals[1] ?? 0,
        topVoiceOffset: null,
        form: slot?.guideToneForm || "closed",
        layer: "guide_tones",
        generator: "exact",
        guideToneQuality: slot?.guideToneQuality || "maj7",
        ui: { usesManualForm: true, allowThirdInversion: false, dropEligible: false },
      };
      const chordName = `${pcToName(noteMeta.rootPc, noteMeta.preferSharps)}${definition.suffix} · Notas guía`;
      const formLabel = CHORD_GUIDE_TONE_FORMS.find((item) => item.value === (slot?.guideToneForm || "closed"))?.label || "Cerrado";
      const inversionLabel = voicing
        ? actualInversionLabelFromVoicing(guidePlan, voicing)
        : (CHORD_GUIDE_TONE_INVERSIONS.find((item) => item.value === (slot?.guideToneInversion || "all"))?.label || "Fundamental");
      const bassName = voicing?.bassPc != null
        ? spellNoteFromChordInterval(noteMeta.rootPc, mod12(voicing.bassPc - noteMeta.rootPc), noteMeta.preferSharps)
        : spellNoteFromChordInterval(noteMeta.rootPc, guideToneBassIntervalsForSelection(definition, slot?.guideToneInversion || "all")[0] ?? 0, noteMeta.preferSharps);
      return {
        rootPc: noteMeta.rootPc,
        preferSharps: noteMeta.preferSharps,
        title: `Acorde cercano ${idx + 1}`,
        chordName,
        notes: noteMeta.notes,
        intervals: [...noteMeta.degreeLabels],
        plan: guidePlan,
        voicing,
        positionForm: slot?.guideToneForm || "closed",
        bassName,
        inversionLabel,
        summary: `${chordName} - ${formLabel} - ${inversionLabel}`,
      };
    }

    const chordName = chordDisplayNameFromUI({
      rootPc: noteMeta.rootPc,
      preferSharps: noteMeta.preferSharps,
      quality: slot?.quality,
      suspension: slot?.suspension || "none",
      structure: slot?.structure,
      ext7: slot?.ext7,
      ext6: slot?.ext6,
      ext9: slot?.ext9,
      ext11: slot?.ext11,
      ext13: slot?.ext13,
    });

    return {
      rootPc: noteMeta.rootPc,
      preferSharps: noteMeta.preferSharps,
      title: `Acorde cercano ${idx + 1}`,
      chordName,
      notes: noteMeta.notes,
      intervals: noteMeta.degreeLabels,
      plan,
      voicing,
      positionForm: slot?.positionForm || positionFormFromEffectiveForm(slot?.form, "closed"),
      bassName: voicing ? pcToName(voicing.bassPc, noteMeta.preferSharps) : pcToName(mod12(noteMeta.rootPc + (plan?.bassInterval || 0)), noteMeta.preferSharps),
      inversionLabel: CHORD_INVERSIONS.find((item) => item.value === (slot?.inversion || "root"))?.label || "Fundamental",
        summary: buildChordHeaderSummary({
          name: chordName,
          plan,
          voicing,
          positionForm: slot?.positionForm,
        }),
    };
  }, [buildNearSlotNoteMeta, nearSlotFamilyOf]);

  function spellChordNotesForSlot(slot) {
    return buildNearSlotNoteMeta(slot).notes;
  }

  function nearestVoicingIndex(reference, options) {
    const list = Array.isArray(options) ? options : [];
    if (!list.length) return 0;
    if (!reference) return 0;

    const refFrets = parseChordDbFretsString(reference?.frets);
    const refCenter = ((reference?.minFret ?? 0) + (reference?.maxFret ?? 0)) / 2;
    const refBassPitch = reference?.notes?.length
      ? Math.min(...reference.notes.map((n) => pitchAt(n.sIdx, n.fret)))
      : 0;

    let bestIdx = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    list.forEach((v, idx) => {
      const vFrets = parseChordDbFretsString(v?.frets);
      const vCenter = ((v?.minFret ?? 0) + (v?.maxFret ?? 0)) / 2;
      const vBassPitch = v?.notes?.length
        ? Math.min(...v.notes.map((n) => pitchAt(n.sIdx, n.fret)))
        : 0;

      let overlap = 0;
      if (refFrets && vFrets) {
        for (let i = 0; i < 6; i++) {
          if (refFrets[i] === vFrets[i]) overlap += 1;
        }
      }

      const score =
        Math.abs(vCenter - refCenter) * 3 +
        Math.abs(vBassPitch - refBassPitch) * 0.2 +
        Math.abs((v?.reach ?? ((v?.span ?? 0) + 1)) - (reference?.reach ?? ((reference?.span ?? 0) + 1))) * 1.2 -
        overlap * 4;

      if (score < bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    return bestIdx;
  }

  const nearComputed = useMemo(() => {
    const baseIdx = nearSlots.findIndex((slot) => !!slot?.enabled);

    const rankVsBase = (candidate, baseVoicing) => {
      if (!candidate || !baseVoicing) return 0;

      const cCenter = ((candidate.minFret ?? 0) + (candidate.maxFret ?? 0)) / 2;
      const bCenter = ((baseVoicing.minFret ?? 0) + (baseVoicing.maxFret ?? 0)) / 2;
      const cBassPitch = candidate.notes?.length
        ? Math.min(...candidate.notes.map((n) => pitchAt(n.sIdx, n.fret)))
        : 0;
      const bBassPitch = baseVoicing.notes?.length
        ? Math.min(...baseVoicing.notes.map((n) => pitchAt(n.sIdx, n.fret)))
        : 0;
      const overlap = (candidate.notes || []).filter((n) =>
        (baseVoicing.notes || []).some((b) => b.sIdx === n.sIdx && b.fret === n.fret)
      ).length;

      return (
        Math.abs(cCenter - bCenter) * 3 +
        Math.abs(cBassPitch - bBassPitch) * 0.18 +
        Math.abs((candidate.reach ?? ((candidate.span ?? 0) + 1)) - (baseVoicing.reach ?? ((baseVoicing.span ?? 0) + 1))) * 1.1 -
        overlap * 5
      );
    };

    const buildSlotVoicings = (slot) => {
      if (!slot?.enabled) return { plan: null, ranked: [], err: null };
      const family = nearSlotFamilyOf(slot);
      const maxSpan = slot.maxDist || 4;
      const allowOpenStrings = !!slot.allowOpenStrings;
      const inNearWindow = (fret) => fret >= nearFrom && fret <= nearTo;
      const voicingFits = (v) => {
        if (!v || !isErgonomicVoicing(v, maxSpan)) return false;
        return (v.notes || []).every((n) => (n.fret === 0 ? allowOpenStrings : inNearWindow(n.fret)));
      };

      const dedupeWindowed = (list) => dedupeAndSortVoicings(list).filter(voicingFits);

      if (family === "quartal") {
        const pitchSets = buildNearSlotQuartalPitchSets(slot);
        const plan = {
          rootPc: mod12(slot.rootPc),
          form: slot.quartalSpread || "closed",
          layer: "quartal",
          generator: "quartal",
          quartalType: slot.quartalType || "pure",
          quartalReference: slot.quartalReference || "root",
          quartalScaleName: slot.quartalScaleName || "Mayor",
          quartalTonicPc: mod12(slot.rootPc),
          ui: { usesManualForm: true, allowThirdInversion: (parseInt(String(slot.quartalVoices || "4"), 10) || 4) > 3, dropEligible: false },
        };
        const ranked = fnGenerateQuartalVoicings({
          pitchSets,
          maxDist: maxSpan,
          allowOpenStrings,
          maxFret,
        })
          .filter((v) => {
            const kind = v?.quartalSpreadKind || "closed";
            return (slot.quartalSpread || "closed") === "open" ? kind === "open" : kind === "closed";
          })
          .filter(voicingFits);
        return {
          plan,
          ranked,
          err: ranked.length ? null : `No he encontrado apilados ${(slot.quartalSpread || "closed") === "open" ? "abiertos" : "cerrados"} en este rango.`,
        };
      }

      if (family === "guide_tones") {
        const definition = guideToneDefinitionFromQuality(slot.guideToneQuality || "maj7");
        const allowedBassIntervals = guideToneBassIntervalsForSelection(definition, slot.guideToneInversion || "all");
        const allowedIntervals = new Set(definition.intervals.map(mod12));
        const requiredIntervals = new Set(definition.intervals.map(mod12));
        const plan = {
          rootPc: mod12(slot.rootPc),
          intervals: definition.intervals.map(mod12),
          bassInterval: allowedBassIntervals[0] ?? 0,
          thirdOffset: mod12(definition.intervals[1] ?? 0),
          fifthOffset: mod12(definition.intervals[2] ?? definition.intervals[1] ?? 0),
          topVoiceOffset: null,
          form: slot.guideToneForm || "closed",
          layer: "guide_tones",
          generator: "exact",
          guideToneQuality: slot.guideToneQuality || "maj7",
          inversion: slot.guideToneInversion || "all",
          ui: { usesManualForm: true, allowThirdInversion: false, dropEligible: false },
        };
        let ranked = allowedBassIntervals.flatMap((bassInterval) =>
          generateExactIntervalChordVoicings({
            rootPc: mod12(slot.rootPc),
            intervals: definition.intervals,
            bassInterval,
            maxFret,
            maxSpan,
          }).map((v) => normalizeGeneratedVoicingForDisplay(v, mod12(slot.rootPc), mod12(slot.rootPc)))
        );
        ranked = dedupeWindowed(ranked);
        if (allowOpenStrings) {
          ranked = augmentExactVoicingsWithOpenSubstitutions({
            voicings: ranked,
            rootPc: mod12(slot.rootPc),
            allowedIntervals,
            requiredIntervals,
            allowedBassIntervals,
            nearFrom,
            nearTo,
            maxFret,
            maxSpan,
            exactNoteCount: 3,
          });
          ranked = dedupeWindowed(ranked);
        }
        ranked = filterVoicingsByForm(dedupeAndSortVoicings(ranked), slot.guideToneForm || "closed").filter(voicingFits);
        return {
          plan,
          ranked,
          err: ranked.length ? null : "No he encontrado shells de notas guía en este rango.",
        };
      }

      const plan = buildChordEnginePlan({
        rootPc: slot.rootPc,
        quality: slot.quality,
        suspension: slot.suspension || "none",
        structure: slot.structure,
        inversion: slot.inversion,
        form: slot.form,
        ext7: !!slot.ext7,
        ext6: !!slot.ext6,
        ext9: !!slot.ext9,
        ext11: !!slot.ext11,
        ext13: !!slot.ext13,
      });
      const selectedBassIntervals = bassIntervalsForSelection(plan);
      const rootCandidates = symmetricRootCandidatesForPlan(plan);

      const finalize = (list) => {
        let base = dedupeWindowed(list);
        if (!allowOpenStrings) return base;

        const allowedIntervals = new Set((plan.intervals || []).map(mod12));
        const requiredIntervals = new Set((plan.intervals || []).map(mod12));

        if (plan.structure === "chord") {
          base = augmentVoicingsWithChordToneDuplicatesInWindow({
            voicings: base,
            rootPc: plan.rootPc,
            allowedIntervals,
            requiredIntervals,
            allowedBassIntervals: selectedBassIntervals,
            nearFrom,
            nearTo,
            maxFret,
            maxSpan,
          });
          return dedupeWindowed(base);
        }

        const exactNoteCount = allowedIntervals.size;
        if (exactNoteCount < 3 || exactNoteCount > 4) return base;

        base = augmentExactVoicingsWithOpenSubstitutions({
          voicings: base,
          rootPc: plan.rootPc,
          allowedIntervals,
          requiredIntervals,
          allowedBassIntervals: selectedBassIntervals,
          nearFrom,
          nearTo,
          maxFret,
          maxSpan,
          exactNoteCount,
        });
        return dedupeWindowed(base);
      };

      if (plan.generator === "triad") {
        const list = rootCandidates.flatMap((rootCandidate) =>
          concreteInversionsForSelection(plan.inversion, plan.ui?.allowThirdInversion).flatMap((inv) =>
            filterVoicingsByForm(
              generateTriadVoicings({
                rootPc: rootCandidate,
                thirdOffset: plan.thirdOffset,
                fifthOffset: plan.fifthOffset,
                inversion: inv,
                maxFret,
                maxSpan,
              }),
              plan.form
            ).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, rootCandidate))
          )
        );
        return { plan, ranked: finalize(list), err: null };
      }

      if (plan.generator === "drop") {
        if (plan.topVoiceOffset == null) return { plan, ranked: [], err: "Sin voicings en este rango." };
        const list = rootCandidates.flatMap((rootCandidate) =>
          concreteInversionsForSelection(plan.inversion, plan.ui?.allowThirdInversion).flatMap((inv) =>
            generateDropTetradVoicings({
              rootPc: rootCandidate,
              thirdOffset: plan.thirdOffset,
              fifthOffset: plan.fifthOffset,
              seventhOffset: plan.topVoiceOffset,
              form: plan.form,
              inversion: inv,
              maxFret,
              maxSpan,
            }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, rootCandidate))
          )
        );
        return { plan, ranked: finalize(list), err: null };
      }

      if (plan.generator === "tetrad") {
        const list = plan.form === "open"
          ? buildOpenSupersetTetradVoicings({
              rootCandidates,
              inversionChoices: concreteInversionsForSelection(plan.inversion, plan.ui?.allowThirdInversion),
              plan,
              maxFret,
              maxSpan,
            })
          : rootCandidates.flatMap((rootCandidate) =>
              concreteInversionsForSelection(plan.inversion, plan.ui?.allowThirdInversion).flatMap((inv) =>
                filterVoicingsByForm(
                  generateTetradVoicings({
                    rootPc: rootCandidate,
                    thirdOffset: plan.thirdOffset,
                    fifthOffset: plan.fifthOffset,
                    seventhOffset: plan.topVoiceOffset,
                    inversion: inv,
                    maxFret,
                    maxSpan,
                  }),
                  plan.form
                ).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, rootCandidate))
              )
            );
        return { plan, ranked: finalize(list), err: null };
      }

      if (plan.generator === "exact") {
        const list = selectedBassIntervals.flatMap((bassInterval) =>
          generateExactIntervalChordVoicings({
            rootPc: plan.rootPc,
            intervals: plan.intervals,
            bassInterval,
            maxFret,
            maxSpan,
          }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, plan.rootPc))
        );
        return { plan, ranked: finalize(list), err: null };
      }

      if (plan.generator === "json") {
        const suffix = chordSuffixFromUI({
          quality: slot.quality,
          suspension: slot.suspension || "none",
          structure: slot.structure,
          ext7: !!slot.ext7,
          ext6: !!slot.ext6,
          ext9: !!slot.ext9,
          ext11: !!slot.ext11,
          ext13: !!slot.ext13,
        });
        const cacheKey = `${chordDbKeyNameFromPc(slot.rootPc)}/${suffix}`;
        const json = chordDbCache[cacheKey];
        const cachedErr = chordDbCacheErr[cacheKey] || null;

        if (!json?.positions?.length) {
          return { plan, ranked: [], err: cachedErr || "Sin digitaciones en este rango." };
        }

        const allowed = new Set(plan.intervals.map(mod12));
        const required = new Set([mod12(plan.thirdOffset)]);
        const noTensions = !slot.ext7 && !slot.ext6 && !slot.ext9 && !slot.ext11 && !slot.ext13;

        if (noTensions) {
          required.add(0);
          required.add(mod12(plan.fifthOffset));
        } else {
          if (slot.ext7 && plan.seventhOffset != null) required.add(mod12(plan.seventhOffset));
          if (slot.ext6) required.add(9);
          if (slot.ext9) required.add(2);
          if (slot.ext11) required.add(5);
          if (slot.ext13) required.add(9);
        }

        const strict = [];
        const loose = [];
        const seen = new Set();

        for (const p of json.positions || []) {
          const fretsLH = parseChordDbFretsString(p?.frets);
          if (!fretsLH) continue;
          const v = buildVoicingFromFretsLH({ fretsLH, rootPc: plan.rootPc, maxFret });
          if (!voicingFits(v)) continue;

          const extraOk = new Set([2, 5, 9, 10, 11]);
          let invalid = false;
          let extraCount = 0;

          for (const r of v.relIntervals) {
            if (!allowed.has(r)) {
              if (extraOk.has(r)) extraCount += 1;
              else {
                invalid = true;
                break;
              }
            }
          }
          if (invalid) continue;
          for (const r of required) {
            if (!v.relIntervals.has(r)) {
              invalid = true;
              break;
            }
          }
          if (invalid) continue;

          const bassInt = mod12(v.bassPc - plan.rootPc);
          const key = `${v.frets}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const item = { ...v, _extra: extraCount };
          if (selectedBassIntervals.includes(bassInt)) strict.push(item);
          else if (plan.inversion !== "all") loose.push(item);
        }

        const list = strict.length ? strict : loose;
        list.sort((a, b) => ((a._extra ?? 0) - (b._extra ?? 0)) || (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret));
        return { plan, ranked: finalize(list), err: null };
      }

      return { plan, ranked: [], err: "Sin voicings en este rango." };
    };

    const initial = nearSlots.map((slot) => buildSlotVoicings(slot));
    const baseOptions = baseIdx >= 0 ? (initial[baseIdx]?.ranked || []) : [];
    const baseRef = baseIdx >= 0
      ? (baseOptions.find((v) => v.frets === nearSlots[baseIdx]?.selFrets) || baseOptions[0] || null)
      : null;

    const ranked = initial.map((entry, idx) => {
      if (idx === baseIdx || !baseRef || !(entry?.ranked?.length)) return entry;
      return {
        ...entry,
        ranked: [...entry.ranked].sort((a, b) => {
          const da = rankVsBase(a, baseRef);
          const db = rankVsBase(b, baseRef);
          if (da !== db) return da - db;
          return (a.minFret - b.minFret) || ((a.reach ?? (a.span + 1)) - (b.reach ?? (b.span + 1))) || a.frets.localeCompare(b.frets);
        }),
      };
    });

    const selected = ranked.map((entry, idx) => {
      if (!nearSlots[idx]?.enabled) return null;
      const options = entry?.ranked || [];
      if (!options.length) return null;
      return options.find((v) => v.frets === nearSlots[idx]?.selFrets) || options[0] || null;
    });

    return { baseIdx, ranked, selected };
  }, [nearSlots, nearFrom, nearTo, maxFret, chordDbCache, chordDbCacheErr, buildNearSlotQuartalPitchSets, nearSlotFamilyOf]);

  const nearRankSig = useMemo(
    () => nearComputed.ranked.map((entry) => (entry?.ranked || []).map((v) => v.frets).join(",")).join("|"),
    [nearComputed.ranked]
  );

  const nearSelectedSig = useMemo(
    () => nearComputed.selected.map((v) => v?.frets || "").join("|"),
    [nearComputed.selected]
  );

  const studyData = useMemo(() => {
    if (studyTarget === "main") {
      const detectCandidate = chordDetectMode ? chordDetectSelectedCandidate : null;
      if (detectCandidate) {
        const mainRootPc = detectCandidate.rootPc;
        const mainPreferSharps = detectCandidate.preferSharps ?? chordPreferSharps;
        const mainIntervals = detectCandidate.formula?.intervals?.length
          ? detectCandidate.formula.intervals.map(mod12)
          : chordIntervals;
        const mainDegreeLabels = detectCandidate.formula?.degreeLabels?.length === mainIntervals.length
          ? detectCandidate.formula.degreeLabels
          : null;
        const mainSpelledNotes = spellChordNotes({ rootPc: mainRootPc, chordIntervals: mainIntervals, preferSharps: mainPreferSharps });
        const detectedPlan = detectCandidate.uiPatch
          ? buildChordEnginePlan({
              ...detectCandidate.uiPatch,
              form: detectCandidate.uiPatch.form || "open",
            })
          : chordEnginePlan;
        const mainPcToSpelledName = (pc) => {
          const interval = mod12(pc - mainRootPc);
          const idx = mainIntervals.findIndex((x) => mod12(x) === interval);
          return idx >= 0 ? mainSpelledNotes[idx] : pcToName(pc, mainPreferSharps);
        };
        const manualStudyVoicing = buildManualSelectionVoicing(chordDetectSelectedNotes, mainRootPc, maxFret);
        const currentMainVoicing = manualStudyVoicing || activeChordVoicing;

        return {
          rootPc: mainRootPc,
          preferSharps: mainPreferSharps,
          title: "Acorde principal",
          chordName: detectCandidate.name,
          notes: mainSpelledNotes,
          intervals: mainDegreeLabels || mainIntervals.map((i) => intervalToChordToken(i, { ext6: chordExt6, ext9: chordExt9 && chordStructure !== "triad", ext11: chordExt11 && chordStructure !== "triad", ext13: chordExt13 && chordStructure !== "triad" })),
          plan: detectedPlan,
          voicing: currentMainVoicing,
          positionForm: detectCandidate.uiPatch?.positionForm || chordPositionForm,
          bassName: currentMainVoicing ? mainPcToSpelledName(currentMainVoicing.bassPc) : pcToName(chordBassPc, mainPreferSharps),
          inversionLabel: currentMainVoicing
            ? actualInversionLabelFromVoicing(detectedPlan, currentMainVoicing)
            : CHORD_INVERSIONS.find((x) => x.value === chordInversion)?.label || "Fundamental",
        };
      }

      if (chordFamily === "quartal") {
        const quartalOrderedPcs = Array.isArray(activeQuartalVoicing?.quartalOrderedPcs) && activeQuartalVoicing.quartalOrderedPcs.length
          ? activeQuartalVoicing.quartalOrderedPcs
          : (Array.isArray(chordQuartalPitchSets?.[0]?.pcs) ? chordQuartalPitchSets[0].pcs : []);
        const quartalRootPc = chordQuartalCurrentRootPc;
        const quartalIntervals = quartalOrderedPcs.map((pc) => mod12(pc - quartalRootPc));
        const quartalNotes = quartalIntervals.map((interval) => spellNoteFromChordInterval(quartalRootPc, interval, chordPreferSharps));
        const quartalVoicing = activeQuartalVoicing
          ? {
              ...activeQuartalVoicing,
              relIntervals: new Set((activeQuartalVoicing.notes || []).map((n) => mod12(n.pc - quartalRootPc))),
            }
          : null;
        const quartalPlan = {
          rootPc: quartalRootPc,
          intervals: quartalIntervals,
          bassInterval: quartalVoicing?.bassPc != null ? mod12(quartalVoicing.bassPc - quartalRootPc) : (quartalIntervals[0] ?? 0),
          thirdOffset: quartalIntervals[1] ?? 0,
          fifthOffset: quartalIntervals[2] ?? quartalIntervals[1] ?? 0,
          topVoiceOffset: quartalIntervals.length > 3 ? quartalIntervals[3] : null,
          form: chordQuartalSpread,
          layer: "quartal",
          generator: "quartal",
          quartalType: chordQuartalType,
          quartalReference: chordQuartalReference,
          quartalScaleName: chordQuartalScaleName,
          quartalTonicPc: chordRootPc,
          quartalSteps: Array.isArray(activeQuartalVoicing?.quartalSteps) ? [...activeQuartalVoicing.quartalSteps] : [],
          quartalDegree: typeof activeQuartalVoicing?.quartalDegree === "number" ? activeQuartalVoicing.quartalDegree : null,
          ui: { usesManualForm: true, allowThirdInversion: quartalIntervals.length > 3, dropEligible: false },
        };

        return {
          rootPc: quartalRootPc,
          preferSharps: chordPreferSharps,
          title: "Acorde principal",
          chordName: chordQuartalDisplayName,
          notes: quartalNotes,
          intervals: quartalIntervals.map((interval) => intervalToSimpleChordDegreeToken(interval)),
          plan: quartalPlan,
          voicing: quartalVoicing,
          positionForm: chordQuartalSpread,
          bassName: quartalVoicing?.bassPc != null ? spellNoteFromChordInterval(quartalRootPc, mod12(quartalVoicing.bassPc - quartalRootPc), chordPreferSharps) : "—",
          inversionLabel: quartalVoicing ? actualInversionLabelFromVoicing(quartalPlan, quartalVoicing) : "Según voicing",
        };
      }

      if (chordFamily === "guide_tones") {
        const guideIntervals = guideToneDef.intervals.map(mod12);
        const guidePlan = {
          rootPc: chordRootPc,
          intervals: guideIntervals,
          bassInterval: activeGuideToneVoicing?.bassPc != null
            ? mod12(activeGuideToneVoicing.bassPc - chordRootPc)
            : (guideToneBassIntervalsForSelection(guideToneDef, guideToneInversion === "all" ? "root" : guideToneInversion)[0] ?? 0),
          thirdOffset: guideIntervals[1] ?? 0,
          fifthOffset: guideIntervals[2] ?? guideIntervals[1] ?? 0,
          topVoiceOffset: null,
          form: guideToneForm,
          layer: "guide_tones",
          generator: "exact",
          guideToneQuality,
          ui: { usesManualForm: true, allowThirdInversion: false, dropEligible: false },
        };

        return {
          rootPc: chordRootPc,
          preferSharps: chordPreferSharps,
          title: "Acorde principal",
          chordName: `${guideToneDisplayName} · Notas guía`,
          notes: guideToneDef.intervals.map((interval) => spellNoteFromChordInterval(chordRootPc, interval, chordPreferSharps)),
          intervals: [...guideToneDef.degreeLabels],
          plan: guidePlan,
          voicing: activeGuideToneVoicing,
          positionForm: guideToneForm,
          bassName: activeGuideToneVoicing?.bassPc != null ? spellNoteFromChordInterval(chordRootPc, mod12(activeGuideToneVoicing.bassPc - chordRootPc), chordPreferSharps) : guideToneBassNote,
          inversionLabel: activeGuideToneVoicing
            ? actualInversionLabelFromVoicing(guidePlan, activeGuideToneVoicing)
            : CHORD_GUIDE_TONE_INVERSIONS.find((x) => x.value === guideToneInversion)?.label || "Fundamental",
        };
      }

      const mainRootPc = chordRootPc;
      const mainPreferSharps = chordPreferSharps;
      const mainIntervals = chordIntervals;
      const mainSpelledNotes = spellChordNotes({ rootPc: mainRootPc, chordIntervals: mainIntervals, preferSharps: mainPreferSharps });
      const mainPcToSpelledName = (pc) => {
        const interval = mod12(pc - mainRootPc);
        const idx = mainIntervals.findIndex((x) => mod12(x) === interval);
        return idx >= 0 ? mainSpelledNotes[idx] : pcToName(pc, mainPreferSharps);
      };

      return {
        rootPc: mainRootPc,
        preferSharps: mainPreferSharps,
        title: "Acorde principal",
        chordName: chordDisplayNameFromUI({
          rootPc: mainRootPc,
          preferSharps: mainPreferSharps,
          quality: chordQuality,
          suspension: chordSuspension,
          structure: chordStructure,
          ext7: chordExt7,
          ext6: chordExt6,
          ext9: chordExt9,
          ext11: chordExt11,
          ext13: chordExt13,
        }),
        notes: mainSpelledNotes,
        intervals: chordDegreeLabels || mainIntervals.map((i) => intervalToChordToken(i, { ext6: chordExt6, ext9: chordExt9 && chordStructure !== "triad", ext11: chordExt11 && chordStructure !== "triad", ext13: chordExt13 && chordStructure !== "triad" })),
        plan: chordEnginePlan,
        voicing: activeChordVoicing,
        positionForm: chordPositionForm,
        bassName: activeChordVoicing ? mainPcToSpelledName(activeChordVoicing.bassPc) : pcToName(chordBassPc, mainPreferSharps),
        inversionLabel: activeChordVoicing
          ? actualInversionLabelFromVoicing(chordEnginePlan, activeChordVoicing)
          : CHORD_INVERSIONS.find((x) => x.value === chordInversion)?.label || "Fundamental",
      };
    }

    const idx = Number(studyTarget);
    const slot = nearSlots[idx];
    const plan = nearComputed.ranked[idx]?.plan || null;
    const voicing = nearComputed.selected[idx] || null;
    return buildNearSlotStudyEntry(slot, plan, voicing, idx);
  }, [studyTarget, chordDetectMode, chordDetectSelectedCandidate, chordDetectSelectedNotes, chordFamily, chordRootPc, chordPreferSharps, chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordIntervals, chordDegreeLabels, chordEnginePlan, activeChordVoicing, chordBassPc, chordInversion, chordPositionForm, maxFret, chordQuartalPitchSets, activeQuartalVoicing, chordQuartalCurrentRootPc, chordQuartalDisplayName, chordQuartalSpread, chordQuartalType, chordQuartalReference, chordQuartalScaleName, guideToneDef, activeGuideToneVoicing, guideToneDisplayName, guideToneForm, guideToneInversion, guideToneQuality, guideToneBassNote, nearSlots, nearComputed, buildNearSlotStudyEntry]);

  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS: PANEL DE ESTUDIO
  // --------------------------------------------------------------------------

  function StudyPanel() {
    const [studySubstitutionSectionIdx, setStudySubstitutionSectionIdx] = useState(0);
    const substitutionTabLabels = ["Diatónicas", "Cromáticas y jazz", "Por préstamo", "Estructura y color", "Avanzadas y extras"];
    const d = studyData;
    const studyRelativeChord = describeRelativeTertianChord({
      rootPc: d?.rootPc ?? chordRootPc,
      preferSharps: d?.preferSharps ?? chordPreferSharps,
      quality: d?.plan?.quality,
      suspension: d?.plan?.suspension || "none",
      intervals: d?.plan?.intervals || [],
      ext7: !!d?.plan?.ext7,
      ext6: !!d?.plan?.ext6,
      ext9: !!d?.plan?.ext9,
      ext11: !!d?.plan?.ext11,
      ext13: !!d?.plan?.ext13,
      layer: d?.plan?.layer || "tertian",
    });
    const rules = explainStudyRules(d?.plan);
    const naming = buildChordNamingExplanation(d?.plan);
    const voicingAnalysis = analyzeVoicingVsPlan(d?.plan, d?.voicing, d?.preferSharps ?? chordPreferSharps);
    const isQuartalStudy = d?.plan?.layer === "quartal";
    const quartalReferenceLabel = isQuartalStudy
      ? (
          d?.plan?.quartalReference === "scale"
            ? `Diatónico a la escala ${d?.plan?.quartalScaleName || scaleName} de ${pcToName(d?.plan?.quartalTonicPc ?? chordRootPc, d?.preferSharps ?? chordPreferSharps)}`
            : `Desde raíz de ${pcToName(d?.plan?.quartalTonicPc ?? chordRootPc, d?.preferSharps ?? chordPreferSharps)}`
        )
      : "";
    const quartalStepText = isQuartalStudy && Array.isArray(d?.plan?.quartalSteps) && d.plan.quartalSteps.length
      ? d.plan.quartalSteps.map((v) => (v === 6 ? "A4" : "4J")).join(" · ")
      : "—";
    const quartalDegreeText = isQuartalStudy && typeof d?.plan?.quartalDegree === "number"
      ? fnBuildQuartalDegreeLabel(d.plan.quartalDegree)
      : "—";
    const tensionAnalysis = analyzeScaleTensionsForChord({
      activeScaleRootPc: rootPc,
      scaleIntervals,
      chordRootPc: d?.rootPc ?? chordRootPc,
      chordIntervals: d?.plan?.intervals || [],
      preferSharps: d?.preferSharps ?? chordPreferSharps,
    });
    const dominant = buildDominantInfo(d?.rootPc ?? chordRootPc, d?.preferSharps ?? chordPreferSharps);
    const backdoorDominant = buildBackdoorDominantInfo(d?.rootPc ?? chordRootPc, d?.preferSharps ?? chordPreferSharps);
    const substitutionKeySignature = resolveKeySignatureForScale({ rootPc, scaleName }) || { type: null, count: 0 };
    const substitutionSections = buildStudySubstitutionGuide({
      chordRootPc: d?.rootPc ?? chordRootPc,
      chordName: d?.chordName,
      plan: d?.plan,
      preferSharps: d?.preferSharps ?? chordPreferSharps,
      harmonizedScale,
      backdoorDominantInfo: backdoorDominant,
      scaleNotesText: spelledScaleNotes.join(" · "),
      scaleRootPc: rootPc,
      scaleName,
      harmonyMode,
      scaleIntervals,
    });
    useEffect(() => {
      setStudySubstitutionSectionIdx(0);
    }, [d?.title, d?.chordName]);
    useEffect(() => {
      setStudySubstitutionSectionIdx((prev) => {
        const maxIdx = Math.max(0, substitutionSections.length - 1);
        return Math.min(prev, maxIdx);
      });
    }, [substitutionSections.length]);
    const activeSubstitutionSection = substitutionSections[studySubstitutionSectionIdx] || null;
    const studyStaffEvents = d?.voicing?.notes?.length
      ? [{
          notes: [...d.voicing.notes].sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret)).map((n) => pitchAt(n.sIdx, n.fret)),
          spelledNotes: Array.isArray(d?.notes) ? [...d.notes] : [],
        }]
      : [];
    const studyVoicingPositionsText = d?.voicing?.notes?.length
      ? [...d.voicing.notes]
          .sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret))
          .map((n) => `${n.sIdx + 1}ª/${n.fret}`)
          .join(" · ")
      : "";
    const studyBulletGlyph = (level) => {
      if (level === 0) return "◦";
      if (level === 1) return "▪";
      return "–";
    };
    const renderStudyLineWithBoldPrefix = (text) => {
      const raw = String(text || "").trim();
      if (!raw) return null;
      const colonIdx = raw.indexOf(":");
      if (colonIdx <= 0) return <span className="text-justify">{raw}</span>;
      const label = raw.slice(0, colonIdx + 1);
      const rest = raw.slice(colonIdx + 1).trim();
      return (
        <span className="text-justify">
          <b>{label}</b>
          {rest ? ` ${rest}` : ""}
        </span>
      );
    };
    const renderStudyStructuredLines = (lines, level = 0) => {
      const safeLines = Array.isArray(lines) ? lines.map((line) => String(line || "").trim()).filter(Boolean) : [];
      if (!safeLines.length) return null;
      const items = [];
      let idx = 0;
      while (idx < safeLines.length) {
        const line = safeLines[idx];
        const isHeading = /:\s*$/.test(line);
        if (isHeading) {
          const children = [];
          idx += 1;
          while (idx < safeLines.length && !/:\s*$/.test(safeLines[idx])) {
            children.push(safeLines[idx]);
            idx += 1;
          }
          items.push(
            <div key={`${level}-${idx}-${line}`} className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="mt-[2px] text-slate-400">{studyBulletGlyph(level)}</span>
                <span className="text-justify"><b>{line}</b></span>
              </div>
              {children.length ? <div className="pl-5">{renderStudyStructuredLines(children, level + 1)}</div> : null}
            </div>
          );
          continue;
        }
        items.push(
          <div key={`${level}-${idx}-${line}`} className="flex items-start gap-2">
            <span className="mt-[2px] text-slate-400">{studyBulletGlyph(level)}</span>
            {renderStudyLineWithBoldPrefix(line)}
          </div>
        );
        idx += 1;
      }
      return <div className="space-y-2">{items}</div>;
    };
    const renderStudyOuterBlock = (label, content) => {
      if (!content || (Array.isArray(content) && !content.length)) return null;
      return (
        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <span className="mt-[2px] text-slate-500">●</span>
            <span className="text-justify"><b>{label}:</b>{Array.isArray(content) ? "" : ` ${content}`}</span>
          </div>
          {Array.isArray(content) ? <div className="pl-5">{renderStudyStructuredLines(content, 0)}</div> : null}
        </div>
      );
    };
    const exportStudyPdf = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const exportDateText = new Intl.DateTimeFormat("es-ES", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date());

      const studyHeaderRows = [
        ["Acorde estudiado", d?.chordName || "—"],
        ["Escala activa", `${pcToName(rootPc, computeAutoPreferSharps({ rootPc, scaleName }))} ${scaleName}`],
        ["Notas del acorde", d?.notes?.join(" · ") || "—"],
        ["Fórmula", d?.intervals?.join(" · ") || "—"],
        ["Bajo", d?.bassName || "—"],
        ["Inversión", d?.inversionLabel || "—"],
        ["Capa", chordEngineLayerLabel(d?.plan)],
        ["Generador", chordEngineGeneratorLabel(d?.plan)],
      ];

      const summaryCardsHtml = [
        {
          title: "Identidad",
          rows: [
            ["Nombre", d?.chordName || "—"],
            ["Capa", chordEngineLayerLabel(d?.plan)],
            ["Generador", chordEngineGeneratorLabel(d?.plan)],
          ],
        },
        {
          title: "Construcción",
          rows: [
            ["Fórmula", d?.intervals?.join(" · ") || "—"],
            ["Notas", d?.notes?.join(" · ") || "—"],
            ["Bajo", d?.bassName || "—"],
            ["Inversión", d?.inversionLabel || "—"],
          ],
        },
        {
          title: "Dominantes relacionados",
          rows: [
            ["Dominante normal", `${dominant.name} · ${dominant.notes.join(" · ")}`],
            ["Backdoor dominant", `${backdoorDominant.name} · ${backdoorDominant.notes.join(" · ")}`],
          ],
        },
      ].map((card) => (
        `<section class="pdf-card">` +
          `<h3>${escapeHtml(card.title)}</h3>` +
          `<div class="pdf-kv">` +
            card.rows.map(([label, value]) => `<div><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</div>`).join("") +
          `</div>` +
        `</section>`
      )).join("");

      const studyHeaderSummary = buildChordHeaderSummary({
        name: d?.chordName,
        plan: d?.plan,
        voicing: d?.voicing,
        positionForm: d?.positionForm || positionFormFromEffectiveForm(d?.plan?.form, "closed"),
      });
      const studyVoicingNoteText = d?.voicing?.notes?.length
        ? [...d.voicing.notes]
            .sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret))
            .map((n) => spellNoteFromChordInterval(d?.rootPc ?? chordRootPc, mod12(n.pc - (d?.rootPc ?? chordRootPc)), d?.preferSharps ?? chordPreferSharps))
            .join(" – ")
        : ((d?.notes || []).join(" – ") || "—");
      const studyBadgeStripHtml = buildPdfChordBadgeStripHtml({
        items: buildStudyBadgeItemsFromPlan({
          rootPc: d?.rootPc ?? chordRootPc,
          preferSharps: d?.preferSharps ?? chordPreferSharps,
          plan: d?.plan,
        }),
        bassNote: d?.bassName || null,
        colorMap: colors,
      });
      const studyCompactFretboardHtml = buildPdfCompactVoicingFretboardHtml({
        voicing: d?.voicing,
        rootPc: d?.rootPc ?? chordRootPc,
        preferSharps: d?.preferSharps ?? chordPreferSharps,
        plan: d?.plan,
        colors,
        showIntervalsLabel,
        showNotesLabel,
      });
      const studyVoicingHtml = studyStaffEvents.length
        ? (
            `<section class="pdf-card">` +
              `<h3>Voicing real en el mástil</h3>` +
              `<div class="pdf-caption"><b>Acorde</b> ${escapeHtml(studyHeaderSummary || d?.chordName || "—")}</div>` +
              `<div class="pdf-caption"><b>Notas:</b> ${escapeHtml(studyVoicingNoteText)}.</div>` +
              (studyBadgeStripHtml || "") +
              (studyCompactFretboardHtml ? `<div class="pdf-mini-neck-wrap">${studyCompactFretboardHtml}</div>` : "") +
              `<div class="pdf-caption"><b>Digitación:</b> ${escapeHtml(studyVoicingPositionsText || "—")}</div>` +
              `<h3>Pentagrama del voicing actual</h3>` +
              `<div class="pdf-staff-wrap">${buildMusicStaffSvgMarkup({ events: studyStaffEvents, preferSharps: d?.preferSharps ?? chordPreferSharps, clefMode: "guitar", keySignature: substitutionKeySignature })}</div>` +
            `</section>`
          )
        : "";

      const substitutionIndexHtml = substitutionSections.map((section, sectionIdx) => {
        const itemLinks = section.items.map((item, itemIdx) => (
          `<li><a href="#pdf-item-${sectionIdx + 1}-${itemIdx + 1}">${escapeHtml(`${sectionIdx + 1}.${itemIdx + 1} ${item.title}`)}</a></li>`
        )).join("");
        return (
          `<li>` +
            `<a href="#pdf-section-${sectionIdx + 1}">${escapeHtml(`${sectionIdx + 1}. ${section.title}`)}</a>` +
            (itemLinks ? `<ul>${itemLinks}</ul>` : "") +
          `</li>`
        );
      }).join("");

      const substitutionSectionsHtml = substitutionSections.map((section, sectionIdx) => {
        const sectionSubIndexHtml = section.items.length
          ? (
              `<nav class="pdf-subindex">` +
                `<div class="pdf-subindex-title">Índice de la sección</div>` +
                `<ul>` +
                  section.items.map((item, itemIdx) => `<li><a href="#pdf-item-${sectionIdx + 1}-${itemIdx + 1}">${escapeHtml(`${sectionIdx + 1}.${itemIdx + 1} ${item.title}`)}</a></li>`).join("") +
                `</ul>` +
              `</nav>`
            )
          : "";

        const itemsHtml = section.items.map((item, itemIdx) => {
          const staffGroupsHtml = Array.isArray(item.staffGroups) && item.staffGroups.length
            ? item.staffGroups.filter((group) => group?.events?.length).map((group) => {
                const footerHtml = (
                  `<table class="pdf-staff-notes">` +
                    `<tbody>` +
                      group.events.map((evt, evtIdx) => {
                        const chordLabel = group.labels?.[evtIdx] || `Acorde ${evtIdx + 1}`;
                        const noteCells = Array.isArray(evt?.spelledNotes) && evt.spelledNotes.length ? evt.spelledNotes : ["—"];
                        return (
                          `<tr>` +
                            `<td class="pdf-staff-notes-label">${escapeHtml(`${chordLabel}:`)}</td>` +
                            noteCells.map((note) => `<td>${escapeHtml(note)}</td>`).join("") +
                          `</tr>`
                        );
                      }).join("") +
                    `</tbody>` +
                  `</table>`
                );
                return (
                  `<section class="pdf-staff-card">` +
                    `<div class="pdf-staff-title">${escapeHtml(group.title)}</div>` +
                    (group.caption ? `<div class="pdf-caption">${escapeHtml(group.caption)}</div>` : "") +
                    (Array.isArray(group.labels) && group.labels.length ? `<div class="pdf-caption">Acordes en este orden: ${escapeHtml(group.labels.join(" · "))}</div>` : "") +
                    `<div class="pdf-staff-wrap">${buildMusicStaffSvgMarkup({ events: group.events, preferSharps: d?.preferSharps ?? chordPreferSharps, clefMode: "guitar", keySignature: group.keySignature ?? substitutionKeySignature })}</div>` +
                    footerHtml +
                  `</section>`
                );
              }).join("")
            : "";

          return (
            `<article id="pdf-item-${sectionIdx + 1}-${itemIdx + 1}" class="pdf-item">` +
              `<h3>${escapeHtml(`${sectionIdx + 1}.${itemIdx + 1} ${item.title}`)}</h3>` +
              buildStudyOuterBlockHtml("Qué es", item.definition) +
              buildStudyOuterBlockHtml("Cuándo aplica", item.appliesWhen) +
              buildStudyOuterBlockHtml("Cómo sale", item.derivation) +
              buildStudyOuterBlockHtml("Ejemplos y lectura", item.examples) +
              staffGroupsHtml +
            `</article>`
          );
        }).join("");

        return (
          `<section id="pdf-section-${sectionIdx + 1}" class="pdf-section">` +
            `<h2>${escapeHtml(`${sectionIdx + 1}. ${section.title}`)}</h2>` +
            sectionSubIndexHtml +
            itemsHtml +
          `</section>`
        );
      }).join("");

      const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(`Estudio de ${d?.chordName || "acorde"}`)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #0f172a; background: #f8fafc; font-size: 11px; }
    .pdf-page { max-width: 980px; margin: 0 auto; padding: 24px 24px 28px; background: #ffffff; }
    .pdf-header { border-bottom: 2px solid #cbd5e1; padding-bottom: 16px; margin-bottom: 24px; }
    .pdf-header h1 { margin: 0; font-size: 20px; line-height: 1.2; }
    .pdf-header p { margin: 8px 0 0; color: #475569; font-size: 10px; }
    .pdf-meta { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 16px; font-size: 10px; }
    .pdf-index, .pdf-subindex, .pdf-card, .pdf-staff-card { break-inside: avoid; }
    .pdf-index { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 14px; padding: 16px; margin-bottom: 24px; }
    .pdf-index h2, .pdf-section h2 { margin: 0 0 10px; font-size: 16px; }
    .pdf-index ol, .pdf-index ul, .pdf-subindex ul { margin: 8px 0 0 18px; padding: 0; }
    .pdf-index li, .pdf-subindex li { margin: 3px 0; font-size: 10px; }
    .pdf-index a, .pdf-subindex a { color: #0f172a; text-decoration: none; }
    .pdf-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
    .pdf-card { border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px 16px; background: #f8fafc; }
    .pdf-card h3 { margin: 0 0 8px; font-size: 13px; }
    .pdf-kv, .pdf-caption { font-size: 9px; line-height: 1.4; color: #334155; }
    .pdf-caption + .pdf-caption { margin-top: 4px; }
    .pdf-section { margin-top: 18px; break-before: page; page-break-before: always; }
    .pdf-subindex { margin: 12px 0 18px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: #f8fafc; }
    .pdf-subindex-title { font-size: 10px; font-weight: 700; margin-bottom: 6px; }
    .pdf-item { border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 14px; }
    .pdf-item h3 { margin: 0 0 10px; font-size: 13px; }
    .pdf-study-block { margin: 8px 0 0; }
    .pdf-study-line { display: flex; align-items: flex-start; gap: 8px; text-align: justify; line-height: 1.45; font-size: 10px; }
    .pdf-study-line--outer { font-size: 11px; }
    .pdf-study-bullet { width: 14px; flex: 0 0 14px; color: #475569; }
    .pdf-study-children { padding-left: 20px; margin-top: 4px; }
    .pdf-study-line-group { margin-top: 4px; }
    .pdf-staff-card { margin-top: 12px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px; background: #fff; }
    .pdf-staff-title { font-size: 10px; font-weight: 700; margin-bottom: 4px; }
    .pdf-staff-wrap { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; background: #fff; margin-top: 8px; }
    .pdf-staff-wrap svg { display: block; max-width: 100%; height: auto; }
    .pdf-staff-notes { margin-top: 8px; width: auto; border-collapse: separate; border-spacing: 8px 4px; font-family: "Courier New", monospace; font-size: 9px; }
    .pdf-staff-notes-label { padding-right: 10px; font-weight: 700; white-space: nowrap; color: #334155; }
    .pdf-staff-notes td { text-align: center; white-space: nowrap; }
    .pdf-badge-strip { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-top: 8px; }
    .pdf-badge-item { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 28px; }
    .pdf-badge-note { font-size: 9px; font-weight: 700; color: #334155; }
    .pdf-badge-degree { min-width: 28px; padding: 3px 6px; border-radius: 7px; text-align: center; font-size: 8px; font-weight: 700; line-height: 1; box-shadow: 0 1px 2px rgba(15,23,42,0.14); }
    .pdf-badge-item--bass { min-width: 46px; }
    .pdf-badge-degree--bass { min-width: 46px; background: #334155; color: #fff; }
    .pdf-mini-neck-wrap { margin-top: 10px; overflow: hidden; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px 10px; background: #fff; }
    .pdf-mini-neck { display: grid; gap: 6px 6px; align-items: center; width: 100%; }
    .pdf-mini-neck-corner { height: 14px; }
    .pdf-mini-neck-head { text-align: center; font-size: 9px; font-weight: 700; color: #475569; }
    .pdf-mini-neck-head--open { font-size: 8px; }
    .pdf-mini-neck-string { text-align: right; padding-right: 6px; font-size: 9px; font-weight: 700; color: #334155; }
    .pdf-mini-neck-cell { position: relative; width: 100%; min-width: 0; height: 28px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(248,250,252,0.72); display: flex; align-items: center; justify-content: center; }
    .pdf-mini-neck-cell--open { border-radius: 6px; }
    .pdf-mini-neck-dot { position: relative; z-index: 2; display: inline-flex; width: 20px; height: 20px; border-radius: 999px; align-items: center; justify-content: center; padding: 0 3px; text-align: center; font-size: 6px; line-height: 1.05; font-weight: 700; box-shadow: 0 0 0 2px rgba(15,23,42,0.08); }
    .pdf-mini-neck-dot--bass { box-shadow: inset 0 0 0 2px rgba(0,0,0,0.95); }
    .pdf-mini-neck-inlay { position: absolute; bottom: 4px; width: 8px; height: 8px; border-radius: 999px; background: var(--fret-inlay-bg-soft, rgba(159,192,212,0.78)); z-index: 1; }
    .pdf-mini-neck-inlay--active { opacity: 0.32; }
    .pdf-mini-neck-muted { font-size: 9px; font-weight: 700; color: #94a3b8; }
    @media print {
      body { background: #fff; }
      a { color: inherit; text-decoration: none; }
      .pdf-page { max-width: none; margin: 0; padding: 0; }
    }
    @page { size: A4; margin: 14mm; }
  </style>
</head>
<body>
  <main class="pdf-page">
    <section class="pdf-header">
      <h1>${escapeHtml(`Estudio del acorde ${d?.chordName || "—"}`)}</h1>
      <p>Documento generado desde Modo estudio. Fecha de exportación: ${escapeHtml(exportDateText)}.</p>
      <div class="pdf-meta">
        ${studyHeaderRows.map(([label, value]) => `<div><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</div>`).join("")}
      </div>
    </section>

    <nav class="pdf-index">
      <h2>Índice general</h2>
      <ol>${substitutionIndexHtml}</ol>
    </nav>

    <section class="pdf-cards">
      ${summaryCardsHtml}
    </section>

    ${studyVoicingHtml}

    ${substitutionSectionsHtml}
  </main>
</body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        window.setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 150);
      };
    };
    return (
      <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              <InfoTitle label="Modo estudio" info={CHORD_STUDY_INFO_TEXT} alwaysShow />
            </div>
            <div className="text-xs text-slate-600">
              {d?.title} · {d?.chordName}{studyRelativeChord ? ` · ${studyRelativeChord.shortText}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {studyOpen ? (
              <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={exportStudyPdf}>
                Exportar PDF
              </button>
            ) : null}
            <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={() => setStudyOpen((v) => !v)}>
              {studyOpen ? "Ocultar" : "Ver análisis"}
            </button>
          </div>
        </div>

        {studyOpen ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-700">Identidad</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div><b>Nombre:</b> {d?.chordName}</div>
                <div><b>Relativo:</b> {studyRelativeChord ? `${studyRelativeChord.kind} · ${studyRelativeChord.label}` : "—"}</div>
                <div><b>Capa:</b> {chordEngineLayerLabel(d?.plan)}</div>
                <div><b>Generador:</b> {chordEngineGeneratorLabel(d?.plan)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-700">Dominantes relacionados</div>
              <div className="mt-2 space-y-3 text-xs text-slate-600">
                <div>
                  <div className="font-semibold text-slate-700">Dominante normal</div>
                  <div><b>Acorde:</b> {dominant.name}</div>
                  <div><b>Función:</b> {dominant.relation}</div>
                  <div><b>Notas:</b> {dominant.notes.join(" · ")}</div>
                </div>
                <div className="border-t border-slate-200 pt-2">
                  <div className="font-semibold text-slate-700">Backdoor dominant</div>
                  <div><b>Acorde:</b> {backdoorDominant.name}</div>
                  <div><b>Función:</b> {backdoorDominant.relation}</div>
                  <div><b>Notas:</b> {backdoorDominant.notes.join(" · ")}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-700">Por qué se nombra así</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {naming.length ? naming.map((r, i) => <div key={i}>• {r}</div>) : <div>• Sin explicación adicional.</div>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-700">Construcción</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div><b>Fórmula:</b> {d?.intervals?.join(" · ") || "—"}</div>
                <div><b>Notas:</b> {d?.notes?.join(" · ") || "—"}</div>
                <div><b>Bajo:</b> {d?.bassName || "—"}</div>
                <div><b>Inversión:</b> {d?.inversionLabel}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-700">Voicing actual</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div><b>Tipo:</b> {studyVoicingFormLabel(d?.voicing, d?.plan?.form)}</div>
                <div><b>Digitación:</b> {d?.voicing?.frets || "—"}</div>
                <div><b>Distancia:</b> {d?.voicing ? (d.voicing.reach ?? (d.voicing.span + 1)) : "—"}</div>
                <div><b>Rango de alturas:</b> {d?.voicing?.pitchSpan ?? "—"} semitonos</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-700">{isQuartalStudy ? "Estructura cuartal real" : "Selección vs voicing real"}</div>
              {isQuartalStudy ? (
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div><b>Apilado pedido:</b> {positionFormLabel(d?.plan?.form)} · <b>Apilado real:</b> {studyVoicingFormLabel(d?.voicing, d?.plan?.form)}</div>
                  <div><b>Referencia:</b> {quartalReferenceLabel}</div>
                  <div><b>Grado real:</b> {quartalDegreeText}</div>
                  <div><b>Cadena de cuartas:</b> {quartalStepText}</div>
                  <div><b>Notas reales:</b> {voicingAnalysis.actualNotes.join(" · ") || "—"}</div>
                  <div><b>Bajo real:</b> {voicingAnalysis.actualBass}</div>
                  <div><b>Inv. real:</b> {voicingAnalysis.actualInversion}</div>
                </div>
              ) : (
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div><b>Pedido:</b> {voicingAnalysis.requested.join(" · ") || "—"}</div>
                  <div><b>Real:</b> {voicingAnalysis.actual.join(" · ") || "—"}</div>
                  <div><b>Notas reales:</b> {voicingAnalysis.actualNotes.join(" · ") || "—"}</div>
                  <div><b>Forma selección:</b> {voicingAnalysis.requestedForm} · <b>Forma real:</b> {voicingAnalysis.actualForm}</div>
                  <div><b>Bajo selección:</b> {voicingAnalysis.requestedBass} · <b>Bajo real:</b> {voicingAnalysis.actualBass}</div>
                  <div><b>Inv. real:</b> {voicingAnalysis.actualInversion}</div>
                  <div><b>Falta:</b> {voicingAnalysis.missing.join(" · ") || "ninguna"}</div>
                  <div><b>Sobra:</b> {voicingAnalysis.extra.join(" · ") || "nada"}</div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-700">Tensiones según escala</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div><b>Escala activa:</b> {pcToName(rootPc, preferSharps)} {scaleName}</div>
                <div><b>Disponibles:</b> {tensionAnalysis.available.join(" · ") || "ninguna clara"}</div>
                <div><b>No disponibles:</b> {tensionAnalysis.unavailable.join(" · ") || "ninguna"}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-700">Reglas</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {rules.length ? rules.map((r, i) => <div key={i}>• {r}</div>) : <div>• Sin restricciones especiales.</div>}
              </div>
            </div>

            {studyStaffEvents.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                <div className="text-xs font-semibold text-slate-700">Pentagrama del voicing real</div>
                <div className="mt-1 text-xs text-slate-600">
                  Notas según cuerdas y trastes reales del voicing actual: {studyVoicingPositionsText}
                </div>
                <div className="mt-2">
                  <MusicStaff
                    events={studyStaffEvents}
                    preferSharps={d?.preferSharps ?? chordPreferSharps}
                    clefMode="guitar"
                    keySignature={{ type: null, count: 0 }}
                    showFooter
                    footerLabels={[d?.chordName || "Voicing"]}
                  />
                </div>
              </div>
            ) : null}
            </div>

            {substitutionSections.length ? (
              <div className="mt-4">
                <div className="mb-3 text-sm font-semibold text-slate-800">Sustituciones y reharmonización</div>
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                  <div className="flex flex-wrap gap-2">
                    {substitutionSections.map((section, sectionIdx) => (
                      <button
                        key={`tab-${section.title}`}
                        type="button"
                        onClick={() => setStudySubstitutionSectionIdx(sectionIdx)}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          sectionIdx === studySubstitutionSectionIdx
                            ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                            : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-900"
                        }`}
                      >
                        {substitutionTabLabels[sectionIdx] || section.title}
                      </button>
                    ))}
                  </div>
                </div>

                {activeSubstitutionSection ? (() => {
                    const section = activeSubstitutionSection;
                    const sectionIdx = studySubstitutionSectionIdx;
                    const sectionId = buildStudyAnchorId("study-subsection", section.title);
                    const prevSection = sectionIdx > 0 ? substitutionSections[sectionIdx - 1] : null;
                    const nextSection = sectionIdx < substitutionSections.length - 1 ? substitutionSections[sectionIdx + 1] : null;

                    return (
                      <div className="mt-4">
                      <div key={section.title} id={sectionId} className="scroll-mt-6 rounded-xl border border-slate-200 bg-slate-100 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-semibold leading-6 text-slate-800">{section.title}</div>
                            <div className="mt-1.5 text-justify text-xs leading-5 text-slate-500">{section.caption}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {prevSection ? (
                              <button
                                type="button"
                                onClick={() => setStudySubstitutionSectionIdx(sectionIdx - 1)}
                                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                                title={`Ir a ${prevSection.title}`}
                              >
                                ←
                              </button>
                            ) : (
                              <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-400">←</span>
                            )}
                            {nextSection ? (
                              <button
                                type="button"
                                onClick={() => setStudySubstitutionSectionIdx(sectionIdx + 1)}
                                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                                title={`Ir a ${nextSection.title}`}
                              >
                                →
                              </button>
                            ) : (
                              <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-400">→</span>
                            )}
                          </div>
                        </div>

                        {section.items.length ? (
                          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-sm font-semibold text-slate-700">Índice de la sección</div>
                            <div className="mt-3 grid gap-2">
                              {section.items.map((item, itemIdx) => {
                                const itemId = buildStudyAnchorId("study-subitem", section.title, item.title);
                                return (
                                  <a
                                    key={`index-${section.title}-${item.title}`}
                                    href={`#${itemId}`}
                                    className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                                  >
                                    {`${sectionIdx + 1}.${itemIdx + 1} ${item.title}`}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-4 space-y-4 text-justify text-sm leading-6 text-slate-600">
                          {section.items.map((item, itemIdx) => {
                            const itemId = buildStudyAnchorId("study-subitem", section.title, item.title);
                            const numberedTitle = `${sectionIdx + 1}.${itemIdx + 1} ${item.title}`;
                            return (
                              <div key={`${section.title}-${item.title}`} id={itemId} className={`${itemIdx ? "border-t border-slate-200 pt-4" : ""} scroll-mt-6`}>
                                <div className="text-base font-semibold leading-6 text-slate-800">{numberedTitle}</div>
                                <div className="mt-3 space-y-3">
                                  {renderStudyOuterBlock("Qué es", item.definition)}
                                  {renderStudyOuterBlock("Cuándo aplica", item.appliesWhen)}
                                  {renderStudyOuterBlock("Cómo sale", item.derivation)}
                                  {renderStudyOuterBlock("Ejemplos y lectura", item.examples)}
                                </div>
                                {Array.isArray(item.staffGroups) && item.staffGroups.length ? (
                                  <div className="space-y-3 pt-4">
                                    {item.staffGroups.filter((group) => group?.events?.length).map((group, groupIdx) => (
                                      <div
                                        key={`${item.title}-staff-${groupIdx}-${group.title}-${group.labels?.join("|") || ""}-${group.events.map((evt) => evt.notes.join(",")).join("|")}`}
                                        className="rounded-lg border border-slate-200 bg-white p-3"
                                      >
                                        <div className="text-xs font-semibold text-slate-700">{group.title}</div>
                                        {group.caption ? <div className="mt-1 text-justify text-xs leading-5 text-slate-500">{group.caption}</div> : null}
                                        {Array.isArray(group.labels) && group.labels.length ? (
                                          <div className="mt-2 text-justify text-xs leading-5 text-slate-600">Acordes en este orden: {group.labels.join(" · ")}</div>
                                        ) : null}
                                        <div className="mt-3">
                                          <MusicStaff
                                            events={group.events}
                                            preferSharps={d?.preferSharps ?? chordPreferSharps}
                                            clefMode="guitar"
                                            keySignature={group.keySignature ?? substitutionKeySignature}
                                            showFooter
                                            footerLabels={group.labels}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      </div>
                    );
                  })() : null}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    );
  }


  useEffect(() => {
    setNearSlots((prev) => {
      let changed = false;
      const next = prev.map((slot, idx) => {
        if (!slot?.enabled) return slot;

        const options = nearComputed.ranked[idx]?.ranked || [];
        if (!options.length) {
          return slot;
        }

        let nextFrets = slot.selFrets ?? null;

        const pending = pendingNearRestoreRef.current[idx];
        if (pending?.active) {
          if (pending.frets == null) {
            pendingNearRestoreRef.current[idx] = { active: false, frets: null };
          } else if (options.some((v) => v.frets === pending.frets)) {
            nextFrets = pending.frets;
            pendingNearRestoreRef.current[idx] = { active: false, frets: null };
          } else {
            return slot;
          }
        }

        const keepCurrent = !!nextFrets && options.some((v) => v.frets === nextFrets);
        if (!keepCurrent) {
          const ref = lastNearVoicingsRef.current[idx] || null;
          nextFrets = options[nearestVoicingIndex(ref, options)]?.frets ?? options[0]?.frets ?? null;
        }

        if ((slot.selFrets ?? null) !== (nextFrets ?? null)) {
          changed = true;
          skipNearVoicingRefSyncRef.current[idx] = true;
          return { ...slot, selFrets: nextFrets };
        }
        return slot;
      });

      return changed ? next : prev;
    });
  }, [storageHydrated, nearComputed.ranked, nearRankSig]);

  useEffect(() => {
    if (!storageHydrated) return;
    if (!nearSelectedSig) return;
    nearComputed.selected.forEach((v, i) => {
      if (skipNearVoicingRefSyncRef.current[i]) {
        skipNearVoicingRefSyncRef.current[i] = false;
        return;
      }
      if (v) lastNearVoicingsRef.current[i] = v;
    });
  }, [storageHydrated, nearComputed.selected, nearSelectedSig]);


  const spelledScaleNotes = useMemo(() => spellScaleNotes({ rootPc, scaleIntervals, preferSharps }), [rootPc, scaleIntervals, preferSharps]);
  const spelledExtraNotes = useMemo(() => spellScaleNotes({ rootPc, scaleIntervals: extraIntervals, preferSharps }), [rootPc, extraIntervals, preferSharps]);
  const scaleTetradHarmony = useMemo(
    () => buildScaleTetradHarmonization({ rootPc, scaleName, harmonyMode, scaleIntervals, spelledScaleNotes, preferSharps }),
    [rootPc, scaleName, harmonyMode, scaleIntervals, spelledScaleNotes, preferSharps]
  );
  const scaleTetradDegreesText = useMemo(
    () => scaleTetradHarmony.map((x) => x.degreeName).join(" · "),
    [scaleTetradHarmony]
  );
  const scaleTetradNotesText = useMemo(
    () => scaleTetradHarmony.map((x) => x.noteName).join(" · "),
    [scaleTetradHarmony]
  );

  // Acordes de la escala activa (armonización real según la escala seleccionada arriba)
  const harmonizedScale = useMemo(() => {
    const base = nearSlots.find((s) => s?.enabled && String(s?.family || "tertian") === "tertian")
      || nearSlots.find((s) => !!s?.enabled)
      || nearSlots?.[0]
      || {};
    const withSeventh = String(base?.family || "tertian") === "tertian"
      ? base.structure === "tetrad" || !!base.ext7
      : true;
    const manualHarmony = buildManualScaleHarmonySpecs({ rootPc, scaleName, scaleIntervals, spelledScaleNotes, preferSharps });

    if (manualHarmony?.length) {
      return {
        tonicName: spelledScaleNotes[0] || pcToName(rootPc, preferSharps),
        scaleLabel: scaleName,
        withSeventh: true,
        degrees: manualHarmony,
        names: manualHarmony.map((item) => item.name),
        preferredDegreeIdx: [1, 2, 3].filter((i) => i < manualHarmony.length),
      };
    }

    const degrees = scaleIntervals.map((interval, i) => {
      const built = buildHarmonyDegreeChord({ scaleName, harmonyMode, scaleIntervals, degreeIndex: i, withSeventh });
      const noteName = spelledScaleNotes[i] || pcToName(mod12(rootPc + interval), preferSharps);
      const chordRootPc2 = mod12(rootPc + interval);

      if (!built) {
        return {
          rootPc: chordRootPc2,
          supported: false,
          name: `${noteName}?`,
          noteName,
        };
      }

      const suffix = chordDisplaySuffixOnly({
        quality: built.quality,
        suspension: built.suspension,
        structure: built.structure,
        ext7: built.ext7,
        ext6: built.ext6,
        ext9: built.ext9,
        ext11: built.ext11,
        ext13: built.ext13,
      });

      return {
        ...built,
        rootPc: chordRootPc2,
        spellPreferSharps: preferSharps,
        supported: true,
        noteName,
        name: `${noteName}${suffix}`,
      };
    });

    return {
      tonicName: spelledScaleNotes[0] || pcToName(rootPc, preferSharps),
      scaleLabel: scaleName,
      withSeventh,
      degrees,
      preferredDegreeIdx: [1, 3, 4].filter((i) => i < degrees.length),
      names: (MANUAL_SCALE_TETRAD_PRESETS[normalizeScaleName(scaleName)] || (withSeventh && scaleTetradHarmony.length)) ? scaleTetradHarmony.map((x) => x.noteName) : degrees.map((d) => d.name),
    };
  }, [
    nearSlots,
    scaleIntervals,
    spelledScaleNotes,
    scaleTetradHarmony,
    rootPc,
    harmonyMode,
    preferSharps,
    scaleName,
  ]);

  const nearTonalityAnalysis = useMemo(
    () => analyzeChordSetTonality({ slots: nearSlots, harmonyMode }),
    [nearSlots, harmonyMode]
  );

  useEffect(() => {
    if (!storageHydrated) return;
    if (!nearAutoScaleSync) return;
    setNearSlots((prev) => {
      if (!prev?.length) return prev;

      const s0 = prev[0] || {};
      const family = String(s0.family || "tertian");
      let patch = null;

      if (family === "quartal") {
        patch = {
          rootPc,
          spellPreferSharps: preferSharps,
          ...(s0.quartalReference === "scale" && CHORD_QUARTAL_SCALE_NAMES.includes(normalizeScaleName(scaleName))
            ? { quartalScaleName: normalizeScaleName(scaleName) }
            : {}),
        };
      } else if (family === "guide_tones") {
        patch = {
          rootPc,
          spellPreferSharps: preferSharps,
        };
      } else {
        const withSeventh = s0.structure === "tetrad" || !!s0.ext7;
        const built = buildHarmonyDegreeChord({ scaleName, harmonyMode, scaleIntervals, degreeIndex: 0, withSeventh });
        if (!built) return prev;

        patch = {
          rootPc: mod12(rootPc + built.rootOffset),
          quality: built.quality,
          suspension: "none",
          structure: built.structure,
          inversion: "root",
          form: "open",
          positionForm: "open",
          ext7: built.ext7,
          ext6: false,
          ext9: false,
          ext11: false,
          ext13: false,
          spellPreferSharps: preferSharps,
        };
      }

      let changed = false;
      for (const k of Object.keys(patch)) {
        if (s0?.[k] !== patch[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;

      const next = [...prev];
      next[0] = { ...s0, ...patch };
      return next;
    });
  }, [storageHydrated, nearAutoScaleSync, rootPc, scaleName, harmonyMode, scaleIntervals, preferSharps]);

  // Auto-propuesta: si un slot NO está activo, lo ajustamos a grados diatónicos de la escala activa.
  // Se mantienen ii / IV / V como propuesta por defecto cuando existan en la escala.
  useEffect(() => {
    if (!storageHydrated) return;
    if (!nearAutoScaleSync) return;
    setNearSlots((prev) => {
      if (!prev?.length) return prev;

      const preferredDegreeIdx = harmonizedScale.preferredDegreeIdx?.length
        ? harmonizedScale.preferredDegreeIdx
        : [1, 3, 4].filter((i) => i < harmonizedScale.degrees.length);
      let changed = false;

      const next = prev.map((s, i) => {
        if (i === 0) return s;
        if (s?.enabled) return s;

        const degree = harmonizedScale.degrees[preferredDegreeIdx[i - 1]];
        if (!degree?.supported) return s;

        const patch = {
          family: "tertian",
          rootPc: degree.rootPc,
          quality: degree.quality,
          suspension: degree.suspension,
          structure: degree.structure,
          inversion: "root",
          form: "open",
          positionForm: "open",
          ext7: degree.ext7,
          ext6: false,
          ext9: false,
          ext11: false,
          ext13: false,
          spellPreferSharps: degree.spellPreferSharps,
        };

        for (const k of Object.keys(patch)) {
          if (s?.[k] !== patch[k]) {
            changed = true;
            return { ...s, ...patch };
          }
        }
        return s;
      });

      return changed ? next : prev;
    });
  }, [storageHydrated, nearAutoScaleSync, harmonizedScale]);


  const _spelledChordNotes = useMemo(
    () => spellChordNotes({ rootPc: chordRootPc, chordIntervals, preferSharps: chordPreferSharps }),
    [chordRootPc, chordIntervals, chordPreferSharps]
  );

  const legend = useMemo(() => {
    const thirds = thirdOffsets.map((o) => (o === 3 ? "m3" : "M3")).join(" / ");
    return {
      root: "Raíz (1)",
      third: thirdOffsets.length ? `3ª (${thirds})` : "3ª (no está)",
      fifth: hasFifth ? "5ª (P5)" : "5ª (no está)",
      other: "Otras notas de la escala",
      extra: "Notas extra",
    };
  }, [thirdOffsets, hasFifth]);

  // --------------------------------------------------------------------------
  // HELPERS LOCALES: ROLES Y ETIQUETAS MUSICALES
  // --------------------------------------------------------------------------

  // Escala activa
  function roleOfPc(pc) {
    const interval = mod12(pc - rootPc);

    // Blues: la “blue note” se pinta como NOTA EXTRA (mismo color que extras), aunque forme parte de la escala.
    // - Blues (menor): b5 / #4 => 6
    // - Blues (mayor): b3 => 3
    const bluesBlue = scaleName === "Pentatónica menor + blue note" ? 6 : scaleName === "Pentatónica mayor + blue note" ? 3 : null;
    if (bluesBlue != null && interval === bluesBlue) return "extra";

    if (interval === 0) return "root";
    if (thirdOffsets.includes(interval)) return "third";
    if (interval === 7) return "fifth";
    return "other";
  }

  // Acorde principal
  function chordRoleOfPc(pc) {
    const interval = mod12(pc - chordRootPc);
    const seventh = chordExt7 ? seventhOffsetForQuality(chordQuality) : null;

    if (interval === 0) return "root";
    if (interval === chordThirdOffset) return "third";
    if (interval === chordFifthOffset) return "fifth";
    if (hasEffectiveSeventh({ structure: chordStructure, ext7: chordExt7, ext6: chordExt6, ext9: chordExt9, ext11: chordExt11, ext13: chordExt13 }) && seventh != null && interval === mod12(seventh)) return "seventh";
    if (chordExt13 && interval === 9) return "thirteenth";
    if (chordExt11 && interval === 5) return "eleventh";
    if (chordExt9 && interval === 2) return "ninth";
    if (chordExt6 && interval === 9) return "sixth";
    return "other";
  }

  function circleStyle(role) {
    const bg = colors[role] || "#e2e8f0";
    const dark = isDark(bg);
    return {
      backgroundColor: bg,
      color: role === "other" ? "#0f172a" : dark ? "#ffffff" : "#0f172a",
      boxShadow: `0 0 0 2px ${rgba(bg, 0.25)}`,
    };
  }

  function getDisplayRole({ pc, inScale, inExtra }) {
    const role = roleOfPc(pc);
    if (role !== "other") return role;
    if (inExtra) return "extra";
    if (inScale) return "other";
    return null;
  }

  function labelForPc(pc) {
    const interval = mod12(pc - rootPc);
    const itv = intervalToDegreeToken(interval);
    const note = pcToName(pc, preferSharps);

    const showI = !!showIntervalsLabel;
    const showN = !!showNotesLabel;

    if (!showI && !showN) return itv;
    if (showI && showN) return `${itv}-${note}`;
    if (showI) return itv;
    return note;
  }

  function labelForCellAt(sIdx, fret) {
    return labelForPc(mod12(STRINGS[sIdx].pc + fret));
  }

  // Etiqueta rápida al pasar el ratón por una celda
  function hoverCellNoteText(sIdx, fret) {
    const pc = mod12(STRINGS[sIdx].pc + fret);
    return pcToDualName(pc);
  }

  function labelForChordPc(pc) {
    const interval = mod12(pc - chordRootPc);
    const idx = chordIntervals.findIndex((x) => mod12(x) === interval);
    const itv = idx >= 0 && chordDegreeLabels?.[idx]
      ? chordDegreeLabels[idx]
      : intervalToChordToken(interval, { ext6: chordExt6, ext9: chordExt9 && chordStructure !== "triad", ext11: chordExt11 && chordStructure !== "triad", ext13: chordExt13 && chordStructure !== "triad" });
    const note = chordPcToSpelledName(pc);

    const showI = !!showIntervalsLabel;
    const showN = !!showNotesLabel;

    if (!showI && !showN) return itv;
    if (showI && showN) return `${itv}-${note}`;
    if (showI) return itv;
    return note;
  }

  // --------------------------------------------------------------------------
  // HELPERS LOCALES: MUTADORES DE COLOR Y AJUSTES VISUALES
  // --------------------------------------------------------------------------

  function setColor(key, value) {
    setColors((c) => ({ ...c, [key]: value }));
  }

  function setPatternColor(i, value) {
    setPatternColors((arr) => {
      const next = [...arr];
      next[i] = value;
      return next;
    });
  }

  function setNearBgColor(idx, value) {
    setNearBgColors((arr) => {
      const next = [...arr];
      next[idx] = value;
      return next;
    });
  }

  function setClusterTestDot(idx, key, value) {
    setClusterTestDots((prev) => prev.map((dot, i) => {
      if (i !== idx) return dot;
      const n = Number(value);
      if (!Number.isFinite(n)) return dot;
      return {
        ...dot,
        [key]: key === "size"
          ? Math.max(8, Math.min(40, n))
          : Math.max(-20, Math.min(80, n)),
      };
    }));
  }

  // --------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS: PATRONES, RUTA Y ESCALAS
  // --------------------------------------------------------------------------

  // Patrones (para el 2º mástil)
  const patternsMerged = useMemo(() => {
    // AUTO: mantiene el comportamiento existente
    if (patternsMode === "auto") {
      if (usesFiveNoteBoxPatterns) {
        const inst = buildPentatonicBoxInstances({ rootPc, scaleIntervals, maxFret });
        return mergeInstancesToPatterns(inst, 5, "Box");
      }
      if (scaleIntervals.length === 7) {
        return build3NpsPatternsMerged({ rootPc, scaleIntervals, maxFret });
      }
      return [];
    }

    if (patternsMode === "caged") {
      const inst = buildCagedPatternInstances({ rootPc, scaleIntervals, maxFret });
      return pickCagedViewPatterns({ instances: inst, maxFret });
    }

    if (patternsMode === "boxes") {
      if (scaleIntervals.length === 5) {
        const inst = buildPentatonicBoxInstances({ rootPc, scaleIntervals, maxFret });
        return mergeInstancesToPatterns(inst, 5, "Box");
      }
      return [];
    }

    if (patternsMode === "nps") {
      if (scaleIntervals.length === 7) return build3NpsPatternsMerged({ rootPc, scaleIntervals, maxFret });
      return [];
    }

    return [];
  }, [patternsMode, usesFiveNoteBoxPatterns, rootPc, scaleIntervals, maxFret]);

  const patternMembership = useMemo(() => buildMembershipMap(patternsMerged), [patternsMerged]);

  const kingBoxOverlay = useMemo(
    () => buildKingBoxOverlayMap({
      enabled: isKingBoxEligibleScale && showKingBoxes,
      mode: kingBoxMode,
      rootPc,
      maxFret,
    }),
    [isKingBoxEligibleScale, showKingBoxes, kingBoxMode, rootPc, maxFret]
  );

  function patternBgStyle(cellKey) {
    const idxs = patternMembership.get(cellKey) || [];
    if (!idxs.length) return {};
    const a = idxs[0];
    const b = idxs[1];
    if (b == null) {
      const c = patternColors[a] || "#e2e8f0";
      return { backgroundColor: rgba(c, 0.65) };
    }
    const c1 = rgba(patternColors[a] || "#e2e8f0", 0.65);
    const c2 = rgba(patternColors[b] || "#e2e8f0", 0.65);
    return { backgroundImage: `linear-gradient(135deg, ${c1} 0%, ${c1} 50%, ${c2} 50%, ${c2} 100%)` };
  }

  // Ruta
  const routeLabStartPos = useMemo(() => parsePosCode(routeLabStartCode), [routeLabStartCode]);
  const routeLabEndPos = useMemo(() => parsePosCode(routeLabEndCode), [routeLabEndCode]);

  const routeLabCurrentTuning = useMemo(() => ({
    ...ROUTE_LAB_DEFAULT_TUNING,
    switchWhenSameStringForwardPenalty: routeLabSwitchWhenSameStringForwardPenalty,
    worseThanSameStringGoalBase: routeLabWorseThanSameStringGoalBase,
    worseThanSameStringGoalScale: routeLabWorseThanSameStringGoalScale,
    corridorPenalty: routeLabCorridorPenalty,
    overshootNearEndAlt: routeLabOvershootNearEndAlt,
  }), [
    routeLabSwitchWhenSameStringForwardPenalty,
    routeLabWorseThanSameStringGoalBase,
    routeLabWorseThanSameStringGoalScale,
    routeLabCorridorPenalty,
    routeLabOvershootNearEndAlt,
  ]);

  const routeLabResult = useMemo(() => computeRouteLab({
    rootPc,
    scaleName,
    scaleIntervals,
    maxFret,
    startPos: routeLabStartPos,
    endPos: routeLabEndPos,
    maxNotesPerString: routeLabMaxPerString,
    tuning: routeLabCurrentTuning,
  }), [
    rootPc,
    scaleName,
    scaleIntervals,
    maxFret,
    routeLabStartPos,
    routeLabEndPos,
    routeLabMaxPerString,
    routeLabCurrentTuning,
  ]);

  const routeLabIndexByCell = useMemo(() => {
    const m = new Map();
    routeLabResult.path.forEach((n, i) => m.set(`${n.sIdx}:${n.fret}`, i + 1));
    return m;
  }, [routeLabResult.path]);

  const routeLabText = useMemo(
    () => routeLabResult.path.map((n) => `${n.sIdx + 1}${n.fret}`).join(" \u2192 "),
    [routeLabResult.path]
  );

  const routeKeySignature = useMemo(
    () => resolveKeySignatureForScale({ rootPc, scaleName }),
    [rootPc, scaleName]
  );

  const routeStaffEvents = useMemo(
    () => routeLabResult.path.map((n) => ({
      notes: [pitchAt(n.sIdx, n.fret) + 12],
      spelledNotes: [pcToName(mod12(STRINGS[n.sIdx].pc + n.fret), preferSharps)],
    })),
    [routeLabResult.path, preferSharps]
  );

  const routeLabDebugLines = useMemo(() => {
    return (routeLabResult.debugSteps || []).map((step, idx) => {
      const chunks = [];
      chunks.push(`${idx + 1}. ${step.from} \u2192 ${step.to}`);
      chunks.push(step.sameString ? `misma cuerda · ${step.df} trastes` : `cambio cuerda ${step.ds} · ${step.df} trastes`);
      chunks.push(`bloque=${step.runCount}`);
      chunks.push(`corredor=${step.corridorDev}`);
      if (step.targetSideOvershoot > 0) chunks.push(`overshoot objetivo=${step.targetSideOvershoot}`);
      if (step.hadSameStringForward && step.bestSameStringForwardFret != null && !step.sameString) {
        chunks.push(`había opción misma cuerda hacia traste ${step.bestSameStringForwardFret}`);
      }
      if (step.hadNonOvershootingAlternative && step.targetSideOvershoot > 0) {
        chunks.push(`había alternativa sin pasarse del objetivo`);
      }
      if (step.templateText) {
        chunks.push(step.templateText);
      }
      chunks.push(`coste paso=${step.stepCost}`);
      chunks.push(`coste acumulado=${step.totalCost}`);
      return chunks.join(" · ");
    });
  }, [routeLabResult.debugSteps]);

  const startPos = useMemo(() => parsePosCode(routeStartCode), [routeStartCode]);
  const endPos = useMemo(() => parsePosCode(routeEndCode), [routeEndCode]);

  const fixedPatternIdx = useMemo(() => {
    if (routeFixedPattern === "auto") return null;
    const n = parseInt(routeFixedPattern, 10);
    return Number.isFinite(n) ? n : null;
  }, [routeFixedPattern]);

  // Instancias para ruta (separamos pentatónicas de 7 notas)
  const pentaBoxInstances = useMemo(() => {
    if (!usesFiveNoteBoxPatterns) return [];
    return buildPentatonicBoxInstances({ rootPc, scaleIntervals, maxFret });
  }, [usesFiveNoteBoxPatterns, rootPc, scaleIntervals, maxFret]);

  const pentaBoxMembership = useMemo(() => buildInstanceMembershipMap(pentaBoxInstances), [pentaBoxInstances]);

  const npsInstances = useMemo(() => {
    if (scaleIntervals.length !== 7) return [];
    return build3NpsPatternInstances({ rootPc, scaleIntervals, maxFret });
  }, [rootPc, scaleIntervals, maxFret]);

  const npsMembership = useMemo(() => buildInstanceMembershipMap(npsInstances), [npsInstances]);

  const cagedInstances = useMemo(() => {
    return buildCagedPatternInstances({ rootPc, scaleIntervals, maxFret });
  }, [rootPc, scaleIntervals, maxFret]);

  const cagedMembership = useMemo(() => buildInstanceMembershipMap(cagedInstances), [cagedInstances]);

  const routeResult = useMemo(() => {
    const modePenalty = (m) => (m === "penta" || m === "nps" ? 0 : m === "pos" ? 2.0 : 4.0);

    const runMode = (m, keepOverride = null) => {
      const keep = keepOverride == null ? routeKeepPattern : keepOverride;

      let internalMode = "free";
      let instances = [];
      let membership = new Map();
      let typeFilter = null;

      if (m === "penta" && usesFiveNoteBoxPatterns) {
        internalMode = "pattern";
        instances = pentaBoxInstances;
        membership = pentaBoxMembership;
        typeFilter = fixedPatternIdx;
      } else if (m === "nps" && scaleIntervals.length === 7) {
        internalMode = "pattern";
        instances = npsInstances;
        membership = npsMembership;
        typeFilter = fixedPatternIdx;
      } else if (m === "caged") {
        internalMode = "pattern";
        instances = cagedInstances;
        membership = cagedMembership;
        typeFilter = fixedPatternIdx;
      } else if (m === "pos") {
        internalMode = "pos";
      } else {
        internalMode = "free";
      }

      const baseArgs = {
        rootPc,
        scaleIntervals,
        maxFret,
        startPos,
        endPos,
        routeMode: internalMode,
        fixedPatternIdx: typeFilter,
        allowPatternSwitch,
        patternSwitchPenalty,
        maxNotesPerString: Math.max(1, Math.min(5, routeMaxPerString)),
        preferNps: routePreferNps,
        preferVertical: routePreferVertical,
        strictFretDirection: routeStrictFretDirection,
        patternInstances: instances,
        instanceMembership: membership,
        preferKeepPattern: keep,
        positionWindowSize: 6,
        maxPositionShiftPerStep: 2,
        positionShiftPenalty: 0.7,
        maxFretJumpPerStep: internalMode === "pattern" ? 5 : internalMode === "pos" ? 6 : 7,
        maxStringJumpPerStep: internalMode === "pattern" ? 1 : 2,
        maxInstanceShift: internalMode === "pattern" ? 3 : 99,
        initAnchorPenalty: internalMode === "pattern" ? 0.8 : 0,
      };

      const tries = routeStrictFretDirection ? [1, -1] : [0];
      let bestTry = { res: { path: [], cost: null, reason: "No encontré ruta" }, score: Infinity };

      for (const forcedTrend of tries) {
        const res = computeMusicalRoute({ ...baseArgs, forcedFretTrend: forcedTrend });
        if (res.reason) continue;
        const score = (res.cost ?? 0) + modePenalty(m);
        if (score < bestTry.score) bestTry = { res, score };
      }

      return bestTry;
    };

    const pickBest = (modes) => {
      let best = { res: { path: [], cost: null, reason: "No encontré ruta" }, score: Infinity };
      for (const m of modes) {
        let a = runMode(m, null);
        if (!Number.isFinite(a.score) && routeKeepPattern) a = runMode(m, false);
        if (a.score < best.score) best = a;
      }
      return best.res;
    };

    if (routeMode === "auto") {
      // Mantiene comportamiento previo (no añade CAGED a auto para no romper resultados existentes)
      if (usesFiveNoteBoxPatterns) return pickBest(["penta", "pos", "free"]);
      if (scaleIntervals.length === 7) return pickBest(["nps", "pos", "free"]);
      return pickBest(["pos", "free"]);
    }

    // Manual
    if (routeMode === "penta" && usesFiveNoteBoxPatterns) return pickBest(["penta"]);
    if (routeMode === "nps" && scaleIntervals.length === 7) return pickBest(["nps"]);
    if (routeMode === "caged") return pickBest(["caged"]);
    if (routeMode === "pos") return pickBest(["pos"]);
    return pickBest(["free"]);
  }, [
    rootPc,
    scaleIntervals,
    maxFret,
    startPos,
    endPos,
    routeMode,
    usesFiveNoteBoxPatterns,
    routeKeepPattern,
    fixedPatternIdx,
    allowPatternSwitch,
    patternSwitchPenalty,
    routeMaxPerString,
    routePreferNps,
    routePreferVertical,
    routeStrictFretDirection,
    pentaBoxInstances,
    pentaBoxMembership,
    npsInstances,
    npsMembership,
    cagedInstances,
    cagedMembership,
  ]);

  const routeIndexByCell = useMemo(() => {
    const m = new Map();
    routeResult.path.forEach((n, i) => m.set(`${n.sIdx}:${n.fret}`, i + 1));
    return m;
  }, [routeResult.path]);

  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS: ELEMENTOS BASE
  // --------------------------------------------------------------------------

  function HoverCellNote({ sIdx, fret, visible }) {
    if (!visible) return null;
    return (
      <div className="pointer-events-none absolute inset-0 z-[6] hidden items-center justify-center text-[10px] font-semibold text-slate-500 group-hover:flex">
        {hoverCellNoteText(sIdx, fret)}
      </div>
    );
  }

  function ToggleButton({ active, onClick, children, title }) {
    const fallbackTitle = typeof children === "string" ? children : "";
    return (
      <button
        type="button"
        onClick={onClick}
        title={title || fallbackTitle}
        className={`rounded-xl px-2 py-1.5 text-sm ring-1 ring-slate-200 shadow-sm ${active ? "bg-[#71a3c1] text-slate-900" : "bg-white text-slate-700 hover:bg-sky-50 hover:text-slate-900"}`}
      >
        {children}
      </button>
    );
  }

  function NavIconLabel({ icon, label }) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {React.createElement(icon, { className: "h-4 w-4 shrink-0", "aria-hidden": "true" })}
        <span>{label}</span>
      </span>
    );
  }

  function openMobileInfoPopover(event, title, text) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 360;
    const width = isMobileLayout
      ? Math.min(360, Math.max(240, viewportWidth - 24))
      : Math.min(620, Math.max(420, viewportWidth - 48));
    const centeredLeft = (viewportWidth - width) / 2;
    const left = Math.max(12, Math.min(centeredLeft, viewportWidth - width - 12));
    setMobileInfoPopover({
      title,
      text,
      left,
      top: rect.bottom + 8,
      width,
      arrowLeft: rect.left + rect.width / 2 - left,
    });
  }

  function InlineInfoButton({ label, info, className = "" }) {
    if (!info) return null;

    return (
      <button
        type="button"
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-600 hover:text-slate-900 ${className}`.trim()}
        onClick={(e) => openMobileInfoPopover(e, label, info)}
        aria-label={`Información sobre ${label}`}
        title={`Abrir información sobre ${label}`}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    );
  }

  function InfoTitle({ label, info, alwaysShow = false }) {
    if (!info) return label;
    if (!alwaysShow && !isMobileLayout) return label;

    return (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span>{label}</span>
        <InlineInfoButton label={label} info={info} />
      </span>
    );
  }

  function FretInlayRow({ kind }) {
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

  function WebFretNumberHeader({ fret }) {
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

  function MobileMainFretboard({ renderCell, frets = null }) {
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

        <div className="mt-2">
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
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS
  // --------------------------------------------------------------------------

  function Circle({ pc, role, fret, badge, kingTags = [] }) {
    const baseRole = role === "extra" ? "extra" : role;
    const tagList = Array.isArray(kingTags) ? kingTags : [];
    const baseStyle = circleStyle(baseRole);
    const boxShadowParts = [baseStyle.boxShadow].filter(Boolean);
    const hasBbKingTag = tagList.includes("bb");
    const hasAlbertKingTag = tagList.includes("albert");
    if (hasBbKingTag) boxShadowParts.push(`0 0 0 2px ${kingBoxColors.bb}`);
    if (hasAlbertKingTag) boxShadowParts.push(`0 0 0 ${hasBbKingTag ? 4 : 2}px ${kingBoxColors.albert}`);
    const kingTitle = tagList.length
      ? ` · ${tagList.map((tag) => tag === "bb" ? KING_BOX_DEFAULTS.bb.label : KING_BOX_DEFAULTS.albert.label).join(" + ")}`
      : "";
    return (
      <div
        className={`relative z-20 inline-flex items-center justify-center rounded-full text-[10px] font-semibold ${mobileVerticalOpenNoteClass(fret, isMobileLayout)}`}
        style={{ ...baseStyle, boxShadow: boxShadowParts.join(", ") }}
        title={`${pcToDualName(pc)} · ${intervalToDegreeToken(mod12(pc - rootPc))}${kingTitle}`}
      >
        {labelForPc(pc)}
        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold leading-none text-slate-700 shadow-sm ring-1 ring-slate-200">
            {badge}
          </span>
        ) : null}
      </div>
    );
  }

  function quartalRoleOfPc(pc) {
    const interval = mod12(pc - chordQuartalCurrentRootPc);
    const degreeRaw = intervalToSimpleChordDegreeToken(interval);
    return chordBadgeRoleFromDegreeLabel(degreeRaw, interval);
  }

  function labelForQuartalPc(pc) {
    const interval = mod12(pc - chordQuartalCurrentRootPc);
    const degreeRaw = intervalToSimpleChordDegreeToken(interval);
    const degree = formatChordBadgeDegree(degreeRaw);
    const note = spellNoteFromChordInterval(chordQuartalCurrentRootPc, interval, chordPreferSharps);

    const showI = !!showIntervalsLabel;
    const showN = !!showNotesLabel;

    if (!showI && !showN) return degree;
    if (showI && showN) return `${degree}-${note}`;
    if (showI) return degree;
    return note;
  }

  function quartalNoteNameForPc(pc) {
    const interval = mod12(pc - chordQuartalCurrentRootPc);
    return spellNoteFromChordInterval(chordQuartalCurrentRootPc, interval, chordPreferSharps);
  }

function ChordCircle({ role, isBass, displayLabel, titleText, fret = 1, compactOpen = false }) {
  const bg = colors[role] || colors.other;
  const dark = isDark(bg);

  return (
    <div
      className={`relative z-20 inline-flex ${fretNoteSizeClass(fret, isMobileLayout, compactOpen)} items-center justify-center rounded-full text-[10px] font-semibold`}
      style={{
        backgroundColor: bg,
        color: role === "other" ? "#0f172a" : dark ? "#ffffff" : "#0f172a",
        boxShadow: isBass
          ? `inset 0 0 0 2px ${rgba("#000000", 0.95)}`
          : `0 0 0 2px ${rgba(bg, 0.25)}`,
      }}
      title={titleText}
    >
      {displayLabel}
    </div>
  );
}



  function guideToneRoleOfPc(pc) {
    const interval = mod12(pc - chordRootPc);
    if (interval === mod12(guideToneDef.intervals[0])) return "root";
    if (interval === mod12(guideToneDef.intervals[1])) return "third";
    return String(guideToneDef.degreeLabels?.[2] || "7").includes("6") ? "sixth" : "seventh";
  }

  function labelForGuideTonePc(pc) {
    const interval = mod12(pc - chordRootPc);
    const idx = guideToneDef.intervals.findIndex((x) => mod12(x) === interval);
    const degreeRaw = guideToneDef.degreeLabels[idx] || intervalToSimpleChordDegreeToken(interval);
    const degree = formatChordBadgeDegree(degreeRaw);
    const note = spellNoteFromChordInterval(chordRootPc, interval, chordPreferSharps);

    const showI = !!showIntervalsLabel;
    const showN = !!showNotesLabel;
    if (!showI && !showN) return degree;
    if (showI && showN) return `${degree}-${note}`;
    if (showI) return degree;
    return note;
  }

  function GuideToneCircle({ pc, isBass, fret = 1, compactOpen = false }) {
    const role = guideToneRoleOfPc(pc);
    const bg = colors[role] || colors.other;
    const dark = isDark(bg);
    return (
      <div
        className={`relative z-20 inline-flex ${fretNoteSizeClass(fret, isMobileLayout, compactOpen)} items-center justify-center rounded-full text-[10px] font-semibold`}
        style={{
          backgroundColor: bg,
          color: role === "other" ? "#0f172a" : dark ? "#ffffff" : "#0f172a",
          boxShadow: isBass ? `inset 0 0 0 2px ${rgba("#000000", 0.95)}` : `0 0 0 2px ${rgba(bg, 0.25)}`,
        }}
        title={`${spellNoteFromChordInterval(chordRootPc, mod12(pc - chordRootPc), chordPreferSharps)} · ${labelForGuideTonePc(pc)}${isBass ? " · bajo" : ""}`}
      >
        {labelForGuideTonePc(pc)}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS: ACORDES Y DETECCIÓN
  // --------------------------------------------------------------------------

  function renderChordAllowOpenStringsToggle(className = "") {
    return (
      <label
        className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-700 ${className}`.trim()}
        title={chordFamily === "quartal" ? "Incluye cuerdas al aire en la búsqueda de voicings cuartales." : chordFamily === "guide_tones" ? "Incluye cuerdas al aire en la búsqueda de shells de notas guía." : "Permite usar cuerdas al aire como opción de voicing. La distancia se calcula solo con las notas pisadas."}
      >
        <span>Permitir cuerdas al aire</span>
        <input
          type="checkbox"
          checked={chordAllowOpenStrings}
          onChange={(e) => {
            setChordAllowOpenStrings(e.target.checked);
            if (chordFamily === "quartal") {
              setChordQuartalSelectedFrets(null);
              setChordQuartalVoicingIdx(0);
            } else if (chordFamily === "guide_tones") {
              setGuideToneSelectedFrets(null);
              setGuideToneVoicingIdx(0);
            } else {
              setChordSelectedFrets(null);
              setChordVoicingIdx(0);
            }
          }}
          className="h-4 w-4 rounded border-slate-300"
        />
      </label>
    );
  }

function ChordFretboard({
  title,
  subtitle = "",
  infoText = "",
  voicing,
  voicingIdx,
  voicingTotal,
  emptyMessage = "",
  roleForPc = chordRoleOfPc,
  labelForPc = labelForChordPc,
  noteNameForPc = chordPcToSpelledName,
}) {
  const notesMap = useMemo(() => {
    const m = new Map();
    if (!voicing?.notes?.length) return m;
    for (const n of voicing.notes) {
      m.set(`${n.sIdx}:${n.fret}`, {
        pc: n.pc,
        isBass: `${n.sIdx}:${n.fret}` === voicing.bassKey,
      });
    }
    return m;
  }, [voicing]);

  const mutedStrings = useMemo(
    () => new Set(Array.isArray(voicing?.mutedSIdx) ? voicing.mutedSIdx : []),
    [voicing]
  );

  const displayFrets = isMobileLayout
    ? fretsForCompactVoicing(voicing, maxFret)
    : Array.from({ length: maxFret + 1 }, (_, fret) => fret);
  const mobileVisibleFrets = isMobileLayout ? normalizeVisibleFrets([0, ...displayFrets], maxFret) : null;
  const gridCols = fretGridCols(maxFret);

  const noteText = voicing
    ? [...voicing.notes]
        .sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret))
        .map((n) => noteNameForPc(n.pc))
        .join(" – ")
    : "";

  return (
    <PanelBlock
      level="subsection"
      title={infoText ? <InfoTitle label={title} info={infoText} alwaysShow /> : title}
      description={voicing ? `Notas: ${noteText}.${subtitle ? ` ${subtitle}` : ""}` : subtitle}
      headerAside={(
        <div className="flex flex-col items-end gap-1">
          {renderChordAllowOpenStringsToggle("justify-end")}
          {voicing ? (
            <div className="text-xs text-slate-600">
              Voicing {Math.min(voicingIdx + 1, voicingTotal)}/{voicingTotal}: <b>{voicing.frets}</b>
            </div>
          ) : null}
        </div>
      )}
    >

      {!voicing && emptyMessage ? (
        <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
          {emptyMessage}
        </div>
      ) : null}

      {isMobileLayout ? (
        <MobileMainFretboard
          frets={mobileVisibleFrets}
          renderCell={({ sIdx, fret, cellClassName }) => {
            const item = notesMap.get(`${sIdx}:${fret}`);
            const isMutedOpen = fret === 0 && mutedStrings.has(sIdx);

            return (
              <div
                key={`${sIdx}-${fret}`}
                className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${
                  mobileVerticalFretBorderClass(fret)
                } ${cellClassName}`}
                style={{ backgroundColor: fret === 0 ? "transparent" : FRET_CELL_BG }}
              >
                <HoverCellNote sIdx={sIdx} fret={fret} visible={!item && !isMutedOpen} />
                {item ? (
                  <ChordCircle
                    role={roleForPc(item.pc)}
                    isBass={item.isBass}
                    displayLabel={labelForPc(item.pc)}
                    titleText={`${noteNameForPc(item.pc)}${item.isBass ? " · bajo" : ""}`}
                    fret={fret}
                    compactOpen={fret === 0}
                  />
                ) : isMutedOpen ? (
                  <span className="text-base font-semibold leading-none text-slate-400">X</span>
                ) : showNonScale ? (
                  <div className="text-[10px] text-slate-400">{labelForPc(mod12(STRINGS[sIdx].pc + fret))}</div>
                ) : null}
              </div>
            );
          }}
        />
      ) : (
        <>
          <div className="grid items-center gap-1" style={{ gridTemplateColumns: gridCols }}>
            <div className="text-xs font-semibold text-slate-600">Cuerda</div>
            {displayFrets.map((fret) => (
              <div key={fret} className="relative flex flex-col items-center">
                <div className="text-[10px] text-slate-600">{fret}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-2 space-y-1">
            {STRINGS.map((st, sIdx) => (
              <div
                key={st.label}
                className="grid items-center gap-1"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="text-xs font-medium text-slate-700">{st.label}</div>

                {displayFrets.map((fret) => {
                  const cellKey = `${sIdx}:${fret}`;
                  const item = notesMap.get(cellKey);

                  return (
                    <div
                      key={`${sIdx}-${fret}`}
                      className={`group relative isolate flex overflow-visible items-center justify-center rounded-lg border ${
                        fret === 0 ? "border-slate-300" : "border-slate-200"
                      } ${item ? "z-[4]" : "z-0"}`}
                      style={fretCellStyleForLayout(fret, false, { backgroundColor: FRET_CELL_BG })}
                    >
                      <HoverCellNote sIdx={sIdx} fret={fret} visible={!item} />

                      {hasInlayCell(fret, sIdx) ? (
                        <div
                          className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
                          style={{ top: "78%" }}
                        >
                          <div className="h-4 w-4 rounded-full opacity-80" style={{ backgroundColor: FRET_INLAY_BG }} />
                        </div>
                      ) : null}

                      {item ? (
                        <ChordCircle
                          role={roleForPc(item.pc)}
                          isBass={item.isBass}
                          displayLabel={labelForPc(item.pc)}
                          titleText={`${noteNameForPc(item.pc)}${item.isBass ? " · bajo" : ""}`}
                          fret={fret}
                        />
                      ) : fret === 0 && mutedStrings.has(sIdx) ? (
                        <span className="text-base font-semibold leading-none text-slate-400">X</span>
                      ) : showNonScale ? (
                        <div className="text-[10px] text-slate-400">{labelForPc(mod12(STRINGS[sIdx].pc + fret))}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </PanelBlock>
  );
}


  function ChordInvestigationCircle({ pc, fret, candidate, isBass, isPlaying = false, compactOpen = false }) {
    const role = buildDetectedCandidateRoleForPc(pc, candidate);
    const bg = colors[role] || colors.other;
    const dark = isDark(bg);
    const noteLabel = buildDetectedCandidateLabelForPc(pc, candidate, chordPreferSharps, showIntervalsLabel, showNotesLabel);
    return (
      <div
        className={`relative z-20 inline-flex ${fretNoteSizeClass(fret, isMobileLayout, compactOpen)} items-center justify-center rounded-full text-[10px] font-semibold transition-transform duration-150 ${isPlaying ? "scale-110" : ""}`}
        style={{
          backgroundColor: bg,
          color: role === "other" ? "#0f172a" : dark ? "#ffffff" : "#0f172a",
          boxShadow: isPlaying
            ? `0 0 0 3px ${rgba("#ffffff", 0.95)}, 0 0 0 6px ${rgba("#2563eb", 0.35)}, 0 10px 22px ${rgba("#2563eb", 0.22)}`
            : (isBass ? `inset 0 0 0 2px ${rgba("#000000", 0.95)}` : `0 0 0 2px ${rgba(bg, 0.25)}`),
        }}
        title={`${noteLabel}${isBass ? " · bajo" : ""}`}
      >
        {noteLabel}
      </div>
    );
  }

  function GuideToneFretboard({ title, infoText = "", voicing, voicingIdx, voicingTotal, emptyMessage = "" }) {
    const notesMap = useMemo(() => {
      const m = new Map();
      if (!voicing?.notes?.length) return m;
      for (const n of voicing.notes) {
        m.set(`${n.sIdx}:${n.fret}`, {
          pc: n.pc,
          isBass: `${n.sIdx}:${n.fret}` === voicing.bassKey,
        });
      }
      return m;
    }, [voicing]);

    const mutedStrings = useMemo(
      () => new Set(Array.isArray(voicing?.mutedSIdx) ? voicing.mutedSIdx : []),
      [voicing]
    );

    const noteText = voicing
      ? [...voicing.notes]
          .sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret))
          .map((n) => spellNoteFromChordInterval(chordRootPc, mod12(n.pc - chordRootPc), chordPreferSharps))
          .join(" – ")
      : "";
    const displayFrets = isMobileLayout
      ? fretsForCompactVoicing(voicing, maxFret)
      : Array.from({ length: maxFret + 1 }, (_, fret) => fret);
    const mobileVisibleFrets = isMobileLayout ? normalizeVisibleFrets([0, ...displayFrets], maxFret) : null;
    const gridCols = fretGridCols(maxFret);

    return (
      <PanelBlock
        level="subsection"
        title={infoText ? <InfoTitle label={title} info={infoText} alwaysShow /> : title}
        description={`${voicing ? `Notas: ${noteText}. ` : ""}Shells de 3 notas con 1, 3 y 7 según la calidad. Forma e inversión afectan al voicing real.`}
        headerAside={(
          <div className="flex flex-col items-end gap-1">
            {renderChordAllowOpenStringsToggle("justify-end")}
            {voicing ? <div className="text-xs text-slate-600">Voicing {Math.min(voicingIdx + 1, voicingTotal)}/{voicingTotal}: <b>{voicing.frets}</b></div> : null}
          </div>
        )}
      >

        {!voicing && emptyMessage ? (
          <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
            {emptyMessage}
          </div>
        ) : null}

        {isMobileLayout ? (
          <MobileMainFretboard
            frets={mobileVisibleFrets}
            renderCell={({ sIdx, fret, cellClassName }) => {
              const item = notesMap.get(`${sIdx}:${fret}`);
              const isMutedOpen = fret === 0 && mutedStrings.has(sIdx);

              return (
                <div
                  key={`${sIdx}-${fret}`}
                  className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${
                    mobileVerticalFretBorderClass(fret)
                  } ${cellClassName}`}
                  style={{ backgroundColor: fret === 0 ? "transparent" : FRET_CELL_BG }}
                >
                  <HoverCellNote sIdx={sIdx} fret={fret} visible={!item && !isMutedOpen} />
                  {item ? (
                    <GuideToneCircle pc={item.pc} isBass={item.isBass} fret={fret} compactOpen={fret === 0} />
                  ) : isMutedOpen ? (
                    <span className="text-base font-semibold leading-none text-slate-400">X</span>
                  ) : showNonScale ? (
                    <div className="text-[10px] text-slate-400">{labelForCellAt(sIdx, fret)}</div>
                  ) : null}
                </div>
              );
            }}
          />
        ) : (
          <>
            <div className="grid items-center gap-1" style={{ gridTemplateColumns: gridCols }}>
              <div className="text-xs font-semibold text-slate-600">Cuerda</div>
              {displayFrets.map((fret) => (
                <div key={fret} className="relative flex flex-col items-center">
                  <div className="text-[10px] text-slate-600">{fret}</div>
                </div>
              ))}
            </div>

            <div className="relative mt-2 space-y-1">
              {STRINGS.map((st, sIdx) => (
                <div key={st.label} className="grid items-center gap-1" style={{ gridTemplateColumns: gridCols }}>
                  <div className="text-xs font-medium text-slate-700">{st.label}</div>
                  {displayFrets.map((fret) => {
                    const cellKey = `${sIdx}:${fret}`;
                    const item = notesMap.get(cellKey);
                    return (
                      <div
                        key={`${sIdx}-${fret}`}
                        className={`group relative isolate flex overflow-visible items-center justify-center rounded-lg border ${fret === 0 ? "border-slate-300" : "border-slate-200"} ${item ? "z-[4]" : "z-0"}`}
                        style={fretCellStyleForLayout(fret, false, { backgroundColor: FRET_CELL_BG })}
                      >
                        <HoverCellNote sIdx={sIdx} fret={fret} visible={!item} />
                        {hasInlayCell(fret, sIdx) ? (
                          <div className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 -translate-y-1/2" style={{ top: "78%" }}>
                            <div className="h-4 w-4 rounded-full opacity-80" style={{ backgroundColor: FRET_INLAY_BG }} />
                          </div>
                        ) : null}
                        {item ? <GuideToneCircle pc={item.pc} isBass={item.isBass} fret={fret} /> : (fret === 0 && mutedStrings.has(sIdx) ? <span className="text-base font-semibold leading-none text-slate-400">X</span> : (showNonScale ? <div className="text-[10px] text-slate-400">{labelForCellAt(sIdx, fret)}</div> : null))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </PanelBlock>
    );
  }

  function renderChordInvestigationFretboard() {
    const selectedMap = new Map();
    if (chordDetectSelectedNotes.length) {
      const bassKey = chordDetectSelectedNotes[0]?.key || null;
      for (const n of chordDetectSelectedNotes) {
        selectedMap.set(`${n.sIdx}:${n.fret}`, {
          pc: n.pc,
          isBass: n.key === bassKey,
          isPlaying: chordDetectPlayingKeys.includes(n.key),
        });
      }
    }

    const selectedStrings = new Set(chordDetectSelectedNotes.map((n) => n.sIdx));
    const manualSelectionInfoText = [
      chordDetectSelectedCandidate
        ? `Notas de la escala: ${chordDetectSelectedCandidateScaleNotesText}.`
        : "Pulsa en el mástil para añadir o quitar notas y detectar acordes posibles.",
      "Arriba a la derecha tienes cuatro iconos: altavoz, play secuencial, play simultáneo y limpiar.",
      "El altavoz activa o desactiva el sonido al pulsar; si aparece tachado, el sonido inmediato está apagado.",
      "Play reproduce la selección actual cuerda a cuerda, de 6ª a 1ª, y resalta la nota que está sonando en cada momento.",
      "El botón con la nota musical dispara todo el voicing a la vez, como un acorde bloque.",
      "Priorizar contexto armónico intenta mantener la lectura funcional anterior cuando el cambio es pequeño, aunque cambie la etiqueta exacta.",
      "Si está desactivado, la selección automática siempre toma el primer candidato del motor y no depende del orden de pulsación.",
      "Limpiar borra la selección manual y la lectura elegida.",
    ].join("\n");
    const chordDetectIconButtonBaseClass = "inline-flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

    return (
      <PanelBlock
        ref={chordDetectPanelRef}
        tabIndex={-1}
        level="subsection"
        title={<InfoTitle label="Selección manual" info={manualSelectionInfoText} alwaysShow />}
        titleTooltip={!isMobileLayout ? manualSelectionInfoText : ""}
        className="focus:outline-none"
        headerClassName="items-start"
        description={(
          <div className="flex flex-col items-start gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={chordDetectPrioritizeContext}
                  onChange={(e) => updateChordDetectPrioritizeContext(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              Priorizar contexto armónico
            </label>
            {isMobileLayout ? (
              <div className="flex items-center gap-1.5">
                <div className="text-xs font-semibold text-slate-700">Trastes</div>
                <button
                  type="button"
                  className={UI_BTN_SM}
                  title="Mover rango 1 traste a la izquierda"
                  onClick={() => setChordDetectWindowStart((start) => Math.max(chordDetectWindowStartMin, start - 1))}
                  disabled={chordDetectWindowFrom <= chordDetectWindowStartMin}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-xs text-slate-600 tabular-nums">
                  {chordDetectWindowFrom}–{chordDetectWindowTo}
                </div>
                <button
                  type="button"
                  className={UI_BTN_SM}
                  title="Mover rango 1 traste a la derecha"
                  onClick={() => setChordDetectWindowStart((start) => Math.min(chordDetectWindowAllowedStartMax, start + 1))}
                  disabled={chordDetectWindowFrom >= chordDetectWindowAllowedStartMax}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        )}
        headerAside={(
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              className={`${chordDetectIconButtonBaseClass} ${chordDetectClickAudio ? "border-emerald-300 bg-emerald-50 text-emerald-700 enabled:hover:border-emerald-400 enabled:hover:bg-emerald-100 enabled:hover:text-emerald-800" : "border-slate-200 bg-white text-slate-500 enabled:hover:border-emerald-300 enabled:hover:bg-emerald-50 enabled:hover:text-emerald-700"}`}
              title={chordDetectClickAudio ? "Desactivar sonido al pulsar" : "Activar sonido al pulsar"}
              aria-label={chordDetectClickAudio ? "Desactivar sonido al pulsar" : "Activar sonido al pulsar"}
              aria-pressed={chordDetectClickAudio}
              onClick={() => setChordDetectClickAudio((value) => !value)}
            >
              {chordDetectClickAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className={`${chordDetectIconButtonBaseClass} border-slate-200 bg-white text-slate-600 enabled:hover:border-sky-300 enabled:hover:bg-sky-50 enabled:hover:text-sky-700`}
              title="Reproducir la selección actual cuerda a cuerda, de 6ª a 1ª"
              aria-label="Reproducir la selección actual cuerda a cuerda, de 6ª a 1ª"
              onClick={() => fnPlayChordDetectSelection()}
              disabled={!chordDetectSelectedKeys.length}
            >
              <Play className="h-4 w-4 fill-current" />
            </button>
            <button
              type="button"
              className={`${chordDetectIconButtonBaseClass} border-slate-200 bg-white text-slate-600 enabled:hover:border-indigo-300 enabled:hover:bg-indigo-50 enabled:hover:text-indigo-700`}
              title="Reproducir todo el voicing a la vez"
              aria-label="Reproducir todo el voicing a la vez"
              onClick={() => fnPlayChordDetectVoicingTogether()}
              disabled={!chordDetectSelectedKeys.length}
            >
              <Music className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`${chordDetectIconButtonBaseClass} ${chordDetectSelectedKeys.length ? "border-slate-200 bg-white text-slate-600 enabled:hover:border-rose-300 enabled:hover:bg-rose-50 enabled:hover:text-rose-700" : "cursor-not-allowed border-slate-200 bg-white text-slate-300 opacity-50"}`}
              title="Limpiar selección manual"
              aria-label="Limpiar selección manual"
              aria-disabled={!chordDetectSelectedKeys.length}
              onMouseDown={(e) => {
                if (chordDetectSelectedKeys.length) e.preventDefault();
              }}
              onClick={clearChordDetectSelection}
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>
        )}
      >

        <div className="mb-3 min-h-[56px]">
          {chordDetectSelectedCandidate ? (
            <div className="overflow-x-auto pb-1">
              <ChordNoteBadgeStrip
                items={chordDetectSelectedCandidateBadgeItems}
                bassNote={chordDetectSelectedCandidateBassNote}
                colorMap={colors}
                wrap={false}
              />
            </div>
          ) : (
            <div aria-hidden="true" className="h-[56px]" />
          )}
        </div>

        {isMobileLayout ? (
          <MobileMainFretboard
            frets={chordDetectVisibleFrets}
            renderCell={({ sIdx, fret, cellClassName }) => {
              const key = `${sIdx}:${fret}`;
              const item = selectedMap.get(key);

              return (
                <button
                  key={`${sIdx}-${fret}`}
                  type="button"
                  onClick={() => toggleChordDetectCell(sIdx, fret)}
                  className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${cellClassName} ${
                    mobileVerticalFretBorderClass(fret)
                  } ${item?.isPlaying ? "ring-2 ring-sky-300 ring-offset-1 ring-offset-white" : ""} ${fret === 0 ? "bg-transparent" : "bg-slate-50 hover:ring-2 hover:ring-slate-300"}`}
                >
                  <HoverCellNote sIdx={sIdx} fret={fret} visible={!item} />
                  {item ? (
                    <ChordInvestigationCircle
                      pc={item.pc}
                      fret={fret}
                      sIdx={sIdx}
                      candidate={chordDetectSelectedCandidate}
                      isBass={item.isBass}
                      isPlaying={item.isPlaying}
                      compactOpen={fret === 0}
                    />
                  ) : (fret === 0 && !selectedStrings.has(sIdx) ? (
                    <span className="text-base font-semibold leading-none text-slate-400">X</span>
                  ) : (showNonScale ? (
                    <div className="text-[10px] text-slate-400">{chordDetectSelectedCandidate ? buildDetectedCandidateBackgroundLabelForPc(mod12(STRINGS[sIdx].pc + fret), chordDetectSelectedCandidate, chordPreferSharps, showIntervalsLabel, showNotesLabel) : labelForCellAt(sIdx, fret)}</div>
                  ) : null))}
                </button>
              );
            }}
          />
        ) : (
          <>
            <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
              <div className="text-xs font-semibold text-slate-600">Cuerda</div>
              {Array.from({ length: maxFret + 1 }, (_, fret) => (
                <div key={fret} className="relative flex flex-col items-center">
                  <div className="text-[10px] text-slate-600">{fret}</div>
                </div>
              ))}
            </div>

            <div className="mt-2 space-y-1">
              {STRINGS.map((st, sIdx) => (
                <div key={st.label} className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
                  <div className="text-xs font-medium text-slate-700">{st.label}</div>
                  {Array.from({ length: maxFret + 1 }, (_, fret) => {
                    const key = `${sIdx}:${fret}`;
                    const item = selectedMap.get(key);
                    return (
                      <button
                        key={`${sIdx}-${fret}`}
                        type="button"
                        onClick={() => toggleChordDetectCell(sIdx, fret)}
                        className={`group relative isolate flex h-8 overflow-visible items-center justify-center rounded-lg border ${fret === 0 ? "border-slate-300" : "border-slate-200"} ${item ? "z-[4]" : "z-0"} ${item?.isPlaying ? "ring-2 ring-sky-300 ring-offset-1 ring-offset-white" : ""} bg-slate-50 hover:ring-2 hover:ring-slate-300`}
                      >
                        <HoverCellNote sIdx={sIdx} fret={fret} visible={!item} />
                        {hasInlayCell(fret, sIdx) ? (
                          <div className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 -translate-y-1/2" style={{ top: "78%" }}>
                            <div className="h-4 w-4 rounded-full opacity-80" style={{ backgroundColor: FRET_INLAY_BG }} />
                          </div>
                        ) : null}
                        {item ? <ChordInvestigationCircle pc={item.pc} fret={fret} sIdx={sIdx} candidate={chordDetectSelectedCandidate} isBass={item.isBass} isPlaying={item.isPlaying} /> : (fret === 0 && !selectedStrings.has(sIdx) ? <span className="text-base font-semibold leading-none text-slate-400">X</span> : (showNonScale ? <div className="text-[10px] text-slate-400">{chordDetectSelectedCandidate ? buildDetectedCandidateBackgroundLabelForPc(mod12(STRINGS[sIdx].pc + fret), chordDetectSelectedCandidate, chordPreferSharps, showIntervalsLabel, showNotesLabel) : labelForCellAt(sIdx, fret)}</div> : null))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 text-xs text-slate-600">
          {chordDetectSelectedNotes.length
            ? <><b>Notas seleccionadas:</b> {chordDetectSelectedNotesText}. Pulsa de nuevo para quitar una nota.</>
            : "Notas seleccionadas: —"}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            maxLength={6}
            placeholder="p.ej. x8989b"
            value={voicingInputText}
            onChange={(e) => setVoicingInputText(e.target.value.toLowerCase())}
            className="w-28 rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
          />
          <button
            disabled={voicingInputText.length !== 6}
            onClick={() => {
              const FRET_CHARS = "0123456789ab";
              const newKeys = [];
              for (let i = 0; i < 6; i++) {
                const ch = voicingInputText[i];
                if (ch === "x") continue;
                const fret = FRET_CHARS.indexOf(ch);
                if (fret === -1) continue;
                const sIdx = 5 - i;
                newKeys.push(`${sIdx}:${fret}`);
              }
              setChordDetectSelectedKeys(newKeys);
              if (!chordDetectMode) setChordDetectMode(true);
            }}
            className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40 enabled:hover:bg-blue-600"
          >
            Aplicar
          </button>
        </div>

        {chordDetectStaffEvents.length ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-700">Pentagrama de la selección actual</div>
            <div className="mt-1 text-xs text-slate-600">
              Se dibuja al pulsar notas, sin esperar a elegir un acorde posible: {chordDetectSelectionPositionsText}
            </div>
            <div className="mt-2">
              <MusicStaff
                events={chordDetectStaffEvents}
                preferSharps={chordDetectSelectedCandidate?.preferSharps ?? chordPreferSharps}
                clefMode="guitar"
                keySignature={{ type: null, count: 0 }}
                showFooter
                footerLabels={[chordDetectSelectedCandidate?.name || "Selección"]}
              />
            </div>
          </div>
        ) : null}
      </PanelBlock>
    );
  }

  // Roles por slot (acordes cercanos)
  function slotRoleOfPc(pc, slot, voicing = null) {
    const meta = buildNearSlotNoteMeta(slot, voicing);
    const interval = mod12(pc - meta.rootPc);
    const idx = meta.intervals.findIndex((x) => mod12(x) === interval);
    const degreeRaw = String(meta.degreeLabels?.[idx] || intervalToSimpleChordDegreeToken(interval));
    return meta.family === "tertian"
      ? chordFormulaBadgeRoleFromDegreeLabel(degreeRaw, interval)
      : chordBadgeRoleFromDegreeLabel(degreeRaw, interval);
  }

  // Etiqueta por slot (acordes cercanos)
  function slotLabelForPc(slot, pc, voicing = null) {
    const meta = buildNearSlotNoteMeta(slot, voicing);
    const interval = mod12(pc - meta.rootPc);
    const idx = meta.intervals.findIndex((x) => mod12(x) === interval);
    const note = idx >= 0 ? meta.notes[idx] : pcToName(pc, meta.preferSharps);
    const degreeRaw = idx >= 0
      ? String(meta.degreeLabels[idx] || "")
      : meta.family === "tertian"
        ? intervalToChordToken(interval, {
            ext6: !!slot.ext6,
            ext9: !!slot.ext9 && slot.structure !== "triad",
            ext11: !!slot.ext11 && slot.structure !== "triad",
            ext13: !!slot.ext13 && slot.structure !== "triad",
          })
        : intervalToSimpleChordDegreeToken(interval);
    const tok = meta.family === "tertian" ? degreeRaw : formatChordBadgeDegree(degreeRaw);

    const showI = !!showIntervalsLabel;
    const showN = !!showNotesLabel;
    if (!showI && !showN) return tok;
    if (showI && showN) return `${tok}-${note}`;
    if (showI) return tok;
    return note;
  }

  // --------------------------------------------------------------------------
  // HELPERS LOCALES: DISTRIBUCIÓN VISUAL DE SOLAPES
  // --------------------------------------------------------------------------

  function calibratedClusterPos(n, idx) {
    if (n === 2) {
      const p = [
        { x: 19, y: 16 },
        { x: 52, y: 16 },
      ][idx];
      return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
    }
    if (n === 4) {
      const p = [
        { x: 35, y: 6 },
        { x: 12, y: 14 },
        { x: 57, y: 14 },
        { x: 34, y: 25 },
      ][idx];
      return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
    }
    if (n === 3) {
      const p = [
        { x: 12, y: 14 },
        { x: 34, y: 14 },
        { x: 57, y: 14 },
      ][idx];
      return p ? { left: `${p.x}px`, top: `${p.y}px`, transform: "translate(-50%, -50%)" } : null;
    }
    return null;
  }

  function cornerStyle(n, idx) {
    if (n <= 1) return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    if (n === 2) {
      return idx === 0
        ? { left: 16, top: "50%", transform: "translateY(-50%)" }
        : { right: 16, top: "50%", transform: "translateY(-50%)" };
    }
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  function Mini({ slotIdx, pc, role, size = "m" }) {
    const slot = nearSlots[slotIdx];
    const voicing = nearComputed.selected[slotIdx] || null;
    const chordBg = nearBgColors[slotIdx] || "#94a3b8";
    const ring = colors[role] || colors.other;
    const dark = isDark(chordBg);
    const sizeClass = size === "cal"
      ? "h-[21px] w-[21px] text-[8px]"
      : size === "pair"
        ? "h-[26px] w-[26px] text-[10px]"
        : size === "s"
          ? "h-6 w-6 text-[9px]"
          : "h-7 w-7 text-[10px]";

    return (
      <div
        className={`relative z-20 inline-flex items-center justify-center rounded-full font-bold ${sizeClass}`}
        title={`${slotLabelForPc(slot, pc, voicing)} · acorde ${slotIdx + 1}`}
      >
        <span
          className="absolute inset-0 z-[1] rounded-full"
          style={{
            backgroundColor: chordBg,
            border: `2px solid ${ring}`,
            boxSizing: "border-box",
          }}
        />
        <span className="relative z-[2]" style={{ color: dark ? "#fff" : "#0f172a" }}>
          {slotLabelForPc(slot, pc, voicing)}
        </span>
      </div>
    );
  }

  function renderNearChordsFretboard() {
    const baseSlotIdx = nearComputed.baseIdx;
    const baseSlot = baseSlotIdx >= 0 ? nearSlots[baseSlotIdx] : null;
    const basePlan = baseSlotIdx >= 0 ? (nearComputed.ranked[baseSlotIdx]?.plan || null) : null;
    const baseVoicing = baseSlotIdx >= 0 ? (nearComputed.selected[baseSlotIdx] || null) : null;
    const baseData = baseSlot ? buildNearSlotStudyEntry(baseSlot, basePlan, baseVoicing, baseSlotIdx) : null;
    const baseChordName = baseData?.chordName || null;
    const nearFretboardInfoText = `${baseChordName ? `Acorde activo: ${baseChordName}. ` : ""}Compara las digitaciones activas dentro del mismo rango. Relleno = color del acorde · borde = función · texto = nota/intervalo.`;
    const slotDataMaps = nearComputed.selected.map((v, idx) => {
      const notesMap = new Map();
      if (!nearSlots[idx]?.enabled || !v?.notes?.length) return { notesMap };
      for (const n of v.notes) {
        notesMap.set(`${n.sIdx}:${n.fret}`, {
          pc: n.pc,
          isBass: `${n.sIdx}:${n.fret}` === v.bassKey,
        });
      }
      return { notesMap };
    });

    const mobileVisibleFrets = isMobileLayout
      ? normalizeVisibleFrets([0, ...Array.from({ length: Math.max(0, nearTo - nearFrom + 1) }, (_, idx) => nearFrom + idx)], maxFret)
      : null;

    const usedStrings = new Set();
    nearComputed.selected.forEach((v, idx) => {
      if (!nearSlots[idx]?.enabled || !v?.notes?.length) return;
      v.notes.forEach((n) => usedStrings.add(n.sIdx));
    });

    const getItemsForCell = (sIdx, fret) => {
      const items = [];
      for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
        if (!nearSlots[slotIdx]?.enabled) continue;
        const n = slotDataMaps[slotIdx].notesMap.get(`${sIdx}:${fret}`);
        if (!n) continue;
        items.push({ slotIdx, pc: n.pc, role: slotRoleOfPc(n.pc, nearSlots[slotIdx], nearComputed.selected[slotIdx] || null) });
      }
      return items;
    };

    return (
      <PanelBlock
        level="subsection"
        title={<InfoTitle label="Mástil: acordes cercanos" info={nearFretboardInfoText} alwaysShow />}
        headerAside={<div className="flex flex-wrap items-end justify-end gap-3">
            <div className="flex items-end gap-1.5">
              <div className="text-xs font-semibold text-slate-700">Rango</div>
              <button
                type="button"
                className={UI_BTN_SM}
                title="Mover rango 1 traste a la izquierda"
                onClick={() => setNearWindowStart((s) => Math.max(0, s - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-end gap-1.5">
                <div>
                  <div className="text-[10px] font-semibold text-slate-600">Tamaño</div>
                  <input
                    className={UI_INPUT_SM + " w-14"}
                    value={nearWindowSizeRaw}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setNearWindowSizeRaw(raw);
                      const n = parseInt(raw, 10);
                      if (Number.isFinite(n) && n >= 1) setNearWindowSize(n);
                    }}
                    onBlur={() => setNearWindowSizeRaw(String(nearWindowSize))}
                  />
                </div>
              </div>

              <button
                type="button"
                className={UI_BTN_SM}
                title="Mover rango 1 traste a la derecha"
                onClick={() => setNearWindowStart((s) => Math.min(nearStartMax, s + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="ml-1 text-xs text-slate-600 tabular-nums">
                {nearFrom}–{nearTo}
              </div>
            </div>
          </div>}
        className="mt-3"
      >

        {isMobileLayout ? (
          <MobileMainFretboard
            frets={mobileVisibleFrets}
            renderCell={({ sIdx, fret, cellClassName }) => {
              const items = getItemsForCell(sIdx, fret);

              return (
                <div
                  key={`${sIdx}-${fret}`}
                  className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${
                    mobileVerticalFretBorderClass(fret)
                  } ${cellClassName}`}
                  style={{ backgroundColor: fret === 0 ? "transparent" : FRET_CELL_BG }}
                >
                  <HoverCellNote sIdx={sIdx} fret={fret} visible={!items.length} />
                  {fret >= nearFrom && fret <= nearTo ? (
                    <div className="pointer-events-none absolute inset-0 z-[2] rounded-lg" style={{ backgroundColor: "rgba(15, 23, 42, 0.04)" }} />
                  ) : null}
                  {items.length === 1 ? (
                    <div className="pointer-events-none relative z-[5]">
                      <Mini size={fret === 0 ? "s" : "m"} slotIdx={items[0].slotIdx} pc={items[0].pc} role={items[0].role} fret={fret} sIdx={sIdx} />
                    </div>
                  ) : items.length ? (
                    <div className="absolute inset-0 z-[5] pointer-events-none">
                      {items
                        .slice()
                        .sort((a, b) => a.slotIdx - b.slotIdx)
                        .slice(0, 4)
                        .map((it, i2) => {
                          const calibratedPos = calibratedClusterPos(items.length, i2);
                          const pos = calibratedPos || cornerStyle(items.length, i2);
                          const miniSize = fret === 0 ? "s" : (items.length === 2 ? "pair" : calibratedPos ? "cal" : "s");
                          return (
                            <div key={`${it.slotIdx}-${it.role}-${i2}`} className="absolute" style={pos}>
                              <Mini size={miniSize} slotIdx={it.slotIdx} pc={it.pc} role={it.role} fret={fret} sIdx={sIdx} />
                            </div>
                          );
                        })}
                    </div>
                  ) : (fret === 0 && !usedStrings.has(sIdx)) ? (
                    <span className="pointer-events-none relative z-[5] text-xs font-semibold text-slate-400">X</span>
                  ) : showNonScale ? (
                    <div className="pointer-events-none relative z-[1] text-[10px] text-slate-400">{labelForCellAt(sIdx, fret)}</div>
                  ) : null}
                </div>
              );
            }}
          />
        ) : (
          <>
            <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
              <div className="text-xs font-semibold text-slate-600">Cuerda</div>
              {Array.from({ length: maxFret + 1 }, (_, fret) => (
                <div key={fret} className="relative flex flex-col items-center">
                  <div className="text-[10px] text-slate-600">{fret}</div>
                </div>
              ))}
            </div>

            <div className="mt-2 space-y-1">
              {STRINGS.map((st, sIdx) => (
                <React.Fragment key={st.label}>
                  <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
                    <div className="text-xs font-medium text-slate-700">{st.label}</div>

                    {Array.from({ length: maxFret + 1 }, (_, fret) => {
                      const items = getItemsForCell(sIdx, fret);

                      return (
                        <div
                          key={`${sIdx}-${fret}`}
                          className={`group relative isolate flex h-8 overflow-visible items-center justify-center rounded-lg border ${fret === 0 ? "border-slate-300" : "border-slate-200"} ${items.length ? "z-[4]" : "z-0"}`}
                          style={{ backgroundColor: FRET_CELL_BG }}
                        >
                          <HoverCellNote sIdx={sIdx} fret={fret} visible={!items.length} />
                          {hasInlayCell(fret, sIdx) ? (
                          <div className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 -translate-y-1/2" style={{ top: "78%" }}>
                            <div className="h-4 w-4 rounded-full opacity-80" style={{ backgroundColor: FRET_INLAY_BG }} />
                          </div>
                        ) : null}
                          {fret >= nearFrom && fret <= nearTo ? (
                            <div className="pointer-events-none absolute inset-0 z-[2] rounded-lg" style={{ backgroundColor: "rgba(15, 23, 42, 0.04)" }} />
                          ) : null}
                          {items.length === 1 ? (
                            <div className="pointer-events-none relative z-[5]">
                              <Mini size="m" slotIdx={items[0].slotIdx} pc={items[0].pc} role={items[0].role} fret={fret} sIdx={sIdx} />
                            </div>
                          ) : items.length ? (
                            <div className="absolute inset-0 z-[5] pointer-events-none">
                              {items
                                .slice()
                                .sort((a, b) => a.slotIdx - b.slotIdx)
                                .slice(0, 4)
                                .map((it, i2) => {
                                  const calibratedPos = calibratedClusterPos(items.length, i2);
                                  const pos = calibratedPos || cornerStyle(items.length, i2);
                                  const miniSize = items.length === 2 ? "pair" : calibratedPos ? "cal" : "s";
                                  return (
                                    <div key={`${it.slotIdx}-${it.role}-${i2}`} className="absolute" style={pos}>
                                      <Mini size={miniSize} slotIdx={it.slotIdx} pc={it.pc} role={it.role} fret={fret} sIdx={sIdx} />
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (fret === 0 && !usedStrings.has(sIdx)) ? (
                            <span className="pointer-events-none relative z-[5] text-xs font-semibold text-slate-400">X</span>
                          ) : showNonScale ? (
                            <div className="pointer-events-none relative z-[1] text-[10px] text-slate-400">{labelForCellAt(sIdx, fret)}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </PanelBlock>
    );
  }

  function ClusterOverlapDebugPanel() {
    return (
      <section className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <div className="text-sm font-semibold text-slate-800">Prueba solape (traste 23)</div>
        <div className="mt-1 text-xs text-slate-600">Usa X, Y y tamaño para ajustar manualmente 4 círculos de prueba fuera del mástil.</div>

        <div className="mt-3 flex flex-wrap gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-slate-700">Vista previa</div>
            <div className="flex items-start gap-2">
              <div className="pt-7 text-[11px] font-semibold text-slate-600">23</div>
              <div className="relative h-8 w-[72px] rounded-lg border border-slate-200 bg-slate-50">
                {clusterTestDots.map((dot, idx) => (
                  <div
                    key={idx}
                    className="absolute rounded-full border-2 bg-white"
                    style={{
                      left: `${dot.x}px`,
                      top: `${dot.y}px`,
                      width: `${dot.size}px`,
                      height: `${dot.size}px`,
                      borderColor: dot.color,
                      transform: "translate(-50%, -50%)",
                    }}
                    title={`Círculo ${idx + 1}: x ${dot.x}, y ${dot.y}, tamaño ${dot.size}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid flex-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {clusterTestDots.map((dot, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-700">Círculo {idx + 1}</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className={UI_LABEL_SM}>X</label>
                    <input
                      type="number"
                      className={UI_INPUT_SM + " mt-1 w-full"}
                      value={dot.x}
                      onChange={(e) => setClusterTestDot(idx, "x", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={UI_LABEL_SM}>Y</label>
                    <input
                      type="number"
                      className={UI_INPUT_SM + " mt-1 w-full"}
                      value={dot.y}
                      onChange={(e) => setClusterTestDot(idx, "y", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={UI_LABEL_SM}>Tamaño</label>
                    <input
                      type="number"
                      className={UI_INPUT_SM + " mt-1 w-full"}
                      value={dot.size}
                      onChange={(e) => setClusterTestDot(idx, "size", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS: MÁSTILES PRINCIPALES
  // --------------------------------------------------------------------------

  function RouteLabFretboard() {
    return (
      <>
        {isMobileLayout ? (
          <MobileMainFretboard
            renderCell={({ sIdx, fret, cellClassName }) => {
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

              return (
                <div
                  key={`${sIdx}-${fret}`}
                  onClick={() => {
                    if (!inScale) return;
                    const code = `${sIdx + 1}${fret}`;
                    if (routeLabPickNext === "start") {
                      setRouteLabStartCode(code);
                      setRouteLabPickNext("end");
                    } else {
                      setRouteLabEndCode(code);
                      setRouteLabPickNext("start");
                    }
                  }}
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
            }}
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
                <React.Fragment key={st.label}>
                  <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
                    <div className="text-xs font-medium text-slate-700">{st.label}</div>

                    {Array.from({ length: maxFret + 1 }, (_, fret) => {
                      const pc = mod12(st.pc + fret);
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

                      return (
                        <div
                          key={`${sIdx}-${fret}`}
                          onClick={() => {
                            if (!inScale) return;
                            const code = `${sIdx + 1}${fret}`;
                            if (routeLabPickNext === "start") {
                              setRouteLabStartCode(code);
                              setRouteLabPickNext("end");
                            } else {
                              setRouteLabEndCode(code);
                              setRouteLabPickNext("start");
                            }
                          }}
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
                    })}
                  </div>
                </React.Fragment>
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

  function Fretboard({ title, subtitle, mode }) {
    // mode: scale | patterns | route
    const showAllNotes = showNonScale;
    const usesKingOverlay = mode === "scale" && isKingBoxEligibleScale && showKingBoxes;

    return (
      <PanelBlock
        title={<InfoTitle label={title} info={subtitle} />}
        titleTooltip={!isMobileLayout ? subtitle : ""}
        headerAside={mode === "patterns" ? (
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-slate-700">Modo patrones:</div>
              <select
                className={UI_SELECT_SM + " w-44"}
                value={patternsMode}
                onChange={(e) => setPatternsMode(e.target.value)}
                title="Define el modo del mástil Patrones (Auto/Boxes/3NPS/CAGED)"
              >
                <option value="auto">Auto</option>
                {scaleIntervals.length === 5 ? <option value="boxes">Boxes (pentatónica)</option> : null}
                {scaleIntervals.length === 7 ? <option value="nps">3NPS</option> : null}
                <option value="caged">CAGED</option>
              </select>
            </div>
          ) : mode === "route" ? (
            <div className="text-xs text-slate-600">
              {routeResult.reason ? (
                <span className="font-semibold text-rose-600">{routeResult.reason}</span>
              ) : (
                <span>
                  Ruta: {routeStartCode} {"\u2192"} {routeEndCode} | pasos: <b>{routeResult.path.length}</b>
                </span>
              )}
            </div>
          ) : null}
      >
        {isMobileLayout ? (
          <MobileMainFretboard
            renderCell={({ sIdx, fret, cellClassName }) => {
              const st = STRINGS[sIdx];
              const pc = mod12(st.pc + fret);
              const inScale = scalePcs.has(pc);
              const inExtra = showExtra && extraPcs.has(pc);
              const displayRole = getDisplayRole({ pc, inScale, inExtra });

              const cellKey = `${sIdx}:${fret}`;
              const bgPat = mode === "patterns" && inScale ? patternBgStyle(cellKey) : {};

              const routeIdx = mode === "route" ? routeIndexByCell.get(cellKey) : null;
              const inRoute = mode === "route" && routeIdx != null;
              const bgRoute = inRoute
                ? {
                    backgroundImage: `linear-gradient(0deg, ${rgba(colors.route, 0.28)} 0%, ${rgba(colors.route, 0.28)} 100%)`,
                    boxShadow: `inset 0 0 0 2px ${rgba("#000000", 0.9)}`,
                  }
                : {};

              const kingTags = usesKingOverlay ? Array.from(kingBoxOverlay.get(cellKey) || []) : [];
              const effectiveRole = displayRole ?? (kingTags.length ? roleOfPc(pc) : null);
              const shouldRender = effectiveRole !== null || showAllNotes || kingTags.length > 0;

              return (
                <div
                  key={`${sIdx}-${fret}`}
                  onClick={() => {
                    if (mode !== "route") return;
                    if (!inScale) return;
                    const code = `${sIdx + 1}${fret}`;
                    if (routePickNext === "start") {
                      setRouteStartCode(code);
                      setRoutePickNext("end");
                    } else {
                      setRouteEndCode(code);
                      setRoutePickNext("start");
                    }
                  }}
                  className={`group relative flex w-full overflow-visible items-center justify-center rounded-lg border ${cellClassName} ${
                    mobileVerticalFretBorderClass(fret)
                  } ${mode === "route" && inScale ? "cursor-pointer hover:ring-2 hover:ring-slate-300" : ""}`}
                  style={{ backgroundColor: fret === 0 ? "transparent" : FRET_CELL_BG, ...bgPat, ...bgRoute }}
                >
                  <HoverCellNote sIdx={sIdx} fret={fret} visible={!shouldRender} />
                  {shouldRender && effectiveRole ? (
                    <Circle pc={pc} role={effectiveRole} fret={fret} sIdx={sIdx} badge={mode === "route" ? routeIdx : null} kingTags={kingTags} />
                  ) : showAllNotes ? (
                    <div className="text-[10px] text-slate-400">{labelForPc(pc)}</div>
                  ) : null}
                </div>
              );
            }}
          />
        ) : (
          <>
            {/* Cabecera de trastes */}
            <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
              <div className="text-xs font-semibold text-slate-600">Cuerda</div>
              {Array.from({ length: maxFret + 1 }, (_, fret) => (
                <WebFretNumberHeader key={fret} fret={fret} />
              ))}
            </div>

            <div className="mt-2 space-y-1">
              {STRINGS.map((st, sIdx) => (
                <React.Fragment key={st.label}>
                  <div className="grid items-center gap-1" style={{ gridTemplateColumns: fretGridCols(maxFret) }}>
                    <div className="text-xs font-medium text-slate-700">{st.label}</div>

                    {Array.from({ length: maxFret + 1 }, (_, fret) => {
                      const pc = mod12(st.pc + fret);
                      const inScale = scalePcs.has(pc);
                      const inExtra = showExtra && extraPcs.has(pc);
                      const displayRole = getDisplayRole({ pc, inScale, inExtra });

                      const cellKey = `${sIdx}:${fret}`;
                      const bgPat = mode === "patterns" && inScale ? patternBgStyle(cellKey) : {};

                      const routeIdx = mode === "route" ? routeIndexByCell.get(cellKey) : null;
                      const inRoute = mode === "route" && routeIdx != null;
                      const bgRoute = inRoute
                        ? {
                            backgroundImage: `linear-gradient(0deg, ${rgba(colors.route, 0.28)} 0%, ${rgba(colors.route, 0.28)} 100%)`,
                            boxShadow: `inset 0 0 0 2px ${rgba("#000000", 0.9)}`,
                          }
                        : {};

                      const kingTags = usesKingOverlay ? Array.from(kingBoxOverlay.get(cellKey) || []) : [];
                      const effectiveRole = displayRole ?? (kingTags.length ? roleOfPc(pc) : null);
                      const shouldRender = effectiveRole !== null || showAllNotes || kingTags.length > 0;

                      return (
                        <div
                          key={`${sIdx}-${fret}`}
                          onClick={() => {
                            // Selección rápida de inicio/fin SOLO en el mástil de ruta y sobre notas de la escala.
                            if (mode !== "route") return;
                            if (!inScale) return;
                            const code = `${sIdx + 1}${fret}`;
                            if (routePickNext === "start") {
                              setRouteStartCode(code);
                              setRoutePickNext("end");
                            } else {
                              setRouteEndCode(code);
                              setRoutePickNext("start");
                            }
                          }}
                          className={`group relative isolate flex h-8 overflow-visible items-center justify-center rounded-lg border ${
                            fret === 0 ? "border-slate-300" : "border-slate-200"
                          } ${shouldRender && displayRole ? "z-[4]" : "z-0"} ${mode === "route" && inScale ? "cursor-pointer hover:ring-2 hover:ring-slate-300" : ""}`}
                          style={{ backgroundColor: FRET_CELL_BG, ...bgPat, ...bgRoute }}
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
                          {shouldRender && effectiveRole ? (
                            <Circle pc={pc} role={effectiveRole} fret={fret} sIdx={sIdx} badge={mode === "route" ? routeIdx : null} kingTags={kingTags} />
                          ) : showAllNotes ? (
                            <div className="text-[10px] text-slate-400">{labelForPc(pc)}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
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
      </PanelBlock>
    );
  }

  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS: AYUDA / MANUAL
  // --------------------------------------------------------------------------

  function ManualOverlay() {
    if (!manualOpen) return null;

    return (
      <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-900/45 p-4">
        <div className="mt-8 max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">Manual de uso</div>
              <div className="text-sm text-slate-600">Qué hace la página y cómo empezar sin conocerla.</div>
            </div>
            <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={() => setManualOpen(false)}>
              Cerrar
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Qué hace</div>
              <div className="mt-2 text-xs leading-5 text-slate-600">
                Esta página muestra escalas, patrones, rutas sobre el mástil y acordes con digitaciones reales.
                Sirve para estudiar dónde están las notas, qué intervalos forman una escala, qué patrones encajan y qué acordes puedes tocar o investigar.
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Flujo rápido</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>1. Elige <b>Nota raíz</b> y <b>Escala</b>.</div>
                <div>2. Decide si quieres ver <b>Notas</b>, <b>Intervalos</b> o ambos.</div>
                <div>3. Activa los mástiles que necesites: <b>Escala</b>, <b>Patrones</b>, <b>Ruta</b> y <b>Acordes</b>.</div>
                <div>4. Ajusta <b>Trastes</b> para ampliar o reducir el rango visible.</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Mástil de escala</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>Resalta raíz, 3ª, 5ª y resto de notas de la escala.</div>
                <div>Puedes activar <b>Notas extra</b> para añadir tensiones o notas ajenas.</div>
                <div><b>Ver todo</b> muestra también notas fuera de la escala.</div>
                <div>Al pasar el ratón por una celda vacía aparece la nota del traste.</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Patrones</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>Permite ver patrones posicionales sobre la escala activa.</div>
                <div><b>Auto</b> decide el sistema adecuado según la escala.</div>
                <div>En pentatónicas usa <b>5 boxes</b>.</div>
                <div>En escalas de 7 notas usa <b>7 patrones 3NPS</b>.</div>
                <div>También puedes forzar <b>CAGED</b>.</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Ruta musical</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>Calcula un recorrido entre una nota inicial y una final siguiendo la escala.</div>
                <div>Puedes escribir posiciones como <b>61</b> o elegirlas con clic en el mástil.</div>
                <div>La ruta musical actual usa el motor nuevo y busca llegar del inicio al fin de la forma más tocable posible.</div>
                <div>El límite de notas por cuerda es orientativo: intenta respetarlo, pero puede hacer slides o pequeños desplazamientos si eso mejora la digitación.</div>
                <div>Prioriza avanzar con lógica de guitarrista, evitando retrocesos absurdos de cuerda y favoreciendo trayectorias diagonales naturales.</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Acorde principal</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>Construye acordes a partir de tono, calidad, estructura, forma, inversión y extensiones.</div>
                <div>La app busca voicings reales y los puedes recorrer con las flechas o el desplegable.</div>
                <div><b>Estudiar</b> abre un análisis del acorde, el voicing y sus tensiones.</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Investigar en mástil</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>Al activar <b>Investigar en mástil</b>, el cuadro de acorde queda bloqueado y seleccionas notas directamente en el mástil.</div>
                <div>Solo puede haber una nota por cuerda. Si pulsas otra en la misma cuerda, sustituye a la anterior.</div>
                <div>La app propone lecturas posibles del acorde y puedes copiar una a la sección de arriba.</div>
                <div>Arriba a la derecha tienes los iconos de altavoz, <b>Play</b> y limpiar; el altavoz tachado indica que el sonido al pulsar está apagado y <b>Play</b> recorre la selección cuerda a cuerda, de 6ª a 1ª, mientras va resaltando cada nota.</div>
                <div><b>Priorizar contexto armónico</b> intenta mantener la familia funcional anterior aunque cambie la etiqueta exacta; si está apagado, siempre se elige el primer candidato del motor.</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Acordes cercanos</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>Permite comparar hasta 4 acordes en una misma zona del mástil.</div>
                <div>Busca digitaciones dentro de un rango de trastes y ordena por cercanía al acorde de referencia.</div>
                <div>Sirve para estudiar progresiones, voice leading y tonalidades posibles.</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Presets y configuración</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div><b>Presets rápidos</b> guardan y recuperan configuraciones habituales.</div>
                <div><b>Exportar config</b> guarda toda la configuración en un JSON.</div>
                <div><b>Importar config</b> recupera una configuración anterior.</div>
                <div><b>Restablecer</b> vuelve a los valores por defecto.</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">Consejos</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>Empieza con una escala simple, por ejemplo mayor o pentatónica menor.</div>
                <div>Usa primero <b>Notas</b>; cuando ubiques bien el mástil, añade <b>Intervalos</b>.</div>
                <div>Para estudiar armonía, combina <b>Acorde principal</b>, <b>Estudiar</b> y <b>Acordes cercanos</b>.</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // CONSTANTES DE UI Y LAYOUT
  // --------------------------------------------------------------------------

  const wrap = "mx-auto w-full p-3";
  const wrapStyle = isMobileLayout
    ? undefined
    : {
        width: "100%",
        minWidth: `${webAppWidthPx(maxFret, WEB_FRET_CELL_MIN_WIDTH_PX)}px`,
        maxWidth: `${webAppWidthPx(maxFret, WEB_FRET_CELL_MAX_WIDTH_PX)}px`,
      };

  // UI compacto (especialmente para Acordes)
  const UI_SELECT_SM = "h-7 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
  const UI_SELECT_SM_TONE = "h-7 w-[60px] rounded-xl border border-slate-200 bg-white px-1 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
  const UI_SELECT_SM_AUTO = "h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
  const UI_SELECT_SM_COMPACT = `${UI_SELECT_SM_AUTO} w-fit max-w-full`;
  const fnMaxLabelCh = (items, fallback = 8) => {
    const maxLen = (items || []).reduce((acc, item) => {
      const label = typeof item === "string" ? item : (item?.label ?? item?.value ?? "");
      return Math.max(acc, String(label).length);
    }, fallback);
    return `${Math.max(maxLen + 3, fallback)}ch`;
  };
  const fnLabelWidthCh = (label, fallback = 8, padding = 2) => {
    const len = Math.max(String(label || "").length + padding, fallback);
    return `${len}ch`;
  };
  const fnMaxTextCh = (items, fallback = 8) => {
    const maxLen = (items || []).reduce((acc, item) => {
      const label = typeof item === "string" ? item : (item?.label ?? item?.value ?? "");
      return Math.max(acc, String(label).length);
    }, 0);
    return `${Math.max(maxLen, fallback)}ch`;
  };
  const nearSelectWidthStyle = (items, fallback = 8) => (
    isMobileLayout ? undefined : { width: `calc(${fnMaxTextCh(items, fallback)} + 25px)` }
  );
  const chordFamilySelectWidth = fnMaxLabelCh(CHORD_FAMILIES, 10);
  const chordQualitySelectWidth = fnMaxLabelCh(CHORD_QUALITIES, 10);
  const chordSuspensionSelectWidth = fnMaxLabelCh(["Sus —", "sus2", "sus4"], 8);
  const chordFormSelectWidth = fnMaxLabelCh(CHORD_FORMS, 10);
  const chordInversionSelectWidth = fnMaxLabelCh(CHORD_INVERSIONS, 10);
  const chordSelectClass = isMobileLayout ? UI_SELECT_SM_COMPACT : UI_SELECT_SM;
  const chordAutoSelectClass = isMobileLayout ? UI_SELECT_SM_COMPACT : UI_SELECT_SM_AUTO;
  const _chordVoicingSelectClass = isMobileLayout ? UI_SELECT_SM_COMPACT : `${UI_SELECT_SM} min-w-0 flex-1`;
  const chordMobileEditorGridClass = "grid min-w-0 items-start justify-items-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]";
  const chordMobileEditorTertianGridClass = "grid min-w-0 items-start gap-2 [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]";
  const UI_BTN_SM = "h-7 w-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold shadow-sm hover:bg-sky-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";
  const UI_INPUT_SM = "h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
  const UI_LABEL_SM = "block text-[11px] font-semibold text-slate-700";
  const UI_HELP_SM = "text-[11px] text-slate-500";
  const UI_EXT_GRID = "mt-1 grid grid-cols-3 gap-x-3 gap-y-1 text-xs";
  const nearSlotDesktopEditorClass = "flex flex-wrap items-end gap-2";
  const nearSlotDesktopVoicingClass = "min-w-[260px] flex-[1_1_320px]";
  const nearSlotDesktopVoicingCompactClass = "min-w-[190px] flex-[1_1_210px]";

  function renderNearSlotToneControl(slot, idx, disableAll, className = "min-w-0") {
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>Tono</label>
        <div className="mt-1 flex items-center gap-1.5">
          <select
            className={UI_SELECT_SM_TONE}
            style={{ width: "50px" }}
            value={chordUiLetterFromPc(slot.rootPc, !!slot.spellPreferSharps)}
            onChange={(e) => {
              const letter = e.target.value;
              if (Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) {
                updateNearSlot(idx, { rootPc: mod12(NATURAL_PC[letter]), selFrets: null });
              }
            }}
            disabled={disableAll}
          >
            {LETTERS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            type="button"
            className={`${UI_BTN_SM} ${!disableAll && (!NATURAL_PCS.has(mod12(slot.rootPc)) && !slot.spellPreferSharps) ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
            title="Bajar 1 semitono"
            onClick={() => {
              const letter = chordUiLetterFromPc(slot.rootPc, false);
              const nat = mod12(NATURAL_PC[letter]);
              const cur = mod12(slot.rootPc);
              if (cur !== nat) {
                updateNearSlot(idx, { rootPc: nat, selFrets: null, spellPreferSharps: false });
                return;
              }
              updateNearSlot(idx, { rootPc: mod12(nat - 1), selFrets: null, spellPreferSharps: false });
            }}
            disabled={disableAll}
          >
            b
          </button>
          <button
            type="button"
            className={`${UI_BTN_SM} ${!disableAll && (!NATURAL_PCS.has(mod12(slot.rootPc)) && slot.spellPreferSharps) ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
            title="Subir 1 semitono"
            onClick={() => {
              const letter = chordUiLetterFromPc(slot.rootPc, true);
              const nat = mod12(NATURAL_PC[letter]);
              const cur = mod12(slot.rootPc);
              if (cur !== nat) {
                updateNearSlot(idx, { rootPc: nat, selFrets: null, spellPreferSharps: true });
                return;
              }
              updateNearSlot(idx, { rootPc: mod12(nat + 1), selFrets: null, spellPreferSharps: true });
            }}
            disabled={disableAll}
          >
            #
          </button>
        </div>
      </div>
    );
  }

  function renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, className = "min-w-0 flex-1") {
    const family = nearSlotFamilyOf(slot);
    const voicingOptionLabels = options.map((v) => `${v.frets}${family === "quartal" && v.quartalDegree != null ? ` · ${fnBuildQuartalDegreeLabel(v.quartalDegree)}` : ""} (min ${v.minFret} · dist ${v.reach ?? (v.span + 1)})`);
    const voicingSelectClass = isMobileLayout ? `${UI_SELECT_SM} min-w-0 flex-1 max-w-[172px]` : UI_SELECT_SM_AUTO;
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>Digitación en rango ({options.length} opciones)</label>
        <div className="mt-1 flex items-center gap-1.5">
          <button
            type="button"
            className={UI_BTN_SM}
            title="Anterior"
            onClick={() => {
              if (!options.length) return;
              const cur = slot.selFrets ?? options[0].frets;
              let iCur = options.findIndex((v) => v.frets === cur);
              if (iCur < 0) iCur = 0;
              const iNew = (iCur - 1 + options.length) % options.length;
              updateNearSlot(idx, { selFrets: options[iNew].frets });
            }}
            disabled={disableAll || !options.length}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            className={voicingSelectClass}
            value={slot.selFrets || "(auto)"}
            onChange={(e) => {
              const v = e.target.value;
              updateNearSlot(idx, { selFrets: v === "(auto)" ? null : v });
            }}
            disabled={disableAll}
          >
            <option value="(auto)">(auto)</option>
            {options.map((v, optionIdx) => (
              <option key={v.frets} value={v.frets}>
                {voicingOptionLabels[optionIdx]}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={UI_BTN_SM}
            title="Siguiente"
            onClick={() => {
              if (!options.length) return;
              const cur = slot.selFrets ?? options[0].frets;
              let iCur = options.findIndex((v) => v.frets === cur);
              if (iCur < 0) iCur = 0;
              const iNew = (iCur + 1) % options.length;
              updateNearSlot(idx, { selFrets: options[iNew].frets });
            }}
            disabled={disableAll || !options.length}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  function renderNearSlotDistControl(slot, idx, disableAll, className = "min-w-0") {
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>Dist.</label>
        <select
          className={UI_SELECT_SM + " mt-1"}
          style={{ width: "50px" }}
          value={slot.maxDist || 4}
          onChange={(e) => updateNearSlot(idx, { maxDist: parseInt(e.target.value, 10), selFrets: null })}
          disabled={disableAll}
        >
          {[4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    );
  }

  function renderNearSlotQuartalEditor(slot, idx, disableAll, options, errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div
        className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}
      >
        {renderNearSlotToneControl(slot, idx, disableAll, isMobileLayout ? "min-w-0" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(slot)}
            onChange={(e) => updateNearSlot(idx, { family: e.target.value, selFrets: null })}
            disabled={disableAll}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {slot.quartalReference === "scale" ? (
          <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
            <label className={UI_LABEL_SM}>Escala</label>
            <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_SCALE_NAMES, 8)} value={slot.quartalScaleName || "Mayor"} onChange={(e) => updateNearSlot(idx, { quartalScaleName: e.target.value, selFrets: null })} disabled={disableAll}>
              {CHORD_QUARTAL_SCALE_NAMES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.
Diatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.
Por eso el resultado puede no tener la misma raíz elegida.`}>Referencia</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_REFERENCES, 11)} value={slot.quartalReference || "root"} onChange={(e) => updateNearSlot(idx, { quartalReference: e.target.value, selFrets: null })} disabled={disableAll} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.
Diatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.
Por eso el resultado puede no tener la misma raíz elegida.`}>
            {CHORD_QUARTAL_REFERENCES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.
Abierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>Apilado</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_SPREADS, 8)} value={slot.quartalSpread || "closed"} onChange={(e) => updateNearSlot(idx, { quartalSpread: e.target.value, selFrets: null })} disabled={disableAll} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.
Abierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>
            {CHORD_QUARTAL_SPREADS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Voces</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_VOICES, 5)} value={slot.quartalVoices || "4"} onChange={(e) => updateNearSlot(idx, { quartalVoices: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_QUARTAL_VOICES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Puro: todas las cuartas son justas (4J).
Mixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>Tipo cuartal</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_TYPES, 10)} value={slot.quartalType || "pure"} onChange={(e) => updateNearSlot(idx, { quartalType: e.target.value, selFrets: null })} disabled={disableAll} title={`Puro: todas las cuartas son justas (4J).
Mixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>
            {CHORD_QUARTAL_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(slot, idx, disableAll, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, nearSlotDesktopVoicingClass)}
            {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotGuideToneEditor(slot, idx, disableAll, options, errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div
        className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}
      >
        {renderNearSlotToneControl(slot, idx, disableAll, isMobileLayout ? "min-w-0" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(slot)}
            onChange={(e) => updateNearSlot(idx, { family: e.target.value, selFrets: null })}
            disabled={disableAll}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Calidad</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_QUALITIES, 8)} value={slot.guideToneQuality || "maj7"} onChange={(e) => updateNearSlot(idx, { guideToneQuality: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_GUIDE_TONE_QUALITIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Forma</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_FORMS, 7)} value={slot.guideToneForm || "closed"} onChange={(e) => updateNearSlot(idx, { guideToneForm: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_GUIDE_TONE_FORMS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Inversión</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_INVERSIONS, 10)} value={slot.guideToneInversion || "all"} onChange={(e) => updateNearSlot(idx, { guideToneInversion: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_GUIDE_TONE_INVERSIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(slot, idx, disableAll, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, nearSlotDesktopVoicingClass)}
            {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotTertianEditor(slot, idx, disableAll, slotUi, options, errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div
        className={isMobileLayout ? chordMobileEditorTertianGridClass : nearSlotDesktopEditorClass}
      >
        {renderNearSlotToneControl(slot, idx, disableAll, isMobileLayout ? "min-w-0 col-span-2" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0 order-1" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(slot)}
            onChange={(e) => updateNearSlot(idx, { family: e.target.value, selFrets: null })}
            disabled={disableAll}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-5 col-span-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Calidad / Sus</label>
          <div className="mt-1 flex flex-nowrap gap-1.5">
            <select className={UI_SELECT_SM_AUTO} style={nearSelectWidthStyle(CHORD_QUALITIES, 8)} value={slot.quality} onChange={(e) => updateNearSlot(idx, { quality: e.target.value, selFrets: null })} disabled={disableAll}>
              {CHORD_QUALITIES.map((q) => (
                <option key={q.value} value={q.value} disabled={(q.value === "hdim" && slot.structure === "triad" && !slot.ext7) || (q.value === "dom" && slot.structure === "triad" && !slot.ext7)}>{q.label}</option>
              ))}
            </select>
            <select
              className={UI_SELECT_SM_AUTO}
              style={nearSelectWidthStyle(["Sus —", "sus2", "sus4"], 6)}
              value={slot.suspension || "none"}
              onChange={(e) => {
                const v = e.target.value;
                updateNearSlot(idx, { suspension: v, selFrets: null });
                if (v !== "none" && (slot.quality === "dim" || slot.quality === "hdim")) {
                  updateNearSlot(idx, { quality: "maj", selFrets: null });
                }
              }}
              disabled={disableAll}
              title="Suspensión: reemplaza la 3ª por 2ª o 4ª"
            >
              <option value="none">Sus —</option>
              <option value="sus2">sus2</option>
              <option value="sus4">sus4</option>
            </select>
          </div>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Estructura</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_STRUCTURES, 9)}
            value={slot.structure}
            onChange={(e) => {
              const val = e.target.value;
              const patch = val === "triad"
                ? { ext6: false, ext7: false, ext9: false, ext11: false, ext13: false }
                : val === "chord"
                  ? {}
                  : { ext9: false, ext11: false, ext13: false };
              updateNearSlot(idx, {
                structure: val,
                selFrets: null,
                ...(val === "triad" || val === "tetrad" ? { inversion: "all", form: "open", positionForm: "open" } : {}),
                ...patch,
              });
            }}
            disabled={disableAll}
          >
            {CHORD_STRUCTURES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-4" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Forma</label>
          {slotUi.usesManualForm ? (
            <select
              className={UI_SELECT_SM_AUTO + " mt-1"}
              style={nearSelectWidthStyle(CHORD_FORMS, 9)}
              value={slot.form}
              onChange={(e) => {
                const v = e.target.value;
                updateNearSlot(idx, {
                  form: v,
                  positionForm: isDropForm(v) ? (slot.positionForm || "closed") : v,
                  selFrets: null,
                });
              }}
              disabled={disableAll}
              title="Elige la disposición del acorde: cerrado, abierto o drop"
            >
              {CHORD_FORMS.map((form) => (
                <option key={form.value} value={form.value} disabled={isDropForm(form.value) && !slotUi.dropEligible}>{form.label}</option>
              ))}
            </select>
          ) : (
            <div className="mt-1 inline-flex h-7 items-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-xs text-slate-500">Automática</div>
          )}
        </div>
        <div className={isMobileLayout ? "min-w-0 order-3" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Inversión</label>
          <select className={UI_SELECT_SM_AUTO + " mt-1"} style={nearSelectWidthStyle(CHORD_INVERSIONS, 10)} value={slot.inversion} onChange={(e) => updateNearSlot(idx, { inversion: e.target.value, selFrets: null })} disabled={disableAll}>
            {CHORD_INVERSIONS.map((inv) => (
              <option key={inv.value} value={inv.value} disabled={!slotUi.allowThirdInversion && inv.value === "3"}>{inv.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-6 col-span-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Extensiones</label>
          <div className={UI_EXT_GRID}>
            {slotUi.ext.showSeven ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={hasEffectiveSeventh({ structure: slot.structure, ext7: slot.ext7, ext6: slot.ext6, ext9: slot.ext9, ext11: slot.ext11, ext13: slot.ext13 })} onChange={(e) => updateNearSlot(idx, { ext7: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleSeven} /> 7
              </label>
            ) : null}
            {slotUi.ext.showSix ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!slot.ext6} onChange={(e) => updateNearSlot(idx, { ext6: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleSix} /> 6
              </label>
            ) : null}
            {slotUi.ext.showNine ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!slot.ext9} onChange={(e) => updateNearSlot(idx, { ext9: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleNine} /> 9
              </label>
            ) : null}
            {slotUi.ext.showEleven ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!slot.ext11} onChange={(e) => updateNearSlot(idx, { ext11: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleEleven} /> 11
              </label>
            ) : null}
            {slotUi.ext.showThirteen ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!slot.ext13} onChange={(e) => updateNearSlot(idx, { ext13: e.target.checked, selFrets: null })} disabled={disableAll || !slotUi.ext.canToggleThirteen} /> 13
              </label>
            ) : null}
          </div>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(slot, idx, disableAll, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg, nearSlotDesktopVoicingCompactClass)}
            {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotEditorFields(slot, idx, disableAll, slotUi, options, errMsg, opts = {}) {
    if (nearSlotFamilyOf(slot) === "quartal") {
      return renderNearSlotQuartalEditor(slot, idx, disableAll, options, errMsg, opts);
    }
    if (nearSlotFamilyOf(slot) === "guide_tones") {
      return renderNearSlotGuideToneEditor(slot, idx, disableAll, options, errMsg, opts);
    }
    return renderNearSlotTertianEditor(slot, idx, disableAll, slotUi, options, errMsg, opts);
  }

  function buildNearSlotRenderData(slot, idx) {
    const disableAll = !slot.enabled;
    const r = nearComputed.ranked[idx];
    const selectedVoicing = nearComputed.selected[idx] || null;
    const slotData = buildNearSlotStudyEntry(slot, r?.plan || null, selectedVoicing, idx);
    const notes = (slotData?.notes || spellChordNotesForSlot(slot)).join(", ");
    const slotDisplayName = slotData?.summary || "";
    const slotUi = r?.plan?.ui || buildChordUiRestrictions({
      structure: slot.structure,
      ext7: slot.ext7,
      ext6: slot.ext6,
      ext9: slot.ext9,
      ext11: slot.ext11,
      ext13: slot.ext13,
    });
    const rankedOptions = r?.ranked || [];
    const options = [...rankedOptions]
      .sort((a, b) => (a.minFret - b.minFret) || ((a.reach ?? (a.span + 1)) - (b.reach ?? (b.span + 1))) || (a.maxFret - b.maxFret) || a.frets.localeCompare(b.frets))
      .slice(0, idx === 0 ? 60 : 40);
    const errMsg = r?.err || null;
    const badgeMeta = buildNearSlotNoteMeta(slot, selectedVoicing);
    const badgeStripItems = badgeMeta ? badgeMeta.notes.map((note, noteIdx) => ({
      note,
      degree: badgeMeta.degreeLabels?.[noteIdx] || "",
      role: chordBadgeRoleFromDegreeLabel(badgeMeta.degreeLabels?.[noteIdx] || "", badgeMeta.intervals?.[noteIdx] ?? 0),
    })) : [];
    const slotLabel = `Acorde ${idx + 1}`;
    const titleText = `${slotLabel}${nearComputed.baseIdx === idx ? " (referencia)" : ""}`;

    return {
      disableAll,
      errMsg,
      options,
      slotData,
      slotUi,
      badgeStripItems,
      slotLabel,
      titleText,
      nearTitle: errMsg ? (
        <span className="inline-flex flex-wrap items-center gap-1">
          <span>{`${titleText} - `}</span>
          <span className="text-rose-400">{errMsg}</span>
        </span>
      ) : titleText,
      description: `${slotDisplayName} · Notas: ${notes}`,
    };
  }

  function renderNearSlotOpenStringsToggle(slot, idx, disableAll, className = "") {
    return (
      <label
        className={`inline-flex h-7 items-center gap-2 rounded-xl border px-2 text-xs font-semibold ${disableAll ? "cursor-not-allowed" : ""} ${className}`.trim()}
        style={disableAll ? {
          backgroundColor: "var(--control-disabled-bg)",
          borderColor: "var(--control-disabled-border)",
          color: "var(--control-disabled-text)",
        } : undefined}
        title="Permite usar cuerdas al aire como opción de voicing dentro del rango. La distancia se calcula solo con las notas pisadas."
      >
        <span>Permitir cuerdas al aire</span>
        <input
          type="checkbox"
          checked={slot.allowOpenStrings === true}
          onChange={(e) => updateNearSlot(idx, { allowOpenStrings: e.target.checked, selFrets: null })}
          disabled={disableAll}
          title="Permite usar cuerdas al aire como opción de voicing dentro del rango. La distancia se calcula solo con las notas pisadas."
          className="h-4 w-4 rounded border-slate-300"
        />
      </label>
    );
  }

  function renderMobileNearSlotCard(slot, idx, renderData) {
    const { disableAll, options, errMsg, slotData, badgeStripItems, slotLabel, titleText, description } = renderData;
    const titleMeta = titleText.startsWith(slotLabel) ? titleText.slice(slotLabel.length).trim() : "";
    const mobileDescription = titleMeta ? `${titleMeta} · ${description}` : description;

    return (
      <PanelBlock
        key={idx}
        as="div"
        level="subsection"
        title={slotLabel}
        description={null}
        disabledHeader={disableAll}
        bodyClassName="overflow-visible"
        headerAside={<div className="flex items-center gap-1.5">
            <button
              type="button"
              className={`${UI_BTN_SM} inline-flex items-center justify-center`}
              title="Abre el análisis del acorde, del voicing y de sus tensiones."
              onClick={() => {
                setStudyTarget(String(idx));
                setStudyOpen(true);
              }}
              disabled={disableAll}
              aria-label={`Estudiar Acorde ${idx + 1}`}
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <label className="inline-flex h-7 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm">
              <input
                type="checkbox"
                checked={!!slot.enabled}
                onChange={(e) => updateNearSlot(idx, { enabled: e.target.checked, selFrets: null })}
                className="h-4 w-4 rounded border-slate-300"
                title={`Activar/desactivar Acorde ${idx + 1}`}
              />
              <span>Activo</span>
            </label>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-sky-50 hover:text-slate-900"
              onClick={() => setMobileNearChordEditorIdx(idx)}
              aria-label={`Editar Acorde ${idx + 1}`}
            >
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>}
      >
        <div className="mb-3 text-[13px] font-semibold leading-5 text-slate-600">
          {mobileDescription}
        </div>
        {errMsg ? (
          <div className="mb-3 text-xs font-semibold text-rose-400">
            {errMsg}
          </div>
        ) : null}
        {badgeStripItems.length ? (
          <div>
            <ChordNoteBadgeStrip
              items={badgeStripItems}
              bassNote={slotData?.bassName || null}
              colorMap={colors}
            />
          </div>
        ) : null}
        <div className={badgeStripItems.length ? "mt-3" : ""}>
          {renderNearSlotOpenStringsToggle(slot, idx, disableAll)}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[210px] flex-1">
            {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg)}
          </div>
          {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
        </div>
      </PanelBlock>
    );
  }

  function renderMobileNearSlotEditorPortal() {
    if (!isMobileLayout || mobileNearChordEditorIdx == null || typeof document === "undefined") return null;
    const slot = nearSlots[mobileNearChordEditorIdx];
    if (!slot) return null;

    const { disableAll, options, errMsg, slotUi, titleText, description } = buildNearSlotRenderData(slot, mobileNearChordEditorIdx);
    const editorPanel = (
      <PanelBlock
        level="subsection"
        title={`Editar ${titleText}`}
        description={description}
        className="w-full max-h-[calc(100vh-6rem)] shadow-2xl"
        bodyClassName="max-h-[calc(100vh-11rem)] overflow-y-auto overflow-x-visible"
        headerAside={<button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-sky-50"
            onClick={() => setMobileNearChordEditorIdx(null)}
            aria-label="Cerrar edición de acorde cercano"
          >
            <X className="h-4 w-4" />
          </button>}
      >
        <div className="mb-3">
          <label className={UI_LABEL_SM}>Color del acorde</label>
          <div className="mt-1 inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-700">Fondo</span>
            <input
              type="color"
              value={nearBgColors[mobileNearChordEditorIdx]}
              onChange={(e) => setNearBgColor(mobileNearChordEditorIdx, e.target.value)}
              className="h-6 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
              disabled={disableAll}
            />
          </div>
        </div>
        {renderNearSlotEditorFields(slot, mobileNearChordEditorIdx, disableAll, slotUi, options, errMsg, { showMobileVoicing: false })}
      </PanelBlock>
    );

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xl:hidden">
        <div className="w-full max-w-[430px]">
          {editorPanel}
        </div>
      </div>,
      document.body
    );
  }

  // Estado visual de b/# (solo para acordes): si la tónica es nota negra, resaltamos b o # según la ortografía.
  const chordAccidental = !NATURAL_PCS.has(mod12(chordRootPc));

  const scaleOptions = useMemo(
    () => Object.keys(SCALE_PRESETS).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    []
  );
  const scaleSelectWidth = fnMaxLabelCh(scaleOptions.map((item) => scaleOptionLabel(item)), 18);
  const harmonyModeSelectWidth = fnMaxLabelCh(["Diatónica", "Funcional menor (V7)"], 20);

  const effectiveBoards = isMobileLayout
    ? {
        scale: mobileActiveSection === "scale",
        patterns: mobileActiveSection === "patterns",
        route: mobileActiveSection === "route",
        chords: mobileActiveSection === "chords",
        nearChords: mobileActiveSection === "nearChords",
        standards: mobileActiveSection === "standards",
        configuration: mobileMenuOpen,
      }
    : showBoards;

  const controlsPanelClass = isMobileLayout
    ? `fixed inset-y-0 right-0 z-50 w-[min(92vw,420px)] overflow-y-auto bg-sky-100 px-3 py-4 shadow-2xl transition-transform duration-200 ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`
    : "";
  const selectedQuickPresetIndex = Math.max(0, Math.min(QUICK_PRESET_COUNT - 1, parseInt(selectedQuickPresetSlot, 10) || 0));
  const selectedQuickPreset = quickPresets[selectedQuickPresetIndex] || null;
  const tonalContextSummary = `${pcToName(rootPc, preferSharps)} ${scaleName} · armonización ${harmonyMode === "functional_minor" ? "funcional menor" : "diatónica"}`;
  const shouldLoadStandardsCatalog = effectiveBoards.standards || mobileStandardsCatalogOpen;
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
  useEffect(() => {
    if (!shouldLoadStandardsCatalog || standardsCatalogStatus !== "idle") return undefined;
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
  useEffect(() => {
    if (!standardsItems.length) return;
    if (standardsItems.some((item) => item?.id === selectedStandardId)) return;
    const preferred = standardsItems.find((item) => item.id === "all-of-me") || standardsItems[0];
    if (preferred) setSelectedStandardId(preferred.id);
  }, [selectedStandardId, standardsItems]);
  const selectedCatalogStandard = useMemo(() => {
    if (standardsFiltersActive && !filteredStandards.length) return null;
    const activeItems = filteredStandards.length ? filteredStandards : standardsItems;
    return activeItems.find((item) => item?.id === selectedStandardId) || activeItems[0] || null;
  }, [filteredStandards, standardsFiltersActive, standardsItems, selectedStandardId]);
  const selectedLoadedStandard = selectedCatalogStandard ? standardsLoadedMap[selectedCatalogStandard.id] || null : null;
  const selectedStandard = selectedLoadedStandard || selectedCatalogStandard || null;
  useEffect(() => {
    const item = selectedCatalogStandard;
    if (!item?.hasJJazzLabSource || !item?.sourcePath) {
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
  const selectedStandardRealSections = useMemo(() => getStandardRealChartSections(selectedStandard), [selectedStandard]);
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
  useEffect(() => {
    setStandardsRealSelectionIds((prev) => prev.filter((id) => selectedStandardRealEventMap.has(id)));
  }, [selectedStandardRealEventMap]);
  useEffect(() => {
    if (standardsNotice?.type !== "success") return undefined;
    const timeoutId = window.setTimeout(() => {
      setStandardsNotice((current) => (
        current?.type === "success" ? null : current
      ));
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [standardsNotice]);
  useEffect(() => {
    if (isMobileLayout) return;
    setMobileStandardsCatalogOpen(false);
  }, [isMobileLayout]);
  const themeSoftBg = themeObjectBg;
  const themeHoverBg = themeObjectBg;
  const themeDisabledControlText = isDark(themeDisabledControlBg) ? "#f8fafc" : "#64748b";
  const themeDisabledControlBorder = isDark(themeDisabledControlBg) ? "#475569" : "#cbd5e1";
  const themeFretInlayBg = mixHexColors(themeSectionHeaderBg, "#71a3c1", 0.46);
  const routeLabPickHelpText = `Click en el mástil de ruta para elegir: ${routeLabPickNext === "start" ? "Inicio" : "Fin"}.`;
  const mobileRenderedCenterSection = mobileSectionTransition?.fromSection || mobileActiveSection;
  const mobileRenderedSectionIdx = MOBILE_BOTTOM_NAV_OPTIONS.findIndex((option) => option.value === mobileRenderedCenterSection);
  const mobilePrevSection = mobileRenderedSectionIdx > 0 ? MOBILE_BOTTOM_NAV_OPTIONS[mobileRenderedSectionIdx - 1].value : null;
  const mobileNextSection =
    mobileRenderedSectionIdx >= 0 && mobileRenderedSectionIdx < MOBILE_BOTTOM_NAV_OPTIONS.length - 1
      ? MOBILE_BOTTOM_NAV_OPTIONS[mobileRenderedSectionIdx + 1].value
      : null;
  const mobileTransitionTargetSection = mobileSectionTransition?.targetSection || null;
  const mobileTransitionDirection = mobileSectionTransition?.direction || 0;
  const mobileRenderedPrevSection = mobileTransitionDirection < 0 ? mobileTransitionTargetSection : mobilePrevSection;
  const mobileRenderedNextSection = mobileTransitionDirection > 0 ? mobileTransitionTargetSection : mobileNextSection;
  const mobileBottomNavSelectedSection = mobileActiveSection;
  const appThemeStyle = {
    backgroundColor: themePageBg,
    backgroundImage: "none",
    "--page-bg": themePageBg,
    "--panel-bg": themeElementBg,
    "--panel-soft-bg": themeSoftBg,
    "--panel-hover-bg": themeHoverBg,
    "--section-header-bg": themeSectionHeaderBg,
    "--subsection-header-bg": themeObjectBg,
    "--fret-inlay-bg": themeFretInlayBg,
    "--fret-inlay-bg-soft": rgba(themeFretInlayBg, 0.78),
    "--control-disabled-bg": themeDisabledControlBg,
    "--control-disabled-text": themeDisabledControlText,
    "--control-disabled-border": themeDisabledControlBorder,
  };

  function chordControlsSummary() {
    const raw = chordFamily === "quartal"
      ? `${chordQuartalDisplayName}${chordQuartalDegreeText ? ` · ${chordQuartalDegreeText}` : ""}`
      : chordFamily === "guide_tones"
        ? guideToneSectionDisplayName
        : chordSectionDisplayName;
    return String(raw || "").replace(/\s+·\s+/g, " - ");
  }

  const mobileChordSummaryFullText = chordControlsSummary();
  const mobileChordSummaryCompactText = mobileChordSummaryFullText.replace(/\bCuatriada\b/g, "Cuatri");

  useEffect(() => {
    if (!isMobileLayout) {
      setMobileChordSummaryUseCompact(false);
      return undefined;
    }

    const node = mobileChordSummaryMeasureRef.current;
    if (!node) {
      setMobileChordSummaryUseCompact(false);
      return undefined;
    }

    let frameId = 0;
    const update = () => {
      frameId = 0;
      setMobileChordSummaryUseCompact(node.scrollWidth > node.clientWidth + 1);
    };
    const schedule = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(update);
    };

    schedule();
    const ResizeObserverImpl = typeof window !== "undefined" ? window.ResizeObserver : undefined;
    const observer = ResizeObserverImpl ? new ResizeObserverImpl(schedule) : null;
    if (observer) observer.observe(node);
    if (typeof window !== "undefined") window.addEventListener("resize", schedule);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
      if (typeof window !== "undefined") window.removeEventListener("resize", schedule);
    };
  }, [isMobileLayout, mobileRenderedCenterSection, chordDetectMode, mobileChordSummaryFullText]);

  function renderChordBadgeStripBlock(className = "") {
    const commonClass = className.trim();
    if (chordFamily === "quartal") {
      return (
        <div className={commonClass}>
          <ChordNoteBadgeStrip items={chordQuartalBadgeItems} bassNote={chordQuartalBassNote} colorMap={colors} />
        </div>
      );
    }
    if (chordFamily === "guide_tones") {
      return (
        <div className={commonClass}>
          <ChordNoteBadgeStrip items={guideToneBadgeItems} bassNote={guideToneBassNote} colorMap={colors} />
        </div>
      );
    }
    return (
      <div className={commonClass}>
        <ChordNoteBadgeStrip items={chordHeaderBadgeItems} bassNote={chordHeaderBassNote} colorMap={colors} />
      </div>
    );
  }

  function renderMainChordVoicingPicker(className = "") {
    if (chordDetectMode) return null;
    const isQuartal = chordFamily === "quartal";
    const isGuideTones = chordFamily === "guide_tones";
    const voicings = isQuartal ? chordQuartalVoicings : isGuideTones ? guideToneVoicings : chordVoicings;
    const currentIdx = isQuartal ? chordQuartalVoicingIdx : isGuideTones ? guideToneVoicingIdx : chordVoicingIdx;
    const selectedFrets = isQuartal ? chordQuartalSelectedFrets : isGuideTones ? guideToneSelectedFrets : chordSelectedFrets;
    const setIdx = isQuartal ? setChordQuartalVoicingIdx : isGuideTones ? setGuideToneVoicingIdx : setChordVoicingIdx;
    const setSelectedFrets = isQuartal ? setChordQuartalSelectedFrets : isGuideTones ? setGuideToneSelectedFrets : setChordSelectedFrets;
    const voicingOptionLabels = voicings.map((v, i) => `${i + 1}. ${v.frets}${isQuartal && v.quartalDegree != null ? ` · ${fnBuildQuartalDegreeLabel(v.quartalDegree)}` : ""} (dist ${v.reach ?? (v.span + 1)})`);
    const selectedOptionIdx = Math.max(0, voicings.findIndex((v) => v.frets === (selectedFrets || voicings[currentIdx]?.frets || "")));
    const selectedVoicingLabel = voicingOptionLabels[selectedOptionIdx] || "Voicing";
    const voicingSelectClass = isMobileLayout ? `${UI_SELECT_SM_COMPACT} min-w-0 flex-1` : UI_SELECT_SM_AUTO;

    const selectIdx = (nextIdx) => {
      if (!voicings.length) return;
      const normalized = (nextIdx + voicings.length) % voicings.length;
      setIdx(normalized);
      setSelectedFrets(voicings[normalized]?.frets ?? null);
    };

    return (
      <div className={className.trim()}>
        <label className={UI_LABEL_SM}>Voicing ({voicings.length} opciones)</label>
        <div className="mt-1 flex items-center gap-1.5">
          <button
            type="button"
            className={UI_BTN_SM}
            title="Anterior"
            onClick={() => selectIdx(currentIdx - 1)}
            disabled={!voicings.length}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <select
            className={voicingSelectClass}
            style={isMobileLayout ? undefined : { width: fnLabelWidthCh(selectedVoicingLabel, 20, 2), maxWidth: "218px" }}
            value={selectedFrets || voicings[currentIdx]?.frets || ""}
            onChange={(e) => {
              const frets = e.target.value;
              const nextIdx = voicings.findIndex((v) => v.frets === frets);
              if (nextIdx >= 0) selectIdx(nextIdx);
            }}
            disabled={!voicings.length}
          >
            {voicings.map((v, i) => (
              <option key={`${v.frets}-${i}`} value={v.frets}>
                {voicingOptionLabels[i]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={UI_BTN_SM}
            title="Siguiente"
            onClick={() => selectIdx(currentIdx + 1)}
            disabled={!voicings.length}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {!isQuartal && !isGuideTones && chordDbError ? <div className="mt-1 text-[11px] font-semibold text-rose-600">{chordDbError}</div> : null}
      </div>
    );
  }

  function openMainChordStudy() {
    setStudyTarget("main");
    setStudyOpen(true);
  }

  function renderMainChordDistControl(className = "") {
    if (chordDetectMode) return null;
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>Dist.</label>
        <select
          className={chordSelectClass + " mt-1"}
          value={chordMaxDist}
          onChange={(e) => setChordMaxDist(parseInt(e.target.value, 10))}
        >
          {[4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    );
  }

  function _renderDesktopChordSummaryCard() {
    if (isMobileLayout || chordDetectMode) return null;
    return (
      <div
        className="rounded-2xl border border-slate-200 p-3 text-left shadow-sm ring-1 ring-slate-200"
        style={{ backgroundColor: "var(--subsection-header-bg, #ebf2fa)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-800">Resumen del acorde</div>
            <div className="mt-1 text-[13px] font-semibold leading-5 text-slate-600">{mobileChordSummaryFullText}</div>
          </div>
          <button
            type="button"
            className={UI_BTN_SM + " w-auto px-3"}
            title="Abre el análisis del acorde, del voicing y de sus tensiones."
            onClick={openMainChordStudy}
          >
            Estudiar
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            {renderChordBadgeStripBlock()}
          </div>
          <div className="ml-auto flex shrink-0 items-end gap-2">
            {renderMainChordVoicingPicker("shrink-0")}
            {renderMainChordDistControl("w-[50px] shrink-0")}
          </div>
        </div>
      </div>
    );
  }

  function renderMobileChordSummaryCard() {
    return (
      <div
        className="rounded-2xl border border-slate-200 p-3 text-left shadow-sm ring-1 ring-slate-200"
        style={{ backgroundColor: "var(--subsection-header-bg, #ebf2fa)" }}
      >
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => setMobileChordEditorOpen(true)}
            >
              <div className="text-sm font-semibold text-slate-800">Acorde</div>
            </button>
            <InlineInfoButton label="Acorde" info={CHORD_EDITOR_INFO_TEXT} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className={`${UI_BTN_SM} inline-flex items-center justify-center`}
              title="Abre el análisis del acorde, del voicing y de sus tensiones."
              onClick={openMainChordStudy}
              aria-label="Estudiar acorde"
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 hover:bg-sky-50 hover:text-slate-900"
              onClick={() => setMobileChordEditorOpen(true)}
              aria-label="Editar acorde"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative mt-1 whitespace-nowrap text-[13px] font-semibold leading-5 text-slate-600">
          <span>{mobileChordSummaryUseCompact ? mobileChordSummaryCompactText : mobileChordSummaryFullText}</span>
          <span
            ref={mobileChordSummaryMeasureRef}
            className="pointer-events-none invisible absolute inset-x-0 top-0 block whitespace-nowrap"
            aria-hidden="true"
          >
            {mobileChordSummaryFullText}
          </span>
        </div>
        {renderChordBadgeStripBlock("mt-4")}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[210px] flex-1">
            {renderMainChordVoicingPicker()}
          </div>
          {renderMainChordDistControl("shrink-0")}
        </div>
      </div>
    );
  }

  function selectBoardView(section) {
    if (isMobileLayout) {
      setMobileChordEditorOpen(false);
      if (mobileSectionTransition) {
        setMobileMenuOpen(false);
        return;
      }
      const currentIdx = MOBILE_BOTTOM_NAV_OPTIONS.findIndex((option) => option.value === mobileRenderedCenterSection);
      const nextIdx = MOBILE_BOTTOM_NAV_OPTIONS.findIndex((option) => option.value === section);
      if (nextIdx < 0 || currentIdx < 0 || nextIdx === currentIdx) {
        setMobileActiveSection(section);
        setMobileMenuOpen(false);
        setMobileSectionMotion("none");
        resetMobileSectionSlide();
        return;
      }
      setMobileSectionTransition({
        fromSection: mobileRenderedCenterSection,
        targetSection: section,
        direction: nextIdx > currentIdx ? 1 : -1,
      });
      setMobileActiveSection(section);
      setMobileSectionMotion("none");
      resetMobileSectionSlide();
      setMobileMenuOpen(false);
      setMobileSectionSlideTransform(nextIdx > currentIdx ? -mobileSectionViewportWidth() : mobileSectionViewportWidth());
      return;
    }
    if (section === "configuration") {
      setShowBoards((prev) => ({ ...prev, configuration: !prev.configuration }));
      return;
    }
    setShowBoards((prev) => normalizeBoardVisibility({ ...prev, [section]: true }, section));
  }

  function mobileSectionIndex() {
    return MOBILE_BOTTOM_NAV_OPTIONS.findIndex((option) => option.value === mobileActiveSection);
  }

  function canMoveMobileSectionBy(delta) {
    const idx = mobileSectionIndex();
    const nextIdx = idx + delta;
    return idx >= 0 && nextIdx >= 0 && nextIdx < MOBILE_BOTTOM_NAV_OPTIONS.length;
  }

  function isMobileSectionSwipeIgnored(target) {
    return !!target?.closest?.("button,input,select,textarea,a,label,[role='button'],[contenteditable='true'],[data-mobile-swipe-ignore='true']");
  }

  function mobileSectionViewportWidth() {
    const el = mobileSectionSlideRef.current;
    return el?.parentElement?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 360) || 360;
  }

  function mobileSectionCommitDistancePx() {
    return mobileSectionViewportWidth() * MOBILE_SECTION_SWIPE_COMMIT_RATIO;
  }

  function setMobileSectionSlideTransform(dx, dragging = false) {
    const el = mobileSectionSlideRef.current;
    if (!el) return;
    el.style.transition = dragging ? "none" : "";
    el.style.setProperty("--mobile-section-drag-x", `${Math.round(dx)}px`);
    el.style.opacity = dragging ? String(Math.max(0.78, 1 - Math.min(Math.abs(dx), 320) / 1100)) : "";
  }

  function resetMobileSectionSlide() {
    const el = mobileSectionSlideRef.current;
    if (!el) return;
    el.style.transition = "";
    el.style.setProperty("--mobile-section-drag-x", "0px");
    el.style.opacity = "";
  }

  function settleMobileSectionSwipe(delta) {
    const currentIdx = mobileSectionIndex();
    const nextIdx = currentIdx + delta;
    if (currentIdx < 0 || nextIdx < 0 || nextIdx >= MOBILE_BOTTOM_NAV_OPTIONS.length) {
      resetMobileSectionSlide();
      return;
    }
    const targetSection = MOBILE_BOTTOM_NAV_OPTIONS[nextIdx].value;
    setMobileSectionTransition({
      fromSection: mobileActiveSection,
      targetSection,
      direction: delta,
    });
    setMobileActiveSection(targetSection);
    setMobileSectionMotion("none");
    setMobileMenuOpen(false);
    setMobileSectionSlideTransform(delta > 0 ? -mobileSectionViewportWidth() : mobileSectionViewportWidth());
  }

  function handleMobileSectionPointerDown(e) {
    if (!isMobileLayout || mobileSectionTransition || mobileMenuOpen || mobileTonalContextOpen || mobileChordEditorOpen || mobileNearChordEditorIdx != null || mobileStandardsCatalogOpen || mobileInfoPopover || manualOpen || studyOpen) return;
    if ((e.pointerType && e.pointerType !== "touch" && e.pointerType !== "pen") || isMobileSectionSwipeIgnored(e.target)) {
      mobileSectionPointerRef.current = null;
      return;
    }
    setMobileSectionMotion("none");
    resetMobileSectionSlide();
    mobileSectionPointerRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      dragging: false,
      verticalScroll: false,
    };
  }

  function handleMobileSectionPointerMove(e) {
    const start = mobileSectionPointerRef.current;
    if (!start || start.pointerId !== e.pointerId || start.verticalScroll) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (!start.dragging) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        start.verticalScroll = true;
        return;
      }
      if (!(Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2)) return;
      start.dragging = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    e.preventDefault();
    const canMove = canMoveMobileSectionBy(dx < 0 ? 1 : -1);
    const viewportWidth = mobileSectionViewportWidth();
    const maxDrag = Math.max(150, viewportWidth * 0.92);
    const boundedDx = Math.max(-maxDrag, Math.min(maxDrag, canMove ? dx : dx * 0.22));
    start.visualDx = boundedDx;
    setMobileSectionSlideTransform(boundedDx, true);
  }

  function handleMobileSectionPointerEnd(e) {
    const start = mobileSectionPointerRef.current;
    mobileSectionPointerRef.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Si el puntero ya fue liberado, no hay nada que corregir.
    }
    if (!start || start.pointerId !== e.pointerId || start.verticalScroll) {
      resetMobileSectionSlide();
      return;
    }
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const visualDx = typeof start.visualDx === "number" ? start.visualDx : dx;
    const delta = visualDx < 0 ? 1 : -1;
    const isHorizontalSwipe = start.dragging
      && Math.abs(visualDx) > mobileSectionCommitDistancePx()
      && Math.abs(dx) > Math.abs(dy) * 1.2
      && canMoveMobileSectionBy(delta);
    if (!isHorizontalSwipe) {
      resetMobileSectionSlide();
      return;
    }

    mobileSectionSuppressClickRef.current = true;
    window.setTimeout(() => {
      mobileSectionSuppressClickRef.current = false;
    }, 250);
    settleMobileSectionSwipe(delta);
  }

  function handleMobileSectionClickCapture(e) {
    if (!mobileSectionSuppressClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function handleMobileSectionSlideTransitionEnd(e) {
    if (!isMobileLayout || e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (!mobileSectionTransition) return;
    setMobileSectionTransition(null);
  }

  function renderColorPanels(boardVisibility, extraClassName = "") {
    return (
      <div className={extraClassName.trim()}>
        <PanelBlock level="subsection" title="Colores (círculos)">
          <div className="flex flex-wrap gap-1.5 xl:flex-nowrap">
            {[
              { k: "root", label: legend.root },
              { k: "third", label: legend.third },
              { k: "fifth", label: legend.fifth },
              { k: "other", label: legend.other },
              { k: "extra", label: legend.extra },
              { k: "route", label: "Ruta" },
            ].map((it) => (
              <div key={it.k} className="inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1" style={{ backgroundColor: "#ffffff" }}>
                <div className="text-[11px] font-semibold text-slate-700" title={it.k === "route" ? "Ruta (fondo)" : it.label}>{it.label}</div>
                <input
                  type="color"
                  value={colors[it.k]}
                  onChange={(e) => setColor(it.k, e.target.value)}
                  className="h-6 w-7 cursor-pointer rounded-md border border-slate-200 bg-white"
                />
              </div>
            ))}
          </div>
        </PanelBlock>

        {boardVisibility.chords ? (
          <PanelBlock level="subsection" title="Colores (acordes: 7/6/9/11/13)">
            <div className="flex flex-wrap gap-1.5 xl:flex-nowrap">
              {[
                { k: "seventh", label: "7" },
                { k: "sixth", label: "6" },
                { k: "ninth", label: "9" },
                { k: "eleventh", label: "11" },
                { k: "thirteenth", label: "13" },
              ].map((it) => (
                <div key={it.k} className="inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1" style={{ backgroundColor: "#ffffff" }}>
                  <div className="text-[11px] font-semibold text-slate-700">{it.label}</div>
                  <input
                    type="color"
                    value={colors[it.k]}
                    onChange={(e) => setColor(it.k, e.target.value)}
                    className="h-6 w-7 cursor-pointer rounded-md border border-slate-200 bg-white"
                  />
                </div>
                ))}
              </div>
          </PanelBlock>
        ) : null}

        {boardVisibility.patterns ? (
          <PanelBlock
            level="subsection"
            title="Colores (patrones)"
            description={`Patrones disponibles: ${patternsMode === "caged" ? "5 CAGED" : scaleIntervals.length === 5 ? "5 boxes" : scaleIntervals.length === 7 ? "7 3NPS" : "(sin patrones)"}.`}
          >
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 7 }, (_, i) => i).map((i) => (
                <div key={i} className="flex min-w-[120px] flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-sky-50 px-2 py-1.5">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">Patrón {i + 1}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{patternColors[i]}</div>
                  </div>
                  <input
                    type="color"
                    value={patternColors[i]}
                    onChange={(e) => setPatternColor(i, e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
                  />
                </div>
                ))}
              </div>
          </PanelBlock>
        ) : null}
      </div>
    );
  }

  function renderTonalContextFields() {
    return (
      <>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={UI_LABEL_SM}>Nota raíz</label>
              <div className="mt-1 flex items-center gap-1.5">
                <select
                  className={UI_SELECT_SM_TONE}
                  value={scaleRootLetter}
                  onChange={(e) => {
                    const letter = e.target.value;
                    if (!Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) return;
                    setScaleRootLetter(letter);
                    setScaleRootAcc(null);
                    setRootPc(mod12(NATURAL_PC[letter]));
                  }}
                  title="Tónica (letra)"
                >
                  {LETTERS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className={`${UI_BTN_SM} ${scaleRootAcc === "flat" ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                  title="Bajar 1 semitono (b). Si ya está alterado, vuelve a natural."
                  onClick={() => {
                    const nat = mod12(NATURAL_PC[scaleRootLetter]);
                    if (scaleRootAcc === "flat") {
                      setScaleRootAcc(null);
                      setRootPc(nat);
                      return;
                    }
                    setScaleRootAcc("flat");
                    setRootPc(mod12(nat - 1));
                  }}
                >
                  b
                </button>

                <button
                  type="button"
                  className={`${UI_BTN_SM} ${scaleRootAcc === "sharp" ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                  title="Subir 1 semitono (#). Si ya está alterado, vuelve a natural."
                  onClick={() => {
                    const nat = mod12(NATURAL_PC[scaleRootLetter]);
                    if (scaleRootAcc === "sharp") {
                      setScaleRootAcc(null);
                      setRootPc(nat);
                      return;
                    }
                    setScaleRootAcc("sharp");
                    setRootPc(mod12(nat + 1));
                  }}
                >
                  #
                </button>
              </div>
            </div>

            <div>
              <div className={UI_LABEL_SM}>Notación</div>
              <div className="mt-1 flex gap-1.5">
                <ToggleButton
                  active={accMode === "auto"}
                  onClick={() => setAccMode("auto")}
                  title="Auto usa la armadura esperada; por ejemplo, en F mayor usa Bb, no A#."
                >
                  Auto
                </ToggleButton>
                <ToggleButton active={accMode === "sharps"} onClick={() => setAccMode("sharps")} title="Forzar sostenidos">
                  #
                </ToggleButton>
                <ToggleButton active={accMode === "flats"} onClick={() => setAccMode("flats")} title="Forzar bemoles">
                  b
                </ToggleButton>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Escala</label>
            <select
              className={UI_SELECT_SM_AUTO + " mt-1 w-full sm:w-auto"}
              style={{ width: scaleSelectWidth }}
              value={scaleName}
              onChange={(e) => setScaleName(e.target.value)}
              title="Selecciona una escala/preset"
            >
              {scaleOptions.map((s) => (
                <option key={s} value={s}>
                  {scaleOptionLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Armonización</label>
            <select
              className={UI_SELECT_SM_AUTO + " mt-1 w-full sm:w-auto"}
              style={{ width: harmonyModeSelectWidth }}
              value={harmonyMode}
              onChange={(e) => setHarmonyMode(e.target.value)}
              title="Define si la armonización es diatónica o funcional menor (V7 en escalas menores)"
            >
              <option value="diatonic">Diatónica</option>
              <option value="functional_minor">Funcional menor (V7)</option>
            </select>
          </div>

          <div className="min-w-0">
            <div className={UI_LABEL_SM}>Notas extra</div>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                className={UI_INPUT_SM + " w-14"}
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)}
                placeholder="Ej: b2"
                title="Notas/intervalos a resaltar como extra"
              />
              <ToggleButton active={showExtra} onClick={() => setShowExtra((v) => !v)} title="Activa/desactiva las notas extra">
                {showExtra ? "Extra ON" : "Extra OFF"}
              </ToggleButton>
            </div>
          </div>

          {isKingBoxEligibleScale ? (
            <div className="min-w-0 shrink-0">
              <div className={UI_LABEL_SM}>Casita blues</div>
              <div className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-sky-50 px-2 text-xs text-slate-700">
                <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700" title="Muestra las casitas de blues sobre el mástil de escala">
                  <input
                    type="checkbox"
                    checked={showKingBoxes}
                    onChange={(e) => setShowKingBoxes(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Casita
                </label>
                <select
                  className={UI_SELECT_SM.replace("w-full", "") + " h-7 w-28 px-2 text-xs"}
                  value={kingBoxMode}
                  onChange={(e) => setKingBoxMode(e.target.value)}
                  disabled={!showKingBoxes}
                  title="Elige la casita a resaltar"
                >
                  <option value="bb">B.B. King</option>
                  <option value="albert">Albert</option>
                  <option value="both">Ambas</option>
                </select>
                <label className="inline-flex items-center gap-1" title={KING_BOX_DEFAULTS.bb.label}>
                  <span>BB</span>
                  <input
                    type="color"
                    value={kingBoxColors.bb}
                    onChange={(e) => setKingBoxColors((prev) => ({ ...prev, bb: e.target.value }))}
                    className="h-7 w-8 cursor-pointer rounded-md border border-slate-200 bg-white"
                    title="Color del borde de B.B. King"
                  />
                </label>
                <label className="inline-flex items-center gap-1" title={KING_BOX_DEFAULTS.albert.label}>
                  <span>A</span>
                  <input
                    type="color"
                    value={kingBoxColors.albert}
                    onChange={(e) => setKingBoxColors((prev) => ({ ...prev, albert: e.target.value }))}
                    className="h-7 w-8 cursor-pointer rounded-md border border-slate-200 bg-white"
                    title="Color del borde de Albert King"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>

        {scaleName === "Personalizada" ? (
          <div className="mt-3">
            <div className={UI_LABEL_SM}>Intervalos personalizados</div>
            <input
              className={UI_INPUT_SM + " mt-1 w-full"}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Ej: 1 b3 5 6"
              title="Introduce intervalos (1–7 con b/#), notas (F, Ab, C#) o semitonos (s3)"
            />
          </div>
        ) : null}

        <div className="mt-3">
          <div className="mt-1 text-xs text-slate-600"><b>Grados:</b> {scaleTetradDegreesText}</div>
          <div className="mt-0.5 text-xs text-slate-600"><b>Notas:</b> {scaleTetradNotesText}</div>
        </div>

      </>
    );
  }

  function renderTonalContextPanel(className = "") {
    return (
      <PanelBlock
        ref={tonalContextRef}
        title="Contexto tonal"
        titleTooltip={TONAL_CONTEXT_TOOLTIP}
        headerAside={<div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{tonalContextSummary}</div>}
        className={className}
      >
        {renderTonalContextFields()}
      </PanelBlock>
    );
  }

  function renderStandardRealSelectionBar(isOverlay = false) {
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
              onClick={applySelectedStandardRealEventsToNearChords}
              disabled={!selectedStandardRealSelection.length}
            >
              Cargar selección
            </button>
            <button
              type="button"
              className={UI_BTN_SM + " w-auto px-3"}
              onClick={() => setStandardsRealSelectionIds([])}
              disabled={!standardsRealSelectionIds.length}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {selectedStandardRealSelection.length ? selectedStandardRealSelection.map((event, idx) => (
            <button
              key={event.id}
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-left shadow-sm transition-colors hover:bg-sky-100"
              onClick={() => toggleStandardRealEventSelection(event.id)}
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

  function renderStandardRealChartSections(isOverlay = false) {
    if (!selectedStandardHasRealChart) return null;

    const compactMobileChart = isMobileLayout;
    const rowMinWidthClass = compactMobileChart
      ? "min-w-0"
      : (isOverlay ? "min-w-[600px]" : "min-w-[560px]");
    const measureCellClass = compactMobileChart
      ? "min-h-[72px] min-w-0 px-1.5 py-1.5"
      : (isOverlay ? "min-h-[68px] px-3 py-2" : "min-h-[60px] px-2.5 py-1.5");
    const emptyMeasureClass = compactMobileChart
      ? "min-h-[72px]"
      : (isOverlay ? "min-h-[68px]" : "min-h-[60px]");
    const measureEventsClass = compactMobileChart
      ? "mt-1 min-h-[46px] gap-1"
      : (isOverlay ? "mt-2 min-h-[36px] gap-1" : "mt-1.5 min-h-[32px] gap-1");
    const measureButtonClass = compactMobileChart
      ? "px-1.5 py-1 text-[11px]"
      : (isOverlay ? "px-2.5 py-1.5 text-sm" : "px-2 py-1 text-[13px]");
    const repeatButtonClass = compactMobileChart
      ? "h-7 min-w-[30px] px-1.5 text-xl"
      : (isOverlay ? "h-9 min-w-[44px] text-[26px]" : "h-8 min-w-[40px] text-2xl");

    const buildMeasureRows = (measures) => {
      const rows = [];
      for (let idx = 0; idx < measures.length; idx += 4) {
        rows.push(measures.slice(idx, idx + 4));
      }
      return rows;
    };

    return (
      <div className={`space-y-3 ${isOverlay ? "sm:space-y-4" : ""}`}>
        {selectedStandardRealSections.map((section, sectionIdx) => (
          <div key={`${selectedStandard?.id || "standard"}-${section.id}-${sectionIdx}`} className={`rounded-2xl border border-slate-300 bg-white shadow-sm ${isOverlay ? "p-4" : "p-3"}`}>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
              <span className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                {section.label}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {section.bars ? `Compases ${section.bars}` : `${section.measures.length} compases`}
              </span>
            </div>

            <div className={`mt-3 space-y-2 ${compactMobileChart ? "" : "overflow-x-auto"}`}>
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
                        key={`${selectedStandard?.id || "standard"}-${section.id}-${sectionIdx}-${measure.barLabel}-${measureIdx}`}
                        className={`${measureCellClass} border-l border-slate-200 first:border-l-0`}
                      >
                        <div className={`${compactMobileChart ? "text-[9px]" : "text-[10px]"} font-semibold uppercase tracking-wide text-slate-400`}>
                          {measure.barLabel.replace("Compás ", "")}
                        </div>
                        <div className={`${measureEventsClass} flex flex-wrap items-start`}>
                          {measure.repeat && chordEvents.length === 1 ? (() => {
                            const eventId = `${selectedStandard?.id || "standard"}-${section.id}-${sectionIdx}-${measureIdx}-0`;
                            const selectedOrder = standardsRealSelectionIds.indexOf(eventId);
                            const selected = selectedOrder >= 0;
                            return (
                              <button
                                type="button"
                                className={`inline-flex ${repeatButtonClass} items-center justify-center rounded-xl border font-semibold leading-none transition-colors ${selected ? "border-sky-300 bg-sky-100 text-slate-900" : "border-slate-200 bg-white text-slate-400 hover:bg-sky-50"}`}
                                onClick={() => toggleStandardRealEventSelection(eventId)}
                                title={`${selected ? "Quitar" : "Añadir"} ${chordEvents[0].display}`}
                              >
                                %
                              </button>
                            );
                          })() : displayChordEvents.map((event, eventIdx) => {
                            const eventId = `${selectedStandard?.id || "standard"}-${section.id}-${sectionIdx}-${measureIdx}-${eventIdx}`;
                            const selectedOrder = standardsRealSelectionIds.indexOf(eventId);
                            const selected = selectedOrder >= 0;
                            return (
                              <button
                                key={`${eventId}-${event.display}`}
                                type="button"
                                className={`inline-flex max-w-full items-center gap-1 rounded-xl border ${measureButtonClass} font-semibold shadow-sm transition-colors ${selected ? "border-sky-300 bg-sky-100 text-slate-900" : "border-slate-200 bg-white text-slate-800 hover:bg-sky-50"}`}
                                onClick={() => toggleStandardRealEventSelection(eventId)}
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

  function MobileStandardsCatalogOverlay() {
    if (!isMobileLayout || !mobileStandardsCatalogOpen) return null;

    const mobileCatalogResultsLabel = standardsCatalogError
      ? "No he podido cargar el catálogo"
      : standardsCatalogLoading
        ? "Cargando catálogo..."
        : `${filteredStandards.length} resultados visibles`;

    return createPortal(
      <div
        className="fixed inset-0 z-[125] bg-slate-900/45 p-3 xl:hidden"
        onClick={() => setMobileStandardsCatalogOpen(false)}
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
                onClick={() => setMobileStandardsCatalogOpen(false)}
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

  function renderStandardsPanel() {
    const collectionLabel = standardsCatalogSummary;
    const noticeClass = standardsNotice?.type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
    const mobileCatalogSummary = selectedStandard
      ? [selectedStandard.title, selectedStandard.year].filter(Boolean).join(" · ")
      : collectionLabel;

    return (
      <PanelBlock
        title={<InfoTitle label="Standards de jazz" info={STANDARDS_INFO_TEXT} alwaysShow />}
        titleTooltip={!isMobileLayout ? STANDARDS_INFO_TEXT : ""}
        bodyClassName="space-y-3"
      >
        {standardsNotice ? (
          <div className={`rounded-2xl border px-3 py-2 text-sm ${noticeClass}`}>
            {standardsNotice.text}
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
                <PanelBlock
                  level="subsection"
                  title={selectedStandard.title}
                  description={selectedStandard.overview || undefined}
                  bodyClassName="space-y-3"
                >
                  {(Array.isArray(selectedStandard.composers) && selectedStandard.composers.length) || selectedStandard.year || selectedStandard.defaultKey ? (
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      {Array.isArray(selectedStandard.composers) && selectedStandard.composers.length ? (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                          {selectedStandard.composers.join(" · ")}
                        </span>
                      ) : null}
                      {selectedStandard.year ? (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                          {selectedStandard.year}
                        </span>
                      ) : null}
                      {selectedStandard.defaultKey ? (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                          Tono: {selectedStandard.defaultKey}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </PanelBlock>

                <PanelBlock
                  level="subsection"
                  title="Forma"
                >
                  {standardsLoadingId === selectedStandard.id && !selectedStandardHasRealChart ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      Cargando standard...
                    </div>
                  ) : standardsError && !selectedStandardHasRealChart ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm leading-6 text-rose-700">
                      {standardsError}
                    </div>
                  ) : selectedStandardHasRealChart ? (
                    <div className="space-y-3">
                      {renderStandardRealSelectionBar(false)}
                      {renderStandardRealChartSections(false)}
                    </div>
                  ) : null}
                </PanelBlock>
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
            <PanelBlock
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
                <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1 xl:max-h-[70vh]">
                  {filteredStandards.map((item) => {
                    const selected = item.id === selectedStandard?.id;
                    return (
                      <button
                        key={item.id}
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

            {selectedStandard ? (
              <div className="space-y-3">
                <PanelBlock
                  level="subsection"
                  title={selectedStandard.title}
                  description={selectedStandard.overview || undefined}
                  bodyClassName="space-y-3"
                >
                  {(Array.isArray(selectedStandard.composers) && selectedStandard.composers.length) || selectedStandard.year || selectedStandard.defaultKey ? (
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      {Array.isArray(selectedStandard.composers) && selectedStandard.composers.length ? (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                          {selectedStandard.composers.join(" · ")}
                        </span>
                      ) : null}
                      {selectedStandard.year ? (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                          {selectedStandard.year}
                        </span>
                      ) : null}
                      {selectedStandard.defaultKey ? (
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                          Tono: {selectedStandard.defaultKey}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </PanelBlock>

                <PanelBlock
                  level="subsection"
                  title="Forma"
                >
                  {standardsLoadingId === selectedStandard.id && !selectedStandardHasRealChart ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      Cargando standard...
                    </div>
                  ) : standardsError && !selectedStandardHasRealChart ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm leading-6 text-rose-700">
                      {standardsError}
                    </div>
                  ) : selectedStandardHasRealChart ? (
                    <div className="space-y-3">
                      {renderStandardRealSelectionBar(false)}
                      {renderStandardRealChartSections(false)}
                    </div>
                  ) : null}
                </PanelBlock>
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
    );
  }

  function boardVisibilityForSection(section) {
    return {
      scale: section === "scale",
      patterns: section === "patterns",
      route: section === "route",
      chords: section === "chords",
      nearChords: section === "nearChords",
      standards: section === "standards",
      configuration: false,
    };
  }

  function renderMobileTonalContextCard() {
    return (
      <div
        className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 p-3 text-left shadow-sm ring-1 ring-slate-200"
        style={{ backgroundColor: "var(--subsection-header-bg, #ebf2fa)" }}
      >
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setMobileTonalContextOpen(true)}
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800">Contexto tonal</div>
            <div className="mt-1 truncate text-xs font-semibold text-slate-600">{tonalContextSummary}</div>
          </div>
        </button>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-600 hover:text-slate-900"
            onClick={(e) => openMobileInfoPopover(e, "Contexto tonal", TONAL_CONTEXT_TOOLTIP)}
            aria-label="Información sobre Contexto tonal"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 hover:bg-sky-50 hover:text-slate-900"
            onClick={() => setMobileTonalContextOpen(true)}
            aria-label="Abrir contexto tonal"
          >
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  function renderBoardPanels(boardVisibility, { paneClassName = "space-y-3", includeMobileTonalContext = false } = {}) {
    const showMobileTonalContext = includeMobileTonalContext && !boardVisibility.standards;
    return (
      <div className={paneClassName}>
        {showMobileTonalContext ? renderMobileTonalContextCard() : null}
        {boardVisibility.scale ? <Fretboard title="Escala" subtitle={SCALE_INFO_TEXT} mode="scale" /> : null}
        {boardVisibility.patterns ? <Fretboard title="Patrones" subtitle={PATTERNS_INFO_TEXT} mode="patterns" /> : null}
        {boardVisibility.route ? (
          <PanelBlock
            title={<InfoTitle label="Ruta musical" info={routeLabPickHelpText} />}
            titleTooltip={!isMobileLayout ? routeLabPickHelpText : ""}
            headerAside={<div className="text-xs text-slate-600">
                {routeLabResult.reason ? (
                  <span className="font-semibold text-rose-600">{routeLabResult.reason}</span>
                ) : (
                  <span>
                    Ruta: {routeLabStartCode} {"\u2192"} {routeLabEndCode} | pasos: <b>{routeLabResult.path.length}</b>
                  </span>
                )}
              </div>}
          >
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_76px] gap-2 sm:grid-cols-2 xl:grid-cols-[150px_150px_220px]">
              <div>
                <label className={UI_LABEL_SM}>Inicio</label>
                <input
                  className={UI_INPUT_SM + " mt-1 w-full"}
                  value={routeLabStartCode}
                  inputMode="numeric"
                  maxLength={3}
                  onChange={(e) => setRouteLabStartCode(sanitizePosCodeInput(e.target.value))}
                />
              </div>
              <div>
                <label className={UI_LABEL_SM}>Fin</label>
                <input
                  className={UI_INPUT_SM + " mt-1 w-full"}
                  value={routeLabEndCode}
                  inputMode="numeric"
                  maxLength={3}
                  onChange={(e) => setRouteLabEndCode(sanitizePosCodeInput(e.target.value))}
                />
              </div>
              <div>
                <label className={UI_LABEL_SM}>Máx. notas</label>
                <select className={UI_SELECT_SM + " mt-1"} value={routeLabMaxPerString} onChange={(e) => setRouteLabMaxPerString(parseInt(e.target.value, 10))}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <RouteLabFretboard />
            </div>
          </PanelBlock>
        ) : null}

        {boardVisibility.chords ? (
          <div className="space-y-3">
            <PanelBlock
              title={<InfoTitle label="Acordes" info={CHORDS_SECTION_INFO_TEXT} alwaysShow />}
              headerAside={<label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={chordDetectMode}
                    onChange={(e) => setChordDetectMode(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Investigar en mástil
                </label>}
              bodyClassName="space-y-2"
            >
              {isMobileLayout && !chordDetectMode ? renderMobileChordSummaryCard() : null}
              {(() => {
                const chordEditorPanel = (
                  <PanelBlock
                    as="fieldset"
                    disabled={!isMobileLayout && chordDetectMode}
                    level="subsection"
                    title={<InfoTitle label={isMobileLayout ? "Editar acorde" : chordControlsTitle} info={CHORD_EDITOR_INFO_TEXT} alwaysShow />}
                    className={isMobileLayout ? "w-full max-h-[calc(100vh-6rem)] shadow-2xl" : (chordDetectMode ? "opacity-70" : "")}
                    bodyClassName={isMobileLayout ? "max-h-[calc(100vh-11rem)] overflow-y-auto overflow-x-visible" : "overflow-x-auto"}
                    headerAside={isMobileLayout ? (
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-sky-50"
                        onClick={() => setMobileChordEditorOpen(false)}
                        aria-label="Cerrar edición de acorde"
                      >
                        X
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={UI_BTN_SM + " w-auto px-3"}
                        title="Abre el análisis del acorde, del voicing y de sus tensiones."
                        onClick={openMainChordStudy}
                      >
                        Estudiar
                      </button>
                    )}
                  >
                    {!isMobileLayout ? (
                      <div className="mb-3">
                        {renderChordBadgeStripBlock()}
                      </div>
                    ) : null}
                    {chordFamily === "quartal" ? (
                      <div className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}>
                    <div className="min-w-0">
                      <label className={UI_LABEL_SM}>Tono</label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <select
                          className={UI_SELECT_SM_TONE}
                          style={isMobileLayout ? undefined : { width: "50px" }}
                          value={chordUiLetterFromPc(chordRootPc, !!chordSpellPreferSharps)}
                          onChange={(e) => {
                            const letter = e.target.value;
                            if (Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) {
                              setChordRootPc(mod12(NATURAL_PC[letter]));
                            }
                          }}
                        >
                          {LETTERS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={`${UI_BTN_SM} ${chordAccidental && !chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                          title="Bajar 1 semitono"
                          onClick={() => {
                            const letter = chordUiLetterFromPc(chordRootPc, false);
                            const nat = mod12(NATURAL_PC[letter]);
                            const cur = mod12(chordRootPc);
                            if (cur !== nat) {
                              setChordRootPc(nat);
                              setChordSpellPreferSharps(false);
                              return;
                            }
                            setChordRootPc(mod12(nat - 1));
                            setChordSpellPreferSharps(false);
                          }}
                        >
                          b
                        </button>
                        <button
                          type="button"
                          className={`${UI_BTN_SM} ${chordAccidental && chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                          title="Subir 1 semitono"
                          onClick={() => {
                            const letter = chordUiLetterFromPc(chordRootPc, true);
                            const nat = mod12(NATURAL_PC[letter]);
                            const cur = mod12(chordRootPc);
                            if (cur !== nat) {
                              setChordRootPc(nat);
                              setChordSpellPreferSharps(true);
                              return;
                            }
                            setChordRootPc(mod12(nat + 1));
                            setChordSpellPreferSharps(true);
                          }}
                        >
                          #
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM}>Familia</label>
                      <select className={chordAutoSelectClass + " mt-1"} style={isMobileLayout ? undefined : { width: chordFamilySelectWidth }} value={chordFamily} onChange={(e) => setChordFamily(e.target.value)}>
                        {CHORD_FAMILIES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    {chordQuartalReference === "scale" ? (
                      <div className="min-w-0">
                        <label className={UI_LABEL_SM}>Escala</label>
                        <select
                          className={chordSelectClass + " mt-1"}
                          value={chordQuartalScaleName}
                          onChange={(e) => setChordQuartalScaleName(e.target.value)}
                          title="Escala usada para generar los cuartales diatónicos"
                        >
                          {CHORD_QUARTAL_SCALE_NAMES.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.
Diatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.
Por eso el resultado puede no tener la misma raíz elegida.`}>Referencia</label>
                      <select className={chordSelectClass + " mt-1"} value={chordQuartalReference} onChange={(e) => setChordQuartalReference(e.target.value)} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.
Diatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.
Por eso el resultado puede no tener la misma raíz elegida.`}>
                        {CHORD_QUARTAL_REFERENCES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.
Abierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>Apilado</label>
                      <select className={chordSelectClass + " mt-1"} value={chordQuartalSpread} onChange={(e) => setChordQuartalSpread(e.target.value)} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.
Abierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>
                        {CHORD_QUARTAL_SPREADS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM}>Voces</label>
                      <select className={chordSelectClass + " mt-1"} value={chordQuartalVoices} onChange={(e) => setChordQuartalVoices(e.target.value)}>
                        {CHORD_QUARTAL_VOICES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM} title={`Puro: todas las cuartas son justas (4J).
Mixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>Tipo cuartal</label>
                      <select className={chordSelectClass + " mt-1"} value={chordQuartalType} onChange={(e) => setChordQuartalType(e.target.value)} title={`Puro: todas las cuartas son justas (4J).
Mixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>
                        {CHORD_QUARTAL_TYPES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    {!isMobileLayout ? (
                      <div className="ml-auto flex items-end gap-2">
                        {renderMainChordVoicingPicker("shrink-0")}
                        {renderMainChordDistControl("w-[50px] shrink-0")}
                      </div>
                    ) : null}
                      </div>
                    ) : chordFamily === "guide_tones" ? (
                      <div className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}>
                    <div className="min-w-0">
                      <label className={UI_LABEL_SM}>Tono</label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <select
                          className={UI_SELECT_SM_TONE}
                          style={isMobileLayout ? undefined : { width: "50px" }}
                          value={chordUiLetterFromPc(chordRootPc, !!chordSpellPreferSharps)}
                          onChange={(e) => {
                            const letter = e.target.value;
                            if (Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) {
                              setChordRootPc(mod12(NATURAL_PC[letter]));
                            }
                          }}
                        >
                          {LETTERS.map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={`${UI_BTN_SM} ${chordAccidental && !chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                          title="Bajar 1 semitono"
                          onClick={() => {
                            const letter = chordUiLetterFromPc(chordRootPc, false);
                            const nat = mod12(NATURAL_PC[letter]);
                            const cur = mod12(chordRootPc);
                            if (cur !== nat) {
                              setChordRootPc(nat);
                              setChordSpellPreferSharps(false);
                              return;
                            }
                            setChordRootPc(mod12(nat - 1));
                            setChordSpellPreferSharps(false);
                          }}
                        >b</button>
                        <button
                          type="button"
                          className={`${UI_BTN_SM} ${chordAccidental && chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                          title="Subir 1 semitono"
                          onClick={() => {
                            const letter = chordUiLetterFromPc(chordRootPc, true);
                            const nat = mod12(NATURAL_PC[letter]);
                            const cur = mod12(chordRootPc);
                            if (cur !== nat) {
                              setChordRootPc(nat);
                              setChordSpellPreferSharps(true);
                              return;
                            }
                            setChordRootPc(mod12(nat + 1));
                            setChordSpellPreferSharps(true);
                          }}
                        >#</button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM}>Familia</label>
                      <select className={chordSelectClass + " mt-1"} value={chordFamily} onChange={(e) => setChordFamily(e.target.value)}>
                        {CHORD_FAMILIES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM}>Calidad</label>
                      <select className={chordSelectClass + " mt-1"} value={guideToneQuality} onChange={(e) => setGuideToneQuality(e.target.value)}>
                        {CHORD_GUIDE_TONE_QUALITIES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM}>Forma</label>
                      <select className={chordSelectClass + " mt-1"} value={guideToneForm} onChange={(e) => setGuideToneForm(e.target.value)}>
                        {CHORD_GUIDE_TONE_FORMS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className={UI_LABEL_SM}>Inversión</label>
                      <select className={chordSelectClass + " mt-1"} value={guideToneInversion} onChange={(e) => setGuideToneInversion(e.target.value)}>
                        {CHORD_GUIDE_TONE_INVERSIONS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                    {!isMobileLayout ? (
                      <div className="ml-auto flex items-end gap-2">
                        {renderMainChordVoicingPicker("shrink-0")}
                        {renderMainChordDistControl("w-[50px] shrink-0")}
                      </div>
                    ) : null}

                      </div>
                    ) : (
                      <div
                        className={isMobileLayout ? chordMobileEditorTertianGridClass : nearSlotDesktopEditorClass}
                      >
                    <div className={isMobileLayout ? "min-w-0 col-span-2" : "min-w-0"}>
                      <label className={UI_LABEL_SM}>Tono</label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <select
                          className={UI_SELECT_SM_TONE}
                          style={isMobileLayout ? undefined : { width: "50px" }}
                          value={chordUiLetterFromPc(chordRootPc, !!chordSpellPreferSharps)}
                          onChange={(e) => {
                            const letter = e.target.value;
                            if (Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) {
                              setChordRootPc(mod12(NATURAL_PC[letter]));
                            }
                          }}
                        >
                          {LETTERS.map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={`${UI_BTN_SM} ${chordAccidental && !chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                          title="Bajar 1 semitono"
                          onClick={() => {
                            const letter = chordUiLetterFromPc(chordRootPc, false);
                            const nat = mod12(NATURAL_PC[letter]);
                            const cur = mod12(chordRootPc);
                            if (cur !== nat) {
                              setChordRootPc(nat);
                              setChordSpellPreferSharps(false);
                              return;
                            }
                            setChordRootPc(mod12(nat - 1));
                            setChordSpellPreferSharps(false);
                          }}
                        >
                          b
                        </button>
                        <button
                          type="button"
                          className={`${UI_BTN_SM} ${chordAccidental && chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                          title="Subir 1 semitono"
                          onClick={() => {
                            const letter = chordUiLetterFromPc(chordRootPc, true);
                            const nat = mod12(NATURAL_PC[letter]);
                            const cur = mod12(chordRootPc);
                            if (cur !== nat) {
                              setChordRootPc(nat);
                              setChordSpellPreferSharps(true);
                              return;
                            }
                            setChordRootPc(mod12(nat + 1));
                            setChordSpellPreferSharps(true);
                          }}
                        >
                          #
                        </button>
                      </div>
                    </div>

                    <div className={isMobileLayout ? "min-w-0 order-1" : "min-w-0"}>
                      <label className={UI_LABEL_SM}>Familia</label>
                      <select className={chordSelectClass + " mt-1"} value={chordFamily} onChange={(e) => setChordFamily(e.target.value)}>
                        {CHORD_FAMILIES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={isMobileLayout ? "min-w-0 order-5 col-span-2" : "min-w-0"}>
                      <label className={UI_LABEL_SM}>Calidad / Sus</label>
                      <div className="mt-1 flex flex-nowrap gap-1.5">
                        <select className={chordAutoSelectClass} style={isMobileLayout ? undefined : { width: chordQualitySelectWidth }} value={chordQuality} onChange={(e) => setChordQuality(e.target.value)}>
                          {CHORD_QUALITIES.map((q) => (
                            <option key={q.value} value={q.value}
                              disabled={
                                (q.value === "hdim" && chordStructure === "triad" && !chordExt7) ||
                                (q.value === "dom" && chordStructure === "triad" && !chordExt7)
                              }
                            >
                              {q.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className={chordAutoSelectClass}
                          style={isMobileLayout ? undefined : { width: chordSuspensionSelectWidth }}
                          value={chordSuspension}
                          onChange={(e) => {
                            const v = e.target.value;
                            setChordSuspension(v);
                            if (v !== "none" && (chordQuality === "dim" || chordQuality === "hdim")) setChordQuality("maj");
                          }}
                          title="Suspensión: reemplaza la 3ª por 2ª o 4ª"
                        >
                          <option value="none">Sus —</option>
                          <option value="sus2">sus2</option>
                          <option value="sus4">sus4</option>
                        </select>
                      </div>
                    </div>

                    <div className={isMobileLayout ? "min-w-0 order-2" : "min-w-0"}>
                      <label className={UI_LABEL_SM}>Estructura</label>
                      <select
                        className={chordSelectClass + " mt-1"}
                        value={chordStructure}
                        onChange={(e) => {
                          const val = e.target.value;
                          setChordStructure(val);
                          if (val === "triad") {
                            setChordExt6(false);
                            setChordExt7(false);
                            setChordExt9(false);
                            setChordExt11(false);
                            setChordExt13(false);
                          }
                          if (val === "triad" || val === "tetrad") {
                            setChordInversion("all");
                            setChordPositionForm("open");
                            setChordForm("open");
                          }
                        }}
                      >
                        {CHORD_STRUCTURES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={isMobileLayout ? "min-w-0 order-4" : "min-w-0"}>
                      <label className={UI_LABEL_SM}>Forma</label>
                      {chordEnginePlan.ui.usesManualForm ? (
                        <select
                          className={chordAutoSelectClass + " mt-1"}
                          style={isMobileLayout ? undefined : { width: chordFormSelectWidth }}
                          value={chordForm}
                          onChange={(e) => {
                            const v = e.target.value;
                            setChordForm(v);
                            if (!isDropForm(v)) setChordPositionForm(v);
                          }}
                          title="Elige la disposición del acorde: cerrado, abierto o drop"
                        >
                          {CHORD_FORMS.map((form) => (
                            <option
                              key={form.value}
                              value={form.value}
                              disabled={isDropForm(form.value) && !chordEnginePlan.ui.dropEligible}
                            >
                              {form.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="mt-1 flex h-7 items-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-xs text-slate-500">
                          Automática
                        </div>
                      )}
                    </div>

                    <div className={isMobileLayout ? "min-w-0 order-3" : "min-w-0"}>
                      <label className={UI_LABEL_SM}>Inversión</label>
                      <select className={chordAutoSelectClass + " mt-1"} style={isMobileLayout ? undefined : { width: chordInversionSelectWidth }} value={chordInversion} onChange={(e) => setChordInversion(e.target.value)}>
                        {CHORD_INVERSIONS.map((inv) => (
                          <option key={inv.value} value={inv.value} disabled={!chordEnginePlan.ui.allowThirdInversion && inv.value === "3"}>
                            {inv.label}
                          </option>
                        ))}
                      </select>
                        </div>

                    <div className={isMobileLayout ? "min-w-0 order-6 col-span-2" : "min-w-0"}>
                      <label className={UI_LABEL_SM}>Extensiones</label>
                      <div className={UI_EXT_GRID}>
                        {chordEnginePlan.ui.ext.showSeven ? (
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={hasEffectiveSeventh({ structure: chordStructure, ext7: chordExt7, ext6: chordExt6, ext9: chordExt9, ext11: chordExt11, ext13: chordExt13 })} onChange={(e) => setChordExt7(e.target.checked)} disabled={!chordEnginePlan.ui.ext.canToggleSeven} /> 7
                          </label>
                        ) : null}
                        {chordEnginePlan.ui.ext.showSix ? (
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={chordExt6}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setChordExt6(v);
                                if (v) setChordExt13(false);
                                if (chordStructure === "tetrad") {
                                  setChordExt9(false);
                                  setChordExt11(false);
                                  setChordExt13(false);
                                }
                              }}
                              disabled={!chordEnginePlan.ui.ext.canToggleSix}
                            /> 6
                          </label>
                        ) : null}
                        {chordEnginePlan.ui.ext.showNine ? (
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={chordExt9}
                              onChange={(e) => {
                                const v = e.target.checked;
                                if (chordStructure === "tetrad") {
                                  setChordExt9(v);
                                  if (v) {
                                    setChordExt11(false);
                                    setChordExt13(false);
                                  }
                                } else {
                                  setChordExt9(v);
                                }
                              }}
                              disabled={!chordEnginePlan.ui.ext.canToggleNine}
                            /> 9
                          </label>
                        ) : null}
                        {chordEnginePlan.ui.ext.showEleven ? (
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={chordExt11}
                              onChange={(e) => {
                                const v = e.target.checked;
                                if (chordStructure === "tetrad") {
                                  setChordExt11(v);
                                  if (v) {
                                    setChordExt9(false);
                                    setChordExt13(false);
                                  }
                                } else {
                                  setChordExt11(v);
                                }
                              }}
                              disabled={!chordEnginePlan.ui.ext.canToggleEleven}
                            /> 11
                          </label>
                        ) : null}
                        {chordEnginePlan.ui.ext.showThirteen ? (
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={chordExt13}
                              onChange={(e) => {
                                const v = e.target.checked;
                                if (chordStructure === "tetrad") {
                                  setChordExt13(v);
                                  if (v) {
                                    setChordExt6(false);
                                    setChordExt9(false);
                                    setChordExt11(false);
                                  }
                                } else {
                                  setChordExt13(v);
                                }
                              }}
                              disabled={!chordEnginePlan.ui.ext.canToggleThirteen}
                            /> 13
                          </label>
                        ) : null}
                      </div>
                    </div>
                    {!isMobileLayout ? (
                      <div className="ml-auto flex items-end gap-2">
                        {renderMainChordVoicingPicker("shrink-0")}
                        {renderMainChordDistControl("w-[50px] shrink-0")}
                      </div>
                    ) : null}
                      </div>
                    )}
                  </PanelBlock>
                );
                if (isMobileLayout) {
                  return mobileChordEditorOpen && !chordDetectMode && typeof document !== "undefined"
                    ? createPortal(
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xl:hidden">
                        <div className="w-full max-w-[430px]">
                          {chordEditorPanel}
                        </div>
                      </div>,
                      document.body
                    )
                    : null;
                }
                return chordEditorPanel;
              })()}
              {chordDetectMode ? (
                <div
                  ref={chordDetectInvestigationAreaRef}
                  style={chordDetectClearMinHeight ? { minHeight: chordDetectClearMinHeight } : undefined}
                >
                  {renderChordInvestigationFretboard()}
                  <PanelBlock
                    level="subsection"
                    title={<InfoTitle label="Posibles acordes" info={DETECTED_CHORDS_INFO_TEXT} alwaysShow />}
                    description={chordDetectSelectedNotes.length
                      ? "Selecciona una lectura para copiarla a la sección Acorde."
                      : "Añade notas en el mástil para ver lecturas posibles."}
                  >
                    <div className="space-y-2">
                      {chordDetectCandidates.length ? chordDetectCandidates.map((cand) => (
                        <div key={cand.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-sky-50 px-3 py-2 text-xs text-slate-700">
                          <label className="flex min-w-0 flex-1 items-start gap-3">
                            <input
                              type="radio"
                              name="detected-chord"
                              checked={chordDetectCandidateId === cand.id}
                              onChange={() => selectDetectedCandidate(cand)}
                              className="mt-0.5 h-4 w-4"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800">{formatChordNamePure(cand)}</div>
                              <div>{cand.intervalPairsText}</div>
                            </div>
                          </label>
                          <button
                            type="button"
                            className={UI_BTN_SM + " w-auto shrink-0 px-3"}
                            onClick={() => applyDetectedCandidate(cand)}
                            disabled={!cand.uiPatch}
                            title={cand.uiPatch ? "Copiar esta lectura a la sección Acorde" : "Esta lectura no es compatible con el constructor superior"}
                          >
                            Copiar en Acorde
                          </button>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-sky-50 px-3 py-3 text-xs text-slate-500">
                          No hay lecturas claras todavía. Empieza con 3 o 4 notas.
                        </div>
                      )}
                    </div>
                  </PanelBlock>
                </div>
              ) : (
                chordFamily === "quartal" ? (
                  <ChordFretboard
                    title="Mástil"
                    infoText={CHORD_FRETBOARD_INFO_TEXT}
                    subtitle={`${chordQuartalUiText}${chordQuartalStepText ? ` · ${chordQuartalStepText}` : ""}.`}
                    voicing={activeQuartalVoicing}
                    voicingIdx={chordQuartalVoicingIdx}
                    voicingTotal={Math.max(1, chordQuartalVoicings.length)}
                    emptyMessage={`No he encontrado apilados ${chordQuartalSpread === "open" ? "abiertos" : "cerrados"} con la distancia actual. Prueba a subir la distancia o cambiar el apilado.`}
                    roleForPc={quartalRoleOfPc}
                    labelForPc={labelForQuartalPc}
                    noteNameForPc={quartalNoteNameForPc}
                  />
                ) : chordFamily === "guide_tones" ? (
                  <GuideToneFretboard
                    title="Mástil"
                    infoText={CHORD_FRETBOARD_INFO_TEXT}
                    voicing={activeGuideToneVoicing}
                    voicingIdx={guideToneVoicingIdx}
                    voicingTotal={Math.max(1, guideToneVoicings.length)}
                    emptyMessage="No he encontrado shells de notas guía con los filtros actuales. Prueba a cambiar forma, inversión o distancia."
                  />
                ) : (
                  <ChordFretboard
                    title="Mástil"
                    infoText={CHORD_FRETBOARD_INFO_TEXT}
                    voicing={activeChordVoicing}
                    voicingIdx={chordVoicingIdx}
                    voicingTotal={Math.max(1, chordVoicings.length)}
                    emptyMessage={chordDbError || "No he encontrado voicings para este acorde con los filtros actuales. Prueba a cambiar forma, inversión, distancia o permitir cuerdas al aire."}
                  />
                )
              )}
            </PanelBlock>
          </div>
        ) : null}

        {boardVisibility.nearChords ? (
          <PanelBlock
            title={isMobileLayout ? (
              <span className="inline-flex items-center gap-2">
                <span>Acordes cercanos</span>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-600 hover:text-slate-900"
                  onClick={(e) => openMobileInfoPopover(e, "Acordes cercanos", NEAR_CHORDS_INFO_TEXT)}
                  aria-label="Información sobre Acordes cercanos"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ) : "Acordes cercanos"}
            titleTooltip={!isMobileLayout ? NEAR_CHORDS_INFO_TEXT : ""}
            headerAside={<div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700" title={!isMobileLayout ? NEAR_AUTO_SCALE_INFO_TEXT : undefined}>
                  <span>Auto escala</span>
                  {isMobileLayout ? (
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-600 hover:text-slate-900"
                      onClick={(e) => openMobileInfoPopover(e, "Auto escala", NEAR_AUTO_SCALE_INFO_TEXT)}
                      aria-label="Información sobre Auto escala"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </span>
                <button
                  type="button"
                  className={`rounded-xl px-2 py-1 text-xs ring-1 ring-slate-200 shadow-sm ${nearAutoScaleSync ? "bg-[#71a3c1] text-slate-900" : "bg-white"}`}
                  onClick={() => setNearAutoScaleSync((v) => !v)}
                  title="Activa o desactiva el ajuste automático de acordes cercanos según la escala"
                >
                  {nearAutoScaleSync ? "ON" : "OFF"}
                </button>
              </div>}
            bodyClassName="space-y-3"
          >
            <div className="text-xs text-slate-600">
              <b>Posibles tonalidades:</b> {nearTonalityAnalysis.text}
            </div>

            <div className="space-y-2">
              {nearSlots.map((slot, idx) => {
                const { disableAll, options, errMsg, slotData, slotUi, badgeStripItems, slotLabel, titleText, nearTitle, description } = buildNearSlotRenderData(slot, idx);

                if (isMobileLayout) {
                  return renderMobileNearSlotCard(slot, idx, { disableAll, options, errMsg, slotData, slotUi, badgeStripItems, slotLabel, titleText, nearTitle, description });
                }

                return (
                  <PanelBlock
                    key={idx}
                    as="div"
                    level="subsection"
                    title={nearTitle}
                    description={description}
                    disabledHeader={disableAll}
                    bodyClassName="overflow-visible"
                    headerAside={<div className="flex items-center gap-2">
                        {renderNearSlotOpenStringsToggle(slot, idx, disableAll)}
                        <button
                          type="button"
                          className={UI_BTN_SM + " w-auto px-3"}
                          title="Abre el análisis del acorde, del voicing y de sus tensiones."
                          onClick={() => {
                            setStudyTarget(String(idx));
                            setStudyOpen(true);
                          }}
                          disabled={disableAll}
                        >
                          Estudiar
                        </button>
                        <span
                          className="text-xs font-semibold"
                          style={disableAll ? { color: "var(--control-disabled-text)" } : undefined}
                        >
                          Fondo
                        </span>
                        <input
                          type="color"
                          value={nearBgColors[idx]}
                          onChange={(e) => setNearBgColor(idx, e.target.value)}
                          className="h-6 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
                          disabled={disableAll}
                        />
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!slot.enabled}
                            onChange={(e) => updateNearSlot(idx, { enabled: e.target.checked, selFrets: null })}
                            className="h-4 w-4 rounded border-slate-300"
                            title={`Activar/desactivar Acorde ${idx + 1}`}
                          />
                          Activo
                        </label>
                      </div>}
                    >
                    {badgeStripItems.length ? (
                      <div className="mb-3">
                        <ChordNoteBadgeStrip
                          items={badgeStripItems}
                          bassNote={slotData?.bassName || null}
                          colorMap={colors}
                        />
                      </div>
                    ) : null}
                    {nearSlotFamilyOf(slot) === "quartal"
                      ? renderNearSlotQuartalEditor(slot, idx, disableAll, options, errMsg)
                      : nearSlotFamilyOf(slot) === "guide_tones"
                        ? renderNearSlotGuideToneEditor(slot, idx, disableAll, options, errMsg)
                        : renderNearSlotTertianEditor(slot, idx, disableAll, slotUi, options, errMsg)}
                  </PanelBlock>
                );
              })}
            </div>

            {renderNearChordsFretboard()}
          </PanelBlock>
        ) : null}

        {boardVisibility.standards ? renderStandardsPanel() : null}

        {(boardVisibility.chords || boardVisibility.nearChords) ? <StudyPanel /> : null}
      </div>
    );
  }

  return (
    <div className="app-theme min-h-screen overflow-x-auto text-slate-900" style={appThemeStyle}>
      <style>{`
        @keyframes mobile-section-slide-next {
          from { opacity: 0.55; transform: translate3d(calc(-33.333333% + 96px), 0, 0); }
          to { opacity: 1; transform: translate3d(calc(-33.333333% + 0px), 0, 0); }
        }
        @keyframes mobile-section-slide-prev {
          from { opacity: 0.55; transform: translate3d(calc(-33.333333% - 96px), 0, 0); }
          to { opacity: 1; transform: translate3d(calc(-33.333333% + 0px), 0, 0); }
        }
        .mobile-section-slide {
          --mobile-section-drag-x: 0px;
          display: flex;
          align-items: flex-start;
          width: 300%;
          touch-action: pan-y;
          transform: translate3d(calc(-33.333333% + var(--mobile-section-drag-x)), 0, 0);
          transition: transform 760ms cubic-bezier(0.22, 1, 0.36, 1), opacity 760ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, opacity;
        }
        .mobile-section-pane {
          flex: 0 0 33.333333%;
          min-width: 0;
          width: 33.333333%;
        }
        .mobile-section-slide[data-motion="next"] {
          animation: mobile-section-slide-next 760ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .mobile-section-slide[data-motion="prev"] {
          animation: mobile-section-slide-prev 760ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-section-slide {
            transition: none !important;
          }
          .mobile-section-slide[data-motion] {
            animation: none !important;
          }
        }
        .app-theme .bg-white { background-color: var(--panel-bg) !important; }
        .app-theme .bg-sky-50 { background: var(--panel-soft-bg) !important; background-image: none !important; }
        .app-theme .bg-sky-100 { background: var(--panel-soft-bg) !important; background-image: none !important; }
        .app-theme .hover\\:bg-sky-50:hover { background-color: var(--panel-hover-bg) !important; }
        .app-theme select:disabled,
        .app-theme textarea:disabled,
        .app-theme button:disabled,
        .app-theme input:disabled:not([type="checkbox"]):not([type="radio"]) {
          background-color: var(--control-disabled-bg) !important;
          border-color: var(--control-disabled-border) !important;
          color: var(--control-disabled-text) !important;
          opacity: 1 !important;
        }
        .app-theme select:disabled:hover,
        .app-theme textarea:disabled:hover,
        .app-theme button:disabled:hover,
        .app-theme input:disabled:not([type="checkbox"]):not([type="radio"]):hover {
          background-color: var(--control-disabled-bg) !important;
          border-color: var(--control-disabled-border) !important;
          color: var(--control-disabled-text) !important;
        }
        .app-theme input[type="color"]:disabled {
          cursor: not-allowed;
        }
      `}</style>
      <div ref={appRootRef} className={`${wrap} ${isMobileLayout ? "pb-28" : ""}`.trim()} style={wrapStyle}>
        <header className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold sm:text-xl">Mástil interactivo: escalas, patrones, rutas y acordes</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">ver. {APP_VERSION}</span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm xl:hidden"
                title={mobileMenuOpen ? "Cerrar configuración" : "Abrir configuración"}
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="mt-2 hidden items-center gap-3 xl:flex">
            <span className="text-xs font-semibold text-slate-700">Menu</span>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleButton active={effectiveBoards.scale} onClick={() => selectBoardView("scale")} title="Muestra el mástil de la escala">
                <NavIconLabel icon={Music} label="Escala" />
              </ToggleButton>
              <ToggleButton active={effectiveBoards.patterns} onClick={() => selectBoardView("patterns")} title="Muestra el mástil de patrones">
                <NavIconLabel icon={Blocks} label="Patrones" />
              </ToggleButton>
              <ToggleButton active={effectiveBoards.route} onClick={() => selectBoardView("route")} title="Muestra el mástil de ruta">
                <NavIconLabel icon={Route} label="Ruta" />
              </ToggleButton>
              <ToggleButton active={effectiveBoards.chords} onClick={() => selectBoardView("chords")} title="Muestra el panel de acordes">
                <NavIconLabel icon={ChordDiagramIcon} label="Acordes" />
              </ToggleButton>
              <ToggleButton active={effectiveBoards.nearChords} onClick={() => selectBoardView("nearChords")} title="Muestra el panel de acordes cercanos">
                <NavIconLabel icon={Waypoints} label="Acordes cercanos" />
              </ToggleButton>
              <ToggleButton active={effectiveBoards.standards} onClick={() => selectBoardView("standards")} title="Muestra la sección de standards de jazz">
                <NavIconLabel icon={BookOpen} label="Standards" />
              </ToggleButton>
              <ToggleButton active={effectiveBoards.configuration} onClick={() => selectBoardView("configuration")} title="Muestra u oculta la configuración general">
                <NavIconLabel icon={Settings} label="Configuración" />
              </ToggleButton>
              <button type="button" className={UI_BTN_SM + " inline-flex w-auto items-center gap-1.5 px-3"} onClick={() => setManualOpen(true)}>
                <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Ayuda</span>
              </button>
            </div>
          </div>
          <input
            ref={importConfigInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              importUiConfigFromFile(e.target.files && e.target.files[0]);
              e.target.value = "";
            }}
          />
          {configNotice ? (
            <div
              className={`mt-2 rounded-xl border px-3 py-2 text-sm ${configNotice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : configNotice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}
            >
              {configNotice.text}
            </div>
          ) : null}
        </header>

        {isMobileLayout ? (
          <div
            className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-200 ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
            onClick={() => setMobileMenuOpen(false)}
          />
        ) : null}

        <div className="space-y-4">
          <div className="space-y-4">
            <div className={`${controlsPanelClass} space-y-4`.trim()}>
              {isMobileLayout ? (
                <div className="mb-3 space-y-3 xl:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Configuración</div>
                      <div className="text-xs text-slate-600">Ajustes globales y visuales de la app.</div>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
                      onClick={() => setMobileMenuOpen(false)}
                      title="Cerrar configuración"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                    <span className="text-xs font-semibold text-slate-700">Ayuda</span>
                    <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={() => setManualOpen(true)}>
                      Abrir
                    </button>
                  </div>
                </div>
              ) : null}

              {effectiveBoards.configuration ? (
                <PanelBlock
                  title="Configuración"
                  description="Ajustes globales, colores y acciones de configuración general de la app."
                  bodyClassName="space-y-3"
                >
                  <PanelBlock
                    as="div"
                    level="subsection"
                    title="Parámetros globales"
                    description="Controles globales: afectan a varios paneles o a toda la vista."
                  >
                    <div className="mt-3 flex flex-wrap items-start gap-3">
                      <div className="min-w-0 sm:min-w-[420px]">
                        <label className={UI_LABEL_SM}>Preset rápido</label>
                        <div className="mt-1 flex items-center gap-2">
                          <select
                            className={UI_SELECT_SM + " w-44"}
                            value={selectedQuickPresetSlot}
                            onChange={(e) => setSelectedQuickPresetSlot(e.target.value)}
                            title="Elige el preset rápido que quieres restaurar o guardar"
                          >
                            {Array.from({ length: QUICK_PRESET_COUNT }, (_, i) => (
                              <option key={i} value={String(i)}>
                                {quickPresets[i]?.name || `Preset ${i + 1}`}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={UI_BTN_SM + " w-auto shrink-0 px-3"}
                            onClick={() => loadQuickPreset(selectedQuickPresetIndex)}
                            disabled={!selectedQuickPreset}
                            title={selectedQuickPreset?.savedAt ? `${selectedQuickPreset?.name} · ${selectedQuickPreset?.savedAt}` : "El preset seleccionado está vacío"}
                          >
                            Restaurar
                          </button>
                          <button
                            type="button"
                            className={UI_BTN_SM + " w-auto shrink-0 px-3"}
                            onClick={() => saveQuickPreset(selectedQuickPresetIndex)}
                            title={`Guardar configuración actual en Preset ${selectedQuickPresetIndex + 1}`}
                          >
                            Guardar
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className={UI_LABEL_SM}>Vista</div>
                        <div className="mt-1 flex gap-1.5">
                          <ToggleButton active={showNotesLabel} onClick={() => setShowNotesLabel((v) => !v)} title="Muestra nombre de la nota">
                            Notas
                          </ToggleButton>
                          <ToggleButton active={showIntervalsLabel} onClick={() => setShowIntervalsLabel((v) => !v)} title="Muestra grado/intervalo">
                            Intervalos
                          </ToggleButton>
                        </div>
                      </div>

                      <div className="min-w-0 sm:min-w-[130px]">
                        <label className={UI_LABEL_SM}>Trastes</label>
                        <select
                          className={UI_SELECT_SM + " mt-1"}
                          value={maxFret}
                          onChange={(e) => setMaxFret(parseInt(e.target.value, 10))}
                          title="Rango de trastes"
                        >
                          {[12, 15, 18, 21, 24].map((n) => (
                            <option key={n} value={n}>
                              0–{n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className={UI_LABEL_SM}>Fondo</div>
                        <div className="mt-1 flex gap-1.5">
                          <ToggleButton active={showNonScale} onClick={() => setShowNonScale((v) => !v)} title="Muestra todas las notas posibles en los mástiles compatibles">
                            Ver todo
                          </ToggleButton>
                        </div>
                      </div>

                      <div>
                        <div className={UI_LABEL_SM}>Debug</div>
                        <div className="mt-1 flex gap-1.5">
                          <ToggleButton active={debugMode} onClick={() => setDebugMode((v) => !v)} title="Muestra detalles técnicos de cálculo de rutas">
                            Debug
                          </ToggleButton>
                        </div>
                      </div>
                    </div>
                  </PanelBlock>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={exportUiConfig}>
                      Exportar config
                    </button>
                    <button
                      type="button"
                      className={UI_BTN_SM + " w-auto px-3"}
                      onClick={() => importConfigInputRef.current && importConfigInputRef.current.click()}
                    >
                      Importar config
                    </button>
                    <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={resetUiConfig}>
                      Restablecer
                    </button>
                  </div>

                  <PanelBlock
                    as="div"
                    level="subsection"
                    title="Tema"
                    description="Ajusta el color del fondo general y de los paneles de la página."
                  >
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <div className="min-w-0">
                        <label className={UI_LABEL_SM}>Fondo página</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={themePageBg}
                            onChange={(e) => setThemePageBg(e.target.value)}
                            title={themePageBg}
                            className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
                          />
                          <span className="text-xs font-semibold text-slate-600">{themePageBg}</span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label className={UI_LABEL_SM}>Fondo objetos</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={themeObjectBg}
                            onChange={(e) => setThemeObjectBg(e.target.value)}
                            title={themeObjectBg}
                            className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
                          />
                          <span className="text-xs font-semibold text-slate-600">{themeObjectBg}</span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label className={UI_LABEL_SM}>Cabecera secciones</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={themeSectionHeaderBg}
                            onChange={(e) => setThemeSectionHeaderBg(e.target.value)}
                            title={themeSectionHeaderBg}
                            className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
                          />
                          <span className="text-xs font-semibold text-slate-600">{themeSectionHeaderBg}</span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label className={UI_LABEL_SM}>Elementos</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={themeElementBg}
                            onChange={(e) => setThemeElementBg(e.target.value)}
                            title={themeElementBg}
                            className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
                          />
                          <span className="text-xs font-semibold text-slate-600">{themeElementBg}</span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label className={UI_LABEL_SM}>Controles deshabilitados</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={themeDisabledControlBg}
                            onChange={(e) => setThemeDisabledControlBg(e.target.value)}
                            title={themeDisabledControlBg}
                            className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
                          />
                          <span className="text-xs font-semibold text-slate-600">{themeDisabledControlBg}</span>
                        </div>
                      </div>

                    </div>
                  </PanelBlock>

                  {renderColorPanels(effectiveBoards, "grid gap-3")}
                </PanelBlock>
              ) : null}

              {!isMobileLayout ? renderTonalContextPanel() : null}
            </div>

            {/* MÁSTILES */}
            <div
              className={isMobileLayout ? "space-y-3 overflow-x-hidden" : "space-y-3"}
              onPointerDown={handleMobileSectionPointerDown}
              onPointerMove={handleMobileSectionPointerMove}
              onPointerUp={handleMobileSectionPointerEnd}
              onPointerCancel={(e) => {
                mobileSectionPointerRef.current = null;
                setMobileSectionTransition(null);
                try {
                  e.currentTarget.releasePointerCapture?.(e.pointerId);
                } catch {
                  // Si el puntero ya fue liberado, no hay nada que corregir.
                }
                resetMobileSectionSlide();
              }}
              onClickCapture={handleMobileSectionClickCapture}
            >
              <div
                ref={mobileSectionSlideRef}
                key={isMobileLayout ? mobileRenderedCenterSection : "desktop-sections"}
                className={isMobileLayout ? "mobile-section-slide" : "space-y-3"}
                data-motion={isMobileLayout ? mobileSectionMotion : undefined}
                onTransitionEnd={isMobileLayout ? handleMobileSectionSlideTransitionEnd : undefined}
              >
                {isMobileLayout ? (
                  <div className="mobile-section-pane px-1 pointer-events-none">
                    {mobileRenderedPrevSection ? renderBoardPanels(boardVisibilityForSection(mobileRenderedPrevSection), { includeMobileTonalContext: true }) : <div className="min-h-[420px]" />}
                  </div>
                ) : null}
                {renderBoardPanels(
                  isMobileLayout ? boardVisibilityForSection(mobileRenderedCenterSection) : effectiveBoards,
                  {
                    paneClassName: isMobileLayout ? "mobile-section-pane space-y-3 px-1" : "space-y-3",
                    includeMobileTonalContext: isMobileLayout,
                  }
                )}
                {isMobileLayout ? (
                  <div className="mobile-section-pane px-1 pointer-events-none">
                    {mobileRenderedNextSection ? renderBoardPanels(boardVisibilityForSection(mobileRenderedNextSection), { includeMobileTonalContext: true }) : <div className="min-h-[420px]" />}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

        </div>
        {isMobileLayout && mobileTonalContextOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/35 xl:hidden"
              onClick={() => setMobileTonalContextOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xl:hidden">
              <div className="w-full max-w-[720px] max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
                <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-[#c7d8e5] px-3 py-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-800">Contexto tonal</div>
                    <div className="mt-1 text-xs font-semibold text-slate-600">{tonalContextSummary}</div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
                    onClick={() => setMobileTonalContextOpen(false)}
                    title="Cerrar contexto tonal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3">
                  {renderTonalContextFields()}
                </div>
              </div>
            </div>
          </>
        ) : null}
        {isMobileLayout && mobileChordEditorOpen && !chordDetectMode ? (
          <div
            className="fixed inset-0 z-40 touch-none overscroll-contain bg-slate-900/35 xl:hidden"
            onClick={() => setMobileChordEditorOpen(false)}
            onTouchMove={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
          />
        ) : null}
        {isMobileLayout && mobileNearChordEditorIdx != null ? (
          <div
            className="fixed inset-0 z-40 touch-none overscroll-contain bg-slate-900/35 xl:hidden"
            onClick={() => setMobileNearChordEditorIdx(null)}
            onTouchMove={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
          />
        ) : null}
        {mobileInfoPopover ? (
          <>
            <div
              className="fixed inset-0 z-40 touch-none overscroll-contain bg-slate-900/35"
              onClick={() => setMobileInfoPopover(null)}
              onTouchMove={(e) => e.preventDefault()}
              onWheel={(e) => e.preventDefault()}
            />
            <div
              className="fixed z-50 rounded-2xl border border-slate-300 bg-white shadow-2xl"
              style={{ left: `${mobileInfoPopover.left}px`, top: `${mobileInfoPopover.top}px`, width: `${mobileInfoPopover.width}px` }}
            >
              <div
                className="absolute -top-2 h-4 w-4 rotate-45 border-l border-t border-slate-300 bg-white"
                style={{ left: `${Math.max(18, Math.min(mobileInfoPopover.arrowLeft - 8, mobileInfoPopover.width - 34))}px` }}
              />
              <div className="relative rounded-2xl bg-white">
                <button
                  type="button"
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
                  onClick={() => setMobileInfoPopover(null)}
                  title="Cerrar información"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="p-4 pr-12">
                  {mobileInfoPopover.title ? (
                    <div className="text-sm font-semibold text-slate-800">{mobileInfoPopover.title}</div>
                  ) : null}
                  <div className={`text-sm leading-6 text-slate-600 ${mobileInfoPopover.title ? "mt-2" : ""} whitespace-pre-line`.trim()}>
                    {mobileInfoPopover.text}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
        {MobileStandardsCatalogOverlay()}
        {renderMobileNearSlotEditorPortal()}
        {isMobileLayout ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex justify-center px-3 xl:hidden">
            <div className="pointer-events-auto w-[min(92vw,430px)] rounded-[30px] border border-slate-200/80 bg-white/96 p-2 shadow-[0_14px_38px_rgba(15,23,42,0.16)] backdrop-blur-md">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${MOBILE_BOTTOM_NAV_OPTIONS.length}, minmax(0, 1fr))` }}>
              {MOBILE_BOTTOM_NAV_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] px-1.5 py-2 text-[10px] font-semibold leading-tight transition-colors ${mobileBottomNavSelectedSection === option.value ? "bg-[#71a3c1] text-slate-900 shadow-[0_8px_20px_rgba(113,163,193,0.28)]" : "bg-transparent text-slate-600 hover:bg-sky-50 hover:text-slate-900"}`}
                  onClick={() => selectBoardView(option.value)}
                  title={option.label}
                  aria-disabled={mobileSectionTransition ? "true" : undefined}
                >
                  <option.icon className={`shrink-0 ${mobileBottomNavSelectedSection === option.value ? "h-[18px] w-[18px]" : "h-[17px] w-[17px]"}`} aria-hidden="true" />
                  <span className={`block max-w-full text-center leading-tight ${option.value === "standards" ? "text-[9px]" : ""}`}>{option.label}</span>
                </button>
              ))}
              </div>
            </div>
          </div>
        ) : null}
              {ManualOverlay()}
        <footer className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600">
          <span>Creado por: Jesus Quevedo Rodriguez</span>
        </footer>
      </div>
    </div>
  );
}
