/**
 * E2E — Analizador de tonalidad / progresión
 *
 * Tests:
 *   KA-COLLAPSED            tarjeta aparece plegada por defecto
 *   KA-EXPAND               se puede desplegar
 *   KA-ANALYZE              F# | Bm | A/E | D/F# → aparece "B menor"
 *   KA-DOMINANT             aparece explicación "dominante de Bm"
 *   KA-NEAR-OK              Acordes cercanos sigue funcionando
 *   KA-STRICT-LABEL         etiqueta "Tonalidades diatónicas estrictas" visible en Acordes cercanos
 *   KA-MODAL-SECTION        E F# C#m → muestra sección "Centros modales compatibles"
 *   KA-MODAL-SUMMARY        E lidio aparece en la lista con el resumen correcto
 *   KA-MODAL-COLLAPSED      centros modales aparecen plegados inicialmente
 *   KA-MODAL-EXPAND         al desplegar E lidio se muestran notas, grados e introducidos
 *   KA-MODAL-SCALES         combo de escalas incluye las escalas esperadas
 *   KA-MODAL-PENTA-MAJ      notas de E pentatónica mayor son correctas
 *   KA-MODAL-PENTA-MIN      notas de C# pentatónica menor son correctas
 *   KA-PERSIST-INPUT        texto no se borra al cambiar de pestaña
 *   KA-PERSIST-RELOAD       texto no se borra al recargar con la misma versión
 *   KA-PERSIST-RESET        texto se resetea si appVersion cambia
 *   KA-PERSIST-MODAL        centro modal desplegado se conserva al cambiar de pestaña
 *   KA-PERSIST-MODAL-RELOAD centro modal desplegado se conserva al recargar
 *   KA-PERSIST-KEY-SCALE    escala de tonalidad persiste al cambiar de pestaña
 *   KA-PERSIST-KEY-RELOAD   escala de tonalidad persiste al recargar
 *   KA-TESTID-ISOLATION     testids key-scale-* no colisionan con modal-scale-*
 *   KA-KEY-SCALES-VISIBLE   combo de escalas aparece en tonalidad probable
 *   KA-KEY-OPEN-DEFAULT          tonalidad probable aparece abierta por defecto
 *   KA-KEY-ALT-CLOSED            alternativa aparece cerrada por defecto
 *   KA-KEY-ACCORDION-TOGGLE      se puede abrir y cerrar el acordeón de alternativas
 *   KA-ACCORDION-PERSIST-CLOSED  estado cerrar/abrir de acordeones persiste al recargar
 *   KA-ACCORDION-PERSIST-RESET   reset de acordeones al cambiar appVersion
 *   KA-FUNCTIONAL-BONUS-LABEL    C F G Bb → C mayor con etiqueta "centro funcional sugerido"
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

async function openAndAnalyze(page, progression) {
  await page.getByTestId("key-analyzer-toggle").click();
  await expect(page.getByTestId("key-analyzer-input")).toBeVisible();
  await page.getByTestId("key-analyzer-input").fill(progression);
  await page.getByTestId("key-analyzer-btn").click();
  await expect(page.getByTestId("key-analyzer-result")).toBeVisible();
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
  await openAndAnalyze(page, "F# | Bm | A/E | D/F#");
  const result = page.getByTestId("key-analyzer-result");
  await expect(result).toContainText("B menor");
});

// ── KA-DOMINANT ───────────────────────────────────────────────────────────────
test("KA-DOMINANT: F# se muestra como dominante de Bm", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "F# | Bm | A/E | D/F#");
  await expect(page.getByTestId("key-analyzer-result")).toContainText("dominante de Bm");
});

// ── KA-NEAR-OK ────────────────────────────────────────────────────────────────
test("KA-NEAR-OK: Acordes cercanos sigue visible y funcional", async ({ page }) => {
  await goToNearChords(page);
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
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

// ── KA-MODAL-SECTION ──────────────────────────────────────────────────────────
test("KA-MODAL-SECTION: E F# C#m → muestra sección Centros modales compatibles", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  await expect(page.getByTestId("modal-centers-section")).toBeVisible();
  await expect(page.getByTestId("modal-centers-toggle")).toContainText("Centros modales compatibles");
});

// ── KA-MODAL-COLLAPSED ────────────────────────────────────────────────────────
test("KA-MODAL-COLLAPSED: centros modales aparecen plegados inicialmente", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  // La sección existe pero la lista está oculta hasta que se despliega
  await expect(page.getByTestId("modal-centers-list")).not.toBeVisible();
});

// ── KA-MODAL-SUMMARY ──────────────────────────────────────────────────────────
test("KA-MODAL-SUMMARY: al abrir la sección, E lidio aparece con su resumen", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  await page.getByTestId("modal-centers-toggle").click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();
  // Buscar el resumen de E lidio
  await expect(page.getByTestId("modal-centers-list")).toContainText("E lidio");
  await expect(page.getByTestId("modal-centers-list")).toContainText("E = I");
  await expect(page.getByTestId("modal-centers-list")).toContainText("F# = II");
  await expect(page.getByTestId("modal-centers-list")).toContainText("C#m = vi");
});

// ── KA-MODAL-EXPAND ───────────────────────────────────────────────────────────
test("KA-MODAL-EXPAND: al desplegar E lidio se muestran notas, grados y acordes introducidos", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  // Abrir la sección (E lidio ya está expandido por auto-expand)
  await page.getByTestId("modal-centers-toggle").click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();
  // Si E lidio no está expandido, expandirlo; si ya lo está, no tocar
  const eLidioDetail = page.getByTestId("modal-center-notes");
  const alreadyVisible = await eLidioDetail.isVisible().catch(() => false);
  if (!alreadyVisible) {
    await page.getByTestId("modal-center-toggle-4-lidio").click();
  }
  // Comprobar que aparecen las notas del modo
  await expect(page.getByTestId("modal-center-notes")).toBeVisible();
  await expect(page.getByTestId("modal-center-notes")).toContainText("E");
  await expect(page.getByTestId("modal-center-notes")).toContainText("F#");
  // Comprobar que aparece la tabla de grados
  await expect(page.getByTestId("modal-diatonic-4-lidio")).toBeVisible();
  // Comprobar que aparecen los acordes introducidos
  await expect(page.getByTestId("key-analyzer-result")).toContainText("Acordes introducidos");
  // Comprobar que aparece el combo de escalas
  await expect(page.getByTestId("modal-scale-combo")).toBeVisible();
});

// ── KA-MODAL-SCALES ───────────────────────────────────────────────────────────
test("KA-MODAL-SCALES: combo de E lidio incluye escalas esperadas", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  await page.getByTestId("modal-centers-toggle").click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();
  const alreadyVisible = await page.getByTestId("modal-scale-select").isVisible().catch(() => false);
  if (!alreadyVisible) {
    await page.getByTestId("modal-center-toggle-4-lidio").click();
  }
  const select = page.getByTestId("modal-scale-select");
  await expect(select).toBeVisible();
  const optionTexts = await select.locator("option").allTextContents();
  expect(optionTexts.some((t) => t.includes("E lidio"))).toBe(true);
  expect(optionTexts.some((t) => t.includes("B mayor"))).toBe(true);
  expect(optionTexts.some((t) => t.includes("E pentatónica mayor"))).toBe(true);
  expect(optionTexts.some((t) => t.includes("C# pentatónica menor"))).toBe(true);
});

// ── KA-MODAL-PENTA-MAJ ────────────────────────────────────────────────────────
test("KA-MODAL-PENTA-MAJ: seleccionando E pentatónica mayor muestra notas E F# G# B C#", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  await page.getByTestId("modal-centers-toggle").click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();
  const alreadyVisible = await page.getByTestId("modal-scale-select").isVisible().catch(() => false);
  if (!alreadyVisible) {
    await page.getByTestId("modal-center-toggle-4-lidio").click();
  }
  const select = page.getByTestId("modal-scale-select");
  await expect(select).toBeVisible();
  await select.selectOption({ label: "E pentatónica mayor" });
  const notes = page.getByTestId("modal-scale-notes");
  await expect(notes).toContainText("E");
  await expect(notes).toContainText("F#");
  await expect(notes).toContainText("G#");
  await expect(notes).toContainText("B");
  await expect(notes).toContainText("C#");
});

// ── KA-MODAL-PENTA-MIN ────────────────────────────────────────────────────────
test("KA-MODAL-PENTA-MIN: seleccionando C# pentatónica menor muestra notas C# E F# G# B", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  await page.getByTestId("modal-centers-toggle").click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();
  const alreadyVisible = await page.getByTestId("modal-scale-select").isVisible().catch(() => false);
  if (!alreadyVisible) {
    await page.getByTestId("modal-center-toggle-4-lidio").click();
  }
  const select = page.getByTestId("modal-scale-select");
  await expect(select).toBeVisible();
  await select.selectOption({ label: "C# pentatónica menor" });
  const notes = page.getByTestId("modal-scale-notes");
  await expect(notes).toContainText("C#");
  await expect(notes).toContainText("E");
  await expect(notes).toContainText("F#");
  await expect(notes).toContainText("G#");
  await expect(notes).toContainText("B");
});

// ── KA-PERSIST-INPUT ──────────────────────────────────────────────────────────
test("KA-PERSIST-INPUT: texto del analizador no se pierde al cambiar de pestaña", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  // Cambiar a otra pestaña y volver
  await page.getByTestId("nav-scale").click();
  await page.waitForTimeout(200);
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(200);
  // El analizador debe seguir mostrando el texto (open persiste)
  const input = page.getByTestId("key-analyzer-input");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("E F# C#m");
});

// ── KA-PERSIST-RELOAD ─────────────────────────────────────────────────────────
test("KA-PERSIST-RELOAD: texto del analizador se conserva al recargar con la misma versión", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  // Recargar la página sin limpiar localStorage
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(300);
  const input = page.getByTestId("key-analyzer-input");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("E F# C#m");
});

// ── KA-PERSIST-RESET ──────────────────────────────────────────────────────────
test("KA-PERSIST-RESET: texto se resetea si appVersion cambia en localStorage", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  // Simular que la config guardada tiene una versión anterior
  await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("mastil_interactivo_guitarra_config_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.appVersion = "1.0.0"; // versión muy antigua
        localStorage.setItem("mastil_interactivo_guitarra_config_v1", JSON.stringify(parsed));
      }
    } catch { /* ignorar */ }
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(300);
  // Expandir el analizador
  await page.getByTestId("key-analyzer-toggle").click();
  const input = page.getByTestId("key-analyzer-input");
  await expect(input).toBeVisible();
  // Después del reset por versión, el input debe estar vacío
  await expect(input).toHaveValue("");
});

