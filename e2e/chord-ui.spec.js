import { test, expect } from "@playwright/test";

async function resetAppStorage(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function goToChords(page) {
  await resetAppStorage(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const navChords = page.getByTestId("nav-chords");
  await expect(navChords).toBeVisible();
  await navChords.click();
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

// ── Test 3b ────────────────────────────────────────────────────────────────
// Regresión v6.0.33 (paridad con Acordes cercanos): en cuatriada con omit5,
// activar 9 no debe apagar la 7ª.
test("3b. Fmaj7 omit5 + 9: la 7ª sigue activa → F, A, E, G", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("ext-9")).not.toBeDisabled();
  await page.getByTestId("ext-9").check();

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await expect(page.getByTestId("ext-9")).toBeChecked();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("F");
  expect(chips).toContain("A");
  expect(chips).toContain("E"); // maj7 se mantiene
  expect(chips).toContain("G"); // add9
  expect(chips).not.toContain("C"); // 5ª omitida
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

  const chips = await page.getByTestId("chord-chips").innerText();
  const degreeTokens = chips
    .split(/\s+/)
    .filter((token) => ["1", "b3", "5", "9", "11"].includes(token));

  // Presencia de todos los grados
  expect(degreeTokens).toContain("b3");
  expect(degreeTokens).toContain("9");
  expect(degreeTokens).toContain("11");

  // Orden canónico: b3 debe aparecer ANTES que 9; 5 antes que 9; 9 antes que 11
  const idxB3 = degreeTokens.indexOf("b3");
  const idx5  = degreeTokens.indexOf("5");
  const idx9  = degreeTokens.indexOf("9");
  const idx11 = degreeTokens.indexOf("11");

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

// ── Test 49 ────────────────────────────────────────────────────────────────
test("49. Fmaj7(no5): selector de inversión muestra Bajo 3, Bajo 7 — sin '3ª inversión'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  const invOpts = await invSelect.locator("option").allTextContents();
  expect(invOpts).toContain("Bajo 3");
  expect(invOpts).toContain("Bajo 7");
  expect(invOpts).not.toContain("3ª inversión");
  expect(invOpts).not.toContain("1ª inversión");
  expect(invOpts).not.toContain("2ª inversión");
});

// ── Test 50 ────────────────────────────────────────────────────────────────
test("50. Fmaj7 completo (sin omit): selector muestra 1ª/2ª/3ª inversión ordinales", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  const invOpts = await invSelect.locator("option").allTextContents();
  expect(invOpts).toContain("1ª inversión");
  expect(invOpts).toContain("2ª inversión");
  expect(invOpts).toContain("3ª inversión");
  expect(invOpts).not.toContain("Bajo 3");
  expect(invOpts).not.toContain("Bajo 7");
});

// ── Test 51 ────────────────────────────────────────────────────────────────
test("51. Fmaj7 en estructura Acorde: cambiar inversión cambia el voicing", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  // En estructura Acorde, ext-7 no se activa sola — activar manualmente para Fmaj7
  const ext7 = page.getByTestId("ext-7");
  if (!(await ext7.isChecked())) {
    await ext7.check();
  }
  await expect(ext7).toBeChecked();

  const invSelect = page.getByTestId("select-inversion");
  const voicingSelect = page.getByTestId("voicing-select");
  await expect(invSelect).toBeVisible({ timeout: 3000 });
  await expect(voicingSelect).toBeVisible({ timeout: 3000 });

  // Fundamental
  await invSelect.selectOption("root");
  await page.waitForTimeout(300);
  const rootVoicing = await voicingSelect.evaluate((el) => el.value);

  // 1ª inversión (bajo A)
  await invSelect.selectOption("1");
  await page.waitForTimeout(300);
  const inv1Voicing = await voicingSelect.evaluate((el) => el.value);

  // 2ª inversión (bajo C)
  await invSelect.selectOption("2");
  await page.waitForTimeout(300);
  const inv2Voicing = await voicingSelect.evaluate((el) => el.value);

  // 3ª inversión (bajo E)
  await invSelect.selectOption("3");
  await page.waitForTimeout(300);
  const inv3Voicing = await voicingSelect.evaluate((el) => el.value);

  // Los cuatro voicings deben ser distintos entre sí
  const all4 = [rootVoicing, inv1Voicing, inv2Voicing, inv3Voicing];
  const unique = new Set(all4);
  expect(unique.size, `Se esperaban 4 voicings distintos pero algunos coinciden: ${all4.join(", ")}`).toBe(4);

  // Cada voicing debe ser no vacío
  for (const v of all4) {
    expect(v, "Voicing vacío para alguna inversión").toBeTruthy();
  }
});

