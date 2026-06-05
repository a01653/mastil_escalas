import { test, expect } from "@playwright/test";

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function enableManualMode(page) {
  const toggle = page.getByTestId("chord-detect-toggle");
  await toggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();
}

async function applyManualPattern(page, pattern) {
  const patternInput = page.getByTestId("chord-detect-pattern-input");
  await expect(patternInput).toBeVisible();
  await patternInput.fill(pattern);
  await page.getByTestId("chord-detect-apply-btn").click();
}

async function copyDetectedReading(page, namePattern) {
  const nameEl = page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: namePattern }).first();
  await expect(nameEl).toBeVisible({ timeout: 5000 });
  const testId = await nameEl.getAttribute("data-testid");
  const candidateId = testId?.replace(/^detected-chord-name-/, "");
  expect(candidateId, `No se pudo derivar el id del candidato desde ${testId}`).toBeTruthy();

  const copyBtn = page.getByTestId(`detected-copy-${candidateId}`);
  await expect(copyBtn).toBeVisible({ timeout: 3000 });
  await expect(copyBtn).toBeEnabled();
  await copyBtn.click();

  await expect(page.getByTestId("chord-detect-toggle")).not.toBeChecked({ timeout: 3000 });
  await expect(page.getByTestId("voicing-select")).toBeVisible({ timeout: 3000 });
}

async function waitForCopyNoticeToDisappear(page) {
  await expect(page.getByTestId("chord-copy-notice")).toHaveCount(0, { timeout: 5000 });
}

test("78. Copia tertian diferida: el pending se consume una vez y no re-juega al reseleccionar el voicing", async ({ page }) => {
  await goToChords(page);
  await enableManualMode(page);
  await applyManualPattern(page, "xx0212");
  await copyDetectedReading(page, /^D7$/);

  await expect(page.getByTestId("select-structure")).toHaveValue("chord");
  await expect(page.getByTestId("toggle-allow-open-strings")).toBeChecked();
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0212");

  await waitForCopyNoticeToDisappear(page);

  await page.getByTestId("select-structure").selectOption("tetrad");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0212");
  await page.waitForTimeout(600);

  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0212");
});

