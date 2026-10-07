# CLAUDE.md

Este fichero define la forma de trabajo permanente para este repositorio.

## 1. Idioma y comunicación

- Comunícate siempre con el usuario en español.
- Comunícate siempre en español de España, usando tuteo. No utilices voseo ni formas propias del español latinoamericano, salvo que el usuario las solicite expresamente.
- Explica con claridad qué vas a cambiar, qué has comprobado y qué queda pendiente.
- No des por correcto un resultado solo porque compile o se vea bien manualmente.
- Si una petición presenta ambigüedad musical, funcional o de experiencia de usuario, detente antes de modificar el código y plantea una o dos alternativas razonadas.

## 2. Principios generales

1. Cada trabajo debe realizarse en una rama propia.
2. Una rama debe contener un único objetivo; no mezcles cambios no relacionados.
3. Durante el desarrollo ejecuta pruebas dirigidas al comportamiento modificado y a sus consumidores afectados (apartado 5).
4. Durante las iteraciones se aplican las pruebas dirigidas; la batería completa queda para el cierre acordado: se ejecuta una sola vez, cuando el usuario confirme que el resultado funcional es correcto, y precede a cualquier fusión con `main`.
5. Nunca fusiones ni publiques si alguna validación obligatoria falla.
6. La versión se fija una sola vez por entrega y se conserva durante los ajustes y la validación (apartado 10.1). Commit, fusión, tag, push y publicación requieren una orden expresa del usuario (apartado 7).
7. No descartes, sobrescribas ni incluyas cambios previos ajenos a la tarea.
8. `docs/DTS.md` es la fuente de verdad de la arquitectura y del diseño técnico; evita duplicar aquí información que pueda quedar obsoleta.

## 3. Inicio obligatorio de cada trabajo

Está prohibido modificar cualquier archivo directamente sobre `main`, incluidos documentación, configuración y cambios pequeños. En `main` solo se permiten operaciones de lectura, comprobación y actualización (`status`, `diff`, `log`, `fetch`, `pull --ff-only`). Esta regla no tiene excepciones por tratarse de documentación, cambios mínimos o correcciones urgentes.

Antes de editar:

1. Ejecuta `git status --short` y comprueba la rama actual.
2. Si existen cambios ajenos o sin identificar, detente: muéstralos y determina con el usuario cómo tratarlos antes de seguir. No los descartes, no los muevas, no los incluyas en la tarea, no uses `stash` ni los comitees por iniciativa propia.
3. Si el árbol está limpio, parte de `main` actualizado mediante una actualización *fast-forward*:

```bash
git switch main
git pull --ff-only origin main
```

4. Crea una rama nueva antes de efectuar cualquier cambio:

```bash
git switch -c <tipo>/<descripcion-breve>
```

5. Confirma que la rama activa no es `main`. Solo entonces empieza a modificar archivos.

Prefijos recomendados:

- `feat/` — funcionalidad nueva.
- `fix/` — corrección de un error.
- `refactor/` — reorganización sin cambio funcional previsto.
- `docs/` — documentación.
- `test/` — pruebas.
- `chore/` — mantenimiento, dependencias o configuración.

Los nombres deben estar en minúsculas, usar guiones y describir una sola tarea. Ejemplos: `feat/filtro-voicings`, `fix/navegacion-movil`, `docs/dts-latex`.

Si ya estás en una rama creada para la misma tarea, continúa en ella. Una petición distinta requiere otra rama.

Crear la rama después de haber empezado a modificar archivos no cumple este flujo, aunque el resultado se fusione correctamente después: la rama debe existir *antes* del primer cambio. Si se descubre que se ha modificado algo directamente sobre `main`, detén el trabajo de inmediato, informa del error y corrige la situación (crea la rama y traslada los cambios) antes de continuar.

## 4. Análisis antes de implementar

Antes de tocar el código:

- Localiza los módulos, componentes y pruebas relacionados.
- Revisa `docs/DTS.md` cuando el cambio afecte arquitectura, persistencia, navegación, lógica musical, construcción, despliegue o pruebas.
- Define el comportamiento esperado y los casos límite.
- Para un bug, crea o actualiza primero una prueba que reproduzca el fallo siempre que sea viable.
- Para lógica musical, verifica teoría, nomenclatura, digitaciones, inversiones, tensiones, omisiones y coherencia con el resto de la aplicación.

