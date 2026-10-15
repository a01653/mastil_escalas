# PWA y funcionamiento sin conexión

Versión de la entrega: **6.0.97**. Rama `feat/offline-pwa`, desde `main` en `5b4bc87`. Fecha: 15/10/2026.

## Comportamiento

La primera carga con Internet prepara una copia completa de la aplicación y muestra «Disponible sin conexión.» cuando termina. Se incluyen módulos diferidos, todos los standards y las digitaciones del catálogo. La versión nueva espera al clic de actualización; una pestaña antigua puede seguir abriendo datos sin red cuando otra ya ha activado el build nuevo.

Se conserva la política previa de configuración: subir `APP_VERSION` restablece la configuración principal. El aviso PWA lo explica y recomienda guardar un preset o exportar antes de actualizar. Los presets y las claves ajenas a la app se conservan. No se genera ni publica un APK nuevo; se comprueba el build web que usa Capacitor.

Antes del cambio, la web publicada no tenía manifiesto, registros de service worker ni CacheStorage. Tras cargarla y cortar la red, recargar fallaba con `ERR_INTERNET_DISCONNECTED`. La regresión actual exige que ese mismo recorrido funcione y que cargue datos todavía no visitados.

## Archivos

Archivos de la entrega:

- `src/pwa/`: registro, estado externo, aviso de disponibilidad/actualización y pruebas unitarias.
- `scripts/pwa/`: generador del build, plantilla del worker y pruebas del empaquetado.
- `public/pwa/`: icono SVG y PNG de 192 y 512 px: nuevo mástil de seis cuerdas en diagonal, con notas turquesa y tónica ámbar sobre fondo azul oscuro. Se utiliza en la instalación PWA y en la pestaña del navegador.
- `src/main.jsx`, `src/App.jsx`: arranque e integración del aviso; versión 6.0.97.
- `vite.config.js`, `index.html`: manifiesto, identidad de la aplicación y paquetes de standards.
- `package.json`, `package-lock.json`: versión coherente; no se añaden dependencias.
- `playwright.config.js`, `e2e/pwa-site.js`, `e2e/pwa.spec.js`: build nuevo antes de servir, workers reales en la suite PWA y bloqueo del worker en los tests que interceptan red.
- `README.md`, `docs/DTS.md`, `docs/latex/DTS_Mastil_Escalas.tex` y su PDF: instalación, funcionamiento y diseño técnico.
- Este registro de validación.

La segunda iteración modifica, respecto a la instantánea anterior: `vite.config.js`, `e2e/pwa-site.js`, `e2e/pwa.spec.js` y la documentación. Divide los standards en 32 paquetes, ejecuta los builds A/B en procesos independientes y ajusta los controles y tiempos de las pruebas. Las instantáneas de hashes de ambas iteraciones están fuera del repositorio.

En la última iteración, solicitada al cerrar la entrega, solo cambian los tres archivos de `public/pwa/` y este registro. El icono se revisa a 512 y 64 px antes de ejecutar la batería final. El diff acumulado de implementación sigue siendo de 25 archivos.

## Pruebas dirigidas

| Comprobación | Selección y motivo | Resultado |
|---|---|---|
| Unitarias | `npx vitest run src/pwa/register.test.js src/pwa/PwaStatus.test.jsx scripts/pwa/build.test.js src/App.smoke.test.jsx`; registro, clic explícito, errores, estados del aviso, datos y consumidor raíz | 18 correctas: 17 nuevas y 1 existente |
| PWA real | `npx playwright test e2e/pwa.spec.js`; dos builds de Vite, servidor HTTP, service workers y CacheStorage sin simular | 4 correctas |
| Regresión de interfaz/datos/configuración | `npx playwright test e2e/smoke.spec.js e2e/chord-catalog-infra.spec.js e2e/config-version-invalidation.spec.js` | 27 correctas |
| ESLint | `npm run lint` y comprobaciones dirigidas durante los ajustes | Correcto |
| Build web | `npm run build`, generado también antes de cada ejecución E2E | Correcto |
| Build Android | `NODE_OPTIONS=--max-old-space-size=4096 npm run build:android` | Correcto; sin `sw.js` ni enlace al manifiesto en `dist-android/index.html` |
| Datos empaquetados | Comparación de cada entrada de los 17 paquetes con el JSON original | 12 852 archivos idénticos byte por byte |
| Instalabilidad en Chromium | `Page.getInstallabilityErrors` y `Page.getAppManifest` sobre el preview del build validado | Sin errores de instalación ni de manifiesto |
| DTS derivado | LuaLaTeX, tres pasadas; inspección de portada, revisión parcial y sección 16.4 | PDF actualizado, 48 páginas; páginas modificadas sin recortes |

