# APK Android 6.0.98

Se actualiza la distribución Android desde 6.0.96 hasta 6.0.98, conservando la versión ya publicada en la web. El código JavaScript, las dependencias, la configuración de Capacitor y los dos archivos de configuración de Vite son idénticos a `f47df481950e7a23592f33f847f0ed95ffb50fcc`.

## Cambios

- `android/app/build.gradle`: obtiene `versionName` de `package.json` y deriva un `versionCode` ordenado. El valor anterior del proyecto era `1.0`/`1`; el APK resultante declara `6.0.98`/`6000098`.
- Quince PNG de lanzamiento y el fondo adaptativo: nuevo diseño del mástil, también en iconos circulares y adaptativos.
- `releases/mastil-escalas-v6.0.98.apk` y su SHA-256.
- README: descarga e instrucciones para migrar desde una APK con firma anterior.
- DTS, LaTeX y PDF: proceso Android, metadatos, verificación y límites de esta entrega.
- Este informe y el JSON de inspección del APK.

## Construcción y comprobaciones

La compilación se ejecutó en [GitHub Actions, ejecución 38754673555](https://github.com/a01653/mastil_escalas/actions/runs/38754673555), sobre el commit `298d54493e47f14ee4f6cfb3b8f6ef9a80772576`, con Node 22, JDK 21, Android SDK 36 y Build Tools 36.0.0. El workflow de preparación se conserva en ese commit; se retira del estado final para que la publicación no añada automatizaciones permanentes.

Comandos ejecutados:

```sh
npm ci
NODE_OPTIONS=--max-old-space-size=4096 npm run build:android
npm run cap:sync
cd android
bash ./gradlew --no-daemon :app:assembleDebug :app:lintDebug --console=plain
```

| Comprobación | Resultado |
| --- | --- |
| Build Android y sincronización Capacitor | Correctos |
| Gradle `assembleDebug` y `lintDebug` | Correctos; 124 tareas ejecutadas |
| `npm run lint` sobre la rama | Correcto |
| Identificador y actividad de inicio | `com.jqbit.mastilescalas` y `MainActivity` |
| Versión Android | `6.0.98`, código `6000098` |
| Firma | Válida, APK Signature Scheme v2 |
| Integridad ZIP | Correcta |
| Iconos nativos | 15 PNG coinciden con los recursos de esta rama |
| Catálogo de acordes | Los 12 852 JSON coinciden byte por byte con los originales |
| Archivos JavaScript incluidos | 1467; versión de aplicación 6.0.98 presente |
| PWA dentro del APK | Sin registro de manifiesto en HTML ni `sw.js`; utiliza recursos locales |
| PDF técnico | 48 páginas, compilado y revisado visualmente; sin desbordamientos nuevos |

La regresión de metadatos se reprodujo antes del cambio: el `versionName` del proyecto no coincidía con `package.json` (`1.0` frente a `6.0.98`). La inspección del APK compilado verifica el valor corregido, junto con el `versionCode` y el paquete real. No se añaden pruebas musicales: los cambios se limitan al empaquetado, los metadatos y los iconos nativos.

No se repiten los unitarios ni los E2E web sobre un código de aplicación idéntico al ya validado en 6.0.98. Sus resultados y la repetición dirigida del flujo PWA constan en [la validación de identidad](2026-10-15-pwa-install-identity.md). No aplican auditorías musicales. No se levanta un preview.

## Artefacto y limitaciones

- Tamaño: 12 120 293 bytes.
- SHA-256: `cef65ea7672bdaee44782129af72dd3f4eeb9a54de3b5fded2ef4bc92333f9e1`.
- Las huellas de firma, el manifiesto compilado y los resultados completos están en [el JSON de inspección](2026-10-15-android-apk-6.0.98.json).
- Compilación debug. La firma difiere de la APK 6.0.96: es necesario exportar la configuración y desinstalar aquella antes de instalar esta. No está disponible la clave de firma anterior.
- No se ha probado la instalación ni la apertura en un teléfono o emulador Android; la verificación aquí descrita es del paquete compilado.
- No se cambia la versión de la aplicación ni se mueve el tag existente `v6.0.98`: se completa su distribución Android.
