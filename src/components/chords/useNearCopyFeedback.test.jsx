// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vitest";
import { NEAR_COPY_FEEDBACK_DURATION_MS, useNearCopyFeedback } from "./useNearCopyFeedback.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ── DOM helpers ───────────────────────────────────────────────────────────────

let container = null;
let root = null;

function render(element) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root.render(element); });
}

function cleanup() {
  if (root) act(() => { root.unmount(); });
  root = null;
  container?.remove();
  container = null;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Test component ─────────────────────────────────────────────────────────────
// Renderiza los 4 botones y el mensaje de feedback con los mismos data-testids
// que ManualChordPanel para que los tests sean representativos.

const CAND_ID = "cand-test";
const CAND_ID_2 = "cand-test-2";

function FeedbackStub({ candId = CAND_ID, name = "Asus2", duration }) {
  const { copyFeedback, trigger } = useNearCopyFeedback(duration);
  return (
    <div>
      {[0, 1, 2, 3].map((i) => {
        const isActive = copyFeedback?.candId === candId && copyFeedback?.slotIdx === i;
        return (
          <button
            key={i}
            data-testid={`detected-copy-near-${candId}-${i}`}
            data-active={isActive ? "1" : "0"}
            onClick={() => trigger(candId, i, name)}
          >
            {i + 1}
          </button>
        );
      })}
      {copyFeedback?.candId === candId && (
        <div data-testid={`detected-copy-near-feedback-${candId}`}>
          {`Copiado a Cercano ${copyFeedback.slotIdx + 1}: ${copyFeedback.name}`}
        </div>
      )}
    </div>
  );
}

function getBtn(candId, slotIdx) {
  return container.querySelector(`[data-testid="detected-copy-near-${candId}-${slotIdx}"]`);
}
function getFeedback(candId = CAND_ID) {
  return container.querySelector(`[data-testid="detected-copy-near-feedback-${candId}"]`);
}

// ── 1. Pulsar "Cercano 1" muestra mensaje correcto ────────────────────────────

describe("feedback message", () => {
  test("pulsar Cercano 1 muestra 'Copiado a Cercano 1: Asus2'", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" />);
    act(() => getBtn(CAND_ID, 0).click());
    expect(getFeedback()?.textContent).toBe("Copiado a Cercano 1: Asus2");
  });

  test("pulsar Cercano 3 muestra 'Copiado a Cercano 3: Asus2'", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" />);
    act(() => getBtn(CAND_ID, 2).click());
    expect(getFeedback()?.textContent).toBe("Copiado a Cercano 3: Asus2");
  });
});

// ── 2. Slash bass se conserva en el mensaje ───────────────────────────────────

describe("slash bass en el mensaje", () => {
  test("'Esus4/A' aparece completo al copiar a Cercano 2", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Esus4/A" />);
    act(() => getBtn(CAND_ID, 1).click());
    expect(getFeedback()?.textContent).toBe("Copiado a Cercano 2: Esus4/A");
  });

  test("el slash no se trunca ('Esus4' sin '/A' sería incorrecto)", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Esus4/A" />);
    act(() => getBtn(CAND_ID, 0).click());
    expect(getFeedback()?.textContent).not.toBe("Copiado a Cercano 1: Esus4");
    expect(getFeedback()?.textContent).toBe("Copiado a Cercano 1: Esus4/A");
  });
});

// ── 3. Solo cambia el botón pulsado ──────────────────────────────────────────

