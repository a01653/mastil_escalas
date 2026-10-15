import { pwaStore } from './store.js';

export async function registerPwa({ container, base, store, reload, visibility, buildId }) {
  store.patch({ status: 'preparing', error: null });
  let registration;
  try {
    registration = await container.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' });
  } catch {
    store.patch({ status: 'error', error: 'No se ha podido preparar el uso sin conexión. Comprueba la conexión y vuelve a abrir la aplicación.' });
    return null;
  }
  // Algunos navegadores restringidos no devuelven un registro; la web debe seguir disponible.
  if (!registration) { store.patch({ status: 'idle' }); return null; }
  let applying = false;
  let reloaded = false;
  let lastController = container.controller;
  const reloadOnce = () => {
    if (reloaded) return;
    reloaded = true;
    reload();
  };
  const identify = () => container.controller?.postMessage({ type: 'MASTIL_CLIENT_BUILD', buildId });
  store.setApply(() => {
    if (applying || reloaded) return;
    applying = true;
    store.patch({ applying: true, error: null });
    try {
      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      else if (registration.active?.state !== 'activating' || registration.active === container.controller) reloadOnce();
    } catch {
      applying = false;
      store.patch({ applying: false, error: 'No se ha podido aplicar la actualización. Vuelve a intentarlo.' });
    }
  });
  container.addEventListener('controllerchange', () => {
    identify();
    if (applying) { reloadOnce(); return; }
    store.patch({ status: 'ready', ...(lastController && lastController !== container.controller ? { updateReady: true } : {}) });
    lastController = container.controller;
  });
  container.addEventListener('message', event => {
    if (event.data?.type === 'MASTIL_BUILD_QUERY') identify();
  });
  const check = () => {
    if (container.controller) store.patch({ status: 'ready' });
    if (registration.waiting && container.controller) store.patch({ updateReady: true });
  };
  const watched = new WeakSet();
  const watch = worker => {
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') check();
      if (worker.state === 'redundant' && !container.controller) {
        store.patch({ status: 'error', error: 'La descarga para uso sin conexión no se ha completado. Comprueba la conexión y el espacio disponible, y vuelve a abrir la aplicación.' });
      }
    });
  };
  registration.addEventListener('updatefound', () => watch(registration.installing));
  watch(registration.installing);
  check();
  identify();
  visibility?.addEventListener('visibilitychange', () => {
    if (visibility.visibilityState !== 'visible') return;
    identify();
    registration.update().catch(() => {});
  });
  return registration;
}

export function startPwa() {
  // El build Android usa los archivos de Capacitor y no instala un worker sobre su servidor local.
  if (!import.meta.env.PROD || import.meta.env.VITE_PWA_ENABLED !== 'true' || !('serviceWorker' in navigator)) return;
  const run = () => void registerPwa({
    container: navigator.serviceWorker, base: import.meta.env.BASE_URL, store: pwaStore,
    reload: () => window.location.reload(), visibility: document,
    buildId: document.querySelector('meta[name="mastil-offline-build"]')?.content,
  });
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
