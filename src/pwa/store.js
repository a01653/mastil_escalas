const INITIAL = Object.freeze({ status: 'idle', updateReady: false, applying: false, error: null });

export function createPwaStore() {
  let state = INITIAL;
  let apply = () => {};
  const listeners = new Set();
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => INITIAL,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    patch(next) {
      if (Object.keys(next).every(key => state[key] === next[key])) return;
      state = { ...state, ...next };
      for (const listener of listeners) listener();
    },
    setApply(callback) { apply = callback; },
    apply: () => apply(),
  };
}

export const pwaStore = createPwaStore();
