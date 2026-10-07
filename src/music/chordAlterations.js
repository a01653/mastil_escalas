// ============================================================================
// ALTERACIONES DE QUINTA Y NOVENA (definición compartida)
// ----------------------------------------------------------------------------
// Módulo de capa 0: no importa de ningún otro módulo. Lo consumen el
// constructor de Acordes, Acordes cercanos, el motor de voicings, el estudio,
// la persistencia y los importadores.
//
// Modelo de estado:
// - `fifth`: "b5" | "5" | "#5". La quinta alterada SUSTITUYE a la quinta de la
//   calidad (no se añade).
// - `ninth`: "b9" | "9" | "#9". Solo tiene efecto con la extensión 9 activa
//   (`ext9`); la novena alterada SUSTITUYE a la novena natural.
// - La ausencia de los campos (configuraciones antiguas) conserva la
//   interpretación previa: quinta por defecto de la calidad y novena natural.
//
// Política de los selectores (la calidad no los bloquea):
// - Quinta: ♭5/5/♯5 mientras exista el grado 5 y no esté omitido, en cualquier
//   calidad y también con suspensión.
// - Novena: ♭9/9/♯9 mientras esté activa la extensión 9 (no en tríada). Única
//   excepción: con 3ª menor la ♯9 coincide en altura con la ♭3 y no añadiría
//   ninguna nota (el motor trabaja por clases de altura), así que esa opción
//   concreta se deshabilita con su explicación.
//
// Calidad base, teórica y mostrada:
// - `quality` del estado es la calidad BASE elegida: fija la 3ª y el tipo de 7ª
//   (Mayor/m(maj7) → 7ª mayor; Dominante/Menor/Semidisminuido → ♭7; Disminuido →
//   ♭♭7). Cambiar la quinta o la novena nunca la reescribe.
// - La calidad TEÓRICA (`resolveTheoryChordQuality`) es la que usan notas,
//   nombre, catálogo y voicings: conserva 3ª y tipo de 7ª y solo cambia de
//   etiqueta cuando la quinta lo pide (Menor + 7 + ♭5 = Semidisminuido).
// - La calidad MOSTRADA en el combo (`resolveDisplayChordQuality`) sale de las
//   notas reales (3ª, quinta y tipo de 7ª), nunca de una base que contradiga la
//   quinta actual: m7 + ♭5 → Semidisminuido; ø + 5 o ♯5 → Menor (Am7(#5));
//   3ª mayor + ♯5 → Aumentada (Caug, C7(#5), Cmaj7(#5)). Si la combinación no
//   tiene opción propia se muestra la de su 3ª y su 7ª y las alteraciones van en
//   el nombre (C7(b5), Am(maj7,b5), Adim7(♮5)).
// - "Aumentada" es solo una etiqueta: no se guarda. Elegirla guarda Mayor o
//   Dominante con ♯5 según el tipo de 7ª que se conserva.
// - La suspensión (sus2/sus4) solo sustituye la 3ª: la calidad base se guarda
//   tal cual, así que quinta, tipo de 7ª y extensiones se conservan y al quitarla
//   vuelve el acorde anterior (Cm7(b5) ⇄ C7sus4(b5)).
// ============================================================================

export const CHORD_FIFTH_VALUES = Object.freeze(["b5", "5", "#5"]);
export const CHORD_NINTH_VALUES = Object.freeze(["b9", "9", "#9"]);

export const CHORD_FIFTH_OPTIONS = Object.freeze([
  Object.freeze({ value: "b5", label: "♭5" }),
  Object.freeze({ value: "5", label: "5" }),
  Object.freeze({ value: "#5", label: "♯5" }),
]);

export const CHORD_NINTH_OPTIONS = Object.freeze([
  Object.freeze({ value: "b9", label: "♭9" }),
  Object.freeze({ value: "9", label: "9" }),
  Object.freeze({ value: "#9", label: "♯9" }),
]);

