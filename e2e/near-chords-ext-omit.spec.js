/**
 * E2E — nearChords: extensiones (9/11/13) y omisiones (1/3/5) en familia terciaria.
 *
 * Verifica que:
 * - ext9 activa el grado "9" en el badge de notas (NC-EXT-1)
 * - omit=5 elimina el grado "5" del badge (NC-OMIT-5)
 * - omit=1 elimina el grado "1" del badge (NC-OMIT-1)
 * - omit=3 elimina el grado "3" del badge (NC-OMIT-3)
 * - Sin omit/ext activados, el badge muestra "1", "3", "5" (NC-REG)
 * - Activar 9 en cuatriada con omit=5 mantiene la 7ª activa (NC-EXT7-KEEP,
 *   regresión v6.0.33: la 7ª se apagaba y Fmaj7(add9,no5) pasaba a Fadd9(no5))
 */

import { test, expect } from "@playwright/test";

async function goToNearChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
}

async function ensureSlotEnabled(page, idx) {
  const cb = page.getByTestId(`near-slot-${idx}-enabled`);
  if (await cb.isVisible()) {
    const checked = await cb.isChecked();
    if (!checked) await cb.check();
  }
}

async function setSlot(page, idx, { tone, quality, structure } = {}) {
  if (tone != null)      await page.getByTestId(`near-slot-${idx}-tone`).selectOption(tone);
  if (quality != null)   await page.getByTestId(`near-slot-${idx}-quality`).selectOption(quality);
  if (structure != null) await page.getByTestId(`near-slot-${idx}-structure`).selectOption(structure);
}

async function getBadgeDegrees(page, slotIdx) {
  const slot = page.getByTestId(`near-slot-${slotIdx}`);
  const degreeEls = slot.locator('[data-testid^="chord-badge-degree-"]');
  return degreeEls.allTextContents();
}

// ── NC-REG ─────────────────────────────────────────────────────────────────
test("NC-REG: C mayor tríada sin omit/ext muestra grados 1, 3, 5", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await setSlot(page, 0, { tone: "C", quality: "maj", structure: "triad" });

  const degrees = await getBadgeDegrees(page, 0);
  expect(degrees).toContain("1");
  expect(degrees).toContain("3");
  expect(degrees).toContain("5");
});

// ── NC-EXT-1 ───────────────────────────────────────────────────────────────
// Usa structure="chord" (sin límite de slots de extensión) para poder activar ext9 libremente.
// Con structure="tetrad" sin omit, entrar en cuatriada activa ext7=true
// ocupando el único slot disponible, lo que deshabilita ext9.
test("NC-EXT-1: C chord con ext9 activa muestra grado 9 en badge", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await setSlot(page, 0, { tone: "C", quality: "maj", structure: "chord" });

  const ext9cb = page.getByTestId("near-slot-0-ext9");
  await expect(ext9cb).toBeVisible();
  await ext9cb.check();

  await page.waitForTimeout(200);
  const degrees = await getBadgeDegrees(page, 0);
  expect(degrees).toContain("9");
});

// ── NC-OMIT-5 ──────────────────────────────────────────────────────────────
test("NC-OMIT-5: omit=5 elimina la quinta del badge de notas", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await setSlot(page, 0, { tone: "C", quality: "maj", structure: "triad" });

  const omit5 = page.getByTestId("near-slot-0-omit-5");
  await expect(omit5).toBeVisible();
  await omit5.check();

  await page.waitForTimeout(200);
  const degrees = await getBadgeDegrees(page, 0);
  expect(degrees).not.toContain("5");
  expect(degrees).toContain("1");
  expect(degrees).toContain("3");
});

// ── NC-OMIT-1 ──────────────────────────────────────────────────────────────
test("NC-OMIT-1: omit=1 elimina la fundamental del badge de notas", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await setSlot(page, 0, { tone: "C", quality: "maj", structure: "triad" });

  const omit1 = page.getByTestId("near-slot-0-omit-1");
  await expect(omit1).toBeVisible();
  await omit1.check();

  await page.waitForTimeout(200);
  const degrees = await getBadgeDegrees(page, 0);
  expect(degrees).not.toContain("1");
  expect(degrees).toContain("3");
  expect(degrees).toContain("5");
});

