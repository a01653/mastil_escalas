import { Info } from "lucide-react";

// ── ToggleButton ──────────────────────────────────────────────────────────────

export function ToggleButton({ active, onClick, children, title, testId }) {
  const fallbackTitle = typeof children === "string" ? children : "";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || fallbackTitle}
      data-testid={testId}
      className={`rounded-xl px-2 py-1.5 text-sm ring-1 ring-slate-200 shadow-sm ${active  ? "bg-sky-600 text-white ring-sky-600"  : "bg-white text-slate-700 hover:bg-sky-50 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}

// ── InlineInfoButton (privado) ────────────────────────────────────────────────

function InlineInfoButton({ label, info, className = "", onInfo }) {
  if (!info) return null;

  return (
    <button
      type="button"
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-600 hover:text-slate-900 ${className}`.trim()}
      onClick={(e) => onInfo(e, label, info)}
      aria-label={`Información sobre ${label}`}
      title={`Abrir información sobre ${label}`}
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

// ── InfoTitle ─────────────────────────────────────────────────────────────────

export function InfoTitle({ label, info, alwaysShow = false, isMobileLayout, onInfo }) {
  if (!info) return label;
  if (!alwaysShow && !isMobileLayout) return label;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span>{label}</span>
      <InlineInfoButton label={label} info={info} onInfo={onInfo} />
    </span>
  );
}