test("79. Copia tertian diferida: el fallback async completa structure='chord' y allowOpenStrings tras un fallo inicial de catálogo", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/chords-db/**", async (route) => {
    requestCount += 1;
    if (requestCount <= 4) {
      await route.fulfill({
        status: 404,
        contentType: "text/plain",
        body: "blocked for deferred-resolution test",
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });

  await goToChords(page);
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();
  await enableManualMode(page);
  await applyManualPattern(page, "x57565");
  await copyDetectedReading(page, /^Dm7$/);

  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("chord-copy-notice")).toBeVisible();

  await expect(page.getByTestId("select-structure")).toHaveValue("chord", { timeout: 5000 });
  await expect(page.getByTestId("toggle-allow-open-strings")).toBeChecked({ timeout: 5000 });
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x57565");
});

test("80. Copia tertian diferida: si el catálogo no resuelve, no fuerza structure='chord' ni allowOpenStrings", async ({ page }) => {
  await page.route("**/chords-db/**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "catalog unavailable for deferred-resolution test",
    });
  });

  await goToChords(page);
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();
  await enableManualMode(page);
  await applyManualPattern(page, "x57565");
  await copyDetectedReading(page, /^Dm7$/);

  await expect(page.getByTestId("chord-copy-notice")).toBeVisible();
  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();

  await page.waitForTimeout(1800);

  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x57565");
});

test("81. Copia tertian diferida: la respuesta vieja del fallback async no pisa un voicing nuevo", async ({ page }) => {
  let requestCount = 0;
  const delayedRequestUrls = [];
  let releaseDelayedRequests;
  const delayedRequestsBarrier = new Promise((resolve) => {
    releaseDelayedRequests = resolve;
  });

  await page.route("**/chords-db/**", async (route) => {
    requestCount += 1;
    if (requestCount <= 4) {
      await route.fulfill({
        status: 404,
        contentType: "text/plain",
        body: "blocked for deferred-race test",
      });
      return;
    }
    delayedRequestUrls.push(route.request().url());
    await delayedRequestsBarrier;
    await route.continue();
  });

  await goToChords(page);
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();
  await enableManualMode(page);
  await applyManualPattern(page, "x57565");
  await copyDetectedReading(page, /^Dm7$/);

  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("chord-copy-notice")).toBeVisible();
  await expect.poll(() => delayedRequestUrls.length).toBeGreaterThan(0);

  const voicingSelect = page.getByTestId("voicing-select");
  await voicingSelect.selectOption("x5756x");
  await expect(voicingSelect).toHaveValue("x5756x");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x5756x");

  releaseDelayedRequests();

  await waitForCopyNoticeToDisappear(page);
  await page.waitForTimeout(900);

  await expect(page.getByTestId("select-structure")).toHaveValue("tetrad");
  await expect(page.getByTestId("toggle-allow-open-strings")).not.toBeChecked();
  await expect(voicingSelect).toHaveValue("x5756x");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x5756x");
});

test("82. Copia tertian diferida: la consulta de catálogo conserva el bajo real con sufijo _bass", async ({ page }) => {
  const seenCatalogUrls = [];
  await page.route("**/chords-db/**", async (route) => {
    seenCatalogUrls.push(route.request().url());
    await route.continue();
  });

  await goToChords(page);
  await enableManualMode(page);
  await applyManualPattern(page, "x0x232");
  await copyDetectedReading(page, /^D\/A$/);

  await expect(page.getByTestId("select-structure")).toHaveValue("chord");
  await expect(page.getByTestId("toggle-allow-open-strings")).toBeChecked();
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x0x232");
  await expect
    .poll(() => seenCatalogUrls.some((url) => url.includes("/chords-db/D/major_a.json")))
    .toBe(true);
});

test("88. Copia tertian: G/B consulta /chords-db/G/major_b.json con sufijo _bass correcto", async ({ page }) => {
  // x20033 = notas G B D, bajo B → G/B (primary reading verificado con analyzeFrets)
  const seenCatalogUrls = [];
  await page.route("**/chords-db/**", async (route) => {
    seenCatalogUrls.push(route.request().url());
    await route.continue();
  });

  await goToChords(page);
  await enableManualMode(page);
  await applyManualPattern(page, "x20033");
  await copyDetectedReading(page, /^G\/B$/);

  await expect(page.getByTestId("select-structure")).toHaveValue("chord");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x20033");
  await expect
    .poll(() => seenCatalogUrls.some((url) => url.includes("/chords-db/G/major_b.json")))
    .toBe(true);
});

// ── Cobertura de ensureChordDbCatalogVoicings: preferredFrets, cacheErr, cache hit ───────────

async function goToNearChordsTab(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
}

async function enableNearSlot0(page, { tone, quality, structure }) {
  const cb = page.getByTestId("near-slot-0-enabled");
  if (await cb.isVisible()) {
    await cb.evaluate((el) => { if (!el.checked) el.click(); });
  }
  await page.getByTestId("near-slot-0-tone").selectOption(tone);
  await page.getByTestId("near-slot-0-quality").selectOption(quality);
  await page.getByTestId("near-slot-0-structure").selectOption(structure);
}

test("89. ensureChordDbCatalogVoicings: preferredFrets hallado en sufijo general → sufijo _bass no se solicita", async ({ page }) => {
  // xx0232 = D mayor posición raíz (bajo en D, PC 2), verificado con analyzeFrets.
  // Está en D/major.json → la función devuelve tras el primer sufijo sin intentar "major_d".
  const seenUrls = [];
  await page.route("**/chords-db/**", async (route) => {
    seenUrls.push(route.request().url());
    await route.continue();
  });

  await goToChords(page);
  await enableManualMode(page);
  await applyManualPattern(page, "xx0232");
  await copyDetectedReading(page, /^D$/);

  await expect(page.getByTestId("select-structure")).toHaveValue("chord");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("xx0232");

  // El catálogo general sí debe haberse solicitado
  await expect
    .poll(() => seenUrls.some((u) => u.includes("/chords-db/D/major.json")), { timeout: 5000 })
    .toBe(true);

  // Dar margen para requests pendientes tardíos
  await page.waitForTimeout(800);

  // El sufijo _bass ("major_d") nunca debe solicitarse: preferredFrets hallado en el primero
  expect(seenUrls.every((u) => !u.includes("major_d.json"))).toBe(true);
});

test("90. chordDbCacheErr (preload nearChords): sufijo fallido no se reintenta en la misma sesión", async ({ page }) => {
  // El preload de nearChords escribe chordDbCacheErr[key] cuando el fetch falla.
  // Al re-dispararse el preload (chordDbCacheErr cambió en deps), lee cacheErr y salta
  // el sufijo → no hace un segundo fetch para el mismo key.
  let dMajorFetchCount = 0;
  await page.route("**/chords-db/**", async (route) => {
    if (route.request().url().includes("/chords-db/D/major.json")) dMajorFetchCount++;
    await route.fulfill({ status: 404, contentType: "text/plain", body: "cacheErr-test" });
  });

  await goToNearChordsTab(page);
  await enableNearSlot0(page, { tone: "D", quality: "maj", structure: "chord" });

  // Esperar el primer intento fallido (preload escribe chordDbCacheErr["D/major"])
  await expect.poll(() => dMajorFetchCount).toBeGreaterThan(0);

  // Margen para que React propague chordDbCacheErr y el preload re-evalúe
  await page.waitForTimeout(800);
  const countAfterFirstFail = dMajorFetchCount;

  // El preload se re-dispara (dep chordDbCacheErr cambió) pero salta D/major → sin retry
  await page.waitForTimeout(800);
  expect(dMajorFetchCount).toBe(countAfterFirstFail);
});

test("91. ensureChordDbCatalogVoicings: sufijo con chordDbCacheErr se salta; siguiente sufijo sí se intenta", async ({ page }) => {
  // Bloquear D/major.json → nearChords preload falla → chordDbCacheErr["D/major"] se escribe.
  // Al copiar D/A, ensureChordDbCatalogVoicings detecta cacheErr en "major" → continue →
  // intenta "major_a" (no bloqueado).
  //
  // Nota: No se puede distinguir directamente entre "cacheErr skip" y "fetch fallido → catch →
  // continue" porque el loader principal también bloquea D/major.json. La cobertura unitaria
  // exacta quedará en los tests de lookupChordCatalogVoicings (extracción futura).
  const seenUrls = [];
  await page.route("**/chords-db/**", async (route) => {
    const url = route.request().url();
    seenUrls.push(url);
    if (!url.includes("major_a.json") && !url.includes("major_b.json")) {
      await route.fulfill({ status: 404, contentType: "text/plain", body: "blocked" });
    } else {
      await route.continue();
    }
  });

  // Configurar nearChords para que el preload escriba chordDbCacheErr["D/major"]
  await goToNearChordsTab(page);
  await enableNearSlot0(page, { tone: "D", quality: "maj", structure: "chord" });

  await expect
    .poll(() => seenUrls.some((u) => u.includes("/chords-db/D/major.json") && !u.includes("_a")), { timeout: 5000 })
    .toBeTruthy();
  await page.waitForTimeout(500);

  // Copiar D/A: suffixes = ["major", "major_a"]
  // "major" → cacheErr (o 404+catch, mismo resultado: continue) → "major_a" → fetch OK
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();

  await enableManualMode(page);
  await applyManualPattern(page, "x0x232");
  await copyDetectedReading(page, /^D\/A$/);

  // D/major_a.json debe haberse intentado (segundo sufijo alcanzado)
  await expect
    .poll(() => seenUrls.some((u) => u.includes("/chords-db/D/major_a.json")), { timeout: 5000 })
    .toBe(true);
});

test("92. ensureChordDbCatalogVoicings cache hit: segunda copia equivalente no repite fetch de D/major_a.json", async ({ page }) => {
  // Primera copia D/A: fetches D/major.json (guardado en chordDbCache["D/major"]) y
  // D/major_a.json (guardado en chordDbCache["D/major_a"]).
  // Segunda copia D/A: cache hit en "D/major" → la función devuelve inmediatamente
  // sin llegar al sufijo "major_a" → D/major_a.json no se vuelve a pedir.
  let majorAFetchCount = 0;
  await page.route("**/chords-db/**", async (route) => {
    if (route.request().url().includes("/chords-db/D/major_a.json")) majorAFetchCount++;
    await route.continue();
  });

  await goToChords(page);

  // Primera copia: D/major_a.json se fetchea (segundo sufijo, "x0x232" no en D/major)
  const majorAResponsePromise = page.waitForResponse(
    (resp) => resp.url().includes("/chords-db/D/major_a.json"),
    { timeout: 10000 }
  );
  await enableManualMode(page);
  await applyManualPattern(page, "x0x232");
  await copyDetectedReading(page, /^D\/A$/);

  await majorAResponsePromise;
  await page.waitForTimeout(300); // dejar que React procese setChordDbCache

  expect(majorAFetchCount).toBe(1);

  // Segunda copia: cache hit en chordDbCache["D/major"] → sin fetch de D/major_a
  await enableManualMode(page);
  await applyManualPattern(page, "x0x232");
  await copyDetectedReading(page, /^D\/A$/);

  await page.waitForTimeout(800);

  expect(majorAFetchCount).toBe(1);
});
