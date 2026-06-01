import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PanelBlock from "./components/PanelBlock.jsx";
import ChordsPanel, { CopyVoicingButton } from "./components/chords/ChordsPanel.jsx";
import ManualChordPanel from "./components/chords/ManualChordPanel.jsx";
import AppHeader, { ChordDiagramIcon } from "./components/layout/AppHeader.jsx";
import AppFooter from "./components/layout/AppFooter.jsx";
import TonalContextPanel, { TonalContextFields } from "./components/tonal/TonalContextPanel.jsx";
import StudyPanel from "./components/study/StudyPanel.jsx";
import {
  ChordFretboard as ChordFretboardImpl,
  GuideToneFretboard as GuideToneFretboardImpl,
} from "./components/fretboard/ChordVoicingFretboards.jsx";
import {
  HoverCellNote as HoverCellNoteImpl,
  FretInlayRow as FretInlayRowImpl,
  WebFretNumberHeader,
} from "./components/fretboard/FretboardShared.jsx";
import { MobileMainFretboard as MobileMainFretboardImpl } from "./components/fretboard/MobileMainFretboard.jsx";
import AppConfigPanel from "./components/config/AppConfigPanel.jsx";
import { ToggleButton, InfoTitle as InfoTitleImpl } from "./components/ui/AppUiPrimitives.jsx";
import ManualOverlay from "./components/help/ManualOverlay.jsx";
import MobileInfoPopover from "./components/help/MobileInfoPopover.jsx";
import StandardsPanel from "./components/standards/StandardsPanel.jsx";
import { Blocks, BookOpen, ChevronLeft, ChevronRight, Eraser, Info, Music, Play, Route, Search, Volume2, VolumeX, Waypoints, X } from "lucide-react";
import {
  buildDetectedCandidateBadgeItems as buildDetectedCandidateBadgeItemsPure,
  detectChordReadings as detectChordReadingsPure,
  detectOmitFromCandidate as detectOmitFromCandidatePure,
  formatChordName as formatChordNamePure,
  resolveDetectedCandidateFromContext as resolveDetectedCandidateFromContextPure,
} from "./music/chordDetectionEngine.js";
import { rankReadingsWithHarmonyContext as rankReadingsWithHarmonyContextPure } from "./music/harmonyContextRanking.js";
import { chordDbKeyNameFromPc } from "./music/chordDbCatalog.js";

import { buildNearSlotsFromChordSymbols } from "./music/standardsCatalog.js";
import { useStandardsFeature } from "./features/standards/useStandardsFeature.js";
import { buildStudyData } from "./features/study/buildStudyData.js";
import { useRouteFeature } from "./features/route/useRouteFeature.js";
import RouteLabFretboardComponent from "./components/route/RouteLabFretboard.jsx";
import { buildConfigExportFilename, parseImportedConfigText } from "./utils/configIo.js";
import { useTonalityFeature } from "./features/tonality/useTonalityFeature.js";
import { useMobileLayoutFeature } from "./features/layout/useMobileLayoutFeature.js";

import * as AppStaticData from "./music/appStaticData.js";
const {
  NOTES_SHARP,
  NOTES_FLAT,
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
  normalizeVisibleFrets,
  fretNoteSizeClass,
  webAppWidthPx,
  mobileVerticalFretBorderClass,
  mobileVerticalOpenNoteClass,
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
  analyzeChordSetTonality,
  spellNoteFromChordInterval,
  buildDetectedCandidateNoteNameForPc,
  buildDetectedCandidateLabelForPc,
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
  chordCanUseJsonCatalog,
  seventhOffsetForQuality,
  chordBassInterval,
  intervalToChordToken,
  buildChordDegreeLabelsFromUi,
  spellChordNotes,
  normalizeScaleName,
  scaleOptionLabel,
  rgba,
  FRET_CELL_BG,
  FRET_INLAY_BG,
  isDark,
  sanitizePosCodeInput,
  buildMembershipMap,
  preferSharpsFromMajorTonicPc,
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
  buildChordHeaderSummary,
  bassIntervalsForSelection,
  dedupeAndSortVoicings,
  buildOpenSupersetTetradVoicings,
  symmetricRootCandidatesForPlan,
  normalizeGeneratedVoicingForDisplay,
  isStrictFourNoteDropEligible,
  hasEffectiveSeventh,
  chordThirdOffsetFromUI,
  chordFifthOffsetFromUI,
  buildChordUiRestrictions,
  buildChordEnginePlan,
  actualInversionLabelFromVoicing,
  computeInversionSelectorOptions,
  selectClosestPhysicalVoicingIndex,
  deriveDetectedCandidateCopyInversion,
  resolveCopiedVoicingAcrossStructures,
} = AppVoicingStudyCore;

