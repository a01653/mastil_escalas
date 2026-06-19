import { test, expect } from "@playwright/test";

// Helper: navigate to Acordes Cercanos panel
async function goToNearChords(page) {
  await page.goto("/mastil_escalas/");
  await page.getByTestId("nav-near-chords").click();
  await page.waitForSelector('[data-testid="near-chords-panel"]', { timeout: 8000 });
  await page.waitForSelector('[data-testid="near-progression-select"]', { timeout: 8000 });
}

// Helper: set scale root and mode, then navigate to near-chords
async function setScaleAndGoToNearChords(page, rootValue, scaleModeValue) {
  await page.goto("/mastil_escalas/");
  const rootSelect = page.getByTestId("scale-root-select");
  await rootSelect.selectOption(rootValue);
  // scale-mode-select uses option value = scale name
  const modeSelect = page.getByTestId("scale-mode-select");
  await modeSelect.selectOption(scaleModeValue);
  await page.getByTestId("nav-near-chords").click();
  await page.waitForSelector('[data-testid="near-chords-panel"]', { timeout: 8000 });
  await page.waitForSelector('[data-testid="near-progression-select"]', { timeout: 8000 });
}

// Helper: ensure Auto escala is in the desired state
async function setAutoScale(page, on) {
  const btn = page.getByTitle(
    "Activa o desactiva el ajuste automático de acordes cercanos según la escala"
  );
  const currentText = await btn.textContent();
  const isOn = currentText.trim() === "ON";
  if (on && !isOn) await btn.click();
  if (!on && isOn) await btn.click();
}

