import { test, expect } from "@playwright/test";

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function enableManualMode(page) {
  const toggle = page.getByTestId("chord-detect-toggle");
  await toggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
}

async function applyManualPattern(page, pattern) {
  const patternInput = page.getByTestId("chord-detect-pattern-input");
  await expect(patternInput).toBeVisible();
  await patternInput.fill(pattern);
  await page.getByTestId("chord-detect-apply-btn").click();
}

async function copyDetectedReading(page, namePattern) {
  const nameEl = page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: namePattern }).first();
  await expect(nameEl).toBeVisible({ timeout: 5000 });
  const testId = await nameEl.getAttribute("data-testid");
  const candidateId = testId?.replace(/^detected-chord-name-/, "");
  expect(candidateId, `No se pudo derivar el id del candidato desde ${testId}`).toBeTruthy();

  const copyBtn = page.getByTestId(`detected-copy-${candidateId}`);
  await expect(copyBtn).toBeVisible({ timeout: 3000 });
  await expect(copyBtn).toBeEnabled();
  await copyBtn.click();

  await expect(page.getByTestId("chord-detect-toggle")).not.toBeChecked({ timeout: 3000 });
  await expect(page.getByTestId("voicing-select")).toBeVisible({ timeout: 3000 });
}

async function waitForCopyNoticeToDisappear(page) {
  await expect(page.getByTestId("chord-copy-notice")).toHaveCount(0, { timeout: 5000 });
}

test("78. Copia tertian diferida: el pending se consume una vez y no re-juega al reseleccionar el voicing", async ({ page }) => {
  await goToChords(page);
  await enableManualMode(page);
  await applyManualPattern(page, "xx0212");
  await copyDetectedReading(page, /^D7$/);

  await expect(page.getByTestId("select-structure")).toHaveValue("chord");
  await expect(page.getByTestId("toggle-allow-open-strings")).toBeChecked();
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0212");

  await waitForCopyNoticeToDisappear(page);

  await page.getByTestId("select-structure").selectOption("tetrad");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0212");
  await page.waitForTimeout(600);

  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0212");
});

test("79. Copia tertian diferida: el fallback async completa structure='chord' y allowOpenStrings tras un fallo inicial de catálogo", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/chords-db/**", async (route) => {
    requestCount += 1;
    if (requestCount <= 4) {
      await route.fulfill({
        status: 404,
        contentType: "text/plain",
        body: "blocked for deferred-resolution test",
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });

  await goToChords(page);
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();
  await enableManualMode(page);
  await applyManualPattern(page, "x57565");
  await copyDetectedReading(page, /^Dm7$/);

  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("chord-copy-notice")).toBeVisible();

  await expect(page.getByTestId("select-structure")).toHaveValue("chord", { timeout: 5000 });
  await expect(page.getByTestId("toggle-allow-open-strings")).toBeChecked({ timeout: 5000 });
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x57565");
});

test("80. Copia tertian diferida: si el catálogo no resuelve, no fuerza structure='chord' ni allowOpenStrings", async ({ page }) => {
  await page.route("**/chords-db/**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "catalog unavailable for deferred-resolution test",
    });
  });

  await goToChords(page);
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();
  await enableManualMode(page);
  await applyManualPattern(page, "x57565");
  await copyDetectedReading(page, /^Dm7$/);

  await expect(page.getByTestId("chord-copy-notice")).toBeVisible();
  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();

  await page.waitForTimeout(1800);

  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x57565");
});
