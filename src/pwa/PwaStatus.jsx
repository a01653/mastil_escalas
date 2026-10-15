import { useSyncExternalStore } from 'react';
import { pwaStore } from './store.js';

export default function PwaStatus({ store = pwaStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  if (state.status === 'idle') return null;
  return (
    <section aria-label="Instalación y actualización" className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      <p role="status" className="text-slate-600">
        {state.status === 'preparing' ? 'Preparando el uso sin conexión…' : state.status === 'ready' ? 'Disponible sin conexión.' : 'Uso sin conexión no disponible.'}
      </p>
      {state.error ? <p role="alert" className="mt-1 text-rose-700">{state.error}</p> : null}
      {state.updateReady ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-slate-700">
            Hay una versión nueva. Al actualizar se recarga la aplicación. Si cambia la versión, la configuración actual se restablece; los presets se conservan. Puedes guardar un preset o exportar tu configuración antes de actualizar.
          </p>
          <button type="button" disabled={state.applying} onClick={store.apply}
            className="min-h-12 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-60">
            {state.applying ? 'Actualizando…' : 'Actualizar ahora'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
