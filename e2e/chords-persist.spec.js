/**
 * E2E — Persistencia de Acordes manuales
 *
 * Verifica que el estado del panel Acordes persiste al recargar la página
 * mientras appVersion coincida, y se resetea si cambia.
 *
 * Tests:
 *   CM-PERSIST-TONE        tono raíz persiste al recargar
 *   CM-PERSIST-QUALITY     calidad persiste al recargar
 *   CM-PERSIST-STRUCTURE   estructura (triada/cuatriada) persiste
 *   CM-PERSIST-OMIT        omitir nota persiste al recargar
 *   CM-PERSIST-TAB         estado persiste al cambiar de pestaña y volver
 *   CM-RESET-VERSION       estado se resetea si cambia appVersion
 *   CM-DETECT-MODE         modo investigar persiste al recargar
 *   CM-PERSIST-ALL         flujo completo: todos los campos a la vez
 *   CM-STORAGE-CONTENT     localStorage contiene los valores antes de recargar
 *   CM-DETECT-THEN-MANUAL  valores manuales persisten tras volver de modo investigar
 *   CM-PERSIST-FAMILY      familia de acorde (cuartal/guía) persiste
 */

import { test, expect } from "@playwright/test";

const STORAGE_KEY = "mastil_interactivo_guitarra_config_v1";

async function goToChords(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

// ── CM-PERSIST-TONE ───────────────────────────────────────────────────────────
test("CM-PERSIST-TONE: tono raíz persiste al recargar con la misma versión", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("E");
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-tone")).toHaveValue("E");
});

// ── CM-PERSIST-QUALITY ────────────────────────────────────────────────────────
test("CM-PERSIST-QUALITY: calidad del acorde persiste al recargar", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-quality").selectOption("min");
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
});

// ── CM-PERSIST-STRUCTURE ──────────────────────────────────────────────────────
test("CM-PERSIST-STRUCTURE: estructura (cuatriada) persiste al recargar", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-structure").selectOption("tetrad");
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
});

// ── CM-PERSIST-OMIT ───────────────────────────────────────────────────────────
test("CM-PERSIST-OMIT: omitir 5ª persiste al recargar", async ({ page }) => {
  await goToChords(page);
  // Activar estructura tetrad para que omit-5 esté disponible
  await page.getByTestId("select-structure").selectOption("tetrad");
  await expect(page.getByTestId("omit-5")).toBeVisible();
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("omit-5")).toBeChecked();
  await page.waitForTimeout(300);
  // Recargar sin limpiar localStorage
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  // Verificar que la estructura se restauró
  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  // Y que el omit-5 sigue marcado
  await expect(page.getByTestId("omit-5")).toBeChecked();
});

// ── CM-PERSIST-TAB ────────────────────────────────────────────────────────────
test("CM-PERSIST-TAB: estado de Acordes persiste al cambiar de pestaña y volver", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("A");
  await page.getByTestId("select-quality").selectOption("min");
  await page.getByTestId("select-structure").selectOption("tetrad");
  await page.waitForTimeout(200);
  // Cambiar a Escalas y volver
  await page.getByTestId("nav-scale").click();
  await page.waitForTimeout(200);
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
  await expect(page.getByTestId("select-tone")).toHaveValue("A");
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
});

// ── CM-RESET-VERSION ──────────────────────────────────────────────────────────
test("CM-RESET-VERSION: estado se resetea si appVersion cambia en localStorage", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-quality").selectOption("min");
  await page.waitForTimeout(300);
  // Simular versión anterior en localStorage
  await page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.appVersion = "1.0.0";
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch { /* ignorar */ }
  }, STORAGE_KEY);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
  // Después del reset, quality vuelve al valor por defecto (maj)
  await expect(page.getByTestId("select-quality")).toHaveValue("maj");
});

// ── CM-DETECT-MODE ────────────────────────────────────────────────────────────
test("CM-DETECT-MODE: modo investigar en mástil persiste al recargar", async ({ page }) => {
  await goToChords(page);
  // Activar modo investigar (toggle)
  const toggle = page.getByTestId("chord-detect-toggle");
  await expect(toggle).toBeVisible();
  await toggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
  await page.waitForTimeout(300);
  // Recargar sin limpiar localStorage
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  // El modo investigar debe seguir activo
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
});

