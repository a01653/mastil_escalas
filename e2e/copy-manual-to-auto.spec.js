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

async function expectSelectedVoicing(page, expectedPattern, { forbiddenPattern = null } = {}) {
  const voicingSelect = page.getByTestId("voicing-select");
  const options = await voicingSelect.locator("option").allTextContents();
  const selectedOption = options.find((text) => text.includes(expectedPattern));
  expect(
    selectedOption,
    `Ninguna opción contiene ${expectedPattern}. Opciones: ${options.join(" | ")}`
  ).toBeTruthy();

  const selectedValue = await voicingSelect.evaluate((el) => el.value);
  expect(selectedValue, `Valor seleccionado: "${selectedValue}", esperado "${expectedPattern}"`).toBe(expectedPattern);
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText(expectedPattern);
  if (forbiddenPattern) {
    expect(selectedValue).not.toBe(forbiddenPattern);
  }
}

async function copyManualPatternAndExpectVoicing(page, { pattern, reading, expectedPattern, forbiddenPattern = null }) {
  await goToChords(page);
  await enableManualMode(page);
  await applyManualPattern(page, pattern);
  await copyDetectedReading(page, reading);
  await expectSelectedVoicing(page, expectedPattern, { forbiddenPattern });
}

test("Acorde/Add: x0220x copia Asus2, activa cuerdas al aire y conserva x0220x", async ({ page }) => {
  await copyManualPatternAndExpectVoicing(page, {
    pattern: "x0220x",
    reading: /Asus2/,
    expectedPattern: "x0220x",
  });

  await expect(page.getByTestId("toggle-allow-open-strings")).toBeChecked();
  await expect(page.getByTestId("chord-family-state")).toHaveText("tertian");
  await expect(page.getByTestId("chord-title")).toContainText("Asus2");
});

test("Triada/inversión: x422xx copia A/C# y no normaliza a 542xxx", async ({ page }) => {
  await copyManualPatternAndExpectVoicing(page, {
    pattern: "x422xx",
    reading: /A\/C#/,
    expectedPattern: "x422xx",
    forbiddenPattern: "542xxx",
  });

  await expect(page.getByTestId("chord-family-state")).toHaveText("tertian");
  await expect(page.getByTestId("chord-title")).toContainText("A");
  const selectedOption = await page.getByTestId("voicing-select").locator("option:checked").textContent();
  expect(selectedOption).toContain("(C dist ");
  expect(selectedOption).not.toContain("copiado");
});

test("Cuatriada: x02020 copia A7, activa cuerdas al aire y conserva x02020", async ({ page }) => {
  await copyManualPatternAndExpectVoicing(page, {
    pattern: "x02020",
    reading: /^A7$/,
    expectedPattern: "x02020",
  });

  await expect(page.getByTestId("toggle-allow-open-strings")).toBeChecked();
  await expect(page.getByTestId("chord-family-state")).toHaveText("tertian");
  await expect(page.getByTestId("chord-title")).toContainText("A7");
});

test("Notas guía: xx325x copia Fmaj7(no5) como Notas guía y conserva xx325x", async ({ page }) => {
  await copyManualPatternAndExpectVoicing(page, {
    pattern: "xx325x",
    reading: /Fmaj7\(no5\)/,
    expectedPattern: "xx325x",
  });

  await expect(page.getByTestId("chord-family-state")).toHaveText("guide_tones");
  await expect(page.getByTestId("chord-title")).toContainText("Fmaj7");
});
