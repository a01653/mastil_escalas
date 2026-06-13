# Informe de lecturas `mayInclude` ausentes

Generado: 2026-06-13T21:47:39.854Z

Caracteriza las lecturas que el oraculo marca como `mayInclude` pero el lector real
(`analyzeFretsCore`) no devuelve, para decidir cuales mostrar como alternativas
razonables y cuales dejar como avanzadas/contextuales. **No modifica el lector.**

## Totales

- mayInclude ausentes (avisos MISSING_MAY_INCLUDE): **39860**
- Voicings afectados: 17588
- Candidatos reconstruidos desde el oraculo: 39860
- No reconstruidos (drift oraculo): 0
- Total segun informe de comparacion: 39860 (coincide)

## Hallazgo principal

- Lecturas `mayInclude` **utiles** ausentes del lector: **0**
- Verificacion muestreada (1 de cada 37 voicings, 1733 muestras):
  - mayInclude utiles encontradas: 1436
  - ya emitidas por el lector: 1436 (100%)
  - ausentes del lector: 0

> El lector real (`analyzeFretsCore`) ya devuelve **todas** las lecturas `mayInclude` musicalmente
> utiles (extendidos completos con 7ª, acordes de 6ª, add9, fragmentos que omiten solo la 5ª).
> Por tanto, mostrar 'alternativas razonables' es trabajo de **UI** (exponer `rankedReadings[1..]`,
> no solo el Primary), **no del lector**. Las `mayInclude` que de verdad faltan son **todas**
> contextuales o forzadas (sus+tension, fragmentos sin 3ª, omit-5 con tensiones apiladas).

## Reparto por veredicto musical

| Veredicto | Casos | % |
| --- | --- | --- |
| util (alternativa razonable) | 0 | 0% |
| limite (contextual) | 17164 | 43.1% |
| forzada (avanzada) | 22696 | 56.9% |

## Agrupacion por tipo de lectura (kind)

| Tipo | Casos |
| --- | --- |
| sus-extended | 16380 |
| omit3 | 13714 |
| omit5-multi-tension | 8982 |
| omit5-add9 | 784 |

## Agrupacion por calidad de acorde

| Calidad | Casos |
| --- | --- |
| sus | 16380 |
| mayor (triada) | 12726 |
| maj7 | 5428 |
| menor (triada) | 5326 |

### Categoria cruda del oraculo (detalle)

| Categoria | Casos |
| --- | --- |
| triadic-fragment | 18052 |
| suspended-extended | 16380 |
| maj7-fragment | 5428 |

## Agrupacion por patron de intervalo

| Patron (semitonos ascendentes) | Casos |
| --- | --- |
| 1·9·11·5·7 | 1756 |
| 1·2·11·5 | 1620 |
| 1·9·4·5 | 1620 |
| 1·2·5·13 | 1620 |
| 1·9·11·5 | 1620 |
| 1·9·5·13 | 1620 |
| 1·9·5·13·7 | 1444 |
| 1·9·3·13 | 1400 |
| 1·3·11·13 | 1374 |
| 1·4·5·13 | 1364 |
| 1·9·b3·3·13 | 1128 |
| 1·9·b3·13 | 1056 |
| 1·2·11·5·b7 | 998 |
| 1·9·4·5·b7 | 998 |
| 1·2·11·5·13 | 998 |
| 1·9·4·5·13 | 998 |
| 1·9·11·5·b7 | 998 |
| 1·9·11·5·13 | 998 |
| 1·2·11·5·7 | 878 |
| 1·9·4·5·7 | 878 |
| 1·5·13·7 | 868 |
| 1·9·3·11 | 868 |
| 1·9·b3·11 | 812 |
| 1·9·3·11·13 | 798 |
| 1·9·b3·3 | 784 |
| 1·4·5·13·7 | 770 |
| 1·11·5·13·7 | 770 |
| 1·11·5·b7·7 | 724 |
| 1·2·5·13·b7 | 722 |
| 1·9·5·13·b7 | 722 |
| 1·4·5·13·b7 | 722 |
| 1·2·5·13·7 | 722 |
| 1·9·b3·11·13 | 718 |
| 1·9·b3·3·11 | 572 |
| 1·9·5·b7·7 | 534 |
| 1·9·11·5·13·7 | 420 |
| 1·9·11·5·b7·7 | 376 |
| 1·5·13·b7·7 | 286 |
| 1·9·b3·3·11·13 | 256 |
| 1·9·5·13·b7·7 | 232 |

_(10 patrones adicionales en el JSON.)_

