import * as AppStaticData from "./appStaticData.js";
const {
  NOTES_SHARP,
  NOTES_FLAT,
  SCALE_PRESETS,
  SCALE_NAME_ALIASES,
  SCALE_INTERVAL_LABEL_OVERRIDES,
  TONALITY_CANDIDATE_SCALE_NAMES,
  MANUAL_SCALE_TETRAD_PRESETS,
  MANUAL_SCALE_HARMONY_PRESETS,
  STRINGS,
  OPEN_MIDI,
  LETTERS,
  NATURAL_PC,
  IONIAN_INTERVALS,
} = AppStaticData;

import {
  CHORD_DETECT_FORMULAS as CHORD_DETECT_FORMULAS_PURE,
  detectFormulaRole as detectFormulaRolePure,
} from "./chordDetectionEngine.js";

import {
  chordAugmentedOptionState,
  chordSuspensionOptionState,
  chordFifthSemitones,
  chordNinthSemitones,
  isAlteredChordFifth,
  isAlteredChordNinth,
  normalizeChordAlterations,
  resolveDisplayChordQuality,
  resolveTheoryChordQuality,
} from "./chordAlterations.js";

import * as AppVoicingStudyCore from "./appVoicingStudyCore.js";

export function mod12(n) {
  const x = n % 12;
  return x < 0 ? x + 12 : x;
}

export function pcToName(pc, preferSharps) {
  const list = preferSharps ? NOTES_SHARP : NOTES_FLAT;
  return list[mod12(pc)];
}

export function pcToDualName(pc) {
  const p = mod12(pc);
  const sharp = NOTES_SHARP[p];
  const flat = NOTES_FLAT[p];
  return sharp === flat ? sharp : `${sharp}/${flat}`;
}

// ------------------------
// Acordes UI: selector de Tono por letra + b/# (sin C#/Db en el combo)
// - El combo muestra solo C D E F G A B.
// - Los botones b/# desplazan 1 semitono y fijan la “ortografía” (C# vs Db).
// ------------------------
export const BLACK_PC_TO_LETTER_SHARP = { 1: "C", 3: "D", 6: "F", 8: "G", 10: "A" };
export const BLACK_PC_TO_LETTER_FLAT = { 1: "D", 3: "E", 6: "G", 8: "A", 10: "B" };

export function chordUiLetterFromPc(pc, preferSharps) {
  const p = mod12(pc);
  for (const [l, v] of Object.entries(NATURAL_PC)) {
    if (v === p) return l;
  }
  return preferSharps ? (BLACK_PC_TO_LETTER_SHARP[p] || "C") : (BLACK_PC_TO_LETTER_FLAT[p] || "D");
}

export function pitchAt(sIdx, fret) {
  return OPEN_MIDI[sIdx] + fret;
}

export function noteNameToPc(token) {
  const t = token.trim().toUpperCase();
  if (!t) return null;

  const letter = t[0];
  if (!Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) return null;

  let pc = NATURAL_PC[letter];
  const accidental = t.slice(1);

  if (accidental === "#") pc += 1;
  else if (accidental === "B") pc -= 1;
  else if (accidental === "##") pc += 2;
  else if (accidental === "BB") pc -= 2;
  else if (accidental) return null;

  return mod12(pc);
}

