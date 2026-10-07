/**
 * E2E — cabecera del mástil de Acordes: interruptores con icono (cuerdas al aire,
 * zona anterior) y ventana de trastes (Rango, flechas, Tamaño, intervalo).
 *
 * La ventana FILTRA las posiciones disponibles (no solo sombrea): todas las notas
 * pisadas de cada posición caen en el rango; el traste 0 solo con cuerdas al aire.
 * Estado independiente del de Acordes cercanos y persistido en la configuración.
 */
import { test, expect } from "@playwright/test";

const STORAGE_KEY = "mastil_interactivo_guitarra_config_v1";
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const FRET_CHARS = "0123456789abcdefghijklmnop";

async function freshApp(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function goToChords(page) {
  await freshApp(page);
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("chord-fretboard-header")).toBeVisible();
}

const frettedOf = (pattern) => [...pattern].filter((ch) => ch !== "x").map((ch) => FRET_CHARS.indexOf(ch));

async function optionPatterns(page) {
  const texts = await page.getByTestId("voicing-select").locator("option").allTextContents();
  return texts.map((text) => text.replace(/^\d+\.\s*/, "").replace(/\s*\(.*$/, ""));
}

// Todas las posiciones ofrecidas (y la activa) caben en el rango; el 0 solo con cuerdas al aire.
async function expectAllWithin(page, from, to, { allowOpen = false } = {}) {
  const patterns = await optionPatterns(page);
  const active = await page.getByTestId("active-voicing-pattern").textContent();
  for (const pattern of [...patterns, active].filter(Boolean)) {
    for (const fret of frettedOf(pattern)) {
      if (fret === 0) expect(allowOpen, `${pattern}: traste 0 sin cuerdas al aire`).toBe(true);
      else expect(fret >= from && fret <= to, `${pattern} fuera de ${from}–${to}`).toBe(true);
    }
  }
  return patterns;
}

async function setSize(page, size) {
  await page.getByTestId("chord-window-size").fill(String(size));
  await page.getByTestId("chord-window-size").blur();
}

async function moveTo(page, from) {
  const range = page.getByTestId("chord-window-range");
  for (let i = 0; i < 30; i++) {
    const current = parseInt((await range.textContent()).split("–")[0], 10);
    if (current === from) return;
    await page.getByTestId(current < from ? "chord-window-right" : "chord-window-left").click();
  }
  throw new Error(`no se alcanzó el inicio ${from}`);
}

test("escritorio: la cabecera está justo encima del mástil, sin superponerse, y los interruptores ya no están en el panel", async ({ page }) => {
  await goToChords(page);
  const header = page.getByTestId("chord-fretboard-header");
  await expect(header.getByTestId("toggle-allow-open-strings")).toHaveCount(1);
  await expect(header.getByTestId("toggle-keep-zone")).toHaveCount(1);
  await expect(page.getByTestId("toggle-allow-open-strings")).toHaveCount(1);
  await expect(page.getByTestId("toggle-keep-zone")).toHaveCount(1);
  await expect(page.getByText("Permitir cuerdas al aire", { exact: true })).toHaveCount(0);
  const hb = await header.boundingBox();
  const bb = await page.getByTestId("fretboard-notes").boundingBox();
  expect(hb.y + hb.height).toBeLessThanOrEqual(bb.y);
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–15");
  await expect(page.getByTestId("chord-window-size")).toHaveValue("15");
});

test("interruptores: nombre accesible, estado activado/desactivado distinguible y ayuda al pasar el cursor o recibir el foco", async ({ page }) => {
  await goToChords(page);
  const openStrings = page.getByRole("checkbox", { name: "Permitir cuerdas al aire" });
  const keepZone = page.getByRole("checkbox", { name: "Mantener zona anterior" });
  await expect(openStrings).not.toBeChecked();
  await expect(keepZone).toBeChecked();
  const header = page.getByTestId("chord-fretboard-header");
  await expect(header.locator("[data-state]").nth(0)).toHaveAttribute("data-state", "off");
  await expect(header.locator("[data-state]").nth(1)).toHaveAttribute("data-state", "on");

  await keepZone.hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Mantener zona anterior: activado" })).toBeVisible();
  await page.mouse.move(0, 0);
  await openStrings.focus();
  await expect(page.getByRole("tooltip").filter({ hasText: "Permitir cuerdas al aire: desactivado" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(openStrings).toBeChecked();
  await expect(header.locator("[data-state]").nth(0)).toHaveAttribute("data-state", "on");
  await expect(page.getByRole("tooltip").filter({ hasText: "Permitir cuerdas al aire: activado" })).toBeVisible();
});

test("el rango filtra las posiciones al cambiar el tamaño y al moverlo; la zona anterior no mueve el rango", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("C");
  const all = await expectAllWithin(page, 1, 15);
  expect(all.length).toBeGreaterThan(4);

  await setSize(page, 4);
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–4");
  const low = await expectAllWithin(page, 1, 4);
  expect(low.length).toBeLessThan(all.length);

  await moveTo(page, 5);
  await expect(page.getByTestId("chord-window-range")).toHaveText("5–8");
  const mid = await expectAllWithin(page, 5, 8);
  expect(mid.length).toBeGreaterThan(0);

  // Mantener zona anterior: busca la posición más cercana dentro del rango y no lo mueve.
  await page.getByTestId("select-tone").selectOption("D");
  await expect(page.getByTestId("chord-window-range")).toHaveText("5–8");
  await expect(page.getByTestId("active-voicing-pattern")).not.toHaveText("");
  await expectAllWithin(page, 5, 8);
});

test("sin posiciones en el rango: mensaje explícito y ninguna posición activa", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("C");
  await setSize(page, 1);
  await moveTo(page, 15);
  await expect(page.getByTestId("chord-window-right")).toBeDisabled();
  await expect(page.getByText("No hay posiciones de este acorde entre los trastes 15 y 15. Mueve el rango o amplía su tamaño.")).toBeVisible();
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("");
  await setSize(page, 4);
  await moveTo(page, 5);
  await expect(page.getByTestId("active-voicing-pattern")).not.toHaveText("");
});

test("cuerdas al aire: el traste 0 entra aunque el rango empiece en el 1; sin el interruptor no", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("E");
  await setSize(page, 3);
  await moveTo(page, 1);
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–3");
  expect(await expectAllWithin(page, 1, 3)).toHaveLength(0);
  await page.getByTestId("toggle-allow-open-strings").check();
  const withOpen = await expectAllWithin(page, 1, 3, { allowOpen: true });
  expect(withOpen.length).toBeGreaterThan(0);
  expect(withOpen.some((pattern) => frettedOf(pattern).includes(0))).toBe(true);
});

test("persistencia: el rango se guarda y se restaura; una configuración antigua sin rango usa todo el mástil", async ({ page }) => {
  await goToChords(page);
  await setSize(page, 4);
  await moveTo(page, 5);
  await expect(page.getByTestId("chord-window-range")).toHaveText("5–8");
  await page.waitForTimeout(400);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), STORAGE_KEY);
  expect(stored.config).toMatchObject({ chordWindowStart: 5, chordWindowSize: 4 });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("chord-window-range")).toHaveText("5–8");
  await expect(page.getByTestId("chord-window-size")).toHaveValue("4");

  const appVersion = stored.appVersion;
  await page.evaluate(([key, version]) => {
    window.localStorage.setItem(key, JSON.stringify({ version: 1, appVersion: version, config: { chordRootPc: 0, showBoards: { chords: true } } }));
  }, [STORAGE_KEY, appVersion]);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–15");
});

