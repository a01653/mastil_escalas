/**
 * E2E — quinta y novena alteradas (Acordes, Acordes cercanos, detector,
 * persistencia, exportación/importación, presets, standards y móvil).
 *
 * Cada caso comprueba el nombre, las notas reales y su grado en los chips
 * (♯9 no se lee como ♭3, ♯5 no como ♭13, ♭♭7 no como 6) y el estado de los
 * selectores de quinta/novena.
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { Buffer } from "node:buffer";

const STORAGE_KEY = "mastil_interactivo_guitarra_config_v1";
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function freshApp(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function goToChords(page) {
  await freshApp(page);
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

async function goToMobileChordEditor(page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await freshApp(page);
  await page.getByTestId("mobile-nav-chords").click();
  await page.getByLabel("Editar acorde").first().click();
  await expect(page.getByTestId("select-structure")).toBeVisible();
}

// Tono por letra + alteración (b/#) como en la interfaz.
async function selectRoot(page, root) {
  const tone = page.getByTestId("select-tone");
  await tone.selectOption(root[0]);
  // Botones b/# del propio selector de tono del acorde (no los del contexto tonal).
  const toneGroup = tone.locator("xpath=..");
  if (root[1] === "b") await toneGroup.getByTitle("Bajar 1 semitono").click();
  if (root[1] === "#") await toneGroup.getByTitle("Subir 1 semitono").click();
}

async function applyBuilderState(page, { root, structure, quality, suspension, ext7, ext9, fifth, ninth }) {
  await selectRoot(page, root);
  await page.getByTestId("select-structure").selectOption(structure);
  await page.getByTestId("select-quality").selectOption(quality);
  if (suspension) await page.getByTestId("select-suspension").selectOption(suspension);
  if (ext7) await page.getByTestId("ext-7").check();
  if (ext9) await page.getByTestId("ext-9").check();
  if (fifth) await page.getByTestId("select-fifth").selectOption(fifth);
  if (ninth) await page.getByTestId("select-ninth").selectOption(ninth);
}

async function chipPairs(scope) {
  const notes = await scope.locator("[data-testid^='chord-badge-note-']").allTextContents();
  const degrees = await scope.locator("[data-testid^='chord-badge-degree-']").allTextContents();
  return notes.map((note, idx) => `${note}=${degrees[idx]}`);
}

const mainChips = (page) => page.getByTestId("chord-chips").first();

const TABLE = [
  { name: "D7(b9)", state: { root: "D", structure: "chord", quality: "dom", ext9: true, ninth: "b9" }, pairs: ["D=1", "F#=3", "A=5", "C=b7", "Eb=b9"] },
  { name: "D7(#9)", state: { root: "D", structure: "chord", quality: "dom", ext9: true, ninth: "#9" }, pairs: ["D=1", "F#=3", "A=5", "C=b7", "E#=#9"] },
  { name: "E7(#9)", state: { root: "E", structure: "chord", quality: "dom", ext9: true, ninth: "#9" }, pairs: ["E=1", "G#=3", "B=5", "D=b7", "F##=#9"] },
  { name: "G7(b9)", state: { root: "G", structure: "chord", quality: "dom", ext9: true, ninth: "b9" }, pairs: ["G=1", "B=3", "D=5", "F=b7", "Ab=b9"] },
  { name: "Bb7(b9)", state: { root: "Bb", structure: "chord", quality: "dom", ext9: true, ninth: "b9" }, pairs: ["Bb=1", "D=3", "F=5", "Ab=b7", "Cb=b9"] },
  { name: "Ebmaj9", state: { root: "Eb", structure: "chord", quality: "maj", ext7: true, ext9: true }, pairs: ["Eb=1", "G=3", "Bb=5", "D=7", "F=9"] },
  { name: "Fm9", state: { root: "F", structure: "chord", quality: "min", ext7: true, ext9: true }, pairs: ["F=1", "Ab=b3", "C=5", "Eb=b7", "G=9"] },
  { name: "Am7(b5)", state: { root: "A", structure: "tetrad", quality: "hdim" }, pairs: ["A=1", "C=b3", "Eb=b5", "G=b7"] },
  { name: "Dm7(b5)", state: { root: "D", structure: "tetrad", quality: "hdim" }, pairs: ["D=1", "F=b3", "Ab=b5", "C=b7"] },
  { name: "Fdim7", state: { root: "F", structure: "tetrad", quality: "dim" }, pairs: ["F=1", "Ab=b3", "Cb=b5", "Ebb=bb7"] },
  { name: "G7(#5,b9)", state: { root: "G", structure: "chord", quality: "dom", ext9: true, fifth: "#5", ninth: "b9" }, pairs: ["G=1", "B=3", "D#=#5", "F=b7", "Ab=b9"] },
  { name: "D7sus4", state: { root: "D", structure: "tetrad", quality: "dom", suspension: "sus4" }, pairs: ["D=1", "G=4", "A=5", "C=b7"] },
];

test.describe("tabla de aceptación — escritorio", () => {
  for (const row of TABLE) {
    test(`${row.name}: nombre, notas reales y grados`, async ({ page }) => {
      await goToChords(page);
      await applyBuilderState(page, row.state);
      await expect(mainChips(page)).toContainText(row.name);
      expect(await chipPairs(mainChips(page))).toEqual(row.pairs);
      await expect(page.getByTestId("active-voicing-pattern")).toBeVisible();
    });
  }
});

test.describe("tabla de aceptación — móvil", () => {
  for (const row of TABLE) {
    test(`${row.name} (móvil): nombre, notas reales y grados`, async ({ page }) => {
      await goToMobileChordEditor(page);
      await applyBuilderState(page, row.state);
      await page.getByLabel("Cerrar edición de acorde").click();
      await expect(mainChips(page)).toContainText(row.name);
      expect(await chipPairs(mainChips(page))).toEqual(row.pairs);
    });
  }
});

test("D9 → D7(b9) → D7(#9): la novena alterada sustituye a la natural y la 3ª mayor se mantiene", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "D", structure: "chord", quality: "dom", ext9: true });
  await expect(mainChips(page)).toContainText("D9");
  await page.getByTestId("select-ninth").selectOption("b9");
  await expect(mainChips(page)).toContainText("D7(b9)");
  await page.getByTestId("select-ninth").selectOption("#9");
  await expect(mainChips(page)).toContainText("D7(#9)");
  const pairs = await chipPairs(mainChips(page));
  expect(pairs).toContain("F#=3");
  expect(pairs).not.toContain("F=b3");
});

test("transiciones: cambiar a Menor, desactivar la 9 u omitir la 5 retiran las alteraciones", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "G", structure: "chord", quality: "dom", ext9: true, fifth: "#5", ninth: "b9" });
  await page.getByTestId("ext-9").uncheck();
  await expect(page.getByTestId("select-ninth")).toHaveValue("9");
  await expect(page.getByTestId("select-ninth")).toBeDisabled();
  await expect(mainChips(page)).toContainText("G7(#5)");
  await page.getByTestId("omit-5").check();
  await expect(page.getByTestId("select-fifth")).toHaveValue("5");
  await expect(page.getByTestId("select-fifth")).toBeDisabled();
  await page.getByTestId("omit-5").uncheck();
  await page.getByTestId("ext-9").check();
  await page.getByTestId("select-ninth").selectOption("#9");
  await page.getByTestId("select-quality").selectOption("min");
  await expect(page.getByTestId("select-fifth")).toHaveValue("5");
  await expect(page.getByTestId("select-ninth")).toHaveValue("9");
  await expect(mainChips(page)).toContainText("Gm9");
});

test("selectores: la calidad no los bloquea; con 3ª menor la ♯9 (= ♭3) no se ofrece; dim7 deshabilita 6/13", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "D", structure: "chord", quality: "dom", suspension: "sus4", ext9: true });
  await expect(page.getByTestId("select-ninth").locator("option[value='#9']")).toBeEnabled();
  await page.getByTestId("select-ninth").selectOption("b9");
  await expect(mainChips(page)).toContainText("D7sus4(b9)");
  await page.getByTestId("select-suspension").selectOption("none");
  await page.getByTestId("select-quality").selectOption("min");
  await expect(page.getByTestId("select-ninth")).toBeEnabled();
  await expect(page.getByTestId("select-ninth").locator("option[value='#9']")).toBeDisabled();
  await expect(page.getByTestId("select-ninth")).toHaveAttribute("title", /♭3/);
  await expect(page.getByTestId("select-fifth")).toBeEnabled();
  await applyBuilderState(page, { root: "F", structure: "tetrad", quality: "dim" });
  await expect(page.getByTestId("ext-6")).toBeDisabled();
  await expect(page.getByTestId("ext-13")).toBeDisabled();
  await expect(page.getByTestId("ext-13").locator("xpath=ancestor::label")).toHaveAttribute("title", /clases de altura/);
});

test("omisión y bajo reales: D7(b9,no5) en cuatriada y 2ª inversión de G7(#5) con la ♯5 en el bajo", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "D", structure: "tetrad", quality: "dom" });
  await page.getByTestId("omit-5").check();
  await page.getByTestId("ext-9").check();
  await page.getByTestId("select-ninth").selectOption("b9");
  await expect(mainChips(page)).toContainText("D7(b9,no5)");
  expect(await chipPairs(mainChips(page))).toEqual(["D=1", "F#=3", "C=b7", "Eb=b9"]);

  // Con "Omitir 5" activo no hay quinta que alterar: se retira la omisión y la 9 primero.
  await page.getByTestId("ext-9").uncheck();
  await page.getByTestId("omit-5").uncheck();
  await applyBuilderState(page, { root: "G", structure: "tetrad", quality: "dom", fifth: "#5" });
  await expect(mainChips(page)).toContainText("G7(#5)");
  await page.getByTestId("select-inversion").selectOption("2");
  await expect(page.getByTestId("chord-badge-bass-note").first()).toHaveText("D#");
});

test("detector → Acordes: x54545 se copia como D7(b9) con su digitación", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("chord-detect-toggle").check();
  await page.getByTestId("chord-detect-pattern-input").fill("x54545");
  await page.getByTestId("chord-detect-apply-btn").click();
  const nameEl = page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: /^D7\(b9\)$/ }).first();
  await expect(nameEl).toBeVisible();
  const id = (await nameEl.getAttribute("data-testid")).replace(/^detected-chord-name-/, "");
  await page.getByTestId(`detected-copy-${id}`).click();
  await expect(page.getByTestId("chord-detect-toggle")).not.toBeChecked();
  await expect(page.getByTestId("select-ninth")).toHaveValue("b9");
  await expect(mainChips(page)).toContainText("D7(b9)");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x54545");
});

test("detector → Acordes cercanos: 3x3444 se copia como G7(#5,b9) sin perder alteraciones", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("chord-detect-toggle").check();
  await page.getByTestId("chord-detect-pattern-input").fill("3x3444");
  await page.getByTestId("chord-detect-apply-btn").click();
  const nameEl = page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: /^G7\(#5,b9\)$/ }).first();
  await expect(nameEl).toBeVisible();
  const id = (await nameEl.getAttribute("data-testid")).replace(/^detected-chord-name-/, "");
  await page.getByTestId(`detected-copy-near-${id}-1`).click();
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-slot-1-title-chord")).toContainText("G7(#5,b9)");
  await expect(page.getByTestId("near-slot-1-fifth")).toHaveValue("#5");
  await expect(page.getByTestId("near-slot-1-ninth")).toHaveValue("b9");
});

test("Acordes cercanos: el slot construye D7(b9) y normaliza al pasar a Menor", async ({ page }) => {
  await freshApp(page);
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.getByTestId("near-slot-0-tone").selectOption("D");
  await page.getByTestId("near-slot-0-structure").selectOption("chord");
  await page.getByTestId("near-slot-0-quality").selectOption("dom");
  // Como en Acordes, «Dominante (7)» en estructura Acorde activa la 7ª.
  await expect(page.getByTestId("near-slot-0-ext7")).toBeChecked();
  await page.getByTestId("near-slot-0-ext7").uncheck();
  await page.getByTestId("near-slot-0-ext9").check();
  // La novena es editable con la 9 activa aunque falte la 7ª (D(addb9)).
  await expect(page.getByTestId("near-slot-0-ninth")).toBeEnabled();
  await page.getByTestId("near-slot-0-ninth").selectOption("b9");
  await expect(page.getByTestId("near-slot-0-title-chord")).toContainText("D(addb9)");
  await page.getByTestId("near-slot-0-ext7").check();
  await expect(page.getByTestId("near-slot-0-title-chord")).toContainText("D7(b9)");
  const slotPairs = await chipPairs(page.getByTestId("near-slot-0"));
  expect(slotPairs).toEqual(expect.arrayContaining(["D=1", "F#=3", "Eb=b9"]));
  // Pasar a Menor conserva la ♭9 (3ª y 7ª menores): Dm7(b9), no un dominante.
  await page.getByTestId("near-slot-0-quality").selectOption("min");
  await expect(page.getByTestId("near-slot-0-ninth")).toHaveValue("b9");
  await expect(page.getByTestId("near-slot-0-title-chord")).toContainText("Dm7(b9)");
  expect(await chipPairs(page.getByTestId("near-slot-0"))).toEqual(expect.arrayContaining(["D=1", "F=b3", "C=b7", "Eb=b9"]));
});

test("persistencia: G7(#5,b9) sobrevive a la recarga y queda en el almacenamiento", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "G", structure: "chord", quality: "dom", ext9: true, fifth: "#5", ninth: "b9" });
  await page.waitForTimeout(400);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), STORAGE_KEY);
  expect(stored.config).toMatchObject({ chordFifth: "#5", chordNinth: "b9" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(page.getByTestId("select-fifth")).toHaveValue("#5");
  await expect(page.getByTestId("select-ninth")).toHaveValue("b9");
  await expect(mainChips(page)).toContainText("G7(#5,b9)");
});

test("configuración antigua sin campos nuevos: conserva la interpretación anterior (D9, no D7(b9))", async ({ page }) => {
  await freshApp(page);
  const appVersion = await page.evaluate(() => document.body.textContent.match(/ver\.\s*([0-9.]+)/)?.[1]);
  await page.evaluate(({ key, appVersion }) => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      appVersion,
      config: {
        chordRootPc: 2, chordSpellPreferSharps: true, chordQuality: "dom", chordSuspension: "none",
        chordStructure: "chord", chordExt7: true, chordExt9: true, chordExt6: false, chordExt11: false, chordExt13: false,
        chordOmit: "none",
      },
    }));
  }, { key: STORAGE_KEY, appVersion });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(mainChips(page)).toContainText("D9");
  await expect(page.getByTestId("select-ninth")).toHaveValue("9");
  await expect(page.getByTestId("select-fifth")).toHaveValue("5");
});

test("exportar e importar: la configuración exportada conserva alteraciones; importar una antigua usa los valores por defecto", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "E", structure: "chord", quality: "dom", ext9: true, ninth: "#9" });
  await page.waitForTimeout(300);
  await page.getByTestId("nav-configuration").click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar config" }).click(),
  ]);
  const exported = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  expect(exported.config).toMatchObject({ chordFifth: "5", chordNinth: "#9" });

  // Importar la misma configuración sin los campos nuevos (formato anterior).
  const legacy = JSON.parse(JSON.stringify(exported));
  delete legacy.config.chordFifth;
  delete legacy.config.chordNinth;
  for (const slot of legacy.config.nearSlots || []) { delete slot.fifth; delete slot.ninth; }
  await page.locator("input[type='file']").setInputFiles({ name: "legacy.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(legacy)) });
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(mainChips(page)).toContainText("E9");
  await expect(page.getByTestId("select-ninth")).toHaveValue("9");

  // Importar la exportada restaura E7(#9).
  await page.getByTestId("nav-configuration").click();
  await page.locator("input[type='file']").setInputFiles({ name: "export.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(exported)) });
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(mainChips(page)).toContainText("E7(#9)");
  await expect(page.getByTestId("select-ninth")).toHaveValue("#9");
});

test("presets: guardar G7(#5,b9), cambiar el acorde y restaurar", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "G", structure: "chord", quality: "dom", ext9: true, fifth: "#5", ninth: "b9" });
  await page.waitForTimeout(300);
  await page.getByTestId("nav-configuration").click();
  // Guardar pide el nombre del preset con window.prompt.
  page.once("dialog", (dialog) => dialog.accept("Alterado"));
  await page.getByTitle("Guardar configuración actual en Preset 1").click();
  await page.getByTestId("nav-chords").click();
  await page.getByTestId("select-ninth").selectOption("9");
  await page.getByTestId("select-fifth").selectOption("5");
  await expect(mainChips(page)).toContainText("G9");
  const restoreBtn = page.locator("button", { hasText: /^Restaurar$/ });
  if (!(await restoreBtn.isVisible())) await page.getByTestId("nav-configuration").click();
  await expect(restoreBtn).toBeEnabled();
  await restoreBtn.click();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(mainChips(page)).toContainText("G7(#5,b9)");
});

test("standards: A7b9 se carga como A7(b9) y Gb7#11 avisa sin cargarse como Gb7", async ({ page }) => {
  await freshApp(page);
  await page.getByTestId("nav-standards").click();
  const filterInput = page.getByTestId("standards-catalog-panel").getByPlaceholder("All of Me");
  await filterInput.fill("A Beautiful Friendship");
  await page.getByTestId("standard-item-a-beautiful-friendship").click();
  await expect(page.getByTestId("standards-chart-panel")).toBeVisible({ timeout: 10_000 });
  for (const symbol of ["CΔ7", "Gb7#11", "E-7b5", "A7b9"]) {
    await page.getByTitle(`Añadir a la selección: ${symbol}`).first().click();
  }
  await page.getByRole("button", { name: "Cargar selección" }).click();
  await expect(page.getByText(/Gb7#11 a la lógica interna de la app \(♯11/)).toBeVisible();
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-slot-0-title-chord")).toContainText("Cmaj7");
  await expect(page.getByTestId("near-slot-1-title-chord")).not.toContainText("Gb7");
  await expect(page.getByTestId("near-slot-2-title-chord")).toContainText("Em7(b5)");
  await expect(page.getByTestId("near-slot-3-title-chord")).toContainText("A7(b9)");
  await expect(page.getByTestId("near-slot-3-ninth")).toHaveValue("b9");
});

// ── Menor + ♭5: tríada disminuida y m7(♭5) sin convertir la calidad ───────────
const HALF_DIMINISHED_PAIRS = ["A=1", "C=b3", "Eb=b5", "G=b7"];

async function voicingOptionCount(page) {
  const select = page.getByTestId("voicing-select");
  await expect.poll(async () => select.locator("option").count(), { timeout: 15000 }).toBeGreaterThan(0);
  return select.locator("option").count();
}

async function expectMinorFlatFiveSeventh(page) {
  await expect(mainChips(page)).toContainText("Am7(b5)");
  // El combo muestra la opción existente Semidisminuido (la base sigue siendo Menor).
  await expect(page.getByTestId("select-quality")).toHaveValue("hdim");
  await expect(page.getByTestId("select-fifth")).toHaveValue("b5");
  expect(await chipPairs(mainChips(page))).toEqual(expect.arrayContaining(HALF_DIMINISHED_PAIRS));
  const degrees = await mainChips(page).locator("[data-testid^='chord-badge-degree-']").allTextContents();
  expect(degrees).not.toContain("bb7");
}

for (const structure of ["tetrad", "chord"]) {
  test(`Menor + ♭5 (${structure}): Menor → 7 → ♭5 da Am7(b5) con 7ª menor y la calidad sigue en Menor`, async ({ page }) => {
    await goToChords(page);
    await selectRoot(page, "A");
    await page.getByTestId("select-structure").selectOption(structure);
    await page.getByTestId("select-quality").selectOption("min");
    await page.getByTestId("ext-7").check();
    await expect(mainChips(page)).toContainText("Am7");
    await page.getByTestId("select-fifth").selectOption("b5");
    await expectMinorFlatFiveSeventh(page);
  });

  test(`Menor + ♭5 (${structure}): Menor → ♭5 da Adim y al activar la 7 da Am7(b5), nunca Adim7`, async ({ page }) => {
    await goToChords(page);
    await selectRoot(page, "A");
    await page.getByTestId("select-structure").selectOption(structure);
    await page.getByTestId("select-quality").selectOption("min");
    await page.getByTestId("ext-7").uncheck();
    await page.getByTestId("select-fifth").selectOption("b5");
    await expect(mainChips(page)).toContainText("Adim");
    expect(await chipPairs(mainChips(page))).toEqual(expect.arrayContaining(["A=1", "C=b3", "Eb=b5"]));
    await expect(page.getByTestId("select-quality")).toHaveValue("dim");
    await page.getByTestId("ext-7").check();
    await expectMinorFlatFiveSeventh(page);
    await expect(mainChips(page)).not.toContainText("dim7");
  });
}

test("Menor + ♭5 equivale a Semidisminuido: mismas digitaciones en abierto y en drop 2", async ({ page }) => {
  await goToChords(page);
  await selectRoot(page, "A");
  await page.getByTestId("select-structure").selectOption("tetrad");
  await page.getByTestId("select-quality").selectOption("min");
  await page.getByTestId("select-fifth").selectOption("b5");
  await expectMinorFlatFiveSeventh(page);
  const minorOpen = await voicingOptionCount(page);
  await page.getByTestId("select-form").selectOption("drop2_set1");
  const minorDrop = await voicingOptionCount(page);
  const minorDropFirst = await page.getByTestId("voicing-select").locator("option").first().textContent();

  await page.getByTestId("select-form").selectOption("open");
  await page.getByTestId("select-quality").selectOption("hdim");
  await expect(mainChips(page)).toContainText("Am7(b5)");
  expect(await voicingOptionCount(page)).toBe(minorOpen);
  await page.getByTestId("select-form").selectOption("drop2_set1");
  expect(await voicingOptionCount(page)).toBe(minorDrop);
  await expect(page.getByTestId("voicing-select").locator("option").first()).toHaveText(minorDropFirst);
  // Volver a Menor desde Semidisminuido da m7: la ♭5 implícita de ø no se arrastra.
  await page.getByTestId("select-quality").selectOption("min");
  await expect(page.getByTestId("select-fifth")).toHaveValue("5");
  await expect(mainChips(page)).toContainText("Am7");
  await expect(mainChips(page)).not.toContainText("b5");
});

for (const order of ["7 → ♭5", "♭5 → 7"]) {
  test(`Acordes cercanos: Menor → ${order} da Am7(b5) y el slot sigue en Menor`, async ({ page }) => {
    await freshApp(page);
    await page.getByTestId("nav-near-chords").click();
    await expect(page.getByTestId("near-chords-panel")).toBeVisible();
    await page.getByTestId("near-slot-0-tone").selectOption("A");
    await page.getByTestId("near-slot-0-structure").selectOption("tetrad");
    await page.getByTestId("near-slot-0-quality").selectOption("min");
    if (order === "7 → ♭5") {
      await page.getByTestId("near-slot-0-ext7").check();
      await page.getByTestId("near-slot-0-fifth").selectOption("b5");
    } else {
      await page.getByTestId("near-slot-0-ext7").uncheck();
      await page.getByTestId("near-slot-0-fifth").selectOption("b5");
      await expect(page.getByTestId("near-slot-0-title-chord")).toContainText("Adim");
      await page.getByTestId("near-slot-0-ext7").check();
    }
    await expect(page.getByTestId("near-slot-0-title-chord")).toContainText("Am7(b5)");
    await expect(page.getByTestId("near-slot-0-quality")).toHaveValue("hdim");
    await expect(page.getByTestId("near-slot-0-fifth")).toHaveValue("b5");
    expect(await chipPairs(page.getByTestId("near-slot-0"))).toEqual(expect.arrayContaining(HALF_DIMINISHED_PAIRS));
  });
}

test("móvil: Menor → ♭5 → 7 en el editor de acorde da Am7(b5)", async ({ page }) => {
  await goToMobileChordEditor(page);
  await selectRoot(page, "A");
  await page.getByTestId("select-structure").selectOption("chord");
  await page.getByTestId("select-quality").selectOption("min");
  await page.getByTestId("ext-7").uncheck();
  await page.getByTestId("select-fifth").selectOption("b5");
  await expect(mainChips(page)).toContainText("Adim");
  await page.getByTestId("ext-7").check();
  await expectMinorFlatFiveSeventh(page);
});

// ── Calidad, Quinta y Novena sincronizadas (ida y vuelta) ─────────────────────
async function setQualityFrom(page, root, structure, quality) {
  await goToChords(page);
  await selectRoot(page, root);
  await page.getByTestId("select-structure").selectOption(structure);
  await page.getByTestId("select-quality").selectOption(quality);
  await page.getByTestId("ext-7").check();
}

test("Acordes: Am7 → ♭5 → Am7(b5) (Semidisminuido) → 5 → Am7 (Menor), con la quinta siempre editable", async ({ page }) => {
  await setQualityFrom(page, "A", "chord", "min");
  await expect(mainChips(page)).toContainText("Am7");
  await page.getByTestId("select-fifth").selectOption("b5");
  await expect(mainChips(page)).toContainText("Am7(b5)");
  await expect(page.getByTestId("select-quality")).toHaveValue("hdim");
  await expect(page.getByTestId("select-fifth")).toBeEnabled();
  await page.getByTestId("select-fifth").selectOption("5");
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
  await expect(mainChips(page)).toContainText("Am7");
  expect(await chipPairs(mainChips(page))).toEqual(expect.arrayContaining(["A=1", "C=b3", "E=5", "G=b7"]));
});

test("Acordes: Semidisminuido elegido → 5 → Am7 (Menor, 7ª menor) → ♭5 → Am7(b5)", async ({ page }) => {
  await setQualityFrom(page, "A", "tetrad", "hdim");
  await expect(mainChips(page)).toContainText("Am7(b5)");
  await expect(page.getByTestId("select-fifth")).toBeEnabled();
  await page.getByTestId("select-fifth").selectOption("5");
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
  expect(await chipPairs(mainChips(page))).toEqual(expect.arrayContaining(["A=1", "C=b3", "E=5", "G=b7"]));
  await page.getByTestId("select-fifth").selectOption("b5");
  await expect(page.getByTestId("select-quality")).toHaveValue("hdim");
  expect(await chipPairs(mainChips(page))).toEqual(expect.arrayContaining(HALF_DIMINISHED_PAIRS));
});

test("Acordes: Am9 → ♭9 → Am7(b9) sigue en Menor (no pasa a Dominante) y vuelve a Am9", async ({ page }) => {
  await setQualityFrom(page, "A", "chord", "min");
  await page.getByTestId("ext-9").check();
  await expect(mainChips(page)).toContainText("Am9");
  await page.getByTestId("select-ninth").selectOption("b9");
  await expect(mainChips(page)).toContainText("Am7(b9)");
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
  expect(await chipPairs(mainChips(page))).toEqual(expect.arrayContaining(["A=1", "C=b3", "G=b7", "Bb=b9"]));
  await page.getByTestId("select-ninth").selectOption("9");
  await expect(mainChips(page)).toContainText("Am9");
});

for (const startQuality of ["min", "hdim"]) {
  test(`Acordes cercanos: ida y vuelta de la quinta desde ${startQuality === "min" ? "Menor" : "Semidisminuido"}`, async ({ page }) => {
    await freshApp(page);
    await page.getByTestId("nav-near-chords").click();
    await page.getByTestId("near-slot-0-tone").selectOption("A");
    await page.getByTestId("near-slot-0-structure").selectOption("tetrad");
    await page.getByTestId("near-slot-0-quality").selectOption(startQuality);
    await page.getByTestId("near-slot-0-ext7").check();
    const startName = startQuality === "min" ? "Am7" : "Am7(b5)";
    const otherName = startQuality === "min" ? "Am7(b5)" : "Am7";
    const otherFifth = startQuality === "min" ? "b5" : "5";
    const otherQuality = startQuality === "min" ? "hdim" : "min";
    await expect(page.getByTestId("near-slot-0-title-chord")).toContainText(startName);
    await page.getByTestId("near-slot-0-fifth").selectOption(otherFifth);
    await expect(page.getByTestId("near-slot-0-title-chord")).toContainText(otherName);
    await expect(page.getByTestId("near-slot-0-quality")).toHaveValue(otherQuality);
    await expect(page.getByTestId("near-slot-0-fifth")).toBeEnabled();
    await page.getByTestId("near-slot-0-fifth").selectOption(startQuality === "min" ? "5" : "b5");
    await expect(page.getByTestId("near-slot-0-title-chord")).toContainText(startName);
    await expect(page.getByTestId("near-slot-0-quality")).toHaveValue(startQuality);
  });
}

test("detector → Acordes: x0101x se copia como Am7(b5) con su ♭5 y se puede pasar a Am7", async ({ page }) => {
  await goToChords(page);
  await page.getByTestId("chord-detect-toggle").check();
  await page.getByTestId("chord-detect-pattern-input").fill("x0101x");
  await page.getByTestId("chord-detect-apply-btn").click();
  const row = page.getByTestId("detected-chord-list").locator("div").filter({ hasText: /Am7\(b5\)/ }).first();
  await row.locator("[data-testid^='detected-copy-']").first().click();
  await expect(page.getByTestId("chord-detect-toggle")).not.toBeChecked();
  await expect(mainChips(page)).toContainText("Am7(b5)");
  await expect(page.getByTestId("select-fifth")).toHaveValue("b5");
  await expect(page.getByTestId("select-quality")).toHaveValue("hdim");
  await page.getByTestId("select-fifth").selectOption("5");
  await expect(mainChips(page)).toContainText("Am7");
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
});

test("persistencia: Am7(b5) construido desde Menor sobrevive a la recarga y se deshace después", async ({ page }) => {
  await setQualityFrom(page, "A", "chord", "min");
  await page.getByTestId("select-fifth").selectOption("b5");
  await expect(mainChips(page)).toContainText("Am7(b5)");
  await page.waitForTimeout(400);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), STORAGE_KEY);
  expect(stored.config).toMatchObject({ chordQuality: "min", chordFifth: "b5" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(mainChips(page)).toContainText("Am7(b5)");
  await expect(page.getByTestId("select-quality")).toHaveValue("hdim");
  await page.getByTestId("select-fifth").selectOption("5");
  await expect(mainChips(page)).toContainText("Am7");
});

test("configuración antigua de Semidisminuido sin chordFifth: sigue cargando Am7(b5), no Am7", async ({ page }) => {
  await freshApp(page);
  const appVersion = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "{}").appVersion, STORAGE_KEY);
  await page.evaluate(([key, version]) => {
    window.localStorage.setItem(key, JSON.stringify({ version: 1, appVersion: version, config: { chordRootPc: 9, chordQuality: "hdim", chordStructure: "tetrad", chordExt7: true, showBoards: { chords: true } } }));
  }, [STORAGE_KEY, appVersion]);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByTestId("nav-chords").click();
  await expect(mainChips(page)).toContainText("Am7(b5)");
  await expect(page.getByTestId("select-fifth")).toHaveValue("b5");
});

// ── Calidad visible según las notas reales y opción Aumentada ─────────────────
// El combo muestra la calidad que forman 3ª + 5ª + 7ª actuales (no la base
// guardada): 1-b3-#5-b7 es Menor (Am7(#5)), nunca m7(b5); «Aumentada» solo con
// 3ª mayor + ♯5 y sin decidir la séptima, que se conserva.
const QUALITY_LABELS = { maj: "Mayor", dom: "Dominante (7)", aug: "Aumentada", min: "Menor", minmaj7: "m(maj7)", dim: "Disminuido", hdim: "m7(b5)" };
const uniqueSorted = (pairs) => [...new Set(pairs)].sort();

async function expectChordState(page, { name, quality, fifth, pairs }) {
  await expect(page.getByTestId("chord-title").first()).toHaveText(name);
  await expect(page.getByTestId("select-quality")).toHaveValue(quality);
  await expect(page.getByTestId("select-quality").locator("option:checked")).toHaveText(QUALITY_LABELS[quality]);
  if (fifth) await expect(page.getByTestId("select-fifth")).toHaveValue(fifth);
  expect(uniqueSorted(await chipPairs(mainChips(page)))).toEqual(uniqueSorted(pairs));
}

async function expectNearSlotState(page, slot, { name, quality, fifth, pairs }) {
  await expect(page.getByTestId(`near-slot-${slot}-title-chord`)).toHaveText(name);
  await expect(page.getByTestId(`near-slot-${slot}-quality`)).toHaveValue(quality);
  await expect(page.getByTestId(`near-slot-${slot}-quality`).locator("option:checked")).toHaveText(QUALITY_LABELS[quality]);
  if (fifth) await expect(page.getByTestId(`near-slot-${slot}-fifth`)).toHaveValue(fifth);
  expect(uniqueSorted(await chipPairs(page.getByTestId(`near-slot-${slot}`)))).toEqual(uniqueSorted(pairs));
}

async function openNearSlot(page, { root, structure, quality, ext7 }) {
  await freshApp(page);
  await page.getByTestId("nav-near-chords").click();
  await expect(page.getByTestId("near-chords-panel")).toBeVisible();
  await page.getByTestId("near-slot-0-tone").selectOption(root);
  await page.getByTestId("near-slot-0-structure").selectOption(structure);
  await page.getByTestId("near-slot-0-quality").selectOption(quality);
  if (ext7 === true) await page.getByTestId("near-slot-0-ext7").check();
  if (ext7 === false) await page.getByTestId("near-slot-0-ext7").uncheck();
}

const A_FIFTH_TOUR = {
  b5: { name: "Am7(b5)", quality: "hdim", pairs: ["A=1", "C=b3", "Eb=b5", "G=b7"] },
  "#5": { name: "Am7(#5)", quality: "min", pairs: ["A=1", "C=b3", "E#=#5", "G=b7"] },
  5: { name: "Am7", quality: "min", pairs: ["A=1", "C=b3", "E=5", "G=b7"] },
};

for (const startQuality of ["min", "hdim"]) {
  const startLabel = startQuality === "min" ? "Menor" : "Semidisminuido";
  const startState = startQuality === "min" ? { ...A_FIFTH_TOUR[5], fifth: "5" } : { ...A_FIFTH_TOUR.b5, fifth: "b5" };

  test(`Acordes: recorrido ♭5 → ♯5 → 5 → ♭5 desde ${startLabel}; combo, nombre, grados y notas coinciden en cada paso`, async ({ page }) => {
    await setQualityFrom(page, "A", "tetrad", startQuality);
    await expectChordState(page, startState);
    for (const fifth of ["b5", "#5", "5", "b5"]) {
      await page.getByTestId("select-fifth").selectOption(fifth);
      await expectChordState(page, { ...A_FIFTH_TOUR[fifth], fifth });
    }
  });

  test(`Acordes cercanos: recorrido ♭5 → ♯5 → 5 → ♭5 desde ${startLabel}; combo, nombre, grados y notas coinciden en cada paso`, async ({ page }) => {
    await openNearSlot(page, { root: "A", structure: "tetrad", quality: startQuality, ext7: true });
    await expectNearSlotState(page, 0, startState);
    for (const fifth of ["b5", "#5", "5", "b5"]) {
      await page.getByTestId("near-slot-0-fifth").selectOption(fifth);
      await expectNearSlotState(page, 0, { ...A_FIFTH_TOUR[fifth], fifth });
    }
  });
}

// Mayor/Dominante → ♯5 muestra Aumentada conservando la 7ª; al volver a 5
// reaparece Mayor o Dominante según la séptima conservada.
const AUG_ROUND_TRIPS = [
  { label: "C (tríada)", structure: "triad", quality: "maj", ext7: false,
    natural: { name: "C", pairs: ["C=1", "E=3", "G=5"] }, sharp: { name: "Caug", pairs: ["C=1", "E=3", "G#=#5"] } },
  { label: "C7", structure: "tetrad", quality: "dom", ext7: true,
    natural: { name: "C7", pairs: ["C=1", "E=3", "G=5", "Bb=b7"] }, sharp: { name: "C7(#5)", pairs: ["C=1", "E=3", "G#=#5", "Bb=b7"] } },
  { label: "Cmaj7", structure: "tetrad", quality: "maj", ext7: true,
    natural: { name: "Cmaj7", pairs: ["C=1", "E=3", "G=5", "B=7"] }, sharp: { name: "Cmaj7(#5)", pairs: ["C=1", "E=3", "G#=#5", "B=7"] } },
];

for (const row of AUG_ROUND_TRIPS) {
  test(`Acordes: ${row.label} → ♯5 → ${row.sharp.name} (Aumentada) → 5 → ${row.natural.name}`, async ({ page }) => {
    await goToChords(page);
    await selectRoot(page, "C");
    await page.getByTestId("select-structure").selectOption(row.structure);
    await page.getByTestId("select-quality").selectOption(row.quality);
    if (row.ext7) await page.getByTestId("ext-7").check();
    await expectChordState(page, { ...row.natural, quality: row.quality, fifth: "5" });
    await page.getByTestId("select-fifth").selectOption("#5");
    await expectChordState(page, { ...row.sharp, quality: "aug", fifth: "#5" });
    await page.getByTestId("select-fifth").selectOption("5");
    await expectChordState(page, { ...row.natural, quality: row.quality, fifth: "5" });
  });

  test(`Acordes cercanos: ${row.label} → ♯5 → ${row.sharp.name} (Aumentada) → 5 → ${row.natural.name}`, async ({ page }) => {
    await openNearSlot(page, { root: "C", structure: row.structure, quality: row.quality, ext7: row.ext7 });
    await expectNearSlotState(page, 0, { ...row.natural, quality: row.quality, fifth: "5" });
    await page.getByTestId("near-slot-0-fifth").selectOption("#5");
    await expectNearSlotState(page, 0, { ...row.sharp, quality: "aug", fifth: "#5" });
    await page.getByTestId("near-slot-0-fifth").selectOption("5");
    await expectNearSlotState(page, 0, { ...row.natural, quality: row.quality, fifth: "5" });
  });
}

// Elegir Aumentada pone 3ª mayor + ♯5 y conserva el tipo de séptima del estado.
const AUG_DIRECT = [
  { from: "maj", ext7: false, structure: "triad", name: "Caug", pairs: ["C=1", "E=3", "G#=#5"],
    back: { quality: "maj", name: "C", pairs: ["C=1", "E=3", "G=5"] } },
  { from: "min", ext7: true, structure: "tetrad", name: "C7(#5)", pairs: ["C=1", "E=3", "G#=#5", "Bb=b7"],
    back: { quality: "dom", name: "C7", pairs: ["C=1", "E=3", "G=5", "Bb=b7"] } },
  { from: "minmaj7", ext7: true, structure: "tetrad", name: "Cmaj7(#5)", pairs: ["C=1", "E=3", "G#=#5", "B=7"],
    back: { quality: "maj", name: "Cmaj7", pairs: ["C=1", "E=3", "G=5", "B=7"] } },
  { from: "maj", ext7: true, structure: "tetrad", name: "Cmaj7(#5)", pairs: ["C=1", "E=3", "G#=#5", "B=7"],
    back: { quality: "maj", name: "Cmaj7", pairs: ["C=1", "E=3", "G=5", "B=7"] } },
];

for (const row of AUG_DIRECT) {
  const fromLabel = `${QUALITY_LABELS[row.from]}${row.ext7 ? " + 7" : ""}`;
  test(`Acordes: elegir Aumentada desde ${fromLabel} da ${row.name} (conserva la séptima) y 5 vuelve a ${row.back.name}`, async ({ page }) => {
    await goToChords(page);
    await selectRoot(page, "C");
    await page.getByTestId("select-structure").selectOption(row.structure);
    await page.getByTestId("select-quality").selectOption(row.from);
    if (row.ext7) await page.getByTestId("ext-7").check();
    await page.getByTestId("select-quality").selectOption("aug");
    await expectChordState(page, { name: row.name, quality: "aug", fifth: "#5", pairs: row.pairs });
    await page.getByTestId("select-fifth").selectOption("5");
    await expectChordState(page, { ...row.back, fifth: "5" });
  });

  test(`Acordes cercanos: elegir Aumentada desde ${fromLabel} da ${row.name} (conserva la séptima) y 5 vuelve a ${row.back.name}`, async ({ page }) => {
    await openNearSlot(page, { root: "C", structure: row.structure, quality: row.from, ext7: row.ext7 });
    await page.getByTestId("near-slot-0-quality").selectOption("aug");
    await expectNearSlotState(page, 0, { name: row.name, quality: "aug", fifth: "#5", pairs: row.pairs });
    await page.getByTestId("near-slot-0-fifth").selectOption("5");
    await expectNearSlotState(page, 0, { ...row.back, fifth: "5" });
  });
}

test("Acordes: C9 → ♯5 → C9(#5) (Aumentada) conserva la 9 y vuelve a C9 (Dominante)", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "C", structure: "chord", quality: "dom", ext7: true, ext9: true });
  await expect(page.getByTestId("chord-title").first()).toHaveText("C9");
  await page.getByTestId("select-fifth").selectOption("#5");
  await expect(page.getByTestId("chord-title").first()).toHaveText("C9(#5)");
  await expect(page.getByTestId("select-quality")).toHaveValue("aug");
  await expect(page.getByTestId("ext-9")).toBeChecked();
  expect(await chipPairs(mainChips(page))).toEqual(expect.arrayContaining(["C=1", "E=3", "G#=#5", "Bb=b7", "D=9"]));
  await page.getByTestId("select-fifth").selectOption("5");
  await expect(page.getByTestId("chord-title").first()).toHaveText("C9");
  await expect(page.getByTestId("select-quality")).toHaveValue("dom");
});

test("3ª menor + ♯5 sigue siendo Menor (no Aumentada) en Acordes y Acordes cercanos", async ({ page }) => {
  await goToChords(page);
  await selectRoot(page, "C");
  await page.getByTestId("select-structure").selectOption("triad");
  await page.getByTestId("select-quality").selectOption("min");
  await page.getByTestId("select-fifth").selectOption("#5");
  await expectChordState(page, { name: "Cm(#5)", quality: "min", fifth: "#5", pairs: ["C=1", "Eb=b3", "G#=#5"] });

  await page.getByTestId("nav-near-chords").click();
  await page.getByTestId("near-slot-0-tone").selectOption("C");
  await page.getByTestId("near-slot-0-structure").selectOption("tetrad");
  await page.getByTestId("near-slot-0-quality").selectOption("min");
  await page.getByTestId("near-slot-0-ext7").check();
  await page.getByTestId("near-slot-0-fifth").selectOption("#5");
  await expectNearSlotState(page, 0, { name: "Cm7(#5)", quality: "min", fifth: "#5", pairs: ["C=1", "Eb=b3", "G#=#5", "Bb=b7"] });
});

// ── Detector: ♭9 sobre acorde menor con 7ª (copiable) ─────────────────────────
async function detectPattern(page, pattern) {
  await goToChords(page);
  await page.getByTestId("chord-detect-toggle").check();
  await page.getByTestId("chord-detect-pattern-input").fill(pattern);
  await page.getByTestId("chord-detect-apply-btn").click();
}

async function detectedIdFor(page, name) {
  const escaped = name.replace(/[()]/g, "\\$&");
  const nameEl = page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: new RegExp(`^${escaped}$`) }).first();
  await expect(nameEl).toBeVisible();
  return (await nameEl.getAttribute("data-testid")).replace(/^detected-chord-name-/, "");
}

test("detector → Acordes: 5x5556 (A–C–E–G–B♭) se lee Am7(b9), conserva C7(add13)/A y se copia con sus notas", async ({ page }) => {
  await detectPattern(page, "5x5556");
  await expect(page.locator("[data-testid^='detected-chord-name-']").first()).toHaveText("Am7(b9)");
  await expect(page.locator("[data-testid^='detected-chord-name-']").filter({ hasText: /^C7\(add13\)\/A$/ })).toHaveCount(1);
  const id = await detectedIdFor(page, "Am7(b9)");
  await page.getByTestId(`detected-copy-${id}`).click();
  await expect(page.getByTestId("chord-detect-toggle")).not.toBeChecked();
  await expect(page.getByTestId("chord-title").first()).toHaveText("Am7(b9)");
  await expect(page.getByTestId("select-quality")).toHaveValue("min");
  await expect(page.getByTestId("select-fifth")).toHaveValue("5");
  await expect(page.getByTestId("select-ninth")).toHaveValue("b9");
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("5x5556");
  expect(uniqueSorted(await chipPairs(mainChips(page)))).toEqual(uniqueSorted(["A=1", "C=b3", "E=5", "G=b7", "Bb=b9"]));
});

test("detector → Acordes cercanos: 7x7778 (transposición a Si) se copia como Bm7(b9) con sus notas", async ({ page }) => {
  await detectPattern(page, "7x7778");
  await expect(page.locator("[data-testid^='detected-chord-name-']").first()).toHaveText("Bm7(b9)");
  const id = await detectedIdFor(page, "Bm7(b9)");
  await page.getByTestId(`detected-copy-near-${id}-1`).click();
  await page.getByTestId("nav-near-chords").click();
  await expectNearSlotState(page, 1, { name: "Bm7(b9)", quality: "min", fifth: "5", pairs: ["B=1", "D=b3", "F#=5", "A=b7", "C=b9"] });
  await expect(page.getByTestId("near-slot-1-ninth")).toHaveValue("b9");
});

// ── Aumentada con ♭♭7: deshabilitada y explicada, sin cambiar la séptima ──────
const AUG_BB7_LABEL = "Aumentada (el constructor no admite ♭♭7)";
const CDIM7_PAIRS = ["C=1", "Eb=b3", "Gb=b5", "Bbb=bb7"];

test("Acordes: con Cdim7 Aumentada está deshabilitada y explicada; sin la 7 se habilita y da Caug", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "C", structure: "chord", quality: "dim", ext7: true });
  await expectChordState(page, { name: "Cdim7", quality: "dim", fifth: "b5", pairs: CDIM7_PAIRS });
  const augOption = page.getByTestId("select-quality").locator("option[value='aug']");
  await expect(augOption).toBeDisabled();
  await expect(augOption).toHaveText(AUG_BB7_LABEL);
  await expect(augOption).toHaveAttribute("title", /^Limitación del constructor.*1–3–♯5–♭♭7/);
  // El acorde sigue intacto: la ♭♭7 no se ha sustituido.
  await expectChordState(page, { name: "Cdim7", quality: "dim", fifth: "b5", pairs: CDIM7_PAIRS });

  await page.getByTestId("ext-7").uncheck();
  await expect(augOption).toBeEnabled();
  await expect(augOption).toHaveText("Aumentada");
  await page.getByTestId("select-quality").selectOption("aug");
  await expectChordState(page, { name: "Caug", quality: "aug", fifth: "#5", pairs: ["C=1", "E=3", "G#=#5"] });
});

test("Acordes cercanos: con Cdim7 Aumentada está deshabilitada y explicada; sin la 7 da Caug", async ({ page }) => {
  await openNearSlot(page, { root: "C", structure: "chord", quality: "dim", ext7: true });
  await expectNearSlotState(page, 0, { name: "Cdim7", quality: "dim", fifth: "b5", pairs: CDIM7_PAIRS });
  const augOption = page.getByTestId("near-slot-0-quality").locator("option[value='aug']");
  await expect(augOption).toBeDisabled();
  await expect(augOption).toHaveText(AUG_BB7_LABEL);
  await expect(augOption).toHaveAttribute("title", /^Limitación del constructor/);
  await expectNearSlotState(page, 0, { name: "Cdim7", quality: "dim", fifth: "b5", pairs: CDIM7_PAIRS });

  await page.getByTestId("near-slot-0-ext7").uncheck();
  await expect(augOption).toBeEnabled();
  await page.getByTestId("near-slot-0-quality").selectOption("aug");
  await expectNearSlotState(page, 0, { name: "Caug", quality: "aug", fifth: "#5", pairs: ["C=1", "E=3", "G#=#5"] });
});

// ── Detector: alternativas menores con ♯5 (junto a su lectura ♭13) ────────────
async function expectFollowsInDetector(page, name, previous) {
  const names = await page.locator("[data-testid^='detected-chord-name-']").allTextContents();
  const idx = names.indexOf(name);
  expect(idx, names.join(" | ")).toBeGreaterThan(0);
  expect(names[idx - 1]).toBe(previous);
}

test("detector → Acordes: x0301x ofrece Am7(#5) justo detrás de Am7(b13,no5) y lo copia con sus notas", async ({ page }) => {
  await detectPattern(page, "x0301x");
  await expect(page.locator("[data-testid^='detected-chord-name-']").first()).toHaveText("Fadd9/A");
  await expectFollowsInDetector(page, "Am7(#5)", "Am7(b13,no5)");
  const id = await detectedIdFor(page, "Am7(#5)");
  await page.getByTestId(`detected-copy-${id}`).click();
  await expect(page.getByTestId("chord-detect-toggle")).not.toBeChecked();
  await expectChordState(page, { name: "Am7(#5)", quality: "min", fifth: "#5", pairs: ["A=1", "C=b3", "E#=#5", "G=b7"] });
  await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x0301x");
});

test("detector → Acordes cercanos: x3111x ofrece Cm(#5) (principal Ab/C) y lo copia con sus notas", async ({ page }) => {
  await detectPattern(page, "x3111x");
  await expect(page.locator("[data-testid^='detected-chord-name-']").first()).toHaveText("Ab/C");
  await expectFollowsInDetector(page, "Cm(#5)", "Cm(addb13,no5)");
  const id = await detectedIdFor(page, "Cm(#5)");
  await page.getByTestId(`detected-copy-near-${id}-1`).click();
  await page.getByTestId("nav-near-chords").click();
  await expectNearSlotState(page, 1, { name: "Cm(#5)", quality: "min", fifth: "#5", pairs: ["C=1", "Eb=b3", "G#=#5"] });
});

for (const target of ["Acordes", "Acordes cercanos"]) {
  test(`detector → ${target}: x3110x ofrece Cm(maj7,#5) justo detrás de Cm(maj7,addb6,no5) y lo copia con sus notas`, async ({ page }) => {
    await detectPattern(page, "x3110x");
    await expectFollowsInDetector(page, "Cm(maj7,#5)", "Cm(maj7,addb6,no5)");
    const id = await detectedIdFor(page, "Cm(maj7,#5)");
    const expected = { name: "Cm(maj7,#5)", quality: "minmaj7", fifth: "#5", pairs: ["C=1", "Eb=b3", "G#=#5", "B=7"] };
    if (target === "Acordes") {
      await page.getByTestId(`detected-copy-${id}`).click();
      await expectChordState(page, expected);
      await expect(page.getByTestId("active-voicing-pattern")).toHaveText("x3110x");
    } else {
      await page.getByTestId(`detected-copy-near-${id}-1`).click();
      await page.getByTestId("nav-near-chords").click();
      await expectNearSlotState(page, 1, expected);
    }
  });
}

// ── Suspensión: sustituye la 3ª y conserva quinta, séptima y extensiones ──────
// Regresión: Cm7(b5) → sus4 daba Cmaj7sus4 (♭5 y ♭7 perdidas) y no volvía.
const C_HALF_DIM_PAIRS = ["C=1", "Eb=b3", "Gb=b5", "Bb=b7"];
const SUS_HALF_DIM = {
  sus4: { name: "C7sus4(b5)", pairs: ["C=1", "F=4", "Gb=b5", "Bb=b7"] },
  sus2: { name: "C7sus2(b5)", pairs: ["C=1", "D=2", "Gb=b5", "Bb=b7"] },
};
const SUS_BB7_LABEL = /^sus[24] \(el constructor no admite ♭♭7\)$/;

async function expectInfoPopover(page, scope, label, pattern) {
  await scope.getByLabel(`Información sobre ${label}`).click();
  await expect(page.getByText(pattern).first()).toBeVisible();
  await page.getByTitle("Cerrar información").click();
}

for (const suspension of ["sus4", "sus2"]) {
  test(`Acordes: Cm7(b5) → ${suspension} → ${SUS_HALF_DIM[suspension].name} conserva ♭5 y ♭7 y sin sus vuelve a Cm7(b5)`, async ({ page }) => {
    await goToChords(page);
    await applyBuilderState(page, { root: "C", structure: "tetrad", quality: "hdim" });
    await expectChordState(page, { name: "Cm7(b5)", quality: "hdim", fifth: "b5", pairs: C_HALF_DIM_PAIRS });
    await page.getByTestId("select-suspension").selectOption(suspension);
    await expect(page.getByTestId("chord-title").first()).toHaveText(SUS_HALF_DIM[suspension].name);
    expect(uniqueSorted(await chipPairs(mainChips(page)))).toEqual(uniqueSorted(SUS_HALF_DIM[suspension].pairs));
    await expect(page.getByTestId("select-fifth")).toHaveValue("b5");
    await page.getByTestId("select-suspension").selectOption("none");
    await expectChordState(page, { name: "Cm7(b5)", quality: "hdim", fifth: "b5", pairs: C_HALF_DIM_PAIRS });
  });

  test(`Acordes cercanos: Cm7(b5) → ${suspension} → ${SUS_HALF_DIM[suspension].name} y sin sus vuelve a Cm7(b5)`, async ({ page }) => {
    await openNearSlot(page, { root: "C", structure: "tetrad", quality: "hdim", ext7: true });
    await expectNearSlotState(page, 0, { name: "Cm7(b5)", quality: "hdim", fifth: "b5", pairs: C_HALF_DIM_PAIRS });
    await page.getByTestId("near-slot-0-suspension").selectOption(suspension);
    await expect(page.getByTestId("near-slot-0-title-chord")).toHaveText(SUS_HALF_DIM[suspension].name);
    expect(uniqueSorted(await chipPairs(page.getByTestId("near-slot-0")))).toEqual(uniqueSorted(SUS_HALF_DIM[suspension].pairs));
    await page.getByTestId("near-slot-0-suspension").selectOption("none");
    await expectNearSlotState(page, 0, { name: "Cm7(b5)", quality: "hdim", fifth: "b5", pairs: C_HALF_DIM_PAIRS });
  });
}

test("Acordes: con Cdim7 sus2/sus4 están deshabilitadas y explicadas (botón de información), sin tocar la ♭♭7", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "C", structure: "tetrad", quality: "dim" });
  const suspension = page.getByTestId("select-suspension");
  for (const value of ["sus2", "sus4"]) {
    await expect(suspension.locator(`option[value='${value}']`)).toBeDisabled();
    await expect(suspension.locator(`option[value='${value}']`)).toHaveText(SUS_BB7_LABEL);
  }
  await expectInfoPopover(page, page, "Calidad / Sus", /Limitación del constructor: todavía no representa Disminuido suspendido/);
  await expectChordState(page, { name: "Cdim7", quality: "dim", fifth: "b5", pairs: CDIM7_PAIRS });
});

test("Acordes cercanos: con Cdim7 sus2/sus4 están deshabilitadas y explicadas, sin tocar la ♭♭7", async ({ page }) => {
  await openNearSlot(page, { root: "C", structure: "tetrad", quality: "dim", ext7: true });
  const suspension = page.getByTestId("near-slot-0-suspension");
  for (const value of ["sus2", "sus4"]) {
    await expect(suspension.locator(`option[value='${value}']`)).toBeDisabled();
    await expect(suspension.locator(`option[value='${value}']`)).toHaveText(SUS_BB7_LABEL);
  }
  await expectInfoPopover(page, page.getByTestId("near-slot-0"), "Calidad / Sus", /Limitación del constructor: todavía no representa Disminuido suspendido/);
  await expectNearSlotState(page, 0, { name: "Cdim7", quality: "dim", fifth: "b5", pairs: CDIM7_PAIRS });
});

test("Acordes: Cdim → sus4 → Csus4(b5) con la 7 bloqueada y explicada; sin sus vuelve a Cdim", async ({ page }) => {
  await goToChords(page);
  await applyBuilderState(page, { root: "C", structure: "chord", quality: "dim" });
  await page.getByTestId("ext-7").uncheck();
  await expectChordState(page, { name: "Cdim", quality: "dim", fifth: "b5", pairs: ["C=1", "Eb=b3", "Gb=b5"] });
  await page.getByTestId("select-suspension").selectOption("sus4");
  await expect(page.getByTestId("chord-title").first()).toHaveText("Csus4(b5)");
  expect(uniqueSorted(await chipPairs(mainChips(page)))).toEqual(uniqueSorted(["C=1", "F=4", "Gb=b5"]));
  await expect(page.getByTestId("ext-7")).toBeDisabled();
  await expectInfoPopover(page, page, "Extensiones", /con Disminuido suspendido la 7 sería ♭♭7/);
  await page.getByTestId("select-suspension").selectOption("none");
  await expectChordState(page, { name: "Cdim", quality: "dim", fifth: "b5", pairs: ["C=1", "Eb=b3", "Gb=b5"] });
  await expect(page.getByTestId("ext-7")).toBeEnabled();
});

test("Acordes cercanos: Cdim → sus2 → Csus2(b5) con la 7 bloqueada; sin sus vuelve a Cdim", async ({ page }) => {
  await openNearSlot(page, { root: "C", structure: "chord", quality: "dim", ext7: false });
  await expectNearSlotState(page, 0, { name: "Cdim", quality: "dim", fifth: "b5", pairs: ["C=1", "Eb=b3", "Gb=b5"] });
  await page.getByTestId("near-slot-0-suspension").selectOption("sus2");
  await expect(page.getByTestId("near-slot-0-title-chord")).toHaveText("Csus2(b5)");
  await expect(page.getByTestId("near-slot-0-ext7")).toBeDisabled();
  await expectInfoPopover(page, page.getByTestId("near-slot-0"), "Extensiones", /con Disminuido suspendido la 7 sería ♭♭7/);
  await page.getByTestId("near-slot-0-suspension").selectOption("none");
  await expectNearSlotState(page, 0, { name: "Cdim", quality: "dim", fifth: "b5", pairs: ["C=1", "Eb=b3", "Gb=b5"] });
});

// Explicaciones consultables pulsando (pantalla táctil), sin pasar el cursor.
test.describe("móvil táctil: explicaciones de opciones deshabilitadas", () => {
  test.use({ hasTouch: true });

  test("móvil: en el editor de Acordes las explicaciones de Aumentada y sus2/sus4 se consultan pulsando el botón de información", async ({ page }) => {
    await goToMobileChordEditor(page);
    await applyBuilderState(page, { root: "C", structure: "tetrad", quality: "dim" });
    await page.getByLabel("Información sobre Calidad / Sus").first().tap();
    await expect(page.getByText(/Aumentada no se aplica para no cambiar la séptima/).first()).toBeVisible();
    await expect(page.getByText(/sus2 y sus4 no se aplican para no cambiar la séptima/).first()).toBeVisible();
    await page.getByTitle("Cerrar información").tap();
  });

  test("móvil: en el editor de Acordes cercanos las explicaciones se consultan pulsando el botón de información", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await freshApp(page);
    await page.getByTestId("mobile-nav-nearChords").click();
    await page.getByLabel("Editar Acorde 1").click();
    await page.getByTestId("near-slot-0-tone").selectOption("C");
    await page.getByTestId("near-slot-0-structure").selectOption("tetrad");
    await page.getByTestId("near-slot-0-quality").selectOption("dim");
    await page.getByLabel("Información sobre Calidad / Sus").first().tap();
    await expect(page.getByText(/sus2 y sus4 no se aplican para no cambiar la séptima/).first()).toBeVisible();
    await page.getByTitle("Cerrar información").tap();
  });
});
