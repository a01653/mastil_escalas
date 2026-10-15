import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import process from 'node:process';

const execute = promisify(execFile);

export const BASE = '/mastil_escalas/';
export async function buildPair(root, output) {
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const nextVersion = version.replace(/\d+$/, number => String(Number(number) + 1));
  const builds = {};
  for (const label of ['A', 'B']) {
    const outDir = join(output, label);
    // Cada compilación se libera por completo antes de generar la siguiente. Vite/Rollup retienen grafos grandes
    // si ambas se hacen dentro del worker de Playwright, que no debe cargar con los 1461 módulos de cada build.
    const code = `
      import { build } from ${JSON.stringify(pathToFileURL(resolve(root, 'node_modules/vite/dist/node/index.js')).href)};
      await build({ root: ${JSON.stringify(root)}, configFile: ${JSON.stringify(resolve(root, 'vite.config.js'))}, logLevel: 'silent',
        build: { outDir: ${JSON.stringify(outDir)}, emptyOutDir: true, reportCompressedSize: false },
        plugins: [{ name: 'pwa-e2e-build-marker', transform(source, id) {
          if (id.endsWith('/src/main.jsx')) return source + '\\nglobalThis.__MASTIL_TEST_BUILD__ = ${JSON.stringify(label)};';
          if (${JSON.stringify(label)} === 'B' && id.endsWith('/src/App.jsx')) return source.replace('const APP_VERSION = "${version}"', 'const APP_VERSION = "${nextVersion}"');
        }}]
      });`;
    await execute(process.execPath, ['--max-old-space-size=4096', '--input-type=module', '-e', code], { cwd: root, maxBuffer: 2 * 1024 * 1024 });
    const html = await readFile(join(outDir, 'index.html'), 'utf8');
    const id = html.match(/mastil-offline-build" content="([a-f0-9]+)"/)[1];
    builds[label] = { outDir, id, version: label === 'B' ? nextVersion : version, cache: `mastil-escalas:${BASE}:${id}` };
  }
  return builds;
}

export async function startSite(builds) {
  let label = 'A', fail = null;
  const log = [];
  const types = { js: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png' };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    log.push(url.pathname);
    if (!url.pathname.startsWith(BASE) || fail?.test(url.pathname)) { response.writeHead(404).end(); return; }
    const root = builds[label].outDir;
    let file;
    try { file = resolve(root, decodeURIComponent(url.pathname.slice(BASE.length)) || 'index.html'); }
    catch { response.writeHead(400).end(); return; }
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    try {
      if (!(await stat(file)).isFile()) throw new Error('not a file');
      response.writeHead(200, { 'Content-Type': types[file.split('.').at(-1)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let closing;
  const close = () => {
    if (!closing) closing = new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    return closing;
  };
  return {
    url: origin + BASE, origin, log,
    serve(value) { label = value; },
    fail(value) { fail = value; },
    close,
  };
}