export function degreeTokenToSemitones(token) {
  // grados vs escala mayor: 1=0,2=2,3=4,4=5,5=7,6=9,7=11
  // IMPORTANTE: aquí SOLO aceptamos grados 1–7 (para no confundir con semitonos "10" etc.)
  const t = token.trim();
  if (!t) return null;
  const m = t.match(/^([b#]{0,2})([0-9]+)$/i);
  if (!m) return null;

  const acc = (m[1] || "").toLowerCase();
  const degRaw = parseInt(m[2], 10);
  if (!Number.isFinite(degRaw) || degRaw < 1 || degRaw > 7) return null;

  const deg = degRaw;
  const majorDegreeToSemi = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
  let semi = majorDegreeToSemi[deg];

  for (const ch of acc) {
    if (ch === "b") semi -= 1;
    if (ch === "#") semi += 1;
  }

  return mod12(semi);
}

export function intervalToDegreeToken(semi) {
  // cromático relativo a la raíz
  const map = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"];
  return map[mod12(semi)];
}

export function intervalToSimpleChordDegreeToken(semi) {
  const map = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];
  return map[mod12(semi)];
}

// Como intervalToSimpleChordDegreeToken pero respeta el spelling preferido para el enarmónico
// del semitono 8: "b6" si preferSharps=false, "#5" si preferSharps=true.
export function intervalToChordDegreeTokenWithSpelling(semi, preferSharps = false) {
  const b = mod12(semi);
  if (b === 8) return preferSharps ? "#5" : "b6";
  return intervalToSimpleChordDegreeToken(b);
}

// ============================================================================
// MOTOR DE ACORDES Y NOMENCLATURA
// ============================================================================

// ------------------------
// Acordes
// ------------------------

// --------------------------------------------------------------------------
// BLOQUE: DATASET / JSON DE DIGITACIONES
// --------------------------------------------------------------------------

// Dataset de digitaciones (voicings) para NO inventar acordes:
// https://github.com/szaza/guitar-chords-db-json (MIT)
// En runtime usamos alias de carpeta sin "#" para que preview y producción sirvan bien los JSON.

// Sufijo INTERNO del catálogo JSON (chords-db). No es el nombre visible: el
// nombre canónico lo construye chordDisplayNameFromUI.
export function chordSuffixFromUI(params) {
  const { quality, suspension, structure, ext7, ext6, ext9, ext11, ext13 } = normalizeChordUiSpec(params);
  const sus = suspension || "none";
  const isSus = sus !== "none";
  const q = quality;
  const isMajLike = q === "maj" || q === "dom";
  const isMin = q === "min";
  const isMinMaj7 = q === "minmaj7";
  const isMinorFamily = isMin || isMinMaj7;

  // Con suspensión la base solo aporta el tipo de 7ª: ø suspendido suena como un
  // dominante sus (♭7) y Disminuido suspendido solo existe sin 7ª (sus sin 7ª).
  const q2 = isSus && q === "hdim" ? "dom" : isSus && q === "dim" ? "maj" : q;
  // Con suspensión la 3ª desaparece: la calidad solo decide el tipo de 7ª.
  // Menor + sus + b7 suena igual que dominante sus (Re–Sol–La–Do = D7sus4).
  const susSeventhSuffix = () => {
    const majorSeventh = q2 === "maj" || q2 === "minmaj7";
    return `${majorSeventh ? "maj7" : "7"}${sus === "sus4" ? "sus4" : "sus2"}`;
  };

  // TRIADAS
  if (structure === "triad") {
    if (isSus) {
      if (ext7) return susSeventhSuffix();
      if (ext6) return sus === "sus4" ? "sus4add6" : "sus2add6";
      return sus === "sus4" ? "sus4" : "sus2";
    }

    if (ext6 && !ext7) return q2 === "dim" ? "dim(add6)" : isMinorFamily ? "m6" : "6";
    if (isMajLike) return "major";
    if (isMinorFamily) return "minor";
    return "dim";
  }

  // CUATRIADAS
  if (structure === "tetrad") {
    const addCount = (ext6 ? 1 : 0) + (ext9 ? 1 : 0) + (ext11 ? 1 : 0) + (ext13 ? 1 : 0);

    // Sin 7ª ni adds: el resultado es una triada de 3 notas
    if (!ext7 && addCount === 0) {
      if (isSus) return sus === "sus4" ? "sus4" : "sus2";
      if (isMajLike) return "major";
      if (isMinorFamily) return "minor";
      return "dim";
    }

    // add6/add9/add11/add13 (sin 7ª)
    if (!ext7 && addCount === 1) {
      if (ext6) return q2 === "dim" ? "dim(add6)" : isMinorFamily ? "m6" : "6";
      if (q2 === "dim") {
        if (ext13) return "dim(add13)";
        if (ext11) return "dim(add11)";
        if (ext9) return "dim(add9)";
      }
      if (ext13) return isMinorFamily ? "m(add13)" : "add13";
      if (ext11) return isMinorFamily ? "m(add11)" : "add11";
      if (ext9) return isMinorFamily ? "m(add9)" : "add9";
    }

    if (isSus) return susSeventhSuffix();

    if (q2 === "maj") return "maj7";
    if (q2 === "dom") return "7";
    if (q2 === "min") return "m7";
    if (q2 === "minmaj7") {
      if (!ext7) return "minor";
      if (ext13) return "m(maj7,13)";
      if (ext11) return "m(maj7,add11)";
      if (ext9) return "m(maj9)";
      return "m(maj7)";
    }
    if (q2 === "hdim") return "m7b5";
    return "dim7";
  }

  // ACORDES (con extensiones)
  if (q2 === "hdim") return "m7b5";

  if (isSus) {
    if (ext7) {
      const seventh = susSeventhSuffix();
      // 9sus4 existe como fichero propio del catálogo (1, 4, 5, b7, 9).
      if (seventh === "7sus4" && ext9 && !ext11 && !ext13 && !ext6) return "9sus4";
      return seventh;
    }
    if (ext6 && !ext7 && !ext9 && !ext11 && !ext13) return isMinorFamily ? "m6" : "6";
    return sus === "sus4" ? "sus4" : "sus2";
  }

  // add6 puro (sin 7/9/11/13)
  if (ext6 && !ext7 && !ext9 && !ext11 && !ext13) return q2 === "dim" ? "dim(add6)" : isMinorFamily ? "m6" : "6";

  if (q2 === "dim") {
    if (ext7) return "dim7";
    if (ext13) return "dim(add13)";
    if (ext11) return "dim(add11)";
    if (ext9) return "dim(add9)";
    return "dim";
  }

  // Dominantes
  if (q2 === "dom") {
    // Sin 7ª, un “dominante” deja de ser dominante: lo nombramos como mayor/add*.
    if (!ext7) {
      if (ext13) return "add13";
      if (ext11) return "add11";
      if (ext9) return "add9";
      if (ext6) return "6";
      return "major";
    }
    if (ext13) return "13";
    if (ext11) return "11";
    if (ext9) return "9";
    return "7";
  }

  // Maj / min
  if (q2 === "maj") {
    if (ext13) return ext7 ? "maj13" : "add13";
    if (ext11) return ext7 ? "maj11" : "add11";
    if (ext9) return ext7 ? "maj9" : "add9";
    if (ext7) return "maj7";
    if (ext6) return "6";
    return "major";
  }

  if (q2 === "min") {
    if (ext13) return ext7 ? "m13" : "m(add13)";
    if (ext11) return ext7 ? "m11" : "m(add11)";
    if (ext9) return ext7 ? "m9" : "m(add9)";
    if (ext7) return "m7";
    if (ext6) return "m6";
    return "minor";
  }

  if (q2 === "minmaj7") {
    if (ext13) return ext7 ? "m(maj7,13)" : "m(add13)";
    if (ext11) return ext7 ? "m(maj7,add11)" : "m(add11)";
    if (ext9) return ext7 ? "m(maj9)" : "m(add9)";
    if (ext7) return "m(maj7)";
    if (ext6) return "m6";
    return "minor";
  }

  return "major";
}

// Nombre legible del acorde a partir de la selección actual (sin inventar digitaciones).
export const CHORD_SUFFIX_DISPLAY = {
  major: "",
  minor: "m",
  dim: "dim",
  maj7: "maj7",
  "7": "7",
  m7: "m7",
  m7b5: "m7(b5)",
  dim7: "dim7",

  // 6 / add6 (estándar)
  "6": "6",
  m6: "m6",

  // sus
  sus2: "sus2",
  sus4: "sus4",
  "7sus2": "7sus2",
  "7sus4": "7sus4",
  maj7sus2: "maj7sus2",
  maj7sus4: "maj7sus4",
  m7sus2: "m7sus2",
  m7sus4: "m7sus4",
  sus2add6: "sus2(add6)",
  sus4add6: "sus4(add6)",

  // add*
  add9: "add9",
  add11: "add11",
  add13: "add13",
  "m(add9)": "m(add9)",
  "m(add11)": "m(add11)",
  "m(add13)": "m(add13)",
  sus2add9: "sus2add9",
  sus4add9: "sus4add9",
  sus2add11: "sus2add11",
  sus4add11: "sus4add11",
  sus2add13: "sus2add13",
  sus4add13: "sus4add13",

  maj9: "maj9",
  m9: "m9",
  "9": "9",
  "11": "11",
  "13": "13",
  maj11: "maj11",
  m11: "m11",
  maj13: "maj13",
  m13: "m13",
};

function appendOmitToDisplaySuffix(displaySuffix, omit) {
  if (omit === "none") return String(displaySuffix || "");
  const suffix = String(displaySuffix || "");
  if (!suffix) return `(no${omit})`;
  if (suffix.endsWith(")")) return `${suffix.slice(0, -1)},no${omit})`;
  return `${suffix}(no${omit})`;
}

export function chordEffectiveStructureForName(structure, ext7, ext6, suspension) {
  // Si el usuario marca 7 en “Triada”, en la práctica es una cuatriada.
  // Si marca 6 en “Triada”, solo lo tratamos como "6" (cuatriada) cuando NO hay suspensión.
  // Ej: Csus2 + 6 debe mostrarse como Csus2(add6), no como C6.
  const sus = suspension || "none";
  const isSus = sus !== "none";

  if (structure === "triad" && ext7) return "tetrad";
  if (structure === "triad" && ext6 && !isSus) return "tetrad";
  return structure;
}

// Nombre del acorde con la lógica histórica (calidades sin alteración). Se
// conserva intacta para no cambiar nombres ya publicados; las ramas nuevas
// (suspendidos, ø, dim7 con 9 y alteraciones) se resuelven en
// chordDisplaySuffixFromSpec antes o después de llamarla.
function legacyChordDisplaySuffix({ quality, suspension = "none", structure, ext7, ext6, ext9, ext11, ext13, omit = "none" }) {
  const effStructure = chordEffectiveStructureForName(structure, !!ext7, !!ext6, suspension);
  const omitSuffix = omit !== "none" ? `(no${omit})` : "";

  if (AppVoicingStudyCore.isMultiAddChordSelection({ ext7: !!ext7, ext6: !!ext6, ext9: !!ext9, ext11: !!ext11, ext13: !!ext13 })) {
    return `${AppVoicingStudyCore.buildMultiAddDisplaySuffix({ quality, suspension, ext6: !!ext6, ext9: !!ext9, ext11: !!ext11, ext13: !!ext13 })}${omitSuffix}`;
  }

  let suf = chordSuffixFromUI({
    quality,
    suspension,
    structure: effStructure,
    ext7: !!ext7,
    ext6: !!ext6,
    ext9: !!ext9,
    ext11: !!ext11,
    ext13: !!ext13,
  });

  if (effStructure === "triad" && quality === "dom" && !ext7) suf = "major";

  let disp = "";
  if (suf && CHORD_SUFFIX_DISPLAY[suf] != null) disp = CHORD_SUFFIX_DISPLAY[suf];
  else if (typeof suf === "string" && suf.startsWith("m(")) disp = suf;
  else if (typeof suf === "string") disp = suf;

  if (quality === "minmaj7") {
    return appendOmitToDisplaySuffix(disp, omit);
  }

  const base = disp;

  // Con 7ª activa: usar notación add explícita cuando procede
  if (ext7) {
    const addParts = [];
    if (structure === "tetrad") {
      // Cuatriada: todas las extensiones sobre la 7ª son adds explícitos
      if (ext9) addParts.push("9");
      if (ext11) addParts.push("11");
      if (ext13) addParts.push("13");
      if (ext6) addParts.push("6");
    } else {
      // Acorde: solo cuando la extensión implicaría intermedias ausentes
      if (ext13 && !ext9 && !ext11) addParts.push("13");
      else if (ext11 && !ext9) addParts.push("11");
      // ext9 solo: "9" es notación compacta estándar (X7+9)
    }
    if (addParts.length > 0) {
      const omitPart = omit !== "none" ? `,no${omit}` : "";
      if (structure === "tetrad") {
        return `${base}(add${addParts.join(",")}${omitPart})`;
      }
      // Acorde: recalcular base sin extensiones superiores para obtener "maj7"/"7"/"m7"
      const rawBaseSuf = chordSuffixFromUI({
        quality, suspension, structure: effStructure,
        ext7: true, ext6: false, ext9: false, ext11: false, ext13: false,
      });
      let cleanDisp = "";
      if (rawBaseSuf && CHORD_SUFFIX_DISPLAY[rawBaseSuf] != null) cleanDisp = CHORD_SUFFIX_DISPLAY[rawBaseSuf];
      else if (typeof rawBaseSuf === "string" && rawBaseSuf.startsWith("m(")) cleanDisp = rawBaseSuf;
      else if (typeof rawBaseSuf === "string") cleanDisp = rawBaseSuf;
      return `${cleanDisp}(add${addParts.join(",")}${omitPart})`;
    }
  }
  return `${base}${omitSuffix}`;
}

// [9, 11] → ["add9,11"]; vacío → []
function formatChordAddGroup(numbers) {
  const list = (Array.isArray(numbers) ? numbers : []).filter(Boolean);
  return list.length ? [`add${list.join(",")}`] : [];
}

function formatChordDescriptorGroup(descriptors) {
  const list = (Array.isArray(descriptors) ? descriptors : []).filter(Boolean);
  return list.length ? `(${list.join(",")})` : "";
}

// Suspendidos: la 2ª/4ª sustituye a la 3ª y la calidad solo decide la 7ª
// (mayor en Mayor/m(maj7), menor en el resto): Menor + sus4 + 7 = 7sus4.
// La 9 en sus2 y la 11 en sus4 coinciden en clase de altura con la nota
// suspendida (limitación de representación del motor), por eso no se repiten.
function suspendedChordDisplaySuffix(spec) {
  const { quality, suspension, structure, ext7, ext6, ext9, ext11, ext13, omit, ninth } = spec;
  const sus = suspension === "sus2" ? "sus2" : "sus4";
  const hasNinth = !!ext9 && sus !== "sus2";
  const hasEleventh = !!ext11 && sus !== "sus4";
  const omitDescriptors = omit !== "none" ? [`no${omit}`] : [];
  const ninthAltered = hasNinth && isAlteredChordNinth(ninth);

  if (!ext7) {
    const adds = [ext6 && "6", hasNinth && "9", hasEleventh && "11", ext13 && "13"].filter(Boolean);
    return `${sus}${formatChordDescriptorGroup([...formatChordAddGroup(adds), ...omitDescriptors])}`;
  }

  const seventhBase = seventhOffsetForQuality(quality) === 11 ? "maj" : "";
  const effStructure = chordEffectiveStructureForName(structure, !!ext7, !!ext6, suspension);
  if (effStructure === "tetrad") {
    // Cuatriada: las tensiones sobre la 7ª se escriben como add explícitos.
    const adds = [hasNinth && !ninthAltered && "9", hasEleventh && "11", ext13 && "13", ext6 && "6"].filter(Boolean);
    const descriptors = [ninthAltered && ninth, ...formatChordAddGroup(adds), ...omitDescriptors];
    return `${seventhBase}7${sus}${formatChordDescriptorGroup(descriptors)}`;
  }

  // Acorde: el número sube con la 9 (9/11/13); sin 9, 11 y 13 son add.
  let number = 7;
  let adds = [];
  if (hasNinth) {
    number = ext13 ? 13 : hasEleventh ? 11 : 9;
  } else {
    adds = [hasEleventh && "11", ext13 && "13"].filter(Boolean);
  }
  // Igual que el resto de calidades en "Acorde", la 6 junto a la 7ª no se nombra
  // (comportamiento previo, pendiente de revisión aparte).
  const ninthDescriptors = [];
  if (ninthAltered) {
    if (number === 9) number = 7;
    ninthDescriptors.push(ninth);
  }
  const descriptors = [...ninthDescriptors, ...formatChordAddGroup(adds), ...omitDescriptors];
  return `${seventhBase}${number}${sus}${formatChordDescriptorGroup(descriptors)}`;
}

// Semidisminuido: m7(b5); con 9 natural → m9(b5) (9+11 → m11(b5), 9+13 → m13(b5)).
// La b5 forma parte del nombre de la calidad y comparte paréntesis con adds/omisiones.
function halfDiminishedChordDisplaySuffix(spec) {
  const { structure, ext7, ext6, ext9, ext11, ext13, omit } = spec;
  const omitDescriptors = omit !== "none" ? [`no${omit}`] : [];
  const effStructure = chordEffectiveStructureForName(structure, !!ext7, !!ext6, spec.suspension);
  let number = 7;
  let adds;
  if (effStructure === "tetrad") {
    adds = [ext9 && "9", ext11 && "11", ext13 && "13", ext6 && "6"].filter(Boolean);
  } else if (ext9) {
    number = ext13 ? 13 : ext11 ? 11 : 9;
    adds = [];
  } else {
    // Como en el resto de calidades en "Acorde", la 6 junto a la 7ª no se nombra.
    adds = [ext11 && "11", ext13 && "13"].filter(Boolean);
  }
  return `m${number}${formatChordDescriptorGroup(["b5", ...formatChordAddGroup(adds), ...omitDescriptors])}`;
}

// Disminuido completo con tensiones en "Acorde": dim7(add9), dim7(add9,11), dim7(add11).
function diminishedSeventhChordDisplaySuffix(spec) {
  const { ext9, ext11, omit } = spec;
  const adds = [ext9 && "9", ext11 && "11"].filter(Boolean);
  const omitDescriptors = omit !== "none" ? [`no${omit}`] : [];
  return `dim7${formatChordDescriptorGroup([...formatChordAddGroup(adds), ...omitDescriptors])}`;
}

// Grupo final de descriptores "(…)" de un sufijo: "m7(b5,add9)" → head "m7",
// tokens ["b5","add9"]. Un sufijo de adds sin paréntesis ("add9,11") se trata
// como grupo para poder alterarlo.
function splitChordDescriptorGroup(suffix) {
  const text = String(suffix || "");
  if (/^add/.test(text)) return { head: "", tokens: text.split(",") };
  const open = text.lastIndexOf("(");
  if (!text.endsWith(")") || open < 0) return { head: text, tokens: [] };
  return { head: text.slice(0, open), tokens: text.slice(open + 1, -1).split(",").filter(Boolean) };
}

function joinChordDescriptorGroup(head, tokens) {
  return tokens.length ? `${head}(${tokens.join(",")})` : head;
}

// Quita la 9 del grupo add: "add9,11" → "add11"; "add9" solo → desaparece.
function removeAddNinthToken(tokens) {
  const idx = tokens.indexOf("add9");
  if (idx < 0) return tokens;
  const next = tokens[idx + 1];
  const copy = [...tokens];
  if (next && /^\d+$/.test(next)) copy.splice(idx, 2, `add${next}`);
  else copy.splice(idx, 1);
  return copy;
}

// Alteraciones de quinta y novena sobre el nombre natural de cualquier calidad.
// - La novena alterada sustituye a la natural: "9"/"m9"/"maj9"/"9sus4" bajan a 7
//   ("7(b9)", "m7(b9)"); 11/13 se mantienen ("13(b9)", "m11(b9)"); un "add9" con
//   7ª pasa a descriptor ("7sus4(b9)", "dim7(b9)") y sin 7ª queda "addb9".
// - La quinta alterada respecto de la calidad teórica va como descriptor ("7(#5)",
//   "m7(#5)", "m(maj7,b5)", "dim7(♮5)"); la tríada mayor con ♯5 es "aug".
// - Orden: quinta antes que novena; en "m(maj7…)" detrás de maj7 y en "m7(b5…)"
//   detrás de la ♭5 propia del semidisminuido.
function applyChordAlterationsToSuffix(baseSuffix, spec) {
  const { quality, suspension, fifth, ninth } = spec;
  const fifthAltered = isAlteredChordFifth(fifth, quality, suspension);
  const fifthToken = fifthAltered ? (fifth === "5" ? "♮5" : fifth) : null;
  // Solo si la novena suena (en cuatriada sin hueco libre la 9 no entra).
  const ninthToken = spec.ext9 && isAlteredChordNinth(ninth) ? ninth : null;
  if (!fifthToken && !ninthToken) return String(baseSuffix || "");

  let { head, tokens } = splitChordDescriptorGroup(baseSuffix);
  const descriptors = [];
  if (fifthToken) descriptors.push(fifthToken);

  if (ninthToken) {
    if (/^(m|maj)?9(?=sus|$)/.test(head)) {
      head = head.replace(/^(m|maj)?9/, "$17");
      descriptors.push(ninthToken);
    } else if (head === "m" && tokens[0] === "maj9") {
      tokens = ["maj7", ...tokens.slice(1)];
      descriptors.push(ninthToken);
    } else if (tokens.includes("add9")) {
      if (spec.ext7) {
        tokens = removeAddNinthToken(tokens);
        descriptors.push(ninthToken);
      } else {
        tokens = tokens.map((token) => (token === "add9" ? `add${ninthToken}` : token));
      }
    } else {
      descriptors.push(ninthToken);
    }
  }

  // Tríada mayor con ♯5: "aug" (con sus adds: "aug(add9)").
  if (fifthToken === "#5" && quality === "maj" && !spec.ext7 && head === "") {
    head = "aug";
    descriptors.splice(descriptors.indexOf("#5"), 1);
  }

  let insertAt = 0;
  if (head === "m" && /^maj/.test(tokens[0] || "")) insertAt = 1;
  else if (quality === "hdim" && tokens[0] === "b5") insertAt = 1;
  const nextTokens = [...tokens];
  nextTokens.splice(insertAt, 0, ...descriptors);
  return joinChordDescriptorGroup(head, nextTokens);
}

// Sufijo visible del acorde a partir de un estado ya normalizado.
// Las extensiones se leen de los grados realmente presentes en la definición
// común (no de los checkboxes): una 9 que coincide con la 2 de sus2 o una add
// que no cabe en la cuatriada no aparecen en el nombre porque no suenan.
export function chordDisplaySuffixFromSpec(spec) {
  // Con la omisión aplicada: en cuatriada "Omitir" libera un slot para la add.
  // La omisión solo retira 1/3/5, así que no oculta ninguna extensión.
  const definition = buildChordToneDefinition(spec);
  const present = new Set(definition.roles);
  const effective = {
    ...spec,
    ext7: present.has("seventh"),
    ext6: present.has("sixth"),
    ext9: present.has("ninth"),
    ext11: present.has("eleventh"),
    ext13: present.has("thirteenth"),
  };
  const { quality, suspension, structure, ext7, ext9, ext11 } = effective;
  let natural;
  if (suspension && suspension !== "none") natural = suspendedChordDisplaySuffix({ ...effective, ninth: "9" });
  else if (quality === "hdim" && ext7) natural = halfDiminishedChordDisplaySuffix(effective);
  else if (quality === "dim" && ext7 && structure === "chord" && (ext9 || ext11)) natural = diminishedSeventhChordDisplaySuffix(effective);
  else natural = legacyChordDisplaySuffix(effective);
  return applyChordAlterationsToSuffix(natural, effective);
}

export function chordDisplayNameFromUI(params) {
  const spec = normalizeChordUiSpec(params);
  const rootName = pcToName(mod12(params?.rootPc ?? 0), !!params?.preferSharps);
  return `${rootName}${chordDisplaySuffixFromSpec(spec)}`;
}

// Sufijo visible sin omisiones (armonización, estudio por grados).
export function chordDisplaySuffixOnly(params) {
  return chordDisplaySuffixFromSpec(normalizeChordUiSpec({ ...params, omit: "none" }));
}

export function chordCanUseJsonCatalog(params) {
  const spec = normalizeChordUiSpec(params);
  const { quality, structure, ext7, ext6, ext9, ext11, ext13 } = spec;
  if (structure !== "chord") return false;
  if (quality === "minmaj7") return false;
  // El catálogo JSON no garantiza fórmulas alteradas: se usa el generador exacto.
  if (isAlteredChordFifth(spec.fifth, quality, spec.suspension) || isAlteredChordNinth(spec.ninth)) return false;
  const addCount = (ext6 ? 1 : 0) + (ext9 ? 1 : 0) + (ext11 ? 1 : 0) + (ext13 ? 1 : 0);
  const singleAdd = !ext7 && addCount === 1;
  const multiAdd = !ext7 && addCount >= 2;
  if (singleAdd || multiAdd) return false;
  return true;
}

export function detectSupportedTriadQuality(thirdOffset, fifthOffset) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  if (t === 4 && f === 7) return "maj";
  if (t === 3 && f === 7) return "min";
  if (t === 3 && f === 6) return "dim";
  return null;
}

export function detectSupportedTetradQuality(thirdOffset, fifthOffset, seventhOffset) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  const s = mod12(seventhOffset);
  if (t === 4 && f === 7 && s === 11) return "maj";
  if (t === 4 && f === 7 && s === 10) return "dom";
  if (t === 3 && f === 7 && s === 10) return "min";
  if (t === 3 && f === 6 && s === 10) return "hdim";
  if (t === 3 && f === 6 && s === 9) return "dim";
  return null;
}