// ── Test 52 ────────────────────────────────────────────────────────────────
test("52. Fdim(add9): selector de inversión muestra 'Bajo b5', no 'Bajo #4'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "dim");
  await selectStructure(page, "tetrad");

  // Activar add9 (ext9): estructura add sin 7ª → isNonStandard=true
  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("ext-9").check();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  const invOpts = await invSelect.locator("option").allTextContents();
  expect(invOpts).not.toContain("Bajo #4");
  // La quinta disminuida (b5) en Fdim(add9) debe mostrarse como Bajo b5
  const hasBajoBm5 = invOpts.some((t) => t.includes("b5"));
  expect(hasBajoBm5, `Se esperaba "Bajo b5" pero opciones: ${invOpts.join(" | ")}`).toBe(true);
});

// ── Test 53 ────────────────────────────────────────────────────────────────
test("53. Fadd13 (sin 7ª): selector muestra 'Bajo 13', no 'Bajo 6'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("ext-13").check();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  const invOpts = await invSelect.locator("option").allTextContents();
  expect(invOpts).toContain("Bajo 13");
  expect(invOpts).not.toContain("Bajo 6");
});

// ── Test 54 ────────────────────────────────────────────────────────────────
test("54. Fmaj7(no5): seleccionar 'Bajo 7' → chord-controls-summary coincide, no '3ª inversión'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-5").check();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  const invOpts = await invSelect.locator("option").allTextContents();
  expect(invOpts).toContain("Bajo 7");

  await invSelect.selectOption({ label: "Bajo 7" });
  await page.waitForTimeout(300);

  const summaryText = await page.getByTestId("chord-controls-summary").getAttribute("data-content");
  expect(summaryText).toContain("Bajo en 7ª");
  expect(summaryText).not.toContain("3ª inversión");
});

// ── Test 55 ────────────────────────────────────────────────────────────────
test("55. Fmaj7 completo: selector '3ª inversión' = summary '3ª inversión' (regresión)", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  await invSelect.selectOption({ label: "3ª inversión" });
  await page.waitForTimeout(300);

  const summaryText = await page.getByTestId("chord-controls-summary").getAttribute("data-content");
  expect(summaryText).toContain("3ª inversión");
  expect(summaryText).not.toContain("Bajo 7");
});

// ── Test 56 ────────────────────────────────────────────────────────────────
test("56. Fdim(add9): seleccionar 'Bajo b5' → summary muestra 'Bajo b5', no '2ª inversión'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "dim");
  await selectStructure(page, "tetrad");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("ext-9").check();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  const invOpts = await invSelect.locator("option").allTextContents();
  expect(invOpts.some((t) => t.includes("b5"))).toBe(true);

  await invSelect.selectOption({ label: "Bajo b5" });
  await page.waitForTimeout(300);

  const voicingCount = await page.getByTestId("voicing-select").locator("option").count();
  if (voicingCount === 0) return;

  const summaryText = await page.getByTestId("chord-controls-summary").getAttribute("data-content");
  expect(summaryText, `Se esperaba 'b5' en summary: "${summaryText}"`).toContain("b5");
  expect(summaryText).not.toContain("2ª inversión");
});

// ── Test 57 ────────────────────────────────────────────────────────────────
test("57. Fdim7(add13,no1): selector NO tiene 'Fundamental', SÍ tiene 'Bajo b3/b5/13'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "dim");
  await selectStructure(page, "tetrad");

  // dim7 requiere ext-7; añadir ext-13 y activar omit-1
  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-1").check();
  // Con omit1 activo, ext-13 debe habilitarse (slot liberado)
  await page.getByTestId("ext-13").check();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  const invOpts = await invSelect.locator("option").allTextContents();
  expect(invOpts, `Opciones inesperadas: ${invOpts.join(" | ")}`).not.toContain("Fundamental");
  expect(invOpts).toContain("Bajo b3");
  expect(invOpts).toContain("Bajo b5");
  expect(invOpts).toContain("Bajo 13");
  expect(invOpts).toContain("Todas");
});

