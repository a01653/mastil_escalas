import { test, expect } from "@playwright/test";

async function goToChords(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function selectTone(page, letter) {
  await page.getByTestId("select-tone").selectOption(letter);
}

async function selectQuality(page, value) {
  await page.getByTestId("select-quality").selectOption(value);
}

async function selectStructure(page, value) {
  await page.getByTestId("select-structure").selectOption(value);
}

// ── Test 1 ─────────────────────────────────────────────────────────────────
test("1. Fmaj7 omit5: chips muestran F, A, E — no C", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("E"); // maj7 — was missing before the fix
  expect(chips).not.toContain("C"); // 5th is omitted
});

// ── Test 2 ─────────────────────────────────────────────────────────────────
test("2. Bmaj7 omit5: chips muestran B, D#, A# — no F#", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "B");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("B");
  expect(chips).toContain("D#");
  expect(chips).toContain("A#"); // maj7 — clave del bug
  expect(chips).not.toContain("F#"); // 5th is omitted
});

// ── Test 3 ─────────────────────────────────────────────────────────────────
test("3. Bmaj7 omit5 + 13: chips muestran B, D#, A#, G# — no F#", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "B");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("ext-13")).not.toBeDisabled();
  await page.getByTestId("ext-13").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("B");
  expect(chips).toContain("D#");
  expect(chips).toContain("A#"); // maj7
  expect(chips).toContain("G#"); // 13th
  expect(chips).not.toContain("F#"); // 5th is omitted
});

// ── Test 4 ─────────────────────────────────────────────────────────────────
test("4. B6: desmarcar 7, marcar 6 → B, D#, F#, G#", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "B");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("ext-7").uncheck();
  await expect(page.getByTestId("ext-6")).not.toBeDisabled();
  await page.getByTestId("ext-6").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("B");
  expect(chips).toContain("D#");
  expect(chips).toContain("F#"); // 5th — present in B6
  expect(chips).toContain("G#"); // 6th
});

// ── Test 5 ─────────────────────────────────────────────────────────────────
test("5. Badd9: desmarcar 7, marcar 9 → B, C#, D#, F#", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "B");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("ext-7").uncheck();
  await expect(page.getByTestId("ext-9")).not.toBeDisabled();
  await page.getByTestId("ext-9").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("B");
  expect(chips).toContain("C#"); // 9th of B major
  expect(chips).toContain("D#");
  expect(chips).toContain("F#"); // 5th
});

// ── Test 6 ─────────────────────────────────────────────────────────────────
test("6. Independencia de camino: B6 accesible directamente o tras ciclo por 9", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "B");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();

  // Direct path
  await page.getByTestId("ext-6").check();
  const chipsDirect = await page.getByTestId("chord-chips").textContent();
  expect(chipsDirect).toContain("G#");
  await page.getByTestId("ext-6").uncheck();

  // Indirect path: cycle through ext9 then check ext6
  await page.getByTestId("ext-9").check();
  await page.getByTestId("ext-9").uncheck();
  await page.getByTestId("ext-6").check();
  const chipsIndirect = await page.getByTestId("chord-chips").textContent();
  expect(chipsIndirect).toContain("G#");

  expect(chipsDirect).toBe(chipsIndirect);
});

// ── Test 7 ─────────────────────────────────────────────────────────────────
test("7. F Mayor + Cuatriada + omit5 + 6 + 11: ambas marcadas", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();

  await page.getByTestId("ext-6").check();
  await expect(page.getByTestId("ext-6")).toBeChecked();
  await expect(page.getByTestId("ext-11")).not.toBeDisabled();
  await page.getByTestId("ext-11").check();

  // Both must remain checked simultaneously
  await expect(page.getByTestId("ext-6")).toBeChecked();
  await expect(page.getByTestId("ext-11")).toBeChecked();

  // Chips: F(root) A(3rd) Bb(11th) D(6th) — no C (5th omitted)
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("D"); // 6th
  expect(chips).not.toContain("C"); // 5th omitted
});

