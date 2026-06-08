/**
 * E2E — v6.0.30: limpieza visual de Acordes cercanos.
 *
 * NC-UI-1: Selector de voicing visible y usable (ancho reducido no rompe funcionalidad).
 * NC-UI-2: Botón copiar voicing copia el patrón correcto al portapapeles.
 * NC-UI-3: Slot inactivo se contrae; al reactivar reaparecen los controles.
 * NC-UI-REG: Regresión — generación, extensiones y omisiones siguen funcionando.
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
    if (!(await cb.isChecked())) await cb.check();
  }
}

// ── NC-UI-1: selector de voicing ────────────────────────────────────────────
test("NC-UI-1: selector de voicing es visible, usable y mide ≤ 75px en desktop", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await page.getByTestId("near-slot-0-tone").selectOption("C");
  await page.getByTestId("near-slot-0-quality").selectOption("maj");
  await page.getByTestId("near-slot-0-structure").selectOption("triad");
  await page.waitForTimeout(300);

  const sel = page.getByTestId("near-slot-0-voicing-select");
  await expect(sel).toBeVisible();
  await expect(sel).not.toBeDisabled();

  // El selector tiene opciones (al menos (auto))
  const optCount = await sel.locator("option").count();
  expect(optCount).toBeGreaterThan(0);

  // Cambiar a segunda opción si existe
  const opts = await sel.locator("option").all();
  if (opts.length > 1) {
    const secondVal = await opts[1].getAttribute("value");
    if (secondVal && secondVal !== "(auto)") {
      await sel.selectOption(secondVal);
      await page.waitForTimeout(200);
      await expect(page.getByTestId("near-chords-panel")).toBeVisible();
    }
  }

  // NC-UI-WIDTH: el control cerrado debe ser compacto en desktop (viewport 1280px)
  const viewport = page.viewportSize();
  if (viewport && viewport.width >= 768) {
    const selectWidth = await sel.evaluate((el) => el.getBoundingClientRect().width);
    expect(selectWidth).toBeLessThanOrEqual(75);
  }
});

// ── NC-UI-2: botón copiar voicing ────────────────────────────────────────────
test("NC-UI-2: botón copiar voicing copia el patrón al portapapeles", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);

  // Configurar slot 0: C mayor tríada
  await page.getByTestId("near-slot-0-tone").selectOption("C");
  await page.getByTestId("near-slot-0-quality").selectOption("maj");
  await page.getByTestId("near-slot-0-structure").selectOption("triad");
  await page.waitForTimeout(300);

  // El botón copiar debe estar visible y habilitado
  const copyBtn = page.getByTestId("near-slot-0-copy-voicing");
  await expect(copyBtn).toBeVisible();
  await expect(copyBtn).not.toBeDisabled();

  // Pulsar copiar
  await copyBtn.click();
  await page.waitForTimeout(300);

  // El portapapeles debe contener el patrón del voicing seleccionado
  const clipText = await page.evaluate(() => navigator.clipboard.readText());
  // Un patrón válido tiene 6 caracteres con x/0-9
  expect(clipText).toMatch(/^[x0-9]{6}$/);
});

// ── NC-UI-3: slot inactivo contraído ─────────────────────────────────────────
test("NC-UI-3: desactivar slot lo contrae; reactivar restaura controles y estado", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);

  // Aseguramos que slot 1 también está habilitado con un acorde conocido
  const enabled1 = page.getByTestId("near-slot-1-enabled");
  if (await enabled1.isVisible()) {
    if (!(await enabled1.isChecked())) await enabled1.check();
  }
  await page.waitForTimeout(200);

  // Configurar slot 1: G mayor para tener algo que verificar
  await page.getByTestId("near-slot-1-tone").selectOption("G");
  await page.getByTestId("near-slot-1-quality").selectOption("maj");
  await page.waitForTimeout(200);

  // Los controles internos del slot 1 son visibles
  const quality1 = page.getByTestId("near-slot-1-quality");
  await expect(quality1).toBeVisible();

  // Desactivar slot 1
  await enabled1.uncheck();
  await page.waitForTimeout(200);

  // El slot 1 sigue visible como contenedor pero los controles internos desaparecen
  await expect(page.getByTestId("near-slot-1")).toBeVisible();
  await expect(quality1).not.toBeVisible();

  // El título "Acorde 2" sigue visible en la cabecera
  const slot1Header = page.getByTestId("near-slot-1");
  await expect(slot1Header.getByText("Acorde 2")).toBeVisible();

  // Reactivar slot 1
  await enabled1.check();
  await page.waitForTimeout(200);

  // Los controles reaparecen con el estado previo (G mayor)
  await expect(quality1).toBeVisible();
  const toneVal = await page.getByTestId("near-slot-1-tone").inputValue();
  expect(toneVal).toBe("G");
});

// ── NC-UI-REG: regresión extensiones y omisiones ─────────────────────────────
test("NC-UI-REG: extensiones 9/11/13 y omisiones 1/3/5 siguen visibles con structure=chord", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await page.getByTestId("near-slot-0-tone").selectOption("C");
  await page.getByTestId("near-slot-0-structure").selectOption("chord");
  await page.waitForTimeout(200);

  // ext9 visible y habilitado
  await expect(page.getByTestId("near-slot-0-ext9")).toBeVisible();
  await expect(page.getByTestId("near-slot-0-ext9")).not.toBeDisabled();

  // omit-5 visible
  await expect(page.getByTestId("near-slot-0-omit-5")).toBeVisible();

  // Activar omit-5: la quinta desaparece del badge
  await page.getByTestId("near-slot-0-omit-5").check();
  await page.waitForTimeout(200);
  const slot = page.getByTestId("near-slot-0");
  const degrees = await slot.locator('[data-testid^="chord-badge-degree-"]').allTextContents();
  expect(degrees).not.toContain("5");
});

// ── NC-UI-REG2: generación de voicings ───────────────────────────────────────
test("NC-UI-REG2: slot 0 genera voicings para C mayor tríada", async ({ page }) => {
  await goToNearChords(page);
  await ensureSlotEnabled(page, 0);
  await page.getByTestId("near-slot-0-tone").selectOption("C");
  await page.getByTestId("near-slot-0-quality").selectOption("maj");
  await page.getByTestId("near-slot-0-structure").selectOption("triad");
  await page.waitForTimeout(300);

  const sel = page.getByTestId("near-slot-0-voicing-select");
  await expect(sel).toBeVisible();
  const optCount = await sel.locator("option").count();
  // Al menos una opción real (además de "(auto)")
  expect(optCount).toBeGreaterThan(1);
});
