import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerPwa, startPwa } from './register.js';
import { createPwaStore } from './store.js';

class Worker extends EventTarget {
  state = 'installing';
  postMessage = vi.fn();
  become(state) { this.state = state; this.dispatchEvent(new Event('statechange')); }
}
class Registration extends EventTarget {
  waiting = null;
  active = null;
  installing = null;
  update = vi.fn(async () => {});
}
function setup({ controlled = false, waiting = false, fail = false } = {}) {
  const registration = new Registration();
  if (waiting) registration.waiting = new Worker();
  const container = Object.assign(new EventTarget(), {
    controller: controlled ? new Worker() : null,
    register: vi.fn(async () => { if (fail) throw new Error('offline'); return registration; }),
  });
  const store = createPwaStore();
  const reload = vi.fn();
  const visibility = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const run = () => registerPwa({ container, base: '/mastil_escalas/', store, reload, visibility, buildId: 'a'.repeat(20) });
  const claim = () => { container.controller = new Worker(); container.dispatchEvent(new Event('controllerchange')); };
  return { registration, container, store, reload, visibility, run, claim };
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('registro y actualización PWA', () => {
  it('limita el registro a su subruta y solo ofrece uso sin conexión cuando el worker controla la página', async () => {
    const s = setup();
    await s.run();
    expect(s.container.register).toHaveBeenCalledWith('/mastil_escalas/sw.js', { scope: '/mastil_escalas/', updateViaCache: 'none' });
    expect(s.store.getSnapshot().status).toBe('preparing');
    s.claim();
    expect(s.store.getSnapshot()).toMatchObject({ status: 'ready', updateReady: false });
    expect(s.reload).not.toHaveBeenCalled();
    expect(s.container.controller.postMessage).toHaveBeenCalledWith({ type: 'MASTIL_CLIENT_BUILD', buildId: 'a'.repeat(20) });
  });

  it('una actualización espera al clic, evita clics repetidos y recarga una sola vez al tomar el control', async () => {
    const s = setup({ controlled: true, waiting: true });
    await s.run();
    expect(s.store.getSnapshot().updateReady).toBe(true);
    expect(s.reload).not.toHaveBeenCalled();
    s.store.apply(); s.store.apply();
    expect(s.registration.waiting.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'SKIP_WAITING' });
    expect(s.store.getSnapshot().applying).toBe(true);
    expect(s.reload).not.toHaveBeenCalled();
    s.claim(); s.claim(); s.store.apply();
    expect(s.reload).toHaveBeenCalledTimes(1);
  });

  it('si otra pestaña ya activó la actualización, mantiene el documento y el botón recarga sin worker en espera', async () => {
    const s = setup({ controlled: true, waiting: true });
    await s.run();
    s.registration.waiting = null;
    s.claim();
    expect(s.reload).not.toHaveBeenCalled();
    expect(s.store.getSnapshot().updateReady).toBe(true);
    s.store.apply(); s.store.apply(); s.claim();
    expect(s.reload).toHaveBeenCalledTimes(1);
  });

  it('si la otra pestaña está activando el worker, espera a que tome el control antes de recargar', async () => {
    const s = setup({ controlled: true, waiting: true });
    await s.run();
    s.registration.waiting = null;
    s.registration.active = new Worker();
    s.registration.active.state = 'activating';
    s.store.apply();
    expect(s.reload).not.toHaveBeenCalled();
    s.claim();
    expect(s.reload).toHaveBeenCalledTimes(1);
  });

  it('un fallo de registro deja la web funcionando y no promete uso sin conexión', async () => {
    const s = setup({ fail: true });
    expect(await s.run()).toBeNull();
    expect(s.store.getSnapshot()).toMatchObject({ status: 'error', updateReady: false });
    expect(s.reload).not.toHaveBeenCalled();
  });

  it('detecta la instalación fallida y no confunde una descarga incompleta con disponibilidad offline', async () => {
    const s = setup();
    const worker = new Worker();
    s.registration.installing = worker;
    await s.run();
    worker.become('redundant');
    expect(s.store.getSnapshot().status).toBe('error');
    expect(s.store.getSnapshot().error).toContain('no se ha completado');
  });

  it('vigila una actualización descubierta después del registro sin activar por su cuenta', async () => {
    const s = setup({ controlled: true });
    await s.run();
    const worker = new Worker();
    s.registration.installing = worker;
    s.registration.dispatchEvent(new Event('updatefound'));
    s.registration.waiting = worker;
    worker.become('installed');
    expect(s.store.getSnapshot().updateReady).toBe(true);
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('identifica las pestañas antiguas cuando el worker pregunta y comprueba actualizaciones al volver', async () => {
    const s = setup({ controlled: true });
    await s.run();
    s.container.controller.postMessage.mockClear();
    s.container.dispatchEvent(Object.assign(new Event('message'), { data: { type: 'MASTIL_BUILD_QUERY' } }));
    expect(s.container.controller.postMessage).toHaveBeenCalledTimes(1);
    s.visibility.visibilityState = 'hidden';
    s.visibility.dispatchEvent(new Event('visibilitychange'));
    expect(s.registration.update).not.toHaveBeenCalled();
    s.registration.update.mockRejectedValueOnce(new Error('sin red'));
    s.visibility.visibilityState = 'visible';
    s.visibility.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(s.registration.update).toHaveBeenCalledTimes(1);
  });

  it('permite reintentar si falla el envío de la orden de actualización', async () => {
    const s = setup({ controlled: true, waiting: true });
    await s.run();
    s.registration.waiting.postMessage.mockImplementationOnce(() => { throw new Error('redundant'); });
    s.store.apply();
    expect(s.store.getSnapshot()).toMatchObject({ applying: false, updateReady: true });
    s.store.apply(); s.claim();
    expect(s.reload).toHaveBeenCalledTimes(1);
  });

  it('un navegador que bloquea service workers no rompe la aplicación', async () => {
    const s = setup();
    s.container.register.mockResolvedValueOnce(undefined);
    expect(await s.run()).toBeNull();
    expect(s.store.getSnapshot().status).toBe('idle');
  });
});

it('el build Android y el desarrollo no registran service workers', () => {
  const register = vi.fn();
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  vi.stubEnv('PROD', true); vi.stubEnv('VITE_PWA_ENABLED', undefined);
  startPwa();
  vi.stubEnv('PROD', false); vi.stubEnv('VITE_PWA_ENABLED', 'true');
  startPwa();
  expect(register).not.toHaveBeenCalled();
});