test("Acordes cercanos conserva su propio rango y sus controles", async ({ page }) => {
  await goToChords(page);
  await setSize(page, 4);
  await moveTo(page, 5);
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-window-range")).toHaveText("1–6");
  await page.getByTestId("near-window-right").click();
  await expect(page.getByTestId("near-window-range")).toHaveText("2–7");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("chord-window-range")).toHaveText("5–8");
});

test.describe("móvil", () => {
  test.use({ viewport: MOBILE_VIEWPORT, hasTouch: true });

  test("la cabecera cabe sin desbordar, queda encima del mástil y su ayuda se consulta pulsando ⓘ", async ({ page }) => {
    await freshApp(page);
    await page.getByTestId("mobile-nav-chords").click();
    const header = page.getByTestId("chord-fretboard-header");
    await expect(header).toBeVisible();
    // En móvil solo quedan «Mástil ⓘ» y los dos iconos: sin fila de rango.
    await expect(header.getByTestId("toggle-allow-open-strings")).toHaveCount(1);
    await expect(header.getByTestId("toggle-keep-zone")).toHaveCount(1);
    for (const id of ["controls", "left", "right", "size", "range", "full"]) await expect(page.getByTestId(`chord-window-${id}`)).toHaveCount(0);
    await expect(header.getByText("Rango", { exact: true })).toHaveCount(0);
    await expect(header.getByText("Todo el mástil", { exact: true })).toHaveCount(0);
    await header.scrollIntoViewIfNeeded();
    const hb = await header.boundingBox();
    const bb = await page.getByTestId("fretboard-notes").boundingBox();
    expect(hb.y + hb.height).toBeLessThanOrEqual(bb.y);
    expect(hb.x + hb.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await header.getByLabel("Información sobre Mástil").tap();
    // El aviso usa párrafos; la ayuda del cursor (span role=tooltip) sigue oculta en móvil.
    await expect(page.locator("p").filter({ hasText: "permite el traste 0 en las posiciones" })).toBeVisible();
    await expect(page.locator("p").filter({ hasText: "En móvil se muestran las posiciones de todo el mástil" })).toBeVisible();
    await page.getByTitle("Cerrar información").tap();
  });
});

test("«Todo el mástil» tras reducir y mover: vuelve a 1–15 sin tocar acorde, Dist ni interruptores, y se guarda", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("C");
  await page.getByTestId("toggle-allow-open-strings").check();
  await page.getByTestId("toggle-keep-zone").uncheck();
  await page.getByTestId("select-dist").selectOption("5");
  await setSize(page, 4);
  await moveTo(page, 5);
  await expect(page.getByTestId("chord-window-range")).toHaveText("5–8");

  await page.getByTestId("chord-window-full").click();
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–15");
  await expect(page.getByTestId("chord-window-size")).toHaveValue("15");
  await expect(page.getByTestId("select-tone")).toHaveValue("C");
  await expect(page.getByTestId("select-dist")).toHaveValue("5");
  await expect(page.getByTestId("toggle-allow-open-strings")).toBeChecked();
  await expect(page.getByTestId("toggle-keep-zone")).not.toBeChecked();
  const patterns = await expectAllWithin(page, 1, 15, { allowOpen: true });
  expect(patterns.some((pattern) => frettedOf(pattern).some((fret) => fret > 8 || (fret > 0 && fret < 5)))).toBe(true);

  // Mismo estado que la configuración inicial, guardado con la persistencia habitual.
  await page.waitForTimeout(400);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), STORAGE_KEY);
  expect(stored.config).toMatchObject({ chordWindowStart: 1, chordWindowSize: 24 });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–15");
  await expect(page.getByTestId("select-dist")).toHaveValue("5");
});

