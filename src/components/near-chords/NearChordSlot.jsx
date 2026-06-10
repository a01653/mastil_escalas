import React from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import PanelBlock from "../PanelBlock.jsx";
import { CopyVoicingButton } from "../chords/ChordsPanel.jsx";

import * as AppStaticData from "../../music/appStaticData.js";
const { NATURAL_PC, NATURAL_PCS, LETTERS } = AppStaticData;

import * as AppMusicBasics from "../../music/appMusicBasics.js";
const {
  mod12,
  chordUiLetterFromPc,
  fnBuildQuartalDegreeLabel,
  CHORD_QUALITIES,
  CHORD_STRUCTURES,
  CHORD_FAMILIES,
  CHORD_FORMS,
  CHORD_INVERSIONS,
  CHORD_QUARTAL_TYPES,
  CHORD_QUARTAL_VOICES,
  CHORD_QUARTAL_SPREADS,
  CHORD_QUARTAL_REFERENCES,
  CHORD_QUARTAL_SCALE_NAMES,
  CHORD_GUIDE_TONE_QUALITIES,
  CHORD_GUIDE_TONE_FORMS,
  CHORD_GUIDE_TONE_INVERSIONS,
} = AppMusicBasics;

import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";
const { isDropForm, hasEffectiveSeventh, buildChordExtensionTogglePatch, buildTetradEntryExtensionPatch } = AppVoicingStudyCore;

import * as AppPatternRouteStaffCore from "../../music/appPatternRouteStaffCore.jsx";
const { ChordNoteBadgeStrip } = AppPatternRouteStaffCore;

// UI constants — same strings as App.jsx and NearChordsPanel
const UI_SELECT_SM = "h-7 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_SELECT_SM_TONE = "h-7 w-[60px] rounded-xl border border-slate-200 bg-white px-1 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_SELECT_SM_AUTO = "h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_BTN_SM = "h-7 w-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold shadow-sm hover:bg-sky-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_LABEL_SM = "block text-[11px] font-semibold text-slate-700";
const UI_EXT_GRID = "mt-1 grid grid-cols-3 gap-x-3 gap-y-1 text-xs";

// nearChords layout constants
const nearSlotDesktopEditorClass = "flex flex-wrap items-end gap-2";
const nearSlotDesktopVoicingClass = "shrink-0";
const nearSlotDesktopVoicingCompactClass = "shrink-0";
const chordMobileEditorGridClass = "grid min-w-0 items-start justify-items-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]";
const chordMobileEditorTertianGridClass = "grid min-w-0 items-start gap-2 [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]";

function fnMaxTextCh(items, fallback = 8) {
  const maxLen = (items || []).reduce((acc, item) => {
    const label = typeof item === "string" ? item : (item?.label ?? item?.value ?? "");
    return Math.max(acc, String(label).length);
  }, 0);
  return `${Math.max(maxLen, fallback)}ch`;
}

