import { ChevronLeft, ChevronRight } from "lucide-react";

const UI_BTN_SM = "h-7 w-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold shadow-sm hover:bg-sky-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";
const UI_INPUT_SM = "h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs shadow-sm hover:bg-sky-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";

/**
 * Controles de la ventana de trastes: «Rango ◀ Tamaño ▶ desde–hasta».
 * Compartido por los mástiles de Acordes y Acordes cercanos; cada panel aporta
 * su propio estado y sus manejadores (los límites salen de computeFretWindow).
 */
export default function FretWindowControls({
  from,
  to,
  sizeValue,
  onSizeChange,
  onSizeBlur,
  onMoveLeft,
  onMoveRight,
  leftDisabled = false,
  rightDisabled = false,
  onReset,
  testIdPrefix,
}) {
  const testId = (suffix) => (testIdPrefix ? `${testIdPrefix}-${suffix}` : undefined);
  return (
    <div className="flex items-end gap-1.5" data-testid={testId("controls")}>
      <div className="text-xs font-semibold text-slate-700">Rango</div>
      <button
        type="button"
        className={UI_BTN_SM}
        title="Mover rango 1 traste a la izquierda"
        aria-label="Mover rango 1 traste a la izquierda"
        onClick={onMoveLeft}
        disabled={leftDisabled}
        data-testid={testId("left")}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <div>
        <div className="text-[10px] font-semibold text-slate-600">Tamaño</div>
        <input
          className={UI_INPUT_SM + " w-14"}
          inputMode="numeric"
          aria-label="Tamaño del rango en trastes"
          title="Número de trastes que abarca el rango"
          value={sizeValue}
          onChange={(e) => onSizeChange(e.target.value)}
          onBlur={onSizeBlur}
          data-testid={testId("size")}
        />
      </div>

      <button
        type="button"
        className={UI_BTN_SM}
        title="Mover rango 1 traste a la derecha"
        aria-label="Mover rango 1 traste a la derecha"
        onClick={onMoveRight}
        disabled={rightDisabled}
        data-testid={testId("right")}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="ml-1 text-xs text-slate-600 tabular-nums" data-testid={testId("range")} aria-label={`Trastes ${from} a ${to}`}>
        {from}–{to}
      </div>

      {onReset ? (
        <button
          type="button"
          className="h-7 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-sky-50"
          title="Restablece el rango desde el traste 1 hasta el último del mástil"
          onClick={onReset}
          data-testid={testId("full")}
        >
          Todo el mástil
        </button>
      ) : null}
    </div>
  );
}