No implementes directamente si la propuesta:

- contradice la teoría musical o la lógica interna existente;
- arregla un caso rompiendo otros;
- introduce un nombre musical engañoso;
- tiene varias interpretaciones válidas que producen comportamientos diferentes;
- es técnicamente posible, pero pedagógica o funcionalmente confusa.

## 5. Ciclo rápido de desarrollo en la rama

El objetivo de esta fase es iterar con rapidez. Durante los ajustes no ejecutes automáticamente todas las pruebas unitarias, los E2E ni las auditorías: ejecuta las que cubren el comportamiento modificado y a sus consumidores afectados.

### 5.1 Selección de pruebas dirigidas

1. Identifica el comportamiento modificado y sus consumidores: busca quién usa las funciones, componentes o datos cambiados y qué pruebas los cubren. No bases la selección únicamente en los archivos de tests modificados.
2. Incluye una prueba de regresión que reproduzca el fallo (apartado 5.4).
3. Amplía la selección a nombres, voicings, copia, persistencia u otras áreas solo cuando el cambio alcance esas funciones.
4. Usa archivos concretos y filtros:

```bash
npx vitest run <fichero.test.js> -t "<patrón>"
npx playwright test <fichero.spec.js> -g "<patrón>"
```

5. Verifica que cada filtro selecciona los casos esperados antes de dar el resultado por bueno. Un filtro que no selecciona ningún caso, o que selecciona otros, no valida nada:

```bash
npx vitest list <fichero.test.js> -t "<patrón>"
npx playwright test <fichero.spec.js> -g "<patrón>" --list
```

Ejemplo: para un arreglo de la suspensión en el constructor se seleccionan las pruebas de normalización del estado, de conservación de grados y de la séptima, y los E2E de ida y vuelta en Acordes y Acordes cercanos; nombres, voicings, copia o persistencia solo si el cambio llega a ellos.

### 5.2 Comprobaciones según el tipo de cambio

- Importaciones, configuración de Vite o estructura del bundle: `npm run build`.
- Archivos con cambios susceptibles de lint: ESLint dirigido sobre esos archivos (`npx eslint <ficheros>`), o `npm run lint` si no es posible limitarlo con seguridad.
- Interfaz: ejecuta `npm run build` antes de cualquier E2E o revisión visual. El preview sirve `dist/` y podría mostrar una compilación anterior; reinícialo o comprueba que sirve la compilación actual.
- Auditorías masivas (`audit:chords`, `audit:copy-readings`, `audit:chord-ui-matrix`, `audit:study`): solo cuando el cambio afecta a sus invariantes (apartado 9.2) y en el cierre. Si hace falta acotarlas durante una iteración, añade filtros manteniendo la ejecución completa como comportamiento por defecto y sin sobrescribir los informes completos de `reports/` con resultados parciales. `npm run audit:chords -- --no-cache` se reserva para cambios que lo justifiquen.
- `npm run test:e2e` ya incluye `e2e/chord-matrix.slow.spec.js`. No ejecutes además `npm run test:e2e:chord-matrix` en la misma validación; úsalo solo como prueba dirigida cuando no se ejecute la batería E2E completa.
- Interfaz revisable: levanta una vista previa cuando haya una versión estable que el usuario pueda revisar, no al inicio automático de cada sesión.

### 5.3 Archivos de la iteración frente al diff acumulado

Mientras la rama no tenga commits, `git diff HEAD` mezcla todas las iteraciones. Al empezar cada iteración guarda fuera del repositorio una instantánea de los archivos modificados con su hash (`git status --porcelain` y `git hash-object`) y compárala al terminar. Informa por separado de los archivos cambiados en la iteración y del diff acumulado contra HEAD.

### 5.4 Regresiones

- Un bug de lógica debe quedar cubierto por una prueba unitaria.
- Un bug de interfaz o estado debe quedar cubierto por una prueba E2E cuando sea razonable.
- Un problema de detección, copia o nomenclatura debe añadir o actualizar el caso correspondiente en las auditorías.
- Una revisión manual no sustituye una prueba automatizada reproducible.

### 5.5 Commits de trabajo

