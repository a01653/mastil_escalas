// ============================================================================
// CATÁLOGOS Y PRESETS MUSICALES
// ============================================================================

export const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const MOBILE_LAYOUT_WIDTH_MEDIA_QUERY = "(max-width: 767px)";
export const MOBILE_LAYOUT_TOUCH_MEDIA_QUERY = "(pointer: coarse) and (hover: none)";
export const MOBILE_SECTION_OPTIONS = [
  { value: "scale", label: "Escala" },
  { value: "patterns", label: "Patrones" },
  { value: "route", label: "Ruta" },
  { value: "chords", label: "Acordes" },
  { value: "nearChords", label: "Acordes cercanos" },
  { value: "standards", label: "Standards" },
];
export const MOBILE_SECTION_SWIPE_COMMIT_RATIO = 0.5;

export const SCALE_INFO_TEXT = "Escala + (opcional) extras. Resalta raíz/3ª/5ª.";
export const PATTERNS_INFO_TEXT = "Patrones: 5 boxes (pentatónicas), 7 3NPS (7 notas) y CAGED. Ruta: sigue la escala en orden y se restringe a patrones";
export const NEAR_CHORDS_INFO_TEXT = "Selecciona hasta 4 acordes y busca digitaciones dentro de un rango. Ordena por cercanía al primer acorde activo. Los acordes se ajustan automáticamente según la nota raíz y la escala activas.";
export const NEAR_AUTO_SCALE_INFO_TEXT = "Con Auto escala ON, los acordes cercanos se rellenan y actualizan según la nota raíz, la escala y la armonización activas. Con OFF, cada acorde queda bajo edición manual.";
export const STANDARDS_INFO_TEXT = [
  "Standards reúne charts armónicos sin melodía y reducciones de estudio pensadas para trabajar repertorio dentro del flujo de esta app.",
  "Cuando un tema tenga chart real, verás la forma completa compás a compás y podrás seleccionar hasta 4 cambios para cargarlos en Acordes cercanos.",
  "Debajo se mantiene la reducción pedagógica para aislar funciones, voicings, ii-V-I y conducción de voces sin perder la visión global del tema.",
].join("\n");
export const CHORDS_SECTION_INFO_TEXT = [
  "Acordes construye el acorde principal y muestra digitaciones reales sobre el mástil.",
  "Investigar en mástil bloquea el editor superior y te deja seleccionar una nota por cuerda directamente en el diapasón.",
  "En ese modo la app propone lecturas posibles y puedes copiarlas de vuelta a la sección Acorde.",
].join("\n");
export const CHORD_EDITOR_INFO_TEXT = [
  "Esta ventana define el acorde que quieres construir.",
  "Tono y Calidad / Sus cambian la nota base y el color armónico.",
  "Estructura, Forma e Inversión ajustan cuántas voces usas y cómo se reparten en el voicing.",
  "Las casillas 6, 7, 9, 11 y 13 añaden o quitan extensiones según la estructura activa.",
].join("\n");
export const CHORD_STUDY_INFO_TEXT = [
  "Modo estudio analiza el acorde activo, el voicing actual y sus tensiones.",
  "Ver análisis abre o cierra el detalle del estudio.",
  "Exportar PDF genera un resumen imprimible del análisis visible.",
].join("\n");
export const CHORD_FRETBOARD_INFO_TEXT = [
  "Este mástil muestra la digitación real del acorde activo.",
  "Permitir cuerdas al aire deja entrar voicings con cuerdas al aire sin contar esas cuerdas para la distancia.",
  "Voicing X/Y indica qué digitación concreta estás viendo dentro de las encontradas.",
].join("\n");
export const DETECTED_CHORDS_INFO_TEXT = [
  "Aquí aparecen las lecturas posibles a partir de las notas que has marcado en el mástil.",
  "El selector elige qué lectura queda activa.",
  "Copiar en Acorde pasa esa lectura al constructor superior cuando es compatible.",
].join("\n");
export const PRIMARY_BOARD_SECTIONS = ["scale", "patterns", "route", "chords", "nearChords", "standards"];
export const TONAL_CONTEXT_TOOLTIP = "Afecta a Escala, Patrones, Ruta y al contexto armónico usado en análisis y acordes cercanos.";
export const MOBILE_VERTICAL_STRING_ORDER = [5, 4, 3, 2, 1, 0];
export const WEB_FRET_LABEL_COL_PX = 110;
export const WEB_FRET_ZERO_WIDTH_PX = 22;
export const WEB_FRET_CELL_MIN_WIDTH_PX = 60;
export const WEB_FRET_CELL_MAX_WIDTH_PX = 70;
export const WEB_FRET_CELL_HEIGHT_PX = 32;
export const WEB_FRETBOARD_GRID_GAP_PX = 4;
export const PANEL_BODY_PADDING_X_PX = 24;
export const APP_WRAP_PADDING_X_PX = 24;
export const WEB_FRET_LABEL_COL = `${WEB_FRET_LABEL_COL_PX}px`;
export const WEB_FRET_ZERO_WIDTH = `${WEB_FRET_ZERO_WIDTH_PX}px`;
export const WEB_FRET_CELL_WIDTH = `minmax(${WEB_FRET_CELL_MIN_WIDTH_PX}px, ${WEB_FRET_CELL_MAX_WIDTH_PX}px)`;
export const WEB_FRET_CELL_HEIGHT = `${WEB_FRET_CELL_HEIGHT_PX}px`;
export const MOBILE_VERTICAL_STRING_COL_WIDTH = "36px";
export const MOBILE_VERTICAL_FRET_LABEL_COL = "42px";
export const MOBILE_VERTICAL_FRETBOARD_COLS = `repeat(6, ${MOBILE_VERTICAL_STRING_COL_WIDTH})`;
export const MOBILE_CHORD_FRET_LABEL_COL = "42px";
export const MOBILE_CHORD_FRET_ZERO_WIDTH = "32px";
export const MOBILE_CHORD_FRET_ZERO_HEIGHT = "32px";
export const MOBILE_CHORD_FRET_CELL_WIDTH = "minmax(34px, 1fr)";
export const MOBILE_CHORD_NUT_WIDTH = "7px";
export const MOBILE_CHORD_NUT_BG = "var(--section-header-bg, #c7d8e5)";
export const MOBILE_CHORD_INVESTIGATION_WINDOW_SIZE = 6;