## Top 50 casos mas representativos

| Firma (calidad :: patron :: faltan :: tensiones :: veredicto) | Casos | Ejemplo | Lectura ausente | Primary app |
| --- | --- | --- | --- | --- |
| sus :: 1·2·11·5 :: miss[] :: tens[11] :: limite | 1620 | xx0011 | Csus2(add11)/D | Cuartal D |
| sus :: 1·9·4·5 :: miss[] :: tens[9] :: limite | 1620 | xx0011 | Csus4(add9)/D | Cuartal D |
| sus :: 1·2·5·13 :: miss[] :: tens[13] :: limite | 1620 | xx0011 | Fsus2(add13)/D | Cuartal D |
| mayor (triada) :: 1·9·11·5 :: miss[3] :: tens[9,11] :: forzada | 1620 | xx0011 | Cadd9(add11,no3)/D | Cuartal D |
| mayor (triada) :: 1·9·5·13 :: miss[3] :: tens[9,13] :: forzada | 1620 | xx0011 | Fadd9(add13,no3)/D | Cuartal D |
| mayor (triada) :: 1·9·3·13 :: miss[5] :: tens[9,13] :: forzada | 1400 | xx0210 | C(add9,add13,no5)/D | D7sus2 |
| mayor (triada) :: 1·3·11·13 :: miss[5] :: tens[11,13] :: forzada | 1374 | xx0002 | D(add11,add13,no5) | Gmaj7/D |
| sus :: 1·4·5·13 :: miss[] :: tens[13] :: limite | 1364 | xx0005 | Dsus4(add13) | Gadd9/D |
| menor (triada) :: 1·9·b3·3·13 :: miss[5] :: tens[9,13] :: forzada | 1128 | x00540 | C(add9,b3,add13,no5)/A | Adim(add11,5) |
| menor (triada) :: 1·9·b3·13 :: miss[5] :: tens[9,13] :: forzada | 1056 | xx0424 | Bm(add9,add13,no5)/D | Bsus2add13(no5)/D |
| sus :: 1·2·11·5·b7 :: miss[] :: tens[11] :: limite | 998 | x00000 | Asus2(add11,b7) | Bm7(add11,addb6,no5)/A |
| sus :: 1·9·4·5·b7 :: miss[] :: tens[9] :: limite | 998 | x00000 | Asus4(add9,b7) | Bm7(add11,addb6,no5)/A |
| sus :: 1·2·11·5·13 :: miss[] :: tens[11,13] :: limite | 998 | x00000 | Dsus2(add11,add13)/A | Bm7(add11,addb6,no5)/A |
| sus :: 1·9·4·5·13 :: miss[] :: tens[9,13] :: limite | 998 | x00000 | Dsus4(add9,add13)/A | Bm7(add11,addb6,no5)/A |
| mayor (triada) :: 1·9·11·5·b7 :: miss[3] :: tens[9,11] :: forzada | 998 | x00000 | Aadd9(add11,b7,no3) | Bm7(add11,addb6,no5)/A |
| mayor (triada) :: 1·9·11·5·13 :: miss[3] :: tens[9,11,13] :: forzada | 998 | x00000 | Dadd9(add11,add13,no3)/A | Bm7(add11,addb6,no5)/A |
| sus :: 1·2·11·5·7 :: miss[] :: tens[11] :: limite | 878 | x00012 | Gsus2(add11,7)/A | Cuartal mixto A |
| sus :: 1·9·4·5·7 :: miss[] :: tens[9] :: limite | 878 | x00012 | Gsus4(add9,7)/A | Cuartal mixto A |
| mayor (triada) :: 1·9·11·5·7 :: miss[3] :: tens[9,11] :: forzada | 878 | x00012 | Gadd9(add11,7,no3)/A | Cuartal mixto A |
| maj7 :: 1·9·11·5·7 :: miss[3] :: tens[9,11] :: forzada | 878 | x00012 | Gmaj7(add9,add11,no3)/A | Cuartal mixto A |
| maj7 :: 1·5·13·7 :: miss[3] :: tens[13] :: forzada | 868 | xx0052 | Gmaj7(add13,no3)/D | Em7(add9,no5)/D |
| mayor (triada) :: 1·9·3·11 :: miss[5] :: tens[9,11] :: forzada | 868 | xx0052 | D(add9,add11,no5) | Em7(add9,no5)/D |
| menor (triada) :: 1·9·b3·11 :: miss[5] :: tens[9,11] :: forzada | 812 | xx0051 | Dm(add9,add11,no5) | Em7(addb2,no5)/D |
| mayor (triada) :: 1·9·3·11·13 :: miss[5] :: tens[9,11,13] :: forzada | 798 | x00422 | A(add9,add11,add13,no5) | Dmaj7(add13)/A |
| menor (triada) :: 1·9·b3·3 :: miss[5] :: tens[9] :: limite | 784 | xx0540 | C(add9,b3,no5)/D |  |
| sus :: 1·4·5·13·7 :: miss[] :: tens[13] :: limite | 770 | x00152 | Asus4(add13,7) | Dadd9,addb5/A |
| maj7 :: 1·11·5·13·7 :: miss[3] :: tens[11,13] :: forzada | 770 | x00152 | Amaj7(add11,add13,no3) | Dadd9,addb5/A |
| maj7 :: 1·11·5·b7·7 :: miss[3] :: tens[11] :: forzada | 724 | x00054 | Amaj7(add11,b7,no3) | E7(#9,11,no5)/A |
| sus :: 1·2·5·13·b7 :: miss[] :: tens[13] :: limite | 722 | x00051 | Gsus2(add13,b7)/A | Dm(add9,11)/A |
| mayor (triada) :: 1·9·5·13·b7 :: miss[3] :: tens[9,13] :: forzada | 722 | x00051 | Gadd9(add13,b7,no3)/A | Dm(add9,11)/A |
| sus :: 1·4·5·13·b7 :: miss[] :: tens[13] :: limite | 722 | x00052 | Asus4(add13,b7) | Dadd9,11/A |
| sus :: 1·2·5·13·7 :: miss[] :: tens[13] :: limite | 722 | x00052 | Gsus2(add13,7)/A | Dadd9,11/A |
| mayor (triada) :: 1·9·5·13·7 :: miss[3] :: tens[9,13] :: forzada | 722 | x00052 | Gadd9(add13,7,no3)/A | Dadd9,11/A |
| maj7 :: 1·9·5·13·7 :: miss[3] :: tens[9,13] :: forzada | 722 | x00052 | Gmaj7(add9,add13,no3)/A | Dadd9,11/A |
| menor (triada) :: 1·9·b3·11·13 :: miss[5] :: tens[9,11,13] :: forzada | 718 | x00412 | Am(add9,add11,add13,no5) | Bm7(addb2)/A |
| menor (triada) :: 1·9·b3·3·11 :: miss[5] :: tens[9,11] :: forzada | 572 | x04054 | E(add9,b3,add11,no5)/A | F#m7(addb2,add9,no5)/A |
| maj7 :: 1·9·5·b7·7 :: miss[3] :: tens[9] :: forzada | 534 | x00520 | Dmaj7(add9,b7,no3)/A | Am(add3,11) |
| maj7 :: 1·5·13·b7·7 :: miss[3] :: tens[13] :: forzada | 286 | x04054 | Amaj7(add13,b7,no3) | F#m7(addb2,add9,no5)/A |
| menor (triada) :: 1·9·b3·3·11·13 :: miss[5] :: tens[9,11,13] :: forzada | 256 | 000541 | C(add9,b3,add11,add13,no5)/E | Dm7(addb2,add9)/E |
| sus :: 1·2·11·5·13·b7 :: miss[] :: tens[11,13] :: limite | 214 | 000002 | Asus2(add11,add13,b7)/E | Em7(add9,11) |
| sus :: 1·9·4·5·13·b7 :: miss[] :: tens[9,13] :: limite | 214 | 000002 | Asus4(add9,add13,b7)/E | Em7(add9,11) |
| mayor (triada) :: 1·9·11·5·13·b7 :: miss[3] :: tens[9,11,13] :: forzada | 214 | 000002 | Aadd9(add11,add13,b7,no3)/E | Em7(add9,11) |
| sus :: 1·2·11·5·13·7 :: miss[] :: tens[11,13] :: limite | 210 | 000012 | Gsus2(add11,add13,7)/E | Em7(add9,add11,addb6,no5) |
| sus :: 1·9·4·5·13·7 :: miss[] :: tens[9,13] :: limite | 210 | 000012 | Gsus4(add9,add13,7)/E | Em7(add9,add11,addb6,no5) |
| mayor (triada) :: 1·9·11·5·13·7 :: miss[3] :: tens[9,11,13] :: forzada | 210 | 000012 | Gadd9(add11,add13,7,no3)/E | Em7(add9,add11,addb6,no5) |
| maj7 :: 1·9·11·5·13·7 :: miss[3] :: tens[9,11,13] :: forzada | 210 | 000012 | Gmaj7(add9,add11,add13,no3)/E | Em7(add9,add11,addb6,no5) |
| sus :: 1·2·11·5·b7·7 :: miss[] :: tens[11] :: limite | 188 | 000004 | Asus2(add11,b7,7)/E | E7(#9,11) |
| sus :: 1·9·4·5·b7·7 :: miss[] :: tens[9] :: limite | 188 | 000004 | Asus4(add9,b7,7)/E | E7(#9,11) |
| mayor (triada) :: 1·9·11·5·b7·7 :: miss[3] :: tens[9,11] :: forzada | 188 | 000004 | Aadd9(add11,b7,7,no3)/E | E7(#9,11) |
| maj7 :: 1·9·11·5·b7·7 :: miss[3] :: tens[9,11] :: forzada | 188 | 000004 | Amaj7(add9,add11,b7,no3)/E | E7(#9,11) |

## Ejemplos donde la alternativa parece claramente util

Ninguna alternativa util esta **ausente**: estas lecturas utiles ya las **emite el lector**
(verificado por muestreo). Se listan como ejemplos de la capa que conviene mostrar en la UI
normal como alternativa razonable junto al Primary.

| Voicing | Lectura util (oraculo) | El lector la muestra como | Primary app | Regla |
| --- | --- | --- | --- | --- |
| xx2415 | Am(add9)/E | Am(add9)/E | Am(add9)/E | ADD9 |
| x00451 | Dm(add9,add13)/A | Dm6(add9)/A | Dm6(add9)/A | ADD9 |
| x02422 | A(add9,add13) | A6(add9) | A6(add9) | ADD9 |
| x11524 | G#(add9,add11)/A# | Abadd9,11/Bb | Bbm7(add9,11,no5) | ADD9 |
| x15521 | A#m(add9,add13) | Bbm6(add9) | Bbm6(add9) | ADD9 |
| x00451 | Bm7(b5,add11)/A | Bm7(b5,add11)/A | Dm6(add9)/A | EXT_7TH |
| x01000 | Em(add11,7)/A | Em(maj7,add11)/A | B7(add11,b13,no5)/A | EXT_7TH |
| x02422 | F#m(add11,b7)/A | F#m7(add11)/A | A6(add9) | EXT_7TH |
| x02422 | F#m7(add11)/A | F#m7(add11)/A | A6(add9) | EXT_7TH |
| x02504 | Am(add9,7) | Am(maj9) | Am(maj9) | EXT_7TH |
| x03543 | F7(add9)/A | F9/A | Cm6(add11)/A | EXT_7TH |
| xxx241 | F7(no5)/A | F7(no5)/A | F7(no5)/A | OMIT5 |
| xx2251 | Fmaj7(no5)/E | Fmaj7(no5)/E | Fmaj7(no5)/E | OMIT5 |
| xx2500 | Cmaj7(no5)/E | Cmaj7(no5)/E | Cmaj7(no5)/E | OMIT5 |
| xx4003 | Gmaj7(no5)/F# | Gmaj7(no5)/F# | Gmaj7(no5)/F# | OMIT5 |
| xx521x | Am7(no5)/G | Am7(no5)/G | Am7(no5)/G | OMIT5 |
| xx53x1 | Gm7(no5) | Gm7(no5) | Gm7(no5) | OMIT5 |
| xxx323 | A#m(add13,no5) | Bbm6(no5) | Gdim/Bb | OMIT5_SIXTH |
| xxx542 | D#m(add13,no5)/C | Ebm6(no5)/C | Cdim | OMIT5_SIXTH |
| xx01x1 | Fm(add13,no5)/D | Fm6(no5)/D | Ddim | OMIT5_SIXTH |
| xx04x2 | D(add13,no5) | D6(no5) | Bm/D | OMIT5_SIXTH |
| xx1513 | D#(add13,no5) | Eb6(no5) | Cm/Eb | OMIT5_SIXTH |
| xx2415 | Cmaj7(add13,no5)/E | Cmaj7(add13,no5)/E | Am(add9)/E | OMIT5_SIXTH |
| xx2333 | Gm(add13)/E | Gm6/E | Em7(b5) | SIXTH |
| x11x22 | F#(add13)/A# | F#6/A# | F#6/A# | SIXTH |

## Ejemplos donde la alternativa parece demasiado forzada

| Voicing | Lectura ausente | Primary app | Motivo |
| --- | --- | --- | --- |
| xx0002 | D(add11,add13,no5) | Gmaj7/D | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0011 | Cadd9(add11,no3)/D | Cuartal D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0011 | Fadd9(add13,no3)/D | Cuartal D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0015 | Cadd9(add13,no3)/D | D7sus4 | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0015 | Gadd9(add11,no3)/D | D7sus4 | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0051 | Dm(add9,add11,no5) | Em7(addb2,no5)/D | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0052 | Gmaj7(add13,no3)/D | Em7(add9,no5)/D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0052 | D(add9,add11,no5) | Em7(add9,no5)/D | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0055 | Dadd9(add11,no3) | Em7(add11,no5)/D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0055 | Gadd9(add13,no3)/D | Em7(add11,no5)/D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0200 | Aadd9(add11,no3)/D | Bm7(add11,no5)/D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0200 | Dadd9(add13,no3) | Bm7(add11,no5)/D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0210 | C(add9,add13,no5)/D | D7sus2 | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0213 | Cadd9(add13,no3)/D | D7sus4 | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0213 | Gadd9(add11,no3)/D | D7sus4 | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0222 | A(add11,add13,no5)/D | Dmaj7 | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0253 | Dadd9(add11,no3) | Em7(add11,no5)/D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0253 | Gadd9(add13,no3)/D | Em7(add11,no5)/D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0313 | A#(add9,add13,no5)/D | Gm(add11)/D | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0343 | A#(add11,add13,no5)/D | Ebmaj7/D | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0415 | Am(add9,add11,no5)/D | Bm7(addb2,no5)/D | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0420 | Bm(add9,add11,no5)/D | Dbm7(addb2,no5)/Ebb | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0424 | Bm(add9,add13,no5)/D | Bsus2add13(no5)/D | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |
| xx0425 | Dmaj7(add13,no3) | Bm7(add9,no5)/D | Omite la 3ª: no hay tono que defina la calidad (1-5-9 = sus2 ya cubierto como lectura fuerte). |
| xx0425 | A(add9,add11,no5)/D | Bm7(add9,no5)/D | Omite la 5ª y apila 2+ tensiones sobre 3-4 notas: sobre-lectura. |

## Propuesta de reglas

Ninguna lectura mayInclude 'util' esta ausente: el lector real ya las emite todas (verificado por muestreo). El trabajo de 'alternativas razonables' es de UI (mostrar rankedReadings[1..], no solo el Primary), no del lector. Las mayInclude que SI faltan son todas contextuales o forzadas.

### 1) Capa util — ya la emite el lector (0 ausentes)

_No requieren tocar el lector. Solo exponer en la UI normal `rankedReadings[1..]`._

| Regla | Criterio | Ausentes |
| --- | --- | --- |
| EXT_7TH | Acorde extendido completo con 7ª (9/11/13, maj9, m9, m11). | 0 |
| SIXTH | Triada completa + 6ª (etiquetar 6, no add13, cuando no hay 7ª). | 0 |
| ADD9 | Triada completa + 9ª (add9 / 6·9). | 0 |
| OMIT5 | Fragmento que omite SOLO la 5ª con 3ª presente (maj7(no5), m7(no5), 7(no5)). | 0 |
| OMIT5_SIXTH | 1-3-6 (6 sin 5ª). | 0 |

### 2) Capa avanzada / contextual — las que el lector NO emite

_Ocultas por defecto, solo con 'Mostrar lecturas avanzadas'._

| Regla | Criterio | Ausentes |
| --- | --- | --- |
| SUS_EXT | Suspendido con tension anadida (sus2/sus4 + 6/9/11/13). | 16380 |
| OMIT3 | Fragmento que omite la 3ª (sin calidad definida; ya hay sus2/sus4 como lectura fuerte). | 13714 |
| OMIT5_MULTI | Omite la 5ª y apila 2+ tensiones (sobre-lectura). | 8982 |
| OMIT5_ADD9 | add9 sin 5ª (incompleto). | 784 |
| OMIT5_EXOTIC | Omite la 5ª y anade una tension exotica (add11 sin 5ª). | 0 |
| ADD11 | Triada mayor + 11 (choque con la 3ª). | 0 |
| EXT_OTHER | Otros completos con tension menos comun. | 0 |

## Notas y limitaciones

- El oraculo etiqueta la 6ª como `13` cuando no hay 7ª. Un `(add13)` sin 7ª es un acorde de 6ª;
  al promover estas lecturas conviene renombrarlas a `6` en la UI.
- Las diferencias enharmonicas no se cuentan aqui (las gestiona el comparador).
- El veredicto es heuristico y deterministico (regla por candidato); ver columna 'Regla'.