export function buildScaleDegreeChord({ scaleIntervals, degreeIndex, withSeventh = false }) {
  const n = scaleIntervals.length;
  if (n < (withSeventh ? 4 : 3)) return null;

  const rootOffset = mod12(scaleIntervals[degreeIndex % n]);
  const thirdOffset = mod12(scaleIntervals[(degreeIndex + 2) % n] - rootOffset);
  const fifthOffset = mod12(scaleIntervals[(degreeIndex + 4) % n] - rootOffset);

  if (withSeventh) {
    const seventhOffset = mod12(scaleIntervals[(degreeIndex + 6) % n] - rootOffset);
    const quality = detectSupportedTetradQuality(thirdOffset, fifthOffset, seventhOffset);
    if (!quality) return null;
    return {
      rootOffset,
      quality,
      suspension: "none",
      structure: "tetrad",
      inversion: "all",
      form: "open",
      ext7: true,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
    };
  }

  const quality = detectSupportedTriadQuality(thirdOffset, fifthOffset);
  if (!quality) return null;
  return {
    rootOffset,
    quality,
    suspension: "none",
    structure: "triad",
    inversion: "all",
    form: "open",
    ext7: false,
    ext6: false,
    ext9: false,
    ext11: false,
    ext13: false,
  };
}

export function isMinorHarmonyScaleName(scaleName) {
  const n = normalizeScaleName(scaleName);
  return [
    "Menor natural",
    "Menor armónica",
    "Menor melódica (asc)",
    "Eólica (Aeolian)",
  ].includes(n);
}

export function buildHarmonyDegreeChord({ scaleName, harmonyMode, scaleIntervals, degreeIndex, withSeventh = false }) {
  const built = buildScaleDegreeChord({ scaleIntervals, degreeIndex, withSeventh });
  const normalized = normalizeScaleName(scaleName);

  if (
    harmonyMode === "functional_minor" &&
    isMinorHarmonyScaleName(normalized) &&
    scaleIntervals.length >= 7 &&
    degreeIndex === 4
  ) {
    const rootOffset = mod12(scaleIntervals[degreeIndex % scaleIntervals.length]);
    if (withSeventh) {
      return {
        rootOffset,
        quality: "dom",
        suspension: "none",
        structure: "tetrad",
        inversion: "root",
        form: "closed",
        ext7: true,
        ext6: false,
        ext9: false,
        ext11: false,
        ext13: false,
      };
    }
    return {
      rootOffset,
      quality: "maj",
      suspension: "none",
      structure: "triad",
      inversion: "root",
      form: "open",
      positionForm: "open",
      ext7: false,
      ext6: false,
      ext9: false,
      ext11: false,
      ext13: false,
    };
  }

  return built;
}

export const ROMAN_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

export function romanizeDegreeNumber(n) {
  return ROMAN_DEGREES[n - 1] || String(n);
}

export function romanDegreeFromInterval(interval) {
  const tok = intervalToDegreeToken(interval);
  const accidental = tok.replace(/[0-9]/g, "");
  const num = parseInt(tok.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(num)) return tok;
  return `${accidental}${romanizeDegreeNumber(num)}`;
}

export function tetradSuffixFromOffsets(thirdOffset, fifthOffset, seventhOffset) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  const s = mod12(seventhOffset);
  if (t === 4 && f === 7 && s === 11) return "maj7";
  if (t === 4 && f === 7 && s === 10) return "7";
  if (t === 3 && f === 7 && s === 10) return "m7";
  if (t === 3 && f === 7 && s === 11) return "m(maj7)";
  if (t === 3 && f === 6 && s === 10) return "m7(b5)";
  if (t === 3 && f === 6 && s === 9) return "dim7";
  if (t === 4 && f === 8 && s === 11) return "maj7#5";
  if (t === 4 && f === 8 && s === 10) return "7#5";
  if (t === 4 && f === 6 && s === 10) return "7b5";
  return "?";
}

export function buildManualScaleHarmonySpecs({ rootPc, scaleName, scaleIntervals, spelledScaleNotes, preferSharps }) {
  const normalized = normalizeScaleName(scaleName);
  const preset = MANUAL_SCALE_HARMONY_PRESETS[normalized];
  if (!preset?.length) return null;

  return preset.map((item) => {
    const rootOffset = scaleIntervals[item.scaleIdx];
    const rootNote = spelledScaleNotes[item.scaleIdx] || pcToName(mod12(rootPc + rootOffset), preferSharps);
    const suffix = chordDisplaySuffixOnly({
      quality: item.quality,
      suspension: item.suspension || "none",
      structure: item.structure,
      ext7: !!item.ext7,
      ext6: !!item.ext6,
      ext9: !!item.ext9,
      ext11: !!item.ext11,
      ext13: !!item.ext13,
    });
    const name = `${rootNote}${suffix}`;

    return {
      rootPc: mod12(rootPc + rootOffset),
      quality: item.quality,
      suspension: item.suspension || "none",
      structure: item.structure,
      inversion: "root",
      form: "open",
      positionForm: "open",
      ext7: !!item.ext7,
      ext6: !!item.ext6,
      ext9: !!item.ext9,
      ext11: !!item.ext11,
      ext13: !!item.ext13,
      spellPreferSharps: preferSharps,
      supported: true,
      noteName: rootNote,
      name,
      degreeName: `${item.degreeLabel}${suffix}`,
      scaleIdx: item.scaleIdx,
    };
  });
}