const FIFTH_SEMITONES = Object.freeze({ b5: 6, 5: 7, "#5": 8 });
const NINTH_SEMITONES = Object.freeze({ b9: 1, 9: 2, "#9": 3 });

function isSuspended(suspension) {
  return !!suspension && suspension !== "none";
}

export function isChordFifthValue(value) {
  return CHORD_FIFTH_VALUES.includes(value);
}

export function isChordNinthValue(value) {
  return CHORD_NINTH_VALUES.includes(value);
}

// Quinta implícita en la calidad (la que se usaba antes de existir el selector).
export function defaultChordFifth(quality, suspension = "none") {
  if (isSuspended(suspension)) return "5";
  if (quality === "aug") return "#5";
  return quality === "dim" || quality === "hdim" ? "b5" : "5";
}

export function defaultChordNinth() {
  return "9";
}

export function chordFifthSemitones(fifth) {
  return FIFTH_SEMITONES[fifth] ?? 7;
}

export function chordNinthSemitones(ninth) {
  return NINTH_SEMITONES[ninth] ?? 2;
}

const MINOR_THIRD_QUALITIES = new Set(["min", "minmaj7", "dim", "hdim"]);

// 3ª menor efectiva (sin suspensión): Menor, m(maj7), Disminuido y Semidisminuido.
export function chordHasMinorThird(quality, suspension = "none") {
  return !isSuspended(suspension) && MINOR_THIRD_QUALITIES.has(quality);
}

// Tipo de 7ª que aporta la calidad base cuando la 7ª está activa.
export function chordSeventhType(quality) {
  if (quality === "maj" || quality === "minmaj7") return "maj7";
  if (quality === "dim") return "bb7";
  return "b7";
}

// Calidad teórica: misma 3ª y mismo tipo de 7ª que la base; solo la quinta
// decide la etiqueta (♭5 sobre 3ª menor y ♭7 = Semidisminuido; sin 7ª = dim).
// Mayor/Dominante sin 7ª son la misma tríada mayor.
export function resolveTheoryChordQuality({ quality, suspension = "none", fifth, hasSeventh } = {}) {
  if (isSuspended(suspension)) return quality;
  const safeFifth = isChordFifthValue(fifth) ? fifth : defaultChordFifth(quality, suspension);
  if (quality === "maj" || quality === "dom") return hasSeventh ? quality : "maj";
  if (!hasSeventh) return safeFifth === "b5" ? "dim" : "min";
  const seventh = chordSeventhType(quality);
  if (seventh === "maj7") return "minmaj7";
  if (seventh === "bb7") return "dim";
  return safeFifth === "b5" ? "hdim" : "min";
}

// Calidad que muestra el combo, a partir de las notas reales: la teórica (misma
// 3ª y mismo tipo de 7ª, con la etiqueta que pide la quinta) salvo la tríada
// aumentada, que con 3ª mayor y ♯5 se muestra como Aumentada aunque lleve 7ª
// (C7(#5), Cmaj7(#5)). Con 3ª menor la ♯5 es una alteración de Menor.
export function resolveDisplayChordQuality({ quality, suspension = "none", fifth, hasSeventh } = {}) {
  if (isSuspended(suspension)) return quality;
  const safeFifth = isChordFifthValue(fifth) ? fifth : defaultChordFifth(quality, suspension);
  const theory = resolveTheoryChordQuality({ quality, suspension, fifth: safeFifth, hasSeventh });
  if ((theory === "maj" || theory === "dom") && safeFifth === "#5") return "aug";
  return theory;
}

// Calidad que se GUARDA al elegir "Aumentada": la de 3ª mayor que conserva el
// tipo de 7ª actual (7ª mayor → Mayor; ♭7 → Dominante). Con la ♭♭7 de Disminuido
// sonando la opción no está disponible (ver chordAugmentedOptionState); sin 7ª,
// Disminuido guarda Dominante (si después se activa la 7, suena ♭7).
export function storedQualityForAugmented(quality) {
  return chordSeventhType(quality) === "maj7" ? "maj" : "dom";
}