// ── Test 8 ─────────────────────────────────────────────────────────────────
test("8. F Mayor + Cuatriada + omit5 + 9 + 6: ambas marcadas", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();

  await page.getByTestId("ext-9").check();
  await expect(page.getByTestId("ext-6")).not.toBeDisabled();
  await page.getByTestId("ext-6").check();

  await expect(page.getByTestId("ext-9")).toBeChecked();
  await expect(page.getByTestId("ext-6")).toBeChecked();

  // Chips: F(root) A(3rd) G(9th) D(6th) — no C (5th omitted)
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("G"); // 9th
  expect(chips).toContain("D"); // 6th
  expect(chips).not.toContain("C"); // 5th omitted
});

// ── Test 9 ─────────────────────────────────────────────────────────────────
test("9. F Mayor + Cuatriada + omit5 + 11 + 13: ambas marcadas", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();

  await page.getByTestId("ext-11").check();
  await expect(page.getByTestId("ext-13")).not.toBeDisabled();
  await page.getByTestId("ext-13").check();

  await expect(page.getByTestId("ext-11")).toBeChecked();
  await expect(page.getByTestId("ext-13")).toBeChecked();

  // Chips: F(root) A(3rd) Bb(11th) D(13th) — no C (5th omitted)
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).not.toContain("C"); // 5th omitted
});

// ── Test 10 ────────────────────────────────────────────────────────────────
test("10. F Mayor + Cuatriada + omit5 + 6 activa → 13 debe estar disabled por duplicidad", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-6").check();

  // 6 and 13 share the same pitch class; 13 must be disabled when 6 is active
  await expect(page.getByTestId("ext-13")).toBeDisabled();
});

// ── Test 11 ────────────────────────────────────────────────────────────────
test("11. Activar una extensión no borra las demás activas", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();

  // Activate ext9 first
  await page.getByTestId("ext-9").check();
  await expect(page.getByTestId("ext-9")).toBeChecked();

  // Activate ext6 — must NOT clear ext9
  await page.getByTestId("ext-6").check();
  await expect(page.getByTestId("ext-9")).toBeChecked();
  await expect(page.getByTestId("ext-6")).toBeChecked();
});

// ── Test 12 ────────────────────────────────────────────────────────────────
test("12. Una sola activación es suficiente — no requiere doble clic", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();

  // Single click on ext11 must be enough — no double-click needed
  await page.getByTestId("ext-11").click();
  await expect(page.getByTestId("ext-11")).toBeChecked();

  // And it must stay checked without further interaction
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("A"); // 3rd of F
});

// ── Test 13 ────────────────────────────────────────────────────────────────
test("13. Fmaj7(no5): chips F A E; voicings select existe y tiene opciones", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("E"); // maj7
  expect(chips).not.toContain("C"); // 5th omitted

  // Voicing selector must exist and contain at least one option beyond the placeholder
  const voicingSelect = page.getByTestId("voicing-select");
  await expect(voicingSelect).toBeVisible();
  const optionCount = await voicingSelect.locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
});

// ── Test 14 ────────────────────────────────────────────────────────────────
test("14. F6(no5): chips F A D — misma lógica que Fmaj7(no5)", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-6").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("D"); // 6th
  expect(chips).not.toContain("C"); // 5th omitted
});

// ── Test 15 ────────────────────────────────────────────────────────────────
test("15. Fadd9(no5): chips F A G", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-9").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("G"); // 9th of F major
  expect(chips).not.toContain("C"); // 5th omitted
});

// ── Test 16 ────────────────────────────────────────────────────────────────
test("16. Fadd11(no5): chips F A Bb", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-11").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("Bb"); // 11th of F major
  expect(chips).not.toContain("C"); // 5th omitted
});

// ── Test 19 ────────────────────────────────────────────────────────────────
test("19. F Mayor + Cuatriada + 7 OFF: no genera voicings, muestra aviso de sin 7ª", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();

  // Chips: F A C (solo triada, sin 4ª nota)
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("C");

  // Título: no debe decir "Fmaj7" (no hay 7ª activa)
  const title = await page.getByTestId("chord-title").textContent();
  expect(title).not.toContain("maj7");

  // No hay voicings: el select está vacío
  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBe(0);

  // Aviso específico de sin 7ª — no el genérico de filtros
  await expect(page.getByText("No hay 7ª activa")).toBeVisible();
});

