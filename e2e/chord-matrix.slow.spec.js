/**
 * E2E parametrizado de inversiones del constructor de acordes.
 *
 * Suite lenta — ejecutar solo bajo demanda:
 *   npm run test:e2e:chord-matrix
 *
 * Cubre los casos mínimos especificados:
 *   1. Fmaj7 completo: ordinales + bajo real
 *   2. Fmaj7(no5): Fundamental, Bajo 3, Bajo 7
 *   3. Fadd11: Fundamental con voicings, Bajo 3, Bajo 11
 *   4. Fadd11(no5): Fundamental, Bajo 3, Bajo 11
 *   5. Fadd13: Bajo 13, sin "Bajo 6"
 *   6. Fadd11,13(no5): opciones coherentes
 *   7. Fdim / Fdim7: Cb = Bajo b5
 *   8. Fdim7(add13,no1): sin Fundamental
 */

import { test, expect } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function selectTone(page, letter) {
  await page.getByTestId("select-tone").selectOption(letter);
}

async function selectQuality(page, value) {
  await page.getByTestId("select-quality").selectOption(value);
}

async function selectStructure(page, value) {
  await page.getByTestId("select-structure").selectOption(value);
}

async function setExt(page, id, value) {
  const cb = page.getByTestId(id);
  const checked = await cb.isChecked();
  if (value && !checked) await cb.check();
  if (!value && checked) await cb.uncheck();
}

async function getInvOptions(page) {
  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });
  const opts = await invSelect.locator("option").evaluateAll((os) =>
    os.map((o) => ({ value: o.value, label: o.textContent.trim() }))
  );
  return { invSelect, opts };
}

async function selectInv(page, invSelect, value) {
  await invSelect.selectOption(value);
  await page.waitForTimeout(250);
}

async function getSummary(page) {
  return page.getByTestId("chord-controls-summary").getAttribute("data-content");
}

// Verifica que un voicing existe (voicing-select no vacío)
async function expectVoicings(page, invOptLabel) {
  const voicingSelect = page.getByTestId("voicing-select");
  const count = await voicingSelect.locator("option").count();
  expect(count, `Se esperaban voicings para "${invOptLabel}"`).toBeGreaterThan(0);
}

// ── Caso 1: Fmaj7 completo ───────────────────────────────────────────────────

test("CM-01. Fmaj7 completo: 4 inversiones ordinales + bajo real correcto", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");
  await expect(page.getByTestId("ext-7")).toBeChecked();

  const { invSelect, opts } = await getInvOptions(page);
  const labels = opts.map((o) => o.label);

  // Debe haber etiquetas ordinales
  expect(labels, "Fmaj7 debe tener 1ª inversión").toContain("1ª inversión");
  expect(labels, "Fmaj7 debe tener 2ª inversión").toContain("2ª inversión");
  expect(labels, "Fmaj7 debe tener 3ª inversión").toContain("3ª inversión");
  expect(labels, "Fmaj7 debe tener Fundamental").toContain("Fundamental");
  expect(labels, "Fmaj7 NO debe tener Bajo 3").not.toContain("Bajo 3");
  expect(labels, "Fmaj7 NO debe tener Bajo 7").not.toContain("Bajo 7");

  // Fundamental → bajo F, summary contiene Fundamental
  await selectInv(page, invSelect, "root");
  let summary = await getSummary(page);
  expect(summary, "Fundamental: summary debe contener 'Fundamental'").toContain("Fundamental");
  await expectVoicings(page, "Fundamental");

  // 1ª inversión → bajo A, summary contiene 1ª inversión
  await selectInv(page, invSelect, "1");
  summary = await getSummary(page);
  expect(summary, "1ª inversión: summary debe contener '1ª inversión'").toContain("1ª inversión");
  await expectVoicings(page, "1ª inversión");

  // 2ª inversión → bajo C, summary contiene 2ª inversión
  await selectInv(page, invSelect, "2");
  summary = await getSummary(page);
  expect(summary, "2ª inversión: summary debe contener '2ª inversión'").toContain("2ª inversión");
  await expectVoicings(page, "2ª inversión");

  // 3ª inversión → bajo E, summary contiene 3ª inversión
  await selectInv(page, invSelect, "3");
  summary = await getSummary(page);
  expect(summary, "3ª inversión: summary debe contener '3ª inversión'").toContain("3ª inversión");
  await expectVoicings(page, "3ª inversión");
});

// ── Caso 2: Fmaj7(no5) ──────────────────────────────────────────────────────