- No hagas commits, ni siquiera locales de punto de control, ni push, merge o tag sin una orden expresa del usuario. Cuando la haya, usa mensajes claros y sin mezclar asuntos.
- No cambies la versión fijada para la entrega (apartado 10.1).
- No incorpores residuos de otras tareas, capturas temporales, cachés o resultados locales de pruebas.

## 6. Entrega para revisión del usuario

Cuando la implementación esté lista:

1. Ejecuta las pruebas dirigidas seleccionadas según el apartado 5.1.
2. Ejecuta `npm run build` si el cambio afecta código de la aplicación, antes de los E2E y de la vista previa.
3. Inicia o reutiliza la vista previa, comprobando que sirve la compilación actual, y proporciona su URL.
4. Resume:
   - rama activa;
   - archivos cambiados en esta iteración y, por separado, el diff acumulado contra HEAD;
   - comportamiento implementado;
   - pruebas seleccionadas, por qué y su resultado (archivo, filtro y número de casos seleccionados);
   - aspectos que el usuario debe comprobar visual o musicalmente;
   - limitaciones o decisiones abiertas.
5. Espera la confirmación del usuario. No ejecutes todavía la batería final ni fusiones con `main`.

Si el usuario solicita ajustes, continúa en la misma rama y repite el ciclo rápido.

## 7. Aprobación funcional y cierre técnico

Expresiones como «está correcto», «queda bien» o equivalentes son una aprobación funcional: permiten preparar el cierre técnico, pero no autorizan commit, fusión, tag, push ni publicación.

Preparación del cierre técnico:

1. Congela el alcance: después de este punto no añadas mejoras no solicitadas.
2. Comprueba si `origin/main` ha avanzado (`git fetch`). Integrarlo en la rama es una fusión: si hay avances, informa y espera la orden expresa. Si aparecen conflictos relevantes, no los resuelvas ocultando o descartando cambios.
3. Decide si corresponde actualizar el DTS según el apartado 8.
4. Comprueba que la versión de la entrega está fijada (apartado 10.1); si ya lo está, consérvala.
5. Ejecuta la batería final aplicable del apartado 9, una sola vez.

Si algo falla, no hagas merge ni push. Corrige en la rama y valida lo necesario: la prueba afectada y las partes de la batería final que la corrección puede alcanzar (toda la batería si toca lógica compartida). No declares pruebas completas sobre un estado distinto del comprobado: indica qué validaciones cubren el estado final exacto.

Commit, fusión, tag, push y publicación requieren una orden expresa del usuario: una que nombre esas acciones (por ejemplo, «haz el commit», «fusiona con main», «haz el push») o una orden de publicación inequívoca («publícalo», «súbelo»), que autoriza el flujo completo del apartado 10. Ejecuta solo lo que cubra la orden, nunca con una validación obligatoria fallida ni sobre un alcance distinto del validado.

## 8. Mantenimiento del DTS y del informe LaTeX

### 8.1 Fuente de verdad

- `docs/DTS.md` es el documento técnico principal.
- Si existen `docs/latex/DTS_Mastil_Escalas.tex` y `docs/latex/DTS_Mastil_Escalas.pdf`, son representaciones derivadas del Markdown y deben mantenerse coherentes con él.
- No modifiques primero el LaTeX de forma que el Markdown quede desactualizado.

### 8.2 Cuándo actualizarlo

Actualiza el DTS dentro de la misma rama cuando el cambio altere de forma material alguno de estos elementos:

- arquitectura, módulos o responsabilidades;
- dependencias o herramientas;
- modelo de estado o persistencia;
- lógica musical o comportamiento funcional documentado;
- navegación o flujos principales;
- importación, exportación o audio;
- construcción, despliegue, Capacitor o CI;
- comandos o estrategia de pruebas;
- limitaciones, riesgos o recomendaciones descritos en el DTS.

No es obligatorio actualizar el DTS por:

- correcciones ortográficas;
- cambios puramente cosméticos;
- ajustes menores que no modifican el diseño ni el comportamiento documentado;
- tests añadidos sin cambio de estrategia;
- refactors internos que no cambian responsabilidades ni interfaces relevantes.

Actualizar el Markdown, LaTeX y PDF en cada retoque pequeño produciría ruido y ralentizaría el proyecto. Cuando no aplique, indícalo expresamente en el resumen final: `DTS: no requiere actualización`.

### 8.3 Regeneración del PDF

