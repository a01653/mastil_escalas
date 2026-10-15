import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test as playwright } from '@playwright/test';
import { BASE, buildPair, startSite } from './pwa-site.js';

// Navegador, HTTP, builds, service workers y CacheStorage reales. No se interceptan ni simulan peticiones.
const test = playwright.extend({
  site: async ({ baseURL }, provide) => {
    expect(baseURL).toBeTruthy();
    const site = await startSite(builds);
    try { await provide(site); } finally { await site.close(); }
  },
});
test.use({ serviceWorkers: 'allow', viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);
const WAIT = { timeout: 30_000 };
const CONFIG_KEY = 'mastil_interactivo_guitarra_config_v1';
const PRESETS_KEY = 'mastil_interactivo_guitarra_presets_v1';
let workDir, builds;

test.beforeAll(async () => {
  test.setTimeout(240_000);
  workDir = await mkdtemp(join(tmpdir(), 'mastil-pwa-e2e-'));
  builds = await buildPair(resolve('.'), workDir);
});
test.afterAll(async () => { if (workDir) await rm(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

const notice = page => page.getByRole('region', { name: 'Instalación y actualización' });
const update = page => notice(page).getByRole('button', { name: 'Actualizar ahora', exact: true });
const ready = page => expect(notice(page).getByText('Disponible sin conexión.', { exact: true })).toBeVisible(WAIT);
const keys = page => page.evaluate(() => caches.keys());
const stored = (page, key) => page.evaluate(key => localStorage.getItem(key), key);
const marker = page => page.evaluate(() => globalThis.__MASTIL_TEST_BUILD__).catch(() => null);
async function install(page, site) {
  await page.goto(site.url);
  await expect(page.getByTestId('nav-scale')).toBeVisible();
  await ready(page);
  await expect.poll(() => marker(page), WAIT).toBe('A');
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope)).toBe(site.url);
}
async function offerB(page, site) {
  site.serve('B');
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
  await expect(update(page)).toBeVisible(WAIT);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting?.state), WAIT).toBe('installed');
}
async function openStandardOffline(page) {
  await page.getByTestId('nav-standards').click();
  const panel = page.getByTestId('standards-catalog-panel');
  await expect(panel).toBeVisible(WAIT);
  await panel.getByPlaceholder('All of Me').fill('Autumn Leaves');
  await page.getByTestId('standard-item-autumn-leaves').click();
  await expect(page.getByTestId('standards-chart-panel')).toBeVisible(WAIT);
  await expect(page.getByText('Cargando standard...', { exact: true })).toHaveCount(0);
}
async function expectCatalog(page) {
  // Ambos # están codificados: nunca deben convertirse en fragmentos ni confundirse con otra ruta.
  const path = 'chords-db/C%23/m7_g%23.json';
  const expected = await readFile(new URL('../public/chords-db/C%23/m7_g%23.json', import.meta.url), 'utf8');
  const actual = await page.evaluate(async path => {
    const response = await fetch(new URL(path, location.href), { cache: 'no-store' });
    return { status: response.status, type: response.headers.get('Content-Type'), text: await response.text() };
  }, path);
  expect(actual.status).toBe(200);
  expect(actual.type).toContain('application/json');
  expect(actual.text).toBe(expected);
}

