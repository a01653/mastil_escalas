import { X } from "lucide-react";

export default function MobileInfoPopover({ mobileInfoPopover, onClose }) {
  if (!mobileInfoPopover) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 touch-none overscroll-contain bg-slate-900/35"
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
      />
      <div
        className="fixed z-50 rounded-2xl border border-slate-300 bg-white shadow-2xl"
        style={{ left: `${mobileInfoPopover.left}px`, top: `${mobileInfoPopover.top}px`, width: `${mobileInfoPopover.width}px` }}
      >
        <div
          className="absolute -top-2 h-4 w-4 rotate-45 border-l border-t border-slate-300 bg-white"
          style={{ left: `${Math.max(18, Math.min(mobileInfoPopover.arrowLeft - 8, mobileInfoPopover.width - 34))}px` }}
        />
        <div className="relative rounded-2xl bg-white">
          <button
            type="button"
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm"
            onClick={onClose}
            title="Cerrar información"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="p-4 pr-12">
            {mobileInfoPopover.title ? (
              <div className="text-sm font-semibold text-slate-800">{mobileInfoPopover.title}</div>
            ) : null}
            <div className={`text-sm leading-6 text-slate-600 ${mobileInfoPopover.title ? "mt-2" : ""} whitespace-pre-line`.trim()}>
              {mobileInfoPopover.text}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