// ── Test 58 ────────────────────────────────────────────────────────────────
test("58. Activar omit1 estando en Fundamental → selector se sanea a opción válida", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "dim");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();

  const invSelect = page.getByTestId("select-inversion");
  await invSelect.selectOption("root");
  expect(await invSelect.inputValue()).toBe("root");

  // Activar omit-1: la raíz desaparece del acorde
  await page.getByTestId("omit-1").check();
  await page.waitForTimeout(200);

  // El selector ya no debe mostrar "root" — debe haber cambiado a una opción válida
  const currentValue = await invSelect.inputValue();
  expect(currentValue, `Selector fantasma en "root" tras activar omit1: ${currentValue}`).not.toBe("root");

  // El valor actual debe existir entre las opciones disponibles
  const availableValues = await invSelect.locator("option").evaluateAll((opts) => opts.map((o) => o.value));
  expect(availableValues).toContain(currentValue);
});

// ── Tests 60-63: notas insuficientes tras omit ─────────────────────────────

test("60. F + Acorde + omit1 sin extensiones: mensaje 'No hay notas suficientes'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-1").check();

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBe(0);

  await expect(page.getByText("No hay notas suficientes")).toBeVisible();
  await expect(page.getByText("filtros actuales")).not.toBeVisible();
});

test("61. F + Acorde + omit3 sin extensiones: mensaje 'No hay notas suficientes'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-3").check();

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBe(0);

  await expect(page.getByText("No hay notas suficientes")).toBeVisible();
  await expect(page.getByText("filtros actuales")).not.toBeVisible();
});

test("62. F + Acorde + omit5 sin extensiones: mensaje 'No hay notas suficientes'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("omit-5").check();

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBe(0);

  await expect(page.getByText("No hay notas suficientes")).toBeVisible();
  await expect(page.getByText("filtros actuales")).not.toBeVisible();
});

test("63. Fadd13(no1) + Acorde: 3 notas reales → genera voicings, sin aviso de notas insuficientes", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("ext-13").check();
  await page.getByTestId("omit-1").check();

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount).toBeGreaterThan(0);

  await expect(page.getByText("No hay notas suficientes")).not.toBeVisible();
});

// ── Tests 64-67: E9 sin omit → x7677x filtrado, voicings completos ────────────

async function setupE9(page) {
  await goToChords(page);
  await selectTone(page, "E");
  await selectStructure(page, "chord");
  await selectQuality(page, "dom");
  await page.getByTestId("ext-7").check();
  await page.getByTestId("ext-9").check();
  // omit queda en "none" por defecto
}

test("64. E9 sin omit: x7677x NO aparece entre los voicings disponibles", async ({ page }) => {
  await setupE9(page);

  const opts = await page.getByTestId("voicing-select").locator("option").evaluateAll(
    (els) => els.map((o) => o.value)
  );
  expect(opts, `x7677x no debe aparecer en E9 sin omit5. Opciones: ${opts.join(", ")}`).not.toContain("x7677x");
});

test("65. E9 sin omit: hay voicings disponibles y el título no contiene 'no5'", async ({ page }) => {
  await setupE9(page);

  const optionCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(optionCount, "E9 sin omit debe tener al menos 1 voicing").toBeGreaterThan(0);

  const title = await page.getByTestId("chord-title").textContent();
  expect(title).toContain("E9");
  expect(title).not.toContain("no5");
});

test("66. E9 sin omit: chips incluyen las 5 notas — E, G#, B, D, F#", async ({ page }) => {
  await setupE9(page);

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("E");
  expect(chips).toContain("G#");
  expect(chips).toContain("B");
  expect(chips).toContain("D");
  expect(chips).toContain("F#");
});

test("67. E9 sin omit: Modo Estudio muestra las 5 notas en Construcción", async ({ page }) => {
  await setupE9(page);

  await page.getByTestId("study-toggle").click();
  await expect(page.getByTestId("study-construccion-notas")).toBeVisible({ timeout: 3000 });

  const notasText = await page.getByTestId("study-construccion-notas").textContent();
  expect(notasText).toContain("E");
  expect(notasText).toContain("G#");
  expect(notasText).toContain("B");
  expect(notasText).toContain("D");
  expect(notasText).toContain("F#");
});