export function normalizeBoardVisibility(value = {}, preferredPrimary = null) {
  const next = {
    scale: false,
    patterns: false,
    route: false,
    chords: false,
    nearChords: false,
    standards: false,
    configuration: !!value.configuration,
  };
  const activePrimary = PRIMARY_BOARD_SECTIONS.includes(preferredPrimary)
    ? preferredPrimary
    : PRIMARY_BOARD_SECTIONS.find((section) => !!value[section]) || "chords";
  next[activePrimary] = true;
  return next;
}

export const SCALE_PRESETS = {
  "Pentatónica mayor": [0, 2, 4, 7, 9],
  "Pentatónica menor": [0, 3, 5, 7, 10],

  "Mayor": [0, 2, 4, 5, 7, 9, 11],
  "Menor natural": [0, 2, 3, 5, 7, 8, 10],

  "Jónica (Ionian)": [0, 2, 4, 5, 7, 9, 11],
  "Dórica (Dorian)": [0, 2, 3, 5, 7, 9, 10],
  "Frigia (Phrygian)": [0, 1, 3, 5, 7, 8, 10],
  "Lidia (Lydian)": [0, 2, 4, 6, 7, 9, 11],
  "Mixolidia (Mixolydian)": [0, 2, 4, 5, 7, 9, 10],
  "Eólica (Aeolian)": [0, 2, 3, 5, 7, 8, 10],
  "Locria (Locrian)": [0, 1, 3, 5, 6, 8, 10],

  // Menores “armónicas / melódicas”
  "Menor armónica": [0, 2, 3, 5, 7, 8, 11],
  "Menor melódica (asc)": [0, 2, 3, 5, 7, 9, 11],

  // Variantes mayores
  "Mayor armónica": [0, 2, 4, 5, 7, 8, 11],
  "Doble armónica (Bizantina)": [0, 1, 4, 5, 7, 8, 11],

  // Modos/colores habituales
  "Frigia dominante": [0, 1, 4, 5, 7, 8, 10],
  "Lidia dominante": [0, 2, 4, 6, 7, 9, 10],
  "Mixolidia b9 #9 b13": [0, 1, 3, 4, 5, 7, 8, 10],
  "Alterada (Superlocria)": [0, 1, 3, 4, 6, 8, 10],
  "Húngara menor (Gypsy)": [0, 2, 3, 6, 7, 8, 11],

  // Bebop (8 notas)
  "Bebop mayor": [0, 2, 4, 5, 7, 8, 9, 11],
  "Bebop dominante": [0, 2, 4, 5, 7, 9, 10, 11],
  "Bebop dórica": [0, 2, 3, 4, 5, 7, 9, 10],
  "Bebop frigia dominante": [0, 1, 4, 5, 7, 8, 10, 11],
  "Bebop locria": [0, 1, 3, 5, 6, 7, 8, 10],
  "Bebop menor armónica": [0, 2, 3, 5, 7, 8, 10, 11],
  "Bebop menor melódica": [0, 2, 3, 5, 7, 9, 10, 11],

  // Otras útiles
  "Pentatónica menor + blue note": [0, 3, 5, 6, 7, 10],
  "Pentatónica mayor + blue note": [0, 2, 3, 4, 7, 9],
  "Hirajoshi": [0, 2, 3, 7, 8],
  "Tonos enteros": [0, 2, 4, 6, 8, 10],
  "Disminuida (H-W)": [0, 1, 3, 4, 6, 7, 9, 10],
  "Disminuida (W-H)": [0, 2, 3, 5, 6, 8, 9, 11],

  "Personalizada": null,
};

