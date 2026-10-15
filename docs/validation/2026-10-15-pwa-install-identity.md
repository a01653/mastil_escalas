# Identidad de instalación de la PWA

Entrega **6.0.98**, rama `fix/pwa-install-identity`, desde `9324cc0`. Corrección del aviso de aplicación ya instalada al intentar instalar Mástil Escalas.

## Diagnóstico y cambio

Los manifiestos publicados de Mástil Escalas y Drop Route declaraban `id: "./"`. Chrome procesaba ambos como `https://a01653.github.io/`, aunque sus rutas de inicio y sus ámbitos eran diferentes. Se comprobó con `Page.getAppManifest().manifest.id` sobre las dos webs públicas. La identidad de una PWA se resuelve contra el origen de `start_url`; una identidad coincidente permite tratarla como la misma aplicación instalada. Esto encaja con el aviso comunicado, aunque no se ha inspeccionado el registro de aplicaciones del móvil.

Referencias: [especificación del manifiesto](https://www.w3.org/TR/appmanifest/#id-member) y [documentación de Chrome](https://developer.chrome.com/docs/capabilities/pwa-manifest-id).

Se fija `id: "/mastil_escalas/"`, una identidad estable y exclusiva de esta aplicación. Se conservan las rutas de inicio y el ámbito del worker. La versión se fija una vez en 6.0.98. La política existente sigue restableciendo la configuración al subir de versión; los presets se conservan.

## Archivos de la entrega

- `scripts/pwa/build.mjs`: identidad propia de la PWA.
- `scripts/pwa/build.test.js`: regresión de resolución del identificador y expectativa del manifiesto.
- `e2e/pwa-identity.spec.js`: regresión que consulta el manifiesto procesado por Chrome, no solo el JSON original.
- `e2e/pwa-site.js` y `e2e/pwa.spec.js`: los builds A/B de actualización toman la versión del paquete y calculan la siguiente, sin depender de 6.0.97.
- `src/App.jsx`, `package.json`, `package-lock.json`: versión 6.0.98 coherente.
- Este registro.

La instantánea inicial de la rama estaba limpia. Este es el diff completo de la corrección; no hay cambios de otra tarea. README y DTS conservan instrucciones y arquitectura válidas: no se regeneran por este ajuste del identificador.

## Regresión y validación

Antes de corregir, se ejecutaron las dos regresiones: `npx vitest run scripts/pwa/build.test.js -t 'la identidad PWA'` seleccionó un caso y falló mostrando la raíz del origen en lugar de `/mastil_escalas/`. `npx playwright test e2e/pwa-identity.spec.js` seleccionó un caso y falló por el mismo valor, calculado por Chrome. En ambos casos el fallo fue la identidad errónea, no un error del entorno.

Tras corregir, se seleccionan las pruebas de generación, registro, estados PWA y consumidor raíz, además de las de identidad, instalación/actualización y configuración al cambiar de versión. Los resultados del cierre se detallan a continuación.

No se modifican invariantes de detección, nomenclatura, voicings, copia ni modo estudio; las auditorías musicales no aplican.

La primera ejecución dirigida posterior a la corrección pasó 8 de los 11 casos seleccionados. La prueba de actualización mantenía la expectativa fija 6.0.98 para el build B, que ya era 6.0.99; se ajusta esa expectativa a la versión siguiente calculada por el fixture. Dos casos posteriores no llegaron a ejecutarse por el modo serial. La identidad nueva sí pasó en Chrome en esa ejecución. Se valida la suite completa después de este ajuste.

## Cierre técnico

- `npm run lint`: correcto; después del último ajuste de pruebas, ESLint dirigido sobre los tres archivos E2E afectados también correcto.
- `npm test`: 50 archivos y 1651 pruebas correctas, incluido el nuevo caso de identidad.
- `npm run build`: correcto; repetido por el servidor de cada selección E2E para servir el estado actual.
- Batería E2E completa, sin filtros: 424 casos en 36 archivos, cuatro workers, 12,1 minutos. Pasaron 420; el primer caso PWA falló por una petición de actualización a `sw.js` que se registró después de emular la desconexión. Los tres casos posteriores no se ejecutaron por el modo serial.
- Se reforzó esa prueba apagando por completo el servidor HTTP, con cierre idempotente en `e2e/pwa-site.js`. Así también queda inaccesible para las comprobaciones de actualización del navegador. No cambió ningún archivo de aplicación tras la batería completa.
- Revalidación de `e2e/pwa.spec.js`, comprobando la selección con `--list`: los cuatro casos correctos, 1,2 minutos. Los otros 420 casos no importan el helper modificado y conservan su validación. Los 424 casos quedan comprobados sobre el código de aplicación final.
- `git diff --check`: correcto.
- Auditorías musicales: no aplican, por los invariantes indicados arriba.

Los previews de las pruebas se cierran al terminar. La comprobación pública se ejecuta después de publicar e incluye el cambio de identidad desde una pestaña con la v6.0.97 guardada, si el entorno mantiene abierta esa sesión durante el despliegue. El registro de aplicaciones del móvil requiere la comprobación del usuario.