// ── Tests 68-70: Calidad Dominante/m7b5 fuerza ext7 ──────────────────────

test("68. E Dominante + Acorde: ext-7 se activa automáticamente y el título es E7", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "E");
  await selectStructure(page, "chord");
  await selectQuality(page, "dom");
  // Sin tocar manualmente el checkbox ext-7

  await expect(page.getByTestId("ext-7")).toBeChecked();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title, "El título debe ser E7, no E mayor").toContain("E7");
  expect(title).not.toMatch(/^E\s*$/);

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips, "Los chips deben incluir D (b7)").toContain("D");
});

test("69. E m7b5 + Acorde: ext-7 se activa automáticamente y los chips contienen b7", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "E");
  await selectStructure(page, "chord");
  await selectQuality(page, "hdim");
  // Sin tocar manualmente el checkbox ext-7

  await expect(page.getByTestId("ext-7")).toBeChecked();

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips, "Los chips deben incluir D (b7)").toContain("D");
  expect(chips, "Los chips deben incluir G (b3)").toContain("G");
  expect(chips, "Los chips deben incluir Bb/A# (b5)").toMatch(/Bb|A#/);
});

test("70. E7 + activar 9: x76777 aparece como voicing válido de E9", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "E");
  await selectStructure(page, "chord");
  await selectQuality(page, "dom");
  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("ext-9").check();

  const title = await page.getByTestId("chord-title").textContent();
  expect(title, "El título debe ser E9").toContain("E9");

  const opts = await page.getByTestId("voicing-select").locator("option").evaluateAll(
    (els) => els.map((o) => o.value)
  );
  expect(opts, `x76777 debe aparecer entre los voicings de E9. Opciones: ${opts.join(", ")}`).toContain("x76777");

  const chips = await page.getByTestId("chord-chips").textContent();
  expect(chips).toContain("E");
  expect(chips).toContain("G#");
  expect(chips).toContain("D");
  expect(chips).toContain("F#");
  expect(chips).toContain("B");
});

// ── Test 59 ────────────────────────────────────────────────────────────────
test("59. Fdim7(add13,no1): para cualquier inversión seleccionada, summary nunca dice 'Fundamental'", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "dim");
  await selectStructure(page, "tetrad");

  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("omit-1").check();
  await page.getByTestId("ext-13").check();

  const invSelect = page.getByTestId("select-inversion");
  await expect(invSelect).toBeVisible({ timeout: 3000 });

  // Recorrer todas las opciones disponibles — ninguna debe producir "Fundamental" en el título
  const optValues = await invSelect.locator("option").evaluateAll((opts) => opts.map((o) => o.value));
  for (const val of optValues) {
    if (val === "all") continue;
    await invSelect.selectOption(val);
    await page.waitForTimeout(200);
    const summaryText = await page.getByTestId("chord-controls-summary").getAttribute("data-content");
    expect(
      summaryText,
      `Con inversión "${val}", summary no debe contener 'Fundamental': "${summaryText}"`
    ).not.toContain("Fundamental");
  }
});

test("71. Dm7 -> Dm(maj7): al cambiar calidad mantiene continuidad física y no salta al primer voicing", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "D");
  await selectQuality(page, "min");
  await selectStructure(page, "chord");

  if (!(await page.getByTestId("ext-7").isChecked())) {
    await page.getByTestId("ext-7").check();
  }
  await expect(page.getByTestId("ext-7")).toBeChecked();
  await page.getByTestId("voicing-select").selectOption("axaaax");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("axaaax");

  await selectQuality(page, "minmaj7");

  await expect(page.getByTestId("chord-title")).toContainText("Dm(maj7)");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("axbaax");
  await expect(page.getByTestId("voicing-select")).toHaveValue("axbaax");
  await expect(page.getByTestId("voicing-select")).not.toHaveValue("14x23x");
});