// ── Test 20 ────────────────────────────────────────────────────────────────
test("20. B Mayor + Cuatriada + 7 OFF: no genera voicings, muestra aviso de sin 7ª", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "B");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("B");
  expect(chips).toContain("D#");
  expect(chips).toContain("F#");

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBe(0);

  await expect(page.getByText("No hay 7ª activa")).toBeVisible();
});

// ── Test 21 ────────────────────────────────────────────────────────────────
test("21. F Mayor + Cuatriada + 7 ON + omit5: título Fmaj7(no5), genera voicings", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();

  // Chips: F A E (maj7 sin quinta)
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("E"); // maj7
  expect(chips).not.toContain("C"); // quinta omitida

  // Título: debe contener Fmaj7(no5)
  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("Fmaj7(no5)");

  // Sí debe haber voicings (cuatriada válida: 7ª activa)
  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
});

// ── Test 22 ────────────────────────────────────────────────────────────────
test("22. F Mayor + Cuatriada + 7 ON + 11 ON + omit5: título Fmaj7(add11,no5)", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("ext-11")).not.toBeDisabled();
  await page.getByTestId("ext-11").check();

  // Chips: F A E Bb (1, 3, maj7, 11 — sin quinta)
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("E"); // maj7
  expect(chips).toContain("Bb"); // 11
  expect(chips).not.toContain("C"); // quinta omitida

  // Título: debe incluir add11 y no5 combinados en un paréntesis
  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("add11");
  expect(title).toContain("no5");
  expect(title).toContain("F");

  // Sí debe haber voicings (cuatriada válida: 7ª activa)
  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
});

// ── Test 23 ────────────────────────────────────────────────────────────────
test("23. F Mayor + Cuatriada + 7 OFF + 11 ON: no genera voicings, aviso sin 7ª", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check(); // permite slot para ext11
  await page.getByTestId("ext-11").check();

  // Aunque hay ext11, sin 7ª no es válida como cuatriada
  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBe(0);

  await expect(page.getByText("No hay 7ª activa")).toBeVisible();
});

// ── Test 24 ────────────────────────────────────────────────────────────────
test("24. F Mayor + Cuatriada + 7 OFF + 11 ON + omit5: no genera voicings, aviso sin 7ª", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-11").check();

  // Aunque haya omit5 + ext11, sin 7ª no es una cuatriada
  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBe(0);

  await expect(page.getByText("No hay 7ª activa")).toBeVisible();
});

// ── Test 18 ────────────────────────────────────────────────────────────────
test("18. F Mayor + Cuatriada + omit5 + 11 + 13: omit-5 queda disabled — no permite 5 notas", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-11").check();
  await page.getByTestId("ext-13").check();

  // Estado previo correcto: 4 notas, ext11 y ext13 activos, omit-5 activo
  await expect(page.getByTestId("ext-11")).toBeChecked();
  await expect(page.getByTestId("ext-13")).toBeChecked();
  await expect(page.getByTestId("omit-5")).toBeChecked();

  // Chips: F A Bb D — no C (quinta omitida)
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).not.toContain("C"); // quinta omitida

  // omit-5 debe estar disabled — desactivarlo daría 5 notas en Cuatriada
  await expect(page.getByTestId("omit-5")).toBeDisabled();

  // ext-11 y ext-13 siguen marcados
  await expect(page.getByTestId("ext-11")).toBeChecked();
  await expect(page.getByTestId("ext-13")).toBeChecked();
});

// ── Test 25 ────────────────────────────────────────────────────────────────
test("25. F Mayor + Cuatriada + 7 ON + omit5 + 13 ON: título contiene add13 y no5", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("ext-13")).not.toBeDisabled();
  await page.getByTestId("ext-13").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("add13");
  expect(title).toContain("no5");

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
});

// ── Test 26 ────────────────────────────────────────────────────────────────
test("26. F Mayor + Cuatriada + 7 ON + omit5 + 9 ON: título contiene add9 y no5", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("ext-9")).not.toBeDisabled();
  await page.getByTestId("ext-9").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("add9");
  expect(title).toContain("no5");

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
});

