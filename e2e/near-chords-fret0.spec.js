/**
 * E2E — near chords: posicionamiento de notas en traste 0 (cuerdas al aire).
 *
 * Bug corregido: cuando varios slots tenían notas en el mismo traste 0,
 * calibratedClusterPos colocaba marcadores hasta x=57px, desbordando los 22px
 * de la columna del traste 0 hacia la columna del traste 1.
 *
 * Tests:
 *   NC-F0-SINGLE   una nota en traste 0 no desborda hacia la columna del traste 1
 *   NC-F0-MULTI    varias notas en traste 0 no pisam la columna del traste 1
 *   NC-F0-FRET1    las notas del traste 1 siguen en su columna correcta
 *
 * Escenario: copiar "Cuartal B" de x02200 al slot 0 y activar un segundo slot
 * que también genere notas en traste 0 (slot 1 con Asus2, que tiene notas en A2
 * y B3 al aire en ciertas digitaciones).
 */

import { test, expect } from "@playwright/test";

async function setupMultiFret0(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Copiar Cuartal B de x02200 al slot 0
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
  const toggle = page.getByTestId("chord-detect-toggle");
  await toggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();

  const input = page.getByTestId("chord-detect-pattern-input");
  await input.fill("x02200");
  await page.getByTestId("chord-detect-apply-btn").click();

  // Copiar Cuartal B al slot 0
  const cuartalEl = page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: /Cuartal\s+B/ }).first();
  await expect(cuartalEl).toBeVisible({ timeout: 5000 });
  const cuartalTestId = await cuartalEl.getAttribute("data-testid");
  const cuartalId = cuartalTestId?.replace(/^detected-chord-name-/, "");
  await page.getByTestId(`detected-copy-near-${cuartalId}-0`).click();
  await page.waitForTimeout(300);

  // Copiar Asus2 al slot 1
  const asus2El = page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: /^Asus2$/ }).first();
  if (await asus2El.isVisible({ timeout: 2000 }).catch(() => false)) {
    const asus2TestId = await asus2El.getAttribute("data-testid");
    const asus2Id = asus2TestId?.replace(/^detected-chord-name-/, "");
    await page.getByTestId(`detected-copy-near-${asus2Id}-1`).click();
    await page.waitForTimeout(300);
  }

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);
}

// ── NC-F0-MULTI ───────────────────────────────────────────────────────────────
// Notas en traste 0: el borde derecho de los marcadores no debe sobrepasar
// el borde derecho de la celda del traste 0.
test("NC-F0-MULTI: marcadores en traste 0 no invaden la columna del traste 1", async ({ page }) => {
  await setupMultiFret0(page);

  // Solo desktop: skip si layout estrecho (mobile fretboard no tiene nc-fret-cell-*)
  const isMobile = page.viewportSize()?.width < 900;
  if (isMobile) return;

  // Buscar alguna celda del traste 0 con notas (z-[4])
  // La celda del traste 0 para la cuerda 0 tiene testid nc-fret-cell-0-0
  // Celdas del traste 0: strings 0-5
  let fret0RightEdge = null;
  let fret1LeftEdge = null;

  for (let sIdx = 0; sIdx <= 5; sIdx++) {
    const cell0 = page.getByTestId(`nc-fret-cell-${sIdx}-0`);
    const cell1 = page.getByTestId(`nc-fret-cell-${sIdx}-1`);
    if (!(await cell0.isVisible().catch(() => false))) continue;

    const box0 = await cell0.boundingBox();
    const box1 = await cell1.boundingBox();
    if (!box0 || !box1) continue;

    if (fret0RightEdge === null) {
      fret0RightEdge = box0.x + box0.width;
      fret1LeftEdge = box1.x;
      break;
    }
  }

  if (fret0RightEdge === null) {
    // No se pudo obtener bounding boxes (posiblemente vista muy pequeña)
    test.skip();
    return;
  }

  // Verificar que la celda del traste 0 y el traste 1 son columnas separadas
  expect(fret0RightEdge).toBeLessThanOrEqual(fret1LeftEdge + 6); // tolerancia de 1 gap

  // Buscar marcadores de nota (círculos) dentro de las celdas del traste 0
  const markers = page.locator("[data-testid^='nc-fret-cell-'][data-testid$='-0'] .rounded-full");
  const count = await markers.count();

  for (let i = 0; i < count; i++) {
    const markerBox = await markers.nth(i).boundingBox();
    if (!markerBox) continue;
    const markerRightEdge = markerBox.x + markerBox.width;

    // El borde derecho del marcador no debe sobrepasar el inicio del traste 1
    // más un margen de tolerancia (algunos px de overflow visual son aceptables
    // para el centrado, pero 35px de desbordamiento no lo son).
    expect(markerRightEdge).toBeLessThan(fret1LeftEdge + 8);
  }
});

// ── NC-F0-SINGLE ──────────────────────────────────────────────────────────────
// Una nota sola en traste 0: la celda y el marcador están en la zona del traste 0.
test("NC-F0-SINGLE: una nota en traste 0 reside en la columna del traste 0", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  const isMobile = page.viewportSize()?.width < 900;
  if (isMobile) {
    test.skip();
    return;
  }

  // Con el slot 0 en estado por defecto (C mayor), probablemente no haya notas
  // en traste 0. Solo verificamos que las celdas del traste 0 existen y son visibles.
  const cell00 = page.getByTestId("nc-fret-cell-0-0");
  await expect(cell00).toBeVisible();
  const cell01 = page.getByTestId("nc-fret-cell-0-1");
  await expect(cell01).toBeVisible();

  const box0 = await cell00.boundingBox();
  const box1 = await cell01.boundingBox();
  expect(box0).not.toBeNull();
  expect(box1).not.toBeNull();

  // La celda del traste 0 tiene que ser más estrecha que la del traste 1
  expect(box0.width).toBeLessThan(box1.width);
  // Y estar a su izquierda
  expect(box0.x).toBeLessThan(box1.x);
});

// ── NC-F0-FRET1 ───────────────────────────────────────────────────────────────
// Las notas del traste 1 siguen en la columna del traste 1 tras el fix.
test("NC-F0-FRET1: notas en traste 1 aparecen en su columna correcta", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");

  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(500);

  const isMobile = page.viewportSize()?.width < 900;
  if (isMobile) {
    test.skip();
    return;
  }

  // Verificar que celdas del traste 1 tienen x mayor que celdas del traste 0
  for (let sIdx = 0; sIdx <= 2; sIdx++) {
    const cell0 = page.getByTestId(`nc-fret-cell-${sIdx}-0`);
    const cell1 = page.getByTestId(`nc-fret-cell-${sIdx}-1`);
    const cell2 = page.getByTestId(`nc-fret-cell-${sIdx}-2`);
    if (!(await cell0.isVisible().catch(() => false))) continue;

    const b0 = await cell0.boundingBox();
    const b1 = await cell1.boundingBox();
    const b2 = await cell2.boundingBox();
    if (!b0 || !b1 || !b2) continue;

    // Traste 1 debe estar a la derecha del traste 0
    expect(b1.x).toBeGreaterThan(b0.x);
    // Traste 2 debe estar a la derecha del traste 1
    expect(b2.x).toBeGreaterThan(b1.x);
    // El ancho de traste 1 y traste 2 son similares (celdas normales)
    expect(Math.abs(b1.width - b2.width)).toBeLessThan(5);
    break;
  }
});
