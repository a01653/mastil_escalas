// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import ColorPickerPopover from "./ColorPickerPopover.jsx";
import { hexToHsv, hsvToHex, normalizeHex } from "./colorUtils.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ── helpers ────────────────────────────────────────────────────────────────────

let container = null;
let root = null;

function render(element) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root.render(element); });
}

function rerender(element) {
  act(() => { root.render(element); });
}

function cleanup() {
  if (root) act(() => { root.unmount(); });
  root = null;
  if (container) container.remove();
  container = null;
}

afterEach(cleanup);

function getSwatch()   { return container.querySelector("[data-testid='test-swatch']"); }
function getPopover()  { return document.body.querySelector("[data-testid='test-popover']"); }
function getSvPicker() { return document.body.querySelector("[data-testid='test-sv-picker']"); }
function getHueBar()   { return document.body.querySelector("[data-testid='test-hue-bar']"); }
function getPreview()  { return document.body.querySelector("[data-testid='test-preview']"); }
function getHex()      { return document.body.querySelector("[data-testid='test-hex']"); }
function getAccept()   { return document.body.querySelector("[data-testid='test-accept']"); }
function getCancel()   { return document.body.querySelector("[data-testid='test-cancel']"); }

function clickSwatch() { act(() => { getSwatch().click(); }); }
function clickAccept() { act(() => { getAccept().click(); }); }
function clickCancel() { act(() => { getCancel().click(); }); }

function setNativeValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// ── colorUtils: conversiones HSV ──────────────────────────────────────────────

describe("colorUtils — hexToHsv / hsvToHex round-trip", () => {
  it("normalizeHex acepta #RRGGBB", () => {
    expect(normalizeHex("#0072B2")).toBe("#0072B2");
  });

  it("normalizeHex acepta RRGGBB sin #", () => {
    expect(normalizeHex("0072B2")).toBe("#0072B2");
  });

  it("normalizeHex acepta #RGB y expande", () => {
    expect(normalizeHex("#07B")).toBe("#0077BB");
  });

  it("normalizeHex devuelve null para hex inválido", () => {
    expect(normalizeHex("ZZZZZ")).toBeNull();
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });

  it("hexToHsv → hsvToHex round-trip exacto para #0072B2", () => {
    const hsv = hexToHsv("#0072B2");
    expect(hsv).not.toBeNull();
    expect(hsvToHex(hsv.h, hsv.s, hsv.v)).toBe("#0072B2");
  });

  it("hexToHsv → hsvToHex round-trip exacto para #E69F00", () => {
    const hsv = hexToHsv("#E69F00");
    expect(hsvToHex(hsv.h, hsv.s, hsv.v)).toBe("#E69F00");
  });

  it("hexToHsv → hsvToHex round-trip exacto para #CC79A7", () => {
    const hsv = hexToHsv("#CC79A7");
    expect(hsvToHex(hsv.h, hsv.s, hsv.v)).toBe("#CC79A7");
  });

  it("hexToHsv → hsvToHex round-trip para blanco y negro", () => {
    expect(hsvToHex(...Object.values(hexToHsv("#FFFFFF")))).toBe("#FFFFFF");
    expect(hsvToHex(...Object.values(hexToHsv("#000000")))).toBe("#000000");
  });

  it("hexToHsv devuelve null para hex inválido", () => {
    expect(hexToHsv("ZZZZZ")).toBeNull();
    expect(hexToHsv("")).toBeNull();
  });
});

// ── estado cerrado ─────────────────────────────────────────────────────────────

describe("ColorPickerPopover — estado cerrado", () => {
  it("renderiza el swatch con el color inicial", () => {
    render(<ColorPickerPopover value="#0072B2" onChange={() => {}} data-testid="test" />);
    expect(getSwatch()).toBeTruthy();
  });

  it("el popover NO está en el DOM cuando está cerrado", () => {
    render(<ColorPickerPopover value="#0072B2" onChange={() => {}} data-testid="test" />);
    expect(getPopover()).toBeNull();
  });

  it("el SV picker NO está en el DOM cuando está cerrado", () => {
    render(<ColorPickerPopover value="#0072B2" onChange={() => {}} data-testid="test" />);
    expect(getSvPicker()).toBeNull();
  });

  it("renderiza el label inline si se pasa", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} label="Fondo" data-testid="test" />);
    expect(container.textContent).toContain("Fondo");
  });

  it("disabled: clicar el swatch NO abre el popover", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} disabled data-testid="test" />);
    clickSwatch();
    expect(getPopover()).toBeNull();
  });
});

// ── abrir: selector visual ya visible en el primer clic ───────────────────────

describe("ColorPickerPopover — apertura con selector visual inmediato", () => {
  it("un solo clic en el swatch abre el popover con SV picker ya visible", () => {
    render(<ColorPickerPopover value="#0072B2" onChange={() => {}} data-testid="test" />);
    expect(getSvPicker()).toBeNull(); // no present before
    clickSwatch(); // single click
    expect(getPopover()).toBeTruthy();
    expect(getSvPicker()).toBeTruthy(); // immediately visible
  });

  it("la barra de tono (hue bar) también aparece en el primer clic", () => {
    render(<ColorPickerPopover value="#0072B2" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    expect(getHueBar()).toBeTruthy();
  });

  it("el campo HEX está visible y tiene el valor actual al abrir", () => {
    render(<ColorPickerPopover value="#0072B2" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    expect(getHex()).toBeTruthy();
    expect(getHex().value).toBe("#0072B2");
  });

  it("el preview swatch muestra el color actual al abrir", () => {
    render(<ColorPickerPopover value="#0072B2" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    // Preview div background should be the initial color
    expect(getPreview().style.backgroundColor).toBe("rgb(0, 114, 178)");
  });

  it("NO hay ningún input[type=color] nativo en el DOM", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    const nativePicker = document.body.querySelector("input[type='color']");
    expect(nativePicker).toBeNull();
  });
});

// ── cerrar sin aceptar ─────────────────────────────────────────────────────────

describe("ColorPickerPopover — cerrar sin aceptar", () => {
  it("botón X cierra el popover", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    const xBtn = getPopover().querySelector("button[aria-label='Cancelar y cerrar selector de color']");
    act(() => { xBtn.click(); });
    expect(getPopover()).toBeNull();
  });

  it("Escape cierra el popover", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(getPopover()).toBeNull();
  });

  it("click fuera del popover lo cierra", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(getPopover()).toBeNull();
  });
});

