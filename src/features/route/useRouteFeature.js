import { useEffect, useMemo, useState } from "react";
import {
  ROUTE_LAB_DEFAULT_TUNING,
  computeRouteLab,
  computeMusicalRoute,
  buildPentatonicBoxInstances,
  build3NpsPatternInstances,
  buildCagedPatternInstances,
  buildInstanceMembershipMap,
} from "../../music/appPatternRouteStaffCore.jsx";
import {
  parsePosCode,
  resolveKeySignatureForScale,
  pitchAt,
  pcToName,
  mod12,
} from "../../music/appMusicBasics.js";
import { STRINGS } from "../../music/appStaticData.js";

export function useRouteFeature({
  rootPc = 0,
  scaleName = "Mayor",
  scaleIntervals = [],
  maxFret = 15,
  preferSharps = false,
} = {}) {
  // ── Estado ────────────────────────────────────────────────────────────

  // Route lab: controles
  const [routeLabStartCode, setRouteLabStartCode] = useState("61");
  const [routeLabEndCode, setRouteLabEndCode] = useState("113");
  const [routeLabMaxPerString, setRouteLabMaxPerString] = useState(4);
  const [routeLabPickNext, setRouteLabPickNext] = useState("start");

  // Route lab: parámetros de tuning
  const [routeLabSwitchWhenSameStringForwardPenalty, setRouteLabSwitchWhenSameStringForwardPenalty] = useState(ROUTE_LAB_DEFAULT_TUNING.switchWhenSameStringForwardPenalty);
  const [routeLabWorseThanSameStringGoalBase, setRouteLabWorseThanSameStringGoalBase] = useState(ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalBase);
  const [routeLabWorseThanSameStringGoalScale, setRouteLabWorseThanSameStringGoalScale] = useState(ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalScale);
  const [routeLabCorridorPenalty, setRouteLabCorridorPenalty] = useState(ROUTE_LAB_DEFAULT_TUNING.corridorPenalty);
  const [routeLabOvershootNearEndAlt, setRouteLabOvershootNearEndAlt] = useState(ROUTE_LAB_DEFAULT_TUNING.overshootNearEndAlt);

  // Ruta musical principal: controles
  const [routeStartCode, setRouteStartCode] = useState("61");
  const [routeEndCode, setRouteEndCode] = useState("113");
  const [routeMaxPerString, setRouteMaxPerString] = useState(4);
  const [routeMode, setRouteMode] = useState("auto");
  const [routePreferNps, setRoutePreferNps] = useState(true);
  const [routePreferVertical, setRoutePreferVertical] = useState(false);
  const [routeStrictFretDirection, setRouteStrictFretDirection] = useState(false);
  const [routeKeepPattern, setRouteKeepPattern] = useState(false);
  const [allowPatternSwitch, setAllowPatternSwitch] = useState(true);
  const [patternSwitchPenalty, setPatternSwitchPenalty] = useState(2.0);
  const [routeFixedPattern, setRouteFixedPattern] = useState("auto");
  const [routePickNext, setRoutePickNext] = useState("start");

  // ── Derivado de escala ────────────────────────────────────────────────
  const usesFiveNoteBoxPatterns = scaleIntervals.length === 5;

  // ── Efecto: sanear routeMode según la escala activa ──────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (usesFiveNoteBoxPatterns && routeMode === "nps") setRouteMode("auto");
    if (!usesFiveNoteBoxPatterns && routeMode === "penta") setRouteMode("auto");
    if (!usesFiveNoteBoxPatterns && scaleIntervals.length !== 7 && routeMode === "nps") setRouteMode("auto");
  }, [usesFiveNoteBoxPatterns, scaleIntervals.length, routeMode]);

  // ── Memos: route lab ──────────────────────────────────────────────────
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
    () => routeLabResult.path.map((n) => `${n.sIdx + 1}${n.fret}`).join(" → "),
    [routeLabResult.path]
  );

  const routeLabDebugLines = useMemo(() => {
    return (routeLabResult.debugSteps || []).map((step, idx) => {
      const chunks = [];
      chunks.push(`${idx + 1}. ${step.from} → ${step.to}`);
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

  // ── Memos: ruta principal ─────────────────────────────────────────────
  const startPos = useMemo(() => parsePosCode(routeStartCode), [routeStartCode]);
  const endPos = useMemo(() => parsePosCode(routeEndCode), [routeEndCode]);

  const fixedPatternIdx = useMemo(() => {
    if (routeFixedPattern === "auto") return null;
    const n = parseInt(routeFixedPattern, 10);
    return Number.isFinite(n) ? n : null;
  }, [routeFixedPattern]);

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
      if (usesFiveNoteBoxPatterns) return pickBest(["penta", "pos", "free"]);
      if (scaleIntervals.length === 7) return pickBest(["nps", "pos", "free"]);
      return pickBest(["pos", "free"]);
    }

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

  // ── Textos derivados ──────────────────────────────────────────────────
  const routeLabPickHelpText = `Click en el mástil de ruta para elegir: ${routeLabPickNext === "start" ? "Inicio" : "Fin"}.`;

  // ── Acciones ─────────────────────────────────────────────────────────
  function resetRouteLabTuning() {
    setRouteLabSwitchWhenSameStringForwardPenalty(ROUTE_LAB_DEFAULT_TUNING.switchWhenSameStringForwardPenalty);
    setRouteLabWorseThanSameStringGoalBase(ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalBase);
    setRouteLabWorseThanSameStringGoalScale(ROUTE_LAB_DEFAULT_TUNING.worseThanSameStringGoalScale);
    setRouteLabCorridorPenalty(ROUTE_LAB_DEFAULT_TUNING.corridorPenalty);
    setRouteLabOvershootNearEndAlt(ROUTE_LAB_DEFAULT_TUNING.overshootNearEndAlt);
  }

  // ── Retorno agrupado ─────────────────────────────────────────────────
  return {
    lab: {
      routeLabStartCode, setRouteLabStartCode,
      routeLabEndCode, setRouteLabEndCode,
      routeLabMaxPerString, setRouteLabMaxPerString,
      routeLabPickNext, setRouteLabPickNext,
    },

    labTuning: {
      routeLabSwitchWhenSameStringForwardPenalty, setRouteLabSwitchWhenSameStringForwardPenalty,
      routeLabWorseThanSameStringGoalBase, setRouteLabWorseThanSameStringGoalBase,
      routeLabWorseThanSameStringGoalScale, setRouteLabWorseThanSameStringGoalScale,
      routeLabCorridorPenalty, setRouteLabCorridorPenalty,
      routeLabOvershootNearEndAlt, setRouteLabOvershootNearEndAlt,
    },

    main: {
      routeStartCode, setRouteStartCode,
      routeEndCode, setRouteEndCode,
      routeMaxPerString, setRouteMaxPerString,
      routeMode, setRouteMode,
      routePickNext, setRoutePickNext,
    },

    mainTuning: {
      routePreferNps, setRoutePreferNps,
      routePreferVertical, setRoutePreferVertical,
      routeStrictFretDirection, setRouteStrictFretDirection,
      routeKeepPattern, setRouteKeepPattern,
      allowPatternSwitch, setAllowPatternSwitch,
      patternSwitchPenalty, setPatternSwitchPenalty,
      routeFixedPattern, setRouteFixedPattern,
    },

    derived: {
      routeLabResult,
      routeLabIndexByCell,
      routeLabText,
      routeLabDebugLines,
      routeKeySignature,
      routeStaffEvents,
      routeResult,
      routeIndexByCell,
      routeLabPickHelpText,
    },

    actions: {
      resetRouteLabTuning,
    },
  };
}
