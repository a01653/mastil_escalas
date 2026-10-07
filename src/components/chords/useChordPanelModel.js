import { useCallback } from "react";
import * as AppMusicBasics from "../../music/appMusicBasics.js";
import * as AppStaticData from "../../music/appStaticData.js";
import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";

const { mod12, chordUiLetterFromPc, chordQualityDisplayValue, chordQualitySelectOptions, chordSuspensionSelectOptions } = AppMusicBasics;
const { NATURAL_PC } = AppStaticData;
const { isDropForm, hasEffectiveSeventh, buildChordExtensionTogglePatch, buildChordQualityChangePatch, buildChordSuspensionChangePatch, buildChordControlHints } = AppVoicingStudyCore;

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
    chordSuspension, setChordSuspension,
    chordFifth, setChordFifth,
    chordStructure,
    chordExt7, setChordExt7, chordExt6, setChordExt6,
    chordExt9, setChordExt9,
    setChordNinth,
    chordExt11, setChordExt11,
    chordExt13, setChordExt13,
    chordOmit,
    setChordForm, setChordPositionForm,
  } = chordCtrl;

  // ── Valor derivado: letra a mostrar en el selector de tono ──────────────────
  const toneSelectValue = chordUiLetterFromPc(chordRootPc, !!chordSpellPreferSharps);

  // ── Valor derivado: calidad que muestra el combo (regla compartida) ─────────
  // Am7 + ♭5 se muestra como Semidisminuido y ø + 5 como Menor; la base guardada
  // no cambia, así que la 3ª y el tipo de 7ª se conservan al seguir editando.
  const qualityState = {
    quality: chordQuality,
    suspension: chordSuspension,
    structure: chordStructure,
    ext7: chordExt7,
    omit: chordOmit,
    fifth: chordFifth,
  };
  const qualitySelectValue = chordQualityDisplayValue(qualityState);
  // Opciones del combo (compartidas con Acordes cercanos): Aumentada deshabilitada
  // y explicada cuando no puede conservar la séptima (♭♭7) o no hay quinta.
  const qualityOptions = chordQualitySelectOptions(qualityState);
  // Suspensión: sus2/sus4 deshabilitadas y explicadas si no pueden conservar la 7ª
  // (♭♭7) o hay "Omitir 3". Las explicaciones de todo lo deshabilitado se consultan
  // también en móvil desde el botón de información de cada control.
  const suspensionOptions = chordSuspensionSelectOptions(qualityState);
  const controlHints = buildChordControlHints({ ...qualityState, ext6: chordExt6, ext9: chordExt9, ext11: chordExt11, ext13: chordExt13 });

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

  // ── Handler de calidad (regla compartida con Acordes cercanos) ────────────────
  const handleQualityChange = useCallback((v) => {
    const patch = buildChordQualityChangePatch({
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      ext7: chordExt7,
      omit: chordOmit,
      fifth: chordFifth,
    }, v);
    // Patch vacío: la opción elegida no se puede aplicar (Aumentada con ♭♭7).
    if (!("quality" in patch)) return;
    setChordQuality(patch.quality);
    if ("suspension" in patch) setChordSuspension(patch.suspension);
    if ("fifth" in patch) setChordFifth(patch.fifth);
    if ("ext7" in patch) setChordExt7(patch.ext7);
  }, [chordSuspension, chordQuality, chordStructure, chordExt7, chordOmit, chordFifth, setChordQuality, setChordSuspension, setChordFifth, setChordExt7]);

  // ── Handler de suspensión (con efectos secundarios sobre calidad y omit) ─────
  const handleSuspensionChange = useCallback((v) => {
    const patch = buildChordSuspensionChangePatch({
      quality: chordQuality,
      suspension: chordSuspension,
      structure: chordStructure,
      ext7: chordExt7,
      omit: chordOmit,
      fifth: chordFifth,
    }, v);
    // Solo cambia la suspensión; patch vacío si no se puede aplicar (♭♭7, Omitir 3).
    if ("suspension" in patch) setChordSuspension(patch.suspension);
  }, [chordQuality, chordSuspension, chordStructure, chordExt7, chordOmit, chordFifth, setChordSuspension]);

  // ── Handlers de extensiones (reglas de exclusión mutua) ──────────────────────
  // La regla vive en buildChordExtensionTogglePatch, compartida con Acordes cercanos.
  const applyExtensionToggle = useCallback((ext, value) => {
    const patch = buildChordExtensionTogglePatch({ structure: chordStructure, omit: chordOmit, ext, value });
    if ("ext6" in patch) setChordExt6(patch.ext6);
    if ("ext9" in patch) setChordExt9(patch.ext9);
    if ("ext11" in patch) setChordExt11(patch.ext11);
    if ("ext13" in patch) setChordExt13(patch.ext13);
    if ("ninth" in patch) setChordNinth?.(patch.ninth);
  }, [chordStructure, chordOmit, setChordExt6, setChordExt9, setChordExt11, setChordExt13, setChordNinth]);

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
    qualitySelectValue,
    qualityOptions,
    suspensionOptions,
    controlHints,
    effectiveHasSeventh,
    // Handlers de tono
    handleToneChange,
    handleFlatClick,
    handleSharpClick,
    // Handlers de controles terciarios
    handleQualityChange,
    handleSuspensionChange,
    handleExt6Change,
    handleExt9Change,
    handleExt11Change,
    handleExt13Change,
    handleFormChange,
  };
}
