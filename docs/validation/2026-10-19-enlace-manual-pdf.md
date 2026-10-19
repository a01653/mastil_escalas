# Validación: enlace al manual en PDF desde la ayuda (sin cambio de versión)

Rama `docs/enlace-manual-pdf`. Versión de la aplicación: 6.0.98 (no se incrementa).

## Cambios

- `src/components/help/ManualOverlay.jsx`: botón «Abrir el manual en PDF» en el modal del interrogante; la ruta usa `import.meta.env.BASE_URL`.
- `public/ayuda/mastil_escalas_manual.pdf` (nuevo, 2,6 MB): el PDF versionado y servido con la aplicación; entra también en la copia sin conexión.
- `scripts/generateManual.mjs`: copia el PDF generado a `public/ayuda/` (`manual/` está en `.gitignore`).
- `CLAUDE.md` 8.4: documenta ese flujo.
- `ManualOverlay.test.jsx`: 5 casos (uno nuevo para el enlace).
- `CHANGELOG.md`: sin entrada (no hay versión nueva). DTS: no requiere actualización.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npx vitest run src/components/help/ManualOverlay.test.jsx` | 5 de 5 |
| `npm run lint` | sin avisos |
| `npm test` | 51 ficheros, 1656 pruebas correctas |
| `npm run build` | correcto; `dist/ayuda/` contiene el PDF y `sw.js` lo precachea |
| `npm run test:e2e` (incluye la matriz lenta y la PWA) | 424 de 424 |
| Preview: el PDF responde `200 application/pdf` y el botón apunta a él | correcto |

No comprobado: la apertura del PDF dentro de la WebView del APK de Android ni en móvil.
