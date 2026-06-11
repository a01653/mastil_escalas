/**
 * E2E — ColorPickerPopover (selector propio) en Acordes cercanos.
 *
 * NCP-NO-HEX-INLINE    campo hex NO aparece fijo en la fila
 * NCP-NO-NATIVE        NO hay input[type=color] nativo en el DOM
 * NCP-OPEN-POPOVER     un solo clic abre el popover con SV picker + hue bar ya visibles
 * NCP-SINGLE-CLICK     el selector completo está disponible sin segundo clic
 * NCP-HEX-PREVIEW      escribir HEX actualiza el preview dentro del popover
 * NCP-NORMALIZE        "0072B2" normaliza a "#0072B2" al hacer blur
 * NCP-ACCEPT           Aceptar aplica el color y cierra el popover
 * NCP-CANCEL           Cancelar descarta el cambio y restaura el color original
 * NCP-ESCAPE           Escape descarta el cambio y cierra el popover
 * NCP-PERSIST          el color solo persiste si se aceptó (no si se canceló)
 */

import { test, expect } from "@playwright/test";

async function gotoNearChords(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(300);
}

// ── NCP-NO-HEX-INLINE ─────────────────────────────────────────────────────────
test("NCP-NO-HEX-INLINE: el campo hex NO está visible fijo en la fila", async ({ page }) => {
  await gotoNearChords(page);
  await expect(page.getByTestId("near-slot-0-bg-color-swatch").first()).toBeVisible();
  await expect(page.getByTestId("near-slot-0-bg-color-hex")).toHaveCount(0);
});

// ── NCP-NO-NATIVE ─────────────────────────────────────────────────────────────
test("NCP-NO-NATIVE: no hay input[type=color] nativo visible al abrir el popover", async ({ page }) => {
  await gotoNearChords(page);
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toBeVisible();
  // No native color picker should be in the DOM
  const nativePicker = page.locator("input[type='color']");
  await expect(nativePicker).toHaveCount(0);
});

// ── NCP-OPEN-POPOVER ──────────────────────────────────────────────────────────
test("NCP-OPEN-POPOVER: un solo clic abre el popover con SV picker y hue bar ya visibles", async ({ page }) => {
  await gotoNearChords(page);
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toBeVisible();
  await expect(page.getByTestId("near-slot-0-bg-color-sv-picker")).toBeVisible();
  await expect(page.getByTestId("near-slot-0-bg-color-hue-bar")).toBeVisible();
  await expect(page.getByTestId("near-slot-0-bg-color-hex")).toBeVisible();
});

// ── NCP-SINGLE-CLICK ──────────────────────────────────────────────────────────
test("NCP-SINGLE-CLICK: selector visual disponible sin segundo clic", async ({ page }) => {
  await gotoNearChords(page);
  // Only one click — SV picker must be immediately visible, no second click needed
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  // Both picker elements are present immediately after the single click
  const svPicker = page.getByTestId("near-slot-0-bg-color-sv-picker");
  const hueBar = page.getByTestId("near-slot-0-bg-color-hue-bar");
  await expect(svPicker).toBeVisible();
  await expect(hueBar).toBeVisible();
});

// ── NCP-HEX-PREVIEW ───────────────────────────────────────────────────────────
test("NCP-HEX-PREVIEW: escribir HEX actualiza el preview sin aplicar el color", async ({ page }) => {
  await gotoNearChords(page);
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();

  const hexInput = page.getByTestId("near-slot-0-bg-color-hex");
  await hexInput.fill("#0072B2");

  // Preview swatch inside popover reflects new color
  const previewBg = await page.getByTestId("near-slot-0-bg-color-preview")
    .evaluate((el) => el.style.backgroundColor);
  expect(previewBg).toMatch(/rgb\(0,\s*114,\s*178\)/);
});

// ── NCP-NORMALIZE ─────────────────────────────────────────────────────────────
test("NCP-NORMALIZE: escribir 0072B2 sin # normaliza a #0072B2 al hacer blur", async ({ page }) => {
  await gotoNearChords(page);
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();

  const hexInput = page.getByTestId("near-slot-0-bg-color-hex");
  await hexInput.fill("0072B2");
  await hexInput.press("Tab");

  await expect(page.getByTestId("near-slot-0-bg-color-hex")).toHaveValue("#0072B2");
});

