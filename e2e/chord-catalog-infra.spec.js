/**
 * E2E — Cobertura de infraestructura de catálogo JSON y caché compartida.
 *
 * Protege el comportamiento actual de:
 *   - chordDb / chordDbStatus / chordDbError (loader principal)
 *   - chordDbCache / chordDbCacheErr (caché compartida)
 *   - Preload de nearChords (useEffect ~1680-1748 en App.jsx)
 *
 * No valida lógica musical ni voicings concretos; solo la infraestructura de
 * carga, error, caché y coexistencia de paneles.
 *
 * Tests:
 *   83 — Loader lento: sin falso error durante la carga; voicings al final
 *   84 — Loader permanente error: aparece error en rojo, no queda en loading
 *   85 — nearChords preload: slot activo D major → fetch de D/major.json
 *   86 — nearChords preload cache hit: mismo acorde en dos slots → 1 solo fetch
 *   87 — nearChords preload activo no rompe el panel Acordes principal
 */

import { test, expect } from "@playwright/test";

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function goToNearChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
}

async function enableSlot(page, idx) {
  const cb = page.getByTestId(`near-slot-${idx}-enabled`);
  if (await cb.isVisible()) {
    await cb.evaluate((el) => { if (!el.checked) el.click(); });
  }
}

// ── Test 83 ───────────────────────────────────────────────────────────────────
test("83. Catálogo lento: no aparece error en rojo durante la carga; voicings disponibles al final", async ({ page }) => {
  await page.route("**/chords-db/**", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });

  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("C");
  await page.getByTestId("select-quality").selectOption("maj");
  await page.getByTestId("select-structure").selectOption("chord");

  // Durante la carga el div de error (text-rose-600) no debe estar visible.
  // chordVoicingsResolving=true suprime el emptyMessage; chordDbError es null.
  await expect(page.locator(".text-rose-600")).not.toBeVisible();

  // Tras la carga: voicings disponibles en el select
  await expect
    .poll(
      async () => page.getByTestId("voicing-select").locator("option").count(),
      { timeout: 5000 }
    )
    .toBeGreaterThan(0);
});

// ── Test 84 ───────────────────────────────────────────────────────────────────
test("84. Catálogo inaccesible: aparece error en rojo, no queda en estado loading permanente", async ({ page }) => {
  await page.route("**/chords-db/**", (route) =>
    route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "catalog blocked for test 84",
    })
  );

  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("C");
  await page.getByTestId("select-quality").selectOption("maj");
  await page.getByTestId("select-structure").selectOption("chord");

  // El div de error (text-rose-600) debe aparecer con mensaje no vacío
  await expect(page.locator(".text-rose-600")).toBeVisible({ timeout: 5000 });
  const errorText = await page.locator(".text-rose-600").textContent();
  expect(errorText?.trim().length).toBeGreaterThan(5);
});

// ── Test 85 ───────────────────────────────────────────────────────────────────
test("85. nearChords preload: slot 0 D major dispara fetch de /chords-db/D/major.json", async ({ page }) => {
  const seenUrls = [];
  await page.route("**/chords-db/**", async (route) => {
    seenUrls.push(route.request().url());
    await route.continue();
  });

  await goToNearChords(page);
  await enableSlot(page, 0);
  await page.getByTestId("near-slot-0-tone").selectOption("D");
  await page.getByTestId("near-slot-0-quality").selectOption("maj");
  await page.getByTestId("near-slot-0-structure").selectOption("chord");

  await expect
    .poll(() => seenUrls.some((u) => u.includes("/chords-db/D/major.json")), { timeout: 5000 })
    .toBe(true);
});

// ── Test 86 ───────────────────────────────────────────────────────────────────
test("86. nearChords preload cache hit: mismo acorde en dos slots genera solo 1 fetch", async ({ page }) => {
  let dMajorFetchCount = 0;
  await page.route("**/chords-db/**", async (route) => {
    if (route.request().url().includes("/chords-db/D/major.json")) dMajorFetchCount++;
    await route.continue();
  });

  await goToNearChords(page);

  // Slot 0: D major chord
  await enableSlot(page, 0);
  await page.getByTestId("near-slot-0-tone").selectOption("D");
  await page.getByTestId("near-slot-0-quality").selectOption("maj");
  await page.getByTestId("near-slot-0-structure").selectOption("chord");

  // Esperar a que la respuesta llegue (JSON en cache) antes de configurar slot 1
  await page.waitForResponse(
    (resp) => resp.url().includes("/chords-db/D/major.json"),
    { timeout: 5000 }
  );
  // Dar margen para que React procese el setChordDbCache
  await page.waitForTimeout(200);

  // Slot 1: mismo acorde — debe reutilizar caché, sin nuevo fetch
  await enableSlot(page, 1);
  await page.getByTestId("near-slot-1-tone").selectOption("D");
  await page.getByTestId("near-slot-1-quality").selectOption("maj");
  await page.getByTestId("near-slot-1-structure").selectOption("chord");

  await page.waitForTimeout(800);

  expect(dMajorFetchCount).toBe(1);
});

// ── Test 87 ───────────────────────────────────────────────────────────────────
test("87. nearChords preload activo no impide que el panel Acordes cargue voicings", async ({ page }) => {
  await goToNearChords(page);
  await enableSlot(page, 0);
  await page.getByTestId("near-slot-0-tone").selectOption("G");
  await page.getByTestId("near-slot-0-quality").selectOption("maj");
  await page.getByTestId("near-slot-0-structure").selectOption("chord");

  // Navegar a Acordes y verificar funcionamiento normal
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
  await page.getByTestId("select-tone").selectOption("C");
  await page.getByTestId("select-quality").selectOption("maj");
  await page.getByTestId("select-structure").selectOption("chord");

  await expect(page.getByTestId("voicing-select")).toBeVisible();
  await expect
    .poll(
      async () => page.getByTestId("voicing-select").locator("option").count(),
      { timeout: 6000 }
    )
    .toBeGreaterThan(0);
});
