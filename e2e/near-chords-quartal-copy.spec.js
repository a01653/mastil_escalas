/**
 * E2E — near chords: copia de candidato cuartal desde Acordes > Manual.
 *
 * Al copiar "Cuartal B" (detectado en x02200: B→E→A) al slot 0:
 *   NC-Q-FAMILY   el selector de familia muestra "quartal", no "tertian"
 *   NC-Q-TITLE    el nombre en cabecera contiene "Cuartal puro"
 *   NC-Q-NO-TRIAD el selector de calidad terciaria NO está visible
 *
 * Voicing x02200: notas {A=9, E=4, B=11}
 *   → cadena cuartal B(11)→E(4)→A(9), tipo "pure", spread "open"
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

// ── NC-Q-FAMILY ───────────────────────────────────────────────────────────────
// Cuartal B copiado al slot 0 → selector familia = "quartal".
test("NC-Q-FAMILY: copiar Cuartal B al slot 0 → familia es cuartal", async ({ page }) => {
  await goToChords(page);
  await enableManualMode(page);
  await applyPattern(page, "x02200");

  const candId = await findCandidateId(page, /Cuartal\s+B/);
  expect(candId, "No se encontró 'Cuartal B' en los candidatos de x02200").toBeTruthy();

  await page.getByTestId(`detected-copy-near-${candId}-0`).click();
  await page.waitForTimeout(300);

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  await expect(page.getByTestId("near-slot-0-family")).toHaveValue("quartal");
  await expect(page.getByTestId("near-slot-0-family")).not.toHaveValue("tertian");
});

// ── NC-Q-TITLE ────────────────────────────────────────────────────────────────
// El nombre en cabecera del slot contiene "Cuartal puro" (no "Triada" ni nombre terciario).
test("NC-Q-TITLE: copiar Cuartal B → cabecera contiene 'Cuartal puro'", async ({ page }) => {
  await goToChords(page);
  await enableManualMode(page);
  await applyPattern(page, "x02200");

  const candId = await findCandidateId(page, /Cuartal\s+B/);
  expect(candId).toBeTruthy();

  await page.getByTestId(`detected-copy-near-${candId}-0`).click();
  await page.waitForTimeout(300);

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  const chordSpan = page.getByTestId("near-slot-0-title-chord");
  await expect(chordSpan).toContainText("Cuartal puro");
});

// ── NC-Q-NO-TRIAD ─────────────────────────────────────────────────────────────
// Tras copiar Cuartal B, el selector de estructura terciaria no está visible
// (el slot muestra controles cuartales, no terciarios).
test("NC-Q-NO-TRIAD: copiar Cuartal B → selector de estructura terciaria no visible", async ({ page }) => {
  await goToChords(page);
  await enableManualMode(page);
  await applyPattern(page, "x02200");

  const candId = await findCandidateId(page, /Cuartal\s+B/);
  expect(candId).toBeTruthy();

  await page.getByTestId(`detected-copy-near-${candId}-0`).click();
  await page.waitForTimeout(300);

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  // En modo cuartal, el selector de estructura terciaria no aparece
  await expect(page.getByTestId("near-slot-0-structure")).not.toBeVisible();
  // El selector de tipo cuartal sí aparece
  await expect(page.getByTestId("near-slot-0-quartal-type")).toBeVisible();
  await expect(page.getByTestId("near-slot-0-quartal-type")).toHaveValue("pure");
});