// ── KA-PERSIST-MODAL ──────────────────────────────────────────────────────────
test("KA-PERSIST-MODAL: sección de centros modales se conserva al cambiar de pestaña", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  // Abrir la sección de centros modales
  await page.getByTestId("modal-centers-toggle").click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();
  // Cambiar de pestaña y volver
  await page.getByTestId("nav-scale").click();
  await page.waitForTimeout(200);
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(300);
  // El resultado y los centros deben seguir visibles
  await expect(page.getByTestId("key-analyzer-result")).toBeVisible();
});

// ── KA-PERSIST-MODAL-RELOAD ───────────────────────────────────────────────────
test("KA-PERSIST-MODAL-RELOAD: escala seleccionada en centro modal persiste al recargar", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  await page.getByTestId("modal-centers-toggle").click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();
  // Expandir E lidio si no lo está ya
  const alreadyVisible = await page.getByTestId("modal-scale-select").isVisible().catch(() => false);
  if (!alreadyVisible) {
    await page.getByTestId("modal-center-toggle-4-lidio").click();
  }
  await expect(page.getByTestId("modal-scale-select")).toBeVisible();
  await page.getByTestId("modal-scale-select").selectOption({ label: "E pentatónica mayor" });
  // Recargar sin limpiar localStorage
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(300);
  // El resultado debe estar visible y E lidio expandido con la escala seleccionada
  await expect(page.getByTestId("key-analyzer-result")).toBeVisible();
  // La sección de centros modales puede estar ya abierta (persiste); si no, abrirla.
  const modalListAfterReload = page.getByTestId("modal-centers-list");
  const isSectionOpen = await modalListAfterReload.isVisible().catch(() => false);
  if (!isSectionOpen) {
    await page.getByTestId("modal-centers-toggle").click();
  }
  await expect(modalListAfterReload).toBeVisible();
  const selectAfterReload = page.getByTestId("modal-scale-select");
  await expect(selectAfterReload).toBeVisible();
  const selectedValue = await selectAfterReload.inputValue();
  const optionLabel = await selectAfterReload.locator(`option[value="${selectedValue}"]`).textContent();
  expect(optionLabel).toContain("E pentatónica mayor");
});

