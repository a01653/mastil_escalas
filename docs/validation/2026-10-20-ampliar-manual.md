# Validación: manual de uso ampliado con capturas anotadas (sin cambio de versión)

Rama `docs/ampliar-manual-uso`. Versión de la aplicación: 6.0.98 (no se incrementa: solo cambian el manual en PDF, sus capturas y su generador).

## Cambios

- `docs/manuals/USO.md`: reescrito por tareas en 14 capítulos (primeros pasos, contexto tonal, escala, comparador, ruta, constructor de acordes, Modo estudio, modo Manual, Acordes cercanos, Standards, configuración, móvil/ayuda/instalación, problemas frecuentes y glosario). Cada figura anotada lleva una tabla «Nº | Control | Qué hace» y los ejemplos musicales (Cmaj7/E Drop 2 Set 2 `x7958x`, C6 frente a Am7/C, ii-V-I en Do, Autumn Leaves) se han comprobado en la aplicación. Corrige errores del manual anterior: «Notas / Intervalos» y «Trastes» están en Configuración; la casilla se llama «Referencia».
- `scripts/generateManual.mjs`: escenarios de captura por panel con recortes y marcadores numerados inyectados en el DOM, composición de las tres capturas de móvil, figuras flotantes con anchura calculada a partir del PNG, tablas de marcadores con anchuras propias y comprobación de que la numeración de figuras es consecutiva, de que cada captura tiene pie y de que las figuras citadas existen.
- `docs/latex/manual-template.tex`: paquete `caption`, marco de las capturas (`\manualcapture`), recuadro para consejos y avisos y el carácter Δ.
- `docs/manuals/capturas/`: 32 capturas (29 nuevas y 3 regeneradas); se eliminan las 7 que ya no se usan (`acordes-estudio`, `acordes-manual`, `acordes`, `cercanos`, `comparar`, `escala`, `standards`).
- `docs/latex/Manual_Uso_Mastil_Escalas.tex` y `.pdf`, y `public/ayuda/mastil_escalas_manual.pdf`: regenerados con `npm run generate:manual` sobre el build 6.0.98 servido en el preview. Pasa de 18 a 39 páginas y de 1,5 MB a 3,1 MB.
- `CHANGELOG.md`: sin entrada, porque no se publica una versión nueva.
- `src/components/help/ManualOverlay.jsx`: sin cambios (la interfaz no cambia).
- `README.md`: sin cambios; ya enlaza el manual en PDF y su descripción sigue siendo válida.
- DTS: no requiere actualización (solo cita `scripts/generateManual.mjs` por su nombre; no cambian arquitectura, dependencias ni comportamiento documentado).

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npm run generate:manual` contra el preview (puerto 4185) | correcto; sin `Overfull`, caracteres ausentes, flotantes demasiado grandes ni referencias sin resolver |
| Revisión visual de las 39 páginas del PDF | correcta |
| Capturas citadas en `USO.md` | 32 de 32 existen; ninguna captura sobrante |
| `cmp` entre `docs/latex/Manual_Uso_Mastil_Escalas.pdf` y `public/ayuda/mastil_escalas_manual.pdf` | idénticos |
| `npm run lint` | sin avisos |
| `npx vitest run src/components/help/ManualOverlay.test.jsx` | 5 de 5 (comprueba, entre otros, el enlace al PDF) |
| `npm run build` | correcto |
| Preview: `/mastil_escalas/ayuda/mastil_escalas_manual.pdf` | HTTP 200, 3 088 556 bytes, idéntico al de `public/ayuda` |

No se han ejecutado `npm test` completo, `npm run test:e2e` ni las auditorías `audit:*`: la rama no modifica `src/`, la configuración de build ni las dependencias.

## Limitaciones y pendientes

- Las figuras de paneles a todo el ancho (constructor, estudio, móvil) se leen al ampliar el PDF en pantalla, pero impresas en A4 el texto de la interfaz queda pequeño.
- El PDF entra en la precarga del service worker: la caché sin conexión crece unos 1,6 MB.
- Observaciones de la aplicación, fuera del alcance de esta rama: en la familia Cuartal el título conserva el nombre del acorde terciario anterior («Cmaj7 · Acorde C Cuartal puro»); en las Drop el título repite la estructura («Cmaj7 · Drop · Abierto · Drop 2 Set 2»); la ayuda de `ManualOverlay.jsx` mantiene las inexactitudes que este manual corrige («Priorizar acorde de referencia»; Notas/Intervalos y Trastes descritos fuera de Configuración).
