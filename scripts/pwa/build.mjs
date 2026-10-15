import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const TEMPLATE = new URL('./sw.template.js', import.meta.url);
const MARKER = '__MASTIL_OFFLINE_BUILD__';
const digest = (value) => createHash('sha256').update(value).digest('hex').slice(0, 20);

export async function listFiles(dir, prefix = '') {
  const files = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(join(dir, entry.name), path + '/'));
    else files.push(path);
  }
  return files;
}

export const manifest = {
  id: './', name: 'Mástil Escalas', short_name: 'Mástil Escalas', lang: 'es',
  description: 'Escalas, acordes, rutas y standards de guitarra, también sin conexión.',
  start_url: './', scope: './', display: 'standalone',
  background_color: '#f8fafc', theme_color: '#0f172a',
  icons: [192, 512].map(size => ({ src: `pwa/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' })),
};

/** Conserva los bytes de cada JSON: solo cambia su transporte, no los datos musicales. */
export async function buildCatalogs(catalogDir, outDir) {
  const catalogs = {};
  const folders = (await readdir(catalogDir, { withFileTypes: true })).filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  await rm(join(outDir, 'pwa/catalogs'), { recursive: true, force: true });
  await mkdir(join(outDir, 'pwa/catalogs'), { recursive: true });
  for (const [index, folder] of folders.entries()) {
    const entries = {};
    for (const file of (await readdir(join(catalogDir, folder.name))).sort()) {
      if (!file.endsWith('.json')) continue;
      const text = await readFile(join(catalogDir, folder.name, file), 'utf8');
      JSON.parse(text); // Un catálogo roto debe impedir la entrega, no guardarse como una descarga válida.
      entries[file] = text;
    }
    const data = JSON.stringify(entries);
    const file = `pwa/catalogs/${index}-${digest(data)}.json`;
    await writeFile(join(outDir, file), data);
    catalogs[folder.name] = file;
  }
  await writeFile(join(outDir, 'pwa/offline.json'), JSON.stringify({ catalogs }));
  return catalogs;
}

export async function emitOfflineBuild(outDir, { base, catalogDir }) {
  if (!base.startsWith('/') || !base.endsWith('/') || base.includes('..')) throw new Error('La base PWA debe ser una ruta absoluta terminada en /.');
  const catalogs = await buildCatalogs(catalogDir, outDir);
  await writeFile(join(outDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
  const paths = (await listFiles(outDir)).filter(path => !path.startsWith('chords-db/') && path !== 'sw.js' && !path.endsWith('.map'));
  const template = await readFile(TEMPLATE, 'utf8');
  const hash = createHash('sha256').update(base).update(template);
  // El marcador del HTML se normaliza para que repetir el generador sea determinista.
  for (const path of paths) {
    let body = await readFile(join(outDir, path));
    if (path === 'index.html') body = Buffer.from(body.toString().replace(/(<meta name="mastil-offline-build" content=")[^"]*(")/, `$1${MARKER}$2`));
    hash.update(path).update(body);
  }
  const buildId = hash.digest('hex').slice(0, 20);
  const htmlPath = join(outDir, 'index.html');
  const html = (await readFile(htmlPath, 'utf8')).replace(/(<meta name="mastil-offline-build" content=")[^"]*(")/, `$1${buildId}$2`);
  if (!html.includes(`name="mastil-offline-build" content="${buildId}"`)) throw new Error('Falta el marcador PWA en el HTML.');
  await writeFile(htmlPath, html);
  const config = { base, buildId, catalogs, paths: paths.map(path => path.split('/').map(encodeURIComponent).join('/')) };
  await writeFile(join(outDir, 'sw.js'), template.replace('null /*__OFFLINE_CONFIG__*/', JSON.stringify(config)));
  return config;
}

export function offlinePwa() {
  let config;
  return {
    name: 'mastil-offline-pwa', apply: 'build',
    configResolved(value) { config = value; },
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: `${config.base}manifest.webmanifest` }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'mastil-offline-build', content: MARKER }, injectTo: 'head' },
      ];
    },
    async closeBundle() {
      const out = resolve(config.root, config.build.outDir);
      await mkdir(dirname(out), { recursive: true });
      await emitOfflineBuild(out, { base: config.base, catalogDir: resolve(config.root, 'public/chords-db') });
    },
  };
}
