import { useId } from "react";
import { Circle, CircleOff, LocateFixed, LocateOff } from "lucide-react";
import FretWindowControls from "../fretboard/FretWindowControls.jsx";

/**
 * Interruptor con icono SVG. Por dentro es una casilla real (nombre accesible,
 * estado marcado/desmarcado y teclado nativos) cubierta por el botón visual.
 * El icono y el color distinguen activado y desactivado; la ayuda aparece al
 * pasar el cursor o al recibir el foco (en móvil se consulta con el botón ⓘ).
 */
function IconToggle({ testId, label, help, checked, onChange, IconOn, IconOff }) {
  const helpId = useId();
  const Icon = checked ? IconOn : IconOff;
  return (
    <label className="group relative inline-flex">
      <input
        type="checkbox"
        data-testid={testId}
        aria-label={label}
        aria-describedby={helpId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        data-state={checked ? "on" : "off"}
        className={`flex h-7 w-7 items-center justify-center rounded-xl border shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-sky-300 ${
          checked ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-500 group-hover:bg-sky-50"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span
        id={helpId}
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-60 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-normal leading-4 text-slate-600 shadow-lg group-hover:block group-focus-within:block"
      >
        <strong className="text-slate-800">{label}: {checked ? "activado" : "desactivado"}.</strong> {help}
      </span>
    </label>
  );
}

// Ayuda de la cabecera (botón ⓘ): consultable en móvil, donde no hay cursor.
// En móvil no hay rango (se muestran las posiciones de todo el mástil).
const CHORD_FRETBOARD_HEADER_INFO_MOBILE = (
  <div className="space-y-1.5">
    <p><strong>Cuerdas al aire</strong> (círculo; tachado = desactivado): permite el traste 0 en las posiciones.</p>
    <p><strong>Mantener zona anterior</strong> (diana; tachada = desactivado): al cambiar de acorde elige la posición más cercana a la anterior.</p>
    <p>En móvil se muestran las posiciones de todo el mástil; el rango de trastes se elige en la vista de escritorio.</p>
  </div>
);

const CHORD_FRETBOARD_HEADER_INFO = (
  <div className="space-y-1.5">
    <p><strong>Cuerdas al aire</strong> (círculo; tachado = desactivado): permite el traste 0 en las posiciones, aunque quede fuera del rango.</p>
    <p><strong>Mantener zona anterior</strong> (diana; tachada = desactivado): al cambiar de acorde elige la posición más cercana a la anterior entre las que admite el rango. No mueve el rango.</p>
    <p><strong>Rango y Tamaño:</strong> solo se ofrecen las posiciones cuyas notas pisadas caen entre los trastes indicados. Tamaño es el número de trastes que abarca el rango; la distancia entre dedos se sigue fijando con Dist.</p>
  </div>
);

const CHORD_KEEP_ZONE_HELP =
  "Al cambiar de acorde elige la posición más cercana a la anterior entre las que admite el rango. No mueve el rango.";

/**
 * Cabecera del mástil de Acordes, encima de los trastes (sin superponerse): los
 * interruptores de cuerdas al aire y zona anterior y la ventana de trastes, con
 * el mismo diseño y reglas que Acordes cercanos pero con estado propio.
 */
export default function ChordFretboardHeader({
  InfoTitle: InfoTitleComponent,
  infoContent,
  allowOpenStrings,
  onAllowOpenStringsChange,
  openStringsHelp,
  keepZone,
  onKeepZoneChange,
  fretWindow,
  sizeValue,
  onSizeChange,
  onSizeBlur,
  onMoveLeft,
  onMoveRight,
  onResetWindow,
  showRange = true,
}) {
  const InfoTitle = InfoTitleComponent;
  return (
    <div data-testid="chord-fretboard-header" className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-700">
          <InfoTitle label="Mástil" info={infoContent ?? (showRange ? CHORD_FRETBOARD_HEADER_INFO : CHORD_FRETBOARD_HEADER_INFO_MOBILE)} alwaysShow />
        </span>
        <IconToggle
          testId="toggle-allow-open-strings"
          label="Permitir cuerdas al aire"
          help={openStringsHelp}
          checked={allowOpenStrings}
          onChange={onAllowOpenStringsChange}
          IconOn={Circle}
          IconOff={CircleOff}
        />
        <IconToggle
          testId="toggle-keep-zone"
          label="Mantener zona anterior"
          help={CHORD_KEEP_ZONE_HELP}
          checked={keepZone}
          onChange={onKeepZoneChange}
          IconOn={LocateFixed}
          IconOff={LocateOff}
        />
      </div>
      {showRange ? (
      <FretWindowControls
        from={fretWindow.from}
        to={fretWindow.to}
        sizeValue={sizeValue}
        onSizeChange={onSizeChange}
        onSizeBlur={onSizeBlur}
        onMoveLeft={onMoveLeft}
        onMoveRight={onMoveRight}
        leftDisabled={!fretWindow.canMoveLeft}
        rightDisabled={!fretWindow.canMoveRight}
        onReset={onResetWindow}
        testIdPrefix="chord-window"
      />
      ) : null}
    </div>
  );
}
