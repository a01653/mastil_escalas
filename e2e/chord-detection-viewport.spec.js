/**
 * Regresión: comportamiento de scroll/focus al limpiar selección en detección manual.
 *
 * Cubre el subsistema preserveChordDetectViewportScroll /
 * focusChordDetectPanelWithoutScroll / clearChordDetectViewportStabilizers
 * que vive en App.jsx (líneas 2470–2544).
 *
 * Invariantes verificados:
 * - Al pulsar "Limpiar", el scroll de la página no salta más de 5 px en ningún eje.
 * - Después de limpiar, el panel de selección manual (`aria-label="Selección manual"`)
 *   recibe el foco (preventScroll: true) sin provocar desplazamiento.
 * - La selección queda vacía y el mástil muestra el mensaje de "sin lecturas".
 */

import { test, expect } from "@playwright/test";

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function enableDetectMode(page) {
  await page.getByTestId("chord-detect-toggle").check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
}

async function applyPattern(page, pattern) {
  const input = page.getByTestId("chord-detect-pattern-input");
  await expect(input).toBeVisible();
  await input.fill(pattern);
  await page.getByTestId("chord-detect-apply-btn").click();
  await page.waitForTimeout(300);
}

// ── Test V1 ────────────────────────────────────────────────────────────────────
test("V1. Clear no salta scroll: el viewport se mantiene tras limpiar la selección manual", async ({ page }) => {
  // Viewport pequeño en altura para que la página sea scrollable
  await page.setViewportSize({ width: 1280, height: 500 });
  await goToChords(page);
  await enableDetectMode(page);

  // Aplicar un patrón conocido (Am7: x02010) para tener selección activa
  await applyPattern(page, "x02010");

  // Verificar que hay candidatos detectados (hay selección real)
  const listText = await page.getByTestId("detected-chord-list").textContent();
  expect(listText, "Debe haber candidatos detectados antes de limpiar").not.toContain("No hay lecturas claras todavía");

  // Desplazar la página a Y=150 para tener un scroll offset conocido
  await page.evaluate(() => window.scrollTo(0, 150));
  await page.waitForTimeout(100);

  // Capturar posición antes de limpiar
  const scrollBefore = await page.evaluate(() => ({ x: Math.round(window.scrollX), y: Math.round(window.scrollY) }));

  // Pulsar "Limpiar"
  const clearBtn = page.getByTestId("chord-detect-clear-btn");
  await clearBtn.click();

  // Esperar más que el último timer (700 ms) más el último rAF (~16 ms × 12 ≈ 200 ms)
  await page.waitForTimeout(950);

  // Capturar posición después
  const scrollAfter = await page.evaluate(() => ({ x: Math.round(window.scrollX), y: Math.round(window.scrollY) }));

  const driftX = Math.abs(scrollAfter.x - scrollBefore.x);
  const driftY = Math.abs(scrollAfter.y - scrollBefore.y);

  expect(driftX, `scrollX drifted ${driftX}px: antes=${scrollBefore.x} después=${scrollAfter.x}`).toBeLessThanOrEqual(5);
  expect(driftY, `scrollY drifted ${driftY}px: antes=${scrollBefore.y} después=${scrollAfter.y}`).toBeLessThanOrEqual(5);
});

// ── Test V2 ────────────────────────────────────────────────────────────────────
test("V2. Panel recibe foco sin scroll: 'Selección manual' tiene foco tras limpiar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await goToChords(page);
  await enableDetectMode(page);

  await applyPattern(page, "x02010");

  // Desplazar moderadamente
  await page.evaluate(() => window.scrollTo(0, 80));
  await page.waitForTimeout(100);

  const scrollBefore = await page.evaluate(() => Math.round(window.scrollY));

  // Pulsar Limpiar
  await page.getByTestId("chord-detect-clear-btn").click();

  // El foco se asigna síncronamente; esperamos un ciclo de rAF para confirmarlo
  await page.waitForTimeout(50);

  const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? null);
  expect(
    focusedLabel,
    `El panel 'Selección manual' debería tener foco. activeElement.aria-label="${focusedLabel}"`
  ).toBe("Selección manual");

  // El scroll no debería haber cambiado durante la asignación de foco
  const scrollAfter = await page.evaluate(() => Math.round(window.scrollY));
  const drift = Math.abs(scrollAfter - scrollBefore);
  expect(drift, `El scroll cambió ${drift}px al asignar foco (antes=${scrollBefore} después=${scrollAfter})`).toBeLessThanOrEqual(5);
});

// ── Test V3 ────────────────────────────────────────────────────────────────────
test("V3. Selección vacía tras limpiar: mástil muestra mensaje de 'sin lecturas'", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);

  await applyPattern(page, "x02010");

  // Verificar que hay candidatos antes de limpiar
  const listTextBefore = await page.getByTestId("detected-chord-list").textContent();
  expect(listTextBefore, "Debe haber candidatos antes de limpiar").not.toContain("No hay lecturas claras todavía");

  // Pulsar Limpiar
  await page.getByTestId("chord-detect-clear-btn").click();
  await page.waitForTimeout(300);

  // La lista debe mostrar el mensaje de "sin lecturas" (la selección de celdas quedó vacía)
  await expect(page.getByText("No hay lecturas claras todavía")).toBeVisible({ timeout: 2000 });

  // El botón de limpiar queda en estado aria-disabled (no hay nada que limpiar)
  const clearBtn = page.getByTestId("chord-detect-clear-btn");
  const ariaDisabled = await clearBtn.getAttribute("aria-disabled");
  expect(ariaDisabled, "El botón debe quedar aria-disabled tras limpiar").toBe("true");
});

// ── Test V4 ────────────────────────────────────────────────────────────────────
test("V4. Clear repetido estable: varios ciclos clear-seleccionar no acumulan drift de scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await goToChords(page);
  await enableDetectMode(page);

  // Desplazar a Y=150
  await page.evaluate(() => window.scrollTo(0, 150));
  await page.waitForTimeout(100);
  const scrollRef = await page.evaluate(() => Math.round(window.scrollY));

  // Tres ciclos: seleccionar → limpiar
  for (let i = 0; i < 3; i++) {
    await applyPattern(page, "x02010");
    await page.getByTestId("chord-detect-clear-btn").click();
    await page.waitForTimeout(200);
  }

  // Esperar a que todos los timers del último ciclo terminen
  await page.waitForTimeout(800);

  const scrollFinal = await page.evaluate(() => Math.round(window.scrollY));
  const drift = Math.abs(scrollFinal - scrollRef);
  expect(drift, `Drift acumulado tras 3 ciclos: ${drift}px (ref=${scrollRef} final=${scrollFinal})`).toBeLessThanOrEqual(5);
});
