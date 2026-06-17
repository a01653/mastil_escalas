import PanelBlock from "../PanelBlock.jsx";
import ColorPickerPopover from "../ui/ColorPickerPopover.jsx";

export default function AppConfigPanel({ view, theme, colorState, presets, actions, layout, ui }) {
  const {
    showNotesLabel, setShowNotesLabel,
    showIntervalsLabel, setShowIntervalsLabel,
    maxFret, setMaxFret,
    showNonScale, setShowNonScale,
    debugMode, setDebugMode,
  } = view;

  const {
    themePageBg, setThemePageBg,
    themeObjectBg, setThemeObjectBg,
    themeSectionHeaderBg, setThemeSectionHeaderBg,
    themeElementBg, setThemeElementBg,
    themeDisabledControlBg, setThemeDisabledControlBg,
  } = theme;

  const { colors, setColor, legend } = colorState;

  const {
    selectedQuickPresetSlot, setSelectedQuickPresetSlot,
    quickPresets,
    loadQuickPreset, selectedQuickPresetIndex, selectedQuickPreset,
    saveQuickPreset,
    QUICK_PRESET_COUNT,
  } = presets;

  const { exportUiConfig, resetUiConfig, importConfigInputRef } = actions;

  void layout;

  const { ToggleButton, UI_LABEL_SM, UI_SELECT_SM, UI_BTN_SM } = ui;

  function renderColorPanels(extraClassName = "") {
    return (
      <div className={extraClassName.trim()}>
        <PanelBlock level="subsection" title="Colores (círculos)">
          <div className="flex flex-wrap gap-1.5">
            {[
              { k: "root", label: legend.root },
              { k: "third", label: legend.third },
              { k: "fifth", label: legend.fifth },
              { k: "other", label: legend.other },
              { k: "extra", label: legend.extra },
              { k: "route", label: "Ruta" },
            ].map((it) => (
              <div key={it.k} className="inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1" style={{ backgroundColor: "#ffffff" }}>
                <ColorPickerPopover
                  value={colors[it.k]}
                  onChange={(v) => setColor(it.k, v)}
                  label={it.label}
                  swatchClass="h-6 w-7 cursor-pointer rounded-md border-2 border-slate-300 shadow-sm transition-colors hover:border-sky-400"
                />
              </div>
            ))}
          </div>
        </PanelBlock>

        <PanelBlock level="subsection" title="Colores (acordes: 7/6/9/11/13)">
          <div className="flex flex-wrap gap-1.5">
            {[
              { k: "seventh", label: "7ª" },
              { k: "sixth", label: "6ª" },
              { k: "ninth", label: "9ª" },
              { k: "eleventh", label: "11ª" },
              { k: "thirteenth", label: "13ª" },
            ].map((it) => (
              <div key={it.k} className="inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1" style={{ backgroundColor: "#ffffff" }}>
                <ColorPickerPopover
                  value={colors[it.k]}
                  onChange={(v) => setColor(it.k, v)}
                  label={it.label}
                  swatchClass="h-6 w-7 cursor-pointer rounded-md border-2 border-slate-300 shadow-sm transition-colors hover:border-sky-400"
                />
              </div>
            ))}
          </div>
        </PanelBlock>

      </div>
    );
  }

  return (
    <PanelBlock
      title="Configuración"
      description="Ajustes globales, colores y acciones de configuración general de la app."
      bodyClassName="space-y-3"
    >
      <PanelBlock
        as="div"
        level="subsection"
        title="Parámetros globales"
        description="Controles globales: afectan a varios paneles o a toda la vista."
      >
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <div className="min-w-0 sm:min-w-[420px]">
            <label className={UI_LABEL_SM}>Preset rápido</label>
            <div className="mt-1 flex items-center gap-2">
              <select
                className={UI_SELECT_SM + " w-44"}
                value={selectedQuickPresetSlot}
                onChange={(e) => setSelectedQuickPresetSlot(e.target.value)}
                title="Elige el preset rápido que quieres restaurar o guardar"
              >
                {Array.from({ length: QUICK_PRESET_COUNT }, (_, i) => (
                  <option key={i} value={String(i)}>
                    {quickPresets[i]?.name || `Preset ${i + 1}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={UI_BTN_SM + " w-auto shrink-0 px-3"}
                onClick={() => loadQuickPreset(selectedQuickPresetIndex)}
                disabled={!selectedQuickPreset}
                title={selectedQuickPreset?.savedAt ? `${selectedQuickPreset?.name} · ${selectedQuickPreset?.savedAt}` : "El preset seleccionado está vacío"}
              >
                Restaurar
              </button>
              <button
                type="button"
                className={UI_BTN_SM + " w-auto shrink-0 px-3"}
                onClick={() => saveQuickPreset(selectedQuickPresetIndex)}
                title={`Guardar configuración actual en Preset ${selectedQuickPresetIndex + 1}`}
              >
                Guardar
              </button>
            </div>
          </div>

          <div>
            <div className={UI_LABEL_SM}>Vista</div>
            <div className="mt-1 flex gap-1.5">
              <ToggleButton active={showNotesLabel} onClick={() => setShowNotesLabel((v) => !v)} title="Muestra nombre de la nota">
                Notas
              </ToggleButton>
              <ToggleButton active={showIntervalsLabel} onClick={() => setShowIntervalsLabel((v) => !v)} title="Muestra grado/intervalo">
                Intervalos
              </ToggleButton>
            </div>
          </div>

          <div className="min-w-0 sm:min-w-[130px]">
            <label className={UI_LABEL_SM}>Trastes</label>
            <select
              className={UI_SELECT_SM + " mt-1"}
              value={maxFret}
              onChange={(e) => setMaxFret(parseInt(e.target.value, 10))}
              title="Rango de trastes"
            >
              {[12, 15, 18, 21, 24].map((n) => (
                <option key={n} value={n}>
                  0–{n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={UI_LABEL_SM}>Fondo</div>
            <div className="mt-1 flex gap-1.5">
              <ToggleButton active={showNonScale} onClick={() => setShowNonScale((v) => !v)} title="Muestra todas las notas posibles en los mástiles compatibles">
                Ver todo
              </ToggleButton>
            </div>
          </div>

          <div>
            <div className={UI_LABEL_SM}>Debug</div>
            <div className="mt-1 flex gap-1.5">
              <ToggleButton active={debugMode} onClick={() => setDebugMode((v) => !v)} title="Muestra detalles técnicos de cálculo de rutas">
                Debug
              </ToggleButton>
            </div>
          </div>
        </div>
      </PanelBlock>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={exportUiConfig}>
          Exportar config
        </button>
        <button
          type="button"
          className={UI_BTN_SM + " w-auto px-3"}
          onClick={() => importConfigInputRef.current && importConfigInputRef.current.click()}
        >
          Importar config
        </button>
        <button type="button" className={UI_BTN_SM + " w-auto px-3"} onClick={resetUiConfig}>
          Restablecer
        </button>
      </div>

      <PanelBlock
        as="div"
        level="subsection"
        title="Tema"
        description="Ajusta el color del fondo general y de los paneles de la página."
      >
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Fondo página</label>
            <div className="mt-1">
              <ColorPickerPopover value={themePageBg} onChange={setThemePageBg} />
            </div>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Fondo objetos</label>
            <div className="mt-1">
              <ColorPickerPopover value={themeObjectBg} onChange={setThemeObjectBg} />
            </div>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Cabecera secciones</label>
            <div className="mt-1">
              <ColorPickerPopover value={themeSectionHeaderBg} onChange={setThemeSectionHeaderBg} />
            </div>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Elementos</label>
            <div className="mt-1">
              <ColorPickerPopover value={themeElementBg} onChange={setThemeElementBg} />
            </div>
          </div>

          <div className="min-w-0">
            <label className={UI_LABEL_SM}>Controles deshabilitados</label>
            <div className="mt-1">
              <ColorPickerPopover value={themeDisabledControlBg} onChange={setThemeDisabledControlBg} />
            </div>
          </div>
        </div>
      </PanelBlock>

      {renderColorPanels("grid gap-3")}
    </PanelBlock>
  );
}
