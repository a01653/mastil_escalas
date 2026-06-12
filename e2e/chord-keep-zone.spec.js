/**
 * E2E — chordKeepZone: "Mantener zona anterior"
 *
 * Verifica que el toggle controla si la selección automática de voicing
 * usa continuidad física (true) o ranking natural/índice 0 (false).
 *
 * Sección 1: Regresiones tertian clásicas
 * ─────────────────────────────────────────────────────────────────────────────
 * KZ-1 — Valor por defecto true, toggle visible y marcado
 * KZ-2 — D abierto: con keepZone=false, D usa xx0232 (bajo raíz preferido)
 * KZ-3 — Persistencia: el valor false sobrevive a recarga de página
 * KZ-4 — F sin cuerdas al aire: keepZone=false muestra 133211
 * KZ-5 — keepZone=true: conserva zona, NO salta a voicing canónico
 *
 * Sección 2: Nuevos tests de zona — 3 familias
 * ─────────────────────────────────────────────────────────────────────────────
 * KZ-T1 — Tertian ON: al cambiar raíz conserva zona física (no cae al índice 0)
 * KZ-T2 — Tertian OFF: al cambiar raíz usa índice 0 y no lo pisa después
 *
 * KZ-Q1 — Cuartal ON: al cambiar raíz conserva zona física (no cae al índice 0)
 * KZ-Q2 — Cuartal OFF: usa índice 0 y NO lo pisa después (test de estabilidad)
 *          ↑ Regresión crítica: detecta el bug "pinta uno y luego cambia a otro"
 *
 * KZ-G1 — Notas guía ON: al cambiar raíz conserva zona física (no cae al índice 0)
 * KZ-G2 — Notas guía OFF: usa índice 0 y NO lo pisa después (test de estabilidad)
 *
 * KZ-P1 — Persistencia: keepZone=false persiste al recargar en las 3 familias
 */

import { test, expect } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function switchToFamily(page, family) {
  const selects = await page.locator("select").all();
  for (const sel of selects) {
    const vals = await sel.locator("option").evaluateAll((opts) => opts.map((o) => o.value));
    if (vals.includes(family)) {
      await sel.selectOption(family);
      return;
    }
  }
  throw new Error(`No se encontró selector con opción '${family}'`);
}

async function getSelectedVoicingIndex(page) {
  return page.getByTestId("voicing-select").evaluate((sel) => sel.selectedIndex);
}

// ── Sección 1: Regresiones tertian clásicas ───────────────────────────────────

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
  await goToChords(page);

  await setChordStructure(page, "C", "maj", "chord");
  await setCheckbox(page, "toggle-allow-open-strings", true);
  await waitForVoicings(page);

  const count = await page.getByTestId("voicing-select").locator("option").count();
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  const highFretVoicing = await page.getByTestId("active-voicing-pattern").textContent();
  await page.waitForTimeout(200);

  await setCheckbox(page, "toggle-keep-zone", false);

  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  const dVoicing = await page.getByTestId("active-voicing-pattern").textContent();
  expect(dVoicing).not.toBe(highFretVoicing);
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0232");
});

// ── KZ-3 ─────────────────────────────────────────────────────────────────────
test("KZ-3. chordKeepZone persiste: el valor false sobrevive a recarga de página", async ({ page }) => {
  await goToChords(page);
  await setChordStructure(page, "C", "maj", "chord");

  const toggle = page.getByTestId("toggle-keep-zone");
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await setCheckbox(page, "toggle-keep-zone", false);
  await expect(toggle).not.toBeChecked();
  await page.waitForTimeout(300);

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
  await goToChords(page);

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

  await setCheckbox(page, "toggle-keep-zone", false);
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();

  await page.getByTestId("select-tone").selectOption("F");
  await page.getByTestId("select-quality").selectOption("maj");
  await page.getByTestId("select-structure").selectOption("chord");

  await waitForVoicings(page);
  await page.waitForTimeout(300);

  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("133211");
});

// ── KZ-5 ─────────────────────────────────────────────────────────────────────
test("KZ-5. chordKeepZone=true: conserva continuidad física, no salta al voicing canónico", async ({ page }) => {
  await goToChords(page);

  await setChordStructure(page, "C", "maj", "chord");
  await setCheckbox(page, "toggle-allow-open-strings", true);
  await waitForVoicings(page);

  const count = await page.getByTestId("voicing-select").locator("option").count();
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  await page.waitForTimeout(200);

  await expect(page.getByTestId("toggle-keep-zone")).toBeChecked();

  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  await expect(page.getByTestId("active-voicing-pattern")).not.toHaveText("xx0232");
});