test("«Todo el mástil» tras solo mover (0–15) y tras solo reducir (1–6)", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("chord-window-left").click();
  await expect(page.getByTestId("chord-window-range")).toHaveText("0–15");
  await page.getByTestId("chord-window-full").click();
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–15");
  await setSize(page, 6);
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–6");
  await page.getByTestId("chord-window-full").click();
  await expect(page.getByTestId("chord-window-range")).toHaveText("1–15");
  await expect(page.getByTestId("chord-window-size")).toHaveValue("15");
});

test("un rango reducido en escritorio no limita las posiciones en móvil y se vuelve a aplicar al regresar a escritorio", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("select-tone").selectOption("C");
  const fullList = await optionPatterns(page);
  await setSize(page, 4);
  await moveTo(page, 5);
  await expect(page.getByTestId("chord-window-range")).toHaveText("5–8");
  const narrowList = await expectAllWithin(page, 5, 8);
  expect(narrowList.length).toBeLessThan(fullList.length);

  // Móvil: sin fila de rango y con las posiciones de todo el mástil (mismos demás filtros).
  await page.setViewportSize(MOBILE_VIEWPORT);
  const header = page.getByTestId("chord-fretboard-header");
  await expect(header).toBeVisible();
  await expect(page.getByTestId("chord-window-controls")).toHaveCount(0);
  await expect.poll(async () => (await optionPatterns(page)).slice().sort().join("|")).toBe(fullList.slice().sort().join("|"));
  const mobileList = await optionPatterns(page);
  expect(mobileList.some((pattern) => frettedOf(pattern).some((fret) => fret > 8 || (fret > 0 && fret < 5)))).toBe(true);

  // Escritorio otra vez: el rango guardado se conserva y vuelve a filtrar.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByTestId("chord-window-range")).toHaveText("5–8");
  await expect(page.getByTestId("chord-window-size")).toHaveValue("4");
  await expect.poll(async () => (await optionPatterns(page)).length).toBe(narrowList.length);
  await expectAllWithin(page, 5, 8);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), STORAGE_KEY);
  expect(stored.config).toMatchObject({ chordWindowStart: 5, chordWindowSize: 4 });
});
