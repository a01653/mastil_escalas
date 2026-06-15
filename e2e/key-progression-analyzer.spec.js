/**
 * E2E — Analizador de tonalidad / progresión
 *
 * Tests:
 *   KA-COLLAPSED     tarjeta aparece plegada por defecto
 *   KA-EXPAND        se puede desplegar
 *   KA-ANALYZE       F# | Bm | A/E | D/F# → aparece "B menor"
 *   KA-DOMINANT      aparece explicación "dominante de Bm"
 *   KA-NEAR-OK       Acordes cercanos sigue funcionando
 *   KA-STRICT-LABEL  etiqueta "Tonalidades diatónicas estrictas" visible en Acordes cercanos
 */

import { test, expect } from "@playwright/test";

async function goToNearChords(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("key-analyzer")).toBeVisible();
  await page.waitForTimeout(300);
}

// ── KA-COLLAPSED ──────────────────────────────────────────────────────────────
test("KA-COLLAPSED: tarjeta aparece plegada por defecto", async ({ page }) => {
  await goToNearChords(page);
  await expect(page.getByTestId("key-analyzer")).toBeVisible();
  await expect(page.getByTestId("key-analyzer-input")).not.toBeVisible();
  await expect(page.getByTestId("key-analyzer-btn")).not.toBeVisible();
});

// ── KA-EXPAND ─────────────────────────────────────────────────────────────────
test("KA-EXPAND: al hacer clic en la cabecera se despliega", async ({ page }) => {
  await goToNearChords(page);
  await page.getByTestId("key-analyzer-toggle").click();
  await expect(page.getByTestId("key-analyzer-input")).toBeVisible();
  await expect(page.getByTestId("key-analyzer-btn")).toBeVisible();
});

// ── KA-ANALYZE ────────────────────────────────────────────────────────────────
test("KA-ANALYZE: F# | Bm | A/E | D/F# → B menor aparece en el resultado", async ({ page }) => {
  await goToNearChords(page);
  await page.getByTestId("key-analyzer-toggle").click();
  await page.getByTestId("key-analyzer-input").fill("F# | Bm | A/E | D/F#");
  await page.getByTestId("key-analyzer-btn").click();
  const result = page.getByTestId("key-analyzer-result");
  await expect(result).toBeVisible();
  await expect(result).toContainText("B menor");
});

// ── KA-DOMINANT ───────────────────────────────────────────────────────────────
test("KA-DOMINANT: F# se muestra como dominante de Bm", async ({ page }) => {
  await goToNearChords(page);
  await page.getByTestId("key-analyzer-toggle").click();
  await page.getByTestId("key-analyzer-input").fill("F# | Bm | A/E | D/F#");
  await page.getByTestId("key-analyzer-btn").click();
  await expect(page.getByTestId("key-analyzer-result")).toContainText("dominante de Bm");
});

// ── KA-NEAR-OK ────────────────────────────────────────────────────────────────
test("KA-NEAR-OK: Acordes cercanos sigue visible y funcional", async ({ page }) => {
  await goToNearChords(page);
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  // El analizador aparece encima del panel
  const analyzerBox = await page.getByTestId("key-analyzer").boundingBox();
  const panelBox = await page.getByTestId("near-chords-panel").boundingBox();
  if (analyzerBox && panelBox) {
    expect(analyzerBox.y).toBeLessThan(panelBox.y);
  }
});

// ── KA-STRICT-LABEL ───────────────────────────────────────────────────────────
test("KA-STRICT-LABEL: etiqueta de tonalidades diatónicas estrictas visible en Acordes cercanos", async ({
  page,
}) => {
  await goToNearChords(page);
  await expect(page.getByTestId("near-chords-panel")).toContainText(
    "Tonalidades diatónicas estrictas"
  );
});
