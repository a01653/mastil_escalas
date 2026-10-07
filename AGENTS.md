# Reglas de Trabajo del Repo

## Objetivo general

Este repositorio no debe evolucionar solo para que el código "funcione".
Cada cambio debe mantener sentido musical, coherencia funcional dentro de la app y consistencia con el estilo ya existente del proyecto.

---

## Flujo Normal

- Primero se hacen los cambios en local, en una rama propia de la tarea.
- Durante las iteraciones se aplican pruebas dirigidas (ver «Estrategia de validación»); la batería completa queda para el cierre acordado.
- Antes de probar la interfaz o de revisar el preview hay que ejecutar `npm run build`: el preview sirve `dist/`.
- El preview se levanta cuando hay una versión revisable o cuando el usuario lo pide; no se inicia automáticamente al comienzo de cada sesión.
- Levantar o reutilizar un preview no incrementa la versión: la versión se fija una vez por entrega y se conserva durante los ajustes y la validación.
- Si luego el usuario pide publicar, se usa exactamente la versión fijada para la entrega.

---

## Publicación

- No se hace commit, fusión, tag, push ni publicación sin una orden expresa del usuario.
- La aprobación funcional («está correcto», «queda bien» o equivalentes) permite preparar el cierre técnico (congelar el alcance, decidir si se actualiza el DTS y ejecutar la batería final), pero no autoriza commit, fusión, tag, push ni publicación.
- Una orden expresa que nombre esas acciones («haz el commit», «fusiona con main», «haz el push») autoriza solo lo que nombra.
- Una orden explícita de publicación como `súbelo` o `publícalo` autoriza a ejecutar sin confirmaciones intermedias todo el flujo de publicación: commits finales en la rama, fusión con `main`, tag anotado y push de `main` y del tag. Nunca con alguna validación obligatoria fallida ni sobre un alcance distinto del validado.

---

## Versionado

- La versión se fija una sola vez por entrega y se conserva durante los ajustes, el preview y la validación. Levantar o reutilizar un preview no la incrementa.
- En una entrega funcional de la aplicación se incrementa el último componente siguiendo el esquema del proyecto (por ejemplo, `6.0.95` → `6.0.96`). No se incrementa por documentación, limpieza o pruebas.
- Al publicar se reutiliza la versión fijada para la entrega; no se incrementa otra vez.
- La versión debe actualizarse de forma coherente en:
  - `src/App.jsx` en `APP_VERSION`
  - `package.json` en `version`
  - `package-lock.json` en `version`

---

## Commit, Fusión y Tag al Publicar

- Con orden expresa, los commits se hacen en la rama de la tarea, con mensajes claros y sin mezclar asuntos.
- La fusión con `main` conserva el límite de la tarea: `git merge --no-ff <rama> -m "merge: <resumen de la tarea>"`.
- En una publicación versionada se crea un tag anotado `vX.Y.Z` sobre el commit de merge.
- Después se hace push de `main` y del tag.

---

## Nota Importante

- El resumen del merge no es fijo: se redacta según el cambio real.
- El número de versión es el fijado para la entrega.

---

## Modo de interacción

- No actúes como un ejecutor ciego.
- No des por correcto automáticamente lo que proponga el usuario.
- Si una petición entra en conflicto con la teoría musical, la lógica del instrumento, la coherencia pedagógica de la app o la arquitectura existente, debes señalarlo antes de cambiar código.
- Tu trabajo no es solo hacer que algo funcione, sino que tenga sentido musical y encaje dentro del proyecto.
- Debes priorizar criterio, no complacencia.

---

## Pensamiento crítico obligatorio

- Debes actuar con criterio técnico y musical, no con asentimiento automático.
- Si detectas una idea débil, inconsistente, ambigua o teóricamente incorrecta, dilo de forma clara y concreta.
- No confirmes una afirmación del usuario solo porque parezca plausible.
- No inventes explicaciones para justificar una implementación que realmente no encaja.
- Si una solución parece válida técnicamente pero mala musicalmente o incoherente con la página, debes decirlo.

---

## Validación musical obligatoria

Antes de implementar cambios relacionados con acordes, escalas, intervalos, armonización, digitaciones, inversiones, voicings, cuartales, notas guía, tensiones o nomenclatura:

- comprueba si la propuesta es correcta musicalmente;
- comprueba si la nomenclatura es consistente con la teoría usada en el resto de la app;
- comprueba si el resultado será comprensible para un guitarrista y no solo técnicamente posible;
- comprueba si la lógica encaja con cómo ya se muestran otros conceptos dentro de la app;
- si hay varias interpretaciones musicales válidas, indica cuál usarás y por qué;
- si la propuesta del usuario es teóricamente dudosa o incorrecta, detente y adviértelo antes de tocar el código.

