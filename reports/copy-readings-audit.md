# Auditoría: Copiar lecturas a Acordes

**Total**: 49 | **PASS**: 49 | **FAIL**: 0

| ID | Tipo | Entrada | Notas | Primary real | Esperado / Candidato buscado | Candidato obtenido | Estr. | Ext | Omit | Motivo | Resultado |
|----|------|---------|-------|--------------|------------------------------|--------------------|-------|-----|------|--------|-----------|
| P1 | primary | `1x22x3` | F E A G | Fmaj7(add9,no5) | `Fmaj7(add9,no5)` | Fmaj7(add9,no5) | chord | 7,9 | 5 | Valida primary desde patrón físico; maj7(add9) sin 5ª usa structure=chord y omit=5 al copiar | ✅ |
| P2 | primary | `1x2233` | F E A D G | Dm(add9,11)/F | `Dm(add9,11)/F` | Dm(add9,11)/F | chord | 9,11 | none | Valida primary desde patrón físico; add9+11 menor usa structure=chord sin 7ª | ✅ |
| P3 | 2°regex | `1x2233` | F E A D G | Dm(add9,11)/F | /Em7.*addb2/ (2°) | ⚠ no encontrado | — | — | — | Valida bloqueo de candidato: addb2 no es representable en Acordes → botón Copiar deshabilitado | ✅ |
| P4 | primary | `x8x755` | F D E A | Fmaj7(add13,no5) | `Fmaj7(add13,no5)` | Fmaj7(add13,no5) | chord | 7,13 | 5 | Valida primary desde patrón físico; maj7(add13,no5) con omit=5 detectado correctamente | ✅ |
| P5 | 2°candidato | `x8x755` | F D E A | Fmaj7(add13,no5) | `Dm(add9)/F` (2°) | Dm(add9)/F | chord | 9 | none | Valida que candidato secundario Dm(add9)/F es copiable desde el mismo patrón que P4 | ✅ |
| P6 | primary | `6x678x` | Bb Ab D G | Bb7(add13,no5) | `Bb7(add13,no5)` | Bb7(add13,no5) | chord | 7,13 | 5 | Valida primary desde patrón físico; dominante 7(add13,no5) con omit=5 | ✅ |
| P7 | primary | `1x223x` | F E A D | Fmaj7(add13,no5) | `Fmaj7(add13,no5)` | Fmaj7(add13,no5) | chord | 7,13 | 5 | Valida primary desde patrón físico; notas F E A D → la primary es Fmaj7(add13,no5), no Dm(add9)/F | ✅ |
| P8 | 2°candidato | `1x223x` | F E A D | Fmaj7(add13,no5) | `Dm(add9)/F` (2°) | Dm(add9)/F | chord | 9 | none | Valida que candidato secundario Dm(add9)/F es copiable desde el mismo patrón que P7 | ✅ |
| P9 | 2°candidato | `x132xx` | Bb F A | Bbmaj7(no3) | `Fadd11(no5)/Bb` (2°) | Fadd11(no5)/Bb | chord | 11 | 5 | Primary ahora es Bbmaj7(no3) (ui:null). Fadd11(no5)/Bb es candidato secundario copiable; el voicing físico x132xx debe conservarse y no normalizarse a 11x2xx. | ✅ |
| P10 | primary | `x422xx` | Db E A | A/C# | `A/C#` | A/C# | triad | — | none | x422xx y 542xxx comparten pitch set, pero Copiar en Acorde debe preservar la digitación física origen. | ✅ |
| P11 | primary | `2232xx` | F# B F A | F#m(maj7,add11,no5) | `F#m(maj7,add11,no5)` | F#m(maj7,add11,no5) | chord | 7,11 | 5 | Un m(maj7) no puede degradarse a m7 al copiar: debe mantener 7 mayor, add11 y la digitación física original. | ✅ |
| N-A1 | 2°candidato | D,F,A,E/F | D F A E | Fmaj7(add13,no5) | `Dm(add9)/F` (2°) | Dm(add9)/F | chord | 9 | none | Caso A: add9 menor no debe degradar a structure=tetrad aunque la primary sea otra lectura | ✅ |
| N-A2 | primary | C,E,G,D/C | C E G D | Cadd9 | `Cadd9` | Cadd9 | chord | 9 | none | Valida add9 mayor como primary: structure=chord con ext9 activo y ext7 inactivo | ✅ |
| N-A3 | primary | C,E,F,G/C | C E F G | Cadd11 | `Cadd11` | Cadd11 | chord | 11 | none | Valida add11 mayor como primary: structure=chord con ext11 activo y ext7 inactivo | ✅ |
| N-A4 | primary | D,F,G,A/D | D F G A | Dm(add11) | `Dm(add11)` | Dm(add11) | chord | 11 | none | Valida add11 menor como primary: structure=chord con ext11 activo y ext7 inactivo | ✅ |
| N-B | primary | D,F,A,E,G/F | D F A E G | Dm(add9,11)/F | `Dm(add9,11)/F` | Dm(add9,11)/F | chord | 9,11 | none | Control positivo: add9+11 menor es primary copiable con uiPatch correcto | ✅ |
| N-C | 2°regex | E,F,G,A,D/F | E F G A D | Dm(add9,11)/F | /addb2/ (2°) | ⚠ no encontrado | — | — | — | Caso C: extensión addb2 no es representable en Acordes → botón Copiar debe estar deshabilitado | ✅ |
| N-D1 | primary | F,A,C,D,E/F | F A C D E | Fmaj7(add13) | `Fmaj7(add13)` | Fmaj7(add13) | chord | 7,13 | none | Caso D: maj7(add13) completo (con 5ª) debe tener uiPatch habilitado; era null antes del fix | ✅ |
| N-D2 | primary | F,A,D,E/F | F A D E | Fmaj7(add13,no5) | `Fmaj7(add13,no5)` | Fmaj7(add13,no5) | chord | 7,13 | 5 | Caso D: maj7(add13,no5) primary; omit=5 debe derivarse del sufijo 'no5' del candidato | ✅ |
| N-D3 | 2°candidato | F,G,A,C,D,E/F | F G A C D E | C6(add9,11)/F | `Fmaj13` (2°) | Fmaj13 | chord | 7,9,13 | none | Caso D: Fmaj13 completo (con 5ª) debe ser copiable como candidato secundario | ✅ |
| N-D4 | 2°candidato | F,G,A,D,E/F | F G A D E | Dm(add9,11)/F | `Fmaj13(no5)` (2°) | Fmaj13(no5) | chord | 7,9,13 | 5 | Caso D: Fmaj13(no5) debe ser copiable como candidato secundario; omit=5 derivado del sufijo | ✅ |
| N-E1 | primary | Bb,Ab,D,G/Bb | Bb Ab D G | Bb7(add13,no5) | `Bb7(add13,no5)` | Bb7(add13,no5) | chord | 7,13 | 5 | Valida dom7(add13,no5) como primary copiable; omit=5 y ext13 deben pasarse al copiar | ✅ |
| N-F1 | 2°candidato | F,A,Bb/Bb | F A Bb | Bbmaj7(no3) | `Fadd11(no5)/Bb` (2°) | Fadd11(no5)/Bb | chord | 11 | 5 | Bug fix: al copiar Fadd11(no5)/Bb, el omit=5 se perdía. Primary ahora es Bbmaj7(no3) (ui:null); Fadd11(no5)/Bb es candidato secundario y debe preservar omit=5 al copiar. | ✅ |
| N-G1 | 2°regex | A,C,E,F,G/A | A C E F G | C6(add11)/A | /b13|b6/ (2°) | Am7(b13) | BLOQ. | — | — | Valida bloqueo de candidato: b13 (extensión alterada) no es representable → botón Copiar deshabilitado | ✅ |
| N-H1 | 2°candidato | `43x24x` | Ab C A Eb | Abaddb2 | `Cm6(no5)/Ab` (2°) | Cm6(no5)/Ab | tetrad | 6 | 5 | Bug fix: bajo enarmónico en slash externo (Ab/G#) debe conservar el spelling del candidato (spellPreferSharps=false) para que Modo automático muestre 'Bajo b6' no 'Bajo #5'. La primary del patrón es Abaddb2 (uiPatch=null); Cm6(no5)/Ab es candidato secundario copiable. | ✅ |
| ALT-1 | primary | `x54545` | D F# C D# A | D7(b9) | `D7(b9)` | D7(b9) | chord | 7,9 | none | La b2 de un dominante es b9 (no addb2) y la copia conserva la novena alterada | ✅ |
| ALT-2 | primary | `x5454x` | D F# C D# | D7(b9,no5) | `D7(b9,no5)` | D7(b9,no5) | chord | 7,9 | 5 | Voicing de 4 notas sin 5ª: se copia con omit=5 y conserva la b9 | ✅ |
| ALT-3 | primary | `x76787` | E G# D G B | E7(#9) | `E7(#9)` | E7(#9) | chord | 7,9 | none | Con la 5ª presente el nombre no lleva no5; la #9 convive con la 3ª mayor | ✅ |
| ALT-4 | primary | `x7678x` | E G# D G | E7(#9,no5) | `E7(#9,no5)` | E7(#9,no5) | chord | 7,9 | 5 | no5 solo cuando realmente falta la 5ª; la copia lleva omit=5 y #9 | ✅ |
| ALT-5 | primary | `3x3444` | G F B D# G# | G7(#5,b9) | `G7(#5,b9)` | G7(#5,b9) | chord | 7,9 | none | Sin 5ª justa la b6 es #5; combinación #5 + b9 copiable | ✅ |
| ALT-6 | primary | `3x344x` | G F B D# | G7(#5) | `G7(#5)` | G7(#5) | chord | 7 | none | La #5 sustituye a la 5ª justa y se copia como alteración de quinta | ✅ |
| ALT-7 | primary | `x3435x` | C F# A# E | C7(b5) | `C7(b5)` | C7(b5) | chord | 7 | none | La b5 sin 5ª justa en un dominante es quinta disminuida copiable (antes se perdía) | ✅ |
| ALT-8 | primary | `x0101x` | A D# G C | Am7(b5) | `Am7(b5)` | Am7(b5) | tetrad | 7 | none | Regresión: semidisminuido con b5 propia de la calidad | ✅ |
| ALT-9 | primary | `1x010x` | F D Ab B | Fdim7 | `Fdim7` | Fdim7 | tetrad | 7 | none | Regresión: dim7 con bb7 (no 6) | ✅ |
| ALT-10 | primary | `x5758x` | D A C G | D7sus4 | `D7sus4` | D7sus4 | tetrad | 7 | none | Regresión de suspendidos: 7sus4 copiable | ✅ |
| ALT-11 | primary | C,E,G,Bb,D,F#/C | C E G Bb D F# | C7(#11,add9) | `C7(#11,add9)` | C7(#11,add9) | BLOQ. | — | — | #11 queda fuera de esta fase: la lectura se muestra pero no se copia perdiendo la tensión | ✅ |
| ALT-12 | primary | `1x422x` | F Gb A Db | Gbm(maj7)/F | `Gbm(maj7)/F` | Gbm(maj7)/F | tetrad | 7 | none | Regresión: la tríada aumentada heurística sin 7ª adelantaba un encuadre forzado a la lectura natural | ✅ |
| ALT-13 | primary | C,Eb,G,B/C | C Eb G B | Cm(maj7) | `Cm(maj7)` | Cm(maj7) | chord | 7 | none | Regresión: la tríada aumentada sobre bajo ajeno no recibe la bonificación de tríada sobre bajo | ✅ |
| ALT-14 | primary | C,E,G,Ab,Bb/G | C E G Ab Bb | C7(b13)/G | `C7(b13)/G` | C7(b13)/G | BLOQ. | — | — | Con 5ª justa la b6 es b13; maj7(#5) con tensiones no adelanta a la lectura canónica | ✅ |
| ALT-15 | 2°candidato | C,E,G#,Bb,D#/C | C E G# Bb D# | C7(#5,#9) | `C7(#9,b13,no5)` (2°) | C7(#9,b13,no5) | BLOQ. | — | — | Sin 5ª justa la ♯5 es la lectura principal (C7(#5,#9)), pero la ♭13 sin 5ª se conserva como alternativa; no se copia porque Acordes no representa ♭13 (nunca se convierte en ♯5) | ✅ |
| ALT-16 | primary | A,C,E,G,Bb/A | A C E G Bb | Am7(b9) | `Am7(b9)` | Am7(b9) | chord | 7,9 | none | Con 7ª la ♭2 es la ♭9 también en Menor: la lectura se copia con novena ♭9 (antes Am7(addb2), bloqueada) | ✅ |
| ALT-17 | primary | C,E,G,B,D#/C | C E G B D# | Cmaj7(#9) | `Cmaj7(#9)` | Cmaj7(#9) | chord | 7,9 | none | ♯9 sobre 3ª mayor sin 3ª menor: el constructor ya la representa en Mayor | ✅ |
| ALT-18 | 2°candidato | A,C,Eb,G#/A | A C Eb G# | Abaddb2/Bbb | `Am(maj7,b5)` (2°) | Am(maj7,b5) | chord | 7 | none | m(maj7,♭5) antes se leía dim(add7) y no se copiaba; mantiene su posición en el ranking | ✅ |
| ALT-19 | 2°candidato | A,C,E,Bb/A | A C E Bb | Am(addb2) | `Am(addb2)` (2°) | Am(addb2) | BLOQ. | — | — | Sin 7ª la ♭2 es un añadido (no se renombra toda ♭2 como ♭9) | ✅ |
| ALT-20 | 2°candidato | C,Eb,G#,Bb/C | C Eb G# Bb | Abadd9/C | `Cm7(#5)` (2°) | Cm7(#5) | tetrad | 7 | none | Alternativa ♯5 de 3ª menor sin 5ª justa: nombre y grafía propios (G#), la lectura ♭13 se conserva | ✅ |
| ALT-21 | 2°candidato | C,Eb,G#/C | C Eb G# | Ab/C | `Cm(#5)` (2°) | Cm(#5) | triad | — | none | La tríada menor con ♯5 se ofrece como alternativa sin cambiar la principal | ✅ |
| ALT-22 | 2°candidato | C,Eb,G#,B/C | C Eb G# B | Cm(maj7,addb6,no5) | `Cm(maj7,#5)` (2°) | Cm(maj7,#5) | tetrad | 7 | none | m(maj7) con ♯5 sin 5ª justa: alternativa copiable de la lectura con ♭6 | ✅ |
| ALT-23 | 2°candidato | C,Eb,G,Ab,Bb/C | C Eb G Ab Bb | Eb6(add11)/C | `Cm7(b13)` (2°) | Cm7(b13) | BLOQ. | — | — | Con 5ª justa la ♭6 es ♭13: no se ofrece una lectura ♯5 que eliminaría la 5ª | ✅ |
| ALT-24 | primary | G,C,Eb,G#,Bb/G | G C Eb G# Bb | Eb6(add11)/G | — | Eb6(add11)/G | chord | 11,6 | none | La alternativa ♯5 solo se ofrece con el bajo dentro del acorde | ✅ |