import PanelBlock from "../PanelBlock.jsx";
import { KING_BOX_DEFAULTS, LETTERS, NATURAL_PC, TONAL_CONTEXT_TOOLTIP } from "../../music/appStaticData.js";
import { mod12 } from "../../music/appMusicBasics.js";

export function TonalContextFields({ root, notation, scale, harmony, extra, kingBox, summary, ui }) {
  const {
    scaleRootLetter, setScaleRootLetter,
    scaleRootAcc, setScaleRootAcc,
    setRootPc,
  } = root;
  const { accMode, setAccMode } = notation;
  const {
    scaleName, setScaleName,
    scaleOptions, scaleOptionLabel, scaleSelectWidth,
    customInput, setCustomInput,
  } = scale;
  const { harmonyMode, setHarmonyMode, harmonyModeSelectWidth } = harmony;
  const { extraInput, setExtraInput, showExtra, setShowExtra } = extra;
  const {
    isKingBoxEligibleScale,
    showKingBoxes, setShowKingBoxes,
    kingBoxMode, setKingBoxMode,
    kingBoxColors, setKingBoxColors,
  } = kingBox;
  const { scaleTetradDegreesText, scaleTetradNotesText } = summary;
  const {
    ToggleButton,
    UI_LABEL_SM, UI_SELECT_SM, UI_SELECT_SM_TONE, UI_SELECT_SM_AUTO,
    UI_INPUT_SM, UI_BTN_SM,
  } = ui;

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={UI_LABEL_SM}>Nota raíz</label>
            <div className="mt-1 flex items-center gap-1.5">
              <select
                data-testid="scale-root-select"
                className={UI_SELECT_SM_TONE}
                value={scaleRootLetter}
                onChange={(e) => {
                  const letter = e.target.value;
                  if (!Object.prototype.hasOwnProperty.call(NATURAL_PC, letter)) return;
                  setScaleRootLetter(letter);
                  setScaleRootAcc(null);
                  setRootPc(mod12(NATURAL_PC[letter]));
                }}
                title="Tónica (letra)"
              >
                {LETTERS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className={`${UI_BTN_SM} ${scaleRootAcc === "flat" ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                title="Bajar 1 semitono (b). Si ya está alterado, vuelve a natural."
                onClick={() => {
                  const nat = mod12(NATURAL_PC[scaleRootLetter]);
                  if (scaleRootAcc === "flat") {
                    setScaleRootAcc(null);
                    setRootPc(nat);
                    return;
                  }
                  setScaleRootAcc("flat");
                  setRootPc(mod12(nat - 1));
                }}
              >
                b
              </button>

              <button
                type="button"
                className={`${UI_BTN_SM} ${scaleRootAcc === "sharp" ? "!bg-[#71a3c1] !text-slate-900 !border-[#71a3c1]" : ""}`}
                title="Subir 1 semitono (#). Si ya está alterado, vuelve a natural."
                onClick={() => {
                  const nat = mod12(NATURAL_PC[scaleRootLetter]);
                  if (scaleRootAcc === "sharp") {
                    setScaleRootAcc(null);
                    setRootPc(nat);
                    return;
                  }
                  setScaleRootAcc("sharp");
                  setRootPc(mod12(nat + 1));
                }}
              >
                #
              </button>
            </div>
          </div>

          <div>
            <div className={UI_LABEL_SM}>Notación</div>
            <div className="mt-1 flex gap-1.5">
              <ToggleButton
                active={accMode === "auto"}
                onClick={() => setAccMode("auto")}
                title="Auto usa la armadura esperada; por ejemplo, en F mayor usa Bb, no A#."
              >
                Auto
              </ToggleButton>
              <ToggleButton active={accMode === "sharps"} onClick={() => setAccMode("sharps")} title="Forzar sostenidos">
                #
              </ToggleButton>
              <ToggleButton active={accMode === "flats"} onClick={() => setAccMode("flats")} title="Forzar bemoles">
                b
              </ToggleButton>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <label className={UI_LABEL_SM}>Escala</label>
          <select
            data-testid="scale-mode-select"
            className={UI_SELECT_SM_AUTO + " mt-1 w-full sm:w-auto"}
            style={{ width: scaleSelectWidth }}
            value={scaleName}
            onChange={(e) => setScaleName(e.target.value)}
            title="Selecciona una escala/preset"
          >
            {scaleOptions.map((s) => (
              <option key={s} value={s}>
                {scaleOptionLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label className={UI_LABEL_SM}>Armonización</label>
          <select
            className={UI_SELECT_SM_AUTO + " mt-1 w-full sm:w-auto"}
            style={{ width: harmonyModeSelectWidth }}
            value={harmonyMode}
            onChange={(e) => setHarmonyMode(e.target.value)}
            title="Define si la armonización es diatónica o funcional menor (V7 en escalas menores)"
          >
            <option value="diatonic">Diatónica</option>
            <option value="functional_minor">Funcional menor (V7)</option>
          </select>
        </div>

        <div className="min-w-0">
          <div className={UI_LABEL_SM}>Notas extra</div>
          <div className="mt-1 flex items-center gap-1.5">
            <input
              className={UI_INPUT_SM + " w-14"}
              value={extraInput}
              onChange={(e) => setExtraInput(e.target.value)}
              placeholder="Ej: b2"
              title="Notas/intervalos a resaltar como extra"
            />
            <ToggleButton active={showExtra} onClick={() => setShowExtra((v) => !v)} title="Activa/desactiva las notas extra">
              {showExtra ? "Extra ON" : "Extra OFF"}
            </ToggleButton>
          </div>
        </div>

        {isKingBoxEligibleScale ? (
          <div className="min-w-0 shrink-0">
            <div className={UI_LABEL_SM}>Casita blues</div>
            <div className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-sky-50 px-2 text-xs text-slate-700">
              <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700" title="Muestra las casitas de blues sobre el mástil de escala">
                <input
                  type="checkbox"
                  checked={showKingBoxes}
                  onChange={(e) => setShowKingBoxes(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                Casita
              </label>
              <select
                className={UI_SELECT_SM.replace("w-full", "") + " h-7 w-28 px-2 text-xs"}
                value={kingBoxMode}
                onChange={(e) => setKingBoxMode(e.target.value)}
                disabled={!showKingBoxes}
                title="Elige la casita a resaltar"
              >
                <option value="bb">B.B. King</option>
                <option value="albert">Albert</option>
                <option value="both">Ambas</option>
              </select>
              <label className="inline-flex items-center gap-1" title={KING_BOX_DEFAULTS.bb.label}>
                <span>BB</span>
                <input
                  type="color"
                  value={kingBoxColors.bb}
                  onChange={(e) => setKingBoxColors((prev) => ({ ...prev, bb: e.target.value }))}
                  className="h-7 w-8 cursor-pointer rounded-md border border-slate-200 bg-white"
                  title="Color del borde de B.B. King"
                />
              </label>
              <label className="inline-flex items-center gap-1" title={KING_BOX_DEFAULTS.albert.label}>
                <span>A</span>
                <input
                  type="color"
                  value={kingBoxColors.albert}
                  onChange={(e) => setKingBoxColors((prev) => ({ ...prev, albert: e.target.value }))}
                  className="h-7 w-8 cursor-pointer rounded-md border border-slate-200 bg-white"
                  title="Color del borde de Albert King"
                />
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {scaleName === "Personalizada" ? (
        <div className="mt-3">
          <div className={UI_LABEL_SM}>Intervalos personalizados</div>
          <input
            className={UI_INPUT_SM + " mt-1 w-full"}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Ej: 1 b3 5 6"
            title="Introduce intervalos (1–7 con b/#), notas (F, Ab, C#) o semitonos (s3)"
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm leading-6 text-slate-700">
        <span><b>Grados:</b> {scaleTetradDegreesText}<span className="mx-3 select-none text-slate-300">|</span></span>
        <span><b>Notas:</b> {scaleTetradNotesText}</span>
      </div>
    </>
  );
}

export default function TonalContextPanel({ panel, root, notation, scale, harmony, extra, kingBox, summary, ui }) {
  const { tonalContextRef, tonalContextSummary, className = "" } = panel;
  return (
    <PanelBlock
      ref={tonalContextRef}
      title="Contexto tonal"
      titleTooltip={TONAL_CONTEXT_TOOLTIP}
      headerAside={<div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{tonalContextSummary}</div>}
      className={className}
    >
      <TonalContextFields
        root={root}
        notation={notation}
        scale={scale}
        harmony={harmony}
        extra={extra}
        kingBox={kingBox}
        summary={summary}
        ui={ui}
      />
    </PanelBlock>
  );
}