export const SCALE_NAME_ALIASES = {
  "Escala mayor": "Mayor",
  "Escala menor (natural)": "Menor natural",
  "Bebop mixolidia": "Bebop dominante",
  "Bebop menor": "Bebop dórica",
};

export const SCALE_INTERVAL_LABEL_OVERRIDES = {
  "Mixolidia b9 #9 b13": ["1", "b9", "#9", "3", "4", "5", "b13", "b7"],
};



export const TONALITY_CANDIDATE_SCALE_NAMES = [
  "Mayor",
  "Menor natural",
];

export const MANUAL_SCALE_TETRAD_PRESETS = {
  "Pentatónica mayor": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "" },
    { scaleIdx: 1, degreeLabel: "II", suffix: "sus4" },
    { scaleIdx: 2, degreeLabel: "III", suffix: "m(no5)" },
    { scaleIdx: 3, degreeLabel: "V", suffix: "sus2" },
    { scaleIdx: 4, degreeLabel: "VI", suffix: "m" },
  ],
  "Pentatónica menor": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "m" },
    { scaleIdx: 1, degreeLabel: "bIII", suffix: "" },
    { scaleIdx: 2, degreeLabel: "IV", suffix: "sus4" },
    { scaleIdx: 3, degreeLabel: "V", suffix: "m(no5)" },
    { scaleIdx: 4, degreeLabel: "bVII", suffix: "sus2" },
  ],
  "Pentatónica mayor + blue note": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "maj7" },
    { scaleIdx: 1, degreeLabel: "II", suffix: "m7" },
    { scaleIdx: 3, degreeLabel: "III", suffix: "m7" },
    { scaleIdx: 4, degreeLabel: "V", suffix: "7" },
    { scaleIdx: 5, degreeLabel: "VI", suffix: "m7" },
  ],
  "Pentatónica menor + blue note": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "m7" },
    { scaleIdx: 1, degreeLabel: "bIII", suffix: "maj7" },
    { scaleIdx: 2, degreeLabel: "IV", suffix: "m7" },
    { scaleIdx: 4, degreeLabel: "V", suffix: "m7" },
    { scaleIdx: 5, degreeLabel: "bVII", suffix: "7" },
  ],
  "Bebop mayor": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "maj7" },
    { scaleIdx: 1, degreeLabel: "II", suffix: "m7" },
    { scaleIdx: 2, degreeLabel: "III", suffix: "m7" },
    { scaleIdx: 3, degreeLabel: "IV", suffix: "maj7" },
    { scaleIdx: 4, degreeLabel: "V", suffix: "7" },
    { scaleIdx: 6, degreeLabel: "VI", suffix: "m7" },
    { scaleIdx: 7, degreeLabel: "VII", suffix: "m7(b5)" },
  ],
  "Bebop dominante": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "7" },
    { scaleIdx: 1, degreeLabel: "II", suffix: "m7" },
    { scaleIdx: 2, degreeLabel: "III", suffix: "m7(b5)" },
    { scaleIdx: 3, degreeLabel: "IV", suffix: "maj7" },
    { scaleIdx: 4, degreeLabel: "V", suffix: "m7" },
    { scaleIdx: 5, degreeLabel: "VI", suffix: "m7" },
    { scaleIdx: 6, degreeLabel: "bVII", suffix: "maj7" },
  ],
  "Bebop dórica": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "m7" },
    { scaleIdx: 1, degreeLabel: "II", suffix: "m7" },
    { scaleIdx: 2, degreeLabel: "bIII", suffix: "maj7" },
    { scaleIdx: 4, degreeLabel: "IV", suffix: "7" },
    { scaleIdx: 5, degreeLabel: "V", suffix: "m7" },
    { scaleIdx: 6, degreeLabel: "VI", suffix: "m7(b5)" },
    { scaleIdx: 7, degreeLabel: "bVII", suffix: "maj7" },
  ],
  "Húngara menor (Gypsy)": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "m(maj7)" },
    { scaleIdx: 1, degreeLabel: "II", suffix: "7b5" },
    { scaleIdx: 2, degreeLabel: "bIII", suffix: "maj7#5" },
    { scaleIdx: 3, degreeLabel: "#IV", suffix: "dim7" },
    { scaleIdx: 4, degreeLabel: "V", suffix: "maj7" },
    { scaleIdx: 5, degreeLabel: "bVI", suffix: "maj7" },
    { scaleIdx: 6, degreeLabel: "VII", suffix: "m6" },
  ],
  "Doble armónica (Bizantina)": [
    { scaleIdx: 0, degreeLabel: "I", suffix: "maj7" },
    { scaleIdx: 1, degreeLabel: "bII", suffix: "maj7" },
    { scaleIdx: 2, degreeLabel: "III", suffix: "m6" },
    { scaleIdx: 3, degreeLabel: "IV", suffix: "m(maj7)" },
    { scaleIdx: 4, degreeLabel: "V", suffix: "7b5" },
    { scaleIdx: 5, degreeLabel: "bVI", suffix: "maj7#5" },
    { scaleIdx: 6, degreeLabel: "VII", suffix: "(no tert.)" },
  ],
};