describe("solo el botón pulsado queda activo", () => {
  test("al pulsar Cercano 2, solo el botón 2 tiene data-active='1'", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" />);
    act(() => getBtn(CAND_ID, 1).click());
    expect(getBtn(CAND_ID, 1)?.dataset.active).toBe("1");
    expect(getBtn(CAND_ID, 0)?.dataset.active).toBe("0");
    expect(getBtn(CAND_ID, 2)?.dataset.active).toBe("0");
    expect(getBtn(CAND_ID, 3)?.dataset.active).toBe("0");
  });

  test("al pulsar Cercano 4, solo el botón 4 tiene data-active='1'", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" />);
    act(() => getBtn(CAND_ID, 3).click());
    expect(getBtn(CAND_ID, 3)?.dataset.active).toBe("1");
    [0, 1, 2].forEach((i) =>
      expect(getBtn(CAND_ID, i)?.dataset.active).toBe("0")
    );
  });
});

// ── 4. El feedback desaparece tras el timeout ─────────────────────────────────

describe("el feedback desaparece tras el timeout", () => {
  test("antes del timeout el mensaje existe", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" duration={500} />);
    act(() => getBtn(CAND_ID, 0).click());
    expect(getFeedback()).not.toBeNull();
  });

  test("después del timeout el mensaje desaparece", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" duration={500} />);
    act(() => getBtn(CAND_ID, 0).click());
    act(() => { vi.advanceTimersByTime(600); });
    expect(getFeedback()).toBeNull();
  });

  test("después del timeout el botón vuelve a data-active='0'", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" duration={500} />);
    act(() => getBtn(CAND_ID, 2).click());
    act(() => { vi.advanceTimersByTime(600); });
    expect(getBtn(CAND_ID, 2)?.dataset.active).toBe("0");
  });

  test(`la duración por defecto es ${NEAR_COPY_FEEDBACK_DURATION_MS}ms`, () => {
    expect(NEAR_COPY_FEEDBACK_DURATION_MS).toBe(1500);
  });
});

// ── 5. Cambiar destino antes de que acabe el timeout actualiza el feedback ────

describe("cambiar destino antes del timeout", () => {
  test("copiar a Cercano 1 y luego a Cercano 3 actualiza el mensaje", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" duration={500} />);
    act(() => getBtn(CAND_ID, 0).click());
    expect(getFeedback()?.textContent).toBe("Copiado a Cercano 1: Asus2");
    act(() => { vi.advanceTimersByTime(200); });
    act(() => getBtn(CAND_ID, 2).click());
    expect(getFeedback()?.textContent).toBe("Copiado a Cercano 3: Asus2");
  });

  test("al cambiar destino, el anterior botón vuelve a inactivo", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" duration={500} />);
    act(() => getBtn(CAND_ID, 0).click());
    expect(getBtn(CAND_ID, 0)?.dataset.active).toBe("1");
    act(() => getBtn(CAND_ID, 3).click());
    expect(getBtn(CAND_ID, 0)?.dataset.active).toBe("0");
    expect(getBtn(CAND_ID, 3)?.dataset.active).toBe("1");
  });

  test("el timer anterior se cancela; el timeout se reinicia desde el segundo clic", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" duration={500} />);
    act(() => getBtn(CAND_ID, 0).click());
    act(() => { vi.advanceTimersByTime(400); });
    // segundo clic antes de que expire el primero
    act(() => getBtn(CAND_ID, 1).click());
    act(() => { vi.advanceTimersByTime(400); });
    // el nuevo timer aún no ha expirado (400ms < 500ms desde el segundo clic)
    expect(getFeedback()).not.toBeNull();
    act(() => { vi.advanceTimersByTime(200); });
    // ahora sí ha expirado (600ms desde el segundo clic)
    expect(getFeedback()).toBeNull();
  });
});

// ── 6. Cleanup al desmontar ───────────────────────────────────────────────────

describe("cleanup al desmontar", () => {
  test("desmontar con timer activo no provoca error", () => {
    vi.useFakeTimers();
    render(<FeedbackStub name="Asus2" duration={5000} />);
    act(() => getBtn(CAND_ID, 0).click());
    // desmontar mientras el timer está activo
    expect(() => cleanup()).not.toThrow();
    root = null; // ya limpiado en cleanup()
    container = null;
  });
});