// ── flujo: Cancelar descarta cambios ──────────────────────────────────────────

describe("ColorPickerPopover — Cancelar descarta cambios", () => {
  it("cambiar HEX y Cancelar: onChange NO se llama", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    clickCancel();
    expect(spy).not.toHaveBeenCalled();
  });

  it("Cancelar: el swatch vuelve al color original", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    clickCancel();
    expect(getSwatch().style.backgroundColor).toBe("rgb(255, 255, 255)");
  });

  it("botón X descarta y no llama onChange", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    const xBtn = getPopover().querySelector("button[aria-label='Cancelar y cerrar selector de color']");
    act(() => { xBtn.click(); });
    expect(spy).not.toHaveBeenCalled();
  });

  it("Escape descarta y no llama onChange", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("click fuera descarta y no llama onChange", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── flujo: Aceptar aplica cambios ─────────────────────────────────────────────

describe("ColorPickerPopover — Aceptar aplica cambios", () => {
  it("cambiar HEX y Aceptar: onChange se llama con el nuevo color", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    clickAccept();
    expect(spy).toHaveBeenCalledWith("#0072B2");
  });

  it("HEX sin # normaliza a #RRGGBB al Aceptar", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "0072B2");
    clickAccept();
    expect(spy).toHaveBeenCalledWith("#0072B2");
  });

  it("#RGB se expande a #RRGGBB al Aceptar", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#07B");
    clickAccept();
    expect(spy).toHaveBeenCalledWith("#0077BB");
  });

  it("HEX inválido al Aceptar: usa el último preview válido", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    // Set a valid color via hex
    setNativeValue(getHex(), "#E69F00");
    // Then type invalid hex (no blur — draft stays invalid but hsv unchanged)
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(getHex(), "ZZZZZ");
      getHex().dispatchEvent(new Event("input", { bubbles: true }));
    });
    clickAccept();
    // Should use last valid preview (#E69F00)
    expect(spy).toHaveBeenCalledWith("#E69F00");
  });

  it("Aceptar cierra el popover", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    clickAccept();
    expect(getPopover()).toBeNull();
  });

  it("onChange solo se llama UNA vez al Aceptar (no durante previsualización)", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    setNativeValue(getHex(), "#E69F00");
    setNativeValue(getHex(), "#CC79A7");
    expect(spy).not.toHaveBeenCalled(); // nothing yet
    clickAccept();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("#CC79A7");
  });

  it("el preview swatch se actualiza mientras se escribe en HEX", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    expect(getPreview().style.backgroundColor).toBe("rgb(0, 114, 178)");
  });

  it("el swatch del trigger muestra el preview mientras el popover está abierto", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    setNativeValue(getHex(), "#0072B2");
    expect(getSwatch().style.backgroundColor).toBe("rgb(0, 114, 178)");
  });

  it("cuando value cambia externamente y el popover está cerrado, el swatch se actualiza", () => {
    const spy = vi.fn();
    render(<ColorPickerPopover value="#FFFFFF" onChange={spy} data-testid="test" />);
    rerender(<ColorPickerPopover value="#0072B2" onChange={spy} data-testid="test" />);
    expect(getSwatch().style.backgroundColor).toBe("rgb(0, 114, 178)");
  });
});

// ── scroll lock ────────────────────────────────────────────────────────────────

describe("ColorPickerPopover — bloqueo de scroll", () => {
  afterEach(() => {
    // safety: ensure body overflow is never left locked between tests
    document.body.style.overflow = "";
  });

  it("bloquea document.body.overflow al abrir el popover", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    expect(document.body.style.overflow).not.toBe("hidden");
    clickSwatch();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restaura document.body.overflow al cerrar con Cancelar", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    expect(document.body.style.overflow).toBe("hidden");
    clickCancel();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("restaura document.body.overflow al cerrar con Aceptar", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    expect(document.body.style.overflow).toBe("hidden");
    clickAccept();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("restaura document.body.overflow al cerrar con Escape", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    expect(document.body.style.overflow).toBe("hidden");
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("restaura document.body.overflow al cerrar con click fuera", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    expect(document.body.style.overflow).toBe("hidden");
    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("restaura document.body.overflow al desmontar con el popover abierto", () => {
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    expect(document.body.style.overflow).toBe("hidden");
    // cleanup() desmonta el componente
    cleanup();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("preserva el valor previo de overflow al restaurar", () => {
    document.body.style.overflow = "auto";
    render(<ColorPickerPopover value="#FFFFFF" onChange={() => {}} data-testid="test" />);
    clickSwatch();
    expect(document.body.style.overflow).toBe("hidden");
    clickCancel();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });
});