// ── CM-PERSIST-ALL ────────────────────────────────────────────────────────────
// Replica exactamente la prueba manual real: cambia todos los campos clave,
// recarga y verifica el DOM visible campo a campo.
test("CM-PERSIST-ALL: flujo manual completo — todos los campos persisten al recargar", async ({ page }) => {
  await goToChords(page);

  // 1. Cambiar tono a B
  await page.getByTestId("select-tone").selectOption("B");
  // 2. Cambiar estructura a tetrad primero (activa ext7 vía E3 y habilita dom)
  await page.getByTestId("select-structure").selectOption("tetrad");
  // 3. Cambiar calidad a dom (disponible una vez que ext7=true por E3)
  await page.getByTestId("select-quality").selectOption("dom");
  // 4. Marcar omit-5
  await expect(page.getByTestId("omit-5")).toBeVisible();
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("omit-5")).toBeChecked();

  // Esperar a que el save effect escriba en localStorage
  await page.waitForTimeout(400);

  // Recargar sin limpiar localStorage
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();

  // Verificar todos los campos en el DOM visible
  await expect(page.getByTestId("select-tone")).toHaveValue("B");
  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("select-quality")).toHaveValue("dom");
  await expect(page.getByTestId("omit-5")).toBeChecked();
});

// ── CM-STORAGE-CONTENT ────────────────────────────────────────────────────────
// Verifica que localStorage contiene los valores correctos ANTES de recargar,
// y que la appVersion guardada coincide con la actual.
test("CM-STORAGE-CONTENT: localStorage contiene los valores modificados y la appVersion correcta", async ({ page }) => {
  await goToChords(page);

  await page.getByTestId("select-tone").selectOption("G");
  await page.getByTestId("select-quality").selectOption("min");
  await page.getByTestId("select-structure").selectOption("tetrad");
  await page.getByTestId("omit-5").check();

  // Esperar a que el save effect escriba
  await page.waitForTimeout(400);

  // Leer localStorage antes de recargar
  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }, STORAGE_KEY);

  // appVersion guardada debe coincidir con la versión actual (no vacía)
  expect(stored).not.toBeNull();
  expect(stored.appVersion).toBeTruthy();
  expect(typeof stored.appVersion).toBe("string");

  // config debe contener los valores modificados
  const cfg = stored.config;
  expect(cfg).toBeTruthy();
  expect(cfg.chordQuality).toBe("min");
  expect(cfg.chordStructure).toBe("tetrad");
  expect(cfg.chordOmit).toBe("5");

  // Verificar también tras recargar que el DOM es consistente
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("omit-5")).toBeChecked();
});

// ── CM-DETECT-THEN-MANUAL ─────────────────────────────────────────────────────
// Guarda valores manuales + modo investigar ON.
// Recarga → modo investigar activo (panel de detección visible).
// Desactiva modo investigar → los valores manuales deben seguir presentes.
test("CM-DETECT-THEN-MANUAL: valores manuales persisten tras volver de modo investigar", async ({ page }) => {
  await goToChords(page);

  // Configurar valores manuales
  await page.getByTestId("select-tone").selectOption("D");
  await page.getByTestId("select-quality").selectOption("min");
  await page.getByTestId("select-structure").selectOption("tetrad");

  // Activar modo investigar
  const toggle = page.getByTestId("chord-detect-toggle");
  await toggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();

  await page.waitForTimeout(400);

  // Recargar
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();

  // Modo investigar debe seguir activo tras recargar
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();

  // Desactivar modo investigar para ver los controles manuales
  await page.getByTestId("chord-detect-toggle").uncheck();

  // Los valores manuales deben haberse conservado
  await expect(page.getByTestId("select-structure")).toBeVisible();
  await expect(page.getByTestId("select-tone")).toHaveValue("D");
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
});

// ── CM-PERSIST-FAMILY ─────────────────────────────────────────────────────────
// Verifica que la familia de acorde (cuartal) persiste al recargar.
test("CM-PERSIST-FAMILY: familia cuartal persiste al recargar", async ({ page }) => {
  await goToChords(page);

  // Cambiar a familia cuartal
  await page.getByTestId("select-family").selectOption("quartal");
  await expect(page.getByTestId("select-family")).toHaveValue("quartal");

  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();

  // La familia cuartal debe seguir seleccionada
  await expect(page.getByTestId("select-family")).toBeVisible();
  await expect(page.getByTestId("select-family")).toHaveValue("quartal");
});

// ── CM-PERSIST-VOICING ────────────────────────────────────────────────────────
// Verifica que el voicing seleccionado (chordSelectedFrets) persiste al recargar.
test("CM-PERSIST-VOICING: el voicing seleccionado persiste al recargar", async ({ page }) => {
  await goToChords(page);

  const voicingSelect = page.getByTestId("voicing-select");
  await expect(voicingSelect).toBeVisible();

  // Leer opciones disponibles (debe haber más de 1)
  const options = await voicingSelect.locator("option").all();
  expect(options.length).toBeGreaterThan(1);

  // Seleccionar la segunda opción (diferente a la que hay por defecto)
  const secondOptionValue = await options[1].getAttribute("value");
  await voicingSelect.selectOption({ value: secondOptionValue });
  await expect(voicingSelect).toHaveValue(secondOptionValue);

  // Esperar a que el save effect escriba en localStorage
  await page.waitForTimeout(400);

  // Verificar que localStorage tiene el valor correcto antes de recargar
  const storedBefore = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).config?.chordSelectedFrets : undefined;
  }, "mastil_interactivo_guitarra_config_v1");
  expect(storedBefore).toBe(secondOptionValue);

  // Recargar sin limpiar localStorage
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();

  // Esperar a que el voicing se restaure (puede ser async para chord DB)
  await page.waitForTimeout(800);

  // El voicing debe seguir seleccionado
  await expect(voicingSelect).toBeVisible();
  await expect(voicingSelect).toHaveValue(secondOptionValue);
});

