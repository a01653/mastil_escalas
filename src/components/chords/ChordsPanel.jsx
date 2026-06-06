import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Copy, Check } from "lucide-react";
import PanelBlock from "../PanelBlock.jsx";
import * as AppStaticData from "../../music/appStaticData.js";
import * as AppMusicBasics from "../../music/appMusicBasics.js";
import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";
import { useChordPanelModel } from "./useChordPanelModel.js";

const {
  CHORDS_SECTION_INFO_TEXT,
  CHORD_EDITOR_INFO_TEXT,
  LETTERS,
} = AppStaticData;
const {
  CHORD_FAMILIES,
  CHORD_QUARTAL_TYPES,
  CHORD_QUARTAL_VOICES,
  CHORD_QUARTAL_SPREADS,
  CHORD_QUARTAL_REFERENCES,
  CHORD_QUARTAL_SCALE_NAMES,
  CHORD_GUIDE_TONE_QUALITIES,
  CHORD_GUIDE_TONE_FORMS,
  CHORD_GUIDE_TONE_INVERSIONS,
  CHORD_QUALITIES,
  CHORD_STRUCTURES,
  CHORD_FORMS,
} = AppMusicBasics;
const { isDropForm } = AppVoicingStudyCore;

// UI constants (mismas clases que App.jsx – puras, sin dependencia de estado)
const UI_BTN_SM = "h-7 w-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold shadow-sm hover:bg-sky-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