export function buildScaleTetradHarmonization({ rootPc, scaleName, harmonyMode, scaleIntervals, spelledScaleNotes, preferSharps }) {
  const normalized = normalizeScaleName(scaleName);
  const n = scaleIntervals.length;
  if (n < 4) return [];

  const manualHarmony = buildManualScaleHarmonySpecs({ rootPc, scaleName: normalized, scaleIntervals, spelledScaleNotes, preferSharps });
  if (manualHarmony?.length) {
    return manualHarmony.map((item) => ({
      degreeName: item.degreeName,
      noteName: item.name,
    }));
  }

  const manualPreset = MANUAL_SCALE_TETRAD_PRESETS[normalized];
  if (manualPreset && manualPreset.length) {
    return manualPreset.map((item) => {
      const noteRoot = spelledScaleNotes[item.scaleIdx] || pcToName(mod12(rootPc + scaleIntervals[item.scaleIdx]), preferSharps);
      return {
        degreeName: `${item.degreeLabel}${item.suffix}`,
        noteName: `${noteRoot}${item.suffix}`,
      };
    });
  }

  return scaleIntervals.map((rootOffset, i) => {
    const functionalMinorDominant =
      harmonyMode === "functional_minor" &&
      isMinorHarmonyScaleName(normalized) &&
      n >= 7 &&
      i === 4;

    const thirdOffset = mod12(scaleIntervals[(i + 2) % n] - rootOffset);
    const fifthOffset = mod12(scaleIntervals[(i + 4) % n] - rootOffset);
    const seventhOffset = mod12(scaleIntervals[(i + 6) % n] - rootOffset);
    const suffix = functionalMinorDominant ? "7" : tetradSuffixFromOffsets(thirdOffset, fifthOffset, seventhOffset);
    const degreeBase = romanDegreeFromInterval(rootOffset);
    const degreeName = `${degreeBase}${suffix}`;
    const noteRoot = spelledScaleNotes[i] || pcToName(mod12(rootPc + rootOffset), preferSharps);

    return {
      degreeName,
      noteName: `${noteRoot}${suffix}`,
    };
  });
}

export function slotChordTonalitySignature(slot) {
  if (!slot) return null;
  return {
    rootPc: mod12(slot.rootPc),
    suffix: chordDisplaySuffixOnly({
      quality: slot.quality,
      suspension: slot.suspension || "none",
      structure: slot.structure,
      ext7: !!slot.ext7,
      ext6: !!slot.ext6,
      ext9: !!slot.ext9,
      ext11: !!slot.ext11,
      ext13: !!slot.ext13,
    }),
  };
}

export function buildTonalityDegreeCandidate({ tonicPc, scaleName, harmonyMode, degreeIndex, withSeventh }) {
  const scaleIntervals = buildScaleIntervals(scaleName, "", tonicPc);
  const preferSharps = computeAutoPreferSharps({ rootPc: tonicPc, scaleName });
  const built = buildHarmonyDegreeChord({ scaleName, harmonyMode, scaleIntervals, degreeIndex, withSeventh });
  if (!built) return null;

  const rootPc = mod12(tonicPc + built.rootOffset);
  const noteName = pcToName(rootPc, preferSharps);
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
    rootPc,
    suffix,
    degreeIndex,
    degreeLabel: ROMAN_DEGREES[degreeIndex] || String(degreeIndex + 1),
    noteLabel: `${noteName}${suffix}`,
  };
}

export function formatTonalityLabel(scaleName, tonicPc) {
  const preferSharps = computeAutoPreferSharps({ rootPc: tonicPc, scaleName });
  const tonicName = pcToName(tonicPc, preferSharps);
  if (scaleName === "Mayor") return `${tonicName} mayor`;
  if (scaleName === "Menor natural") return `${tonicName} menor`;
  return `${tonicName} ${scaleName}`;
}

export function analyzeChordSetTonality({ slots, harmonyMode }) {
  const selected = (slots || []).filter((s) => !!s?.enabled);
  if (!selected.length) return { selectedNames: [], labels: [], text: "(ninguna)" };

  if (selected.some((slot) => String(slot?.family || "tertian") !== "tertian")) {
    return {
      selectedNames: [],
      labels: [],
      text: "No disponible con familias cuartales o de notas guía activas",
    };
  }

  const selectedNames = selected.map((slot) => chordDisplayNameFromUI({
    rootPc: slot.rootPc,
    preferSharps: slot.spellPreferSharps ?? preferSharpsFromMajorTonicPc(mod12(slot.rootPc)),
    quality: slot.quality,
    suspension: slot.suspension || "none",
    structure: slot.structure,
    ext7: !!slot.ext7,
    ext6: !!slot.ext6,
    ext9: !!slot.ext9,
    ext11: !!slot.ext11,
    ext13: !!slot.ext13,
  }));

  const results = [];

  for (const scaleName of TONALITY_CANDIDATE_SCALE_NAMES) {
    for (let tonicPc = 0; tonicPc < 12; tonicPc++) {
      let ok = true;

      for (const slot of selected) {
        const target = slotChordTonalitySignature(slot);
        const withSeventh = slot.structure === "tetrad" || !!slot.ext7;
        let found = false;

        for (let degreeIndex = 0; degreeIndex < 7; degreeIndex++) {
          const cand = buildTonalityDegreeCandidate({ tonicPc, scaleName, harmonyMode, degreeIndex, withSeventh });
          if (!cand) continue;
          if (cand.rootPc === target.rootPc && cand.suffix === target.suffix) {
            found = true;
            break;
          }
        }

        if (!found) {
          ok = false;
          break;
        }
      }

      if (ok) results.push(formatTonalityLabel(scaleName, tonicPc));
    }
  }

  const labels = Array.from(new Set(results));
  return {
    selectedNames,
    labels,
    text: labels.length ? labels.join(" · ") : "No clara con los acordes seleccionados",
  };
}

export function spellNoteFromChordInterval(rootPc, interval, preferSharps) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootLetter = rootName[0];
  const rootIdx = Math.max(0, LETTERS.indexOf(rootLetter));
  const deg = chordDegreeNumberFromInterval(interval);
  const letter = LETTERS[(rootIdx + (deg - 1)) % 7];
  const pc = mod12(rootPc + interval);
  return spellPcWithLetter(pc, letter);
}

export function buildDetectedCandidateNoteNameForPc(pc, candidate, preferSharpsFallback) {
  const prefer = candidate?.preferSharps ?? preferSharpsFallback;
  if (!candidate) return pcToName(pc, prefer);
  const interval = mod12(pc - candidate.rootPc);
  const idx = candidate.formula.intervals.findIndex((x) => mod12(x) === interval);
  if (idx >= 0) {
    const spelled = spellChordNotes({ rootPc: candidate.rootPc, chordIntervals: candidate.formula.intervals, preferSharps: prefer });
    return spelled[idx];
  }
  return spellNoteFromChordInterval(candidate.rootPc, interval, prefer);
}

export function buildDetectedCandidateDegreeLabelForPc(pc, candidate) {
  if (!candidate) return null;
  const interval = mod12(pc - candidate.rootPc);
  const idx = candidate.formula.intervals.findIndex((x) => mod12(x) === interval);
  return idx >= 0 ? String(candidate.formula.degreeLabels[idx] || "") : null;
}

export function buildDetectedCandidateLabelForPc(pc, candidate, preferSharpsFallback, showIntervals = true, showNotes = true) {
  const prefer = candidate?.preferSharps ?? preferSharpsFallback;
  const noteName = buildDetectedCandidateNoteNameForPc(pc, candidate, preferSharpsFallback);
  if (!candidate) return noteName;

  const interval = mod12(pc - candidate.rootPc);
  const degree = buildDetectedCandidateDegreeLabelForPc(pc, candidate) || intervalToChordDegreeTokenWithSpelling(interval, prefer);

  if (!showIntervals && !showNotes) return degree;
  if (showIntervals && showNotes) return `${degree}-${noteName}`;
  if (showIntervals) return degree;
  return noteName;
}

export function buildDetectedCandidateBackgroundLabelForPc(pc, candidate, preferSharpsFallback, showIntervals = true, showNotes = true) {
  if (!candidate) return pcToName(pc, preferSharpsFallback);

  const prefer = candidate.preferSharps ?? preferSharpsFallback;
  const interval = mod12(pc - candidate.rootPc);
  const degree = buildDetectedCandidateDegreeLabelForPc(pc, candidate) || intervalToChordDegreeTokenWithSpelling(interval, prefer);
  const noteName = spellNoteFromChordInterval(candidate.rootPc, interval, prefer);

  if (!showIntervals && !showNotes) return degree;
  if (showIntervals && showNotes) return `${degree}-${noteName}`;
  if (showIntervals) return degree;
  return noteName;
}

export function buildDetectedCandidateRoleForPc(pc, candidate) {
  if (!candidate) return "other";
  const interval = mod12(pc - candidate.rootPc);
  return detectFormulaRolePure(candidate.formula, interval);
}

export function buildManualSelectionVoicing(selectedNotes, rootPc, maxFret) {
  if (!Array.isArray(selectedNotes) || !selectedNotes.length) return null;
  const fretsLH = [null, null, null, null, null, null];
  for (const n of selectedNotes) {
    if (!n) continue;
    fretsLH[5 - n.sIdx] = n.fret;
  }
  return AppVoicingStudyCore.buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
}

export function clampChordMaxDistForReach(reach) {
  const allowed = [4, 5, 6];
  const wanted = Math.max(0, Number(reach) || 0);
  return allowed.find((value) => value >= wanted) ?? allowed[allowed.length - 1];
}

export function buildCloseTetradAbsoluteOrders(thirdOffset, fifthOffset, seventhOffset) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  const s = mod12(seventhOffset);
  return {
    root: [0, t, f, s],
    "1": [t, f, s, 12],
    "2": [f, s, 12, 12 + t],
    "3": [s, 12, 12 + t, 12 + f],
  };
}

export function applyDropToAbsoluteOrder(absOrder, dropKind) {
  const arr = [...absOrder];
  if (dropKind === "drop2") arr[2] -= 12;
  else if (dropKind === "drop3") arr[1] -= 12;
  else if (dropKind === "drop24") {
    arr[2] -= 12;
    arr[0] -= 12;
  }
  return arr.sort((a, b) => a - b);
}

export function dropInversionLabelFromBassInt(bassInt, thirdOffset, fifthOffset, seventhOffset) {
  const b = mod12(bassInt);
  if (b === 0) return "Fundamental";
  if (b === mod12(thirdOffset)) return "1ª inv.";
  if (b === mod12(fifthOffset)) return "2ª inv.";
  if (b === mod12(seventhOffset)) return "3ª inv.";
  return `Inv. ${b}`;
}

export function dropKindFromForm(form) {
  if (String(form).startsWith("drop24")) return "drop24";
  if (String(form).startsWith("drop3")) return "drop3";
  return "drop2";
}

export function getDropAbsoluteOrder({ thirdOffset, fifthOffset, seventhOffset, dropKind, inversion }) {
  const t = mod12(thirdOffset);
  const f = mod12(fifthOffset);
  const s = mod12(seventhOffset);
  const inv = ["root", "1", "2", "3"].includes(inversion) ? inversion : "root";

  // Convenio de esta app: la inversión se nombra por el BAJO REAL del drop resultante.
  // Drop 2:
  // Fundamental = 1-5-7-3
  // 1ª inv.    = 3-7-1-5
  // 2ª inv.    = 5-1-3-7
  // 3ª inv.    = 7-3-5-1
  if (dropKind === "drop2") {
    if (inv === "root") return [0, f, s, 12 + t];
    if (inv === "1") return [t, s, 12, 12 + f];
    if (inv === "2") return [f, 12, 12 + t, 12 + s];
    return [s, 12 + t, 12 + f, 24];
  }

  // Drop 3:
  // Fundamental = 1-7-3-5
  // 1ª inv.    = 3-1-5-7
  // 2ª inv.    = 5-3-7-1
  // 3ª inv.    = 7-5-1-3
  if (dropKind === "drop3") {
    if (inv === "root") return [0, s, 12 + t, 12 + f];
    if (inv === "1") return [t, 12, 12 + f, 12 + s];
    if (inv === "2") return [f, 12 + t, 12 + s, 24];
    return [s, 12 + f, 24, 24 + t];
  }

  // Drop 2+4:
  // Fundamental = 1-5-3-7
  // 1ª inv.    = 3-7-5-1
  // 2ª inv.    = 5-1-7-3
  // 3ª inv.    = 7-3-1-5
  if (dropKind === "drop24") {
    if (inv === "root") return [0, f, 12 + t, 12 + s];
    if (inv === "1") return [t, s, 12 + f, 24];
    if (inv === "2") return [f, 12, 12 + s, 24 + t];
    return [s, 12 + t, 24, 24 + f];
  }

  const closeMap = buildCloseTetradAbsoluteOrders(thirdOffset, fifthOffset, seventhOffset);
  return applyDropToAbsoluteOrder(closeMap[inv], dropKind);
}

