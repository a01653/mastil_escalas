/**
 * E2E — nearChords: cabecera de slot muestra nombre de acorde con color.
 *
 * Formato correcto (v6.0.45):
 *   Activo:   [Fmaj7 text-sky-700]        · Acorde 1
 *   Inactivo: [Gm7 oklch(0.75 0.05 233)] · Acorde 2  (ambos apagados)
 *
 * Tests:
 *   NC-HDR-FORMAT      cabecera del slot 0 incluye "· Acorde 1"
 *   NC-HDR-BLUE        slot activo → nombre en text-sky-700
 *   NC-HDR-TONE        cambiar tono actualiza el nombre en la cabecera
 *   NC-HDR-COLLAPSED   slot inactivo → nombre sin text-sky-700 (color apagado)
 *   NC-HDR-COLOR-DIFF  slot 0 activo (sky-700) vs slot 1 inactivo (sin sky-700)
 */

import { test, expect } from "@playwright/test";

async function clearAndGoToNearChords(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);
}

// ── NC-HDR-FORMAT ─────────────────────────────────────────────────────────────
test("NC-HDR-FORMAT: cabecera del slot 0 contiene '· Acorde 1'", async ({ page }) => {
  await clearAndGoToNearChords(page);
  await expect(page.getByTestId("near-slot-0-title")).toContainText("· Acorde 1");
  await expect(page.getByTestId("near-slot-0-title")).not.toContainText("(referencia)");
});

// ── NC-HDR-BLUE ───────────────────────────────────────────────────────────────
// Slot activo → el span del acorde tiene text-sky-700.
test("NC-HDR-BLUE: slot activo → nombre del acorde en text-sky-700", async ({ page }) => {
  await clearAndGoToNearChords(page);
  const chordSpan = page.getByTestId("near-slot-0-title-chord");
  await expect(chordSpan).toBeVisible();
  await expect(chordSpan).toHaveClass(/text-sky-700/);
});

// ── NC-HDR-TONE ───────────────────────────────────────────────────────────────
// Cambiar tono actualiza el nombre y mantiene text-sky-700 mientras el slot está activo.
test("NC-HDR-TONE: cambiar tono actualiza la cabecera y mantiene text-sky-700", async ({ page }) => {
  await clearAndGoToNearChords(page);

  await page.getByTestId("near-slot-0-tone").selectOption("F");
  await page.waitForTimeout(150);

  const chordSpan = page.getByTestId("near-slot-0-title-chord");
  await expect(chordSpan).toContainText("F");
  await expect(chordSpan).toHaveClass(/text-sky-700/);
  await expect(page.getByTestId("near-slot-0-title")).toContainText("· Acorde 1");

  await page.getByTestId("near-slot-0-tone").selectOption("G");
  await page.waitForTimeout(150);
  await expect(chordSpan).toContainText("G");
  await expect(chordSpan).toHaveClass(/text-sky-700/);
});

// ── NC-HDR-COLLAPSED ──────────────────────────────────────────────────────────
// Slot inactivo → el span del acorde NO tiene text-sky-700 (usa color apagado inline).
test("NC-HDR-COLLAPSED: slot inactivo → nombre del acorde sin text-sky-700", async ({ page }) => {
  await clearAndGoToNearChords(page);

  const enabled1 = page.getByTestId("near-slot-1-enabled");
  if (await enabled1.isVisible() && !(await enabled1.isChecked())) {
    await enabled1.check();
    await page.waitForTimeout(200);
  }
  await page.getByTestId("near-slot-1-tone").selectOption("G");
  await page.getByTestId("near-slot-1-quality").selectOption("maj");
  await page.waitForTimeout(150);

  // Desactivar → queda contraído
  await enabled1.uncheck();
  await page.waitForTimeout(150);

  const chordSpan1 = page.getByTestId("near-slot-1-title-chord");
  await expect(chordSpan1).toContainText("G");
  await expect(chordSpan1).not.toHaveClass(/text-sky-700/);
  await expect(page.getByTestId("near-slot-1-title")).toContainText("Acorde 2");
});

// ── NC-HDR-COLOR-DIFF ─────────────────────────────────────────────────────────
// Slot 0 activo → sky-700; slot 1 inactivo por defecto → sin sky-700.
test("NC-HDR-COLOR-DIFF: slot activo sky-700, slot inactivo sin sky-700", async ({ page }) => {
  await clearAndGoToNearChords(page);

  await expect(page.getByTestId("near-slot-0-title-chord")).toHaveClass(/text-sky-700/);
  await expect(page.getByTestId("near-slot-1-title-chord")).not.toHaveClass(/text-sky-700/);
});
