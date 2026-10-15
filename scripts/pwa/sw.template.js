const CONFIG = null /*__OFFLINE_CONFIG__*/;
const PREFIX = `mastil-escalas:${CONFIG.base}:`;
const CACHE = PREFIX + CONFIG.buildId;
const absolute = path => new URL(path, self.registration.scope).href;
const clientBuilds = new Map();
const catalogs = new Map();
const ownClients = async () => (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
  .filter(client => client.url.startsWith(self.registration.scope));

// Las pestañas antiguas pueden necesitar módulos que aún no habían abierto. Se conservan sus cachés hasta
// que todas las ventanas confirman que ejecutan este build; nunca se borran datos de localStorage ni cachés ajenas.
async function cleanUnusedCaches() {
  const clients = await ownClients();
  for (const client of clients) if (!clientBuilds.has(client.id)) client.postMessage({ type: 'MASTIL_BUILD_QUERY' });
  if (!clients.every(client => clientBuilds.get(client.id) === CONFIG.buildId)) return;
  await Promise.all((await caches.keys()).filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(CONFIG.paths.map(path => new Request(absolute(path), { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await cleanUnusedCaches();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'MASTIL_CLIENT_BUILD' && event.source?.id && /^[a-f0-9]{20}$/.test(event.data.buildId)) {
    clientBuilds.set(event.source.id, event.data.buildId);
    event.waitUntil(cleanUnusedCaches());
  }
});

async function catalogResponse(cacheName, root, file) {
  const cache = await caches.open(cacheName);
  const key = `${cacheName}/${root}`;
  let data = catalogs.get(key);
  if (!data) {
    const metadata = await cache.match(absolute('pwa/offline.json'));
    const path = metadata && (await metadata.json()).catalogs[root];
    if (!path) return null;
    data = cache.match(absolute(path)).then(response => response?.json());
    catalogs.set(key, data);
    if (catalogs.size > 2) catalogs.delete(catalogs.keys().next().value);
  }
  const entries = await data;
  return entries && Object.prototype.hasOwnProperty.call(entries, file)
    ? new Response(entries[file], { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
    : null;
}

async function respond(event, url) {
  // La navegación siempre abre la versión activa. Las peticiones de una pestaña que sigue abierta usan su build.
  if (event.request.mode === 'navigate' && (url.pathname === CONFIG.base || url.pathname === CONFIG.base + 'index.html')) {
    return (await (await caches.open(CACHE)).match(absolute('index.html'))) || fetch(event.request);
  }
  const build = clientBuilds.get(event.clientId);
  const cacheName = build ? PREFIX + build : CACHE;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(url.origin + url.pathname);
  if (cached) return cached;
  const relative = url.pathname.slice(CONFIG.base.length);
  if (relative.startsWith('chords-db/')) {
    const parts = relative.split('/');
    if (parts.length === 3) {
      try {
        const response = await catalogResponse(cacheName, decodeURIComponent(parts[1]), decodeURIComponent(parts[2]));
        if (response) return response;
      } catch { /* Una URL inválida o una caché no disponible conserva el comportamiento normal de red. */ }
    }
  }
  // Al arrancar una pestaña, el mensaje con su build puede llegar después de la primera petición de un módulo.
  if (relative.startsWith('assets/')) {
    for (const name of (await caches.keys()).filter(name => name.startsWith(PREFIX) && name !== cacheName)) {
      const old = await (await caches.open(name)).match(url.origin + url.pathname);
      if (old) return old;
    }
  }
  return fetch(event.request);
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(CONFIG.base)) return;
  event.respondWith(respond(event, url));
});