export function generateDropTetradVoicings({ rootPc, thirdOffset, fifthOffset, seventhOffset, form, inversion = "root", maxFret, maxSpan = 6 }) {
  const setDefs = DROP_FORM_STRING_SETS[form] || [];
  if (!setDefs.length) return [];

  const dropKind = dropKindFromForm(form);
  const invMap = { root: 0, "1": 1, "2": 2, "3": 3 };
  const wantedInvIdx = invMap[inversion] ?? 0;
  const absOrderBase = getDropAbsoluteOrder({
    thirdOffset,
    fifthOffset,
    seventhOffset,
    dropKind,
    inversion,
  });

  const out = [];
  const seen = new Set();

  for (const set of setDefs) {
    const stringsLowToHigh = [...set].sort((a, b) => b - a);
    const pcsLowToHigh = absOrderBase.map((x) => mod12(rootPc + x));

    const lowerK = Math.max(...stringsLowToHigh.map((sIdx, i) => OPEN_MIDI[sIdx] - absOrderBase[i]));
    const upperK = Math.min(...stringsLowToHigh.map((sIdx, i) => OPEN_MIDI[sIdx] + maxFret - absOrderBase[i]));

    for (let K = lowerK; K <= upperK; K++) {
      const fretsPerLowToHigh = [];
      const pitches = [];
      let ok = true;

      for (let i = 0; i < 4; i++) {
        const targetPitch = K + absOrderBase[i];
        const sIdx = stringsLowToHigh[i];
        const fret = targetPitch - OPEN_MIDI[sIdx];
        if (!Number.isInteger(fret) || fret < 0 || fret > maxFret) {
          ok = false;
          break;
        }
        fretsPerLowToHigh.push({ sIdx, fret, targetPitch, pc: pcsLowToHigh[i] });
        pitches.push(targetPitch);
      }
      if (!ok) continue;

      for (let i = 1; i < pitches.length; i++) {
        if (pitches[i] <= pitches[i - 1]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const span = AppVoicingStudyCore.frettedSpanFromFrets(fretsPerLowToHigh.map((x) => x.fret));
      if (span > maxSpan) continue;

      const fretsLH = [null, null, null, null, null, null];
      for (const n of fretsPerLowToHigh) fretsLH[5 - n.sIdx] = n.fret;

      const v = AppVoicingStudyCore.buildVoicingFromFretsLH({ fretsLH, rootPc, maxFret });
      if (!v || !AppVoicingStudyCore.isErgonomicVoicing(v, maxSpan)) continue;
      if (v.notes.length !== 4) continue;

      const rel = new Set(v.notes.map((n) => mod12(n.pc - rootPc)));
      if (![0, mod12(thirdOffset), mod12(fifthOffset), mod12(seventhOffset)].every((x) => rel.has(x))) continue;

      const lowToHighActual = [...v.notes]
        .sort((a, b) => pitchAt(a.sIdx, a.fret) - pitchAt(b.sIdx, b.fret))
        .map((n) => mod12(n.pc - rootPc));

      const expected = absOrderBase.map((x) => mod12(x));
      if (lowToHighActual.join(",") !== expected.join(",")) continue;

      const bassInt = mod12(v.bassPc - rootPc);
      const invLabel = dropInversionLabelFromBassInt(bassInt, thirdOffset, fifthOffset, seventhOffset);
      const key = `${form}|${inversion}|${v.frets}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        ...v,
        span,
        _form: form,
        _dropInvIdx: wantedInvIdx,
        _dropInvLabel: invLabel,
      });
    }
  }

  out.sort((a, b) => (a.minFret - b.minFret) || (a.maxFret - b.maxFret) || (a.span - b.span));
  return out;
}

// --------------------------------------------------------------------------
// BLOQUE: OPCIONES DE UI PARA ACORDES
// --------------------------------------------------------------------------

// Opciones del combo de Calidad. "aug" (Aumentada) es solo una etiqueta: se guarda
// como Mayor o Dominante con ♯5 (ver storedQualityForAugmented).
export const CHORD_QUALITIES = [
  { value: "maj", label: "Mayor" },
  { value: "dom", label: "Dominante (7)" },
  { value: "aug", label: "Aumentada" },
  { value: "min", label: "Menor" },
  { value: "minmaj7", label: "m(maj7)" },
  { value: "dim", label: "Disminuido" },
  { value: "hdim", label: "m7(b5)" },
];

// Calidades que pueden guardarse en el estado (sin la etiqueta Aumentada).
export const CHORD_STORED_QUALITY_VALUES = Object.freeze(["maj", "dom", "min", "minmaj7", "dim", "hdim"]);

export const CHORD_STRUCTURES = [
  { value: "triad", label: "Triada" },
  { value: "tetrad", label: "Cuatriada" },
  { value: "chord", label: "Acorde" },
];

export const CHORD_FAMILIES = [
  { value: "tertian", label: "Terciaria" },
  { value: "quartal", label: "Cuartal" },
  { value: "guide_tones", label: "Notas guía" },
];

export const CHORD_QUARTAL_TYPES = [
  { value: "pure", label: "Cuartal puro" },
  { value: "mixed", label: "Cuartal mixto" },
];

export const CHORD_QUARTAL_VOICES = [
  { value: "3", label: "3 voces" },
  { value: "4", label: "4 voces" },
  { value: "5", label: "5 voces" },
];

export const CHORD_QUARTAL_SPREADS = [
  { value: "closed", label: "Cerrado" },
  { value: "open", label: "Abierto" },
];

export const CHORD_QUARTAL_REFERENCES = [
  { value: "root", label: "Desde raíz" },
  { value: "scale", label: "Diatónico a escala" },
];

export const CHORD_QUARTAL_SCALE_NAMES = Object.keys(SCALE_PRESETS).filter((name) => name !== "Personalizada");

export const CHORD_GUIDE_TONE_QUALITIES = [
  { value: "maj7", label: "Maj7" },
  { value: "min7", label: "m7" },
  { value: "dom7", label: "7" },
  { value: "maj6", label: "6" },
];

export const CHORD_GUIDE_TONE_FORMS = [
  { value: "closed", label: "Cerrado" },
  { value: "open", label: "Abierto" },
];

export const CHORD_GUIDE_TONE_INVERSIONS = [
  { value: "root", label: "Fundamental" },
  { value: "1", label: "1ª inversión" },
  { value: "all", label: "Todas" },
];

export function guideToneDefinitionFromQuality(quality) {
  switch (quality) {
    case "min7":
      return { quality, intervals: [0, 3, 10], degreeLabels: ["1", "b3", "b7"], suffix: "m7" };
    case "dom7":
      return { quality, intervals: [0, 4, 10], degreeLabels: ["1", "3", "b7"], suffix: "7" };
    case "maj6":
      return { quality, intervals: [0, 4, 9], degreeLabels: ["1", "3", "6"], suffix: "6" };
    case "maj7":
    default:
      return { quality: "maj7", intervals: [0, 4, 11], degreeLabels: ["1", "3", "7"], suffix: "maj7" };
  }
}

export function guideToneBassIntervalsForSelection(definition, inversion) {
  const ints = Array.isArray(definition?.intervals) ? definition.intervals.map(mod12) : [0, 4, 11];
  const normalized = ["root", "1", "all"].includes(inversion) ? inversion : "root";
  const selected = normalized === "all" ? ["root", "1"] : [normalized];
  return Array.from(new Set(selected.map((inv) => {
    if (inv === "1") return ints[1] ?? 0;
    return ints[0] ?? 0;
  }).map(mod12)));
}

export function voicingHasOpenStrings(voicing) {
  return Array.isArray(voicing?.notes) && voicing.notes.some((n) => Number(n?.fret) === 0);
}

export const QUARTAL_OPEN_STRING_PCS = [4, 11, 7, 2, 9, 4];
export const QUARTAL_OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40];
export const QUARTAL_PC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function fnBuildQuartalNoteName(vPc) {
  return QUARTAL_PC_NAMES[mod12(vPc)] || "?";
}

export function fnBuildQuartalDegreeLabel(vDegree) {
  if (typeof vDegree !== "number") return "";
  return `grado ${romanizeDegreeNumber(vDegree + 1)}`;
}

export function fnBuildQuartalVoicingNotes(vStringIndices, vFrets, vMidis, vOrderedPcs) {
  return vStringIndices.map((vStringIdx, vIdx) => {
    const vFret = vFrets[vIdx];
    const vMidi = vMidis[vIdx];
    const vPc = mod12(vOrderedPcs[vIdx]);
    const vName = fnBuildQuartalNoteName(vPc);
    return {
      sIdx: vStringIdx,
      stringIndex: vStringIdx,
      stringIdx: vStringIdx,
      string: vStringIdx + 1,
      fret: vFret,
      midi: vMidi,
      pc: vPc,
      pitchClass: vPc,
      noteName: vName,
      name: vName,
      label: vName,
      isOpen: vFret === 0,
    };
  });
}

export function fnBuildIndexCombinations(vLength, vChoose) {
  const vResult = [];
  function fnWalk(vStart, vAcc) {
    if (vAcc.length === vChoose) {
      vResult.push([...vAcc]);
      return;
    }
    for (let i = vStart; i < vLength; i += 1) {
      vAcc.push(i);
      fnWalk(i + 1, vAcc);
      vAcc.pop();
    }
  }
  fnWalk(0, []);
  return vResult;
}

export function fnBuildQuartalPitchSets({ rootPc, voices, type, reference, scaleName = "Mayor" }) {
  const vVoices = Math.max(3, Math.min(5, parseInt(String(voices), 10) || 4));
  const vMap = new Map();
  const fnPush = (vPcs, vMeta = {}) => {
    const vNorm = vPcs.map((v) => mod12(v));
    const vKey = vNorm.join("-");
    if (!vMap.has(vKey)) vMap.set(vKey, { pcs: vNorm, ...vMeta });
  };

  if (reference === "scale") {
    const vScaleIntervalsRaw = buildScaleIntervals(scaleName, "", rootPc);
    const vScaleIntervals = Array.isArray(vScaleIntervalsRaw) ? vScaleIntervalsRaw.map((v) => mod12(v)) : [];
    const vScale = vScaleIntervals.map((v) => mod12(rootPc + v));
    const vScaleLen = vScale.length;

    if (vScaleLen >= 3) {
      for (let vDegree = 0; vDegree < vScaleLen; vDegree += 1) {
        const vPcs = [];
        for (let i = 0; i < vVoices; i += 1) vPcs.push(vScale[(vDegree + i * 3) % vScaleLen]);
        const vSteps = [];
        for (let i = 0; i < vPcs.length - 1; i += 1) vSteps.push(mod12(vPcs[i + 1] - vPcs[i]));
        const vPure = vSteps.every((v) => v === 5);
        if ((type === "pure" && vPure) || (type === "mixed" && !vPure)) {
          fnPush(vPcs, { degree: vDegree, steps: vSteps, scaleName });
        }
      }
    }
  } else if (type === "pure") {
    fnPush(Array.from({ length: vVoices }, (_, i) => mod12(rootPc + i * 5)), { steps: Array.from({ length: Math.max(0, vVoices - 1) }, () => 5) });
  } else {
    for (let vAlteredIdx = 0; vAlteredIdx < vVoices - 1; vAlteredIdx += 1) {
      const vPcs = [mod12(rootPc)];
      let vCursor = mod12(rootPc);
      const vSteps = [];
      for (let i = 0; i < vVoices - 1; i += 1) {
        const vStep = i === vAlteredIdx ? 6 : 5;
        vSteps.push(vStep);
        vCursor = mod12(vCursor + vStep);
        vPcs.push(vCursor);
      }
      fnPush(vPcs, { alteredIndex: vAlteredIdx, steps: vSteps });
    }
  }

  if (!vMap.size && reference !== "scale") {
    fnPush(Array.from({ length: vVoices }, (_, i) => mod12(rootPc + i * 5)), { fallback: true, steps: Array.from({ length: Math.max(0, vVoices - 1) }, () => 5) });
  }

  return Array.from(vMap.values());
}

export function fnBuildQuartalFretString(vStringIndices, vFrets) {
  const vOut = ["x", "x", "x", "x", "x", "x"];
  vStringIndices.forEach((vStringIdx, vIdx) => {
    vOut[5 - vStringIdx] = String(vFrets[vIdx]);
  });
  return vOut.join("");
}

export function fnGetQuartalSpreadKind(vMidis, vSteps) {
  const vSafeMidis = Array.isArray(vMidis) ? vMidis : [];
  const vSafeSteps = Array.isArray(vSteps) ? vSteps : [];
  if (vSafeMidis.length < 2) return "closed";

  for (let i = 0; i < vSafeMidis.length - 1; i += 1) {
    const vDiff = vSafeMidis[i + 1] - vSafeMidis[i];
    const vExpected = Number(vSafeSteps[i] || 5);
    if (vDiff !== vExpected) return "open";
  }

  return "closed";
}

export function fnGenerateQuartalVoicings({ pitchSets, maxDist, allowOpenStrings, maxFret }) {
  const vCombos = [
    ...fnBuildIndexCombinations(6, 3),
    ...fnBuildIndexCombinations(6, 4),
    ...fnBuildIndexCombinations(6, 5),
  ];
  const vWantedSizes = new Set(pitchSets.map((v) => v.pcs.length));
  const vResults = [];
  const vSeen = new Set();
  const vMaxDist = Math.max(4, Math.min(8, Number(maxDist) || 5));
  const vMinFret = allowOpenStrings ? 0 : 1;
  const vMaxFret = Math.max(4, Math.min(24, Number(maxFret) || 15));

  for (const vPitchSet of pitchSets) {
    const vOrderedPcs = Array.isArray(vPitchSet?.pcs) ? [...vPitchSet.pcs] : [];
    if (!vOrderedPcs.length) continue;

    for (const vCombo of vCombos) {
      if (!vWantedSizes.has(vCombo.length) || vCombo.length !== vOrderedPcs.length) continue;

      const vStrings = [...vCombo].sort((a, b) => b - a);
      const vCandidates = vStrings.map((vStringIdx, vIdx) => {
        const vTargetPc = vOrderedPcs[vIdx];
        const vOpenPc = QUARTAL_OPEN_STRING_PCS[vStringIdx];
        const vOpenMidi = QUARTAL_OPEN_STRING_MIDI[vStringIdx];
        const vList = [];
        for (let vFret = vMinFret; vFret <= vMaxFret; vFret += 1) {
          if (mod12(vOpenPc + vFret) !== vTargetPc) continue;
          vList.push({ fret: vFret, midi: vOpenMidi + vFret });
        }
        return vList;
      });
      if (vCandidates.some((v) => !v.length)) continue;

      const fnWalk = (vIdx, vFrets, vMidis) => {
        if (vIdx === vCandidates.length) {
          const vPositive = vFrets.filter((v) => v > 0);
          const vMin = vPositive.length ? Math.min(...vPositive) : 0;
          const vMax = vPositive.length ? Math.max(...vPositive) : 0;
          const vReach = vPositive.length ? (vMax - vMin + 1) : 1;
          if (vReach > vMaxDist) return;

          const vSpreadKind = fnGetQuartalSpreadKind(vMidis, vPitchSet.steps);
          const vFretsText = fnBuildQuartalFretString(vStrings, vFrets);
          const vKey = `${vFretsText}|${vPitchSet.pcs.join("-")}|${vSpreadKind}`;
          if (vSeen.has(vKey)) return;
          vSeen.add(vKey);

          const vNotes = fnBuildQuartalVoicingNotes(vStrings, vFrets, vMidis, vOrderedPcs);
          const vBass = vNotes.length
            ? [...vNotes].sort((a, b) => a.midi - b.midi)[0]
            : null;

          vResults.push({
            frets: vFretsText,
            span: Math.max(0, vMax - vMin),
            reach: vReach,
            notes: vNotes,
            bassKey: vBass ? `${vBass.sIdx}:${vBass.fret}` : null,
            bassPc: vBass ? vBass.pc : null,
            minFret: vMin,
            maxFret: vMax,
            pitchSpan: vMidis.length ? (Math.max(...vMidis) - Math.min(...vMidis)) : 0,
            quartalPcs: [...vPitchSet.pcs],
            quartalOrderedPcs: [...vOrderedPcs],
            quartalRotation: 0,
            quartalSpreadKind: vSpreadKind,
            quartalSteps: Array.isArray(vPitchSet.steps) ? [...vPitchSet.steps] : [],
            quartalDegree: typeof vPitchSet.degree === "number" ? vPitchSet.degree : null,
            quartalReference: vPitchSet.reference || null,
          });
          return;
        }

        for (const vCandidate of vCandidates[vIdx]) {
          if (vMidis.length && vCandidate.midi <= vMidis[vMidis.length - 1]) continue;
          vFrets.push(vCandidate.fret);
          vMidis.push(vCandidate.midi);
          fnWalk(vIdx + 1, vFrets, vMidis);
          vFrets.pop();
          vMidis.pop();
        }
      };

      fnWalk(0, [], []);
    }
  }

  vResults.sort((a, b) => {
    if ((a.minFret ?? 0) !== (b.minFret ?? 0)) return (a.minFret ?? 0) - (b.minFret ?? 0);
    if ((a.reach ?? 0) !== (b.reach ?? 0)) return (a.reach ?? 0) - (b.reach ?? 0);
    return String(a.frets || "").localeCompare(String(b.frets || ""));
  });

  return vResults;
}

export const CHORD_INVERSIONS = [
  { value: "root", label: "Fundamental" },
  { value: "1", label: "1ª inversión" },
  { value: "2", label: "2ª inversión" },
  { value: "3", label: "3ª inversión" },
  { value: "all", label: "Todas" },
];

export const CHORD_FORMS = [
  { value: "closed", label: "Cerrado" },
  { value: "open", label: "Abierto" },
  { value: "drop2_set1", label: "Drop 2 Set 1" },
  { value: "drop2_set2", label: "Drop 2 Set 2" },
  { value: "drop2_set3", label: "Drop 2 Set 3" },
  { value: "drop3_set1", label: "Drop 3 Set 1" },
  { value: "drop3_set2", label: "Drop 3 Set 2" },
  { value: "drop24_set1", label: "Drop 2+4 Set 1" },
  { value: "drop24_set2", label: "Drop 2+4 Set 2" },
];

export const DROP_FORM_OPTIONS = [
  { value: "none", label: "—" },
  ...CHORD_FORMS.filter((x) => String(x.value || "").startsWith("drop")),
];

export const DROP_FORM_STRING_SETS = {
  drop2_set1: [[0, 1, 2, 3]],
  drop2_set2: [[1, 2, 3, 4]],
  drop2_set3: [[2, 3, 4, 5]],
  drop3_set1: [[0, 1, 2, 4]],
  drop3_set2: [[1, 2, 3, 5]],
  drop24_set1: [[0, 1, 3, 4]],
  drop24_set2: [[1, 2, 4, 5]],
};

// ----------------------------------------------------------------------------
// DEFINICIÓN COMÚN DEL ACORDE TERCIANO
// ----------------------------------------------------------------------------
// Normaliza el estado de la UI (Acordes y Acordes cercanos) para que ningún
// consumidor trabaje con combinaciones que contradigan el estado visible:
// - sus + dim/ø: la UI cambia la calidad a Mayor; aquí se aplica el mismo criterio.
// - dim7: la 6/13 coincide en clase de altura con la bb7. El motor representa
//   clases de altura y no puede distinguir su función, así que se desactivan
//   (limitación de representación, no prohibición musical).
// - quinta/novena: se normalizan con la política compartida de chordAlterations.
// `ext7` conserva `undefined` cuando no se informa: en "Acorde" la 7ª solo se
// omite con ext7 === false (comportamiento histórico de buildChordIntervals).
// `quality` es la calidad teórica que usan nombre, notas, catálogo y voicings
// (conserva la 3ª y el tipo de 7ª de la base; ver resolveTheoryChordQuality);
// `uiQuality` es la calidad base elegida y es la única que se escribe de vuelta
// en el estado; `displayQuality` es la que muestra el combo de Calidad.
// Ejemplos: Menor + 7 + ♭5 → teórica hdim (Am7(b5)); Menor + ♭5 sin 7ª → dim;
// Semidisminuido + 5 → min. Nunca se pasa a Disminuido con 7ª (♭♭7) por cambiar
// la quinta.
export function normalizeChordUiSpec(params = {}) {
  const requestedSuspension = params?.suspension || "none";
  const isSus = requestedSuspension !== "none";
  // "aug" no se guarda; si llega (estado externo) equivale a Mayor con ♯5.
  const requestedQuality = params?.quality || "maj";
  const augmentedLabel = requestedQuality === "aug";
  // La suspensión solo sustituye la 3ª: la calidad base (y con ella el tipo de
  // 7ª) se conserva, así que Cm7(b5) + sus4 es C7sus4(b5) y al quitarla vuelve.
  const uiQuality = augmentedLabel ? "maj" : requestedQuality;
  const structure = params?.structure || "triad";
  const ext7 = params?.ext7 === undefined ? undefined : !!params.ext7;
  const omit = ["1", "3", "5"].includes(params?.omit) ? params.omit : "none";
  // Misma regla de 7ª que buildChordToneDefinition: en "Acorde" la 7ª va salvo que se quite.
  const hasSeventh = structure === "triad" || structure === "tetrad" ? !!ext7 : ext7 !== false;
  // Disminuido suspendido con ♭♭7 no se representa (la interfaz no permite llegar
  // a él): un estado externo así conserva la ♭♭7 y recupera la 3ª, nunca cambia
  // la séptima por otra.
  const suspension = isSus && uiQuality === "dim" && hasSeventh ? "none" : requestedSuspension;
  const { fifth, ninth } = normalizeChordAlterations({
    quality: uiQuality,
    suspension,
    structure,
    ext7: !!ext7,
    ext9: !!params?.ext9,
    omit,
    fifth: augmentedLabel && !params?.fifth ? "#5" : params?.fifth,
    ninth: params?.ninth,
  });
  const quality = resolveTheoryChordQuality({ quality: uiQuality, suspension, fifth, hasSeventh });
  const displayQuality = resolveDisplayChordQuality({ quality: uiQuality, suspension, fifth, hasSeventh });
  // dim7: la 6/13 coincide en altura con la ♭♭7 (también con la 5ª alterada).
  const dimSeventh = quality === "dim" && hasSeventh;
  const ext6 = !!params?.ext6 && !dimSeventh;
  const ext9 = !!params?.ext9;
  const ext11 = !!params?.ext11;
  const ext13 = !!params?.ext13 && !dimSeventh;
  return { quality, uiQuality, displayQuality, suspension, structure, ext7, ext6, ext9, ext11, ext13, omit, fifth, ninth };
}

// Valor del combo de Calidad para un estado (Acordes y Acordes cercanos).
export function chordQualityDisplayValue(params = {}) {
  return normalizeChordUiSpec(params).displayQuality;
}

// Opciones del combo de Calidad para un estado, compartidas por Acordes y Acordes
// cercanos: Dominante y m7(b5) necesitan 7ª en tríada, y Aumentada se deshabilita
// con su explicación cuando no puede conservar la séptima (♭♭7) o no hay quinta.
export function chordQualitySelectOptions(params = {}) {
  const spec = normalizeChordUiSpec(params);
  const structure = params?.structure || "triad";
  const triadWithoutSeventh = structure === "triad" && !params?.ext7;
  const hasSeventh = structure === "triad" || structure === "tetrad" ? !!params?.ext7 : params?.ext7 !== false;
  const augmented = chordAugmentedOptionState({ quality: spec.uiQuality, suspension: spec.suspension, hasSeventh, omit: spec.omit });
  return CHORD_QUALITIES.map((option) => {
    if (option.value === "aug") {
      return { ...option, label: augmented.label, disabled: !augmented.enabled, title: augmented.hint };
    }
    return { ...option, disabled: (option.value === "hdim" || option.value === "dom") && triadWithoutSeventh, title: "" };
  });
}

export const CHORD_SUSPENSIONS = Object.freeze([
  { value: "none", label: "Sus —" },
  { value: "sus2", label: "sus2" },
  { value: "sus4", label: "sus4" },
]);

// Opciones del combo de suspensión (Acordes y Acordes cercanos): sus2/sus4 se
// deshabilitan con su explicación cuando no pueden conservar la séptima (♭♭7 de
// Disminuido) o con "Omitir 3" (no hay tercera que sustituir).
export function chordSuspensionSelectOptions(params = {}) {
  const spec = normalizeChordUiSpec(params);
  const structure = params?.structure || "triad";
  const hasSeventh = structure === "triad" || structure === "tetrad" ? !!params?.ext7 : params?.ext7 !== false;
  const state = chordSuspensionOptionState({ quality: spec.uiQuality, hasSeventh, omit: spec.omit });
  return CHORD_SUSPENSIONS.map((option) => {
    if (option.value === "none" || state.enabled || option.value === spec.suspension) return { ...option, disabled: false, title: "" };
    return { ...option, label: `${option.label} ${state.labelSuffix}`, disabled: true, title: state.hint };
  });
}

// Grados del acorde con su función. Conserva el grado junto al semitono: ♯9 no
// es ♭3, ♯5 no es ♭13 y ♭♭7 no es 6 aunque compartan altura.
// Replica el modelo de slots de la cuatriada (7ª y cada add ocupan un slot;
// "Omitir" libera uno) y la coexistencia libre de extensiones en "Acorde".
// Si dos grados comparten clase de altura (sus2+9, sus4+11, 6+13), prevalece el
// primero en orden estructural; las omisiones se aplican al final.
export function buildChordToneDefinition(params = {}) {
  const spec = normalizeChordUiSpec(params);
  const { quality, suspension, structure, ext7, ext6, ext9, ext11, ext13, omit, fifth, ninth } = spec;
  const third = suspension === "sus2" ? 2 : suspension === "sus4" ? 5 : quality === "maj" || quality === "dom" ? 4 : 3;
  const thirdLabel = suspension === "sus2" ? "2" : suspension === "sus4" ? "4" : third === 4 ? "3" : "b3";
  const fifthOffset = chordFifthSemitones(fifth);
  const seventh = seventhOffsetForQuality(quality);
  const seventhLabel = seventh === 11 ? "7" : seventh === 9 ? "bb7" : "b7";
  const ninthOffset = chordNinthSemitones(ninth);

  const raw = [
    { interval: 0, label: "1", role: "root" },
    { interval: third, label: thirdLabel, role: "third" },
    { interval: fifthOffset, label: fifth, role: "fifth" },
  ];
  const seventhTone = { interval: seventh, label: seventhLabel, role: "seventh" };
  const sixthTone = { interval: 9, label: "6", role: "sixth" };
  const ninthTone = { interval: ninthOffset, label: ninth, role: "ninth" };
  const eleventhTone = { interval: 5, label: "11", role: "eleventh" };
  const thirteenthTone = { interval: 9, label: "13", role: "thirteenth" };

  if (structure === "tetrad") {
    const maxExtSlots = 1 + (omit !== "none" ? 1 : 0);
    let extSlotsUsed = 0;
    if (ext7) {
      raw.push(seventhTone);
      extSlotsUsed++;
    }
    for (const [active, tone] of [[ext6, sixthTone], [ext9, ninthTone], [ext11, eleventhTone], [ext13, thirteenthTone]]) {
      if (!active) continue;
      if (extSlotsUsed >= maxExtSlots) break;
      raw.push(tone);
      extSlotsUsed++;
    }
  } else {
    if (structure !== "triad" ? ext7 !== false : !!ext7) raw.push(seventhTone);
    if (structure === "chord") {
      if (ext6) raw.push(sixthTone);
      if (ext9) raw.push(ninthTone);
      if (ext11) raw.push(eleventhTone);
      if (ext13) raw.push(thirteenthTone);
    }
    if (structure === "triad" && ext6) raw.push(sixthTone);
  }

  const byInterval = new Map();
  for (const tone of raw) {
    const interval = mod12(tone.interval);
    const previous = byInterval.get(interval);
    // 6 y 13 comparten clase de altura: con ambas marcadas prevalece la 13.
    if (!previous || (previous.role === "sixth" && tone.role === "thirteenth")) {
      byInterval.set(interval, { ...tone, interval });
    }
  }
  const omitInterval = omit === "1" ? 0 : omit === "3" ? mod12(third) : omit === "5" ? mod12(fifthOffset) : null;
  if (omitInterval != null) byInterval.delete(omitInterval);

  const tones = Array.from(byInterval.values()).sort((a, b) => a.interval - b.interval);
  return {
    spec,
    thirdOffset: third,
    fifthOffset,
    seventhOffset: seventh,
    ninthOffset,
    tones,
    intervals: tones.map((tone) => tone.interval),
    degreeLabels: tones.map((tone) => tone.label),
    roles: tones.map((tone) => tone.role),
  };
}

export function chordToneLabelForInterval(definition, interval) {
  const safe = mod12(interval);
  return definition?.tones?.find((tone) => tone.interval === safe)?.label ?? null;
}

export function chordToneRoleForInterval(definition, interval) {
  const safe = mod12(interval);
  return definition?.tones?.find((tone) => tone.interval === safe)?.role ?? null;
}

export function buildChordIntervals(params) {
  return buildChordToneDefinition(params).intervals;
}

export function seventhOffsetForQuality(quality) {
  if (quality === "maj" || quality === "minmaj7") return 11;
  if (quality === "dim") return 9;
  // min/dom/hdim
  return 10;
}

export function chordBassInterval(params) {
  const { inversion } = params || {};
  const definition = buildChordToneDefinition(params);
  const { ext7, ext6, ext9, ext11, ext13, omit } = definition.spec;
  const third = definition.thirdOffset;
  // Quinta efectiva: la alterada sustituye a la de la calidad.
  const fifth = definition.fifthOffset;

  const has7 = !!ext7;
  let degrees = [0, third, fifth];

  if (has7) {
    degrees = [0, third, fifth, definition.seventhOffset];
  } else {
    // Sin 7ª: incluir TODAS las extensiones add activas en orden ascendente de grado,
    // consistente con buildEffectiveDegreesForPlan y computeInversionSelectorOptions.
    const addOffsets = [];
    if (ext9) addOffsets.push(definition.ninthOffset);
    if (ext11) addOffsets.push(5);
    if (ext6 || ext13) addOffsets.push(9);
    if (addOffsets.length > 0) degrees = [0, third, fifth, ...addOffsets];
  }

  if (omit !== "none") {
    const omitInt = omit === "1" ? 0 : omit === "3" ? mod12(third) : omit === "5" ? mod12(fifth) : null;
    if (omitInt !== null) degrees = degrees.filter((d) => mod12(d) !== omitInt);
  }

  // Mapeo consistente con computeInversionSelectorOptions:
  // "1" = primer grado no-raíz, "2" = segundo, "3" = tercero (o último disponible).
  // Esto garantiza coherencia con omit1 (donde la raíz desaparece y los índices se desplazan).
  const nonRoot = degrees.filter((d) => mod12(d) !== 0);
  if (inversion === "1") return nonRoot[0] ?? degrees[0] ?? 0;
  if (inversion === "2") return nonRoot[1] ?? nonRoot[0] ?? degrees[0] ?? 0;
  if (inversion === "3") return nonRoot[2] ?? nonRoot[nonRoot.length - 1] ?? degrees[degrees.length - 1] ?? 0;
  if (inversion === "4") return nonRoot[3] ?? nonRoot[nonRoot.length - 1] ?? degrees[degrees.length - 1] ?? 0;
  if (inversion === "5") return nonRoot[4] ?? nonRoot[nonRoot.length - 1] ?? degrees[degrees.length - 1] ?? 0;
  return degrees.find((d) => mod12(d) === 0) ?? degrees[0] ?? 0;
}

export function intervalToChordToken(semi, { ext6, ext9, ext11, ext13 }) {
  const s = mod12(semi);

  // En contexto de acordes preferimos el deletreo funcional del acorde.
  // Ej.: m7(b5) debe mostrar b5, no #4.
  if (s === 6) return "b5";

  const base = intervalToDegreeToken(s);

  // Para acordes mostramos 6/9/11/13 solo en su grado natural.
  if (ext13 && s === 9) return "13";
  if (ext11 && s === 5) return "11";
  if (ext9 && s === 2) return "9";
  if (ext6 && s === 9) return "6";

  return base;
}

// Fórmula del detector cuyo `ui` coincide con el estado (incluidas quinta y
// novena; un `ui` sin esos campos equivale a sus valores por defecto).
export function findChordDetectFormulaByUi(params) {
  const spec = normalizeChordUiSpec(params);
  return CHORD_DETECT_FORMULAS_PURE.find((formula) => {
    const ui = formula?.ui;
    if (!ui) return false;
    const uiAlterations = normalizeChordAlterations({ ...ui, ext7: !!ui.ext7, ext9: !!ui.ext9 });
    return ui.quality === spec.quality
      && (ui.suspension || "none") === spec.suspension
      && ui.structure === spec.structure
      && !!ui.ext7 === !!spec.ext7
      && !!ui.ext6 === spec.ext6
      && !!ui.ext9 === spec.ext9
      && !!ui.ext11 === spec.ext11
      && !!ui.ext13 === spec.ext13
      && uiAlterations.fifth === spec.fifth
      && uiAlterations.ninth === spec.ninth;
  }) || null;
}

// Etiquetas funcionales alineadas con `chordIntervals`. Salen de la definición
// común (no de una tabla aparte), así que existen para cualquier combinación de
// la UI; los intervalos que no pertenecen al acorde reciben su grado cromático.
export function buildChordDegreeLabelsFromUi(params) {
  const safeIntervals = Array.isArray(params?.chordIntervals) ? params.chordIntervals.map(mod12) : [];
  if (!safeIntervals.length) return null;
  const definition = buildChordToneDefinition(params);
  return safeIntervals.map((interval) => chordToneLabelForInterval(definition, interval) ?? intervalToChordDegreeToken(interval));
}

// Grado cromático simple para intervalos ajenos al acorde.
function intervalToChordDegreeToken(interval) {
  return intervalToSimpleChordDegreeToken(interval);
}

// Número de grado (1..7) a partir de una etiqueta funcional ("#9" → 2, "bb7" → 7).
export function chordDegreeNumberFromLabel(label) {
  const s = String(label || "").replace(/^[b#]+/, "");
  const num = parseInt(s, 10);
  if (!Number.isFinite(num)) return null;
  if (num === 9) return 2;
  if (num === 11) return 4;
  if (num === 13) return 6;
  if (num >= 1 && num <= 7) return num;
  return null;
}

export function degreeNumberFromInterval(interval) {
  const tok = intervalToDegreeToken(interval);
  const n = parseInt(tok.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 1;
}

export function spellPcWithLetter(targetPc, letter) {
  const base = NATURAL_PC[letter];
  let diff = ((targetPc - base + 6) % 12) - 6; // -6..5

  // Para nuestras escalas, normalmente cae en -2..2.
  // Si no, se fuerza a la representación más cercana.
  if (diff > 2) diff -= 12;
  if (diff < -2) diff += 12;

  let acc = "";
  if (diff === 1) acc = "#";
  else if (diff === 2) acc = "##";
  else if (diff === -1) acc = "b";
  else if (diff === -2) acc = "bb";
  else if (diff !== 0) acc = diff > 0 ? "#".repeat(diff) : "b".repeat(-diff);

  return `${letter}${acc}`;
}

export function spellScaleNotes({ rootPc, scaleIntervals, preferSharps }) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootLetter = rootName[0];
  const rootIdx = Math.max(0, LETTERS.indexOf(rootLetter));

  return scaleIntervals.map((interval) => {
    const deg = degreeNumberFromInterval(interval);
    const letter = LETTERS[(rootIdx + (deg - 1)) % 7];
    const pc = mod12(rootPc + interval);
    return spellPcWithLetter(pc, letter);
  });
}

export function chordDegreeNumberFromInterval(interval) {
  const s = mod12(interval);
  if (s === 0) return 1;
  if (s === 1 || s === 2) return 2;
  if (s === 3 || s === 4) return 3;
  if (s === 5) return 4;
  if (s === 6 || s === 7) return 5;
  if (s === 8 || s === 9) return 6;
  if (s === 10 || s === 11) return 7;
  return 1;
}

// Deletrea las notas del acorde. Con `degreeLabels` (alineadas con los
// intervalos) la letra sale del grado funcional: ♯9 sobre D es E# (no F),
// ♯5 sobre C es G# (no Ab) y la ♭♭7 de Fdim7 es Ebb (no D).
export function spellChordNotes({ rootPc, chordIntervals, preferSharps, degreeLabels = null }) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootLetter = rootName[0];
  const rootIdx = Math.max(0, LETTERS.indexOf(rootLetter));

  return chordIntervals.map((interval, idx) => {
    const fromLabel = Array.isArray(degreeLabels) ? chordDegreeNumberFromLabel(degreeLabels[idx]) : null;
    const deg = fromLabel ?? chordDegreeNumberFromInterval(interval);
    const letter = LETTERS[(rootIdx + (deg - 1)) % 7];
    const pc = mod12(rootPc + interval);
    return spellPcWithLetter(pc, letter);
  });
}

export function spellFullyDiminishedSeventhNotes({ rootPc, preferSharps }) {
  const rootName = pcToName(rootPc, preferSharps);
  const rootLetter = rootName[0];
  const rootIdx = Math.max(0, LETTERS.indexOf(rootLetter));
  const intervals = [0, 3, 6, 9];
  const degreeOffsets = [0, 2, 4, 6]; // 1, b3, b5, bb7

  return intervals.map((interval, idx) => {
    const letter = LETTERS[(rootIdx + degreeOffsets[idx]) % 7];
    const pc = mod12(rootPc + interval);
    return spellPcWithLetter(pc, letter);
  });
}

export function parseTokensToIntervals({ input, rootPc }) {
  const clean = String(input || "").replace(/,/g, " ").trim();
  const raw = clean ? clean.split(/ +/).map((x) => x.trim()).filter(Boolean) : [];

  const intervals = [];
  for (const tok of raw) {
    // Semitonos explícitos: s0..s11 (ej: s3)
    const sm = tok.match(/^s(-?[0-9]+)$/i);
    if (sm) {
      intervals.push(mod12(parseInt(sm[1], 10)));
      continue;
    }

    // Grados (1..7, con b/#): 1, b3, #4...
    const degSemi = degreeTokenToSemitones(tok);
    if (degSemi !== null) {
      intervals.push(degSemi);
      continue;
    }

    // Semitonos puros (0..11). Ojo: 1..7 se tratan como grados arriba.
    if (/^-?[0-9]+$/.test(tok)) {
      const n = parseInt(tok, 10);
      if (Number.isFinite(n)) intervals.push(mod12(n));
      continue;
    }

    // Notas (F, Ab, C#...)
    const pc = noteNameToPc(tok);
    if (pc !== null) {
      intervals.push(mod12(pc - rootPc));
      continue;
    }
  }

  // La raíz siempre está
  intervals.push(0);
  return Array.from(new Set(intervals.map(mod12))).sort((a, b) => a - b);
}

export function normalizeScaleName(name) {
  return SCALE_NAME_ALIASES[name] || name;
}

export function buildScaleIntervalLabels(scaleName, scaleIntervals) {
  const normalized = normalizeScaleName(scaleName || "");
  const override = SCALE_INTERVAL_LABEL_OVERRIDES[normalized];
  if (Array.isArray(override) && override.length === (scaleIntervals || []).length) return [...override];
  return (scaleIntervals || []).map((i) => intervalToDegreeToken(i));
}

export function scaleOptionLabel(name) {
  const ints = SCALE_PRESETS[name];
  if (!Array.isArray(ints)) return name;
  return `${name} (${buildScaleIntervalLabels(name, ints).join(" ")})`;
}

export function buildScaleIntervals(scaleName, customInput, rootPc) {
  const preset = SCALE_PRESETS[normalizeScaleName(scaleName)];
  if (preset) return preset;
  return parseTokensToIntervals({ input: customInput, rootPc });
}

export function pickThirdOffsets(intervals) {
  const set = new Set(intervals.map(mod12));
  const thirds = [];
  if (set.has(3)) thirds.push(3);
  if (set.has(4)) thirds.push(4);
  return thirds;
}

export function hexToRgb(hex) {
  const h = (hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

export function rgba(hex, a) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

export const FRET_CELL_BG = "rgba(248, 250, 252, 0.72)";
export const FRET_INLAY_BG = "var(--fret-inlay-bg, #9fc0d4)";

export function isDark(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const y = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return y < 0.55;
}

export function parsePosCode(code) {
  // <cuerda><traste> ej: 11 => cuerda 1 traste 1; 610 => cuerda 6 traste 10
  const s = String(code || "").trim();
  const m = s.match(/^([1-6])([0-9]{1,2})$/);
  if (!m) return null;
  const stringNumber = parseInt(m[1], 10);
  const fret = parseInt(m[2], 10);
  if (!Number.isFinite(fret) || fret < 0 || fret > 24) return null;
  return { stringNumber, sIdx: stringNumber - 1, fret };
}

export function sanitizePosCodeInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 3);
}

export function positionsForPitch(pitch, maxFret) {
  const out = [];
  for (let sIdx = 0; sIdx < 6; sIdx++) {
    const fret = pitch - OPEN_MIDI[sIdx];
    if (Number.isInteger(fret) && fret >= 0 && fret <= maxFret) {
      out.push({ sIdx, fret, pc: mod12(STRINGS[sIdx].pc + fret) });
    }
  }
  return out;
}

export function findRootFretsOnLowE(rootPc, maxFret) {
  const lowE = STRINGS[5].pc;
  const out = [];
  for (let fret = 0; fret <= maxFret; fret++) {
    if (mod12(lowE + fret) === mod12(rootPc)) out.push(fret);
  }
  return out;
}

export function buildMembershipMap(patterns) {
  const map = new Map();
  for (const p of patterns) {
    for (const key of p.cells) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p.idx);
    }
  }
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => a - b);
    map.set(k, arr);
  }
  return map;
}

// --------------------------------------------------------------------------
// BLOQUE: ARMADURA / AUTO-NOTACIÓN (# / b)
// --------------------------------------------------------------------------

// ------------------------
// Auto armadura (#/b)
// ------------------------
export function getParentMajorTonicPc({ rootPc, scaleName }) {
  // Modos: tonic del mayor (jónico) que comparte armadura.
  // Dórica = 2º grado, etc.
  const modeDegreeByName = {
    "Jónica (Ionian)": 1,
    "Dórica (Dorian)": 2,
    "Frigia (Phrygian)": 3,
    "Lidia (Lydian)": 4,
    "Mixolidia (Mixolydian)": 5,
    "Eólica (Aeolian)": 6,
    "Locria (Locrian)": 7,
  };

  if (scaleName === "Mayor") return rootPc;
  if (scaleName === "Pentatónica mayor") return rootPc;

  // Menores: armadura de la relativa mayor
  if (scaleName === "Menor natural" || scaleName === "Pentatónica menor") {
    return mod12(rootPc + 3);
  }

  if (modeDegreeByName[scaleName]) {
    const deg = modeDegreeByName[scaleName];
    return mod12(rootPc - IONIAN_INTERVALS[deg - 1]);
  }

  // Personalizada: no sabemos
  return rootPc;
}

export function preferSharpsFromMajorTonicPc(tonicPc) {
  // Heurística "armadura típica" (mayor).
  // Flats: F, Bb, Eb, Ab, Db
  // Sharps: G, D, A, E, B
  // Ambiguos (F#/Gb, C#/Db) se deciden por convención simple.
  const flats = new Set([5, 10, 3, 8, 1]);
  const sharps = new Set([7, 2, 9, 4, 11]);
  if (flats.has(tonicPc)) return false;
  if (sharps.has(tonicPc)) return true;
  if (tonicPc === 6) return true; // F# vs Gb (tie)
  return true; // C o por defecto
}

export function computeAutoPreferSharps({ rootPc, scaleName }) {
  const parent = getParentMajorTonicPc({ rootPc, scaleName });
  return preferSharpsFromMajorTonicPc(parent);
}

export const MAJOR_KEY_SIGNATURES = {
  0: { type: null, count: 0 },
  7: { type: "sharp", count: 1 },
  2: { type: "sharp", count: 2 },
  9: { type: "sharp", count: 3 },
  4: { type: "sharp", count: 4 },
  11: { type: "sharp", count: 5 },
  6: { type: "sharp", count: 6 },
  1: { type: "flat", count: 5 },
  5: { type: "flat", count: 1 },
  10: { type: "flat", count: 2 },
  3: { type: "flat", count: 3 },
  8: { type: "flat", count: 4 },
};

export const SCALE_NAMES_WITH_KEY_SIGNATURE = new Set([
  "Mayor",
  "Menor natural",
  "Menor armónica",
  "Menor melódica (asc)",
  "Pentatónica mayor",
  "Pentatónica menor",
  "Pentatónica mayor + blue note",
  "Pentatónica menor + blue note",
  "Jónica (Ionian)",
  "Dórica (Dorian)",
  "Frigia (Phrygian)",
  "Lidia (Lydian)",
  "Mixolidia (Mixolydian)",
  "Eólica (Aeolian)",
  "Locria (Locrian)",
]);

export function keySignatureParentMajorTonicPc({ rootPc, scaleName }) {
  const normalized = normalizeScaleName(scaleName);
  if (!SCALE_NAMES_WITH_KEY_SIGNATURE.has(normalized)) return null;
  if (normalized === "Menor armónica" || normalized === "Menor melódica (asc)") return mod12(rootPc + 3);
  if (normalized === "Pentatónica mayor + blue note") return rootPc;
  if (normalized === "Pentatónica menor + blue note") return mod12(rootPc + 3);
  return getParentMajorTonicPc({ rootPc, scaleName: normalized });
}

export function resolveKeySignatureForScale({ rootPc, scaleName }) {
  const parentMajorPc = keySignatureParentMajorTonicPc({ rootPc, scaleName });
  if (parentMajorPc == null) return null;
  const spec = MAJOR_KEY_SIGNATURES[parentMajorPc];
  if (!spec || !spec.count) return { type: null, count: 0, tonicPc: parentMajorPc };
  return { ...spec, tonicPc: parentMajorPc };
}