// ── KA-PERSIST-KEY-SCALE ──────────────────────────────────────────────────────
test("KA-PERSIST-KEY-SCALE: escala de tonalidad persiste al cambiar de pestaña", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  // El combo de escala de tonalidad principal debe ser visible
  const keyScaleSelect = page.getByTestId("key-scale-select").first();
  await expect(keyScaleSelect).toBeVisible();
  // Seleccionar una escala no primera
  const options = await keyScaleSelect.locator("option").allTextContents();
  const secondOption = options[1];
  if (secondOption) {
    await keyScaleSelect.selectOption({ index: 1 });
  }
  // Cambiar pestaña y volver
  await page.getByTestId("nav-scale").click();
  await page.waitForTimeout(200);
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(300);
  // El combo debe conservar la selección
  const keyScaleSelectAfter = page.getByTestId("key-scale-select").first();
  await expect(keyScaleSelectAfter).toBeVisible();
  const afterValue = await keyScaleSelectAfter.inputValue();
  expect(afterValue).toBe("1");
});

// ── KA-PERSIST-KEY-RELOAD ─────────────────────────────────────────────────────
test("KA-PERSIST-KEY-RELOAD: escala de tonalidad persiste al recargar", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  const keyScaleSelect = page.getByTestId("key-scale-select").first();
  await expect(keyScaleSelect).toBeVisible();
  await keyScaleSelect.selectOption({ index: 1 });
  // Recargar
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(300);
  const keyScaleSelectAfter = page.getByTestId("key-scale-select").first();
  await expect(keyScaleSelectAfter).toBeVisible();
  const afterValue = await keyScaleSelectAfter.inputValue();
  expect(afterValue).toBe("1");
});