test("72. Desde m(maj7) no muestra 'No he encontrado voicings...' al resolver cambios a disminuido y menor", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("chord-detect-toggle").check();
  await page.getByTestId("chord-detect-pattern-input").fill("1x422x");
  await page.getByTestId("chord-detect-apply-btn").click();
  await page.getByRole("button", { name: "Copiar en Acorde" }).first().click();
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("1x422x");

  await selectQuality(page, "dim");
  await expect(page.getByTestId("chord-title")).toContainText("Gbdim");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("2x121x");
  await expect(page.getByText("No he encontrado voicings para este acorde", { exact: false })).toHaveCount(0);

  await selectQuality(page, "minmaj7");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("2x322x");

  await selectQuality(page, "min");
  await expect(page.getByTestId("chord-title")).toContainText("Gbm");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("2x222x");
  await expect(page.getByText("No he encontrado voicings para este acorde", { exact: false })).toHaveCount(0);
});

// ── Test 73 (regresión) ──────────────────────────────────────────────────────
// Bug: familia Cuartal + cambiar Referencia a "Diatónico a escala" rompía la app
// (TypeError: fnBuildQuartalDegreeLabel is not a function) porque StudyPanel.jsx
// importaba esa función del módulo equivocado. Solo se disparaba con referencia
// "scale", el único caso donde plan.quartalDegree es un número.
test("73. Cuartal + Referencia 'Diatónico a escala' no rompe la app (regresión StudyPanel)", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await goToChords(page);

  // Familia Cuartal: el select de familia es el único con opción de valor "quartal".
  const familySelects = await page.locator("select").all();
  let familySet = false;
  for (const sel of familySelects) {
    const vals = await sel.locator("option").evaluateAll((opts) => opts.map((o) => o.value));
    if (vals.includes("quartal")) {
      await sel.selectOption("quartal");
      familySet = true;
      break;
    }
  }
  expect(familySet, "No se encontró el selector de familia con opción 'quartal'").toBe(true);

  // Cambiar Referencia a "Diatónico a escala" (value "scale"); el select de referencia
  // solo existe en la rama cuartal y es el único con opciones "scale" y "root".
  const refSelects = await page.locator("select").all();
  let refSelect = null;
  for (const sel of refSelects) {
    const vals = await sel.locator("option").evaluateAll((opts) => opts.map((o) => o.value));
    if (vals.includes("scale") && vals.includes("root")) {
      refSelect = sel;
      break;
    }
  }
  expect(refSelect, "No se encontró el selector de Referencia cuartal").not.toBeNull();
  await refSelect.selectOption("scale");

  // No debe aparecer la pantalla de error del RootErrorBoundary ni un pageerror.
  await expect(page.getByText("La app encontro un error al cargarse")).toHaveCount(0);
  // El panel sigue renderizando: al pasar a "scale" aparece el selector de escala cuartal
  // (solo se renderiza cuando la referencia es "scale"), confirmando re-render correcto.
  await expect(
    page.locator('select[title="Escala usada para generar los cuartales diatónicos"]')
  ).toBeVisible();
  expect(pageErrors, `pageerrors inesperados: ${pageErrors.join(" | ")}`).toHaveLength(0);
});

// ── Tests 74-78: Filtro de voicings guitarrísticos ───────────────────────────

async function setVoicingFilter(page, level) {
  const sel = page.getByTestId("voicing-filter-select");
  await expect(sel).toBeVisible({ timeout: 3000 });
  await sel.selectOption(level);
  await expect(sel).toHaveValue(level, { timeout: 2000 });
}

test("74. VF: filtro 'Todos' es el default, voicings no están vacíos", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "C");
  await selectStructure(page, "triad");

  const filterSel = page.getByTestId("voicing-filter-select");
  await expect(filterSel).toBeVisible({ timeout: 3000 });
  await expect(filterSel).toHaveValue("all");

  const count = await page.getByTestId("voicing-select").locator("option").count();
  expect(count, "En Todos debe haber al menos 1 voicing").toBeGreaterThan(0);
});

test("75. VF: Habituales reduce voicings sin dejar la lista vacía (C Mayor tríada)", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "C");
  await selectStructure(page, "triad");

  const countAll = await page.getByTestId("voicing-select").locator("option").count();
  expect(countAll, "Todos debe tener voicings").toBeGreaterThan(0);

  await setVoicingFilter(page, "habitual");

  const countHabitual = await page.getByTestId("voicing-select").locator("option").count();
  expect(countHabitual, "Habituales no debe dejar lista vacía").toBeGreaterThan(0);
  expect(countHabitual, "Habituales debe reducir o igualar Todos").toBeLessThanOrEqual(countAll);
});