import * as AppPatternRouteStaffCore from "./music/appPatternRouteStaffCore.jsx";
const {
  build3NpsPatternsMerged,
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
const APP_VERSION = "5.62";

function buildChordCopyFingerprint({
  rootPc,
  quality,
  suspension,
  structure,
  ext7,
  ext6,
  ext9,
  ext11,
  ext13,
  omit,
  inversion,
  form,
  maxDist,
  allowOpenStrings,
}) {
  return `${rootPc}|${quality}|${suspension}|${structure}|${ext7 ? 1 : 0}|${ext6 ? 1 : 0}|${ext9 ? 1 : 0}|${ext11 ? 1 : 0}|${ext13 ? 1 : 0}|${omit}|${inversion}|${form}|${maxDist}|${allowOpenStrings ? 1 : 0}`;
}

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

async function parseJsonResponseStrict(res, urlForError) {
  const contentType = String(res.headers?.get?.("content-type") || "").toLowerCase();
  if (!contentType.includes("json")) {
    const sample = (await res.text()).slice(0, 80).replace(/\s+/g, " ").trim();
    throw new Error(`Respuesta no JSON en ${urlForError}: ${contentType || "sin content-type"}${sample ? ` · ${sample}` : ""}`);
  }
  return res.json();
}


// ─── Acorde de referencia (bloque "Investigar en mástil") ────────────────────
const CHORD_REF_NATURAL_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const CHORD_REF_NATURAL_PC      = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHORD_REF_QUALITIES       = ["Mayor", "maj7", "7", "menor", "m7", "m7(b5)", "dim", "dim7", "sus4", "7sus4"];

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
  const [, setMobileChordSummaryUseCompact] = useState(false);

  const [storageHydrated, setStorageHydrated] = useState(false);
  const [configNotice, setConfigNotice] = useState(null);
  const [quickPresets, setQuickPresets] = useState(() => Array.from({ length: QUICK_PRESET_COUNT }, () => null));
  const [selectedQuickPresetSlot, setSelectedQuickPresetSlot] = useState("0");
  const [manualOpen, setManualOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyTarget, setStudyTarget] = useState("main");

  // Notación (auto / override)
  // --------------------------------------------------------------------------
  // ESTADO: ESCALAS, VISTA Y MÁSTILES
  // --------------------------------------------------------------------------

  const tonality = useTonalityFeature();
  const {
    rootPc, setRootPc, scaleRootLetter, setScaleRootLetter, scaleRootAcc, setScaleRootAcc,
    scaleName, setScaleName, harmonyMode, setHarmonyMode, accMode, setAccMode,
    customInput, setCustomInput, extraInput, setExtraInput, showExtra, setShowExtra,
    scaleIntervals, autoPreferSharps, preferSharps, scaleIntervalLabels, scalePcs,
    thirdOffsets, hasFifth, extraIntervals, extraPcs, spelledScaleNotes, spelledExtraNotes,
    scaleTetradHarmony, applyFromConfig,
  } = tonality;
  // Vista (pueden coexistir)
  const [showIntervalsLabel, setShowIntervalsLabel] = useState(true);
  const [showNotesLabel, setShowNotesLabel] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const isNamedPentatonicScale = scaleName === "Pentatónica mayor" || scaleName === "Pentatónica menor";
  const isBluesScale = scaleName === "Pentatónica menor + blue note" || scaleName === "Pentatónica mayor + blue note";
  const isKingBoxEligibleScale = isNamedPentatonicScale || isBluesScale;
  const [maxFret, setMaxFret] = useState(15);

  const [showNonScale, setShowNonScale] = useState(false);

  // Qué mástiles mostrar
  const [showBoards, setShowBoards] = useState(() => normalizeBoardVisibility({ chords: true, configuration: false }, "chords"));
  const layoutFeature = useMobileLayoutFeature();
  const { isMobileLayout, isNarrowBoardLayout, isCompactLayout } = layoutFeature.media;
  const {
    mobileMenuOpen, setMobileMenuOpen,
    mobileActiveSection, setMobileActiveSection,
    mobileSectionTransition, setMobileSectionTransition,
    mobileSectionMotion, setMobileSectionMotion,
    mobileSectionIndex,
    canMoveMobileSectionBy,
  } = layoutFeature.navigation;
  const {
    mobileTonalContextOpen, setMobileTonalContextOpen,
    mobileChordEditorOpen, setMobileChordEditorOpen,
    mobileNearChordEditorIdx, setMobileNearChordEditorIdx,
    mobileInfoPopover, setMobileInfoPopover,
    openMobileInfoPopover,
  } = layoutFeature.overlays;
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
  const [chordOmit, setChordOmit] = useState("none");
  const [chordCopyNotice, setChordCopyNotice] = useState(null);
  const [chordCopiedEntry, setChordCopiedEntry] = useState(null); // { voicing, fingerprint } — patrón físico copiado para preservarlo si no está en la lista visible
  // --------------------------------------------------------------------------
  // ESTADO: DETECCIÓN DE ACORDES EN MÁSTIL
  // --------------------------------------------------------------------------

  const [chordDetectMode, setChordDetectMode] = useState(false);
  const [chordDetectClickAudio, setChordDetectClickAudio] = useState(false);
  const [chordDetectPrioritizeContext, setChordDetectPrioritizeContext] = useState(true);
  const [chordDetectPrioritizeContextTouched, setChordDetectPrioritizeContextTouched] = useState(false);
  const [chordRefNatural, setChordRefNatural] = useState("C");
  const [chordRefAcc, setChordRefAcc] = useState(0);
  const [chordRefQuality, setChordRefQuality] = useState("7");
  const [chordRefEnabled, setChordRefEnabled] = useState(false);
  const [chordDetectSelectedKeys, setChordDetectSelectedKeys] = useState([]);
  const [chordDetectCandidateId, setChordDetectCandidateId] = useState(null);
  const [voicingInputText, setVoicingInputText] = useState("");
  const [chordDetectWindowStart, setChordDetectWindowStart] = useState(1);
  const lastChordDetectCandidateRef = useRef(null);
  const pendingChordDetectCandidateRef = useRef(null);
  const isManualCandidateSelectRef = useRef(false);
  const chordDetectPanelRef = useRef(null);
  const chordDetectInvestigationAreaRef = useRef(null);
  const chordDetectViewportFramesRef = useRef([]);
  const chordDetectViewportTimersRef = useRef([]);
  const [chordDetectPlayingKeys, setChordDetectPlayingKeys] = useState([]);
  const [chordDetectClearMinHeight, setChordDetectClearMinHeight] = useState(null);
  const chordDetectPlaybackTimersRef = useRef([]);
  const layoutModeRef = useRef({
    mobile: false,
    compact: false,
    initialized: false,
  });

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
    const firstVisibleRaw = MOBILE_SECTION_OPTIONS.find((option) => showBoards[option.value])?.value || "chords";
    const firstVisible = firstVisibleRaw === "configuration" ? "chords" : firstVisibleRaw;
    setMobileSectionTransition(null);
    setMobileSectionMotion("none");
    resetMobileSectionSlide();
    setMobileActiveSection(firstVisible);
  }, [isMobileLayout, showBoards, setMobileMenuOpen, setMobileActiveSection, setMobileSectionTransition, setMobileSectionMotion, setMobileTonalContextOpen, setMobileChordEditorOpen, setMobileNearChordEditorIdx, setMobileInfoPopover]);

  useEffect(() => {
    const prevLayout = layoutModeRef.current;
    const enteringMobileOrCompact =
      !prevLayout.initialized ||
      (!prevLayout.mobile && isMobileLayout) ||
      (!prevLayout.compact && isCompactLayout);
    layoutModeRef.current = {
      mobile: isMobileLayout,
      compact: isCompactLayout,
      initialized: true,
    };
    if (!enteringMobileOrCompact || !showBoards.configuration) return;
    setShowBoards((prev) => normalizeBoardVisibility({ ...prev, chords: true, configuration: false }, "chords"));
  }, [isMobileLayout, isCompactLayout, showBoards.configuration]);

  useEffect(() => {
    if (chordDetectMode && mobileChordEditorOpen) {
      setMobileChordEditorOpen(false);
    }
  }, [chordDetectMode, mobileChordEditorOpen, setMobileChordEditorOpen]);

  useEffect(() => {
    const startMax = Math.max(1, maxFret - (MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE - 1));
    setChordDetectWindowStart((start) => {
      const safeStart = Math.floor(Number(start) || 1);
      return Math.max(1, Math.min(startMax, safeStart));
    });
  }, [maxFret]);

  // --------------------------------------------------------------------------
  // REGLAS DE COHERENCIA DE UI (sin cambiar sonido ni funcionalidad)
  // --------------------------------------------------------------------------

  useEffect(() => {
    // Dominante en Acorde siempre implica 7ª (sin ella es mayor, no dominante).
    if (chordQuality === "dom" && chordStructure === "chord" && !chordExt7) {
      setChordExt7(true);
    }
    // m7b5 en Acorde siempre implica 7ª (la "7" forma parte del nombre).
    if (chordQuality === "hdim" && chordStructure === "chord" && !chordExt7) {
      setChordExt7(true);
    }
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

  // Cuatriada: inicializa 7ª=true al entrar en tetrad.
  useEffect(() => {
    if (chordStructure === "tetrad") setChordExt7(true);
  }, [chordStructure]);




  // --------------------------------------------------------------------------
  // CARGA DE VOICINGS / DATASET JSON DEL ACORDE PRINCIPAL
  // --------------------------------------------------------------------------

  // Voicings de acordes (digitaciones tocables) desde dataset externo
  const [chordDb, setChordDb] = useState(null);
  const [chordDbStatus, setChordDbStatus] = useState("idle");
  const [chordDbError, setChordDbError] = useState(null);
  const [, setChordDbLastUrl] = useState(null);
  const [chordVoicingIdx, setChordVoicingIdx] = useState(0);
  const [chordSelectedFrets, setChordSelectedFrets] = useState(null);
  const [chordMaxDist, setChordMaxDist] = useState(4);
  const [chordAllowOpenStrings, setChordAllowOpenStrings] = useState(false);
  const lastChordVoicingRef = useRef(null);
  const skipChordVoicingRefSyncRef = useRef(false);
  const pendingChordRestoreRef = useRef({ active: false, frets: null });
  const pendingChordCopyResolutionRef = useRef(null);
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

  const usesFiveNoteBoxPatterns = scaleIntervals.length === 5;

  const route = useRouteFeature({ rootPc, scaleName, scaleIntervals, maxFret, preferSharps });
  const { lab: routeLab, labTuning: routeLabTuning, main: routeMain, mainTuning: routeMainTuning, derived: routeDerived } = route;
  const { routeLabStartCode, setRouteLabStartCode, routeLabEndCode, setRouteLabEndCode, routeLabMaxPerString, setRouteLabMaxPerString, routeLabPickNext, setRouteLabPickNext } = routeLab;
  const { routeLabSwitchWhenSameStringForwardPenalty, setRouteLabSwitchWhenSameStringForwardPenalty, routeLabWorseThanSameStringGoalBase, setRouteLabWorseThanSameStringGoalBase, routeLabWorseThanSameStringGoalScale, setRouteLabWorseThanSameStringGoalScale, routeLabCorridorPenalty, setRouteLabCorridorPenalty, routeLabOvershootNearEndAlt, setRouteLabOvershootNearEndAlt } = routeLabTuning;
  const { routeStartCode, setRouteStartCode, routeEndCode, setRouteEndCode, routeMaxPerString, setRouteMaxPerString, routeMode, setRouteMode, routePickNext, setRoutePickNext } = routeMain;
  const { routePreferNps, setRoutePreferNps, routePreferVertical, setRoutePreferVertical, routeStrictFretDirection, setRouteStrictFretDirection, routeKeepPattern, setRouteKeepPattern, allowPatternSwitch, setAllowPatternSwitch, patternSwitchPenalty, setPatternSwitchPenalty, routeFixedPattern, setRouteFixedPattern } = routeMainTuning;
  const { routeLabResult, routeLabIndexByCell, routeLabText, routeLabDebugLines, routeKeySignature, routeStaffEvents, routeResult, routeIndexByCell, routeLabPickHelpText } = routeDerived;

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
    chordRefNatural,
    chordRefAcc,
    chordRefQuality,
    chordRefEnabled,
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
    chordRefNatural,
    chordRefAcc,
    chordRefQuality,
    chordRefEnabled,
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

  /* eslint-disable react-hooks/exhaustive-deps */
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

      applyFromConfig(saved);
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
      if ("maxFret" in saved) setMaxFret(sanitizeNumberValue(saved.maxFret, 15, 12, 24));
      if ("showNonScale" in saved) setShowNonScale(sanitizeBoolValue(saved.showNonScale, false));
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
      if ("chordRefNatural" in saved) setChordRefNatural(sanitizeOneOf(saved.chordRefNatural, CHORD_REF_NATURAL_LETTERS, "C"));
      if ("chordRefAcc" in saved) setChordRefAcc(sanitizeOneOf(Number(saved.chordRefAcc), [-1, 0, 1], 0));
      if ("chordRefQuality" in saved) setChordRefQuality(sanitizeOneOf(saved.chordRefQuality, CHORD_REF_QUALITIES, "7"));
      if ("chordRefEnabled" in saved) setChordRefEnabled(sanitizeBoolValue(saved.chordRefEnabled, false));

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
  /* eslint-enable react-hooks/exhaustive-deps */

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

  useEffect(() => {
    if (!chordCopyNotice) return;
    const t = window.setTimeout(() => setChordCopyNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [chordCopyNotice]);

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
      a.href = url;
      a.download = buildConfigExportFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setConfigNotice({ type: "success", text: "Configuración exportada." });
    } catch {
      setConfigNotice({ type: "error", text: "No pude exportar la configuración." });
    }
  }

  function importUiConfigFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "");
        const payload = parseImportedConfigText(raw, {
          uiConfigVersion: UI_CONFIG_VERSION,
          appVersion: APP_VERSION,
        });
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
    const idx = selectClosestPhysicalVoicingIndex(ref, guideToneVoicings);
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
        omit: chordOmit,
      }),
    [chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordOmit]
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
      omit: chordOmit,
    }),
    [chordRootPc, chordQuality, chordSuspension, chordStructure, chordInversion, chordForm, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordOmit]
  );

  const chordInversionOptions = useMemo(() => computeInversionSelectorOptions(chordEnginePlan, chordPreferSharps), [chordEnginePlan, chordPreferSharps]);

  // Sanitiza la inversión cuando la opción seleccionada deja de existir (ej. omit activa
  // reduce los grados efectivos y "3ª inversión" ya no es una posición válida).
  useEffect(() => {
    if (!chordInversionOptions.some((o) => o.value === chordInversion)) {
      setChordInversion("all");
    }
  }, [chordInversionOptions, chordInversion]);

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
      setChordDbStatus("skipped");
      setChordDbError(null);
      setChordDbLastUrl(null);
      return;
    }

    if (!chordCanUseJsonCatalog({
      quality: chordQuality,
      structure: chordStructure,
      ext7: chordExt7,
      ext6: chordExt6,
      ext9: chordExt9,
      ext11: chordExt11,
      ext13: chordExt13,
    })) {
      setChordDb(null);
      setChordDbStatus("skipped");
      setChordDbError(null);
      setChordDbLastUrl(null);
      return;
    }

    const suffix = chordSuffix;
    if (!suffix) {
      setChordDb(null);
      setChordDbStatus("error");
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
        setChordDbStatus("loading");
        setChordDbError(null);

        let res = await fetch(urlLocal, { cache: "no-store" });
        if (res.ok) {
          const json = await parseJsonResponseStrict(res, urlLocalAbs);
          if (!alive) return;
          setChordDbLastUrl(urlLocalAbs);
          setChordDb(json);
          setChordDbStatus("ready");
          return;
        }

        const localStatus = res.status;
        res = await fetch(urlFallbackAbs, { cache: "no-store" });
        const fbStatus = res.status;
        if (!res.ok) throw new Error(`No pude cargar digitaciones: local ${urlLocalAbs} (${localStatus}) | fallback ${urlFallbackAbs} (${fbStatus})`);

        const json = await parseJsonResponseStrict(res, urlFallbackAbs);
        if (!alive) return;
        setChordDbLastUrl(urlFallbackAbs);
        setChordDb(json);
        setChordDbStatus("ready");
      } catch (e) {
        if (!alive) return;
        setChordDb(null);
        setChordDbStatus("error");
        setChordDbError(String(e?.message || e));
      }
    })();

    return () => {
      alive = false;
    };
  }, [showBoards.chords, chordRootPc, chordQuality, chordSuffix, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13]);

  // "skipped" ocurre cuando el acorde anterior no usaba catálogo JSON (ej. m(maj7) -> menor/dim).
  // En ese render chordDb=null pero el nuevo plan ya exige json, por lo que hay que inhibir el
  // mensaje vacío hasta que la carga termine. Solo "ready" y "error" son estados resueltos.
  const chordVoicingsResolving = chordEnginePlan.generator === "json" && chordDbStatus !== "ready" && chordDbStatus !== "error";

  const ensureChordDbCatalogVoicings = useCallback(async ({
    rootPc,
    quality,
    suspension,
    ext7,
    ext6,
    ext9,
    ext11,
    ext13,
    omit,
    bassPc = null,
    preferredFrets = null,
  }) => {
    if (!chordCanUseJsonCatalog({
      quality,
      structure: "chord",
      ext7: !!ext7,
      ext6: !!ext6,
      ext9: !!ext9,
      ext11: !!ext11,
      ext13: !!ext13,
    })) return [];

    const suffixBase = chordSuffixFromUI({
      quality,
      suspension: suspension || "none",
      structure: "chord",
      ext7: !!ext7,
      ext6: !!ext6,
      ext9: !!ext9,
      ext11: !!ext11,
      ext13: !!ext13,
      omit: omit || "none",
    });
    if (!suffixBase) return [];

    const bassSuffix = bassPc == null ? null : `${suffixBase}_${pcToName(bassPc, chordPreferSharps).toLowerCase()}`;
    const suffixes = bassSuffix && bassSuffix !== suffixBase ? [suffixBase, bassSuffix] : [suffixBase];

    const keyName = chordDbKeyNameFromPc(rootPc);
    for (const suffix of suffixes) {
      const cacheKey = `${keyName}/${suffix}`;
      const cached = chordDbCache[cacheKey];
      if (cached?.positions?.length) return cached.positions;

      const cachedErr = chordDbCacheErr[cacheKey];
      if (cachedErr) continue;

      const urlRel = chordDbUrl(keyName, suffix);
      const urlLocal = publicRelToLocal(urlRel);
      const urlFallbackAbs = `${PAGES_BASE}${urlRel}`;

      try {
        let res = await fetch(urlLocal, { cache: "no-store" });
        if (!res.ok) {
          res = await fetch(urlFallbackAbs, { cache: "no-store" });
        }
        if (!res.ok) continue;

        const json = await parseJsonResponseStrict(res, res.url || urlFallbackAbs);
        setChordDbCache((prev) => ({ ...prev, [cacheKey]: json }));
        const positions = json?.positions?.length ? json.positions : [];
        if (!preferredFrets) return positions;
        const wanted = String(preferredFrets || "").trim().toLowerCase();
        if (!wanted) return positions;
        if (positions.some((pos) => String(pos?.frets || "").trim().toLowerCase() === wanted)) {
          return positions;
        }
      } catch {
        continue;
      }
    }
    return [];
  }, [chordDbCache, chordDbCacheErr, chordPreferSharps, setChordDbCache]);

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
      if (!chordCanUseJsonCatalog({
        quality: s.quality,
        structure: s.structure,
        ext7: !!s.ext7,
        ext6: !!s.ext6,
        ext9: !!s.ext9,
        ext11: !!s.ext11,
        ext13: !!s.ext13,
      })) continue;

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

          const json = await parseJsonResponseStrict(res, res.url || urlFallbackAbs);
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
      const required = new Set(plan.intervals.map(mod12));

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

      let list;
      if (outStrict.length) {
        list = outStrict;
      } else if (plan.inversion !== "root" && plan.inversion !== "all" && selectedBassIntervals.length === 1) {
        // DB no tiene voicings para esta inversión: generar algorítmicamente con el bajo correcto.
        list = dedupeAndSortVoicings(generateExactIntervalChordVoicings({
          rootPc: plan.rootPc,
          intervals: plan.intervals,
          bassInterval: selectedBassIntervals[0],
          maxFret,
          maxSpan: chordMaxDist,
        }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, plan.rootPc)));
      } else if (outLoose.length) {
        list = outLoose;
      } else {
        // DB agotado (ningún voicing completo tras el filtro estricto): fallback exacto con raíz.
        list = dedupeAndSortVoicings(generateExactIntervalChordVoicings({
          rootPc: plan.rootPc,
          intervals: plan.intervals,
          bassInterval: selectedBassIntervals[0] ?? 0,
          maxFret,
          maxSpan: chordMaxDist,
        }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, plan.rootPc)));
      }

      // Acordes extendidos/chord: complementar DB con generación algorítmica para
      // capturar voicings de posición baja que el DB no contiene (ej. x76777 para E9).
      if (plan.layer === "extended" || plan.layer === "chord") {
        const algoVoicings = dedupeAndSortVoicings(
          generateExactIntervalChordVoicings({
            rootPc: plan.rootPc,
            intervals: plan.intervals,
            bassInterval: selectedBassIntervals[0] ?? 0,
            maxFret,
            maxSpan: chordMaxDist,
          }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, plan.rootPc))
        );
        const seenFrets = new Set((list || []).map((v) => v.frets));
        for (const v of algoVoicings) {
          if (!seenFrets.has(v.frets)) {
            list = list || [];
            list.push({ ...v, _extra: 0 });
          }
        }
      }

      list.sort((a, b) => ((a._extra ?? 0) - (b._extra ?? 0)) || (a.minFret - b.minFret) || (a.span - b.span) || (a.maxFret - b.maxFret));
      const finalJson = finalizeMainVoicings(list);
      return finalJson.slice(0, 60);
    }

    return [];
  }, [chordEnginePlan, chordDb, chordMaxDist, chordAllowOpenStrings, maxFret]);

  const currentChordCopyFingerprint = useMemo(() => buildChordCopyFingerprint({
    rootPc: chordRootPc,
    quality: chordQuality,
    suspension: chordSuspension,
    structure: chordStructure,
    ext7: chordExt7,
    ext6: chordExt6,
    ext9: chordExt9,
    ext11: chordExt11,
    ext13: chordExt13,
    omit: chordOmit,
    inversion: chordInversion,
    form: chordForm,
    maxDist: chordMaxDist,
    allowOpenStrings: chordAllowOpenStrings,
  }), [chordRootPc, chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordOmit, chordInversion, chordForm, chordMaxDist, chordAllowOpenStrings]);

  // Amplía chordVoicings con el patrón físico copiado cuando el cálculo visible
  // no lo incluye, manteniéndolo ligado al fingerprint del estado que lo generó.
  const chordVoicingsDisplay = useMemo(() => {
    if (!chordCopiedEntry?.voicing?.frets) return chordVoicings;
    if (chordCopiedEntry.fingerprint !== currentChordCopyFingerprint) return chordVoicings;
    if (chordVoicings.some((v) => v.frets === chordCopiedEntry.voicing.frets)) return chordVoicings;
    return [{ ...chordCopiedEntry.voicing, isCopied: true }, ...chordVoicings];
  }, [chordVoicings, chordCopiedEntry, currentChordCopyFingerprint]);

  const chordResolvedSelection = useMemo(() => {
    const list = chordVoicingsDisplay;
    if (!list.length) return { idx: 0, voicing: null, frets: null, waitingPending: false };

    const normalizedCurrentIdx = Math.max(0, Math.min(chordVoicingIdx, list.length - 1));
    const currentVoicing = list[normalizedCurrentIdx] || list[0] || null;
    const currentFrets = currentVoicing?.frets ?? null;

    if (pendingChordRestoreRef.current.active) {
      const wanted = pendingChordRestoreRef.current.frets;
      if (wanted == null) {
        return { idx: normalizedCurrentIdx, voicing: currentVoicing, frets: currentFrets, waitingPending: false };
      }
      const restoredIdx = list.findIndex((v) => v.frets === wanted);
      if (restoredIdx >= 0) {
        return { idx: restoredIdx, voicing: list[restoredIdx] || null, frets: wanted, waitingPending: false };
      }
      return { idx: normalizedCurrentIdx, voicing: currentVoicing, frets: currentFrets, waitingPending: true };
    }

    const keepIdx = chordSelectedFrets ? list.findIndex((v) => v.frets === chordSelectedFrets) : -1;
    if (keepIdx >= 0) {
      return { idx: keepIdx, voicing: list[keepIdx] || null, frets: chordSelectedFrets, waitingPending: false };
    }

    const ref = chordSelectedFrets
      ? buildVoicingFromFretsLH({
          fretsLH: parseChordDbFretsString(chordSelectedFrets),
          rootPc: chordRootPc,
          maxFret,
        })
      : lastChordVoicingRef.current;
    const idx = selectClosestPhysicalVoicingIndex(ref, list, { fallbackIndex: normalizedCurrentIdx });
    const voicing = list[idx] || list[0] || null;
    return { idx, voicing, frets: voicing?.frets ?? null, waitingPending: false };
  }, [chordVoicingsDisplay, chordVoicingIdx, chordSelectedFrets, chordRootPc, maxFret]);

  useEffect(() => {
    if (!storageHydrated) return;
    if (!chordVoicingsDisplay.length) {
      if (!pendingChordRestoreRef.current.active && chordVoicingIdx !== 0) setChordVoicingIdx(0);
      return;
    }

    if (chordResolvedSelection.waitingPending) return;

    if (pendingChordRestoreRef.current.active) {
      pendingChordRestoreRef.current = { active: false, frets: null };
    }

    if (chordResolvedSelection.idx !== chordVoicingIdx) {
      skipChordVoicingRefSyncRef.current = true;
      setChordVoicingIdx(chordResolvedSelection.idx);
    }
    if ((chordResolvedSelection.frets ?? null) !== (chordSelectedFrets ?? null)) {
      setChordSelectedFrets(chordResolvedSelection.frets ?? null);
    }
  }, [storageHydrated, chordVoicingsDisplay.length, chordVoicingIdx, chordSelectedFrets, chordResolvedSelection]);

  useEffect(() => {
    if (!storageHydrated) return;
    const pending = pendingChordCopyResolutionRef.current;
    if (!pending?.frets) return;
    if (chordSelectedFrets !== pending.frets) return;

    const needsStructure = !!pending.structure && chordStructure !== pending.structure;
    const needsOpenStrings = !!pending.allowOpenStrings && !chordAllowOpenStrings;
    if (!needsStructure && !needsOpenStrings) {
      pendingChordCopyResolutionRef.current = null;
      return;
    }

    if (needsStructure) setChordStructure(pending.structure);
    if (needsOpenStrings) setChordAllowOpenStrings(true);
  }, [storageHydrated, chordSelectedFrets, chordStructure, chordAllowOpenStrings]);

  useEffect(() => {
    if (!storageHydrated) return;
    if (!chordCopyNotice?.startsWith("Copiado en Acorde")) return;
    if (!chordSelectedFrets) return;
    if (chordStructure === "chord" && chordAllowOpenStrings) return;
    const selectedVoicing = buildVoicingFromFretsLH({
      fretsLH: parseChordDbFretsString(chordSelectedFrets),
      rootPc: chordRootPc,
      maxFret,
    });
    const selectedBassPc = selectedVoicing?.bassPc ?? chordBassPc;

    let alive = true;
    (async () => {
      const catalogVoicings = await ensureChordDbCatalogVoicings({
        rootPc: chordRootPc,
        quality: chordQuality,
        suspension: chordSuspension,
        ext7: chordExt7,
        ext6: chordExt6,
        ext9: chordExt9,
        ext11: chordExt11,
        ext13: chordExt13,
        omit: chordOmit,
        bassPc: selectedBassPc,
        preferredFrets: chordSelectedFrets,
      });
      if (!alive || !catalogVoicings.length) return;

      const selected = String(chordSelectedFrets || "").trim().toLowerCase();
      const existsInChordCatalog = catalogVoicings.some((candidate) => String(candidate?.frets || "").trim().toLowerCase() === selected);
      if (!existsInChordCatalog) return;

      if (chordStructure !== "chord") setChordStructure("chord");
      if (!chordAllowOpenStrings) setChordAllowOpenStrings(true);
    })();

    return () => {
      alive = false;
    };
  }, [
    storageHydrated,
    chordCopyNotice,
    chordSelectedFrets,
    chordStructure,
    chordAllowOpenStrings,
    chordRootPc,
    chordQuality,
    chordSuspension,
    chordExt7,
    chordExt6,
    chordExt9,
    chordExt11,
    chordExt13,
    chordOmit,
    chordBassPc,
    maxFret,
    ensureChordDbCatalogVoicings,
  ]);

  useEffect(() => {
    if (!storageHydrated) return;
    const current = chordResolvedSelection.voicing;

    if (skipChordVoicingRefSyncRef.current) {
      skipChordVoicingRefSyncRef.current = false;
      return;
    }
    if (current) lastChordVoicingRef.current = current;
  }, [storageHydrated, chordResolvedSelection]);

  const activeChordVoicing = chordResolvedSelection.voicing;

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

  const chordDetectCandidatesRanked = useMemo(() => {
    const harmonyContext = {
      enabled: chordRefEnabled,
      rootPc: ((CHORD_REF_NATURAL_PC[chordRefNatural] ?? 0) + chordRefAcc + 12) % 12,
      quality: chordRefQuality,
      selectedNotes: chordDetectSelectedNotes,
    };
    return rankReadingsWithHarmonyContextPure(chordDetectCandidates, harmonyContext);
  }, [chordDetectCandidates, chordRefEnabled, chordRefNatural, chordRefAcc, chordRefQuality, chordDetectSelectedNotes]);

  const refChordDisplayName = useMemo(() => {
    if (!chordRefEnabled) return null;
    const refAccStr = chordRefAcc === -1 ? "b" : chordRefAcc === 1 ? "#" : "";
    const refQualitySuffix = { Mayor: "", maj7: "maj7", "7": "7", menor: "m", m7: "m7", "m7(b5)": "m7(b5)", dim: "dim", dim7: "dim7", sus4: "sus4", "7sus4": "7sus4" }[chordRefQuality] ?? chordRefQuality;
    return `${chordRefNatural}${refAccStr}${refQualitySuffix}`;
  }, [chordRefEnabled, chordRefNatural, chordRefAcc, chordRefQuality]);

  const chordDetectPlaybackNotes = useMemo(
    () => [...chordDetectSelectedNotes].sort((a, b) => b.sIdx - a.sIdx || a.fret - b.fret),
    [chordDetectSelectedNotes]
  );

  const chordDetectSelectionSignature = useMemo(
    () => [...chordDetectSelectedKeys].sort().join("|"),
    [chordDetectSelectedKeys]
  );

  const chordDetectSelectedCandidate = useMemo(
    () => chordDetectCandidatesRanked.find((c) => c.id === chordDetectCandidateId) || null,
    [chordDetectCandidatesRanked, chordDetectCandidateId]
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

  useEffect(() => {
    if (!chordDetectClearMinHeight) return;
    const timer = window.setTimeout(() => setChordDetectClearMinHeight(null), 800);
    return () => window.clearTimeout(timer);
  }, [chordDetectClearMinHeight]);

  useLayoutEffect(() => {
    if (chordDetectSelectedKeys.length) return;
    lastChordDetectCandidateRef.current = null;
    pendingChordDetectCandidateRef.current = null;
  }, [chordDetectSelectedKeys.length]);

  useLayoutEffect(() => {
    if (!chordDetectMode) return;

    // Selección explícita del usuario: siempre respetarla si el candidato sigue en la lista.
    if (isManualCandidateSelectRef.current) {
      isManualCandidateSelectRef.current = false;
      const exists = chordDetectCandidateId != null && chordDetectCandidatesRanked.some((c) => c.id === chordDetectCandidateId);
      if (exists) return;
    }

    const nextId = resolveDetectedCandidateFromContextPure({
      candidates: chordDetectCandidatesRanked,
      currentCandidateId: chordDetectCandidateId,
      pendingCandidate: pendingChordDetectCandidateRef.current,
      lastCandidate: lastChordDetectCandidateRef.current,
      prioritizeContext: chordDetectPrioritizeContext,
    })?.id || null;
    if (!chordDetectCandidatesRanked.length) {
      if (chordDetectCandidateId !== null) setChordDetectCandidateId(null);
      return;
    }
    if ((chordDetectCandidateId || null) !== nextId) {
      setChordDetectCandidateId(nextId);
    }
    if (pendingChordDetectCandidateRef.current && nextId) {
      pendingChordDetectCandidateRef.current = null;
    }
  }, [chordDetectMode, chordDetectSelectionSignature, chordDetectCandidatesRanked, chordDetectCandidateId, chordDetectPrioritizeContext]);

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
    setChordDetectClearMinHeight(null);
    preserveChordDetectViewportScroll({ focusPanel: true });
    clearChordDetectPlaybackVisuals();
    pendingChordDetectCandidateRef.current = null;
    setChordDetectSelectedKeys([]);
    setChordDetectCandidateId(null);
    lastChordDetectCandidateRef.current = null;
  }

  function selectDetectedCandidate(candidate) {
    isManualCandidateSelectRef.current = true;
    lastChordDetectCandidateRef.current = candidate || null;
    pendingChordDetectCandidateRef.current = candidate || null;
    setChordDetectCandidateId(candidate?.id || null);
  }

  function updateChordDetectPrioritizeContext(value) {
    setChordDetectPrioritizeContext(!!value);
    setChordDetectPrioritizeContextTouched(true);
  }

  function applyChordStructureSelection(value) {
    setChordStructure(value);
    if (value === "triad") {
      setChordExt6(false);
      setChordExt7(false);
      setChordExt9(false);
      setChordExt11(false);
      setChordExt13(false);
    }
    if (value === "tetrad") {
      const maxExtSlots = 1 + (chordOmit !== "none" ? 1 : 0);
      let slotsUsed = chordExt7 ? 1 : 0;
      const addCleanup = [
        { active: chordExt6, set: setChordExt6 },
        { active: chordExt9, set: setChordExt9 },
        { active: chordExt11, set: setChordExt11 },
        { active: chordExt13, set: setChordExt13 },
      ];
      for (const { active, set } of addCleanup) {
        if (!active) continue;
        if (slotsUsed >= maxExtSlots) { set(false); } else { slotsUsed++; }
      }
    }
    if (value === "triad" || value === "tetrad") {
      setChordInversion("all");
      setChordPositionForm("open");
      setChordForm("open");
    }
  }

  function resolveGuideToneCopiedVoicing({ voicing, rootPc, allowOpenStrings, maxSpan }) {
    const normalizedFrets = String(voicing?.frets || "").trim().toLowerCase();
    if (!normalizedFrets || !Array.isArray(voicing?.notes) || voicing.notes.length !== 3) return null;

    const relSig = Array.from(new Set(voicing.notes.map((note) => mod12(note.pc - rootPc)))).sort((a, b) => a - b).join(",");
    const guideToneQuality = [
      ["maj7", "0,4,11"],
      ["min7", "0,3,10"],
      ["dom7", "0,4,10"],
      ["maj6", "0,4,9"],
    ].find(([, sig]) => sig === relSig)?.[0] || null;
    if (!guideToneQuality) return null;

    const def = guideToneDefinitionFromQuality(guideToneQuality);
    const findMatch = (candidateAllowOpenStrings) => {
      const baseList = guideToneBassIntervalsForSelection(def, "all").flatMap((bassInterval) =>
        generateExactIntervalChordVoicings({
          rootPc,
          intervals: def.intervals,
          bassInterval,
          maxFret,
          maxSpan,
        }).map((item) => normalizeGeneratedVoicingForDisplay(item, rootPc, rootPc))
      );
      let list = dedupeAndSortVoicings(baseList);
      if (!candidateAllowOpenStrings) {
        list = list.filter((item) => !voicingHasOpenStrings(item));
      }
      for (const form of ["closed", "open"]) {
        const match = filterVoicingsByForm(list, form).find((item) => String(item?.frets || "").trim().toLowerCase() === normalizedFrets);
        if (match) return { guideToneQuality, guideToneForm: form, guideToneInversion: "all", voicing: match, requiresOpenStrings: candidateAllowOpenStrings && !allowOpenStrings };
      }
      return null;
    };

    return findMatch(allowOpenStrings) || (voicingHasOpenStrings(voicing) ? findMatch(true) : null);
  }

  async function applyDetectedCandidate(candidate) {
    if (!candidate) return;
    setChordDetectCandidateId(candidate.id);
    if (!candidate.uiPatch) return;
    setStudyTarget("main");

    const p = candidate.uiPatch;
    const detectedInversion = deriveDetectedCandidateCopyInversion(candidate);
    const manualCopiedVoicing = buildManualSelectionVoicing(chordDetectSelectedNotes, p.rootPc, maxFret);
    const copiedHasOpenStrings = manualCopiedVoicing ? voicingHasOpenStrings(manualCopiedVoicing) : false;
    const nextAllowOpenStrings = chordAllowOpenStrings || copiedHasOpenStrings;
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
      setChordOmit("none");
      setChordDetectMode(false);
      return;
    }

    const guideToneCopy = manualCopiedVoicing?.frets
      ? resolveGuideToneCopiedVoicing({
          voicing: manualCopiedVoicing,
          rootPc: p.rootPc,
          allowOpenStrings: nextAllowOpenStrings,
          maxSpan: requiredMaxDist != null ? requiredMaxDist : chordMaxDist,
        })
      : null;
    if (guideToneCopy) {
      setChordFamily("guide_tones");
      setChordRootPc(p.rootPc);
      setChordSpellPreferSharps(!!p.spellPreferSharps);
      setGuideToneQuality(guideToneCopy.guideToneQuality);
      setGuideToneForm(guideToneCopy.guideToneForm);
      setGuideToneInversion(guideToneCopy.guideToneInversion);
      setChordAllowOpenStrings(nextAllowOpenStrings || guideToneCopy.requiresOpenStrings);
      if (requiredMaxDist != null && requiredMaxDist !== chordMaxDist) {
        setChordMaxDist(requiredMaxDist);
      }
      setGuideToneSelectedFrets(guideToneCopy.voicing.frets);
      setGuideToneVoicingIdx(0);
      setChordCopiedEntry(null);
      pendingChordRestoreRef.current = { active: false, frets: null };
      pendingChordCopyResolutionRef.current = null;
      const chordName = formatChordNamePure(candidate);
      setChordCopyNotice(`Copiado en Acorde: ${chordName}`);
      setChordDetectMode(false);
      return;
    }

    const detectedOmit = detectOmitFromCandidatePure(candidate);
    const fpInversion = manualCopiedVoicing ? "all" : (detectedInversion || p.inversion || "root");
    const fpForm = p.form || p.positionForm || "open";
    const fpMaxDist = requiredMaxDist != null ? requiredMaxDist : chordMaxDist;
    let catalogVoicings = chordDb?.positions || [];
    if (manualCopiedVoicing?.frets) {
      const chordCatalogVoicings = await ensureChordDbCatalogVoicings({
        rootPc: p.rootPc,
        quality: p.quality,
        suspension: p.suspension || "none",
        ext7: !!p.ext7,
        ext6: !!p.ext6,
        ext9: !!p.ext9,
        ext11: !!p.ext11,
        ext13: !!p.ext13,
        omit: detectedOmit,
        bassPc: manualCopiedVoicing?.bassPc ?? null,
        preferredFrets: wantedFrets,
      });
      if (chordCatalogVoicings.length) {
        catalogVoicings = chordCatalogVoicings;
      }
    }
    const exactChordCatalogMatch = !!manualCopiedVoicing?.frets
      && catalogVoicings.some((candidate) => String(candidate?.frets || "").trim().toLowerCase() === String(wantedFrets || "").trim().toLowerCase());
    const resolvedCopy = manualCopiedVoicing?.frets
      ? resolveCopiedVoicingAcrossStructures({
          voicing: manualCopiedVoicing,
          rootPc: p.rootPc,
          quality: p.quality,
          suspension: p.suspension || "none",
          structure: p.structure,
          ext7: !!p.ext7,
          ext6: !!p.ext6,
          ext9: !!p.ext9,
          ext11: !!p.ext11,
          ext13: !!p.ext13,
          omit: detectedOmit,
          form: fpForm,
          allowOpenStrings: nextAllowOpenStrings,
          maxFret,
          maxSpan: fpMaxDist,
          catalogVoicings,
        })
      : null;
    const denseOpenStringFallback = !exactChordCatalogMatch
      && !resolvedCopy?.structure
      && !!manualCopiedVoicing?.frets
      && copiedHasOpenStrings
      && (manualCopiedVoicing.notes?.length ?? 0) >= 5;
    const effectiveResolvedCopy = exactChordCatalogMatch
      ? {
          structure: "chord",
          voicing: manualCopiedVoicing,
          compatibleWithCurrentFilters: false,
          matchesRequestedStructure: false,
          requiresStructureChange: true,
          requiresOpenStrings: true,
        }
      : (resolvedCopy || (denseOpenStringFallback
      ? {
          structure: "chord",
          voicing: manualCopiedVoicing,
          compatibleWithCurrentFilters: false,
          matchesRequestedStructure: false,
          requiresStructureChange: true,
          requiresOpenStrings: true,
        }
      : null));
    const targetStructure = effectiveResolvedCopy?.structure || p.structure;
    setChordFamily("tertian");
    setChordRootPc(p.rootPc);
    setChordSpellPreferSharps(!!p.spellPreferSharps);
    setChordQuality(p.quality);
    setChordSuspension(p.suspension || "none");
    applyChordStructureSelection(targetStructure);
    setChordAllowOpenStrings(nextAllowOpenStrings);
    // Si hay patrón físico, usar "all" para que el generador cubra todas las inversiones
    // y seleccione el patrón real cuando exista en alguna estructura compatible.
    setChordInversion(fpInversion);
    setChordPositionForm(p.positionForm || "open");
    setChordForm(fpForm);
    setChordExt7(!!p.ext7);
    setChordExt6(!!p.ext6);
    setChordExt9(!!p.ext9);
    setChordExt11(!!p.ext11);
    setChordExt13(!!p.ext13);
    setChordOmit(detectedOmit);
    if (requiredMaxDist != null && requiredMaxDist !== chordMaxDist) {
      setChordMaxDist(requiredMaxDist);
    }
    let restoreFrets = wantedFrets;
    // Si no existe ninguna coincidencia real en estructuras compatibles, reservar el
    // fallback "(copiado)" como último recurso dentro de la estructura final.
    if (manualCopiedVoicing?.frets) {
      const fp = buildChordCopyFingerprint({
        rootPc: p.rootPc,
        quality: p.quality,
        suspension: p.suspension || "none",
        structure: targetStructure,
        ext7: !!p.ext7,
        ext6: !!p.ext6,
        ext9: !!p.ext9,
        ext11: !!p.ext11,
        ext13: !!p.ext13,
        omit: detectedOmit,
        inversion: fpInversion,
        form: fpForm,
        maxDist: fpMaxDist,
        allowOpenStrings: nextAllowOpenStrings,
      });
      const preservedVoicing = effectiveResolvedCopy?.voicing || manualCopiedVoicing;
      setChordCopiedEntry({ voicing: preservedVoicing, fingerprint: fp });
    } else {
      setChordCopiedEntry(null);
      restoreFrets = null;
    }
    pendingChordRestoreRef.current = { active: true, frets: restoreFrets };
    pendingChordCopyResolutionRef.current = manualCopiedVoicing?.frets
      ? {
          frets: restoreFrets,
          structure: targetStructure,
          allowOpenStrings: nextAllowOpenStrings,
        }
      : null;
    setChordSelectedFrets(restoreFrets);
    setChordVoicingIdx(0);

    const chordName = formatChordNamePure(candidate);
    const omitLabel = detectedOmit !== "none" ? ` · Omitir ${detectedOmit}` : "";
    setChordCopyNotice(`Copiado en Acorde: ${chordName}${omitLabel}`);
    setChordDetectMode(false);
  }

  function toggleChordDetectCell(sIdx, fret) {
    if (chordDetectClickAudio) fnPlayChordDetectNote(sIdx, fret);
    pendingChordDetectCandidateRef.current = chordDetectSelectedCandidate || lastChordDetectCandidateRef.current || null;
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

  const chordDetectPhysicalPatternText = useMemo(() => {
    const manualVoicing = chordDetectSelectedNotes.length
      ? buildManualSelectionVoicing(chordDetectSelectedNotes, chordDetectSelectedCandidate?.rootPc ?? chordRootPc, maxFret)
      : null;
    if (manualVoicing?.frets) return manualVoicing.frets;
    const typedPattern = String(voicingInputText || "").trim().toLowerCase();
    return typedPattern.length === 6 ? typedPattern : "";
  }, [chordDetectSelectedNotes, chordDetectSelectedCandidate, chordRootPc, maxFret, voicingInputText]);

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
        omit: chordOmit,
      });

  const chordSectionDisplayName = buildChordHeaderSummary({
    name: chordBaseDisplayName,
    plan: chordEnginePlan,
    voicing: activeChordVoicing,
    positionForm: chordPositionForm,
    preferSharps: chordPreferSharps,
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
      return { type: "error", text: `No encuentro acordes para cargar desde ${title}.` };
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
      return {
        type: "success",
        text: `${title} · ${label}: cargado en Acordes cercanos. Auto escala se ha desactivado para respetar la armonía del standard.${truncated ? " Solo se han cargado los 4 primeros cambios porque Acordes cercanos admite 4." : ""}`,
      };
    } catch (e) {
      return { type: "error", text: `No pude cargar ${label}: ${String(e?.message || e)}` };
    }
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
      bassName: voicing
        ? spellNoteFromChordInterval(noteMeta.rootPc, mod12(voicing.bassPc - noteMeta.rootPc), noteMeta.preferSharps)
        : spellNoteFromChordInterval(noteMeta.rootPc, plan?.bassInterval || 0, noteMeta.preferSharps),
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
        const required = new Set(plan.intervals.map(mod12));

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

        let list;
        if (strict.length) {
          list = strict;
        } else if (plan.inversion !== "root" && plan.inversion !== "all" && selectedBassIntervals.length === 1) {
          list = dedupeAndSortVoicings(generateExactIntervalChordVoicings({
            rootPc: plan.rootPc,
            intervals: plan.intervals,
            bassInterval: selectedBassIntervals[0],
            maxFret,
            maxSpan,
          }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, plan.rootPc)));
        } else if (loose.length) {
          list = loose;
        } else {
          list = dedupeAndSortVoicings(generateExactIntervalChordVoicings({
            rootPc: plan.rootPc,
            intervals: plan.intervals,
            bassInterval: selectedBassIntervals[0] ?? 0,
            maxFret,
            maxSpan,
          }).map((v) => normalizeGeneratedVoicingForDisplay(v, plan.rootPc, plan.rootPc)));
        }
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

  const studyData = useMemo(() => buildStudyData({
    studyTarget,
    chordDetectMode, chordDetectSelectedCandidate, chordDetectSelectedNotes,
    chordFamily,
    chordRootPc, chordPreferSharps,
    chordQuality, chordSuspension, chordStructure,
    chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordOmit,
    chordIntervals, chordDegreeLabels, chordEnginePlan, activeChordVoicing,
    chordBassPc, chordInversion, chordPositionForm, maxFret,
    chordQuartalPitchSets, activeQuartalVoicing, chordQuartalCurrentRootPc,
    chordQuartalDisplayName, chordQuartalSpread, chordQuartalType,
    chordQuartalReference, chordQuartalScaleName,
    guideToneDef, activeGuideToneVoicing, guideToneDisplayName,
    guideToneForm, guideToneInversion, guideToneQuality, guideToneBassNote,
    nearSlots, nearComputed, buildNearSlotStudyEntry,
  }), [studyTarget, chordDetectMode, chordDetectSelectedCandidate, chordDetectSelectedNotes, chordFamily, chordRootPc, chordPreferSharps, chordQuality, chordSuspension, chordStructure, chordExt7, chordExt6, chordExt9, chordExt11, chordExt13, chordOmit, chordIntervals, chordDegreeLabels, chordEnginePlan, activeChordVoicing, chordBassPc, chordInversion, chordPositionForm, maxFret, chordQuartalPitchSets, activeQuartalVoicing, chordQuartalCurrentRootPc, chordQuartalDisplayName, chordQuartalSpread, chordQuartalType, chordQuartalReference, chordQuartalScaleName, guideToneDef, activeGuideToneVoicing, guideToneDisplayName, guideToneForm, guideToneInversion, guideToneQuality, guideToneBassNote, nearSlots, nearComputed, buildNearSlotStudyEntry]);

  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS: PANEL DE ESTUDIO
  // --------------------------------------------------------------------------



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
          nextFrets = options[selectClosestPhysicalVoicingIndex(ref, options)]?.frets ?? options[0]?.frets ?? null;
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


  const scaleNotesText = useMemo(() => spelledScaleNotes.join(" · "), [spelledScaleNotes]);
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

  // Ruta: los derivados vienen de routeDerived (useRouteFeature)



  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS: ELEMENTOS BASE
  // --------------------------------------------------------------------------

  function HoverCellNote(props) {
    return <HoverCellNoteImpl {...props} hoverCellNoteText={hoverCellNoteText} />;
  }

  function InfoTitle(props) {
    return <InfoTitleImpl {...props} isMobileLayout={isMobileLayout} onInfo={openMobileInfoPopover} />;
  }

  function FretInlayRow(props) {
    return <FretInlayRowImpl {...props} maxFret={maxFret} />;
  }

  function MobileMainFretboard(props) {
    return <MobileMainFretboardImpl {...props} maxFret={maxFret} />;
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
        className={`relative z-20 inline-flex items-center justify-center rounded-full text-[10px] font-semibold ${mobileVerticalOpenNoteClass(fret, isNarrowBoardLayout)}`}
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

  // --------------------------------------------------------------------------
  // COMPONENTES UI INTERNOS: ACORDES Y DETECCIÓN
  // --------------------------------------------------------------------------

  function renderChordAllowOpenStringsToggle(className = "") {
    return (
      <label
        className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-700 ${className}`.trim()}
        title={chordFamily === "quartal" ? "Incluye cuerdas al aire en la búsqueda de voicings cuartales." : chordFamily === "guide_tones" ? "Incluye cuerdas al aire en la búsqueda de shells de notas guía." : "Permite usar cuerdas al aire como opción de voicing. La distancia se calcula solo con las notas pisadas."}
      >
        <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
          <input
            type="checkbox"
            data-testid="toggle-allow-open-strings"
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
            className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordAllowOpenStrings ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"}`}
          >
            ✓
          </span>
        </span>
        <span>Permitir cuerdas al aire</span>
      </label>
    );
  }

  function ChordFretboard({ voicing, emptyMessage = "", roleForPc = chordRoleOfPc, labelForPc = labelForChordPc, noteNameForPc = chordPcToSpelledName }) {
    return (
      <ChordFretboardImpl
        voicing={voicing} emptyMessage={emptyMessage}
        roleForPc={roleForPc} labelForPc={labelForPc} noteNameForPc={noteNameForPc}
        maxFret={maxFret} isNarrowBoardLayout={isNarrowBoardLayout} showNonScale={showNonScale}
        colors={colors} HoverCellNote={HoverCellNote} MobileMainFretboard={MobileMainFretboard}
      />
    );
  }


  function ChordInvestigationCircle({ pc, fret, candidate, isBass, isPlaying = false, compactOpen = false }) {
    const role = buildDetectedCandidateRoleForPc(pc, candidate);
    const bg = colors[role] || colors.other;
    const dark = isDark(bg);
    const noteLabel = buildDetectedCandidateLabelForPc(pc, candidate, chordPreferSharps, showIntervalsLabel, showNotesLabel);
    return (
      <div
        className={`relative z-20 inline-flex ${fretNoteSizeClass(fret, isNarrowBoardLayout, compactOpen)} items-center justify-center rounded-full text-[10px] font-semibold transition-transform duration-150 ${isPlaying ? "scale-110" : ""}`}
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

  function GuideToneFretboard({ voicing, emptyMessage = "" }) {
    return (
      <GuideToneFretboardImpl
        voicing={voicing} emptyMessage={emptyMessage}
        maxFret={maxFret} isNarrowBoardLayout={isNarrowBoardLayout} showNonScale={showNonScale}
        chordPreferSharps={chordPreferSharps} colors={colors}
        HoverCellNote={HoverCellNote} MobileMainFretboard={MobileMainFretboard}
        guideToneRoleOfPc={guideToneRoleOfPc} labelForGuideTonePc={labelForGuideTonePc}
        chordRootPc={chordRootPc} labelForCellAt={labelForCellAt}
      />
    );
  }

  function renderChordInvestigationFretboard() {
    return (
      <ManualChordPanel
        layout={{ isCompactLayout, isMobileLayout, isNarrowBoardLayout }}
        reading={{
          chordDetectSelectedNotes,
          chordDetectSelectedCandidate,
          studyData,
          chordDetectPhysicalPatternText,
          chordPreferSharps,
          chordDetectSelectedCandidateBadgeItems,
          chordDetectSelectedCandidateBassNote,
          colors,
        }}
        actions={{
          chordDetectClickAudio,
          setChordDetectClickAudio,
          fnPlayChordDetectSelection,
          fnPlayChordDetectVoicingTogether,
          clearChordDetectSelection,
          openMainChordStudy,
        }}
        reference={{
          chordDetectPrioritizeContext,
          updateChordDetectPrioritizeContext,
          chordRefEnabled,
          setChordRefEnabled,
          chordRefNatural,
          setChordRefNatural,
          CHORD_REF_NATURAL_LETTERS,
          chordRefAcc,
          setChordRefAcc,
          chordRefQuality,
          setChordRefQuality,
          CHORD_REF_QUALITIES,
        }}
        patternInput={{
          voicingInputText,
          setVoicingInputText,
          setChordDetectSelectedKeys,
          chordDetectMode,
          setChordDetectMode,
        }}
        fretboard={{
          chordDetectPanelRef,
          chordDetectPlayingKeys,
          chordDetectSelectedKeys,
          setChordDetectWindowStart,
          chordDetectWindowStartMin,
          chordDetectWindowFrom,
          chordDetectWindowTo,
          chordDetectWindowAllowedStartMax,
          MobileMainFretboard,
          chordDetectVisibleFrets,
          toggleChordDetectCell,
          mobileVerticalFretBorderClass,
          HoverCellNote,
          ChordInvestigationCircle,
          showNonScale,
          showIntervalsLabel,
          showNotesLabel,
          labelForCellAt,
          maxFret,
        }}
        candidates={{
          InfoTitle,
          DETECTED_CHORDS_INFO_TEXT,
          chordDetectCandidatesRanked,
          chordDetectCandidateId,
          selectDetectedCandidate,
          formatChordNamePure,
          applyDetectedCandidate,
        }}
        staff={{ chordDetectStaffEvents, chordDetectSelectionPositionsText }}
        ui={{ UI_BTN_SM }}
      />
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

    const mobileVisibleFrets = isNarrowBoardLayout
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

        {isNarrowBoardLayout ? (
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
      <RouteLabFretboardComponent
        route={{ routeLabPickNext, setRouteLabStartCode, setRouteLabPickNext, setRouteLabEndCode }}
        derived={{ routeLabIndexByCell, routeLabText, routeLabResult, routeLabDebugLines, routeStaffEvents, routeKeySignature }}
        fretboard={{
          isNarrowBoardLayout, maxFret,
          scalePcs, showExtra, extraPcs, showNonScale,
          rootPc, preferSharps,
          scaleIntervalLabels, spelledScaleNotes, spelledExtraNotes, extraIntervals,
          thirdOffsets, scaleName, debugMode, colors,
        }}
        ui={{ Circle, HoverCellNote, MobileMainFretboard, labelForPc }}
      />
    );
  }

  function Fretboard({ title, subtitle, mode, testId }) {
    // mode: scale | patterns | route
    const showAllNotes = showNonScale;
    const usesKingOverlay = mode === "scale" && isKingBoxEligibleScale && showKingBoxes;

    return (
      <PanelBlock
        data-testid={testId}
        title={<InfoTitle label={title} info={subtitle} />}
        titleTooltip={!isMobileLayout ? subtitle : ""}
        headerAside={mode === "patterns" ? (
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-slate-700">Modo patrones:</div>
              <select
                data-testid="pattern-mode-select"
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
        {isNarrowBoardLayout ? (
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


  // --------------------------------------------------------------------------
  // CONSTANTES DE UI Y LAYOUT
  // --------------------------------------------------------------------------

  const wrap = "mx-auto w-full p-3";
  const wrapStyle = isMobileLayout
    ? undefined
    : isCompactLayout
      ? { width: "100%" }
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
  const chordInversionSelectWidth = fnMaxLabelCh(chordInversionOptions, 10);
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
            data-testid={`near-slot-${idx}-tone`}
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
            <select data-testid={`near-slot-${idx}-quality`} className={UI_SELECT_SM_AUTO} style={nearSelectWidthStyle(CHORD_QUALITIES, 8)} value={slot.quality} onChange={(e) => updateNearSlot(idx, { quality: e.target.value, selFrets: null })} disabled={disableAll}>
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
            data-testid={`near-slot-${idx}-structure`}
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
          <select data-testid={`near-slot-${idx}-inversion`} className={UI_SELECT_SM_AUTO + " mt-1"} style={nearSelectWidthStyle(CHORD_INVERSIONS, 10)} value={slot.inversion} onChange={(e) => updateNearSlot(idx, { inversion: e.target.value, selFrets: null })} disabled={disableAll}>
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

  const selectedQuickPresetIndex = Math.max(0, Math.min(QUICK_PRESET_COUNT - 1, parseInt(selectedQuickPresetSlot, 10) || 0));
  const selectedQuickPreset = quickPresets[selectedQuickPresetIndex] || null;
  const tonalContextSummary = `${pcToName(rootPc, preferSharps)} ${scaleName} · armonización ${harmonyMode === "functional_minor" ? "funcional menor" : "diatónica"}`;
  const standards = useStandardsFeature({
    standardsPanelActive: effectiveBoards.standards,
    isMobileLayout,
    onApplyToNearChords: applyStandardChordSetToNearChords,
  });
  const { notice: standardsNotice, catalog, mobileCatalog, selection, chart, actions } = standards;
  const themeSoftBg = themeObjectBg;
  const themeHoverBg = themeObjectBg;
  const themeDisabledControlText = isDark(themeDisabledControlBg) ? "#f8fafc" : "#64748b";
  const themeDisabledControlBorder = isDark(themeDisabledControlBg) ? "#475569" : "#cbd5e1";
  const themeFretInlayBg = mixHexColors(themeSectionHeaderBg, "#71a3c1", 0.46);
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
  const hideDesktopTonalContextOnConfiguration = !isMobileLayout && !isCompactLayout && effectiveBoards.configuration;

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
        <div className={commonClass} data-testid="chord-chips">
          <span data-testid="chord-family-state" className="sr-only">{chordFamily}</span>
          <span data-testid="chord-title" className="sr-only">{chordQuartalDisplayName}</span>
          <span data-testid="chord-controls-summary" aria-hidden="true" className="sr-only" data-content={chordSectionDisplayName} />
          <ChordNoteBadgeStrip items={chordQuartalBadgeItems} bassNote={chordQuartalBassNote} colorMap={colors} />
        </div>
      );
    }
    if (chordFamily === "guide_tones") {
      return (
        <div className={commonClass} data-testid="chord-chips">
          <span data-testid="chord-family-state" className="sr-only">{chordFamily}</span>
          <span data-testid="chord-title" className="sr-only">{guideToneDisplayName}</span>
          <span data-testid="chord-controls-summary" aria-hidden="true" className="sr-only" data-content={chordSectionDisplayName} />
          <ChordNoteBadgeStrip items={guideToneBadgeItems} bassNote={guideToneBassNote} colorMap={colors} />
        </div>
      );
    }
    return (
      <div className={commonClass} data-testid="chord-chips">
        <span data-testid="chord-family-state" className="sr-only">{chordFamily}</span>
        <span data-testid="chord-title" className="sr-only">{chordBaseDisplayName}</span>
        <span data-testid="chord-controls-summary" aria-hidden="true" className="sr-only" data-content={chordSectionDisplayName} />
        <ChordNoteBadgeStrip items={chordHeaderBadgeItems} bassNote={chordHeaderBassNote} colorMap={colors} />
      </div>
    );
  }

  function renderMainChordVoicingPicker(className = "") {
    if (chordDetectMode) return null;
    const isQuartal = chordFamily === "quartal";
    const isGuideTones = chordFamily === "guide_tones";
    const voicings = isQuartal ? chordQuartalVoicings : isGuideTones ? guideToneVoicings : chordVoicingsDisplay;
    const currentIdx = isQuartal ? chordQuartalVoicingIdx : isGuideTones ? guideToneVoicingIdx : chordResolvedSelection.idx;
    const selectedFrets = isQuartal ? chordQuartalSelectedFrets : isGuideTones ? guideToneSelectedFrets : chordResolvedSelection.frets;
    const setIdx = isQuartal ? setChordQuartalVoicingIdx : isGuideTones ? setGuideToneVoicingIdx : setChordVoicingIdx;
    const setSelectedFrets = isQuartal ? setChordQuartalSelectedFrets : isGuideTones ? setGuideToneSelectedFrets : setChordSelectedFrets;
    const voicingOptionLabels = voicings.map((v, i) => `${i + 1}. ${v.frets}${isQuartal && v.quartalDegree != null ? ` · ${fnBuildQuartalDegreeLabel(v.quartalDegree)}` : ""} (${v.isCopied ? "C " : ""}dist ${v.reach ?? (v.span + 1)})`);
    const voicingOptionLabelsMobile = voicings.map((v, i) => `${i + 1}. ${v.frets}`);
    const effectiveLabels = isMobileLayout ? voicingOptionLabelsMobile : voicingOptionLabels;
    const selectedOptionIdx = Math.max(0, voicings.findIndex((v) => v.frets === (selectedFrets || voicings[currentIdx]?.frets || "")));
    const selectedVoicingLabel = effectiveLabels[selectedOptionIdx] || "Voicing";
    const voicingSelectClass = isMobileLayout ? `${UI_SELECT_SM_COMPACT} w-[108px] shrink-0` : UI_SELECT_SM_AUTO;

    const selectIdx = (nextIdx) => {
      if (!voicings.length) return;
      const normalized = (nextIdx + voicings.length) % voicings.length;
      const nextVoicing = voicings[normalized] || null;
      if (isGuideTones) {
        lastGuideToneVoicingRef.current = nextVoicing;
      } else if (!isQuartal) {
        lastChordVoicingRef.current = nextVoicing;
      }
      setIdx(normalized);
      setSelectedFrets(nextVoicing?.frets ?? null);
    };

    return (
      <div className={className.trim()}>
        <span data-testid="active-voicing-pattern" aria-hidden="true" className="sr-only">{selectedFrets || voicings[currentIdx]?.frets || ""}</span>
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
            data-testid="voicing-select"
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
                {effectiveLabels[i]}
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
    // Texto limpio del nombre completo: "Dmaj7 · Cuatriada · Abierto · 1ª inversión"
    const fullClean = mobileChordSummaryFullText
      .replace(/\s*\([^)]+\)\s*$/, "")
      .replace(/\s+-\s+/g, " · ");
    // Separar nombre base (en azul) del resto (en negro)
    const dotIdx = fullClean.indexOf(" · ");
    const displayBase = dotIdx >= 0 ? fullClean.slice(0, dotIdx) : fullClean;
    const displayRest = dotIdx >= 0 ? fullClean.slice(dotIdx) : "";
    // Frets del voicing activo
    const activeFrets =
      chordFamily === "quartal"
        ? (activeQuartalVoicing?.frets || null)
        : chordFamily === "guide_tones"
          ? (activeGuideToneVoicing?.frets || null)
          : (activeChordVoicing?.frets || null);

    return (
      <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
        {/* Sección superior: nombre del acorde (clickable) */}
        <button
          type="button"
          className="w-full px-3 pt-3 pb-2 bg-white text-left"
          onClick={() => setMobileChordEditorOpen(true)}
        >
          <div className="inline-flex flex-wrap items-baseline gap-x-0.5 text-sm font-semibold leading-snug">
            <span className="text-sky-700">{displayBase}</span>
            {displayRest ? <span className="text-slate-800">{displayRest}</span> : null}
          </div>
        </button>
        {/* Chips (notas con colores) */}
        <div className="bg-white px-3 pb-3">
          {renderChordBadgeStripBlock()}
        </div>
        {/* Separador */}
        <div className="border-t border-slate-200" />
        {/* Sección inferior: editar + voicing + dist */}
        <div className="bg-white px-3 py-3">
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              className={UI_BTN_SM + " w-auto px-3"}
              title="Abrir editor de acorde"
              onClick={() => setMobileChordEditorOpen(true)}
              aria-label="Editar acorde"
            >
              Editar
            </button>
            <CopyVoicingButton frets={activeFrets} />
            {renderMainChordVoicingPicker()}
            {renderMainChordDistControl("shrink-0")}
          </div>
          {/* Permitir cuerdas al aire con Estudiar en el bloque */}
          <div className="mt-2 rounded-xl border border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2">
              {renderChordAllowOpenStringsToggle()}
              <button
                type="button"
                className={`${UI_BTN_SM} ml-auto inline-flex items-center justify-center`}
                title="Abre el análisis del acorde, del voicing y de sus tensiones."
                onClick={openMainChordStudy}
                aria-label="Estudiar acorde"
              >
                <BookOpen className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Span oculto para medir overflow (compatibilidad con useEffect existente) */}
        <span
          ref={mobileChordSummaryMeasureRef}
          className="pointer-events-none invisible absolute"
          aria-hidden="true"
        >
          {mobileChordSummaryFullText}
        </span>
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
    setShowBoards((prev) => normalizeBoardVisibility({ ...prev, [section]: true }, section));
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
    if (!isMobileLayout || mobileSectionTransition || mobileMenuOpen || mobileTonalContextOpen || mobileChordEditorOpen || mobileNearChordEditorIdx != null || mobileCatalog.mobileStandardsCatalogOpen || mobileInfoPopover || manualOpen || studyOpen) return;
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

  function buildTonalContextProps() {
    return {
      panel: { tonalContextRef, tonalContextSummary },
      root: { scaleRootLetter, setScaleRootLetter, scaleRootAcc, setScaleRootAcc, setRootPc },
      notation: { accMode, setAccMode },
      scale: { scaleName, setScaleName, scaleOptions, scaleOptionLabel, scaleSelectWidth, customInput, setCustomInput },
      harmony: { harmonyMode, setHarmonyMode, harmonyModeSelectWidth },
      extra: { extraInput, setExtraInput, showExtra, setShowExtra },
      kingBox: { isKingBoxEligibleScale, showKingBoxes, setShowKingBoxes, kingBoxMode, setKingBoxMode, kingBoxColors, setKingBoxColors },
      summary: { scaleTetradDegreesText, scaleTetradNotesText },
      ui: { ToggleButton, UI_LABEL_SM, UI_SELECT_SM, UI_SELECT_SM_TONE, UI_SELECT_SM_AUTO, UI_INPUT_SM, UI_BTN_SM },
    };
  }

  function configPanelProps() {
    return {
      view: { showNotesLabel, setShowNotesLabel, showIntervalsLabel, setShowIntervalsLabel, maxFret, setMaxFret, showNonScale, setShowNonScale, debugMode, setDebugMode },
      theme: { themePageBg, setThemePageBg, themeObjectBg, setThemeObjectBg, themeSectionHeaderBg, setThemeSectionHeaderBg, themeElementBg, setThemeElementBg, themeDisabledControlBg, setThemeDisabledControlBg },
      colorState: { colors, setColor, patternColors, setPatternColor, legend },
      presets: { selectedQuickPresetSlot, setSelectedQuickPresetSlot, quickPresets, loadQuickPreset, selectedQuickPresetIndex, selectedQuickPreset, saveQuickPreset, QUICK_PRESET_COUNT },
      actions: { exportUiConfig, resetUiConfig, importConfigInputRef },
      layout: { effectiveBoards, patternsMode, scaleIntervals },
      ui: { ToggleButton, UI_LABEL_SM, UI_SELECT_SM, UI_BTN_SM },
    };
  }

  function boardVisibilityForSection(section) {
    return {
      scale: section === "scale",
      patterns: section === "patterns",
      route: section === "route",
      chords: section === "chords",
      nearChords: section === "nearChords",
      standards: section === "standards",
      configuration: section === "configuration",
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
        {boardVisibility.scale ? <Fretboard title="Escala" subtitle={SCALE_INFO_TEXT} mode="scale" testId="fretboard-scale" /> : null}
        {boardVisibility.patterns ? <Fretboard title="Patrones" subtitle={PATTERNS_INFO_TEXT} mode="patterns" testId="fretboard-patterns" /> : null}
        {boardVisibility.route ? (
          <PanelBlock
            data-testid="route-panel"
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
                  data-testid="route-start-input"
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
                  data-testid="route-end-input"
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
          <ChordsPanel
            layout={{ isMobileLayout, mobileChordEditorOpen, setMobileChordEditorOpen }}
            chordCtrl={{
              chordDetectMode, setChordDetectMode,
              chordCopyNotice,
              chordFamily, setChordFamily,
              chordRootPc, setChordRootPc,
              chordSpellPreferSharps, setChordSpellPreferSharps,
              chordAccidental,
              chordQuality, setChordQuality,
              chordSuspension, setChordSuspension,
              chordStructure, applyChordStructureSelection,
              chordForm, setChordForm, setChordPositionForm,
              chordInversion, setChordInversion, chordInversionOptions,
              chordExt7, setChordExt7,
              chordExt6, setChordExt6,
              chordExt9, setChordExt9,
              chordExt11, setChordExt11,
              chordExt13, setChordExt13,
              chordOmit, setChordOmit,
              chordEnginePlan,
              chordControlsTitle,
              chordBaseDisplayName,
            }}
            quartalCtrl={{
              chordQuartalType, setChordQuartalType,
              chordQuartalVoices, setChordQuartalVoices,
              chordQuartalSpread, setChordQuartalSpread,
              chordQuartalReference, setChordQuartalReference,
              chordQuartalScaleName, setChordQuartalScaleName,
            }}
            guideToneCtrl={{
              guideToneQuality, setGuideToneQuality,
              guideToneForm, setGuideToneForm,
              guideToneInversion, setGuideToneInversion,
            }}
            uiCls={{
              chordSelectClass, chordAutoSelectClass,
              chordMobileEditorGridClass, chordMobileEditorTertianGridClass,
              nearSlotDesktopEditorClass,
              chordFamilySelectWidth, chordFormSelectWidth,
              chordInversionSelectWidth, chordSuspensionSelectWidth, chordQualitySelectWidth,
            }}
            voicingData={{
              chordQuartalUiText, chordQuartalStepText,
              activeQuartalVoicing, chordQuartalVoicingIdx, chordQuartalVoicings,
              quartalRoleOfPc, labelForQuartalPc, quartalNoteNameForPc,
              activeGuideToneVoicing, guideToneVoicingIdx, guideToneVoicings,
              activeChordVoicing, chordVoicingIdx, chordVoicingsDisplay,
              chordDbError, chordVoicingsResolving,
            }}
            detectArea={{ chordDetectInvestigationAreaRef, chordDetectClearMinHeight }}
            renderFns={{
              renderChordBadgeStripBlock,
              renderMainChordVoicingPicker,
              renderMainChordDistControl,
              renderMobileChordSummaryCard,
              renderChordInvestigationFretboard,
              renderChordAllowOpenStringsToggle,
              openMainChordStudy,
              InfoTitle,
              ChordFretboard,
              GuideToneFretboard,
            }}
          />
        ) : null}

        {boardVisibility.nearChords ? (
          <PanelBlock
            data-testid="near-chords-panel"
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
                    data-testid={`near-slot-${idx}`}
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
                            data-testid={`near-slot-${idx}-enabled`}
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

        {boardVisibility.standards ? (
          <StandardsPanel
            layout={{ isMobileLayout }}
            notice={standardsNotice}
            catalog={catalog}
            mobileCatalog={mobileCatalog}
            selection={selection}
            chart={chart}
            actions={actions}
            ui={{ UI_BTN_SM, UI_LABEL_SM, UI_INPUT_SM, InfoTitle }}
          />
        ) : null}

        {(boardVisibility.chords || boardVisibility.nearChords) ? (
          <StudyPanel
            study={{ studyData, studyOpen, setStudyOpen }}
            tonal={{ rootPc, autoPreferSharps, scaleName, scaleIntervals, scaleNotesText, harmonyMode, harmonizedScale }}
            reference={{ refChordDisplayName, chordRefEnabled }}
            chordContext={{ chordRootPc, chordPreferSharps }}
            display={{ showIntervalsLabel, showNotesLabel, colors }}
            ui={{ InfoTitle, CHORD_STUDY_INFO_TEXT, UI_BTN_SM }}
          />
        ) : null}

        {boardVisibility.configuration ? (
          <div className="hidden xl:block">
            <AppConfigPanel {...configPanelProps()} />
          </div>
        ) : null}
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
      <div className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-200 ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setMobileMenuOpen(false)} />
      <div ref={appRootRef} className={`${wrap} ${isCompactLayout ? "pb-28" : ""}`.trim()} style={wrapStyle}>
        <AppHeader
          appVersion={APP_VERSION}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          effectiveBoards={effectiveBoards}
          selectBoardView={selectBoardView}
          importConfigInputRef={importConfigInputRef}
          importUiConfigFromFile={importUiConfigFromFile}
          configNotice={configNotice}
          UI_BTN_SM={UI_BTN_SM}
          setManualOpen={setManualOpen}
        />

        <div className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-4">
              {!isMobileLayout && !hideDesktopTonalContextOnConfiguration ? <TonalContextPanel {...buildTonalContextProps()} /> : null}
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
                  <TonalContextFields {...buildTonalContextProps()} />
                </div>
              </div>
            </div>
          </>
        ) : null}
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div
              className="w-full max-w-[420px] overflow-y-auto rounded-2xl bg-sky-100 shadow-2xl ring-1 ring-slate-200 sm:max-w-[720px]"
              style={{ maxHeight: "calc(100dvh - 32px)" }}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-[#c7d8e5] px-3 py-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-800">Configuración</div>
                  <div className="text-xs text-slate-600">Ajustes globales y visuales de la app.</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={() => setManualOpen(true)}>
                    Ayuda
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
                    onClick={() => setMobileMenuOpen(false)}
                    title="Cerrar configuración"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <AppConfigPanel {...configPanelProps()} />
              </div>
            </div>
          </div>
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
        <MobileInfoPopover
          mobileInfoPopover={mobileInfoPopover}
          onClose={() => setMobileInfoPopover(null)}
        />
        {renderMobileNearSlotEditorPortal()}
        {isCompactLayout ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex justify-center px-3 xl:hidden">
            <div className="pointer-events-auto w-[min(92vw,430px)] rounded-[30px] border border-slate-200/80 bg-white/96 p-2 shadow-[0_14px_38px_rgba(15,23,42,0.16)] backdrop-blur-md">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${MOBILE_BOTTOM_NAV_OPTIONS.length}, minmax(0, 1fr))` }}>
              {MOBILE_BOTTOM_NAV_OPTIONS.map((option) => {
                const isNavActive = isMobileLayout
                  ? mobileBottomNavSelectedSection === option.value
                  : showBoards[option.value] === true;
                return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] px-1.5 py-2 text-[10px] font-semibold leading-tight transition-colors ${isNavActive ? "bg-[#71a3c1] text-slate-900 shadow-[0_8px_20px_rgba(113,163,193,0.28)]" : "bg-transparent text-slate-600 hover:bg-sky-50 hover:text-slate-900"}`}
                  onClick={() => selectBoardView(option.value)}
                  title={option.label}
                  aria-disabled={mobileSectionTransition ? "true" : undefined}
                >
                  <option.icon className={`shrink-0 ${isNavActive ? "h-[18px] w-[18px]" : "h-[17px] w-[17px]"}`} aria-hidden="true" />
                  <span className={`block max-w-full text-center leading-tight ${option.value === "standards" ? "text-[9px]" : ""}`}>{option.label}</span>
                </button>
                );
              })}
              </div>
            </div>
          </div>
        ) : null}
              <ManualOverlay open={manualOpen} onClose={() => setManualOpen(false)} UI_BTN_SM={UI_BTN_SM} />
        <AppFooter />
      </div>
    </div>
  );
}