// ── NCP-ACCEPT ────────────────────────────────────────────────────────────────
test("NCP-ACCEPT: Aceptar aplica el color y cierra el popover", async ({ page }) => {
  await gotoNearChords(page);
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();

  await page.getByTestId("near-slot-0-bg-color-hex").fill("#0072B2");
  await page.getByTestId("near-slot-0-bg-color-accept").click();

  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toHaveCount(0);

  const swatchBg = await page.getByTestId("near-slot-0-bg-color-swatch").first()
    .evaluate((el) => el.style.backgroundColor);
  expect(swatchBg).toMatch(/rgb\(0,\s*114,\s*178\)/);
});

// ── NCP-CANCEL ────────────────────────────────────────────────────────────────
test("NCP-CANCEL: Cancelar descarta el cambio y restaura el color original", async ({ page }) => {
  await gotoNearChords(page);

  const originalBg = await page.getByTestId("near-slot-0-bg-color-swatch").first()
    .evaluate((el) => el.style.backgroundColor);

  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  await page.getByTestId("near-slot-0-bg-color-hex").fill("#0072B2");
  await page.getByTestId("near-slot-0-bg-color-cancel").click();

  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toHaveCount(0);

  const newBg = await page.getByTestId("near-slot-0-bg-color-swatch").first()
    .evaluate((el) => el.style.backgroundColor);
  expect(newBg).toBe(originalBg);
});

// ── NCP-ESCAPE ────────────────────────────────────────────────────────────────
test("NCP-ESCAPE: Escape descarta el cambio y cierra el popover", async ({ page }) => {
  await gotoNearChords(page);

  const originalBg = await page.getByTestId("near-slot-0-bg-color-swatch").first()
    .evaluate((el) => el.style.backgroundColor);

  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  await page.getByTestId("near-slot-0-bg-color-hex").fill("#CC79A7");
  await page.keyboard.press("Escape");

  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toHaveCount(0);

  const newBg = await page.getByTestId("near-slot-0-bg-color-swatch").first()
    .evaluate((el) => el.style.backgroundColor);
  expect(newBg).toBe(originalBg);
});

// ── NCP-PERSIST ───────────────────────────────────────────────────────────────
test("NCP-PERSIST: el color persiste tras recargar (solo si se aceptó)", async ({ page }) => {
  await gotoNearChords(page);

  // Apply a color via Accept
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  await page.getByTestId("near-slot-0-bg-color-hex").fill("#CC79A7");
  await page.getByTestId("near-slot-0-bg-color-accept").click();
  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toHaveCount(0);
  await page.waitForTimeout(200);

  // Reload
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(300);

  const swatchBg = await page.getByTestId("near-slot-0-bg-color-swatch").first()
    .evaluate((el) => el.style.backgroundColor);
  expect(swatchBg).toMatch(/rgb\(204,\s*121,\s*167\)/);
});

// ── NCP-SCROLL-LOCK ───────────────────────────────────────────────────────────
test("NCP-SCROLL-LOCK: body.overflow=hidden mientras el popover está abierto, restaurado al cerrar", async ({ page }) => {
  await gotoNearChords(page);

  // Before opening: scroll is not locked
  const before = await page.evaluate(() => document.body.style.overflow);
  expect(before).not.toBe("hidden");

  // Open popover
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toBeVisible();

  // While open: body scroll is locked
  const locked = await page.evaluate(() => document.body.style.overflow);
  expect(locked).toBe("hidden");

  // Close with Cancelar
  await page.getByTestId("near-slot-0-bg-color-cancel").click();
  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toHaveCount(0);

  // After closing: scroll restored
  const afterCancel = await page.evaluate(() => document.body.style.overflow);
  expect(afterCancel).not.toBe("hidden");

  // Reopen and close with Aceptar
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  const locked2 = await page.evaluate(() => document.body.style.overflow);
  expect(locked2).toBe("hidden");
  await page.getByTestId("near-slot-0-bg-color-accept").click();
  const afterAccept = await page.evaluate(() => document.body.style.overflow);
  expect(afterAccept).not.toBe("hidden");

  // Reopen and close with Escape
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  const locked3 = await page.evaluate(() => document.body.style.overflow);
  expect(locked3).toBe("hidden");
  await page.keyboard.press("Escape");
  const afterEscape = await page.evaluate(() => document.body.style.overflow);
  expect(afterEscape).not.toBe("hidden");
});