// ── Test 27 ────────────────────────────────────────────────────────────────
test("27. F + Cuatriada + 7 + 11 + omit5: Fmaj7(add11,no5) en título, Lectura e Identidad", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-11").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("Fmaj7(add11,no5)");

  const lectura = await page.getByTestId("study-lectura").textContent();
  expect(lectura).toContain("add11");
  expect(lectura).toContain("no5");

  await page.getByTestId("study-toggle").click();
  const nombre = await page.getByTestId("study-identidad-nombre").textContent();
  expect(nombre).toContain("add11");
  expect(nombre).toContain("no5");
});

// ── Test 28 ────────────────────────────────────────────────────────────────
test("28. F + Cuatriada + 7 + 13 + omit5: no5 en título, Lectura e Identidad", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-13").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("no5");
  expect(title).not.toContain("Fmaj7(add13)"); // no debe aparecer sin no5

  const lectura = await page.getByTestId("study-lectura").textContent();
  expect(lectura).toContain("add13");
  expect(lectura).toContain("no5");

  await page.getByTestId("study-toggle").click();
  const nombre = await page.getByTestId("study-identidad-nombre").textContent();
  expect(nombre).toContain("add13");
  expect(nombre).toContain("no5");
});

// ── Test 29 ────────────────────────────────────────────────────────────────
test("29. F + Acorde + 7 + 13 + omit5: Fmaj7(add13,no5) en título, Lectura e Identidad", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  // En Acorde, ext7 no está marcado por defecto — hay que activarlo explícitamente
  await page.getByTestId("ext-7").check();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-13").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("Fmaj7(add13,no5)");

  const lectura = await page.getByTestId("study-lectura").textContent();
  expect(lectura).toContain("add13");
  expect(lectura).toContain("no5");

  await page.getByTestId("study-toggle").click();
  const nombre = await page.getByTestId("study-identidad-nombre").textContent();
  expect(nombre).toContain("add13");
  expect(nombre).toContain("no5");
});

// ── Test 30 ────────────────────────────────────────────────────────────────
test("30. C + dom + Acorde + 7 + 13 + omit5: C7(add13,no5) en título y Lectura", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "C");
  // Cambiar estructura ANTES que calidad: dom está disabled en Triada sin 7ª
  await selectStructure(page, "chord");
  await selectQuality(page, "dom");

  // En Acorde, ext7 no está marcado por defecto — hay que activarlo
  await page.getByTestId("ext-7").check();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-13").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("C7(add13,no5)");

  const lectura = await page.getByTestId("study-lectura").textContent();
  expect(lectura).toContain("C7(add13,no5)");
});

// ── Test 31 ────────────────────────────────────────────────────────────────
test("31. F + Cuatriada + 7 activa + sin omit: ext13/ext11/ext9 deben estar disabled", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked(); // Cuatriada activa 7 por defecto
  await expect(page.getByTestId("omit-5")).not.toBeChecked();

  // Con 7 activa y sin omit, el slot está lleno: 9/11/13 deben estar disabled
  await expect(page.getByTestId("ext-13")).toBeDisabled();
  await expect(page.getByTestId("ext-11")).toBeDisabled();
  await expect(page.getByTestId("ext-9")).toBeDisabled();
});

// ── Test 32 ────────────────────────────────────────────────────────────────
test("32. F + Cuatriada + 7 + omit5 + ext13: válido; título Fmaj7(add13,no5); chips sin C", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("ext-13")).not.toBeDisabled();
  await page.getByTestId("ext-13").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("Fmaj7(add13,no5)");

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("E"); // maj7
  expect(chips).toContain("D"); // 13th
  expect(chips).not.toContain("C"); // quinta omitida

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
});

// ── Test 33 ────────────────────────────────────────────────────────────────
test("33. Estado imposible: Acorde→Cuatriada limpia extensiones sobrantes; nunca 5 chips", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");

  // Primero en Acorde: activar 7 + 13 (válido en Acorde)
  await selectStructure(page, "chord");
  await page.getByTestId("ext-7").check();
  await page.getByTestId("ext-13").check();

  const chipsAcorde = await page.getByTestId("chord-chips").textContent();
  // En Acorde: F A C D E = 5 notas, es válido
  expect(chipsAcorde).toContain("D"); // 13th

  // Ahora cambiar a Cuatriada: la limpieza es síncrona en el onChange
  await selectStructure(page, "tetrad");

  const chips = await page.getByTestId("chord-chips").textContent();
  // Debe haber exactamente 4 notas: F A C E (sin D que era el 13)
  expect(chips).not.toContain("D"); // ext13 limpiada síncronamente

  // Verificar que ext-13 quedó desmarcado
  await expect(page.getByTestId("ext-13")).not.toBeChecked();
});

