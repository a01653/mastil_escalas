/**
 * Auditoría del flujo "Investigar en mástil → Copiar en Acorde".
 *
 * Cada caso especifica la entrada como:
 *   - fretsPattern: string  → analyzeFretsCore (patrón físico de guitarra)
 *   - notes + bass: []      → analyzeSelectedNotes (notas por nombre)
 *
 * Selección del candidato objetivo — MUTUAMENTE EXCLUYENTES entre sí:
 *
 *   expectPrimaryName: string
 *     Valida que la lectura PRIMARIA tenga exactamente ese nombre.
 *     FAIL inmediato si no coincide. El candidato objetivo es la primaria.
 *
 *   expectCandidateName: string
 *     Busca un candidato SECUNDARIO con ese nombre EXACTO en la lista completa.
 *     La lectura primaria se muestra en el informe pero NO se valida.
 *     FAIL si no se encuentra el candidato.
 *
 *   expectCandidateIncludes: RegExp
 *     Busca un candidato SECUNDARIO cuyo nombre encaje con el regex.
 *     Útil cuando el nombre es parcialmente conocido (e.g. /addb2/).
 *     FAIL si no se encuentra y no es expectBlocked (si es blocked, WARNING).
 *
 * Otros campos:
 *   motivo: string          — razón de existencia del caso; aparece en consola e informe
 *   expectBlocked: bool     — el candidato esperado debe tener uiPatch=null
 *   expectUiPatch: bool     — el candidato debe tener uiPatch habilitado (= !null)
 *   expectStructure: string — "chord" | "tetrad" | "triad"
 *   expectQuality: string   — "maj" | "dom" | "min" | "minmaj7" | ...
 *   expectExt7/9/11/13: bool
 *   expectOmit: string      — "none" | "5" | "3" | "1"
 *   expectFifth: string     — "b5" | "5" | "#5" (alteración normalizada de la copia)
 *   expectNinth: string     — "b9" | "9" | "#9"
 *   expectFollows: string   — el candidato va inmediatamente detrás de esa lectura
 *   expectNoCandidateMatching: RegExp — ninguna lectura puede encajar con el patrón
 *
 * Invariantes globales (automáticas en todos los casos):
 *   - Ningún candidato con uiPatch puede tener structure="tetrad" sin ext7 ni ext6.
 *   - ALTERATION_LOST: toda lectura copiable reproduce en el constructor exactamente
 *     sus notas (ni pierde una alteración ni añade notas, salvo los grados que la
 *     propia lectura declara ausentes).
 *
 * Uso:
 *   npm run audit:copy-readings
 *   node scripts/auditCopyReadings.mjs [--json]
 */

import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import {
  analyzeSelectedNotes,
  detectOmitFromCandidate,
} from "../src/music/chordDetectionEngine.js";
import { analyzeFretsCore } from "../src/music/analyzeFretsCore.js";
import { buildChordToneDefinition, normalizeChordUiSpec } from "../src/music/appMusicBasics.js";
import { parseFretString } from "../src/music/parseFretString.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");
const REPORTS_DIR = join(ROOT, "reports");

const useJson = process.argv.includes("--json");

// ─── Colores ANSI ────────────────────────────────────────────────────────────
const R     = "\x1b[0m";
const BOLD  = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const AMBER = "\x1b[33m";
const DIM   = "\x1b[2m";
const CYAN  = "\x1b[36m";

// ─── Casos de prueba ─────────────────────────────────────────────────────────
//
// REGLAS:
//   - fretsPattern → notas derivadas de analyzeFretsCore; nunca hardcodeadas.
//   - expectPrimaryName → valida la primary exacta; no mezclar con candidato secundario.
//   - expectCandidateName / expectCandidateIncludes → candidato secundario.
//   - motivo → razón del caso; describe qué invariante o bug cubre.

