/**
 * Regresión: navegación móvil (bottom nav + swipe).
 * Detecta la regresión introducida en v5.63 donde selectBoardView y el reset
 * effect provocaban que cualquier cambio de sección fuera inmediatamente
 * deshecho, dejando el bottom nav y el swipe sin efecto.
 */

import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

// Espera a que la app esté lista en viewport móvil.
async function gotoMobile(page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // El compact bottom nav es visible en viewport estrecho.
  await expect(page.getByTestId("mobile-nav-chords")).toBeVisible();
}

// Devuelve la sección activa según el atributo data-active del bottom nav.
async function getActiveSection(page) {
  const buttons = await page.locator("[data-testid^='mobile-nav-']").all();
  for (const btn of buttons) {
    const active = await btn.getAttribute("data-active");
    if (active === "true") {
      const testId = await btn.getAttribute("data-testid");
      return testId?.replace("mobile-nav-", "") ?? null;
    }
  }
  return null;
}

// Dispatch de eventos pointer con tipo "touch" para simular swipe.
async function simulateSwipe(page, containerSelector, fromX, fromY, deltaX) {
  await page.evaluate(
    ({ sel, fx, fy, dx }) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const fire = (type, x, y) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: "touch",
            pointerId: 1,
            clientX: x,
            clientY: y,
            isPrimary: true,
          })
        );
      fire("pointerdown", fx, fy);
      fire("pointermove", fx + dx * 0.25, fy);
      fire("pointermove", fx + dx * 0.6, fy);
      fire("pointermove", fx + dx, fy);
      fire("pointerup", fx + dx, fy);
    },
    { sel: containerSelector, fx: fromX, fy: fromY, dx: deltaX }
  );
}

// ── MN1: sección inicial es "chords" ─────────────────────────────────────────
test("MN1. Móvil: sección inicial es Acordes", async ({ page }) => {
  await gotoMobile(page);
  const active = await getActiveSection(page);
  expect(active).toBe("chords");
});

// ── MN2: bottom nav cambia de sección ────────────────────────────────────────
test("MN2. Móvil: pulsar Escala en bottom nav cambia la sección activa", async ({ page }) => {
  await gotoMobile(page);

  await expect(page.getByTestId("mobile-nav-scale")).toBeVisible();
  await page.getByTestId("mobile-nav-scale").click();

  // La sección activa debe cambiar a "scale".
  await expect(async () => {
    const active = await getActiveSection(page);
    expect(active).toBe("scale");
  }).toPass({ timeout: 3000 });
});

// ── MN3: bottom nav puede cambiar varias veces ────────────────────────────────
test("MN3. Móvil: múltiples cambios de sección por bottom nav funcionan", async ({ page }) => {
  await gotoMobile(page);

  await page.getByTestId("mobile-nav-scale").click();
  await expect(async () => expect(await getActiveSection(page)).toBe("scale")).toPass({ timeout: 3000 });

  await page.getByTestId("mobile-nav-route").click();
  await expect(async () => expect(await getActiveSection(page)).toBe("route")).toPass({ timeout: 3000 });

  await page.getByTestId("mobile-nav-chords").click();
  await expect(async () => expect(await getActiveSection(page)).toBe("chords")).toPass({ timeout: 3000 });
});

// ── MN4: swipe horizontal cambia de sección ───────────────────────────────────
test("MN4. Móvil: swipe izquierda avanza de sección", async ({ page }) => {
  await gotoMobile(page);

  // Navegar a "scale" para tener una sección a la derecha.
  await page.getByTestId("mobile-nav-scale").click();
  await expect(async () => expect(await getActiveSection(page)).toBe("scale")).toPass({ timeout: 3000 });

  // Esperar a que la transición CSS termine (mobileSectionTransition → null).
  // aria-disabled="true" en el nav indica que hay transición en curso.
  await expect(page.getByTestId("mobile-nav-scale")).not.toHaveAttribute("aria-disabled", "true", { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(350);

  // Swipe izquierda (delta negativo) → avanza a siguiente sección (scaleCompare).
  const swipeContainerSel = ".mobile-section-slide";
  await simulateSwipe(page, swipeContainerSel, 300, 400, -260);

  await expect(async () => {
    const active = await getActiveSection(page);
    expect(active).toBe("scaleCompare");
  }).toPass({ timeout: 4000 });
});

// ── MN5: swipe con overlay abierto NO cambia de sección ──────────────────────
test("MN5. Móvil: swipe con overlay de configuración abierto no cambia sección", async ({ page }) => {
  await gotoMobile(page);

  // Abrir configuración (overlay móvil).
  const openConfigBtn = page.getByTitle("Abrir configuración");
  await expect(openConfigBtn).toBeVisible();
  await openConfigBtn.click();
  await expect(page.getByText("Ajustes globales y visuales de la app.")).toBeVisible();

  const sectionBefore = await getActiveSection(page);

  // Intentar swipe mientras el overlay está abierto → no debe cambiar de sección.
  await simulateSwipe(page, "body", 300, 400, -260);
  await page.waitForTimeout(400);

  const sectionAfter = await getActiveSection(page);
  expect(sectionAfter).toBe(sectionBefore);
});
