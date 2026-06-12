/**
 * E2E — Color del acorde visible en tarjeta compacta móvil (Acordes cercanos).
 *
 * NCP-MOB-VISIBLE   el swatch es visible en la tarjeta sin abrir el modal
 * NCP-MOB-NO-MODAL  el swatch es accesible sin pulsar el botón de edición (ChevronRight)
 * NCP-MOB-OPEN      pulsar el swatch abre el popover de color
 * NCP-MOB-CHANGE    aceptar el nuevo color actualiza el swatch de la tarjeta
 * NCP-MOB-ALL-SLOTS cada slot activo muestra su propio swatch de color
 * NCP-MOB-DESKTOP   en desktop el swatch sigue visible y funcionando (no regresión)
 */

import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function gotoNearChordsMobile(page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("mobile-nav-nearChords").click();
  await expect(async () => {
    await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  }).toPass({ timeout: 4000 });
  await page.waitForTimeout(300);
}

async function gotoNearChordsDesktop(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.waitForTimeout(300);
}

// ── NCP-MOB-VISIBLE ───────────────────────────────────────────────────────────
test("NCP-MOB-VISIBLE: el swatch de color del slot 0 es visible en la tarjeta móvil sin abrir el modal", async ({ page }) => {
  await gotoNearChordsMobile(page);

  // El swatch debe estar en el DOM y ser visible sin ningún clic extra.
  const swatch = page.getByTestId("near-slot-0-bg-color-swatch");
  await expect(swatch).toBeVisible();

  // El modal de edición NO está abierto (no se tocó el botón ChevronRight).
  await expect(page.locator("text=Editar Acorde 1")).toHaveCount(0);
});

// ── NCP-MOB-NO-MODAL ──────────────────────────────────────────────────────────
test("NCP-MOB-NO-MODAL: el swatch es accesible sin abrir el modal de edición", async ({ page }) => {
  await gotoNearChordsMobile(page);

  // El modal NO está abierto.
  await expect(page.locator("[aria-label='Cerrar edición de acorde cercano']")).toHaveCount(0);

  // El swatch es visible directamente.
  await expect(page.getByTestId("near-slot-0-bg-color-swatch")).toBeVisible();
});

// ── NCP-MOB-OPEN ──────────────────────────────────────────────────────────────
test("NCP-MOB-OPEN: pulsar el swatch en móvil abre el popover de color", async ({ page }) => {
  await gotoNearChordsMobile(page);

  await page.getByTestId("near-slot-0-bg-color-swatch").click();

  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toBeVisible();
  await expect(page.getByTestId("near-slot-0-bg-color-sv-picker")).toBeVisible();
  await expect(page.getByTestId("near-slot-0-bg-color-hue-bar")).toBeVisible();
});

// ── NCP-MOB-CHANGE ────────────────────────────────────────────────────────────
test("NCP-MOB-CHANGE: aceptar un nuevo color en móvil actualiza el swatch de la tarjeta", async ({ page }) => {
  await gotoNearChordsMobile(page);

  // Abre el popover y elige un color nuevo.
  await page.getByTestId("near-slot-0-bg-color-swatch").click();
  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toBeVisible();

  await page.getByTestId("near-slot-0-bg-color-hex").fill("#0072B2");
  await page.getByTestId("near-slot-0-bg-color-accept").click();

  // El popover se cierra.
  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toHaveCount(0);

  // El swatch refleja el color aceptado.
  const swatchBg = await page.getByTestId("near-slot-0-bg-color-swatch")
    .evaluate((el) => el.style.backgroundColor);
  expect(swatchBg).toMatch(/rgb\(0,\s*114,\s*178\)/);
});

// ── NCP-MOB-ALL-SLOTS ─────────────────────────────────────────────────────────
test("NCP-MOB-ALL-SLOTS: activar un slot desactivado hace visible su swatch de color", async ({ page }) => {
  await gotoNearChordsMobile(page);

  // Slot 1 está desactivado por defecto: su cuerpo está colapsado, sin swatch.
  await expect(page.getByTestId("near-slot-1-bg-color-swatch")).toHaveCount(0);

  // Activar slot 1 mediante el checkbox "Activo" en su cabecera.
  await page.getByTestId("near-slot-1")
    .locator("label:has-text('Activo') input[type='checkbox']")
    .check();

  // Ahora el swatch del slot 1 es visible sin abrir el modal.
  await expect(page.getByTestId("near-slot-1-bg-color-swatch")).toBeVisible();
});

// ── NCP-MOB-DESKTOP ───────────────────────────────────────────────────────────
test("NCP-MOB-DESKTOP: el swatch de color en desktop sigue visible y abriéndose correctamente", async ({ page }) => {
  await gotoNearChordsDesktop(page);

  // Swatch visible en la cabecera del slot desktop.
  await expect(page.getByTestId("near-slot-0-bg-color-swatch").first()).toBeVisible();

  // Un clic abre el popover.
  await page.getByTestId("near-slot-0-bg-color-swatch").first().click();
  await expect(page.getByTestId("near-slot-0-bg-color-popover")).toBeVisible();
});