Las selecciones E2E se comprobaron con `--list`: 4 escenarios nuevos y 27 existentes. La batería completa se ejecutó una sola vez al cierre, con el código y los iconos definitivos, incluida la matriz lenta de acordes; sus resultados figuran a continuación. No se ejecutan auditorías musicales porque esta tarea no cambia teoría, digitaciones, datos fuente, detección, copia ni el cálculo del modo estudio.

Los cuatro escenarios nuevos cubren:

1. Instalación completa, manifiesto e iconos, recarga sin conexión con la caché HTTP deshabilitada, configuración conservada en la misma versión, apertura de un standard y acordes no visitados y una ventana nueva sin red.
2. Actualización que espera al clic, una sola recarga, restablecimiento previsto de configuración al subir la versión, preset conservado y restaurable y cachés ajenas intactas.
3. Dos pestañas: A sigue abriendo un standard y un catálogo cuando B controla la aplicación; el botón de A también funciona sin worker en espera. Incluye comprobación del botón y del aviso a 390 px.
4. Descarga incompleta: no se anuncia disponibilidad sin conexión, no queda caché parcial y la web sigue utilizable con red.

El primer intento de generar ambos builds dentro del worker de Playwright agotó el heap de Node. Se sustituyó por procesos independientes, liberados entre compilaciones. Un intento del build Android con el heap predeterminado también agotó memoria; el comando documentado con 4 GB completó la compilación. El primer recorrido PWA se detuvo además por pedir `F#` en un selector que contiene letras y gestiona la alteración por separado; se corrigió el selector de la prueba, sin cambiar la aplicación.

## Batería final

Cierre autorizado el 15/10/2026. Solo se actualiza este registro después de la ejecución; los archivos de aplicación, pruebas e iconos coinciden con el estado comprobado.

| Comando | Resultado |
|---|---|
| `npm run lint` | Correcto |
| `npm test` | 50 archivos y 1650 pruebas correctas |
| `npm run build` | Correcto; 63 recursos para la instalación completa, 17 paquetes de catálogos y 32 de standards |
| `npm run test:e2e -- --config ../playwright-mastil.local.config.js` | 423 casos seleccionados y correctos en 35 archivos; 13 minutos; sin reintentos ni exclusiones. Incluye la matriz lenta y los cuatro escenarios PWA |
| `git diff --check` | Correcto |

La configuración local de Playwright conserva la configuración del repositorio y cambia la ruta del navegador a Chromium 153 disponible en el entorno, usa dos workers y ajusta las rutas de ejecución. No cambia selecciones ni comportamiento de los tests. El servidor de pruebas compila y sirve el código actual, sin reutilizar previews anteriores.

Auditorías `audit:chords`, `audit:copy-readings`, `audit:chord-ui-matrix` y `audit:study`: no aplican a esta rama porque no se modifican sus invariantes musicales. La batería de regresión existente sí se ha ejecutado completa.

## Estado de entrega

La revisión de móvil muestra el aviso completo y el botón de actualización con al menos 48 px de altura. Los previews se han iniciado durante las pruebas y la comprobación de instalación, y se han cerrado al terminar. No queda preview activo. La versión fijada es 6.0.97. La comprobación de GitHub Pages se realiza después de publicar y se comunica en el informe de cierre, separada de la validación local.
