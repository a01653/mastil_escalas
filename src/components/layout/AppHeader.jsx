import React from "react";
import { BookOpen, HelpCircle, Layers2, Menu, Music, Route, Settings, Waypoints, X } from "lucide-react";
import { ToggleButton } from "../ui/AppUiPrimitives.jsx";

export function ChordDiagramIcon({ className = "", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true" {...props}>
      <path d="M4.5 4h15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      {[5, 8.5, 12, 15.5, 19].map((x) => (
        <path key={x} d={`M${x} 4.9v15.1`} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      ))}
      {[8, 12, 16].map((y) => (
        <path key={y} d={`M5  ${y}h14`} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      ))}
      <circle cx="16.5" cy="7.2" r="1.75" fill="#145bf0" />
      <circle cx="12" cy="11.2" r="1.75" fill="#145bf0" />
      <circle cx="8.5" cy="15.2" r="1.75" fill="#145bf0" />
    </svg>
  );
}


function NavIconLabel({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {React.createElement(icon, { className: "h-4 w-4 shrink-0", "aria-hidden": "true" })}
      <span>{label}</span>
    </span>
  );
}

export default function AppHeader({
  appVersion,
  mobileMenuOpen,
  setMobileMenuOpen,
  effectiveBoards,
  selectBoardView,
  importConfigInputRef,
  importUiConfigFromFile,
  configNotice,
  UI_BTN_SM,
  setManualOpen,
}) {
  return (
    <header className="mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold sm:text-xl">Mástil interactivo: escalas, comparación, rutas y acordes</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm xl:hidden"
            title={mobileMenuOpen ? "Cerrar configuración" : "Abrir configuración"}
            onClick={() => setMobileMenuOpen((v) => !v)}>
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">ver. {appVersion}</span>
        </div>
      </div>
      <div className="mt-2 hidden items-center gap-3 xl:flex">
        <span className="text-xs font-semibold text-slate-700">Menu</span>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleButton active={effectiveBoards.scale} onClick={() => selectBoardView("scale")} title="Muestra el mástil de la escala" testId="nav-scale">
            <NavIconLabel icon={Music} label="Escala" />
          </ToggleButton>
          <ToggleButton active={effectiveBoards.scaleCompare} onClick={() => selectBoardView("scaleCompare")} title="Comparador de escalas" testId="nav-scale-compare">
            <NavIconLabel icon={Layers2} label="Comparar" />
          </ToggleButton>
          <ToggleButton active={effectiveBoards.route} onClick={() => selectBoardView("route")} title="Muestra el mástil de ruta" testId="nav-route">
            <NavIconLabel icon={Route} label="Ruta" />
          </ToggleButton>
          <ToggleButton active={effectiveBoards.chords} onClick={() => selectBoardView("chords")} title="Muestra el panel de acordes" testId="nav-chords">
            <NavIconLabel icon={ChordDiagramIcon} label="Acordes" />
          </ToggleButton>
          <ToggleButton active={effectiveBoards.nearChords} onClick={() => selectBoardView("nearChords")} title="Muestra el panel de acordes cercanos" testId="nav-near-chords">
            <NavIconLabel icon={Waypoints} label="Acordes cercanos" />
          </ToggleButton>
          <ToggleButton active={effectiveBoards.standards} onClick={() => selectBoardView("standards")} title="Muestra la sección de standards de jazz" testId="nav-standards">
            <NavIconLabel icon={BookOpen} label="Standards" />
          </ToggleButton>
          <ToggleButton active={effectiveBoards.configuration} onClick={() => selectBoardView("configuration")} title="Muestra u oculta la configuración general" testId="nav-configuration">
            <NavIconLabel icon={Settings} label="Configuración" />
          </ToggleButton>
          <button type="button" className={UI_BTN_SM + " inline-flex w-auto items-center gap-1.5 px-3"} onClick={() => setManualOpen(true)}>
            <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Ayuda</span>
          </button>
        </div>
      </div>
      <input
        ref={importConfigInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          importUiConfigFromFile(e.target.files && e.target.files[0]);
          e.target.value = "";
        }}
      />
      {configNotice ? (
        <div
          className={`mt-2 rounded-xl border px-3 py-2 text-sm ${configNotice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : configNotice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}
        >
          {configNotice.text}
        </div>
      ) : null}
    </header>
  );
}