Cuando `docs/DTS.md` cambie de forma material:

1. Actualiza o regenera el `.tex` a partir del Markdown.
2. Compila el PDF hasta resolver índice y referencias.
3. Renderiza el PDF y revisa visualmente portada, índice, tablas, diagramas, código, cabeceras, pies, saltos y márgenes.
4. Corrige errores de composición y avisos relevantes como `Overfull \\hbox`.
5. Incluye `.md`, `.tex` y `.pdf` en la misma rama y validación final.

La versión indicada en el DTS representa la revisión técnica realmente analizada; no debe cambiarse mecánicamente si el contenido técnico no se ha revisado.

## 9. Batería final antes del merge

La batería final se ejecuta una sola vez, cuando el usuario confirme que han terminado los ajustes, y sobre el estado exacto que se va a fusionar. Durante las iteraciones no se ejecuta completa (apartado 5).

### 9.1 Cambios de código de la aplicación

Obligatorio para cualquier publicación con cambios en `src/`, configuración de build o dependencias:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

`npm run test:e2e` incluye `e2e/chord-matrix.slow.spec.js`.

La vista previa manual complementa estas pruebas, pero no las sustituye.

### 9.2 Auditorías musicales condicionales

Si afecta detección, nombres, ranking, omisiones, extensiones, voicings o análisis físico:

```bash
npm run audit:chords
npm run audit:copy-readings
```

Si afecta constructor de acordes, inversión, forma, estructura, distancia, extensiones, omisiones, chips, bajo real, título o coherencia fórmula-voicing:

```bash
npm run audit:chord-ui-matrix
```

Resultado esperado: `0 FAIL` y `0 WARN`, salvo limitación aceptada y documentada expresamente por el usuario.

Si afecta Modo estudio:

```bash
npm run audit:study
```

Si modifica profundamente Acordes, inversiones, omisiones, extensiones, copia de lecturas o generación de voicings, la matriz lenta (`e2e/chord-matrix.slow.spec.js`) debe pasar. En la batería final ya la ejecuta `npm run test:e2e`: no lances además `npm run test:e2e:chord-matrix`.

`npm run audit:chords -- --no-cache` se reserva para cambios profundos del motor de detección o del análisis físico de voicings.

Las auditorías condicionales complementan la batería base; no la sustituyen.

### 9.3 Cambios solo documentales

Para una rama que únicamente modifica documentación:

- No ejecutes toda la batería de la aplicación salvo que el documento dependa de resultados que deban volver a verificarse.
- Valida enlaces, rutas, comandos y referencias mencionadas.
- Si hay LaTeX/PDF, compila, renderiza y revisa visualmente todas las páginas.

### 9.4 Cambios de workflows, dependencias o empaquetado

Además de las pruebas base, valida específicamente el flujo modificado. No afirmes que Android, Pages o un workflow funcionan si no se han ejecutado o si no puede comprobarse su resultado real.

## 10. Versionado y publicación

### 10.1 Versión de la entrega

- La versión se fija una sola vez por entrega y se conserva durante los ajustes, el preview y la validación. Levantar o reutilizar un preview no la incrementa.
- No incrementes la versión para documentación, limpieza, pruebas o cambios que no publiquen una aplicación distinta.
- En una entrega funcional de la aplicación, incrementa el último componente siguiendo el esquema actual del proyecto, por ejemplo `6.0.94` → `6.0.95`. Si al preparar el cierre la entrega aún no tiene versión fijada, fíjala antes de la batería final, para que las pruebas se realicen sobre el candidato exacto.
- Actualiza de forma coherente:
  - `src/App.jsx` → `APP_VERSION`;
  - `package.json` → `version`;
  - `package-lock.json` → `version`.

Atención: actualmente una subida de `APP_VERSION` puede invalidar la configuración persistida del usuario. No incrementes versiones innecesariamente y no ocultes este efecto cuando una publicación vaya a producirlo.

### 10.2 Merge

Solo con orden expresa de fusión o de publicación (apartado 7) y tras superar la batería final:

1. Comprueba que la rama solo contiene cambios de la tarea.
2. Crea los commits finales necesarios en la rama.
3. Cambia a `main` y actualízala mediante *fast-forward* desde el remoto.
4. Fusiona la rama conservando claramente el límite de la tarea:

```bash
git switch main
git pull --ff-only origin main
git merge --no-ff <rama> -m "merge: <resumen de la tarea>"
```

5. Si la fusión cambia el resultado respecto de lo validado, repite las comprobaciones afectadas antes del push.

### 10.3 Tag y push

- Solo con orden expresa de push o de publicación (apartado 7).
- Para una publicación versionada, crea un tag anotado `vX.Y.Z` sobre el commit de merge.
- Para cambios no versionados, no crees tag.
- Empuja `main` y, cuando exista, el tag:

```bash
git push origin main
git push origin vX.Y.Z
```

- No declares la publicación completada hasta confirmar el resultado del push.
- Si el push a `main` activa GitHub Pages, comprueba el resultado del workflow antes de dar por cerrado el despliegue.
- Elimina la rama local solo después de confirmar el merge y el push. No elimines una rama remota sin autorización expresa.

## 11. Android

No generes el APK por una modificación exclusivamente documental.

Para una publicación versionada con cambios en la aplicación:

```bash
npm run build:android
npm run cap:sync
```

Ejecuta después la construcción Gradle con JDK 21 y Android SDK configurados. La ruta de Java depende de la máquina; no presupongas una ruta de Windows fija sin comprobarla.

Verifica la existencia y fecha del APK resultante antes de declararlo generado. Si el proyecto todavía no ofrece un script reproducible para el paso Gradle, indícalo en vez de inventar una validación.

## 12. Servidores de preview

- No inicies build y preview automáticamente al comienzo de cada sesión.
- Inicia el preview cuando exista una versión revisable o cuando el usuario lo solicite.
- Levantar o reutilizar el preview no incrementa la versión (apartado 10.1).
- Utiliza el mecanismo de proceso en segundo plano disponible; no uses construcciones incompatibles con el entorno.
- Reutiliza el servidor si sirve exactamente la compilación actual; de lo contrario, reinícialo.
- Informa de la URL y de los procesos que queden activos al finalizar.

## 13. Comandos del proyecto

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
npm run test:e2e
npm run test:e2e:chord-matrix
npm run audit:chords
npm run audit:copy-readings
npm run audit:chord-ui-matrix
npm run audit:study
npm run build:android
npm run cap:sync
```

Para pruebas concretas:

```bash
npx vitest run <fichero.test.js>
npx playwright test <fichero.spec.js>
```

## 14. Arquitectura

Consulta `docs/DTS.md` para la arquitectura, los módulos, los flujos, la persistencia, la estrategia de pruebas, la construcción, el despliegue, las limitaciones y las líneas de evolución vigentes.

Como orientación estable, Mástil Escalas es una SPA React/Vite en español, sin backend propio, con lógica musical en `src/music/`, lógica de dominio en `src/features/`, presentación en `src/components/` y orquestación principal en `src/App.jsx`.

Si el código contradice al DTS, toma el código y las pruebas como realidad, informa de la discrepancia y actualiza la documentación si el cambio es material.

## 15. Prioridades de decisión

1. Corrección musical y ausencia de regresiones.
2. Comportamiento confirmado por el usuario.
3. Coherencia con el modelo interno de la aplicación.
4. Claridad pedagógica para guitarristas.
5. Consistencia funcional y visual.
6. Simplicidad técnica y mantenibilidad.

Si una preferencia concreta entra en conflicto con la corrección musical o puede producir una regresión, no la ignores ni la implementes silenciosamente: explica el conflicto y pide una decisión informada.

## 16. Informe final obligatorio

Al cerrar una tarea, informa de:

- rama utilizada;
- commits y commit de merge;
- archivos modificados;
- pruebas añadidas o actualizadas;
- pruebas dirigidas realizadas durante el desarrollo, con el motivo de su selección;
- resultados de `lint`, unitarios, build, E2E y auditorías aplicables;
- estado del DTS: actualizado o no requerido, con motivo;
- versión anterior y nueva, si aplica;
- tag creado, si aplica;
- resultado del push y del workflow de despliegue;
- APK generado o motivo por el que no aplicaba;
- URL del preview y procesos que continúen activos;
- residuos o cambios ajenos que hayan quedado fuera.

No declares «completado», «publicado» o «desplegado» si falta alguna comprobación obligatoria o no se ha confirmado el resultado real.
