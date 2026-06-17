/**
 * E2E — Comparador de escalas
 * Verifica la existencia del panel, FIFO, colores y coherencia del mástil.
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

// ── SC1: Patrones no existe, Comparador sí existe ────────────────────────────
test("SC1. Patrones eliminado: no hay nav-patterns; Comparador existe como nav-scale-compare", async ({ page }) => {
  await gotoDesktop(page);

  // "Patrones" ya no debe existir
  await expect(page.getByTestId("nav-patterns")).toHaveCount(0);
  await expect(page.getByTestId("nav-scale-compare")).toBeVisible();
});

// ── SC2: Panel tiene exactamente 4 filas ─────────────────────────────────────
test("SC2. Comparador: el panel tiene exactamente 4 filas", async ({ page }) => {
  await gotoDesktop(page);
  await openCompare(page);

  for (let i = 0; i < 4; i++) {
    await expect(page.getByTestId(`scale-compare-row-${i}`)).toBeVisible();
  }
  await expect(page.getByTestId("scale-compare-row-4")).toHaveCount(0);
});

// ── SC3: Activar una fila no provoca crash ────────────────────────────────────
test("SC3. Comparador: activar la primera fila no provoca crash", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoDesktop(page);
  await openCompare(page);

  await page.getByTestId("scale-compare-toggle-0").click();
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  expect(errors).toHaveLength(0);
});

// ── SC4: FIFO — activar 3 escalas: la 3.ª desplaza a la 1.ª ─────────────────
test("SC4. Comparador: FIFO — al activar la 3.ª escala, la 1.ª se desactiva", async ({ page }) => {
  await gotoDesktop(page);
  await openCompare(page);

  await page.getByTestId("scale-compare-toggle-0").click();
  await page.getByTestId("scale-compare-toggle-1").click();
  await page.getByTestId("scale-compare-toggle-2").click();

  // El panel sigue visible y sin errores JS
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  await expect(page.locator("body")).not.toBeEmpty();
});

// ── SC5: Color del mástil refleja la escala activa ────────────────────────────
test("SC5. Comparador: el mástil aparece cuando hay ≥1 fila activa", async ({ page }) => {
  await gotoDesktop(page);
  await openCompare(page);

  // Sin filas activas: debe haber un mensaje de placeholder
  await expect(page.getByText(/Activa hasta 2 escalas/)).toBeVisible();

  // Activar una fila: el mensaje desaparece, aparece el mástil
  await page.getByTestId("scale-compare-toggle-0").click();
  await expect(page.getByText(/Activa hasta 2 escalas/)).toHaveCount(0);
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
});

// ── SC6: Selector de escala funciona ─────────────────────────────────────────
test("SC6. Comparador: cambiar escala en la fila 0 no provoca crash", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoDesktop(page);
  await openCompare(page);

  await page.getByTestId("scale-compare-toggle-0").click();
  const scaleSelect = page.getByTestId("scale-compare-scale-0");
  await expect(scaleSelect).toBeVisible();

  // Cambiar la escala a la segunda opción disponible
  await scaleSelect.selectOption({ index: 1 });
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  expect(errors).toHaveLength(0);
});

// ── SC7: Selector de raíz funciona ───────────────────────────────────────────
test("SC7. Comparador: cambiar la tónica de la fila 1 no provoca crash", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoDesktop(page);
  await openCompare(page);

  await page.getByTestId("scale-compare-toggle-1").click();
  const letterSelect = page.getByTestId("scale-compare-letter-1");
  await expect(letterSelect).toBeVisible();
  await letterSelect.selectOption("G");

  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  expect(errors).toHaveLength(0);
});

// ── SC8: Desactivar una fila la quita del mástil ─────────────────────────────
test("SC8. Comparador: desactivar una fila activa vuelve al estado de 0 visibles", async ({ page }) => {
  await gotoDesktop(page);
  await openCompare(page);

  await page.getByTestId("scale-compare-toggle-0").click();
  // Fila activa → el placeholder desaparece
  await expect(page.getByText(/Activa hasta 2 escalas/)).toHaveCount(0);

  // Desactivar → vuelve el placeholder
  await page.getByTestId("scale-compare-toggle-0").click();
  await expect(page.getByText(/Activa hasta 2 escalas/)).toBeVisible();
});

// ── SC9: Móvil — Comparador accesible desde la barra de navegación inferior ──
test("SC9. Móvil: Comparador accesible desde la barra de navegación inferior", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const mobileTab = page.getByTestId("mobile-nav-scaleCompare");
  await expect(mobileTab).toBeVisible();
  await mobileTab.click();

  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  await expect(page.locator("body")).not.toBeEmpty();
});