export const MANUAL_SCALE_HARMONY_PRESETS = {
  "Mixolidia b9 #9 b13": [
    { scaleIdx: 0, degreeLabel: "I", quality: "dom", suspension: "none", structure: "tetrad", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false },
    { scaleIdx: 1, degreeLabel: "bII", quality: "dim", suspension: "none", structure: "tetrad", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false },
    { scaleIdx: 4, degreeLabel: "IV", quality: "min", suspension: "none", structure: "tetrad", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false },
    { scaleIdx: 6, degreeLabel: "bVI", quality: "maj", suspension: "none", structure: "tetrad", ext7: true, ext6: false, ext9: false, ext11: false, ext13: false },
  ],
};

export const UI_SECTION_PANEL = "overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200";


// ============================================================================

// Afinación estándar (UI: 1ª->6ª)
export const STRINGS = [
  { label: "1ª (E)", pc: 4 },
  { label: "2ª (B)", pc: 11 },
  { label: "3ª (G)", pc: 7 },
  { label: "4ª (D)", pc: 2 },
  { label: "5ª (A)", pc: 9 },
  { label: "6ª (E)", pc: 4 },
];

// MIDI aproximado cuerdas al aire (E4,B3,G3,D3,A2,E2)
export const OPEN_MIDI = [64, 59, 55, 50, 45, 40];

// Inlays tipo guitarra: puntos en 3/5/7/9 (y 15/17/19/21) y doble en 12/24.
export const INLAY_SINGLE = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
export const INLAY_DOUBLE = new Set([12, 24]);

// Helper: columnas del grid con traste 0 más estrecho
export function fretGridCols(maxFret) {
  const rest = WEB_FRET_CELL_WIDTH;
  return `${WEB_FRET_LABEL_COL} ${WEB_FRET_ZERO_WIDTH} repeat(${maxFret}, ${rest})`;
}

export function fretsForCompactVoicing(voicing, fallbackMaxFret = 6) {
  const positiveFrets = Array.isArray(voicing?.notes)
    ? voicing.notes.map((n) => Number(n.fret)).filter((fret) => Number.isFinite(fret) && fret > 0)
    : [];
  const boardMax = Math.max(4, Math.min(24, Number(fallbackMaxFret) || 6));
  if (!positiveFrets.length) {
    const end = Math.min(boardMax, 4);
    return Array.from({ length: end }, (_, idx) => idx + 1);
  }

  const min = Math.max(1, Math.min(...positiveFrets));
  const max = Math.max(...positiveFrets);
  let start = min === 2 ? 1 : min;
  let end = Math.max(max, start + 3);

  if (end > boardMax) {
    const visibleCount = Math.max(4, Math.min(6, end - start + 1));
    end = boardMax;
    start = Math.max(1, end - visibleCount + 1);
    if (min === 2 && start > 1) start = 1;
  }

  while (end - start + 1 < 4 && end < boardMax) end += 1;
  while (end - start + 1 < 4 && start > 1) start -= 1;

  const count = Math.max(1, end - start + 1);
  return Array.from({ length: count }, (_, idx) => start + idx);
}