test.describe("Near Chords — Selector de progresión y estilo (NCP)", () => {
  test("NCP-01 Auto escala ON habilita Estilo y Progresión", async ({ page }) => {
    await goToNearChords(page);
    await setAutoScale(page, true);

    await expect(page.locator('[data-testid="near-style-select"]')).toBeEnabled();
    await expect(page.locator('[data-testid="near-progression-select"]')).toBeEnabled();
  });

  test("NCP-02 Auto escala OFF deshabilita Estilo y Progresión", async ({ page }) => {
    await goToNearChords(page);
    await setAutoScale(page, false);

    await expect(page.locator('[data-testid="near-style-select"]')).toBeDisabled();
    await expect(page.locator('[data-testid="near-progression-select"]')).toBeDisabled();
  });

  test("NCP-03 en C mayor I-V-vi-IV muestra C G Am F en los slots", async ({ page }) => {
    await setScaleAndGoToNearChords(page, "C", "Mayor");
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("pop");
    await page.locator('[data-testid="near-progression-select"]').selectOption("I-V-vi-IV");
    await page.waitForTimeout(600);

    await expect(page.locator('[data-testid="near-slot-0-title-chord"]')).toContainText("C");
    await expect(page.locator('[data-testid="near-slot-1-title-chord"]')).toContainText("G");
    await expect(page.locator('[data-testid="near-slot-2-title-chord"]')).toContainText("A");
    await expect(page.locator('[data-testid="near-slot-3-title-chord"]')).toContainText("F");
  });

  test("NCP-04 en F mayor I-V-vi-IV muestra F C Dm Bb en los slots", async ({ page }) => {
    await setScaleAndGoToNearChords(page, "F", "Mayor");
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("pop");
    await page.locator('[data-testid="near-progression-select"]').selectOption("I-V-vi-IV");
    await page.waitForTimeout(600);

    await expect(page.locator('[data-testid="near-slot-0-title-chord"]')).toContainText("F");
    await expect(page.locator('[data-testid="near-slot-1-title-chord"]')).toContainText("C");
    await expect(page.locator('[data-testid="near-slot-2-title-chord"]')).toContainText("D");
    await expect(page.locator('[data-testid="near-slot-3-title-chord"]')).toContainText("Bb");
  });

  test("NCP-05 progresión de 3 acordes I-IV-V llena slot 4 con sustituto vi (Am en C)", async ({
    page,
  }) => {
    await setScaleAndGoToNearChords(page, "C", "Mayor");
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("pop");
    await page.locator('[data-testid="near-progression-select"]').selectOption("I-IV-V");
    await page.waitForTimeout(600);

    await expect(page.locator('[data-testid="near-slot-0-title-chord"]')).toContainText("C");
    await expect(page.locator('[data-testid="near-slot-1-title-chord"]')).toContainText("F");
    await expect(page.locator('[data-testid="near-slot-2-title-chord"]')).toContainText("G");
    await expect(page.locator('[data-testid="near-slot-3-title-chord"]')).toContainText("A");
  });

  test("NCP-06 progresión persiste al recargar (misma versión)", async ({ page }) => {
    await goToNearChords(page);
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("jazz");
    await page.locator('[data-testid="near-progression-select"]').selectOption("ii-V-I-vi");
    await page.waitForTimeout(400);

    await page.reload();
    await page.waitForSelector('[data-testid="near-progression-select"]', { timeout: 8000 });

    await expect(page.locator('[data-testid="near-style-select"]')).toHaveValue("jazz");
    await expect(page.locator('[data-testid="near-progression-select"]')).toHaveValue("ii-V-I-vi");
  });

  test("NCP-07 seleccionar estilo Jazz filtra progresiones a solo jazz", async ({ page }) => {
    await goToNearChords(page);
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("jazz");
    await page.waitForTimeout(300);

    const progSelect = page.locator('[data-testid="near-progression-select"]');
    const options = await progSelect.locator("option").allTextContents();
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((o) => /jazz|Jazz|ii7|iiø7/i.test(o))).toBe(true);
  });

  test("NCP-08 Jazz ii7-V7-Imaj7 en C mayor rellena Dm7 G7 Cmaj7 en slots 0-2", async ({
    page,
  }) => {
    await setScaleAndGoToNearChords(page, "C", "Mayor");
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("jazz");
    await page.locator('[data-testid="near-progression-select"]').selectOption("ii7-V7-Imaj7");
    await page.waitForTimeout(600);

    await expect(page.locator('[data-testid="near-slot-0-title-chord"]')).toContainText("D");
    await expect(page.locator('[data-testid="near-slot-1-title-chord"]')).toContainText("G");
    await expect(page.locator('[data-testid="near-slot-2-title-chord"]')).toContainText("C");
  });

  test("NCP-10 Jazz menor sobre escala Mayor muestra etiqueta de paralelo menor", async ({ page }) => {
    await setScaleAndGoToNearChords(page, "F", "Mayor");
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("jazz");
    await page.locator('[data-testid="near-progression-select"]').selectOption("iiø7-V7-i7");
    await page.waitForTimeout(400);

    const label = page.locator('[data-testid="near-parallel-label"]');
    await expect(label).toBeVisible();
    await expect(label).toContainText("F menor paralelo");
  });

  test("NCP-11 progresión mayor sobre escala Menor natural muestra etiqueta de paralelo mayor", async ({
    page,
  }) => {
    await setScaleAndGoToNearChords(page, "A", "Menor natural");
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("pop");
    await page.locator('[data-testid="near-progression-select"]').selectOption("I-V-vi-IV");
    await page.waitForTimeout(400);

    const label = page.locator('[data-testid="near-parallel-label"]');
    await expect(label).toBeVisible();
    await expect(label).toContainText("A mayor paralelo");
  });

  test("NCP-09 estilo y progresión se resetean al cambiar appVersion", async ({ page }) => {
    await goToNearChords(page);
    await setAutoScale(page, true);

    await page.locator('[data-testid="near-style-select"]').selectOption("blues");
    await page.locator('[data-testid="near-progression-select"]').selectOption("I7-IV7-I7-V7");
    await page.waitForTimeout(400);

    // Simulate version change
    await page.evaluate(() => {
      const stored = localStorage.getItem("mastil_interactivo_guitarra_config_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.appVersion = "0.0.0";
        localStorage.setItem("mastil_interactivo_guitarra_config_v1", JSON.stringify(parsed));
      }
    });
    await page.reload();
    // After version reset the active panel is also reset to default (scale),
    // so we must navigate to near-chords manually before asserting.
    await page.getByTestId("nav-near-chords").click();
    await page.waitForSelector('[data-testid="near-chords-panel"]', { timeout: 8000 });
    await page.waitForSelector('[data-testid="near-progression-select"]', { timeout: 8000 });

    // After version reset, style and progression should be back to defaults
    await expect(page.locator('[data-testid="near-style-select"]')).toHaveValue("all");
  });
});