// ── Sección 2: Tests de zona — 3 familias ─────────────────────────────────────

// ── KZ-T1 ────────────────────────────────────────────────────────────────────
// Usa C→D con cuerdas al aire porque sabemos que D natural = xx0232.
// Con keepZone=ON y ref en zona alta, NO debe aparecer xx0232.
test("KZ-T1. Tertian ON: al cambiar raíz conserva zona física (no cae al voicing canónico)", async ({ page }) => {
  await goToChords(page);
  await setChordStructure(page, "C", "maj", "chord");
  await setCheckbox(page, "toggle-allow-open-strings", true);
  await waitForVoicings(page);

  const count = await page.getByTestId("voicing-select").locator("option").count();
  if (count < 2) return;

  // Seleccionar el último voicing (zona alta)
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  const highZoneFrets = await page.getByTestId("active-voicing-pattern").textContent();
  await page.waitForTimeout(200);

  // keepZone=true (por defecto)
  await expect(page.getByTestId("toggle-keep-zone")).toBeChecked();

  // Cambiar a D mayor
  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  // Con keepZone=ON debe usar continuidad física: NO debe caer al canónico xx0232
  const result = await page.getByTestId("active-voicing-pattern").textContent();
  expect(result).not.toBe("xx0232");
  expect(result).not.toBe(highZoneFrets);

  // Estabilidad: el voicing no cambia después de un pequeño delay
  await page.waitForTimeout(500);
  const resultStable = await page.getByTestId("active-voicing-pattern").textContent();
  expect(resultStable).toBe(result);
});

// ── KZ-T2 ────────────────────────────────────────────────────────────────────
// Usa C→D con cuerdas al aire. D natural con keepZone=false = xx0232.
// Verifica que ese voicing se mantiene estable (no lo pisa ningún efecto posterior).
test("KZ-T2. Tertian OFF: usa el voicing natural y NO cambia después (estabilidad)", async ({ page }) => {
  await goToChords(page);
  await setChordStructure(page, "C", "maj", "chord");
  await setCheckbox(page, "toggle-allow-open-strings", true);
  await waitForVoicings(page);

  const count = await page.getByTestId("voicing-select").locator("option").count();
  if (count < 2) return;

  // Seleccionar el último voicing (zona alta) para establecer una ref física alta
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  await page.waitForTimeout(200);

  // Desactivar keepZone
  await setCheckbox(page, "toggle-keep-zone", false);
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();

  // Cambiar a D mayor
  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  // Debe ser el voicing natural de D (xx0232), no el voicing de zona alta
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0232");

  // Estabilidad: debe seguir siendo xx0232 después de un delay
  await page.waitForTimeout(500);
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0232");
});

// ── KZ-Q1 ────────────────────────────────────────────────────────────────────
test("KZ-Q1. Cuartal ON: al cambiar raíz conserva zona física (no cae al índice 0)", async ({ page }) => {
  await goToChords(page);
  await switchToFamily(page, "quartal");
  await waitForVoicings(page);

  const count = await page.getByTestId("voicing-select").locator("option").count();
  if (count < 3) return;

  // Seleccionar el último voicing (zona alta)
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  await page.waitForTimeout(300);

  // keepZone=true (por defecto)
  const toggle = page.getByTestId("toggle-keep-zone");
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await expect(toggle).toBeChecked();

  // Cambiar raíz
  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  const newCount = await page.getByTestId("voicing-select").locator("option").count();
  if (newCount < 2) return;

  // Con keepZone=true y ref en zona alta, NO debe caer al índice 0 (zona más baja)
  const selectedIdx = await getSelectedVoicingIndex(page);
  expect(selectedIdx).toBeGreaterThan(0);

  await expect(toggle).toBeChecked();
});

// ── KZ-Q2 ────────────────────────────────────────────────────────────────────
// Regresión crítica: detecta el bug "pinta uno y luego cambia a otro".
// El efecto de sync (E2) no debe pisar el índice 0 fijado por E1 cuando keepZone=false.
test("KZ-Q2. Cuartal OFF: usa índice 0 y NO lo pisa después (estabilidad)", async ({ page }) => {
  await goToChords(page);
  await switchToFamily(page, "quartal");
  await waitForVoicings(page);

  const count = await page.getByTestId("voicing-select").locator("option").count();
  if (count < 2) return;

  // Seleccionar el último voicing (zona alta) para establecer la ref física
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  await page.waitForTimeout(200);

  // Desactivar keepZone
  await setCheckbox(page, "toggle-keep-zone", false);
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();

  // Cambiar raíz
  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  // Verificación inmediata: debe ser índice 0
  const idx1 = await getSelectedVoicingIndex(page);
  expect(idx1).toBe(0);

  // Espera de estabilidad — el efecto de sync NO debe pisar el índice 0
  await page.waitForTimeout(500);
  const idx2 = await getSelectedVoicingIndex(page);
  expect(idx2).toBe(0);

  // Segunda verificación: cambiar raíz de nuevo con keepZone=false
  await page.getByTestId("select-tone").selectOption("E");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  const idx3 = await getSelectedVoicingIndex(page);
  expect(idx3).toBe(0);

  await page.waitForTimeout(500);
  const idx4 = await getSelectedVoicingIndex(page);
  expect(idx4).toBe(0);
});

