import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { normalizeHex, hexToHsv, hsvToHex } from "./colorUtils.js";

const POPOVER_W = 240;
const POPOVER_H = 330;

// ── SV area (Saturation × Value 2D picker) ────────────────────────────────────

function SvPicker({ hue, s, v, onChange, testId }) {
  const areaRef = useRef(null);

  function coordsFromEvent(e) {
    const rect = areaRef.current.getBoundingClientRect();
    return {
      s: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      v: Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100)),
    };
  }

  return (
    <div
      ref={areaRef}
      data-testid={testId}
      className="relative h-36 w-full cursor-crosshair select-none rounded-md"
      style={{
        background: `linear-gradient(to bottom, transparent, #000),
                     linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(coordsFromEvent(e));
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        onChange(coordsFromEvent(e));
      }}
    >
      <div
        className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${s}%`,
          top: `${100 - v}%`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}

// ── Hue bar ───────────────────────────────────────────────────────────────────

function HueBar({ hue, onChange, testId }) {
  const barRef = useRef(null);

  function hueFromEvent(e) {
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
  }

  return (
    <div
      ref={barRef}
      data-testid={testId}
      className="relative mt-2 h-4 cursor-ew-resize select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(hueFromEvent(e));
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        onChange(hueFromEvent(e));
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full"
        style={{
          background:
            "linear-gradient(to right,hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${(hue / 360) * 100}%`,
          background: `hsl(${hue}, 100%, 50%)`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Color swatch that opens a custom popover picker (SV area + hue bar + hex input).
 * No native browser color picker is used.
 *
 * Workflow:
 *   - Picker/bar/hex changes update HSV preview only; onChange is NOT called.
 *   - Aceptar  → calls onChange(hex) and closes.
 *   - Cancelar / X / Escape / click-outside → discard, close.
 *
 * Props
 *   value        — current color "#RRGGBB"
 *   onChange     — (hex: string) => void
 *   label        — inline label + popover title
 *   disabled     — disables the swatch button
 *   data-testid  — base id; suffixes: -swatch, -sv-picker, -hue-bar, -preview,
 *                  -hex, -popover, -accept, -cancel
 *   swatchClass  — className override for the swatch button
 */
export default function ColorPickerPopover({
  value,
  onChange,
  label,
  disabled,
  "data-testid": testId,
  swatchClass,
}) {
  const safeValue = normalizeHex(value) ?? "#000000";

  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 100 });
  const [draft, setDraft] = useState(safeValue);
  const [prevValue, setPrevValue] = useState(value);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Derived preview hex from current HSV state
  const previewHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  // Sync when parent value changes while popover is closed
  if (!open && prevValue !== value) {
    setPrevValue(value);
    // hsv and draft are re-initialized each time the popover opens
  }

  // Lock body scroll while open; restore on close or unmount
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close (cancel) on click outside
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (
        !popoverRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Close (cancel) on Escape
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function openPopover() {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const top =
      rect.bottom + 6 + POPOVER_H > window.innerHeight
        ? Math.max(4, rect.top - POPOVER_H - 6)
        : rect.bottom + 6;
    const left = Math.min(rect.left, window.innerWidth - POPOVER_W - 8);
    const initHsv = hexToHsv(safeValue) ?? { h: 0, s: 0, v: 100 };
    setHsv(initHsv);
    setDraft(safeValue);
    setPos({ top, left });
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleAccept() {
    onChange(previewHex);
    setOpen(false);
  }

  function handleSvChange({ s, v }) {
    const next = { h: hsv.h, s, v };
    setHsv(next);
    setDraft(hsvToHex(next.h, next.s, next.v));
  }

  function handleHueChange(h) {
    const next = { h, s: hsv.s, v: hsv.v };
    setHsv(next);
    setDraft(hsvToHex(next.h, next.s, next.v));
  }

  function handleTextChange(e) {
    const raw = e.target.value;
    setDraft(raw);
    const norm = normalizeHex(raw);
    if (norm) {
      const newHsv = hexToHsv(norm);
      if (newHsv) setHsv(newHsv);
    }
  }

  function handleTextBlur() {
    setDraft(previewHex);
  }

  const defaultSwatchClass =
    "h-7 w-8 cursor-pointer rounded-md border-2 border-slate-300 shadow-sm transition-colors hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50";

  const swatchColor = open ? previewHex : safeValue;

  return (
    <>
      {label && (
        <span className="text-[11px] font-semibold text-slate-700">{label}</span>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={openPopover}
        data-testid={testId ? `${testId}-swatch` : undefined}
        className={swatchClass ?? defaultSwatchClass}
        style={{ backgroundColor: swatchColor }}
        title={`${label ? label + ": " : ""}${value ?? ""}`}
        aria-label={`Cambiar color${label ? " de " + label : ""}`}
      />
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`Selector de color${label ? " — " + label : ""}`}
            data-testid={testId ? `${testId}-popover` : undefined}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              width: POPOVER_W,
            }}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
          >
            {/* Header */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                {label ?? "Color"}
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Cancelar y cerrar selector de color"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* SV area */}
            <SvPicker
              hue={hsv.h}
              s={hsv.s}
              v={hsv.v}
              onChange={handleSvChange}
              testId={testId ? `${testId}-sv-picker` : undefined}
            />

            {/* Hue bar */}
            <HueBar
              hue={hsv.h}
              onChange={handleHueChange}
              testId={testId ? `${testId}-hue-bar` : undefined}
            />

            {/* Preview swatch + HEX input */}
            <div className="mt-3 flex items-center gap-2">
              <div
                className="h-8 w-8 shrink-0 rounded-md border border-slate-200"
                style={{ backgroundColor: previewHex }}
                data-testid={testId ? `${testId}-preview` : undefined}
              />
              <input
                type="text"
                value={draft}
                onChange={handleTextChange}
                onBlur={handleTextBlur}
                maxLength={7}
                spellCheck={false}
                data-testid={testId ? `${testId}-hex` : undefined}
                placeholder="#RRGGBB"
                className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 font-mono text-sm font-semibold uppercase text-slate-700 placeholder:normal-case placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
              />
            </div>

            {/* Accept / Cancel */}
            <div className="mt-2.5 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                data-testid={testId ? `${testId}-cancel` : undefined}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAccept}
                data-testid={testId ? `${testId}-accept` : undefined}
                className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Aceptar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
