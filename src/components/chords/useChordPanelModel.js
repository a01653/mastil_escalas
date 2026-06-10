import { useCallback } from "react";
import * as AppMusicBasics from "../../music/appMusicBasics.js";
import * as AppStaticData from "../../music/appStaticData.js";
import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";

const { mod12, chordUiLetterFromPc } = AppMusicBasics;
const { NATURAL_PC } = AppStaticData;
const { isDropForm, hasEffectiveSeventh, buildChordExtensionTogglePatch } = AppVoicingStudyCore;

/**
 * Lógica de pantalla del editor de acordes.
 * Recibe los mismos controles que ChordsPanel y devuelve handlers y valores derivados
 * listos para conectar directamente a los controles de la UI.
 */
export function useChordPanelModel({ chordCtrl }) {
  const {
    chordRootPc, setChordRootPc,
    chordSpellPreferSharps, setChordSpellPreferSharps,
    chordQuality, setChordQuality,
    setChordSuspension,
    chordStructure,
    chordExt7, chordExt6, setChordExt6,
    chordExt9, setChordExt9,
    chordExt11, setChordExt11,
    chordExt13, setChordExt13,
    chordOmit, setChordOmit,
    setChordForm, setChordPositionForm,
  } = chordCtrl;

  // ── Valor derivado: letra a mostrar en el selector de tono ──────────────────
  const toneSelectValue = chordUiLetterFromPc(chordRootPc, !!chordSpellPreferSharps);

  // ── Valor derivado: estado visual del checkbox de 7ª ────────────────────────
  const effectiveHasSeventh = hasEffectiveSeventh({
    structure: chordStructure,
    ext7: chordExt7,
    ext6: chordExt6,
    ext9: chordExt9,
    ext11: chordExt11,
    ext13: chordExt13,
  });

  // ── Handlers de cambio de tono ───────────────────────────────────────────────
  const handleToneChange = useCallback((letter) => {
    if (Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) {
      setChordRootPc(mod12(NATURAL_PC[letter]));
    }
  }, [setChordRootPc]);

  const handleFlatClick = useCallback(() => {
    const letter = chordUiLetterFromPc(chordRootPc, false);
    const nat = mod12(NATURAL_PC[letter]);
    const cur = mod12(chordRootPc);
    if (cur !== nat) { setChordRootPc(nat); setChordSpellPreferSharps(false); return; }
    setChordRootPc(mod12(nat - 1));
    setChordSpellPreferSharps(false);
  }, [chordRootPc, setChordRootPc, setChordSpellPreferSharps]);

  const handleSharpClick = useCallback(() => {
    const letter = chordUiLetterFromPc(chordRootPc, true);
    const nat = mod12(NATURAL_PC[letter]);
    const cur = mod12(chordRootPc);
    if (cur !== nat) { setChordRootPc(nat); setChordSpellPreferSharps(true); return; }
    setChordRootPc(mod12(nat + 1));
    setChordSpellPreferSharps(true);
  }, [chordRootPc, setChordRootPc, setChordSpellPreferSharps]);

  // ── Handler de suspensión (con efectos secundarios sobre calidad y omit) ─────
  const handleSuspensionChange = useCallback((v) => {
    setChordSuspension(v);
    if (v !== "none" && (chordQuality === "dim" || chordQuality === "hdim")) setChordQuality("maj");
    if (v !== "none" && chordOmit === "3") setChordOmit("none");
  }, [setChordSuspension, chordQuality, setChordQuality, chordOmit, setChordOmit]);

  // ── Handlers de extensiones (reglas de exclusión mutua) ──────────────────────
  // La regla vive en buildChordExtensionTogglePatch, compartida con Acordes cercanos.
  const applyExtensionToggle = useCallback((ext, value) => {
    const patch = buildChordExtensionTogglePatch({ structure: chordStructure, omit: chordOmit, ext, value });
    if ("ext6" in patch) setChordExt6(patch.ext6);
    if ("ext9" in patch) setChordExt9(patch.ext9);
    if ("ext11" in patch) setChordExt11(patch.ext11);
    if ("ext13" in patch) setChordExt13(patch.ext13);
  }, [chordStructure, chordOmit, setChordExt6, setChordExt9, setChordExt11, setChordExt13]);

  const handleExt6Change = useCallback((v) => applyExtensionToggle("6", v), [applyExtensionToggle]);
  const handleExt9Change = useCallback((v) => applyExtensionToggle("9", v), [applyExtensionToggle]);
  const handleExt11Change = useCallback((v) => applyExtensionToggle("11", v), [applyExtensionToggle]);
  const handleExt13Change = useCallback((v) => applyExtensionToggle("13", v), [applyExtensionToggle]);

  // ── Handler de forma (sincroniza positionForm si no es drop) ─────────────────
  const handleFormChange = useCallback((v) => {
    setChordForm(v);
    if (!isDropForm(v)) setChordPositionForm(v);
  }, [setChordForm, setChordPositionForm]);

  return {
    // Valores derivados para la UI
    toneSelectValue,
    effectiveHasSeventh,
    // Handlers de tono
    handleToneChange,
    handleFlatClick,
    handleSharpClick,
    // Handlers de controles terciarios
    handleSuspensionChange,
    handleExt6Change,
    handleExt9Change,
    handleExt11Change,
    handleExt13Change,
    handleFormChange,
  };
}
