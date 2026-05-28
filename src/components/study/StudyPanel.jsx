import { useState, useEffect } from "react";
import { describeRelativeTertianChord } from "../../music/studyRelativeChord.js";
import * as AppMusicBasics from "../../music/appMusicBasics.js";
const {
  mod12, pcToName, pitchAt, spellNoteFromChordInterval,
  computeAutoPreferSharps, resolveKeySignatureForScale,
} = AppMusicBasics;
import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";
const {
  positionFormFromEffectiveForm, positionFormLabel, buildChordHeaderSummary,
  chordEngineLayerLabel, studyVoicingFormLabel, explainStudyRules,
  buildChordNamingExplanation, analyzeVoicingVsPlan, analyzeScaleTensionsForChord,
  buildDominantInfo, buildBackdoorDominantInfo, buildChordResolutionRoman,
  analyzeChordScaleCompatibility, buildStudyAnchorId, buildStudySubstitutionGuide,
  fnBuildQuartalDegreeLabel,
} = AppVoicingStudyCore;
import * as AppPatternRouteStaffCore from "../../music/appPatternRouteStaffCore.jsx";
const {
  escapeHtml, buildStudyOuterBlockHtml, buildMusicStaffSvgMarkup,
  buildStudyBadgeItemsFromPlan, buildPdfChordBadgeStripHtml,
  buildPdfCompactVoicingFretboardHtml, MusicStaff,
} = AppPatternRouteStaffCore;

