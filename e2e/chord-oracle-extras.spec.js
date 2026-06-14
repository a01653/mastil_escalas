import { test, expect } from "@playwright/test";

// Bloque "Lecturas extra del oráculo": candidatos del oráculo que el lector
// real no devuelve. Solo informativos — sin radio button, sin "Copiar en Acorde".
// El bloque está cerrado por defecto y se computa de forma lazy al expandir.
// Al cambiar el voicing, el estado se invalida automáticamente.

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

async function applyPattern(page, pattern) {
  await page.getByTestId("chord-detect-pattern-input").fill(pattern);
  await page.getByTestId("chord-detect-apply-btn").click();
  await expect(page.locator("[data-testid^='detected-chord-name-']").first()).toBeVisible();
}

test("OE-1. el toggle 'Lecturas extra del oráculo' existe y está cerrado por defecto (x02440)", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyPattern(page, "x02440");

  const toggle = page.getByTestId("detected-oracle-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toContainText("Lecturas extra del oráculo");

  // Cerrado por defecto: la lista no se muestra.
  await expect(page.getByTestId("detected-oracle-list")).toHaveCount(0);
});

test("OE-2. al abrir, los extras aparecen y no duplican lecturas de 'Posibles acordes' ni de 'Lecturas avanzadas' (x02440)", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyPattern(page, "x02440");

  // Recoger nombres de lecturas normales + avanzadas antes de abrir oráculo.
  const mainNames = new Set();
  const normalNames = page.getByTestId("detected-chord-list").locator("[data-testid^='detected-chord-name-']");
  const count = await normalNames.count();
  for (let i = 0; i < count; i++) {
    mainNames.add((await normalNames.nth(i).textContent())?.trim());
  }

  // Abrir avanzadas si existen, recoger también sus nombres.
  const advToggle = page.getByTestId("detected-advanced-toggle");
  if ((await advToggle.count()) > 0) {
    await advToggle.click();
    const advNames = page.getByTestId("detected-advanced-list").locator("[data-testid^='detected-chord-name-']");
    const advCount = await advNames.count();
    for (let i = 0; i < advCount; i++) {
      mainNames.add((await advNames.nth(i).textContent())?.trim());
    }
  }

  // Abrir extras del oráculo.
  await page.getByTestId("detected-oracle-toggle").click();
  const oracleList = page.getByTestId("detected-oracle-list");
  await expect(oracleList).toBeVisible();

  // Si hay extras, ninguno debe duplicar un nombre ya visto.
  const oracleNames = oracleList.locator("[data-testid^='detected-oracle-name-']");
  const oracleCount = await oracleNames.count();
  if (oracleCount > 0) {
    for (let i = 0; i < oracleCount; i++) {
      const extra = oracleList.locator(`[data-testid='detected-oracle-name-${i}']`);
      // El nombre es el primer <span> con font-bold.
      const nameText = (await extra.textContent())?.trim();
      // No debe coincidir con ninguna lectura que el lector ya muestra.
      expect(mainNames.has(nameText)).toBe(false);
    }
  }
});

test("OE-3. los extras del oráculo no tienen radio button ni botón 'Copiar en Acorde' (x02440)", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyPattern(page, "x02440");

  await page.getByTestId("detected-oracle-toggle").click();
  const oracleList = page.getByTestId("detected-oracle-list");
  await expect(oracleList).toBeVisible();

  // Sin radio buttons en el bloque del oráculo.
  await expect(oracleList.locator("input[type='radio']")).toHaveCount(0);

  // Sin botones "Copiar en Acorde" en el bloque del oráculo.
  const copyButtons = oracleList.locator("button", { hasText: "Copiar en Acorde" });
  await expect(copyButtons).toHaveCount(0);
});

test("OE-4. Primary no cambia al abrir el bloque de extras del oráculo (x02440)", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyPattern(page, "x02440");

  // Capturar el Primary antes de abrir el oráculo.
  const principalBadge = page.locator("[data-testid^='detected-chord-principal-']");
  await expect(principalBadge).toHaveCount(1);
  const principalId = (await principalBadge.getAttribute("data-testid")).replace("detected-chord-principal-", "");

  // Abrir extras del oráculo.
  await page.getByTestId("detected-oracle-toggle").click();
  await expect(page.getByTestId("detected-oracle-list")).toBeVisible();

  // El Primary no debe haber cambiado.
  await expect(page.getByTestId(`detected-chord-principal-${principalId}`)).toBeVisible();
  await expect(page.locator("[data-testid^='detected-chord-principal-']")).toHaveCount(1);
});

test("OE-5. voicing sin extras: el toggle sigue visible y al abrir muestra mensaje explicativo (x32010 = C mayor)", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyPattern(page, "x32010");

  // El toggle siempre aparece cuando hay lecturas activas.
  const toggle = page.getByTestId("detected-oracle-toggle");
  await expect(toggle).toBeVisible();

  // Al pulsar: no desaparece, sino que muestra el mensaje.
  await toggle.click();
  const oracleList = page.getByTestId("detected-oracle-list");
  await expect(oracleList).toBeVisible();
  await expect(page.getByTestId("detected-oracle-empty")).toBeVisible();
  await expect(page.getByTestId("detected-oracle-empty")).toContainText("No hay lecturas extra del oráculo para este voicing.");

  // El toggle sigue visible (no desaparece al no tener extras).
  await expect(toggle).toBeVisible();
  await expect(toggle).toContainText("0");

  // Se puede volver a cerrar.
  await toggle.click();
  await expect(page.getByTestId("detected-oracle-list")).toHaveCount(0);
});