test('instala el manifiesto y toda la app: recarga y abre secciones, standards y acordes no visitados sin red ni caché HTTP', async ({ page, context, site }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await install(page, site);
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
  expect(manifest).toMatchObject({ display: 'standalone', scope: './', start_url: './' });
  expect(manifest.icons.map(icon => icon.sizes)).toEqual(['192x192', '512x512']);
  expect(site.log.filter(path => path.includes('/pwa/catalogs/'))).toHaveLength(17);
  expect(site.log.length, 'la instalación no hace miles de peticiones').toBeLessThan(80);

  await page.getByTestId('nav-scale').click();
  await page.getByTestId('scale-root-select').selectOption('B');
  await expect.poll(async () => JSON.parse(await stored(page, CONFIG_KEY)).config.scaleRootLetter).toBe('B');
  await page.evaluate(() => localStorage.setItem('otra-aplicacion', 'conservar'));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await context.setOffline(true);
  // El navegador puede terminar una comprobación de sw.js que ya estaba en curso.
  // Cerramos también el servidor: ni esas comprobaciones ni los datos pueden apoyarse en HTTP.
  await site.close();
  const since = site.log.length;
  await page.reload();
  await ready(page);
  await expect(page.getByTestId('scale-root-select')).toHaveValue('B');
  await expect(page.getByTestId('fretboard-scale')).toBeVisible();
  await expectCatalog(page);
  await openStandardOffline(page);
  for (const id of ['nav-scale-compare', 'nav-route', 'nav-near-chords', 'nav-chords']) {
    await page.getByTestId(id).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.getByTestId('select-tone').selectOption('F');
  await page.getByTestId('select-quality').selectOption('maj');
  await page.getByTestId('select-structure').selectOption('chord');
  await expect.poll(() => page.getByTestId('voicing-select').locator('option').count(), WAIT).toBeGreaterThan(0);
  await expect(page.locator('.text-rose-600')).toHaveCount(0);
  const another = await context.newPage();
  await another.goto(site.url);
  await ready(another);
  expect(await stored(another, 'otra-aplicacion')).toBe('conservar');
  expect(site.log.slice(since)).toEqual([]);
  expect(errors).toEqual([]);
});

test('la versión nueva espera al clic y respeta la política de configuración y presets; solo limpia cachés propias', async ({ page, context, site }) => {
  await install(page, site);
  await page.evaluate(([key]) => {
    localStorage.setItem(key, JSON.stringify([{ name: 'Conservar', savedAt: '2026-10-15T10:00:00.000Z', payload: { version: 1, appVersion: '6.0.97', config: { chordRootPc: 7, chordQuality: 'dom', chordStructure: 'tetrad', chordExt7: true } } }, null, null]));
    localStorage.setItem('otra-aplicacion', 'conservar');
  }, [PRESETS_KEY]);
  const foreign = ['drop-route-precache:/Drop_Route/:ajena', 'mastil-escalas:/otra/:ajena'];
  await page.evaluate(async names => { for (const name of names) await (await caches.open(name)).put('/ajeno', new Response('conservar')); }, foreign);
  let loads = 0;
  page.on('load', () => { loads += 1; });
  await offerB(page, site);
  expect(await marker(page)).toBe('A');
  expect(loads).toBe(0);
  await expect(notice(page)).toContainText('la configuración actual se restablece');
  await update(page).click();
  await expect.poll(() => marker(page), WAIT).toBe('B');
  await ready(page);
  expect(loads).toBe(1);
  await expect.poll(async () => JSON.parse(await stored(page, CONFIG_KEY)).appVersion, WAIT).toBe(builds.B.version);
  expect(JSON.parse(await stored(page, PRESETS_KEY))[0].name).toBe('Conservar');
  expect(await stored(page, 'otra-aplicacion')).toBe('conservar');
  await expect.poll(() => keys(page), WAIT).toEqual(expect.arrayContaining([builds.B.cache, ...foreign]));
  await expect.poll(async () => (await keys(page)).filter(name => name.startsWith(`mastil-escalas:${BASE}:`)), WAIT).toEqual([builds.B.cache]);
  await page.getByTestId('nav-configuration').click();
  await page.getByRole('button', { name: 'Restaurar', exact: true }).first().click();
  await expect.poll(async () => JSON.parse(await stored(page, CONFIG_KEY)).config.chordRootPc).toBe(7);
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  expect(await marker(page)).toBe('B');
});

test('dos pestañas: A sigue abriendo standards sin red cuando otra activa B; su botón antiguo también actualiza', async ({ page, context, site }) => {
  await install(page, site);
  const other = await context.newPage();
  await other.goto(site.url);
  await ready(other);
  await offerB(page, site);
  await expect(update(other)).toBeVisible(WAIT);
  let loads = 0;
  page.on('load', () => { loads += 1; });
  await update(other).click();
  await expect.poll(() => marker(other), WAIT).toBe('B');
  await ready(other);
  expect(await marker(page)).toBe('A');
  expect(loads).toBe(0);
  expect(await keys(page)).toContain(builds.A.cache);
  await context.setOffline(true);
  await openStandardOffline(page);
  await expectCatalog(page);
  expect(await marker(page)).toBe('A');
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting)).toBeNull();
  await page.setViewportSize({ width: 390, height: 844 });
  const button = await update(page).boundingBox();
  const panel = await notice(page).boundingBox();
  expect(button.height).toBeGreaterThanOrEqual(48);
  expect(panel.x + panel.width).toBeLessThanOrEqual(390);
  await update(page).click();
  await expect.poll(() => marker(page), WAIT).toBe('B');
  await ready(page);
  expect(loads).toBe(1);
  await expect.poll(async () => (await keys(page)).filter(name => name.startsWith(`mastil-escalas:${BASE}:`)), WAIT).toEqual([builds.B.cache]);
});

test('una descarga inicial incompleta no se anuncia como lista y no deja una caché parcial', async ({ page, site }) => {
  site.fail(/\/pwa\/catalogs\/0-/);
  await page.goto(site.url);
  await expect(page.getByTestId('nav-scale')).toBeVisible();
  await expect(notice(page).getByRole('alert')).toContainText('no se ha completado', WAIT);
  await expect(notice(page).getByText('Disponible sin conexión.', { exact: true })).toHaveCount(0);
  expect((await keys(page)).filter(name => name.startsWith(`mastil-escalas:${BASE}:`))).toEqual([]);
  await page.getByTestId('nav-scale').click();
  await page.getByTestId('scale-root-select').selectOption('G');
  await expect(page.getByTestId('fretboard-scale')).toBeVisible();
});