// ── Botón copiar voicing (reutilizable) ─────────────────────────────────────
export function CopyVoicingButton({ frets }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!frets) return;
    navigator.clipboard.writeText(frets).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [frets]);
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center ${UI_BTN_SM} transition-colors${
        copied ? " !bg-emerald-100 !border-emerald-400 !text-emerald-700" : ""
      }`}
      title={copied ? "¡Copiado!" : frets ? `Copiar voicing (${frets})` : "Sin voicing para copiar"}
      onClick={handleCopy}
      disabled={!frets}
      aria-label="Copiar voicing al portapapeles"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
const UI_LABEL_SM = "block text-[11px] font-semibold text-slate-700";
const UI_SELECT_SM_TONE = "h-7 w-[60px] rounded-xl border border-slate-200 bg-white px-1 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_EXT_GRID = "mt-1 grid grid-cols-3 gap-x-3 gap-y-1 text-xs";

export default function ChordsPanel({
  layout,
  chordCtrl,
  quartalCtrl,
  guideToneCtrl,
  uiCls,
  voicingData,
  detectArea,
  renderFns,
}) {
  const { isMobileLayout, mobileChordEditorOpen, setMobileChordEditorOpen } = layout;

  const {
    chordDetectMode, setChordDetectMode,
    chordCopyNotice,
    chordFamily, setChordFamily,
    chordSpellPreferSharps,
    chordAccidental,
    chordQuality, setChordQuality,
    chordSuspension,
    chordStructure, applyChordStructureSelection,
    chordForm,
    chordInversion, setChordInversion, chordInversionOptions,
    chordExt7, setChordExt7,
    chordExt6,
    chordExt9,
    chordExt11,
    chordExt13,
    chordOmit, setChordOmit,
    chordEnginePlan,
    chordControlsTitle,
    chordBaseDisplayName,
  } = chordCtrl;

  const {
    chordQuartalType, setChordQuartalType,
    chordQuartalVoices, setChordQuartalVoices,
    chordQuartalSpread, setChordQuartalSpread,
    chordQuartalReference, setChordQuartalReference,
    chordQuartalScaleName, setChordQuartalScaleName,
  } = quartalCtrl;

  const {
    guideToneQuality, setGuideToneQuality,
    guideToneForm, setGuideToneForm,
    guideToneInversion, setGuideToneInversion,
  } = guideToneCtrl;

  const {
    chordSelectClass, chordAutoSelectClass,
    chordMobileEditorGridClass, chordMobileEditorTertianGridClass,
    nearSlotDesktopEditorClass,
    chordFamilySelectWidth, chordFormSelectWidth,
    chordInversionSelectWidth, chordSuspensionSelectWidth, chordQualitySelectWidth,
  } = uiCls;

  const {
    activeQuartalVoicing,
    quartalRoleOfPc, labelForQuartalPc, quartalNoteNameForPc,
    activeGuideToneVoicing,
    activeChordVoicing,
    chordVoicingsResolving,
    chordDbError,
  } = voicingData;

  const { chordDetectInvestigationAreaRef, chordDetectClearMinHeight } = detectArea;

  const {
    renderChordBadgeStripBlock,
    renderMainChordVoicingPicker,
    renderMainChordDistControl,
    renderMobileChordSummaryCard,
    renderChordInvestigationFretboard,
    renderChordAllowOpenStringsToggle,
    renderChordKeepZoneToggle,
    openMainChordStudy,
    InfoTitle,
    ChordFretboard,
    GuideToneFretboard,
  } = renderFns;

  // ── Lógica de pantalla extraída al hook ──────────────────────────────────────
  const {
    toneSelectValue,
    effectiveHasSeventh,
    handleToneChange,
    handleFlatClick,
    handleSharpClick,
    handleSuspensionChange,
    handleExt6Change,
    handleExt9Change,
    handleExt11Change,
    handleExt13Change,
    handleFormChange,
  } = useChordPanelModel({ chordCtrl });

const extensionGridClass = isMobileLayout
  ? "mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
  : UI_EXT_GRID;

const omitGridClass = isMobileLayout
  ? "mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
  : "mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs";

  // ── Toggle Modo acorde / Investigar en mástil ────────────────────────────────
  // El <label> envuelve el input[type=checkbox] con absolute inset-0 opacity-0
  // para que Playwright pueda usar .check()/.uncheck() sobre data-testid="chord-detect-toggle".
  // El input queda en el top del stacking order (position:absolute, z-index:auto)
  // sobre los spans (no-positioned), por lo que Playwright lo encuentra sin cobertura.
const modeToggle = (
  <div
    className="relative inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
    title={chordDetectMode ? "Cambiar a modo auto" : "Cambiar a modo manual"}
  >
    {/* Se mantiene solo para compatibilidad con Playwright */}
    <input
      type="checkbox"
      data-testid="chord-detect-toggle"
      checked={chordDetectMode}
      onChange={(e) => setChordDetectMode(e.target.checked)}
      className="absolute right-1 top-1 h-5 w-5 opacity-0"
      aria-hidden="true"
      tabIndex={-1}
    />

    <button
      type="button"
      onClick={() => setChordDetectMode(false)}
      aria-pressed={!chordDetectMode}
      className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
        !chordDetectMode
          ? "bg-sky-600 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      Auto
    </button>

    <button
      type="button"
      onClick={() => setChordDetectMode(true)}
      aria-pressed={chordDetectMode}
      className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
        chordDetectMode
          ? "bg-sky-600 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      Manual
    </button>
  </div>
);

  // ── Cabecera del outer PanelBlock ────────────────────────────────────────────
  const sectionTitle = (
    <span className="inline-flex flex-wrap items-center gap-2">
      <InfoTitle label="Acordes" info={chordDetectMode ? CHORDS_SECTION_INFO_TEXT : CHORD_EDITOR_INFO_TEXT} alwaysShow />
    </span>
  );
  
  const chordControlsRestTitle = (() => {
    let raw = chordControlsTitle || "";
    // Quitar prefijo "Acorde NAME" o solo "NAME"
    const withAcorde = chordBaseDisplayName ? `Acorde ${chordBaseDisplayName}` : null;
    if (withAcorde && raw.startsWith(withAcorde)) {
      raw = raw.slice(withAcorde.length).replace(/^\/[^\s\-·]+/, "").replace(/^\s*[-·]\s*/, "");
    } else if (chordBaseDisplayName && raw.startsWith(chordBaseDisplayName)) {
      raw = raw.slice(chordBaseDisplayName.length).replace(/^\/[^\s\-·]+/, "").replace(/^\s*[-·]\s*/, "");
    }
    // Quitar sufijo (frets) al final
    raw = raw.replace(/\s*\([^)]+\)\s*$/, "");
    // Usar " · " como separador en lugar de " - "
    raw = raw.replace(/\s+-\s+/g, " · ");
    return raw.trim();
  })();

  // Nota de bajo slash ("/A", "/E#"…) extraída del título para pegarse al nombre base
  const chordSlashBassDisplay = (() => {
    if (!chordBaseDisplayName || !chordControlsTitle) return "";
    const prefix = `Acorde ${chordBaseDisplayName}`;
    const after = chordControlsTitle.startsWith(prefix)
      ? chordControlsTitle.slice(prefix.length)
      : chordControlsTitle.startsWith(chordBaseDisplayName)
        ? chordControlsTitle.slice(chordBaseDisplayName.length)
        : "";
    const m = after.match(/^\/([\w#b]+)/);
    return m ? `/${m[1]}` : "";
  })();

  // ── Copiar voicing al portapapeles ──────────────────────────────────────────
  const activeVoicingFrets =
    chordFamily === "quartal"
      ? (activeQuartalVoicing?.frets ?? null)
      : chordFamily === "guide_tones"
        ? (activeGuideToneVoicing?.frets ?? null)
        : (activeChordVoicing?.frets ?? null);

  const [copiedVoicing, setCopiedVoicing] = useState(false);

  const handleCopyVoicing = useCallback(() => {
    if (!activeVoicingFrets) return;
    navigator.clipboard.writeText(activeVoicingFrets).then(() => {
      setCopiedVoicing(true);
      setTimeout(() => setCopiedVoicing(false), 1500);
    });
  }, [activeVoicingFrets]);

  // ── Controles del acorde (compartidos entre mobile y desktop) ────────────────
  const chordControlsGrid = (
    <>
      {/* ── Familia quartal ─────────────────────────────────────────────────── */}
      {chordFamily === "quartal" ? (
        <div className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}>
          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Tono</label>
            <div className="mt-1 flex items-center gap-1.5">
              <select
                className={UI_SELECT_SM_TONE}
                style={isMobileLayout ? undefined : { width: "50px" }}
                value={toneSelectValue}
                onChange={(e) => handleToneChange(e.target.value)}
              >
                {LETTERS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <button
                type="button"
                className={`${UI_BTN_SM} ${chordAccidental && !chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                title="Bajar 1 semitono"
                onClick={handleFlatClick}
              >b</button>
              <button
                type="button"
                className={`${UI_BTN_SM} ${chordAccidental && chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                title="Subir 1 semitono"
                onClick={handleSharpClick}
              >#</button>
            </div>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Familia</label>
            <select
              className={chordAutoSelectClass + " mt-1"}
              style={isMobileLayout ? undefined : { width: chordFamilySelectWidth }}
              value={chordFamily}
              onChange={(e) => setChordFamily(e.target.value)}
            >
              {CHORD_FAMILIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          {chordQuartalReference === "scale" ? (
            <div className="min-w-0">
              <label className={UI_LABEL_SM}>Escala</label>
              <select
                className={chordSelectClass + " mt-1"}
                value={chordQuartalScaleName}
                onChange={(e) => setChordQuartalScaleName(e.target.value)}
                title="Escala usada para generar los cuartales diatónicos"
              >
                {CHORD_QUARTAL_SCALE_NAMES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="min-w-0">
            <label className={UI_LABEL_SM} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.\nDiatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.\nPor eso el resultado puede no tener la misma raíz elegida.`}>Referencia</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={chordQuartalReference}
              onChange={(e) => setChordQuartalReference(e.target.value)}
              title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.\nDiatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.\nPor eso el resultado puede no tener la misma raíz elegida.`}
            >
              {CHORD_QUARTAL_REFERENCES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.\nAbierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>Apilado</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={chordQuartalSpread}
              onChange={(e) => setChordQuartalSpread(e.target.value)}
              title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.\nAbierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}
            >
              {CHORD_QUARTAL_SPREADS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Voces</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={chordQuartalVoices}
              onChange={(e) => setChordQuartalVoices(e.target.value)}
            >
              {CHORD_QUARTAL_VOICES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM} title={`Puro: todas las cuartas son justas (4J).\nMixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>Tipo cuartal</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={chordQuartalType}
              onChange={(e) => setChordQuartalType(e.target.value)}
              title={`Puro: todas las cuartas son justas (4J).\nMixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}
            >
              {CHORD_QUARTAL_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          {!isMobileLayout && (
            <div className="ml-auto self-start justify-self-end pt-[8px]">
              {renderChordAllowOpenStringsToggle("h-9 rounded-xl border border-slate-200 bg-white px-3 shadow-sm")}
            </div>
          )}

        </div>

      /* ── Familia guide tones ─────────────────────────────────────────────── */
      ) : chordFamily === "guide_tones" ? (
        <div className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}>
          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Tono</label>
            <div className="mt-1 flex items-center gap-1.5">
              <select
                className={UI_SELECT_SM_TONE}
                style={isMobileLayout ? undefined : { width: "50px" }}
                value={toneSelectValue}
                onChange={(e) => handleToneChange(e.target.value)}
              >
                {LETTERS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <button
                type="button"
                className={`${UI_BTN_SM} ${chordAccidental && !chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                title="Bajar 1 semitono"
                onClick={handleFlatClick}
              >b</button>
              <button
                type="button"
                className={`${UI_BTN_SM} ${chordAccidental && chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                title="Subir 1 semitono"
                onClick={handleSharpClick}
              >#</button>
            </div>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Familia</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={chordFamily}
              onChange={(e) => setChordFamily(e.target.value)}
            >
              {CHORD_FAMILIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Calidad</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={guideToneQuality}
              onChange={(e) => setGuideToneQuality(e.target.value)}
            >
              {CHORD_GUIDE_TONE_QUALITIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Forma</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={guideToneForm}
              onChange={(e) => setGuideToneForm(e.target.value)}
            >
              {CHORD_GUIDE_TONE_FORMS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Inversión</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={guideToneInversion}
              onChange={(e) => setGuideToneInversion(e.target.value)}
            >
              {CHORD_GUIDE_TONE_INVERSIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          {!isMobileLayout && (
            <div className="ml-auto self-start justify-self-end pt-[8px]">
              {renderChordAllowOpenStringsToggle("h-9 rounded-xl border border-slate-200 bg-white px-3 shadow-sm")}
            </div>
          )}

        </div>

      /* ── Familia terciaria (default) ─────────────────────────────────────── */
      ) : (
        <div className={isMobileLayout ? chordMobileEditorTertianGridClass : `${nearSlotDesktopEditorClass} items-start`}>
          <div className={isMobileLayout ? "min-w-0 col-span-2" : "min-w-0"}>
            <label className={UI_LABEL_SM}>Tono</label>
            <div className="mt-1 flex items-center gap-1.5">
              <select
                className={UI_SELECT_SM_TONE}
                data-testid="select-tone"
                style={isMobileLayout ? undefined : { width: "50px" }}
                value={toneSelectValue}
                onChange={(e) => handleToneChange(e.target.value)}
              >
                {LETTERS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <button
                type="button"
                className={`${UI_BTN_SM} ${chordAccidental && !chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                title="Bajar 1 semitono"
                onClick={handleFlatClick}
              >b</button>
              <button
                type="button"
                className={`${UI_BTN_SM} ${chordAccidental && chordSpellPreferSharps ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                title="Subir 1 semitono"
                onClick={handleSharpClick}
              >#</button>
            </div>
          </div>

          <div className={isMobileLayout ? "min-w-0 order-1" : "min-w-0"}>
            <label className={UI_LABEL_SM}>Familia</label>
            <select
              className={chordSelectClass + " mt-1"}
              value={chordFamily}
              onChange={(e) => setChordFamily(e.target.value)}
            >
              {CHORD_FAMILIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className={isMobileLayout ? "min-w-0 order-5 col-span-2" : "min-w-0"}>
            <label className={UI_LABEL_SM}>Calidad / Sus</label>
            <div className="mt-1 flex flex-nowrap gap-1.5">
              <select
                className={chordAutoSelectClass}
                data-testid="select-quality"
                style={isMobileLayout ? undefined : { width: chordQualitySelectWidth }}
                value={chordQuality}
                onChange={(e) => setChordQuality(e.target.value)}
              >
                {CHORD_QUALITIES.map((q) => (
                  <option
                    key={q.value}
                    value={q.value}
                    disabled={
                      (q.value === "hdim" && chordStructure === "triad" && !chordExt7) ||
                      (q.value === "dom" && chordStructure === "triad" && !chordExt7)
                    }
                  >
                    {q.label}
                  </option>
                ))}
              </select>
              <select
                className={chordAutoSelectClass}
                data-testid="select-suspension"
                style={isMobileLayout ? undefined : { width: chordSuspensionSelectWidth }}
                value={chordSuspension}
                onChange={(e) => handleSuspensionChange(e.target.value)}
                title="Suspensión: reemplaza la 3ª por 2ª o 4ª"
              >
                <option value="none">Sus —</option>
                <option value="sus2">sus2</option>
                <option value="sus4">sus4</option>
              </select>
            </div>
          </div>

          <div className={isMobileLayout ? "min-w-0 order-2" : "min-w-0"}>
            <label className={UI_LABEL_SM}>Estructura</label>
            <select
              className={chordSelectClass + " mt-1"}
              data-testid="select-structure"
              value={chordStructure}
              onChange={(e) => applyChordStructureSelection(e.target.value)}
            >
              {CHORD_STRUCTURES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className={isMobileLayout ? "min-w-0 order-4" : "min-w-0"}>
            <label className={UI_LABEL_SM}>Forma</label>
            {chordEnginePlan.ui.usesManualForm ? (
              <select
                className={chordAutoSelectClass + " mt-1"}
                data-testid="select-form"
                style={isMobileLayout ? undefined : { width: chordFormSelectWidth }}
                value={chordForm}
                onChange={(e) => handleFormChange(e.target.value)}
                title="Elige la disposición del acorde: cerrado, abierto o drop"
              >
                {CHORD_FORMS.map((form) => (
                  <option
                    key={form.value}
                    value={form.value}
                    disabled={isDropForm(form.value) && !chordEnginePlan.ui.dropEligible}
                  >
                    {form.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1 flex h-7 items-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-xs text-slate-500">
                Automática
              </div>
            )}
          </div>

          <div className={isMobileLayout ? "min-w-0 order-3" : "min-w-0"}>
            <label className={UI_LABEL_SM}>Inversión</label>
            <select
              className={chordAutoSelectClass + " mt-1"}
              data-testid="select-inversion"
              style={isMobileLayout ? undefined : { width: chordInversionSelectWidth }}
              value={chordInversion}
              onChange={(e) => setChordInversion(e.target.value)}
            >
              {chordInversionOptions.map((inv) => (
                <option key={inv.value} value={inv.value}>{inv.label}</option>
              ))}
            </select>
          </div>

          <div className={isMobileLayout ? "min-w-0 order-6 col-span-2" : "min-w-0"}>
            <label className={UI_LABEL_SM}>Extensiones</label>
            <div className={extensionGridClass}>
              {chordEnginePlan.ui.ext.showSeven ? (
                <label className="inline-flex items-center gap-2">
                  <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      data-testid="ext-7"
                      checked={effectiveHasSeventh}
                      onChange={(e) => setChordExt7(e.target.checked)}
                      disabled={!chordEnginePlan.ui.ext.canToggleSeven}
                      className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                    <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${effectiveHasSeventh ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"} ${!chordEnginePlan.ui.ext.canToggleSeven ? "opacity-40" : ""}`}>✓</span>
                  </span>
                  <span>7</span>
                </label>
              ) : null}
              {chordEnginePlan.ui.ext.showSix ? (
                <label className="inline-flex items-center gap-2">
                  <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      data-testid="ext-6"
                      checked={chordExt6}
                      onChange={(e) => handleExt6Change(e.target.checked)}
                      disabled={!chordEnginePlan.ui.ext.canToggleSix}
                      className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                    <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordExt6 ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"} ${!chordEnginePlan.ui.ext.canToggleSix ? "opacity-40" : ""}`}>✓</span>
                  </span>
                  <span>6</span>
                </label>
              ) : null}
              {chordEnginePlan.ui.ext.showNine ? (
                <label className="inline-flex items-center gap-2">
                  <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      data-testid="ext-9"
                      checked={chordExt9}
                      onChange={(e) => handleExt9Change(e.target.checked)}
                      disabled={!chordEnginePlan.ui.ext.canToggleNine}
                      className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                    <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordExt9 ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"} ${!chordEnginePlan.ui.ext.canToggleNine ? "opacity-40" : ""}`}>✓</span>
                  </span>
                  <span>9</span>
                </label>
              ) : null}
              {chordEnginePlan.ui.ext.showEleven ? (
                <label className="inline-flex items-center gap-2">
                  <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      data-testid="ext-11"
                      checked={chordExt11}
                      onChange={(e) => handleExt11Change(e.target.checked)}
                      disabled={!chordEnginePlan.ui.ext.canToggleEleven}
                      className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                    <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordExt11 ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"} ${!chordEnginePlan.ui.ext.canToggleEleven ? "opacity-40" : ""}`}>✓</span>
                  </span>
                  <span>11</span>
                </label>
              ) : null}
              {chordEnginePlan.ui.ext.showThirteen ? (
                <label className="inline-flex items-center gap-2">
                  <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      data-testid="ext-13"
                      checked={chordExt13}
                      onChange={(e) => handleExt13Change(e.target.checked)}
                      disabled={!chordEnginePlan.ui.ext.canToggleThirteen}
                      className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                    <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordExt13 ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"} ${!chordEnginePlan.ui.ext.canToggleThirteen ? "opacity-40" : ""}`}>✓</span>
                  </span>
                  <span>13</span>
                </label>
              ) : null}
            </div>
          </div>

          <div className={isMobileLayout ? "min-w-0 order-7 col-span-2" : "min-w-0"}>
            <label className={UI_LABEL_SM}>Omitir</label>
            <div className={omitGridClass}>
              <label className="inline-flex items-center gap-2">
                <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  <input type="checkbox" data-testid="omit-1" checked={chordOmit === "1"} onChange={(e) => setChordOmit(e.target.checked ? "1" : "none")} disabled={chordOmit === "1" && !chordEnginePlan.ui.omit?.canToggleOff} className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                  <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordOmit === "1" ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"} ${chordOmit === "1" && !chordEnginePlan.ui.omit?.canToggleOff ? "opacity-40" : ""}`}>✓</span>
                </span>
                <span>1</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  <input type="checkbox" data-testid="omit-3" checked={chordOmit === "3"} onChange={(e) => setChordOmit(e.target.checked ? "3" : "none")} disabled={chordSuspension !== "none" || (chordOmit === "3" && !chordEnginePlan.ui.omit?.canToggleOff)} className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                  <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordOmit === "3" ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"} ${chordSuspension !== "none" || (chordOmit === "3" && !chordEnginePlan.ui.omit?.canToggleOff) ? "opacity-40" : ""}`}>✓</span>
                </span>
                <span>3</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  <input type="checkbox" data-testid="omit-5" checked={chordOmit === "5"} onChange={(e) => setChordOmit(e.target.checked ? "5" : "none")} disabled={chordOmit === "5" && !chordEnginePlan.ui.omit?.canToggleOff} className="absolute inset-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                  <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-[6px] border text-[10px] font-bold shadow-sm ${chordOmit === "5" ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent"} ${chordOmit === "5" && !chordEnginePlan.ui.omit?.canToggleOff ? "opacity-40" : ""}`}>✓</span>
                </span>
                <span>5</span>
              </label>
            </div>
          </div>

          {!isMobileLayout && (
            <div className="ml-auto self-start justify-self-end pt-[8px]">
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                {renderChordAllowOpenStringsToggle()}
                {renderChordKeepZoneToggle()}
              </div>
            </div>
          )}

        </div>
      )}
    </>
  );

  // ── Editor de acorde (mobile - modal PanelBlock) ─────────────────────────────
  const chordEditorPanel = (
    <PanelBlock
      as="fieldset"
      level="subsection"
      title={<InfoTitle label="Editar acorde" info={CHORD_EDITOR_INFO_TEXT} alwaysShow />}
      className="w-full max-h-[calc(100vh-6rem)] shadow-2xl"
      bodyClassName="max-h-[calc(100vh-11rem)] overflow-y-auto overflow-x-visible"
      headerAside={
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-sky-50"
          onClick={() => setMobileChordEditorOpen(false)}
          aria-label="Cerrar edición de acorde"
        >
          X
        </button>
      }
    >
      {chordControlsGrid}
    </PanelBlock>
  );

  // ── Editor de acorde (desktop - tarjeta sin cabecera azul) ───────────────────
  const desktopChordEditorPanel = (
    <fieldset className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
      {/* Cabecera: título + chips (izq) | voicing + dist + Estudiar (der) */}
      <div className="flex flex-wrap items-start justify-between gap-3 bg-white px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="inline-flex flex-wrap items-center gap-x-1 text-lg font-bold text-slate-950">
            <InfoTitle
              label={
                <span>
                  <span className="text-sky-700">{chordBaseDisplayName || chordControlsTitle}{chordSlashBassDisplay}</span>
                  {chordControlsRestTitle && chordBaseDisplayName ? (
                    <span className="text-slate-950"> · {chordControlsRestTitle}</span>
                  ) : null}
                </span>
              }
              info={CHORD_EDITOR_INFO_TEXT}
              alwaysShow
            />
          </div>
          <div className="mt-1.5">
            {renderChordBadgeStripBlock()}
          </div>
        </div>
        <div className="flex shrink-0 items-end gap-2">
          <button
            type="button"
            className={`inline-flex items-center justify-center ${UI_BTN_SM} transition-colors${
              copiedVoicing
                ? " !bg-emerald-100 !border-emerald-400 !text-emerald-700"
                : ""
            }`}
            title={copiedVoicing ? "¡Copiado!" : activeVoicingFrets ? `Copiar voicing (${activeVoicingFrets})` : "Sin voicing para copiar"}
            onClick={handleCopyVoicing}
            disabled={!activeVoicingFrets}
            aria-label="Copiar voicing al portapapeles"
          >
            {copiedVoicing ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {renderMainChordVoicingPicker("shrink-0")}
          {renderMainChordDistControl("w-[50px]")}
          <button
            type="button"
            className={UI_BTN_SM + " w-auto px-3"}
            title="Abre el análisis del acorde, del voicing y de sus tensiones."
            onClick={openMainChordStudy}
          >
            Estudiar
          </button>
        </div>
      </div>
{/* Controles */}
<div className="bg-white px-3 pb-3">
  <div className="border-t border-slate-200 pt-3 overflow-x-auto">
    {chordControlsGrid}
  </div>
</div>
    </fieldset>
  );

  // ── Selector de fretboard (modo acorde) ─────────────────────────────────────
  const chordFretboardSection = chordFamily === "quartal" ? (
    <ChordFretboard
      voicing={activeQuartalVoicing}
      emptyMessage={`No he encontrado apilados ${chordQuartalSpread === "open" ? "abiertos" : "cerrados"} con la distancia actual. Prueba a subir la distancia o cambiar el apilado.`}
      roleForPc={quartalRoleOfPc}
      labelForPc={labelForQuartalPc}
      noteNameForPc={quartalNoteNameForPc}
    />
  ) : chordFamily === "guide_tones" ? (
    <GuideToneFretboard
      voicing={activeGuideToneVoicing}
      emptyMessage="No he encontrado shells de notas guía con los filtros actuales. Prueba a cambiar forma, inversión o distancia."
    />
  ) : (
    <div data-testid="fretboard-notes">
      <ChordFretboard
        voicing={activeChordVoicing}
        emptyMessage={
          chordEnginePlan.insufficientNotes
            ? "No hay notas suficientes para formar un acorde. Añade una extensión o desactiva una omisión."
            : (chordEnginePlan.structure === "tetrad" && !chordEnginePlan.ext7)
              ? "No hay 7ª activa: esto no es una cuatriada. Activa la 7ª o cambia la estructura a Acorde/Add."
              : chordVoicingsResolving
                ? ""
              : (chordDbError || "No he encontrado voicings para este acorde con los filtros actuales. Prueba a cambiar forma, inversión, distancia o permitir cuerdas al aire.")
        }
      />
    </div>
  );

  // ── Renderizado del panel de editor (mobile vs desktop) ─────────────────────
  let editorSlot;
  if (isMobileLayout) {
    editorSlot = mobileChordEditorOpen && !chordDetectMode && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xl:hidden">
            <div className="w-full max-w-[430px]">
              {chordEditorPanel}
            </div>
          </div>,
          document.body
        )
      : null;
  } else {
    editorSlot = chordDetectMode ? null : desktopChordEditorPanel;
  }

  return (
    <div className="space-y-3">
      <PanelBlock
        title={sectionTitle}
        headerAside={modeToggle}
        bodyClassName="space-y-2"
      >
        {chordCopyNotice ? (
          <div
            data-testid="chord-copy-notice"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
          >
            {chordCopyNotice}
          </div>
        ) : null}

        {isMobileLayout && !chordDetectMode ? renderMobileChordSummaryCard() : null}

        {editorSlot}

        {chordDetectMode ? (
          <div
            ref={chordDetectInvestigationAreaRef}
            style={chordDetectClearMinHeight ? { minHeight: chordDetectClearMinHeight } : undefined}
          >
            {renderChordInvestigationFretboard()}
          </div>
        ) : (
          chordFretboardSection
        )}
      </PanelBlock>
    </div>
  );
}