// ── NC-OMIT-3 ──────────────────────────────────────────────────────────────
test("NC-OMIT-3: omit=3 elimina la tercera del badge de notas", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await setSlot(page, 0, { tone: "C", quality: "maj", structure: "triad" });

  const omit3 = page.getByTestId("near-slot-0-omit-3");
  await expect(omit3).toBeVisible();
  await omit3.check();

  await page.waitForTimeout(200);
  const degrees = await getBadgeDegrees(page, 0);
  expect(degrees).not.toContain("3");
  expect(degrees).toContain("1");
  expect(degrees).toContain("5");
});

// ── NC-EXT7-KEEP ───────────────────────────────────────────────────────────
// Regresión v6.0.33: en cuatriada con omit=5, activar 9 apagaba la 7ª y el
// acorde pasaba de Fmaj7(add9,no5) a Fadd9(no5). La 7ª debe mantenerse activa,
// igual que en la sección Acordes.
test("NC-EXT7-KEEP: F cuatriada + omit5, activar 9 mantiene la 7ª → Fmaj7(add9,no5)", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await setSlot(page, 0, { tone: "F", quality: "maj", structure: "tetrad" });

  // Al entrar en cuatriada, la 7ª queda activa automáticamente.
  const ext7cb = page.getByTestId("near-slot-0-ext7");
  await expect(ext7cb).toBeChecked();

  await page.getByTestId("near-slot-0-omit-5").check();
  const ext9cb = page.getByTestId("near-slot-0-ext9");
  await expect(ext9cb).not.toBeDisabled();
  await ext9cb.check();
  await page.waitForTimeout(200);

  // La 7ª sigue marcada; 9 y omit5 también.
  await expect(ext7cb).toBeChecked();
  await expect(ext9cb).toBeChecked();
  await expect(page.getByTestId("near-slot-0-omit-5")).toBeChecked();

  // El resumen es Fmaj7(add9,no5), no Fadd9(no5).
  const slotText = await page.getByTestId("near-slot-0").textContent();
  expect(slotText).toContain("Fmaj7(add9,no5)");
  expect(slotText).not.toContain("Fadd9(no5)");

  // Notas esperadas: F, A, E, G (1, 3, 7, 9 sin la 5ª).
  const degrees = await getBadgeDegrees(page, 0);
  expect(degrees).toContain("7");
  expect(degrees).toContain("9");
  expect(degrees).not.toContain("5");
});

// ── NC-EXT7-KEEP-11-13 ─────────────────────────────────────────────────────
test("NC-EXT7-KEEP-11-13: en cuatriada con omit5, activar 11 o 13 tampoco apaga la 7ª", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await setSlot(page, 0, { tone: "F", quality: "maj", structure: "tetrad" });

  const ext7cb = page.getByTestId("near-slot-0-ext7");
  await expect(ext7cb).toBeChecked();
  await page.getByTestId("near-slot-0-omit-5").check();

  await page.getByTestId("near-slot-0-ext11").check();
  await page.waitForTimeout(150);
  await expect(ext7cb).toBeChecked();

  await page.getByTestId("near-slot-0-ext11").uncheck();
  await page.getByTestId("near-slot-0-ext13").check();
  await page.waitForTimeout(150);
  await expect(ext7cb).toBeChecked();
});

// ── NC-OMIT-TOGGLE ─────────────────────────────────────────────────────────
test("NC-OMIT-TOGGLE: desactivar omit=5 restaura la quinta", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await setSlot(page, 0, { tone: "C", quality: "maj", structure: "triad" });

  const omit5 = page.getByTestId("near-slot-0-omit-5");
  await omit5.check();
  await page.waitForTimeout(200);

  let degrees = await getBadgeDegrees(page, 0);
  expect(degrees).not.toContain("5");

  await omit5.uncheck();
  await page.waitForTimeout(200);

  degrees = await getBadgeDegrees(page, 0);
  expect(degrees).toContain("5");
});
