import * as AppMusicBasics from "../../music/appMusicBasics.js";
import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";

const {
  mod12,
  pcToName,
  intervalToSimpleChordDegreeToken,
  chordDisplayNameFromUI,
  spellNoteFromChordInterval,
  buildManualSelectionVoicing,
  CHORD_GUIDE_TONE_INVERSIONS,
  guideToneBassIntervalsForSelection,
  CHORD_INVERSIONS,
  intervalToChordToken,
  spellChordNotes,
} = AppMusicBasics;

const {
  buildChordEnginePlan,
  actualInversionLabelFromVoicing,
} = AppVoicingStudyCore;

export function buildStudyData({
  studyTarget,
  chordDetectMode,
  chordDetectSelectedCandidate,
  chordDetectSelectedNotes,
  chordFamily,
  chordRootPc,
  chordPreferSharps,
  chordQuality,
  chordSuspension,
  chordStructure,
  chordExt7,
  chordExt6,
  chordExt9,
  chordExt11,
  chordExt13,
  chordOmit,
  chordIntervals,
  chordDegreeLabels,
  chordEnginePlan,
  activeChordVoicing,
  chordBassPc,
  chordInversion,
  chordPositionForm,
  maxFret,
  chordQuartalPitchSets,
  activeQuartalVoicing,
  chordQuartalCurrentRootPc,
  chordQuartalDisplayName,
  chordQuartalSpread,
  chordQuartalType,
  chordQuartalReference,
  chordQuartalScaleName,
  guideToneDef,
  activeGuideToneVoicing,
  guideToneDisplayName,
  guideToneForm,
  guideToneInversion,
  guideToneQuality,
  guideToneBassNote,
  nearSlots,
  nearComputed,
  buildNearSlotStudyEntry,
}) {
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
        : { ...chordEnginePlan, rootPc: mainRootPc };
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
        title: "Lectura estudiada",
        chordName: detectCandidate.name,
        notes: mainSpelledNotes,
        intervals: mainDegreeLabels || mainIntervals.map((i) => intervalToChordToken(i, { ext6: chordExt6, ext9: chordExt9 && chordStructure !== "triad", ext11: chordExt11 && chordStructure !== "triad", ext13: chordExt13 && chordStructure !== "triad" })),
        plan: detectedPlan,
        voicing: currentMainVoicing,
        positionForm: detectCandidate.uiPatch?.positionForm || chordPositionForm,
        bassName: currentMainVoicing ? mainPcToSpelledName(currentMainVoicing.bassPc) : pcToName(chordBassPc, mainPreferSharps),
        inversionLabel: (() => {
          if (!currentMainVoicing) {
            return CHORD_INVERSIONS.find((x) => x.value === chordInversion)?.label || "Fundamental";
          }
          const invLabel = actualInversionLabelFromVoicing(detectedPlan, currentMainVoicing, chordPreferSharps);
          if (detectCandidate.contextual && invLabel === "Fundamental") return "Bajo fundamental";
          return invLabel;
        })(),
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
        title: "Lectura estudiada",
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
        title: "Lectura estudiada",
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
        omit: chordOmit,
      }),
      notes: mainSpelledNotes,
      intervals: chordDegreeLabels || mainIntervals.map((i) => intervalToChordToken(i, { ext6: chordExt6, ext9: chordExt9 && chordStructure !== "triad", ext11: chordExt11 && chordStructure !== "triad", ext13: chordExt13 && chordStructure !== "triad" })),
      plan: chordEnginePlan,
      voicing: activeChordVoicing,
      positionForm: chordPositionForm,
      bassName: activeChordVoicing ? mainPcToSpelledName(activeChordVoicing.bassPc) : pcToName(chordBassPc, mainPreferSharps),
      inversionLabel: activeChordVoicing
        ? actualInversionLabelFromVoicing(chordEnginePlan, activeChordVoicing, chordPreferSharps)
        : CHORD_INVERSIONS.find((x) => x.value === chordInversion)?.label || "Fundamental",
    };
  }

  const idx = Number(studyTarget);
  const slot = nearSlots[idx];
  const plan = nearComputed.ranked[idx]?.plan || null;
  const voicing = nearComputed.selected[idx] || null;
  return buildNearSlotStudyEntry(slot, plan, voicing, idx);
}
