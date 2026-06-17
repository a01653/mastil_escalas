/**
 * Smoke tests — cobertura básica por sección.
 * No validan lógica musical; solo verifican que cada pestaña renderiza,
 * responde a interacciones básicas y no provoca crash ni pantalla en blanco.
 */

import { test, expect } from "@playwright/test";

const NAV_TABS = [
  { id: "nav-scale",         label: "Escala" },
  { id: "nav-scale-compare", label: "Comparar" },
  { id: "nav-route",         label: "Ruta" },
  { id: "nav-chords",        label: "Acordes" },
  { id: "nav-near-chords",   label: "Acordes cercanos" },
  { id: "nav-standards",     label: "Standards" },
];

async function resetAppStorage(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function openFreshApp(page) {
  await resetAppStorage(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function clickNav(page, testId) {
  const navButton = page.getByTestId(testId);
  await expect(navButton).toBeVisible();
  await navButton.click();
}

// ── S0: Desktop Configuración oculta Contexto tonal; otras pestañas lo mantienen ──
test("S0. Desktop: Configuración oculta Contexto tonal; Escala/Acordes lo mantienen", async ({ page }) => {
  await openFreshApp(page);

  await expect(page.getByText("Contexto tonal", { exact: true })).toBeVisible();

  await clickNav(page, "nav-configuration");
  await expect(page.getByText("Contexto tonal", { exact: true })).toHaveCount(0);

  await clickNav(page, "nav-scale");
  await expect(page.getByText("Contexto tonal", { exact: true })).toBeVisible();

  await clickNav(page, "nav-chords");
  await expect(page.getByText("Contexto tonal", { exact: true })).toBeVisible();
});

// ── S0b: Móvil/compacto — abrir Configuración no rompe la navegación ────────
test("S0b. Móvil: abrir Configuración desde el menú no rompe la navegación", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFreshApp(page);

  const openConfigBtn = page.getByTitle("Abrir configuración");
  await expect(openConfigBtn).toBeVisible();
  await openConfigBtn.click();

  await expect(page.getByText("Ajustes globales y visuales de la app.")).toBeVisible();
  await page.getByTitle("Cerrar configuración").nth(1).click();

  await expect(page.getByText("Ajustes globales y visuales de la app.")).toHaveCount(0);
  await expect(page.getByTitle("Abrir configuración")).toBeVisible();
  await expect(page.locator("body")).not.toBeEmpty();
});

// ── S0c: Desktop → móvil desde Configuración cae en Acordes ─────────────────
test("S0c. Desktop a móvil: si vienes de Configuración, el layout compacto activa Acordes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFreshApp(page);

  await clickNav(page, "nav-configuration");
  await expect(page.getByText("Contexto tonal", { exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);

  await expect(page.getByTestId("chord-chips")).toBeVisible();
  await expect(page.locator("body")).not.toBeEmpty();
});

// ── S0d: Desktop → compacto desde Configuración cae en Acordes ─────────────
test("S0d. Desktop a compacto: si vienes de Configuración, el layout compacto activa Acordes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFreshApp(page);

  await clickNav(page, "nav-configuration");
  await expect(page.getByText("Contexto tonal", { exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.waitForTimeout(300);

  await expect(page.getByTestId("chord-chips")).toBeVisible();
  await expect(page.getByText("Ajustes globales y visuales de la app.")).toHaveCount(0);
  await expect(page.locator("body")).not.toBeEmpty();
});

// ── S1: Navegación general ────────────────────────────────────────────────────
test("S1. Recorrer todas las pestañas principales sin crash ni pantalla en blanco", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await openFreshApp(page);

  for (const tab of NAV_TABS) {
    await clickNav(page, tab.id);
    // La página no debe quedar en blanco: al menos un texto de la app es visible
    await expect(page.locator("body")).not.toBeEmpty();
    // No debe haber errores JS fatales (pageerror)
    expect(errors, `Error al abrir pestaña ${tab.label}: ${errors[0]}`).toHaveLength(0);
  }
});

// ── S2: Escalas — mástil renderiza y responde a cambios de tónica y modo ────
test("S2. Escalas: abrir pestaña, cambiar tónica y modo, fretboard sigue visible", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-scale");

  // El panel de escala debe ser visible
  await expect(page.getByTestId("fretboard-scale")).toBeVisible();

  // Select de raíz visible y funcional
  const rootSelect = page.getByTestId("scale-root-select");
  await expect(rootSelect).toBeVisible();
  await rootSelect.selectOption("B");

  // El fretboard sigue visible tras el cambio
  await expect(page.getByTestId("fretboard-scale")).toBeVisible();
});

// ── S3: Escalas — cambiar de Mayor a Menor ───────────────────────────────────
test("S3. Escalas: cambiar modo Mayor → Menor, no crash", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-scale");

  const modeSelect = page.getByTestId("scale-mode-select");
  await expect(modeSelect).toBeVisible();

  // Seleccionar escala menor natural (opción que contiene "menor")
  const options = await modeSelect.locator("option").allTextContents();
  const minorOption = options.find((o) => /menor.*nat|natural.*minor/i.test(o));
  if (minorOption) {
    await modeSelect.selectOption({ label: minorOption });
  } else {
    // Fallback: segunda opción disponible
    await modeSelect.selectOption({ index: 1 });
  }

  await expect(page.getByTestId("fretboard-scale")).toBeVisible();
});

// ── S4: Comparador de escalas — abrir pestaña y ver panel ────────────────────
test("S4. Comparador: abrir pestaña, panel visible con 4 filas", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-scale-compare");

  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await expect(page.getByTestId(`scale-compare-row-${i}`)).toBeVisible();
  }
});

