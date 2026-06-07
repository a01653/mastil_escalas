/**
 * E2E — nearChords: extensiones (9/11/13) y omisiones (1/3/5) en familia terciaria.
 *
 * Verifica que:
 * - ext9 activa el grado "9" en el badge de notas (NC-EXT-1)
 * - omit=5 elimina el grado "5" del badge (NC-OMIT-5)
 * - omit=1 elimina el grado "1" del badge (NC-OMIT-1)
 * - omit=3 elimina el grado "3" del badge (NC-OMIT-3)
 * - Sin omit/ext activados, el badge muestra "1", "3", "5" (NC-REG)
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
// Con structure="tetrad", el efecto de normalización activa ext7=true automáticamente
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
