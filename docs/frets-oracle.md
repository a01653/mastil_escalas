# Bateria de validacion del lector de voicings

Esta bateria separa dos capas:

1. Oraculo independiente: calcula notas, bajo y lecturas candidatas sin usar `analyzeFretsCore`.
2. Comparador: contrasta ese resultado contra el lector real de la aplicacion.

El objetivo no es imponer un unico nombre correcto por voicing. El informe busca detectar notas o bajos mal calculados, lecturas razonables ausentes, nombres divergentes, primary incorrecto cuando el caso lo fija, y candidatos demasiado forzados.

## Niveles de lectura del oraculo

El oraculo no define un unico nombre correcto. Un mismo voicing puede admitir varias lecturas segun contexto armonico, funcion, conduccion de voces o convencion de spelling.

Cada candidato automatico se clasifica en uno de estos niveles:

- `mustInclude`: lectura fuerte y esperable. En el comparador masivo, si falta, se considera fallo real pendiente.
- `mayInclude`: lectura posible pero contextual, ambigua o menos prioritaria. Si falta, se registra como aviso no bloqueante.
- `informational`: lectura analitica, fragmentaria, cuartal o demasiado forzada para exigirla como regresion. Sirve para explorar, no para fallar.

Las lecturas cuartales generadas automaticamente no entran en `mustInclude` por defecto. Solo son obligatorias cuando un caso dorado manual lo exige de forma explicita.

Las diferencias de enharmonia, por ejemplo `G# / Ab`, `D# / Eb`, `A# / Bb`, `C# / Db` o `F# / Gb`, se conservan como dato informativo, pero no son error salvo que afecten a una regla concreta de spelling contextual.

## JSON de un voicing real

```bash
npm run analyze:frets -- x02440 --json
npm run analyze:frets:json -- x02440
```

El JSON incluye `notes`, `bass`, `primary`, `readings`, intervalos, semitonos, omisiones y categoria.

## Generar el oraculo exhaustivo

```bash
npm run generate:frets-oracle
```

Por defecto escribe:

```text
reports/frets-oracle.ndjson
```

Recorre el espacio bruto `x,0,1,2,3,4,5` en seis cuerdas: `7^6 = 117649` patrones. Filtra patrones sin suficientes cuerdas o pitch classes para una lectura de acorde util.

Para una prueba rapida:

```bash
npm run generate:frets-oracle -- --limit 500 --out reports/frets-oracle.sample.ndjson
```

## Comparar contra la aplicacion

```bash
npm run compare:frets-oracle
```

Por defecto lee `reports/frets-oracle.ndjson` y escribe:

```text
reports/frets-oracle-compare.json
reports/frets-oracle-compare.md
reports/frets-oracle-compare-discrepancies.ndjson
```

El comparador no falla el proceso por discrepancias del oraculo masivo salvo que se pida explicitamente:

```bash
npm run compare:frets-oracle -- --fail-on-oracle
```

El comparador separa `issues` y `notices`:

- `issues`: fallos bloqueantes, como notas o bajo por pitch class distintos, `mustInclude` ausente o `preferred` incorrecto.
- `notices`: informacion no bloqueante, como enharmonia, `mayInclude` ausente, `informational` ausente, naming equivalente o candidatos extra.

Para resumir el NDJSON de analisis:

```bash
npm run summarize:frets-oracle-discrepancies
```

Genera:

```text
reports/frets-oracle-discrepancies-summary.json
reports/frets-oracle-discrepancies-summary.md
```

## Casos dorados

Los dorados manuales viven en:

```text
src/music/fretsOracleGoldenCases.json
```

Se ejecutan con:

```bash
npm run compare:frets-oracle -- --golden
npm run compare:frets-oracle:golden
```

Estos casos si son estrictos por defecto: si falla una lectura dorada, el comando devuelve exit code distinto de cero. Sus informes se escriben en `reports/frets-oracle-golden-compare.*`.

Nota musical: `002200` contiene `E A B`, no contiene `D`; por tanto `E7sus4(no3)` no es una lectura valida de ese voicing. El dorado acepta `Asus2/E` o `Aadd9/E` y prohibe `E7sus4(no3)`.

## Como anadir un nuevo voicing problematico de un video como caso dorado

1. Identifica el patron fisico exacto en formato `EADGBE`, usando `x` para cuerda muteada. Ejemplo: `x02440`.
2. Comprueba las notas reales desde consola:

```bash
npm run analyze:frets:json -- x02440
```

3. Anade una entrada en `src/music/fretsOracleGoldenCases.json` con `golden: true`, `voicing`, `notes`, `bass` y al menos una expectativa fuerte.
4. Usa `mustInclude` cuando la lectura debe aparecer obligatoriamente, `mustIncludeAny` cuando varias nomenclaturas sean aceptables, y `preferred` solo si el video o el contexto fijan claramente la lectura principal.
5. Si el voicing puede inducir una lectura incorrecta concreta, anadela en `mustNotInclude`.
6. Valida solo los dorados:

```bash
npm run compare:frets-oracle:golden
```

No conviertas lecturas contextuales o muy discutibles en `mustInclude`: para eso estan `mayInclude` e `informational` en el oraculo masivo.
