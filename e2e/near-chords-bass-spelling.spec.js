/**
 * E2E — Regresión: bassName en nearChords tertian usa spellNoteFromChordInterval.
 *
 * Antes del fix (v5.24), buildNearSlotStudyEntry usaba pcToName(voicing.bassPc, preferSharps)
 * directamente en la rama tertian. Para Gm con preferSharpsFromMajorTonicPc(G)=true,
 * pc=10 se renderizaba como "A#" en lugar de "Bb".
 *
 * Estos tests fallan con el código anterior y pasan con el código corregido.
 */

import { test, expect } from "@playwright/test";

async function goToNearChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
}

async function configureSlot0(page, { tone, quality, structure, inversion }) {
  if (tone != null)      await page.getByTestId("near-slot-0-tone").selectOption(tone);
  if (quality != null)   await page.getByTestId("near-slot-0-quality").selectOption(quality);
  if (structure != null) await page.getByTestId("near-slot-0-structure").selectOption(structure);
  if (inversion != null) await page.getByTestId("near-slot-0-inversion").selectOption(inversion);
}

// ── Test 1: Gm/Bb ────────────────────────────────────────────────────────────
test("nearChords bassName: Gm 1ª inversión muestra Bb, no A#", async ({ page }) => {
  await goToNearChords(page);

  // Habilitar slot 0 por si estuviera desactivado por sesión previa
  const enabledCheckbox = page.getByTestId("near-slot-0-enabled");
  if (await enabledCheckbox.isVisible()) {
    await enabledCheckbox.evaluate((el) => { if (!el.checked) el.click(); });
  }

  await configureSlot0(page, { tone: "G", quality: "min", structure: "triad", inversion: "1" });

  const bassNote = page.getByTestId("near-slot-0").getByTestId("chord-badge-bass-note");
  await expect(bassNote).toBeVisible();
  await expect(bassNote).toHaveText("Bb");
  await expect(bassNote).not.toHaveText("A#");
});

// ── Test 2: G/B ──────────────────────────────────────────────────────────────
test("nearChords bassName: G mayor 1ª inversión muestra B, no Cb", async ({ page }) => {
  await goToNearChords(page);

  const enabledCheckbox = page.getByTestId("near-slot-0-enabled");
  if (await enabledCheckbox.isVisible()) {
    await enabledCheckbox.evaluate((el) => { if (!el.checked) el.click(); });
  }

  await configureSlot0(page, { tone: "G", quality: "maj", structure: "triad", inversion: "1" });

  const bassNote = page.getByTestId("near-slot-0").getByTestId("chord-badge-bass-note");
  await expect(bassNote).toBeVisible();
  await expect(bassNote).toHaveText("B");
  await expect(bassNote).not.toHaveText("Cb");
});

// ── Test 3: Dm/F ─────────────────────────────────────────────────────────────
test("nearChords bassName: Dm 1ª inversión muestra F, no E#", async ({ page }) => {
  await goToNearChords(page);

  const enabledCheckbox = page.getByTestId("near-slot-0-enabled");
  if (await enabledCheckbox.isVisible()) {
    await enabledCheckbox.evaluate((el) => { if (!el.checked) el.click(); });
  }

  await configureSlot0(page, { tone: "D", quality: "min", structure: "triad", inversion: "1" });

  const bassNote = page.getByTestId("near-slot-0").getByTestId("chord-badge-bass-note");
  await expect(bassNote).toBeVisible();
  await expect(bassNote).toHaveText("F");
  await expect(bassNote).not.toHaveText("E#");
});