// ── CM-PERSIST-VOICING-CHORD-DB ────────────────────────────────────────────────
// Verifica que el voicing persiste cuando se usa estructura "chord" (chord DB async).
test("CM-PERSIST-VOICING-CHORD-DB: voicing de chord DB persiste al recargar", async ({ page }) => {
  await goToChords(page);

  // Cambiar estructura a "chord" (usa el chord DB, carga asíncrona)
  await page.getByTestId("select-structure").selectOption("chord");
  await expect(page.getByTestId("select-structure")).toHaveValue("chord");

  const voicingSelect = page.getByTestId("voicing-select");

  // Esperar a que el chord DB cargue (el select queda habilitado con opciones)
  await expect(voicingSelect).not.toBeDisabled({ timeout: 5000 });
  await expect(voicingSelect).toBeEnabled();

  // Leer las opciones disponibles
  const options = await voicingSelect.locator("option").all();
  expect(options.length).toBeGreaterThan(1);

  // Seleccionar la segunda opción
  const secondOptionValue = await options[1].getAttribute("value");
  await voicingSelect.selectOption({ value: secondOptionValue });
  await expect(voicingSelect).toHaveValue(secondOptionValue);

  // Esperar save
  await page.waitForTimeout(400);

  // Verificar localStorage antes de recargar
  const storedBefore = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return { frets: p.config?.chordSelectedFrets, structure: p.config?.chordStructure };
  }, "mastil_interactivo_guitarra_config_v1");
  expect(storedBefore?.structure).toBe("chord");
  expect(storedBefore?.frets).toBe(secondOptionValue);

  // Recargar
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();

  // Esperar a que el chord DB cargue de nuevo
  await expect(voicingSelect).not.toBeDisabled({ timeout: 5000 });

  // El voicing debe restaurarse
  await expect(voicingSelect).toHaveValue(secondOptionValue);
});

// ── CM-MANUAL-PATTERN-PERSIST ──────────────────────────────────────────────────
// Verifica que el patrón "xx3320" introducido en Acordes Manual (modo investigar)
// sigue reflejado en el mástil 2 segundos después de recargar la página.
test("CM-MANUAL-PATTERN-PERSIST: patrón xx3320 en Acordes Manual persiste 2s tras recargar", async ({ page }) => {
  await goToChords(page);

  // Activar modo Manual (investigar en mástil)
  const detectToggle = page.getByTestId("chord-detect-toggle");
  await expect(detectToggle).toBeVisible();
  await detectToggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();

  // Escribir el patrón xx3320 en el input y aplicarlo
  const patternInput = page.getByTestId("chord-detect-pattern-input").first();
  await expect(patternInput).toBeVisible();
  await patternInput.fill("xx3320");
  await expect(patternInput).toHaveValue("xx3320");

  const applyBtn = page.getByTestId("chord-detect-apply-btn").first();
  await expect(applyBtn).toBeEnabled();
  await applyBtn.click();

  // Esperar a que el mástil refleje el patrón y la lista de acordes detectados aparezca
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
  const listItems = page.getByTestId("detected-chord-list").locator("[data-testid^='detected-chord-']");
  await expect(listItems.first()).toBeVisible({ timeout: 3000 });

  // Dar tiempo al save effect de localStorage
  await page.waitForTimeout(400);

  // Recargar la página (equivale a pulsar F5)
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Navegar a Acordes y activar modo Manual
  await page.getByTestId("nav-chords").click();
  await expect(detectToggle).toBeVisible();
  // chordDetectMode debe seguir ON tras la recarga
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();

  // Esperar exactamente 2 segundos (como describe el usuario)
  await page.waitForTimeout(2000);

  // El mástil debe seguir mostrando los acordes detectados para xx3320.
  // Si chordDetectSelectedKeys no se persiste, la lista estará vacía tras la recarga.
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
  const restoredItems = page.getByTestId("detected-chord-list").locator("[data-testid^='detected-chord-']");
  await expect(restoredItems.first()).toBeVisible({ timeout: 1000 });
});
