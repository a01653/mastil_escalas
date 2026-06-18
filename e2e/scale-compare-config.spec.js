/**
 * E2E — Comparador de escalas: persistencia, defaults y export/import
 */

import { test, expect } from "@playwright/test";

const STORAGE_KEY = "mastil_interactivo_guitarra_config_v1";
const APP_VERSION = "6.0.74";

async function gotoFresh(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Limpiar localStorage antes de cargar para simular sesión nueva
  await page.addInitScript(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function gotoWithConfig(page, configObj) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((payload) => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.localStorage.setItem("mastil_interactivo_guitarra_config_v1", JSON.stringify(payload));
    }
  }, configObj);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function openCompare(page) {
  await page.getByTestId("nav-scale-compare").click();
  await expect(page.getByTestId("scale-compare-panel")).toBeVisible();
}

// ── SCC1: defaults fresh ──────────────────────────────────────────────────────
test("SCC1. Sin config guardada: Comparador muestra D/G/C/F Mayor por defecto", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await gotoFresh(page);
  await openCompare(page);

  // Fila 0: D Mayor visible
  await expect(page.getByTestId("scale-compare-letter-0")).toHaveValue("D");
  await expect(page.getByTestId("scale-compare-scale-0")).toHaveValue("Mayor");

  // Fila 1: G Mayor visible
  await expect(page.getByTestId("scale-compare-letter-1")).toHaveValue("G");
  await expect(page.getByTestId("scale-compare-scale-1")).toHaveValue("Mayor");

  // Fila 2: C Mayor no visible
  await expect(page.getByTestId("scale-compare-letter-2")).toHaveValue("C");
  await expect(page.getByTestId("scale-compare-scale-2")).toHaveValue("Mayor");

  // Fila 3: F Mayor no visible
  await expect(page.getByTestId("scale-compare-letter-3")).toHaveValue("F");
  await expect(page.getByTestId("scale-compare-scale-3")).toHaveValue("Mayor");

  expect(errors).toHaveLength(0);
});

// ── SCC2: visibilidad por defecto ─────────────────────────────────────────────
test("SCC2. Sin config: filas 0 (D) y 1 (G) visibles; 2 y 3 no visibles", async ({ page }) => {
  await gotoFresh(page);
  await openCompare(page);

  // Botones visibles tienen clase activa (bg-sky-600) cuando la fila está activa
  const toggle0 = page.getByTestId("scale-compare-toggle-0");
  const toggle1 = page.getByTestId("scale-compare-toggle-1");
  const toggle2 = page.getByTestId("scale-compare-toggle-2");
  const toggle3 = page.getByTestId("scale-compare-toggle-3");

  await expect(toggle0).toHaveClass(/bg-sky-600/);
  await expect(toggle1).toHaveClass(/bg-sky-600/);
  await expect(toggle2).not.toHaveClass(/bg-sky-600/);
  await expect(toggle3).not.toHaveClass(/bg-sky-600/);
});

// ── SCC3: config antigua sin scaleCompareRows → defaults ──────────────────────
test("SCC3. Config antigua sin scaleCompareRows aplica defaults D/G/C/F Mayor", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  // Config antigua: tiene otros campos pero NO scaleCompareRows/scaleCompareVisible
  const oldConfig = {
    version: 1,
    appVersion: APP_VERSION,
    config: {
      scaleName: "Menor natural",
      maxFret: 12,
      // sin scaleCompareRows ni scaleCompareVisible
    },
  };

  await gotoWithConfig(page, oldConfig);
  await openCompare(page);

  await expect(page.getByTestId("scale-compare-letter-0")).toHaveValue("D");
  await expect(page.getByTestId("scale-compare-letter-1")).toHaveValue("G");
  await expect(page.getByTestId("scale-compare-letter-2")).toHaveValue("C");
  await expect(page.getByTestId("scale-compare-letter-3")).toHaveValue("F");

  expect(errors).toHaveLength(0);
});