export function getCompactStandardChordDisplay(event, previousEvent = null) {
  const display = String(event?.display || "").trim();
  if (!display.includes("/")) return display;

  const previousDisplay = String(previousEvent?.display || "").trim();
  const previousLoad = String(previousEvent?.load || previousEvent?.loadSymbol || "").trim();
  const currentLoad = String(event?.load || event?.loadSymbol || "").trim();
  if (!previousDisplay || previousDisplay.includes("/") || !previousLoad || currentLoad !== previousLoad) return display;

  const slashIdx = display.indexOf("/");
  if (slashIdx <= 0 || slashIdx >= display.length - 1) return display;
  const baseDisplay = display.slice(0, slashIdx);
  const bassDisplay = display.slice(slashIdx + 1);
  if (baseDisplay !== previousDisplay || !bassDisplay) return display;

  return `/${bassDisplay}`;
}

export function normalizeVisibleFrets(frets, maxFret) {
  const boardMax = Math.max(0, Math.min(24, Number(maxFret) || 0));
  return Array.from(
    new Set(
      (Array.isArray(frets) ? frets : [])
        .map((fret) => Math.floor(Number(fret)))
        .filter((fret) => Number.isFinite(fret) && fret >= 0 && fret <= boardMax)
    )
  ).sort((a, b) => a - b);
}

export function _fretGridColsForFrets(displayFrets, isMobileLayout = false) {
  if (isMobileLayout) {
    return `${MOBILE_CHORD_FRET_LABEL_COL} ${MOBILE_CHORD_FRET_ZERO_WIDTH} repeat(${displayFrets.length}, ${MOBILE_CHORD_FRET_CELL_WIDTH})`;
  }
  return fretGridCols(displayFrets.length ? Math.max(...displayFrets) : 0);
}

export function fretCellStyleForLayout(fret, isMobileLayout, extra = {}) {
  if (isMobileLayout) {
    return {
      width: fret === 0 ? MOBILE_CHORD_FRET_ZERO_WIDTH : undefined,
      height: fret === 0 ? MOBILE_CHORD_FRET_ZERO_HEIGHT : WEB_FRET_CELL_HEIGHT,
      ...extra,
    };
  }
  return {
    height: WEB_FRET_CELL_HEIGHT,
    ...extra,
  };
}

export function fretNoteSizeClass(fret, isMobileLayout, compactOpen = false) {
  if (fret !== 0) return "h-7 w-7";
  if (compactOpen) return mobileVerticalOpenNoteClass(fret, isMobileLayout);
  return isMobileLayout ? "h-7 w-7" : "h-[28px] w-[18px]";
}

export function webFretboardGridWidthPx(maxFret, fretCellWidthPx = WEB_FRET_CELL_MIN_WIDTH_PX) {
  return WEB_FRET_LABEL_COL_PX + WEB_FRET_ZERO_WIDTH_PX + maxFret * fretCellWidthPx + (maxFret + 1) * WEB_FRETBOARD_GRID_GAP_PX;
}

export function webAppWidthPx(maxFret, fretCellWidthPx = WEB_FRET_CELL_MIN_WIDTH_PX) {
  return webFretboardGridWidthPx(maxFret, fretCellWidthPx) + PANEL_BODY_PADDING_X_PX + APP_WRAP_PADDING_X_PX;
}

export function mobileVerticalFretGridCols() {
  return MOBILE_VERTICAL_FRETBOARD_COLS;
}

export function mobileVerticalFretCellClass(fret) {
  return fret === 0 ? "h-[34px]" : "h-[45px]";
}

export function mobileVerticalFretRowMarginTop(fret, previousFret) {
  if (previousFret == null) return undefined;
  return previousFret === 0 ? "calc(2px + 0.25rem)" : "0.25rem";
}

export function mobileVerticalFretBorderClass(fret) {
  return fret === 0 ? "border-transparent" : "border-slate-200";
}

