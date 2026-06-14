import { test, expect } from "@playwright/test";

// El bloque "Posibles acordes" es la fuente para elegir lecturas: marca la
// lectura principal con la pill "Principal" y lista el resto como alternativas.
// Las lecturas avanzadas/contextuales (cuartales, fragmentos, por referencia)
// van en un bloque desplegable cerrado por defecto. No cambia ranking ni Primary.

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function enableDetectMode(page) {
  await page.getByTestId("chord-detect-toggle").check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
}

async function disableKeepPreviousReading(page) {
  const toggle = page.locator("label", { hasText: "Mantener lectura anterior" }).locator("input[type='checkbox']").first();
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
}

test("RA-1. x02440 conserva el Primary y marca la lectura principal con la pill 'Principal'", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await disableKeepPreviousReading(page);

  await page.getByTestId("chord-detect-pattern-input").fill("x02440");
  await page.getByTestId("chord-detect-apply-btn").click();

  // El Primary (primera lectura) no cambia respecto al lector actual.
  const names = page.locator("[data-testid^='detected-chord-name-']");
  await expect(names.first()).toHaveText("Asus2(#11)");

  // Hay una única pill "Principal" y está en la lectura principal.
  const firstId = (await names.first().getAttribute("data-testid")).replace("detected-chord-name-", "");
  await expect(page.getByTestId(`detected-chord-principal-${firstId}`)).toBeVisible();
  await expect(page.locator("[data-testid^='detected-chord-principal-']")).toHaveCount(1);

  // El resto son lecturas alternativas/contextuales: hay más de una.
  expect(await names.count()).toBeGreaterThan(1);
});

test("RA-2. seleccionar otra lectura en 'Posibles acordes' mueve la pill 'Principal'", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await disableKeepPreviousReading(page);

  await page.getByTestId("chord-detect-pattern-input").fill("x02440");
  await page.getByTestId("chord-detect-apply-btn").click();

  const names = page.locator("[data-testid^='detected-chord-name-']");
  // Elige una alternativa (la segunda lectura de la lista).
  const second = names.nth(1);
  const secondId = (await second.getAttribute("data-testid")).replace("detected-chord-name-", "");
  const secondText = (await second.textContent())?.trim();
  await page.getByTestId(`detected-chord-${secondId}`).locator("input[type='radio']").check();

  // La pill "Principal" pasa a esa lectura (y sigue habiendo solo una).
  await expect(page.getByTestId(`detected-chord-principal-${secondId}`)).toBeVisible();
  await expect(page.locator("[data-testid^='detected-chord-principal-']")).toHaveCount(1);
  await expect(page.getByTestId(`detected-chord-name-${secondId}`)).toHaveText(secondText);
});

test("RA-3. el bloque 'Lecturas avanzadas / contextuales' está cerrado por defecto y agrupa la cuartal", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await disableKeepPreviousReading(page);

  await page.getByTestId("chord-detect-pattern-input").fill("x02440");
  await page.getByTestId("chord-detect-apply-btn").click();

  // Toggle visible con el contador de avanzadas (x02440 → 1 cuartal).
  const toggle = page.getByTestId("detected-advanced-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toContainText("Lecturas avanzadas / contextuales");

  // Cerrado por defecto: la lista avanzada no está en el DOM y no se ve la cuartal.
  await expect(page.getByTestId("detected-advanced-list")).toHaveCount(0);
  await expect(page.getByTestId("detected-chord-list")).not.toContainText("Cuartal");

  // Desplegar: aparece la cuartal en la lista avanzada.
  await toggle.click();
  const advList = page.getByTestId("detected-advanced-list");
  await expect(advList).toBeVisible();
  await expect(advList).toContainText("Cuartal");

  // Colapsar: vuelve a cerrarse.
  await toggle.click();
  await expect(page.getByTestId("detected-advanced-list")).toHaveCount(0);
});

