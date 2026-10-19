# Validación: actualización del manual de uso (sin cambio de versión)

Rama `docs/actualizar-manual`. Versión de la aplicación: 6.0.98 (no se incrementa: solo cambia texto de ayuda).

## Cambios

- `src/components/help/ManualOverlay.jsx`: el manual del interrogante documenta Quinta/Novena, Aumentada, sus2/sus4, rango de trastes, Standards y la instalación/uso sin conexión.
- `src/components/help/ManualOverlay.test.jsx` (nuevo): 4 casos; comprueba que el manual menciona todas las secciones de la barra de navegación y las funciones añadidas desde la 6.0.96.
- `scripts/generateManual.mjs`: la captura «Investigar en mástil» buscaba una casilla que ya no existe y repetía la captura de Acordes; ahora pulsa el selector Auto/Manual y vuelve a Auto.
- `manual/` (PDF, HTML y capturas) regenerado con `npm run generate:manual` sobre el build 6.0.98. La carpeta está en `.gitignore`: no se versiona.
- `CHANGELOG.md`: sin entrada, porque no se publica una versión nueva.
- DTS: no requiere actualización (texto de ayuda y herramienta de generación; sin cambio de arquitectura ni de comportamiento documentado).

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npx vitest run src/components/help/ManualOverlay.test.jsx` | 4 de 4 |
| `npm run lint` | sin avisos |
| `npm test` | 51 ficheros, 1655 pruebas, todas correctas |
| `npm run build` | correcto |
| `npm run test:e2e` (incluye la matriz lenta) | 424 de 424 |
| Revisión visual de las capturas `02_comparar` y `06_acordes_investigar` | correctas |

No se han ejecutado las auditorías `audit:*`: el cambio no afecta a detección, nombres, voicings ni Modo estudio. No se han revisado visualmente todas las páginas del PDF del manual ni el modal en móvil.