export function mobileVerticalOpenNoteClass(fret, isMobileLayout) {
  return isMobileLayout && fret === 0 ? "h-[22px] w-[36px]" : "h-7 w-7";
}

export function mobileStringHeaderParts(label) {
  const m = String(label || "").match(/^([^ ]+)\s*\(([^)]+)\)$/);
  if (!m) return { number: label, openNote: "" };
  return { number: m[1], openNote: m[2] };
}

export function mobileFretHasInlay(fret) {
  return INLAY_SINGLE.has(fret) || INLAY_DOUBLE.has(fret);
}

export function mobileInlayGridColumns(fret) {
  if (INLAY_DOUBLE.has(fret)) return ["2 / 4", "4 / 6"];
  if (INLAY_SINGLE.has(fret)) return ["3 / 5"];
  return [];
}

export function hasInlayCell(fret, sIdx) {
  return (INLAY_SINGLE.has(fret) && sIdx === 2) || (INLAY_DOUBLE.has(fret) && (sIdx === 1 || sIdx === 3));
}

export const KING_BOX_DEFAULTS = {
  bb: { label: "B.B. King", border: "#000000" },
  albert: { label: "Albert King", border: "#7c3aed" },
};

export const BB_KING_BOX_OFFSETS = [
  { sIdx: 2, fretOffset: 1 },
  { sIdx: 1, fretOffset: 0 },
  { sIdx: 1, fretOffset: 2 },
  { sIdx: 0, fretOffset: 0 },
  { sIdx: 0, fretOffset: 1 },
  { sIdx: 0, fretOffset: 2 },
];

export const ALBERT_KING_BOX_OFFSETS = [
  { sIdx: 2, fretOffset: -1 },
  { sIdx: 1, fretOffset: -2 },
  { sIdx: 1, fretOffset: 0 },
  { sIdx: 0, fretOffset: -2 },
  { sIdx: 0, fretOffset: 0 },
];

function mod12Local(n) {
  const value = n % 12;
  return value < 0 ? value + 12 : value;
}

function findRootFretsOnStringLocal({ rootPc, sIdx, maxFret }) {
  const out = [];
  const base = STRINGS[sIdx].pc;
  for (let fret = 0; fret <= maxFret; fret += 1) {
    if (mod12Local(base + fret) === mod12Local(rootPc)) out.push(fret);
  }
  return out;
}

export function buildKingBoxInstancesFromOffsets({ rootPc, maxFret, anchorSIdx, offsets }) {
  const roots = findRootFretsOnStringLocal({ rootPc, sIdx: anchorSIdx, maxFret });
  const out = [];
  const seen = new Set();

  for (const rootFret of roots) {
    const cells = new Set();
    for (const item of offsets) {
      const fret = rootFret + item.fretOffset;
      if (fret < 0 || fret > maxFret) continue;
      cells.add(`${item.sIdx}:${fret}`);
    }
    if (!cells.size) continue;
    const key = Array.from(cells).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ rootFret, cells });
  }

  return out;
}

export function buildBbKingBoxInstances({ rootPc, maxFret }) {
  return buildKingBoxInstancesFromOffsets({
    rootPc,
    maxFret,
    anchorSIdx: 1,
    offsets: BB_KING_BOX_OFFSETS,
  });
}

export function buildAlbertKingBoxInstances({ rootPc, maxFret }) {
  return buildKingBoxInstancesFromOffsets({
    rootPc,
    maxFret,
    anchorSIdx: 1,
    offsets: ALBERT_KING_BOX_OFFSETS,
  });
}

export function buildKingBoxOverlayMap({ enabled, mode, rootPc, maxFret }) {
  const map = new Map();
  if (!enabled) return map;

  const addTag = (tag, instances) => {
    for (const inst of instances) {
      for (const cell of inst.cells) {
        if (!map.has(cell)) map.set(cell, new Set());
        map.get(cell).add(tag);
      }
    }
  };

  if (mode === "bb" || mode === "both") {
    addTag("bb", buildBbKingBoxInstances({ rootPc, maxFret }));
  }
  if (mode === "albert" || mode === "both") {
    addTag("albert", buildAlbertKingBoxInstances({ rootPc, maxFret }));
  }

  return map;
}

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
export const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const NATURAL_PCS = new Set(Object.values(NATURAL_PC));
export const IONIAN_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// ============================================================================
// UTILIDADES DE NOTACIÓN Y TEORÍA BÁSICA
// ============================================================================