// ── KZ-G1 ────────────────────────────────────────────────────────────────────
test("KZ-G1. Notas guía ON: al cambiar raíz conserva zona física (no cae al índice 0)", async ({ page }) => {
  await goToChords(page);
  await switchToFamily(page, "guide_tones");
  await waitForVoicings(page);

  // Seleccionar raíz A (zona alta en Amaj7)
  await page.getByTestId("select-tone").selectOption("A");
  await waitForVoicings(page);

  const count = await page.getByTestId("voicing-select").locator("option").count();
  if (count < 3) return;

  // Seleccionar el último voicing (zona alta)
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  await page.waitForTimeout(300);

  // keepZone=true (por defecto)
  const toggle = page.getByTestId("toggle-keep-zone");
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await expect(toggle).toBeChecked();

  // Cambiar a Cmaj7
  await page.getByTestId("select-tone").selectOption("C");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  const newCount = await page.getByTestId("voicing-select").locator("option").count();
  if (newCount < 2) return;

  // Con keepZone=true y ref en zona alta, NO debe caer al índice 0 (zona más baja)
  const selectedIdx = await getSelectedVoicingIndex(page);
  expect(selectedIdx).toBeGreaterThan(0);

  await expect(toggle).toBeChecked();
});

// ── KZ-G2 ────────────────────────────────────────────────────────────────────
test("KZ-G2. Notas guía OFF: usa índice 0 y NO lo pisa después (estabilidad)", async ({ page }) => {
  await goToChords(page);
  await switchToFamily(page, "guide_tones");
  await waitForVoicings(page);

  // Seleccionar raíz A (zona alta en Amaj7)
  await page.getByTestId("select-tone").selectOption("A");
  await waitForVoicings(page);

  const count = await page.getByTestId("voicing-select").locator("option").count();
  if (count < 2) return;

  // Seleccionar el último voicing (zona alta)
  await page.getByTestId("voicing-select").selectOption({ index: count - 1 });
  await page.waitForTimeout(200);

  // Desactivar keepZone
  await setCheckbox(page, "toggle-keep-zone", false);
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();

  // Cambiar a Cmaj7
  await page.getByTestId("select-tone").selectOption("C");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  // Verificación inmediata: debe ser índice 0
  const idx1 = await getSelectedVoicingIndex(page);
  expect(idx1).toBe(0);

  // Espera de estabilidad
  await page.waitForTimeout(500);
  const idx2 = await getSelectedVoicingIndex(page);
  expect(idx2).toBe(0);

  // Segunda verificación: cambiar raíz de nuevo con keepZone=false
  await page.getByTestId("select-tone").selectOption("D");
  await waitForVoicings(page);
  await page.waitForTimeout(300);

  const idx3 = await getSelectedVoicingIndex(page);
  expect(idx3).toBe(0);

  await page.waitForTimeout(500);
  const idx4 = await getSelectedVoicingIndex(page);
  expect(idx4).toBe(0);
});

// ── KZ-P1 ────────────────────────────────────────────────────────────────────
test("KZ-P1. Persistencia: keepZone=false persiste al recargar y afecta las 3 familias", async ({ page }) => {
  await goToChords(page);

  // Desactivar keepZone en quartal
  await switchToFamily(page, "quartal");
  await waitForVoicings(page);
  const toggleBefore = page.getByTestId("toggle-keep-zone");
  await expect(toggleBefore).toBeVisible({ timeout: 5000 });
  await setCheckbox(page, "toggle-keep-zone", false);
  await expect(toggleBefore).not.toBeChecked();
  await page.waitForTimeout(300);

  // Recargar
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await waitForVoicings(page);

  // En quartal: toggle sigue desactivado
  await switchToFamily(page, "quartal");
  await waitForVoicings(page);
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();

  // En guide_tones: toggle también desactivado
  await switchToFamily(page, "guide_tones");
  await waitForVoicings(page);
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();

  // En tertian: toggle también desactivado
  await switchToFamily(page, "tertian");
  await waitForVoicings(page);
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();
});