export default function NearChordSlot({
  slot,
  idx,
  renderData,
  isMobileLayout,
  nearBgColors,
  colors,
  updateNearSlot,
  setStudyTarget,
  setStudyOpen,
  setMobileNearChordEditorIdx,
  mobileNearChordEditorIdx,
  setNearBgColor,
  nearSlotFamilyOf,
}) {
  const nearSelectWidthStyle = (items, fallback = 8) => (
    isMobileLayout ? undefined : { width: `calc(${fnMaxTextCh(items, fallback)} + 25px)` }
  );

  const {
    disableAll,
    errMsg,
    options,
    slotData,
    slotUi,
    badgeStripItems,
    titleText,
    nearTitle,
    description,
  } = renderData;

  function renderNearSlotToneControl(s, i, dis, className = "min-w-0") {
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>Tono</label>
        <div className="mt-1 flex items-center gap-1.5">
          <select
            data-testid={`near-slot-${i}-tone`}
            className={UI_SELECT_SM_TONE}
            style={{ width: "50px" }}
            value={chordUiLetterFromPc(s.rootPc, !!s.spellPreferSharps)}
            onChange={(e) => {
              const letter = e.target.value;
              if (Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) {
                updateNearSlot(i, { rootPc: mod12(NATURAL_PC[letter]), selFrets: null });
              }
            }}
            disabled={dis}
          >
            {LETTERS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            type="button"
            className={`${UI_BTN_SM} ${!dis && (!NATURAL_PCS.has(mod12(s.rootPc)) && !s.spellPreferSharps) ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
            title="Bajar 1 semitono"
            onClick={() => {
              const letter = chordUiLetterFromPc(s.rootPc, false);
              const nat = mod12(NATURAL_PC[letter]);
              const cur = mod12(s.rootPc);
              if (cur !== nat) {
                updateNearSlot(i, { rootPc: nat, selFrets: null, spellPreferSharps: false });
                return;
              }
              updateNearSlot(i, { rootPc: mod12(nat - 1), selFrets: null, spellPreferSharps: false });
            }}
            disabled={dis}
          >
            b
          </button>
          <button
            type="button"
            className={`${UI_BTN_SM} ${!dis && (!NATURAL_PCS.has(mod12(s.rootPc)) && s.spellPreferSharps) ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
            title="Subir 1 semitono"
            onClick={() => {
              const letter = chordUiLetterFromPc(s.rootPc, true);
              const nat = mod12(NATURAL_PC[letter]);
              const cur = mod12(s.rootPc);
              if (cur !== nat) {
                updateNearSlot(i, { rootPc: nat, selFrets: null, spellPreferSharps: true });
                return;
              }
              updateNearSlot(i, { rootPc: mod12(nat + 1), selFrets: null, spellPreferSharps: true });
            }}
            disabled={dis}
          >
            #
          </button>
        </div>
      </div>
    );
  }

  function renderNearSlotVoicingPicker(s, i, dis, opts, _errMsg, className = "min-w-0 flex-1") {
    const family = nearSlotFamilyOf(s);
    const voicingOptionLabels = opts.map((v) => v.frets);
    const voicingOptionTitles = opts.map((v) =>
      `${v.frets}${family === "quartal" && v.quartalDegree != null ? ` · ${fnBuildQuartalDegreeLabel(v.quartalDegree)}` : ""} — min ${v.minFret} · dist ${v.reach ?? (v.span + 1)}`
    );
    const voicingSelectClass = isMobileLayout
      ? `${UI_SELECT_SM} min-w-0 flex-1 max-w-[172px]`
      : `${UI_SELECT_SM_AUTO} w-[68px] max-w-[68px]`;
    const activeFrets = s.selFrets || opts[0]?.frets || null;
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>
          {isMobileLayout
            ? `Digitación en rango (${opts.length} opciones)`
            : `Voicing (${opts.length})`}
        </label>
        <div className="mt-1 flex items-center gap-1.5">
          <button
            type="button"
            className={UI_BTN_SM}
            title="Anterior"
            onClick={() => {
              if (!opts.length) return;
              const cur = s.selFrets ?? opts[0].frets;
              let iCur = opts.findIndex((v) => v.frets === cur);
              if (iCur < 0) iCur = 0;
              const iNew = (iCur - 1 + opts.length) % opts.length;
              updateNearSlot(i, { selFrets: opts[iNew].frets });
            }}
            disabled={dis || !opts.length}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <select
            data-testid={`near-slot-${i}-voicing-select`}
            className={voicingSelectClass}
            value={s.selFrets || "(auto)"}
            onChange={(e) => {
              const v = e.target.value;
              updateNearSlot(i, { selFrets: v === "(auto)" ? null : v });
            }}
            disabled={dis}
          >
            <option value="(auto)">(auto)</option>
            {opts.map((v, optionIdx) => (
              <option key={v.frets} value={v.frets} title={voicingOptionTitles[optionIdx]}>
                {voicingOptionLabels[optionIdx]}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={UI_BTN_SM}
            title="Siguiente"
            onClick={() => {
              if (!opts.length) return;
              const cur = s.selFrets ?? opts[0].frets;
              let iCur = opts.findIndex((v) => v.frets === cur);
              if (iCur < 0) iCur = 0;
              const iNew = (iCur + 1) % opts.length;
              updateNearSlot(i, { selFrets: opts[iNew].frets });
            }}
            disabled={dis || !opts.length}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <CopyVoicingButton
            frets={activeFrets}
            data-testid={`near-slot-${i}-copy-voicing`}
            disabled={dis || !activeFrets}
          />
        </div>
      </div>
    );
  }

  function renderNearSlotDistControl(s, i, dis, className = "min-w-0") {
    return (
      <div className={className}>
        <label className={UI_LABEL_SM}>Dist.</label>
        <select
          className={UI_SELECT_SM + " mt-1"}
          style={{ width: "50px" }}
          value={s.maxDist || 4}
          onChange={(e) => updateNearSlot(i, { maxDist: parseInt(e.target.value, 10), selFrets: null })}
          disabled={dis}
        >
          {[4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    );
  }

  function renderNearSlotQuartalEditor(s, i, dis, opts, _errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}>
        {renderNearSlotToneControl(s, i, dis, isMobileLayout ? "min-w-0" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(s)}
            onChange={(e) => updateNearSlot(i, { family: e.target.value, selFrets: null })}
            disabled={dis}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {s.quartalReference === "scale" ? (
          <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
            <label className={UI_LABEL_SM}>Escala</label>
            <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_SCALE_NAMES, 8)} value={s.quartalScaleName || "Mayor"} onChange={(e) => updateNearSlot(i, { quartalScaleName: e.target.value, selFrets: null })} disabled={dis}>
              {CHORD_QUARTAL_SCALE_NAMES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.
Diatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.
Por eso el resultado puede no tener la misma raíz elegida.`}>Referencia</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_REFERENCES, 11)} value={s.quartalReference || "root"} onChange={(e) => updateNearSlot(i, { quartalReference: e.target.value, selFrets: null })} disabled={dis} title={`Desde raíz: construye el acorde cuartal partiendo de la tónica elegida.
Diatónico a escala: toma la tónica elegida como centro tonal y genera acordes cuartales por grados de la escala que selecciones.
Por eso el resultado puede no tener la misma raíz elegida.`}>
            {CHORD_QUARTAL_REFERENCES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.
Abierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>Apilado</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_SPREADS, 8)} value={s.quartalSpread || "closed"} onChange={(e) => updateNearSlot(i, { quartalSpread: e.target.value, selFrets: null })} disabled={dis} title={`Cerrado: las voces quedan apiladas por cuartas sin desplazar ninguna una octava extra.
Abierto: una o más voces se redistribuyen por octava y la cadena deja de quedar compacta.`}>
            {CHORD_QUARTAL_SPREADS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Voces</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_VOICES, 5)} value={s.quartalVoices || "4"} onChange={(e) => updateNearSlot(i, { quartalVoices: e.target.value, selFrets: null })} disabled={dis}>
            {CHORD_QUARTAL_VOICES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM} title={`Puro: todas las cuartas son justas (4J).
Mixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>Tipo cuartal</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_QUARTAL_TYPES, 10)} value={s.quartalType || "pure"} onChange={(e) => updateNearSlot(i, { quartalType: e.target.value, selFrets: null })} disabled={dis} title={`Puro: todas las cuartas son justas (4J).
Mixto: combina 4J y al menos una 4ª aumentada (A4), así que no es puro.`}>
            {CHORD_QUARTAL_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(s, i, dis, opts, _errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(s, i, dis, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(s, i, dis, opts, _errMsg, nearSlotDesktopVoicingClass)}
            {renderNearSlotDistControl(s, i, dis, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotGuideToneEditor(s, i, dis, opts, _errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div className={isMobileLayout ? chordMobileEditorGridClass : nearSlotDesktopEditorClass}>
        {renderNearSlotToneControl(s, i, dis, isMobileLayout ? "min-w-0" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(s)}
            onChange={(e) => updateNearSlot(i, { family: e.target.value, selFrets: null })}
            disabled={dis}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Calidad</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_QUALITIES, 8)} value={s.guideToneQuality || "maj7"} onChange={(e) => updateNearSlot(i, { guideToneQuality: e.target.value, selFrets: null })} disabled={dis}>
            {CHORD_GUIDE_TONE_QUALITIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Forma</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_FORMS, 7)} value={s.guideToneForm || "closed"} onChange={(e) => updateNearSlot(i, { guideToneForm: e.target.value, selFrets: null })} disabled={dis}>
            {CHORD_GUIDE_TONE_FORMS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Inversión</label>
          <select className={UI_SELECT_SM + " mt-1"} style={nearSelectWidthStyle(CHORD_GUIDE_TONE_INVERSIONS, 10)} value={s.guideToneInversion || "all"} onChange={(e) => updateNearSlot(i, { guideToneInversion: e.target.value, selFrets: null })} disabled={dis}>
            {CHORD_GUIDE_TONE_INVERSIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(s, i, dis, opts, _errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(s, i, dis, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(s, i, dis, opts, _errMsg, nearSlotDesktopVoicingClass)}
            {renderNearSlotDistControl(s, i, dis, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotTertianEditor(s, i, dis, ui, opts, _errMsg, { showMobileVoicing = true } = {}) {
    return (
      <div className={isMobileLayout ? chordMobileEditorTertianGridClass : nearSlotDesktopEditorClass}>
        {renderNearSlotToneControl(s, i, dis, isMobileLayout ? "min-w-0 col-span-2" : "shrink-0")}
        <div className={isMobileLayout ? "min-w-0 order-1" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Familia</label>
          <select
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_FAMILIES, 9)}
            value={nearSlotFamilyOf(s)}
            onChange={(e) => updateNearSlot(i, { family: e.target.value, selFrets: null })}
            disabled={dis}
          >
            {CHORD_FAMILIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-5 col-span-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Calidad / Sus</label>
          <div className="mt-1 flex flex-nowrap gap-1.5">
            <select data-testid={`near-slot-${i}-quality`} className={UI_SELECT_SM_AUTO} style={nearSelectWidthStyle(CHORD_QUALITIES, 8)} value={s.quality} onChange={(e) => updateNearSlot(i, { quality: e.target.value, selFrets: null })} disabled={dis}>
              {CHORD_QUALITIES.map((q) => (
                <option key={q.value} value={q.value} disabled={(q.value === "hdim" && s.structure === "triad" && !s.ext7) || (q.value === "dom" && s.structure === "triad" && !s.ext7)}>{q.label}</option>
              ))}
            </select>
            <select
              className={UI_SELECT_SM_AUTO}
              style={nearSelectWidthStyle(["Sus —", "sus2", "sus4"], 6)}
              value={s.suspension || "none"}
              onChange={(e) => {
                const v = e.target.value;
                updateNearSlot(i, { suspension: v, selFrets: null });
                if (v !== "none" && (s.quality === "dim" || s.quality === "hdim")) {
                  updateNearSlot(i, { quality: "maj", selFrets: null });
                }
              }}
              disabled={dis}
              title="Suspensión: reemplaza la 3ª por 2ª o 4ª"
            >
              <option value="none">Sus —</option>
              <option value="sus2">sus2</option>
              <option value="sus4">sus4</option>
            </select>
          </div>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Estructura</label>
          <select
            data-testid={`near-slot-${i}-structure`}
            className={UI_SELECT_SM + " mt-1"}
            style={nearSelectWidthStyle(CHORD_STRUCTURES, 9)}
            value={s.structure}
            onChange={(e) => {
              const val = e.target.value;
              const patch = val === "triad"
                ? { ext6: false, ext7: false, ext9: false, ext11: false, ext13: false }
                : val === "chord"
                  ? {}
                  : buildTetradEntryExtensionPatch(s);
              updateNearSlot(i, {
                structure: val,
                selFrets: null,
                inversion: "all",
                form: "open",
                positionForm: "open",
                ...patch,
              });
            }}
            disabled={dis}
          >
            {CHORD_STRUCTURES.map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-4" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Forma</label>
          {ui.usesManualForm ? (
            <select
              className={UI_SELECT_SM_AUTO + " mt-1"}
              style={nearSelectWidthStyle(CHORD_FORMS, 9)}
              value={s.form}
              onChange={(e) => {
                const v = e.target.value;
                updateNearSlot(i, {
                  form: v,
                  positionForm: isDropForm(v) ? (s.positionForm || "closed") : v,
                  selFrets: null,
                });
              }}
              disabled={dis}
              title="Elige la disposición del acorde: cerrado, abierto o drop"
            >
              {CHORD_FORMS.map((form) => (
                <option key={form.value} value={form.value} disabled={isDropForm(form.value) && !ui.dropEligible}>{form.label}</option>
              ))}
            </select>
          ) : (
            <div className="mt-1 inline-flex h-7 items-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-xs text-slate-500">Automática</div>
          )}
        </div>
        <div className={isMobileLayout ? "min-w-0 order-3" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Inversión</label>
          <select data-testid={`near-slot-${i}-inversion`} className={UI_SELECT_SM_AUTO + " mt-1"} style={nearSelectWidthStyle(CHORD_INVERSIONS, 10)} value={s.inversion} onChange={(e) => updateNearSlot(i, { inversion: e.target.value, selFrets: null })} disabled={dis}>
            {CHORD_INVERSIONS.map((inv) => (
              <option key={inv.value} value={inv.value} disabled={!ui.allowThirdInversion && inv.value === "3"}>{inv.label}</option>
            ))}
          </select>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-6 col-span-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Extensiones</label>
          <div className={UI_EXT_GRID}>
            {ui.ext.showSeven ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" data-testid={`near-slot-${i}-ext7`} checked={hasEffectiveSeventh({ structure: s.structure, ext7: s.ext7, ext6: s.ext6, ext9: s.ext9, ext11: s.ext11, ext13: s.ext13 })} onChange={(e) => updateNearSlot(i, { ext7: e.target.checked, selFrets: null })} disabled={dis || !ui.ext.canToggleSeven} /> 7
              </label>
            ) : null}
            {ui.ext.showSix ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" data-testid={`near-slot-${i}-ext6`} checked={!!s.ext6} onChange={(e) => updateNearSlot(i, { ...buildChordExtensionTogglePatch({ structure: s.structure, omit: s.omit || "none", ext: "6", value: e.target.checked }), selFrets: null })} disabled={dis || !ui.ext.canToggleSix} /> 6
              </label>
            ) : null}
            {ui.ext.showNine ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" data-testid={`near-slot-${i}-ext9`} checked={!!s.ext9} onChange={(e) => updateNearSlot(i, { ...buildChordExtensionTogglePatch({ structure: s.structure, omit: s.omit || "none", ext: "9", value: e.target.checked }), selFrets: null })} disabled={dis || !ui.ext.canToggleNine} /> 9
              </label>
            ) : null}
            {ui.ext.showEleven ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" data-testid={`near-slot-${i}-ext11`} checked={!!s.ext11} onChange={(e) => updateNearSlot(i, { ...buildChordExtensionTogglePatch({ structure: s.structure, omit: s.omit || "none", ext: "11", value: e.target.checked }), selFrets: null })} disabled={dis || !ui.ext.canToggleEleven} /> 11
              </label>
            ) : null}
            {ui.ext.showThirteen ? (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" data-testid={`near-slot-${i}-ext13`} checked={!!s.ext13} onChange={(e) => updateNearSlot(i, { ...buildChordExtensionTogglePatch({ structure: s.structure, omit: s.omit || "none", ext: "13", value: e.target.checked }), selFrets: null })} disabled={dis || !ui.ext.canToggleThirteen} /> 13
              </label>
            ) : null}
          </div>
        </div>
        <div className={isMobileLayout ? "min-w-0 order-7 col-span-2" : "shrink-0"}>
          <label className={UI_LABEL_SM}>Omitir</label>
          <div className={UI_EXT_GRID}>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" data-testid={`near-slot-${i}-omit-1`} checked={s.omit === "1"} onChange={(e) => updateNearSlot(i, { omit: e.target.checked ? "1" : "none", selFrets: null })} disabled={dis || (s.omit === "1" && !ui.omit?.canToggleOff)} /> 1
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" data-testid={`near-slot-${i}-omit-3`} checked={s.omit === "3"} onChange={(e) => updateNearSlot(i, { omit: e.target.checked ? "3" : "none", selFrets: null })} disabled={dis || s.suspension !== "none" || (s.omit === "3" && !ui.omit?.canToggleOff)} /> 3
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" data-testid={`near-slot-${i}-omit-5`} checked={s.omit === "5"} onChange={(e) => updateNearSlot(i, { omit: e.target.checked ? "5" : "none", selFrets: null })} disabled={dis || (s.omit === "5" && !ui.omit?.canToggleOff)} /> 5
            </label>
          </div>
        </div>
        {isMobileLayout ? showMobileVoicing ? (
          <>
            {renderNearSlotVoicingPicker(s, i, dis, opts, _errMsg, "min-w-0 flex-1")}
            {renderNearSlotDistControl(s, i, dis, "min-w-0")}
          </>
        ) : null : (
          <div className="ml-auto flex items-end gap-2">
            {renderNearSlotVoicingPicker(s, i, dis, opts, _errMsg, nearSlotDesktopVoicingCompactClass)}
            {renderNearSlotDistControl(s, i, dis, "shrink-0")}
          </div>
        )}
      </div>
    );
  }

  function renderNearSlotEditorFields(s, i, dis, ui, opts, _errMsg, extraOpts = {}) {
    if (nearSlotFamilyOf(s) === "quartal") {
      return renderNearSlotQuartalEditor(s, i, dis, opts, _errMsg, extraOpts);
    }
    if (nearSlotFamilyOf(s) === "guide_tones") {
      return renderNearSlotGuideToneEditor(s, i, dis, opts, _errMsg, extraOpts);
    }
    return renderNearSlotTertianEditor(s, i, dis, ui, opts, _errMsg, extraOpts);
  }

  function renderNearSlotOpenStringsToggle(s, i, dis, className = "") {
    return (
      <label
        className={`inline-flex h-7 items-center gap-2 rounded-xl border px-2 text-xs font-semibold ${dis ? "cursor-not-allowed" : ""} ${className}`.trim()}
        style={dis ? {
          backgroundColor: "var(--control-disabled-bg)",
          borderColor: "var(--control-disabled-border)",
          color: "var(--control-disabled-text)",
        } : undefined}
        title="Permite usar cuerdas al aire como opción de voicing dentro del rango. La distancia se calcula solo con las notas pisadas."
      >
        <span>Permitir cuerdas al aire</span>
        <input
          type="checkbox"
          checked={s.allowOpenStrings === true}
          onChange={(e) => updateNearSlot(i, { allowOpenStrings: e.target.checked, selFrets: null })}
          disabled={dis}
          title="Permite usar cuerdas al aire como opción de voicing dentro del rango. La distancia se calcula solo con las notas pisadas."
          className="h-4 w-4 rounded border-slate-300"
        />
      </label>
    );
  }

  function renderEditorPortal() {
    if (!isMobileLayout || mobileNearChordEditorIdx !== idx || typeof document === "undefined") return null;

    const editorPanel = (
      <PanelBlock
        level="subsection"
        title={`Editar ${titleText}`}
        description={description}
        className="w-full max-h-[calc(100vh-6rem)] shadow-2xl"
        bodyClassName="max-h-[calc(100vh-11rem)] overflow-y-auto overflow-x-visible"
        headerAside={<button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-sky-50"
            onClick={() => setMobileNearChordEditorIdx(null)}
            aria-label="Cerrar edición de acorde cercano"
          >
            <X className="h-4 w-4" />
          </button>}
      >
        <div className="mb-3">
          <label className={UI_LABEL_SM}>Color del acorde</label>
          <div className="mt-1 inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-700">Fondo</span>
            <input
              type="color"
              value={nearBgColors[idx]}
              onChange={(e) => setNearBgColor(idx, e.target.value)}
              className="h-6 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
              disabled={disableAll}
            />
          </div>
        </div>
        {renderNearSlotEditorFields(slot, idx, disableAll, slotUi, options, errMsg, { showMobileVoicing: false })}
      </PanelBlock>
    );

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xl:hidden">
        <div className="w-full max-w-[430px]">
          {editorPanel}
        </div>
      </div>,
      document.body
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobileLayout) {
    return (
      <>
        <PanelBlock
          data-testid={`near-slot-${idx}`}
          as="div"
          level="subsection"
          title={nearTitle}
          description={null}
          disabledHeader={disableAll}
          collapsed={!slot.enabled}
          bodyClassName="overflow-visible"
          headerAside={<div className="flex items-center gap-1.5">
              <button
                type="button"
                className={`${UI_BTN_SM} inline-flex items-center justify-center`}
                title="Abre el análisis del acorde, del voicing y de sus tensiones."
                onClick={() => {
                  setStudyTarget(String(idx));
                  setStudyOpen(true);
                }}
                disabled={disableAll}
                aria-label={`Estudiar Acorde ${idx + 1}`}
              >
                <BookOpen className="h-4 w-4" />
              </button>
              <label className="inline-flex h-7 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm">
                <input
                  type="checkbox"
                  checked={!!slot.enabled}
                  onChange={(e) => updateNearSlot(idx, { enabled: e.target.checked, selFrets: null })}
                  className="h-4 w-4 rounded border-slate-300"
                  title={`Activar/desactivar Acorde ${idx + 1}`}
                />
                <span>Activo</span>
              </label>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-sky-50 hover:text-slate-900"
                onClick={() => setMobileNearChordEditorIdx(idx)}
                aria-label={`Editar Acorde ${idx + 1}`}
              >
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            </div>}
        >
          <div className="mb-3 text-[13px] font-semibold leading-5 text-slate-600">
            {description}
          </div>
          {errMsg ? (
            <div className="mb-3 text-xs font-semibold text-rose-400">
              {errMsg}
            </div>
          ) : null}
          {badgeStripItems.length ? (
            <div>
              <ChordNoteBadgeStrip
                items={badgeStripItems}
                bassNote={slotData?.bassName || null}
                colorMap={colors}
              />
            </div>
          ) : null}
          <div className={badgeStripItems.length ? "mt-3" : ""}>
            {renderNearSlotOpenStringsToggle(slot, idx, disableAll)}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[210px] flex-1">
              {renderNearSlotVoicingPicker(slot, idx, disableAll, options, errMsg)}
            </div>
            {renderNearSlotDistControl(slot, idx, disableAll, "shrink-0")}
          </div>
        </PanelBlock>
        {renderEditorPortal()}
      </>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <>
      <PanelBlock
        data-testid={`near-slot-${idx}`}
        as="div"
        level="subsection"
        title={nearTitle}
        description={description}
        disabledHeader={disableAll}
        collapsed={!slot.enabled}
        bodyClassName="overflow-visible"
        headerAside={<div className="flex items-center gap-2">
            {renderNearSlotOpenStringsToggle(slot, idx, disableAll)}
            <button
              type="button"
              className={UI_BTN_SM + " w-auto px-3"}
              title="Abre el análisis del acorde, del voicing y de sus tensiones."
              onClick={() => {
                setStudyTarget(String(idx));
                setStudyOpen(true);
              }}
              disabled={disableAll}
            >
              Estudiar
            </button>
            <span
              className="text-xs font-semibold"
              style={disableAll ? { color: "var(--control-disabled-text)" } : undefined}
            >
              Fondo
            </span>
            <input
              type="color"
              value={nearBgColors[idx]}
              onChange={(e) => setNearBgColor(idx, e.target.value)}
              className="h-6 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
              disabled={disableAll}
            />
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                data-testid={`near-slot-${idx}-enabled`}
                type="checkbox"
                checked={!!slot.enabled}
                onChange={(e) => updateNearSlot(idx, { enabled: e.target.checked, selFrets: null })}
                className="h-4 w-4 rounded border-slate-300"
                title={`Activar/desactivar Acorde ${idx + 1}`}
              />
              Activo
            </label>
          </div>}
      >
        {badgeStripItems.length ? (
          <div className="mb-3">
            <ChordNoteBadgeStrip
              items={badgeStripItems}
              bassNote={slotData?.bassName || null}
              colorMap={colors}
            />
          </div>
        ) : null}
        {nearSlotFamilyOf(slot) === "quartal"
          ? renderNearSlotQuartalEditor(slot, idx, disableAll, options, errMsg)
          : nearSlotFamilyOf(slot) === "guide_tones"
            ? renderNearSlotGuideToneEditor(slot, idx, disableAll, options, errMsg)
            : renderNearSlotTertianEditor(slot, idx, disableAll, slotUi, options, errMsg)}
      </PanelBlock>
      {renderEditorPortal()}
    </>
  );
}
