/**
 * E2E — chordKeepZone: "Mantener zona anterior"
 *
 * Verifica que el toggle controla si la selección automática de voicing
 * usa continuidad física (true) o ranking guitarístico canónico (false).
 *
 * KZ-1 — Regresión: valor por defecto true, toggle visible y marcado
 * KZ-2 — D abierto: con keepZone=false, D usa xx0232 (bajo raíz preferido)
 * KZ-3 — Persistencia: el valor false sobrevive a recarga de página
 * KZ-4 — F sin cuerdas al aire: keepZone=false muestra 133211 (más cuerdas sonando)
 * KZ-5 — keepZone=true: conserva continuidad física, no salta a voicing canónico
 */

import { test, expect } from "@playwright/test";

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function setChordStructure(page, tone, quality, structure) {
  await page.getByTestId("select-tone").selectOption(tone);
  await page.getByTestId("select-quality").selectOption(quality);
  await page.getByTestId("select-structure").selectOption(structure);
}

async function waitForVoicings(page) {
  await expect
    .poll(() => page.getByTestId("voicing-select").locator("option").count(), { timeout: 8000 })
    .toBeGreaterThan(0);
}

async function setCheckbox(page, testId, wantChecked) {
  const el = page.getByTestId(testId);
  await el.evaluate((input, want) => {
    if (input.checked !== want) input.click();
  }, wantChecked);
}

// ── KZ-1 ─────────────────────────────────────────────────────────────────────
test("KZ-1. chordKeepZone: el toggle 'Mantener zona anterior' aparece marcado por defecto en modo Acorde", async ({ page }) => {
  await goToChords(page);
  await setChordStructure(page, "C", "maj", "chord");

  const toggle = page.getByTestId("toggle-keep-zone");
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await expect(toggle).toBeChecked();
});

// ── KZ-2 ─────────────────────────────────────────────────────────────────────
test("KZ-2. chordKeepZone=false: D mayor con cuerdas al aire selecciona xx0232 (bajo raíz)", async ({ page }) => {
  // El selector guitarístico prefiere bajo raíz antes que bajo tercera.
  // xx0232 tiene bajo D (raíz), 2002x2 tiene bajo F# (tercera).
  // Con keepZone=false se usa el selector guitarístico, NO el físicamente más cercano.
  await goToChords(page);

  // C mayor chord + cuerdas al aire ON
  await setChordStructure(page, "C", "maj", "chord");
  await setCheckbox(page, "toggle-allow-open-strings", true);
  await waitForVoicings(page);

  // Seleccionar el último voicing (zona alta) → lastChordVoicingRef apunta a zona alta
  const count = await page.getByTestId("voicing-select").locator("option").count();
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  const highFretVoicing = await page.getByTestId("active-voicing-pattern").textContent();
  await page.waitForTimeout(200);

  // Desactivar Mantener zona anterior
  await setCheckbox(page, "toggle-keep-zone", false);

  // Cambiar a D mayor
  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  // Con keepZone=false el selector guitarístico elige xx0232 (bajo raíz)
  const dVoicing = await page.getByTestId("active-voicing-pattern").textContent();
  expect(dVoicing).not.toBe(highFretVoicing);
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0232");
});

// ── KZ-3 ─────────────────────────────────────────────────────────────────────
test("KZ-3. chordKeepZone persiste: el valor false sobrevive a recarga de página", async ({ page }) => {
  await goToChords(page);
  await setChordStructure(page, "C", "maj", "chord");

  // Desactivar y verificar
  const toggle = page.getByTestId("toggle-keep-zone");
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await setCheckbox(page, "toggle-keep-zone", false);
  await expect(toggle).not.toBeChecked();

  // Recargar
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
  await setChordStructure(page, "C", "maj", "chord");

  await expect(page.getByTestId("toggle-keep-zone")).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();
});

// ── KZ-4 ─────────────────────────────────────────────────────────────────────
test("KZ-4. chordKeepZone=false sin cuerdas al aire: F mayor usa 133211 (más cuerdas sonando)", async ({ page }) => {
  // El selector guitarístico prefiere más cuerdas sonando.
  // 133211 (barre, 6 cuerdas) gana sobre 13x2xx (3 cuerdas).
  // Ambos tienen bajo raíz (F en cuerda 6, traste 1), empatan en minFret/span,
  // pero 133211 tiene más cuerdas sonando → gana en criterio 4.
  await goToChords(page);

  // Asegurar cuerdas al aire desactivadas
  await setCheckbox(page, "toggle-allow-open-strings", false);
  await setChordStructure(page, "C", "maj", "chord");
  await waitForVoicings(page);
  await expect
    .poll(async () => {
      const options = await page.getByTestId("voicing-select").locator("option").allTextContents();
      return options.some((text) => text.includes("13x2xx")) ? "stale-f" : "c-ready";
    }, { timeout: 8000 })
    .toBe("c-ready");

  const cCount = await page.getByTestId("voicing-select").locator("option").count();
  await page.getByTestId("voicing-select").selectOption({ index: cCount - 1 });
  await page.waitForTimeout(200);

  // Desactivar Mantener zona anterior antes de cambiar de acorde para probar la rama 3.
  await setCheckbox(page, "toggle-keep-zone", false);
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();

  // F mayor, estructura Acorde
  await page.getByTestId("select-tone").selectOption("F");
  await page.getByTestId("select-quality").selectOption("maj");
  await page.getByTestId("select-structure").selectOption("chord");

  await waitForVoicings(page);
  await page.waitForTimeout(300);

  // El selector guitarístico elige 133211 (barre completo, más cuerdas)
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("133211");
});

// ── KZ-5 ─────────────────────────────────────────────────────────────────────
test("KZ-5. chordKeepZone=true: conserva continuidad física, no salta al voicing canónico", async ({ page }) => {
  // Con keepZone=true, al cambiar de acorde se busca el voicing físicamente más cercano,
  // NO el canónico. Si estamos en zona alta de C mayor y pasamos a D mayor,
  // el resultado NO debe ser xx0232 (el canónico abierto de D).
  await goToChords(page);

  // C mayor chord + cuerdas al aire ON + keepZone=true (valor por defecto)
  await setChordStructure(page, "C", "maj", "chord");
  await setCheckbox(page, "toggle-allow-open-strings", true);
  await waitForVoicings(page);

  // Seleccionar el último voicing (zona alta)
  const count = await page.getByTestId("voicing-select").locator("option").count();
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  await page.waitForTimeout(200);

  // NO cambiar keepZone (queda en true por defecto)
  await expect(page.getByTestId("toggle-keep-zone")).toBeChecked();

  // Cambiar a D mayor
  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  // Con keepZone=true NO debe saltar al canónico abierto xx0232
  await expect(page.getByTestId("active-voicing-pattern")).not.toHaveText("xx0232");
});