// Disponibilidad de la opción "Aumentada" del combo de Calidad. Aumentada conserva
// la séptima que suena, nunca la cambia por otra:
// - Disminuido con 7ª: conservar la ♭♭7 daría 1–3–♯5–♭♭7, un acorde válido que el
//   constructor aún no representa (su ♭♭7 va ligada a la 3ª menor de Disminuido).
//   La opción se deshabilita con la explicación en vez de sustituir la ♭♭7 por ♭7.
// - "Omitir 5" activo: no hay quinta que aumentar.
export function chordAugmentedOptionState({ quality, suspension = "none", hasSeventh = false, omit = "none" } = {}) {
  if (omit === "5") {
    return {
      enabled: false,
      reason: "omit5",
      label: "Aumentada (con Omitir 5 no hay quinta)",
      hint: "«Omitir 5» está activo: no hay quinta que aumentar. Desactiva la omisión para elegir Aumentada.",
    };
  }
  if (!isSuspended(suspension) && quality === "dim" && hasSeventh) {
    return {
      enabled: false,
      reason: "bb7",
      label: "Aumentada (el constructor no admite ♭♭7)",
      hint: "Limitación del constructor: todavía no combina 3ª mayor con la ♭♭7 de Disminuido (1–3–♯5–♭♭7), así que Aumentada no se aplica para no cambiar la séptima. Desactiva la 7 para obtener la tríada aumentada, o elige Dominante (7) o Mayor si quieres ♭7 o 7ª mayor.",
    };
  }
  return {
    enabled: true,
    reason: null,
    label: "Aumentada",
    hint: "3ª mayor y ♯5, conservando el tipo de séptima (Caug, C7(#5), Cmaj7(#5)).",
  };
}

// Suspensión (sus2/sus4): sustituye la 3ª por la 2ª o la 4ª y conserva la calidad
// base, la quinta, el tipo de séptima y las extensiones (Cm7(b5) + sus4 =
// C7sus4(b5); al quitarla vuelve Cm7(b5)). Disminuido con 7ª pediría
// 1–4–♭5–♭♭7, que el constructor aún no representa ni nombra: la suspensión se
// deshabilita con su explicación en vez de cambiar la séptima. Con "Omitir 3" no
// hay tercera que sustituir.
export function chordSuspensionOptionState({ quality, hasSeventh = false, omit = "none" } = {}) {
  if (omit === "3") {
    return {
      enabled: false,
      reason: "omit3",
      labelSuffix: "(con Omitir 3 no hay tercera)",
      hint: "«Omitir 3» está activo: no hay tercera que sustituir. Desactiva la omisión para elegir sus2 o sus4.",
    };
  }
  if (quality === "dim" && hasSeventh) {
    return {
      enabled: false,
      reason: "bb7",
      labelSuffix: "(el constructor no admite ♭♭7)",
      hint: "Limitación del constructor: todavía no representa Disminuido suspendido con ♭♭7 (1–4–♭5–♭♭7, 1–2–♭5–♭♭7), así que sus2 y sus4 no se aplican para no cambiar la séptima. Desactiva la 7 para suspender la tríada disminuida (sus4(♭5)); al quitar la suspensión vuelve el acorde disminuido.",
    };
  }
  return {
    enabled: true,
    reason: null,
    labelSuffix: "",
    hint: "Sustituye la 3ª por la 2ª o la 4ª y conserva quinta, séptima y extensiones.",
  };
}

// La 7 no se puede activar con Disminuido suspendido: sería ♭♭7 (1–4–♭5–♭♭7),
// que el constructor aún no representa, y no se activa otra séptima en su lugar.
export function chordSeventhBlockedBySuspension({ quality, suspension = "none" } = {}) {
  return isSuspended(suspension) && quality === "dim";
}

export const CHORD_SUSPENDED_DIM_SEVENTH_INFO =
  "Limitación del constructor: con Disminuido suspendido la 7 sería ♭♭7 (1–4–♭5–♭♭7), que todavía no representa, y no se activa otra séptima en su lugar. Quita la suspensión para activar la 7 (dim7).";

