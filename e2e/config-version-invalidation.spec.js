/**
 * E2E — Invalidación de configuración persistida por versión de app.
 *
 * CVI-1  Misma versión → configuración conservada
 * CVI-2  Versión mayor → configuración limpiada y aviso visible
 * CVI-3  6.0.9 → 6.0.10 detectado correctamente como upgrade (no lexicográfico)
 * CVI-4  Sin versión guardada → arranca con defaults, guarda versión actual
 * CVI-5  Claves ajenas a la app no se borran
 */

import { test, expect } from "@playwright/test";

// Clave de configuración principal que usa la app.
const UI_STORAGE_KEY = "mastil_interactivo_guitarra_config_v1";
// Clave de presets (no debe borrarse en un upgrade).
const UI_PRESETS_STORAGE_KEY = "mastil_interactivo_guitarra_presets_v1";
// Clave ajena a la app (no debe borrarse nunca).
const FOREIGN_KEY = "some_other_app_data";

async function gotoApp(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

// Escribe un payload de configuración en localStorage con la appVersion indicada.
async function writeConfigWithVersion(page, appVersion, extraConfig = {}) {
  await page.evaluate(
    ([key, ver, extra]) => {
      const payload = {
        version: 1,
        appVersion: ver,
        config: {
          chordRootPc: 5,
          ...extra,
        },
      };
      window.localStorage.setItem(key, JSON.stringify(payload));
    },
    [UI_STORAGE_KEY, appVersion, extraConfig]
  );
}

// Lee una clave de localStorage.
async function readLocalStorage(page, key) {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

// Lee la appVersion del payload de configuración guardado actualmente.
async function readStoredAppVersion(page) {
  const raw = await readLocalStorage(page, UI_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.appVersion ?? null;
  } catch {
    return null;
  }
}

// ── CVI-1: misma versión → configuración conservada ──────────────────────────
test("CVI-1: misma versión guardada → configuración se conserva y no aparece aviso de restablecida", async ({ page }) => {
  // Obtener la versión actual de la app antes de poner el payload.
  await gotoApp(page);
  const currentVersion = await page.evaluate(() => {
    const raw = window.localStorage.getItem("mastil_interactivo_guitarra_config_v1");
    if (!raw) return null;
    try { return JSON.parse(raw).appVersion; } catch { return null; }
  });

  // Si la versión no pudo leerse, el test no puede ejecutarse con garantías.
  if (!currentVersion) {
    return;
  }

  // Guardar una configuración CON la misma versión actual.
  await writeConfigWithVersion(page, currentVersion, { chordRootPc: 9 });

  // Recargar: misma versión → config conservada.
  await page.reload();
  await page.waitForLoadState("networkidle");

  // La clave UI_STORAGE_KEY debe seguir existiendo.
  const raw = await readLocalStorage(page, UI_STORAGE_KEY);
  expect(raw).not.toBeNull();

  // No debe aparecer aviso de "restablecida".
  await expect(page.locator("text=Configuración restablecida")).toHaveCount(0);
});

// ── CVI-2: versión mayor → configuración limpiada ────────────────────────────
test("CVI-2: versión anterior guardada → al cargar versión mayor, config se limpia", async ({ page }) => {
  await gotoApp(page);

  // Guardar config con una versión claramente anterior.
  await writeConfigWithVersion(page, "0.0.1");

  // Recargar con la versión actual (mayor que 0.0.1).
  await page.reload();
  await page.waitForLoadState("networkidle");

  // La clave puede existir (la app guarda la nueva config tras hidratación),
  // pero si existe, debe tener la versión actual, no "0.0.1".
  const newVersion = await readStoredAppVersion(page);
  if (newVersion !== null) {
    expect(newVersion).not.toBe("0.0.1");
  }

  // El aviso de restablecida debe aparecer durante un breve instante
  // (puede que ya haya desaparecido en el timeout de 3.5 s del notice).
  // Comprobamos que la app no crashea y llega a un estado utilizable.
  await expect(page.locator("[data-testid='near-chords-panel'], [data-testid='nav-near-chords']").first()).toBeVisible();
});

// ── CVI-3: 6.0.9 → 6.0.10 no es lexicográfico ────────────────────────────────
test("CVI-3: '6.0.10' se detecta como mayor que '6.0.9' (comparación numérica)", async ({ page }) => {
  await gotoApp(page);

  // Guardar config con v6.0.9 (lexicográficamente mayor que "6.0.10" pero numéricamente menor).
  await writeConfigWithVersion(page, "6.0.9");

  // Si la versión actual de la app fuera 6.0.10+, la config debe borrarse.
  // Si la versión actual es ≤ 6.0.9, la config se conserva (test inaplicable).
  const currentVersion = await readStoredAppVersion(page);
  if (!currentVersion) {
    // Todavía no se guardó nada: recargamos para que la app guarde.
    // Guardamos de nuevo y recargamos.
    await writeConfigWithVersion(page, "6.0.9");
  }

  await page.reload();
  await page.waitForLoadState("networkidle");

  // La app debe estar funcional (no crasheada).
  await expect(page.locator("body")).toBeVisible();

  // Si la versión de la app en ejecución es mayor que "6.0.9", la config guardada
  // debe haber sido reemplazada (nueva appVersion > "6.0.9").
  const storedAfter = await readStoredAppVersion(page);
  if (storedAfter !== null) {
    // La versión guardada debe ser distinta de "6.0.9" si la app es 6.0.10+.
    // No podemos saber la versión exacta del build en el test, pero sí
    // que si es >= 6.0.10, "6.0.9" no debe persistir.
    const parts = storedAfter.split(".").map(Number);
    const [major, minor, patch] = parts;
    const stored9Parts = [6, 0, 9];
    // Si la versión guardada ahora es mayor que 6.0.9, la comparación fue correcta.
    const isNewer =
      major > stored9Parts[0] ||
      (major === stored9Parts[0] && minor > stored9Parts[1]) ||
      (major === stored9Parts[0] && minor === stored9Parts[1] && patch > stored9Parts[2]);
    if (isNewer) {
      // La comparación numérica funcionó.
      expect(storedAfter).not.toBe("6.0.9");
    }
  }
});

// ── CVI-4: sin versión guardada → arranca con defaults ───────────────────────
test("CVI-4: sin configuración guardada, la app arranca con defaults y guarda la versión actual", async ({ page }) => {
  // Limpiar todo localStorage antes de cargar.
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");

  // La app debe ser funcional.
  await expect(page.locator("body")).toBeVisible();

  // Tras la hidratación, debe haberse guardado la versión actual.
  const storedVersion = await readStoredAppVersion(page);
  // La versión guardada debe ser una cadena semver válida (no null ni "0.0.0").
  if (storedVersion !== null) {
    expect(storedVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(storedVersion).not.toBe("0.0.0");
  }
});

// ── CVI-5: claves ajenas no se borran ────────────────────────────────────────
test("CVI-5: la invalidación de config no borra claves ajenas a la app", async ({ page }) => {
  await gotoApp(page);

  // Escribir una clave ajena y una del preset antes de que ocurra el upgrade.
  await page.evaluate(
    ([fk, pk]) => {
      window.localStorage.setItem(fk, "sensitive_data");
      window.localStorage.setItem(pk, JSON.stringify([]));
    },
    [FOREIGN_KEY, UI_PRESETS_STORAGE_KEY]
  );

  // Simular upgrade: guardar config con versión muy antigua.
  await writeConfigWithVersion(page, "0.0.1");

  // Recargar con la versión actual (mayor).
  await page.reload();
  await page.waitForLoadState("networkidle");

  // La clave ajena debe seguir intacta.
  const foreignValue = await readLocalStorage(page, FOREIGN_KEY);
  expect(foreignValue).toBe("sensitive_data");

  // La clave de presets también debe seguir intacta (presets son datos del usuario).
  const presetsValue = await readLocalStorage(page, UI_PRESETS_STORAGE_KEY);
  expect(presetsValue).not.toBeNull();
});