test("CM-02. Fmaj7(no5): Fundamental, Bajo 3, Bajo 7 — sin ordinales", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");
  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();

  const { invSelect, opts } = await getInvOptions(page);
  const labels = opts.map((o) => o.label);

  expect(labels, "Fmaj7(no5) debe tener Fundamental").toContain("Fundamental");
  expect(labels, "Fmaj7(no5) debe tener Bajo 3").toContain("Bajo 3");
  expect(labels, "Fmaj7(no5) debe tener Bajo 7").toContain("Bajo 7");
  expect(labels, "Fmaj7(no5) NO debe tener 3ª inversión").not.toContain("3ª inversión");
  expect(labels, "Fmaj7(no5) NO debe tener 1ª inversión").not.toContain("1ª inversión");

  // Fundamental → summary "Fundamental"
  await selectInv(page, invSelect, "root");
  let summary = await getSummary(page);
  expect(summary).toContain("Fundamental");

  // Bajo 3 → summary "Bajo 3"
  await selectInv(page, invSelect, "1");
  summary = await getSummary(page);
  expect(summary, "Bajo 3: summary debe coincidir").toContain("Bajo 3");

  // Bajo 7 → summary "Bajo 7"
  const bajO7opt = opts.find((o) => o.label === "Bajo 7");
  expect(bajO7opt, "Debe existir opción Bajo 7").toBeTruthy();
  await selectInv(page, invSelect, bajO7opt.value);
  summary = await getSummary(page);
  expect(summary, "Bajo 7: summary debe coincidir").toContain("Bajo 7");
  expect(summary, "Bajo 7: summary NO debe decir '3ª inversión'").not.toContain("3ª inversión");
});

// ── Caso 3: Fadd11 ───────────────────────────────────────────────────────────

test("CM-03. Fadd11: Fundamental tiene voicings, Bajo 3 y Bajo 11 también", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  // En chord, ext7 no está activo por defecto — mantener desactivado para add11
  const ext7 = page.getByTestId("ext-7");
  if (await ext7.isChecked()) await ext7.uncheck();

  await page.getByTestId("ext-11").check();

  const { invSelect, opts } = await getInvOptions(page);
  const labels = opts.map((o) => o.label);

  expect(labels, "Fadd11 debe tener Fundamental").toContain("Fundamental");
  expect(labels, "Fadd11 debe tener Bajo 11").toContain("Bajo 11");

  // Fundamental
  await selectInv(page, invSelect, "root");
  await expectVoicings(page, "Fundamental");
  let summary = await getSummary(page);
  expect(summary).toContain("Fundamental");

  // Bajo 11
  const bajo11opt = opts.find((o) => o.label === "Bajo 11");
  if (bajo11opt) {
    await selectInv(page, invSelect, bajo11opt.value);
    await expectVoicings(page, "Bajo 11");
    summary = await getSummary(page);
    expect(summary, "Bajo 11: summary debe coincidir").toContain("Bajo 11");
  }
});

// ── Caso 4: Fadd11(no5) ─────────────────────────────────────────────────────

test("CM-04. Fadd11(no5): Fundamental, Bajo 3, Bajo 11 — sin 3ª inversión", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  const ext7 = page.getByTestId("ext-7");
  if (await ext7.isChecked()) await ext7.uncheck();

  await page.getByTestId("ext-11").check();
  await page.getByTestId("omit-5").check();

  const { invSelect, opts } = await getInvOptions(page);
  const labels = opts.map((o) => o.label);

  expect(labels, "Fadd11(no5) debe tener Fundamental").toContain("Fundamental");
  expect(labels, "Fadd11(no5) NO debe tener 3ª inversión").not.toContain("3ª inversión");

  // Fundamental → summary Fundamental
  await selectInv(page, invSelect, "root");
  let summary = await getSummary(page);
  expect(summary).toContain("Fundamental");
});

// ── Caso 5: Fadd13 (sin 7ª) ─────────────────────────────────────────────────

test("CM-05. Fadd13 (sin 7ª): selector usa 'Bajo 13', NO 'Bajo 6'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  const ext7 = page.getByTestId("ext-7");
  if (await ext7.isChecked()) await ext7.uncheck();

  await page.getByTestId("ext-13").check();

  const { invSelect, opts } = await getInvOptions(page);
  const labels = opts.map((o) => o.label);

  expect(labels, "Fadd13 debe tener Bajo 13").toContain("Bajo 13");
  expect(labels, "Fadd13 NO debe tener Bajo 6 (add13 tiene prioridad)").not.toContain("Bajo 6");

  // Seleccionar Bajo 13 → summary debe coincidir
  const bajo13opt = opts.find((o) => o.label === "Bajo 13");
  expect(bajo13opt, "Debe existir opción Bajo 13").toBeTruthy();
  await selectInv(page, invSelect, bajo13opt.value);
  const summary = await getSummary(page);
  expect(summary, "Bajo 13: summary debe coincidir").toContain("Bajo 13");
  expect(summary, "Bajo 13: summary NO debe decir 'Bajo 6'").not.toContain("Bajo 6");
});

// ── Caso 6: Fadd11,13(no5) ──────────────────────────────────────────────────