// Quintas que ofrece el selector: las tres mientras exista el grado 5 (la
// omisión se resuelve en el estado del selector). La calidad no las limita.
export function allowedChordFifths() {
  return ["b5", "5", "#5"];
}

// Novenas que ofrece el selector: las tres mientras la 9 esté activa (no en
// tríada); con 3ª menor la ♯9 coincidiría con la ♭3 y no se ofrece.
export function allowedChordNinths({ quality, suspension = "none", structure, ext9 } = {}) {
  if (!ext9 || structure === "triad") return ["9"];
  if (chordHasMinorThird(quality, suspension)) return ["b9", "9"];
  return ["b9", "9", "#9"];
}

function chordFifthSelectorHint({ omit = "none" }) {
  if (omit === "5") return "Omitir 5 está activo: no hay quinta que alterar.";
  return "♭5 o ♯5 sustituyen a la 5ª. Si la combinación tiene nombre propio, la calidad se ajusta (m7 + ♭5 = m7(♭5)).";
}

function chordNinthSelectorHint({ quality, suspension = "none", structure, ext9 }) {
  if (structure === "triad") return "La novena no está disponible en tríada.";
  if (!ext9) return "Activa la extensión 9 para elegir su variante.";
  if (chordHasMinorThird(quality, suspension)) return "♭9 o 9. La ♯9 coincide en altura con la ♭3 del acorde y no añadiría ninguna nota.";
  if (suspension === "sus2") return "♭9 o ♯9 sustituyen a la novena; la 9 natural coincide con la 2 de sus2.";
  return "♭9 o ♯9 sustituyen a la novena natural.";
}

// Estado del selector de quinta: opciones habilitadas y si el control es editable.
// Con "Omitir 5" no hay quinta que alterar: el control se deshabilita.
export function chordFifthSelectorState({ quality, suspension = "none", omit = "none" } = {}) {
  const allowed = omit === "5" ? [defaultChordFifth(quality, suspension)] : allowedChordFifths();
  return {
    allowed,
    enabled: allowed.length > 1,
    hint: chordFifthSelectorHint({ omit }),
    options: CHORD_FIFTH_OPTIONS.map((option) => ({ ...option, disabled: !allowed.includes(option.value) })),
  };
}

export function chordNinthSelectorState(params = {}) {
  const allowed = allowedChordNinths(params);
  return {
    allowed,
    enabled: allowed.length > 1,
    hint: chordNinthSelectorHint(params),
    options: CHORD_NINTH_OPTIONS.map((option) => ({ ...option, disabled: !allowed.includes(option.value) })),
  };
}

// Normaliza las alteraciones contra el estado visible. Una alteración que el
// estado no admite vuelve al valor por defecto (nunca se reinterpreta como otra).
export function normalizeChordAlterations({
  quality,
  suspension = "none",
  structure,
  ext7,
  ext9,
  omit = "none",
  fifth,
  ninth,
} = {}) {
  const fifthDefault = defaultChordFifth(quality, suspension);
  const fifthAllowed = omit === "5" ? [fifthDefault] : allowedChordFifths({ quality, suspension });
  const nextFifth = isChordFifthValue(fifth) && fifthAllowed.includes(fifth) ? fifth : fifthDefault;

  const ninthAllowed = allowedChordNinths({ quality, suspension, structure, ext7, ext9 });
  const nextNinth = isChordNinthValue(ninth) && ninthAllowed.includes(ninth) ? ninth : defaultChordNinth();

  return { fifth: nextFifth, ninth: nextNinth };
}

export function isAlteredChordFifth(fifth, quality, suspension = "none") {
  return isChordFifthValue(fifth) && fifth !== defaultChordFifth(quality, suspension);
}

export function isAlteredChordNinth(ninth) {
  return isChordNinthValue(ninth) && ninth !== "9";
}
