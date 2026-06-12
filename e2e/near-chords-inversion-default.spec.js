/**
 * E2E — nearChords: persistencia y default del combo de Inversión.
 *
 * Regla correcta (v6.0.35):
 *   - En estado limpio (sin localStorage) la inversión por defecto es "all" (Todas).
 *   - Si el usuario elige otra inversión, al recargar se conserva su elección.
 *   - El comportamiento es idéntico al de la sección Acordes.
 *
 * Regresión v6.0.34: sanitizeNearSlotValue hardcodeaba inversion="all" en lugar de
 * usar el valor guardado, por lo que cualquier elección del usuario se perdía al
 * recargar la página.
 *
 * Tests:
 *   NC-INV-DEFAULT   estado limpio → "Todas"
 *   NC-INV-PERSIST   "1ª inversión" → reload → "1ª inversión"
 *   NC-INV-PERSIST-ROOT "Fundamental" → reload → "Fundamental"
 *   NC-INV-ACORDES   regresión: la sección Acordes mantiene persistencia de inversión
 */

import { test, expect } from "@playwright/test";

async function clearAndGoToNearChords(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  // Tiempo suficiente para que todos los efectos post-hidratación hayan corrido.
  await page.waitForTimeout(500);
}

async function goToNearChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);
}

// ── NC-INV-DEFAULT ──────────────────────────────────────────────────────────
// Con localStorage limpio (configuración restaurada) la inversión es "Todas".
test("NC-INV-DEFAULT: estado limpio → inversión de slot 0 es 'all' (Todas)", async ({ page }) => {
  await clearAndGoToNearChords(page);
  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("all");
});

// ── NC-INV-PERSIST ──────────────────────────────────────────────────────────
// El usuario elige "1ª inversión"; tras recargar debe conservarse.
test("NC-INV-PERSIST: '1ª inversión' se conserva tras reload", async ({ page }) => {
  await goToNearChords(page);

  await page.getByTestId("near-slot-0-inversion").selectOption("1");
  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("1");
  await page.waitForTimeout(300);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("1");
});

// ── NC-INV-PERSIST-ROOT ─────────────────────────────────────────────────────
// El usuario elige "Fundamental"; tras recargar debe conservarse.
test("NC-INV-PERSIST-ROOT: 'Fundamental' se conserva tras reload", async ({ page }) => {
  await goToNearChords(page);

  await page.getByTestId("near-slot-0-inversion").selectOption("root");
  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("root");
  await page.waitForTimeout(300);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("root");
});

// ── NC-INV-ACORDES ──────────────────────────────────────────────────────────
// Regresión: la sección Acordes mantiene su comportamiento actual de persistencia.
test("NC-INV-ACORDES: la sección Acordes conserva la inversión elegida tras reload", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();

  // Necesitamos tetrad para tener inversiones disponibles.
  await page.getByTestId("select-structure").selectOption("tetrad");
  await expect(page.getByTestId("select-inversion")).toBeVisible();
  await page.getByTestId("select-inversion").selectOption("1");
  await expect(page.getByTestId("select-inversion")).toHaveValue("1");
  await page.waitForTimeout(300);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
  await page.waitForTimeout(400);

  await expect(page.getByTestId("select-inversion")).toHaveValue("1");
});

// ── NC-INV-STRUCTURE (regresión: cambiar estructura resetea a "all") ─────────
test("NC-INV-STRUCTURE: cambiar estructura en near-chords resetea inversión a 'all'", async ({ page }) => {
  await goToNearChords(page);

  await page.getByTestId("near-slot-0-inversion").selectOption("root");
  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("root");

  await page.getByTestId("near-slot-0-structure").selectOption("tetrad");
  await page.waitForTimeout(150);
  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("all");

  await page.getByTestId("near-slot-0-structure").selectOption("chord");
  await page.waitForTimeout(150);
  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("all");
});