// ── KA-TESTID-ISOLATION ───────────────────────────────────────────────────────
test("KA-TESTID-ISOLATION: testids key-scale-* y modal-scale-* no colisionan", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  // Los key-scale-combo son de tonalidades
  const keyScaleCombos = page.getByTestId("key-scale-combo");
  const keyCount = await keyScaleCombos.count();
  expect(keyCount).toBeGreaterThan(0);
  // Los modal-scale-combo son de centros modales (no visibles hasta expandir)
  await page.getByTestId("modal-centers-toggle").click();
  const alreadyVisible = await page.getByTestId("modal-scale-combo").isVisible().catch(() => false);
  if (!alreadyVisible) {
    await page.getByTestId("modal-center-toggle-4-lidio").click();
  }
  const modalScaleCombos = page.getByTestId("modal-scale-combo");
  const modalCount = await modalScaleCombos.count();
  expect(modalCount).toBe(1);
  // No debe haber testids duplicados entre los dos grupos
  const keySelects = await page.getByTestId("key-scale-select").count();
  const modalSelects = await page.getByTestId("modal-scale-select").count();
  expect(keySelects).toBeGreaterThan(0);
  expect(modalSelects).toBe(1);
});

// ── KA-KEY-SCALES-VISIBLE ─────────────────────────────────────────────────────
test("KA-KEY-SCALES-VISIBLE: combo de escalas sugeridas visible en tonalidad probable", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  const keyScaleCombo = page.getByTestId("key-scale-combo").first();
  await expect(keyScaleCombo).toBeVisible();
  const select = page.getByTestId("key-scale-select").first();
  await expect(select).toBeVisible();
  const options = await select.locator("option").allTextContents();
  expect(options.some((t) => t.toLowerCase().includes("mayor") || t.toLowerCase().includes("menor"))).toBe(true);
});

// ── KA-KEY-OPEN-DEFAULT ───────────────────────────────────────────────────────
test("KA-KEY-OPEN-DEFAULT: tonalidad probable aparece abierta por defecto", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  const toggle = page.getByTestId("key-block-main-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  // El contenido interior debe estar visible
  await expect(page.getByTestId("key-scale-combo").first()).toBeVisible();
});

// ── KA-KEY-ALT-CLOSED ─────────────────────────────────────────────────────────
test("KA-KEY-ALT-CLOSED: alternativa aparece cerrada por defecto", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  const altToggle = page.getByTestId("key-block-alt-0-toggle");
  await expect(altToggle).toBeVisible();
  await expect(altToggle).toHaveAttribute("aria-expanded", "false");
});

// ── KA-KEY-ACCORDION-TOGGLE ───────────────────────────────────────────────────
test("KA-KEY-ACCORDION-TOGGLE: se puede abrir y cerrar el acordeón de alternativas", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");
  const altToggle = page.getByTestId("key-block-alt-0-toggle");
  await expect(altToggle).toBeVisible();

  // Abrir
  await altToggle.click();
  await expect(altToggle).toHaveAttribute("aria-expanded", "true");

  // Cerrar
  await altToggle.click();
  await expect(altToggle).toHaveAttribute("aria-expanded", "false");
});