test("76. VF: Esenciales reduce la lista y contiene la forma canónica 133211 (F Mayor acorde)", async ({ page }) => {
  // 133211 = F barre 6 cuerdas, snd=6, cleanBarre → score=16 ≥ 13 → pasa Esenciales.
  // Requiere structure="chord" (catálogo JSON).
  await goToChords(page);
  await selectTone(page, "F");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  // Esperar a que el catálogo JSON cargue y aparezcan opciones
  const selectEl = page.getByTestId("voicing-select");
  await expect(selectEl).toBeVisible({ timeout: 5000 });
  await expect(async () => {
    const count = await selectEl.locator("option").count();
    expect(count).toBeGreaterThan(0);
  }).toPass({ timeout: 8000 });

  const countAll = await selectEl.locator("option").count();

  await setVoicingFilter(page, "essential");

  // El filtro debe reducir efectivamente la lista, no solo reordenarla
  const countEssential = await selectEl.locator("option").count();
  expect(countEssential, `Esenciales (${countEssential}) debe ser menor que Todos (${countAll})`).toBeLessThan(countAll);
  expect(countEssential, "Esenciales no debe dejar lista vacía").toBeGreaterThan(0);

  const opts = await selectEl.locator("option").evaluateAll(
    (els) => els.map((o) => o.value)
  );
  expect(opts, `133211 debe estar en Esenciales. Opciones: ${opts.join(", ")}`).toContain("133211");
  expect(opts[0], "133211 debe ser el primer voicing (catalogIdx=0 para F mayor)").toBe("133211");
  expect(countEssential, "Esenciales debe ser ≤ 12 (capped)").toBeLessThanOrEqual(12);
});

test("77. VF: el nivel de filtro persiste tras recarga de página", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "C");
  await selectStructure(page, "triad");

  await setVoicingFilter(page, "habitual");
  await page.waitForTimeout(300);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();

  const filterSel = page.getByTestId("voicing-filter-select");
  await expect(filterSel).toBeVisible({ timeout: 3000 });
  await expect(filterSel).toHaveValue("habitual");
});

test("78. VF: voicing copiado (isCopied) sobrevive al filtro Habituales", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "C");
  await selectStructure(page, "triad");

  // Activar modo Investigar para copiar un voicing de alta posición.
  // xfh9xx: A(fret15)=C, D(fret17)=G, G(fret9)=E → C mayor. fret17 > maxFret=15,
  // por lo que el algoritmo no genera este voicing → isCopied:true al copiarlo.
  const toggle = page.getByTestId("chord-detect-toggle");
  await toggle.check();
  await expect(page.getByTestId("detected-chord-list")).toBeVisible();

  const patternInput = page.getByTestId("chord-detect-pattern-input");
  await expect(patternInput).toBeVisible();
  await patternInput.fill("xfh9xx");
  await page.getByTestId("chord-detect-apply-btn").click();
  await page.waitForTimeout(500);

  const list = page.getByTestId("detected-chord-list");
  const firstCopyBtn = list.locator("[data-testid^='detected-copy-']")
    .filter({ hasNot: page.locator("[disabled]") })
    .first();

  const copyBtnVisible = await firstCopyBtn.isVisible({ timeout: 2000 }).catch(() => false);
  if (copyBtnVisible) {
    await firstCopyBtn.click();
  }

  // Siempre salir del modo investigar antes de verificar el selector de voicings
  if (await toggle.isChecked()) {
    await toggle.uncheck();
  }
  await expect(page.getByTestId("voicing-select")).toBeVisible({ timeout: 5000 });

  if (copyBtnVisible) {
    const opts = await page.getByTestId("voicing-select").locator("option").allTextContents();
    const hasCopied = opts.some((t) => t.includes("C "));

    if (hasCopied) {
      // El voicing copiado (isCopied) debe sobrevivir al filtro Habituales
      await setVoicingFilter(page, "habitual");
      const optsAfter = await page.getByTestId("voicing-select").locator("option").allTextContents();
      const copiedStillVisible = optsAfter.some((t) => t.includes("C "));
      expect(copiedStillVisible, "El voicing isCopied debe seguir visible en Habituales").toBe(true);
    }
  }

  // Invariante mínima siempre válida: la lista nunca queda vacía
  const finalCount = await page.getByTestId("voicing-select").locator("option").count();
  expect(finalCount, "La lista de voicings nunca debe quedar vacía").toBeGreaterThan(0);
});