const CASES = [
  // ── Patrones físicos de guitarra (fretsPattern → analyzeFretsCore) ─────────

  {
    id: "P1",
    description: "1x22x3 — primary Fmaj7(add9,no5): structure=chord, ext7+ext9, omit=5",
    motivo: "Valida primary desde patrón físico; maj7(add9) sin 5ª usa structure=chord y omit=5 al copiar",
    fretsPattern: "1x22x3",
    expectPrimaryName: "Fmaj7(add9,no5)",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: true,
    expectExt9: true,
    expectOmit: "5",
  },
  {
    id: "P2",
    description: "1x2233 — primary Dm(add9,11)/F: structure=chord, ext9+ext11",
    motivo: "Valida primary desde patrón físico; add9+11 menor usa structure=chord sin 7ª",
    fretsPattern: "1x2233",
    expectPrimaryName: "Dm(add9,11)/F",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt9: true,
    expectExt11: true,
    expectOmit: "none",
  },
  {
    id: "P3",
    description: "1x2233 — candidato secundario Em7(addb2,...)/F: b2 no representable → uiPatch=null",
    motivo: "Valida bloqueo de candidato: addb2 no es representable en Acordes → botón Copiar deshabilitado",
    fretsPattern: "1x2233",
    expectCandidateIncludes: /Em7.*addb2/,
    expectBlocked: true,
    expectUiPatch: false,
  },
  {
    id: "P4",
    description: "x8x755 — primary Fmaj7(add13,no5): structure=chord, ext7+ext13, omit=5",
    motivo: "Valida primary desde patrón físico; maj7(add13,no5) con omit=5 detectado correctamente",
    fretsPattern: "x8x755",
    expectPrimaryName: "Fmaj7(add13,no5)",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: true,
    expectExt13: true,
    expectOmit: "5",
  },
  {
    id: "P5",
    description: "x8x755 — candidato secundario Dm(add9)/F: structure=chord, ext9, uiPatch habilitado",
    motivo: "Valida que candidato secundario Dm(add9)/F es copiable desde el mismo patrón que P4",
    fretsPattern: "x8x755",
    expectCandidateName: "Dm(add9)/F",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt9: true,
    expectOmit: "none",
  },
  {
    id: "P6",
    description: "6x678x — primary Bb7(add13,no5): structure=chord, ext7+ext13, omit=5",
    motivo: "Valida primary desde patrón físico; dominante 7(add13,no5) con omit=5",
    fretsPattern: "6x678x",
    expectPrimaryName: "Bb7(add13,no5)",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: true,
    expectExt13: true,
    expectOmit: "5",
  },
  {
    id: "P7",
    description: "1x223x — primary Fmaj7(add13,no5): structure=chord, ext7+ext13, omit=5",
    motivo: "Valida primary desde patrón físico; notas F E A D → la primary es Fmaj7(add13,no5), no Dm(add9)/F",
    fretsPattern: "1x223x",
    expectPrimaryName: "Fmaj7(add13,no5)",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: true,
    expectExt13: true,
    expectOmit: "5",
  },
  {
    id: "P8",
    description: "1x223x — candidato secundario Dm(add9)/F: structure=chord, ext9, uiPatch habilitado",
    motivo: "Valida que candidato secundario Dm(add9)/F es copiable desde el mismo patrón que P7",
    fretsPattern: "1x223x",
    expectCandidateName: "Dm(add9)/F",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt9: true,
    expectOmit: "none",
  },

  {
    id: "P9",
    description: "x132xx — candidato Fadd11(no5)/Bb: voicing copiado conserva x132xx, no sustituye por 11x2xx",
    motivo: "Primary ahora es Bbmaj7(no3) (ui:null). Fadd11(no5)/Bb es candidato secundario copiable; el voicing físico x132xx debe conservarse y no normalizarse a 11x2xx.",
    fretsPattern: "x132xx",
    expectCandidateName: "Fadd11(no5)/Bb",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: false,
    expectExt11: true,
    expectOmit: "5",
    expectCopiedVoicingPattern: "x132xx",
    forbiddenCopiedPattern: "11x2xx",
  },
  {
    id: "P10",
    description: "x422xx — primary A/C#: voicing copiado conserva x422xx, no normaliza a 542xxx",
    motivo: "x422xx y 542xxx comparten pitch set, pero Copiar en Acorde debe preservar la digitación física origen.",
    fretsPattern: "x422xx",
    expectPrimaryName: "A/C#",
    expectUiPatch: true,
    expectStructure: "triad",
    expectOmit: "none",
    expectCopiedVoicingPattern: "x422xx",
    forbiddenCopiedPattern: "542xxx",
  },
  {
    id: "P11",
    description: "2232xx — primary F#m(maj7,add11,no5): conserva maj7 real y el voicing 2232xx",
    motivo: "Un m(maj7) no puede degradarse a m7 al copiar: debe mantener 7 mayor, add11 y la digitación física original.",
    fretsPattern: "2232xx",
    expectPrimaryName: "F#m(maj7,add11,no5)",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: true,
    expectExt11: true,
    expectOmit: "5",
    expectQuality: "minmaj7",
    expectCopiedVoicingPattern: "2232xx",
    forbiddenCopiedPattern: "2x223x",
  },

  // ── Notas directas (analyzeSelectedNotes) ─────────────────────────────────

  {
    id: "N-A1",
    description: "Notas D,F,A,E/F — candidato secundario Dm(add9)/F: structure=chord, ext9=true",
    motivo: "Caso A: add9 menor no debe degradar a structure=tetrad aunque la primary sea otra lectura",
    notes: ["D", "F", "A", "E"],
    bass: "F",
    expectCandidateName: "Dm(add9)/F",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: false,
    expectExt9: true,
    expectOmit: "none",
  },
  {
    id: "N-A2",
    description: "Notas C,E,G,D/C — primary Cadd9: structure=chord, ext9=true, ext7=false",
    motivo: "Valida add9 mayor como primary: structure=chord con ext9 activo y ext7 inactivo",
    notes: ["C", "E", "G", "D"],
    bass: "C",
    expectPrimaryName: "Cadd9",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: false,
    expectExt9: true,
  },
  {
    id: "N-A3",
    description: "Notas C,E,F,G/C — primary Cadd11: structure=chord, ext11=true, ext7=false",
    motivo: "Valida add11 mayor como primary: structure=chord con ext11 activo y ext7 inactivo",
    notes: ["C", "E", "F", "G"],
    bass: "C",
    expectPrimaryName: "Cadd11",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: false,
    expectExt11: true,
  },
  {
    id: "N-A4",
    description: "Notas D,F,G,A/D — primary Dm(add11): structure=chord, ext11=true",
    motivo: "Valida add11 menor como primary: structure=chord con ext11 activo y ext7 inactivo",
    notes: ["D", "F", "G", "A"],
    bass: "D",
    expectPrimaryName: "Dm(add11)",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: false,
    expectExt11: true,
  },
  {
    id: "N-B",
    description: "Notas D,F,A,E,G/F — primary Dm(add9,11)/F: uiPatch habilitado, ext9+ext11",
    motivo: "Control positivo: add9+11 menor es primary copiable con uiPatch correcto",
    notes: ["D", "F", "A", "E", "G"],
    bass: "F",
    expectPrimaryName: "Dm(add9,11)/F",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt9: true,
    expectExt11: true,
  },
  {
    id: "N-C",
    description: "Notas E,F,G,A,D/F — candidato secundario Em7(addb2,...): b2 no representable → uiPatch=null",
    motivo: "Caso C: extensión addb2 no es representable en Acordes → botón Copiar debe estar deshabilitado",
    notes: ["E", "F", "G", "A", "D"],
    bass: "F",
    expectCandidateIncludes: /addb2/,
    expectBlocked: true,
    expectUiPatch: false,
  },
  {
    id: "N-D1",
    description: "Notas F,A,C,D,E/F — primary Fmaj7(add13): uiPatch habilitado, ext7+ext13",
    motivo: "Caso D: maj7(add13) completo (con 5ª) debe tener uiPatch habilitado; era null antes del fix",
    notes: ["F", "A", "C", "D", "E"],
    bass: "F",
    expectPrimaryName: "Fmaj7(add13)",
    expectUiPatch: true,
    expectExt7: true,
    expectExt13: true,
  },
  {
    id: "N-D2",
    description: "Notas F,A,D,E/F — primary Fmaj7(add13,no5): uiPatch habilitado, omit=5",
    motivo: "Caso D: maj7(add13,no5) primary; omit=5 debe derivarse del sufijo 'no5' del candidato",
    notes: ["F", "A", "D", "E"],
    bass: "F",
    expectPrimaryName: "Fmaj7(add13,no5)",
    expectUiPatch: true,
    expectExt7: true,
    expectExt13: true,
    expectOmit: "5",
  },
  {
    id: "N-D3",
    description: "Notas F,G,A,C,D,E/F — candidato secundario Fmaj13: uiPatch habilitado, ext7+ext9+ext13",
    motivo: "Caso D: Fmaj13 completo (con 5ª) debe ser copiable como candidato secundario",
    notes: ["F", "G", "A", "C", "D", "E"],
    bass: "F",
    expectCandidateName: "Fmaj13",
    expectUiPatch: true,
    expectExt7: true,
    expectExt9: true,
    expectExt13: true,
  },
  {
    id: "N-D4",
    description: "Notas F,G,A,D,E/F — candidato secundario Fmaj13(no5): uiPatch habilitado, omit=5",
    motivo: "Caso D: Fmaj13(no5) debe ser copiable como candidato secundario; omit=5 derivado del sufijo",
    notes: ["F", "G", "A", "D", "E"],
    bass: "F",
    expectCandidateName: "Fmaj13(no5)",
    expectUiPatch: true,
    expectOmit: "5",
  },
  {
    id: "N-E1",
    description: "Notas Bb,Ab,D,G/Bb — primary Bb7(add13,no5): uiPatch habilitado, omit=5, ext13",
    motivo: "Valida dom7(add13,no5) como primary copiable; omit=5 y ext13 deben pasarse al copiar",
    notes: ["Bb", "Ab", "D", "G"],
    bass: "Bb",
    expectPrimaryName: "Bb7(add13,no5)",
    expectUiPatch: true,
    expectExt7: true,
    expectExt13: true,
    expectOmit: "5",
  },
  {
    id: "N-F1",
    description: "Notas F,A,Bb/Bb — candidato Fadd11(no5)/Bb: structure=chord, ext11=true, omit=5",
    motivo: "Bug fix: al copiar Fadd11(no5)/Bb, el omit=5 se perdía. Primary ahora es Bbmaj7(no3) (ui:null); Fadd11(no5)/Bb es candidato secundario y debe preservar omit=5 al copiar.",
    notes: ["F", "A", "Bb"],
    bass: "Bb",
    expectCandidateName: "Fadd11(no5)/Bb",
    expectUiPatch: true,
    expectStructure: "chord",
    expectExt7: false,
    expectExt11: true,
    expectOmit: "5",
  },
  {
    id: "N-G1",
    description: "Notas A,C,E,F,G/A — candidato secundario Am7(b13): b13 no representable → uiPatch=null",
    motivo: "Valida bloqueo de candidato: b13 (extensión alterada) no es representable → botón Copiar deshabilitado",
    notes: ["A", "C", "E", "F", "G"],
    bass: "A",
    expectCandidateIncludes: /b13|b6/,
    expectBlocked: true,
    expectUiPatch: false,
  },
  {
    id: "N-H1",
    description: "43x24x → candidato Cm6(no5)/Ab: spellPreferSharps=false (Ab, no G#)",
    motivo: "Bug fix: bajo enarmónico en slash externo (Ab/G#) debe conservar el spelling del candidato " +
      "(spellPreferSharps=false) para que Modo automático muestre 'Bajo b6' no 'Bajo #5'. " +
      "La primary del patrón es Abaddb2 (uiPatch=null); Cm6(no5)/Ab es candidato secundario copiable.",
    fretsPattern: "43x24x",
    expectCandidateName: "Cm6(no5)/Ab",
    expectUiPatch: true,
    expectSpellPreferSharps: false,
    expectExt6: true,
    expectOmit: "5",
    expectCopiedVoicingPattern: "43x24x",
  },

  // ── Quinta y novena alteradas (encargo "variantes de acordes") ─────────────
  {
    id: "ALT-1",
    description: "x54545 → D7(b9): Dominante, Acorde, ext7+ext9, novena b9",
    motivo: "La b2 de un dominante es b9 (no addb2) y la copia conserva la novena alterada",
    fretsPattern: "x54545",
    expectPrimaryName: "D7(b9)",
    expectUiPatch: true,
    expectQuality: "dom", expectStructure: "chord", expectExt7: true, expectExt9: true,
    expectFifth: "5", expectNinth: "b9", expectOmit: "none",
  },
  {
    id: "ALT-2",
    description: "x5454x → D7(b9,no5): cuatriada con Omitir 5",
    motivo: "Voicing de 4 notas sin 5ª: se copia con omit=5 y conserva la b9",
    fretsPattern: "x5454x",
    expectPrimaryName: "D7(b9,no5)",
    expectUiPatch: true,
    expectQuality: "dom", expectExt7: true, expectExt9: true,
    expectNinth: "b9", expectOmit: "5",
  },
  {
    id: "ALT-3",
    description: "x76787 → E7(#9) con quinta (Hendrix completo)",
    motivo: "Con la 5ª presente el nombre no lleva no5; la #9 convive con la 3ª mayor",
    fretsPattern: "x76787",
    expectPrimaryName: "E7(#9)",
    expectUiPatch: true,
    expectQuality: "dom", expectExt9: true, expectNinth: "#9", expectOmit: "none",
  },
  {
    id: "ALT-4",
    description: "x7678x → E7(#9,no5): Hendrix sin quinta",
    motivo: "no5 solo cuando realmente falta la 5ª; la copia lleva omit=5 y #9",
    fretsPattern: "x7678x",
    expectPrimaryName: "E7(#9,no5)",
    expectUiPatch: true,
    expectQuality: "dom", expectExt9: true, expectNinth: "#9", expectOmit: "5",
  },
  {
    id: "ALT-5",
    description: "3x3444 → G7(#5,b9) (= G+7(b9))",
    motivo: "Sin 5ª justa la b6 es #5; combinación #5 + b9 copiable",
    fretsPattern: "3x3444",
    expectPrimaryName: "G7(#5,b9)",
    expectUiPatch: true,
    expectQuality: "dom", expectStructure: "chord", expectExt9: true,
    expectFifth: "#5", expectNinth: "b9", expectOmit: "none",
  },
  {
    id: "ALT-6",
    description: "3x344x → G7(#5): cuatriada con quinta aumentada",
    motivo: "La #5 sustituye a la 5ª justa y se copia como alteración de quinta",
    fretsPattern: "3x344x",
    expectPrimaryName: "G7(#5)",
    expectUiPatch: true,
    expectQuality: "dom", expectExt7: true, expectFifth: "#5", expectNinth: "9", expectOmit: "none",
  },
  {
    id: "ALT-7",
    description: "x3435x → C7(b5)",
    motivo: "La b5 sin 5ª justa en un dominante es quinta disminuida copiable (antes se perdía)",
    fretsPattern: "x3435x",
    expectPrimaryName: "C7(b5)",
    expectUiPatch: true,
    expectQuality: "dom", expectFifth: "b5", expectOmit: "none",
  },
  {
    id: "ALT-8",
    description: "x0101x → Am7(b5)",
    motivo: "Regresión: semidisminuido con b5 propia de la calidad",
    fretsPattern: "x0101x",
    expectPrimaryName: "Am7(b5)",
    expectUiPatch: true,
    expectQuality: "hdim", expectFifth: "b5", expectNinth: "9",
  },
  {
    id: "ALT-9",
    description: "1x010x → Fdim7",
    motivo: "Regresión: dim7 con bb7 (no 6)",
    fretsPattern: "1x010x",
    expectPrimaryName: "Fdim7",
    expectUiPatch: true,
    expectQuality: "dim", expectFifth: "b5",
  },
  {
    id: "ALT-10",
    description: "x5758x → D7sus4 (Re–Sol–La–Do)",
    motivo: "Regresión de suspendidos: 7sus4 copiable",
    fretsPattern: "x5758x",
    expectPrimaryName: "D7sus4",
    expectUiPatch: true,
    expectQuality: "dom", expectExt7: true,
  },
  {
    id: "ALT-11",
    description: "C,E,G,Bb,D,F# → C7(#11,add9) no copiable",
    motivo: "#11 queda fuera de esta fase: la lectura se muestra pero no se copia perdiendo la tensión",
    notes: ["C", "E", "G", "Bb", "D", "F#"],
    bass: "C",
    expectPrimaryName: "C7(#11,add9)",
    expectBlocked: true,
    expectUiPatch: false,
  },
  {
    id: "ALT-12",
    description: "1x422x → Gbm(maj7)/F (no Dbaug(add11)/F)",
    motivo: "Regresión: la tríada aumentada heurística sin 7ª adelantaba un encuadre forzado a la lectura natural",
    fretsPattern: "1x422x",
    expectPrimaryName: "Gbm(maj7)/F",
    expectUiPatch: true,
    expectQuality: "minmaj7",
  },
  {
    id: "ALT-13",
    description: "C,Eb,G,B / C → Cm(maj7) (no Baug/C)",
    motivo: "Regresión: la tríada aumentada sobre bajo ajeno no recibe la bonificación de tríada sobre bajo",
    notes: ["C", "Eb", "G", "B"],
    bass: "C",
    expectPrimaryName: "Cm(maj7)",
    expectUiPatch: true,
    expectQuality: "minmaj7",
  },
  {
    id: "ALT-14",
    description: "C,E,G,Ab,Bb / G → C7(b13)/G (no Abmaj7(#5,add9)/G)",
    motivo: "Con 5ª justa la b6 es b13; maj7(#5) con tensiones no adelanta a la lectura canónica",
    notes: ["C", "E", "G", "Ab", "Bb"],
    bass: "G",
    expectPrimaryName: "C7(b13)/G",
  },
  {
    id: "ALT-15",
    description: "C,E,G#,Bb,D# / C → alternativa C7(#9,b13,no5) visible y no copiable",
    motivo: "Sin 5ª justa la ♯5 es la lectura principal (C7(#5,#9)), pero la ♭13 sin 5ª se conserva como alternativa; no se copia porque Acordes no representa ♭13 (nunca se convierte en ♯5)",
    notes: ["C", "E", "G#", "Bb", "D#"],
    bass: "C",
    expectCandidateName: "C7(#9,b13,no5)",
    expectBlocked: true,
    expectUiPatch: false,
  },
  {
    id: "ALT-16",
    description: "A,C,E,G,Bb / A → Am7(b9) copiable",
    motivo: "Con 7ª la ♭2 es la ♭9 también en Menor: la lectura se copia con novena ♭9 (antes Am7(addb2), bloqueada)",
    notes: ["A", "C", "E", "G", "Bb"],
    bass: "A",
    expectPrimaryName: "Am7(b9)",
    expectUiPatch: true,
    expectQuality: "min", expectStructure: "chord", expectExt7: true, expectExt9: true,
    expectFifth: "5", expectNinth: "b9", expectOmit: "none",
  },
  {
    id: "ALT-17",
    description: "C,E,G,B,D# / C → Cmaj7(#9) copiable",
    motivo: "♯9 sobre 3ª mayor sin 3ª menor: el constructor ya la representa en Mayor",
    notes: ["C", "E", "G", "B", "D#"],
    bass: "C",
    expectPrimaryName: "Cmaj7(#9)",
    expectUiPatch: true,
    expectQuality: "maj", expectExt7: true, expectExt9: true, expectNinth: "#9",
  },
  {
    id: "ALT-18",
    description: "A,C,Eb,G# / A → lectura Am(maj7,b5) copiable",
    motivo: "m(maj7,♭5) antes se leía dim(add7) y no se copiaba; mantiene su posición en el ranking",
    notes: ["A", "C", "Eb", "G#"],
    bass: "A",
    expectCandidateName: "Am(maj7,b5)",
    expectUiPatch: true,
    expectQuality: "minmaj7", expectExt7: true, expectFifth: "b5",
  },
  {
    id: "ALT-19",
    description: "A,C,E,Bb / A → Am(addb2) sin renombrar ni copiar",
    motivo: "Sin 7ª la ♭2 es un añadido (no se renombra toda ♭2 como ♭9)",
    notes: ["A", "C", "E", "Bb"],
    bass: "A",
    expectCandidateName: "Am(addb2)",
    expectBlocked: true,
    expectUiPatch: false,
  },
  {
    id: "ALT-20",
    description: "C,Eb,G#,Bb / C → Cm7(#5) copiable justo detrás de Cm7(b13,no5)",
    motivo: "Alternativa ♯5 de 3ª menor sin 5ª justa: nombre y grafía propios (G#), la lectura ♭13 se conserva",
    notes: ["C", "Eb", "G#", "Bb"],
    bass: "C",
    expectCandidateName: "Cm7(#5)",
    expectFollows: "Cm7(b13,no5)",
    expectUiPatch: true,
    expectQuality: "min", expectStructure: "tetrad", expectExt7: true, expectFifth: "#5",
  },
  {
    id: "ALT-21",
    description: "C,Eb,G# / C → Cm(#5) copiable justo detrás de Cm(addb13,no5); principal Ab/C",
    motivo: "La tríada menor con ♯5 se ofrece como alternativa sin cambiar la principal",
    notes: ["C", "Eb", "G#"],
    bass: "C",
    expectCandidateName: "Cm(#5)",
    expectFollows: "Cm(addb13,no5)",
    expectUiPatch: true,
    expectQuality: "min", expectStructure: "triad", expectExt7: false, expectFifth: "#5",
  },
  {
    id: "ALT-22",
    description: "C,Eb,G#,B / C → Cm(maj7,#5) copiable justo detrás de Cm(maj7,addb6,no5)",
    motivo: "m(maj7) con ♯5 sin 5ª justa: alternativa copiable de la lectura con ♭6",
    notes: ["C", "Eb", "G#", "B"],
    bass: "C",
    expectCandidateName: "Cm(maj7,#5)",
    expectFollows: "Cm(maj7,addb6,no5)",
    expectUiPatch: true,
    expectQuality: "minmaj7", expectStructure: "tetrad", expectExt7: true, expectFifth: "#5",
  },
  {
    id: "ALT-23",
    description: "C,Eb,G,Ab,Bb / C → Cm7(b13) sin alternativa ♯5 (suena la 5ª justa)",
    motivo: "Con 5ª justa la ♭6 es ♭13: no se ofrece una lectura ♯5 que eliminaría la 5ª",
    notes: ["C", "Eb", "G", "Ab", "Bb"],
    bass: "C",
    expectCandidateName: "Cm7(b13)",
    expectBlocked: true,
    expectUiPatch: false,
    expectNoCandidateMatching: /#5/,
  },
  {
    id: "ALT-24",
    description: "G,C,Eb,G#,Bb / G → sin Cm7(#5)/G (la 5ª justa está en el bajo)",
    motivo: "La alternativa ♯5 solo se ofrece con el bajo dentro del acorde",
    notes: ["G", "C", "Eb", "G#", "Bb"],
    bass: "G",
    expectNoCandidateMatching: /^Cm7\(#5\)/,
  },
];

// ─── Lógica de análisis ───────────────────────────────────────────────────────

// Normaliza un patrón físico de mástil al formato que produce buildManualSelectionVoicing.
// Para trastes 0-9 es identidad; para trastes ≥10 usa base36 (a=10, b=11, …).
function computeCopiedVoicingFrets(fretsPattern) {
  const { frets } = parseFretString(fretsPattern);
  return frets.map((f) => (f === null ? "x" : f.toString(36))).join("");
}

function getReadings(tc) {
  if (tc.fretsPattern) {
    const result = analyzeFretsCore(tc.fretsPattern);
    return {
      readings: result.rankedReadings,
      primary: result.primary,
      derivedNotes: result.noteNames,
    };
  }
  const result = analyzeSelectedNotes(tc.notes, tc.bass || null);
  return {
    readings: result.readings,
    primary: result.primary,
    derivedNotes: null,
  };
}

function simulateCopy(candidate) {
  if (!candidate?.uiPatch) return null;
  const p = candidate.uiPatch;
  return {
    rootPc: p.rootPc,
    quality: p.quality,
    suspension: p.suspension || "none",
    structure: p.structure,
    ext7: !!p.ext7,
    ext6: !!p.ext6,
    ext9: !!p.ext9,
    ext11: !!p.ext11,
    ext13: !!p.ext13,
    omit: detectOmitFromCandidate(candidate),
    ...(() => {
      const spec = normalizeChordUiSpec({ ...p, omit: detectOmitFromCandidate(candidate) });
      return { fifth: spec.fifth, ninth: spec.ninth };
    })(),
  };
}

// Notas que suenan en la lectura (sin bajo externo) frente a las que construiría Acordes.
function copyLosesOrInventsNotes(candidate) {
  if (!candidate?.uiPatch || candidate.uiPatch.family || candidate.formula?.quartal) return null;
  const sounding = [...new Set((candidate.visibleIntervals || []).map((i) => ((i % 12) + 12) % 12))];
  const formula = candidate.formula || {};
  const missing = (candidate.missingLabels || [])
    .map((label) => formula.intervals?.[formula.degreeLabels?.indexOf(label)])
    .filter((x) => x != null)
    .map((i) => ((i % 12) + 12) % 12);
  const built = buildChordToneDefinition({ ...candidate.uiPatch, omit: detectOmitFromCandidate(candidate) }).intervals;
  const lost = sounding.filter((i) => !built.includes(i));
  const invented = built.filter((i) => !sounding.includes(i) && !missing.includes(i));
  return lost.length || invented.length ? { lost, invented, built, sounding } : null;
}

function selectCandidate(tc, readings, primary, failures, warnings) {
  if (tc.expectPrimaryName !== undefined) {
    if (!primary) {
      failures.push(`No hay lectura primaria. Se esperaba "${tc.expectPrimaryName}".`);
      return null;
    }
    if (primary.name !== tc.expectPrimaryName) {
      failures.push(
        `Primary incorrecta: esperada "${tc.expectPrimaryName}", obtenida "${primary.name}". ` +
        `Candidatos: ${readings.map((r) => r.name).join(", ")}`
      );
      return primary;
    }
    return primary;
  }

  if (tc.expectCandidateName !== undefined) {
    const found = readings.find((r) => r.name === tc.expectCandidateName);
    if (!found) {
      failures.push(
        `Candidato secundario "${tc.expectCandidateName}" no encontrado. ` +
        `Candidatos: ${readings.map((r) => r.name).join(", ")}`
      );
    }
    return found ?? null;
  }

  if (tc.expectCandidateIncludes !== undefined) {
    const found = readings.find((r) => tc.expectCandidateIncludes.test(r.name));
    if (!found) {
      if (tc.expectBlocked) {
        warnings.push(
          `Candidato ${tc.expectCandidateIncludes} no aparece en el ranking ` +
          `(puede haber sido descartado antes de llegar a la lista).`
        );
        return null;
      }
      failures.push(
        `Candidato secundario /${tc.expectCandidateIncludes.source}/ no encontrado. ` +
        `Candidatos: ${readings.map((r) => r.name).join(", ")}`
      );
    }
    return found ?? null;
  }

  return primary;
}

function checkCase(tc) {
  const failures = [];
  const warnings = [];
  let readings, primary, derivedNotes;

  try {
    ({ readings, primary, derivedNotes } = getReadings(tc));
  } catch (err) {
    failures.push(`Error al obtener lecturas: ${err.message}`);
    return { tc, candidate: null, copy: null, primaryName: null, derivedNotes: null, readings: [], failures, warnings, pass: false };
  }

  const primaryName = primary?.name ?? null;
  const candidate = selectCandidate(tc, readings, primary, failures, warnings);

  // expectFollows: el candidato va inmediatamente detrás de esa lectura (alternativas ♯5/♭13).
  if (tc.expectFollows !== undefined && candidate) {
    const idx = readings.indexOf(candidate);
    if (idx < 1 || readings[idx - 1].name !== tc.expectFollows) {
      failures.push(`"${candidate.name}" debe ir justo después de "${tc.expectFollows}". Candidatos: ${readings.map((r) => r.name).join(", ")}`);
    }
  }
  // expectNoCandidateMatching: ninguna lectura puede encajar con el patrón.
  if (tc.expectNoCandidateMatching !== undefined) {
    const unexpected = readings.filter((r) => tc.expectNoCandidateMatching.test(r.name));
    if (unexpected.length) failures.push(`Lecturas no esperadas ${tc.expectNoCandidateMatching}: ${unexpected.map((r) => r.name).join(", ")}`);
  }

  if (candidate !== null) {
    if (tc.expectBlocked === true && candidate.uiPatch !== null && candidate.uiPatch !== undefined) {
      failures.push(`Se esperaba uiPatch=null (botón bloqueado) pero está habilitado. Se copiaría un acorde incompleto.`);
    }
    if (tc.expectUiPatch === true && !candidate.uiPatch) {
      failures.push(`Se esperaba uiPatch habilitado pero es null. El botón Copiar estaría deshabilitado.`);
    }
    if (tc.expectUiPatch === false && candidate.uiPatch) {
      failures.push(`Se esperaba uiPatch=null (bloqueado) pero está habilitado.`);
    }
    if (candidate.uiPatch?.structure === "tetrad" && !candidate.uiPatch.ext7 && !candidate.uiPatch.ext6) {
      failures.push(`INVARIANTE ROTA: uiPatch.structure="tetrad" sin ext7 ni ext6 → mostraría "No hay 7ª activa".`);
    }
  } else if (tc.expectUiPatch === true) {
    failures.push(`Candidato no encontrado — no se puede verificar uiPatch.`);
  }

  const copy = simulateCopy(candidate);

  if (copy) {
    if (tc.expectQuality && copy.quality !== tc.expectQuality)
      failures.push(`quality: esperada "${tc.expectQuality}", obtenida "${copy.quality}"`);
    if (tc.expectStructure && copy.structure !== tc.expectStructure)
      failures.push(`Estructura incorrecta: esperada "${tc.expectStructure}", obtenida "${copy.structure}"`);
    if (tc.expectExt7 !== undefined && copy.ext7 !== tc.expectExt7)
      failures.push(`ext7: esperado ${tc.expectExt7}, obtenido ${copy.ext7}`);
    if (tc.expectExt9 !== undefined && copy.ext9 !== tc.expectExt9)
      failures.push(`ext9: esperado ${tc.expectExt9}, obtenido ${copy.ext9}`);
    if (tc.expectExt11 !== undefined && copy.ext11 !== tc.expectExt11)
      failures.push(`ext11: esperado ${tc.expectExt11}, obtenido ${copy.ext11}`);
    if (tc.expectExt13 !== undefined && copy.ext13 !== tc.expectExt13)
      failures.push(`ext13: esperado ${tc.expectExt13}, obtenido ${copy.ext13}`);
    if (tc.expectOmit !== undefined && copy.omit !== tc.expectOmit)
      failures.push(`omit: esperado "${tc.expectOmit}", obtenido "${copy.omit}"`);
    if (tc.expectFifth !== undefined && copy.fifth !== tc.expectFifth)
      failures.push(`fifth: esperada "${tc.expectFifth}", obtenida "${copy.fifth}"`);
    if (tc.expectNinth !== undefined && copy.ninth !== tc.expectNinth)
      failures.push(`ninth: esperada "${tc.expectNinth}", obtenida "${copy.ninth}"`);
  }

  if (candidate?.uiPatch && tc.expectSpellPreferSharps !== undefined) {
    const actual = !!candidate.uiPatch.spellPreferSharps;
    if (actual !== tc.expectSpellPreferSharps)
      failures.push(`spellPreferSharps: esperado ${tc.expectSpellPreferSharps}, obtenido ${actual} — bajo enarmónico con spelling incorrecto`);
  }

  // Verificar que el voicing físico del mástil se conserva en la copia (solo para fretsPattern)
  if (tc.fretsPattern && (tc.expectCopiedVoicingPattern !== undefined || tc.forbiddenCopiedPattern !== undefined)) {
    const copiedFrets = computeCopiedVoicingFrets(tc.fretsPattern);
    if (tc.expectCopiedVoicingPattern !== undefined && copiedFrets !== tc.expectCopiedVoicingPattern) {
      failures.push(`Voicing copiado: esperado "${tc.expectCopiedVoicingPattern}", obtenido "${copiedFrets}"`);
    }
    if (tc.forbiddenCopiedPattern !== undefined && copiedFrets === tc.forbiddenCopiedPattern) {
      failures.push(`Voicing copiado es "${tc.forbiddenCopiedPattern}" (patrón prohibido — el generador habría sustituido la digitación original)`);
    }
  }

  for (const r of readings) {
    if (r.uiPatch?.structure === "tetrad" && !r.uiPatch.ext7 && !r.uiPatch.ext6) {
      failures.push(`INVARIANTE GLOBAL en lectura "${r.name}": structure=tetrad sin ext7 ni ext6.`);
    }
    const loss = copyLosesOrInventsNotes(r);
    if (loss) {
      failures.push(`ALTERATION_LOST en lectura "${r.name}": suena [${loss.sounding}] y Acordes construiría [${loss.built}] (pierde [${loss.lost}], añade [${loss.invented}])`);
    }
  }

  return { tc, candidate, copy, primaryName, derivedNotes, readings, failures, warnings, pass: failures.length === 0 };
}

// ─── Informe ──────────────────────────────────────────────────────────────────

function tipoSeleccion(tc) {
  if (tc.expectPrimaryName !== undefined) return "primary";
  if (tc.expectCandidateName !== undefined) return "2°candidato";
  if (tc.expectCandidateIncludes !== undefined) return "2°regex";
  return "primary";
}

function buildReport(results) {
  const total  = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;

  const mdLines = [
    "# Auditoría: Copiar lecturas a Acordes",
    "",
    `**Total**: ${total} | **PASS**: ${passed} | **FAIL**: ${failed}`,
    "",
    "| ID | Tipo | Entrada | Notas | Primary real | Esperado / Candidato buscado | Candidato obtenido | Estr. | Ext | Omit | Motivo | Resultado |",
    "|----|------|---------|-------|--------------|------------------------------|--------------------|-------|-----|------|--------|-----------|",
  ];

  for (const r of results) {
    const tipo     = tipoSeleccion(r.tc);
    const entrada  = r.tc.fretsPattern
      ? `\`${r.tc.fretsPattern}\``
      : r.tc.notes.join(",") + (r.tc.bass ? `/${r.tc.bass}` : "");
    const notas    = r.derivedNotes ? r.derivedNotes.join(" ") : (r.tc.notes?.join(" ") ?? "—");
    const primaryReal  = r.primaryName ?? "—";
    const expectLabel  = r.tc.expectPrimaryName
      ? `\`${r.tc.expectPrimaryName}\``
      : r.tc.expectCandidateName
        ? `\`${r.tc.expectCandidateName}\` (2°)`
        : r.tc.expectCandidateIncludes
          ? `/${r.tc.expectCandidateIncludes.source}/ (2°)`
          : "—";
    const candName = r.candidate?.name ?? (r.warnings.length ? "⚠ no encontrado" : "—");
    const struct   = r.copy?.structure ?? (r.candidate && !r.candidate.uiPatch ? "BLOQ." : "—");
    const exts     = r.copy
      ? [r.copy.ext7 && "7", r.copy.ext9 && "9", r.copy.ext11 && "11", r.copy.ext13 && "13", r.copy.ext6 && "6"].filter(Boolean).join(",") || "—"
      : "—";
    const omit     = r.copy?.omit ?? "—";
    const motivo   = r.tc.motivo ?? "—";
    const icon     = r.pass ? "✅" : "❌";
    const reason   = !r.pass ? ` ${r.failures.join("; ")}` : "";
    mdLines.push(
      `| ${r.tc.id} | ${tipo} | ${entrada} | ${notas} | ${primaryReal} | ${expectLabel} | ${candName} | ${struct} | ${exts} | ${omit} | ${motivo} | ${icon}${reason} |`
    );
  }

  if (results.some((r) => !r.pass)) {
    mdLines.push("", "## Detalle de fallos", "");
    for (const r of results.filter((r) => !r.pass)) {
      const entrada = r.tc.fretsPattern ?? r.tc.notes?.join(", ");
      mdLines.push(
        `### Caso ${r.tc.id}: ${r.tc.description}`,
        ...(r.tc.motivo ? [`- **Motivo**: ${r.tc.motivo}`] : []),
        `- **Entrada**: ${entrada}`,
        ...(r.derivedNotes ? [`- **Notas derivadas**: ${r.derivedNotes.join(" ")}`] : []),
        `- **Primary real**: ${r.primaryName ?? "(ninguna)"}`,
        `- **Candidatos**: ${r.readings.map((rd) => rd.name).join(", ")}`,
        `- **Candidato seleccionado**: ${r.candidate?.name ?? "(no encontrado)"}`,
        `- **Fallos**:`,
        ...r.failures.map((f) => `  - ${f}`),
        ...(r.warnings.length ? ["- **Advertencias**:", ...r.warnings.map((w) => `  - ${w}`)] : []),
        "",
      );
    }
  }

  const jsonData = {
    summary: { total, passed, failed },
    cases: results.map((r) => ({
      id: r.tc.id,
      description: r.tc.description,
      motivo: r.tc.motivo ?? null,
      tipoSeleccion: tipoSeleccion(r.tc),
      entrada: r.tc.fretsPattern ?? { notes: r.tc.notes, bass: r.tc.bass ?? null },
      derivedNotes: r.derivedNotes ?? null,
      primaryName: r.primaryName,
      expectPrimaryName: r.tc.expectPrimaryName ?? null,
      expectCandidateName: r.tc.expectCandidateName ?? null,
      expectCandidateIncludes: r.tc.expectCandidateIncludes?.source ?? null,
      candidateName: r.candidate?.name ?? null,
      copiedStructure: r.copy?.structure ?? null,
      copiedExt7: r.copy?.ext7 ?? null,
      copiedExt9: r.copy?.ext9 ?? null,
      copiedExt11: r.copy?.ext11 ?? null,
      copiedExt13: r.copy?.ext13 ?? null,
      copiedExt6: r.copy?.ext6 ?? null,
      copiedOmit: r.copy?.omit ?? null,
      uiPatchEnabled: !!r.candidate?.uiPatch,
      candidates: r.readings.map((rd) => rd.name),
      pass: r.pass,
      failures: r.failures,
      warnings: r.warnings,
    })),
  };

  return { md: mdLines.join("\n"), json: jsonData };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const results = CASES.map(checkCase);
const { md, json } = buildReport(results);

mkdirSync(REPORTS_DIR, { recursive: true });
writeFileSync(join(REPORTS_DIR, "copy-readings-audit.md"),   md,                            "utf8");
writeFileSync(join(REPORTS_DIR, "copy-readings-audit.json"), JSON.stringify(json, null, 2), "utf8");

if (useJson) {
  process.stdout.write(JSON.stringify(json, null, 2) + "\n");
} else {
  console.log(`\n${BOLD}Auditoría: Copiar lecturas a Acordes${R}\n`);
  for (const r of results) {
    const icon    = r.pass ? `${GREEN}✓${R}` : `${RED}✗${R}`;
    const tipo    = tipoSeleccion(r.tc);
    const entrada = r.tc.fretsPattern ?? r.tc.notes.join(",");
    const notas   = r.derivedNotes ? ` [notas: ${CYAN}${r.derivedNotes.join(" ")}${R}]` : "";
    const primary = r.primaryName ? ` primary=${CYAN}${r.primaryName}${R}` : "";
    const cand    = (tipo !== "primary" && r.candidate)
      ? ` 2°cand=${CYAN}${r.candidate.name}${R}` : "";
    const struct  = r.copy?.structure ? ` [${r.copy.structure}]`
      : (r.candidate && !r.candidate.uiPatch ? " [BLOQUEADO]" : "");

    console.log(`  ${icon} ${BOLD}${r.tc.id}${R} ${DIM}${r.tc.description}${R}`);
    console.log(`      ${AMBER}${entrada}${R}${notas}${primary}${cand}${struct}`);
    if (r.tc.motivo) console.log(`      ${DIM}↳ ${r.tc.motivo}${R}`);
    for (const f of r.failures) console.log(`      ${RED}✗ ${f}${R}`);
    for (const w of r.warnings) console.log(`      ${AMBER}⚠ ${w}${R}`);
  }

  const { passed, failed, total } = json.summary;
  const colorFn = failed === 0 ? GREEN : RED;
  console.log(`\n${colorFn}${BOLD}${passed}/${total} casos correctos${failed > 0 ? `, ${failed} fallos` : ""}${R}`);
  console.log(`${DIM}Informes guardados en reports/copy-readings-audit.{md,json}${R}\n`);
}

process.exit(results.every((r) => r.pass) ? 0 : 1);