// ── Test 34 ────────────────────────────────────────────────────────────────
test("34. Acorde+7+13 → Cuatriada: ext13 unchecked Y disabled, título Fmaj7 sin add13", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");

  await selectStructure(page, "chord");
  await page.getByTestId("ext-7").check();
  await page.getByTestId("ext-13").check();

  // Verificar estado válido en Acorde
  const titleAcorde = await page.getByTestId("chord-title").textContent();
  expect(titleAcorde).toContain("Fmaj7");

  // Cambiar a Cuatriada — limpieza síncrona
  await selectStructure(page, "tetrad");

  // ext-13 debe quedar desmarcado y deshabilitado (ext7 usa el único slot)
  await expect(page.getByTestId("ext-13")).not.toBeChecked();
  await expect(page.getByTestId("ext-13")).toBeDisabled();

  // Título sin add13
  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toMatch(/^Fmaj7$/);

  // Chips sin D (13th)
  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).not.toContain("D");
  expect(chips).toContain("E"); // maj7
});

// ── Test 35 ────────────────────────────────────────────────────────────────
test("35. Cuatriada+7 (sin omit): activar omit5 habilita ext13", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  // ext7 auto-checked; ext13 debe estar deshabilitado (slot lleno)
  await expect(page.getByTestId("ext-7")).toBeChecked();
  await expect(page.getByTestId("ext-13")).toBeDisabled();

  // Activar omit5: abre un slot extra
  await page.getByTestId("omit-5").check();

  // Ahora ext13 debe estar habilitado
  await expect(page.getByTestId("ext-13")).toBeEnabled();
});

// ── Test 36 ────────────────────────────────────────────────────────────────
test("36. Cuatriada+7+omit5+ext13: título Fmaj7(add13,no5), chips F A D E, sin C", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-13").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("Fmaj7(add13,no5)");

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("D"); // 13th
  expect(chips).toContain("E"); // maj7
  expect(chips).not.toContain("C"); // quinta omitida
});

// ── Test 37 ────────────────────────────────────────────────────────────────
test("37. Dm(add9,11): chips en orden canónico 1,b3,5,9,11 — no 1,9,b3,11,5", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "D");
  await selectQuality(page, "min");
  await selectStructure(page, "chord");

  // Dm(add9,11) no tiene 7ª
  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("ext-9").check();
  await page.getByTestId("ext-11").check();

  // chord-chips incluye un span sr-only con el nombre del acorde (p.ej. "Dm(add9,11)")
  // que contiene "9" antes de los chips reales. Se elimina el prefijo para buscar
  // solo en el texto de los chips visuales.
  const chordTitle = await page.getByTestId("chord-title").textContent();
  const allChipsText = await page.getByTestId("chord-chips").textContent();
  const chips = allChipsText.slice(chordTitle.length);

  // Presencia de todos los grados
  expect(chips).toContain("b3");
  expect(chips).toContain("9");
  expect(chips).toContain("11");

  // Orden canónico: b3 debe aparecer ANTES que 9; 5 antes que 9; 9 antes que 11
  const idxB3 = chips.indexOf("b3");
  const idx5  = chips.indexOf("5");
  const idx9  = chips.indexOf("9");
  const idx11 = chips.indexOf("11");

  expect(idxB3).toBeLessThan(idx9);  // b3 < 9 (no al revés)
  expect(idx5).toBeLessThan(idx9);   // 5 < 9
  expect(idx9).toBeLessThan(idx11);  // 9 < 11
});

// ── Test 17 ────────────────────────────────────────────────────────────────
test("17. Fadd13(no5): chips F A D — mismo resultado que F6(no5)", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-13").check();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("D"); // 13th of F major = same pc as 6th
  expect(chips).not.toContain("C"); // 5th omitted
});
