import { expect, test } from '@playwright/test';

test('Chrome calcula una identidad propia para Mástil Escalas, distinta de otras PWA del mismo origen', async ({ page, context, baseURL }) => {
  await page.goto('./');
  const cdp = await context.newCDPSession(page);
  const result = await cdp.send('Page.getAppManifest');
  expect(result.errors).toEqual([]);
  // Se comprueba la identidad procesada por Chrome: id="./" parecía relativo a la app,
  // pero Chrome lo resolvía a la raíz del origen, igual que el de Drop Route.
  expect(result.manifest).toMatchObject({ id: baseURL, startUrl: baseURL, scope: baseURL });
  expect(result.manifest.id).not.toBe(new URL('/', baseURL).href);
});
