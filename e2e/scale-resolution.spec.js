/**
 * E2E — Puntos de resolución (Comparador de escalas)
 */

import { test, expect } from "@playwright/test";

async function gotoDesktop(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function openCompare(page) {
  await page.getByTestId("nav-scale-compare").click();
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
}

async function activateTwoScales(page) {
  await page.getByTestId("scale-compare-toggle-0").click();
  await page.getByTestId("scale-compare-toggle-1").click();
}

// Inicia con scaleCompareVisible:[] para tests que verifican estado sin filas activas
async function gotoDesktopClearVisible(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((cfg) => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.localStorage.setItem("mastil_interactivo_guitarra_config_v1", JSON.stringify(cfg));
    }
  }, { version: 1, appVersion: "6.0.74", config: { scaleCompareVisible: [] } });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

// ── SR1: Bloque visible con 0 escalas activas ────────────────────────────────
test("SR1. Bloque resolución visible; mensaje de ayuda cuando <2 escalas", async ({ page }) => {
  await gotoDesktopClearVisible(page);
  await openCompare(page);

  await expect(page.getByTestId("scale-resolution-block")).toBeVisible();
  await expect(page.getByText(/Selecciona dos escalas/)).toBeVisible();
});

// ── SR2: Activar dos escalas muestra origen/destino e Intercambiar ───────────
test("SR2. Con 2 escalas activas: muestra origen, destino y botón Intercambiar", async ({ page }) => {
  await gotoDesktopClearVisible(page);
  await openCompare(page);
  await activateTwoScales(page);

  await expect(page.getByText(/Origen:/)).toBeVisible();
  await expect(page.getByText(/Destino:/)).toBeVisible();
  await expect(page.getByTestId("scale-resolution-swap")).toBeVisible();
});

// ── SR3: Toggle ON/OFF activa la feature ─────────────────────────────────────
test("SR3. Toggle ON activa puntos de resolución; la lista aparece debajo del mástil", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoDesktopClearVisible(page);
  await openCompare(page);
  await activateTwoScales(page);

  // Por defecto OFF: la lista no existe
  await expect(page.getByTestId("scale-resolution-list")).toHaveCount(0);

  // Activar
  await page.getByTestId("scale-resolution-toggle").click();
  await expect(page.getByTestId("scale-resolution-toggle")).toHaveText("ON");

  // Lista aparece
  await expect(page.getByTestId("scale-resolution-list")).toBeVisible();
  expect(errors).toHaveLength(0);
});

// ── SR4: Botón Intercambiar invierte origen y destino ────────────────────────
test("SR4. Intercambiar invierte origen y destino sin crash", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoDesktopClearVisible(page);
  await openCompare(page);
  await activateTwoScales(page);

  const resolutionBlock = page.getByTestId("scale-resolution-block");
  const beforeText = await resolutionBlock.innerText();

  await page.getByTestId("scale-resolution-swap").click();
  await expect(resolutionBlock).toBeVisible();

  const afterText = await resolutionBlock.innerText();
  // El texto cambia (origen y destino se intercambian)
  expect(beforeText).not.toBe(afterText);
  expect(errors).toHaveLength(0);
});

// ── SR5: El mástil sigue pintando igual (sin crash) ──────────────────────────
test("SR5. Activar resolución no rompe el mástil", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoDesktop(page);
  await openCompare(page);
  await activateTwoScales(page);

  await page.getByTestId("scale-resolution-toggle").click();

  // El panel del Comparador sigue visible y sin errores
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  expect(errors).toHaveLength(0);
});

// ── SR6: FIFO no se rompe con resolución activa ──────────────────────────────
test("SR6. FIFO sigue funcionando con puntos de resolución activados", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoDesktop(page);
  await openCompare(page);
  await activateTwoScales(page);
  await page.getByTestId("scale-resolution-toggle").click();

  // Activar una 3.ª escala (FIFO desplaza la 1.ª)
  await page.getByTestId("scale-compare-toggle-2").click();

  // No crash
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  expect(errors).toHaveLength(0);
});

// ── SR7: Toggle OFF oculta la lista ──────────────────────────────────────────
test("SR7. Toggle OFF oculta la lista de resolución", async ({ page }) => {
  await gotoDesktopClearVisible(page);
  await openCompare(page);
  await activateTwoScales(page);

  await page.getByTestId("scale-resolution-toggle").click(); // ON
  await expect(page.getByTestId("scale-resolution-list")).toBeVisible();

  await page.getByTestId("scale-resolution-toggle").click(); // OFF
  await expect(page.getByTestId("scale-resolution-toggle")).toHaveText("OFF");
  await expect(page.getByTestId("scale-resolution-list")).toHaveCount(0);
});

// ── SR8: Flechas visibles en el mástil ───────────────────────────────────────
test("SR8. Resolución ON + 2 escalas: flechas SVG aparecen en el mástil", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoDesktopClearVisible(page);
  await openCompare(page);
  await activateTwoScales(page);

  await page.getByTestId("scale-resolution-toggle").click(); // ON

  // La lista debe aparecer
  await expect(page.getByTestId("scale-resolution-list")).toBeVisible();

  // El SVG de flechas debe aparecer en el mástil
  await expect(page.getByTestId("scale-resolution-arrows")).toBeVisible();

  // Debe tener líneas (flechas) dentro
  // Nota: SVG <line> puede tener bounding box de altura 0 (flechas horizontales),
  // por eso usamos toBeAttached en lugar de toBeVisible.
  const lines = page.locator('[data-testid="scale-resolution-arrows"] line');
  await expect(lines.first()).toBeAttached();

  expect(errors).toHaveLength(0);
});

// ── SR9: Sin flechas cuando resolución OFF ───────────────────────────────────
test("SR9. Resolución OFF: no aparecen flechas en el mástil", async ({ page }) => {
  await gotoDesktop(page);
  await openCompare(page);
  await activateTwoScales(page);
  // No activamos resolución

  await expect(page.getByTestId("scale-resolution-arrows")).toHaveCount(0);
});

// ── SR10: Sin flechas con menos de 2 escalas ─────────────────────────────────
test("SR10. Con 1 escala y resolución ON: no aparecen flechas", async ({ page }) => {
  await gotoDesktop(page);
  await openCompare(page);
  await page.getByTestId("scale-compare-toggle-0").click(); // Solo 1 escala

  await page.getByTestId("scale-resolution-toggle").click(); // ON

  // Sin 2ª escala no hay puntos de resolución ni flechas
  await expect(page.getByTestId("scale-resolution-arrows")).toHaveCount(0);
});