// ── KA-ACCORDION-PERSIST-CLOSED ───────────────────────────────────────────────
test("KA-ACCORDION-PERSIST-CLOSED: cerrar tonalidad principal y abrir E lidio persiste al recargar", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");

  // La tonalidad principal debe estar abierta por defecto
  const mainToggle = page.getByTestId("key-block-main-toggle");
  await expect(mainToggle).toHaveAttribute("aria-expanded", "true");

  // Cerrar la tonalidad principal
  await mainToggle.click();
  await expect(mainToggle).toHaveAttribute("aria-expanded", "false");

  // Abrir la sección de centros modales
  const modalSectionToggle = page.getByTestId("modal-centers-toggle");
  await expect(modalSectionToggle).toBeVisible();
  await modalSectionToggle.click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();

  // Abrir E lidio
  const elidioToggle = page.getByTestId("modal-center-toggle-4-lidio");
  await expect(elidioToggle).toBeVisible();
  await elidioToggle.click();
  await expect(elidioToggle).toHaveAttribute("aria-expanded", "true");

  // Esperar a que se guarde en localStorage
  await page.waitForTimeout(400);

  // Recargar sin borrar localStorage
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(300);

  // Abrir el analizador (debe estar abierto si se guardó keyAnalyzerOpen=true)
  const analyzerToggle = page.getByTestId("key-analyzer-toggle");
  const isOpen = await page.getByTestId("key-analyzer-result").isVisible().catch(() => false);
  if (!isOpen) {
    await analyzerToggle.click();
    await page.waitForTimeout(200);
  }

  // Verificar que la tonalidad principal sigue cerrada
  const mainToggleAfter = page.getByTestId("key-block-main-toggle");
  await expect(mainToggleAfter).toBeVisible();
  await expect(mainToggleAfter).toHaveAttribute("aria-expanded", "false");

  // Verificar que la sección de centros modales sigue abierta
  const modalSectionToggleAfter = page.getByTestId("modal-centers-toggle");
  await expect(modalSectionToggleAfter).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();

  // Verificar que E lidio sigue abierto
  const elidioToggleAfter = page.getByTestId("modal-center-toggle-4-lidio");
  await expect(elidioToggleAfter).toHaveAttribute("aria-expanded", "true");
});

// ── KA-FUNCTIONAL-BONUS-LABEL ─────────────────────────────────────────────────
test("KA-FUNCTIONAL-BONUS-LABEL: C F G Bb → C mayor muestra etiqueta de prioridad funcional I-IV-V", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "C F G Bb");
  // C mayor debe aparecer como tonalidad probable (bonus la sube al top)
  await expect(page.getByTestId("key-block-main")).toContainText("C mayor");
  // Debe mostrar la etiqueta de prioridad funcional (no contradicción visual)
  await expect(page.getByTestId("functional-bonus-label")).toBeVisible();
  await expect(page.getByTestId("functional-bonus-label")).toContainText("centro funcional sugerido");
  // El porcentaje real diatónico (75%) debe aparecer, no inflado
  await expect(page.getByTestId("key-block-main")).toContainText("75%");
  // F mayor debe aparecer como alternativa (no como tonalidad probable)
  await expect(page.getByTestId("key-analyzer-result")).toContainText("F mayor");
  await expect(page.getByTestId("key-analyzer-result")).toContainText("Alternativa");
});

// ── KA-ACCORDION-PERSIST-RESET ────────────────────────────────────────────────
test("KA-ACCORDION-PERSIST-RESET: cambio de appVersion resetea acordeones al estado por defecto", async ({ page }) => {
  await goToNearChords(page);
  await openAndAnalyze(page, "E F# C#m");

  // Cerrar la tonalidad principal
  const mainToggle = page.getByTestId("key-block-main-toggle");
  await mainToggle.click();
  await expect(mainToggle).toHaveAttribute("aria-expanded", "false");

  // Abrir la sección de centros modales
  await page.getByTestId("modal-centers-toggle").click();
  await expect(page.getByTestId("modal-centers-list")).toBeVisible();

  // Esperar a que se guarde
  await page.waitForTimeout(400);

  // Simular cambio de appVersion en localStorage (versión antigua)
  await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("mastil_interactivo_guitarra_config_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.appVersion = "1.0.0";
        localStorage.setItem("mastil_interactivo_guitarra_config_v1", JSON.stringify(parsed));
      }
    } catch { /* ignorar */ }
  });

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await page.waitForTimeout(300);

  // El analizador estará colapsado (config reseteada)
  await expect(page.getByTestId("key-analyzer-toggle")).toHaveAttribute("aria-expanded", "false");

  // Abrir el analizador y analizar de nuevo (openAndAnalyze ya abre el toggle)
  await openAndAnalyze(page, "E F# C#m");

  // La tonalidad principal debe estar abierta (default)
  const mainToggleAfter = page.getByTestId("key-block-main-toggle");
  await expect(mainToggleAfter).toHaveAttribute("aria-expanded", "true");

  // La sección de centros modales debe estar cerrada (default)
  const modalSectionToggleAfter = page.getByTestId("modal-centers-toggle");
  await expect(modalSectionToggleAfter).toHaveAttribute("aria-expanded", "false");
});