test("80. VF: A mayor + abiertas ON + Esenciales → x02220 primero, lista ≤ 12 y menor que Todos", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "A");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");

  // Activar cuerdas abiertas (default=false; x02220 las requiere)
  const openStringsToggle = page.getByTestId("toggle-allow-open-strings");
  await expect(openStringsToggle).toBeVisible({ timeout: 5000 });
  if (!(await openStringsToggle.isChecked())) {
    await openStringsToggle.click();
    await expect(openStringsToggle).toBeChecked({ timeout: 2000 });
  }

  const selectEl = page.getByTestId("voicing-select");
  await expect(selectEl).toBeVisible({ timeout: 5000 });
  // Esperar a que x02220 aparezca en Todos (confirma que el catálogo cargó con abiertas)
  await expect(async () => {
    const opts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));
    expect(opts).toContain("x02220");
  }).toPass({ timeout: 8000 });

  const countAll = await selectEl.locator("option").count();
  expect(countAll, "Todos debe tener varios voicings para A mayor con abiertas").toBeGreaterThan(10);

  await setVoicingFilter(page, "essential");

  const countEssential = await selectEl.locator("option").count();
  expect(countEssential, `Esenciales (${countEssential}) debe ser < Todos (${countAll})`).toBeLessThan(countAll);
  expect(countEssential, "Esenciales no debe dejar lista vacía").toBeGreaterThan(0);
  expect(countEssential, "Esenciales debe ser ≤ 12 (capped)").toBeLessThanOrEqual(12);

  const opts = await selectEl.locator("option").evaluateAll(
    (els) => els.map((o) => o.value)
  );
  expect(opts[0], `El primer Esencial de A mayor debe ser x02220. Opciones: ${opts.join(", ")}`).toBe("x02220");
});

test("79. VF: las flechas navegan secuencialmente dentro de la lista filtrada (Habituales)", async ({ page }) => {
  await goToChords(page);
  await selectTone(page, "C");
  await selectStructure(page, "triad");

  await setVoicingFilter(page, "habitual");

  const selectEl = page.getByTestId("voicing-select");
  const countHabitual = await selectEl.locator("option").count();
  expect(countHabitual, "Habituales debe tener al menos 2 voicings").toBeGreaterThanOrEqual(2);

  const allValues = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));

  // Ir explícitamente al primer voicing
  await selectEl.selectOption(allValues[0]);
  await expect(selectEl).toHaveValue(allValues[0], { timeout: 2000 });

  // Flecha derecha → segundo voicing de la lista filtrada (no un índice de la lista completa)
  const nextBtn = page.locator('[title="Siguiente"]').first();
  await nextBtn.click();
  await expect(selectEl).toHaveValue(allValues[1], { timeout: 2000 });

  if (countHabitual >= 3) {
    await nextBtn.click();
    await expect(selectEl).toHaveValue(allValues[2], { timeout: 2000 });
  }
});

// Helper: C mayor, Acorde, cuerdas al aire ON, catálogo cargado.
async function setupCMajorChordOpen(page) {
  await goToChords(page);
  await selectTone(page, "C");
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");
  const tog = page.getByTestId("toggle-allow-open-strings");
  await expect(tog).toBeVisible({ timeout: 5000 });
  if (!(await tog.isChecked())) {
    await tog.click();
    await expect(tog).toBeChecked({ timeout: 2000 });
  }
  const selectEl = page.getByTestId("voicing-select");
  await expect(selectEl).toBeVisible({ timeout: 5000 });
  await expect(async () => {
    const opts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));
    expect(opts).toContain("x32010"); // catálogo cargado
  }).toPass({ timeout: 8000 });
  return selectEl;
}

test("81. VF: C mayor Esenciales incluye la D-shape (xxacdc) aunque sea de 4 cuerdas", async ({ page }) => {
  const selectEl = await setupCMajorChordOpen(page);
  await setVoicingFilter(page, "essential");
  const opts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));
  expect(opts[0], `Esenciales debe empezar por x32010. Opciones: ${opts.join(", ")}`).toBe("x32010");
  expect(opts, `La D-shape xxacdc debe estar en Esenciales. Opciones: ${opts.join(", ")}`).toContain("xxacdc");
  expect(opts.length, "Esenciales debe ser corto (≤ 12)").toBeLessThanOrEqual(12);
});