test("RA-4. seleccionar una lectura avanzada la convierte en Principal y la saca del bloque", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await disableKeepPreviousReading(page);

  await page.getByTestId("chord-detect-pattern-input").fill("x02440");
  await page.getByTestId("chord-detect-apply-btn").click();

  // El Primary inicial es una lectura principal (no la cuartal).
  await expect(page.locator("[data-testid^='detected-chord-name-']").first()).toHaveText("Asus2(#11)");

  // Desplegar avanzadas y elegir la cuartal.
  await page.getByTestId("detected-advanced-toggle").click();
  const advList = page.getByTestId("detected-advanced-list");
  const quartalName = advList.locator("[data-testid^='detected-chord-name-']").first();
  const qId = (await quartalName.getAttribute("data-testid")).replace("detected-chord-name-", "");
  const qText = (await quartalName.textContent())?.trim();
  await page.getByTestId(`detected-chord-${qId}`).locator("input[type='radio']").check();

  // Pasa a ser Principal (pill única) y, al ser la única avanzada, el bloque desaparece.
  await expect(page.getByTestId(`detected-chord-principal-${qId}`)).toBeVisible();
  await expect(page.locator("[data-testid^='detected-chord-principal-']")).toHaveCount(1);
  await expect(page.getByTestId(`detected-chord-name-${qId}`)).toHaveText(qText);
  await expect(page.getByTestId("detected-advanced-toggle")).toHaveCount(0);
});

test("RA-5. x42200: una lectura solo 'por referencia' no se mueve a avanzadas al cambiar la referencia (hotfix 6.0.59)", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  // NO desactivamos "Mantener lectura anterior": el bug aparece con la selección
  // fijada en otra lectura mientras B9sus4(no5)/C# se vuelve referencePromoted.

  await page.getByTestId("chord-detect-pattern-input").fill("x42200");
  await page.getByTestId("chord-detect-apply-btn").click();

  const list = page.getByTestId("detected-chord-list");
  const b9 = () => list.locator("[data-testid^='detected-chord-name-']").filter({ hasText: "B9sus4" });

  // Fija la selección en Aadd9/C# para que B9sus4 NO sea la lectura seleccionada.
  const aadd9 = list.locator("[data-testid^='detected-chord-name-']").filter({ hasText: "Aadd9" }).first();
  await expect(aadd9).toBeVisible();
  const aadd9Id = (await aadd9.getAttribute("data-testid")).replace("detected-chord-name-", "");
  await page.getByTestId(`detected-chord-${aadd9Id}`).locator("input[type='radio']").check();

  // Sin referencia: B9sus4 ya está en el bloque normal.
  await expect(b9()).toBeVisible();

  // Activa la referencia y ponla en B → B9sus4(no5)/C# se marca referencePromoted.
  await page.getByTestId("chord-ref-enabled").check();
  await page.getByTestId("chord-ref-natural").selectOption("B");
  await page.waitForTimeout(300);

  // La selección sigue en Aadd9 (no saltó a B9sus4): así esta prueba captura la
  // regresión real — B9sus4 está en 'main' por el fix, no por ser el Primary.
  await expect(page.getByTestId(`detected-chord-principal-${aadd9Id}`)).toBeVisible();

  // Regla del hotfix: el bloque avanzado sigue cerrado por defecto y B9sus4 NO se ha
  // escondido en avanzadas solo por estar "por referencia": sigue visible en el normal.
  await expect(page.getByTestId("detected-advanced-list")).toHaveCount(0);
  await expect(b9()).toBeVisible();

  // Al abrir avanzadas, B9sus4 no está ahí (solo cuartales/contextuales reales).
  const toggle = page.getByTestId("detected-advanced-toggle");
  if ((await toggle.count()) > 0) {
    await toggle.click();
    await expect(page.getByTestId("detected-advanced-list")).toBeVisible();
    await expect(page.getByTestId("detected-advanced-list")).not.toContainText("B9sus4");
  }
});
