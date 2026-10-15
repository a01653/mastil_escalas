import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { emitOfflineBuild, manifest } from './build.mjs';

const temporary = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'mastil-pwa-build-')); temporary.push(root);
  const out = join(root, 'dist'), source = join(root, 'catalog');
  for (const path of [out + '/assets', source + '/C#', out + '/chords-db/C#']) await mkdir(path, { recursive: true });
  const text = '{\n "notes": ["C♯", "G♯"], "frets": [1,4]\n}\n';
  await writeFile(source + '/C#/m7_g#.json', text);
  await writeFile(out + '/chords-db/C#/m7_g#.json', text);
  await writeFile(out + '/index.html', '<meta name="mastil-offline-build" content="__MASTIL_OFFLINE_BUILD__"><div id="root"></div>');
  await writeFile(out + '/assets/app-123.js', 'globalThis.example = 1');
  const emit = () => emitOfflineBuild(out, { base: '/mastil_escalas/', catalogDir: source });
  return { out, source, text, emit };
}

it('agrupa los JSON sin cambiar sus bytes y evita precachear miles de rutas individuales', async () => {
  const s = await fixture(), config = await s.emit();
  const entries = JSON.parse(await readFile(join(s.out, config.catalogs['C#']), 'utf8'));
  expect(entries['m7_g#.json']).toBe(s.text);
  expect(config.paths.some(path => path.startsWith('chords-db/'))).toBe(false);
  expect(config.paths).toContain(config.catalogs['C#']);
  expect(config.paths).toContain('assets/app-123.js');
  expect(config.paths).not.toContain('sw.js');
});

it('es determinista y cambia de build al cambiar cualquier recurso o dato', async () => {
  const s = await fixture(), first = await s.emit();
  expect((await s.emit()).buildId).toBe(first.buildId);
  await writeFile(s.source + '/C#/m7_g#.json', '{"notes":["D"]}');
  const second = await s.emit();
  expect(second.buildId).not.toBe(first.buildId);
  expect(second.catalogs['C#']).not.toBe(first.catalogs['C#']);
  await writeFile(s.out + '/assets/app-123.js', 'globalThis.example = 2');
  expect((await s.emit()).buildId).not.toBe(second.buildId);
});

it('no entrega un catálogo corrupto como descarga offline válida', async () => {
  const s = await fixture();
  await writeFile(s.source + '/C#/m7_g#.json', '<html>error</html>');
  await expect(s.emit()).rejects.toThrow();
});

it('el manifiesto se resuelve dentro de la instalación e incluye iconos PNG reales de ambos tamaños', async () => {
  expect(manifest).toMatchObject({ id: './', start_url: './', scope: './', display: 'standalone', lang: 'es' });
  for (const icon of manifest.icons) {
    const png = await readFile(new URL('../../public/' + icon.src, import.meta.url));
    const size = Number(icon.sizes.split('x')[0]);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([size, size]);
  }
});