test("82. VF: C mayor Habituales es razonable y empieza por catálogo, no por augmentadas", async ({ page }) => {
  const selectEl = await setupCMajorChordOpen(page);
  const countAll = await selectEl.locator("option").count();

  await setVoicingFilter(page, "habitual");
  const habOpts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));
  // No cientos de posiciones: claramente menor que Todos y bajo el tope de 40.
  expect(habOpts.length, `Habituales (${habOpts.length}) no debe ser cientos; < Todos (${countAll})`).toBeLessThan(countAll);
  expect(habOpts.length, "Habituales debe respetar el tope de 40").toBeLessThanOrEqual(40);
  // El primer voicing debe ser una forma de catálogo reconocible (x32010),
  // nunca una variante augmentada rara como 035053 / 075550.
  expect(habOpts[0], `Habituales debe empezar por x32010, no por augmentadas. Opciones: ${habOpts.slice(0, 5).join(", ")}`).toBe("x32010");
  expect(habOpts, "Habituales no debe contener augmentadas tipo 035053").not.toContain("035053");
  expect(habOpts, "Habituales no debe contener augmentadas tipo 075550").not.toContain("075550");
});

test("83. VF: C mayor — Esenciales es subconjunto de Habituales y Habituales ≥ Esenciales", async ({ page }) => {
  const selectEl = await setupCMajorChordOpen(page);

  await setVoicingFilter(page, "habitual");
  const habOpts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));

  await setVoicingFilter(page, "essential");
  const essOpts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));

  expect(habOpts.length, "Habituales debe tener al menos tantos voicings como Esenciales").toBeGreaterThanOrEqual(essOpts.length);
  const habSet = new Set(habOpts);
  for (const f of essOpts) {
    expect(habSet.has(f), `El esencial ${f} debe estar también en Habituales`).toBe(true);
  }
});

// Helper: tono mayor, Acorde, con/sin cuerdas al aire, catálogo cargado.
async function setupMajorChord(page, tone, { open, waitFor }) {
  await goToChords(page);
  await selectTone(page, tone);
  await selectQuality(page, "maj");
  await selectStructure(page, "chord");
  const tog = page.getByTestId("toggle-allow-open-strings");
  await expect(tog).toBeVisible({ timeout: 5000 });
  const checked = await tog.isChecked();
  if (open && !checked) { await tog.click(); await expect(tog).toBeChecked({ timeout: 2000 }); }
  if (!open && checked) { await tog.click(); await expect(tog).not.toBeChecked({ timeout: 2000 }); }
  const selectEl = page.getByTestId("voicing-select");
  await expect(selectEl).toBeVisible({ timeout: 5000 });
  await expect(async () => {
    const opts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));
    expect(opts).toContain(waitFor); // catálogo cargado
  }).toPass({ timeout: 8000 });
  return selectEl;
}

test("84. VF: F mayor + abiertas ON + Esenciales → 133211 primero (el catálogo manda sobre 10321x)", async ({ page }) => {
  // Regresión: 10321x (catalogIdx 2, score 17, abierta) NO debe desplazar a
  // 133211 (catalogIdx 0, score 16) en su misma zona de mástil.
  const selectEl = await setupMajorChord(page, "F", { open: true, waitFor: "133211" });
  await setVoicingFilter(page, "essential");
  const opts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));
  expect(opts[0], `Esenciales de F (abiertas ON) debe empezar por 133211. Opciones: ${opts.join(", ")}`).toBe("133211");
  expect(opts, "133211 debe estar en Esenciales").toContain("133211");
  expect(opts.length, "Esenciales debe ser corto (≤ 12)").toBeLessThanOrEqual(12);
});

test("85. VF: F mayor + abiertas OFF + Esenciales → 133211 primero", async ({ page }) => {
  const selectEl = await setupMajorChord(page, "F", { open: false, waitFor: "133211" });
  await setVoicingFilter(page, "essential");
  const opts = await selectEl.locator("option").evaluateAll((els) => els.map((o) => o.value));
  expect(opts[0], `Esenciales de F (abiertas OFF) debe empezar por 133211. Opciones: ${opts.join(", ")}`).toBe("133211");
  expect(opts, "133211 debe estar en Esenciales").toContain("133211");
});

