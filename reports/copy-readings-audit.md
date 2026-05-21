# Auditoría: Copiar lecturas a Acordes

**Total**: 22 | **PASS**: 22 | **FAIL**: 0

| ID | Tipo | Entrada | Notas | Primary real | Esperado / Candidato buscado | Candidato obtenido | Estr. | Ext | Omit | Motivo | Resultado |
|----|------|---------|-------|--------------|------------------------------|--------------------|-------|-----|------|--------|-----------|
| P1 | primary | `1x22x3` | F E A G | Fmaj7(add9,no5) | `Fmaj7(add9,no5)` | Fmaj7(add9,no5) | chord | 7,9 | 5 | Valida primary desde patrón físico; maj7(add9) sin 5ª usa structure=chord y omit=5 al copiar | ✅ |
| P2 | primary | `1x2233` | F E A D G | Dm(add9,11)/F | `Dm(add9,11)/F` | Dm(add9,11)/F | chord | 9,11 | none | Valida primary desde patrón físico; add9+11 menor usa structure=chord sin 7ª | ✅ |
| P3 | 2°regex | `1x2233` | F E A D G | Dm(add9,11)/F | /Em7.*addb2/ (2°) | Em7(addb2,add11,no5)/F | BLOQ. | — | — | Valida bloqueo de candidato: addb2 no es representable en Acordes → botón Copiar deshabilitado | ✅ |
| P4 | primary | `x8x755` | F D E A | Fmaj7(add13,no5) | `Fmaj7(add13,no5)` | Fmaj7(add13,no5) | chord | 7,13 | 5 | Valida primary desde patrón físico; maj7(add13,no5) con omit=5 detectado correctamente | ✅ |
| P5 | 2°candidato | `x8x755` | F D E A | Fmaj7(add13,no5) | `Dm(add9)/F` (2°) | Dm(add9)/F | chord | 9 | none | Valida que candidato secundario Dm(add9)/F es copiable desde el mismo patrón que P4 | ✅ |
| P6 | primary | `6x678x` | Bb Ab D G | Bb7(add13,no5) | `Bb7(add13,no5)` | Bb7(add13,no5) | chord | 7,13 | 5 | Valida primary desde patrón físico; dominante 7(add13,no5) con omit=5 | ✅ |
| P7 | primary | `1x223x` | F E A D | Fmaj7(add13,no5) | `Fmaj7(add13,no5)` | Fmaj7(add13,no5) | chord | 7,13 | 5 | Valida primary desde patrón físico; notas F E A D → la primary es Fmaj7(add13,no5), no Dm(add9)/F | ✅ |
| P8 | 2°candidato | `1x223x` | F E A D | Fmaj7(add13,no5) | `Dm(add9)/F` (2°) | Dm(add9)/F | chord | 9 | none | Valida que candidato secundario Dm(add9)/F es copiable desde el mismo patrón que P7 | ✅ |
| P9 | primary | `x132xx` | Bb F A | Fadd11(no5)/Bb | `Fadd11(no5)/Bb` | Fadd11(no5)/Bb | chord | 11 | 5 | El patrón físico del mástil debe viajar con la copia; si el generador no lo produce, se inyecta como opción (copiado) en el selector. | ✅ |
| N-A1 | 2°candidato | D,F,A,E/F | D F A E | Fmaj7(add13,no5) | `Dm(add9)/F` (2°) | Dm(add9)/F | chord | 9 | none | Caso A: add9 menor no debe degradar a structure=tetrad aunque la primary sea otra lectura | ✅ |
| N-A2 | primary | C,E,G,D/C | C E G D | Cadd9 | `Cadd9` | Cadd9 | chord | 9 | none | Valida add9 mayor como primary: structure=chord con ext9 activo y ext7 inactivo | ✅ |
| N-A3 | primary | C,E,F,G/C | C E F G | Cadd11 | `Cadd11` | Cadd11 | chord | 11 | none | Valida add11 mayor como primary: structure=chord con ext11 activo y ext7 inactivo | ✅ |
| N-A4 | primary | D,F,G,A/D | D F G A | Dm(add11) | `Dm(add11)` | Dm(add11) | chord | 11 | none | Valida add11 menor como primary: structure=chord con ext11 activo y ext7 inactivo | ✅ |
| N-B | primary | D,F,A,E,G/F | D F A E G | Dm(add9,11)/F | `Dm(add9,11)/F` | Dm(add9,11)/F | chord | 9,11 | none | Control positivo: add9+11 menor es primary copiable con uiPatch correcto | ✅ |
| N-C | 2°regex | E,F,G,A,D/F | E F G A D | Dm(add9,11)/F | /addb2/ (2°) | Em7(addb2,add11,no5)/F | BLOQ. | — | — | Caso C: extensión addb2 no es representable en Acordes → botón Copiar debe estar deshabilitado | ✅ |
| N-D1 | primary | F,A,C,D,E/F | F A C D E | Fmaj7(add13) | `Fmaj7(add13)` | Fmaj7(add13) | chord | 7,13 | none | Caso D: maj7(add13) completo (con 5ª) debe tener uiPatch habilitado; era null antes del fix | ✅ |
| N-D2 | primary | F,A,D,E/F | F A D E | Fmaj7(add13,no5) | `Fmaj7(add13,no5)` | Fmaj7(add13,no5) | chord | 7,13 | 5 | Caso D: maj7(add13,no5) primary; omit=5 debe derivarse del sufijo 'no5' del candidato | ✅ |
| N-D3 | 2°candidato | F,G,A,C,D,E/F | F G A C D E | C6(add9,11)/F | `Fmaj13` (2°) | Fmaj13 | chord | 7,9,13 | none | Caso D: Fmaj13 completo (con 5ª) debe ser copiable como candidato secundario | ✅ |
| N-D4 | 2°candidato | F,G,A,D,E/F | F G A D E | Dm(add9,11)/F | `Fmaj13(no5)` (2°) | Fmaj13(no5) | chord | 7,9,13 | 5 | Caso D: Fmaj13(no5) debe ser copiable como candidato secundario; omit=5 derivado del sufijo | ✅ |
| N-E1 | primary | Bb,Ab,D,G/Bb | Bb Ab D G | Bb7(add13,no5) | `Bb7(add13,no5)` | Bb7(add13,no5) | chord | 7,13 | 5 | Valida dom7(add13,no5) como primary copiable; omit=5 y ext13 deben pasarse al copiar | ✅ |
| N-F1 | primary | F,A,Bb/Bb | F A Bb | Fadd11(no5)/Bb | `Fadd11(no5)/Bb` | Fadd11(no5)/Bb | chord | 11 | 5 | Bug fix: al copiar Fadd11(no5)/Bb, el omit=5 se perdía porque detectOmitFromCandidate no leía missingLabels en candidatos de catálogo | ✅ |
| N-G1 | 2°regex | A,C,E,F,G/A | A C E F G | C6(add11)/A | /b13|b6/ (2°) | Am7(b13) | BLOQ. | — | — | Valida bloqueo de candidato: b13 (extensión alterada) no es representable → botón Copiar deshabilitado | ✅ |