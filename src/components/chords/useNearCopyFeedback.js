import { useEffect, useRef, useState } from "react";

export const NEAR_COPY_FEEDBACK_DURATION_MS = 1500;

/**
 * Estado de feedback temporal para "Copiar a cercano".
 *
 * trigger(candId, slotIdx, name) — activa el feedback y arranca el timer.
 * Si se llama de nuevo antes de que expire, reinicia el timer.
 * Al desmontar el componente el timeout se cancela (sin warning de React).
 *
 * copyFeedback es null cuando no hay feedback activo, o
 * { slotIdx, candId, name } mientras está visible.
 */
export function useNearCopyFeedback(duration = NEAR_COPY_FEEDBACK_DURATION_MS) {
  const [copyFeedback, setCopyFeedback] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function trigger(candId, slotIdx, name) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopyFeedback({ slotIdx, candId, name });
    timerRef.current = setTimeout(() => {
      setCopyFeedback(null);
      timerRef.current = null;
    }, duration);
  }

  return { copyFeedback, trigger };
}
