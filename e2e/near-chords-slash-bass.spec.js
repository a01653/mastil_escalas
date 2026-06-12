/**
 * E2E — near chords: slashBassPc tras copiar desde Acordes > Manual.
 *
 * Cuando se copia un acorde con bajo en inversión (e.g. Asus2/E, Esus4/A)
 * desde "Posibles acordes" hacia Acordes cercanos, el slot debe:
 *
 *   NC-SB-INVERSION   selector de inversión muestra la inversión real (no "Todas")
 *   NC-SB-NO-DUP      el nombre en cabecera no aparece duplicado (Asus2/E, no Asus2/E/E)
 *   NC-SB-CLEAR       cambiar inversión manualmente limpia el slashBassPc
 *
 * Patrón de prueba: xx2200 → {E=4, A=9, B=11} → Asus2/E (2ª inversión).
 *   Asus2 = A(9) + B(11) + E(4); bajo E = 5ª → 2ª inversión.
 */

import { test, expect } from "@playwright/test";

async function goToChords(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function enableManualMode(page) {
  const toggle = page.getByTestId("chord-detect-toggle");
  await toggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
}

async function applyPattern(page, pattern) {
  const input = page.getByTestId("chord-detect-pattern-input");
  await expect(input).toBeVisible();
  await input.fill(pattern);
  await page.getByTestId("chord-detect-apply-btn").click();
}

async function findCandidateId(page, nameRegex) {
  const nameEl = page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: nameRegex }).first();
  await expect(nameEl).toBeVisible({ timeout: 5000 });
  const testId = await nameEl.getAttribute("data-testid");
  return testId?.replace(/^detected-chord-name-/, "");
}

// ── NC-SB-INVERSION ───────────────────────────────────────────────────────────
// Asus2/E copiado al slot 0 → inversión efectiva "2" (2ª inversión), no "all".
test("NC-SB-INVERSION: copiar Asus2/E al slot 0 → inversión muestra '2ª inversión'", async ({ page }) => {
  await goToChords(page);
  await enableManualMode(page);
  await applyPattern(page, "xx2200");

  const candId = await findCandidateId(page, /Asus2\/E/);
  expect(candId, "No se encontró Asus2/E en los candidatos").toBeTruthy();

  const copyBtn = page.getByTestId(`detected-copy-near-${candId}-0`);
  await expect(copyBtn).toBeVisible({ timeout: 3000 });
  await copyBtn.click();
  await page.waitForTimeout(300);

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("2");
  await expect(page.getByTestId("near-slot-0-inversion")).not.toHaveValue("all");
});

// ── NC-SB-NO-DUP ──────────────────────────────────────────────────────────────
// El nombre en la cabecera no se duplica ("Asus2/E", no "Asus2/E/E").
test("NC-SB-NO-DUP: nombre en cabecera del slot es 'Asus2/E' sin duplicar el bajo", async ({ page }) => {
  await goToChords(page);
  await enableManualMode(page);
  await applyPattern(page, "xx2200");

  const candId = await findCandidateId(page, /Asus2\/E/);
  expect(candId).toBeTruthy();

  await page.getByTestId(`detected-copy-near-${candId}-0`).click();
  await page.waitForTimeout(300);

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  const chordSpan = page.getByTestId("near-slot-0-title-chord");
  await expect(chordSpan).toContainText("Asus2/E");
  await expect(chordSpan).not.toContainText("Asus2/E/E");
});

// ── NC-SB-CLEAR ───────────────────────────────────────────────────────────────
// Cambiar la inversión manualmente borra el slashBassPc → el nombre pierde el /E.
test("NC-SB-CLEAR: cambiar inversión a 'Todas' borra el slash bass (nombre queda 'Asus2')", async ({ page }) => {
  await goToChords(page);
  await enableManualMode(page);
  await applyPattern(page, "xx2200");

  const candId = await findCandidateId(page, /Asus2\/E/);
  expect(candId).toBeTruthy();

  await page.getByTestId(`detected-copy-near-${candId}-0`).click();
  await page.waitForTimeout(300);

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  // Verificar que antes del cambio hay inversión real (no "all")
  await expect(page.getByTestId("near-slot-0-inversion")).not.toHaveValue("all");

  // Cambiar a "Todas" — debe limpiar slashBassPc
  await page.getByTestId("near-slot-0-inversion").selectOption("all");
  await page.waitForTimeout(200);

  // Ahora el selector muestra "all"
  await expect(page.getByTestId("near-slot-0-inversion")).toHaveValue("all");

  // El nombre ya no tiene el bajo slash
  const chordSpan = page.getByTestId("near-slot-0-title-chord");
  await expect(chordSpan).not.toContainText("/E");
  await expect(chordSpan).toContainText("Asus2");
});
