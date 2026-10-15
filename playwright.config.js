import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4185/mastil_escalas/",
    ...devices["Desktop Chrome"],
    headless: true,
    // Los tests que interceptan peticiones necesitan llegar a la red. La suite PWA habilita el worker real.
    serviceWorkers: 'block',
  },
  reporter: [["list"]],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4185 --strictPort',
    url: 'http://127.0.0.1:4185/mastil_escalas/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
