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
 *
 * Invariante global (automática en todos los casos):
 *   Ningún candidato con uiPatch puede tener structure="tetrad" sin ext7 ni ext6.
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
    description: "x132xx — primary Fadd11(no5)/Bb: voicing copiado conserva x132xx, no sustituye por 11x2xx",
    motivo: "El patrón físico del mástil debe viajar con la copia; si el generador no lo produce, se inyecta como opción (copiado) en el selector.",
    fretsPattern: "x132xx",
    expectPrimaryName: "Fadd11(no5)/Bb",
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
    description: "Notas F,A,Bb/Bb — primary Fadd11(no5)/Bb: structure=chord, ext11=true, omit=5",
    motivo: "Bug fix: al copiar Fadd11(no5)/Bb, el omit=5 se perdía porque detectOmitFromCandidate no leía missingLabels en candidatos de catálogo",
    notes: ["F", "A", "Bb"],
    bass: "Bb",
    expectPrimaryName: "Fadd11(no5)/Bb",
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
  };
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