// ── SCC4: import/restauración de config personalizada ─────────────────────────
test("SCC4. Config guardada con tono personalizado se restaura correctamente", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const customConfig = {
    version: 1,
    appVersion: APP_VERSION,
    config: {
      scaleCompareRows: [
        { id: 0, rootLetter: "A", rootAcc: "", scaleName: "Menor natural", color: "#4a90e2" },
        { id: 1, rootLetter: "E", rootAcc: "", scaleName: "Mayor",          color: "#7ed321" },
        { id: 2, rootLetter: "B", rootAcc: "b", scaleName: "Mayor",         color: "#9b59b6" },
        { id: 3, rootLetter: "F", rootAcc: "#", scaleName: "Mayor",         color: "#e67e22" },
      ],
      scaleCompareVisible: [0, 1],
      showResolutionPoints: false,
    },
  };

  await gotoWithConfig(page, customConfig);
  await openCompare(page);

  await expect(page.getByTestId("scale-compare-letter-0")).toHaveValue("A");
  await expect(page.getByTestId("scale-compare-scale-0")).toHaveValue("Menor natural");

  await expect(page.getByTestId("scale-compare-letter-1")).toHaveValue("E");
  await expect(page.getByTestId("scale-compare-scale-1")).toHaveValue("Mayor");

  expect(errors).toHaveLength(0);
});

// ── SCC5: showResolutionPoints se restaura ON ─────────────────────────────────
test("SCC5. showResolutionPoints:true se restaura al cargar config", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const configWithResolution = {
    version: 1,
    appVersion: APP_VERSION,
    config: {
      scaleCompareRows: [
        { id: 0, rootLetter: "D", rootAcc: "", scaleName: "Mayor", color: "#4a90e2" },
        { id: 1, rootLetter: "G", rootAcc: "", scaleName: "Mayor", color: "#7ed321" },
        { id: 2, rootLetter: "C", rootAcc: "", scaleName: "Mayor", color: "#9b59b6" },
        { id: 3, rootLetter: "F", rootAcc: "", scaleName: "Mayor", color: "#e67e22" },
      ],
      scaleCompareVisible: [0, 1],
      showResolutionPoints: true,
    },
  };

  await gotoWithConfig(page, configWithResolution);
  await openCompare(page);

  // Con 2 escalas visibles y showResolutionPoints=true, el bloque de resolución
  // debe mostrar el toggle en ON
  await expect(page.getByTestId("scale-resolution-toggle")).toHaveText("ON");

  expect(errors).toHaveLength(0);
});

// ── SCC6: más de 2 visibles en config → normaliza a 2 ────────────────────────
test("SCC6. Config con 3+ visibles se normaliza a máximo 2", async ({ page }) => {
  const configWith3Visible = {
    version: 1,
    appVersion: APP_VERSION,
    config: {
      scaleCompareRows: [
        { id: 0, rootLetter: "D", rootAcc: "", scaleName: "Mayor", color: "#4a90e2" },
        { id: 1, rootLetter: "G", rootAcc: "", scaleName: "Mayor", color: "#7ed321" },
        { id: 2, rootLetter: "C", rootAcc: "", scaleName: "Mayor", color: "#9b59b6" },
        { id: 3, rootLetter: "F", rootAcc: "", scaleName: "Mayor", color: "#e67e22" },
      ],
      scaleCompareVisible: [0, 1, 2, 3], // 4 visibles → debe normalizarse a [0, 1]
    },
  };

  await gotoWithConfig(page, configWith3Visible);
  await openCompare(page);

  // Solo 0 y 1 deben estar activos
  await expect(page.getByTestId("scale-compare-toggle-0")).toHaveClass(/bg-sky-600/);
  await expect(page.getByTestId("scale-compare-toggle-1")).toHaveClass(/bg-sky-600/);
  await expect(page.getByTestId("scale-compare-toggle-2")).not.toHaveClass(/bg-sky-600/);
  await expect(page.getByTestId("scale-compare-toggle-3")).not.toHaveClass(/bg-sky-600/);
});