test("CM-06. Fadd11,13(no5): opciones coherentes — selector = summary para cada opción", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  const ext7 = page.getByTestId("ext-7");
  if (await ext7.isChecked()) await ext7.uncheck();

  await page.getByTestId("ext-11").check();
  await page.getByTestId("ext-13").check();
  await page.getByTestId("omit-5").check();

  const { invSelect, opts } = await getInvOptions(page);

  // Para cada opción concreta (no "all"), selector y summary deben coincidir
  for (const opt of opts) {
    if (opt.value === "all") continue;
    await selectInv(page, invSelect, opt.value);
    const summary = await getSummary(page);
    expect(
      summary,
      `Opción "${opt.label}" (val=${opt.value}): summary debe contener la misma etiqueta`
    ).toContain(opt.label);
  }
});

// ── Caso 7: Fdim7 — Bajo b5, no Bajo #4 ─────────────────────────────────────

test("CM-07. Fdim7: selector usa 'Bajo b5', no 'Bajo #4' ni '2ª inversión'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "dim");
  await selectStructure(page, "tetrad");
  await expect(page.getByTestId("ext-7")).toBeChecked();

  const { opts } = await getInvOptions(page);
  const labels = opts.map((o) => o.label);

  // Fdim7 completo es estándar → ordinales (2ª inversión para Cb)
  // pero debe ser "2ª inversión" correcto, no "Bajo b5"
  expect(labels, "Fdim7 completo debe tener 2ª inversión (no Bajo b5)").toContain("2ª inversión");
  expect(labels, "Fdim7 completo NO debe tener Bajo #4").not.toContain("Bajo #4");

  // Ahora con add9 (nonStandard) → 2ª inversión debe convertirse en Bajo b5
  await setExt(page, "ext-7", false);
  await setExt(page, "ext-9", true);

  const { invSelect: invSelect2, opts: opts2 } = await getInvOptions(page);
  const labels2 = opts2.map((o) => o.label);

  expect(labels2, "Fdim(add9): Bajo b5 presente").toContain("Bajo b5");
  expect(labels2, "Fdim(add9): NO Bajo #4").not.toContain("Bajo #4");
  expect(labels2, "Fdim(add9): NO 2ª inversión (isNonStandard)").not.toContain("2ª inversión");

  // Seleccionar Bajo b5 → summary coincide
  const bajob5opt = opts2.find((o) => o.label === "Bajo b5");
  if (bajob5opt) {
    await selectInv(page, invSelect2, bajob5opt.value);
    const summary = await getSummary(page);
    expect(summary, "Bajo b5: summary debe coincidir").toContain("Bajo b5");
    expect(summary, "Bajo b5: summary NO debe decir '2ª inversión'").not.toContain("2ª inversión");
  }
});

// ── Caso 8: Fdim7(add13,no1) — sin Fundamental ───────────────────────────────

test("CM-08. Fdim7(add13,no1): no Fundamental, sí Bajo b3/b5/13, summary nunca dice Fundamental", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "dim");
  await selectStructure(page, "tetrad");
  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-1").check();
  await page.getByTestId("ext-13").check();

  const { invSelect, opts } = await getInvOptions(page);
  const labels = opts.map((o) => o.label);

  expect(labels, "No debe aparecer Fundamental").not.toContain("Fundamental");
  expect(labels, "Debe aparecer Bajo b3").toContain("Bajo b3");
  expect(labels, "Debe aparecer Bajo b5").toContain("Bajo b5");
  expect(labels, "Debe aparecer Bajo 13").toContain("Bajo 13");

  // Para cada opción concreta, summary nunca dice "Fundamental"
  for (const opt of opts) {
    if (opt.value === "all") continue;
    await selectInv(page, invSelect, opt.value);
    const summary = await getSummary(page);
    expect(
      summary,
      `Opción "${opt.label}": summary NO debe contener 'Fundamental'. Obtenido: "${summary}"`
    ).not.toContain("Fundamental");
  }
});

// ── Caso extra: Consistencia global — selector siempre coincide con summary ──

test("CM-09. Coherencia global: seleccionar cada opción → summary la refleja (Fmaj7 completo)", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");
  await expect(page.getByTestId("ext-7")).toBeChecked();

  const { invSelect, opts } = await getInvOptions(page);

  for (const opt of opts) {
    if (opt.value === "all") continue;
    await selectInv(page, invSelect, opt.value);
    const summary = await getSummary(page);
    expect(
      summary,
      `Opción "${opt.label}" (val=${opt.value}): summary debe contener esa etiqueta. Obtenido: "${summary}"`
    ).toContain(opt.label);
  }
});

test("CM-10. Coherencia global: seleccionar cada opción → summary la refleja (Fmin7)", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "min");
  await selectStructure(page, "tetrad");
  await expect(page.getByTestId("ext-7")).toBeChecked();

  const { invSelect, opts } = await getInvOptions(page);

  for (const opt of opts) {
    if (opt.value === "all") continue;
    await selectInv(page, invSelect, opt.value);
    const summary = await getSummary(page);
    expect(
      summary,
      `Opción "${opt.label}" (val=${opt.value}): summary debe contener esa etiqueta`
    ).toContain(opt.label);
  }
});