test("OE-6. x42200 con referencia B: los extras del oráculo no migran a 'Posibles acordes' ni a 'Lecturas avanzadas' y la referencia no los contamina", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyPattern(page, "x42200");

  // Estado inicial sin referencia: abrir extras del oráculo y capturar sus nombres.
  const toggle = page.getByTestId("detected-oracle-toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();

  const oracleList = page.getByTestId("detected-oracle-list");
  await expect(oracleList).toBeVisible();

  const initialExtrasCount = await oracleList.locator("[data-testid^='detected-oracle-name-']").count();
  const initialExtrasNames = new Set();
  for (let i = 0; i < initialExtrasCount; i++) {
    const t = (await oracleList.locator(`[data-testid='detected-oracle-name-${i}']`).textContent())?.trim();
    if (t) initialExtrasNames.add(t);
  }

  // Activar referencia B.
  await page.getByTestId("chord-ref-enabled").check();
  await page.getByTestId("chord-ref-natural").selectOption("B");
  await page.waitForTimeout(300);

  // Los extras del oráculo no deben haberse movido a "Posibles acordes".
  const mainList = page.getByTestId("detected-chord-list");
  for (const extraName of initialExtrasNames) {
    // El nombre extra NO debe aparecer en el bloque normal de Posibles acordes
    // fuera del bloque del oráculo.
    const inNormal = mainList
      .locator("[data-testid^='detected-chord-name-']")
      .filter({ hasText: extraName });
    // Solo puede aparecer en el bloque del oráculo, no en los normales.
    // Verificamos que NO hay radio button asociado a ese nombre (lo que indicaría
    // que está en la lista normal seleccionable).
    if ((await inNormal.count()) > 0) {
      // Si aparece en el DOM del listado, no debe tener radio button (es del oráculo).
      const row = inNormal.first().locator("../../..");
      await expect(row.locator("input[type='radio']")).toHaveCount(0);
    }
  }

  // Los extras del oráculo no deben haberse movido a "Lecturas avanzadas".
  const advancedSection = page.getByTestId("detected-advanced-section");
  if ((await advancedSection.count()) > 0) {
    const advToggle = page.getByTestId("detected-advanced-toggle");
    const isExpanded = (await advToggle.getAttribute("aria-expanded")) === "true";
    if (!isExpanded) await advToggle.click();
    const advList = page.getByTestId("detected-advanced-list");
    for (const extraName of initialExtrasNames) {
      await expect(advList).not.toContainText(extraName);
    }
  }

  // El bloque del oráculo sigue visible con el mismo conteo.
  await expect(oracleList).toBeVisible();
  const afterExtrasCount = await oracleList.locator("[data-testid^='detected-oracle-name-']").count();
  expect(afterExtrasCount).toBe(initialExtrasCount);
});

test("OE-7. cambiar el voicing resetea el bloque del oráculo (de x02440 a x42200)", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyPattern(page, "x02440");

  // Abrir oráculo con el primer voicing.
  await page.getByTestId("detected-oracle-toggle").click();
  await expect(page.getByTestId("detected-oracle-list")).toBeVisible();

  // Cambiar voicing: el bloque debe cerrarse y resetearse.
  await page.getByTestId("chord-detect-pattern-input").fill("x42200");
  await page.getByTestId("chord-detect-apply-btn").click();
  await expect(page.locator("[data-testid^='detected-chord-name-']").first()).toBeVisible();

  // El bloque del oráculo debe haberse cerrado.
  await expect(page.getByTestId("detected-oracle-list")).toHaveCount(0);

  // El toggle sigue visible (para el nuevo voicing).
  await expect(page.getByTestId("detected-oracle-toggle")).toBeVisible();

  // Al abrir de nuevo, el count del badge se muestra (oráculo recalculado).
  await page.getByTestId("detected-oracle-toggle").click();
  await expect(page.getByTestId("detected-oracle-list")).toBeVisible();
});

test("OE-8. 034030 no muestra badge 'sin' incompleto y deduplica variantes G equivalentes", async ({ page }) => {
  await goToChords(page);
  await enableDetectMode(page);
  await applyPattern(page, "034030");

  await page.getByTestId("detected-oracle-toggle").click();
  const oracleList = page.getByTestId("detected-oracle-list");
  await expect(oracleList).toBeVisible();

  await expect(oracleList.getByText(/^sin$/)).toHaveCount(0);
  await expect(oracleList).toContainText("Gmaj7(add11,add13,no3)/E");
  await expect(oracleList).toContainText("sin 3");
  await expect(oracleList).not.toContainText("Gsus4(add13,7)/E");
});
