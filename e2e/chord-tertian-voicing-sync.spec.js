import { test, expect } from "@playwright/test";

const UI_STORAGE_KEY = "mastil_interactivo_guitarra_config_v1";

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function selectTone(page, letter) {
  await page.getByTestId("select-tone").selectOption(letter);
}

async function selectQuality(page, value) {
  await page.getByTestId("select-quality").selectOption(value);
}

async function selectStructure(page, value) {
  await page.getByTestId("select-structure").selectOption(value);
}

async function enableDetectMode(page) {
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

async function configureDm7(page) {
  await selectTone(page, "D");
  await selectQuality(page, "min");
  await selectStructure(page, "chord");
  if (!(await page.getByTestId("ext-7").isChecked())) {
    await page.getByTestId("ext-7").check();
  }
  await expect(page.getByTestId("ext-7")).toBeChecked();
  await expect(page.getByTestId("voicing-select")).toBeVisible({ timeout: 3000 });
}

async function getVoicingOptionValues(page) {
  return page.getByTestId("voicing-select").locator("option").evaluateAll((opts) => opts.map((o) => o.value));
}

async function getVoicingOptionTexts(page) {
  return page.getByTestId("voicing-select").locator("option").allTextContents();
}

async function patchPersistedChordConfig(page, patch) {
  await page.evaluate(({ key, patchValue }) => {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { version: 1, appVersion: "6.0.8", config: {} };
    parsed.config = { ...(parsed.config || {}), ...patchValue };
    window.localStorage.setItem(key, JSON.stringify(parsed));
  }, { key: UI_STORAGE_KEY, patchValue: patch });
}

test("74. Tertian: seleccionar un voicing no-default actualiza patrón y Study sin saltar al primer voicing", async ({ page }) => {
  await goToChords(page);
  await configureDm7(page);

  const voicingSelect = page.getByTestId("voicing-select");
  await voicingSelect.selectOption("axaaax");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("axaaax");

  await page.getByTestId("study-toggle").click();
  await expect(page.getByText(/^Digitación:\s*axaaax$/)).toBeVisible({ timeout: 3000 });

  await selectQuality(page, "minmaj7");

  await expect(page.getByTestId("chord-title")).toContainText("Dm(maj7)");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("axbaax");
  await expect(voicingSelect).toHaveValue("axbaax");
  await expect(voicingSelect).not.toHaveValue("14x23x");
  await expect(page.getByText(/^Digitación:\s*axbaax$/)).toBeVisible({ timeout: 3000 });
});

test("75. Tertian: restaurar chordSelectedFrets persistido prevalece sobre idx obsoleto y luego permite cambiar de voicing", async ({ page }) => {
  await goToChords(page);
  await configureDm7(page);

  const optionValues = await getVoicingOptionValues(page);
  expect(optionValues.length, `Se esperaban al menos 2 voicings para Dm7. Opciones: ${optionValues.join(", ")}`).toBeGreaterThan(1);

  const restoredPattern = optionValues[1];
  const alternativePattern = optionValues.find((value) => value !== restoredPattern);
  expect(alternativePattern, `No se encontró una alternativa distinta de ${restoredPattern}. Opciones: ${optionValues.join(", ")}`).toBeTruthy();

  await patchPersistedChordConfig(page, {
    chordVoicingIdx: 0,
    chordSelectedFrets: restoredPattern,
  });

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("voicing-select")).toHaveValue(restoredPattern);
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText(restoredPattern);

  await page.getByTestId("voicing-select").selectOption(alternativePattern);
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText(alternativePattern);
  await page.waitForTimeout(200);
  await expect(page.getByTestId("voicing-select")).toHaveValue(alternativePattern);
});

test("76. Tertian copiado: mientras el fingerprint coincide, el voicing copiado sigue visible en el selector", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyManualPattern(page, "x422xx");
  await copyDetectedReading(page, /A\/C#/);

  const voicingSelect = page.getByTestId("voicing-select");
  const optionsBefore = await getVoicingOptionTexts(page);
  expect(
    optionsBefore.some((text) => text.includes("x422xx") && text.includes("(C dist")),
    `x422xx debe seguir visible como voicing copiado. Opciones: ${optionsBefore.join(" | ")}`
  ).toBe(true);

  const alternativeValue = (await getVoicingOptionValues(page)).find((value) => value !== "x422xx");
  expect(alternativeValue, "Se esperaba al menos un voicing alternativo además de x422xx").toBeTruthy();
  await voicingSelect.selectOption(alternativeValue);
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText(alternativeValue);

  const optionsAfter = await getVoicingOptionTexts(page);
  expect(
    optionsAfter.some((text) => text.includes("x422xx") && text.includes("(C dist")),
    `x422xx no debe desaparecer mientras el fingerprint sigue coincidiendo. Opciones: ${optionsAfter.join(" | ")}`
  ).toBe(true);
});

test("77. Tertian copiado: al invalidar el fingerprint, el voicing copiado deja de inyectarse", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyManualPattern(page, "x422xx");
  await copyDetectedReading(page, /A\/C#/);

  const optionsBefore = await getVoicingOptionTexts(page);
  expect(
    optionsBefore.some((text) => text.includes("x422xx") && text.includes("(C dist")),
    `x422xx debe entrar como voicing copiado antes de invalidar el fingerprint. Opciones: ${optionsBefore.join(" | ")}`
  ).toBe(true);

  await page.getByTestId("select-inversion").selectOption("root");
  await page.waitForTimeout(200);

  const optionsAfter = await getVoicingOptionTexts(page);
  expect(
    optionsAfter.some((text) => text.includes("x422xx")),
    `x422xx no debe seguir presente tras invalidar el fingerprint. Opciones: ${optionsAfter.join(" | ")}`
  ).toBe(false);
});
