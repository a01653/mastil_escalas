import { test, expect } from "@playwright/test";

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function enableDetectMode(page) {
  const toggle = page.getByTestId("chord-detect-toggle");
  await toggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
}

async function disableKeepPreviousReading(page) {
  const toggle = page.locator("label", { hasText: "Mantener lectura anterior" }).locator("input[type='checkbox']").first();
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
}

test("DR-1. 75887x prioriza Bmaj7(#9) sobre la lectura slash enarmonica cuando no se mantiene la lectura anterior", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await disableKeepPreviousReading(page);

  await page.getByTestId("chord-detect-pattern-input").fill("75887x");
  await page.getByTestId("chord-detect-apply-btn").click();

  const names = page.locator("[data-testid^='detected-chord-name-']");
  await expect(names.first()).toHaveText(/Bmaj7\(#9\)|Bmaj7\(add#9\)/);
  await expect(names.filter({ hasText: /Ebm\(maj7,addb6\)\/Cb/ }).first()).toBeVisible();
});

test("DR-2. 7x887x mantiene Bmaj7 como lectura principal cuando no se mantiene la lectura anterior", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await disableKeepPreviousReading(page);

  await page.getByTestId("chord-detect-pattern-input").fill("7x887x");
  await page.getByTestId("chord-detect-apply-btn").click();

  const names = page.locator("[data-testid^='detected-chord-name-']");
  await expect(names.first()).toHaveText("Bmaj7");
});