export default function StudyPanel({ study, tonal, reference, chordContext, display, ui }) {
  const { studyData, studyOpen, setStudyOpen } = study;
  const {
    rootPc, autoPreferSharps, scaleName, scaleIntervals,
    scaleNotesText, harmonyMode, harmonizedScale,
  } = tonal;
  const { refChordDisplayName, chordRefEnabled } = reference;
  const { chordRootPc, chordPreferSharps } = chordContext;
  const { showIntervalsLabel, showNotesLabel, colors } = display;
  const { InfoTitle, CHORD_STUDY_INFO_TEXT, UI_BTN_SM } = ui;
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
const studyReadingRootName = pcToName(d?.rootPc ?? chordRootPc, d?.preferSharps ?? chordPreferSharps);
const resolutionRoman = buildChordResolutionRoman(d?.plan);
const studyPreferSharps = d?.preferSharps ?? chordPreferSharps;
const chordScaleCompat = analyzeChordScaleCompatibility({
  chordRootPc: d?.rootPc ?? chordRootPc,
  chordIntervals: d?.plan?.intervals || [],
  activeScaleRootPc: rootPc,
  scaleIntervals,
  scaleName,
  chordName: d?.chordName || "—",
  preferSharps: studyPreferSharps,
});
const dominantScaleCompat = analyzeChordScaleCompatibility({
  chordRootPc: dominant.rootPc,
  chordIntervals: [0, 4, 7, 10],
  activeScaleRootPc: rootPc,
  scaleIntervals,
  scaleName,
  chordName: dominant.name,
  preferSharps: studyPreferSharps,
});
const backdoorScaleCompat = analyzeChordScaleCompatibility({
  chordRootPc: backdoorDominant.rootPc,
  chordIntervals: [0, 4, 7, 10],
  activeScaleRootPc: rootPc,
  scaleIntervals,
  scaleName,
  chordName: backdoorDominant.name,
  preferSharps: studyPreferSharps,
});
const substitutionKeySignature = resolveKeySignatureForScale({ rootPc, scaleName }) || { type: null, count: 0 };
const substitutionSections = buildStudySubstitutionGuide({
  chordRootPc: d?.rootPc ?? chordRootPc,
  chordName: d?.chordName,
  plan: d?.plan,
  preferSharps: d?.preferSharps ?? chordPreferSharps,
  harmonizedScale,
  backdoorDominantInfo: backdoorDominant,
  scaleNotesText,
  scaleRootPc: rootPc,
  scaleName,
  harmonyMode,
  scaleIntervals,
});
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setStudySubstitutionSectionIdx(0);
}, [d?.title, d?.chordName]);
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
  ];

  const summaryCardsHtml = [
    {
      title: "Identidad",
      rows: [
        ["Nombre", d?.chordName || "—"],
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
  ].map((card) => (
    `<section class="pdf-card">` +
      `<h3>${escapeHtml(card.title)}</h3>` +
      `<div class="pdf-kv">` +
        card.rows.map(([label, value]) => `<div><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</div>`).join("") +
      `</div>` +
    `</section>`
  )).join("");

  const chordFunctionalIdentity = (() => {
    if (!chordScaleCompat.isDiatonic) return null;
    const chordRootLocal = d?.rootPc ?? chordRootPc;
    const intervalInScale = mod12(chordRootLocal - rootPc);
    const degreeIdx = (scaleIntervals || []).indexOf(intervalInScale);
    if (degreeIdx === -1) return null;
    const romanBases = ["I", "II", "III", "IV", "V", "VI", "VII"];
    const romanBase = romanBases[degreeIdx];
    if (!romanBase) return null;
    const plan = d?.plan;
    const quality = plan?.quality;
    const ivs = (plan?.intervals || []).map((iv) => mod12(iv));
    const hasMaj7 = ivs.includes(11);
    const hasMin7 = ivs.includes(10);
    let romanFull;
    if (quality === "maj") romanFull = hasMaj7 ? `${romanBase}maj7` : romanBase;
    else if (quality === "dom") romanFull = `${romanBase}7`;
    else if (quality === "min") romanFull = hasMin7 ? `${romanBase.toLowerCase()}m7` : `${romanBase.toLowerCase()}m`;
    else if (quality === "hdim") romanFull = `${romanBase.toLowerCase()}m7(b5)`;
    else if (quality === "dim") romanFull = `${romanBase.toLowerCase()}dim${hasMin7 ? "7" : ""}`;
    else romanFull = romanBase;
    const scaleRootNameLocal = pcToName(rootPc, computeAutoPreferSharps({ rootPc, scaleName }));
    const scaleLabelFull = `${scaleRootNameLocal} ${scaleName}`;
    const bassInterval = plan?.bassInterval;
    const bassIntervalMod = bassInterval != null ? mod12(bassInterval) : 0;
    const invMap = { 3: "1ª inv.", 4: "1ª inv.", 7: "2ª inv.", 10: "3ª inv.", 11: "3ª inv.", 9: "3ª inv." };
    let inversionText = null;
    if (bassIntervalMod !== 0 && invMap[bassIntervalMod]) {
      const bassNoteName = pcToName(mod12(chordRootLocal + bassIntervalMod), d?.preferSharps ?? chordPreferSharps);
      inversionText = `Bajo ${bassNoteName} = ${invMap[bassIntervalMod]} del ${romanFull}`;
    }
    return { romanFull, scaleLabelFull, scaleRootNameLocal, inversionText };
  })();

  const compatHtml = (() => {
    const inScale = chordScaleCompat.notesInScale.join(" · ") || "ninguna";
    const outOfScale = chordScaleCompat.notesOutOfScale.length
      ? `<div><b>Fuera de escala:</b> ${escapeHtml(chordScaleCompat.notesOutOfScale.map((n) => `${n.name} (${n.intervalLabel})`).join(" · "))}</div>`
      : "";
    const statusLine = chordScaleCompat.isDiatonic
      ? `<div>Acorde diatónico en la escala activa.</div>`
      : `<div>Acorde no diatónico en la escala activa.</div>`;
    const suggestion = chordScaleCompat.diatonicSuggestion
      ? `<div>${escapeHtml(chordScaleCompat.diatonicSuggestion)}</div>`
      : "";
    const functionalLines = chordFunctionalIdentity
      ? `<div><b>Función en la escala activa:</b> ${escapeHtml(chordFunctionalIdentity.romanFull)} de ${escapeHtml(chordFunctionalIdentity.scaleLabelFull)}</div>` +
        `<div><b>Resolución esperada:</b> ${escapeHtml(d?.chordName || "—")} → I (${escapeHtml(chordFunctionalIdentity.scaleLabelFull)})</div>` +
        (chordFunctionalIdentity.inversionText ? `<div>${escapeHtml(chordFunctionalIdentity.inversionText)}</div>` : "")
      : "";
    return (
      `<section class="pdf-compat">` +
        `<h3>Compatibilidad con la escala</h3>` +
        `<div class="pdf-kv">` +
          `<div><b>En escala:</b> ${escapeHtml(inScale)}</div>` +
          outOfScale +
          statusLine +
          suggestion +
          functionalLines +
        `</div>` +
      `</section>`
    );
  })();

  const dominantsHtml = (() => {
    const scaleNameFull = `${pcToName(rootPc, computeAutoPreferSharps({ rootPc, scaleName }))} ${scaleName}`;
    const isDiatonicDominant = chordScaleCompat.isDiatonic && d?.plan?.quality === "dom";
    const diatonicDomWarning = isDiatonicDominant
      ? `<div class="pdf-warning" style="margin-bottom:10px;">${escapeHtml("El acorde estudiado ya cumple función dominante en la escala activa. Estos dominantes externos muestran tonicizaciones alternativas hacia su raíz, no la función principal del acorde.")}</div>`
      : "";
    const buildBlock = (spec, compat, funcLabel) => {
      const nonDiatText = !compat.isDiatonic && compat.notesOutOfScale.length
        ? `<div class="pdf-dominant-nondiaton">No diatónico en ${escapeHtml(scaleNameFull)}: contiene ${escapeHtml(compat.notesOutOfScale.map((n) => `${n.name} (${n.intervalLabel})`).join(", "))}.</div>`
        : `<div class="pdf-dominant-diatonic">Diatónico en la escala activa.</div>`;
      return (
        `<div class="pdf-dominant-block">` +
          `<div class="pdf-dominant-name">${escapeHtml(spec.name)}</div>` +
          `<div><b>Función:</b> ${escapeHtml(funcLabel)} → I (${escapeHtml(studyReadingRootName)} como tónica)</div>` +
          `<div><b>Notas:</b> ${escapeHtml(spec.notes.join(" · "))}</div>` +
          nonDiatText +
        `</div>`
      );
    };
    return (
      `<section class="pdf-dominants">` +
        `<h3>Dominantes externos hacia la raíz detectada (${escapeHtml(studyReadingRootName)})</h3>` +
        diatonicDomWarning +
        `<div class="pdf-dominants-grid">` +
          buildBlock(dominant, dominantScaleCompat, "V7") +
          buildBlock(backdoorDominant, backdoorScaleCompat, "bVII7") +
        `</div>` +
      `</section>`
    );
  })();

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

    const sectionWarningHtml = section.warning
      ? `<div class="pdf-warning">${escapeHtml(section.warning)}</div>`
      : "";

    return (
      `<section id="pdf-section-${sectionIdx + 1}" class="pdf-section">` +
        `<h2>${escapeHtml(`${sectionIdx + 1}. ${section.title}`)}</h2>` +
        sectionWarningHtml +
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
.pdf-compat { border: 1px solid #bae6fd; border-radius: 14px; padding: 14px 16px; background: #f0f9ff; margin-bottom: 18px; break-inside: avoid; }
.pdf-compat h3 { margin: 0 0 8px; font-size: 13px; color: #0c4a6e; }
.pdf-dominants { border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px 16px; background: #f8fafc; margin-bottom: 24px; break-inside: avoid; }
.pdf-dominants h3 { margin: 0 0 10px; font-size: 13px; }
.pdf-dominants-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.pdf-dominant-block { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #fff; font-size: 9px; line-height: 1.5; }
.pdf-dominant-name { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
.pdf-dominant-diatonic { color: #166534; margin-top: 3px; }
.pdf-dominant-nondiaton { color: #92400e; margin-top: 3px; }
.pdf-warning { background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 8px 12px; margin-bottom: 12px; font-size: 9.5px; color: #78350f; line-height: 1.5; break-inside: avoid; }
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

${compatHtml}

<nav class="pdf-index">
  <h2>Índice general</h2>
  <ul>${substitutionIndexHtml}</ul>
</nav>

<section class="pdf-cards">
  ${summaryCardsHtml}
</section>

${dominantsHtml}

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
			  <div className="text-base font-bold text-slate-900">
				<InfoTitle label="Modo estudio" info={CHORD_STUDY_INFO_TEXT} alwaysShow />
			  </div>

			  <div className="mt-1 space-y-0.5 text-sm leading-6 text-slate-700">
				<div data-testid="study-lectura">
				  <span className="font-semibold text-slate-800">Lectura estudiada:</span>{" "}
				  {d?.chordName}{studyRelativeChord ? ` · ${studyRelativeChord.shortText}` : ""}
				</div>

				<div>
				  <span className="font-semibold text-slate-800">Acorde de referencia:</span>{" "}
				  {refChordDisplayName ?? "sin referencia"}
				</div>

				<div>
				  <span className="font-semibold text-slate-800">Escala activa:</span>{" "}
				  {pcToName(rootPc, autoPreferSharps)} {scaleName}
				</div>

				{chordRefEnabled ? (
				  <div className="mt-0.5 italic text-slate-500">
					La referencia solo se usa para priorizar lecturas; el análisis corresponde a {d?.chordName}.
				  </div>
				) : null}
			  </div>
			</div>
      <div className="flex flex-wrap items-center gap-2">
        {studyOpen ? (
          <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={exportStudyPdf}>
            Exportar PDF
          </button>
        ) : null}
        <button type="button" data-testid="study-toggle" className={UI_BTN_SM + " w-auto px-3"} onClick={() => setStudyOpen((v) => !v)}>
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
            <div data-testid="study-identidad-nombre"><b>Nombre:</b> {d?.chordName}</div>
            <div><b>Relativo:</b> {studyRelativeChord ? `${studyRelativeChord.kind} · ${studyRelativeChord.label}` : "—"}</div>
            <div><b>Capa:</b> {chordEngineLayerLabel(d?.plan)}</div>
            {(d?.plan?.suspension === "sus2" || d?.plan?.suspension === "sus4") ? (
              <div className="mt-1 text-slate-500">Acorde suspendido: no tiene tercera, por tanto no define mayor/menor.</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
          <div className="text-xs font-semibold text-slate-700">Compatibilidad con la escala</div>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <div><b>En escala:</b> {chordScaleCompat.notesInScale.join(" · ") || "ninguna"}</div>
            {chordScaleCompat.notesOutOfScale.length ? (
              <div><b>Fuera de escala:</b> {chordScaleCompat.notesOutOfScale.map((n) => `${n.name} (${n.intervalLabel})`).join(" · ")}</div>
            ) : null}
            {chordScaleCompat.isDiatonic ? (
              <div className="mt-1 text-slate-500">Todas las notas de {d?.chordName} pertenecen a {pcToName(rootPc, autoPreferSharps)} {scaleName}.</div>
            ) : chordScaleCompat.diatonicSuggestion ? (
              <div className="mt-1 text-slate-500">{chordScaleCompat.diatonicSuggestion}</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
          <div className="text-xs font-semibold text-slate-700">Dominantes externos hacia la raíz detectada</div>
          <div className="mt-1 text-xs text-slate-500">Calculados sobre la raíz de la lectura estudiada; no tienen por qué pertenecer a la escala activa.</div>
          <div className="mt-2 space-y-3 text-xs text-slate-600">
            <div>
              <div className="font-semibold text-slate-700">Dominante hacia la raíz {studyReadingRootName}</div>
              <div><b>Acorde:</b> {dominant.name}</div>
              <div><b>Función:</b> V7 → {resolutionRoman} si {studyReadingRootName} se toma como centro tonal</div>
              <div><b>Notas:</b> {dominant.notes.join(" · ")}</div>
              {!dominantScaleCompat.isDiatonic ? (
                <div className="mt-0.5 text-slate-500">No diatónico en {pcToName(rootPc, autoPreferSharps)} {scaleName}: contiene {dominantScaleCompat.notesOutOfScale.map((n) => `${n.name} (${n.intervalLabel})`).join(", ")}.</div>
              ) : null}
            </div>
            <div className="border-t border-slate-200 pt-2">
              <div className="font-semibold text-slate-700">Backdoor hacia la raíz {studyReadingRootName}</div>
              <div><b>Acorde:</b> {backdoorDominant.name}</div>
              <div><b>Función:</b> bVII7 → {resolutionRoman} si {studyReadingRootName} se toma como centro tonal</div>
              <div><b>Notas:</b> {backdoorDominant.notes.join(" · ")}</div>
              {!backdoorScaleCompat.isDiatonic ? (
                <div className="mt-0.5 text-slate-500">No diatónico en {pcToName(rootPc, autoPreferSharps)} {scaleName}: contiene {backdoorScaleCompat.notesOutOfScale.map((n) => `${n.name} (${n.intervalLabel})`).join(", ")}.</div>
              ) : null}
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
            <div data-testid="study-construccion-notas"><b>Notas:</b> {d?.notes?.join(" · ") || "—"}</div>
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
            <div><b>Escala activa:</b> {pcToName(rootPc, autoPreferSharps)} {scaleName}</div>
            {tensionAnalysis.sevenths.available.length || tensionAnalysis.sevenths.unavailable.length ? (
              <>
                <div className="mt-1 font-medium text-slate-700">Séptimas</div>
                {tensionAnalysis.sevenths.available.length ? <div><b>Disponibles:</b> {tensionAnalysis.sevenths.available.join(" · ")}</div> : null}
                {tensionAnalysis.sevenths.unavailable.length ? <div><b>No disponibles:</b> {tensionAnalysis.sevenths.unavailable.join(" · ")}</div> : null}
              </>
            ) : null}
            <div className="mt-1 font-medium text-slate-700">Tensiones superiores</div>
            <div><b>Disponibles:</b> {tensionAnalysis.tensions.available.join(" · ") || "ninguna"}</div>
            <div><b>No disponibles:</b> {tensionAnalysis.tensions.unavailable.join(" · ") || "ninguna"}</div>
            {tensionAnalysis.hasNoThird ? (
              <div className="mt-1 text-slate-500">Sin tercera: las notas b3/#9 y 3 pueden definir color menor o mayor si se añaden al acorde.</div>
            ) : null}
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
