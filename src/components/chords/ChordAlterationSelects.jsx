import * as AppVoicingStudyCore from "../../music/appVoicingStudyCore.js";

const { CHORD_FIFTH_OPTIONS, CHORD_NINTH_OPTIONS } = AppVoicingStudyCore;

/**
 * Selectores de quinta (♭5/5/♯5) y variante de novena (♭9/9/♯9).
 * Compartido por Acordes y Acordes cercanos: las opciones habilitadas y los
 * textos de ayuda salen de `alterations` (plan.ui.alterations), es decir, de la
 * política única de chordAlterations.js. El valor mostrado es el normalizado del
 * plan, así que nunca se ve una alteración que no suena.
 */
export default function ChordAlterationSelects({
  alterations,
  fifth,
  ninth,
  onFifthChange,
  onNinthChange,
  disabled = false,
  selectClassName = "",
  fifthTestId,
  ninthTestId,
}) {
  const fifthState = alterations?.fifth || { enabled: false, hint: "", options: CHORD_FIFTH_OPTIONS };
  const ninthState = alterations?.ninth || { enabled: false, hint: "", options: CHORD_NINTH_OPTIONS };
  const fifthDisabled = disabled || !fifthState.enabled;
  const ninthDisabled = disabled || !ninthState.enabled;

  return (
    <div className="mt-1 flex flex-nowrap items-center gap-1.5">
      <select
        className={selectClassName}
        data-testid={fifthTestId}
        aria-label="Quinta"
        title={`Quinta: ${fifthState.hint}`}
        value={fifth}
        disabled={fifthDisabled}
        onChange={(e) => onFifthChange?.(e.target.value)}
      >
        {fifthState.options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      <select
        className={selectClassName}
        data-testid={ninthTestId}
        aria-label="Novena"
        title={`Novena: ${ninthState.hint}`}
        value={ninth}
        disabled={ninthDisabled}
        onChange={(e) => onNinthChange?.(e.target.value)}
      >
        {ninthState.options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