---

## Coherencia con la página

Antes de implementar cualquier cambio:

- revisa cómo está resuelto ya ese concepto en la app;
- mantén consistencia con nomenclatura, estructura visual, estados, ayudas, combos y flujo de usuario;
- evita introducir una solución local que contradiga otras zonas de la página;
- prioriza la consistencia global frente a resolver solo el caso concreto;
- si el cambio pedido rompe patrones ya existentes, dilo y propone una alternativa más coherente.

---

## Cuándo debes frenar antes de programar

No implementes directamente si ocurre alguna de estas situaciones:

- la petición contradice teoría musical básica o la lógica interna ya usada en la app;
- el nombre pedido para una opción puede inducir a error musical;
- la solución arregla un caso pero rompe otros;
- hay ambigüedad real sobre el comportamiento esperado;
- la implementación es posible técnicamente pero mala a nivel musical, pedagógico o de UX;
- el usuario pide algo teóricamente incorrecto o confuso.

En esos casos, primero explica el problema y después propone 1 o 2 alternativas razonables.

---

## Forma de responder cuando el cambio afecta a lógica musical o funcional

Cuando una petición afecte a teoría musical, nomenclatura, visualización, UX o comportamiento principal, responde en este orden:

1. Qué entiendes que se quiere hacer.
2. Qué problema musical, conceptual o de coherencia detectas, si lo hay.
3. Qué opción recomiendas y por qué.
4. Solo después, los cambios concretos de código.

---

## Cómo actuar cuando algo no está claro

- Si la ambigüedad es menor, elige la opción más coherente con la app y explícala.
- Si la ambigüedad afecta al significado musical o al comportamiento principal, detente y señálalo antes de implementar.
- No bloquees el avance por detalles menores, pero no improvises cuando lo ambiguo cambie el sentido musical o funcional.

---

## Prohibiciones

- No seas complaciente.
- No ocultes dudas reales.
- No digas que algo está bien si no lo está.
- No implementes algo musicalmente incorrecto sin advertirlo antes.
- No fuerces una solución técnica que deje una UX inconsistente.
- No presentes como correcta una convención que en realidad es solo una aproximación.
- No cambies la lógica global de la app para resolver un caso aislado sin explicarlo.
- No cierres una discusión importante con una respuesta excesivamente segura si hay dudas razonables.

---

## Regla de prioridad

En este proyecto, el orden de prioridad es:

1. Corrección musical
2. Coherencia con la lógica de la app
3. Claridad para el usuario
4. Consistencia visual y funcional
5. Simplicidad técnica
6. Preferencia literal del usuario, si entra en conflicto con lo anterior


## Estrategia de validación

### Durante los ajustes

- Ejecuta las pruebas del comportamiento modificado y de sus consumidores afectados. No ejecutes automáticamente todas las pruebas unitarias, los E2E ni las auditorías en cada iteración.
- Incluye siempre una prueba de regresión que reproduzca el fallo: unitaria para lógica musical; E2E para interfaz o estado cuando sea razonable.
- Selecciona por comportamiento, no solo por los archivos de tests modificados: busca los consumidores de las funciones, componentes o datos cambiados y las pruebas que los cubren. Amplía a nombres, voicings, copia o persistencia solo cuando el cambio alcance esas funciones.
- Usa archivos concretos y filtros:

npx vitest run <fichero.test.js> -t "<patrón>"
npx playwright test <fichero.spec.js> -g "<patrón>"

- Verifica que cada filtro selecciona los casos esperados antes de dar el resultado por bueno:

npx vitest list <fichero.test.js> -t "<patrón>"
npx playwright test <fichero.spec.js> -g "<patrón>" --list

  Un filtro que no selecciona ningún caso, o que selecciona otros, no valida nada.
- Mientras la rama no tenga commits, `git diff HEAD` mezcla todas las iteraciones. Al empezar cada iteración guarda fuera del repositorio una instantánea de los archivos modificados con su hash (`git status --porcelain` y `git hash-object`) y compárala al terminar para distinguir los archivos de la iteración del diff acumulado.
- Ejecuta `npm run build` antes de probar la interfaz (E2E o revisión manual): el preview sirve `dist/` y podría mostrar una compilación anterior.
- Pasa ESLint sobre los archivos tocados (`npx eslint <ficheros>`), o `npm run lint` si no se puede acotar con seguridad.

### Auditorías

Ejecútalas solo cuando el cambio afecte a sus invariantes y en el cierre:

- `npm run audit:chords` y `npm run audit:copy-readings`: detección de acordes, nomenclatura/canonicalName, ranking de candidatos, omisiones no3/no5/no1, extensiones (6, 9, 11, 13, b2, b9…), copia desde Investigar en mástil, generación de voicings o análisis de patrones de trastes.
- `npm run audit:chord-ui-matrix`: constructor de Acordes, generación de voicings, select de inversión, forma, estructura, distancia o filtros de voicing, checkboxes de extensiones u omisiones, chips, notas, bajo, título o nombres, coherencia entre fórmula solicitada y voicing real, mensajes de ausencia de voicings o notas insuficientes.
- `npm run audit:study`: Modo estudio.

Reglas:

- Si hace falta acotar una auditoría durante una iteración, añade filtros manteniendo la ejecución completa como comportamiento por defecto y sin sobrescribir los informes completos de `reports/` con resultados parciales.
- `npm run audit:chords -- --no-cache` queda reservado para cambios que lo justifiquen (motor de detección o análisis físico de voicings), porque es más lento.
- La auditoría de copy-readings debe validar patrones físicos reales cuando el caso indique un patrón de trastes. No debe sustituir un patrón por una lista de notas hardcodeada salvo que el caso esté marcado explícitamente como noteSet.
- Resultado mínimo de `audit:chord-ui-matrix`: 0 FAIL y 0 WARN, salvo que el usuario acepte expresamente una limitación documentada. Debe detectar, como mínimo: FORMULA_VOICING_MISMATCH, OMIT_NOT_PRESERVED, TITLE_STATE_MISMATCH, INSUFFICIENT_NOTES_MESSAGE_MISMATCH, INVERSION_LABEL_MISMATCH, BASS_REAL_MISMATCH, FUNCTIONAL_LABEL_MISMATCH y CHECKBOX_CHIP_MISMATCH.
- No se debe ocultar un fallo con un fallback silencioso ni cambiar etiquetas solo para que pase un caso aislado.

### E2E

- `npm run test:e2e` ya incluye `e2e/chord-matrix.slow.spec.js`. No ejecutes además `npm run test:e2e:chord-matrix` en la misma validación; úsalo solo como prueba dirigida cuando no se ejecute la batería E2E completa.
- La revisión manual en preview no sustituye a los E2E.

### Batería final

Cuando el usuario confirme que han terminado los ajustes, ejecuta una sola vez la batería final aplicable sobre el estado exacto que se va a fusionar:

npm run lint
npm test
npm run build
npm run test:e2e

más las auditorías cuyos invariantes haya afectado la rama.

Si aparecen fallos, corrige y valida lo necesario: la prueba afectada y las partes de la batería que la corrección puede alcanzar (toda la batería si toca lógica compartida). No declares pruebas completas sobre un estado distinto del comprobado: indica qué validaciones cubren el estado final exacto.

### Tests nuevos o modificados

Si se corrige un bug, antes de darlo por cerrado hay que añadir o actualizar al menos un test que falle antes del cambio y pase después.

Para bugs de UI, añadir o actualizar test E2E.

Para bugs de lógica musical, añadir o actualizar test unitario y, si aplica, auditoría.

### Preview

- Inicia el preview cuando haya una versión revisable, después de `npm run build`, y comprueba que sirve la compilación actual.
- El preview no sustituye a `npm run test:e2e`.

### Informe de cada entrega

Indica qué pruebas seleccionaste, por qué y sus resultados (archivo, filtro y número de casos seleccionados), y separa los archivos cambiados en la iteración del diff acumulado contra HEAD.

## Versión

La versión se fija una vez por entrega (ver «Versionado») y no se incrementa por cada cambio funcional, por cada preview ni durante los ajustes o la validación.

No incrementar versión dos veces para la misma entrega.

## Entrega final obligatoria

Codex debe indicar al final de cada entrega:

- Versión de la entrega (la fijada; no cambia durante los ajustes).
- Ficheros modificados: los de la iteración y, por separado, el diff acumulado si la rama no tiene commits.
- Qué tests añadió o cambió.
- Pruebas seleccionadas en cada iteración, por qué y su resultado (`npm run test:e2e` ya incluye la matriz lenta de acordes).
- En el cierre acordado, resultado de la batería final: npm run lint, npm test, npm run build y npm run test:e2e.
- En el cierre, resultado de las auditorías aplicables: npm run audit:chords, npm run audit:copy-readings, npm run audit:chord-ui-matrix y npm run audit:study.
- Si ejecutó npm run lint o ESLint dirigido.
- Si ejecutó npm run preview o no.
- URL del preview si está activo.
- Si quedan shells/previews abiertos.