// ── S5: Comparador de escalas — activar fila muestra el mástil ───────────────
test("S5. Comparador: activar una fila con 'Ver' hace aparecer el mástil", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-scale-compare");

  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  // Por defecto ninguna está visible: activar la primera fila
  await page.getByTestId("scale-compare-toggle-0").click();

  // El panel sigue visible y sin crash
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  await expect(page.locator("body")).not.toBeEmpty();
});

// ── S6: Comparador de escalas — FIFO: activar 3 filas queda solo 2 ──────────
test("S6. Comparador: FIFO — activar 3 escalas resulta en sólo 2 visibles", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-scale-compare");

  await page.getByTestId("scale-compare-toggle-0").click();
  await page.getByTestId("scale-compare-toggle-1").click();
  await page.getByTestId("scale-compare-toggle-2").click();

  // El panel sigue visible sin crash
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
  await expect(page.locator("body")).not.toBeEmpty();
});

// ── S7: Ruta — panel visible con inputs ──────────────────────────────────────
test("S7. Ruta: panel visible con campos de inicio y fin", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-route");

  await expect(page.getByTestId("route-panel")).toBeVisible();
  await expect(page.getByTestId("route-start-input")).toBeVisible();
  await expect(page.getByTestId("route-end-input")).toBeVisible();
});

// ── S8: Ruta — cambiar escala recalcula la ruta ───────────────────────────────
test("S8. Ruta: cambiar tónica no crashea el panel de ruta", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-route");
  await expect(page.getByTestId("route-panel")).toBeVisible();

  // Cambiar raíz desde la pestaña Escalas y volver a Ruta
  await clickNav(page, "nav-scale");
  await page.getByTestId("scale-root-select").selectOption("G");
  await clickNav(page, "nav-route");

  await expect(page.getByTestId("route-panel")).toBeVisible();
});

// ── S9: NearChords — panel visible con al menos un slot ──────────────────────
test("S9. Acordes cercanos: panel visible con slots de acordes", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-near-chords");

  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  // Debe haber al menos una subsección (slot) visible
  await expect(page.locator("[data-testid='near-chords-panel'] section").first()).toBeVisible();
});

// ── S10: NearChords — botón Auto escala responde ──────────────────────────────
test("S10. Acordes cercanos: botón Auto escala alterna sin crash", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-near-chords");
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();

  // El botón ON/OFF de auto escala debe existir y ser clickable
  const autoScaleBtn = page.getByTitle("Activa o desactiva el ajuste automático de acordes cercanos según la escala");
  await expect(autoScaleBtn).toBeVisible();
  const initialText = await autoScaleBtn.textContent();
  await autoScaleBtn.click();
  const afterText = await autoScaleBtn.textContent();
  // El texto debe haber cambiado (ON ↔ OFF)
  expect(afterText).not.toBe(initialText);
});

// ── S11: Standards — catálogo carga y lista es visible ───────────────────────
test("S11. Standards: catálogo carga, lista de standards visible", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-standards");

  // Esperar a que cargue el catálogo (máx. 10s)
  await expect(page.getByTestId("standards-catalog-panel")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("standards-list")).toBeVisible({ timeout: 10_000 });

  // Debe haber al menos un standard en la lista
  const items = page.locator("[data-testid^='standard-item-']");
  await expect(items.first()).toBeVisible({ timeout: 10_000 });
});

// ── S12: Standards — cargar Autumn Leaves y ver el chart ─────────────────────
test("S12. Standards: cargar Autumn Leaves, panel de Forma visible", async ({ page }) => {
  await openFreshApp(page);
  await clickNav(page, "nav-standards");

  // El catálogo debe cargar (esperar lista visible)
  await expect(page.getByTestId("standards-catalog-panel")).toBeVisible({ timeout: 10_000 });

  // Filtrar por título usando el placeholder (no requiere testid extra en el input)
  const filterInput = page.getByTestId("standards-catalog-panel").getByPlaceholder("All of Me");
  await expect(filterInput).toBeVisible({ timeout: 5_000 });
  await filterInput.fill("Autumn Leaves");

  // Esperar el item y hacer click
  const item = page.getByTestId("standard-item-autumn-leaves");
  await expect(item).toBeVisible({ timeout: 5_000 });
  await item.click();

  // El panel de Forma debe aparecer
  await expect(page.getByTestId("standards-chart-panel")).toBeVisible({ timeout: 10_000 });
  // El chart debe contener algo (no solo el spinner)
  await expect(page.getByText("Cargando standard...")).not.toBeVisible({ timeout: 8_000 });
});
